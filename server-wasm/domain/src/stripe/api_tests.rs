use super::*;

fn req() -> PaymentIntentRequest {
    PaymentIntentRequest {
        amount_cents: 1999,
        currency: "USD".to_string(),
        idempotency_key: "idem_123".to_string(),
        metadata: vec![("orderRef".to_string(), "ord 1&2".to_string())],
    }
}

#[test]
fn builds_a_fetch_envelope() {
    let v = build_payment_intent_fetch("sk_test_x", &req());
    assert_eq!(v["method"], "POST");
    assert_eq!(v["url"], "https://api.stripe.com/v1/payment_intents");
    let body = v["body"].as_str().unwrap();
    assert!(body.contains("amount=1999"));
    assert!(body.contains("currency=usd"));
    // reserved chars in metadata are percent-encoded
    assert!(body.contains("metadata%5BorderRef%5D=ord%201%262"));
    assert!(body.contains("metadata%5Bcedros_pay_checkout%5D=true"));
    // secret is in the auth header, never the body
    assert!(!body.contains("sk_test_x"));
    let headers = v["headers"].as_array().unwrap();
    assert!(headers
        .iter()
        .any(|h| h[0] == "idempotency-key" && h[1] == "idem_123"));
}

#[test]
fn parses_success() {
    let body = r#"{"id":"pi_1","status":"requires_payment_method","client_secret":"pi_1_secret"}"#;
    let pi = parse_payment_intent(200, body).unwrap();
    assert_eq!(pi.id, "pi_1");
    assert_eq!(pi.client_secret.as_deref(), Some("pi_1_secret"));
}

#[test]
fn rejects_unusable_client_payment_intent_response() {
    for body in [
        r#"{"id":"not-a-payment-intent","status":"requires_payment_method","client_secret":"secret"}"#,
        r#"{"id":"pi_1","status":"unknown","client_secret":"secret"}"#,
        r#"{"id":"pi_1","status":"requires_action"}"#,
    ] {
        assert!(matches!(
            parse_payment_intent(200, body),
            Err(PaymentIntentFailure::Indeterminate(_))
        ));
    }
}

#[test]
fn surfaces_stripe_error() {
    let body = r#"{"error":{"message":"Your card was declined.","type":"card_error"}}"#;
    assert_eq!(
        parse_payment_intent(402, body),
        Err(PaymentIntentFailure::Definitive(
            "Your card was declined.".to_string()
        ))
    );
}

#[test]
fn rejects_non_json_and_non_2xx() {
    assert!(matches!(
        parse_payment_intent(200, "<html>502</html>"),
        Err(PaymentIntentFailure::Indeterminate(_))
    ));
    assert!(matches!(
        parse_payment_intent(500, r#"{"id":"pi","status":"x"}"#),
        Err(PaymentIntentFailure::Indeterminate(_))
    ));
}

#[test]
fn every_stripe_request_pins_the_api_version() {
    let get = build_retrieve_subscription_fetch("sk_test", "sub_1");
    let post = build_create_subscription_fetch(
        "sk_test",
        &SubscriptionCreate {
            customer_ref: "cus_1".into(),
            price_id: "price_1".into(),
            idempotency_key: "idem_sub".into(),
            operation_ref: "op:create:abc".into(),
        },
    );
    for request in [get, post] {
        let pinned = request["headers"]
            .as_array()
            .unwrap()
            .iter()
            .any(|h| h[0] == "stripe-version" && h[1] == STRIPE_API_VERSION);
        assert!(pinned, "request must pin stripe-version: {request}");
    }
}

#[test]
fn parses_subscription_period_end_from_items_on_basil_shapes() {
    // 2025-03 "Basil" API versions drop top-level current_period_end and carry
    // it on each subscription item instead. The parser must not yield None —
    // entitlement checks fail closed on a missing period end.
    let body = r#"{
        "id": "sub_basil","customer":"cus_1",
        "status": "active",
        "cancel_at_period_end": false,
        "items": { "data": [
            { "id": "si_1", "current_period_end": 1796083200,
              "price": {"id": "price_current"} },
            { "id": "si_2", "current_period_end": 1798761600,
              "price": "price_current" }
        ]}
    }"#;
    let sub = parse_subscription(200, body).unwrap();
    assert_eq!(sub.current_period_end, Some(1_798_761_600));
    assert_eq!(sub.price_id.as_deref(), Some("price_current"));

    // Pre-Basil top-level field still wins when present.
    let classic =
        r#"{"id":"sub_c","customer":"cus_1","status":"active","current_period_end":1700000000}"#;
    assert_eq!(
        parse_subscription(200, classic).unwrap().current_period_end,
        Some(1_700_000_000)
    );
}

#[test]
fn subscription_parser_rejects_provider_identity_and_state_injection() {
    assert!(parse_subscription(
        200,
        r#"{"id":"../refunds/re_1","customer":"cus_1","status":"active","current_period_end":1700000000}"#,
    )
    .is_err());
    assert!(parse_subscription(
        200,
        r#"{"id":"sub_1","customer":"cus_1","status":"attacker_controlled","current_period_end":1700000000}"#,
    )
    .is_err());
    assert!(parse_subscription(
        200,
        r#"{"id":"sub_1","customer":"cus_1","status":"active","items":{"data":[
            {"price":"price_a"},{"price":"price_b"}]}}"#,
    )
    .is_err());
}

#[test]
fn billing_portal_response_cannot_redirect_to_an_untrusted_host() {
    assert_eq!(
        parse_portal_url(200, r#"{"url":"https://billing.stripe.com/p/session/ok"}"#).unwrap(),
        "https://billing.stripe.com/p/session/ok"
    );
    assert!(parse_portal_url(200, r#"{"url":"https://attacker.example/phish"}"#).is_err());
    assert!(parse_portal_url(200, r#"{"url":"https://billing.stripe.com.evil/phish"}"#).is_err());
}

#[test]
fn malformed_fetch_envelopes_cannot_wrap_to_success_or_default_missing_fields() {
    for raw in [
        r#"{"status":65736,"body":"{}"}"#,
        r#"{"status":-1,"body":"{}"}"#,
        r#"{"status":200}"#,
        r#"{"body":"{}"}"#,
        r#"{"status":200,"body":{}}"#,
    ] {
        assert!(unwrap_fetch(raw).is_err(), "{raw}");
    }
    assert_eq!(
        unwrap_fetch(r#"{"status":200,"body":"{}"}"#).unwrap(),
        (200, "{}".into())
    );
}
