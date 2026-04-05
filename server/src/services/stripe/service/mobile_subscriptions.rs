//! Stripe-native mobile subscription session management.
//!
//! This creates a dedicated PaymentSheet bootstrap contract for React Native
//! instead of overloading hosted Checkout session responses.

use tracing::info;

use crate::errors::ErrorCode;
use crate::services::{ServiceError, ServiceResult};

use super::super::models::{CreateMobileSubscriptionRequest, MobileSubscriptionSession};
use super::StripeClient;

const STRIPE_MOBILE_SUBSCRIPTIONS_API_VERSION: &str = "2025-06-30.basil";

impl StripeClient {
    /// Create a Stripe-native mobile subscription session for PaymentSheet.
    pub async fn create_mobile_subscription_session(
        &self,
        req: CreateMobileSubscriptionRequest,
    ) -> ServiceResult<MobileSubscriptionSession> {
        if !self.is_enabled() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Stripe is not configured".into(),
            });
        }

        let customer_id = match req.customer_id.as_deref() {
            Some(customer_id) if !customer_id.is_empty() => customer_id.to_string(),
            _ => {
                self.resolve_or_create_mobile_customer(req.customer_email.as_deref(), &req.metadata)
                    .await?
            }
        };

        let customer_ephemeral_key_secret =
            self.create_customer_ephemeral_key(&customer_id).await?;

        let mut form: Vec<(String, String)> = vec![
            ("customer".into(), customer_id.clone()),
            ("items[0][price]".into(), req.price_id.clone()),
            ("payment_behavior".into(), "default_incomplete".to_string()),
            (
                "payment_settings[save_default_payment_method]".into(),
                "on_subscription".to_string(),
            ),
            ("billing_mode[type]".into(), "flexible".to_string()),
            (
                "expand[0]".into(),
                "latest_invoice.confirmation_secret".to_string(),
            ),
            ("expand[1]".into(), "pending_setup_intent".to_string()),
        ];

        if let Some(days) = req.trial_days {
            if days > 0 {
                form.push(("trial_period_days".into(), days.to_string()));
            }
        }

        for (key, value) in &req.metadata {
            form.push((format!("metadata[{}]", key), value.clone()));
        }

        if let Some(code) = &req.coupon_code {
            if let Some(promo_id) = self.lookup_promotion_code_id(code).await? {
                form.push(("discounts[0][promotion_code]".into(), promo_id));
            }
        }

        let response = self
            .stripe_post_with_headers(
                "subscriptions",
                &form,
                req.idempotency_key.as_deref(),
                &[("Stripe-Version", STRIPE_MOBILE_SUBSCRIPTIONS_API_VERSION)],
            )
            .await?;

        let subscription_id = response
            .get("id")
            .and_then(|value| value.as_str())
            .filter(|value| !value.is_empty())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: "missing Stripe subscription id".into(),
            })?
            .to_string();

        let payment_intent_client_secret = response
            .pointer("/latest_invoice/confirmation_secret/client_secret")
            .and_then(|value| value.as_str())
            .filter(|value| !value.is_empty())
            .map(str::to_string);

        let setup_intent_client_secret = response
            .pointer("/pending_setup_intent/client_secret")
            .and_then(|value| value.as_str())
            .filter(|value| !value.is_empty())
            .map(str::to_string);

        let status = response
            .get("status")
            .and_then(|value| value.as_str())
            .filter(|value| !value.is_empty())
            .map(str::to_string);

        if payment_intent_client_secret.is_none()
            && setup_intent_client_secret.is_none()
            && !matches!(status.as_deref(), Some("trialing" | "active"))
        {
            return Err(ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: "Stripe did not return a client secret for the mobile subscription flow"
                    .into(),
            });
        }

        info!(
            stripe_subscription_id = %subscription_id,
            product_id = %req.product_id,
            customer_id = %customer_id,
            "Created Stripe mobile subscription session"
        );

        Ok(MobileSubscriptionSession {
            subscription_id,
            customer_id,
            customer_ephemeral_key_secret,
            payment_intent_client_secret,
            setup_intent_client_secret,
            status,
        })
    }

    async fn resolve_or_create_mobile_customer(
        &self,
        customer_email: Option<&str>,
        metadata: &std::collections::HashMap<String, String>,
    ) -> ServiceResult<String> {
        if let Some(email) = customer_email {
            if let Some(customer_id) = self.find_customer_by_email(email).await? {
                return Ok(customer_id);
            }
        }

        self.create_mobile_customer(customer_email, metadata).await
    }

    async fn find_customer_by_email(&self, email: &str) -> ServiceResult<Option<String>> {
        let response = self
            .stripe_get_with_params(
                "customers",
                &[("email", email.to_string()), ("limit", "1".to_string())],
            )
            .await?;

        Ok(response
            .get("data")
            .and_then(|value| value.as_array())
            .and_then(|customers| customers.first())
            .and_then(|customer| customer.get("id"))
            .and_then(|value| value.as_str())
            .filter(|value| !value.is_empty())
            .map(str::to_string))
    }

    async fn create_mobile_customer(
        &self,
        customer_email: Option<&str>,
        metadata: &std::collections::HashMap<String, String>,
    ) -> ServiceResult<String> {
        let mut form: Vec<(String, String)> = Vec::new();

        if let Some(email) = customer_email {
            form.push(("email".into(), email.to_string()));
        }

        for (key, value) in metadata {
            form.push((format!("metadata[{}]", key), value.clone()));
        }

        let response = self.stripe_post("customers", &form).await?;

        response
            .get("id")
            .and_then(|value| value.as_str())
            .filter(|value| !value.is_empty())
            .map(str::to_string)
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: "missing Stripe customer id".into(),
            })
    }

    async fn create_customer_ephemeral_key(&self, customer_id: &str) -> ServiceResult<String> {
        let response = self
            .stripe_post_with_headers(
                "ephemeral_keys",
                &[("customer".into(), customer_id.to_string())],
                None,
                &[("Stripe-Version", STRIPE_MOBILE_SUBSCRIPTIONS_API_VERSION)],
            )
            .await?;

        response
            .get("secret")
            .and_then(|value| value.as_str())
            .filter(|value| !value.is_empty())
            .map(str::to_string)
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::StripeError,
                message: "missing Stripe customer ephemeral key secret".into(),
            })
    }
}
