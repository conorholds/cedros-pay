use serde_json::{json, Value};

use crate::fake::FakeSeams;
use crate::ids;

use super::inventory_test_support::{body, request, response, seed_product};

#[test]
fn bulk_failure_rolls_back_stock_and_audits_and_history_fails_closed() {
    let seams = FakeSeams::new();
    seed_product(&seams);
    seams.fail_next_guarded_batch_after(2);
    let updates = json!({"updates":[
        {"variantId":"variant-1","quantity":7},
        {"variantId":"variant-2","quantity":9}
    ]});
    let bulk = request(
        ids::ROUTE_ADMIN_PRODUCT_VARIANT_INVENTORY_UPDATE,
        "PUT",
        "/admin/products/product-1/variants/inventory",
        updates.clone(),
        "bulk-failure",
    );
    assert_eq!(response(bulk, &seams).status, 500);
    assert_eq!(seams.entry_count(crate::checkout_contract::STOCK_MODEL), 0);
    let applied = request(
        ids::ROUTE_ADMIN_PRODUCT_VARIANT_INVENTORY_UPDATE,
        "PUT",
        "/admin/products/product-1/variants/inventory",
        updates,
        "bulk-success",
    );
    assert_eq!(response(applied, &seams).status, 200);
    assert_eq!(seams.entry_count(crate::checkout_contract::STOCK_MODEL), 4);

    seams.seed(
        crate::checkout_contract::STOCK_MODEL,
        "malformed-audit",
        json!({"recordType":"inventoryAdjustment","productId":"product-1"}),
    );
    let mut history = request(
        ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUSTMENTS,
        "GET",
        "/admin/products/product-1/inventory/adjustments",
        Value::Null,
        "unused",
    );
    history.query = vec![("limit".into(), "101".into())];
    assert_eq!(response(history.clone(), &seams).status, 400);
    history.query.clear();
    assert_eq!(response(history, &seams).status, 500);
}

#[test]
fn raced_adjustment_retries_with_exactly_one_matching_audit() {
    let seams = FakeSeams::new();
    seed_product(&seams);
    let set = request(
        ids::ROUTE_ADMIN_PRODUCT_INVENTORY_SET,
        "PUT",
        "/admin/products/product-1/inventory",
        json!({"quantity":10}),
        "initial-set",
    );
    assert_eq!(response(set, &seams).status, 200);
    let key = crate::checkout_contract::checkout_stock_key("product-1");
    seams.queue_guarded_race(vec![(
        crate::checkout_contract::STOCK_MODEL,
        &key,
        json!({
            "schemaVersion":1,"stockKey":key,"resource":"product-1","onHand":12,
            "reserved":0,"sold":0,"updatedAt":200
        }),
    )]);
    let adjust = request(
        ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUST,
        "POST",
        "/admin/products/product-1/inventory/adjust",
        json!({"delta":1}),
        "raced-adjust",
    );
    let adjusted = response(adjust, &seams);
    assert_eq!(body(&adjusted)["adjustment"]["quantityBefore"], 12);
    assert_eq!(body(&adjusted)["adjustment"]["quantityAfter"], 13);
    assert_eq!(seams.entry_count(crate::checkout_contract::STOCK_MODEL), 3);
    let history = request(
        ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUSTMENTS,
        "GET",
        "/admin/products/product-1/inventory/adjustments",
        Value::Null,
        "unused",
    );
    assert_eq!(
        body(&response(history, &seams))["adjustments"]
            .as_array()
            .unwrap()
            .len(),
        2
    );
}
