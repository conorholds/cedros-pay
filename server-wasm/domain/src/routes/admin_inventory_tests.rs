use serde_json::json;

use crate::fake::FakeSeams;
use crate::ids;

use super::inventory_test_support::{body, request, response, seed_product};

#[test]
fn catalog_writes_strip_response_projections_without_overwriting_stock() {
    let seams = FakeSeams::new();
    seed_product(&seams);
    let set = request(
        ids::ROUTE_ADMIN_PRODUCT_INVENTORY_SET,
        "PUT",
        "/admin/products/product-1/inventory",
        json!({ "quantity": 5 }),
        "set-product",
    );
    assert_eq!(response(set, &seams).status, 200);
    let bulk = request(
        ids::ROUTE_ADMIN_PRODUCT_VARIANT_INVENTORY_UPDATE,
        "PUT",
        "/admin/products/product-1/variants/inventory",
        json!({ "updates": [{ "variantId": "variant-1", "quantity": 7 }] }),
        "set-variant",
    );
    assert_eq!(response(bulk, &seams).status, 200);

    let update = request(
        ids::ROUTE_ADMIN_PRODUCTS_UPDATE,
        "PUT",
        "/admin/products/product-1",
        json!({
            "id": "product-1", "title": "Renamed", "inventoryQuantity": 500,
            "inventoryStatus": "out_of_stock",
            "variants": [{"id":"variant-1","title":"Small","inventoryQuantity":600}]
        }),
        "catalog-update",
    );
    let updated = response(update, &seams);
    assert_eq!(updated.status, 200);
    assert_eq!(body(&updated)["inventoryQuantity"], 5);
    assert_eq!(body(&updated)["variants"][0]["inventoryQuantity"], 7);

    let variation = request(
        ids::ROUTE_ADMIN_PRODUCT_VARIATIONS_UPDATE,
        "PUT",
        "/admin/products/product-1/variations",
        json!({"updateVariants":[{"id":"variant-1","inventoryQuantity":700,"title":"S"}]}),
        "variant-catalog-update",
    );
    let varied = response(variation, &seams);
    assert_eq!(varied.status, 200);
    assert_eq!(body(&varied)["variants"][0]["inventoryQuantity"], 7);
    let stored = seams
        .get_entry(ids::MODEL_CATALOG, "product-1")
        .expect("catalog product");
    assert!(stored.get("inventoryQuantity").is_none());
    assert!(stored["variants"][0].get("inventoryQuantity").is_none());
    assert!(stored["variants"][0].get("inventoryStatus").is_none());
    assert!(seams
        .get_entry(ids::MODEL_CATALOG_FENCE, "seo-snapshot:fence")
        .is_some());
}

#[test]
fn stale_variation_update_cannot_overwrite_a_concurrent_catalog_change() {
    let seams = FakeSeams::new();
    seed_product(&seams);
    let winner = json!({
        "id": "product-1", "title": "Concurrent title",
        "variants": [{"id":"variant-1","title":"Concurrent size"}]
    });
    seams.queue_guarded_race(vec![(ids::MODEL_CATALOG, "product-1", winner)]);

    let update = request(
        ids::ROUTE_ADMIN_PRODUCT_VARIATIONS_UPDATE,
        "PUT",
        "/admin/products/product-1/variations",
        json!({"updateVariants":[{"id":"variant-1","title":"Stale size"}]}),
        "stale-variation-update",
    );

    assert_eq!(response(update, &seams).status, 409);
    let stored = seams.get_entry(ids::MODEL_CATALOG, "product-1").unwrap();
    assert_eq!(stored["title"], "Concurrent title");
    assert_eq!(stored["variants"][0]["title"], "Concurrent size");
}
