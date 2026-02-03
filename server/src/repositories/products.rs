use async_trait::async_trait;
use thiserror::Error;

use crate::models::Product;

#[derive(Debug, Error)]
pub enum ProductRepositoryError {
    #[error("not found")]
    NotFound,
    #[error("conflict")]
    Conflict,
    #[error("validation failed: {0}")]
    Validation(String),
    #[error("storage error: {0}")]
    Storage(String),
    #[error("unknown error: {0}")]
    Unknown(String),
}

#[async_trait]
pub trait ProductRepository: Send + Sync {
    async fn get_product(
        &self,
        tenant_id: &str,
        id: &str,
    ) -> Result<Product, ProductRepositoryError>;
    async fn get_product_by_stripe_price_id(
        &self,
        tenant_id: &str,
        stripe_price_id: &str,
    ) -> Result<Product, ProductRepositoryError>;

    /// Lookup active product by slug for storefront routing.
    ///
    /// Default implementation falls back to `list_products()`.
    async fn get_product_by_slug(
        &self,
        tenant_id: &str,
        slug: &str,
    ) -> Result<Product, ProductRepositoryError> {
        let products = self.list_products(tenant_id).await?;
        products
            .into_iter()
            .find(|p| p.slug.as_deref() == Some(slug))
            .ok_or(ProductRepositoryError::NotFound)
    }
    async fn list_products(&self, tenant_id: &str) -> Result<Vec<Product>, ProductRepositoryError>;

    /// List all products for admin use (includes inactive).
    ///
    /// Default implementation falls back to `list_products()` for backwards compatibility.
    async fn list_all_products(
        &self,
        tenant_id: &str,
    ) -> Result<Vec<Product>, ProductRepositoryError> {
        self.list_products(tenant_id).await
    }

    /// Total count for admin listings (includes inactive).
    ///
    /// Default implementation counts the result of `list_all_products()`.
    async fn count_all_products(&self, tenant_id: &str) -> Result<i64, ProductRepositoryError> {
        let products = self.list_all_products(tenant_id).await?;
        Ok(products.len() as i64)
    }

    /// List active products with pagination (database-level LIMIT/OFFSET).
    ///
    /// M-002: This method MUST be implemented with database-level pagination.
    /// Default implementation removed to prevent OOM from in-memory pagination.
    async fn list_products_paginated(
        &self,
        tenant_id: &str,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<Product>, ProductRepositoryError>;

    /// List all products (includes inactive) with pagination (database-level LIMIT/OFFSET).
    ///
    /// M-002: This method MUST be implemented with database-level pagination.
    /// Default implementation removed to prevent OOM from in-memory pagination.
    async fn list_all_products_paginated(
        &self,
        tenant_id: &str,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<Product>, ProductRepositoryError>;
    async fn create_product(&self, product: Product) -> Result<(), ProductRepositoryError>;
    async fn update_product(&self, product: Product) -> Result<(), ProductRepositoryError>;
    /// Atomically decrement inventory and return (before, after) quantities when tracked.
    async fn decrement_inventory_atomic(
        &self,
        tenant_id: &str,
        product_id: &str,
        quantity: i32,
        allow_backorder: bool,
    ) -> Result<Option<(i32, i32)>, ProductRepositoryError>;
    async fn delete_product(&self, tenant_id: &str, id: &str)
        -> Result<(), ProductRepositoryError>;
    async fn close(&self) -> Result<(), ProductRepositoryError>;

    /// Batch get products by IDs - more efficient than individual gets
    /// Default implementation falls back to individual gets for backwards compatibility
    async fn get_products_by_ids(
        &self,
        tenant_id: &str,
        ids: &[String],
    ) -> Result<Vec<Product>, ProductRepositoryError> {
        let mut products = Vec::with_capacity(ids.len());
        for id in ids {
            match self.get_product(tenant_id, id).await {
                Ok(p) => products.push(p),
                Err(ProductRepositoryError::NotFound) => {
                    // Skip not found - caller can check if all were returned
                }
                Err(e) => return Err(e),
            }
        }
        Ok(products)
    }
}
