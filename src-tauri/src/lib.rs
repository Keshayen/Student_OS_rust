use crate::core::db::TrailbaseService;
use crate::core::models::{Task, SchoolNote, SchoolFlashcard, SchoolGrade, SwimGala, SwimSession, QualifyingTime};
use crate::core::fsrs_scheduler::{self, Rating};
use tauri::{State, Manager, Emitter};
use serde_json::Value;
use tokio::sync::Mutex; 
use fuzzy_matcher::FuzzyMatcher;
use fuzzy_matcher::skim::SkimMatcherV2;

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
async fn create_record_command(state: State<'_, AppState>, app: tauri::AppHandle, collection: String, record_json: String) -> Result<Value, String> {
    println!("[API] create_record_command: collection={}", collection);
    let trailbase = state.trailbase_service.lock().await;
    let record: Value = serde_json::from_str(&record_json).map_err(|e: serde_json::Error| e.to_string())?;

    let res = match collection.as_str() {
        "tasks" => {
            let record: Task = serde_json::from_value(record).map_err(|e: serde_json::Error| e.to_string())?;
            let created_record = trailbase.create_record(&collection, record).await.map_err(|e: anyhow::Error| e.to_string())?;
            serde_json::to_value(created_record).map_err(|e: serde_json::Error| e.to_string())
        },
        "school_notes" => {
            let record: SchoolNote = serde_json::from_value(record.clone()).map_err(|e: serde_json::Error| {
                eprintln!("[Deser Error] Failed to parse SchoolNote. Error: {}, Payload: {}", e, record);
                e.to_string()
            })?;
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
        _ => return Err(format!("Unknown collection: {}", collection)),
    };

    if res.is_ok() {
        let _ = app.emit("data-changed", ());
    }
    res
}

#[tauri::command]
async fn update_record_command(state: State<'_, AppState>, app: tauri::AppHandle, collection: String, record_json: String) -> Result<Value, String> {
    println!("[API] update_record_command: collection={}", collection);
    let trailbase = state.trailbase_service.lock().await;
    let record: Value = serde_json::from_str(&record_json).map_err(|e: serde_json::Error| e.to_string())?;

    let res = match collection.as_str() {
        "tasks" => {
            let record: Task = serde_json::from_value(record).map_err(|e: serde_json::Error| e.to_string())?;
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
        _ => return Err(format!("Unknown collection: {}", collection)),
    };

    if res.is_ok() {
        let _ = app.emit("data-changed", ());
    }
    res
}

#[tauri::command]
async fn delete_record_command(state: State<'_, AppState>, app: tauri::AppHandle, collection: String, record_id: String) -> Result<(), String> {
    let trailbase = state.trailbase_service.lock().await;

    match collection.as_str() {
        "tasks" => trailbase.delete_record::<Task>(&collection, &record_id).await.map_err(|e: anyhow::Error| e.to_string()),
        "school_notes" => trailbase.delete_record::<SchoolNote>(&collection, &record_id).await.map_err(|e: anyhow::Error| e.to_string()),
        "flashcards" => trailbase.delete_record::<SchoolFlashcard>(&collection, &record_id).await.map_err(|e: anyhow::Error| e.to_string()),
        "school_grades" => trailbase.delete_record::<SchoolGrade>(&collection, &record_id).await.map_err(|e: anyhow::Error| e.to_string()),
        "swim_sessions" => trailbase.delete_record::<SwimSession>(&collection, &record_id).await.map_err(|e: anyhow::Error| e.to_string()),
        "swim_galas" => trailbase.delete_record::<SwimGala>(&collection, &record_id).await.map_err(|e: anyhow::Error| e.to_string()),
        "qualifying_times" => trailbase.delete_record::<QualifyingTime>(&collection, &record_id).await.map_err(|e: anyhow::Error| e.to_string()),
        _ => return Err(format!("Unknown collection: {}", collection)),
    }?;

    let _ = app.emit("data-changed", ());
    Ok(())
}

#[tauri::command]
async fn nuke_database(state: State<'_, AppState>, app: tauri::AppHandle) -> Result<(), String> {
    let mut trailbase = state.trailbase_service.lock().await;
    trailbase.nuke_local_data().await.map_err(|e| e.to_string())?;
    let _ = app.emit("data-changed", ());
    Ok(())
}

#[tauri::command]
async fn refresh_data_command(app_handle: tauri::AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let trailbase = state.trailbase_service.lock().await;
    trailbase.refresh_data(&app_handle).await.map_err(|e| e.to_string())?;
    let _ = app_handle.emit("data-changed", ());
    Ok(())
}

use std::sync::atomic::Ordering;

#[tauri::command]
async fn get_connection_status(state: State<'_, AppState>) -> Result<bool, String> {
    let trailbase = state.trailbase_service.lock().await;
    Ok(trailbase.is_offline.load(Ordering::Relaxed))
}

#[tauri::command]
async fn review_flashcard(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    card_id: String,
    rating: u8,
    desired_retention: Option<f32>,
) -> Result<Value, String> {
    let res = (|| async {
        let trailbase = state.trailbase_service.lock().await;
        let flashcards: Vec<SchoolFlashcard> = trailbase
            .get_flashcards()
            .await
            .map_err(|e| e.to_string())?;

        let card = flashcards
            .iter()
            .find(|c| c.id == card_id)
            .ok_or_else(|| format!("Flashcard not found: {}", card_id))?;

        let r = Rating::from_u8(rating).ok_or_else(|| format!("Invalid rating: {}", rating))?;
        let retention = desired_retention.unwrap_or(0.9);
        
        #[cfg(feature = "fsrs-ml")]
        let algorithm_source = "Crate (Machine-Learning)";
        #[cfg(not(feature = "fsrs-ml"))]
        let algorithm_source = "Native (Rust Math Fallback)";

        println!("[FSRS] Using Algorithm: {}", algorithm_source);
        println!("[FSRS] Incoming Review: Card ID: {}, Rating: {:?} (u8: {})", card_id, r, rating);

        let output = fsrs_scheduler::review_card(card, r, retention);

        // Build updated card
        let mut updated = card.clone();
        updated.stability = output.stability;
        updated.difficulty = output.difficulty;
        updated.interval = output.interval;
        updated.due = output.due.clone();
        updated.lapses = output.lapses;
        updated.last_review = Some(output.last_review.clone());

        let updated_record = trailbase
            .update_record("flashcards", updated)
            .await
            .map_err(|e| e.to_string())?;

        serde_json::to_value(updated_record).map_err(|e| e.to_string())
    })()
    .await;

    if res.is_ok() {
        let _ = app.emit("data-changed", ());
    }
    res
}

#[tauri::command]
async fn get_next_review_states(
    state: State<'_, AppState>,
    card_id: String,
    desired_retention: Option<f32>,
) -> Result<Value, String> {
    let trailbase = state.trailbase_service.lock().await;
    let flashcards: Vec<SchoolFlashcard> = trailbase
        .get_flashcards()
        .await
        .map_err(|e| e.to_string())?;

    let card = flashcards
        .iter()
        .find(|c| c.id == card_id)
        .ok_or_else(|| format!("Flashcard not found: {}", card_id))?;

    let retention = desired_retention.unwrap_or(0.9);
    let states = fsrs_scheduler::get_next_states(card, retention);
    serde_json::to_value(states).map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
struct SearchResult {
    id: String,
    collection: String,
    title: String,
    subtitle: String,
    score: i64,
}

#[tauri::command]
async fn global_search(state: State<'_, AppState>, query: String) -> Result<Vec<SearchResult>, String> {
    let trailbase = state.trailbase_service.lock().await;
    let matcher = SkimMatcherV2::default();
    let mut results = Vec::new();

    if let Ok(notes) = trailbase.get_notes().await {
        for note in notes {
            let target = format!("{} {} {}", note.title, note.subject, note.content);
            if let Some(score) = matcher.fuzzy_match(&target, &query) {
                results.push(SearchResult { id: note.id.clone(), collection: "school_notes".to_string(), title: note.title.clone(), subtitle: note.subject.clone(), score });
            }
        }
    }
    
    if let Ok(tasks) = trailbase.get_tasks().await {
        for task in tasks {
            let subject = task.subject.unwrap_or_default();
            let target = format!("{} {}", task.title, subject);
            if let Some(score) = matcher.fuzzy_match(&target, &query) {
                results.push(SearchResult { id: task.id.clone(), collection: "tasks".to_string(), title: task.title.clone(), subtitle: subject, score });
            }
        }
    }

    if let Ok(swims) = trailbase.get_swim_sessions().await {
        for s in swims {
            let target = format!("{} {} {}m", s.stroke, s.notes, s.distance);
            if let Some(score) = matcher.fuzzy_match(&target, &query) {
                let title = format!("{}m {}", s.distance, s.stroke);
                results.push(SearchResult { id: s.id.clone(), collection: "swim_sessions".to_string(), title, subtitle: s.notes.clone(), score });
            }
        }
    }

    if let Ok(grades) = trailbase.get_grades().await {
        for g in grades {
            let cycle = g.cycle.clone();
            let target = format!("{} {} {}", g.title, g.subject, cycle);
            if let Some(score) = matcher.fuzzy_match(&target, &query) {
                results.push(SearchResult { id: g.id.clone(), collection: "school_grades".to_string(), title: g.title.clone(), subtitle: format!("{} • {}%", g.subject, (g.score as f32 / g.total as f32 * 100.0).round()), score });
            }
        }
    }

    results.sort_by(|a, b| b.score.cmp(&a.score));
    Ok(results)
}

#[tauri::command]
fn log_to_terminal(msg: String) {
    println!("[Webkit] {}", msg);
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
                get_connection_status,
                review_flashcard,
                get_next_review_states,
                global_search,
                log_to_terminal
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
                        if let Err(e) = trailbase.perform_initial_migration(&handle_clone).await {
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
