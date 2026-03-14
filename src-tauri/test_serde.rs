use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Task {
    pub isCompleted: bool,
    pub completedDates: Option<serde_json::Value>,
}

fn main() {
    let j = r#"{"isCompleted": true, "completedDates": "[\"2026\"]"}"#;
    let t: Task = serde_json::from_str(j).unwrap();
    println!("{:?}", t);
}
