//! Automatic catalog publication. A rotating, guarded cursor prevents a broken
//! product from starving later rows. Provider writes reuse the manual sync path.
use serde_json::json;

use crate::db::{BatchOp, Db, Dir, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::reqresp::{JobExecution, JobOutcome, JobStatus};
use crate::seams::HostSeams;

const PROGRESS: &str = "op:stripe-catalog-sync-progress";
const PAGE_SIZE: i64 = 50;
const MAX_SYNCS: usize = 5;

pub(crate) fn run<S: HostSeams>(seams: &S, exec: &JobExecution) -> AppResult<JobOutcome> {
    let metadata = exec.metadata();
    if metadata.as_object().is_none_or(|object| !object.is_empty()) {
        return Err(AppError::bad_request(
            "catalog sync metadata must be an empty object",
        ));
    }
    if seams.setting_get("stripe.enabled")?.as_deref() != Some("true") {
        return Ok(JobOutcome::succeeded(json!({"skipped":"stripe_disabled"})));
    }
    let secret = super::stripe_secret(seams)?;
    let budget = crate::work_budget::WorkBudget::new(seams);
    let db = Db::new(seams, ids::DB_ACCESS);
    let progress = db.read_one(ids::MODEL_SUBSCRIPTIONS, PROGRESS)?;
    let mut offset = match &progress {
        Some(row) => row.payload["offset"]
            .as_i64()
            .filter(|value| *value >= 0)
            .ok_or_else(|| AppError::internal("invalid Stripe catalog sync progress"))?,
        None => 0,
    };
    let query = Query::new()
        .filter(Filter::new("recordType", Op::Eq, "product"))
        .order("createdAt", Dir::Asc)
        .limit(PAGE_SIZE);
    let mut rows = db.read(ids::MODEL_CATALOG, &query.clone().offset(offset))?;
    if rows.is_empty() && offset > 0 {
        offset = 0;
        rows = db.read(ids::MODEL_CATALOG, &query.offset(0))?;
    }
    let mut checked = 0usize;
    let mut synced = 0usize;
    let mut failed = 0usize;
    let row_count = rows.len();
    for row in rows {
        if synced + failed >= MAX_SYNCS || budget.exhausted(seams, 180) {
            break;
        }
        checked += 1;
        offset = offset
            .checked_add(1)
            .ok_or_else(|| AppError::internal("catalog cursor overflow"))?;
        // Closed/draft/archived products never become sellable through syncing.
        if super::require_syncable_product(&row.payload).is_err() {
            continue;
        }
        let key = row.entry_key.clone();
        let result = super::needs_sync(&row.payload, seams.now_unix_secs()).and_then(|needed| {
            if !needed {
                return Ok(false);
            }
            super::synchronize(seams, &secret, row, "automatic_sync").map(|_| true)
        });
        match result {
            Ok(true) => synced += 1,
            Ok(false) => {}
            Err(_) => {
                failed += 1;
                // Persist only sanitized status; report storage failure instead of
                // silently claiming the provider failure was recorded.
                super::record_sync_error(seams, &key, "automatic_sync")?;
            }
        }
    }
    if checked == row_count && row_count < PAGE_SIZE as usize {
        offset = 0;
    }
    let condition = match &progress {
        Some(row) => crate::routes::subscription_store::version_guard(row)?,
        None => GuardedCondition::Absent {
            content_model_id: ids::MODEL_SUBSCRIPTIONS,
            entry_key: PROGRESS.into(),
        },
    };
    let write = BatchOp::Write {
        content_model_id: ids::MODEL_SUBSCRIPTIONS,
        entry_key: PROGRESS.into(),
        data: json!({"schemaVersion":1,"offset":offset}),
    };
    if !matches!(
        db.guarded_batch(&[condition], &[write])?,
        GuardedBatchOutcome::Applied { .. }
    ) {
        return Err(AppError::conflict(
            "Stripe catalog sync cursor changed; retry",
        ));
    }
    Ok(JobOutcome {
        status: if failed > 0 {
            JobStatus::Retryable
        } else {
            JobStatus::Succeeded
        },
        details_json: json!({"checkedCount":checked,"syncedCount":synced,"failedCount":failed,
            "deferredCount":row_count - checked,"nextOffset":offset})
        .to_string(),
    })
}
