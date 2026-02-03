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

/// Safely convert std Duration to chrono Duration with fallback
pub(crate) fn to_chrono_duration(duration: StdDuration) -> chrono::Duration {
    chrono::Duration::from_std(duration).unwrap_or_else(|_| {
        tracing::warn!("Duration conversion failed, using 5 minute fallback");
        chrono::Duration::minutes(5)
    })
}

/// Type alias for idempotency cache entries
type IdempotencyCache = HashMap<String, (IdempotencyResponse, Instant, StdDuration)>;

fn tenant_key(tenant_id: &str, id: &str) -> String {
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
    carts: Arc<Mutex<HashMap<String, CartQuote>>>,
    refunds: Arc<Mutex<HashMap<String, RefundQuote>>>,
    stripe_refund_requests: Arc<Mutex<HashMap<String, StripeRefundRequest>>>,
    orders: Arc<Mutex<HashMap<String, Order>>>,
    order_history: Arc<Mutex<HashMap<String, Vec<OrderHistoryEntry>>>>,
    fulfillments: Arc<Mutex<HashMap<String, Fulfillment>>>,
    returns: Arc<Mutex<HashMap<String, ReturnRequest>>>,
    inventory_reservations: Arc<Mutex<HashMap<String, InventoryReservation>>>,
    inventory_adjustments: Arc<Mutex<HashMap<String, InventoryAdjustment>>>,
    shipping_profiles: Arc<Mutex<HashMap<String, crate::models::ShippingProfile>>>,
    shipping_rates: Arc<Mutex<HashMap<String, crate::models::ShippingRate>>>,
    tax_rates: Arc<Mutex<HashMap<String, TaxRate>>>,
    customers: Arc<Mutex<HashMap<String, Customer>>>,
    disputes: Arc<Mutex<HashMap<String, DisputeRecord>>>,
    gift_cards: Arc<Mutex<HashMap<String, GiftCard>>>,
    collections: Arc<Mutex<HashMap<String, Collection>>>,
    payments: Arc<Mutex<HashMap<String, PaymentTransaction>>>,
    nonces: Arc<Mutex<HashMap<String, AdminNonce>>>,
    webhooks: Arc<Mutex<HashMap<String, PendingWebhook>>>,
    emails: Arc<Mutex<HashMap<String, PendingEmail>>>,
    dlq: Arc<Mutex<HashMap<String, DlqWebhook>>>,
    idempotency: Arc<Mutex<IdempotencyCache>>,
    subscriptions: Arc<Mutex<HashMap<String, Subscription>>>,
    credits_holds: Arc<Mutex<HashMap<String, CreditsHold>>>,
    chat_sessions: Arc<Mutex<HashMap<String, ChatSession>>>,
    chat_messages: Arc<Mutex<HashMap<String, ChatMessage>>>,
    faqs: Arc<Mutex<HashMap<String, Faq>>>,
    #[cfg(test)]
    fail_try_store_order: Arc<AtomicBool>,
    #[cfg(test)]
    fail_store_cart_quote: Arc<AtomicBool>,
    #[cfg(test)]
    fail_reserve_inventory: Arc<AtomicBool>,
    #[cfg(test)]
    release_inventory_calls: Arc<AtomicUsize>,
    /// Test-only: inventory levels for products (tenant_id:product_id -> quantity)
    #[cfg(test)]
    product_inventory: Arc<Mutex<HashMap<String, i32>>>,
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

#[async_trait]
impl Store for InMemoryStore {
    // ─────────────────────────────────────────────────────────────────────────
    // Cart quotes
    // ─────────────────────────────────────────────────────────────────────────
    async fn store_cart_quote(&self, quote: CartQuote) -> StorageResult<()> {
        #[cfg(test)]
        if self.fail_store_cart_quote.load(Ordering::SeqCst) {
            return Err(StorageError::Unknown(
                "forced store_cart_quote failure".to_string(),
            ));
        }
        let key = tenant_key(&quote.tenant_id, &quote.id);
        self.carts.lock().insert(key, quote);
        Ok(())
    }

    async fn store_cart_quotes(&self, quotes: Vec<CartQuote>) -> StorageResult<()> {
        let mut carts = self.carts.lock();
        for quote in quotes {
            let key = tenant_key(&quote.tenant_id, &quote.id);
            carts.insert(key, quote);
        }
        Ok(())
    }

    async fn get_cart_quote(
        &self,
        tenant_id: &str,
        cart_id: &str,
    ) -> StorageResult<Option<CartQuote>> {
        Ok(self
            .carts
            .lock()
            .get(&tenant_key(tenant_id, cart_id))
            .cloned())
    }

    async fn get_cart_quotes(
        &self,
        tenant_id: &str,
        cart_ids: &[String],
    ) -> StorageResult<Vec<CartQuote>> {
        let carts = self.carts.lock();
        Ok(cart_ids
            .iter()
            .filter_map(|id| carts.get(&tenant_key(tenant_id, id)).cloned())
            .collect())
    }

    async fn mark_cart_paid(
        &self,
        tenant_id: &str,
        cart_id: &str,
        wallet: &str,
    ) -> StorageResult<()> {
        let mut carts = self.carts.lock();
        if let Some(c) = carts.get_mut(&tenant_key(tenant_id, cart_id)) {
            c.wallet_paid_by = Some(wallet.to_string());
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn has_cart_access(
        &self,
        tenant_id: &str,
        cart_id: &str,
        wallet: &str,
    ) -> StorageResult<bool> {
        let carts = self.carts.lock();
        Ok(carts
            .get(&tenant_key(tenant_id, cart_id))
            .and_then(|c| c.wallet_paid_by.as_ref())
            .map(|w| w == wallet)
            .unwrap_or(false))
    }

    async fn cleanup_expired_cart_quotes(&self) -> StorageResult<u64> {
        let now = Utc::now();
        let mut carts = self.carts.lock();
        let expired_ids: Vec<String> = carts
            .iter()
            .filter(|(_, c)| c.expires_at < now && c.wallet_paid_by.is_none())
            .map(|(id, _)| id.clone())
            .collect();
        let count = expired_ids.len() as u64;
        for id in expired_ids {
            carts.remove(&id);
        }
        Ok(count)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Refunds
    // ─────────────────────────────────────────────────────────────────────────
    async fn store_refund_quote(&self, quote: RefundQuote) -> StorageResult<()> {
        let key = tenant_key(&quote.tenant_id, &quote.id);
        self.refunds.lock().insert(key, quote);
        Ok(())
    }

    async fn store_refund_quotes(&self, quotes: Vec<RefundQuote>) -> StorageResult<()> {
        let mut refunds = self.refunds.lock();
        for quote in quotes {
            let key = tenant_key(&quote.tenant_id, &quote.id);
            refunds.insert(key, quote);
        }
        Ok(())
    }

    async fn get_refund_quote(
        &self,
        tenant_id: &str,
        refund_id: &str,
    ) -> StorageResult<Option<RefundQuote>> {
        Ok(self
            .refunds
            .lock()
            .get(&tenant_key(tenant_id, refund_id))
            .cloned())
    }

    async fn get_refund_by_original_purchase_id(
        &self,
        tenant_id: &str,
        original_purchase_id: &str,
    ) -> StorageResult<Option<RefundQuote>> {
        Ok(self
            .refunds
            .lock()
            .values()
            .find(|r| r.tenant_id == tenant_id && r.original_purchase_id == original_purchase_id)
            .cloned())
    }

    async fn get_all_refunds_for_purchase(
        &self,
        tenant_id: &str,
        original_purchase_id: &str,
    ) -> StorageResult<Vec<RefundQuote>> {
        Ok(self
            .refunds
            .lock()
            .values()
            .filter(|r| r.tenant_id == tenant_id && r.original_purchase_id == original_purchase_id)
            .cloned()
            .collect())
    }

    async fn list_pending_refunds(
        &self,
        tenant_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<RefundQuote>> {
        let now = Utc::now();
        if limit <= 0 {
            return Ok(Vec::new());
        }
        let mut refunds: Vec<RefundQuote> = self
            .refunds
            .lock()
            .values()
            .filter(|r| r.tenant_id == tenant_id && !r.is_finalized() && !r.is_expired_at(now))
            .cloned()
            .collect();
        refunds.sort_by_key(|r| r.created_at);
        refunds.truncate(limit as usize);
        Ok(refunds)
    }

    async fn mark_refund_processed(
        &self,
        tenant_id: &str,
        refund_id: &str,
        processed_by: &str,
        signature: &str,
    ) -> StorageResult<()> {
        let mut refunds = self.refunds.lock();
        if let Some(r) = refunds.get_mut(&tenant_key(tenant_id, refund_id)) {
            r.processed_by = Some(processed_by.to_string());
            r.processed_at = Some(Utc::now());
            r.signature = Some(signature.to_string());
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn delete_refund_quote(&self, tenant_id: &str, refund_id: &str) -> StorageResult<()> {
        self.refunds
            .lock()
            .remove(&tenant_key(tenant_id, refund_id));
        Ok(())
    }

    async fn cleanup_expired_refund_quotes(&self) -> StorageResult<u64> {
        let now = Utc::now();
        let mut refunds = self.refunds.lock();
        // Only cleanup refunds that are expired AND not finalized (pending only)
        // Finalized refunds (approved/denied) should be kept for audit
        let expired_ids: Vec<String> = refunds
            .iter()
            .filter(|(_, r)| r.expires_at < now && !r.is_finalized())
            .map(|(id, _)| id.clone())
            .collect();
        let count = expired_ids.len() as u64;
        for id in expired_ids {
            refunds.remove(&id);
        }
        Ok(count)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Stripe refund requests
    // ─────────────────────────────────────────────────────────────────────────

    async fn store_stripe_refund_request(&self, req: StripeRefundRequest) -> StorageResult<()> {
        let key = tenant_key(&req.tenant_id, &req.id);
        self.stripe_refund_requests.lock().insert(key, req);
        Ok(())
    }

    async fn get_stripe_refund_request(
        &self,
        tenant_id: &str,
        request_id: &str,
    ) -> StorageResult<Option<StripeRefundRequest>> {
        Ok(self
            .stripe_refund_requests
            .lock()
            .get(&tenant_key(tenant_id, request_id))
            .cloned())
    }

    async fn list_pending_stripe_refund_requests(
        &self,
        tenant_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<StripeRefundRequest>> {
        if limit <= 0 {
            return Ok(Vec::new());
        }

        let mut reqs: Vec<StripeRefundRequest> = self
            .stripe_refund_requests
            .lock()
            .values()
            .filter(|r| r.tenant_id == tenant_id && r.processed_at.is_none())
            .cloned()
            .collect();
        reqs.sort_by_key(|r| r.created_at);
        reqs.truncate(limit as usize);
        Ok(reqs)
    }

    async fn get_pending_stripe_refund_request_by_original_purchase_id(
        &self,
        tenant_id: &str,
        original_purchase_id: &str,
    ) -> StorageResult<Option<StripeRefundRequest>> {
        Ok(self
            .stripe_refund_requests
            .lock()
            .values()
            .filter(|r| r.tenant_id == tenant_id && r.original_purchase_id == original_purchase_id)
            .filter(|r| r.processed_at.is_none())
            .max_by_key(|r| r.created_at)
            .cloned())
    }

    async fn get_stripe_refund_request_by_charge_id(
        &self,
        tenant_id: &str,
        stripe_charge_id: &str,
    ) -> StorageResult<Option<StripeRefundRequest>> {
        Ok(self
            .stripe_refund_requests
            .lock()
            .values()
            .filter(|r| r.tenant_id == tenant_id)
            .filter(|r| r.stripe_charge_id.as_deref() == Some(stripe_charge_id))
            .max_by_key(|r| r.created_at)
            .cloned())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Orders
    // ─────────────────────────────────────────────────────────────────────────

    async fn try_store_order(&self, order: Order) -> StorageResult<bool> {
        #[cfg(test)]
        if self.fail_try_store_order.load(Ordering::SeqCst) {
            return Err(StorageError::Unknown(
                "forced try_store_order failure".to_string(),
            ));
        }
        let mut orders = self.orders.lock();

        let exists = orders.values().any(|o| {
            o.tenant_id == order.tenant_id
                && o.source == order.source
                && o.purchase_id == order.purchase_id
        });
        if exists {
            return Ok(false);
        }

        let key = tenant_key(&order.tenant_id, &order.id);
        orders.insert(key, order);
        Ok(true)
    }

    async fn get_order(&self, tenant_id: &str, order_id: &str) -> StorageResult<Option<Order>> {
        Ok(self
            .orders
            .lock()
            .get(&tenant_key(tenant_id, order_id))
            .cloned())
    }

    async fn list_orders(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Order>> {
        if limit <= 0 {
            return Ok(Vec::new());
        }

        let mut orders: Vec<Order> = self
            .orders
            .lock()
            .values()
            .filter(|o| o.tenant_id == tenant_id)
            .cloned()
            .collect();

        orders.sort_by_key(|o| std::cmp::Reverse(o.created_at));

        let offset = offset.max(0) as usize;
        let limit = limit as usize;
        if offset >= orders.len() {
            return Ok(Vec::new());
        }

        let end = (offset + limit).min(orders.len());
        Ok(orders[offset..end].to_vec())
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
        if limit <= 0 {
            return Ok((Vec::new(), 0));
        }

        let search = search.and_then(|s| {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_lowercase())
            }
        });

        let mut orders: Vec<Order> = self
            .orders
            .lock()
            .values()
            .filter(|o| o.tenant_id == tenant_id)
            .filter(|o| status.map(|s| o.status == s).unwrap_or(true))
            .filter(|o| {
                if let Some(ref needle) = search {
                    let hay = format!(
                        "{} {} {}",
                        o.id.to_lowercase(),
                        o.purchase_id.to_lowercase(),
                        o.customer_email.clone().unwrap_or_default().to_lowercase()
                    );
                    hay.contains(needle)
                } else {
                    true
                }
            })
            .filter(|o| created_before.map(|t| o.created_at < t).unwrap_or(true))
            .filter(|o| created_after.map(|t| o.created_at > t).unwrap_or(true))
            .cloned()
            .collect();

        orders.sort_by_key(|o| std::cmp::Reverse(o.created_at));
        let total = orders.len() as i64;

        let offset = offset.max(0) as usize;
        let limit = limit as usize;
        if offset >= orders.len() {
            return Ok((Vec::new(), total));
        }
        let end = (offset + limit).min(orders.len());
        Ok((orders[offset..end].to_vec(), total))
    }

    async fn update_order_status(
        &self,
        tenant_id: &str,
        order_id: &str,
        status: &str,
        status_updated_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        let mut orders = self.orders.lock();
        let key = tenant_key(tenant_id, order_id);
        match orders.get_mut(&key) {
            Some(order) => {
                order.status = status.to_string();
                order.status_updated_at = Some(status_updated_at);
                order.updated_at = Some(updated_at);
                Ok(())
            }
            None => Err(StorageError::NotFound),
        }
    }

    async fn append_order_history(&self, entry: OrderHistoryEntry) -> StorageResult<()> {
        let mut history = self.order_history.lock();
        let key = tenant_key(&entry.tenant_id, &entry.order_id);
        history.entry(key).or_default().push(entry);
        Ok(())
    }

    async fn list_order_history(
        &self,
        tenant_id: &str,
        order_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<OrderHistoryEntry>> {
        let key = tenant_key(tenant_id, order_id);
        let mut entries = self
            .order_history
            .lock()
            .get(&key)
            .cloned()
            .unwrap_or_default();
        entries.sort_by_key(|e| std::cmp::Reverse(e.created_at));
        if limit <= 0 {
            return Ok(Vec::new());
        }
        let limit = limit as usize;
        Ok(entries.into_iter().take(limit).collect())
    }

    async fn create_fulfillment(&self, fulfillment: Fulfillment) -> StorageResult<()> {
        let key = tenant_key(&fulfillment.tenant_id, &fulfillment.id);
        self.fulfillments.lock().insert(key, fulfillment);
        Ok(())
    }

    async fn list_fulfillments(
        &self,
        tenant_id: &str,
        order_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<Fulfillment>> {
        let mut items: Vec<Fulfillment> = self
            .fulfillments
            .lock()
            .values()
            .filter(|f| f.tenant_id == tenant_id && f.order_id == order_id)
            .cloned()
            .collect();
        items.sort_by_key(|f| std::cmp::Reverse(f.created_at));
        if limit <= 0 {
            return Ok(Vec::new());
        }
        Ok(items.into_iter().take(limit as usize).collect())
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
        let key = tenant_key(tenant_id, fulfillment_id);
        let mut fulfillments = self.fulfillments.lock();
        match fulfillments.get_mut(&key) {
            Some(f) => {
                f.status = status.to_string();
                f.shipped_at = shipped_at;
                f.delivered_at = delivered_at;
                f.updated_at = Some(updated_at);
                f.tracking_number = tracking_number.map(|v| v.to_string());
                f.tracking_url = tracking_url.map(|v| v.to_string());
                f.carrier = carrier.map(|v| v.to_string());
                Ok(Some(f.clone()))
            }
            None => Ok(None),
        }
    }

    async fn create_return_request(&self, request: ReturnRequest) -> StorageResult<()> {
        let key = tenant_key(&request.tenant_id, &request.id);
        self.returns.lock().insert(key, request);
        Ok(())
    }

    async fn update_return_status(
        &self,
        tenant_id: &str,
        return_id: &str,
        status: &str,
        status_updated_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        let key = tenant_key(tenant_id, return_id);
        let mut returns = self.returns.lock();
        if let Some(r) = returns.get_mut(&key) {
            r.status = status.to_string();
            r.status_updated_at = Some(status_updated_at);
            r.updated_at = Some(updated_at);
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn get_return_request(
        &self,
        tenant_id: &str,
        return_id: &str,
    ) -> StorageResult<Option<ReturnRequest>> {
        Ok(self
            .returns
            .lock()
            .get(&tenant_key(tenant_id, return_id))
            .cloned())
    }

    async fn list_return_requests(
        &self,
        tenant_id: &str,
        status: Option<&str>,
        order_id: Option<&str>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ReturnRequest>> {
        if limit <= 0 {
            return Ok(Vec::new());
        }
        let mut items: Vec<_> = self
            .returns
            .lock()
            .values()
            .filter(|r| r.tenant_id == tenant_id)
            .filter(|r| status.map(|s| r.status == s).unwrap_or(true))
            .filter(|r| order_id.map(|id| r.order_id == id).unwrap_or(true))
            .cloned()
            .collect();
        items.sort_by_key(|r| std::cmp::Reverse(r.created_at));
        let offset = offset.max(0) as usize;
        let limit = limit as usize;
        if offset >= items.len() {
            return Ok(Vec::new());
        }
        let end = (offset + limit).min(items.len());
        Ok(items[offset..end].to_vec())
    }

    async fn reserve_inventory(&self, reservation: InventoryReservation) -> StorageResult<()> {
        #[cfg(test)]
        if self.fail_reserve_inventory.load(Ordering::SeqCst) {
            return Err(StorageError::Unknown(
                "forced reserve_inventory failure".to_string(),
            ));
        }

        #[cfg(test)]
        {
            // In-memory inventory check for tests: verify sufficient inventory exists
            let product_key = format!("{}:{}", reservation.tenant_id, reservation.product_id);
            let inventory_quantity = self.product_inventory.lock().get(&product_key).copied();

            if let Some(qty) = inventory_quantity {
                // For tests, assume no backorder policy (conservative)
                let now = Utc::now();
                let reserved: i64 = self
                    .inventory_reservations
                    .lock()
                    .values()
                    .filter(|r| r.tenant_id == reservation.tenant_id)
                    .filter(|r| r.product_id == reservation.product_id)
                    .filter(|r| r.variant_id == reservation.variant_id)
                    .filter(|r| r.status == "active")
                    .filter(|r| r.expires_at > now)
                    .map(|r| r.quantity as i64)
                    .sum();
                if reserved + reservation.quantity as i64 > qty as i64 {
                    return Err(StorageError::Conflict);
                }
            }
        }

        let key = tenant_key(&reservation.tenant_id, &reservation.id);
        self.inventory_reservations.lock().insert(key, reservation);
        Ok(())
    }

    async fn get_active_inventory_reservation_quantity(
        &self,
        tenant_id: &str,
        product_id: &str,
        variant_id: Option<&str>,
        now: DateTime<Utc>,
    ) -> StorageResult<i64> {
        let total = self
            .inventory_reservations
            .lock()
            .values()
            .filter(|r| r.tenant_id == tenant_id)
            .filter(|r| r.product_id == product_id)
            .filter(|r| r.variant_id.as_deref() == variant_id)
            .filter(|r| r.status == "active")
            .filter(|r| r.expires_at > now)
            .map(|r| r.quantity as i64)
            .sum();
        Ok(total)
    }

    async fn get_active_inventory_reservation_quantity_excluding_cart(
        &self,
        tenant_id: &str,
        product_id: &str,
        variant_id: Option<&str>,
        exclude_cart_id: &str,
        now: DateTime<Utc>,
    ) -> StorageResult<i64> {
        let total = self
            .inventory_reservations
            .lock()
            .values()
            .filter(|r| r.tenant_id == tenant_id)
            .filter(|r| r.product_id == product_id)
            .filter(|r| r.variant_id.as_deref() == variant_id)
            .filter(|r| r.status == "active")
            .filter(|r| r.expires_at > now)
            .filter(|r| r.cart_id.as_deref() != Some(exclude_cart_id))
            .map(|r| r.quantity as i64)
            .sum();
        Ok(total)
    }

    async fn list_active_reservations_for_cart(
        &self,
        tenant_id: &str,
        cart_id: &str,
    ) -> StorageResult<Vec<InventoryReservation>> {
        Ok(self
            .inventory_reservations
            .lock()
            .values()
            .filter(|r| r.tenant_id == tenant_id)
            .filter(|r| r.cart_id.as_deref() == Some(cart_id))
            .filter(|r| r.status == "active")
            .cloned()
            .collect())
    }

    async fn release_inventory_reservations(
        &self,
        tenant_id: &str,
        cart_id: &str,
        _released_at: DateTime<Utc>,
    ) -> StorageResult<u64> {
        #[cfg(test)]
        self.release_inventory_calls.fetch_add(1, Ordering::SeqCst);
        let mut reservations = self.inventory_reservations.lock();
        let mut count = 0_u64;
        for reservation in reservations.values_mut() {
            if reservation.tenant_id == tenant_id
                && reservation.cart_id.as_deref() == Some(cart_id)
                && reservation.status == "active"
            {
                reservation.status = "released".to_string();
                count += 1;
            }
        }
        Ok(count)
    }

    async fn convert_inventory_reservations(
        &self,
        tenant_id: &str,
        cart_id: &str,
        _converted_at: DateTime<Utc>,
    ) -> StorageResult<u64> {
        let mut reservations = self.inventory_reservations.lock();
        let mut count = 0_u64;
        for reservation in reservations.values_mut() {
            if reservation.tenant_id == tenant_id
                && reservation.cart_id.as_deref() == Some(cart_id)
                && reservation.status == "active"
            {
                reservation.status = "converted".to_string();
                count += 1;
            }
        }
        Ok(count)
    }

    async fn cleanup_expired_inventory_reservations(
        &self,
        now: DateTime<Utc>,
    ) -> StorageResult<u64> {
        let mut reservations = self.inventory_reservations.lock();
        let mut count = 0_u64;
        for reservation in reservations.values_mut() {
            if reservation.status == "active" && reservation.expires_at < now {
                reservation.status = "released".to_string();
                count += 1;
            }
        }
        Ok(count)
    }

    async fn record_inventory_adjustment(
        &self,
        adjustment: InventoryAdjustment,
    ) -> StorageResult<()> {
        let key = tenant_key(&adjustment.tenant_id, &adjustment.id);
        self.inventory_adjustments.lock().insert(key, adjustment);
        Ok(())
    }

    async fn list_inventory_adjustments(
        &self,
        tenant_id: &str,
        product_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<InventoryAdjustment>> {
        if limit <= 0 {
            return Ok(Vec::new());
        }

        let mut items: Vec<InventoryAdjustment> = self
            .inventory_adjustments
            .lock()
            .values()
            .filter(|a| a.tenant_id == tenant_id && a.product_id == product_id)
            .cloned()
            .collect();
        items.sort_by_key(|a| std::cmp::Reverse(a.created_at));

        let offset = offset.max(0) as usize;
        let limit = limit as usize;
        if offset >= items.len() {
            return Ok(Vec::new());
        }
        let end = (offset + limit).min(items.len());
        Ok(items[offset..end].to_vec())
    }

    async fn update_inventory_batch(
        &self,
        tenant_id: &str,
        updates: Vec<(String, Option<String>, i32)>, // (product_id, variant_id, delta)
        reason: Option<&str>,
        actor: Option<&str>,
    ) -> StorageResult<HashMap<String, (i32, i32)>> {
        // Memory store implementation for batch inventory updates
        // In non-test mode, we just record the adjustments for audit trail
        // In test mode, we also track inventory changes
        let mut results = HashMap::new();
        let now = Utc::now();

        for (product_id, variant_id, delta) in updates {
            #[cfg(test)]
            {
                // Get current inventory from test-only storage if available
                let key = format!("{}:{}", tenant_id, product_id);
                let current_qty = self
                    .product_inventory
                    .lock()
                    .get(&key)
                    .copied()
                    .unwrap_or(100); // Default starting inventory

                let next_qty = current_qty.saturating_sub(delta).max(0);

                // Update stored inventory
                self.product_inventory.lock().insert(key, next_qty);

                // Record adjustment
                let adjustment = InventoryAdjustment {
                    id: uuid::Uuid::new_v4().to_string(),
                    tenant_id: tenant_id.to_string(),
                    product_id: product_id.clone(),
                    variant_id: variant_id.clone(),
                    delta: -delta,
                    quantity_before: current_qty,
                    quantity_after: next_qty,
                    reason: reason.map(|s| s.to_string()),
                    actor: actor.map(|s| s.to_string()),
                    created_at: now,
                };
                let adj_key = tenant_key(tenant_id, &adjustment.id);
                self.inventory_adjustments
                    .lock()
                    .insert(adj_key, adjustment);

                results.insert(product_id, (current_qty, next_qty));
            }

            #[cfg(not(test))]
            {
                // In non-test mode, just record the adjustment with default values
                let current_qty: i32 = 100; // Default assumed inventory
                let next_qty = current_qty.saturating_sub(delta).max(0);

                let adjustment = InventoryAdjustment {
                    id: uuid::Uuid::new_v4().to_string(),
                    tenant_id: tenant_id.to_string(),
                    product_id: product_id.clone(),
                    variant_id: variant_id.clone(),
                    delta: -delta,
                    quantity_before: current_qty,
                    quantity_after: next_qty,
                    reason: reason.map(|s| s.to_string()),
                    actor: actor.map(|s| s.to_string()),
                    created_at: now,
                };
                let adj_key = tenant_key(tenant_id, &adjustment.id);
                self.inventory_adjustments
                    .lock()
                    .insert(adj_key, adjustment);

                results.insert(product_id, (current_qty, next_qty));
            }
        }

        Ok(results)
    }

    async fn create_shipping_profile(
        &self,
        profile: crate::models::ShippingProfile,
    ) -> StorageResult<()> {
        let key = tenant_key(&profile.tenant_id, &profile.id);
        self.shipping_profiles.lock().insert(key, profile);
        Ok(())
    }

    async fn update_shipping_profile(
        &self,
        profile: crate::models::ShippingProfile,
    ) -> StorageResult<()> {
        let key = tenant_key(&profile.tenant_id, &profile.id);
        let mut profiles = self.shipping_profiles.lock();
        if let std::collections::hash_map::Entry::Occupied(mut entry) = profiles.entry(key) {
            entry.insert(profile);
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn get_shipping_profile(
        &self,
        tenant_id: &str,
        profile_id: &str,
    ) -> StorageResult<Option<crate::models::ShippingProfile>> {
        Ok(self
            .shipping_profiles
            .lock()
            .get(&tenant_key(tenant_id, profile_id))
            .cloned())
    }

    async fn list_shipping_profiles(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<crate::models::ShippingProfile>> {
        if limit <= 0 {
            return Ok(Vec::new());
        }
        let mut items: Vec<_> = self
            .shipping_profiles
            .lock()
            .values()
            .filter(|p| p.tenant_id == tenant_id)
            .cloned()
            .collect();
        items.sort_by_key(|p| std::cmp::Reverse(p.created_at));
        let offset = offset.max(0) as usize;
        let limit = limit as usize;
        if offset >= items.len() {
            return Ok(Vec::new());
        }
        let end = (offset + limit).min(items.len());
        Ok(items[offset..end].to_vec())
    }

    async fn delete_shipping_profile(
        &self,
        tenant_id: &str,
        profile_id: &str,
    ) -> StorageResult<()> {
        let key = tenant_key(tenant_id, profile_id);
        let removed = self.shipping_profiles.lock().remove(&key);
        if removed.is_some() {
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn create_shipping_rate(&self, rate: crate::models::ShippingRate) -> StorageResult<()> {
        let key = tenant_key(&rate.tenant_id, &rate.id);
        self.shipping_rates.lock().insert(key, rate);
        Ok(())
    }

    async fn update_shipping_rate(&self, rate: crate::models::ShippingRate) -> StorageResult<()> {
        let key = tenant_key(&rate.tenant_id, &rate.id);
        let mut rates = self.shipping_rates.lock();
        if let std::collections::hash_map::Entry::Occupied(mut entry) = rates.entry(key) {
            entry.insert(rate);
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn list_shipping_rates(
        &self,
        tenant_id: &str,
        profile_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<crate::models::ShippingRate>> {
        if limit <= 0 {
            return Ok(Vec::new());
        }
        let mut items: Vec<_> = self
            .shipping_rates
            .lock()
            .values()
            .filter(|r| r.tenant_id == tenant_id && r.profile_id == profile_id)
            .cloned()
            .collect();
        items.sort_by_key(|r| std::cmp::Reverse(r.created_at));
        let offset = offset.max(0) as usize;
        let limit = limit as usize;
        if offset >= items.len() {
            return Ok(Vec::new());
        }
        let end = (offset + limit).min(items.len());
        Ok(items[offset..end].to_vec())
    }

    async fn delete_shipping_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<()> {
        let key = tenant_key(tenant_id, rate_id);
        let removed = self.shipping_rates.lock().remove(&key);
        if removed.is_some() {
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn create_tax_rate(&self, rate: TaxRate) -> StorageResult<()> {
        let key = tenant_key(&rate.tenant_id, &rate.id);
        self.tax_rates.lock().insert(key, rate);
        Ok(())
    }

    async fn update_tax_rate(&self, rate: TaxRate) -> StorageResult<()> {
        let key = tenant_key(&rate.tenant_id, &rate.id);
        let mut rates = self.tax_rates.lock();
        if let std::collections::hash_map::Entry::Occupied(mut entry) = rates.entry(key) {
            entry.insert(rate);
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn get_tax_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<Option<TaxRate>> {
        Ok(self
            .tax_rates
            .lock()
            .get(&tenant_key(tenant_id, rate_id))
            .cloned())
    }

    async fn list_tax_rates(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<TaxRate>> {
        if limit <= 0 {
            return Ok(Vec::new());
        }
        let mut items: Vec<_> = self
            .tax_rates
            .lock()
            .values()
            .filter(|r| r.tenant_id == tenant_id)
            .cloned()
            .collect();
        items.sort_by_key(|r| std::cmp::Reverse(r.created_at));
        let offset = offset.max(0) as usize;
        let limit = limit as usize;
        if offset >= items.len() {
            return Ok(Vec::new());
        }
        let end = (offset + limit).min(items.len());
        Ok(items[offset..end].to_vec())
    }

    async fn delete_tax_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<()> {
        let key = tenant_key(tenant_id, rate_id);
        let removed = self.tax_rates.lock().remove(&key);
        if removed.is_some() {
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn create_customer(&self, customer: Customer) -> StorageResult<()> {
        let key = tenant_key(&customer.tenant_id, &customer.id);
        self.customers.lock().insert(key, customer);
        Ok(())
    }

    async fn update_customer(&self, customer: Customer) -> StorageResult<()> {
        let key = tenant_key(&customer.tenant_id, &customer.id);
        let mut customers = self.customers.lock();
        if let std::collections::hash_map::Entry::Occupied(mut entry) = customers.entry(key) {
            entry.insert(customer);
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn get_customer(
        &self,
        tenant_id: &str,
        customer_id: &str,
    ) -> StorageResult<Option<Customer>> {
        Ok(self
            .customers
            .lock()
            .get(&tenant_key(tenant_id, customer_id))
            .cloned())
    }

    async fn list_customers(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Customer>> {
        if limit <= 0 {
            return Ok(Vec::new());
        }
        let mut items: Vec<_> = self
            .customers
            .lock()
            .values()
            .filter(|c| c.tenant_id == tenant_id)
            .cloned()
            .collect();
        items.sort_by_key(|c| std::cmp::Reverse(c.created_at));
        let offset = offset.max(0) as usize;
        let limit = limit as usize;
        if offset >= items.len() {
            return Ok(Vec::new());
        }
        let end = (offset + limit).min(items.len());
        Ok(items[offset..end].to_vec())
    }

    async fn create_dispute(&self, dispute: DisputeRecord) -> StorageResult<()> {
        let key = tenant_key(&dispute.tenant_id, &dispute.id);
        self.disputes.lock().insert(key, dispute);
        Ok(())
    }

    async fn update_dispute_status(
        &self,
        tenant_id: &str,
        dispute_id: &str,
        status: &str,
        status_updated_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        let key = tenant_key(tenant_id, dispute_id);
        let mut disputes = self.disputes.lock();
        if let Some(d) = disputes.get_mut(&key) {
            d.status = status.to_string();
            d.status_updated_at = Some(status_updated_at);
            d.updated_at = Some(updated_at);
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn get_dispute(
        &self,
        tenant_id: &str,
        dispute_id: &str,
    ) -> StorageResult<Option<DisputeRecord>> {
        Ok(self
            .disputes
            .lock()
            .get(&tenant_key(tenant_id, dispute_id))
            .cloned())
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
        if limit <= 0 {
            return Ok(Vec::new());
        }
        let mut items: Vec<_> = self
            .disputes
            .lock()
            .values()
            .filter(|d| d.tenant_id == tenant_id)
            .filter(|d| status.map(|s| d.status == s).unwrap_or(true))
            .filter(|d| source.map(|s| d.source == s).unwrap_or(true))
            .filter(|d| {
                order_id
                    .map(|id| d.order_id.as_deref() == Some(id))
                    .unwrap_or(true)
            })
            .cloned()
            .collect();
        items.sort_by_key(|d| std::cmp::Reverse(d.created_at));
        let offset = offset.max(0) as usize;
        let limit = limit as usize;
        if offset >= items.len() {
            return Ok(Vec::new());
        }
        let end = (offset + limit).min(items.len());
        Ok(items[offset..end].to_vec())
    }

    async fn create_gift_card(&self, card: GiftCard) -> StorageResult<()> {
        let key = tenant_key(&card.tenant_id, &card.code);
        self.gift_cards.lock().insert(key, card);
        Ok(())
    }

    async fn update_gift_card(&self, card: GiftCard) -> StorageResult<()> {
        let key = tenant_key(&card.tenant_id, &card.code);
        let mut cards = self.gift_cards.lock();
        if let std::collections::hash_map::Entry::Occupied(mut entry) = cards.entry(key) {
            entry.insert(card);
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn get_gift_card(&self, tenant_id: &str, code: &str) -> StorageResult<Option<GiftCard>> {
        Ok(self
            .gift_cards
            .lock()
            .get(&tenant_key(tenant_id, code))
            .cloned())
    }

    async fn list_gift_cards(
        &self,
        tenant_id: &str,
        active_only: Option<bool>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<GiftCard>> {
        if limit <= 0 {
            return Ok(Vec::new());
        }
        let mut items: Vec<_> = self
            .gift_cards
            .lock()
            .values()
            .filter(|c| c.tenant_id == tenant_id)
            .filter(|c| active_only.map(|a| c.active == a).unwrap_or(true))
            .cloned()
            .collect();
        items.sort_by_key(|c| std::cmp::Reverse(c.created_at));
        let offset = offset.max(0) as usize;
        let limit = limit as usize;
        if offset >= items.len() {
            return Ok(Vec::new());
        }
        let end = (offset + limit).min(items.len());
        Ok(items[offset..end].to_vec())
    }

    async fn adjust_gift_card_balance(
        &self,
        tenant_id: &str,
        code: &str,
        new_balance: i64,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        let key = tenant_key(tenant_id, code);
        let mut cards = self.gift_cards.lock();
        if let Some(card) = cards.get_mut(&key) {
            card.balance = new_balance;
            card.updated_at = updated_at;
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn try_adjust_gift_card_balance(
        &self,
        tenant_id: &str,
        code: &str,
        deduction: i64,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<Option<i64>> {
        let key = tenant_key(tenant_id, code);
        let mut cards = self.gift_cards.lock();
        if let Some(card) = cards.get_mut(&key) {
            if card.balance >= deduction {
                card.balance -= deduction;
                card.updated_at = updated_at;
                Ok(Some(card.balance))
            } else {
                Ok(None) // Insufficient funds
            }
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn create_collection(&self, collection: Collection) -> StorageResult<()> {
        let key = tenant_key(&collection.tenant_id, &collection.id);
        self.collections.lock().insert(key, collection);
        Ok(())
    }

    async fn update_collection(&self, collection: Collection) -> StorageResult<()> {
        let key = tenant_key(&collection.tenant_id, &collection.id);
        let mut collections = self.collections.lock();
        if let std::collections::hash_map::Entry::Occupied(mut entry) = collections.entry(key) {
            entry.insert(collection);
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn get_collection(
        &self,
        tenant_id: &str,
        collection_id: &str,
    ) -> StorageResult<Option<Collection>> {
        Ok(self
            .collections
            .lock()
            .get(&tenant_key(tenant_id, collection_id))
            .cloned())
    }

    async fn list_collections(
        &self,
        tenant_id: &str,
        active_only: Option<bool>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Collection>> {
        if limit <= 0 {
            return Ok(Vec::new());
        }
        let mut items: Vec<_> = self
            .collections
            .lock()
            .values()
            .filter(|c| c.tenant_id == tenant_id)
            .filter(|c| active_only.map(|a| c.active == a).unwrap_or(true))
            .cloned()
            .collect();
        items.sort_by_key(|c| std::cmp::Reverse(c.created_at));
        let offset = offset.max(0) as usize;
        let limit = limit as usize;
        if offset >= items.len() {
            return Ok(Vec::new());
        }
        let end = (offset + limit).min(items.len());
        Ok(items[offset..end].to_vec())
    }

    async fn delete_collection(&self, tenant_id: &str, collection_id: &str) -> StorageResult<()> {
        let key = tenant_key(tenant_id, collection_id);
        let removed = self.collections.lock().remove(&key);
        if removed.is_some() {
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Payments
    // ─────────────────────────────────────────────────────────────────────────
    async fn record_payment(&self, tx: PaymentTransaction) -> StorageResult<()> {
        let key = tenant_key(&tx.tenant_id, &tx.signature);
        self.payments.lock().insert(key, tx);
        Ok(())
    }

    async fn record_payments(&self, txs: Vec<PaymentTransaction>) -> StorageResult<()> {
        let mut payments = self.payments.lock();
        for tx in txs {
            let key = tenant_key(&tx.tenant_id, &tx.signature);
            payments.insert(key, tx);
        }
        Ok(())
    }

    async fn try_record_payment(&self, tx: PaymentTransaction) -> StorageResult<bool> {
        use std::collections::hash_map::Entry;
        let mut payments = self.payments.lock();
        let key = tenant_key(&tx.tenant_id, &tx.signature);
        match payments.entry(key) {
            Entry::Vacant(e) => {
                e.insert(tx);
                Ok(true) // Newly inserted
            }
            Entry::Occupied(_) => Ok(false), // Already existed
        }
    }

    async fn delete_payment(&self, tenant_id: &str, signature: &str) -> StorageResult<()> {
        self.payments
            .lock()
            .remove(&tenant_key(tenant_id, signature));
        Ok(())
    }

    async fn has_payment_been_processed(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> StorageResult<bool> {
        Ok(self
            .payments
            .lock()
            .get(&tenant_key(tenant_id, signature))
            .is_some())
    }

    async fn get_payment(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> StorageResult<Option<PaymentTransaction>> {
        Ok(self
            .payments
            .lock()
            .get(&tenant_key(tenant_id, signature))
            .cloned())
    }

    async fn has_valid_access(
        &self,
        tenant_id: &str,
        resource: &str,
        wallet: &str,
    ) -> StorageResult<bool> {
        let now = Utc::now();
        let ttl = to_chrono_duration(crate::constants::DEFAULT_ACCESS_TTL);
        Ok(self.payments.lock().values().any(|p| {
            p.tenant_id == tenant_id
                && p.resource_id == resource
                && p.wallet == wallet
                && p.created_at + ttl > now
        }))
    }

    async fn archive_old_payments(&self, older_than: DateTime<Utc>) -> StorageResult<u64> {
        let mut map = self.payments.lock();
        let before = map.len();
        map.retain(|_, v| v.created_at >= older_than);
        Ok((before - map.len()) as u64)
    }

    async fn get_purchase_by_signature(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> StorageResult<Option<Purchase>> {
        Ok(self
            .payments
            .lock()
            .get(&tenant_key(tenant_id, signature))
            .map(|tx| Purchase {
                signature: tx.signature.clone(),
                tenant_id: tx.tenant_id.clone(),
                resource_id: tx.resource_id.clone(),
                wallet: (!tx.wallet.is_empty()).then_some(tx.wallet.clone()),
                user_id: tx.user_id.clone(),
                amount: tx.amount.to_major().to_string(),
                paid_at: tx.created_at,
                metadata: Some(serde_json::to_value(&tx.metadata).unwrap_or_default()),
            }))
    }

    async fn store_credits_hold(&self, hold: CreditsHold) -> StorageResult<()> {
        let key = tenant_key(&hold.tenant_id, &hold.hold_id);
        self.credits_holds.lock().insert(key, hold);
        Ok(())
    }

    async fn get_credits_hold(
        &self,
        tenant_id: &str,
        hold_id: &str,
    ) -> StorageResult<Option<CreditsHold>> {
        Ok(self
            .credits_holds
            .lock()
            .get(&tenant_key(tenant_id, hold_id))
            .cloned())
    }

    async fn delete_credits_hold(&self, tenant_id: &str, hold_id: &str) -> StorageResult<()> {
        self.credits_holds
            .lock()
            .remove(&tenant_key(tenant_id, hold_id));
        Ok(())
    }

    async fn cleanup_expired_credits_holds(&self) -> StorageResult<u64> {
        let now = Utc::now();
        let mut map = self.credits_holds.lock();
        let before = map.len();
        map.retain(|_, v| v.expires_at > now);
        Ok((before - map.len()) as u64)
    }

    async fn list_purchases_by_user_id(
        &self,
        tenant_id: &str,
        user_id: &str,
        limit: i64,
        offset: i64,
    ) -> StorageResult<Vec<Purchase>> {
        let mut items: Vec<Purchase> = self
            .payments
            .lock()
            .values()
            .filter(|tx| tx.tenant_id == tenant_id && tx.user_id.as_deref() == Some(user_id))
            .map(|tx| Purchase {
                signature: tx.signature.clone(),
                tenant_id: tx.tenant_id.clone(),
                resource_id: tx.resource_id.clone(),
                wallet: (!tx.wallet.is_empty()).then_some(tx.wallet.clone()),
                user_id: tx.user_id.clone(),
                amount: tx.amount.to_major().to_string(),
                paid_at: tx.created_at,
                metadata: Some(serde_json::to_value(&tx.metadata).unwrap_or_default()),
            })
            .collect();

        items.sort_by(|a, b| b.paid_at.cmp(&a.paid_at));
        let start = offset.max(0) as usize;
        let end = start.saturating_add(limit.max(0) as usize).min(items.len());
        Ok(items.get(start..end).unwrap_or_default().to_vec())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin nonces
    // ─────────────────────────────────────────────────────────────────────────
    async fn create_nonce(&self, nonce: AdminNonce) -> StorageResult<()> {
        let key = tenant_key(&nonce.tenant_id, &nonce.id);
        self.nonces.lock().insert(key, nonce);
        Ok(())
    }

    async fn get_nonce(
        &self,
        tenant_id: &str,
        nonce_id: &str,
    ) -> StorageResult<Option<AdminNonce>> {
        Ok(self
            .nonces
            .lock()
            .get(&tenant_key(tenant_id, nonce_id))
            .cloned())
    }

    async fn consume_nonce(&self, tenant_id: &str, nonce_id: &str) -> StorageResult<()> {
        let mut nonces = self.nonces.lock();
        if let Some(n) = nonces.get_mut(&tenant_key(tenant_id, nonce_id)) {
            // Atomically check if already consumed to prevent double-use attacks
            if n.consumed_at.is_some() {
                return Err(StorageError::Conflict);
            }
            n.consumed_at = Some(Utc::now());
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn cleanup_expired_nonces(&self) -> StorageResult<u64> {
        let mut nonces = self.nonces.lock();
        let before = nonces.len();
        let now = Utc::now();
        nonces.retain(|_, n| n.expires_at > now && n.consumed_at.is_none());
        Ok((before - nonces.len()) as u64)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Webhooks
    // ─────────────────────────────────────────────────────────────────────────
    async fn enqueue_webhook(&self, webhook: PendingWebhook) -> StorageResult<String> {
        let id = webhook.id.clone();
        // Idempotent enqueue: do not overwrite existing webhook state if the ID already exists.
        let mut map = self.webhooks.lock();
        if map.contains_key(&id) {
            return Ok(id);
        }
        map.insert(id.clone(), webhook);
        Ok(id)
    }

    async fn dequeue_webhooks(&self, limit: i32) -> StorageResult<Vec<PendingWebhook>> {
        let mut map = self.webhooks.lock();
        let mut out = Vec::new();
        let now = Utc::now();
        for wh in map.values_mut() {
            if out.len() as i32 >= limit {
                break;
            }
            if wh.status == WebhookStatus::Pending {
                if let Some(next_at) = wh.next_attempt_at {
                    if next_at > now {
                        continue;
                    }
                }
                wh.status = WebhookStatus::Processing;
                out.push(wh.clone());
            }
        }
        Ok(out)
    }

    async fn mark_webhook_processing(&self, webhook_id: &str) -> StorageResult<()> {
        if let Some(wh) = self.webhooks.lock().get_mut(webhook_id) {
            wh.status = WebhookStatus::Processing;
            wh.last_attempt_at = Some(Utc::now());
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn mark_webhook_success(&self, webhook_id: &str) -> StorageResult<()> {
        if let Some(wh) = self.webhooks.lock().get_mut(webhook_id) {
            wh.status = WebhookStatus::Success;
            wh.completed_at = Some(Utc::now());
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn mark_webhook_failed(
        &self,
        webhook_id: &str,
        error: &str,
        next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        if let Some(wh) = self.webhooks.lock().get_mut(webhook_id) {
            wh.status = WebhookStatus::Failed;
            wh.last_error = Some(error.to_string());
            wh.last_attempt_at = Some(Utc::now());
            wh.next_attempt_at = Some(next_attempt_at);
            wh.attempts += 1; // Per spec: increment attempt counter on failure
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn mark_webhook_retry(
        &self,
        webhook_id: &str,
        error: &str,
        next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        if let Some(wh) = self.webhooks.lock().get_mut(webhook_id) {
            wh.status = WebhookStatus::Pending;
            wh.last_error = Some(error.to_string());
            wh.last_attempt_at = Some(Utc::now());
            wh.next_attempt_at = Some(next_attempt_at);
            wh.attempts += 1;
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn get_webhook(&self, webhook_id: &str) -> StorageResult<Option<PendingWebhook>> {
        Ok(self.webhooks.lock().get(webhook_id).cloned())
    }

    async fn list_webhooks(
        &self,
        status: Option<WebhookStatus>,
        limit: i32,
    ) -> StorageResult<Vec<PendingWebhook>> {
        let map = self.webhooks.lock();
        let mut items: Vec<_> = map
            .values()
            .filter(|w| status.as_ref().map(|s| &w.status == s).unwrap_or(true))
            .cloned()
            .collect();
        items.sort_by_key(|w| w.created_at);
        items.truncate(limit as usize);
        Ok(items)
    }

    async fn retry_webhook(&self, webhook_id: &str) -> StorageResult<()> {
        if let Some(wh) = self.webhooks.lock().get_mut(webhook_id) {
            wh.status = WebhookStatus::Pending;
            wh.next_attempt_at = Some(Utc::now());
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn delete_webhook(&self, webhook_id: &str) -> StorageResult<()> {
        self.webhooks.lock().remove(webhook_id);
        Ok(())
    }

    async fn cleanup_old_webhooks(&self, retention_days: i32) -> StorageResult<u64> {
        let cutoff = Utc::now() - chrono::Duration::days(retention_days as i64);
        let mut webhooks = self.webhooks.lock();
        let initial_count = webhooks.len();
        webhooks.retain(|_, w| {
            // Keep if not completed or completed recently
            w.completed_at.map_or(true, |completed| completed > cutoff)
        });
        Ok((initial_count - webhooks.len()) as u64)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Email queue
    // ─────────────────────────────────────────────────────────────────────────

    async fn enqueue_email(&self, email: PendingEmail) -> StorageResult<String> {
        let id = email.id.clone();
        self.emails.lock().insert(id.clone(), email);
        Ok(id)
    }

    async fn dequeue_emails(&self, limit: i32) -> StorageResult<Vec<PendingEmail>> {
        let now = Utc::now();
        let emails = self.emails.lock();
        let result: Vec<PendingEmail> = emails
            .values()
            .filter(|e| {
                e.status == EmailStatus::Pending
                    && e.next_attempt_at.map_or(true, |next| next <= now)
            })
            .take(limit as usize)
            .cloned()
            .collect();
        Ok(result)
    }

    async fn mark_email_processing(&self, email_id: &str) -> StorageResult<()> {
        if let Some(email) = self.emails.lock().get_mut(email_id) {
            email.last_attempt_at = Some(Utc::now());
        }
        Ok(())
    }

    async fn mark_email_success(&self, email_id: &str) -> StorageResult<()> {
        if let Some(email) = self.emails.lock().get_mut(email_id) {
            email.status = EmailStatus::Completed;
            email.completed_at = Some(Utc::now());
        }
        Ok(())
    }

    async fn mark_email_retry(
        &self,
        email_id: &str,
        error: &str,
        next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        if let Some(email) = self.emails.lock().get_mut(email_id) {
            email.attempts += 1;
            email.last_error = Some(error.to_string());
            email.next_attempt_at = Some(next_attempt_at);
        }
        Ok(())
    }

    async fn mark_email_failed(&self, email_id: &str, error: &str) -> StorageResult<()> {
        if let Some(email) = self.emails.lock().get_mut(email_id) {
            email.status = EmailStatus::Failed;
            email.last_error = Some(error.to_string());
            email.completed_at = Some(Utc::now());
        }
        Ok(())
    }

    async fn get_email(&self, email_id: &str) -> StorageResult<Option<PendingEmail>> {
        Ok(self.emails.lock().get(email_id).cloned())
    }

    async fn cleanup_old_emails(&self, retention_days: i32) -> StorageResult<u64> {
        let cutoff = Utc::now() - chrono::Duration::days(retention_days as i64);
        let mut emails = self.emails.lock();
        let initial_count = emails.len();
        emails.retain(|_, e| {
            // Keep if not completed or completed recently
            e.completed_at.map_or(true, |completed| completed > cutoff)
        });
        Ok((initial_count - emails.len()) as u64)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Idempotency
    // ─────────────────────────────────────────────────────────────────────────
    async fn save_idempotency_key(
        &self,
        key: &str,
        response: IdempotencyResponse,
        ttl: StdDuration,
    ) -> StorageResult<()> {
        self.idempotency
            .lock()
            .insert(key.to_string(), (response, Instant::now(), ttl));
        Ok(())
    }

    async fn try_save_idempotency_key(
        &self,
        key: &str,
        response: IdempotencyResponse,
        ttl: StdDuration,
    ) -> StorageResult<bool> {
        let mut map = self.idempotency.lock();

        if let Some((_, created, existing_ttl)) = map.get(key) {
            if created.elapsed() <= *existing_ttl {
                return Ok(false);
            }
            map.remove(key);
        }

        map.insert(key.to_string(), (response, Instant::now(), ttl));
        Ok(true)
    }

    async fn get_idempotency_key(&self, key: &str) -> StorageResult<Option<IdempotencyResponse>> {
        let mut map = self.idempotency.lock();
        if let Some((resp, created, ttl)) = map.get(key) {
            if created.elapsed() <= *ttl {
                return Ok(Some(resp.clone()));
            }
        }
        map.remove(key);
        Ok(None)
    }

    async fn delete_idempotency_key(&self, key: &str) -> StorageResult<()> {
        self.idempotency.lock().remove(key);
        Ok(())
    }

    async fn cleanup_expired_idempotency_keys(&self) -> StorageResult<u64> {
        let mut map = self.idempotency.lock();
        let before = map.len();
        map.retain(|_, (_, created, ttl)| created.elapsed() <= *ttl);
        Ok((before - map.len()) as u64)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Subscriptions
    // ─────────────────────────────────────────────────────────────────────────
    async fn save_subscription(&self, sub: Subscription) -> StorageResult<()> {
        let key = tenant_key(&sub.tenant_id, &sub.id);
        self.subscriptions.lock().insert(key, sub);
        Ok(())
    }

    async fn get_subscription(
        &self,
        tenant_id: &str,
        id: &str,
    ) -> StorageResult<Option<Subscription>> {
        Ok(self
            .subscriptions
            .lock()
            .get(&tenant_key(tenant_id, id))
            .cloned())
    }

    async fn get_subscription_by_wallet(
        &self,
        tenant_id: &str,
        wallet: &str,
        product_id: &str,
    ) -> StorageResult<Option<Subscription>> {
        Ok(self
            .subscriptions
            .lock()
            .values()
            .find(|s| {
                s.tenant_id == tenant_id
                    && s.wallet.as_deref() == Some(wallet)
                    && s.product_id == product_id
            })
            .cloned())
    }

    async fn get_subscriptions_by_wallet(
        &self,
        tenant_id: &str,
        wallet: &str,
    ) -> StorageResult<Vec<Subscription>> {
        Ok(self
            .subscriptions
            .lock()
            .values()
            .filter(|s| s.tenant_id == tenant_id && s.wallet.as_deref() == Some(wallet))
            .cloned()
            .collect())
    }

    async fn get_subscription_by_stripe_id(
        &self,
        tenant_id: &str,
        stripe_sub_id: &str,
    ) -> StorageResult<Option<Subscription>> {
        Ok(self
            .subscriptions
            .lock()
            .values()
            .find(|s| {
                s.tenant_id == tenant_id
                    && s.stripe_subscription_id.as_deref() == Some(stripe_sub_id)
            })
            .cloned())
    }

    async fn find_subscription_by_stripe_id(
        &self,
        stripe_sub_id: &str,
    ) -> StorageResult<Option<Subscription>> {
        Ok(self
            .subscriptions
            .lock()
            .values()
            .find(|s| s.stripe_subscription_id.as_deref() == Some(stripe_sub_id))
            .cloned())
    }

    async fn get_subscription_by_payment_signature(
        &self,
        tenant_id: &str,
        payment_signature: &str,
    ) -> StorageResult<Option<Subscription>> {
        Ok(self
            .subscriptions
            .lock()
            .values()
            .find(|s| {
                s.tenant_id == tenant_id
                    && s.payment_signature.as_deref() == Some(payment_signature)
            })
            .cloned())
    }

    async fn list_active_subscriptions(
        &self,
        tenant_id: &str,
        product_id: Option<&str>,
    ) -> StorageResult<Vec<Subscription>> {
        Ok(self
            .subscriptions
            .lock()
            .values()
            .filter(|s| {
                s.tenant_id == tenant_id
                    && s.status == SubscriptionStatus::Active
                    && product_id.map(|p| s.product_id == p).unwrap_or(true)
            })
            .cloned()
            .collect())
    }

    async fn list_expiring_subscriptions(
        &self,
        tenant_id: &str,
        before: DateTime<Utc>,
    ) -> StorageResult<Vec<Subscription>> {
        Ok(self
            .subscriptions
            .lock()
            .values()
            .filter(|s| s.tenant_id == tenant_id && s.current_period_end <= before)
            .cloned()
            .collect())
    }

    async fn update_subscription_status(
        &self,
        tenant_id: &str,
        id: &str,
        status: SubscriptionStatus,
    ) -> StorageResult<()> {
        if let Some(s) = self
            .subscriptions
            .lock()
            .get_mut(&tenant_key(tenant_id, id))
        {
            s.status = status;
            Ok(())
        } else {
            Err(StorageError::NotFound)
        }
    }

    async fn delete_subscription(&self, tenant_id: &str, id: &str) -> StorageResult<()> {
        // Per spec (08-storage.md line 143): Soft delete - set status to cancelled
        let mut subs = self.subscriptions.lock();
        if let Some(sub) = subs.get_mut(&tenant_key(tenant_id, id)) {
            sub.status = SubscriptionStatus::Cancelled;
            sub.cancelled_at = Some(chrono::Utc::now());
        }
        Ok(())
    }

    async fn get_subscriptions_by_stripe_customer_id(
        &self,
        tenant_id: &str,
        customer_id: &str,
    ) -> StorageResult<Vec<Subscription>> {
        Ok(self
            .subscriptions
            .lock()
            .values()
            .filter(|s| {
                s.tenant_id == tenant_id && s.stripe_customer_id.as_deref() == Some(customer_id)
            })
            .cloned()
            .collect())
    }

    async fn list_subscriptions_by_product(
        &self,
        tenant_id: &str,
        product_id: &str,
    ) -> StorageResult<Vec<Subscription>> {
        Ok(self
            .subscriptions
            .lock()
            .values()
            .filter(|s| s.tenant_id == tenant_id && s.product_id == product_id)
            .cloned()
            .collect())
    }

    async fn count_subscriptions_by_plan(
        &self,
        tenant_id: &str,
        plan_id: &str,
    ) -> StorageResult<i64> {
        let count = self
            .subscriptions
            .lock()
            .values()
            .filter(|s| {
                s.tenant_id == tenant_id
                    && s.plan_id.as_deref() == Some(plan_id)
                    && s.status != SubscriptionStatus::Cancelled
            })
            .count();
        Ok(count as i64)
    }

    async fn list_tenant_ids(&self) -> StorageResult<Vec<String>> {
        let subs = self.subscriptions.lock();
        let mut tenants = HashSet::new();

        for key in subs.keys() {
            if let Some((tenant_id, _)) = key.split_once(':') {
                tenants.insert(tenant_id.to_string());
            }
        }

        let mut tenants: Vec<String> = tenants.into_iter().collect();
        tenants.sort();
        Ok(tenants)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dead Letter Queue
    // ─────────────────────────────────────────────────────────────────────────
    async fn move_to_dlq(&self, webhook: PendingWebhook, final_error: &str) -> StorageResult<()> {
        let now = Utc::now();
        let dlq_id = uuid::Uuid::new_v4().to_string();

        let dlq_webhook = DlqWebhook {
            id: dlq_id.clone(),
            tenant_id: webhook.tenant_id.clone(),
            original_webhook_id: webhook.id.clone(),
            url: webhook.url,
            payload: webhook.payload,
            payload_bytes: webhook.payload_bytes,
            headers: webhook.headers,
            event_type: webhook.event_type,
            final_error: final_error.to_string(),
            total_attempts: webhook.attempts,
            first_attempt_at: webhook.created_at,
            last_attempt_at: webhook.last_attempt_at.unwrap_or(now),
            moved_to_dlq_at: now,
        };

        // Add to DLQ
        self.dlq.lock().insert(dlq_id, dlq_webhook);

        // Remove from webhook queue
        self.webhooks.lock().remove(&webhook.id);

        Ok(())
    }

    async fn list_dlq(&self, limit: i32) -> StorageResult<Vec<DlqWebhook>> {
        let dlq = self.dlq.lock();
        let mut items: Vec<_> = dlq.values().cloned().collect();
        items.sort_by_key(|d| std::cmp::Reverse(d.moved_to_dlq_at));
        items.truncate(limit as usize);
        Ok(items)
    }

    async fn retry_from_dlq(&self, dlq_id: &str) -> StorageResult<()> {
        let mut dlq = self.dlq.lock();
        let dlq_webhook = dlq.remove(dlq_id).ok_or(StorageError::NotFound)?;
        drop(dlq);

        // Create new pending webhook
        let webhook = PendingWebhook {
            id: uuid::Uuid::new_v4().to_string(),
            tenant_id: dlq_webhook.tenant_id.clone(),
            url: dlq_webhook.url,
            payload: dlq_webhook.payload,
            payload_bytes: dlq_webhook.payload_bytes,
            headers: dlq_webhook.headers,
            event_type: dlq_webhook.event_type,
            status: WebhookStatus::Pending,
            attempts: 0,
            max_attempts: 5, // Reset max attempts
            last_error: None,
            last_attempt_at: None,
            next_attempt_at: Some(Utc::now()),
            created_at: Utc::now(),
            completed_at: None,
        };

        self.webhooks.lock().insert(webhook.id.clone(), webhook);

        Ok(())
    }

    async fn delete_from_dlq(&self, dlq_id: &str) -> StorageResult<()> {
        self.dlq.lock().remove(dlq_id);
        Ok(())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin Dashboard
    // ─────────────────────────────────────────────────────────────────────────
    async fn get_admin_stats(&self, tenant_id: &str) -> StorageResult<AdminStats> {
        let payments = self.payments.lock();
        let tenant_payments: Vec<_> = payments
            .values()
            .filter(|p| p.tenant_id == tenant_id)
            .collect();

        let total_transactions = tenant_payments.len() as i64;
        let total_revenue: f64 = tenant_payments
            .iter()
            .map(|p| p.amount.atomic as f64 / 1_000_000.0)
            .sum();

        let average_order_value = if total_transactions > 0 {
            total_revenue / total_transactions as f64
        } else {
            0.0
        };

        let mut revenue_by_method = std::collections::HashMap::new();
        let mut transactions_by_method = std::collections::HashMap::new();
        revenue_by_method.insert("x402".to_string(), total_revenue);
        transactions_by_method.insert("x402".to_string(), total_transactions);

        // For in-memory store, we don't track daily revenue or top products
        Ok(AdminStats {
            total_revenue,
            total_transactions,
            average_order_value,
            revenue_by_method,
            transactions_by_method,
            revenue_by_day: Vec::new(),
            top_products: Vec::new(),
        })
    }

    async fn list_purchases(
        &self,
        tenant_id: &str,
        _method: Option<&str>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Purchase>> {
        let payments = self.payments.lock();
        let mut purchases: Vec<Purchase> = payments
            .values()
            .filter(|p| p.tenant_id == tenant_id)
            .map(|p| Purchase {
                signature: p.signature.clone(),
                tenant_id: p.tenant_id.clone(),
                resource_id: p.resource_id.clone(),
                wallet: Some(p.wallet.clone()),
                user_id: p.user_id.clone(),
                amount: format!("{} {}", p.amount.atomic, p.amount.asset.code),
                paid_at: p.created_at,
                metadata: Some(serde_json::to_value(&p.metadata).unwrap_or_default()),
            })
            .collect();

        purchases.sort_by(|a, b| b.paid_at.cmp(&a.paid_at));
        let start = offset as usize;
        let end = (offset + limit) as usize;
        Ok(purchases
            .into_iter()
            .skip(start)
            .take(end - start)
            .collect())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────
    async fn close(&self) -> StorageResult<()> {
        Ok(())
    }

    async fn health_check(&self) -> StorageResult<()> {
        // In-memory store is always healthy
        Ok(())
    }

    // ==================== Chat Sessions ====================

    async fn create_chat_session(&self, session: ChatSession) -> StorageResult<()> {
        let key = tenant_key(&session.tenant_id, &session.id);
        self.chat_sessions.lock().insert(key, session);
        Ok(())
    }

    async fn get_chat_session(
        &self,
        tenant_id: &str,
        session_id: &str,
    ) -> StorageResult<Option<ChatSession>> {
        let key = tenant_key(tenant_id, session_id);
        Ok(self.chat_sessions.lock().get(&key).cloned())
    }

    async fn update_chat_session(
        &self,
        tenant_id: &str,
        session_id: &str,
        message_count: i32,
        last_message_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        let key = tenant_key(tenant_id, session_id);
        if let Some(session) = self.chat_sessions.lock().get_mut(&key) {
            session.message_count = message_count;
            session.last_message_at = last_message_at;
            session.updated_at = updated_at;
        }
        Ok(())
    }

    async fn list_chat_sessions(
        &self,
        tenant_id: &str,
        customer_id: Option<&str>,
        status: Option<&str>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<ChatSession>, i64)> {
        let sessions = self.chat_sessions.lock();
        let mut filtered: Vec<ChatSession> = sessions
            .values()
            .filter(|s| s.tenant_id == tenant_id)
            .filter(|s| customer_id.map_or(true, |cid| s.customer_id.as_deref() == Some(cid)))
            .filter(|s| status.map_or(true, |st| s.status == st))
            .cloned()
            .collect();

        // Sort by last_message_at DESC
        filtered.sort_by(|a, b| b.last_message_at.cmp(&a.last_message_at));

        let total = filtered.len() as i64;
        let result: Vec<ChatSession> = filtered
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .collect();

        Ok((result, total))
    }

    // ==================== Chat Messages ====================

    async fn create_chat_message(&self, message: ChatMessage) -> StorageResult<()> {
        let key = tenant_key(&message.tenant_id, &message.id);
        self.chat_messages.lock().insert(key, message);
        Ok(())
    }

    async fn list_chat_messages(
        &self,
        tenant_id: &str,
        session_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ChatMessage>> {
        let messages = self.chat_messages.lock();
        let mut filtered: Vec<ChatMessage> = messages
            .values()
            .filter(|m| m.tenant_id == tenant_id && m.session_id == session_id)
            .cloned()
            .collect();

        // Sort by created_at ASC (chronological)
        filtered.sort_by(|a, b| a.created_at.cmp(&b.created_at));

        Ok(filtered
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .collect())
    }

    // ==================== FAQs ====================

    async fn create_faq(&self, faq: Faq) -> StorageResult<()> {
        let key = tenant_key(&faq.tenant_id, &faq.id);
        self.faqs.lock().insert(key, faq);
        Ok(())
    }

    async fn get_faq(&self, tenant_id: &str, faq_id: &str) -> StorageResult<Option<Faq>> {
        let key = tenant_key(tenant_id, faq_id);
        Ok(self.faqs.lock().get(&key).cloned())
    }

    async fn update_faq(&self, faq: Faq) -> StorageResult<()> {
        let key = tenant_key(&faq.tenant_id, &faq.id);
        self.faqs.lock().insert(key, faq);
        Ok(())
    }

    async fn delete_faq(&self, tenant_id: &str, faq_id: &str) -> StorageResult<()> {
        let key = tenant_key(tenant_id, faq_id);
        self.faqs.lock().remove(&key);
        Ok(())
    }

    async fn list_faqs(
        &self,
        tenant_id: &str,
        active_only: bool,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<Faq>, i64)> {
        let faqs = self.faqs.lock();
        let mut filtered: Vec<Faq> = faqs
            .values()
            .filter(|f| f.tenant_id == tenant_id)
            .filter(|f| !active_only || f.active)
            .cloned()
            .collect();

        // Sort by updated_at DESC
        filtered.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

        let total = filtered.len() as i64;
        let result: Vec<Faq> = filtered
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .collect();

        Ok((result, total))
    }

    async fn search_faqs(
        &self,
        tenant_id: &str,
        query: &str,
        limit: i32,
    ) -> StorageResult<Vec<Faq>> {
        let faqs = self.faqs.lock();
        let query_lower = query.to_lowercase();
        let keywords: Vec<&str> = query_lower.split_whitespace().collect();

        let mut matches: Vec<(Faq, i32)> = faqs
            .values()
            .filter(|f| f.tenant_id == tenant_id && f.active && f.use_in_chat)
            .map(|f| {
                let mut score = 0i32;
                let q_lower = f.question.to_lowercase();
                let a_lower = f.answer.to_lowercase();

                // Check keywords
                for kw in &keywords {
                    if f.keywords.iter().any(|k| k.to_lowercase().contains(kw)) {
                        score += 10;
                    }
                    if q_lower.contains(kw) {
                        score += 5;
                    }
                    if a_lower.contains(kw) {
                        score += 2;
                    }
                }
                (f.clone(), score)
            })
            .filter(|(_, score)| *score > 0)
            .collect();

        matches.sort_by(|a, b| b.1.cmp(&a.1));

        Ok(matches
            .into_iter()
            .take(limit as usize)
            .map(|(f, _)| f)
            .collect())
    }

    async fn list_public_faqs(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<Faq>, i64)> {
        let faqs = self.faqs.lock();
        let mut filtered: Vec<Faq> = faqs
            .values()
            .filter(|f| f.tenant_id == tenant_id && f.active && f.display_on_page)
            .cloned()
            .collect();

        // Sort by updated_at DESC
        filtered.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

        let total = filtered.len() as i64;
        let result: Vec<Faq> = filtered
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .collect();

        Ok((result, total))
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration as ChronoDuration;

    #[tokio::test]
    async fn test_cart_quote_tenant_isolation() {
        let store = InMemoryStore::new();
        let cart_id = "shared-cart";

        let cart_a = CartQuote {
            id: cart_id.to_string(),
            tenant_id: "tenant-a".to_string(),
            ..Default::default()
        };
        store.store_cart_quote(cart_a.clone()).await.unwrap();

        let cart_b = CartQuote {
            id: cart_id.to_string(),
            tenant_id: "tenant-b".to_string(),
            ..Default::default()
        };
        store.store_cart_quote(cart_b.clone()).await.unwrap();

        let fetched_a = store
            .get_cart_quote("tenant-a", cart_id)
            .await
            .unwrap()
            .expect("tenant-a cart");
        let fetched_b = store
            .get_cart_quote("tenant-b", cart_id)
            .await
            .unwrap()
            .expect("tenant-b cart");

        assert_eq!(fetched_a.tenant_id, "tenant-a");
        assert_eq!(fetched_b.tenant_id, "tenant-b");
    }

    #[tokio::test]
    async fn test_webhook_retry_requeues_pending() {
        let store = InMemoryStore::new();
        let webhook = PendingWebhook {
            id: "wh-1".to_string(),
            tenant_id: "default".to_string(),
            url: "https://example.com".to_string(),
            payload: serde_json::json!({ "ok": true }),
            payload_bytes: Vec::new(),
            headers: std::collections::HashMap::new(),
            event_type: "payment.succeeded".to_string(),
            status: WebhookStatus::Failed,
            attempts: 1,
            max_attempts: 3,
            last_error: Some("failed".to_string()),
            last_attempt_at: Some(Utc::now()),
            next_attempt_at: None,
            created_at: Utc::now(),
            completed_at: None,
        };

        store.enqueue_webhook(webhook).await.unwrap();

        let retry_at = Utc::now() - chrono::Duration::seconds(1);
        store
            .mark_webhook_retry("wh-1", "retry", retry_at)
            .await
            .unwrap();

        let mut items = store.dequeue_webhooks(1).await.unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items.remove(0).status, WebhookStatus::Processing);
    }

    #[tokio::test]
    async fn test_enqueue_webhook_is_idempotent_on_duplicate_id() {
        let store = InMemoryStore::new();
        let now = Utc::now();

        let webhook = PendingWebhook {
            id: "wh-dup".to_string(),
            tenant_id: "default".to_string(),
            url: "https://example.com".to_string(),
            payload: serde_json::json!({"ok": true}),
            payload_bytes: Vec::new(),
            headers: std::collections::HashMap::new(),
            event_type: "payment.succeeded".to_string(),
            status: WebhookStatus::Pending,
            attempts: 0,
            max_attempts: 3,
            last_error: None,
            last_attempt_at: None,
            next_attempt_at: Some(now),
            created_at: now,
            completed_at: None,
        };

        store.enqueue_webhook(webhook.clone()).await.unwrap();

        let mut replacement = webhook;
        replacement.attempts = 99;
        replacement.last_error = Some("overwrite".to_string());
        store.enqueue_webhook(replacement).await.unwrap();

        let stored = store.get_webhook("wh-dup").await.unwrap().expect("webhook");
        assert_eq!(stored.attempts, 0);
        assert_eq!(stored.last_error, None);
    }

    #[tokio::test]
    async fn test_inventory_reservations_convert() {
        let store = InMemoryStore::new();
        let now = Utc::now();
        let reservation = InventoryReservation {
            id: "res-1".to_string(),
            tenant_id: "tenant-a".to_string(),
            product_id: "prod-1".to_string(),
            variant_id: None,
            quantity: 2,
            expires_at: now + ChronoDuration::minutes(5),
            cart_id: Some("cart-1".to_string()),
            status: "active".to_string(),
            created_at: now,
        };

        store.reserve_inventory(reservation).await.unwrap();
        let active = store
            .list_active_reservations_for_cart("tenant-a", "cart-1")
            .await
            .unwrap();
        assert_eq!(active.len(), 1);

        let converted = store
            .convert_inventory_reservations("tenant-a", "cart-1", now)
            .await
            .unwrap();
        assert_eq!(converted, 1);

        let active_after = store
            .list_active_reservations_for_cart("tenant-a", "cart-1")
            .await
            .unwrap();
        assert!(active_after.is_empty());
    }

    #[tokio::test]
    async fn test_inventory_reservations_cleanup_expired() {
        let store = InMemoryStore::new();
        let now = Utc::now();
        let reservation = InventoryReservation {
            id: "res-expired".to_string(),
            tenant_id: "tenant-a".to_string(),
            product_id: "prod-1".to_string(),
            variant_id: None,
            quantity: 1,
            expires_at: now - ChronoDuration::minutes(1),
            cart_id: Some("cart-2".to_string()),
            status: "active".to_string(),
            created_at: now - ChronoDuration::minutes(2),
        };

        store.reserve_inventory(reservation).await.unwrap();
        let cleaned = store
            .cleanup_expired_inventory_reservations(now)
            .await
            .unwrap();
        assert_eq!(cleaned, 1);

        let active = store
            .list_active_reservations_for_cart("tenant-a", "cart-2")
            .await
            .unwrap();
        assert!(active.is_empty());
    }

    #[tokio::test]
    async fn test_list_pending_refunds_respects_limit() {
        let store = InMemoryStore::new();
        let asset = crate::models::get_asset("USDC").expect("asset registered");
        let now = Utc::now();

        for idx in 0..2 {
            let refund = RefundQuote {
                id: format!("refund-{}", idx),
                tenant_id: "tenant-a".to_string(),
                original_purchase_id: "orig-1".to_string(),
                recipient_wallet: "wallet-1".to_string(),
                amount: crate::models::Money::new(asset.clone(), 100),
                reason: None,
                metadata: HashMap::new(),
                created_at: now + ChronoDuration::seconds(idx),
                expires_at: now + ChronoDuration::hours(1),
                processed_by: None,
                processed_at: None,
                signature: None,
            };
            store.store_refund_quote(refund).await.unwrap();
        }

        let results = store.list_pending_refunds("tenant-a", 1).await.unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "refund-0");
    }
}
