//! Dynamic sanctions list service.
//!
//! Maintains a per-tenant cache of sanctioned wallet addresses and blocked
//! jurisdictions. Falls back to the static list in `sanctions.rs` on cache miss.

use std::collections::HashSet;
use std::time::Duration;

use crate::models::compliance::{SanctionsApiSettings, SanctionsListResponse};
use crate::ttl_cache::TtlCache;

/// Cached sanctions data for one tenant.
#[derive(Clone)]
pub struct SanctionsList {
    pub addresses: HashSet<String>,
    pub countries: HashSet<String>,
}

/// Service that provides dynamic, per-tenant sanctions lookups with
/// LRU+TTL caching and static fallback.
pub struct SanctionsListService {
    cache: TtlCache<SanctionsList>,
    client: reqwest::Client,
    default_ttl: Duration,
}

impl SanctionsListService {
    /// Create a new service with the given cache capacity.
    pub fn new(max_tenants: usize, default_ttl: Duration) -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("reqwest client");
        Self {
            cache: TtlCache::new(max_tenants),
            client,
            default_ttl,
        }
    }

    /// Check if a wallet is sanctioned for this tenant.
    ///
    /// Returns the dynamic list result on cache hit, falls back to the
    /// static `sanctions::is_sanctioned()` on miss.
    pub fn is_sanctioned(&self, tenant_id: &str, wallet: &str) -> bool {
        if let Some(list) = self.cache.get(tenant_id) {
            return list.addresses.contains(wallet);
        }
        // Fallback to static list when no dynamic data is cached
        crate::services::sanctions::is_sanctioned(wallet)
    }

    /// Check if a country code is blocked for this tenant.
    pub fn is_blocked_jurisdiction(&self, tenant_id: &str, country_code: &str) -> bool {
        if let Some(list) = self.cache.get(tenant_id) {
            let upper = country_code.to_uppercase();
            return list.countries.contains(&upper);
        }
        crate::services::sanctions::is_blocked_jurisdiction(country_code)
    }

    /// Fetch the latest sanctions list from the API and update the cache.
    pub async fn refresh(
        &self,
        tenant_id: &str,
        settings: &SanctionsApiSettings,
    ) -> Result<(), SanctionsRefreshError> {
        let url = format!("{}/v1/lists", settings.api_url.trim_end_matches('/'));

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| SanctionsRefreshError::Http(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown".to_string());
            return Err(SanctionsRefreshError::Http(format!(
                "API returned {}: {}",
                status, text
            )));
        }

        let body: SanctionsListResponse = response
            .json()
            .await
            .map_err(|e| SanctionsRefreshError::Parse(e.to_string()))?;

        let list = SanctionsList {
            addresses: body.addresses.into_iter().collect(),
            countries: body
                .countries
                .into_iter()
                .map(|c| c.to_uppercase())
                .collect(),
        };

        let ttl = Duration::from_secs(settings.refresh_interval_secs.max(60));
        self.cache.set(tenant_id.to_string(), list, ttl);

        Ok(())
    }

    /// Invalidate a tenant's cached list (e.g., after admin force-refresh).
    pub fn invalidate(&self, tenant_id: &str) {
        self.cache.invalidate(tenant_id);
    }

    /// Get the default TTL.
    pub fn default_ttl(&self) -> Duration {
        self.default_ttl
    }
}

impl std::fmt::Debug for SanctionsListService {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SanctionsListService")
            .field("default_ttl", &self.default_ttl)
            .finish()
    }
}

#[derive(Debug, thiserror::Error)]
pub enum SanctionsRefreshError {
    #[error("HTTP error: {0}")]
    Http(String),
    #[error("Parse error: {0}")]
    Parse(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fallback_to_static_on_cache_miss() {
        let svc = SanctionsListService::new(10, Duration::from_secs(3600));
        // Known static sanctioned wallet
        assert!(svc.is_sanctioned(
            "test-tenant",
            "FW3g7yRSFCVPJsiBaKFbuiCfGHPPCKqBjP2rMXkmCjBr"
        ));
        assert!(!svc.is_sanctioned("test-tenant", "clean-wallet"));
    }

    #[test]
    fn cached_list_overrides_static() {
        let svc = SanctionsListService::new(10, Duration::from_secs(3600));

        let mut addresses = HashSet::new();
        addresses.insert("BadWallet123".to_string());
        let countries = HashSet::new();

        svc.cache.set(
            "t1".to_string(),
            SanctionsList {
                addresses,
                countries,
            },
            Duration::from_secs(60),
        );

        assert!(svc.is_sanctioned("t1", "BadWallet123"));
        // Static wallet is NOT in the dynamic list, so dynamic returns false
        assert!(!svc.is_sanctioned(
            "t1",
            "FW3g7yRSFCVPJsiBaKFbuiCfGHPPCKqBjP2rMXkmCjBr"
        ));
    }

    #[test]
    fn jurisdiction_fallback() {
        let svc = SanctionsListService::new(10, Duration::from_secs(3600));
        assert!(svc.is_blocked_jurisdiction("no-tenant", "KP"));
        assert!(!svc.is_blocked_jurisdiction("no-tenant", "US"));
    }

    #[test]
    fn jurisdiction_cached() {
        let svc = SanctionsListService::new(10, Duration::from_secs(3600));

        let mut countries = HashSet::new();
        countries.insert("XX".to_string());
        let addresses = HashSet::new();

        svc.cache.set(
            "t1".to_string(),
            SanctionsList {
                addresses,
                countries,
            },
            Duration::from_secs(60),
        );

        assert!(svc.is_blocked_jurisdiction("t1", "xx")); // case-insensitive
        assert!(!svc.is_blocked_jurisdiction("t1", "KP")); // not in dynamic list
    }
}
