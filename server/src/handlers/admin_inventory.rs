//! Admin inventory adjustment handlers

use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin::AdminState;
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;
use crate::models::InventoryAdjustment;

use super::cap_limit_opt;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListAdjustmentsQuery {
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListAdjustmentsResponse {
    pub adjustments: Vec<InventoryAdjustment>,
}

/// GET /admin/products/:id/inventory/adjustments
pub async fn list_inventory_adjustments(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
    Query(params): Query<ListAdjustmentsQuery>,
) -> impl IntoResponse {
    let limit = cap_limit_opt(params.limit, 50);
    let offset = params.offset.unwrap_or(0).max(0);

    match state
        .store
        .list_inventory_adjustments(&tenant.tenant_id, &id, limit, offset)
        .await
    {
        Ok(adjustments) => json_ok(ListAdjustmentsResponse { adjustments }),
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some(format!("Failed to list inventory adjustments: {e}")),
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
    use http_body_util::BodyExt;

    use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
    use crate::storage::{InMemoryStore, Store};

    #[tokio::test]
    async fn test_list_inventory_adjustments_returns_items() {
        let store = Arc::new(InMemoryStore::new());
        let state = Arc::new(AdminState {
            store: store.clone(),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let now = chrono::Utc::now();
        let adjustment = InventoryAdjustment {
            id: "adj-1".to_string(),
            tenant_id: "default".to_string(),
            product_id: "prod-1".to_string(),
            variant_id: None,
            delta: 2,
            quantity_before: 1,
            quantity_after: 3,
            reason: Some("restock".to_string()),
            actor: Some("admin".to_string()),
            created_at: now,
        };
        store.record_inventory_adjustment(adjustment).await.unwrap();

        let response = list_inventory_adjustments(
            State(state),
            TenantContext::default(),
            Path("prod-1".to_string()),
            Query(ListAdjustmentsQuery {
                limit: Some(10),
                offset: Some(0),
            }),
        )
        .await
        .into_response();
        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let parsed: ListAdjustmentsResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(parsed.adjustments.len(), 1);
        assert_eq!(parsed.adjustments[0].id, "adj-1");
    }
}
