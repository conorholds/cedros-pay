use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CustomerAddress {
    pub line1: Option<String>,
    pub line2: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub postal_code: Option<String>,
    pub country: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Customer {
    pub id: String,
    pub tenant_id: String,
    pub email: String,
    pub name: Option<String>,
    pub phone: Option<String>,
    #[serde(default)]
    pub addresses: Vec<CustomerAddress>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
