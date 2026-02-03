use std::time::Duration;

/// Cache configuration for repositories.
#[derive(Debug, Clone)]
pub struct RepositoryCacheConfig {
    /// TTL for individual item lookups.
    pub item_ttl: Duration,
    /// TTL for list operations.
    pub list_ttl: Duration,
    /// Enable cache.
    pub enabled: bool,
    /// HIGH-005: Maximum cache entries to prevent unbounded memory growth.
    pub max_entries: usize,
}

/// Default maximum cache entries (1000 is reasonable for product/coupon caches).
const DEFAULT_MAX_CACHE_ENTRIES: usize = 1000;

impl Default for RepositoryCacheConfig {
    fn default() -> Self {
        Self {
            item_ttl: Duration::from_secs(300),
            list_ttl: Duration::from_secs(300),
            enabled: true,
            max_entries: DEFAULT_MAX_CACHE_ENTRIES,
        }
    }
}

impl RepositoryCacheConfig {
    /// Create config for products (5 minute TTL).
    pub fn for_products() -> Self {
        Self {
            item_ttl: Duration::from_secs(300),
            list_ttl: Duration::from_secs(300),
            enabled: true,
            max_entries: DEFAULT_MAX_CACHE_ENTRIES,
        }
    }

    /// Create config for coupons (1 minute TTL per spec).
    pub fn for_coupons() -> Self {
        Self {
            item_ttl: Duration::from_secs(60),
            list_ttl: Duration::from_secs(60),
            enabled: true,
            max_entries: DEFAULT_MAX_CACHE_ENTRIES,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_repository_cache_config_defaults() {
        let product_config = RepositoryCacheConfig::for_products();
        assert_eq!(product_config.item_ttl, Duration::from_secs(300));

        let coupon_config = RepositoryCacheConfig::for_coupons();
        assert_eq!(coupon_config.item_ttl, Duration::from_secs(60));
    }
}
