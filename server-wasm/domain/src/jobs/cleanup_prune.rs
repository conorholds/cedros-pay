//! Snapshot-and-delete implementation for version-fenced outbox cleanup.

use crate::db::{BatchOp, Db, EntryRecord, Query};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::seams::HostSeams;
use crate::time;

const SCAN_PAGE: i64 = 200;
const MAX_SCAN_PAGES: usize = 50;
const GUARDED_CHUNK: usize = 32;

pub(super) fn expired<S: HostSeams>(db: &Db<'_, S>, query: &Query, now: i64) -> AppResult<i64> {
    // Complete the bounded snapshot before deleting so offset pagination cannot
    // skip rows as earlier pages shrink. Versions fence every later deletion.
    let mut eligible = Vec::new();
    db.for_each_page(
        ids::MODEL_WEBHOOK_OUTBOX,
        query,
        SCAN_PAGE,
        MAX_SCAN_PAGES,
        |rows| {
            for mut row in rows {
                if !protected(&row.payload, now) {
                    // Deletion needs only identity and version after eligibility is
                    // checked. Do not retain webhook bodies across the snapshot.
                    row.payload = serde_json::Value::Null;
                    row.updated_at = None;
                    eligible.push(row);
                }
            }
            Ok(())
        },
    )?;
    let mut deleted = 0;
    for chunk in eligible.chunks(GUARDED_CHUNK) {
        deleted += delete_chunk(db, chunk)?;
    }
    Ok(deleted)
}

fn delete_chunk<S: HostSeams>(db: &Db<'_, S>, rows: &[EntryRecord]) -> AppResult<i64> {
    if rows.is_empty() {
        return Ok(0);
    }
    let conditions = rows
        .iter()
        .map(version_guard)
        .collect::<AppResult<Vec<_>>>()?;
    let ops = rows.iter().map(delete_op).collect::<Vec<_>>();
    match db.guarded_batch(&conditions, &ops)? {
        GuardedBatchOutcome::Applied { .. } => Ok(rows.len() as i64),
        GuardedBatchOutcome::Conflict { .. } if rows.len() == 1 => Ok(0),
        GuardedBatchOutcome::Conflict { .. } => {
            let middle = rows.len() / 2;
            Ok(delete_chunk(db, &rows[..middle])? + delete_chunk(db, &rows[middle..])?)
        }
    }
}

fn version_guard(row: &EntryRecord) -> AppResult<GuardedCondition> {
    let expected_version = row
        .version
        .clone()
        .filter(|version| !version.is_empty())
        .ok_or_else(|| AppError::internal("outbox cleanup row omitted required version"))?;
    Ok(GuardedCondition::Version {
        content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
        entry_key: row.entry_key.clone(),
        expected_version,
    })
}

fn delete_op(row: &EntryRecord) -> BatchOp {
    BatchOp::Delete {
        content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
        entry_key: row.entry_key.clone(),
    }
}

fn protected(payload: &serde_json::Value, now: i64) -> bool {
    // Delivery receipts and authenticated external-fact identities are durable
    // deduplication state. Deleting them lets a later ledger/webhook replay
    // recreate and emit an already delivered economic notification.
    matches!(
        payload
            .get("recordType")
            .and_then(serde_json::Value::as_str),
        Some("durableDomainEffect" | "canonicalSettlementEffect" | "reconciliationProgress")
    ) || payload.get("eventId").is_some()
        || matches!(
            payload.get("status").and_then(serde_json::Value::as_str),
            Some(
                "pending"
                    | "leased"
                    | "effect_pending"
                    | "effect_leased"
                    | "effect_delivered"
                    | "domain_effect_delivered"
                    | "domain_effect_failed"
                    | "domain_effect_pending"
                    | "domain_effect_leased"
            )
        )
        || payload
            .get("targets")
            .and_then(serde_json::Value::as_object)
            .is_some_and(|targets| targets.values().any(|state| state == "pending"))
        || active_lease(payload, now)
}

fn active_lease(payload: &serde_json::Value, now: i64) -> bool {
    ["leaseExpiresAt", "leaseUntil"]
        .iter()
        .filter_map(|field| payload.get(field).and_then(serde_json::Value::as_str))
        .filter_map(time::parse_iso)
        .any(|expires| expires > now)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn cleanup_never_prunes_financial_effect_receipts() {
        assert!(protected(&json!({"status":"domain_effect_pending"}), 100));
        assert!(protected(
            &json!({"status":"domain_effect_leased","leaseExpiresAt":"1970-01-01T00:00:01Z"}),
            100
        ));
        assert!(protected(
            &json!({"status":"domain_effect_delivered","updatedAt":"1970-01-01T00:00:01Z"}),
            100
        ));
    }
}
