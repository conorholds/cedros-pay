use super::*;

pub(super) async fn create_shipping_profile(
    store: &InMemoryStore,
    profile: crate::models::ShippingProfile,
) -> StorageResult<()> {
    let key = tenant_key(&profile.tenant_id, &profile.id);
    store.shipping_profiles.lock().insert(key, profile);
    Ok(())
}

pub(super) async fn update_shipping_profile(
    store: &InMemoryStore,
    profile: crate::models::ShippingProfile,
) -> StorageResult<()> {
    let key = tenant_key(&profile.tenant_id, &profile.id);
    let mut profiles = store.shipping_profiles.lock();
    if let std::collections::hash_map::Entry::Occupied(mut entry) = profiles.entry(key) {
        entry.insert(profile);
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn get_shipping_profile(
    store: &InMemoryStore,
    tenant_id: &str,
    profile_id: &str,
) -> StorageResult<Option<crate::models::ShippingProfile>> {
    Ok(store
        .shipping_profiles
        .lock()
        .get(&tenant_key(tenant_id, profile_id))
        .cloned())
}

pub(super) async fn list_shipping_profiles(
    store: &InMemoryStore,
    tenant_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<crate::models::ShippingProfile>> {
    if limit <= 0 {
        return Ok(Vec::new());
    }
    let mut items: Vec<_> = store
        .shipping_profiles
        .lock()
        .values()
        .filter(|p| p.tenant_id == tenant_id)
        .cloned()
        .collect();
    items.sort_by_key(|p| std::cmp::Reverse(p.created_at));
    let offset = offset.max(0) as usize;
    let limit = limit as usize;
    if offset >= items.len() {
        return Ok(Vec::new());
    }
    let end = (offset + limit).min(items.len());
    Ok(items[offset..end].to_vec())
}

pub(super) async fn delete_shipping_profile(
    store: &InMemoryStore,
    tenant_id: &str,
    profile_id: &str,
) -> StorageResult<()> {
    let key = tenant_key(tenant_id, profile_id);
    let removed = store.shipping_profiles.lock().remove(&key);
    if removed.is_some() {
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn create_shipping_rate(
    store: &InMemoryStore,
    rate: crate::models::ShippingRate,
) -> StorageResult<()> {
    let key = tenant_key(&rate.tenant_id, &rate.id);
    store.shipping_rates.lock().insert(key, rate);
    Ok(())
}

pub(super) async fn update_shipping_rate(
    store: &InMemoryStore,
    rate: crate::models::ShippingRate,
) -> StorageResult<()> {
    let key = tenant_key(&rate.tenant_id, &rate.id);
    let mut rates = store.shipping_rates.lock();
    if let std::collections::hash_map::Entry::Occupied(mut entry) = rates.entry(key) {
        entry.insert(rate);
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn list_shipping_rates(
    store: &InMemoryStore,
    tenant_id: &str,
    profile_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<crate::models::ShippingRate>> {
    if limit <= 0 {
        return Ok(Vec::new());
    }
    let mut items: Vec<_> = store
        .shipping_rates
        .lock()
        .values()
        .filter(|r| r.tenant_id == tenant_id && r.profile_id == profile_id)
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

pub(super) async fn delete_shipping_rate(
    store: &InMemoryStore,
    tenant_id: &str,
    rate_id: &str,
) -> StorageResult<()> {
    let key = tenant_key(tenant_id, rate_id);
    let removed = store.shipping_rates.lock().remove(&key);
    if removed.is_some() {
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn create_tax_rate(store: &InMemoryStore, rate: TaxRate) -> StorageResult<()> {
    let key = tenant_key(&rate.tenant_id, &rate.id);
    store.tax_rates.lock().insert(key, rate);
    Ok(())
}

pub(super) async fn update_tax_rate(store: &InMemoryStore, rate: TaxRate) -> StorageResult<()> {
    let key = tenant_key(&rate.tenant_id, &rate.id);
    let mut rates = store.tax_rates.lock();
    if let std::collections::hash_map::Entry::Occupied(mut entry) = rates.entry(key) {
        entry.insert(rate);
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn get_tax_rate(
    store: &InMemoryStore,
    tenant_id: &str,
    rate_id: &str,
) -> StorageResult<Option<TaxRate>> {
    Ok(store
        .tax_rates
        .lock()
        .get(&tenant_key(tenant_id, rate_id))
        .cloned())
}

pub(super) async fn list_tax_rates(
    store: &InMemoryStore,
    tenant_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<TaxRate>> {
    if limit <= 0 {
        return Ok(Vec::new());
    }
    let mut items: Vec<_> = store
        .tax_rates
        .lock()
        .values()
        .filter(|r| r.tenant_id == tenant_id)
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

pub(super) async fn delete_tax_rate(
    store: &InMemoryStore,
    tenant_id: &str,
    rate_id: &str,
) -> StorageResult<()> {
    let key = tenant_key(tenant_id, rate_id);
    let removed = store.tax_rates.lock().remove(&key);
    if removed.is_some() {
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}
