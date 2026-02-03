//! Response utilities for safe JSON serialization
//!
//! This module provides helper functions to avoid `.unwrap()` calls when
//! serializing response types to JSON, preventing potential panics.

use axum::{
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Serialize;

/// Safely convert a serializable value to JSON, falling back to an error response on failure.
///
/// This is preferred over `serde_json::to_value(v).unwrap()` because:
/// 1. It cannot panic
/// 2. It provides a meaningful error response if serialization fails
///
/// Note: Serialization of well-defined structs with `#[derive(Serialize)]` should
/// never fail in practice, but this handles edge cases gracefully.
pub fn to_json<T: Serialize>(value: T) -> Json<serde_json::Value> {
    Json(serde_json::to_value(value).unwrap_or_else(|e| {
        tracing::error!(error = %e, "Failed to serialize response");
        serde_json::json!({
            "error": "internal_serialization_error",
            "message": "Failed to serialize response"
        })
    }))
}

/// Create a successful JSON response with the given value
pub fn json_ok<T: Serialize>(value: T) -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::OK, to_json(value))
}

/// Create a JSON response with custom status code
pub fn json_response<T: Serialize>(
    status: StatusCode,
    value: T,
) -> (StatusCode, Json<serde_json::Value>) {
    (status, to_json(value))
}

/// Create a JSON error response from error module types
pub fn json_error(
    status: StatusCode,
    body: crate::errors::ErrorResponse,
) -> (StatusCode, Json<serde_json::Value>) {
    (status, to_json(body))
}

/// Create a successful JSON response with Cache-Control header
/// Use for cacheable GET endpoints (e.g., product lists, discovery)
pub fn json_ok_cached<T: Serialize>(value: T, max_age_secs: u32) -> impl IntoResponse {
    let mut headers = HeaderMap::new();
    // Format is always valid ASCII, parse cannot fail
    let cache_value = format!("public, max-age={}", max_age_secs)
        .parse()
        .expect("static cache-control format is always valid");
    headers.insert(header::CACHE_CONTROL, cache_value);
    (StatusCode::OK, headers, to_json(value))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;

    #[derive(Serialize)]
    struct TestResponse {
        message: String,
    }

    #[test]
    fn test_to_json_success() {
        let resp = TestResponse {
            message: "hello".to_string(),
        };
        let json = to_json(resp);
        assert_eq!(json.0["message"], "hello");
    }

    #[test]
    fn test_json_ok() {
        let resp = TestResponse {
            message: "success".to_string(),
        };
        let (status, json) = json_ok(resp);
        assert_eq!(status, StatusCode::OK);
        assert_eq!(json.0["message"], "success");
    }

    #[test]
    fn test_json_response_custom_status() {
        let resp = TestResponse {
            message: "created".to_string(),
        };
        let (status, json) = json_response(StatusCode::CREATED, resp);
        assert_eq!(status, StatusCode::CREATED);
        assert_eq!(json.0["message"], "created");
    }
}
