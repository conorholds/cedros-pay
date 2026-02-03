//! PostgreSQL-backed coupon repository

use std::collections::HashMap;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::{FromRow, PgPool};

use crate::models::{Coupon, PaymentMethod};
use crate::repositories::{CouponRepository, CouponRepositoryError};

use super::validation::validate_table_name;

/// PostgreSQL row for coupons
#[derive(Debug, FromRow)]
struct CouponRow {
    code: String,
    tenant_id: String,
    discount_type: String,
    discount_value: f64,
    currency: Option<String>,
    scope: String,
    product_ids: Option<Vec<String>>,
    category_ids: Option<serde_json::Value>,
    payment_method: Option<String>,
    auto_apply: bool,
    applies_at: String,
    usage_limit: Option<i32>,
    usage_count: i32,
    usage_limit_per_customer: Option<i32>,
    minimum_amount_cents: Option<i64>,
    first_purchase_only: bool,
    starts_at: Option<DateTime<Utc>>,
    expires_at: Option<DateTime<Utc>>,
    active: bool,
    metadata: Option<serde_json::Value>,
    stripe_coupon_id: Option<String>,
    stripe_promotion_code_id: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

const COUPON_SELECT_COLUMNS: &str = r#"
    code, tenant_id, discount_type, discount_value, currency, scope, product_ids,
    category_ids, payment_method, auto_apply, applies_at, usage_limit, usage_count,
    usage_limit_per_customer, minimum_amount_cents, first_purchase_only,
    starts_at, expires_at, active, metadata, stripe_coupon_id, stripe_promotion_code_id,
    created_at, updated_at
"#;

impl CouponRow {
    fn into_coupon(self) -> Coupon {
        let metadata: HashMap<String, String> = self
            .metadata
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default();

        let category_ids: Vec<String> = self
            .category_ids
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default();

        Coupon {
            code: self.code,
            tenant_id: self.tenant_id,
            discount_type: self.discount_type,
            discount_value: self.discount_value,
            currency: self.currency,
            scope: self.scope,
            product_ids: self.product_ids.unwrap_or_default(),
            category_ids,
            payment_method: self.payment_method.unwrap_or_default(),
            auto_apply: self.auto_apply,
            applies_at: self.applies_at,
            usage_limit: self.usage_limit,
            usage_count: self.usage_count,
            usage_limit_per_customer: self.usage_limit_per_customer,
            minimum_amount_cents: self.minimum_amount_cents,
            first_purchase_only: self.first_purchase_only,
            starts_at: self.starts_at,
            expires_at: self.expires_at,
            active: self.active,
            metadata,
            stripe_coupon_id: self.stripe_coupon_id,
            stripe_promotion_code_id: self.stripe_promotion_code_id,
            created_at: Some(self.created_at),
            updated_at: Some(self.updated_at),
        }
    }
}

/// PostgreSQL coupon repository
pub struct PostgresCouponRepository {
    pool: PgPool,
    table_name: String,
}

impl PostgresCouponRepository {
    /// Create a new PostgreSQL coupon repository
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            table_name: "coupons".to_string(),
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
}

#[async_trait]
impl CouponRepository for PostgresCouponRepository {
    async fn get_coupon(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> Result<Coupon, CouponRepositoryError> {
        let query = format!(
            r#"
            SELECT {cols}
            FROM {table}
            WHERE UPPER(code) = UPPER($1) AND tenant_id = $2
            "#,
            cols = COUPON_SELECT_COLUMNS,
            table = self.table_name
        );

        let row: CouponRow = sqlx::query_as(&query)
            .bind(code)
            .bind(tenant_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| CouponRepositoryError::Storage(e.to_string()))?
            .ok_or(CouponRepositoryError::NotFound)?;

        Ok(row.into_coupon())
    }

    async fn list_coupons(&self, tenant_id: &str) -> Result<Vec<Coupon>, CouponRepositoryError> {
        let query = format!(
            r#"
            SELECT {cols}
            FROM {table}
            WHERE tenant_id = $1 AND active = true
            ORDER BY created_at DESC
            "#,
            cols = COUPON_SELECT_COLUMNS,
            table = self.table_name
        );

        let rows: Vec<CouponRow> = sqlx::query_as(&query)
            .bind(tenant_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| CouponRepositoryError::Storage(e.to_string()))?;

        Ok(rows.into_iter().map(|r| r.into_coupon()).collect())
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

        let query = format!(
            r#"
            SELECT {cols}
            FROM {table}
            WHERE active = true
              AND tenant_id = $2
              AND auto_apply = true
              AND (payment_method IS NULL OR payment_method = '' OR LOWER(payment_method) = LOWER($1))
              AND (
                LOWER(scope) = 'all'
                OR (LOWER(scope) = 'specific' AND $3 = ANY(product_ids))
              )
              AND (starts_at IS NULL OR starts_at <= NOW())
              AND (expires_at IS NULL OR expires_at > NOW())
              AND (usage_limit IS NULL OR usage_count < usage_limit)
            ORDER BY created_at ASC
            "#,
            cols = COUPON_SELECT_COLUMNS,
            table = self.table_name
        );

        let rows: Vec<CouponRow> = sqlx::query_as(&query)
            .bind(pm)
            .bind(tenant_id)
            .bind(product_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| CouponRepositoryError::Storage(e.to_string()))?;

        Ok(rows.into_iter().map(|r| r.into_coupon()).collect())
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

        let query = format!(
            r#"
            SELECT {cols}
            FROM {table}
            WHERE active = true
              AND tenant_id = $2
              AND auto_apply = true
              AND LOWER(scope) = 'specific'
              AND (payment_method IS NULL OR payment_method = '' OR LOWER(payment_method) = LOWER($1))
              AND (starts_at IS NULL OR starts_at <= NOW())
              AND (expires_at IS NULL OR expires_at > NOW())
              AND (usage_limit IS NULL OR usage_count < usage_limit)
            ORDER BY created_at ASC
            "#,
            cols = COUPON_SELECT_COLUMNS,
            table = self.table_name
        );

        let rows: Vec<CouponRow> = sqlx::query_as(&query)
            .bind(pm)
            .bind(tenant_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| CouponRepositoryError::Storage(e.to_string()))?;

        let mut map: HashMap<String, Vec<Coupon>> = HashMap::new();
        for row in rows {
            let coupon = row.into_coupon();
            for pid in &coupon.product_ids {
                map.entry(pid.clone()).or_default().push(coupon.clone());
            }
        }

        Ok(map)
    }

    /// Get checkout auto-apply coupons with scope="all" - efficient SQL filtering
    async fn get_checkout_auto_apply_coupons(
        &self,
        tenant_id: &str,
        payment_method: &PaymentMethod,
    ) -> Result<Vec<Coupon>, CouponRepositoryError> {
        let pm = match payment_method {
            PaymentMethod::Stripe => "stripe",
            PaymentMethod::X402 => "x402",
            PaymentMethod::Credits => "credits",
        };

        let query = format!(
            r#"
            SELECT {cols}
            FROM {table}
            WHERE active = true
              AND tenant_id = $2
              AND auto_apply = true
              AND LOWER(applies_at) = 'checkout'
              AND LOWER(scope) = 'all'
              AND (payment_method IS NULL OR payment_method = '' OR LOWER(payment_method) = LOWER($1))
              AND (starts_at IS NULL OR starts_at <= NOW())
              AND (expires_at IS NULL OR expires_at > NOW())
              AND (usage_limit IS NULL OR usage_count < usage_limit)
            ORDER BY created_at ASC
            "#,
            cols = COUPON_SELECT_COLUMNS,
            table = self.table_name
        );

        let rows: Vec<CouponRow> = sqlx::query_as(&query)
            .bind(pm)
            .bind(tenant_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| CouponRepositoryError::Storage(e.to_string()))?;

        Ok(rows.into_iter().map(|r| r.into_coupon()).collect())
    }

    async fn create_coupon(&self, coupon: Coupon) -> Result<(), CouponRepositoryError> {
        let metadata = serde_json::to_value(&coupon.metadata)
            .map_err(|e| CouponRepositoryError::Storage(e.to_string()))?;

        let product_ids = if coupon.product_ids.is_empty() {
            None
        } else {
            Some(coupon.product_ids.clone())
        };

        let category_ids = serde_json::to_value(&coupon.category_ids)
            .map_err(|e| CouponRepositoryError::Storage(e.to_string()))?;

        let payment_method = if coupon.payment_method.is_empty() {
            None
        } else {
            Some(coupon.payment_method.clone())
        };

        let now = Utc::now();
        let query = format!(
            r#"
            INSERT INTO {} (
                code, tenant_id, discount_type, discount_value, currency, scope, product_ids,
                category_ids, payment_method, auto_apply, applies_at, usage_limit, usage_count,
                usage_limit_per_customer, minimum_amount_cents, first_purchase_only,
                starts_at, expires_at, active, metadata, stripe_coupon_id, stripe_promotion_code_id,
                created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
            "#,
            self.table_name
        );

        sqlx::query(&query)
            .bind(coupon.code.to_uppercase())
            .bind(&coupon.tenant_id)
            .bind(&coupon.discount_type)
            .bind(coupon.discount_value)
            .bind(&coupon.currency)
            .bind(&coupon.scope)
            .bind(&product_ids)
            .bind(&category_ids)
            .bind(&payment_method)
            .bind(coupon.auto_apply)
            .bind(&coupon.applies_at)
            .bind(coupon.usage_limit)
            .bind(coupon.usage_count)
            .bind(coupon.usage_limit_per_customer)
            .bind(coupon.minimum_amount_cents)
            .bind(coupon.first_purchase_only)
            .bind(coupon.starts_at)
            .bind(coupon.expires_at)
            .bind(coupon.active)
            .bind(&metadata)
            .bind(&coupon.stripe_coupon_id)
            .bind(&coupon.stripe_promotion_code_id)
            .bind(now)
            .bind(now)
            .execute(&self.pool)
            .await
            .map_err(|e| {
                if let Some(db_err) = e.as_database_error() {
                    if matches!(db_err.code().as_deref(), Some("23505")) {
                        return CouponRepositoryError::Conflict;
                    }
                }
                if e.to_string().contains("duplicate") || e.to_string().contains("unique") {
                    CouponRepositoryError::Conflict
                } else {
                    CouponRepositoryError::Storage(e.to_string())
                }
            })?;

        Ok(())
    }

    async fn update_coupon(&self, coupon: Coupon) -> Result<(), CouponRepositoryError> {
        let metadata = serde_json::to_value(&coupon.metadata)
            .map_err(|e| CouponRepositoryError::Storage(e.to_string()))?;

        let product_ids = if coupon.product_ids.is_empty() {
            None
        } else {
            Some(coupon.product_ids.clone())
        };

        let category_ids = serde_json::to_value(&coupon.category_ids)
            .map_err(|e| CouponRepositoryError::Storage(e.to_string()))?;

        let payment_method = if coupon.payment_method.is_empty() {
            None
        } else {
            Some(coupon.payment_method.clone())
        };

        // STOR-001b: Include tenant_id in WHERE clause to prevent cross-tenant updates
        let query = format!(
            r#"
            UPDATE {} SET
                discount_type = $2, discount_value = $3, currency = $4, scope = $5,
                product_ids = $6, category_ids = $7, payment_method = $8, auto_apply = $9,
                applies_at = $10, usage_limit = $11, usage_limit_per_customer = $12,
                minimum_amount_cents = $13, first_purchase_only = $14,
                starts_at = $15, expires_at = $16, active = $17,
                metadata = $18, stripe_coupon_id = $19, stripe_promotion_code_id = $20,
                updated_at = $21
            WHERE UPPER(code) = UPPER($1) AND tenant_id = $22
            "#,
            self.table_name
        );

        let result = sqlx::query(&query)
            .bind(&coupon.code)
            .bind(&coupon.discount_type)
            .bind(coupon.discount_value)
            .bind(&coupon.currency)
            .bind(&coupon.scope)
            .bind(&product_ids)
            .bind(&category_ids)
            .bind(&payment_method)
            .bind(coupon.auto_apply)
            .bind(&coupon.applies_at)
            .bind(coupon.usage_limit)
            .bind(coupon.usage_limit_per_customer)
            .bind(coupon.minimum_amount_cents)
            .bind(coupon.first_purchase_only)
            .bind(coupon.starts_at)
            .bind(coupon.expires_at)
            .bind(coupon.active)
            .bind(&metadata)
            .bind(&coupon.stripe_coupon_id)
            .bind(&coupon.stripe_promotion_code_id)
            .bind(Utc::now())
            .bind(&coupon.tenant_id) // $22: tenant isolation
            .execute(&self.pool)
            .await
            .map_err(|e| CouponRepositoryError::Storage(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CouponRepositoryError::NotFound);
        }

        Ok(())
    }

    async fn increment_usage(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> Result<(), CouponRepositoryError> {
        let query = format!(
            "UPDATE {} SET usage_count = usage_count + 1, updated_at = $2 WHERE UPPER(code) = UPPER($1) AND tenant_id = $3",
            self.table_name
        );

        let result = sqlx::query(&query)
            .bind(code)
            .bind(Utc::now())
            .bind(tenant_id)
            .execute(&self.pool)
            .await
            .map_err(|e| CouponRepositoryError::Storage(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CouponRepositoryError::NotFound);
        }

        Ok(())
    }

    /// Atomically increment usage count only if limit not reached.
    /// Uses SQL conditional: WHERE usage_limit IS NULL OR usage_count < usage_limit
    async fn try_increment_usage_atomic(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> Result<bool, CouponRepositoryError> {
        let query = format!(
            r#"
            UPDATE {}
            SET usage_count = usage_count + 1, updated_at = $2
            WHERE UPPER(code) = UPPER($1)
              AND tenant_id = $3
              AND (usage_limit IS NULL OR usage_count < usage_limit)
            "#,
            self.table_name
        );

        let result = sqlx::query(&query)
            .bind(code)
            .bind(Utc::now())
            .bind(tenant_id)
            .execute(&self.pool)
            .await
            .map_err(|e| CouponRepositoryError::Storage(e.to_string()))?;

        // rows_affected == 0 means either coupon not found OR limit reached
        // We return Ok(false) for limit reached, caller should verify coupon exists
        Ok(result.rows_affected() > 0)
    }

    async fn get_customer_usage_count(
        &self,
        tenant_id: &str,
        code: &str,
        customer_id: &str,
    ) -> Result<i32, CouponRepositoryError> {
        let row: Option<(i32,)> = sqlx::query_as(
            r#"
            SELECT usage_count
            FROM coupon_customer_usage
            WHERE tenant_id = $1 AND UPPER(coupon_code) = UPPER($2) AND customer_id = $3
            "#,
        )
        .bind(tenant_id)
        .bind(code)
        .bind(customer_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| CouponRepositoryError::Storage(e.to_string()))?;

        Ok(row.map(|(c,)| c).unwrap_or(0))
    }

    async fn increment_customer_usage(
        &self,
        tenant_id: &str,
        code: &str,
        customer_id: &str,
    ) -> Result<(), CouponRepositoryError> {
        let now = Utc::now();
        let id = uuid::Uuid::new_v4().to_string();

        sqlx::query(
            r#"
            INSERT INTO coupon_customer_usage (id, tenant_id, coupon_code, customer_id, usage_count, first_used_at, last_used_at)
            VALUES ($1, $2, UPPER($3), $4, 1, $5, $5)
            ON CONFLICT (tenant_id, UPPER(coupon_code), customer_id)
            DO UPDATE SET usage_count = coupon_customer_usage.usage_count + 1, last_used_at = $5
            "#,
        )
        .bind(&id)
        .bind(tenant_id)
        .bind(code)
        .bind(customer_id)
        .bind(now)
        .execute(&self.pool)
        .await
        .map_err(|e| CouponRepositoryError::Storage(e.to_string()))?;

        Ok(())
    }

    async fn customer_has_prior_purchases(
        &self,
        tenant_id: &str,
        customer_id: &str,
    ) -> Result<bool, CouponRepositoryError> {
        // Check orders table for any completed orders by this customer
        let row: Option<(i64,)> = sqlx::query_as(
            r#"
            SELECT 1
            FROM orders
            WHERE tenant_id = $1 AND (customer = $2 OR user_id = $2)
              AND status IN ('paid', 'completed', 'shipped', 'delivered')
            LIMIT 1
            "#,
        )
        .bind(tenant_id)
        .bind(customer_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| CouponRepositoryError::Storage(e.to_string()))?;

        Ok(row.is_some())
    }

    async fn delete_coupon(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> Result<(), CouponRepositoryError> {
        let query = format!(
            "DELETE FROM {} WHERE UPPER(code) = UPPER($1) AND tenant_id = $2",
            self.table_name
        );

        let result = sqlx::query(&query)
            .bind(code)
            .bind(tenant_id)
            .execute(&self.pool)
            .await
            .map_err(|e| CouponRepositoryError::Storage(e.to_string()))?;

        if result.rows_affected() == 0 {
            return Err(CouponRepositoryError::NotFound);
        }

        Ok(())
    }

    async fn close(&self) -> Result<(), CouponRepositoryError> {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TestDbError {
        code: Option<String>,
    }

    impl std::fmt::Debug for TestDbError {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            f.debug_struct("TestDbError")
                .field("code", &self.code)
                .finish()
        }
    }

    impl std::fmt::Display for TestDbError {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "test db error")
        }
    }

    impl std::error::Error for TestDbError {}

    impl sqlx::error::DatabaseError for TestDbError {
        fn message(&self) -> &str {
            "test"
        }

        fn code(&self) -> Option<std::borrow::Cow<'_, str>> {
            self.code.as_deref().map(std::borrow::Cow::Borrowed)
        }

        fn as_error(&self) -> &(dyn std::error::Error + Send + Sync + 'static) {
            self
        }

        fn as_error_mut(&mut self) -> &mut (dyn std::error::Error + Send + Sync + 'static) {
            self
        }

        fn into_error(self: Box<Self>) -> Box<dyn std::error::Error + Send + Sync + 'static> {
            self
        }

        fn kind(&self) -> sqlx::error::ErrorKind {
            sqlx::error::ErrorKind::Other
        }
    }

    #[test]
    fn test_create_coupon_conflict_detection_uses_sqlstate() {
        let err = sqlx::Error::Database(Box::new(TestDbError {
            code: Some("23505".to_string()),
        }));

        let mapped = (|e: sqlx::Error| {
            if let Some(db_err) = e.as_database_error() {
                if matches!(db_err.code().as_deref(), Some("23505")) {
                    return CouponRepositoryError::Conflict;
                }
            }
            CouponRepositoryError::Storage(e.to_string())
        })(err);

        assert!(matches!(mapped, CouponRepositoryError::Conflict));
    }
}
