//! Internal Stripe webhook event handlers
//!
//! Contains per-event-type handlers dispatched from `handle_webhook`, plus
//! cedros-login customer-resolution helpers used during checkout processing.

use chrono::Utc;
use tracing::{debug, error, info, warn};

use crate::constants::STRIPE_SIGNATURE_PREFIX;
use crate::models::Money;
use crate::services::{ServiceError, ServiceResult};

use super::super::models::{
    ChargeEventWrapper, InvoiceEventWrapper, StripeWebhookEvent, SubscriptionEventWrapper,
};
use super::StripeClient;

impl StripeClient {
    pub(super) async fn handle_checkout_completed_event(&self, body: &str) -> ServiceResult<()> {
        let event: StripeWebhookEvent =
            serde_json::from_str(body).map_err(|e| ServiceError::Coded {
                code: crate::errors::ErrorCode::InvalidPaymentProof,
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

        // Use idempotent try_record_payment to prevent duplicates on webhook retry
        let mut last_error = None;
        let mut is_duplicate = false;
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
                    break;
                }
                Ok(false) => {
                    info!(
                        signature = %signature,
                        session_id = %session.id,
                        "Duplicate Stripe webhook - payment already recorded"
                    );
                    is_duplicate = true;
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
                code: crate::errors::ErrorCode::DatabaseError,
                message: "payment recording failed".into(),
            });
        }

        // Skip webhook/callback for duplicate payments (already fired on first recording)
        if is_duplicate {
            return Ok(());
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

    pub(super) async fn handle_subscription_event(
        &self,
        event_type: &str,
        body: &str,
    ) -> ServiceResult<()> {
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

    pub(super) async fn handle_invoice_event(
        &self,
        event_type: &str,
        body: &str,
    ) -> ServiceResult<()> {
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

    pub(super) async fn handle_charge_refunded(&self, body: &str) -> ServiceResult<()> {
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

// ============================================================================
// Customer identity helpers (used in checkout completion)
// ============================================================================

impl StripeClient {
    pub(super) async fn resolve_user_id_by_customer(
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

    pub(super) async fn best_effort_link_customer(&self, stripe_customer_id: &str, user_id: &str) {
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
}
