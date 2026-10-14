//! Lease-fenced `cedros-pay:webhook-delivery` worker.
//!
//! Delivery is at-least-once across a crash after egress. The stable
//! `cedros-delivery-id` header gives receivers a durable deduplication key.

use std::collections::BTreeSet;

use serde_json::{json, Value};

use crate::db::{Db, Dir, EntryRecord, Filter, Op, Query};
use crate::error::AppResult;
use crate::ids;
use crate::models::OutboxItem;
use crate::reqresp::{JobExecution, JobOutcome};
use crate::seams::HostSeams;
use crate::time;

#[path = "delivery_state.rs"]
mod state;

pub(super) const MAX_ATTEMPTS: i64 = 8;
pub(super) const BASE_BACKOFF_SECS: i64 = 30;
pub(super) const MAX_BACKOFF_SECS: i64 = 3_600;
pub(super) const LEASE_SECS: i64 = 300;

pub fn run<S: HostSeams>(seams: &S, exec: &JobExecution) -> AppResult<JobOutcome> {
    let budget = crate::work_budget::WorkBudget::new(seams);
    let batch_size = exec
        .metadata()
        .get("batchSize")
        .and_then(Value::as_i64)
        .unwrap_or(20)
        .clamp(1, 100) as usize;
    let now = seams.now_unix_secs();
    let db = Db::new(seams, ids::DB_ACCESS);
    let owner = format!("{}:{}:{now}", exec.job_id, exec.attempt);
    let mut counts = Counts::default();
    let mut deferred = 0;
    let candidates = candidates(&db, now, batch_size)?;
    let candidate_count = candidates.len();
    for (index, record) in candidates.into_iter().enumerate() {
        // Reserve the second half for canonical and domain settlement effects.
        if budget.exhausted(seams, 45) {
            deferred = candidate_count - index;
            break;
        }
        let Some(claim) = state::claim(&db, record, &owner, seams.now_unix_secs())? else {
            continue;
        };
        let result = deliver(seams, &claim.item);
        if let Some(status) = state::complete(&db, claim, &owner, seams.now_unix_secs(), result)? {
            counts.tally(&status);
        }
    }
    let settlement = crate::checkout_contract::deliver_settlement_effects_with_budget(
        seams, batch_size, &budget,
    )?;
    let domain_effects = crate::durable_effects::run(seams, batch_size, &budget)?;
    Ok(JobOutcome::succeeded(json!({
        "delivered": counts.delivered,
        "deferred": deferred,
        "budgetExhausted": budget.exhausted(seams, 90),
        "retried": counts.retried,
        "failed": counts.failed,
        "settlementEffects": settlement,
        "domainEffects": domain_effects,
    })))
}

fn candidates<S: HostSeams>(db: &Db<'_, S>, now: i64, limit: usize) -> AppResult<Vec<EntryRecord>> {
    let now_iso = time::iso8601(now);
    let pending = Query::new()
        .filter(Filter::new("status", Op::Eq, "pending"))
        .filter(Filter::new("nextAttemptAt", Op::Lte, now_iso.clone()))
        .order("nextAttemptAt", Dir::Asc)
        .limit(limit as i64);
    let expired = Query::new()
        .filter(Filter::new("status", Op::Eq, "leased"))
        .filter(Filter::new("leaseExpiresAt", Op::Lte, now_iso))
        .order("leaseExpiresAt", Dir::Asc)
        .limit(limit as i64);
    let mut seen = BTreeSet::new();
    let mut rows = Vec::new();
    for row in db
        .read(ids::MODEL_WEBHOOK_OUTBOX, &pending)?
        .into_iter()
        .chain(db.read(ids::MODEL_WEBHOOK_OUTBOX, &expired)?)
    {
        if seen.insert(row.entry_key.clone()) {
            rows.push(row);
        }
    }
    rows.sort_by(|left, right| {
        candidate_due(left)
            .cmp(&candidate_due(right))
            .then_with(|| left.entry_key.cmp(&right.entry_key))
    });
    rows.truncate(limit);
    Ok(rows)
}

fn candidate_due(row: &EntryRecord) -> Option<&str> {
    let field = if row.payload["status"] == "leased" {
        "leaseExpiresAt"
    } else {
        "nextAttemptAt"
    };
    row.payload.get(field).and_then(Value::as_str)
}

fn deliver<S: HostSeams>(seams: &S, item: &OutboxItem) -> Result<u16, ()> {
    let request = json!({
        "method": "POST", "url": item.url,
        "headers": [
            ["content-type", "application/json"],
            ["cedros-delivery-id", item.id]
        ],
        "body": item.payload.to_string(),
    });
    let raw = seams.http_fetch(&request.to_string()).map_err(|_| ())?;
    let envelope: Value = serde_json::from_str(&raw).map_err(|_| ())?;
    envelope
        .get("status")
        .and_then(Value::as_u64)
        .and_then(|status| u16::try_from(status).ok())
        .ok_or(())
}

#[derive(Default)]
struct Counts {
    delivered: i64,
    retried: i64,
    failed: i64,
}

impl Counts {
    fn tally(&mut self, status: &str) {
        match status {
            "delivered" => self.delivered += 1,
            "failed" => self.failed += 1,
            _ => self.retried += 1,
        }
    }
}

#[cfg(test)]
#[path = "delivery_tests.rs"]
mod tests;
