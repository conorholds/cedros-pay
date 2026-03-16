//! In-memory implementation for compliance storage (token holders + actions).

use chrono::{DateTime, Utc};

use super::InMemoryStore;
use crate::models::compliance::{ComplianceAction, TokenHolder};
use crate::storage::StorageResult;

pub(super) async fn record_token_holder(
    store: &InMemoryStore,
    holder: TokenHolder,
) -> StorageResult<()> {
    store.token_holders.lock().insert(holder.id.clone(), holder);
    Ok(())
}

pub(super) async fn get_token_holder(
    store: &InMemoryStore,
    tenant_id: &str,
    holder_id: &str,
) -> StorageResult<Option<TokenHolder>> {
    Ok(store
        .token_holders
        .lock()
        .get(holder_id)
        .filter(|h| h.tenant_id == tenant_id)
        .cloned())
}

pub(super) async fn list_token_holders(
    store: &InMemoryStore,
    tenant_id: &str,
    status: Option<&str>,
    wallet: Option<&str>,
    collection_id: Option<&str>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<TokenHolder>> {
    let guard = store.token_holders.lock();
    let mut items: Vec<_> = guard
        .values()
        .filter(|h| h.tenant_id == tenant_id)
        .filter(|h| status.map_or(true, |s| h.status == s))
        .filter(|h| wallet.map_or(true, |w| h.wallet_address == w))
        .filter(|h| collection_id.map_or(true, |c| h.collection_id == c))
        .cloned()
        .collect();
    items.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(items
        .into_iter()
        .skip(offset.max(0) as usize)
        .take(limit.max(0) as usize)
        .collect())
}

pub(super) async fn list_unfrozen_token_holders(
    store: &InMemoryStore,
    tenant_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<TokenHolder>> {
    let guard = store.token_holders.lock();
    let mut items: Vec<_> = guard
        .values()
        .filter(|h| h.tenant_id == tenant_id && h.status == "active")
        .cloned()
        .collect();
    items.sort_by(|a, b| a.created_at.cmp(&b.created_at));
    Ok(items
        .into_iter()
        .skip(offset.max(0) as usize)
        .take(limit.max(0) as usize)
        .collect())
}

pub(super) async fn count_token_holders(
    store: &InMemoryStore,
    tenant_id: &str,
    status: Option<&str>,
) -> StorageResult<i64> {
    let guard = store.token_holders.lock();
    let count = guard
        .values()
        .filter(|h| h.tenant_id == tenant_id)
        .filter(|h| status.map_or(true, |s| h.status == s))
        .count();
    Ok(count as i64)
}

pub(super) async fn update_token_holder_status(
    store: &InMemoryStore,
    tenant_id: &str,
    holder_id: &str,
    status: &str,
    frozen_at: Option<DateTime<Utc>>,
    freeze_tx: Option<&str>,
    thaw_tx: Option<&str>,
) -> StorageResult<()> {
    let mut guard = store.token_holders.lock();
    match guard.get_mut(holder_id) {
        Some(h) if h.tenant_id == tenant_id => {
            h.status = status.to_string();
            if let Some(fa) = frozen_at {
                h.frozen_at = Some(fa);
            }
            if let Some(ft) = freeze_tx {
                h.freeze_tx = Some(ft.to_string());
            }
            if let Some(tt) = thaw_tx {
                h.thaw_tx = Some(tt.to_string());
            }
            Ok(())
        }
        _ => Err(crate::storage::StorageError::NotFound),
    }
}

pub(super) async fn record_compliance_action(
    store: &InMemoryStore,
    action: ComplianceAction,
) -> StorageResult<()> {
    store
        .compliance_actions
        .lock()
        .insert(action.id.clone(), action);
    Ok(())
}

pub(super) async fn list_compliance_actions(
    store: &InMemoryStore,
    tenant_id: &str,
    action_type: Option<&str>,
    wallet: Option<&str>,
    from: Option<DateTime<Utc>>,
    to: Option<DateTime<Utc>>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<ComplianceAction>> {
    let guard = store.compliance_actions.lock();
    let mut items: Vec<_> = guard
        .values()
        .filter(|a| a.tenant_id == tenant_id)
        .filter(|a| action_type.map_or(true, |at| a.action_type == at))
        .filter(|a| wallet.map_or(true, |w| a.wallet_address == w))
        .filter(|a| from.map_or(true, |f| a.created_at >= f))
        .filter(|a| to.map_or(true, |t| a.created_at <= t))
        .cloned()
        .collect();
    items.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(items
        .into_iter()
        .skip(offset.max(0) as usize)
        .take(limit.max(0) as usize)
        .collect())
}
