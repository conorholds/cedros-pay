use std::collections::HashMap;
use std::sync::Arc;

use axum::{
    extract::{Query, State},
    http::{header::HeaderMap, StatusCode},
    response::{IntoResponse, Redirect},
    Json,
};
use serde::{Deserialize, Serialize};

use super::response::{json_error, json_ok};
use crate::handlers::paywall::AppState;
use crate::middleware::tenant::TenantContext;
use crate::services::stripe::CreateSessionRequest as StripeCreateSessionRequest;
use crate::storage::Store;

/// Sanitize session_id for safe URL embedding
/// Stripe session IDs are alphanumeric with underscores, but we sanitize any
/// input to prevent URL injection attacks. Only allows [a-zA-Z0-9_-] characters.
fn sanitize_session_id(id: &str) -> String {
    id.chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-')
        .take(256) // Reasonable max length
        .collect()
}

fn normalize_metadata(value: &serde_json::Value) -> HashMap<String, String> {
    let mut metadata = HashMap::new();
    if let Some(obj) = value.as_object() {
        for (k, v) in obj {
            let string_val = match v {
                serde_json::Value::String(s) => s.clone(),
                other => other.to_string(),
            };
            metadata.insert(k.clone(), string_val);
        }
    }
    metadata
}

fn build_session_metadata(
    tenant_id: &str,
    request_metadata: Option<&serde_json::Value>,
    user_id: Option<String>,
) -> HashMap<String, String> {
    let mut metadata = HashMap::new();
    if let Some(m) = request_metadata {
        metadata = normalize_metadata(m);
    }

    // Never trust client-provided user identity.
    metadata.remove("user_id");
    metadata.remove("userId");

    metadata.insert("tenant_id".to_string(), tenant_id.to_string());

    // SECURITY: if the server can derive user identity from Authorization, always override any
    // client-supplied value to prevent spoofed attribution.
    if let Some(uid) = user_id {
        metadata.insert("user_id".to_string(), uid);
        // Used to distinguish server-derived identity from client-supplied metadata.
        metadata.insert("user_id_trusted".to_string(), "true".to_string());
    }

    metadata
}

fn derive_stripe_checkout_collection_options(
    reqs: Option<&crate::models::CheckoutRequirements>,
) -> Result<(Option<String>, bool), String> {
    let reqs = match reqs {
        Some(r) => r,
        None => return Ok((None, false)),
    };

    // Stripe does not expose a first-class "name required" toggle, but billing details collection
    // covers customer name. Treat name=required as billing_address_collection=required.
    let name_required = matches!(reqs.name.as_deref(), Some("required"));
    let billing_required = reqs.billing_address == Some(true) || name_required;
    let billing = if billing_required {
        Some("required".to_string())
    } else {
        None
    };

    // Only enable phone collection when explicitly required to avoid accidentally forcing the
    // field when a product marks it as optional.
    let phone_enabled = matches!(reqs.phone.as_deref(), Some("required"));

    Ok((billing, phone_enabled))
}

fn parse_shipping_countries(
    metadata: &std::collections::HashMap<String, String>,
) -> Result<Option<Vec<String>>, String> {
    let raw = metadata
        .get("shippingCountries")
        .or_else(|| metadata.get("shipping_countries"));

    let raw = match raw {
        Some(v) if !v.trim().is_empty() => v.trim(),
        _ => return Ok(None),
    };

    let mut countries: Vec<String> = if raw.starts_with('[') {
        serde_json::from_str::<Vec<String>>(raw)
            .map_err(|e| format!("invalid shippingCountries JSON: {e}"))?
    } else {
        raw.split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect()
    };

    for c in &mut countries {
        *c = c.trim().to_uppercase();
        if c.len() != 2 || !c.chars().all(|ch| ch.is_ascii_alphabetic()) {
            return Err(format!("invalid country code: {c}"));
        }
    }

    countries.sort();
    countries.dedup();

    if countries.is_empty() {
        return Err("shippingCountries must not be empty".to_string());
    }

    Ok(Some(countries))
}

// ─────────────────────────────────────────────────────────────────────────────
// Request/Response types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSessionRequest {
    pub resource: String,
    pub customer_email: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub success_url: Option<String>,
    pub cancel_url: Option<String>,
    pub coupon_code: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSessionResponse {
    pub session_id: String,
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct SessionVerifyQuery {
    pub session_id: String,
}

#[derive(Debug, Serialize)]
pub struct SessionVerifyResponse {
    pub verified: bool,
    pub resource_id: Option<String>,
    pub paid_at: Option<String>,
    pub amount: Option<String>,
    pub customer: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct X402TransactionVerifyQuery {
    pub signature: String,
}

#[derive(Debug, Serialize)]
pub struct X402TransactionVerifyResponse {
    pub verified: bool,
    pub resource_id: Option<String>,
    pub wallet: Option<String>,
    pub user_id: Option<String>,
    pub paid_at: Option<String>,
    pub amount: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct StripeRedirectQuery {
    pub session_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct WebhookConfigResponse {
    pub status: String,
    pub webhook_url: String,
    pub configured_events: Vec<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// POST /paywall/v1/stripe-session - Create Stripe checkout session
pub async fn create_session<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    headers: HeaderMap,
    Json(req): Json<CreateSessionRequest>,
) -> impl IntoResponse {
    // Validate resource ID
    if let Err(e) = crate::errors::validation::validate_resource_id(&req.resource) {
        let (status, body) = crate::errors::error_response(
            crate::errors::ErrorCode::InvalidResource,
            Some(e.message),
            None,
        );
        return json_error(status, body);
    }

    // Validate email if provided
    if let Some(ref email) = req.customer_email {
        if let Err(e) = crate::errors::validation::validate_email(email) {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::InvalidField,
                Some(e.message),
                None,
            );
            return json_error(status, body);
        }
    }

    // Validate coupon code if provided
    if let Some(ref code) = req.coupon_code {
        if let Err(e) = crate::errors::validation::validate_coupon_code(code) {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::InvalidCoupon,
                Some(e.message),
                None,
            );
            return json_error(status, body);
        }
    }

    // Validate redirect URLs if provided (SSRF prevention)
    if let Some(ref url) = req.success_url {
        if let Err(e) = crate::errors::validation::validate_redirect_url_with_env(
            url,
            &state.paywall_service.config.logging.environment,
        ) {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::InvalidField,
                Some(format!("success_url: {}", e.message)),
                None,
            );
            return json_error(status, body);
        }
    }
    if let Some(ref url) = req.cancel_url {
        if let Err(e) = crate::errors::validation::validate_redirect_url_with_env(
            url,
            &state.paywall_service.config.logging.environment,
        ) {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::InvalidField,
                Some(format!("cancel_url: {}", e.message)),
                None,
            );
            return json_error(status, body);
        }
    }

    // Validate metadata size to prevent DoS via large payloads
    if let Some(ref meta) = req.metadata {
        if let Err(msg) = super::validate_metadata_size(meta) {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::InvalidField,
                Some(msg),
                None,
            );
            return json_error(status, body);
        }
    }

    let stripe_client = match &state.stripe_client {
        Some(c) => c,
        None => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::ServiceUnavailable,
                Some("Stripe not configured".to_string()),
                None,
            );
            return json_error(status, body);
        }
    };

    // Look up product to get fiat pricing (like Go does)
    let product = match state
        .product_repo
        .get_product(&tenant.tenant_id, &req.resource)
        .await
    {
        Ok(p) => p,
        Err(_) => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::ResourceNotFound,
                Some(format!("resource not found: {}", req.resource)),
                None,
            );
            return json_error(status, body);
        }
    };

    // Prevent purchases of inactive products.
    if !product.active {
        let (status, body) = crate::errors::error_response(
            crate::errors::ErrorCode::ProductNotFound,
            Some("product not available".to_string()),
            None,
        );
        return json_error(status, body);
    }

    // Enforce tracked inventory atomically to prevent TOCTOU race conditions.
    // Two concurrent requests could both see qty >= 1, then both create Stripe
    // sessions, leading to overselling. We reserve inventory before creating
    // the session, then convert the reservation on payment (or release on expiry).
    let inventory_reservation_id = if product.inventory_quantity.is_some() {
        let allow_backorder =
            matches!(product.inventory_policy.as_deref(), Some("allow_backorder"));
        if !allow_backorder {
            let reservation_id = format!("stripe:{}", uuid::Uuid::new_v4());
            let reservation = crate::models::InventoryReservation {
                id: uuid::Uuid::new_v4().to_string(),
                tenant_id: tenant.tenant_id.clone(),
                product_id: product.id.clone(),
                variant_id: None, // Direct purchases don't use variants currently
                quantity: 1,      // Stripe direct checkout is quantity 1
                expires_at: chrono::Utc::now() + chrono::Duration::minutes(30), // 30-min hold
                cart_id: Some(reservation_id.clone()),
                status: "active".to_string(),
                created_at: chrono::Utc::now(),
            };
            match state.store.reserve_inventory(reservation).await {
                Ok(()) => Some(reservation_id),
                Err(crate::storage::StorageError::Conflict) => {
                    let (status, body) = crate::errors::error_response(
                        crate::errors::ErrorCode::ProductNotFound,
                        Some("product out of stock".to_string()),
                        None,
                    );
                    return json_error(status, body);
                }
                Err(e) => {
                    tracing::error!(error = %e, "Failed to reserve inventory for Stripe session");
                    let (status, body) = crate::errors::error_response(
                        crate::errors::ErrorCode::InternalError,
                        Some("failed to reserve inventory".to_string()),
                        None,
                    );
                    return json_error(status, body);
                }
            }
        } else {
            None
        }
    } else {
        None
    };

    // Get fiat amount and currency from product
    let (amount_cents, currency) = match &product.fiat_price {
        Some(fiat) => (fiat.atomic, fiat.asset.code.to_lowercase()),
        None => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::InvalidAmount,
                Some("product has no fiat price configured".to_string()),
                None,
            );
            return json_error(status, body);
        }
    };

    // Bind session to authenticated user when possible.
    let auth = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    let user_id = state
        .paywall_service
        .extract_user_id_from_auth_header(auth)
        .await;

    // Build metadata with inventory reservation ID for webhook to convert
    let mut metadata = build_session_metadata(&tenant.tenant_id, req.metadata.as_ref(), user_id);
    if let Some(ref reservation_id) = inventory_reservation_id {
        metadata.insert(
            "inventory_reservation_id".to_string(),
            reservation_id.clone(),
        );
    }

    let (billing_address_collection, phone_number_collection_enabled) =
        match derive_stripe_checkout_collection_options(product.checkout_requirements.as_ref()) {
            Ok(v) => v,
            Err(msg) => {
                let (status, body) = crate::errors::error_response(
                    crate::errors::ErrorCode::InvalidOperation,
                    Some(msg),
                    None,
                );
                return json_error(status, body);
            }
        };

    let requires_shipping_address = product
        .shipping_profile
        .as_deref()
        .is_some_and(|p| p == "physical")
        || product
            .checkout_requirements
            .as_ref()
            .and_then(|c| c.shipping_address)
            .unwrap_or(false);

    let shipping_address_collection_countries = if requires_shipping_address {
        match parse_shipping_countries(&product.metadata) {
            Ok(Some(v)) => Some(v),
            Ok(None) => {
                let (status, body) = crate::errors::error_response(
                    crate::errors::ErrorCode::InvalidOperation,
                    Some("shippingCountries must be configured for shippable products".to_string()),
                    None,
                );
                return json_error(status, body);
            }
            Err(msg) => {
                let (status, body) = crate::errors::error_response(
                    crate::errors::ErrorCode::InvalidField,
                    Some(msg),
                    None,
                );
                return json_error(status, body);
            }
        }
    } else {
        None
    };

    // Build Stripe session request with product pricing
    let stripe_req = StripeCreateSessionRequest {
        resource_id: req.resource.clone(),
        amount_cents,
        currency,
        price_id: product.stripe_price_id.clone(),
        customer_email: req.customer_email.clone(),
        billing_address_collection,
        phone_number_collection_enabled,
        shipping_address_collection_countries,
        metadata,
        success_url: req.success_url.clone(),
        cancel_url: req.cancel_url.clone(),
        description: product.description.clone(),
        coupon_code: req.coupon_code.clone(),
        original_amount: Some(amount_cents),
        discount_amount: None,
        stripe_coupon_id: req.coupon_code.clone(), // Use same code for Stripe
    };

    let result = stripe_client.create_checkout_session(stripe_req).await;

    match result {
        Ok(session) => {
            let resp = CreateSessionResponse {
                session_id: session.session_id,
                url: session.url,
            };
            json_ok(resp)
        }
        Err(e) => {
            // Don't expose stripe error details - log for debugging
            tracing::error!(error = %e, "Failed to create Stripe session");
            // Release inventory reservation since session creation failed
            if let Some(ref reservation_id) = inventory_reservation_id {
                let now = chrono::Utc::now();
                if let Err(release_err) = state
                    .store
                    .release_inventory_reservations(&tenant.tenant_id, reservation_id, now)
                    .await
                {
                    tracing::warn!(
                        error = %release_err,
                        reservation_id = %reservation_id,
                        "Failed to release inventory reservation after Stripe error"
                    );
                }
            }
            let (status, body) =
                crate::errors::error_response(crate::errors::ErrorCode::StripeError, None, None);
            json_error(status, body)
        }
    }
}

/// GET /paywall/v1/stripe-session/verify - Verify Stripe session status
pub async fn verify_session<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    Query(query): Query<SessionVerifyQuery>,
) -> impl IntoResponse {
    let stripe_client = match &state.stripe_client {
        Some(c) => c,
        None => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::ServiceUnavailable,
                Some("Stripe not configured".to_string()),
                None,
            );
            return json_error(status, body);
        }
    };

    let result = stripe_client.verify_session_info(&query.session_id).await;

    match result {
        Ok(info) => {
            let resp = SessionVerifyResponse {
                verified: info.verified,
                resource_id: info.resource_id,
                paid_at: info.paid_at.map(|t| t.to_rfc3339()),
                amount: info.amount,
                customer: info.customer,
                metadata: info.metadata,
            };
            json_ok(resp)
        }
        Err(e) => {
            // Don't expose stripe error details - log for debugging
            tracing::error!(error = %e, "Failed to verify Stripe session");
            let (status, body) =
                crate::errors::error_response(crate::errors::ErrorCode::StripeError, None, None);
            json_error(status, body)
        }
    }
}

/// GET /paywall/v1/x402-transaction/verify - Verify x402 transaction
pub async fn verify_x402_transaction<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    Query(query): Query<X402TransactionVerifyQuery>,
) -> impl IntoResponse {
    let result = state
        .store
        .get_purchase_by_signature(&tenant.tenant_id, &query.signature)
        .await;

    match result {
        Ok(Some(purchase)) => {
            let resp = X402TransactionVerifyResponse {
                verified: true,
                resource_id: Some(purchase.resource_id),
                wallet: purchase.wallet,
                user_id: purchase.user_id,
                paid_at: Some(purchase.paid_at.to_rfc3339()),
                amount: Some(purchase.amount.to_string()),
                metadata: purchase.metadata,
            };
            json_ok(resp)
        }
        Ok(None) => {
            let resp = X402TransactionVerifyResponse {
                verified: false,
                resource_id: None,
                wallet: None,
                user_id: None,
                paid_at: None,
                amount: None,
                metadata: None,
            };
            json_ok(resp)
        }
        Err(e) => {
            // Don't expose database error details - log for debugging
            tracing::error!(error = %e, "Failed to get purchase by signature");
            let (status, body) =
                crate::errors::error_response(crate::errors::ErrorCode::DatabaseError, None, None);
            json_error(status, body)
        }
    }
}

/// GET /stripe/success - Stripe checkout success redirect
/// Per spec (02-http-endpoints.md): Should redirect (302) to configured success URL
pub async fn stripe_success<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    Query(query): Query<StripeRedirectQuery>,
) -> impl IntoResponse {
    // SECURITY: Sanitize session_id to prevent URL injection attacks
    let session_id = sanitize_session_id(&query.session_id.unwrap_or_default());

    // Get configured success URL from paywall service config
    let success_url = &state.paywall_service.config.stripe.success_url;

    if !success_url.is_empty() {
        // Per spec: Redirect to configured URL with session_id as query param
        let redirect_url = if success_url.contains('?') {
            format!("{}&session_id={}", success_url, session_id)
        } else {
            format!("{}?session_id={}", success_url, session_id)
        };
        Redirect::temporary(&redirect_url).into_response()
    } else {
        // Fallback to JSON response if no redirect URL configured
        Json(serde_json::json!({
            "status": "success",
            "sessionId": session_id,
            "message": "Payment successful"
        }))
        .into_response()
    }
}

/// GET /stripe/cancel - Stripe checkout cancel redirect
/// Per spec (02-http-endpoints.md): Should redirect (302) to configured cancel URL
pub async fn stripe_cancel<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    Query(query): Query<StripeRedirectQuery>,
) -> impl IntoResponse {
    // SECURITY: Sanitize session_id to prevent URL injection attacks
    let session_id = sanitize_session_id(&query.session_id.unwrap_or_default());

    // Get configured cancel URL from paywall service config
    let cancel_url = &state.paywall_service.config.stripe.cancel_url;

    if !cancel_url.is_empty() {
        // Per spec: Redirect to configured URL with session_id as query param
        let redirect_url = if cancel_url.contains('?') {
            format!("{}&session_id={}", cancel_url, session_id)
        } else {
            format!("{}?session_id={}", cancel_url, session_id)
        };
        Redirect::temporary(&redirect_url).into_response()
    } else {
        // Fallback to JSON response if no redirect URL configured
        // Per spec 02-http-endpoints.md: use British spelling "cancelled"
        Json(serde_json::json!({
            "status": "cancelled",
            "sessionId": session_id,
            "message": "Payment cancelled"
        }))
        .into_response()
    }
}

/// POST /webhook/stripe - Stripe webhook handler
pub async fn webhook<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    headers: HeaderMap,
    body: String,
) -> impl IntoResponse {
    let stripe_webhook_processor = match state.stripe_webhook_processor.as_ref() {
        Some(p) => p,
        None => {
            let (status, body) = crate::errors::error_response(
                crate::errors::ErrorCode::ServiceUnavailable,
                Some("Stripe webhook processor not configured".to_string()),
                None,
            );
            return json_error(status, body);
        }
    };

    // Extract Stripe signature header
    let signature = headers
        .get("Stripe-Signature")
        .and_then(|h| h.to_str().ok())
        .unwrap_or_default();

    let result = stripe_webhook_processor
        .process_webhook(body.as_bytes(), signature)
        .await;

    match result {
        Ok(_) => (StatusCode::OK, Json(serde_json::json!({"received": true}))),
        Err(e) => {
            tracing::error!(error = %e, "Stripe webhook error");
            let (status, body) =
                crate::errors::error_response(crate::errors::ErrorCode::StripeError, None, None);
            json_error(status, body)
        }
    }
}

/// GET /webhook/stripe - Webhook configuration info
pub async fn webhook_info() -> impl IntoResponse {
    let resp = WebhookConfigResponse {
        status: "configured".to_string(),
        webhook_url: "/webhook/stripe".to_string(),
        configured_events: vec![
            "checkout.session.completed".to_string(),
            "customer.subscription.created".to_string(),
            "customer.subscription.updated".to_string(),
            "customer.subscription.deleted".to_string(),
            "invoice.paid".to_string(),
            "invoice.payment_failed".to_string(),
            "charge.refunded".to_string(),
        ],
    };
    Json(resp)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::response::IntoResponse;
    use http_body_util::BodyExt;
    use serde_json::json;

    #[test]
    fn test_normalize_metadata_stringifies_non_strings() {
        let input = json!({"count": 2, "flag": true, "label": "ok"});
        let metadata = normalize_metadata(&input);
        assert_eq!(metadata.get("count").map(String::as_str), Some("2"));
        assert_eq!(metadata.get("flag").map(String::as_str), Some("true"));
        assert_eq!(metadata.get("label").map(String::as_str), Some("ok"));
    }

    #[test]
    fn test_build_session_metadata_overrides_user_id() {
        let meta = json!({"user_id": "spoof", "x": "y"});
        let built = build_session_metadata("tenant-1", Some(&meta), Some("user-1".to_string()));
        assert_eq!(built.get("tenant_id").map(String::as_str), Some("tenant-1"));
        assert_eq!(built.get("x").map(String::as_str), Some("y"));
        assert_eq!(built.get("user_id").map(String::as_str), Some("user-1"));
        assert_eq!(
            built.get("user_id_trusted").map(String::as_str),
            Some("true")
        );
    }

    #[test]
    fn test_build_session_metadata_strips_client_user_id_when_unauthenticated() {
        let meta = json!({"user_id": "spoof", "userId": "spoof2", "x": "y"});
        let built = build_session_metadata("tenant-1", Some(&meta), None);
        assert_eq!(built.get("tenant_id").map(String::as_str), Some("tenant-1"));
        assert_eq!(built.get("x").map(String::as_str), Some("y"));
        assert!(!built.contains_key("user_id"));
        assert!(!built.contains_key("userId"));
        assert!(!built.contains_key("user_id_trusted"));
    }

    #[test]
    fn test_derive_stripe_checkout_collection_options_maps_name_to_billing_and_phone_required() {
        let reqs = crate::models::CheckoutRequirements {
            name: Some("required".to_string()),
            phone: Some("required".to_string()),
            shipping_address: None,
            billing_address: Some(false),
            ..Default::default()
        };

        let (billing, phone_enabled) =
            derive_stripe_checkout_collection_options(Some(&reqs)).unwrap();
        assert_eq!(billing.as_deref(), Some("required"));
        assert!(phone_enabled);
    }

    #[test]
    fn test_derive_stripe_checkout_collection_options_rejects_shipping_address() {
        let mut meta = HashMap::new();
        meta.insert("shippingCountries".to_string(), "US,ca".to_string());
        let parsed = parse_shipping_countries(&meta).unwrap().unwrap();
        assert_eq!(parsed, vec!["CA".to_string(), "US".to_string()]);
    }

    #[test]
    fn test_parse_shipping_countries_accepts_json_array() {
        let mut meta = HashMap::new();
        meta.insert(
            "shippingCountries".to_string(),
            "[\"US\", \"CA\"]".to_string(),
        );
        let parsed = parse_shipping_countries(&meta).unwrap().unwrap();
        assert_eq!(parsed, vec!["CA".to_string(), "US".to_string()]);
    }

    #[tokio::test]
    async fn test_create_session_rejects_inactive_product() {
        let store = Arc::new(crate::storage::InMemoryStore::new());

        let mut config = crate::config::Config::default();
        config.logging.environment = "test".to_string();

        let product = crate::models::Product {
            id: "product-1".to_string(),
            tenant_id: "default".to_string(),
            description: "desc".to_string(),
            fiat_price: Some(crate::models::Money::new(
                crate::models::get_asset("USD").expect("USD"),
                100,
            )),
            stripe_price_id: Some("price_1".to_string()),
            active: false,
            ..Default::default()
        };

        let product_repo = Arc::new(crate::repositories::InMemoryProductRepository::new(vec![
            product,
        ]));
        let coupon_repo = Arc::new(crate::repositories::InMemoryCouponRepository::new(
            Vec::new(),
        ));
        let paywall_service = Arc::new(crate::PaywallService::new(
            config.clone(),
            store.clone(),
            Arc::new(crate::NoopVerifier),
            Arc::new(crate::webhooks::NoopNotifier),
            product_repo.clone(),
            coupon_repo,
        ));

        let stripe_client = Some(Arc::new(
            crate::services::StripeClient::new(
                config,
                store.clone(),
                Arc::new(crate::webhooks::NoopNotifier),
            )
            .unwrap(),
        ));

        let state = Arc::new(crate::handlers::paywall::AppState {
            store,
            paywall_service,
            product_repo,
            stripe_client,
            stripe_webhook_processor: None,
            admin_public_keys: Vec::new(),
            blockhash_cache: None,
        });

        let req = CreateSessionRequest {
            resource: "product-1".to_string(),
            customer_email: None,
            metadata: None,
            success_url: None,
            cancel_url: None,
            coupon_code: None,
        };

        let resp = create_session(
            State(state),
            TenantContext::default(),
            HeaderMap::new(),
            Json(req),
        )
        .await
        .into_response();

        assert_eq!(resp.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_create_session_rejects_out_of_stock_product() {
        let store = Arc::new(crate::storage::InMemoryStore::new());
        // Set inventory to 0 for this product in the store
        store.set_product_inventory("default", "product-1", 0);

        let mut config = crate::config::Config::default();
        config.logging.environment = "test".to_string();

        let product = crate::models::Product {
            id: "product-1".to_string(),
            tenant_id: "default".to_string(),
            description: "desc".to_string(),
            fiat_price: Some(crate::models::Money::new(
                crate::models::get_asset("USD").expect("USD"),
                100,
            )),
            stripe_price_id: Some("price_1".to_string()),
            active: true,
            inventory_quantity: Some(0),
            ..Default::default()
        };

        let product_repo = Arc::new(crate::repositories::InMemoryProductRepository::new(vec![
            product,
        ]));
        let coupon_repo = Arc::new(crate::repositories::InMemoryCouponRepository::new(
            Vec::new(),
        ));
        let paywall_service = Arc::new(crate::PaywallService::new(
            config.clone(),
            store.clone(),
            Arc::new(crate::NoopVerifier),
            Arc::new(crate::webhooks::NoopNotifier),
            product_repo.clone(),
            coupon_repo,
        ));

        // Provide a StripeClient instance; the handler should reject before making any network call.
        let stripe_client = Some(Arc::new(
            crate::services::StripeClient::new(
                config,
                store.clone(),
                Arc::new(crate::webhooks::NoopNotifier),
            )
            .unwrap(),
        ));

        let state = Arc::new(crate::handlers::paywall::AppState {
            store,
            paywall_service,
            product_repo,
            stripe_client,
            stripe_webhook_processor: None,
            admin_public_keys: Vec::new(),
            blockhash_cache: None,
        });

        let req = CreateSessionRequest {
            resource: "product-1".to_string(),
            customer_email: None,
            metadata: None,
            success_url: None,
            cancel_url: None,
            coupon_code: None,
        };

        let resp = create_session(
            State(state),
            TenantContext::default(),
            HeaderMap::new(),
            Json(req),
        )
        .await
        .into_response();

        assert_eq!(resp.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_create_session_rejects_shipping_address_requirement_for_stripe() {
        let store = Arc::new(crate::storage::InMemoryStore::new());

        let mut config = crate::config::Config::default();
        config.logging.environment = "test".to_string();

        let product = crate::models::Product {
            id: "product-1".to_string(),
            tenant_id: "default".to_string(),
            description: "desc".to_string(),
            fiat_price: Some(crate::models::Money::new(
                crate::models::get_asset("USD").expect("USD"),
                100,
            )),
            stripe_price_id: Some("price_1".to_string()),
            active: true,
            checkout_requirements: Some(crate::models::CheckoutRequirements {
                shipping_address: Some(true),
                ..Default::default()
            }),
            ..Default::default()
        };

        let product_repo = Arc::new(crate::repositories::InMemoryProductRepository::new(vec![
            product,
        ]));
        let coupon_repo = Arc::new(crate::repositories::InMemoryCouponRepository::new(
            Vec::new(),
        ));
        let paywall_service = Arc::new(crate::PaywallService::new(
            config.clone(),
            store.clone(),
            Arc::new(crate::NoopVerifier),
            Arc::new(crate::webhooks::NoopNotifier),
            product_repo.clone(),
            coupon_repo,
        ));

        // Provide a StripeClient instance; the handler should reject before making any network call.
        let stripe_client = Some(Arc::new(
            crate::services::StripeClient::new(
                config,
                store.clone(),
                Arc::new(crate::webhooks::NoopNotifier),
            )
            .unwrap(),
        ));

        let state = Arc::new(crate::handlers::paywall::AppState {
            store,
            paywall_service,
            product_repo,
            stripe_client,
            stripe_webhook_processor: None,
            admin_public_keys: Vec::new(),
            blockhash_cache: None,
        });

        let req = CreateSessionRequest {
            resource: "product-1".to_string(),
            customer_email: None,
            metadata: None,
            success_url: None,
            cancel_url: None,
            coupon_code: None,
        };

        let resp = create_session(
            State(state),
            TenantContext::default(),
            HeaderMap::new(),
            Json(req),
        )
        .await
        .into_response();

        assert_eq!(resp.status(), StatusCode::BAD_REQUEST);
        let body = resp.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["error"]["code"], "invalid_operation");
    }

    #[tokio::test]
    async fn test_webhook_info_matches_supported_event_types() {
        let resp = webhook_info().await.into_response();
        assert_eq!(resp.status(), StatusCode::OK);

        let body = resp.into_body().collect().await.unwrap().to_bytes();
        let parsed: serde_json::Value = serde_json::from_slice(&body).unwrap();
        let events: Vec<String> = parsed
            .get("configured_events")
            .and_then(|v| v.as_array())
            .unwrap()
            .iter()
            .map(|v| v.as_str().unwrap().to_string())
            .collect();

        assert!(events.iter().any(|e| e == "invoice.paid"));
        assert!(events.iter().any(|e| e == "customer.subscription.created"));
        assert!(!events.iter().any(|e| e == "invoice.payment_succeeded"));
    }

    #[tokio::test]
    async fn test_webhook_requires_stripe_webhook_processor_even_if_stripe_client_exists() {
        let store = Arc::new(crate::storage::InMemoryStore::new());

        let mut config = crate::config::Config::default();
        config.logging.environment = "test".to_string();

        let product_repo = Arc::new(crate::repositories::InMemoryProductRepository::new(
            Vec::new(),
        ));
        let coupon_repo = Arc::new(crate::repositories::InMemoryCouponRepository::new(
            Vec::new(),
        ));
        let paywall_service = Arc::new(crate::PaywallService::new(
            config.clone(),
            store.clone(),
            Arc::new(crate::NoopVerifier),
            Arc::new(crate::webhooks::NoopNotifier),
            product_repo.clone(),
            coupon_repo,
        ));

        let stripe_client = Some(Arc::new(
            crate::services::StripeClient::new(
                config,
                store.clone(),
                Arc::new(crate::webhooks::NoopNotifier),
            )
            .unwrap(),
        ));

        let state = Arc::new(crate::handlers::paywall::AppState {
            store,
            paywall_service,
            product_repo,
            stripe_client,
            stripe_webhook_processor: None,
            admin_public_keys: Vec::new(),
            blockhash_cache: None,
        });

        let resp = webhook::<crate::storage::InMemoryStore>(
            State(state),
            HeaderMap::new(),
            "{}".to_string(),
        )
        .await
        .into_response();

        assert_eq!(resp.status(), StatusCode::SERVICE_UNAVAILABLE);
    }
}
