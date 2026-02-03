use axum::{
    body::Body,
    extract::Request,
    http::{header::HeaderValue, Response, StatusCode},
    middleware::Next,
};
use std::sync::Arc;

/// API version extracted from request
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ApiVersion(pub u8);

impl Default for ApiVersion {
    fn default() -> Self {
        ApiVersion(1)
    }
}

/// API version configuration
#[derive(Debug, Clone)]
pub struct ApiVersionConfig {
    /// Current supported version
    pub current_version: u8,
    /// Minimum supported version
    pub min_version: u8,
    /// Deprecated versions (will include Deprecation header)
    pub deprecated_versions: Vec<u8>,
    /// Sunset dates for deprecated versions (version -> RFC 8594 date)
    pub sunset_dates: std::collections::HashMap<u8, String>,
}

impl Default for ApiVersionConfig {
    fn default() -> Self {
        Self {
            current_version: 1,
            min_version: 1,
            deprecated_versions: Vec::new(),
            sunset_dates: std::collections::HashMap::new(),
        }
    }
}

/// State for API version middleware
#[derive(Clone)]
pub struct ApiVersionState {
    pub config: Arc<ApiVersionConfig>,
}

impl ApiVersionState {
    pub fn new(config: ApiVersionConfig) -> Self {
        Self {
            config: Arc::new(config),
        }
    }
}

/// Extract API version from request headers
///
/// Priority per spec (10-middleware.md lines 61-63):
/// 1. Accept: application/vnd.cedros.v1+json (highest priority)
/// 2. Accept: application/json; version=1
/// 3. X-API-Version: 1 (lowest priority)
/// 4. Default to version 1
fn extract_version<B>(req: &axum::http::Request<B>) -> Option<u8> {
    // Check Accept header first (highest priority per spec)
    if let Some(accept) = req.headers().get("accept") {
        let accept_str = accept.to_str().unwrap_or("");

        // Priority 1: application/vnd.cedros.v1+json
        if let Some(start) = accept_str.find("application/vnd.cedros.v") {
            let rest = &accept_str[start + 24..];
            if let Some(end) = rest.find('+') {
                if let Ok(v) = rest[..end].parse::<u8>() {
                    return Some(v);
                }
            }
        }

        // Priority 2: application/json; version=1
        if accept_str.contains("application/json") {
            if let Some(idx) = accept_str.find("version=") {
                let rest = &accept_str[idx + 8..];
                let version_str: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
                if let Ok(v) = version_str.parse::<u8>() {
                    return Some(v);
                }
            }
        }
    }

    // Priority 3: X-API-Version header (lowest priority per spec)
    if let Some(version_header) = req.headers().get("x-api-version") {
        if let Ok(v) = version_header.to_str().unwrap_or("").parse::<u8>() {
            return Some(v);
        }
    }

    None
}

/// API version middleware
///
/// Parses Accept header for version negotiation per spec.
///
/// Supported formats:
/// - Accept: application/vnd.cedros.v1+json
/// - Accept: application/json; version=1
/// - X-API-Version: 1
///
/// Response headers:
/// - X-API-Version: version used
/// - Vary: Accept, X-API-Version
/// - Deprecation: true (if version is deprecated, RFC 8594)
/// - Sunset: date (if sunset scheduled)
pub async fn api_version_middleware(req: Request, next: Next) -> Response<Body> {
    let version = extract_version(&req).unwrap_or(1);

    // Store version in extensions for handlers to access
    let mut req = req;
    req.extensions_mut().insert(ApiVersion(version));

    // Continue with request
    let mut response = next.run(req).await;

    // Add response headers
    let headers = response.headers_mut();

    // Always include X-API-Version
    if let Ok(v) = HeaderValue::from_str(&version.to_string()) {
        headers.insert("x-api-version", v);
    }

    // Add Vary header for caching
    headers.insert("vary", HeaderValue::from_static("Accept, X-API-Version"));

    response
}

/// API version middleware with config
///
/// Use this version for production with version deprecation support.
pub async fn api_version_middleware_with_config(
    state: axum::extract::State<ApiVersionState>,
    req: Request,
    next: Next,
) -> Result<Response<Body>, StatusCode> {
    let version = extract_version(&req).unwrap_or(state.config.current_version);

    // Validate version is supported
    if version < state.config.min_version {
        return Err(StatusCode::NOT_ACCEPTABLE);
    }

    // Store version in extensions for handlers to access
    let mut req = req;
    req.extensions_mut().insert(ApiVersion(version));

    // Continue with request
    let mut response = next.run(req).await;

    // Add response headers
    let headers = response.headers_mut();

    // Always include X-API-Version
    if let Ok(v) = HeaderValue::from_str(&version.to_string()) {
        headers.insert("x-api-version", v);
    }

    // Add Vary header for caching
    headers.insert("vary", HeaderValue::from_static("Accept, X-API-Version"));

    // Add deprecation headers if applicable
    if state.config.deprecated_versions.contains(&version) {
        headers.insert("deprecation", HeaderValue::from_static("true"));

        if let Some(sunset_date) = state.config.sunset_dates.get(&version) {
            if let Ok(sunset) = HeaderValue::from_str(sunset_date) {
                headers.insert("sunset", sunset);
            }
        }
    }

    Ok(response)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Request;

    fn make_request(headers: &[(&str, &str)]) -> Request<()> {
        let mut builder = Request::builder().uri("/");
        for (k, v) in headers {
            builder = builder.header(*k, *v);
        }
        builder.body(()).unwrap()
    }

    #[test]
    fn test_extract_version_from_x_api_version() {
        let req = make_request(&[("x-api-version", "2")]);
        assert_eq!(extract_version(&req), Some(2));
    }

    #[test]
    fn test_extract_version_from_vendor_accept() {
        let req = make_request(&[("accept", "application/vnd.cedros.v1+json")]);
        assert_eq!(extract_version(&req), Some(1));
    }

    #[test]
    fn test_extract_version_from_json_accept() {
        let req = make_request(&[("accept", "application/json; version=2")]);
        assert_eq!(extract_version(&req), Some(2));
    }

    #[test]
    fn test_extract_version_none() {
        let req = make_request(&[("accept", "application/json")]);
        assert_eq!(extract_version(&req), None);
    }
}
