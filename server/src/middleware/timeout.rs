use std::time::Duration;

use axum::{
    body::Body,
    extract::Request,
    http::{Response, StatusCode},
    middleware::Next,
};
use tokio::time::timeout;

/// Timeout configuration for different route types per spec (10-middleware.md)
#[derive(Debug, Clone, Copy, Default)]
pub enum RouteTimeout {
    /// Health and discovery endpoints - 5 seconds
    HealthDiscovery,
    /// Payment processing endpoints - must exceed Solana confirmation wait.
    Payments,
    /// Default timeout - 30 seconds
    #[default]
    Default,
}

impl RouteTimeout {
    pub fn duration(&self) -> Duration {
        match self {
            RouteTimeout::HealthDiscovery => Duration::from_secs(5),
            RouteTimeout::Payments => {
                crate::constants::DEFAULT_CONFIRMATION_TIMEOUT + Duration::from_secs(10)
            }
            RouteTimeout::Default => Duration::from_secs(30),
        }
    }
}

/// Timeout middleware function for use with axum::middleware::from_fn
pub async fn timeout_middleware(req: Request, next: Next) -> Result<Response<Body>, StatusCode> {
    timeout_middleware_with_duration(req, next, RouteTimeout::Default.duration()).await
}

/// Timeout middleware with configurable duration
pub async fn timeout_middleware_with_duration(
    req: Request,
    next: Next,
    duration: Duration,
) -> Result<Response<Body>, StatusCode> {
    match timeout(duration, next.run(req)).await {
        Ok(response) => Ok(response),
        Err(_elapsed) => {
            tracing::warn!(timeout_secs = duration.as_secs(), "Request timed out");
            // 408 Request Timeout - server-side handler timeout (not upstream proxy timeout)
            Err(StatusCode::REQUEST_TIMEOUT)
        }
    }
}

/// Middleware for health/discovery routes (5 second timeout)
pub async fn health_timeout_middleware(
    req: Request,
    next: Next,
) -> Result<Response<Body>, StatusCode> {
    timeout_middleware_with_duration(req, next, RouteTimeout::HealthDiscovery.duration()).await
}

/// Middleware for payment routes (60 second timeout)
pub async fn payment_timeout_middleware(
    req: Request,
    next: Next,
) -> Result<Response<Body>, StatusCode> {
    timeout_middleware_with_duration(req, next, RouteTimeout::Payments.duration()).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_route_timeout_durations() {
        assert_eq!(
            RouteTimeout::HealthDiscovery.duration(),
            Duration::from_secs(5)
        );
        assert!(
            RouteTimeout::Payments.duration() >= crate::constants::DEFAULT_CONFIRMATION_TIMEOUT
        );
        assert_eq!(RouteTimeout::Default.duration(), Duration::from_secs(30));
    }
}
