use super::*;
use crate::fake::FakeSeams;
fn setup() -> FakeSeams {
    let s = FakeSeams::new();
    crate::guarded_policy::enroll(&s).unwrap();
    s.set_setting("stripe.mode", "\"test\"");
    s.set_secret(ids::SECRET_STRIPE_KEY, "test-only-provider-secret");
    s.set_setting(super::super::config::SETTING,&json!({"payInstallationId":"test-install","environment":"test","salesEnabled":false,"jointActivationVerified":false,"stripePortalConfigurationId":"bpc_test","portalOrigin":"https://portal.example","recoveryPath":"/upgrade","organizations":{}}).to_string());
    s.seed(ids::MODEL_CATALOG,"plan",json!({"productType":"subscription","title":"Agency","metadata":{"entitlements":{"cedros.portal.siteQuantity":5}}}));
    s.seed(ids::MODEL_SUBSCRIPTIONS,"sub_base",json!({"subscriptionId":"sub_base","customerRef":"user","productId":"plan","status":"active","currentPeriodEnd":crate::time::iso8601(s.now_unix_secs()+3600)}));
    s
}
fn request(suffix: &str, body: Value) -> RouteRequest {
    let id = format!("cedros-pay:admin-capacity-{suffix}");
    RouteRequest {route_id:id.clone(),method:"POST".into(),path:format!("/admin/capacity/{suffix}"),body:body.to_string(),context_json:json!({"authenticated":true,"authScheme":"bearer-token","permissionClaims":["data:settings:read"],"capabilityClaims":[id]}).to_string(),..Default::default()}
}
fn call(s: &FakeSeams, suffix: &str, body: Value) -> RouteResponse {
    crate::router::handle_route(s, request(suffix, body))
}
fn enrollment() -> Value {
    json!({"mutationId":"enroll-test","expectedRevision":null,"organizationId":"org","customerRef":"user","baseSubscriptionIds":["sub_base"],"canonicalSiteIds":["site"],"commercialApprovalId":"task-approval"})
}
fn provider_subscription(s: &FakeSeams) -> Value {
    json!({"id":"sub_base","customer":"cus_owner","livemode":false,"status":"active","current_period_end":s.now_unix_secs()+3600,"metadata":{"user_id":"user","user_id_trusted":"true"}})
}
fn customer(bound: bool) -> Value {
    json!({"id":"cus_owner","livemode":false,"balance":0,"discount":null,"tax_exempt":"none","metadata":if bound { json!({"capacityOrganizationId":"org","capacityPayInstallationId":"test-install"}) } else { json!({}) }})
}
fn queue_enrollment(s: &FakeSeams) {
    s.push_http_response(200, &provider_subscription(s).to_string());
    s.push_http_response(200, &customer(false).to_string());
    s.push_http_response(200, &customer(true).to_string());
}
#[test]
fn capacity_admin_enrollment_derives_catalog_allowance_and_stays_disabled() {
    let s = setup();
    queue_enrollment(&s);
    let r = call(&s, "enroll", enrollment());
    assert_eq!(r.status, 200, "{}", r.body);
    let c = Config::load(&s).unwrap();
    let o = &c.organizations["org"];
    assert_eq!(o.accounting_version, Some(2));
    assert_eq!(
        o.base_plan_allowances["plan"].included_allowances[0]["included"],
        5
    );
    assert_eq!(o.stripe_customer_id, "cus_owner");
    assert!(!o.runtime_ready);
    assert!(!c.sales_enabled);
    assert!(s
        .get_entry(ids::MODEL_CONFIG_AUDIT, "config-audit:enroll-test")
        .is_some());
}
#[test]
fn capacity_admin_rejects_manual_quota_and_subscription_owner_mismatch() {
    let s = setup();
    let mut b = enrollment();
    b["includedSites"] = json!(99);
    assert_eq!(call(&s, "enroll", b).status, 422);
    let mut b = enrollment();
    b["customerRef"] = json!("another-user");
    assert_eq!(call(&s, "enroll", b).status, 409);
    assert!(s.http_requests.borrow().is_empty());
}
#[test]
fn capacity_admin_requires_exact_attested_route_and_never_opens_general_settings() {
    let s = setup();
    let mut req = request("enroll", enrollment());
    req.context_json=json!({"authenticated":true,"authScheme":"bearer-token","capabilityClaims":[ids::ROUTE_ADMIN_CAPACITY_READ]}).to_string();
    assert_eq!(crate::router::handle_route(&s, req.clone()).status, 403);
    req.route_id = ids::ROUTE_ADMIN_CONFIG_SUBSCRIPTIONS_GET.into();
    req.method = "GET".into();
    req.path = "/admin/config/subscriptions".into();
    assert_eq!(crate::router::handle_route(&s, req).status, 403);
    assert!(s.http_requests.borrow().is_empty());
}
#[test]
fn capacity_admin_provider_owner_or_customer_metadata_conflicts_do_not_commit() {
    for mismatch in ["subscription", "customer"] {
        let s = setup();
        let mut p = provider_subscription(&s);
        if mismatch == "subscription" {
            p["metadata"]["user_id"] = json!("someone-else");
        }
        s.push_http_response(200, &p.to_string());
        let mut p = customer(false);
        p["metadata"]["capacityOrganizationId"] = json!("another-org");
        s.push_http_response(200, &p.to_string());
        assert_eq!(call(&s, "enroll", enrollment()).status, 409);
        assert!(Config::load(&s).unwrap().organizations.is_empty());
    }
}
#[test]
fn capacity_admin_configuration_preserves_bindings_and_uses_cas() {
    let s = setup();
    queue_enrollment(&s);
    assert_eq!(call(&s, "enroll", enrollment()).status, 200);
    let read = call(&s, "read", json!({}));
    let read: Value = serde_json::from_str(&read.body).unwrap();
    s.push_http_response(200,&json!({"id":"bpc_test","active":true,"livemode":false,"features":{"subscription_cancel":{"enabled":true,"mode":"at_period_end"}}}).to_string());
    let r = call(
        &s,
        "configure",
        json!({"mutationId":"config-test","expectedRevision":read["committedRevision"],"payInstallationId":"test-install","portalOrigin":"https://new.example","recoveryPath":"/upgrade"}),
    );
    assert_eq!(r.status, 200, "{}", r.body);
    let c = Config::load(&s).unwrap();
    assert_eq!(
        c.organizations["org"].base_plan_allowances["plan"].included_allowances[0]["included"],
        5
    );
    assert_eq!(c.portal_origin, "https://new.example");
}
#[test]
fn capacity_admin_activation_rejects_missing_acceptance_or_unconfigured_offer() {
    let s = setup();
    queue_enrollment(&s);
    let enrolled = call(&s, "enroll", enrollment());
    assert_eq!(enrolled.status, 200);
    let revision =
        serde_json::from_str::<Value>(&enrolled.body).unwrap()["committedRevision"].clone();
    let b = json!({"mutationId":"activate","expectedRevision":revision,"organizationId":"org","enabled":true});
    assert_eq!(call(&s, "activate", b.clone()).status, 422);
    let mut b = b;
    b["acceptanceReference"] = json!("verified-test");
    assert_ne!(call(&s, "activate", b).status, 200);
    assert!(!Config::load(&s).unwrap().sales_enabled);
}
fn coupon_fixture() -> Value {
    json!({"id":"promo_scoped","code":"conor","active":true,"livemode":false,"customer":"cus_owner","expires_at":null,"max_redemptions":null,"restrictions":{"first_time_transaction":false},"coupon":{"id":"coupon_scoped","valid":true,"livemode":false,"duration":"forever","percent_off":100,"applies_to":{"products":["prod_sites"]}}})
}
fn coupon_setup() -> FakeSeams {
    let s = setup();
    queue_enrollment(&s);
    assert_eq!(call(&s, "enroll", enrollment()).status, 200);
    s.seed(
        ids::MODEL_CATALOG,
        "sites",
        json!({"stableHandle":"cedros-addon-sites","stripeProductId":"prod_sites"}),
    );
    s
}
#[test]
fn capacity_admin_coupon_reuses_exact_scoped_forever_discount() {
    let s = coupon_setup();
    s.push_http_response(
        200,
        &json!({"data":[coupon_fixture()],"has_more":false}).to_string(),
    );
    let r = call(
        &s,
        "coupon-ensure",
        json!({"organizationId":"org","code":"conor","percentOff":100}),
    );
    assert_eq!(r.status, 200, "{}", r.body);
    assert_eq!(
        serde_json::from_str::<Value>(&r.body).unwrap()["created"],
        false
    );
    assert_eq!(s.http_requests.borrow().last().unwrap()["method"], "GET");
}
#[test]
fn capacity_admin_coupon_refuses_other_customers_products_and_partial_or_temporary_discounts() {
    for field in ["customer", "product", "duration", "percent", "restrictions"] {
        let s = coupon_setup();
        let mut p = coupon_fixture();
        match field {
            "customer" => p["customer"] = json!("cus_other"),
            "product" => p["coupon"]["applies_to"]["products"] = json!(["prod_other"]),
            "duration" => p["coupon"]["duration"] = json!("once"),
            "percent" => p["coupon"]["percent_off"] = json!(50),
            _ => p["restrictions"]["first_time_transaction"] = json!(true),
        };
        s.push_http_response(200, &json!({"data":[p],"has_more":false}).to_string());
        assert_eq!(
            call(
                &s,
                "coupon-ensure",
                json!({"organizationId":"org","code":"conor","percentOff":100})
            )
            .status,
            409
        );
    }
}
#[test]
fn capacity_admin_coupon_creates_provider_coupon_and_promotion_with_bound_terms() {
    let s = coupon_setup();
    let body = json!({"organizationId":"org","code":"conor","percentOff":100});
    let digest = wire::digest(&json!([
        "test-install",
        "test",
        "org",
        "cus_owner",
        "prod_sites",
        100,
        "conor"
    ]))
    .unwrap();
    let mut p = coupon_fixture();
    p["coupon"]["id"] = json!(format!("capacity_{}", digest.trim_start_matches("sha256:")));
    s.push_http_response(200, &json!({"data":[],"has_more":false}).to_string());
    s.push_http_response(404, "{}");
    s.push_http_response(200, &p["coupon"].to_string());
    s.push_http_response(200, &p.to_string());
    let r = call(&s, "coupon-ensure", body);
    assert_eq!(r.status, 200, "{}", r.body);
    let requests = s.http_requests.borrow();
    let create = &requests[requests.len() - 1];
    assert_eq!(create["method"], "POST");
    let body = create["body"].as_str().unwrap();
    assert!(body.contains("customer=cus_owner"));
    assert!(body.contains("code=conor"));
    assert!(body.contains("expand%5B%5D=coupon.applies_to"));
    assert!(requests[requests.len() - 2]["body"]
        .as_str()
        .unwrap()
        .contains("expand%5B%5D=applies_to"));
    assert!(requests[requests.len() - 3]["url"]
        .as_str()
        .unwrap()
        .contains("expand%5B%5D=applies_to"));
}
#[test]
fn capacity_admin_stale_configuration_fails_before_provider_mutation() {
    let s = setup();
    let mut b = enrollment();
    b["expectedRevision"] = json!("stale");
    assert_eq!(call(&s, "enroll", b).status, 409);
    assert!(s.http_requests.borrow().is_empty());
    assert!(Config::load(&s).unwrap().organizations.is_empty());
}
#[test]
fn capacity_admin_activation_validates_price_and_customer_before_enabling() {
    let s = setup();
    queue_enrollment(&s);
    let r = call(&s, "enroll", enrollment());
    assert_eq!(r.status, 200);
    let revision = serde_json::from_str::<Value>(&r.body).unwrap()["committedRevision"].clone();
    let f: Value = serde_json::from_str(include_str!(
        "../../../../docs/contracts/capacity-v1/fixtures/portal-usage-capacity-v1.fixtures.json"
    ))
    .unwrap();
    let mut terms = f["fixtures"]
        .as_array()
        .unwrap()
        .iter()
        .find(|f| f["id"] == "immutable-full-quote")
        .unwrap()["value"]["quote"]["binding"]["terms"]
        .clone();
    terms["proration"] = json!("none");
    terms["serviceId"] = json!("sites");
    terms["meterId"] = json!("sites.count");
    terms["unit"] = json!("site");
    terms["resetKind"] = json!("occupancy");
    terms["allowanceBasis"] = json!("simultaneous_occupancy");
    s.seed(ids::MODEL_CATALOG,"cedros-addon-sites",json!({"stableHandle":"cedros-addon-sites","productType":"capacityAddOn","active":true,"public":true,"purchasable":true,"stripeProductId":"prod_sites","metadata":{"capacityV1":{"priceId":"monthly","terms":terms,"quantityConstraints":{"minimum":1,"maximum":100,"step":1},"commercialApprovalId":"task-approved","partialRefundPolicy":"preserve_allowance","fullRefundPolicy":"revoke_at_confirmation","disputePolicy":"revoke_on_open_restore_on_win","latePaymentPolicy":"full_refund_after_expiry","currencyMinorUnitDigits":2,"taxBasisPoints":0,"stripeTaxRateId":null}},"prices":[{"id":"monthly","active":true,"public":true,"purchasable":true,"stripePriceId":"price_sites","unitAmountCents":terms["pricePerItemMinor"],"currency":terms["currency"],"billingInterval":terms["billingInterval"],"billingIntervalCount":1}]}));
    s.push_http_response(200,&json!({"id":"price_sites","active":true,"livemode":false,"product":"prod_sites","unit_amount":terms["pricePerItemMinor"],"currency":terms["currency"].as_str().unwrap().to_ascii_lowercase(),"recurring":{"interval":terms["billingInterval"],"interval_count":1,"usage_type":"licensed"},"billing_scheme":"per_unit","tax_behavior":"exclusive"}).to_string());
    s.push_http_response(200, &customer(true).to_string());
    let r = call(
        &s,
        "activate",
        json!({"mutationId":"activate-test","expectedRevision":revision,"organizationId":"org","acceptanceReference":"joint-host-portal-verified","enabled":true}),
    );
    assert_eq!(r.status, 200, "{}", r.body);
    let c = Config::load(&s).unwrap();
    assert!(c.sales_enabled && c.joint_activation_verified && c.organizations["org"].runtime_ready);
}

#[test]
fn capacity_admin_coupon_inspection_is_read_only_and_redacts_other_customers() {
    let s = coupon_setup();
    let before = s.http_requests.borrow().len();
    let mut p = coupon_fixture();
    p["customer"] = json!("cus_other_private");
    p["metadata"] = json!({"privateNote":"must-not-be-returned"});
    p["coupon"]["applies_to"] = Value::Null;
    s.push_http_response(200, &json!({"data":[p],"has_more":false}).to_string());
    s.push_http_response(200, &coupon_fixture()["coupon"].to_string());
    let r = call(
        &s,
        "read",
        json!({"organizationId":"org","couponCode":"conor"}),
    );
    assert_eq!(r.status, 200, "{}", r.body);
    let body: Value = serde_json::from_str(&r.body).unwrap();
    let inspection = &body["couponInspection"];
    assert_eq!(inspection["complete"], true);
    assert_eq!(inspection["candidates"][0]["customerMatches"], false);
    assert_eq!(inspection["candidates"][0]["productMatches"], true);
    assert!(!r.body.contains("cus_other_private"));
    assert!(!r.body.contains("must-not-be-returned"));
    let requests = s.http_requests.borrow();
    assert_eq!(requests.len(), before + 2);
    assert_eq!(requests.last().unwrap()["method"], "GET");
    assert!(requests[before]["url"]
        .as_str()
        .unwrap()
        .contains("expand%5B%5D=data.coupon.applies_to"));
    assert!(requests[before + 1]["url"]
        .as_str()
        .unwrap()
        .contains("expand%5B%5D=applies_to"));
    assert_eq!(inspection["setupCoupon"]["termsMatch"], true);
}
#[test]
fn capacity_admin_coupon_inspection_requires_enrolled_org_and_safe_code() {
    let s = coupon_setup();
    let before = s.http_requests.borrow().len();
    for body in [
        json!({"couponCode":"conor"}),
        json!({"organizationId":"other","couponCode":"conor"}),
        json!({"organizationId":"org","couponCode":"conor&limit=100"}),
        json!({"organizationId":"org","couponCode":"conor","couponPercentOff":0}),
        json!({"organizationId":"org","couponPercentOff":100}),
    ] {
        assert_ne!(call(&s, "read", body).status, 200);
    }
    assert_eq!(s.http_requests.borrow().len(), before);
}

#[test]
fn capacity_admin_coupon_recovers_existing_scoped_coupon_without_recreation() {
    let s = coupon_setup();
    let before = s.http_requests.borrow().len();
    let digest = wire::digest(&json!([
        "test-install",
        "test",
        "org",
        "cus_owner",
        "prod_sites",
        100,
        "conor"
    ]))
    .unwrap();
    let mut p = coupon_fixture();
    p["coupon"]["id"] = json!(format!("capacity_{}", digest.trim_start_matches("sha256:")));
    s.push_http_response(200, &json!({"data":[],"has_more":false}).to_string());
    s.push_http_response(200, &p["coupon"].to_string());
    s.push_http_response(200, &p.to_string());
    let r = call(
        &s,
        "coupon-ensure",
        json!({"organizationId":"org","code":"conor","percentOff":100}),
    );
    assert_eq!(r.status, 200, "{}", r.body);
    let requests = s.http_requests.borrow();
    assert_eq!(requests.len(), before + 3);
    assert_eq!(requests[before + 1]["method"], "GET");
    assert!(requests[before + 1]["url"]
        .as_str()
        .unwrap()
        .contains("expand%5B%5D=applies_to"));
    assert_eq!(requests[before + 2]["method"], "POST");
    assert!(requests[before + 2]["url"]
        .as_str()
        .unwrap()
        .ends_with("/promotion_codes"));
}
