use std::sync::Arc;

use axum::extract::OriginalUri;
use axum::{body::Body, extract::Request, http::StatusCode, middleware::Next, response::Response};
use sha2::{Digest, Sha256};
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
    ///
    /// SECURITY (RS-CRIT-1): Both candidate and stored keys are hashed with SHA-256
    /// before comparison. This ensures constant-time behavior regardless of key length,
    /// preventing attackers from discovering key length via timing analysis.
    /// We iterate through all keys even after finding a match to avoid leaking
    /// information about the number of configured keys.
    pub fn validate_api_key(&self, key: &str) -> Option<ApiKeyValidation> {
        debug_assert!(self.api_key_config.enabled);

        let candidate_hash = Sha256::digest(key.as_bytes());
        let mut result: Option<ApiKeyValidation> = None;

        for entry in &self.api_keys {
            let stored_hash = Sha256::digest(entry.key.as_bytes());
            let is_match: bool = candidate_hash.ct_eq(&stored_hash).into();

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

/// Maximum length for X-Wallet header to prevent rate limiter memory exhaustion
const MAX_WALLET_LEN: usize = 64;

/// Extract authentication context from request headers
fn extract_auth_context(request: &Request<Body>) -> AuthContext {
    let wallet = request
        .headers()
        .get(HEADER_WALLET)
        .and_then(|v| v.to_str().ok())
        .filter(|s| s.len() <= MAX_WALLET_LEN)
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
            let tenant_id = get_tenant_id_for_admin(&request)?;

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
                // RFC 6750: scheme comparison is case-insensitive
                let token = auth_str
                    .get(..7)
                    .filter(|p| p.eq_ignore_ascii_case("bearer "))
                    .map(|_| &auth_str[7..]);

                if let Some(token) = token {
                    match cedros_login.validate_jwt(token).await {
                        Ok(claims) => {
                            if claims.is_admin() {
                                tracing::debug!(user_id = %claims.sub, "Admin request authenticated via JWT");
                                return Ok(next.run(request).await);
                            }
                            // JWT valid but user is not a system admin
                            tracing::warn!(user_id = %claims.sub, "JWT user is not a system admin");
                            return Err(StatusCode::FORBIDDEN);
                        }
                        Err(e) => {
                            tracing::warn!(error = %e, "JWT validation failed");
                            return Err(StatusCode::UNAUTHORIZED);
                        }
                    }
                } else {
                    tracing::debug!(
                        scheme = %auth_str.split_whitespace().next().unwrap_or("(empty)"),
                        "Authorization header present but not Bearer scheme"
                    );
                }
            }
        } else {
            tracing::debug!("cedros-login configured but no Authorization header in admin request");
        }
    } else {
        tracing::debug!("JWT auth unavailable: no cedros-login client configured");
    }

    // No valid auth method found
    tracing::warn!("Admin authentication failed: no valid auth method");
    Err(StatusCode::UNAUTHORIZED)
}

/// Extract tenant ID for admin operations.
/// SECURITY: Fail closed — reject if TenantContext is absent rather than
/// silently defaulting to "default" tenant.
fn get_tenant_id_for_admin(request: &Request<Body>) -> Result<&str, StatusCode> {
    request
        .extensions()
        .get::<TenantContext>()
        .map(|t| t.tenant_id.as_str())
        .ok_or_else(|| {
            tracing::error!(
                path = %request.uri().path(),
                "Admin request missing TenantContext — rejecting"
            );
            StatusCode::INTERNAL_SERVER_ERROR
        })
}

/// Determine the expected nonce purpose for an admin request.
///
/// MAINTENANCE: When adding new admin endpoints, add a matching entry here.
/// Returns `None` (fail-closed) for unrecognized routes, which causes auth rejection.
/// Uses starts_with/ends_with matching — ordering matters for routes with shared prefixes.
/// Test coverage: known routes, unknown routes (fail-closed), suffix collision rejection.
///
/// NOTE: Admin routes are nested via `Router::nest("/admin", ...)`, which causes
/// axum to strip the `/admin` prefix from `request.uri().path()`. We use
/// `OriginalUri` (set automatically by axum's nest) to get the full path.
fn admin_nonce_purpose_for_request<B>(request: &Request<B>) -> Option<&'static str> {
    let path = request
        .extensions()
        .get::<OriginalUri>()
        .map(|u| u.0.path())
        .unwrap_or_else(|| request.uri().path());
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

    if method == axum::http::Method::POST
        && path.starts_with("/admin/webhooks/")
        && path.ends_with("/retry")
    {
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

    // Products — specific sub-resource patterns BEFORE generic starts_with
    if method == axum::http::Method::GET && path == "/admin/products" {
        return Some("admin_products_list");
    }
    if method == axum::http::Method::POST && path == "/admin/products" {
        return Some("admin_products_create");
    }
    if method == axum::http::Method::GET
        && path.starts_with("/admin/products/")
        && path.ends_with("/inventory/adjustments")
    {
        return Some("admin_inventory_adjustments_list");
    }
    if method == axum::http::Method::POST
        && path.starts_with("/admin/products/")
        && path.ends_with("/inventory/adjust")
    {
        return Some("admin_inventory_adjust");
    }
    if method == axum::http::Method::PUT
        && path.starts_with("/admin/products/")
        && path.ends_with("/variants/inventory")
    {
        return Some("admin_variants_inventory_update");
    }
    if method == axum::http::Method::PUT
        && path.starts_with("/admin/products/")
        && path.ends_with("/inventory")
    {
        return Some("admin_inventory_set");
    }
    if method == axum::http::Method::GET
        && path.starts_with("/admin/products/")
        && path.ends_with("/variations")
    {
        return Some("admin_variations_get");
    }
    if method == axum::http::Method::PUT
        && path.starts_with("/admin/products/")
        && path.ends_with("/variations")
    {
        return Some("admin_variations_update");
    }
    // Generic product CRUD (after specific sub-resource patterns)
    if method == axum::http::Method::GET && path.starts_with("/admin/products/") {
        return Some("admin_products_get");
    }
    if method == axum::http::Method::PUT && path.starts_with("/admin/products/") {
        return Some("admin_products_update");
    }
    if method == axum::http::Method::DELETE && path.starts_with("/admin/products/") {
        return Some("admin_products_delete");
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

    // FAQs
    if method == axum::http::Method::GET && path == "/admin/faqs" {
        return Some("admin_faqs_list");
    }
    if method == axum::http::Method::POST && path == "/admin/faqs" {
        return Some("admin_faqs_create");
    }
    if method == axum::http::Method::GET && path.starts_with("/admin/faqs/") {
        return Some("admin_faqs_get");
    }
    if method == axum::http::Method::PUT && path.starts_with("/admin/faqs/") {
        return Some("admin_faqs_update");
    }
    if method == axum::http::Method::DELETE && path.starts_with("/admin/faqs/") {
        return Some("admin_faqs_delete");
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
    if method == axum::http::Method::POST
        && path.starts_with("/admin/refunds/")
        && path.ends_with("/process")
    {
        return Some("admin_refunds_process");
    }

    // Credits refund requests
    if method == axum::http::Method::GET && path == "/admin/credits/refund-requests" {
        return Some("admin_credits_refund_requests_list");
    }

    // Admin chats
    if method == axum::http::Method::GET && path == "/admin/chats" {
        return Some("admin_chats_list");
    }
    if method == axum::http::Method::GET && path.starts_with("/admin/chats/") {
        return Some("admin_chats_get");
    }
    if method == axum::http::Method::GET
        && path.starts_with("/admin/users/")
        && path.ends_with("/chats")
    {
        return Some("admin_user_chats_list");
    }

    // Subscription settings
    if method == axum::http::Method::GET && path == "/admin/subscriptions/settings" {
        return Some("admin_subscriptions_settings_get");
    }
    if method == axum::http::Method::PUT && path == "/admin/subscriptions/settings" {
        return Some("admin_subscriptions_settings_update");
    }

    // AI assistant
    if method == axum::http::Method::POST && path == "/admin/ai/product-assistant" {
        return Some("admin_ai_product_assistant");
    }
    if method == axum::http::Method::POST && path == "/admin/ai/related-products" {
        return Some("admin_ai_related_products");
    }
    if method == axum::http::Method::POST && path == "/admin/ai/product-search" {
        return Some("admin_ai_product_search");
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
        if method == axum::http::Method::DELETE && path.starts_with("/admin/config/") {
            return Some("config_delete");
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

    // SECURITY: Reject empty purpose on either side. An empty stored purpose
    // must not act as a wildcard — it would allow a single nonce to authorize
    // any admin endpoint.
    if nonce.purpose.is_empty() || expected_purpose.is_empty() {
        return Err("invalid_nonce_purpose".to_string());
    }
    if nonce.purpose != expected_purpose {
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
    async fn test_api_key_middleware_requires_key_for_metrics() {
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

        // Without API key → 401
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/metrics")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

        // With valid API key → 200
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/metrics")
                    .header("X-API-Key", "test-key")
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

    /// Verify that OriginalUri is used when available (simulates axum nest stripping)
    #[test]
    fn test_admin_nonce_purpose_uses_original_uri_from_nest() {
        // axum::nest("/admin", ...) strips the prefix from request.uri() but
        // preserves it in OriginalUri. The function should use OriginalUri.
        let mut req = Request::builder()
            .method(axum::http::Method::GET)
            .uri("/faqs") // stripped path (as seen inside nested router)
            .body(Body::empty())
            .unwrap();
        req.extensions_mut()
            .insert(OriginalUri("/admin/faqs".parse().unwrap()));
        assert_eq!(
            super::admin_nonce_purpose_for_request(&req),
            Some("admin_faqs_list")
        );
    }

    #[test]
    fn test_admin_nonce_purpose_new_routes() {
        // FAQs
        let req = Request::builder()
            .method(axum::http::Method::DELETE)
            .uri("/admin/faqs/faq-1")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&req),
            Some("admin_faqs_delete")
        );

        // Product variations
        let req = Request::builder()
            .method(axum::http::Method::GET)
            .uri("/admin/products/prod-1/variations")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&req),
            Some("admin_variations_get")
        );

        // Subscription settings
        let req = Request::builder()
            .method(axum::http::Method::PUT)
            .uri("/admin/subscriptions/settings")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&req),
            Some("admin_subscriptions_settings_update")
        );

        // Admin chats
        let req = Request::builder()
            .method(axum::http::Method::GET)
            .uri("/admin/chats/sess-1")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&req),
            Some("admin_chats_get")
        );

        // Credits refund requests
        let req = Request::builder()
            .method(axum::http::Method::GET)
            .uri("/admin/credits/refund-requests")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&req),
            Some("admin_credits_refund_requests_list")
        );

        // Config DELETE (AI API key removal)
        let req = Request::builder()
            .method(axum::http::Method::DELETE)
            .uri("/admin/config/ai/api-key/openai")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&req),
            Some("config_delete")
        );
    }

    /// Verify product sub-resource routes match BEFORE generic products_get
    #[test]
    fn test_admin_nonce_purpose_product_sub_resources_before_generic() {
        let req = Request::builder()
            .method(axum::http::Method::GET)
            .uri("/admin/products/prod-1/inventory/adjustments")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&req),
            Some("admin_inventory_adjustments_list")
        );

        let req = Request::builder()
            .method(axum::http::Method::GET)
            .uri("/admin/products/prod-1/variations")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&req),
            Some("admin_variations_get")
        );

        let req = Request::builder()
            .method(axum::http::Method::PUT)
            .uri("/admin/products/prod-1/variants/inventory")
            .body(Body::empty())
            .unwrap();
        assert_eq!(
            super::admin_nonce_purpose_for_request(&req),
            Some("admin_variants_inventory_update")
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

    /// S-06: Verify that ends_with patterns are scoped to the correct path prefix
    /// so that e.g. POST /admin/orders/abc/retry doesn't match webhook_retry.
    #[test]
    fn test_admin_nonce_purpose_rejects_wrong_prefix_with_matching_suffix() {
        // POST /admin/orders/abc/retry should NOT match webhook_retry
        let req = Request::builder()
            .method(axum::http::Method::POST)
            .uri("/admin/orders/abc/retry")
            .body(Body::empty())
            .unwrap();
        assert_eq!(super::admin_nonce_purpose_for_request(&req), None);

        // POST /admin/orders/abc/process should NOT match admin_refunds_process
        let req = Request::builder()
            .method(axum::http::Method::POST)
            .uri("/admin/orders/abc/process")
            .body(Body::empty())
            .unwrap();
        assert_eq!(super::admin_nonce_purpose_for_request(&req), None);

        // GET /admin/coupons/abc/inventory/adjustments should NOT match
        let req = Request::builder()
            .method(axum::http::Method::GET)
            .uri("/admin/coupons/abc/inventory/adjustments")
            .body(Body::empty())
            .unwrap();
        assert_eq!(super::admin_nonce_purpose_for_request(&req), None);
    }
}
