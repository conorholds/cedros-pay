use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use chrono::{DateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, warn};

use crate::config::Config;
use crate::errors::ErrorCode;
use crate::models::{BillingPeriod, Order, OrderItem, OrderShipping, SubscriptionStatus};
use crate::repositories::ProductRepository;
use crate::services::messaging::MessagingService;
use crate::services::subscriptions::StripeSubscriptionUpdate;
use crate::services::{CedrosLoginClient, ServiceError, ServiceResult, SubscriptionService};
use crate::storage::{IdempotencyResponse, InventoryAdjustmentRequest, PostgresStore, Store};
use crate::webhooks::Notifier;

// ============================================================================
// Webhook Event Types
// ============================================================================

/// Supported Stripe webhook event types
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StripeEventType {
    CheckoutSessionCompleted,
    CustomerSubscriptionCreated,
    CustomerSubscriptionUpdated,
    CustomerSubscriptionDeleted,
    InvoicePaid,
    InvoicePaymentFailed,
    ChargeRefunded,
    Unknown(String),
}

impl From<&str> for StripeEventType {
    fn from(s: &str) -> Self {
        match s {
            "checkout.session.completed" => Self::CheckoutSessionCompleted,
            "customer.subscription.created" => Self::CustomerSubscriptionCreated,
            "customer.subscription.updated" => Self::CustomerSubscriptionUpdated,
            "customer.subscription.deleted" => Self::CustomerSubscriptionDeleted,
            "invoice.paid" => Self::InvoicePaid,
            "invoice.payment_failed" => Self::InvoicePaymentFailed,
            "charge.refunded" => Self::ChargeRefunded,
            other => Self::Unknown(other.to_string()),
        }
    }
}

// ============================================================================
// Webhook Processor
// ============================================================================

/// Processes Stripe webhook events for subscriptions
pub struct StripeWebhookProcessor<S: Store> {
    config: Arc<Config>,
    store: Arc<S>,
    notifier: Arc<dyn Notifier>,
    subscription_service: Arc<SubscriptionService<S>>,
    cedros_login: Option<Arc<CedrosLoginClient>>,
    product_repo: Arc<dyn ProductRepository>,
    /// Optional messaging service for email receipts and order webhooks
    messaging: Option<Arc<dyn MessagingService>>,
}

const WEBHOOK_PROCESSING_TTL: Duration = Duration::from_secs(5 * 60);
const WEBHOOK_COMPLETED_TTL: Duration = Duration::from_secs(24 * 60 * 60);

impl<S: Store + 'static> StripeWebhookProcessor<S> {
    pub fn new(
        config: Arc<Config>,
        store: Arc<S>,
        notifier: Arc<dyn Notifier>,
        subscription_service: Arc<SubscriptionService<S>>,
        product_repo: Arc<dyn ProductRepository>,
    ) -> Self {
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

        Self {
            config,
            store,
            notifier,
            subscription_service,
            cedros_login,
            product_repo,
            messaging: None,
        }
    }

    /// Set messaging service for email receipts and order webhooks
    pub fn with_messaging(mut self, service: Arc<dyn MessagingService>) -> Self {
        self.messaging = Some(service);
        self
    }

    /// Validate tenant_id format from webhook metadata.
    /// Prevents injection via malformed tenant_id values in Stripe session metadata.
    fn validate_webhook_tenant_id(raw_tenant_id: &str) -> ServiceResult<String> {
        if raw_tenant_id.len() > 128
            || !raw_tenant_id
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
        {
            warn!(
                tenant_id_len = raw_tenant_id.len(),
                "Rejected invalid tenant_id format in Stripe webhook metadata"
            );
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidField,
                message: "invalid tenant_id format in webhook metadata".into(),
            });
        }
        Ok(raw_tenant_id.to_string())
    }

    async fn resolve_user_id_for_customer(
        &self,
        metadata: &HashMap<String, String>,
        stripe_customer_id: Option<&str>,
    ) -> Option<String> {
        // SECURITY: Only trust a user_id embedded in Stripe metadata if we explicitly marked it
        // as server-derived at session creation time.
        let trusted = metadata
            .get("user_id_trusted")
            .map(|v| v == "true")
            .unwrap_or(false);

        if trusted {
            // Accept both snake_case and camelCase for backward compatibility.
            let direct = metadata
                .get("user_id")
                .cloned()
                .or_else(|| metadata.get("userId").cloned());
            if direct.is_some() {
                return direct;
            }
        }

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

    /// Process a webhook event
    ///
    /// # Idempotency
    /// This method is idempotent - it tracks processed webhook event IDs to prevent
    /// duplicate processing. Stripe webhook event IDs are globally unique, so we use
    /// them with a "default" tenant to prevent cross-tenant duplicates.
    pub async fn process_webhook(&self, payload: &[u8], signature: &str) -> ServiceResult<()> {
        // Validate signature
        self.verify_signature(payload, signature)?;

        // Parse the raw event
        let raw_event: RawStripeEvent =
            serde_json::from_slice(payload).map_err(|e| ServiceError::Coded {
                code: ErrorCode::InvalidPaymentProof,
                message: format!("invalid webhook payload: {}", e),
            })?;

        let event_type = StripeEventType::from(raw_event.event_type.as_str());
        let event_id = raw_event.id.clone();

        // Idempotency claim - use "default" tenant since webhook event IDs are globally unique
        // and we want to prevent duplicate processing across the entire service.
        let idempotency_key = format!("stripe_webhook:{}", event_id);
        let claimed = self.try_claim_webhook(&idempotency_key).await?;
        if !claimed {
            debug!(event_id = %event_id, "Webhook already processed");
            return Ok(());
        }

        info!(event_type = %raw_event.event_type, event_id = %event_id, "Processing Stripe webhook");

        // Route to appropriate handler
        let result = match event_type {
            StripeEventType::CheckoutSessionCompleted => {
                self.handle_checkout_completed(&raw_event).await
            }
            StripeEventType::CustomerSubscriptionCreated => {
                self.handle_subscription_created(&raw_event).await
            }
            StripeEventType::CustomerSubscriptionUpdated => {
                self.handle_subscription_updated(&raw_event).await
            }
            StripeEventType::CustomerSubscriptionDeleted => {
                self.handle_subscription_deleted(&raw_event).await
            }
            StripeEventType::InvoicePaid => self.handle_invoice_paid(&raw_event).await,
            StripeEventType::InvoicePaymentFailed => {
                self.handle_invoice_payment_failed(&raw_event).await
            }
            StripeEventType::ChargeRefunded => self.handle_charge_refunded(&raw_event).await,
            StripeEventType::Unknown(ref t) => {
                warn!(event_type = %t, "Unhandled Stripe event type");
                Ok(())
            }
        };

        if let Err(err) = result {
            self.release_webhook_claim(&idempotency_key).await;
            return Err(err);
        }

        if let Err(err) = self.complete_webhook_claim(&idempotency_key).await {
            // IMPORTANT: Do NOT release the claim here.
            // If handlers already executed side effects, releasing the claim would allow Stripe
            // retries to re-run them. Treat this as processed and rely on the processing claim TTL
            // to prevent immediate duplicates.
            tracing::warn!(
                idempotency_key = %idempotency_key,
                error = %err,
                "Failed to persist Stripe webhook completion marker; treating as processed"
            );
        }

        Ok(())
    }

    // ========================================================================
    // Event Handlers
    // ========================================================================

    async fn handle_checkout_completed(&self, event: &RawStripeEvent) -> ServiceResult<()> {
        let session: CheckoutSessionObject = serde_json::from_value(event.data.object.clone())
            .map_err(|e| ServiceError::Internal(format!("failed to parse session: {}", e)))?;

        // Check if this is a subscription checkout
        if session.mode == Some("subscription".to_string()) {
            if let Some(sub_id) = session.subscription {
                info!(
                    session_id = %session.id,
                    subscription_id = %sub_id,
                    "Subscription checkout completed"
                );
                // Subscription will be created via customer.subscription.created event
            }
        } else {
            // One-time payment - record + notify
            let rid = session
                .metadata
                .get("resource_id")
                .cloned()
                .ok_or_else(|| ServiceError::Coded {
                    code: ErrorCode::InvalidField,
                    message: "missing resource_id in Stripe session metadata".into(),
                })?;
            let tenant_id = match session.metadata.get("tenant_id").cloned() {
                Some(id) if !id.is_empty() => Self::validate_webhook_tenant_id(&id)?,
                _ => {
                    if self.config.logging.environment == "production" {
                        return Err(ServiceError::Coded {
                            code: ErrorCode::InvalidField,
                            message: "missing tenant_id in Stripe session metadata".into(),
                        });
                    }
                    tracing::warn!(
                        session_id = %session.id,
                        "Missing tenant_id in Stripe session metadata, using default tenant"
                    );
                    "default".to_string()
                }
            };

            if let Some(cart_id) = rid.strip_prefix("cart:") {
                let cart = self
                    .store
                    .get_cart_quote(&tenant_id, cart_id)
                    .await
                    .map_err(|e| {
                        ServiceError::Internal(format!("failed to load cart quote: {e}"))
                    })?;
                if cart.is_none() {
                    return Err(ServiceError::Coded {
                        code: ErrorCode::InvalidField,
                        message: "cart quote not found for checkout session".into(),
                    });
                }
            }

            let signature = format!(
                "{}{}",
                crate::constants::STRIPE_SIGNATURE_PREFIX,
                session.id
            );
            let amount_cents = session.amount_total.ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::InvalidField,
                message: "missing amount_total in checkout session".into(),
            })?;
            let currency = session
                .currency
                .clone()
                .ok_or_else(|| ServiceError::Coded {
                    code: ErrorCode::InvalidField,
                    message: "missing currency in checkout session".into(),
                })?;
            let currency = currency.to_uppercase();

            let asset = crate::models::get_asset(&currency).ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::InvalidField,
                message: format!("unknown currency: {}", currency),
            })?;

            let stripe_customer_id = session.customer.as_deref();
            let user_id = self
                .resolve_user_id_for_customer(&session.metadata, stripe_customer_id)
                .await;

            // Only link when user identity is explicitly marked as server-derived.
            let trusted = session
                .metadata
                .get("user_id_trusted")
                .map(|v| v == "true")
                .unwrap_or(false);
            if trusted {
                if let (Some(cus), Some(uid)) = (stripe_customer_id, user_id.as_ref()) {
                    self.best_effort_link_customer(cus, uid).await;
                }
            }

            let claimed = self
                .store
                .try_record_payment(crate::models::PaymentTransaction {
                    signature,
                    tenant_id: tenant_id.clone(),
                    resource_id: rid.clone(),
                    wallet: session.customer.clone().unwrap_or_default(),
                    user_id: user_id.clone(),
                    amount: crate::models::Money::from_atomic(asset, amount_cents),
                    created_at: Utc::now(),
                    metadata: session.metadata.clone(),
                })
                .await
                .map_err(|e| {
                    ServiceError::Internal(format!("failed to record stripe payment: {e}"))
                })?;

            if claimed {
                let rid = rid.clone();
                self.record_order_and_adjust_inventory(
                    &tenant_id,
                    rid.clone(),
                    &session,
                    amount_cents,
                    &currency,
                    user_id.clone(),
                )
                .await?;

                // Use resolved user_id for webhook notification
                self.notify_payment_succeeded(
                    &event.id,
                    &tenant_id,
                    &rid,
                    "stripe",
                    Some(session.id.clone()),
                    session.customer.clone(),
                    session.amount_total,
                    session.currency.clone(),
                    user_id,
                )
                .await;
            } else {
                debug!(session_id = %session.id, "Stripe session already recorded; skipping notify");
            }
        }

        info!(session_id = %session.id, "Processed checkout.session.completed");
        Ok(())
    }

    async fn record_order_and_adjust_inventory(
        &self,
        tenant_id: &str,
        resource_id: String,
        session: &CheckoutSessionObject,
        amount_cents: i64,
        currency: &str,
        user_id: Option<String>,
    ) -> ServiceResult<()> {
        let items: Vec<OrderItem> = if let Some(cart_id) = resource_id.strip_prefix("cart:") {
            match self.store.get_cart_quote(tenant_id, cart_id).await {
                Ok(Some(cart)) => cart
                    .items
                    .into_iter()
                    .map(|i| OrderItem {
                        product_id: i.resource_id,
                        variant_id: i.variant_id,
                        quantity: i.quantity,
                    })
                    .collect(),
                Ok(None) => {
                    warn!(tenant_id = %tenant_id, cart_id = %cart_id, "Cart not found while creating order");
                    vec![OrderItem {
                        product_id: resource_id.clone(),
                        variant_id: None,
                        quantity: 1,
                    }]
                }
                Err(e) => {
                    warn!(tenant_id = %tenant_id, cart_id = %cart_id, error = %e, "Failed to load cart while creating order");
                    vec![OrderItem {
                        product_id: resource_id.clone(),
                        variant_id: None,
                        quantity: 1,
                    }]
                }
            }
        } else {
            vec![OrderItem {
                product_id: resource_id.clone(),
                variant_id: None,
                quantity: 1,
            }]
        };

        let customer_email = session
            .customer_details
            .as_ref()
            .and_then(|d| d.email.clone())
            .or_else(|| session.customer_email.clone());

        // Extract customer name from customer_details or shipping
        let customer_name = session
            .customer_details
            .as_ref()
            .and_then(|d| d.name.clone())
            .or_else(|| {
                session
                    .shipping_details
                    .as_ref()
                    .and_then(|s| s.name.clone())
            });

        let shipping = session.shipping_details.as_ref().map(|s| OrderShipping {
            name: s.name.clone().or_else(|| {
                session
                    .customer_details
                    .as_ref()
                    .and_then(|d| d.name.clone())
            }),
            phone: s.phone.clone().or_else(|| {
                session
                    .customer_details
                    .as_ref()
                    .and_then(|d| d.phone.clone())
            }),
            address: s
                .address
                .as_ref()
                .and_then(|a| serde_json::to_value(a).ok()),
        });

        let now = Utc::now();
        let order_id = uuid::Uuid::new_v4().to_string();
        let order = Order {
            id: order_id.clone(),
            tenant_id: tenant_id.to_string(),
            source: "stripe".to_string(),
            purchase_id: session.id.clone(),
            resource_id: resource_id.clone(),
            user_id,
            customer: session.customer.clone(),
            status: "paid".to_string(),
            items: items.clone(),
            amount: amount_cents,
            amount_asset: currency.to_string(),
            customer_email,
            customer_name,
            receipt_url: Some(format!("/receipt/{}", order_id)),
            shipping,
            metadata: session.metadata.clone(),
            created_at: now,
            updated_at: Some(now),
            status_updated_at: Some(now),
        };

        // Best-effort inventory decrement: supports both product and variant-level tracking.
        // Group items by (product_id, variant_id) to handle both cases properly.
        let mut items_by_key: std::collections::HashMap<(String, Option<String>), i32> =
            std::collections::HashMap::new();
        for item in &items {
            if item.quantity <= 0 {
                continue;
            }
            let key = (item.product_id.clone(), item.variant_id.clone());
            *items_by_key.entry(key).or_insert(0) += item.quantity;
        }
        let product_ids: Vec<String> = items_by_key
            .keys()
            .map(|(pid, _)| pid.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();
        let allow_backorders = match self
            .product_repo
            .get_products_by_ids(tenant_id, &product_ids)
            .await
        {
            Ok(products) => products
                .into_iter()
                .map(|p| {
                    let allow = matches!(p.inventory_policy.as_deref(), Some("allow_backorder"));
                    (p.id, allow)
                })
                .collect::<std::collections::HashMap<String, bool>>(),
            Err(e) => {
                warn!(
                    tenant_id = %tenant_id,
                    error = %e,
                    "Failed to load products for inventory policy lookup"
                );
                std::collections::HashMap::new()
            }
        };

        // Check if any items have variant_ids - skip optimized path if so
        let has_variants = items_by_key.keys().any(|(_, v)| v.is_some());

        // Clone order for messaging notification before it may be moved
        let order_for_messaging = order.clone();

        if !has_variants {
            if let Some(pg_store) = self.store.as_any().downcast_ref::<PostgresStore>() {
                let adjustments: Vec<InventoryAdjustmentRequest> = items_by_key
                    .iter()
                    .map(
                        |((product_id, variant_id), quantity)| InventoryAdjustmentRequest {
                            product_id: product_id.clone(),
                            variant_id: variant_id.clone(),
                            quantity: *quantity,
                            allow_backorder: allow_backorders
                                .get(product_id)
                                .copied()
                                .unwrap_or(false),
                            reason: Some("stripe_order_paid".to_string()),
                            actor: Some("system".to_string()),
                        },
                    )
                    .collect();

                match pg_store
                    .try_store_order_with_inventory_adjustments(order, adjustments)
                    .await
                {
                    Ok(true) => {
                        // Send order notifications (fire-and-forget)
                        if let Some(ref messaging) = self.messaging {
                            messaging.notify_order_created(&order_for_messaging).await;
                        }

                        // Convert inventory reservations for cart-based or direct purchases
                        if let Some(cart_id) = resource_id.strip_prefix("cart:") {
                            if let Err(e) = self
                                .store
                                .convert_inventory_reservations(tenant_id, cart_id, now)
                                .await
                            {
                                warn!(
                                    tenant_id = %tenant_id,
                                    cart_id = %cart_id,
                                    error = %e,
                                    "Failed to convert inventory reservations after Stripe order"
                                );
                            }
                        } else if let Some(reservation_id) =
                            session.metadata.get("inventory_reservation_id")
                        {
                            if let Err(e) = self
                                .store
                                .convert_inventory_reservations(tenant_id, reservation_id, now)
                                .await
                            {
                                warn!(
                                    tenant_id = %tenant_id,
                                    reservation_id = %reservation_id,
                                    error = %e,
                                    "Failed to convert inventory reservation for direct Stripe purchase"
                                );
                            }
                        }
                        return Ok(());
                    }
                    Ok(false) => {
                        // Convert inventory reservations even on replay (idempotent)
                        if let Some(cart_id) = resource_id.strip_prefix("cart:") {
                            if let Err(e) = self
                                .store
                                .convert_inventory_reservations(tenant_id, cart_id, now)
                                .await
                            {
                                warn!(
                                    tenant_id = %tenant_id,
                                    cart_id = %cart_id,
                                    error = %e,
                                    "Failed to convert inventory reservations after Stripe order replay"
                                );
                            }
                        } else if let Some(reservation_id) =
                            session.metadata.get("inventory_reservation_id")
                        {
                            if let Err(e) = self
                                .store
                                .convert_inventory_reservations(tenant_id, reservation_id, now)
                                .await
                            {
                                warn!(
                                    tenant_id = %tenant_id,
                                    reservation_id = %reservation_id,
                                    error = %e,
                                    "Failed to convert inventory reservation for direct Stripe purchase replay"
                                );
                            }
                        }
                        debug!(
                            tenant_id = %tenant_id,
                            session_id = %session.id,
                            "Order already exists; skipping inventory decrement"
                        );
                        return Ok(());
                    }
                    Err(e) => {
                        warn!(
                            tenant_id = %tenant_id,
                            session_id = %session.id,
                            error = %e,
                            "Failed to store order with inventory adjustments"
                        );
                        return Err(ServiceError::Internal(format!(
                            "failed to store order: {e}"
                        )));
                    }
                }
            }
        }

        match self.store.try_store_order(order).await {
            Ok(true) => {
                // Send order notifications (fire-and-forget)
                if let Some(ref messaging) = self.messaging {
                    messaging.notify_order_created(&order_for_messaging).await;
                }

                // Convert inventory reservations for cart-based or direct purchases
                if let Some(cart_id) = resource_id.strip_prefix("cart:") {
                    if let Err(e) = self
                        .store
                        .convert_inventory_reservations(tenant_id, cart_id, now)
                        .await
                    {
                        warn!(
                            tenant_id = %tenant_id,
                            cart_id = %cart_id,
                            error = %e,
                            "Failed to convert inventory reservations after Stripe order"
                        );
                    }
                } else if let Some(reservation_id) =
                    session.metadata.get("inventory_reservation_id")
                {
                    // Direct product purchase with inventory reservation
                    if let Err(e) = self
                        .store
                        .convert_inventory_reservations(tenant_id, reservation_id, now)
                        .await
                    {
                        warn!(
                            tenant_id = %tenant_id,
                            reservation_id = %reservation_id,
                            error = %e,
                            "Failed to convert inventory reservation for direct Stripe purchase"
                        );
                    }
                }
                for ((product_id, variant_id), quantity) in items_by_key {
                    let allow_backorder =
                        allow_backorders.get(&product_id).copied().unwrap_or(false);

                    // For variant-level inventory, we need to load and update the product
                    match self.product_repo.get_product(tenant_id, &product_id).await {
                        Ok(mut product) => {
                            let effective_qty =
                                product.get_effective_inventory(variant_id.as_deref());
                            if let Some(qty) = effective_qty {
                                // Check stock (unless backorder allowed)
                                if !allow_backorder && quantity > qty {
                                    warn!(
                                        tenant_id = %tenant_id,
                                        product_id = %product_id,
                                        variant_id = ?variant_id,
                                        "Insufficient inventory after order creation"
                                    );
                                    continue;
                                }
                                let next_qty = qty.saturating_sub(quantity).max(0);
                                // Update the appropriate inventory field
                                if let Some(ref vid) = variant_id {
                                    if let Some(variant) = product.get_variant_mut(vid) {
                                        if variant.inventory_quantity.is_some() {
                                            variant.inventory_quantity = Some(next_qty);
                                        }
                                    }
                                } else {
                                    product.inventory_quantity = Some(next_qty);
                                }
                                if let Err(e) = self.product_repo.update_product(product).await {
                                    warn!(
                                        tenant_id = %tenant_id,
                                        product_id = %product_id,
                                        variant_id = ?variant_id,
                                        error = %e,
                                        "Failed to decrement inventory after order creation"
                                    );
                                } else {
                                    let adjustment = crate::models::InventoryAdjustment {
                                        id: uuid::Uuid::new_v4().to_string(),
                                        tenant_id: tenant_id.to_string(),
                                        product_id: product_id.clone(),
                                        variant_id: variant_id.clone(),
                                        delta: -quantity,
                                        quantity_before: qty,
                                        quantity_after: next_qty,
                                        reason: Some("stripe_order_paid".to_string()),
                                        actor: Some("system".to_string()),
                                        created_at: now,
                                    };
                                    if let Err(e) =
                                        self.store.record_inventory_adjustment(adjustment).await
                                    {
                                        warn!(
                                            tenant_id = %tenant_id,
                                            product_id = %product_id,
                                            error = %e,
                                            "Failed to record inventory adjustment"
                                        );
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            warn!(
                                tenant_id = %tenant_id,
                                product_id = %product_id,
                                error = %e,
                                "Failed to load product for inventory decrement"
                            );
                        }
                    }
                }
            }
            Ok(false) => {
                // Convert inventory reservations even on replay (idempotent)
                if let Some(cart_id) = resource_id.strip_prefix("cart:") {
                    if let Err(e) = self
                        .store
                        .convert_inventory_reservations(tenant_id, cart_id, now)
                        .await
                    {
                        warn!(
                            tenant_id = %tenant_id,
                            cart_id = %cart_id,
                            error = %e,
                            "Failed to convert inventory reservations after Stripe order replay"
                        );
                    }
                } else if let Some(reservation_id) =
                    session.metadata.get("inventory_reservation_id")
                {
                    if let Err(e) = self
                        .store
                        .convert_inventory_reservations(tenant_id, reservation_id, now)
                        .await
                    {
                        warn!(
                            tenant_id = %tenant_id,
                            reservation_id = %reservation_id,
                            error = %e,
                            "Failed to convert inventory reservation for direct Stripe purchase replay"
                        );
                    }
                }
                debug!(tenant_id = %tenant_id, session_id = %session.id, "Order already exists; skipping inventory decrement");
            }
            Err(e) => {
                warn!(tenant_id = %tenant_id, session_id = %session.id, error = %e, "Failed to store order");
                return Err(ServiceError::Internal(format!(
                    "failed to store order: {e}"
                )));
            }
        }
        Ok(())
    }

    async fn handle_subscription_created(&self, event: &RawStripeEvent) -> ServiceResult<()> {
        let sub: SubscriptionObject = serde_json::from_value(event.data.object.clone())
            .map_err(|e| ServiceError::Internal(format!("failed to parse subscription: {}", e)))?;

        let tenant_id = match sub.metadata.get("tenant_id").cloned() {
            Some(id) if !id.is_empty() => id,
            _ => {
                if self.config.logging.environment == "production" {
                    return Err(ServiceError::Coded {
                        code: ErrorCode::InvalidField,
                        message: "missing tenant_id in subscription metadata".into(),
                    });
                }
                warn!(
                    subscription_id = %sub.id,
                    "Missing tenant_id in subscription metadata, using default tenant - check Stripe checkout metadata configuration"
                );
                "default".to_string()
            }
        };

        // Idempotency: avoid repeated creates (e.g., webhook retries or multiple event IDs for
        // the same Stripe subscription).
        if let Ok(Some(existing)) = self
            .subscription_service
            .find_by_stripe_subscription_id(&sub.id)
            .await
        {
            if existing.tenant_id != tenant_id {
                warn!(
                    stripe_sub_id = %sub.id,
                    existing_tenant_id = %existing.tenant_id,
                    expected_tenant_id = %tenant_id,
                    "Stripe subscription already exists under different tenant; skipping create"
                );
            } else {
                info!(stripe_sub_id = %sub.id, tenant_id = %tenant_id, "Stripe subscription already recorded; skipping create");
            }
            return Ok(());
        }

        let wallet = sub.metadata.get("wallet").cloned().unwrap_or_default();
        let product_id = sub
            .metadata
            .get("product_id")
            .cloned()
            .or_else(|| self.extract_product_id(&sub))
            .unwrap_or_default();

        let user_id = self
            .resolve_user_id_for_customer(&sub.metadata, Some(sub.customer.as_str()))
            .await;
        let trusted = sub
            .metadata
            .get("user_id_trusted")
            .map(|v| v == "true")
            .unwrap_or(false);
        if trusted {
            if let Some(uid) = user_id.as_ref() {
                self.best_effort_link_customer(&sub.customer, uid).await;
            }
        }

        let period_start = timestamp_to_datetime(sub.current_period_start)?;
        let period_end = timestamp_to_datetime(sub.current_period_end)?;
        let billing_period = self.extract_billing_period(&sub);
        let billing_interval = self.extract_billing_interval(&sub);
        let status = stripe_status_to_subscription_status(&sub.status);

        // Create subscription in our system
        let result = self
            .subscription_service
            .create_stripe_subscription_with_user_id(
                &tenant_id,
                &wallet,
                &product_id,
                &sub.id,
                &sub.customer,
                period_start,
                period_end,
                billing_period,
                billing_interval,
                status,
                user_id,
            )
            .await;

        match result {
            Ok(subscription) => {
                info!(
                    stripe_sub_id = %sub.id,
                    local_id = %subscription.id,
                    "Created subscription from webhook"
                );

                // Notify subscription created
                self.notifier
                    .subscription_created(
                        &subscription.tenant_id,
                        &subscription.id,
                        &product_id,
                        subscription.wallet.as_deref(),
                    )
                    .await;
            }
            Err(e) => {
                error!(error = %e, stripe_sub_id = %sub.id, "Failed to create subscription");
            }
        }

        Ok(())
    }

    async fn handle_subscription_updated(&self, event: &RawStripeEvent) -> ServiceResult<()> {
        let sub: SubscriptionObject = serde_json::from_value(event.data.object.clone())
            .map_err(|e| ServiceError::Internal(format!("failed to parse subscription: {}", e)))?;

        let current_period_start = timestamp_to_datetime(sub.current_period_start)?;
        let current_period_end = timestamp_to_datetime(sub.current_period_end)?;
        let cancelled_at = match sub.canceled_at {
            Some(ts) => Some(timestamp_to_datetime(ts)?),
            None => None,
        };
        let update = StripeSubscriptionUpdate {
            status: Some(stripe_status_to_subscription_status(&sub.status)),
            current_period_start: Some(current_period_start),
            current_period_end: Some(current_period_end),
            cancel_at_period_end: Some(sub.cancel_at_period_end),
            cancelled_at,
            new_product_id: self.extract_product_id(&sub),
            billing_period: Some(self.extract_billing_period(&sub)),
            billing_interval: Some(self.extract_billing_interval(&sub)),
        };

        let tenant_id = match sub.metadata.get("tenant_id").map(|s| s.as_str()) {
            Some(id) if !id.is_empty() => id,
            _ => {
                if self.config.logging.environment == "production" {
                    return Err(ServiceError::Coded {
                        code: ErrorCode::InvalidField,
                        message: "missing tenant_id in subscription metadata".into(),
                    });
                }
                warn!(
                    subscription_id = %sub.id,
                    "Missing tenant_id in subscription metadata, using default tenant - check Stripe checkout metadata configuration"
                );
                "default"
            }
        };

        let result = self
            .subscription_service
            .handle_stripe_subscription_updated(tenant_id, &sub.id, update)
            .await;

        match result {
            Ok(subscription) => {
                info!(stripe_sub_id = %sub.id, "Updated subscription from webhook");

                // Notify subscription updated
                self.notifier
                    .subscription_updated(
                        &subscription.tenant_id,
                        &subscription.id,
                        &subscription.product_id,
                        subscription.wallet.as_deref(),
                    )
                    .await;
            }
            Err(e) => {
                warn!(error = %e, stripe_sub_id = %sub.id, "Failed to update subscription");
            }
        }

        Ok(())
    }

    async fn handle_subscription_deleted(&self, event: &RawStripeEvent) -> ServiceResult<()> {
        let sub: SubscriptionObject = serde_json::from_value(event.data.object.clone())
            .map_err(|e| ServiceError::Internal(format!("failed to parse subscription: {}", e)))?;

        let tenant_id = match sub.metadata.get("tenant_id").map(|s| s.as_str()) {
            Some(id) if !id.is_empty() => id,
            _ => {
                if self.config.logging.environment == "production" {
                    return Err(ServiceError::Coded {
                        code: ErrorCode::InvalidField,
                        message: "missing tenant_id in subscription metadata".into(),
                    });
                }
                warn!(
                    subscription_id = %sub.id,
                    "Missing tenant_id in subscription metadata, using default tenant - check Stripe checkout metadata configuration"
                );
                "default"
            }
        };

        let result = self
            .subscription_service
            .handle_stripe_cancelled(tenant_id, &sub.id)
            .await;

        match result {
            Ok(subscription) => {
                info!(stripe_sub_id = %sub.id, "Cancelled subscription from webhook");

                // Notify subscription cancelled
                self.notifier
                    .subscription_cancelled(
                        &subscription.tenant_id,
                        &subscription.id,
                        &subscription.product_id,
                        subscription.wallet.as_deref(),
                    )
                    .await;
            }
            Err(e) => {
                warn!(error = %e, stripe_sub_id = %sub.id, "Failed to cancel subscription");
            }
        }

        Ok(())
    }

    async fn handle_invoice_paid(&self, event: &RawStripeEvent) -> ServiceResult<()> {
        let invoice: InvoiceObject = serde_json::from_value(event.data.object.clone())
            .map_err(|e| ServiceError::Internal(format!("failed to parse invoice: {}", e)))?;

        // Only handle subscription invoices
        let subscription_id = match invoice.subscription {
            Some(ref sid) => sid,
            None => {
                debug!(invoice_id = %invoice.id, "Non-subscription invoice, skipping");
                return Ok(());
            }
        };

        // Extract period from invoice lines
        let (period_start, period_end) = self.extract_invoice_period(&invoice)?;

        // Look up subscription to get tenant_id (Stripe webhooks don't include tenant context)
        let existing_sub = self
            .subscription_service
            .find_by_stripe_subscription_id(subscription_id)
            .await?;
        let tenant_id = match existing_sub.as_ref().map(|s| s.tenant_id.as_str()) {
            Some(id) if !id.is_empty() => id,
            _ => {
                // SECURITY: Cannot process invoice without knowing which tenant owns the subscription.
                // Return Ok to acknowledge webhook (prevents Stripe retry loops) but skip processing.
                tracing::error!(
                    subscription_id = %subscription_id,
                    invoice_id = %invoice.id,
                    "Subscription not found or missing tenant_id - skipping webhook to prevent tenant isolation violation"
                );
                return Ok(());
            }
        };

        let result = self
            .subscription_service
            .handle_stripe_renewal(tenant_id, subscription_id, period_start, period_end)
            .await;

        match result {
            Ok(subscription) => {
                info!(
                    invoice_id = %invoice.id,
                    stripe_sub_id = %subscription_id,
                    "Processed subscription renewal"
                );

                // Notify renewal
                self.notifier
                    .subscription_renewed(
                        &subscription.tenant_id,
                        &subscription.id,
                        &subscription.product_id,
                        subscription.wallet.as_deref(),
                    )
                    .await;
            }
            Err(e) => {
                warn!(
                    error = %e,
                    invoice_id = %invoice.id,
                    stripe_sub_id = %subscription_id,
                    "Failed to process renewal"
                );
            }
        }

        Ok(())
    }

    async fn handle_invoice_payment_failed(&self, event: &RawStripeEvent) -> ServiceResult<()> {
        let invoice: InvoiceObject = serde_json::from_value(event.data.object.clone())
            .map_err(|e| ServiceError::Internal(format!("failed to parse invoice: {}", e)))?;

        let subscription_id = match invoice.subscription {
            Some(ref sid) => sid,
            None => {
                debug!(invoice_id = %invoice.id, "Non-subscription invoice, skipping");
                return Ok(());
            }
        };

        // Look up subscription to get tenant_id (Stripe webhooks don't include tenant context)
        let existing_sub = self
            .subscription_service
            .find_by_stripe_subscription_id(subscription_id)
            .await?;
        let tenant_id = match existing_sub.as_ref().map(|s| s.tenant_id.as_str()) {
            Some(id) if !id.is_empty() => id,
            _ => {
                // SECURITY: Cannot process invoice without knowing which tenant owns the subscription.
                // Return Ok to acknowledge webhook (prevents Stripe retry loops) but skip processing.
                tracing::error!(
                    subscription_id = %subscription_id,
                    invoice_id = %invoice.id,
                    "Subscription not found or missing tenant_id - skipping webhook to prevent tenant isolation violation"
                );
                return Ok(());
            }
        };

        let result = self
            .subscription_service
            .handle_stripe_payment_failed(tenant_id, subscription_id)
            .await;

        match result {
            Ok(subscription) => {
                info!(
                    invoice_id = %invoice.id,
                    stripe_sub_id = %subscription_id,
                    "Marked subscription as past_due"
                );

                // Notify payment failed
                self.notifier
                    .subscription_payment_failed(
                        &subscription.tenant_id,
                        &subscription.id,
                        &subscription.product_id,
                        subscription.wallet.as_deref(),
                    )
                    .await;
            }
            Err(e) => {
                warn!(
                    error = %e,
                    invoice_id = %invoice.id,
                    stripe_sub_id = %subscription_id,
                    "Failed to mark subscription past_due"
                );
            }
        }

        Ok(())
    }

    async fn handle_charge_refunded(&self, event: &RawStripeEvent) -> ServiceResult<()> {
        let charge: ChargeObject = serde_json::from_value(event.data.object.clone())
            .map_err(|e| ServiceError::Internal(format!("failed to parse charge: {}", e)))?;

        let tenant_id = match charge.metadata.get("tenant_id").map(|s| s.as_str()) {
            Some(id) if !id.is_empty() => id,
            _ => {
                // Best-effort fallback: do not hard-fail in production, since Stripe will retry
                // and can cause retry storms. Use default tenant and log.
                warn!(
                    charge_id = %charge.id,
                    "Missing tenant_id in charge metadata, using default tenant"
                );
                "default"
            }
        };

        // Best-effort reconciliation: update server-side StripeRefundRequest status using
        // the stored stripe_charge_id.
        match self
            .store
            .get_stripe_refund_request_by_charge_id(tenant_id, &charge.id)
            .await
        {
            Ok(Some(mut req)) => {
                if req.status != "succeeded" {
                    req.status = "succeeded".to_string();
                    req.last_error = None;

                    if let Err(e) = self.store.store_stripe_refund_request(req).await {
                        warn!(
                            error = %e,
                            charge_id = %charge.id,
                            tenant_id = %tenant_id,
                            "Failed to update Stripe refund request from charge.refunded"
                        );
                    }
                }
            }
            Ok(None) => {
                debug!(
                    charge_id = %charge.id,
                    tenant_id = %tenant_id,
                    "No Stripe refund request found for charge.refunded"
                );
            }
            Err(e) => {
                warn!(
                    error = %e,
                    charge_id = %charge.id,
                    tenant_id = %tenant_id,
                    "Failed to look up Stripe refund request for charge.refunded"
                );
            }
        }

        info!(
            charge_id = %charge.id,
            amount_refunded = charge.amount_refunded,
            tenant_id = %tenant_id,
            "Charge refunded"
        );

        // Notify refund
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

    // ========================================================================
    // Helpers
    // ========================================================================

    fn verify_signature(&self, payload: &[u8], signature_header: &str) -> ServiceResult<()> {
        crate::services::stripe::verify_stripe_webhook_signature(
            payload,
            signature_header,
            &self.config.stripe.webhook_secret,
        )
    }

    async fn try_claim_webhook(&self, key: &str) -> ServiceResult<bool> {
        let response = IdempotencyResponse {
            status_code: 102,
            headers: HashMap::new(),
            body: Vec::new(),
            cached_at: Utc::now(),
        };

        self.store
            .try_save_idempotency_key(key, response, WEBHOOK_PROCESSING_TTL)
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))
    }

    async fn release_webhook_claim(&self, key: &str) {
        if let Err(e) = self.store.delete_idempotency_key(key).await {
            tracing::warn!(
                idempotency_key = %key,
                error = %e,
                "Failed to release webhook idempotency claim (best effort)"
            );
        }
    }

    async fn complete_webhook_claim(&self, key: &str) -> ServiceResult<()> {
        let response = IdempotencyResponse {
            status_code: 200,
            headers: HashMap::new(),
            body: Vec::new(),
            cached_at: Utc::now(),
        };

        self.store
            .save_idempotency_key(key, response, WEBHOOK_COMPLETED_TTL)
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))
    }

    #[allow(clippy::too_many_arguments)]
    async fn notify_payment_succeeded(
        &self,
        stripe_event_id: &str,
        tenant_id: &str,
        resource_id: &str,
        method: &str,
        session_id: Option<String>,
        customer: Option<String>,
        amount: Option<i64>,
        currency: Option<String>,
        user_id: Option<String>,
    ) {
        let event = crate::models::PaymentEvent {
            // Deterministic ID so downstream consumers can de-dupe if Stripe retries.
            // Stripe event IDs are globally unique.
            event_id: format!("stripe_evt:{}", stripe_event_id),
            event_type: "payment.succeeded".into(),
            event_timestamp: Utc::now(),
            tenant_id: tenant_id.to_string(),
            resource_id: resource_id.to_string(),
            method: method.to_string(),
            stripe_session_id: session_id,
            stripe_customer: customer.clone(),
            fiat_amount_cents: amount,
            fiat_currency: currency,
            crypto_atomic_amount: None,
            crypto_token: None,
            wallet: customer,
            user_id,
            proof_signature: None,
            metadata: HashMap::new(),
            paid_at: Utc::now(),
        };

        self.notifier.payment_succeeded(event).await;
    }

    fn extract_product_id(&self, sub: &SubscriptionObject) -> Option<String> {
        sub.items
            .as_ref()
            .and_then(|items| items.data.first())
            .and_then(|item| item.price.as_ref())
            .and_then(|price| price.product.clone())
    }

    fn extract_billing_period(&self, sub: &SubscriptionObject) -> BillingPeriod {
        sub.items
            .as_ref()
            .and_then(|items| items.data.first())
            .and_then(|item| item.price.as_ref())
            .and_then(|price| price.recurring.as_ref())
            .map(|r| match r.interval.as_str() {
                "day" => BillingPeriod::Day,
                "week" => BillingPeriod::Week,
                "month" => BillingPeriod::Month,
                "year" => BillingPeriod::Year,
                _ => BillingPeriod::Month,
            })
            .unwrap_or(BillingPeriod::Month)
    }

    fn extract_billing_interval(&self, sub: &SubscriptionObject) -> i32 {
        sub.items
            .as_ref()
            .and_then(|items| items.data.first())
            .and_then(|item| item.price.as_ref())
            .and_then(|price| price.recurring.as_ref())
            .map(|r| r.interval_count)
            .unwrap_or(1)
    }

    fn extract_invoice_period(
        &self,
        invoice: &InvoiceObject,
    ) -> ServiceResult<(DateTime<Utc>, DateTime<Utc>)> {
        let now = Utc::now();
        let period_start = match invoice
            .lines
            .as_ref()
            .and_then(|l| l.data.first())
            .and_then(|line| line.period.as_ref())
            .map(|p| timestamp_to_datetime(p.start))
        {
            Some(Ok(ts)) => ts,
            Some(Err(e)) => return Err(e),
            None => now,
        };
        let period_end = match invoice
            .lines
            .as_ref()
            .and_then(|l| l.data.first())
            .and_then(|line| line.period.as_ref())
            .map(|p| timestamp_to_datetime(p.end))
        {
            Some(Ok(ts)) => ts,
            Some(Err(e)) => return Err(e),
            None => now,
        };
        Ok((period_start, period_end))
    }
}

// ============================================================================
// Stripe API Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
struct RawStripeEvent {
    id: String,
    #[serde(rename = "type")]
    event_type: String,
    data: EventData,
}

#[derive(Debug, Deserialize)]
struct EventData {
    object: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct CheckoutSessionObject {
    id: String,
    mode: Option<String>,
    subscription: Option<String>,
    customer: Option<String>,
    customer_email: Option<String>,
    amount_total: Option<i64>,
    currency: Option<String>,
    customer_details: Option<CheckoutCustomerDetails>,
    shipping_details: Option<CheckoutShippingDetails>,
    #[serde(default)]
    metadata: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
struct CheckoutCustomerDetails {
    email: Option<String>,
    name: Option<String>,
    phone: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CheckoutShippingDetails {
    name: Option<String>,
    phone: Option<String>,
    address: Option<CheckoutAddress>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
struct CheckoutAddress {
    line1: Option<String>,
    line2: Option<String>,
    city: Option<String>,
    state: Option<String>,
    postal_code: Option<String>,
    country: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SubscriptionObject {
    id: String,
    customer: String,
    status: String,
    current_period_start: i64,
    current_period_end: i64,
    cancel_at_period_end: bool,
    canceled_at: Option<i64>,
    items: Option<SubscriptionItems>,
    #[serde(default)]
    metadata: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
struct SubscriptionItems {
    data: Vec<SubscriptionItem>,
}

#[derive(Debug, Deserialize)]
struct SubscriptionItem {
    price: Option<PriceObject>,
}

#[derive(Debug, Deserialize)]
struct PriceObject {
    product: Option<String>,
    recurring: Option<RecurringInfo>,
}

#[derive(Debug, Deserialize)]
struct RecurringInfo {
    interval: String,
    interval_count: i32,
}

#[derive(Debug, Deserialize)]
struct InvoiceObject {
    id: String,
    subscription: Option<String>,
    lines: Option<InvoiceLines>,
}

#[derive(Debug, Deserialize)]
struct InvoiceLines {
    data: Vec<InvoiceLine>,
}

#[derive(Debug, Deserialize)]
struct InvoiceLine {
    period: Option<InvoicePeriod>,
}

#[derive(Debug, Deserialize)]
struct InvoicePeriod {
    start: i64,
    end: i64,
}

#[derive(Debug, Deserialize)]
struct ChargeObject {
    id: String,
    amount_refunded: i64,
    currency: Option<String>,
    #[serde(default)]
    metadata: HashMap<String, String>,
}

// ============================================================================
// Helper Functions
// ============================================================================

fn timestamp_to_datetime(ts: i64) -> ServiceResult<DateTime<Utc>> {
    Utc.timestamp_opt(ts, 0)
        .single()
        .ok_or_else(|| ServiceError::Coded {
            code: ErrorCode::InvalidField,
            message: format!("invalid timestamp: {}", ts),
        })
}

fn stripe_status_to_subscription_status(status: &str) -> SubscriptionStatus {
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

#[cfg(test)]
mod tests;
