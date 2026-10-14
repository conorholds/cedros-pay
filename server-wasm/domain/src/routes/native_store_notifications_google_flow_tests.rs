use super::*;

#[test]
fn google_rtdn_subscription_reverifies_and_extends() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    configure_google(&s);
    seed_google_sub(&s, "tok_g", "active", "user_g", "prod_g");
    s.push_http_response(200, r#"{"access_token":"ya29.test"}"#);
    s.push_http_response(
        200,
        r#"{"subscriptionState":"SUBSCRIPTION_STATE_ACTIVE","lineItems":[{"expiryTime":"2030-06-01T00:00:00Z"}]}"#,
    );
    let resp = handle(
        &s,
        &google_req(json!({ "subscriptionNotification": { "purchaseToken": "tok_g" } })),
    )
    .unwrap();
    assert_eq!(resp.status, 200);
    let sub = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "tok_g").unwrap();
    assert_eq!(sub["status"], "active");
    assert!(sub["currentPeriodEnd"]
        .as_str()
        .unwrap()
        .starts_with("2030"));
}

#[test]
fn google_rtdn_does_not_reactivate_terminal_subscription_by_provider_ref() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    configure_google(&s);
    seed_sub_with_provider_ref(
        &s,
        "local_google_sub",
        "tok_g",
        "canceled",
        "user_g",
        "prod_g",
        GOOGLE_PROVIDER,
    );
    s.push_http_response(200, r#"{"access_token":"ya29.test"}"#);
    s.push_http_response(
        200,
        r#"{"subscriptionState":"SUBSCRIPTION_STATE_ACTIVE","lineItems":[{"expiryTime":"2030-06-01T00:00:00Z"}]}"#,
    );

    handle(
        &s,
        &google_req(json!({ "subscriptionNotification": { "purchaseToken": "tok_g" } })),
    )
    .unwrap();

    assert!(s.get_entry(ids::MODEL_SUBSCRIPTIONS, "tok_g").is_none());
    let sub = s
        .get_entry(ids::MODEL_SUBSCRIPTIONS, "local_google_sub")
        .unwrap();
    assert_eq!(sub["status"], "canceled");
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);
}

#[test]
fn google_rtdn_subscription_without_local_mapping_does_not_grant() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    configure_google(&s);
    s.push_http_response(200, r#"{"access_token":"ya29.test"}"#);
    s.push_http_response(
        200,
        r#"{"subscriptionState":"SUBSCRIPTION_STATE_ACTIVE","lineItems":[{"expiryTime":"2030-06-01T00:00:00Z"}]}"#,
    );

    handle(
        &s,
        &google_req(json!({ "subscriptionNotification": { "purchaseToken": "tok_missing" } })),
    )
    .unwrap();

    assert_eq!(s.entry_count(ids::MODEL_SUBSCRIPTIONS), 0);
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);
}

#[test]
fn google_rtdn_canceled_subscription_revokes() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    configure_google(&s);
    seed_google_sub(&s, "tok_g", "active", "user_g", "prod_g");
    s.push_http_response(200, r#"{"access_token":"ya29.test"}"#);
    // API truth: canceled → revoke regardless of the notification's claim.
    s.push_http_response(
        200,
        r#"{"subscriptionState":"SUBSCRIPTION_STATE_CANCELED","lineItems":[]}"#,
    );
    handle(
        &s,
        &google_req(json!({ "subscriptionNotification": { "purchaseToken": "tok_g" } })),
    )
    .unwrap();
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "tok_g").unwrap()["status"],
        "canceled"
    );
}

#[test]
fn google_rtdn_voided_purchase_refunds_the_ledger() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    configure_google(&s);
    seed_google_ledger(&s, "google-token:tok_v", 499, "user_v", "prod_v");
    s.push_http_response(200, r#"{"access_token":"ya29.test"}"#);
    s.push_http_response(
        200,
        r#"{"orderId":"GPA.1","purchaseToken":"tok_v","state":"REFUNDED"}"#,
    );
    handle(
        &s,
        &google_req(json!({ "voidedPurchaseNotification": {
            "purchaseToken": "tok_v", "orderId": "GPA.1", "productType": 2,
            "refundType": 1
        } })),
    )
    .unwrap();
    let row = s
        .get_entry(ids::MODEL_LEDGER, "google-token:tok_v")
        .unwrap();
    assert_eq!(row["status"], "refunded");
    assert_eq!(row["refundCents"], 499);
}

#[test]
fn google_rtdn_purchased_product_claims_notification_without_refunding() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    configure_google(&s);
    seed_google_ledger(&s, "google-token:tok_ok", 499, "user_v", "prod_v");
    s.push_http_response(200, r#"{"access_token":"ya29.test"}"#);
    s.push_http_response(200, r#"{"purchaseState":0}"#);
    handle(
        &s,
        &google_req(json!({ "oneTimeProductNotification": {
            "purchaseToken": "tok_ok", "sku": "coins_100" } })),
    )
    .unwrap();
    let row = s
        .get_entry(ids::MODEL_LEDGER, "google-token:tok_ok")
        .unwrap();
    assert_eq!(row["status"], "succeeded");
    assert_eq!(row["refundCents"], 0);
    assert_eq!(s.entry_count(ids::MODEL_WEBHOOK_OUTBOX), 1);
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);
}

#[test]
fn google_rtdn_test_notification_is_a_noop() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    configure_google(&s);
    let resp = handle(
        &s,
        &google_req(json!({ "testNotification": { "version": "1.0" } })),
    )
    .unwrap();
    assert_eq!(resp.status, 200);
}

#[test]
fn google_rtdn_rejects_an_unauthenticated_forged_void() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    configure_google(&s);
    seed_google_ledger(&s, "google-token:tok_v", 499, "user_v", "prod_v");
    let mut request = google_req(json!({
        "voidedPurchaseNotification": {
            "purchaseToken": "tok_v", "orderId": "GPA.1", "productType": 2,
            "refundType": 1
        }
    }));
    request.headers.clear();

    let error = handle(&s, &request).unwrap_err();

    assert_eq!(error.status, 401);
    let row = s
        .get_entry(ids::MODEL_LEDGER, "google-token:tok_v")
        .unwrap();
    assert_eq!(row["status"], "succeeded");
    assert_eq!(row["refundCents"], 0);
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn google_rtdn_rejects_cross_app_and_mismatched_provider_proof() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    configure_google(&s);
    seed_google_ledger(&s, "google-token:tok_v", 499, "user_v", "prod_v");
    let wrong_app = google_req_for_package(json!({
        "packageName": "com.attacker.app",
        "voidedPurchaseNotification": {
            "purchaseToken": "tok_v", "orderId": "GPA.1", "productType": 2,
            "refundType": 1
        }
    }));
    assert_eq!(handle(&s, &wrong_app).unwrap_err().status, 403);

    configure_google(&s);
    s.push_http_response(200, r#"{"access_token":"ya29.test"}"#);
    s.push_http_response(
        200,
        r#"{"orderId":"GPA.1","purchaseToken":"other","state":"REFUNDED"}"#,
    );
    let forged = google_req(json!({ "voidedPurchaseNotification": {
        "purchaseToken": "tok_v", "orderId": "GPA.1", "productType": 2,
        "refundType": 1
    } }));
    assert_eq!(handle(&s, &forged).unwrap_err().status, 403);
    let row = s
        .get_entry(ids::MODEL_LEDGER, "google-token:tok_v")
        .unwrap();
    assert_eq!(row["status"], "succeeded");
    assert_eq!(row["refundCents"], 0);
}

#[test]
fn google_rtdn_applies_only_the_verified_cumulative_partial_refund() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    configure_google(&s);
    seed_google_ledger(&s, "google-token:tok_partial", 499, "user_v", "prod_v");
    s.push_http_response(200, r#"{"access_token":"ya29.test"}"#);
    s.push_http_response(
        200,
        r#"{"orderId":"GPA.2","purchaseToken":"tok_partial","state":"PARTIALLY_REFUNDED","orderHistory":{"partialRefundEvents":[{"state":"PROCESSED_SUCCESSFULLY","refundDetails":{"total":{"currencyCode":"USD","units":"1","nanos":990000000}}}]}}"#,
    );
    handle(
        &s,
        &google_req(json!({ "voidedPurchaseNotification": {
            "purchaseToken": "tok_partial", "orderId": "GPA.2", "productType": 2,
            "refundType": 2
        } })),
    )
    .unwrap();
    let row = s
        .get_entry(ids::MODEL_LEDGER, "google-token:tok_partial")
        .unwrap();
    assert_eq!(row["status"], "succeeded");
    assert_eq!(row["refundCents"], 199);
}
