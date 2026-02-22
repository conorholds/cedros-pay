use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::{header::HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::response::{json_error, json_ok};
use crate::constants::{MAX_CART_ITEMS, MAX_ITEM_QUANTITY};
use crate::errors::{error_response, ErrorCode};
use crate::handlers::paywall::{AcceptEntry, AppState};
use crate::handlers::verify::{convert_metadata, decode_x_payment_header, X402PaymentHeader};
use crate::middleware::tenant::TenantContext;
use crate::models::PaymentProof;
use crate::services::paywall::service::CartQuoteItemInput;
use crate::storage::Store;

// ─────────────────────────────────────────────────────────────────────────────
// Request/Response types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CartItem {
    pub resource: String,
    /// Optional variant ID for variant-level inventory tracking
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variant_id: Option<String>,
    pub quantity: i32,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CartQuoteRequest {
    pub items: Vec<CartItem>,
    pub metadata: Option<serde_json::Value>,
    pub coupon_code: Option<String>,
    pub gift_card_code: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CartQuoteResponse {
    pub cart_id: String,
    pub items: Vec<CartItemResponse>,
    pub total_amount: f64,
    pub token: String,
    pub metadata: serde_json::Value,
    pub expires_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quote: Option<AcceptEntry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub credits: Option<CreditsQuoteOption>,
}

/// Credits payment option for cart quotes
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditsQuoteOption {
    /// Amount in credits (cents for USD-denominated credits)
    pub amount: i64,
    /// Currency code (typically "USD")
    pub currency: String,
    /// Human-readable description
    pub description: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CartItemResponse {
    pub resource: String,
    /// Variant ID if this item is a specific variant
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variant_id: Option<String>,
    pub quantity: i32,
    pub price_amount: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_price: Option<f64>,
    pub token: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub applied_coupons: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CartCheckoutItem {
    pub price_id: Option<String>,
    pub resource: Option<String>,
    /// Optional variant ID for variant-level inventory tracking
    #[serde(default)]
    pub variant_id: Option<String>,
    pub quantity: i32,
    pub description: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CartCheckoutRequest {
    pub cart_id: String,
    pub items: Vec<CartCheckoutItem>,
    pub customer_email: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub success_url: Option<String>,
    pub cancel_url: Option<String>,
    pub coupon_code: Option<String>,
    pub gift_card_code: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CartCheckoutResponse {
    pub session_id: String,
    pub url: String,
    pub total_items: i32,
}

/// Per-item inventory status for pre-checkout validation
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemInventoryStatus {
    pub resource_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variant_id: Option<String>,
    pub in_stock: bool,
    pub available_quantity: i32,
    pub reserved_by_others: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hold_expires_at: Option<DateTime<Utc>>,
    pub can_backorder: bool,
}

/// Response for cart inventory status endpoint
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CartInventoryStatusResponse {
    pub cart_id: String,
    pub all_available: bool,
    pub holds_enabled: bool,
    pub items: Vec<ItemInventoryStatus>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// POST /paywall/v1/cart/quote - Get quote for multi-item cart
pub async fn cart_quote<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    Json(req): Json<CartQuoteRequest>,
) -> impl IntoResponse {
    // Per spec (17-validation.md): validate items not empty
    if req.items.is_empty() {
        let (status, body) = error_response(
            ErrorCode::EmptyCart,
            Some("cart must contain at least one item".to_string()),
            None,
        );
        return json_error(status, body).into_response();
    }

    // Limit cart items to prevent DoS via large carts
    if req.items.len() > MAX_CART_ITEMS {
        let (status, body) = error_response(
            ErrorCode::CartTooLarge,
            Some(format!(
                "cart cannot exceed {} items (got {})",
                MAX_CART_ITEMS,
                req.items.len()
            )),
            None,
        );
        return json_error(status, body).into_response();
    }

    // Validate cart-level metadata size
    if let Some(ref meta) = req.metadata {
        if let Err(msg) = super::validate_metadata_size(meta) {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(msg), None);
            return json_error(status, body).into_response();
        }
    }

    // Validate coupon code if provided
    if let Some(ref code) = req.coupon_code {
        if let Err(e) = crate::errors::validation::validate_coupon_code(code) {
            let (status, body) = error_response(ErrorCode::InvalidCoupon, Some(e.message), None);
            return json_error(status, body).into_response();
        }
    }

    // Per spec (17-validation.md): each item must have non-empty resource and valid quantity
    for (i, item) in req.items.iter().enumerate() {
        if item.resource.is_empty() {
            let (status, body) = error_response(
                ErrorCode::MissingField,
                Some(format!("item {} missing resource field", i)),
                None,
            );
            return json_error(status, body).into_response();
        }

        // Validate resource ID format
        if let Err(e) = crate::errors::validation::validate_resource_id(&item.resource) {
            let (status, body) = error_response(
                ErrorCode::InvalidResource,
                Some(format!("item {}: {}", i, e.message)),
                None,
            );
            return json_error(status, body).into_response();
        }

        // Validate item-level metadata size
        if let Some(ref meta) = item.metadata {
            if let Err(msg) = super::validate_metadata_size(meta) {
                let (status, body) = error_response(
                    ErrorCode::InvalidField,
                    Some(format!("item {}: {}", i, msg)),
                    None,
                );
                return json_error(status, body).into_response();
            }
        }

        // Validate quantity is within acceptable range
        if item.quantity <= 0 {
            let (status, body) = error_response(
                ErrorCode::InvalidQuantity,
                Some(format!(
                    "item {} quantity must be positive (got {})",
                    i, item.quantity
                )),
                None,
            );
            return json_error(status, body).into_response();
        }

        if item.quantity > MAX_ITEM_QUANTITY {
            let (status, body) = error_response(
                ErrorCode::InvalidQuantity,
                Some(format!(
                    "item {} quantity cannot exceed {} (got {})",
                    i, MAX_ITEM_QUANTITY, item.quantity
                )),
                None,
            );
            return json_error(status, body).into_response();
        }
    }

    let cart_metadata = req
        .metadata
        .as_ref()
        .map(convert_metadata)
        .unwrap_or_default();
    let items: Vec<CartQuoteItemInput> = req
        .items
        .iter()
        .map(|i| CartQuoteItemInput {
            resource_id: i.resource.clone(),
            variant_id: i.variant_id.clone(),
            quantity: i.quantity as i64,
            metadata: i
                .metadata
                .as_ref()
                .map(convert_metadata)
                .unwrap_or_default(),
        })
        .collect();

    let result = state
        .paywall_service
        .generate_cart_quote_with_metadata(
            &tenant.tenant_id,
            items,
            cart_metadata,
            req.coupon_code.as_deref(),
            req.gift_card_code.as_deref(),
        )
        .await;

    match result {
        Ok(cart_quote) => {
            let item_responses: Vec<CartItemResponse> = cart_quote
                .items
                .iter()
                .map(|item| CartItemResponse {
                    resource: item.resource_id.clone(),
                    variant_id: item.variant_id.clone(),
                    quantity: item.quantity,
                    price_amount: item.price.to_major(),
                    original_price: item.original_price.as_ref().map(|p| p.to_major()),
                    token: item.price.asset.code.clone(),
                    description: item.description.clone(),
                    applied_coupons: item.applied_coupons.clone(),
                })
                .collect();

            // Build AcceptEntry for x402 payment
            let cfg = &state.paywall_service.config;
            let accept_entry = AcceptEntry {
                scheme: "solana-spl-transfer".to_string(),
                network: cfg.x402.network.clone(),
                max_amount_required: cart_quote.total.atomic.to_string(),
                resource: format!("cart:{}", cart_quote.id),
                description: Some(format!(
                    "Cart purchase ({:.2} {})",
                    cart_quote.total.to_major(),
                    cart_quote.total.asset.code
                )),
                mime_type: Some("application/json".to_string()),
                pay_to: cfg.x402.payment_address.clone(),
                max_timeout_seconds: Some(cfg.storage.cart_quote_ttl.as_secs() as i64),
                asset: cfg.x402.token_mint.clone(),
                extra: Some(serde_json::json!({
                    "recipientTokenAccount": cfg.x402.payment_address,
                    "decimals": cfg.x402.token_decimals,
                    "tokenSymbol": cfg.x402.token_symbol,
                    "memo": format!("{}cart:{}", cfg.x402.memo_prefix, cart_quote.id)
                })),
            };

            // Build credits option if credits are configured and enabled
            let credits_option = if cfg.cedros_login.enabled
                && cfg.cedros_login.credits_enabled
                && !cfg.cedros_login.base_url.trim().is_empty()
            {
                Some(CreditsQuoteOption {
                    amount: cart_quote.total.atomic,
                    currency: cart_quote.total.asset.code.clone(),
                    description: format!(
                        "Cart purchase ({:.2} {})",
                        cart_quote.total.to_major(),
                        cart_quote.total.asset.code
                    ),
                })
            } else {
                None
            };

            let resp = CartQuoteResponse {
                cart_id: cart_quote.id.clone(),
                items: item_responses,
                total_amount: cart_quote.total.to_major(),
                token: cart_quote.total.asset.code.clone(),
                metadata: serde_json::json!(cart_quote.metadata),
                expires_at: cart_quote.expires_at,
                quote: Some(accept_entry),
                credits: credits_option,
            };
            json_ok(resp).into_response()
        }
        Err(e) => {
            // Use proper HTTP status code from error code per spec 15-errors.md
            let (status, error_body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            (status, Json(error_body)).into_response()
        }
    }
}

/// POST /paywall/v1/cart/checkout - Create Stripe cart checkout session
pub async fn cart_checkout<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    Json(req): Json<CartCheckoutRequest>,
) -> impl IntoResponse {
    // Validate cart_id
    if req.cart_id.is_empty() {
        let (status, body) = error_response(
            ErrorCode::MissingField,
            Some("cartId is required".to_string()),
            None,
        );
        return json_error(status, body);
    }
    if crate::x402::utils::validate_cart_id(&req.cart_id).is_err() {
        let (status, body) = error_response(
            ErrorCode::CartNotFound,
            Some("Invalid cart ID format".to_string()),
            None,
        );
        return json_error(status, body);
    }

    // Ensure cart quote exists and is not expired.
    match state
        .store
        .get_cart_quote(&tenant.tenant_id, &req.cart_id)
        .await
    {
        Ok(Some(cart)) => {
            if Utc::now() > cart.expires_at {
                let (status, body) = error_response(
                    ErrorCode::QuoteExpired,
                    Some("Cart quote expired".to_string()),
                    None,
                );
                return json_error(status, body);
            }
        }
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::CartNotFound,
                Some("Cart not found".to_string()),
                None,
            );
            return json_error(status, body);
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to load cart: {}", e)),
                None,
            );
            return json_error(status, body);
        }
    }

    // Validate email if provided
    if let Some(ref email) = req.customer_email {
        if let Err(e) = crate::errors::validation::validate_email(email) {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(e.message), None);
            return json_error(status, body);
        }
    }

    // Validate coupon code if provided
    if let Some(ref code) = req.coupon_code {
        if let Err(e) = crate::errors::validation::validate_coupon_code(code) {
            let (status, body) = error_response(ErrorCode::InvalidCoupon, Some(e.message), None);
            return json_error(status, body);
        }
    }

    if req.gift_card_code.as_ref().is_some() {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("gift_card_code is not supported for Stripe cart checkout".to_string()),
            None,
        );
        return json_error(status, body);
    }

    // Validate redirect URLs if provided (SSRF prevention)
    if let Some(ref url) = req.success_url {
        if let Err(e) = crate::errors::validation::validate_redirect_url_with_env(
            url,
            &state.paywall_service.config.logging.environment,
        ) {
            let (status, body) = error_response(
                ErrorCode::InvalidField,
                Some(format!("success_url: {}", e.message)),
                None,
            );
            return json_error(status, body);
        }
    }
    if let Some(ref url) = req.cancel_url {
        if let Err(e) = crate::errors::validation::validate_redirect_url_with_env(
            url,
            &state.paywall_service.config.logging.environment,
        ) {
            let (status, body) = error_response(
                ErrorCode::InvalidField,
                Some(format!("cancel_url: {}", e.message)),
                None,
            );
            return json_error(status, body);
        }
    }

    // Validate resource IDs and quantities in items (B-05)
    for (i, item) in req.items.iter().enumerate() {
        if let Some(ref resource) = item.resource {
            if let Err(e) = crate::errors::validation::validate_resource_id(resource) {
                let (status, body) = error_response(
                    ErrorCode::InvalidResource,
                    Some(format!("item {}: {}", i, e.message)),
                    None,
                );
                return json_error(status, body);
            }
        }
        // B-05: Validate quantity bounds (matching cart_quote validation)
        if item.quantity <= 0 {
            let (status, body) = error_response(
                ErrorCode::InvalidQuantity,
                Some(format!(
                    "item {} quantity must be positive (got {})",
                    i, item.quantity
                )),
                None,
            );
            return json_error(status, body);
        }
        if item.quantity > MAX_ITEM_QUANTITY {
            let (status, body) = error_response(
                ErrorCode::InvalidQuantity,
                Some(format!(
                    "item {} quantity cannot exceed {} (got {})",
                    i, MAX_ITEM_QUANTITY, item.quantity
                )),
                None,
            );
            return json_error(status, body);
        }
    }

    // Validate request-level metadata size
    if let Some(ref meta) = req.metadata {
        if let Err(msg) = super::validate_metadata_size(meta) {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(msg), None);
            return json_error(status, body);
        }
    }

    // Check if Stripe is configured
    let stripe_client = match &state.stripe_client {
        Some(client) => client,
        None => {
            let (status, body) = error_response(
                ErrorCode::ServiceUnavailable,
                Some("Stripe is not configured".to_string()),
                None,
            );
            return json_error(status, body);
        }
    };

    // Collect resources that need product lookup (N+1 prevention)
    let resources_to_lookup: Vec<String> = req
        .items
        .iter()
        .filter(|item| item.price_id.is_none())
        .filter_map(|item| item.resource.clone())
        .collect();

    // Batch fetch products if any need lookup
    let products_map: std::collections::HashMap<String, crate::models::Product> =
        if !resources_to_lookup.is_empty() {
            match state
                .product_repo
                .get_products_by_ids(&tenant.tenant_id, &resources_to_lookup)
                .await
            {
                Ok(products) => products.into_iter().map(|p| (p.id.clone(), p)).collect(),
                Err(e) => {
                    let (status, body) = error_response(
                        ErrorCode::DatabaseError,
                        Some(format!("Failed to fetch products: {}", e)),
                        None,
                    );
                    return json_error(status, body);
                }
            }
        } else {
            std::collections::HashMap::new()
        };

    // Build line items for Stripe
    let mut line_items = Vec::with_capacity(req.items.len());

    let mut requires_shipping_address = false;
    let mut shipping_address_collection_countries: Vec<String> = Vec::new();
    let mut billing_required = false;
    let mut phone_required = false;

    let parse_shipping_countries = |meta: &std::collections::HashMap<String, String>| {
        let raw = meta
            .get("shippingCountries")
            .or_else(|| meta.get("shipping_countries"));

        let raw = match raw {
            Some(v) if !v.trim().is_empty() => v.trim(),
            _ => return Ok::<Option<Vec<String>>, String>(None),
        };

        let mut countries: Vec<String> = if raw.starts_with('[') {
            serde_json::from_str::<Vec<String>>(raw)
                .map_err(|e| format!("invalid shippingCountries JSON: {e}"))?
        } else {
            raw.split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        };

        for c in &mut countries {
            *c = c.trim().to_uppercase();
            if c.len() != 2 || !c.chars().all(|ch| ch.is_ascii_alphabetic()) {
                return Err(format!("invalid country code: {c}"));
            }
        }

        countries.sort();
        countries.dedup();
        if countries.is_empty() {
            return Err("shippingCountries must not be empty".to_string());
        }

        Ok(Some(countries))
    };

    for item in &req.items {
        let price_id = match &item.price_id {
            Some(id) => {
                // Validate the Stripe price maps to an active product for this tenant.
                match state
                    .product_repo
                    .get_product_by_stripe_price_id(&tenant.tenant_id, id)
                    .await
                {
                    Ok(p) => {
                        if !p.active {
                            let (status, body) = error_response(
                                ErrorCode::ProductNotFound,
                                Some("product not available".to_string()),
                                None,
                            );
                            return json_error(status, body);
                        }

                        // Check effective inventory (variant-level if present, else product-level)
                        if let Some(qty) = p.get_effective_inventory(item.variant_id.as_deref()) {
                            let allow_backorder =
                                matches!(p.inventory_policy.as_deref(), Some("allow_backorder"));
                            if item.quantity > qty && !allow_backorder {
                                let (status, body) = error_response(
                                    ErrorCode::ProductNotFound,
                                    Some("product out of stock".to_string()),
                                    None,
                                );
                                return json_error(status, body);
                            }
                        }

                        let needs_shipping = p
                            .shipping_profile
                            .as_deref()
                            .is_some_and(|v| v == "physical")
                            || p.checkout_requirements
                                .as_ref()
                                .and_then(|c| c.shipping_address)
                                .unwrap_or(false);
                        if needs_shipping {
                            requires_shipping_address = true;
                            match parse_shipping_countries(&p.metadata) {
                                Ok(Some(countries)) => {
                                    shipping_address_collection_countries.extend(countries)
                                }
                                Ok(None) => {
                                    let (status, body) = error_response(
                                        ErrorCode::InvalidOperation,
                                        Some(
                                            "shippingCountries must be configured for shippable products"
                                                .to_string(),
                                        ),
                                        None,
                                    );
                                    return json_error(status, body);
                                }
                                Err(msg) => {
                                    let (status, body) =
                                        error_response(ErrorCode::InvalidField, Some(msg), None);
                                    return json_error(status, body);
                                }
                            }
                        }

                        if let Some(reqs) = &p.checkout_requirements {
                            billing_required |= reqs.billing_address == Some(true)
                                || matches!(reqs.name.as_deref(), Some("required"));
                            phone_required |= matches!(reqs.phone.as_deref(), Some("required"));
                        }
                    }
                    Err(_) => {
                        let (status, body) = error_response(
                            ErrorCode::ProductNotFound,
                            Some("product not available".to_string()),
                            None,
                        );
                        return json_error(status, body);
                    }
                }

                id.clone()
            }
            None => {
                // Look up product from pre-fetched map
                let resource = item.resource.as_deref().unwrap_or("");
                match products_map.get(resource) {
                    Some(product) => {
                        if !product.active {
                            let (status, body) = error_response(
                                ErrorCode::ProductNotFound,
                                Some("product not available".to_string()),
                                None,
                            );
                            return json_error(status, body);
                        }

                        // Check effective inventory (variant-level if present, else product-level)
                        if let Some(qty) =
                            product.get_effective_inventory(item.variant_id.as_deref())
                        {
                            let allow_backorder = matches!(
                                product.inventory_policy.as_deref(),
                                Some("allow_backorder")
                            );
                            if item.quantity > qty && !allow_backorder {
                                let (status, body) = error_response(
                                    ErrorCode::ProductNotFound,
                                    Some("product out of stock".to_string()),
                                    None,
                                );
                                return json_error(status, body);
                            }
                        }

                        let needs_shipping = product
                            .shipping_profile
                            .as_deref()
                            .is_some_and(|v| v == "physical")
                            || product
                                .checkout_requirements
                                .as_ref()
                                .and_then(|c| c.shipping_address)
                                .unwrap_or(false);
                        if needs_shipping {
                            requires_shipping_address = true;
                            match parse_shipping_countries(&product.metadata) {
                                Ok(Some(countries)) => {
                                    shipping_address_collection_countries.extend(countries)
                                }
                                Ok(None) => {
                                    let (status, body) = error_response(
                                        ErrorCode::InvalidOperation,
                                        Some(
                                            "shippingCountries must be configured for shippable products"
                                                .to_string(),
                                        ),
                                        None,
                                    );
                                    return json_error(status, body);
                                }
                                Err(msg) => {
                                    let (status, body) =
                                        error_response(ErrorCode::InvalidField, Some(msg), None);
                                    return json_error(status, body);
                                }
                            }
                        }

                        if let Some(reqs) = &product.checkout_requirements {
                            billing_required |= reqs.billing_address == Some(true)
                                || matches!(reqs.name.as_deref(), Some("required"));
                            phone_required |= matches!(reqs.phone.as_deref(), Some("required"));
                        }

                        match &product.stripe_price_id {
                            Some(id) => id.clone(),
                            None => {
                                let (status, body) = error_response(
                                    ErrorCode::InvalidResource,
                                    Some(format!("Product {} has no Stripe price ID", resource)),
                                    None,
                                );
                                return json_error(status, body);
                            }
                        }
                    }
                    None => {
                        let (status, body) = error_response(
                            ErrorCode::ProductNotFound,
                            Some(format!("Product not found: {}", resource)),
                            None,
                        );
                        return json_error(status, body);
                    }
                }
            }
        };

        line_items.push(crate::services::stripe::CartLineItem {
            price_id,
            resource: item.resource.clone().unwrap_or_default(),
            quantity: item.quantity,
            description: item.description.clone().unwrap_or_default(),
            metadata: std::collections::HashMap::new(),
        });
    }

    let shipping_address_collection_countries = if requires_shipping_address {
        shipping_address_collection_countries.sort();
        shipping_address_collection_countries.dedup();
        if shipping_address_collection_countries.is_empty() {
            let (status, body) = error_response(
                ErrorCode::InvalidOperation,
                Some("shippingCountries must be configured for shippable products".to_string()),
                None,
            );
            return json_error(status, body);
        }
        Some(shipping_address_collection_countries)
    } else {
        None
    };

    let billing_address_collection = if billing_required {
        Some("required".to_string())
    } else {
        None
    };

    // Create cart checkout request
    let mut metadata = std::collections::HashMap::new();
    metadata.insert("tenant_id".to_string(), tenant.tenant_id.clone());
    metadata.insert("resource_id".to_string(), format!("cart:{}", req.cart_id));

    let cart_req = crate::services::stripe::CreateCartSessionRequest {
        items: line_items,
        customer_email: req.customer_email.clone(),
        billing_address_collection,
        phone_number_collection_enabled: phone_required,
        shipping_address_collection_countries,
        metadata,
        success_url: req.success_url.clone(),
        cancel_url: req.cancel_url.clone(),
        coupon_code: req.coupon_code.clone(),
        stripe_coupon_id: None,
    };

    // Create checkout session
    match stripe_client.create_cart_checkout_session(cart_req).await {
        Ok(session) => {
            let resp = CartCheckoutResponse {
                session_id: session.session_id,
                url: session.url,
                total_items: req.items.len() as i32,
            };
            json_ok(resp)
        }
        Err(e) => {
            // Use proper HTTP status code from error code per spec 15-errors.md
            let (status, error_body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, error_body)
        }
    }
}

/// GET /paywall/v1/cart/{cartId} - Get cart status
/// Per spec (08-storage.md): Query filters by tenant_id for isolation
pub async fn get_cart<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    Path(cart_id): Path<String>,
) -> impl IntoResponse {
    // Validate cart ID format per spec (16-formats.md)
    if crate::x402::utils::validate_cart_id(&cart_id).is_err() {
        let (status, body) = error_response(
            ErrorCode::CartNotFound,
            Some("Invalid cart ID format".to_string()),
            None,
        );
        return json_error(status, body);
    }

    // Per spec (08-storage.md): Filter by tenant_id for isolation
    let result = state
        .store
        .get_cart_quote(&tenant.tenant_id, &cart_id)
        .await;

    match result {
        Ok(Some(cart)) => {
            let resp = serde_json::json!({
                "cartId": cart.id,
                "status": if cart.wallet_paid_by.is_some() { "paid" } else { "pending" },
                "totalAmount": cart.total.to_major(),
                "token": cart.total.asset.code,
                "expiresAt": cart.expires_at,
                "paidBy": cart.wallet_paid_by
            });
            json_ok(resp)
        }
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::CartNotFound,
                Some("Cart not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            // Don't expose database error details - log for debugging
            tracing::error!(error = %e, "Failed to get cart");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            json_error(status, body)
        }
    }
}

/// POST /paywall/v1/cart/{cartId}/verify - Verify cart payment
/// Per spec (02-http-endpoints.md): Requires X-PAYMENT header with payment proof
/// Per spec (08-storage.md): Query filters by tenant_id for isolation
pub async fn verify_cart<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    Path(cart_id): Path<String>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Validate cart ID format per spec (16-formats.md)
    if crate::x402::utils::validate_cart_id(&cart_id).is_err() {
        let (status, body) = error_response(
            ErrorCode::CartNotFound,
            Some("Invalid cart ID format".to_string()),
            None,
        );
        return json_error(status, body);
    }

    // VAL-001: Extract X-PAYMENT header using lowercase for clarity
    // (HeaderMap::get is case-insensitive, but lowercase is conventional)
    let payment_header = match headers.get("x-payment") {
        Some(h) => h.to_str().unwrap_or_default(),
        None => {
            let (status, body) = error_response(
                ErrorCode::MissingField,
                Some("Missing X-PAYMENT header".to_string()),
                None,
            );
            return json_error(status, body);
        }
    };

    let payment: X402PaymentHeader = match decode_x_payment_header(payment_header) {
        Ok(p) => p,
        Err(message) => {
            let (status, body) =
                error_response(ErrorCode::InvalidPaymentProof, Some(message), None);
            return json_error(status, body);
        }
    };

    // Verify the resource in payment matches this cart
    let expected_resource = format!("cart:{}", cart_id);
    if payment.payload.resource != expected_resource {
        let (status, body) = error_response(
            ErrorCode::InvalidResource,
            Some("Payment resource does not match cart".to_string()),
            None,
        );
        return json_error(status, body);
    }

    // Get cart to verify it exists - with tenant isolation
    let cart = match state
        .store
        .get_cart_quote(&tenant.tenant_id, &cart_id)
        .await
    {
        Ok(Some(cart)) => cart,
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::CartNotFound,
                Some("Cart not found".to_string()),
                None,
            );
            return json_error(status, body);
        }
        Err(e) => {
            // Don't expose database error details - log for debugging
            tracing::error!(error = %e, "Failed to get cart for verification");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            return json_error(status, body);
        }
    };

    // MED-003: Check cart expiration before processing payment
    if cart.expires_at < chrono::Utc::now() {
        let (status, body) = error_response(
            ErrorCode::QuoteExpired,
            Some("Cart has expired".to_string()),
            None,
        );
        return json_error(status, body);
    }

    // If already paid, only return success if signature matches stored payment
    if cart.wallet_paid_by.is_some() {
        let signature = payment.payload.signature.clone().unwrap_or_default();
        if signature.is_empty() {
            let (status, body) = error_response(
                ErrorCode::InvalidPaymentProof,
                Some("Missing payment signature".to_string()),
                None,
            );
            return json_error(status, body);
        }

        let expected_resource = format!("cart:{}", cart.id);
        let stored = match state.store.get_payment(&tenant.tenant_id, &signature).await {
            Ok(Some(payment)) => payment,
            Ok(None) => {
                let (status, body) = error_response(
                    ErrorCode::InvalidSignature,
                    Some("Unknown signature".into()),
                    None,
                );
                return json_error(status, body);
            }
            Err(e) => {
                tracing::error!(error = %e, "Failed to get payment for verification");
                let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
                return json_error(status, body);
            }
        };

        if stored.resource_id != expected_resource {
            let (status, body) = error_response(
                ErrorCode::InvalidSignature,
                Some("Signature does not match cart".to_string()),
                None,
            );
            return json_error(status, body);
        }

        let resp = serde_json::json!({
            "verified": true,
            "cartId": cart.id,
            "wallet": stored.wallet
        });
        return (StatusCode::OK, Json(resp));
    }

    // Build PaymentProof from header
    let proof = PaymentProof {
        x402_version: payment.x402_version,
        scheme: payment.scheme,
        network: payment.network.clone(),
        signature: payment.payload.signature.clone().unwrap_or_default(),
        payer: payment.payload.fee_payer.clone().unwrap_or_default(),
        transaction: payment.payload.transaction.clone().unwrap_or_default(),
        resource_id: payment.payload.resource.clone(),
        resource_type: "cart".to_string(),
        fee_payer: payment.payload.fee_payer,
        memo: payment.payload.memo,
        recipient_token_account: payment.payload.recipient_token_account,
        metadata: convert_metadata(&payment.payload.metadata),
    };

    // Verify payment via paywall service
    match state
        .paywall_service
        .verify_cart_payment(&tenant.tenant_id, &cart_id, proof)
        .await
    {
        Ok(verification) => {
            let resp = serde_json::json!({
                "verified": true,
                "cartId": cart_id,
                "txHash": verification.tx_hash,
                "wallet": verification.payer
            });
            (StatusCode::OK, Json(resp))
        }
        Err(e) => {
            let (status, body) = error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, body)
        }
    }
}

/// GET /paywall/v1/cart/{cartId}/inventory-status - Pre-checkout inventory validation
/// Returns detailed per-item inventory status for UX before payment processing
pub async fn get_cart_inventory_status<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    Path(cart_id): Path<String>,
) -> impl IntoResponse {
    // Validate cart ID format
    if crate::x402::utils::validate_cart_id(&cart_id).is_err() {
        let (status, body) = error_response(
            ErrorCode::CartNotFound,
            Some("Invalid cart ID format".to_string()),
            None,
        );
        return json_error(status, body);
    }

    // Load cart quote with tenant isolation
    let cart = match state
        .store
        .get_cart_quote(&tenant.tenant_id, &cart_id)
        .await
    {
        Ok(Some(cart)) => cart,
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::CartNotFound,
                Some("Cart not found".to_string()),
                None,
            );
            return json_error(status, body);
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to load cart for inventory status");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            return json_error(status, body);
        }
    };

    // Check if cart is expired
    let now = Utc::now();
    if cart.expires_at < now {
        let (status, body) = error_response(
            ErrorCode::QuoteExpired,
            Some("Cart has expired".to_string()),
            None,
        );
        return json_error(status, body);
    }

    let holds_enabled = state.paywall_service.config.storage.inventory_holds_enabled;

    // Collect unique resource IDs for batch product lookup
    let resource_ids: Vec<String> = cart
        .items
        .iter()
        .map(|item| item.resource_id.clone())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    // Batch fetch products
    let products_map: std::collections::HashMap<String, crate::models::Product> = match state
        .product_repo
        .get_products_by_ids(&tenant.tenant_id, &resource_ids)
        .await
    {
        Ok(products) => products.into_iter().map(|p| (p.id.clone(), p)).collect(),
        Err(e) => {
            tracing::error!(error = %e, "Failed to fetch products for inventory status");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            return json_error(status, body);
        }
    };

    // Build per-item inventory status
    let mut items = Vec::with_capacity(cart.items.len());
    let mut all_available = true;

    for cart_item in &cart.items {
        let product = products_map.get(&cart_item.resource_id);

        // Get effective inventory (variant-level if present, else product-level)
        let inventory_quantity =
            product.and_then(|p| p.get_effective_inventory(cart_item.variant_id.as_deref()));

        // Check if backorder is allowed
        let can_backorder = product
            .and_then(|p| p.inventory_policy.as_deref())
            .is_some_and(|policy| policy == "allow_backorder");

        // Get reservations by others (excluding this cart)
        let reserved_by_others = if holds_enabled {
            match state
                .store
                .get_active_inventory_reservation_quantity_excluding_cart(
                    &tenant.tenant_id,
                    &cart_item.resource_id,
                    cart_item.variant_id.as_deref(),
                    &cart_id,
                    now,
                )
                .await
            {
                Ok(qty) => qty as i32,
                Err(e) => {
                    tracing::warn!(error = %e, "Failed to query reservations, assuming 0");
                    0
                }
            }
        } else {
            0
        };

        // Compute this cart's hold expiry based on cart creation + hold TTL
        let hold_expires_at = if holds_enabled {
            let hold_ttl = state.paywall_service.config.storage.inventory_hold_ttl;
            let hold_ttl_chrono = chrono::Duration::from_std(hold_ttl).unwrap_or_default();
            let expiry = cart.created_at + hold_ttl_chrono;
            if expiry > now {
                Some(expiry)
            } else {
                None // Hold has expired
            }
        } else {
            None
        };

        // Calculate available quantity
        let (in_stock, available_quantity) = match inventory_quantity {
            Some(total) => {
                let available = total.saturating_sub(reserved_by_others).max(0);
                let in_stock = available >= cart_item.quantity || can_backorder;
                if !in_stock {
                    all_available = false;
                }
                (in_stock, available)
            }
            None => {
                // No inventory tracking = unlimited
                (true, i32::MAX)
            }
        };

        items.push(ItemInventoryStatus {
            resource_id: cart_item.resource_id.clone(),
            variant_id: cart_item.variant_id.clone(),
            in_stock,
            available_quantity,
            reserved_by_others,
            hold_expires_at,
            can_backorder,
        });
    }

    let response = CartInventoryStatusResponse {
        cart_id: cart.id,
        all_available,
        holds_enabled,
        items,
    };

    json_ok(response)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::response::IntoResponse;
    use http_body_util::BodyExt;
    use std::collections::HashMap;

    use crate::config::Config;
    use crate::models::Money;
    use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
    use crate::storage::InMemoryStore;
    use crate::webhooks::NoopNotifier;
    use crate::NoopVerifier;
    use chrono::Utc;

    fn build_state() -> Arc<AppState<InMemoryStore>> {
        let mut config = Config::default();
        let asset = crate::models::get_asset("USDC").expect("asset");
        config.x402.token_mint = asset.metadata.solana_mint.clone().unwrap_or_default();
        config.x402.payment_address = "11111111111111111111111111111111".to_string();

        let store = Arc::new(InMemoryStore::new());
        let product = crate::models::Product {
            id: "product-1".to_string(),
            tenant_id: "default".to_string(),
            crypto_price: Some(Money::new(asset, 100)),
            active: true,
            ..Default::default()
        };
        let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
        let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));
        let paywall_service = Arc::new(crate::PaywallService::new(
            config,
            store.clone(),
            Arc::new(NoopVerifier),
            Arc::new(NoopNotifier),
            product_repo.clone(),
            coupon_repo,
        ));

        Arc::new(AppState {
            store,
            paywall_service,
            product_repo,
            stripe_client: None,
            stripe_webhook_processor: None,
            admin_public_keys: Vec::new(),
            blockhash_cache: None,
        })
    }

    fn build_payment_header(network: &str, signature: &str, cart_id: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        let payload = serde_json::json!({
            "x402Version": 0,
            "scheme": "solana-spl-transfer",
            "network": network,
            "payload": {
                "signature": signature,
                "transaction": "tx",
                "resource": format!("cart:{}", cart_id),
                "resourceType": "cart"
            }
        })
        .to_string();
        headers.insert("x-payment", payload.parse().expect("header"));
        headers
    }

    #[tokio::test]
    async fn test_verify_cart_paid_requires_signature_match() {
        let state = build_state();
        let asset = crate::models::get_asset("USDC").expect("asset");
        let cart_id = "cart_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        let signature = "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW";

        let cart = crate::models::CartQuote {
            id: cart_id.to_string(),
            tenant_id: "default".to_string(),
            total: Money::new(asset.clone(), 100),
            created_at: Utc::now(),
            expires_at: Utc::now() + chrono::Duration::minutes(10),
            wallet_paid_by: Some("wallet-1".to_string()),
            ..Default::default()
        };
        state.store.store_cart_quote(cart).await.unwrap();

        let payment = crate::models::PaymentTransaction {
            signature: signature.to_string(),
            tenant_id: "default".to_string(),
            resource_id: format!("cart:{}", cart_id),
            wallet: "wallet-1".to_string(),
            user_id: None,
            amount: Money::new(asset, 100),
            created_at: Utc::now(),
            metadata: HashMap::new(),
        };
        state.store.record_payment(payment).await.unwrap();

        let headers = build_payment_header(
            &state.paywall_service.config.x402.network,
            "bad_sig",
            cart_id,
        );
        let tenant = TenantContext::default();
        let response = verify_cart(State(state), tenant, Path(cart_id.to_string()), headers)
            .await
            .into_response();

        assert_eq!(response.status(), StatusCode::PAYMENT_REQUIRED);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["error"]["code"], "invalid_signature");
    }

    #[tokio::test]
    async fn test_verify_cart_paid_accepts_matching_signature() {
        let state = build_state();
        let asset = crate::models::get_asset("USDC").expect("asset");
        let cart_id = "cart_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
        let signature = "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW";

        let cart = crate::models::CartQuote {
            id: cart_id.to_string(),
            tenant_id: "default".to_string(),
            total: Money::new(asset.clone(), 100),
            created_at: Utc::now(),
            expires_at: Utc::now() + chrono::Duration::minutes(10),
            wallet_paid_by: Some("wallet-1".to_string()),
            ..Default::default()
        };
        state.store.store_cart_quote(cart).await.unwrap();

        let payment = crate::models::PaymentTransaction {
            signature: signature.to_string(),
            tenant_id: "default".to_string(),
            resource_id: format!("cart:{}", cart_id),
            wallet: "wallet-1".to_string(),
            user_id: None,
            amount: Money::new(asset, 100),
            created_at: Utc::now(),
            metadata: HashMap::new(),
        };
        state.store.record_payment(payment).await.unwrap();

        let headers = build_payment_header(
            &state.paywall_service.config.x402.network,
            signature,
            cart_id,
        );
        let tenant = TenantContext::default();
        let response = verify_cart(State(state), tenant, Path(cart_id.to_string()), headers)
            .await
            .into_response();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["verified"], true);
        assert_eq!(json["wallet"], "wallet-1");
    }

    #[tokio::test]
    async fn test_cart_checkout_requires_cart_id() {
        let state = build_state();
        let tenant = TenantContext::default();

        let req = CartCheckoutRequest {
            cart_id: "".to_string(),
            items: vec![],
            customer_email: None,
            metadata: None,
            success_url: None,
            cancel_url: None,
            coupon_code: None,
            gift_card_code: None,
        };

        let resp = cart_checkout(State(state), tenant, Json(req))
            .await
            .into_response();
        assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_cart_checkout_rejects_unknown_cart_id() {
        let state = build_state();
        let tenant = TenantContext::default();

        let req = CartCheckoutRequest {
            cart_id: "cart_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".to_string(),
            items: vec![],
            customer_email: None,
            metadata: None,
            success_url: None,
            cancel_url: None,
            coupon_code: None,
            gift_card_code: None,
        };

        let resp = cart_checkout(State(state), tenant, Json(req))
            .await
            .into_response();
        assert_eq!(resp.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_cart_checkout_rejects_inactive_product() {
        let mut config = Config::default();
        let asset = crate::models::get_asset("USDC").expect("asset");
        config.x402.token_mint = asset.metadata.solana_mint.clone().unwrap_or_default();
        config.x402.payment_address = "11111111111111111111111111111111".to_string();

        let store = Arc::new(InMemoryStore::new());
        let cart_id = "cart_cccccccccccccccccccccccccccccccc";
        let cart = crate::models::CartQuote {
            id: cart_id.to_string(),
            tenant_id: "default".to_string(),
            total: Money::new(asset.clone(), 100),
            created_at: Utc::now(),
            expires_at: Utc::now() + chrono::Duration::minutes(10),
            ..Default::default()
        };
        store.store_cart_quote(cart).await.unwrap();

        let product = crate::models::Product {
            id: "product-1".to_string(),
            tenant_id: "default".to_string(),
            stripe_price_id: Some("price_1".to_string()),
            fiat_price: Some(Money::new(
                crate::models::get_asset("USD").expect("USD"),
                100,
            )),
            active: false,
            ..Default::default()
        };
        let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
        let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));
        let paywall_service = Arc::new(crate::PaywallService::new(
            config,
            store.clone(),
            Arc::new(NoopVerifier),
            Arc::new(NoopNotifier),
            product_repo.clone(),
            coupon_repo,
        ));

        // Provide a StripeClient instance; the handler should reject before making any network call.
        let stripe_client = Some(Arc::new(
            crate::services::StripeClient::new(
                Config::default(),
                store.clone(),
                Arc::new(NoopNotifier),
            )
            .unwrap(),
        ));

        let state = Arc::new(AppState {
            store,
            paywall_service,
            product_repo,
            stripe_client,
            stripe_webhook_processor: None,
            admin_public_keys: Vec::new(),
            blockhash_cache: None,
        });

        let req = CartCheckoutRequest {
            cart_id: cart_id.to_string(),
            items: vec![CartCheckoutItem {
                price_id: None,
                resource: Some("product-1".to_string()),
                variant_id: None,
                quantity: 1,
                description: None,
                metadata: None,
            }],
            customer_email: None,
            metadata: None,
            success_url: None,
            cancel_url: None,
            coupon_code: None,
            gift_card_code: None,
        };

        let resp = cart_checkout(State(state), TenantContext::default(), Json(req))
            .await
            .into_response();
        assert_eq!(resp.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_cart_checkout_rejects_shipping_address_requirement_for_stripe() {
        let mut config = Config::default();
        config.logging.environment = "test".to_string();

        let store = Arc::new(InMemoryStore::new());
        let cart_id = "cart_dddddddddddddddddddddddddddddddd";
        let asset = crate::models::get_asset("USDC").expect("asset");
        let cart = crate::models::CartQuote {
            id: cart_id.to_string(),
            tenant_id: "default".to_string(),
            total: Money::new(asset.clone(), 100),
            created_at: Utc::now(),
            expires_at: Utc::now() + chrono::Duration::minutes(10),
            ..Default::default()
        };
        store.store_cart_quote(cart).await.unwrap();

        let product = crate::models::Product {
            id: "product-1".to_string(),
            tenant_id: "default".to_string(),
            stripe_price_id: Some("price_1".to_string()),
            fiat_price: Some(Money::new(
                crate::models::get_asset("USD").expect("USD"),
                100,
            )),
            active: true,
            checkout_requirements: Some(crate::models::CheckoutRequirements {
                shipping_address: Some(true),
                ..Default::default()
            }),
            ..Default::default()
        };
        let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
        let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));
        let paywall_service = Arc::new(crate::PaywallService::new(
            config.clone(),
            store.clone(),
            Arc::new(NoopVerifier),
            Arc::new(NoopNotifier),
            product_repo.clone(),
            coupon_repo,
        ));

        // Provide a StripeClient instance; the handler should reject before making any network call.
        let stripe_client = Some(Arc::new(
            crate::services::StripeClient::new(
                Config::default(),
                store.clone(),
                Arc::new(NoopNotifier),
            )
            .unwrap(),
        ));

        let state = Arc::new(AppState {
            store,
            paywall_service,
            product_repo,
            stripe_client,
            stripe_webhook_processor: None,
            admin_public_keys: Vec::new(),
            blockhash_cache: None,
        });

        let req = CartCheckoutRequest {
            cart_id: cart_id.to_string(),
            items: vec![CartCheckoutItem {
                price_id: None,
                resource: Some("product-1".to_string()),
                variant_id: None,
                quantity: 1,
                description: None,
                metadata: None,
            }],
            customer_email: None,
            metadata: None,
            success_url: None,
            cancel_url: None,
            coupon_code: None,
            gift_card_code: None,
        };

        let resp = cart_checkout(State(state), TenantContext::default(), Json(req))
            .await
            .into_response();
        assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
        let body = resp.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["error"]["code"], "invalid_operation");
    }

    #[tokio::test]
    async fn test_cart_checkout_rejects_out_of_stock_product() {
        let mut config = Config::default();
        config.logging.environment = "test".to_string();

        let store = Arc::new(InMemoryStore::new());
        let cart_id = "cart_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
        let asset = crate::models::get_asset("USDC").expect("asset");
        let cart = crate::models::CartQuote {
            id: cart_id.to_string(),
            tenant_id: "default".to_string(),
            total: Money::new(asset.clone(), 100),
            created_at: Utc::now(),
            expires_at: Utc::now() + chrono::Duration::minutes(10),
            ..Default::default()
        };
        store.store_cart_quote(cart).await.unwrap();

        let product = crate::models::Product {
            id: "product-1".to_string(),
            tenant_id: "default".to_string(),
            stripe_price_id: Some("price_1".to_string()),
            fiat_price: Some(Money::new(
                crate::models::get_asset("USD").expect("USD"),
                100,
            )),
            active: true,
            inventory_quantity: Some(0),
            ..Default::default()
        };
        let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
        let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));
        let paywall_service = Arc::new(crate::PaywallService::new(
            config.clone(),
            store.clone(),
            Arc::new(NoopVerifier),
            Arc::new(NoopNotifier),
            product_repo.clone(),
            coupon_repo,
        ));

        let stripe_client = Some(Arc::new(
            crate::services::StripeClient::new(
                Config::default(),
                store.clone(),
                Arc::new(NoopNotifier),
            )
            .unwrap(),
        ));

        let state = Arc::new(AppState {
            store,
            paywall_service,
            product_repo,
            stripe_client,
            stripe_webhook_processor: None,
            admin_public_keys: Vec::new(),
            blockhash_cache: None,
        });

        let req = CartCheckoutRequest {
            cart_id: cart_id.to_string(),
            items: vec![CartCheckoutItem {
                price_id: None,
                resource: Some("product-1".to_string()),
                variant_id: None,
                quantity: 1,
                description: None,
                metadata: None,
            }],
            customer_email: None,
            metadata: None,
            success_url: None,
            cancel_url: None,
            coupon_code: None,
            gift_card_code: None,
        };

        let resp = cart_checkout(State(state), TenantContext::default(), Json(req))
            .await
            .into_response();
        assert_eq!(resp.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_cart_quote_persists_metadata() {
        let state = build_state();
        let tenant = TenantContext::default();
        let req = CartQuoteRequest {
            items: vec![CartItem {
                resource: "product-1".to_string(),
                variant_id: None,
                quantity: 1,
                metadata: Some(serde_json::json!({"item_key": "item_value"})),
            }],
            metadata: Some(serde_json::json!({"cart_key": "cart_value"})),
            coupon_code: None,
            gift_card_code: None,
        };

        let response = cart_quote(State(state.clone()), tenant, Json(req))
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        let cart_id = json["cartId"].as_str().expect("cartId");
        assert_eq!(json["metadata"]["cart_key"], "cart_value");

        let stored = state
            .store
            .get_cart_quote("default", cart_id)
            .await
            .unwrap()
            .expect("stored cart");
        assert_eq!(
            stored.metadata.get("cart_key"),
            Some(&"cart_value".to_string())
        );
        assert_eq!(
            stored.items[0].metadata.get("item_key"),
            Some(&"item_value".to_string())
        );
    }
}
