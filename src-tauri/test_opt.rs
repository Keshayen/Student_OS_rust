use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct X {
    a: Option<i32>,
}
fn main() {
    let x: Result<X, _> = serde_json::from_str("{}");
    println!("{:?}", x);
}
