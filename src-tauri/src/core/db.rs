use trailbase_client::{Client, ListArguments, Filter, CompareOp};
use super::models::*;
use anyhow::{Result, anyhow};
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Arc; // Keep std::sync::Arc
use tokio::sync::Mutex; // Use tokio's Mutex

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum SyncOp {
    Create { collection: String, data: serde_json::Value },
    Update { collection: String, id: String, data: serde_json::Value },
    Delete { collection: String, id: String },
}

#[derive(Serialize, Deserialize, Default, Clone)]
pub struct AppData {
    pub tasks: Vec<Task>,
    pub notes: Vec<SchoolNote>,
    pub grades: Vec<SchoolGrade>,
    pub swims: Vec<SwimSession>,
    pub galas: Vec<SwimGala>,
    pub qts: Vec<QualifyingTime>,
    pub flashcards: Vec<SchoolFlashcard>,
    pub pending_sync: Vec<SyncOp>, // Queue for offline changes
}

use std::sync::atomic::{AtomicBool, Ordering};

pub struct TrailbaseService {
    client: Client, 
    user_id: String,
    cache: Arc<Mutex<AppData>>,
    storage_path: std::path::PathBuf,
    pub is_offline: Arc<AtomicBool>,
}

use tauri::{AppHandle, Emitter, Manager};
use tokio::time::{timeout, Duration};

impl TrailbaseService {
    pub async fn new(handle: AppHandle) -> Result<Self> {
        let storage_dir = handle.path().app_data_dir()
            .map_err(|_| anyhow!("Could not determine app data directory"))?;
        
        let storage_path = storage_dir.join("student_os_data.json");
        
        let _ = fs::create_dir_all(&storage_dir);

        let cache_data = if storage_path.exists() {
            if let Ok(content) = fs::read_to_string(&storage_path) {
                serde_json::from_str(&content).unwrap_or_default()
            } else {
                AppData::default()
            }
        } else {
            AppData::default()
        };

        let cache = Arc::new(Mutex::new(cache_data));
        let is_offline = Arc::new(AtomicBool::new(true));

        let server_url = "http://100.96.26.38:4000".to_string();
        
        // Standard initialization
        let client = Client::new(&server_url, None)?;
        
        println!("[System] Initialized in OFFLINE mode (Cache loaded)");

        Ok(Self {
            client,
            user_id: "LRA8iDK1iBUKGCdVIOff7CjVhxT2".to_string(),
            cache,
            storage_path,
            is_offline,
        })
    }

    pub fn start_background_sync(&self, handle: AppHandle) {
        let client_clone = self.client.clone();
        let cache_clone = self.cache.clone();
        let storage_path_clone = self.storage_path.clone();
        let is_offline_clone = self.is_offline.clone();
        let user_id_clone = self.user_id.clone();
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
                        
                        // Initial sync upon reconnection
                        Self::flush_sync_queue(&client_clone, &cache_clone, &storage_path_clone).await;
                        Self::sync_all_remote(&client_clone, &cache_clone, &storage_path_clone, &user_id_clone).await;
                    }
                } else {
                    // Check if we are still online
                    let heartbeat = timeout(
                        Duration::from_secs(5), 
                        client_clone.records("tasks").list::<serde_json::Value>(ListArguments::new().with_count(true))
                    ).await;

                    if heartbeat.is_err() || heartbeat.unwrap().is_err() {
                        println!("[Network] Connection lost. Switching to OFFLINE mode.");
                        is_offline_clone.store(true, Ordering::Relaxed);
                        offline_start_time = std::time::Instant::now(); 
                        let _ = handle.emit("connection-status", true);
                    } else {
                        // Still online, try flushing anything that might have been queued during momentary blips
                        Self::flush_sync_queue(&client_clone, &cache_clone, &storage_path_clone).await;
                    }
                }

                tokio::time::sleep(Duration::from_secs(2)).await;
            }
        });
    }

    async fn flush_sync_queue(client: &Client, cache: &Arc<Mutex<AppData>>, storage_path: &std::path::PathBuf) {
        let ops = {
            let mut data = cache.lock().await;
            if data.pending_sync.is_empty() { return; }
            let ops = data.pending_sync.clone();
            data.pending_sync.clear();
            ops
        };

        println!("[Sync] Flushing {} pending changes...", ops.len());

        let mut failed_ops = Vec::new();
        for op in ops {
            let res = match &op {
                SyncOp::Create { collection, data } => {
                    let mut clean_data = data.clone();
                    if let Some(obj) = clean_data.as_object_mut() {
                        obj.remove("id");
                    }
                    client.records(collection).create(&clean_data).await.map(|_| ())
                },
                SyncOp::Update { collection, id, data } => {
                    let mut clean_data = data.clone();
                    if let Some(obj) = clean_data.as_object_mut() {
                        obj.remove("id");
                    }
                    client.records(collection).update(id, &clean_data).await.map(|_| ())
                },
                SyncOp::Delete { collection, id } => client.records(collection).delete(id).await.map(|_| ()),
            };
            
            if let Err(e) = res {
                let err_msg = format!("{:?}", e);
                if err_msg.contains("HttpStatus(400)") {
                    println!("[Sync] Flush failed with 400 Bad Request. Op: {:?}, Error: {:#?}", op, e);
                    println!("[Sync] Dropping corrupt operation.");
                } else {
                    println!("[Sync] Flush failed for op, re-queuing: {:?}", e);
                    failed_ops.push(op);
                }
            }
        }
        
        let mut data = cache.lock().await;
        if !failed_ops.is_empty() {
            for op in failed_ops {
                data.pending_sync.push(op);
            }
        }
        
        if let Ok(json) = serde_json::to_string(&*data) {
            let _ = fs::write(storage_path, json);
        }
    }

    async fn sync_all_remote(client: &Client, cache: &Arc<Mutex<AppData>>, storage_path: &std::path::PathBuf, user_id: &str) {
        let tasks = Self::fetch_remote::<Task>(client, "tasks", user_id).await;
        let notes = Self::fetch_remote::<SchoolNote>(client, "school_notes", user_id).await;
        let grades = Self::fetch_remote::<SchoolGrade>(client, "school_grades", user_id).await;
        let swims = Self::fetch_remote::<SwimSession>(client, "swim_sessions", user_id).await;
        let galas = Self::fetch_remote::<SwimGala>(client, "swim_galas", user_id).await;
        let qts = Self::fetch_remote::<QualifyingTime>(client, "qualifying_times", user_id).await;
        let flashcards = Self::fetch_remote::<SchoolFlashcard>(client, "flashcards", user_id).await;

        let mut data = cache.lock().await;
        if let Ok(items) = tasks { data.tasks = items; }
        if let Ok(items) = notes { data.notes = items; }
        if let Ok(items) = grades { data.grades = items; }
        if let Ok(items) = swims { data.swims = items; }
        if let Ok(items) = galas { data.galas = items; }
        if let Ok(items) = qts { data.qts = items; }
        if let Ok(items) = flashcards { data.flashcards = items; }
        
        if let Ok(json) = serde_json::to_string(&*data) {
            let _ = fs::write(storage_path, json);
        }
        println!("[Data] Remote sync complete.");
    }

    pub async fn get_tasks(&self) -> Result<Vec<Task>> {
        let cache = self.cache.lock().await;
        Ok(cache.tasks.clone())
    }

    pub async fn get_notes(&self) -> Result<Vec<SchoolNote>> {
        let cache = self.cache.lock().await;
        Ok(cache.notes.clone())
    }

    pub async fn get_flashcards(&self) -> Result<Vec<SchoolFlashcard>> {
        let cache = self.cache.lock().await;
        Ok(cache.flashcards.clone())
    }

    pub async fn get_grades(&self) -> Result<Vec<SchoolGrade>> {
        let cache = self.cache.lock().await;
        Ok(cache.grades.clone())
    }

    pub async fn get_swim_sessions(&self) -> Result<Vec<SwimSession>> {
        let cache = self.cache.lock().await;
        Ok(cache.swims.clone())
    }

    pub async fn get_swim_galas(&self) -> Result<Vec<SwimGala>> {
        let cache = self.cache.lock().await;
        Ok(cache.galas.clone())
    }

    pub async fn get_qualifying_times(&self) -> Result<Vec<QualifyingTime>> {
        let cache = self.cache.lock().await;
        Ok(cache.qts.clone())
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

    // Generic method to create a new record
    pub async fn create_record<T>(&self, collection: &str, mut record: T) -> Result<T>
    where
        T: Serialize + for<'de> Deserialize<'de> + Clone + Identifiable + 'static,
    {
        let is_offline = self.is_offline.load(Ordering::Relaxed);
        let mut sync_needed = is_offline;
        
        println!("[Data] Creating new record in '{}' (Mode: {})", collection, if is_offline { "OFFLINE" } else { "ONLINE" });

        let record_id = if !is_offline {
            let mut val = serde_json::to_value(&record)?;
            if let Some(obj) = val.as_object_mut() {
                // CRITICAL: Remove ID so the DB generates it
                obj.remove("id");
            }
            match self.client.records(collection).create(&val).await {
                Ok(id) => {
                    println!("[Data] Successfully created remote record with ID: {}", id);
                    id
                },
                Err(e) => {
                    println!("[Sync] Remote create failed, queuing for later. Error: {:?}", e);
                    sync_needed = true;
                    let temp_id = format!("temp_{}", uuid::Uuid::new_v4());
                    println!("[Sync] Generated temporary ID: {}", temp_id);
                    temp_id
                }
            }
        } else {
            let temp_id = format!("temp_{}", uuid::Uuid::new_v4());
            println!("[Data] Offline mode: Generated temporary ID: {}", temp_id);
            temp_id
        };
        
        record.set_id(record_id.clone());
        
        // Update cache
        let mut cache = self.cache.lock().await;
        
        if sync_needed {
            cache.pending_sync.push(SyncOp::Create { 
                collection: collection.to_string(), 
                data: serde_json::to_value(record.clone())? 
            });
        }

        match collection {
            "tasks" => if let Ok(v) = serde_json::from_value::<Task>(serde_json::to_value(record.clone())?) { cache.tasks.push(v); },
            "school_notes" => if let Ok(v) = serde_json::from_value::<SchoolNote>(serde_json::to_value(record.clone())?) { cache.notes.push(v); },
            "school_grades" => if let Ok(v) = serde_json::from_value::<SchoolGrade>(serde_json::to_value(record.clone())?) { cache.grades.push(v); },
            "swim_sessions" => if let Ok(v) = serde_json::from_value::<SwimSession>(serde_json::to_value(record.clone())?) { cache.swims.push(v); },
            "swim_galas" => if let Ok(v) = serde_json::from_value::<SwimGala>(serde_json::to_value(record.clone())?) { cache.galas.push(v); },
            "qualifying_times" => if let Ok(v) = serde_json::from_value::<QualifyingTime>(serde_json::to_value(record.clone())?) { cache.qts.push(v); },
            "flashcards" => if let Ok(v) = serde_json::from_value::<SchoolFlashcard>(serde_json::to_value(record.clone())?) { cache.flashcards.push(v); },
            _ => { println!("[Warning] Attempted to save to unknown collection: {}", collection); }
        }
        
        let json_data = serde_json::to_string(&*cache).map_err(|e| anyhow!("Serialization error: {}", e))?;
        fs::write(&self.storage_path, json_data).map_err(|e| anyhow!("Disk write error: {}", e))?;
        
        Ok(record)
    }

    // Generic method to update an existing record
    pub async fn update_record<T>(&self, collection: &str, record: T) -> Result<T>
    where
        T: Serialize + for<'de> Deserialize<'de> + Clone + Identifiable + 'static,
    {
        let is_offline = self.is_offline.load(Ordering::Relaxed);
        let mut sync_needed = is_offline;
        
        if !is_offline {
            let mut update_data = serde_json::to_value(&record)?;
            if let Some(obj) = update_data.as_object_mut() {
                obj.remove("id");
            }
            if self.client.records(collection).update(record.get_id(), &update_data).await.is_err() {
                sync_needed = true;
            }
        }

        let mut cache = self.cache.lock().await;
        let record_id = record.get_id();

        if sync_needed {
            cache.pending_sync.push(SyncOp::Update { 
                collection: collection.to_string(), 
                id: record_id.to_string(),
                data: serde_json::to_value(record.clone())? 
            });
        }
        
        // Update local arrays...
        match collection {
            "tasks" => if let Ok(v) = serde_json::from_value::<Task>(serde_json::to_value(record.clone())?) { if let Some(pos) = cache.tasks.iter().position(|r| r.get_id() == record_id) { cache.tasks[pos] = v; } }
            "school_notes" => if let Ok(v) = serde_json::from_value::<SchoolNote>(serde_json::to_value(record.clone())?) { if let Some(pos) = cache.notes.iter().position(|r| r.get_id() == record_id) { cache.notes[pos] = v; } }
            "school_grades" => if let Ok(v) = serde_json::from_value::<SchoolGrade>(serde_json::to_value(record.clone())?) { if let Some(pos) = cache.grades.iter().position(|r| r.get_id() == record_id) { cache.grades[pos] = v; } }
            "swim_sessions" => if let Ok(v) = serde_json::from_value::<SwimSession>(serde_json::to_value(record.clone())?) { if let Some(pos) = cache.swims.iter().position(|r| r.get_id() == record_id) { cache.swims[pos] = v; } }
            "swim_galas" => if let Ok(v) = serde_json::from_value::<SwimGala>(serde_json::to_value(record.clone())?) { if let Some(pos) = cache.galas.iter().position(|r| r.get_id() == record_id) { cache.galas[pos] = v; } }
            "qualifying_times" => if let Ok(v) = serde_json::from_value::<QualifyingTime>(serde_json::to_value(record.clone())?) { if let Some(pos) = cache.qts.iter().position(|r| r.get_id() == record_id) { cache.qts[pos] = v; } }
            "flashcards" => if let Ok(v) = serde_json::from_value::<SchoolFlashcard>(serde_json::to_value(record.clone())?) { if let Some(pos) = cache.flashcards.iter().position(|r| r.get_id() == record_id) { cache.flashcards[pos] = v; } }
            _ => {},
        }
        
        if let Ok(json) = serde_json::to_string(&*cache) {
            let _ = fs::write(&self.storage_path, json);
        }
        Ok(record)
    }

    // Generic method to delete a record
    pub async fn delete_record<T>(&self, collection: &str, record_id: &str) -> Result<()>
    where
        T: Serialize + for<'de> Deserialize<'de> + Clone + Identifiable + 'static,
    {
        let is_offline = self.is_offline.load(Ordering::Relaxed);
        let mut sync_needed = is_offline;

        println!("[Data Service] Deleting from '{}' with ID: {} (Offline: {})", collection, record_id, is_offline);

        // Map 'habits' to 'tasks' for underlying operation
        let effective_collection = if collection == "habits" { "tasks" } else { collection };

        if !is_offline {
            if let Err(e) = self.client.records(effective_collection).delete(record_id).await {
                println!("[Sync] Remote delete failed for {}/{}: {:?}", effective_collection, record_id, e);
                sync_needed = true;
            } else {
                println!("[Data] Successfully deleted remote record {}/{}", effective_collection, record_id);
            }
        }

        let mut cache = self.cache.lock().await; 

        if sync_needed {
            cache.pending_sync.push(SyncOp::Delete { 
                collection: effective_collection.to_string(), 
                id: record_id.to_string() 
            });
        }

        let mut deleted = false;
        match effective_collection {
            "tasks" => {
                let initial_len = cache.tasks.len();
                cache.tasks.retain(|r: &Task| r.get_id() != record_id);
                deleted = cache.tasks.len() < initial_len;
            }, 
            "school_notes" => {
                let initial_len = cache.notes.len();
                cache.notes.retain(|r: &SchoolNote| r.get_id() != record_id);
                deleted = cache.notes.len() < initial_len;
            }, 
            "school_grades" => {
                let initial_len = cache.grades.len();
                cache.grades.retain(|r: &SchoolGrade| r.get_id() != record_id);
                deleted = cache.grades.len() < initial_len;
            }, 
            "swim_sessions" => {
                let initial_len = cache.swims.len();
                cache.swims.retain(|r: &SwimSession| r.get_id() != record_id);
                deleted = cache.swims.len() < initial_len;
            }, 
            "swim_galas" => {
                let initial_len = cache.galas.len();
                cache.galas.retain(|r: &SwimGala| r.get_id() != record_id);
                deleted = cache.galas.len() < initial_len;
            }, 
            "qualifying_times" => {
                let initial_len = cache.qts.len();
                cache.qts.retain(|r: &QualifyingTime| r.get_id() != record_id);
                deleted = cache.qts.len() < initial_len;
            }, 
            "flashcards" => {
                let initial_len = cache.flashcards.len();
                cache.flashcards.retain(|r: &SchoolFlashcard| r.get_id() != record_id);
                deleted = cache.flashcards.len() < initial_len;
            }, 
            _ => return Err(anyhow!("Unknown collection: {}", effective_collection)),
        }

        if deleted {
            println!("[Data] Local record deleted successfully.");
        } else {
            println!("[Warning] No record found to delete in '{}' with ID: {}", effective_collection, record_id);
        }

        if let Ok(json) = serde_json::to_string(&*cache) {
            let _ = fs::write(&self.storage_path, json);
        }
        Ok(())
    }

    pub async fn nuke_local_data(&mut self) -> Result<()> {
        let mut cache = self.cache.lock().await;
        *cache = AppData::default();
        if let Ok(json) = serde_json::to_string(&*cache) {
            let _ = fs::write(&self.storage_path, json);
        }
        Ok(())
    }

    pub async fn refresh_data(&self) -> Result<()> {
        if self.is_offline.load(Ordering::Relaxed) {
            return Err(anyhow!("Cannot refresh while offline"));
        }
        Self::sync_all_remote(&self.client, &self.cache, &self.storage_path, &self.user_id).await;
        Ok(())
    }
}
