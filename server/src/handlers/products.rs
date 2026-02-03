use std::sync::Arc;

use axum::{
    extract::Path,
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::response::{json_error, json_ok_cached};
use crate::constants::PRODUCTS_CACHE_MAX_AGE;
use crate::middleware::tenant::TenantContext;
use crate::repositories::{CouponRepository, ProductRepository, ProductRepositoryError};
use crate::storage::Store;

// ─────────────────────────────────────────────────────────────────────────────
// Request/Response types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductsResponse {
    pub products: Vec<ProductInfo>,
    pub checkout_stripe_coupons: Vec<CouponInfo>,
    pub checkout_crypto_coupons: Vec<CouponInfo>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductInfo {
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
    /// Primary image URL convenience field.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fulfillment_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fulfillment_notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fiat_amount: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fiat_amount_cents: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compare_at_fiat_amount: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compare_at_amount_cents: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub effective_fiat_amount: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub effective_fiat_amount_cents: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fiat_currency: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compare_at_fiat_currency: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_price_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub crypto_amount: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub effective_crypto_amount: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub crypto_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_quantity: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_policy: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub variants: Vec<crate::models::ProductVariant>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CouponInfo {
    pub code: String,
    pub discount_type: String,
    pub discount_value: f64,
    pub currency: String,
    pub description: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateCouponRequest {
    pub code: String,
    pub product_ids: Option<Vec<String>>,
    pub payment_method: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProductsQuery {
    #[serde(default = "default_limit")]
    pub limit: i32,
    pub offset: Option<i32>,
    #[serde(default)]
    pub collection_id: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateCouponResponse {
    pub valid: bool,
    pub code: String,
    pub discount_type: String,
    pub discount_value: f64,
    pub scope: String,
    pub applicable_products: Vec<String>,
    pub payment_method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remaining_uses: Option<i32>,
    pub error: String,
}

/// Products state with coupon repository
pub struct ProductsAppState {
    pub store: Arc<dyn Store>,
    pub product_repo: Arc<dyn ProductRepository>,
    pub coupon_repo: Arc<dyn CouponRepository>,
}

/// Maximum limit for list queries to prevent resource exhaustion
const MAX_LIST_LIMIT: i32 = 1000;

fn default_limit() -> i32 {
    100
}

fn cap_limit(limit: i32) -> i32 {
    limit.clamp(1, MAX_LIST_LIMIT)
}

fn remaining_uses(limit: Option<i32>, usage_count: i32) -> Option<i32> {
    limit.map(|m| if usage_count >= m { 0 } else { m - usage_count })
}

fn product_to_info(p: &crate::models::Product) -> ProductInfo {
    let fiat_amount = p.fiat_price.as_ref().map(|m| m.to_major());
    let fiat_currency = p.fiat_price.as_ref().map(|m| m.asset.code.clone());
    let fiat_amount_cents = p.fiat_price.as_ref().map(|m| m.atomic);

    let compare_at_fiat_amount = p.compare_at_fiat_price.as_ref().map(|m| m.to_major());
    let compare_at_amount_cents = p.compare_at_fiat_price.as_ref().map(|m| m.atomic);
    let compare_at_fiat_currency = p
        .compare_at_fiat_price
        .as_ref()
        .map(|m| m.asset.code.clone());

    let crypto_amount = p.crypto_price.as_ref().map(|m| m.to_major());
    let crypto_token = p.crypto_price.as_ref().map(|m| m.asset.code.clone());

    let image_url = p
        .images
        .first()
        .map(|img| img.url.clone())
        .or_else(|| p.metadata.get("image_url").cloned());
    let (fulfillment_type, fulfillment_notes) = match &p.fulfillment {
        Some(f) => (Some(f.r#type.clone()), f.notes.clone()),
        None => (None, None),
    };

    ProductInfo {
        id: p.id.clone(),
        title: p.title.clone(),
        short_description: p.short_description.clone(),
        slug: p.slug.clone(),
        seo_title: p.seo_title.clone(),
        seo_description: p.seo_description.clone(),
        image_url,
        description: p.description.clone(),
        tags: p.tags.clone(),
        category_ids: p.category_ids.clone(),
        images: p.images.clone(),
        featured: p.featured,
        sort_order: p.sort_order,
        shipping_profile: p.shipping_profile.clone(),
        checkout_requirements: p.checkout_requirements.clone(),
        fulfillment: p.fulfillment.clone(),
        fulfillment_type,
        fulfillment_notes,
        fiat_amount,
        fiat_amount_cents,
        compare_at_fiat_amount,
        compare_at_amount_cents,
        effective_fiat_amount: fiat_amount,
        effective_fiat_amount_cents: fiat_amount_cents,
        fiat_currency,
        compare_at_fiat_currency,
        stripe_price_id: p.stripe_price_id.clone(),
        crypto_amount,
        effective_crypto_amount: crypto_amount,
        crypto_token,
        inventory_status: p.inventory_status.clone(),
        inventory_quantity: p.inventory_quantity,
        inventory_policy: p.inventory_policy.clone(),
        variants: p.variants.clone(),
        metadata: serde_json::to_value(&p.metadata).unwrap_or_default(),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// GET /paywall/v1/products - List all products
pub async fn list_products(
    State(state): State<Arc<ProductsAppState>>,
    tenant: TenantContext,
    Query(query): Query<ListProductsQuery>,
) -> impl IntoResponse {
    let limit = cap_limit(query.limit) as usize;
    let offset = query.offset.unwrap_or(0).max(0) as usize;

    let products_result = if let Some(ref collection_id) = query.collection_id {
        if let Err(e) = crate::errors::validation::validate_resource_id(collection_id) {
            let (status, error_body) = crate::errors::error_response(
                crate::errors::ErrorCode::InvalidResource,
                Some(e.message),
                None,
            );
            return json_error(status, error_body).into_response();
        }

        match state
            .store
            .get_collection(&tenant.tenant_id, collection_id)
            .await
        {
            Ok(Some(collection)) => {
                if !collection.active {
                    Ok(Vec::new())
                } else {
                    let result: Result<Vec<crate::models::Product>, ProductRepositoryError> =
                        async {
                            let mut ordered_active: Vec<crate::models::Product> = Vec::new();
                            let target_len = offset + limit;
                            let mut start = 0usize;
                            let chunk_size = limit.max(1);

                            while start < collection.product_ids.len()
                                && ordered_active.len() < target_len
                            {
                                let end = (start + chunk_size).min(collection.product_ids.len());
                                let batch_ids = &collection.product_ids[start..end];
                                let items = state
                                    .product_repo
                                    .get_products_by_ids(&tenant.tenant_id, batch_ids)
                                    .await
                                    .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;
                                let mut by_id = std::collections::HashMap::new();
                                for product in items {
                                    if product.active {
                                        by_id.insert(product.id.clone(), product);
                                    }
                                }
                                for id in batch_ids {
                                    if let Some(product) = by_id.remove(id) {
                                        ordered_active.push(product);
                                        if ordered_active.len() >= target_len {
                                            break;
                                        }
                                    }
                                }
                                start = end;
                            }

                            if offset >= ordered_active.len() {
                                Ok(Vec::new())
                            } else {
                                let end = (offset + limit).min(ordered_active.len());
                                Ok(ordered_active[offset..end].to_vec())
                            }
                        }
                        .await;
                    result
                }
            }
            Ok(None) => Ok(Vec::new()),
            Err(e) => Err(ProductRepositoryError::Storage(e.to_string())),
        }
    } else {
        state
            .product_repo
            .list_products_paginated(&tenant.tenant_id, limit, offset)
            .await
    };

    match products_result {
        Ok(products) => {
            let product_infos: Vec<ProductInfo> = products.iter().map(product_to_info).collect();

            let resp = ProductsResponse {
                products: product_infos,
                checkout_stripe_coupons: Vec::new(),
                checkout_crypto_coupons: Vec::new(),
            };
            // Cache products - they don't change often
            json_ok_cached(resp, PRODUCTS_CACHE_MAX_AGE).into_response()
        }
        Err(e) => {
            // Use proper HTTP status code and error format per spec 15-errors.md
            tracing::error!(error = %e, "Failed to list products");
            let (status, error_body) =
                crate::errors::error_response(crate::errors::ErrorCode::InternalError, None, None);
            json_error(status, error_body).into_response()
        }
    }
}

/// GET /paywall/v1/products/:id - Get active product by ID
pub async fn get_product(
    State(state): State<Arc<ProductsAppState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
    if let Err(e) = crate::errors::validation::validate_resource_id(&id) {
        let (status, error_body) = crate::errors::error_response(
            crate::errors::ErrorCode::InvalidResource,
            Some(e.message),
            None,
        );
        return json_error(status, error_body).into_response();
    }

    match state.product_repo.get_product(&tenant.tenant_id, &id).await {
        Ok(p) => {
            if !p.active {
                let (status, error_body) = crate::errors::error_response(
                    crate::errors::ErrorCode::ProductNotFound,
                    Some("product not available".to_string()),
                    None,
                );
                return json_error(status, error_body).into_response();
            }
            json_ok_cached(product_to_info(&p), PRODUCTS_CACHE_MAX_AGE).into_response()
        }
        Err(ProductRepositoryError::NotFound) => {
            let (status, error_body) = crate::errors::error_response(
                crate::errors::ErrorCode::ProductNotFound,
                Some("product not found".to_string()),
                None,
            );
            json_error(status, error_body).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, product_id = %id, "Failed to get product");
            let (status, error_body) =
                crate::errors::error_response(crate::errors::ErrorCode::InternalError, None, None);
            json_error(status, error_body).into_response()
        }
    }
}

/// GET /paywall/v1/products/by-slug/:slug - Get active product by slug
pub async fn get_product_by_slug(
    State(state): State<Arc<ProductsAppState>>,
    tenant: TenantContext,
    Path(slug): Path<String>,
) -> impl IntoResponse {
    if slug.is_empty() || slug.len() > 200 || slug.contains('/') {
        let (status, error_body) = crate::errors::error_response(
            crate::errors::ErrorCode::InvalidField,
            Some("invalid slug".to_string()),
            None,
        );
        return json_error(status, error_body).into_response();
    }

    match state
        .product_repo
        .get_product_by_slug(&tenant.tenant_id, &slug)
        .await
    {
        Ok(p) => json_ok_cached(product_to_info(&p), PRODUCTS_CACHE_MAX_AGE).into_response(),
        Err(ProductRepositoryError::NotFound) => {
            let (status, error_body) = crate::errors::error_response(
                crate::errors::ErrorCode::ProductNotFound,
                Some("product not found".to_string()),
                None,
            );
            json_error(status, error_body).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, slug = %slug, "Failed to get product by slug");
            let (status, error_body) =
                crate::errors::error_response(crate::errors::ErrorCode::InternalError, None, None);
            json_error(status, error_body).into_response()
        }
    }
}

/// POST /paywall/v1/coupons/validate - Validate a coupon code
pub async fn validate_coupon(
    State(state): State<Arc<ProductsAppState>>,
    tenant: TenantContext,
    Json(req): Json<ValidateCouponRequest>,
) -> impl IntoResponse {
    let coupon_result = state
        .coupon_repo
        .get_coupon(&tenant.tenant_id, &req.code)
        .await;

    match coupon_result {
        Ok(coupon) => {
            let now = Utc::now();
            let is_expired = coupon.expires_at.map(|e| e < now).unwrap_or(false);
            // Per spec 17-validation.md: check starts_at - coupon not valid before start date
            let is_not_started = coupon.starts_at.map(|s| s > now).unwrap_or(false);
            let is_active = coupon.active;
            let has_uses = coupon
                .usage_limit
                .map(|m| coupon.usage_count < m)
                .unwrap_or(true);

            // Check payment method compatibility
            let pm_ok = if let Some(ref pm) = req.payment_method {
                coupon.payment_method.is_empty() || coupon.payment_method.eq_ignore_ascii_case(pm)
            } else {
                true
            };

            // Check product applicability
            let products_ok = if let Some(ref pids) = req.product_ids {
                if coupon.scope.eq_ignore_ascii_case("all") {
                    true
                } else {
                    pids.iter().all(|pid| {
                        coupon
                            .product_ids
                            .iter()
                            .any(|cpid| cpid.eq_ignore_ascii_case(pid))
                    })
                }
            } else {
                true
            };

            let valid =
                is_active && !is_expired && !is_not_started && has_uses && pm_ok && products_ok;
            let error = if !is_active {
                "coupon_inactive"
            } else if is_expired {
                "coupon_expired"
            } else if is_not_started {
                "coupon_not_started"
            } else if !has_uses {
                "coupon_exhausted"
            } else if !pm_ok {
                "coupon_wrong_payment_method"
            } else if !products_ok {
                "coupon_not_applicable"
            } else {
                ""
            };

            let resp = ValidateCouponResponse {
                valid,
                code: coupon.code.clone(),
                discount_type: coupon.discount_type.to_string(),
                discount_value: coupon.discount_value,
                scope: coupon.scope.clone(),
                applicable_products: coupon.product_ids.clone(),
                payment_method: coupon.payment_method.clone(),
                expires_at: coupon.expires_at,
                remaining_uses: remaining_uses(coupon.usage_limit, coupon.usage_count),
                error: error.to_string(),
            };
            (StatusCode::OK, Json(resp))
        }
        Err(_) => {
            let resp = ValidateCouponResponse {
                valid: false,
                code: req.code.clone(),
                discount_type: String::new(),
                discount_value: 0.0,
                scope: String::new(),
                applicable_products: Vec::new(),
                payment_method: String::new(),
                expires_at: None,
                remaining_uses: None,
                error: "coupon_not_found".to_string(),
            };
            // Return 404 Not Found for non-existent coupons per HTTP semantics
            (StatusCode::NOT_FOUND, Json(resp))
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// LLM-Friendly Product Catalog
// ─────────────────────────────────────────────────────────────────────────────

/// GET /products.txt - LLM-friendly product catalog
/// Returns all active products in a structured plain text format optimized for
/// LLMs, AI agents, and recommendation engines.
pub async fn products_txt(
    State(state): State<Arc<ProductsAppState>>,
    tenant: TenantContext,
) -> impl IntoResponse {
    // Fetch all active products
    let products = match state.product_repo.list_products(&tenant.tenant_id).await {
        Ok(products) => products,
        Err(e) => {
            tracing::error!(error = %e, "Failed to fetch products for products.txt");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                [(
                    axum::http::header::CONTENT_TYPE,
                    "text/plain; charset=utf-8",
                )],
                "# Error\n\nFailed to load product catalog.".to_string(),
            );
        }
    };

    let mut output = String::new();

    // Header
    output.push_str("# Product Catalog\n\n");
    output.push_str(&format!(
        "Generated: {}\n",
        chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
    ));
    output.push_str(&format!("Total Products: {}\n\n", products.len()));
    output.push_str("---\n\n");

    // Products
    for product in &products {
        // Product name
        let name = product.title.as_deref().unwrap_or(&product.id);
        output.push_str(&format!("## {}\n\n", name));

        // ID and slug for API reference
        output.push_str(&format!("- ID: {}\n", product.id));
        if let Some(ref slug) = product.slug {
            output.push_str(&format!("- Slug: {}\n", slug));
        }

        // Short description
        if let Some(ref short_desc) = product.short_description {
            output.push_str(&format!("- Summary: {}\n", short_desc));
        }

        // Full description
        if !product.description.is_empty() {
            output.push_str(&format!(
                "- Description: {}\n",
                product.description.replace('\n', " ")
            ));
        }

        // Pricing
        if let Some(ref fiat) = product.fiat_price {
            let price = fiat.to_major();
            output.push_str(&format!("- Price: {:.2} {}\n", price, fiat.asset.code));
            if let Some(ref compare) = product.compare_at_fiat_price {
                let original = compare.to_major();
                if original > price {
                    let discount_pct = ((original - price) / original * 100.0).round();
                    output.push_str(&format!(
                        "- Original Price: {:.2} {} ({}% off)\n",
                        original, compare.asset.code, discount_pct
                    ));
                }
            }
        }
        if let Some(ref crypto) = product.crypto_price {
            output.push_str(&format!(
                "- Crypto Price: {:.6} {}\n",
                crypto.to_major(),
                crypto.asset.code
            ));
        }

        // Inventory
        match (&product.inventory_status, product.inventory_quantity) {
            (Some(status), Some(qty)) => {
                output.push_str(&format!("- Stock: {} ({} available)\n", status, qty));
            }
            (Some(status), None) => {
                output.push_str(&format!("- Stock: {}\n", status));
            }
            (None, Some(qty)) => {
                output.push_str(&format!("- Stock: {} available\n", qty));
            }
            (None, None) => {
                output.push_str("- Stock: In stock\n");
            }
        }
        if let Some(ref policy) = product.inventory_policy {
            if policy == "allow_backorder" {
                output.push_str("- Backorders: Allowed\n");
            }
        }

        // Tags and categories
        if !product.tags.is_empty() {
            output.push_str(&format!("- Tags: {}\n", product.tags.join(", ")));
        }
        if !product.category_ids.is_empty() {
            output.push_str(&format!(
                "- Categories: {}\n",
                product.category_ids.join(", ")
            ));
        }

        // Fulfillment
        if let Some(ref fulfillment) = product.fulfillment {
            output.push_str(&format!("- Fulfillment: {}\n", fulfillment.r#type));
        }

        // Subscription info
        if product.is_subscription() {
            if let Some(ref sub) = product.subscription {
                output.push_str(&format!(
                    "- Subscription: {} {}\n",
                    sub.billing_interval, sub.billing_period
                ));
                if sub.trial_days > 0 {
                    output.push_str(&format!("- Trial: {} days\n", sub.trial_days));
                }
            }
        }

        // Featured flag
        if product.featured {
            output.push_str("- Featured: Yes\n");
        }

        // Variants
        if !product.variants.is_empty() {
            output.push_str(&format!("- Variants: {} options\n", product.variants.len()));
            for variant in &product.variants {
                let variant_name = if variant.title.is_empty() {
                    &variant.id
                } else {
                    &variant.title
                };
                let variant_price = variant
                    .price
                    .as_ref()
                    .and_then(|p| {
                        p.amount.map(|amt| {
                            let currency = p.currency.as_deref().unwrap_or("USD");
                            format!("{:.2} {}", amt, currency)
                        })
                    })
                    .unwrap_or_else(|| "same as base".to_string());
                let variant_stock = match variant.inventory_quantity {
                    Some(qty) => format!("{} available", qty),
                    None => "in stock".to_string(),
                };
                output.push_str(&format!(
                    "  - {}: {} ({})\n",
                    variant_name, variant_price, variant_stock
                ));
            }
        }

        output.push_str("\n---\n\n");
    }

    // Footer with usage hints for LLMs
    output.push_str("## API Reference\n\n");
    output.push_str("To purchase or get more details:\n");
    output.push_str("- GET /paywall/v1/products/{id} - Get full product details\n");
    output.push_str("- GET /paywall/v1/products/by-slug/{slug} - Get product by slug\n");
    output.push_str("- POST /paywall/v1/cart/quote - Create a cart with products\n");

    (
        StatusCode::OK,
        [(
            axum::http::header::CONTENT_TYPE,
            "text/plain; charset=utf-8",
        )],
        output,
    )
}

#[cfg(test)]
mod tests {
    include!("products_tests.inc.rs");
}
