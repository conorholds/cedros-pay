use serde_json::{json, Value};

use super::test_support::*;
use super::*;

#[test]
fn all_five_http_operations_preserve_sdk_shapes_and_correlation() {
    let seams = setup();
    let quote = quote(&seams, "route-quote", "site-a");
    assert_eq!(quote["schemaVersion"], 1);
    assert!(quote["quote"].get("x402").is_none());
    let quote_id = quote["operationId"].as_str().unwrap();

    queue_auth(&seams, "buyer-1");
    seams.push_http_response(
        200,
        r#"{"id":"cs_route_1","url":"https://checkout.stripe.com/route"}"#,
    );
    let create = request(
        ROUTE_CREATE,
        "POST",
        "/checkout",
        checkout_body("route-create", quote_id, "stripe", None),
        Some("route-create"),
        "site-a",
    );
    let created = ok_json(handle(&seams, &create).unwrap());
    assert_eq!(created["status"], "action_required");
    assert_eq!(created["attemptId"], "attempt-1");
    assert_eq!(created["paymentMethod"], "stripe");
    let operation_id = created["operationId"].as_str().unwrap();
    let artifact = created["returnArtifact"].as_str().unwrap();

    let before_status = seams.http_requests.borrow().len();
    queue_auth(&seams, "buyer-1");
    let status = request(
        ROUTE_STATUS,
        "GET",
        &format!("/checkout/{operation_id}"),
        String::new(),
        None,
        "site-a",
    );
    let status = ok_json(handle(&seams, &status).unwrap());
    assert_eq!(status["status"], "action_required");
    assert_eq!(
        seams.http_requests.borrow().len(),
        before_status + 1,
        "status performs identity verification but no payment-provider egress"
    );

    let unpaid_retrieval = retrieval(&seams, operation_id, artifact, "unpaid");
    queue_auth(&seams, "buyer-1");
    seams.push_http_response(200, &unpaid_retrieval);
    let operation = resolve_body(operation_id, artifact);
    let resolve = request(
        ROUTE_RESOLVE,
        "POST",
        "/checkout/resolve",
        operation.clone(),
        None,
        "site-a",
    );
    let resolved = ok_json(handle(&seams, &resolve).unwrap());
    assert_eq!(resolved["status"], "resolved");
    assert_eq!(resolved["operationId"], operation_id);
    assert_eq!(
        resolved["checkoutUrl"],
        "https://checkout.stripe.com/resolved"
    );

    queue_auth(&seams, "buyer-1");
    seams.push_http_response(200, &retrieval(&seams, operation_id, artifact, "paid"));
    let verify = request(
        ROUTE_RETURN_VERIFY,
        "POST",
        "/checkout/return/verify",
        verify_body(artifact),
        None,
        "site-a",
    );
    let verified = ok_json(handle(&seams, &verify).unwrap());
    assert_eq!(verified["status"], "verified");
    assert_eq!(verified["checkoutAttemptId"], "attempt-1");
    assert!(verified.get("operationId").is_none());
    assert!(!verified.to_string().contains("sk_test"));
}

#[test]
fn exact_replay_and_provider_scope_isolation_are_durable() {
    let seams = setup();
    let key = format!("shop-checkout-{}", "K".repeat(53));
    assert_eq!(key.len(), 67);
    let first = quote(&seams, &key, "site-a");
    let replay = quote(&seams, &key, "site-a");
    assert_eq!(first["operationId"], replay["operationId"]);
    assert_eq!(replay["replayed"], true);

    let isolated = quote(&seams, &key, "site-b");
    assert_ne!(first["operationId"], isolated["operationId"]);

    let mut changed: Value = serde_json::from_str(&quote_body(&key, json!(["stripe"]))).unwrap();
    changed["source"]["items"][0]["qty"] = json!(3);
    queue_auth(&seams, "buyer-1");
    let changed = request(
        ROUTE_QUOTE,
        "POST",
        "/checkout/quote",
        changed.to_string(),
        Some(&key),
        "site-a",
    );
    let error = handle(&seams, &changed).unwrap_err();
    assert_eq!((error.status, error.code), (409, "idempotency_mismatch"));
}

#[test]
fn published_sdk_quote_fixture_passes_the_exact_http_boundary() {
    let seams = setup();
    let fixtures: Value = serde_json::from_str(include_str!(
        "../../../../docs/fixtures/cedros-pay-checkout-contract.json"
    ))
    .unwrap();
    let body = fixtures["quoteRequest"].to_string();
    let key = fixtures["quoteRequest"]["idempotencyKey"].as_str().unwrap();
    queue_auth(&seams, "buyer-1");
    let request = request(
        ROUTE_QUOTE,
        "POST",
        "/checkout/quote",
        body,
        Some(key),
        "site-a",
    );
    let response = ok_json(handle(&seams, &request).unwrap());
    assert_eq!(response["schemaVersion"], 1);
    assert_eq!(response["attemptId"], "attempt-01HQEXAMPLE");
    assert_eq!(response["quote"]["totalCents"], 1_500);
}
