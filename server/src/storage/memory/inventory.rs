use super::*;

pub(super) async fn reserve_inventory(
    store: &InMemoryStore,
    reservation: InventoryReservation,
) -> StorageResult<()> {
    #[cfg(test)]
    if store.fail_reserve_inventory.load(Ordering::SeqCst) {
        return Err(StorageError::Unknown(
            "forced reserve_inventory failure".to_string(),
        ));
    }

    #[cfg(test)]
    {
        // In-memory inventory check for tests: verify sufficient inventory exists
        let product_key = format!("{}:{}", reservation.tenant_id, reservation.product_id);
        let inventory_quantity = store.product_inventory.lock().get(&product_key).copied();

        if let Some(qty) = inventory_quantity {
            // For tests, assume no backorder policy (conservative)
            let now = Utc::now();
            let reserved: i64 = store
                .inventory_reservations
                .lock()
                .values()
                .filter(|r| r.tenant_id == reservation.tenant_id)
                .filter(|r| r.product_id == reservation.product_id)
                .filter(|r| r.variant_id == reservation.variant_id)
                .filter(|r| r.status == "active")
                .filter(|r| r.expires_at > now)
                .map(|r| r.quantity as i64)
                .sum();
            if reserved + reservation.quantity as i64 > qty as i64 {
                return Err(StorageError::Conflict);
            }
        }
    }

    let key = tenant_key(&reservation.tenant_id, &reservation.id);
    store.inventory_reservations.lock().insert(key, reservation);
    Ok(())
}

pub(super) async fn get_active_inventory_reservation_quantity(
    store: &InMemoryStore,
    tenant_id: &str,
    product_id: &str,
    variant_id: Option<&str>,
    now: DateTime<Utc>,
) -> StorageResult<i64> {
    let total = store
        .inventory_reservations
        .lock()
        .values()
        .filter(|r| r.tenant_id == tenant_id)
        .filter(|r| r.product_id == product_id)
        .filter(|r| r.variant_id.as_deref() == variant_id)
        .filter(|r| r.status == "active")
        .filter(|r| r.expires_at > now)
        .map(|r| r.quantity as i64)
        .sum();
    Ok(total)
}

pub(super) async fn get_active_inventory_reservation_quantity_excluding_cart(
    store: &InMemoryStore,
    tenant_id: &str,
    product_id: &str,
    variant_id: Option<&str>,
    exclude_cart_id: &str,
    now: DateTime<Utc>,
) -> StorageResult<i64> {
    let total = store
        .inventory_reservations
        .lock()
        .values()
        .filter(|r| r.tenant_id == tenant_id)
        .filter(|r| r.product_id == product_id)
        .filter(|r| r.variant_id.as_deref() == variant_id)
        .filter(|r| r.status == "active")
        .filter(|r| r.expires_at > now)
        .filter(|r| r.cart_id.as_deref() != Some(exclude_cart_id))
        .map(|r| r.quantity as i64)
        .sum();
    Ok(total)
}

pub(super) async fn list_active_reservations_for_cart(
    store: &InMemoryStore,
    tenant_id: &str,
    cart_id: &str,
) -> StorageResult<Vec<InventoryReservation>> {
    Ok(store
        .inventory_reservations
        .lock()
        .values()
        .filter(|r| r.tenant_id == tenant_id)
        .filter(|r| r.cart_id.as_deref() == Some(cart_id))
        .filter(|r| r.status == "active")
        .cloned()
        .collect())
}

pub(super) async fn release_inventory_reservations(
    store: &InMemoryStore,
    tenant_id: &str,
    cart_id: &str,
    _released_at: DateTime<Utc>,
) -> StorageResult<u64> {
    #[cfg(test)]
    store
        .release_inventory_calls
        .fetch_add(1, Ordering::SeqCst);
    let mut reservations = store.inventory_reservations.lock();
    let mut count = 0_u64;
    for reservation in reservations.values_mut() {
        if reservation.tenant_id == tenant_id
            && reservation.cart_id.as_deref() == Some(cart_id)
            && reservation.status == "active"
        {
            reservation.status = "released".to_string();
            count += 1;
        }
    }
    Ok(count)
}

pub(super) async fn convert_inventory_reservations(
    store: &InMemoryStore,
    tenant_id: &str,
    cart_id: &str,
    _converted_at: DateTime<Utc>,
) -> StorageResult<u64> {
    let mut reservations = store.inventory_reservations.lock();
    let mut count = 0_u64;
    for reservation in reservations.values_mut() {
        if reservation.tenant_id == tenant_id
            && reservation.cart_id.as_deref() == Some(cart_id)
            && reservation.status == "active"
        {
            reservation.status = "converted".to_string();
            count += 1;
        }
    }
    Ok(count)
}

pub(super) async fn cleanup_expired_inventory_reservations(
    store: &InMemoryStore,
    now: DateTime<Utc>,
) -> StorageResult<u64> {
    let mut reservations = store.inventory_reservations.lock();
    let mut count = 0_u64;
    for reservation in reservations.values_mut() {
        if reservation.status == "active" && reservation.expires_at < now {
            reservation.status = "released".to_string();
            count += 1;
        }
    }
    Ok(count)
}

pub(super) async fn record_inventory_adjustment(
    store: &InMemoryStore,
    adjustment: InventoryAdjustment,
) -> StorageResult<()> {
    let key = tenant_key(&adjustment.tenant_id, &adjustment.id);
    store.inventory_adjustments.lock().insert(key, adjustment);
    Ok(())
}

pub(super) async fn list_inventory_adjustments(
    store: &InMemoryStore,
    tenant_id: &str,
    product_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<InventoryAdjustment>> {
    if limit <= 0 {
        return Ok(Vec::new());
    }

    let mut items: Vec<InventoryAdjustment> = store
        .inventory_adjustments
        .lock()
        .values()
        .filter(|a| a.tenant_id == tenant_id && a.product_id == product_id)
        .cloned()
        .collect();
    items.sort_by_key(|a| std::cmp::Reverse(a.created_at));

    let offset = offset.max(0) as usize;
    let limit = limit as usize;
    if offset >= items.len() {
        return Ok(Vec::new());
    }
    let end = (offset + limit).min(items.len());
    Ok(items[offset..end].to_vec())
}

pub(super) async fn update_inventory_batch(
    store: &InMemoryStore,
    tenant_id: &str,
    updates: Vec<(String, Option<String>, i32)>,
    reason: Option<&str>,
    actor: Option<&str>,
) -> StorageResult<HashMap<String, (i32, i32)>> {
    // Memory store implementation for batch inventory updates
    // In non-test mode, we just record the adjustments for audit trail
    // In test mode, we also track inventory changes
    let mut results = HashMap::new();
    let now = Utc::now();

    for (product_id, variant_id, delta) in updates {
        #[cfg(test)]
        {
            // Get current inventory from test-only storage if available
            let key = format!("{}:{}", tenant_id, product_id);
            let current_qty = store
                .product_inventory
                .lock()
                .get(&key)
                .copied()
                .unwrap_or(100); // Default starting inventory

            let next_qty = current_qty.saturating_sub(delta).max(0);

            // Update stored inventory
            store.product_inventory.lock().insert(key, next_qty);

            // Record adjustment
            let adjustment = InventoryAdjustment {
                id: uuid::Uuid::new_v4().to_string(),
                tenant_id: tenant_id.to_string(),
                product_id: product_id.clone(),
                variant_id: variant_id.clone(),
                delta: -delta,
                quantity_before: current_qty,
                quantity_after: next_qty,
                reason: reason.map(|s| s.to_string()),
                actor: actor.map(|s| s.to_string()),
                created_at: now,
            };
            let adj_key = tenant_key(tenant_id, &adjustment.id);
            store.inventory_adjustments.lock().insert(adj_key, adjustment);

            results.insert(product_id, (current_qty, next_qty));
        }

        #[cfg(not(test))]
        {
            // In non-test mode, just record the adjustment with default values
            let current_qty: i32 = 100; // Default assumed inventory
            let next_qty = current_qty.saturating_sub(delta).max(0);

            let adjustment = InventoryAdjustment {
                id: uuid::Uuid::new_v4().to_string(),
                tenant_id: tenant_id.to_string(),
                product_id: product_id.clone(),
                variant_id: variant_id.clone(),
                delta: -delta,
                quantity_before: current_qty,
                quantity_after: next_qty,
                reason: reason.map(|s| s.to_string()),
                actor: actor.map(|s| s.to_string()),
                created_at: now,
            };
            let adj_key = tenant_key(tenant_id, &adjustment.id);
            store
                .inventory_adjustments
                .lock()
                .insert(adj_key, adjustment);

            results.insert(product_id, (current_qty, next_qty));
        }
    }

    Ok(results)
}

pub(super) async fn adjust_inventory_atomic(
    store: &InMemoryStore,
    tenant_id: &str,
    product_id: &str,
    delta: i32,
) -> StorageResult<(i32, i32)> {
    #[cfg(test)]
    {
        let key = format!("{}:{}", tenant_id, product_id);
        let mut inventory = store.product_inventory.lock();
        let current = inventory.get(&key).copied().ok_or(StorageError::NotFound)?;
        let next = current + delta;
        if next < 0 {
            return Err(StorageError::Validation(
                "resulting quantity must be >= 0".into(),
            ));
        }
        inventory.insert(key, next);
        Ok((current, next))
    }

    #[cfg(not(test))]
    {
        let _ = (store, tenant_id, product_id, delta);
        Err(StorageError::Validation(
            "InMemoryStore does not support inventory tracking outside tests".into(),
        ))
    }
}
