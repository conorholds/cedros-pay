use std::sync::Arc;

use async_trait::async_trait;

use crate::models::Product;
use crate::repositories::{ProductRepository, ProductRepositoryError};
use crate::ttl_cache::TtlCache;

use super::RepositoryCacheConfig;

/// Cached wrapper for ProductRepository.
pub struct CachedProductRepository<R: ProductRepository> {
    inner: Arc<R>,
    config: RepositoryCacheConfig,
    product_cache: TtlCache<Product>,
    product_by_stripe_cache: TtlCache<Product>,
    list_cache: TtlCache<Vec<Product>>,
}

impl<R: ProductRepository> CachedProductRepository<R> {
    /// Create a new cached product repository.
    ///
    /// Uses LRU (Least Recently Used) eviction policy automatically when
    /// the cache reaches capacity (L-004 fix).
    pub fn new(inner: Arc<R>, config: RepositoryCacheConfig) -> Self {
        let max_entries = config.max_entries;
        Self {
            inner,
            config,
            product_cache: TtlCache::new(max_entries),
            product_by_stripe_cache: TtlCache::new(max_entries),
            list_cache: TtlCache::new(max_entries),
        }
    }

    /// Create with default configuration (5 minute TTL).
    pub fn with_defaults(inner: Arc<R>) -> Self {
        Self::new(inner, RepositoryCacheConfig::for_products())
    }

    /// Clear all caches.
    pub fn clear_all(&self) {
        self.product_cache.clear();
        self.product_by_stripe_cache.clear();
        self.list_cache.clear();
    }

    /// Get the inner repository.
    pub fn inner(&self) -> &Arc<R> {
        &self.inner
    }

    fn stripe_cache_key(tenant_id: &str, stripe_price_id: &str) -> String {
        format!("{}\x00{}", tenant_id, stripe_price_id)
    }
}

#[async_trait]
impl<R: ProductRepository + 'static> ProductRepository for CachedProductRepository<R> {
    async fn get_product(
        &self,
        tenant_id: &str,
        id: &str,
    ) -> Result<Product, ProductRepositoryError> {
        let cache_key = format!("{}:{}", tenant_id, id);
        if self.config.enabled {
            if let Some(cached) = self.product_cache.get(&cache_key) {
                return Ok(cached);
            }
        }

        let result = self.inner.get_product(tenant_id, id).await?;

        if self.config.enabled {
            self.product_cache
                .set(cache_key, result.clone(), self.config.item_ttl);
        }

        Ok(result)
    }

    async fn get_product_by_stripe_price_id(
        &self,
        tenant_id: &str,
        stripe_price_id: &str,
    ) -> Result<Product, ProductRepositoryError> {
        // BUG-011: Use \x00 (null) as delimiter to prevent key collision
        // if tenant_id or stripe_price_id contains colons.
        let cache_key = Self::stripe_cache_key(tenant_id, stripe_price_id);
        if self.config.enabled {
            if let Some(cached) = self.product_by_stripe_cache.get(&cache_key) {
                return Ok(cached);
            }
        }

        let result = self
            .inner
            .get_product_by_stripe_price_id(tenant_id, stripe_price_id)
            .await?;

        if self.config.enabled {
            self.product_by_stripe_cache
                .set(cache_key, result.clone(), self.config.item_ttl);
            // Also cache by ID.
            self.product_cache.set(
                format!("{}:{}", tenant_id, result.id),
                result.clone(),
                self.config.item_ttl,
            );
        }

        Ok(result)
    }

    async fn list_products(&self, tenant_id: &str) -> Result<Vec<Product>, ProductRepositoryError> {
        let list_key = tenant_id.to_string();
        if self.config.enabled {
            if let Some(cached) = self.list_cache.get(&list_key) {
                return Ok(cached);
            }
        }

        let result = self.inner.list_products(tenant_id).await?;

        if self.config.enabled {
            self.list_cache
                .set(list_key, result.clone(), self.config.list_ttl);

            // Also cache individual products.
            for product in &result {
                self.product_cache.set(
                    format!("{}:{}", tenant_id, product.id),
                    product.clone(),
                    self.config.item_ttl,
                );
            }
        }

        Ok(result)
    }

    async fn list_products_paginated(
        &self,
        tenant_id: &str,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<Product>, ProductRepositoryError> {
        let result = self
            .inner
            .list_products_paginated(tenant_id, limit, offset)
            .await?;

        if self.config.enabled {
            for product in &result {
                self.product_cache.set(
                    format!("{}:{}", tenant_id, product.id),
                    product.clone(),
                    self.config.item_ttl,
                );
            }
        }

        Ok(result)
    }

    async fn list_all_products_paginated(
        &self,
        tenant_id: &str,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<Product>, ProductRepositoryError> {
        let result = self
            .inner
            .list_all_products_paginated(tenant_id, limit, offset)
            .await?;

        if self.config.enabled {
            for product in &result {
                self.product_cache.set(
                    format!("{}:{}", tenant_id, product.id),
                    product.clone(),
                    self.config.item_ttl,
                );
            }
        }

        Ok(result)
    }

    async fn create_product(&self, product: Product) -> Result<(), ProductRepositoryError> {
        let result = self.inner.create_product(product.clone()).await?;

        // Write-through: invalidate caches.
        if self.config.enabled {
            self.list_cache.invalidate(&product.tenant_id);
            let cache_key = format!("{}:{}", product.tenant_id, product.id);
            self.product_cache
                .set(cache_key, product, self.config.item_ttl);
        }

        Ok(result)
    }

    async fn update_product(&self, product: Product) -> Result<(), ProductRepositoryError> {
        // BUG-003: Fetch existing product to invalidate old stripe cache key if needed.
        // This is best-effort; if it fails we still proceed with the update.
        let existing = if self.config.enabled {
            self.inner
                .get_product(&product.tenant_id, &product.id)
                .await
                .ok()
        } else {
            None
        };

        let result = self.inner.update_product(product.clone()).await?;

        // Write-through: invalidate affected caches.
        if self.config.enabled {
            self.list_cache.invalidate(&product.tenant_id);
            self.product_cache.set(
                format!("{}:{}", product.tenant_id, product.id),
                product.clone(),
                self.config.item_ttl,
            );

            // Invalidate old stripe key if it changed (or was removed).
            if let Some(old_stripe_id) = existing.as_ref().and_then(|p| p.stripe_price_id.as_ref())
            {
                let old_key = Self::stripe_cache_key(&product.tenant_id, old_stripe_id);
                if product.stripe_price_id.as_ref() != Some(old_stripe_id) {
                    self.product_by_stripe_cache.invalidate(&old_key);
                }
            }

            if let Some(ref stripe_id) = product.stripe_price_id {
                self.product_by_stripe_cache.set(
                    Self::stripe_cache_key(&product.tenant_id, stripe_id),
                    product,
                    self.config.item_ttl,
                );
            }
        }

        Ok(result)
    }

    async fn decrement_inventory_atomic(
        &self,
        tenant_id: &str,
        product_id: &str,
        quantity: i32,
        allow_backorder: bool,
    ) -> Result<Option<(i32, i32)>, ProductRepositoryError> {
        let result = self
            .inner
            .decrement_inventory_atomic(tenant_id, product_id, quantity, allow_backorder)
            .await?;

        if self.config.enabled {
            self.list_cache.invalidate(tenant_id);
            let cache_key = format!("{}:{}", tenant_id, product_id);
            self.product_cache.invalidate(&cache_key);
        }

        Ok(result)
    }

    async fn delete_product(
        &self,
        tenant_id: &str,
        id: &str,
    ) -> Result<(), ProductRepositoryError> {
        // Get product first to invalidate stripe cache.
        let product = self.inner.get_product(tenant_id, id).await.ok();

        let result = self.inner.delete_product(tenant_id, id).await?;

        // Write-through: invalidate caches.
        if self.config.enabled {
            self.list_cache.invalidate(tenant_id);
            self.product_cache
                .invalidate(&format!("{}:{}", tenant_id, id));
            if let Some(p) = product {
                if let Some(stripe_id) = p.stripe_price_id {
                    self.product_by_stripe_cache
                        .invalidate(&Self::stripe_cache_key(tenant_id, &stripe_id));
                }
            }
        }

        Ok(result)
    }

    async fn close(&self) -> Result<(), ProductRepositoryError> {
        self.clear_all();
        self.inner.close().await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[derive(Default)]
    struct FakeProductRepo {
        product: std::sync::Mutex<Option<Product>>,
    }

    #[async_trait]
    impl ProductRepository for FakeProductRepo {
        async fn get_product(
            &self,
            _tenant_id: &str,
            _id: &str,
        ) -> Result<Product, ProductRepositoryError> {
            self.product
                .lock()
                .unwrap()
                .clone()
                .ok_or(ProductRepositoryError::NotFound)
        }

        async fn get_product_by_stripe_price_id(
            &self,
            _tenant_id: &str,
            _stripe_price_id: &str,
        ) -> Result<Product, ProductRepositoryError> {
            self.get_product("", "").await
        }

        async fn list_products(
            &self,
            _tenant_id: &str,
        ) -> Result<Vec<Product>, ProductRepositoryError> {
            Ok(vec![])
        }

        async fn list_products_paginated(
            &self,
            _tenant_id: &str,
            _limit: usize,
            _offset: usize,
        ) -> Result<Vec<Product>, ProductRepositoryError> {
            Ok(vec![])
        }

        async fn list_all_products_paginated(
            &self,
            _tenant_id: &str,
            _limit: usize,
            _offset: usize,
        ) -> Result<Vec<Product>, ProductRepositoryError> {
            Ok(vec![])
        }

        async fn create_product(&self, _product: Product) -> Result<(), ProductRepositoryError> {
            Ok(())
        }

        async fn update_product(&self, product: Product) -> Result<(), ProductRepositoryError> {
            *self.product.lock().unwrap() = Some(product);
            Ok(())
        }

        async fn decrement_inventory_atomic(
            &self,
            _tenant_id: &str,
            _product_id: &str,
            _quantity: i32,
            _allow_backorder: bool,
        ) -> Result<Option<(i32, i32)>, ProductRepositoryError> {
            Ok(None)
        }

        async fn delete_product(
            &self,
            _tenant_id: &str,
            _id: &str,
        ) -> Result<(), ProductRepositoryError> {
            *self.product.lock().unwrap() = None;
            Ok(())
        }

        async fn close(&self) -> Result<(), ProductRepositoryError> {
            Ok(())
        }
    }

    #[tokio::test]
    async fn test_update_product_invalidates_old_stripe_key() {
        let repo = Arc::new(FakeProductRepo::default());

        // Seed repo with product that has old stripe id.
        let original = Product {
            tenant_id: "t1".to_string(),
            id: "p1".to_string(),
            stripe_price_id: Some("price_old".to_string()),
            ..Default::default()
        };
        repo.update_product(original.clone()).await.unwrap();

        let cached = CachedProductRepository::new(
            repo.clone(),
            RepositoryCacheConfig {
                enabled: true,
                item_ttl: Duration::from_secs(300),
                list_ttl: Duration::from_secs(300),
                max_entries: 1000,
            },
        );

        // Prime cache by stripe id.
        let _ = cached
            .get_product_by_stripe_price_id("t1", "price_old")
            .await
            .unwrap();

        // Update product to new stripe id.
        let updated = Product {
            stripe_price_id: Some("price_new".to_string()),
            ..original.clone()
        };
        cached.update_product(updated).await.unwrap();

        // Old key should be invalidated.
        let old_key = "t1\x00price_old";
        assert!(cached.product_by_stripe_cache.get(old_key).is_none());
    }

    #[tokio::test]
    async fn test_product_list_cache_invalidation_is_tenant_scoped() {
        let repo = Arc::new(FakeProductRepo::default());
        let cached = CachedProductRepository::new(
            repo,
            RepositoryCacheConfig {
                enabled: true,
                item_ttl: Duration::from_secs(300),
                list_ttl: Duration::from_secs(300),
                max_entries: 1000,
            },
        );

        // Prime list caches for two tenants.
        cached
            .list_cache
            .set("tenant-a".to_string(), vec![], Duration::from_secs(60));
        cached
            .list_cache
            .set("tenant-b".to_string(), vec![], Duration::from_secs(60));

        let p = Product {
            tenant_id: "tenant-a".to_string(),
            id: "p1".to_string(),
            ..Default::default()
        };
        cached.create_product(p).await.unwrap();

        assert!(cached.list_cache.get("tenant-a").is_none());
        assert!(cached.list_cache.get("tenant-b").is_some());
    }
}
