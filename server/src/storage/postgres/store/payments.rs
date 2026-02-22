//! Payment, credits hold, and purchase storage methods

use super::*;

pub(super) fn access_cutoff(now: DateTime<Utc>) -> DateTime<Utc> {
    now - to_chrono_duration(DEFAULT_ACCESS_TTL)
}

pub(super) async fn record_payment(
    store: &PostgresStore,
    tx: PaymentTransaction,
) -> StorageResult<()> {
    let metadata_json = serde_json::to_value(&tx.metadata)
        .map_err(|e| StorageError::internal("serialize metadata", e))?;

    // Per spec (09-storage-postgres.md): Include tenant_id for multi-tenancy
    let query = store.payment_query(queries::payment::INSERT);
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
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("record payment", e))?;

    Ok(())
}

pub(super) async fn record_payments(
    store: &PostgresStore,
    txs: Vec<PaymentTransaction>,
) -> StorageResult<()> {
    if txs.is_empty() {
        return Ok(());
    }

    // Pre-serialize metadata (fail closed before touching the DB).
    let prepared: Vec<_> = txs
        .into_iter()
        .map(|tx| {
            let metadata_json = serde_json::to_value(&tx.metadata)
                .map_err(|e| StorageError::internal("serialize metadata", e))?;
            Ok::<_, StorageError>((
                tx.signature,
                tx.tenant_id,
                tx.resource_id,
                tx.wallet,
                tx.user_id,
                tx.amount.to_atomic(),
                tx.amount.asset.code,
                tx.created_at,
                metadata_json,
            ))
        })
        .collect::<Result<Vec<_>, _>>()?;

    // PERF: Single multi-row INSERT instead of N individual inserts.
    let insert = format!(
        "INSERT INTO {} (signature, tenant_id, resource_id, wallet, user_id, amount, amount_asset, created_at, metadata) ",
        store.tables.payments_table
    );
    let mut builder = QueryBuilder::new(insert);
    builder.push_values(
        prepared,
        |mut b,
         (signature, tenant_id, resource_id, wallet, user_id, amount, amount_asset, created_at, metadata_json)| {
            b.push_bind(signature)
                .push_bind(tenant_id)
                .push_bind(resource_id)
                .push_bind(wallet)
                .push_bind(user_id)
                .push_bind(amount)
                .push_bind(amount_asset)
                .push_bind(created_at)
                .push_bind(metadata_json);
        },
    );
    builder.push(" ON CONFLICT (tenant_id, signature) DO NOTHING");

    builder
        .build()
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("record payments batch", e))?;

    Ok(())
}

pub(super) async fn try_record_payment(
    store: &PostgresStore,
    tx: PaymentTransaction,
) -> StorageResult<bool> {
    let metadata_json = serde_json::to_value(&tx.metadata)
        .map_err(|e| StorageError::internal("serialize metadata", e))?;

    // INSERT ... ON CONFLICT DO NOTHING returns 0 rows_affected if conflict
    let query = store.payment_query(queries::payment::INSERT);
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
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("try record payment", e))?;

    Ok(result.rows_affected() > 0)
}

pub(super) async fn delete_payment(
    store: &PostgresStore,
    tenant_id: &str,
    signature: &str,
) -> StorageResult<()> {
    let query = store.payment_query(queries::payment::DELETE_BY_SIGNATURE);
    sqlx::query(&query)
        .bind(signature)
        .bind(tenant_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("delete payment", e))?;
    Ok(())
}

pub(super) async fn has_payment_been_processed(
    store: &PostgresStore,
    tenant_id: &str,
    signature: &str,
) -> StorageResult<bool> {
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let query = store.payment_query(queries::payment::EXISTS);
    let (exists,): (bool,) = sqlx::query_as(&query)
        .bind(signature)
        .bind(tenant_id)
        .fetch_one(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("check payment", e))?;

    Ok(exists)
}

pub(super) async fn get_payment(
    store: &PostgresStore,
    tenant_id: &str,
    signature: &str,
) -> StorageResult<Option<PaymentTransaction>> {
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let query = store.payment_query(queries::payment::GET_BY_SIGNATURE);
    let row = sqlx::query(&query)
        .bind(signature)
        .bind(tenant_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get payment", e))?;

    row.map(parse_payment_transaction).transpose()
}

pub(super) async fn get_purchase_by_signature(
    store: &PostgresStore,
    tenant_id: &str,
    signature: &str,
) -> StorageResult<Option<Purchase>> {
    let tx = get_payment(store, tenant_id, signature).await?;
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

pub(super) async fn store_credits_hold(
    store: &PostgresStore,
    hold: CreditsHold,
) -> StorageResult<()> {
    // SECURITY: Avoid overwriting an existing hold binding.
    // Insert is idempotent; on conflict we only refresh expires_at if the binding matches.
    let insert_query = store.credits_hold_query(queries::credits_hold::UPSERT);
    let inserted = sqlx::query(&insert_query)
        .bind(&hold.tenant_id)
        .bind(&hold.hold_id)
        .bind(&hold.user_id)
        .bind(&hold.resource_id)
        .bind(hold.amount)
        .bind(&hold.amount_asset)
        .bind(hold.created_at)
        .bind(hold.expires_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("store credits hold", e))?;

    if inserted.rows_affected() > 0 {
        return Ok(());
    }

    // Existing hold found; only extend expiry if the original binding matches.
    let update_query =
        store.credits_hold_query(queries::credits_hold::UPDATE_EXPIRES_AT_IF_MATCH);
    let updated = sqlx::query(&update_query)
        .bind(&hold.tenant_id)
        .bind(&hold.hold_id)
        .bind(&hold.user_id)
        .bind(&hold.resource_id)
        .bind(hold.amount)
        .bind(&hold.amount_asset)
        .bind(hold.expires_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("store credits hold", e))?;

    if updated.rows_affected() > 0 {
        return Ok(());
    }

    Err(StorageError::Conflict)
}

pub(super) async fn get_credits_hold(
    store: &PostgresStore,
    tenant_id: &str,
    hold_id: &str,
) -> StorageResult<Option<CreditsHold>> {
    let query = store.credits_hold_query(queries::credits_hold::GET_BY_ID);
    let row = sqlx::query(&query)
        .bind(tenant_id)
        .bind(hold_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get credits hold", e))?;

    row.map(parse_credits_hold).transpose()
}

pub(super) async fn delete_credits_hold(
    store: &PostgresStore,
    tenant_id: &str,
    hold_id: &str,
) -> StorageResult<()> {
    let query = store.credits_hold_query(queries::credits_hold::DELETE_BY_ID);
    sqlx::query(&query)
        .bind(tenant_id)
        .bind(hold_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("delete credits hold", e))?;
    Ok(())
}

pub(super) async fn cleanup_expired_credits_holds(store: &PostgresStore) -> StorageResult<u64> {
    let query = store.credits_hold_query(queries::credits_hold::CLEANUP_EXPIRED);
    let res = sqlx::query(&query)
        .bind(Utc::now())
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("cleanup credits holds", e))?;
    Ok(res.rows_affected())
}

pub(super) async fn list_purchases_by_user_id(
    store: &PostgresStore,
    tenant_id: &str,
    user_id: &str,
    limit: i64,
    offset: i64,
) -> StorageResult<Vec<Purchase>> {
    let query = store.payment_query(queries::payment::LIST_BY_USER_ID);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(user_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list purchases", e))?;

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

pub(super) async fn has_valid_access(
    store: &PostgresStore,
    tenant_id: &str,
    resource: &str,
    wallet: &str,
) -> StorageResult<bool> {
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let query = store.payment_query(queries::payment::HAS_ACCESS);
    let cutoff = access_cutoff(Utc::now());
    let (exists,): (bool,) = sqlx::query_as(&query)
        .bind(tenant_id)
        .bind(resource)
        .bind(wallet)
        .bind(cutoff)
        .fetch_one(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("check access", e))?;

    Ok(exists)
}

pub(super) async fn archive_old_payments(
    store: &PostgresStore,
    older_than: DateTime<Utc>,
) -> StorageResult<u64> {
    // Admin operation across all tenants
    let query = store.payment_query(queries::payment::ARCHIVE_OLD_ALL);
    let result = sqlx::query(&query)
        .bind(older_than)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("archive payments", e))?;

    Ok(result.rows_affected())
}
