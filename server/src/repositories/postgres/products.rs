//! PostgreSQL-backed product repository

use std::collections::HashMap;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::{FromRow, PgPool};

use crate::models::money::{get_asset, Money};
use crate::models::{
    CheckoutRequirements, FulfillmentInfo, Product, ProductImage, ProductVariant,
    ProductVariationConfig, SubscriptionConfig,
};
use crate::repositories::{ProductRepository, ProductRepositoryError};

use super::validation::validate_table_name;

/// PostgreSQL row for products
#[derive(Debug, FromRow)]
struct ProductRow {
    id: String,
    tenant_id: String,
    title: Option<String>,
    short_description: Option<String>,
    slug: Option<String>,
    seo_title: Option<String>,
    seo_description: Option<String>,
    description: String,
    tags: Option<serde_json::Value>,
    category_ids: Option<serde_json::Value>,
    images: Option<serde_json::Value>,
    featured: bool,
    sort_order: Option<i32>,
    shipping_profile: Option<String>,
    checkout_requirements: Option<serde_json::Value>,
    fulfillment: Option<serde_json::Value>,
    fiat_amount_atomic: Option<i64>,
    fiat_currency: Option<String>,
    compare_at_fiat_amount_atomic: Option<i64>,
    compare_at_fiat_currency: Option<String>,
    stripe_product_id: Option<String>,
    stripe_price_id: Option<String>,
    crypto_amount_atomic: Option<i64>,
    crypto_token: Option<String>,
    inventory_status: Option<String>,
    inventory_quantity: Option<i32>,
    inventory_policy: Option<String>,
    variants: Option<serde_json::Value>,
    variation_config: Option<serde_json::Value>,
    crypto_account: Option<String>,
    memo_template: Option<String>,
    metadata: Option<serde_json::Value>,
    active: bool,
    subscription_billing_period: Option<String>,
    subscription_billing_interval: Option<i32>,
    subscription_trial_days: Option<i32>,
    subscription_stripe_price_id: Option<String>,
    subscription_allow_x402: Option<bool>,
    subscription_grace_period_hours: Option<i32>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

const PRODUCT_SELECT_COLUMNS: &str = r#"
    id, tenant_id, title, short_description, slug, seo_title, seo_description, description,
    tags, category_ids, images, featured, sort_order,
    shipping_profile, checkout_requirements, fulfillment,
    fiat_amount_atomic, fiat_currency, compare_at_fiat_amount_atomic, compare_at_fiat_currency,
    stripe_product_id, stripe_price_id,
    crypto_amount_atomic, crypto_token, inventory_status, inventory_quantity, inventory_policy,
    variants, variation_config, crypto_account, memo_template,
    metadata, active, subscription_billing_period, subscription_billing_interval,
    subscription_trial_days, subscription_stripe_price_id, subscription_allow_x402,
    subscription_grace_period_hours, created_at, updated_at
"#;

impl ProductRow {
    fn into_product(self) -> Product {
        let fiat_price = match (self.fiat_amount_atomic, &self.fiat_currency) {
            (Some(atomic), Some(currency)) => {
                get_asset(currency).map(|asset| Money { asset, atomic })
            }
            _ => None,
        };

        let compare_at_fiat_price = match (
            self.compare_at_fiat_amount_atomic,
            &self.compare_at_fiat_currency,
        ) {
            (Some(atomic), Some(currency)) => {
                get_asset(currency).map(|asset| Money { asset, atomic })
            }
            _ => None,
        };

        let crypto_price = match (self.crypto_amount_atomic, &self.crypto_token) {
            (Some(atomic), Some(token)) => get_asset(token).map(|asset| Money { asset, atomic }),
            _ => None,
        };

        let subscription = self
            .subscription_billing_period
            .map(|period| SubscriptionConfig {
                billing_period: period,
                billing_interval: self.subscription_billing_interval.unwrap_or(1),
                trial_days: self.subscription_trial_days.unwrap_or(0),
                stripe_price_id: self.subscription_stripe_price_id,
                allow_x402: self.subscription_allow_x402.unwrap_or(false),
                grace_period_hours: self.subscription_grace_period_hours.unwrap_or(0),
            });

        let metadata: HashMap<String, String> = self
            .metadata
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default();

        let tags: Vec<String> = self
            .tags
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default();
        let category_ids: Vec<String> = self
            .category_ids
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default();
        let images: Vec<ProductImage> = self
            .images
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default();
        let variants: Vec<ProductVariant> = self
            .variants
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default();
        let variation_config: Option<ProductVariationConfig> = self
            .variation_config
            .and_then(|v| serde_json::from_value(v).ok());

        let checkout_requirements: Option<CheckoutRequirements> = self
            .checkout_requirements
            .and_then(|v| serde_json::from_value(v).ok());
        let fulfillment: Option<FulfillmentInfo> = self
            .fulfillment
            .and_then(|v| serde_json::from_value(v).ok());

        Product {
            id: self.id,
            tenant_id: self.tenant_id,
            title: self.title,
            short_description: self.short_description,
            slug: self.slug,
            seo_title: self.seo_title,
            seo_description: self.seo_description,
            description: self.description,
            tags,
            category_ids,
            images,
            featured: self.featured,
            sort_order: self.sort_order,
            shipping_profile: self.shipping_profile,
            checkout_requirements,
            fulfillment,
            fiat_price,
            compare_at_fiat_price,
            stripe_product_id: self.stripe_product_id,
            stripe_price_id: self.stripe_price_id,
            crypto_price,
            inventory_status: self.inventory_status,
            inventory_quantity: self.inventory_quantity,
            inventory_policy: self.inventory_policy,
            variants,
            variation_config,
            crypto_account: self.crypto_account,
            memo_template: self.memo_template,
            metadata,
            active: self.active,
            subscription,
            created_at: Some(self.created_at),
            updated_at: Some(self.updated_at),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::PostgresProductRepository;
    use sqlx::PgPool;

    #[tokio::test]
    async fn test_stripe_price_lookup_query_uses_single_column() {
        let pool = PgPool::connect_lazy("postgres://postgres:postgres@localhost/postgres")
            .expect("valid pool config");
        let repo = PostgresProductRepository::new(pool);

        let direct = repo.stripe_price_lookup_query("stripe_price_id");
        assert!(direct.contains("stripe_price_id"));
        assert!(!direct.contains(" OR "));

        let subscription = repo.stripe_price_lookup_query("subscription_stripe_price_id");
        assert!(subscription.contains("subscription_stripe_price_id"));
        assert!(!subscription.contains(" OR "));
    }
}

/// PostgreSQL product repository
pub struct PostgresProductRepository {
    pool: PgPool,
    table_name: String,
}

impl PostgresProductRepository {
    /// Create a new PostgreSQL product repository
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            table_name: "products".to_string(),
        }
    }

    /// Set custom table name
    ///
    /// Validates that the name matches the SQL identifier pattern
    /// to prevent SQL injection.
    ///
    /// # Panics
    /// Panics if the table name is invalid (doesn't match `^[a-zA-Z_][a-zA-Z0-9_]*$`).
    /// This is intentional: table names are set by operators at configuration time,
    /// not by end users. Invalid configuration should fail fast at startup rather
    /// than propagate errors through the entire call chain.
    pub fn with_table_name(mut self, name: &str) -> Self {
        if !validate_table_name(name) {
            panic!(
                "Invalid table name '{}': must match pattern ^[a-zA-Z_][a-zA-Z0-9_]*$",
                name
            );
        }
        self.table_name = name.to_string();
        self
    }

    fn stripe_price_lookup_query(&self, column: &str) -> String {
        format!(
            r#"
            SELECT {cols}
            FROM {table}
            WHERE tenant_id = $2 AND {column} = $1
            "#,
            cols = PRODUCT_SELECT_COLUMNS,
            table = self.table_name,
            column = column
        )
    }
}

#[async_trait]
impl ProductRepository for PostgresProductRepository {
    async fn get_product(
        &self,
        tenant_id: &str,
        id: &str,
    ) -> Result<Product, ProductRepositoryError> {
        let query = format!(
            r#"
            SELECT {cols}
            FROM {table}
            WHERE id = $1 AND tenant_id = $2
            "#,
            cols = PRODUCT_SELECT_COLUMNS,
            table = self.table_name
        );

        let row: ProductRow = sqlx::query_as(&query)
            .bind(id)
            .bind(tenant_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?
            .ok_or(ProductRepositoryError::NotFound)?;

        Ok(row.into_product())
    }

    async fn get_product_by_stripe_price_id(
        &self,
        tenant_id: &str,
        stripe_price_id: &str,
    ) -> Result<Product, ProductRepositoryError> {
        let direct_query = self.stripe_price_lookup_query("stripe_price_id");
        if let Some(row) = sqlx::query_as::<_, ProductRow>(&direct_query)
            .bind(stripe_price_id)
            .bind(tenant_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?
        {
            return Ok(row.into_product());
        }

        let sub_query = self.stripe_price_lookup_query("subscription_stripe_price_id");
        let row: ProductRow = sqlx::query_as(&sub_query)
            .bind(stripe_price_id)
            .bind(tenant_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?
            .ok_or(ProductRepositoryError::NotFound)?;

        Ok(row.into_product())
    }

    async fn get_product_by_slug(
        &self,
        tenant_id: &str,
        slug: &str,
    ) -> Result<Product, ProductRepositoryError> {
        let query = format!(
            r#"
            SELECT {cols}
            FROM {table}
            WHERE tenant_id = $1 AND slug = $2 AND active = true
            LIMIT 1
            "#,
            cols = PRODUCT_SELECT_COLUMNS,
            table = self.table_name
        );

        let row: ProductRow = sqlx::query_as(&query)
            .bind(tenant_id)
            .bind(slug)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?
            .ok_or(ProductRepositoryError::NotFound)?;

        Ok(row.into_product())
    }

    async fn list_products(&self, tenant_id: &str) -> Result<Vec<Product>, ProductRepositoryError> {
        let query = format!(
            r#"
            SELECT {cols}
            FROM {table}
            WHERE tenant_id = $1 AND active = true
            ORDER BY sort_order ASC NULLS LAST, created_at DESC
            "#,
            cols = PRODUCT_SELECT_COLUMNS,
            table = self.table_name
        );

        let rows: Vec<ProductRow> = sqlx::query_as(&query)
            .bind(tenant_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        Ok(rows.into_iter().map(|r| r.into_product()).collect())
    }

    async fn list_all_products(
        &self,
        tenant_id: &str,
    ) -> Result<Vec<Product>, ProductRepositoryError> {
        let query = format!(
            r#"
            SELECT {cols}
            FROM {table}
            WHERE tenant_id = $1
            ORDER BY sort_order ASC NULLS LAST, created_at DESC
            "#,
            cols = PRODUCT_SELECT_COLUMNS,
            table = self.table_name
        );

        let rows: Vec<ProductRow> = sqlx::query_as(&query)
            .bind(tenant_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        Ok(rows.into_iter().map(|r| r.into_product()).collect())
    }

    async fn count_all_products(&self, tenant_id: &str) -> Result<i64, ProductRepositoryError> {
        let query = format!(
            r#"
            SELECT COUNT(*)
            FROM {table}
            WHERE tenant_id = $1
            "#,
            table = self.table_name
        );

        let (count,): (i64,) = sqlx::query_as(&query)
            .bind(tenant_id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        Ok(count)
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

        let limit = i64::try_from(limit)
            .map_err(|_| ProductRepositoryError::Validation("limit out of range".to_string()))?;
        let offset = i64::try_from(offset)
            .map_err(|_| ProductRepositoryError::Validation("offset out of range".to_string()))?;

        let query = format!(
            r#"
            SELECT {cols}
            FROM {table}
            WHERE tenant_id = $1 AND active = true
            ORDER BY sort_order ASC NULLS LAST, created_at DESC
            LIMIT $2 OFFSET $3
            "#,
            cols = PRODUCT_SELECT_COLUMNS,
            table = self.table_name
        );

        let rows: Vec<ProductRow> = sqlx::query_as(&query)
            .bind(tenant_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        Ok(rows.into_iter().map(|r| r.into_product()).collect())
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

        let limit = i64::try_from(limit)
            .map_err(|_| ProductRepositoryError::Validation("limit out of range".to_string()))?;
        let offset = i64::try_from(offset)
            .map_err(|_| ProductRepositoryError::Validation("offset out of range".to_string()))?;

        let query = format!(
            r#"
            SELECT {cols}
            FROM {table}
            WHERE tenant_id = $1
            ORDER BY sort_order ASC NULLS LAST, created_at DESC
            LIMIT $2 OFFSET $3
            "#,
            cols = PRODUCT_SELECT_COLUMNS,
            table = self.table_name
        );

        let rows: Vec<ProductRow> = sqlx::query_as(&query)
            .bind(tenant_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        Ok(rows.into_iter().map(|r| r.into_product()).collect())
    }

    async fn create_product(&self, product: Product) -> Result<(), ProductRepositoryError> {
        let (fiat_amount_atomic, fiat_currency) = match &product.fiat_price {
            Some(m) => (Some(m.atomic), Some(m.asset.code.clone())),
            None => (None, None),
        };

        let (compare_at_fiat_amount_atomic, compare_at_fiat_currency) =
            match &product.compare_at_fiat_price {
                Some(m) => (Some(m.atomic), Some(m.asset.code.clone())),
                None => (None, None),
            };

        let (crypto_amount_atomic, crypto_token) = match &product.crypto_price {
            Some(m) => (Some(m.atomic), Some(m.asset.code.clone())),
            None => (None, None),
        };

        let metadata = serde_json::to_value(&product.metadata)
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        let tags = serde_json::to_value(&product.tags)
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;
        let category_ids = serde_json::to_value(&product.category_ids)
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;
        let images = serde_json::to_value(&product.images)
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;
        let variants = serde_json::to_value(&product.variants)
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;
        let variation_config: Option<serde_json::Value> = product
            .variation_config
            .as_ref()
            .map(serde_json::to_value)
            .transpose()
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        let checkout_requirements: Option<serde_json::Value> = product
            .checkout_requirements
            .as_ref()
            .map(serde_json::to_value)
            .transpose()
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;
        let fulfillment: Option<serde_json::Value> = product
            .fulfillment
            .as_ref()
            .map(serde_json::to_value)
            .transpose()
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        let (sub_period, sub_interval, sub_trial, sub_stripe, sub_x402, sub_grace) =
            match &product.subscription {
                Some(s) => (
                    Some(s.billing_period.clone()),
                    Some(s.billing_interval),
                    Some(s.trial_days),
                    s.stripe_price_id.clone(),
                    Some(s.allow_x402),
                    Some(s.grace_period_hours),
                ),
                None => (None, None, None, None, None, None),
            };

        let now = Utc::now();
        let query = format!(
            r#"
            INSERT INTO {} (
                id, tenant_id, title, short_description, slug, seo_title, seo_description, description,
                tags, category_ids, images, featured, sort_order,
                shipping_profile, checkout_requirements, fulfillment,
                fiat_amount_atomic, fiat_currency, compare_at_fiat_amount_atomic, compare_at_fiat_currency,
                stripe_product_id, stripe_price_id,
                crypto_amount_atomic, crypto_token, inventory_status, variants, variation_config,
                crypto_account, memo_template,
                metadata, active, subscription_billing_period, subscription_billing_interval,
                subscription_trial_days, subscription_stripe_price_id, subscription_allow_x402,
                subscription_grace_period_hours, inventory_quantity, inventory_policy, created_at, updated_at
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13,
                $14, $15, $16,
                $17, $18, $19, $20,
                $21, $22,
                $23, $24, $25, $26, $27,
                $28, $29,
                $30, $31, $32, $33, $34, $35, $36, $37,
                $38, $39, $40, $41
            )
            "#,
            self.table_name
        );

        sqlx::query(&query)
            .bind(&product.id)
            .bind(&product.tenant_id)
            .bind(&product.title)
            .bind(&product.short_description)
            .bind(&product.slug)
            .bind(&product.seo_title)
            .bind(&product.seo_description)
            .bind(&product.description)
            .bind(&tags)
            .bind(&category_ids)
            .bind(&images)
            .bind(product.featured)
            .bind(product.sort_order)
            .bind(&product.shipping_profile)
            .bind(&checkout_requirements)
            .bind(&fulfillment)
            .bind(fiat_amount_atomic)
            .bind(fiat_currency)
            .bind(compare_at_fiat_amount_atomic)
            .bind(compare_at_fiat_currency)
            .bind(&product.stripe_product_id)
            .bind(&product.stripe_price_id)
            .bind(crypto_amount_atomic)
            .bind(crypto_token)
            .bind(&product.inventory_status)
            .bind(&variants)
            .bind(&variation_config)
            .bind(&product.crypto_account)
            .bind(&product.memo_template)
            .bind(&metadata)
            .bind(product.active)
            .bind(sub_period)
            .bind(sub_interval)
            .bind(sub_trial)
            .bind(sub_stripe)
            .bind(sub_x402)
            .bind(sub_grace)
            .bind(product.inventory_quantity)
            .bind(&product.inventory_policy)
            .bind(now)
            .bind(now)
            .execute(&self.pool)
            .await
            .map_err(|e| {
                // BUG-009: Use proper sqlx error introspection for conflict detection
                if let Some(db_err) = e.as_database_error() {
                    // PostgreSQL unique violation code is "23505"
                    if matches!(db_err.code().as_deref(), Some("23505")) {
                        return ProductRepositoryError::Conflict;
                    }
                }
                // Fallback to string matching for compatibility with other DB backends
                if e.to_string().contains("duplicate") || e.to_string().contains("unique") {
                    ProductRepositoryError::Conflict
                } else {
                    ProductRepositoryError::Storage(e.to_string())
                }
            })?;

        Ok(())
    }

    async fn update_product(&self, product: Product) -> Result<(), ProductRepositoryError> {
        let (fiat_amount_atomic, fiat_currency) = match &product.fiat_price {
            Some(m) => (Some(m.atomic), Some(m.asset.code.clone())),
            None => (None, None),
        };

        let (compare_at_fiat_amount_atomic, compare_at_fiat_currency) =
            match &product.compare_at_fiat_price {
                Some(m) => (Some(m.atomic), Some(m.asset.code.clone())),
                None => (None, None),
            };

        let (crypto_amount_atomic, crypto_token) = match &product.crypto_price {
            Some(m) => (Some(m.atomic), Some(m.asset.code.clone())),
            None => (None, None),
        };

        let metadata = serde_json::to_value(&product.metadata)
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        let tags = serde_json::to_value(&product.tags)
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;
        let category_ids = serde_json::to_value(&product.category_ids)
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;
        let images = serde_json::to_value(&product.images)
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;
        let variants = serde_json::to_value(&product.variants)
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;
        let variation_config: Option<serde_json::Value> = product
            .variation_config
            .as_ref()
            .map(serde_json::to_value)
            .transpose()
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        let checkout_requirements: Option<serde_json::Value> = product
            .checkout_requirements
            .as_ref()
            .map(serde_json::to_value)
            .transpose()
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;
        let fulfillment: Option<serde_json::Value> = product
            .fulfillment
            .as_ref()
            .map(serde_json::to_value)
            .transpose()
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        let (sub_period, sub_interval, sub_trial, sub_stripe, sub_x402, sub_grace) =
            match &product.subscription {
                Some(s) => (
                    Some(s.billing_period.clone()),
                    Some(s.billing_interval),
                    Some(s.trial_days),
                    s.stripe_price_id.clone(),
                    Some(s.allow_x402),
                    Some(s.grace_period_hours),
                ),
                None => (None, None, None, None, None, None),
            };

        // STOR-001: Include tenant_id in WHERE clause to prevent cross-tenant updates
        let query = format!(
            r#"
            UPDATE {} SET
                title = $2,
                short_description = $3,
                slug = $4,
                seo_title = $5,
                seo_description = $6,
                description = $7,
                tags = $8,
                category_ids = $9,
                images = $10,
                featured = $11,
                sort_order = $12,
                shipping_profile = $13,
                checkout_requirements = $14,
                fulfillment = $15,
                fiat_amount_atomic = $16,
                fiat_currency = $17,
                compare_at_fiat_amount_atomic = $18,
                compare_at_fiat_currency = $19,
                stripe_product_id = $20,
                stripe_price_id = $21,
                crypto_amount_atomic = $22,
                crypto_token = $23,
                inventory_status = $24,
                variants = $25,
                variation_config = $26,
                crypto_account = $27,
                memo_template = $28,
                metadata = $29,
                active = $30,
                subscription_billing_period = $31,
                subscription_billing_interval = $32,
                subscription_trial_days = $33,
                subscription_stripe_price_id = $34,
                subscription_allow_x402 = $35,
                subscription_grace_period_hours = $36,
                inventory_quantity = $37,
                inventory_policy = $38,
                updated_at = $39
            WHERE id = $1 AND tenant_id = $40
            "#,
            self.table_name
        );

        let result = sqlx::query(&query)
            .bind(&product.id)
            .bind(&product.title)
            .bind(&product.short_description)
            .bind(&product.slug)
            .bind(&product.seo_title)
            .bind(&product.seo_description)
            .bind(&product.description)
            .bind(&tags)
            .bind(&category_ids)
            .bind(&images)
            .bind(product.featured)
            .bind(product.sort_order)
            .bind(&product.shipping_profile)
            .bind(&checkout_requirements)
            .bind(&fulfillment)
            .bind(fiat_amount_atomic)
            .bind(fiat_currency)
            .bind(compare_at_fiat_amount_atomic)
            .bind(compare_at_fiat_currency)
            .bind(&product.stripe_product_id)
            .bind(&product.stripe_price_id)
            .bind(crypto_amount_atomic)
            .bind(crypto_token)
            .bind(&product.inventory_status)
            .bind(&variants)
            .bind(&variation_config)
            .bind(&product.crypto_account)
            .bind(&product.memo_template)
            .bind(&metadata)
            .bind(product.active)
            .bind(sub_period)
            .bind(sub_interval)
            .bind(sub_trial)
            .bind(sub_stripe)
            .bind(sub_x402)
            .bind(sub_grace)
            .bind(product.inventory_quantity)
            .bind(&product.inventory_policy)
            .bind(Utc::now())
            .bind(&product.tenant_id) // $40: tenant isolation
            .execute(&self.pool)
            .await
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(ProductRepositoryError::NotFound);
        }

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

        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        let select_query = format!(
            "SELECT inventory_quantity FROM {} WHERE tenant_id = $1 AND id = $2 FOR UPDATE",
            self.table_name
        );
        let row: Option<(Option<i32>,)> = sqlx::query_as(&select_query)
            .bind(tenant_id)
            .bind(product_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        let current = match row {
            Some((value,)) => value,
            None => {
                tx.rollback()
                    .await
                    .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;
                return Err(ProductRepositoryError::NotFound);
            }
        };

        let current = match current {
            Some(value) => value,
            None => {
                tx.commit()
                    .await
                    .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;
                return Ok(None);
            }
        };

        if current < quantity && !allow_backorder {
            tx.rollback()
                .await
                .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;
            return Err(ProductRepositoryError::Validation(
                "out of stock".to_string(),
            ));
        }

        let next = current - quantity;
        let update_query = format!(
            "UPDATE {} SET inventory_quantity = $3, updated_at = $4 WHERE tenant_id = $1 AND id = $2",
            self.table_name
        );
        sqlx::query(&update_query)
            .bind(tenant_id)
            .bind(product_id)
            .bind(next)
            .bind(Utc::now())
            .execute(&mut *tx)
            .await
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        tx.commit()
            .await
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        Ok(Some((current, next)))
    }

    async fn delete_product(
        &self,
        tenant_id: &str,
        id: &str,
    ) -> Result<(), ProductRepositoryError> {
        let query = format!(
            "DELETE FROM {} WHERE id = $1 AND tenant_id = $2",
            self.table_name
        );

        let result = sqlx::query(&query)
            .bind(id)
            .bind(tenant_id)
            .execute(&self.pool)
            .await
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(ProductRepositoryError::NotFound);
        }

        Ok(())
    }

    async fn close(&self) -> Result<(), ProductRepositoryError> {
        Ok(())
    }

    /// Batch get products by IDs - single query with WHERE id = ANY($1)
    /// Much more efficient than N individual queries
    async fn get_products_by_ids(
        &self,
        tenant_id: &str,
        ids: &[String],
    ) -> Result<Vec<Product>, ProductRepositoryError> {
        if ids.is_empty() {
            return Ok(Vec::new());
        }

        let query = format!(
            r#"
            SELECT {cols}
            FROM {table}
            WHERE id = ANY($1) AND tenant_id = $2
            "#,
            cols = PRODUCT_SELECT_COLUMNS,
            table = self.table_name
        );

        let rows: Vec<ProductRow> = sqlx::query_as(&query)
            .bind(ids)
            .bind(tenant_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| ProductRepositoryError::Storage(e.to_string()))?;

        Ok(rows.into_iter().map(|r| r.into_product()).collect())
    }
}
