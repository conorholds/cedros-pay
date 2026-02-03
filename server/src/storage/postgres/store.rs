//! PostgreSQL Store implementation

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

fn is_sql_identifier_char(b: u8) -> bool {
    b.is_ascii_alphanumeric() || b == b'_'
}

/// Replace occurrences of an identifier only when it appears as a standalone SQL token.
///
/// This avoids accidental replacements inside other identifiers (e.g. replacing `cart_quotes`
/// inside `cart_quotes_id`).
fn replace_identifier(query: &str, from: &str, to: &str) -> String {
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
    pool: PostgresPool,
    tables: SchemaMapping,
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

    /// Get the connection pool
    pub fn pool(&self) -> &PostgresPool {
        &self.pool
    }

    pub async fn try_store_order_with_inventory_adjustments(
        &self,
        order: Order,
        adjustments: Vec<InventoryAdjustmentRequest>,
    ) -> StorageResult<bool> {
        let items_json = serde_json::to_value(&order.items)
            .map_err(|e| StorageError::Database(format!("serialize order items: {e}")))?;
        let shipping_json =
            match &order.shipping {
                Some(s) => Some(serde_json::to_value(s).map_err(|e| {
                    StorageError::Database(format!("serialize order shipping: {e}"))
                })?),
                None => None,
            };
        let metadata_json = serde_json::to_value(&order.metadata)
            .map_err(|e| StorageError::Database(format!("serialize order metadata: {e}")))?;

        let mut tx = self
            .pool
            .inner()
            .begin()
            .await
            .map_err(|e| StorageError::Database(format!("begin order tx: {e}")))?;

        let query = self.orders_query(queries::orders::INSERT_IF_ABSENT);
        let result = sqlx::query(&query)
            .bind(&order.id)
            .bind(&order.tenant_id)
            .bind(&order.source)
            .bind(&order.purchase_id)
            .bind(&order.resource_id)
            .bind(&order.user_id)
            .bind(&order.customer)
            .bind(&order.status)
            .bind(&items_json)
            .bind(order.amount)
            .bind(&order.amount_asset)
            .bind(&order.customer_email)
            .bind(&order.customer_name)
            .bind(&order.receipt_url)
            .bind(&shipping_json)
            .bind(&metadata_json)
            .bind(order.created_at)
            .bind(order.updated_at)
            .bind(order.status_updated_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| StorageError::Database(format!("insert order: {e}")))?;

        if result.rows_affected() == 0 {
            tx.rollback()
                .await
                .map_err(|e| StorageError::Database(format!("rollback order tx: {e}")))?;
            return Ok(false);
        }

        let now = Utc::now();
        for adjustment in adjustments {
            if adjustment.quantity <= 0 {
                continue;
            }

            let product_query = self.products_query(
                "SELECT inventory_quantity FROM products WHERE tenant_id = $1 AND id = $2 FOR UPDATE",
            );
            let row: Option<(Option<i32>,)> = sqlx::query_as(&product_query)
                .bind(&order.tenant_id)
                .bind(&adjustment.product_id)
                .fetch_optional(&mut *tx)
                .await
                .map_err(|e| StorageError::Database(format!("load product inventory: {e}")))?;

            let current = match row {
                Some((value,)) => value,
                None => {
                    tx.rollback()
                        .await
                        .map_err(|e| StorageError::Database(format!("rollback order tx: {e}")))?;
                    return Err(StorageError::NotFound);
                }
            };

            let current = match current {
                Some(value) => value,
                None => continue,
            };

            if current < adjustment.quantity && !adjustment.allow_backorder {
                tx.rollback()
                    .await
                    .map_err(|e| StorageError::Database(format!("rollback order tx: {e}")))?;
                return Err(StorageError::Conflict);
            }

            let next = current - adjustment.quantity;
            let update_query = self.products_query(
                "UPDATE products SET inventory_quantity = $3, updated_at = $4 WHERE tenant_id = $1 AND id = $2",
            );
            sqlx::query(&update_query)
                .bind(&order.tenant_id)
                .bind(&adjustment.product_id)
                .bind(next)
                .bind(now)
                .execute(&mut *tx)
                .await
                .map_err(|e| StorageError::Database(format!("update inventory: {e}")))?;

            let adjust_query = self.orders_query(queries::inventory_adjustments::INSERT);
            sqlx::query(&adjust_query)
                .bind(uuid::Uuid::new_v4().to_string())
                .bind(&order.tenant_id)
                .bind(&adjustment.product_id)
                .bind(&adjustment.variant_id)
                .bind(-adjustment.quantity)
                .bind(current)
                .bind(next)
                .bind(&adjustment.reason)
                .bind(&adjustment.actor)
                .bind(now)
                .execute(&mut *tx)
                .await
                .map_err(|e| StorageError::Database(format!("record inventory adjustment: {e}")))?;
        }

        tx.commit()
            .await
            .map_err(|e| StorageError::Database(format!("commit order tx: {e}")))?;
        Ok(true)
    }

    fn map_table(&self, query: &str, from: &str, to: &str) -> String {
        replace_identifier(query, from, to)
    }

    fn cart_query(&self, query: &str) -> String {
        self.map_table(query, "cart_quotes", &self.tables.cart_quotes_table)
    }

    fn refund_query(&self, query: &str) -> String {
        self.map_table(query, "refund_quotes", &self.tables.refund_quotes_table)
    }

    fn payment_query(&self, query: &str) -> String {
        self.map_table(query, "payment_transactions", &self.tables.payments_table)
    }

    fn nonce_query(&self, query: &str) -> String {
        self.map_table(query, "admin_nonces", &self.tables.admin_nonces_table)
    }

    fn webhook_query(&self, query: &str) -> String {
        self.map_table(query, "webhook_queue", &self.tables.webhook_queue_table)
    }

    fn email_query(&self, query: &str) -> String {
        // Email queue table is not currently configurable via SchemaMapping.
        self.map_table(query, "email_queue", "email_queue")
    }

    fn credits_hold_query(&self, query: &str) -> String {
        self.map_table(query, "credits_holds", &self.tables.credits_holds_table)
    }

    fn products_query(&self, query: &str) -> String {
        self.map_table(query, "products", &self.tables.products_table)
    }

    fn stripe_refund_request_query(&self, query: &str) -> String {
        // Stripe refund request table is not currently configurable via SchemaMapping.
        // Keep the default table name stable.
        self.map_table(query, "stripe_refund_requests", "stripe_refund_requests")
    }

    fn orders_query(&self, query: &str) -> String {
        // Orders table is not currently configurable via SchemaMapping.
        self.map_table(query, "orders", "orders")
    }
}

#[async_trait]
impl Store for PostgresStore {
    // ─────────────────────────────────────────────────────────────────────────
    // Cart quotes
    // ─────────────────────────────────────────────────────────────────────────

    async fn store_cart_quote(&self, quote: CartQuote) -> StorageResult<()> {
        let items_json = serde_json::to_value(&quote.items)
            .map_err(|e| StorageError::Database(format!("serialize items: {}", e)))?;
        let metadata_json = serde_json::to_value(&quote.metadata)
            .map_err(|e| StorageError::Database(format!("serialize metadata: {}", e)))?;

        // Per spec (08-storage.md): INSERT includes tenant_id for multi-tenancy
        let query = self.cart_query(queries::cart::INSERT);
        sqlx::query(&query)
            .bind(&quote.id)
            .bind(&quote.tenant_id)
            .bind(&items_json)
            .bind(quote.total.to_atomic())
            .bind(&quote.total.asset.code)
            .bind(&metadata_json)
            .bind(quote.created_at)
            .bind(quote.expires_at)
            .bind(&quote.wallet_paid_by)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("insert cart quote: {}", e)))?;

        Ok(())
    }

    async fn store_cart_quotes(&self, quotes: Vec<CartQuote>) -> StorageResult<()> {
        // Per spec (08-storage.md line 32): Batch operations must be atomic
        let mut tx = self
            .pool
            .inner()
            .begin()
            .await
            .map_err(|e| StorageError::Database(format!("begin transaction: {}", e)))?;

        let mut prepared = Vec::with_capacity(quotes.len());
        for quote in quotes {
            let items_json = serde_json::to_value(&quote.items)
                .map_err(|e| StorageError::Database(format!("serialize items: {}", e)))?;
            let metadata_json = serde_json::to_value(&quote.metadata)
                .map_err(|e| StorageError::Database(format!("serialize metadata: {}", e)))?;
            prepared.push((
                quote.id,
                quote.tenant_id,
                items_json,
                quote.total.to_atomic(),
                quote.total.asset.code,
                metadata_json,
                quote.created_at,
                quote.expires_at,
                quote.wallet_paid_by,
            ));
        }

        let insert = format!(
            "INSERT INTO {} (id, tenant_id, items, total_amount, total_asset, metadata, created_at, expires_at, wallet_paid_by) ",
            self.tables.cart_quotes_table
        );
        let mut builder = QueryBuilder::new(insert);
        builder.push_values(
            prepared,
            |mut b,
             (
                id,
                tenant_id,
                items_json,
                total_amount,
                total_asset,
                metadata_json,
                created_at,
                expires_at,
                wallet_paid_by,
            )| {
                b.push_bind(id)
                    .push_bind(tenant_id)
                    .push_bind(items_json)
                    .push_bind(total_amount)
                    .push_bind(total_asset)
                    .push_bind(metadata_json)
                    .push_bind(created_at)
                    .push_bind(expires_at)
                    .push_bind(wallet_paid_by);
            },
        );
        builder.push(
            " ON CONFLICT (tenant_id, id) DO UPDATE SET \
            items = EXCLUDED.items, \
            total_amount = EXCLUDED.total_amount, \
            total_asset = EXCLUDED.total_asset, \
            metadata = EXCLUDED.metadata, \
            expires_at = EXCLUDED.expires_at, \
            wallet_paid_by = EXCLUDED.wallet_paid_by",
        );

        builder
            .build()
            .execute(&mut *tx)
            .await
            .map_err(|e| StorageError::Database(format!("insert cart quotes: {}", e)))?;

        tx.commit()
            .await
            .map_err(|e| StorageError::Database(format!("commit transaction: {}", e)))?;
        Ok(())
    }

    async fn get_cart_quote(
        &self,
        tenant_id: &str,
        cart_id: &str,
    ) -> StorageResult<Option<CartQuote>> {
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let query = self.cart_query(queries::cart::GET_BY_ID);
        let row = sqlx::query(&query)
            .bind(cart_id)
            .bind(tenant_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get cart quote: {}", e)))?;

        row.map(parse_cart_quote).transpose()
    }

    async fn get_cart_quotes(
        &self,
        tenant_id: &str,
        cart_ids: &[String],
    ) -> StorageResult<Vec<CartQuote>> {
        if cart_ids.is_empty() {
            return Ok(Vec::new());
        }

        // Use batch query to avoid N+1 queries
        let query = self.cart_query(queries::cart::GET_BY_IDS);
        let rows = sqlx::query(&query)
            .bind(cart_ids)
            .bind(tenant_id)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get cart quotes: {}", e)))?;

        rows.into_iter().map(parse_cart_quote).collect()
    }

    async fn mark_cart_paid(
        &self,
        tenant_id: &str,
        cart_id: &str,
        wallet: &str,
    ) -> StorageResult<()> {
        // Per spec (08-storage.md): Update filters by tenant_id for isolation
        let query = self.cart_query(queries::cart::MARK_PAID);
        let result = sqlx::query(&query)
            .bind(cart_id)
            .bind(tenant_id)
            .bind(wallet)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("mark cart paid: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn has_cart_access(
        &self,
        tenant_id: &str,
        cart_id: &str,
        wallet: &str,
    ) -> StorageResult<bool> {
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let query = self.cart_query(queries::cart::HAS_ACCESS);
        let row: Option<(Option<String>,)> = sqlx::query_as(&query)
            .bind(cart_id)
            .bind(tenant_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("has cart access: {}", e)))?;

        Ok(row.and_then(|(w,)| w).map(|w| w == wallet).unwrap_or(false))
    }

    async fn cleanup_expired_cart_quotes(&self) -> StorageResult<u64> {
        // Admin operation across all tenants
        let query = self.cart_query(queries::cart::CLEANUP_EXPIRED_ALL);
        let result = sqlx::query(&query)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("cleanup expired carts: {}", e)))?;
        Ok(result.rows_affected())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Refunds
    // ─────────────────────────────────────────────────────────────────────────

    async fn store_refund_quote(&self, quote: RefundQuote) -> StorageResult<()> {
        let metadata_json = serde_json::to_value(&quote.metadata)
            .map_err(|e| StorageError::Database(format!("serialize metadata: {}", e)))?;

        // Per spec (08-storage.md): INSERT includes tenant_id for multi-tenancy
        let query = self.refund_query(queries::refund::INSERT);
        sqlx::query(&query)
            .bind(&quote.id)
            .bind(&quote.tenant_id)
            .bind(&quote.original_purchase_id)
            .bind(&quote.recipient_wallet)
            .bind(quote.amount.to_atomic())
            .bind(&quote.amount.asset.code)
            .bind(&quote.reason)
            .bind(&metadata_json)
            .bind(quote.created_at)
            .bind(quote.expires_at)
            .bind(&quote.processed_by)
            .bind(quote.processed_at)
            .bind(&quote.signature)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("insert refund quote: {}", e)))?;

        Ok(())
    }

    async fn store_refund_quotes(&self, quotes: Vec<RefundQuote>) -> StorageResult<()> {
        if quotes.is_empty() {
            return Ok(());
        }

        // PERF-001: Use batch insert with QueryBuilder instead of N individual inserts.
        // Per spec (08-storage.md line 41): Batch operations must be atomic.

        // Pre-serialize metadata for all quotes (fail closed).
        let prepared: Vec<_> = quotes
            .into_iter()
            .map(|q| {
                let metadata_json = serde_json::to_value(&q.metadata)
                    .map_err(|e| StorageError::Database(format!("serialize metadata: {}", e)))?;
                Ok::<_, StorageError>((
                    q.id,
                    q.tenant_id,
                    q.original_purchase_id,
                    q.recipient_wallet,
                    q.amount.to_atomic(),
                    q.amount.asset.code,
                    q.reason,
                    metadata_json,
                    q.created_at,
                    q.expires_at,
                    q.processed_by,
                    q.processed_at,
                    q.signature,
                ))
            })
            .collect::<Result<Vec<_>, _>>()?;

        let insert = format!(
            "INSERT INTO {} (id, tenant_id, original_purchase_id, recipient_wallet, amount, amount_asset, reason, metadata, created_at, expires_at, processed_by, processed_at, signature) ",
            self.tables.refund_quotes_table
        );
        let mut builder = QueryBuilder::new(insert);
        builder.push_values(
            prepared,
            |mut b,
             (
                id,
                tenant_id,
                original_purchase_id,
                recipient_wallet,
                amount,
                amount_asset,
                reason,
                metadata_json,
                created_at,
                expires_at,
                processed_by,
                processed_at,
                signature,
            )| {
                b.push_bind(id)
                    .push_bind(tenant_id)
                    .push_bind(original_purchase_id)
                    .push_bind(recipient_wallet)
                    .push_bind(amount)
                    .push_bind(amount_asset)
                    .push_bind(reason)
                    .push_bind(metadata_json)
                    .push_bind(created_at)
                    .push_bind(expires_at)
                    .push_bind(processed_by)
                    .push_bind(processed_at)
                    .push_bind(signature);
            },
        );
        builder.push(
            " ON CONFLICT (tenant_id, id) DO UPDATE SET \
            original_purchase_id = EXCLUDED.original_purchase_id, \
            recipient_wallet = EXCLUDED.recipient_wallet, \
            amount = EXCLUDED.amount, \
            amount_asset = EXCLUDED.amount_asset, \
            reason = EXCLUDED.reason, \
            metadata = EXCLUDED.metadata, \
            expires_at = EXCLUDED.expires_at, \
            processed_by = EXCLUDED.processed_by, \
            processed_at = EXCLUDED.processed_at, \
            signature = EXCLUDED.signature",
        );

        let mut tx = self
            .pool
            .inner()
            .begin()
            .await
            .map_err(|e| StorageError::Database(format!("begin refund quote batch: {}", e)))?;

        builder
            .build()
            .execute(&mut *tx)
            .await
            .map_err(|e| StorageError::Database(format!("insert refund quotes: {}", e)))?;

        tx.commit()
            .await
            .map_err(|e| StorageError::Database(format!("commit refund quote batch: {}", e)))?;

        Ok(())
    }

    async fn get_refund_quote(
        &self,
        tenant_id: &str,
        refund_id: &str,
    ) -> StorageResult<Option<RefundQuote>> {
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let query = self.refund_query(queries::refund::GET_BY_ID);
        let row = sqlx::query(&query)
            .bind(refund_id)
            .bind(tenant_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get refund quote: {}", e)))?;

        row.map(parse_refund_quote).transpose()
    }

    async fn get_refund_by_original_purchase_id(
        &self,
        tenant_id: &str,
        original_purchase_id: &str,
    ) -> StorageResult<Option<RefundQuote>> {
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let query = self.refund_query(queries::refund::GET_BY_ORIGINAL_PURCHASE_ID);
        let row = sqlx::query(&query)
            .bind(original_purchase_id)
            .bind(tenant_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| {
                StorageError::Database(format!("get refund by original purchase id: {}", e))
            })?;

        row.map(parse_refund_quote).transpose()
    }

    async fn get_all_refunds_for_purchase(
        &self,
        tenant_id: &str,
        original_purchase_id: &str,
    ) -> StorageResult<Vec<RefundQuote>> {
        let query = self.refund_query(queries::refund::GET_ALL_BY_ORIGINAL_PURCHASE_ID);
        let rows = sqlx::query(&query)
            .bind(original_purchase_id)
            .bind(tenant_id)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get all refunds for purchase: {}", e)))?;

        rows.into_iter().map(parse_refund_quote).collect()
    }

    async fn list_pending_refunds(
        &self,
        tenant_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<RefundQuote>> {
        if limit <= 0 {
            return Ok(Vec::new());
        }
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let query = self.refund_query(queries::refund::LIST_PENDING);
        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(limit)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list pending refunds: {}", e)))?;

        rows.into_iter().map(parse_refund_quote).collect()
    }

    async fn mark_refund_processed(
        &self,
        tenant_id: &str,
        refund_id: &str,
        processed_by: &str,
        signature: &str,
    ) -> StorageResult<()> {
        // Per spec (08-storage.md): Update filters by tenant_id for isolation
        let query = self.refund_query(queries::refund::MARK_PROCESSED);
        let result = sqlx::query(&query)
            .bind(refund_id)
            .bind(tenant_id)
            .bind(processed_by)
            .bind(signature)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("mark refund processed: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn delete_refund_quote(&self, tenant_id: &str, refund_id: &str) -> StorageResult<()> {
        // Per spec (08-storage.md): Delete filters by tenant_id for isolation
        let query = self.refund_query(queries::refund::DELETE);
        sqlx::query(&query)
            .bind(refund_id)
            .bind(tenant_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("delete refund quote: {}", e)))?;

        Ok(())
    }

    async fn cleanup_expired_refund_quotes(&self) -> StorageResult<u64> {
        // Admin operation across all tenants
        let query = self.refund_query(queries::refund::CLEANUP_EXPIRED_ALL);
        let result = sqlx::query(&query)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("cleanup expired refunds: {}", e)))?;
        Ok(result.rows_affected())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Stripe refund requests
    // ─────────────────────────────────────────────────────────────────────────

    async fn store_stripe_refund_request(&self, req: StripeRefundRequest) -> StorageResult<()> {
        let metadata_json = serde_json::to_value(&req.metadata)
            .map_err(|e| StorageError::Database(format!("serialize metadata: {}", e)))?;

        let query = self.stripe_refund_request_query(queries::stripe_refund_request::UPSERT);
        sqlx::query(&query)
            .bind(&req.id)
            .bind(&req.tenant_id)
            .bind(&req.original_purchase_id)
            .bind(&req.stripe_payment_intent_id)
            .bind(&req.stripe_refund_id)
            .bind(&req.stripe_charge_id)
            .bind(req.amount)
            .bind(&req.currency)
            .bind(&req.status)
            .bind(&req.reason)
            .bind(&metadata_json)
            .bind(req.created_at)
            .bind(&req.processed_by)
            .bind(req.processed_at)
            .bind(&req.last_error)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("store stripe refund request: {}", e)))?;

        Ok(())
    }

    async fn get_stripe_refund_request(
        &self,
        tenant_id: &str,
        request_id: &str,
    ) -> StorageResult<Option<StripeRefundRequest>> {
        let query = self.stripe_refund_request_query(queries::stripe_refund_request::GET_BY_ID);
        let row = sqlx::query(&query)
            .bind(tenant_id)
            .bind(request_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get stripe refund request: {}", e)))?;

        row.map(parse_stripe_refund_request).transpose()
    }

    async fn list_pending_stripe_refund_requests(
        &self,
        tenant_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<StripeRefundRequest>> {
        let query = self.stripe_refund_request_query(queries::stripe_refund_request::LIST_PENDING);
        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(limit)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| {
                StorageError::Database(format!("list pending stripe refund requests: {}", e))
            })?;

        rows.into_iter()
            .map(parse_stripe_refund_request)
            .collect::<StorageResult<Vec<_>>>()
    }

    async fn get_pending_stripe_refund_request_by_original_purchase_id(
        &self,
        tenant_id: &str,
        original_purchase_id: &str,
    ) -> StorageResult<Option<StripeRefundRequest>> {
        let query = self.stripe_refund_request_query(
            queries::stripe_refund_request::GET_PENDING_BY_ORIGINAL_PURCHASE_ID,
        );
        let row = sqlx::query(&query)
            .bind(tenant_id)
            .bind(original_purchase_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| {
                StorageError::Database(format!(
                    "get pending stripe refund request by purchase: {}",
                    e
                ))
            })?;

        row.map(parse_stripe_refund_request).transpose()
    }

    async fn get_stripe_refund_request_by_charge_id(
        &self,
        tenant_id: &str,
        stripe_charge_id: &str,
    ) -> StorageResult<Option<StripeRefundRequest>> {
        let query =
            self.stripe_refund_request_query(queries::stripe_refund_request::GET_BY_CHARGE_ID);
        let row = sqlx::query(&query)
            .bind(tenant_id)
            .bind(stripe_charge_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| {
                StorageError::Database(format!("get stripe refund request by charge id: {}", e))
            })?;

        row.map(parse_stripe_refund_request).transpose()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Orders
    // ─────────────────────────────────────────────────────────────────────────

    async fn try_store_order(&self, order: Order) -> StorageResult<bool> {
        let items_json = serde_json::to_value(&order.items)
            .map_err(|e| StorageError::Database(format!("serialize order items: {e}")))?;
        let shipping_json =
            match &order.shipping {
                Some(s) => Some(serde_json::to_value(s).map_err(|e| {
                    StorageError::Database(format!("serialize order shipping: {e}"))
                })?),
                None => None,
            };
        let metadata_json = serde_json::to_value(&order.metadata)
            .map_err(|e| StorageError::Database(format!("serialize order metadata: {e}")))?;

        let query = self.orders_query(queries::orders::INSERT_IF_ABSENT);
        let result = sqlx::query(&query)
            .bind(&order.id)
            .bind(&order.tenant_id)
            .bind(&order.source)
            .bind(&order.purchase_id)
            .bind(&order.resource_id)
            .bind(&order.user_id)
            .bind(&order.customer)
            .bind(&order.status)
            .bind(&items_json)
            .bind(order.amount)
            .bind(&order.amount_asset)
            .bind(&order.customer_email)
            .bind(&order.customer_name)
            .bind(&order.receipt_url)
            .bind(&shipping_json)
            .bind(&metadata_json)
            .bind(order.created_at)
            .bind(order.updated_at)
            .bind(order.status_updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("insert order: {e}")))?;

        Ok(result.rows_affected() > 0)
    }

    async fn get_order(&self, tenant_id: &str, order_id: &str) -> StorageResult<Option<Order>> {
        let query = self.orders_query(queries::orders::GET_BY_ID);
        let row = sqlx::query(&query)
            .bind(tenant_id)
            .bind(order_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get order: {e}")))?;

        row.map(parse_order).transpose()
    }

    async fn list_orders(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Order>> {
        let query = self.orders_query(queries::orders::LIST);
        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list orders: {e}")))?;

        rows.into_iter().map(parse_order).collect()
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
        let query = self.orders_query(queries::orders::LIST_FILTERED);
        let count_query = self.orders_query(queries::orders::COUNT_FILTERED);
        let search = search.and_then(|s| {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(format!("%{}%", trimmed))
            }
        });

        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(status)
            .bind(&search)
            .bind(created_before)
            .bind(created_after)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list orders filtered: {e}")))?;

        let total: i64 = sqlx::query_scalar(&count_query)
            .bind(tenant_id)
            .bind(status)
            .bind(&search)
            .bind(created_before)
            .bind(created_after)
            .fetch_one(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("count orders filtered: {e}")))?;

        let orders = rows
            .into_iter()
            .map(parse_order)
            .collect::<StorageResult<_>>()?;
        Ok((orders, total))
    }

    async fn update_order_status(
        &self,
        tenant_id: &str,
        order_id: &str,
        status: &str,
        status_updated_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        let query = self.orders_query(queries::orders::UPDATE_STATUS);
        let result = sqlx::query(&query)
            .bind(tenant_id)
            .bind(order_id)
            .bind(status)
            .bind(status_updated_at)
            .bind(updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("update order status: {e}")))?;

        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn append_order_history(&self, entry: OrderHistoryEntry) -> StorageResult<()> {
        let query = self.orders_query(queries::order_history::INSERT);
        sqlx::query(&query)
            .bind(&entry.id)
            .bind(&entry.tenant_id)
            .bind(&entry.order_id)
            .bind(&entry.from_status)
            .bind(&entry.to_status)
            .bind(&entry.note)
            .bind(&entry.actor)
            .bind(entry.created_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("insert order history: {e}")))?;
        Ok(())
    }

    async fn list_order_history(
        &self,
        tenant_id: &str,
        order_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<OrderHistoryEntry>> {
        let query = self.orders_query(queries::order_history::LIST);
        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(order_id)
            .bind(limit)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list order history: {e}")))?;
        rows.into_iter().map(parse_order_history).collect()
    }

    async fn create_fulfillment(&self, fulfillment: Fulfillment) -> StorageResult<()> {
        let items_json = serde_json::to_value(&fulfillment.items)
            .map_err(|e| StorageError::Database(format!("serialize fulfillment items: {e}")))?;
        let metadata_json = serde_json::to_value(&fulfillment.metadata)
            .map_err(|e| StorageError::Database(format!("serialize fulfillment metadata: {e}")))?;
        let query = self.orders_query(queries::fulfillments::INSERT);
        sqlx::query(&query)
            .bind(&fulfillment.id)
            .bind(&fulfillment.tenant_id)
            .bind(&fulfillment.order_id)
            .bind(&fulfillment.status)
            .bind(&fulfillment.carrier)
            .bind(&fulfillment.tracking_number)
            .bind(&fulfillment.tracking_url)
            .bind(&items_json)
            .bind(fulfillment.shipped_at)
            .bind(fulfillment.delivered_at)
            .bind(&metadata_json)
            .bind(fulfillment.created_at)
            .bind(fulfillment.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("insert fulfillment: {e}")))?;
        Ok(())
    }

    async fn list_fulfillments(
        &self,
        tenant_id: &str,
        order_id: &str,
        limit: i32,
    ) -> StorageResult<Vec<Fulfillment>> {
        let query = self.orders_query(queries::fulfillments::LIST);
        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(order_id)
            .bind(limit)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list fulfillments: {e}")))?;
        rows.into_iter().map(parse_fulfillment).collect()
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
        let query = self.orders_query(queries::fulfillments::UPDATE_STATUS);
        let row = sqlx::query(&query)
            .bind(tenant_id)
            .bind(fulfillment_id)
            .bind(status)
            .bind(shipped_at)
            .bind(delivered_at)
            .bind(updated_at)
            .bind(tracking_number)
            .bind(tracking_url)
            .bind(carrier)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("update fulfillment status: {e}")))?;
        row.map(parse_fulfillment).transpose()
    }

    async fn create_return_request(&self, request: ReturnRequest) -> StorageResult<()> {
        let items_json = serde_json::to_value(&request.items)
            .map_err(|e| StorageError::Database(format!("serialize return items: {e}")))?;
        let metadata_json = serde_json::to_value(&request.metadata)
            .map_err(|e| StorageError::Database(format!("serialize return metadata: {e}")))?;
        let query = self.orders_query(queries::returns::INSERT);
        sqlx::query(&query)
            .bind(&request.id)
            .bind(&request.tenant_id)
            .bind(&request.order_id)
            .bind(&request.status)
            .bind(&items_json)
            .bind(&request.reason)
            .bind(&metadata_json)
            .bind(request.created_at)
            .bind(request.updated_at)
            .bind(request.status_updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("insert return request: {e}")))?;
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
        let query = self.orders_query(queries::returns::UPDATE_STATUS);
        let result = sqlx::query(&query)
            .bind(tenant_id)
            .bind(return_id)
            .bind(status)
            .bind(status_updated_at)
            .bind(updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("update return status: {e}")))?;
        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn get_return_request(
        &self,
        tenant_id: &str,
        return_id: &str,
    ) -> StorageResult<Option<ReturnRequest>> {
        let query = self.orders_query(queries::returns::GET);
        let row = sqlx::query(&query)
            .bind(tenant_id)
            .bind(return_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get return request: {e}")))?;
        row.map(parse_return_request).transpose()
    }

    async fn list_return_requests(
        &self,
        tenant_id: &str,
        status: Option<&str>,
        order_id: Option<&str>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ReturnRequest>> {
        let query = self.orders_query(queries::returns::LIST);
        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(status)
            .bind(order_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list return requests: {e}")))?;
        rows.into_iter().map(parse_return_request).collect()
    }

    async fn reserve_inventory(&self, reservation: InventoryReservation) -> StorageResult<()> {
        let mut tx =
            self.pool.inner().begin().await.map_err(|e| {
                StorageError::Database(format!("begin inventory reservation tx: {e}"))
            })?;

        let product_query = self.products_query(
            "SELECT inventory_quantity, inventory_policy FROM products WHERE tenant_id = $1 AND id = $2 FOR UPDATE",
        );
        let row: Option<(Option<i32>, Option<String>)> = sqlx::query_as(&product_query)
            .bind(&reservation.tenant_id)
            .bind(&reservation.product_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| StorageError::Database(format!("load product inventory: {e}")))?;

        let (inventory_quantity, inventory_policy) = match row {
            Some(values) => values,
            None => {
                tx.rollback().await.map_err(|e| {
                    StorageError::Database(format!("rollback inventory reservation: {e}"))
                })?;
                return Err(StorageError::NotFound);
            }
        };

        let allow_backorder = matches!(inventory_policy.as_deref(), Some("allow_backorder"));
        if let Some(qty) = inventory_quantity {
            if !allow_backorder {
                let now = Utc::now();
                let sum_query =
                    self.orders_query(queries::inventory_reservations::SUM_ACTIVE_BY_PRODUCT);
                let reserved: i64 = sqlx::query_scalar(&sum_query)
                    .bind(&reservation.tenant_id)
                    .bind(&reservation.product_id)
                    .bind(&reservation.variant_id)
                    .bind(now)
                    .fetch_one(&mut *tx)
                    .await
                    .map_err(|e| StorageError::Database(format!("sum active reservations: {e}")))?;
                if reserved + reservation.quantity as i64 > qty as i64 {
                    tx.rollback().await.map_err(|e| {
                        StorageError::Database(format!("rollback inventory reservation: {e}"))
                    })?;
                    return Err(StorageError::Conflict);
                }
            }
        }

        let query = self.orders_query(queries::inventory_reservations::INSERT);
        sqlx::query(&query)
            .bind(&reservation.id)
            .bind(&reservation.tenant_id)
            .bind(&reservation.product_id)
            .bind(&reservation.variant_id)
            .bind(reservation.quantity)
            .bind(reservation.expires_at)
            .bind(&reservation.cart_id)
            .bind(&reservation.status)
            .bind(reservation.created_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| StorageError::Database(format!("insert inventory reservation: {e}")))?;

        tx.commit()
            .await
            .map_err(|e| StorageError::Database(format!("commit inventory reservation: {e}")))?;
        Ok(())
    }

    async fn get_active_inventory_reservation_quantity(
        &self,
        tenant_id: &str,
        product_id: &str,
        variant_id: Option<&str>,
        now: DateTime<Utc>,
    ) -> StorageResult<i64> {
        let query = self.orders_query(queries::inventory_reservations::SUM_ACTIVE_BY_PRODUCT);
        let reserved: i64 = sqlx::query_scalar(&query)
            .bind(tenant_id)
            .bind(product_id)
            .bind(variant_id)
            .bind(now)
            .fetch_one(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("sum active reservations: {e}")))?;
        Ok(reserved)
    }

    async fn get_active_inventory_reservation_quantity_excluding_cart(
        &self,
        tenant_id: &str,
        product_id: &str,
        variant_id: Option<&str>,
        exclude_cart_id: &str,
        now: DateTime<Utc>,
    ) -> StorageResult<i64> {
        let query = self
            .orders_query(queries::inventory_reservations::SUM_ACTIVE_BY_PRODUCT_EXCLUDING_CART);
        let reserved: i64 = sqlx::query_scalar(&query)
            .bind(tenant_id)
            .bind(product_id)
            .bind(variant_id)
            .bind(now)
            .bind(exclude_cart_id)
            .fetch_one(self.pool.inner())
            .await
            .map_err(|e| {
                StorageError::Database(format!("sum active reservations excluding cart: {e}"))
            })?;
        Ok(reserved)
    }

    async fn list_active_reservations_for_cart(
        &self,
        tenant_id: &str,
        cart_id: &str,
    ) -> StorageResult<Vec<InventoryReservation>> {
        let query = self.orders_query(queries::inventory_reservations::LIST_ACTIVE_BY_CART);
        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(cart_id)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list inventory reservations: {e}")))?;
        rows.into_iter().map(parse_inventory_reservation).collect()
    }

    async fn release_inventory_reservations(
        &self,
        tenant_id: &str,
        cart_id: &str,
        _released_at: DateTime<Utc>,
    ) -> StorageResult<u64> {
        let query = self.orders_query(queries::inventory_reservations::RELEASE_BY_CART);
        let result = sqlx::query(&query)
            .bind(tenant_id)
            .bind(cart_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("release inventory reservations: {e}")))?;
        Ok(result.rows_affected())
    }

    async fn convert_inventory_reservations(
        &self,
        tenant_id: &str,
        cart_id: &str,
        _converted_at: DateTime<Utc>,
    ) -> StorageResult<u64> {
        let query = self.orders_query(queries::inventory_reservations::CONVERT_BY_CART);
        let result = sqlx::query(&query)
            .bind(tenant_id)
            .bind(cart_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("convert inventory reservations: {e}")))?;
        Ok(result.rows_affected())
    }

    async fn cleanup_expired_inventory_reservations(
        &self,
        now: DateTime<Utc>,
    ) -> StorageResult<u64> {
        let query = self.orders_query(queries::inventory_reservations::CLEANUP_EXPIRED);
        let result = sqlx::query(&query)
            .bind(now)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("cleanup inventory reservations: {e}")))?;
        Ok(result.rows_affected())
    }

    async fn record_inventory_adjustment(
        &self,
        adjustment: InventoryAdjustment,
    ) -> StorageResult<()> {
        let query = self.orders_query(queries::inventory_adjustments::INSERT);
        sqlx::query(&query)
            .bind(&adjustment.id)
            .bind(&adjustment.tenant_id)
            .bind(&adjustment.product_id)
            .bind(&adjustment.variant_id)
            .bind(adjustment.delta)
            .bind(adjustment.quantity_before)
            .bind(adjustment.quantity_after)
            .bind(&adjustment.reason)
            .bind(&adjustment.actor)
            .bind(adjustment.created_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("insert inventory adjustment: {e}")))?;
        Ok(())
    }

    async fn list_inventory_adjustments(
        &self,
        tenant_id: &str,
        product_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<InventoryAdjustment>> {
        let query = self.orders_query(queries::inventory_adjustments::LIST_BY_PRODUCT);
        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(product_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list inventory adjustments: {e}")))?;
        rows.into_iter().map(parse_inventory_adjustment).collect()
    }

    async fn update_inventory_batch(
        &self,
        tenant_id: &str,
        updates: Vec<(String, Option<String>, i32)>, // (product_id, variant_id, delta)
        reason: Option<&str>,
        actor: Option<&str>,
    ) -> StorageResult<std::collections::HashMap<String, (i32, i32)>> {
        use std::collections::HashMap;

        if updates.is_empty() {
            return Ok(HashMap::new());
        }

        let mut tx = self
            .pool
            .inner()
            .begin()
            .await
            .map_err(|e| StorageError::Database(format!("begin batch inventory tx: {e}")))?;

        let now = Utc::now();
        let mut results = HashMap::with_capacity(updates.len());

        // For simplicity and correctness, we process within a transaction but still one at a time
        // This maintains the existing behavior while ensuring atomicity
        // A true UNNEST batch would require complex JSONB updates for variants
        for (product_id, variant_id, delta) in updates {
            // Get current product with lock
            let query = self.products_query(
                "SELECT id, inventory_quantity, variants FROM products WHERE tenant_id = $1 AND id = $2 FOR UPDATE",
            );
            let row: Option<(String, Option<i32>, Option<serde_json::Value>)> =
                sqlx::query_as(&query)
                    .bind(tenant_id)
                    .bind(&product_id)
                    .fetch_optional(&mut *tx)
                    .await
                    .map_err(|e| {
                        StorageError::Database(format!("fetch product for inventory update: {e}"))
                    })?;

            let (current_qty, next_qty) = match row {
                Some((_, inv_qty, variants_json)) => {
                    if let Some(ref vid) = variant_id {
                        // Variant-level inventory
                        let variants: Vec<crate::models::ProductVariant> = variants_json
                            .map(|v| serde_json::from_value(v).unwrap_or_default())
                            .unwrap_or_default();
                        let variant = variants.iter().find(|v| v.id == *vid);
                        match variant.and_then(|v| v.inventory_quantity) {
                            Some(qty) => {
                                let next = qty.saturating_sub(delta).max(0);
                                // Update variant inventory
                                let updated_variants: Vec<crate::models::ProductVariant> = variants
                                    .into_iter()
                                    .map(|mut v| {
                                        if v.id == *vid {
                                            v.inventory_quantity = Some(next);
                                        }
                                        v
                                    })
                                    .collect();
                                let update_query = self.products_query(
                                    "UPDATE products SET variants = $3, updated_at = $4 WHERE tenant_id = $1 AND id = $2",
                                );
                                let variants_json = serde_json::to_value(&updated_variants)
                                    .map_err(|e| {
                                        StorageError::Database(format!("serialize variants: {e}"))
                                    })?;
                                sqlx::query(&update_query)
                                    .bind(tenant_id)
                                    .bind(&product_id)
                                    .bind(&variants_json)
                                    .bind(now)
                                    .execute(&mut *tx)
                                    .await
                                    .map_err(|e| {
                                        StorageError::Database(format!(
                                            "update variant inventory: {e}"
                                        ))
                                    })?;
                                (qty, next)
                            }
                            None => continue, // No inventory tracking for this variant
                        }
                    } else {
                        // Product-level inventory
                        match inv_qty {
                            Some(qty) => {
                                let next = qty.saturating_sub(delta).max(0);
                                let update_query = self.products_query(
                                    "UPDATE products SET inventory_quantity = $3, updated_at = $4 WHERE tenant_id = $1 AND id = $2",
                                );
                                sqlx::query(&update_query)
                                    .bind(tenant_id)
                                    .bind(&product_id)
                                    .bind(next)
                                    .bind(now)
                                    .execute(&mut *tx)
                                    .await
                                    .map_err(|e| {
                                        StorageError::Database(format!(
                                            "update product inventory: {e}"
                                        ))
                                    })?;
                                (qty, next)
                            }
                            None => continue, // No inventory tracking
                        }
                    }
                }
                None => continue, // Product not found
            };

            // Record adjustment
            let adjust_query = self.orders_query(queries::inventory_adjustments::INSERT);
            let adjustment_id = uuid::Uuid::new_v4().to_string();
            sqlx::query(&adjust_query)
                .bind(&adjustment_id)
                .bind(tenant_id)
                .bind(&product_id)
                .bind(&variant_id)
                .bind(-delta) // delta is quantity consumed, so adjustment is negative
                .bind(current_qty)
                .bind(next_qty)
                .bind(reason)
                .bind(actor)
                .bind(now)
                .execute(&mut *tx)
                .await
                .map_err(|e| StorageError::Database(format!("record inventory adjustment: {e}")))?;

            results.insert(product_id, (current_qty, next_qty));
        }

        tx.commit()
            .await
            .map_err(|e| StorageError::Database(format!("commit batch inventory tx: {e}")))?;

        Ok(results)
    }

    async fn create_shipping_profile(&self, profile: ShippingProfile) -> StorageResult<()> {
        let countries_json = serde_json::to_value(&profile.countries)
            .map_err(|e| StorageError::Database(format!("serialize countries: {e}")))?;
        let query = self.orders_query(queries::shipping_profiles::INSERT);
        sqlx::query(&query)
            .bind(&profile.id)
            .bind(&profile.tenant_id)
            .bind(&profile.name)
            .bind(&profile.description)
            .bind(&countries_json)
            .bind(profile.active)
            .bind(profile.created_at)
            .bind(profile.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("insert shipping profile: {e}")))?;
        Ok(())
    }

    async fn update_shipping_profile(&self, profile: ShippingProfile) -> StorageResult<()> {
        let countries_json = serde_json::to_value(&profile.countries)
            .map_err(|e| StorageError::Database(format!("serialize countries: {e}")))?;
        let query = self.orders_query(queries::shipping_profiles::UPDATE);
        let result = sqlx::query(&query)
            .bind(&profile.tenant_id)
            .bind(&profile.id)
            .bind(&profile.name)
            .bind(&profile.description)
            .bind(&countries_json)
            .bind(profile.active)
            .bind(profile.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("update shipping profile: {e}")))?;
        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn get_shipping_profile(
        &self,
        tenant_id: &str,
        profile_id: &str,
    ) -> StorageResult<Option<ShippingProfile>> {
        let query = self.orders_query(queries::shipping_profiles::GET);
        let row = sqlx::query(&query)
            .bind(tenant_id)
            .bind(profile_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get shipping profile: {e}")))?;
        row.map(parse_shipping_profile).transpose()
    }

    async fn list_shipping_profiles(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ShippingProfile>> {
        let query = self.orders_query(queries::shipping_profiles::LIST);
        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list shipping profiles: {e}")))?;
        rows.into_iter().map(parse_shipping_profile).collect()
    }

    async fn delete_shipping_profile(
        &self,
        tenant_id: &str,
        profile_id: &str,
    ) -> StorageResult<()> {
        let query = self.orders_query(queries::shipping_profiles::DELETE);
        let result = sqlx::query(&query)
            .bind(tenant_id)
            .bind(profile_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("delete shipping profile: {e}")))?;
        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn create_shipping_rate(&self, rate: ShippingRate) -> StorageResult<()> {
        let query = self.orders_query(queries::shipping_rates::INSERT);
        sqlx::query(&query)
            .bind(&rate.id)
            .bind(&rate.tenant_id)
            .bind(&rate.profile_id)
            .bind(&rate.name)
            .bind(&rate.rate_type)
            .bind(rate.amount_atomic)
            .bind(&rate.currency)
            .bind(rate.min_subtotal)
            .bind(rate.max_subtotal)
            .bind(rate.active)
            .bind(rate.created_at)
            .bind(rate.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("insert shipping rate: {e}")))?;
        Ok(())
    }

    async fn update_shipping_rate(&self, rate: ShippingRate) -> StorageResult<()> {
        let query = self.orders_query(queries::shipping_rates::UPDATE);
        let result = sqlx::query(&query)
            .bind(&rate.tenant_id)
            .bind(&rate.id)
            .bind(&rate.name)
            .bind(&rate.rate_type)
            .bind(rate.amount_atomic)
            .bind(&rate.currency)
            .bind(rate.min_subtotal)
            .bind(rate.max_subtotal)
            .bind(rate.active)
            .bind(rate.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("update shipping rate: {e}")))?;
        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn list_shipping_rates(
        &self,
        tenant_id: &str,
        profile_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ShippingRate>> {
        let query = self.orders_query(queries::shipping_rates::LIST);
        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(profile_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list shipping rates: {e}")))?;
        rows.into_iter().map(parse_shipping_rate).collect()
    }

    async fn delete_shipping_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<()> {
        let query = self.orders_query(queries::shipping_rates::DELETE);
        let result = sqlx::query(&query)
            .bind(tenant_id)
            .bind(rate_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("delete shipping rate: {e}")))?;
        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn create_tax_rate(&self, rate: TaxRate) -> StorageResult<()> {
        let query = self.orders_query(queries::tax_rates::INSERT);
        sqlx::query(&query)
            .bind(&rate.id)
            .bind(&rate.tenant_id)
            .bind(&rate.name)
            .bind(&rate.country)
            .bind(&rate.region)
            .bind(rate.rate_bps)
            .bind(rate.active)
            .bind(rate.created_at)
            .bind(rate.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("insert tax rate: {e}")))?;
        Ok(())
    }

    async fn update_tax_rate(&self, rate: TaxRate) -> StorageResult<()> {
        let query = self.orders_query(queries::tax_rates::UPDATE);
        let result = sqlx::query(&query)
            .bind(&rate.tenant_id)
            .bind(&rate.id)
            .bind(&rate.name)
            .bind(&rate.country)
            .bind(&rate.region)
            .bind(rate.rate_bps)
            .bind(rate.active)
            .bind(rate.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("update tax rate: {e}")))?;
        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn get_tax_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<Option<TaxRate>> {
        let query = self.orders_query(queries::tax_rates::GET);
        let row = sqlx::query(&query)
            .bind(tenant_id)
            .bind(rate_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get tax rate: {e}")))?;
        row.map(parse_tax_rate).transpose()
    }

    async fn list_tax_rates(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<TaxRate>> {
        let query = self.orders_query(queries::tax_rates::LIST);
        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list tax rates: {e}")))?;
        rows.into_iter().map(parse_tax_rate).collect()
    }

    async fn delete_tax_rate(&self, tenant_id: &str, rate_id: &str) -> StorageResult<()> {
        let query = self.orders_query(queries::tax_rates::DELETE);
        let result = sqlx::query(&query)
            .bind(tenant_id)
            .bind(rate_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("delete tax rate: {e}")))?;
        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn create_customer(&self, customer: Customer) -> StorageResult<()> {
        let addresses_json = serde_json::to_value(&customer.addresses)
            .map_err(|e| StorageError::Database(format!("serialize customer addresses: {e}")))?;
        let query = self.orders_query(queries::customers::INSERT);
        sqlx::query(&query)
            .bind(&customer.id)
            .bind(&customer.tenant_id)
            .bind(&customer.email)
            .bind(&customer.name)
            .bind(&customer.phone)
            .bind(&addresses_json)
            .bind(customer.created_at)
            .bind(customer.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("insert customer: {e}")))?;
        Ok(())
    }

    async fn update_customer(&self, customer: Customer) -> StorageResult<()> {
        let addresses_json = serde_json::to_value(&customer.addresses)
            .map_err(|e| StorageError::Database(format!("serialize customer addresses: {e}")))?;
        let query = self.orders_query(queries::customers::UPDATE);
        let result = sqlx::query(&query)
            .bind(&customer.tenant_id)
            .bind(&customer.id)
            .bind(&customer.email)
            .bind(&customer.name)
            .bind(&customer.phone)
            .bind(&addresses_json)
            .bind(customer.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("update customer: {e}")))?;
        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn get_customer(
        &self,
        tenant_id: &str,
        customer_id: &str,
    ) -> StorageResult<Option<Customer>> {
        let query = self.orders_query(queries::customers::GET);
        let row = sqlx::query(&query)
            .bind(tenant_id)
            .bind(customer_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get customer: {e}")))?;
        row.map(parse_customer).transpose()
    }

    async fn list_customers(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Customer>> {
        let query = self.orders_query(queries::customers::LIST);
        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list customers: {e}")))?;
        rows.into_iter().map(parse_customer).collect()
    }

    async fn create_dispute(&self, dispute: DisputeRecord) -> StorageResult<()> {
        let metadata_json = serde_json::to_value(&dispute.metadata)
            .map_err(|e| StorageError::Database(format!("serialize dispute metadata: {e}")))?;
        let query = self.orders_query(queries::disputes::INSERT);
        sqlx::query(&query)
            .bind(&dispute.id)
            .bind(&dispute.tenant_id)
            .bind(&dispute.source)
            .bind(&dispute.order_id)
            .bind(&dispute.payment_intent_id)
            .bind(&dispute.charge_id)
            .bind(&dispute.status)
            .bind(&dispute.reason)
            .bind(dispute.amount)
            .bind(&dispute.currency)
            .bind(&metadata_json)
            .bind(dispute.created_at)
            .bind(dispute.updated_at)
            .bind(dispute.status_updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("insert dispute: {e}")))?;
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
        let query = self.orders_query(queries::disputes::UPDATE_STATUS);
        let result = sqlx::query(&query)
            .bind(tenant_id)
            .bind(dispute_id)
            .bind(status)
            .bind(status_updated_at)
            .bind(updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("update dispute status: {e}")))?;
        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn get_dispute(
        &self,
        tenant_id: &str,
        dispute_id: &str,
    ) -> StorageResult<Option<DisputeRecord>> {
        let query = self.orders_query(queries::disputes::GET);
        let row = sqlx::query(&query)
            .bind(tenant_id)
            .bind(dispute_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get dispute: {e}")))?;
        row.map(parse_dispute).transpose()
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
        let query = self.orders_query(queries::disputes::LIST);
        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(status)
            .bind(source)
            .bind(order_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list disputes: {e}")))?;
        rows.into_iter().map(parse_dispute).collect()
    }

    async fn create_gift_card(&self, card: GiftCard) -> StorageResult<()> {
        let metadata_json = serde_json::to_value(&card.metadata)
            .map_err(|e| StorageError::Database(format!("serialize gift card metadata: {e}")))?;
        let query = self.orders_query(queries::gift_cards::INSERT);
        sqlx::query(&query)
            .bind(&card.code)
            .bind(&card.tenant_id)
            .bind(card.initial_balance)
            .bind(card.balance)
            .bind(&card.currency)
            .bind(card.active)
            .bind(card.expires_at)
            .bind(&metadata_json)
            .bind(card.created_at)
            .bind(card.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("insert gift card: {e}")))?;
        Ok(())
    }

    async fn update_gift_card(&self, card: GiftCard) -> StorageResult<()> {
        let metadata_json = serde_json::to_value(&card.metadata)
            .map_err(|e| StorageError::Database(format!("serialize gift card metadata: {e}")))?;
        let query = self.orders_query(queries::gift_cards::UPDATE);
        let result = sqlx::query(&query)
            .bind(&card.tenant_id)
            .bind(&card.code)
            .bind(card.initial_balance)
            .bind(card.balance)
            .bind(&card.currency)
            .bind(card.active)
            .bind(card.expires_at)
            .bind(&metadata_json)
            .bind(card.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("update gift card: {e}")))?;
        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn get_gift_card(&self, tenant_id: &str, code: &str) -> StorageResult<Option<GiftCard>> {
        let query = self.orders_query(queries::gift_cards::GET);
        let row = sqlx::query(&query)
            .bind(tenant_id)
            .bind(code)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get gift card: {e}")))?;
        row.map(parse_gift_card).transpose()
    }

    async fn list_gift_cards(
        &self,
        tenant_id: &str,
        active_only: Option<bool>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<GiftCard>> {
        let query = self.orders_query(queries::gift_cards::LIST);
        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(active_only)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list gift cards: {e}")))?;
        rows.into_iter().map(parse_gift_card).collect()
    }

    async fn adjust_gift_card_balance(
        &self,
        tenant_id: &str,
        code: &str,
        new_balance: i64,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        let query = self.orders_query(queries::gift_cards::UPDATE_BALANCE);
        let result = sqlx::query(&query)
            .bind(tenant_id)
            .bind(code)
            .bind(new_balance)
            .bind(updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("update gift card balance: {e}")))?;
        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn try_adjust_gift_card_balance(
        &self,
        tenant_id: &str,
        code: &str,
        deduction: i64,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<Option<i64>> {
        let query = self.orders_query(queries::gift_cards::TRY_ADJUST_BALANCE);
        let row = sqlx::query_scalar::<_, i64>(&query)
            .bind(tenant_id)
            .bind(code)
            .bind(deduction)
            .bind(updated_at)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("try adjust gift card balance: {e}")))?;
        Ok(row)
    }

    async fn create_collection(&self, collection: Collection) -> StorageResult<()> {
        let product_ids_json = serde_json::to_value(&collection.product_ids).map_err(|e| {
            StorageError::Database(format!("serialize collection product_ids: {e}"))
        })?;
        let query = self.orders_query(queries::collections::INSERT);
        sqlx::query(&query)
            .bind(&collection.id)
            .bind(&collection.tenant_id)
            .bind(&collection.name)
            .bind(&collection.description)
            .bind(&product_ids_json)
            .bind(collection.active)
            .bind(collection.created_at)
            .bind(collection.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("insert collection: {e}")))?;
        Ok(())
    }

    async fn update_collection(&self, collection: Collection) -> StorageResult<()> {
        let product_ids_json = serde_json::to_value(&collection.product_ids).map_err(|e| {
            StorageError::Database(format!("serialize collection product_ids: {e}"))
        })?;
        let query = self.orders_query(queries::collections::UPDATE);
        let result = sqlx::query(&query)
            .bind(&collection.tenant_id)
            .bind(&collection.id)
            .bind(&collection.name)
            .bind(&collection.description)
            .bind(&product_ids_json)
            .bind(collection.active)
            .bind(collection.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("update collection: {e}")))?;
        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn get_collection(
        &self,
        tenant_id: &str,
        collection_id: &str,
    ) -> StorageResult<Option<Collection>> {
        let query = self.orders_query(queries::collections::GET);
        let row = sqlx::query(&query)
            .bind(tenant_id)
            .bind(collection_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get collection: {e}")))?;
        row.map(parse_collection).transpose()
    }

    async fn list_collections(
        &self,
        tenant_id: &str,
        active_only: Option<bool>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Collection>> {
        let query = self.orders_query(queries::collections::LIST);
        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(active_only)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list collections: {e}")))?;
        rows.into_iter().map(parse_collection).collect()
    }

    async fn delete_collection(&self, tenant_id: &str, collection_id: &str) -> StorageResult<()> {
        let query = self.orders_query(queries::collections::DELETE);
        let result = sqlx::query(&query)
            .bind(tenant_id)
            .bind(collection_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("delete collection: {e}")))?;
        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Payments
    // ─────────────────────────────────────────────────────────────────────────

    async fn record_payment(&self, tx: PaymentTransaction) -> StorageResult<()> {
        let metadata_json = serde_json::to_value(&tx.metadata)
            .map_err(|e| StorageError::Database(format!("serialize metadata: {}", e)))?;

        // Per spec (09-storage-postgres.md): Include tenant_id for multi-tenancy
        let query = self.payment_query(queries::payment::INSERT);
        sqlx::query(&query)
            .bind(&tx.signature)
            .bind(&tx.tenant_id)
            .bind(&tx.resource_id)
            .bind(&tx.wallet)
            .bind(&tx.user_id)
            .bind(tx.amount.to_atomic())
            .bind(&tx.amount.asset.code)
            .bind(tx.created_at)
            .bind(&metadata_json)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("record payment: {}", e)))?;

        Ok(())
    }

    async fn record_payments(&self, txs: Vec<PaymentTransaction>) -> StorageResult<()> {
        // Per spec (08-storage.md line 19): RecordPayments must be atomic for replay protection
        let mut db_tx = self
            .pool
            .inner()
            .begin()
            .await
            .map_err(|e| StorageError::Database(format!("begin transaction: {}", e)))?;

        for payment_tx in txs {
            let metadata_json = serde_json::to_value(&payment_tx.metadata)
                .map_err(|e| StorageError::Database(format!("serialize metadata: {}", e)))?;

            let query = self.payment_query(queries::payment::INSERT);
            sqlx::query(&query)
                .bind(&payment_tx.signature)
                .bind(&payment_tx.tenant_id)
                .bind(&payment_tx.resource_id)
                .bind(&payment_tx.wallet)
                .bind(&payment_tx.user_id)
                .bind(payment_tx.amount.to_atomic())
                .bind(&payment_tx.amount.asset.code)
                .bind(payment_tx.created_at)
                .bind(&metadata_json)
                .execute(&mut *db_tx)
                .await
                .map_err(|e| StorageError::Database(format!("record payment: {}", e)))?;
        }

        db_tx
            .commit()
            .await
            .map_err(|e| StorageError::Database(format!("commit transaction: {}", e)))?;
        Ok(())
    }

    async fn try_record_payment(&self, tx: PaymentTransaction) -> StorageResult<bool> {
        let metadata_json = serde_json::to_value(&tx.metadata)
            .map_err(|e| StorageError::Database(format!("serialize metadata: {}", e)))?;

        // INSERT ... ON CONFLICT DO NOTHING returns 0 rows_affected if conflict
        let query = self.payment_query(queries::payment::INSERT);
        let result = sqlx::query(&query)
            .bind(&tx.signature)
            .bind(&tx.tenant_id)
            .bind(&tx.resource_id)
            .bind(&tx.wallet)
            .bind(&tx.user_id)
            .bind(tx.amount.to_atomic())
            .bind(&tx.amount.asset.code)
            .bind(tx.created_at)
            .bind(&metadata_json)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("try record payment: {}", e)))?;

        Ok(result.rows_affected() > 0)
    }

    async fn delete_payment(&self, tenant_id: &str, signature: &str) -> StorageResult<()> {
        let query = self.payment_query(queries::payment::DELETE_BY_SIGNATURE);
        sqlx::query(&query)
            .bind(signature)
            .bind(tenant_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("delete payment: {}", e)))?;
        Ok(())
    }

    async fn has_payment_been_processed(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> StorageResult<bool> {
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let query = self.payment_query(queries::payment::EXISTS);
        let (exists,): (bool,) = sqlx::query_as(&query)
            .bind(signature)
            .bind(tenant_id)
            .fetch_one(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("check payment: {}", e)))?;

        Ok(exists)
    }

    async fn get_payment(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> StorageResult<Option<PaymentTransaction>> {
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let query = self.payment_query(queries::payment::GET_BY_SIGNATURE);
        let row = sqlx::query(&query)
            .bind(signature)
            .bind(tenant_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get payment: {}", e)))?;

        row.map(parse_payment_transaction).transpose()
    }

    async fn get_purchase_by_signature(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> StorageResult<Option<Purchase>> {
        let tx = self.get_payment(tenant_id, signature).await?;
        Ok(tx.map(|tx| Purchase {
            signature: tx.signature,
            tenant_id: tx.tenant_id,
            resource_id: tx.resource_id,
            wallet: (!tx.wallet.is_empty()).then_some(tx.wallet),
            user_id: tx.user_id,
            amount: tx.amount.to_major().to_string(),
            paid_at: tx.created_at,
            metadata: Some(serde_json::to_value(&tx.metadata).unwrap_or_default()),
        }))
    }

    async fn store_credits_hold(&self, hold: CreditsHold) -> StorageResult<()> {
        // SECURITY: Avoid overwriting an existing hold binding.
        // Insert is idempotent; on conflict we only refresh expires_at if the binding matches.
        let insert_query = self.credits_hold_query(queries::credits_hold::UPSERT);
        let inserted = sqlx::query(&insert_query)
            .bind(&hold.tenant_id)
            .bind(&hold.hold_id)
            .bind(&hold.user_id)
            .bind(&hold.resource_id)
            .bind(hold.amount)
            .bind(&hold.amount_asset)
            .bind(hold.created_at)
            .bind(hold.expires_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("store credits hold: {}", e)))?;

        if inserted.rows_affected() > 0 {
            return Ok(());
        }

        // Existing hold found; only extend expiry if the original binding matches.
        let update_query =
            self.credits_hold_query(queries::credits_hold::UPDATE_EXPIRES_AT_IF_MATCH);
        let updated = sqlx::query(&update_query)
            .bind(&hold.tenant_id)
            .bind(&hold.hold_id)
            .bind(&hold.user_id)
            .bind(&hold.resource_id)
            .bind(hold.amount)
            .bind(&hold.amount_asset)
            .bind(hold.expires_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("store credits hold: {}", e)))?;

        if updated.rows_affected() > 0 {
            return Ok(());
        }

        Err(StorageError::Conflict)
    }

    async fn get_credits_hold(
        &self,
        tenant_id: &str,
        hold_id: &str,
    ) -> StorageResult<Option<CreditsHold>> {
        let query = self.credits_hold_query(queries::credits_hold::GET_BY_ID);
        let row = sqlx::query(&query)
            .bind(tenant_id)
            .bind(hold_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get credits hold: {}", e)))?;

        row.map(parse_credits_hold).transpose()
    }

    async fn delete_credits_hold(&self, tenant_id: &str, hold_id: &str) -> StorageResult<()> {
        let query = self.credits_hold_query(queries::credits_hold::DELETE_BY_ID);
        sqlx::query(&query)
            .bind(tenant_id)
            .bind(hold_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("delete credits hold: {}", e)))?;
        Ok(())
    }

    async fn cleanup_expired_credits_holds(&self) -> StorageResult<u64> {
        let query = self.credits_hold_query(queries::credits_hold::CLEANUP_EXPIRED);
        let res = sqlx::query(&query)
            .bind(Utc::now())
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("cleanup credits holds: {}", e)))?;
        Ok(res.rows_affected())
    }

    async fn list_purchases_by_user_id(
        &self,
        tenant_id: &str,
        user_id: &str,
        limit: i64,
        offset: i64,
    ) -> StorageResult<Vec<Purchase>> {
        let query = self.payment_query(queries::payment::LIST_BY_USER_ID);
        let rows = sqlx::query(&query)
            .bind(tenant_id)
            .bind(user_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list purchases: {}", e)))?;

        let txs: Vec<PaymentTransaction> = rows
            .into_iter()
            .map(parse_payment_transaction)
            .collect::<StorageResult<Vec<_>>>()?;

        Ok(txs
            .into_iter()
            .map(|tx| Purchase {
                signature: tx.signature,
                tenant_id: tx.tenant_id,
                resource_id: tx.resource_id,
                wallet: (!tx.wallet.is_empty()).then_some(tx.wallet),
                user_id: tx.user_id,
                amount: tx.amount.to_major().to_string(),
                paid_at: tx.created_at,
                metadata: Some(serde_json::to_value(&tx.metadata).unwrap_or_default()),
            })
            .collect())
    }

    async fn has_valid_access(
        &self,
        tenant_id: &str,
        resource: &str,
        wallet: &str,
    ) -> StorageResult<bool> {
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let query = self.payment_query(queries::payment::HAS_ACCESS);
        let cutoff = access_cutoff(Utc::now());
        let (exists,): (bool,) = sqlx::query_as(&query)
            .bind(tenant_id)
            .bind(resource)
            .bind(wallet)
            .bind(cutoff)
            .fetch_one(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("check access: {}", e)))?;

        Ok(exists)
    }

    async fn archive_old_payments(&self, older_than: DateTime<Utc>) -> StorageResult<u64> {
        // Admin operation across all tenants
        let query = self.payment_query(queries::payment::ARCHIVE_OLD_ALL);
        let result = sqlx::query(&query)
            .bind(older_than)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("archive payments: {}", e)))?;

        Ok(result.rows_affected())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin nonces
    // ─────────────────────────────────────────────────────────────────────────

    async fn create_nonce(&self, nonce: AdminNonce) -> StorageResult<()> {
        // Per spec (08-storage.md): INSERT includes tenant_id for multi-tenancy
        let query = self.nonce_query(queries::nonce::INSERT);
        sqlx::query(&query)
            .bind(&nonce.id)
            .bind(&nonce.tenant_id)
            .bind(&nonce.purpose)
            .bind(nonce.created_at)
            .bind(nonce.expires_at)
            .bind(nonce.consumed_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("create nonce: {}", e)))?;

        Ok(())
    }

    async fn get_nonce(
        &self,
        tenant_id: &str,
        nonce_id: &str,
    ) -> StorageResult<Option<AdminNonce>> {
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let query = self.nonce_query(queries::nonce::GET_BY_ID);
        let row = sqlx::query(&query)
            .bind(nonce_id)
            .bind(tenant_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get nonce: {}", e)))?;

        row.map(parse_admin_nonce).transpose()
    }

    async fn consume_nonce(&self, tenant_id: &str, nonce_id: &str) -> StorageResult<()> {
        // Per spec (08-storage.md): Update filters by tenant_id for isolation
        // CRIT-002: Atomically consume nonce; WHERE clause includes consumed_at IS NULL
        let query = self.nonce_query(queries::nonce::CONSUME);
        let result = sqlx::query(&query)
            .bind(nonce_id)
            .bind(tenant_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("consume nonce: {}", e)))?;

        if result.rows_affected() == 0 {
            // CRIT-002: Distinguish between "not found" and "already consumed"
            // Check if nonce exists (without consumed_at filter)
            let check_query = self.nonce_query(queries::nonce::GET_BY_ID);
            let exists: Option<sqlx::postgres::PgRow> = sqlx::query(&check_query)
                .bind(nonce_id)
                .bind(tenant_id)
                .fetch_optional(self.pool.inner())
                .await
                .map_err(|e| StorageError::Database(format!("check nonce exists: {}", e)))?;

            if exists.is_some() {
                // Nonce exists but was already consumed - replay attack attempt
                return Err(StorageError::Conflict);
            }
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn cleanup_expired_nonces(&self) -> StorageResult<u64> {
        // Admin operation across all tenants
        let query = self.nonce_query(queries::nonce::CLEANUP_EXPIRED_ALL);
        let result = sqlx::query(&query)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("cleanup nonces: {}", e)))?;

        Ok(result.rows_affected())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Webhooks
    // ─────────────────────────────────────────────────────────────────────────

    async fn enqueue_webhook(&self, webhook: PendingWebhook) -> StorageResult<String> {
        let headers_json = serde_json::to_value(&webhook.headers)
            .map_err(|e| StorageError::Database(format!("serialize headers: {}", e)))?;

        let status_str = match webhook.status {
            WebhookStatus::Pending => "pending",
            WebhookStatus::Processing => "processing",
            WebhookStatus::Success => "success",
            WebhookStatus::Failed => "failed",
        };

        // Per spec (20-webhooks.md): INSERT must include tenant_id
        let query = self.webhook_query(queries::webhook::INSERT);
        sqlx::query(&query)
            .bind(&webhook.id)
            .bind(&webhook.tenant_id)
            .bind(&webhook.url)
            .bind(&webhook.payload)
            .bind(&webhook.payload_bytes)
            .bind(&headers_json)
            .bind(&webhook.event_type)
            .bind(status_str)
            .bind(webhook.attempts)
            .bind(webhook.max_attempts)
            .bind(&webhook.last_error)
            .bind(webhook.last_attempt_at)
            .bind(webhook.next_attempt_at)
            .bind(webhook.created_at)
            .bind(webhook.completed_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("enqueue webhook: {}", e)))?;

        Ok(webhook.id)
    }

    async fn dequeue_webhooks(&self, limit: i32) -> StorageResult<Vec<PendingWebhook>> {
        let query = self.webhook_query(queries::webhook::DEQUEUE);
        let rows = sqlx::query(&query)
            .bind(limit)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("dequeue webhooks: {}", e)))?;

        rows.into_iter().map(parse_webhook).collect()
    }

    async fn mark_webhook_processing(&self, webhook_id: &str) -> StorageResult<()> {
        let query = self.webhook_query(queries::webhook::MARK_PROCESSING);
        sqlx::query(&query)
            .bind(webhook_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("mark webhook processing: {}", e)))?;

        Ok(())
    }

    async fn mark_webhook_success(&self, webhook_id: &str) -> StorageResult<()> {
        let query = self.webhook_query(queries::webhook::MARK_SUCCESS);
        sqlx::query(&query)
            .bind(webhook_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("mark webhook success: {}", e)))?;

        Ok(())
    }

    async fn mark_webhook_failed(
        &self,
        webhook_id: &str,
        error: &str,
        next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        let query = self.webhook_query(queries::webhook::MARK_FAILED);
        sqlx::query(&query)
            .bind(webhook_id)
            .bind(error)
            .bind(next_attempt_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("mark webhook failed: {}", e)))?;

        Ok(())
    }

    async fn mark_webhook_retry(
        &self,
        webhook_id: &str,
        error: &str,
        next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        let query = self.webhook_query(queries::webhook::MARK_RETRY);
        sqlx::query(&query)
            .bind(webhook_id)
            .bind(error)
            .bind(next_attempt_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("mark webhook retry: {}", e)))?;

        Ok(())
    }

    async fn get_webhook(&self, webhook_id: &str) -> StorageResult<Option<PendingWebhook>> {
        let query = self.webhook_query(queries::webhook::GET_BY_ID);
        let row = sqlx::query(&query)
            .bind(webhook_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get webhook: {}", e)))?;

        row.map(parse_webhook).transpose()
    }

    async fn list_webhooks(
        &self,
        status: Option<WebhookStatus>,
        limit: i32,
    ) -> StorageResult<Vec<PendingWebhook>> {
        let status_str = status.map(|s| match s {
            WebhookStatus::Pending => "pending",
            WebhookStatus::Processing => "processing",
            WebhookStatus::Success => "success",
            WebhookStatus::Failed => "failed",
        });

        let query = self.webhook_query(queries::webhook::LIST);
        let rows = sqlx::query(&query)
            .bind(status_str)
            .bind(limit)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list webhooks: {}", e)))?;

        rows.into_iter().map(parse_webhook).collect()
    }

    async fn retry_webhook(&self, webhook_id: &str) -> StorageResult<()> {
        let query = self.webhook_query(queries::webhook::RETRY);
        sqlx::query(&query)
            .bind(webhook_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("retry webhook: {}", e)))?;

        Ok(())
    }

    async fn delete_webhook(&self, webhook_id: &str) -> StorageResult<()> {
        let query = self.webhook_query(queries::webhook::DELETE);
        sqlx::query(&query)
            .bind(webhook_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("delete webhook: {}", e)))?;

        Ok(())
    }

    async fn cleanup_old_webhooks(&self, retention_days: i32) -> StorageResult<u64> {
        let query = self.webhook_query(queries::webhook::CLEANUP_OLD);
        let result = sqlx::query(&query)
            .bind(retention_days.to_string())
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("cleanup old webhooks: {}", e)))?;

        Ok(result.rows_affected())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Email Queue
    // ─────────────────────────────────────────────────────────────────────────

    async fn enqueue_email(&self, email: PendingEmail) -> StorageResult<String> {
        let status_str = email.status.to_string();

        let query = self.email_query(queries::email::INSERT);
        sqlx::query(&query)
            .bind(&email.id)
            .bind(&email.tenant_id)
            .bind(&email.to_email)
            .bind(&email.from_email)
            .bind(&email.from_name)
            .bind(&email.subject)
            .bind(&email.body_text)
            .bind(&email.body_html)
            .bind(&status_str)
            .bind(email.attempts)
            .bind(email.max_attempts)
            .bind(&email.last_error)
            .bind(email.last_attempt_at)
            .bind(email.next_attempt_at)
            .bind(email.created_at)
            .bind(email.completed_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("enqueue email: {}", e)))?;

        Ok(email.id)
    }

    async fn dequeue_emails(&self, limit: i32) -> StorageResult<Vec<PendingEmail>> {
        let query = self.email_query(queries::email::DEQUEUE);
        let rows = sqlx::query(&query)
            .bind(limit)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("dequeue emails: {}", e)))?;

        rows.into_iter().map(parse_email).collect()
    }

    async fn mark_email_processing(&self, email_id: &str) -> StorageResult<()> {
        let query = self.email_query(queries::email::MARK_PROCESSING);
        sqlx::query(&query)
            .bind(email_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("mark email processing: {}", e)))?;

        Ok(())
    }

    async fn mark_email_success(&self, email_id: &str) -> StorageResult<()> {
        let query = self.email_query(queries::email::MARK_SUCCESS);
        sqlx::query(&query)
            .bind(email_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("mark email success: {}", e)))?;

        Ok(())
    }

    async fn mark_email_retry(
        &self,
        email_id: &str,
        error: &str,
        next_attempt_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        let query = self.email_query(queries::email::MARK_RETRY);
        sqlx::query(&query)
            .bind(email_id)
            .bind(error)
            .bind(next_attempt_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("mark email retry: {}", e)))?;

        Ok(())
    }

    async fn mark_email_failed(&self, email_id: &str, error: &str) -> StorageResult<()> {
        let query = self.email_query(queries::email::MARK_FAILED);
        sqlx::query(&query)
            .bind(email_id)
            .bind(error)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("mark email failed: {}", e)))?;

        Ok(())
    }

    async fn get_email(&self, email_id: &str) -> StorageResult<Option<PendingEmail>> {
        let query = self.email_query(queries::email::GET_BY_ID);
        let row = sqlx::query(&query)
            .bind(email_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get email: {}", e)))?;

        row.map(parse_email).transpose()
    }

    async fn cleanup_old_emails(&self, retention_days: i32) -> StorageResult<u64> {
        let query = self.email_query(queries::email::CLEANUP_OLD);
        let result = sqlx::query(&query)
            .bind(retention_days.to_string())
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("cleanup old emails: {}", e)))?;

        Ok(result.rows_affected())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Idempotency
    // ─────────────────────────────────────────────────────────────────────────

    async fn save_idempotency_key(
        &self,
        key: &str,
        response: IdempotencyResponse,
        ttl: Duration,
    ) -> StorageResult<()> {
        let headers_json = serde_json::to_value(&response.headers)
            .map_err(|e| StorageError::Database(format!("serialize headers: {}", e)))?;
        let expires_at = Utc::now() + chrono::Duration::from_std(ttl).unwrap_or_default();

        sqlx::query(queries::idempotency::INSERT)
            .bind(key)
            .bind(response.status_code)
            .bind(&headers_json)
            .bind(&response.body)
            .bind(response.cached_at)
            .bind(expires_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("save idempotency key: {}", e)))?;

        Ok(())
    }

    async fn try_save_idempotency_key(
        &self,
        key: &str,
        response: IdempotencyResponse,
        ttl: Duration,
    ) -> StorageResult<bool> {
        let headers_json = serde_json::to_value(&response.headers)
            .map_err(|e| StorageError::Database(format!("serialize headers: {}", e)))?;
        let expires_at = Utc::now() + chrono::Duration::from_std(ttl).unwrap_or_default();

        let result = sqlx::query(queries::idempotency::INSERT_IF_ABSENT)
            .bind(key)
            .bind(response.status_code)
            .bind(&headers_json)
            .bind(&response.body)
            .bind(response.cached_at)
            .bind(expires_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("try save idempotency key: {}", e)))?;

        Ok(result.rows_affected() == 1)
    }

    async fn get_idempotency_key(&self, key: &str) -> StorageResult<Option<IdempotencyResponse>> {
        let row = sqlx::query(queries::idempotency::GET_BY_KEY)
            .bind(key)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get idempotency key: {}", e)))?;

        row.map(parse_idempotency_response).transpose()
    }

    async fn delete_idempotency_key(&self, key: &str) -> StorageResult<()> {
        sqlx::query(queries::idempotency::DELETE)
            .bind(key)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("delete idempotency key: {}", e)))?;

        Ok(())
    }

    async fn cleanup_expired_idempotency_keys(&self) -> StorageResult<u64> {
        let result = sqlx::query(queries::idempotency::CLEANUP_EXPIRED)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("cleanup idempotency keys: {}", e)))?;

        Ok(result.rows_affected())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Subscriptions
    // ─────────────────────────────────────────────────────────────────────────

    async fn save_subscription(&self, sub: Subscription) -> StorageResult<()> {
        let metadata_json = serde_json::to_value(&sub.metadata)
            .map_err(|e| StorageError::Database(format!("serialize metadata: {}", e)))?;

        let status_str = sub.status.to_string();
        let payment_method_str = sub.payment_method.to_string();
        let billing_period_str = sub.billing_period.to_string();

        // Per spec (08-storage.md): INSERT includes tenant_id for multi-tenancy
        sqlx::query(queries::subscription::INSERT)
            .bind(&sub.id)
            .bind(&sub.tenant_id)
            .bind(&sub.product_id)
            .bind(&sub.plan_id)
            .bind(&sub.wallet)
            .bind(&sub.user_id)
            .bind(&sub.stripe_customer_id)
            .bind(&sub.stripe_subscription_id)
            .bind(&payment_method_str)
            .bind(&billing_period_str)
            .bind(sub.billing_interval)
            .bind(&status_str)
            .bind(sub.current_period_start)
            .bind(sub.current_period_end)
            .bind(sub.trial_end)
            .bind(sub.cancelled_at)
            .bind(sub.cancel_at_period_end)
            .bind(&metadata_json)
            .bind(&sub.payment_signature)
            .bind(sub.created_at)
            .bind(sub.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("save subscription: {}", e)))?;

        Ok(())
    }

    async fn get_subscription(
        &self,
        tenant_id: &str,
        id: &str,
    ) -> StorageResult<Option<Subscription>> {
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let row = sqlx::query(queries::subscription::GET_BY_ID)
            .bind(id)
            .bind(tenant_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get subscription: {}", e)))?;

        row.map(parse_subscription).transpose()
    }

    async fn get_subscription_by_wallet(
        &self,
        tenant_id: &str,
        wallet: &str,
        product_id: &str,
    ) -> StorageResult<Option<Subscription>> {
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let row = sqlx::query(queries::subscription::GET_BY_WALLET_PRODUCT)
            .bind(tenant_id)
            .bind(wallet)
            .bind(product_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get subscription by wallet: {}", e)))?;

        row.map(parse_subscription).transpose()
    }

    async fn get_subscriptions_by_wallet(
        &self,
        tenant_id: &str,
        wallet: &str,
    ) -> StorageResult<Vec<Subscription>> {
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let rows = sqlx::query(queries::subscription::GET_BY_WALLET)
            .bind(tenant_id)
            .bind(wallet)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get subscriptions by wallet: {}", e)))?;

        rows.into_iter().map(parse_subscription).collect()
    }

    async fn get_subscription_by_stripe_id(
        &self,
        tenant_id: &str,
        stripe_sub_id: &str,
    ) -> StorageResult<Option<Subscription>> {
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let row = sqlx::query(queries::subscription::GET_BY_STRIPE_ID)
            .bind(tenant_id)
            .bind(stripe_sub_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get subscription by stripe id: {}", e)))?;

        row.map(parse_subscription).transpose()
    }

    async fn find_subscription_by_stripe_id(
        &self,
        stripe_sub_id: &str,
    ) -> StorageResult<Option<Subscription>> {
        // Note: This bypasses tenant isolation for webhook handling where tenant context is unavailable
        let row = sqlx::query(queries::subscription::FIND_BY_STRIPE_ID)
            .bind(stripe_sub_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| {
                StorageError::Database(format!("find subscription by stripe id: {}", e))
            })?;

        row.map(parse_subscription).transpose()
    }

    async fn get_subscription_by_payment_signature(
        &self,
        tenant_id: &str,
        payment_signature: &str,
    ) -> StorageResult<Option<Subscription>> {
        // SECURITY (H-004): Query filters by tenant_id for isolation
        let row = sqlx::query(queries::subscription::GET_BY_PAYMENT_SIGNATURE)
            .bind(tenant_id)
            .bind(payment_signature)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| {
                StorageError::Database(format!("get subscription by payment signature: {}", e))
            })?;

        row.map(parse_subscription).transpose()
    }

    async fn list_active_subscriptions(
        &self,
        tenant_id: &str,
        product_id: Option<&str>,
    ) -> StorageResult<Vec<Subscription>> {
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let rows = sqlx::query(queries::subscription::LIST_ACTIVE)
            .bind(tenant_id)
            .bind(product_id)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list active subscriptions: {}", e)))?;

        rows.into_iter().map(parse_subscription).collect()
    }

    async fn list_expiring_subscriptions(
        &self,
        tenant_id: &str,
        before: DateTime<Utc>,
    ) -> StorageResult<Vec<Subscription>> {
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let rows = sqlx::query(queries::subscription::LIST_EXPIRING)
            .bind(tenant_id)
            .bind(before)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list expiring subscriptions: {}", e)))?;

        rows.into_iter().map(parse_subscription).collect()
    }

    async fn list_expiring_local_subscriptions_limited(
        &self,
        tenant_id: &str,
        before: DateTime<Utc>,
        limit: i64,
    ) -> StorageResult<Vec<Subscription>> {
        let rows = sqlx::query(queries::subscription::LIST_EXPIRING_LOCAL_LIMITED)
            .bind(tenant_id)
            .bind(before)
            .bind(limit)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| {
                StorageError::Database(format!("list expiring local subscriptions: {}", e))
            })?;

        rows.into_iter().map(parse_subscription).collect()
    }

    async fn update_subscription_status(
        &self,
        tenant_id: &str,
        id: &str,
        status: SubscriptionStatus,
    ) -> StorageResult<()> {
        let status_str = status.to_string();

        // Per spec (08-storage.md): Update filters by tenant_id for isolation
        let result = sqlx::query(queries::subscription::UPDATE_STATUS)
            .bind(id)
            .bind(tenant_id)
            .bind(&status_str)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("update subscription status: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    async fn update_subscription_statuses(
        &self,
        tenant_id: &str,
        ids: &[String],
        status: SubscriptionStatus,
    ) -> StorageResult<()> {
        if ids.is_empty() {
            return Ok(());
        }

        let status_str = status.to_string();

        let result = sqlx::query(queries::subscription::UPDATE_STATUS_BATCH)
            .bind(tenant_id)
            .bind(ids)
            .bind(&status_str)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("update subscription statuses: {}", e)))?;

        if result.rows_affected() != ids.len() as u64 {
            return Err(StorageError::NotFound);
        }

        Ok(())
    }

    async fn delete_subscription(&self, tenant_id: &str, id: &str) -> StorageResult<()> {
        // Per spec (08-storage.md): Delete filters by tenant_id for isolation
        sqlx::query(queries::subscription::DELETE)
            .bind(id)
            .bind(tenant_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("delete subscription: {}", e)))?;

        Ok(())
    }

    async fn get_subscriptions_by_stripe_customer_id(
        &self,
        tenant_id: &str,
        customer_id: &str,
    ) -> StorageResult<Vec<Subscription>> {
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let rows = sqlx::query(queries::subscription::GET_BY_STRIPE_CUSTOMER_ID)
            .bind(tenant_id)
            .bind(customer_id)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| {
                StorageError::Database(format!("get subscriptions by stripe customer id: {}", e))
            })?;

        rows.into_iter().map(parse_subscription).collect()
    }

    async fn list_subscriptions_by_product(
        &self,
        tenant_id: &str,
        product_id: &str,
    ) -> StorageResult<Vec<Subscription>> {
        // Per spec (08-storage.md): Query filters by tenant_id for isolation
        let rows = sqlx::query(queries::subscription::LIST_BY_PRODUCT)
            .bind(tenant_id)
            .bind(product_id)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list subscriptions by product: {}", e)))?;

        rows.into_iter().map(parse_subscription).collect()
    }

    async fn count_subscriptions_by_plan(
        &self,
        tenant_id: &str,
        plan_id: &str,
    ) -> StorageResult<i64> {
        let count: (i64,) = sqlx::query_as(queries::subscription::COUNT_BY_PLAN_ID)
            .bind(tenant_id)
            .bind(plan_id)
            .fetch_one(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("count subscriptions by plan: {}", e)))?;

        Ok(count.0)
    }

    async fn list_tenant_ids(&self) -> StorageResult<Vec<String>> {
        // REL-004: Paginate to handle >1000 tenants. Fetch in batches to prevent OOM.
        const BATCH_SIZE: i64 = 1000;
        let mut all_tenants = Vec::new();
        let mut last_id: Option<String> = None;

        loop {
            let tenants: Vec<String> = if let Some(ref last) = last_id {
                sqlx::query_scalar::<_, String>(
                    "SELECT DISTINCT tenant_id FROM subscriptions WHERE tenant_id > $1 ORDER BY tenant_id LIMIT $2",
                )
                .bind(last)
                .bind(BATCH_SIZE)
                .fetch_all(self.pool.inner())
                .await
                .map_err(|e| StorageError::Database(format!("list tenant ids: {}", e)))?
            } else {
                sqlx::query_scalar::<_, String>(
                    "SELECT DISTINCT tenant_id FROM subscriptions ORDER BY tenant_id LIMIT $1",
                )
                .bind(BATCH_SIZE)
                .fetch_all(self.pool.inner())
                .await
                .map_err(|e| StorageError::Database(format!("list tenant ids: {}", e)))?
            };

            let batch_len = tenants.len();
            if let Some(last_tenant) = tenants.last() {
                last_id = Some(last_tenant.clone());
            }
            all_tenants.extend(tenants);

            // If we got fewer than BATCH_SIZE, we've reached the end
            if (batch_len as i64) < BATCH_SIZE {
                break;
            }
        }

        Ok(all_tenants)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dead Letter Queue
    // ─────────────────────────────────────────────────────────────────────────

    async fn move_to_dlq(&self, webhook: PendingWebhook, final_error: &str) -> StorageResult<()> {
        let now = Utc::now();
        let dlq_id = uuid::Uuid::new_v4().to_string();
        let headers_json = serde_json::to_value(&webhook.headers)
            .map_err(|e| StorageError::Database(format!("serialize headers: {}", e)))?;

        let first_attempt_at = webhook.created_at;
        let last_attempt_at = webhook.last_attempt_at.unwrap_or(now);

        // Use transaction to ensure atomicity - prevents duplicate webhooks if crash between operations
        let mut tx = self
            .pool
            .inner()
            .begin()
            .await
            .map_err(|e| StorageError::Database(format!("begin transaction: {}", e)))?;

        // Per spec (20-webhooks.md): INSERT must include tenant_id
        sqlx::query(queries::dlq::INSERT)
            .bind(&dlq_id)
            .bind(&webhook.tenant_id)
            .bind(&webhook.id)
            .bind(&webhook.url)
            .bind(&webhook.payload)
            .bind(&webhook.payload_bytes)
            .bind(&headers_json)
            .bind(&webhook.event_type)
            .bind(final_error)
            .bind(webhook.attempts)
            .bind(first_attempt_at)
            .bind(last_attempt_at)
            .bind(now)
            .execute(&mut *tx)
            .await
            .map_err(|e| StorageError::Database(format!("move to dlq: {}", e)))?;

        // Delete from webhook queue
        sqlx::query(queries::dlq::DELETE_WEBHOOK)
            .bind(&webhook.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| StorageError::Database(format!("delete from webhook queue: {}", e)))?;

        tx.commit()
            .await
            .map_err(|e| StorageError::Database(format!("commit move_to_dlq: {}", e)))?;

        Ok(())
    }

    async fn list_dlq(&self, limit: i32) -> StorageResult<Vec<DlqWebhook>> {
        let rows = sqlx::query(queries::dlq::LIST)
            .bind(limit)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list dlq: {}", e)))?;

        rows.into_iter().map(parse_dlq_webhook).collect()
    }

    async fn retry_from_dlq(&self, dlq_id: &str) -> StorageResult<()> {
        // Use transaction to ensure atomicity - prevents duplicate webhooks if crash between operations
        let mut tx = self
            .pool
            .inner()
            .begin()
            .await
            .map_err(|e| StorageError::Database(format!("begin transaction: {}", e)))?;

        // Get the DLQ entry within transaction
        let row = sqlx::query(queries::dlq::GET_BY_ID)
            .bind(dlq_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| StorageError::Database(format!("get dlq entry: {}", e)))?;

        let dlq_entry = match row {
            Some(r) => parse_dlq_webhook(r)?,
            None => return Err(StorageError::NotFound),
        };

        // Create a new webhook from the DLQ entry
        let new_webhook_id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now();
        let headers_json = serde_json::to_value(&dlq_entry.headers)
            .map_err(|e| StorageError::Database(format!("serialize headers: {}", e)))?;

        // Insert new webhook directly within transaction (inline enqueue_webhook logic)
        let query = self.webhook_query(queries::webhook::INSERT);
        sqlx::query(&query)
            .bind(&new_webhook_id)
            .bind(&dlq_entry.tenant_id)
            .bind(&dlq_entry.url)
            .bind(&dlq_entry.payload)
            .bind(&dlq_entry.payload_bytes)
            .bind(&headers_json)
            .bind(&dlq_entry.event_type)
            .bind("pending") // status
            .bind(0i32) // attempts
            .bind(5i32) // max_attempts
            .bind(None::<String>) // last_error
            .bind(None::<DateTime<Utc>>) // last_attempt_at
            .bind(None::<DateTime<Utc>>) // next_attempt_at
            .bind(now) // created_at
            .bind(None::<DateTime<Utc>>) // completed_at
            .execute(&mut *tx)
            .await
            .map_err(|e| StorageError::Database(format!("enqueue webhook from dlq: {}", e)))?;

        // Delete from DLQ
        sqlx::query(queries::dlq::DELETE)
            .bind(dlq_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| StorageError::Database(format!("delete from dlq: {}", e)))?;

        tx.commit()
            .await
            .map_err(|e| StorageError::Database(format!("commit retry_from_dlq: {}", e)))?;

        Ok(())
    }

    async fn delete_from_dlq(&self, dlq_id: &str) -> StorageResult<()> {
        let result = sqlx::query(queries::dlq::DELETE)
            .bind(dlq_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("delete from dlq: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound);
        }
        Ok(())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin Dashboard
    // ─────────────────────────────────────────────────────────────────────────

    async fn get_admin_stats(&self, tenant_id: &str) -> StorageResult<AdminStats> {
        // Get total stats from orders table (more reliable than purchases)
        let stats_query = r#"
            SELECT
                COUNT(*) as total_count,
                COALESCE(SUM(amount), 0) as total_amount
            FROM orders
            WHERE tenant_id = $1 AND status = 'paid'
            "#;

        let row: Option<(i64, i64)> = sqlx::query_as(stats_query)
            .bind(tenant_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get admin stats: {}", e)))?;

        let (total_transactions, total_amount) = row.unwrap_or((0, 0));
        let total_revenue = total_amount as f64 / 100.0; // Convert cents to dollars

        // Calculate average order value
        let average_order_value = if total_transactions > 0 {
            total_revenue / total_transactions as f64
        } else {
            0.0
        };

        // Get revenue by payment method
        let method_query = r#"
            SELECT
                source,
                COUNT(*) as tx_count,
                COALESCE(SUM(amount), 0) as total_amount
            FROM orders
            WHERE tenant_id = $1 AND status = 'paid'
            GROUP BY source
            "#;

        let method_rows: Vec<(String, i64, i64)> = sqlx::query_as(method_query)
            .bind(tenant_id)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get admin stats by method: {}", e)))?;

        let mut revenue_by_method = std::collections::HashMap::new();
        let mut transactions_by_method = std::collections::HashMap::new();

        for (source, tx_count, amount) in method_rows {
            revenue_by_method.insert(source.clone(), amount as f64 / 100.0);
            transactions_by_method.insert(source, tx_count);
        }

        // Get revenue by day (last 30 days)
        let daily_query = r#"
            SELECT
                DATE(created_at) as day,
                COUNT(*) as tx_count,
                COALESCE(SUM(amount), 0) as total_amount
            FROM orders
            WHERE tenant_id = $1 AND status = 'paid'
              AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY day ASC
            "#;

        let daily_rows: Vec<(chrono::NaiveDate, i64, i64)> = sqlx::query_as(daily_query)
            .bind(tenant_id)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get admin stats by day: {}", e)))?;

        let revenue_by_day: Vec<crate::storage::DailyRevenue> = daily_rows
            .into_iter()
            .map(|(day, tx_count, amount)| crate::storage::DailyRevenue {
                date: day.format("%Y-%m-%d").to_string(),
                revenue: amount as f64 / 100.0,
                transactions: tx_count,
            })
            .collect();

        // Get top products (top 10 by revenue)
        let top_products_query = r#"
            SELECT
                item->>'productId' as product_id,
                COUNT(*) as quantity,
                COALESCE(SUM(o.amount), 0) as total_revenue
            FROM orders o,
                 jsonb_array_elements(o.items) as item
            WHERE o.tenant_id = $1 AND o.status = 'paid'
            GROUP BY item->>'productId'
            ORDER BY total_revenue DESC
            LIMIT 10
            "#;

        let top_rows: Vec<(Option<String>, i64, i64)> = sqlx::query_as(top_products_query)
            .bind(tenant_id)
            .fetch_all(self.pool.inner())
            .await
            .unwrap_or_default(); // Don't fail if items parsing fails

        let top_products: Vec<crate::storage::TopProduct> = top_rows
            .into_iter()
            .filter_map(|(product_id, quantity, revenue)| {
                product_id.map(|pid| crate::storage::TopProduct {
                    product_id: pid,
                    revenue: revenue as f64 / 100.0,
                    quantity_sold: quantity,
                })
            })
            .collect();

        Ok(AdminStats {
            total_revenue,
            total_transactions,
            average_order_value,
            revenue_by_method,
            transactions_by_method,
            revenue_by_day,
            top_products,
        })
    }

    async fn list_purchases(
        &self,
        tenant_id: &str,
        method: Option<&str>,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<Purchase>> {
        let method_clause = match method {
            Some(m) if m.eq_ignore_ascii_case("stripe") => " AND amount_asset = 'USD'",
            Some(m) if m.eq_ignore_ascii_case("x402") => " AND amount_asset <> 'USD'",
            _ => "",
        };

        let raw_query = format!(
            r#"
            SELECT signature, tenant_id, resource_id, wallet, user_id, amount, amount_asset, created_at, metadata
            FROM payment_transactions
            WHERE tenant_id = $1{method_clause}
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#
        );
        let query = self.payment_query(&raw_query);

        let rows: Vec<(
            String,
            String,
            String,
            String,
            Option<String>,
            i64,
            String,
            DateTime<Utc>,
            serde_json::Value,
        )> = sqlx::query_as(&query)
            .bind(tenant_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list purchases: {}", e)))?;

        Ok(rows
            .into_iter()
            .map(
                |(
                    signature,
                    tenant_id,
                    resource_id,
                    wallet,
                    user_id,
                    amount,
                    amount_asset,
                    created_at,
                    metadata,
                )| Purchase {
                    signature,
                    tenant_id,
                    resource_id,
                    wallet: Some(wallet),
                    user_id,
                    amount: format!("{} {}", amount, amount_asset),
                    paid_at: created_at,
                    metadata: Some(metadata),
                },
            )
            .collect())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    async fn close(&self) -> StorageResult<()> {
        self.pool.close().await;
        Ok(())
    }

    async fn health_check(&self) -> StorageResult<()> {
        sqlx::query("SELECT 1")
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("health check failed: {}", e)))?;
        Ok(())
    }

    // ==================== Chat Sessions ====================

    async fn create_chat_session(&self, session: ChatSession) -> StorageResult<()> {
        sqlx::query(queries::chat::INSERT_SESSION)
            .bind(&session.id)
            .bind(&session.tenant_id)
            .bind(&session.customer_id)
            .bind(&session.customer_email)
            .bind(&session.status)
            .bind(session.message_count)
            .bind(session.last_message_at)
            .bind(session.created_at)
            .bind(session.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("create chat session: {}", e)))?;
        Ok(())
    }

    async fn get_chat_session(
        &self,
        tenant_id: &str,
        session_id: &str,
    ) -> StorageResult<Option<ChatSession>> {
        let row = sqlx::query(queries::chat::GET_SESSION)
            .bind(tenant_id)
            .bind(session_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get chat session: {}", e)))?;

        match row {
            Some(r) => Ok(Some(parse_chat_session(r)?)),
            None => Ok(None),
        }
    }

    async fn update_chat_session(
        &self,
        tenant_id: &str,
        session_id: &str,
        message_count: i32,
        last_message_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> StorageResult<()> {
        sqlx::query(queries::chat::UPDATE_SESSION)
            .bind(tenant_id)
            .bind(session_id)
            .bind(message_count)
            .bind(last_message_at)
            .bind(updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("update chat session: {}", e)))?;
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
        let rows = sqlx::query(queries::chat::LIST_SESSIONS)
            .bind(tenant_id)
            .bind(customer_id)
            .bind(status)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list chat sessions: {}", e)))?;

        let sessions: Vec<ChatSession> = rows
            .into_iter()
            .map(parse_chat_session)
            .collect::<StorageResult<Vec<_>>>()?;

        let count_row = sqlx::query(queries::chat::COUNT_SESSIONS)
            .bind(tenant_id)
            .bind(customer_id)
            .bind(status)
            .fetch_one(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("count chat sessions: {}", e)))?;

        let total: i64 = count_row.get("count");
        Ok((sessions, total))
    }

    // ==================== Chat Messages ====================

    async fn create_chat_message(&self, message: ChatMessage) -> StorageResult<()> {
        sqlx::query(queries::chat::INSERT_MESSAGE)
            .bind(&message.id)
            .bind(&message.tenant_id)
            .bind(&message.session_id)
            .bind(&message.role)
            .bind(&message.content)
            .bind(&message.tool_calls)
            .bind(&message.tool_results)
            .bind(message.created_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("create chat message: {}", e)))?;
        Ok(())
    }

    async fn list_chat_messages(
        &self,
        tenant_id: &str,
        session_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<Vec<ChatMessage>> {
        let rows = sqlx::query(queries::chat::LIST_MESSAGES)
            .bind(tenant_id)
            .bind(session_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list chat messages: {}", e)))?;

        rows.into_iter()
            .map(parse_chat_message)
            .collect::<StorageResult<Vec<_>>>()
    }

    // ==================== FAQs ====================

    async fn create_faq(&self, faq: Faq) -> StorageResult<()> {
        sqlx::query(queries::faq::INSERT)
            .bind(&faq.id)
            .bind(&faq.tenant_id)
            .bind(&faq.question)
            .bind(&faq.answer)
            .bind(&faq.keywords)
            .bind(faq.active)
            .bind(faq.use_in_chat)
            .bind(faq.display_on_page)
            .bind(faq.created_at)
            .bind(faq.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("create faq: {}", e)))?;
        Ok(())
    }

    async fn get_faq(&self, tenant_id: &str, faq_id: &str) -> StorageResult<Option<Faq>> {
        let row = sqlx::query(queries::faq::GET_BY_ID)
            .bind(tenant_id)
            .bind(faq_id)
            .fetch_optional(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("get faq: {}", e)))?;

        match row {
            Some(r) => Ok(Some(parse_faq(r)?)),
            None => Ok(None),
        }
    }

    async fn update_faq(&self, faq: Faq) -> StorageResult<()> {
        sqlx::query(queries::faq::UPDATE)
            .bind(&faq.tenant_id)
            .bind(&faq.id)
            .bind(&faq.question)
            .bind(&faq.answer)
            .bind(&faq.keywords)
            .bind(faq.active)
            .bind(faq.use_in_chat)
            .bind(faq.display_on_page)
            .bind(faq.updated_at)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("update faq: {}", e)))?;
        Ok(())
    }

    async fn delete_faq(&self, tenant_id: &str, faq_id: &str) -> StorageResult<()> {
        sqlx::query(queries::faq::DELETE)
            .bind(tenant_id)
            .bind(faq_id)
            .execute(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("delete faq: {}", e)))?;
        Ok(())
    }

    async fn list_faqs(
        &self,
        tenant_id: &str,
        active_only: bool,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<Faq>, i64)> {
        let active_filter: Option<bool> = if active_only { Some(true) } else { None };

        let rows = sqlx::query(queries::faq::LIST)
            .bind(tenant_id)
            .bind(active_filter)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list faqs: {}", e)))?;

        let faqs: Vec<Faq> = rows
            .into_iter()
            .map(parse_faq)
            .collect::<StorageResult<Vec<_>>>()?;

        let count_row = sqlx::query(queries::faq::COUNT)
            .bind(tenant_id)
            .bind(active_filter)
            .fetch_one(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("count faqs: {}", e)))?;

        let total: i64 = count_row.get("count");
        Ok((faqs, total))
    }

    async fn search_faqs(
        &self,
        tenant_id: &str,
        query: &str,
        limit: i32,
    ) -> StorageResult<Vec<Faq>> {
        // Extract keywords from query for array matching
        let keywords: Vec<String> = query
            .to_lowercase()
            .split_whitespace()
            .map(|s| s.to_string())
            .collect();

        let rows = sqlx::query(queries::faq::SEARCH)
            .bind(tenant_id)
            .bind(&keywords)
            .bind(query)
            .bind(limit)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("search faqs: {}", e)))?;

        rows.into_iter()
            .map(parse_faq)
            .collect::<StorageResult<Vec<_>>>()
    }

    async fn list_public_faqs(
        &self,
        tenant_id: &str,
        limit: i32,
        offset: i32,
    ) -> StorageResult<(Vec<Faq>, i64)> {
        let rows = sqlx::query(queries::faq::LIST_PUBLIC)
            .bind(tenant_id)
            .bind(limit)
            .bind(offset)
            .fetch_all(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("list public faqs: {}", e)))?;

        let faqs: Vec<Faq> = rows
            .into_iter()
            .map(parse_faq)
            .collect::<StorageResult<Vec<_>>>()?;

        let count_row = sqlx::query(queries::faq::COUNT_PUBLIC)
            .bind(tenant_id)
            .fetch_one(self.pool.inner())
            .await
            .map_err(|e| StorageError::Database(format!("count public faqs: {}", e)))?;

        let total: i64 = count_row.get("count");
        Ok((faqs, total))
    }

    fn as_any(&self) -> &dyn std::any::Any {
        self
    }
}

fn access_cutoff(now: DateTime<Utc>) -> DateTime<Utc> {
    now - to_chrono_duration(DEFAULT_ACCESS_TTL)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_access_cutoff_uses_default_ttl() {
        let now = Utc::now();
        let cutoff = access_cutoff(now);
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
}
