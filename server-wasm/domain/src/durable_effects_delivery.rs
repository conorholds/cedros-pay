//! Delivery worker for durable post-commit domain effects.

use serde::Serialize;
use serde_json::Value;

use super::*;
use crate::db::{Dir, EntryRecord, Filter, Op, Query};
use crate::work_budget::WorkBudget;

/// Opportunistically deliver one just-committed effect for low-latency host
/// behavior. The durable worker remains authoritative: every failure is
/// retained and retried, and callers never roll back an already committed
/// financial transition because an effect target is unavailable.
pub(crate) fn dispatch_best_effort<S: HostSeams>(seams: &S, source_kind: &str, source_id: &str) {
    let effect_id = format!("domain-effect:{}", digest(&[source_kind, source_id]));
    dispatch_effect_best_effort(seams, &effect_id);
}

pub(crate) fn dispatch_effect_best_effort<S: HostSeams>(seams: &S, effect_id: &str) {
    if let Err(error) = dispatch_exact(seams, effect_id) {
        seams.log(
            "warn",
            &format!("durable domain effect dispatch deferred: {}", error.code),
        );
    }
}

fn dispatch_exact<S: HostSeams>(seams: &S, effect_id: &str) -> AppResult<()> {
    let db = Db::new(seams, ids::DB_ACCESS);
    let Some(row) = db.read_one(ids::MODEL_WEBHOOK_OUTBOX, effect_id)? else {
        return Ok(());
    };
    let now = seams.now_unix_secs();
    let status = row.payload.get("status").and_then(Value::as_str);
    if status == Some(STATUS_DELIVERED)
        || status == Some(STATUS_FAILED)
        || (status == Some(STATUS_PENDING)
            && row
                .payload
                .get("nextAttemptAt")
                .and_then(Value::as_str)
                .and_then(crate::time::parse_iso)
                .is_some_and(|due| due > now))
        || (status == Some(STATUS_LEASED)
            && row
                .payload
                .get("leaseExpiresAt")
                .and_then(Value::as_str)
                .and_then(crate::time::parse_iso)
                .is_some_and(|expiry| expiry > now))
    {
        return Ok(());
    }
    let candidate = match decode_candidate(&row) {
        Ok(candidate) => candidate,
        Err(_) => {
            let _ = quarantine(&db, row, now)?;
            return Ok(());
        }
    };
    let owner = random_owner()?;
    let Some(mut claim) = claim(&db, candidate, &owner, now)? else {
        return Ok(());
    };
    let targets = claim
        .record
        .targets
        .iter()
        .filter(|target| target.state == TargetState::Pending)
        .cloned()
        .collect::<Vec<_>>();
    for target in targets {
        if let Err(code) = deliver(seams, &target) {
            reschedule(&db, claim, &owner, seams.now_unix_secs(), code)?;
            return Ok(());
        }
        if !checkpoint(&db, &mut claim, &owner, &target.id, seams.now_unix_secs())? {
            return Ok(());
        }
    }
    let _ = finish(&db, claim, &owner, seams.now_unix_secs())?;
    Ok(())
}

#[derive(Debug, Default, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeliveryReport {
    pub scanned: usize,
    pub delivered: usize,
    pub retried: usize,
    pub deferred: usize,
    pub failed: usize,
}

pub(crate) fn run<S: HostSeams>(
    seams: &S,
    requested_limit: usize,
    budget: &WorkBudget,
) -> AppResult<DeliveryReport> {
    if budget.exhausted(seams, 105) {
        return Ok(DeliveryReport::default());
    }
    let db = Db::new(seams, ids::DB_ACCESS);
    let owner = random_owner()?;
    let rows = candidates(&db, seams.now_unix_secs(), requested_limit.clamp(1, 100))?;
    let count = rows.len();
    let mut report = DeliveryReport::default();
    for (index, row) in rows.into_iter().enumerate() {
        if budget.exhausted(seams, 105) {
            report.deferred += count - index;
            break;
        }
        report.scanned += 1;
        let candidate = match decode_candidate(&row) {
            Ok(candidate) => candidate,
            Err(_) => {
                if quarantine(&db, row, seams.now_unix_secs())? {
                    report.failed += 1;
                } else {
                    report.deferred += 1;
                }
                continue;
            }
        };
        let mut claim = match claim(&db, candidate, &owner, seams.now_unix_secs()) {
            Ok(Some(claim)) => claim,
            Ok(None) => {
                report.deferred += 1;
                continue;
            }
            Err(error) => return Err(error),
        };
        let targets = claim
            .record
            .targets
            .iter()
            .filter(|target| target.state == TargetState::Pending)
            .cloned()
            .collect::<Vec<_>>();
        let mut failed = None;
        for target in targets {
            if let Err(code) = deliver(seams, &target) {
                failed = Some(code);
                break;
            }
            if !checkpoint(&db, &mut claim, &owner, &target.id, seams.now_unix_secs())? {
                report.deferred += 1;
                failed = Some("effect_checkpoint_conflict");
                break;
            }
        }
        if let Some(code) = failed {
            if code != "effect_checkpoint_conflict" {
                reschedule(&db, claim, &owner, seams.now_unix_secs(), code)?;
                report.retried += 1;
            }
            continue;
        }
        if finish(&db, claim, &owner, seams.now_unix_secs())? {
            report.delivered += 1;
        } else {
            report.deferred += 1;
        }
    }
    Ok(report)
}

struct Claim {
    record: Record,
    version: String,
}

struct Candidate {
    record: Record,
    version: String,
}

fn candidates<S: HostSeams>(db: &Db<'_, S>, now: i64, limit: usize) -> AppResult<Vec<EntryRecord>> {
    let now_iso = crate::time::iso8601(now);
    let base = |status| {
        Query::new()
            .filter(Filter::new("recordType", Op::Eq, RECORD_TYPE))
            .filter(Filter::new("status", Op::Eq, status))
    };
    let pending = base(STATUS_PENDING)
        .filter(Filter::new("nextAttemptAt", Op::Lte, now_iso.clone()))
        .order("nextAttemptAt", Dir::Asc)
        .limit(limit as i64);
    let leased = base(STATUS_LEASED)
        .filter(Filter::new("leaseExpiresAt", Op::Lte, now_iso))
        .order("leaseExpiresAt", Dir::Asc)
        .limit(limit as i64);
    let mut seen = std::collections::BTreeSet::new();
    let mut rows = db
        .read(ids::MODEL_WEBHOOK_OUTBOX, &pending)?
        .into_iter()
        .chain(db.read(ids::MODEL_WEBHOOK_OUTBOX, &leased)?)
        .filter(|row| seen.insert(row.entry_key.clone()))
        .collect::<Vec<_>>();
    rows.sort_by(|left, right| {
        candidate_due(left)
            .cmp(&candidate_due(right))
            .then_with(|| left.entry_key.cmp(&right.entry_key))
    });
    rows.truncate(limit);
    Ok(rows)
}

fn candidate_due(row: &EntryRecord) -> Option<&str> {
    let field = if row.payload.get("status").and_then(Value::as_str) == Some(STATUS_LEASED) {
        "leaseExpiresAt"
    } else {
        "nextAttemptAt"
    };
    row.payload.get(field).and_then(Value::as_str)
}

fn quarantine<S: HostSeams>(db: &Db<'_, S>, row: EntryRecord, now: i64) -> AppResult<bool> {
    let Some(version) = row.version else {
        return Ok(false);
    };
    let mut data = row.payload;
    let Some(object) = data.as_object_mut() else {
        return Ok(false);
    };
    object.insert("status".into(), Value::String(STATUS_FAILED.into()));
    object.insert(
        "lastError".into(),
        Value::String("invalid_effect_record".into()),
    );
    object.insert("updatedAt".into(), Value::String(crate::time::iso8601(now)));
    Ok(matches!(
        db.guarded_batch(
            &[GuardedCondition::Version {
                content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
                entry_key: row.entry_key.clone(),
                expected_version: version,
            }],
            &[BatchOp::Write {
                content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
                entry_key: row.entry_key,
                data,
            }],
        )?,
        GuardedBatchOutcome::Applied { .. }
    ))
}

fn decode_candidate(row: &EntryRecord) -> AppResult<Candidate> {
    let record: Record = serde_json::from_value(row.payload.clone()).map_err(|error| {
        AppError::internal("cannot decode durable effect").with_internal(error.to_string())
    })?;
    validate(&record)?;
    if record.effect_id != row.entry_key {
        return Err(AppError::internal(
            "durable effect storage identity is invalid",
        ));
    }
    Ok(Candidate {
        record,
        version: required_version(row.version.clone())?,
    })
}

fn claim<S: HostSeams>(
    db: &Db<'_, S>,
    candidate: Candidate,
    owner: &str,
    now: i64,
) -> AppResult<Option<Claim>> {
    let Candidate {
        mut record,
        version,
    } = candidate;
    record.status = STATUS_LEASED.into();
    record.lease_owner = Some(owner.into());
    record.lease_expires_at = Some(crate::time::iso8601(now.saturating_add(LEASE_SECONDS)));
    record.updated_at = crate::time::iso8601(now);
    let Some(version) = write_cas(db, &record, &version)? else {
        return Ok(None);
    };
    Ok(Some(Claim { record, version }))
}

fn checkpoint<S: HostSeams>(
    db: &Db<'_, S>,
    claim: &mut Claim,
    owner: &str,
    target_id: &str,
    now: i64,
) -> AppResult<bool> {
    ensure_owner(claim, owner)?;
    let target = claim
        .record
        .targets
        .iter_mut()
        .find(|target| target.id == target_id)
        .ok_or_else(|| AppError::internal("durable effect target disappeared"))?;
    target.state = TargetState::Delivered;
    claim.record.updated_at = crate::time::iso8601(now);
    let Some(version) = write_cas(db, &claim.record, &claim.version)? else {
        return Ok(false);
    };
    claim.version = version;
    Ok(true)
}

fn reschedule<S: HostSeams>(
    db: &Db<'_, S>,
    mut claim: Claim,
    owner: &str,
    now: i64,
    code: &str,
) -> AppResult<()> {
    ensure_owner(&claim, owner)?;
    claim.record.attempts = claim.record.attempts.saturating_add(1);
    claim.record.status = STATUS_PENDING.into();
    claim.record.next_attempt_at =
        crate::time::iso8601(now.saturating_add(backoff_seconds(claim.record.attempts)));
    claim.record.last_error = Some(code.into());
    claim.record.lease_owner = None;
    claim.record.lease_expires_at = None;
    claim.record.updated_at = crate::time::iso8601(now);
    let _ = write_cas(db, &claim.record, &claim.version)?;
    Ok(())
}

fn finish<S: HostSeams>(
    db: &Db<'_, S>,
    mut claim: Claim,
    owner: &str,
    now: i64,
) -> AppResult<bool> {
    ensure_owner(&claim, owner)?;
    if claim
        .record
        .targets
        .iter()
        .any(|target| target.state != TargetState::Delivered)
    {
        return Err(AppError::internal(
            "durable effect cannot finish with pending targets",
        ));
    }
    claim.record.status = STATUS_DELIVERED.into();
    claim.record.last_error = None;
    claim.record.lease_owner = None;
    claim.record.lease_expires_at = None;
    claim.record.updated_at = crate::time::iso8601(now);
    write_cas(db, &claim.record, &claim.version).map(|version| version.is_some())
}

fn deliver<S: HostSeams>(seams: &S, target: &Target) -> Result<(), &'static str> {
    match &target.action {
        Action::Event {
            event_id,
            label,
            metadata,
        } => {
            let mut metadata = metadata.clone();
            if let Some(object) = metadata.as_object_mut() {
                object.insert("idempotency_key".into(), Value::String(target.id.clone()));
            }
            seams
                .emit_event(event_id, label, &metadata.to_string())
                .map_err(|_| "event_delivery_failed")
        }
        Action::Crm {
            event_type,
            payload,
        } => seams
            .crm_submit(
                ids::CRM_SOURCE_ACCESS,
                ids::CRM_SOURCE_KIND,
                event_type,
                &payload.to_string(),
            )
            .map_err(|_| "crm_delivery_failed"),
        Action::TagAssign {
            profile_id,
            tag_slug,
            payload,
        } => seams
            .tag_assign(ids::TAG_ACCESS, profile_id, tag_slug, &payload.to_string())
            .map(|_| ())
            .map_err(|_| "tag_delivery_failed"),
    }
}

fn write_cas<S: HostSeams>(
    db: &Db<'_, S>,
    record: &Record,
    version: &str,
) -> AppResult<Option<String>> {
    validate(record)?;
    match db.guarded_batch(
        &[GuardedCondition::Version {
            content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
            entry_key: record.effect_id.clone(),
            expected_version: version.into(),
        }],
        &[write(&record.effect_id, record)?],
    )? {
        GuardedBatchOutcome::Conflict { .. } => Ok(None),
        GuardedBatchOutcome::Applied { entries, .. } => entries
            .into_iter()
            .find(|entry| entry.entry_key == record.effect_id)
            .map(|entry| entry.version)
            .ok_or_else(|| AppError::internal("durable effect write omitted its version"))
            .map(Some),
    }
}

fn ensure_owner(claim: &Claim, owner: &str) -> AppResult<()> {
    if claim.record.status == STATUS_LEASED && claim.record.lease_owner.as_deref() == Some(owner) {
        Ok(())
    } else {
        Err(AppError::conflict("durable effect lease is stale"))
    }
}

fn required_version(version: Option<String>) -> AppResult<String> {
    version.ok_or_else(|| AppError::internal("durable effect omitted its version"))
}

fn random_owner() -> AppResult<String> {
    let mut bytes = [0_u8; 32];
    getrandom::fill(&mut bytes).map_err(|error| {
        AppError::internal("secure effect owner generation failed").with_internal(error.to_string())
    })?;
    Ok(format!("effect-owner:{}", hex::encode(bytes)))
}

fn backoff_seconds(attempts: u32) -> i64 {
    BASE_BACKOFF_SECONDS
        .saturating_mul(1_i64 << attempts.min(8))
        .min(MAX_BACKOFF_SECONDS)
}

#[cfg(test)]
#[path = "durable_effects_tests.rs"]
mod tests;
