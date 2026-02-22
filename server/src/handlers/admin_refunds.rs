//! Admin refund and credits refund request handlers

use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use chrono::DateTime;
use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin::AdminState;
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;

use super::cap_limit;

fn default_limit() -> i32 {
    20
}

// ============================================================================
// Shared types
// ============================================================================

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
///
/// This endpoint is intentionally NOT implemented.
/// Use the signed admin flow under `/paywall/v1/refunds/approve` + `/paywall/v1/refunds/deny`.
pub async fn process_refund(
    State(_state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
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

// ============================================================================
// Credits Refund Requests
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCreditsRefundRequestsQuery {
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default = "default_limit")]
    pub limit: i32,
    #[serde(default)]
    pub offset: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCreditsRefundRequestsResponse {
    pub requests: Vec<RefundInfo>,
    pub total: i64,
}

/// GET /api/admin/credits/refund-requests - List credits refund requests
pub async fn list_credits_refund_requests(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(query): Query<ListCreditsRefundRequestsQuery>,
) -> impl IntoResponse {
    let limit = cap_limit(query.limit);
    let offset = query.offset.max(0);

    // Validate status filter if provided
    if let Some(ref s) = query.status {
        if s != "pending" && s != "completed" && s != "denied" {
            let (status, body) = error_response(
                ErrorCode::InvalidField,
                Some("status must be 'pending', 'completed', or 'denied'".to_string()),
                Some(serde_json::json!({ "field": "status" })),
            );
            return json_error(status, body).into_response();
        }
    }

    match state
        .store
        .list_credits_refund_requests(&tenant.tenant_id, query.status.as_deref(), limit, offset)
        .await
    {
        Ok((refunds, total)) => {
            let requests: Vec<RefundInfo> = refunds
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

            let response = ListCreditsRefundRequestsResponse { requests, total };
            json_ok(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to list credits refund requests");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to list credits refund requests".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    use std::collections::HashMap;
    use std::sync::Arc;

    use axum::extract::{Path, State};
    use axum::response::IntoResponse;

    use crate::handlers::admin::AdminState;
    use crate::middleware::TenantContext;
    use crate::models::money::get_asset;
    use crate::models::Money;
    use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
    use crate::storage::{InMemoryStore, Store};

    #[tokio::test]
    async fn test_process_refund_is_not_implemented_and_does_not_modify_refund() {
        use chrono::Duration;

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
}
