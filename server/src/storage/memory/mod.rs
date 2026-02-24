//! In-memory storage implementation for development and testing ONLY.
//!
//! The `impl Store for InMemoryStore` block delegates every method to
//! domain-focused sub-modules (cart, refunds, orders, …).
//!
//! **WARNING**: This store does NOT persist data. All data is lost on restart.
//! Do NOT use in production - use PostgresStore instead.

use std::collections::{HashMap, HashSet};
#[cfg(test)]
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration as StdDuration, Instant};

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use parking_lot::Mutex;

use crate::models::StripeRefundRequest;
use crate::models::{
    CartQuote, ChatMessage, ChatSession, Collection, Customer, DisputeRecord, Faq, Fulfillment,
    GiftCard, InventoryAdjustment, InventoryReservation, Order, OrderHistoryEntry,
    PaymentTransaction, RefundQuote, ReturnRequest, Subscription, SubscriptionStatus, TaxRate,
};
use crate::storage::{
    AdminNonce, AdminStats, CreditsHold, DlqWebhook, EmailStatus, IdempotencyResponse,
    PendingEmail, PendingWebhook, Purchase, StorageError, StorageResult, Store, WebhookStatus,
};

// C-02: to_chrono_duration moved to crate::services::paywall::types
pub(crate) use crate::services::paywall::types::to_chrono_duration;

mod admin;
mod cart;
mod catalog;
mod chat;
mod customers;
mod faqs;
mod inventory;
mod orders;
mod payments;
mod refunds;
mod shipping;
mod subscriptions;
mod webhooks;

/// Type alias for idempotency cache entries
type IdempotencyCache = HashMap<String, (IdempotencyResponse, Instant, StdDuration)>;

pub(super) fn tenant_key(tenant_id: &str, id: &str) -> String {
    format!("{}:{}", tenant_id, id)
}

/// In-memory storage implementation for development and testing ONLY.
///
/// **WARNING**: This store does NOT persist data. All data is lost on restart.
/// Do NOT use in production - use PostgresStore or MongoStore instead.
///
/// Per spec (08-storage.md): All queries filter by tenant_id for multi-tenant isolation
#[derive(Clone)]
pub struct InMemoryStore {
    pub(super) carts: Arc<Mutex<HashMap<String, CartQuote>>>,
    pub(super) refunds: Arc<Mutex<HashMap<String, RefundQuote>>>,
    pub(super) stripe_refund_requests: Arc<Mutex<HashMap<String, StripeRefundRequest>>>,
    pub(super) orders: Arc<Mutex<HashMap<String, Order>>>,
    pub(super) order_history: Arc<Mutex<HashMap<String, Vec<OrderHistoryEntry>>>>,
    pub(super) fulfillments: Arc<Mutex<HashMap<String, Fulfillment>>>,
    pub(super) returns: Arc<Mutex<HashMap<String, ReturnRequest>>>,
    pub(super) inventory_reservations: Arc<Mutex<HashMap<String, InventoryReservation>>>,
    pub(super) inventory_adjustments: Arc<Mutex<HashMap<String, InventoryAdjustment>>>,
    pub(super) shipping_profiles: Arc<Mutex<HashMap<String, crate::models::ShippingProfile>>>,
    pub(super) shipping_rates: Arc<Mutex<HashMap<String, crate::models::ShippingRate>>>,
    pub(super) tax_rates: Arc<Mutex<HashMap<String, TaxRate>>>,
    pub(super) customers: Arc<Mutex<HashMap<String, Customer>>>,
    pub(super) disputes: Arc<Mutex<HashMap<String, DisputeRecord>>>,
    pub(super) gift_cards: Arc<Mutex<HashMap<String, GiftCard>>>,
    pub(super) collections: Arc<Mutex<HashMap<String, Collection>>>,
    pub(super) payments: Arc<Mutex<HashMap<String, PaymentTransaction>>>,
    pub(super) nonces: Arc<Mutex<HashMap<String, AdminNonce>>>,
    pub(super) webhooks: Arc<Mutex<HashMap<String, PendingWebhook>>>,
    pub(super) emails: Arc<Mutex<HashMap<String, PendingEmail>>>,
    pub(super) dlq: Arc<Mutex<HashMap<String, DlqWebhook>>>,
    pub(super) idempotency: Arc<Mutex<IdempotencyCache>>,
    pub(super) subscriptions: Arc<Mutex<HashMap<String, Subscription>>>,
    pub(super) credits_holds: Arc<Mutex<HashMap<String, CreditsHold>>>,
    pub(super) chat_sessions: Arc<Mutex<HashMap<String, ChatSession>>>,
    pub(super) chat_messages: Arc<Mutex<HashMap<String, ChatMessage>>>,
    pub(super) faqs: Arc<Mutex<HashMap<String, Faq>>>,
    #[cfg(test)]
    pub(super) fail_try_store_order: Arc<AtomicBool>,
    #[cfg(test)]
    pub(super) fail_store_cart_quote: Arc<AtomicBool>,
    #[cfg(test)]
    pub(super) fail_reserve_inventory: Arc<AtomicBool>,
    #[cfg(test)]
    pub(super) release_inventory_calls: Arc<AtomicUsize>,
    /// Test-only: inventory levels for products (tenant_id:product_id -> quantity)
    #[cfg(test)]
    pub(super) product_inventory: Arc<Mutex<HashMap<String, i32>>>,
}

impl Default for InMemoryStore {
    fn default() -> Self {
        Self::new()
    }
}

impl InMemoryStore {
    pub fn new() -> Self {
        // Log a warning to alert users that in-memory storage should not be used in production
        tracing::warn!(
            "⚠️  InMemoryStore initialized - data will NOT be persisted! \
             Use PostgresStore or MongoStore for production deployments."
        );

        Self {
            carts: Arc::new(Mutex::new(HashMap::new())),
            refunds: Arc::new(Mutex::new(HashMap::new())),
            stripe_refund_requests: Arc::new(Mutex::new(HashMap::new())),
            orders: Arc::new(Mutex::new(HashMap::new())),
            order_history: Arc::new(Mutex::new(HashMap::new())),
            fulfillments: Arc::new(Mutex::new(HashMap::new())),
            returns: Arc::new(Mutex::new(HashMap::new())),
            inventory_reservations: Arc::new(Mutex::new(HashMap::new())),
            inventory_adjustments: Arc::new(Mutex::new(HashMap::new())),
            shipping_profiles: Arc::new(Mutex::new(HashMap::new())),
            shipping_rates: Arc::new(Mutex::new(HashMap::new())),
            tax_rates: Arc::new(Mutex::new(HashMap::new())),
            customers: Arc::new(Mutex::new(HashMap::new())),
            disputes: Arc::new(Mutex::new(HashMap::new())),
            gift_cards: Arc::new(Mutex::new(HashMap::new())),
            collections: Arc::new(Mutex::new(HashMap::new())),
            payments: Arc::new(Mutex::new(HashMap::new())),
            nonces: Arc::new(Mutex::new(HashMap::new())),
            webhooks: Arc::new(Mutex::new(HashMap::new())),
            emails: Arc::new(Mutex::new(HashMap::new())),
            dlq: Arc::new(Mutex::new(HashMap::new())),
            idempotency: Arc::new(Mutex::new(HashMap::new())),
            subscriptions: Arc::new(Mutex::new(HashMap::new())),
            credits_holds: Arc::new(Mutex::new(HashMap::new())),
            chat_sessions: Arc::new(Mutex::new(HashMap::new())),
            chat_messages: Arc::new(Mutex::new(HashMap::new())),
            faqs: Arc::new(Mutex::new(HashMap::new())),
            #[cfg(test)]
            fail_try_store_order: Arc::new(AtomicBool::new(false)),
            #[cfg(test)]
            fail_store_cart_quote: Arc::new(AtomicBool::new(false)),
            #[cfg(test)]
            fail_reserve_inventory: Arc::new(AtomicBool::new(false)),
            #[cfg(test)]
            release_inventory_calls: Arc::new(AtomicUsize::new(0)),
            #[cfg(test)]
            product_inventory: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    #[cfg(test)]
    pub fn set_fail_try_store_order(&self, fail: bool) {
        self.fail_try_store_order.store(fail, Ordering::SeqCst);
    }

    #[cfg(test)]
    pub fn set_fail_store_cart_quote(&self, fail: bool) {
        self.fail_store_cart_quote.store(fail, Ordering::SeqCst);
    }

    #[cfg(test)]
    pub fn set_fail_reserve_inventory(&self, fail: bool) {
        self.fail_reserve_inventory.store(fail, Ordering::SeqCst);
    }

    #[cfg(test)]
    pub fn release_inventory_call_count(&self) -> usize {
        self.release_inventory_calls.load(Ordering::SeqCst)
    }

    /// Set inventory quantity for a product (test-only)
    #[cfg(test)]
    pub fn set_product_inventory(&self, tenant_id: &str, product_id: &str, quantity: i32) {
        let key = format!("{}:{}", tenant_id, product_id);
        self.product_inventory.lock().insert(key, quantity);
    }
}

// ---------------------------------------------------------------------------
// Store trait implementation — delegates to domain-specific sub-modules.
// ---------------------------------------------------------------------------
#[async_trait]
impl Store for InMemoryStore {
    // ─── Cart quotes ────────────────────────────────────────────────────────
    async fn store_cart_quote(&self, quote: CartQuote) -> StorageResult<()> {
        cart::store_cart_quote(self, quote).await
    }
    async fn store_cart_quotes(&self, quotes: Vec<CartQuote>) -> StorageResult<()> {
        cart::store_cart_quotes(self, quotes).await
    }
    async fn get_cart_quote(
        &self,
        tenant_id: &str,
        cart_id: &str,
    ) -> StorageResult<Option<CartQuote>> {
        cart::get_cart_quote(self, tenant_id, cart_id).await
    }
    async fn get_cart_quotes(
        &self,
        tenant_id: &str,
        cart_ids: &[String],
    ) -> StorageResult<Vec<CartQuote>> {
        cart::get_cart_quotes(self, tenant_id, cart_ids).await
    }
    async fn mark_cart_paid(
        &self,
        tenant_id: &str,
        cart_id: &str,
        wallet: &str,
    ) -> StorageResult<()> {
        cart::mark_cart_paid(self, tenant_id, cart_id, wallet).await
    }
    async fn has_cart_access(
        &self,
        tenant_id: &str,
        cart_id: &str,
        wallet: &str,
    ) -> StorageResult<bool> {
        cart::has_cart_access(self, tenant_id, cart_id, wallet).await
    }
    async fn cleanup_expired_cart_quotes(&self) -> StorageResult<u64> {
        cart::cleanup_expired_cart_quotes(self).await
    }

    // ─── Refunds ────────────────────────────────────────────────────────────
    async fn store_refund_quote(&self, quote: RefundQuote) -> StorageResult<()> {
        refunds::store_refund_quote(self, quote).await
    }
    async fn store_refund_quotes(&self, quotes: Vec<RefundQuote>) -> StorageResult<()> {
        refunds::store_refund_quotes(self, quotes).await
    }
    async fn get_refund_quote(
        &self,
        tenant_id: &str,
        refund_id: &str,
    ) -> StorageResult<Option<RefundQuote>> {
        refunds::get_refund_quote(self, tenant_id, refund_id).await
    }
    async fn get_refund_by_original_purchase_id(
        &self,
        tenant_id: &str,
        original_purchase_id: &str,
    ) -> StorageResult<Option<RefundQuote>> {
        refunds::get_refund_by_original_purchase_id(self, tenant_id, original_purchase_id).await
    }
    async fn get_all_refunds_for_purchase(
        &self,
        tenant_id: &str,
        original_purchase_id: &str,
    ) -> StorageResult<Vec<RefundQuote>> {
        refunds::get_all_refunds_for_purchase(self, tenant_id, original_purchase_id).await
    }
    async fn list_pending_refunds(
        &self,
        tenant_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<RefundQuote>> {
        refunds::list_pending_refunds(self, tenant_id, limit).await
    }
    async fn list_credits_refund_requests(
        &self,
        tenant_id: &str,
        status: Option<&str>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<RefundQuote>, i64)> {
        refunds::list_credits_refund_requests(self, tenant_id, status, limit, offset).await
    }
    async fn mark_refund_processed(
        &self,
        tenant_id: &str,
        refund_id: &str,
        processed_by: &str,
        signature: &str,
    ) -> StorageResult<()> {
        refunds::mark_refund_processed(self, tenant_id, refund_id, processed_by, signature).await
    }
    async fn delete_refund_quote(&self, tenant_id: &str, refund_id: &str) -> StorageResult<()> {
        refunds::delete_refund_quote(self, tenant_id, refund_id).await
    }
    async fn cleanup_expired_refund_quotes(&self) -> StorageResult<u64> {
        refunds::cleanup_expired_refund_quotes(self).await
    }
    async fn store_stripe_refund_request(&self, req: StripeRefundRequest) -> StorageResult<()> {
        refunds::store_stripe_refund_request(self, req).await
    }
    async fn get_stripe_refund_request(
        &self,
        tenant_id: &str,
        request_id: &str,
    ) -> StorageResult<Option<StripeRefundRequest>> {
        refunds::get_stripe_refund_request(self, tenant_id, request_id).await
    }
    async fn list_pending_stripe_refund_requests(
        &self,
        tenant_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<StripeRefundRequest>> {
        refunds::list_pending_stripe_refund_requests(self, tenant_id, limit).await
    }
    async fn get_pending_stripe_refund_request_by_original_purchase_id(
        &self,
        tenant_id: &str,
        original_purchase_id: &str,
    ) -> StorageResult<Option<StripeRefundRequest>> {
        refunds::get_pending_stripe_refund_request_by_original_purchase_id(
            self,
            tenant_id,
            original_purchase_id,
        )
        .await
    }
    async fn get_stripe_refund_request_by_charge_id(
        &self,
        tenant_id: &str,
        stripe_charge_id: &str,
    ) -> StorageResult<Option<StripeRefundRequest>> {
        refunds::get_stripe_refund_request_by_charge_id(self, tenant_id, stripe_charge_id).await
    }

    // ─── Orders ─────────────────────────────────────────────────────────────
    async fn try_store_order(&self, order: Order) -> StorageResult<bool> {
        orders::try_store_order(self, order).await
    }
    async fn get_order(&self, tenant_id: &str, order_id: &str) -> StorageResult<Option<Order>> {
        orders::get_order(self, tenant_id, order_id).await
    }
    async fn list_orders(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Order>> {
        orders::list_orders(self, tenant_id, limit, offset).await
    }
    async fn list_orders_filtered(
        &self,
        tenant_id: &str,
        status: Option<&str>,
        search: Option<&str>,
        created_before: Option<DateTime<Utc>>,
        created_after: Option<DateTime<Utc>>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<Order>, i64)> {
        orders::list_orders_filtered(
            self,
            tenant_id,
            status,
            search,
            created_before,
            created_after,
            limit,
            offset,
        )
        .await
    }
    async fn update_order_status(
        &self,
        tenant_id: &str,
        order_id: &str,
        status: &str,
        status_updated_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        orders::update_order_status(
            self,
            tenant_id,
            order_id,
            status,
            status_updated_at,
            updated_at,
        )
        .await
    }
    async fn append_order_history(&self, entry: OrderHistoryEntry) -> StorageResult<()> {
        orders::append_order_history(self, entry).await
    }
    async fn update_order_status_with_history(
        &self,
        tenant_id: &str,
        order_id: &str,
        status: &str,
        status_updated_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
        entry: OrderHistoryEntry,
    ) -> StorageResult<()> {
        // InMemoryStore: no real transactions, just run sequentially
        orders::update_order_status(
            self,
            tenant_id,
            order_id,
            status,
            status_updated_at,
            updated_at,
        )
        .await?;
        orders::append_order_history(self, entry).await
    }
    async fn list_order_history(
        &self,
        tenant_id: &str,
        order_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<OrderHistoryEntry>> {
        orders::list_order_history(self, tenant_id, order_id, limit).await
    }
    async fn create_fulfillment(&self, fulfillment: Fulfillment) -> StorageResult<()> {
        orders::create_fulfillment(self, fulfillment).await
    }
    async fn get_fulfillment(
        &self,
        tenant_id: &str,
        fulfillment_id: &str,
    ) -> StorageResult<Option<Fulfillment>> {
        orders::get_fulfillment(self, tenant_id, fulfillment_id).await
    }
    async fn list_fulfillments(
        &self,
        tenant_id: &str,
        order_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<Fulfillment>> {
        orders::list_fulfillments(self, tenant_id, order_id, limit).await
    }
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
    ) -> StorageResult<Option<Fulfillment>> {
        orders::update_fulfillment_status(
            self,
            tenant_id,
            fulfillment_id,
            status,
            shipped_at,
            delivered_at,
            updated_at,
            tracking_number,
            tracking_url,
            carrier,
        )
        .await
    }
    async fn create_return_request(&self, request: ReturnRequest) -> StorageResult<()> {
        orders::create_return_request(self, request).await
    }
    async fn update_return_status(
        &self,
        tenant_id: &str,
        return_id: &str,
        status: &str,
        status_updated_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        orders::update_return_status(
            self,
            tenant_id,
            return_id,
            status,
            status_updated_at,
            updated_at,
        )
        .await
    }
    async fn get_return_request(
        &self,
        tenant_id: &str,
        return_id: &str,
    ) -> StorageResult<Option<ReturnRequest>> {
        orders::get_return_request(self, tenant_id, return_id).await
    }
    async fn list_return_requests(
        &self,
        tenant_id: &str,
        status: Option<&str>,
        order_id: Option<&str>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ReturnRequest>> {
        orders::list_return_requests(self, tenant_id, status, order_id, limit, offset).await
    }

    // ─── Inventory ──────────────────────────────────────────────────────────
    async fn reserve_inventory(&self, reservation: InventoryReservation) -> StorageResult<()> {
        inventory::reserve_inventory(self, reservation).await
    }
    async fn get_active_inventory_reservation_quantity(
        &self,
        tenant_id: &str,
        product_id: &str,
        variant_id: Option<&str>,
        now: DateTime<Utc>,
    ) -> StorageResult<i64> {
        inventory::get_active_inventory_reservation_quantity(
            self, tenant_id, product_id, variant_id, now,
        )
        .await
    }
    async fn get_active_inventory_reservation_quantity_excluding_cart(
        &self,
        tenant_id: &str,
        product_id: &str,
        variant_id: Option<&str>,
        exclude_cart_id: &str,
        now: DateTime<Utc>,
    ) -> StorageResult<i64> {
        inventory::get_active_inventory_reservation_quantity_excluding_cart(
            self,
            tenant_id,
            product_id,
            variant_id,
            exclude_cart_id,
            now,
        )
        .await
    }
    async fn list_active_reservations_for_cart(
        &self,
        tenant_id: &str,
        cart_id: &str,
    ) -> StorageResult<Vec<InventoryReservation>> {
        inventory::list_active_reservations_for_cart(self, tenant_id, cart_id).await
    }
    async fn release_inventory_reservations(
        &self,
        tenant_id: &str,
        cart_id: &str,
        released_at: DateTime<Utc>,
    ) -> StorageResult<u64> {
        inventory::release_inventory_reservations(self, tenant_id, cart_id, released_at).await
    }
    async fn convert_inventory_reservations(
        &self,
        tenant_id: &str,
        cart_id: &str,
        converted_at: DateTime<Utc>,
    ) -> StorageResult<u64> {
        inventory::convert_inventory_reservations(self, tenant_id, cart_id, converted_at).await
    }
    async fn cleanup_expired_inventory_reservations(
        &self,
        now: DateTime<Utc>,
    ) -> StorageResult<u64> {
        inventory::cleanup_expired_inventory_reservations(self, now).await
    }
    async fn record_inventory_adjustment(
        &self,
        adjustment: InventoryAdjustment,
    ) -> StorageResult<()> {
        inventory::record_inventory_adjustment(self, adjustment).await
    }
    async fn list_inventory_adjustments(
        &self,
        tenant_id: &str,
        product_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<InventoryAdjustment>> {
        inventory::list_inventory_adjustments(self, tenant_id, product_id, limit, offset).await
    }
    async fn update_inventory_batch(
        &self,
        tenant_id: &str,
        updates: Vec<(String, Option<String>, i32)>,
        reason: Option<&str>,
        actor: Option<&str>,
    ) -> StorageResult<HashMap<String, (i32, i32)>> {
        inventory::update_inventory_batch(self, tenant_id, updates, reason, actor).await
    }
    async fn adjust_inventory_atomic(
        &self,
        tenant_id: &str,
        product_id: &str,
        delta: i32,
    ) -> StorageResult<(i32, i32)> {
        inventory::adjust_inventory_atomic(self, tenant_id, product_id, delta).await
    }

    // ─── Shipping & Tax ─────────────────────────────────────────────────────
    async fn create_shipping_profile(
        &self,
        profile: crate::models::ShippingProfile,
    ) -> StorageResult<()> {
        shipping::create_shipping_profile(self, profile).await
    }
    async fn update_shipping_profile(
        &self,
        profile: crate::models::ShippingProfile,
    ) -> StorageResult<()> {
        shipping::update_shipping_profile(self, profile).await
    }
    async fn get_shipping_profile(
        &self,
        tenant_id: &str,
        profile_id: &str,
    ) -> StorageResult<Option<crate::models::ShippingProfile>> {
        shipping::get_shipping_profile(self, tenant_id, profile_id).await
    }
    async fn list_shipping_profiles(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<crate::models::ShippingProfile>> {
        shipping::list_shipping_profiles(self, tenant_id, limit, offset).await
    }
    async fn delete_shipping_profile(
        &self,
        tenant_id: &str,
        profile_id: &str,
    ) -> StorageResult<()> {
        shipping::delete_shipping_profile(self, tenant_id, profile_id).await
    }
    async fn create_shipping_rate(&self, rate: crate::models::ShippingRate) -> StorageResult<()> {
        shipping::create_shipping_rate(self, rate).await
    }
    async fn update_shipping_rate(&self, rate: crate::models::ShippingRate) -> StorageResult<()> {
        shipping::update_shipping_rate(self, rate).await
    }
    async fn list_shipping_rates(
        &self,
        tenant_id: &str,
        profile_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<crate::models::ShippingRate>> {
        shipping::list_shipping_rates(self, tenant_id, profile_id, limit, offset).await
    }
    async fn delete_shipping_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<()> {
        shipping::delete_shipping_rate(self, tenant_id, rate_id).await
    }
    async fn create_tax_rate(&self, rate: TaxRate) -> StorageResult<()> {
        shipping::create_tax_rate(self, rate).await
    }
    async fn update_tax_rate(&self, rate: TaxRate) -> StorageResult<()> {
        shipping::update_tax_rate(self, rate).await
    }
    async fn get_tax_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<Option<TaxRate>> {
        shipping::get_tax_rate(self, tenant_id, rate_id).await
    }
    async fn list_tax_rates(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<TaxRate>> {
        shipping::list_tax_rates(self, tenant_id, limit, offset).await
    }
    async fn delete_tax_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<()> {
        shipping::delete_tax_rate(self, tenant_id, rate_id).await
    }

    // ─── Customers & Disputes ───────────────────────────────────────────────
    async fn create_customer(&self, customer: Customer) -> StorageResult<()> {
        customers::create_customer(self, customer).await
    }
    async fn update_customer(&self, customer: Customer) -> StorageResult<()> {
        customers::update_customer(self, customer).await
    }
    async fn get_customer(
        &self,
        tenant_id: &str,
        customer_id: &str,
    ) -> StorageResult<Option<Customer>> {
        customers::get_customer(self, tenant_id, customer_id).await
    }
    async fn list_customers(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Customer>> {
        customers::list_customers(self, tenant_id, limit, offset).await
    }
    async fn create_dispute(&self, dispute: DisputeRecord) -> StorageResult<()> {
        customers::create_dispute(self, dispute).await
    }
    async fn update_dispute_status(
        &self,
        tenant_id: &str,
        dispute_id: &str,
        status: &str,
        status_updated_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        customers::update_dispute_status(
            self,
            tenant_id,
            dispute_id,
            status,
            status_updated_at,
            updated_at,
        )
        .await
    }
    async fn get_dispute(
        &self,
        tenant_id: &str,
        dispute_id: &str,
    ) -> StorageResult<Option<DisputeRecord>> {
        customers::get_dispute(self, tenant_id, dispute_id).await
    }
    async fn list_disputes(
        &self,
        tenant_id: &str,
        status: Option<&str>,
        source: Option<&str>,
        order_id: Option<&str>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<DisputeRecord>> {
        customers::list_disputes(self, tenant_id, status, source, order_id, limit, offset).await
    }

    // ─── Catalog (gift cards + collections) ─────────────────────────────────
    async fn create_gift_card(&self, card: GiftCard) -> StorageResult<()> {
        catalog::create_gift_card(self, card).await
    }
    async fn update_gift_card(&self, card: GiftCard) -> StorageResult<()> {
        catalog::update_gift_card(self, card).await
    }
    async fn get_gift_card(&self, tenant_id: &str, code: &str) -> StorageResult<Option<GiftCard>> {
        catalog::get_gift_card(self, tenant_id, code).await
    }
    async fn list_gift_cards(
        &self,
        tenant_id: &str,
        active_only: Option<bool>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<GiftCard>> {
        catalog::list_gift_cards(self, tenant_id, active_only, limit, offset).await
    }
    async fn adjust_gift_card_balance(
        &self,
        tenant_id: &str,
        code: &str,
        new_balance: i64,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        catalog::adjust_gift_card_balance(self, tenant_id, code, new_balance, updated_at).await
    }
    async fn try_adjust_gift_card_balance(
        &self,
        tenant_id: &str,
        code: &str,
        deduction: i64,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<Option<i64>> {
        catalog::try_adjust_gift_card_balance(self, tenant_id, code, deduction, updated_at).await
    }
    async fn create_collection(&self, collection: Collection) -> StorageResult<()> {
        catalog::create_collection(self, collection).await
    }
    async fn update_collection(&self, collection: Collection) -> StorageResult<()> {
        catalog::update_collection(self, collection).await
    }
    async fn get_collection(
        &self,
        tenant_id: &str,
        collection_id: &str,
    ) -> StorageResult<Option<Collection>> {
        catalog::get_collection(self, tenant_id, collection_id).await
    }
    async fn list_collections(
        &self,
        tenant_id: &str,
        active_only: Option<bool>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Collection>> {
        catalog::list_collections(self, tenant_id, active_only, limit, offset).await
    }
    async fn delete_collection(&self, tenant_id: &str, collection_id: &str) -> StorageResult<()> {
        catalog::delete_collection(self, tenant_id, collection_id).await
    }

    // ─── Payments ───────────────────────────────────────────────────────────
    async fn record_payment(&self, tx: PaymentTransaction) -> StorageResult<()> {
        payments::record_payment(self, tx).await
    }
    async fn record_payments(&self, txs: Vec<PaymentTransaction>) -> StorageResult<()> {
        payments::record_payments(self, txs).await
    }
    async fn try_record_payment(&self, tx: PaymentTransaction) -> StorageResult<bool> {
        payments::try_record_payment(self, tx).await
    }
    async fn delete_payment(&self, tenant_id: &str, signature: &str) -> StorageResult<()> {
        payments::delete_payment(self, tenant_id, signature).await
    }
    async fn has_payment_been_processed(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> StorageResult<bool> {
        payments::has_payment_been_processed(self, tenant_id, signature).await
    }
    async fn get_payment(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> StorageResult<Option<PaymentTransaction>> {
        payments::get_payment(self, tenant_id, signature).await
    }
    async fn has_valid_access(
        &self,
        tenant_id: &str,
        resource: &str,
        wallet: &str,
    ) -> StorageResult<bool> {
        payments::has_valid_access(self, tenant_id, resource, wallet).await
    }
    async fn archive_old_payments(&self, older_than: DateTime<Utc>) -> StorageResult<u64> {
        payments::archive_old_payments(self, older_than).await
    }
    async fn get_purchase_by_signature(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> StorageResult<Option<Purchase>> {
        payments::get_purchase_by_signature(self, tenant_id, signature).await
    }
    async fn store_credits_hold(&self, hold: CreditsHold) -> StorageResult<()> {
        payments::store_credits_hold(self, hold).await
    }
    async fn get_credits_hold(
        &self,
        tenant_id: &str,
        hold_id: &str,
    ) -> StorageResult<Option<CreditsHold>> {
        payments::get_credits_hold(self, tenant_id, hold_id).await
    }
    async fn delete_credits_hold(&self, tenant_id: &str, hold_id: &str) -> StorageResult<()> {
        payments::delete_credits_hold(self, tenant_id, hold_id).await
    }
    async fn cleanup_expired_credits_holds(&self) -> StorageResult<u64> {
        payments::cleanup_expired_credits_holds(self).await
    }
    async fn list_purchases_by_user_id(
        &self,
        tenant_id: &str,
        user_id: &str,
        limit: i64,
        offset: i64,
    ) -> StorageResult<Vec<Purchase>> {
        payments::list_purchases_by_user_id(self, tenant_id, user_id, limit, offset).await
    }

    // ─── Admin nonces ────────────────────────────────────────────────────────
    async fn create_nonce(&self, nonce: AdminNonce) -> StorageResult<()> {
        admin::create_nonce(self, nonce).await
    }
    async fn get_nonce(
        &self,
        tenant_id: &str,
        nonce_id: &str,
    ) -> StorageResult<Option<AdminNonce>> {
        admin::get_nonce(self, tenant_id, nonce_id).await
    }
    async fn consume_nonce(&self, tenant_id: &str, nonce_id: &str) -> StorageResult<()> {
        admin::consume_nonce(self, tenant_id, nonce_id).await
    }
    async fn cleanup_expired_nonces(&self) -> StorageResult<u64> {
        admin::cleanup_expired_nonces(self).await
    }

    // ─── Webhooks & Email queue ──────────────────────────────────────────────
    async fn enqueue_webhook(&self, webhook: PendingWebhook) -> StorageResult<String> {
        webhooks::enqueue_webhook(self, webhook).await
    }
    async fn dequeue_webhooks(&self, limit: i32) -> StorageResult<Vec<PendingWebhook>> {
        webhooks::dequeue_webhooks(self, limit).await
    }
    async fn mark_webhook_processing(&self, webhook_id: &str) -> StorageResult<()> {
        webhooks::mark_webhook_processing(self, webhook_id).await
    }
    async fn mark_webhook_success(&self, webhook_id: &str) -> StorageResult<()> {
        webhooks::mark_webhook_success(self, webhook_id).await
    }
    async fn mark_webhook_failed(
        &self,
        webhook_id: &str,
        error: &str,
        next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        webhooks::mark_webhook_failed(self, webhook_id, error, next_attempt_at).await
    }
    async fn mark_webhook_retry(
        &self,
        webhook_id: &str,
        error: &str,
        next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        webhooks::mark_webhook_retry(self, webhook_id, error, next_attempt_at).await
    }
    async fn get_webhook(&self, webhook_id: &str) -> StorageResult<Option<PendingWebhook>> {
        webhooks::get_webhook(self, webhook_id).await
    }
    async fn list_webhooks(
        &self,
        tenant_id: &str,
        status: Option<WebhookStatus>,
        limit: i32,
    ) -> StorageResult<Vec<PendingWebhook>> {
        webhooks::list_webhooks(self, tenant_id, status, limit).await
    }
    async fn retry_webhook(&self, webhook_id: &str) -> StorageResult<()> {
        webhooks::retry_webhook(self, webhook_id).await
    }
    async fn delete_webhook(&self, webhook_id: &str) -> StorageResult<()> {
        webhooks::delete_webhook(self, webhook_id).await
    }
    async fn cleanup_old_webhooks(&self, retention_days: i32) -> StorageResult<u64> {
        webhooks::cleanup_old_webhooks(self, retention_days).await
    }
    async fn enqueue_email(&self, email: PendingEmail) -> StorageResult<String> {
        webhooks::enqueue_email(self, email).await
    }
    async fn dequeue_emails(&self, limit: i32) -> StorageResult<Vec<PendingEmail>> {
        webhooks::dequeue_emails(self, limit).await
    }
    async fn mark_email_processing(&self, email_id: &str) -> StorageResult<()> {
        webhooks::mark_email_processing(self, email_id).await
    }
    async fn mark_email_success(&self, email_id: &str) -> StorageResult<()> {
        webhooks::mark_email_success(self, email_id).await
    }
    async fn mark_email_retry(
        &self,
        email_id: &str,
        error: &str,
        next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        webhooks::mark_email_retry(self, email_id, error, next_attempt_at).await
    }
    async fn mark_email_failed(&self, email_id: &str, error: &str) -> StorageResult<()> {
        webhooks::mark_email_failed(self, email_id, error).await
    }
    async fn get_email(&self, email_id: &str) -> StorageResult<Option<PendingEmail>> {
        webhooks::get_email(self, email_id).await
    }
    async fn cleanup_old_emails(&self, retention_days: i32) -> StorageResult<u64> {
        webhooks::cleanup_old_emails(self, retention_days).await
    }

    // ─── Idempotency ─────────────────────────────────────────────────────────
    async fn save_idempotency_key(
        &self,
        key: &str,
        response: IdempotencyResponse,
        ttl: StdDuration,
    ) -> StorageResult<()> {
        webhooks::save_idempotency_key(self, key, response, ttl).await
    }
    async fn try_save_idempotency_key(
        &self,
        key: &str,
        response: IdempotencyResponse,
        ttl: StdDuration,
    ) -> StorageResult<bool> {
        webhooks::try_save_idempotency_key(self, key, response, ttl).await
    }
    async fn get_idempotency_key(&self, key: &str) -> StorageResult<Option<IdempotencyResponse>> {
        webhooks::get_idempotency_key(self, key).await
    }
    async fn delete_idempotency_key(&self, key: &str) -> StorageResult<()> {
        webhooks::delete_idempotency_key(self, key).await
    }
    async fn cleanup_expired_idempotency_keys(&self) -> StorageResult<u64> {
        webhooks::cleanup_expired_idempotency_keys(self).await
    }

    // ─── Subscriptions ───────────────────────────────────────────────────────
    async fn save_subscription(&self, sub: Subscription) -> StorageResult<()> {
        subscriptions::save_subscription(self, sub).await
    }
    async fn get_subscription(
        &self,
        tenant_id: &str,
        id: &str,
    ) -> StorageResult<Option<Subscription>> {
        subscriptions::get_subscription(self, tenant_id, id).await
    }
    async fn get_subscription_by_wallet(
        &self,
        tenant_id: &str,
        wallet: &str,
        product_id: &str,
    ) -> StorageResult<Option<Subscription>> {
        subscriptions::get_subscription_by_wallet(self, tenant_id, wallet, product_id).await
    }
    async fn get_subscriptions_by_wallet(
        &self,
        tenant_id: &str,
        wallet: &str,
    ) -> StorageResult<Vec<Subscription>> {
        subscriptions::get_subscriptions_by_wallet(self, tenant_id, wallet).await
    }
    async fn get_subscription_by_stripe_id(
        &self,
        tenant_id: &str,
        stripe_sub_id: &str,
    ) -> StorageResult<Option<Subscription>> {
        subscriptions::get_subscription_by_stripe_id(self, tenant_id, stripe_sub_id).await
    }
    async fn find_subscription_by_stripe_id(
        &self,
        stripe_sub_id: &str,
    ) -> StorageResult<Option<Subscription>> {
        subscriptions::find_subscription_by_stripe_id(self, stripe_sub_id).await
    }
    async fn get_subscription_by_payment_signature(
        &self,
        tenant_id: &str,
        payment_signature: &str,
    ) -> StorageResult<Option<Subscription>> {
        subscriptions::get_subscription_by_payment_signature(self, tenant_id, payment_signature)
            .await
    }
    async fn list_active_subscriptions(
        &self,
        tenant_id: &str,
        product_id: Option<&str>,
    ) -> StorageResult<Vec<Subscription>> {
        subscriptions::list_active_subscriptions(self, tenant_id, product_id).await
    }
    async fn list_expiring_subscriptions(
        &self,
        tenant_id: &str,
        before: DateTime<Utc>,
    ) -> StorageResult<Vec<Subscription>> {
        subscriptions::list_expiring_subscriptions(self, tenant_id, before).await
    }
    async fn update_subscription_status(
        &self,
        tenant_id: &str,
        id: &str,
        status: SubscriptionStatus,
    ) -> StorageResult<()> {
        subscriptions::update_subscription_status(self, tenant_id, id, status).await
    }
    async fn delete_subscription(&self, tenant_id: &str, id: &str) -> StorageResult<()> {
        subscriptions::delete_subscription(self, tenant_id, id).await
    }
    async fn get_subscriptions_by_stripe_customer_id(
        &self,
        tenant_id: &str,
        customer_id: &str,
    ) -> StorageResult<Vec<Subscription>> {
        subscriptions::get_subscriptions_by_stripe_customer_id(self, tenant_id, customer_id).await
    }
    async fn list_subscriptions_by_product(
        &self,
        tenant_id: &str,
        product_id: &str,
    ) -> StorageResult<Vec<Subscription>> {
        subscriptions::list_subscriptions_by_product(self, tenant_id, product_id).await
    }
    async fn count_subscriptions_by_plan(
        &self,
        tenant_id: &str,
        plan_id: &str,
    ) -> StorageResult<i64> {
        subscriptions::count_subscriptions_by_plan(self, tenant_id, plan_id).await
    }
    async fn list_tenant_ids(&self) -> StorageResult<Vec<String>> {
        subscriptions::list_tenant_ids(self).await
    }

    // ─── Dead Letter Queue ───────────────────────────────────────────────────
    async fn move_to_dlq(&self, webhook: PendingWebhook, final_error: &str) -> StorageResult<()> {
        webhooks::move_to_dlq(self, webhook, final_error).await
    }
    async fn list_dlq(&self, tenant_id: &str, limit: i32) -> StorageResult<Vec<DlqWebhook>> {
        webhooks::list_dlq(self, tenant_id, limit).await
    }
    async fn get_dlq_entry(&self, dlq_id: &str) -> StorageResult<Option<DlqWebhook>> {
        webhooks::get_dlq_entry(self, dlq_id).await
    }
    async fn retry_from_dlq(&self, dlq_id: &str) -> StorageResult<()> {
        webhooks::retry_from_dlq(self, dlq_id).await
    }
    async fn delete_from_dlq(&self, dlq_id: &str) -> StorageResult<()> {
        webhooks::delete_from_dlq(self, dlq_id).await
    }

    // ─── Admin Dashboard ─────────────────────────────────────────────────────
    async fn get_admin_stats(&self, tenant_id: &str) -> StorageResult<AdminStats> {
        admin::get_admin_stats(self, tenant_id).await
    }
    async fn list_purchases(
        &self,
        tenant_id: &str,
        method: Option<&str>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Purchase>> {
        admin::list_purchases(self, tenant_id, method, limit, offset).await
    }

    // ─── Lifecycle ───────────────────────────────────────────────────────────
    async fn close(&self) -> StorageResult<()> {
        Ok(())
    }
    async fn health_check(&self) -> StorageResult<()> {
        // In-memory store is always healthy
        Ok(())
    }

    // ─── Chat Sessions & Messages ────────────────────────────────────────────
    async fn create_chat_session(&self, session: ChatSession) -> StorageResult<()> {
        chat::create_chat_session(self, session).await
    }
    async fn get_chat_session(
        &self,
        tenant_id: &str,
        session_id: &str,
    ) -> StorageResult<Option<ChatSession>> {
        chat::get_chat_session(self, tenant_id, session_id).await
    }
    async fn update_chat_session(
        &self,
        tenant_id: &str,
        session_id: &str,
        message_count: i32,
        last_message_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        chat::update_chat_session(
            self,
            tenant_id,
            session_id,
            message_count,
            last_message_at,
            updated_at,
        )
        .await
    }
    async fn list_chat_sessions(
        &self,
        tenant_id: &str,
        customer_id: Option<&str>,
        status: Option<&str>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<ChatSession>, i64)> {
        chat::list_chat_sessions(self, tenant_id, customer_id, status, limit, offset).await
    }
    async fn create_chat_message(&self, message: ChatMessage) -> StorageResult<()> {
        chat::create_chat_message(self, message).await
    }
    async fn list_chat_messages(
        &self,
        tenant_id: &str,
        session_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ChatMessage>> {
        chat::list_chat_messages(self, tenant_id, session_id, limit, offset).await
    }

    // ─── FAQs ────────────────────────────────────────────────────────────────
    async fn create_faq(&self, faq: Faq) -> StorageResult<()> {
        faqs::create_faq(self, faq).await
    }
    async fn get_faq(&self, tenant_id: &str, faq_id: &str) -> StorageResult<Option<Faq>> {
        faqs::get_faq(self, tenant_id, faq_id).await
    }
    async fn update_faq(&self, faq: Faq) -> StorageResult<()> {
        faqs::update_faq(self, faq).await
    }
    async fn delete_faq(&self, tenant_id: &str, faq_id: &str) -> StorageResult<()> {
        faqs::delete_faq(self, tenant_id, faq_id).await
    }
    async fn list_faqs(
        &self,
        tenant_id: &str,
        active_only: bool,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<Faq>, i64)> {
        faqs::list_faqs(self, tenant_id, active_only, limit, offset).await
    }
    async fn search_faqs(
        &self,
        tenant_id: &str,
        query: &str,
        limit: i32,
    ) -> StorageResult<Vec<Faq>> {
        faqs::search_faqs(self, tenant_id, query, limit).await
    }
    async fn list_public_faqs(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<Faq>, i64)> {
        faqs::list_public_faqs(self, tenant_id, limit, offset).await
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

#[cfg(test)]
mod tests;
