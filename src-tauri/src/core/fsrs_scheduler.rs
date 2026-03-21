use super::models::SchoolFlashcard;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// FSRS default parameters (v5)
const DEFAULT_PARAMS: [f32; 19] = [
    0.40255, 1.18385, 3.173, 15.69105,
    7.1949, 0.5345, 1.4604, 0.0046,
    1.54575, 0.1192, 1.01925, 1.9395,
    0.11, 0.29605, 2.2698, 0.2315,
    2.9898, 0.51655, 0.6621,
];

const DECAY: f32 = -0.5;
// FACTOR = 0.9 / (0.9^(1/-0.5) - 1) = 0.9 / (0.9^(-2) - 1) = 0.9 / (1/0.81 - 1) = 0.9 / (0.2346) ≈ 19/81
const FACTOR: f32 = 19.0 / 81.0;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Rating {
    Again = 1,
    Hard = 2,
    Good = 3,
    Easy = 4,
}

impl Rating {
    pub fn from_u8(v: u8) -> Option<Self> {
        match v {
            1 => Some(Rating::Again),
            2 => Some(Rating::Hard),
            3 => Some(Rating::Good),
            4 => Some(Rating::Easy),
            _ => None,
        }
    }

    fn val(self) -> f32 {
        self as u8 as f32
    }
}

/// Result of reviewing a card — contains the updated scheduling fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewOutput {
    pub stability: f32,
    pub difficulty: f32,
    pub interval: f32,
    pub due: String,
    pub lapses: u32,
    #[serde(rename = "lastReview")]
    pub last_review: String,
}

/// The predicted intervals for each rating
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NextStatesResult {
    pub again: f32,
    pub hard: f32,
    pub good: f32,
    pub easy: f32,
}

// ─────────────────────────────────────────────
// Core FSRS v5 formulas (pure Rust, no deps)
// ─────────────────────────────────────────────

fn init_stability(rating: Rating, params: &[f32; 19]) -> f32 {
    let r = rating.val();
    let w = params;
    w[0] * (r - 1.0).exp().max(0.1)
        .max(0.1) // clamp
        * match rating {
            Rating::Again => 1.0,
            Rating::Hard => w[1],
            Rating::Good => w[2],
            Rating::Easy => w[3],
        }
}

fn init_difficulty(rating: Rating, params: &[f32; 19]) -> f32 {
    let w = params;
    let d = w[4] - (w[5] * (rating.val() - 1.0)).exp() + 1.0;
    clamp_difficulty(d)
}

fn clamp_difficulty(d: f32) -> f32 {
    d.clamp(1.0, 10.0)
}

fn next_difficulty(d: f32, rating: Rating, params: &[f32; 19]) -> f32 {
    let w = params;
    let delta = -(w[6] * (rating.val() - 3.0));
    let d_new = w[7] * init_difficulty(Rating::Good, params) + (1.0 - w[7]) * (d + delta);
    clamp_difficulty(d_new)
}

fn power_forgetting_curve(elapsed_days: f32, stability: f32) -> f32 {
    (1.0 + FACTOR * elapsed_days / stability).powf(DECAY)
}

fn next_recall_stability(
    d: f32,
    s: f32,
    r: f32,
    rating: Rating,
    params: &[f32; 19],
) -> f32 {
    let w = params;
    let hard_penalty = if rating == Rating::Hard { w[15] } else { 1.0 };
    let easy_bonus = if rating == Rating::Easy { w[16] } else { 1.0 };

    let new_s = s * (w[8].exp()
        * (11.0 - d)
        * s.powf(-w[9])
        * (((1.0 - r) * w[10]).exp() - 1.0)
        * hard_penalty
        * easy_bonus
        + 1.0);
    new_s.clamp(0.01, 36500.0)
}

fn next_forget_stability(
    d: f32,
    s: f32,
    r: f32,
    params: &[f32; 19],
) -> f32 {
    let w = params;
    let new_s = w[11] * d.powf(-w[12]) * ((s + 1.0).powf(w[13]) - 1.0) * ((1.0 - r) * w[14]).exp();
    // minimum stability bounds (S_MIN is 0.01 in fsrs)
    new_s.max(0.01).min(36500.0)
}

fn next_interval(stability: f32, desired_retention: f32) -> f32 {
    let interval = stability / FACTOR * (desired_retention.powf(1.0 / DECAY) - 1.0);
    interval.max(1.0).round()
}

// ─────────────────────────────────────────────
// Public API — uses fsrs crate on macOS,
// pure formulas elsewhere
// ─────────────────────────────────────────────

/// Returns whether a card is "new" (never reviewed)
fn is_new_card(card: &SchoolFlashcard) -> bool {
    card.stability == 0.0 && card.difficulty == 0.0 && card.last_review.is_none()
}

/// Calculate elapsed days since last review (or 0 if new)
fn elapsed_days(card: &SchoolFlashcard) -> u32 {
    match &card.last_review {
        Some(lr) => {
            if let Ok(last) = DateTime::parse_from_rfc3339(lr) {
                let now = Utc::now();
                let diff = now.signed_duration_since(last.with_timezone(&Utc));
                diff.num_days().max(0) as u32
            } else {
                0
            }
        }
        None => 0,
    }
}

/// Get the predicted intervals for all 4 ratings.
/// This is used by the UI to show "Again: 1d, Hard: 3d, Good: 7d, Easy: 14d" etc.
pub fn get_next_states(card: &SchoolFlashcard, desired_retention: f32) -> NextStatesResult {
    #[cfg(feature = "fsrs-ml")]
    {
        if let Ok(result) = get_next_states_fsrs_crate(card, desired_retention) {
            return result;
        }
    }

    get_next_states_native(card, desired_retention)
}

/// Apply a review rating to a card, returning updated scheduling fields.
pub fn review_card(card: &SchoolFlashcard, rating: Rating, desired_retention: f32) -> ReviewOutput {
    #[cfg(feature = "fsrs-ml")]
    {
        if let Ok(result) = review_card_fsrs_crate(card, rating, desired_retention) {
            return result;
        }
    }

    review_card_native(card, rating, desired_retention)
}

// ─────────────────────────────────────────────
// Native (pure Rust) implementation
// ─────────────────────────────────────────────

fn review_card_native(
    card: &SchoolFlashcard,
    rating: Rating,
    desired_retention: f32,
) -> ReviewOutput {
    let params = &DEFAULT_PARAMS;
    let now = Utc::now();

    let (new_s, new_d, new_lapses) = if is_new_card(card) {
        // First review of a new card
        let s = init_stability(rating, params);
        let d = init_difficulty(rating, params);
        let lapses = if rating == Rating::Again { 1 } else { 0 };
        (s, d, lapses)
    } else {
        // Subsequent review
        let elapsed = elapsed_days(card) as f32;
        let r = power_forgetting_curve(elapsed, card.stability);
        let new_d = next_difficulty(card.difficulty, rating, params);

        let (new_s, lapse_delta) = if rating == Rating::Again {
            (next_forget_stability(card.difficulty, card.stability, r, params), 1)
        } else {
            (next_recall_stability(card.difficulty, card.stability, r, rating, params), 0)
        };

        (new_s, new_d, card.lapses + lapse_delta)
    };

    let interval = next_interval(new_s, desired_retention);
    let due = (now + chrono::Duration::days(interval as i64)).to_rfc3339();

    ReviewOutput {
        stability: new_s,
        difficulty: new_d,
        interval,
        due,
        lapses: new_lapses,
        last_review: now.to_rfc3339(),
    }
}

fn get_next_states_native(card: &SchoolFlashcard, desired_retention: f32) -> NextStatesResult {
    let params = &DEFAULT_PARAMS;

    if is_new_card(card) {
        // New card — compute intervals for each first-review rating
        let ratings = [Rating::Again, Rating::Hard, Rating::Good, Rating::Easy];
        let intervals: Vec<f32> = ratings
            .iter()
            .map(|&r| {
                let s = init_stability(r, params);
                next_interval(s, desired_retention)
            })
            .collect();

        NextStatesResult {
            again: intervals[0],
            hard: intervals[1],
            good: intervals[2],
            easy: intervals[3],
        }
    } else {
        // Existing card — compute next states based on current memory
        let elapsed = elapsed_days(card) as f32;
        let r = power_forgetting_curve(elapsed, card.stability);

        let ratings = [Rating::Again, Rating::Hard, Rating::Good, Rating::Easy];
        let intervals: Vec<f32> = ratings
            .iter()
            .map(|&rating| {
                let new_s = if rating == Rating::Again {
                    next_forget_stability(card.difficulty, card.stability, r, params)
                } else {
                    next_recall_stability(card.difficulty, card.stability, r, rating, params)
                };
                next_interval(new_s, desired_retention)
            })
            .collect();

        NextStatesResult {
            again: intervals[0],
            hard: intervals[1],
            good: intervals[2],
            easy: intervals[3],
        }
    }
}

// ─────────────────────────────────────────────
// FSRS crate implementation (macOS only)
// ─────────────────────────────────────────────

#[cfg(feature = "fsrs-ml")]
fn get_next_states_fsrs_crate(
    card: &SchoolFlashcard,
    desired_retention: f32,
) -> Result<NextStatesResult, String> {
    let fsrs = fsrs::FSRS::new(Some(&DEFAULT_PARAMS)).map_err(|e| format!("{:?}", e))?;

    let memory_state = if is_new_card(card) {
        None
    } else {
        Some(fsrs::MemoryState {
            stability: card.stability,
            difficulty: card.difficulty,
        })
    };

    let days = elapsed_days(card);
    let next = fsrs
        .next_states(memory_state, desired_retention, days)
        .map_err(|e| format!("{:?}", e))?;

    Ok(NextStatesResult {
        again: next.again.interval,
        hard: next.hard.interval,
        good: next.good.interval,
        easy: next.easy.interval,
    })
}

#[cfg(feature = "fsrs-ml")]
fn review_card_fsrs_crate(
    card: &SchoolFlashcard,
    rating: Rating,
    desired_retention: f32,
) -> Result<ReviewOutput, String> {
    let fsrs = fsrs::FSRS::new(Some(&DEFAULT_PARAMS)).map_err(|e| format!("{:?}", e))?;

    let memory_state = if is_new_card(card) {
        None
    } else {
        Some(fsrs::MemoryState {
            stability: card.stability,
            difficulty: card.difficulty,
        })
    };

    let days = elapsed_days(card);
    let next = fsrs
        .next_states(memory_state, desired_retention, days)
        .map_err(|e| format!("{:?}", e))?;

    let state = match rating {
        Rating::Again => next.again,
        Rating::Hard => next.hard,
        Rating::Good => next.good,
        Rating::Easy => next.easy,
    };

    let now = Utc::now();
    let due = (now + chrono::Duration::days(state.interval as i64)).to_rfc3339();
    let new_lapses = if rating == Rating::Again {
        card.lapses + 1
    } else {
        card.lapses
    };

    Ok(ReviewOutput {
        stability: state.memory.stability,
        difficulty: state.memory.difficulty,
        interval: state.interval,
        due,
        lapses: new_lapses,
        last_review: now.to_rfc3339(),
    })
}

/// Retrieve the current retrievability (0.0 to 1.0) of a card.
/// Returns 0.0 for new cards (not yet reviewed).
pub fn current_retrievability(card: &SchoolFlashcard) -> f32 {
    if is_new_card(card) {
        return 0.0;
    }
    let elapsed = elapsed_days(card) as f32;
    power_forgetting_curve(elapsed, card.stability)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn new_card() -> SchoolFlashcard {
        SchoolFlashcard {
            id: "test1".to_string(),
            user_id: "user1".to_string(),
            subject: "Math".to_string(),
            question: "1+1?".to_string(),
            answer: "2".to_string(),
            stability: 0.0,
            difficulty: 0.0,
            due: Utc::now().to_rfc3339(),
            interval: 0.0,
            lapses: 0,
            last_review: None,
            linked_note_ids: None,
            tags: None,
            created_at: Utc::now().to_rfc3339(),
            image_url: None,
            updated_at: None,
        }
    }

    #[test]
    fn test_new_card_review_good() {
        let card = new_card();
        let result = review_card_native(&card, Rating::Good, 0.9);

        assert!(result.stability > 0.0, "Stability should be positive after first review");
        assert!(result.difficulty > 0.0, "Difficulty should be set after first review");
        assert!(result.interval >= 1.0, "Interval should be at least 1 day");
        assert_eq!(result.lapses, 0, "No lapses on Good rating");
    }

    #[test]
    fn test_new_card_review_again() {
        let card = new_card();
        let result = review_card_native(&card, Rating::Again, 0.9);

        assert!(result.stability > 0.0);
        assert_eq!(result.lapses, 1, "Again rating should count as a lapse");
        assert_eq!(result.interval, 1.0, "Again should give shortest interval");
    }

    #[test]
    fn test_easy_gives_longer_interval_than_hard() {
        let card = new_card();
        let states = get_next_states_native(&card, 0.9);

        assert!(
            states.easy > states.hard,
            "Easy interval ({}) should be greater than Hard interval ({})",
            states.easy,
            states.hard
        );
        assert!(
            states.good > states.again,
            "Good interval ({}) should be greater than Again interval ({})",
            states.good,
            states.again
        );
    }

    #[test]
    fn test_subsequent_review_increases_stability() {
        let card = new_card();
        // First review
        let r1 = review_card_native(&card, Rating::Good, 0.9);
        
        // Create a "reviewed" card with simulated elapsed time
        let mut reviewed = new_card();
        reviewed.stability = r1.stability;
        reviewed.difficulty = r1.difficulty;
        reviewed.interval = r1.interval;
        reviewed.lapses = r1.lapses;
        reviewed.last_review = Some(
            (Utc::now() - chrono::Duration::days(r1.interval as i64)).to_rfc3339()
        );
        
        // Second review
        let r2 = review_card_native(&reviewed, Rating::Good, 0.9);
        
        assert!(
            r2.stability > r1.stability,
            "Stability should increase on subsequent Good review: {} vs {}",
            r2.stability, r1.stability
        );
    }

    #[test]
    fn test_rating_from_u8() {
        assert_eq!(Rating::from_u8(1), Some(Rating::Again));
        assert_eq!(Rating::from_u8(2), Some(Rating::Hard));
        assert_eq!(Rating::from_u8(3), Some(Rating::Good));
        assert_eq!(Rating::from_u8(4), Some(Rating::Easy));
        assert_eq!(Rating::from_u8(0), None);
        assert_eq!(Rating::from_u8(5), None);
    }

    #[test]
    fn test_retrievability_new_card() {
        let card = new_card();
        assert_eq!(current_retrievability(&card), 0.0);
    }
}
