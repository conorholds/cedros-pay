use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use chrono::Utc;
use hmac::{Hmac, Mac};
use serde_json::Value;
use sha2::Sha256;

use crate::models::{PaymentEvent, RefundEvent};
use crate::storage::{PendingWebhook, Store, WebhookStatus};
use crate::x402::utils::generate_event_id;

type HmacSha256 = Hmac<Sha256>;

/// Serialize JSON to canonical bytes for signing (L-008 fix).
///
/// Produces deterministic, canonical JSON by:
/// 1. Sorting object keys lexicographically
/// 2. Using compact formatting (no whitespace)
/// 3. Using consistent number formatting
///
/// This ensures that the same logical payload always produces the same
/// signature, regardless of how the Value was constructed.
fn canonical_json(value: &Value) -> Vec<u8> {
    let canonical = to_canonical_value(value);
    // Use compact formatting - no extra whitespace
    match serde_json::to_vec(&canonical) {
        Ok(bytes) => bytes,
        Err(e) => {
            tracing::error!(error = %e, "canonical JSON serialization failed, falling back to non-canonical");
            // Fall back to serializing the original value (non-canonical but functional)
            serde_json::to_vec(value).unwrap_or_else(|e2| {
                tracing::error!(error = %e2, "fallback JSON serialization also failed");
                Vec::new()
            })
        }
    }
}

/// Recursively transform a Value into its canonical form.
/// Object keys are sorted alphabetically for deterministic serialization.
fn to_canonical_value(value: &Value) -> Value {
    match value {
        Value::Object(map) => {
            let mut entries: Vec<_> = map.iter().collect();
            // Sort by key for canonical ordering
            entries.sort_by(|(a, _), (b, _)| a.as_str().cmp(b.as_str()));
            let canonical_map: serde_json::Map<String, Value> = entries
                .into_iter()
                .map(|(k, v)| (k.clone(), to_canonical_value(v)))
                .collect();
            Value::Object(canonical_map)
        }
        Value::Array(arr) => Value::Array(arr.iter().map(to_canonical_value).collect()),
        // Scalars are already canonical
        _ => value.clone(),
    }
}

/// Webhook notifier trait for enqueueing webhook events.
///
/// # Design Decision (REL-005)
/// Methods return `()` (fire-and-forget) rather than `Result` because:
/// 1. Webhook enqueueing is a side effect of the main operation (payment, refund, etc.)
/// 2. The main operation has already succeeded - failing on webhook would confuse callers
/// 3. Webhooks have built-in retry logic via the webhook worker
/// 4. Errors are logged for monitoring/alerting purposes
///
/// If webhook enqueueing fails, errors are logged at ERROR level with full context.
/// Monitor for "Failed to enqueue" log messages to detect persistent issues.
#[async_trait]
pub trait Notifier: Send + Sync {
    async fn payment_succeeded(&self, event: PaymentEvent);
    async fn refund_succeeded(&self, event: RefundEvent);

    // Subscription lifecycle events (all include tenant_id for multi-tenant isolation)
    async fn subscription_created(
        &self,
        tenant_id: &str,
        subscription_id: &str,
        product_id: &str,
        wallet: Option<&str>,
    );
    async fn subscription_updated(
        &self,
        tenant_id: &str,
        subscription_id: &str,
        product_id: &str,
        wallet: Option<&str>,
    );
    async fn subscription_cancelled(
        &self,
        tenant_id: &str,
        subscription_id: &str,
        product_id: &str,
        wallet: Option<&str>,
    );
    async fn subscription_renewed(
        &self,
        tenant_id: &str,
        subscription_id: &str,
        product_id: &str,
        wallet: Option<&str>,
    );
    async fn subscription_payment_failed(
        &self,
        tenant_id: &str,
        subscription_id: &str,
        product_id: &str,
        wallet: Option<&str>,
    );

    // Refund events (include tenant_id for multi-tenant isolation)
    async fn refund_processed(&self, tenant_id: &str, charge_id: &str, amount: i64, currency: &str);
}

/// No-op notifier for when webhooks are disabled
#[derive(Debug, Default, Clone)]
pub struct NoopNotifier;

#[async_trait]
impl Notifier for NoopNotifier {
    async fn payment_succeeded(&self, _event: PaymentEvent) {}
    async fn refund_succeeded(&self, _event: RefundEvent) {}
    async fn subscription_created(
        &self,
        _tenant: &str,
        _id: &str,
        _product: &str,
        _wallet: Option<&str>,
    ) {
    }
    async fn subscription_updated(
        &self,
        _tenant: &str,
        _id: &str,
        _product: &str,
        _wallet: Option<&str>,
    ) {
    }
    async fn subscription_cancelled(
        &self,
        _tenant: &str,
        _id: &str,
        _product: &str,
        _wallet: Option<&str>,
    ) {
    }
    async fn subscription_renewed(
        &self,
        _tenant: &str,
        _id: &str,
        _product: &str,
        _wallet: Option<&str>,
    ) {
    }
    async fn subscription_payment_failed(
        &self,
        _tenant: &str,
        _id: &str,
        _product: &str,
        _wallet: Option<&str>,
    ) {
    }
    async fn refund_processed(
        &self,
        _tenant: &str,
        _charge_id: &str,
        _amount: i64,
        _currency: &str,
    ) {
    }
}

/// HTTP webhook notifier
pub struct HttpNotifier<S: Store> {
    store: Arc<S>,
    webhook_url: String,
    webhook_secret: Option<String>,
    default_headers: HashMap<String, String>,
    max_attempts: i32,
}

impl<S: Store> HttpNotifier<S> {
    pub fn new(
        store: Arc<S>,
        webhook_url: String,
        webhook_secret: Option<String>,
        max_attempts: i32,
    ) -> Self {
        Self::new_with_headers(
            store,
            webhook_url,
            webhook_secret,
            HashMap::new(),
            max_attempts,
        )
    }

    pub fn new_with_headers(
        store: Arc<S>,
        webhook_url: String,
        webhook_secret: Option<String>,
        default_headers: HashMap<String, String>,
        max_attempts: i32,
    ) -> Self {
        Self {
            store,
            webhook_url,
            webhook_secret,
            default_headers,
            max_attempts,
        }
    }

    /// Sign the raw payload body per spec (HMAC-SHA256 of body only)
    fn sign_payload(&self, payload_bytes: &[u8]) -> Option<String> {
        let secret = self.webhook_secret.as_ref()?;

        let mac = match HmacSha256::new_from_slice(secret.as_bytes()) {
            Ok(m) => m,
            Err(e) => {
                tracing::error!(
                    error = %e,
                    "Failed to create HMAC for webhook signature - check webhook secret configuration"
                );
                return None;
            }
        };
        let mut mac = mac;
        mac.update(payload_bytes);
        let result = mac.finalize();
        Some(hex::encode(result.into_bytes()))
    }

    /// Enqueue a webhook with an existing event_id (preserves idempotency)
    async fn enqueue_webhook_with_id(
        &self,
        tenant_id: &str,
        event_id: &str,
        event_type: &str,
        payload: serde_json::Value,
    ) -> Result<String, String> {
        let now = Utc::now();
        let timestamp = now.timestamp();

        // L-008: Use canonical JSON serialization for deterministic signatures.
        // This ensures the same logical payload always produces the same signature,
        // regardless of object key ordering or whitespace in the original Value.
        let payload_bytes = canonical_json(&payload);

        let mut headers = self.default_headers.clone();
        headers.insert("Content-Type".to_string(), "application/json".to_string());
        headers.insert("X-Cedros-Event-Type".to_string(), event_type.to_string());
        headers.insert("X-Cedros-Delivery-ID".to_string(), event_id.to_string());
        headers.insert("X-Cedros-Timestamp".to_string(), timestamp.to_string());

        // Sign per spec: sha256={hex-encoded-signature}
        if let Some(sig) = self.sign_payload(&payload_bytes) {
            headers.insert("X-Cedros-Signature".to_string(), format!("sha256={}", sig));
        }

        let webhook = PendingWebhook {
            id: event_id.to_string(),
            tenant_id: tenant_id.to_string(),
            url: self.webhook_url.clone(),
            payload,
            payload_bytes,
            headers,
            event_type: event_type.to_string(),
            status: WebhookStatus::Pending,
            attempts: 0,
            max_attempts: self.max_attempts,
            last_error: None,
            last_attempt_at: None,
            next_attempt_at: Some(now),
            created_at: now,
            completed_at: None,
        };

        self.store
            .enqueue_webhook(webhook)
            .await
            .map_err(|e| e.to_string())?;

        Ok(event_id.to_string())
    }

    // Intentionally no "generate ID" helper here: callers must ensure payload.eventId and
    // webhook delivery ID stay aligned for traceability and idempotency.
}

#[async_trait]
impl<S: Store + 'static> Notifier for HttpNotifier<S> {
    async fn payment_succeeded(&self, event: PaymentEvent) {
        // Use the event_id from the incoming event to preserve idempotency
        let payload = serde_json::json!({
            "eventId": event.event_id,
            "eventType": event.event_type,
            "eventTimestamp": event.event_timestamp,
            "resourceId": event.resource_id,
            "method": event.method,
            "stripeSessionId": event.stripe_session_id,
            "stripeCustomer": event.stripe_customer,
            "fiatAmountCents": event.fiat_amount_cents,
            "fiatCurrency": event.fiat_currency,
            "cryptoAtomicAmount": event.crypto_atomic_amount,
            "cryptoToken": event.crypto_token,
            "wallet": event.wallet,
            "userId": event.user_id,
            "proofSignature": event.proof_signature,
            "metadata": event.metadata,
            "paidAt": event.paid_at
        });

        // Per spec (20-webhooks.md): Use tenant_id from event for proper multi-tenant isolation
        if let Err(e) = self
            .enqueue_webhook_with_id(
                &event.tenant_id,
                &event.event_id,
                &event.event_type,
                payload,
            )
            .await
        {
            tracing::error!(error = %e, "Failed to enqueue payment webhook");
        }
    }

    async fn refund_succeeded(&self, event: RefundEvent) {
        // Use the event_id from the incoming event to preserve idempotency
        let payload = serde_json::json!({
            "eventId": event.event_id,
            "eventType": event.event_type,
            "eventTimestamp": event.event_timestamp,
            "refundId": event.refund_id,
            "originalPurchaseId": event.original_purchase_id,
            "recipientWallet": event.recipient_wallet,
            "atomicAmount": event.atomic_amount,
            "token": event.token,
            "processedBy": event.processed_by,
            "signature": event.signature,
            "reason": event.reason,
            "metadata": event.metadata,
            "refundedAt": event.refunded_at
        });

        // Per spec (20-webhooks.md): Use tenant_id from event for proper multi-tenant isolation
        if let Err(e) = self
            .enqueue_webhook_with_id(
                &event.tenant_id,
                &event.event_id,
                &event.event_type,
                payload,
            )
            .await
        {
            tracing::error!(error = %e, "Failed to enqueue refund webhook");
        }
    }

    async fn subscription_created(
        &self,
        tenant_id: &str,
        subscription_id: &str,
        product_id: &str,
        wallet: Option<&str>,
    ) {
        let event_id = generate_event_id();
        let payload = serde_json::json!({
            "eventId": event_id,
            "eventType": "subscription.created",
            "eventTimestamp": Utc::now(),
            "subscriptionId": subscription_id,
            "productId": product_id,
            "wallet": wallet
        });

        if let Err(e) = self
            .enqueue_webhook_with_id(tenant_id, &event_id, "subscription.created", payload)
            .await
        {
            tracing::error!(error = %e, "Failed to enqueue subscription.created webhook");
        }
    }

    async fn subscription_updated(
        &self,
        tenant_id: &str,
        subscription_id: &str,
        product_id: &str,
        wallet: Option<&str>,
    ) {
        let event_id = generate_event_id();
        let payload = serde_json::json!({
            "eventId": event_id,
            "eventType": "subscription.updated",
            "eventTimestamp": Utc::now(),
            "subscriptionId": subscription_id,
            "productId": product_id,
            "wallet": wallet
        });

        if let Err(e) = self
            .enqueue_webhook_with_id(tenant_id, &event_id, "subscription.updated", payload)
            .await
        {
            tracing::error!(error = %e, "Failed to enqueue subscription.updated webhook");
        }
    }

    async fn subscription_cancelled(
        &self,
        tenant_id: &str,
        subscription_id: &str,
        product_id: &str,
        wallet: Option<&str>,
    ) {
        let event_id = generate_event_id();
        let payload = serde_json::json!({
            "eventId": event_id,
            "eventType": "subscription.cancelled",
            "eventTimestamp": Utc::now(),
            "subscriptionId": subscription_id,
            "productId": product_id,
            "wallet": wallet
        });

        if let Err(e) = self
            .enqueue_webhook_with_id(tenant_id, &event_id, "subscription.cancelled", payload)
            .await
        {
            tracing::error!(error = %e, "Failed to enqueue subscription.cancelled webhook");
        }
    }

    async fn subscription_renewed(
        &self,
        tenant_id: &str,
        subscription_id: &str,
        product_id: &str,
        wallet: Option<&str>,
    ) {
        let event_id = generate_event_id();
        let payload = serde_json::json!({
            "eventId": event_id,
            "eventType": "subscription.renewed",
            "eventTimestamp": Utc::now(),
            "subscriptionId": subscription_id,
            "productId": product_id,
            "wallet": wallet
        });

        if let Err(e) = self
            .enqueue_webhook_with_id(tenant_id, &event_id, "subscription.renewed", payload)
            .await
        {
            tracing::error!(error = %e, "Failed to enqueue subscription.renewed webhook");
        }
    }

    async fn subscription_payment_failed(
        &self,
        tenant_id: &str,
        subscription_id: &str,
        product_id: &str,
        wallet: Option<&str>,
    ) {
        let event_id = generate_event_id();
        let payload = serde_json::json!({
            "eventId": event_id,
            "eventType": "subscription.payment_failed",
            "eventTimestamp": Utc::now(),
            "subscriptionId": subscription_id,
            "productId": product_id,
            "wallet": wallet
        });

        if let Err(e) = self
            .enqueue_webhook_with_id(tenant_id, &event_id, "subscription.payment_failed", payload)
            .await
        {
            tracing::error!(error = %e, "Failed to enqueue subscription.payment_failed webhook");
        }
    }

    async fn refund_processed(
        &self,
        tenant_id: &str,
        charge_id: &str,
        amount: i64,
        currency: &str,
    ) {
        let event_id = generate_event_id();
        let payload = serde_json::json!({
            "eventId": event_id,
            "eventType": "refund.processed",
            "eventTimestamp": Utc::now(),
            "chargeId": charge_id,
            "amount": amount,
            "currency": currency
        });

        if let Err(e) = self
            .enqueue_webhook_with_id(tenant_id, &event_id, "refund.processed", payload)
            .await
        {
            tracing::error!(error = %e, "Failed to enqueue refund.processed webhook");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::InMemoryStore;

    #[tokio::test]
    async fn test_notifier_sets_max_attempts() {
        let store = Arc::new(InMemoryStore::new());
        let notifier = HttpNotifier::new_with_headers(
            store.clone(),
            "https://example.com/webhook".to_string(),
            None,
            HashMap::new(),
            7,
        );

        let event = PaymentEvent {
            event_id: "event-1".to_string(),
            event_type: "payment.succeeded".to_string(),
            event_timestamp: Utc::now(),
            resource_id: "resource-1".to_string(),
            method: "x402".to_string(),
            paid_at: Utc::now(),
            ..Default::default()
        };

        notifier.payment_succeeded(event).await;

        let stored = store.get_webhook("event-1").await.unwrap().unwrap();
        assert_eq!(stored.max_attempts, 7);
    }

    #[tokio::test]
    async fn test_notifier_stores_payload_bytes_and_signature() {
        let store = Arc::new(InMemoryStore::new());
        let notifier = HttpNotifier::new_with_headers(
            store.clone(),
            "https://example.com/webhook".to_string(),
            Some("secret".to_string()),
            HashMap::new(),
            3,
        );

        let event = PaymentEvent {
            event_id: "event-2".to_string(),
            event_type: "payment.succeeded".to_string(),
            event_timestamp: Utc::now(),
            resource_id: "resource-2".to_string(),
            method: "x402".to_string(),
            paid_at: Utc::now(),
            ..Default::default()
        };

        notifier.payment_succeeded(event).await;

        let stored = store.get_webhook("event-2").await.unwrap().unwrap();
        assert!(!stored.payload_bytes.is_empty());
        let expected = notifier.sign_payload(&stored.payload_bytes).unwrap();
        let header = stored
            .headers
            .get("X-Cedros-Signature")
            .expect("signature header");
        assert_eq!(header, &format!("sha256={}", expected));
    }

    #[tokio::test]
    async fn test_subscription_webhook_event_id_matches_delivery_id() {
        let store = Arc::new(InMemoryStore::new());
        let notifier = HttpNotifier::new_with_headers(
            store.clone(),
            "https://example.com/webhook".to_string(),
            None,
            HashMap::new(),
            3,
        );

        notifier
            .subscription_created("tenant-1", "sub-1", "prod-1", Some("wallet"))
            .await;

        let items = store.list_webhooks("tenant-1", None, 10).await.unwrap();
        let wh = items.first().expect("webhook");
        let payload_event_id = wh
            .payload
            .get("eventId")
            .and_then(|v| v.as_str())
            .expect("payload eventId");
        assert_eq!(wh.id, payload_event_id);
    }

    #[tokio::test]
    async fn test_refund_processed_webhook_event_id_matches_delivery_id() {
        let store = Arc::new(InMemoryStore::new());
        let notifier = HttpNotifier::new_with_headers(
            store.clone(),
            "https://example.com/webhook".to_string(),
            None,
            HashMap::new(),
            3,
        );

        notifier
            .refund_processed("tenant-1", "ch_1", 123, "USD")
            .await;

        let items = store.list_webhooks("tenant-1", None, 10).await.unwrap();
        let wh = items.first().expect("webhook");
        let payload_event_id = wh
            .payload
            .get("eventId")
            .and_then(|v| v.as_str())
            .expect("payload eventId");
        assert_eq!(wh.id, payload_event_id);
    }
}
