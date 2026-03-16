use async_trait::async_trait;
use thiserror::Error;

use crate::models::{FulfillmentInfo, Money, Product, ProductVariant, SubscriptionConfig};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct DiscoveryProduct {
    pub id: String,
    pub description: String,
    pub fiat_price: Option<Money>,
    pub crypto_price: Option<Money>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone)]
pub struct ProductsTxtProduct {
    pub id: String,
    pub title: Option<String>,
    pub slug: Option<String>,
    pub short_description: Option<String>,
    pub description: String,
    pub tags: Vec<String>,
    pub category_ids: Vec<String>,
    pub featured: bool,
    pub fiat_price: Option<Money>,
    pub compare_at_fiat_price: Option<Money>,
    pub crypto_price: Option<Money>,
    pub inventory_status: Option<String>,
    pub inventory_quantity: Option<i32>,
    pub inventory_policy: Option<String>,
    pub variants: Vec<ProductVariant>,
    pub fulfillment: Option<FulfillmentInfo>,
    pub subscription: Option<SubscriptionConfig>,
}

#[derive(Debug, Clone)]
pub struct AiCatalogProduct {
    pub id: String,
    pub title: Option<String>,
    pub description: String,
    pub tags: Vec<String>,
    pub category_ids: Vec<String>,
}

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

    async fn list_discovery_products(
        &self,
        tenant_id: &str,
    ) -> Result<Vec<DiscoveryProduct>, ProductRepositoryError> {
        let products = self.list_products(tenant_id).await?;
        Ok(products
            .into_iter()
            .map(|product| DiscoveryProduct {
                id: product.id,
                description: product.description,
                fiat_price: product.fiat_price,
                crypto_price: product.crypto_price,
                metadata: product.metadata,
            })
            .collect())
    }

    async fn list_products_txt_products(
        &self,
        tenant_id: &str,
    ) -> Result<Vec<ProductsTxtProduct>, ProductRepositoryError> {
        let products = self.list_products(tenant_id).await?;
        Ok(products
            .into_iter()
            .map(|product| ProductsTxtProduct {
                id: product.id,
                title: product.title,
                slug: product.slug,
                short_description: product.short_description,
                description: product.description,
                tags: product.tags,
                category_ids: product.category_ids,
                featured: product.featured,
                fiat_price: product.fiat_price,
                compare_at_fiat_price: product.compare_at_fiat_price,
                crypto_price: product.crypto_price,
                inventory_status: product.inventory_status,
                inventory_quantity: product.inventory_quantity,
                inventory_policy: product.inventory_policy,
                variants: product.variants,
                fulfillment: product.fulfillment,
                subscription: product.subscription,
            })
            .collect())
    }

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

    async fn count_active_products(&self, tenant_id: &str) -> Result<i64, ProductRepositoryError> {
        let products = self.list_products(tenant_id).await?;
        Ok(products.len() as i64)
    }

    async fn list_active_product_ids(
        &self,
        tenant_id: &str,
    ) -> Result<Vec<String>, ProductRepositoryError> {
        let products = self.list_products(tenant_id).await?;
        Ok(products.into_iter().map(|product| product.id).collect())
    }

    async fn list_related_products_candidates(
        &self,
        tenant_id: &str,
        exclude_id: Option<&str>,
        limit: usize,
    ) -> Result<Vec<AiCatalogProduct>, ProductRepositoryError> {
        if limit == 0 {
            return Ok(Vec::new());
        }

        let products = self.list_products(tenant_id).await?;
        Ok(products
            .into_iter()
            .filter(|product| exclude_id.is_none_or(|id| product.id != id))
            .take(limit)
            .map(|product| AiCatalogProduct {
                id: product.id,
                title: product.title,
                description: product.description,
                tags: product.tags,
                category_ids: product.category_ids,
            })
            .collect())
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

    /// List active products from a collection in the exact collection order with pagination.
    ///
    /// Default implementation preserves behavior by filtering the provided IDs in memory after a
    /// batch load. Database-backed repositories should override this to push ordering and
    /// pagination down to storage.
    async fn list_collection_products_paginated(
        &self,
        tenant_id: &str,
        collection_product_ids: &[String],
        limit: usize,
        offset: usize,
    ) -> Result<Vec<Product>, ProductRepositoryError> {
        if limit == 0 || collection_product_ids.is_empty() {
            return Ok(Vec::new());
        }

        let items = self
            .get_products_by_ids(tenant_id, collection_product_ids)
            .await?;
        let mut products_by_id: HashMap<String, Product> = HashMap::with_capacity(items.len());
        for product in items {
            if product.active {
                products_by_id.insert(product.id.clone(), product);
            }
        }

        let mut ordered_active = Vec::new();
        let target_len = offset.saturating_add(limit);
        for id in collection_product_ids {
            if let Some(product) = products_by_id.get(id) {
                ordered_active.push(product.clone());
                if ordered_active.len() >= target_len {
                    break;
                }
            }
        }

        if offset >= ordered_active.len() {
            return Ok(Vec::new());
        }

        let end = (offset + limit).min(ordered_active.len());
        Ok(ordered_active[offset..end].to_vec())
    }

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
