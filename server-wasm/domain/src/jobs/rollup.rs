//! `cedros-pay:stats-rollup` — aggregates one day's ledger into a `DailySummary`
//! row that the stats route reads. Idempotent (overwrites the day's row) and
//! bounded (paginated, capped). Metadata: `{ "day"?: "YYYY-MM-DD" }` (default:
//! yesterday).

use std::collections::BTreeMap;

use serde_json::{json, Value};

use crate::db::{Db, Dir, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::models::{Attribution, DailySummary, LedgerEntry};
use crate::money;
use crate::reqresp::{JobExecution, JobOutcome};
use crate::seams::HostSeams;
use crate::time;

const ATTRIBUTION_CAP: usize = 50;

pub fn run<S: HostSeams>(seams: &S, exec: &JobExecution) -> AppResult<JobOutcome> {
    let meta = exec.metadata();
    let now = seams.now_unix_secs();
    let day = meta
        .get("day")
        .and_then(Value::as_str)
        .filter(|day| !day.trim().is_empty())
        .map(String::from)
        .unwrap_or_else(|| time::date_str(now - 86_400));
    let day_secs = time::parse_date(&day).ok_or_else(|| AppError::bad_request("invalid day"))?;
    let start_iso = time::iso8601(day_secs);
    let next_iso = time::iso8601(day_secs + 86_400);

    let db = Db::new(seams, ids::DB_ACCESS);
    let query = Query::new()
        .filter(Filter::new("kind", Op::Eq, "payment"))
        .filter(Filter::new("processedAt", Op::Gte, start_iso.clone()))
        .filter(Filter::new("processedAt", Op::Lt, next_iso.clone()));

    // Settled refund rows (their own processed-day): the source of truth for the day's
    // refund outflow. Bucketing by the refund's own processedAt — not the original
    // payment's — keeps `net = gross - refund` stable regardless of when the payment was
    // made vs refunded. Refunded payments remain in gross revenue; their separate
    // refund rows reduce net revenue. Discrete rows avoid double-counting refunds.
    let refund_query = Query::new()
        .filter(Filter::new("kind", Op::Eq, "refund"))
        .filter(Filter::new("status", Op::Eq, "succeeded"))
        .filter(Filter::new("processedAt", Op::Gte, start_iso.clone()))
        .filter(Filter::new("processedAt", Op::Lt, next_iso));

    let mut summary = DailySummary {
        day: day.clone(),
        bucket_start: start_iso,
        currency: default_currency(seams)?,
        ..Default::default()
    };
    let mut routes: BTreeMap<String, (i64, i64)> = BTreeMap::new();
    let mut products: BTreeMap<String, (i64, i64)> = BTreeMap::new();
    visit_day(&db, &query, |entry| {
        if !matches!(entry.status.as_str(), "succeeded" | "refunded") {
            return Ok(());
        }
        require_currency(&summary.currency, &entry.currency)?;
        summary.gross_cents = money::add(summary.gross_cents, entry.gross_cents);
        summary.txn_count += 1;
        if let Some(route) = &entry.route_path {
            accrue(&mut routes, route, entry.gross_cents);
        }
        if let Some(product) = &entry.product_id {
            accrue(&mut products, product, entry.gross_cents);
        }
        Ok(())
    })?;
    visit_day(&db, &refund_query, |refund| {
        require_currency(&summary.currency, &refund.currency)?;
        summary.refund_cents = money::add(summary.refund_cents, refund.gross_cents);
        Ok(())
    })?;
    summary.routes = top(routes);
    summary.products = top(products);

    db.write(ids::MODEL_ROLLUP, &day, &summary)?;
    Ok(JobOutcome::succeeded(json!({
        "day": day,
        "txnCount": summary.txn_count,
        "grossCents": summary.gross_cents,
    })))
}

fn visit_day<S: HostSeams>(
    db: &Db<'_, S>,
    query: &Query,
    mut visit: impl FnMut(LedgerEntry) -> AppResult<()>,
) -> AppResult<()> {
    let query = query.clone().order("createdAt", Dir::Asc);
    let mut seen = 0;
    db.for_each_page(ids::MODEL_LEDGER, &query, 200, 50, |rows| {
        seen += rows.len();
        for row in rows {
            visit(row.parse::<LedgerEntry>()?)?;
        }
        Ok(())
    })?;
    if seen == 10_000
        && !db
            .read(ids::MODEL_LEDGER, &query.limit(1).offset(10_000))?
            .is_empty()
    {
        return Err(AppError::unprocessable(
            "daily rollup exceeds 10000 matching entries; previous summary retained",
        ));
    }
    Ok(())
}

fn require_currency(expected: &str, actual: &str) -> AppResult<()> {
    if !expected.eq_ignore_ascii_case(actual) {
        return Err(AppError::unprocessable(
            "daily rollup currency differs from the configured reporting currency",
        ));
    }
    Ok(())
}

fn default_currency<S: HostSeams>(seams: &S) -> AppResult<String> {
    Ok(seams
        .setting_get(ids::SETTING_CURRENCY)?
        .map(|c| money::normalize_currency(&c))
        .unwrap_or_else(|| money::DEFAULT_CURRENCY.to_string()))
}

fn accrue(map: &mut BTreeMap<String, (i64, i64)>, key: &str, gross: i64) {
    let slot = map.entry(key.to_string()).or_insert((0, 0));
    slot.0 = money::add(slot.0, gross);
    slot.1 += 1;
}

/// Sorts attribution by gross desc and caps the row size.
fn top(map: BTreeMap<String, (i64, i64)>) -> Vec<Attribution> {
    let mut items: Vec<Attribution> = map
        .into_iter()
        .map(|(key, (gross, txns))| Attribution {
            key,
            gross_cents: gross,
            txn_count: txns,
        })
        .collect();
    items.sort_by(|a, b| b.gross_cents.cmp(&a.gross_cents).then(a.key.cmp(&b.key)));
    items.truncate(ATTRIBUTION_CAP);
    items
}

#[cfg(test)]
#[path = "rollup_tests.rs"]
mod tests;
