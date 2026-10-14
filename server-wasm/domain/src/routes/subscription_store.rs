//! Guarded subscription operation identities and monotonic projections.

use serde_json::{json, Value};

use crate::db::{BatchOp, Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::models::SubscriptionRecord;
use crate::seams::HostSeams;

const CLAIM_FIELD: &str = "subscriptionClaim";

pub(crate) struct Claim {
    pub(crate) key: String,
    pub(crate) fingerprint: String,
    pub(crate) row: EntryRecord,
}

pub(crate) fn claim<S: HostSeams>(
    db: &Db<'_, S>,
    operation: &str,
    identity: &str,
    facts: Value,
    now: i64,
) -> AppResult<Claim> {
    let fingerprint = crate::routes::checkout_claim::fingerprint(&json!({
        "schemaVersion": 1, "operation": operation, "identity": identity, "facts": facts,
    }))?;
    let key_hash = crate::routes::checkout_claim::fingerprint(&json!({
        "schemaVersion": 1, "operation": operation, "identity": identity,
    }))?;
    let key = format!("op:{operation}:{key_hash}");
    if let Some(row) = db.read_one(ids::MODEL_SUBSCRIPTIONS, &key)? {
        validate_claim(&row, &fingerprint)?;
        return Ok(Claim {
            key,
            fingerprint,
            row,
        });
    }
    let data = json!({ "schemaVersion": 1, "operation": operation, "identity": identity,
        "fingerprint": fingerprint, "status": "initiating", "createdAt": crate::time::iso8601(now) });
    let conditions = [GuardedCondition::Absent {
        content_model_id: ids::MODEL_SUBSCRIPTIONS,
        entry_key: key.clone(),
    }];
    let ops = [write(&key, data)];
    let _ = db.guarded_batch(&conditions, &ops)?;
    let row = db
        .read_one(ids::MODEL_SUBSCRIPTIONS, &key)?
        .ok_or_else(|| AppError::conflict("subscription operation changed concurrently"))?;
    validate_claim(&row, &fingerprint)?;
    Ok(Claim {
        key,
        fingerprint,
        row,
    })
}

pub(crate) fn complete_marker<S: HostSeams>(db: &Db<'_, S>, claim: &Claim) -> AppResult<bool> {
    complete_marker_with_result(db, claim, None)
}

pub(crate) fn complete_marker_with_result<S: HostSeams>(
    db: &Db<'_, S>,
    claim: &Claim,
    result: Option<Value>,
) -> AppResult<bool> {
    if claim.row.payload.get("status").and_then(Value::as_str) == Some("completed") {
        if result.is_some() && claim.row.payload.get("result") != result.as_ref() {
            return Err(AppError::conflict(
                "subscription operation result changed concurrently",
            ));
        }
        return Ok(false);
    }
    let mut data = claim.row.payload.clone();
    data["status"] = Value::String("completed".into());
    if let Some(result) = result {
        data["result"] = result;
    }
    if guarded_update(db, &claim.row, write(&claim.key, data.clone()))? {
        return Ok(true);
    }
    let current = db
        .read_one(ids::MODEL_SUBSCRIPTIONS, &claim.key)?
        .ok_or_else(|| AppError::conflict("subscription operation marker disappeared"))?;
    if current.payload.get("status").and_then(Value::as_str) == Some("completed")
        && current.payload.get("result") == data.get("result")
    {
        Ok(false)
    } else {
        Err(AppError::conflict(
            "subscription operation changed concurrently",
        ))
    }
}

pub(crate) fn completed_result(claim: &Claim) -> AppResult<Option<Value>> {
    if claim.row.payload.get("status").and_then(Value::as_str) != Some("completed") {
        return Ok(None);
    }
    claim
        .row
        .payload
        .get("result")
        .filter(|result| result.is_object())
        .cloned()
        .map(Some)
        .ok_or_else(|| AppError::internal("completed subscription operation has no result"))
}

pub(crate) fn provider_retry_safe(claim: &Claim, now: i64) -> AppResult<bool> {
    let started = claim
        .row
        .payload
        .get("createdAt")
        .and_then(Value::as_str)
        .and_then(crate::time::parse_iso)
        .ok_or_else(|| AppError::internal("subscription operation has an invalid createdAt"))?;
    Ok(now >= started && now - started < crate::checkout_contract::PROVIDER_IDEMPOTENCY_SECONDS)
}

pub(crate) fn require_provider_retry_safe(claim: &Claim, now: i64) -> AppResult<()> {
    if provider_retry_safe(claim, now)? {
        Ok(())
    } else {
        Err(AppError::conflict(
            "Stripe subscription session outcome is unknown; use a new checkout operation",
        ))
    }
}

pub(crate) fn insert_projection<S: HostSeams>(
    db: &Db<'_, S>,
    key: &str,
    data: Value,
    fingerprint: &str,
) -> AppResult<bool> {
    insert_projection_with_effects(db, key, data, fingerprint, None)
}

pub(crate) fn insert_projection_with_effects<S: HostSeams>(
    db: &Db<'_, S>,
    key: &str,
    mut data: Value,
    fingerprint: &str,
    effect: Option<crate::durable_effects::Plan>,
) -> AppResult<bool> {
    if let Some(existing) = db.read_one(ids::MODEL_SUBSCRIPTIONS, key)? {
        validate_projection(&existing, fingerprint)?;
        if let Some(effect) = effect.as_ref() {
            crate::durable_effects::ensure_plan(db, effect)?;
            crate::durable_effects::dispatch_effect_best_effort(db.host(), &effect.effect_id);
        }
        return Ok(false);
    }
    data[CLAIM_FIELD] = json!({ "schemaVersion": 1, "fingerprint": fingerprint });
    let mut conditions = vec![GuardedCondition::Absent {
        content_model_id: ids::MODEL_SUBSCRIPTIONS,
        entry_key: key.to_string(),
    }];
    let mut ops = vec![write(key, data)];
    let effect_id = effect.as_ref().map(|effect| effect.effect_id.clone());
    if let Some(effect) = effect {
        conditions.push(effect.condition);
        ops.push(effect.op);
    }
    match db.guarded_batch(&conditions, &ops)? {
        GuardedBatchOutcome::Applied { .. } => {
            if let Some(effect_id) = effect_id {
                crate::durable_effects::dispatch_effect_best_effort(db.host(), &effect_id);
            }
            Ok(true)
        }
        GuardedBatchOutcome::Conflict { .. } => {
            let existing = db
                .read_one(ids::MODEL_SUBSCRIPTIONS, key)?
                .ok_or_else(|| AppError::conflict("subscription changed concurrently"))?;
            validate_projection(&existing, fingerprint)?;
            Ok(false)
        }
    }
}

#[cfg(test)]
pub(crate) fn update_monotonic<S: HostSeams>(
    db: &Db<'_, S>,
    row: &EntryRecord,
    incoming: SubscriptionRecord,
) -> AppResult<bool> {
    update_monotonic_with_effects(db, row, incoming, None)
}

pub(crate) fn update_monotonic_with_effects<S: HostSeams>(
    db: &Db<'_, S>,
    row: &EntryRecord,
    incoming: SubscriptionRecord,
    effect: Option<crate::durable_effects::Plan>,
) -> AppResult<bool> {
    let current: SubscriptionRecord = row.parse()?;
    let merged = merge(current.clone(), incoming);
    if same_state(&current, &merged) {
        if let Some(effect) = effect.as_ref() {
            crate::durable_effects::ensure_plan(db, effect)?;
            crate::durable_effects::dispatch_effect_best_effort(db.host(), &effect.effect_id);
        }
        return Ok(false);
    }
    let fields = serde_json::to_value(&merged).map_err(|error| {
        AppError::internal("cannot encode subscription").with_internal(error.to_string())
    })?;
    // Keep host-verified ownership and settlement metadata across projection updates.
    let mut data = row.payload.clone();
    for (key, value) in fields
        .as_object()
        .ok_or_else(|| AppError::internal("invalid subscription projection"))?
    {
        data[key] = value.clone();
    }
    if merged.current_period_end.is_none() {
        data.as_object_mut()
            .ok_or_else(|| AppError::internal("invalid subscription projection"))?
            .remove("currentPeriodEnd");
    }
    let mut conditions = vec![version_guard(row)?];
    let mut ops = vec![write(&row.entry_key, data)];
    let effect_id = effect.as_ref().map(|effect| effect.effect_id.clone());
    if let Some(effect) = effect {
        conditions.push(effect.condition);
        ops.push(effect.op);
    }
    if !matches!(
        db.guarded_batch(&conditions, &ops)?,
        GuardedBatchOutcome::Applied { .. }
    ) {
        // A provider observation made against an older row cannot be merged
        // safely with a concurrent webhook. Re-fetch on the next reconciliation.
        return Ok(false);
    }
    if let Some(effect_id) = effect_id {
        crate::durable_effects::dispatch_effect_best_effort(db.host(), &effect_id);
    }
    Ok(true)
}

pub(crate) fn version_guard(row: &EntryRecord) -> AppResult<GuardedCondition> {
    Ok(GuardedCondition::Version {
        content_model_id: ids::MODEL_SUBSCRIPTIONS,
        entry_key: row.entry_key.clone(),
        expected_version: row.version.clone().ok_or_else(|| {
            AppError::internal("subscription entry omitted required concurrency version")
        })?,
    })
}

fn guarded_update<S: HostSeams>(db: &Db<'_, S>, row: &EntryRecord, op: BatchOp) -> AppResult<bool> {
    Ok(matches!(
        db.guarded_batch(&[version_guard(row)?], &[op])?,
        GuardedBatchOutcome::Applied { .. }
    ))
}

fn validate_claim(row: &EntryRecord, fingerprint: &str) -> AppResult<()> {
    if row.payload.get("fingerprint").and_then(Value::as_str) == Some(fingerprint) {
        return Ok(());
    }
    Err(AppError::conflict(
        "subscription operation identity was reused with different facts",
    ))
}

fn validate_projection(row: &EntryRecord, fingerprint: &str) -> AppResult<()> {
    if row
        .payload
        .get(CLAIM_FIELD)
        .and_then(|claim| claim.get("fingerprint"))
        .and_then(Value::as_str)
        == Some(fingerprint)
    {
        return Ok(());
    }
    Err(AppError::conflict(
        "subscription identity was reused with different facts",
    ))
}

fn merge(current: SubscriptionRecord, mut incoming: SubscriptionRecord) -> SubscriptionRecord {
    incoming.subscription_id = current.subscription_id.clone();
    incoming.customer_ref = current.customer_ref.clone();
    incoming.provider = current.provider.clone();
    incoming.provider_ref = current.provider_ref.clone();
    if terminal(&current.status) && !terminal(&incoming.status) {
        incoming.status = current.status.clone();
    }
    if current.provider != "stripe" {
        incoming.current_period_end = later_period(
            current.current_period_end.as_deref(),
            incoming.current_period_end.as_deref(),
        );
        incoming.cancel_at_period_end |= current.cancel_at_period_end;
    }
    incoming.last_provider_event_at = incoming
        .last_provider_event_at
        .max(current.last_provider_event_at);
    incoming.created_at = current.created_at;
    incoming
}

fn terminal(status: &str) -> bool {
    matches!(
        status,
        "canceled" | "expired" | "revoked" | "refunded" | "incomplete_expired"
    )
}

fn same_state(a: &SubscriptionRecord, b: &SubscriptionRecord) -> bool {
    a.subscription_id == b.subscription_id
        && a.customer_ref == b.customer_ref
        && a.stripe_customer_id == b.stripe_customer_id
        && a.price_id == b.price_id
        && a.status == b.status
        && a.provider == b.provider
        && a.provider_ref == b.provider_ref
        && a.current_period_end == b.current_period_end
        && a.cancel_at_period_end == b.cancel_at_period_end
        && a.last_provider_event_at == b.last_provider_event_at
}

fn later_period(current: Option<&str>, incoming: Option<&str>) -> Option<String> {
    match (current, incoming) {
        (Some(a), Some(b)) => Some(if a >= b { a } else { b }.to_string()),
        (Some(value), None) | (None, Some(value)) => Some(value.to_string()),
        (None, None) => None,
    }
}

fn write(key: &str, data: Value) -> BatchOp {
    BatchOp::Write {
        content_model_id: ids::MODEL_SUBSCRIPTIONS,
        entry_key: key.to_string(),
        data,
    }
}
