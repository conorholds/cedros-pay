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

// Public re-exports for library users per requests.md
pub use config::Config;
pub use models::{PaymentEvent, RefundEvent, Subscription};
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

use std::net::SocketAddr;

// ============================================================================
// Payment Callback Trait (for library users per requests.md)
// ============================================================================

/// Callback trait for responding to payment events.
///
/// Library users can implement this trait to receive notifications when
/// payments, subscriptions, or refunds are processed. The callbacks are
/// invoked synchronously during request processing.
///
/// # Example
/// ```rust,ignore
/// struct MyCallback { /* ... */ }
///
/// #[async_trait::async_trait]
/// impl PaymentCallback for MyCallback {
///     async fn on_payment_success(&self, event: &PaymentEvent) -> Result<(), PaymentCallbackError> {
///         // Update your local database, trigger downstream events, etc.
///         Ok(())
///     }
///     // ... other methods use default implementations
/// }
/// ```
#[async_trait::async_trait]
pub trait PaymentCallback: Send + Sync {
    /// Called when a payment is successfully verified.
    async fn on_payment_success(&self, _event: &PaymentEvent) -> Result<(), PaymentCallbackError> {
        Ok(())
    }

    /// Called when a new subscription is created.
    async fn on_subscription_created(
        &self,
        _subscription: &Subscription,
    ) -> Result<(), PaymentCallbackError> {
        Ok(())
    }

    /// Called when a subscription is cancelled.
    async fn on_subscription_cancelled(
        &self,
        _subscription: &Subscription,
    ) -> Result<(), PaymentCallbackError> {
        Ok(())
    }

    /// Called when a refund is processed.
    async fn on_refund_processed(&self, _event: &RefundEvent) -> Result<(), PaymentCallbackError> {
        Ok(())
    }
}

/// Error type for payment callback failures.
#[derive(Debug, thiserror::Error)]
pub enum PaymentCallbackError {
    /// Callback failed with a specific error message.
    #[error("callback failed: {0}")]
    Failed(String),

    /// Callback failed due to an internal error.
    #[error("internal callback error: {0}")]
    Internal(#[from] anyhow::Error),
}

/// No-op implementation of PaymentCallback that does nothing.
///
/// Use this as a placeholder when no callback handling is needed.
pub struct NoopPaymentCallback;

#[async_trait::async_trait]
impl PaymentCallback for NoopPaymentCallback {
    // All methods use default no-op implementations
}
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use axum::{
    extract::DefaultBodyLimit,
    routing::{delete, get, patch, post, put},
    Router,
};
use tower_http::timeout::TimeoutLayer;

use config::{CouponSource, PaywallResource, ProductSource, ServerConfig};
use handlers::collections::CollectionsAppState;
use handlers::discovery::DiscoveryState;
use handlers::paywall::AppState;
use handlers::products::ProductsAppState;
use handlers::subscriptions::SubscriptionAppState;
use models::{get_asset, Money, PaymentProof, Product, Requirement, VerificationResult};
use repositories::{
    new_coupon_repository, new_product_repository, CachedProductRepository, CouponBackend,
    CouponRepository, CouponRepositoryConfig, InMemoryProductRepository, ProductBackend,
    ProductRepository, ProductRepositoryConfig, RepositoryCacheConfig,
};
use services::StripeWebhookProcessor;
use sqlx::PgPool;
// InMemoryStore only used in tests via router_with_pool
use storage::{PostgresConfig, PostgresPool, PostgresStore};
use workers::{CleanupWorker, HealthChecker};
use x402::{SolanaVerifier, Verifier, VerifierError};

/// Bundled state for router construction to avoid too many function arguments
struct RouterStates<S: Store> {
    app_state: Arc<AppState<S>>,
    products_state: Arc<ProductsAppState>,
    collections_state: Arc<CollectionsAppState<S>>,
    subscription_state: Arc<SubscriptionAppState<S>>,
    discovery_state: Arc<DiscoveryState>,
    metrics_state: Arc<handlers::metrics::MetricsState>,
    health_state: Arc<parking_lot::RwLock<handlers::health::HealthState>>,
    store: Arc<S>,
    route_prefix: String,
    admin_auth_state: Arc<middleware::AdminAuthState<S>>,
    admin_config_state: Option<Arc<handlers::admin_config::AdminConfigState>>,
    admin_ai_state: Option<Arc<handlers::admin_ai::AdminAiState>>,
    admin_ai_assistant_state: Option<Arc<handlers::admin_ai_assistant::AdminAiAssistantState>>,
    admin_dashboard_state: Arc<handlers::admin::AdminState>,
    chat_state: Option<Arc<handlers::chat::ChatState>>,
    admin_chat_state: Arc<handlers::admin_chats::AdminChatState>,
    faqs_state: Arc<handlers::faqs::FaqsState>,
}

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

/// Convert a PaywallResource from config to a Product model
fn paywall_resource_to_product(resource: &PaywallResource) -> Product {
    let fiat_price = match (&resource.fiat_amount_cents, &resource.fiat_currency) {
        (Some(cents), Some(currency)) => get_asset(&currency.to_uppercase()).map(|asset| Money {
            asset,
            atomic: *cents,
        }),
        _ => None,
    };

    let crypto_price = match (&resource.crypto_atomic_amount, &resource.crypto_token) {
        (Some(atomic), Some(token)) => get_asset(&token.to_uppercase()).map(|asset| Money {
            asset,
            atomic: *atomic,
        }),
        _ => None,
    };

    Product {
        id: resource.resource_id.clone(),
        tenant_id: resource
            .tenant_id
            .clone()
            .filter(|t| !t.is_empty())
            .unwrap_or_else(|| "default".to_string()),
        title: None,
        short_description: None,
        slug: None,
        seo_title: None,
        seo_description: None,
        description: resource.description.clone(),
        tags: Vec::new(),
        category_ids: Vec::new(),
        images: Vec::new(),
        featured: false,
        sort_order: None,
        shipping_profile: None,
        checkout_requirements: None,
        fulfillment: None,
        fiat_price,
        compare_at_fiat_price: None,
        stripe_product_id: None,
        stripe_price_id: resource.stripe_price_id.clone(),
        crypto_price,
        inventory_status: None,
        inventory_quantity: None,
        inventory_policy: None,
        variants: Vec::new(),
        variation_config: None,
        crypto_account: resource.crypto_account.clone(),
        memo_template: resource.memo_template.clone(),
        metadata: resource.metadata.clone(),
        active: true,
        subscription: None,
        created_at: None,
        updated_at: None,
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
pub async fn router<S: Store + 'static>(cfg: &Config, store: Arc<S>) -> anyhow::Result<Router> {
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
) -> anyhow::Result<Router> {
    router_with_pool_and_callback(cfg, store, None, callback).await
}

/// Build a composable Router with an optional Postgres pool for repository sharing.
///
/// Use this variant when your storage backend is Postgres and you want to share
/// the connection pool with product/coupon repositories.
pub async fn router_with_pool<S: Store + 'static>(
    cfg: &Config,
    store: Arc<S>,
    storage_pg_pool: Option<PgPool>,
) -> anyhow::Result<Router> {
    let built = build_services(cfg, store, storage_pg_pool).await?;
    Ok(build_router(built.into_router_states()))
}

pub async fn router_with_pool_and_callback<S: Store + 'static>(
    cfg: &Config,
    store: Arc<S>,
    storage_pg_pool: Option<PgPool>,
    callback: Arc<dyn PaymentCallback>,
) -> anyhow::Result<Router> {
    let built = build_services_with_callback(cfg, store, storage_pg_pool, callback).await?;
    Ok(build_router(built.into_router_states()))
}

/// Built services for cedros-pay, exposed for advanced library usage.
///
/// Users who need direct access to services (e.g., calling PaywallService
/// programmatically) can use `build_services()` to get this struct.
pub struct BuiltServices<S: Store> {
    /// The underlying storage
    pub store: Arc<S>,
    /// Payment verification and quote service
    pub paywall_service: Arc<PaywallService>,
    /// Subscription management service
    pub subscription_service: Arc<SubscriptionService<S>>,
    /// Stripe API client (if configured)
    pub stripe_client: Option<Arc<StripeClient>>,
    /// Webhook notifier
    pub notifier: Arc<dyn webhooks::Notifier>,
    /// Product repository
    pub product_repo: Arc<dyn repositories::ProductRepository>,
    /// Coupon repository
    pub coupon_repo: Arc<dyn repositories::CouponRepository>,
    /// Blockhash cache (if RPC configured)
    pub blockhash_cache: Option<Arc<BlockhashCache>>,
    /// The config used to build these services
    pub config: Config,
    // Internal fields for router construction
    stripe_webhook_processor: Option<Arc<StripeWebhookProcessor<S>>>,
    health_state: Arc<parking_lot::RwLock<handlers::health::HealthState>>,
    storage_pg_pool: Option<PgPool>,
    /// Cedros-login client for JWT validation (if configured)
    cedros_login_client: Option<Arc<services::CedrosLoginClient>>,
}

impl<S: Store + 'static> BuiltServices<S> {
    fn into_router_states(self) -> RouterStates<S> {
        let server_addr = normalize_addr(&self.config.server.address);

        let app_state = Arc::new(AppState {
            store: self.store.clone(),
            paywall_service: self.paywall_service.clone(),
            product_repo: self.product_repo.clone(),
            stripe_client: self.stripe_client.clone(),
            stripe_webhook_processor: self.stripe_webhook_processor,
            admin_public_keys: self.config.admin.public_keys.clone(),
            blockhash_cache: self.blockhash_cache.clone(),
        });

        let products_state = Arc::new(ProductsAppState {
            store: self.store.clone(),
            product_repo: self.product_repo.clone(),
            coupon_repo: self.coupon_repo.clone(),
        });
        let collections_state = Arc::new(CollectionsAppState {
            store: self.store.clone(),
        });

        // Clone stripe_client before moving it to subscription_state
        let stripe_client_for_admin = self.stripe_client.clone();

        let subscription_state = Arc::new(SubscriptionAppState {
            subscription_service: self.subscription_service,
            stripe_client: self.stripe_client,
            paywall_service: self.paywall_service,
            product_repo: self.product_repo.clone(),
        });

        let discovery_state = Arc::new(DiscoveryState {
            product_repo: self.product_repo.clone(),
            network: self.config.x402.network.clone(),
            payment_address: self.config.x402.payment_address.clone(),
            token_mint: self.config.x402.token_mint.clone(),
            service_endpoint: if self.config.server.public_url.is_empty() {
                format!("http://{}", server_addr)
            } else {
                self.config.server.public_url.clone()
            },
            stripe_enabled: self.config.stripe.enabled,
            x402_enabled: self.config.x402.enabled,
            credits_enabled: self.config.cedros_login.credits_enabled,
        });

        let metrics_state = Arc::new(handlers::metrics::MetricsState {
            api_key: self.config.server.admin_metrics_api_key.clone(),
        });

        let auth_state = Arc::new(middleware::AuthState::new(
            self.config.api_key.clone(),
            self.config.admin.public_keys.clone(),
        ));

        let admin_auth_state = Arc::new(middleware::AdminAuthState {
            auth: auth_state,
            store: app_state.store.clone(),
            cedros_login: self.cedros_login_client.clone(),
        });

        // Create admin config state if PostgreSQL pool is available
        let (admin_config_state, admin_ai_state, admin_ai_assistant_state, chat_state) = match self
            .storage_pg_pool
        {
            Some(pool) => {
                let repo = Arc::new(config::PostgresConfigRepository::new(pool));
                let config_state =
                    Arc::new(handlers::admin_config::AdminConfigState { repo: repo.clone() });
                let ai_state = Arc::new(handlers::admin_ai::AdminAiState { repo: repo.clone() });
                let ai_service = Arc::new(services::AiService::new());
                let ai_assistant_state =
                    Arc::new(handlers::admin_ai_assistant::AdminAiAssistantState {
                        repo: repo.clone(),
                        store: app_state.store.clone(),
                        product_repo: self.product_repo.clone(),
                        ai_service: services::AiService::new(),
                        rate_limiter: handlers::admin_ai_assistant::AiRateLimiter::default(),
                        cache: handlers::admin_ai_assistant::AiResponseCache::default(),
                    });
                let chat_state = Arc::new(handlers::chat::ChatState::new(
                    app_state.store.clone(),
                    repo,
                    self.product_repo.clone(),
                    ai_service,
                    handlers::admin_ai_assistant::AiRateLimiter::default(),
                ));
                (
                    Some(config_state),
                    Some(ai_state),
                    Some(ai_assistant_state),
                    Some(chat_state),
                )
            }
            None => (None, None, None, None),
        };

        // Create admin dashboard state for stats, products, coupons, refunds management
        let admin_dashboard_state = Arc::new(handlers::admin::AdminState {
            store: app_state.store.clone(),
            product_repo: self.product_repo.clone(),
            coupon_repo: self.coupon_repo.clone(),
            stripe_client: stripe_client_for_admin,
        });

        // Create admin chat state for CRM-style chat review
        let admin_chat_state = Arc::new(handlers::admin_chats::AdminChatState::new(
            app_state.store.clone(),
        ));

        // Create public FAQs state
        let faqs_state = Arc::new(handlers::faqs::FaqsState::new(app_state.store.clone()));

        let route_prefix = self.config.server.route_prefix.clone();

        RouterStates {
            app_state,
            products_state,
            collections_state,
            subscription_state,
            discovery_state,
            metrics_state,
            health_state: self.health_state,
            store: self.store,
            route_prefix,
            admin_auth_state,
            admin_config_state,
            admin_ai_state,
            admin_ai_assistant_state,
            admin_dashboard_state,
            chat_state,
            admin_chat_state,
            faqs_state,
        }
    }
}

/// Build all cedros-pay services from config and storage.
///
/// This is useful when you need programmatic access to services
/// without going through HTTP endpoints.
pub async fn build_services<S: Store + 'static>(
    cfg: &Config,
    store: Arc<S>,
    storage_pg_pool: Option<PgPool>,
) -> anyhow::Result<BuiltServices<S>> {
    build_services_internal(cfg, store, storage_pg_pool, None).await
}

pub async fn build_services_with_callback<S: Store + 'static>(
    cfg: &Config,
    store: Arc<S>,
    storage_pg_pool: Option<PgPool>,
    callback: Arc<dyn PaymentCallback>,
) -> anyhow::Result<BuiltServices<S>> {
    build_services_internal(cfg, store, storage_pg_pool, Some(callback)).await
}

async fn build_services_internal<S: Store + 'static>(
    cfg: &Config,
    store: Arc<S>,
    storage_pg_pool: Option<PgPool>,
    callback: Option<Arc<dyn PaymentCallback>>,
) -> anyhow::Result<BuiltServices<S>> {
    let product_repo = build_product_repository(cfg, storage_pg_pool.clone()).await?;
    let coupon_repo = build_coupon_repository(cfg, storage_pg_pool.clone()).await?;

    // Initialize verifier
    let verifier: Arc<dyn Verifier> = if !cfg.x402.rpc_url.is_empty() {
        match SolanaVerifier::new_with_circuit_breaker(&cfg.x402, &cfg.circuit_breaker.solana_rpc) {
            Ok(mut v) => {
                v.setup_health_checker();
                if !cfg.x402.rpc_url.is_empty() {
                    v.setup_ws_confirmation(&cfg.x402.rpc_url);
                }
                Arc::new(v)
            }
            Err(e) => {
                tracing::warn!("Failed to create SolanaVerifier: {}, using NoopVerifier", e);
                Arc::new(NoopVerifier)
            }
        }
    } else {
        tracing::warn!("No RPC URL configured, using NoopVerifier (payments will fail)");
        Arc::new(NoopVerifier)
    };

    // Initialize webhook notifier
    let notifier: Arc<dyn webhooks::Notifier> =
        if let Some(url) = cfg.callbacks.payment_success_url.as_ref() {
            let max_attempts = if cfg.callbacks.retry.enabled {
                cfg.callbacks.retry.max_attempts.max(1) as i32
            } else {
                1
            };
            Arc::new(webhooks::HttpNotifier::new_with_headers(
                store.clone(),
                url.clone(),
                cfg.callbacks.hmac_secret.clone(),
                cfg.callbacks.headers.clone(),
                max_attempts,
            ))
        } else {
            Arc::new(webhooks::NoopNotifier)
        };

    // Initialize cedros-login client if configured
    let cedros_login_client = if cfg.cedros_login.enabled && !cfg.cedros_login.base_url.is_empty() {
        match services::CedrosLoginClient::new(
            cfg.cedros_login.base_url.clone(),
            cfg.cedros_login.api_key.clone(),
            cfg.cedros_login.timeout,
            cfg.cedros_login.jwt_issuer.clone(),
            cfg.cedros_login.jwt_audience.clone(),
        ) {
            Ok(client) => {
                tracing::info!("Cedros Login integration enabled");
                Some(Arc::new(client))
            }
            Err(e) => {
                tracing::warn!(error = %e, "Failed to initialize cedros-login client");
                None
            }
        }
    } else {
        None
    };

    // Create messaging service for email receipts and order webhooks
    let messaging_service = create_messaging_service(&cfg.messaging, store.clone());

    // Spawn email worker if email is enabled
    if cfg.messaging.email_enabled {
        workers::spawn_email_worker(store.clone(), cfg.messaging.clone());
    }

    // Initialize paywall service
    let mut paywall_service = PaywallService::new(
        cfg.clone(),
        store.clone() as Arc<dyn Store>,
        verifier,
        notifier.clone(),
        product_repo.clone(),
        coupon_repo.clone(),
    );
    if let Some(ref client) = cedros_login_client {
        paywall_service = paywall_service.with_cedros_login(client.clone());
    }
    if let Some(ref cb) = callback {
        paywall_service = paywall_service.with_payment_callback(cb.clone());
    }
    paywall_service = paywall_service.with_messaging(messaging_service.clone());
    let paywall_service = Arc::new(paywall_service);

    // Initialize subscription service
    let mut subscription_service =
        SubscriptionService::new(Arc::new(cfg.clone()), store.clone(), notifier.clone());
    if let Some(ref client) = cedros_login_client {
        subscription_service = subscription_service.with_cedros_login(client.clone());
    }
    if let Some(ref cb) = callback {
        subscription_service = subscription_service.with_payment_callback(cb.clone());
    }
    let subscription_service = Arc::new(subscription_service);

    // Initialize Stripe client if configured
    let stripe_client = if !cfg.stripe.secret_key.is_empty() {
        let stripe_cb = middleware::CircuitBreakerConfig::from_service_config(
            "stripe_api",
            &cfg.circuit_breaker.stripe_api,
        );
        Some(Arc::new(services::StripeClient::with_circuit_breaker(
            cfg.clone(),
            store.clone() as Arc<dyn Store>,
            notifier.clone(),
            stripe_cb,
        )?))
    } else {
        None
    };

    // Initialize Stripe webhook processor
    let stripe_webhook_processor = if !cfg.stripe.secret_key.is_empty() {
        Some(Arc::new(
            StripeWebhookProcessor::new(
                Arc::new(cfg.clone()),
                store.clone(),
                notifier.clone(),
                subscription_service.clone(),
                product_repo.clone(),
            )
            .with_messaging(messaging_service.clone()),
        ))
    } else {
        None
    };

    // Create blockhash cache if RPC URL is configured
    let blockhash_cache = if !cfg.x402.rpc_url.is_empty() {
        match BlockhashCache::from_url(&cfg.x402.rpc_url) {
            Ok(cache) => Some(Arc::new(cache)),
            Err(e) => {
                tracing::warn!(error = %e, "Failed to create blockhash cache");
                None
            }
        }
    } else {
        None
    };

    // Build health state (workers will update this if spawned)
    let health_state = Arc::new(parking_lot::RwLock::new(handlers::health::HealthState {
        health_checker: None,
        network: cfg.x402.network.clone(),
        route_prefix: cfg.server.route_prefix.clone(),
        gasless_enabled: cfg.x402.gasless_enabled,
        auto_create_token_accounts: cfg.x402.auto_create_token_account,
        balance_monitoring_enabled: cfg.monitoring.low_balance_alert_url.is_some(),
    }));

    Ok(BuiltServices {
        store,
        paywall_service,
        subscription_service,
        stripe_client,
        notifier,
        product_repo,
        coupon_repo,
        blockhash_cache,
        config: cfg.clone(),
        stripe_webhook_processor,
        health_state,
        storage_pg_pool,
        cedros_login_client,
    })
}

// ============================================================================
// Standalone Server Entry Point
// ============================================================================

pub async fn run() -> anyhow::Result<()> {
    // Bootstrap: Only POSTGRES_URL is required from environment.
    // Everything else comes from the database.
    let postgres_url = std::env::var("POSTGRES_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .map_err(|_| anyhow::anyhow!("POSTGRES_URL environment variable is required"))?;

    // Optional bootstrap env vars
    let server_address = std::env::var("SERVER_ADDRESS")
        .or_else(|_| std::env::var("CEDROS_SERVER_ADDRESS"))
        .unwrap_or_else(|_| "0.0.0.0:8080".to_string());

    // Create minimal bootstrap config for pool creation
    let bootstrap_cfg = Config::default();
    let pool = build_postgres_pool(&bootstrap_cfg, &postgres_url).await?;

    // Load full config from database
    let config_repo = config::PostgresConfigRepository::new(pool.inner().clone());
    let tenant_id = "default";
    let cfg = Config::load_from_db(&config_repo, tenant_id, &postgres_url, &server_address).await?;

    // Validate the loaded config
    cfg.validate_config()?;

    tracing::info!(
        address = %cfg.server.address,
        "Config loaded from database"
    );

    let store = Arc::new(PostgresStore::new(
        pool.clone(),
        cfg.storage.schema_mapping.clone(),
    ));
    run_with_store(cfg, store, Some(pool.inner().clone())).await
}

async fn run_with_store<S: Store + 'static>(
    cfg: Config,
    store: Arc<S>,
    storage_pg_pool: Option<PgPool>,
) -> anyhow::Result<()> {
    // Build all services using the shared build_services function
    let built = build_services(&cfg, store.clone(), storage_pg_pool).await?;
    let health_state = built.health_state.clone();
    let notifier = built.notifier.clone();

    // Build router from services
    let base_router = build_router(built.into_router_states());

    // Build middleware layers per spec (10-middleware.md)
    // Order (outermost to innermost):
    // 1. Panic Recovery - catches all panics
    // 2. Request ID - generate early for logging
    // 3. Real IP - before rate limiting (via real_ip_middleware)
    // 4. Request Logging - before processing
    // 5. CORS - before auth
    // 6. Security Headers - before response
    // 7. API Version - before routing
    // 8. Auth Context - before API Key Auth
    // 9. API Key Auth - before rate limiting
    // 10. Rate Limiting - before processing
    // 10-11. Timeout/Idempotency - per-route
    // 12. Handler

    let panic_recovery = middleware::PanicRecoveryLayer::new();
    let request_id = middleware::request_id();
    let real_ip = axum::middleware::from_fn_with_state(
        std::sync::Arc::new(cfg.clone()),
        middleware::real_ip_middleware,
    );
    let logging = axum::middleware::from_fn(middleware::structured_logging_middleware);

    // Per spec (02-config.md): Apply CORS_ALLOWED_ORIGINS from config.
    // SECURITY: Validate and fail fast on unsafe config.
    middleware::cors::validate_cors_config(
        &cfg.server.cors_allowed_origins,
        &cfg.logging.environment,
    )
    .map_err(|e| anyhow::anyhow!(e.to_string()))?;
    let cors = middleware::cors::build_cors_layer_with_env(
        &cfg.server.cors_allowed_origins,
        &cfg.logging.environment,
    );
    let security_headers = middleware::security_headers();
    let api_version = axum::middleware::from_fn(middleware::api_version_middleware);

    // Create rate limiter with config (cleanup task started in spawn_workers_internal)
    let rate_limiter = Arc::new(middleware::RateLimiter::new(cfg.rate_limit.clone()));

    let auth_state = Arc::new(middleware::AuthState::new(
        cfg.api_key.clone(),
        cfg.admin.public_keys.clone(),
    ));

    // Apply global middleware and timeout
    let mut router = base_router;
    if let Some(timeout) = server_timeout_from_config(&cfg.server) {
        router = router.layer(TimeoutLayer::with_status_code(
            axum::http::StatusCode::REQUEST_TIMEOUT,
            timeout,
        ));
    }

    let router = router
        .layer(axum::middleware::from_fn_with_state(
            rate_limiter.clone(),
            middleware::rate_limit_middleware,
        )) // 10. Rate Limiting
        .layer(axum::middleware::from_fn_with_state(
            auth_state,
            middleware::api_key_middleware,
        )) // 9. API Key Auth (validates when enabled per spec 10-middleware.md)
        .layer(axum::middleware::from_fn(middleware::auth_middleware)) // 8. Auth context
        .layer(api_version) // 7. API Version
        .layer(security_headers) // 6. Security headers
        .layer(cors) // 5. CORS
        .layer(logging) // 4. Request logging
        .layer(real_ip) // 3. Real IP extraction
        .layer(request_id) // 2. Request ID
        .layer(panic_recovery); // 1. Panic recovery (outermost)

    let addr: SocketAddr = normalize_addr(&cfg.server.address);
    let listener = tokio::net::TcpListener::bind(addr).await?;

    tracing::info!("Starting Cedros Pay Server on {}", addr);

    // Spawn background workers per spec (11-background-workers.md)
    let background_workers = spawn_workers_internal(
        store.clone(),
        &cfg,
        health_state,
        Some(rate_limiter),
        notifier,
    )?;

    // Enforce a bounded graceful shutdown window once the shutdown signal is received.
    const SERVER_SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(15);
    let (shutdown_started_tx, shutdown_started_rx) = tokio::sync::oneshot::channel::<()>();

    // Use into_make_service_with_connect_info to enable Real IP extraction
    let server = axum::serve(
        listener,
        router.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(async move {
        shutdown_signal().await;
        let _ = shutdown_started_tx.send(());
    });

    let server = <_ as std::future::IntoFuture>::into_future(server);
    let mut server_task = tokio::spawn(server);
    tokio::select! {
        res = &mut server_task => {
            let res = res.map_err(|e| anyhow::anyhow!(e.to_string()))?;
            res?;
        }
        _ = shutdown_started_rx => {
            match tokio::time::timeout(SERVER_SHUTDOWN_TIMEOUT, &mut server_task).await {
                Ok(res) => {
                    let res = res.map_err(|e| anyhow::anyhow!(e.to_string()))?;
                    res?;
                }
                Err(_) => {
                    tracing::error!("Timed out waiting for HTTP server shutdown");
                    server_task.abort();
                    let _ = server_task.await;
                    return Err(anyhow::anyhow!("server shutdown timed out"));
                }
            }
        }
    }

    // Per spec (04-graceful-shutdown.md): Gracefully shutdown background workers
    background_workers.shutdown().await;
    store
        .close()
        .await
        .map_err(|e| anyhow::anyhow!(e.to_string()))?;

    Ok(())
}

fn build_router<S: Store + 'static>(states: RouterStates<S>) -> Router {
    let RouterStates {
        app_state,
        products_state,
        collections_state,
        subscription_state,
        discovery_state,
        metrics_state,
        health_state,
        store,
        route_prefix,
        admin_auth_state,
        admin_config_state,
        admin_ai_state,
        admin_ai_assistant_state,
        admin_dashboard_state,
        chat_state,
        admin_chat_state,
        faqs_state,
    } = states;

    // Idempotency state for POST endpoints per spec (10-middleware.md)
    let idempotency_state = Arc::new(middleware::IdempotencyState::new(store));

    // Paywall routes (with app_state)
    // Per spec (10-middleware.md): 30s timeout for paywall routes, idempotency for POST
    let paywall_routes = Router::new()
        // Quote endpoints - POST returns 402, GET returns 200
        .route("/quote", post(handlers::paywall::quote_402::<S>))
        .route("/quote", get(handlers::paywall::quote::<S>))
        // Verify endpoint
        .route("/verify", post(handlers::verify::verify::<S>))
        // Gasless endpoint
        .route(
            "/gasless-transaction",
            post(handlers::gasless::build_gasless_transaction::<S>),
        )
        // RPC proxy endpoints
        .route(
            "/derive-token-account",
            post(handlers::rpc_proxy::derive_token_account),
        )
        .route("/blockhash", get(handlers::rpc_proxy::get_blockhash::<S>))
        // Stripe endpoints
        .route(
            "/stripe-session",
            post(handlers::stripe::create_session::<S>),
        )
        .route(
            "/stripe-session/verify",
            get(handlers::stripe::verify_session::<S>),
        )
        .route(
            "/x402-transaction/verify",
            get(handlers::stripe::verify_x402_transaction::<S>),
        )
        // Credits endpoints
        .route(
            "/credits/authorize",
            post(handlers::credits::authorize_credits::<S>),
        )
        .route(
            "/credits/hold",
            post(handlers::credits_holds::create_credits_hold::<S>),
        )
        .route(
            "/cart/:cartId/credits/authorize",
            post(handlers::credits::authorize_cart_credits::<S>),
        )
        .route(
            "/cart/:cartId/credits/hold",
            post(handlers::credits_holds::create_cart_credits_hold::<S>),
        )
        .route("/purchases", get(handlers::purchases::list_purchases::<S>))
        // Cart endpoints
        .route("/cart/quote", post(handlers::cart::cart_quote::<S>))
        .route("/cart/checkout", post(handlers::cart::cart_checkout::<S>))
        .route("/cart/:cartId", get(handlers::cart::get_cart::<S>))
        .route(
            "/cart/:cartId/verify",
            post(handlers::cart::verify_cart::<S>),
        )
        .route(
            "/cart/:cartId/inventory-status",
            get(handlers::cart::get_cart_inventory_status::<S>),
        )
        // Refund endpoints
        // Note: Rate limiting is applied globally via rate_limit_middleware
        // (see middleware stack below). Refund endpoints are protected by:
        // - Global rate limiting (per-IP and per-wallet limits)
        // - Signature verification (for claim operations)
        // - Nonce-based replay protection (for gasless refunds)
        .route(
            "/refunds/request",
            post(handlers::refunds::request_refund::<S>),
        )
        .route(
            "/refunds/approve",
            post(handlers::refunds::approve_refund::<S>),
        )
        .route("/refunds/deny", post(handlers::refunds::deny_refund::<S>))
        .route(
            "/refunds/pending",
            post(handlers::refunds::list_pending_refunds::<S>),
        )
        .route(
            "/refunds/:refundId",
            get(handlers::refunds::get_refund::<S>),
        )
        .route("/shop", get(handlers::paywall::shop_config::<S>))
        .route("/nonce", post(handlers::refunds::create_nonce::<S>))
        .layer(axum::middleware::from_fn_with_state(
            app_state.clone(),
            middleware::guest_checkout::paywall_guest_checkout_middleware::<S>,
        ))
        .layer(axum::middleware::from_fn_with_state(
            idempotency_state.clone(),
            middleware::idempotency::idempotency_middleware::<S>,
        ))
        // Per spec (10-middleware.md): payment routes require 60-second timeout
        .layer(axum::middleware::from_fn(
            middleware::timeout::payment_timeout_middleware,
        ))
        .with_state(app_state.clone());

    // Stripe redirect routes (using app_state)
    let stripe_redirects = Router::new()
        .route("/success", get(handlers::stripe::stripe_success::<S>))
        .route("/cancel", get(handlers::stripe::stripe_cancel::<S>))
        .with_state(app_state.clone());

    // Stripe webhook routes (no prefix per spec)
    let stripe_webhook = Router::new()
        .route("/stripe", post(handlers::stripe::webhook::<S>))
        .route("/stripe", get(handlers::stripe::webhook_info))
        .with_state(app_state.clone());

    // Products routes (with products_state)
    let products_routes = Router::new()
        .route("/products", get(handlers::products::list_products))
        .route("/products/:id", get(handlers::products::get_product))
        .route(
            "/products/by-slug/:slug",
            get(handlers::products::get_product_by_slug),
        )
        .route("/products.txt", get(handlers::products::products_txt))
        .route(
            "/coupons/validate",
            post(handlers::products::validate_coupon),
        )
        .with_state(products_state);

    let collections_routes = Router::new()
        .route(
            "/collections",
            get(handlers::collections::list_collections::<S>),
        )
        .route(
            "/collections/:id",
            get(handlers::collections::get_collection::<S>),
        )
        .with_state(collections_state);

    // Public FAQs routes
    let faqs_routes = Router::new()
        .route("/faqs", get(handlers::faqs::list_public_faqs))
        .with_state(faqs_state);

    // Subscription routes (with subscription_state)
    // Per spec (03-http-endpoints-subscriptions.md): 60s timeout for subscription endpoints
    let subscription_routes = Router::new()
        .route("/status", get(handlers::subscriptions::status::<S>))
        .route(
            "/stripe-session",
            post(handlers::subscriptions::stripe_session::<S>),
        )
        .route("/quote", post(handlers::subscriptions::quote::<S>))
        .route(
            "/x402/activate",
            post(handlers::subscriptions::create_x402::<S>),
        )
        .route(
            "/credits/activate",
            post(handlers::subscriptions::create_credits::<S>),
        )
        .route("/cancel", post(handlers::subscriptions::cancel::<S>))
        .route("/portal", post(handlers::subscriptions::portal::<S>))
        .route("/change", post(handlers::subscriptions::change::<S>))
        .route(
            "/reactivate",
            post(handlers::subscriptions::reactivate::<S>),
        )
        .layer(axum::middleware::from_fn_with_state(
            subscription_state.clone(),
            middleware::guest_checkout::subscription_guest_checkout_middleware::<S>,
        ))
        .layer(axum::middleware::from_fn(
            middleware::timeout::payment_timeout_middleware,
        ))
        .with_state(subscription_state);

    // Discovery routes with state
    // Per spec (10-middleware.md): 5s timeout for health/discovery routes
    let discovery_routes = Router::new()
        .route(
            "/.well-known/payment-options",
            get(handlers::discovery::payment_options),
        )
        .route(
            "/resources/list",
            post(handlers::discovery::mcp_resources_list),
        )
        .route("/openapi.json", get(handlers::discovery::openapi_spec))
        .layer(axum::middleware::from_fn(
            middleware::timeout::health_timeout_middleware,
        ))
        .with_state(discovery_state);

    // AI Discovery System routes (stateless - no auth required)
    // Provides first-class support for LLMs and agentic users
    let ai_discovery_routes = Router::new()
        // Canonical entry point
        .route(
            "/.well-known/ai-discovery.json",
            get(handlers::ai_discovery::ai_discovery_json),
        )
        // OpenAI plugin manifest
        .route(
            "/.well-known/ai-plugin.json",
            get(handlers::ai_discovery::ai_plugin_json),
        )
        // A2A Agent Card (enhanced)
        .route(
            "/.well-known/agent.json",
            get(handlers::ai_discovery::a2a_agent_json),
        )
        // MCP server discovery (GET)
        .route(
            "/.well-known/mcp",
            get(handlers::ai_discovery::mcp_discovery),
        )
        // Downloadable skills bundle
        .route(
            "/.well-known/skills.zip",
            get(handlers::ai_discovery::skills_zip),
        )
        // AI crawler permissions
        .route("/ai.txt", get(handlers::ai_discovery::ai_txt))
        // LLMs.txt endpoints
        .route("/llms.txt", get(handlers::ai_discovery::llms_txt))
        .route("/llms-full.txt", get(handlers::ai_discovery::llms_full_txt))
        .route(
            "/llms-admin.txt",
            get(handlers::ai_discovery::llms_admin_txt),
        )
        // Skill system
        .route("/skill.md", get(handlers::ai_discovery::skill_md))
        .route("/skill.json", get(handlers::ai_discovery::skill_json))
        .route("/skills/:skill_id", get(handlers::ai_discovery::skill_file))
        // Agent integration guide
        .route("/agent.md", get(handlers::ai_discovery::agent_md))
        // Health status
        .route("/heartbeat.md", get(handlers::ai_discovery::heartbeat_md))
        .route(
            "/heartbeat.json",
            get(handlers::ai_discovery::heartbeat_json),
        )
        .layer(axum::middleware::from_fn(
            middleware::timeout::health_timeout_middleware,
        ));

    // Metrics route with optional API key auth per spec 09-configuration.md
    let metrics_routes = Router::new()
        .route("/metrics", get(handlers::metrics::prometheus_metrics))
        .with_state(metrics_state);

    // Admin webhook routes (per spec 11-webhooks.md)
    // Protected by admin_middleware - requires Ed25519 signature headers (X-Signature, X-Message, X-Signer)
    let admin_webhook_routes = Router::new()
        .route(
            "/webhooks",
            get(handlers::admin_webhooks::list_webhooks::<S>),
        )
        .route(
            "/webhooks/:id",
            get(handlers::admin_webhooks::get_webhook::<S>),
        )
        .route(
            "/webhooks/:id/retry",
            post(handlers::admin_webhooks::retry_webhook::<S>),
        )
        .route(
            "/webhooks/:id",
            delete(handlers::admin_webhooks::delete_webhook::<S>),
        )
        .route(
            "/webhooks/dlq",
            get(handlers::admin_webhooks::list_dlq::<S>),
        )
        .route(
            "/webhooks/dlq/:id/retry",
            post(handlers::admin_webhooks::retry_from_dlq::<S>),
        )
        .route(
            "/webhooks/dlq/:id",
            delete(handlers::admin_webhooks::delete_from_dlq::<S>),
        )
        .with_state(app_state.store.clone())
        // Admin middleware: requires Ed25519 signature verification (X-Signature, X-Message, X-Signer headers)
        .layer(axum::middleware::from_fn_with_state(
            admin_auth_state.clone(),
            middleware::admin_middleware,
        ));

    // Admin config routes (per plan Phase 4)
    // Protected by admin_middleware - requires Ed25519 signature headers
    // Only available when PostgreSQL storage is configured
    let admin_auth_state_for_config = admin_auth_state.clone();
    let admin_config_routes = admin_config_state.map(|config_state| {
        Router::new()
            .route("/config", get(handlers::admin_config::list_categories))
            .route("/config/batch", post(handlers::admin_config::batch_update))
            .route(
                "/config/validate",
                post(handlers::admin_config::validate_config),
            )
            .route("/config/history", get(handlers::admin_config::get_history))
            .route("/config/:category", get(handlers::admin_config::get_config))
            .route(
                "/config/:category",
                put(handlers::admin_config::update_config),
            )
            .route(
                "/config/:category",
                patch(handlers::admin_config::patch_config),
            )
            .with_state(config_state)
            .layer(axum::middleware::from_fn_with_state(
                admin_auth_state_for_config,
                middleware::admin_middleware,
            ))
    });

    // Admin AI settings routes
    // Protected by admin_middleware - requires Ed25519 signature headers
    // Only available when PostgreSQL storage is configured
    let admin_auth_state_for_ai = admin_auth_state.clone();
    let admin_ai_routes = admin_ai_state.map(|ai_state| {
        Router::new()
            .route("/config/ai", get(handlers::admin_ai::get_ai_settings))
            .route("/config/ai/api-key", put(handlers::admin_ai::save_api_key))
            .route(
                "/config/ai/api-key/:provider",
                delete(handlers::admin_ai::delete_api_key),
            )
            .route(
                "/config/ai/assignment",
                put(handlers::admin_ai::save_assignment),
            )
            .route("/config/ai/prompt", put(handlers::admin_ai::save_prompt))
            .with_state(ai_state)
            .layer(axum::middleware::from_fn_with_state(
                admin_auth_state_for_ai,
                middleware::admin_middleware,
            ))
    });

    // Combine all routes
    // Apply route prefix to paywall routes per spec (02-http-endpoints.md)
    // Stripe webhook and redirect routes intentionally bypass prefix for URL stability
    let paywall_prefix = if route_prefix.is_empty() {
        "/paywall/v1".to_string()
    } else {
        format!("{}/paywall/v1", route_prefix)
    };
    let subscription_prefix = format!("{}/subscription", paywall_prefix);

    // Health route with state per spec (02-http-endpoints.md)
    let health_routes = Router::new()
        .route("/cedros-health", get(handlers::health::health_with_state))
        .layer(axum::middleware::from_fn(
            middleware::timeout::health_timeout_middleware,
        ))
        .with_state(health_state);

    let mut router = Router::new()
        .merge(health_routes)
        .nest(&paywall_prefix, paywall_routes)
        .nest(&paywall_prefix, products_routes)
        .nest(&paywall_prefix, collections_routes)
        .nest(&paywall_prefix, faqs_routes)
        .nest(&subscription_prefix, subscription_routes)
        // Stripe routes bypass prefix for URL stability
        .nest("/stripe", stripe_redirects)
        .nest("/webhook", stripe_webhook)
        // Admin routes
        .nest("/admin", admin_webhook_routes);

    // Add admin config routes if available (requires PostgreSQL storage)
    if let Some(config_routes) = admin_config_routes {
        router = router.nest("/admin", config_routes);
    }

    // Add admin AI routes if available (requires PostgreSQL storage)
    if let Some(ai_routes) = admin_ai_routes {
        router = router.nest("/admin", ai_routes);
    }

    // Admin AI assistant routes (product assistant, etc.)
    // Protected by admin_middleware - requires Ed25519 signature headers
    let admin_auth_state_for_ai_assistant = admin_auth_state.clone();
    if let Some(ai_assistant_state) = admin_ai_assistant_state {
        let ai_assistant_routes = Router::new()
            .route(
                "/ai/product-assistant",
                post(handlers::admin_ai_assistant::product_assistant),
            )
            .route(
                "/ai/related-products",
                post(handlers::admin_ai_assistant::related_products),
            )
            .route(
                "/ai/product-search",
                post(handlers::admin_ai_assistant::product_search),
            )
            .with_state(ai_assistant_state)
            .layer(axum::middleware::from_fn_with_state(
                admin_auth_state_for_ai_assistant,
                middleware::admin_middleware,
            ));
        router = router.nest("/admin", ai_assistant_routes);
    }

    // Public chat endpoint (for customer-facing AI assistant)
    // Rate limited per tenant, requires AI configuration
    if let Some(chat_state) = chat_state {
        let chat_routes = Router::new()
            .route("/chat", post(handlers::chat::chat))
            .with_state(chat_state);
        router = router.nest(&paywall_prefix, chat_routes);
    }

    // Admin chat routes (for CRM-style chat review)
    // Protected by admin_middleware - requires Ed25519 signature headers
    let admin_auth_state_for_chat = admin_auth_state.clone();
    let admin_chat_routes = Router::new()
        .route("/chats", get(handlers::admin_chats::list_chat_sessions))
        .route(
            "/chats/:session_id",
            get(handlers::admin_chats::get_chat_session),
        )
        .route(
            "/users/:user_id/chats",
            get(handlers::admin_chats::list_user_chat_sessions),
        )
        .with_state(admin_chat_state)
        .layer(axum::middleware::from_fn_with_state(
            admin_auth_state_for_chat,
            middleware::admin_middleware,
        ));
    router = router.nest("/admin", admin_chat_routes);

    // Admin dashboard routes for UI team
    // Protected by admin_middleware - requires Ed25519 signature headers
    let admin_dashboard_routes = Router::new()
        // Stats endpoint
        .route("/stats", get(handlers::admin::get_stats))
        // Customers
        .route("/customers", get(handlers::admin_customers::list_customers))
        .route(
            "/customers/:id",
            get(handlers::admin_customers::get_customer),
        )
        .route(
            "/customers",
            post(handlers::admin_customers::create_customer),
        )
        .route(
            "/customers/:id",
            put(handlers::admin_customers::update_customer),
        )
        // Orders & fulfillments
        .route("/orders", get(handlers::admin_orders::list_orders))
        .route("/orders/:id", get(handlers::admin_orders::get_order))
        .route(
            "/orders/:id/status",
            post(handlers::admin_orders::update_order_status),
        )
        .route(
            "/orders/:id/fulfillments",
            post(handlers::admin_orders::create_fulfillment),
        )
        .route(
            "/fulfillments/:id/status",
            post(handlers::admin_orders::update_fulfillment_status),
        )
        // Returns
        .route("/returns", get(handlers::admin_returns::list_returns))
        .route("/returns/:id", get(handlers::admin_returns::get_return))
        .route("/returns", post(handlers::admin_returns::create_return))
        .route(
            "/returns/:id/status",
            post(handlers::admin_returns::update_return_status),
        )
        // Disputes / chargebacks
        .route("/disputes", get(handlers::admin_disputes::list_disputes))
        .route("/disputes", post(handlers::admin_disputes::create_dispute))
        .route("/disputes/:id", get(handlers::admin_disputes::get_dispute))
        .route(
            "/disputes/:id/status",
            post(handlers::admin_disputes::update_dispute_status),
        )
        // FAQs
        .route("/faqs", get(handlers::admin_faqs::list_faqs))
        .route("/faqs", post(handlers::admin_faqs::create_faq))
        .route("/faqs/:id", get(handlers::admin_faqs::get_faq))
        .route("/faqs/:id", put(handlers::admin_faqs::update_faq))
        .route("/faqs/:id", delete(handlers::admin_faqs::delete_faq))
        // Gift cards
        .route(
            "/gift-cards",
            get(handlers::admin_gift_cards::list_gift_cards),
        )
        .route(
            "/gift-cards",
            post(handlers::admin_gift_cards::create_gift_card),
        )
        .route(
            "/gift-cards/:code",
            get(handlers::admin_gift_cards::get_gift_card),
        )
        .route(
            "/gift-cards/:code",
            put(handlers::admin_gift_cards::update_gift_card),
        )
        .route(
            "/gift-cards/:code/adjust",
            post(handlers::admin_gift_cards::adjust_gift_card_balance),
        )
        // Collections
        .route(
            "/collections",
            get(handlers::admin_collections::list_collections),
        )
        .route(
            "/collections",
            post(handlers::admin_collections::create_collection),
        )
        .route(
            "/collections/:id",
            get(handlers::admin_collections::get_collection),
        )
        .route(
            "/collections/:id",
            put(handlers::admin_collections::update_collection),
        )
        .route(
            "/collections/:id",
            delete(handlers::admin_collections::delete_collection),
        )
        // Products CRUD
        .route("/products", get(handlers::admin::list_products))
        .route("/products/:id", get(handlers::admin::get_product))
        .route("/products", post(handlers::admin::create_product))
        .route("/products/:id", put(handlers::admin::update_product))
        .route("/products/:id", delete(handlers::admin::delete_product))
        .route(
            "/products/:id/inventory",
            put(handlers::admin::set_product_inventory),
        )
        .route(
            "/products/:id/inventory/adjust",
            post(handlers::admin::adjust_product_inventory),
        )
        .route(
            "/products/:id/inventory/adjustments",
            get(handlers::admin_inventory::list_inventory_adjustments),
        )
        // Product variations
        .route(
            "/products/:id/variations",
            get(handlers::admin_variations::get_variations),
        )
        .route(
            "/products/:id/variations",
            put(handlers::admin_variations::update_variations),
        )
        .route(
            "/products/:id/variants/inventory",
            put(handlers::admin_variations::bulk_update_inventory),
        )
        // Shipping profiles & rates
        .route(
            "/shipping/profiles",
            get(handlers::admin_shipping::list_profiles),
        )
        .route(
            "/shipping/profiles",
            post(handlers::admin_shipping::create_profile),
        )
        .route(
            "/shipping/profiles/:id",
            get(handlers::admin_shipping::get_profile),
        )
        .route(
            "/shipping/profiles/:id",
            put(handlers::admin_shipping::update_profile),
        )
        .route(
            "/shipping/profiles/:id",
            delete(handlers::admin_shipping::delete_profile),
        )
        .route(
            "/shipping/profiles/:id/rates",
            get(handlers::admin_shipping::list_rates),
        )
        .route(
            "/shipping/profiles/:id/rates",
            post(handlers::admin_shipping::create_rate),
        )
        .route(
            "/shipping/rates/:id",
            put(handlers::admin_shipping::update_rate),
        )
        .route(
            "/shipping/rates/:id",
            delete(handlers::admin_shipping::delete_rate),
        )
        // Taxes
        .route("/taxes", get(handlers::admin_tax::list_tax_rates))
        .route("/taxes", post(handlers::admin_tax::create_tax_rate))
        .route("/taxes/:id", get(handlers::admin_tax::get_tax_rate))
        .route("/taxes/:id", put(handlers::admin_tax::update_tax_rate))
        .route("/taxes/:id", delete(handlers::admin_tax::delete_tax_rate))
        // Stripe refunds (admin UI)
        .route(
            "/stripe/refunds",
            get(handlers::admin_stripe_refunds::list_stripe_refunds),
        )
        .route(
            "/stripe/refunds/:id/process",
            post(handlers::admin_stripe_refunds::process_stripe_refund),
        )
        // Transactions (read-only)
        .route("/transactions", get(handlers::admin::list_transactions))
        // Coupons CRUD
        .route("/coupons", get(handlers::admin::list_coupons))
        .route("/coupons", post(handlers::admin::create_coupon))
        .route("/coupons/:id", put(handlers::admin::update_coupon))
        .route("/coupons/:id", delete(handlers::admin::delete_coupon))
        // Refunds
        .route("/refunds", get(handlers::admin::list_refunds))
        .route(
            "/refunds/:id/process",
            post(handlers::admin::process_refund),
        )
        .with_state(admin_dashboard_state)
        .layer(axum::middleware::from_fn_with_state(
            admin_auth_state.clone(),
            middleware::admin_middleware,
        ));

    router = router.nest("/admin", admin_dashboard_routes);

    router
        .merge(discovery_routes)
        .merge(ai_discovery_routes)
        .merge(metrics_routes)
        // Per spec (10-middleware.md): Apply tenant middleware to all routes
        .layer(axum::middleware::from_fn(
            middleware::tenant::tenant_middleware,
        ))
        // Request body size limit to prevent DoS via large payloads
        .layer(DefaultBodyLimit::max(constants::MAX_REQUEST_BODY_SIZE))
}

async fn build_product_repository(
    cfg: &Config,
    storage_pg_pool: Option<PgPool>,
) -> anyhow::Result<Arc<dyn ProductRepository>> {
    let source = cfg
        .paywall
        .product_source
        .clone()
        .unwrap_or(ProductSource::Postgres);

    match source {
        ProductSource::Memory => {
            tracing::info!(
                "Loading {} products from config (in-memory)",
                cfg.paywall.resources.len()
            );
            let products = cfg
                .paywall
                .resources
                .iter()
                .map(paywall_resource_to_product)
                .collect();
            let base = Arc::new(InMemoryProductRepository::new(products));
            Ok(wrap_product_cache(base, cfg.paywall.product_cache_ttl))
        }
        ProductSource::Postgres => {
            let url = cfg.paywall.postgres_url.as_ref().ok_or_else(|| {
                anyhow::anyhow!("paywall.postgres_url is required when product_source=postgres")
            })?;
            let pg_pool = resolve_pg_pool(cfg, url, storage_pg_pool).await?;
            let repo_config = ProductRepositoryConfig {
                backend: ProductBackend::Postgres,
                cache_ttl: Some(cfg.paywall.product_cache_ttl),
                table_name: Some(cfg.storage.schema_mapping.products_table.clone()),
            };
            Ok(new_product_repository(repo_config, Some(pg_pool)).await?)
        }
    }
}

async fn build_coupon_repository(
    cfg: &Config,
    storage_pg_pool: Option<PgPool>,
) -> anyhow::Result<Arc<dyn CouponRepository>> {
    let source = cfg
        .coupons
        .coupon_source
        .clone()
        .unwrap_or(CouponSource::Postgres);

    match source {
        CouponSource::Disabled => {
            let repo_config = CouponRepositoryConfig {
                backend: CouponBackend::Disabled,
                cache_ttl: Some(cfg.coupons.cache_ttl),
                table_name: None,
            };
            Ok(new_coupon_repository(repo_config, None).await?)
        }
        CouponSource::Memory => {
            tracing::info!("Using in-memory coupon repository (testing only)");
            let repo_config = CouponRepositoryConfig {
                backend: CouponBackend::Memory,
                cache_ttl: Some(cfg.coupons.cache_ttl),
                table_name: None,
            };
            Ok(new_coupon_repository(repo_config, None).await?)
        }
        CouponSource::Postgres => {
            let url = cfg.coupons.postgres_url.as_ref().ok_or_else(|| {
                anyhow::anyhow!("coupons.postgres_url is required when coupon_source=postgres")
            })?;
            let pg_pool = resolve_pg_pool(cfg, url, storage_pg_pool).await?;
            let repo_config = CouponRepositoryConfig {
                backend: CouponBackend::Postgres,
                cache_ttl: Some(cfg.coupons.cache_ttl),
                table_name: Some(cfg.storage.schema_mapping.coupons_table.clone()),
            };
            Ok(new_coupon_repository(repo_config, Some(pg_pool)).await?)
        }
    }
}

fn wrap_product_cache<R: ProductRepository + 'static>(
    repo: Arc<R>,
    ttl: Duration,
) -> Arc<dyn ProductRepository> {
    if ttl > Duration::ZERO {
        let cache_config = RepositoryCacheConfig {
            item_ttl: ttl,
            list_ttl: ttl,
            enabled: true,
            ..Default::default()
        };
        Arc::new(CachedProductRepository::new(repo, cache_config))
    } else {
        repo
    }
}

async fn resolve_pg_pool(
    cfg: &Config,
    url: &str,
    storage_pg_pool: Option<PgPool>,
) -> anyhow::Result<PgPool> {
    if let Some(storage_url) = cfg.storage.postgres_url.as_ref() {
        if storage_url == url {
            if let Some(pool) = storage_pg_pool {
                return Ok(pool);
            }
        }
    }

    let pool = build_postgres_pool(cfg, url).await?;
    Ok(pool.inner().clone())
}

async fn build_postgres_pool(cfg: &Config, url: &str) -> anyhow::Result<PostgresPool> {
    let mut pg_config =
        PostgresConfig::from_url(url).map_err(|e| anyhow::anyhow!(e.to_string()))?;
    pg_config.max_connections = cfg.storage.postgres_pool.max_open_conns;
    pg_config.min_connections = cfg.storage.postgres_pool.min_connections;
    pg_config.max_lifetime = cfg.storage.postgres_pool.conn_max_lifetime;
    Ok(PostgresPool::new(&pg_config).await?)
}

/// Background worker handles for graceful shutdown.
///
/// Library users can spawn these workers using [`spawn_workers`] and manage
/// their lifecycle independently of the router.
pub struct PaymentWorkers {
    cleanup_handle: workers::CleanupWorkerHandle,
    webhook_handle: workers::WebhookWorkerHandle,
    health_handle: Option<workers::HealthCheckerHandle>,
    subscription_handle: workers::SubscriptionWorkerHandle,
    rate_limiter_cleanup_handle: Option<middleware::RateLimiterCleanupHandle>,
}

/// Maximum time to wait for each background worker to stop.
const WORKER_SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(15);

impl PaymentWorkers {
    /// Signal all workers to shutdown and await their completion.
    pub async fn shutdown(self) {
        tracing::info!("Initiating graceful shutdown of background workers");

        // Signal shutdown and await completion for each worker handle
        if tokio::time::timeout(
            WORKER_SHUTDOWN_TIMEOUT,
            self.cleanup_handle.shutdown_and_wait(),
        )
        .await
        .is_err()
        {
            tracing::warn!("Timed out waiting for cleanup worker shutdown");
        }

        if tokio::time::timeout(
            WORKER_SHUTDOWN_TIMEOUT,
            self.webhook_handle.shutdown_and_wait(),
        )
        .await
        .is_err()
        {
            tracing::warn!("Timed out waiting for webhook worker shutdown");
        }
        if let Some(handle) = self.health_handle {
            if tokio::time::timeout(WORKER_SHUTDOWN_TIMEOUT, handle.shutdown_and_wait())
                .await
                .is_err()
            {
                tracing::warn!("Timed out waiting for health checker shutdown");
            }
        }
        if tokio::time::timeout(
            WORKER_SHUTDOWN_TIMEOUT,
            self.subscription_handle.shutdown_and_wait(),
        )
        .await
        .is_err()
        {
            tracing::warn!("Timed out waiting for subscription worker shutdown");
        }
        if let Some(handle) = self.rate_limiter_cleanup_handle {
            handle.shutdown();
        }

        tracing::info!("All background workers shut down");
    }
}

/// Spawn background workers for payment processing.
///
/// Library users who embed the router should call this separately if they need
/// background workers for webhook delivery, cleanup, health checking, etc.
///
/// # Example
/// ```rust,ignore
/// let services = cedros_pay::build_services(&config, store.clone(), None).await?;
/// let workers = cedros_pay::spawn_workers(&config, store.clone(), services.notifier.clone())?;
///
/// // When shutting down:
/// workers.shutdown().await;
/// ```
pub fn spawn_workers<S: Store + 'static>(
    cfg: &Config,
    store: Arc<S>,
    notifier: Arc<dyn webhooks::Notifier>,
) -> anyhow::Result<PaymentWorkers> {
    // Create health state for workers (not shared with router in library mode)
    let health_state = Arc::new(parking_lot::RwLock::new(handlers::health::HealthState {
        health_checker: None,
        network: cfg.x402.network.clone(),
        route_prefix: cfg.server.route_prefix.clone(),
        gasless_enabled: cfg.x402.gasless_enabled,
        auto_create_token_accounts: cfg.x402.auto_create_token_account,
        balance_monitoring_enabled: cfg.monitoring.low_balance_alert_url.is_some(),
    }));

    spawn_workers_internal(store, cfg, health_state, None, notifier)
}

fn spawn_workers_internal<S: Store + 'static>(
    store: Arc<S>,
    cfg: &Config,
    health_state: Arc<parking_lot::RwLock<handlers::health::HealthState>>,
    rate_limiter: Option<Arc<middleware::RateLimiter>>,
    notifier: Arc<dyn webhooks::Notifier>,
) -> anyhow::Result<PaymentWorkers> {
    // Start rate limiter cleanup task if provided (only in standalone server mode)
    let rate_limiter_cleanup_handle = rate_limiter.map(|rl| rl.start_cleanup_task());

    // Spawn cleanup worker per spec (11-background-workers.md)
    // Per spec: Poll every CEDROS_STORAGE_CLEANUP_INTERVAL (default: 5m)
    // Convert retention_period from Duration to days
    let archival_enabled = cfg.storage.archival.enabled;
    let retention_period = cfg.storage.archival.retention_period;
    let run_interval = cfg.storage.archival.run_interval;
    let (cleanup_worker, cleanup_handle) = CleanupWorker::with_shutdown(
        store.clone(),
        retention_period,
        run_interval,
        archival_enabled,
    );
    let cleanup_join = tokio::spawn(async move {
        cleanup_worker.run().await;
    });
    let cleanup_handle = cleanup_handle.with_join_handle(cleanup_join);

    // Spawn webhook delivery worker per spec (11-background-workers.md)
    let webhook_cb = middleware::CircuitBreakerConfig::from_service_config(
        "webhook",
        &cfg.circuit_breaker.webhook,
    );
    let (webhook_worker, webhook_handle) =
        workers::WebhookWorker::with_shutdown_and_config(store.clone(), &cfg.callbacks, webhook_cb)
            .map_err(|e| anyhow::anyhow!(e))?;
    let webhook_join = tokio::spawn(async move {
        webhook_worker.run().await;
    });
    let webhook_handle = webhook_handle.with_join_handle(webhook_join);

    // Spawn health checker worker per spec (22-x402-verifier.md)
    // Only spawn if RPC URL is configured (required for health checking)
    let health_handle = if !cfg.x402.rpc_url.is_empty() {
        let wallets: Vec<String> = cfg.x402.server_wallets.clone();
        let rpc_url = cfg.x402.rpc_url.clone();
        let check_interval = cfg.monitoring.check_interval;
        let low_threshold = cfg.monitoring.low_balance_threshold;
        let alert_url = cfg.monitoring.low_balance_alert_url.clone();
        let alert_headers = cfg.monitoring.headers.clone();
        let body_template = cfg.monitoring.body_template.clone();
        let alert_timeout = cfg.monitoring.timeout;

        let (checker, handle) = HealthChecker::with_shutdown(&rpc_url, wallets);
        let mut checker = checker.with_thresholds(low_threshold, 0.001);

        // Configure webhook alert callback if alert URL is set
        if let Some(url) = alert_url {
            tracing::info!(alert_url = %url, "Balance alert webhook configured");
            let callback =
                workers::create_webhook_callback(url, alert_headers, body_template, alert_timeout)
                    .map_err(|e| anyhow::anyhow!(e))?;
            checker = checker.with_alert_callback(callback);
        }

        // Convert to Arc so we can share with health endpoint handler
        let (checker_arc, shutdown_rx) = checker.into_arc_with_shutdown();

        // Update health_state with the checker reference
        health_state.write().health_checker = Some(checker_arc.clone());

        let health_join = tokio::spawn(async move {
            HealthChecker::run_arc(checker_arc, shutdown_rx, check_interval).await;
        });

        tracing::info!("Health checker worker spawned");
        Some(handle.with_join_handle(health_join))
    } else {
        None
    };

    // Spawn subscription worker per spec (11-background-workers.md)
    // Per spec (18-services-subscriptions.md): ExpireOverdue runs daily to mark expired x402 subscriptions
    let (subscription_worker, subscription_handle) =
        workers::SubscriptionWorker::with_shutdown(Arc::new(cfg.clone()), store.clone(), notifier);
    let subscription_join = tokio::spawn(async move {
        subscription_worker.run().await;
    });
    let subscription_handle = subscription_handle.with_join_handle(subscription_join);

    tracing::info!("Background workers spawned");

    Ok(PaymentWorkers {
        cleanup_handle,
        webhook_handle,
        health_handle,
        subscription_handle,
        rate_limiter_cleanup_handle,
    })
}

/// Per spec (04-graceful-shutdown.md):
/// - Handle both SIGINT (Ctrl+C) and SIGTERM
/// - 15-second shutdown timeout
/// - Log shutdown initiation
async fn shutdown_signal() {
    let ctrl_c = async {
        match tokio::signal::ctrl_c().await {
            Ok(()) => {}
            Err(e) => {
                tracing::error!(error = %e, "Failed to install Ctrl+C handler");
                // Fall back to waiting forever - server will still respond to other signals
                std::future::pending::<()>().await;
            }
        }
    };

    #[cfg(unix)]
    let terminate = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut stream) => {
                stream.recv().await;
            }
            Err(e) => {
                tracing::error!(error = %e, "Failed to install SIGTERM handler");
                // Fall back to waiting forever - server will still respond to other signals
                std::future::pending::<()>().await;
            }
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            tracing::info!("SIGINT received, initiating graceful shutdown");
        }
        _ = terminate => {
            tracing::info!("SIGTERM received, initiating graceful shutdown");
        }
    }

    // Per spec (04-graceful-shutdown.md): 15-second shutdown timeout
    // This timeout is enforced by the axum serve graceful_shutdown
    tracing::info!("Graceful shutdown initiated with 15-second timeout");
}

/// Default server address fallback - known valid at compile time
const DEFAULT_ADDR: SocketAddr = SocketAddr::new(
    std::net::IpAddr::V4(std::net::Ipv4Addr::new(0, 0, 0, 0)),
    8080,
);

fn server_timeout_from_config(cfg: &ServerConfig) -> Option<Duration> {
    [cfg.read_timeout, cfg.write_timeout, cfg.idle_timeout]
        .into_iter()
        .flatten()
        .max()
}

fn normalize_addr(raw: &str) -> SocketAddr {
    if raw.starts_with(':') {
        let trimmed = raw.trim_start_matches(':');
        let full = format!("0.0.0.0:{trimmed}");
        return full.parse().unwrap_or_else(|e| {
            tracing::warn!(
                address = %raw,
                error = %e,
                fallback = %DEFAULT_ADDR,
                "Invalid server address, using fallback. Check SERVER_ADDRESS config."
            );
            DEFAULT_ADDR
        });
    }
    raw.parse().unwrap_or_else(|e| {
        tracing::warn!(
            address = %raw,
            error = %e,
            fallback = %DEFAULT_ADDR,
            "Invalid server address, using fallback. Check SERVER_ADDRESS config."
        );
        DEFAULT_ADDR
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_server_timeout_from_config_maximum() {
        let cfg = ServerConfig {
            address: "0.0.0.0:8080".to_string(),
            public_url: String::new(),
            route_prefix: "".to_string(),
            admin_metrics_api_key: None,
            cors_allowed_origins: Vec::new(),
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

        let product = paywall_resource_to_product(&resource);
        assert_eq!(product.tenant_id, "tenant-1");
    }
}
