//! Stripe coupon and promotion code management
//!
//! Handles creating, updating, deleting coupons and managing promotion codes.

use std::collections::HashMap;

use tracing::{debug, info};

use crate::constants::{MAX_STRIPE_AMOUNT_CENTS, MIN_STRIPE_AMOUNT_CENTS};
use crate::errors::ErrorCode;
use crate::services::{ServiceError, ServiceResult};

use super::StripeClient;

impl StripeClient {
    /// Create a Stripe Coupon
    ///
    /// For percentage discounts: `percent_off` is the percentage (0-100)
    /// For fixed amount discounts: `amount_off` is in cents, requires `currency`
    pub async fn create_stripe_coupon(
        &self,
        discount_type: &str,
        discount_value: f64,
        currency: Option<&str>,
        metadata: HashMap<String, String>,
    ) -> ServiceResult<String> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        let mut form: Vec<(String, String)> = Vec::new();

        if discount_type.eq_ignore_ascii_case("percentage") {
            if !(0.0..=100.0).contains(&discount_value) {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidField,
                    message: "Percentage discount must be between 0 and 100".into(),
                });
            }
            form.push(("percent_off".into(), discount_value.to_string()));
        } else if discount_type.eq_ignore_ascii_case("fixed") {
            let raw_cents = (discount_value * 100.0).round();
            let amount_cents = if !raw_cents.is_finite() || raw_cents > i64::MAX as f64 {
                i64::MAX
            } else if raw_cents < i64::MIN as f64 {
                i64::MIN
            } else {
                raw_cents as i64
            };
            if !(MIN_STRIPE_AMOUNT_CENTS..=MAX_STRIPE_AMOUNT_CENTS).contains(&amount_cents) {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidAmount,
                    message: format!(
                        "Fixed discount amount must be between {} and {} cents",
                        MIN_STRIPE_AMOUNT_CENTS, MAX_STRIPE_AMOUNT_CENTS
                    ),
                });
            }
            form.push(("amount_off".into(), amount_cents.to_string()));
            form.push(("currency".into(), currency.unwrap_or("usd").to_lowercase()));
        } else {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidField,
                message: "discount_type must be 'percentage' or 'fixed'".into(),
            });
        }

        for (k, v) in &metadata {
            form.push((format!("metadata[{}]", k), v.clone()));
        }

        let response = self.stripe_post("coupons", &form).await?;

        let coupon_id =
            response
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| ServiceError::Coded {
                    code: ErrorCode::StripeError,
                    message: "Stripe coupon response missing id".into(),
                })?;

        info!(
            stripe_coupon_id = %coupon_id,
            discount_type = %discount_type,
            discount_value = %discount_value,
            "Created Stripe coupon"
        );

        Ok(coupon_id.to_string())
    }

    /// Create a Stripe Promotion Code for a coupon
    ///
    /// This creates a human-readable code that customers can enter at checkout.
    /// Supports advanced restrictions: minimum_amount_cents, first_time_transaction.
    pub async fn create_stripe_promotion_code(
        &self,
        coupon_id: &str,
        code: &str,
        metadata: HashMap<String, String>,
    ) -> ServiceResult<String> {
        self.create_stripe_promotion_code_with_restrictions(
            coupon_id, code, metadata, None, None, false,
        )
        .await
    }

    /// Create a Stripe Promotion Code with advanced restrictions
    ///
    /// - `minimum_amount_cents`: Minimum order amount for the promo code to apply
    /// - `minimum_amount_currency`: Currency for minimum amount (defaults to "usd")
    /// - `first_time_transaction`: If true, only applies to customer's first purchase
    pub async fn create_stripe_promotion_code_with_restrictions(
        &self,
        coupon_id: &str,
        code: &str,
        metadata: HashMap<String, String>,
        minimum_amount_cents: Option<i64>,
        minimum_amount_currency: Option<&str>,
        first_time_transaction: bool,
    ) -> ServiceResult<String> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        let mut form: Vec<(String, String)> = vec![
            ("coupon".into(), coupon_id.to_string()),
            ("code".into(), code.to_uppercase()),
        ];

        // Add restrictions if specified
        if let Some(min_amount) = minimum_amount_cents {
            if min_amount > 0 {
                form.push((
                    "restrictions[minimum_amount]".into(),
                    min_amount.to_string(),
                ));
                form.push((
                    "restrictions[minimum_amount_currency]".into(),
                    minimum_amount_currency.unwrap_or("usd").to_lowercase(),
                ));
            }
        }

        if first_time_transaction {
            form.push((
                "restrictions[first_time_transaction]".into(),
                "true".to_string(),
            ));
        }

        for (k, v) in &metadata {
            form.push((format!("metadata[{}]", k), v.clone()));
        }

        let response = self.stripe_post("promotion_codes", &form).await?;

        let promo_id =
            response
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| ServiceError::Coded {
                    code: ErrorCode::StripeError,
                    message: "Stripe promotion code response missing id".into(),
                })?;

        info!(
            stripe_promotion_code_id = %promo_id,
            stripe_coupon_id = %coupon_id,
            code = %code,
            minimum_amount_cents = ?minimum_amount_cents,
            first_time_transaction = %first_time_transaction,
            "Created Stripe promotion code"
        );

        Ok(promo_id.to_string())
    }

    /// Update a Stripe Coupon's metadata
    ///
    /// Note: Stripe only allows updating metadata on coupons, not the discount itself.
    /// To change the discount, you must create a new coupon.
    pub async fn update_stripe_coupon(
        &self,
        stripe_coupon_id: &str,
        metadata: HashMap<String, String>,
    ) -> ServiceResult<()> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        let mut form: Vec<(String, String)> = Vec::new();

        for (k, v) in &metadata {
            form.push((format!("metadata[{}]", k), v.clone()));
        }

        let endpoint = format!("coupons/{}", stripe_coupon_id);
        self.stripe_post(&endpoint, &form).await?;

        info!(stripe_coupon_id = %stripe_coupon_id, "Updated Stripe coupon metadata");

        Ok(())
    }

    /// Delete a Stripe Coupon
    ///
    /// This permanently deletes the coupon. Existing discounts using the coupon
    /// will continue to work, but new customers cannot use it.
    pub async fn delete_stripe_coupon(&self, stripe_coupon_id: &str) -> ServiceResult<()> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        let endpoint = format!("coupons/{}", stripe_coupon_id);
        self.stripe_delete(&endpoint).await?;

        info!(stripe_coupon_id = %stripe_coupon_id, "Deleted Stripe coupon");

        Ok(())
    }

    /// Deactivate a Stripe Promotion Code
    ///
    /// Sets the promotion code's `active` field to false, preventing new uses.
    pub async fn deactivate_stripe_promotion_code(
        &self,
        stripe_promotion_code_id: &str,
    ) -> ServiceResult<()> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        let form: Vec<(String, String)> = vec![("active".into(), "false".to_string())];

        let endpoint = format!("promotion_codes/{}", stripe_promotion_code_id);
        self.stripe_post(&endpoint, &form).await?;

        info!(stripe_promotion_code_id = %stripe_promotion_code_id, "Deactivated Stripe promotion code");

        Ok(())
    }

    /// Lookup Stripe promotion code ID from human-readable code per spec (21-stripe-client.md)
    ///
    /// Resolves human-readable code (e.g., "SAVE20") to Stripe promo code ID
    pub async fn lookup_promotion_code_id(&self, code: &str) -> ServiceResult<Option<String>> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        // Query Stripe promotion codes API
        let form = vec![
            ("code", code.to_string()),
            ("active", "true".to_string()),
            ("limit", "1".to_string()),
        ];

        let response = self
            .stripe_get_with_params("promotion_codes", &form)
            .await?;

        // Parse the response
        let data = response
            .get("data")
            .and_then(|v| v.as_array())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: "invalid promotion_codes response".into(),
            })?;

        // Return the first matching promotion code ID
        if let Some(promo) = data.first() {
            if let Some(id) = promo.get("id").and_then(|v| v.as_str()) {
                debug!(code = %code, promo_id = %id, "Resolved promotion code");
                return Ok(Some(id.to_string()));
            }
        }

        debug!(code = %code, "Promotion code not found");
        Ok(None)
    }
}
