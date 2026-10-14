use std::collections::{BTreeMap, BTreeSet};

use super::inventory_admin::{
    audit_key, prepare, read_audit, AdjustmentAudit, AuditIdentity, AuditMovement, Move,
};
use super::inventory_storage::write;
#[cfg(test)]
use super::inventory_types::StockState;
use super::STOCK_MODEL;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::seams::HostSeams;

const MAX_VARIANTS: usize = 16;

/// Atomically writes every variant stock value and one immutable audit per value.
pub(crate) fn set_variants_audited<S: HostSeams>(
    seams: &S,
    resource: &str,
    values: &[(String, u64)],
    identity: &AuditIdentity,
) -> AppResult<BTreeMap<String, AdjustmentAudit>> {
    validate_request(values)?;
    for _ in 0..3 {
        let db = Db::new(seams, crate::ids::DB_ACCESS);
        if let Some(replay) = replay(&db, resource, values, identity)? {
            return Ok(replay);
        }
        let mut prepared = values
            .iter()
            .map(|(variant, quantity)| {
                let movement = Move::Set(*quantity);
                let (key, stock, condition, before) =
                    prepare(&db, seams, resource, Some(variant), &movement)?;
                let audit_key = audit_key(&identity.operation_id, resource, Some(variant));
                let audit = AdjustmentAudit::new(
                    identity,
                    resource,
                    Some(variant),
                    AuditMovement::Set {
                        quantity: *quantity,
                    },
                    before,
                    stock.on_hand,
                    seams.now_unix_secs(),
                );
                Ok((variant.clone(), key, stock, condition, audit_key, audit))
            })
            .collect::<AppResult<Vec<_>>>()?;
        prepared.sort_by(|left, right| left.0.cmp(&right.0));
        let mut conditions = Vec::with_capacity(prepared.len() * 2);
        let mut ops = Vec::with_capacity(prepared.len() * 2);
        for (_, key, stock, condition, audit_key, audit) in &prepared {
            conditions.push(condition.clone());
            conditions.push(GuardedCondition::Absent {
                content_model_id: STOCK_MODEL,
                entry_key: audit_key.clone(),
            });
            ops.push(write(STOCK_MODEL, key, stock)?);
            ops.push(write(STOCK_MODEL, audit_key, audit)?);
        }
        if matches!(
            db.guarded_batch(&conditions, &ops)?,
            GuardedBatchOutcome::Applied { .. }
        ) {
            return Ok(prepared
                .into_iter()
                .map(|(variant, _, _, _, _, audit)| (variant, audit))
                .collect());
        }
    }
    Err(AppError::conflict(
        "variant inventory changed during bounded adjustment attempts",
    ))
}

fn replay<S: HostSeams>(
    db: &Db<'_, S>,
    resource: &str,
    values: &[(String, u64)],
    identity: &AuditIdentity,
) -> AppResult<Option<BTreeMap<String, AdjustmentAudit>>> {
    let mut found = BTreeMap::new();
    for (variant, quantity) in values {
        let key = audit_key(&identity.operation_id, resource, Some(variant));
        if let Some(record) = read_audit(db, &key)? {
            let movement = AuditMovement::Set {
                quantity: *quantity,
            };
            if !record.matches_request(identity, resource, Some(variant), &movement) {
                return Err(AppError::conflict(
                    "inventory operation id was already used with different material",
                ));
            }
            found.insert(variant.clone(), record);
        }
    }
    if found.is_empty() {
        Ok(None)
    } else if found.len() == values.len() {
        Ok(Some(found))
    } else {
        Err(AppError::internal(
            "stored bulk inventory audit is incomplete",
        ))
    }
}

fn validate_request(values: &[(String, u64)]) -> AppResult<()> {
    if values.is_empty() || values.len() > MAX_VARIANTS {
        return Err(AppError::unprocessable(
            "bulk variant inventory requires 1 to 16 unique variants",
        ));
    }
    let unique = values
        .iter()
        .map(|(variant, _)| variant)
        .collect::<BTreeSet<_>>();
    if unique.len() != values.len() {
        return Err(AppError::unprocessable(
            "bulk variant inventory contains duplicate variants",
        ));
    }
    Ok(())
}

#[cfg(test)]
pub(crate) fn set_variants<S: HostSeams>(
    seams: &S,
    resource: &str,
    values: &[(String, u64)],
) -> AppResult<BTreeMap<String, StockState>> {
    let identity = AuditIdentity {
        operation_id: format!("test-bulk-{}", seams.now_unix_secs()),
        actor: super::inventory_admin::ActorClass::SystemAdmin,
        reason: Some("test fixture".into()),
    };
    Ok(set_variants_audited(seams, resource, values, &identity)?
        .into_iter()
        .map(|(variant, audit)| {
            (
                variant,
                StockState {
                    on_hand: audit.quantity_after,
                    reserved: 0,
                    sold: 0,
                    available: audit.quantity_after,
                    updated_at: seams.now_unix_secs(),
                    revision: None,
                },
            )
        })
        .collect())
}
