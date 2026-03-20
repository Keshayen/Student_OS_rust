use crate::core::db::TrailbaseService;
use crate::core::models::{Task, SchoolNote, SchoolFlashcard, SchoolGrade, SwimGala, SwimSession, QualifyingTime};
use tauri::{State, Manager};
use serde_json::Value;
use tokio::sync::Mutex; 

mod core; 

pub struct AppState {
    pub trailbase_service: Mutex<TrailbaseService>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
async fn get_tasks(state: State<'_, AppState>) -> Result<Vec<Task>, String> {
    let trailbase = state.trailbase_service.lock().await;
    (*trailbase).get_tasks().await.map_err(|e: anyhow::Error| e.to_string())
}

#[tauri::command]
async fn get_notes(state: State<'_, AppState>) -> Result<Vec<SchoolNote>, String> {
    let trailbase = state.trailbase_service.lock().await;
    (*trailbase).get_notes().await.map_err(|e: anyhow::Error| e.to_string())
}

#[tauri::command]
async fn get_flashcards(state: State<'_, AppState>) -> Result<Vec<SchoolFlashcard>, String> {
    let trailbase = state.trailbase_service.lock().await;
    (*trailbase).get_flashcards().await.map_err(|e: anyhow::Error| e.to_string())
}

#[tauri::command]
async fn get_grades(state: State<'_, AppState>) -> Result<Vec<SchoolGrade>, String> {
    let trailbase = state.trailbase_service.lock().await;
    (*trailbase).get_grades().await.map_err(|e: anyhow::Error| e.to_string())
}

#[tauri::command]
async fn get_swim_sessions(state: State<'_, AppState>) -> Result<Vec<SwimSession>, String> {
    let trailbase = state.trailbase_service.lock().await;
    (*trailbase).get_swim_sessions().await.map_err(|e: anyhow::Error| e.to_string())
}

#[tauri::command]
async fn get_swim_galas(state: State<'_, AppState>) -> Result<Vec<SwimGala>, String> {
    let trailbase = state.trailbase_service.lock().await;
    (*trailbase).get_swim_galas().await.map_err(|e: anyhow::Error| e.to_string())
}

#[tauri::command]
async fn get_qualifying_times(state: State<'_, AppState>) -> Result<Vec<QualifyingTime>, String> {
    let trailbase = state.trailbase_service.lock().await;
    (*trailbase).get_qualifying_times().await.map_err(|e: anyhow::Error| e.to_string())
}

#[tauri::command]
async fn create_record_command(state: State<'_, AppState>, collection: String, record_json: String) -> Result<Value, String> {
    let trailbase = state.trailbase_service.lock().await;
    let record: Value = serde_json::from_str(&record_json).map_err(|e: serde_json::Error| e.to_string())?;

    match collection.as_str() {
        "tasks" => {
            let record: Task = serde_json::from_value(record).map_err(|e: serde_json::Error| e.to_string())?;
            let created_record = trailbase.create_record(&collection, record).await.map_err(|e: anyhow::Error| e.to_string())?;
            serde_json::to_value(created_record).map_err(|e: serde_json::Error| e.to_string())
        },
        "school_notes" => {
            let record: SchoolNote = serde_json::from_value(record).map_err(|e: serde_json::Error| e.to_string())?;
            let created_record = trailbase.create_record(&collection, record).await.map_err(|e: anyhow::Error| e.to_string())?;
            serde_json::to_value(created_record).map_err(|e: serde_json::Error| e.to_string())
        },
        "flashcards" => {
            let record: SchoolFlashcard = serde_json::from_value(record).map_err(|e: serde_json::Error| e.to_string())?;
            let created_record = trailbase.create_record(&collection, record).await.map_err(|e: anyhow::Error| e.to_string())?;
            serde_json::to_value(created_record).map_err(|e: serde_json::Error| e.to_string())
        },
        "school_grades" => {
            let record: SchoolGrade = serde_json::from_value(record).map_err(|e: serde_json::Error| e.to_string())?;
            let created_record = trailbase.create_record(&collection, record).await.map_err(|e: anyhow::Error| e.to_string())?;
            serde_json::to_value(created_record).map_err(|e: serde_json::Error| e.to_string())
        },
        "swim_sessions" => {
            let record: SwimSession = serde_json::from_value(record).map_err(|e: serde_json::Error| e.to_string())?;
            let created_record = trailbase.create_record(&collection, record).await.map_err(|e: anyhow::Error| e.to_string())?;
            serde_json::to_value(created_record).map_err(|e: serde_json::Error| e.to_string())
        },
        "swim_galas" => {
            let record: SwimGala = serde_json::from_value(record).map_err(|e: serde_json::Error| e.to_string())?;
            let created_record = trailbase.create_record(&collection, record).await.map_err(|e: anyhow::Error| e.to_string())?;
            serde_json::to_value(created_record).map_err(|e: serde_json::Error| e.to_string())
        },
        "qualifying_times" => {
            let record: QualifyingTime = serde_json::from_value(record).map_err(|e: serde_json::Error| e.to_string())?;
            let created_record = trailbase.create_record(&collection, record).await.map_err(|e: anyhow::Error| e.to_string())?;
            serde_json::to_value(created_record).map_err(|e: serde_json::Error| e.to_string())
        },
        _ => Err(format!("Unknown collection: {}", collection)),
    }
}

#[tauri::command]
async fn update_record_command(state: State<'_, AppState>, collection: String, record_json: String) -> Result<Value, String> {
    let trailbase = state.trailbase_service.lock().await;
    let record: Value = serde_json::from_str(&record_json).map_err(|e: serde_json::Error| e.to_string())?;

    match collection.as_str() {
        "tasks" => {
            let record: Task = serde_json::from_value(record.clone()).map_err(|e: serde_json::Error| {
                eprintln!("[Deser Error] Failed to parse Task. Error: {}, Payload: {}", e, record);
                e.to_string()
            })?;
            let updated_record = trailbase.update_record(&collection, record).await.map_err(|e: anyhow::Error| e.to_string())?;
            serde_json::to_value(updated_record).map_err(|e: serde_json::Error| e.to_string())
        },
        "school_notes" => {
            let record: SchoolNote = serde_json::from_value(record).map_err(|e: serde_json::Error| e.to_string())?;
            let updated_record = trailbase.update_record(&collection, record).await.map_err(|e: anyhow::Error| e.to_string())?;
            serde_json::to_value(updated_record).map_err(|e: serde_json::Error| e.to_string())
        },
        "flashcards" => {
            let record: SchoolFlashcard = serde_json::from_value(record).map_err(|e: serde_json::Error| e.to_string())?;
            let updated_record = trailbase.update_record(&collection, record).await.map_err(|e: anyhow::Error| e.to_string())?;
            serde_json::to_value(updated_record).map_err(|e: serde_json::Error| e.to_string())
        },
        "school_grades" => {
            let record: SchoolGrade = serde_json::from_value(record).map_err(|e: serde_json::Error| e.to_string())?;
            let updated_record = trailbase.update_record(&collection, record).await.map_err(|e: anyhow::Error| e.to_string())?;
            serde_json::to_value(updated_record).map_err(|e: serde_json::Error| e.to_string())
        },
        "swim_sessions" => {
            let record: SwimSession = serde_json::from_value(record).map_err(|e: serde_json::Error| e.to_string())?;
            let updated_record = trailbase.update_record(&collection, record).await.map_err(|e: anyhow::Error| e.to_string())?;
            serde_json::to_value(updated_record).map_err(|e: serde_json::Error| e.to_string())
        },
        "swim_galas" => {
            let record: SwimGala = serde_json::from_value(record).map_err(|e: serde_json::Error| e.to_string())?;
            let updated_record = trailbase.update_record(&collection, record).await.map_err(|e: anyhow::Error| e.to_string())?;
            serde_json::to_value(updated_record).map_err(|e: serde_json::Error| e.to_string())
        },
        "qualifying_times" => {
            let record: QualifyingTime = serde_json::from_value(record).map_err(|e: serde_json::Error| e.to_string())?;
            let updated_record = trailbase.update_record(&collection, record).await.map_err(|e: anyhow::Error| e.to_string())?;
            serde_json::to_value(updated_record).map_err(|e: serde_json::Error| e.to_string())
        },
        _ => Err(format!("Unknown collection: {}", collection)),
    }
}

#[tauri::command]
async fn delete_record_command(state: State<'_, AppState>, collection: String, record_id: String) -> Result<(), String> {
    let trailbase = state.trailbase_service.lock().await;

    match collection.as_str() {
        "tasks" => trailbase.delete_record::<Task>(&collection, &record_id).await.map_err(|e: anyhow::Error| e.to_string()),
        "school_notes" => trailbase.delete_record::<SchoolNote>(&collection, &record_id).await.map_err(|e: anyhow::Error| e.to_string()),
        "flashcards" => trailbase.delete_record::<SchoolFlashcard>(&collection, &record_id).await.map_err(|e: anyhow::Error| e.to_string()),
        "school_grades" => trailbase.delete_record::<SchoolGrade>(&collection, &record_id).await.map_err(|e: anyhow::Error| e.to_string()),
        "swim_sessions" => trailbase.delete_record::<SwimSession>(&collection, &record_id).await.map_err(|e: anyhow::Error| e.to_string()),
        "swim_galas" => trailbase.delete_record::<SwimGala>(&collection, &record_id).await.map_err(|e: anyhow::Error| e.to_string()),
        "qualifying_times" => trailbase.delete_record::<QualifyingTime>(&collection, &record_id).await.map_err(|e: anyhow::Error| e.to_string()),
        _ => Err(format!("Unknown collection: {}", collection)),
    }
}

#[tauri::command]
async fn nuke_database(state: State<'_, AppState>) -> Result<(), String> {
    let mut trailbase = state.trailbase_service.lock().await;
    trailbase.nuke_local_data().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn refresh_data_command(app_handle: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let trailbase = state.trailbase_service.lock().await;
    trailbase.refresh_data(&app_handle).await.map_err(|e| e.to_string())
}

use std::sync::atomic::Ordering;

#[tauri::command]
async fn get_connection_status(state: State<'_, AppState>) -> Result<bool, String> {
    let trailbase = state.trailbase_service.lock().await;
    Ok(trailbase.is_offline.load(Ordering::Relaxed))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");

    let handle = rt.block_on(async {
        tauri::Builder::default()
            .plugin(tauri_plugin_opener::init())
            .plugin(tauri_plugin_fs::init())
            .invoke_handler(tauri::generate_handler![
                get_tasks,
                get_notes,
                get_flashcards,
                get_grades,
                get_swim_sessions,
                get_swim_galas,
                get_qualifying_times,
                create_record_command,
                update_record_command,
                delete_record_command,
                nuke_database,
                refresh_data_command,
                get_connection_status
            ])
            .build(tauri::generate_context!())
    }).expect("Failed to build tauri application");

    let trailbase_service = rt.block_on(async {
        TrailbaseService::new(handle.handle().clone()).await
    }).expect("Failed to initialize TrailbaseService");

    handle.manage(AppState {
        trailbase_service: Mutex::new(trailbase_service),
    });

    handle.run(|app_handle, event| {
        match event {
            tauri::RunEvent::Ready => {
                let handle_clone = app_handle.clone();
                
                tauri::async_runtime::spawn(async move {
                    let state = handle_clone.state::<AppState>();
                    {
                        let trailbase = state.trailbase_service.lock().await;
                        if let Err(e) = trailbase.perform_initial_migration().await {
                            eprintln!("[Migration] Error during initial migration: {:?}", e);
                        }
                        trailbase.start_background_sync(handle_clone.clone());
                    }
                });
            }
            _ => {}
        }
    });
}
