use std::collections::BTreeSet;

use crate::db::{Db, Dir, EntryRecord, Filter, Op, Query};
use crate::error::AppResult;
use crate::seams::HostSeams;
use crate::work_budget::WorkBudget;

use super::settlement_effect_record::{STATUS_LEASED, STATUS_PENDING};
use super::settlement_effect_state::{self, Claim};
use super::OperationOwner;

const MAX_TARGETS_PER_CLAIM: usize = 8;

#[derive(Debug, Default, Eq, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
/// Bounded worker results exposed in the scheduled job's operational details.
pub(crate) struct DeliveryReport {
    pub scanned: usize,
    pub delivered: usize,
    pub retried: usize,
    pub deferred: usize,
}

pub(crate) fn run<S: HostSeams>(
    seams: &S,
    requested_limit: usize,
    budget: &WorkBudget,
) -> AppResult<DeliveryReport> {
    if budget.exhausted(seams, 90) {
        return Ok(DeliveryReport::default());
    }
    let limit = requested_limit.clamp(1, 100);
    let now = seams.now_unix_secs();
    let db = Db::new(seams, crate::ids::DB_ACCESS);
    let owner = OperationOwner::random()?;
    let mut report = DeliveryReport::default();
    let candidates = candidates(&db, now, limit)?;
    let count = candidates.len();
    for (index, row) in candidates.into_iter().enumerate() {
        if budget.exhausted(seams, 90) {
            report.deferred += count - index;
            break;
        }
        report.scanned += 1;
        let Some(claim) = settlement_effect_state::claim(&db, row, &owner, seams.now_unix_secs())?
        else {
            report.deferred += 1;
            continue;
        };
        process(seams, &db, claim, &owner, budget, &mut report)?;
    }
    Ok(report)
}

fn process<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    mut claim: Claim,
    owner: &OperationOwner,
    budget: &WorkBudget,
    report: &mut DeliveryReport,
) -> AppResult<()> {
    let pending = claim
        .record
        .targets
        .iter()
        .filter(|target| target.state == super::settlement_effect_record::TargetState::Pending)
        .take(MAX_TARGETS_PER_CLAIM)
        .cloned()
        .collect::<Vec<_>>();
    for target in pending {
        if budget.exhausted(seams, 90) {
            settlement_effect_state::release_partial(db, claim, owner, seams.now_unix_secs())?;
            report.deferred += 1;
            return Ok(());
        }
        if let Err(code) = super::settlement_effect_delivery::deliver(seams, &claim.record, &target)
        {
            settlement_effect_state::reschedule(db, claim, owner, seams.now_unix_secs(), code)?;
            report.retried += 1;
            return Ok(());
        }
        if !settlement_effect_state::target_delivered(
            db,
            &mut claim,
            owner,
            &target.id,
            seams.now_unix_secs(),
        )? {
            report.deferred += 1;
            return Ok(());
        }
    }
    if claim.record.all_delivered() {
        if settlement_effect_state::finish(db, claim, owner, seams.now_unix_secs())? {
            report.delivered += 1;
        } else {
            report.deferred += 1;
        }
    } else if settlement_effect_state::release_partial(db, claim, owner, seams.now_unix_secs())? {
        report.deferred += 1;
    }
    Ok(())
}

fn candidates<S: HostSeams>(db: &Db<'_, S>, now: i64, limit: usize) -> AppResult<Vec<EntryRecord>> {
    let now_iso = crate::time::iso8601(now);
    let pending = base_query(STATUS_PENDING)
        .filter(Filter::new("nextAttemptAt", Op::Lte, now_iso.clone()))
        .order("nextAttemptAt", Dir::Asc)
        .limit(limit as i64);
    let expired = base_query(STATUS_LEASED)
        .filter(Filter::new("leaseExpiresAt", Op::Lte, now_iso))
        .order("leaseExpiresAt", Dir::Asc)
        .limit(limit as i64);
    let mut seen = BTreeSet::new();
    let mut rows = Vec::new();
    for row in db
        .read(crate::ids::MODEL_WEBHOOK_OUTBOX, &pending)?
        .into_iter()
        .chain(db.read(crate::ids::MODEL_WEBHOOK_OUTBOX, &expired)?)
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
    match row
        .payload
        .get("status")
        .and_then(serde_json::Value::as_str)
    {
        Some(STATUS_PENDING) => row
            .payload
            .get("nextAttemptAt")
            .and_then(serde_json::Value::as_str),
        Some(STATUS_LEASED) => row
            .payload
            .get("leaseExpiresAt")
            .and_then(serde_json::Value::as_str),
        _ => None,
    }
}

fn base_query(status: &str) -> Query {
    Query::new()
        .filter(Filter::new(
            "recordType",
            Op::Eq,
            super::settlement_effect_record::RECORD_TYPE,
        ))
        .filter(Filter::new("status", Op::Eq, status))
}
