use std::sync::Arc;
use std::time::Duration;

use sqlx::PgPool;

use crate::callback::PaymentCallback;
use crate::config::{Config, CouponSource, PaywallResource, ProductSource};
use crate::handlers;
use crate::middleware;
use crate::models::{get_asset, Money, Product};
use crate::repositories::{
    new_coupon_repository, new_product_repository, CachedProductRepository, CouponBackend,
    CouponRepository, CouponRepositoryConfig, InMemoryProductRepository, ProductBackend,
    ProductRepository, ProductRepositoryConfig, RepositoryCacheConfig,
};
use crate::server::build_postgres_pool;
use crate::services::{
    self, create_messaging_service, BlockhashCache, PaywallService, StripeClient,
    StripeWebhookProcessor, SubscriptionService,
};
use crate::storage::Store;
use crate::webhooks;
use crate::workers;
use crate::x402::{SolanaVerifier, Verifier};
use crate::NoopVerifier;

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
    pub product_repo: Arc<dyn ProductRepository>,
    /// Coupon repository
    pub coupon_repo: Arc<dyn CouponRepository>,
    /// Blockhash cache (if RPC configured)
    pub blockhash_cache: Option<Arc<BlockhashCache>>,
    /// The config used to build these services
    pub config: Config,
    // Internal fields for router construction
    pub(crate) stripe_webhook_processor: Option<Arc<StripeWebhookProcessor<S>>>,
    pub(crate) health_state: Arc<parking_lot::RwLock<handlers::health::HealthState>>,
    pub(crate) storage_pg_pool: Option<PgPool>,
    /// Cedros-login client for JWT validation (if configured)
    pub(crate) cedros_login_client: Option<Arc<services::CedrosLoginClient>>,
    /// Email worker handle — kept alive so panics are logged instead of silently lost.
    /// Not read directly; held to keep the worker alive for the server's lifetime.
    #[allow(dead_code)]
    pub(crate) email_worker_handle: Option<workers::EmailWorkerHandle>,
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
    if let Some(ref pool) = storage_pg_pool {
        let mut migrator = sqlx::migrate!("./migrations");
        migrator.ignore_missing = true;
        migrator
            .run(pool)
            .await
            .map_err(|e| anyhow::anyhow!("cedros-pay migration failed: {}", e))?;
        tracing::info!("Cedros Pay database migrations applied");
    }

    let product_repo = build_product_repository(cfg, storage_pg_pool.clone()).await?;
    let coupon_repo = build_coupon_repository(cfg, storage_pg_pool.clone()).await?;

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

    let cedros_login_client = if cfg.cedros_login.enabled && !cfg.cedros_login.base_url.is_empty()
    {
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

    let messaging_service = create_messaging_service(&cfg.messaging, store.clone());
    let email_worker_handle = workers::spawn_email_worker(store.clone(), cfg.messaging.clone());

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

    let mut subscription_service =
        SubscriptionService::new(Arc::new(cfg.clone()), store.clone(), notifier.clone());
    if let Some(ref client) = cedros_login_client {
        subscription_service = subscription_service.with_cedros_login(client.clone());
    }
    if let Some(ref cb) = callback {
        subscription_service = subscription_service.with_payment_callback(cb.clone());
    }
    let subscription_service = Arc::new(subscription_service);

    let stripe_client = if !cfg.stripe.secret_key.is_empty() {
        let stripe_cb = middleware::CircuitBreakerConfig::from_service_config(
            "stripe_api",
            &cfg.circuit_breaker.stripe_api,
        );
        Some(Arc::new(StripeClient::with_circuit_breaker(
            cfg.clone(),
            store.clone() as Arc<dyn Store>,
            notifier.clone(),
            stripe_cb,
        )?))
    } else {
        None
    };

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
        email_worker_handle,
    })
}

// ============================================================================
// Repository builders
// ============================================================================

pub(crate) async fn build_product_repository(
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

pub(crate) async fn build_coupon_repository(
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

// ============================================================================
// Config-to-model conversion
// ============================================================================

/// Convert a PaywallResource from config to a Product model
pub(crate) fn paywall_resource_to_product(resource: &PaywallResource) -> Product {
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
