use super::*;
use crate::fake::FakeSeams;
use serde_json::Value;

fn seams() -> FakeSeams {
    let s = FakeSeams::new();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    s.set_secret(ids::SECRET_RP_TOKEN, "rp_test");
    s
}

fn event_payload(s: &FakeSeams, event_id: &str) -> Value {
    s.events
        .borrow()
        .iter()
        .find(|(id, _, _)| id == event_id)
        .map(|(_, _, payload)| payload.clone())
        .expect("event payload exists")
}

fn post(path: &str, body: Value) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_SUBSCRIPTIONS_CREATE.into(),
        method: "POST".into(),
        path: path.into(),
        headers: vec![("authorization".into(), "Bearer rp_test".into())],
        body: body.to_string(),
        context_json: r#"{"siteId":"site-a","idempotencyKey":"subscription-test-attempt"}"#.into(),
        ..Default::default()
    }
}

fn get_status(subscription_id: &str) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_SUBSCRIPTIONS_STATUS.into(),
        method: "GET".into(),
        path: "/subscription/v1/status".into(),
        headers: vec![("authorization".into(), "Bearer rp_test".into())],
        query: vec![("subscriptionId".into(), subscription_id.into())],
        ..Default::default()
    }
}

#[test]
fn rejects_missing_relying_party_auth() {
    let s = seams();
    let mut req = post(
        "/subscription/v1/create",
        json!({ "customerRef": "cus_1", "priceId": "price_1" }),
    );
    req.headers.clear();
    assert_eq!(handle(&s, &req).unwrap_err().status, 401);
}

#[test]
fn rejects_the_wrong_portal_provider_token_before_route_work() {
    let s = seams();
    let mut req = portal_req(json!({
        "subscriptionId": "sub_1",
        "returnUrl": "https://app.example.com/account"
    }));
    req.headers = vec![("authorization".into(), "Bearer wrong-provider-token".into())];

    assert_eq!(handle(&s, &req).unwrap_err().status, 401);
    assert!(s.http_requests.borrow().is_empty());
}

fn portal_req(body: Value) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_SUBSCRIPTIONS_PORTAL.into(),
        method: "POST".into(),
        path: "/subscription/v1/portal".into(),
        headers: vec![("authorization".into(), "Bearer rp_test".into())],
        body: body.to_string(),
        context_json: r#"{"siteId":"site-a","idempotencyKey":"portal-test-attempt"}"#.into(),
        ..Default::default()
    }
}

fn buyer_req(route_id: &str, path: &str, body: Value) -> RouteRequest {
    RouteRequest {
        route_id: route_id.into(),
        method: "POST".into(),
        path: path.into(),
        headers: vec![("authorization".into(), "Bearer buyer-session".into())],
        body: body.to_string(),
        context_json: r#"{"siteId":"site-a","idempotencyKey":"buyer-subscription-test-attempt"}"#
            .into(),
        ..Default::default()
    }
}

#[test]
fn provider_operations_require_an_external_idempotency_key_before_egress() {
    let s = seams();
    seed_sub(&s);
    for mut request in [
        post(
            "/subscription/v1/create",
            json!({"customerRef": "cus_1", "priceId": "price_1"}),
        ),
        post(
            "/subscription/v1/cancel",
            json!({"subscriptionId": "sub_1"}),
        ),
        portal_req(json!({
            "subscriptionId": "sub_1",
            "returnUrl": "https://app.example.com/account"
        })),
    ] {
        request.context_json.clear();
        let error = handle(&s, &request).unwrap_err();
        assert_eq!(error.status, 400);
        assert_eq!(error.message, "idempotency key is required");
    }
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn subscription_create_rejects_mismatched_body_and_host_keys() {
    let s = seams();
    let request = post(
        "/subscription/v1/create",
        json!({
            "customerRef": "cus_1",
            "priceId": "price_1",
            "siteId":"site-a","idempotencyKey": "body-attempt"
        }),
    );

    let error = handle(&s, &request).unwrap_err();

    assert_eq!(error.status, 400);
    assert_eq!(
        error.message,
        "host and body idempotency keys must exactly match"
    );
    assert!(s.http_requests.borrow().is_empty());
}

fn configure_buyer_auth(s: &FakeSeams, user_id: &str) {
    s.set_setting("cedros_login.base_url", "https://site.example");
    s.push_http_response(200, &json!({"user": {"id": user_id}}).to_string());
}

fn seed_sub(s: &FakeSeams) {
    seed_sub_with_identities(s, "cus_1", None, None);
}

fn seed_sub_with_identities(
    s: &FakeSeams,
    customer_ref: &str,
    user_id: Option<&str>,
    login_user_id: Option<&str>,
) {
    let mut payload = json!({
        "subscriptionId": "sub_1", "customerRef": customer_ref, "priceId": "price_1",
        "status": "active", "provider": "stripe", "providerRef": "sub_1",
        "currentPeriodEnd": "2030-01-01T00:00:00Z", "cancelAtPeriodEnd": false,
        "createdAt": "2026-01-01T00:00:00Z", "updatedAt": "2026-01-01T00:00:00Z"
    });
    if let Some(user_id) = user_id {
        payload["userId"] = json!(user_id);
    }
    if let Some(login_user_id) = login_user_id {
        payload["cedrosLoginUserId"] = json!(login_user_id);
    }
    s.seed(ids::MODEL_SUBSCRIPTIONS, "sub_1", payload);
}

#[test]
fn portal_opens_a_billing_portal_session() {
    let s = seams();
    seed_sub(&s);
    s.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    s.push_http_response(
        200,
        r#"{"id":"bps_1","url":"https://billing.stripe.com/p/session/test"}"#,
    );
    let resp = handle(
        &s,
        &portal_req(
            json!({ "subscriptionId": "sub_1", "returnUrl": "https://app.example.com/account" }),
        ),
    )
    .unwrap();
    assert_eq!(resp.status, 200);
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["url"], "https://billing.stripe.com/p/session/test");
}

#[test]
fn portal_rejects_non_https_return_url() {
    let s = seams();
    let err = handle(
        &s,
        &portal_req(json!({ "subscriptionId": "sub_1", "returnUrl": "http://evil.example" })),
    )
    .unwrap_err();
    assert_eq!(err.status, 422);
}

#[test]
fn buyer_opens_only_their_own_billing_portal() {
    let s = seams();
    seed_sub(&s);
    configure_buyer_auth(&s, "cus_1");
    s.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    s.push_http_response(
        200,
        r#"{"id":"bps_1","url":"https://billing.stripe.com/p/session/buyer"}"#,
    );

    let response = handle(
        &s,
        &buyer_req(
            ids::ROUTE_BUYER_SUBSCRIPTION_PORTAL,
            "/paywall/v1/subscription/portal",
            json!({"subscriptionId": "sub_1", "returnUrl": "https://app.example.com/billing"}),
        ),
    )
    .unwrap();

    assert_eq!(response.status, 200);
    assert_eq!(s.http_requests.borrow().len(), 3);
    assert_eq!(
        serde_json::from_str::<Value>(&response.body).unwrap()["url"],
        "https://billing.stripe.com/p/session/buyer"
    );
}

#[test]
fn buyer_cannot_open_another_customers_billing_portal() {
    let s = seams();
    seed_sub(&s);
    configure_buyer_auth(&s, "other-customer");

    let error = handle(
        &s,
        &buyer_req(
            ids::ROUTE_BUYER_SUBSCRIPTION_PORTAL,
            "/paywall/v1/subscription/portal",
            json!({"subscriptionId": "sub_1", "returnUrl": "https://app.example.com/billing"}),
        ),
    )
    .unwrap_err();

    assert_eq!(error.status, 404);
    assert_eq!(s.http_requests.borrow().len(), 1);
}

#[test]
fn buyer_identity_takes_precedence_over_provider_customer_reference() {
    let s = seams();
    seed_sub_with_identities(&s, "cus_stripe", None, Some("buyer-1"));
    configure_buyer_auth(&s, "buyer-1");
    s.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    s.push_http_response(
        200,
        r#"{"id":"bps_1","url":"https://billing.stripe.com/p/session/buyer"}"#,
    );

    let response = handle(
        &s,
        &buyer_req(
            ids::ROUTE_BUYER_SUBSCRIPTION_PORTAL,
            "/paywall/v1/subscription/portal",
            json!({"subscriptionId": "sub_1", "returnUrl": "https://app.example.com/billing"}),
        ),
    )
    .unwrap();

    assert_eq!(response.status, 200);
    assert_eq!(s.http_requests.borrow().len(), 3);
}

#[test]
fn conflicting_buyer_identities_fail_closed_before_stripe() {
    let s = seams();
    seed_sub_with_identities(&s, "buyer-1", Some("buyer-1"), Some("buyer-2"));
    configure_buyer_auth(&s, "buyer-1");

    let error = handle(
        &s,
        &buyer_req(
            ids::ROUTE_BUYER_SUBSCRIPTION_PORTAL,
            "/paywall/v1/subscription/portal",
            json!({"subscriptionId": "sub_1", "returnUrl": "https://app.example.com/billing"}),
        ),
    )
    .unwrap_err();

    assert_eq!(error.status, 404);
    assert_eq!(s.http_requests.borrow().len(), 1);
}

#[test]
fn buyer_cancels_only_their_own_subscription() {
    let s = seams();
    seed_sub(&s);
    configure_buyer_auth(&s, "cus_1");
    s.push_http_response(
        200,
        r#"{"id":"sub_1","customer":"cus_1","status":"active","cancel_at_period_end":true}"#,
    );

    let response = handle(
        &s,
        &buyer_req(
            ids::ROUTE_BUYER_SUBSCRIPTION_CANCEL,
            "/paywall/v1/subscription/cancel",
            json!({"subscriptionId": "sub_1"}),
        ),
    )
    .unwrap();

    assert_eq!(response.status, 200);
    assert_eq!(s.http_requests.borrow().len(), 2);
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap()["cancelAtPeriodEnd"],
        true
    );
}

#[test]
fn buyer_cancel_normalizes_the_subscription_id_once() {
    let s = seams();
    seed_sub(&s);
    configure_buyer_auth(&s, "cus_1");
    s.push_http_response(
        200,
        r#"{"id":"sub_1","customer":"cus_1","status":"active","cancel_at_period_end":true}"#,
    );

    let response = handle(
        &s,
        &buyer_req(
            ids::ROUTE_BUYER_SUBSCRIPTION_CANCEL,
            "/paywall/v1/subscription/cancel",
            json!({"subscriptionId": "  sub_1  "}),
        ),
    )
    .unwrap();

    assert_eq!(response.status, 200);
    assert_eq!(s.http_requests.borrow().len(), 2);
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap()["cancelAtPeriodEnd"],
        true
    );
}

#[test]
fn buyer_cancel_rejects_a_provider_response_for_another_subscription() {
    let s = seams();
    seed_sub(&s);
    configure_buyer_auth(&s, "cus_1");
    s.push_http_response(
        200,
        r#"{"id":"sub_other","customer":"cus_1","status":"active","cancel_at_period_end":true}"#,
    );

    let error = handle(
        &s,
        &buyer_req(
            ids::ROUTE_BUYER_SUBSCRIPTION_CANCEL,
            "/paywall/v1/subscription/cancel",
            json!({"subscriptionId": "sub_1"}),
        ),
    )
    .unwrap_err();

    assert_eq!(error.status, 409);
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap()["cancelAtPeriodEnd"],
        false
    );
}

#[test]
fn buyer_cannot_cancel_another_customers_subscription() {
    let s = seams();
    seed_sub(&s);
    configure_buyer_auth(&s, "other-customer");

    let error = handle(
        &s,
        &buyer_req(
            ids::ROUTE_BUYER_SUBSCRIPTION_CANCEL,
            "/paywall/v1/subscription/cancel",
            json!({"subscriptionId": "sub_1"}),
        ),
    )
    .unwrap_err();

    assert_eq!(error.status, 404);
    assert_eq!(s.http_requests.borrow().len(), 1);
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap()["cancelAtPeriodEnd"],
        false
    );
}

#[test]
fn create_calls_stripe_and_records_subscription() {
    let s = seams();
    s.push_http_response(
            200,
            r#"{"id":"sub_1","customer":"cus_1","status":"active","current_period_end":1750000000,"cancel_at_period_end":false,"items":{"data":[{"price":{"id":"price_1"}}]}}"#,
        );
    let resp = handle(
        &s,
        &post(
            "/subscription/v1/create",
            json!({ "customerRef": "cus_1", "priceId": "price_1" }),
        ),
    )
    .unwrap();
    assert_eq!(resp.status, 201);
    let body: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(body["subscriptionId"], "sub_1");
    assert_eq!(body["status"], "active");
    // record persisted + egress hit Stripe subscriptions
    assert!(s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").is_some());
    assert_eq!(
        s.http_requests.borrow()[0]["url"],
        "https://api.stripe.com/v1/subscriptions"
    );
    let crm = s.crm_events.borrow();
    assert_eq!(crm.len(), 1);
    assert_eq!(crm[0].2, ids::CRM_EVENT_SUBSCRIPTION_CREATED);
    assert_eq!(crm[0].3["customerId"], "cus_1");
    assert_eq!(crm[0].3["subscriptionRef"], "sub_1");
    // New-subscriber analytics signal; price_id is a plan id, never the buyer.
    assert_eq!(s.event_count(ids::EVENT_SUBSCRIPTION_STARTED), 1);
    let started = event_payload(&s, ids::EVENT_SUBSCRIPTION_STARTED);
    assert_eq!(started["flow"], "subscription");
    assert_eq!(started["price_id"], "price_1");
    assert_eq!(started["status"], "active");
    assert!(!started.to_string().contains("cus_1"));
}

#[test]
fn create_rejects_a_provider_response_without_the_requested_price() {
    let s = seams();
    s.push_http_response(
        200,
        r#"{"id":"sub_unbound","customer":"cus_1","status":"active","current_period_end":1750000000,"cancel_at_period_end":false}"#,
    );

    let error = handle(
        &s,
        &post(
            "/subscription/v1/create",
            json!({ "customerRef": "cus_1", "priceId": "price_1" }),
        ),
    )
    .unwrap_err();

    assert_eq!(error.status, 409);
    assert!(s
        .get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_unbound")
        .is_none());
}

#[test]
fn completed_subscription_create_replays_without_provider_egress() {
    let s = seams();
    s.push_http_response(
        200,
        r#"{"id":"sub_replay","customer":"cus_1","status":"active","current_period_end":1750000000,"cancel_at_period_end":false,"items":{"data":[{"price":{"id":"price_1"}}]}}"#,
    );
    let request = post(
        "/subscription/v1/create",
        json!({ "customerRef": "cus_1", "priceId": "price_1" }),
    );
    assert_eq!(handle(&s, &request).unwrap().status, 201);

    let replay = handle(&s, &request).unwrap();

    assert_eq!(replay.status, 201);
    assert_eq!(s.http_requests.borrow().len(), 1);
    assert_eq!(
        serde_json::from_str::<Value>(&replay.body).unwrap()["subscriptionId"],
        "sub_replay"
    );
}

#[test]
fn ambiguous_subscription_create_recovers_without_a_second_post_after_retry_horizon() {
    let s = seams();
    let request = post(
        "/subscription/v1/create",
        json!({ "customerRef": "cus_1", "priceId": "price_1" }),
    );
    s.push_http_response(
        200,
        r#"{"id":"sub_recovered","customer":"cus_1","status":"active","current_period_end":1750000000,"cancel_at_period_end":false,"items":{"data":[{"price":{"id":"price_1"}}]}}"#,
    );
    s.fail_guarded_commit_after_next_http();
    assert!(handle(&s, &request).is_err());
    let operation_digest = crate::routes::checkout_claim::fingerprint(&json!({
        "schemaVersion": 1,
        "operation": "create",
        "identity": "subscription-test-attempt",
    }))
    .unwrap();
    let operation_ref = s
        .get_entry(
            ids::MODEL_SUBSCRIPTIONS,
            &format!("op:create:{operation_digest}"),
        )
        .unwrap()["fingerprint"]
        .as_str()
        .unwrap()
        .to_string();
    s.set_now(
        crate::time::parse_iso("2026-05-31T12:00:00Z").unwrap()
            + crate::checkout_contract::PROVIDER_IDEMPOTENCY_SECONDS,
    );
    s.push_http_response(
        200,
        &json!({
            "has_more": false,
            "data": [{
                "id": "sub_recovered",
                "customer": "cus_1",
                "status": "active",
                "current_period_end": 1750000000_i64,
                "cancel_at_period_end": false,
                "metadata": {"cedros_pay_operation": operation_ref},
                "items": {"data": [{"price": {"id": "price_1"}}]}
            }]
        })
        .to_string(),
    );

    let recovered = handle(&s, &request).unwrap();

    assert_eq!(recovered.status, 201);
    assert!(s
        .get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_recovered")
        .is_some());
    let requests = s.http_requests.borrow();
    assert_eq!(requests.len(), 2);
    assert_eq!(requests[0]["method"], "POST");
    assert_eq!(requests[1]["method"], "GET");
    assert!(requests[1]["url"]
        .as_str()
        .unwrap()
        .contains("/v1/subscriptions?"));
}

#[test]
fn status_reads_the_record() {
    let s = seams();
    s.seed(
            ids::MODEL_SUBSCRIPTIONS,
            "sub_9",
            json!({ "subscriptionId": "sub_9", "customerRef": "cus_1", "priceId": "p", "status": "active",
                    "provider": "stripe", "providerRef": "sub_2", "cancelAtPeriodEnd": false, "createdAt": "2026-05-31T00:00:00Z", "updatedAt": "2026-05-31T00:00:00Z" }),
        );
    let req = get_status("sub_9");
    let resp = handle(&s, &req).unwrap();
    assert_eq!(resp.status, 200);
    assert_eq!(
        serde_json::from_str::<Value>(&resp.body).unwrap()["status"],
        "active"
    );
}

#[test]
fn cancel_updates_status() {
    let s = seams();
    s.seed(
            ids::MODEL_SUBSCRIPTIONS,
            "sub_2",
            json!({ "subscriptionId": "sub_2", "customerRef": "cus_1", "priceId": "p", "status": "active",
                    "provider": "stripe", "providerRef": "sub_2", "cancelAtPeriodEnd": false, "createdAt": "x", "updatedAt": "x" }),
        );
    s.push_http_response(
        200,
        r#"{"id":"sub_2","customer":"cus_1","status":"active","cancel_at_period_end":true}"#,
    );
    let resp = handle(
        &s,
        &post(
            "/subscription/v1/cancel",
            json!({ "subscriptionId": "sub_2" }),
        ),
    )
    .unwrap();
    assert_eq!(resp.status, 200);
    assert_eq!(
        serde_json::from_str::<Value>(&resp.body).unwrap()["cancelAtPeriodEnd"],
        true
    );
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_2").unwrap()["cancelAtPeriodEnd"],
        true
    );
    let crm = s.crm_events.borrow();
    assert_eq!(crm.len(), 1);
    assert_eq!(crm[0].2, ids::CRM_EVENT_SUBSCRIPTION_CANCELED);
    assert_eq!(crm[0].3["customerId"], "cus_1");
    assert_eq!(crm[0].3["subscriptionRef"], "sub_2");
    // Churn analytics signal.
    assert_eq!(s.event_count(ids::EVENT_SUBSCRIPTION_CANCELED), 1);
    let canceled = event_payload(&s, ids::EVENT_SUBSCRIPTION_CANCELED);
    assert_eq!(canceled["flow"], "subscription");
    assert_eq!(canceled["price_id"], "p");
}

#[test]
fn status_unknown_is_404_and_unconfigured_is_503() {
    let s = seams();
    let req = get_status("nope");
    assert_eq!(handle(&s, &req).unwrap_err().status, 404);

    let bare = FakeSeams::new(); // no stripe key
    bare.set_secret(ids::SECRET_RP_TOKEN, "rp_test");
    assert_eq!(
        handle(
            &bare,
            &post(
                "/subscription/v1/create",
                json!({ "customerRef": "cus_1", "priceId": "p" })
            )
        )
        .unwrap_err()
        .status,
        503
    );
}

#[test]
fn create_rejects_another_customers_subscription_without_projection_or_events() {
    let s = seams();
    s.push_http_response(200, r#"{"id":"sub_wrong","customer":"cus_victim","status":"active","items":{"data":[{"price":{"id":"price_1"}}]}}"#);
    let error = handle(
        &s,
        &post(
            "/subscription/v1/create",
            json!({"customerRef":"cus_1","priceId":"price_1"}),
        ),
    )
    .unwrap_err();
    assert_eq!(error.status, 409);
    assert!(s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_wrong").is_none());
    assert!(s.events.borrow().is_empty());
}

#[test]
fn cancellation_preserves_buyer_binding_and_rejects_foreign_provider_customer() {
    for customer in ["cus_1", "cus_victim"] {
        let s = seams();
        seed_sub_with_identities(&s, "cus_1", Some("buyer-1"), Some("buyer-1"));
        configure_buyer_auth(&s, "buyer-1");
        s.push_http_response(200, &json!({"id":"sub_1","customer":customer,"status":"active","cancel_at_period_end":true}).to_string());
        let result = handle(
            &s,
            &buyer_req(
                ids::ROUTE_BUYER_SUBSCRIPTION_CANCEL,
                "/paywall/v1/subscription/cancel",
                json!({"subscriptionId":"sub_1"}),
            ),
        );
        if customer == "cus_1" {
            assert_eq!(result.unwrap().status, 200);
        } else {
            assert_eq!(result.unwrap_err().status, 409);
        }
        let stored = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap();
        assert_eq!(stored["userId"], "buyer-1");
        assert_eq!(stored["cedrosLoginUserId"], "buyer-1");
        assert_eq!(stored["cancelAtPeriodEnd"], customer == "cus_1");
    }
}

#[test]
fn non_stripe_or_misbound_subscription_cannot_reach_stripe() {
    for (field, value) in [
        ("provider", "x402"),
        ("providerRef", "sub_victim"),
        ("subscriptionId", "sub_victim"),
        ("customerRef", "not-a-stripe-customer"),
    ] {
        for path in ["/subscription/v1/cancel", "/subscription/v1/portal"] {
            let s = seams();
            seed_sub(&s);
            let mut row = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap();
            row[field] = json!(value);
            s.seed(ids::MODEL_SUBSCRIPTIONS, "sub_1", row);
            let error = handle(
                &s,
                &post(
                    path,
                    json!({"subscriptionId":"sub_1","returnUrl":"https://site.example/account"}),
                ),
            )
            .unwrap_err();
            assert_eq!(error.status, 409);
            assert!(s.http_requests.borrow().is_empty());
        }
    }
}

#[test]
fn subscription_provider_errors_are_not_returned_to_callers() {
    let s = seams();
    s.push_http_response(400, r#"{"error":{"message":"secret-provider-diagnostic"}}"#);
    let error = handle(
        &s,
        &post(
            "/subscription/v1/create",
            json!({"customerRef":"cus_1","priceId":"price_1"}),
        ),
    )
    .unwrap_err();
    assert_eq!(error.status, 402);
    assert!(!error
        .into_response()
        .body
        .contains("secret-provider-diagnostic"));
}

#[test]
fn subscription_provider_keys_are_site_scoped_and_legacy_claims_never_repost() {
    let mut keys = Vec::new();
    let mut provider_bodies = Vec::new();
    for site in ["site-a", "site-b"] {
        let s = seams();
        let mut req = post(
            "/subscription/v1/create",
            json!({"customerRef":"cus_1","priceId":"price_1"}),
        );
        req.context_json = json!({"siteId":site,"idempotencyKey":"same-attempt"}).to_string();
        s.push_http_error("lost response");
        assert!(handle(&s, &req).is_err());
        provider_bodies.push(s.http_requests.borrow()[0]["body"].clone());
        let headers = s.http_requests.borrow()[0]["headers"]
            .as_array()
            .unwrap()
            .clone();
        keys.push(headers.iter().find(|h| h[0] == "idempotency-key").unwrap()[1].clone());
    }
    assert_ne!(keys[0], keys[1]);
    assert_ne!(
        provider_bodies[0], provider_bodies[1],
        "provider recovery metadata must also bind the site"
    );
    let s = seams();
    crate::routes::subscription_store::claim(
        &Db::new(&s, ids::DB_ACCESS),
        "create",
        "subscription-test-attempt",
        json!({"customerRef":"cus_1","priceId":"price_1"}),
        s.now_unix_secs(),
    )
    .unwrap();
    let error = handle(
        &s,
        &post(
            "/subscription/v1/create",
            json!({"customerRef":"cus_1","priceId":"price_1"}),
        ),
    )
    .unwrap_err();
    assert_eq!(error.status, 409);
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn malformed_strong_buyer_identity_cannot_fall_back_to_customer_ref() {
    for identity in [Value::Null, json!(42), json!(" ")] {
        let s = seams();
        seed_sub(&s);
        configure_buyer_auth(&s, "cus_1");
        let mut row = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap();
        row["userId"] = identity;
        s.seed(ids::MODEL_SUBSCRIPTIONS, "sub_1", row);
        let result = handle(
            &s,
            &buyer_req(
                ids::ROUTE_BUYER_SUBSCRIPTION_PORTAL,
                "/paywall/v1/subscription/portal",
                json!({"subscriptionId":"sub_1","returnUrl":"https://site.example/account"}),
            ),
        );
        assert_eq!(result.unwrap_err().status, 404);
        assert_eq!(s.http_requests.borrow().len(), 1);
    }
}

#[test]
fn buyer_portal_uses_provider_customer_separately_from_cedros_subject() {
    let s = seams();
    seed_sub_with_identities(&s, "cedros-buyer", None, None);
    let mut row = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_1").unwrap();
    row["stripeCustomerId"] = json!("cus_provider");
    s.seed(ids::MODEL_SUBSCRIPTIONS, "sub_1", row);
    configure_buyer_auth(&s, "cedros-buyer");
    s.push_http_response(200, r#"{"data":[],"has_more":false}"#);
    s.push_http_response(
        200,
        r#"{"url":"https://billing.stripe.com/p/session/buyer"}"#,
    );
    let response = handle(
        &s,
        &buyer_req(
            ids::ROUTE_BUYER_SUBSCRIPTION_PORTAL,
            "/paywall/v1/subscription/portal",
            json!({"subscriptionId":"sub_1","returnUrl":"https://app.example.com/billing"}),
        ),
    )
    .unwrap();
    assert_eq!(response.status, 200);
    let requests = s.http_requests.borrow();
    assert!(requests[2]["body"]
        .as_str()
        .unwrap()
        .contains("customer=cus_provider"));
    assert!(!requests[2]["body"]
        .as_str()
        .unwrap()
        .contains("cedros-buyer"));
}

#[path = "subscription_portal_discount_tests.rs"]
mod portal_discount_tests;
