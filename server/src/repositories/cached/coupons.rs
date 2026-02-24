use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;

use crate::models::{Coupon, PaymentMethod};
use crate::repositories::{CouponRepository, CouponRepositoryError};
use crate::ttl_cache::TtlCache;

use super::RepositoryCacheConfig;

/// Cached wrapper for CouponRepository.
pub struct CachedCouponRepository<R: CouponRepository> {
    inner: Arc<R>,
    config: RepositoryCacheConfig,
    coupon_cache: TtlCache<Coupon>,
    list_cache: TtlCache<Vec<Coupon>>,
    auto_apply_cache: TtlCache<Vec<Coupon>>,
    all_auto_apply_cache: TtlCache<HashMap<String, Vec<Coupon>>>,
}

impl<R: CouponRepository> CachedCouponRepository<R> {
    /// Create a new cached coupon repository.
    ///
    /// Uses LRU (Least Recently Used) eviction policy automatically when
    /// the cache reaches capacity (L-004 fix).
    pub fn new(inner: Arc<R>, config: RepositoryCacheConfig) -> Self {
        let max_entries = config.max_entries;
        Self {
            inner,
            config,
            coupon_cache: TtlCache::new(max_entries),
            list_cache: TtlCache::new(max_entries),
            auto_apply_cache: TtlCache::new(max_entries),
            all_auto_apply_cache: TtlCache::new(max_entries),
        }
    }

    /// Create with default configuration (1 minute TTL for coupons).
    pub fn with_defaults(inner: Arc<R>) -> Self {
        Self::new(inner, RepositoryCacheConfig::for_coupons())
    }

    /// Clear all caches.
    ///
    /// # PERF-002 Note
    /// This clears caches for ALL tenants, not just the affected tenant.
    /// This is a known limitation for simplicity. A tenant-scoped invalidation
    /// would require a different cache structure (tenant -> HashMap).
    /// The impact is limited: caches are small (default 100 entries), and
    /// TTL is short (1 minute for coupons), so full clears are infrequent
    /// and recover quickly.
    pub fn clear_all(&self) {
        self.coupon_cache.clear();
        self.list_cache.clear();
        self.auto_apply_cache.clear();
        self.all_auto_apply_cache.clear();
    }

    /// Clear list-related caches (when usage counts change).
    /// This is more targeted than clear_all() - it invalidates caches that contain
    /// aggregated coupon data but preserves individual coupon cache entries.
    fn invalidate_tenant_list_caches(&self, tenant_id: &str) {
        self.list_cache.invalidate(&Self::list_key(tenant_id));
        self.auto_apply_cache
            .invalidate_prefix(&format!("{}:", tenant_id));
        self.auto_apply_cache
            .invalidate_prefix(&format!("checkout_auto_apply:{}:", tenant_id));
        self.all_auto_apply_cache
            .invalidate(&Self::all_auto_apply_key(tenant_id, &PaymentMethod::Stripe));
        self.all_auto_apply_cache
            .invalidate(&Self::all_auto_apply_key(tenant_id, &PaymentMethod::X402));
        self.all_auto_apply_cache
            .invalidate(&Self::all_auto_apply_key(
                tenant_id,
                &PaymentMethod::Credits,
            ));
    }

    /// Get the inner repository.
    pub fn inner(&self) -> &Arc<R> {
        &self.inner
    }

    fn coupon_key(tenant_id: &str, code: &str) -> String {
        format!("{}:{}", tenant_id, code.to_uppercase())
    }

    fn list_key(tenant_id: &str) -> String {
        format!("list:{}", tenant_id)
    }

    fn auto_apply_key(tenant_id: &str, product_id: &str, payment_method: &PaymentMethod) -> String {
        let pm = match payment_method {
            PaymentMethod::Stripe => "stripe",
            PaymentMethod::X402 => "x402",
            PaymentMethod::Credits => "credits",
        };
        format!("{}:{}:{}", tenant_id, product_id, pm)
    }

    fn all_auto_apply_key(tenant_id: &str, payment_method: &PaymentMethod) -> String {
        match payment_method {
            PaymentMethod::Stripe => format!("{}:stripe", tenant_id),
            PaymentMethod::X402 => format!("{}:x402", tenant_id),
            PaymentMethod::Credits => format!("{}:credits", tenant_id),
        }
    }
}

#[async_trait]
impl<R: CouponRepository + 'static> CouponRepository for CachedCouponRepository<R> {
    async fn get_coupon(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> Result<Coupon, CouponRepositoryError> {
        let key = Self::coupon_key(tenant_id, code);

        if self.config.enabled {
            if let Some(cached) = self.coupon_cache.get(&key) {
                return Ok(cached);
            }
        }

        let result = self.inner.get_coupon(tenant_id, code).await?;

        if self.config.enabled {
            self.coupon_cache
                .set(key, result.clone(), self.config.item_ttl);
        }

        Ok(result)
    }

    async fn list_coupons(&self, tenant_id: &str) -> Result<Vec<Coupon>, CouponRepositoryError> {
        let list_key = Self::list_key(tenant_id);
        if self.config.enabled {
            if let Some(cached) = self.list_cache.get(&list_key) {
                return Ok(cached);
            }
        }

        let result = self.inner.list_coupons(tenant_id).await?;

        if self.config.enabled {
            self.list_cache
                .set(list_key, result.clone(), self.config.list_ttl);

            // Also cache individual coupons.
            for coupon in &result {
                self.coupon_cache.set(
                    Self::coupon_key(tenant_id, &coupon.code),
                    coupon.clone(),
                    self.config.item_ttl,
                );
            }
        }

        Ok(result)
    }

    async fn get_auto_apply_coupons_for_payment(
        &self,
        tenant_id: &str,
        product_id: &str,
        payment_method: &PaymentMethod,
    ) -> Result<Vec<Coupon>, CouponRepositoryError> {
        let key = Self::auto_apply_key(tenant_id, product_id, payment_method);

        if self.config.enabled {
            if let Some(cached) = self.auto_apply_cache.get(&key) {
                return Ok(cached);
            }
        }

        let result = self
            .inner
            .get_auto_apply_coupons_for_payment(tenant_id, product_id, payment_method)
            .await?;

        if self.config.enabled {
            self.auto_apply_cache
                .set(key, result.clone(), self.config.item_ttl);
        }

        Ok(result)
    }

    async fn get_all_auto_apply_coupons_for_payment(
        &self,
        tenant_id: &str,
        payment_method: &PaymentMethod,
    ) -> Result<HashMap<String, Vec<Coupon>>, CouponRepositoryError> {
        let key = Self::all_auto_apply_key(tenant_id, payment_method);

        if self.config.enabled {
            if let Some(cached) = self.all_auto_apply_cache.get(&key) {
                return Ok(cached);
            }
        }

        let result = self
            .inner
            .get_all_auto_apply_coupons_for_payment(tenant_id, payment_method)
            .await?;

        if self.config.enabled {
            self.all_auto_apply_cache
                .set(key, result.clone(), self.config.item_ttl);
        }

        Ok(result)
    }

    async fn get_checkout_auto_apply_coupons(
        &self,
        tenant_id: &str,
        payment_method: &PaymentMethod,
    ) -> Result<Vec<Coupon>, CouponRepositoryError> {
        let key = format!("checkout_auto_apply:{}:{:?}", tenant_id, payment_method);

        if self.config.enabled {
            if let Some(cached) = self.auto_apply_cache.get(&key) {
                return Ok(cached);
            }
        }

        // Delegate to inner repository's efficient implementation.
        let result = self
            .inner
            .get_checkout_auto_apply_coupons(tenant_id, payment_method)
            .await?;

        if self.config.enabled {
            self.auto_apply_cache
                .set(key, result.clone(), self.config.item_ttl);
        }

        Ok(result)
    }

    async fn create_coupon(&self, coupon: Coupon) -> Result<(), CouponRepositoryError> {
        let result = self.inner.create_coupon(coupon.clone()).await?;

        // Write-through: invalidate all caches per spec.
        if self.config.enabled {
            self.invalidate_tenant_list_caches(&coupon.tenant_id);
            // Re-cache the created coupon.
            self.coupon_cache.set(
                Self::coupon_key(&coupon.tenant_id, &coupon.code),
                coupon,
                self.config.item_ttl,
            );
        }

        Ok(result)
    }

    async fn update_coupon(&self, coupon: Coupon) -> Result<(), CouponRepositoryError> {
        let result = self.inner.update_coupon(coupon.clone()).await?;

        // Write-through: invalidate all caches per spec.
        if self.config.enabled {
            self.invalidate_tenant_list_caches(&coupon.tenant_id);
            // Re-cache the updated coupon.
            self.coupon_cache.set(
                Self::coupon_key(&coupon.tenant_id, &coupon.code),
                coupon,
                self.config.item_ttl,
            );
        }

        Ok(result)
    }

    async fn increment_usage(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> Result<(), CouponRepositoryError> {
        let result = self.inner.increment_usage(tenant_id, code).await?;

        // Invalidate the specific coupon cache AND list caches since usage count changed.
        // List caches contain aggregated coupon data including usage counts.
        if self.config.enabled {
            self.coupon_cache
                .invalidate(&Self::coupon_key(tenant_id, code));
            self.invalidate_tenant_list_caches(tenant_id);
        }

        Ok(result)
    }

    async fn try_increment_usage_atomic(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> Result<bool, CouponRepositoryError> {
        let result = self
            .inner
            .try_increment_usage_atomic(tenant_id, code)
            .await?;

        // Invalidate coupon/list caches for both true and false outcomes:
        // - true: usage_count changed
        // - false: coupon may have just reached limit, so cached lists must be refreshed
        if self.config.enabled {
            self.coupon_cache
                .invalidate(&Self::coupon_key(tenant_id, code));
            self.invalidate_tenant_list_caches(tenant_id);
        }

        Ok(result)
    }

    async fn delete_coupon(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> Result<(), CouponRepositoryError> {
        let result = self.inner.delete_coupon(tenant_id, code).await?;

        // Write-through: invalidate all caches per spec.
        if self.config.enabled {
            self.coupon_cache
                .invalidate(&Self::coupon_key(tenant_id, code));
            self.invalidate_tenant_list_caches(tenant_id);
        }

        Ok(result)
    }

    async fn close(&self) -> Result<(), CouponRepositoryError> {
        self.clear_all();
        self.inner.close().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[derive(Default)]
    struct FakeCouponRepo {
        coupon: std::sync::Mutex<Option<Coupon>>,
        increment_result: std::sync::Mutex<bool>,
    }

    #[async_trait]
    impl CouponRepository for FakeCouponRepo {
        async fn get_coupon(
            &self,
            _tenant_id: &str,
            _code: &str,
        ) -> Result<Coupon, CouponRepositoryError> {
            self.coupon
                .lock()
                .unwrap()
                .clone()
                .ok_or(CouponRepositoryError::NotFound)
        }

        async fn list_coupons(
            &self,
            _tenant_id: &str,
        ) -> Result<Vec<Coupon>, CouponRepositoryError> {
            Ok(vec![])
        }

        async fn get_auto_apply_coupons_for_payment(
            &self,
            _tenant_id: &str,
            _product_id: &str,
            _payment_method: &PaymentMethod,
        ) -> Result<Vec<Coupon>, CouponRepositoryError> {
            Ok(vec![])
        }

        async fn get_all_auto_apply_coupons_for_payment(
            &self,
            _tenant_id: &str,
            _payment_method: &PaymentMethod,
        ) -> Result<HashMap<String, Vec<Coupon>>, CouponRepositoryError> {
            Ok(HashMap::new())
        }

        async fn get_checkout_auto_apply_coupons(
            &self,
            _tenant_id: &str,
            _payment_method: &PaymentMethod,
        ) -> Result<Vec<Coupon>, CouponRepositoryError> {
            Ok(vec![])
        }

        async fn create_coupon(&self, coupon: Coupon) -> Result<(), CouponRepositoryError> {
            *self.coupon.lock().unwrap() = Some(coupon);
            Ok(())
        }

        async fn update_coupon(&self, coupon: Coupon) -> Result<(), CouponRepositoryError> {
            *self.coupon.lock().unwrap() = Some(coupon);
            Ok(())
        }

        async fn increment_usage(
            &self,
            _tenant_id: &str,
            _code: &str,
        ) -> Result<(), CouponRepositoryError> {
            Ok(())
        }

        async fn try_increment_usage_atomic(
            &self,
            _tenant_id: &str,
            _code: &str,
        ) -> Result<bool, CouponRepositoryError> {
            Ok(*self.increment_result.lock().unwrap())
        }

        async fn delete_coupon(
            &self,
            _tenant_id: &str,
            _code: &str,
        ) -> Result<(), CouponRepositoryError> {
            *self.coupon.lock().unwrap() = None;
            Ok(())
        }

        async fn close(&self) -> Result<(), CouponRepositoryError> {
            Ok(())
        }
    }

    #[tokio::test]
    async fn test_coupon_list_cache_invalidation_is_tenant_scoped() {
        let repo = Arc::new(FakeCouponRepo::default());
        let cached = CachedCouponRepository::new(
            repo,
            RepositoryCacheConfig {
                enabled: true,
                item_ttl: Duration::from_secs(60),
                list_ttl: Duration::from_secs(60),
                max_entries: 1000,
            },
        );

        cached
            .list_cache
            .set("list:tenant-a".to_string(), vec![], Duration::from_secs(60));
        cached
            .list_cache
            .set("list:tenant-b".to_string(), vec![], Duration::from_secs(60));
        cached.auto_apply_cache.set(
            "tenant-a:product-1:stripe".to_string(),
            vec![],
            Duration::from_secs(60),
        );
        cached.auto_apply_cache.set(
            "tenant-b:product-1:stripe".to_string(),
            vec![],
            Duration::from_secs(60),
        );
        cached.auto_apply_cache.set(
            "checkout_auto_apply:tenant-a:stripe".to_string(),
            vec![],
            Duration::from_secs(60),
        );
        cached.auto_apply_cache.set(
            "checkout_auto_apply:tenant-b:stripe".to_string(),
            vec![],
            Duration::from_secs(60),
        );
        cached.all_auto_apply_cache.set(
            "tenant-a:stripe".to_string(),
            HashMap::new(),
            Duration::from_secs(60),
        );
        cached.all_auto_apply_cache.set(
            "tenant-b:stripe".to_string(),
            HashMap::new(),
            Duration::from_secs(60),
        );

        let coupon = Coupon {
            tenant_id: "tenant-a".to_string(),
            code: "SAVE10".to_string(),
            ..Default::default()
        };
        cached.update_coupon(coupon).await.unwrap();

        assert!(cached.list_cache.get("list:tenant-a").is_none());
        assert!(cached.list_cache.get("list:tenant-b").is_some());
        assert!(cached
            .auto_apply_cache
            .get("tenant-a:product-1:stripe")
            .is_none());
        assert!(cached
            .auto_apply_cache
            .get("tenant-b:product-1:stripe")
            .is_some());
        assert!(cached
            .auto_apply_cache
            .get("checkout_auto_apply:tenant-a:stripe")
            .is_none());
        assert!(cached
            .auto_apply_cache
            .get("checkout_auto_apply:tenant-b:stripe")
            .is_some());
        assert!(cached.all_auto_apply_cache.get("tenant-a:stripe").is_none());
        assert!(cached.all_auto_apply_cache.get("tenant-b:stripe").is_some());
    }

    #[tokio::test]
    async fn test_try_increment_usage_atomic_invalidates_caches_when_limit_reached() {
        let repo = Arc::new(FakeCouponRepo::default());
        *repo.increment_result.lock().unwrap() = false;
        let cached = CachedCouponRepository::new(
            repo,
            RepositoryCacheConfig {
                enabled: true,
                item_ttl: Duration::from_secs(60),
                list_ttl: Duration::from_secs(60),
                max_entries: 1000,
            },
        );

        cached.coupon_cache.set(
            "tenant-a:SAVE10".to_string(),
            Coupon {
                tenant_id: "tenant-a".to_string(),
                code: "SAVE10".to_string(),
                ..Default::default()
            },
            Duration::from_secs(60),
        );
        cached
            .list_cache
            .set("list:tenant-a".to_string(), vec![], Duration::from_secs(60));
        cached.auto_apply_cache.set(
            "tenant-a:product-1:stripe".to_string(),
            vec![],
            Duration::from_secs(60),
        );
        cached.all_auto_apply_cache.set(
            "tenant-a:stripe".to_string(),
            HashMap::new(),
            Duration::from_secs(60),
        );

        let incremented = cached
            .try_increment_usage_atomic("tenant-a", "SAVE10")
            .await
            .unwrap();
        assert!(!incremented);

        assert!(cached.coupon_cache.get("tenant-a:SAVE10").is_none());
        assert!(cached.list_cache.get("list:tenant-a").is_none());
        assert!(cached
            .auto_apply_cache
            .get("tenant-a:product-1:stripe")
            .is_none());
        assert!(cached.all_auto_apply_cache.get("tenant-a:stripe").is_none());
    }
}
