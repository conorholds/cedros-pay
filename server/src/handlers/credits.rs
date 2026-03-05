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
use crate::storage::{Store, StorageError};

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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditsBalanceResponse {
    pub available: i64,
    pub held: i64,
    pub currency: String,
}

/// GET /paywall/v1/credits/balance
///
/// Returns the authenticated user's credits balance.
/// Requires Authorization header with cedros-login JWT.
pub async fn get_credits_balance<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    headers: axum::http::HeaderMap,
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

    match state
        .paywall_service
        .check_credits_balance(&user_id)
        .await
    {
        Ok(balance) => (
            StatusCode::OK,
            Json(serde_json::json!(CreditsBalanceResponse {
                available: balance.available,
                held: balance.held,
                currency: balance.currency,
            })),
        )
            .into_response(),
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some(format!("failed to fetch balance: {e}")),
                None,
            );
            (status, Json(body)).into_response()
        }
    }
}

/// Public view of a pending gift card redemption (no buyer info exposed).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GiftCardClaimInfo {
    pub face_value_cents: i64,
    pub currency: String,
    pub claimed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recipient_email: Option<String>,
}

/// GET /paywall/v1/gift-card/claim/{token}
///
/// Returns public gift card info for the redemption token.
/// No authentication required — used to show what the recipient is about to claim.
pub async fn get_gift_card_claim<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    _tenant: TenantContext,
    Path(token): Path<String>,
) -> impl IntoResponse {
    match state.store.get_gift_card_redemption_by_token(&token).await {
        Ok(Some(r)) => (
            StatusCode::OK,
            Json(serde_json::json!(GiftCardClaimInfo {
                face_value_cents: r.face_value_cents,
                currency: r.currency,
                claimed: r.claimed,
                recipient_email: r.recipient_email,
            })),
        )
            .into_response(),
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("gift card claim token not found".into()),
                None,
            );
            (status, Json(body)).into_response()
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some(format!("failed to look up claim token: {e}")),
                None,
            );
            (status, Json(body)).into_response()
        }
    }
}

/// POST /paywall/v1/gift-card/claim/{token}
///
/// Claims the gift card for the authenticated user.
/// Requires a valid cedros-login JWT in the Authorization header.
/// Deposits credits to the authenticated user and marks the redemption as claimed.
pub async fn claim_gift_card<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    _tenant: TenantContext,
    headers: axum::http::HeaderMap,
    Path(token): Path<String>,
) -> impl IntoResponse {
    // Extract user_id from JWT
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

    // Look up the pending redemption
    let redemption = match state.store.get_gift_card_redemption_by_token(&token).await {
        Ok(Some(r)) => r,
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("gift card claim token not found".into()),
                None,
            );
            return (status, Json(body)).into_response();
        }
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some(format!("failed to look up claim token: {e}")),
                None,
            );
            return (status, Json(body)).into_response();
        }
    };

    if redemption.claimed {
        let (status, body) = error_response(
            ErrorCode::InvalidOperation,
            Some("gift card has already been claimed".into()),
            None,
        );
        return (status, Json(body)).into_response();
    }

    // Deposit credits to authenticated user
    let credits_balance = match state
        .paywall_service
        .add_credits_for_gift_card(
            &user_id,
            redemption.face_value_cents,
            &redemption.currency,
            &redemption.id,
        )
        .await
    {
        Ok(b) => b,
        Err(e) => {
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some(format!("failed to deposit gift card credits: {e}")),
                None,
            );
            return (status, Json(body)).into_response();
        }
    };

    // Mark redemption as claimed
    match state
        .store
        .claim_gift_card_redemption(&redemption.id, &user_id, redemption.face_value_cents)
        .await
    {
        Ok(()) => {}
        Err(StorageError::Conflict) => {
            // Race: another request claimed it first — credits already deposited above.
            // Log but return success since the user got their credits.
            tracing::warn!(
                redemption_id = %redemption.id,
                user_id = %user_id,
                "Gift card claim conflict — already claimed by concurrent request"
            );
        }
        Err(e) => {
            tracing::error!(
                error = %e,
                redemption_id = %redemption.id,
                user_id = %user_id,
                "CRITICAL: credits deposited but failed to mark gift card as claimed"
            );
        }
    }

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "creditsAdded": redemption.face_value_cents,
            "currency": redemption.currency,
            "newBalance": credits_balance.available,
        })),
    )
        .into_response()
}
