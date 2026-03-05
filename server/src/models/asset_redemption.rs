use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Status flow: pending_info → info_submitted → under_review → approved → completed
///                                                            → rejected
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AssetRedemptionStatus {
    PendingInfo,
    InfoSubmitted,
    UnderReview,
    Approved,
    Completed,
    Rejected,
}

/// Tracks the redemption lifecycle for a tokenized asset.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetRedemption {
    pub id: String,
    pub tenant_id: String,
    pub order_id: String,
    pub product_id: String,
    pub collection_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    pub status: AssetRedemptionStatus,
    /// Redeemer-submitted form data (JSON, matches RedemptionConfig fields).
    #[serde(default)]
    pub form_data: serde_json::Value,
    /// Admin notes (review comments, rejection reason).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub admin_notes: Option<String>,
    /// Solana signature from minting the token at purchase time.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_mint_signature: Option<String>,
    /// Solana signature from burning the token at completion.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_burn_signature: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
