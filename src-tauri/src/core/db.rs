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

pub struct TrailbaseService {
    client: Client, 
    user_id: String,
    loro: Arc<Mutex<LoroManager>>,
    pub is_offline: Arc<AtomicBool>,
    sync_state_path: std::path::PathBuf,
    last_pushed_vv: Arc<Mutex<VersionVector>>,
    last_pulled_id: Arc<Mutex<Option<String>>>,
    config: SyncConfig,
}

#[derive(Clone)]
struct SyncConfig {
    server_url: String,
    username: String,
    password: String,
    user_id: String,
}

#[derive(Serialize, Deserialize)]
struct SyncState {
    last_pushed_vv: Vec<u8>,
    last_pulled_id: Option<String>,
}

impl TrailbaseService {
    pub async fn new(handle: AppHandle) -> Result<Self> {
        let storage_dir = handle.path().app_data_dir()
            .map_err(|_| anyhow!("Could not determine app data directory"))?;
        
        let storage_path = storage_dir.join("student_os.loro");
        let _ = fs::create_dir_all(&storage_dir);

        let loro_manager = LoroManager::new(storage_path.clone())?;
        let mut vv = loro_manager.get_vv();
        let mut last_id = None;
        
        let sync_state_path = storage_dir.join("sync_state.json");
        if sync_state_path.exists() {
            if let Ok(content) = fs::read_to_string(&sync_state_path) {
                if let Ok(state) = serde_json::from_str::<SyncState>(&content) {
                    if let Ok(decoded_vv) = LoroManager::decode_vv(&state.last_pushed_vv) {
                        vv = decoded_vv;
                        last_id = state.last_pulled_id;
                        println!("[Sync] Loaded persistent sync state.");
                    }
                }
            }
        }

        let loro = Arc::new(Mutex::new(loro_manager));
        let is_offline = Arc::new(AtomicBool::new(true));

        let config = SyncConfig {
            server_url: "https://keshayens-server.tail28d7e8.ts.net".to_string(),
            username: "study@example.com".to_string(),
            password: "study1234".to_string(),
            user_id: "LRA8iDK1iBUKGCdVIOff7CjVhxT2".to_string(),
        };
        
        let client = Client::new(&config.server_url, None)?;
        
        println!("[System] Initialized in OFFLINE mode (Loro doc loaded)");

        Ok(Self {
            client,
            user_id: config.user_id.clone(),
            loro,
            is_offline,
            sync_state_path,
            last_pushed_vv: Arc::new(Mutex::new(vv)),
            last_pulled_id: Arc::new(Mutex::new(last_id)),
            config,
        })
    }

    async fn ensure_login(&self) -> Result<()> {
        let username = self.config.username.clone();
        let password = self.config.password.clone();
        
        match timeout(Duration::from_secs(30), self.client.login(&username, &password)).await {
            Ok(Ok(_)) => Ok(()),
            Ok(Err(e)) => Err(anyhow!("Login failed: {:?}", e)),
            Err(_) => Err(anyhow!("Login timeout")),
        }
    }

    pub async fn perform_initial_migration(&self, handle: &AppHandle) -> Result<()> {
        println!("[Migration] Checking if initial migration is needed...");
        
        // 1. Check if we already have data across ALL collections
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

        let user_id = &self.user_id;
        let client = &self.client;

        // 2. CHECK SYNC_UPDATES TABLE FIRST
        println!("[Migration] Checking for existing sync updates...");
        let args = ListArguments::new(); 
        let resp = client.records("sync_updates").list::<serde_json::Value>(args).await;
        
        if let Ok(records) = resp {
            println!("[Migration] sync_updates list returned {} records", records.records.len());
            if !records.records.is_empty() {
                println!("[Migration] Found {} sync updates. Building Loro doc from history...", records.records.len());
                let mut last_id_val = None;
                let mut imported_any = false;
                
                {
                    let loro = self.loro.lock().await;
                    for rec in records.records {
                        let data_val = rec.get("data").unwrap_or(&serde_json::Value::Null);
                        let data = match data_val {
                            serde_json::Value::String(s) => base64_or_hex_decode(s),
                            serde_json::Value::Array(arr) => arr.iter().map(|v| v.as_u64().unwrap_or(0) as u8).collect(),
                            _ => {
                                println!("[Sync] Unknown data type in row: {:?}", data_val);
                                Vec::new()
                            },
                        };
                        
                        if !data.is_empty() {
                            if let Err(e) = loro.import_updates(&data) {
                                println!("[Migration] Error importing update: {:?}", e);
                            } else {
                                imported_any = true;
                            }
                        }
                        
                        if let Some(id_str) = rec.get("id").and_then(|v| v.as_str()) {
                            last_id_val = Some(id_str.to_string());
                        }
                    }
                }
                
                if imported_any {
                    if let Some(id) = last_id_val {
                        let mut lid = self.last_pulled_id.lock().await;
                        *lid = Some(id);
                    }
                    let mut lvv = self.last_pushed_vv.lock().await;
                    {
                        let loro = self.loro.lock().await;
                        *lvv = loro.get_vv();
                        println!("[Migration] Loro doc built successfully from sync updates.");
                        let state_dump = loro.dump_state();
                        println!("[Migration] Current Doc State (Deep): {:.2000}", state_dump); // Log up to 2KB
                    }
                    let _ = handle.emit("data-changed", ());
                    return Ok(());
                }
            }
        }

        // 3. FALLBACK TO INDIVIDUAL TABLES
        println!("[Migration] Starting pull from individual legacy tables...");

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

        let mut loro = self.loro.lock().await;
        println!("[Migration] Pre-Migration Loro State: {}", loro.dump_state());
        
        let mut total_migrated = 0;
        let mut batch_count = 0;
        
        let tasks_v: Vec<serde_json::Value> = tasks.into_iter().map(|it| serde_json::to_value(it).unwrap()).collect();
        let notes_v: Vec<serde_json::Value> = notes.into_iter().map(|it| serde_json::to_value(it).unwrap()).collect();
        let grades_v: Vec<serde_json::Value> = grades.into_iter().map(|it| serde_json::to_value(it).unwrap()).collect();
        let swims_v: Vec<serde_json::Value> = swims.into_iter().map(|it| serde_json::to_value(it).unwrap()).collect();
        let galas_v: Vec<serde_json::Value> = galas.into_iter().map(|it| serde_json::to_value(it).unwrap()).collect();
        let qts_v: Vec<serde_json::Value> = qts.into_iter().map(|it| serde_json::to_value(it).unwrap()).collect();
        let flashcards_v: Vec<serde_json::Value> = flashcards.into_iter().map(|it| serde_json::to_value(it).unwrap()).collect();

        let collections = vec![
            ("tasks", tasks_v),
            ("school_notes", notes_v),
            ("school_grades", grades_v),
            ("swim_sessions", swims_v),
            ("swim_galas", galas_v),
            ("qualifying_times", qts_v),
            ("flashcards", flashcards_v),
        ];

        for (coll_name, items) in collections {
            for item in items {
                if let Err(e) = loro.upsert_value_no_save(coll_name, item) {
                    println!("[Migration] {} error: {:?}", coll_name, e);
                } else {
                    total_migrated += 1;
                    batch_count += 1;
                }

                if batch_count >= 5 {
                    let _ = loro.save();
                    drop(loro); 
                    
                    let _ = Self::sync_loro(&self.client, &self.loro, &self.last_pushed_vv, &self.last_pulled_id, handle, &self.sync_state_path).await;
                    
                    loro = self.loro.lock().await; 
                    batch_count = 0;
                }
            }
            println!("[Migration] Finished collection: {}", coll_name);
        }
        loro.save()?;

        if total_migrated > 0 {
            println!("[Migration] Post-Migration Loro State: {:.2000}", loro.dump_state());
            // We no longer update last_pushed_vv here. 
            // We want the background sync loop to see these new items and push them to sync_updates.
            let _ = handle.emit("data-changed", ());
            println!("[Migration] Migration complete. Total items migrated: {}", total_migrated);
        }
        drop(loro);

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
        let sync_state_path_clone = self.sync_state_path.clone();
        let config = self.config.clone();

        tokio::spawn(async move {
            let mut offline_start_time = std::time::Instant::now();
            
            loop {
                let is_currently_offline = is_offline_clone.load(Ordering::Relaxed);
                
                if is_currently_offline {
                    let login_result = timeout(Duration::from_secs(5), client_clone.login(&config.username, &config.password)).await;
                    
                    if let Ok(Ok(_)) = login_result {
                        let duration = offline_start_time.elapsed().as_secs();
                        println!("[Network] Connection established after {}s! Switching to ONLINE mode.", duration);
                        
                        is_offline_clone.store(false, Ordering::Relaxed);
                        let _ = handle.emit("connection-status", false); 
                        
                        let _ = handle.emit("sync-status", "syncing");
                        let _ = Self::sync_loro(&client_clone, &loro_clone, &last_pushed_vv, &last_pulled_id, &handle, &sync_state_path_clone).await;
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
                        let _ = Self::sync_loro(&client_clone, &loro_clone, &last_pushed_vv, &last_pulled_id, &handle, &sync_state_path_clone).await;
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
        handle: &AppHandle,
        sync_state_path: &std::path::PathBuf
    ) -> Result<()> {
        // 1. Pull new updates
        let mut args = ListArguments::new();
        {
            let last_id = last_pulled_id.lock().await;
            if let Some(id) = &*last_id {
                args = args.with_filters(Filter::new("id", CompareOp::GreaterThan, id.clone()));
            }
        } // Lock released before list().await

        let resp = client.records("sync_updates").list::<serde_json::Value>(args).await;
        match resp {
            Ok(records) => {
                let mut imported = false;
                let mut final_last_id = None;
                
                // Collect and process records while holding the lock briefly
                {
                    let l = loro.lock().await;
                    let current_peer_id = format!("p_{}", l.peer_id());

                    for rec in records.records {
                        let data_val = rec.get("data").unwrap_or(&serde_json::Value::Null);
                        let data = match data_val {
                            serde_json::Value::String(s) => base64_or_hex_decode(s),
                            serde_json::Value::Array(arr) => arr.iter().map(|v| v.as_u64().unwrap_or(0) as u8).collect(),
                            _ => Vec::new(),
                        };
                        let peer_id = rec.get("peer_id").and_then(|v| v.as_str()).unwrap_or("");
                        
                        if peer_id != current_peer_id && !data.is_empty() {
                            if let Err(e) = l.import_updates(&data) {
                                println!("[Sync] Error importing update: {:?}", e);
                            } else {
                                imported = true;
                            }
                        }
                        
                        if let Some(id_str) = rec.get("id").and_then(|v| v.as_str()) {
                            final_last_id = Some(id_str.to_string());
                        }
                    }
                } // Lock released

                if let Some(id) = final_last_id {
                    let mut lid = last_pulled_id.lock().await;
                    *lid = Some(id);
                }

                if imported {
                    let mut last_vv = last_pushed_vv.lock().await;
                    let mut lid = last_pulled_id.lock().await;
                    {
                        let l = loro.lock().await;
                        *last_vv = l.get_vv();
                    }
                    let _ = Self::save_sync_state(&*last_vv, &*lid, sync_state_path);
                    let _ = handle.emit("data-changed", ());
                }
            },
            Err(e) => {
                println!("[Sync] Pull: list failed: {:?}", e);
            }
        }

        // 2. Push local updates
        let (updates, new_vv, peer_id) = {
            let last_vv = last_pushed_vv.lock().await;
            let l = loro.lock().await;
            let current_vv = l.get_vv();
            
            if &current_vv != &*last_vv {
                let data = l.export_updates(&*last_vv)?;
                (Some(data), current_vv, l.peer_id())
            } else {
                (None, current_vv, l.peer_id())
            }
        }; // Locks released before list().await and create().await

        if let Some(data) = updates {
            if !data.is_empty() {
                let args = ListArguments::new()
                    .with_pagination(Pagination::new().with_limit(1))
                    .with_order(["-sequence_number"]);
                
                let resp = client.records("sync_updates").list::<serde_json::Value>(args).await;
                let mut max_seq = 0;
                match resp {
                    Ok(records) => {
                        if let Some(first) = records.records.first() {
                            max_seq = first.get("sequence_number").and_then(|v| v.as_i64()).unwrap_or(0);
                        }
                    }
                    Err(e) => {
                        println!("[Sync] Push: list check failed: {:?}", e);
                    }
                }

                let now = chrono::Utc::now().timestamp();
                let target_seq = max_seq + 1;

                let payload = serde_json::json!({
                    "peer_id": format!("p_{}", peer_id),
                    "data": data,
                    "sequence_number": target_seq,
                    "created_at": now,
                });
                
                if let Err(e) = client.records("sync_updates").create(&payload).await {
                    let err_msg = format!("{:?}", e);
                    println!("[Sync] Error pushing update: {}", err_msg);
                } else {
                    println!("[Sync] Successfully pushed update: seq={}", target_seq);
                    let mut last_vv_lock = last_pushed_vv.lock().await;
                    let lid = last_pulled_id.lock().await;
                    *last_vv_lock = new_vv;
                    let _ = Self::save_sync_state(&*last_vv_lock, &*lid, sync_state_path);
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
        Self::sync_loro(&self.client, &self.loro, &self.last_pushed_vv, &self.last_pulled_id, handle, &self.sync_state_path).await?;
        Ok(())
    }

    fn save_sync_state(vv: &VersionVector, last_id: &Option<String>, path: &std::path::PathBuf) -> Result<()> {
        let state = SyncState {
            last_pushed_vv: LoroManager::encode_vv(vv),
            last_pulled_id: last_id.clone(),
        };
        let content = serde_json::to_string(&state)?;
        
        // Atomic write: write to .tmp then rename
        let tmp_path = path.with_extension("tmp");
        fs::write(&tmp_path, content)?;
        fs::rename(tmp_path, path)?;
        
        Ok(())
    }
}

fn base64_or_hex_decode(s: &str) -> Vec<u8> {
    // 1. Try HEX first (stricter check, prevents misinterpreting hex as base64)
    if s.len() % 2 == 0 && s.chars().all(|c| c.is_ascii_hexdigit()) {
        if let Ok(data) = hex::decode(s) {
            return data;
        }
    }
    
    // 2. Fallback to base64
    use base64::{Engine as _, engine::general_purpose};
    if let Ok(data) = general_purpose::STANDARD.decode(s) {
        return data;
    }
    
    Vec::new()
}
