use super::*;

pub(super) async fn record_payment(
    store: &InMemoryStore,
    tx: PaymentTransaction,
) -> StorageResult<()> {
    let key = tenant_key(&tx.tenant_id, &tx.signature);
    store.payments.lock().insert(key, tx);
    Ok(())
}

pub(super) async fn record_payments(
    store: &InMemoryStore,
    txs: Vec<PaymentTransaction>,
) -> StorageResult<()> {
    let mut payments = store.payments.lock();
    for tx in txs {
        let key = tenant_key(&tx.tenant_id, &tx.signature);
        payments.insert(key, tx);
    }
    Ok(())
}

pub(super) async fn try_record_payment(
    store: &InMemoryStore,
    tx: PaymentTransaction,
) -> StorageResult<bool> {
    use std::collections::hash_map::Entry;
    let mut payments = store.payments.lock();
    let key = tenant_key(&tx.tenant_id, &tx.signature);
    match payments.entry(key) {
        Entry::Vacant(e) => {
            e.insert(tx);
            Ok(true) // Newly inserted
        }
        Entry::Occupied(_) => Ok(false), // Already existed
    }
}

pub(super) async fn delete_payment(
    store: &InMemoryStore,
    tenant_id: &str,
    signature: &str,
) -> StorageResult<()> {
    store
        .payments
        .lock()
        .remove(&tenant_key(tenant_id, signature));
    Ok(())
}

pub(super) async fn has_payment_been_processed(
    store: &InMemoryStore,
    tenant_id: &str,
    signature: &str,
) -> StorageResult<bool> {
    Ok(store
        .payments
        .lock()
        .get(&tenant_key(tenant_id, signature))
        .is_some())
}

pub(super) async fn get_payment(
    store: &InMemoryStore,
    tenant_id: &str,
    signature: &str,
) -> StorageResult<Option<PaymentTransaction>> {
    Ok(store
        .payments
        .lock()
        .get(&tenant_key(tenant_id, signature))
        .cloned())
}

pub(super) async fn has_valid_access(
    store: &InMemoryStore,
    tenant_id: &str,
    resource: &str,
    wallet: &str,
) -> StorageResult<bool> {
    let now = Utc::now();
    let ttl = to_chrono_duration(crate::constants::DEFAULT_ACCESS_TTL);
    Ok(store.payments.lock().values().any(|p| {
        p.tenant_id == tenant_id
            && p.resource_id == resource
            && p.wallet == wallet
            && p.created_at + ttl > now
    }))
}

pub(super) async fn archive_old_payments(
    store: &InMemoryStore,
    older_than: DateTime<Utc>,
) -> StorageResult<u64> {
    let mut map = store.payments.lock();
    let before = map.len();
    map.retain(|_, v| v.created_at >= older_than);
    Ok((before - map.len()) as u64)
}

pub(super) async fn get_purchase_by_signature(
    store: &InMemoryStore,
    tenant_id: &str,
    signature: &str,
) -> StorageResult<Option<Purchase>> {
    Ok(store
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

pub(super) async fn store_credits_hold(
    store: &InMemoryStore,
    hold: CreditsHold,
) -> StorageResult<()> {
    let key = tenant_key(&hold.tenant_id, &hold.hold_id);
    let mut holds = store.credits_holds.lock();
    match holds.get_mut(&key) {
        None => {
            holds.insert(key, hold);
            Ok(())
        }
        Some(existing) => {
            if existing.user_id == hold.user_id
                && existing.resource_id == hold.resource_id
                && existing.amount == hold.amount
                && existing.amount_asset == hold.amount_asset
            {
                existing.expires_at = hold.expires_at;
                Ok(())
            } else {
                Err(StorageError::Conflict)
            }
        }
    }
}

pub(super) async fn get_credits_hold(
    store: &InMemoryStore,
    tenant_id: &str,
    hold_id: &str,
) -> StorageResult<Option<CreditsHold>> {
    Ok(store
        .credits_holds
        .lock()
        .get(&tenant_key(tenant_id, hold_id))
        .cloned())
}

pub(super) async fn delete_credits_hold(
    store: &InMemoryStore,
    tenant_id: &str,
    hold_id: &str,
) -> StorageResult<()> {
    store
        .credits_holds
        .lock()
        .remove(&tenant_key(tenant_id, hold_id));
    Ok(())
}

pub(super) async fn cleanup_expired_credits_holds(store: &InMemoryStore) -> StorageResult<u64> {
    let now = Utc::now();
    let mut map = store.credits_holds.lock();
    let before = map.len();
    map.retain(|_, v| v.expires_at > now);
    Ok((before - map.len()) as u64)
}

pub(super) async fn list_purchases_by_user_id(
    store: &InMemoryStore,
    tenant_id: &str,
    user_id: &str,
    limit: i64,
    offset: i64,
) -> StorageResult<Vec<Purchase>> {
    let mut items: Vec<Purchase> = store
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
