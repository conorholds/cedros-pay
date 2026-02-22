//! Stripe client implementation
//!
//! This module provides the StripeClient for interacting with Stripe's API.

mod checkout;
mod checkout_multi;
mod coupons;
mod products;
mod refunds;
mod subscriptions;
mod webhook_handlers;
mod webhooks;

#[cfg(test)]
mod tests;

use std::sync::Arc;

use chrono::{DateTime, LocalResult, TimeZone, Utc};
use tracing::warn;

use crate::config::Config;
use crate::constants::STRIPE_API_TIMEOUT;
use crate::middleware::circuit_breaker::{
    new_circuit_breaker, CircuitBreakerConfig, CircuitBreakerError, SharedCircuitBreaker,
};
use crate::models::{BillingPeriod, SubscriptionStatus};
use crate::services::{CedrosLoginClient, ServiceError, ServiceResult};
use crate::storage::Store;
use crate::webhooks::Notifier;

use super::models::StripeCheckoutSession;

/// Safely convert a Unix timestamp to DateTime<Utc>, falling back to current time if invalid.
/// This prevents panics from invalid timestamps (e.g., out of range values).
pub(super) fn timestamp_to_datetime(secs: i64) -> DateTime<Utc> {
    match Utc.timestamp_opt(secs, 0) {
        LocalResult::Single(dt) => dt,
        LocalResult::Ambiguous(dt, _) => dt,
        LocalResult::None => {
            warn!(timestamp = secs, "Invalid timestamp, using current time");
            Utc::now()
        }
    }
}

pub(super) fn require_session_url(session: &StripeCheckoutSession) -> ServiceResult<String> {
    match session.url.as_deref() {
        Some(url) if !url.is_empty() => Ok(url.to_string()),
        _ => Err(ServiceError::Coded {
            code: crate::errors::ErrorCode::StripeError,
            message: "missing session url".into(),
        }),
    }
}

// ============================================================================
// Stripe Client
// ============================================================================

#[derive(Clone)]
pub struct StripeClient {
    pub config: Config,
    pub store: Arc<dyn Store>,
    pub notifier: Arc<dyn Notifier>,
    /// Coupon repository for incrementing usage on successful payments (per spec 21-stripe-client.md)
    pub coupons: Option<Arc<dyn crate::repositories::CouponRepository>>,
    pub(super) cedros_login: Option<Arc<CedrosLoginClient>>,
    pub(super) http_client: reqwest::Client,
    pub(super) circuit_breaker: SharedCircuitBreaker,
}

impl StripeClient {
    /// Build HTTP client with timeout for Stripe API calls
    fn build_http_client() -> ServiceResult<reqwest::Client> {
        reqwest::Client::builder()
            .timeout(STRIPE_API_TIMEOUT)
            .build()
            .map_err(|e| ServiceError::Internal(format!("stripe http client: {}", e)))
    }

    pub fn new(
        config: Config,
        store: Arc<dyn Store>,
        notifier: Arc<dyn Notifier>,
    ) -> ServiceResult<Self> {
        let cedros_login = Self::build_cedros_login(&config);
        Ok(Self {
            config,
            store,
            notifier,
            coupons: None,
            cedros_login,
            http_client: Self::build_http_client()?,
            circuit_breaker: new_circuit_breaker(CircuitBreakerConfig::stripe_api()),
        })
    }

    /// Create with coupon repository (per spec 21-stripe-client.md)
    pub fn with_coupons(mut self, coupons: Arc<dyn crate::repositories::CouponRepository>) -> Self {
        self.coupons = Some(coupons);
        self
    }

    /// Create with custom circuit breaker config
    pub fn with_circuit_breaker(
        config: Config,
        store: Arc<dyn Store>,
        notifier: Arc<dyn Notifier>,
        cb_config: CircuitBreakerConfig,
    ) -> ServiceResult<Self> {
        let cedros_login = Self::build_cedros_login(&config);
        Ok(Self {
            config,
            store,
            notifier,
            coupons: None,
            cedros_login,
            http_client: Self::build_http_client()?,
            circuit_breaker: new_circuit_breaker(cb_config),
        })
    }

    fn build_cedros_login(config: &Config) -> Option<Arc<CedrosLoginClient>> {
        if config.cedros_login.enabled
            && !config.cedros_login.base_url.is_empty()
            && !config.cedros_login.api_key.is_empty()
        {
            match CedrosLoginClient::new(
                config.cedros_login.base_url.clone(),
                config.cedros_login.api_key.clone(),
                config.cedros_login.timeout,
                config.cedros_login.jwt_issuer.clone(),
                config.cedros_login.jwt_audience.clone(),
            ) {
                Ok(c) => Some(Arc::new(c)),
                Err(e) => {
                    warn!(error = %e, "Failed to init cedros-login client for Stripe customer mapping");
                    None
                }
            }
        } else {
            None
        }
    }

    /// Check if Stripe is enabled
    pub fn is_enabled(&self) -> bool {
        !self.config.stripe.secret_key.is_empty()
    }
}

// ============================================================================
// HTTP helpers with circuit breaker protection
// ============================================================================

impl StripeClient {
    pub(super) async fn stripe_post(
        &self,
        endpoint: &str,
        form: &[(String, String)],
    ) -> ServiceResult<serde_json::Value> {
        self.stripe_post_with_idempotency(endpoint, form, None)
            .await
    }

    pub(super) async fn stripe_post_with_idempotency(
        &self,
        endpoint: &str,
        form: &[(String, String)],
        idempotency_key: Option<&str>,
    ) -> ServiceResult<serde_json::Value> {
        use crate::errors::ErrorCode;
        let url = format!("https://api.stripe.com/v1/{}", endpoint);

        let start = std::time::Instant::now();
        let operation = endpoint.split('/').next().unwrap_or(endpoint);

        let result = self
            .circuit_breaker
            .execute(async {
                let mut req = self
                    .http_client
                    .post(&url)
                    .basic_auth(&self.config.stripe.secret_key, None::<&str>)
                    .form(form);

                if let Some(key) = idempotency_key {
                    // https://docs.stripe.com/idempotency
                    req = req.header("Idempotency-Key", key);
                }

                req.send().await.map_err(|e| ServiceError::Coded {
                    code: ErrorCode::NetworkError,
                    message: e.to_string(),
                })
            })
            .await;

        let duration = start.elapsed().as_secs_f64();

        match result {
            Ok(response) => {
                let result = self.handle_stripe_response(response).await;
                let status = if result.is_ok() { "success" } else { "error" };
                crate::observability::metrics::record_stripe_api_call(operation, status, duration);
                if result.is_err() {
                    crate::observability::metrics::record_stripe_error(operation, "api_error");
                }
                result
            }
            Err(CircuitBreakerError::Open) => {
                crate::observability::metrics::record_stripe_api_call(
                    operation,
                    "circuit_open",
                    duration,
                );
                crate::observability::metrics::record_stripe_error(operation, "circuit_open");
                Err(ServiceError::Coded {
                    code: crate::errors::ErrorCode::ServiceUnavailable,
                    message: "Stripe API circuit breaker is open".into(),
                })
            }
            Err(CircuitBreakerError::ServiceError(e)) => {
                crate::observability::metrics::record_stripe_api_call(operation, "error", duration);
                crate::observability::metrics::record_stripe_error(operation, "network_error");
                Err(e)
            }
        }
    }

    pub(super) async fn stripe_get(&self, endpoint: &str) -> ServiceResult<serde_json::Value> {
        use crate::errors::ErrorCode;
        let url = format!("https://api.stripe.com/v1/{}", endpoint);
        let start = std::time::Instant::now();
        let operation = endpoint.split('/').next().unwrap_or(endpoint);

        let result = self
            .circuit_breaker
            .execute(async {
                self.http_client
                    .get(&url)
                    .basic_auth(&self.config.stripe.secret_key, None::<&str>)
                    .send()
                    .await
                    .map_err(|e| ServiceError::Coded {
                        code: ErrorCode::NetworkError,
                        message: e.to_string(),
                    })
            })
            .await;

        let duration = start.elapsed().as_secs_f64();

        match result {
            Ok(response) => {
                let result = self.handle_stripe_response(response).await;
                let status = if result.is_ok() { "success" } else { "error" };
                crate::observability::metrics::record_stripe_api_call(operation, status, duration);
                if result.is_err() {
                    crate::observability::metrics::record_stripe_error(operation, "api_error");
                }
                result
            }
            Err(CircuitBreakerError::Open) => {
                crate::observability::metrics::record_stripe_api_call(
                    operation,
                    "circuit_open",
                    duration,
                );
                crate::observability::metrics::record_stripe_error(operation, "circuit_open");
                Err(ServiceError::Coded {
                    code: crate::errors::ErrorCode::ServiceUnavailable,
                    message: "Stripe API circuit breaker is open".into(),
                })
            }
            Err(CircuitBreakerError::ServiceError(e)) => {
                crate::observability::metrics::record_stripe_api_call(operation, "error", duration);
                crate::observability::metrics::record_stripe_error(operation, "network_error");
                Err(e)
            }
        }
    }

    pub(super) async fn stripe_get_with_params(
        &self,
        endpoint: &str,
        params: &[(&str, String)],
    ) -> ServiceResult<serde_json::Value> {
        use crate::errors::ErrorCode;
        let url = format!("https://api.stripe.com/v1/{}", endpoint);
        let params_owned: Vec<(String, String)> = params
            .iter()
            .map(|(k, v)| (k.to_string(), v.clone()))
            .collect();
        let start = std::time::Instant::now();
        let operation = endpoint.split('/').next().unwrap_or(endpoint);

        let result = self
            .circuit_breaker
            .execute(async {
                self.http_client
                    .get(&url)
                    .basic_auth(&self.config.stripe.secret_key, None::<&str>)
                    .query(&params_owned)
                    .send()
                    .await
                    .map_err(|e| ServiceError::Coded {
                        code: ErrorCode::NetworkError,
                        message: e.to_string(),
                    })
            })
            .await;

        let duration = start.elapsed().as_secs_f64();

        match result {
            Ok(response) => {
                let result = self.handle_stripe_response(response).await;
                let status = if result.is_ok() { "success" } else { "error" };
                crate::observability::metrics::record_stripe_api_call(operation, status, duration);
                if result.is_err() {
                    crate::observability::metrics::record_stripe_error(operation, "api_error");
                }
                result
            }
            Err(CircuitBreakerError::Open) => {
                crate::observability::metrics::record_stripe_api_call(
                    operation,
                    "circuit_open",
                    duration,
                );
                crate::observability::metrics::record_stripe_error(operation, "circuit_open");
                Err(ServiceError::Coded {
                    code: crate::errors::ErrorCode::ServiceUnavailable,
                    message: "Stripe API circuit breaker is open".into(),
                })
            }
            Err(CircuitBreakerError::ServiceError(e)) => {
                crate::observability::metrics::record_stripe_api_call(operation, "error", duration);
                crate::observability::metrics::record_stripe_error(operation, "network_error");
                Err(e)
            }
        }
    }

    pub(super) async fn stripe_delete(&self, endpoint: &str) -> ServiceResult<serde_json::Value> {
        use crate::errors::ErrorCode;
        let url = format!("https://api.stripe.com/v1/{}", endpoint);
        let start = std::time::Instant::now();
        let operation = endpoint.split('/').next().unwrap_or(endpoint);

        let result = self
            .circuit_breaker
            .execute(async {
                self.http_client
                    .delete(&url)
                    .basic_auth(&self.config.stripe.secret_key, None::<&str>)
                    .send()
                    .await
                    .map_err(|e| ServiceError::Coded {
                        code: ErrorCode::NetworkError,
                        message: e.to_string(),
                    })
            })
            .await;

        let duration = start.elapsed().as_secs_f64();

        match result {
            Ok(response) => {
                let result = self.handle_stripe_response(response).await;
                let status = if result.is_ok() { "success" } else { "error" };
                crate::observability::metrics::record_stripe_api_call(operation, status, duration);
                if result.is_err() {
                    crate::observability::metrics::record_stripe_error(operation, "api_error");
                }
                result
            }
            Err(CircuitBreakerError::Open) => {
                crate::observability::metrics::record_stripe_api_call(
                    operation,
                    "circuit_open",
                    duration,
                );
                crate::observability::metrics::record_stripe_error(operation, "circuit_open");
                Err(ServiceError::Coded {
                    code: crate::errors::ErrorCode::ServiceUnavailable,
                    message: "Stripe API circuit breaker is open".into(),
                })
            }
            Err(CircuitBreakerError::ServiceError(e)) => {
                crate::observability::metrics::record_stripe_api_call(operation, "error", duration);
                crate::observability::metrics::record_stripe_error(operation, "network_error");
                Err(e)
            }
        }
    }

    pub(super) async fn handle_stripe_response(
        &self,
        response: reqwest::Response,
    ) -> ServiceResult<serde_json::Value> {
        use crate::errors::ErrorCode;
        use tracing::error;

        let status = response.status();
        let body = response.text().await.map_err(|e| ServiceError::Coded {
            code: ErrorCode::NetworkError,
            message: e.to_string(),
        })?;

        if !status.is_success() {
            error!(status = %status, body = %body, "Stripe API error");
            return Err(ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: format!("Stripe API error: {} - {}", status, body),
            });
        }

        serde_json::from_str(&body).map_err(|e| ServiceError::Coded {
            code: ErrorCode::StripeError,
            message: format!("failed to parse Stripe response: {}", e),
        })
    }
}

// ============================================================================
// Status conversions
// ============================================================================

pub fn stripe_status_to_local(status: &str) -> SubscriptionStatus {
    match status {
        "active" => SubscriptionStatus::Active,
        "trialing" => SubscriptionStatus::Trialing,
        "past_due" => SubscriptionStatus::PastDue,
        "canceled" => SubscriptionStatus::Cancelled,
        "unpaid" | "incomplete" | "incomplete_expired" => SubscriptionStatus::Expired,
        "paused" => SubscriptionStatus::PastDue, // Treat paused as past_due (no access)
        unknown => {
            // SECURITY: Default to PastDue (no access) for unknown statuses.
            // This is fail-safe: new Stripe statuses won't grant unintended access.
            tracing::warn!(
                status = %unknown,
                "Unknown Stripe subscription status - defaulting to PastDue for safety"
            );
            SubscriptionStatus::PastDue
        }
    }
}

pub fn stripe_interval_to_period(interval: &str) -> BillingPeriod {
    match interval {
        "day" => BillingPeriod::Day,
        "week" => BillingPeriod::Week,
        "month" => BillingPeriod::Month,
        "year" => BillingPeriod::Year,
        _ => BillingPeriod::Month,
    }
}
