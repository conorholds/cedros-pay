use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::models::money::Money;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RefundQuote {
    pub id: String,
    /// Tenant ID for multi-tenant isolation per spec (10-middleware.md)
    #[serde(default = "default_tenant")]
    pub tenant_id: String,
    pub original_purchase_id: String,
    pub recipient_wallet: String,
    pub amount: Money,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub processed_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub processed_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signature: Option<String>,
}

fn default_tenant() -> String {
    "default".to_string()
}

impl RefundQuote {
    pub fn is_expired_at(&self, t: DateTime<Utc>) -> bool {
        t > self.expires_at
    }

    /// Returns true if the refund was approved and executed (has both processed_at and signature).
    /// Use `is_finalized()` to check if the refund request has been concluded (approved OR denied).
    pub fn is_processed(&self) -> bool {
        self.processed_at.is_some() && self.signature.is_some()
    }

    /// Returns true if the refund request has been finalized (approved OR denied).
    /// A finalized refund has a processed_at timestamp set, regardless of approval status.
    pub fn is_finalized(&self) -> bool {
        self.processed_at.is_some()
    }

    /// Returns true if the refund was denied (finalized but no signature/transaction).
    pub fn is_denied(&self) -> bool {
        self.processed_at.is_some() && self.signature.is_none()
    }
}
