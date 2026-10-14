use serde_json::{json, Value};

use super::*;
use crate::fake::FakeSeams;

fn tracked(seams: &FakeSeams, id: &str, quantity: u64) {
    seams.seed(
        crate::ids::MODEL_CATALOG,
        id,
        json!({
            "id": id, "active": true, "title": id,
            "price": { "amountCents": 100, "currency": "USD" },
            "paymentResource": id, "inventoryQuantity": quantity
        }),
    );
}

fn stock(seams: &FakeSeams, id: &str) -> Value {
    seams
        .get_entry(STOCK_MODEL, &super::inventory_types::stock_key(id, None))
        .unwrap()
}

#[test]
fn exact_quote_replay_does_not_double_reserve_and_competing_quote_cannot_oversell() {
    let seams = super::api_tests::setup();
    tracked(&seams, "product-1", 2);
    let body = super::api_tests::quote_body("claim-a", json!(["stripe"]));
    let first = super::api_tests::facade(&seams)
        .quote("claim-a", &body)
        .unwrap();
    let replay = super::api_tests::facade(&seams)
        .quote("claim-a", &body)
        .unwrap();
    assert!(replay.replayed);
    assert_eq!(replay.quote, first.quote);
    assert_eq!(stock(&seams, "product-1")["reserved"], 2);

    let error = super::api_tests::facade(&seams)
        .quote(
            "claim-b",
            &super::api_tests::quote_body("claim-b", json!(["stripe"])),
        )
        .unwrap_err();
    assert_eq!((error.status, error.code), (409, "inventory_unavailable"));
    assert_eq!(seams.entry_count(INVENTORY_HOLD_MODEL), 1);
    assert_eq!(stock(&seams, "product-1")["reserved"], 2);
}

#[test]
fn unavailable_multiline_quote_leaves_no_partial_stock_hold_or_operation() {
    let seams = super::api_tests::setup();
    tracked(&seams, "product-1", 10);
    tracked(&seams, "product-2", 1);
    let mut body: Value =
        serde_json::from_str(&super::api_tests::quote_body("multi", json!(["stripe"]))).unwrap();
    body["source"]["items"] = json!([
        { "resource": "product-1", "qty": 2 },
        { "resource": "product-2", "qty": 2 }
    ]);
    let error = super::api_tests::facade(&seams)
        .quote("multi", &body.to_string())
        .unwrap_err();
    assert_eq!(error.code, "inventory_unavailable");
    assert_eq!(seams.entry_count(STOCK_MODEL), 0);
    assert_eq!(seams.entry_count(INVENTORY_HOLD_MODEL), 0);
    assert_eq!(seams.entry_count(OPERATION_MODEL), 0);
}

#[test]
fn condition_limit_fails_before_any_inventory_mutation() {
    let seams = super::api_tests::setup();
    let mut items = Vec::new();
    for index in 0..16 {
        let id = format!("product-{index}");
        tracked(&seams, &id, 1);
        items.push(json!({ "resource": id, "qty": 1 }));
    }
    let mut body: Value =
        serde_json::from_str(&super::api_tests::quote_body("too-many", json!(["stripe"]))).unwrap();
    body["source"]["items"] = Value::Array(items);
    let error = super::api_tests::facade(&seams)
        .quote("too-many", &body.to_string())
        .unwrap_err();
    assert_eq!(
        (error.status, error.code),
        (422, "inventory_condition_limit")
    );
    assert_eq!(seams.entry_count(STOCK_MODEL), 0);
    assert_eq!(seams.entry_count(INVENTORY_HOLD_MODEL), 0);
    assert_eq!(seams.entry_count(OPERATION_MODEL), 0);
}

#[test]
fn exact_worst_case_thirty_two_condition_quote_applies_atomically() {
    let seams = super::api_tests::setup();
    let mut items = Vec::new();
    for index in 0..15 {
        let id = format!("bounded-{index}");
        tracked(&seams, &id, 1);
        items.push(json!({ "resource": id, "qty": 1 }));
    }
    let mut body: Value = serde_json::from_str(&super::api_tests::quote_body(
        "exact-limit",
        json!(["stripe"]),
    ))
    .unwrap();
    body["source"]["items"] = Value::Array(items);
    super::api_tests::facade(&seams)
        .quote("exact-limit", &body.to_string())
        .unwrap();
    assert_eq!(seams.entry_count(STOCK_MODEL), 15);
    assert_eq!(seams.entry_count(INVENTORY_HOLD_MODEL), 1);
    assert_eq!(seams.entry_count(OPERATION_MODEL), 1);
}

#[test]
fn quote_rejects_inventory_that_cannot_fit_paid_settlement_conditions() {
    let seams = super::api_tests::setup();
    let variants = (0..27)
        .map(|index| json!({ "id": format!("variant-{index}"), "inventoryQuantity": 1 }))
        .collect::<Vec<_>>();
    seams.seed(
        crate::ids::MODEL_CATALOG,
        "many-variants",
        json!({
            "id": "many-variants", "active": true, "title": "Many variants",
            "price": { "amountCents": 100, "currency": "USD" },
            "variants": variants
        }),
    );
    let items = (0..27)
        .map(|index| {
            json!({
                "resource": "many-variants",
                "variantId": format!("variant-{index}"),
                "qty": 1
            })
        })
        .collect::<Vec<_>>();
    let mut body: Value = serde_json::from_str(&super::api_tests::quote_body(
        "settlement-overflow",
        json!(["stripe"]),
    ))
    .unwrap();
    body["source"]["items"] = Value::Array(items);

    let error = super::api_tests::facade(&seams)
        .quote("settlement-overflow", &body.to_string())
        .unwrap_err();

    assert_eq!(
        (error.status, error.code),
        (422, "inventory_condition_limit")
    );
    assert_eq!(seams.entry_count(STOCK_MODEL), 0);
    assert_eq!(seams.entry_count(INVENTORY_HOLD_MODEL), 0);
    assert_eq!(seams.entry_count(OPERATION_MODEL), 0);
}

#[test]
fn admin_adjustment_cannot_reduce_authoritative_stock_below_reservations() {
    let seams = super::api_tests::setup();
    tracked(&seams, "product-1", 10);
    super::api_tests::facade(&seams)
        .quote(
            "reserved",
            &super::api_tests::quote_body("reserved", json!(["stripe"])),
        )
        .unwrap();
    let error = super::inventory_admin::set(&seams, "product-1", None, 1).unwrap_err();
    assert_eq!(error.status, 409);
    let state = super::inventory_admin::adjust(&seams, "product-1", None, 5, None).unwrap();
    assert_eq!((state.on_hand, state.reserved, state.sold), (15, 2, 0));
}

#[test]
fn seeded_variant_stock_remains_authoritative_over_stale_catalog_inventory() {
    let seams = super::api_tests::setup();
    seams.seed(
        crate::ids::MODEL_CATALOG,
        "product-1",
        json!({
            "id": "product-1", "active": true, "title": "Product",
            "price": { "amountCents": 100, "currency": "USD" },
            "inventoryQuantity": 5,
            "variants": [{ "id": "blue", "inventoryQuantity": 5 }]
        }),
    );
    let mut first: Value = serde_json::from_str(&super::api_tests::quote_body(
        "variant-a",
        json!(["stripe"]),
    ))
    .unwrap();
    first["source"]["items"] = json!([{ "resource": "product-1", "variantId": "blue", "qty": 1 }]);
    super::api_tests::facade(&seams)
        .quote("variant-a", &first.to_string())
        .unwrap();

    let mut stale = seams
        .get_entry(crate::ids::MODEL_CATALOG, "product-1")
        .unwrap();
    stale["inventoryStatus"] = json!("out_of_stock");
    stale["variants"][0]["inventoryStatus"] = json!("out_of_stock");
    seams.seed(crate::ids::MODEL_CATALOG, "product-1", stale);
    first["idempotencyKey"] = json!("variant-b");
    let second = super::api_tests::facade(&seams)
        .quote("variant-b", &first.to_string())
        .unwrap();
    assert!(second.quote.inventory_hold.is_some());
    let key = super::inventory_types::stock_key("product-1", Some("blue"));
    assert_eq!(seams.get_entry(STOCK_MODEL, &key).unwrap()["reserved"], 2);
}

#[test]
fn bulk_variant_adjustment_rolls_back_all_targets_when_one_is_invalid() {
    let seams = super::api_tests::setup();
    seams.seed(
        crate::ids::MODEL_CATALOG,
        "product-1",
        json!({
            "id": "product-1", "active": true, "title": "Product",
            "price": { "amountCents": 100, "currency": "USD" },
            "variants": [
                { "id": "blue", "inventoryQuantity": 5 },
                { "id": "red", "inventoryQuantity": 5 }
            ]
        }),
    );
    let mut body: Value = serde_json::from_str(&super::api_tests::quote_body(
        "variant-hold",
        json!(["stripe"]),
    ))
    .unwrap();
    body["source"]["items"] = json!([
        { "resource": "product-1", "variantId": "blue", "qty": 2 },
        { "resource": "product-1", "variantId": "red", "qty": 2 }
    ]);
    super::api_tests::facade(&seams)
        .quote("variant-hold", &body.to_string())
        .unwrap();
    let error = super::inventory_admin_bulk::set_variants(
        &seams,
        "product-1",
        &[("blue".into(), 10), ("red".into(), 1)],
    )
    .unwrap_err();
    assert_eq!(error.status, 409);
    for variant in ["blue", "red"] {
        let key = super::inventory_types::stock_key("product-1", Some(variant));
        let stock = seams.get_entry(STOCK_MODEL, &key).unwrap();
        assert_eq!(
            (stock["onHand"].as_u64(), stock["reserved"].as_u64()),
            (Some(5), Some(2))
        );
    }
}
