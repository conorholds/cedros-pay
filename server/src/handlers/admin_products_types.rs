//! Request/query types and validation helpers for admin product handlers.

use std::collections::HashMap;

use axum::http::StatusCode;
use serde::Deserialize;

use crate::errors::{error_response, ErrorCode};
use crate::models::money::{get_asset, Money};

pub(crate) fn default_limit() -> i32 {
    20
}

pub(crate) fn default_active() -> bool {
    true
}

// ============================================================================
// Request / query types
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProductsQuery {
    #[serde(default = "default_limit")]
    pub limit: i32,
    #[serde(default)]
    pub offset: i32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProductRequest {
    pub id: String,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub short_description: Option<String>,
    #[serde(default)]
    pub slug: Option<String>,
    #[serde(default)]
    pub seo_title: Option<String>,
    #[serde(default)]
    pub seo_description: Option<String>,
    pub description: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub category_ids: Vec<String>,
    #[serde(default)]
    pub images: Vec<crate::models::ProductImage>,
    #[serde(default)]
    pub featured: bool,
    #[serde(default)]
    pub sort_order: Option<i32>,
    #[serde(default)]
    pub shipping_profile: Option<String>,
    #[serde(default)]
    pub checkout_requirements: Option<crate::models::CheckoutRequirements>,
    #[serde(default)]
    pub fulfillment: Option<crate::models::FulfillmentInfo>,
    pub fiat_amount_cents: Option<i64>,
    pub fiat_currency: Option<String>,
    #[serde(default)]
    pub compare_at_fiat_amount_cents: Option<i64>,
    #[serde(default)]
    pub compare_at_fiat_currency: Option<String>,
    pub stripe_price_id: Option<String>,
    pub crypto_atomic_amount: Option<i64>,
    pub crypto_token: Option<String>,
    #[serde(default)]
    pub inventory_status: Option<String>,
    #[serde(default)]
    pub inventory_quantity: Option<i32>,
    #[serde(default)]
    pub inventory_policy: Option<String>,
    #[serde(default)]
    pub variants: Vec<crate::models::ProductVariant>,
    #[serde(default = "default_active")]
    pub active: bool,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetInventoryRequest {
    /// When null/omitted, inventory is untracked (unlimited).
    pub quantity: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdjustInventoryRequest {
    pub delta: i32,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub actor: Option<String>,
}

// ============================================================================
// Validation
// ============================================================================

pub(crate) fn validate_product_checkout_fields(
    req: &CreateProductRequest,
) -> Result<(), (StatusCode, crate::errors::ErrorResponse)> {
    if let Some(qty) = req.inventory_quantity {
        if qty < 0 {
            let (status, body) = error_response(
                ErrorCode::InvalidField,
                Some("inventoryQuantity must be >= 0".to_string()),
                Some(serde_json::json!({ "field": "inventoryQuantity" })),
            );
            return Err((status, body));
        }
    }

    if let Some(ref policy) = req.inventory_policy {
        if policy != "deny" && policy != "allow_backorder" {
            let (status, body) = error_response(
                ErrorCode::InvalidField,
                Some("inventoryPolicy must be 'deny' or 'allow_backorder'".to_string()),
                Some(serde_json::json!({ "field": "inventoryPolicy" })),
            );
            return Err((status, body));
        }
    }

    if let Some(ref profile) = req.shipping_profile {
        if profile != "physical" && profile != "digital" {
            let (status, body) = error_response(
                ErrorCode::InvalidField,
                Some("shippingProfile must be 'physical' or 'digital'".to_string()),
                Some(serde_json::json!({ "field": "shippingProfile" })),
            );
            return Err((status, body));
        }
    }

    if let Some(ref c) = req.checkout_requirements {
        for (field, value) in [
            ("checkoutRequirements.email", c.email.as_deref()),
            ("checkoutRequirements.name", c.name.as_deref()),
            ("checkoutRequirements.phone", c.phone.as_deref()),
        ] {
            if let Some(v) = value {
                if v != "none" && v != "optional" && v != "required" {
                    let (status, body) = error_response(
                        ErrorCode::InvalidField,
                        Some(format!("{field} must be 'none', 'optional', or 'required'")),
                        Some(serde_json::json!({ "field": field })),
                    );
                    return Err((status, body));
                }
            }
        }
    }

    if let Some(ref f) = req.fulfillment {
        match f.r#type.as_str() {
            "digital_download" | "shipping" | "service" => {}
            _ => {
                let (status, body) = error_response(
                    ErrorCode::InvalidField,
                    Some(
                        "fulfillment.type must be 'digital_download', 'shipping', or 'service'"
                            .to_string(),
                    ),
                    Some(serde_json::json!({ "field": "fulfillment.type" })),
                );
                return Err((status, body));
            }
        }
    }

    Ok(())
}

// ============================================================================
// Helpers: resolve Money from (amount, currency/token)
// ============================================================================

pub(crate) fn resolve_fiat(
    amount_cents: Option<i64>,
    currency: Option<&str>,
) -> Result<Option<Money>, (StatusCode, crate::errors::ErrorResponse)> {
    match (amount_cents, currency) {
        (Some(amount), Some(currency)) => {
            let asset = match get_asset(currency) {
                Some(a) => a,
                None => {
                    let (status, body) = error_response(
                        ErrorCode::InvalidField,
                        Some(format!("Unknown currency: {}", currency)),
                        None,
                    );
                    return Err((status, body));
                }
            };
            Ok(Some(Money::new(asset, amount)))
        }
        (None, None) => Ok(None),
        _ => {
            let (status, body) = error_response(
                ErrorCode::InvalidField,
                Some("Both amount and currency must be provided together".to_string()),
                None,
            );
            Err((status, body))
        }
    }
}

pub(crate) fn resolve_crypto(
    atomic_amount: Option<i64>,
    token: Option<&str>,
) -> Result<Option<Money>, (StatusCode, crate::errors::ErrorResponse)> {
    match (atomic_amount, token) {
        (Some(amount), Some(token)) => {
            let asset = match get_asset(token) {
                Some(a) => a,
                None => {
                    let (status, body) = error_response(
                        ErrorCode::InvalidField,
                        Some(format!("Unknown token: {}", token)),
                        None,
                    );
                    return Err((status, body));
                }
            };
            Ok(Some(Money::new(asset, amount)))
        }
        _ => Ok(None),
    }
}
