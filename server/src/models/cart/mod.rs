use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::models::money::Money;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CartItem {
    #[serde(rename = "resource")]
    pub resource_id: String,
    /// Variant ID for variant-level inventory tracking
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variant_id: Option<String>,
    /// Quantity of this item (must be positive).
    ///
    /// # Invariant
    /// Value must be > 0. Enforced at API boundary in handlers (cart.rs, stripe/service.rs).
    /// Type is i32 for JSON compatibility with Go server; validation rejects <= 0.
    pub quantity: i32,
    /// Price after discounts
    pub price: Money,
    /// Original price before discounts (per-unit)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_price: Option<Money>,
    /// Product description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Applied coupon codes for this item
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub applied_coupons: Vec<String>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CartQuote {
    pub id: String,
    /// Tenant ID for multi-tenant isolation per spec (10-middleware.md)
    #[serde(default = "default_tenant")]
    pub tenant_id: String,
    pub items: Vec<CartItem>,
    pub total: Money,
    /// Original total before discounts
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_total: Option<Money>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
    /// Applied coupon codes for usage tracking
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub applied_coupons: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wallet_paid_by: Option<String>,
}

fn default_tenant() -> String {
    "default".to_string()
}

/// Response type for cart quote per spec 19-services-paywall.md
/// Provides API-friendly representation of CartQuote
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CartQuoteResponse {
    pub cart_id: String,
    pub quote: Option<CryptoQuoteResponse>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub credits: Option<CreditsQuoteResponse>,
    pub items: Vec<CartItemResponse>,
    pub total_amount: f64,
    pub metadata: HashMap<String, String>,
    pub expires_at: DateTime<Utc>,
}

/// Crypto quote for API response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CryptoQuoteResponse {
    pub token_mint: String,
    pub amount_atomic: u64,
    pub amount_major: f64,
    pub recipient: String,
    pub memo: Option<String>,
}

/// Credits quote for cart API response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditsQuoteResponse {
    /// Amount in credits (atomic units of the configured credits SPL token)
    pub amount: i64,
    /// Token/currency code (e.g., "USDC", "SOL")
    pub currency: String,
    /// Human-readable description
    pub description: String,
}

/// Cart item for API response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CartItemResponse {
    pub resource: String,
    pub quantity: i32,
    pub price: f64,
    pub original_price: Option<f64>,
    pub description: Option<String>,
    pub applied_coupons: Vec<String>,
}

impl CartItem {
    /// Validate that this CartItem has valid field values.
    ///
    /// Returns an error message if validation fails. Quantity must be positive
    /// and not exceed the configured maximum.
    pub fn validate(&self, max_quantity: i32) -> Result<(), String> {
        if self.quantity <= 0 {
            return Err(format!("quantity must be positive, got {}", self.quantity));
        }
        if self.quantity > max_quantity {
            return Err(format!(
                "quantity {} exceeds maximum {}",
                self.quantity, max_quantity
            ));
        }
        Ok(())
    }
}

impl From<&CartQuote> for CartQuoteResponse {
    fn from(quote: &CartQuote) -> Self {
        CartQuoteResponse {
            cart_id: quote.id.clone(),
            quote: None,   // Set by handler based on payment method
            credits: None, // Set by handler if credits are enabled
            items: quote
                .items
                .iter()
                .map(|i| CartItemResponse {
                    resource: i.resource_id.clone(),
                    quantity: i.quantity,
                    price: i.price.to_major(),
                    original_price: i.original_price.as_ref().map(|m| m.to_major()),
                    description: i.description.clone(),
                    applied_coupons: i.applied_coupons.clone(),
                })
                .collect(),
            total_amount: quote.total.to_major(),
            metadata: quote.metadata.clone(),
            expires_at: quote.expires_at,
        }
    }
}
