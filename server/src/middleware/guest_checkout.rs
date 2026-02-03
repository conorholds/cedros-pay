use std::sync::Arc;

use axum::extract::State;
use axum::http::{header, Request, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use axum::Json;

use crate::errors::{error_response, ErrorCode};
use crate::handlers::paywall::AppState;
use crate::handlers::subscriptions::SubscriptionAppState;
use crate::storage::Store;

fn is_exempt_paywall_path(path: &str) -> bool {
    // When Router is nested, req.uri().path() still contains the full path.
    // Use suffix matching so this works with or without a route prefix.
    path.ends_with("/shop")
        || path.ends_with("/nonce")
        || path.ends_with("/refunds/approve")
        || path.ends_with("/refunds/deny")
        || path.ends_with("/refunds/pending")
}

async fn enforce_guest_checkout(
    guest_checkout_allowed: bool,
    paywall_service: &crate::services::PaywallService,
    headers: &axum::http::HeaderMap,
) -> Result<(), Response> {
    if guest_checkout_allowed {
        return Ok(());
    }

    let auth = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    let user_id = paywall_service.extract_user_id_from_auth_header(auth).await;
    if user_id.is_some() {
        return Ok(());
    }

    let (status, body) = error_response(
        ErrorCode::Unauthorized,
        Some("Account required for checkout".to_string()),
        None,
    );
    let status = if status == StatusCode::OK {
        StatusCode::UNAUTHORIZED
    } else {
        status
    };
    Err((status, Json(body)).into_response())
}

pub async fn paywall_guest_checkout_middleware<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    req: Request<axum::body::Body>,
    next: Next,
) -> Response {
    let path = req.uri().path();
    if is_exempt_paywall_path(path) {
        return next.run(req).await;
    }

    let allowed = state.paywall_service.config.shop.checkout.guest_checkout;
    if let Err(resp) = enforce_guest_checkout(allowed, &state.paywall_service, req.headers()).await
    {
        return resp;
    }

    next.run(req).await
}

pub async fn subscription_guest_checkout_middleware<S: Store + 'static>(
    State(state): State<Arc<SubscriptionAppState<S>>>,
    req: Request<axum::body::Body>,
    next: Next,
) -> Response {
    let allowed = state.paywall_service.config.shop.checkout.guest_checkout;
    if let Err(resp) = enforce_guest_checkout(allowed, &state.paywall_service, req.headers()).await
    {
        return resp;
    }
    next.run(req).await
}

#[cfg(test)]
mod tests {
    use super::is_exempt_paywall_path;

    #[test]
    fn test_exempt_paths_work_with_prefix() {
        assert!(is_exempt_paywall_path("/paywall/v1/shop"));
        assert!(is_exempt_paywall_path("/paywall/v1/nonce"));
        assert!(is_exempt_paywall_path("/paywall/v1/refunds/approve"));
        assert!(is_exempt_paywall_path("/paywall/v1/refunds/deny"));
        assert!(is_exempt_paywall_path("/paywall/v1/refunds/pending"));
    }

    #[test]
    fn test_exempt_paths_work_without_prefix() {
        assert!(is_exempt_paywall_path("/shop"));
        assert!(is_exempt_paywall_path("/nonce"));
        assert!(is_exempt_paywall_path("/refunds/approve"));
        assert!(is_exempt_paywall_path("/refunds/deny"));
        assert!(is_exempt_paywall_path("/refunds/pending"));
    }
}
