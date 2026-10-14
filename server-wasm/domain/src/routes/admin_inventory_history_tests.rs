use serde_json::{json, Value};

use crate::fake::FakeSeams;
use crate::ids;

use super::inventory_test_support::{body, request, response, seed_product};

#[test]
fn adjustment_replay_history_and_redaction_are_exact() {
    let seams = FakeSeams::new();
    seams.set_now(100);
    seed_product(&seams);
    let set = || {
        request(
            ids::ROUTE_ADMIN_PRODUCT_INVENTORY_SET,
            "PUT",
            "/admin/products/product-1/inventory",
            json!({"quantity":10,"reason":"cycle_count"}),
            "same-operation",
        )
    };
    let first = response(set(), &seams);
    seams.set_now(200);
    let replay = response(set(), &seams);
    assert_eq!(first.status, 200);
    assert_eq!(body(&first)["adjustment"], body(&replay)["adjustment"]);
    assert_eq!(seams.entry_count(crate::checkout_contract::STOCK_MODEL), 2);
    let mismatch = request(
        ids::ROUTE_ADMIN_PRODUCT_INVENTORY_SET,
        "PUT",
        "/admin/products/product-1/inventory",
        json!({"quantity":11,"reason":"cycle_count"}),
        "same-operation",
    );
    assert_eq!(response(mismatch, &seams).status, 409);
    let adjust = request(
        ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUST,
        "POST",
        "/admin/products/product-1/inventory/adjust",
        json!({"delta":-2,"reason":"damage"}),
        "adjust-operation",
    );
    assert_eq!(response(adjust, &seams).status, 200);

    let mut history = request(
        ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUSTMENTS,
        "GET",
        "/admin/products/product-1/inventory/adjustments",
        Value::Null,
        "unused",
    );
    history.query = vec![("limit".into(), "1".into()), ("offset".into(), "0".into())];
    let newest = response(history.clone(), &seams);
    assert_eq!(body(&newest)["adjustments"][0]["id"], "adjust-operation");
    assert_eq!(body(&newest)["hasMore"], true);
    history.query[1].1 = "1".into();
    let older = response(history, &seams);
    assert_eq!(body(&older)["adjustments"][0]["id"], "same-operation");
    assert_eq!(body(&older)["adjustments"][0]["actor"], "system-admin");
    assert!(!older.body.contains("operator@example.invalid"));
    let mut unauthorized = request(
        ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUSTMENTS,
        "GET",
        "/admin/products/product-1/inventory/adjustments",
        Value::Null,
        "unused",
    );
    unauthorized.context_json = "{}".into();
    assert_eq!(response(unauthorized, &seams).status, 401);
}
