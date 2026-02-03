//! Repository factory functions for products and coupons
//!
//! Per spec 23-repositories.md: Factory functions that create repositories
//! based on configuration, with optional caching.

use std::sync::Arc;
use std::time::Duration;

use sqlx::PgPool;

use crate::repositories::{
    CachedCouponRepository, CachedProductRepository, CouponRepository, CouponRepositoryError,
    InMemoryCouponRepository, InMemoryProductRepository, ProductRepository, ProductRepositoryError,
    RepositoryCacheConfig,
};

use crate::repositories::postgres::{PostgresCouponRepository, PostgresProductRepository};

/// Product repository backend type
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProductBackend {
    /// In-memory (for testing)
    Memory,
    /// PostgreSQL database
    Postgres,
}

/// Coupon repository backend type
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CouponBackend {
    /// Disabled - all operations return NotFound
    Disabled,
    /// In-memory (for testing)
    Memory,
    /// PostgreSQL database
    Postgres,
}

/// Product repository configuration
#[derive(Debug, Clone)]
pub struct ProductRepositoryConfig {
    pub backend: ProductBackend,
    pub cache_ttl: Option<Duration>,
    pub table_name: Option<String>,
}

impl Default for ProductRepositoryConfig {
    fn default() -> Self {
        Self {
            backend: ProductBackend::Memory,
            cache_ttl: Some(Duration::from_secs(300)), // 5 minutes per spec
            table_name: None,
        }
    }
}

/// Coupon repository configuration
#[derive(Debug, Clone)]
pub struct CouponRepositoryConfig {
    pub backend: CouponBackend,
    pub cache_ttl: Option<Duration>,
    pub table_name: Option<String>,
}

impl Default for CouponRepositoryConfig {
    fn default() -> Self {
        Self {
            backend: CouponBackend::Disabled,
            cache_ttl: Some(Duration::from_secs(60)), // 1 minute per spec
            table_name: None,
        }
    }
}

/// Create a product repository based on configuration
pub async fn new_product_repository(
    config: ProductRepositoryConfig,
    pool: Option<PgPool>,
) -> Result<Arc<dyn ProductRepository>, ProductRepositoryError> {
    // Build the repository based on backend type
    // For cached variants, we need to use concrete types
    match config.backend {
        ProductBackend::Memory => {
            let base = InMemoryProductRepository::new(vec![]);
            if let Some(ttl) = config.cache_ttl {
                if ttl > Duration::ZERO {
                    let cache_config = RepositoryCacheConfig {
                        item_ttl: ttl,
                        list_ttl: ttl,
                        enabled: true,
                        ..Default::default()
                    };
                    return Ok(Arc::new(CachedProductRepository::new(
                        Arc::new(base),
                        cache_config,
                    )));
                }
            }
            Ok(Arc::new(base))
        }

        ProductBackend::Postgres => {
            let pool = pool.ok_or_else(|| {
                ProductRepositoryError::Storage("PostgreSQL pool required".to_string())
            })?;

            let mut repo = PostgresProductRepository::new(pool);
            if let Some(table) = &config.table_name {
                repo = repo.with_table_name(table);
            }
            if let Some(ttl) = config.cache_ttl {
                if ttl > Duration::ZERO {
                    let cache_config = RepositoryCacheConfig {
                        item_ttl: ttl,
                        list_ttl: ttl,
                        enabled: true,
                        ..Default::default()
                    };
                    return Ok(Arc::new(CachedProductRepository::new(
                        Arc::new(repo),
                        cache_config,
                    )));
                }
            }
            Ok(Arc::new(repo))
        }
    }
}

/// Create a product repository with a shared database connection
pub async fn new_product_repository_with_pool(
    config: ProductRepositoryConfig,
    pool: PgPool,
) -> Result<Arc<dyn ProductRepository>, ProductRepositoryError> {
    new_product_repository(config, Some(pool)).await
}

/// Create a coupon repository based on configuration
pub async fn new_coupon_repository(
    config: CouponRepositoryConfig,
    pool: Option<PgPool>,
) -> Result<Arc<dyn CouponRepository>, CouponRepositoryError> {
    // Build the repository based on backend type
    // For cached variants, we need to use concrete types
    match config.backend {
        CouponBackend::Disabled => Ok(Arc::new(DisabledCouponRepository)),

        CouponBackend::Memory => {
            let base = InMemoryCouponRepository::new(vec![]);
            if let Some(ttl) = config.cache_ttl {
                if ttl > Duration::ZERO {
                    let cache_config = RepositoryCacheConfig {
                        item_ttl: ttl,
                        list_ttl: ttl,
                        enabled: true,
                        ..Default::default()
                    };
                    return Ok(Arc::new(CachedCouponRepository::new(
                        Arc::new(base),
                        cache_config,
                    )));
                }
            }
            Ok(Arc::new(base))
        }

        CouponBackend::Postgres => {
            let pool = pool.ok_or_else(|| {
                CouponRepositoryError::Storage("PostgreSQL pool required".to_string())
            })?;

            let mut repo = PostgresCouponRepository::new(pool);
            if let Some(table) = &config.table_name {
                repo = repo.with_table_name(table);
            }
            if let Some(ttl) = config.cache_ttl {
                if ttl > Duration::ZERO {
                    let cache_config = RepositoryCacheConfig {
                        item_ttl: ttl,
                        list_ttl: ttl,
                        enabled: true,
                        ..Default::default()
                    };
                    return Ok(Arc::new(CachedCouponRepository::new(
                        Arc::new(repo),
                        cache_config,
                    )));
                }
            }
            Ok(Arc::new(repo))
        }
    }
}

/// Create a coupon repository with a shared database connection
pub async fn new_coupon_repository_with_pool(
    config: CouponRepositoryConfig,
    pool: PgPool,
) -> Result<Arc<dyn CouponRepository>, CouponRepositoryError> {
    new_coupon_repository(config, Some(pool)).await
}

// ─────────────────────────────────────────────────────────────────────────────
// Disabled Coupon Repository (no-op implementation)
// ─────────────────────────────────────────────────────────────────────────────

use crate::models::{Coupon, PaymentMethod};
use async_trait::async_trait;
use std::collections::HashMap;

/// No-op coupon repository that always returns NotFound
pub struct DisabledCouponRepository;

#[async_trait]
impl CouponRepository for DisabledCouponRepository {
    async fn get_coupon(
        &self,
        _tenant_id: &str,
        _code: &str,
    ) -> Result<Coupon, CouponRepositoryError> {
        Err(CouponRepositoryError::NotFound)
    }

    async fn list_coupons(&self, _tenant_id: &str) -> Result<Vec<Coupon>, CouponRepositoryError> {
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

    async fn create_coupon(&self, _coupon: Coupon) -> Result<(), CouponRepositoryError> {
        Err(CouponRepositoryError::Validation(
            "coupons are disabled".to_string(),
        ))
    }

    async fn update_coupon(&self, _coupon: Coupon) -> Result<(), CouponRepositoryError> {
        Err(CouponRepositoryError::Validation(
            "coupons are disabled".to_string(),
        ))
    }

    async fn increment_usage(
        &self,
        _tenant_id: &str,
        _code: &str,
    ) -> Result<(), CouponRepositoryError> {
        Err(CouponRepositoryError::NotFound)
    }

    async fn delete_coupon(
        &self,
        _tenant_id: &str,
        _code: &str,
    ) -> Result<(), CouponRepositoryError> {
        Err(CouponRepositoryError::NotFound)
    }

    async fn close(&self) -> Result<(), CouponRepositoryError> {
        Ok(())
    }
}
