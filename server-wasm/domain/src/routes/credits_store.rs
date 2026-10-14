//! Version-aware storage helpers for guarded credit mutations.

use serde::de::DeserializeOwned;
use serde::Serialize;

use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::ids;
use crate::seams::HostSeams;

pub(super) struct Versioned<T> {
    pub value: T,
    pub version: String,
}

pub(super) fn read<S: HostSeams, T: DeserializeOwned>(
    db: &Db<'_, S>,
    key: &str,
) -> AppResult<Option<Versioned<T>>> {
    let Some(entry) = db.read_one(ids::MODEL_CREDITS, key)? else {
        return Ok(None);
    };
    let version = entry
        .version
        .clone()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::internal("credit entry is missing its guarded-write version"))?;
    Ok(Some(Versioned {
        value: entry.parse()?,
        version,
    }))
}

pub(super) fn condition<T>(key: &str, stored: Option<&Versioned<T>>) -> GuardedCondition {
    match stored {
        Some(stored) => GuardedCondition::Version {
            content_model_id: ids::MODEL_CREDITS,
            entry_key: key.to_string(),
            expected_version: stored.version.clone(),
        },
        None => GuardedCondition::Absent {
            content_model_id: ids::MODEL_CREDITS,
            entry_key: key.to_string(),
        },
    }
}

pub(super) fn write<T: Serialize>(key: String, value: &T) -> AppResult<BatchOp> {
    let data = serde_json::to_value(value).map_err(|error| {
        AppError::internal("cannot encode credit entry").with_internal(error.to_string())
    })?;
    Ok(BatchOp::Write {
        content_model_id: ids::MODEL_CREDITS,
        entry_key: key,
        data,
    })
}
