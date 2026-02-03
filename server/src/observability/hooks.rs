//! Pluggable observability hooks system
//!
//! Provides a pluggable hook system for custom observability integrations.
//! Matches Go server's `internal/observability/*.go` design.
//!
//! Example implementations:
//! - DatadogHook: Send metrics to Datadog
//! - OpenTelemetryHook: Send traces to OpenTelemetry collectors
//! - LoggingHook: Log all events for debugging

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;

// ─────────────────────────────────────────────────────────────────────────────
// Event Types
// ─────────────────────────────────────────────────────────────────────────────

/// Payment event data
#[derive(Debug, Clone, Serialize)]
pub struct PaymentEvent {
    pub resource_id: String,
    pub tenant_id: String,
    pub method: PaymentMethod,
    pub wallet: Option<String>,
    pub amount_atomic: i64,
    pub currency: String,
    pub timestamp: DateTime<Utc>,
    pub metadata: HashMap<String, String>,
}

/// Payment methods
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum PaymentMethod {
    Stripe,
    X402,
    Credits,
}

/// Webhook event data
#[derive(Debug, Clone, Serialize)]
pub struct WebhookEvent {
    pub webhook_id: String,
    pub tenant_id: String,
    pub url: String,
    pub event_type: String,
    pub attempt: i32,
    pub timestamp: DateTime<Utc>,
    pub error: Option<String>,
    pub duration_ms: u64,
}

/// Refund event data
#[derive(Debug, Clone, Serialize)]
pub struct RefundEvent {
    pub refund_id: String,
    pub tenant_id: String,
    pub original_purchase_id: String,
    pub recipient_wallet: String,
    pub amount_atomic: i64,
    pub currency: String,
    pub timestamp: DateTime<Utc>,
}

/// Cart event data
#[derive(Debug, Clone, Serialize)]
pub struct CartEvent {
    pub cart_id: String,
    pub tenant_id: String,
    pub item_count: usize,
    pub total_atomic: i64,
    pub currency: String,
    pub timestamp: DateTime<Utc>,
}

/// RPC call event data
#[derive(Debug, Clone, Serialize)]
pub struct RpcEvent {
    pub method: String,
    pub success: bool,
    pub duration_ms: u64,
    pub timestamp: DateTime<Utc>,
    pub error: Option<String>,
}

/// Database query event data
#[derive(Debug, Clone, Serialize)]
pub struct DatabaseEvent {
    pub operation: String,
    pub table: String,
    pub success: bool,
    pub duration_ms: u64,
    pub timestamp: DateTime<Utc>,
    pub error: Option<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Traits
// ─────────────────────────────────────────────────────────────────────────────

/// Hook for payment lifecycle events
#[async_trait]
pub trait PaymentHook: Send + Sync {
    /// Called when a payment flow starts (quote generated)
    async fn on_payment_started(&self, event: &PaymentEvent);
    /// Called when payment is completed successfully
    async fn on_payment_completed(&self, event: &PaymentEvent);
    /// Called when payment is settled (confirmed on-chain or by Stripe)
    async fn on_payment_settled(&self, event: &PaymentEvent);
    /// Called when payment fails
    async fn on_payment_failed(&self, event: &PaymentEvent, error: &str);
}

/// Hook for webhook delivery events
#[async_trait]
pub trait WebhookHook: Send + Sync {
    /// Called when a webhook is queued
    async fn on_webhook_queued(&self, event: &WebhookEvent);
    /// Called when a webhook is delivered successfully
    async fn on_webhook_delivered(&self, event: &WebhookEvent);
    /// Called when a webhook delivery fails
    async fn on_webhook_failed(&self, event: &WebhookEvent);
    /// Called when a webhook is retried
    async fn on_webhook_retried(&self, event: &WebhookEvent);
}

/// Hook for refund events
#[async_trait]
pub trait RefundHook: Send + Sync {
    /// Called when a refund is requested
    async fn on_refund_requested(&self, event: &RefundEvent);
    /// Called when a refund is approved
    async fn on_refund_approved(&self, event: &RefundEvent);
    /// Called when a refund is processed
    async fn on_refund_processed(&self, event: &RefundEvent);
    /// Called when a refund is rejected
    async fn on_refund_rejected(&self, event: &RefundEvent, reason: &str);
}

/// Hook for cart events
#[async_trait]
pub trait CartHook: Send + Sync {
    /// Called when a cart quote is created
    async fn on_cart_created(&self, event: &CartEvent);
    /// Called when a cart is paid
    async fn on_cart_paid(&self, event: &CartEvent);
    /// Called when a cart quote expires
    async fn on_cart_expired(&self, event: &CartEvent);
}

/// Hook for RPC call events
#[async_trait]
pub trait RpcHook: Send + Sync {
    /// Called when an RPC call is made
    async fn on_rpc_call(&self, event: &RpcEvent);
}

/// Hook for database operations
#[async_trait]
pub trait DatabaseHook: Send + Sync {
    /// Called when a database query is executed
    async fn on_query(&self, event: &DatabaseEvent);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Registry
// ─────────────────────────────────────────────────────────────────────────────

/// Registry for observability hooks
///
/// Allows registering multiple hook implementations that are called
/// for each event type. Hooks are called concurrently.
pub struct HookRegistry {
    payment_hooks: Vec<Arc<dyn PaymentHook>>,
    webhook_hooks: Vec<Arc<dyn WebhookHook>>,
    refund_hooks: Vec<Arc<dyn RefundHook>>,
    cart_hooks: Vec<Arc<dyn CartHook>>,
    rpc_hooks: Vec<Arc<dyn RpcHook>>,
    database_hooks: Vec<Arc<dyn DatabaseHook>>,
}

impl Default for HookRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl HookRegistry {
    /// Create a new empty hook registry
    pub fn new() -> Self {
        Self {
            payment_hooks: Vec::new(),
            webhook_hooks: Vec::new(),
            refund_hooks: Vec::new(),
            cart_hooks: Vec::new(),
            rpc_hooks: Vec::new(),
            database_hooks: Vec::new(),
        }
    }

    /// Register a payment hook
    pub fn register_payment_hook(&mut self, hook: Arc<dyn PaymentHook>) {
        self.payment_hooks.push(hook);
    }

    /// Register a webhook hook
    pub fn register_webhook_hook(&mut self, hook: Arc<dyn WebhookHook>) {
        self.webhook_hooks.push(hook);
    }

    /// Register a refund hook
    pub fn register_refund_hook(&mut self, hook: Arc<dyn RefundHook>) {
        self.refund_hooks.push(hook);
    }

    /// Register a cart hook
    pub fn register_cart_hook(&mut self, hook: Arc<dyn CartHook>) {
        self.cart_hooks.push(hook);
    }

    /// Register an RPC hook
    pub fn register_rpc_hook(&mut self, hook: Arc<dyn RpcHook>) {
        self.rpc_hooks.push(hook);
    }

    /// Register a database hook
    pub fn register_database_hook(&mut self, hook: Arc<dyn DatabaseHook>) {
        self.database_hooks.push(hook);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Event Dispatch
    // ─────────────────────────────────────────────────────────────────────────

    /// Dispatch payment started event to all registered hooks
    pub async fn payment_started(&self, event: &PaymentEvent) {
        for hook in &self.payment_hooks {
            hook.on_payment_started(event).await;
        }
    }

    /// Dispatch payment completed event to all registered hooks
    pub async fn payment_completed(&self, event: &PaymentEvent) {
        for hook in &self.payment_hooks {
            hook.on_payment_completed(event).await;
        }
    }

    /// Dispatch payment settled event to all registered hooks
    pub async fn payment_settled(&self, event: &PaymentEvent) {
        for hook in &self.payment_hooks {
            hook.on_payment_settled(event).await;
        }
    }

    /// Dispatch payment failed event to all registered hooks
    pub async fn payment_failed(&self, event: &PaymentEvent, error: &str) {
        for hook in &self.payment_hooks {
            hook.on_payment_failed(event, error).await;
        }
    }

    /// Dispatch webhook queued event to all registered hooks
    pub async fn webhook_queued(&self, event: &WebhookEvent) {
        for hook in &self.webhook_hooks {
            hook.on_webhook_queued(event).await;
        }
    }

    /// Dispatch webhook delivered event to all registered hooks
    pub async fn webhook_delivered(&self, event: &WebhookEvent) {
        for hook in &self.webhook_hooks {
            hook.on_webhook_delivered(event).await;
        }
    }

    /// Dispatch webhook failed event to all registered hooks
    pub async fn webhook_failed(&self, event: &WebhookEvent) {
        for hook in &self.webhook_hooks {
            hook.on_webhook_failed(event).await;
        }
    }

    /// Dispatch webhook retried event to all registered hooks
    pub async fn webhook_retried(&self, event: &WebhookEvent) {
        for hook in &self.webhook_hooks {
            hook.on_webhook_retried(event).await;
        }
    }

    /// Dispatch refund requested event to all registered hooks
    pub async fn refund_requested(&self, event: &RefundEvent) {
        for hook in &self.refund_hooks {
            hook.on_refund_requested(event).await;
        }
    }

    /// Dispatch refund approved event to all registered hooks
    pub async fn refund_approved(&self, event: &RefundEvent) {
        for hook in &self.refund_hooks {
            hook.on_refund_approved(event).await;
        }
    }

    /// Dispatch refund processed event to all registered hooks
    pub async fn refund_processed(&self, event: &RefundEvent) {
        for hook in &self.refund_hooks {
            hook.on_refund_processed(event).await;
        }
    }

    /// Dispatch refund rejected event to all registered hooks
    pub async fn refund_rejected(&self, event: &RefundEvent, reason: &str) {
        for hook in &self.refund_hooks {
            hook.on_refund_rejected(event, reason).await;
        }
    }

    /// Dispatch cart created event to all registered hooks
    pub async fn cart_created(&self, event: &CartEvent) {
        for hook in &self.cart_hooks {
            hook.on_cart_created(event).await;
        }
    }

    /// Dispatch cart paid event to all registered hooks
    pub async fn cart_paid(&self, event: &CartEvent) {
        for hook in &self.cart_hooks {
            hook.on_cart_paid(event).await;
        }
    }

    /// Dispatch cart expired event to all registered hooks
    pub async fn cart_expired(&self, event: &CartEvent) {
        for hook in &self.cart_hooks {
            hook.on_cart_expired(event).await;
        }
    }

    /// Dispatch RPC call event to all registered hooks
    pub async fn rpc_call(&self, event: &RpcEvent) {
        for hook in &self.rpc_hooks {
            hook.on_rpc_call(event).await;
        }
    }

    /// Dispatch database query event to all registered hooks
    pub async fn database_query(&self, event: &DatabaseEvent) {
        for hook in &self.database_hooks {
            hook.on_query(event).await;
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in Logging Hook
// ─────────────────────────────────────────────────────────────────────────────

/// Logging hook that logs all events using tracing at info level
#[derive(Debug, Clone, Default)]
pub struct LoggingHook;

impl LoggingHook {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl PaymentHook for LoggingHook {
    async fn on_payment_started(&self, event: &PaymentEvent) {
        tracing::info!(
            resource_id = %event.resource_id,
            method = ?event.method,
            "Payment started"
        );
    }

    async fn on_payment_completed(&self, event: &PaymentEvent) {
        tracing::info!(
            resource_id = %event.resource_id,
            method = ?event.method,
            amount = event.amount_atomic,
            "Payment completed"
        );
    }

    async fn on_payment_settled(&self, event: &PaymentEvent) {
        tracing::info!(
            resource_id = %event.resource_id,
            method = ?event.method,
            "Payment settled"
        );
    }

    async fn on_payment_failed(&self, event: &PaymentEvent, error: &str) {
        tracing::warn!(
            resource_id = %event.resource_id,
            method = ?event.method,
            error = %error,
            "Payment failed"
        );
    }
}

#[async_trait]
impl WebhookHook for LoggingHook {
    async fn on_webhook_queued(&self, event: &WebhookEvent) {
        tracing::info!(
            webhook_id = %event.webhook_id,
            event_type = %event.event_type,
            "Webhook queued"
        );
    }

    async fn on_webhook_delivered(&self, event: &WebhookEvent) {
        tracing::info!(
            webhook_id = %event.webhook_id,
            duration_ms = event.duration_ms,
            "Webhook delivered"
        );
    }

    async fn on_webhook_failed(&self, event: &WebhookEvent) {
        tracing::warn!(
            webhook_id = %event.webhook_id,
            error = ?event.error,
            attempt = event.attempt,
            "Webhook failed"
        );
    }

    async fn on_webhook_retried(&self, event: &WebhookEvent) {
        tracing::info!(
            webhook_id = %event.webhook_id,
            attempt = event.attempt,
            "Webhook retry scheduled"
        );
    }
}

#[async_trait]
impl RefundHook for LoggingHook {
    async fn on_refund_requested(&self, event: &RefundEvent) {
        tracing::info!(
            refund_id = %event.refund_id,
            amount = event.amount_atomic,
            "Refund requested"
        );
    }

    async fn on_refund_approved(&self, event: &RefundEvent) {
        tracing::info!(
            refund_id = %event.refund_id,
            "Refund approved"
        );
    }

    async fn on_refund_processed(&self, event: &RefundEvent) {
        tracing::info!(
            refund_id = %event.refund_id,
            recipient = %event.recipient_wallet,
            "Refund processed"
        );
    }

    async fn on_refund_rejected(&self, event: &RefundEvent, reason: &str) {
        tracing::warn!(
            refund_id = %event.refund_id,
            reason = %reason,
            "Refund rejected"
        );
    }
}

#[async_trait]
impl CartHook for LoggingHook {
    async fn on_cart_created(&self, event: &CartEvent) {
        tracing::info!(
            cart_id = %event.cart_id,
            items = event.item_count,
            "Cart created"
        );
    }

    async fn on_cart_paid(&self, event: &CartEvent) {
        tracing::info!(
            cart_id = %event.cart_id,
            total = event.total_atomic,
            "Cart paid"
        );
    }

    async fn on_cart_expired(&self, event: &CartEvent) {
        tracing::info!(
            cart_id = %event.cart_id,
            "Cart expired"
        );
    }
}

#[async_trait]
impl RpcHook for LoggingHook {
    async fn on_rpc_call(&self, event: &RpcEvent) {
        if event.success {
            tracing::debug!(
                method = %event.method,
                duration_ms = event.duration_ms,
                "RPC call"
            );
        } else {
            tracing::warn!(
                method = %event.method,
                duration_ms = event.duration_ms,
                error = ?event.error,
                "RPC call failed"
            );
        }
    }
}

#[async_trait]
impl DatabaseHook for LoggingHook {
    async fn on_query(&self, event: &DatabaseEvent) {
        if event.success {
            tracing::debug!(
                operation = %event.operation,
                table = %event.table,
                duration_ms = event.duration_ms,
                "Database query"
            );
        } else {
            tracing::warn!(
                operation = %event.operation,
                table = %event.table,
                error = ?event.error,
                "Database query failed"
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hook_registry_creation() {
        let registry = HookRegistry::new();
        assert!(registry.payment_hooks.is_empty());
    }

    #[test]
    fn test_logging_hook_creation() {
        let _hook = LoggingHook::new();
    }
}
