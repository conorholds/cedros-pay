//! Durable, lease-fenced delivery for post-commit domain effects.
//!
//! Financial transitions append one record from this module in the same guarded
//! batch as their authoritative state. Delivery is at-least-once; every target
//! carries a deterministic id so downstream event/CRM consumers can deduplicate
//! a retry after a worker crash between egress and the checkpoint CAS.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::seams::HostSeams;

#[path = "durable_effects_delivery.rs"]
mod delivery;
pub(crate) use delivery::{dispatch_best_effort, dispatch_effect_best_effort, run};

pub(crate) const RECORD_TYPE: &str = "durableDomainEffect";
const STATUS_PENDING: &str = "domain_effect_pending";
const STATUS_LEASED: &str = "domain_effect_leased";
const STATUS_DELIVERED: &str = "domain_effect_delivered";
const STATUS_FAILED: &str = "domain_effect_failed";
const LEASE_SECONDS: i64 = 300;
const BASE_BACKOFF_SECONDS: i64 = 15;
const MAX_BACKOFF_SECONDS: i64 = 3_600;
const MAX_ACTIONS: usize = 32;

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub(crate) enum Action {
    Event {
        event_id: String,
        label: String,
        metadata: Value,
    },
    Crm {
        event_type: String,
        payload: Value,
    },
    TagAssign {
        profile_id: String,
        tag_slug: String,
        payload: Value,
    },
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
enum TargetState {
    Pending,
    Delivered,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Target {
    id: String,
    state: TargetState,
    action: Action,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Record {
    schema_version: u8,
    record_type: String,
    effect_id: String,
    source_fingerprint: String,
    targets: Vec<Target>,
    status: String,
    attempts: u32,
    next_attempt_at: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    last_error: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    lease_owner: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    lease_expires_at: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Clone)]
pub(crate) struct Plan {
    pub effect_id: String,
    pub condition: GuardedCondition,
    pub op: BatchOp,
}

pub(crate) fn plan(
    source_kind: &str,
    source_id: &str,
    actions: Vec<Action>,
    now: i64,
) -> AppResult<Option<Plan>> {
    if actions.is_empty() {
        return Ok(None);
    }
    if actions.len() > MAX_ACTIONS {
        return Err(AppError::unprocessable(
            "durable effect exceeds the action limit",
        ));
    }
    validate_identity(source_kind, "effect source kind")?;
    validate_identity(source_id, "effect source id")?;
    let source_fingerprint = digest(&[source_kind, source_id]);
    let effect_id = format!("domain-effect:{source_fingerprint}");
    let targets = actions
        .into_iter()
        .enumerate()
        .map(|(index, mut action)| {
            canonicalize_action_time(&mut action, now);
            Ok(Target {
                id: target_id(&source_fingerprint, index, &action)?,
                state: TargetState::Pending,
                action,
            })
        })
        .collect::<AppResult<Vec<_>>>()?;
    let timestamp = crate::time::iso8601(now);
    let record = Record {
        schema_version: 1,
        record_type: RECORD_TYPE.into(),
        effect_id: effect_id.clone(),
        source_fingerprint,
        targets,
        status: STATUS_PENDING.into(),
        attempts: 0,
        next_attempt_at: timestamp.clone(),
        last_error: None,
        lease_owner: None,
        lease_expires_at: None,
        created_at: timestamp.clone(),
        updated_at: timestamp,
    };
    validate(&record)?;
    Ok(Some(Plan {
        effect_id: effect_id.clone(),
        condition: GuardedCondition::Absent {
            content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
            entry_key: effect_id.clone(),
        },
        op: write(&effect_id, &record)?,
    }))
}

/// Ensure a recoverable effect record exists when repairing a legacy or
/// partially migrated durable state. A concurrent/equivalent record is success;
/// the same deterministic source bound to different targets is a conflict.
pub(crate) fn ensure<S: HostSeams>(
    db: &Db<'_, S>,
    source_kind: &str,
    source_id: &str,
    actions: Vec<Action>,
    now: i64,
) -> AppResult<()> {
    let Some(plan) = plan(source_kind, source_id, actions, now)? else {
        return Ok(());
    };
    ensure_plan(db, &plan)
}

pub(crate) fn ensure_plan<S: HostSeams>(db: &Db<'_, S>, plan: &Plan) -> AppResult<()> {
    let BatchOp::Write {
        entry_key, data, ..
    } = &plan.op
    else {
        return Err(AppError::internal("durable effect plan is not a write"));
    };
    let expected: Record = serde_json::from_value(data.clone()).map_err(|error| {
        AppError::internal("cannot decode planned durable effect").with_internal(error.to_string())
    })?;
    match db.guarded_batch(
        std::slice::from_ref(&plan.condition),
        std::slice::from_ref(&plan.op),
    )? {
        GuardedBatchOutcome::Applied { .. } => Ok(()),
        GuardedBatchOutcome::Conflict { .. } => {
            let existing = db
                .read_one(ids::MODEL_WEBHOOK_OUTBOX, entry_key)?
                .ok_or_else(|| AppError::conflict("durable effect changed concurrently"))?;
            let existing: Record = existing.parse()?;
            if existing.source_fingerprint == expected.source_fingerprint
                && existing
                    .targets
                    .iter()
                    .map(|target| (&target.id, &target.action))
                    .eq(expected
                        .targets
                        .iter()
                        .map(|target| (&target.id, &target.action)))
            {
                Ok(())
            } else {
                Err(AppError::conflict(
                    "durable effect source is bound to different targets",
                ))
            }
        }
    }
}

pub(crate) fn snapshot(plan: &Plan) -> AppResult<Value> {
    let BatchOp::Write {
        entry_key, data, ..
    } = &plan.op
    else {
        return Err(AppError::internal("durable effect plan is not a write"));
    };
    let record: Record = serde_json::from_value(data.clone()).map_err(|error| {
        AppError::internal("cannot decode planned durable effect").with_internal(error.to_string())
    })?;
    validate(&record)?;
    if record.effect_id != plan.effect_id || entry_key != &plan.effect_id {
        return Err(AppError::internal(
            "durable effect plan identity is inconsistent",
        ));
    }
    Ok(data.clone())
}

pub(crate) fn restore<S: HostSeams>(
    db: &Db<'_, S>,
    effect_id: &str,
    snapshot: &Value,
) -> AppResult<()> {
    let record: Record = serde_json::from_value(snapshot.clone()).map_err(|error| {
        AppError::internal("cannot decode durable effect snapshot").with_internal(error.to_string())
    })?;
    validate(&record)?;
    if record.effect_id != effect_id {
        return Err(AppError::conflict(
            "durable effect snapshot identity does not match its marker",
        ));
    }
    ensure_plan(
        db,
        &Plan {
            effect_id: effect_id.into(),
            condition: GuardedCondition::Absent {
                content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
                entry_key: effect_id.into(),
            },
            op: write(effect_id, &record)?,
        },
    )
}

impl Action {
    fn kind(&self) -> &'static str {
        match self {
            Self::Event { .. } => "event",
            Self::Crm { .. } => "crm",
            Self::TagAssign { .. } => "tag-assign",
        }
    }
}

fn write(key: &str, record: &Record) -> AppResult<BatchOp> {
    Ok(BatchOp::Write {
        content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
        entry_key: key.into(),
        data: serde_json::to_value(record).map_err(|error| {
            AppError::internal("cannot encode durable effect").with_internal(error.to_string())
        })?,
    })
}

fn validate(record: &Record) -> AppResult<()> {
    if record.schema_version != 1
        || record.record_type != RECORD_TYPE
        || record.source_fingerprint.len() != 64
        || !record
            .source_fingerprint
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
        || record.effect_id != format!("domain-effect:{}", record.source_fingerprint)
        || record.targets.is_empty()
        || record.targets.len() > MAX_ACTIONS
        || !matches!(
            record.status.as_str(),
            STATUS_PENDING | STATUS_LEASED | STATUS_DELIVERED
        )
    {
        return Err(AppError::internal("durable effect record is invalid"));
    }
    let mut ids = std::collections::BTreeSet::new();
    for (index, target) in record.targets.iter().enumerate() {
        if target.id != target_id(&record.source_fingerprint, index, &target.action)?
            || !ids.insert(&target.id)
            || !valid_action(&target.action)
        {
            return Err(AppError::internal("durable effect target is invalid"));
        }
    }
    let lease_present = record
        .lease_owner
        .as_deref()
        .is_some_and(|owner| !owner.is_empty())
        && record
            .lease_expires_at
            .as_deref()
            .and_then(crate::time::parse_iso)
            .is_some();
    let lease_absent = record.lease_owner.is_none() && record.lease_expires_at.is_none();
    let state_is_consistent = match record.status.as_str() {
        STATUS_PENDING => lease_absent,
        STATUS_LEASED => lease_present,
        STATUS_DELIVERED => {
            lease_absent
                && record
                    .targets
                    .iter()
                    .all(|target| target.state == TargetState::Delivered)
        }
        _ => false,
    };
    if !state_is_consistent
        || crate::time::parse_iso(&record.next_attempt_at).is_none()
        || crate::time::parse_iso(&record.created_at).is_none()
        || crate::time::parse_iso(&record.updated_at).is_none()
    {
        return Err(AppError::internal(
            "durable effect delivery state is invalid",
        ));
    }
    Ok(())
}

fn valid_action(action: &Action) -> bool {
    let valid_text = |value: &str| {
        !value.is_empty() && value.len() <= 1_024 && !value.chars().any(char::is_control)
    };
    match action {
        Action::Event {
            event_id,
            label,
            metadata,
        } => valid_text(event_id) && valid_text(label) && metadata.is_object(),
        Action::Crm {
            event_type,
            payload,
        } => {
            valid_text(event_type)
                && payload.is_object()
                && payload
                    .get("eventId")
                    .and_then(Value::as_str)
                    .is_some_and(valid_text)
                && payload.get("eventType").and_then(Value::as_str) == Some(event_type.as_str())
        }
        Action::TagAssign {
            profile_id,
            tag_slug,
            payload,
        } => valid_text(profile_id) && valid_text(tag_slug) && payload.is_object(),
    }
}

fn canonicalize_action_time(action: &mut Action, now: i64) {
    let timestamp = Value::String(crate::time::iso8601(now));
    let payload = match action {
        Action::Event { metadata, .. } => metadata,
        Action::Crm { payload, .. } => payload,
        Action::TagAssign { .. } => return,
    };
    let Some(object) = payload.as_object_mut() else {
        return;
    };
    for field in ["occurred_at", "occurredAt"] {
        if object.contains_key(field) {
            object.insert(field.into(), timestamp.clone());
        }
    }
}

fn target_id(source_fingerprint: &str, index: usize, action: &Action) -> AppResult<String> {
    let encoded = serde_json::to_string(action).map_err(|error| {
        AppError::internal("cannot encode durable effect action").with_internal(error.to_string())
    })?;
    Ok(format!(
        "effect-target:{}",
        digest(&[
            source_fingerprint,
            &index.to_string(),
            action.kind(),
            &encoded,
        ])
    ))
}

fn validate_identity(value: &str, field: &str) -> AppResult<()> {
    if value.is_empty() || value.len() > 1_024 || value.chars().any(char::is_control) {
        Err(AppError::unprocessable(format!("{field} is invalid")))
    } else {
        Ok(())
    }
}

fn digest(parts: &[&str]) -> String {
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-domain-effect-v1\0");
    for part in parts {
        digest.update((part.len() as u64).to_be_bytes());
        digest.update(part.as_bytes());
    }
    hex::encode(digest.finalize())
}

pub(crate) fn event(event_id: &str, label: &str, metadata: Value) -> Action {
    Action::Event {
        event_id: event_id.into(),
        label: label.into(),
        metadata,
    }
}

pub(crate) fn crm(event_type: &str, payload: Value) -> Action {
    Action::Crm {
        event_type: event_type.into(),
        payload,
    }
}

pub(crate) fn tag_assign(profile_id: &str, tag_slug: &str, payload: Value) -> Action {
    Action::TagAssign {
        profile_id: profile_id.into(),
        tag_slug: tag_slug.into(),
        payload,
    }
}
