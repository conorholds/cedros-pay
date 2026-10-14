use super::*;
use crate::fake::FakeSeams;

fn configure(s: &FakeSeams) {
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_123");
    s.seed(
            ids::MODEL_CATALOG,
            "prod_1",
            json!({ "id": "prod_1", "displayName": "Pro Plan", "price": { "amountCents": 1299, "currency": "USD" } }),
        );
}

fn req(body: Value) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_STRIPE_SESSION.into(),
        method: "POST".into(),
        path: "/paywall/v1/stripe-session".into(),
        body: body.to_string(),
        context_json: r#"{"siteId":"site-a","idempotencyKey":"stripe-attempt-0001"}"#.into(),
        ..Default::default()
    }
}

#[test]
fn requires_a_host_supplied_attempt_identity_before_stripe_egress() {
    let s = FakeSeams::new();
    configure(&s);
    let mut request = req(json!({
        "resource": "prod_1",
        "successUrl": "https://shop.example/success",
        "cancelUrl": "https://shop.example/cancel"
    }));
    request.context_json = "{}".into();

    let error = handle(&s, &request).unwrap_err();

    assert_eq!(
        (error.status, error.message.as_str()),
        (400, "idempotency key required")
    );
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn creates_a_session_and_records_a_pending_ledger_row() {
    let s = FakeSeams::new();
    configure(&s);
    s.push_http_response(
        200,
        r#"{"id":"cs_test_abc","url":"https://checkout.stripe.com/c/pay/cs_test_abc"}"#,
    );
    let resp = handle(
        &s,
        &req(json!({
            "resource": "prod_1",
            "successUrl": "https://shop.example/success",
            "cancelUrl": "https://shop.example/cancel"
        })),
    )
    .unwrap();
    assert_eq!(resp.status, 200);
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["sessionId"], "cs_test_abc");
    assert_eq!(out["url"], "https://checkout.stripe.com/c/pay/cs_test_abc");

    // The Stripe call carried the catalog price + redirect URLs (form-encoded).
    let sent = s.http_requests.borrow()[0]["body"]
        .as_str()
        .unwrap()
        .to_string();
    // The line-item key brackets are percent-encoded (`[`→%5B, `]`→%5D).
    assert!(
        sent.contains("unit_amount%5D=1299"),
        "catalog price, not client"
    );
    assert!(sent.contains("mode=payment"));
    assert!(sent.contains("success_url=https%3A%2F%2Fshop.example%2Fsuccess"));

    // Pending ledger row keyed by the session id.
    let entry = s.get_entry(ids::MODEL_LEDGER, "cs_test_abc").unwrap();
    assert_eq!(entry["status"], "pending");
    assert_eq!(entry["provider"], "stripe");
    assert_eq!(entry["grossCents"], 1299);
    assert_eq!(entry["productId"], "prod_1");
    let operation = s
        .get_entry(ids::MODEL_LEDGER, &operation_key())
        .expect("durable operation receipt");
    assert_eq!(operation["status"], "completed");
    assert_eq!(operation["checkoutResult"]["sessionId"], "cs_test_abc");
}

#[test]
fn completed_session_replay_returns_the_durable_result_without_provider_egress() {
    let s = FakeSeams::new();
    configure(&s);
    s.push_http_response(
        200,
        r#"{"id":"cs_test_replay","url":"https://checkout.stripe.com/c/pay/replay"}"#,
    );
    let request = req(json!({
        "resource": "prod_1",
        "successUrl": "https://shop.example/success",
        "cancelUrl": "https://shop.example/cancel"
    }));

    let first = handle(&s, &request).unwrap();
    let replay = handle(&s, &request).unwrap();

    assert_eq!(replay.body, first.body);
    assert_eq!(s.http_requests.borrow().len(), 1);
}

#[test]
fn unresolved_session_after_provider_window_fails_closed_without_reposting() {
    let s = FakeSeams::new();
    configure(&s);
    let request = req(json!({
        "resource": "prod_1",
        "successUrl": "https://shop.example/success",
        "cancelUrl": "https://shop.example/cancel"
    }));
    s.push_http_error("connection lost after Stripe accepted the request");
    assert_eq!(handle(&s, &request).unwrap_err().status, 500);
    let requests = s.http_requests.borrow().len();
    s.set_now(s.now_unix_secs() + crate::checkout_contract::PROVIDER_IDEMPOTENCY_SECONDS);

    let error = handle(&s, &request).unwrap_err();

    assert_eq!(error.status, 409);
    assert_eq!(s.http_requests.borrow().len(), requests);
}

fn operation_key() -> String {
    let identity = crate::routes::checkout_claim::fingerprint(&json!({
        "schemaVersion": 1,
        "operation": "hosted-product-checkout",
        "idempotencyKey": "stripe-attempt-0001",
    }))
    .unwrap();
    format!("checkout-claim:{identity}")
}

#[test]
fn uses_configured_default_redirect_urls() {
    let s = FakeSeams::new();
    configure(&s);
    s.set_setting("stripe.success_url", "https://site.example/thanks");
    s.set_setting("stripe.cancel_url", "https://site.example/back");
    s.push_http_response(
        200,
        r#"{"id":"cs_1","url":"https://checkout.stripe.com/x"}"#,
    );
    let resp = handle(&s, &req(json!({ "resource": "prod_1" }))).unwrap();
    assert_eq!(resp.status, 200);
    let sent = s.http_requests.borrow()[0]["body"]
        .as_str()
        .unwrap()
        .to_string();
    assert!(sent.contains("success_url=https%3A%2F%2Fsite.example%2Fthanks"));
}

#[test]
fn unconfigured_stripe_is_503() {
    let s = FakeSeams::new();
    s.seed(
        ids::MODEL_CATALOG,
        "prod_1",
        json!({ "id": "prod_1", "price": { "amountCents": 1299 } }),
    );
    let err = handle(
            &s,
            &req(json!({ "resource": "prod_1", "successUrl": "https://a.example", "cancelUrl": "https://b.example" })),
        )
        .unwrap_err();
    assert_eq!(err.status, 503);
}

#[test]
fn unknown_resource_is_404() {
    let s = FakeSeams::new();
    configure(&s);
    let err = handle(
            &s,
            &req(json!({ "resource": "nope", "successUrl": "https://a.example", "cancelUrl": "https://b.example" })),
        )
        .unwrap_err();
    assert_eq!(err.status, 404);
}

#[test]
fn rejects_a_script_scheme_redirect() {
    let s = FakeSeams::new();
    configure(&s);
    let err = handle(
            &s,
            &req(json!({ "resource": "prod_1", "successUrl": "javascript:alert(1)", "cancelUrl": "https://b.example" })),
        )
        .unwrap_err();
    assert_eq!(err.status, 422);
    // Must fail BEFORE any Stripe egress.
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn missing_redirect_urls_is_422() {
    let s = FakeSeams::new();
    configure(&s);
    let err = handle(&s, &req(json!({ "resource": "prod_1" }))).unwrap_err();
    assert_eq!(err.status, 422);
}

#[test]
fn email_validation() {
    assert!(is_plausible_email("buyer@example.com"));
    assert!(!is_plausible_email("nope"));
    assert!(!is_plausible_email("a@b"));
    assert!(!is_plausible_email("a b@example.com"));
}

#[test]
fn lost_response_retry_preserves_every_provider_parameter_after_clock_advances() {
    let s = FakeSeams::new();
    configure(&s);
    let request = req(
        json!({"resource":"prod_1", "successUrl":"https://shop.example/ok", "cancelUrl":"https://shop.example/no"}),
    );
    s.push_http_error("lost response");
    assert!(handle(&s, &request).is_err());
    s.set_now(s.now_unix_secs() + 120);
    s.push_http_response(
        200,
        r#"{"id":"cs_retry","url":"https://checkout.stripe.com/retry"}"#,
    );
    handle(&s, &request).unwrap();
    assert_eq!(s.http_requests.borrow()[0], s.http_requests.borrow()[1]);
}

#[test]
fn buyer_metadata_cannot_override_correlation_or_customer_identity() {
    let s = FakeSeams::new();
    configure(&s);
    s.push_http_response(
        200,
        r#"{"id":"cs_meta","url":"https://checkout.stripe.com/meta"}"#,
    );
    handle(&s, &req(json!({"resource":"prod_1", "successUrl":"https://shop.example/ok", "cancelUrl":"https://shop.example/no",
        "metadata":{"resource":"cart_victim", "profileId":"victim", "reference":"victim_order", "campaign":"spring"}}))).unwrap();
    let requests = s.http_requests.borrow();
    let body = requests[0]["body"].as_str().unwrap();
    assert!(body.contains("metadata%5Bresource%5D=prod_1"));
    assert!(!body.contains("metadata%5Bresource%5D=cart_victim"));
    assert!(!body.contains("metadata%5BprofileId%5D=victim"));
    assert!(!body.contains("metadata%5Breference%5D=victim_order"));
    assert!(body.contains("metadata%5Bcustom_campaign%5D=spring"));
}
