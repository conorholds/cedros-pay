use super::*;
use crate::fake::FakeSeams;

fn configure(s: &FakeSeams) {
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test");
    s.set_setting("stripe.success_url", "https://shop.example/ok");
    s.set_setting("stripe.cancel_url", "https://shop.example/no");
}

fn seed_sub_product(s: &FakeSeams, id: &str, interval: Value, trial: Option<i64>) {
    let mut sub = serde_json::Map::new();
    sub.insert("interval".into(), interval);
    if let Some(t) = trial {
        sub.insert("trialDays".into(), Value::from(t));
    }
    s.seed(
        ids::MODEL_CATALOG,
        id,
        json!({
            "id": id, "title": "Pro Plan",
            "price": { "amountCents": 1500, "currency": "USD" },
            "subscription": Value::Object(sub),
        }),
    );
}

fn req(body: Value) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_SUBSCRIPTION_STRIPE_SESSION.into(),
        method: "POST".into(),
        path: "/paywall/v1/subscription/stripe-session".into(),
        body: body.to_string(),
        context_json: r#"{"siteId":"site-a","idempotencyKey":"subscription-attempt-0001"}"#.into(),
        ..Default::default()
    }
}

#[test]
fn requires_a_host_supplied_attempt_identity_before_stripe_egress() {
    let s = FakeSeams::new();
    configure(&s);
    seed_sub_product(&s, "plan_pro", json!("monthly"), None);
    let mut request = req(json!({ "resource": "plan_pro" }));
    request.context_json = "{}".into();

    let error = handle(&s, &request).unwrap_err();

    assert_eq!(
        (error.status, error.message.as_str()),
        (400, "idempotency key required")
    );
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn creates_a_monthly_subscription_session_with_server_trial() {
    let s = FakeSeams::new();
    configure(&s);
    seed_sub_product(&s, "plan_pro", json!("monthly"), Some(7));
    s.push_http_response(
        200,
        r#"{"id":"cs_sub","url":"https://checkout.stripe.com/s"}"#,
    );

    // The client tries to sneak in yearly billing + a 90-day trial — both ignored.
    let resp = handle(
        &s,
        &req(json!({ "resource": "plan_pro", "interval": "yearly", "trialDays": 90 })),
    )
    .unwrap();
    assert_eq!(resp.status, 200);
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["flow"], "redirect_checkout");
    assert_eq!(out["sessionId"], "cs_sub");

    let sent = s.http_requests.borrow()[0]["body"]
        .as_str()
        .unwrap()
        .to_string();
    assert!(sent.contains("mode=subscription"));
    assert!(sent.contains(&format!(
        "expires_at={}",
        s.now_unix_secs() + checkout_api::SESSION_TTL_SECONDS
    )));
    assert!(sent.contains("unit_amount%5D=1500"));
    // Server interval (month), NOT the client's yearly.
    assert!(sent.contains("interval%5D=month"));
    assert!(!sent.contains("interval%5D=year"));
    // Server trial (7), NOT the client's 90.
    assert!(sent.contains("trial_period_days%5D=7"));
    assert!(!sent.contains("trial_period_days%5D=90"));
    assert!(sent.contains("subscription_data%5Bmetadata%5D%5Bresource%5D=plan_pro"));
}

#[test]
fn completed_subscription_session_replays_without_creating_another_session() {
    let s = FakeSeams::new();
    configure(&s);
    seed_sub_product(&s, "plan_pro", json!("monthly"), None);
    s.push_http_response(
        200,
        r#"{"id":"cs_replay","url":"https://checkout.stripe.com/replay"}"#,
    );
    let request = req(json!({ "resource": "plan_pro" }));
    assert_eq!(handle(&s, &request).unwrap().status, 200);

    let replay = handle(&s, &request).unwrap();

    assert_eq!(replay.status, 200);
    assert_eq!(
        serde_json::from_str::<Value>(&replay.body).unwrap()["sessionId"],
        "cs_replay"
    );
    assert_eq!(s.http_requests.borrow().len(), 1);
}

#[test]
fn ambiguous_subscription_session_never_reposts_after_provider_retry_horizon() {
    let s = FakeSeams::new();
    configure(&s);
    seed_sub_product(&s, "plan_pro", json!("monthly"), None);
    let request = req(json!({ "resource": "plan_pro" }));
    s.push_http_error("response lost");
    assert!(handle(&s, &request).is_err());
    s.set_now(
        crate::time::parse_iso("2026-05-31T12:00:00Z").unwrap()
            + crate::checkout_contract::PROVIDER_IDEMPOTENCY_SECONDS,
    );

    assert_eq!(handle(&s, &request).unwrap_err().status, 409);
    assert_eq!(s.http_requests.borrow().len(), 1);
}

#[test]
fn non_subscription_product_is_422() {
    let s = FakeSeams::new();
    configure(&s);
    s.seed(
        ids::MODEL_CATALOG,
        "one_time",
        json!({ "id": "one_time", "price": { "amountCents": 999 } }),
    );
    assert_eq!(
        handle(&s, &req(json!({ "resource": "one_time" })))
            .unwrap_err()
            .status,
        422
    );
}

#[test]
fn capacity_add_ons_cannot_use_unscoped_subscription_checkout() {
    for resource in ["cedros-addon-sites", "custom-capacity"] {
        let s = FakeSeams::new();
        configure(&s);
        seed_sub_product(&s, resource, json!("monthly"), None);
        let mut product = s.get_entry(ids::MODEL_CATALOG, resource).unwrap();
        product["productType"] = json!("capacityAddOn");
        s.seed(ids::MODEL_CATALOG, resource, product);
        let error = handle(&s, &req(json!({ "resource": resource }))).unwrap_err();
        assert_eq!(error.status, 422);
        assert!(s.http_requests.borrow().is_empty());
        assert_eq!(s.entry_count(ids::MODEL_SUBSCRIPTIONS), 0);
    }
}

#[test]
fn custom_cadence_uses_interval_days() {
    let s = FakeSeams::new();
    configure(&s);
    s.seed(
        ids::MODEL_CATALOG,
        "plan_q",
        json!({
            "id": "plan_q", "title": "Quarterly",
            "fiatAmountCents": 3000,
            "subscription": { "interval": "custom", "intervalDays": 90 }
        }),
    );
    s.push_http_response(
        200,
        r#"{"id":"cs_q","url":"https://checkout.stripe.com/q"}"#,
    );
    let resp = handle(&s, &req(json!({ "resource": "plan_q" }))).unwrap();
    assert_eq!(resp.status, 200);
    let sent = s.http_requests.borrow()[0]["body"]
        .as_str()
        .unwrap()
        .to_string();
    assert!(sent.contains("interval%5D=day"));
    assert!(sent.contains("interval_count%5D=90"));
    // Prices the flat fiatAmountCents shape too.
    assert!(sent.contains("unit_amount%5D=3000"));
}

#[test]
fn unconfigured_stripe_is_503() {
    let s = FakeSeams::new();
    seed_sub_product(&s, "plan_pro", json!("monthly"), None);
    assert_eq!(
        handle(&s, &req(json!({ "resource": "plan_pro" })))
            .unwrap_err()
            .status,
        503
    );
}

#[test]
fn unknown_resource_is_404() {
    let s = FakeSeams::new();
    configure(&s);
    assert_eq!(
        handle(&s, &req(json!({ "resource": "nope" })))
            .unwrap_err()
            .status,
        404
    );
}
