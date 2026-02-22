use super::*;

pub(super) async fn store_refund_quote(
    store: &InMemoryStore,
    quote: RefundQuote,
) -> StorageResult<()> {
    let key = tenant_key(&quote.tenant_id, &quote.id);
    store.refunds.lock().insert(key, quote);
    Ok(())
}

pub(super) async fn store_refund_quotes(
    store: &InMemoryStore,
    quotes: Vec<RefundQuote>,
) -> StorageResult<()> {
    let mut refunds = store.refunds.lock();
    for quote in quotes {
        let key = tenant_key(&quote.tenant_id, &quote.id);
        refunds.insert(key, quote);
    }
    Ok(())
}

pub(super) async fn get_refund_quote(
    store: &InMemoryStore,
    tenant_id: &str,
    refund_id: &str,
) -> StorageResult<Option<RefundQuote>> {
    Ok(store
        .refunds
        .lock()
        .get(&tenant_key(tenant_id, refund_id))
        .cloned())
}

pub(super) async fn get_refund_by_original_purchase_id(
    store: &InMemoryStore,
    tenant_id: &str,
    original_purchase_id: &str,
) -> StorageResult<Option<RefundQuote>> {
    Ok(store
        .refunds
        .lock()
        .values()
        .find(|r| r.tenant_id == tenant_id && r.original_purchase_id == original_purchase_id)
        .cloned())
}

pub(super) async fn get_all_refunds_for_purchase(
    store: &InMemoryStore,
    tenant_id: &str,
    original_purchase_id: &str,
) -> StorageResult<Vec<RefundQuote>> {
    Ok(store
        .refunds
        .lock()
        .values()
        .filter(|r| r.tenant_id == tenant_id && r.original_purchase_id == original_purchase_id)
        .cloned()
        .collect())
}

pub(super) async fn list_pending_refunds(
    store: &InMemoryStore,
    tenant_id: &str,
    limit: i32,
) -> StorageResult<Vec<RefundQuote>> {
    let now = Utc::now();
    if limit <= 0 {
        return Ok(Vec::new());
    }
    let mut refunds: Vec<RefundQuote> = store
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

pub(super) async fn list_credits_refund_requests(
    store: &InMemoryStore,
    tenant_id: &str,
    status: Option<&str>,
    limit: i32,
    offset: i32,
) -> StorageResult<(Vec<RefundQuote>, i64)> {
    let now = Utc::now();
    let mut refunds: Vec<RefundQuote> = store
        .refunds
        .lock()
        .values()
        .filter(|r| r.tenant_id == tenant_id && r.original_purchase_id.starts_with("credits:"))
        .filter(|r| match status {
            Some("pending") => !r.is_finalized() && !r.is_expired_at(now),
            Some("completed") => r.is_processed(),
            Some("denied") => r.is_denied(),
            _ => true,
        })
        .cloned()
        .collect();
    refunds.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    let total = refunds.len() as i64;
    let offset = (offset.max(0) as usize).min(refunds.len());
    let limit = limit.max(0) as usize;
    let page = refunds[offset..].iter().take(limit).cloned().collect();
    Ok((page, total))
}

pub(super) async fn mark_refund_processed(
    store: &InMemoryStore,
    tenant_id: &str,
    refund_id: &str,
    processed_by: &str,
    signature: &str,
) -> StorageResult<()> {
    let mut refunds = store.refunds.lock();
    if let Some(r) = refunds.get_mut(&tenant_key(tenant_id, refund_id)) {
        r.processed_by = Some(processed_by.to_string());
        r.processed_at = Some(Utc::now());
        r.signature = Some(signature.to_string());
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn delete_refund_quote(
    store: &InMemoryStore,
    tenant_id: &str,
    refund_id: &str,
) -> StorageResult<()> {
    store
        .refunds
        .lock()
        .remove(&tenant_key(tenant_id, refund_id));
    Ok(())
}

pub(super) async fn cleanup_expired_refund_quotes(store: &InMemoryStore) -> StorageResult<u64> {
    let now = Utc::now();
    let mut refunds = store.refunds.lock();
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

pub(super) async fn store_stripe_refund_request(
    store: &InMemoryStore,
    req: StripeRefundRequest,
) -> StorageResult<()> {
    let key = tenant_key(&req.tenant_id, &req.id);
    store.stripe_refund_requests.lock().insert(key, req);
    Ok(())
}

pub(super) async fn get_stripe_refund_request(
    store: &InMemoryStore,
    tenant_id: &str,
    request_id: &str,
) -> StorageResult<Option<StripeRefundRequest>> {
    Ok(store
        .stripe_refund_requests
        .lock()
        .get(&tenant_key(tenant_id, request_id))
        .cloned())
}

pub(super) async fn list_pending_stripe_refund_requests(
    store: &InMemoryStore,
    tenant_id: &str,
    limit: i32,
) -> StorageResult<Vec<StripeRefundRequest>> {
    if limit <= 0 {
        return Ok(Vec::new());
    }

    let mut reqs: Vec<StripeRefundRequest> = store
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

pub(super) async fn get_pending_stripe_refund_request_by_original_purchase_id(
    store: &InMemoryStore,
    tenant_id: &str,
    original_purchase_id: &str,
) -> StorageResult<Option<StripeRefundRequest>> {
    Ok(store
        .stripe_refund_requests
        .lock()
        .values()
        .filter(|r| r.tenant_id == tenant_id && r.original_purchase_id == original_purchase_id)
        .filter(|r| r.processed_at.is_none())
        .max_by_key(|r| r.created_at)
        .cloned())
}

pub(super) async fn get_stripe_refund_request_by_charge_id(
    store: &InMemoryStore,
    tenant_id: &str,
    stripe_charge_id: &str,
) -> StorageResult<Option<StripeRefundRequest>> {
    Ok(store
        .stripe_refund_requests
        .lock()
        .values()
        .filter(|r| r.tenant_id == tenant_id)
        .filter(|r| r.stripe_charge_id.as_deref() == Some(stripe_charge_id))
        .max_by_key(|r| r.created_at)
        .cloned())
}
