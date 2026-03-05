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

pub(super) async fn record_gift_card_redemption(
    store: &InMemoryStore,
    r: GiftCardRedemption,
) -> StorageResult<()> {
    let key = tenant_key(&r.tenant_id, &r.id);
    store.gift_card_redemptions.lock().insert(key, r);
    Ok(())
}

pub(super) async fn list_gift_card_redemptions(
    store: &InMemoryStore,
    tenant_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<GiftCardRedemption>> {
    if limit <= 0 {
        return Ok(Vec::new());
    }
    let mut items: Vec<_> = store
        .gift_card_redemptions
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

pub(super) async fn get_gift_card_redemption_by_token(
    store: &InMemoryStore,
    token: &str,
) -> StorageResult<Option<GiftCardRedemption>> {
    let found = store
        .gift_card_redemptions
        .lock()
        .values()
        .find(|r| r.redemption_token.as_deref() == Some(token))
        .cloned();
    Ok(found)
}

pub(super) async fn claim_gift_card_redemption(
    store: &InMemoryStore,
    id: &str,
    recipient_user_id: &str,
    credits_issued: i64,
) -> StorageResult<()> {
    // Iterate all shards — the key is tenant_key(tenant_id, id) but we only have id.
    let mut map = store.gift_card_redemptions.lock();
    let entry = map.values_mut().find(|r| r.id == id);
    match entry {
        Some(r) if !r.claimed => {
            r.claimed = true;
            r.recipient_user_id = recipient_user_id.to_string();
            r.credits_issued = credits_issued;
            r.redemption_token = None;
            Ok(())
        }
        Some(_) => Err(StorageError::Conflict),
        None => Err(StorageError::NotFound),
    }
}

pub(super) async fn get_tenant_token22_mint(
    store: &InMemoryStore,
    tenant_id: &str,
) -> StorageResult<Option<TenantToken22Mint>> {
    let key = tenant_key(tenant_id, "__gift_card__");
    Ok(store.tenant_token22_mints.lock().get(&key).cloned())
}

pub(super) async fn upsert_tenant_token22_mint(
    store: &InMemoryStore,
    mint: TenantToken22Mint,
) -> StorageResult<()> {
    let key = tenant_key(&mint.tenant_id, "__gift_card__");
    store.tenant_token22_mints.lock().insert(key, mint);
    Ok(())
}

pub(super) async fn get_token22_mint_for_collection(
    store: &InMemoryStore,
    tenant_id: &str,
    collection_id: &str,
) -> StorageResult<Option<TenantToken22Mint>> {
    let key = tenant_key(tenant_id, collection_id);
    Ok(store.tenant_token22_mints.lock().get(&key).cloned())
}

pub(super) async fn upsert_token22_mint_for_collection(
    store: &InMemoryStore,
    mint: TenantToken22Mint,
) -> StorageResult<()> {
    let key = tenant_key(
        &mint.tenant_id,
        mint.collection_id.as_deref().unwrap_or("__gift_card__"),
    );
    store.tenant_token22_mints.lock().insert(key, mint);
    Ok(())
}

// ─── Asset redemptions ──────────────────────────────────────────────────────

pub(super) async fn record_asset_redemption(
    store: &InMemoryStore,
    r: crate::models::AssetRedemption,
) -> StorageResult<()> {
    store.asset_redemptions.lock().insert(r.id.clone(), r);
    Ok(())
}

pub(super) async fn get_asset_redemption(
    store: &InMemoryStore,
    tenant_id: &str,
    id: &str,
) -> StorageResult<Option<crate::models::AssetRedemption>> {
    Ok(store
        .asset_redemptions
        .lock()
        .get(id)
        .filter(|r| r.tenant_id == tenant_id)
        .cloned())
}

pub(super) async fn list_asset_redemptions(
    store: &InMemoryStore,
    tenant_id: &str,
    status: Option<&str>,
    collection_id: Option<&str>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<crate::models::AssetRedemption>> {
    let guard = store.asset_redemptions.lock();
    let mut items: Vec<_> = guard
        .values()
        .filter(|r| r.tenant_id == tenant_id)
        .filter(|r| {
            status.map_or(true, |s| {
                serde_json::to_value(&r.status)
                    .ok()
                    .and_then(|v| v.as_str().map(|x| x == s))
                    .unwrap_or(false)
            })
        })
        .filter(|r| collection_id.map_or(true, |c| r.collection_id == c))
        .cloned()
        .collect();
    items.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(items
        .into_iter()
        .skip(offset as usize)
        .take(limit as usize)
        .collect())
}

pub(super) async fn update_asset_redemption_status(
    store: &InMemoryStore,
    tenant_id: &str,
    id: &str,
    status: &str,
    admin_notes: Option<&str>,
) -> StorageResult<()> {
    let mut guard = store.asset_redemptions.lock();
    let r = guard
        .get_mut(id)
        .filter(|r| r.tenant_id == tenant_id)
        .ok_or(StorageError::NotFound)?;
    r.status = serde_json::from_value(serde_json::Value::String(status.to_string()))
        .unwrap_or(crate::models::AssetRedemptionStatus::PendingInfo);
    if let Some(notes) = admin_notes {
        r.admin_notes = Some(notes.to_string());
    }
    r.updated_at = chrono::Utc::now();
    Ok(())
}

pub(super) async fn update_asset_redemption_form_data(
    store: &InMemoryStore,
    tenant_id: &str,
    id: &str,
    form_data: &serde_json::Value,
) -> StorageResult<()> {
    let mut guard = store.asset_redemptions.lock();
    let r = guard
        .get_mut(id)
        .filter(|r| r.tenant_id == tenant_id)
        .ok_or(StorageError::NotFound)?;
    r.form_data = form_data.clone();
    r.status = crate::models::AssetRedemptionStatus::InfoSubmitted;
    r.updated_at = chrono::Utc::now();
    Ok(())
}

pub(super) async fn record_token_burn_signature(
    store: &InMemoryStore,
    tenant_id: &str,
    id: &str,
    signature: &str,
) -> StorageResult<()> {
    let mut guard = store.asset_redemptions.lock();
    let r = guard
        .get_mut(id)
        .filter(|r| r.tenant_id == tenant_id)
        .ok_or(StorageError::NotFound)?;
    r.token_burn_signature = Some(signature.to_string());
    r.updated_at = chrono::Utc::now();
    Ok(())
}
