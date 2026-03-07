use super::models::*;
use chrono::{Utc, Duration};

pub enum ReviewQuality {
    Again,
    Hard,
    Good,
    Easy,
}

pub struct SpacedRepetitionService;

impl SpacedRepetitionService {
    pub fn process_review(card: &SchoolFlashcard, quality: ReviewQuality) -> SchoolFlashcard {
        let q = match quality {
            ReviewQuality::Again => 0,
            ReviewQuality::Hard => 3,
            ReviewQuality::Good => 4,
            ReviewQuality::Easy => 5,
        };

        let current_ease: f64 = match &card.ease_factor {
            serde_json::Value::String(s) => s.parse().unwrap_or(2.5),
            serde_json::Value::Number(n) => n.as_f64().unwrap_or(2.5),
            _ => 2.5,
        };

        let mut new_ease = current_ease + (0.1 - (5.0 - q as f64) * (0.08 + (5.0 - q as f64) * 0.02));
        if new_ease < 1.3 { new_ease = 1.3; }

        let mut new_repetitions = card.repetitions;
        let mut _new_interval = card.interval;

        if q < 3 {
            new_repetitions = 0;
            _new_interval = 1;
        } else {
            new_repetitions += 1;
            if new_repetitions == 1 {
                _new_interval = 1;
            } else if new_repetitions == 2 {
                _new_interval = 6;
            } else {
                _new_interval = (card.interval as f64 * new_ease).round() as i32;
            }
        }

        let mut updated_card = card.clone();
        updated_card.next_review = (Utc::now() + Duration::days(_new_interval as i64)).to_rfc3339();
        updated_card.interval = _new_interval;
        updated_card.ease_factor = serde_json::Value::String(format!("{:.2}", new_ease));
        updated_card.repetitions = new_repetitions;
        updated_card
    }
}

pub struct HabitService;

impl HabitService {
    pub fn calculate_streak(completed_dates: &[String], _frequency: &TaskFrequency) -> i32 {
        if completed_dates.is_empty() { return 0; }
        // Simple placeholder for now as we transition to raw strings
        completed_dates.len() as i32
    }
}
