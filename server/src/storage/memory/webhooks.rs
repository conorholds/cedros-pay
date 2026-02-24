use super::*;

pub(super) async fn enqueue_webhook(
    store: &InMemoryStore,
    webhook: PendingWebhook,
) -> StorageResult<String> {
    let id = webhook.id.clone();
    // Idempotent enqueue: do not overwrite existing webhook state if the ID already exists.
    let mut map = store.webhooks.lock();
    if map.contains_key(&id) {
        return Ok(id);
    }
    map.insert(id.clone(), webhook);
    Ok(id)
}

pub(super) async fn dequeue_webhooks(
    store: &InMemoryStore,
    limit: i32,
) -> StorageResult<Vec<PendingWebhook>> {
    let mut map = store.webhooks.lock();
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

pub(super) async fn mark_webhook_processing(
    store: &InMemoryStore,
    webhook_id: &str,
) -> StorageResult<()> {
    if let Some(wh) = store.webhooks.lock().get_mut(webhook_id) {
        wh.status = WebhookStatus::Processing;
        wh.last_attempt_at = Some(Utc::now());
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn mark_webhook_success(
    store: &InMemoryStore,
    webhook_id: &str,
) -> StorageResult<()> {
    if let Some(wh) = store.webhooks.lock().get_mut(webhook_id) {
        wh.status = WebhookStatus::Success;
        wh.completed_at = Some(Utc::now());
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn mark_webhook_failed(
    store: &InMemoryStore,
    webhook_id: &str,
    error: &str,
    next_attempt_at: DateTime<Utc>,
) -> StorageResult<()> {
    if let Some(wh) = store.webhooks.lock().get_mut(webhook_id) {
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

pub(super) async fn mark_webhook_retry(
    store: &InMemoryStore,
    webhook_id: &str,
    error: &str,
    next_attempt_at: DateTime<Utc>,
) -> StorageResult<()> {
    if let Some(wh) = store.webhooks.lock().get_mut(webhook_id) {
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

pub(super) async fn get_webhook(
    store: &InMemoryStore,
    webhook_id: &str,
) -> StorageResult<Option<PendingWebhook>> {
    Ok(store.webhooks.lock().get(webhook_id).cloned())
}

pub(super) async fn list_webhooks(
    store: &InMemoryStore,
    tenant_id: &str,
    status: Option<WebhookStatus>,
    limit: i32,
) -> StorageResult<Vec<PendingWebhook>> {
    let map = store.webhooks.lock();
    let mut items: Vec<_> = map
        .values()
        .filter(|w| w.tenant_id == tenant_id)
        .filter(|w| status.as_ref().map(|s| &w.status == s).unwrap_or(true))
        .cloned()
        .collect();
    items.sort_by_key(|w| w.created_at);
    items.truncate(limit as usize);
    Ok(items)
}

pub(super) async fn retry_webhook(store: &InMemoryStore, webhook_id: &str) -> StorageResult<()> {
    if let Some(wh) = store.webhooks.lock().get_mut(webhook_id) {
        wh.status = WebhookStatus::Pending;
        wh.next_attempt_at = Some(Utc::now());
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn delete_webhook(store: &InMemoryStore, webhook_id: &str) -> StorageResult<()> {
    store.webhooks.lock().remove(webhook_id);
    Ok(())
}

pub(super) async fn cleanup_old_webhooks(
    store: &InMemoryStore,
    retention_days: i32,
) -> StorageResult<u64> {
    let cutoff = Utc::now() - chrono::Duration::days(retention_days as i64);
    let mut webhooks = store.webhooks.lock();
    let initial_count = webhooks.len();
    webhooks.retain(|_, w| {
        // Keep if not completed or completed recently
        w.completed_at.map_or(true, |completed| completed > cutoff)
    });
    Ok((initial_count - webhooks.len()) as u64)
}

pub(super) async fn enqueue_email(
    store: &InMemoryStore,
    email: PendingEmail,
) -> StorageResult<String> {
    let id = email.id.clone();
    store.emails.lock().insert(id.clone(), email);
    Ok(id)
}

pub(super) async fn dequeue_emails(
    store: &InMemoryStore,
    limit: i32,
) -> StorageResult<Vec<PendingEmail>> {
    let now = Utc::now();
    let emails = store.emails.lock();
    let result: Vec<PendingEmail> = emails
        .values()
        .filter(|e| {
            e.status == EmailStatus::Pending && e.next_attempt_at.map_or(true, |next| next <= now)
        })
        .take(limit as usize)
        .cloned()
        .collect();
    Ok(result)
}

pub(super) async fn mark_email_processing(
    store: &InMemoryStore,
    email_id: &str,
) -> StorageResult<()> {
    if let Some(email) = store.emails.lock().get_mut(email_id) {
        email.last_attempt_at = Some(Utc::now());
    }
    Ok(())
}

pub(super) async fn mark_email_success(store: &InMemoryStore, email_id: &str) -> StorageResult<()> {
    if let Some(email) = store.emails.lock().get_mut(email_id) {
        email.status = EmailStatus::Completed;
        email.completed_at = Some(Utc::now());
    }
    Ok(())
}

pub(super) async fn mark_email_retry(
    store: &InMemoryStore,
    email_id: &str,
    error: &str,
    next_attempt_at: DateTime<Utc>,
) -> StorageResult<()> {
    if let Some(email) = store.emails.lock().get_mut(email_id) {
        email.attempts += 1;
        email.last_error = Some(error.to_string());
        email.next_attempt_at = Some(next_attempt_at);
    }
    Ok(())
}

pub(super) async fn mark_email_failed(
    store: &InMemoryStore,
    email_id: &str,
    error: &str,
) -> StorageResult<()> {
    if let Some(email) = store.emails.lock().get_mut(email_id) {
        email.status = EmailStatus::Failed;
        email.last_error = Some(error.to_string());
        email.completed_at = Some(Utc::now());
    }
    Ok(())
}

pub(super) async fn get_email(
    store: &InMemoryStore,
    email_id: &str,
) -> StorageResult<Option<PendingEmail>> {
    Ok(store.emails.lock().get(email_id).cloned())
}

pub(super) async fn cleanup_old_emails(
    store: &InMemoryStore,
    retention_days: i32,
) -> StorageResult<u64> {
    let cutoff = Utc::now() - chrono::Duration::days(retention_days as i64);
    let mut emails = store.emails.lock();
    let initial_count = emails.len();
    emails.retain(|_, e| {
        // Keep if not completed or completed recently
        e.completed_at.map_or(true, |completed| completed > cutoff)
    });
    Ok((initial_count - emails.len()) as u64)
}

pub(super) async fn save_idempotency_key(
    store: &InMemoryStore,
    key: &str,
    response: IdempotencyResponse,
    ttl: StdDuration,
) -> StorageResult<()> {
    store
        .idempotency
        .lock()
        .insert(key.to_string(), (response, Instant::now(), ttl));
    Ok(())
}

pub(super) async fn try_save_idempotency_key(
    store: &InMemoryStore,
    key: &str,
    response: IdempotencyResponse,
    ttl: StdDuration,
) -> StorageResult<bool> {
    let mut map = store.idempotency.lock();

    if let Some((_, created, existing_ttl)) = map.get(key) {
        if created.elapsed() <= *existing_ttl {
            return Ok(false);
        }
        map.remove(key);
    }

    map.insert(key.to_string(), (response, Instant::now(), ttl));
    Ok(true)
}

pub(super) async fn get_idempotency_key(
    store: &InMemoryStore,
    key: &str,
) -> StorageResult<Option<IdempotencyResponse>> {
    let mut map = store.idempotency.lock();
    if let Some((resp, created, ttl)) = map.get(key) {
        if created.elapsed() <= *ttl {
            return Ok(Some(resp.clone()));
        }
    }
    map.remove(key);
    Ok(None)
}

pub(super) async fn delete_idempotency_key(store: &InMemoryStore, key: &str) -> StorageResult<()> {
    store.idempotency.lock().remove(key);
    Ok(())
}

pub(super) async fn cleanup_expired_idempotency_keys(store: &InMemoryStore) -> StorageResult<u64> {
    let mut map = store.idempotency.lock();
    let before = map.len();
    map.retain(|_, (_, created, ttl)| created.elapsed() <= *ttl);
    Ok((before - map.len()) as u64)
}

pub(super) async fn move_to_dlq(
    store: &InMemoryStore,
    webhook: PendingWebhook,
    final_error: &str,
) -> StorageResult<()> {
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
    store.dlq.lock().insert(dlq_id, dlq_webhook);

    // Remove from webhook queue
    store.webhooks.lock().remove(&webhook.id);

    Ok(())
}

pub(super) async fn list_dlq(
    store: &InMemoryStore,
    tenant_id: &str,
    limit: i32,
) -> StorageResult<Vec<DlqWebhook>> {
    let dlq = store.dlq.lock();
    let mut items: Vec<_> = dlq
        .values()
        .filter(|d| d.tenant_id == tenant_id)
        .cloned()
        .collect();
    items.sort_by_key(|d| std::cmp::Reverse(d.moved_to_dlq_at));
    items.truncate(limit as usize);
    Ok(items)
}

pub(super) async fn get_dlq_entry(
    store: &InMemoryStore,
    dlq_id: &str,
) -> StorageResult<Option<DlqWebhook>> {
    let dlq = store.dlq.lock();
    Ok(dlq.get(dlq_id).cloned())
}

pub(super) async fn retry_from_dlq(store: &InMemoryStore, dlq_id: &str) -> StorageResult<()> {
    let mut dlq = store.dlq.lock();
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

    store.webhooks.lock().insert(webhook.id.clone(), webhook);

    Ok(())
}

pub(super) async fn delete_from_dlq(store: &InMemoryStore, dlq_id: &str) -> StorageResult<()> {
    store.dlq.lock().remove(dlq_id);
    Ok(())
}
