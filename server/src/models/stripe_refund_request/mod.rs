use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Stripe-backed refund request created by a customer.
///
/// This is *not* a Stripe Refund object; it's a server-side request that an admin can process,
/// which then creates a Stripe refund via `POST /v1/refunds`.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StripeRefundRequest {
    pub id: String,
    /// Tenant ID for multi-tenant isolation per spec (10-middleware.md)
    #[serde(default = "default_tenant")]
    pub tenant_id: String,
    /// Signature of the original purchase (payment_transactions.signature)
    pub original_purchase_id: String,
    /// Stripe PaymentIntent ID used to create the refund
    pub stripe_payment_intent_id: String,
    /// Stripe Refund ID, once created
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_refund_id: Option<String>,
    /// Stripe Charge ID, if available on the refund object
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_charge_id: Option<String>,
    /// Amount in cents (atomic units)
    pub amount: i64,
    /// Lowercase currency code (e.g., "usd")
    pub currency: String,
    /// Refund status (mirrors Stripe refund statuses when available)
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub processed_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub processed_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,
}

fn default_tenant() -> String {
    "default".to_string()
}
