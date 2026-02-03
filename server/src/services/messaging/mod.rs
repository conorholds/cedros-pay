//! Messaging service for email receipts and webhook notifications on order events.
//!
//! This module provides:
//! - Email receipts to customers after purchase (queued via email_queue, sent by email worker)
//! - Webhook notifications to admin after purchase (with HMAC-SHA256 signing)

use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use hmac::{Hmac, Mac};
use sha2::Sha256;

use crate::config::MessagingConfig;
use crate::models::Order;
use crate::storage::{PendingEmail, Store};

type HmacSha256 = Hmac<Sha256>;

/// Event payload for order.created webhook
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderCreatedEvent {
    pub event: String,
    pub order_id: String,
    pub customer_email: Option<String>,
    pub items: Vec<OrderItemPayload>,
    pub total: TotalPayload,
    pub payment_method: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderItemPayload {
    pub product_id: String,
    pub variant_id: Option<String>,
    pub quantity: i32,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TotalPayload {
    pub amount: i64,
    pub currency: String,
}

/// Messaging service trait for order notifications
#[async_trait]
pub trait MessagingService: Send + Sync {
    /// Send order notifications (email + webhook) after a successful order.
    /// Email is sent to order.customer_email if present and email_enabled is true.
    async fn notify_order_created(&self, order: &Order);
}

/// No-op messaging service for when messaging is disabled
#[derive(Debug, Default, Clone)]
pub struct NoopMessagingService;

#[async_trait]
impl MessagingService for NoopMessagingService {
    async fn notify_order_created(&self, _order: &Order) {}
}

/// HTTP messaging service for email and webhook notifications
pub struct HttpMessagingService<S: Store> {
    config: MessagingConfig,
    http_client: reqwest::Client,
    store: Arc<S>,
}

impl<S: Store + 'static> HttpMessagingService<S> {
    pub fn new(config: MessagingConfig, store: Arc<S>) -> Self {
        let http_client = reqwest::Client::builder()
            .timeout(config.webhook_timeout)
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        Self {
            config,
            http_client,
            store,
        }
    }

    /// Sign the payload with HMAC-SHA256
    fn sign_payload(&self, payload_bytes: &[u8]) -> Option<String> {
        if self.config.webhook_secret.is_empty() {
            return None;
        }

        let mac = match HmacSha256::new_from_slice(self.config.webhook_secret.as_bytes()) {
            Ok(m) => m,
            Err(e) => {
                tracing::error!(
                    error = %e,
                    "Failed to create HMAC for messaging webhook signature"
                );
                return None;
            }
        };
        let mut mac = mac;
        mac.update(payload_bytes);
        let result = mac.finalize();
        Some(hex::encode(result.into_bytes()))
    }

    /// Send webhook notification for order.created
    async fn send_webhook(&self, order: &Order) {
        if !self.config.webhook_enabled || self.config.webhook_url.is_empty() {
            return;
        }

        let items: Vec<OrderItemPayload> = order
            .items
            .iter()
            .map(|item| OrderItemPayload {
                product_id: item.product_id.clone(),
                variant_id: item.variant_id.clone(),
                quantity: item.quantity,
            })
            .collect();

        let event = OrderCreatedEvent {
            event: "order.created".to_string(),
            order_id: order.id.clone(),
            customer_email: order.customer_email.clone(),
            items,
            total: TotalPayload {
                amount: order.amount,
                currency: order.amount_asset.clone(),
            },
            payment_method: order.source.clone(),
            timestamp: Utc::now(),
        };

        let payload_bytes = match serde_json::to_vec(&event) {
            Ok(bytes) => bytes,
            Err(e) => {
                tracing::error!(error = %e, order_id = %order.id, "Failed to serialize order.created webhook payload");
                return;
            }
        };

        let mut request = self
            .http_client
            .post(&self.config.webhook_url)
            .header("Content-Type", "application/json")
            .body(payload_bytes.clone());

        // Add HMAC signature header
        if let Some(signature) = self.sign_payload(&payload_bytes) {
            request = request.header("X-Signature", format!("sha256={}", signature));
        }

        match request.send().await {
            Ok(response) => {
                if response.status().is_success() {
                    tracing::info!(
                        order_id = %order.id,
                        status = %response.status(),
                        "Successfully sent order.created webhook"
                    );
                } else {
                    tracing::warn!(
                        order_id = %order.id,
                        status = %response.status(),
                        "Order.created webhook returned non-success status"
                    );
                }
            }
            Err(e) => {
                tracing::error!(
                    error = %e,
                    order_id = %order.id,
                    "Failed to send order.created webhook"
                );
            }
        }
    }

    /// Queue email receipt for async delivery by the email worker
    async fn queue_email_receipt(&self, order: &Order, customer_email: &str) {
        if !self.config.email_enabled {
            return;
        }

        // Build plain text email body
        let mut body_text = format!(
            "Order Confirmation\n\nThank you for your purchase!\n\nOrder ID: {}\n\nItems:\n",
            order.id
        );

        for item in &order.items {
            body_text.push_str(&format!("- {} (qty: {})\n", item.product_id, item.quantity));
        }

        // amount is in smallest units (cents for USD), convert to major units for display
        let amount_major = order.amount as f64 / 100.0;
        body_text.push_str(&format!(
            "\nTotal: {:.2} {}\n\nPayment Method: {}\n",
            amount_major, order.amount_asset, order.source
        ));

        // Build HTML email body
        let body_html = self.build_html_receipt(order);

        let email_id = format!("email_{}", uuid::Uuid::new_v4());
        let pending_email = PendingEmail {
            id: email_id.clone(),
            tenant_id: order.tenant_id.clone(),
            to_email: customer_email.to_string(),
            from_email: self.config.from_email.clone(),
            from_name: self.config.from_name.clone(),
            subject: format!("Order Confirmation - {}", order.id),
            body_text,
            body_html: Some(body_html),
            status: crate::storage::EmailStatus::Pending,
            attempts: 0,
            max_attempts: 5,
            last_error: None,
            last_attempt_at: None,
            next_attempt_at: None,
            created_at: Utc::now(),
            completed_at: None,
        };

        match self.store.enqueue_email(pending_email).await {
            Ok(_) => {
                tracing::info!(
                    email_id = %email_id,
                    order_id = %order.id,
                    customer_email = %customer_email,
                    "Queued order receipt email for delivery"
                );
            }
            Err(e) => {
                tracing::error!(
                    error = %e,
                    order_id = %order.id,
                    customer_email = %customer_email,
                    "Failed to queue order receipt email"
                );
            }
        }
    }

    /// Build HTML email receipt
    fn build_html_receipt(&self, order: &Order) -> String {
        let amount_major = order.amount as f64 / 100.0;

        let items_html: String = order
            .items
            .iter()
            .map(|item| {
                format!(
                    r#"<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">{}</td><td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">{}</td></tr>"#,
                    item.product_id, item.quantity
                )
            })
            .collect();

        format!(
            r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="background-color: #4F46E5; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Order Confirmation</h1>
        </div>
        <div style="padding: 24px;">
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">Thank you for your purchase!</p>
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Order ID</p>
                <p style="margin: 4px 0 0 0; color: #111827; font-size: 16px; font-weight: 600;">{order_id}</p>
            </div>
            <h2 style="color: #111827; font-size: 18px; margin-bottom: 16px;">Items</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <thead>
                    <tr style="background-color: #f9fafb;">
                        <th style="padding: 8px; text-align: left; color: #6b7280; font-weight: 500;">Product</th>
                        <th style="padding: 8px; text-align: center; color: #6b7280; font-weight: 500;">Qty</th>
                    </tr>
                </thead>
                <tbody>
                    {items}
                </tbody>
            </table>
            <div style="border-top: 2px solid #e5e7eb; padding-top: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #374151; font-size: 18px; font-weight: 600;">Total</span>
                    <span style="color: #111827; font-size: 24px; font-weight: 700;">{amount:.2} {currency}</span>
                </div>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">Payment Method: {payment_method}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 16px; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">Questions? Contact our support team.</p>
        </div>
    </div>
</body>
</html>"#,
            order_id = order.id,
            items = items_html,
            amount = amount_major,
            currency = order.amount_asset,
            payment_method = order.source
        )
    }
}

#[async_trait]
impl<S: Store + 'static> MessagingService for HttpMessagingService<S> {
    async fn notify_order_created(&self, order: &Order) {
        // Send webhook (fire-and-forget, errors logged)
        self.send_webhook(order).await;

        // Queue email receipt if customer email provided (delivered by email worker)
        if let Some(ref email) = order.customer_email {
            self.queue_email_receipt(order, email).await;
        }
    }
}

/// Create appropriate messaging service based on config
pub fn create_messaging_service<S: Store + 'static>(
    config: &MessagingConfig,
    store: Arc<S>,
) -> Arc<dyn MessagingService> {
    if config.email_enabled || config.webhook_enabled {
        Arc::new(HttpMessagingService::new(config.clone(), store))
    } else {
        Arc::new(NoopMessagingService)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::OrderItem;
    use crate::storage::InMemoryStore;
    use std::collections::HashMap;
    use std::time::Duration;

    fn sample_order() -> Order {
        Order {
            id: "ord_test123".to_string(),
            tenant_id: "default".to_string(),
            source: "stripe".to_string(),
            purchase_id: "pur_test".to_string(),
            resource_id: "cart:cart_123".to_string(),
            user_id: None,
            customer: None,
            status: "paid".to_string(),
            items: vec![OrderItem {
                product_id: "product-1".to_string(),
                variant_id: None,
                quantity: 2,
            }],
            amount: 2000,
            amount_asset: "USD".to_string(),
            customer_email: Some("test@example.com".to_string()),
            customer_name: Some("Test User".to_string()),
            receipt_url: None,
            shipping: None,
            metadata: HashMap::new(),
            created_at: Utc::now(),
            updated_at: None,
            status_updated_at: None,
        }
    }

    #[test]
    fn test_sign_payload() {
        let config = MessagingConfig {
            webhook_secret: "test-secret".to_string(),
            webhook_timeout: Duration::from_secs(10),
            ..Default::default()
        };
        let store = Arc::new(InMemoryStore::new());
        let service = HttpMessagingService::new(config, store);

        let payload = b"test payload";
        let signature = service.sign_payload(payload);

        assert!(signature.is_some());
        // HMAC-SHA256 produces 64 hex characters
        assert_eq!(signature.unwrap().len(), 64);
    }

    #[test]
    fn test_sign_payload_empty_secret() {
        let config = MessagingConfig {
            webhook_secret: String::new(),
            ..Default::default()
        };
        let store = Arc::new(InMemoryStore::new());
        let service = HttpMessagingService::new(config, store);

        let payload = b"test payload";
        let signature = service.sign_payload(payload);

        assert!(signature.is_none());
    }

    #[tokio::test]
    async fn test_noop_service_does_nothing() {
        let service = NoopMessagingService;
        let order = sample_order();

        // Should not panic or error
        service.notify_order_created(&order).await;
    }
}
