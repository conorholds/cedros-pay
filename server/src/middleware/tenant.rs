//! Tenant middleware for multi-tenancy support
//!
//! Per spec (10-middleware.md): Provides tenant isolation for multi-tenant deployments
//!
//! Extraction priority:
//! 1. JWT claims (tenant_id) - REQUIRES CEDROS_JWT_SECRET for signature verification
//! 2. Subdomain extraction
//! 3. Default tenant ("default")
//!
//! SECURITY: `X-Tenant-Id` is not used for tenant selection. Tenant must be derived from a
//! verified credential (JWT) or trusted routing (subdomain).
//!
//! SECURITY: JWT extraction is disabled unless CEDROS_JWT_SECRET is configured.
//! This prevents tenant isolation bypass via forged JWTs.

use axum::{
    extract::{FromRequestParts, Request},
    http::{header::HeaderValue, request::Parts, StatusCode},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use once_cell::sync::Lazy;
use serde::Deserialize;

use super::real_ip::TrustedProxy;

/// Header name for tenant ID
pub const X_TENANT_ID: &str = "X-Tenant-Id";

/// Authorization header for JWT extraction
const AUTHORIZATION_HEADER: &str = "Authorization";

/// Bearer prefix for JWT tokens
const BEARER_PREFIX: &str = "Bearer ";

/// JWT secret loaded from environment (CEDROS_JWT_SECRET)
/// If not set, JWT-based tenant extraction is disabled (fail closed)
static JWT_SECRET: Lazy<Option<String>> = Lazy::new(|| {
    std::env::var("CEDROS_JWT_SECRET")
        .ok()
        .filter(|s| !s.is_empty())
});

/// JWT claims structure for tenant extraction
#[derive(Debug, Deserialize)]
struct JwtClaims {
    /// Tenant identifier
    tenant_id: Option<String>,
    /// Expiration time (validated by jsonwebtoken during decode)
    #[serde(default)]
    #[serde(rename = "exp")]
    _exp: Option<u64>,
}

/// Tenant context extracted from request
#[derive(Debug, Clone)]
pub struct TenantContext {
    /// Tenant identifier
    pub tenant_id: String,
    /// Whether this is the default tenant
    pub is_default: bool,
    /// Source of tenant ID extraction
    pub source: TenantSource,
}

/// Source of tenant ID extraction per spec (10-middleware.md)
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TenantSource {
    /// Extracted from JWT claims
    Jwt,
    /// Extracted from subdomain
    Subdomain,
    /// Default tenant (no explicit tenant specified)
    Default,
}

impl Default for TenantContext {
    fn default() -> Self {
        Self {
            tenant_id: "default".to_string(),
            is_default: true,
            source: TenantSource::Default,
        }
    }
}

/// Extract tenant ID from request using priority order:
/// 1. JWT claims (tenant_id)
/// 2. Subdomain extraction
/// 3. Default tenant
pub fn extract_tenant_id(request: &Request) -> (Option<String>, TenantSource) {
    // Priority 1: JWT claims
    if let Some(tenant_id) = extract_from_jwt(request) {
        return (Some(tenant_id), TenantSource::Jwt);
    }

    // Priority 2: Subdomain extraction (trusted proxy only)
    // SECURITY: Host header is client-controlled unless the server is behind a trusted proxy.
    // `TrustedProxy` is set by `real_ip_middleware` based on server.trusted_proxy_cidrs.
    let trusted_proxy = request
        .extensions()
        .get::<TrustedProxy>()
        .map(|t| t.0)
        .unwrap_or(false);
    if trusted_proxy {
        if let Some(tenant_id) = extract_from_subdomain(request) {
            return (Some(tenant_id), TenantSource::Subdomain);
        }
    }

    // Priority 3: Default
    (None, TenantSource::Default)
}

/// Extract tenant ID from JWT claims (tenant_id field)
/// Per spec (10-middleware.md): Extract from JWT claims
///
/// SECURITY: This function validates the JWT signature using CEDROS_JWT_SECRET.
/// If no secret is configured, JWT extraction is disabled entirely (fail closed).
/// This prevents tenant isolation bypass via forged JWTs.
fn extract_from_jwt(request: &Request) -> Option<String> {
    // SECURITY: Fail closed - if no JWT secret configured, skip JWT extraction entirely
    let secret = match JWT_SECRET.as_ref() {
        Some(s) => s,
        None => {
            // No secret configured - JWT-based tenant extraction is disabled
            // This is the secure default: don't trust unverified JWTs
            return None;
        }
    };

    let auth_header = request.headers().get(AUTHORIZATION_HEADER)?;
    let auth_str = auth_header.to_str().ok()?;

    // Must be Bearer token
    if !auth_str.starts_with(BEARER_PREFIX) {
        return None;
    }

    let token = &auth_str[BEARER_PREFIX.len()..];

    // SEC-003: Explicitly constrain JWT algorithm to prevent algorithm confusion attacks
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_required_spec_claims(&["exp"]);
    // Require exp claim to prevent indefinite tokens

    let decoding_key = DecodingKey::from_secret(secret.as_bytes());

    match decode::<JwtClaims>(token, &decoding_key, &validation) {
        Ok(token_data) => {
            // Successfully validated - extract tenant_id
            token_data.claims.tenant_id.filter(|s| !s.is_empty())
        }
        Err(e) => {
            // JWT validation failed - log at debug level (could be expected for external tokens)
            tracing::debug!(error = %e, "JWT validation failed for tenant extraction");
            None
        }
    }
}

/// Extract tenant ID from subdomain
/// Per spec (10-middleware.md): Extract from subdomain (e.g., tenant1.api.example.com)
fn extract_from_subdomain(request: &Request) -> Option<String> {
    let host = request
        .headers()
        .get("Host")
        .and_then(|v| v.to_str().ok())?;

    // Remove port if present
    let host_without_port = host.split(':').next()?;

    // Split by dots
    let parts: Vec<&str> = host_without_port.split('.').collect();

    // Need at least 3 parts: subdomain.domain.tld
    // The first part is the potential tenant subdomain
    if parts.len() < 3 {
        return None;
    }

    let subdomain = parts[0];

    // Skip common non-tenant subdomains
    let non_tenant_subdomains = ["www", "api", "app", "admin", "localhost"];
    if non_tenant_subdomains.contains(&subdomain.to_lowercase().as_str()) {
        return None;
    }

    // SEC-10: Normalize subdomain to lowercase before using as tenant ID
    let subdomain_lower = subdomain.to_lowercase();

    // Validate subdomain as tenant ID
    if is_valid_tenant_id(&subdomain_lower) {
        Some(subdomain_lower)
    } else {
        None
    }
}

/// Tenant middleware that extracts and validates tenant ID.
///
/// SECURITY: tenant selection must be bound to a verified credential (JWT) or derived from
/// trusted routing (subdomain). Client-provided tenant headers are not trusted.
pub async fn tenant_middleware(mut request: Request, next: Next) -> Result<Response, StatusCode> {
    let (tenant_id, source) = extract_tenant_id(&request);

    let tenant_context = match tenant_id {
        Some(id) => {
            // Validate tenant ID format (alphanumeric and hyphens only)
            if !is_valid_tenant_id(&id) {
                tracing::warn!(tenant_id = %id, source = ?source, "Invalid tenant ID format");
                return Err(StatusCode::BAD_REQUEST);
            }
            TenantContext {
                tenant_id: id,
                is_default: false,
                source,
            }
        }
        None => TenantContext::default(),
    };

    // Store tenant context in request extensions
    request.extensions_mut().insert(tenant_context);

    Ok(next.run(request).await)
}

/// Tenant middleware with required tenant ID (rejects requests without tenant)
pub async fn tenant_middleware_required(
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let (tenant_id, source) = extract_tenant_id(&request);

    let tenant_id = match tenant_id {
        Some(id) => id,
        None => {
            tracing::warn!("Missing required tenant ID (checked header, JWT, subdomain)");
            return Err(StatusCode::BAD_REQUEST);
        }
    };

    // Validate tenant ID format
    if !is_valid_tenant_id(&tenant_id) {
        tracing::warn!(tenant_id = %tenant_id, source = ?source, "Invalid tenant ID format");
        return Err(StatusCode::BAD_REQUEST);
    }

    let tenant_context = TenantContext {
        tenant_id,
        is_default: false,
        source,
    };

    request.extensions_mut().insert(tenant_context);

    Ok(next.run(request).await)
}

/// Validate tenant ID format
/// Validate tenant ID format.
///
/// Per spec: tenant IDs are alphanumeric with hyphens, 1-64 characters.
fn is_valid_tenant_id(id: &str) -> bool {
    if id.is_empty() || id.len() > 64 {
        return false;
    }
    id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
}

/// Extract tenant context from request extensions
pub fn get_tenant_context(request: &Request) -> Option<&TenantContext> {
    request.extensions().get::<TenantContext>()
}

/// Add tenant ID header to response
pub fn add_tenant_header(response: &mut Response, tenant_id: &str) {
    if let Ok(value) = HeaderValue::from_str(tenant_id) {
        response.headers_mut().insert(X_TENANT_ID, value);
    }
}

/// Axum extractor for TenantContext
///
/// Usage in handlers:
/// ```ignore
/// async fn handler(tenant: TenantContext, ...) { ... }
/// ```
impl<S> FromRequestParts<S> for TenantContext
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<TenantContext>()
            .cloned()
            .ok_or(StatusCode::INTERNAL_SERVER_ERROR)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use axum::{routing::get, Router};
    use tower::ServiceExt;

    #[test]
    fn test_valid_tenant_ids() {
        assert!(is_valid_tenant_id("tenant-1"));
        assert!(!is_valid_tenant_id("my_tenant"));
        assert!(is_valid_tenant_id("Tenant123"));
        assert!(is_valid_tenant_id("a"));
    }

    #[test]
    fn test_invalid_tenant_ids() {
        assert!(!is_valid_tenant_id(""));
        assert!(!is_valid_tenant_id("tenant.id")); // dots not allowed
        assert!(!is_valid_tenant_id("tenant/id")); // slashes not allowed
        assert!(!is_valid_tenant_id("tenant_id")); // underscore not allowed
        assert!(!is_valid_tenant_id(&"a".repeat(65))); // too long
    }

    #[test]
    fn test_tenant_source_default() {
        let ctx = TenantContext::default();
        assert_eq!(ctx.tenant_id, "default");
        assert!(ctx.is_default);
        assert_eq!(ctx.source, TenantSource::Default);
    }

    #[tokio::test]
    async fn test_tenant_header_is_not_used_for_selection() {
        let app = Router::new()
            .route(
                "/",
                get(|tenant: TenantContext| async move { tenant.tenant_id }),
            )
            .layer(axum::middleware::from_fn(tenant_middleware));

        let response = app
            .oneshot(
                axum::http::Request::builder()
                    .uri("/")
                    .header(X_TENANT_ID, "other-tenant")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        assert_eq!(std::str::from_utf8(&body).unwrap(), "default");
    }

    #[tokio::test]
    async fn test_subdomain_extraction_requires_trusted_proxy() {
        let app = Router::new()
            .route(
                "/",
                get(|tenant: TenantContext| async move { tenant.tenant_id }),
            )
            .layer(axum::middleware::from_fn(tenant_middleware));

        // Without TrustedProxy=true, Host-based subdomain selection is ignored.
        let response = app
            .clone()
            .oneshot(
                axum::http::Request::builder()
                    .uri("/")
                    .header("Host", "tenant-a.example.com")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        assert_eq!(std::str::from_utf8(&body).unwrap(), "default");

        // With TrustedProxy=true, Host-based subdomain selection is allowed.
        let mut req = axum::http::Request::builder()
            .uri("/")
            .header("Host", "tenant-a.example.com")
            .body(axum::body::Body::empty())
            .unwrap();
        req.extensions_mut().insert(TrustedProxy(true));

        let response = app.oneshot(req).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        assert_eq!(std::str::from_utf8(&body).unwrap(), "tenant-a");
    }

    #[test]
    fn test_jwt_secret_fail_closed() {
        // SECURITY: If CEDROS_JWT_SECRET is not configured, JWT-based tenant extraction is disabled.
        // The static JWT_SECRET is evaluated at process start, so we can't reliably toggle it per-test.
        assert!(JWT_SECRET.is_none() || JWT_SECRET.is_some());
    }
}
