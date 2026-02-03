use axum::{
    body::Body,
    http::{header, HeaderValue, Request, Response},
};
use once_cell::sync::Lazy;
use rand::Rng;
use std::task::{Context, Poll};
use tower::{Layer, Service};

// Pre-parsed security header values - these are static and known-valid at compile time
// Using Lazy to avoid repeated parsing and eliminate runtime .unwrap() calls
static HEADER_NOSNIFF: Lazy<HeaderValue> = Lazy::new(|| HeaderValue::from_static("nosniff"));
static HEADER_DENY: Lazy<HeaderValue> = Lazy::new(|| HeaderValue::from_static("DENY"));
static HEADER_XSS_PROTECTION: Lazy<HeaderValue> =
    Lazy::new(|| HeaderValue::from_static("1; mode=block"));
static HEADER_REFERRER_POLICY: Lazy<HeaderValue> =
    Lazy::new(|| HeaderValue::from_static("strict-origin-when-cross-origin"));
static HEADER_HSTS: Lazy<HeaderValue> =
    Lazy::new(|| HeaderValue::from_static("max-age=31536000; includeSubDomains"));

/// Generate a request ID per spec (16-formats.md)
/// Format: "req_" + hex(16 random bytes)
fn generate_request_id() -> String {
    let bytes: [u8; 16] = rand::thread_rng().gen();
    format!("req_{}", hex::encode(bytes))
}

// ─────────────────────────────────────────────────────────────────────────────
// Security Headers Layer
// ─────────────────────────────────────────────────────────────────────────────

/// Layer that adds security headers to all responses
#[derive(Clone, Default)]
pub struct SecurityHeadersLayer;

impl<S> Layer<S> for SecurityHeadersLayer {
    type Service = SecurityHeadersMiddleware<S>;

    fn layer(&self, inner: S) -> Self::Service {
        SecurityHeadersMiddleware { inner }
    }
}

#[derive(Clone)]
pub struct SecurityHeadersMiddleware<S> {
    inner: S,
}

impl<S> Service<Request<Body>> for SecurityHeadersMiddleware<S>
where
    S: Service<Request<Body>, Response = Response<Body>> + Clone + Send + 'static,
    S::Future: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<Self::Response, Self::Error>> + Send>,
    >;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, request: Request<Body>) -> Self::Future {
        let clone = self.inner.clone();
        let mut inner = std::mem::replace(&mut self.inner, clone);

        Box::pin(async move {
            let mut response = inner.call(request).await?;
            let headers = response.headers_mut();

            // Security headers per spec (10-middleware.md lines 25-31)
            // Using pre-parsed static values to avoid runtime unwrap() panics
            headers.insert(header::X_CONTENT_TYPE_OPTIONS, HEADER_NOSNIFF.clone());
            headers.insert(header::X_FRAME_OPTIONS, HEADER_DENY.clone());
            // Note: CSP header removed - not in spec (10-middleware.md)
            headers.insert("X-XSS-Protection", HEADER_XSS_PROTECTION.clone());
            headers.insert(header::REFERRER_POLICY, HEADER_REFERRER_POLICY.clone());
            headers.insert(header::STRICT_TRANSPORT_SECURITY, HEADER_HSTS.clone());

            Ok(response)
        })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Request ID Layer
// ─────────────────────────────────────────────────────────────────────────────

/// Request ID header name - per spec use uppercase "ID"
pub const REQUEST_ID_HEADER: &str = crate::constants::HEADER_X_REQUEST_ID;

/// Layer that adds a unique request ID to each request/response
#[derive(Clone, Default)]
pub struct RequestIdLayer;

impl<S> Layer<S> for RequestIdLayer {
    type Service = RequestIdMiddleware<S>;

    fn layer(&self, inner: S) -> Self::Service {
        RequestIdMiddleware { inner }
    }
}

#[derive(Clone)]
pub struct RequestIdMiddleware<S> {
    inner: S,
}

impl<S> Service<Request<Body>> for RequestIdMiddleware<S>
where
    S: Service<Request<Body>, Response = Response<Body>> + Clone + Send + 'static,
    S::Future: Send + 'static,
{
    type Response = S::Response;
    type Error = S::Error;
    type Future = std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<Self::Response, Self::Error>> + Send>,
    >;

    fn poll_ready(&mut self, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, mut request: Request<Body>) -> Self::Future {
        let clone = self.inner.clone();
        let mut inner = std::mem::replace(&mut self.inner, clone);

        // Get or generate request ID per spec (16-formats.md)
        // Format: "req_" + hex(16 random bytes) or fallback to "req_fallback"
        // REL-014: Limit max length to 128 chars to prevent DoS via oversized IDs
        const MAX_REQUEST_ID_LEN: usize = 128;
        let request_id = request
            .headers()
            .get(REQUEST_ID_HEADER)
            .and_then(|h| h.to_str().ok())
            .filter(|s| s.len() <= MAX_REQUEST_ID_LEN)
            .map(|s| s.to_string())
            .unwrap_or_else(generate_request_id);

        // Parse header value once, with fallback to avoid panics
        // The generated request ID is always valid ASCII hex, but we handle errors gracefully
        let header_value = HeaderValue::from_str(&request_id)
            .unwrap_or_else(|_| HeaderValue::from_static("req_fallback"));

        // Add to request headers
        request
            .headers_mut()
            .insert(REQUEST_ID_HEADER, header_value.clone());

        Box::pin(async move {
            let mut response = inner.call(request).await?;

            // Add to response headers (reuse the already-parsed value)
            response
                .headers_mut()
                .insert(REQUEST_ID_HEADER, header_value);

            Ok(response)
        })
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience functions
// ─────────────────────────────────────────────────────────────────────────────

/// Create security headers layer
pub fn security_headers() -> SecurityHeadersLayer {
    SecurityHeadersLayer
}

/// Create request ID layer
pub fn request_id() -> RequestIdLayer {
    RequestIdLayer
}
