use std::time::Instant;

use axum::{body::Body, extract::MatchedPath, extract::Request, http::Response, middleware::Next};
use tracing::{info, warn};

use crate::observability::{dec_http_in_flight, inc_http_in_flight, record_http_request};

/// Structured logging layer for request/response logging per spec (14-observability.md)
///
/// Logged fields:
/// - request_id: Request correlation ID
/// - method: HTTP method
/// - path: Request path
/// - status: Response status code
/// - duration_ms: Request duration
/// - remote_ip: Client IP (from real_ip middleware)
/// - user_agent: User agent string
/// - wallet: User wallet (truncated for privacy)
///
/// This returns the basic TraceLayer. For more advanced structured logging,
/// use `structured_logging_middleware` instead.
pub fn layer() -> tower_http::trace::TraceLayer<
    tower_http::classify::SharedClassifier<tower_http::classify::ServerErrorsAsFailures>,
> {
    tower_http::trace::TraceLayer::new_for_http()
}

/// Custom logging middleware for more detailed structured logging
///
/// Use this instead of the TraceLayer when you need full control
/// over the JSON log output format.
pub async fn structured_logging_middleware(req: Request, next: Next) -> Response<Body> {
    let start = Instant::now();
    inc_http_in_flight();

    // Extract request metadata
    let method = req.method().to_string();
    let path = extract_matched_path(&req);
    let request_id = req
        .headers()
        .get("x-request-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "unknown".to_string());
    let user_agent = req
        .headers()
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_default();

    // Extract wallet if present (from authorization or custom header)
    let wallet = req
        .headers()
        .get("x-wallet")
        .and_then(|v| v.to_str().ok())
        .map(truncate_address);

    // Extract remote IP (set by real_ip middleware)
    let remote_ip = extract_remote_ip(&req);

    // Process request
    let response = next.run(req).await;
    dec_http_in_flight();

    // Calculate duration
    let duration_ms = start.elapsed().as_millis() as u64;
    let status = response.status().as_u16();

    // Record HTTP metrics per spec (14-observability.md)
    let duration_secs = start.elapsed().as_secs_f64();
    record_http_request(&method, &path, status, duration_secs);

    // Log with structured fields per spec
    if status >= 500 {
        warn!(
            request_id = %request_id,
            method = %method,
            path = %path,
            status = status,
            duration_ms = duration_ms,
            remote_ip = %remote_ip,
            user_agent = %user_agent,
            wallet = ?wallet,
            "Server error"
        );
    } else {
        info!(
            request_id = %request_id,
            method = %method,
            path = %path,
            status = status,
            duration_ms = duration_ms,
            remote_ip = %remote_ip,
            user_agent = %user_agent,
            wallet = ?wallet,
            "Request completed"
        );
    }

    response
}

/// Truncate wallet address for privacy per spec
///
/// Example: "7cVfgArCheMR6Cs4t6vz5rfnqd3CUjpT" → "7cVf...jpT"
pub fn truncate_address(addr: &str) -> String {
    if addr.len() <= 8 {
        addr.to_string()
    } else {
        format!("{}...{}", &addr[..4], &addr[addr.len() - 4..])
    }
}

fn extract_remote_ip<B>(req: &Request<B>) -> String {
    req.extensions()
        .get::<crate::middleware::RealIp>()
        .map(|ip| ip.ip().to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

fn extract_matched_path<B>(req: &Request<B>) -> String {
    req.extensions()
        .get::<MatchedPath>()
        .map(|path| path.as_str().to_string())
        .unwrap_or_else(|| req.uri().path().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Request;

    #[test]
    fn test_truncate_address() {
        // Test Solana address (base58, 32 bytes -> typically 44 chars)
        assert_eq!(
            truncate_address("7cVfgArCheMR6Cs4t6vz5rfnqd3CUjpT"),
            "7cVf...UjpT"
        );
        assert_eq!(truncate_address("short"), "short");
        assert_eq!(truncate_address("12345678"), "12345678");
        // 9 chars - just above threshold
        assert_eq!(truncate_address("123456789"), "1234...6789");
    }

    #[test]
    fn test_extract_remote_ip_from_extension() {
        let mut req = Request::builder().body(()).unwrap();
        req.extensions_mut()
            .insert(crate::middleware::RealIp("1.2.3.4".parse().unwrap()));

        assert_eq!(extract_remote_ip(&req), "1.2.3.4");
    }

    #[test]
    fn test_extract_remote_ip_missing() {
        let req = Request::builder().body(()).unwrap();
        assert_eq!(extract_remote_ip(&req), "unknown");
    }

    #[tokio::test]
    async fn test_extract_matched_path_uses_template() {
        use axum::extract::Request as AxumRequest;
        use axum::routing::get;
        use axum::Router;
        use http_body_util::BodyExt;
        use tower::ServiceExt;

        async fn handler(req: AxumRequest) -> String {
            extract_matched_path(&req)
        }

        let app = Router::new().route("/users/{id}", get(handler));
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/users/123")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let body_str = std::str::from_utf8(&body).unwrap();

        assert_eq!(body_str, "/users/{id}");
    }

    #[test]
    fn test_extract_matched_path_falls_back_to_uri() {
        let req = Request::builder().uri("/users/123").body(()).unwrap();

        assert_eq!(extract_matched_path(&req), "/users/123");
    }
}
