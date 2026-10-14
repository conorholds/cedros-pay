//! Bounded version-fenced cleanup for expired durable rate windows.

use super::rate_policy::{RateRecord, RECORD_TYPE, WINDOW_SECONDS};
use crate::db::{BatchOp, Db, Dir, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::seams::HostSeams;

const MAX_CLEANUP_ROWS: usize = 128;
const GUARDED_CHUNK: usize = 32;

/// Deletes expired rate records without racing a renewed window.
///
/// The exact guarded-policy marker is checked before scanning. Every deletion
/// is fenced by the opaque revision returned by the snapshot read.
pub fn cleanup_expired_rate_windows<S: HostSeams>(
    seams: &S,
    requested_limit: usize,
) -> AppResult<usize> {
    crate::guarded_policy::require_active(seams)?;
    let current = seams.now_unix_secs().div_euclid(WINDOW_SECONDS) * WINDOW_SECONDS;
    let expired_at = current.saturating_sub(WINDOW_SECONDS);
    let limit = requested_limit.clamp(1, MAX_CLEANUP_ROWS) as i64;
    let query = Query::new()
        .filter(Filter::new("recordType", Op::Eq, RECORD_TYPE))
        .filter(Filter::new("windowStart", Op::Lte, expired_at))
        .order("windowStart", Dir::Asc)
        .limit(limit);
    let db = Db::new(seams, crate::ids::DB_ACCESS);
    let rows = db.read(super::LANE_MODEL_ID, &query)?;
    for row in &rows {
        let record: RateRecord = row.parse()?;
        if !row.entry_key.starts_with("rate:") || !record.valid() {
            return Err(AppError::internal(
                "stored cart rate cleanup row is invalid",
            ));
        }
    }
    let mut deleted = 0;
    for chunk in rows.chunks(GUARDED_CHUNK) {
        deleted += delete_chunk(&db, chunk)?;
    }
    Ok(deleted)
}

fn delete_chunk<S: HostSeams>(db: &Db<'_, S>, rows: &[crate::db::EntryRecord]) -> AppResult<usize> {
    if rows.is_empty() {
        return Ok(0);
    }
    let conditions = rows
        .iter()
        .map(version_guard)
        .collect::<AppResult<Vec<_>>>()?;
    let ops = rows
        .iter()
        .map(|row| BatchOp::Delete {
            content_model_id: super::LANE_MODEL_ID,
            entry_key: row.entry_key.clone(),
        })
        .collect::<Vec<_>>();
    match db.guarded_batch(&conditions, &ops)? {
        GuardedBatchOutcome::Applied { .. } => Ok(rows.len()),
        GuardedBatchOutcome::Conflict { .. } if rows.len() == 1 => Ok(0),
        GuardedBatchOutcome::Conflict { .. } => {
            let middle = rows.len() / 2;
            Ok(delete_chunk(db, &rows[..middle])? + delete_chunk(db, &rows[middle..])?)
        }
    }
}

fn version_guard(row: &crate::db::EntryRecord) -> AppResult<GuardedCondition> {
    let expected_version = row
        .version
        .clone()
        .filter(|version| !version.is_empty())
        .ok_or_else(|| AppError::internal("cart rate cleanup row omitted host revision"))?;
    Ok(GuardedCondition::Version {
        content_model_id: super::LANE_MODEL_ID,
        entry_key: row.entry_key.clone(),
        expected_version,
    })
}
