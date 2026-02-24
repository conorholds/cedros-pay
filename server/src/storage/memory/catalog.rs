use super::*;

pub(super) async fn create_gift_card(store: &InMemoryStore, card: GiftCard) -> StorageResult<()> {
    let key = tenant_key(&card.tenant_id, &card.code);
    store.gift_cards.lock().insert(key, card);
    Ok(())
}

pub(super) async fn update_gift_card(store: &InMemoryStore, card: GiftCard) -> StorageResult<()> {
    let key = tenant_key(&card.tenant_id, &card.code);
    let mut cards = store.gift_cards.lock();
    if let std::collections::hash_map::Entry::Occupied(mut entry) = cards.entry(key) {
        entry.insert(card);
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn get_gift_card(
    store: &InMemoryStore,
    tenant_id: &str,
    code: &str,
) -> StorageResult<Option<GiftCard>> {
    Ok(store
        .gift_cards
        .lock()
        .get(&tenant_key(tenant_id, code))
        .cloned())
}

pub(super) async fn list_gift_cards(
    store: &InMemoryStore,
    tenant_id: &str,
    active_only: Option<bool>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<GiftCard>> {
    if limit <= 0 {
        return Ok(Vec::new());
    }
    let mut items: Vec<_> = store
        .gift_cards
        .lock()
        .values()
        .filter(|c| c.tenant_id == tenant_id)
        .filter(|c| active_only.map(|a| c.active == a).unwrap_or(true))
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

pub(super) async fn adjust_gift_card_balance(
    store: &InMemoryStore,
    tenant_id: &str,
    code: &str,
    new_balance: i64,
    updated_at: DateTime<Utc>,
) -> StorageResult<()> {
    let key = tenant_key(tenant_id, code);
    let mut cards = store.gift_cards.lock();
    if let Some(card) = cards.get_mut(&key) {
        card.balance = new_balance;
        card.updated_at = updated_at;
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn try_adjust_gift_card_balance(
    store: &InMemoryStore,
    tenant_id: &str,
    code: &str,
    deduction: i64,
    updated_at: DateTime<Utc>,
) -> StorageResult<Option<i64>> {
    let key = tenant_key(tenant_id, code);
    let mut cards = store.gift_cards.lock();
    if let Some(card) = cards.get_mut(&key) {
        if card.balance >= deduction {
            card.balance -= deduction;
            card.updated_at = updated_at;
            Ok(Some(card.balance))
        } else {
            Ok(None) // Insufficient funds
        }
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn create_collection(
    store: &InMemoryStore,
    collection: Collection,
) -> StorageResult<()> {
    let key = tenant_key(&collection.tenant_id, &collection.id);
    store.collections.lock().insert(key, collection);
    Ok(())
}

pub(super) async fn update_collection(
    store: &InMemoryStore,
    collection: Collection,
) -> StorageResult<()> {
    let key = tenant_key(&collection.tenant_id, &collection.id);
    let mut collections = store.collections.lock();
    if let std::collections::hash_map::Entry::Occupied(mut entry) = collections.entry(key) {
        entry.insert(collection);
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}

pub(super) async fn get_collection(
    store: &InMemoryStore,
    tenant_id: &str,
    collection_id: &str,
) -> StorageResult<Option<Collection>> {
    Ok(store
        .collections
        .lock()
        .get(&tenant_key(tenant_id, collection_id))
        .cloned())
}

pub(super) async fn list_collections(
    store: &InMemoryStore,
    tenant_id: &str,
    active_only: Option<bool>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<Collection>> {
    if limit <= 0 {
        return Ok(Vec::new());
    }
    let mut items: Vec<_> = store
        .collections
        .lock()
        .values()
        .filter(|c| c.tenant_id == tenant_id)
        .filter(|c| active_only.map(|a| c.active == a).unwrap_or(true))
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

pub(super) async fn delete_collection(
    store: &InMemoryStore,
    tenant_id: &str,
    collection_id: &str,
) -> StorageResult<()> {
    let key = tenant_key(tenant_id, collection_id);
    let removed = store.collections.lock().remove(&key);
    if removed.is_some() {
        Ok(())
    } else {
        Err(StorageError::NotFound)
    }
}
