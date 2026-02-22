//! Stripe product and price management
//!
//! Handles creating, updating, and archiving Stripe products and prices.
//! Used by the admin API to sync local products with Stripe.

use std::collections::HashMap;

use tracing::info;

use crate::constants::{MAX_STRIPE_AMOUNT_CENTS, MIN_STRIPE_AMOUNT_CENTS};
use crate::errors::ErrorCode;
use crate::services::{ServiceError, ServiceResult};

use super::StripeClient;

impl StripeClient {
    // ========================================================================
    // Product & Price Management (for Admin API)
    // ========================================================================

    /// Create a Stripe Product
    ///
    /// Used by admin API to auto-create Stripe products when creating products
    /// with fiat pricing but no existing stripe_price_id.
    pub async fn create_stripe_product(
        &self,
        name: &str,
        description: Option<&str>,
        metadata: HashMap<String, String>,
    ) -> ServiceResult<String> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        let mut form: Vec<(String, String)> = vec![("name".into(), name.to_string())];

        if let Some(desc) = description {
            if !desc.is_empty() {
                form.push(("description".into(), desc.to_string()));
            }
        }

        for (k, v) in &metadata {
            form.push((format!("metadata[{}]", k), v.clone()));
        }

        let response = self.stripe_post("products", &form).await?;

        let product_id =
            response
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| ServiceError::Coded {
                    code: ErrorCode::StripeError,
                    message: "Stripe product response missing id".into(),
                })?;

        info!(stripe_product_id = %product_id, name = %name, "Created Stripe product");

        Ok(product_id.to_string())
    }

    /// Create a Stripe Price for a product
    ///
    /// Used by admin API to auto-create Stripe prices when creating products
    /// with fiat pricing but no existing stripe_price_id.
    pub async fn create_stripe_price(
        &self,
        product_id: &str,
        amount_cents: i64,
        currency: &str,
    ) -> ServiceResult<String> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        if !(MIN_STRIPE_AMOUNT_CENTS..=MAX_STRIPE_AMOUNT_CENTS).contains(&amount_cents) {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidAmount,
                message: format!(
                    "Amount must be between {} and {} cents",
                    MIN_STRIPE_AMOUNT_CENTS, MAX_STRIPE_AMOUNT_CENTS
                ),
            });
        }

        let form: Vec<(String, String)> = vec![
            ("product".into(), product_id.to_string()),
            ("unit_amount".into(), amount_cents.to_string()),
            ("currency".into(), currency.to_lowercase()),
        ];

        let response = self.stripe_post("prices", &form).await?;

        let price_id =
            response
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| ServiceError::Coded {
                    code: ErrorCode::StripeError,
                    message: "Stripe price response missing id".into(),
                })?;

        info!(
            stripe_price_id = %price_id,
            stripe_product_id = %product_id,
            amount_cents = %amount_cents,
            currency = %currency,
            "Created Stripe price"
        );

        Ok(price_id.to_string())
    }

    /// Create a recurring Stripe Price for subscriptions
    ///
    /// Creates a price with billing interval (month, year, day, week).
    pub async fn create_stripe_recurring_price(
        &self,
        product_id: &str,
        amount_cents: i64,
        currency: &str,
        interval: &str,
        interval_count: i32,
    ) -> ServiceResult<String> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        if !(MIN_STRIPE_AMOUNT_CENTS..=MAX_STRIPE_AMOUNT_CENTS).contains(&amount_cents) {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidAmount,
                message: format!(
                    "Amount must be between {} and {} cents",
                    MIN_STRIPE_AMOUNT_CENTS, MAX_STRIPE_AMOUNT_CENTS
                ),
            });
        }

        let form: Vec<(String, String)> = vec![
            ("product".into(), product_id.to_string()),
            ("unit_amount".into(), amount_cents.to_string()),
            ("currency".into(), currency.to_lowercase()),
            ("recurring[interval]".into(), interval.to_string()),
            (
                "recurring[interval_count]".into(),
                interval_count.to_string(),
            ),
        ];

        let response = self.stripe_post("prices", &form).await?;

        let price_id =
            response
                .get("id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| ServiceError::Coded {
                    code: ErrorCode::StripeError,
                    message: "Stripe price response missing id".into(),
                })?;

        info!(
            stripe_price_id = %price_id,
            stripe_product_id = %product_id,
            amount_cents = %amount_cents,
            currency = %currency,
            interval = %interval,
            "Created Stripe recurring price"
        );

        Ok(price_id.to_string())
    }

    /// Update a Stripe Product
    ///
    /// Updates the name, description, and metadata of an existing Stripe product.
    pub async fn update_stripe_product(
        &self,
        stripe_product_id: &str,
        name: &str,
        description: Option<&str>,
        metadata: HashMap<String, String>,
    ) -> ServiceResult<()> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        let mut form: Vec<(String, String)> = vec![("name".into(), name.to_string())];

        if let Some(desc) = description {
            if !desc.is_empty() {
                form.push(("description".into(), desc.to_string()));
            }
        }

        for (k, v) in &metadata {
            form.push((format!("metadata[{}]", k), v.clone()));
        }

        let endpoint = format!("products/{}", stripe_product_id);
        self.stripe_post(&endpoint, &form).await?;

        info!(stripe_product_id = %stripe_product_id, name = %name, "Updated Stripe product");

        Ok(())
    }

    /// Archive a Stripe Product
    ///
    /// Sets the product's `active` field to false, effectively soft-deleting it.
    /// Archived products cannot be used in new purchases but existing subscriptions continue.
    pub async fn archive_stripe_product(&self, stripe_product_id: &str) -> ServiceResult<()> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        let form: Vec<(String, String)> = vec![("active".into(), "false".to_string())];

        let endpoint = format!("products/{}", stripe_product_id);
        self.stripe_post(&endpoint, &form).await?;

        info!(stripe_product_id = %stripe_product_id, "Archived Stripe product");

        Ok(())
    }
}
