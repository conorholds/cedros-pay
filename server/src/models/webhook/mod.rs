use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Per spec (20-webhooks.md): PaymentEvent must include tenant_id for multi-tenant isolation
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PaymentEvent {
    pub event_id: String,
    pub event_type: String,
    pub event_timestamp: DateTime<Utc>,
    /// Tenant ID for multi-tenant webhook routing per spec (20-webhooks.md)
    #[serde(default = "default_tenant")]
    pub tenant_id: String,
    #[serde(rename = "resource")]
    pub resource_id: String,
    pub method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_customer: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fiat_amount_cents: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fiat_currency: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub crypto_atomic_amount: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub crypto_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wallet: Option<String>,
    /// User ID from cedros-login (if available)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proof_signature: Option<String>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
    pub paid_at: DateTime<Utc>,
}

/// Per spec (20-webhooks.md): RefundEvent must include tenant_id for multi-tenant isolation
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RefundEvent {
    pub event_id: String,
    pub event_type: String,
    pub event_timestamp: DateTime<Utc>,
    /// Tenant ID for multi-tenant webhook routing per spec (20-webhooks.md)
    #[serde(default = "default_tenant")]
    pub tenant_id: String,
    pub refund_id: String,
    pub original_purchase_id: String,
    pub recipient_wallet: String,
    pub atomic_amount: i64,
    pub token: String,
    pub processed_by: String,
    pub signature: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
    pub refunded_at: DateTime<Utc>,
}

/// Default tenant ID for backwards compatibility
fn default_tenant() -> String {
    "default".to_string()
}
