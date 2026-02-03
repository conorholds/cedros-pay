use std::any::Any;
use std::collections::HashMap;
use std::time::Duration;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::models::StripeRefundRequest;
use crate::models::{
    CartQuote, ChatMessage, ChatSession, Collection, Customer, DisputeRecord, Faq, Fulfillment,
    GiftCard, InventoryAdjustment, InventoryReservation, Order, OrderHistoryEntry, PaymentMethod,
    PaymentTransaction, RefundQuote, ReturnRequest, ShippingProfile, ShippingRate, Subscription,
    SubscriptionStatus, TaxRate,
};

pub mod cached;
pub mod memory;
pub mod postgres;

pub use cached::{CacheConfig, CachedStore, CachedStoreStats};
pub use memory::InMemoryStore;
pub use postgres::{InventoryAdjustmentRequest, PostgresConfig, PostgresPool, PostgresStore};

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("not found")]
    NotFound,
    #[error("conflict")]
    Conflict,
    #[error("validation failed: {0}")]
    Validation(String),
    #[error("database error: {0}")]
    Database(String),
    #[error("unknown error: {0}")]
    Unknown(String),
}

pub type StorageResult<T> = Result<T, StorageError>;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum WebhookStatus {
    #[default]
    Pending,
    Processing,
    Success,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PendingWebhook {
    pub id: String,
    /// Tenant ID for multi-tenant isolation per spec (10-middleware.md)
    #[serde(default = "default_tenant_webhook")]
    pub tenant_id: String,
    pub url: String,
    pub payload: serde_json::Value,
    #[serde(default)]
    pub payload_bytes: Vec<u8>,
    pub headers: HashMap<String, String>,
    pub event_type: String,
    pub status: WebhookStatus,
    pub attempts: i32,
    pub max_attempts: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_attempt_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_attempt_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<DateTime<Utc>>,
}

fn default_tenant_webhook() -> String {
    "default".to_string()
}

/// Email status for queue processing
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum EmailStatus {
    #[default]
    Pending,
    Completed,
    Failed,
}

impl std::fmt::Display for EmailStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EmailStatus::Pending => write!(f, "pending"),
            EmailStatus::Completed => write!(f, "completed"),
            EmailStatus::Failed => write!(f, "failed"),
        }
    }
}

impl std::str::FromStr for EmailStatus {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "pending" => Ok(Self::Pending),
            "completed" => Ok(Self::Completed),
            "failed" => Ok(Self::Failed),
            other => Err(format!("unknown email status: {}", other)),
        }
    }
}

/// Pending email for async delivery
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingEmail {
    pub id: String,
    /// Tenant ID for multi-tenant isolation
    #[serde(default = "default_tenant_webhook")]
    pub tenant_id: String,
    pub to_email: String,
    pub from_email: String,
    pub from_name: String,
    pub subject: String,
    pub body_text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body_html: Option<String>,
    pub status: EmailStatus,
    pub attempts: i32,
    pub max_attempts: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_attempt_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_attempt_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed_at: Option<DateTime<Utc>>,
}

/// Dead Letter Queue webhook entry
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DlqWebhook {
    pub id: String,
    /// Tenant ID for multi-tenant isolation per spec (10-middleware.md)
    #[serde(default = "default_tenant_webhook")]
    pub tenant_id: String,
    pub original_webhook_id: String,
    pub url: String,
    pub payload: serde_json::Value,
    #[serde(default)]
    pub payload_bytes: Vec<u8>,
    pub headers: HashMap<String, String>,
    pub event_type: String,
    pub final_error: String,
    pub total_attempts: i32,
    pub first_attempt_at: DateTime<Utc>,
    pub last_attempt_at: DateTime<Utc>,
    pub moved_to_dlq_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct IdempotencyResponse {
    pub status_code: i32,
    pub headers: HashMap<String, String>,
    pub body: Vec<u8>,
    pub cached_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminNonce {
    pub id: String,
    /// Tenant ID for multi-tenant isolation per spec (10-middleware.md)
    #[serde(default = "default_tenant")]
    pub tenant_id: String,
    /// Action type (e.g., "list-pending-refunds", "approve-refund") - required per spec
    pub purpose: String,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub consumed_at: Option<DateTime<Utc>>,
}

fn default_tenant() -> String {
    "default".to_string()
}

/// Purchase record for x402 transaction verification
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Purchase {
    pub signature: String,
    /// Tenant ID for multi-tenant isolation per spec (10-middleware.md)
    #[serde(default = "default_tenant")]
    pub tenant_id: String,
    pub resource_id: String,
    pub wallet: Option<String>,
    /// Optional user ID from cedros-login.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    pub amount: String,
    pub paid_at: DateTime<Utc>,
    pub metadata: Option<serde_json::Value>,
}

/// Server-managed credits hold binding.
///
/// A `CreditsHold` is created by this server (via cedros-login) and persisted so that
/// a `hold_id` cannot be replayed for a different user/resource/amount.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditsHold {
    pub hold_id: String,
    /// Tenant ID for multi-tenant isolation per spec (10-middleware.md)
    #[serde(default = "default_tenant")]
    pub tenant_id: String,
    pub user_id: String,
    pub resource_id: String,
    /// Amount in credits (atomic units of the configured credits SPL token)
    pub amount: i64,
    /// Token/currency code (e.g., "USDC", "SOL")
    pub amount_asset: String,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

/// Daily revenue entry for charts
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyRevenue {
    pub date: String, // YYYY-MM-DD format
    pub revenue: f64,
    pub transactions: i64,
}

/// Top product entry for overview
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopProduct {
    pub product_id: String,
    pub revenue: f64,
    pub quantity_sold: i64,
}

/// Admin dashboard statistics
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AdminStats {
    pub total_revenue: f64,
    pub total_transactions: i64,
    pub average_order_value: f64,
    pub revenue_by_method: HashMap<String, f64>,
    pub transactions_by_method: HashMap<String, i64>,
    #[serde(default)]
    pub revenue_by_day: Vec<DailyRevenue>,
    #[serde(default)]
    pub top_products: Vec<TopProduct>,
}

/// Core storage trait for all persistent data
/// Per spec (08-storage.md): All query methods include tenant_id for multi-tenant isolation
#[async_trait]
pub trait Store: Send + Sync {
    // ─────────────────────────────────────────────────────────────────────────
    // Cart quotes
    // Per spec (08-storage.md): All queries must filter by tenant_id
    // ─────────────────────────────────────────────────────────────────────────
    async fn store_cart_quote(&self, quote: CartQuote) -> StorageResult<()>;
    async fn store_cart_quotes(&self, quotes: Vec<CartQuote>) -> StorageResult<()>;
    /// Get cart quote by ID with tenant isolation
    async fn get_cart_quote(
        &self,
        tenant_id: &str,
        cart_id: &str,
    ) -> StorageResult<Option<CartQuote>>;
    /// Get multiple cart quotes with tenant isolation
    async fn get_cart_quotes(
        &self,
        tenant_id: &str,
        cart_ids: &[String],
    ) -> StorageResult<Vec<CartQuote>>;
    /// Mark cart as paid with tenant isolation
    async fn mark_cart_paid(
        &self,
        tenant_id: &str,
        cart_id: &str,
        wallet: &str,
    ) -> StorageResult<()>;
    /// Check if wallet has paid for cart with tenant isolation
    async fn has_cart_access(
        &self,
        tenant_id: &str,
        cart_id: &str,
        wallet: &str,
    ) -> StorageResult<bool>;
    /// Cleanup expired cart quotes (admin operation across all tenants)
    async fn cleanup_expired_cart_quotes(&self) -> StorageResult<u64>;

    // ─────────────────────────────────────────────────────────────────────────
    // Refunds
    // Per spec (08-storage.md): All queries must filter by tenant_id
    // ─────────────────────────────────────────────────────────────────────────
    async fn store_refund_quote(&self, quote: RefundQuote) -> StorageResult<()>;
    async fn store_refund_quotes(&self, quotes: Vec<RefundQuote>) -> StorageResult<()>;
    /// Get refund quote by ID with tenant isolation
    async fn get_refund_quote(
        &self,
        tenant_id: &str,
        refund_id: &str,
    ) -> StorageResult<Option<RefundQuote>>;
    /// Get refund by original purchase ID with tenant isolation
    async fn get_refund_by_original_purchase_id(
        &self,
        tenant_id: &str,
        original_purchase_id: &str,
    ) -> StorageResult<Option<RefundQuote>>;
    /// Get ALL refunds for an original purchase (for cumulative tracking)
    async fn get_all_refunds_for_purchase(
        &self,
        tenant_id: &str,
        original_purchase_id: &str,
    ) -> StorageResult<Vec<RefundQuote>>;
    /// List pending refunds with tenant isolation
    async fn list_pending_refunds(
        &self,
        tenant_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<RefundQuote>>;
    /// Mark refund as processed with tenant isolation
    async fn mark_refund_processed(
        &self,
        tenant_id: &str,
        refund_id: &str,
        processed_by: &str,
        signature: &str,
    ) -> StorageResult<()>;
    /// Delete refund quote with tenant isolation
    async fn delete_refund_quote(&self, tenant_id: &str, refund_id: &str) -> StorageResult<()>;
    /// Cleanup expired pending refund quotes (admin operation across all tenants)
    async fn cleanup_expired_refund_quotes(&self) -> StorageResult<u64>;

    // ─────────────────────────────────────────────────────────────────────────
    // Stripe refund requests (admin-created Stripe refunds)
    // ─────────────────────────────────────────────────────────────────────────
    async fn store_stripe_refund_request(&self, req: StripeRefundRequest) -> StorageResult<()>;
    async fn get_stripe_refund_request(
        &self,
        tenant_id: &str,
        request_id: &str,
    ) -> StorageResult<Option<StripeRefundRequest>>;
    async fn list_pending_stripe_refund_requests(
        &self,
        tenant_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<StripeRefundRequest>>;

    async fn get_pending_stripe_refund_request_by_original_purchase_id(
        &self,
        tenant_id: &str,
        original_purchase_id: &str,
    ) -> StorageResult<Option<StripeRefundRequest>>;

    // ─────────────────────────────────────────────────────────────────────────
    // Orders
    // ─────────────────────────────────────────────────────────────────────────
    async fn try_store_order(&self, order: Order) -> StorageResult<bool>;
    async fn get_order(&self, tenant_id: &str, order_id: &str) -> StorageResult<Option<Order>>;
    async fn list_orders(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Order>>;
    #[allow(clippy::too_many_arguments)]
    async fn list_orders_filtered(
        &self,
        tenant_id: &str,
        status: Option<&str>,
        search: Option<&str>,
        created_before: Option<DateTime<Utc>>,
        created_after: Option<DateTime<Utc>>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<Order>, i64)>;
    async fn update_order_status(
        &self,
        tenant_id: &str,
        order_id: &str,
        status: &str,
        status_updated_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()>;
    async fn append_order_history(&self, entry: OrderHistoryEntry) -> StorageResult<()>;
    async fn list_order_history(
        &self,
        tenant_id: &str,
        order_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<OrderHistoryEntry>>;
    async fn create_fulfillment(&self, fulfillment: Fulfillment) -> StorageResult<()>;
    async fn list_fulfillments(
        &self,
        tenant_id: &str,
        order_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<Fulfillment>>;
    #[allow(clippy::too_many_arguments)]
    async fn update_fulfillment_status(
        &self,
        tenant_id: &str,
        fulfillment_id: &str,
        status: &str,
        shipped_at: Option<DateTime<Utc>>,
        delivered_at: Option<DateTime<Utc>>,
        updated_at: DateTime<Utc>,
        tracking_number: Option<&str>,
        tracking_url: Option<&str>,
        carrier: Option<&str>,
    ) -> StorageResult<Option<Fulfillment>>;

    // ─────────────────────────────────────────────────────────────────────────
    // Returns
    // ─────────────────────────────────────────────────────────────────────────
    async fn create_return_request(&self, request: ReturnRequest) -> StorageResult<()>;
    async fn update_return_status(
        &self,
        tenant_id: &str,
        return_id: &str,
        status: &str,
        status_updated_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()>;
    async fn get_return_request(
        &self,
        tenant_id: &str,
        return_id: &str,
    ) -> StorageResult<Option<ReturnRequest>>;
    async fn list_return_requests(
        &self,
        tenant_id: &str,
        status: Option<&str>,
        order_id: Option<&str>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ReturnRequest>>;

    async fn reserve_inventory(&self, reservation: InventoryReservation) -> StorageResult<()>;
    async fn get_active_inventory_reservation_quantity(
        &self,
        tenant_id: &str,
        product_id: &str,
        variant_id: Option<&str>,
        now: DateTime<Utc>,
    ) -> StorageResult<i64>;
    /// Get total active reservation quantity, excluding reservations for a specific cart.
    /// Used for pre-checkout validation to show inventory reserved by OTHER carts.
    async fn get_active_inventory_reservation_quantity_excluding_cart(
        &self,
        tenant_id: &str,
        product_id: &str,
        variant_id: Option<&str>,
        exclude_cart_id: &str,
        now: DateTime<Utc>,
    ) -> StorageResult<i64>;
    async fn list_active_reservations_for_cart(
        &self,
        tenant_id: &str,
        cart_id: &str,
    ) -> StorageResult<Vec<InventoryReservation>>;
    async fn release_inventory_reservations(
        &self,
        tenant_id: &str,
        cart_id: &str,
        released_at: DateTime<Utc>,
    ) -> StorageResult<u64>;
    async fn convert_inventory_reservations(
        &self,
        tenant_id: &str,
        cart_id: &str,
        converted_at: DateTime<Utc>,
    ) -> StorageResult<u64>;
    /// Cleanup expired inventory reservations (admin operation across all tenants)
    async fn cleanup_expired_inventory_reservations(
        &self,
        now: DateTime<Utc>,
    ) -> StorageResult<u64>;

    // ─────────────────────────────────────────────────────────────────────────
    // Inventory adjustments
    // ─────────────────────────────────────────────────────────────────────────
    async fn record_inventory_adjustment(
        &self,
        adjustment: InventoryAdjustment,
    ) -> StorageResult<()>;
    async fn list_inventory_adjustments(
        &self,
        tenant_id: &str,
        product_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<InventoryAdjustment>>;

    /// Batch update inventory and record adjustments in a single operation.
    /// M-001 fix: Reduces N+1 queries for cart inventory updates.
    ///
    /// Takes a tenant_id and vector of (product_id, variant_id, delta) tuples.
    /// Returns a map of product_id -> (quantity_before, quantity_after) for successful updates.
    /// Failed updates (product not found, no inventory tracking) are omitted from results.
    ///
    /// This is an atomic operation - all updates succeed or all fail together.
    async fn update_inventory_batch(
        &self,
        tenant_id: &str,
        updates: Vec<(String, Option<String>, i32)>, // (product_id, variant_id, delta)
        reason: Option<&str>,
        actor: Option<&str>,
    ) -> StorageResult<HashMap<String, (i32, i32)>>;

    // ─────────────────────────────────────────────────────────────────────────
    // Shipping profiles + rates
    // ─────────────────────────────────────────────────────────────────────────
    async fn create_shipping_profile(&self, profile: ShippingProfile) -> StorageResult<()>;
    async fn update_shipping_profile(&self, profile: ShippingProfile) -> StorageResult<()>;
    async fn get_shipping_profile(
        &self,
        tenant_id: &str,
        profile_id: &str,
    ) -> StorageResult<Option<ShippingProfile>>;
    async fn list_shipping_profiles(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ShippingProfile>>;
    async fn delete_shipping_profile(&self, tenant_id: &str, profile_id: &str)
        -> StorageResult<()>;

    async fn create_shipping_rate(&self, rate: ShippingRate) -> StorageResult<()>;
    async fn update_shipping_rate(&self, rate: ShippingRate) -> StorageResult<()>;
    async fn list_shipping_rates(
        &self,
        tenant_id: &str,
        profile_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ShippingRate>>;
    async fn delete_shipping_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<()>;

    // ─────────────────────────────────────────────────────────────────────────
    // Tax rates
    // ─────────────────────────────────────────────────────────────────────────
    async fn create_tax_rate(&self, rate: TaxRate) -> StorageResult<()>;
    async fn update_tax_rate(&self, rate: TaxRate) -> StorageResult<()>;
    async fn get_tax_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<Option<TaxRate>>;
    async fn list_tax_rates(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<TaxRate>>;
    async fn delete_tax_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<()>;

    // ─────────────────────────────────────────────────────────────────────────
    // Customers
    // ─────────────────────────────────────────────────────────────────────────
    async fn create_customer(&self, customer: Customer) -> StorageResult<()>;
    async fn update_customer(&self, customer: Customer) -> StorageResult<()>;
    async fn get_customer(
        &self,
        tenant_id: &str,
        customer_id: &str,
    ) -> StorageResult<Option<Customer>>;
    async fn list_customers(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Customer>>;

    // ─────────────────────────────────────────────────────────────────────────
    // Disputes / chargebacks
    // ─────────────────────────────────────────────────────────────────────────
    async fn create_dispute(&self, dispute: DisputeRecord) -> StorageResult<()>;
    async fn update_dispute_status(
        &self,
        tenant_id: &str,
        dispute_id: &str,
        status: &str,
        status_updated_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()>;
    async fn get_dispute(
        &self,
        tenant_id: &str,
        dispute_id: &str,
    ) -> StorageResult<Option<DisputeRecord>>;
    async fn list_disputes(
        &self,
        tenant_id: &str,
        status: Option<&str>,
        source: Option<&str>,
        order_id: Option<&str>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<DisputeRecord>>;

    // ─────────────────────────────────────────────────────────────────────────
    // Gift cards
    // ─────────────────────────────────────────────────────────────────────────
    async fn create_gift_card(&self, card: GiftCard) -> StorageResult<()>;
    async fn update_gift_card(&self, card: GiftCard) -> StorageResult<()>;
    async fn get_gift_card(&self, tenant_id: &str, code: &str) -> StorageResult<Option<GiftCard>>;
    async fn list_gift_cards(
        &self,
        tenant_id: &str,
        active_only: Option<bool>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<GiftCard>>;
    async fn adjust_gift_card_balance(
        &self,
        tenant_id: &str,
        code: &str,
        new_balance: i64,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()>;

    /// Atomically deduct from gift card balance only if sufficient funds exist.
    /// SECURITY: Prevents race condition / over-redemption (H-001 fix).
    /// Returns Ok(Some(new_balance)) if successful, Ok(None) if insufficient funds.
    async fn try_adjust_gift_card_balance(
        &self,
        tenant_id: &str,
        code: &str,
        deduction: i64,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<Option<i64>>;

    // ─────────────────────────────────────────────────────────────────────────
    // Collections
    // ─────────────────────────────────────────────────────────────────────────
    async fn create_collection(&self, collection: Collection) -> StorageResult<()>;
    async fn update_collection(&self, collection: Collection) -> StorageResult<()>;
    async fn get_collection(
        &self,
        tenant_id: &str,
        collection_id: &str,
    ) -> StorageResult<Option<Collection>>;
    async fn list_collections(
        &self,
        tenant_id: &str,
        active_only: Option<bool>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Collection>>;
    async fn delete_collection(&self, tenant_id: &str, collection_id: &str) -> StorageResult<()>;

    async fn get_stripe_refund_request_by_charge_id(
        &self,
        tenant_id: &str,
        stripe_charge_id: &str,
    ) -> StorageResult<Option<StripeRefundRequest>>;

    // ─────────────────────────────────────────────────────────────────────────
    // Payments (replay protection)
    // Per spec (08-storage.md): All queries must filter by tenant_id
    // ─────────────────────────────────────────────────────────────────────────
    async fn record_payment(&self, tx: PaymentTransaction) -> StorageResult<()>;
    async fn record_payments(&self, txs: Vec<PaymentTransaction>) -> StorageResult<()>;
    /// Atomically try to record a payment, returning true if newly inserted.
    /// Returns false if payment with same signature already exists (prevents double-spend).
    /// This prevents TOCTOU race conditions in payment verification.
    async fn try_record_payment(&self, tx: PaymentTransaction) -> StorageResult<bool>;
    /// Delete a payment record by signature with tenant isolation (used for webhook idempotency).
    async fn delete_payment(&self, tenant_id: &str, signature: &str) -> StorageResult<()>;
    /// Check if payment has been processed with tenant isolation
    async fn has_payment_been_processed(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> StorageResult<bool>;
    /// Get payment by signature with tenant isolation
    async fn get_payment(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> StorageResult<Option<PaymentTransaction>>;
    /// Get purchase by signature with tenant isolation
    async fn get_purchase_by_signature(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> StorageResult<Option<Purchase>>;

    // ─────────────────────────────────────────────────────────────────────────
    // Credits holds
    // ─────────────────────────────────────────────────────────────────────────
    async fn store_credits_hold(&self, hold: CreditsHold) -> StorageResult<()>;
    async fn get_credits_hold(
        &self,
        tenant_id: &str,
        hold_id: &str,
    ) -> StorageResult<Option<CreditsHold>>;
    async fn delete_credits_hold(&self, tenant_id: &str, hold_id: &str) -> StorageResult<()>;
    /// Cleanup expired credits holds (admin operation across all tenants)
    async fn cleanup_expired_credits_holds(&self) -> StorageResult<u64>;

    /// List purchases for a given user_id with tenant isolation.
    async fn list_purchases_by_user_id(
        &self,
        tenant_id: &str,
        user_id: &str,
        limit: i64,
        offset: i64,
    ) -> StorageResult<Vec<Purchase>>;
    /// Check if wallet has valid access to resource with tenant isolation
    async fn has_valid_access(
        &self,
        tenant_id: &str,
        resource: &str,
        wallet: &str,
    ) -> StorageResult<bool>;
    /// Archive old payments (admin operation across all tenants)
    async fn archive_old_payments(&self, older_than: DateTime<Utc>) -> StorageResult<u64>;

    // ─────────────────────────────────────────────────────────────────────────
    // Admin nonces
    // Per spec (08-storage.md): All queries must filter by tenant_id
    // ─────────────────────────────────────────────────────────────────────────
    async fn create_nonce(&self, nonce: AdminNonce) -> StorageResult<()>;
    /// Get nonce by ID with tenant isolation
    async fn get_nonce(&self, tenant_id: &str, nonce_id: &str)
        -> StorageResult<Option<AdminNonce>>;
    /// Consume nonce with tenant isolation
    async fn consume_nonce(&self, tenant_id: &str, nonce_id: &str) -> StorageResult<()>;
    /// Cleanup expired nonces (admin operation across all tenants)
    async fn cleanup_expired_nonces(&self) -> StorageResult<u64>;

    // ─────────────────────────────────────────────────────────────────────────
    // Webhook queue
    // ─────────────────────────────────────────────────────────────────────────
    async fn enqueue_webhook(&self, webhook: PendingWebhook) -> StorageResult<String>;
    async fn dequeue_webhooks(&self, limit: i32) -> StorageResult<Vec<PendingWebhook>>;
    async fn mark_webhook_processing(&self, webhook_id: &str) -> StorageResult<()>;
    async fn mark_webhook_success(&self, webhook_id: &str) -> StorageResult<()>;
    async fn mark_webhook_failed(
        &self,
        webhook_id: &str,
        error: &str,
        next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()>;
    async fn mark_webhook_retry(
        &self,
        webhook_id: &str,
        error: &str,
        next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()>;
    async fn get_webhook(&self, webhook_id: &str) -> StorageResult<Option<PendingWebhook>>;
    async fn list_webhooks(
        &self,
        status: Option<WebhookStatus>,
        limit: i32,
    ) -> StorageResult<Vec<PendingWebhook>>;
    async fn retry_webhook(&self, webhook_id: &str) -> StorageResult<()>;
    async fn delete_webhook(&self, webhook_id: &str) -> StorageResult<()>;
    /// Cleanup old completed/failed webhooks older than retention_days
    async fn cleanup_old_webhooks(&self, retention_days: i32) -> StorageResult<u64>;

    // ─────────────────────────────────────────────────────────────────────────
    // Email queue
    // ─────────────────────────────────────────────────────────────────────────
    async fn enqueue_email(&self, email: PendingEmail) -> StorageResult<String>;
    async fn dequeue_emails(&self, limit: i32) -> StorageResult<Vec<PendingEmail>>;
    async fn mark_email_processing(&self, email_id: &str) -> StorageResult<()>;
    async fn mark_email_success(&self, email_id: &str) -> StorageResult<()>;
    async fn mark_email_retry(
        &self,
        email_id: &str,
        error: &str,
        next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()>;
    async fn mark_email_failed(&self, email_id: &str, error: &str) -> StorageResult<()>;
    async fn get_email(&self, email_id: &str) -> StorageResult<Option<PendingEmail>>;
    async fn cleanup_old_emails(&self, retention_days: i32) -> StorageResult<u64>;

    // ─────────────────────────────────────────────────────────────────────────
    // Idempotency
    // ─────────────────────────────────────────────────────────────────────────
    async fn save_idempotency_key(
        &self,
        key: &str,
        response: IdempotencyResponse,
        ttl: Duration,
    ) -> StorageResult<()>;

    /// Try to create an idempotency key if one does not already exist.
    ///
    /// Returns:
    /// - `Ok(true)` if the key was created (claim acquired)
    /// - `Ok(false)` if a non-expired key already exists
    ///
    /// Implementations should prefer an atomic insert-if-absent when possible.
    async fn try_save_idempotency_key(
        &self,
        key: &str,
        response: IdempotencyResponse,
        ttl: Duration,
    ) -> StorageResult<bool> {
        if self.get_idempotency_key(key).await?.is_some() {
            return Ok(false);
        }
        self.save_idempotency_key(key, response, ttl).await?;
        Ok(true)
    }
    async fn get_idempotency_key(&self, key: &str) -> StorageResult<Option<IdempotencyResponse>>;
    async fn delete_idempotency_key(&self, key: &str) -> StorageResult<()>;
    async fn cleanup_expired_idempotency_keys(&self) -> StorageResult<u64>;

    // ─────────────────────────────────────────────────────────────────────────
    // Subscriptions
    // Per spec (08-storage.md): All queries must filter by tenant_id
    // ─────────────────────────────────────────────────────────────────────────
    async fn save_subscription(&self, sub: Subscription) -> StorageResult<()>;
    /// Get subscription by ID with tenant isolation
    async fn get_subscription(
        &self,
        tenant_id: &str,
        id: &str,
    ) -> StorageResult<Option<Subscription>>;
    /// Get subscription by wallet and product with tenant isolation
    async fn get_subscription_by_wallet(
        &self,
        tenant_id: &str,
        wallet: &str,
        product_id: &str,
    ) -> StorageResult<Option<Subscription>>;
    /// Get all subscriptions for wallet with tenant isolation
    async fn get_subscriptions_by_wallet(
        &self,
        tenant_id: &str,
        wallet: &str,
    ) -> StorageResult<Vec<Subscription>>;
    /// Get subscription by Stripe ID with tenant isolation
    async fn get_subscription_by_stripe_id(
        &self,
        tenant_id: &str,
        stripe_sub_id: &str,
    ) -> StorageResult<Option<Subscription>>;
    /// Get subscription by payment signature with tenant isolation.
    /// Used for idempotency - prevents duplicate subscriptions for the same payment (H-004).
    async fn get_subscription_by_payment_signature(
        &self,
        tenant_id: &str,
        payment_signature: &str,
    ) -> StorageResult<Option<Subscription>>;
    /// Find subscription by Stripe ID across all tenants (for webhook handling)
    /// Note: This bypasses tenant isolation because Stripe webhooks don't include tenant context.
    /// Stripe subscription IDs are globally unique, so this is safe.
    async fn find_subscription_by_stripe_id(
        &self,
        stripe_sub_id: &str,
    ) -> StorageResult<Option<Subscription>>;
    /// List active subscriptions with tenant isolation
    async fn list_active_subscriptions(
        &self,
        tenant_id: &str,
        product_id: Option<&str>,
    ) -> StorageResult<Vec<Subscription>>;
    /// List expiring subscriptions with tenant isolation
    async fn list_expiring_subscriptions(
        &self,
        tenant_id: &str,
        before: DateTime<Utc>,
    ) -> StorageResult<Vec<Subscription>>;

    /// List expiring *local* subscriptions (x402/credits) eligible for expiry.
    ///
    /// This is used by background expiry jobs to avoid loading unbounded result sets.
    /// Default implementation falls back to filtering the full list.
    async fn list_expiring_local_subscriptions_limited(
        &self,
        tenant_id: &str,
        before: DateTime<Utc>,
        limit: i64,
    ) -> StorageResult<Vec<Subscription>> {
        let mut subs = self.list_expiring_subscriptions(tenant_id, before).await?;
        subs.retain(|s| {
            matches!(
                s.payment_method,
                PaymentMethod::X402 | PaymentMethod::Credits
            ) && s.status == SubscriptionStatus::Active
        });
        if limit > 0 {
            subs.truncate(limit as usize);
        }
        Ok(subs)
    }
    /// Update subscription status with tenant isolation
    async fn update_subscription_status(
        &self,
        tenant_id: &str,
        id: &str,
        status: SubscriptionStatus,
    ) -> StorageResult<()>;

    /// Update multiple subscription statuses with tenant isolation.
    ///
    /// Default implementation falls back to per-row updates; storage backends
    /// can override with a batch implementation.
    async fn update_subscription_statuses(
        &self,
        tenant_id: &str,
        ids: &[String],
        status: SubscriptionStatus,
    ) -> StorageResult<()> {
        for id in ids {
            self.update_subscription_status(tenant_id, id, status.clone())
                .await?;
        }
        Ok(())
    }
    /// Soft delete subscription (sets status to cancelled) with tenant isolation
    /// Per spec (08-storage.md line 143): Delete(ctx, id) - Soft delete (set status=cancelled)
    async fn delete_subscription(&self, tenant_id: &str, id: &str) -> StorageResult<()>;
    /// Get subscriptions by Stripe customer ID with tenant isolation
    async fn get_subscriptions_by_stripe_customer_id(
        &self,
        tenant_id: &str,
        customer_id: &str,
    ) -> StorageResult<Vec<Subscription>>;
    /// List subscriptions by product with tenant isolation
    async fn list_subscriptions_by_product(
        &self,
        tenant_id: &str,
        product_id: &str,
    ) -> StorageResult<Vec<Subscription>>;

    /// Count non-cancelled subscriptions by plan_id (for inventory tracking)
    async fn count_subscriptions_by_plan(
        &self,
        tenant_id: &str,
        plan_id: &str,
    ) -> StorageResult<i64>;

    /// List tenant IDs with subscriptions (for background workers)
    async fn list_tenant_ids(&self) -> StorageResult<Vec<String>>;

    // ─────────────────────────────────────────────────────────────────────────
    // Dead Letter Queue
    // ─────────────────────────────────────────────────────────────────────────
    async fn move_to_dlq(&self, webhook: PendingWebhook, final_error: &str) -> StorageResult<()>;
    async fn list_dlq(&self, limit: i32) -> StorageResult<Vec<DlqWebhook>>;
    async fn retry_from_dlq(&self, dlq_id: &str) -> StorageResult<()>;
    async fn delete_from_dlq(&self, dlq_id: &str) -> StorageResult<()>;

    // ─────────────────────────────────────────────────────────────────────────
    // Admin Dashboard
    // ─────────────────────────────────────────────────────────────────────────
    /// Get admin dashboard statistics
    async fn get_admin_stats(&self, tenant_id: &str) -> StorageResult<AdminStats>;

    /// List purchases for admin dashboard with optional method filter
    async fn list_purchases(
        &self,
        tenant_id: &str,
        method: Option<&str>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Purchase>>;

    // ─────────────────────────────────────────────────────────────────────────
    // Chat sessions (site chat)
    // ─────────────────────────────────────────────────────────────────────────
    async fn create_chat_session(&self, session: ChatSession) -> StorageResult<()>;
    async fn get_chat_session(
        &self,
        tenant_id: &str,
        session_id: &str,
    ) -> StorageResult<Option<ChatSession>>;
    async fn update_chat_session(
        &self,
        tenant_id: &str,
        session_id: &str,
        message_count: i32,
        last_message_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()>;
    async fn list_chat_sessions(
        &self,
        tenant_id: &str,
        customer_id: Option<&str>,
        status: Option<&str>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<ChatSession>, i64)>;

    // ─────────────────────────────────────────────────────────────────────────
    // Chat messages
    // ─────────────────────────────────────────────────────────────────────────
    async fn create_chat_message(&self, message: ChatMessage) -> StorageResult<()>;
    async fn list_chat_messages(
        &self,
        tenant_id: &str,
        session_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ChatMessage>>;

    // ─────────────────────────────────────────────────────────────────────────
    // FAQs (knowledge base)
    // ─────────────────────────────────────────────────────────────────────────
    async fn create_faq(&self, faq: Faq) -> StorageResult<()>;
    async fn get_faq(&self, tenant_id: &str, faq_id: &str) -> StorageResult<Option<Faq>>;
    async fn update_faq(&self, faq: Faq) -> StorageResult<()>;
    async fn delete_faq(&self, tenant_id: &str, faq_id: &str) -> StorageResult<()>;
    async fn list_faqs(
        &self,
        tenant_id: &str,
        active_only: bool,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<Faq>, i64)>;
    /// Search FAQs by keyword or text query (for chat AI, uses use_in_chat filter)
    async fn search_faqs(
        &self,
        tenant_id: &str,
        query: &str,
        limit: i32,
    ) -> StorageResult<Vec<Faq>>;
    /// List FAQs for public display (active + display_on_page)
    async fn list_public_faqs(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<Faq>, i64)>;

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────
    async fn close(&self) -> StorageResult<()>;

    /// Per spec (14-observability.md): Database health check (ping)
    async fn health_check(&self) -> StorageResult<()>;

    fn as_any(&self) -> &dyn Any;
}
