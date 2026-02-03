use axum::http::{header, HeaderValue, Method};
use tower_http::cors::{AllowOrigin, Any, CorsLayer};

use crate::config::ConfigError;

/// Build CORS layer from allowed origins and environment
/// Per spec 10-middleware.md:
/// - Allowed methods: GET, POST, DELETE, OPTIONS
/// - Allowed headers: * (all)
/// - Exposed headers: Location
/// - Max-age: 300 seconds (5 minutes)
/// - Credentials: disabled
///
/// SECURITY: If allowed_origins is empty, CORS is configured to reject all
/// cross-origin requests (only same-origin requests allowed). This is the
/// secure default. Operators must explicitly configure allowed origins.
///
/// SECURITY: Wildcard "*" is blocked in production environment. To use wildcard
/// in development, set CEDROS_LOG_ENVIRONMENT to a non-production value.
pub fn build_cors_layer(allowed_origins: &[String]) -> CorsLayer {
    build_cors_layer_with_env(allowed_origins, "production")
}

/// Validate CORS configuration.
///
/// Returns an error instead of panicking so callers can fail gracefully at startup.
pub fn validate_cors_config(
    allowed_origins: &[String],
    environment: &str,
) -> Result<(), ConfigError> {
    let is_production = environment == "production";
    if is_production && allowed_origins.iter().any(|o| o == "*") {
        return Err(ConfigError::Validation(
            "SECURITY ERROR: CORS wildcard '*' is not allowed in production environment. \
             Configure specific origins in CORS_ALLOWED_ORIGINS."
                .into(),
        ));
    }
    Ok(())
}

/// Build CORS layer with explicit environment check.
///
/// WARNING: Callers should typically run `validate_cors_config` at startup.
pub fn build_cors_layer_with_env(allowed_origins: &[String], environment: &str) -> CorsLayer {
    let is_production = environment == "production";

    let layer = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::DELETE, Method::OPTIONS])
        // Per spec (10-middleware.md line 16): Allowed headers = * (all)
        .allow_headers(Any)
        // Per spec (10-middleware.md line 17): Exposed headers = Location
        .expose_headers([header::LOCATION])
        // Per spec (10-middleware.md line 18): Max age = 300 seconds
        .max_age(std::time::Duration::from_secs(300))
        // Per spec (10-middleware.md line 19): Credentials = disabled
        .allow_credentials(false);

    // SECURITY: Empty list = deny all cross-origin requests (secure default)
    // Use "*" explicitly in config to allow any origin (NOT recommended for production)
    if allowed_origins.is_empty() {
        tracing::warn!(
            "CORS allowed_origins is empty - cross-origin requests will be rejected. \
             Configure CORS_ALLOWED_ORIGINS for cross-origin access."
        );
        // Empty origins list = no cross-origin requests allowed
        layer.allow_origin(AllowOrigin::list(std::iter::empty::<HeaderValue>()))
    } else if allowed_origins.iter().any(|o| o == "*") {
        // SECURITY: Block wildcard in production to prevent cross-origin attacks.
        // We should have validated this at startup; fall back to deny-all to avoid panicking.
        if is_production {
            tracing::error!(
                "SECURITY ERROR: CORS wildcard '*' is not allowed in production environment. \
                 Cross-origin requests will be rejected."
            );
            return layer.allow_origin(AllowOrigin::list(std::iter::empty::<HeaderValue>()));
        }

        // Explicit wildcard allows any origin (development only)
        tracing::warn!(
            environment = %environment,
            "CORS configured to allow ANY origin - this is insecure, only use for development!"
        );
        layer.allow_origin(AllowOrigin::any())
    } else {
        let origins: Vec<HeaderValue> = allowed_origins
            .iter()
            .filter_map(|o| o.parse().ok())
            .collect();
        layer.allow_origin(origins)
    }
}

/// Default CORS layer (deny cross-origin - secure default)
pub fn layer() -> CorsLayer {
    build_cors_layer(&[])
}
