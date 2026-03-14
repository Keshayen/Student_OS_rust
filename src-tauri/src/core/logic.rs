use super::models::*;
use chrono::{Utc, Duration};

#[allow(dead_code)]
pub enum ReviewQuality {
    Again,
    Hard,
    Good,
    Easy,
}

#[allow(dead_code)]
pub struct SpacedRepetitionService;

impl SpacedRepetitionService {
    pub fn process_review(card: &SchoolFlashcard, quality: ReviewQuality) -> SchoolFlashcard {
        let q = match quality {
            ReviewQuality::Again => 0,
            ReviewQuality::Hard => 3,
            ReviewQuality::Good => 4,
            ReviewQuality::Easy => 5,
        };

        let current_ease: f64 = card.ease_factor.parse().unwrap_or(2.5);

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
        updated_card.ease_factor = format!("{:.2}", new_ease);
        updated_card.repetitions = new_repetitions;
        updated_card
    }
}

#[allow(dead_code)]
pub struct HabitService;

impl HabitService {
    #[allow(dead_code)]
    pub fn calculate_streak(completed_dates: &[String], _frequency: &TaskFrequency) -> i32 {
        if completed_dates.is_empty() { return 0; }
        // Simple placeholder for now as we transition to raw strings
        completed_dates.len() as i32
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_srs_process_review() {
        let mut card = SchoolFlashcard {
            id: "test1".to_string(),
            user_id: "user1".to_string(),
            subject: "Math".to_string(),
            note_id: "note1".to_string(),
            question: "1+1?".to_string(),
            answer: "2".to_string(),
            interval: 1,
            ease_factor: "2.5".to_string(),
            repetitions: 0,
            next_review: "".to_string(),
            created_at: "".to_string(),
            firestore_id: None,
            image_url: None,
        };

        // Review 1: Good
        card = SpacedRepetitionService::process_review(&card, ReviewQuality::Good);
        assert_eq!(card.repetitions, 1);
        assert_eq!(card.interval, 1);
        let ease: f64 = card.ease_factor.parse().unwrap();
        assert!((ease - 2.5).abs() < 0.01); // remains 2.5 on 'Good'

        // Review 2: Good
        card = SpacedRepetitionService::process_review(&card, ReviewQuality::Good);
        assert_eq!(card.repetitions, 2);
        assert_eq!(card.interval, 6);

        // Review 3: Easy (Boost ease)
        card = SpacedRepetitionService::process_review(&card, ReviewQuality::Easy);
        assert_eq!(card.repetitions, 3);
        let ease: f64 = card.ease_factor.parse().unwrap();
        assert!(ease > 2.5); // Ease boosted
    }

    #[test]
    fn test_srs_again_resets_interval() {
        let card = SchoolFlashcard {
            id: "test2".to_string(),
            user_id: "user1".to_string(),
            subject: "Bio".to_string(),
            note_id: "note1".to_string(),
            question: "DNA?".to_string(),
            answer: "Deoxyribo...".to_string(),
            interval: 14,
            ease_factor: "2.6".to_string(),
            repetitions: 4,
            next_review: "".to_string(),
            created_at: "".to_string(),
            firestore_id: None,
            image_url: None,
        };

        let new_card = SpacedRepetitionService::process_review(&card, ReviewQuality::Again);
        assert_eq!(new_card.repetitions, 0); // Repetitions reset
        assert_eq!(new_card.interval, 1); // Interval resets
        
        let new_ease: f64 = new_card.ease_factor.parse().unwrap();
        assert!(new_ease < 2.6); // Ease drops considerably
    }
}
