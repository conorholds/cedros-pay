//! Stripe single-product checkout session management
//!
//! Handles creating checkout sessions for single products, verifying sessions,
//! creating billing portal sessions, and coupon-aware wrapper methods.
//! Cart and subscription checkout live in `checkout_multi`.

use std::collections::HashMap;

use chrono::Utc;
use tracing::info;

use crate::constants::{
    MAX_STRIPE_AMOUNT_CENTS, MIN_STRIPE_AMOUNT_CENTS, STRIPE_MODE_PAYMENT,
};
use crate::errors::ErrorCode;
use crate::services::{ServiceError, ServiceResult};

use super::super::models::{
    CreateSessionRequest, SessionVerifyInfo, StripeCheckoutSession, StripeSession,
};
use super::{require_session_url, StripeClient};

impl StripeClient {
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

    /// Simplified create checkout session for handlers
    /// Per spec (02-http-endpoints.md): supports couponCode parameter
    pub async fn create_simple_checkout_session(
        &self,
        resource: &str,
        amount_cents: i64,
        customer_email: Option<&str>,
        success_url: Option<&str>,
        cancel_url: Option<&str>,
        metadata: Option<&serde_json::Value>,
        coupon_code: Option<&str>,
    ) -> ServiceResult<(String, String)> {
        // BUG-09: Require a valid amount instead of hardcoding 0
        if amount_cents <= 0 {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidAmount,
                message: "amount_cents must be positive for simple checkout".into(),
            });
        }

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
            amount_cents,
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
}
