use super::test_support::*;
use super::*;

#[test]
fn changed_checkout_material_maps_to_stable_http_conflict() {
    let seams = setup();
    let first_quote = quote(&seams, "first-quote", "site-a");
    let second_quote = quote(&seams, "second-quote", "site-a");
    queue_auth(&seams, "buyer-1");
    seams.push_http_response(
        200,
        r#"{"id":"cs_first","url":"https://checkout.stripe.com/first"}"#,
    );
    let first = request(
        ROUTE_CREATE,
        "POST",
        "/checkout",
        checkout_body(
            "same-create-key",
            first_quote["operationId"].as_str().unwrap(),
            "stripe",
            None,
        ),
        Some("same-create-key"),
        "site-a",
    );
    assert_eq!(
        ok_json(handle(&seams, &first).unwrap())["status"],
        "action_required"
    );

    queue_auth(&seams, "buyer-1");
    let changed = request(
        ROUTE_CREATE,
        "POST",
        "/checkout",
        checkout_body(
            "same-create-key",
            second_quote["operationId"].as_str().unwrap(),
            "stripe",
            None,
        ),
        Some("same-create-key"),
        "site-a",
    );
    let error = handle(&seams, &changed).unwrap_err();
    assert_eq!((error.status, error.code), (409, "idempotency_mismatch"));
}

#[test]
fn client_material_digest_is_durably_bound_for_quote_and_checkout() {
    let seams = setup();
    let quote = quote(&seams, "digest-quote", "site-a");

    let mut changed_quote: serde_json::Value =
        serde_json::from_str(&quote_body("digest-quote", serde_json::json!(["stripe"]))).unwrap();
    changed_quote["clientMaterialSha256"] = serde_json::json!("3".repeat(64));
    queue_auth(&seams, "buyer-1");
    let quote_request = request(
        ROUTE_QUOTE,
        "POST",
        "/checkout/quote",
        changed_quote.to_string(),
        Some("digest-quote"),
        "site-a",
    );
    assert_eq!(
        handle(&seams, &quote_request).unwrap_err().code,
        "idempotency_mismatch"
    );

    queue_auth(&seams, "buyer-1");
    seams.push_http_response(
        200,
        r#"{"id":"cs_digest","url":"https://checkout.stripe.com/digest"}"#,
    );
    let first = request(
        ROUTE_CREATE,
        "POST",
        "/checkout",
        checkout_body(
            "digest-checkout",
            quote["operationId"].as_str().unwrap(),
            "stripe",
            None,
        ),
        Some("digest-checkout"),
        "site-a",
    );
    assert_eq!(
        ok_json(handle(&seams, &first).unwrap())["status"],
        "action_required"
    );

    let mut changed_checkout: serde_json::Value = serde_json::from_str(&checkout_body(
        "digest-checkout",
        quote["operationId"].as_str().unwrap(),
        "stripe",
        None,
    ))
    .unwrap();
    changed_checkout["clientMaterialSha256"] = serde_json::json!("4".repeat(64));
    queue_auth(&seams, "buyer-1");
    let checkout_request = request(
        ROUTE_CREATE,
        "POST",
        "/checkout",
        changed_checkout.to_string(),
        Some("digest-checkout"),
        "site-a",
    );
    assert_eq!(
        handle(&seams, &checkout_request).unwrap_err().code,
        "idempotency_mismatch"
    );
}
