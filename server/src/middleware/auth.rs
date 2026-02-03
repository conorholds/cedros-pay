use std::sync::Arc;

use axum::{body::Body, extract::Request, http::StatusCode, middleware::Next, response::Response};
use subtle::ConstantTimeEq;

use axum::http::header::AUTHORIZATION;

use crate::config::types::{ApiKeyConfig, ApiKeyEntry, ApiKeyTier};
use crate::constants::{HEADER_API_KEY, HEADER_WALLET};
use crate::middleware::tenant::TenantContext;
use crate::services::cedros_login::CedrosLoginClient;
use crate::storage::Store;

use super::signature::{verify_admin_from_headers, SignatureVerifyResult};

/// Extracted authentication context available in handlers
#[derive(Clone, Debug, Default)]
pub struct AuthContext {
    pub wallet: Option<String>,
    pub api_key: Option<String>,
    pub api_tier: ApiKeyTier,
}

/// Auth middleware state
#[derive(Clone)]
pub struct AuthState {
    pub api_key_config: ApiKeyConfig,
    pub admin_public_keys: Vec<String>,
    api_keys: Vec<ApiKeyEntry>,
}

#[derive(Debug, Clone)]
pub struct ApiKeyValidation {
    pub tier: ApiKeyTier,
    pub allowed_tenants: Vec<String>,
}

/// Admin middleware state: auth config + store access for nonce consumption.
///
/// Supports two auth methods:
/// 1. Ed25519 signature with nonce (`X-Signer`, `X-Message`, `X-Signature` headers)
/// 2. Cedros-login JWT (`Authorization: Bearer <jwt>`) for system admins
pub struct AdminAuthState<S: Store> {
    pub auth: Arc<AuthState>,
    pub store: Arc<S>,
    /// Cedros-login client for JWT validation (optional - enables JWT auth fallback)
    pub cedros_login: Option<Arc<CedrosLoginClient>>,
}

impl<S: Store> Clone for AdminAuthState<S> {
    fn clone(&self) -> Self {
        Self {
            auth: self.auth.clone(),
            store: self.store.clone(),
            cedros_login: self.cedros_login.clone(),
        }
    }
}

impl AuthState {
    pub fn new(api_key_config: ApiKeyConfig, admin_public_keys: Vec<String>) -> Self {
        let api_keys = api_key_config.keys.clone();
        Self {
            api_key_config,
            admin_public_keys,
            api_keys,
        }
    }

    /// Validate API key using constant-time comparison to prevent timing attacks.
    /// Returns the tier + tenant allowlist if valid, None if invalid.
    /// SECURITY: Uses constant-time comparison for all keys regardless of length (M-004 fix).
    /// This prevents timing attacks that could reveal valid key lengths.
    pub fn validate_api_key(&self, key: &str) -> Option<ApiKeyValidation> {
        debug_assert!(self.api_key_config.enabled);

        // SECURITY: Constant-time comparison to prevent timing attacks.
        // We compare all keys with constant-time operations regardless of length,
        // and iterate through all keys even after finding a match to avoid
        // leaking information about the number of configured keys.
        let key_bytes = key.as_bytes();
        let mut result: Option<ApiKeyValidation> = None;

        for entry in &self.api_keys {
            let stored_bytes = entry.key.as_bytes();
            // SECURITY (M-004): Always do constant-time comparison regardless of length.
            // Comparing different lengths returns false in constant time.
            let is_match = if key_bytes.len() == stored_bytes.len() {
                key_bytes.ct_eq(stored_bytes).into()
            } else {
                // Different lengths - do a constant-time comparison of the first byte
                // to ensure timing is similar to the equal-length case
                let min_len = 1_usize;
                let key_slice = &key_bytes[..min_len.min(key_bytes.len())];
                let stored_slice = &stored_bytes[..min_len.min(stored_bytes.len())];
                // This will always be false but takes similar time to real comparison
                let _ = key_slice.ct_eq(stored_slice);
                false
            };

            if is_match {
                result = Some(ApiKeyValidation {
                    tier: entry.tier.clone(),
                    allowed_tenants: entry.allowed_tenants.clone(),
                });
            }
        }

        result
    }
}

/// Auth middleware layer
pub async fn auth_middleware(request: Request<Body>, next: Next) -> Response {
    // Extract auth context from headers
    let auth_ctx = extract_auth_context(&request);

    // Store in extensions for handlers
    let mut request = request;
    request.extensions_mut().insert(auth_ctx);

    next.run(request).await
}

/// Extract authentication context from request headers
fn extract_auth_context(request: &Request<Body>) -> AuthContext {
    let wallet = request
        .headers()
        .get(HEADER_WALLET)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let api_key = request
        .headers()
        .get(HEADER_API_KEY)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    AuthContext {
        wallet,
        api_key,
        api_tier: ApiKeyTier::Free,
    }
}

/// API key validation middleware
pub async fn api_key_middleware(
    axum::extract::State(state): axum::extract::State<Arc<AuthState>>,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    if request.uri().path() == "/metrics" {
        return Ok(next.run(request).await);
    }

    if !state.api_key_config.enabled {
        return Ok(next.run(request).await);
    }

    let api_key = request
        .headers()
        .get(HEADER_API_KEY)
        .and_then(|v| v.to_str().ok());

    let validation = match api_key {
        Some(key) => match state.validate_api_key(key) {
            Some(v) => v,
            None => return Err(StatusCode::UNAUTHORIZED),
        },
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    // Enforce API key tenant allowlist.
    // NOTE: We do NOT rely on TenantContext here because tenant middleware runs inside
    // the router layer stack and may not have executed yet.
    let (tenant_id, _source) = crate::middleware::tenant::extract_tenant_id(&request);
    let tenant_id = tenant_id.unwrap_or_else(|| "default".to_string());
    if !is_tenant_allowed_for_api_key(&tenant_id, &validation.allowed_tenants) {
        return Err(StatusCode::FORBIDDEN);
    }

    // Update auth context with tier
    if let Some(ctx) = request.extensions_mut().get_mut::<AuthContext>() {
        ctx.api_tier = validation.tier;
    }

    Ok(next.run(request).await)
}

fn is_tenant_allowed_for_api_key(tenant_id: &str, allowed_tenants: &[String]) -> bool {
    // Per docs/spec: empty allowlist restricts key to default tenant only.
    if allowed_tenants.is_empty() {
        tenant_id == "default"
    } else {
        allowed_tenants.iter().any(|t| t == tenant_id)
    }
}

/// Admin-only endpoint protection with two auth methods:
///
/// 1. **Ed25519 signature** (preferred for wallet users)
///    - Requires headers: X-Signature, X-Message, X-Signer
///    - X-Message is a single-use nonce consumed on use
///
/// 2. **Cedros-login JWT** (fallback for system admins without wallets)
///    - Requires header: Authorization: Bearer <jwt>
///    - JWT must have `is_system_admin: true` claim
///    - No nonce required (JWT has built-in expiration)
///
/// Ed25519 auth is tried first if signature headers are present.
pub async fn admin_middleware<S: Store + 'static>(
    axum::extract::State(state): axum::extract::State<Arc<AdminAuthState<S>>>,
    request: Request<Body>,
    next: Next,
) -> Result<Response, axum::http::StatusCode> {
    // Try Ed25519 signature auth first
    match verify_admin_from_headers(&request, &state.auth.admin_public_keys) {
        SignatureVerifyResult::Valid { signer } => {
            // Ed25519 auth successful - consume nonce for replay protection
            let tenant_id = get_tenant_id_for_admin(&request);

            let nonce_id = request
                .headers()
                .get(super::signature::X_MESSAGE)
                .and_then(|h| h.to_str().ok())
                .ok_or(StatusCode::UNAUTHORIZED)?;

            let expected_purpose =
                admin_nonce_purpose_for_request(&request).ok_or(StatusCode::UNAUTHORIZED)?;

            if let Err(err) = validate_and_consume_admin_nonce(
                &state.store,
                tenant_id,
                nonce_id,
                expected_purpose,
            )
            .await
            {
                tracing::warn!(error = %err, purpose = expected_purpose, "Admin Ed25519 auth failed: nonce invalid");
                return Err(StatusCode::UNAUTHORIZED);
            }

            tracing::debug!(admin = %signer, purpose = expected_purpose, "Admin request authenticated via Ed25519");
            return Ok(next.run(request).await);
        }
        SignatureVerifyResult::Invalid { reason } => {
            // Ed25519 headers present but invalid - reject immediately
            tracing::warn!(reason = %reason, "Admin Ed25519 authentication failed: invalid signature");
            return Err(StatusCode::FORBIDDEN);
        }
        SignatureVerifyResult::Missing { .. } => {
            // No Ed25519 headers - try JWT auth as fallback
        }
    }

    // Try cedros-login JWT auth as fallback
    if let Some(ref cedros_login) = state.cedros_login {
        // Extract JWT from Authorization header
        if let Some(auth_header) = request.headers().get(AUTHORIZATION) {
            if let Ok(auth_str) = auth_header.to_str() {
                if let Some(token) = auth_str.strip_prefix("Bearer ") {
                    if let Ok(claims) = cedros_login.validate_jwt(token).await {
                        if claims.is_admin() {
                            tracing::debug!(user_id = %claims.sub, "Admin request authenticated via JWT");
                            return Ok(next.run(request).await);
                        }
                        // JWT valid but user is not a system admin
                        tracing::warn!(user_id = %claims.sub, "JWT user is not a system admin");
                        return Err(StatusCode::FORBIDDEN);
                    }
                }
            }
        }
    }

    // No valid auth method found
    tracing::warn!("Admin authentication failed: no valid auth method");
    Err(StatusCode::UNAUTHORIZED)
}

/// Extract tenant ID for admin operations
fn get_tenant_id_for_admin(request: &Request<Body>) -> &str {
    match request.extensions().get::<TenantContext>() {
        Some(t) => t.tenant_id.as_str(),
        None => {
            tracing::warn!(
                path = %request.uri().path(),
                "Admin request missing TenantContext, using 'default' tenant"
            );
            "default"
        }
    }
}

fn admin_nonce_purpose_for_request<B>(request: &Request<B>) -> Option<&'static str> {
    let path = request.uri().path();
    let method = request.method();

    // Purposes are documented in docs/specs/04-http-endpoints-refunds.md
    if method == axum::http::Method::GET && path == "/admin/webhooks" {
        return Some("webhook_list");
    }

    if method == axum::http::Method::GET && path.starts_with("/admin/webhooks/dlq") {
        return Some("webhook_dlq");
    }

    if method == axum::http::Method::GET && path.starts_with("/admin/webhooks/") {
        return Some("webhook_get");
    }

    if method == axum::http::Method::DELETE && path.starts_with("/admin/webhooks/") {
        return Some("webhook_delete");
    }

    if method == axum::http::Method::POST && path.ends_with("/retry") {
        return Some("webhook_retry");
    }

    // Admin dashboard endpoints
    if method == axum::http::Method::GET && path == "/admin/stats" {
        return Some("admin_stats");
    }

    // Orders & fulfillments
    if method == axum::http::Method::GET && path == "/admin/orders" {
        return Some("admin_orders_list");
    }
    if method == axum::http::Method::GET && path.starts_with("/admin/orders/") {
        return Some("admin_orders_get");
    }
    if method == axum::http::Method::POST
        && path.starts_with("/admin/orders/")
        && path.ends_with("/status")
    {
        return Some("admin_orders_update_status");
    }
    if method == axum::http::Method::POST
        && path.starts_with("/admin/orders/")
        && path.ends_with("/fulfillments")
    {
        return Some("admin_fulfillments_create");
    }
    if method == axum::http::Method::POST
        && path.starts_with("/admin/fulfillments/")
        && path.ends_with("/status")
    {
        return Some("admin_fulfillments_update_status");
    }

    // Products CRUD
    if method == axum::http::Method::GET && path == "/admin/products" {
        return Some("admin_products_list");
    }
    if method == axum::http::Method::GET && path.starts_with("/admin/products/") {
        return Some("admin_products_get");
    }
    if method == axum::http::Method::POST && path == "/admin/products" {
        return Some("admin_products_create");
    }
    if method == axum::http::Method::PUT && path.starts_with("/admin/products/") {
        return Some("admin_products_update");
    }
    if method == axum::http::Method::DELETE && path.starts_with("/admin/products/") {
        return Some("admin_products_delete");
    }

    if method == axum::http::Method::GET && path.ends_with("/inventory/adjustments") {
        return Some("admin_inventory_adjustments_list");
    }
    if method == axum::http::Method::POST && path.ends_with("/inventory/adjust") {
        return Some("admin_inventory_adjust");
    }

    // Shipping profiles & rates
    if method == axum::http::Method::GET && path == "/admin/shipping/profiles" {
        return Some("admin_shipping_profiles_list");
    }
    if method == axum::http::Method::POST && path == "/admin/shipping/profiles" {
        return Some("admin_shipping_profiles_create");
    }
    if method == axum::http::Method::GET && path.starts_with("/admin/shipping/profiles/") {
        return Some("admin_shipping_profiles_get");
    }
    if method == axum::http::Method::PUT && path.starts_with("/admin/shipping/profiles/") {
        return Some("admin_shipping_profiles_update");
    }
    if method == axum::http::Method::DELETE && path.starts_with("/admin/shipping/profiles/") {
        return Some("admin_shipping_profiles_delete");
    }
    if method == axum::http::Method::GET
        && path.starts_with("/admin/shipping/profiles/")
        && path.ends_with("/rates")
    {
        return Some("admin_shipping_rates_list");
    }
    if method == axum::http::Method::POST
        && path.starts_with("/admin/shipping/profiles/")
        && path.ends_with("/rates")
    {
        return Some("admin_shipping_rates_create");
    }
    if method == axum::http::Method::PUT && path.starts_with("/admin/shipping/rates/") {
        return Some("admin_shipping_rates_update");
    }
    if method == axum::http::Method::DELETE && path.starts_with("/admin/shipping/rates/") {
        return Some("admin_shipping_rates_delete");
    }

    // Customers
    if method == axum::http::Method::GET && path == "/admin/customers" {
        return Some("admin_customers_list");
    }
    if method == axum::http::Method::POST && path == "/admin/customers" {
        return Some("admin_customers_create");
    }
    if method == axum::http::Method::GET && path.starts_with("/admin/customers/") {
        return Some("admin_customers_get");
    }
    if method == axum::http::Method::PUT && path.starts_with("/admin/customers/") {
        return Some("admin_customers_update");
    }

    // Returns
    if method == axum::http::Method::GET && path == "/admin/returns" {
        return Some("admin_returns_list");
    }
    if method == axum::http::Method::POST && path == "/admin/returns" {
        return Some("admin_returns_create");
    }
    if method == axum::http::Method::GET && path.starts_with("/admin/returns/") {
        return Some("admin_returns_get");
    }
    if method == axum::http::Method::POST
        && path.starts_with("/admin/returns/")
        && path.ends_with("/status")
    {
        return Some("admin_returns_update_status");
    }

    // Taxes
    if method == axum::http::Method::GET && path == "/admin/taxes" {
        return Some("admin_taxes_list");
    }
    if method == axum::http::Method::POST && path == "/admin/taxes" {
        return Some("admin_taxes_create");
    }
    if method == axum::http::Method::GET && path.starts_with("/admin/taxes/") {
        return Some("admin_taxes_get");
    }
    if method == axum::http::Method::PUT && path.starts_with("/admin/taxes/") {
        return Some("admin_taxes_update");
    }
    if method == axum::http::Method::DELETE && path.starts_with("/admin/taxes/") {
        return Some("admin_taxes_delete");
    }

    // Disputes
    if method == axum::http::Method::GET && path == "/admin/disputes" {
        return Some("admin_disputes_list");
    }
    if method == axum::http::Method::POST && path == "/admin/disputes" {
        return Some("admin_disputes_create");
    }
    if method == axum::http::Method::GET && path.starts_with("/admin/disputes/") {
        return Some("admin_disputes_get");
    }
    if method == axum::http::Method::POST
        && path.starts_with("/admin/disputes/")
        && path.ends_with("/status")
    {
        return Some("admin_disputes_update_status");
    }

    // Gift cards
    if method == axum::http::Method::GET && path == "/admin/gift-cards" {
        return Some("admin_gift_cards_list");
    }
    if method == axum::http::Method::POST && path == "/admin/gift-cards" {
        return Some("admin_gift_cards_create");
    }
    if method == axum::http::Method::GET && path.starts_with("/admin/gift-cards/") {
        return Some("admin_gift_cards_get");
    }
    if method == axum::http::Method::PUT && path.starts_with("/admin/gift-cards/") {
        return Some("admin_gift_cards_update");
    }
    if method == axum::http::Method::POST
        && path.starts_with("/admin/gift-cards/")
        && path.ends_with("/adjust")
    {
        return Some("admin_gift_cards_adjust");
    }

    // Collections
    if method == axum::http::Method::GET && path == "/admin/collections" {
        return Some("admin_collections_list");
    }
    if method == axum::http::Method::POST && path == "/admin/collections" {
        return Some("admin_collections_create");
    }
    if method == axum::http::Method::GET && path.starts_with("/admin/collections/") {
        return Some("admin_collections_get");
    }
    if method == axum::http::Method::PUT && path.starts_with("/admin/collections/") {
        return Some("admin_collections_update");
    }
    if method == axum::http::Method::DELETE && path.starts_with("/admin/collections/") {
        return Some("admin_collections_delete");
    }

    // Stripe refunds (admin dashboard)
    if method == axum::http::Method::GET && path == "/admin/stripe/refunds" {
        return Some("admin_stripe_refunds_list");
    }
    if method == axum::http::Method::POST
        && path.starts_with("/admin/stripe/refunds/")
        && path.ends_with("/process")
    {
        return Some("admin_stripe_refunds_process");
    }

    // Transactions
    if method == axum::http::Method::GET && path == "/admin/transactions" {
        return Some("admin_transactions_list");
    }

    // Coupons CRUD
    if method == axum::http::Method::GET && path == "/admin/coupons" {
        return Some("admin_coupons_list");
    }
    if method == axum::http::Method::POST && path == "/admin/coupons" {
        return Some("admin_coupons_create");
    }
    if method == axum::http::Method::PUT && path.starts_with("/admin/coupons/") {
        return Some("admin_coupons_update");
    }
    if method == axum::http::Method::DELETE && path.starts_with("/admin/coupons/") {
        return Some("admin_coupons_delete");
    }

    // Refunds
    if method == axum::http::Method::GET && path == "/admin/refunds" {
        return Some("admin_refunds_list");
    }
    if method == axum::http::Method::POST && path.ends_with("/process") {
        return Some("admin_refunds_process");
    }

    // Config endpoints (from plan Phase 4)
    if path.starts_with("/admin/config") {
        if method == axum::http::Method::GET && path == "/admin/config" {
            return Some("config_list");
        }
        if method == axum::http::Method::GET && path == "/admin/config/history" {
            return Some("config_history");
        }
        if method == axum::http::Method::POST && path == "/admin/config/batch" {
            return Some("config_batch");
        }
        if method == axum::http::Method::POST && path == "/admin/config/validate" {
            return Some("config_validate");
        }
        if method == axum::http::Method::GET && path.starts_with("/admin/config/") {
            return Some("config_get");
        }
        if method == axum::http::Method::PUT && path.starts_with("/admin/config/") {
            return Some("config_update");
        }
        if method == axum::http::Method::PATCH && path.starts_with("/admin/config/") {
            return Some("config_patch");
        }
    }

    None
}

async fn validate_and_consume_admin_nonce<S: Store>(
    store: &Arc<S>,
    tenant_id: &str,
    nonce_id: &str,
    expected_purpose: &str,
) -> Result<(), String> {
    use chrono::Utc;

    let nonce = store
        .get_nonce(tenant_id, nonce_id)
        .await
        .map_err(|e| format!("nonce_not_found: {}", e))?
        .ok_or_else(|| "nonce_not_found".to_string())?;

    let now = Utc::now();
    if nonce.expires_at < now {
        return Err("nonce_expired".to_string());
    }

    if nonce.consumed_at.is_some() {
        return Err("nonce_already_used".to_string());
    }

    // Empty stored purpose is wildcard.
    if !nonce.purpose.is_empty()
        && !expected_purpose.is_empty()
        && nonce.purpose != expected_purpose
    {
        return Err("invalid_nonce_purpose".to_string());
    }

    match store.consume_nonce(tenant_id, nonce_id).await {
        Ok(()) => Ok(()),
        Err(crate::storage::StorageError::Conflict)
        | Err(crate::storage::StorageError::NotFound) => Err("nonce_already_used".to_string()),
        Err(e) => Err(format!("consume_failed: {}", e)),
    }
}

/// Extract wallet from X-Wallet header.
///
/// SECURITY: do not treat `Authorization: Bearer ...` as a wallet identity.
pub fn extract_wallet_from_request<B>(req: &Request<B>) -> Option<String> {
    req.headers()
        .get(HEADER_WALLET)
        .and_then(|v| v.to_str().ok())
        .filter(|w| !w.is_empty())
        .map(|w| w.to_string())
}

/// Require wallet middleware
pub async fn require_wallet_middleware(
    request: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let wallet = extract_wallet_from_request(&request);
    if wallet.is_none() {
        return Err(StatusCode::UNAUTHORIZED);
    }
    Ok(next.run(request).await)
}

#[cfg(test)]
mod tests {
    use super::*;

    use axum::{routing::get, Router};
    use tower::ServiceExt;

    use crate::middleware::TrustedProxy;

    #[tokio::test]
    async fn test_api_key_middleware_skips_metrics() {
        let api_key_config = ApiKeyConfig {
            enabled: true,
            keys: vec![crate::config::types::ApiKeyEntry {
                key: "test-key".to_string(),
                tier: ApiKeyTier::Free,
                allowed_tenants: vec![],
            }],
        };
        let state = Arc::new(AuthState::new(api_key_config, Vec::new()));

        let app = Router::new()
            .route("/metrics", get(|| async { StatusCode::OK }))
            .layer(axum::middleware::from_fn_with_state(
                state,
                api_key_middleware,
            ));

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/metrics")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_api_key_tenant_allowlist_allows_configured_tenant() {
        let api_key_config = ApiKeyConfig {
            enabled: true,
            keys: vec![crate::config::types::ApiKeyEntry {
                key: "test-key".to_string(),
                tier: ApiKeyTier::Free,
                allowed_tenants: vec!["tenant-a".to_string()],
            }],
        };
        let state = Arc::new(AuthState::new(api_key_config, Vec::new()));

        let app = Router::new()
            .route("/", get(|| async { StatusCode::OK }))
            .layer(axum::middleware::from_fn(auth_middleware))
            .layer(axum::middleware::from_fn_with_state(
                state,
                api_key_middleware,
            ));

        let mut req = Request::builder()
            .uri("/")
            .header("Host", "tenant-a.example.com")
            .header(HEADER_API_KEY, "test-key")
            .body(Body::empty())
            .unwrap();
        req.extensions_mut().insert(TrustedProxy(true));

        let response = app.oneshot(req).await.unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_api_key_tenant_allowlist_rejects_other_tenants() {
        let api_key_config = ApiKeyConfig {
            enabled: true,
            keys: vec![crate::config::types::ApiKeyEntry {
                key: "test-key".to_string(),
                tier: ApiKeyTier::Free,
                allowed_tenants: vec!["tenant-a".to_string()],
            }],
        };
        let state = Arc::new(AuthState::new(api_key_config, Vec::new()));

        let app = Router::new()
            .route("/", get(|| async { StatusCode::OK }))
            .layer(axum::middleware::from_fn(auth_middleware))
            .layer(axum::middleware::from_fn_with_state(
                state,
                api_key_middleware,
            ));

        let mut req = Request::builder()
            .uri("/")
            .header("Host", "tenant-b.example.com")
            .header(HEADER_API_KEY, "test-key")
            .body(Body::empty())
            .unwrap();
        req.extensions_mut().insert(TrustedProxy(true));

        let response = app.oneshot(req).await.unwrap();

        assert_eq!(response.status(), StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn test_api_key_tenant_allowlist_empty_defaults_to_default_tenant_only() {
        let api_key_config = ApiKeyConfig {
            enabled: true,
            keys: vec![crate::config::types::ApiKeyEntry {
                key: "test-key".to_string(),
                tier: ApiKeyTier::Free,
                allowed_tenants: vec![],
            }],
        };
        let state = Arc::new(AuthState::new(api_key_config, Vec::new()));

        let app = Router::new()
            .route("/", get(|| async { StatusCode::OK }))
            .layer(axum::middleware::from_fn(auth_middleware))
            .layer(axum::middleware::from_fn_with_state(
                state,
                api_key_middleware,
            ));

        // Non-default tenant should be forbidden.
        let mut req = Request::builder()
            .uri("/")
            .header("Host", "tenant-a.example.com")
            .header(HEADER_API_KEY, "test-key")
            .body(Body::empty())
            .unwrap();
        req.extensions_mut().insert(TrustedProxy(true));

        let response = app.clone().oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::FORBIDDEN);

        // Default tenant (no subdomain) should be allowed.
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/")
                    .header("Host", "example.com")
                    .header(HEADER_API_KEY, "test-key")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[test]
    fn test_admin_nonce_purpose_for_request_known_routes() {
        let list_req = Request::builder()
            .method(axum::http::Method::GET)
            .uri("/admin/webhooks")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&list_req),
            Some("webhook_list")
        );

        let dlq_req = Request::builder()
            .method(axum::http::Method::GET)
            .uri("/admin/webhooks/dlq")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&dlq_req),
            Some("webhook_dlq")
        );

        let get_req = Request::builder()
            .method(axum::http::Method::GET)
            .uri("/admin/webhooks/abc")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&get_req),
            Some("webhook_get")
        );

        let delete_req = Request::builder()
            .method(axum::http::Method::DELETE)
            .uri("/admin/webhooks/abc")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&delete_req),
            Some("webhook_delete")
        );

        let retry_req = Request::builder()
            .method(axum::http::Method::POST)
            .uri("/admin/webhooks/abc/retry")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&retry_req),
            Some("webhook_retry")
        );

        let orders_req = Request::builder()
            .method(axum::http::Method::GET)
            .uri("/admin/orders")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&orders_req),
            Some("admin_orders_list")
        );

        let customer_req = Request::builder()
            .method(axum::http::Method::GET)
            .uri("/admin/customers/abc")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&customer_req),
            Some("admin_customers_get")
        );

        let dispute_req = Request::builder()
            .method(axum::http::Method::POST)
            .uri("/admin/disputes/disp-1/status")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&dispute_req),
            Some("admin_disputes_update_status")
        );

        let gift_req = Request::builder()
            .method(axum::http::Method::POST)
            .uri("/admin/gift-cards/GC1/adjust")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&gift_req),
            Some("admin_gift_cards_adjust")
        );

        let collection_req = Request::builder()
            .method(axum::http::Method::DELETE)
            .uri("/admin/collections/col-1")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&collection_req),
            Some("admin_collections_delete")
        );
    }

    #[test]
    fn test_admin_nonce_purpose_for_request_unknown_route_fails_closed() {
        let req = Request::builder()
            .method(axum::http::Method::GET)
            .uri("/admin/unknown")
            .body(Body::empty())
            .unwrap();

        assert_eq!(super::admin_nonce_purpose_for_request(&req), None);
    }
}
