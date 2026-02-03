use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShippingProfile {
    pub id: String,
    pub tenant_id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default)]
    pub countries: Vec<String>,
    #[serde(default)]
    pub active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShippingRate {
    pub id: String,
    pub tenant_id: String,
    pub profile_id: String,
    pub name: String,
    /// flat | price | weight (future)
    pub rate_type: String,
    pub amount_atomic: i64,
    pub currency: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_subtotal: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_subtotal: Option<i64>,
    #[serde(default)]
    pub active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
