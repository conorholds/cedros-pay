use std::sync::Arc;
use std::time::Duration;

use tokio::task::JoinHandle;

use chrono::Utc;
use tokio::sync::watch;
use tokio::time::timeout;

use crate::storage::Store;

/// Timeout for individual cleanup operations to prevent worker hangs
const CLEANUP_OPERATION_TIMEOUT: Duration = Duration::from_secs(30);

/// Handle for controlling the cleanup worker
pub struct CleanupWorkerHandle {
    shutdown_tx: watch::Sender<bool>,
    join_handle: Option<JoinHandle<()>>,
}

impl CleanupWorkerHandle {
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

/// Cleanup worker for expired data with graceful shutdown support
pub struct CleanupWorker<S: Store> {
    store: Arc<S>,
    payment_retention_period: Duration,
    archival_enabled: bool,
    nonce_cleanup_interval: Duration,
    idempotency_cleanup_interval: Duration,
    payment_cleanup_interval: Duration,
    credits_hold_cleanup_interval: Duration,
    shutdown_rx: Option<watch::Receiver<bool>>,
}

impl<S: Store> CleanupWorker<S> {
    pub fn new(
        store: Arc<S>,
        payment_retention_period: Duration,
        payment_cleanup_interval: Duration,
        archival_enabled: bool,
    ) -> Self {
        Self {
            store,
            payment_retention_period,
            archival_enabled,
            // Per spec (11-background-workers.md): Poll every CEDROS_STORAGE_CLEANUP_INTERVAL (default: 5m)
            nonce_cleanup_interval: Duration::from_secs(300),
            idempotency_cleanup_interval: Duration::from_secs(300),
            payment_cleanup_interval,
            credits_hold_cleanup_interval: Duration::from_secs(300),
            shutdown_rx: None,
        }
    }

    /// Create a worker with shutdown capability
    pub fn with_shutdown(
        store: Arc<S>,
        payment_retention_period: Duration,
        payment_cleanup_interval: Duration,
        archival_enabled: bool,
    ) -> (Self, CleanupWorkerHandle) {
        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        let worker = Self {
            store,
            payment_retention_period,
            archival_enabled,
            // Per spec (11-background-workers.md): Poll every CEDROS_STORAGE_CLEANUP_INTERVAL (default: 5m)
            nonce_cleanup_interval: Duration::from_secs(300),
            idempotency_cleanup_interval: Duration::from_secs(300),
            payment_cleanup_interval,
            credits_hold_cleanup_interval: Duration::from_secs(300),
            shutdown_rx: Some(shutdown_rx),
        };
        let handle = CleanupWorkerHandle {
            shutdown_tx,
            join_handle: None,
        };
        (worker, handle)
    }

    /// Check if shutdown has been requested
    fn should_shutdown(&self) -> bool {
        if let Some(ref rx) = self.shutdown_rx {
            *rx.borrow()
        } else {
            false
        }
    }

    /// Run the cleanup loop with graceful shutdown support
    pub async fn run(mut self) {
        let mut nonce_timer = tokio::time::interval(self.nonce_cleanup_interval);
        let mut idempotency_timer = tokio::time::interval(self.idempotency_cleanup_interval);
        // Payment archival per spec (11-background-workers.md): default 24h (86400 seconds)
        let mut payment_timer = tokio::time::interval(self.payment_cleanup_interval);
        // Cart and refund cleanup per spec (11-background-workers.md) - default 5m
        let mut quote_timer = tokio::time::interval(Duration::from_secs(300));
        let mut credits_hold_timer = tokio::time::interval(self.credits_hold_cleanup_interval);

        // Use Delay behavior to prevent back-to-back runs after slow operations.
        // Default Burst would cause immediate re-runs if cleanup takes longer than interval.
        use tokio::time::MissedTickBehavior;
        nonce_timer.set_missed_tick_behavior(MissedTickBehavior::Delay);
        idempotency_timer.set_missed_tick_behavior(MissedTickBehavior::Delay);
        payment_timer.set_missed_tick_behavior(MissedTickBehavior::Delay);
        quote_timer.set_missed_tick_behavior(MissedTickBehavior::Delay);
        credits_hold_timer.set_missed_tick_behavior(MissedTickBehavior::Delay);

        tracing::info!("Cleanup worker started");

        // Run initial cleanup immediately on startup to clear any stale data
        // from before the server restart. This ensures we don't wait for the
        // first interval to fire.
        // REL-012: Check shutdown between operations to allow fast shutdown during startup
        tracing::debug!("Running initial cleanup on startup");
        if self.should_shutdown() {
            tracing::info!("Cleanup worker shutdown during startup");
            return;
        }
        self.cleanup_nonces().await;
        if self.should_shutdown() {
            tracing::info!("Cleanup worker shutdown during startup");
            return;
        }
        self.cleanup_idempotency().await;
        if self.should_shutdown() {
            tracing::info!("Cleanup worker shutdown during startup");
            return;
        }
        self.cleanup_expired_quotes().await;
        if self.should_shutdown() {
            tracing::info!("Cleanup worker shutdown during startup");
            return;
        }
        self.cleanup_credits_holds().await;
        // Note: payment archival is expensive, skip on startup
        tracing::debug!("Initial cleanup complete");

        loop {
            tokio::select! {
                _ = nonce_timer.tick() => {
                    self.cleanup_nonces().await;
                }
                _ = idempotency_timer.tick() => {
                    self.cleanup_idempotency().await;
                }
                _ = payment_timer.tick() => {
                    self.cleanup_payments().await;
                }
                _ = quote_timer.tick() => {
                    self.cleanup_expired_quotes().await;
                }
                _ = credits_hold_timer.tick() => {
                    self.cleanup_credits_holds().await;
                }
                _ = async {
                    if let Some(ref mut rx) = self.shutdown_rx {
                        let _ = rx.changed().await;
                    } else {
                        std::future::pending::<()>().await
                    }
                } => {
                    tracing::info!("Cleanup worker received shutdown signal");
                    break;
                }
            }
        }

        tracing::info!("Cleanup worker stopped");
    }

    /// Cleanup expired nonces
    async fn cleanup_nonces(&self) {
        match timeout(
            CLEANUP_OPERATION_TIMEOUT,
            self.store.cleanup_expired_nonces(),
        )
        .await
        {
            Ok(Ok(count)) if count > 0 => {
                tracing::debug!(count, "Cleaned up expired nonces");
            }
            Ok(Err(e)) => {
                tracing::error!(error = %e, "Failed to cleanup nonces");
            }
            Err(_) => {
                tracing::warn!(
                    timeout_secs = CLEANUP_OPERATION_TIMEOUT.as_secs(),
                    "Nonce cleanup timed out"
                );
            }
            _ => {}
        }
    }

    /// Cleanup expired idempotency keys
    async fn cleanup_idempotency(&self) {
        match timeout(
            CLEANUP_OPERATION_TIMEOUT,
            self.store.cleanup_expired_idempotency_keys(),
        )
        .await
        {
            Ok(Ok(count)) if count > 0 => {
                tracing::debug!(count, "Cleaned up expired idempotency keys");
            }
            Ok(Err(e)) => {
                tracing::error!(error = %e, "Failed to cleanup idempotency keys");
            }
            Err(_) => {
                tracing::warn!(
                    timeout_secs = CLEANUP_OPERATION_TIMEOUT.as_secs(),
                    "Idempotency key cleanup timed out"
                );
            }
            _ => {}
        }
    }

    /// Archive old payment records
    async fn cleanup_payments(&self) {
        if !self.archival_enabled {
            tracing::debug!("Payment archival disabled; skipping cleanup");
            return;
        }
        let retention = crate::storage::memory::to_chrono_duration(self.payment_retention_period);
        let cutoff = Utc::now() - retention;
        // Payment archival can be slower, use 60s timeout
        let payment_timeout = Duration::from_secs(60);
        match timeout(payment_timeout, self.store.archive_old_payments(cutoff)).await {
            Ok(Ok(count)) if count > 0 => {
                tracing::info!(count, "Archived old payment records");
            }
            Ok(Err(e)) => {
                tracing::error!(error = %e, "Failed to archive payments");
            }
            Err(_) => {
                tracing::warn!(
                    timeout_secs = payment_timeout.as_secs(),
                    "Payment archival timed out"
                );
            }
            _ => {}
        }
    }

    /// Cleanup expired cart and refund quotes per spec (11-background-workers.md)
    async fn cleanup_expired_quotes(&self) {
        // Cleanup expired cart quotes
        match timeout(
            CLEANUP_OPERATION_TIMEOUT,
            self.store.cleanup_expired_cart_quotes(),
        )
        .await
        {
            Ok(Ok(count)) if count > 0 => {
                tracing::debug!(count, "Cleaned up expired cart quotes");
            }
            Ok(Err(e)) => {
                tracing::error!(error = %e, "Failed to cleanup expired cart quotes");
            }
            Err(_) => {
                tracing::warn!(
                    timeout_secs = CLEANUP_OPERATION_TIMEOUT.as_secs(),
                    "Cart quote cleanup timed out"
                );
            }
            _ => {}
        }

        // Cleanup expired inventory reservations
        let now = Utc::now();
        match timeout(
            CLEANUP_OPERATION_TIMEOUT,
            self.store.cleanup_expired_inventory_reservations(now),
        )
        .await
        {
            Ok(Ok(count)) if count > 0 => {
                tracing::debug!(count, "Released expired inventory reservations");
            }
            Ok(Err(e)) => {
                tracing::error!(error = %e, "Failed to cleanup inventory reservations");
            }
            Err(_) => {
                tracing::warn!(
                    timeout_secs = CLEANUP_OPERATION_TIMEOUT.as_secs(),
                    "Inventory reservation cleanup timed out"
                );
            }
            _ => {}
        }

        // Cleanup expired refund quotes (only pending ones)
        match timeout(
            CLEANUP_OPERATION_TIMEOUT,
            self.store.cleanup_expired_refund_quotes(),
        )
        .await
        {
            Ok(Ok(count)) if count > 0 => {
                tracing::debug!(count, "Cleaned up expired refund quotes");
            }
            Ok(Err(e)) => {
                tracing::error!(error = %e, "Failed to cleanup expired refund quotes");
            }
            Err(_) => {
                tracing::warn!(
                    timeout_secs = CLEANUP_OPERATION_TIMEOUT.as_secs(),
                    "Refund quote cleanup timed out"
                );
            }
            _ => {}
        }
    }

    async fn cleanup_credits_holds(&self) {
        match timeout(
            CLEANUP_OPERATION_TIMEOUT,
            self.store.cleanup_expired_credits_holds(),
        )
        .await
        {
            Ok(Ok(count)) if count > 0 => {
                tracing::debug!(count, "Cleaned up expired credits holds");
            }
            Ok(Err(e)) => {
                tracing::error!(error = %e, "Failed to cleanup expired credits holds");
            }
            Err(_) => {
                tracing::warn!(
                    timeout_secs = CLEANUP_OPERATION_TIMEOUT.as_secs(),
                    "Credits hold cleanup timed out"
                );
            }
            _ => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration as ChronoDuration;
    use std::collections::HashMap;

    use crate::models::{get_asset, Money, PaymentTransaction};
    use crate::storage::CreditsHold;
    use crate::storage::InMemoryStore;

    #[tokio::test]
    async fn test_cleanup_payments_disabled_skips_archival() {
        let store = Arc::new(InMemoryStore::new());
        let asset = get_asset("USDC").expect("USDC asset registered");
        let payment = PaymentTransaction {
            signature: "sig-1".to_string(),
            tenant_id: "default".to_string(),
            resource_id: "res-1".to_string(),
            wallet: "wallet-1".to_string(),
            user_id: None,
            amount: Money { asset, atomic: 100 },
            created_at: Utc::now() - ChronoDuration::days(10),
            metadata: HashMap::new(),
        };

        store.record_payment(payment).await.expect("record payment");

        let worker = CleanupWorker::new(
            store.clone(),
            Duration::from_secs(86400),
            Duration::from_secs(86400),
            false,
        );
        worker.cleanup_payments().await;

        let stored = store
            .get_payment("default", "sig-1")
            .await
            .expect("get payment");
        assert!(stored.is_some());
    }

    #[tokio::test]
    async fn test_cleanup_payments_uses_retention_duration_and_interval() {
        let store = Arc::new(InMemoryStore::new());
        let asset = get_asset("USDC").expect("USDC asset registered");
        let old_payment = PaymentTransaction {
            signature: "sig-old".to_string(),
            tenant_id: "default".to_string(),
            resource_id: "res-old".to_string(),
            wallet: "wallet-old".to_string(),
            user_id: None,
            amount: Money {
                asset: asset.clone(),
                atomic: 100,
            },
            created_at: Utc::now() - ChronoDuration::hours(40),
            metadata: HashMap::new(),
        };
        let recent_payment = PaymentTransaction {
            signature: "sig-recent".to_string(),
            tenant_id: "default".to_string(),
            resource_id: "res-recent".to_string(),
            wallet: "wallet-recent".to_string(),
            user_id: None,
            amount: Money { asset, atomic: 100 },
            created_at: Utc::now() - ChronoDuration::hours(20),
            metadata: HashMap::new(),
        };

        store.record_payment(old_payment).await.expect("record old");
        store
            .record_payment(recent_payment)
            .await
            .expect("record recent");

        let retention = Duration::from_secs(36 * 3600);
        let interval = Duration::from_secs(2 * 3600);
        let worker = CleanupWorker::new(store.clone(), retention, interval, true);

        assert_eq!(worker.payment_retention_period, retention);
        assert_eq!(worker.payment_cleanup_interval, interval);

        worker.cleanup_payments().await;

        let old = store
            .get_payment("default", "sig-old")
            .await
            .expect("get old");
        let recent = store
            .get_payment("default", "sig-recent")
            .await
            .expect("get recent");
        assert!(old.is_none());
        assert!(recent.is_some());
    }

    #[tokio::test]
    async fn test_cleanup_expired_credits_holds_removes_old() {
        let store = Arc::new(InMemoryStore::new());

        store
            .store_credits_hold(CreditsHold {
                hold_id: "hold-expired".to_string(),
                tenant_id: "default".to_string(),
                user_id: "user-1".to_string(),
                resource_id: "product-1".to_string(),
                amount: 100,
                amount_asset: "USDC".to_string(),
                created_at: Utc::now() - ChronoDuration::minutes(10),
                expires_at: Utc::now() - ChronoDuration::minutes(1),
            })
            .await
            .unwrap();

        store
            .store_credits_hold(CreditsHold {
                hold_id: "hold-active".to_string(),
                tenant_id: "default".to_string(),
                user_id: "user-1".to_string(),
                resource_id: "product-1".to_string(),
                amount: 100,
                amount_asset: "USDC".to_string(),
                created_at: Utc::now(),
                expires_at: Utc::now() + ChronoDuration::minutes(10),
            })
            .await
            .unwrap();

        let worker = CleanupWorker::new(
            store.clone(),
            Duration::from_secs(86400),
            Duration::from_secs(86400),
            false,
        );

        worker.cleanup_credits_holds().await;

        assert!(store
            .get_credits_hold("default", "hold-expired")
            .await
            .unwrap()
            .is_none());
        assert!(store
            .get_credits_hold("default", "hold-active")
            .await
            .unwrap()
            .is_some());
    }
}
