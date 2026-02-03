use std::collections::HashMap;
use std::sync::{Arc, RwLock, RwLockReadGuard, RwLockWriteGuard};

use async_trait::async_trait;

use crate::models::{Coupon, PaymentMethod, Product};
use crate::repositories::{
    CouponRepository, CouponRepositoryError, ProductRepository, ProductRepositoryError,
};

/// Helper trait to safely acquire locks, recovering from poison if needed.
/// A poisoned lock indicates a previous panic while the lock was held.
/// We recover the data and log a warning rather than propagating the panic.
trait SafeLock<T> {
    fn safe_read(&self) -> RwLockReadGuard<'_, T>;
    fn safe_write(&self) -> RwLockWriteGuard<'_, T>;
}

impl<T> SafeLock<T> for RwLock<T> {
    fn safe_read(&self) -> RwLockReadGuard<'_, T> {
        self.read().unwrap_or_else(|poisoned| {
            tracing::warn!("RwLock was poisoned (previous panic), recovering data");
            poisoned.into_inner()
        })
    }

    fn safe_write(&self) -> RwLockWriteGuard<'_, T> {
        self.write().unwrap_or_else(|poisoned| {
            tracing::warn!("RwLock was poisoned (previous panic), recovering data");
            poisoned.into_inner()
        })
    }
}

fn product_key(tenant_id: &str, product_id: &str) -> String {
    format!("{}:{}", tenant_id, product_id)
}

fn coupon_key(tenant_id: &str, code: &str) -> String {
    format!("{}:{}", tenant_id, code.to_uppercase())
}

#[derive(Clone)]
pub struct InMemoryProductRepository {
    inner: Arc<RwLock<HashMap<String, Product>>>,
}

impl InMemoryProductRepository {
    pub fn new(products: Vec<Product>) -> Self {
        let map = products
            .into_iter()
            .map(|p| (product_key(&p.tenant_id, &p.id), p))
            .collect::<HashMap<_, _>>();
        Self {
            inner: Arc::new(RwLock::new(map)),
        }
    }
}

#[async_trait]
impl ProductRepository for InMemoryProductRepository {
    async fn get_product(
        &self,
        tenant_id: &str,
        id: &str,
    ) -> Result<Product, ProductRepositoryError> {
        self.inner
            .safe_read()
            .get(&product_key(tenant_id, id))
            .cloned()
            .ok_or(ProductRepositoryError::NotFound)
    }

    async fn get_product_by_stripe_price_id(
        &self,
        tenant_id: &str,
        stripe_price_id: &str,
    ) -> Result<Product, ProductRepositoryError> {
        self.inner
            .safe_read()
            .values()
            .find(|p| {
                p.tenant_id == tenant_id && p.stripe_price_id.as_deref() == Some(stripe_price_id)
            })
            .cloned()
            .ok_or(ProductRepositoryError::NotFound)
    }

    async fn list_products(&self, tenant_id: &str) -> Result<Vec<Product>, ProductRepositoryError> {
        let mut products: Vec<Product> = self
            .inner
            .safe_read()
            .values()
            .filter(|p| p.tenant_id == tenant_id && p.active)
            .cloned()
            .collect();

        products.sort_by(|a, b| {
            match (a.sort_order, b.sort_order) {
                (Some(ao), Some(bo)) => ao.cmp(&bo),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => std::cmp::Ordering::Equal,
            }
            .then_with(|| match (a.created_at, b.created_at) {
                (Some(ac), Some(bc)) => bc.cmp(&ac),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => std::cmp::Ordering::Equal,
            })
            .then_with(|| a.id.cmp(&b.id))
        });

        Ok(products)
    }

    async fn list_all_products(
        &self,
        tenant_id: &str,
    ) -> Result<Vec<Product>, ProductRepositoryError> {
        let mut products: Vec<Product> = self
            .inner
            .safe_read()
            .values()
            .filter(|p| p.tenant_id == tenant_id)
            .cloned()
            .collect();

        products.sort_by(|a, b| {
            match (a.sort_order, b.sort_order) {
                (Some(ao), Some(bo)) => ao.cmp(&bo),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => std::cmp::Ordering::Equal,
            }
            .then_with(|| match (a.created_at, b.created_at) {
                (Some(ac), Some(bc)) => bc.cmp(&ac),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => std::cmp::Ordering::Equal,
            })
            .then_with(|| a.id.cmp(&b.id))
        });

        Ok(products)
    }

    async fn count_all_products(&self, tenant_id: &str) -> Result<i64, ProductRepositoryError> {
        let count = self
            .inner
            .safe_read()
            .values()
            .filter(|p| p.tenant_id == tenant_id)
            .count();
        Ok(count as i64)
    }

    async fn list_products_paginated(
        &self,
        tenant_id: &str,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<Product>, ProductRepositoryError> {
        if limit == 0 {
            return Ok(Vec::new());
        }

        let products: Vec<Product> = self
            .inner
            .safe_read()
            .values()
            .filter(|p| p.tenant_id == tenant_id && p.active)
            .cloned()
            .collect();

        let mut products = products;
        products.sort_by(|a, b| {
            match (a.sort_order, b.sort_order) {
                (Some(ao), Some(bo)) => ao.cmp(&bo),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => std::cmp::Ordering::Equal,
            }
            .then_with(|| match (a.created_at, b.created_at) {
                (Some(ac), Some(bc)) => bc.cmp(&ac),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => std::cmp::Ordering::Equal,
            })
            .then_with(|| a.id.cmp(&b.id))
        });

        if offset >= products.len() {
            return Ok(Vec::new());
        }

        let end = (offset + limit).min(products.len());
        Ok(products[offset..end].to_vec())
    }

    async fn list_all_products_paginated(
        &self,
        tenant_id: &str,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<Product>, ProductRepositoryError> {
        if limit == 0 {
            return Ok(Vec::new());
        }

        let products: Vec<Product> = self
            .inner
            .safe_read()
            .values()
            .filter(|p| p.tenant_id == tenant_id)
            .cloned()
            .collect();

        let mut products = products;
        products.sort_by(|a, b| {
            match (a.sort_order, b.sort_order) {
                (Some(ao), Some(bo)) => ao.cmp(&bo),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => std::cmp::Ordering::Equal,
            }
            .then_with(|| match (a.created_at, b.created_at) {
                (Some(ac), Some(bc)) => bc.cmp(&ac),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => std::cmp::Ordering::Equal,
            })
            .then_with(|| a.id.cmp(&b.id))
        });

        if offset >= products.len() {
            return Ok(Vec::new());
        }

        let end = (offset + limit).min(products.len());
        Ok(products[offset..end].to_vec())
    }

    // PERF-003: Optimized batch get using single lock acquisition
    async fn get_products_by_ids(
        &self,
        tenant_id: &str,
        ids: &[String],
    ) -> Result<Vec<Product>, ProductRepositoryError> {
        let guard = self.inner.safe_read();
        Ok(ids
            .iter()
            .filter_map(|id| guard.get(&product_key(tenant_id, id)).cloned())
            .collect())
    }

    async fn create_product(&self, product: Product) -> Result<(), ProductRepositoryError> {
        let key = product_key(&product.tenant_id, &product.id);
        self.inner.safe_write().insert(key, product);
        Ok(())
    }

    async fn update_product(&self, product: Product) -> Result<(), ProductRepositoryError> {
        let key = product_key(&product.tenant_id, &product.id);
        self.inner.safe_write().insert(key, product);
        Ok(())
    }

    async fn decrement_inventory_atomic(
        &self,
        tenant_id: &str,
        product_id: &str,
        quantity: i32,
        allow_backorder: bool,
    ) -> Result<Option<(i32, i32)>, ProductRepositoryError> {
        if quantity <= 0 {
            return Err(ProductRepositoryError::Validation(
                "quantity must be positive".to_string(),
            ));
        }
        let key = product_key(tenant_id, product_id);
        let mut guard = self.inner.safe_write();
        let product = guard
            .get_mut(&key)
            .ok_or(ProductRepositoryError::NotFound)?;
        let current = match product.inventory_quantity {
            Some(qty) => qty,
            None => return Ok(None),
        };
        if current < quantity && !allow_backorder {
            return Err(ProductRepositoryError::Validation(
                "out of stock".to_string(),
            ));
        }
        let next = current - quantity;
        product.inventory_quantity = Some(next);
        Ok(Some((current, next)))
    }

    async fn delete_product(
        &self,
        tenant_id: &str,
        id: &str,
    ) -> Result<(), ProductRepositoryError> {
        self.inner.safe_write().remove(&product_key(tenant_id, id));
        Ok(())
    }

    async fn close(&self) -> Result<(), ProductRepositoryError> {
        Ok(())
    }
}

#[derive(Clone)]
pub struct InMemoryCouponRepository {
    inner: Arc<RwLock<HashMap<String, Coupon>>>,
}

impl InMemoryCouponRepository {
    pub fn new(coupons: Vec<Coupon>) -> Self {
        // Per spec: coupon codes are case-insensitive, store uppercase
        let map = coupons
            .into_iter()
            .map(|c| (coupon_key(&c.tenant_id, &c.code), c))
            .collect::<HashMap<_, _>>();
        Self {
            inner: Arc::new(RwLock::new(map)),
        }
    }
}

#[async_trait]
impl CouponRepository for InMemoryCouponRepository {
    async fn get_coupon(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> Result<Coupon, CouponRepositoryError> {
        self.inner
            .safe_read()
            .get(&coupon_key(tenant_id, code))
            .cloned()
            .ok_or(CouponRepositoryError::NotFound)
    }

    async fn list_coupons(&self, tenant_id: &str) -> Result<Vec<Coupon>, CouponRepositoryError> {
        // Per spec: only return active coupons (consistent with PostgreSQL/MongoDB)
        Ok(self
            .inner
            .safe_read()
            .values()
            .filter(|c| c.active && c.tenant_id == tenant_id)
            .cloned()
            .collect())
    }

    async fn get_auto_apply_coupons_for_payment(
        &self,
        tenant_id: &str,
        product_id: &str,
        payment_method: &PaymentMethod,
    ) -> Result<Vec<Coupon>, CouponRepositoryError> {
        let pm = match payment_method {
            PaymentMethod::Stripe => "stripe",
            PaymentMethod::X402 => "x402",
            PaymentMethod::Credits => "credits",
        };
        let now = chrono::Utc::now();
        Ok(self
            .inner
            .safe_read()
            .values()
            .filter(|c| c.auto_apply && c.active && c.tenant_id == tenant_id)
            .filter(|c| c.payment_method.is_empty() || c.payment_method.eq_ignore_ascii_case(pm))
            .filter(|c| {
                c.scope.eq_ignore_ascii_case("all")
                    || c.product_ids
                        .iter()
                        .any(|pid| pid.eq_ignore_ascii_case(product_id))
            })
            // Per spec: validate date range and usage limits
            .filter(|c| c.starts_at.map_or(true, |s| s <= now))
            .filter(|c| c.expires_at.map_or(true, |e| e > now))
            .filter(|c| c.usage_limit.map_or(true, |limit| c.usage_count < limit))
            .cloned()
            .collect())
    }

    async fn get_all_auto_apply_coupons_for_payment(
        &self,
        tenant_id: &str,
        payment_method: &PaymentMethod,
    ) -> Result<HashMap<String, Vec<Coupon>>, CouponRepositoryError> {
        let pm = match payment_method {
            PaymentMethod::Stripe => "stripe",
            PaymentMethod::X402 => "x402",
            PaymentMethod::Credits => "credits",
        };
        let now = chrono::Utc::now();
        let mut map: HashMap<String, Vec<Coupon>> = HashMap::new();
        for c in self.inner.safe_read().values() {
            if c.tenant_id != tenant_id {
                continue;
            }
            if !c.auto_apply || !c.active {
                continue;
            }
            if !(c.payment_method.is_empty() || c.payment_method.eq_ignore_ascii_case(pm)) {
                continue;
            }
            // Per spec: validate date range and usage limits
            if let Some(s) = c.starts_at {
                if s > now {
                    continue;
                }
            }
            if let Some(e) = c.expires_at {
                if e <= now {
                    continue;
                }
            }
            if let Some(limit) = c.usage_limit {
                if c.usage_count >= limit {
                    continue;
                }
            }
            if c.scope.eq_ignore_ascii_case("all") {
                continue;
            }
            for pid in &c.product_ids {
                map.entry(pid.clone()).or_default().push(c.clone());
            }
        }
        Ok(map)
    }

    async fn create_coupon(&self, coupon: Coupon) -> Result<(), CouponRepositoryError> {
        self.inner
            .safe_write()
            .insert(coupon_key(&coupon.tenant_id, &coupon.code), coupon);
        Ok(())
    }

    async fn update_coupon(&self, coupon: Coupon) -> Result<(), CouponRepositoryError> {
        self.inner
            .safe_write()
            .insert(coupon_key(&coupon.tenant_id, &coupon.code), coupon);
        Ok(())
    }

    async fn increment_usage(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> Result<(), CouponRepositoryError> {
        let key = coupon_key(tenant_id, code);
        if let Some(c) = self.inner.safe_write().get_mut(&key) {
            c.usage_count += 1;
            Ok(())
        } else {
            Err(CouponRepositoryError::NotFound)
        }
    }

    async fn try_increment_usage_atomic(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> Result<bool, CouponRepositoryError> {
        let key = coupon_key(tenant_id, code);
        if let Some(c) = self.inner.safe_write().get_mut(&key) {
            // Check limit before incrementing
            if let Some(limit) = c.usage_limit {
                if c.usage_count >= limit {
                    return Ok(false); // Limit reached
                }
            }
            c.usage_count += 1;
            Ok(true)
        } else {
            // Coupon not found - return false (caller should have validated existence)
            Ok(false)
        }
    }

    async fn delete_coupon(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> Result<(), CouponRepositoryError> {
        self.inner.safe_write().remove(&coupon_key(tenant_id, code));
        Ok(())
    }

    async fn close(&self) -> Result<(), CouponRepositoryError> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[tokio::test]
    async fn test_list_products_filters_inactive() {
        let active = Product {
            id: "active-1".to_string(),
            tenant_id: "tenant-a".to_string(),
            description: "active".to_string(),
            active: true,
            ..Default::default()
        };

        let inactive = Product {
            id: "inactive-1".to_string(),
            tenant_id: "tenant-a".to_string(),
            description: "inactive".to_string(),
            active: false,
            ..Default::default()
        };

        let repo = InMemoryProductRepository::new(vec![active.clone(), inactive]);
        let products = repo.list_products("tenant-a").await.unwrap();

        assert_eq!(products.len(), 1);
        assert_eq!(products[0].id, active.id);
    }

    #[tokio::test]
    async fn test_list_products_paginated_orders_by_created_at() {
        let first = Product {
            id: "first".to_string(),
            tenant_id: "tenant-a".to_string(),
            description: "first".to_string(),
            active: true,
            created_at: Some(Utc::now() - chrono::Duration::minutes(10)),
            ..Default::default()
        };

        let second = Product {
            id: "second".to_string(),
            tenant_id: "tenant-a".to_string(),
            description: "second".to_string(),
            active: true,
            created_at: Some(Utc::now() - chrono::Duration::minutes(5)),
            ..Default::default()
        };

        let third = Product {
            id: "third".to_string(),
            tenant_id: "tenant-a".to_string(),
            description: "third".to_string(),
            active: true,
            created_at: Some(Utc::now()),
            ..Default::default()
        };

        let repo = InMemoryProductRepository::new(vec![first, second, third]);
        let page = repo
            .list_products_paginated("tenant-a", 2, 0)
            .await
            .unwrap();

        assert_eq!(page.len(), 2);
        assert_eq!(page[0].id, "third");
        assert_eq!(page[1].id, "second");
    }

    #[tokio::test]
    async fn test_decrement_inventory_atomic() {
        let product = Product {
            id: "res-1".to_string(),
            tenant_id: "tenant-a".to_string(),
            description: "desc".to_string(),
            active: true,
            inventory_quantity: Some(2),
            ..Default::default()
        };

        let repo = InMemoryProductRepository::new(vec![product]);
        let result = repo
            .decrement_inventory_atomic("tenant-a", "res-1", 1, false)
            .await
            .unwrap()
            .expect("tracked inventory");
        assert_eq!(result, (2, 1));

        let err = repo
            .decrement_inventory_atomic("tenant-a", "res-1", 5, false)
            .await
            .expect_err("expected out of stock");
        assert!(matches!(err, ProductRepositoryError::Validation(_)));

        let result = repo
            .decrement_inventory_atomic("tenant-a", "res-1", 5, true)
            .await
            .unwrap()
            .expect("tracked inventory");
        assert_eq!(result, (1, -4));

        let updated = repo.get_product("tenant-a", "res-1").await.unwrap();
        assert_eq!(updated.inventory_quantity, Some(-4));
    }
}
