use super::super::inventory_storage::write;
use super::super::inventory_types::{stock_key, StockRecord};
use super::super::STOCK_MODEL;
use super::audit::{self, AdjustmentAudit, AuditIdentity, Movement as AuditMovement};
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::seams::HostSeams;

#[derive(Clone)]
pub(crate) enum Move {
    Set(u64),
    Adjust {
        delta: i64,
        catalog_seed: Option<u64>,
    },
}

pub(super) fn mutate_audited<S: HostSeams>(
    seams: &S,
    resource: &str,
    variant_id: Option<&str>,
    movement: Move,
    identity: &AuditIdentity,
) -> AppResult<AdjustmentAudit> {
    let audit_movement = movement.audit_movement();
    let audit_key = audit::audit_key(&identity.operation_id, resource, variant_id);
    for _ in 0..3 {
        let db = Db::new(seams, crate::ids::DB_ACCESS);
        if let Some(existing) = audit::read(&db, &audit_key)? {
            return replay(existing, identity, resource, variant_id, &audit_movement);
        }
        let (key, stock, condition, before) = prepare(&db, seams, resource, variant_id, &movement)?;
        let record = AdjustmentAudit::new(
            identity,
            resource,
            variant_id,
            audit_movement.clone(),
            before,
            stock.on_hand,
            seams.now_unix_secs(),
        );
        let conditions = [
            condition,
            GuardedCondition::Absent {
                content_model_id: STOCK_MODEL,
                entry_key: audit_key.clone(),
            },
        ];
        let ops = [
            write(STOCK_MODEL, &key, &stock)?,
            write(STOCK_MODEL, &audit_key, &record)?,
        ];
        if matches!(
            db.guarded_batch(&conditions, &ops)?,
            GuardedBatchOutcome::Applied { .. }
        ) {
            return Ok(record);
        }
    }
    Err(AppError::conflict(
        "inventory changed during bounded adjustment attempts",
    ))
}

fn replay(
    existing: AdjustmentAudit,
    identity: &AuditIdentity,
    resource: &str,
    variant_id: Option<&str>,
    movement: &AuditMovement,
) -> AppResult<AdjustmentAudit> {
    if existing.matches_request(identity, resource, variant_id, movement) {
        Ok(existing)
    } else {
        Err(AppError::conflict(
            "inventory operation id was already used with different material",
        ))
    }
}

#[cfg(test)]
pub(super) fn mutate_untracked<S: HostSeams>(
    seams: &S,
    resource: &str,
    variant_id: Option<&str>,
    movement: Move,
) -> AppResult<StockRecord> {
    let key = stock_key(resource, variant_id);
    for _ in 0..3 {
        let db = Db::new(seams, crate::ids::DB_ACCESS);
        let (_, stock, condition, _) = prepare(&db, seams, resource, variant_id, &movement)?;
        if matches!(
            db.guarded_batch(&[condition], &[write(STOCK_MODEL, &key, &stock)?])?,
            GuardedBatchOutcome::Applied { .. }
        ) {
            return Ok(stock);
        }
    }
    Err(AppError::conflict(
        "inventory changed during bounded attempts",
    ))
}

pub(crate) fn prepare<S: HostSeams>(
    db: &Db<'_, S>,
    seams: &S,
    resource: &str,
    variant_id: Option<&str>,
    movement: &Move,
) -> AppResult<(String, StockRecord, GuardedCondition, u64)> {
    let key = stock_key(resource, variant_id);
    let entry = db.read_one(STOCK_MODEL, &key)?;
    let mut stock = match &entry {
        Some(entry) => entry.parse::<StockRecord>()?,
        None => StockRecord {
            schema_version: 1,
            stock_key: key.clone(),
            resource: resource.into(),
            variant_id: variant_id.map(str::to_string),
            on_hand: seed(movement)?,
            reserved: 0,
            sold: 0,
            updated_at: seams.now_unix_secs(),
        },
    };
    validate(&stock, &key, resource, variant_id)?;
    let before = stock.on_hand;
    stock.on_hand = moved(stock.on_hand, movement)?;
    if stock.on_hand < stock.reserved {
        return Err(AppError::conflict(
            "inventory adjustment cannot reduce stock below active reservations",
        ));
    }
    stock.updated_at = seams.now_unix_secs();
    let condition = match &entry {
        Some(entry) => GuardedCondition::Version {
            content_model_id: STOCK_MODEL,
            entry_key: key.clone(),
            expected_version: super::super::fence::required_version(&entry.version)?,
        },
        None => GuardedCondition::Absent {
            content_model_id: STOCK_MODEL,
            entry_key: key.clone(),
        },
    };
    Ok((key, stock, condition, before))
}

fn seed(movement: &Move) -> AppResult<u64> {
    match movement {
        Move::Set(quantity) => Ok(*quantity),
        Move::Adjust {
            catalog_seed: Some(seed),
            ..
        } => Ok(*seed),
        Move::Adjust { .. } => Err(AppError::conflict(
            "uninitialized stock must be set before it can be adjusted",
        )),
    }
}

fn moved(current: u64, movement: &Move) -> AppResult<u64> {
    match movement {
        Move::Set(quantity) => Ok(*quantity),
        Move::Adjust { delta, .. } => u64::try_from(i128::from(current) + i128::from(*delta))
            .map_err(|_| AppError::bad_request("inventory cannot be negative")),
    }
}

impl Move {
    fn audit_movement(&self) -> AuditMovement {
        match self {
            Self::Set(quantity) => AuditMovement::Set {
                quantity: *quantity,
            },
            Self::Adjust { delta, .. } => AuditMovement::Adjust { delta: *delta },
        }
    }
}

pub(super) fn validate(
    stock: &StockRecord,
    key: &str,
    resource: &str,
    variant_id: Option<&str>,
) -> AppResult<()> {
    if stock.schema_version != 1
        || stock.stock_key != key
        || stock.resource != resource
        || stock.variant_id.as_deref() != variant_id
        || stock.available().is_none()
    {
        return Err(AppError::internal("stored checkout stock is invalid"));
    }
    Ok(())
}
