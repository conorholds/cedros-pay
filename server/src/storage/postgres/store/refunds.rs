//! Refund quote and Stripe refund request storage methods for PostgresStore

use super::*;

pub(super) async fn store_refund_quote(
    store: &PostgresStore,
    quote: RefundQuote,
) -> StorageResult<()> {
    let metadata_json = serde_json::to_value(&quote.metadata)
        .map_err(|e| StorageError::internal("serialize metadata", e))?;

    // Per spec (08-storage.md): INSERT includes tenant_id for multi-tenancy
    let query = store.refund_query(queries::refund::INSERT);
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
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("insert refund quote", e))?;

    Ok(())
}

pub(super) async fn store_refund_quotes(
    store: &PostgresStore,
    quotes: Vec<RefundQuote>,
) -> StorageResult<()> {
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
                .map_err(|e| StorageError::internal("serialize metadata", e))?;
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
        store.tables.refund_quotes_table
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

    let mut tx = store
        .pool
        .inner()
        .begin()
        .await
        .map_err(|e| StorageError::internal("begin refund quote batch", e))?;

    builder
        .build()
        .execute(&mut *tx)
        .await
        .map_err(|e| StorageError::internal("insert refund quotes", e))?;

    tx.commit()
        .await
        .map_err(|e| StorageError::internal("commit refund quote batch", e))?;

    Ok(())
}

pub(super) async fn get_refund_quote(
    store: &PostgresStore,
    tenant_id: &str,
    refund_id: &str,
) -> StorageResult<Option<RefundQuote>> {
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let query = store.refund_query(queries::refund::GET_BY_ID);
    let row = sqlx::query(&query)
        .bind(refund_id)
        .bind(tenant_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get refund quote", e))?;

    row.map(parse_refund_quote).transpose()
}

pub(super) async fn get_refund_by_original_purchase_id(
    store: &PostgresStore,
    tenant_id: &str,
    original_purchase_id: &str,
) -> StorageResult<Option<RefundQuote>> {
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let query = store.refund_query(queries::refund::GET_BY_ORIGINAL_PURCHASE_ID);
    let row = sqlx::query(&query)
        .bind(original_purchase_id)
        .bind(tenant_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get refund by original purchase id", e))?;

    row.map(parse_refund_quote).transpose()
}

pub(super) async fn get_all_refunds_for_purchase(
    store: &PostgresStore,
    tenant_id: &str,
    original_purchase_id: &str,
) -> StorageResult<Vec<RefundQuote>> {
    let query = store.refund_query(queries::refund::GET_ALL_BY_ORIGINAL_PURCHASE_ID);
    let rows = sqlx::query(&query)
        .bind(original_purchase_id)
        .bind(tenant_id)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get all refunds for purchase", e))?;

    rows.into_iter().map(parse_refund_quote).collect()
}

pub(super) async fn list_pending_refunds(
    store: &PostgresStore,
    tenant_id: &str,
    limit: i32,
) -> StorageResult<Vec<RefundQuote>> {
    if limit <= 0 {
        return Ok(Vec::new());
    }
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let query = store.refund_query(queries::refund::LIST_PENDING);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(limit)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list pending refunds", e))?;

    rows.into_iter().map(parse_refund_quote).collect()
}

pub(super) async fn list_credits_refund_requests(
    store: &PostgresStore,
    tenant_id: &str,
    status: Option<&str>,
    limit: i32,
    offset: i32,
) -> StorageResult<(Vec<RefundQuote>, i64)> {
    let query = store.refund_query(queries::refund::LIST_CREDITS_REFUNDS);

    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(status)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list credits refunds", e))?;

    // Extract total from window function; 0 if no rows returned
    let total: i64 = rows
        .first()
        .map(|r| sqlx::Row::try_get(r, "total_count").unwrap_or(0i64))
        .unwrap_or(0);

    let refunds: Vec<RefundQuote> = rows
        .into_iter()
        .map(parse_refund_quote)
        .collect::<Result<_, _>>()?;
    Ok((refunds, total))
}

pub(super) async fn mark_refund_processed(
    store: &PostgresStore,
    tenant_id: &str,
    refund_id: &str,
    processed_by: &str,
    signature: &str,
) -> StorageResult<()> {
    // Per spec (08-storage.md): Update filters by tenant_id for isolation
    let query = store.refund_query(queries::refund::MARK_PROCESSED);
    let result = sqlx::query(&query)
        .bind(refund_id)
        .bind(tenant_id)
        .bind(processed_by)
        .bind(signature)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("mark refund processed", e))?;

    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(super) async fn delete_refund_quote(
    store: &PostgresStore,
    tenant_id: &str,
    refund_id: &str,
) -> StorageResult<()> {
    // Per spec (08-storage.md): Delete filters by tenant_id for isolation
    let query = store.refund_query(queries::refund::DELETE);
    sqlx::query(&query)
        .bind(refund_id)
        .bind(tenant_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("delete refund quote", e))?;

    Ok(())
}

pub(super) async fn cleanup_expired_refund_quotes(store: &PostgresStore) -> StorageResult<u64> {
    // Admin operation across all tenants
    let query = store.refund_query(queries::refund::CLEANUP_EXPIRED_ALL);
    let result = sqlx::query(&query)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("cleanup expired refunds", e))?;
    Ok(result.rows_affected())
}

// ─── Stripe refund requests ─────────────────────────────────────────────────

pub(super) async fn store_stripe_refund_request(
    store: &PostgresStore,
    req: StripeRefundRequest,
) -> StorageResult<()> {
    let metadata_json = serde_json::to_value(&req.metadata)
        .map_err(|e| StorageError::internal("serialize metadata", e))?;

    let query = store.stripe_refund_request_query(queries::stripe_refund_request::UPSERT);
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
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("store stripe refund request", e))?;

    Ok(())
}

pub(super) async fn get_stripe_refund_request(
    store: &PostgresStore,
    tenant_id: &str,
    request_id: &str,
) -> StorageResult<Option<StripeRefundRequest>> {
    let query = store.stripe_refund_request_query(queries::stripe_refund_request::GET_BY_ID);
    let row = sqlx::query(&query)
        .bind(tenant_id)
        .bind(request_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get stripe refund request", e))?;

    row.map(parse_stripe_refund_request).transpose()
}

pub(super) async fn list_pending_stripe_refund_requests(
    store: &PostgresStore,
    tenant_id: &str,
    limit: i32,
) -> StorageResult<Vec<StripeRefundRequest>> {
    let query = store.stripe_refund_request_query(queries::stripe_refund_request::LIST_PENDING);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(limit)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list pending stripe refund requests", e))?;

    rows.into_iter()
        .map(parse_stripe_refund_request)
        .collect::<StorageResult<Vec<_>>>()
}

pub(super) async fn get_pending_stripe_refund_request_by_original_purchase_id(
    store: &PostgresStore,
    tenant_id: &str,
    original_purchase_id: &str,
) -> StorageResult<Option<StripeRefundRequest>> {
    let query = store.stripe_refund_request_query(
        queries::stripe_refund_request::GET_PENDING_BY_ORIGINAL_PURCHASE_ID,
    );
    let row = sqlx::query(&query)
        .bind(tenant_id)
        .bind(original_purchase_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get pending stripe refund request by purchase", e))?;

    row.map(parse_stripe_refund_request).transpose()
}

pub(super) async fn get_stripe_refund_request_by_charge_id(
    store: &PostgresStore,
    tenant_id: &str,
    stripe_charge_id: &str,
) -> StorageResult<Option<StripeRefundRequest>> {
    let query = store.stripe_refund_request_query(queries::stripe_refund_request::GET_BY_CHARGE_ID);
    let row = sqlx::query(&query)
        .bind(tenant_id)
        .bind(stripe_charge_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get stripe refund request by charge id", e))?;

    row.map(parse_stripe_refund_request).transpose()
}
