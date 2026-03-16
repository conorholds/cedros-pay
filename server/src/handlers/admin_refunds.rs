//! Admin refund and credits refund request handlers

use std::sync::Arc;

use axum::{
    extract::{Query, State},
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

    use std::sync::Arc;

    use axum::extract::{Query, State};
    use axum::response::IntoResponse;

    use crate::handlers::admin::AdminState;
    use crate::middleware::TenantContext;
    use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
    use crate::storage::InMemoryStore;

    #[tokio::test]
    async fn test_list_credits_refund_requests_rejects_invalid_status_filter() {
        let state = Arc::new(AdminState {
            store: Arc::new(InMemoryStore::new()),
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            coupon_repo: Arc::new(InMemoryCouponRepository::new(Vec::new())),
            stripe_client: None,
        });

        let response = super::list_credits_refund_requests(
            State(state),
            TenantContext::default(),
            Query(ListCreditsRefundRequestsQuery {
                status: Some("unknown".to_string()),
                limit: 20,
                offset: 0,
            }),
        )
        .await
        .into_response();

        assert_eq!(
            response.status(),
            crate::errors::ErrorCode::InvalidField.http_status()
        );
    }
}
