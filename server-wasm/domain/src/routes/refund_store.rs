//! Version-aware ledger helpers for guarded refund transitions.

use serde::de::DeserializeOwned;
use serde::Serialize;

use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::guarded_batch::GuardedEntryVersion;
use crate::ids;
use crate::seams::HostSeams;

pub(crate) struct Versioned<T> {
    pub(crate) value: T,
    pub(crate) version: String,
}

pub(crate) fn read<S: HostSeams, T: DeserializeOwned>(
    db: &Db<'_, S>,
    key: &str,
) -> AppResult<Option<Versioned<T>>> {
    let Some(entry) = db.read_one(ids::MODEL_LEDGER, key)? else {
        return Ok(None);
    };
    let version = entry
        .version
        .clone()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::internal("ledger entry is missing its guarded-write version"))?;
    Ok(Some(Versioned {
        value: entry.parse()?,
        version,
    }))
}

pub(crate) fn version_condition(key: &str, version: &str) -> GuardedCondition {
    GuardedCondition::Version {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: key.to_string(),
        expected_version: version.to_string(),
    }
}

pub(crate) fn absent_condition(key: &str) -> GuardedCondition {
    GuardedCondition::Absent {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: key.to_string(),
    }
}

pub(crate) fn write<T: Serialize>(key: &str, value: &T) -> AppResult<BatchOp> {
    let data = serde_json::to_value(value).map_err(|error| {
        AppError::internal("cannot encode refund ledger state").with_internal(error.to_string())
    })?;
    Ok(BatchOp::Write {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: key.to_string(),
        data,
    })
}

pub(crate) fn written_version(entries: &[GuardedEntryVersion], key: &str) -> AppResult<String> {
    entries
        .iter()
        .find(|entry| entry.content_model_id == ids::MODEL_LEDGER && entry.entry_key == key)
        .map(|entry| entry.version.clone())
        .ok_or_else(|| AppError::internal("guarded refund write omitted its new version"))
}
