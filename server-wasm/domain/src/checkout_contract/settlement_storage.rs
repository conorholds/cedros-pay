use serde_json::to_value;

use crate::db::{BatchOp, Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::seams::HostSeams;

pub(super) fn required<S: HostSeams>(
    db: &Db<'_, S>,
    model: &'static str,
    key: &str,
) -> AppResult<EntryRecord> {
    db.read_one(model, key)?
        .ok_or_else(|| AppError::not_found("settlement record was not found"))
}

pub(super) fn version(model: &'static str, entry: &EntryRecord) -> AppResult<GuardedCondition> {
    Ok(GuardedCondition::Version {
        content_model_id: model,
        entry_key: entry.entry_key.clone(),
        expected_version: super::fence::required_version(&entry.version)?,
    })
}

pub(super) fn write<T: serde::Serialize>(
    model: &'static str,
    key: &str,
    value: &T,
) -> AppResult<BatchOp> {
    Ok(BatchOp::Write {
        content_model_id: model,
        entry_key: key.into(),
        data: to_value(value).map_err(|error| {
            AppError::internal("cannot encode settlement record").with_internal(error.to_string())
        })?,
    })
}
