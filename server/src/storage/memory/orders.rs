use super::*;

pub(super) async fn try_store_order(store: &InMemoryStore, order: Order) -> StorageResult<bool> {
    #[cfg(test)]
    if store.fail_try_store_order.load(Ordering::SeqCst) {
        return Err(StorageError::Unknown(
            "forced try_store_order failure".to_string(),
        ));
    }
    let mut orders = store.orders.lock();

    let exists = orders.values().any(|o| {
        o.tenant_id == order.tenant_id
            && o.source == order.source
            && o.purchase_id == order.purchase_id
    });
    if exists {
        return Ok(false);
    }

    let key = tenant_key(&order.tenant_id, &order.id);
    orders.insert(key, order);
    Ok(true)
}

pub(super) async fn get_order(
    store: &InMemoryStore,
    tenant_id: &str,
    order_id: &str,
) -> StorageResult<Option<Order>> {
    Ok(store
        .orders
        .lock()
        .get(&tenant_key(tenant_id, order_id))
        .cloned())
}

pub(super) async fn list_orders(
    store: &InMemoryStore,
    tenant_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<Order>> {
    if limit <= 0 {
        return Ok(Vec::new());
    }

    let mut orders: Vec<Order> = store
        .orders
        .lock()
        .values()
        .filter(|o| o.tenant_id == tenant_id)
        .cloned()
        .collect();

    orders.sort_by_key(|o| std::cmp::Reverse(o.created_at));

    let offset = offset.max(0) as usize;
    let limit = limit as usize;
    if offset >= orders.len() {
        return Ok(Vec::new());
    }

    let end = (offset + limit).min(orders.len());
    Ok(orders[offset..end].to_vec())
}

pub(super) async fn list_orders_filtered(
    store: &InMemoryStore,
    tenant_id: &str,
    status: Option<&str>,
    search: Option<&str>,
    created_before: Option<DateTime<Utc>>,
    created_after: Option<DateTime<Utc>>,
    limit: i32,
    offset: i32,
) -> StorageResult<(Vec<Order>, i64)> {
    if limit <= 0 {
        return Ok((Vec::new(), 0));
    }

    let search = search.and_then(|s| {
        let trimmed = s.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_lowercase())
        }
    });

    let mut orders: Vec<Order> = store
        .orders
        .lock()
        .values()
        .filter(|o| o.tenant_id == tenant_id)
        .filter(|o| status.map(|s| o.status == s).unwrap_or(true))
        .filter(|o| {
            if let Some(ref needle) = search {
                let hay = format!(
                    "{} {} {}",
                    o.id.to_lowercase(),
                    o.purchase_id.to_lowercase(),
                    o.customer_email.clone().unwrap_or_default().to_lowercase()
                );
                hay.contains(needle)
            } else {
                true
            }
        })
        .filter(|o| created_before.map(|t| o.created_at < t).unwrap_or(true))
        .filter(|o| created_after.map(|t| o.created_at > t).unwrap_or(true))
        .cloned()
        .collect();

    orders.sort_by_key(|o| std::cmp::Reverse(o.created_at));
    let total = orders.len() as i64;

    let offset = offset.max(0) as usize;
    let limit = limit as usize;
    if offset >= orders.len() {
        return Ok((Vec::new(), total));
    }
    let end = (offset + limit).min(orders.len());
    Ok((orders[offset..end].to_vec(), total))
}

pub(super) async fn update_order_status(
    store: &InMemoryStore,
    tenant_id: &str,
    order_id: &str,
    status: &str,
    status_updated_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
) -> StorageResult<()> {
    let mut orders = store.orders.lock();
    let key = tenant_key(tenant_id, order_id);
    match orders.get_mut(&key) {
        Some(order) => {
            order.status = status.to_string();
            order.status_updated_at = Some(status_updated_at);
            order.updated_at = Some(updated_at);
            Ok(())
        }
        None => Err(StorageError::NotFound),
    }
}

pub(super) async fn append_order_history(
    store: &InMemoryStore,
    entry: OrderHistoryEntry,
) -> StorageResult<()> {
    let mut history = store.order_history.lock();
    let key = tenant_key(&entry.tenant_id, &entry.order_id);
    history.entry(key).or_default().push(entry);
    Ok(())
}

pub(super) async fn list_order_history(
    store: &InMemoryStore,
    tenant_id: &str,
    order_id: &str,
    limit: i32,
) -> StorageResult<Vec<OrderHistoryEntry>> {
    let key = tenant_key(tenant_id, order_id);
    let mut entries = store
        .order_history
        .lock()
        .get(&key)
        .cloned()
        .unwrap_or_default();
    entries.sort_by_key(|e| std::cmp::Reverse(e.created_at));
    if limit <= 0 {
        return Ok(Vec::new());
    }
    let limit = limit as usize;
    Ok(entries.into_iter().take(limit).collect())
}

pub(super) async fn create_fulfillment(
    store: &InMemoryStore,
    fulfillment: Fulfillment,
) -> StorageResult<()> {
    let key = tenant_key(&fulfillment.tenant_id, &fulfillment.id);
    store.fulfillments.lock().insert(key, fulfillment);
    Ok(())
}

pub(super) async fn get_fulfillment(
    store: &InMemoryStore,
    tenant_id: &str,
    fulfillment_id: &str,
) -> StorageResult<Option<Fulfillment>> {
    let key = tenant_key(tenant_id, fulfillment_id);
    Ok(store.fulfillments.lock().get(&key).cloned())
}

pub(super) async fn list_fulfillments(
    store: &InMemoryStore,
    tenant_id: &str,
    order_id: &str,
    limit: i32,
) -> StorageResult<Vec<Fulfillment>> {
    let mut items: Vec<Fulfillment> = store
        .fulfillments
        .lock()
        .values()
        .filter(|f| f.tenant_id == tenant_id && f.order_id == order_id)
        .cloned()
        .collect();
    items.sort_by_key(|f| std::cmp::Reverse(f.created_at));
    if limit <= 0 {
        return Ok(Vec::new());
    }
    Ok(items.into_iter().take(limit as usize).collect())
}

pub(super) async fn update_fulfillment_status(
    store: &InMemoryStore,
    tenant_id: &str,
    fulfillment_id: &str,
    status: &str,
    shipped_at: Option<DateTime<Utc>>,
    delivered_at: Option<DateTime<Utc>>,
    updated_at: DateTime<Utc>,
    tracking_number: Option<&str>,
    tracking_url: Option<&str>,
    carrier: Option<&str>,
) -> StorageResult<Option<Fulfillment>> {
    let key = tenant_key(tenant_id, fulfillment_id);
    let mut fulfillments = store.fulfillments.lock();
    match fulfillments.get_mut(&key) {
        Some(f) => {
            f.status = status.to_string();
            f.shipped_at = shipped_at;
            f.delivered_at = delivered_at;
            f.updated_at = Some(updated_at);
            f.tracking_number = tracking_number.map(|v| v.to_string());
            f.tracking_url = tracking_url.map(|v| v.to_string());
            f.carrier = carrier.map(|v| v.to_string());
            Ok(Some(f.clone()))
        }
        None => Ok(None),
    }
}

pub(super) async fn create_return_request(
    store: &InMemoryStore,
    request: ReturnRequest,
) -> StorageResult<()> {
    let key = tenant_key(&request.tenant_id, &request.id);
    store.returns.lock().insert(key, request);
    Ok(())
}

pub(super) async fn update_return_status(
    store: &InMemoryStore,
    tenant_id: &str,
    return_id: &str,
    status: &str,
    status_updated_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
) -> StorageResult<()> {
    let key = tenant_key(tenant_id, return_id);
    let mut returns = store.returns.lock();
    if let Some(r) = returns.get_mut(&key) {
        r.status = status.to_string();
        r.status_updated_at = Some(status_updated_at);
        r.updated_at = Some(updated_at);
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn get_return_request(
    store: &InMemoryStore,
    tenant_id: &str,
    return_id: &str,
) -> StorageResult<Option<ReturnRequest>> {
    Ok(store
        .returns
        .lock()
        .get(&tenant_key(tenant_id, return_id))
        .cloned())
}

pub(super) async fn list_return_requests(
    store: &InMemoryStore,
    tenant_id: &str,
    status: Option<&str>,
    order_id: Option<&str>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<ReturnRequest>> {
    if limit <= 0 {
        return Ok(Vec::new());
    }
    let mut items: Vec<_> = store
        .returns
        .lock()
        .values()
        .filter(|r| r.tenant_id == tenant_id)
        .filter(|r| status.map(|s| r.status == s).unwrap_or(true))
        .filter(|r| order_id.map(|id| r.order_id == id).unwrap_or(true))
        .cloned()
        .collect();
    items.sort_by_key(|r| std::cmp::Reverse(r.created_at));
    let offset = offset.max(0) as usize;
    let limit = limit as usize;
    if offset >= items.len() {
        return Ok(Vec::new());
    }
    let end = (offset + limit).min(items.len());
    Ok(items[offset..end].to_vec())
}
