//! `GET /stats/v1/summary` — operator-aggregate RevenueSummary.
//!
//! Admin-gated. Blocks are capability-scoped: revenue/timeseries/topRoutes/
//! topProducts require the `balance-read` claim; subscriptions requires
//! `subscription-read`. Reads pre-rolled daily summaries (never ledger rows or
//! buyer identifiers). The result is exactly the host-handoff contract shape.

use crate::ctx::RequestContext;
use std::collections::BTreeMap;

use serde_json::{json, Value};

use crate::db::{Db, Dir, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::models::DailySummary;
use crate::money;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::seams::HostSeams;
use crate::summary::{self, BlockSet, SummaryInput};
use crate::time;

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ids::ROUTE_STATS,
    method: "GET",
    path: "/stats/v1/summary",
}];

const CLAIM_BALANCE: &str = "cedros-pay:balance-read";
const CLAIM_SUBS: &str = "cedros-pay:subscription-read";
const TOP_LIMIT: usize = 10;
const DEFAULT_MIN_ATTRIBUTION: i64 = 5;
const MAX_TIMESERIES_DAYS: usize = 400;
const ROLLUP_PAGE_SIZE: i64 = 200;
const MAX_ALL_TIME_DAYS: usize = 10_000;
const MAX_ALL_TIME_PAGES: usize = MAX_ALL_TIME_DAYS / ROLLUP_PAGE_SIZE as usize + 1;

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !req.method.eq_ignore_ascii_case("GET") {
        return Err(AppError::not_found("unknown stats route"));
    }
    let ctx = RequestContext::parse(&req.context_json);
    ctx.require_admin()?;
    let has_balance = ctx.has_claim(CLAIM_BALANCE);
    let has_subs = ctx.has_claim(CLAIM_SUBS);
    if !has_balance && !has_subs {
        return Err(AppError::forbidden(
            "requires the balance-read or subscription-read capability",
        ));
    }

    let window = req.query_value("window").unwrap_or("P30D").to_string();
    let now = seams.now_unix_secs();
    let bounds = window_bounds(&window, now)
        .ok_or_else(|| AppError::bad_request(format!("unknown window: {window}")))?;

    let requested = Requested::parse(req.query_value("include"));
    let include = BlockSet {
        revenue: requested.revenue && has_balance,
        timeseries: requested.timeseries && has_balance,
        top_routes: requested.top_routes && has_balance,
        top_products: requested.top_products && has_balance,
        subscriptions: requested.subscriptions && has_subs,
    };
    let min_attribution = req
        .query_value("minAttributionTxnCount")
        .and_then(|s| s.parse().ok())
        .unwrap_or(DEFAULT_MIN_ATTRIBUTION);

    let currency = seams
        .setting_get(ids::SETTING_CURRENCY)?
        .map(|c| money::normalize_currency(&c))
        .unwrap_or_else(|| money::DEFAULT_CURRENCY.to_string());

    let rows = read_rollup(seams, bounds, &currency)?;
    let mut out = summary::build(SummaryInput {
        currency: currency.clone(),
        window_label: &window,
        window_start_iso: time::iso8601(bounds.0),
        window_end_iso: time::iso8601(bounds.1),
        rows,
        include,
        min_attribution_txn_count: min_attribution,
        top_limit: TOP_LIMIT,
        timeseries_limit: MAX_TIMESERIES_DAYS,
    });
    if requested.comparison && has_balance {
        if let Some(previous) = comparison_bounds(bounds) {
            let previous_rows = read_rollup(seams, previous, &currency)?;
            let previous_gross = previous_rows
                .iter()
                .fold(0, |total, row| money::add(total, row.gross_cents));
            let previous_txns = previous_rows
                .iter()
                .fold(0, |total, row| money::add(total, row.txn_count));
            out.as_object_mut().expect("summary object").insert(
                "comparison".into(),
                json!({
                    "previousGrossCents": previous_gross,
                    "previousTxnCount": previous_txns,
                    "previousWindowStart": time::iso8601(previous.0),
                    "previousWindowEnd": time::iso8601(previous.1),
                }),
            );
        }
    }
    enrich_top_products(seams, &mut out)?;
    Ok(RouteResponse::ok(&out))
}

/// `(start_secs, end_secs)`; `start_secs == 0` means "no lower bound" (PALL).
fn window_bounds(window: &str, now: i64) -> Option<(i64, i64)> {
    let end = time::day_start_secs(now);
    let day = 86_400;
    let start = match window {
        "P7D" => end - 7 * day,
        "P30D" => end - 30 * day,
        "P90D" => end - 90 * day,
        "PYTD" => {
            let year = &time::date_str(now)[..4];
            time::parse_date(&format!("{year}-01-01"))?
        }
        "PALL" => 0,
        _ => return None,
    };
    Some((start, end))
}

/// Equal-length window immediately preceding a bounded current window. PALL
/// has no finite predecessor, so its opt-in comparison block is omitted.
fn comparison_bounds((start, end): (i64, i64)) -> Option<(i64, i64)> {
    if start <= 0 || end <= start {
        return None;
    }
    Some((start.checked_sub(end - start)?, start))
}

fn read_rollup<S: HostSeams>(
    seams: &S,
    (start, end): (i64, i64),
    currency: &str,
) -> AppResult<Vec<DailySummary>> {
    let db = Db::new(seams, ids::DB_ACCESS);
    let mut q =
        Query::new()
            .order("day", Dir::Asc)
            .filter(Filter::new("day", Op::Lt, time::date_str(end)));
    if start > 0 {
        q = q.filter(Filter::new("day", Op::Gte, time::date_str(start)));
    }
    let entries = if start <= 0 {
        let entries = db.read_paged(ids::MODEL_ROLLUP, &q, ROLLUP_PAGE_SIZE, MAX_ALL_TIME_PAGES)?;
        if entries.len() > MAX_ALL_TIME_DAYS {
            return Err(AppError::unprocessable(
                "all-time stats exceed the bounded rollup scan",
            ));
        }
        entries
    } else {
        db.read(
            ids::MODEL_ROLLUP,
            &q.limit(((end - start) / 86_400 + 2).min(MAX_TIMESERIES_DAYS as i64)),
        )?
    };
    entries
        .iter()
        .map(|entry| {
            let row: DailySummary = entry.parse()?;
            if !row.currency.eq_ignore_ascii_case(currency) {
                return Err(AppError::unprocessable(
                    "stats rows differ from the configured reporting currency",
                ));
            }
            Ok(row)
        })
        .collect()
}

fn enrich_top_products<S: HostSeams>(seams: &S, out: &mut Value) -> AppResult<()> {
    let Some(products) = out.get_mut("topProducts").and_then(Value::as_array_mut) else {
        return Ok(());
    };
    let product_ids = products
        .iter()
        .filter_map(|row| row.get("productId").and_then(Value::as_str))
        .map(str::to_string)
        .collect::<Vec<_>>();
    if product_ids.is_empty() {
        return Ok(());
    }

    let entries = Db::new(seams, ids::DB_ACCESS).read(
        ids::MODEL_CATALOG,
        &Query {
            entry_keys: product_ids,
            limit: Some(TOP_LIMIT as i64),
            ..Default::default()
        },
    )?;
    let catalog = entries
        .into_iter()
        .map(|entry| (entry.entry_key, entry.payload))
        .collect::<BTreeMap<_, _>>();

    for row in products {
        let Some(product_id) = row
            .get("productId")
            .and_then(Value::as_str)
            .map(str::to_string)
        else {
            continue;
        };
        let Some(product) = catalog.get(&product_id) else {
            continue;
        };
        let object = row.as_object_mut().expect("top product object");
        if let Some(name) =
            super::products::first_string(product, &["displayName", "title", "name"])
        {
            object.insert("productName".into(), Value::String(name));
        }
        if let Some(slug) = super::products::string_field(product, "slug")
            .filter(|slug| super::products::valid_public_slug(slug))
        {
            object.insert("productSlug".into(), Value::String(slug));
        }
    }
    Ok(())
}

struct Requested {
    revenue: bool,
    subscriptions: bool,
    timeseries: bool,
    top_routes: bool,
    top_products: bool,
    comparison: bool,
}

impl Requested {
    /// `None`/empty `include` requests every block; otherwise the named set.
    fn parse(include: Option<&str>) -> Self {
        match include.map(str::trim).filter(|s| !s.is_empty()) {
            None => Self {
                revenue: true,
                subscriptions: true,
                timeseries: true,
                top_routes: true,
                top_products: true,
                comparison: false,
            },
            Some(list) => {
                let set: Vec<&str> = list.split(',').map(str::trim).collect();
                Self {
                    revenue: set.contains(&"revenue"),
                    subscriptions: set.contains(&"subscriptions"),
                    timeseries: set.contains(&"timeseries"),
                    top_routes: set.contains(&"topRoutes"),
                    top_products: set.contains(&"topProducts"),
                    comparison: set.contains(&"comparison"),
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fake::FakeSeams;
    use serde_json::json;

    fn ctx(claims: &[&str]) -> String {
        json!({ "authenticated": true, "permissionClaims": claims }).to_string()
    }

    fn seed_day(s: &FakeSeams, day: &str, gross: i64, refund: i64, txns: i64) {
        s.seed(
            ids::MODEL_ROLLUP,
            day,
            json!({
                "day": day, "bucketStart": format!("{day}T00:00:00Z"), "currency": "USD",
                "grossCents": gross, "refundCents": refund, "txnCount": txns,
                "routes": [], "products": []
            }),
        );
    }

    fn req(query: Vec<(&str, &str)>, claims: &[&str]) -> RouteRequest {
        RouteRequest {
            route_id: ids::ROUTE_STATS.into(),
            method: "GET".into(),
            path: "/stats/v1/summary".into(),
            query: query
                .into_iter()
                .map(|(k, v)| (k.into(), v.into()))
                .collect(),
            context_json: ctx(claims),
            ..Default::default()
        }
    }

    #[test]
    fn unauthenticated_fails_closed() {
        let s = FakeSeams::new();
        let mut r = req(vec![], &[CLAIM_BALANCE]);
        r.context_json = json!({ "authenticated": false }).to_string();
        let resp = crate::router::handle_route(&s, r);
        assert_eq!(resp.status, 401);
    }

    #[test]
    fn missing_capability_is_forbidden() {
        let s = FakeSeams::new();
        let resp = crate::router::handle_route(&s, req(vec![], &[]));
        assert_eq!(resp.status, 403);
    }

    #[test]
    fn balance_caller_gets_revenue_within_window() {
        let s = FakeSeams::new(); // now = 2026-05-31T12:00Z
        seed_day(&s, "2026-05-30", 10_000, 1_000, 5);
        seed_day(&s, "2026-05-29", 5_000, 0, 3);
        seed_day(&s, "2026-01-01", 99_999, 0, 9); // outside P7D
        let resp = handle(
            &s,
            &req(
                vec![("window", "P7D"), ("include", "revenue")],
                &[CLAIM_BALANCE],
            ),
        )
        .unwrap();
        assert_eq!(resp.status, 200);
        let body: serde_json::Value = serde_json::from_str(&resp.body).unwrap();
        assert_eq!(body["grossCents"], 15_000);
        assert_eq!(body["netCents"], 14_000);
        assert_eq!(body["window"], "P7D");
    }

    #[test]
    fn comparison_returns_immediately_preceding_equal_window() {
        let s = FakeSeams::new(); // now = 2026-05-31T12:00Z
        seed_day(&s, "2026-05-29", 10_000, 0, 5);
        seed_day(&s, "2026-05-18", 7_000, 0, 4);
        let resp = handle(
            &s,
            &req(
                vec![("window", "P7D"), ("include", "comparison")],
                &[CLAIM_BALANCE],
            ),
        )
        .unwrap();
        let body: Value = serde_json::from_str(&resp.body).unwrap();
        assert_eq!(body["comparison"]["previousGrossCents"], 7_000);
        assert_eq!(body["comparison"]["previousTxnCount"], 4);
        assert_eq!(
            body["comparison"]["previousWindowStart"],
            "2026-05-17T00:00:00Z"
        );
        assert_eq!(
            body["comparison"]["previousWindowEnd"],
            "2026-05-24T00:00:00Z"
        );
        assert!(body.get("grossCents").is_none());
    }

    #[test]
    fn all_time_has_no_comparison_predecessor() {
        let s = FakeSeams::new();
        let resp = handle(
            &s,
            &req(
                vec![("window", "PALL"), ("include", "comparison")],
                &[CLAIM_BALANCE],
            ),
        )
        .unwrap();
        let body: Value = serde_json::from_str(&resp.body).unwrap();
        assert!(body.get("comparison").is_none());
    }

    #[test]
    fn top_products_include_catalog_name_and_valid_slug() {
        let s = FakeSeams::new();
        s.seed(
            ids::MODEL_ROLLUP,
            "2026-05-30",
            json!({
                "day": "2026-05-30", "bucketStart": "2026-05-30T00:00:00Z",
                "currency": "USD", "grossCents": 12_000, "refundCents": 0,
                "txnCount": 6, "routes": [],
                "products": [{ "key": "pro-plan-annual", "grossCents": 12_000, "txnCount": 6 }]
            }),
        );
        s.seed(
            ids::MODEL_CATALOG,
            "pro-plan-annual",
            json!({ "title": "Pro plan (annual)", "slug": "pro-plan-annual" }),
        );
        let resp = handle(&s, &req(vec![("include", "topProducts")], &[CLAIM_BALANCE])).unwrap();
        let body: Value = serde_json::from_str(&resp.body).unwrap();
        assert_eq!(body["topProducts"][0]["productId"], "pro-plan-annual");
        assert_eq!(body["topProducts"][0]["productName"], "Pro plan (annual)");
        assert_eq!(body["topProducts"][0]["productSlug"], "pro-plan-annual");
    }

    #[test]
    fn all_time_totals_are_complete_while_timeseries_is_capped() {
        let s = FakeSeams::new();
        let end = time::day_start_secs(s.now_unix_secs());
        for offset in 1..=401 {
            seed_day(
                &s,
                &time::date_str(end - i64::from(offset) * 86_400),
                100,
                0,
                1,
            );
        }
        let resp = handle(
            &s,
            &req(
                vec![("window", "PALL"), ("include", "revenue,timeseries")],
                &[CLAIM_BALANCE],
            ),
        )
        .unwrap();
        let body: Value = serde_json::from_str(&resp.body).unwrap();
        assert_eq!(body["grossCents"], 40_100);
        assert_eq!(body["txnCount"], 401);
        assert_eq!(body["timeseries"].as_array().unwrap().len(), 400);
    }

    #[test]
    fn subscription_block_requires_subscription_claim() {
        let s = FakeSeams::new();
        seed_day(&s, "2026-05-30", 10_000, 0, 5);
        // balance-only caller asking for subscriptions: block omitted, not 403
        let resp = handle(
            &s,
            &req(vec![("include", "subscriptions")], &[CLAIM_BALANCE]),
        )
        .unwrap();
        let body: serde_json::Value = serde_json::from_str(&resp.body).unwrap();
        assert!(body.get("subscriptions").is_none());
    }

    #[test]
    fn rejects_unknown_window() {
        let s = FakeSeams::new();
        let resp = crate::router::handle_route(&s, req(vec![("window", "P1Y")], &[CLAIM_BALANCE]));
        assert_eq!(resp.status, 400);
    }
    #[test]
    fn incompatible_currency_and_corrupt_rollups_fail_closed_in_both_windows() {
        for day in ["2026-05-29", "2026-05-18"] {
            for invalid in [json!({"currency":"EUR"}), json!({"grossCents":"invalid"})] {
                let s = FakeSeams::new();
                seed_day(&s, day, 1000, 0, 1);
                let mut row = s.get_entry(ids::MODEL_ROLLUP, day).unwrap();
                row.as_object_mut()
                    .unwrap()
                    .extend(invalid.as_object().unwrap().clone());
                s.seed(ids::MODEL_ROLLUP, day, row);
                assert!(handle(
                    &s,
                    &req(
                        vec![("window", "P7D"), ("include", "revenue,comparison")],
                        &[CLAIM_BALANCE]
                    )
                )
                .is_err());
            }
        }
    }
}
