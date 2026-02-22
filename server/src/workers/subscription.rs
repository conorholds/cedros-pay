use std::sync::Arc;
use std::time::Duration;

use tokio::sync::watch;
use tokio::task::JoinHandle;

use crate::config::Config;
use crate::services::SubscriptionService;
use crate::storage::Store;
use crate::webhooks::Notifier;

/// Handle for controlling the subscription worker
pub struct SubscriptionWorkerHandle {
    shutdown_tx: watch::Sender<bool>,
    join_handle: Option<JoinHandle<()>>,
}

impl SubscriptionWorkerHandle {
    /// Signal the worker to shut down gracefully
    pub fn shutdown(&self) {
        let _ = self.shutdown_tx.send(true);
    }

    pub fn with_join_handle(mut self, join_handle: JoinHandle<()>) -> Self {
        self.join_handle = Some(join_handle);
        self
    }

    pub async fn wait(mut self) {
        if let Some(handle) = self.join_handle.take() {
            let _ = handle.await;
        }
    }

    pub async fn shutdown_and_wait(self) {
        self.shutdown();
        self.wait().await;
    }
}

/// Background worker for subscription maintenance
/// Per spec (11-background-workers.md, 18-services-subscriptions.md):
/// - ExpireOverdue: marks expired x402 subscriptions (runs daily, configurable)
/// - Only processes x402 subscriptions (Stripe managed by webhooks)
pub struct SubscriptionWorker<S: Store + 'static> {
    service: Arc<SubscriptionService<S>>,
    store: Arc<S>,
    expire_interval: Duration,
    shutdown_rx: Option<watch::Receiver<bool>>,
}

impl<S: Store + 'static> SubscriptionWorker<S> {
    pub fn new(config: Arc<Config>, store: Arc<S>, notifier: Arc<dyn Notifier>) -> Self {
        let service = Arc::new(SubscriptionService::new(config, store.clone(), notifier));
        Self {
            service,
            store,
            // Per spec (11-background-workers.md): runs daily (configurable)
            expire_interval: Duration::from_secs(86400), // 24 hours
            shutdown_rx: None,
        }
    }

    /// Create a worker with shutdown capability
    pub fn with_shutdown(
        config: Arc<Config>,
        store: Arc<S>,
        notifier: Arc<dyn Notifier>,
    ) -> (Self, SubscriptionWorkerHandle) {
        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        let service = Arc::new(SubscriptionService::new(config, store.clone(), notifier));
        let worker = Self {
            service,
            store,
            expire_interval: Duration::from_secs(86400),
            shutdown_rx: Some(shutdown_rx),
        };
        let handle = SubscriptionWorkerHandle {
            shutdown_tx,
            join_handle: None,
        };
        (worker, handle)
    }

    /// Set custom interval for expiration checks (for testing)
    pub fn with_expire_interval(mut self, interval: Duration) -> Self {
        self.expire_interval = interval;
        self
    }

    /// Run the subscription worker loop with graceful shutdown support
    pub async fn run(mut self) {
        let mut expire_timer = tokio::time::interval(self.expire_interval);

        tracing::info!(
            interval_secs = self.expire_interval.as_secs(),
            "Subscription worker started"
        );

        loop {
            tokio::select! {
                _ = expire_timer.tick() => {
                    self.expire_overdue_subscriptions().await;
                }
                _ = async {
                    if let Some(ref mut rx) = self.shutdown_rx {
                        let _ = rx.changed().await;
                    } else {
                        std::future::pending::<()>().await
                    }
                } => {
                    tracing::info!("Subscription worker received shutdown signal");
                    break;
                }
            }
        }

        tracing::info!("Subscription worker stopped");
    }

    /// Expire overdue x402 subscriptions per spec (18-services-subscriptions.md)
    async fn expire_overdue_subscriptions(&self) {
        // OPS-04: Wrap DB calls in timeout to prevent unbounded hangs
        const DB_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(30);

        let tenants = match tokio::time::timeout(DB_TIMEOUT, self.store.list_tenant_ids()).await {
            Ok(Ok(tenants)) => tenants,
            Ok(Err(e)) => {
                tracing::error!(error = %e, "Failed to list tenant ids for subscription worker");
                return;
            }
            Err(_) => {
                tracing::error!("Timed out listing tenant ids for subscription worker");
                return;
            }
        };

        if tenants.is_empty() {
            tracing::debug!("No tenants with subscriptions to expire");
            return;
        }

        let mut consecutive_errors = 0u32;
        for tenant_id in tenants {
            // REL-013: Add backoff delay after consecutive errors to prevent hammering failing storage
            if consecutive_errors > 0 {
                let backoff_ms = (100 * consecutive_errors.min(10)) as u64; // Max 1 second
                tokio::time::sleep(std::time::Duration::from_millis(backoff_ms)).await;
            }

            match tokio::time::timeout(DB_TIMEOUT, self.service.expire_overdue(&tenant_id)).await {
                Err(_) => {
                    consecutive_errors += 1;
                    tracing::error!(tenant_id = %tenant_id, "Timed out expiring overdue subscriptions");
                }
                Ok(Ok(count)) if count > 0 => {
                    consecutive_errors = 0;
                    tracing::info!(
                        count,
                        tenant_id = %tenant_id,
                        "Expired overdue x402 subscriptions"
                    );
                }
                Ok(Ok(_)) => {
                    consecutive_errors = 0;
                    tracing::debug!(
                        tenant_id = %tenant_id,
                        "No overdue subscriptions to expire"
                    );
                }
                Ok(Err(e)) => {
                    consecutive_errors = consecutive_errors.saturating_add(1);
                    tracing::error!(
                        error = %e,
                        tenant_id = %tenant_id,
                        consecutive_errors,
                        "Failed to expire overdue subscriptions"
                    );
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use chrono::{Duration as ChronoDuration, Utc};

    use crate::models::{BillingPeriod, PaymentMethod, Subscription, SubscriptionStatus};
    use crate::storage::InMemoryStore;
    use crate::webhooks::NoopNotifier;

    #[tokio::test]
    async fn test_expire_overdue_multiple_tenants() {
        let mut cfg = Config::default();
        cfg.subscriptions.grace_period_hours = 0;
        let store = Arc::new(InMemoryStore::new());
        let notifier = Arc::new(NoopNotifier);
        let worker = SubscriptionWorker::new(Arc::new(cfg), store.clone(), notifier);

        let now = Utc::now();
        let sub_one = Subscription {
            id: "sub-1".to_string(),
            tenant_id: "tenant-a".to_string(),
            wallet: Some("wallet-1".to_string()),
            user_id: None,
            product_id: "prod-1".to_string(),
            plan_id: None,
            payment_method: PaymentMethod::X402,
            stripe_subscription_id: None,
            stripe_customer_id: None,
            status: SubscriptionStatus::Active,
            billing_period: BillingPeriod::Month,
            billing_interval: 1,
            current_period_start: now - ChronoDuration::days(2),
            current_period_end: now - ChronoDuration::hours(1),
            trial_end: None,
            cancel_at_period_end: false,
            cancelled_at: None,
            payment_signature: None,
            created_at: Some(now - ChronoDuration::days(2)),
            updated_at: Some(now - ChronoDuration::days(1)),
            metadata: std::collections::HashMap::new(),
        };
        let sub_two = Subscription {
            tenant_id: "tenant-b".to_string(),
            ..sub_one.clone()
        };

        store.save_subscription(sub_one).await.unwrap();
        store.save_subscription(sub_two).await.unwrap();

        worker.expire_overdue_subscriptions().await;

        let expired_a = store
            .get_subscription("tenant-a", "sub-1")
            .await
            .unwrap()
            .unwrap();
        let expired_b = store
            .get_subscription("tenant-b", "sub-1")
            .await
            .unwrap()
            .unwrap();

        assert_eq!(expired_a.status, SubscriptionStatus::Expired);
        assert_eq!(expired_b.status, SubscriptionStatus::Expired);
    }
}
