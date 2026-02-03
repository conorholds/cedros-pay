use std::sync::Arc;

use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use subtle::ConstantTimeEq;

use crate::observability::Metrics;

/// State for metrics endpoint with optional API key authentication
#[derive(Clone)]
pub struct MetricsState {
    /// If set, X-API-Key header must match this value
    pub api_key: Option<String>,
}

/// GET /metrics - Prometheus metrics endpoint with optional auth
/// Per spec (09-configuration.md): If CEDROS_ADMIN_METRICS_API_KEY is set,
/// requires X-API-Key header. Returns 401 if invalid/missing.
pub async fn prometheus_metrics(
    State(state): State<Arc<MetricsState>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // Check API key if configured
    if let Some(ref expected_key) = state.api_key {
        let provided_key = headers
            .get("X-API-Key")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");

        // Use constant-time comparison to prevent timing attacks
        let provided_bytes = provided_key.as_bytes();
        let expected_bytes = expected_key.as_bytes();
        let keys_match: bool = provided_bytes.len() == expected_bytes.len()
            && provided_bytes.ct_eq(expected_bytes).into();
        if !keys_match {
            return (
                StatusCode::UNAUTHORIZED,
                [("Content-Type", "text/plain")],
                "Unauthorized".to_string(),
            );
        }
    }

    let metrics = Metrics::gather();

    (
        StatusCode::OK,
        [("Content-Type", "text/plain; version=0.0.4; charset=utf-8")],
        metrics,
    )
}
