//! Admin product CRUD handlers

use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use chrono::Utc;

use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin::{AdminProductInfo, AdminState, ListProductsResponse};
use crate::handlers::admin_products_stripe::{stripe_ids_for_create, stripe_ids_for_update};
use crate::handlers::admin_products_types::{
    resolve_crypto, resolve_fiat, validate_product_checkout_fields, AdjustInventoryRequest,
    CreateProductRequest, ListProductsQuery, SetInventoryRequest,
};
use crate::handlers::cap_limit;
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;
use crate::models::Product;

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

/// POST /api/admin/products - Create a new product
pub async fn create_product(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Json(req): Json<CreateProductRequest>,
) -> impl IntoResponse {
    if let Err((status, body)) = validate_product_checkout_fields(&req) {
        return json_error(status, body).into_response();
    }

    let fiat_price = match resolve_fiat(req.fiat_amount_cents, req.fiat_currency.as_deref()) {
        Ok(v) => v,
        Err((status, body)) => return json_error(status, body).into_response(),
    };
    let compare_at_fiat_price = match resolve_fiat(
        req.compare_at_fiat_amount_cents,
        req.compare_at_fiat_currency.as_deref(),
    ) {
        Ok(v) => v,
        Err((status, body)) => return json_error(status, body).into_response(),
    };
    let crypto_price =
        match resolve_crypto(req.crypto_atomic_amount, req.crypto_token.as_deref()) {
            Ok(v) => v,
            Err((status, body)) => return json_error(status, body).into_response(),
        };

    // Auto-create Stripe product/price if fiat price exists but no stripe_price_id provided
    let stripe_name = req.title.as_deref().unwrap_or(&req.id);

    let (stripe_product_id, stripe_price_id) =
        if let (Some(amount_cents), None, Some(stripe_client)) = (
            req.fiat_amount_cents,
            req.stripe_price_id.as_ref(),
            state.stripe_client.as_ref(),
        ) {
            let currency = req.fiat_currency.as_deref().unwrap_or("usd");
            match stripe_ids_for_create(
                stripe_client,
                &req.id,
                &tenant.tenant_id,
                stripe_name,
                &req.description,
                amount_cents,
                currency,
                req.metadata.clone(),
            )
            .await
            {
                Ok(ids) => ids,
                Err(resp) => return resp,
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

    let fiat_price = match resolve_fiat(req.fiat_amount_cents, req.fiat_currency.as_deref()) {
        Ok(v) => v,
        Err((status, body)) => return json_error(status, body).into_response(),
    };
    let compare_at_fiat_price = match resolve_fiat(
        req.compare_at_fiat_amount_cents,
        req.compare_at_fiat_currency.as_deref(),
    ) {
        Ok(v) => v,
        Err((status, body)) => return json_error(status, body).into_response(),
    };
    let crypto_price =
        match resolve_crypto(req.crypto_atomic_amount, req.crypto_token.as_deref()) {
            Ok(v) => v,
            Err((status, body)) => return json_error(status, body).into_response(),
        };

    // Determine Stripe product/price IDs
    let stripe_name = req.title.as_deref().unwrap_or(&id);

    let (stripe_product_id, stripe_price_id) = if let Some(ref stripe_client) = state.stripe_client
    {
        match stripe_ids_for_update(
            stripe_client,
            &id,
            &tenant.tenant_id,
            stripe_name,
            &req.description,
            req.fiat_amount_cents,
            req.fiat_currency.as_deref(),
            req.stripe_price_id.clone(),
            existing.stripe_product_id.as_deref(),
            existing.stripe_price_id.clone(),
            req.metadata.clone(),
        )
        .await
        {
            Ok(ids) => ids,
            Err(resp) => return resp,
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

/// POST /api/admin/products/:id/inventory/adjust - Adjust tracked inventory quantity
pub async fn adjust_product_inventory(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
    Json(req): Json<AdjustInventoryRequest>,
) -> impl IntoResponse {
    // Atomic adjustment prevents read-compute-write race (B-09)
    let (current, next) = match state
        .store
        .adjust_inventory_atomic(&tenant.tenant_id, &id, req.delta)
        .await
    {
        Ok(result) => result,
        Err(crate::storage::StorageError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("Product not found".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
        Err(crate::storage::StorageError::Validation(msg)) => {
            let code = if msg.contains("not tracked") {
                ErrorCode::InvalidOperation
            } else {
                ErrorCode::InvalidField
            };
            let (status, body) = error_response(code, Some(msg), None);
            return json_error(status, body).into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, product_id = %id, "Failed to adjust product inventory");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to update inventory".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    // Record adjustment for audit trail (best-effort)
    let now = Utc::now();
    let adjustment = crate::models::InventoryAdjustment {
        id: uuid::Uuid::new_v4().to_string(),
        tenant_id: tenant.tenant_id.clone(),
        product_id: id.clone(),
        variant_id: None,
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

    // Fetch updated product for response
    match state.product_repo.get_product(&tenant.tenant_id, &id).await {
        Ok(product) => json_ok(AdminProductInfo::from(&product)).into_response(),
        Err(e) => {
            tracing::error!(error = %e, product_id = %id, "Failed to fetch product after adjustment");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Inventory adjusted but failed to fetch updated product".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    include!("admin_products_tests.inc.rs");
}
