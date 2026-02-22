//! PostgreSQL Store implementation
//!
//! The `impl Store for PostgresStore` block lives here and delegates every method
//! to inherent `impl PostgresStore` blocks defined in the domain sub-modules.
//! Rust allows inherent impls to be split across files in the same module tree.

use std::time::Duration;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::{QueryBuilder, Row};

use super::connection::PostgresPool;
use super::parsers::{
    parse_admin_nonce, parse_cart_quote, parse_chat_message, parse_chat_session, parse_collection,
    parse_credits_hold, parse_customer, parse_dispute, parse_dlq_webhook, parse_email, parse_faq,
    parse_fulfillment, parse_gift_card, parse_idempotency_response, parse_inventory_adjustment,
    parse_inventory_reservation, parse_order, parse_order_history, parse_payment_transaction,
    parse_refund_quote, parse_return_request, parse_shipping_profile, parse_shipping_rate,
    parse_stripe_refund_request, parse_subscription, parse_tax_rate, parse_webhook,
};
use super::queries;
use crate::config::SchemaMapping;
use crate::models::{
    CartQuote, ChatMessage, ChatSession, Collection, Customer, DisputeRecord, Faq, Fulfillment,
    GiftCard, InventoryAdjustment, InventoryReservation, Order, OrderHistoryEntry,
    PaymentTransaction, RefundQuote, ReturnRequest, ShippingProfile, ShippingRate,
    StripeRefundRequest, Subscription, SubscriptionStatus, TaxRate,
};
use crate::storage::{
    AdminNonce, AdminStats, CreditsHold, DlqWebhook, IdempotencyResponse, PendingEmail,
    PendingWebhook, Purchase, StorageError, StorageResult, Store, WebhookStatus,
};
use crate::{constants::DEFAULT_ACCESS_TTL, storage::memory::to_chrono_duration};

mod admin;
mod auth;
mod cart;
mod catalog;
mod chat;
mod inventory;
mod orders;
mod payments;
mod refunds;
mod subscriptions;
mod webhooks;

fn is_sql_identifier_char(b: u8) -> bool {
    b.is_ascii_alphanumeric() || b == b'_'
}

/// Replace occurrences of an identifier only when it appears as a standalone SQL token.
///
/// This avoids accidental replacements inside other identifiers (e.g. replacing `cart_quotes`
/// inside `cart_quotes_id`).
pub(super) fn replace_identifier(query: &str, from: &str, to: &str) -> String {
    if from == to {
        return query.to_string();
    }

    let mut out = String::with_capacity(query.len());
    let bytes = query.as_bytes();
    let mut i = 0;

    while let Some(rel_pos) = query[i..].find(from) {
        let start = i + rel_pos;
        let end = start + from.len();

        let before_ok = start == 0 || !is_sql_identifier_char(bytes[start - 1]);
        let after_ok = end == bytes.len() || !is_sql_identifier_char(bytes[end]);

        out.push_str(&query[i..start]);
        if before_ok && after_ok {
            out.push_str(to);
        } else {
            out.push_str(from);
        }

        i = end;
    }

    out.push_str(&query[i..]);
    out
}

/// PostgreSQL storage implementation
#[derive(Clone)]
pub struct PostgresStore {
    pub(super) pool: PostgresPool,
    pub(super) tables: SchemaMapping,
}

#[derive(Clone, Debug)]
pub struct InventoryAdjustmentRequest {
    pub product_id: String,
    /// Variant ID for variant-level inventory tracking
    pub variant_id: Option<String>,
    pub quantity: i32,
    pub allow_backorder: bool,
    pub reason: Option<String>,
    pub actor: Option<String>,
}

impl PostgresStore {
    /// Create a new PostgreSQL store
    pub fn new(pool: PostgresPool, tables: SchemaMapping) -> Self {
        Self { pool, tables }
    }

    /// Create a PostgresStore from an existing PgPool
    ///
    /// This allows embedding applications to share their existing database pool
    /// instead of creating a new one.
    ///
    /// # Example
    /// ```rust,ignore
    /// let existing_pool: sqlx::PgPool = // ... your app's pool
    /// let tables = SchemaMapping::default();
    /// let store = PostgresStore::from_pool(existing_pool, tables);
    /// let router = cedros_pay::router(&config, Arc::new(store)).await?;
    /// ```
    pub fn from_pool(pool: sqlx::PgPool, tables: SchemaMapping) -> Self {
        Self::new(PostgresPool::from_pool(pool), tables)
    }

    /// Get the connection pool
    pub fn pool(&self) -> &PostgresPool {
        &self.pool
    }

    pub(super) fn map_table(&self, query: &str, from: &str, to: &str) -> String {
        replace_identifier(query, from, to)
    }

    pub(super) fn cart_query(&self, query: &str) -> String {
        self.map_table(query, "cart_quotes", &self.tables.cart_quotes_table)
    }

    pub(super) fn refund_query(&self, query: &str) -> String {
        self.map_table(query, "refund_quotes", &self.tables.refund_quotes_table)
    }

    pub(super) fn payment_query(&self, query: &str) -> String {
        self.map_table(query, "payment_transactions", &self.tables.payments_table)
    }

    pub(super) fn nonce_query(&self, query: &str) -> String {
        self.map_table(query, "admin_nonces", &self.tables.admin_nonces_table)
    }

    pub(super) fn webhook_query(&self, query: &str) -> String {
        self.map_table(query, "webhook_queue", &self.tables.webhook_queue_table)
    }

    pub(super) fn email_query(&self, query: &str) -> String {
        // Email queue table is not currently configurable via SchemaMapping.
        self.map_table(query, "email_queue", "email_queue")
    }

    pub(super) fn credits_hold_query(&self, query: &str) -> String {
        self.map_table(query, "credits_holds", &self.tables.credits_holds_table)
    }

    pub(super) fn products_query(&self, query: &str) -> String {
        self.map_table(query, "products", &self.tables.products_table)
    }

    pub(super) fn stripe_refund_request_query(&self, query: &str) -> String {
        // Stripe refund request table is not currently configurable via SchemaMapping.
        // Keep the default table name stable.
        self.map_table(query, "stripe_refund_requests", "stripe_refund_requests")
    }

    pub(super) fn orders_query(&self, query: &str) -> String {
        // Orders table is not currently configurable via SchemaMapping.
        self.map_table(query, "orders", "orders")
    }
}

// ---------------------------------------------------------------------------
// Store trait implementation — delegates to domain-specific inherent impls
// defined in the sub-modules (cart, refunds, orders, …).
// ---------------------------------------------------------------------------
#[async_trait]
impl Store for PostgresStore {
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
        orders::update_order_status(self, tenant_id, order_id, status, status_updated_at, updated_at)
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
        orders::update_order_status_with_history(
            self,
            tenant_id,
            order_id,
            status,
            status_updated_at,
            updated_at,
            entry,
        )
        .await
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
        orders::update_return_status(self, tenant_id, return_id, status, status_updated_at, updated_at)
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
        inventory::get_active_inventory_reservation_quantity(self, tenant_id, product_id, variant_id, now)
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
    ) -> StorageResult<std::collections::HashMap<String, (i32, i32)>> {
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

    // ─── Catalog (shipping, tax, customers, disputes, gift cards, collections)
    async fn create_shipping_profile(&self, profile: ShippingProfile) -> StorageResult<()> {
        catalog::create_shipping_profile(self, profile).await
    }
    async fn update_shipping_profile(&self, profile: ShippingProfile) -> StorageResult<()> {
        catalog::update_shipping_profile(self, profile).await
    }
    async fn get_shipping_profile(
        &self,
        tenant_id: &str,
        profile_id: &str,
    ) -> StorageResult<Option<ShippingProfile>> {
        catalog::get_shipping_profile(self, tenant_id, profile_id).await
    }
    async fn list_shipping_profiles(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ShippingProfile>> {
        catalog::list_shipping_profiles(self, tenant_id, limit, offset).await
    }
    async fn delete_shipping_profile(
        &self,
        tenant_id: &str,
        profile_id: &str,
    ) -> StorageResult<()> {
        catalog::delete_shipping_profile(self, tenant_id, profile_id).await
    }
    async fn create_shipping_rate(&self, rate: ShippingRate) -> StorageResult<()> {
        catalog::create_shipping_rate(self, rate).await
    }
    async fn update_shipping_rate(&self, rate: ShippingRate) -> StorageResult<()> {
        catalog::update_shipping_rate(self, rate).await
    }
    async fn list_shipping_rates(
        &self,
        tenant_id: &str,
        profile_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ShippingRate>> {
        catalog::list_shipping_rates(self, tenant_id, profile_id, limit, offset).await
    }
    async fn delete_shipping_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<()> {
        catalog::delete_shipping_rate(self, tenant_id, rate_id).await
    }
    async fn create_tax_rate(&self, rate: TaxRate) -> StorageResult<()> {
        catalog::create_tax_rate(self, rate).await
    }
    async fn update_tax_rate(&self, rate: TaxRate) -> StorageResult<()> {
        catalog::update_tax_rate(self, rate).await
    }
    async fn get_tax_rate(
        &self,
        tenant_id: &str,
        rate_id: &str,
    ) -> StorageResult<Option<TaxRate>> {
        catalog::get_tax_rate(self, tenant_id, rate_id).await
    }
    async fn list_tax_rates(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<TaxRate>> {
        catalog::list_tax_rates(self, tenant_id, limit, offset).await
    }
    async fn delete_tax_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<()> {
        catalog::delete_tax_rate(self, tenant_id, rate_id).await
    }
    async fn create_customer(&self, customer: Customer) -> StorageResult<()> {
        catalog::create_customer(self, customer).await
    }
    async fn update_customer(&self, customer: Customer) -> StorageResult<()> {
        catalog::update_customer(self, customer).await
    }
    async fn get_customer(
        &self,
        tenant_id: &str,
        customer_id: &str,
    ) -> StorageResult<Option<Customer>> {
        catalog::get_customer(self, tenant_id, customer_id).await
    }
    async fn list_customers(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Customer>> {
        catalog::list_customers(self, tenant_id, limit, offset).await
    }
    async fn create_dispute(&self, dispute: DisputeRecord) -> StorageResult<()> {
        catalog::create_dispute(self, dispute).await
    }
    async fn update_dispute_status(
        &self,
        tenant_id: &str,
        dispute_id: &str,
        status: &str,
        status_updated_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        catalog::update_dispute_status(self, tenant_id, dispute_id, status, status_updated_at, updated_at)
            .await
    }
    async fn get_dispute(
        &self,
        tenant_id: &str,
        dispute_id: &str,
    ) -> StorageResult<Option<DisputeRecord>> {
        catalog::get_dispute(self, tenant_id, dispute_id).await
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
        catalog::list_disputes(self, tenant_id, status, source, order_id, limit, offset).await
    }
    async fn create_gift_card(&self, card: GiftCard) -> StorageResult<()> {
        catalog::create_gift_card(self, card).await
    }
    async fn update_gift_card(&self, card: GiftCard) -> StorageResult<()> {
        catalog::update_gift_card(self, card).await
    }
    async fn get_gift_card(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> StorageResult<Option<GiftCard>> {
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

    // ─── Auth / Nonces ──────────────────────────────────────────────────────
    async fn create_nonce(&self, nonce: AdminNonce) -> StorageResult<()> {
        auth::create_nonce(self, nonce).await
    }
    async fn get_nonce(
        &self,
        tenant_id: &str,
        nonce_id: &str,
    ) -> StorageResult<Option<AdminNonce>> {
        auth::get_nonce(self, tenant_id, nonce_id).await
    }
    async fn consume_nonce(&self, tenant_id: &str, nonce_id: &str) -> StorageResult<()> {
        auth::consume_nonce(self, tenant_id, nonce_id).await
    }
    async fn cleanup_expired_nonces(&self) -> StorageResult<u64> {
        auth::cleanup_expired_nonces(self).await
    }

    // ─── Webhooks, emails, idempotency, DLQ ─────────────────────────────────
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
    async fn count_pending_webhooks(&self) -> StorageResult<i64> {
        webhooks::count_pending_webhooks(self).await
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
    async fn save_idempotency_key(
        &self,
        key: &str,
        response: IdempotencyResponse,
        ttl: Duration,
    ) -> StorageResult<()> {
        webhooks::save_idempotency_key(self, key, response, ttl).await
    }
    async fn try_save_idempotency_key(
        &self,
        key: &str,
        response: IdempotencyResponse,
        ttl: Duration,
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

    // ─── Subscriptions ──────────────────────────────────────────────────────
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
    async fn list_expiring_local_subscriptions_limited(
        &self,
        tenant_id: &str,
        before: DateTime<Utc>,
        limit: i64,
    ) -> StorageResult<Vec<Subscription>> {
        subscriptions::list_expiring_local_subscriptions_limited(self, tenant_id, before, limit)
            .await
    }
    async fn update_subscription_status(
        &self,
        tenant_id: &str,
        id: &str,
        status: SubscriptionStatus,
    ) -> StorageResult<()> {
        subscriptions::update_subscription_status(self, tenant_id, id, status).await
    }
    async fn update_subscription_statuses(
        &self,
        tenant_id: &str,
        ids: &[String],
        status: SubscriptionStatus,
    ) -> StorageResult<()> {
        subscriptions::update_subscription_statuses(self, tenant_id, ids, status).await
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

    // ─── Admin ──────────────────────────────────────────────────────────────
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

    // ─── Lifecycle ──────────────────────────────────────────────────────────
    async fn close(&self) -> StorageResult<()> {
        self.pool.close().await;
        Ok(())
    }
    async fn health_check(&self) -> StorageResult<()> {
        sqlx::query("SELECT 1")
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::internal("health check failed", e))?;
        Ok(())
    }

    // ─── Chat ────────────────────────────────────────────────────────────────
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
    async fn create_faq(&self, faq: Faq) -> StorageResult<()> {
        chat::create_faq(self, faq).await
    }
    async fn get_faq(&self, tenant_id: &str, faq_id: &str) -> StorageResult<Option<Faq>> {
        chat::get_faq(self, tenant_id, faq_id).await
    }
    async fn update_faq(&self, faq: Faq) -> StorageResult<()> {
        chat::update_faq(self, faq).await
    }
    async fn delete_faq(&self, tenant_id: &str, faq_id: &str) -> StorageResult<()> {
        chat::delete_faq(self, tenant_id, faq_id).await
    }
    async fn list_faqs(
        &self,
        tenant_id: &str,
        active_only: bool,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<Faq>, i64)> {
        chat::list_faqs(self, tenant_id, active_only, limit, offset).await
    }
    async fn search_faqs(
        &self,
        tenant_id: &str,
        query: &str,
        limit: i32,
    ) -> StorageResult<Vec<Faq>> {
        chat::search_faqs(self, tenant_id, query, limit).await
    }
    async fn list_public_faqs(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<Faq>, i64)> {
        chat::list_public_faqs(self, tenant_id, limit, offset).await
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_access_cutoff_uses_default_ttl() {
        let now = Utc::now();
        let cutoff = payments::access_cutoff(now);
        let expected = to_chrono_duration(DEFAULT_ACCESS_TTL);
        assert_eq!(now - cutoff, expected);
    }

    #[test]
    fn test_replace_identifier_only_replaces_token_occurrences() {
        let query = "SELECT cart_quotes.id FROM cart_quotes WHERE cart_quotes_id = $1";
        let mapped = replace_identifier(query, "cart_quotes", "tenant_cart_quotes");
        assert_eq!(
            mapped,
            "SELECT tenant_cart_quotes.id FROM tenant_cart_quotes WHERE cart_quotes_id = $1"
        );
    }

    #[test]
    fn test_replace_identifier_replaces_schema_qualified_and_quoted() {
        let query = "SELECT * FROM public.cart_quotes JOIN \"cart_quotes\" c ON true";
        let mapped = replace_identifier(query, "cart_quotes", "tenant_cart_quotes");
        assert_eq!(
            mapped,
            "SELECT * FROM public.tenant_cart_quotes JOIN \"tenant_cart_quotes\" c ON true"
        );
    }

    #[test]
    fn test_top_products_query_uses_quantity_and_prorated_revenue() {
        assert!(
            admin::TOP_PRODUCTS_QUERY.contains("SUM(item_quantity) AS quantity"),
            "top products must aggregate item quantity, not row count"
        );
        assert!(
            admin::TOP_PRODUCTS_QUERY
                .contains("amount::NUMERIC * item_quantity::NUMERIC / order_total_quantity"),
            "top products revenue must be prorated by per-order quantity share"
        );
    }

    #[test]
    fn test_map_top_products_query_result_propagates_error() {
        let result = admin::map_top_products_query_result(Err(sqlx::Error::RowNotFound));
        match result {
            Ok(_) => panic!("expected error"),
            Err(StorageError::Database(msg)) => {
                assert!(msg.contains("get admin stats top products"));
            }
            Err(other) => panic!("unexpected error: {other:?}"),
        }
    }
}
