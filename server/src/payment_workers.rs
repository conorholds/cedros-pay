use std::future::Future;
use std::panic::AssertUnwindSafe;
use std::sync::Arc;
use std::time::Duration;

use futures_util::FutureExt;

use crate::config::Config;
use crate::handlers;
use crate::middleware;
use crate::storage::Store;
use crate::webhooks;
use crate::workers::{CleanupWorker, HealthChecker};

/// OPS-01: Supervised spawn that catches worker panics and logs them at error level.
/// Without this, a panicked worker silently disappears until shutdown.
fn spawn_supervised<F>(name: &'static str, fut: F) -> tokio::task::JoinHandle<()>
where
    F: Future<Output = ()> + Send + 'static,
{
    tokio::spawn(async move {
        match AssertUnwindSafe(fut).catch_unwind().await {
            Ok(()) => tracing::info!(worker = name, "Worker exited normally"),
            Err(panic_info) => {
                let msg = if let Some(s) = panic_info.downcast_ref::<&str>() {
                    s.to_string()
                } else if let Some(s) = panic_info.downcast_ref::<String>() {
                    s.clone()
                } else {
                    "unknown panic".to_string()
                };
                tracing::error!(worker = name, panic = %msg, "Worker panicked — requires restart");
            }
        }
    })
}

/// Background worker handles for graceful shutdown.
///
/// Library users can spawn these workers using [`spawn_workers`] and manage
/// their lifecycle independently of the router.
pub struct PaymentWorkers {
    pub(crate) cleanup_handle: crate::workers::CleanupWorkerHandle,
    pub(crate) webhook_handle: crate::workers::WebhookWorkerHandle,
    pub(crate) health_handle: Option<crate::workers::HealthCheckerHandle>,
    pub(crate) subscription_handle: crate::workers::SubscriptionWorkerHandle,
    pub(crate) rate_limiter_cleanup_handle: Option<middleware::RateLimiterCleanupHandle>,
}

/// Maximum time to wait for each background worker to stop.
const WORKER_SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(15);

impl PaymentWorkers {
    /// Signal all workers to shutdown and await their completion.
    /// OPS-07: Signal all workers first, then await concurrently with single timeout.
    pub async fn shutdown(self) {
        tracing::info!("Initiating graceful shutdown of background workers");

        // Signal all workers to stop first (non-blocking)
        self.cleanup_handle.shutdown();
        self.webhook_handle.shutdown();
        if let Some(ref handle) = self.health_handle {
            handle.shutdown();
        }
        self.subscription_handle.shutdown();
        if let Some(ref handle) = self.rate_limiter_cleanup_handle {
            handle.shutdown();
        }

        // Await all workers concurrently with a single timeout
        let result = tokio::time::timeout(WORKER_SHUTDOWN_TIMEOUT, async {
            let cleanup = self.cleanup_handle.wait();
            let webhook = self.webhook_handle.wait();
            let subscription = self.subscription_handle.wait();

            tokio::join!(cleanup, webhook, subscription);

            if let Some(handle) = self.health_handle {
                handle.wait().await;
            }
        })
        .await;

        if result.is_err() {
            tracing::warn!("Timed out waiting for background workers to shutdown");
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

pub(crate) fn spawn_workers_internal<S: Store + 'static>(
    store: Arc<S>,
    cfg: &Config,
    health_state: Arc<parking_lot::RwLock<handlers::health::HealthState>>,
    rate_limiter: Option<Arc<middleware::RateLimiter>>,
    notifier: Arc<dyn webhooks::Notifier>,
) -> anyhow::Result<PaymentWorkers> {
    let rate_limiter_cleanup_handle = rate_limiter.map(|rl| rl.start_cleanup_task());

    let archival_enabled = cfg.storage.archival.enabled;
    let retention_period = cfg.storage.archival.retention_period;
    let run_interval = cfg.storage.archival.run_interval;
    let (cleanup_worker, cleanup_handle) = CleanupWorker::with_shutdown(
        store.clone(),
        retention_period,
        run_interval,
        archival_enabled,
    );
    let cleanup_join = spawn_supervised("cleanup", async move {
        cleanup_worker.run().await;
    });
    let cleanup_handle = cleanup_handle.with_join_handle(cleanup_join);

    let webhook_cb = middleware::CircuitBreakerConfig::from_service_config(
        "webhook",
        &cfg.circuit_breaker.webhook,
    );
    let (webhook_worker, webhook_handle) =
        crate::workers::WebhookWorker::with_shutdown_and_config(
            store.clone(),
            &cfg.callbacks,
            webhook_cb,
        )
        .map_err(|e| anyhow::anyhow!(e))?;
    let webhook_join = spawn_supervised("webhook", async move {
        webhook_worker.run().await;
    });
    let webhook_handle = webhook_handle.with_join_handle(webhook_join);

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

        if let Some(url) = alert_url {
            tracing::info!(alert_url = %url, "Balance alert webhook configured");
            let callback = crate::workers::create_webhook_callback(
                url,
                alert_headers,
                body_template,
                alert_timeout,
            )
            .map_err(|e| anyhow::anyhow!(e))?;
            checker = checker.with_alert_callback(callback);
        }

        let (checker_arc, shutdown_rx) = checker.into_arc_with_shutdown();
        health_state.write().health_checker = Some(checker_arc.clone());

        let health_join = spawn_supervised("health_checker", async move {
            HealthChecker::run_arc(checker_arc, shutdown_rx, check_interval).await;
        });

        tracing::info!("Health checker worker spawned");
        Some(handle.with_join_handle(health_join))
    } else {
        None
    };

    let (subscription_worker, subscription_handle) =
        crate::workers::SubscriptionWorker::with_shutdown(
            Arc::new(cfg.clone()),
            store.clone(),
            notifier,
        );
    let subscription_join = spawn_supervised("subscription", async move {
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
