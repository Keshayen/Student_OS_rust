use super::models::*;
use chrono::Utc;

// Re-export FSRS scheduler for external usage
#[allow(unused_imports)]
pub use super::fsrs_scheduler::{
    Rating, ReviewOutput, NextStatesResult,
    review_card, get_next_states, current_retrievability,
};

#[allow(dead_code)]
pub struct HabitService;

impl HabitService {
    #[allow(dead_code)]
    pub fn calculate_streak(completed_dates: &[String], _frequency: &TaskFrequency) -> i32 {
        if completed_dates.is_empty() { return 0; }
        
        let mut dates: Vec<chrono::NaiveDate> = completed_dates.iter()
            .filter_map(|d| d.split('T').next())
            .filter_map(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
            .collect();
        
        dates.sort_by(|a, b| b.cmp(a)); // Sort descending
        dates.dedup();

        let mut streak = 0;
        let mut current_expected = Utc::now().date_naive();
        
        // If the most recent completion wasn't today or yesterday, streak is broken
        if !dates.is_empty() && dates[0] < current_expected.pred_opt().unwrap_or(current_expected) {
            // Check if they just haven't completed it TODAY yet
            if dates[0] != current_expected && dates[0] != current_expected.pred_opt().unwrap_or(current_expected) {
                return 0;
            }
        }

        for date in dates {
            if date == current_expected {
                streak += 1;
                current_expected = current_expected.pred_opt().unwrap_or(current_expected);
            } else if date == current_expected.succ_opt().unwrap_or(current_expected) {
                continue;
            } else if date == current_expected.pred_opt().unwrap_or(current_expected) {
                streak += 1;
                current_expected = date.pred_opt().unwrap_or(date);
            } else {
                break;
            }
        }
        streak
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Utc, Duration};

    #[test]
    fn test_habit_streak_calculation() {
        let today = Utc::now().date_naive().format("%Y-%m-%d").to_string();
        let yesterday = (Utc::now().date_naive() - Duration::days(1)).format("%Y-%m-%d").to_string();
        let two_days_ago = (Utc::now().date_naive() - Duration::days(2)).format("%Y-%m-%d").to_string();
        let four_days_ago = (Utc::now().date_naive() - Duration::days(4)).format("%Y-%m-%d").to_string();

        // 1. Full streak (today, yesterday, 2 days ago)
        let dates1 = vec![today.clone(), yesterday.clone(), two_days_ago.clone()];
        assert_eq!(HabitService::calculate_streak(&dates1, &TaskFrequency::Daily), 3);

        // 2. Broken streak (today, 4 days ago)
        let dates2 = vec![today.clone(), four_days_ago.clone()];
        assert_eq!(HabitService::calculate_streak(&dates2, &TaskFrequency::Daily), 1);

        // 3. Yesterday only (still active streak of 1)
        let dates3 = vec![yesterday.clone()];
        assert_eq!(HabitService::calculate_streak(&dates3, &TaskFrequency::Daily), 1);

        // 4. Old data only (broken)
        let dates4 = vec![four_days_ago.clone()];
        assert_eq!(HabitService::calculate_streak(&dates4, &TaskFrequency::Daily), 0);

        // 5. Empty
        assert_eq!(HabitService::calculate_streak(&[], &TaskFrequency::Daily), 0);
    }
}
