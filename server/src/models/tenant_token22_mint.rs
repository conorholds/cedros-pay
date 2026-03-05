use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Token-22 mint configuration.
///
/// Gift card mints have `collection_id = None` (keyed by tenant_id alone).
/// Asset class mints have `collection_id = Some(id)` (keyed by tenant_id + collection_id).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TenantToken22Mint {
    pub tenant_id: String,
    /// Collection ID for asset-class mints. None for the tenant-wide gift card mint.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collection_id: Option<String>,
    pub mint_address: String,
    pub mint_authority: String,
    pub transfer_fee_bps: i32,
    pub max_transfer_fee: i64,
    pub treasury_address: String,
    #[serde(default = "default_token_symbol")]
    pub token_symbol: String,
    #[serde(default = "default_token_decimals")]
    pub token_decimals: i16,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

fn default_token_symbol() -> String {
    "storeUSD".to_string()
}

fn default_token_decimals() -> i16 {
    2
}
