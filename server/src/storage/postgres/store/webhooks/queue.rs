//! Webhook queue and email queue storage methods

use super::*;

// ─── Webhook queue ───────────────────────────────────────────────────────────

pub(in super::super) async fn enqueue_webhook(
    store: &PostgresStore,
    webhook: PendingWebhook,
) -> StorageResult<String> {
    let headers_json = serde_json::to_value(&webhook.headers)
        .map_err(|e| StorageError::internal("serialize headers", e))?;

    let status_str = match webhook.status {
        WebhookStatus::Pending => "pending",
        WebhookStatus::Processing => "processing",
        WebhookStatus::Success => "success",
        WebhookStatus::Failed => "failed",
    };

    // Per spec (20-webhooks.md): INSERT must include tenant_id
    let query = store.webhook_query(queries::webhook::INSERT);
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
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("enqueue webhook", e))?;

    Ok(webhook.id)
}

pub(in super::super) async fn dequeue_webhooks(
    store: &PostgresStore,
    limit: i32,
) -> StorageResult<Vec<PendingWebhook>> {
    let query = store.webhook_query(queries::webhook::DEQUEUE);
    let rows = sqlx::query(&query)
        .bind(limit)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("dequeue webhooks", e))?;

    rows.into_iter().map(parse_webhook).collect()
}

pub(in super::super) async fn mark_webhook_processing(
    store: &PostgresStore,
    webhook_id: &str,
) -> StorageResult<()> {
    let query = store.webhook_query(queries::webhook::MARK_PROCESSING);
    sqlx::query(&query)
        .bind(webhook_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("mark webhook processing", e))?;

    Ok(())
}

pub(in super::super) async fn mark_webhook_success(
    store: &PostgresStore,
    webhook_id: &str,
) -> StorageResult<()> {
    let query = store.webhook_query(queries::webhook::MARK_SUCCESS);
    sqlx::query(&query)
        .bind(webhook_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("mark webhook success", e))?;

    Ok(())
}

pub(in super::super) async fn mark_webhook_failed(
    store: &PostgresStore,
    webhook_id: &str,
    error: &str,
    next_attempt_at: DateTime<Utc>,
) -> StorageResult<()> {
    let query = store.webhook_query(queries::webhook::MARK_FAILED);
    sqlx::query(&query)
        .bind(webhook_id)
        .bind(error)
        .bind(next_attempt_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("mark webhook failed", e))?;

    Ok(())
}

pub(in super::super) async fn mark_webhook_retry(
    store: &PostgresStore,
    webhook_id: &str,
    error: &str,
    next_attempt_at: DateTime<Utc>,
) -> StorageResult<()> {
    let query = store.webhook_query(queries::webhook::MARK_RETRY);
    sqlx::query(&query)
        .bind(webhook_id)
        .bind(error)
        .bind(next_attempt_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("mark webhook retry", e))?;

    Ok(())
}

pub(in super::super) async fn get_webhook(
    store: &PostgresStore,
    webhook_id: &str,
) -> StorageResult<Option<PendingWebhook>> {
    let query = store.webhook_query(queries::webhook::GET_BY_ID);
    let row = sqlx::query(&query)
        .bind(webhook_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get webhook", e))?;

    row.map(parse_webhook).transpose()
}

pub(in super::super) async fn list_webhooks(
    store: &PostgresStore,
    tenant_id: &str,
    status: Option<WebhookStatus>,
    limit: i32,
) -> StorageResult<Vec<PendingWebhook>> {
    let status_str = status.map(|s| match s {
        WebhookStatus::Pending => "pending",
        WebhookStatus::Processing => "processing",
        WebhookStatus::Success => "success",
        WebhookStatus::Failed => "failed",
    });

    let query = store.webhook_query(queries::webhook::LIST);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(status_str)
        .bind(limit)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list webhooks", e))?;

    rows.into_iter().map(parse_webhook).collect()
}

pub(in super::super) async fn retry_webhook(
    store: &PostgresStore,
    webhook_id: &str,
) -> StorageResult<()> {
    let query = store.webhook_query(queries::webhook::RETRY);
    sqlx::query(&query)
        .bind(webhook_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("retry webhook", e))?;

    Ok(())
}

pub(in super::super) async fn delete_webhook(
    store: &PostgresStore,
    webhook_id: &str,
) -> StorageResult<()> {
    let query = store.webhook_query(queries::webhook::DELETE);
    sqlx::query(&query)
        .bind(webhook_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("delete webhook", e))?;

    Ok(())
}

pub(in super::super) async fn cleanup_old_webhooks(
    store: &PostgresStore,
    retention_days: i32,
) -> StorageResult<u64> {
    let query = store.webhook_query(queries::webhook::CLEANUP_OLD);
    let result = sqlx::query(&query)
        .bind(retention_days.to_string())
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("cleanup old webhooks", e))?;

    Ok(result.rows_affected())
}

pub(in super::super) async fn count_pending_webhooks(store: &PostgresStore) -> StorageResult<i64> {
    let query = store.webhook_query(queries::webhook::COUNT_PENDING);
    let (count,): (i64,) = sqlx::query_as(&query)
        .fetch_one(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("count pending webhooks", e))?;
    Ok(count)
}

// ─── Email queue ─────────────────────────────────────────────────────────────

pub(in super::super) async fn enqueue_email(
    store: &PostgresStore,
    email: PendingEmail,
) -> StorageResult<String> {
    let status_str = email.status.to_string();

    let query = store.email_query(queries::email::INSERT);
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
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("enqueue email", e))?;

    Ok(email.id)
}

pub(in super::super) async fn dequeue_emails(
    store: &PostgresStore,
    limit: i32,
) -> StorageResult<Vec<PendingEmail>> {
    let query = store.email_query(queries::email::DEQUEUE);
    let rows = sqlx::query(&query)
        .bind(limit)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("dequeue emails", e))?;

    rows.into_iter().map(parse_email).collect()
}

pub(in super::super) async fn mark_email_processing(
    store: &PostgresStore,
    email_id: &str,
) -> StorageResult<()> {
    let query = store.email_query(queries::email::MARK_PROCESSING);
    sqlx::query(&query)
        .bind(email_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("mark email processing", e))?;

    Ok(())
}

pub(in super::super) async fn mark_email_success(
    store: &PostgresStore,
    email_id: &str,
) -> StorageResult<()> {
    let query = store.email_query(queries::email::MARK_SUCCESS);
    sqlx::query(&query)
        .bind(email_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("mark email success", e))?;

    Ok(())
}

pub(in super::super) async fn mark_email_retry(
    store: &PostgresStore,
    email_id: &str,
    error: &str,
    next_attempt_at: DateTime<Utc>,
) -> StorageResult<()> {
    let query = store.email_query(queries::email::MARK_RETRY);
    sqlx::query(&query)
        .bind(email_id)
        .bind(error)
        .bind(next_attempt_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("mark email retry", e))?;

    Ok(())
}

pub(in super::super) async fn mark_email_failed(
    store: &PostgresStore,
    email_id: &str,
    error: &str,
) -> StorageResult<()> {
    let query = store.email_query(queries::email::MARK_FAILED);
    sqlx::query(&query)
        .bind(email_id)
        .bind(error)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("mark email failed", e))?;

    Ok(())
}

pub(in super::super) async fn get_email(
    store: &PostgresStore,
    email_id: &str,
) -> StorageResult<Option<PendingEmail>> {
    let query = store.email_query(queries::email::GET_BY_ID);
    let row = sqlx::query(&query)
        .bind(email_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get email", e))?;

    row.map(parse_email).transpose()
}

pub(in super::super) async fn cleanup_old_emails(
    store: &PostgresStore,
    retention_days: i32,
) -> StorageResult<u64> {
    let query = store.email_query(queries::email::CLEANUP_OLD);
    let result = sqlx::query(&query)
        .bind(retention_days.to_string())
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("cleanup old emails", e))?;

    Ok(result.rows_affected())
}
