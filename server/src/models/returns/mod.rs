use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::models::OrderItem;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReturnRequest {
    pub id: String,
    pub tenant_id: String,
    pub order_id: String,
    pub status: String,
    pub items: Vec<OrderItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status_updated_at: Option<DateTime<Utc>>,
}

pub fn is_valid_return_transition(from: &str, to: &str) -> bool {
    if from == to {
        return true;
    }
    matches!(
        (from, to),
        ("requested", "approved")
            | ("requested", "rejected")
            | ("approved", "received")
            | ("received", "refunded")
    )
}
