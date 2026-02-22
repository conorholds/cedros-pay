//! Stripe cart and subscription checkout session management
//!
//! Handles creating checkout sessions for multi-item carts and subscription plans.
//! Single-product checkout lives in `checkout`.

use tracing::info;

use crate::constants::{
    MAX_STRIPE_LINE_ITEM_QUANTITY, STRIPE_MODE_PAYMENT, STRIPE_MODE_SUBSCRIPTION,
};
use crate::errors::ErrorCode;
use crate::services::{ServiceError, ServiceResult};

use super::super::models::{
    CreateCartSessionRequest, CreateSubscriptionRequest, StripeCheckoutSession, StripeSession,
};
use super::{require_session_url, StripeClient};

impl StripeClient {
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
        // BUG-12 fix: preserve caller-supplied resource_id (e.g. "cart:{cart_id}" from handler).
        // Only fall back to generic marker if caller did not provide one.
        metadata
            .entry("resource_id".into())
            .or_insert_with(|| "cart:checkout".to_string());
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
}
