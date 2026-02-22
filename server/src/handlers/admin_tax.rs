//! Admin tax rate handlers

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
use crate::models::TaxRate;

use super::cap_limit_opt;

const MAX_TAX_BPS: i32 = 10_000;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListQuery {
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaxRateRequest {
    pub id: Option<String>,
    pub name: String,
    pub country: String,
    pub region: Option<String>,
    pub rate_bps: i32,
    #[serde(default = "default_active")]
    pub active: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaxRateRequest {
    pub name: String,
    pub country: String,
    pub region: Option<String>,
    pub rate_bps: i32,
    #[serde(default = "default_active")]
    pub active: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTaxRatesResponse {
    pub rates: Vec<TaxRate>,
}

fn default_active() -> bool {
    true
}

fn normalize_country(value: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.len() != 2 || !trimmed.chars().all(|c| c.is_ascii_alphabetic()) {
        return Err("country must be a 2-letter code".to_string());
    }
    Ok(trimmed.to_uppercase())
}

fn normalize_region(value: Option<String>) -> Result<Option<String>, String> {
    match value {
        Some(region) => {
            let trimmed = region.trim();
            if trimmed.is_empty() {
                return Err("region must not be empty".to_string());
            }
            if !trimmed
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
            {
                return Err("region contains invalid characters".to_string());
            }
            Ok(Some(trimmed.to_uppercase()))
        }
        None => Ok(None),
    }
}

fn validate_rate_bps(rate_bps: i32) -> Result<(), String> {
    if !(0..=MAX_TAX_BPS).contains(&rate_bps) {
        return Err(format!("rate_bps must be between 0 and {MAX_TAX_BPS}"));
    }
    Ok(())
}

pub async fn list_tax_rates(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(params): Query<ListQuery>,
) -> impl IntoResponse {
    let limit = cap_limit_opt(params.limit, 50);
    let offset = params.offset.unwrap_or(0).max(0);
    match state
        .store
        .list_tax_rates(&tenant.tenant_id, limit, offset)
        .await
    {
        Ok(rates) => json_ok(ListTaxRatesResponse { rates }),
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to list tax rates: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn get_tax_rate(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.store.get_tax_rate(&tenant.tenant_id, &id).await {
        Ok(Some(rate)) => json_ok(rate),
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("tax rate not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to get tax rate: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn create_tax_rate(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Json(req): Json<CreateTaxRateRequest>,
) -> impl IntoResponse {
    let country = match normalize_country(&req.country) {
        Ok(value) => value,
        Err(message) => {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
            return json_error(status, body);
        }
    };
    let region = match normalize_region(req.region) {
        Ok(value) => value,
        Err(message) => {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
            return json_error(status, body);
        }
    };
    if let Err(message) = validate_rate_bps(req.rate_bps) {
        let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
        return json_error(status, body);
    }
    if req.name.trim().is_empty() {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("name is required".to_string()),
            None,
        );
        return json_error(status, body);
    }

    let now = Utc::now();
    let rate = TaxRate {
        id: req.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
        tenant_id: tenant.tenant_id,
        name: req.name.trim().to_string(),
        country,
        region,
        rate_bps: req.rate_bps,
        active: req.active,
        created_at: now,
        updated_at: now,
    };

    match state.store.create_tax_rate(rate.clone()).await {
        Ok(()) => json_ok(rate),
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to create tax rate: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn update_tax_rate(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
    Json(req): Json<UpdateTaxRateRequest>,
) -> impl IntoResponse {
    let country = match normalize_country(&req.country) {
        Ok(value) => value,
        Err(message) => {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
            return json_error(status, body);
        }
    };
    let region = match normalize_region(req.region) {
        Ok(value) => value,
        Err(message) => {
            let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
            return json_error(status, body);
        }
    };
    if let Err(message) = validate_rate_bps(req.rate_bps) {
        let (status, body) = error_response(ErrorCode::InvalidField, Some(message), None);
        return json_error(status, body);
    }
    if req.name.trim().is_empty() {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("name is required".to_string()),
            None,
        );
        return json_error(status, body);
    }

    let existing = match state.store.get_tax_rate(&tenant.tenant_id, &id).await {
        Ok(Some(rate)) => rate,
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("tax rate not found".to_string()),
                None,
            );
            return json_error(status, body);
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to load tax rate: {e}")),
                None,
            );
            return json_error(status, body);
        }
    };

    let updated = TaxRate {
        id: existing.id,
        tenant_id: existing.tenant_id,
        name: req.name.trim().to_string(),
        country,
        region,
        rate_bps: req.rate_bps,
        active: req.active,
        created_at: existing.created_at,
        updated_at: Utc::now(),
    };

    match state.store.update_tax_rate(updated.clone()).await {
        Ok(()) => json_ok(updated),
        Err(crate::storage::StorageError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("tax rate not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to update tax rate: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

pub async fn delete_tax_rate(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.store.delete_tax_rate(&tenant.tenant_id, &id).await {
        Ok(()) => json_ok(serde_json::json!({ "deleted": true })),
        Err(crate::storage::StorageError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("tax rate not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to delete tax rate: {e}")),
                None,
            );
            json_error(status, body)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use axum::http::StatusCode;
    use axum::response::IntoResponse;

    use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
    use crate::storage::{InMemoryStore, Store};

    #[tokio::test]
    async fn test_create_tax_rate_persists() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let tenant = TenantContext::default();
        let request = CreateTaxRateRequest {
            id: Some("tax-1".to_string()),
            name: "CA Sales Tax".to_string(),
            country: "us".to_string(),
            region: Some("ca".to_string()),
            rate_bps: 825,
            active: true,
        };

        let response = create_tax_rate(State(state), tenant.clone(), Json(request))
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::OK);

        let stored = store
            .get_tax_rate(&tenant.tenant_id, "tax-1")
            .await
            .unwrap()
            .expect("tax rate stored");
        assert_eq!(stored.country, "US");
        assert_eq!(stored.region.as_deref(), Some("CA"));
    }

    #[tokio::test]
    async fn test_create_tax_rate_rejects_invalid_rate() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let tenant = TenantContext::default();
        let request = CreateTaxRateRequest {
            id: None,
            name: "Invalid Tax".to_string(),
            country: "US".to_string(),
            region: None,
            rate_bps: 20000,
            active: true,
        };

        let response = create_tax_rate(State(state), tenant, Json(request))
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);

        let stored = store.list_tax_rates("default", 10, 0).await.unwrap();
        assert!(stored.is_empty());
    }
}
