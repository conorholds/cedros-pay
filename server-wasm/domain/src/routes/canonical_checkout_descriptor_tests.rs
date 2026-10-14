use super::test_support::*;
use super::*;

#[test]
fn descriptor_is_authenticated_exact_and_buyer_independent() {
    let seams = setup();
    let first = descriptor(&seams, "buyer-a");
    let second = descriptor(&seams, "buyer-b");
    assert_eq!(first, second);
    assert_eq!(first["protocol"], "cedros-pay-checkout");
    assert_eq!(first["replayTtlMs"], 259_200_000_i64);
    assert_eq!(first["acceptsExternalIdempotencyKey"], true);
    assert_eq!(first["maxIdempotencyKeyLength"], 67);
    assert_eq!(first["idempotencyKeyCharacterSet"], "ascii-visible");
    assert_eq!(
        first["operationScopes"],
        serde_json::json!({
            "quote": "cedros-pay-checkout:quote",
            "checkout": "cedros-pay-checkout:checkout"
        })
    );
    let scope = first["providerScope"].as_str().unwrap();
    assert!(scope.starts_with("checkout-provider:"));
    assert_eq!(scope.len(), "checkout-provider:".len() + 64);
    assert!(!scope.contains("buyer"));
}

#[test]
fn descriptor_fails_closed_for_missing_authority_and_invalid_input() {
    let seams = setup();
    seams.set_secret(crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT, "");
    queue_auth(&seams, "buyer-a");
    let error = handle(&seams, &descriptor_request()).unwrap_err();
    assert_eq!(
        (error.status, error.code),
        (503, "checkout_authority_unavailable")
    );

    let seams = setup();
    let mut invalid = descriptor_request();
    invalid.body = "{}".into();
    let error = handle(&seams, &invalid).unwrap_err();
    assert_eq!(error.status, 400);
    assert!(seams.http_requests.borrow().is_empty());
}

fn descriptor(seams: &crate::fake::FakeSeams, buyer: &str) -> serde_json::Value {
    queue_auth(seams, buyer);
    ok_json(handle(seams, &descriptor_request()).unwrap())
}

fn descriptor_request() -> crate::reqresp::RouteRequest {
    request(
        ROUTE_DESCRIPTOR,
        "GET",
        "/checkout/descriptor",
        String::new(),
        None,
        "site-a",
    )
}
