use super::*;
use crate::{fake::FakeSeams, reqresp::RouteRequest};

fn req(route: &str, body: Value) -> RouteRequest {
    RouteRequest{route_id:route.into(),method:"POST".into(),path:match route{QUERY=>"/admin/assistant/products/query",UPDATE=>"/admin/assistant/products/update",DELETE=>"/admin/assistant/products/delete",_=>"/admin/assistant/products/create"}.into(),body:body.to_string(),context_json:json!({"authenticated":true,"authScheme":"bearer-token","actorId":"operator-a","capabilityClaims":[route],"siteId":"site-a","idempotencyKey":"catalog-stable-key"}).to_string(),..Default::default()}
}
fn setup() -> FakeSeams {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    seams.seed(ids::MODEL_CATALOG,"shipping_profile:standard",json!({"kind":"shippingProfile","id":"standard","active":true,"name":"Standard shipping","countries":["US"]}));
    let r = crate::handle_route(
        &seams,
        req(
            CREATE,
            json!({"physicalGoods":true,"shippingProfileId":"standard","product":{"id":"mug","slug":"mug","title":"Mug","productType":"standard","price":{"amountCents":1900,"currency":"USD"},"active":false,"public":false}}),
        ),
    );
    assert_eq!(r.status, 200, "{}", r.body);
    seams
}
#[test]
fn create_and_read_allow_bounded_catalog_claims_without_generic_admin() {
    let seams = setup();
    let before = seams.db_batch_request_count();
    let r = crate::handle_route(&seams, req(QUERY, json!({"productId":"mug"})));
    assert_eq!(r.status, 200, "{}", r.body);
    let v: Value = serde_json::from_str(&r.body).unwrap();
    assert_eq!(v["products"][0]["active"], false);
    assert_eq!(v["products"][0]["lifecycle"]["state"], "inactive");
    assert!(v["products"][0]["catalogVersion"].as_str().is_some());
    assert!(v["products"][0].get("purchaseAction").is_none());
    assert_eq!(before, seams.db_batch_request_count());
}
#[test]
fn exact_version_patch_preserves_private_fields_and_rejects_privilege_material() {
    let seams = setup();
    let db = Db::new(&seams, ids::DB_ACCESS);
    let mut entry = load(&db, "mug").unwrap();
    entry.payload["metadata"] = json!({"secret":"private-fixture"});
    entry.payload["unchangedSetting"] = json!("original");
    seams.seed(ids::MODEL_CATALOG, "mug", entry.payload);
    let entry = load(&db, "mug").unwrap();
    let version = entry.version.unwrap();
    let r = crate::handle_route(
        &seams,
        req(
            UPDATE,
            json!({"productId":"mug","expectedVersion":version,"patch":{"title":"New mug","price":{"amountCents":2100,"currency":"USD"}}}),
        ),
    );
    assert_eq!(r.status, 200, "{}", r.body);
    assert!(!r.body.contains("private-fixture"));
    assert!(!r.body.contains("metadata"));
    let saved = load(&db, "mug").unwrap();
    assert_eq!(saved.payload["metadata"]["secret"], "private-fixture");
    assert_eq!(saved.payload["shippingProfileId"], "standard");
    assert_eq!(saved.payload["active"], false);
    assert_eq!(saved.payload["fiatAmountCents"], 2100);
    let stale = crate::handle_route(
        &seams,
        req(
            UPDATE,
            json!({"productId":"mug","expectedVersion":version,"patch":{"title":"stale"}}),
        ),
    );
    assert_eq!(stale.status, 409);
    let invalid = crate::handle_route(
        &seams,
        req(
            UPDATE,
            json!({"productId":"mug","expectedVersion":saved.version,"patch":{"metadata":{"grant":"all"}}}),
        ),
    );
    assert_eq!(invalid.status, 400);
}
#[test]
fn opaque_fields_wrong_identity_and_limits_fail_without_changes() {
    let seams = setup();
    let before = seams.db_batch_request_count();
    assert_eq!(
        crate::handle_route(&seams, req(QUERY, json!({"limit":101}))).status,
        400
    );
    assert_eq!(
        crate::handle_route(&seams, req(QUERY, json!({"productId":"../other"}))).status,
        400
    );
    assert_eq!(
        crate::handle_route(&seams, req(QUERY, json!({"collection":"credentials"}))).status,
        400
    );
    let mut r = req(QUERY, json!({}));
    r.context_json=json!({"authenticated":true,"authScheme":"bearer-token","capabilityClaims":[UPDATE],"siteId":"site-a"}).to_string();
    assert_eq!(crate::handle_route(&seams, r).status, 403);
    assert_eq!(before, seams.db_batch_request_count());
}

#[test]
fn physical_mutations_reject_digital_markers_and_delete_requires_reviewed_version() {
    let seams = setup();
    let db = Db::new(&seams, ids::DB_ACCESS);
    let entry = load(&db, "mug").unwrap();
    let version = entry.version.unwrap();
    let digital = crate::handle_route(
        &seams,
        req(
            UPDATE,
            json!({"productId":"mug","expectedVersion":version,"patch":{"productType":"subscription"}}),
        ),
    );
    assert_eq!(digital.status, 422);
    assert_eq!(
        crate::handle_route(
            &seams,
            req(
                DELETE,
                json!({"productId":"mug","expectedVersion":"stale","confirmed":true})
            )
        )
        .status,
        409
    );
    assert_eq!(
        crate::handle_route(
            &seams,
            req(
                DELETE,
                json!({"productId":"mug","expectedVersion":version,"confirmed":false})
            )
        )
        .status,
        400
    );
    let deleted = crate::handle_route(
        &seams,
        req(
            DELETE,
            json!({"productId":"mug","expectedVersion":version,"confirmed":true}),
        ),
    );
    assert_eq!(deleted.status, 200, "{}", deleted.body);
    assert!(db.read_one(ids::MODEL_CATALOG, "mug").unwrap().is_none());
    let bad = crate::handle_route(
        &seams,
        req(
            CREATE,
            json!({"physicalGoods":true,"shippingProfileId":"missing","product":{"id":"ebook","slug":"ebook","title":"Book","productType":"standard","price":{"amountCents":100,"currency":"USD"},"active":true,"public":true}}),
        ),
    );
    assert_eq!(bad.status, 422);
    assert!(db.read_one(ids::MODEL_CATALOG, "ebook").unwrap().is_none());
}

#[test]
fn physical_prices_reject_crypto_missing_and_noncanonical_currency_without_writes() {
    let seams = setup();
    let db = Db::new(&seams, ids::DB_ACCESS);
    let version = load(&db, "mug").unwrap().version.unwrap();
    let before = seams.db_batch_request_count();
    for currency in [
        json!("BTC"),
        json!("SOL"),
        json!("ZZZ"),
        json!("usd"),
        Value::Null,
    ] {
        let price = json!({"amountCents":1900,"currency":currency});
        let create = crate::handle_route(
            &seams,
            req(
                CREATE,
                json!({
                    "physicalGoods":true,"shippingProfileId":"standard",
                    "product":{"id":"rejected","slug":"rejected","title":"Rejected","productType":"standard","price":price,"active":false,"public":false}
                }),
            ),
        );
        assert_eq!(create.status, 422, "{}", create.body);
        let update = crate::handle_route(
            &seams,
            req(
                UPDATE,
                json!({
                    "productId":"mug","expectedVersion":version,"patch":{"price":price}
                }),
            ),
        );
        assert_eq!(update.status, 422, "{}", update.body);
    }
    assert_eq!(before, seams.db_batch_request_count());
    assert!(db
        .read_one(ids::MODEL_CATALOG, "rejected")
        .unwrap()
        .is_none());
    assert_eq!(load(&db, "mug").unwrap().payload["fiatCurrency"], "USD");
}

#[test]
fn physical_create_and_update_fence_shipping_profile_changes_atomically() {
    for create in [true, false] {
        let seams = setup();
        let db = Db::new(&seams, ids::DB_ACCESS);
        let version = load(&db, "mug").unwrap().version.unwrap();
        let mut profile = db
            .read_one(ids::MODEL_CATALOG, "shipping_profile:standard")
            .unwrap()
            .unwrap()
            .payload;
        profile["active"] = json!(false);
        seams.queue_guarded_race(vec![(
            ids::MODEL_CATALOG,
            "shipping_profile:standard",
            profile,
        )]);
        let (route, body) = if create {
            (
                CREATE,
                json!({"physicalGoods":true,"shippingProfileId":"standard","product":{
                    "id":"raced","slug":"raced","title":"Raced","productType":"standard","price":{"amountCents":1900,"currency":"USD"},"active":false,"public":false
                }}),
            )
        } else {
            (
                UPDATE,
                json!({"productId":"mug","expectedVersion":version,"patch":{"title":"Raced"}}),
            )
        };
        let result = crate::handle_route(&seams, req(route, body));
        assert_eq!(result.status, 409, "{}", result.body);
        assert!(db.read_one(ids::MODEL_CATALOG, "raced").unwrap().is_none());
        assert_eq!(load(&db, "mug").unwrap().payload["title"], "Mug");
    }
}

#[test]
fn effective_nonfiat_prices_cannot_be_published_by_unrelated_field_patches() {
    for price_shape in ["flat", "price", "fiatPrice", "variant"] {
        let seams = setup();
        let db = Db::new(&seams, ids::DB_ACCESS);
        let mut original = load(&db, "mug").unwrap().payload;
        match price_shape {
            "flat" => original["fiatCurrency"] = json!("BTC"),
            "price" => original["price"] = json!({"amountCents":1900,"currency":"BTC"}),
            "fiatPrice" => original["fiatPrice"] = json!({"amountCents":1900,"currency":"BTC"}),
            _ => {
                original["variants"] =
                    json!([{"id":"crypto-variant","price":{"amountCents":1900,"currency":"BTC"}}])
            }
        }
        seams.seed(ids::MODEL_CATALOG, "mug", original.clone());
        let version = load(&db, "mug").unwrap().version.unwrap();
        let before = seams.db_batch_request_count();
        for patch in [
            json!({"active":true,"public":true}),
            json!({"title":"Copied"}),
        ] {
            let result = crate::handle_route(
                &seams,
                req(
                    UPDATE,
                    json!({"productId":"mug","expectedVersion":version,"patch":patch}),
                ),
            );
            assert_eq!(result.status, 422, "{price_shape}: {}", result.body);
        }
        assert_eq!(before, seams.db_batch_request_count());
        assert_eq!(load(&db, "mug").unwrap().payload, original);
        assert!(seams.http_requests.borrow().is_empty());
    }
}

#[test]
fn linked_and_ambiguous_price_authority_cannot_be_masked_by_a_fiat_patch() {
    for material in [
        json!({"prices":[{"id":"linked","unitAmountCents":1900,"currency":"BTC","active":true}]}),
        json!({"prices":[{"id":"recurring","unitAmountCents":1900,"currency":"USD","billingInterval":"month"}]}),
        json!({"cryptoAtomicAmount":"1000000"}),
        json!({"fiatPrice":{"atomic":1900,"asset":{"code":"BTC"}}}),
        json!({"paymentResource":"other-product"}),
        json!({"variants":[{"id":"redirected","paymentResource":"other-product"}]}),
    ] {
        let seams = setup();
        let db = Db::new(&seams, ids::DB_ACCESS);
        let mut original = load(&db, "mug").unwrap().payload;
        original
            .as_object_mut()
            .unwrap()
            .extend(material.as_object().unwrap().clone());
        seams.seed(ids::MODEL_CATALOG, "mug", original.clone());
        let version = load(&db, "mug").unwrap().version.unwrap();
        let before = seams.db_batch_request_count();
        for patch in [
            json!({"active":true,"public":true}),
            json!({"price":{"amountCents":2100,"currency":"USD"}}),
        ] {
            let result = crate::handle_route(
                &seams,
                req(
                    UPDATE,
                    json!({"productId":"mug","expectedVersion":version,"patch":patch}),
                ),
            );
            assert_eq!(result.status, 422, "{material}: {}", result.body);
        }
        assert_eq!(before, seams.db_batch_request_count());
        assert_eq!(load(&db, "mug").unwrap().payload, original);
    }
}

#[test]
fn supported_fiat_aliases_and_variants_are_preserved_on_safe_publication() {
    let seams = setup();
    let db = Db::new(&seams, ids::DB_ACCESS);
    let mut original = load(&db, "mug").unwrap().payload;
    original["price"] = json!({"amountCents":1900,"currency":"USD"});
    original["fiatPrice"] = original["price"].clone();
    original["cryptoAtomicAmount"] = json!(0);
    original["cryptoToken"] = json!("USDC");
    original["variants"] = json!([{"id":"large","price":{"amountCents":2400,"currency":"USD"}}]);
    seams.seed(ids::MODEL_CATALOG, "mug", original.clone());
    let version = load(&db, "mug").unwrap().version.unwrap();
    let result = crate::handle_route(
        &seams,
        req(
            UPDATE,
            json!({"productId":"mug","expectedVersion":version,"patch":{"active":true,"public":true}}),
        ),
    );
    assert_eq!(result.status, 200, "{}", result.body);
    let saved = load(&db, "mug").unwrap().payload;
    assert_eq!(saved["variants"], original["variants"]);
    assert_eq!(saved["price"], original["price"]);
    assert_eq!(saved["fiatPrice"], original["fiatPrice"]);
}
