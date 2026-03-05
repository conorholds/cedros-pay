use serde::{Deserialize, Serialize};

/// Asset class determines fungibility, token type, and regulatory characteristics.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AssetClass {
    /// Fungible — per-collection Token-22 mint, Meteora DLMM pool, SEC regulated.
    Securities,
    /// Fungible — per-collection Token-22 mint, Meteora DLMM pool, CFTC regulated.
    Commodities,
    /// Non-fungible — per-product Metaplex Core NFT, state/local regulated.
    Property,
    /// Non-fungible — per-product Metaplex Core NFT, varies by jurisdiction.
    Collectibles,
}

impl AssetClass {
    /// Whether this asset class uses a shared fungible mint (per-collection).
    pub fn is_fungible(&self) -> bool {
        matches!(self, AssetClass::Securities | AssetClass::Commodities)
    }
}

/// Tokenization configuration for a Collection (makes it an "asset class").
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenizationConfig {
    pub asset_class: AssetClass,
    /// Token-22 mint address (fungible classes only).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mint_address: Option<String>,
    /// Token symbol (e.g., "GOLD", "AAPL").
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_symbol: Option<String>,
    /// Token decimal places (default 2).
    #[serde(default = "default_token_decimals")]
    pub token_decimals: i16,
    /// Transfer fee in basis points for secondary market trades.
    #[serde(default)]
    pub transfer_fee_bps: i32,
    /// Maximum transfer fee in token atomic units.
    #[serde(default)]
    pub max_transfer_fee: i64,
    /// Fee collection wallet.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub treasury_address: Option<String>,
    /// Meteora DLMM pool address (fungible classes only).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub liquidity_pool_address: Option<String>,
    /// Document or on-chain reference proving custody of backing assets.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custody_proof_url: Option<String>,
    /// Redemption form configuration for this asset class.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub redemption_config: Option<RedemptionConfig>,
    /// ISO 3166-1 alpha-2 codes for allowed buyer jurisdictions.
    #[serde(default)]
    pub allowed_jurisdictions: Vec<String>,
    /// Regulatory notice shown to buyers before purchase.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub regulatory_notice: Option<String>,
}

/// Admin-defined redemption form for an asset class.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RedemptionConfig {
    /// Form fields the redeemer must fill out.
    #[serde(default)]
    pub fields: Vec<RedemptionField>,
    /// Instructions shown to the redeemer.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,
    /// Whether admin must manually approve redemption (default true).
    #[serde(default = "default_true")]
    pub requires_approval: bool,
    /// Estimated processing time shown to redeemer.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub estimated_processing_days: Option<i32>,
}

/// A single field in the admin-defined redemption form.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RedemptionField {
    pub id: String,
    pub label: String,
    /// Field type: text | email | phone | address | file_upload | dropdown | textarea.
    pub field_type: String,
    #[serde(default)]
    pub required: bool,
    /// Dropdown options (only used when field_type = "dropdown").
    #[serde(default)]
    pub options: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub placeholder: Option<String>,
}

/// Per-product tokenized asset configuration.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TokenizedAssetConfig {
    /// Collection ID of the asset class this product belongs to.
    pub asset_class_collection_id: String,
    /// Denormalized asset class (e.g., "securities", "commodities") for display.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub asset_class: Option<String>,
    /// Unique identifier for non-fungible assets (e.g., serial number, deed ID).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub asset_identifier: Option<String>,
    /// What the token represents in cents (backing value).
    pub backing_value_cents: i64,
    /// ISO 4217 currency code for the backing value.
    #[serde(default = "default_usd")]
    pub backing_currency: String,
    /// Fungible: quantity of tokens per unit purchased. NFT: always 1.
    #[serde(default = "default_one")]
    pub tokens_per_unit: i64,
    /// Per-asset custody proof (supplements collection-level proof).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custody_proof_url: Option<String>,
    /// Metaplex Core asset address (set after minting for non-fungible assets).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nft_mint_address: Option<String>,
}

fn default_token_decimals() -> i16 {
    2
}

fn default_true() -> bool {
    true
}

fn default_usd() -> String {
    "usd".to_string()
}

fn default_one() -> i64 {
    1
}
