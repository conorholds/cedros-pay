use super::*;
use crate::{fake::FakeSeams, guarded_policy, seams::HostSeams, time};
use serde_json::{json, Value};
fn fixture(id: &str) -> Value {
    let f: Value = serde_json::from_str(include_str!(
        "../../../../docs/contracts/capacity-v1/fixtures/portal-usage-capacity-v1.fixtures.json"
    ))
    .unwrap();
    f["fixtures"]
        .as_array()
        .unwrap()
        .iter()
        .find(|f| f["id"] == id)
        .unwrap()["value"]
        .clone()
}
fn setup() -> FakeSeams {
    let s = FakeSeams::new();
    s.set_now(time::parse_iso("2026-09-09T12:01:00Z").unwrap());
    s.seed(guarded_policy::CONTROL_MODEL,guarded_policy::MARKER_KEY,json!({"schemaVersion":1,"capabilityId":guarded_policy::CAPABILITY_ID,"minCedrosDataVersion":guarded_policy::MIN_DATA_VERSION,"requestSchemaVersion":1,"hostCommit":guarded_policy::HOST_COMMIT,"models":guarded_policy::GUARDED_MODELS,"modelSetSha256":guarded_policy::MODEL_SET_SHA256,"policy":"guarded-only","active":true,"hostTimestamp":"2026-09-09T12:00:00Z"}));
    s.setting_set(config::SETTING,&json!({"payInstallationId":"example-pay-installation","environment":"test","salesEnabled":true,"jointActivationVerified":true,"stripePortalConfigurationId":"bpc_capacity","portalOrigin":"https://portal.example","recoveryPath":"/upgrade","organizations":{"example-org-a":{"stripeCustomerId":"cus_org","baseSubscriptionIds":["example-base-subscription"],"commercialVerified":true,"runtimeReady":true}}}).to_string()).unwrap();
    s.setting_set("stripe.mode", "test").unwrap();
    s
}
fn service(s: &FakeSeams, value: Value) {
    s.service_responses
        .borrow_mut()
        .push_back(Ok(RouteResponse::ok(&value)));
}
fn request(op: &str, command: Value, key: Option<&str>, native: bool) -> RouteRequest {
    let b = wire::contract()["serviceBindings"]
        .as_array()
        .unwrap()
        .iter()
        .find(|b| b["operationId"] == op)
        .unwrap();
    let caller = if native {
        "cedros-data"
    } else {
        "cedros-portal"
    };
    RouteRequest{route_id:b["routeId"].as_str().unwrap().into(),method:"POST".into(),path:b["path"].as_str().unwrap().into(),body:json!({"contractVersion":"1.0.0","operationId":op,"delegationId":if native{Value::Null}else{json!("secret-delegation")},"requestKey":key,"command":command}).to_string(),context_json:json!({"authenticated":true,"authScheme":"extension-service","principalId":caller,"actorId":caller,"permissionClaims":[b["capabilityId"]],"orgId":"example-org-a"}).to_string(),..Default::default()}
}
fn delegation(s: &FakeSeams) {
    service(
        s,
        json!({"contractVersion":"1.0.0","actingUserId":"example-user-a","organizationId":"example-org-a","payInstallationId":"example-pay-installation","environment":"test","authority":"BillingManage","expiresAt":time::iso8601(s.now_unix_secs()+300)}),
    );
}
fn scope(s: &FakeSeams, target: &Value) {
    service(
        s,
        json!({"contractVersion":"1.0.0","target":target,"buyerUserId":"example-user-a","payInstallationId":"example-pay-installation","environment":"test","authorized":true,"checkedAt":time::iso8601(s.now_unix_secs())}),
    );
}
fn seed_quote(s: &FakeSeams) -> Value {
    let snap = fixture("immutable-full-quote");
    let id = snap["quote"]["quoteId"].clone();
    s.seed(
        store::MODEL,
        &store::key("quote", &id).unwrap(),
        store::scoped_record(
            "quote",
            &store::scope(&snap["quote"]["binding"]),
            json!({"snapshot":snap,"material":{},"stripeCustomerId":"cus_org"}),
        ),
    );
    snap
}
#[test]
fn pinned_schema_and_canonical_digest_match_data() {
    let contract: Value = serde_json::from_str(include_str!(
        "../../../../docs/contracts/capacity-v1/portal-usage-capacity-v1.contract.json"
    ))
    .unwrap();
    assert_eq!(contract["contractVersion"], "1.2.0");
    assert_eq!(wire::VERSION, "1.0.0");

    let f: Value = serde_json::from_str(include_str!(
        "../../../../docs/contracts/capacity-v1/fixtures/portal-usage-capacity-v1.fixtures.json"
    ))
    .unwrap();
    for row in f["fixtures"].as_array().unwrap() {
        let name = row["schemaRef"]
            .as_str()
            .unwrap()
            .trim_start_matches("#/$defs/");
        // The public contract also contains Data-owned Usage and native
        // accounting schemas that Pay never accepts or emits. Their complete
        // JSON Schema corpus is covered by the vendored reference checker;
        // this focused validator regression covers Pay's runtime boundary.
        if !matches!(
            name,
            "AuthorizeResponse"
                | "BillingActionResponse"
                | "BillingBindingResponse"
                | "CancelResponse"
                | "Capacity"
                | "DiscoveryResponse"
                | "Error"
                | "Grant"
                | "GrantPageResponse"
                | "Invocation"
                | "OffersResponse"
                | "PayPurchaseResponse"
                | "PreviewResponse"
                | "PurchaseListResponse"
                | "PurchaseRequest"
                | "Quote"
                | "StatusResponse"
        ) {
            continue;
        }
        assert_eq!(
            wire::validate(name, &row["value"]).is_ok(),
            row["valid"] == true,
            "{}",
            row["id"]
        );
    }
    let snap = fixture("immutable-full-quote");
    assert_eq!(wire::digest(&snap["quote"]).unwrap(), snap["quoteDigest"]);
    for raw in [
        r#"{"a":1,"a":2}"#,
        r#"{"nested":{"a":1,"a":1}}"#,
        r#"{"n":1.5}"#,
        r#"{"n":9007199254740992}"#,
    ] {
        assert!(wire::parse(raw).is_err());
    }
}
#[test]
fn trusted_read_is_confined_and_has_no_data_callback() {
    let s = setup();
    let snap = seed_quote(&s);
    let mut req = request(
        "capacity.preview.read",
        json!({"quoteId":snap["quote"]["quoteId"]}),
        None,
        true,
    );
    let out = handle(&s, &req);
    assert_eq!(out.status, 200, "{}", out.body);
    assert_eq!(serde_json::from_str::<Value>(&out.body).unwrap(), snap);
    assert!(s.service_requests.borrow().is_empty());
    req.context_json = req.context_json.replace("example-org-a", "other-org");
    assert_eq!(handle(&s, &req).status, 404);
    req.context_json = req.context_json.replace("cedros-data", "attacker");
    assert_eq!(handle(&s, &req).status, 403);
}
#[test]
fn exact_registration_and_body_authority_fail_closed() {
    let s = setup();
    let mut req = request(
        "capacity.offers",
        json!({"scope":{"organizationId":"example-org-a","siteId":null},"baseSubscriptionId":"example-base-subscription"}),
        None,
        false,
    );
    req.context_json = "{}".into();
    assert_eq!(handle(&s, &req).status, 403);
    assert!(s.service_requests.borrow().is_empty());
    req.method = "GET".into();
    assert_eq!(handle(&s, &req).status, 422);
    req.method = "POST".into();
    req.body = req.body.replace("1.0.0", "0.3.0");
    assert_eq!(handle(&s, &req).status, 422);
}
#[test]
fn duplicate_purchase_keeps_one_acceptance_and_no_browser_payment() {
    let s = setup();
    let snap = seed_quote(&s);
    let command = json!({"authorizationId":"example-auth","quoteId":snap["quote"]["quoteId"],"quoteDigest":snap["quoteDigest"]});
    let target = purchase::target(&snap["quote"]["binding"]);
    let id = format!(
        "capp_{}",
        wire::digest(&json!([
            snap["quote"]["binding"]["payInstallationId"],
            snap["quote"]["binding"]["environment"],
            snap["quote"]["quoteId"]
        ]))
        .unwrap()
        .trim_start_matches("sha256:")
    );
    for (i, key) in ["key-a", "key-a", "key-b"].iter().enumerate() {
        delegation(&s);
        scope(&s, &target);
        if i == 0 {
            service(
                &s,
                json!({"contractVersion":"1.0.0","authorizationId":"example-auth","purchaseId":id,"quoteId":snap["quote"]["quoteId"],"quoteDigest":snap["quoteDigest"],"acceptedAt":"2026-09-09T12:01:00Z","replayed":false}),
            );
        }
        let out = handle(
            &s,
            &request("capacity.purchase", command.clone(), Some(key), false),
        );
        assert_eq!(out.status, if i == 0 { 201 } else { 200 }, "{}", out.body);
        assert_eq!(
            serde_json::from_str::<Value>(&out.body).unwrap()["purchaseId"],
            id
        );
    }
    assert_eq!(store::list(&s, "purchase", None).unwrap().len(), 1);
    assert!(s.http_requests.borrow().is_empty());
    assert_eq!(
        s.service_requests
            .borrow()
            .iter()
            .filter(|r| r.route_id == "cedros-data:capacity-authorization-redeem-v1")
            .count(),
        1
    );
    delegation(&s);
    let mut changed = command;
    changed["quoteDigest"] = json!(format!("sha256:{}", "0".repeat(64)));
    assert_eq!(
        handle(
            &s,
            &request("capacity.purchase", changed, Some("key-a"), false)
        )
        .status,
        409
    );
}
#[test]
fn empty_snapshot_bootstraps_revision_zero() {
    let s = setup();
    let out = handle(
        &s,
        &request(
            "capacity.grants.snapshot",
            json!({"organizationId":"example-org-a","cursor":null}),
            None,
            true,
        ),
    );
    assert_eq!(out.status, 200, "{}", out.body);
    let page: Value = serde_json::from_str(&out.body).unwrap();
    assert_eq!(page["sourceRevision"], 0);
    assert_eq!(page["grants"], json!([]));
    wire::validate("GrantPageResponse", &page).unwrap();
}
#[test]
fn capacity_receipts_preserve_legacy_subscription_identity_types() {
    let s = setup();
    let legacy = json!({"schemaVersion":1,"operation":"checkout","identity":"legacy-checkout","status":"initiating"});
    s.seed(store::MODEL, "op:checkout:legacy", legacy.clone());
    let identity = json!(["capacity.preview", "install", "test", "org", "actor", "key"]);
    let command = json!({"quantity":6,"couponCode":"conor"});
    let receipt = store::claim_receipt(&s, &identity, &command).unwrap();
    assert_eq!(receipt.payload["capacityIdentity"], identity);
    assert!(receipt.payload.get("identity").is_none());
    assert_eq!(
        store::get(&s, "op:checkout:legacy")
            .unwrap()
            .unwrap()
            .payload,
        legacy
    );
    let replay = store::claim_receipt(&s, &identity, &command).unwrap();
    assert_eq!(replay.entry_key, receipt.entry_key);
    assert_eq!(replay.payload, receipt.payload);
    assert_eq!(
        store::claim_receipt(&s, &identity, &json!({"quantity":7}))
            .unwrap_err()
            .code,
        "idempotency_conflict"
    );
}
#[test]
fn capacity_receipts_replay_older_identity_arrays_without_rewriting() {
    let s = setup();
    let identity = json!(["capacity.preview", "install", "test", "org", "actor", "key"]);
    let command = json!({"quantity":1});
    let key = store::key("receipt", &identity).unwrap();
    let prior = json!({"capacityRecordType":"receipt","identity":identity,"commandDigest":wire::digest(&command).unwrap(),"command":command,"outcome":{"saved":true},"operationId":"capop-prior","createdAt":time::iso8601(s.now_unix_secs())});
    s.seed(store::MODEL, &key, prior.clone());
    assert_eq!(
        store::claim_receipt(&s, &identity, &command)
            .unwrap()
            .payload,
        prior
    );
    assert_eq!(store::get(&s, &key).unwrap().unwrap().payload, prior);
}
#[test]
fn durable_receipts_survive_new_actor_and_changed_command() {
    let s = setup();
    let identity = json!(["capacity.cancel", "install", "test", "org", "actor", "key"]);
    let command = json!({"purchaseId":"a","mode":"at_paid_through"});
    let r = store::claim_receipt(&s, &identity, &command).unwrap();
    store::finish(&s, &r, &json!({"saved":true})).unwrap();
    assert_eq!(
        store::claim_receipt(&s, &identity, &command)
            .unwrap()
            .payload["outcome"],
        json!({"saved":true})
    );
    assert_eq!(
        store::claim_receipt(
            &s,
            &identity,
            &json!({"purchaseId":"b","mode":"at_paid_through"})
        )
        .unwrap_err()
        .code,
        "idempotency_conflict"
    );
}
fn accepted(s: &FakeSeams) -> String {
    let snapshot = seed_quote(s);
    let target = purchase::target(&snapshot["quote"]["binding"]);
    let id = format!(
        "capp_{}",
        wire::digest(&json!([
            snapshot["quote"]["binding"]["payInstallationId"],
            snapshot["quote"]["binding"]["environment"],
            snapshot["quote"]["quoteId"]
        ]))
        .unwrap()
        .trim_start_matches("sha256:")
    );
    delegation(s);
    scope(s, &target);
    service(
        s,
        json!({"contractVersion":"1.0.0","authorizationId":"example-auth","purchaseId":id,"quoteId":snapshot["quote"]["quoteId"],"quoteDigest":snapshot["quoteDigest"],"acceptedAt":"2026-09-09T12:01:00Z","replayed":false}),
    );
    let out = handle(
        s,
        &request(
            "capacity.purchase",
            json!({"authorizationId":"example-auth","quoteId":snapshot["quote"]["quoteId"],"quoteDigest":snapshot["quoteDigest"]}),
            Some("purchase-key"),
            false,
        ),
    );
    assert_eq!(out.status, 201, "{}", out.body);
    let row = purchase::read(s, &id).unwrap();
    let mut value = row.payload.clone();
    value["data"]["providerSubscriptionId"] = "sub_capacity".into();
    s.seed(store::MODEL, &row.entry_key, value);
    id
}
fn invoice(s: &FakeSeams, id: &str, kind: &str, period: &str, paid: bool) -> Value {
    let row = purchase::read(s, id).unwrap();
    let q = &row.payload["data"]["snapshot"]["quote"];
    let start = wire::stamp(q, "paidThrough").unwrap();
    json!({"id":period,"customer":"cus_org","subscription":"sub_capacity","livemode":false,"currency":q["binding"]["terms"]["currency"].as_str().unwrap().to_ascii_lowercase(),"billing_reason":kind,"status":if paid{"paid"}else{"open"},"paid":paid,"paid_out_of_band":false,"amount_paid":if paid{q["totalDueMinor"].clone()}else{json!(0)},"amount_remaining":if paid{json!(0)}else{q["totalDueMinor"].clone()},"total":q["totalDueMinor"],"amount_due":q["totalDueMinor"],"subtotal":q["subtotalMinor"],"tax":q["taxMinor"],"attempt_count":1,"payment_intent":{"id":format!("pi_{period}"),"status":if paid{"succeeded"}else{"requires_action"},"amount":q["totalDueMinor"],"amount_received":if paid{q["totalDueMinor"].clone()}else{json!(0)},"currency":q["binding"]["terms"]["currency"].as_str().unwrap().to_ascii_lowercase(),"customer":"cus_org"},"lines":{"has_more":false,"data":[{"type":"subscription","proration":false,"quantity":q["binding"]["quantity"],"price":{"unit_amount":q["binding"]["terms"]["pricePerItemMinor"],"recurring":{"interval":q["binding"]["terms"]["billingInterval"],"interval_count":1}},"period":{"start":start,"end":start+30*86400}}]}})
}
#[test]
fn paid_grants_are_atomic_replayed_and_recoverable_without_data() {
    let s = setup();
    let id = accepted(&s);
    let paid = invoice(&s, &id, "subscription_create", "in_initial", true);
    for _ in 0..2 {
        let row = purchase::read(&s, &id).unwrap();
        grants::invoice(&s, &row, &paid, None, None).unwrap();
    }
    let row = purchase::read(&s, &id).unwrap();
    assert_eq!(row.payload["data"]["grants"].as_array().unwrap().len(), 1);
    let scope = &row.payload["capacityScope"];
    let head = store::get(&s, &store::key("scope", scope).unwrap())
        .unwrap()
        .unwrap();
    assert_eq!(head.payload["sourceRevision"], 1);
    let response = handle(
        &s,
        &request(
            "capacity.grants.snapshot",
            json!({"organizationId":"example-org-a","cursor":null}),
            None,
            true,
        ),
    );
    assert_eq!(response.status, 200, "{}", response.body);
    let page: Value = serde_json::from_str(&response.body).unwrap();
    assert_eq!(page["grants"].as_array().unwrap().len(), 1);
    // The returned whole-snapshot digest is Data's canonical digest exactly.
    assert_eq!(page["snapshotDigest"],wire::digest(&json!({"payInstallationId":page["payInstallationId"],"environment":page["environment"],"organizationId":page["organizationId"],"sourceRevision":page["sourceRevision"],"grants":page["grants"]})).unwrap());
    assert_eq!(head.payload["hintDeliveredRevision"], 0);
}
#[test]
fn initial_auth_required_grants_nothing_and_failed_renewal_keeps_paid_interval() {
    let s = setup();
    let id = accepted(&s);
    let pending = invoice(&s, &id, "subscription_create", "in_initial", false);
    grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &pending, None, None).unwrap();
    assert_eq!(
        purchase::read(&s, &id).unwrap().payload["data"]["grants"],
        json!([])
    );
    let paid = invoice(&s, &id, "subscription_create", "in_initial", true);
    grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &paid, None, None).unwrap();
    let renewal = invoice(&s, &id, "subscription_cycle", "in_renewal", false);
    grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &renewal, None, None).unwrap();
    let row = purchase::read(&s, &id).unwrap();
    assert_eq!(row.payload["data"]["grants"].as_array().unwrap().len(), 1);
    assert_eq!(row.payload["data"]["service"]["state"], "active");
    let projection = purchase::projection(&row, s.now_unix_secs()).unwrap();
    assert_eq!(
        projection["latestAttempt"]["payment"]["state"],
        "action_required"
    );
    s.set_now(s.now_unix_secs() + 120);
    assert_eq!(
        purchase::projection(&row, s.now_unix_secs()).unwrap()["service"]["freshness"]["state"],
        "stale"
    );
}
#[test]
fn partial_refund_dispute_and_restoration_emit_explicit_revisions() {
    let s = setup();
    let id = accepted(&s);
    let paid = invoice(&s, &id, "subscription_create", "in_initial", true);
    grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &paid, None, None).unwrap();
    let mut charge = json!({"id":"ch_paid","customer":"cus_org","invoice":"in_initial","livemode":false,"amount":paid["total"],"amount_refunded":1,"disputed":false});
    s.set_now(s.now_unix_secs() + 10);
    grants::invoice(
        &s,
        &purchase::read(&s, &id).unwrap(),
        &paid,
        Some(&charge),
        None,
    )
    .unwrap();
    charge["disputed"] = true.into();
    let mut dispute = json!({"id":"dp_case","charge":"ch_paid","status":"under_review"});
    s.set_now(s.now_unix_secs() + 10);
    grants::invoice(
        &s,
        &purchase::read(&s, &id).unwrap(),
        &paid,
        Some(&charge),
        Some(&dispute),
    )
    .unwrap();
    dispute["status"] = "won".into();
    charge["disputed"] = false.into();
    s.set_now(s.now_unix_secs() + 10);
    grants::invoice(
        &s,
        &purchase::read(&s, &id).unwrap(),
        &paid,
        Some(&charge),
        Some(&dispute),
    )
    .unwrap();
    let row = purchase::read(&s, &id).unwrap();
    let gs = row.payload["data"]["grants"].as_array().unwrap();
    assert_eq!(gs.len(), 4);
    assert_eq!(gs[2]["state"], "revoked");
    assert_eq!(gs[3]["state"], "active");
    assert!(gs.iter().all(|g| g["allowance"] == gs[0]["allowance"]
        && g["effectiveAt"] == gs[0]["effectiveAt"]
        && g["snapshot"] == gs[0]["snapshot"]));
}
#[test]
fn stale_provider_observation_cannot_overwrite_newer_payment() {
    let s = setup();
    let id = accepted(&s);
    let original = purchase::read(&s, &id).unwrap();
    let paid = invoice(&s, &id, "subscription_create", "in_initial", true);
    grants::invoice(&s, &original, &paid, None, None).unwrap();
    let pending = invoice(&s, &id, "subscription_create", "in_initial", false);
    assert!(grants::invoice(&s, &original, &pending, None, None).is_err());
    assert_eq!(
        purchase::read(&s, &id).unwrap().payload["data"]["attempts"][0]["payment"]["state"],
        "paid"
    );
}
#[test]
fn confirmed_payment_after_expiry_keeps_original_interval() {
    let s = setup();
    let id = accepted(&s);
    let row = purchase::read(&s, &id).unwrap();
    let end = wire::stamp(&row.payload["data"]["snapshot"]["quote"], "paidThrough").unwrap();
    s.set_now(end + 3600);
    let paid = invoice(&s, &id, "subscription_create", "in_initial", true);
    grants::invoice(&s, &row, &paid, None, None).unwrap();
    let row = purchase::read(&s, &id).unwrap();
    assert_eq!(row.payload["data"]["service"]["state"], "ended");
    assert_eq!(
        wire::stamp(&row.payload["data"]["grants"][0], "expiresAt").unwrap(),
        end
    );
}
fn seed_catalog(s: &FakeSeams) -> Value {
    let mut terms = fixture("immutable-full-quote")["quote"]["binding"]["terms"].clone();
    terms["proration"] = "none".into();
    terms["serviceId"] = "sites".into();
    terms["meterId"] = "sites.count".into();
    terms["unit"] = "site".into();
    terms["resetKind"] = "occupancy".into();
    terms["allowanceBasis"] = "simultaneous_occupancy".into();
    let product = json!({"id":"cedros-addon-sites","stableHandle":"cedros-addon-sites","productType":"capacityAddOn","active":true,"public":true,"purchasable":true,"stripeProductId":"prod_sites","metadata":{"capacityV1":{"priceId":"fixture-price","terms":terms,"quantityConstraints":{"minimum":1,"maximum":10,"step":1},"commercialApprovalId":"synthetic-approval","partialRefundPolicy":"preserve_allowance","fullRefundPolicy":"revoke_at_confirmation","disputePolicy":"revoke_on_open_restore_on_win","latePaymentPolicy":"full_refund_after_expiry","currencyMinorUnitDigits":2,"taxBasisPoints":0,"stripeTaxRateId":null}},"prices":[{"id":"fixture-price","active":true,"public":true,"purchasable":true,"stripePriceId":"price_sites","unitAmountCents":terms["pricePerItemMinor"],"currency":terms["currency"],"billingInterval":terms["billingInterval"],"billingIntervalCount":1}]});
    s.seed(
        crate::ids::MODEL_CATALOG,
        "cedros-addon-sites",
        product.clone(),
    );
    product
}

#[path = "discount_tests.rs"]
mod discount_tests;
#[test]
fn authoritative_quote_checks_catalog_provider_quantity_and_replays_after_catalog_change() {
    let s = setup();
    s.secret_set(crate::ids::SECRET_STRIPE_KEY, "fixture-not-a-real-secret")
        .unwrap();
    let product = seed_catalog(&s);
    let target = json!({"scope":{"organizationId":"example-org-a","siteId":null},"baseSubscriptionId":"example-base-subscription"});
    delegation(&s);
    scope(&s, &target);
    let offers = handle(&s, &request("capacity.offers", target.clone(), None, false));
    assert_eq!(offers.status, 200, "{}", offers.body);
    let offers: Value = serde_json::from_str(&offers.body).unwrap();
    let offer = &offers["offers"][0];
    assert_eq!(offer["purchasable"], true);
    let command = json!({"target":target,"offerId":offer["offerId"],"offerVersion":offer["offerVersion"],"quantity":3});
    delegation(&s);
    scope(&s, &target);
    s.push_http_response(200,&json!({"id":"price_sites","product":"prod_sites","active":true,"livemode":false,"unit_amount":offer["terms"]["pricePerItemMinor"],"currency":offer["terms"]["currency"].as_str().unwrap().to_ascii_lowercase(),"recurring":{"interval":offer["terms"]["billingInterval"],"interval_count":1,"usage_type":"licensed"},"billing_scheme":"per_unit","tax_behavior":"exclusive"}).to_string());
    s.push_http_response(200,r#"{"id":"cus_org","livemode":false,"balance":0,"discount":null,"tax_exempt":"none","metadata":{"capacityOrganizationId":"example-org-a","capacityPayInstallationId":"example-pay-installation"}}"#);
    let first = handle(
        &s,
        &request(
            "capacity.preview",
            command.clone(),
            Some("quote-key"),
            false,
        ),
    );
    assert_eq!(first.status, 201, "{}", first.body);
    let snap: Value = serde_json::from_str(&first.body).unwrap();
    assert_eq!(
        snap["quote"]["capacityIncrease"]["amount"],
        wire::number(&offer["terms"], "allowancePerItem").unwrap() * 3
    );
    assert_eq!(
        snap["quote"]["totalDueMinor"],
        wire::number(&offer["terms"], "pricePerItemMinor").unwrap() * 3
    );
    let mut changed = product;
    changed["purchasable"] = false.into();
    s.seed(crate::ids::MODEL_CATALOG, "cedros-addon-sites", changed);
    delegation(&s);
    scope(&s, &target);
    let replay = handle(
        &s,
        &request("capacity.preview", command, Some("quote-key"), false),
    );
    assert_eq!(replay.status, 200);
    assert_eq!(replay.body, first.body);
    assert_eq!(s.http_requests.borrow().len(), 2);
}
#[test]
fn snapshot_cursor_replay_is_pinned_and_confined() {
    let s = setup();
    let id = accepted(&s);
    let row = purchase::read(&s, &id).unwrap();
    let mut value = row.payload.clone();
    let g = fixture("grant-initial");
    value["data"]["grants"] = Value::Array(
        (0..101)
            .map(|i| {
                let mut g = g.clone();
                g["grantId"] = format!("grant_{i:03}").into();
                g
            })
            .collect(),
    );
    s.seed(store::MODEL, &row.entry_key, value);
    let req = request(
        "capacity.grants.snapshot",
        json!({"organizationId":"example-org-a","cursor":null}),
        None,
        true,
    );
    let first = handle(&s, &req);
    assert_eq!(first.status, 200, "{}", first.body);
    let page: Value = serde_json::from_str(&first.body).unwrap();
    assert_eq!(page["complete"], false);
    assert_eq!(page["grants"].as_array().unwrap().len(), 100);
    let next = request(
        "capacity.grants.snapshot",
        json!({"organizationId":"example-org-a","cursor":page["nextCursor"]}),
        None,
        true,
    );
    let second = handle(&s, &next);
    assert_eq!(second.status, 200);
    assert_eq!(second.body, handle(&s, &next).body);
    let page: Value = serde_json::from_str(&second.body).unwrap();
    assert_eq!(page["grants"].as_array().unwrap().len(), 1);
    assert_eq!(page["complete"], true);
    let mut foreign = next;
    foreign.context_json = foreign.context_json.replace("example-org-a", "other-org");
    foreign.body = foreign.body.replace("example-org-a", "other-org");
    assert_eq!(handle(&s, &foreign).status, 404);
}
#[test]
fn provider_ambiguity_reuses_durable_request_and_never_creates_after_key_retention() {
    let s = setup();
    let id = accepted(&s);
    let row = purchase::read(&s, &id).unwrap();
    let mut value = row.payload.clone();
    value["data"]["providerSubscriptionId"] = Value::Null;
    value["data"]["material"] = json!({"stripeProductId":"prod_sites","stripeTaxRateId":null});
    s.seed(store::MODEL, &row.entry_key, value);
    s.secret_set(crate::ids::SECRET_STRIPE_KEY, "fixture-not-a-real-secret")
        .unwrap();
    s.push_http_error("timeout after provider accepted");
    assert!(billing::dispatch(&s, &purchase::read(&s, &id).unwrap()).is_err());
    let row = purchase::read(&s, &id).unwrap();
    assert!(row.payload["data"]["dispatchStartedAt"].is_string());
    s.push_http_response(200,&json!({"id":"sub_capacity","customer":"cus_org","livemode":false,"metadata":{"capacityPurchaseId":id,"capacityQuoteDigest":row.payload["data"]["snapshot"]["quoteDigest"]}}).to_string());
    billing::dispatch(&s, &row).unwrap();
    assert_eq!(s.http_requests.borrow()[0], s.http_requests.borrow()[1]);
    let bound = purchase::read(&s, &id).unwrap();
    billing::dispatch(&s, &bound).unwrap();
    assert_eq!(s.http_requests.borrow().len(), 2);
    let mut value = row.payload.clone();
    value["data"]["providerSubscriptionId"] = Value::Null;
    s.seed(store::MODEL, &row.entry_key, value);
    s.set_now(s.now_unix_secs() + 24 * 3600);
    s.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    assert_eq!(
        billing::dispatch(&s, &purchase::read(&s, &id).unwrap())
            .unwrap_err()
            .code,
        "payment_outcome_unknown"
    );
    assert_eq!(s.http_requests.borrow().last().unwrap()["method"], "GET");
}
#[test]
fn public_adapter_binds_login_and_does_not_trust_browser_actor_fields() {
    let s = setup();
    s.set_setting("cedros_login.base_url", "https://portal.example");
    let snap = seed_quote(&s);
    let path = format!(
        "/paywall/v1/capacity/previews/{}",
        snap["quote"]["quoteId"].as_str().unwrap()
    );
    let req = RouteRequest {
        route_id: "cedros-pay:capacity-preview-read-http-v1".into(),
        method: "GET".into(),
        path,
        headers: vec![
            ("authorization".into(), "Bearer fixture-login".into()),
            (
                "x-cedros-capacity-delegation".into(),
                "fixture-delegation".into(),
            ),
        ],
        ..Default::default()
    };
    s.push_http_response(200, r#"{"user":{"id":"other-buyer"}}"#);
    delegation(&s);
    assert_eq!(handle(&s, &req).status, 403);
    s.push_http_response(200, r#"{"user":{"id":"example-user-a"}}"#);
    delegation(&s);
    scope(&s, &purchase::target(&snap["quote"]["binding"]));
    assert_eq!(handle(&s, &req).status, 200);
    let mut duplicate = req;
    duplicate
        .headers
        .push(("X-Cedros-Capacity-Delegation".into(), "other".into()));
    assert_eq!(handle(&s, &duplicate).status, 422);
}
#[test]
fn billing_action_is_member_safe_and_cancellation_uses_paid_boundary() {
    let s = setup();
    let id = accepted(&s);
    s.secret_set(crate::ids::SECRET_STRIPE_KEY, "fixture-not-a-real-secret")
        .unwrap();
    let paid = invoice(&s, &id, "subscription_create", "in_initial", true);
    grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &paid, None, None).unwrap();
    let row = purchase::read(&s, &id).unwrap();
    let target = purchase::target(&row.payload["data"]["snapshot"]["quote"]["binding"]);
    let command = json!({"purchaseId":id,"action":"manage_payment_method"});
    delegation(&s);
    scope(&s, &target);
    s.push_http_response(200,r#"{"id":"bpc_capacity","active":true,"livemode":false,"features":{"subscription_update":{"enabled":false},"subscription_cancel":{"enabled":false},"payment_method_update":{"enabled":true},"invoice_history":{"enabled":true}}}"#);
    s.push_http_response(
        200,
        r#"{"url":"https://billing.stripe.com/p/session/fixture"}"#,
    );
    let out = handle(
        &s,
        &request(
            "capacity.billing.action",
            command.clone(),
            Some("action-key"),
            false,
        ),
    );
    assert_eq!(out.status, 200, "{}", out.body);
    s.set_now(s.now_unix_secs() + 400);
    delegation(&s);
    scope(&s, &target);
    let replay = handle(
        &s,
        &request(
            "capacity.billing.action",
            command,
            Some("action-key"),
            false,
        ),
    );
    assert_eq!(out.body, replay.body);
    assert_eq!(s.http_requests.borrow().len(), 2);
    let projection =
        purchase::projection(&purchase::read(&s, &id).unwrap(), s.now_unix_secs()).unwrap();
    assert!(!projection.to_string().contains("stripe.com"));
    delegation(&s);
    scope(&s, &target);
    let through = wire::stamp(&row.payload["data"]["service"], "paidThrough").unwrap();
    s.push_http_response(
        200,
        &json!({"id":"sub_capacity","customer":"cus_org","cancel_at":through}).to_string(),
    );
    let command = json!({"purchaseId":id,"mode":"at_paid_through"});
    let out = handle(
        &s,
        &request(
            "capacity.cancel",
            command.clone(),
            Some("cancel-key"),
            false,
        ),
    );
    assert_eq!(out.status, 200, "{}", out.body);
    delegation(&s);
    scope(&s, &target);
    let replay = handle(
        &s,
        &request("capacity.cancel", command, Some("cancel-key"), false),
    );
    assert_eq!(replay.body, out.body);
    assert_eq!(s.http_requests.borrow().len(), 3);
    let row = purchase::read(&s, &id).unwrap();
    assert_eq!(row.payload["data"]["grants"].as_array().unwrap().len(), 1);
    assert_eq!(
        row.payload["data"]["service"]["state"],
        "cancel_at_period_end"
    );
}
#[test]
fn new_quote_rejects_unconfigured_quantities_prices_and_unsupported_intervals() {
    let s = setup();
    let mut p = seed_catalog(&s);
    p["prices"][0]["billingIntervalCount"] = 2.into();
    s.seed(crate::ids::MODEL_CATALOG, "cedros-addon-sites", p);
    let target = json!({"scope":{"organizationId":"example-org-a","siteId":null},"baseSubscriptionId":"example-base-subscription"});
    delegation(&s);
    scope(&s, &target);
    let command = json!({"target":target,"offerId":"cedros-addon-sites","offerVersion":"anything","quantity":1});
    let out = handle(
        &s,
        &request("capacity.preview", command, Some("unsupported"), false),
    );
    assert_eq!(out.status, 422, "{}", out.body);
    assert!(s.http_requests.borrow().is_empty());
}
#[test]
fn signed_event_replay_schedules_once_and_never_enters_base_projection() {
    let s = setup();
    let id = accepted(&s);
    const TOKEN: &str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    s.secret_set(crate::ids::SECRET_STRIPE_WEBHOOK_TOKEN, TOKEN)
        .unwrap();
    s.secret_set(crate::ids::SECRET_STRIPE_KEY, "sk_test_fixture")
        .unwrap();
    let event=json!({"id":"evt_capacity","type":"customer.subscription.created","created":s.now_unix_secs(),"data":{"object":{"id":"sub_capacity","object":"subscription","metadata":{"capacityPurchaseId":id}}}});
    s.seed_stripe_event(event.clone());
    let req = RouteRequest {
        route_id: crate::ids::ROUTE_WEBHOOKS.into(),
        method: "POST".into(),
        path: "/webhook/stripe".into(),
        query: vec![("token".into(), TOKEN.into())],
        body: event.to_string(),
        ..Default::default()
    };
    for _ in 0..2 {
        let response = crate::handle_route(&s, req.clone());
        assert_eq!(response.status, 202, "{}", response.body);
    }
    assert_eq!(store::list(&s, "provider-event", None).unwrap().len(), 1);
    assert!(store::get(&s, "sub_capacity").unwrap().is_none());
    assert_eq!(
        purchase::read(&s, &id).unwrap().payload["data"]["grants"],
        json!([])
    );
}

#[test]
fn mismatched_invoice_and_unconfirmed_payment_never_grant() {
    let s = setup();
    let id = accepted(&s);
    let paid = invoice(&s, &id, "subscription_create", "in_initial", true);
    for (field, value) in [
        ("amount_due", json!(1)),
        ("tax", json!(1)),
        ("paid_out_of_band", json!(true)),
        ("amount_paid", json!(0)),
    ] {
        let mut bad = paid.clone();
        bad[field] = value;
        assert!(
            grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &bad, None, None).is_err(),
            "{field}"
        );
    }
    let mut bad = paid.clone();
    bad["payment_intent"]["status"] = "processing".into();
    assert!(grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &bad, None, None).is_err());
    assert_eq!(
        purchase::read(&s, &id).unwrap().payload["data"]["grants"],
        json!([])
    );
    grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &paid, None, None).unwrap();
}

#[test]
fn reconciliation_retries_data_hint_after_payment_commit_without_another_grant() {
    let s = setup();
    let id = accepted(&s);
    s.secret_set(crate::ids::SECRET_STRIPE_KEY, "fixture-stripe-secret")
        .unwrap();
    let paid = invoice(&s, &id, "subscription_create", "in_initial", true);
    let row = purchase::read(&s, &id).unwrap();
    let scope = row.payload["capacityScope"].clone();
    let head_key = store::key("scope", &scope).unwrap();
    let event_id = store::key("hint", &json!([scope, 1])).unwrap();
    for pass in 0..2 {
        s.push_http_response(200,&json!({"id":"sub_capacity","customer":"cus_org","livemode":false,"metadata":{"capacityPurchaseId":id,"capacityQuoteDigest":row.payload["data"]["snapshot"]["quoteDigest"]},"status":"trialing","cancel_at":null,"cancel_at_period_end":false}).to_string());
        s.push_http_response(
            200,
            &json!({"data":[{"id":"in_initial"}],"has_more":false}).to_string(),
        );
        s.push_http_response(200, &paid.to_string());
        if pass == 1 {
            service(&s, json!({"accepted":true,"eventId":event_id}));
        }
        let result = reconcile::run(&s);
        assert_eq!(result.is_ok(), pass == 1, "{result:?}");
        let current = purchase::read(&s, &id).unwrap();
        assert_eq!(
            current.payload["data"]["grants"].as_array().unwrap().len(),
            1
        );
        let head = store::get(&s, &head_key).unwrap().unwrap();
        assert_eq!(head.payload["sourceRevision"], 1);
        assert_eq!(head.payload["hintDeliveredRevision"], pass);
        s.set_now(s.now_unix_secs() + 60);
    }
    let calls = s.service_requests.borrow();
    let hints: Vec<_> = calls
        .iter()
        .filter(|r| r.route_id == "cedros-data:capacity-grants-changed-v1")
        .collect();
    assert_eq!(hints.len(), 2);
    assert_eq!(hints[0].body_json, hints[1].body_json);
    assert!(s
        .http_requests
        .borrow()
        .iter()
        .all(|r| r["method"] == "GET"));
}

#[test]
fn published_migration_shapes_validate_hashes_and_page_bounds() {
    let hold = fixture("legacy-incomplete-expired-hold-is-preserved");
    for hash in ["a".repeat(63), "A".repeat(64), "g".repeat(64)] {
        let mut invalid = hold.clone();
        invalid["requestHash"] = hash.into();
        assert!(wire::validate("SiteLegacyHold", &invalid).is_err());
    }
    let mut page = json!({"migrationEpoch":"epoch","snapshotId":"snapshot","sourceVersion":null,"snapshotDigest":format!("sha256:{}","a".repeat(64)),"pageIndex":0,"pageCount":1,"totalHoldCount":100,"holds":vec![hold.clone();100]});
    wire::validate("SiteImportRequest", &page).unwrap();
    page["holds"].as_array_mut().unwrap().push(hold);
    assert!(wire::validate("SiteImportRequest", &page).is_err());
}

#[path = "binding_tests.rs"]
mod binding_tests;

#[path = "upgrade_tests.rs"]
mod upgrade_tests;

#[test]
fn capacity_rejects_underpayment_wrong_currency_and_excess_refunds_atomically() {
    let s = setup();
    let id = accepted(&s);
    let paid = invoice(&s, &id, "subscription_create", "in_initial", true);
    let before = purchase::read(&s, &id).unwrap();
    for (field, value) in [
        ("amount_received", json!(1)),
        ("currency", json!("eur")),
        ("customer", json!("cus_other")),
    ] {
        let mut bad = paid.clone();
        bad["payment_intent"][field] = value;
        assert!(grants::invoice(&s, &before, &bad, None, None).is_err());
        assert_eq!(purchase::read(&s, &id).unwrap().payload, before.payload);
    }
    let charge = json!({"id":"ch_paid","customer":"cus_org","invoice":"in_initial","livemode":false,"amount":paid["total"],"amount_refunded":paid["total"].as_u64().unwrap()+1,"disputed":false});
    assert!(grants::invoice(&s, &before, &paid, Some(&charge), None).is_err());
    assert_eq!(purchase::read(&s, &id).unwrap().payload, before.payload);
}

#[test]
fn one_real_payment_cannot_grant_two_capacity_periods_or_commerce_payments() {
    let s = setup();
    let id = accepted(&s);
    let paid = invoice(&s, &id, "subscription_create", "in_initial", true);
    grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &paid, None, None).unwrap();
    let mut renewal = invoice(&s, &id, "subscription_cycle", "in_renewal", true);
    renewal["payment_intent"] = paid["payment_intent"].clone();
    let before = purchase::read(&s, &id).unwrap();
    assert!(grants::invoice(&s, &before, &renewal, None, None).is_err());
    assert_eq!(purchase::read(&s, &id).unwrap().payload, before.payload);
    assert!(crate::routes::webhooks::provider_payment_identity(
        &crate::db::Db::new(&s, crate::ids::DB_ACCESS),
        "pi_in_initial",
        "another_checkout",
        paid["total"].as_i64().unwrap(),
        "USD"
    )
    .is_err());
}

#[test]
fn full_refund_revokes_service_instead_of_reusing_historical_active_grant() {
    let s = setup();
    let id = accepted(&s);
    let paid = invoice(&s, &id, "subscription_create", "in_initial", true);
    grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &paid, None, None).unwrap();
    let charge = json!({"id":"ch_paid","customer":"cus_org","invoice":"in_initial","livemode":false,"amount":paid["total"],"amount_refunded":paid["total"],"disputed":false});
    grants::invoice(
        &s,
        &purchase::read(&s, &id).unwrap(),
        &paid,
        Some(&charge),
        None,
    )
    .unwrap();
    let row = purchase::read(&s, &id).unwrap();
    assert_eq!(row.payload["data"]["service"]["state"], "ended");
    assert!(row.payload["data"]["service"]["paidThrough"].is_null());
    assert_eq!(
        row.payload["data"]["grants"]
            .as_array()
            .unwrap()
            .last()
            .unwrap()["state"],
        "revoked"
    );
}

#[test]
fn won_dispute_restores_canceling_service_from_latest_grant_revision() {
    let s = setup();
    let id = accepted(&s);
    let paid = invoice(&s, &id, "subscription_create", "in_initial", true);
    grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &paid, None, None).unwrap();
    let row = purchase::read(&s, &id).unwrap();
    let mut value = row.payload.clone();
    value["data"]["service"]["cancelEffectiveAt"] = value["data"]["service"]["paidThrough"].clone();
    value["data"]["service"]["state"] = json!("cancel_at_period_end");
    s.seed(store::MODEL, &row.entry_key, value);
    let mut charge = json!({"id":"ch_paid","customer":"cus_org","invoice":"in_initial","livemode":false,"amount":paid["total"],"amount_refunded":0,"disputed":true});
    let mut dispute = json!({"id":"dp_case","charge":"ch_paid","status":"under_review"});
    grants::invoice(
        &s,
        &purchase::read(&s, &id).unwrap(),
        &paid,
        Some(&charge),
        Some(&dispute),
    )
    .unwrap();
    let row = purchase::read(&s, &id).unwrap();
    assert_eq!(
        purchase::projection(&row, s.now_unix_secs()).unwrap()["service"]["state"],
        "ended"
    );
    charge["disputed"] = json!(false);
    dispute["status"] = json!("won");
    grants::invoice(&s, &row, &paid, Some(&charge), Some(&dispute)).unwrap();
    let row = purchase::read(&s, &id).unwrap();
    assert_eq!(
        purchase::projection(&row, s.now_unix_secs()).unwrap()["service"]["state"],
        "cancel_at_period_end"
    );
}

#[test]
fn capacity_failure_diagnostics_identify_stage_without_private_input() {
    let s = setup();
    let quote = seed_quote(&s);
    let read = request(
        "capacity.preview.read",
        json!({"quoteId":quote["quote"]["quoteId"]}),
        None,
        true,
    );
    assert_eq!(handle(&s, &read).status, 200);
    assert!(s.logs.borrow().is_empty());

    let req = request(
        "capacity.preview",
        json!({"private":"never-log-command"}),
        Some("never-log-key"),
        false,
    );
    assert_eq!(handle(&s, &req).status, 422);
    assert_eq!(
        &*s.logs.borrow(),
        &[(
            "warn".into(),
            "capacity operation failed stage=request status=422 code=invalid_request".into()
        )]
    );
    s.logs.borrow_mut().clear();
    let req = request(
        "capacity.offers",
        json!({"scope":{"organizationId":"example-org-a","siteId":null},"baseSubscriptionId":"example-base-subscription"}),
        None,
        false,
    );
    s.service_responses
        .borrow_mut()
        .push_back(Err(crate::seams::HostError::new("never-log-host-secret")));
    assert_eq!(handle(&s, &req).status, 503);
    assert_eq!(
        &*s.logs.borrow(),
        &[
            (
                "warn".into(),
                "capacity authority service invocation failed".into()
            ),
            (
                "warn".into(),
                "capacity operation failed stage=authority status=503 code=source_unavailable"
                    .into()
            )
        ]
    );
}

#[test]
fn receipt_diagnostics_preserve_errors_without_private_input() {
    for (response, kind) in [
        (
            Err(crate::seams::HostError::new("never-log-read-secret")),
            "host-import",
        ),
        (Ok("never-log-malformed-record".into()), "read-shape"),
    ] {
        let s = setup();
        s.read_responses.borrow_mut().push_back(response);
        let error = store::claim_receipt(
            &s,
            &json!(["never-log-identity"]),
            &json!({"private":"never-log-command"}),
        )
        .unwrap_err();
        assert_eq!(error.code, "internal_error");
        assert_eq!(
            &*s.logs.borrow(),
            &[(
                "warn".into(),
                format!("capacity receipt failed step=read kind={kind} code=internal_error")
            )]
        );
        assert_eq!(s.entry_count(store::MODEL), 0);
    }
    let s = setup();
    s.fail_guarded_commit_after_next_http();
    s.push_http_response(200, "{}");
    s.http_fetch("{}").unwrap();
    assert_eq!(
        store::claim_receipt(&s, &json!(["identity"]), &json!({}))
            .unwrap_err()
            .code,
        "internal_error"
    );
    assert_eq!(
        &*s.logs.borrow(),
        &[(
            "warn".into(),
            "capacity receipt failed step=compare-and-set kind=host-import code=internal_error"
                .into()
        )]
    );
    assert_eq!(s.entry_count(store::MODEL), 0);
    store::claim_receipt(&s, &json!(["identity"]), &json!({})).unwrap();
    assert_eq!(s.entry_count(store::MODEL), 1);

    let s = setup();
    s.read_responses
        .borrow_mut()
        .push_back(Ok(json!({"entries":[]}).to_string()));
    s.read_responses
        .borrow_mut()
        .push_back(Err(crate::seams::HostError::new(
            "never-log-readback-secret",
        )));
    assert_eq!(
        store::claim_receipt(&s, &json!(["identity"]), &json!({}))
            .unwrap_err()
            .code,
        "internal_error"
    );
    assert_eq!(
        &*s.logs.borrow(),
        &[(
            "warn".into(),
            "capacity receipt failed step=read-back kind=host-import code=internal_error".into()
        )]
    );
    assert_eq!(s.entry_count(store::MODEL), 1);
    store::claim_receipt(&s, &json!(["identity"]), &json!({})).unwrap();
    assert_eq!(s.entry_count(store::MODEL), 1);

    let s = setup();
    store::claim_receipt(&s, &json!(["identity"]), &json!({})).unwrap();
    assert!(s.logs.borrow().is_empty());
}
