//! Subscription management service
//!
//! # Grace Period Asymmetry (MED-002)
//!
//! Grace period applies to X402 and Credits subscriptions, but NOT Stripe. This is intentional:
//!
//! - **X402**: Blockchain payments take time to confirm (polling, finality). A grace period
//!   prevents false negatives during renewal when payment is in-flight. Without it, users
//!   could lose access momentarily between period end and payment confirmation.
//!
//! - **Credits**: Similar to X402, credits payments are non-recurring and require manual renewal.
//!   Grace period allows users time to renew without losing access.
//!
//! - **Stripe**: Webhooks are instant - subscription updates arrive milliseconds after Stripe
//!   processes them. No grace period needed since period_end is already updated before access
//!   check occurs.
//!
//! This asymmetry is by design. See spec 18-services-subscriptions.md for the access check table.

use std::sync::Arc;

use chrono::{DateTime, Duration as ChronoDuration, Timelike, Utc};
use tracing::{debug, info, warn};
use uuid::Uuid;

use crate::config::Config;
use crate::constants::PAYMENT_CALLBACK_TIMEOUT;
use crate::errors::ErrorCode;
use crate::models::{BillingPeriod, PaymentMethod, Subscription, SubscriptionStatus};
use crate::services::cedros_login::CedrosLoginClient;
use crate::services::{ServiceError, ServiceResult};
use crate::storage::Store;
use crate::webhooks::Notifier;

/// Update request for Stripe subscription changes
#[derive(Debug, Default)]
pub struct StripeSubscriptionUpdate {
    pub status: Option<SubscriptionStatus>,
    pub current_period_start: Option<DateTime<Utc>>,
    pub current_period_end: Option<DateTime<Utc>>,
    pub cancel_at_period_end: Option<bool>,
    pub cancelled_at: Option<DateTime<Utc>>,
    pub new_product_id: Option<String>,
    pub billing_period: Option<BillingPeriod>,
    pub billing_interval: Option<i32>,
}

/// Result of a subscription plan change
/// Per spec (18-services-subscriptions.md): Includes proration amount
#[derive(Debug)]
pub struct ChangeSubscriptionResult {
    pub subscription: Subscription,
    pub previous_product: String,
    pub new_product: String,
    pub effective_date: DateTime<Utc>,
    /// Proration amount in cents (positive for upgrade charge, negative for credit)
    /// Per spec (18-services-subscriptions.md)
    pub proration_amount: i64,
}

/// Subscription service for managing subscription lifecycle
///
/// Note: Fields are used across multiple request paths and workers.
pub struct SubscriptionService<S: Store> {
    config: Arc<Config>,
    store: Arc<S>,
    notifier: Arc<dyn Notifier>,
    /// Optional cedros-login client for user_id resolution
    cedros_login: Option<Arc<CedrosLoginClient>>,

    wallet_user_cache: crate::ttl_cache::TtlCache<Option<String>>,

    /// Optional library callback for embedding applications.
    payment_callback: Option<Arc<dyn crate::PaymentCallback>>,
}

impl<S: Store> SubscriptionService<S> {
    pub fn new(config: Arc<Config>, store: Arc<S>, notifier: Arc<dyn Notifier>) -> Self {
        Self {
            config,
            store,
            notifier,
            cedros_login: None,
            wallet_user_cache: crate::ttl_cache::TtlCache::new(10_000),
            payment_callback: None,
        }
    }

    /// Set cedros-login client for user_id resolution
    pub fn with_cedros_login(mut self, client: Arc<CedrosLoginClient>) -> Self {
        self.cedros_login = Some(client);
        self
    }

    pub fn with_payment_callback(mut self, callback: Arc<dyn crate::PaymentCallback>) -> Self {
        self.payment_callback = Some(callback);
        self
    }

    async fn call_subscription_created_callback(&self, sub: &Subscription) {
        let Some(cb) = self.payment_callback.as_ref() else {
            return;
        };
        match tokio::time::timeout(PAYMENT_CALLBACK_TIMEOUT, cb.on_subscription_created(sub)).await
        {
            Ok(Ok(())) => {}
            Ok(Err(e)) => {
                tracing::warn!(error = %e, "PaymentCallback::on_subscription_created failed");
            }
            Err(_) => {
                tracing::warn!(
                    timeout_ms = PAYMENT_CALLBACK_TIMEOUT.as_millis(),
                    "PaymentCallback::on_subscription_created timed out"
                );
            }
        }
    }

    async fn call_subscription_cancelled_callback(&self, sub: &Subscription) {
        let Some(cb) = self.payment_callback.as_ref() else {
            return;
        };
        match tokio::time::timeout(PAYMENT_CALLBACK_TIMEOUT, cb.on_subscription_cancelled(sub))
            .await
        {
            Ok(Ok(())) => {}
            Ok(Err(e)) => {
                tracing::warn!(error = %e, "PaymentCallback::on_subscription_cancelled failed");
            }
            Err(_) => {
                tracing::warn!(
                    timeout_ms = PAYMENT_CALLBACK_TIMEOUT.as_millis(),
                    "PaymentCallback::on_subscription_cancelled timed out"
                );
            }
        }
    }

    /// Resolve user_id from wallet address via cedros-login
    async fn resolve_user_id_from_wallet(&self, wallet: &str) -> Option<String> {
        const POSITIVE_TTL: std::time::Duration = std::time::Duration::from_secs(15 * 60);
        const NEGATIVE_TTL: std::time::Duration = std::time::Duration::from_secs(60);

        let client = self.cedros_login.as_ref()?;

        if let Some(cached) = self.wallet_user_cache.get(wallet) {
            return cached;
        }

        match client.lookup_user_by_wallet(wallet).await {
            Ok(user_id) => {
                self.wallet_user_cache
                    .set(wallet.to_string(), user_id.clone(), POSITIVE_TTL);
                user_id
            }
            Err(e) => {
                debug!(wallet = %wallet, error = %e, "Failed to resolve user_id from wallet");
                self.wallet_user_cache
                    .set(wallet.to_string(), None, NEGATIVE_TTL);
                None
            }
        }
    }

    /// Get a reference to the store
    pub fn store(&self) -> Arc<S> {
        self.store.clone()
    }

    // ========================================================================
    // Creation
    // ========================================================================

    /// Create a new Stripe subscription
    #[allow(clippy::too_many_arguments)]
    pub async fn create_stripe_subscription(
        &self,
        tenant_id: &str,
        wallet: &str,
        product_id: &str,
        stripe_subscription_id: &str,
        stripe_customer_id: &str,
        period_start: chrono::DateTime<Utc>,
        period_end: chrono::DateTime<Utc>,
        billing_period: BillingPeriod,
        billing_interval: i32,
        status: SubscriptionStatus,
    ) -> ServiceResult<Subscription> {
        self.create_stripe_subscription_with_user_id(
            tenant_id,
            wallet,
            product_id,
            stripe_subscription_id,
            stripe_customer_id,
            period_start,
            period_end,
            billing_period,
            billing_interval,
            status,
            None,
        )
        .await
    }

    /// Create a new Stripe subscription, optionally binding to a cedros-login user_id.
    ///
    /// This preserves the public `create_stripe_subscription` signature while allowing
    /// webhook-driven flows to persist server-derived user identity.
    #[allow(clippy::too_many_arguments)]
    pub async fn create_stripe_subscription_with_user_id(
        &self,
        tenant_id: &str,
        wallet: &str,
        product_id: &str,
        stripe_subscription_id: &str,
        stripe_customer_id: &str,
        period_start: chrono::DateTime<Utc>,
        period_end: chrono::DateTime<Utc>,
        billing_period: BillingPeriod,
        billing_interval: i32,
        status: SubscriptionStatus,
        user_id: Option<String>,
    ) -> ServiceResult<Subscription> {
        // Idempotency: Stripe subscription IDs are globally unique.
        // If we already have this subscription recorded (e.g., webhook retry), return it.
        if let Some(existing) = self
            .store
            .find_subscription_by_stripe_id(stripe_subscription_id)
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?
        {
            if existing.tenant_id != tenant_id {
                warn!(
                    stripe_sub_id = %stripe_subscription_id,
                    existing_tenant_id = %existing.tenant_id,
                    requested_tenant_id = %tenant_id,
                    "Stripe subscription already exists under a different tenant; returning existing to prevent duplicates"
                );
            }
            return Ok(existing);
        }

        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let subscription = Subscription {
            id: id.clone(),
            tenant_id: tenant_id.to_string(),
            wallet: Some(wallet.to_string()),
            user_id,
            product_id: product_id.to_string(),
            plan_id: None, // TODO: Pass plan_id from request when frontend sends it
            payment_method: PaymentMethod::Stripe,
            stripe_subscription_id: Some(stripe_subscription_id.to_string()),
            stripe_customer_id: Some(stripe_customer_id.to_string()),
            status,
            billing_period,
            billing_interval,
            current_period_start: period_start,
            current_period_end: period_end,
            trial_end: None,
            cancel_at_period_end: false,
            cancelled_at: None,
            payment_signature: None, // Stripe subscriptions don't use payment signatures
            created_at: Some(now),
            updated_at: Some(now),
            metadata: std::collections::HashMap::new(),
        };

        self.store
            .save_subscription(subscription.clone())
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        info!(id = %id, product_id = %product_id, wallet = %wallet, "Created Stripe subscription");
        Ok(subscription)
    }

    /// Create a new x402 subscription
    ///
    /// Per spec: If wallet already has an active subscription for this product,
    /// extend the existing subscription instead of creating a new one.
    ///
    /// SECURITY (H-004): The payment_signature parameter enables idempotency checking
    /// to prevent duplicate subscriptions for the same payment.
    pub async fn create_x402_subscription(
        &self,
        tenant_id: &str,
        wallet: &str,
        product_id: &str,
        billing_period: BillingPeriod,
        billing_interval: i32,
        payment_signature: Option<&str>,
    ) -> ServiceResult<Subscription> {
        // SECURITY (H-004): Check if payment signature already used for a subscription.
        // This prevents creating duplicate subscriptions for the same payment.
        if let Some(sig) = payment_signature {
            if let Some(existing) = self
                .store
                .get_subscription_by_payment_signature(tenant_id, sig)
                .await
                .map_err(|e| ServiceError::Internal(e.to_string()))?
            {
                debug!(
                    sub_id = %existing.id,
                    wallet = %wallet,
                    product_id = %product_id,
                    "Found existing subscription with same payment signature, returning existing"
                );
                return Ok(existing);
            }
        }

        // Check if wallet already has active subscription for this product (idempotency)
        let existing = self
            .store
            .get_subscriptions_by_wallet(tenant_id, wallet)
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        if let Some(active_sub) = existing
            .into_iter()
            .find(|s| s.product_id == product_id && s.is_active())
        {
            // Extend existing subscription instead of creating new one
            debug!(
                sub_id = %active_sub.id,
                wallet = %wallet,
                product_id = %product_id,
                "Found existing active subscription, extending instead of creating"
            );
            return self
                .extend_x402_subscription(
                    tenant_id,
                    &active_sub.id,
                    billing_period,
                    billing_interval,
                )
                .await;
        }

        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let period_end = calculate_period_end(now, &billing_period, billing_interval);

        // Resolve user_id from wallet via cedros-login (if configured)
        let user_id = self.resolve_user_id_from_wallet(wallet).await;

        let subscription = Subscription {
            id: id.clone(),
            tenant_id: tenant_id.to_string(),
            wallet: Some(wallet.to_string()),
            user_id,
            product_id: product_id.to_string(),
            plan_id: None, // TODO: Pass plan_id from request when frontend sends it
            payment_method: PaymentMethod::X402,
            stripe_subscription_id: None,
            stripe_customer_id: None,
            status: SubscriptionStatus::Active,
            billing_period,
            billing_interval,
            current_period_start: now,
            current_period_end: period_end,
            trial_end: None,
            cancel_at_period_end: false,
            cancelled_at: None,
            created_at: Some(now),
            updated_at: Some(now),
            payment_signature: payment_signature.map(|s| s.to_string()),
            metadata: std::collections::HashMap::new(),
        };

        self.store
            .save_subscription(subscription.clone())
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        self.notifier
            .subscription_created(tenant_id, &subscription.id, product_id, Some(wallet))
            .await;

        self.call_subscription_created_callback(&subscription).await;

        info!(id = %id, product_id = %product_id, wallet = %wallet, "Created x402 subscription");
        Ok(subscription)
    }

    /// Create a new credits subscription
    ///
    /// Per spec: If wallet already has an active subscription for this product,
    /// extend the existing subscription instead of creating a new one.
    pub async fn create_credits_subscription(
        &self,
        tenant_id: &str,
        wallet: &str,
        product_id: &str,
        billing_period: BillingPeriod,
        billing_interval: i32,
    ) -> ServiceResult<Subscription> {
        // Check if wallet already has active subscription for this product (idempotency)
        let existing = self
            .store
            .get_subscriptions_by_wallet(tenant_id, wallet)
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        if let Some(active_sub) = existing
            .into_iter()
            .find(|s| s.product_id == product_id && s.is_active())
        {
            // Extend existing subscription instead of creating new one
            debug!(
                sub_id = %active_sub.id,
                wallet = %wallet,
                product_id = %product_id,
                "Found existing active subscription, extending instead of creating"
            );
            return self
                .extend_credits_subscription(
                    tenant_id,
                    &active_sub.id,
                    billing_period,
                    billing_interval,
                )
                .await;
        }

        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let period_end = calculate_period_end(now, &billing_period, billing_interval);

        // Resolve user_id from wallet via cedros-login (if configured)
        let user_id = self.resolve_user_id_from_wallet(wallet).await;

        let subscription = Subscription {
            id: id.clone(),
            tenant_id: tenant_id.to_string(),
            wallet: Some(wallet.to_string()),
            user_id,
            product_id: product_id.to_string(),
            plan_id: None, // TODO: Pass plan_id from request when frontend sends it
            payment_method: PaymentMethod::Credits,
            stripe_subscription_id: None,
            stripe_customer_id: None,
            status: SubscriptionStatus::Active,
            billing_period,
            billing_interval,
            current_period_start: now,
            current_period_end: period_end,
            trial_end: None,
            cancel_at_period_end: false,
            cancelled_at: None,
            payment_signature: None, // Credits subscriptions use hold_id for idempotency
            created_at: Some(now),
            updated_at: Some(now),
            metadata: std::collections::HashMap::new(),
        };

        self.store
            .save_subscription(subscription.clone())
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        self.notifier
            .subscription_created(tenant_id, &subscription.id, product_id, Some(wallet))
            .await;

        self.call_subscription_created_callback(&subscription).await;

        info!(id = %id, product_id = %product_id, wallet = %wallet, "Created credits subscription");
        Ok(subscription)
    }

    // ========================================================================
    // Access Check
    // ========================================================================

    /// Check if wallet has active subscription access to a product
    pub async fn has_access(
        &self,
        tenant_id: &str,
        wallet: &str,
        product_id: &str,
    ) -> ServiceResult<(bool, Option<Subscription>)> {
        let subscriptions = self
            .store
            .get_subscriptions_by_wallet(tenant_id, wallet)
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        let now = Utc::now();
        let grace_duration = ChronoDuration::hours(self.grace_period_hours());

        for sub in subscriptions {
            if sub.product_id != product_id {
                continue;
            }

            // Per spec (18-services-subscriptions.md): Access check logic table
            // - Active: in period = true, grace period = true (x402 only)
            // - Trialing: in period = true, grace period = false
            // - PastDue: in period = true, grace period = false
            // - Cancelled: in period = true, grace period = false
            // - Expired: false
            let has_access = match sub.status {
                SubscriptionStatus::Active => {
                    // Active: grants access within period, or within grace period for x402/credits
                    if sub.current_period_end > now {
                        true
                    } else {
                        // Period ended but still in grace period (x402/credits - non-recurring payments)
                        matches!(
                            sub.payment_method,
                            PaymentMethod::X402 | PaymentMethod::Credits
                        ) && sub.current_period_end + grace_duration > now
                    }
                }
                SubscriptionStatus::Trialing => {
                    // Trialing: grants access only within trial/period, no grace period
                    // Per spec: check trial_end if set, otherwise check current_period_end
                    sub.trial_end
                        .map_or(sub.current_period_end > now, |te| te > now)
                }
                SubscriptionStatus::PastDue => {
                    // PastDue: grants access only within period, NO grace period
                    // Per spec 18-services-subscriptions.md: "Grace period only applies when Status == Active"
                    sub.current_period_end > now
                }
                SubscriptionStatus::Cancelled => {
                    // Cancelled subscriptions retain access until their paid period ends
                    // This applies whether cancelled immediately or at period end -
                    // the user paid for this period and should get to use it
                    sub.current_period_end > now
                }
                SubscriptionStatus::Expired | SubscriptionStatus::Unpaid => false,
            };

            if has_access {
                return Ok((true, Some(sub)));
            }
        }

        Ok((false, None))
    }

    /// Check if wallet has access to product by subscription ID
    /// Per spec (18-services-subscriptions.md): Uses same access logic as has_access
    pub async fn check_subscription_access(
        &self,
        tenant_id: &str,
        subscription_id: &str,
    ) -> ServiceResult<bool> {
        let sub = self
            .store
            .get_subscription(tenant_id, subscription_id)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::SubscriptionNotFound,
                message: "subscription not found".into(),
            })?
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::SubscriptionNotFound,
                message: "subscription not found".into(),
            })?;

        let now = Utc::now();
        let grace_duration = ChronoDuration::hours(self.grace_period_hours());

        let has_access = match sub.status {
            SubscriptionStatus::Active => {
                // Active: grants access within period, or within grace period for x402/credits
                if sub.current_period_end > now {
                    true
                } else {
                    matches!(
                        sub.payment_method,
                        PaymentMethod::X402 | PaymentMethod::Credits
                    ) && sub.current_period_end + grace_duration > now
                }
            }
            SubscriptionStatus::Trialing => {
                // Trialing: grants access only within trial period, no grace period
                // Per spec 18-services-subscriptions.md: check trial_end if set, otherwise current_period_end
                sub.trial_end
                    .map_or(sub.current_period_end > now, |te| te > now)
            }
            SubscriptionStatus::PastDue => {
                // PastDue: grants access only within period, NO grace period per spec 18-services-subscriptions.md
                // Spec states: "Grace period only applies when Status == StatusActive"
                sub.current_period_end > now
            }
            SubscriptionStatus::Cancelled => {
                // Cancelled subscriptions retain access until their paid period ends
                sub.current_period_end > now
            }
            SubscriptionStatus::Expired | SubscriptionStatus::Unpaid => false,
        };

        Ok(has_access)
    }

    // ========================================================================
    // x402 Renewal
    // ========================================================================

    /// Extend an x402 subscription (for renewals)
    pub async fn extend_x402_subscription(
        &self,
        tenant_id: &str,
        id: &str,
        period: BillingPeriod,
        interval: i32,
    ) -> ServiceResult<Subscription> {
        let mut subscription = self.get_subscription(tenant_id, id).await?;

        if subscription.payment_method != PaymentMethod::X402 {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidOperation,
                message: "can only extend x402 subscriptions".into(),
            });
        }

        let now = Utc::now();

        // Determine new period start
        let new_start = if subscription.is_active() {
            // Seamless extension: new period starts at current period end
            subscription.current_period_end
        } else {
            // Restart: new period starts now
            now
        };

        let new_end = calculate_period_end(new_start, &period, interval);

        subscription.current_period_start = new_start;
        subscription.current_period_end = new_end;
        subscription.billing_period = period;
        subscription.billing_interval = interval;
        subscription.status = SubscriptionStatus::Active;
        subscription.cancel_at_period_end = false;
        subscription.updated_at = Some(now);

        self.store
            .save_subscription(subscription.clone())
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        self.notifier
            .subscription_renewed(
                tenant_id,
                &subscription.id,
                &subscription.product_id,
                subscription.wallet.as_deref(),
            )
            .await;

        info!(id = %id, new_end = %new_end, "Extended x402 subscription");
        Ok(subscription)
    }

    /// Extend a credits subscription (for renewals)
    pub async fn extend_credits_subscription(
        &self,
        tenant_id: &str,
        id: &str,
        period: BillingPeriod,
        interval: i32,
    ) -> ServiceResult<Subscription> {
        let mut subscription = self.get_subscription(tenant_id, id).await?;

        if subscription.payment_method != PaymentMethod::Credits {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidOperation,
                message: "can only extend credits subscriptions".into(),
            });
        }

        let now = Utc::now();

        // Determine new period start
        let new_start = if subscription.is_active() {
            // Seamless extension: new period starts at current period end
            subscription.current_period_end
        } else {
            // Restart: new period starts now
            now
        };

        let new_end = calculate_period_end(new_start, &period, interval);

        subscription.current_period_start = new_start;
        subscription.current_period_end = new_end;
        subscription.billing_period = period;
        subscription.billing_interval = interval;
        subscription.status = SubscriptionStatus::Active;
        subscription.cancel_at_period_end = false;
        subscription.updated_at = Some(now);

        self.store
            .save_subscription(subscription.clone())
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        self.notifier
            .subscription_renewed(
                tenant_id,
                &subscription.id,
                &subscription.product_id,
                subscription.wallet.as_deref(),
            )
            .await;

        info!(id = %id, new_end = %new_end, "Extended credits subscription");
        Ok(subscription)
    }

    // ========================================================================
    // Direct Lookups
    // ========================================================================

    /// Get subscription by ID
    pub async fn get(&self, tenant_id: &str, id: &str) -> ServiceResult<Subscription> {
        self.get_subscription(tenant_id, id).await
    }

    /// Get subscription by wallet and product
    pub async fn get_by_wallet(
        &self,
        tenant_id: &str,
        wallet: &str,
        product_id: &str,
    ) -> ServiceResult<Option<Subscription>> {
        self.store
            .get_subscription_by_wallet(tenant_id, wallet, product_id)
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))
    }

    /// Get subscription by Stripe subscription ID
    pub async fn get_by_stripe_subscription_id(
        &self,
        tenant_id: &str,
        stripe_sub_id: &str,
    ) -> ServiceResult<Option<Subscription>> {
        self.store
            .get_subscription_by_stripe_id(tenant_id, stripe_sub_id)
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))
    }

    /// Find subscription by Stripe subscription ID across all tenants (for webhook handling)
    /// Note: This bypasses tenant isolation because Stripe webhooks don't include tenant context.
    pub async fn find_by_stripe_subscription_id(
        &self,
        stripe_sub_id: &str,
    ) -> ServiceResult<Option<Subscription>> {
        self.store
            .find_subscription_by_stripe_id(stripe_sub_id)
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))
    }

    /// Check if wallet has Stripe subscription access
    pub async fn has_stripe_access(
        &self,
        tenant_id: &str,
        stripe_sub_id: &str,
    ) -> ServiceResult<(bool, Option<Subscription>)> {
        let sub = self
            .get_by_stripe_subscription_id(tenant_id, stripe_sub_id)
            .await?;
        match sub {
            Some(s) if s.is_active() => Ok((true, Some(s))),
            Some(s) => Ok((false, Some(s))),
            None => Ok((false, None)),
        }
    }

    // ========================================================================
    // Stripe Webhook Handlers
    // ========================================================================

    /// Handle Stripe subscription renewal (invoice.paid)
    pub async fn handle_stripe_renewal(
        &self,
        tenant_id: &str,
        stripe_sub_id: &str,
        period_start: chrono::DateTime<Utc>,
        period_end: chrono::DateTime<Utc>,
    ) -> ServiceResult<Subscription> {
        let mut subscription = self
            .get_by_stripe_subscription_id(tenant_id, stripe_sub_id)
            .await?
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::SubscriptionNotFound,
                message: "stripe subscription not found".into(),
            })?;

        subscription.current_period_start = period_start;
        subscription.current_period_end = period_end;
        subscription.status = SubscriptionStatus::Active;
        subscription.updated_at = Some(Utc::now());

        self.store
            .save_subscription(subscription.clone())
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        info!(stripe_sub_id = %stripe_sub_id, "Processed Stripe renewal");
        Ok(subscription)
    }

    /// Handle Stripe payment failure (invoice.payment_failed)
    pub async fn handle_stripe_payment_failed(
        &self,
        tenant_id: &str,
        stripe_sub_id: &str,
    ) -> ServiceResult<Subscription> {
        let mut subscription = self
            .get_by_stripe_subscription_id(tenant_id, stripe_sub_id)
            .await?
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::SubscriptionNotFound,
                message: "stripe subscription not found".into(),
            })?;

        subscription.status = SubscriptionStatus::PastDue;
        subscription.updated_at = Some(Utc::now());

        self.store
            .save_subscription(subscription.clone())
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        info!(stripe_sub_id = %stripe_sub_id, "Marked Stripe subscription as past_due");
        Ok(subscription)
    }

    /// Handle Stripe subscription cancellation (customer.subscription.deleted)
    pub async fn handle_stripe_cancelled(
        &self,
        tenant_id: &str,
        stripe_sub_id: &str,
    ) -> ServiceResult<Subscription> {
        let mut subscription = self
            .get_by_stripe_subscription_id(tenant_id, stripe_sub_id)
            .await?
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::SubscriptionNotFound,
                message: "stripe subscription not found".into(),
            })?;

        subscription.status = SubscriptionStatus::Cancelled;
        subscription.cancelled_at = Some(Utc::now());
        subscription.updated_at = Some(Utc::now());

        self.store
            .save_subscription(subscription.clone())
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        info!(stripe_sub_id = %stripe_sub_id, "Cancelled Stripe subscription");
        Ok(subscription)
    }

    /// Handle Stripe subscription update (customer.subscription.updated)
    pub async fn handle_stripe_subscription_updated(
        &self,
        tenant_id: &str,
        stripe_sub_id: &str,
        update: StripeSubscriptionUpdate,
    ) -> ServiceResult<Subscription> {
        let mut subscription = self
            .get_by_stripe_subscription_id(tenant_id, stripe_sub_id)
            .await?
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::SubscriptionNotFound,
                message: "stripe subscription not found".into(),
            })?;

        if let Some(status) = update.status {
            subscription.status = status;
        }
        if let Some(period_start) = update.current_period_start {
            subscription.current_period_start = period_start;
        }
        if let Some(period_end) = update.current_period_end {
            subscription.current_period_end = period_end;
        }
        if let Some(cancel_at_end) = update.cancel_at_period_end {
            subscription.cancel_at_period_end = cancel_at_end;
        }
        if let Some(cancelled_at) = update.cancelled_at {
            subscription.cancelled_at = Some(cancelled_at);
        }
        if let Some(new_product_id) = update.new_product_id {
            // Store previous product in metadata for plan change tracking
            subscription.metadata.insert(
                "previous_product".to_string(),
                subscription.product_id.clone(),
            );
            subscription
                .metadata
                .insert("changed_at".to_string(), Utc::now().to_rfc3339());
            subscription.product_id = new_product_id;
        }
        if let Some(period) = update.billing_period {
            subscription.billing_period = period;
        }
        if let Some(interval) = update.billing_interval {
            subscription.billing_interval = interval;
        }

        subscription.updated_at = Some(Utc::now());

        self.store
            .save_subscription(subscription.clone())
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        info!(stripe_sub_id = %stripe_sub_id, "Updated Stripe subscription");
        Ok(subscription)
    }

    // ========================================================================
    // Batch Operations
    // ========================================================================

    /// List subscriptions expiring within the given duration
    pub async fn list_expiring(
        &self,
        tenant_id: &str,
        within: std::time::Duration,
    ) -> ServiceResult<Vec<Subscription>> {
        let before = Utc::now() + ChronoDuration::from_std(within).unwrap_or_default();
        self.store
            .list_expiring_subscriptions(tenant_id, before)
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))
    }

    /// Expire overdue x402 subscriptions (background job)
    pub async fn expire_overdue(&self, tenant_id: &str) -> ServiceResult<i32> {
        let now = Utc::now();
        let grace_duration = ChronoDuration::hours(self.grace_period_hours());
        let cutoff = now - grace_duration;

        // Process in batches to bound memory and DB roundtrips.
        const BATCH_LIMIT: i64 = 500;
        let mut total = 0;

        loop {
            // Only expire x402/credits subscriptions - Stripe is managed by webhooks.
            // Storage-side filtering prevents us from getting stuck paging over Stripe rows.
            let to_expire = self
                .store
                .list_expiring_local_subscriptions_limited(tenant_id, cutoff, BATCH_LIMIT)
                .await
                .map_err(|e| ServiceError::Internal(e.to_string()))?;

            if to_expire.is_empty() {
                break;
            }

            let ids: Vec<String> = to_expire.iter().map(|s| s.id.clone()).collect();
            self.store
                .update_subscription_statuses(tenant_id, &ids, SubscriptionStatus::Expired)
                .await
                .map_err(|e| ServiceError::Internal(e.to_string()))?;

            for sub in to_expire {
                self.notifier
                    .subscription_cancelled(
                        tenant_id,
                        &sub.id,
                        &sub.product_id,
                        sub.wallet.as_deref(),
                    )
                    .await;

                self.call_subscription_cancelled_callback(&sub).await;

                info!(id = %sub.id, "Expired overdue x402 subscription");
                total += 1;
            }
        }

        Ok(total)
    }

    // ========================================================================
    // Plan Changes
    // ========================================================================

    /// Change subscription plan (primarily for Stripe)
    ///
    /// # Errors
    /// Returns `InvalidOperation` if the subscription is cancelled or expired.
    pub async fn change_subscription(
        &self,
        tenant_id: &str,
        subscription_id: &str,
        new_product_id: &str,
        new_billing_period: Option<BillingPeriod>,
        new_billing_interval: Option<i32>,
    ) -> ServiceResult<ChangeSubscriptionResult> {
        let mut subscription = self.get_subscription(tenant_id, subscription_id).await?;

        // Cannot change plan on cancelled/expired subscriptions
        if subscription.status == SubscriptionStatus::Cancelled
            || subscription.status == SubscriptionStatus::Expired
        {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidOperation,
                message: "cannot change plan on cancelled or expired subscription".into(),
            });
        }

        let previous_product = subscription.product_id.clone();

        // Store plan change in metadata
        subscription
            .metadata
            .insert("previous_product".to_string(), previous_product.clone());
        subscription
            .metadata
            .insert("changed_at".to_string(), Utc::now().to_rfc3339());

        subscription.product_id = new_product_id.to_string();
        if let Some(period) = new_billing_period {
            subscription.billing_period = period;
        }
        if let Some(interval) = new_billing_interval {
            subscription.billing_interval = interval;
        }
        subscription.updated_at = Some(Utc::now());

        self.store
            .save_subscription(subscription.clone())
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        info!(
            id = %subscription_id,
            previous = %previous_product,
            new = %new_product_id,
            "Changed subscription plan"
        );

        Ok(ChangeSubscriptionResult {
            subscription,
            previous_product,
            new_product: new_product_id.to_string(),
            effective_date: Utc::now(),
            // Note: Proration amount is calculated by Stripe for Stripe subscriptions.
            // For local-only plan changes, set to 0. The actual proration comes from
            // Stripe's PreviewProration API when calling StripeClient::update_subscription.
            proration_amount: 0,
        })
    }

    // ========================================================================
    // Cancellation & Reactivation
    // ========================================================================

    /// Cancel a subscription
    pub async fn cancel(
        &self,
        tenant_id: &str,
        id: &str,
        at_period_end: bool,
    ) -> ServiceResult<Subscription> {
        let mut subscription = self.get_subscription(tenant_id, id).await?;

        if subscription.status == SubscriptionStatus::Cancelled
            || subscription.status == SubscriptionStatus::Expired
        {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidOperation,
                message: "subscription already cancelled".into(),
            });
        }

        if at_period_end {
            subscription.cancel_at_period_end = true;
        } else {
            subscription.status = SubscriptionStatus::Cancelled;
            subscription.cancelled_at = Some(Utc::now());
        }
        subscription.updated_at = Some(Utc::now());

        self.store
            .save_subscription(subscription.clone())
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        if matches!(
            subscription.payment_method,
            PaymentMethod::X402 | PaymentMethod::Credits
        ) {
            if at_period_end {
                self.notifier
                    .subscription_updated(
                        tenant_id,
                        &subscription.id,
                        &subscription.product_id,
                        subscription.wallet.as_deref(),
                    )
                    .await;
            } else {
                self.notifier
                    .subscription_cancelled(
                        tenant_id,
                        &subscription.id,
                        &subscription.product_id,
                        subscription.wallet.as_deref(),
                    )
                    .await;

                self.call_subscription_cancelled_callback(&subscription)
                    .await;
            }
        }

        info!(id = %id, at_period_end, "Cancelled subscription");
        Ok(subscription)
    }

    /// Reactivate a cancelled subscription per spec (18-services-subscriptions.md)
    pub async fn reactivate(&self, tenant_id: &str, id: &str) -> ServiceResult<Subscription> {
        let mut subscription = self.get_subscription(tenant_id, id).await?;

        if !subscription.cancel_at_period_end {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidOperation,
                message: "subscription not pending cancellation".into(),
            });
        }

        // Per spec: Precondition - current time must be <= CurrentPeriodEnd
        if Utc::now() > subscription.current_period_end {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidOperation,
                message: "cannot reactivate - subscription period has ended".into(),
            });
        }

        // Per spec: Set CancelAtPeriodEnd to false
        subscription.cancel_at_period_end = false;
        // Per spec: Clear CancelledAt
        subscription.cancelled_at = None;
        // Per spec: Set Status to Active
        subscription.status = crate::models::subscription::SubscriptionStatus::Active;
        subscription.updated_at = Some(Utc::now());

        self.store
            .save_subscription(subscription.clone())
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        if matches!(
            subscription.payment_method,
            PaymentMethod::X402 | PaymentMethod::Credits
        ) {
            self.notifier
                .subscription_updated(
                    tenant_id,
                    &subscription.id,
                    &subscription.product_id,
                    subscription.wallet.as_deref(),
                )
                .await;
        }

        info!(id = %id, "Reactivated subscription");
        Ok(subscription)
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    /// Get a subscription by ID
    async fn get_subscription(&self, tenant_id: &str, id: &str) -> ServiceResult<Subscription> {
        self.store
            .get_subscription(tenant_id, id)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::SubscriptionNotFound,
                message: "subscription not found".into(),
            })?
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::SubscriptionNotFound,
                message: "subscription not found".into(),
            })
    }

    /// Grace period in hours from config
    fn grace_period_hours(&self) -> i64 {
        self.config.subscriptions.grace_period_hours as i64
    }
}

/// Calculate the end of a billing period
/// Uses proper calendar arithmetic for months and years (handles month-end correctly)
fn calculate_period_end(
    start: chrono::DateTime<Utc>,
    period: &BillingPeriod,
    interval: i32,
) -> chrono::DateTime<Utc> {
    use chrono::{Datelike, NaiveDate};

    match period {
        BillingPeriod::Day => start + ChronoDuration::days(interval as i64),
        BillingPeriod::Week => start + ChronoDuration::weeks(interval as i64),
        BillingPeriod::Month => {
            // Proper month arithmetic: Jan 31 + 1 month = Feb 28/29
            let months_to_add = interval;
            let mut year = start.year();
            let mut month = start.month() as i32 + months_to_add;

            // Handle year overflow
            while month > 12 {
                month -= 12;
                year += 1;
            }
            while month < 1 {
                month += 12;
                year -= 1;
            }

            // Clamp day to valid range for target month
            let max_day = days_in_month(year, month as u32);
            let day = start.day().min(max_day);

            NaiveDate::from_ymd_opt(year, month as u32, day)
                .and_then(|d| d.and_hms_opt(start.hour(), start.minute(), start.second()))
                .map(|dt| chrono::DateTime::<Utc>::from_naive_utc_and_offset(dt, Utc))
                .unwrap_or(start + ChronoDuration::days(30 * interval as i64))
        }
        BillingPeriod::Year => {
            // Proper year arithmetic: Feb 29 + 1 year = Feb 28 (non-leap year)
            let new_year = start.year() + interval;
            let max_day = days_in_month(new_year, start.month());
            let day = start.day().min(max_day);

            NaiveDate::from_ymd_opt(new_year, start.month(), day)
                .and_then(|d| d.and_hms_opt(start.hour(), start.minute(), start.second()))
                .map(|dt| chrono::DateTime::<Utc>::from_naive_utc_and_offset(dt, Utc))
                .unwrap_or(start + ChronoDuration::days(365 * interval as i64))
        }
    }
}

/// Get the number of days in a given month
fn days_in_month(year: i32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if is_leap_year(year) {
                29
            } else {
                28
            }
        }
        _ => 30,
    }
}

/// Check if a year is a leap year
fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

// ============================================================================
// SubscriptionChecker Implementation
// ============================================================================

use crate::models::SubscriptionInfo;
use crate::services::SubscriptionChecker;
use async_trait::async_trait;

/// Per spec (19-services-paywall.md): Implement SubscriptionChecker trait for PaywallService integration
#[async_trait]
impl<S: Store + 'static> SubscriptionChecker for SubscriptionService<S> {
    async fn has_access(
        &self,
        tenant_id: &str,
        wallet: &str,
        product_id: &str,
    ) -> ServiceResult<(bool, Option<SubscriptionInfo>)> {
        // Delegate to the existing has_access method
        let (has_access, sub_opt) =
            SubscriptionService::has_access(self, tenant_id, wallet, product_id).await?;

        // Convert Subscription to SubscriptionInfo for API response
        let info = sub_opt.map(|sub| SubscriptionInfo {
            subscription_id: sub.id,
            status: format!("{:?}", sub.status).to_lowercase(),
            current_period_end: sub.current_period_end,
        });

        Ok((has_access, info))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::memory::InMemoryStore;
    use async_trait::async_trait;
    use parking_lot::Mutex;
    use std::sync::Arc;

    #[derive(Clone, Default)]
    struct TestNotifier {
        events: Arc<Mutex<Vec<String>>>,
    }

    #[derive(Clone, Default)]
    struct TestPaymentCallback {
        created: Arc<Mutex<u32>>,
    }

    #[derive(Clone)]
    struct SlowPaymentCallback {
        delay: std::time::Duration,
    }

    impl SlowPaymentCallback {
        fn new(delay: std::time::Duration) -> Self {
            Self { delay }
        }
    }

    #[async_trait::async_trait]
    impl crate::PaymentCallback for TestPaymentCallback {
        async fn on_subscription_created(
            &self,
            _subscription: &Subscription,
        ) -> Result<(), crate::PaymentCallbackError> {
            *self.created.lock() += 1;
            Ok(())
        }
    }

    #[async_trait::async_trait]
    impl crate::PaymentCallback for SlowPaymentCallback {
        async fn on_subscription_created(
            &self,
            _subscription: &Subscription,
        ) -> Result<(), crate::PaymentCallbackError> {
            tokio::time::sleep(self.delay).await;
            Ok(())
        }
    }

    impl TestNotifier {
        fn events(&self) -> Arc<Mutex<Vec<String>>> {
            self.events.clone()
        }

        fn record(&self, name: &str) {
            self.events.lock().push(name.to_string());
        }
    }

    #[async_trait]
    impl Notifier for TestNotifier {
        async fn payment_succeeded(&self, _event: crate::models::PaymentEvent) {}
        async fn refund_succeeded(&self, _event: crate::models::RefundEvent) {}
        async fn subscription_created(
            &self,
            _tenant_id: &str,
            _subscription_id: &str,
            _product_id: &str,
            _wallet: Option<&str>,
        ) {
            self.record("subscription.created");
        }
        async fn subscription_updated(
            &self,
            _tenant_id: &str,
            _subscription_id: &str,
            _product_id: &str,
            _wallet: Option<&str>,
        ) {
            self.record("subscription.updated");
        }
        async fn subscription_cancelled(
            &self,
            _tenant_id: &str,
            _subscription_id: &str,
            _product_id: &str,
            _wallet: Option<&str>,
        ) {
            self.record("subscription.cancelled");
        }
        async fn subscription_renewed(
            &self,
            _tenant_id: &str,
            _subscription_id: &str,
            _product_id: &str,
            _wallet: Option<&str>,
        ) {
            self.record("subscription.renewed");
        }
        async fn subscription_payment_failed(
            &self,
            _tenant_id: &str,
            _subscription_id: &str,
            _product_id: &str,
            _wallet: Option<&str>,
        ) {
            self.record("subscription.payment_failed");
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
    async fn test_create_x402_emits_created() {
        let mut cfg = Config::default();
        cfg.subscriptions.grace_period_hours = 0;
        let store = Arc::new(InMemoryStore::new());
        let notifier = Arc::new(TestNotifier::default());
        let callback = Arc::new(TestPaymentCallback::default());
        let service =
            SubscriptionService::new(Arc::new(cfg), store, notifier.clone() as Arc<dyn Notifier>)
                .with_payment_callback(callback.clone());

        service
            .create_x402_subscription(
                "default",
                "wallet-1",
                "prod-1",
                BillingPeriod::Month,
                1,
                None,
            )
            .await
            .unwrap();

        let events = notifier.events().lock().clone();
        assert!(events.contains(&"subscription.created".to_string()));
        assert_eq!(*callback.created.lock(), 1);
    }

    #[tokio::test]
    async fn test_subscription_callback_times_out() {
        let store = Arc::new(InMemoryStore::new());
        let notifier = Arc::new(TestNotifier::default());
        let callback = Arc::new(SlowPaymentCallback::new(
            PAYMENT_CALLBACK_TIMEOUT + std::time::Duration::from_millis(50),
        ));
        let service = SubscriptionService::new(Arc::new(Config::default()), store, notifier)
            .with_payment_callback(callback);

        let result = tokio::time::timeout(
            PAYMENT_CALLBACK_TIMEOUT + std::time::Duration::from_millis(200),
            service.call_subscription_created_callback(&Subscription::default()),
        )
        .await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_resolve_user_id_from_wallet_uses_cache() {
        use axum::{
            extract::{Path, State},
            http::StatusCode,
            routing::get,
            Router,
        };
        use tokio::net::TcpListener;

        let hits: Arc<Mutex<u32>> = Arc::new(Mutex::new(0));
        let hits_state = hits.clone();

        let app = Router::new()
            .route(
                "/users/by-wallet/{wallet}",
                get(
                    |Path(wallet): Path<String>, State(hits): State<Arc<Mutex<u32>>>| async move {
                        *hits.lock() += 1;
                        (
                            StatusCode::OK,
                            axum::Json(serde_json::json!({
                                "user_id": "user-1",
                                "wallet_address": wallet
                            })),
                        )
                    },
                ),
            )
            .with_state(hits_state);

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        let mut cfg = Config::default();
        cfg.cedros_login.enabled = true;
        cfg.cedros_login.base_url = format!("http://{}", addr);
        cfg.cedros_login.api_key = "secret".to_string();
        let cfg = Arc::new(cfg);

        let store = Arc::new(InMemoryStore::new());
        let notifier = Arc::new(TestNotifier::default());

        let cedros_login = crate::services::CedrosLoginClient::new(
            cfg.cedros_login.base_url.clone(),
            cfg.cedros_login.api_key.clone(),
            std::time::Duration::from_secs(5),
            None,
            None,
        )
        .expect("cedros login");

        let service = SubscriptionService::new(cfg, store, notifier as Arc<dyn Notifier>)
            .with_cedros_login(Arc::new(cedros_login));

        assert_eq!(
            service.resolve_user_id_from_wallet("wallet-1").await,
            Some("user-1".to_string())
        );
        assert_eq!(
            service.resolve_user_id_from_wallet("wallet-1").await,
            Some("user-1".to_string())
        );
        assert_eq!(*hits.lock(), 1);
    }

    #[tokio::test]
    async fn test_extend_x402_emits_renewed() {
        let mut cfg = Config::default();
        cfg.subscriptions.grace_period_hours = 0;
        let store = Arc::new(InMemoryStore::new());
        let notifier = Arc::new(TestNotifier::default());
        let service = SubscriptionService::new(
            Arc::new(cfg),
            store.clone(),
            notifier.clone() as Arc<dyn Notifier>,
        );

        let created = service
            .create_x402_subscription(
                "default",
                "wallet-1",
                "prod-1",
                BillingPeriod::Month,
                1,
                None,
            )
            .await
            .unwrap();

        service
            .extend_x402_subscription("default", &created.id, BillingPeriod::Month, 1)
            .await
            .unwrap();

        let events = notifier.events().lock().clone();
        assert!(events.contains(&"subscription.renewed".to_string()));
    }

    #[tokio::test]
    async fn test_expire_overdue_emits_cancelled() {
        let mut cfg = Config::default();
        cfg.subscriptions.grace_period_hours = 0;
        let store = Arc::new(InMemoryStore::new());
        let notifier = Arc::new(TestNotifier::default());
        let service = SubscriptionService::new(
            Arc::new(cfg),
            store.clone(),
            notifier.clone() as Arc<dyn Notifier>,
        );

        let now = Utc::now();
        let sub = Subscription {
            id: "sub-1".to_string(),
            tenant_id: "default".to_string(),
            wallet: Some("wallet-1".to_string()),
            user_id: None,
            product_id: "prod-1".to_string(),
            plan_id: None,
            payment_method: PaymentMethod::X402,
            stripe_subscription_id: None,
            stripe_customer_id: None,
            status: SubscriptionStatus::Active,
            billing_period: BillingPeriod::Month,
            billing_interval: 1,
            current_period_start: now - ChronoDuration::days(2),
            current_period_end: now - ChronoDuration::hours(1),
            trial_end: None,
            cancel_at_period_end: false,
            cancelled_at: None,
            payment_signature: None,
            created_at: Some(now - ChronoDuration::days(2)),
            updated_at: Some(now - ChronoDuration::days(1)),
            metadata: std::collections::HashMap::new(),
        };

        store.save_subscription(sub).await.unwrap();
        service.expire_overdue("default").await.unwrap();

        let events = notifier.events().lock().clone();
        assert!(events.contains(&"subscription.cancelled".to_string()));
    }
}
