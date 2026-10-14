//! Call-count budgets cover the real projection and guarded quote paths.
use super::*;
use crate::{fake::FakeSeams, ids, seams::HostSeams};
use serde_json::{json, Value};

fn seed_stock(s: &FakeSeams, resource: &str, variant: Option<&str>) {
    let key = inventory_types::stock_key(resource, variant);
    s.seed(
        STOCK_MODEL,
        &key,
        json!({
            "schemaVersion":1, "stockKey":key, "resource":resource, "variantId":variant,
            "onHand":30, "reserved":2, "sold":0, "updatedAt":s.now_unix_secs()
        }),
    );
}

#[test]
fn inventory_projection_batches_5500_stocks_into_55_reads() {
    let s = FakeSeams::new();
    let mut products = Vec::new();
    for index in 0..500 {
        let resource = format!("p{index:04}");
        seed_stock(&s, &resource, None);
        let variants = (0..10)
            .map(|index| {
                let variant = format!("v{index}");
                seed_stock(&s, &resource, Some(&variant));
                json!({"id":variant, "inventoryQuantity":99})
            })
            .collect::<Vec<_>>();
        products.push((
            resource,
            json!({"variants":variants, "inventoryQuantity":99}),
        ));
    }
    inventory_projection::overlay_many(&s, &mut products, false).unwrap();
    let reads = s.db_reads.borrow()[STOCK_MODEL];
    assert_eq!((reads.0, reads.1), (55, 5500));
    for (_, product) in products {
        assert_eq!(product["inventoryQuantity"], 28);
        assert!(product["variants"]
            .as_array()
            .unwrap()
            .iter()
            .all(|v| v["inventoryQuantity"] == 28));
    }
    eprintln!(
        "PERF inventory products=500 variants=10 db_calls={} rows={} response_bytes={}",
        reads.0, reads.1, reads.2
    );
}

#[test]
fn projection_preserves_missing_legacy_stock_and_rejects_invalid_identity() {
    let s = FakeSeams::new();
    let mut products = vec![(
        "legacy".to_string(),
        json!({"inventoryQuantity":7, "variants":[{"id":"v", "inventoryQuantity":4}]}),
    )];
    let before = products.clone();
    inventory_projection::overlay_many(&s, &mut products, false).unwrap();
    assert_eq!(products, before);
    let key = inventory_types::stock_key("legacy", None);
    s.seed(STOCK_MODEL, &key, json!({"schemaVersion":1, "stockKey":key, "resource":"wrong", "onHand":30, "reserved":2, "sold":0, "updatedAt":0}));
    assert!(inventory_projection::overlay_many(&s, &mut products, false).is_err());
}

#[test]
fn fifteen_tracked_product_quote_preserves_guards_with_seventeen_catalog_stock_reads() {
    let s = api_tests::setup();
    let items = (0..15).map(|index| {
        let resource = format!("p{index}");
        s.seed(ids::MODEL_CATALOG, &resource, json!({"active":true, "title":resource, "price":{"amountCents":100,"currency":"USD"}, "paymentResource":resource}));
        seed_stock(&s, &resource, None);
        json!({"resource":resource, "qty":1})
    }).collect::<Vec<_>>();
    let mut body: Value =
        serde_json::from_str(&api_tests::quote_body("perf-quote-15", json!(["stripe"]))).unwrap();
    body["source"]["items"] = json!(items);
    s.db_reads.borrow_mut().clear();
    api_tests::facade(&s)
        .quote("perf-quote-15", &body.to_string())
        .unwrap();
    let reads = s.db_reads.borrow();
    assert_eq!(reads[ids::MODEL_CATALOG].0, 1);
    assert_eq!(reads[STOCK_MODEL].0, 16); // existence batch + fresh reservation reads
    eprintln!("PERF quote lines=15 catalog_calls=1 stock_calls=16");
}
