use serde_json::{json, Value};

use super::test_support::*;
use super::*;

const POLICY_KEY: &str = crate::regional_payment_policy::SETTING_KEY;

fn set_policy(seams: &crate::fake::FakeSeams, us_methods: Value) {
    seams.set_setting(
        POLICY_KEY,
        &json!({
            "schemaVersion": 1,
            "enabled": true,
            "fallbackMethods": ["x402"],
            "rules": [{
                "id": "us",
                "label": "United States",
                "countries": ["US"],
                "methods": us_methods
            }]
        })
        .to_string(),
    );
}

fn with_country(
    mut request: crate::reqresp::RouteRequest,
    country: &str,
) -> crate::reqresp::RouteRequest {
    let mut context: Value = serde_json::from_str(&request.context_json).unwrap();
    context["marketCountry"] = json!(country);
    request.context_json = context.to_string();
    request
}

#[test]
fn quote_accepts_configured_region_and_rejects_fallback_stripe() {
    let seams = setup();
    set_policy(&seams, json!(["stripe", "x402"]));

    queue_auth(&seams, "buyer-1");
    let allowed = with_country(
        request(
            ROUTE_QUOTE,
            "POST",
            "/checkout/quote",
            quote_body("us-quote", json!(["stripe"])),
            Some("us-quote"),
            "site-a",
        ),
        "us",
    );
    assert_eq!(
        ok_json(handle(&seams, &allowed).unwrap())["quote"]["requestedPaymentMethods"],
        json!(["stripe"])
    );

    queue_auth(&seams, "buyer-1");
    let denied = with_country(
        request(
            ROUTE_QUOTE,
            "POST",
            "/checkout/quote",
            quote_body("jp-quote", json!(["stripe"])),
            Some("jp-quote"),
            "site-a",
        ),
        "JP",
    );
    let error = handle(&seams, &denied).unwrap_err();
    assert_eq!(
        (error.status, error.code),
        (409, "payment_method_unavailable_in_region")
    );
}

#[test]
fn quote_rejects_every_method_for_an_explicitly_blocked_region() {
    let seams = setup();
    set_policy(&seams, json!([]));
    queue_auth(&seams, "buyer-1");
    let blocked = with_country(
        request(
            ROUTE_QUOTE,
            "POST",
            "/checkout/quote",
            quote_body("blocked-quote", json!(["x402"])),
            Some("blocked-quote"),
            "site-a",
        ),
        "US",
    );

    let error = handle(&seams, &blocked).unwrap_err();
    assert_eq!(
        (error.status, error.code),
        (409, "payment_method_unavailable_in_region")
    );
    assert!(seams.provider_requests.borrow().is_empty());
}

#[test]
fn checkout_requires_requote_after_policy_change() {
    let seams = setup();
    set_policy(&seams, json!(["stripe", "x402"]));
    queue_auth(&seams, "buyer-1");
    let quote_request = with_country(
        request(
            ROUTE_QUOTE,
            "POST",
            "/checkout/quote",
            quote_body("bound-quote", json!(["stripe"])),
            Some("bound-quote"),
            "site-a",
        ),
        "US",
    );
    let quote = ok_json(handle(&seams, &quote_request).unwrap());

    set_policy(&seams, json!(["x402"]));
    queue_auth(&seams, "buyer-1");
    let checkout = with_country(
        request(
            ROUTE_CREATE,
            "POST",
            "/checkout",
            checkout_body(
                "bound-checkout",
                quote["operationId"].as_str().unwrap(),
                "stripe",
                None,
            ),
            Some("bound-checkout"),
            "site-a",
        ),
        "US",
    );
    let error = handle(&seams, &checkout).unwrap_err();
    assert_eq!(
        (error.status, error.code),
        (409, "payment_method_unavailable_in_region")
    );
    assert!(seams.provider_requests.borrow().is_empty());
}
