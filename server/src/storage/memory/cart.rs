use super::*;

pub(super) async fn store_cart_quote(
    store: &InMemoryStore,
    quote: CartQuote,
) -> StorageResult<()> {
    #[cfg(test)]
    if store.fail_store_cart_quote.load(Ordering::SeqCst) {
        return Err(StorageError::Unknown(
            "forced store_cart_quote failure".to_string(),
        ));
    }
    let key = tenant_key(&quote.tenant_id, &quote.id);
    store.carts.lock().insert(key, quote);
    Ok(())
}

pub(super) async fn store_cart_quotes(
    store: &InMemoryStore,
    quotes: Vec<CartQuote>,
) -> StorageResult<()> {
    let mut carts = store.carts.lock();
    for quote in quotes {
        let key = tenant_key(&quote.tenant_id, &quote.id);
        carts.insert(key, quote);
    }
    Ok(())
}

pub(super) async fn get_cart_quote(
    store: &InMemoryStore,
    tenant_id: &str,
    cart_id: &str,
) -> StorageResult<Option<CartQuote>> {
    Ok(store
        .carts
        .lock()
        .get(&tenant_key(tenant_id, cart_id))
        .cloned())
}

pub(super) async fn get_cart_quotes(
    store: &InMemoryStore,
    tenant_id: &str,
    cart_ids: &[String],
) -> StorageResult<Vec<CartQuote>> {
    let carts = store.carts.lock();
    Ok(cart_ids
        .iter()
        .filter_map(|id| carts.get(&tenant_key(tenant_id, id)).cloned())
        .collect())
}

pub(super) async fn mark_cart_paid(
    store: &InMemoryStore,
    tenant_id: &str,
    cart_id: &str,
    wallet: &str,
) -> StorageResult<()> {
    let mut carts = store.carts.lock();
    if let Some(c) = carts.get_mut(&tenant_key(tenant_id, cart_id)) {
        c.wallet_paid_by = Some(wallet.to_string());
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn has_cart_access(
    store: &InMemoryStore,
    tenant_id: &str,
    cart_id: &str,
    wallet: &str,
) -> StorageResult<bool> {
    let carts = store.carts.lock();
    Ok(carts
        .get(&tenant_key(tenant_id, cart_id))
        .and_then(|c| c.wallet_paid_by.as_ref())
        .map(|w| w == wallet)
        .unwrap_or(false))
}

pub(super) async fn cleanup_expired_cart_quotes(store: &InMemoryStore) -> StorageResult<u64> {
    let now = Utc::now();
    let mut carts = store.carts.lock();
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
