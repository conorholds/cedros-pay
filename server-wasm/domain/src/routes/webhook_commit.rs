//! Atomic Stripe event identity and state mutation boundary.

use std::collections::BTreeMap;

use serde_json::{Map, Value};
use sha2::{Digest, Sha256};

use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::models::ProcessedEvent;
use crate::seams::HostSeams;
use crate::time;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum CommitResult {
    Applied,
    Duplicate,
}

pub(super) fn fingerprint(event: &Value) -> AppResult<String> {
    let canonical = canonicalize(event);
    let bytes = serde_json::to_vec(&canonical).map_err(|error| {
        AppError::internal("cannot canonicalize Stripe event").with_internal(error.to_string())
    })?;
    Ok(hex::encode(Sha256::digest(bytes)))
}

pub(super) fn preflight<S: HostSeams>(
    db: &Db<'_, S>,
    event_id: &str,
    fingerprint: &str,
) -> AppResult<bool> {
    let Some(row) = db.read_one(ids::MODEL_WEBHOOK_OUTBOX, &event_key(event_id))? else {
        return Ok(false);
    };
    let marker: ProcessedEvent = row.parse()?;
    validate_existing(&marker, event_id, fingerprint)?;
    if !marker.effects_complete {
        // A legacy receipt cannot prove whether its old best-effort effects
        // were delivered. Re-emitting them would trade a possible omission for
        // an unbounded duplicate, so acknowledge the authenticated replay.
        return Ok(true);
    }
    match marker.effect_id.as_deref() {
        Some(effect_id) => {
            let snapshot = marker
                .effect_record
                .as_ref()
                .ok_or_else(|| AppError::internal("Stripe event effect snapshot is missing"))?;
            crate::durable_effects::restore(db, effect_id, snapshot)?;
            crate::durable_effects::dispatch_effect_best_effort(db.host(), effect_id);
            Ok(true)
        }
        None => Ok(true),
    }
}

pub(super) fn commit<S: HostSeams>(
    db: &Db<'_, S>,
    event_id: &str,
    fingerprint: &str,
    now: i64,
    conditions: Vec<GuardedCondition>,
    ops: Vec<BatchOp>,
) -> AppResult<CommitResult> {
    commit_with_effects(db, event_id, fingerprint, now, conditions, ops, Vec::new())
}

pub(super) fn commit_with_effects<S: HostSeams>(
    db: &Db<'_, S>,
    event_id: &str,
    fingerprint: &str,
    now: i64,
    mut conditions: Vec<GuardedCondition>,
    mut ops: Vec<BatchOp>,
    actions: Vec<crate::durable_effects::Action>,
) -> AppResult<CommitResult> {
    let key = event_key(event_id);
    let effect = crate::durable_effects::plan("stripe-webhook", event_id, actions, now)?;
    let effect_id = effect.as_ref().map(|effect| effect.effect_id.clone());
    let effect_record = effect
        .as_ref()
        .map(crate::durable_effects::snapshot)
        .transpose()?;
    conditions.push(GuardedCondition::Absent {
        content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
        entry_key: key.clone(),
    });
    ops.push(BatchOp::Write {
        content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
        entry_key: key,
        data: serde_json::to_value(marker(
            event_id,
            fingerprint,
            effect_id.clone(),
            effect_record,
            now,
        ))
        .map_err(|error| {
            AppError::internal("cannot encode Stripe event marker").with_internal(error.to_string())
        })?,
    });
    if let Some(effect) = effect.as_ref() {
        conditions.push(effect.condition.clone());
        ops.push(effect.op.clone());
    }
    match db.guarded_batch(&conditions, &ops)? {
        GuardedBatchOutcome::Applied { .. } => {
            if let Some(effect_id) = effect_id {
                crate::durable_effects::dispatch_effect_best_effort(db.host(), &effect_id);
            }
            Ok(CommitResult::Applied)
        }
        GuardedBatchOutcome::Conflict { .. } => {
            resolve_conflict(db, event_id, fingerprint, effect.as_ref())
        }
    }
}

pub(super) fn version_condition(
    model: &'static str,
    key: String,
    version: Option<String>,
) -> AppResult<GuardedCondition> {
    let expected_version = version
        .ok_or_else(|| AppError::internal("database entry omitted required concurrency version"))?;
    Ok(GuardedCondition::Version {
        content_model_id: model,
        entry_key: key,
        expected_version,
    })
}

fn resolve_conflict<S: HostSeams>(
    db: &Db<'_, S>,
    event_id: &str,
    fingerprint: &str,
    planned_effect: Option<&crate::durable_effects::Plan>,
) -> AppResult<CommitResult> {
    if let Some(row) = db.read_one(ids::MODEL_WEBHOOK_OUTBOX, &event_key(event_id))? {
        let marker: ProcessedEvent = row.parse()?;
        validate_existing(&marker, event_id, fingerprint)?;
        if marker.effects_complete {
            match (marker.effect_id.as_deref(), planned_effect) {
                (Some(recorded), Some(planned)) if recorded == planned.effect_id => {
                    let snapshot = marker.effect_record.as_ref().ok_or_else(|| {
                        AppError::internal("Stripe event effect snapshot is missing")
                    })?;
                    crate::durable_effects::restore(db, recorded, snapshot)?;
                    crate::durable_effects::dispatch_effect_best_effort(db.host(), recorded);
                }
                (None, None) => {}
                _ => {
                    return Err(AppError::conflict(
                        "Stripe event effect plan differs from its durable marker",
                    ));
                }
            }
        }
        return Ok(CommitResult::Duplicate);
    }
    Err(AppError::conflict(
        "Stripe event conflicted with newer payment state; retry with current state",
    ))
}

fn validate_existing(marker: &ProcessedEvent, event_id: &str, fingerprint: &str) -> AppResult<()> {
    if marker.event_id != event_id || marker.fingerprint.as_deref() != Some(fingerprint) {
        return Err(AppError::conflict(
            "Stripe event id was previously used with different content",
        ));
    }
    if !matches!(
        (
            marker.effects_complete,
            marker.effect_id.is_some(),
            marker.effect_record.is_some(),
        ),
        (false, false, false) | (true, false, false) | (true, true, true)
    ) {
        return Err(AppError::internal(
            "Stripe event effect marker is inconsistent",
        ));
    }
    Ok(())
}

fn marker(
    event_id: &str,
    fingerprint: &str,
    effect_id: Option<String>,
    effect_record: Option<Value>,
    now: i64,
) -> ProcessedEvent {
    ProcessedEvent {
        event_id: event_id.to_string(),
        processed_at: time::iso8601(now),
        fingerprint: Some(fingerprint.to_string()),
        effect_id,
        effect_record,
        effects_complete: true,
    }
}

fn event_key(event_id: &str) -> String {
    format!("evt:{event_id}")
}

fn canonicalize(value: &Value) -> Value {
    match value {
        Value::Object(object) => {
            let sorted = object
                .iter()
                .map(|(key, value)| (key.clone(), canonicalize(value)))
                .collect::<BTreeMap<_, _>>();
            let mut object = Map::new();
            object.extend(sorted);
            Value::Object(object)
        }
        Value::Array(values) => Value::Array(values.iter().map(canonicalize).collect()),
        other => other.clone(),
    }
}
