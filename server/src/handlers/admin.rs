//! Admin dashboard handlers
//!
//! Provides admin endpoints for stats, products, transactions, coupons, and refunds
//! for the cedros-pay admin dashboard UI.

use std::collections::HashMap;
use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;
use crate::models::money::{get_asset, Money};
use crate::models::{Coupon, Product};
use crate::repositories::{CouponRepository, ProductRepository};
use crate::storage::Store;

/// Maximum limit for list queries to prevent resource exhaustion
const MAX_LIST_LIMIT: i32 = 1000;

fn default_limit() -> i32 {
    20
}

fn cap_limit(limit: i32) -> i32 {
    limit.clamp(1, MAX_LIST_LIMIT)
}

// ============================================================================
// Shared State
// ============================================================================

/// Shared state for admin handlers
pub struct AdminState {
    pub store: Arc<dyn Store>,
    pub product_repo: Arc<dyn ProductRepository>,
    pub coupon_repo: Arc<dyn CouponRepository>,
    /// Optional Stripe client for auto-creating products/prices
    pub stripe_client: Option<Arc<crate::services::StripeClient>>,
}

// ============================================================================
// Stats Endpoint
// ============================================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsResponse {
    pub total_revenue: f64,
    pub total_transactions: i64,
    pub active_products: i64,
    pub pending_refunds: i64,
    pub revenue_by_method: HashMap<String, f64>,
    pub transactions_by_method: HashMap<String, i64>,
}

/// GET /api/admin/stats - Get dashboard stats overview
pub async fn get_stats(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
) -> impl IntoResponse {
    // Get stats from storage
    let stats = match state.store.get_admin_stats(&tenant.tenant_id).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!(error = %e, "Failed to get admin stats");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to get stats".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    // Get active products count
    let active_products = match state.product_repo.list_products(&tenant.tenant_id).await {
        Ok(products) => products.iter().filter(|p| p.active).count() as i64,
        Err(_) => 0,
    };

    // Get pending refunds count
    let pending_refunds = match state
        .store
        .list_pending_refunds(&tenant.tenant_id, 1000)
        .await
    {
        Ok(refunds) => refunds.len() as i64,
        Err(_) => 0,
    };

    let response = StatsResponse {
        total_revenue: stats.total_revenue,
        total_transactions: stats.total_transactions,
        active_products,
        pending_refunds,
        revenue_by_method: stats.revenue_by_method,
        transactions_by_method: stats.transactions_by_method,
    };

    json_ok(response).into_response()
}

// ============================================================================
// Products CRUD
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProductsQuery {
    #[serde(default = "default_limit")]
    pub limit: i32,
    #[serde(default)]
    pub offset: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminProductInfo {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub short_description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub slug: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seo_title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seo_description: Option<String>,
    pub description: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub category_ids: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub images: Vec<crate::models::ProductImage>,
    #[serde(default)]
    pub featured: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shipping_profile: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checkout_requirements: Option<crate::models::CheckoutRequirements>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fulfillment: Option<crate::models::FulfillmentInfo>,
    pub fiat_amount_cents: Option<i64>,
    pub fiat_currency: Option<String>,
    pub compare_at_fiat_amount_cents: Option<i64>,
    pub compare_at_fiat_currency: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_product_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_price_id: Option<String>,
    pub crypto_atomic_amount: Option<i64>,
    pub crypto_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_quantity: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_policy: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub variants: Vec<crate::models::ProductVariant>,
    pub active: bool,
    pub metadata: HashMap<String, String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProductsResponse {
    pub products: Vec<AdminProductInfo>,
    pub total: i64,
}

impl From<&Product> for AdminProductInfo {
    fn from(p: &Product) -> Self {
        AdminProductInfo {
            id: p.id.clone(),
            title: p.title.clone(),
            short_description: p.short_description.clone(),
            slug: p.slug.clone(),
            seo_title: p.seo_title.clone(),
            seo_description: p.seo_description.clone(),
            description: p.description.clone(),
            tags: p.tags.clone(),
            category_ids: p.category_ids.clone(),
            images: p.images.clone(),
            featured: p.featured,
            sort_order: p.sort_order,
            shipping_profile: p.shipping_profile.clone(),
            checkout_requirements: p.checkout_requirements.clone(),
            fulfillment: p.fulfillment.clone(),
            fiat_amount_cents: p.fiat_price.as_ref().map(|m| m.atomic),
            fiat_currency: p.fiat_price.as_ref().map(|m| m.asset.code.clone()),
            compare_at_fiat_amount_cents: p.compare_at_fiat_price.as_ref().map(|m| m.atomic),
            compare_at_fiat_currency: p
                .compare_at_fiat_price
                .as_ref()
                .map(|m| m.asset.code.clone()),
            stripe_product_id: p.stripe_product_id.clone(),
            stripe_price_id: p.stripe_price_id.clone(),
            crypto_atomic_amount: p.crypto_price.as_ref().map(|m| m.atomic),
            crypto_token: p.crypto_price.as_ref().map(|m| m.asset.code.clone()),
            inventory_status: p.inventory_status.clone(),
            inventory_quantity: p.inventory_quantity,
            inventory_policy: p.inventory_policy.clone(),
            variants: p.variants.clone(),
            active: p.active,
            metadata: p.metadata.clone(),
            created_at: p.created_at,
            updated_at: p.updated_at,
        }
    }
}

/// GET /api/admin/products - List all products
pub async fn list_products(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(query): Query<ListProductsQuery>,
) -> impl IntoResponse {
    let limit = cap_limit(query.limit) as usize;
    let offset = query.offset.max(0) as usize;

    let total = match state
        .product_repo
        .count_all_products(&tenant.tenant_id)
        .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!(error = %e, "Failed to count products");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to list products".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    match state
        .product_repo
        .list_all_products_paginated(&tenant.tenant_id, limit, offset)
        .await
    {
        Ok(products) => {
            let response = ListProductsResponse {
                products: products.iter().map(AdminProductInfo::from).collect(),
                total,
            };
            json_ok(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to list products");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to list products".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// GET /api/admin/products/:id - Get a single product
pub async fn get_product(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.product_repo.get_product(&tenant.tenant_id, &id).await {
        Ok(product) => json_ok(AdminProductInfo::from(&product)).into_response(),
        Err(_) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("Product not found".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
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

fn validate_product_checkout_fields(
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

fn default_active() -> bool {
    true
}

/// POST /api/admin/products - Create a new product
pub async fn create_product(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Json(req): Json<CreateProductRequest>,
) -> impl IntoResponse {
    if let Err((status, body)) = validate_product_checkout_fields(&req) {
        return json_error(status, body).into_response();
    }
    let fiat_price = match (&req.fiat_amount_cents, &req.fiat_currency) {
        (Some(amount), Some(currency)) => {
            let asset = match get_asset(currency) {
                Some(a) => a,
                None => {
                    let (status, body) = error_response(
                        ErrorCode::InvalidField,
                        Some(format!("Unknown currency: {}", currency)),
                        None,
                    );
                    return json_error(status, body).into_response();
                }
            };
            Some(Money::new(asset, *amount))
        }
        _ => None,
    };

    let compare_at_fiat_price = match (
        &req.compare_at_fiat_amount_cents,
        &req.compare_at_fiat_currency,
    ) {
        (Some(amount), Some(currency)) => {
            let asset = match get_asset(currency) {
                Some(a) => a,
                None => {
                    let (status, body) = error_response(
                        ErrorCode::InvalidField,
                        Some(format!("Unknown currency: {}", currency)),
                        None,
                    );
                    return json_error(status, body).into_response();
                }
            };
            Some(Money::new(asset, *amount))
        }
        _ => None,
    };

    let crypto_price = match (&req.crypto_atomic_amount, &req.crypto_token) {
        (Some(amount), Some(token)) => {
            let asset = match get_asset(token) {
                Some(a) => a,
                None => {
                    let (status, body) = error_response(
                        ErrorCode::InvalidField,
                        Some(format!("Unknown token: {}", token)),
                        None,
                    );
                    return json_error(status, body).into_response();
                }
            };
            Some(Money::new(asset, *amount))
        }
        _ => None,
    };

    // Auto-create Stripe product/price if fiat price exists but no stripe_price_id provided
    let stripe_name = req.title.as_deref().unwrap_or(&req.id);

    let (stripe_product_id, stripe_price_id) =
        if let (Some(amount_cents), None, Some(stripe_client)) = (
            req.fiat_amount_cents,
            req.stripe_price_id.as_ref(),
            state.stripe_client.as_ref(),
        ) {
            let mut metadata = req.metadata.clone();
            metadata.insert("product_id".to_string(), req.id.clone());
            metadata.insert("tenant_id".to_string(), tenant.tenant_id.clone());

            match stripe_client
                .create_stripe_product(stripe_name, Some(&req.description), metadata)
                .await
            {
                Ok(prod_id) => {
                    let currency = req.fiat_currency.as_deref().unwrap_or("usd");
                    match stripe_client
                        .create_stripe_price(&prod_id, amount_cents, currency)
                        .await
                    {
                        Ok(price_id) => {
                            tracing::info!(
                                product_id = %req.id,
                                stripe_product_id = %prod_id,
                                stripe_price_id = %price_id,
                                "Auto-created Stripe product and price"
                            );
                            (Some(prod_id), Some(price_id))
                        }
                        Err(e) => {
                            tracing::error!(error = %e, "Failed to auto-create Stripe price");
                            let (status, body) = error_response(
                                ErrorCode::StripeError,
                                Some("Failed to create Stripe price".to_string()),
                                None,
                            );
                            return json_error(status, body).into_response();
                        }
                    }
                }
                Err(e) => {
                    tracing::error!(error = %e, "Failed to auto-create Stripe product");
                    let (status, body) = error_response(
                        ErrorCode::StripeError,
                        Some("Failed to create Stripe product".to_string()),
                        None,
                    );
                    return json_error(status, body).into_response();
                }
            }
        } else {
            (None, req.stripe_price_id)
        };

    let product = Product {
        id: req.id.clone(),
        tenant_id: tenant.tenant_id.clone(),
        title: req.title,
        short_description: req.short_description,
        slug: req.slug,
        seo_title: req.seo_title,
        seo_description: req.seo_description,
        description: req.description,
        tags: req.tags,
        category_ids: req.category_ids,
        images: req.images,
        featured: req.featured,
        sort_order: req.sort_order,
        shipping_profile: req.shipping_profile,
        checkout_requirements: req.checkout_requirements,
        fulfillment: req.fulfillment,
        fiat_price,
        compare_at_fiat_price,
        stripe_product_id,
        stripe_price_id,
        crypto_price,
        inventory_status: req.inventory_status,
        inventory_quantity: req.inventory_quantity,
        inventory_policy: req.inventory_policy,
        variants: req.variants,
        variation_config: None,
        crypto_account: None,
        memo_template: None,
        metadata: req.metadata,
        active: req.active,
        subscription: None,
        created_at: Some(Utc::now()),
        updated_at: Some(Utc::now()),
    };

    match state.product_repo.create_product(product.clone()).await {
        Ok(()) => json_ok(AdminProductInfo::from(&product)).into_response(),
        Err(e) => {
            tracing::error!(error = %e, "Failed to create product");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to create product".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// PUT /api/admin/products/:id - Update a product
pub async fn update_product(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
    Json(req): Json<CreateProductRequest>,
) -> impl IntoResponse {
    if let Err((status, body)) = validate_product_checkout_fields(&req) {
        return json_error(status, body).into_response();
    }
    // First get the existing product to preserve created_at
    let existing = match state.product_repo.get_product(&tenant.tenant_id, &id).await {
        Ok(p) => p,
        Err(_) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("Product not found".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let fiat_price = match (&req.fiat_amount_cents, &req.fiat_currency) {
        (Some(amount), Some(currency)) => {
            let asset = match get_asset(currency) {
                Some(a) => a,
                None => {
                    let (status, body) = error_response(
                        ErrorCode::InvalidField,
                        Some(format!("Unknown currency: {}", currency)),
                        None,
                    );
                    return json_error(status, body).into_response();
                }
            };
            Some(Money::new(asset, *amount))
        }
        _ => None,
    };

    let compare_at_fiat_price = match (
        &req.compare_at_fiat_amount_cents,
        &req.compare_at_fiat_currency,
    ) {
        (Some(amount), Some(currency)) => {
            let asset = match get_asset(currency) {
                Some(a) => a,
                None => {
                    let (status, body) = error_response(
                        ErrorCode::InvalidField,
                        Some(format!("Unknown currency: {}", currency)),
                        None,
                    );
                    return json_error(status, body).into_response();
                }
            };
            Some(Money::new(asset, *amount))
        }
        _ => None,
    };

    let crypto_price = match (&req.crypto_atomic_amount, &req.crypto_token) {
        (Some(amount), Some(token)) => {
            let asset = match get_asset(token) {
                Some(a) => a,
                None => {
                    let (status, body) = error_response(
                        ErrorCode::InvalidField,
                        Some(format!("Unknown token: {}", token)),
                        None,
                    );
                    return json_error(status, body).into_response();
                }
            };
            Some(Money::new(asset, *amount))
        }
        _ => None,
    };

    // Determine Stripe product/price IDs
    let stripe_name = req.title.as_deref().unwrap_or(&id);

    let (stripe_product_id, stripe_price_id) = if let Some(ref stripe_client) = state.stripe_client
    {
        // If existing product has a Stripe product, sync updates to Stripe
        if let Some(ref existing_stripe_product_id) = existing.stripe_product_id {
            let mut metadata = req.metadata.clone();
            metadata.insert("product_id".to_string(), id.clone());
            metadata.insert("tenant_id".to_string(), tenant.tenant_id.clone());

            // Update the Stripe product (name/description/metadata)
            if let Err(e) = stripe_client
                .update_stripe_product(
                    existing_stripe_product_id,
                    stripe_name,
                    Some(&req.description),
                    metadata,
                )
                .await
            {
                tracing::warn!(error = %e, "Failed to sync product update to Stripe (non-fatal)");
            } else {
                tracing::info!(
                    product_id = %id,
                    stripe_product_id = %existing_stripe_product_id,
                    "Synced product update to Stripe"
                );
            }

            (
                existing.stripe_product_id.clone(),
                req.stripe_price_id.or(existing.stripe_price_id.clone()),
            )
        }
        // Auto-create Stripe product/price if fiat price exists but no stripe_price_id
        else if let Some(amount_cents) = req.fiat_amount_cents {
            if req.stripe_price_id.is_none() && existing.stripe_price_id.is_none() {
                let mut metadata = req.metadata.clone();
                metadata.insert("product_id".to_string(), id.clone());
                metadata.insert("tenant_id".to_string(), tenant.tenant_id.clone());

                match stripe_client
                    .create_stripe_product(stripe_name, Some(&req.description), metadata)
                    .await
                {
                    Ok(prod_id) => {
                        let currency = req.fiat_currency.as_deref().unwrap_or("usd");
                        match stripe_client
                            .create_stripe_price(&prod_id, amount_cents, currency)
                            .await
                        {
                            Ok(price_id) => {
                                tracing::info!(
                                    product_id = %id,
                                    stripe_product_id = %prod_id,
                                    stripe_price_id = %price_id,
                                    "Auto-created Stripe product and price on update"
                                );
                                (Some(prod_id), Some(price_id))
                            }
                            Err(e) => {
                                tracing::error!(error = %e, "Failed to auto-create Stripe price");
                                let (status, body) = error_response(
                                    ErrorCode::StripeError,
                                    Some("Failed to create Stripe price".to_string()),
                                    None,
                                );
                                return json_error(status, body).into_response();
                            }
                        }
                    }
                    Err(e) => {
                        tracing::error!(error = %e, "Failed to auto-create Stripe product");
                        let (status, body) = error_response(
                            ErrorCode::StripeError,
                            Some("Failed to create Stripe product".to_string()),
                            None,
                        );
                        return json_error(status, body).into_response();
                    }
                }
            } else {
                (
                    existing.stripe_product_id.clone(),
                    req.stripe_price_id.or(existing.stripe_price_id.clone()),
                )
            }
        } else {
            (
                existing.stripe_product_id.clone(),
                req.stripe_price_id.or(existing.stripe_price_id.clone()),
            )
        }
    } else {
        (
            existing.stripe_product_id.clone(),
            req.stripe_price_id.or(existing.stripe_price_id.clone()),
        )
    };

    let product = Product {
        id: id.clone(),
        tenant_id: tenant.tenant_id.clone(),
        title: req.title,
        short_description: req.short_description,
        slug: req.slug,
        seo_title: req.seo_title,
        seo_description: req.seo_description,
        description: req.description,
        tags: req.tags,
        category_ids: req.category_ids,
        images: req.images,
        featured: req.featured,
        sort_order: req.sort_order,
        shipping_profile: req.shipping_profile,
        checkout_requirements: req.checkout_requirements,
        fulfillment: req.fulfillment,
        fiat_price,
        compare_at_fiat_price,
        stripe_product_id,
        stripe_price_id,
        crypto_price,
        inventory_status: req.inventory_status,
        inventory_quantity: req.inventory_quantity,
        inventory_policy: req.inventory_policy,
        variants: req.variants,
        variation_config: existing.variation_config,
        crypto_account: existing.crypto_account,
        memo_template: existing.memo_template,
        metadata: req.metadata,
        active: req.active,
        subscription: existing.subscription,
        created_at: existing.created_at,
        updated_at: Some(Utc::now()),
    };

    match state.product_repo.update_product(product.clone()).await {
        Ok(()) => json_ok(AdminProductInfo::from(&product)).into_response(),
        Err(e) => {
            tracing::error!(error = %e, "Failed to update product");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to update product".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// DELETE /api/admin/products/:id - Delete a product
pub async fn delete_product(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
    // First get the product to check for Stripe product ID
    let existing = state
        .product_repo
        .get_product(&tenant.tenant_id, &id)
        .await
        .ok();

    // Archive in Stripe if we have a stripe_product_id
    if let Some(ref product) = existing {
        if let Some(ref stripe_product_id) = product.stripe_product_id {
            if let Some(ref stripe_client) = state.stripe_client {
                if let Err(e) = stripe_client
                    .archive_stripe_product(stripe_product_id)
                    .await
                {
                    tracing::warn!(
                        error = %e,
                        product_id = %id,
                        stripe_product_id = %stripe_product_id,
                        "Failed to archive product in Stripe (non-fatal)"
                    );
                } else {
                    tracing::info!(
                        product_id = %id,
                        stripe_product_id = %stripe_product_id,
                        "Archived product in Stripe"
                    );
                }
            }
        }
    }

    match state
        .product_repo
        .delete_product(&tenant.tenant_id, &id)
        .await
    {
        Ok(()) => json_ok(serde_json::json!({"deleted": true})).into_response(),
        Err(e) => {
            tracing::error!(error = %e, "Failed to delete product");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to delete product".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetInventoryRequest {
    /// When null/omitted, inventory is untracked (unlimited).
    pub quantity: Option<i32>,
}

/// PUT /api/admin/products/:id/inventory - Set tracked inventory quantity
pub async fn set_product_inventory(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
    Json(req): Json<SetInventoryRequest>,
) -> impl IntoResponse {
    if let Some(qty) = req.quantity {
        if qty < 0 {
            let (status, body) = error_response(
                ErrorCode::InvalidField,
                Some("quantity must be >= 0".to_string()),
                Some(serde_json::json!({ "field": "quantity" })),
            );
            return json_error(status, body).into_response();
        }
    }

    let mut product = match state.product_repo.get_product(&tenant.tenant_id, &id).await {
        Ok(p) => p,
        Err(_) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("Product not found".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    product.inventory_quantity = req.quantity;
    product.updated_at = Some(Utc::now());

    match state.product_repo.update_product(product.clone()).await {
        Ok(()) => json_ok(AdminProductInfo::from(&product)).into_response(),
        Err(e) => {
            tracing::error!(error = %e, product_id = %id, "Failed to set product inventory");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to update inventory".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
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

/// POST /api/admin/products/:id/inventory/adjust - Adjust tracked inventory quantity
pub async fn adjust_product_inventory(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
    Json(req): Json<AdjustInventoryRequest>,
) -> impl IntoResponse {
    let mut product = match state.product_repo.get_product(&tenant.tenant_id, &id).await {
        Ok(p) => p,
        Err(_) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("Product not found".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let current = match product.inventory_quantity {
        Some(q) => q,
        None => {
            let (status, body) = error_response(
                ErrorCode::InvalidOperation,
                Some("inventory is not tracked for this product".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let next = current.saturating_add(req.delta);
    if next < 0 {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("resulting quantity must be >= 0".to_string()),
            None,
        );
        return json_error(status, body).into_response();
    }

    let now = Utc::now();
    product.inventory_quantity = Some(next);
    product.updated_at = Some(now);

    match state.product_repo.update_product(product.clone()).await {
        Ok(()) => {
            let adjustment = crate::models::InventoryAdjustment {
                id: uuid::Uuid::new_v4().to_string(),
                tenant_id: tenant.tenant_id.clone(),
                product_id: id.clone(),
                variant_id: None, // Product-level adjustment
                delta: req.delta,
                quantity_before: current,
                quantity_after: next,
                reason: req.reason.clone(),
                actor: req.actor.clone(),
                created_at: now,
            };
            if let Err(e) = state.store.record_inventory_adjustment(adjustment).await {
                tracing::error!(error = %e, product_id = %id, "Failed to record inventory adjustment");
            }
            json_ok(AdminProductInfo::from(&product)).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, product_id = %id, "Failed to adjust product inventory");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to update inventory".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

// ============================================================================
// Transactions
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTransactionsQuery {
    #[serde(default = "default_limit")]
    pub limit: i32,
    #[serde(default)]
    pub offset: i32,
    pub method: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransactionInfo {
    pub id: String,
    pub resource_id: String,
    pub method: String,
    pub amount: f64,
    pub currency: String,
    pub status: String,
    pub paid_at: DateTime<Utc>,
    pub wallet: Option<String>,
    pub user_id: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTransactionsResponse {
    pub transactions: Vec<TransactionInfo>,
    pub total: i64,
}

/// GET /api/admin/transactions - List transactions
pub async fn list_transactions(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(query): Query<ListTransactionsQuery>,
) -> impl IntoResponse {
    let limit = cap_limit(query.limit);
    let offset = query.offset.max(0);

    match state
        .store
        .list_purchases(&tenant.tenant_id, query.method.as_deref(), limit, offset)
        .await
    {
        Ok(purchases) => {
            let transactions: Vec<TransactionInfo> = purchases
                .iter()
                .map(|p| {
                    // Parse amount to determine method
                    let (amount, currency, method) = parse_purchase_amount(&p.amount);
                    TransactionInfo {
                        id: p.signature.clone(),
                        resource_id: p.resource_id.clone(),
                        method,
                        amount,
                        currency,
                        status: "completed".to_string(),
                        paid_at: p.paid_at,
                        wallet: p.wallet.clone(),
                        user_id: p.user_id.clone(),
                        metadata: p.metadata.clone(),
                    }
                })
                .collect();

            let response = ListTransactionsResponse {
                total: transactions.len() as i64,
                transactions,
            };
            json_ok(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to list transactions");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to list transactions".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

fn parse_purchase_amount(amount_str: &str) -> (f64, String, String) {
    // Amount format is typically "1000000 USDC" or similar
    let parts: Vec<&str> = amount_str.split_whitespace().collect();
    if parts.len() >= 2 {
        let amount = parts[0].parse::<f64>().unwrap_or(0.0);
        let currency = parts[1].to_string();
        // Determine method from currency
        let method = if currency == "USD" {
            "stripe".to_string()
        } else {
            "x402".to_string()
        };
        (amount, currency, method)
    } else {
        (0.0, "USDC".to_string(), "x402".to_string())
    }
}

// ============================================================================
// Coupons CRUD
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCouponsQuery {
    #[serde(default = "default_limit")]
    pub limit: i32,
    #[serde(default)]
    pub offset: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminCouponInfo {
    pub code: String,
    pub discount_type: String,
    pub discount_value: f64,
    pub currency: Option<String>,
    pub active: bool,
    pub usage_limit: Option<i32>,
    pub usage_count: i32,
    pub expires_at: Option<DateTime<Utc>>,
    pub scope: String,
    pub product_ids: Vec<String>,
    pub payment_method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_coupon_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_promotion_code_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCouponsResponse {
    pub coupons: Vec<AdminCouponInfo>,
    pub total: i64,
}

impl From<&Coupon> for AdminCouponInfo {
    fn from(c: &Coupon) -> Self {
        AdminCouponInfo {
            code: c.code.clone(),
            discount_type: c.discount_type.clone(),
            discount_value: c.discount_value,
            currency: c.currency.clone(),
            active: c.active,
            usage_limit: c.usage_limit,
            usage_count: c.usage_count,
            expires_at: c.expires_at,
            scope: c.scope.clone(),
            product_ids: c.product_ids.clone(),
            payment_method: c.payment_method.clone(),
            stripe_coupon_id: c.stripe_coupon_id.clone(),
            stripe_promotion_code_id: c.stripe_promotion_code_id.clone(),
        }
    }
}

/// GET /api/admin/coupons - List all coupons
pub async fn list_coupons(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(_query): Query<ListCouponsQuery>,
) -> impl IntoResponse {
    match state.coupon_repo.list_coupons(&tenant.tenant_id).await {
        Ok(coupons) => {
            let response = ListCouponsResponse {
                total: coupons.len() as i64,
                coupons: coupons.iter().map(AdminCouponInfo::from).collect(),
            };
            json_ok(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to list coupons");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to list coupons".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCouponRequest {
    pub code: String,
    pub discount_type: String,
    pub discount_value: f64,
    pub currency: Option<String>,
    #[serde(default = "default_active")]
    pub active: bool,
    pub usage_limit: Option<i32>,
    pub expires_at: Option<DateTime<Utc>>,
    #[serde(default = "default_scope")]
    pub scope: String,
    #[serde(default)]
    pub product_ids: Vec<String>,
    #[serde(default)]
    pub category_ids: Vec<String>,
    #[serde(default)]
    pub payment_method: String,
    /// Minimum cart amount in cents for coupon to apply
    pub minimum_amount_cents: Option<i64>,
    /// Per-customer usage limit
    pub usage_limit_per_customer: Option<i32>,
    /// If true, coupon only applies to first-time purchasers
    #[serde(default)]
    pub first_purchase_only: bool,
}

fn default_scope() -> String {
    "all".to_string()
}

/// POST /api/admin/coupons - Create a new coupon
pub async fn create_coupon(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Json(req): Json<CreateCouponRequest>,
) -> impl IntoResponse {
    // Validate discount type
    let discount_type = req.discount_type.to_lowercase();
    if discount_type != "percentage" && discount_type != "fixed" {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("discount_type must be 'percentage' or 'fixed'".to_string()),
            None,
        );
        return json_error(status, body).into_response();
    }

    // Auto-create Stripe coupon and promotion code if Stripe is available
    let (stripe_coupon_id, stripe_promotion_code_id) = if let Some(ref stripe_client) =
        state.stripe_client
    {
        let mut metadata = HashMap::new();
        metadata.insert("coupon_code".to_string(), req.code.clone());
        metadata.insert("tenant_id".to_string(), tenant.tenant_id.clone());

        match stripe_client
            .create_stripe_coupon(
                &discount_type,
                req.discount_value,
                req.currency.as_deref(),
                metadata.clone(),
            )
            .await
        {
            Ok(coupon_id) => {
                // Create promotion code with the human-readable code and restrictions
                match stripe_client
                    .create_stripe_promotion_code_with_restrictions(
                        &coupon_id,
                        &req.code,
                        metadata,
                        req.minimum_amount_cents,
                        req.currency.as_deref(),
                        req.first_purchase_only,
                    )
                    .await
                {
                    Ok(promo_id) => {
                        tracing::info!(
                            coupon_code = %req.code,
                            stripe_coupon_id = %coupon_id,
                            stripe_promotion_code_id = %promo_id,
                            "Auto-created Stripe coupon and promotion code"
                        );
                        (Some(coupon_id), Some(promo_id))
                    }
                    Err(e) => {
                        tracing::error!(error = %e, "Failed to auto-create Stripe promotion code");
                        let (status, body) = error_response(
                            ErrorCode::StripeError,
                            Some("Failed to create Stripe promotion code".to_string()),
                            None,
                        );
                        return json_error(status, body).into_response();
                    }
                }
            }
            Err(e) => {
                tracing::error!(error = %e, "Failed to auto-create Stripe coupon");
                let (status, body) = error_response(
                    ErrorCode::StripeError,
                    Some("Failed to create Stripe coupon".to_string()),
                    None,
                );
                return json_error(status, body).into_response();
            }
        }
    } else {
        (None, None)
    };

    let coupon = Coupon {
        code: req.code.clone(),
        tenant_id: tenant.tenant_id.clone(),
        discount_type,
        discount_value: req.discount_value,
        currency: req.currency,
        active: req.active,
        usage_limit: req.usage_limit,
        usage_count: 0,
        usage_limit_per_customer: req.usage_limit_per_customer,
        minimum_amount_cents: req.minimum_amount_cents,
        first_purchase_only: req.first_purchase_only,
        starts_at: None,
        expires_at: req.expires_at,
        scope: req.scope,
        product_ids: req.product_ids,
        category_ids: req.category_ids,
        payment_method: req.payment_method,
        auto_apply: false,
        applies_at: String::new(),
        metadata: HashMap::new(),
        stripe_coupon_id,
        stripe_promotion_code_id,
        created_at: Some(Utc::now()),
        updated_at: Some(Utc::now()),
    };

    match state.coupon_repo.create_coupon(coupon.clone()).await {
        Ok(()) => json_ok(AdminCouponInfo::from(&coupon)).into_response(),
        Err(e) => {
            tracing::error!(error = %e, "Failed to create coupon");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to create coupon".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// PUT /api/admin/coupons/:code - Update a coupon
pub async fn update_coupon(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(code): Path<String>,
    Json(req): Json<CreateCouponRequest>,
) -> impl IntoResponse {
    // Get existing coupon to preserve usage_count
    let existing = match state.coupon_repo.get_coupon(&tenant.tenant_id, &code).await {
        Ok(c) => c,
        Err(_) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("Coupon not found".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    // Validate discount type
    let discount_type = req.discount_type.to_lowercase();
    if discount_type != "percentage" && discount_type != "fixed" {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("discount_type must be 'percentage' or 'fixed'".to_string()),
            None,
        );
        return json_error(status, body).into_response();
    }

    // Handle Stripe coupon sync
    let (stripe_coupon_id, stripe_promotion_code_id) = if let Some(ref stripe_client) =
        state.stripe_client
    {
        // If existing coupon has Stripe IDs, sync metadata and handle deactivation
        if existing.stripe_coupon_id.is_some() {
            let mut metadata = HashMap::new();
            metadata.insert("coupon_code".to_string(), code.clone());
            metadata.insert("tenant_id".to_string(), tenant.tenant_id.clone());

            // Sync metadata update to Stripe coupon
            if let Some(ref stripe_coupon_id) = existing.stripe_coupon_id {
                if let Err(e) = stripe_client
                    .update_stripe_coupon(stripe_coupon_id, metadata)
                    .await
                {
                    tracing::warn!(error = %e, "Failed to sync coupon metadata to Stripe (non-fatal)");
                } else {
                    tracing::info!(stripe_coupon_id = %stripe_coupon_id, "Synced coupon metadata to Stripe");
                }
            }

            // If coupon is being deactivated, deactivate the promotion code in Stripe
            if !req.active && existing.active {
                if let Some(ref stripe_promo_id) = existing.stripe_promotion_code_id {
                    if let Err(e) = stripe_client
                        .deactivate_stripe_promotion_code(stripe_promo_id)
                        .await
                    {
                        tracing::warn!(error = %e, "Failed to deactivate promotion code in Stripe (non-fatal)");
                    } else {
                        tracing::info!(stripe_promotion_code_id = %stripe_promo_id, "Deactivated promotion code in Stripe");
                    }
                }
            }

            (
                existing.stripe_coupon_id.clone(),
                existing.stripe_promotion_code_id.clone(),
            )
        }
        // Auto-create Stripe coupon/promo if not already present
        else {
            let mut metadata = HashMap::new();
            metadata.insert("coupon_code".to_string(), code.clone());
            metadata.insert("tenant_id".to_string(), tenant.tenant_id.clone());

            match stripe_client
                .create_stripe_coupon(
                    &discount_type,
                    req.discount_value,
                    req.currency.as_deref(),
                    metadata.clone(),
                )
                .await
            {
                Ok(coupon_id) => {
                    match stripe_client
                        .create_stripe_promotion_code_with_restrictions(
                            &coupon_id,
                            &code,
                            metadata,
                            req.minimum_amount_cents,
                            req.currency.as_deref(),
                            req.first_purchase_only,
                        )
                        .await
                    {
                        Ok(promo_id) => {
                            tracing::info!(
                                coupon_code = %code,
                                stripe_coupon_id = %coupon_id,
                                stripe_promotion_code_id = %promo_id,
                                "Auto-created Stripe coupon and promotion code on update"
                            );
                            (Some(coupon_id), Some(promo_id))
                        }
                        Err(e) => {
                            tracing::error!(error = %e, "Failed to auto-create Stripe promotion code");
                            let (status, body) = error_response(
                                ErrorCode::StripeError,
                                Some("Failed to create Stripe promotion code".to_string()),
                                None,
                            );
                            return json_error(status, body).into_response();
                        }
                    }
                }
                Err(e) => {
                    tracing::error!(error = %e, "Failed to auto-create Stripe coupon");
                    let (status, body) = error_response(
                        ErrorCode::StripeError,
                        Some("Failed to create Stripe coupon".to_string()),
                        None,
                    );
                    return json_error(status, body).into_response();
                }
            }
        }
    } else {
        (
            existing.stripe_coupon_id.clone(),
            existing.stripe_promotion_code_id.clone(),
        )
    };

    let coupon = Coupon {
        code: code.clone(),
        tenant_id: tenant.tenant_id.clone(),
        discount_type,
        discount_value: req.discount_value,
        currency: req.currency,
        active: req.active,
        usage_limit: req.usage_limit,
        usage_count: existing.usage_count,
        usage_limit_per_customer: req.usage_limit_per_customer,
        minimum_amount_cents: req.minimum_amount_cents,
        first_purchase_only: req.first_purchase_only,
        starts_at: existing.starts_at,
        expires_at: req.expires_at,
        scope: req.scope,
        product_ids: req.product_ids,
        category_ids: req.category_ids,
        payment_method: req.payment_method,
        auto_apply: existing.auto_apply,
        applies_at: existing.applies_at,
        metadata: existing.metadata,
        stripe_coupon_id,
        stripe_promotion_code_id,
        created_at: existing.created_at,
        updated_at: Some(Utc::now()),
    };

    match state.coupon_repo.update_coupon(coupon.clone()).await {
        Ok(()) => json_ok(AdminCouponInfo::from(&coupon)).into_response(),
        Err(e) => {
            tracing::error!(error = %e, "Failed to update coupon");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to update coupon".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// DELETE /api/admin/coupons/:code - Delete a coupon
pub async fn delete_coupon(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(code): Path<String>,
) -> impl IntoResponse {
    // First get the coupon to check for Stripe IDs
    let existing = state
        .coupon_repo
        .get_coupon(&tenant.tenant_id, &code)
        .await
        .ok();

    // Delete/deactivate in Stripe if we have Stripe IDs
    if let Some(ref coupon) = existing {
        if let Some(ref stripe_client) = state.stripe_client {
            // Deactivate promotion code first (can't delete, only deactivate)
            if let Some(ref stripe_promo_id) = coupon.stripe_promotion_code_id {
                if let Err(e) = stripe_client
                    .deactivate_stripe_promotion_code(stripe_promo_id)
                    .await
                {
                    tracing::warn!(
                        error = %e,
                        coupon_code = %code,
                        stripe_promotion_code_id = %stripe_promo_id,
                        "Failed to deactivate promotion code in Stripe (non-fatal)"
                    );
                } else {
                    tracing::info!(
                        coupon_code = %code,
                        stripe_promotion_code_id = %stripe_promo_id,
                        "Deactivated promotion code in Stripe"
                    );
                }
            }

            // Delete the Stripe coupon
            if let Some(ref stripe_coupon_id) = coupon.stripe_coupon_id {
                if let Err(e) = stripe_client.delete_stripe_coupon(stripe_coupon_id).await {
                    tracing::warn!(
                        error = %e,
                        coupon_code = %code,
                        stripe_coupon_id = %stripe_coupon_id,
                        "Failed to delete coupon in Stripe (non-fatal)"
                    );
                } else {
                    tracing::info!(
                        coupon_code = %code,
                        stripe_coupon_id = %stripe_coupon_id,
                        "Deleted coupon in Stripe"
                    );
                }
            }
        }
    }

    match state
        .coupon_repo
        .delete_coupon(&tenant.tenant_id, &code)
        .await
    {
        Ok(()) => json_ok(serde_json::json!({"deleted": true})).into_response(),
        Err(e) => {
            tracing::error!(error = %e, "Failed to delete coupon");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to delete coupon".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

// ============================================================================
// Refunds
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListRefundsQuery {
    #[serde(default = "default_limit")]
    pub limit: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundInfo {
    pub id: String,
    pub transaction_id: String,
    pub amount: f64,
    pub currency: String,
    pub status: String,
    pub reason: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListRefundsResponse {
    pub refunds: Vec<RefundInfo>,
    pub total: i64,
}

/// GET /api/admin/refunds - List pending refunds
pub async fn list_refunds(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(query): Query<ListRefundsQuery>,
) -> impl IntoResponse {
    let limit = cap_limit(query.limit);

    match state
        .store
        .list_pending_refunds(&tenant.tenant_id, limit)
        .await
    {
        Ok(refunds) => {
            let refund_infos: Vec<RefundInfo> = refunds
                .iter()
                .map(|r| {
                    let status = if r.is_processed() {
                        "completed"
                    } else if r.is_denied() {
                        "denied"
                    } else {
                        "pending"
                    };
                    RefundInfo {
                        id: r.id.clone(),
                        transaction_id: r.original_purchase_id.clone(),
                        amount: r.amount.to_major(),
                        currency: r.amount.asset.code.clone(),
                        status: status.to_string(),
                        reason: r.reason.clone(),
                        created_at: r.created_at,
                    }
                })
                .collect();

            let response = ListRefundsResponse {
                total: refund_infos.len() as i64,
                refunds: refund_infos,
            };
            json_ok(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to list refunds");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to list refunds".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// POST /api/admin/refunds/:id/process - Process a pending refund
pub async fn process_refund(
    State(_state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
    // This endpoint is intentionally NOT implemented.
    // Previously it marked a refund as processed without executing the on-chain transaction.
    // Use the signed admin flow under `/paywall/v1/refunds/approve` + `/paywall/v1/refunds/deny`.

    let (_status, body) = error_response(
        ErrorCode::InvalidOperation,
        Some(
            "Refund processing is not supported via /api/admin/refunds/:id/process; use /paywall/v1/refunds/approve or /paywall/v1/refunds/deny"
                .to_string(),
        ),
        Some(serde_json::json!({
            "refundId": id,
            "tenantId": tenant.tenant_id,
        })),
    );
    json_error(StatusCode::NOT_IMPLEMENTED, body).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    use axum::extract::{Path, Query, State};
    use axum::response::IntoResponse;
    use chrono::Duration;
    use http_body_util::BodyExt;

    use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
    use crate::storage::InMemoryStore;

    fn base_create_product_request() -> CreateProductRequest {
        CreateProductRequest {
            id: "p1".to_string(),
            title: None,
            short_description: None,
            slug: None,
            seo_title: None,
            seo_description: None,
            description: "desc".to_string(),
            tags: Vec::new(),
            category_ids: Vec::new(),
            images: Vec::new(),
            featured: false,
            sort_order: None,
            shipping_profile: None,
            checkout_requirements: None,
            fulfillment: None,
            fiat_amount_cents: None,
            fiat_currency: None,
            compare_at_fiat_amount_cents: None,
            compare_at_fiat_currency: None,
            stripe_price_id: None,
            crypto_atomic_amount: None,
            crypto_token: None,
            inventory_status: None,
            inventory_quantity: None,
            inventory_policy: None,
            variants: Vec::new(),
            active: true,
            metadata: HashMap::new(),
        }
    }

    #[test]
    fn test_cap_limit() {
        assert_eq!(cap_limit(0), 1);
        assert_eq!(cap_limit(-5), 1);
        assert_eq!(cap_limit(50), 50);
        assert_eq!(cap_limit(1500), MAX_LIST_LIMIT);
    }

    #[test]
    fn test_parse_purchase_amount() {
        let (amount, currency, method) = parse_purchase_amount("1000000 USDC");
        assert_eq!(amount, 1000000.0);
        assert_eq!(currency, "USDC");
        assert_eq!(method, "x402");

        let (amount, currency, method) = parse_purchase_amount("500 USD");
        assert_eq!(amount, 500.0);
        assert_eq!(currency, "USD");
        assert_eq!(method, "stripe");
    }

    #[test]
    fn test_validate_product_checkout_fields_accepts_valid_values() {
        let mut req = base_create_product_request();
        req.shipping_profile = Some("digital".to_string());
        req.checkout_requirements = Some(crate::models::CheckoutRequirements {
            email: Some("required".to_string()),
            name: Some("optional".to_string()),
            phone: Some("none".to_string()),
            shipping_address: Some(false),
            billing_address: Some(false),
        });
        req.fulfillment = Some(crate::models::FulfillmentInfo {
            r#type: "digital_download".to_string(),
            notes: None,
        });

        assert!(validate_product_checkout_fields(&req).is_ok());
    }

    #[test]
    fn test_validate_product_checkout_fields_rejects_invalid_enum() {
        let mut req = base_create_product_request();
        req.shipping_profile = Some("weird".to_string());

        assert!(validate_product_checkout_fields(&req).is_err());
    }

    #[tokio::test]
    async fn test_process_refund_is_not_implemented_and_does_not_modify_refund() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let tenant = TenantContext::default();
        let now = Utc::now();
        let refund = crate::models::RefundQuote {
            id: "r1".to_string(),
            tenant_id: tenant.tenant_id.clone(),
            original_purchase_id: "tx1".to_string(),
            recipient_wallet: "recipient".to_string(),
            amount: Money::from_major(get_asset("USDC").unwrap(), 1.0),
            reason: None,
            metadata: HashMap::new(),
            created_at: now,
            expires_at: now + Duration::minutes(10),
            processed_by: None,
            processed_at: None,
            signature: None,
        };

        store.store_refund_quote(refund).await.unwrap();

        let resp = super::process_refund(State(state), tenant.clone(), Path("r1".to_string()))
            .await
            .into_response();
        assert_eq!(resp.status(), StatusCode::NOT_IMPLEMENTED);

        let stored = store
            .get_refund_quote(&tenant.tenant_id, "r1")
            .await
            .unwrap()
            .unwrap();
        assert!(!stored.is_finalized());
    }

    #[tokio::test]
    async fn test_create_product_persists_seo_fields() {
        let tenant = TenantContext::default();
        let store = Arc::new(InMemoryStore::new());
        let product_repo = Arc::new(InMemoryProductRepository::new(Vec::new()));
        let state = Arc::new(AdminState {
            store,
            product_repo: product_repo.clone(),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let mut req = base_create_product_request();
        req.seo_title = Some("SEO Title".to_string());
        req.seo_description = Some("SEO Description".to_string());

        let resp = super::create_product(State(state), tenant.clone(), Json(req))
            .await
            .into_response();
        assert_eq!(resp.status(), StatusCode::OK);

        let stored = product_repo
            .get_product(&tenant.tenant_id, "p1")
            .await
            .unwrap();
        assert_eq!(stored.seo_title.as_deref(), Some("SEO Title"));
        assert_eq!(stored.seo_description.as_deref(), Some("SEO Description"));
    }

    #[tokio::test]
    async fn test_update_product_clears_seo_fields() {
        let tenant = TenantContext::default();
        let store = Arc::new(InMemoryStore::new());
        let product = Product {
            id: "p1".to_string(),
            tenant_id: tenant.tenant_id.clone(),
            description: "desc".to_string(),
            seo_title: Some("SEO Title".to_string()),
            seo_description: Some("SEO Description".to_string()),
            active: true,
            created_at: Some(Utc::now()),
            ..Default::default()
        };
        let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));
        let state = Arc::new(AdminState {
            store,
            product_repo: product_repo.clone(),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let mut req = base_create_product_request();
        req.id = "p1".to_string();
        req.seo_title = None;
        req.seo_description = None;

        let resp = super::update_product(
            State(state),
            tenant.clone(),
            Path("p1".to_string()),
            Json(req),
        )
        .await
        .into_response();
        assert_eq!(resp.status(), StatusCode::OK);

        let stored = product_repo
            .get_product(&tenant.tenant_id, "p1")
            .await
            .unwrap();
        assert!(stored.seo_title.is_none());
        assert!(stored.seo_description.is_none());
    }

    #[tokio::test]
    async fn test_admin_list_products_includes_inactive_and_returns_total_count() {
        let tenant = TenantContext::default();
        let store = Arc::new(InMemoryStore::new());

        let p1 = Product {
            id: "p1".to_string(),
            tenant_id: tenant.tenant_id.clone(),
            description: "desc".to_string(),
            active: true,
            created_at: Some(Utc::now()),
            ..Default::default()
        };

        let p2 = Product {
            id: "p2".to_string(),
            tenant_id: tenant.tenant_id.clone(),
            description: "desc".to_string(),
            active: false,
            created_at: Some(Utc::now()),
            ..Default::default()
        };

        let state = Arc::new(AdminState {
            store,
            product_repo: Arc::new(InMemoryProductRepository::new(vec![p1, p2])),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let resp = super::list_products(
            State(state),
            tenant,
            Query(ListProductsQuery {
                limit: 50,
                offset: 0,
            }),
        )
        .await
        .into_response();
        assert_eq!(resp.status(), StatusCode::OK);

        let body = resp.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["total"], 2);
        let products = json["products"].as_array().unwrap();
        assert_eq!(products.len(), 2);
        assert!(products
            .iter()
            .any(|p| p["active"].as_bool() == Some(false)));
    }

    #[tokio::test]
    async fn test_set_product_inventory_updates_quantity() {
        let tenant = TenantContext::default();
        let store = Arc::new(InMemoryStore::new());

        let product = Product {
            id: "p1".to_string(),
            tenant_id: tenant.tenant_id.clone(),
            description: "desc".to_string(),
            active: true,
            inventory_quantity: Some(10),
            ..Default::default()
        };
        let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));

        let state = Arc::new(AdminState {
            store,
            product_repo: product_repo.clone(),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let resp = super::set_product_inventory(
            State(state),
            tenant.clone(),
            Path("p1".to_string()),
            Json(SetInventoryRequest { quantity: Some(3) }),
        )
        .await
        .into_response();
        assert_eq!(resp.status(), StatusCode::OK);

        let updated = product_repo
            .get_product(&tenant.tenant_id, "p1")
            .await
            .unwrap();
        assert_eq!(updated.inventory_quantity, Some(3));
    }

    #[tokio::test]
    async fn test_adjust_product_inventory_updates_quantity() {
        let tenant = TenantContext::default();
        let store = Arc::new(InMemoryStore::new());

        let product = Product {
            id: "p1".to_string(),
            tenant_id: tenant.tenant_id.clone(),
            description: "desc".to_string(),
            active: true,
            inventory_quantity: Some(10),
            ..Default::default()
        };
        let product_repo = Arc::new(InMemoryProductRepository::new(vec![product]));

        let state = Arc::new(AdminState {
            store,
            product_repo: product_repo.clone(),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let resp = super::adjust_product_inventory(
            State(state),
            tenant.clone(),
            Path("p1".to_string()),
            Json(AdjustInventoryRequest {
                delta: -2,
                reason: None,
                actor: None,
            }),
        )
        .await
        .into_response();
        assert_eq!(resp.status(), StatusCode::OK);

        let updated = product_repo
            .get_product(&tenant.tenant_id, "p1")
            .await
            .unwrap();
        assert_eq!(updated.inventory_quantity, Some(8));
    }
}
