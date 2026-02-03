//! Admin order/fulfillment handlers

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
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;
use crate::models::{is_valid_order_transition, Fulfillment, Order, OrderHistoryEntry, OrderItem};

const MAX_LIST_LIMIT: i32 = 1000;
const DEFAULT_LIST_LIMIT: i32 = 20;
const HISTORY_LIMIT: i32 = 100;
const FULFILLMENT_LIMIT: i32 = 100;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListOrdersQuery {
    pub status: Option<String>,
    pub search: Option<String>,
    pub created_before: Option<DateTime<Utc>>,
    pub created_after: Option<DateTime<Utc>>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListOrdersResponse {
    pub orders: Vec<Order>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderDetailResponse {
    pub order: Order,
    pub history: Vec<OrderHistoryEntry>,
    pub fulfillments: Vec<Fulfillment>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOrderStatusRequest {
    pub status: String,
    pub note: Option<String>,
    pub actor: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOrderStatusResponse {
    pub order: Order,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFulfillmentRequest {
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub items: Vec<OrderItem>,
    pub carrier: Option<String>,
    pub tracking_number: Option<String>,
    pub tracking_url: Option<String>,
    pub shipped_at: Option<DateTime<Utc>>,
    pub delivered_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub metadata: std::collections::HashMap<String, String>,
    pub actor: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFulfillmentStatusRequest {
    pub status: String,
    pub carrier: Option<String>,
    pub tracking_number: Option<String>,
    pub tracking_url: Option<String>,
    pub shipped_at: Option<DateTime<Utc>>,
    pub delivered_at: Option<DateTime<Utc>>,
    pub actor: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FulfillmentResponse {
    pub fulfillment: Fulfillment,
}

fn cap_limit(limit: Option<i32>) -> i32 {
    limit.unwrap_or(DEFAULT_LIST_LIMIT).clamp(1, MAX_LIST_LIMIT)
}

fn normalize_status(status: &str) -> String {
    status.trim().to_lowercase()
}

fn is_allowed_order_status(status: &str) -> bool {
    matches!(
        status,
        "created"
            | "paid"
            | "processing"
            | "fulfilled"
            | "shipped"
            | "delivered"
            | "cancelled"
            | "refunded"
    )
}

fn is_allowed_fulfillment_status(status: &str) -> bool {
    matches!(status, "pending" | "shipped" | "delivered" | "cancelled")
}

fn fulfillment_to_order_status(status: &str) -> Option<&'static str> {
    match status {
        "pending" => Some("fulfilled"),
        "shipped" => Some("shipped"),
        "delivered" => Some("delivered"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use axum::http::StatusCode;
    use axum::response::IntoResponse;
    use std::collections::HashMap;

    use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
    use crate::storage::{InMemoryStore, Store};

    fn base_order(status: &str) -> Order {
        let now = Utc::now();
        Order {
            id: "ord-1".to_string(),
            tenant_id: "default".to_string(),
            source: "stripe".to_string(),
            purchase_id: "cs_123".to_string(),
            resource_id: "prod-1".to_string(),
            user_id: None,
            customer: None,
            status: status.to_string(),
            items: vec![OrderItem {
                product_id: "prod-1".to_string(),
                variant_id: None,
                quantity: 1,
            }],
            amount: 1000,
            amount_asset: "USD".to_string(),
            customer_email: Some("a@example.com".to_string()),
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
    async fn test_update_order_status_records_history() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });
        let order = base_order("paid");
        store.try_store_order(order.clone()).await.unwrap();

        let tenant = TenantContext::default();
        let request = UpdateOrderStatusRequest {
            status: "processing".to_string(),
            note: Some("packed".to_string()),
            actor: Some("admin".to_string()),
        };

        let response = update_order_status(
            State(state),
            tenant.clone(),
            Path(order.id.clone()),
            Json(request),
        )
        .await
        .into_response();
        assert_eq!(response.status(), StatusCode::OK);

        let history = store
            .list_order_history(&tenant.tenant_id, &order.id, 10)
            .await
            .unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].from_status, "paid");
        assert_eq!(history[0].to_status, "processing");
    }

    #[tokio::test]
    async fn test_update_order_status_rejects_invalid_transition() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });
        let order = base_order("processing");
        store.try_store_order(order.clone()).await.unwrap();

        let tenant = TenantContext::default();
        let request = UpdateOrderStatusRequest {
            status: "paid".to_string(),
            note: None,
            actor: None,
        };

        let response =
            update_order_status(State(state), tenant, Path(order.id.clone()), Json(request))
                .await
                .into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    #[tokio::test]
    async fn test_create_fulfillment_updates_order_status() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });
        let order = base_order("fulfilled");
        store.try_store_order(order.clone()).await.unwrap();

        let tenant = TenantContext::default();
        let request = CreateFulfillmentRequest {
            status: Some("shipped".to_string()),
            items: vec![OrderItem {
                product_id: "prod-1".to_string(),
                variant_id: None,
                quantity: 1,
            }],
            carrier: Some("ups".to_string()),
            tracking_number: Some("1Z".to_string()),
            tracking_url: None,
            shipped_at: None,
            delivered_at: None,
            metadata: HashMap::new(),
            actor: Some("admin".to_string()),
            note: Some("boxed".to_string()),
        };

        let response = create_fulfillment(
            State(state),
            tenant.clone(),
            Path(order.id.clone()),
            Json(request),
        )
        .await
        .into_response();
        assert_eq!(response.status(), StatusCode::OK);

        let updated = store
            .get_order(&tenant.tenant_id, &order.id)
            .await
            .unwrap()
            .expect("order");
        assert_eq!(updated.status, "shipped");
        let history = store
            .list_order_history(&tenant.tenant_id, &order.id, 10)
            .await
            .unwrap();
        assert_eq!(history.len(), 1);
    }
}
pub async fn list_orders(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(params): Query<ListOrdersQuery>,
) -> impl IntoResponse {
    let limit = cap_limit(params.limit);
    let offset = params.offset.unwrap_or(0).max(0);
    let status = params.status.as_deref().map(normalize_status);

    if let Some(ref s) = status {
        if !is_allowed_order_status(s) {
            let (status_code, body) = error_response(
                ErrorCode::InvalidField,
                Some("invalid order status".to_string()),
                Some(serde_json::json!({ "field": "status" })),
            );
            return json_error(status_code, body);
        }
    }

    let result = state
        .store
        .list_orders_filtered(
            &tenant.tenant_id,
            status.as_deref(),
            params.search.as_deref(),
            params.created_before,
            params.created_after,
            limit,
            offset,
        )
        .await;

    match result {
        Ok((orders, total)) => json_ok(ListOrdersResponse { orders, total }),
        Err(e) => {
            let (status_code, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to list orders: {e}")),
                None,
            );
            json_error(status_code, body)
        }
    }
}

pub async fn get_order(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(order_id): Path<String>,
) -> impl IntoResponse {
    let order = match state.store.get_order(&tenant.tenant_id, &order_id).await {
        Ok(Some(order)) => order,
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
                Some(format!("Failed to load order: {e}")),
                None,
            );
            return json_error(status_code, body);
        }
    };

    let history = state
        .store
        .list_order_history(&tenant.tenant_id, &order_id, HISTORY_LIMIT)
        .await
        .unwrap_or_default();

    let fulfillments = state
        .store
        .list_fulfillments(&tenant.tenant_id, &order_id, FULFILLMENT_LIMIT)
        .await
        .unwrap_or_default();

    json_ok(OrderDetailResponse {
        order,
        history,
        fulfillments,
    })
}

pub async fn update_order_status(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(order_id): Path<String>,
    Json(req): Json<UpdateOrderStatusRequest>,
) -> impl IntoResponse {
    let target_status = normalize_status(&req.status);
    if !is_allowed_order_status(&target_status) {
        let (status_code, body) = error_response(
            ErrorCode::InvalidField,
            Some("invalid order status".to_string()),
            Some(serde_json::json!({ "field": "status" })),
        );
        return json_error(status_code, body);
    }

    let mut order = match state.store.get_order(&tenant.tenant_id, &order_id).await {
        Ok(Some(order)) => order,
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
                Some(format!("Failed to load order: {e}")),
                None,
            );
            return json_error(status_code, body);
        }
    };

    if order.status == target_status {
        return json_ok(UpdateOrderStatusResponse { order });
    }

    if !is_valid_order_transition(&order.status, &target_status) {
        let (status_code, body) = error_response(
            ErrorCode::InvalidOperation,
            Some("invalid order status transition".to_string()),
            None,
        );
        return json_error(status_code, body);
    }

    let now = Utc::now();
    if let Err(e) = state
        .store
        .update_order_status(&tenant.tenant_id, &order_id, &target_status, now, now)
        .await
    {
        let (status_code, body) = error_response(
            ErrorCode::DatabaseError,
            Some(format!("Failed to update order status: {e}")),
            None,
        );
        return json_error(status_code, body);
    }

    let history_entry = OrderHistoryEntry {
        id: uuid::Uuid::new_v4().to_string(),
        tenant_id: tenant.tenant_id.clone(),
        order_id: order_id.clone(),
        from_status: order.status.clone(),
        to_status: target_status.clone(),
        note: req.note.clone(),
        actor: req.actor.clone(),
        created_at: now,
    };

    if let Err(e) = state.store.append_order_history(history_entry).await {
        let (status_code, body) = error_response(
            ErrorCode::DatabaseError,
            Some(format!("Failed to record order history: {e}")),
            None,
        );
        return json_error(status_code, body);
    }

    order.status = target_status;
    order.status_updated_at = Some(now);
    order.updated_at = Some(now);

    json_ok(UpdateOrderStatusResponse { order })
}

pub async fn create_fulfillment(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(order_id): Path<String>,
    Json(req): Json<CreateFulfillmentRequest>,
) -> impl IntoResponse {
    let status = normalize_status(req.status.as_deref().unwrap_or("pending"));
    if !is_allowed_fulfillment_status(&status) {
        let (status_code, body) = error_response(
            ErrorCode::InvalidField,
            Some("invalid fulfillment status".to_string()),
            Some(serde_json::json!({ "field": "status" })),
        );
        return json_error(status_code, body);
    }
    if req.items.is_empty() {
        let (status_code, body) = error_response(
            ErrorCode::InvalidField,
            Some("fulfillment items required".to_string()),
            Some(serde_json::json!({ "field": "items" })),
        );
        return json_error(status_code, body);
    }

    let mut order = match state.store.get_order(&tenant.tenant_id, &order_id).await {
        Ok(Some(order)) => order,
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
                Some(format!("Failed to load order: {e}")),
                None,
            );
            return json_error(status_code, body);
        }
    };

    let now = Utc::now();
    let shipped_at = if status == "shipped" && req.shipped_at.is_none() {
        Some(now)
    } else {
        req.shipped_at
    };
    let delivered_at = if status == "delivered" && req.delivered_at.is_none() {
        Some(now)
    } else {
        req.delivered_at
    };

    let fulfillment = Fulfillment {
        id: uuid::Uuid::new_v4().to_string(),
        tenant_id: tenant.tenant_id.clone(),
        order_id: order_id.clone(),
        status: status.clone(),
        carrier: req.carrier.clone(),
        tracking_number: req.tracking_number.clone(),
        tracking_url: req.tracking_url.clone(),
        items: req.items.clone(),
        shipped_at,
        delivered_at,
        metadata: req.metadata.clone(),
        created_at: now,
        updated_at: Some(now),
    };

    if let Err(e) = state.store.create_fulfillment(fulfillment.clone()).await {
        let (status_code, body) = error_response(
            ErrorCode::DatabaseError,
            Some(format!("Failed to create fulfillment: {e}")),
            None,
        );
        return json_error(status_code, body);
    }

    if let Some(target_status) = fulfillment_to_order_status(&status) {
        if order.status != target_status {
            if !is_valid_order_transition(&order.status, target_status) {
                let (status_code, body) = error_response(
                    ErrorCode::InvalidOperation,
                    Some("invalid order status transition".to_string()),
                    None,
                );
                return json_error(status_code, body);
            }
            if let Err(e) = state
                .store
                .update_order_status(&tenant.tenant_id, &order_id, target_status, now, now)
                .await
            {
                let (status_code, body) = error_response(
                    ErrorCode::DatabaseError,
                    Some(format!("Failed to update order status: {e}")),
                    None,
                );
                return json_error(status_code, body);
            }
            let history_entry = OrderHistoryEntry {
                id: uuid::Uuid::new_v4().to_string(),
                tenant_id: tenant.tenant_id.clone(),
                order_id: order_id.clone(),
                from_status: order.status.clone(),
                to_status: target_status.to_string(),
                note: req.note.clone(),
                actor: req.actor.clone(),
                created_at: now,
            };
            if let Err(e) = state.store.append_order_history(history_entry).await {
                let (status_code, body) = error_response(
                    ErrorCode::DatabaseError,
                    Some(format!("Failed to record order history: {e}")),
                    None,
                );
                return json_error(status_code, body);
            }
            order.status = target_status.to_string();
            order.status_updated_at = Some(now);
            order.updated_at = Some(now);
        }
    }

    json_ok(FulfillmentResponse { fulfillment })
}

pub async fn update_fulfillment_status(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(fulfillment_id): Path<String>,
    Json(req): Json<UpdateFulfillmentStatusRequest>,
) -> impl IntoResponse {
    let status = normalize_status(&req.status);
    if !is_allowed_fulfillment_status(&status) {
        let (status_code, body) = error_response(
            ErrorCode::InvalidField,
            Some("invalid fulfillment status".to_string()),
            Some(serde_json::json!({ "field": "status" })),
        );
        return json_error(status_code, body);
    }

    let now = Utc::now();
    let shipped_at = if status == "shipped" && req.shipped_at.is_none() {
        Some(now)
    } else {
        req.shipped_at
    };
    let delivered_at = if status == "delivered" && req.delivered_at.is_none() {
        Some(now)
    } else {
        req.delivered_at
    };

    let fulfillment = match state
        .store
        .update_fulfillment_status(
            &tenant.tenant_id,
            &fulfillment_id,
            &status,
            shipped_at,
            delivered_at,
            now,
            req.tracking_number.as_deref(),
            req.tracking_url.as_deref(),
            req.carrier.as_deref(),
        )
        .await
    {
        Ok(Some(fulfillment)) => fulfillment,
        Ok(None) => {
            let (status_code, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("fulfillment not found".to_string()),
                None,
            );
            return json_error(status_code, body);
        }
        Err(e) => {
            let (status_code, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to update fulfillment: {e}")),
                None,
            );
            return json_error(status_code, body);
        }
    };

    if let Some(target_status) = fulfillment_to_order_status(&status) {
        if let Ok(Some(mut order)) = state
            .store
            .get_order(&tenant.tenant_id, &fulfillment.order_id)
            .await
        {
            if order.status != target_status {
                if !is_valid_order_transition(&order.status, target_status) {
                    let (status_code, body) = error_response(
                        ErrorCode::InvalidOperation,
                        Some("invalid order status transition".to_string()),
                        None,
                    );
                    return json_error(status_code, body);
                }
                if let Err(e) = state
                    .store
                    .update_order_status(
                        &tenant.tenant_id,
                        &fulfillment.order_id,
                        target_status,
                        now,
                        now,
                    )
                    .await
                {
                    let (status_code, body) = error_response(
                        ErrorCode::DatabaseError,
                        Some(format!("Failed to update order status: {e}")),
                        None,
                    );
                    return json_error(status_code, body);
                }
                let history_entry = OrderHistoryEntry {
                    id: uuid::Uuid::new_v4().to_string(),
                    tenant_id: tenant.tenant_id.clone(),
                    order_id: fulfillment.order_id.clone(),
                    from_status: order.status.clone(),
                    to_status: target_status.to_string(),
                    note: req.note.clone(),
                    actor: req.actor.clone(),
                    created_at: now,
                };
                if let Err(e) = state.store.append_order_history(history_entry).await {
                    let (status_code, body) = error_response(
                        ErrorCode::DatabaseError,
                        Some(format!("Failed to record order history: {e}")),
                        None,
                    );
                    return json_error(status_code, body);
                }
                order.status = target_status.to_string();
                order.status_updated_at = Some(now);
                order.updated_at = Some(now);
            }
        }
    }

    json_ok(FulfillmentResponse { fulfillment })
}
