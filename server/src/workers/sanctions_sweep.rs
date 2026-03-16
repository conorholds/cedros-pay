//! Background worker that periodically sweeps token holders against the
//! sanctions list and auto-freezes sanctioned accounts.

use std::sync::Arc;
use std::time::Duration;

use chrono::Utc;
use solana_sdk::pubkey::Pubkey;
use tokio::sync::watch;
use tokio::task::JoinHandle;

use crate::config::PostgresConfigRepository;
use crate::models::compliance::{ComplianceAction, SanctionsSweepSettings, TokenHolder};
use crate::services::sanctions_list::SanctionsListService;
use crate::services::token22::Token22Service;
use crate::storage::Store;

const SETTINGS_CATEGORY: &str = "compliance";
const SETTINGS_KEY: &str = "sanctions_sweep";

/// Handle for controlling the sanctions sweep worker.
pub struct SanctionsSweepWorkerHandle {
    shutdown_tx: watch::Sender<bool>,
    join_handle: Option<JoinHandle<()>>,
}

impl SanctionsSweepWorkerHandle {
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
}

/// Sanctions sweep worker — checks active token holders against sanctions list.
pub struct SanctionsSweepWorker<S: Store> {
    store: Arc<S>,
    token22: Arc<Token22Service>,
    config_repo: Option<Arc<PostgresConfigRepository>>,
    sanctions_service: Option<Arc<SanctionsListService>>,
    sweep_interval: Duration,
    shutdown_rx: watch::Receiver<bool>,
}

impl<S: Store + 'static> SanctionsSweepWorker<S> {
    /// Create worker + handle with shutdown capability.
    pub fn with_shutdown(
        store: Arc<S>,
        token22: Arc<Token22Service>,
        sweep_interval: Duration,
        config_repo: Option<Arc<PostgresConfigRepository>>,
        sanctions_service: Option<Arc<SanctionsListService>>,
    ) -> (Self, SanctionsSweepWorkerHandle) {
        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        let worker = Self {
            store,
            token22,
            config_repo,
            sanctions_service,
            sweep_interval,
            shutdown_rx,
        };
        let handle = SanctionsSweepWorkerHandle {
            shutdown_tx,
            join_handle: None,
        };
        (worker, handle)
    }

    fn should_shutdown(&self) -> bool {
        *self.shutdown_rx.borrow()
    }

    /// Load per-tenant sweep settings from the config DB, falling back to defaults.
    async fn load_tenant_settings(&self, tenant_id: &str) -> SanctionsSweepSettings {
        let repo = match &self.config_repo {
            Some(r) => r,
            None => return SanctionsSweepSettings::default(),
        };
        match repo.get_config(tenant_id, SETTINGS_CATEGORY).await {
            Ok(entries) => entries
                .iter()
                .find(|e| e.config_key == SETTINGS_KEY)
                .and_then(|e| serde_json::from_value(e.value.clone()).ok())
                .unwrap_or_default(),
            Err(e) => {
                tracing::warn!(
                    error = %e,
                    tenant_id = %tenant_id,
                    "Sanctions sweep: failed to load settings, using defaults"
                );
                SanctionsSweepSettings::default()
            }
        }
    }

    /// Main loop: sweep on interval with graceful shutdown.
    pub async fn run(mut self) {
        let mut timer = tokio::time::interval(self.sweep_interval);
        timer.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

        tracing::info!(
            interval_secs = self.sweep_interval.as_secs(),
            "Sanctions sweep worker started"
        );

        // Skip initial tick (don't sweep immediately on startup)
        timer.tick().await;

        loop {
            tokio::select! {
                _ = timer.tick() => {
                    if self.should_shutdown() { break; }
                    self.sweep_all_tenants().await;
                }
                _ = self.shutdown_rx.changed() => {
                    tracing::info!("Sanctions sweep worker received shutdown signal");
                    break;
                }
            }
        }

        tracing::info!("Sanctions sweep worker stopped");
    }

    async fn sweep_all_tenants(&self) {
        let tenants = match self.store.list_tenant_ids().await {
            Ok(t) => t,
            Err(e) => {
                tracing::error!(error = %e, "Sanctions sweep: failed to list tenants");
                return;
            }
        };

        for tenant_id in &tenants {
            if self.should_shutdown() {
                return;
            }
            self.sweep_tenant(tenant_id).await;
        }
    }

    async fn sweep_tenant(&self, tenant_id: &str) {
        let settings = self.load_tenant_settings(tenant_id).await;
        if !settings.enabled {
            tracing::debug!(tenant_id = %tenant_id, "Sanctions sweep disabled for tenant, skipping");
            return;
        }
        let batch_size = settings.batch_size.clamp(1, 10_000);

        let mut offset = 0;
        loop {
            if self.should_shutdown() {
                return;
            }

            let holders = match self
                .store
                .list_unfrozen_token_holders(tenant_id, batch_size, offset)
                .await
            {
                Ok(h) => h,
                Err(e) => {
                    tracing::error!(
                        error = %e,
                        tenant_id = %tenant_id,
                        "Sanctions sweep: failed to list holders"
                    );
                    return;
                }
            };

            if holders.is_empty() {
                break;
            }

            let batch_len = holders.len() as i32;
            for holder in holders {
                let is_hit = if let Some(ref svc) = self.sanctions_service {
                    svc.is_sanctioned(tenant_id, &holder.wallet_address)
                } else {
                    crate::services::sanctions::is_sanctioned(&holder.wallet_address)
                };
                if is_hit {
                    tracing::warn!(
                        tenant_id = %tenant_id,
                        wallet = %holder.wallet_address,
                        holder_id = %holder.id,
                        "Sanctions sweep: sanctioned wallet detected, freezing"
                    );
                    self.freeze_sanctioned_holder(&holder).await;
                }
            }

            if batch_len < batch_size {
                break;
            }
            offset += batch_len;
        }
    }

    async fn freeze_sanctioned_holder(&self, holder: &TokenHolder) {
        let mint_pubkey = match holder.mint_address.parse::<Pubkey>() {
            Ok(pk) => pk,
            Err(e) => {
                tracing::error!(
                    error = %e,
                    mint = %holder.mint_address,
                    "Sanctions sweep: invalid mint pubkey"
                );
                return;
            }
        };

        let owner_pubkey = match holder.wallet_address.parse::<Pubkey>() {
            Ok(pk) => pk,
            Err(e) => {
                tracing::error!(
                    error = %e,
                    wallet = %holder.wallet_address,
                    "Sanctions sweep: invalid wallet pubkey"
                );
                return;
            }
        };

        let sig: String = match crate::services::token22::freeze_account(
            &self.token22,
            &mint_pubkey,
            &owner_pubkey,
        )
        .await
        {
            Ok(sig) => {
                tracing::info!(
                    tenant_id = %holder.tenant_id,
                    wallet = %holder.wallet_address,
                    signature = %sig,
                    "Sanctions sweep: account frozen"
                );
                sig
            }
            Err(e) => {
                tracing::error!(
                    error = %e,
                    wallet = %holder.wallet_address,
                    "Sanctions sweep: freeze failed, skipping"
                );
                return;
            }
        };

        let now = Utc::now();
        if let Err(e) = self
            .store
            .update_token_holder_status(
                &holder.tenant_id,
                &holder.id,
                "frozen",
                Some(now),
                Some(sig.as_str()),
                None,
            )
            .await
        {
            tracing::error!(error = %e, "Sanctions sweep: failed to update holder status");
        }

        let action = ComplianceAction {
            id: uuid::Uuid::new_v4().to_string(),
            tenant_id: holder.tenant_id.clone(),
            action_type: "sweep_freeze".to_string(),
            wallet_address: holder.wallet_address.clone(),
            mint_address: holder.mint_address.clone(),
            holder_id: Some(holder.id.clone()),
            reason: "OFAC sanctions list match detected by automated sweep".to_string(),
            actor: "system:sweep".to_string(),
            tx_signature: Some(sig),
            report_reference: None,
            created_at: now,
        };
        if let Err(e) = self.store.record_compliance_action(action).await {
            tracing::error!(error = %e, "Sanctions sweep: failed to record compliance action");
        }
    }
}
