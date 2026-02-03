use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::models::money::Money;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AuthorizationResult {
    pub granted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wallet: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quote: Option<Quote>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub settlement: Option<SettlementResponse>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription: Option<SubscriptionInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Quote {
    #[serde(rename = "resource")]
    pub resource_id: String,
    pub expires_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe: Option<StripeOption>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub crypto: Option<CryptoQuote>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub credits: Option<CreditsOption>,
}

/// Credits payment option for cedros-login credits
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CreditsOption {
    /// Amount in atomic units of the configured credits SPL token.
    pub amount: i64,
    /// Token/currency code (e.g., "USDC", "SOL")
    pub currency: String,
    /// Human-readable description
    pub description: String,
    /// Resource being purchased
    #[serde(rename = "resource")]
    pub resource_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct StripeOption {
    #[serde(rename = "priceId")]
    pub price_id: String,
    pub amount_cents: i64,
    pub currency: String,
    pub description: String,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CryptoQuote {
    pub scheme: String,
    pub network: String,
    pub max_amount_required: String,
    #[serde(rename = "resource")]
    pub resource_id: String,
    /// Description of the payment
    #[serde(default)]
    pub description: String,
    pub pay_to: String,
    pub asset: String,
    /// MIME type for the response (per spec: "application/json")
    #[serde(rename = "mimeType", default = "default_mime_type")]
    pub mime_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_timeout_seconds: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extra: Option<SolanaExtra>,
}

fn default_mime_type() -> String {
    "application/json".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SolanaExtra {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recipient_token_account: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decimals: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_symbol: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fee_payer: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SettlementResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tx_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionInfo {
    #[serde(rename = "id")]
    pub subscription_id: String,
    pub status: String,
    pub current_period_end: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PaymentPayload {
    #[serde(rename = "x402Version")]
    pub x402_version: i32,
    pub scheme: String,
    pub network: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SolanaPayload {
    pub signature: String,
    pub transaction: String,
    #[serde(rename = "resource")]
    pub resource_id: Option<String>,
    #[serde(default)]
    pub resource_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fee_payer: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recipient_token_account: Option<String>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PaymentProof {
    #[serde(rename = "x402Version")]
    pub x402_version: i32,
    pub scheme: String,
    pub network: String,
    pub signature: String,
    pub payer: String,
    pub transaction: String,
    #[serde(rename = "resource")]
    pub resource_id: String,
    #[serde(default)]
    pub resource_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recipient_token_account: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fee_payer: Option<String>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Requirement {
    #[serde(rename = "resource")]
    pub resource_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recipient_owner: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recipient_token_account: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_mint: Option<String>,
    /// Required amount in atomic units (preferred for exactness).
    ///
    /// When present, verifiers should use this instead of `amount` to avoid any
    /// floating-point rounding issues when converting major -> atomic.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub amount_atomic: Option<u64>,
    pub amount: f64,
    pub network: String,
    #[serde(default)]
    pub token_decimals: u8,
    #[serde(default)]
    pub allowed_tokens: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quote_ttl: Option<u64>,
    #[serde(default)]
    pub skip_preflight: bool,
    #[serde(default)]
    pub commitment: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct VerificationResult {
    pub wallet: String,
    /// Amount in atomic units (e.g., micro-USDC, lamports) per spec (05-data-models.md)
    pub amount: i64,
    pub signature: String,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PaymentTransaction {
    pub signature: String,
    /// Tenant ID for multi-tenant isolation per spec (10-middleware.md)
    #[serde(default = "default_tenant")]
    pub tenant_id: String,
    #[serde(rename = "resourceId")]
    pub resource_id: String,
    pub wallet: String,
    /// User ID from cedros-login (optional for guest purchases)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    #[serde(rename = "amount")]
    pub amount: Money,
    pub created_at: DateTime<Utc>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

fn default_tenant() -> String {
    "default".to_string()
}
