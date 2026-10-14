use super::inventory_types::{HoldRecord, InventoryReservationContext, StockRecord};
use super::{INVENTORY_HOLD_MODEL, STOCK_MODEL};
use crate::db::{Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::seams::HostSeams;

pub(super) fn hold<S: HostSeams>(
    db: &Db<'_, S>,
    key: &str,
) -> AppResult<(EntryRecord, HoldRecord)> {
    let entry = db
        .read_one(INVENTORY_HOLD_MODEL, key)?
        .ok_or_else(|| AppError::conflict("inventory hold was not found"))?;
    let hold = entry.parse()?;
    Ok((entry, hold))
}

pub(super) fn stock<S: HostSeams>(
    db: &Db<'_, S>,
    key: &str,
) -> AppResult<(EntryRecord, StockRecord)> {
    let entry = db
        .read_one(STOCK_MODEL, key)?
        .ok_or_else(|| AppError::internal("inventory hold stock is missing"))?;
    let stock = entry.parse()?;
    Ok((entry, stock))
}

pub(super) fn validate_hold(
    hold: &HoldRecord,
    provider_scope: &str,
    quote_operation_id: &str,
    reservation: &InventoryReservationContext,
) -> AppResult<()> {
    if hold.schema_version != 1
        || hold.provider_scope != provider_scope
        || hold.quote_operation_id != quote_operation_id
        || hold.lines != reservation.lines
    {
        return Err(AppError::internal("stored inventory hold is invalid"));
    }
    Ok(())
}

pub(super) fn version_condition(
    model: &'static str,
    entry: &EntryRecord,
) -> AppResult<GuardedCondition> {
    Ok(GuardedCondition::Version {
        content_model_id: model,
        entry_key: entry.entry_key.clone(),
        expected_version: super::fence::required_version(&entry.version)?,
    })
}
