//! Cart quote storage methods for PostgresStore

use super::*;

pub(super) async fn store_cart_quote(
    store: &PostgresStore,
    quote: CartQuote,
) -> StorageResult<()> {
    let items_json = serde_json::to_value(&quote.items)
        .map_err(|e| StorageError::internal("serialize items", e))?;
    let metadata_json = serde_json::to_value(&quote.metadata)
        .map_err(|e| StorageError::internal("serialize metadata", e))?;

    // Per spec (08-storage.md): INSERT includes tenant_id for multi-tenancy
    let query = store.cart_query(queries::cart::INSERT);
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
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("insert cart quote", e))?;

    Ok(())
}

pub(super) async fn store_cart_quotes(
    store: &PostgresStore,
    quotes: Vec<CartQuote>,
) -> StorageResult<()> {
    // Per spec (08-storage.md line 32): Batch operations must be atomic
    let mut tx = store
        .pool
        .inner()
        .begin()
        .await
        .map_err(|e| StorageError::internal("begin transaction", e))?;

    let mut prepared = Vec::with_capacity(quotes.len());
    for quote in quotes {
        let items_json = serde_json::to_value(&quote.items)
            .map_err(|e| StorageError::internal("serialize items", e))?;
        let metadata_json = serde_json::to_value(&quote.metadata)
            .map_err(|e| StorageError::internal("serialize metadata", e))?;
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
        store.tables.cart_quotes_table
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
        .map_err(|e| StorageError::internal("insert cart quotes", e))?;

    tx.commit()
        .await
        .map_err(|e| StorageError::internal("commit transaction", e))?;
    Ok(())
}

pub(super) async fn get_cart_quote(
    store: &PostgresStore,
    tenant_id: &str,
    cart_id: &str,
) -> StorageResult<Option<CartQuote>> {
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let query = store.cart_query(queries::cart::GET_BY_ID);
    let row = sqlx::query(&query)
        .bind(cart_id)
        .bind(tenant_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get cart quote", e))?;

    row.map(parse_cart_quote).transpose()
}

pub(super) async fn get_cart_quotes(
    store: &PostgresStore,
    tenant_id: &str,
    cart_ids: &[String],
) -> StorageResult<Vec<CartQuote>> {
    if cart_ids.is_empty() {
        return Ok(Vec::new());
    }

    // Use batch query to avoid N+1 queries
    let query = store.cart_query(queries::cart::GET_BY_IDS);
    let rows = sqlx::query(&query)
        .bind(cart_ids)
        .bind(tenant_id)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get cart quotes", e))?;

    rows.into_iter().map(parse_cart_quote).collect()
}

pub(super) async fn mark_cart_paid(
    store: &PostgresStore,
    tenant_id: &str,
    cart_id: &str,
    wallet: &str,
) -> StorageResult<()> {
    // Per spec (08-storage.md): Update filters by tenant_id for isolation
    let query = store.cart_query(queries::cart::MARK_PAID);
    let result = sqlx::query(&query)
        .bind(cart_id)
        .bind(tenant_id)
        .bind(wallet)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("mark cart paid", e))?;

    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(super) async fn has_cart_access(
    store: &PostgresStore,
    tenant_id: &str,
    cart_id: &str,
    wallet: &str,
) -> StorageResult<bool> {
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let query = store.cart_query(queries::cart::HAS_ACCESS);
    let row: Option<(Option<String>,)> = sqlx::query_as(&query)
        .bind(cart_id)
        .bind(tenant_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("has cart access", e))?;

    Ok(row.and_then(|(w,)| w).map(|w| w == wallet).unwrap_or(false))
}

pub(super) async fn cleanup_expired_cart_quotes(store: &PostgresStore) -> StorageResult<u64> {
    // Admin operation across all tenants
    let query = store.cart_query(queries::cart::CLEANUP_EXPIRED_ALL);
    let result = sqlx::query(&query)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("cleanup expired carts", e))?;
    Ok(result.rows_affected())
}
