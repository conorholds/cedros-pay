use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::models::money::Money;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProductImage {
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alt: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct VariantPrice {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub amount: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,
}

// ============================================================================
// Variation Configuration
// ============================================================================

/// A single value within a variation type (e.g., "Medium" for Size)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VariationValue {
    pub id: String,
    /// Display label (e.g., "Medium", "Blue")
    pub label: String,
    /// For hierarchical dependencies (Phase 2) - references parent VariationValue.id
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_value_id: Option<String>,
}

/// A variation type definition (e.g., "Size" with values S/M/L)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VariationType {
    pub id: String,
    /// Display name (e.g., "Size", "Color")
    pub name: String,
    /// Display order (0 = first selector)
    #[serde(default)]
    pub display_order: i32,
    /// Available values for this variation type
    #[serde(default)]
    pub values: Vec<VariationValue>,
}

/// Product-level variation configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProductVariationConfig {
    /// Variation types defined for this product
    #[serde(default)]
    pub variation_types: Vec<VariationType>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProductVariant {
    pub id: String,
    /// Auto-generated title (e.g., "M / Blue")
    pub title: String,
    /// Legacy flat key-value options (e.g., {Size: 'M', Color: 'Blue'})
    #[serde(default)]
    pub options: HashMap<String, String>,
    /// References to VariationValue.id for structured variations
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub option_value_ids: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub price: Option<VariantPrice>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compare_at_price: Option<VariantPrice>,
    /// Inventory status: "in_stock", "low", "out_of_stock", "backorder"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_status: Option<String>,
    /// Tracked inventory quantity for this variant
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_quantity: Option<i32>,
    /// Stock Keeping Unit identifier
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sku: Option<String>,
    /// Variant-specific images
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub images: Vec<ProductImage>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CheckoutRequirements {
    /// 'none' | 'optional' | 'required'
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    /// 'none' | 'optional' | 'required'
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    /// 'none' | 'optional' | 'required'
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shipping_address: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub billing_address: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FulfillmentInfo {
    /// 'digital_download' | 'shipping' | 'service'
    pub r#type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionConfig {
    pub billing_period: String,
    pub billing_interval: i32,
    #[serde(default)]
    pub trial_days: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_price_id: Option<String>,
    #[serde(default)]
    pub allow_x402: bool,
    #[serde(default)]
    pub grace_period_hours: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Product {
    pub id: String,
    /// Tenant ID for multi-tenant isolation per spec (10-middleware.md)
    #[serde(default = "default_tenant")]
    pub tenant_id: String,
    /// Human-friendly title/name (optional; description remains the long description)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    /// Optional short description for cards/previews
    #[serde(skip_serializing_if = "Option::is_none")]
    pub short_description: Option<String>,
    /// Stable routing identifier
    #[serde(skip_serializing_if = "Option::is_none")]
    pub slug: Option<String>,
    /// SEO page title override.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seo_title: Option<String>,
    /// SEO description for product pages.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seo_description: Option<String>,
    pub description: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub category_ids: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub images: Vec<ProductImage>,
    #[serde(default)]
    pub featured: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<i32>,
    /// 'physical' | 'digital'
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shipping_profile: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_requirements: Option<CheckoutRequirements>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fulfillment: Option<FulfillmentInfo>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fiat_price: Option<Money>,
    /// Optional original/reference price used to represent a sale when paired with fiat_price
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compare_at_fiat_price: Option<Money>,
    /// Stripe Product ID for syncing updates/archives
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_product_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_price_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub crypto_price: Option<Money>,
    /// Minimal inventory status (string enum; e.g. "in_stock")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_status: Option<String>,

    /// Optional tracked inventory quantity.
    /// When `None`, inventory is not enforced (unlimited).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_quantity: Option<i32>,
    /// Inventory policy: "deny" (default) or "allow_backorder"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_policy: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub variants: Vec<ProductVariant>,
    /// Variation configuration (types and values for this product)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variation_config: Option<ProductVariationConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub crypto_account: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memo_template: Option<String>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
    #[serde(default)]
    pub active: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription: Option<SubscriptionConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime<Utc>>,
}

fn default_tenant() -> String {
    "default".to_string()
}

impl Product {
    pub fn is_subscription(&self) -> bool {
        self.subscription
            .as_ref()
            .map(|sub| !sub.billing_period.is_empty())
            .unwrap_or(false)
    }

    /// Look up a variant by ID
    pub fn get_variant(&self, variant_id: &str) -> Option<&ProductVariant> {
        self.variants.iter().find(|v| v.id == variant_id)
    }

    /// Look up a variant by ID (mutable)
    pub fn get_variant_mut(&mut self, variant_id: &str) -> Option<&mut ProductVariant> {
        self.variants.iter_mut().find(|v| v.id == variant_id)
    }

    /// Get effective inventory quantity for a product or variant.
    /// If variant_id is provided and the variant has inventory_quantity, use that.
    /// Otherwise fall back to product-level inventory_quantity.
    pub fn get_effective_inventory(&self, variant_id: Option<&str>) -> Option<i32> {
        if let Some(vid) = variant_id {
            if let Some(variant) = self.get_variant(vid) {
                if variant.inventory_quantity.is_some() {
                    return variant.inventory_quantity;
                }
            }
        }
        self.inventory_quantity
    }

    /// Get effective price for a product or variant (crypto).
    /// If variant_id is provided and the variant has a price, use that.
    /// Otherwise fall back to product-level crypto_price.
    pub fn get_effective_crypto_price(&self, variant_id: Option<&str>) -> Option<Money> {
        if let Some(vid) = variant_id {
            if let Some(variant) = self.get_variant(vid) {
                // Check if variant has its own price
                if let Some(ref variant_price) = variant.price {
                    if let (Some(amount), Some(ref currency)) =
                        (variant_price.amount, &variant_price.currency)
                    {
                        // Convert variant price to Money
                        if let Some(asset) = crate::models::get_asset(currency) {
                            let atomic = (amount * 10_f64.powi(asset.decimals as i32)) as i64;
                            return Some(Money::new(asset, atomic));
                        }
                    }
                }
            }
        }
        self.crypto_price.clone()
    }
}
