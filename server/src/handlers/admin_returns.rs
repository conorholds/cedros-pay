//! Admin return request handlers

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
use crate::models::{is_valid_return_transition, OrderItem, ReturnRequest};

const MAX_LIST_LIMIT: i32 = 1000;
const DEFAULT_LIST_LIMIT: i32 = 50;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListReturnsQuery {
    pub status: Option<String>,
    pub order_id: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateReturnRequest {
    pub id: Option<String>,
    pub order_id: String,
    #[serde(default)]
    pub items: Vec<OrderItem>,
    pub reason: Option<String>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateReturnStatusRequest {
    pub status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListReturnsResponse {
    pub returns: Vec<ReturnRequest>,
}

fn cap_limit(limit: Option<i32>) -> i32 {
    limit.unwrap_or(DEFAULT_LIST_LIMIT).clamp(1, MAX_LIST_LIMIT)
}

fn is_allowed_return_status(status: &str) -> bool {
    matches!(
        status,
        "requested" | "approved" | "rejected" | "received" | "refunded"
    )
}

fn validate_items(items: &[OrderItem]) -> Result<(), String> {
    if items.is_empty() {
        return Err("items must not be empty".to_string());
    }
    for item in items {
        if item.product_id.trim().is_empty() {
            return Err("item product_id is required".to_string());
        }
        if item.quantity <= 0 {
            return Err("item quantity must be positive".to_string());
        }
    }
    Ok(())
}

pub async fn list_returns(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(params): Query<ListReturnsQuery>,
) -> impl IntoResponse {
    let limit = cap_limit(params.limit);
    let offset = params.offset.unwrap_or(0).max(0);
    let status = params.status.as_deref().map(|s| s.trim().to_lowercase());

    if let Some(ref s) = status {
        if !is_allowed_return_status(s) {
            let (status_code, body) = error_response(
                ErrorCode::InvalidField,
                Some("invalid return status".to_string()),
                Some(serde_json::json!({ "field": "status" })),
            );
            return json_error(status_code, body);
        }
    }

    match state
        .store
        .list_return_requests(
            &tenant.tenant_id,
            status.as_deref(),
            params.order_id.as_deref(),
            limit,
            offset,
        )
        .await
    {
        Ok(returns) => json_ok(ListReturnsResponse { returns }),
        Err(e) => {
            let (status_code, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to list returns: {e}")),
                None,
            );
            json_error(status_code, body)
        }
    }
}

pub async fn get_return(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
    match state.store.get_return_request(&tenant.tenant_id, &id).await {
        Ok(Some(request)) => json_ok(request),
        Ok(None) => {
            let (status_code, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("return request not found".to_string()),
                None,
            );
            json_error(status_code, body)
        }
        Err(e) => {
            let (status_code, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to get return request: {e}")),
                None,
            );
            json_error(status_code, body)
        }
    }
}

pub async fn create_return(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Json(req): Json<CreateReturnRequest>,
) -> impl IntoResponse {
    if let Err(message) = validate_items(&req.items) {
        let (status_code, body) = error_response(ErrorCode::InvalidField, Some(message), None);
        return json_error(status_code, body);
    }

    match state
        .store
        .get_order(&tenant.tenant_id, &req.order_id)
        .await
    {
        Ok(Some(_)) => {}
        Ok(None) => {
            let (status_code, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("order not found".to_string()),
                None,
            );
            return json_error(status_code, body);
        }
        Err(e) => {
            let (status_code, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to verify order: {e}")),
                None,
            );
            return json_error(status_code, body);
        }
    }

    let now = Utc::now();
    let request = ReturnRequest {
        id: req.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
        tenant_id: tenant.tenant_id,
        order_id: req.order_id,
        status: "requested".to_string(),
        items: req.items,
        reason: req.reason,
        metadata: req.metadata,
        created_at: now,
        updated_at: Some(now),
        status_updated_at: Some(now),
    };

    match state.store.create_return_request(request.clone()).await {
        Ok(()) => json_ok(request),
        Err(e) => {
            let (status_code, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to create return request: {e}")),
                None,
            );
            json_error(status_code, body)
        }
    }
}

pub async fn update_return_status(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
    Json(req): Json<UpdateReturnStatusRequest>,
) -> impl IntoResponse {
    let status = req.status.trim().to_lowercase();
    if !is_allowed_return_status(&status) {
        let (status_code, body) = error_response(
            ErrorCode::InvalidField,
            Some("invalid return status".to_string()),
            Some(serde_json::json!({ "field": "status" })),
        );
        return json_error(status_code, body);
    }

    let existing = match state.store.get_return_request(&tenant.tenant_id, &id).await {
        Ok(Some(request)) => request,
        Ok(None) => {
            let (status_code, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("return request not found".to_string()),
                None,
            );
            return json_error(status_code, body);
        }
        Err(e) => {
            let (status_code, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to load return request: {e}")),
                None,
            );
            return json_error(status_code, body);
        }
    };

    if !is_valid_return_transition(&existing.status, &status) {
        let (status_code, body) = error_response(
            ErrorCode::InvalidField,
            Some("invalid return status transition".to_string()),
            Some(serde_json::json!({ "from": &existing.status, "to": &status })),
        );
        return json_error(status_code, body);
    }

    let now = Utc::now();
    if let Err(e) = state
        .store
        .update_return_status(&tenant.tenant_id, &id, &status, now, now)
        .await
    {
        let (code, message) = match e {
            crate::storage::StorageError::NotFound => (
                ErrorCode::ResourceNotFound,
                "return request not found".to_string(),
            ),
            _ => (
                ErrorCode::DatabaseError,
                format!("Failed to update return status: {e}"),
            ),
        };
        let (status_code, body) = error_response(code, Some(message), None);
        return json_error(status_code, body);
    }

    let updated = ReturnRequest {
        status,
        status_updated_at: Some(now),
        updated_at: Some(now),
        ..existing
    };

    json_ok(updated)
}

#[cfg(test)]
mod tests {
    use super::*;

    use axum::http::StatusCode;
    use axum::response::IntoResponse;
    use chrono::Utc;

    use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
    use crate::storage::{InMemoryStore, Store};

    fn base_order() -> crate::models::Order {
        let now = Utc::now();
        crate::models::Order {
            id: "ord-1".to_string(),
            tenant_id: "default".to_string(),
            source: "stripe".to_string(),
            purchase_id: "pi_123".to_string(),
            resource_id: "prod-1".to_string(),
            user_id: None,
            customer: None,
            status: "paid".to_string(),
            items: vec![OrderItem {
                product_id: "prod-1".to_string(),
                variant_id: None,
                quantity: 1,
            }],
            amount: 1200,
            amount_asset: "USD".to_string(),
            customer_email: Some("buyer@example.com".to_string()),
            customer_name: None,
            receipt_url: Some("/receipt/ord-1".to_string()),
            shipping: None,
            metadata: HashMap::new(),
            created_at: now,
            updated_at: Some(now),
            status_updated_at: Some(now),
        }
    }

    #[tokio::test]
    async fn test_create_return_persists() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });
        let order = base_order();
        store.try_store_order(order).await.unwrap();

        let tenant = TenantContext::default();
        let request = CreateReturnRequest {
            id: Some("ret-1".to_string()),
            order_id: "ord-1".to_string(),
            items: vec![OrderItem {
                product_id: "prod-1".to_string(),
                variant_id: None,
                quantity: 1,
            }],
            reason: Some("damaged".to_string()),
            metadata: HashMap::new(),
        };

        let response = create_return(State(state), tenant.clone(), Json(request))
            .await
            .into_response();
        assert_eq!(response.status(), StatusCode::OK);

        let stored = store
            .get_return_request(&tenant.tenant_id, "ret-1")
            .await
            .unwrap()
            .expect("return stored");
        assert_eq!(stored.status, "requested");
    }

    #[tokio::test]
    async fn test_update_return_status_rejects_invalid_transition() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });
        let now = Utc::now();
        store
            .create_return_request(ReturnRequest {
                id: "ret-2".to_string(),
                tenant_id: "default".to_string(),
                order_id: "ord-2".to_string(),
                status: "requested".to_string(),
                items: vec![OrderItem {
                    product_id: "prod-1".to_string(),
                    variant_id: None,
                    quantity: 1,
                }],
                reason: None,
                metadata: HashMap::new(),
                created_at: now,
                updated_at: Some(now),
                status_updated_at: Some(now),
            })
            .await
            .unwrap();

        let tenant = TenantContext::default();
        let request = UpdateReturnStatusRequest {
            status: "refunded".to_string(),
        };

        let response = update_return_status(
            State(state),
            tenant,
            Path("ret-2".to_string()),
            Json(request),
        )
        .await
        .into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }
}
