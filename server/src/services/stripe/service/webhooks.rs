//! Stripe webhook public API
//!
//! Exposes the public-facing webhook methods: parsing, signature verification,
//! `handle_completion` for the legacy API, and `handle_webhook` for the full
//! event router. Internal per-event handlers live in `webhook_handlers`.

use std::collections::HashMap;

use chrono::Utc;
use tracing::{debug, error, info, warn};

use crate::constants::STRIPE_SIGNATURE_PREFIX;
use crate::errors::ErrorCode;
use crate::models::Money;
use crate::services::{ServiceError, ServiceResult};

use super::super::models::{RawWebhookEvent, StripeWebhookEvent, WebhookEvent};
use super::StripeClient;

impl StripeClient {
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
    pub(super) fn verify_webhook_signature(
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
}
