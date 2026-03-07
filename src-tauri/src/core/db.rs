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
    pub swim_goals: Vec<SwimGoal>,
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
                        
                        let mut data = cache_clone.lock().await;

                        // 1. Flush pending changes to remote
                        if !data.pending_sync.is_empty() {
                            println!("[Sync] Flushing {} pending offline changes...", data.pending_sync.len());
                            let ops = data.pending_sync.clone();
                            data.pending_sync.clear(); // Clear immediately to prevent double-syncing if we crash

                            for op in ops {
                                match op {
                                    SyncOp::Create { collection, data } => {
                                        let _ = client_clone.records(&collection).create(&data).await;
                                    }
                                    SyncOp::Update { collection, id, data } => {
                                        let _ = client_clone.records(&collection).update(&id, &data).await;
                                    }
                                    SyncOp::Delete { collection, id } => {
                                        let _ = client_clone.records(&collection).delete(&id).await;
                                    }
                                }
                            }
                            println!("[Sync] Offline changes pushed to server.");
                        }

                        // 2. Syncing all data from remote...
                        let _ = Self::fetch_remote::<Task>(&client_clone, "tasks", &user_id_clone).await.map(|items| data.tasks = items);
                        let _ = Self::fetch_remote::<SchoolNote>(&client_clone, "school_notes", &user_id_clone).await.map(|items| data.notes = items);
                        let _ = Self::fetch_remote::<SchoolGrade>(&client_clone, "school_grades", &user_id_clone).await.map(|items| data.grades = items);
                        let _ = Self::fetch_remote::<SwimSession>(&client_clone, "swim_sessions", &user_id_clone).await.map(|items| data.swims = items);
                        let _ = Self::fetch_remote::<SwimGala>(&client_clone, "swim_galas", &user_id_clone).await.map(|items| data.galas = items);
                        let _ = Self::fetch_remote::<QualifyingTime>(&client_clone, "qualifying_times", &user_id_clone).await.map(|items| data.qts = items);
                        let _ = Self::fetch_remote::<SwimGoal>(&client_clone, "swim_goals", &user_id_clone).await.map(|items| data.swim_goals = items);
                        let _ = Self::fetch_remote::<SchoolFlashcard>(&client_clone, "flashcards", &user_id_clone).await.map(|items| data.flashcards = items);

                        let _ = fs::write(&storage_path_clone, serde_json::to_string(&*data).unwrap());
                        println!("[Data] Sync complete. Cache updated.");
                    }
                } else {
                    let heartbeat = timeout(
                        Duration::from_secs(5), 
                        client_clone.records("tasks").list::<serde_json::Value>(ListArguments::new().with_count(true))
                    ).await;

                    if heartbeat.is_err() || heartbeat.unwrap().is_err() {
                        println!("[Network] Connection lost (Server unreachable). Switching to OFFLINE mode.");
                        is_offline_clone.store(true, Ordering::Relaxed);
                        offline_start_time = std::time::Instant::now(); 
                        let _ = handle.emit("connection-status", true);
                    }
                }

                tokio::time::sleep(Duration::from_secs(2)).await;
            }
        });
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

    pub async fn get_swim_goals(&self) -> Result<Vec<SwimGoal>> {
        let cache = self.cache.lock().await;
        Ok(cache.swim_goals.clone())
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
        
        let record_id = if !is_offline {
            match self.client.records(collection).create(&serde_json::to_value(&record)?).await {
                Ok(id) => id,
                Err(_) => uuid::Uuid::new_v4().to_string(), 
            }
        } else {
            uuid::Uuid::new_v4().to_string()
        };
        
        record.set_id(record_id.clone());
        
        // Update cache
        let mut cache = self.cache.lock().await;
        
        if is_offline {
            cache.pending_sync.push(SyncOp::Create { 
                collection: collection.to_string(), 
                data: serde_json::to_value(record.clone())? 
            });
        }

        match collection {
            "tasks" => {
                if let Ok(v) = serde_json::from_value::<Task>(serde_json::to_value(record.clone())?) {
                    cache.tasks.push(v);
                }
            }
            "school_notes" => {
                if let Ok(v) = serde_json::from_value::<SchoolNote>(serde_json::to_value(record.clone())?) {
                    cache.notes.push(v);
                }
            }
            "school_grades" => {
                if let Ok(v) = serde_json::from_value::<SchoolGrade>(serde_json::to_value(record.clone())?) {
                    cache.grades.push(v);
                }
            }
            "swim_sessions" => {
                if let Ok(v) = serde_json::from_value::<SwimSession>(serde_json::to_value(record.clone())?) {
                    cache.swims.push(v);
                }
            }
            "swim_galas" => {
                if let Ok(v) = serde_json::from_value::<SwimGala>(serde_json::to_value(record.clone())?) {
                    cache.galas.push(v);
                }
            }
            "qualifying_times" => {
                if let Ok(v) = serde_json::from_value::<QualifyingTime>(serde_json::to_value(record.clone())?) {
                    cache.qts.push(v);
                }
            }
            "swim_goals" => {
                if let Ok(v) = serde_json::from_value::<SwimGoal>(serde_json::to_value(record.clone())?) {
                    cache.swim_goals.push(v);
                }
            }
            "flashcards" => {
                if let Ok(v) = serde_json::from_value::<SchoolFlashcard>(serde_json::to_value(record.clone())?) {
                    cache.flashcards.push(v);
                }
            }
            _ => {}
        }
        
        let _ = fs::write(&self.storage_path, serde_json::to_string(&*cache).unwrap());
        Ok(record)
    }

    // Generic method to update an existing record
    pub async fn update_record<T>(&self, collection: &str, record: T) -> Result<T>
    where
        T: Serialize + for<'de> Deserialize<'de> + Clone + Identifiable + 'static,
    {
        let is_offline = self.is_offline.load(Ordering::Relaxed);
        
        if !is_offline {
            let _ = self.client.records(collection).update(record.get_id(), &serde_json::to_value(&record)?).await;
        }

        let mut cache = self.cache.lock().await;
        let record_id = record.get_id();

        if is_offline {
            cache.pending_sync.push(SyncOp::Update { 
                collection: collection.to_string(), 
                id: record_id.to_string(),
                data: serde_json::to_value(record.clone())? 
            });
        }
        
        match collection {
            "tasks" => {
                if let Ok(v) = serde_json::from_value::<Task>(serde_json::to_value(record.clone())?) {
                    if let Some(pos) = cache.tasks.iter().position(|r| r.get_id() == record_id) {
                        cache.tasks[pos] = v;
                    }
                }
            }
            "school_notes" => {
                if let Ok(v) = serde_json::from_value::<SchoolNote>(serde_json::to_value(record.clone())?) {
                    if let Some(pos) = cache.notes.iter().position(|r| r.get_id() == record_id) {
                        cache.notes[pos] = v;
                    }
                }
            }
            "school_grades" => {
                if let Ok(v) = serde_json::from_value::<SchoolGrade>(serde_json::to_value(record.clone())?) {
                    if let Some(pos) = cache.grades.iter().position(|r| r.get_id() == record_id) {
                        cache.grades[pos] = v;
                    }
                }
            }
            "swim_sessions" => {
                if let Ok(v) = serde_json::from_value::<SwimSession>(serde_json::to_value(record.clone())?) {
                    if let Some(pos) = cache.swims.iter().position(|r| r.get_id() == record_id) {
                        cache.swims[pos] = v;
                    }
                }
            }
            "swim_galas" => {
                if let Ok(v) = serde_json::from_value::<SwimGala>(serde_json::to_value(record.clone())?) {
                    if let Some(pos) = cache.galas.iter().position(|r| r.get_id() == record_id) {
                        cache.galas[pos] = v;
                    }
                }
            }
            "qualifying_times" => {
                if let Ok(v) = serde_json::from_value::<QualifyingTime>(serde_json::to_value(record.clone())?) {
                    if let Some(pos) = cache.qts.iter().position(|r| r.get_id() == record_id) {
                        cache.qts[pos] = v;
                    }
                }
            }
            "swim_goals" => {
                if let Ok(v) = serde_json::from_value::<SwimGoal>(serde_json::to_value(record.clone())?) {
                    if let Some(pos) = cache.swim_goals.iter().position(|r| r.get_id() == record_id) {
                        cache.swim_goals[pos] = v;
                    }
                }
            }
            "flashcards" => {
                if let Ok(v) = serde_json::from_value::<SchoolFlashcard>(serde_json::to_value(record.clone())?) {
                    if let Some(pos) = cache.flashcards.iter().position(|r| r.get_id() == record_id) {
                        cache.flashcards[pos] = v;
                    }
                }
            }
            _ => {},
        }
        
        let _ = fs::write(&self.storage_path, serde_json::to_string(&*cache).unwrap());
        Ok(record)
    }

    // Generic method to delete a record
    pub async fn delete_record<T>(&self, collection: &str, record_id: &str) -> Result<()>
    where
        T: Serialize + for<'de> Deserialize<'de> + Clone + Identifiable + 'static,
    {
        let is_offline = self.is_offline.load(Ordering::Relaxed);

        if !is_offline {
            let _ = self.client.records(collection).delete(record_id).await;
        }

        let mut cache = self.cache.lock().await; 

        if is_offline {
            cache.pending_sync.push(SyncOp::Delete { 
                collection: collection.to_string(), 
                id: record_id.to_string() 
            });
        }

        // Remove from cache based on collection type
        match collection {
            "tasks" => cache.tasks.retain(|r: &Task| r.get_id() != record_id), 
            "school_notes" => cache.notes.retain(|r: &SchoolNote| r.get_id() != record_id), 
            "school_grades" => cache.grades.retain(|r: &SchoolGrade| r.get_id() != record_id), 
            "swim_sessions" => cache.swims.retain(|r: &SwimSession| r.get_id() != record_id), 
            "swim_galas" => cache.galas.retain(|r: &SwimGala| r.get_id() != record_id), 
            "qualifying_times" => cache.qts.retain(|r: &QualifyingTime| r.get_id() != record_id), 
            "swim_goals" => cache.swim_goals.retain(|r: &SwimGoal| r.get_id() != record_id), 
            "flashcards" => cache.flashcards.retain(|r: &SchoolFlashcard| r.get_id() != record_id), 
            _ => {},
        }
        let _ = fs::write(&self.storage_path, serde_json::to_string(&*cache).unwrap());
        Ok(())
    }

    pub async fn nuke_local_data(&mut self) -> Result<()> {
        let mut cache = self.cache.lock().await;
        *cache = AppData::default();
        let _ = fs::write(&self.storage_path, serde_json::to_string(&*cache).unwrap());
        Ok(())
    }

    pub async fn refresh_data(&self) -> Result<()> {
        if self.is_offline.load(Ordering::Relaxed) {
            return Err(anyhow!("Cannot refresh while offline"));
        }

        let mut data = self.cache.lock().await;
        
        if let Ok(tasks) = Self::fetch_remote::<Task>(&self.client, "tasks", &self.user_id).await {
            data.tasks = tasks;
        }
        if let Ok(notes) = Self::fetch_remote::<SchoolNote>(&self.client, "school_notes", &self.user_id).await {
            data.notes = notes;
        }
        if let Ok(grades) = Self::fetch_remote::<SchoolGrade>(&self.client, "school_grades", &self.user_id).await {
            data.grades = grades;
        }
        if let Ok(swims) = Self::fetch_remote::<SwimSession>(&self.client, "swim_sessions", &self.user_id).await {
            data.swims = swims;
        }
        if let Ok(galas) = Self::fetch_remote::<SwimGala>(&self.client, "swim_galas", &self.user_id).await {
            data.galas = galas;
        }
        if let Ok(qts) = Self::fetch_remote::<QualifyingTime>(&self.client, "qualifying_times", &self.user_id).await {
            data.qts = qts;
        }
        if let Ok(swim_goals) = Self::fetch_remote::<SwimGoal>(&self.client, "swim_goals", &self.user_id).await {
            data.swim_goals = swim_goals;
        }
        if let Ok(flashcards) = Self::fetch_remote::<SchoolFlashcard>(&self.client, "flashcards", &self.user_id).await {
            data.flashcards = flashcards;
        }

        let _ = fs::write(&self.storage_path, serde_json::to_string(&*data).unwrap());
        Ok(())
    }
}
