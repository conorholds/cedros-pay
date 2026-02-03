use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;

use crate::errors::validation::{validate_coupon_code, validate_resource_id};
use crate::errors::{error_response, ErrorCode};
use crate::handlers::paywall::AppState;
use crate::middleware::tenant::TenantContext;
use crate::storage::Store;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditsAuthorizeRequest {
    pub resource: String,
    pub hold_id: String,
    pub coupon_code: Option<String>,
    pub wallet: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CartCreditsAuthorizeRequest {
    pub hold_id: String,
    pub wallet: Option<String>,
}

/// POST /paywall/v1/credits/authorize
pub async fn authorize_credits<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreditsAuthorizeRequest>,
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
        .authorize_credits_for_user(
            &tenant.tenant_id,
            &req.resource,
            &req.hold_id,
            req.coupon_code.as_deref(),
            req.wallet.as_deref(),
            &user_id,
        )
        .await;

    match result {
        Ok(r) => (StatusCode::OK, Json(r)).into_response(),
        Err(e) => {
            let (status, body) = error_response(e.code(), Some(e.safe_message()), None);
            (status, Json(body)).into_response()
        }
    }
}

/// POST /paywall/v1/cart/:cartId/credits/authorize
pub async fn authorize_cart_credits<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    headers: axum::http::HeaderMap,
    Path(cart_id): Path<String>,
    Json(req): Json<CartCreditsAuthorizeRequest>,
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
        .authorize_cart_credits_for_user(
            &tenant.tenant_id,
            &cart_id,
            &req.hold_id,
            req.wallet.as_deref(),
            &user_id,
        )
        .await;

    match result {
        Ok(r) => (StatusCode::OK, Json(r)).into_response(),
        Err(e) => {
            let (status, body) = error_response(e.code(), Some(e.safe_message()), None);
            (status, Json(body)).into_response()
        }
    }
}
