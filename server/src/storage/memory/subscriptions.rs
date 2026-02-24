use super::*;

pub(super) async fn save_subscription(
    store: &InMemoryStore,
    sub: Subscription,
) -> StorageResult<()> {
    let key = tenant_key(&sub.tenant_id, &sub.id);
    store.subscriptions.lock().insert(key, sub);
    Ok(())
}

pub(super) async fn get_subscription(
    store: &InMemoryStore,
    tenant_id: &str,
    id: &str,
) -> StorageResult<Option<Subscription>> {
    Ok(store
        .subscriptions
        .lock()
        .get(&tenant_key(tenant_id, id))
        .cloned())
}

pub(super) async fn get_subscription_by_wallet(
    store: &InMemoryStore,
    tenant_id: &str,
    wallet: &str,
    product_id: &str,
) -> StorageResult<Option<Subscription>> {
    Ok(store
        .subscriptions
        .lock()
        .values()
        .find(|s| {
            s.tenant_id == tenant_id
                && s.wallet.as_deref() == Some(wallet)
                && s.product_id == product_id
        })
        .cloned())
}

pub(super) async fn get_subscriptions_by_wallet(
    store: &InMemoryStore,
    tenant_id: &str,
    wallet: &str,
) -> StorageResult<Vec<Subscription>> {
    Ok(store
        .subscriptions
        .lock()
        .values()
        .filter(|s| s.tenant_id == tenant_id && s.wallet.as_deref() == Some(wallet))
        .cloned()
        .collect())
}

pub(super) async fn get_subscription_by_stripe_id(
    store: &InMemoryStore,
    tenant_id: &str,
    stripe_sub_id: &str,
) -> StorageResult<Option<Subscription>> {
    Ok(store
        .subscriptions
        .lock()
        .values()
        .find(|s| {
            s.tenant_id == tenant_id && s.stripe_subscription_id.as_deref() == Some(stripe_sub_id)
        })
        .cloned())
}

pub(super) async fn find_subscription_by_stripe_id(
    store: &InMemoryStore,
    stripe_sub_id: &str,
) -> StorageResult<Option<Subscription>> {
    Ok(store
        .subscriptions
        .lock()
        .values()
        .find(|s| s.stripe_subscription_id.as_deref() == Some(stripe_sub_id))
        .cloned())
}

pub(super) async fn get_subscription_by_payment_signature(
    store: &InMemoryStore,
    tenant_id: &str,
    payment_signature: &str,
) -> StorageResult<Option<Subscription>> {
    Ok(store
        .subscriptions
        .lock()
        .values()
        .find(|s| {
            s.tenant_id == tenant_id && s.payment_signature.as_deref() == Some(payment_signature)
        })
        .cloned())
}

pub(super) async fn list_active_subscriptions(
    store: &InMemoryStore,
    tenant_id: &str,
    product_id: Option<&str>,
) -> StorageResult<Vec<Subscription>> {
    Ok(store
        .subscriptions
        .lock()
        .values()
        .filter(|s| {
            s.tenant_id == tenant_id
                && s.status == SubscriptionStatus::Active
                && product_id.map(|p| s.product_id == p).unwrap_or(true)
        })
        .cloned()
        .collect())
}

pub(super) async fn list_expiring_subscriptions(
    store: &InMemoryStore,
    tenant_id: &str,
    before: DateTime<Utc>,
) -> StorageResult<Vec<Subscription>> {
    Ok(store
        .subscriptions
        .lock()
        .values()
        .filter(|s| s.tenant_id == tenant_id && s.current_period_end <= before)
        .cloned()
        .collect())
}

pub(super) async fn update_subscription_status(
    store: &InMemoryStore,
    tenant_id: &str,
    id: &str,
    status: SubscriptionStatus,
) -> StorageResult<()> {
    if let Some(s) = store
        .subscriptions
        .lock()
        .get_mut(&tenant_key(tenant_id, id))
    {
        s.status = status;
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn delete_subscription(
    store: &InMemoryStore,
    tenant_id: &str,
    id: &str,
) -> StorageResult<()> {
    // Per spec (08-storage.md line 143): Soft delete - set status to cancelled
    let mut subs = store.subscriptions.lock();
    if let Some(sub) = subs.get_mut(&tenant_key(tenant_id, id)) {
        sub.status = SubscriptionStatus::Cancelled;
        sub.cancelled_at = Some(chrono::Utc::now());
    }
    Ok(())
}

pub(super) async fn get_subscriptions_by_stripe_customer_id(
    store: &InMemoryStore,
    tenant_id: &str,
    customer_id: &str,
) -> StorageResult<Vec<Subscription>> {
    Ok(store
        .subscriptions
        .lock()
        .values()
        .filter(|s| {
            s.tenant_id == tenant_id && s.stripe_customer_id.as_deref() == Some(customer_id)
        })
        .cloned()
        .collect())
}

pub(super) async fn list_subscriptions_by_product(
    store: &InMemoryStore,
    tenant_id: &str,
    product_id: &str,
) -> StorageResult<Vec<Subscription>> {
    Ok(store
        .subscriptions
        .lock()
        .values()
        .filter(|s| s.tenant_id == tenant_id && s.product_id == product_id)
        .cloned()
        .collect())
}

pub(super) async fn count_subscriptions_by_plan(
    store: &InMemoryStore,
    tenant_id: &str,
    plan_id: &str,
) -> StorageResult<i64> {
    let count = store
        .subscriptions
        .lock()
        .values()
        .filter(|s| {
            s.tenant_id == tenant_id
                && s.plan_id.as_deref() == Some(plan_id)
                && s.status != SubscriptionStatus::Cancelled
        })
        .count();
    Ok(count as i64)
}

pub(super) async fn list_tenant_ids(store: &InMemoryStore) -> StorageResult<Vec<String>> {
    let subs = store.subscriptions.lock();
    let mut tenants = HashSet::new();

    for key in subs.keys() {
        if let Some((tenant_id, _)) = key.split_once(':') {
            tenants.insert(tenant_id.to_string());
        }
    }

    let mut tenants: Vec<String> = tenants.into_iter().collect();
    tenants.sort();
    Ok(tenants)
}
