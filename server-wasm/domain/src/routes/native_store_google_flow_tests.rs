use super::*;

// ── full flows ──────────────────────────────────────────────────────────────────

#[test]
fn one_time_happy_path_records_ledger() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    configure_google(&s, RSA_KEY);
    seed_google_product(&s, "prod_pack", "coins_100", 499);
    s.push_http_response(200, r#"{"access_token":"ya29.test"}"#);
    s.push_http_response(200, r#"{"purchaseState":0,"acknowledgementState":1}"#);

    let resp = verify_google(
        &s,
        &google_req("prod_pack", "coins_100", "tok_abc"),
        Some("user_1".into()),
    )
    .unwrap();
    assert_eq!(resp.status, 200);
    let out: serde_json::Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["success"], true);
    assert_eq!(out["transactionId"], "tok_abc");
    assert_eq!(out["method"], "google_play_billing");
    assert!(out.get("subscriptionStatus").is_none());

    assert_eq!(s.entry_count(ids::MODEL_LEDGER), 1);
    let row = s
        .get_entry(ids::MODEL_LEDGER, "google-token:tok_abc")
        .unwrap();
    assert_eq!(row["provider"], "google_play");
    assert_eq!(row["grossCents"], 499);
    assert_eq!(row["customerProfileId"], "user_1");
    assert_eq!(
        s.event_count(ids::EVENT_ENTITLEMENT_CHANGED),
        1,
        "entitlement signalled"
    );
    assert_eq!(
        s.event_count(ids::EVENT_PAYMENT_SUCCEEDED),
        1,
        "revenue counted"
    );
}

#[test]
fn cancelled_one_time_purchase_is_rejected_and_records_nothing() {
    let s = FakeSeams::new();
    configure_google(&s, RSA_KEY);
    seed_google_product(&s, "prod_pack", "coins_100", 499);
    s.push_http_response(200, r#"{"access_token":"ya29.test"}"#);
    s.push_http_response(200, r#"{"purchaseState":1}"#);
    let err = verify_google(&s, &google_req("prod_pack", "coins_100", "tok_x"), None).unwrap_err();
    assert_eq!(err.status, 403);
    assert_eq!(s.entry_count(ids::MODEL_LEDGER), 0);
}

#[test]
fn subscription_happy_path_surfaces_period() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    configure_google(&s, RSA_KEY);
    seed_google_subscription(&s, "prod_sub", "sub_monthly");
    s.push_http_response(200, r#"{"access_token":"ya29.test"}"#);
    s.push_http_response(
        200,
        r#"{"subscriptionState":"SUBSCRIPTION_STATE_ACTIVE","lineItems":[{"productId":"sub_monthly","expiryTime":"2030-06-01T00:00:00Z"}]}"#,
    );
    let resp = verify_google(
        &s,
        &google_req("prod_sub", "sub_monthly", "tok_sub"),
        Some("user_9".into()),
    )
    .unwrap();
    assert_eq!(resp.status, 200);
    let out: serde_json::Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["subscriptionStatus"], "active");
    assert_eq!(out["subscriptionId"], "tok_sub");
    assert!(out["currentPeriodEnd"]
        .as_str()
        .unwrap()
        .starts_with("2030-06-01"));

    // Durable subscription record (keyed by the purchase token) for entitlement checks.
    let sub = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "tok_sub").unwrap();
    assert_eq!(sub["status"], "active");
    assert_eq!(sub["customerRef"], "user_9");
    assert_eq!(sub["provider"], "google_play");
    assert_eq!(sub["priceId"], "prod_sub");
}

#[test]
fn subscription_product_mismatch_is_rejected_and_records_nothing() {
    let s = FakeSeams::new();
    configure_google(&s, RSA_KEY);
    seed_google_subscription(&s, "prod_premium", "premium_monthly");
    s.push_http_response(200, r#"{"access_token":"ya29.test"}"#);
    s.push_http_response(
        200,
        r#"{"subscriptionState":"SUBSCRIPTION_STATE_ACTIVE","lineItems":[{"productId":"basic_monthly","expiryTime":"2030-06-01T00:00:00Z"}]}"#,
    );

    let err = verify_google(
        &s,
        &google_req("prod_premium", "premium_monthly", "tok_sub"),
        None,
    )
    .unwrap_err();

    assert_eq!(err.status, 403);
    assert_eq!(err.code, "product_mismatch");
    assert_eq!(s.entry_count(ids::MODEL_LEDGER), 0);
}

#[test]
fn google_oauth_failure_surfaces_as_502() {
    let s = FakeSeams::new();
    configure_google(&s, RSA_KEY);
    seed_google_product(&s, "prod_pack", "coins_100", 499);
    s.push_http_response(401, r#"{"error":"invalid_grant"}"#);
    let err = verify_google(&s, &google_req("prod_pack", "coins_100", "tok"), None).unwrap_err();
    assert_eq!(err.status, 502);
}
