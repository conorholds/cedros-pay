use serde::{de::DeserializeOwned, Serialize};

pub(super) use super::storage_types::{
    CartRecord, GenerationRecord, LaneRegistryRecord, MutationRecord, OperationTombstone, Versioned,
};
use super::{
    CartState, GenerationState, CART_MODEL_ID, GENERATION_MODEL_ID, OPERATION_MODEL_ID,
    TOMBSTONE_MODEL_ID,
};
use crate::db::{BatchOp, Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedCondition, GuardedEntryVersion};
use crate::seams::HostSeams;

pub(super) fn read_generation<S: HostSeams>(
    db: &Db<'_, S>,
    key: &str,
    scope_hash: &str,
    provider: &str,
) -> AppResult<Option<Versioned<GenerationRecord>>> {
    let stored: Option<Versioned<GenerationRecord>> = read(db, GENERATION_MODEL_ID, key)?;
    if let Some(stored) = &stored {
        if stored.value.schema_version != 1
            || stored.value.scope_hash != scope_hash
            || stored.value.provider != provider
            || stored.value.epoch == 0
            || stored.value.epoch > super::validation::MAX_GENERATION_EPOCH
        {
            return Err(corrupt("generation"));
        }
    }
    Ok(stored)
}

pub(super) fn read_cart<S: HostSeams>(
    db: &Db<'_, S>,
    key: &str,
    scope_hash: &str,
    lane_hash: &str,
) -> AppResult<Option<Versioned<CartRecord>>> {
    let stored: Option<Versioned<CartRecord>> = read(db, CART_MODEL_ID, key)?;
    if let Some(stored) = &stored {
        if stored.value.schema_version != 1
            || stored.value.scope_hash != scope_hash
            || stored.value.lane_hash != lane_hash
            || stored.value.version == 0
            || stored.value.version > super::validation::MAX_CART_VERSION
            || stored.value.generation_epoch == 0
            || stored.value.generation_epoch > super::validation::MAX_GENERATION_EPOCH
            || stored.value.lines.len() > super::validation::MAX_LINES
        {
            return Err(corrupt("cart"));
        }
        super::storage_validation::verify(&stored.value)?;
    }
    Ok(stored)
}

pub(super) fn read_mutation<S: HostSeams>(
    db: &Db<'_, S>,
    key: &str,
    scope_hash: &str,
    lane_hash: &str,
    operation_hash: &str,
) -> AppResult<Option<Versioned<MutationRecord>>> {
    let stored: Option<Versioned<MutationRecord>> = read(db, OPERATION_MODEL_ID, key)?;
    if let Some(stored) = &stored {
        if stored.value.schema_version != 1
            || stored.value.scope_hash != scope_hash
            || stored.value.lane_hash != lane_hash
            || stored.value.operation_hash != operation_hash
            || stored.value.fingerprint.is_empty()
            || stored.value.result_version == 0
            || stored.value.result_version > super::validation::MAX_CART_VERSION
        {
            return Err(corrupt("operation"));
        }
    }
    let tombstone: Option<Versioned<OperationTombstone>> = read(db, TOMBSTONE_MODEL_ID, key)?;
    match (&stored, &tombstone) {
        (None, None) => return Ok(None),
        (Some(operation), Some(tombstone))
            if tombstone.value.schema_version == 1
                && tombstone.value.scope_hash == scope_hash
                && tombstone.value.lane_hash == lane_hash
                && tombstone.value.operation_hash == operation_hash
                && tombstone.value.fingerprint == operation.value.fingerprint => {}
        _ => return Err(corrupt("operation/tombstone")),
    }
    Ok(stored)
}

pub(super) fn write<T: Serialize>(model: &'static str, key: &str, value: &T) -> AppResult<BatchOp> {
    let data = serde_json::to_value(value).map_err(|error| {
        AppError::internal("cannot encode versioned cart record").with_internal(error.to_string())
    })?;
    Ok(BatchOp::Write {
        content_model_id: model,
        entry_key: key.to_string(),
        data,
    })
}

pub(super) fn condition<T>(
    model: &'static str,
    key: &str,
    stored: Option<&Versioned<T>>,
) -> GuardedCondition {
    match stored {
        Some(stored) => GuardedCondition::Version {
            content_model_id: model,
            entry_key: key.to_string(),
            expected_version: stored.revision.clone(),
        },
        None => GuardedCondition::Absent {
            content_model_id: model,
            entry_key: key.to_string(),
        },
    }
}

pub(super) fn generation_state(stored: &Versioned<GenerationRecord>) -> GenerationState {
    GenerationState {
        generation: stored.revision.clone(),
        epoch: stored.value.epoch,
    }
}

pub(super) fn cart_state(
    lane: &str,
    generation_epoch: u64,
    stored: Option<&Versioned<CartRecord>>,
) -> CartState {
    match stored {
        Some(stored) => CartState {
            lane: lane.to_string(),
            generation_epoch,
            version: stored.value.version,
            host_revision: Some(stored.revision.clone()),
            lines: stored.value.sorted_lines(),
            total_quantity: stored.value.total_quantity,
            subtotal_cents: stored.value.subtotal_cents,
            currency: stored.value.currency.clone(),
            promo_code: stored.value.promo_code.clone(),
            promo_codes: stored.value.promo_codes.clone(),
        },
        None => CartState {
            lane: lane.to_string(),
            generation_epoch,
            version: 0,
            host_revision: None,
            lines: Vec::new(),
            total_quantity: 0,
            subtotal_cents: 0,
            currency: None,
            promo_code: None,
            promo_codes: Vec::new(),
        },
    }
}

pub(super) fn applied_revision(
    entries: &[GuardedEntryVersion],
    model: &str,
    key: &str,
) -> AppResult<String> {
    entries
        .iter()
        .find(|entry| entry.content_model_id == model && entry.entry_key == key)
        .map(|entry| entry.version.clone())
        .ok_or_else(|| AppError::internal("guarded cart write omitted host revision"))
}

pub(super) fn read<S: HostSeams, T: DeserializeOwned>(
    db: &Db<'_, S>,
    model: &str,
    key: &str,
) -> AppResult<Option<Versioned<T>>> {
    db.read_one(model, key)?.map(parse_versioned).transpose()
}

fn parse_versioned<T: DeserializeOwned>(row: EntryRecord) -> AppResult<Versioned<T>> {
    let revision = row
        .version
        .clone()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::internal("versioned cart record omitted host revision"))?;
    Ok(Versioned {
        value: row.parse()?,
        revision,
    })
}

fn corrupt(record: &str) -> AppError {
    AppError::internal(format!("stored versioned {record} record is invalid"))
}
