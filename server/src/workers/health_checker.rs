use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use chrono::{DateTime, TimeDelta, Utc};
use parking_lot::RwLock;
use serde::Serialize;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;
use tokio::sync::watch;
use tokio::task::JoinHandle;
use tokio::time::{sleep, timeout};

use crate::constants::HEALTH_CHECK_TIMEOUT;

/// Alert throttle duration per spec (11-background-workers.md)
const ALERT_THROTTLE_DURATION_HOURS: i64 = 24;

/// Wallet health status
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum WalletHealthStatus {
    Healthy,
    Low,
    Critical,
}

impl WalletHealthStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            WalletHealthStatus::Healthy => "healthy",
            WalletHealthStatus::Low => "low",
            WalletHealthStatus::Critical => "critical",
        }
    }

    /// Check if wallet is usable for gasless transactions
    /// Per spec (11-background-workers.md): healthy or low balance wallets can still be used
    pub fn is_usable(&self) -> bool {
        match self {
            WalletHealthStatus::Healthy => true,
            WalletHealthStatus::Low => true,
            WalletHealthStatus::Critical => false,
        }
    }
}

/// Wallet health info
#[derive(Debug, Clone)]
pub struct WalletHealth {
    pub public_key: String,
    pub balance: f64,
    pub status: WalletHealthStatus,
    pub last_checked: DateTime<Utc>,
}

/// Low balance alert payload per spec (11-background-workers.md)
#[derive(Debug, Clone, Serialize)]
pub struct LowBalanceAlert {
    pub wallet: String,
    pub balance: f64,
    pub threshold: f64,
    pub timestamp: DateTime<Utc>,
}

/// Alert callback type
pub type AlertCallback = Box<dyn Fn(LowBalanceAlert) + Send + Sync>;

/// Handle for controlling the health checker
///
/// REL-006: Includes JoinHandle for awaiting task completion after shutdown.
pub struct HealthCheckerHandle {
    shutdown_tx: watch::Sender<bool>,
    join_handle: Option<JoinHandle<()>>,
}

impl HealthCheckerHandle {
    /// Signal the health checker to shut down gracefully
    pub fn shutdown(&self) {
        let _ = self.shutdown_tx.send(true);
    }

    /// Attach a JoinHandle to await task completion
    pub fn with_join_handle(mut self, join_handle: JoinHandle<()>) -> Self {
        self.join_handle = Some(join_handle);
        self
    }

    /// Wait for the health checker task to complete
    pub async fn wait(mut self) {
        if let Some(handle) = self.join_handle.take() {
            let _ = handle.await;
        }
    }

    /// Shutdown and wait for the health checker task to complete
    pub async fn shutdown_and_wait(self) {
        self.shutdown();
        self.wait().await;
    }
}

/// Health checker for RPC and wallet balances
pub struct HealthChecker {
    rpc_client: Arc<RpcClient>,
    wallets: Vec<String>,
    health: Arc<RwLock<HealthState>>,
    low_balance_threshold: f64,
    critical_balance_threshold: f64,
    /// Last alert timestamps per wallet for throttling (one alert per wallet per 24h)
    last_alerts: Arc<RwLock<HashMap<String, DateTime<Utc>>>>,
    /// Optional alert callback
    alert_callback: Option<Arc<AlertCallback>>,
    /// Shutdown receiver for graceful shutdown
    shutdown_rx: Option<watch::Receiver<bool>>,
    /// Round-robin counter for healthy wallet selection per spec (11-background-workers.md)
    round_robin_index: Arc<AtomicU64>,
}

#[derive(Debug, Default)]
pub struct HealthState {
    pub rpc_healthy: bool,
    pub rpc_last_checked: Option<DateTime<Utc>>,
    pub wallets: HashMap<String, WalletHealth>,
}

impl HealthChecker {
    pub fn new(rpc_url: &str, wallets: Vec<String>) -> Self {
        Self {
            rpc_client: Arc::new(RpcClient::new(rpc_url.to_string())),
            wallets,
            health: Arc::new(RwLock::new(HealthState::default())),
            // Per spec (11-background-workers.md): MinHealthyBalance = 0.005 SOL, default threshold = 0.01 SOL
            low_balance_threshold: 0.01,
            // Per spec (11-background-workers.md): CriticalBalance = 0.001 SOL
            critical_balance_threshold: 0.001,
            last_alerts: Arc::new(RwLock::new(HashMap::new())),
            alert_callback: None,
            shutdown_rx: None,
            round_robin_index: Arc::new(AtomicU64::new(0)),
        }
    }

    /// Create a health checker with shutdown capability
    pub fn with_shutdown(rpc_url: &str, wallets: Vec<String>) -> (Self, HealthCheckerHandle) {
        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        let checker = Self {
            rpc_client: Arc::new(RpcClient::new(rpc_url.to_string())),
            wallets,
            health: Arc::new(RwLock::new(HealthState::default())),
            low_balance_threshold: 0.01,
            critical_balance_threshold: 0.001,
            last_alerts: Arc::new(RwLock::new(HashMap::new())),
            alert_callback: None,
            shutdown_rx: Some(shutdown_rx),
            round_robin_index: Arc::new(AtomicU64::new(0)),
        };
        let handle = HealthCheckerHandle {
            shutdown_tx,
            join_handle: None,
        };
        (checker, handle)
    }

    pub fn with_thresholds(mut self, low: f64, critical: f64) -> Self {
        self.low_balance_threshold = low;
        self.critical_balance_threshold = critical;
        self
    }

    /// Convert to Arc and extract shutdown receiver for external handling.
    /// Returns (Arc<Self>, shutdown_receiver) so the checker can be shared
    /// while still supporting graceful shutdown.
    pub fn into_arc_with_shutdown(mut self) -> (Arc<Self>, Option<watch::Receiver<bool>>) {
        let shutdown_rx = self.shutdown_rx.take();
        (Arc::new(self), shutdown_rx)
    }

    /// Set critical balance alert callback per spec (11-background-workers.md)
    pub fn with_alert_callback(mut self, callback: AlertCallback) -> Self {
        self.alert_callback = Some(Arc::new(callback));
        self
    }

    /// Atomically check if an alert should be sent and record it if so.
    /// Returns true if the alert should be sent (and records it), false if throttled.
    /// This prevents TOCTOU race conditions where multiple threads could send duplicate alerts.
    fn try_claim_alert(&self, wallet: &str) -> bool {
        let now = Utc::now();
        let mut last_alerts = self.last_alerts.write();

        if let Some(last_alert) = last_alerts.get(wallet) {
            let throttle = TimeDelta::try_hours(ALERT_THROTTLE_DURATION_HOURS)
                .unwrap_or_else(|| TimeDelta::hours(24));
            if now - *last_alert < throttle {
                return false; // Alert already sent within throttle window
            }
        }

        // Atomically record that we're claiming this alert
        last_alerts.insert(wallet.to_string(), now);
        true
    }

    /// Send low balance alert if not throttled
    fn maybe_send_alert(&self, wallet: &str, balance: f64, threshold: f64) {
        // Atomically check and claim the alert to prevent duplicate sends
        if !self.try_claim_alert(wallet) {
            tracing::debug!(
                wallet = %wallet,
                "Alert throttled (already sent within 24h)"
            );
            return;
        }

        let alert = LowBalanceAlert {
            wallet: wallet.to_string(),
            balance,
            threshold,
            timestamp: Utc::now(),
        };

        // Log the alert
        tracing::warn!(
            wallet = %wallet,
            balance = %balance,
            threshold = %threshold,
            "Low balance alert"
        );

        // Call the callback if configured
        if let Some(callback) = &self.alert_callback {
            callback(alert);
        }
    }

    /// Get current health state
    pub fn get_health(&self) -> HealthState {
        self.health.read().clone()
    }

    /// Check if RPC is healthy
    pub fn is_rpc_healthy(&self) -> bool {
        self.health.read().rpc_healthy
    }

    /// Get wallet health summary
    pub fn get_wallet_summary(&self) -> (u32, u32, u32) {
        let health = self.health.read();
        let mut healthy = 0u32;
        let mut low = 0u32;
        let mut critical = 0u32;

        for w in health.wallets.values() {
            match w.status {
                WalletHealthStatus::Healthy => healthy += 1,
                WalletHealthStatus::Low => low += 1,
                WalletHealthStatus::Critical => critical += 1,
            }
        }

        (healthy, low, critical)
    }

    /// Get a healthy wallet using round-robin selection per spec (11-background-workers.md)
    ///
    /// Algorithm:
    /// - Atomic increment of round-robin index
    /// - For each wallet starting from index, return first healthy wallet
    /// - Returns None if no healthy wallets available
    pub fn get_healthy_wallet(&self) -> Option<String> {
        let wallet_count = self.wallets.len();
        if wallet_count == 0 {
            return None;
        }

        // Atomic increment for round-robin selection
        let index = self.round_robin_index.fetch_add(1, Ordering::SeqCst);
        let health = self.health.read();

        // Try each wallet starting from the round-robin index
        for offset in 0..wallet_count {
            let idx = ((index as usize) + offset) % wallet_count;
            let wallet = &self.wallets[idx];

            // Check if this wallet is healthy
            if let Some(wallet_health) = health.wallets.get(wallet) {
                if wallet_health.status == WalletHealthStatus::Healthy {
                    return Some(wallet.clone());
                }
            }
        }

        // No healthy wallets found
        None
    }

    /// Run the health check loop with graceful shutdown support
    pub async fn run(mut self, interval: Duration) {
        tracing::info!(
            "Health checker started with interval={}s",
            interval.as_secs()
        );

        loop {
            // Check for shutdown signal
            if let Some(ref mut rx) = self.shutdown_rx {
                if *rx.borrow() {
                    tracing::info!("Health checker received shutdown signal");
                    break;
                }
            }

            tokio::select! {
                _ = sleep(interval) => {
                    self.check_rpc().await;
                    self.check_wallets().await;
                }
                _ = async {
                    if let Some(ref mut rx) = self.shutdown_rx {
                        let _ = rx.changed().await;
                    } else {
                        // No shutdown channel, wait forever
                        std::future::pending::<()>().await
                    }
                } => {
                    tracing::info!("Health checker received shutdown signal");
                    break;
                }
            }
        }

        tracing::info!("Health checker stopped");
    }

    /// Run the health check loop from an Arc reference with external shutdown receiver.
    /// Use this when you need to share the HealthChecker with other components.
    pub async fn run_arc(
        checker: Arc<Self>,
        mut shutdown_rx: Option<watch::Receiver<bool>>,
        interval: Duration,
    ) {
        tracing::info!(
            "Health checker started with interval={}s",
            interval.as_secs()
        );

        loop {
            // Check for shutdown signal
            if let Some(ref rx) = shutdown_rx {
                if *rx.borrow() {
                    tracing::info!("Health checker received shutdown signal");
                    break;
                }
            }

            tokio::select! {
                _ = sleep(interval) => {
                    checker.check_rpc().await;
                    checker.check_wallets().await;
                }
                _ = async {
                    if let Some(ref mut rx) = shutdown_rx {
                        let _ = rx.changed().await;
                    } else {
                        // No shutdown channel, wait forever
                        std::future::pending::<()>().await
                    }
                } => {
                    tracing::info!("Health checker received shutdown signal");
                    break;
                }
            }
        }

        tracing::info!("Health checker stopped");
    }

    /// Run the health check loop (legacy method without ownership transfer or shutdown)
    /// OPS-09: Deprecated — use `run_arc` with shutdown channel instead
    #[deprecated(note = "Use run_arc with shutdown channel for graceful shutdown")]
    pub async fn run_ref(&self, interval: Duration) {
        loop {
            self.check_rpc().await;
            self.check_wallets().await;
            sleep(interval).await;
        }
    }

    /// Check RPC health with timeout to prevent hanging
    async fn check_rpc(&self) {
        let healthy = match timeout(HEALTH_CHECK_TIMEOUT, self.rpc_client.get_health()).await {
            Ok(result) => result.is_ok(),
            Err(_) => {
                tracing::warn!(
                    "RPC health check timed out after {:?}",
                    HEALTH_CHECK_TIMEOUT
                );
                false
            }
        };
        let mut state = self.health.write();
        state.rpc_healthy = healthy;
        state.rpc_last_checked = Some(Utc::now());

        if !healthy {
            tracing::warn!("RPC health check failed");
        }
    }

    /// Check wallet balances with timeout to prevent hanging
    async fn check_wallets(&self) {
        let now = Utc::now();

        for wallet in &self.wallets {
            let pubkey = match Pubkey::from_str(wallet) {
                Ok(pk) => pk,
                Err(_) => continue,
            };

            let balance =
                match timeout(HEALTH_CHECK_TIMEOUT, self.rpc_client.get_balance(&pubkey)).await {
                    Ok(Ok(lamports)) => lamports as f64 / 1_000_000_000.0,
                    Ok(Err(e)) => {
                        tracing::warn!(wallet, error = %e, "Failed to get wallet balance");
                        continue;
                    }
                    Err(_) => {
                        tracing::warn!(
                            wallet,
                            "Wallet balance check timed out after {:?}",
                            HEALTH_CHECK_TIMEOUT
                        );
                        continue;
                    }
                };

            let status = if balance < self.critical_balance_threshold {
                WalletHealthStatus::Critical
            } else if balance < self.low_balance_threshold {
                WalletHealthStatus::Low
            } else {
                WalletHealthStatus::Healthy
            };

            let health = WalletHealth {
                public_key: wallet.clone(),
                balance,
                status,
                last_checked: now,
            };

            // Send throttled alerts for low/critical balances
            match status {
                WalletHealthStatus::Critical => {
                    tracing::error!(
                        wallet = %wallet,
                        balance = %balance,
                        "Critical wallet balance"
                    );
                    // Send throttled alert
                    self.maybe_send_alert(wallet, balance, self.critical_balance_threshold);
                }
                WalletHealthStatus::Low => {
                    tracing::warn!(
                        wallet = %wallet,
                        balance = %balance,
                        "Low wallet balance"
                    );
                    // Send throttled alert
                    self.maybe_send_alert(wallet, balance, self.low_balance_threshold);
                }
                WalletHealthStatus::Healthy => {}
            }

            // Per spec (21-observability.md): Record wallet balance metric for Prometheus
            crate::observability::record_solana_wallet_balance(wallet, balance);

            self.health.write().wallets.insert(wallet.clone(), health);
        }
    }

    /// Clear alert throttle for a specific wallet (for testing)
    #[cfg(test)]
    pub fn clear_alert_throttle(&self, wallet: &str) {
        self.last_alerts.write().remove(wallet);
    }
}

impl Clone for HealthState {
    fn clone(&self) -> Self {
        Self {
            rpc_healthy: self.rpc_healthy,
            rpc_last_checked: self.rpc_last_checked,
            wallets: self.wallets.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_health_checker_handle_shutdown_waits_for_join() {
        let (_checker, handle) = HealthChecker::with_shutdown("http://localhost:8899", Vec::new());
        let join = tokio::spawn(async {
            tokio::time::sleep(Duration::from_millis(10)).await;
        });
        let handle = handle.with_join_handle(join);
        handle.shutdown_and_wait().await;
    }
}
