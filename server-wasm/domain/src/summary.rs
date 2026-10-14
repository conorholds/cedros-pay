//! Aggregates pre-rolled `DailySummary` rows into the operator-aggregate
//! `RevenueSummary` the stats route returns. Block inclusion is decided by the
//! caller (capability-gated); this module only assembles what it is told to.

use std::collections::BTreeMap;

use serde_json::{json, Value};

use crate::models::DailySummary;
use crate::money;

/// Which blocks to emit (already filtered by requested `include` ∩ granted
/// capabilities by the route handler).
#[derive(Debug, Clone, Copy, Default)]
pub struct BlockSet {
    pub revenue: bool,
    pub subscriptions: bool,
    pub timeseries: bool,
    pub top_routes: bool,
    pub top_products: bool,
}

pub struct SummaryInput<'a> {
    pub currency: String,
    pub window_label: &'a str,
    pub window_start_iso: String,
    pub window_end_iso: String,
    pub rows: Vec<DailySummary>,
    pub include: BlockSet,
    pub min_attribution_txn_count: i64,
    pub top_limit: usize,
    pub timeseries_limit: usize,
}

/// Builds the `RevenueSummary` JSON, including only permitted blocks. Buyer
/// identifiers and per-row ledger detail are never emitted.
pub fn build(input: SummaryInput<'_>) -> Value {
    let mut out = json!({
        "currency": input.currency,
        "window": input.window_label,
        "windowStart": input.window_start_iso,
        "windowEnd": input.window_end_iso,
    });
    let map = out.as_object_mut().expect("object");

    if input.include.revenue {
        let gross: i64 = input
            .rows
            .iter()
            .fold(0, |a, r| money::add(a, r.gross_cents));
        let refund: i64 = input
            .rows
            .iter()
            .fold(0, |a, r| money::add(a, r.refund_cents));
        let txns: i64 = input.rows.iter().fold(0, |a, r| money::add(a, r.txn_count));
        map.insert("grossCents".into(), json!(gross));
        map.insert("netCents".into(), json!(money::sub(gross, refund)));
        map.insert("refundCents".into(), json!(refund));
        map.insert("txnCount".into(), json!(txns));
    }

    if input.include.timeseries {
        let mut series: Vec<&DailySummary> = input.rows.iter().collect();
        series.sort_by(|a, b| a.bucket_start.cmp(&b.bucket_start));
        if series.len() > input.timeseries_limit {
            series.drain(..series.len() - input.timeseries_limit);
        }
        let points: Vec<Value> = series
            .iter()
            .map(|r| json!({ "bucketStart": r.bucket_start, "grossCents": r.gross_cents, "txnCount": r.txn_count }))
            .collect();
        map.insert("timeseries".into(), json!(points));
    }

    if input.include.top_routes {
        let key = "routePath";
        map.insert(
            "topRoutes".into(),
            top_attribution(
                &input.rows,
                |r| &r.routes,
                key,
                input.min_attribution_txn_count,
                input.top_limit,
            ),
        );
    }
    if input.include.top_products {
        let key = "productId";
        map.insert(
            "topProducts".into(),
            top_attribution(
                &input.rows,
                |r| &r.products,
                key,
                input.min_attribution_txn_count,
                input.top_limit,
            ),
        );
    }

    if input.include.subscriptions {
        // Use the most recent day that carries a subscription snapshot.
        let snap = input
            .rows
            .iter()
            .filter(|r| r.subscriptions.is_some())
            .max_by(|a, b| a.day.cmp(&b.day))
            .and_then(|r| r.subscriptions.as_ref());
        if let Some(s) = snap {
            map.insert(
                "subscriptions".into(),
                json!({
                    "mrrCents": s.mrr_cents,
                    "arrCents": s.arr_cents,
                    "activeCount": s.active_count,
                    "churn30d": s.churn30d,
                }),
            );
        } else {
            map.insert(
                "subscriptions".into(),
                json!({ "mrrCents": 0, "arrCents": 0, "activeCount": 0, "churn30d": null }),
            );
        }
    }

    out
}

/// Sums per-key gross/txn across rows, elides keys below the attribution
/// threshold, sorts by gross desc, and returns the top `limit` as
/// `[{<key>, grossCents}]`.
fn top_attribution(
    rows: &[DailySummary],
    select: impl Fn(&DailySummary) -> &Vec<crate::models::Attribution>,
    key_field: &str,
    min_txn: i64,
    limit: usize,
) -> Value {
    let mut gross: BTreeMap<String, i64> = BTreeMap::new();
    let mut txns: BTreeMap<String, i64> = BTreeMap::new();
    for row in rows {
        for a in select(row) {
            *gross.entry(a.key.clone()).or_default() += a.gross_cents;
            *txns.entry(a.key.clone()).or_default() += a.txn_count;
        }
    }
    let mut items: Vec<(String, i64)> = gross
        .into_iter()
        .filter(|(k, _)| txns.get(k).copied().unwrap_or(0) >= min_txn)
        .collect();
    // gross desc, then key asc for a stable order.
    items.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    items.truncate(limit);
    let arr: Vec<Value> = items
        .into_iter()
        .map(|(k, g)| json!({ key_field: k, "grossCents": g }))
        .collect();
    json!(arr)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::Attribution;

    fn row(day: &str, gross: i64, refund: i64, txns: i64) -> DailySummary {
        DailySummary {
            day: day.to_string(),
            bucket_start: format!("{day}T00:00:00Z"),
            currency: "USD".to_string(),
            gross_cents: gross,
            refund_cents: refund,
            txn_count: txns,
            routes: vec![],
            products: vec![],
            subscriptions: None,
        }
    }

    #[test]
    fn sums_revenue_and_nets_refunds() {
        let input = SummaryInput {
            currency: "USD".into(),
            window_label: "P30D",
            window_start_iso: "2026-05-01T00:00:00Z".into(),
            window_end_iso: "2026-05-31T00:00:00Z".into(),
            rows: vec![
                row("2026-05-30", 10_000, 1_000, 5),
                row("2026-05-31", 5_000, 0, 3),
            ],
            include: BlockSet {
                revenue: true,
                ..Default::default()
            },
            min_attribution_txn_count: 5,
            top_limit: 10,
            timeseries_limit: 400,
        };
        let v = build(input);
        assert_eq!(v["grossCents"], 15_000);
        assert_eq!(v["refundCents"], 1_000);
        assert_eq!(v["netCents"], 14_000);
        assert_eq!(v["txnCount"], 8);
        // unrequested blocks absent
        assert!(v.get("timeseries").is_none());
        assert!(v.get("subscriptions").is_none());
    }

    #[test]
    fn elides_low_traffic_attribution() {
        let mut r = row("2026-05-31", 9_000, 0, 9);
        r.routes = vec![
            Attribution {
                key: "/pricing".into(),
                gross_cents: 8_000,
                txn_count: 8,
            },
            Attribution {
                key: "/blog".into(),
                gross_cents: 1_000,
                txn_count: 2,
            },
        ];
        let input = SummaryInput {
            currency: "USD".into(),
            window_label: "P30D",
            window_start_iso: "x".into(),
            window_end_iso: "y".into(),
            rows: vec![r],
            include: BlockSet {
                top_routes: true,
                ..Default::default()
            },
            min_attribution_txn_count: 5,
            top_limit: 10,
            timeseries_limit: 400,
        };
        let v = build(input);
        let routes = v["topRoutes"].as_array().unwrap();
        assert_eq!(
            routes.len(),
            1,
            "low-traffic /blog elided by minAttribution"
        );
        assert_eq!(routes[0]["routePath"], "/pricing");
        assert_eq!(routes[0]["grossCents"], 8_000);
    }

    #[test]
    fn timeseries_is_sorted_by_bucket() {
        let input = SummaryInput {
            currency: "USD".into(),
            window_label: "P7D",
            window_start_iso: "x".into(),
            window_end_iso: "y".into(),
            rows: vec![
                row("2026-05-31", 5_000, 0, 3),
                row("2026-05-30", 10_000, 0, 5),
            ],
            include: BlockSet {
                timeseries: true,
                ..Default::default()
            },
            min_attribution_txn_count: 1,
            top_limit: 10,
            timeseries_limit: 400,
        };
        let v = build(input);
        let series = v["timeseries"].as_array().unwrap();
        assert_eq!(series[0]["bucketStart"], "2026-05-30T00:00:00Z");
        assert_eq!(series[1]["bucketStart"], "2026-05-31T00:00:00Z");
    }

    #[test]
    fn timeseries_keeps_the_most_recent_bounded_daily_points() {
        let input = SummaryInput {
            currency: "USD".into(),
            window_label: "PALL",
            window_start_iso: "x".into(),
            window_end_iso: "y".into(),
            rows: vec![
                row("2026-05-29", 1_000, 0, 1),
                row("2026-05-31", 3_000, 0, 3),
                row("2026-05-30", 2_000, 0, 2),
            ],
            include: BlockSet {
                timeseries: true,
                ..Default::default()
            },
            min_attribution_txn_count: 1,
            top_limit: 10,
            timeseries_limit: 2,
        };
        let v = build(input);
        let series = v["timeseries"].as_array().unwrap();
        assert_eq!(series.len(), 2);
        assert_eq!(series[0]["bucketStart"], "2026-05-30T00:00:00Z");
        assert_eq!(series[1]["bucketStart"], "2026-05-31T00:00:00Z");
    }

    #[test]
    fn subscription_churn_is_null_when_snapshot_is_unknown() {
        let input = SummaryInput {
            currency: "USD".into(),
            window_label: "P30D",
            window_start_iso: "x".into(),
            window_end_iso: "y".into(),
            rows: vec![],
            include: BlockSet {
                subscriptions: true,
                ..Default::default()
            },
            min_attribution_txn_count: 1,
            top_limit: 10,
            timeseries_limit: 400,
        };
        let v = build(input);
        assert_eq!(v["subscriptions"]["mrrCents"], 0);
        assert!(v["subscriptions"]["churn30d"].is_null());
    }
}
