use trailbase_client::{Client, ListArguments, Filter, CompareOp, Pagination};
use super::models::*;
use super::loro_manager::LoroManager;
use anyhow::{Result, anyhow};
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, Manager};
use tokio::time::{timeout, Duration};
use loro::VersionVector;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct TrailbaseService {
    client: Client, 
    user_id: String,
    loro: Arc<Mutex<LoroManager>>,
    storage_path: std::path::PathBuf,
    pub is_offline: Arc<AtomicBool>,
    last_pushed_vv: Arc<Mutex<VersionVector>>,
    last_pulled_id: Arc<Mutex<Option<String>>>,
}

impl TrailbaseService {
    pub async fn new(handle: AppHandle) -> Result<Self> {
        let storage_dir = handle.path().app_data_dir()
            .map_err(|_| anyhow!("Could not determine app data directory"))?;
        
        let storage_path = storage_dir.join("student_os.loro");
        let _ = fs::create_dir_all(&storage_dir);

        let loro = LoroManager::new(storage_path.clone())?;
        let vv = loro.get_vv();
        
        let loro = Arc::new(Mutex::new(loro));
        let is_offline = Arc::new(AtomicBool::new(true));
        let server_url = "https://keshayens-server.tail28d7e8.ts.net".to_string();
        
        let client = Client::new(&server_url, None)?;
        
        println!("[System] Initialized in OFFLINE mode (Loro doc loaded)");

        Ok(Self {
            client,
            user_id: "LRA8iDK1iBUKGCdVIOff7CjVhxT2".to_string(),
            loro,
            storage_path,
            is_offline,
            last_pushed_vv: Arc::new(Mutex::new(vv)),
            last_pulled_id: Arc::new(Mutex::new(None)),
        })
    }

    async fn ensure_login(&self) -> Result<()> {
        let username = "study@example.com".to_string();
        let password = "study1234".to_string();
        
        match timeout(Duration::from_secs(5), self.client.login(&username, &password)).await {
            Ok(Ok(_)) => Ok(()),
            Ok(Err(e)) => Err(anyhow!("Login failed: {:?}", e)),
            Err(_) => Err(anyhow!("Login timeout")),
        }
    }

    pub async fn perform_initial_migration(&self) -> Result<()> {
        println!("[Migration] Checking if initial migration is needed...");
        
        // Check if we already have data across ALL collections
        {
            let loro = self.loro.lock().await;
            let mut has_data = false;
            for coll in &["tasks", "school_notes", "flashcards", "school_grades", "swim_sessions", "swim_galas", "qualifying_times"] {
                let records: Vec<serde_json::Value> = loro.get_records(coll).unwrap_or_default();
                if !records.is_empty() {
                    has_data = true;
                    break;
                }
            }
            if has_data {
                println!("[Migration] Loro doc already contains data. Skipping migration.");
                return Ok(());
            }
        }

        println!("[Migration] No data found in Loro. Ensuring login...");
        if let Err(e) = self.ensure_login().await {
            return Err(anyhow!("Migration failed because could not login: {:?}", e));
        }

        println!("[Migration] Starting pull from legacy tables...");
        let user_id = &self.user_id;
        let client = &self.client;

        // Helper to fetch and log
        async fn fetch_and_log<T>(client: &Client, coll: &str, user_id: &str) -> Vec<T> 
        where T: serde::de::DeserializeOwned + 'static {
            match TrailbaseService::fetch_remote::<T>(client, coll, user_id).await {
                Ok(items) => {
                    println!("[Migration] Fetched {} items from '{}'", items.len(), coll);
                    items
                },
                Err(e) => {
                    println!("[Migration] Failed to fetch from '{}': {:?}", coll, e);
                    Vec::new()
                }
            }
        }

        let tasks = fetch_and_log::<Task>(client, "tasks", user_id).await;
        let notes = fetch_and_log::<SchoolNote>(client, "school_notes", user_id).await;
        let grades = fetch_and_log::<SchoolGrade>(client, "school_grades", user_id).await;
        let swims = fetch_and_log::<SwimSession>(client, "swim_sessions", user_id).await;
        let galas = fetch_and_log::<SwimGala>(client, "swim_galas", user_id).await;
        let qts = fetch_and_log::<QualifyingTime>(client, "qualifying_times", user_id).await;
        let flashcards = fetch_and_log::<SchoolFlashcard>(client, "flashcards", user_id).await;

        let loro = self.loro.lock().await;
        let mut total_migrated = 0;
        for item in tasks { loro.upsert_record("tasks", &item)?; total_migrated += 1; }
        for item in notes { loro.upsert_record("school_notes", &item)?; total_migrated += 1; }
        for item in grades { loro.upsert_record("school_grades", &item)?; total_migrated += 1; }
        for item in swims { loro.upsert_record("swim_sessions", &item)?; total_migrated += 1; }
        for item in galas { loro.upsert_record("swim_galas", &item)?; total_migrated += 1; }
        for item in qts { loro.upsert_record("qualifying_times", &item)?; total_migrated += 1; }
        for item in flashcards { loro.upsert_record("flashcards", &item)?; total_migrated += 1; }

        println!("[Migration] Migration complete. Total items migrated: {}", total_migrated);
        Ok(())
    }

    async fn fetch_remote<T: serde::de::DeserializeOwned + 'static>(client: &Client, coll: &str, user_id: &str) -> Result<Vec<T>> {
        let args = ListArguments::new()
            .with_filters(Filter::new("userId", CompareOp::Equal, user_id));
        let response = client.records(coll).list::<serde_json::Value>(args).await.map_err(|e| anyhow!("{:?}", e))?;
        let items: Vec<T> = response.records.into_iter() 
            .map(|r| serde_json::from_value(r))
            .collect::<Result<Vec<T>, _>>()?;
        Ok(items)
    }

    pub fn start_background_sync(&self, handle: AppHandle) {
        let client_clone = self.client.clone();
        let loro_clone = self.loro.clone();
        let is_offline_clone = self.is_offline.clone();
        let last_pushed_vv = self.last_pushed_vv.clone();
        let last_pulled_id = self.last_pulled_id.clone();
        let username = "study@example.com".to_string();
        let password = "study1234".to_string();

        tokio::spawn(async move {
            let mut offline_start_time = std::time::Instant::now();
            
            loop {
                let is_currently_offline = is_offline_clone.load(Ordering::Relaxed);
                
                if is_currently_offline {
                    let login_result = timeout(Duration::from_secs(5), client_clone.login(&username, &password)).await;
                    
                    if let Ok(Ok(_)) = login_result {
                        let duration = offline_start_time.elapsed().as_secs();
                        println!("[Network] Connection established after {}s! Switching to ONLINE mode.", duration);
                        
                        is_offline_clone.store(false, Ordering::Relaxed);
                        let _ = handle.emit("connection-status", false); 
                        
                        let _ = handle.emit("sync-status", "syncing");
                        let _ = Self::sync_loro(&client_clone, &loro_clone, &last_pushed_vv, &last_pulled_id, &handle).await;
                        let _ = handle.emit("sync-status", "idle");
                    }
                } else {
                    let args = ListArguments::new().with_count(true);
                    let heartbeat = timeout(
                        Duration::from_secs(5), 
                        client_clone.records("sync_updates").list::<serde_json::Value>(args)
                    ).await;

                    if heartbeat.is_err() || heartbeat.unwrap().is_err() {
                        println!("[Network] Connection lost. Switching to OFFLINE mode.");
                        is_offline_clone.store(true, Ordering::Relaxed);
                        offline_start_time = std::time::Instant::now(); 
                        let _ = handle.emit("connection-status", true);
                    } else {
                        let _ = Self::sync_loro(&client_clone, &loro_clone, &last_pushed_vv, &last_pulled_id, &handle).await;
                    }
                }

                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        });
    }

    async fn sync_loro(
        client: &Client, 
        loro: &Arc<Mutex<LoroManager>>, 
        last_pushed_vv: &Arc<Mutex<VersionVector>>,
        last_pulled_id: &Arc<Mutex<Option<String>>>,
        handle: &AppHandle
    ) -> Result<()> {
        // 1. Pull new updates
        let mut last_id = last_pulled_id.lock().await;
        let mut args = ListArguments::new();
        
        if let Some(id) = &*last_id {
            args = args.with_filters(Filter::new("id", CompareOp::GreaterThan, id.clone()));
        }

        let resp = client.records("sync_updates").list::<serde_json::Value>(args).await;
        if let Ok(records) = resp {
            let mut imported = false;
            for rec in records.records {
                let data_val = rec.get("data").unwrap_or(&serde_json::Value::Null);
                let data = match data_val {
                    serde_json::Value::String(s) => base64_or_hex_decode(s),
                    serde_json::Value::Array(arr) => arr.iter().map(|v| v.as_u64().unwrap_or(0) as u8).collect(),
                    _ => Vec::new(),
                };
                let peer_id = rec.get("peer_id").and_then(|v| v.as_str()).unwrap_or("");
                
                let current_peer_id = {
                    let l = loro.lock().await;
                    l.peer_id()
                };

                if peer_id != current_peer_id && !data.is_empty() {
                    let l = loro.lock().await;
                    if let Err(e) = l.import_updates(&data) {
                        println!("[Sync] Error importing update from peer {}: {:?}", peer_id, e);
                        let hex_preview = if data.len() > 20 {
                            format!("{}...", hex::encode(&data[..20]))
                        } else {
                            hex::encode(&data)
                        };
                        println!("[Sync] Data hex preview: {}", hex_preview);
                    } else {
                        println!("[Sync] Successfully imported update from peer {}", peer_id);
                        imported = true;
                    }
                }
                
                if let Some(id_str) = rec.get("id").and_then(|v| v.as_str()) {
                    *last_id = Some(id_str.to_string());
                }
            }
            if imported {
                let _ = handle.emit("data-changed", ());
            }
        }

        // 2. Push local updates
        let mut last_vv = last_pushed_vv.lock().await;
        let (updates, new_vv, peer_id) = {
            let l = loro.lock().await;
            let current_vv = l.get_vv();
            if &current_vv == &*last_vv {
                (None, current_vv, l.peer_id())
            } else {
                let data = l.export_updates(&*last_vv)?;
                (Some(data), current_vv, l.peer_id())
            }
        };

        if let Some(data) = updates {
            if !data.is_empty() {
                // 1. Get current MAX(sequence_number)
                let mut max_seq = 0;
                let args = ListArguments::new()
                    .with_pagination(Pagination::new().with_limit(1))
                    .with_order(["-sequence_number"]);
                
                if let Ok(resp) = client.records("sync_updates").list::<serde_json::Value>(args).await {
                    if let Some(record) = resp.records.first() {
                        max_seq = record.get("sequence_number")
                            .and_then(|v| v.as_i64())
                            .unwrap_or(0);
                    }
                }

                let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64;
                
                let payload = serde_json::json!({
                    "peer_id": peer_id,
                    "data": data, // serde_json will serialize Vec<u8> as an array of numbers
                    "sequence_number": max_seq + 1,
                    "created_at": now,
                });
                
                if let Err(e) = client.records("sync_updates").create(&payload).await {
                    println!("[Sync] Error pushing update: {:?}", e);
                } else {
                    *last_vv = new_vv;
                }
            }
        }

        Ok(())
    }


    pub async fn get_tasks(&self) -> Result<Vec<Task>> {
        let loro = self.loro.lock().await;
        loro.get_records("tasks")
    }

    pub async fn get_notes(&self) -> Result<Vec<SchoolNote>> {
        let loro = self.loro.lock().await;
        loro.get_records("school_notes")
    }

    pub async fn get_flashcards(&self) -> Result<Vec<SchoolFlashcard>> {
        let loro = self.loro.lock().await;
        loro.get_records("flashcards")
    }

    pub async fn get_grades(&self) -> Result<Vec<SchoolGrade>> {
        let loro = self.loro.lock().await;
        loro.get_records("school_grades")
    }

    pub async fn get_swim_sessions(&self) -> Result<Vec<SwimSession>> {
        let loro = self.loro.lock().await;
        loro.get_records("swim_sessions")
    }

    pub async fn get_swim_galas(&self) -> Result<Vec<SwimGala>> {
        let loro = self.loro.lock().await;
        loro.get_records("swim_galas")
    }

    pub async fn get_qualifying_times(&self) -> Result<Vec<QualifyingTime>> {
        let loro = self.loro.lock().await;
        loro.get_records("qualifying_times")
    }

    pub async fn create_record<T>(&self, collection: &str, mut record: T) -> Result<T>
    where
        T: Serialize + for<'de> Deserialize<'de> + Clone + Identifiable + 'static,
    {
        let id = if record.get_id().is_empty() || record.get_id().starts_with("temp_") {
             uuid::Uuid::now_v7().to_string()
        } else {
            record.get_id().to_string()
        };
        record.set_id(id);

        let loro = self.loro.lock().await;
        loro.upsert_record(collection, &record)?;
        Ok(record)
    }

    pub async fn update_record<T>(&self, collection: &str, record: T) -> Result<T>
    where
        T: Serialize + for<'de> Deserialize<'de> + Clone + Identifiable + 'static,
    {
        let loro = self.loro.lock().await;
        loro.upsert_record(collection, &record)?;
        Ok(record)
    }

    pub async fn delete_record<T>(&self, collection: &str, record_id: &str) -> Result<()>
    where
        T: Serialize + for<'de> Deserialize<'de> + Clone + Identifiable + 'static,
    {
        let effective_collection = if collection == "habits" { "tasks" } else { collection };
        let loro = self.loro.lock().await;
        loro.delete_record(effective_collection, record_id)?;
        Ok(())
    }

    pub async fn nuke_local_data(&mut self) -> Result<()> {
        let mut loro = self.loro.lock().await;
        loro.nuke()?;
        Ok(())
    }

    pub async fn refresh_data(&self, handle: &AppHandle) -> Result<()> {
        if self.is_offline.load(Ordering::Relaxed) {
            return Err(anyhow!("Cannot refresh while offline"));
        }
        // Force a sync
        Self::sync_loro(&self.client, &self.loro, &self.last_pushed_vv, &self.last_pulled_id, handle).await?;
        Ok(())
    }
}

fn base64_or_hex_decode(s: &str) -> Vec<u8> {
    use base64::{Engine as _, engine::general_purpose};
    if let Ok(data) = general_purpose::STANDARD.decode(s) {
        return data;
    }
    // Fallback to hex
    if s.len() % 2 == 0 && s.chars().all(|c| c.is_ascii_hexdigit()) {
        if let Ok(data) = hex::decode(s) {
            return data;
        }
    }
    Vec::new()
}
