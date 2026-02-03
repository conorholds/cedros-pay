//! Cached repository wrapper
//!
//! Wraps a Store implementation with an in-memory cache for frequently accessed data.
//! Per spec (08-storage.md): All queries filter by tenant_id for multi-tenant isolation

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::models::StripeRefundRequest;
use crate::models::{
    CartQuote, ChatMessage, ChatSession, Collection, Customer, DisputeRecord, Faq, Fulfillment,
    GiftCard, InventoryAdjustment, InventoryReservation, Order, OrderHistoryEntry,
    PaymentTransaction, RefundQuote, ReturnRequest, ShippingProfile, ShippingRate, Subscription,
    SubscriptionStatus, TaxRate,
};
use crate::storage::{
    AdminNonce, AdminStats, CreditsHold, DlqWebhook, IdempotencyResponse, PendingEmail,
    PendingWebhook, Purchase, StorageResult, Store, WebhookStatus,
};
use crate::ttl_cache::{CacheStats, TtlCache};

/// Cache configuration
#[derive(Debug, Clone)]
pub struct CacheConfig {
    pub cart_quote_ttl: Duration,
    pub subscription_ttl: Duration,
    pub payment_ttl: Duration,
    pub nonce_ttl: Duration,
    pub max_entries: usize,
    pub enabled: bool,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            cart_quote_ttl: Duration::from_secs(60),
            subscription_ttl: Duration::from_secs(300),
            payment_ttl: Duration::from_secs(120),
            nonce_ttl: Duration::from_secs(60),
            max_entries: 10000,
            enabled: true,
        }
    }
}

/// Cached repository wrapper
pub struct CachedStore<S: Store> {
    inner: Arc<S>,
    config: CacheConfig,
    cart_cache: TtlCache<CartQuote>,
    subscription_cache: TtlCache<Subscription>,
    subscription_by_wallet_cache: TtlCache<Subscription>,
    payment_processed_cache: TtlCache<bool>,
    nonce_cache: TtlCache<AdminNonce>,
}

impl<S: Store> CachedStore<S> {
    pub fn new(inner: Arc<S>, config: CacheConfig) -> Self {
        let max_entries = config.max_entries;
        Self {
            inner,
            config,
            cart_cache: TtlCache::new(max_entries),
            subscription_cache: TtlCache::new(max_entries),
            subscription_by_wallet_cache: TtlCache::new(max_entries),
            payment_processed_cache: TtlCache::new(max_entries),
            nonce_cache: TtlCache::new(max_entries),
        }
    }

    pub fn with_defaults(inner: Arc<S>) -> Self {
        Self::new(inner, CacheConfig::default())
    }

    pub fn stats(&self) -> CachedStoreStats {
        CachedStoreStats {
            cart: self.cart_cache.stats(),
            subscription: self.subscription_cache.stats(),
            subscription_by_wallet: self.subscription_by_wallet_cache.stats(),
            payment_processed: self.payment_processed_cache.stats(),
            nonce: self.nonce_cache.stats(),
        }
    }

    pub fn clear_all(&self) {
        self.cart_cache.clear();
        self.subscription_cache.clear();
        self.subscription_by_wallet_cache.clear();
        self.payment_processed_cache.clear();
        self.nonce_cache.clear();
    }

    pub fn inner(&self) -> &Arc<S> {
        &self.inner
    }

    fn tenant_key(tenant_id: &str, id: &str) -> String {
        format!("{}:{}", tenant_id, id)
    }

    fn wallet_product_key(tenant_id: &str, wallet: &str, product_id: &str) -> String {
        format!("{}:{}:{}", tenant_id, wallet, product_id)
    }
}

/// Combined cache statistics
#[derive(Debug, Clone)]
pub struct CachedStoreStats {
    pub cart: CacheStats,
    pub subscription: CacheStats,
    pub subscription_by_wallet: CacheStats,
    pub payment_processed: CacheStats,
    pub nonce: CacheStats,
}

#[async_trait]
impl<S: Store + 'static> Store for CachedStore<S> {
    // ─────────────────────────────────────────────────────────────────────────
    // Cart quotes - cached with tenant isolation
    // ─────────────────────────────────────────────────────────────────────────

    async fn store_cart_quote(&self, quote: CartQuote) -> StorageResult<()> {
        let cache_key = Self::tenant_key(&quote.tenant_id, &quote.id);
        let result = self.inner.store_cart_quote(quote.clone()).await?;

        if self.config.enabled {
            self.cart_cache
                .set(cache_key, quote, self.config.cart_quote_ttl);
        }

        Ok(result)
    }

    async fn store_cart_quotes(&self, quotes: Vec<CartQuote>) -> StorageResult<()> {
        // PERF-002: Delegate to inner store's batch method first
        self.inner.store_cart_quotes(quotes.clone()).await?;

        // Update cache for each quote
        if self.config.enabled {
            for quote in quotes {
                let cache_key = Self::tenant_key(&quote.tenant_id, &quote.id);
                self.cart_cache
                    .set(cache_key, quote, self.config.cart_quote_ttl);
            }
        }
        Ok(())
    }

    async fn get_cart_quote(
        &self,
        tenant_id: &str,
        cart_id: &str,
    ) -> StorageResult<Option<CartQuote>> {
        let cache_key = Self::tenant_key(tenant_id, cart_id);

        if self.config.enabled {
            if let Some(cached) = self.cart_cache.get(&cache_key) {
                return Ok(Some(cached));
            }
        }

        let result = self.inner.get_cart_quote(tenant_id, cart_id).await?;

        if self.config.enabled {
            if let Some(ref quote) = result {
                self.cart_cache
                    .set(cache_key, quote.clone(), self.config.cart_quote_ttl);
            }
        }

        Ok(result)
    }

    async fn get_cart_quotes(
        &self,
        tenant_id: &str,
        cart_ids: &[String],
    ) -> StorageResult<Vec<CartQuote>> {
        // PERF-003: Check cache first, batch fetch misses
        let mut results = Vec::with_capacity(cart_ids.len());
        let mut cache_misses = Vec::new();

        if self.config.enabled {
            for cart_id in cart_ids {
                let cache_key = Self::tenant_key(tenant_id, cart_id);
                if let Some(cached) = self.cart_cache.get(&cache_key) {
                    results.push(cached);
                } else {
                    cache_misses.push(cart_id.clone());
                }
            }
        } else {
            cache_misses.extend(cart_ids.iter().cloned());
        }

        // Batch fetch cache misses from inner store
        if !cache_misses.is_empty() {
            let fetched = self.inner.get_cart_quotes(tenant_id, &cache_misses).await?;

            // Update cache and collect results
            if self.config.enabled {
                for quote in &fetched {
                    let cache_key = Self::tenant_key(tenant_id, &quote.id);
                    self.cart_cache
                        .set(cache_key, quote.clone(), self.config.cart_quote_ttl);
                }
            }
            results.extend(fetched);
        }

        Ok(results)
    }

    async fn mark_cart_paid(
        &self,
        tenant_id: &str,
        cart_id: &str,
        wallet: &str,
    ) -> StorageResult<()> {
        let result = self
            .inner
            .mark_cart_paid(tenant_id, cart_id, wallet)
            .await?;
        let cache_key = Self::tenant_key(tenant_id, cart_id);
        self.cart_cache.invalidate(&cache_key);
        Ok(result)
    }

    async fn has_cart_access(
        &self,
        tenant_id: &str,
        cart_id: &str,
        wallet: &str,
    ) -> StorageResult<bool> {
        let cache_key = Self::tenant_key(tenant_id, cart_id);

        if self.config.enabled {
            if let Some(cached) = self.cart_cache.get(&cache_key) {
                return Ok(cached.wallet_paid_by.as_deref() == Some(wallet));
            }
        }

        self.inner.has_cart_access(tenant_id, cart_id, wallet).await
    }

    async fn cleanup_expired_cart_quotes(&self) -> StorageResult<u64> {
        self.inner.cleanup_expired_cart_quotes().await
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Refunds - not cached (mutable state)
    // ─────────────────────────────────────────────────────────────────────────

    async fn store_refund_quote(&self, quote: RefundQuote) -> StorageResult<()> {
        self.inner.store_refund_quote(quote).await
    }

    async fn store_refund_quotes(&self, quotes: Vec<RefundQuote>) -> StorageResult<()> {
        self.inner.store_refund_quotes(quotes).await
    }

    async fn get_refund_quote(
        &self,
        tenant_id: &str,
        refund_id: &str,
    ) -> StorageResult<Option<RefundQuote>> {
        self.inner.get_refund_quote(tenant_id, refund_id).await
    }

    async fn get_refund_by_original_purchase_id(
        &self,
        tenant_id: &str,
        original_purchase_id: &str,
    ) -> StorageResult<Option<RefundQuote>> {
        self.inner
            .get_refund_by_original_purchase_id(tenant_id, original_purchase_id)
            .await
    }

    async fn get_all_refunds_for_purchase(
        &self,
        tenant_id: &str,
        original_purchase_id: &str,
    ) -> StorageResult<Vec<RefundQuote>> {
        self.inner
            .get_all_refunds_for_purchase(tenant_id, original_purchase_id)
            .await
    }

    async fn list_pending_refunds(
        &self,
        tenant_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<RefundQuote>> {
        self.inner.list_pending_refunds(tenant_id, limit).await
    }

    async fn mark_refund_processed(
        &self,
        tenant_id: &str,
        refund_id: &str,
        processed_by: &str,
        signature: &str,
    ) -> StorageResult<()> {
        self.inner
            .mark_refund_processed(tenant_id, refund_id, processed_by, signature)
            .await
    }

    async fn delete_refund_quote(&self, tenant_id: &str, refund_id: &str) -> StorageResult<()> {
        self.inner.delete_refund_quote(tenant_id, refund_id).await
    }

    async fn cleanup_expired_refund_quotes(&self) -> StorageResult<u64> {
        self.inner.cleanup_expired_refund_quotes().await
    }

    async fn store_stripe_refund_request(&self, req: StripeRefundRequest) -> StorageResult<()> {
        self.inner.store_stripe_refund_request(req).await
    }

    async fn get_stripe_refund_request(
        &self,
        tenant_id: &str,
        request_id: &str,
    ) -> StorageResult<Option<StripeRefundRequest>> {
        self.inner
            .get_stripe_refund_request(tenant_id, request_id)
            .await
    }

    async fn list_pending_stripe_refund_requests(
        &self,
        tenant_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<StripeRefundRequest>> {
        self.inner
            .list_pending_stripe_refund_requests(tenant_id, limit)
            .await
    }

    async fn get_pending_stripe_refund_request_by_original_purchase_id(
        &self,
        tenant_id: &str,
        original_purchase_id: &str,
    ) -> StorageResult<Option<StripeRefundRequest>> {
        self.inner
            .get_pending_stripe_refund_request_by_original_purchase_id(
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
        self.inner
            .get_stripe_refund_request_by_charge_id(tenant_id, stripe_charge_id)
            .await
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Orders
    // ─────────────────────────────────────────────────────────────────────────

    async fn try_store_order(&self, order: Order) -> StorageResult<bool> {
        self.inner.try_store_order(order).await
    }

    async fn get_order(&self, tenant_id: &str, order_id: &str) -> StorageResult<Option<Order>> {
        self.inner.get_order(tenant_id, order_id).await
    }

    async fn list_orders(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Order>> {
        self.inner.list_orders(tenant_id, limit, offset).await
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
        self.inner
            .list_orders_filtered(
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
        self.inner
            .update_order_status(tenant_id, order_id, status, status_updated_at, updated_at)
            .await
    }

    async fn append_order_history(&self, entry: OrderHistoryEntry) -> StorageResult<()> {
        self.inner.append_order_history(entry).await
    }

    async fn list_order_history(
        &self,
        tenant_id: &str,
        order_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<OrderHistoryEntry>> {
        self.inner
            .list_order_history(tenant_id, order_id, limit)
            .await
    }

    async fn create_fulfillment(&self, fulfillment: Fulfillment) -> StorageResult<()> {
        self.inner.create_fulfillment(fulfillment).await
    }

    async fn list_fulfillments(
        &self,
        tenant_id: &str,
        order_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<Fulfillment>> {
        self.inner
            .list_fulfillments(tenant_id, order_id, limit)
            .await
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
        self.inner
            .update_fulfillment_status(
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
        self.inner.create_return_request(request).await
    }

    async fn update_return_status(
        &self,
        tenant_id: &str,
        return_id: &str,
        status: &str,
        status_updated_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        self.inner
            .update_return_status(tenant_id, return_id, status, status_updated_at, updated_at)
            .await
    }

    async fn get_return_request(
        &self,
        tenant_id: &str,
        return_id: &str,
    ) -> StorageResult<Option<ReturnRequest>> {
        self.inner.get_return_request(tenant_id, return_id).await
    }

    async fn list_return_requests(
        &self,
        tenant_id: &str,
        status: Option<&str>,
        order_id: Option<&str>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ReturnRequest>> {
        self.inner
            .list_return_requests(tenant_id, status, order_id, limit, offset)
            .await
    }

    async fn reserve_inventory(&self, reservation: InventoryReservation) -> StorageResult<()> {
        self.inner.reserve_inventory(reservation).await
    }

    async fn get_active_inventory_reservation_quantity(
        &self,
        tenant_id: &str,
        product_id: &str,
        variant_id: Option<&str>,
        now: DateTime<Utc>,
    ) -> StorageResult<i64> {
        self.inner
            .get_active_inventory_reservation_quantity(tenant_id, product_id, variant_id, now)
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
        self.inner
            .get_active_inventory_reservation_quantity_excluding_cart(
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
        self.inner
            .list_active_reservations_for_cart(tenant_id, cart_id)
            .await
    }

    async fn release_inventory_reservations(
        &self,
        tenant_id: &str,
        cart_id: &str,
        released_at: DateTime<Utc>,
    ) -> StorageResult<u64> {
        self.inner
            .release_inventory_reservations(tenant_id, cart_id, released_at)
            .await
    }

    async fn convert_inventory_reservations(
        &self,
        tenant_id: &str,
        cart_id: &str,
        converted_at: DateTime<Utc>,
    ) -> StorageResult<u64> {
        self.inner
            .convert_inventory_reservations(tenant_id, cart_id, converted_at)
            .await
    }

    async fn cleanup_expired_inventory_reservations(
        &self,
        now: DateTime<Utc>,
    ) -> StorageResult<u64> {
        self.inner.cleanup_expired_inventory_reservations(now).await
    }

    async fn record_inventory_adjustment(
        &self,
        adjustment: InventoryAdjustment,
    ) -> StorageResult<()> {
        self.inner.record_inventory_adjustment(adjustment).await
    }

    async fn list_inventory_adjustments(
        &self,
        tenant_id: &str,
        product_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<InventoryAdjustment>> {
        self.inner
            .list_inventory_adjustments(tenant_id, product_id, limit, offset)
            .await
    }

    async fn update_inventory_batch(
        &self,
        tenant_id: &str,
        updates: Vec<(String, Option<String>, i32)>,
        reason: Option<&str>,
        actor: Option<&str>,
    ) -> StorageResult<std::collections::HashMap<String, (i32, i32)>> {
        self.inner
            .update_inventory_batch(tenant_id, updates, reason, actor)
            .await
    }

    async fn create_shipping_profile(&self, profile: ShippingProfile) -> StorageResult<()> {
        self.inner.create_shipping_profile(profile).await
    }

    async fn update_shipping_profile(&self, profile: ShippingProfile) -> StorageResult<()> {
        self.inner.update_shipping_profile(profile).await
    }

    async fn get_shipping_profile(
        &self,
        tenant_id: &str,
        profile_id: &str,
    ) -> StorageResult<Option<ShippingProfile>> {
        self.inner.get_shipping_profile(tenant_id, profile_id).await
    }

    async fn list_shipping_profiles(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ShippingProfile>> {
        self.inner
            .list_shipping_profiles(tenant_id, limit, offset)
            .await
    }

    async fn delete_shipping_profile(
        &self,
        tenant_id: &str,
        profile_id: &str,
    ) -> StorageResult<()> {
        self.inner
            .delete_shipping_profile(tenant_id, profile_id)
            .await
    }

    async fn create_shipping_rate(&self, rate: ShippingRate) -> StorageResult<()> {
        self.inner.create_shipping_rate(rate).await
    }

    async fn update_shipping_rate(&self, rate: ShippingRate) -> StorageResult<()> {
        self.inner.update_shipping_rate(rate).await
    }

    async fn list_shipping_rates(
        &self,
        tenant_id: &str,
        profile_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ShippingRate>> {
        self.inner
            .list_shipping_rates(tenant_id, profile_id, limit, offset)
            .await
    }

    async fn delete_shipping_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<()> {
        self.inner.delete_shipping_rate(tenant_id, rate_id).await
    }

    async fn create_tax_rate(&self, rate: TaxRate) -> StorageResult<()> {
        self.inner.create_tax_rate(rate).await
    }

    async fn update_tax_rate(&self, rate: TaxRate) -> StorageResult<()> {
        self.inner.update_tax_rate(rate).await
    }

    async fn get_tax_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<Option<TaxRate>> {
        self.inner.get_tax_rate(tenant_id, rate_id).await
    }

    async fn list_tax_rates(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<TaxRate>> {
        self.inner.list_tax_rates(tenant_id, limit, offset).await
    }

    async fn delete_tax_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<()> {
        self.inner.delete_tax_rate(tenant_id, rate_id).await
    }

    async fn create_customer(&self, customer: Customer) -> StorageResult<()> {
        self.inner.create_customer(customer).await
    }

    async fn update_customer(&self, customer: Customer) -> StorageResult<()> {
        self.inner.update_customer(customer).await
    }

    async fn get_customer(
        &self,
        tenant_id: &str,
        customer_id: &str,
    ) -> StorageResult<Option<Customer>> {
        self.inner.get_customer(tenant_id, customer_id).await
    }

    async fn list_customers(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Customer>> {
        self.inner.list_customers(tenant_id, limit, offset).await
    }

    async fn create_dispute(&self, dispute: DisputeRecord) -> StorageResult<()> {
        self.inner.create_dispute(dispute).await
    }

    async fn update_dispute_status(
        &self,
        tenant_id: &str,
        dispute_id: &str,
        status: &str,
        status_updated_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        self.inner
            .update_dispute_status(tenant_id, dispute_id, status, status_updated_at, updated_at)
            .await
    }

    async fn get_dispute(
        &self,
        tenant_id: &str,
        dispute_id: &str,
    ) -> StorageResult<Option<DisputeRecord>> {
        self.inner.get_dispute(tenant_id, dispute_id).await
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
        self.inner
            .list_disputes(tenant_id, status, source, order_id, limit, offset)
            .await
    }

    async fn create_gift_card(&self, card: GiftCard) -> StorageResult<()> {
        self.inner.create_gift_card(card).await
    }

    async fn update_gift_card(&self, card: GiftCard) -> StorageResult<()> {
        self.inner.update_gift_card(card).await
    }

    async fn get_gift_card(&self, tenant_id: &str, code: &str) -> StorageResult<Option<GiftCard>> {
        self.inner.get_gift_card(tenant_id, code).await
    }

    async fn list_gift_cards(
        &self,
        tenant_id: &str,
        active_only: Option<bool>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<GiftCard>> {
        self.inner
            .list_gift_cards(tenant_id, active_only, limit, offset)
            .await
    }

    async fn adjust_gift_card_balance(
        &self,
        tenant_id: &str,
        code: &str,
        new_balance: i64,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        self.inner
            .adjust_gift_card_balance(tenant_id, code, new_balance, updated_at)
            .await
    }

    async fn try_adjust_gift_card_balance(
        &self,
        tenant_id: &str,
        code: &str,
        deduction: i64,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<Option<i64>> {
        // No caching for atomic balance adjustment - always delegate to inner store
        self.inner
            .try_adjust_gift_card_balance(tenant_id, code, deduction, updated_at)
            .await
    }

    async fn create_collection(&self, collection: Collection) -> StorageResult<()> {
        self.inner.create_collection(collection).await
    }

    async fn update_collection(&self, collection: Collection) -> StorageResult<()> {
        self.inner.update_collection(collection).await
    }

    async fn get_collection(
        &self,
        tenant_id: &str,
        collection_id: &str,
    ) -> StorageResult<Option<Collection>> {
        self.inner.get_collection(tenant_id, collection_id).await
    }

    async fn list_collections(
        &self,
        tenant_id: &str,
        active_only: Option<bool>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Collection>> {
        self.inner
            .list_collections(tenant_id, active_only, limit, offset)
            .await
    }

    async fn delete_collection(&self, tenant_id: &str, collection_id: &str) -> StorageResult<()> {
        self.inner.delete_collection(tenant_id, collection_id).await
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Payments - has_payment_been_processed is cached
    // ─────────────────────────────────────────────────────────────────────────

    async fn record_payment(&self, tx: PaymentTransaction) -> StorageResult<()> {
        let cache_key = Self::tenant_key(&tx.tenant_id, &tx.signature);
        let result = self.inner.record_payment(tx).await?;

        if self.config.enabled {
            self.payment_processed_cache
                .set(cache_key, true, self.config.payment_ttl);
        }

        Ok(result)
    }

    async fn record_payments(&self, txs: Vec<PaymentTransaction>) -> StorageResult<()> {
        // REL-002: Delegate to inner store's batch method first to preserve atomicity.
        // Only update cache after successful batch write to avoid partial cache state.
        self.inner.record_payments(txs.clone()).await?;

        // Update cache for successfully written transactions
        if self.config.enabled {
            for tx in txs {
                let cache_key = Self::tenant_key(&tx.tenant_id, &tx.signature);
                self.payment_processed_cache
                    .set(cache_key, true, self.config.payment_ttl);
            }
        }
        Ok(())
    }

    async fn try_record_payment(&self, tx: PaymentTransaction) -> StorageResult<bool> {
        let cache_key = Self::tenant_key(&tx.tenant_id, &tx.signature);
        let inserted = self.inner.try_record_payment(tx).await?;

        if self.config.enabled && inserted {
            self.payment_processed_cache
                .set(cache_key, true, self.config.payment_ttl);
        }

        Ok(inserted)
    }

    async fn delete_payment(&self, tenant_id: &str, signature: &str) -> StorageResult<()> {
        let cache_key = Self::tenant_key(tenant_id, signature);
        let result = self.inner.delete_payment(tenant_id, signature).await?;

        if self.config.enabled {
            self.payment_processed_cache.invalidate(&cache_key);
        }

        Ok(result)
    }

    async fn has_payment_been_processed(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> StorageResult<bool> {
        let cache_key = Self::tenant_key(tenant_id, signature);

        if self.config.enabled {
            if let Some(true) = self.payment_processed_cache.get(&cache_key) {
                return Ok(true);
            }
        }

        let result = self
            .inner
            .has_payment_been_processed(tenant_id, signature)
            .await?;

        if self.config.enabled && result {
            self.payment_processed_cache
                .set(cache_key, true, self.config.payment_ttl);
        }

        Ok(result)
    }

    async fn get_payment(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> StorageResult<Option<PaymentTransaction>> {
        self.inner.get_payment(tenant_id, signature).await
    }

    async fn get_purchase_by_signature(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> StorageResult<Option<Purchase>> {
        self.inner
            .get_purchase_by_signature(tenant_id, signature)
            .await
    }

    async fn store_credits_hold(&self, hold: CreditsHold) -> StorageResult<()> {
        self.inner.store_credits_hold(hold).await
    }

    async fn get_credits_hold(
        &self,
        tenant_id: &str,
        hold_id: &str,
    ) -> StorageResult<Option<CreditsHold>> {
        self.inner.get_credits_hold(tenant_id, hold_id).await
    }

    async fn delete_credits_hold(&self, tenant_id: &str, hold_id: &str) -> StorageResult<()> {
        self.inner.delete_credits_hold(tenant_id, hold_id).await
    }

    async fn cleanup_expired_credits_holds(&self) -> StorageResult<u64> {
        self.inner.cleanup_expired_credits_holds().await
    }

    async fn list_purchases_by_user_id(
        &self,
        tenant_id: &str,
        user_id: &str,
        limit: i64,
        offset: i64,
    ) -> StorageResult<Vec<Purchase>> {
        self.inner
            .list_purchases_by_user_id(tenant_id, user_id, limit, offset)
            .await
    }

    async fn has_valid_access(
        &self,
        tenant_id: &str,
        resource: &str,
        wallet: &str,
    ) -> StorageResult<bool> {
        self.inner
            .has_valid_access(tenant_id, resource, wallet)
            .await
    }

    async fn archive_old_payments(&self, older_than: DateTime<Utc>) -> StorageResult<u64> {
        self.inner.archive_old_payments(older_than).await
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin nonces - cached
    // ─────────────────────────────────────────────────────────────────────────

    async fn create_nonce(&self, nonce: AdminNonce) -> StorageResult<()> {
        let cache_key = Self::tenant_key(&nonce.tenant_id, &nonce.id);
        let result = self.inner.create_nonce(nonce.clone()).await?;

        if self.config.enabled {
            self.nonce_cache
                .set(cache_key, nonce, self.config.nonce_ttl);
        }

        Ok(result)
    }

    async fn get_nonce(
        &self,
        tenant_id: &str,
        nonce_id: &str,
    ) -> StorageResult<Option<AdminNonce>> {
        let cache_key = Self::tenant_key(tenant_id, nonce_id);

        if self.config.enabled {
            if let Some(cached) = self.nonce_cache.get(&cache_key) {
                if cached.consumed_at.is_none() {
                    return Ok(Some(cached));
                }
            }
        }

        self.inner.get_nonce(tenant_id, nonce_id).await
    }

    async fn consume_nonce(&self, tenant_id: &str, nonce_id: &str) -> StorageResult<()> {
        let result = self.inner.consume_nonce(tenant_id, nonce_id).await?;
        let cache_key = Self::tenant_key(tenant_id, nonce_id);
        self.nonce_cache.invalidate(&cache_key);
        Ok(result)
    }

    async fn cleanup_expired_nonces(&self) -> StorageResult<u64> {
        self.inner.cleanup_expired_nonces().await
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Webhooks - not cached
    // ─────────────────────────────────────────────────────────────────────────

    async fn enqueue_webhook(&self, webhook: PendingWebhook) -> StorageResult<String> {
        self.inner.enqueue_webhook(webhook).await
    }

    async fn dequeue_webhooks(&self, limit: i32) -> StorageResult<Vec<PendingWebhook>> {
        self.inner.dequeue_webhooks(limit).await
    }

    async fn mark_webhook_processing(&self, webhook_id: &str) -> StorageResult<()> {
        self.inner.mark_webhook_processing(webhook_id).await
    }

    async fn mark_webhook_success(&self, webhook_id: &str) -> StorageResult<()> {
        self.inner.mark_webhook_success(webhook_id).await
    }

    async fn mark_webhook_failed(
        &self,
        webhook_id: &str,
        error: &str,
        next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        self.inner
            .mark_webhook_failed(webhook_id, error, next_attempt_at)
            .await
    }

    async fn mark_webhook_retry(
        &self,
        webhook_id: &str,
        error: &str,
        next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        self.inner
            .mark_webhook_retry(webhook_id, error, next_attempt_at)
            .await
    }

    async fn get_webhook(&self, webhook_id: &str) -> StorageResult<Option<PendingWebhook>> {
        self.inner.get_webhook(webhook_id).await
    }

    async fn list_webhooks(
        &self,
        status: Option<WebhookStatus>,
        limit: i32,
    ) -> StorageResult<Vec<PendingWebhook>> {
        self.inner.list_webhooks(status, limit).await
    }

    async fn retry_webhook(&self, webhook_id: &str) -> StorageResult<()> {
        self.inner.retry_webhook(webhook_id).await
    }

    async fn delete_webhook(&self, webhook_id: &str) -> StorageResult<()> {
        self.inner.delete_webhook(webhook_id).await
    }

    async fn cleanup_old_webhooks(&self, retention_days: i32) -> StorageResult<u64> {
        self.inner.cleanup_old_webhooks(retention_days).await
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Email Queue - not cached
    // ─────────────────────────────────────────────────────────────────────────

    async fn enqueue_email(&self, email: PendingEmail) -> StorageResult<String> {
        self.inner.enqueue_email(email).await
    }

    async fn dequeue_emails(&self, limit: i32) -> StorageResult<Vec<PendingEmail>> {
        self.inner.dequeue_emails(limit).await
    }

    async fn mark_email_processing(&self, email_id: &str) -> StorageResult<()> {
        self.inner.mark_email_processing(email_id).await
    }

    async fn mark_email_success(&self, email_id: &str) -> StorageResult<()> {
        self.inner.mark_email_success(email_id).await
    }

    async fn mark_email_retry(
        &self,
        email_id: &str,
        error: &str,
        next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        self.inner
            .mark_email_retry(email_id, error, next_attempt_at)
            .await
    }

    async fn mark_email_failed(&self, email_id: &str, error: &str) -> StorageResult<()> {
        self.inner.mark_email_failed(email_id, error).await
    }

    async fn get_email(&self, email_id: &str) -> StorageResult<Option<PendingEmail>> {
        self.inner.get_email(email_id).await
    }

    async fn cleanup_old_emails(&self, retention_days: i32) -> StorageResult<u64> {
        self.inner.cleanup_old_emails(retention_days).await
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Idempotency - not cached
    // ─────────────────────────────────────────────────────────────────────────

    async fn save_idempotency_key(
        &self,
        key: &str,
        response: IdempotencyResponse,
        ttl: Duration,
    ) -> StorageResult<()> {
        self.inner.save_idempotency_key(key, response, ttl).await
    }

    async fn try_save_idempotency_key(
        &self,
        key: &str,
        response: IdempotencyResponse,
        ttl: Duration,
    ) -> StorageResult<bool> {
        self.inner
            .try_save_idempotency_key(key, response, ttl)
            .await
    }

    async fn get_idempotency_key(&self, key: &str) -> StorageResult<Option<IdempotencyResponse>> {
        self.inner.get_idempotency_key(key).await
    }

    async fn delete_idempotency_key(&self, key: &str) -> StorageResult<()> {
        self.inner.delete_idempotency_key(key).await
    }

    async fn cleanup_expired_idempotency_keys(&self) -> StorageResult<u64> {
        self.inner.cleanup_expired_idempotency_keys().await
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Subscriptions - cached with tenant isolation
    // ─────────────────────────────────────────────────────────────────────────

    async fn save_subscription(&self, sub: Subscription) -> StorageResult<()> {
        let cache_key = Self::tenant_key(&sub.tenant_id, &sub.id);

        // CA-002: Invalidate old wallet cache key if wallet changed
        if self.config.enabled {
            if let Some(existing) = self.subscription_cache.get(&cache_key) {
                if existing.wallet != sub.wallet {
                    if let Some(ref old_wallet) = existing.wallet {
                        let old_wallet_key =
                            Self::wallet_product_key(&sub.tenant_id, old_wallet, &sub.product_id);
                        self.subscription_by_wallet_cache
                            .invalidate(&old_wallet_key);
                    }
                }
            }
        }

        let result = self.inner.save_subscription(sub.clone()).await?;

        if self.config.enabled {
            self.subscription_cache
                .set(cache_key, sub.clone(), self.config.subscription_ttl);
            if let Some(ref wallet) = sub.wallet {
                let wallet_key = Self::wallet_product_key(&sub.tenant_id, wallet, &sub.product_id);
                self.subscription_by_wallet_cache.set(
                    wallet_key,
                    sub,
                    self.config.subscription_ttl,
                );
            }
        }

        Ok(result)
    }

    async fn get_subscription(
        &self,
        tenant_id: &str,
        id: &str,
    ) -> StorageResult<Option<Subscription>> {
        let cache_key = Self::tenant_key(tenant_id, id);

        if self.config.enabled {
            if let Some(cached) = self.subscription_cache.get(&cache_key) {
                return Ok(Some(cached));
            }
        }

        let result = self.inner.get_subscription(tenant_id, id).await?;

        if self.config.enabled {
            if let Some(ref sub) = result {
                self.subscription_cache
                    .set(cache_key, sub.clone(), self.config.subscription_ttl);
            }
        }

        Ok(result)
    }

    async fn get_subscription_by_wallet(
        &self,
        tenant_id: &str,
        wallet: &str,
        product_id: &str,
    ) -> StorageResult<Option<Subscription>> {
        let key = Self::wallet_product_key(tenant_id, wallet, product_id);

        if self.config.enabled {
            if let Some(cached) = self.subscription_by_wallet_cache.get(&key) {
                return Ok(Some(cached));
            }
        }

        let result = self
            .inner
            .get_subscription_by_wallet(tenant_id, wallet, product_id)
            .await?;

        if self.config.enabled {
            if let Some(ref sub) = result {
                self.subscription_by_wallet_cache.set(
                    key,
                    sub.clone(),
                    self.config.subscription_ttl,
                );
            }
        }

        Ok(result)
    }

    async fn get_subscriptions_by_wallet(
        &self,
        tenant_id: &str,
        wallet: &str,
    ) -> StorageResult<Vec<Subscription>> {
        self.inner
            .get_subscriptions_by_wallet(tenant_id, wallet)
            .await
    }

    async fn get_subscription_by_stripe_id(
        &self,
        tenant_id: &str,
        stripe_sub_id: &str,
    ) -> StorageResult<Option<Subscription>> {
        self.inner
            .get_subscription_by_stripe_id(tenant_id, stripe_sub_id)
            .await
    }

    async fn find_subscription_by_stripe_id(
        &self,
        stripe_sub_id: &str,
    ) -> StorageResult<Option<Subscription>> {
        self.inner
            .find_subscription_by_stripe_id(stripe_sub_id)
            .await
    }

    async fn get_subscription_by_payment_signature(
        &self,
        tenant_id: &str,
        payment_signature: &str,
    ) -> StorageResult<Option<Subscription>> {
        // SECURITY (H-004): Delegate to inner store without caching.
        // This check is used for idempotency and should always query fresh data.
        self.inner
            .get_subscription_by_payment_signature(tenant_id, payment_signature)
            .await
    }

    async fn list_active_subscriptions(
        &self,
        tenant_id: &str,
        product_id: Option<&str>,
    ) -> StorageResult<Vec<Subscription>> {
        self.inner
            .list_active_subscriptions(tenant_id, product_id)
            .await
    }

    async fn list_expiring_subscriptions(
        &self,
        tenant_id: &str,
        before: DateTime<Utc>,
    ) -> StorageResult<Vec<Subscription>> {
        self.inner
            .list_expiring_subscriptions(tenant_id, before)
            .await
    }

    async fn update_subscription_status(
        &self,
        tenant_id: &str,
        id: &str,
        status: SubscriptionStatus,
    ) -> StorageResult<()> {
        // Get subscription first to know wallet/product for cache invalidation
        let sub = self.inner.get_subscription(tenant_id, id).await?;

        // REL-003: Invalidate cache BEFORE database write to prevent race condition.
        // If we invalidate after, a concurrent read between db write and invalidation
        // could hit the stale cache. By invalidating first, concurrent reads will
        // query the database and get fresh data.
        let cache_key = Self::tenant_key(tenant_id, id);
        self.subscription_cache.invalidate(&cache_key);

        // Also invalidate wallet cache if subscription has wallet
        if let Some(ref sub) = sub {
            if let Some(ref wallet) = sub.wallet {
                let wallet_key = Self::wallet_product_key(tenant_id, wallet, &sub.product_id);
                self.subscription_by_wallet_cache.invalidate(&wallet_key);
            }
        }

        // Now perform the database update
        self.inner
            .update_subscription_status(tenant_id, id, status)
            .await
    }

    async fn delete_subscription(&self, tenant_id: &str, id: &str) -> StorageResult<()> {
        // Get subscription BEFORE delete to know wallet/product for cache invalidation
        let sub = self.inner.get_subscription(tenant_id, id).await?;

        // REL-003: Invalidate cache BEFORE database write (same pattern as update)
        let cache_key = Self::tenant_key(tenant_id, id);
        self.subscription_cache.invalidate(&cache_key);

        // Also invalidate wallet cache if subscription had wallet
        if let Some(ref sub) = sub {
            if let Some(ref wallet) = sub.wallet {
                let wallet_key = Self::wallet_product_key(tenant_id, wallet, &sub.product_id);
                self.subscription_by_wallet_cache.invalidate(&wallet_key);
            }
        }

        // Now perform the database delete
        self.inner.delete_subscription(tenant_id, id).await
    }

    async fn get_subscriptions_by_stripe_customer_id(
        &self,
        tenant_id: &str,
        customer_id: &str,
    ) -> StorageResult<Vec<Subscription>> {
        self.inner
            .get_subscriptions_by_stripe_customer_id(tenant_id, customer_id)
            .await
    }

    async fn list_subscriptions_by_product(
        &self,
        tenant_id: &str,
        product_id: &str,
    ) -> StorageResult<Vec<Subscription>> {
        self.inner
            .list_subscriptions_by_product(tenant_id, product_id)
            .await
    }

    async fn count_subscriptions_by_plan(
        &self,
        tenant_id: &str,
        plan_id: &str,
    ) -> StorageResult<i64> {
        self.inner
            .count_subscriptions_by_plan(tenant_id, plan_id)
            .await
    }

    async fn list_tenant_ids(&self) -> StorageResult<Vec<String>> {
        self.inner.list_tenant_ids().await
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DLQ - not cached
    // ─────────────────────────────────────────────────────────────────────────

    async fn move_to_dlq(&self, webhook: PendingWebhook, final_error: &str) -> StorageResult<()> {
        self.inner.move_to_dlq(webhook, final_error).await
    }

    async fn list_dlq(&self, limit: i32) -> StorageResult<Vec<DlqWebhook>> {
        self.inner.list_dlq(limit).await
    }

    async fn retry_from_dlq(&self, dlq_id: &str) -> StorageResult<()> {
        self.inner.retry_from_dlq(dlq_id).await
    }

    async fn delete_from_dlq(&self, dlq_id: &str) -> StorageResult<()> {
        self.inner.delete_from_dlq(dlq_id).await
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin Dashboard
    // ─────────────────────────────────────────────────────────────────────────

    async fn get_admin_stats(&self, tenant_id: &str) -> StorageResult<AdminStats> {
        self.inner.get_admin_stats(tenant_id).await
    }

    async fn list_purchases(
        &self,
        tenant_id: &str,
        method: Option<&str>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Purchase>> {
        self.inner
            .list_purchases(tenant_id, method, limit, offset)
            .await
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    async fn close(&self) -> StorageResult<()> {
        self.clear_all();
        self.inner.close().await
    }

    async fn health_check(&self) -> StorageResult<()> {
        self.inner.health_check().await
    }

    // ==================== Chat Sessions (no caching) ====================

    async fn create_chat_session(&self, session: ChatSession) -> StorageResult<()> {
        self.inner.create_chat_session(session).await
    }

    async fn get_chat_session(
        &self,
        tenant_id: &str,
        session_id: &str,
    ) -> StorageResult<Option<ChatSession>> {
        self.inner.get_chat_session(tenant_id, session_id).await
    }

    async fn update_chat_session(
        &self,
        tenant_id: &str,
        session_id: &str,
        message_count: i32,
        last_message_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        self.inner
            .update_chat_session(
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
        self.inner
            .list_chat_sessions(tenant_id, customer_id, status, limit, offset)
            .await
    }

    // ==================== Chat Messages (no caching) ====================

    async fn create_chat_message(&self, message: ChatMessage) -> StorageResult<()> {
        self.inner.create_chat_message(message).await
    }

    async fn list_chat_messages(
        &self,
        tenant_id: &str,
        session_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ChatMessage>> {
        self.inner
            .list_chat_messages(tenant_id, session_id, limit, offset)
            .await
    }

    // ==================== FAQs (no caching) ====================

    async fn create_faq(&self, faq: Faq) -> StorageResult<()> {
        self.inner.create_faq(faq).await
    }

    async fn get_faq(&self, tenant_id: &str, faq_id: &str) -> StorageResult<Option<Faq>> {
        self.inner.get_faq(tenant_id, faq_id).await
    }

    async fn update_faq(&self, faq: Faq) -> StorageResult<()> {
        self.inner.update_faq(faq).await
    }

    async fn delete_faq(&self, tenant_id: &str, faq_id: &str) -> StorageResult<()> {
        self.inner.delete_faq(tenant_id, faq_id).await
    }

    async fn list_faqs(
        &self,
        tenant_id: &str,
        active_only: bool,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<Faq>, i64)> {
        self.inner
            .list_faqs(tenant_id, active_only, limit, offset)
            .await
    }

    async fn search_faqs(
        &self,
        tenant_id: &str,
        query: &str,
        limit: i32,
    ) -> StorageResult<Vec<Faq>> {
        self.inner.search_faqs(tenant_id, query, limit).await
    }

    async fn list_public_faqs(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<Faq>, i64)> {
        self.inner.list_public_faqs(tenant_id, limit, offset).await
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}
