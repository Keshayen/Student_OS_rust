use serde::{Deserialize, Serialize, Deserializer, Serializer};

pub trait Identifiable {
    fn get_id(&self) -> &str;
    fn set_id(&mut self, id: String);
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TaskType { Task, School }

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SchoolTaskType { Exam, Ssa, #[serde(rename = "classTest")] ClassTest, Assignment }

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TaskFrequency { Daily, Weekdays, Weekends, Weekly, Monthly, Yearly, Custom }

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum IntervalUnit { Days, Weeks, Months, Years }

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    #[serde(deserialize_with = "deserialize_id")]
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "taskType")]
    pub task_type: TaskType,
    pub title: String,
    #[serde(rename = "isCompleted", with = "bool_as_int")]
    pub is_completed: bool,
    #[serde(rename = "createdDate")]
    pub created_date: String, 
    pub subject: Option<String>,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
    #[serde(rename = "schoolTaskType")]
    pub school_task_type: Option<SchoolTaskType>,
    #[serde(rename = "linkedNoteIds")]
    pub linked_note_ids: Option<serde_json::Value>, 
    pub frequency: Option<TaskFrequency>,
    pub interval: Option<i32>,
    #[serde(rename = "intervalUnit")]
    pub interval_unit: Option<IntervalUnit>,
    pub streak: Option<i32>,
    #[serde(rename = "completedDates")]
    pub completed_dates: Option<serde_json::Value>,
    #[serde(rename = "reminderEnabled", with = "bool_as_int")]
    pub reminder_enabled: bool,
    #[serde(rename = "reminderType")]
    pub reminder_type: Option<String>,
    #[serde(rename = "reminderHour")]
    pub reminder_hour: Option<i32>,
    #[serde(rename = "reminderMinute")]
    pub reminder_minute: Option<i32>,
}

impl Identifiable for Task {
    fn get_id(&self) -> &str { &self.id }
    fn set_id(&mut self, id: String) { self.id = id; }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SchoolNote {
    #[serde(deserialize_with = "deserialize_id")]
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    pub subject: String,
    pub title: String,
    pub content: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

impl Identifiable for SchoolNote {
    fn get_id(&self) -> &str { &self.id }
    fn set_id(&mut self, id: String) { self.id = id; }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SchoolFlashcard {
    #[serde(deserialize_with = "deserialize_id")]
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    pub subject: String,
    #[serde(rename = "noteId", deserialize_with = "deserialize_id")]
    pub note_id: String,
    pub question: String,
    pub answer: String,
    #[serde(rename = "srs_interval", default)]
    pub interval: i32,
    #[serde(rename = "easeFactor", alias = "ease_factor", deserialize_with = "deserialize_string_flexible", default = "default_ease")]
    pub ease_factor: String,
    pub repetitions: i32,
    #[serde(rename = "nextReview")]
    pub next_review: String,
    #[serde(rename = "createdAt", default = "default_timestamp")]
    pub created_at: String,
    #[serde(rename = "firestoreId")]
    pub firestore_id: Option<String>,
    #[serde(rename = "imageUrl")]
    pub image_url: Option<String>,
}

impl Identifiable for SchoolFlashcard {
    fn get_id(&self) -> &str { &self.id }
    fn set_id(&mut self, id: String) { self.id = id; }
}

fn default_ease() -> String { "2.5".to_string() }
fn default_timestamp() -> String { chrono::Utc::now().to_rfc3339() }

fn deserialize_string_flexible<'de, D>(deserializer: D) -> Result<String, D::Error>
where D: Deserializer<'de> {
    let v: serde_json::Value = Deserialize::deserialize(deserializer)?;
    match v {
        serde_json::Value::Number(n) => Ok(n.to_string()),
        serde_json::Value::String(s) => Ok(s),
        _ => Ok("2.5".to_string()),
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SchoolGrade {
    #[serde(deserialize_with = "deserialize_id")]
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    pub subject: String,
    pub title: String,
    pub score: f64,
    pub total: f64,
    pub cycle: String,
    pub category: String,
    pub date: String,
    #[serde(rename = "schoolYear")]
    pub school_year: i32,
}

impl Identifiable for SchoolGrade {
    fn get_id(&self) -> &str { &self.id }
    fn set_id(&mut self, id: String) { self.id = id; }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SwimSession {
    #[serde(deserialize_with = "deserialize_id")]
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    pub date: String,
    pub duration: i64, 
    pub distance: f64,
    pub stroke: String,
    pub notes: String,
    #[serde(rename = "workoutEffect")]
    pub workout_effect: Option<String>,
    #[serde(rename = "heartRateAvg")]
    pub heart_rate_avg: Option<i32>,
    #[serde(rename = "heartRateMax")]
    pub heart_rate_max: Option<i32>,
    #[serde(rename = "effortLevel")]
    pub effort_level: i32,
    #[serde(rename = "poolLength")]
    pub pool_length: f64,
    pub sets: String, // JSON string
    #[serde(rename = "caloriesBurned")]
    pub calories_burned: Option<f64>,
    pub location: Option<String>,
}

impl Identifiable for SwimSession {
    fn get_id(&self) -> &str { &self.id }
    fn set_id(&mut self, id: String) { self.id = id; }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SwimGala {
    #[serde(deserialize_with = "deserialize_id")]
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    pub name: String,
    pub date: String,
    pub location: String,
    pub course: String,
    pub events: Option<String>, // JSON string of events
}

impl Identifiable for SwimGala {
    fn get_id(&self) -> &str { &self.id }
    fn set_id(&mut self, id: String) { self.id = id; }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QualifyingTime {
    #[serde(deserialize_with = "deserialize_id")]
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    pub name: String,
    #[serde(rename = "eventName")]
    pub event_name: String,
    #[serde(rename = "targetTime")]
    pub target_time: i64, // ms
    pub course: String,
    #[serde(rename = "isAchieved", with = "bool_as_int")]
    pub is_achieved: bool,
}

impl Identifiable for QualifyingTime {
    fn get_id(&self) -> &str { &self.id }
    fn set_id(&mut self, id: String) { self.id = id; }
}

fn deserialize_id<'de, D>(deserializer: D) -> Result<String, D::Error>
where D: Deserializer<'de> {
    let v: serde_json::Value = Deserialize::deserialize(deserializer)?;
    match v {
        serde_json::Value::Number(n) => Ok(n.to_string()),
        serde_json::Value::String(s) => Ok(s),
        _ => Ok("".to_string()),
    }
}

mod bool_as_int {
    use super::*;
    pub fn serialize<S>(value: &bool, serializer: S) -> Result<S::Ok, S::Error>
    where S: Serializer {
        serializer.serialize_i32(if *value { 1 } else { 0 })
    }
    pub fn deserialize<'de, D>(deserializer: D) -> Result<bool, D::Error>
    where D: Deserializer<'de> {
        let v: serde_json::Value = Deserialize::deserialize(deserializer)?;
        match v {
            serde_json::Value::Number(n) => Ok(n.as_i64() == Some(1)),
            serde_json::Value::Bool(b) => Ok(b),
            _ => Ok(false),
        }
    }
}

