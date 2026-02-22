use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use axum::{
    body::Body,
    extract::Request,
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::Response,
};
use chrono::Utc;
use http_body_util::{BodyExt, Limited};
use sha2::{Digest, Sha256};

use crate::constants::{HEADER_IDEMPOTENCY_KEY, IDEMPOTENCY_KEY_TTL, MAX_REQUEST_BODY_SIZE};

const MAX_IDEMPOTENCY_CACHED_RESPONSE_BODY_SIZE: usize = 256 * 1024;
use crate::middleware::tenant::TenantContext;
use crate::storage::{IdempotencyResponse, StorageError, Store};

/// Idempotency middleware state
#[derive(Clone)]
pub struct IdempotencyState<S: Store> {
    store: Arc<S>,
    ttl: Duration,
}

impl<S: Store> IdempotencyState<S> {
    pub fn new(store: Arc<S>) -> Self {
        Self {
            store,
            ttl: IDEMPOTENCY_KEY_TTL,
        }
    }

    pub fn with_ttl(store: Arc<S>, ttl: Duration) -> Self {
        Self { store, ttl }
    }
}

fn build_idempotency_key(
    tenant_id: &str,
    method: &str,
    path_and_query: &str,
    raw_idempotency_key: &str,
) -> String {
    format!(
        "{}:{}:{}:{}",
        tenant_id, method, path_and_query, raw_idempotency_key
    )
}

/// Idempotency middleware for POST/PUT/PATCH requests
///
/// Per spec (10-middleware.md): Cache key format is
/// {tenant_id}:{METHOD}:{PATH}:{idempotency_key} for multi-tenant isolation.
///
/// The request body hash is stored alongside the cached response so we can reject Idempotency-Key
/// reuse with a different request body (409 Conflict).
pub async fn idempotency_middleware<S: Store + 'static>(
    axum::extract::State(state): axum::extract::State<Arc<IdempotencyState<S>>>,
    request: Request<Body>,
    next: Next,
) -> Response {
    // Only apply to mutating methods
    let method = request.method().clone();
    if !["POST", "PUT", "PATCH"].contains(&method.as_str()) {
        return next.run(request).await;
    }

    // Check for idempotency key header
    let raw_idempotency_key = match request.headers().get(HEADER_IDEMPOTENCY_KEY) {
        Some(v) => match v.to_str() {
            Ok(s) if !s.is_empty() => s.to_string(),
            _ => return next.run(request).await,
        },
        None => return next.run(request).await,
    };

    // Extract tenant ID for multi-tenant isolation per spec (10-middleware.md)
    // LOG-001: Use debug level since missing tenant may be expected for some endpoints
    let tenant_id = match request.extensions().get::<TenantContext>() {
        Some(tc) if !tc.tenant_id.is_empty() => tc.tenant_id.clone(),
        _ => {
            tracing::debug!(
                path = %request.uri().path(),
                "Missing TenantContext in idempotency middleware, using default tenant"
            );
            "default".to_string()
        }
    };

    let path_and_query = request
        .uri()
        .path_and_query()
        .map(|pq| pq.as_str())
        .unwrap_or_else(|| request.uri().path())
        .to_string();

    // Extract body with stream-based size limit to prevent DoS via large payloads.
    // Limited enforces the size cap during streaming rather than buffering the full body first.
    let (parts, body) = request.into_parts();
    let limited_body = Limited::new(body, MAX_REQUEST_BODY_SIZE);
    let body_bytes = match limited_body.collect().await {
        Ok(collected) => collected.to_bytes(),
        Err(e) => {
            let err_str = e.to_string();
            if err_str.contains("length limit exceeded") {
                return Response::builder()
                    .status(StatusCode::PAYLOAD_TOO_LARGE)
                    .body(Body::from("Request body too large"))
                    .unwrap_or_else(|_| Response::new(Body::empty()));
            }
            tracing::error!(error = %e, "Failed to read request body for idempotency");
            return Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(Body::from("Failed to read request body"))
                .unwrap_or_else(|_| Response::new(Body::empty()));
        }
    };

    // MW-002: Use full SHA256 hash to prevent birthday collision attacks
    // Previously truncated to 8 bytes (64 bits), which has ~50% collision at 2^32 requests
    let body_hash = {
        let mut hasher = Sha256::new();
        hasher.update(&body_bytes);
        let result = hasher.finalize();
        hex::encode(result) // Full 32 bytes = 64 hex chars
    };

    // Build cache key: {tenant_id}:{METHOD}:{PATH}:{idempotency_key}
    let idempotency_key = build_idempotency_key(
        &tenant_id,
        method.as_str(),
        &path_and_query,
        &raw_idempotency_key,
    );

    // Check for cached response
    if let Ok(Some(cached)) = state.store.get_idempotency_key(&idempotency_key).await {
        if let Some(stored_hash) = cached.headers.get(INTERNAL_IDEMPOTENCY_REQUEST_HASH_HEADER) {
            if stored_hash != &body_hash {
                return Response::builder()
                    .status(StatusCode::CONFLICT)
                    .body(Body::from(
                        "Idempotency-Key reuse with different request body",
                    ))
                    .unwrap_or_else(|_| Response::new(Body::empty()));
            }
        }
        return build_cached_response(cached);
    }

    // Reconstruct request with body for next handler
    let request = Request::from_parts(parts, Body::from(body_bytes.clone()));

    // Execute request and capture response
    let response = next.run(request).await;

    // Cache the response
    let (parts, body) = response.into_parts();
    let bytes = match body.collect().await {
        Ok(collected) => collected.to_bytes(),
        Err(_) => return Response::from_parts(parts, Body::empty()),
    };

    // Per spec (10-middleware.md): Only cache 2xx responses
    // Non-success responses should not be cached (allows retry)
    if parts.status.is_success() {
        if bytes.len() <= MAX_IDEMPOTENCY_CACHED_RESPONSE_BODY_SIZE {
            let mut headers: HashMap<String, String> = parts
                .headers
                .iter()
                .filter_map(|(k, v)| Some((k.to_string(), v.to_str().ok()?.to_string())))
                .collect();
            headers.insert(
                INTERNAL_IDEMPOTENCY_REQUEST_HASH_HEADER.to_string(),
                body_hash.clone(),
            );

            let cached = IdempotencyResponse {
                status_code: parts.status.as_u16() as i32,
                headers,
                body: bytes.to_vec(),
                cached_at: Utc::now(),
            };

            // ERR-002: Store in cache with warning on failure
            if let Err(e) = state
                .store
                .save_idempotency_key(&idempotency_key, cached.clone(), state.ttl)
                .await
            {
                tracing::warn!(
                    error = %e,
                    key = %idempotency_key,
                    "failed to save idempotency key - response will not be cached"
                );
            }
        } else {
            tracing::warn!(
                size = bytes.len(),
                max = MAX_IDEMPOTENCY_CACHED_RESPONSE_BODY_SIZE,
                "Idempotency response too large to cache"
            );
        }
    }

    // Rebuild response
    let mut response = Response::new(Body::from(bytes));
    *response.status_mut() = parts.status;
    *response.headers_mut() = parts.headers;
    response
}

/// Header indicating this is a cached replay per spec (10-middleware.md)
pub const HEADER_IDEMPOTENCY_REPLAY: &str = "x-idempotency-replay";

const INTERNAL_IDEMPOTENCY_REQUEST_HASH_HEADER: &str = "x-cedros-idempotency-request-hash";

fn build_cached_response(cached: IdempotencyResponse) -> Response {
    let mut response = Response::new(Body::from(cached.body));
    *response.status_mut() = StatusCode::from_u16(cached.status_code as u16)
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);

    for (k, v) in cached.headers {
        if k == INTERNAL_IDEMPOTENCY_REQUEST_HASH_HEADER {
            continue;
        }
        if let (Ok(name), Ok(value)) = (
            k.parse::<axum::http::header::HeaderName>(),
            v.parse::<axum::http::header::HeaderValue>(),
        ) {
            response.headers_mut().insert(name, value);
        }
    }

    // Add X-Idempotency-Replay header per spec (10-middleware.md)
    response.headers_mut().insert(
        HEADER_IDEMPOTENCY_REPLAY,
        axum::http::header::HeaderValue::from_static("true"),
    );

    response
}

/// Simple idempotency check without full middleware (for manual use)
pub async fn check_idempotency<S: Store>(
    store: &S,
    key: &str,
) -> Result<Option<IdempotencyResponse>, StorageError> {
    store.get_idempotency_key(key).await
}

/// Save idempotency response
pub async fn save_idempotency<S: Store>(
    store: &S,
    key: &str,
    status_code: u16,
    headers: &HeaderMap,
    body: &[u8],
    ttl: Duration,
) -> Result<(), StorageError> {
    let cached = IdempotencyResponse {
        status_code: status_code as i32,
        headers: headers
            .iter()
            .filter_map(|(k, v)| Some((k.to_string(), v.to_str().ok()?.to_string())))
            .collect(),
        body: body.to_vec(),
        cached_at: Utc::now(),
    };
    store.save_idempotency_key(key, cached, ttl).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_idempotency_key_includes_query() {
        let key_a = build_idempotency_key("tenant", "POST", "/paywall/v1/cart?x=1", "abc");
        let key_b = build_idempotency_key("tenant", "POST", "/paywall/v1/cart?x=2", "abc");
        assert_ne!(key_a, key_b);
        assert!(key_a.contains("?x=1"));
    }
}
