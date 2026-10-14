//! Version-fenced outbox lease state transitions.

use crate::db::{BatchOp, Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::models::OutboxItem;
use crate::seams::HostSeams;
use crate::time;

use super::{BASE_BACKOFF_SECS, LEASE_SECS, MAX_ATTEMPTS, MAX_BACKOFF_SECS};

pub(super) struct Claim {
    pub(super) key: String,
    pub(super) item: OutboxItem,
    version: String,
}

pub(super) fn claim<S: HostSeams>(
    db: &Db<'_, S>,
    record: EntryRecord,
    owner: &str,
    now: i64,
) -> AppResult<Option<Claim>> {
    let mut item: OutboxItem = match record.parse::<OutboxItem>() {
        Ok(item)
            if !item.id.is_empty()
                && record.entry_key == format!("out:{}", item.id)
                && (0..MAX_ATTEMPTS).contains(&item.attempts)
                && time::parse_iso(&item.next_attempt_at).is_some() =>
        {
            item
        }
        _ => {
            quarantine(db, &record)?;
            return Ok(None);
        }
    };
    if !claimable(&item, now) {
        return Ok(None);
    }
    let expected_version = require_version(record.version)?;
    item.status = "leased".to_string();
    item.lease_owner = Some(owner.to_string());
    item.lease_expires_at = Some(time::iso8601(now + LEASE_SECS));
    let outcome = db.guarded_batch(
        &[version_guard(&record.entry_key, &expected_version)],
        &[write_item(&record.entry_key, &item)?],
    )?;
    match outcome {
        GuardedBatchOutcome::Conflict { .. } => Ok(None),
        GuardedBatchOutcome::Applied { entries, .. } => {
            let version = entries
                .into_iter()
                .find(|entry| entry.entry_key == record.entry_key)
                .map(|entry| entry.version)
                .ok_or_else(|| AppError::internal("lease claim omitted post-write version"))?;
            Ok(Some(Claim {
                key: record.entry_key,
                item,
                version,
            }))
        }
    }
}

pub(super) fn complete<S: HostSeams>(
    db: &Db<'_, S>,
    mut claim: Claim,
    owner: &str,
    now: i64,
    delivery: Result<u16, ()>,
) -> AppResult<Option<String>> {
    if claim.item.lease_owner.as_deref() != Some(owner) {
        return Ok(None);
    }
    apply_delivery(&mut claim.item, now, delivery);
    claim.item.lease_owner = None;
    claim.item.lease_expires_at = None;
    let outcome = db.guarded_batch(
        &[version_guard(&claim.key, &claim.version)],
        &[write_item(&claim.key, &claim.item)?],
    )?;
    match outcome {
        GuardedBatchOutcome::Applied { .. } => Ok(Some(claim.item.status)),
        GuardedBatchOutcome::Conflict { .. } => Ok(None),
    }
}

fn claimable(item: &OutboxItem, now: i64) -> bool {
    (item.status == "pending"
        && time::parse_iso(&item.next_attempt_at).is_some_and(|due| due <= now))
        || (item.status == "leased"
            && item
                .lease_expires_at
                .as_deref()
                .and_then(time::parse_iso)
                .is_some_and(|expires| expires <= now))
}

fn apply_delivery(item: &mut OutboxItem, now: i64, result: Result<u16, ()>) {
    item.attempts += 1;
    match result {
        Ok(status) if (200..300).contains(&status) => {
            item.status = "delivered".to_string();
            item.last_error = None;
        }
        Ok(status) => reschedule(item, now, &format!("HTTP {status}")),
        Err(()) => reschedule(item, now, "delivery transport failed"),
    }
}

fn reschedule(item: &mut OutboxItem, now: i64, error: &str) {
    item.last_error = Some(error.to_string());
    if item.attempts >= MAX_ATTEMPTS {
        item.status = "failed".to_string();
    } else {
        item.status = "pending".to_string();
        item.next_attempt_at = time::iso8601(now + backoff(item.attempts));
    }
}

fn backoff(attempt: i64) -> i64 {
    let shift = attempt.clamp(0, 16) as u32;
    BASE_BACKOFF_SECS
        .saturating_mul(1i64 << shift)
        .min(MAX_BACKOFF_SECS)
}

fn version_guard(key: &str, version: &str) -> GuardedCondition {
    GuardedCondition::Version {
        content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
        entry_key: key.to_string(),
        expected_version: version.to_string(),
    }
}

fn write_item(key: &str, item: &OutboxItem) -> AppResult<BatchOp> {
    let data = serde_json::to_value(item).map_err(|error| {
        AppError::internal("cannot encode webhook delivery state").with_internal(error.to_string())
    })?;
    Ok(BatchOp::Write {
        content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
        entry_key: key.to_string(),
        data,
    })
}

fn require_version(version: Option<String>) -> AppResult<String> {
    version.ok_or_else(|| AppError::internal("outbox entry omitted required concurrency version"))
}

// Preserve the malformed record for inspection, but remove it from the due
// queue. Its opaque version prevents quarantining a concurrent repair.
fn quarantine<S: HostSeams>(db: &Db<'_, S>, record: &EntryRecord) -> AppResult<()> {
    let version = require_version(record.version.clone())?;
    let mut data = record.payload.clone();
    data["status"] = serde_json::json!("failed");
    data["lastError"] = serde_json::json!("invalid stored delivery record");
    db.guarded_batch(
        &[version_guard(&record.entry_key, &version)],
        &[BatchOp::Write {
            content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
            entry_key: record.entry_key.clone(),
            data,
        }],
    )?;
    Ok(())
}
