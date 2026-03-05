use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

fn default_true() -> bool {
    true
}

/// Record of a gift card purchase + fulfillment (credits deposited to recipient).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GiftCardRedemption {
    pub id: String,
    pub tenant_id: String,
    pub order_id: String,
    pub product_id: String,
    pub buyer_user_id: String,
    pub recipient_user_id: String,
    pub face_value_cents: i64,
    pub currency: String,
    pub credits_issued: i64,
    #[serde(default)]
    pub token_minted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_mint_signature: Option<String>,
    pub created_at: DateTime<Utc>,
    /// One-time claim token for gift cards sent to a non-registered recipient.
    /// Null once claimed or when credits were deposited immediately.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub redemption_token: Option<String>,
    /// Whether the gift card has been claimed (credits deposited to recipient).
    /// Defaults to true for backwards compatibility; false when awaiting recipient claim.
    #[serde(default = "default_true")]
    pub claimed: bool,
    /// Recipient email address (for unclaimed gift cards sent by email).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recipient_email: Option<String>,
    /// Last activity timestamp for escheatment tracking (unclaimed property laws).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_activity_at: Option<DateTime<Utc>>,
}
