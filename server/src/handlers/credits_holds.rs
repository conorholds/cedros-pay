use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

use crate::errors::validation::{validate_coupon_code, validate_resource_id};
use crate::errors::{error_response, ErrorCode};
use crate::handlers::paywall::AppState;
use crate::middleware::tenant::TenantContext;
use crate::storage::Store;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditsHoldCreateRequest {
    pub resource: String,
    pub coupon_code: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CartCreditsHoldCreateRequest {}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditsHoldCreateResponse {
    pub hold_id: String,
    pub resource: String,
    pub amount: i64,
    pub currency: String,
    pub expires_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CartCreditsHoldCreateResponse {
    pub cart_id: String,
    pub hold_id: String,
    pub amount: i64,
    pub currency: String,
    pub expires_at: String,
}

/// POST /paywall/v1/credits/hold
pub async fn create_credits_hold<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreditsHoldCreateRequest>,
) -> impl IntoResponse {
    if let Err(e) = validate_resource_id(&req.resource) {
        let (status, body) = error_response(
            ErrorCode::InvalidResource,
            Some(e.message),
            Some(serde_json::json!({ "field": e.field })),
        );
        return (status, Json(body)).into_response();
    }

    if let Some(ref code) = req.coupon_code {
        if let Err(e) = validate_coupon_code(code) {
            let (status, body) = error_response(
                ErrorCode::InvalidCoupon,
                Some(e.message),
                Some(serde_json::json!({ "field": e.field })),
            );
            return (status, Json(body)).into_response();
        }
    }

    let auth = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    let user_id = match state
        .paywall_service
        .extract_user_id_from_auth_header(auth)
        .await
    {
        Some(id) => id,
        None => {
            let (status, body) = error_response(
                ErrorCode::Unauthorized,
                Some("missing or invalid authorization".into()),
                None,
            );
            return (status, Json(body)).into_response();
        }
    };

    let result = state
        .paywall_service
        .create_credits_hold_for_user(
            &tenant.tenant_id,
            &req.resource,
            req.coupon_code.as_deref(),
            &user_id,
        )
        .await;

    match result {
        Ok(hold) => (
            StatusCode::OK,
            Json(CreditsHoldCreateResponse {
                hold_id: hold.hold_id,
                resource: hold.resource_id,
                amount: hold.amount,
                currency: hold.amount_asset,
                expires_at: hold.expires_at.to_rfc3339(),
            }),
        )
            .into_response(),
        Err(e) => {
            let (status, body) = error_response(e.code(), Some(e.safe_message()), None);
            (status, Json(body)).into_response()
        }
    }
}

/// POST /paywall/v1/cart/:cartId/credits/hold
pub async fn create_cart_credits_hold<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    headers: axum::http::HeaderMap,
    Path(cart_id): Path<String>,
    Json(_req): Json<CartCreditsHoldCreateRequest>,
) -> impl IntoResponse {
    let auth = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    let user_id = match state
        .paywall_service
        .extract_user_id_from_auth_header(auth)
        .await
    {
        Some(id) => id,
        None => {
            let (status, body) = error_response(
                ErrorCode::Unauthorized,
                Some("missing or invalid authorization".into()),
                None,
            );
            return (status, Json(body)).into_response();
        }
    };

    let result = state
        .paywall_service
        .create_cart_credits_hold_for_user(&tenant.tenant_id, &cart_id, &user_id)
        .await;

    match result {
        Ok(hold) => (
            StatusCode::OK,
            Json(CartCreditsHoldCreateResponse {
                cart_id,
                hold_id: hold.hold_id,
                amount: hold.amount,
                currency: hold.amount_asset,
                expires_at: hold.expires_at.to_rfc3339(),
            }),
        )
            .into_response(),
        Err(e) => {
            let (status, body) = error_response(e.code(), Some(e.safe_message()), None);
            (status, Json(body)).into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use axum::extract::{Path, State};
    use axum::response::IntoResponse;

    use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
    use crate::storage::InMemoryStore;
    use crate::webhooks::NoopNotifier;
    use crate::{Config, NoopVerifier};

    #[tokio::test]
    async fn test_create_credits_hold_requires_authorization() {
        let cfg = Config::default();
        let store = Arc::new(InMemoryStore::new());

        let paywall_service = Arc::new(crate::services::PaywallService::new(
            cfg,
            store.clone(),
            Arc::new(NoopVerifier),
            Arc::new(NoopNotifier),
            Arc::new(InMemoryProductRepository::new(Vec::new())),
            Arc::new(InMemoryCouponRepository::new(Vec::new())),
        ));

        let state = Arc::new(crate::handlers::paywall::AppState {
            store: store.clone(),
            paywall_service,
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            stripe_client: None,
            stripe_webhook_processor: None,
            admin_public_keys: Vec::new(),
            blockhash_cache: None,
        });

        let response = create_credits_hold::<InMemoryStore>(
            State(state),
            TenantContext::default(),
            axum::http::HeaderMap::new(),
            Json(CreditsHoldCreateRequest {
                resource: "product-1".to_string(),
                coupon_code: None,
            }),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[tokio::test]
    async fn test_create_cart_credits_hold_requires_authorization() {
        let cfg = Config::default();
        let store = Arc::new(InMemoryStore::new());

        let paywall_service = Arc::new(crate::services::PaywallService::new(
            cfg,
            store.clone(),
            Arc::new(NoopVerifier),
            Arc::new(NoopNotifier),
            Arc::new(InMemoryProductRepository::new(Vec::new())),
            Arc::new(InMemoryCouponRepository::new(Vec::new())),
        ));

        let state = Arc::new(crate::handlers::paywall::AppState {
            store: store.clone(),
            paywall_service,
            product_repo: Arc::new(InMemoryProductRepository::new(Vec::new())),
            stripe_client: None,
            stripe_webhook_processor: None,
            admin_public_keys: Vec::new(),
            blockhash_cache: None,
        });

        let response = create_cart_credits_hold::<InMemoryStore>(
            State(state),
            TenantContext::default(),
            axum::http::HeaderMap::new(),
            Path("cart-1".to_string()),
            Json(CartCreditsHoldCreateRequest {}),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
}
