//! Admin Stripe refunds handlers

use std::collections::HashMap;
use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin::AdminState;
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;

use super::cap_limit_opt;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListStripeRefundsQuery {
    pub limit: Option<i32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StripeRefundInfo {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_refund_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub charge_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payment_intent_id: Option<String>,
    pub amount: i64,
    pub currency: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListStripeRefundsResponse {
    pub refunds: Vec<StripeRefundInfo>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessStripeRefundResponse {
    pub id: String,
    pub status: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refund: Option<StripeRefundInfo>,
}

/// GET /admin/stripe/refunds?limit={n}
pub async fn list_stripe_refunds(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Query(query): Query<ListStripeRefundsQuery>,
) -> impl IntoResponse {
    let limit = cap_limit_opt(query.limit, 50);
    match state
        .store
        .list_pending_stripe_refund_requests(&tenant.tenant_id, limit)
        .await
    {
        Ok(reqs) => {
            let mapped = reqs
                .into_iter()
                .map(|r| StripeRefundInfo {
                    id: r.id,
                    stripe_refund_id: r.stripe_refund_id,
                    charge_id: r.stripe_charge_id,
                    payment_intent_id: Some(r.stripe_payment_intent_id),
                    amount: r.amount,
                    currency: r.currency,
                    status: r.status,
                    reason: r.reason,
                    created_at: r.created_at,
                    metadata: if r.metadata.is_empty() {
                        None
                    } else {
                        Some(r.metadata)
                    },
                })
                .collect();

            json_ok(ListStripeRefundsResponse { refunds: mapped }).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to list Stripe refund requests");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to list Stripe refund requests".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// POST /admin/stripe/refunds/{refundId}/process
///
/// Stripe refunds are processed asynchronously by Stripe once created.
/// This endpoint refreshes the refund from Stripe and returns its current status.
pub async fn process_stripe_refund(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(refund_request_id): Path<String>,
) -> impl IntoResponse {
    let stripe = match state.stripe_client.as_ref() {
        Some(c) => c,
        None => {
            let (status, body) = error_response(
                ErrorCode::ServiceUnavailable,
                Some("Stripe not configured".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let mut req = match state
        .store
        .get_stripe_refund_request(&tenant.tenant_id, &refund_request_id)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("Refund request not found".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, refund_request_id = %refund_request_id, "Failed to load refund request");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to load refund request".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    if req.processed_at.is_some() || req.stripe_refund_id.is_some() {
        return json_ok(ProcessStripeRefundResponse {
            id: refund_request_id,
            status: req.status,
            message: "Refund request already processed".to_string(),
            refund: None,
        })
        .into_response();
    }

    let mut refund_metadata = req.metadata.clone();
    refund_metadata.insert("tenant_id".to_string(), tenant.tenant_id.clone());
    refund_metadata.insert("refund_request_id".to_string(), req.id.clone());
    refund_metadata.insert(
        "original_purchase_id".to_string(),
        req.original_purchase_id.clone(),
    );

    let idempotency_key = format!("refund_request:{}", req.id);

    let mut last_err: Option<crate::services::ServiceError> = None;
    let mut created = None;
    for attempt in 0..3 {
        match stripe
            .create_refund_for_payment_intent(
                &req.stripe_payment_intent_id,
                Some(req.amount),
                req.reason.as_deref(),
                refund_metadata.clone(),
                &idempotency_key,
            )
            .await
        {
            Ok(r) => {
                created = Some(r);
                last_err = None;
                break;
            }
            Err(e) => {
                last_err = Some(e);
                if attempt < 2 {
                    let delay_ms = 200u64 * (1u64 << attempt); // 200ms, 400ms, 800ms
                    tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
                }
            }
        }
    }

    match (created, last_err) {
        (Some(r), _) => {
            req.stripe_refund_id = Some(r.id.clone());
            req.stripe_charge_id = r.charge.clone();
            req.status = r.status.clone();
            req.processed_at = Some(Utc::now());
            req.processed_by = Some("admin".to_string());
            req.last_error = None;

            if let Err(e) = state.store.store_stripe_refund_request(req.clone()).await {
                tracing::error!(error = %e, refund_request_id = %refund_request_id, "Failed to persist processed refund request");
            }

            let info = StripeRefundInfo {
                id: req.id.clone(),
                stripe_refund_id: req.stripe_refund_id.clone(),
                charge_id: req.stripe_charge_id.clone(),
                payment_intent_id: Some(req.stripe_payment_intent_id.clone()),
                amount: req.amount,
                currency: req.currency.clone(),
                status: req.status.clone(),
                reason: req.reason.clone(),
                created_at: req.created_at,
                metadata: if r.metadata.is_empty() {
                    None
                } else {
                    Some(r.metadata)
                },
            };

            json_ok(ProcessStripeRefundResponse {
                id: refund_request_id,
                status: req.status.clone(),
                message: "Stripe refund created".to_string(),
                refund: Some(info),
            })
            .into_response()
        }
        (None, Some(e)) => {
            tracing::error!(error = %e, refund_request_id = %refund_request_id, "Failed to create Stripe refund");

            req.status = "failed".to_string();
            req.last_error = Some(e.to_string());
            let _ = state.store.store_stripe_refund_request(req).await;

            let (status, body) = error_response(
                ErrorCode::StripeError,
                Some("Failed to create Stripe refund".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
        (None, None) => {
            // Should be unreachable.
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to create Stripe refund".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
    use crate::storage::InMemoryStore;

    #[tokio::test]
    async fn test_list_stripe_refunds_does_not_require_stripe() {
        let store = Arc::new(InMemoryStore::new());
        let product_repo = Arc::new(InMemoryProductRepository::new(Vec::new()));
        let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));

        let state = Arc::new(AdminState {
            store,
            product_repo,
            coupon_repo,
            stripe_client: None,
        });

        let resp = list_stripe_refunds(
            State(state),
            TenantContext::default(),
            Query(ListStripeRefundsQuery { limit: None }),
        )
        .await
        .into_response();

        assert_eq!(resp.status(), axum::http::StatusCode::OK);
    }

    #[tokio::test]
    async fn test_process_stripe_refund_requires_stripe() {
        let store = Arc::new(InMemoryStore::new());
        let product_repo = Arc::new(InMemoryProductRepository::new(Vec::new()));
        let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));

        let state = Arc::new(AdminState {
            store,
            product_repo,
            coupon_repo,
            stripe_client: None,
        });

        let resp = process_stripe_refund(
            State(state),
            TenantContext::default(),
            Path("re_123".to_string()),
        )
        .await
        .into_response();

        assert_eq!(resp.status(), axum::http::StatusCode::SERVICE_UNAVAILABLE);
    }

    #[test]
    fn stripe_refund_status_includes_requires_action_in_docs() {
        // Stripe refund status can be: pending, requires_action, succeeded, failed, canceled.
        // https://docs.stripe.com/api/refunds/object
        let allowed = [
            "pending",
            "requires_action",
            "succeeded",
            "failed",
            "canceled",
        ];
        assert!(allowed.contains(&"requires_action"));
    }
}
