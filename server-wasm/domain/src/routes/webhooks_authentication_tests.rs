use super::webhooks_test_support::*;
use crate::{ids, reqresp::RouteRequest};
use serde_json::{json, Value};

const TOKEN: &str = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
fn setup() -> crate::fake::FakeSeams {
    let s = seams();
    s.set_secret(ids::SECRET_STRIPE_WEBHOOK_TOKEN, TOKEN);
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_fixture");
    seed_pending(&s, "ord_1", "pi_1", 5000, "p1");
    s
}
fn request() -> RouteRequest {
    RouteRequest { method: "POST".into(), path: "/webhook/stripe".into(),
        body: json!({"id":"evt_real", "type":"payment_intent.succeeded", "data":{"object":{"amount":1}}}).to_string(),
        query: vec![("token".into(), TOKEN.into())], ..Default::default() }
}
fn event() -> Value {
    let mut event: Value =
        serde_json::from_str(&pi_succeeded("evt_real", "ord_1", "pi_1", 5000, "p1")).unwrap();
    event["object"] = json!("event");
    event["api_version"] = json!(crate::stripe::api::STRIPE_API_VERSION);
    event["livemode"] = json!(false);
    event["created"] = json!(1800000000);
    event
}

#[test]
fn json_only_host_uses_stripe_event_and_deduplicates_changing_delivery_counter() {
    let s = setup();
    let mut provider = event();
    provider["pending_webhooks"] = json!(2);
    provider["api_version"] = json!("2026-08-26.dahlia");
    s.push_http_response(200, &provider.to_string());
    assert_eq!(invoke(&s, request()).status, 200);
    assert_eq!(
        s.get_entry(ids::MODEL_LEDGER, "ord_1").unwrap()["status"],
        "succeeded"
    );
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    provider["pending_webhooks"] = json!(0);
    s.push_http_response(200, &provider.to_string());
    assert_eq!(invoke(&s, request()).status, 200);
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    let requests = s.http_requests.borrow();
    assert_eq!(
        requests[0]["url"],
        "https://api.stripe.com/v1/events/evt_real"
    );
    assert_eq!(requests[0]["method"], "GET");
}

#[test]
fn invalid_or_ambiguous_ingress_token_never_calls_stripe() {
    for supplied in [
        vec![],
        vec![("token".into(), "wrong".into())],
        vec![
            ("token".into(), TOKEN.into()),
            ("token".into(), TOKEN.into()),
        ],
    ] {
        let s = setup();
        let mut request = request();
        request.query = supplied;
        assert_eq!(invoke(&s, request).status, 401);
        assert!(s.http_requests.borrow().is_empty());
    }
}

#[test]
fn forged_provider_identity_mode_version_and_account_are_rejected() {
    for (field, value) in [
        ("id", json!("evt_other")),
        ("livemode", json!(true)),
        ("api_version", Value::Null),
        ("account", json!("acct_foreign")),
        ("context", json!("organization")),
        ("created", Value::Null),
    ] {
        let s = setup();
        let mut provider = event();
        provider[field] = value;
        s.push_http_response(200, &provider.to_string());
        assert_eq!(invoke(&s, request()).status, 502, "{field}");
        assert_eq!(
            s.get_entry(ids::MODEL_LEDGER, "ord_1").unwrap()["status"],
            "pending"
        );
        assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
    }
}

#[test]
fn event_hint_cannot_inject_provider_path_or_supply_success_on_api_failure() {
    let s = setup();
    let mut request = request();
    request.body = json!({"id":"evt_x/../customers"}).to_string();
    assert_eq!(invoke(&s, request).status, 400);
    assert!(s.http_requests.borrow().is_empty());
    for status in [404, 429, 500] {
        s.push_http_response(status, &event().to_string());
        assert_eq!(invoke(&s, self::request()).status, 502);
        assert_eq!(
            s.get_entry(ids::MODEL_LEDGER, "ord_1").unwrap()["status"],
            "pending"
        );
    }
}

#[test]
fn success_event_requires_succeeded_and_fully_received_amount() {
    for (status, received) in [
        ("requires_action", 5000),
        ("processing", 5000),
        ("requires_capture", 5000),
        ("succeeded", 4999),
    ] {
        let s = setup();
        let mut provider = event();
        provider["data"]["object"]["status"] = json!(status);
        provider["data"]["object"]["amount_received"] = json!(received);
        s.push_http_response(200, &provider.to_string());
        assert_eq!(invoke(&s, request()).status, 403);
        assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
    }
}

#[test]
fn disputes_from_another_site_do_not_create_records_or_customer_effects() {
    let s = seams();
    let body = json!({"id":"evt_foreign", "type":"charge.dispute.created", "data":{"object":{
        "id":"dp_foreign", "payment_intent":"pi_another_site", "amount":5000,
        "currency":"usd", "status":"needs_response", "metadata":{"customerId":"victim"}
    }}})
    .to_string();
    s.push_http_response(200, r#"{"object":"list","data":[],"has_more":false}"#);
    assert_eq!(
        invoke(&s, stripe_request(&s, &body)).status,
        200
    );
    assert!(s.get_entry(ids::MODEL_LEDGER, "dp_foreign").is_none());
    assert!(s.crm_events.borrow().is_empty());
    assert_eq!(s.event_count(ids::EVENT_DISPUTE_OPENED), 0);
}

#[test]
fn checkout_payment_intents_leave_settlement_to_the_session_owner() {
    for kind in ["payment_intent.succeeded", "payment_intent.payment_failed"] {
        for metadata in [
            json!({"cedros_pay_checkout":"true", "cedros_pay_operation_id":"operation"}),
            json!({"cedros_pay_checkout":"true", "resource":"prod_1"}),
        ] {
            let s = seams();
            let event = json!({"id":"evt_checkout_pi", "type":kind, "data":{"object":{
                "id":"pi_checkout", "status":"succeeded", "amount":5000, "amount_received":5000,
                "currency":"usd", "metadata":metadata
            }}})
            .to_string();
            assert_eq!(
                invoke(&s, stripe_request(&s, &event)).status,
                200
            );
            assert_eq!(s.entry_count(ids::MODEL_LEDGER), 0);
            assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
        }
    }
}
