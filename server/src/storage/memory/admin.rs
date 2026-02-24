use super::*;

pub(super) async fn create_nonce(store: &InMemoryStore, nonce: AdminNonce) -> StorageResult<()> {
    let key = tenant_key(&nonce.tenant_id, &nonce.id);
    store.nonces.lock().insert(key, nonce);
    Ok(())
}

pub(super) async fn get_nonce(
    store: &InMemoryStore,
    tenant_id: &str,
    nonce_id: &str,
) -> StorageResult<Option<AdminNonce>> {
    Ok(store
        .nonces
        .lock()
        .get(&tenant_key(tenant_id, nonce_id))
        .cloned())
}

pub(super) async fn consume_nonce(
    store: &InMemoryStore,
    tenant_id: &str,
    nonce_id: &str,
) -> StorageResult<()> {
    let mut nonces = store.nonces.lock();
    if let Some(n) = nonces.get_mut(&tenant_key(tenant_id, nonce_id)) {
        // Atomically check if already consumed to prevent double-use attacks
        if n.consumed_at.is_some() {
            return Err(StorageError::Conflict);
        }
        n.consumed_at = Some(Utc::now());
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn cleanup_expired_nonces(store: &InMemoryStore) -> StorageResult<u64> {
    let mut nonces = store.nonces.lock();
    let before = nonces.len();
    let now = Utc::now();
    nonces.retain(|_, n| n.expires_at > now && n.consumed_at.is_none());
    Ok((before - nonces.len()) as u64)
}

pub(super) async fn get_admin_stats(
    store: &InMemoryStore,
    tenant_id: &str,
) -> StorageResult<AdminStats> {
    let payments = store.payments.lock();
    let tenant_payments: Vec<_> = payments
        .values()
        .filter(|p| p.tenant_id == tenant_id)
        .collect();

    let total_transactions = tenant_payments.len() as i64;
    let total_revenue: f64 = tenant_payments
        .iter()
        .map(|p| p.amount.atomic as f64 / 1_000_000.0)
        .sum();

    let average_order_value = if total_transactions > 0 {
        total_revenue / total_transactions as f64
    } else {
        0.0
    };

    let mut revenue_by_method = std::collections::HashMap::new();
    let mut transactions_by_method = std::collections::HashMap::new();
    revenue_by_method.insert("x402".to_string(), total_revenue);
    transactions_by_method.insert("x402".to_string(), total_transactions);

    // For in-memory store, we don't track daily revenue or top products
    Ok(AdminStats {
        total_revenue,
        total_transactions,
        average_order_value,
        revenue_by_method,
        transactions_by_method,
        revenue_by_day: Vec::new(),
        top_products: Vec::new(),
    })
}

pub(super) async fn list_purchases(
    store: &InMemoryStore,
    tenant_id: &str,
    _method: Option<&str>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<Purchase>> {
    let payments = store.payments.lock();
    let mut purchases: Vec<Purchase> = payments
        .values()
        .filter(|p| p.tenant_id == tenant_id)
        .map(|p| Purchase {
            signature: p.signature.clone(),
            tenant_id: p.tenant_id.clone(),
            resource_id: p.resource_id.clone(),
            wallet: Some(p.wallet.clone()),
            user_id: p.user_id.clone(),
            amount: format!("{} {}", p.amount.atomic, p.amount.asset.code),
            paid_at: p.created_at,
            metadata: Some(serde_json::to_value(&p.metadata).unwrap_or_default()),
        })
        .collect();

    purchases.sort_by(|a, b| b.paid_at.cmp(&a.paid_at));
    let start = offset as usize;
    let end = (offset + limit) as usize;
    Ok(purchases
        .into_iter()
        .skip(start)
        .take(end - start)
        .collect())
}
