use serde_json::{json, Value};

use crate::fake::FakeSeams;
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;

fn admin_ctx(claims: &[&str]) -> String {
    json!({
        "authenticated": true, "siteId":"site-a",
        "permissionClaims": claims,
        "csrfVerified": true
    })
    .to_string()
}

fn capability_ctx(route_id: &str) -> String {
    json!({
        "authenticated": true, "siteId":"site-a",
        "csrfVerified": false,
        "authScheme": "bearer-token",
        "permissionClaims": ["data:settings:write"],
        "capabilityClaims": [route_id]
    })
    .to_string()
}

fn request(route_id: &str, method: &str, path: &str) -> RouteRequest {
    RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: path.into(),
        context_json: admin_ctx(&[ids::ROUTE_ADMIN]),
        ..Default::default()
    }
}

fn body(resp: &RouteResponse) -> Value {
    serde_json::from_str(&resp.body).expect("json response")
}

#[test]
fn admin_stats_identifies_non_usd_totals_without_inventing_fx_conversion() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_LEDGER,
        "usd",
        json!({
            "reference":"usd", "kind":"payment", "provider":"stripe",
            "status":"succeeded", "grossCents":1000, "currency":"usd"
        }),
    );
    let req = request(ids::ROUTE_ADMIN_STATS, "GET", "/admin/stats");
    let out = crate::router::handle_route(&seams, req.clone());
    assert_eq!(body(&out)["revenueIncludesNonUsd"], false);
    seams.seed(
        ids::MODEL_LEDGER,
        "jpy",
        json!({
            "reference":"jpy", "kind":"payment", "provider":"stripe",
            "status":"succeeded", "grossCents":500, "currency":"JPY"
        }),
    );
    let out = crate::router::handle_route(&seams, req);
    assert_eq!(body(&out)["revenueIncludesNonUsd"], true);
    assert_eq!(body(&out)["totalTransactions"], 2);
}

#[test]
fn process_stripe_refund_issues_records_and_revokes() {
    let seams = FakeSeams::new();
    seams.set_now(1_700_000_000);
    seams.seed(
        ids::MODEL_LEDGER,
        "pay_1",
        json!({
            "reference": "pay_1", "kind": "payment", "status": "succeeded",
            "grossCents": 1500, "refundCents": 0, "currency": "usd",
            "customerProfileId": "user_1", "productId": "prod_1",
            "provider": "stripe", "providerRef": "pi_abc",
            "createdAt": "2026-01-01T00:00:00Z", "processedAt": "2026-01-01T00:00:00Z"
        }),
    );
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test");
    seams.push_http_response(
        200,
        r#"{"id":"re_1","status":"succeeded","amount":1500,"currency":"usd","charge":"ch_1","payment_intent":"pi_abc"}"#,
    );

    let req = RouteRequest {
        route_id: ids::ROUTE_ADMIN_STRIPE_REFUNDS_PROCESS.into(),
        method: "POST".into(),
        path: "/admin/stripe/refunds/pay_1/process".into(),
        context_json: admin_ctx(&[ids::ROUTE_ADMIN]),
        ..Default::default()
    };
    let resp = super::handle(&seams, &req).expect("dormant Stripe refund handler");
    assert_eq!(resp.status, 200);
    let out = body(&resp);
    assert_eq!(out["processed"], true);
    assert_eq!(out["refundId"], "re_1");

    // Original payment marked refunded (net falls to 0 → entitlement check stops granting).
    let pay = seams.get_entry(ids::MODEL_LEDGER, "pay_1").unwrap();
    assert_eq!(pay["status"], "refunded");
    assert_eq!(pay["refundCents"], 1500);
    // A discrete refund row + the revoke + CRM signals fired.
    assert!(seams.get_entry(ids::MODEL_LEDGER, "re_1").is_some());
    assert_eq!(seams.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
    assert_eq!(seams.crm_events.borrow().len(), 1);

    // Idempotent: re-processing a fully-refunded payment is a no-op success.
    let req2 = RouteRequest {
        route_id: ids::ROUTE_ADMIN_STRIPE_REFUNDS_PROCESS.into(),
        method: "POST".into(),
        path: "/admin/stripe/refunds/pay_1/process".into(),
        context_json: admin_ctx(&[ids::ROUTE_ADMIN]),
        ..Default::default()
    };
    assert_eq!(
        super::handle(&seams, &req2)
            .expect("dormant Stripe refund replay")
            .status,
        200
    );
    assert_eq!(
        seams.event_count(ids::EVENT_ENTITLEMENT_CHANGED),
        1,
        "no double-revoke"
    );
}

#[test]
fn process_credits_refund_credits_back_and_revokes() {
    let seams = FakeSeams::new();
    seams.set_now(1_700_000_000);
    seams.seed(
        ids::MODEL_LEDGER,
        "cpay_1",
        json!({
            "reference": "cpay_1", "kind": "payment", "status": "succeeded",
            "grossCents": 500, "refundCents": 0, "currency": "USD",
            "customerProfileId": "user_2", "productId": "prod_2",
            "provider": "credits", "providerRef": "cpay_1",
            "createdAt": "2026-01-01T00:00:00Z", "processedAt": "2026-01-01T00:00:00Z"
        }),
    );
    let req = RouteRequest {
        route_id: ids::ROUTE_ADMIN_CREDIT_REFUNDS_PROCESS.into(),
        method: "POST".into(),
        path: "/admin/credits/refund-requests/cpay_1/process".into(),
        context_json: admin_ctx(&[ids::ROUTE_ADMIN]),
        ..Default::default()
    };
    let resp = super::handle(&seams, &req).expect("dormant handler characterization");
    assert_eq!(resp.status, 200);
    let out = body(&resp);
    assert_eq!(out["processed"], true);
    assert_eq!(out["balanceCents"], 500, "buyer credited back");

    let pay = seams.get_entry(ids::MODEL_LEDGER, "cpay_1").unwrap();
    assert_eq!(pay["status"], "refunded");
    assert_eq!(pay["refundCents"], 500);
    assert!(seams
        .get_entry(ids::MODEL_LEDGER, "credits-refund:cpay_1")
        .is_some());
    assert_eq!(seams.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);

    let list = super::handle(
        &seams,
        &request(
            ids::ROUTE_ADMIN_CREDIT_REFUND_REQUESTS_LIST,
            "GET",
            "/admin/credits/refund-requests",
        ),
    )
    .expect("credits refund history");
    let listed = body(&list);
    assert_eq!(listed["refunds"][0]["id"], "credits-refund:cpay_1");
    assert_eq!(listed["refunds"][0]["originalTransactionId"], "cpay_1");
    assert_eq!(listed["refunds"][0]["amount"], 5.0);
    assert_eq!(listed["refunds"][0]["currency"], "USD");
    assert_eq!(listed["refunds"][0]["status"], "completed");
}

#[test]
fn loads_products_stats_and_transactions_from_host_storage() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_CATALOG,
        "prod_founders_pass",
        json!({
            "id": "prod_founders_pass",
            "title": "Founders Pass",
            "fiatAmountCents": 1299,
            "fiatCurrency": "USD",
            "active": true,
            "public": true
        }),
    );
    seams.seed(
        ids::MODEL_CATALOG,
        "shipping_profile:default",
        json!({ "kind": "shippingProfile", "id": "default", "name": "Default" }),
    );
    seams.seed(
        ids::MODEL_CATALOG,
        "prod_unpriced_draft",
        json!({
            "id": "prod_unpriced_draft",
            "title": "Unpriced draft",
            "active": true,
            "public": true
        }),
    );
    seams.seed(
        ids::MODEL_CATALOG,
        "coupon:SAVE10",
        json!({ "recordType": "coupon", "code": "SAVE10", "active": true }),
    );
    seams.seed(
        ids::MODEL_LEDGER,
        "txn_1",
        json!({
            "kind": "payment",
            "id": "txn_1",
            "productId": "prod_founders_pass",
            "method": "stripe",
            "grossCents": 1299,
            "currency": "USD",
            "status": "succeeded",
            "processedAt": "2026-06-01T00:00:00Z"
        }),
    );

    let products = crate::router::handle_route(
        &seams,
        request(ids::ROUTE_ADMIN_PRODUCTS_LIST, "GET", "/admin/products"),
    );
    let stats = crate::router::handle_route(
        &seams,
        request(ids::ROUTE_ADMIN_STATS, "GET", "/admin/stats"),
    );
    let transactions = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ADMIN_TRANSACTIONS_LIST,
            "GET",
            "/admin/transactions",
        ),
    );

    assert_eq!(products.status, 200);
    assert_eq!(body(&products)["products"].as_array().unwrap().len(), 2);
    assert!(body(&products)["products"]
        .as_array()
        .unwrap()
        .iter()
        .any(|product| product["id"] == "prod_founders_pass"));

    assert_eq!(stats.status, 200);
    assert_eq!(body(&stats)["activeProducts"], 2);
    assert_eq!(body(&stats)["sellableProducts"], 1);
    assert_eq!(body(&stats)["totalTransactions"], 1);
    assert_eq!(body(&stats)["transactionsByMethod"]["stripe"], 1);

    assert_eq!(transactions.status, 200);
    assert_eq!(
        body(&transactions)["transactions"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
    assert_eq!(body(&transactions)["transactions"][0]["method"], "stripe");
}

#[test]
fn stats_includes_order_lifecycle_breakdown() {
    let seams = FakeSeams::new();
    // A settled (paid) order contributes to revenue.
    seams.seed(
        ids::MODEL_LEDGER,
        "ord_paid",
        json!({
            "reference": "ord_paid", "kind": "payment", "status": "succeeded",
            "grossCents": 1000, "currency": "USD", "method": "stripe",
            "processedAt": "2026-06-01T00:00:00Z"
        }),
    );
    // A refunded order is counted but is not settled (no revenue).
    seams.seed(
        ids::MODEL_LEDGER,
        "ord_refunded",
        json!({
            "reference": "ord_refunded", "kind": "payment", "status": "refunded",
            "grossCents": 500, "currency": "USD", "method": "stripe",
            "processedAt": "2026-06-02T00:00:00Z"
        }),
    );
    // A pending order falls into the catch-all bucket.
    seams.seed(
        ids::MODEL_LEDGER,
        "ord_pending",
        json!({
            "reference": "ord_pending", "kind": "payment", "status": "pending",
            "grossCents": 700, "currency": "USD", "method": "credits",
            "createdAt": "2026-06-03T00:00:00Z"
        }),
    );
    // A failed order is classified into its own bucket (no revenue).
    seams.seed(
        ids::MODEL_LEDGER,
        "ord_failed",
        json!({
            "reference": "ord_failed", "kind": "payment", "status": "failed",
            "grossCents": 300, "currency": "USD", "method": "stripe",
            "createdAt": "2026-06-04T00:00:00Z"
        }),
    );
    // A refund ledger row must NOT be counted as an order.
    seams.seed(
        ids::MODEL_LEDGER,
        "rf_1",
        json!({
            "reference": "rf_1", "kind": "refund", "status": "succeeded",
            "grossCents": 500, "currency": "USD", "provider": "stripe",
            "createdAt": "2026-06-02T00:00:00Z"
        }),
    );

    let stats = crate::router::handle_route(
        &seams,
        request(ids::ROUTE_ADMIN_STATS, "GET", "/admin/stats"),
    );
    assert_eq!(stats.status, 200);
    let out = body(&stats);
    assert_eq!(out["orders"]["total"], 4, "refund row excluded from orders");
    assert_eq!(out["orders"]["paid"], 1);
    assert_eq!(out["orders"]["refunded"], 1);
    assert_eq!(out["orders"]["pending"], 1);
    assert_eq!(out["orders"]["failed"], 1);
    assert_eq!(out["orders"]["revenue"], 10.0, "only settled gross counts");
    // Existing settled-only payment stats are unaffected.
    assert_eq!(out["totalTransactions"], 1);
}

#[test]
fn catalog_route_ids_cover_readiness_and_inventory_mutations() {
    let seams = FakeSeams::new();
    seams.set_now(1_700_000_000);
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    seams.seed(
        ids::MODEL_CATALOG,
        "prod_founders_pass",
        json!({
            "id": "prod_founders_pass",
            "title": "Founders Pass",
            "description": "Founders Pass",
            "active": true,
            "inventoryQuantity": 2,
            "inventoryStatus": "in_stock"
        }),
    );

    let readiness = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_READINESS,
            "GET",
            "/admin/catalog/readiness",
        ),
    );
    assert_eq!(readiness.status, 200);
    assert_eq!(body(&readiness)["productCount"], 1);

    let set_inventory = RouteRequest {
        route_id: ids::ROUTE_ADMIN_PRODUCT_INVENTORY_SET.into(),
        method: "PUT".into(),
        path: "/admin/products/prod_founders_pass/inventory".into(),
        context_json: admin_ctx(&[ids::ROUTE_ADMIN]),
        headers: vec![("Idempotency-Key".into(), "inventory-set-1".into())],
        body: json!({ "quantity": 5 }).to_string(),
        ..Default::default()
    };
    let set_response = crate::router::handle_route(&seams, set_inventory);
    assert_eq!(set_response.status, 200);
    assert_eq!(body(&set_response)["inventoryQuantity"], 5);

    let adjust_inventory = RouteRequest {
        route_id: ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUST.into(),
        method: "POST".into(),
        path: "/admin/products/prod_founders_pass/inventory/adjust".into(),
        context_json: admin_ctx(&[ids::ROUTE_ADMIN]),
        headers: vec![("Idempotency-Key".into(), "inventory-adjust-1".into())],
        body: json!({ "delta": -2, "reason": "manual_count" }).to_string(),
        ..Default::default()
    };
    let adjust_response = crate::router::handle_route(&seams, adjust_inventory);
    assert_eq!(adjust_response.status, 200);
    assert_eq!(body(&adjust_response)["adjustment"]["quantityAfter"], 3);

    let stored = seams
        .get_entry(ids::MODEL_CATALOG, "prod_founders_pass")
        .expect("stored product");
    assert_eq!(stored["inventoryQuantity"], 2);
    assert_eq!(stored["inventoryStatus"], "in_stock");
    assert_eq!(seams.entry_count(crate::checkout_contract::STOCK_MODEL), 3);
    let detail = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ADMIN_PRODUCTS_GET,
            "GET",
            "/admin/products/prod_founders_pass",
        ),
    );
    assert_eq!(detail.status, 200);
    assert_eq!(body(&detail)["inventoryQuantity"], 3);

    let reject_negative = RouteRequest {
        route_id: ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUST.into(),
        method: "POST".into(),
        path: "/admin/products/prod_founders_pass/inventory/adjust".into(),
        context_json: admin_ctx(&[ids::ROUTE_ADMIN]),
        headers: vec![("Idempotency-Key".into(), "inventory-adjust-2".into())],
        body: json!({ "delta": -4 }).to_string(),
        ..Default::default()
    };
    let reject_response = crate::router::handle_route(&seams, reject_negative);
    assert_eq!(reject_response.status, 400);
    assert_eq!(
        body(&reject_response)["error"]["message"],
        "inventory cannot be negative"
    );
}

#[test]
fn rejects_admin_dashboard_without_extension_admin_claim() {
    let seams = FakeSeams::new();
    let req = RouteRequest {
        route_id: ids::ROUTE_ADMIN_PRODUCTS_LIST.into(),
        method: "GET".into(),
        path: "/admin/products".into(),
        context_json: admin_ctx(&["cedros-pay:balance-read"]),
        ..Default::default()
    };

    let resp = crate::router::handle_route(&seams, req);

    assert_eq!(resp.status, 403);
}

#[test]
fn subscription_settings_update_rejects_non_object_json_body() {
    let seams = FakeSeams::new();
    let req = RouteRequest {
        route_id: ids::ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_UPDATE.into(),
        method: "PUT".into(),
        path: "/admin/subscriptions/settings".into(),
        context_json: admin_ctx(&[ids::ROUTE_ADMIN]),
        body: "[]".into(),
        ..Default::default()
    };

    let resp = crate::router::handle_route(&seams, req);

    assert_eq!(resp.status, 400);
    let out = body(&resp);
    assert_eq!(out["error"]["code"], "bad_request");
    assert_eq!(
        out["error"]["message"],
        "subscription settings must be a JSON object"
    );
    assert!(seams
        .setting_get("subscriptions.settings")
        .expect("settings lookup")
        .is_none());
}

#[test]
fn subscription_settings_update_defaults_missing_plans_for_object_body() {
    let seams = FakeSeams::new();
    let req = RouteRequest {
        route_id: ids::ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_UPDATE.into(),
        method: "PUT".into(),
        path: "/admin/subscriptions/settings".into(),
        context_json: admin_ctx(&[ids::ROUTE_ADMIN]),
        body: r#"{"billingEnabled":true}"#.into(),
        ..Default::default()
    };

    let resp = crate::router::handle_route(&seams, req);

    assert_eq!(resp.status, 200);
    let out = body(&resp);
    assert_eq!(out["settings"]["billingEnabled"], true);
    assert_eq!(out["settings"]["plans"], json!([]));
    let stored = seams
        .setting_get("subscriptions.settings")
        .expect("settings lookup")
        .expect("settings stored");
    let stored: Value = serde_json::from_str(&stored).expect("stored settings json");
    assert_eq!(stored["billingEnabled"], true);
    assert_eq!(stored["plans"], json!([]));
}

#[test]
fn subscription_settings_update_accepts_exact_bearer_capability() {
    let seams = FakeSeams::new();
    let req = RouteRequest {
        route_id: ids::ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_UPDATE.into(),
        method: "PUT".into(),
        path: "/admin/subscriptions/settings".into(),
        context_json: capability_ctx(ids::ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_UPDATE),
        body: json!({
            "enabled": true,
            "plans": [{
                "id": "staging-free",
                "title": "Staging Test Plan",
                "description": "Free staging plan.",
                "priceMonthlyUsd": 0,
                "priceAnnualUsd": 0,
                "features": [],
                "isActive": true,
                "public": true
            }]
        })
        .to_string(),
        ..Default::default()
    };

    let resp = crate::router::handle_route(&seams, req);

    assert_eq!(resp.status, 200);
    assert_eq!(body(&resp)["settings"]["plans"][0]["id"], "staging-free");
    assert!(seams
        .setting_get("subscriptions.settings")
        .expect("settings lookup")
        .is_some());
}

#[test]
fn subscription_settings_update_rejects_a_different_bearer_capability() {
    let seams = FakeSeams::new();
    let req = RouteRequest {
        route_id: ids::ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_UPDATE.into(),
        method: "PUT".into(),
        path: "/admin/subscriptions/settings".into(),
        context_json: capability_ctx(ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT),
        body: json!({"enabled": true, "plans": []}).to_string(),
        ..Default::default()
    };

    let resp = crate::router::handle_route(&seams, req);

    assert_eq!(resp.status, 403);
    assert!(seams
        .setting_get("subscriptions.settings")
        .expect("settings lookup")
        .is_none());
}
