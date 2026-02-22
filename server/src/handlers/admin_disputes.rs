//! Admin dispute handlers

use std::collections::HashMap;
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
use crate::models::DisputeRecord;

use super::cap_limit_opt;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListDisputesQuery {
    pub status: Option<String>,
    pub source: Option<String>,
    pub order_id: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDisputeRequest {
    pub id: Option<String>,
    pub source: String,
    pub order_id: Option<String>,
    pub payment_intent_id: Option<String>,
    pub charge_id: Option<String>,
    pub status: String,
    pub reason: Option<String>,
    pub amount: i64,
    pub currency: String,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDisputeStatusRequest {
    pub status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListDisputesResponse {
    pub disputes: Vec<DisputeRecord>,
}

fn normalize_status(status: &str) -> String {
    status.trim().to_lowercase()
}

fn validate_dispute(request: &CreateDisputeRequest) -> Result<(), String> {
    if request.source.trim().is_empty() {
        return Err("source is required".to_string());
    }
    if request.status.trim().is_empty() {
        return Err("status is required".to_string());
    }
    if request.amount <= 0 {
        return Err("amount must be positive".to_string());
    }
    if request.currency.trim().len() != 3 {
        return Err("currency must be 3-letter code".to_string());
    }
    Ok(())
}

pub async fn list_disputes(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(params): Query<ListDisputesQuery>,
) -> impl IntoResponse {
    let limit = cap_limit_opt(params.limit, 50);
    let offset = params.offset.unwrap_or(0).max(0);
    let status = params.status.as_deref().map(normalize_status);
    let source = params.source.as_deref().map(|s| s.trim().to_lowercase());

    match state
        .store
        .list_disputes(
            &tenant.tenant_id,
            status.as_deref(),
            source.as_deref(),
            params.order_id.as_deref(),
            limit,
            offset,
        )
        .await
    {
        Ok(disputes) => json_ok(ListDisputesResponse { disputes }),
        Err(e) => {
            let (status_code, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to list disputes: {e}")),
                None,
            );
            json_error(status_code, body)
        }
    }
}

pub async fn get_dispute(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.store.get_dispute(&tenant.tenant_id, &id).await {
        Ok(Some(dispute)) => json_ok(dispute),
        Ok(None) => {
            let (status_code, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("dispute not found".to_string()),
                None,
            );
            json_error(status_code, body)
        }
        Err(e) => {
            let (status_code, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to get dispute: {e}")),
                None,
            );
            json_error(status_code, body)
        }
    }
}

pub async fn create_dispute(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Json(req): Json<CreateDisputeRequest>,
) -> impl IntoResponse {
    if let Err(message) = validate_dispute(&req) {
        let (status_code, body) = error_response(ErrorCode::InvalidField, Some(message), None);
        return json_error(status_code, body);
    }

    let now = Utc::now();
    let dispute = DisputeRecord {
        id: req.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
        tenant_id: tenant.tenant_id,
        source: req.source.trim().to_lowercase(),
        order_id: req.order_id,
        payment_intent_id: req.payment_intent_id,
        charge_id: req.charge_id,
        status: req.status.trim().to_lowercase(),
        reason: req.reason,
        amount: req.amount,
        currency: req.currency.trim().to_uppercase(),
        metadata: req.metadata,
        created_at: now,
        updated_at: Some(now),
        status_updated_at: Some(now),
    };

    match state.store.create_dispute(dispute.clone()).await {
        Ok(()) => json_ok(dispute),
        Err(e) => {
            let (status_code, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to create dispute: {e}")),
                None,
            );
            json_error(status_code, body)
        }
    }
}

pub async fn update_dispute_status(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
    Json(req): Json<UpdateDisputeStatusRequest>,
) -> impl IntoResponse {
    let status = req.status.trim().to_lowercase();
    if status.is_empty() {
        let (status_code, body) = error_response(
            ErrorCode::InvalidField,
            Some("status is required".to_string()),
            None,
        );
        return json_error(status_code, body);
    }

    let now = Utc::now();
    match state
        .store
        .update_dispute_status(&tenant.tenant_id, &id, &status, now, now)
        .await
    {
        Ok(()) => match state.store.get_dispute(&tenant.tenant_id, &id).await {
            Ok(Some(dispute)) => json_ok(dispute),
            Ok(None) => {
                let (status_code, body) = error_response(
                    ErrorCode::ResourceNotFound,
                    Some("dispute not found".to_string()),
                    None,
                );
                json_error(status_code, body)
            }
            Err(e) => {
                let (status_code, body) = error_response(
                    ErrorCode::DatabaseError,
                    Some(format!("Failed to load dispute: {e}")),
                    None,
                );
                json_error(status_code, body)
            }
        },
        Err(crate::storage::StorageError::NotFound) => {
            let (status_code, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("dispute not found".to_string()),
                None,
            );
            json_error(status_code, body)
        }
        Err(e) => {
            let (status_code, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to update dispute: {e}")),
                None,
            );
            json_error(status_code, body)
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
    async fn test_create_dispute_persists() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let tenant = TenantContext::default();
        let request = CreateDisputeRequest {
            id: Some("disp-1".to_string()),
            source: "stripe".to_string(),
            order_id: Some("ord-1".to_string()),
            payment_intent_id: None,
            charge_id: Some("ch_123".to_string()),
            status: "needs_response".to_string(),
            reason: Some("fraudulent".to_string()),
            amount: 1200,
            currency: "usd".to_string(),
            metadata: HashMap::new(),
        };

        let response = create_dispute(State(state), tenant.clone(), Json(request))
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::OK);

        let stored = store
            .get_dispute(&tenant.tenant_id, "disp-1")
            .await
            .unwrap()
            .expect("dispute stored");
        assert_eq!(stored.currency, "USD");
    }

    #[tokio::test]
    async fn test_create_dispute_rejects_invalid_amount() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let tenant = TenantContext::default();
        let request = CreateDisputeRequest {
            id: None,
            source: "stripe".to_string(),
            order_id: None,
            payment_intent_id: None,
            charge_id: None,
            status: "warning_needs_response".to_string(),
            reason: None,
            amount: 0,
            currency: "usd".to_string(),
            metadata: HashMap::new(),
        };

        let response = create_dispute(State(state), tenant, Json(request))
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
}
