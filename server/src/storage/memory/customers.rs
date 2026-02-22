use super::*;

pub(super) async fn create_customer(
    store: &InMemoryStore,
    customer: Customer,
) -> StorageResult<()> {
    let key = tenant_key(&customer.tenant_id, &customer.id);
    store.customers.lock().insert(key, customer);
    Ok(())
}

pub(super) async fn update_customer(
    store: &InMemoryStore,
    customer: Customer,
) -> StorageResult<()> {
    let key = tenant_key(&customer.tenant_id, &customer.id);
    let mut customers = store.customers.lock();
    if let std::collections::hash_map::Entry::Occupied(mut entry) = customers.entry(key) {
        entry.insert(customer);
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn get_customer(
    store: &InMemoryStore,
    tenant_id: &str,
    customer_id: &str,
) -> StorageResult<Option<Customer>> {
    Ok(store
        .customers
        .lock()
        .get(&tenant_key(tenant_id, customer_id))
        .cloned())
}

pub(super) async fn list_customers(
    store: &InMemoryStore,
    tenant_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<Customer>> {
    if limit <= 0 {
        return Ok(Vec::new());
    }
    let mut items: Vec<_> = store
        .customers
        .lock()
        .values()
        .filter(|c| c.tenant_id == tenant_id)
        .cloned()
        .collect();
    items.sort_by_key(|c| std::cmp::Reverse(c.created_at));
    let offset = offset.max(0) as usize;
    let limit = limit as usize;
    if offset >= items.len() {
        return Ok(Vec::new());
    }
    let end = (offset + limit).min(items.len());
    Ok(items[offset..end].to_vec())
}

pub(super) async fn create_dispute(
    store: &InMemoryStore,
    dispute: DisputeRecord,
) -> StorageResult<()> {
    let key = tenant_key(&dispute.tenant_id, &dispute.id);
    store.disputes.lock().insert(key, dispute);
    Ok(())
}

pub(super) async fn update_dispute_status(
    store: &InMemoryStore,
    tenant_id: &str,
    dispute_id: &str,
    status: &str,
    status_updated_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
) -> StorageResult<()> {
    let key = tenant_key(tenant_id, dispute_id);
    let mut disputes = store.disputes.lock();
    if let Some(d) = disputes.get_mut(&key) {
        d.status = status.to_string();
        d.status_updated_at = Some(status_updated_at);
        d.updated_at = Some(updated_at);
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn get_dispute(
    store: &InMemoryStore,
    tenant_id: &str,
    dispute_id: &str,
) -> StorageResult<Option<DisputeRecord>> {
    Ok(store
        .disputes
        .lock()
        .get(&tenant_key(tenant_id, dispute_id))
        .cloned())
}

pub(super) async fn list_disputes(
    store: &InMemoryStore,
    tenant_id: &str,
    status: Option<&str>,
    source: Option<&str>,
    order_id: Option<&str>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<DisputeRecord>> {
    if limit <= 0 {
        return Ok(Vec::new());
    }
    let mut items: Vec<_> = store
        .disputes
        .lock()
        .values()
        .filter(|d| d.tenant_id == tenant_id)
        .filter(|d| status.map(|s| d.status == s).unwrap_or(true))
        .filter(|d| source.map(|s| d.source == s).unwrap_or(true))
        .filter(|d| {
            order_id
                .map(|id| d.order_id.as_deref() == Some(id))
                .unwrap_or(true)
        })
        .cloned()
        .collect();
    items.sort_by_key(|d| std::cmp::Reverse(d.created_at));
    let offset = offset.max(0) as usize;
    let limit = limit as usize;
    if offset >= items.len() {
        return Ok(Vec::new());
    }
    let end = (offset + limit).min(items.len());
    Ok(items[offset..end].to_vec())
}
