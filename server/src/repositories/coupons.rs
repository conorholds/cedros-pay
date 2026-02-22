use std::collections::HashMap;

use async_trait::async_trait;
use thiserror::Error;

use crate::models::{Coupon, PaymentMethod};

#[derive(Debug, Error)]
pub enum CouponRepositoryError {
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
pub trait CouponRepository: Send + Sync {
    async fn get_coupon(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> Result<Coupon, CouponRepositoryError>;
    async fn list_coupons(&self, tenant_id: &str) -> Result<Vec<Coupon>, CouponRepositoryError>;
    async fn get_auto_apply_coupons_for_payment(
        &self,
        tenant_id: &str,
        product_id: &str,
        payment_method: &PaymentMethod,
    ) -> Result<Vec<Coupon>, CouponRepositoryError>;
    async fn get_all_auto_apply_coupons_for_payment(
        &self,
        tenant_id: &str,
        payment_method: &PaymentMethod,
    ) -> Result<HashMap<String, Vec<Coupon>>, CouponRepositoryError>;

    /// Get checkout auto-apply coupons with scope="all" for a payment method.
    /// These apply at checkout to all products, filtered at the database level.
    async fn get_checkout_auto_apply_coupons(
        &self,
        tenant_id: &str,
        payment_method: &PaymentMethod,
    ) -> Result<Vec<Coupon>, CouponRepositoryError> {
        // Default implementation falls back to list_coupons for non-SQL backends
        let all = self.list_coupons(tenant_id).await?;
        let pm_str = match payment_method {
            PaymentMethod::Stripe => "stripe",
            PaymentMethod::X402 => "x402",
            PaymentMethod::Credits => "credits",
        };
        let now = chrono::Utc::now();
        Ok(all
            .into_iter()
            .filter(|c| {
                c.auto_apply
                    && c.applies_at.eq_ignore_ascii_case("checkout")
                    && c.scope.eq_ignore_ascii_case("all")
                    && c.active
                    && (c.payment_method.is_empty()
                        || c.payment_method.eq_ignore_ascii_case(pm_str))
                    && c.starts_at.map(|s| s <= now).unwrap_or(true)
                    && c.expires_at.map(|e| e > now).unwrap_or(true)
                    && c.usage_limit.map(|l| c.usage_count < l).unwrap_or(true)
            })
            .collect())
    }

    /// List coupons with SQL-level pagination (avoids loading all into memory).
    async fn list_coupons_paginated(
        &self,
        tenant_id: &str,
        limit: usize,
        offset: usize,
    ) -> Result<(Vec<Coupon>, i64), CouponRepositoryError> {
        // Default: fall back to list_coupons with in-memory pagination
        let all = self.list_coupons(tenant_id).await?;
        let total = all.len() as i64;
        let page = all.into_iter().skip(offset).take(limit).collect();
        Ok((page, total))
    }

    async fn create_coupon(&self, coupon: Coupon) -> Result<(), CouponRepositoryError>;
    async fn update_coupon(&self, coupon: Coupon) -> Result<(), CouponRepositoryError>;
    async fn increment_usage(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> Result<(), CouponRepositoryError>;

    /// Atomically increment usage count only if limit not reached.
    /// Returns Ok(true) if increment succeeded, Ok(false) if limit was already reached.
    /// This prevents race conditions where concurrent requests could exceed the limit.
    async fn try_increment_usage_atomic(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> Result<bool, CouponRepositoryError> {
        // Default implementation falls back to increment_usage (not atomic, for backward compat)
        self.increment_usage(tenant_id, code).await.map(|_| true)
    }

    /// Get a customer's usage count for a specific coupon.
    /// Returns 0 if no usage record exists.
    async fn get_customer_usage_count(
        &self,
        tenant_id: &str,
        code: &str,
        customer_id: &str,
    ) -> Result<i32, CouponRepositoryError> {
        // Default: no per-customer tracking, return 0
        let _ = (tenant_id, code, customer_id);
        Ok(0)
    }

    /// Increment a customer's usage count for a specific coupon.
    /// Creates the record if it doesn't exist.
    async fn increment_customer_usage(
        &self,
        tenant_id: &str,
        code: &str,
        customer_id: &str,
    ) -> Result<(), CouponRepositoryError> {
        // Default: no-op for backward compatibility
        let _ = (tenant_id, code, customer_id);
        Ok(())
    }

    /// Check if a customer has any prior purchases (for first_purchase_only validation).
    /// Returns true if customer has at least one completed order.
    async fn customer_has_prior_purchases(
        &self,
        tenant_id: &str,
        customer_id: &str,
    ) -> Result<bool, CouponRepositoryError> {
        // Default: assume no prior purchases (conservative)
        let _ = (tenant_id, customer_id);
        Ok(false)
    }

    async fn delete_coupon(&self, tenant_id: &str, code: &str)
        -> Result<(), CouponRepositoryError>;
    async fn close(&self) -> Result<(), CouponRepositoryError>;
}
