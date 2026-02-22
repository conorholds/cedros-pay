//! Admin coupon CRUD handlers

use std::collections::HashMap;
use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin::AdminState;
use crate::handlers::admin_coupons_stripe::{
    stripe_ids_for_create_coupon, stripe_ids_for_update_coupon,
};
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;
use crate::models::Coupon;

use super::cap_limit;

fn default_limit() -> i32 {
    20
}

fn default_active() -> bool {
    true
}

fn default_scope() -> String {
    "all".to_string()
}

// ============================================================================
// Types
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

// ============================================================================
// Validation helpers
// ============================================================================

fn validate_discount_type(discount_type: &str) -> Result<(), axum::response::Response> {
    if discount_type != "percentage" && discount_type != "fixed" {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("discount_type must be 'percentage' or 'fixed'".to_string()),
            None,
        );
        return Err(json_error(status, body).into_response());
    }
    Ok(())
}

fn validate_discount_value(
    discount_type: &str,
    discount_value: f64,
) -> Result<(), axum::response::Response> {
    if discount_value <= 0.0 {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("discount_value must be positive".to_string()),
            None,
        );
        return Err(json_error(status, body).into_response());
    }
    if discount_type == "percentage" && discount_value > 100.0 {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("percentage discount_value cannot exceed 100".to_string()),
            None,
        );
        return Err(json_error(status, body).into_response());
    }
    Ok(())
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /api/admin/coupons - List coupons with pagination
pub async fn list_coupons(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(query): Query<ListCouponsQuery>,
) -> impl IntoResponse {
    let limit = cap_limit(query.limit) as usize;
    let offset = query.offset.max(0) as usize;

    match state.coupon_repo.list_coupons_paginated(&tenant.tenant_id, limit, offset).await {
        Ok((coupons, total)) => {
            let page: Vec<AdminCouponInfo> = coupons
                .iter()
                .map(AdminCouponInfo::from)
                .collect();
            let response = ListCouponsResponse {
                total,
                coupons: page,
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

/// POST /api/admin/coupons - Create a new coupon
pub async fn create_coupon(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Json(req): Json<CreateCouponRequest>,
) -> impl IntoResponse {
    let discount_type = req.discount_type.to_lowercase();
    if let Err(resp) = validate_discount_type(&discount_type) {
        return resp;
    }
    if let Err(resp) = validate_discount_value(&discount_type, req.discount_value) {
        return resp;
    }

    let (stripe_coupon_id, stripe_promotion_code_id) =
        if let Some(ref stripe_client) = state.stripe_client {
            match stripe_ids_for_create_coupon(
                stripe_client,
                &req.code,
                &tenant.tenant_id,
                &discount_type,
                req.discount_value,
                req.currency.as_deref(),
                req.minimum_amount_cents,
                req.first_purchase_only,
            )
            .await
            {
                Ok(ids) => ids,
                Err(resp) => return resp,
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

    let discount_type = req.discount_type.to_lowercase();
    if let Err(resp) = validate_discount_type(&discount_type) {
        return resp;
    }
    if let Err(resp) = validate_discount_value(&discount_type, req.discount_value) {
        return resp;
    }

    let deactivate = !req.active && existing.active;

    let (stripe_coupon_id, stripe_promotion_code_id) =
        if let Some(ref stripe_client) = state.stripe_client {
            match stripe_ids_for_update_coupon(
                stripe_client,
                &existing,
                &code,
                &tenant.tenant_id,
                &discount_type,
                req.discount_value,
                req.currency.as_deref(),
                req.minimum_amount_cents,
                req.first_purchase_only,
                deactivate,
            )
            .await
            {
                Ok(ids) => ids,
                Err(resp) => return resp,
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
