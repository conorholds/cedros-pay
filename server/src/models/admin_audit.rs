use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Audit trail entry for admin mutations (R12).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminAuditEntry {
    pub id: String,
    pub tenant_id: String,
    /// Resource type: product, coupon, order, gift_card, collection, etc.
    pub resource_type: String,
    pub resource_id: String,
    /// Action performed: create, update, delete, adjust, process.
    pub action: String,
    /// Admin actor — X-Signer pubkey (base58).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actor: Option<String>,
    /// Summary of changes (key fields only, not full snapshots).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

impl AdminAuditEntry {
    /// Create a new audit entry with auto-generated ID and timestamp.
    pub fn new(
        tenant_id: impl Into<String>,
        resource_type: impl Into<String>,
        resource_id: impl Into<String>,
        action: impl Into<String>,
        actor: Option<String>,
        detail: Option<serde_json::Value>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            tenant_id: tenant_id.into(),
            resource_type: resource_type.into(),
            resource_id: resource_id.into(),
            action: action.into(),
            actor,
            detail,
            created_at: Utc::now(),
        }
    }
}
