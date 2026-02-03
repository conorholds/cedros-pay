use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use parking_lot::RwLock;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::native_token::LAMPORTS_PER_SOL;
use solana_sdk::pubkey::Pubkey;
use tracing::{debug, error, info, warn};

use crate::constants::{CRITICAL_BALANCE, MIN_HEALTHY_BALANCE};

/// Wallet health status
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WalletStatus {
    Healthy,
    Low,
    Critical,
    Unknown,
}

impl WalletStatus {
    pub fn is_usable(&self) -> bool {
        matches!(self, WalletStatus::Healthy | WalletStatus::Low)
    }
}

/// Health info for a single wallet
#[derive(Debug, Clone)]
pub struct WalletHealth {
    pub pubkey: Pubkey,
    pub sol_balance: f64,
    pub status: WalletStatus,
    pub last_checked: std::time::Instant,
}

impl WalletHealth {
    pub fn new(pubkey: Pubkey) -> Self {
        Self {
            pubkey,
            sol_balance: 0.0,
            status: WalletStatus::Unknown,
            last_checked: std::time::Instant::now(),
        }
    }

    pub fn update(&mut self, lamports: u64) {
        self.sol_balance = lamports as f64 / LAMPORTS_PER_SOL as f64;
        self.status = if self.sol_balance >= MIN_HEALTHY_BALANCE {
            WalletStatus::Healthy
        } else if self.sol_balance >= CRITICAL_BALANCE {
            WalletStatus::Low
        } else {
            WalletStatus::Critical
        };
        self.last_checked = std::time::Instant::now();
    }
}

/// Monitor and manage server wallet health
pub struct WalletHealthChecker {
    rpc_client: Arc<RpcClient>,
    wallets: RwLock<HashMap<String, WalletHealth>>,
    wallet_pubkeys: Vec<Pubkey>,
    check_count: AtomicU64,
    low_balance_alert_sent: RwLock<HashMap<String, std::time::Instant>>,
}

impl WalletHealthChecker {
    pub fn new(rpc_client: Arc<RpcClient>, wallets: Vec<Pubkey>) -> Self {
        let mut health_map = HashMap::new();
        for pk in &wallets {
            health_map.insert(pk.to_string(), WalletHealth::new(*pk));
        }

        Self {
            rpc_client,
            wallets: RwLock::new(health_map),
            wallet_pubkeys: wallets,
            check_count: AtomicU64::new(0),
            low_balance_alert_sent: RwLock::new(HashMap::new()),
        }
    }

    /// Run a single health check cycle
    pub async fn check_health(&self) -> Vec<WalletHealth> {
        let mut results = Vec::new();

        for pubkey in &self.wallet_pubkeys {
            match self.rpc_client.get_balance(pubkey).await {
                Ok(lamports) => {
                    let mut wallets = self.wallets.write();
                    if let Some(health) = wallets.get_mut(&pubkey.to_string()) {
                        health.update(lamports);
                        results.push(health.clone());

                        // Log warnings for low/critical balances
                        match health.status {
                            WalletStatus::Critical => {
                                error!(
                                    wallet = %pubkey,
                                    balance = %health.sol_balance,
                                    "Wallet SOL balance is CRITICAL"
                                );
                            }
                            WalletStatus::Low => {
                                warn!(
                                    wallet = %pubkey,
                                    balance = %health.sol_balance,
                                    "Wallet SOL balance is low"
                                );
                            }
                            _ => {
                                debug!(
                                    wallet = %pubkey,
                                    balance = %health.sol_balance,
                                    "Wallet health check OK"
                                );
                            }
                        }
                    }
                }
                Err(e) => {
                    warn!(wallet = %pubkey, error = %e, "Failed to check wallet balance");
                    let mut wallets = self.wallets.write();
                    if let Some(health) = wallets.get_mut(&pubkey.to_string()) {
                        health.status = WalletStatus::Unknown;
                        health.last_checked = std::time::Instant::now();
                        results.push(health.clone());
                    }
                }
            }
        }

        self.check_count.fetch_add(1, Ordering::Relaxed);
        results
    }

    /// Get health status for a specific wallet
    pub fn get_wallet_health(&self, pubkey: &Pubkey) -> Option<WalletHealth> {
        self.wallets.read().get(&pubkey.to_string()).cloned()
    }

    /// Get all wallet health statuses
    pub fn get_all_health(&self) -> Vec<WalletHealth> {
        self.wallets.read().values().cloned().collect()
    }

    /// Get the healthiest wallet (highest balance)
    pub fn get_healthiest_wallet(&self) -> Option<Pubkey> {
        let wallets = self.wallets.read();
        wallets
            .values()
            .filter(|h| h.status.is_usable())
            // Use total_cmp which handles NaN safely (treats NaN as less than any value)
            .max_by(|a, b| a.sol_balance.total_cmp(&b.sol_balance))
            .map(|h| h.pubkey)
    }

    /// Get any healthy wallet
    pub fn get_any_healthy_wallet(&self) -> Option<Pubkey> {
        let wallets = self.wallets.read();
        wallets
            .values()
            .find(|h| h.status == WalletStatus::Healthy)
            .map(|h| h.pubkey)
    }

    /// Check if any wallet is usable
    pub fn has_usable_wallet(&self) -> bool {
        self.wallets.read().values().any(|h| h.status.is_usable())
    }

    /// Get total check count
    pub fn check_count(&self) -> u64 {
        self.check_count.load(Ordering::Relaxed)
    }

    /// Get wallets needing alert
    ///
    /// Takes snapshots of each lock separately to avoid holding both simultaneously,
    /// which prevents lock ordering issues and reduces contention.
    pub fn get_wallets_needing_alert(&self) -> Vec<WalletHealth> {
        let alert_cooldown = Duration::from_secs(3600); // 1 hour cooldown

        // Take snapshot of low/critical wallets first, release lock immediately
        let candidates: Vec<WalletHealth> = {
            let wallets = self.wallets.read();
            wallets
                .values()
                .filter(|h| matches!(h.status, WalletStatus::Critical | WalletStatus::Low))
                .cloned()
                .collect()
        };

        // Now check alerts with separate lock
        let alerts = self.low_balance_alert_sent.read();
        candidates
            .into_iter()
            .filter(|h| {
                alerts
                    .get(&h.pubkey.to_string())
                    .map(|t| t.elapsed() > alert_cooldown)
                    .unwrap_or(true)
            })
            .collect()
    }

    /// Mark alert as sent for a wallet
    pub fn mark_alert_sent(&self, pubkey: &Pubkey) {
        self.low_balance_alert_sent
            .write()
            .insert(pubkey.to_string(), std::time::Instant::now());
    }

    /// Start background health check task
    pub fn start_background_checker(self: Arc<Self>, interval: Duration) {
        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(interval);

            loop {
                ticker.tick().await;
                let results = self.check_health().await;

                let healthy = results
                    .iter()
                    .filter(|h| h.status == WalletStatus::Healthy)
                    .count();
                let low = results
                    .iter()
                    .filter(|h| h.status == WalletStatus::Low)
                    .count();
                let critical = results
                    .iter()
                    .filter(|h| h.status == WalletStatus::Critical)
                    .count();

                if critical > 0 {
                    error!(
                        healthy,
                        low, critical, "Wallet health check completed - CRITICAL wallets detected"
                    );
                } else if low > 0 {
                    warn!(
                        healthy,
                        low, critical, "Wallet health check completed - low balance wallets"
                    );
                } else {
                    info!(healthy, low, critical, "Wallet health check completed");
                }
            }
        });
    }
}

impl std::fmt::Debug for WalletHealthChecker {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("WalletHealthChecker")
            .field("wallet_count", &self.wallet_pubkeys.len())
            .field("check_count", &self.check_count.load(Ordering::Relaxed))
            .finish()
    }
}
