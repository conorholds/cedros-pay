use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Coupon {
    pub code: String,
    /// Tenant ID for multi-tenant isolation per spec (10-middleware.md)
    #[serde(default = "default_tenant")]
    pub tenant_id: String,
    pub discount_type: String,
    pub discount_value: f64,
    #[serde(default)]
    pub currency: Option<String>,
    pub scope: String,
    #[serde(default)]
    pub product_ids: Vec<String>,
    /// Category IDs for category-level coupon restrictions
    #[serde(default)]
    pub category_ids: Vec<String>,
    #[serde(default)]
    pub payment_method: String,
    #[serde(default)]
    pub auto_apply: bool,
    pub applies_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage_limit: Option<i32>,
    #[serde(default)]
    pub usage_count: i32,
    /// Per-customer usage limit (e.g., "once per customer")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage_limit_per_customer: Option<i32>,
    /// Minimum cart amount in cents for coupon to apply
    #[serde(skip_serializing_if = "Option::is_none")]
    pub minimum_amount_cents: Option<i64>,
    /// If true, coupon only applies to first-time purchasers
    #[serde(default)]
    pub first_purchase_only: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub starts_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub active: bool,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
    /// Stripe Coupon ID (e.g., "coupon_abc123")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_coupon_id: Option<String>,
    /// Stripe Promotion Code ID (e.g., "promo_abc123")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_promotion_code_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<DateTime<Utc>>,
}

fn default_tenant() -> String {
    "default".to_string()
}

#[derive(Debug, thiserror::Error)]
pub enum CouponError {
    #[error("coupon is inactive")]
    Inactive,
    #[error("coupon has not started yet")]
    NotStarted,
    #[error("coupon has expired")]
    Expired,
    #[error("coupon usage limit reached")]
    UsageLimitReached,
    #[error("coupon per-customer usage limit reached")]
    PerCustomerLimitReached,
    #[error("coupon does not apply to product")]
    NotApplicableToProduct,
    #[error("coupon does not apply to category")]
    NotApplicableToCategory,
    #[error("coupon does not apply to payment method")]
    WrongPaymentMethod,
    #[error("cart does not meet minimum amount requirement")]
    MinimumAmountNotMet,
    #[error("coupon only valid for first-time purchasers")]
    NotFirstPurchase,
    #[error("invalid coupon configuration")]
    InvalidConfiguration(String),
}

impl Coupon {
    /// Check if the coupon is currently valid
    pub fn is_valid(&self) -> Result<(), CouponError> {
        if !self.active {
            return Err(CouponError::Inactive);
        }

        let now = Utc::now();

        if let Some(starts_at) = self.starts_at {
            if now < starts_at {
                return Err(CouponError::NotStarted);
            }
        }

        if let Some(expires_at) = self.expires_at {
            if now > expires_at {
                return Err(CouponError::Expired);
            }
        }

        if let Some(limit) = self.usage_limit {
            if self.usage_count >= limit {
                return Err(CouponError::UsageLimitReached);
            }
        }

        Ok(())
    }

    /// Validate coupon configuration constraints
    pub fn validate_configuration(&self) -> Result<(), CouponError> {
        // Discount value must be non-negative
        if self.discount_value < 0.0 {
            return Err(CouponError::InvalidConfiguration(
                "discount_value must be non-negative".to_string(),
            ));
        }

        // Percentage discounts must be between 0 and 100
        if self.is_percentage() && self.discount_value > 100.0 {
            return Err(CouponError::InvalidConfiguration(
                "percentage discount must be between 0 and 100".to_string(),
            ));
        }

        // Fixed discounts should be validated against currency constraints (caller responsibility)
        // but we can check it's not NaN or infinity
        if self.discount_value.is_nan() || self.discount_value.is_infinite() {
            return Err(CouponError::InvalidConfiguration(
                "discount_value must be a valid number".to_string(),
            ));
        }

        // Catalog coupons must have scope=specific and product_ids
        if self.applies_at.eq_ignore_ascii_case("catalog") {
            if !self.scope.eq_ignore_ascii_case("specific") {
                return Err(CouponError::InvalidConfiguration(
                    "catalog coupons must have scope=specific".to_string(),
                ));
            }
            if self.product_ids.is_empty() {
                return Err(CouponError::InvalidConfiguration(
                    "catalog coupons must have product_ids".to_string(),
                ));
            }
        }

        // Checkout coupons must have scope=all
        if self.applies_at.eq_ignore_ascii_case("checkout")
            && !self.scope.eq_ignore_ascii_case("all")
        {
            return Err(CouponError::InvalidConfiguration(
                "checkout coupons must have scope=all".to_string(),
            ));
        }

        // Auto-apply coupons must specify applies_at
        if self.auto_apply && self.applies_at.is_empty() {
            return Err(CouponError::InvalidConfiguration(
                "auto_apply coupons must specify applies_at".to_string(),
            ));
        }

        Ok(())
    }

    /// Check if coupon applies to a specific product
    /// SECURITY: Uses case-sensitive comparison to prevent unintended coupon application (M-006 fix).
    pub fn applies_to_product(&self, product_id: &str) -> bool {
        if self.scope.eq_ignore_ascii_case("all") {
            return true;
        }
        self.product_ids.iter().any(|pid| pid == product_id)
    }

    /// Check if coupon applies to a specific category
    /// SECURITY: Uses case-sensitive comparison for consistency (M-006 fix).
    pub fn applies_to_category(&self, category_id: &str) -> bool {
        // Empty category_ids means any category
        if self.category_ids.is_empty() {
            return true;
        }
        self.category_ids.iter().any(|cid| cid == category_id)
    }

    /// Check if cart meets minimum amount requirement
    pub fn meets_minimum_amount(&self, cart_subtotal_cents: i64) -> bool {
        match self.minimum_amount_cents {
            Some(min) => cart_subtotal_cents >= min,
            None => true,
        }
    }

    /// Check if coupon applies to a payment method
    pub fn applies_to_payment_method(&self, method: &str) -> bool {
        // Empty payment_method means any method
        if self.payment_method.is_empty() {
            return true;
        }
        self.payment_method.eq_ignore_ascii_case(method)
    }

    /// Apply discount to a price
    pub fn apply_discount(&self, original_price: f64) -> f64 {
        match self.discount_type.to_lowercase().as_str() {
            "percentage" => original_price * (1.0 - self.discount_value / 100.0),
            "fixed" => (original_price - self.discount_value).max(0.0),
            _ => original_price,
        }
    }

    /// Check if this is a percentage discount
    pub fn is_percentage(&self) -> bool {
        self.discount_type.eq_ignore_ascii_case("percentage")
    }

    /// Check if this is a fixed discount
    pub fn is_fixed(&self) -> bool {
        self.discount_type.eq_ignore_ascii_case("fixed")
    }
}
