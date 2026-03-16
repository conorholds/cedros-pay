//! Background worker that periodically refreshes the dynamic sanctions list
//! for each tenant from the configured API (sunscreen.cedros.io).

use std::sync::Arc;
use std::time::Duration;

use tokio::sync::watch;
use tokio::task::JoinHandle;

use crate::config::PostgresConfigRepository;
use crate::models::compliance::SanctionsApiSettings;
use crate::services::sanctions_list::SanctionsListService;
use crate::storage::Store;

const SETTINGS_CATEGORY: &str = "compliance";
const SETTINGS_KEY: &str = "sanctions_api";

/// Handle for controlling the sanctions refresh worker.
pub struct SanctionsRefreshWorkerHandle {
    shutdown_tx: watch::Sender<bool>,
    join_handle: Option<JoinHandle<()>>,
}

impl SanctionsRefreshWorkerHandle {
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

/// Sanctions refresh worker — fetches dynamic sanctions lists per tenant.
pub struct SanctionsRefreshWorker<S: Store> {
    store: Arc<S>,
    sanctions_service: Arc<SanctionsListService>,
    config_repo: Option<Arc<PostgresConfigRepository>>,
    refresh_interval: Duration,
    shutdown_rx: watch::Receiver<bool>,
}

impl<S: Store + 'static> SanctionsRefreshWorker<S> {
    /// Create worker + handle with shutdown capability.
    pub fn with_shutdown(
        store: Arc<S>,
        sanctions_service: Arc<SanctionsListService>,
        refresh_interval: Duration,
        config_repo: Option<Arc<PostgresConfigRepository>>,
    ) -> (Self, SanctionsRefreshWorkerHandle) {
        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        let worker = Self {
            store,
            sanctions_service,
            config_repo,
            refresh_interval,
            shutdown_rx,
        };
        let handle = SanctionsRefreshWorkerHandle {
            shutdown_tx,
            join_handle: None,
        };
        (worker, handle)
    }

    fn should_shutdown(&self) -> bool {
        *self.shutdown_rx.borrow()
    }

    /// Load per-tenant sanctions API settings from the config DB.
    async fn load_tenant_settings(&self, tenant_id: &str) -> Option<SanctionsApiSettings> {
        let repo = self.config_repo.as_ref()?;
        match repo.get_config(tenant_id, SETTINGS_CATEGORY).await {
            Ok(entries) => entries
                .iter()
                .find(|e| e.config_key == SETTINGS_KEY)
                .and_then(|e| serde_json::from_value(e.value.clone()).ok()),
            Err(e) => {
                tracing::warn!(
                    error = %e,
                    tenant_id = %tenant_id,
                    "Sanctions refresh: failed to load settings"
                );
                None
            }
        }
    }

    /// Main loop: refresh on interval with graceful shutdown.
    pub async fn run(mut self) {
        let mut timer = tokio::time::interval(self.refresh_interval);
        timer.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);

        tracing::info!(
            interval_secs = self.refresh_interval.as_secs(),
            "Sanctions refresh worker started"
        );

        // Skip initial tick
        timer.tick().await;

        loop {
            tokio::select! {
                _ = timer.tick() => {
                    if self.should_shutdown() { break; }
                    self.refresh_all_tenants().await;
                }
                _ = self.shutdown_rx.changed() => {
                    tracing::info!("Sanctions refresh worker received shutdown signal");
                    break;
                }
            }
        }

        tracing::info!("Sanctions refresh worker stopped");
    }

    async fn refresh_all_tenants(&self) {
        let tenants = match self.store.list_tenant_ids().await {
            Ok(t) => t,
            Err(e) => {
                tracing::error!(error = %e, "Sanctions refresh: failed to list tenants");
                return;
            }
        };

        for tenant_id in &tenants {
            if self.should_shutdown() {
                return;
            }
            self.refresh_tenant(tenant_id).await;
        }
    }

    async fn refresh_tenant(&self, tenant_id: &str) {
        let settings = match self.load_tenant_settings(tenant_id).await {
            Some(s) if s.enabled && !s.api_url.is_empty() => s,
            _ => return, // Not configured or disabled
        };

        match self.sanctions_service.refresh(tenant_id, &settings).await {
            Ok(()) => {
                tracing::debug!(
                    tenant_id = %tenant_id,
                    "Sanctions list refreshed from API"
                );
            }
            Err(e) => {
                tracing::warn!(
                    error = %e,
                    tenant_id = %tenant_id,
                    "Sanctions refresh failed; static fallback remains active"
                );
            }
        }
    }
}
