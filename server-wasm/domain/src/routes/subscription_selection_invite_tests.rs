use super::*;
use crate::fake::FakeSeams;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

fn set_paid_plan(s: &FakeSeams) {
    s.set_setting(
        SETTINGS_KEY,
        &json!({
            "enabled": true,
            "plans": [{
                "id": "pro",
                "title": "Pro",
                "description": "Paid access",
                "priceMonthlyUsd": 12,
                "priceAnnualUsd": 99,
                "isActive": true,
                "sortOrder": 1,
                "trialDays": 3,
                "stripePriceIdMonthly": "price_month",
                "stripePriceIdAnnual": "price_year"
            }]
        })
        .to_string(),
    );
}

fn configure_login(s: &FakeSeams) {
    s.set_setting("cedros_login.base_url", "https://site.example");
}

fn configure_stripe(s: &FakeSeams) {
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test");
    s.set_setting("stripe.success_url", "https://app.example/success");
    s.set_setting("stripe.cancel_url", "https://app.example/cancel");
}

fn request(route_id: &str, method: &str, path: &str) -> RouteRequest {
    RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: path.into(),
        headers: vec![("authorization".into(), "Bearer user-token".into())],
        context_json: r#"{"siteId":"site-a","idempotencyKey":"invite-session-test-attempt"}"#
            .into(),
        ..Default::default()
    }
}

fn response_body(response: &RouteResponse) -> Value {
    serde_json::from_str(&response.body).unwrap()
}

fn discount(percent: u16) -> String {
    json!({
        "discount": {
            "percentOff": percent,
            "code": format!("GOLD{percent}"),
            "redeemedAt": "2026-07-14T18:00:00Z"
        }
    })
    .to_string()
}

fn coupon_id(percent: u16) -> String {
    let digest = Sha256::digest(format!("GOLD{percent}").as_bytes());
    let short_hash = digest[..6]
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>();
    format!("cedros_invite_{percent}-{short_hash}")
}

#[test]
fn plans_projects_live_invite_discount_for_checkout_render() {
    let s = FakeSeams::new();
    set_paid_plan(&s);
    configure_login(&s);
    s.push_http_response(200, &discount(50));
    let mut req = request(
        ids::ROUTE_SUBSCRIPTION_PLANS,
        "GET",
        "/paywall/v1/subscription/plans",
    );
    req.query = vec![("interval".into(), "monthly".into())];

    let out = response_body(&handle(&s, &req).unwrap());
    assert_eq!(out["discount"]["code"], "GOLD50");
    assert_eq!(out["discount"]["duration"], "subscription_lifetime");
    assert_eq!(out["discount"]["stacking"], "invite_wins");
    assert_eq!(out["plans"][0]["originalPriceCents"], 1200);
    assert_eq!(out["plans"][0]["priceCents"], 600);

    let lookup = &s.http_requests.borrow()[0];
    assert_eq!(
        lookup["url"],
        "https://site.example/extensions/cedros-login/public-auth/account/invite-discount"
    );
    assert_eq!(lookup["method"], "GET");
    assert_eq!(lookup["headers"][0][1], "Bearer user-token");
}

#[test]
fn paid_session_binds_lifetime_invite_price_and_invite_wins_stacking() {
    let s = FakeSeams::new();
    set_paid_plan(&s);
    configure_login(&s);
    configure_stripe(&s);
    s.push_http_response(200, r#"{"user":{"id":"user_1"}}"#);
    s.push_http_response(200, &discount(50));
    s.push_http_response(404, r#"{"error":{"message":"No such coupon"}}"#);
    s.push_http_response(
        200,
        &json!({
            "id": coupon_id(50),
            "percent_off": 50,
            "duration": "forever",
            "valid": true
        })
        .to_string(),
    );
    s.push_http_response(
        200,
        r#"{"id":"cs_invite","url":"https://checkout.stripe.com/cs_invite"}"#,
    );
    let mut req = request(
        ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
        "POST",
        "/paywall/v1/subscription/plan/stripe-session",
    );
    req.body = json!({
        "planId": "pro",
        "interval": "monthly",
        "couponCode": "PAY25"
    })
    .to_string();

    let out = response_body(&handle(&s, &req).unwrap());
    assert_eq!(out["sessionId"], "cs_invite");
    assert_eq!(out["originalPriceCents"], 1200);
    assert_eq!(out["priceCents"], 600);
    assert_eq!(out["discount"]["percentOff"], 50);

    let requests = s.http_requests.borrow();
    assert_eq!(requests.len(), 5, "invite-wins must skip promo lookup");
    assert!(requests[2]["url"]
        .as_str()
        .unwrap()
        .ends_with(&format!("/v1/coupons/{}", coupon_id(50))));
    let create_coupon = requests[3]["body"].as_str().unwrap();
    assert!(create_coupon.contains("percent_off=50"));
    assert!(create_coupon.contains("duration=forever"));
    let checkout = requests[4]["body"].as_str().unwrap();
    assert!(checkout.contains("payment_method_collection=always"));
    assert!(checkout.contains("subscription_data%5Btrial_period_days%5D=3"));
    assert!(checkout.contains("line_items%5B0%5D%5Bprice%5D=price_month"));
    assert!(checkout.contains(&format!("discounts%5B0%5D%5Bcoupon%5D={}", coupon_id(50))));
    assert!(!checkout.contains("promotion_code"));
    assert!(checkout.contains("metadata%5Binvite_discount_code%5D=GOLD50"));
    assert!(checkout.contains(
        "subscription_data%5Bmetadata%5D%5Binvite_discount_duration%5D=subscription_lifetime"
    ));
}

#[test]
fn lookup_retries_then_falls_back_to_full_price_without_leaking_identity() {
    let s = FakeSeams::new();
    set_paid_plan(&s);
    configure_login(&s);
    configure_stripe(&s);
    s.push_http_response(200, r#"{"user":{"id":"user_1"}}"#);
    s.push_http_response(503, "unavailable");
    s.push_http_response(503, "still unavailable");
    s.push_http_response(
        200,
        r#"{"id":"cs_full","url":"https://checkout.stripe.com/cs_full"}"#,
    );
    let mut req = request(
        ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
        "POST",
        "/paywall/v1/subscription/plan/stripe-session",
    );
    req.body = json!({ "planId": "pro", "interval": "monthly" }).to_string();

    let out = response_body(&handle(&s, &req).unwrap());
    assert_eq!(out["priceCents"], 1200);
    assert!(out["discount"].is_null());
    let requests = s.http_requests.borrow();
    assert_eq!(requests.len(), 4);
    assert_eq!(requests[1]["url"], requests[2]["url"]);
    assert!(requests[3]["body"]
        .as_str()
        .unwrap()
        .contains("line_items%5B0%5D%5Bprice%5D=price_month"));
    assert!(requests[3]["body"]
        .as_str()
        .unwrap()
        .contains("payment_method_collection=always"));
    let logs = s.logs.borrow();
    assert!(logs
        .iter()
        .any(|(_, message)| message.contains("cause=http_status_503")));
    assert!(logs
        .iter()
        .all(|(_, message)| { !message.contains("user_1") && !message.contains("user-token") }));
}

#[test]
fn no_grant_keeps_full_price_and_hundred_percent_grant_is_not_a_free_plan() {
    let s = FakeSeams::new();
    set_paid_plan(&s);
    configure_login(&s);
    s.push_http_response(200, r#"{"discount":null}"#);
    s.push_http_response(200, &discount(100));
    let mut req = request(
        ids::ROUTE_SUBSCRIPTION_PLANS,
        "GET",
        "/paywall/v1/subscription/plans",
    );
    req.query = vec![("interval".into(), "monthly".into())];

    let full = response_body(&handle(&s, &req).unwrap());
    assert_eq!(full["plans"][0]["priceCents"], 1200);
    assert!(full["discount"].is_null());

    let free_checkout = response_body(&handle(&s, &req).unwrap());
    assert_eq!(free_checkout["plans"][0]["priceCents"], 0);
    assert_eq!(free_checkout["plans"][0]["originalPriceCents"], 1200);
    assert_eq!(free_checkout["plans"][0]["free"], false);
    assert_eq!(
        free_checkout["plans"][0]["paymentMethods"],
        json!(["stripe"])
    );
}

fn fixed_discount(percent: u16, months: Value) -> String {
    let mut grant: Value = serde_json::from_str(&discount(percent)).unwrap();
    grant["discount"]["durationMonths"] = months;
    grant.to_string()
}

#[test]
fn fixed_month_discount_projects_term_and_reports_annual_unavailability() {
    let s = FakeSeams::new();
    set_paid_plan(&s);
    configure_login(&s);
    s.push_http_response(200, &fixed_discount(100, json!(3)));
    let mut req = request(
        ids::ROUTE_SUBSCRIPTION_PLANS,
        "GET",
        "/paywall/v1/subscription/plans",
    );
    req.query = vec![("interval".into(), "monthly".into())];
    let out = response_body(&handle(&s, &req).unwrap());
    assert_eq!(out["discount"]["duration"], "fixed_months");
    assert_eq!(out["discount"]["durationMonths"], 3);
    assert_eq!(out["plans"][0]["priceCents"], 0);
    s.push_http_response(200, &fixed_discount(100, json!(3)));
    req.query = vec![("interval".into(), "yearly".into())];
    let annual = response_body(&handle(&s, &req).unwrap());
    assert_eq!(annual["enabled"], false);
    assert_eq!(
        annual["unavailableReason"],
        "invite_discount_requires_monthly_billing"
    );
    assert_eq!(annual["plans"], json!([]));
    assert_eq!(annual["discount"]["billingInterval"], "monthly");
}

#[test]
fn fixed_month_checkout_creates_repeating_coupon_for_free_and_partial_offers() {
    for percent in [50, 100] {
        let s = FakeSeams::new();
        set_paid_plan(&s);
        configure_login(&s);
        configure_stripe(&s);
        s.push_http_response(200, r#"{"user":{"id":"user_1"}}"#);
        s.push_http_response(200, &fixed_discount(percent, json!(3)));
        s.push_http_response(404, r#"{"error":{"message":"No such coupon"}}"#);
        let id = format!("{}-months-3", coupon_id(percent));
        s.push_http_response(200, &json!({"id":id,"percent_off":percent,"duration":"repeating","duration_in_months":3,"valid":true}).to_string());
        s.push_http_response(
            200,
            r#"{"id":"cs_fixed","url":"https://checkout.stripe.com/cs_fixed"}"#,
        );
        let mut req = request(
            ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
            "POST",
            "/paywall/v1/subscription/plan/stripe-session",
        );
        req.body = json!({"planId":"pro","interval":"monthly","metadata":{"invite_discount_duration":"subscription_lifetime","invite_discount_months":"999","discount_stacking":"caller_wins","campaign":"launch"}}).to_string();
        let out = response_body(&handle(&s, &req).unwrap());
        assert_eq!(out["discount"]["durationMonths"], 3);
        let requests = s.http_requests.borrow();
        let coupon = requests[3]["body"].as_str().unwrap();
        assert!(coupon.contains("duration=repeating"));
        assert!(coupon.contains("duration_in_months=3"));
        let checkout = requests[4]["body"].as_str().unwrap();
        assert!(checkout.contains("payment_method_collection=always"));
        assert!(checkout.contains("subscription_data%5Btrial_period_days%5D=3"));
        assert!(checkout.contains(&format!("discounts%5B0%5D%5Bcoupon%5D={id}")));
        assert!(checkout.contains("subscription_data%5Bmetadata%5D%5Binvite_discount_months%5D=3"));
        assert!(checkout.contains(
            "subscription_data%5Bmetadata%5D%5Binvite_discount_duration%5D=fixed_months"
        ));
        assert!(checkout.contains("subscription_data%5Bmetadata%5D%5Bcampaign%5D=launch"));
        assert!(!checkout.contains("subscription_lifetime"));
        assert!(!checkout.contains("999"));
        assert!(!checkout.contains("caller_wins"));
    }
}

#[test]
fn fixed_month_checkout_rejects_mismatched_stripe_coupon_term() {
    let s = FakeSeams::new();
    set_paid_plan(&s);
    configure_login(&s);
    configure_stripe(&s);
    s.push_http_response(200, r#"{"user":{"id":"user_1"}}"#);
    s.push_http_response(200, &fixed_discount(50, json!(3)));
    s.push_http_response(200, &json!({"id":format!("{}-months-3", coupon_id(50)),"percent_off":50,"duration":"repeating","duration_in_months":6,"valid":true}).to_string());
    let mut req = request(
        ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
        "POST",
        "/paywall/v1/subscription/plan/stripe-session",
    );
    req.body = json!({"planId":"pro","interval":"monthly"}).to_string();
    let error = handle(&s, &req).unwrap_err();
    assert_eq!(error.status, 502);
    assert_eq!(s.http_requests.borrow().len(), 3);
}

#[test]
fn invalid_month_terms_never_become_lifetime_discounts() {
    for months in [
        json!(0),
        json!(-1),
        json!(1.5),
        json!("3"),
        json!(2147483648u64),
    ] {
        let s = FakeSeams::new();
        set_paid_plan(&s);
        configure_login(&s);
        s.push_http_response(200, &fixed_discount(50, months.clone()));
        s.push_http_response(200, &fixed_discount(50, months));
        let req = request(
            ids::ROUTE_SUBSCRIPTION_PLANS,
            "GET",
            "/paywall/v1/subscription/plans",
        );
        let out = response_body(&handle(&s, &req).unwrap());
        assert!(out["discount"].is_null());
        assert_eq!(out["plans"][0]["priceCents"], 1200);
    }
}

#[test]
fn fixed_month_checkout_rejects_annual_before_contacting_stripe() {
    let s = FakeSeams::new();
    set_paid_plan(&s);
    configure_login(&s);
    configure_stripe(&s);
    s.push_http_response(200, r#"{"user":{"id":"user_1"}}"#);
    s.push_http_response(200, &fixed_discount(100, json!(3)));
    let mut req = request(
        ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
        "POST",
        "/paywall/v1/subscription/plan/stripe-session",
    );
    req.body = json!({"planId":"pro","interval":"yearly"}).to_string();
    let error = handle(&s, &req).unwrap_err();
    assert_eq!(error.status, 422);
    assert_eq!(
        error.message,
        "fixed-month invite discounts require monthly billing"
    );
    assert_eq!(s.http_requests.borrow().len(), 2);
}

#[test]
fn fixed_month_terms_reject_multi_month_intervals_but_lifetime_terms_preserve_them() {
    let s = FakeSeams::new();
    configure_login(&s);
    let req = request(
        ids::ROUTE_SUBSCRIPTION_PLANS,
        "GET",
        "/paywall/v1/subscription/plans",
    );
    s.push_http_response(200, &fixed_discount(50, json!(3)));
    let fixed = invite_discount::lookup(&s, &req).unwrap();
    assert!(fixed.validate_interval("monthly", 1).is_ok());
    assert!(fixed.validate_interval("monthly", 3).is_err());
    s.push_http_response(200, &discount(50));
    let forever = invite_discount::lookup(&s, &req).unwrap();
    assert!(forever.validate_interval("monthly", 3).is_ok());
    assert!(forever.validate_interval("yearly", 1).is_ok());
}

fn add_solana_option(s: &FakeSeams, stripe_enabled: bool) {
    let mut settings: Value =
        serde_json::from_str(&s.setting_get(SETTINGS_KEY).unwrap().unwrap()).unwrap();
    settings["plans"][0]["solanaSubscription"] = json!({
        "enabled": true, "planId": 7,
        "merchantAddress": "11111111111111111111111111111111",
        "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "monthlyAmountAtomic": 12000000, "monthlyPeriodHours": 720
    });
    if !stripe_enabled {
        settings["plans"][0]["stripePriceIdMonthly"] = Value::Null;
    }
    s.set_setting(SETTINGS_KEY, &settings.to_string());
}

#[test]
fn fixed_month_offer_preserves_complimentary_annual_plan_selection() {
    let s = FakeSeams::new();
    set_paid_plan(&s);
    configure_login(&s);
    let mut settings: Value =
        serde_json::from_str(&s.setting_get(SETTINGS_KEY).unwrap().unwrap()).unwrap();
    settings["plans"].as_array_mut().unwrap().push(json!({
        "id":"free", "title":"Free", "priceMonthlyUsd":0, "priceAnnualUsd":0, "isActive":true
    }));
    s.set_setting(SETTINGS_KEY, &settings.to_string());
    s.push_http_response(200, &fixed_discount(100, json!(3)));
    let mut req = request(
        ids::ROUTE_SUBSCRIPTION_PLANS,
        "GET",
        "/paywall/v1/subscription/plans",
    );
    req.query = vec![("interval".into(), "yearly".into())];
    let out = response_body(&handle(&s, &req).unwrap());
    assert_eq!(out["enabled"], true);
    assert_eq!(out["plans"].as_array().unwrap().len(), 1);
    assert_eq!(out["plans"][0]["planId"], "free");
    assert_eq!(out["plans"][0]["paymentMethods"], json!(["free"]));
}

#[test]
fn discounted_plans_only_advertise_stripe_and_hide_solana_only_plans() {
    for term in [Value::Null, json!(3)] {
        let s = FakeSeams::new();
        set_paid_plan(&s);
        configure_login(&s);
        add_solana_option(&s, true);
        s.push_http_response(200, &fixed_discount(50, term.clone()));
        let req = request(
            ids::ROUTE_SUBSCRIPTION_PLANS,
            "GET",
            "/paywall/v1/subscription/plans",
        );
        let out = response_body(&handle(&s, &req).unwrap());
        assert_eq!(out["plans"][0]["priceCents"], 600);
        assert_eq!(out["plans"][0]["paymentMethods"], json!(["stripe"]));
        add_solana_option(&s, false);
        s.push_http_response(200, &fixed_discount(50, term));
        let out = response_body(&handle(&s, &req).unwrap());
        assert_eq!(out["enabled"], false);
        assert_eq!(out["plans"], json!([]));
        assert_eq!(out["unavailableReason"], "invite_discount_requires_stripe");
        s.push_http_response(200, r#"{"discount":null}"#);
        let out = response_body(&handle(&s, &req).unwrap());
        assert_eq!(out["plans"][0]["priceCents"], 1200);
        assert_eq!(
            out["plans"][0]["paymentMethods"],
            json!(["solana_subscription"])
        );
    }
}

#[test]
fn solana_prepare_rejects_invite_discount_instead_of_collecting_full_price() {
    let s = FakeSeams::new();
    set_paid_plan(&s);
    configure_login(&s);
    add_solana_option(&s, true);
    s.push_http_response(200, r#"{"user":{"id":"user_1"}}"#);
    s.push_http_response(200, &fixed_discount(100, json!(3)));
    let mut req = request(
        ids::ROUTE_SUBSCRIPTION_PLAN_SOLANA_SUBSCRIPTION,
        "POST",
        "/paywall/v1/subscription/plan/solana-subscription",
    );
    req.body = json!({"planId":"pro", "interval":"monthly", "wallet":"9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"}).to_string();
    let error = handle(&s, &req).unwrap_err();
    assert_eq!(error.status, 422);
    assert_eq!(error.message, "invite discounts require Stripe checkout");
    assert_eq!(s.entry_count(ids::MODEL_SUBSCRIPTIONS), 0);
}

#[test]
fn checkout_metadata_cannot_forge_invite_terms_without_a_grant() {
    let metadata = checkout_metadata(
        "buyer",
        "pro",
        Some(std::collections::BTreeMap::from([
            ("invite_discount_duration".into(), "fixed_months".into()),
            ("invite_discount_months".into(), "3".into()),
            ("invite_discount_code".into(), "FORGED".into()),
            ("discount_stacking".into(), "caller_wins".into()),
            ("campaign".into(), "launch".into()),
        ])),
    );
    assert!(!metadata
        .iter()
        .any(|(key, _)| key.starts_with("invite_discount_") || key == "discount_stacking"));
    assert!(metadata.contains(&("campaign".into(), "launch".into())));
    assert!(metadata.contains(&("user_id".into(), "buyer".into())));
}

#[test]
fn browser_plan_reads_apply_redeemed_invite_from_same_origin_cookie() {
    for headers in [
        vec![("origin".into(), "https://site.example".into())],
        vec![(
            "referer".into(),
            "https://site.example/pricing?view=signup".into(),
        )],
    ] {
        let s = FakeSeams::new();
        set_paid_plan(&s);
        configure_login(&s);
        s.push_http_response(200, &discount(100));
        let mut req = request(
            ids::ROUTE_SUBSCRIPTION_PLANS,
            "GET",
            "/paywall/v1/subscription/plans",
        );
        req.headers = headers;
        req.headers.push((
            "cookie".into(),
            "cedros_access=cookie-session; cedros_refresh=private".into(),
        ));
        req.query = vec![("interval".into(), "monthly".into())];
        let out = response_body(&handle(&s, &req).unwrap());
        assert_eq!(out["discount"]["percentOff"], 100);
        assert_eq!(out["plans"][0]["priceCents"], 0);
        assert_eq!(out["plans"][0]["originalPriceCents"], 1200);
        assert_eq!(
            s.http_requests.borrow()[0]["headers"][0][1],
            "Bearer cookie-session"
        );
    }
}

#[test]
fn browser_invite_lookup_rejects_untrusted_or_missing_origin_evidence() {
    for (method, origin, referer) in [
        ("GET", None, None),
        ("GET", None, Some("https://site.example.evil/pricing")),
        (
            "GET",
            None,
            Some("https://site.example@evil.example/pricing"),
        ),
        (
            "GET",
            Some("https://evil.example"),
            Some("https://site.example/pricing"),
        ),
        ("POST", None, Some("https://site.example/pricing")),
        ("POST", Some("https://evil.example"), None),
    ] {
        let s = FakeSeams::new();
        configure_login(&s);
        let mut req = request(
            ids::ROUTE_SUBSCRIPTION_PLANS,
            method,
            "/paywall/v1/subscription/plans",
        );
        req.headers = vec![("cookie".into(), "cedros_access=cookie-session".into())];
        if let Some(origin) = origin {
            req.headers.push(("origin".into(), origin.into()));
        }
        if let Some(referer) = referer {
            req.headers.push(("referer".into(), referer.into()));
        }
        assert!(invite_discount::lookup(&s, &req).is_none());
        assert!(s.http_requests.borrow().is_empty());
    }
}

#[test]
fn browser_lifetime_free_checkout_skips_payment_method_and_starts_without_trial() {
    for use_stripe_price in [true, false] {
        let s = FakeSeams::new();
        set_paid_plan(&s);
        if !use_stripe_price {
            let mut settings: Value =
                serde_json::from_str(&s.setting_get(SETTINGS_KEY).unwrap().unwrap()).unwrap();
            settings["plans"][0]["stripePriceIdMonthly"] = Value::Null;
            s.set_setting(SETTINGS_KEY, &settings.to_string());
        }
        configure_login(&s);
        configure_stripe(&s);
        s.push_http_response(200, r#"{"user":{"id":"cookie-user"}}"#);
        s.push_http_response(200, &discount(100));
        s.push_http_response(
        200,
        &json!({"id": coupon_id(100), "percent_off": 100, "duration": "forever", "valid": true})
            .to_string(),
    );
        s.push_http_response(
            200,
            r#"{"id":"cs_cookie","url":"https://checkout.stripe.com/cs_cookie"}"#,
        );
        let mut req = request(
            ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
            "POST",
            "/paywall/v1/subscription/plan/stripe-session",
        );
        req.headers = vec![
            ("origin".into(), "https://site.example".into()),
            (
                "cookie".into(),
                "cedros_access=cookie-session; cedros_refresh=private".into(),
            ),
        ];
        req.body = json!({"planId": "pro", "interval": "monthly"}).to_string();
        let out = response_body(&handle(&s, &req).unwrap());
        assert_eq!(out["priceCents"], 0);
        assert_eq!(out["discount"]["percentOff"], 100);
        let requests = s.http_requests.borrow();
        assert_eq!(requests[1]["headers"][0][1], "Bearer cookie-session");
        let checkout = requests[3]["body"].as_str().unwrap();
        assert!(checkout.contains(&format!("discounts%5B0%5D%5Bcoupon%5D={}", coupon_id(100))));
        assert!(checkout.contains(
            "subscription_data%5Bmetadata%5D%5Binvite_discount_duration%5D=subscription_lifetime"
        ));
        assert!(checkout.contains("payment_method_collection=if_required"));
        assert!(!checkout.contains("subscription_data%5Btrial_period_days%5D"));
    }
}

#[test]
fn temporary_free_checkout_still_collects_payment_method_for_future_charges() {
    for use_stripe_price in [true, false] {
        let s = FakeSeams::new();
        set_paid_plan(&s);
        if !use_stripe_price {
            let mut settings: Value =
                serde_json::from_str(&s.setting_get(SETTINGS_KEY).unwrap().unwrap()).unwrap();
            settings["plans"][0]["stripePriceIdMonthly"] = Value::Null;
            s.set_setting(SETTINGS_KEY, &settings.to_string());
        }
        configure_login(&s);
        configure_stripe(&s);
        s.push_http_response(200, r#"{"user":{"id":"user_1"}}"#);
        s.push_http_response(200, &fixed_discount(100, json!(3)));
        s.push_http_response(
            200,
            &json!({
                "id": format!("{}-months-3", coupon_id(100)),
                "percent_off": 100, "duration": "repeating",
                "duration_in_months": 3, "valid": true
            })
            .to_string(),
        );
        s.push_http_response(
            200,
            r#"{"id":"cs_temporary","url":"https://checkout.stripe.com/cs_temporary"}"#,
        );
        let mut req = request(
            ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
            "POST",
            "/paywall/v1/subscription/plan/stripe-session",
        );
        req.body = json!({"planId": "pro", "interval": "monthly"}).to_string();
        let out = response_body(&handle(&s, &req).unwrap());
        assert_eq!(out["priceCents"], 0);
        let requests = s.http_requests.borrow();
        let checkout = requests[3]["body"].as_str().unwrap();
        assert!(checkout.contains("payment_method_collection=always"));
        assert!(checkout.contains("subscription_data%5Btrial_period_days%5D=3"));
    }
}
