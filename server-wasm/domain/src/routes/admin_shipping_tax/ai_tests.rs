use super::*;
use crate::fake::FakeSeams;
fn req(route: &str, body: Value) -> RouteRequest {
    RouteRequest{route_id:route.into(),method:"POST".into(),path:match route{QUERY=>"/admin/assistant/shipping/query",PROFILE_SAVE=>"/admin/assistant/shipping/profile",_=>"/admin/assistant/shipping/rate"}.into(),body:body.to_string(),context_json:json!({"authenticated":true,"authScheme":"bearer-token","actorId":"owner-a","siteId":"site-a","capabilityClaims":[route],"idempotencyKey":"shipping-setup-1"}).to_string(),..Default::default()}
}
fn call(seams: &FakeSeams, route: &str, body: Value) -> Value {
    let r = crate::handle_route(seams, req(route, body));
    assert_eq!(r.status, 200, "{}", r.body);
    serde_json::from_str(&r.body).unwrap()
}
fn profile() -> Value {
    json!({"id":"standard","name":"Standard shipping","countries":["US"],"active":true})
}
fn rate() -> Value {
    json!({"id":"us-flat","name":"US shipping","rateType":"flat","amountCents":500,"currency":"USD","active":true})
}
#[test]
fn empty_store_shipping_and_physical_product_setup_is_discoverable_end_to_end() {
    let s = FakeSeams::new();
    crate::guarded_policy::enroll(&s).unwrap();
    assert_eq!(call(&s, QUERY, json!({}))["status"], "missing");
    let saved = call(
        &s,
        PROFILE_SAVE,
        json!({"expectedVersion":null,"profile":profile()}),
    );
    let version = saved["profile"]["catalogVersion"].as_str().unwrap();
    let q = call(&s, QUERY, json!({"profileId":"standard"}));
    assert_eq!(q["status"], "rates_required");
    assert_eq!(q["canCreatePhysicalProduct"], true);
    call(
        &s,
        RATE_SAVE,
        json!({"profileId":"standard","expectedProfileVersion":version,"expectedVersion":null,"rate":rate()}),
    );
    let q = call(&s, QUERY, json!({"profileId":"standard"}));
    assert_eq!(q["status"], "configured");
    assert_eq!(q["rates"][0]["id"], "us-flat");
    assert!(q["rates"][0]["catalogVersion"].as_str().is_some());
    let route = "cedros-pay:ai-physical-product-create";
    let mut r = req(
        route,
        json!({"physicalGoods":true,"shippingProfileId":q["profiles"][0]["id"],"product":{"id":"mug","slug":"mug","title":"Mug","productType":"standard","price":{"amountCents":2000,"currency":"USD"},"active":true,"public":true}}),
    );
    r.path = "/admin/assistant/products/create".into();
    let result = crate::handle_route(&s, r);
    assert_eq!(result.status, 200, "{}", result.body);
    assert!(s.http_requests.borrow().is_empty());
    assert!(s.secret_reads.borrow().is_empty());
}
#[test]
fn setup_writes_are_revision_guarded_and_never_overwrite_an_unreviewed_target() {
    let s = FakeSeams::new();
    crate::guarded_policy::enroll(&s).unwrap();
    let saved = call(
        &s,
        PROFILE_SAVE,
        json!({"expectedVersion":null,"profile":profile()}),
    );
    let v = saved["profile"]["catalogVersion"].clone();
    assert_eq!(
        crate::handle_route(
            &s,
            req(
                PROFILE_SAVE,
                json!({"expectedVersion":null,"profile":profile()})
            )
        )
        .status,
        409
    );
    let mut inactive = profile();
    inactive["active"] = json!(false);
    call(
        &s,
        PROFILE_SAVE,
        json!({"expectedVersion":v,"profile":inactive}),
    );
    assert_eq!(
        call(&s, QUERY, json!({"profileId":"standard"}))["status"],
        "inactive"
    );
    assert_eq!(
        crate::handle_route(
            &s,
            req(
                PROFILE_SAVE,
                json!({"expectedVersion":v,"profile":profile()})
            )
        )
        .status,
        409
    );
    assert_eq!(crate::handle_route(&s,req(RATE_SAVE,json!({"profileId":"standard","expectedProfileVersion":v,"expectedVersion":null,"rate":rate()}))).status,422);
}
#[test]
fn shipping_rejects_missing_profile_foreign_claims_crypto_unsupported_basis_and_secrets() {
    let s = FakeSeams::new();
    crate::guarded_policy::enroll(&s).unwrap();
    assert_eq!(
        call(&s, QUERY, json!({"profileId":"missing"}))["status"],
        "missing"
    );
    let mut secret = profile();
    secret["token"] = json!("forbidden");
    assert_eq!(
        crate::handle_route(
            &s,
            req(
                PROFILE_SAVE,
                json!({"expectedVersion":null,"profile":secret})
            )
        )
        .status,
        400
    );
    let saved = call(
        &s,
        PROFILE_SAVE,
        json!({"expectedVersion":null,"profile":profile()}),
    );
    let v = saved["profile"]["catalogVersion"].clone();
    for patch in [json!({"currency":"SOL"}), json!({"rateType":"weight"})] {
        let mut value = rate();
        value
            .as_object_mut()
            .unwrap()
            .extend(patch.as_object().unwrap().clone());
        assert_eq!(crate::handle_route(&s,req(RATE_SAVE,json!({"profileId":"standard","expectedProfileVersion":v,"expectedVersion":null,"rate":value}))).status,422);
    }
    let mut r = req(
        PROFILE_SAVE,
        json!({"expectedVersion":null,"profile":profile()}),
    );
    r.context_json=json!({"authenticated":true,"authScheme":"bearer-token","capabilityClaims":[QUERY],"siteId":"site-a"}).to_string();
    assert_eq!(crate::handle_route(&s, r).status, 403);
}

#[test]
fn read_back_returns_one_current_revision_without_mixing_stale_fields() {
    let s = FakeSeams::new();
    crate::guarded_policy::enroll(&s).unwrap();
    call(
        &s,
        PROFILE_SAVE,
        json!({"expectedVersion":null,"profile":profile()}),
    );
    let db = Db::new(&s, ids::DB_ACCESS);
    let key = profile_key("standard");
    let mut current = db.read_one(ids::MODEL_CATALOG, &key).unwrap().unwrap();
    current.payload["name"] = json!("Concurrent newer name");
    current.payload["privateMetadata"] = json!({"token":"hidden"});
    s.seed(ids::MODEL_CATALOG, &key, current.payload);
    let projected = versioned(&db, &key).unwrap();
    assert_eq!(projected["name"], "Concurrent newer name");
    assert!(!projected.to_string().contains("hidden"));
    assert_eq!(
        projected["catalogVersion"],
        json!(
            db.read_one(ids::MODEL_CATALOG, &key)
                .unwrap()
                .unwrap()
                .version
        )
    );
}
