use serde_json::{json, Value};

use crate::fake::FakeSeams;
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};

const LARGE_LEDGER_ROWS: usize = 501;

fn admin_ctx(claims: &[&str]) -> String {
    json!({
        "authenticated": true,
        "permissionClaims": claims,
        "csrfVerified": true
    })
    .to_string()
}

fn request(route_id: &str, path: &str) -> RouteRequest {
    request_with_query(route_id, path, &[])
}

fn request_with_query(route_id: &str, path: &str, query: &[(&str, &str)]) -> RouteRequest {
    RouteRequest {
        route_id: route_id.into(),
        method: "GET".into(),
        path: path.into(),
        query: query
            .iter()
            .map(|(name, value)| (name.to_string(), value.to_string()))
            .collect(),
        context_json: admin_ctx(&[ids::ROUTE_ADMIN]),
        ..Default::default()
    }
}

fn body(resp: &RouteResponse) -> Value {
    serde_json::from_str(&resp.body).expect("json response")
}

fn seed_payment(seams: &FakeSeams, index: usize, gross_cents: i64) -> String {
    let id = format!("ord_{index:04}");
    let paid_at = format!("2026-01-01T00:{:02}:{:02}Z", index / 60, index % 60);
    seams.seed(
        ids::MODEL_LEDGER,
        &id,
        json!({
            "reference": id,
            "id": id,
            "kind": "payment",
            "status": "succeeded",
            "grossCents": gross_cents,
            "currency": "USD",
            "method": "stripe",
            "provider": "stripe",
            "productId": "prod_test",
            "createdAt": paid_at,
            "processedAt": paid_at
        }),
    );
    id
}

fn seed_large_payment_ledger(seams: &FakeSeams, gross_cents: i64) {
    for index in 0..LARGE_LEDGER_ROWS {
        seed_payment(seams, index, gross_cents);
    }
}

fn response_ids(resp: &RouteResponse, field: &str) -> Vec<String> {
    body(resp)[field]
        .as_array()
        .expect("array field")
        .iter()
        .map(|item| item["id"].as_str().expect("id").to_string())
        .collect()
}

#[test]
fn order_detail_reaches_payment_beyond_scan_window_and_preserves_404s() {
    let seams = FakeSeams::new();
    seed_large_payment_ledger(&seams, 100);
    seams.seed(
        ids::MODEL_LEDGER,
        "aaa_refund",
        json!({
            "reference": "aaa_refund",
            "kind": "refund",
            "status": "succeeded",
            "grossCents": 100,
            "currency": "USD",
            "provider": "stripe",
            "createdAt": "2026-01-01T00:00:00Z",
            "processedAt": "2026-01-01T00:00:00Z"
        }),
    );

    let refund = crate::router::handle_route(
        &seams,
        request(ids::ROUTE_ADMIN_ORDERS_GET, "/admin/orders/aaa_refund"),
    );
    assert_eq!(refund.status, 404, "non-payment ledger rows are not orders");

    let missing = crate::router::handle_route(
        &seams,
        request(ids::ROUTE_ADMIN_ORDERS_GET, "/admin/orders/ord_missing"),
    );
    assert_eq!(missing.status, 404, "unknown order ids remain 404s");

    let target = crate::router::handle_route(
        &seams,
        request(ids::ROUTE_ADMIN_ORDERS_GET, "/admin/orders/ord_0500"),
    );
    assert_eq!(target.status, 200, "order detail should read by key");
    assert_eq!(body(&target)["order"]["id"], "ord_0500");
}

#[test]
fn transactions_and_orders_default_to_newest_first() {
    let seams = FakeSeams::new();
    seed_large_payment_ledger(&seams, 100);
    let expected = vec![
        "ord_0500".to_string(),
        "ord_0499".to_string(),
        "ord_0498".to_string(),
    ];

    let transactions = crate::router::handle_route(
        &seams,
        request_with_query(
            ids::ROUTE_ADMIN_TRANSACTIONS_LIST,
            "/admin/transactions",
            &[("limit", "3")],
        ),
    );
    assert_eq!(transactions.status, 200);
    let transaction_body = body(&transactions);
    assert_eq!(response_ids(&transactions, "transactions"), expected);
    assert_eq!(transaction_body["count"], 3);
    assert_eq!(transaction_body["total"], LARGE_LEDGER_ROWS as i64);
    assert_eq!(transaction_body["hasMore"], true);

    let orders = crate::router::handle_route(
        &seams,
        request_with_query(
            ids::ROUTE_ADMIN_ORDERS_LIST,
            "/admin/orders",
            &[("limit", "3")],
        ),
    );
    assert_eq!(orders.status, 200);
    let order_body = body(&orders);
    assert_eq!(response_ids(&orders, "orders"), expected);
    assert_eq!(order_body["count"], 3);
    assert_eq!(order_body["total"], LARGE_LEDGER_ROWS as i64);
    assert_eq!(order_body["hasMore"], true);
}

#[test]
fn transactions_and_orders_apply_offset_after_newest_first_order() {
    let seams = FakeSeams::new();
    seed_large_payment_ledger(&seams, 100);
    let expected = vec![
        "ord_0002".to_string(),
        "ord_0001".to_string(),
        "ord_0000".to_string(),
    ];

    let transactions = crate::router::handle_route(
        &seams,
        request_with_query(
            ids::ROUTE_ADMIN_TRANSACTIONS_LIST,
            "/admin/transactions",
            &[("limit", "3"), ("offset", "498")],
        ),
    );
    assert_eq!(transactions.status, 200);
    assert_eq!(body(&transactions)["hasMore"], false);
    assert_eq!(response_ids(&transactions, "transactions"), expected);

    let orders = crate::router::handle_route(
        &seams,
        request_with_query(
            ids::ROUTE_ADMIN_ORDERS_LIST,
            "/admin/orders",
            &[("limit", "3"), ("offset", "498")],
        ),
    );
    assert_eq!(orders.status, 200);
    assert_eq!(body(&orders)["hasMore"], false);
    assert_eq!(response_ids(&orders, "orders"), expected);
}

#[test]
fn stats_totals_include_rows_beyond_scan_window() {
    let seams = FakeSeams::new();
    seed_large_payment_ledger(&seams, 100);

    let stats =
        crate::router::handle_route(&seams, request(ids::ROUTE_ADMIN_STATS, "/admin/stats"));
    assert_eq!(stats.status, 200);
    let out = body(&stats);
    assert_eq!(out["totalTransactions"], LARGE_LEDGER_ROWS as i64);
    assert_eq!(
        out["transactionsByMethod"]["stripe"],
        LARGE_LEDGER_ROWS as i64
    );
    assert_eq!(out["totalRevenue"], LARGE_LEDGER_ROWS as f64);
    assert_eq!(out["orders"]["total"], LARGE_LEDGER_ROWS as i64);
    assert_eq!(out["orders"]["paid"], LARGE_LEDGER_ROWS as i64);
    assert_eq!(out["orders"]["revenue"], LARGE_LEDGER_ROWS as f64);
}

#[test]
fn refunds_list_shows_recent_requests_beyond_scan_window() {
    let seams = FakeSeams::new();
    seed_large_payment_ledger(&seams, 100);
    // A refund requested AFTER 501 payment rows exist must still be visible —
    // the old 500-row oldest-first scan dropped exactly these actionable rows.
    seams.seed(
        ids::MODEL_LEDGER,
        "refund_recent",
        json!({
            "reference": "refund_recent",
            "id": "refund_recent",
            "kind": "refund",
            "status": "pending",
            "grossCents": 100,
            "currency": "USD",
            "provider": "x402",
            "paymentMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "refundAmountMicrounits": 1_000_000,
            "tokenDecimals": 6,
            "signingAttempt": {"request": {}, "response": {
                "status": "failed", "errorCode": "refund_signer_unavailable",
                "retryable": true, "operationId": null
            }},
            "createdAt": "2026-02-01T00:00:00Z",
            "processedAt": "2026-02-01T00:00:00Z"
        }),
    );

    let resp = crate::router::handle_route(
        &seams,
        request(ids::ROUTE_ADMIN_REFUNDS_LIST, "/admin/refunds"),
    );
    assert_eq!(resp.status, 200);
    let out = body(&resp);
    assert_eq!(out["refunds"][0]["id"], "refund_recent");
    assert_eq!(out["refunds"][0]["refundAmountMicrounits"], 1_000_000);
    assert_eq!(out["refunds"][0]["tokenDecimals"], 6);
    assert_eq!(out["refunds"][0]["signingStarted"], true);
    assert_eq!(
        out["refunds"][0]["providerErrorCode"],
        "refund_signer_unavailable"
    );
    assert_eq!(out["refunds"][0]["providerRetryable"], true);
    assert_eq!(out["total"], 1);
    assert_eq!(out["truncated"], false);
    assert_eq!(out["hasMore"], false);
}

#[test]
fn scan_cap_is_reported_not_silent_at_the_real_limit() {
    let seams = FakeSeams::new();
    // One row past the 10,000-row admin scan cap. Timestamps stay distinct so
    // the assertion is order-independent.
    for index in 0..10_001usize {
        let id = format!("cap_{index:05}");
        let at = format!(
            "2026-01-01T{:02}:{:02}:{:02}Z",
            index / 3600,
            (index / 60) % 60,
            index % 60
        );
        seams.seed(
            ids::MODEL_LEDGER,
            &id,
            json!({
                "reference": id,
                "id": id,
                "kind": "payment",
                "status": "succeeded",
                "grossCents": 1,
                "currency": "USD",
                "provider": "stripe",
                "createdAt": at,
                "processedAt": at
            }),
        );
    }

    let scan = super::support::ledger_page(&seams, "cap test", 0, 10_000, |value| Ok(Some(value)))
        .expect("scan");
    assert!(scan.truncated, "the +1 page fetch must detect the cap");
    assert_eq!(scan.entries.len(), 10_000);
    assert!(
        seams
            .logs
            .borrow()
            .iter()
            .any(|(level, message)| level == "warn" && message.contains("truncated")),
        "hitting the cap must warn-log"
    );

    // The operator-facing contract: the response says the data is partial.
    let resp = crate::router::handle_route(
        &seams,
        request_with_query(
            ids::ROUTE_ADMIN_TRANSACTIONS_LIST,
            "/admin/transactions",
            &[("limit", "1")],
        ),
    );
    assert_eq!(resp.status, 200);
    let out = body(&resp);
    assert_eq!(out["truncated"], true);
    assert_eq!(out["hasMore"], true);
}

#[test]
fn transactions_search_filters_the_whole_ledger_before_paging() {
    let seams = FakeSeams::new();
    seed_large_payment_ledger(&seams, 100);

    // `ord_0050` is far outside the first unfiltered page, so matching it
    // proves search runs across the scan rather than over the page in hand.
    let response = crate::router::handle_route(
        &seams,
        request_with_query(
            ids::ROUTE_ADMIN_TRANSACTIONS_LIST,
            "/admin/transactions",
            &[("limit", "3"), ("search", "ORD_0050")],
        ),
    );

    assert_eq!(response.status, 200);
    let payload = body(&response);
    assert_eq!(
        response_ids(&response, "transactions"),
        vec!["ord_0050".to_string()],
        "search must be case-insensitive"
    );
    assert_eq!(payload["total"], 1, "total describes the filtered set");
    assert_eq!(payload["count"], 1);
    assert_eq!(payload["hasMore"], false);
    assert_eq!(
        payload["search"], "ORD_0050",
        "the applied term is echoed verbatim so clients can detect support"
    );
}

#[test]
fn transactions_search_reports_no_matches_and_ignores_a_blank_term() {
    let seams = FakeSeams::new();
    seed_large_payment_ledger(&seams, 100);

    let no_match = crate::router::handle_route(
        &seams,
        request_with_query(
            ids::ROUTE_ADMIN_TRANSACTIONS_LIST,
            "/admin/transactions",
            &[("search", "no-such-payment")],
        ),
    );
    assert_eq!(no_match.status, 200);
    assert_eq!(body(&no_match)["total"], 0);
    assert!(response_ids(&no_match, "transactions").is_empty());

    // A whitespace-only term is not a filter: it must not empty the table.
    let blank = crate::router::handle_route(
        &seams,
        request_with_query(
            ids::ROUTE_ADMIN_TRANSACTIONS_LIST,
            "/admin/transactions",
            &[("limit", "3"), ("search", "   ")],
        ),
    );
    assert_eq!(blank.status, 200);
    let blank_body = body(&blank);
    assert_eq!(blank_body["total"], LARGE_LEDGER_ROWS as i64);
    assert!(blank_body["search"].is_null());
}

#[test]
fn durable_orders_and_delivery_receipts_do_not_consume_legacy_ledger_scan_budget() {
    let seams = crate::fake::FakeSeams::new();
    for (key, kind) in [
        ("payment", "payment"),
        ("order", "order"),
        ("delivery", "fulfillment"),
    ] {
        seams.seed(
            crate::ids::MODEL_LEDGER,
            key,
            serde_json::json!({"kind":kind,"reference":key}),
        );
    }
    // Missing-kind legacy payments must still pass the host's `ne` filters.
    seams.seed(
        crate::ids::MODEL_LEDGER,
        "legacy",
        serde_json::json!({"reference":"legacy"}),
    );
    for direction in [crate::db::Dir::Asc, crate::db::Dir::Desc] {
        let mut entries = Vec::new();
        let truncated =
            super::support::visit_ledger(&seams, "legacy compatibility", direction, |entry| {
                entries.push(entry);
                Ok(())
            })
            .unwrap();
        assert!(!truncated);
        assert_eq!(entries.len(), 2);
        assert!(entries.iter().any(|entry| entry["kind"] == "payment"));
        assert!(entries.iter().any(|entry| entry["reference"] == "legacy"));
    }
}
