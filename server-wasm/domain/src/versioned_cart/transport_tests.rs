use super::*;

fn open(seams: &FakeSeams, subject: &str) -> serde_json::Value {
    authenticated(seams, subject);
    response_json(
        adapter(seams)
            .open(&transport_request(json!({ "lane": "default" })))
            .unwrap(),
    )
}

fn apply(seams: &FakeSeams, subject: &str, body: serde_json::Value) -> serde_json::Value {
    authenticated(seams, subject);
    response_json(adapter(seams).apply(&transport_request(body)).unwrap())
}

#[test]
fn open_read_and_fresh_adapter_recover_authoritative_state() {
    let seams = FakeSeams::new();
    let opened = open(&seams, "buyer-42");
    seed_catalog_item(&seams, "sku-1", 500, "USD", 10);
    assert_eq!(opened["generation"]["epoch"], 1);
    assert_eq!(opened["authoritative"]["version"], 0);
    let generation = opened["generation"]["generation"].as_str().unwrap();
    let applied = apply(&seams, "buyer-42", transport_add(generation, 0, "op-1", 2));
    assert_eq!(applied["outcome"], "applied");
    assert_eq!(applied["state"]["subtotalCents"], 1000);

    authenticated(&seams, "buyer-42");
    let recovered = response_json(
        adapter(&seams)
            .read(&transport_request(json!({ "lane": "default" })))
            .unwrap(),
    );
    assert_eq!(recovered["generation"], opened["generation"]);
    assert_eq!(recovered["authoritative"], applied["state"]);
    assert!(seams
        .logs
        .borrow()
        .iter()
        .all(|(_, message)| { !message.contains("buyer-42") && !message.contains("op-1") }));
}

#[test]
fn exact_replay_mismatch_and_stale_version_return_authoritative_state() {
    let seams = FakeSeams::new();
    let opened = open(&seams, "buyer-42");
    seed_catalog_item(&seams, "sku-1", 500, "USD", 10);
    let generation = opened["generation"]["generation"].as_str().unwrap();
    let command = transport_add(generation, 0, "op-stable", 1);
    let applied = apply(&seams, "buyer-42", command.clone());
    let replayed = apply(&seams, "buyer-42", command);
    assert_eq!(replayed["outcome"], "replayed");
    assert_eq!(replayed["version"], applied["state"]["version"]);

    let mismatch = apply(
        &seams,
        "buyer-42",
        transport_add(generation, 0, "op-stable", 2),
    );
    assert_eq!(mismatch["outcome"], "idempotency_conflict");
    assert_eq!(mismatch["authoritative"], applied["state"]);

    let stale = apply(
        &seams,
        "buyer-42",
        transport_add(generation, 0, "op-stale", 1),
    );
    assert_eq!(stale["outcome"], "conflict");
    assert_eq!(stale["authoritative"], applied["state"]);
}

#[test]
fn rotation_fences_old_generation_without_mutation() {
    let seams = FakeSeams::new();
    let opened = open(&seams, "buyer-42");
    let old = opened["generation"]["generation"].as_str().unwrap();
    authenticated(&seams, "buyer-42");
    let rotated = response_json(
        adapter(&seams)
            .rotate(&transport_request(json!({
                "lane": "default",
                "expectedGeneration": old
            })))
            .unwrap(),
    );
    assert_eq!(rotated["outcome"], "rotated");
    assert_ne!(rotated["generation"]["generation"], old);
    assert_eq!(rotated["authoritative"]["generationEpoch"], 2);

    let stale = apply(&seams, "buyer-42", transport_add(old, 0, "op-old", 1));
    assert_eq!(stale["outcome"], "stale_generation");
    assert_eq!(stale["authoritative"]["version"], 0);
    assert_eq!(stale["currentGeneration"], rotated["generation"]);
}

#[test]
fn replace_preserves_shop_display_projection_and_order() {
    let seams = FakeSeams::new();
    let opened = open(&seams, "buyer-42");
    seed_catalog_item(&seams, "sku-z", 900, "USD", 10);
    seed_catalog_item(&seams, "sku-a", 400, "USD", 10);
    seams.seed(
        crate::ids::MODEL_CATALOG,
        "coupon:SAVE10",
        json!({
            "recordType": "coupon", "code": "SAVE10", "active": true,
            "discountType": "percentage", "discountBps": 1000,
            "paymentMethod": "any", "appliesAt": "cart"
        }),
    );
    let generation = opened["generation"]["generation"].as_str().unwrap();
    let result = apply(
        &seams,
        "buyer-42",
        json!({
            "lane": "default", "generation": generation, "expectedVersion": 0,
            "operationId": "op-replace",
            "mutation": { "kind": "replace_snapshot", "snapshot": {
                "items": [
                    { "resource": "sku-z", "qty": 1 },
                    { "resource": "sku-a", "qty": 2,
                      "displayMetadata": {"gift":"yes"} }
                ], "promoCode": " save10 ", "promoCodes": ["SAVE10"]
            }}
        }),
    );
    assert_eq!(result["outcome"], "applied");
    assert_eq!(result["state"]["lines"][0]["productId"], "sku-z");
    assert_eq!(result["state"]["lines"][1]["productId"], "sku-a");
    assert_eq!(result["state"]["promoCodes"], json!(["SAVE10"]));
    assert_eq!(result["state"]["promoCode"], "SAVE10");
}

#[test]
fn exact_67_byte_operation_ids_preserve_case_without_normalization() {
    let seams = FakeSeams::new();
    let opened = open(&seams, "buyer-42");
    seed_catalog_item(&seams, "sku-1", 500, "USD", 10);
    let generation = opened["generation"]["generation"].as_str().unwrap();
    let upper = format!("shop-cart-{}", "A".repeat(57));
    let lower = format!("shop-cart-{}", "a".repeat(57));
    assert_eq!((upper.len(), lower.len()), (67, 67));

    let first = apply(&seams, "buyer-42", transport_add(generation, 0, &upper, 1));
    let second = apply(&seams, "buyer-42", transport_add(generation, 1, &lower, 1));
    assert_eq!(first["state"]["version"], 1);
    assert_eq!(second["state"]["version"], 2);
    assert_eq!(seams.entry_count(OPERATION_MODEL_ID), 2);
}
