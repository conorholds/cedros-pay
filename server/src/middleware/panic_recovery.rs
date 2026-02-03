//! Panic recovery middleware
//!
//! Catches panics in handlers and converts them to 500 Internal Server Error
//! responses instead of crashing the server.
//! Per spec (10-middleware.md): Log stack trace on panic recovery.

use std::any::Any;
use std::panic::AssertUnwindSafe;

use std::backtrace::Backtrace;

use axum::{
    body::Body,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use futures_util::FutureExt;
use tower::{Layer, Service};
use tracing::error;

/// Panic recovery layer
#[derive(Clone, Copy, Default)]
pub struct PanicRecoveryLayer;

impl PanicRecoveryLayer {
    pub fn new() -> Self {
        Self
    }
}

impl<S> Layer<S> for PanicRecoveryLayer {
    type Service = PanicRecoveryService<S>;

    fn layer(&self, inner: S) -> Self::Service {
        PanicRecoveryService { inner }
    }
}

/// Panic recovery service wrapper
#[derive(Clone)]
pub struct PanicRecoveryService<S> {
    inner: S,
}

impl<S> Service<axum::http::Request<Body>> for PanicRecoveryService<S>
where
    S: Service<axum::http::Request<Body>, Response = Response> + Clone + Send + 'static,
    S::Future: Send,
{
    type Response = Response;
    type Error = S::Error;
    type Future = std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<Self::Response, Self::Error>> + Send>,
    >;

    fn poll_ready(
        &mut self,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Result<(), Self::Error>> {
        self.inner.poll_ready(cx)
    }

    fn call(&mut self, req: axum::http::Request<Body>) -> Self::Future {
        let clone = self.inner.clone();
        let mut inner = std::mem::replace(&mut self.inner, clone);

        Box::pin(async move {
            let result = AssertUnwindSafe(inner.call(req)).catch_unwind().await;

            match result {
                Ok(response) => response,
                Err(panic_payload) => {
                    let panic_message = extract_panic_message(&panic_payload);
                    let backtrace = Backtrace::force_capture();
                    error!(
                        message = "Handler panicked",
                        panic = %panic_message,
                        backtrace = %backtrace
                    );
                    Ok(panic_response())
                }
            }
        })
    }
}

/// Extract a string message from a panic payload
fn extract_panic_message(payload: &Box<dyn Any + Send>) -> String {
    if let Some(s) = payload.downcast_ref::<&str>() {
        s.to_string()
    } else if let Some(s) = payload.downcast_ref::<String>() {
        s.clone()
    } else {
        "Unknown panic".to_string()
    }
}

/// Generate the response for a panic
fn panic_response() -> Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        [("Content-Type", "application/json")],
        r#"{"error":"internal_server_error","message":"An unexpected error occurred"}"#,
    )
        .into_response()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{routing::get, Router};
    use tower::ServiceExt;

    async fn handler_ok() -> &'static str {
        "ok"
    }

    async fn handler_panic() -> &'static str {
        panic!("intentional panic for testing")
    }

    #[tokio::test]
    async fn test_normal_request() {
        let app = Router::new()
            .route("/", get(handler_ok))
            .layer(PanicRecoveryLayer::new());

        let request = axum::http::Request::builder()
            .uri("/")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_panic_recovery() {
        let app = Router::new()
            .route("/panic", get(handler_panic))
            .layer(PanicRecoveryLayer::new());

        let request = axum::http::Request::builder()
            .uri("/panic")
            .body(Body::empty())
            .unwrap();

        let response = app.oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);
    }
}
