//! Admin shipping profile/rate handlers

use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin::AdminState;
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;
use crate::models::{ShippingProfile, ShippingRate};

use super::cap_limit_opt;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListQuery {
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProfileRequest {
    pub id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub countries: Vec<String>,
    #[serde(default = "default_active")]
    pub active: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProfileRequest {
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub countries: Vec<String>,
    #[serde(default = "default_active")]
    pub active: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRateRequest {
    pub id: Option<String>,
    pub name: String,
    pub rate_type: String,
    pub amount_atomic: i64,
    pub currency: String,
    pub min_subtotal: Option<i64>,
    pub max_subtotal: Option<i64>,
    #[serde(default = "default_active")]
    pub active: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRateRequest {
    pub name: String,
    pub rate_type: String,
    pub amount_atomic: i64,
    pub currency: String,
    pub min_subtotal: Option<i64>,
    pub max_subtotal: Option<i64>,
    #[serde(default = "default_active")]
    pub active: bool,
    pub profile_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProfilesResponse {
    pub profiles: Vec<ShippingProfile>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListRatesResponse {
    pub rates: Vec<ShippingRate>,
}

fn default_active() -> bool {
    true
}

fn normalize_countries(mut countries: Vec<String>) -> Result<Vec<String>, String> {
    if countries.is_empty() {
        return Err("countries must not be empty".to_string());
    }
    for c in &mut countries {
        *c = c.trim().to_uppercase();
        if c.len() != 2 || !c.chars().all(|ch| ch.is_ascii_alphabetic()) {
            return Err(format!("invalid country code: {c}"));
        }
    }
    countries.sort();
    countries.dedup();
    Ok(countries)
}

fn validate_rate_type(rate_type: &str) -> bool {
    matches!(rate_type, "flat" | "price" | "weight")
}

pub async fn list_profiles(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(params): Query<ListQuery>,
) -> impl IntoResponse {
    let limit = cap_limit_opt(params.limit, 50);
    let offset = params.offset.unwrap_or(0).max(0);
    match state
        .store
        .list_shipping_profiles(&tenant.tenant_id, limit, offset)
        .await
    {
        Ok(profiles) => json_ok(ListProfilesResponse { profiles }),
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to list shipping profiles: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn get_profile(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state
        .store
        .get_shipping_profile(&tenant.tenant_id, &id)
        .await
    {
        Ok(Some(profile)) => json_ok(profile),
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("shipping profile not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to load shipping profile: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn create_profile(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Json(req): Json<CreateProfileRequest>,
) -> impl IntoResponse {
    let countries = match normalize_countries(req.countries) {
        Ok(c) => c,
        Err(msg) => {
            let (status, body) = error_response(
                ErrorCode::InvalidField,
                Some(msg),
                Some(serde_json::json!({ "field": "countries" })),
            );
            return json_error(status, body);
        }
    };

    let now = Utc::now();
    let profile = ShippingProfile {
        id: req.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
        tenant_id: tenant.tenant_id.clone(),
        name: req.name,
        description: req.description,
        countries,
        active: req.active,
        created_at: now,
        updated_at: now,
    };

    match state.store.create_shipping_profile(profile.clone()).await {
        Ok(()) => json_ok(profile),
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to create shipping profile: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn update_profile(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
    Json(req): Json<UpdateProfileRequest>,
) -> impl IntoResponse {
    let countries = match normalize_countries(req.countries) {
        Ok(c) => c,
        Err(msg) => {
            let (status, body) = error_response(
                ErrorCode::InvalidField,
                Some(msg),
                Some(serde_json::json!({ "field": "countries" })),
            );
            return json_error(status, body);
        }
    };

    let existing = match state
        .store
        .get_shipping_profile(&tenant.tenant_id, &id)
        .await
    {
        Ok(Some(p)) => p,
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("shipping profile not found".to_string()),
                None,
            );
            return json_error(status, body);
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to load shipping profile: {e}")),
                None,
            );
            return json_error(status, body);
        }
    };

    let now = Utc::now();
    let profile = ShippingProfile {
        id: id.clone(),
        tenant_id: tenant.tenant_id.clone(),
        name: req.name,
        description: req.description,
        countries,
        active: req.active,
        created_at: existing.created_at,
        updated_at: now,
    };

    match state.store.update_shipping_profile(profile.clone()).await {
        Ok(()) => json_ok(profile),
        Err(crate::storage::StorageError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("shipping profile not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to update shipping profile: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn delete_profile(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state
        .store
        .delete_shipping_profile(&tenant.tenant_id, &id)
        .await
    {
        Ok(()) => json_ok(serde_json::json!({ "success": true })),
        Err(crate::storage::StorageError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("shipping profile not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to delete shipping profile: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn list_rates(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(profile_id): Path<String>,
    Query(params): Query<ListQuery>,
) -> impl IntoResponse {
    let limit = cap_limit_opt(params.limit, 50);
    let offset = params.offset.unwrap_or(0).max(0);
    match state
        .store
        .list_shipping_rates(&tenant.tenant_id, &profile_id, limit, offset)
        .await
    {
        Ok(rates) => json_ok(ListRatesResponse { rates }),
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to list shipping rates: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn create_rate(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(profile_id): Path<String>,
    Json(req): Json<CreateRateRequest>,
) -> impl IntoResponse {
    if !validate_rate_type(&req.rate_type) {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("rateType must be 'flat', 'price', or 'weight'".to_string()),
            Some(serde_json::json!({ "field": "rateType" })),
        );
        return json_error(status, body);
    }

    let now = Utc::now();
    let rate = ShippingRate {
        id: req.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
        tenant_id: tenant.tenant_id.clone(),
        profile_id,
        name: req.name,
        rate_type: req.rate_type,
        amount_atomic: req.amount_atomic,
        currency: req.currency,
        min_subtotal: req.min_subtotal,
        max_subtotal: req.max_subtotal,
        active: req.active,
        created_at: now,
        updated_at: now,
    };

    match state.store.create_shipping_rate(rate.clone()).await {
        Ok(()) => json_ok(rate),
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to create shipping rate: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn update_rate(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(rate_id): Path<String>,
    Json(req): Json<UpdateRateRequest>,
) -> impl IntoResponse {
    if !validate_rate_type(&req.rate_type) {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("rateType must be 'flat', 'price', or 'weight'".to_string()),
            Some(serde_json::json!({ "field": "rateType" })),
        );
        return json_error(status, body);
    }

    // Fetch existing rate to preserve created_at in the response
    let existing_rates = match state
        .store
        .list_shipping_rates(&tenant.tenant_id, &req.profile_id, 1000, 0)
        .await
    {
        Ok(rates) => rates,
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to fetch shipping rates: {e}")),
                None,
            );
            return json_error(status, body);
        }
    };
    let original_created_at = existing_rates
        .iter()
        .find(|r| r.id == rate_id)
        .map(|r| r.created_at);

    let now = Utc::now();
    let rate = ShippingRate {
        id: rate_id.clone(),
        tenant_id: tenant.tenant_id.clone(),
        profile_id: req.profile_id.clone(),
        name: req.name,
        rate_type: req.rate_type,
        amount_atomic: req.amount_atomic,
        currency: req.currency,
        min_subtotal: req.min_subtotal,
        max_subtotal: req.max_subtotal,
        active: req.active,
        created_at: original_created_at.unwrap_or(now),
        updated_at: now,
    };

    match state.store.update_shipping_rate(rate.clone()).await {
        Ok(()) => json_ok(rate),
        Err(crate::storage::StorageError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("shipping rate not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to update shipping rate: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn delete_rate(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(rate_id): Path<String>,
) -> impl IntoResponse {
    match state
        .store
        .delete_shipping_rate(&tenant.tenant_id, &rate_id)
        .await
    {
        Ok(()) => json_ok(serde_json::json!({ "success": true })),
        Err(crate::storage::StorageError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("shipping rate not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to delete shipping rate: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}
