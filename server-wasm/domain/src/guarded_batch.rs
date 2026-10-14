//! Typed boundary for Cedros Data's schema-v1 `database.compare-and-set` contract.
//!
//! The named import and required `cedros-data:extension-storage-cas-v1`
//! capability make older hosts fail closed before a guarded mutation runs.

use std::collections::BTreeSet;

use serde::Serialize;
use serde_json::Value;

use crate::db_ops::BatchOp;
use crate::error::AppError;
use crate::seams::HostSeams;

pub use crate::guarded_batch_types::{
    GuardPredicate, GuardedBatchOutcome, GuardedCondition, GuardedConflict, GuardedEntryVersion,
};

const SCHEMA_VERSION: u8 = 1;
const MAX_CONDITIONS: usize = 32;
const MAX_OPS: usize = 128;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GuardedRequest {
    schema_version: u8,
    conditions: Vec<Value>,
    ops: Vec<Value>,
}

pub(crate) fn execute<S: HostSeams>(
    seams: &S,
    access_id: &str,
    conditions: &[GuardedCondition],
    ops: &[BatchOp],
) -> Result<GuardedBatchOutcome, AppError> {
    if ops.iter().any(|op| op.target().is_none()) {
        return Err(AppError::bad_request(
            "database compare-and-set accepts only write and delete operations",
        ));
    }
    execute_with(seams, access_id, conditions, ops, false)
}

/// Compatibility boundary for Pay's already-published guarded-policy enrollment.
/// No commerce mutation may use this legacy parser.
pub(crate) fn execute_host_policy<S: HostSeams>(
    seams: &S,
    access_id: &str,
    conditions: &[GuardedCondition],
    ops: &[BatchOp],
) -> Result<GuardedBatchOutcome, AppError> {
    let marker_guard = matches!(conditions, [condition]
        if condition.target()
            == (crate::guarded_policy::CONTROL_MODEL, crate::guarded_policy::MARKER_KEY));
    let marker_writes = ops
        .iter()
        .filter(|op| {
            matches!(op, BatchOp::Write { content_model_id, entry_key, .. }
            if *content_model_id == crate::guarded_policy::CONTROL_MODEL
                && entry_key == crate::guarded_policy::MARKER_KEY)
        })
        .count();
    let policy_ops_only = ops.iter().all(|op| match op {
        BatchOp::Write {
            content_model_id,
            entry_key,
            ..
        } => {
            *content_model_id == crate::guarded_policy::CONTROL_MODEL
                && entry_key == crate::guarded_policy::MARKER_KEY
        }
        BatchOp::SetWritePolicy {
            content_model_id, ..
        } => crate::guarded_policy::GUARDED_MODELS.contains(content_model_id),
        BatchOp::Delete { .. } => false,
    });
    if !marker_guard || marker_writes != 1 || !policy_ops_only {
        return Err(AppError::internal(
            "legacy database batch is reserved for guarded-policy enrollment",
        ));
    }
    execute_with(seams, access_id, conditions, ops, true)
}

fn execute_with<S: HostSeams>(
    seams: &S,
    access_id: &str,
    conditions: &[GuardedCondition],
    ops: &[BatchOp],
    legacy_host_policy: bool,
) -> Result<GuardedBatchOutcome, AppError> {
    validate(conditions, ops)?;
    let request = GuardedRequest {
        schema_version: SCHEMA_VERSION,
        conditions: conditions.iter().map(condition_json).collect(),
        ops: ops.iter().map(BatchOp::to_json).collect(),
    };
    let payload = serde_json::to_string(&request).map_err(|error| {
        AppError::internal("cannot encode guarded database batch").with_internal(error.to_string())
    })?;
    let raw = if legacy_host_policy {
        seams.db_batch(access_id, &payload)?
    } else {
        seams.db_compare_and_set(access_id, &payload)?
    };
    let outcome = serde_json::from_str(&raw).map_err(|error| {
        AppError::internal("database returned an unexpected guarded batch shape")
            .with_internal(error.to_string())
    })?;
    validate_outcome(outcome, conditions, ops)
}

fn validate_outcome(
    outcome: GuardedBatchOutcome,
    conditions: &[GuardedCondition],
    ops: &[BatchOp],
) -> Result<GuardedBatchOutcome, AppError> {
    let invalid = || AppError::internal("database returned an invalid guarded batch outcome");
    match &outcome {
        GuardedBatchOutcome::Applied { applied, entries } => {
            if *applied != ops.len() as i64 {
                return Err(invalid());
            }
            let write_targets = ops.iter().filter_map(|op| match op {
                BatchOp::Write { .. } => op.target(),
                BatchOp::Delete { .. } | BatchOp::SetWritePolicy { .. } => None,
            });
            let expected = write_targets.collect::<BTreeSet<_>>();
            let actual = entries
                .iter()
                .map(|entry| (entry.content_model_id.as_str(), entry.entry_key.as_str()))
                .collect::<BTreeSet<_>>();
            let versions = entries
                .iter()
                .map(|entry| entry.version.as_str())
                .collect::<BTreeSet<_>>();
            if entries.iter().any(|entry| entry.version.is_empty())
                || actual.len() != entries.len()
                || versions.len() != entries.len()
                || actual != expected
            {
                return Err(invalid());
            }
        }
        GuardedBatchOutcome::Conflict { conflict } => {
            let Some(condition) = conditions.get(conflict.condition_index) else {
                return Err(invalid());
            };
            let (model, key) = condition.target();
            if conflict.content_model_id != model
                || conflict.entry_key != key
                || conflict.predicate != condition.predicate()
            {
                return Err(invalid());
            }
        }
    }
    Ok(outcome)
}

fn validate(conditions: &[GuardedCondition], ops: &[BatchOp]) -> Result<(), AppError> {
    if conditions.is_empty() || conditions.len() > MAX_CONDITIONS {
        return Err(AppError::bad_request(
            "guarded batch requires 1 to 32 conditions",
        ));
    }
    if ops.is_empty() || ops.len() > MAX_OPS {
        return Err(AppError::bad_request(
            "guarded batch requires 1 to 128 operations",
        ));
    }
    ensure_unique(conditions.iter().map(GuardedCondition::target), "condition")?;
    ensure_unique(ops.iter().filter_map(BatchOp::target), "operation")?;
    for condition in conditions {
        let (model, key) = condition.target();
        validate_target(model, key)?;
        if matches!(condition, GuardedCondition::Version { expected_version, .. } if expected_version.is_empty())
        {
            return Err(AppError::bad_request("expected version cannot be empty"));
        }
    }
    for op in ops {
        if let Some((model, key)) = op.target() {
            validate_target(model, key)?;
        } else if matches!(
            op,
            BatchOp::SetWritePolicy {
                content_model_id: "",
                ..
            }
        ) {
            return Err(AppError::bad_request(
                "write-policy content model cannot be empty",
            ));
        }
    }
    Ok(())
}

fn ensure_unique<'a>(
    targets: impl Iterator<Item = (&'a str, &'a str)>,
    label: &str,
) -> Result<(), AppError> {
    let mut seen = BTreeSet::new();
    for target in targets {
        if !seen.insert(target) {
            return Err(AppError::bad_request(format!(
                "duplicate guarded batch {label} target"
            )));
        }
    }
    Ok(())
}

fn validate_target(model: &str, key: &str) -> Result<(), AppError> {
    if model.is_empty() || key.is_empty() {
        return Err(AppError::bad_request(
            "guarded batch targets cannot be empty",
        ));
    }
    Ok(())
}

fn condition_json(condition: &GuardedCondition) -> Value {
    let (model, key) = condition.target();
    let mut value = serde_json::json!({
        "contentModelId": model,
        "entryKey": key,
        "predicate": match condition {
            GuardedCondition::Absent { .. } => "absent",
            GuardedCondition::Version { .. } => "version",
        },
    });
    match condition {
        GuardedCondition::Version {
            expected_version, ..
        } => {
            value["expectedVersion"] = Value::String(expected_version.clone());
        }
        GuardedCondition::Absent { .. } => {}
    }
    value
}

#[cfg(test)]
#[path = "guarded_batch_tests.rs"]
mod tests;
