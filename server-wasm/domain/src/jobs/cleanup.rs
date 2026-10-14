//! `cedros-pay:cleanup` — version-guarded pruning of ordinary delivered/failed
//! outbox items. Financial delivery and external-fact receipts are permanent.
//! Metadata: `{ "retentionDays"?: number }` (default 30).

use serde_json::{json, Value};

use crate::db::{Db, Filter, Op, Query};
use crate::error::AppResult;
use crate::ids;
use crate::reqresp::{JobExecution, JobOutcome};
use crate::seams::HostSeams;
use crate::time;

#[path = "cleanup_prune.rs"]
mod prune;

const DEFAULT_RETENTION_DAYS: i64 = 30;

pub fn run<S: HostSeams>(seams: &S, exec: &JobExecution) -> AppResult<JobOutcome> {
    let retention = exec
        .metadata()
        .get("retentionDays")
        .and_then(Value::as_i64)
        .unwrap_or(DEFAULT_RETENTION_DAYS)
        .clamp(1, 3650);
    // This exported cleanup boundary proves the exact marker before every
    // other host-backed scan or effect, including direct invocations in tests.
    let cart_rate_windows = crate::versioned_cart::cleanup_expired_rate_windows(seams, 128)?;
    let checkout_settlements = crate::checkout_contract::reconcile_settlements(seams, 100)?;
    let stripe_payments = crate::routes::webhooks::reconcile_payments(seams, 100)?;
    let access_pass_ephemera = crate::routes::access_pass_jobs::cleanup_expired(seams, 100)?;
    let ucp_sessions = crate::ucp::expired(seams)?;
    let now = seams.now_unix_secs();
    let cutoff = time::iso8601(now - retention * 86_400);
    let db = Db::new(seams, ids::DB_ACCESS);

    let settled_outbox_query = Query::new()
        .filter(Filter::new("createdAt", Op::Lt, cutoff))
        .filter(Filter::new("status", Op::Ne, "pending"))
        .filter(Filter::new("status", Op::Ne, "leased"));
    let deleted = prune::expired(&db, &settled_outbox_query, now)?;

    Ok(JobOutcome::succeeded(json!({
        "deleted": deleted,
        "ucpSessionsDeleted": ucp_sessions,
        "checkoutSettlements": checkout_settlements,
        "stripePaymentsSettled": stripe_payments,
        "cartRateWindowsDeleted": cart_rate_windows,
        "accessPassEphemeraDeleted": access_pass_ephemera,
    })))
}

#[cfg(test)]
#[path = "cleanup_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "cleanup_cart_tests.rs"]
mod cart_tests;
