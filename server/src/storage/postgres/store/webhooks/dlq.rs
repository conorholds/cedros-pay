//! Idempotency key and dead-letter queue storage methods

use super::*;

// ─── Idempotency ─────────────────────────────────────────────────────────────

pub(in super::super) async fn save_idempotency_key(
    store: &PostgresStore,
    key: &str,
    response: IdempotencyResponse,
    ttl: Duration,
) -> StorageResult<()> {
    let headers_json = serde_json::to_value(&response.headers)
        .map_err(|e| StorageError::internal("serialize headers", e))?;
    let expires_at = Utc::now() + chrono::Duration::from_std(ttl).unwrap_or_default();

    sqlx::query(queries::idempotency::INSERT)
        .bind(key)
        .bind(response.status_code)
        .bind(&headers_json)
        .bind(&response.body)
        .bind(response.cached_at)
        .bind(expires_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("save idempotency key", e))?;

    Ok(())
}

pub(in super::super) async fn try_save_idempotency_key(
    store: &PostgresStore,
    key: &str,
    response: IdempotencyResponse,
    ttl: Duration,
) -> StorageResult<bool> {
    let headers_json = serde_json::to_value(&response.headers)
        .map_err(|e| StorageError::internal("serialize headers", e))?;
    let expires_at = Utc::now() + chrono::Duration::from_std(ttl).unwrap_or_default();

    let result = sqlx::query(queries::idempotency::INSERT_IF_ABSENT)
        .bind(key)
        .bind(response.status_code)
        .bind(&headers_json)
        .bind(&response.body)
        .bind(response.cached_at)
        .bind(expires_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("try save idempotency key", e))?;

    Ok(result.rows_affected() == 1)
}

pub(in super::super) async fn get_idempotency_key(
    store: &PostgresStore,
    key: &str,
) -> StorageResult<Option<IdempotencyResponse>> {
    let row = sqlx::query(queries::idempotency::GET_BY_KEY)
        .bind(key)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get idempotency key", e))?;

    row.map(parse_idempotency_response).transpose()
}

pub(in super::super) async fn delete_idempotency_key(
    store: &PostgresStore,
    key: &str,
) -> StorageResult<()> {
    sqlx::query(queries::idempotency::DELETE)
        .bind(key)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("delete idempotency key", e))?;

    Ok(())
}

pub(in super::super) async fn cleanup_expired_idempotency_keys(store: &PostgresStore) -> StorageResult<u64> {
    let result = sqlx::query(queries::idempotency::CLEANUP_EXPIRED)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("cleanup idempotency keys", e))?;

    Ok(result.rows_affected())
}

// ─── Dead Letter Queue ────────────────────────────────────────────────────────

pub(in super::super) async fn move_to_dlq(
    store: &PostgresStore,
    webhook: PendingWebhook,
    final_error: &str,
) -> StorageResult<()> {
    let now = Utc::now();
    let dlq_id = uuid::Uuid::new_v4().to_string();
    let headers_json = serde_json::to_value(&webhook.headers)
        .map_err(|e| StorageError::internal("serialize headers", e))?;

    let first_attempt_at = webhook.created_at;
    let last_attempt_at = webhook.last_attempt_at.unwrap_or(now);

    // Use transaction to ensure atomicity
    let mut tx = store
        .pool
        .inner()
        .begin()
        .await
        .map_err(|e| StorageError::internal("begin transaction", e))?;

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
        .map_err(|e| StorageError::internal("move to dlq", e))?;

    // Delete from webhook queue
    sqlx::query(queries::dlq::DELETE_WEBHOOK)
        .bind(&webhook.id)
        .execute(&mut *tx)
        .await
        .map_err(|e| StorageError::internal("delete from webhook queue", e))?;

    tx.commit()
        .await
        .map_err(|e| StorageError::internal("commit move_to_dlq", e))?;

    Ok(())
}

pub(in super::super) async fn list_dlq(
    store: &PostgresStore,
    tenant_id: &str,
    limit: i32,
) -> StorageResult<Vec<DlqWebhook>> {
    let rows = sqlx::query(queries::dlq::LIST)
        .bind(tenant_id)
        .bind(limit)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list dlq", e))?;

    rows.into_iter().map(parse_dlq_webhook).collect()
}

pub(in super::super) async fn get_dlq_entry(
    store: &PostgresStore,
    dlq_id: &str,
) -> StorageResult<Option<DlqWebhook>> {
    let row = sqlx::query(queries::dlq::GET_BY_ID)
        .bind(dlq_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get dlq entry", e))?;

    row.map(parse_dlq_webhook).transpose()
}

pub(in super::super) async fn retry_from_dlq(
    store: &PostgresStore,
    dlq_id: &str,
) -> StorageResult<()> {
    // Use transaction to ensure atomicity
    let mut tx = store
        .pool
        .inner()
        .begin()
        .await
        .map_err(|e| StorageError::internal("begin transaction", e))?;

    // Get the DLQ entry within transaction
    let row = sqlx::query(queries::dlq::GET_BY_ID)
        .bind(dlq_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| StorageError::internal("get dlq entry", e))?;

    let dlq_entry = match row {
        Some(r) => parse_dlq_webhook(r)?,
        None => return Err(StorageError::NotFound),
    };

    // Create a new webhook from the DLQ entry
    let new_webhook_id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now();
    let headers_json = serde_json::to_value(&dlq_entry.headers)
        .map_err(|e| StorageError::internal("serialize headers", e))?;

    // Insert new webhook directly within transaction (inline enqueue_webhook logic)
    let query = store.webhook_query(queries::webhook::INSERT);
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
        .map_err(|e| StorageError::internal("enqueue webhook from dlq", e))?;

    // Delete from DLQ
    sqlx::query(queries::dlq::DELETE)
        .bind(dlq_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| StorageError::internal("delete from dlq", e))?;

    tx.commit()
        .await
        .map_err(|e| StorageError::internal("commit retry_from_dlq", e))?;

    Ok(())
}

pub(in super::super) async fn delete_from_dlq(
    store: &PostgresStore,
    dlq_id: &str,
) -> StorageResult<()> {
    let result = sqlx::query(queries::dlq::DELETE)
        .bind(dlq_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("delete from dlq", e))?;

    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}
