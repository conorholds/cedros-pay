use super::*;
use crate::fake::FakeSeams;
use serde_json::{json, Value};

fn req(body: Value) -> RouteRequest {
    route_req(ids::ROUTE_PAYWALL, "/paywall/v1/checkout", body)
}

fn route_req(route_id: &str, path: &str, body: Value) -> RouteRequest {
    RouteRequest {
        route_id: route_id.into(),
        method: "POST".into(),
        path: path.into(),
        headers: vec![("authorization".into(), "Bearer rp_test".into())],
        body: body.to_string(),
        context_json: json!({ "siteId":"site-a","idempotencyKey": "idem-1" }).to_string(),
        ..Default::default()
    }
}

fn seams() -> FakeSeams {
    let s = FakeSeams::new();
    s.set_secret(ids::SECRET_RP_TOKEN, "rp_test");
    s
}

#[test]
fn rejects_missing_relying_party_auth() {
    let s = seams();
    let mut r = req(json!({ "amountCents": 1000, "reference": "ord_1" }));
    r.headers.clear();
    let err = handle(&s, &r).unwrap_err();
    assert_eq!(err.status, 401);
}

#[test]
fn unconfigured_payments_503() {
    let s = seams();
    let err = handle(
        &s,
        &req(json!({ "amountCents": 1000, "reference": "ord_1" })),
    )
    .unwrap_err();
    assert_eq!(err.status, 503);
}

#[test]
fn creates_intent_and_records_pending_ledger() {
    let s = seams();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    s.push_http_response(
        200,
        r#"{"id":"pi_1","status":"requires_payment_method","client_secret":"pi_1_secret","amount":1999,"currency":"usd"}"#,
    );
    let resp = handle(&s, &req(json!({ "amountCents": 1999, "currency": "usd", "reference": "ord_1", "profileId": "p1" }))).unwrap();
    assert_eq!(resp.status, 201);
    let body: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(body["paymentIntentId"], "pi_1");
    // pending ledger row recorded
    let entry = s.get_entry(ids::MODEL_LEDGER, "ord_1").unwrap();
    assert_eq!(entry["status"], "pending");
    assert_eq!(entry["providerRef"], "pi_1");
    // egress hit Stripe with our idempotency key
    let http_req = &s.http_requests.borrow()[0];
    assert_eq!(http_req["url"], "https://api.stripe.com/v1/payment_intents");
}

#[test]
fn surfaces_stripe_decline_as_402() {
    let s = seams();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    s.push_http_response(
        402,
        r#"{"error":{"message":"Your card was declined.","type":"card_error"}}"#,
    );
    let err = handle(
        &s,
        &req(json!({ "amountCents": 1000, "reference": "ord_2" })),
    )
    .unwrap_err();
    assert_eq!(err.status, 402);
    // no ledger row on failure
    assert!(s.get_entry(ids::MODEL_LEDGER, "ord_2").is_none());
}

#[test]
fn rejects_bad_input() {
    let s = seams();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    assert_eq!(
        handle(&s, &req(json!({ "amountCents": -5, "reference": "x" })))
            .unwrap_err()
            .status,
        422
    );
}

#[test]
fn rejects_invalid_host_idempotency_key_before_provider_egress() {
    let s = seams();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    let mut request = req(json!({ "amountCents": 1000, "reference": "ord_invalid_key" }));
    request.context_json = json!({ "siteId":"site-a","idempotencyKey": " invalid" }).to_string();

    assert_eq!(handle(&s, &request).unwrap_err().status, 400);
    assert!(s.http_requests.borrow().is_empty());
    assert!(s.get_entry(ids::MODEL_LEDGER, "ord_invalid_key").is_none());
}

#[test]
fn derives_a_bounded_stable_provider_key_from_the_payment_reference() {
    let s = seams();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    s.push_http_response(
        200,
        r#"{"id":"pi_derived","status":"requires_payment_method","client_secret":"secret","amount":1000,"currency":"usd"}"#,
    );
    let mut request = req(json!({ "amountCents": 1000, "reference": "ord_derived" }));
    request.context_json = json!({"siteId":"site-a"}).to_string();

    assert_eq!(handle(&s, &request).unwrap().status, 201);
    let key = s.http_requests.borrow()[0]["headers"]
        .as_array()
        .unwrap()
        .iter()
        .find(|header| header[0] == "idempotency-key")
        .unwrap()[1]
        .as_str()
        .unwrap()
        .to_string();
    assert!(key.starts_with("cp:"));
    assert_eq!(
        key.len(),
        crate::checkout_contract::MAX_IDEMPOTENCY_KEY_LENGTH
    );
}

#[test]
fn indeterminate_5xx_retains_claim_and_exact_retry_reuses_idempotency() {
    let s = seams();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    let request = req(json!({ "amountCents": 1000, "reference": "ord_retry" }));
    s.push_http_response(500, r#"{"error":{"message":"temporary"}}"#);

    assert_eq!(handle(&s, &request).unwrap_err().status, 502);
    let claimed = s.get_entry(ids::MODEL_LEDGER, "ord_retry").unwrap();
    assert_eq!(claimed["status"], "initiating");
    assert!(claimed.get("checkoutClaim").is_some());

    s.push_http_response(
        200,
        r#"{"id":"pi_retry","status":"requires_payment_method","client_secret":"secret","amount":1000,"currency":"usd"}"#,
    );
    assert_eq!(handle(&s, &request).unwrap().status, 201);
    let requests = s.http_requests.borrow();
    assert_eq!(requests.len(), 2);
    for request in requests.iter() {
        assert!(request["headers"]
            .as_array()
            .unwrap()
            .iter()
            .any(|header| header[0] == "idempotency-key"
                && header[1]
                    == crate::routes::checkout_claim::scoped_provider_key(
                        &crate::ctx::RequestContext::parse(r#"{"siteId":"site-a"}"#),
                        "paywall_request",
                        "idem-1"
                    )
                    .unwrap()));
    }
}

#[test]
fn malformed_provider_response_retains_durable_claim() {
    let s = seams();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    s.push_http_response(200, "<html>upstream failure</html>");

    let error = handle(
        &s,
        &req(json!({ "amountCents": 1000, "reference": "ord_malformed" })),
    )
    .unwrap_err();

    assert_eq!(error.status, 502);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_malformed").unwrap()["status"],
        "initiating"
    );
}

#[test]
fn provider_response_without_money_binding_never_completes_the_claim() {
    let s = seams();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    s.push_http_response(
        200,
        r#"{"id":"pi_unbound","status":"requires_payment_method","client_secret":"secret"}"#,
    );

    let error = handle(
        &s,
        &req(json!({ "amountCents": 1000, "reference": "ord_unbound" })),
    )
    .unwrap_err();

    assert_eq!(error.status, 502);
    let claim = s.get_entry(ids::MODEL_LEDGER, "ord_unbound").unwrap();
    assert_eq!(claim["status"], "initiating");
    assert!(claim["providerRef"].is_null());
}

#[test]
fn changed_facts_conflict_before_retrying_provider() {
    let s = seams();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    s.push_http_response(500, r#"{"error":{"message":"temporary"}}"#);
    let first = req(json!({ "amountCents": 1000, "reference": "ord_facts" }));
    assert_eq!(handle(&s, &first).unwrap_err().status, 502);

    let changed = req(json!({ "amountCents": 1001, "reference": "ord_facts" }));
    assert_eq!(handle(&s, &changed).unwrap_err().status, 409);
    assert_eq!(s.http_requests.borrow().len(), 1);
}

#[test]
fn exact_retry_preserves_refunded_state_claim_and_unknown_fields() {
    let s = seams();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    let response = r#"{"id":"pi_terminal","status":"requires_payment_method","client_secret":"secret","amount":1000,"currency":"usd"}"#;
    let request = req(json!({ "amountCents": 1000, "reference": "ord_terminal" }));
    s.push_http_response(200, response);
    assert_eq!(handle(&s, &request).unwrap().status, 201);
    let mut stored = s.get_entry(ids::MODEL_LEDGER, "ord_terminal").unwrap();
    stored["status"] = json!("refunded");
    stored["refundCents"] = json!(1000);
    stored["extensionMetadata"] = json!({ "keep": true });
    s.seed(ids::MODEL_LEDGER, "ord_terminal", stored);
    s.push_http_response(200, response);

    assert_eq!(handle(&s, &request).unwrap().status, 201);
    let retried = s.get_entry(ids::MODEL_LEDGER, "ord_terminal").unwrap();
    assert_eq!(retried["status"], "refunded");
    assert_eq!(retried["refundCents"], 1000);
    assert_eq!(retried["extensionMetadata"]["keep"], true);
    assert!(retried.get("checkoutClaim").is_some());
}

#[test]
fn completed_payment_intent_replay_retrieves_instead_of_creating_again() {
    let s = seams();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    let request = req(json!({ "amountCents": 1000, "reference": "ord_bound" }));
    s.push_http_response(
        200,
        r#"{"id":"pi_bound","status":"requires_payment_method","client_secret":"secret","amount":1000,"currency":"usd"}"#,
    );
    assert_eq!(handle(&s, &request).unwrap().status, 201);
    s.push_http_response(
        200,
        r#"{"id":"pi_bound","status":"requires_payment_method","client_secret":"secret","amount":1000,"currency":"usd"}"#,
    );

    assert_eq!(handle(&s, &request).unwrap().status, 201);

    let requests = s.http_requests.borrow();
    assert_eq!(requests.len(), 2);
    assert_eq!(requests[1]["method"], "GET");
    assert_eq!(
        requests[1]["url"],
        "https://api.stripe.com/v1/payment_intents/pi_bound"
    );
}

#[test]
fn ambiguous_payment_intent_recovers_by_durable_metadata_after_retry_horizon() {
    let s = seams();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    let request = req(json!({ "amountCents": 1000, "reference": "ord_recover" }));
    s.push_http_response(500, r#"{"error":{"message":"response lost"}}"#);
    assert_eq!(handle(&s, &request).unwrap_err().status, 502);
    let operation = s.get_entry(ids::MODEL_LEDGER, "ord_recover").unwrap()["checkoutClaim"]
        ["fingerprint"]
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
                "id": "pi_recovered",
                "status": "requires_payment_method",
                "client_secret": "secret",
                "amount": 1000,
                "currency": "usd",
                "metadata": {"cedros_pay_operation": operation}
            }]
        })
        .to_string(),
    );

    let response = handle(&s, &request).unwrap();

    assert_eq!(response.status, 201);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_recover").unwrap()["providerRef"],
        "pi_recovered"
    );
    let requests = s.http_requests.borrow();
    assert_eq!(requests.len(), 2);
    assert!(requests[1]["url"]
        .as_str()
        .unwrap()
        .starts_with("https://api.stripe.com/v1/payment_intents/search?"));
}

#[test]
fn ambiguous_payment_intent_without_provider_proof_never_reposts_after_retry_horizon() {
    let s = seams();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    let request = req(json!({ "amountCents": 1000, "reference": "ord_unknown" }));
    s.push_http_response(500, r#"{"error":{"message":"response lost"}}"#);
    assert_eq!(handle(&s, &request).unwrap_err().status, 502);
    s.set_now(
        crate::time::parse_iso("2026-05-31T12:00:00Z").unwrap()
            + crate::checkout_contract::PROVIDER_IDEMPOTENCY_SECONDS,
    );
    s.push_http_response(200, r#"{"has_more":false,"data":[]}"#);

    assert_eq!(handle(&s, &request).unwrap_err().status, 409);
    assert_eq!(s.http_requests.borrow().len(), 2);
    assert!(s.http_requests.borrow()[1]["url"]
        .as_str()
        .unwrap()
        .contains("/payment_intents/search?"));
}
