//! Reconciles caller-owned companion mutations after an exact credit transaction replay.

use std::collections::BTreeSet;

use crate::db::{BatchOp, Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::seams::HostSeams;

const MAX_RECONCILE_ATTEMPTS: usize = 3;

pub(super) fn validate_extra_guards(
    conditions: &[GuardedCondition],
    ops: &[BatchOp],
) -> AppResult<()> {
    let mut guard_targets = BTreeSet::new();
    for condition in conditions {
        if !guard_targets.insert(condition.target()) {
            return Err(AppError::bad_request(
                "duplicate credit-move companion guard target",
            ));
        }
    }
    let mut op_targets = BTreeSet::new();
    for op in ops {
        let Some(target) = op.target() else {
            return Err(AppError::bad_request(
                "credit-move extras cannot change database write policy",
            ));
        };
        if !op_targets.insert(target) {
            return Err(AppError::bad_request(
                "duplicate credit-move companion operation target",
            ));
        }
        if !guard_targets.contains(&target) {
            return Err(AppError::bad_request(
                "every extra credit-move operation requires a matching guard",
            ));
        }
    }
    if guard_targets != op_targets {
        return Err(AppError::bad_request(
            "every extra credit-move guard requires a matching operation",
        ));
    }
    Ok(())
}

pub(super) fn reconcile<S: HostSeams>(
    db: &Db<'_, S>,
    original_conditions: &[GuardedCondition],
    original_ops: &[BatchOp],
) -> AppResult<()> {
    if original_ops.is_empty() {
        return Ok(());
    }
    for _ in 0..MAX_RECONCILE_ATTEMPTS {
        let (conditions, ops) = plan(db, original_conditions, original_ops)?;
        if ops.is_empty() {
            return Ok(());
        }
        if matches!(
            db.guarded_batch(&conditions, &ops)?,
            GuardedBatchOutcome::Applied { .. }
        ) {
            return Ok(());
        }
        // A competing writer won after our reads. Re-read every target and use
        // only its original caller-supplied guard on the next bounded attempt.
    }
    Err(AppError::conflict(
        "credit move companions changed while reconciling replay",
    ))
}

fn plan<S: HostSeams>(
    db: &Db<'_, S>,
    conditions: &[GuardedCondition],
    ops: &[BatchOp],
) -> AppResult<(Vec<GuardedCondition>, Vec<BatchOp>)> {
    let mut pending_conditions = Vec::new();
    let mut pending_ops = Vec::new();
    for op in ops {
        let target = op.target().ok_or_else(|| {
            AppError::internal("validated credit companion operation lost its target")
        })?;
        let condition = conditions
            .iter()
            .find(|condition| condition.target() == target)
            .ok_or_else(|| AppError::internal("validated credit companion guard is missing"))?;
        let current = db.read_one(target.0, target.1)?;
        if completed(&current, op) {
            continue;
        }
        if !guard_still_valid(&current, condition) {
            return Err(AppError::conflict(
                "credit move replay companion differs from the requested state",
            ));
        }
        pending_conditions.push(condition.clone());
        pending_ops.push(op.clone());
    }
    Ok((pending_conditions, pending_ops))
}

fn completed(current: &Option<EntryRecord>, op: &BatchOp) -> bool {
    match (current, op) {
        (
            Some(row),
            BatchOp::Write {
                content_model_id,
                data,
                ..
            },
        ) => {
            row.payload == *data
                || (*content_model_id == crate::ids::MODEL_WEBHOOK_OUTBOX
                    && row
                        .payload
                        .get("recordType")
                        .and_then(serde_json::Value::as_str)
                        == Some(crate::durable_effects::RECORD_TYPE)
                    && data.get("recordType").and_then(serde_json::Value::as_str)
                        == Some(crate::durable_effects::RECORD_TYPE)
                    && row.payload.get("sourceFingerprint") == data.get("sourceFingerprint")
                    && effect_targets(&row.payload) == effect_targets(data))
        }
        // Delete operations describe a desired absent end state. Once absent,
        // replay has nothing left to mutate and cannot safely prove who deleted it.
        (None, BatchOp::Delete { .. }) => true,
        _ => false,
    }
}

fn effect_targets(value: &serde_json::Value) -> Option<Vec<(&str, &serde_json::Value)>> {
    value
        .get("targets")?
        .as_array()?
        .iter()
        .map(|target| Some((target.get("id")?.as_str()?, target.get("action")?)))
        .collect()
}

fn guard_still_valid(current: &Option<EntryRecord>, condition: &GuardedCondition) -> bool {
    match condition {
        GuardedCondition::Absent { .. } => current.is_none(),
        GuardedCondition::Version {
            expected_version, ..
        } => current.as_ref().and_then(|row| row.version.as_deref()) == Some(expected_version),
    }
}

#[cfg(test)]
mod tests {
    use super::effect_targets;
    use serde_json::json;

    #[test]
    fn malformed_effect_target_invalidates_the_entire_projection() {
        let malformed = json!({
            "targets": [
                {"id": "valid", "action": {"kind": "event"}},
                {"id": "missing-action"}
            ]
        });

        assert!(effect_targets(&malformed).is_none());
    }
}
