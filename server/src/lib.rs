#![cfg_attr(not(test), deny(clippy::unwrap_used))]

pub mod config;
pub mod constants;
pub mod errors;
pub mod handlers;
pub mod middleware;
pub mod models;
pub mod observability;
pub mod repositories;
pub mod services;
pub mod storage;
mod ttl_cache;
pub mod webhooks;
pub mod workers;
pub mod x402;

// Internal sub-modules for lib.rs decomposition
mod app;
mod callback;
mod payment_workers;
mod router;
mod router_admin;
mod server;
mod state_assembly;

// ============================================================================
// Public re-exports for library users per requests.md
// ============================================================================

pub use app::{build_services, build_services_with_callback, BuiltServices};
pub use callback::{NoopPaymentCallback, PaymentCallback, PaymentCallbackError};
pub use config::Config;
pub use models::{PaymentEvent, RefundEvent, Subscription};
pub use payment_workers::{spawn_workers, PaymentWorkers};
pub use server::run;
pub use services::{
    create_messaging_service, BlockhashCache, PaywallService, StripeClient, SubscriptionService,
};
pub use storage::Store;
pub use webhooks::Notifier;

/// AI Discovery composable content for federated setups.
///
/// Use these functions to compose unified discovery when integrating
/// cedros-pay alongside other packages:
///
/// ```ignore
/// use cedros_pay::ai_discovery::{get_skills_with_base, get_skill_metadata};
///
/// // Get skills with custom base path
/// let skills = get_skills_with_base("/pay");
/// ```
pub use handlers::ai_discovery;

use std::sync::Arc;

use async_trait::async_trait;

use models::{PaymentProof, Requirement, VerificationResult};
use router::build_router;
use x402::{Verifier, VerifierError};

/// No-op verifier for testing/development when RPC URL is not configured
pub struct NoopVerifier;

#[async_trait]
impl Verifier for NoopVerifier {
    async fn verify(
        &self,
        _proof: PaymentProof,
        _requirement: Requirement,
    ) -> Result<VerificationResult, VerifierError> {
        Err(VerifierError::Failed(
            "noop verifier - configure x402.rpc_url for real verification".into(),
        ))
    }
}

// ============================================================================
// Public Router API (for library embedding per requests.md)
// ============================================================================

/// Build a composable Router for embedding into other Axum applications.
///
/// This function builds all internal services (payment, subscription, Stripe, etc.)
/// and returns a Router that can be nested into your application.
///
/// # Example
/// ```rust,ignore
/// let app = Router::new()
///     .nest("/pay", cedros_pay::router(&config, store.clone()).await?)
///     .with_state(your_state);
/// ```
///
/// Note: This router does NOT include global middleware like CORS, panic recovery,
/// request ID, or rate limiting. Add those in your embedding application as needed.
/// Route-level middleware (timeouts, idempotency) is included.
pub async fn router<S: Store + 'static>(
    cfg: &Config,
    store: Arc<S>,
) -> anyhow::Result<axum::Router> {
    router_with_pool(cfg, store, None).await
}

/// Build a composable Router and register a PaymentCallback.
///
/// This variant is for library embedding use-cases that want synchronous callbacks
/// during request processing.
pub async fn router_with_callback<S: Store + 'static>(
    cfg: &Config,
    store: Arc<S>,
    callback: Arc<dyn PaymentCallback>,
) -> anyhow::Result<axum::Router> {
    router_with_pool_and_callback(cfg, store, None, callback).await
}

/// Build a composable Router with an optional Postgres pool for repository sharing.
///
/// Use this variant when your storage backend is Postgres and you want to share
/// the connection pool with product/coupon repositories.
pub async fn router_with_pool<S: Store + 'static>(
    cfg: &Config,
    store: Arc<S>,
    storage_pg_pool: Option<sqlx::PgPool>,
) -> anyhow::Result<axum::Router> {
    let built = build_services(cfg, store, storage_pg_pool).await?;
    Ok(build_router(built.into_router_states()))
}

pub async fn router_with_pool_and_callback<S: Store + 'static>(
    cfg: &Config,
    store: Arc<S>,
    storage_pg_pool: Option<sqlx::PgPool>,
    callback: Arc<dyn PaymentCallback>,
) -> anyhow::Result<axum::Router> {
    let built =
        app::build_services_with_callback(cfg, store, storage_pg_pool, callback).await?;
    Ok(build_router(built.into_router_states()))
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use crate::config::{PaywallResource, ServerConfig};

    use super::*;
    use server::server_timeout_from_config;

    #[test]
    fn test_server_timeout_from_config_maximum() {
        let cfg = ServerConfig {
            address: "0.0.0.0:8080".to_string(),
            public_url: String::new(),
            route_prefix: "".to_string(),
            admin_metrics_api_key: None,
            cors_allowed_origins: Vec::new(),
            cors_disabled: false,
            trusted_proxy_cidrs: Vec::new(),
            read_timeout: Some(Duration::from_secs(5)),
            write_timeout: Some(Duration::from_secs(15)),
            idle_timeout: Some(Duration::from_secs(10)),
        };

        assert_eq!(
            server_timeout_from_config(&cfg),
            Some(Duration::from_secs(15))
        );
    }

    #[test]
    fn test_server_timeout_from_config_none() {
        let cfg = ServerConfig {
            address: "0.0.0.0:8080".to_string(),
            public_url: String::new(),
            route_prefix: "".to_string(),
            admin_metrics_api_key: None,
            cors_allowed_origins: Vec::new(),
            cors_disabled: false,
            trusted_proxy_cidrs: Vec::new(),
            read_timeout: None,
            write_timeout: None,
            idle_timeout: None,
        };

        assert_eq!(server_timeout_from_config(&cfg), None);
    }

    #[test]
    fn test_paywall_resource_uses_tenant_id() {
        let resource = PaywallResource {
            resource_id: "res-1".to_string(),
            tenant_id: Some("tenant-1".to_string()),
            description: "Test".to_string(),
            fiat_amount_cents: Some(100),
            fiat_currency: Some("usd".to_string()),
            stripe_price_id: None,
            crypto_atomic_amount: None,
            crypto_token: None,
            crypto_account: None,
            memo_template: None,
            metadata: std::collections::HashMap::new(),
        };

        let product = app::paywall_resource_to_product(&resource);
        assert_eq!(product.tenant_id, "tenant-1");
    }
}
