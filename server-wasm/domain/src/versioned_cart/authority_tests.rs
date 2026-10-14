use super::*;

fn open_cart(seams: &FakeSeams) -> String {
    authenticated(seams, "buyer-42");
    let value = response_json(
        adapter(seams)
            .open(&transport_request(json!({ "lane": "default" })))
            .unwrap(),
    );
    value["generation"]["generation"]
        .as_str()
        .unwrap()
        .to_string()
}

fn apply_request(seams: &FakeSeams, body: serde_json::Value) -> AppResult<serde_json::Value> {
    authenticated(seams, "buyer-42");
    adapter(seams)
        .apply(&transport_request(body))
        .map(response_json)
}

#[test]
fn catalog_overwrites_price_currency_and_display_facts() {
    let seams = FakeSeams::new();
    let generation = open_cart(&seams);
    seed_catalog_item(&seams, "sku-1", 725, "EUR", 10);
    let mut tampered = transport_add(&generation, 0, "op-tampered", 2);
    tampered["mutation"]["item"]["unitAmountCents"] = json!(1);
    tampered["mutation"]["item"]["currency"] = json!("USD");
    tampered["mutation"]["item"]["holdId"] = json!("caller-hold");
    tampered["mutation"]["item"]["holdExpiresAt"] = json!("2099-01-01T00:00:00Z");
    assert_eq!(apply_request(&seams, tampered).unwrap_err().status, 400);

    let applied = apply_request(&seams, transport_add(&generation, 0, "op-valid", 2)).unwrap();
    assert_eq!(applied["state"]["subtotalCents"], 1450);
    assert_eq!(applied["state"]["currency"], "EUR");
    assert_eq!(applied["state"]["lines"][0]["titleSnapshot"], "Title sku-1");
    assert_eq!(applied["state"]["lines"][0]["paymentResource"], "pay-sku-1");
    assert!(applied["state"]["lines"][0].get("holdId").is_none());
}

#[test]
fn authoritative_stock_ignores_stripped_or_stale_catalog_projections() {
    let seams = FakeSeams::new();
    let generation = open_cart(&seams);
    seed_catalog_item(&seams, "sku-1", 500, "USD", 3);
    let mut catalog = seams.get_entry(crate::ids::MODEL_CATALOG, "sku-1").unwrap();
    catalog["inventoryQuantity"] = json!(0);
    catalog["inventoryStatus"] = json!("out_of_stock");
    seams.seed(crate::ids::MODEL_CATALOG, "sku-1", catalog);

    let applied = apply_request(&seams, transport_add(&generation, 0, "op-stock", 2)).unwrap();

    assert_eq!(applied["outcome"], "applied");
    assert_eq!(applied["state"]["totalQuantity"], 2);
    let batch = seams.last_db_batch_request().unwrap();
    assert!(batch["conditions"].as_array().unwrap().iter().any(|guard| {
        guard["contentModelId"] == crate::checkout_contract::STOCK_MODEL
            && guard["predicate"] == "version"
    }));
}

#[test]
fn invalid_product_variant_and_inventory_fail_without_cart_or_operation() {
    let seams = FakeSeams::new();
    let generation = open_cart(&seams);
    let before = storage_entry_count(&seams);
    assert_eq!(
        apply_request(&seams, transport_add(&generation, 0, "op-missing", 1))
            .unwrap_err()
            .status,
        404
    );
    seed_catalog_item(&seams, "sku-1", 500, "USD", 1);
    let mut bad_variant = transport_add(&generation, 0, "op-variant", 1);
    bad_variant["mutation"]["item"]["variantId"] = json!("missing");
    assert_eq!(apply_request(&seams, bad_variant).unwrap_err().status, 422);
    assert_eq!(
        apply_request(&seams, transport_add(&generation, 0, "op-stock", 2))
            .unwrap_err()
            .code,
        "inventory_unavailable"
    );
    assert_eq!(storage_entry_count(&seams), before);
}

#[test]
fn missing_and_malformed_stock_fail_closed_without_cart_state() {
    let missing = FakeSeams::new();
    let generation = open_cart(&missing);
    missing.seed(
        crate::ids::MODEL_CATALOG,
        "sku-1",
        json!({
            "id":"sku-1", "active":true, "public":true, "title":"Product",
            "price":{"amountCents":500,"currency":"USD"}
        }),
    );
    let before = storage_entry_count(&missing);
    assert_eq!(
        apply_request(
            &missing,
            transport_add(&generation, 0, "op-missing-stock", 1)
        )
        .unwrap_err()
        .code,
        "inventory_authority_unavailable"
    );
    assert_eq!(storage_entry_count(&missing), before);

    let malformed = FakeSeams::new();
    let generation = open_cart(&malformed);
    malformed.seed(
        crate::ids::MODEL_CATALOG,
        "sku-1",
        json!({
            "id":"sku-1", "active":true, "public":true, "title":"Product",
            "price":{"amountCents":500,"currency":"USD"}
        }),
    );
    let key = crate::checkout_contract::inventory_admin::stock_key_for_test("sku-1", None);
    malformed.seed(
        crate::checkout_contract::STOCK_MODEL,
        &key,
        json!({"schemaVersion":1,"stockKey":key,"resource":"wrong"}),
    );
    let before = storage_entry_count(&malformed);
    assert_eq!(
        apply_request(
            &malformed,
            transport_add(&generation, 0, "op-malformed-stock", 1)
        )
        .unwrap_err()
        .status,
        500
    );
    assert_eq!(storage_entry_count(&malformed), before);
}

#[test]
fn only_explicit_untracked_catalog_items_can_write_without_stock() {
    let seams = FakeSeams::new();
    let generation = open_cart(&seams);
    seams.seed(
        crate::ids::MODEL_CATALOG,
        "digital-1",
        json!({
            "id":"digital-1", "active":true, "public":true, "title":"Download",
            "price":{"amountCents":500,"currency":"USD"},
            "inventoryPolicy":"untracked"
        }),
    );
    let mut request = transport_add(&generation, 0, "op-untracked", 1);
    request["mutation"]["item"]["resource"] = json!("digital-1");

    let applied = apply_request(&seams, request).unwrap();

    assert_eq!(applied["outcome"], "applied");
    let batch = seams.last_db_batch_request().unwrap();
    assert!(batch["conditions"].as_array().unwrap().iter().any(|guard| {
        guard["contentModelId"] == crate::checkout_contract::STOCK_MODEL
            && guard["predicate"] == "absent"
    }));
}

#[test]
fn variant_stock_is_exact_and_never_falls_back_to_product_stock() {
    let seams = FakeSeams::new();
    let generation = open_cart(&seams);
    seed_catalog_item(&seams, "sku-1", 500, "USD", 5);
    let variant_key =
        crate::checkout_contract::inventory_admin::stock_key_for_test("sku-1", Some("blue"));
    crate::db::Db::new(&seams, crate::ids::DB_ACCESS)
        .guarded_batch(
            &[crate::guarded_batch::GuardedCondition::Version {
                content_model_id: crate::checkout_contract::STOCK_MODEL,
                entry_key: variant_key.clone(),
                expected_version: crate::db::Db::new(&seams, crate::ids::DB_ACCESS)
                    .read_one(crate::checkout_contract::STOCK_MODEL, &variant_key)
                    .unwrap()
                    .unwrap()
                    .version
                    .unwrap(),
            }],
            &[crate::db::BatchOp::Delete {
                content_model_id: crate::checkout_contract::STOCK_MODEL,
                entry_key: variant_key,
            }],
        )
        .unwrap();
    let mut request = transport_add(&generation, 0, "op-variant-missing", 1);
    request["mutation"]["item"]["variantId"] = json!("blue");
    assert_eq!(
        apply_request(&seams, request).unwrap_err().code,
        "inventory_authority_unavailable"
    );

    crate::checkout_contract::inventory_admin::set(&seams, "sku-1", Some("blue"), 0).unwrap();
    let mut request = transport_add(&generation, 0, "op-variant-zero", 1);
    request["mutation"]["item"]["variantId"] = json!("blue");
    assert_eq!(
        apply_request(&seams, request).unwrap_err().code,
        "inventory_unavailable"
    );

    crate::checkout_contract::inventory_admin::set(&seams, "sku-1", Some("blue"), 2).unwrap();
    let mut request = transport_add(&generation, 0, "op-variant-valid", 1);
    request["mutation"]["item"]["variantId"] = json!("blue");
    assert_eq!(
        apply_request(&seams, request).unwrap()["outcome"],
        "applied"
    );
}

#[test]
fn cumulative_quantity_and_stock_race_cannot_commit_partial_cart_state() {
    let seams = FakeSeams::new();
    let generation = open_cart(&seams);
    seed_catalog_item(&seams, "sku-1", 500, "USD", 3);
    assert_eq!(
        apply_request(&seams, transport_add(&generation, 0, "op-first", 2)).unwrap()["outcome"],
        "applied"
    );
    let before_operations = seams.entry_count(OPERATION_MODEL_ID);
    assert_eq!(
        apply_request(&seams, transport_add(&generation, 1, "op-over-total", 2))
            .unwrap_err()
            .code,
        "inventory_unavailable"
    );
    assert_eq!(seams.entry_count(OPERATION_MODEL_ID), before_operations);

    let stock_key = crate::checkout_contract::inventory_admin::stock_key_for_test("sku-1", None);
    let mut raced_stock = seams
        .get_entry(crate::checkout_contract::STOCK_MODEL, &stock_key)
        .unwrap();
    raced_stock["onHand"] = json!(2);
    seams.queue_guarded_race(vec![(
        crate::checkout_contract::STOCK_MODEL,
        &stock_key,
        raced_stock,
    )]);
    let outcome = apply_request(&seams, transport_add(&generation, 1, "op-raced", 1)).unwrap();
    assert_eq!(outcome["outcome"], "conflict");
    assert_eq!(seams.entry_count(OPERATION_MODEL_ID), before_operations);
    assert_eq!(seams.entry_count(TOMBSTONE_MODEL_ID), before_operations);
    let current = response_json({
        authenticated(&seams, "buyer-42");
        adapter(&seams)
            .read(&transport_request(json!({"lane":"default"})))
            .unwrap()
    });
    assert_eq!(current["authoritative"]["totalQuantity"], 2);
}

#[test]
fn incomplete_variant_price_falls_back_to_the_complete_product_price() {
    let seams = FakeSeams::new();
    let generation = open_cart(&seams);
    seed_catalog_item(&seams, "sku-1", 500, "USD", 10);
    let mut product = seams.get_entry(crate::ids::MODEL_CATALOG, "sku-1").unwrap();
    product["variants"][0]["price"] = json!({ "currency": "EUR" });
    seams.seed(crate::ids::MODEL_CATALOG, "sku-1", product);
    let mut request = transport_add(&generation, 0, "op-variant-fallback", 1);
    request["mutation"]["item"]["variantId"] = json!("blue");

    let applied = apply_request(&seams, request).unwrap();
    assert_eq!(applied["state"]["subtotalCents"], 500);
    assert_eq!(applied["state"]["currency"], "USD");
    assert_eq!(applied["state"]["lines"][0]["titleSnapshot"], "Blue sku-1");
}

#[test]
fn exact_replay_survives_catalog_change_but_new_operation_uses_new_price() {
    let seams = FakeSeams::new();
    let generation = open_cart(&seams);
    seed_catalog_item(&seams, "sku-1", 500, "USD", 10);
    let request = transport_add(&generation, 0, "op-stable-price", 1);
    let first = apply_request(&seams, request.clone()).unwrap();
    assert_eq!(first["state"]["subtotalCents"], 500);
    seed_catalog_item(&seams, "sku-1", 900, "USD", 10);
    let replay = apply_request(&seams, request).unwrap();
    assert_eq!(replay["outcome"], "replayed");
    assert_eq!(replay["authoritative"]["subtotalCents"], 500);

    let next = apply_request(&seams, transport_add(&generation, 1, "op-new-price", 1)).unwrap();
    assert_eq!(next["state"]["subtotalCents"], 1800);
}

#[test]
fn promotion_is_normalized_and_eligibility_failure_rolls_back() {
    let seams = FakeSeams::new();
    let generation = open_cart(&seams);
    seed_catalog_item(&seams, "sku-1", 500, "USD", 10);
    seams.seed(
        crate::ids::MODEL_CATALOG,
        "coupon:SAVE10",
        json!({
            "recordType": "coupon", "code": "SAVE10", "active": false,
            "discountType": "percentage", "discountBps": 1000,
            "paymentMethod": "any", "appliesAt": "cart"
        }),
    );
    let body = json!({
        "lane": "default", "generation": generation, "expectedVersion": 0,
        "operationId": "op-promo", "mutation": { "kind": "replace_snapshot",
        "snapshot": { "items": [{"resource":"sku-1","qty":1}], "promoCode":" save10 " }}
    });
    let before = storage_entry_count(&seams);
    assert_eq!(
        apply_request(&seams, body).unwrap_err().code,
        "coupon_not_applicable"
    );
    assert_eq!(storage_entry_count(&seams), before);

    let conflicting = json!({
        "lane": "default", "generation": generation, "expectedVersion": 0,
        "operationId": "op-conflicting-promo", "mutation": { "kind": "replace_snapshot",
        "snapshot": { "items": [{"resource":"sku-1","qty":1}],
        "promoCode":"SAVE10", "promoCodes":["OTHER"] }}
    });
    assert_eq!(apply_request(&seams, conflicting).unwrap_err().status, 422);
    assert_eq!(storage_entry_count(&seams), before);
}

#[test]
fn physical_cart_mutations_require_saved_classification_but_allow_removal() {
    let seams = FakeSeams::new();
    let generation = open_cart(&seams);
    seed_catalog_item(&seams, "sku-1", 500, "USD", 10);
    *seams.native_storefront_policy.borrow_mut() = Ok(crate::reqresp::RouteResponse::ok(&json!({
        "contractVersion":1,"mode":"physical","selectedContributionIds":crate::native_storefront_policy::physical_contributions()
    })));
    let before = storage_entry_count(&seams);
    let error = apply_request(&seams, transport_add(&generation, 0, "digital-add", 1)).unwrap_err();
    assert_eq!(error.code, "native_storefront_physical_only");
    assert_eq!(storage_entry_count(&seams), before);
    let mut product = seams.get_entry(crate::ids::MODEL_CATALOG, "sku-1").unwrap();
    product["productType"] = json!("standard");
    product["paymentResource"] = json!("sku-1");
    product["shippingProfileId"] = json!("goods");
    product["fulfillment"] = json!({"type":"physical","shippingProfileId":"goods"});
    seams.seed(crate::ids::MODEL_CATALOG, "sku-1", product);
    seams.seed(
        crate::ids::MODEL_CATALOG,
        "shipping_profile:goods",
        json!({"id":"goods","kind":"shippingProfile","active":true}),
    );
    let applied = apply_request(&seams, transport_add(&generation, 0, "physical-add", 1)).unwrap();
    assert_eq!(applied["outcome"], "applied");
    seams.seed(
        crate::ids::MODEL_CATALOG,
        "sku-1",
        json!({"productType":"digital"}),
    );
    let removed = apply_request(&seams, json!({"lane":"default","generation":generation,"expectedVersion":1,"operationId":"remove-old","mutation":{"kind":"remove","resource":"sku-1"}})).unwrap();
    assert_eq!(removed["outcome"], "applied");
    assert_eq!(removed["state"]["totalQuantity"], 0);
}
