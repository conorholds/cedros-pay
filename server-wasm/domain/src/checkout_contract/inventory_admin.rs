use serde_json::Value;

use super::inventory_types::{stock_key, StockRecord, StockState};
use super::STOCK_MODEL;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::seams::HostSeams;

#[path = "inventory_admin_audit.rs"]
mod audit;
pub(crate) use audit::{
    audit_key, history, read as read_audit, ActorClass, AdjustmentAudit, AuditIdentity,
    Movement as AuditMovement,
};
#[path = "inventory_admin_mutation.rs"]
mod mutation;
pub(super) use mutation::{prepare, Move};

/// Applies a single admin inventory set and its immutable audit in one transaction.
pub(crate) fn set_audited<S: HostSeams>(
    seams: &S,
    resource: &str,
    variant_id: Option<&str>,
    quantity: u64,
    identity: &AuditIdentity,
) -> AppResult<AdjustmentAudit> {
    mutation::mutate_audited(seams, resource, variant_id, Move::Set(quantity), identity)
}

/// Applies a delta only to initialized checkout stock and records it atomically.
pub(crate) fn adjust_audited<S: HostSeams>(
    seams: &S,
    resource: &str,
    variant_id: Option<&str>,
    delta: i64,
    identity: &AuditIdentity,
) -> AppResult<AdjustmentAudit> {
    mutation::mutate_audited(
        seams,
        resource,
        variant_id,
        Move::Adjust {
            delta,
            catalog_seed: None,
        },
        identity,
    )
}

#[cfg(test)]
pub(crate) fn set<S: HostSeams>(
    seams: &S,
    resource: &str,
    variant_id: Option<&str>,
    quantity: u64,
) -> AppResult<StockState> {
    mutation::mutate_untracked(seams, resource, variant_id, Move::Set(quantity))
        .map(|stock| stock.state(None))
}

#[cfg(test)]
pub(crate) fn adjust<S: HostSeams>(
    seams: &S,
    resource: &str,
    variant_id: Option<&str>,
    delta: i64,
    catalog_seed: Option<u64>,
) -> AppResult<StockState> {
    mutation::mutate_untracked(
        seams,
        resource,
        variant_id,
        Move::Adjust {
            delta,
            catalog_seed,
        },
    )
    .map(|stock| stock.state(None))
}

pub(super) fn state_from_entry(
    entry: &crate::db::EntryRecord,
    resource: &str,
    variant_id: Option<&str>,
) -> AppResult<StockState> {
    let stock = entry.parse::<StockRecord>()?;
    mutation::validate(
        &stock,
        &stock_key(resource, variant_id),
        resource,
        variant_id,
    )?;
    Ok(stock.state(entry.version.clone()))
}

/// Exact authoritative availability plus the host fence read with it.
///
/// An absent aggregate is returned with an `absent` fence so callers can bind
/// an explicit untracked decision to the same transaction as their write.
pub(crate) struct StockFence {
    pub available: Option<u64>,
    pub condition: GuardedCondition,
}

pub(crate) fn read_fence<S: HostSeams>(
    db: &Db<'_, S>,
    resource: &str,
    variant_id: Option<&str>,
) -> AppResult<StockFence> {
    let key = stock_key(resource, variant_id);
    let Some(entry) = db.read_one(STOCK_MODEL, &key)? else {
        return Ok(StockFence {
            available: None,
            condition: GuardedCondition::Absent {
                content_model_id: STOCK_MODEL,
                entry_key: key,
            },
        });
    };
    let stock = entry.parse::<StockRecord>()?;
    mutation::validate(&stock, &key, resource, variant_id)?;
    let expected_version = entry
        .version
        .filter(|version| !version.is_empty())
        .ok_or_else(|| AppError::internal("checkout stock omitted its host revision"))?;
    Ok(StockFence {
        available: stock.available(),
        condition: GuardedCondition::Version {
            content_model_id: STOCK_MODEL,
            entry_key: key,
            expected_version,
        },
    })
}

#[cfg(test)]
pub(crate) fn stock_key_for_test(resource: &str, variant_id: Option<&str>) -> String {
    stock_key(resource, variant_id)
}

pub(crate) fn strip_catalog_inventory(value: &mut Value) {
    super::inventory_admin_projection::strip(value);
}

pub(crate) fn ensure_deletable<S: HostSeams>(seams: &S, resource: &str) -> AppResult<()> {
    let query = crate::db::Query::new()
        .filter(crate::db::Filter::new(
            "resource",
            crate::db::Op::Eq,
            resource,
        ))
        .limit(1);
    if Db::new(seams, crate::ids::DB_ACCESS)
        .read(STOCK_MODEL, &query)?
        .is_empty()
    {
        Ok(())
    } else {
        Err(AppError::conflict(
            "product with authoritative stock cannot be deleted",
        ))
    }
}
