use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryAdjustment {
    pub id: String,
    pub tenant_id: String,
    pub product_id: String,
    /// Variant ID for variant-level inventory tracking (null = product-level)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variant_id: Option<String>,
    pub delta: i32,
    pub quantity_before: i32,
    pub quantity_after: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actor: Option<String>,
    pub created_at: DateTime<Utc>,
}
