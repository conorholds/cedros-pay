//! Stripe client implementation
//!
//! This module provides the StripeClient for interacting with Stripe's API.

use std::collections::HashMap;
use std::sync::Arc;

use chrono::{DateTime, LocalResult, TimeZone, Utc};
use tracing::{debug, error, info, warn};

use crate::config::Config;
use crate::constants::{
    MAX_STRIPE_AMOUNT_CENTS, MAX_STRIPE_LINE_ITEM_QUANTITY, MIN_STRIPE_AMOUNT_CENTS,
    STRIPE_API_TIMEOUT, STRIPE_MODE_PAYMENT, STRIPE_MODE_SUBSCRIPTION, STRIPE_SIGNATURE_PREFIX,
};
use crate::errors::ErrorCode;
use crate::middleware::circuit_breaker::{
    new_circuit_breaker, CircuitBreakerConfig, CircuitBreakerError, SharedCircuitBreaker,
};
use crate::models::{BillingPeriod, Money, SubscriptionStatus};
use crate::services::{CedrosLoginClient, ServiceError, ServiceResult};
use crate::storage::Store;
use crate::webhooks::Notifier;

use super::models::{
    ChargeEventWrapper, CreateCartSessionRequest, CreateSessionRequest, CreateSubscriptionRequest,
    InvoiceEventWrapper, ProrationLine, ProrationPreview, RawWebhookEvent, SessionVerifyInfo,
    StripeCheckoutSession, StripeSession, StripeWebhookEvent, SubscriptionChangeResult,
    SubscriptionEventWrapper, WebhookEvent,
};

use super::models::StripeRefundObject;

/// Safely convert a Unix timestamp to DateTime<Utc>, falling back to current time if invalid.
/// This prevents panics from invalid timestamps (e.g., out of range values).
fn timestamp_to_datetime(secs: i64) -> DateTime<Utc> {
    match Utc.timestamp_opt(secs, 0) {
        LocalResult::Single(dt) => dt,
        LocalResult::Ambiguous(dt, _) => dt,
        LocalResult::None => {
            warn!(timestamp = secs, "Invalid timestamp, using current time");
            Utc::now()
        }
    }
}

// ============================================================================
// Stripe Client
// ============================================================================

#[derive(Clone)]
pub struct StripeClient {
    pub config: Config,
    pub store: Arc<dyn Store>,
    pub notifier: Arc<dyn Notifier>,
    /// Coupon repository for incrementing usage on successful payments (per spec 21-stripe-client.md)
    pub coupons: Option<Arc<dyn crate::repositories::CouponRepository>>,
    cedros_login: Option<Arc<CedrosLoginClient>>,
    http_client: reqwest::Client,
    circuit_breaker: SharedCircuitBreaker,
}

impl StripeClient {
    /// Build HTTP client with timeout for Stripe API calls
    fn build_http_client() -> ServiceResult<reqwest::Client> {
        reqwest::Client::builder()
            .timeout(STRIPE_API_TIMEOUT)
            .build()
            .map_err(|e| ServiceError::Internal(format!("stripe http client: {}", e)))
    }

    pub fn new(
        config: Config,
        store: Arc<dyn Store>,
        notifier: Arc<dyn Notifier>,
    ) -> ServiceResult<Self> {
        let cedros_login = if config.cedros_login.enabled
            && !config.cedros_login.base_url.is_empty()
            && !config.cedros_login.api_key.is_empty()
        {
            match CedrosLoginClient::new(
                config.cedros_login.base_url.clone(),
                config.cedros_login.api_key.clone(),
                config.cedros_login.timeout,
                config.cedros_login.jwt_issuer.clone(),
                config.cedros_login.jwt_audience.clone(),
            ) {
                Ok(c) => Some(Arc::new(c)),
                Err(e) => {
                    warn!(error = %e, "Failed to init cedros-login client for Stripe customer mapping");
                    None
                }
            }
        } else {
            None
        };

        Ok(Self {
            config,
            store,
            notifier,
            coupons: None,
            cedros_login,
            http_client: Self::build_http_client()?,
            circuit_breaker: new_circuit_breaker(CircuitBreakerConfig::stripe_api()),
        })
    }

    /// Create with coupon repository (per spec 21-stripe-client.md)
    pub fn with_coupons(mut self, coupons: Arc<dyn crate::repositories::CouponRepository>) -> Self {
        self.coupons = Some(coupons);
        self
    }

    /// Create with custom circuit breaker config
    pub fn with_circuit_breaker(
        config: Config,
        store: Arc<dyn Store>,
        notifier: Arc<dyn Notifier>,
        cb_config: CircuitBreakerConfig,
    ) -> ServiceResult<Self> {
        let cedros_login = if config.cedros_login.enabled
            && !config.cedros_login.base_url.is_empty()
            && !config.cedros_login.api_key.is_empty()
        {
            match CedrosLoginClient::new(
                config.cedros_login.base_url.clone(),
                config.cedros_login.api_key.clone(),
                config.cedros_login.timeout,
                config.cedros_login.jwt_issuer.clone(),
                config.cedros_login.jwt_audience.clone(),
            ) {
                Ok(c) => Some(Arc::new(c)),
                Err(e) => {
                    warn!(error = %e, "Failed to init cedros-login client for Stripe customer mapping");
                    None
                }
            }
        } else {
            None
        };

        Ok(Self {
            config,
            store,
            notifier,
            coupons: None,
            cedros_login,
            http_client: Self::build_http_client()?,
            circuit_breaker: new_circuit_breaker(cb_config),
        })
    }

    async fn resolve_user_id_by_customer(
        &self,
        stripe_customer_id: Option<&str>,
    ) -> Option<String> {
        let client = self.cedros_login.as_ref()?;
        let customer_id = stripe_customer_id?;
        match client.lookup_user_by_stripe_customer(customer_id).await {
            Ok(u) => u,
            Err(e) => {
                debug!(error = %e, stripe_customer_id = %customer_id, "Failed to lookup user by Stripe customer");
                None
            }
        }
    }

    async fn best_effort_link_customer(&self, stripe_customer_id: &str, user_id: &str) {
        let Some(client) = self.cedros_login.as_ref() else {
            return;
        };
        if let Err(e) = client
            .link_stripe_customer(stripe_customer_id, user_id)
            .await
        {
            warn!(
                error = %e,
                stripe_customer_id = %stripe_customer_id,
                user_id = %user_id,
                "Failed to link Stripe customer to user (best effort)"
            );
        }
    }

    /// Check if Stripe is enabled
    pub fn is_enabled(&self) -> bool {
        !self.config.stripe.secret_key.is_empty()
    }

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
            let amount_cents = (discount_value * 100.0).round() as i64;
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

    /// Create a checkout session for a single product
    pub async fn create_checkout_session(
        &self,
        req: CreateSessionRequest,
    ) -> ServiceResult<StripeSession> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        // Validate amount (only when using dynamic pricing, not price_id)
        if req.price_id.is_none() {
            if req.amount_cents < MIN_STRIPE_AMOUNT_CENTS {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidAmount,
                    message: format!(
                        "amount must be at least {} cents (${:.2})",
                        MIN_STRIPE_AMOUNT_CENTS,
                        MIN_STRIPE_AMOUNT_CENTS as f64 / 100.0
                    ),
                });
            }
            if req.amount_cents > MAX_STRIPE_AMOUNT_CENTS {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidAmount,
                    message: format!(
                        "amount exceeds maximum of {} cents",
                        MAX_STRIPE_AMOUNT_CENTS
                    ),
                });
            }
        }

        // Build metadata
        let mut metadata = req.metadata.clone();
        metadata.insert("resource_id".into(), req.resource_id.clone());
        if let Some(code) = &req.coupon_code {
            metadata.insert("coupon_code".into(), code.clone());
        }
        if let Some(orig) = req.original_amount {
            metadata.insert("original_amount_cents".into(), orig.to_string());
        }
        if let Some(disc) = req.discount_amount {
            metadata.insert("discount_amount_cents".into(), disc.to_string());
        }

        // Build form data for Stripe API
        // Use (String, String) tuples to avoid memory leaks from .leak()
        let mut form: Vec<(String, String)> = vec![
            ("mode".into(), STRIPE_MODE_PAYMENT.to_string()),
            ("payment_method_types[0]".into(), "card".to_string()),
        ];

        // Line items
        if let Some(price_id) = &req.price_id {
            form.push(("line_items[0][price]".into(), price_id.clone()));
            form.push(("line_items[0][quantity]".into(), "1".to_string()));
        } else {
            form.push((
                "line_items[0][price_data][currency]".into(),
                req.currency.to_lowercase(),
            ));
            form.push((
                "line_items[0][price_data][unit_amount]".into(),
                req.amount_cents.to_string(),
            ));
            form.push((
                "line_items[0][price_data][product_data][name]".into(),
                req.description.clone(),
            ));
        }

        // URLs
        let success_url = req
            .success_url
            .or_else(|| Some(self.config.stripe.success_url.clone()))
            .filter(|s| !s.is_empty())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "success_url is required".into(),
            })?;
        let cancel_url = req
            .cancel_url
            .or_else(|| Some(self.config.stripe.cancel_url.clone()))
            .filter(|s| !s.is_empty())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "cancel_url is required".into(),
            })?;

        form.push(("success_url".into(), success_url));
        form.push(("cancel_url".into(), cancel_url));

        // Customer email
        if let Some(email) = &req.customer_email {
            form.push(("customer_email".into(), email.clone()));
        }

        // Checkout requirements
        if let Some(billing) = &req.billing_address_collection {
            form.push(("billing_address_collection".into(), billing.clone()));
        }
        if req.phone_number_collection_enabled {
            form.push((
                "phone_number_collection[enabled]".into(),
                "true".to_string(),
            ));
        }
        if let Some(countries) = &req.shipping_address_collection_countries {
            for (i, c) in countries.iter().enumerate() {
                form.push((
                    format!("shipping_address_collection[allowed_countries][{}]", i),
                    c.clone(),
                ));
            }
        }

        // Metadata - no more .leak() needed
        for (k, v) in &metadata {
            form.push((format!("metadata[{}]", k), v.clone()));
        }

        // Tax rate
        if !self.config.stripe.tax_rate_id.is_empty() {
            form.push((
                "line_items[0][tax_rates][0]".into(),
                self.config.stripe.tax_rate_id.clone(),
            ));
        }

        // Discount
        if let Some(promo_code) = &req.stripe_coupon_id {
            form.push(("discounts[0][promotion_code]".into(), promo_code.clone()));
        }

        // Call Stripe API
        let response = self.stripe_post("checkout/sessions", &form).await?;

        // Parse response
        let session: StripeCheckoutSession =
            serde_json::from_value(response).map_err(|e| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: format!("failed to parse response: {}", e),
            })?;

        info!(session_id = %session.id, resource = %req.resource_id, "Created Stripe checkout session");

        let url = require_session_url(&session)?;
        Ok(StripeSession {
            session_id: session.id,
            url,
        })
    }

    /// Create a cart checkout session
    pub async fn create_cart_checkout_session(
        &self,
        req: CreateCartSessionRequest,
    ) -> ServiceResult<StripeSession> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        if req.items.is_empty() {
            return Err(ServiceError::Coded {
                code: ErrorCode::EmptyCart,
                message: "cart must have at least one item".into(),
            });
        }

        // Validate line item quantities
        for (i, item) in req.items.iter().enumerate() {
            if item.quantity <= 0 {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidField,
                    message: format!("item {} has invalid quantity: {}", i, item.quantity),
                });
            }
            if item.quantity > MAX_STRIPE_LINE_ITEM_QUANTITY {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidField,
                    message: format!(
                        "item {} quantity {} exceeds maximum {}",
                        i, item.quantity, MAX_STRIPE_LINE_ITEM_QUANTITY
                    ),
                });
            }
        }

        // Build metadata for cart tracking
        let mut metadata = req.metadata.clone();
        // For webhook processing and paywall authorization, cart sessions must include a stable
        // resource_id. cart_id is not currently available in this request, so we use a marker
        // that indicates the session is for the cart flow.
        metadata.insert("resource_id".into(), "cart:checkout".to_string());
        metadata.insert("cart_items".into(), req.items.len().to_string());
        let total_qty: i32 = req.items.iter().map(|i| i.quantity).sum();
        metadata.insert("total_quantity".into(), total_qty.to_string());
        if let Some(code) = &req.coupon_code {
            metadata.insert("coupon_code".into(), code.clone());
        }

        // Encode each item in metadata
        for (i, item) in req.items.iter().enumerate() {
            metadata.insert(format!("item_{}_price_id", i), item.price_id.clone());
            metadata.insert(format!("item_{}_resource", i), item.resource.clone());
            metadata.insert(format!("item_{}_quantity", i), item.quantity.to_string());
            metadata.insert(format!("item_{}_description", i), item.description.clone());
        }

        // Build form - use (String, String) to avoid memory leaks
        let mut form: Vec<(String, String)> = vec![
            ("mode".into(), STRIPE_MODE_PAYMENT.to_string()),
            ("payment_method_types[0]".into(), "card".to_string()),
        ];

        // Add line items
        for (i, item) in req.items.iter().enumerate() {
            form.push((format!("line_items[{}][price]", i), item.price_id.clone()));
            form.push((
                format!("line_items[{}][quantity]", i),
                item.quantity.to_string(),
            ));
        }

        // URLs
        let success_url = req
            .success_url
            .or_else(|| Some(self.config.stripe.success_url.clone()))
            .filter(|s| !s.is_empty())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "success_url is required".into(),
            })?;
        let cancel_url = req
            .cancel_url
            .or_else(|| Some(self.config.stripe.cancel_url.clone()))
            .filter(|s| !s.is_empty())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "cancel_url is required".into(),
            })?;

        form.push(("success_url".into(), success_url));
        form.push(("cancel_url".into(), cancel_url));

        if let Some(email) = &req.customer_email {
            form.push(("customer_email".into(), email.clone()));
        }

        // Checkout requirements
        if let Some(billing) = &req.billing_address_collection {
            form.push(("billing_address_collection".into(), billing.clone()));
        }
        if req.phone_number_collection_enabled {
            form.push((
                "phone_number_collection[enabled]".into(),
                "true".to_string(),
            ));
        }
        if let Some(countries) = &req.shipping_address_collection_countries {
            for (i, c) in countries.iter().enumerate() {
                form.push((
                    format!("shipping_address_collection[allowed_countries][{}]", i),
                    c.clone(),
                ));
            }
        }

        for (k, v) in &metadata {
            form.push((format!("metadata[{}]", k), v.clone()));
        }

        if let Some(promo) = &req.stripe_coupon_id {
            form.push(("discounts[0][promotion_code]".into(), promo.clone()));
        }

        let response = self.stripe_post("checkout/sessions", &form).await?;
        let session: StripeCheckoutSession =
            serde_json::from_value(response).map_err(|e| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: format!("failed to parse response: {}", e),
            })?;

        info!(session_id = %session.id, items = req.items.len(), "Created Stripe cart checkout session");

        let url = require_session_url(&session)?;
        Ok(StripeSession {
            session_id: session.id,
            url,
        })
    }

    /// Create a subscription checkout session
    pub async fn create_subscription_checkout(
        &self,
        req: CreateSubscriptionRequest,
    ) -> ServiceResult<StripeSession> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        let mut metadata = req.metadata.clone();
        metadata.insert("subscription".into(), "true".into());
        metadata.insert("product_id".into(), req.product_id.clone());

        // Use (String, String) to avoid memory leaks
        let mut form: Vec<(String, String)> = vec![
            ("mode".into(), STRIPE_MODE_SUBSCRIPTION.to_string()),
            ("payment_method_types[0]".into(), "card".to_string()),
            ("line_items[0][price]".into(), req.price_id.clone()),
            ("line_items[0][quantity]".into(), "1".to_string()),
        ];

        if let Some(days) = req.trial_days {
            if days > 0 {
                form.push((
                    "subscription_data[trial_period_days]".into(),
                    days.to_string(),
                ));
            }
        }

        let success_url = req
            .success_url
            .or_else(|| Some(self.config.stripe.success_url.clone()))
            .filter(|s| !s.is_empty())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "success_url is required".into(),
            })?;
        let cancel_url = req
            .cancel_url
            .or_else(|| Some(self.config.stripe.cancel_url.clone()))
            .filter(|s| !s.is_empty())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "cancel_url is required".into(),
            })?;

        form.push(("success_url".into(), success_url));
        form.push(("cancel_url".into(), cancel_url));

        if let Some(email) = &req.customer_email {
            form.push(("customer_email".into(), email.clone()));
        }

        // Session metadata (for checkout.session.completed webhook)
        for (k, v) in &metadata {
            form.push((format!("metadata[{}]", k), v.clone()));
        }

        // CRITICAL: Also add metadata to subscription_data so it's available on the
        // subscription object when customer.subscription.* webhooks fire.
        // Without this, tenant_id would be missing from subscription webhooks.
        for (k, v) in &metadata {
            form.push((format!("subscription_data[metadata][{}]", k), v.clone()));
        }

        let response = self.stripe_post("checkout/sessions", &form).await?;
        let session: StripeCheckoutSession =
            serde_json::from_value(response).map_err(|e| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: format!("failed to parse response: {}", e),
            })?;

        info!(session_id = %session.id, product = %req.product_id, "Created Stripe subscription checkout");

        let url = require_session_url(&session)?;
        Ok(StripeSession {
            session_id: session.id,
            url,
        })
    }

    /// Verify a checkout session is complete
    pub async fn verify_session(&self, session_id: &str) -> ServiceResult<bool> {
        let response = self
            .stripe_get(&format!("checkout/sessions/{}", session_id))
            .await?;
        let session: StripeCheckoutSession =
            serde_json::from_value(response).map_err(|e| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: format!("failed to parse session: {}", e),
            })?;

        Ok(session.payment_status == Some("paid".into()))
    }

    /// Cancel a subscription
    pub async fn cancel_subscription(
        &self,
        stripe_sub_id: &str,
        at_period_end: bool,
    ) -> ServiceResult<()> {
        if at_period_end {
            let form: Vec<(String, String)> =
                vec![("cancel_at_period_end".into(), "true".to_string())];
            self.stripe_post(&format!("subscriptions/{}", stripe_sub_id), &form)
                .await?;
        } else {
            self.stripe_delete(&format!("subscriptions/{}", stripe_sub_id))
                .await?;
        }
        Ok(())
    }

    /// Reactivate a cancelled subscription
    pub async fn reactivate_subscription(&self, stripe_sub_id: &str) -> ServiceResult<()> {
        let form: Vec<(String, String)> =
            vec![("cancel_at_period_end".into(), "false".to_string())];
        self.stripe_post(&format!("subscriptions/{}", stripe_sub_id), &form)
            .await?;
        Ok(())
    }

    /// Get subscription details
    pub async fn get_subscription(&self, stripe_sub_id: &str) -> ServiceResult<serde_json::Value> {
        self.stripe_get(&format!("subscriptions/{}", stripe_sub_id))
            .await
    }

    /// Create billing portal session
    pub async fn create_billing_portal_session(
        &self,
        customer_id: &str,
        return_url: &str,
    ) -> ServiceResult<String> {
        let form: Vec<(String, String)> = vec![
            ("customer".into(), customer_id.to_string()),
            ("return_url".into(), return_url.to_string()),
        ];

        let response = self.stripe_post("billing_portal/sessions", &form).await?;
        let url = response
            .get("url")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: "missing portal URL".into(),
            })?;

        Ok(url.to_string())
    }

    /// Preview proration for subscription change
    pub async fn preview_proration(
        &self,
        stripe_sub_id: &str,
        new_price_id: &str,
    ) -> ServiceResult<ProrationPreview> {
        // Get current subscription
        let sub = self
            .stripe_get(&format!("subscriptions/{}", stripe_sub_id))
            .await?;
        let items = sub
            .get("items")
            .and_then(|v| v.get("data"))
            .and_then(|v| v.as_array())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: "missing subscription items".into(),
            })?;

        let item_id = items
            .first()
            .and_then(|v| v.get("id"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: "missing item id".into(),
            })?;

        // Get upcoming invoice with proration
        let now = Utc::now().timestamp();
        let form = vec![
            ("subscription", stripe_sub_id.to_string()),
            ("subscription_items[0][id]", item_id.to_string()),
            ("subscription_items[0][price]", new_price_id.to_string()),
            (
                "subscription_proration_behavior",
                "create_prorations".to_string(),
            ),
            ("subscription_proration_date", now.to_string()),
        ];

        let response = self
            .stripe_get_with_params("invoices/upcoming", &form)
            .await?;

        let amount_due = response
            .get("amount_due")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        let currency = response
            .get("currency")
            .and_then(|v| v.as_str())
            .unwrap_or("usd")
            .to_string();
        let next_date = response
            .get("next_payment_attempt")
            .and_then(|v| v.as_i64())
            .unwrap_or(now);

        let mut lines = Vec::new();
        let mut proration_amount = 0i64;

        if let Some(line_data) = response
            .get("lines")
            .and_then(|v| v.get("data"))
            .and_then(|v| v.as_array())
        {
            for line in line_data {
                let desc = line
                    .get("description")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let amt = line.get("amount").and_then(|v| v.as_i64()).unwrap_or(0);
                let proration = line
                    .get("proration")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                if proration {
                    proration_amount += amt;
                }

                let period = line.get("period").unwrap_or(&serde_json::Value::Null);
                let start = period.get("start").and_then(|v| v.as_i64()).unwrap_or(now);
                let end = period.get("end").and_then(|v| v.as_i64()).unwrap_or(now);

                lines.push(ProrationLine {
                    description: desc,
                    amount: amt,
                    period_start: timestamp_to_datetime(start),
                    period_end: timestamp_to_datetime(end),
                });
            }
        }

        Ok(ProrationPreview {
            amount_due,
            proration_amount,
            currency,
            next_payment_date: timestamp_to_datetime(next_date),
            lines,
        })
    }

    /// Change subscription to a different plan/price
    pub async fn change_subscription(
        &self,
        stripe_sub_id: &str,
        new_price_id: &str,
        proration_behavior: &str,
    ) -> ServiceResult<SubscriptionChangeResult> {
        // Get current subscription
        let sub = self
            .stripe_get(&format!("subscriptions/{}", stripe_sub_id))
            .await?;

        let items = sub
            .get("items")
            .and_then(|v| v.get("data"))
            .and_then(|v| v.as_array())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: "missing subscription items".into(),
            })?;

        let item_id = items
            .first()
            .and_then(|v| v.get("id"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: "missing item id".into(),
            })?;

        let previous_price_id = items
            .first()
            .and_then(|v| v.get("price"))
            .and_then(|v| v.get("id"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        // Update subscription with new price
        let form: Vec<(String, String)> = vec![
            ("items[0][id]".into(), item_id.to_string()),
            ("items[0][price]".into(), new_price_id.to_string()),
            ("proration_behavior".into(), proration_behavior.to_string()),
        ];

        let response = self
            .stripe_post(&format!("subscriptions/{}", stripe_sub_id), &form)
            .await?;

        let status = response
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();
        let current_period_end = response
            .get("current_period_end")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);

        Ok(SubscriptionChangeResult {
            subscription_id: stripe_sub_id.to_string(),
            previous_price_id,
            new_price_id: new_price_id.to_string(),
            status,
            current_period_end: timestamp_to_datetime(current_period_end),
            proration_behavior: proration_behavior.to_string(),
        })
    }

    /// Parse and validate a webhook payload
    pub fn parse_webhook(&self, payload: &[u8], signature: &str) -> ServiceResult<WebhookEvent> {
        // Validate signature
        self.verify_webhook_signature(payload, signature)?;

        // Parse event
        let event: StripeWebhookEvent =
            serde_json::from_slice(payload).map_err(|e| ServiceError::Coded {
                code: ErrorCode::InvalidPaymentProof,
                message: format!("invalid webhook payload: {}", e),
            })?;

        // Only handle checkout.session.completed
        if event.event_type != "checkout.session.completed" {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidPaymentProof,
                message: format!("unsupported event type: {}", event.event_type),
            });
        }

        let session = event.data.object;
        let resource_id = session
            .metadata
            .get("resource_id")
            .cloned()
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::InvalidPaymentProof,
                message: "missing resource_id in metadata".into(),
            })?;

        // Validate amount_total - reject webhooks with missing or zero amounts
        let amount_total = session.amount_total.ok_or_else(|| ServiceError::Coded {
            code: ErrorCode::InvalidAmount,
            message: "missing amount_total in checkout session".into(),
        })?;

        if amount_total <= 0 {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidAmount,
                message: format!("invalid amount_total: {} (must be positive)", amount_total),
            });
        }

        // Validate currency - reject webhooks with missing currency
        let currency = session.currency.ok_or_else(|| ServiceError::Coded {
            code: ErrorCode::InvalidField,
            message: "missing currency in checkout session".into(),
        })?;

        Ok(WebhookEvent {
            event_type: event.event_type,
            session_id: session.id,
            resource_id,
            customer: session.customer,
            metadata: session.metadata,
            amount_total,
            currency,
            payment_intent: session.payment_intent,
        })
    }

    /// Handle a completed checkout session
    pub async fn handle_completion(&self, event: WebhookEvent) -> ServiceResult<()> {
        // Extract tenant_id from metadata, warn if missing (potential data issue)
        let tenant_id = match event.metadata.get("tenant_id").cloned() {
            Some(id) if !id.is_empty() => id,
            _ => {
                warn!(
                    session_id = %event.session_id,
                    "Missing tenant_id in Stripe webhook metadata, using default tenant"
                );
                "default".to_string()
            }
        };

        // Check if already processed
        let signature = format!("{}{}", STRIPE_SIGNATURE_PREFIX, event.session_id);
        if self
            .store
            .has_payment_been_processed(&tenant_id, &signature)
            .await
            .unwrap_or(false)
        {
            debug!(session_id = %event.session_id, "Webhook already processed");
            return Ok(());
        }

        // Record payment - use try_get_asset for external currency codes
        let currency_code = event.currency.to_uppercase();
        let asset = crate::models::try_get_asset(&currency_code).unwrap_or_else(|_| {
            warn!(currency = %currency_code, "Unknown currency from Stripe, defaulting to USD");
            // Use get_asset with safe fallback to avoid panic
            crate::models::get_asset("USD").unwrap_or_else(|| {
                error!("USD asset not registered - this should never happen");
                crate::models::Asset {
                    code: "USD".to_string(),
                    decimals: 2,
                    asset_type: crate::models::AssetType::Fiat,
                    metadata: crate::models::AssetMetadata::default(),
                }
            })
        });
        let mut metadata = event.metadata.clone();
        if let Some(pi) = event.payment_intent.clone() {
            metadata.insert("stripe_payment_intent_id".to_string(), pi);
        }

        let payment = crate::models::PaymentTransaction {
            signature: signature.clone(),
            tenant_id: tenant_id.clone(),
            resource_id: event.resource_id.clone(),
            wallet: event.customer.clone().unwrap_or_default(),
            user_id: None, // Stripe customer → user_id mapping requires cedros-login GET /users/by-stripe-customer/{id}
            amount: Money::new(asset, event.amount_total),
            created_at: Utc::now(),
            metadata,
        };

        // SECURITY: Use try_record_payment for idempotent payment recording (H-003 fix).
        // This prevents duplicate payment records on webhook retries.
        // Returns Ok(true) if newly recorded, Ok(false) if already existed.
        let mut last_error = None;
        let mut payment_recorded_new = false;
        for attempt in 0..3 {
            match self.store.try_record_payment(payment.clone()).await {
                Ok(true) => {
                    if attempt > 0 {
                        info!(
                            attempt = attempt + 1,
                            "Payment recording succeeded after retry"
                        );
                    }
                    last_error = None;
                    payment_recorded_new = true;
                    break;
                }
                Ok(false) => {
                    // Payment already recorded - idempotent success (H-003 fix)
                    debug!(
                        signature = %signature,
                        session_id = %event.session_id,
                        "Payment already recorded by previous webhook - idempotent success"
                    );
                    last_error = None;
                    payment_recorded_new = false;
                    break;
                }
                Err(e) => {
                    last_error = Some(e);
                    if attempt < 2 {
                        let delay_ms = 100 * (1 << attempt); // 100ms, 200ms
                        warn!(
                            attempt = attempt + 1,
                            delay_ms = delay_ms,
                            "Payment recording failed, retrying"
                        );
                        tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
                    }
                }
            }
        }
        if let Some(e) = last_error {
            // Log at ERROR with full context for manual reconciliation
            error!(
                error = %e,
                signature = %signature,
                session_id = %event.session_id,
                amount = %event.amount_total,
                resource_id = %event.resource_id,
                "CRITICAL: Payment recording failed after 3 attempts - requires manual reconciliation"
            );
            return Err(ServiceError::Coded {
                code: ErrorCode::DatabaseError,
                message: "payment recording failed".into(),
            });
        }

        // Per spec (21-stripe-client.md): Increment coupon usage if coupon_code in metadata
        // Uses atomic increment to prevent race conditions exceeding usage limit
        // SECURITY: Only increment if payment was newly recorded (H-003 fix) - prevents double-counting on webhook retries
        if payment_recorded_new {
            if let (Some(coupon_code), Some(ref coupons)) =
                (event.metadata.get("coupon_code"), &self.coupons)
            {
                let mut last_error = None;
                let mut incremented = false;
                for attempt in 0..3 {
                    match coupons
                        .try_increment_usage_atomic(&tenant_id, coupon_code)
                        .await
                    {
                        Ok(true) => {
                            if attempt > 0 {
                                debug!(attempt = attempt + 1, code = %coupon_code, "Coupon usage incremented after retry for Stripe payment");
                            } else {
                                debug!(code = %coupon_code, "Incremented coupon usage for Stripe payment");
                            }
                            incremented = true;
                            break;
                        }
                        Ok(false) => {
                            // Limit reached or coupon not found - this is expected for expired/maxed coupons
                            // Since Stripe already processed the payment at the discounted price, we just log this
                            warn!(
                                code = %coupon_code,
                                "Coupon usage limit reached or coupon not found for Stripe payment - discount was already applied"
                            );
                            incremented = true; // Don't retry, this is a final state
                            break;
                        }
                        Err(e) => {
                            last_error = Some(e);
                            if attempt < 2 {
                                tokio::time::sleep(std::time::Duration::from_millis(50)).await;
                            }
                        }
                    }
                }
                if !incremented {
                    if let Some(e) = last_error {
                        error!(
                            error = %e,
                            code = %coupon_code,
                            "Failed to increment coupon usage after 3 attempts for Stripe payment"
                        );
                    }
                }
            }
        }

        // Trigger callback
        // Per spec (20-webhooks.md): Use default tenant for Stripe payments (no tenant context)
        // Extract user_id from metadata (set during checkout session creation)
        let user_id = event
            .metadata
            .get("user_id")
            .cloned()
            .or_else(|| event.metadata.get("userId").cloned());

        let payment_event = crate::models::PaymentEvent {
            event_id: crate::x402::utils::generate_event_id(),
            event_type: "payment.succeeded".into(),
            event_timestamp: Utc::now(),
            tenant_id: tenant_id.clone(),
            resource_id: event.resource_id,
            method: "stripe".into(),
            stripe_session_id: Some(event.session_id.clone()),
            stripe_customer: event.customer.clone(),
            fiat_amount_cents: Some(event.amount_total),
            fiat_currency: Some(event.currency),
            crypto_atomic_amount: None,
            crypto_token: None,
            wallet: event.customer,
            user_id,
            proof_signature: Some(signature),
            metadata: event.metadata,
            paid_at: Utc::now(),
        };

        self.notifier.payment_succeeded(payment_event).await;

        info!(session_id = %event.session_id, "Processed Stripe checkout completion");
        Ok(())
    }

    /// Verify webhook signature
    fn verify_webhook_signature(
        &self,
        payload: &[u8],
        signature_header: &str,
    ) -> ServiceResult<()> {
        crate::services::stripe::verify_stripe_webhook_signature(
            payload,
            signature_header,
            &self.config.stripe.webhook_secret,
        )
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

    /// Create checkout session with automatic promotion code lookup
    ///
    /// If `coupon_code` is a human-readable code, it will be resolved to Stripe ID
    pub async fn create_checkout_session_with_coupon(
        &self,
        mut req: CreateSessionRequest,
    ) -> ServiceResult<StripeSession> {
        // If there's a coupon code but no Stripe ID, try to look it up
        if req.stripe_coupon_id.is_none() {
            if let Some(code) = &req.coupon_code {
                if let Some(promo_id) = self.lookup_promotion_code_id(code).await? {
                    req.stripe_coupon_id = Some(promo_id);
                }
            }
        }

        self.create_checkout_session(req).await
    }

    /// Create cart checkout session with automatic promotion code lookup
    pub async fn create_cart_checkout_session_with_coupon(
        &self,
        mut req: CreateCartSessionRequest,
    ) -> ServiceResult<StripeSession> {
        // If there's a coupon code but no Stripe ID, try to look it up
        if req.stripe_coupon_id.is_none() {
            if let Some(code) = &req.coupon_code {
                if let Some(promo_id) = self.lookup_promotion_code_id(code).await? {
                    req.stripe_coupon_id = Some(promo_id);
                }
            }
        }

        self.create_cart_checkout_session(req).await
    }

    // HTTP helpers with circuit breaker protection

    async fn stripe_post(
        &self,
        endpoint: &str,
        form: &[(String, String)],
    ) -> ServiceResult<serde_json::Value> {
        self.stripe_post_with_idempotency(endpoint, form, None)
            .await
    }

    async fn stripe_post_with_idempotency(
        &self,
        endpoint: &str,
        form: &[(String, String)],
        idempotency_key: Option<&str>,
    ) -> ServiceResult<serde_json::Value> {
        let url = format!("https://api.stripe.com/v1/{}", endpoint);

        let start = std::time::Instant::now();
        let operation = endpoint.split('/').next().unwrap_or(endpoint);

        let result = self
            .circuit_breaker
            .execute(async {
                let mut req = self
                    .http_client
                    .post(&url)
                    .basic_auth(&self.config.stripe.secret_key, None::<&str>)
                    .form(form);

                if let Some(key) = idempotency_key {
                    // https://docs.stripe.com/idempotency
                    req = req.header("Idempotency-Key", key);
                }

                req.send().await.map_err(|e| ServiceError::Coded {
                    code: ErrorCode::NetworkError,
                    message: e.to_string(),
                })
            })
            .await;

        let duration = start.elapsed().as_secs_f64();

        match result {
            Ok(response) => {
                let result = self.handle_stripe_response(response).await;
                let status = if result.is_ok() { "success" } else { "error" };
                crate::observability::metrics::record_stripe_api_call(operation, status, duration);
                if result.is_err() {
                    crate::observability::metrics::record_stripe_error(operation, "api_error");
                }
                result
            }
            Err(CircuitBreakerError::Open) => {
                crate::observability::metrics::record_stripe_api_call(
                    operation,
                    "circuit_open",
                    duration,
                );
                crate::observability::metrics::record_stripe_error(operation, "circuit_open");
                Err(ServiceError::Coded {
                    code: ErrorCode::ServiceUnavailable,
                    message: "Stripe API circuit breaker is open".into(),
                })
            }
            Err(CircuitBreakerError::ServiceError(e)) => {
                crate::observability::metrics::record_stripe_api_call(operation, "error", duration);
                crate::observability::metrics::record_stripe_error(operation, "network_error");
                Err(e)
            }
        }
    }

    async fn stripe_get(&self, endpoint: &str) -> ServiceResult<serde_json::Value> {
        let url = format!("https://api.stripe.com/v1/{}", endpoint);
        let start = std::time::Instant::now();
        let operation = endpoint.split('/').next().unwrap_or(endpoint);

        let result = self
            .circuit_breaker
            .execute(async {
                self.http_client
                    .get(&url)
                    .basic_auth(&self.config.stripe.secret_key, None::<&str>)
                    .send()
                    .await
                    .map_err(|e| ServiceError::Coded {
                        code: ErrorCode::NetworkError,
                        message: e.to_string(),
                    })
            })
            .await;

        let duration = start.elapsed().as_secs_f64();

        match result {
            Ok(response) => {
                let result = self.handle_stripe_response(response).await;
                let status = if result.is_ok() { "success" } else { "error" };
                crate::observability::metrics::record_stripe_api_call(operation, status, duration);
                if result.is_err() {
                    crate::observability::metrics::record_stripe_error(operation, "api_error");
                }
                result
            }
            Err(CircuitBreakerError::Open) => {
                crate::observability::metrics::record_stripe_api_call(
                    operation,
                    "circuit_open",
                    duration,
                );
                crate::observability::metrics::record_stripe_error(operation, "circuit_open");
                Err(ServiceError::Coded {
                    code: ErrorCode::ServiceUnavailable,
                    message: "Stripe API circuit breaker is open".into(),
                })
            }
            Err(CircuitBreakerError::ServiceError(e)) => {
                crate::observability::metrics::record_stripe_api_call(operation, "error", duration);
                crate::observability::metrics::record_stripe_error(operation, "network_error");
                Err(e)
            }
        }
    }

    async fn stripe_get_with_params(
        &self,
        endpoint: &str,
        params: &[(&str, String)],
    ) -> ServiceResult<serde_json::Value> {
        let url = format!("https://api.stripe.com/v1/{}", endpoint);
        let params_owned: Vec<(String, String)> = params
            .iter()
            .map(|(k, v)| (k.to_string(), v.clone()))
            .collect();
        let start = std::time::Instant::now();
        let operation = endpoint.split('/').next().unwrap_or(endpoint);

        let result = self
            .circuit_breaker
            .execute(async {
                self.http_client
                    .get(&url)
                    .basic_auth(&self.config.stripe.secret_key, None::<&str>)
                    .query(&params_owned)
                    .send()
                    .await
                    .map_err(|e| ServiceError::Coded {
                        code: ErrorCode::NetworkError,
                        message: e.to_string(),
                    })
            })
            .await;

        let duration = start.elapsed().as_secs_f64();

        match result {
            Ok(response) => {
                let result = self.handle_stripe_response(response).await;
                let status = if result.is_ok() { "success" } else { "error" };
                crate::observability::metrics::record_stripe_api_call(operation, status, duration);
                if result.is_err() {
                    crate::observability::metrics::record_stripe_error(operation, "api_error");
                }
                result
            }
            Err(CircuitBreakerError::Open) => {
                crate::observability::metrics::record_stripe_api_call(
                    operation,
                    "circuit_open",
                    duration,
                );
                crate::observability::metrics::record_stripe_error(operation, "circuit_open");
                Err(ServiceError::Coded {
                    code: ErrorCode::ServiceUnavailable,
                    message: "Stripe API circuit breaker is open".into(),
                })
            }
            Err(CircuitBreakerError::ServiceError(e)) => {
                crate::observability::metrics::record_stripe_api_call(operation, "error", duration);
                crate::observability::metrics::record_stripe_error(operation, "network_error");
                Err(e)
            }
        }
    }

    async fn stripe_delete(&self, endpoint: &str) -> ServiceResult<serde_json::Value> {
        let url = format!("https://api.stripe.com/v1/{}", endpoint);
        let start = std::time::Instant::now();
        let operation = endpoint.split('/').next().unwrap_or(endpoint);

        let result = self
            .circuit_breaker
            .execute(async {
                self.http_client
                    .delete(&url)
                    .basic_auth(&self.config.stripe.secret_key, None::<&str>)
                    .send()
                    .await
                    .map_err(|e| ServiceError::Coded {
                        code: ErrorCode::NetworkError,
                        message: e.to_string(),
                    })
            })
            .await;

        let duration = start.elapsed().as_secs_f64();

        match result {
            Ok(response) => {
                let result = self.handle_stripe_response(response).await;
                let status = if result.is_ok() { "success" } else { "error" };
                crate::observability::metrics::record_stripe_api_call(operation, status, duration);
                if result.is_err() {
                    crate::observability::metrics::record_stripe_error(operation, "api_error");
                }
                result
            }
            Err(CircuitBreakerError::Open) => {
                crate::observability::metrics::record_stripe_api_call(
                    operation,
                    "circuit_open",
                    duration,
                );
                crate::observability::metrics::record_stripe_error(operation, "circuit_open");
                Err(ServiceError::Coded {
                    code: ErrorCode::ServiceUnavailable,
                    message: "Stripe API circuit breaker is open".into(),
                })
            }
            Err(CircuitBreakerError::ServiceError(e)) => {
                crate::observability::metrics::record_stripe_api_call(operation, "error", duration);
                crate::observability::metrics::record_stripe_error(operation, "network_error");
                Err(e)
            }
        }
    }

    async fn handle_stripe_response(
        &self,
        response: reqwest::Response,
    ) -> ServiceResult<serde_json::Value> {
        let status = response.status();
        let body = response.text().await.map_err(|e| ServiceError::Coded {
            code: ErrorCode::NetworkError,
            message: e.to_string(),
        })?;

        if !status.is_success() {
            error!(status = %status, body = %body, "Stripe API error");
            return Err(ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: format!("Stripe API error: {} - {}", status, body),
            });
        }

        serde_json::from_str(&body).map_err(|e| ServiceError::Coded {
            code: ErrorCode::StripeError,
            message: format!("failed to parse Stripe response: {}", e),
        })
    }
}

impl StripeClient {
    // ========================================================================
    // Refunds (for Admin API)
    // ========================================================================

    pub(crate) async fn create_refund_for_payment_intent(
        &self,
        payment_intent_id: &str,
        amount: Option<i64>,
        reason: Option<&str>,
        metadata: HashMap<String, String>,
        idempotency_key: &str,
    ) -> ServiceResult<AdminStripeRefund> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        // https://docs.stripe.com/api/refunds/create
        let mut form: Vec<(String, String)> =
            vec![("payment_intent".into(), payment_intent_id.to_string())];

        if let Some(amount) = amount {
            if amount > 0 {
                form.push(("amount".into(), amount.to_string()));
            }
        }

        if let Some(reason) = reason {
            if !reason.is_empty() {
                form.push(("reason".into(), reason.to_string()));
            }
        }

        for (k, v) in metadata {
            form.push((format!("metadata[{}]", k), v));
        }

        let response = self
            .stripe_post_with_idempotency("refunds", &form, Some(idempotency_key))
            .await?;
        let parsed: StripeRefundObject =
            serde_json::from_value(response).map_err(|e| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: format!("failed to parse response: {}", e),
            })?;

        Ok(AdminStripeRefund {
            id: parsed.id,
            amount: parsed.amount,
            currency: parsed.currency,
            status: parsed.status,
            reason: parsed.reason,
            created_at: timestamp_to_datetime(parsed.created),
            charge: parsed.charge,
            payment_intent: parsed.payment_intent,
            metadata: parsed.metadata,
        })
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub(crate) struct AdminStripeRefund {
    pub id: String,
    pub amount: i64,
    pub currency: String,
    pub status: String,
    pub reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub charge: Option<String>,
    pub payment_intent: Option<String>,
    pub metadata: HashMap<String, String>,
}

fn require_session_url(session: &StripeCheckoutSession) -> ServiceResult<String> {
    match session.url.as_deref() {
        Some(url) if !url.is_empty() => Ok(url.to_string()),
        _ => Err(ServiceError::Coded {
            code: ErrorCode::StripeError,
            message: "missing session url".into(),
        }),
    }
}

// ============================================================================
// Status conversions
// ============================================================================

pub fn stripe_status_to_local(status: &str) -> SubscriptionStatus {
    match status {
        "active" => SubscriptionStatus::Active,
        "trialing" => SubscriptionStatus::Trialing,
        "past_due" => SubscriptionStatus::PastDue,
        "canceled" => SubscriptionStatus::Cancelled,
        "unpaid" | "incomplete" | "incomplete_expired" => SubscriptionStatus::Expired,
        "paused" => SubscriptionStatus::PastDue, // Treat paused as past_due (no access)
        unknown => {
            // SECURITY: Default to PastDue (no access) for unknown statuses.
            // This is fail-safe: new Stripe statuses won't grant unintended access.
            tracing::warn!(
                status = %unknown,
                "Unknown Stripe subscription status - defaulting to PastDue for safety"
            );
            SubscriptionStatus::PastDue
        }
    }
}

pub fn stripe_interval_to_period(interval: &str) -> BillingPeriod {
    match interval {
        "day" => BillingPeriod::Day,
        "week" => BillingPeriod::Week,
        "month" => BillingPeriod::Month,
        "year" => BillingPeriod::Year,
        _ => BillingPeriod::Month,
    }
}

// ============================================================================
// Simplified handler methods
// ============================================================================

impl StripeClient {
    /// Simplified create checkout session for handlers
    /// Per spec (02-http-endpoints.md): supports couponCode parameter
    pub async fn create_simple_checkout_session(
        &self,
        resource: &str,
        customer_email: Option<&str>,
        success_url: Option<&str>,
        cancel_url: Option<&str>,
        metadata: Option<&serde_json::Value>,
        coupon_code: Option<&str>,
    ) -> ServiceResult<(String, String)> {
        let mut meta_map = HashMap::new();
        if let Some(m) = metadata {
            if let Some(obj) = m.as_object() {
                for (k, v) in obj {
                    meta_map.insert(k.clone(), v.as_str().unwrap_or_default().to_string());
                }
            }
        }

        let req = CreateSessionRequest {
            resource_id: resource.to_string(),
            amount_cents: 0, // Will use price_id or product lookup
            currency: "usd".to_string(),
            price_id: None,
            customer_email: customer_email.map(|s| s.to_string()),
            billing_address_collection: None,
            phone_number_collection_enabled: false,
            shipping_address_collection_countries: None,
            metadata: meta_map,
            success_url: success_url.map(|s| s.to_string()),
            cancel_url: cancel_url.map(|s| s.to_string()),
            description: resource.to_string(),
            coupon_code: coupon_code.map(|s| s.to_string()),
            original_amount: None,
            discount_amount: None,
            stripe_coupon_id: None,
        };

        let session = self.create_checkout_session(req).await?;
        Ok((session.session_id, session.url))
    }

    /// Verify session and return info for handlers
    pub async fn verify_session_info(&self, session_id: &str) -> ServiceResult<SessionVerifyInfo> {
        let response = self
            .stripe_get(&format!("checkout/sessions/{}", session_id))
            .await?;

        let session: StripeCheckoutSession =
            serde_json::from_value(response.clone()).map_err(|e| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: format!("failed to parse session: {}", e),
            })?;

        let verified = session.payment_status == Some("paid".into());
        let resource_id = session.metadata.get("resource_id").cloned();

        Ok(SessionVerifyInfo {
            verified,
            resource_id,
            paid_at: if verified { Some(Utc::now()) } else { None },
            amount: response
                .get("amount_total")
                .and_then(|v| v.as_i64())
                .map(|a| a.to_string()),
            customer: response
                .get("customer_email")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            metadata: Some(serde_json::to_value(&session.metadata).unwrap_or_default()),
        })
    }

    /// Handle incoming webhook
    ///
    /// Handles checkout.session.completed events and fires appropriate webhooks.
    /// For full subscription lifecycle management (creating/updating local subscription records),
    /// use StripeWebhookProcessor with SubscriptionService.
    ///
    /// # Idempotency
    /// This method is idempotent - it tracks processed webhook event IDs to prevent
    /// duplicate processing. Stripe webhook event IDs are globally unique, so we use
    /// them with a "default" tenant to prevent cross-tenant duplicates.
    pub async fn handle_webhook(&self, signature: &str, body: &str) -> ServiceResult<()> {
        // First verify the signature
        self.verify_webhook_signature(body.as_bytes(), signature)?;

        // Parse to check event type
        let raw: RawWebhookEvent = serde_json::from_str(body).map_err(|e| ServiceError::Coded {
            code: ErrorCode::InvalidPaymentProof,
            message: format!("invalid webhook payload: {}", e),
        })?;

        // Idempotency claim - use "default" tenant since webhook event IDs are globally unique
        // and we want to prevent duplicate processing across the entire service.
        let idempotency_key = format!("stripe_webhook:{}", raw.id);
        let claimed = self
            .store
            .try_record_payment(crate::models::PaymentTransaction {
                signature: idempotency_key.clone(),
                tenant_id: "default".to_string(),
                resource_id: "webhook_idempotency".to_string(),
                wallet: String::new(),
                user_id: None,
                amount: Money::default(),
                created_at: Utc::now(),
                metadata: HashMap::new(),
            })
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;
        if !claimed {
            debug!(event_id = %raw.id, "Webhook already processed");
            return Ok(());
        }

        info!(event_type = %raw.event_type, event_id = %raw.id, "Processing Stripe webhook");

        // Route based on event type
        let result = match raw.event_type.as_str() {
            "checkout.session.completed" => self.handle_checkout_completed_event(body).await,
            "customer.subscription.created" => {
                self.handle_subscription_event(&raw.event_type, body).await
            }
            "customer.subscription.updated" => {
                self.handle_subscription_event(&raw.event_type, body).await
            }
            "customer.subscription.deleted" => {
                self.handle_subscription_event(&raw.event_type, body).await
            }
            "invoice.paid" => self.handle_invoice_event(&raw.event_type, body).await,
            "invoice.payment_failed" => self.handle_invoice_event(&raw.event_type, body).await,
            "charge.refunded" => self.handle_charge_refunded(body).await,
            other => {
                debug!(event_type = %other, "Unhandled Stripe event type");
                Ok(())
            }
        };

        if let Err(err) = result {
            if let Err(e) = self.store.delete_payment("default", &idempotency_key).await {
                warn!(
                    idempotency_key = %idempotency_key,
                    error = %e,
                    "Failed to release webhook idempotency claim (best effort)"
                );
            }
            return Err(err);
        }

        Ok(())
    }

    async fn handle_checkout_completed_event(&self, body: &str) -> ServiceResult<()> {
        let event: StripeWebhookEvent =
            serde_json::from_str(body).map_err(|e| ServiceError::Coded {
                code: ErrorCode::InvalidPaymentProof,
                message: format!("invalid webhook payload: {}", e),
            })?;

        let session = event.data.object;

        // Check if this is a subscription checkout
        if let Some(mode) = session.metadata.get("subscription") {
            if mode == "true" {
                info!(session_id = %session.id, "Subscription checkout completed - subscription.created will handle it");
                return Ok(());
            }
        }

        // Handle one-time payment
        let resource_id = session
            .metadata
            .get("resource_id")
            .cloned()
            .unwrap_or_default();
        if resource_id.is_empty() {
            warn!(session_id = %session.id, "Missing resource_id in checkout metadata");
            return Ok(());
        }

        // Record payment - extract tenant_id from session metadata, warn if missing
        let tenant_id = match session.metadata.get("tenant_id").cloned() {
            Some(id) if !id.is_empty() => id,
            _ => {
                warn!(
                    session_id = %session.id,
                    "Missing tenant_id in session metadata, using default tenant"
                );
                "default".to_string()
            }
        };
        let signature = format!("{}{}", STRIPE_SIGNATURE_PREFIX, session.id);
        // Use try_get_asset for external currency codes from Stripe
        let currency_code = session.currency.clone().unwrap_or_default().to_uppercase();
        let asset = crate::models::try_get_asset(&currency_code).unwrap_or_else(|_| {
            warn!(currency = %currency_code, "Unknown currency from Stripe session, defaulting to USD");
            // Use get_asset with safe fallback to avoid panic
            crate::models::get_asset("USD").unwrap_or_else(|| {
                error!("USD asset not registered - this should never happen");
                crate::models::Asset {
                    code: "USD".to_string(),
                    decimals: 2,
                    asset_type: crate::models::AssetType::Fiat,
                    metadata: crate::models::AssetMetadata::default(),
                }
            })
        });
        // SECURITY: Only trust a user_id embedded in Stripe metadata if we explicitly marked it
        // as server-derived at session creation time.
        let trusted = session
            .metadata
            .get("user_id_trusted")
            .map(|v| v == "true")
            .unwrap_or(false);

        // Extract user_id from session metadata (set during checkout session creation)
        let mut user_id_for_payment = if trusted {
            session
                .metadata
                .get("user_id")
                .cloned()
                .or_else(|| session.metadata.get("userId").cloned())
        } else {
            None
        };

        // If missing, try resolving by Stripe customer id.
        if user_id_for_payment.is_none() {
            user_id_for_payment = self
                .resolve_user_id_by_customer(session.customer.as_deref())
                .await;
        }

        // Only link when user identity is explicitly marked as server-derived.
        if trusted {
            if let (Some(cus), Some(uid)) =
                (session.customer.as_deref(), user_id_for_payment.as_ref())
            {
                self.best_effort_link_customer(cus, uid).await;
            }
        }

        let payment = crate::models::PaymentTransaction {
            signature: signature.clone(),
            tenant_id: tenant_id.clone(),
            resource_id: resource_id.clone(),
            wallet: session.customer.clone().unwrap_or_default(),
            user_id: user_id_for_payment,
            amount: Money::new(asset, session.amount_total.unwrap_or(0)),
            created_at: Utc::now(),
            metadata: session.metadata.clone(),
        };

        // Retry payment recording with exponential backoff - critical for revenue reconciliation
        let mut last_error = None;
        for attempt in 0..3 {
            match self.store.record_payment(payment.clone()).await {
                Ok(_) => {
                    if attempt > 0 {
                        info!(
                            attempt = attempt + 1,
                            "Payment recording succeeded after retry"
                        );
                    }
                    last_error = None;
                    break;
                }
                Err(e) => {
                    last_error = Some(e);
                    if attempt < 2 {
                        let delay_ms = 100 * (1 << attempt); // 100ms, 200ms
                        warn!(
                            attempt = attempt + 1,
                            delay_ms = delay_ms,
                            "Session payment recording failed, retrying"
                        );
                        tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
                    }
                }
            }
        }
        if let Some(e) = last_error {
            error!(
                error = %e,
                signature = %signature,
                session_id = %session.id,
                amount = ?session.amount_total,
                resource_id = %resource_id,
                "CRITICAL: Session payment recording failed after 3 attempts - requires manual reconciliation"
            );
            return Err(ServiceError::Coded {
                code: ErrorCode::DatabaseError,
                message: "payment recording failed".into(),
            });
        }

        // Fire webhook
        // Per spec (20-webhooks.md): Use default tenant for Stripe payments (no tenant context)
        // Extract user_id from metadata (set during checkout session creation)
        let user_id = payment.user_id.clone();

        let payment_event = crate::models::PaymentEvent {
            event_id: crate::x402::utils::generate_event_id(),
            event_type: "payment.succeeded".into(),
            event_timestamp: Utc::now(),
            tenant_id,
            resource_id,
            method: "stripe".into(),
            stripe_session_id: Some(session.id.clone()),
            stripe_customer: session.customer.clone(),
            fiat_amount_cents: session.amount_total,
            fiat_currency: session.currency,
            crypto_atomic_amount: None,
            crypto_token: None,
            wallet: session.customer,
            user_id,
            proof_signature: Some(signature),
            metadata: session.metadata,
            paid_at: Utc::now(),
        };

        self.notifier.payment_succeeded(payment_event).await;
        info!(session_id = %session.id, "Processed checkout.session.completed");
        Ok(())
    }

    async fn handle_subscription_event(&self, event_type: &str, body: &str) -> ServiceResult<()> {
        let event: SubscriptionEventWrapper = serde_json::from_str(body).map_err(|e| {
            ServiceError::Internal(format!("failed to parse subscription event: {}", e))
        })?;

        let sub = event.data.object;
        let tenant_id = match sub.metadata.get("tenant_id").map(|s| s.as_str()) {
            Some(id) if !id.is_empty() => id,
            _ => {
                warn!(
                    subscription_id = %sub.id,
                    "Missing tenant_id in subscription metadata, using default tenant"
                );
                "default"
            }
        };
        let product_id = sub.metadata.get("product_id").cloned().unwrap_or_default();
        let wallet = sub.metadata.get("wallet").cloned();

        match event_type {
            "customer.subscription.created" => {
                info!(stripe_sub_id = %sub.id, product = %product_id, "Subscription created");
                self.notifier
                    .subscription_created(tenant_id, &sub.id, &product_id, wallet.as_deref())
                    .await;
            }
            "customer.subscription.updated" => {
                info!(stripe_sub_id = %sub.id, status = %sub.status, "Subscription updated");
                self.notifier
                    .subscription_updated(tenant_id, &sub.id, &product_id, wallet.as_deref())
                    .await;
            }
            "customer.subscription.deleted" => {
                info!(stripe_sub_id = %sub.id, "Subscription cancelled");
                self.notifier
                    .subscription_cancelled(tenant_id, &sub.id, &product_id, wallet.as_deref())
                    .await;
            }
            _ => {}
        }

        Ok(())
    }

    async fn handle_invoice_event(&self, event_type: &str, body: &str) -> ServiceResult<()> {
        let event: InvoiceEventWrapper = serde_json::from_str(body)
            .map_err(|e| ServiceError::Internal(format!("failed to parse invoice event: {}", e)))?;

        let invoice = event.data.object;
        let subscription_id = match invoice.subscription {
            Some(ref sid) => sid,
            None => {
                debug!(invoice_id = %invoice.id, "Non-subscription invoice, skipping");
                return Ok(());
            }
        };

        // Get metadata from subscription if available
        let tenant_id = match invoice
            .subscription_details
            .as_ref()
            .and_then(|d| d.metadata.get("tenant_id"))
            .map(|s| s.as_str())
        {
            Some(id) if !id.is_empty() => id,
            _ => {
                warn!(
                    invoice_id = %invoice.id,
                    "Missing tenant_id in invoice metadata, using default tenant"
                );
                "default"
            }
        };
        let product_id = invoice
            .subscription_details
            .as_ref()
            .and_then(|d| d.metadata.get("product_id"))
            .cloned()
            .unwrap_or_default();
        let wallet = invoice
            .subscription_details
            .as_ref()
            .and_then(|d| d.metadata.get("wallet"))
            .cloned();

        match event_type {
            "invoice.paid" => {
                info!(invoice_id = %invoice.id, stripe_sub_id = %subscription_id, "Invoice paid - subscription renewed");
                self.notifier
                    .subscription_renewed(
                        tenant_id,
                        subscription_id,
                        &product_id,
                        wallet.as_deref(),
                    )
                    .await;
            }
            "invoice.payment_failed" => {
                info!(invoice_id = %invoice.id, stripe_sub_id = %subscription_id, "Invoice payment failed");
                self.notifier
                    .subscription_payment_failed(
                        tenant_id,
                        subscription_id,
                        &product_id,
                        wallet.as_deref(),
                    )
                    .await;
            }
            _ => {}
        }

        Ok(())
    }

    async fn handle_charge_refunded(&self, body: &str) -> ServiceResult<()> {
        let event: ChargeEventWrapper = serde_json::from_str(body)
            .map_err(|e| ServiceError::Internal(format!("failed to parse charge event: {}", e)))?;

        let charge = event.data.object;
        let tenant_id = match charge.metadata.get("tenant_id").map(|s| s.as_str()) {
            Some(id) if !id.is_empty() => id,
            _ => {
                warn!(
                    charge_id = %charge.id,
                    "Missing tenant_id in charge metadata, using default tenant"
                );
                "default"
            }
        };
        info!(charge_id = %charge.id, amount_refunded = charge.amount_refunded, tenant_id = %tenant_id, "Charge refunded");

        self.notifier
            .refund_processed(
                tenant_id,
                &charge.id,
                charge.amount_refunded,
                charge.currency.as_deref().unwrap_or("usd"),
            )
            .await;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use parking_lot::Mutex;

    use crate::storage::InMemoryStore;
    use crate::webhooks::Notifier;

    #[test]
    fn test_require_session_url_missing() {
        let session = StripeCheckoutSession {
            id: "cs_test".to_string(),
            url: None,
            payment_status: None,
            metadata: HashMap::new(),
        };

        let err = require_session_url(&session).expect_err("expected missing url error");
        match err {
            ServiceError::Coded { code, .. } => assert_eq!(code, ErrorCode::StripeError),
            other => panic!("unexpected error type: {other:?}"),
        }
    }

    #[derive(Default)]
    struct TestNotifier {
        events: Mutex<Vec<crate::models::PaymentEvent>>,
    }

    #[async_trait::async_trait]
    impl Notifier for TestNotifier {
        async fn payment_succeeded(&self, event: crate::models::PaymentEvent) {
            self.events.lock().push(event);
        }

        async fn refund_succeeded(&self, _event: crate::models::RefundEvent) {}

        async fn subscription_created(
            &self,
            _tenant_id: &str,
            _subscription_id: &str,
            _product_id: &str,
            _wallet: Option<&str>,
        ) {
        }

        async fn subscription_updated(
            &self,
            _tenant_id: &str,
            _subscription_id: &str,
            _product_id: &str,
            _wallet: Option<&str>,
        ) {
        }

        async fn subscription_cancelled(
            &self,
            _tenant_id: &str,
            _subscription_id: &str,
            _product_id: &str,
            _wallet: Option<&str>,
        ) {
        }

        async fn subscription_renewed(
            &self,
            _tenant_id: &str,
            _subscription_id: &str,
            _product_id: &str,
            _wallet: Option<&str>,
        ) {
        }

        async fn subscription_payment_failed(
            &self,
            _tenant_id: &str,
            _subscription_id: &str,
            _product_id: &str,
            _wallet: Option<&str>,
        ) {
        }

        async fn refund_processed(
            &self,
            _tenant_id: &str,
            _charge_id: &str,
            _amount: i64,
            _currency: &str,
        ) {
        }
    }

    #[tokio::test]
    async fn test_handle_completion_uses_tenant_id() {
        let cfg = Config::default();
        let store = Arc::new(InMemoryStore::new());
        let notifier = Arc::new(TestNotifier::default());
        let client = StripeClient::new(cfg, store, notifier.clone()).unwrap();

        let mut metadata = HashMap::new();
        metadata.insert("tenant_id".to_string(), "tenant-a".to_string());

        let event = WebhookEvent {
            event_type: "checkout.session.completed".to_string(),
            session_id: "sess-1".to_string(),
            resource_id: "res-1".to_string(),
            customer: None,
            metadata,
            amount_total: 500,
            currency: "usd".to_string(),
            payment_intent: None,
        };

        client.handle_completion(event).await.unwrap();

        let events = notifier.events.lock();
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].tenant_id, "tenant-a");
    }
}
