use serde_json::{json, Value};

use super::rate;
use super::test_support::*;
use super::*;
use crate::auth::Buyer;
use crate::ctx::RequestContext;

#[test]
fn reordered_marker_fails_before_auth_or_request_effects() {
    let seams = setup();
    let mut marker = seams
        .get_entry(
            crate::guarded_policy::CONTROL_MODEL,
            crate::guarded_policy::MARKER_KEY,
        )
        .unwrap();
    marker["models"].as_array_mut().unwrap().reverse();
    seams.seed(
        crate::guarded_policy::CONTROL_MODEL,
        crate::guarded_policy::MARKER_KEY,
        marker,
    );
    let request = request(
        ROUTE_QUOTE,
        "POST",
        "/checkout/quote",
        quote_body("marker-key", json!(["stripe"])),
        Some("marker-key"),
        "site-a",
    );
    let error = handle(&seams, &request).unwrap_err();
    assert_eq!(
        (error.status, error.code),
        (503, "guarded_write_policy_unavailable")
    );
    assert!(seams.http_requests.borrow().is_empty());
    assert_eq!(
        seams.entry_count(crate::checkout_contract::OPERATION_MODEL),
        0
    );
}

#[test]
fn malformed_unknown_oversized_and_ambiguous_inputs_fail_before_auth_egress() {
    let seams = setup();
    for (body, expected) in [("{".to_string(), 400), ("x".repeat(16 * 1024 + 1), 413)] {
        let request = request(
            ROUTE_QUOTE,
            "POST",
            "/checkout/quote",
            body,
            Some("boundary-key"),
            "site-a",
        );
        assert_eq!(handle(&seams, &request).unwrap_err().status, expected);
    }
    let mut unknown: Value =
        serde_json::from_str(&quote_body("unknown-key", json!(["stripe"]))).unwrap();
    unknown["clientTotal"] = json!(1);
    let unknown_request = request(
        ROUTE_QUOTE,
        "POST",
        "/checkout/quote",
        unknown.to_string(),
        Some("unknown-key"),
        "site-a",
    );
    assert_eq!(handle(&seams, &unknown_request).unwrap_err().status, 400);

    for digest in [None, Some("A".repeat(64)), Some("1".repeat(63))] {
        let mut invalid: Value =
            serde_json::from_str(&quote_body("digest-key", json!(["stripe"]))).unwrap();
        match digest {
            Some(value) => invalid["clientMaterialSha256"] = json!(value),
            None => {
                invalid
                    .as_object_mut()
                    .unwrap()
                    .remove("clientMaterialSha256");
            }
        }
        let request = request(
            ROUTE_QUOTE,
            "POST",
            "/checkout/quote",
            invalid.to_string(),
            Some("digest-key"),
            "site-a",
        );
        assert!(matches!(
            handle(&seams, &request).unwrap_err().status,
            400 | 422
        ));
    }

    let mut duplicate = request(
        ROUTE_QUOTE,
        "POST",
        "/checkout/quote",
        quote_body("duplicate-key", json!(["stripe"])),
        Some("duplicate-key"),
        "site-a",
    );
    duplicate
        .headers
        .push(("Idempotency-Key".into(), "duplicate-key".into()));
    assert_eq!(handle(&seams, &duplicate).unwrap_err().status, 400);
    assert!(seams.http_requests.borrow().is_empty());
    assert_eq!(
        seams.entry_count(crate::checkout_contract::OPERATION_MODEL),
        0
    );
}

#[test]
fn auth_hostile_origin_and_hostile_artifact_fail_without_checkout_effects() {
    let seams = setup();
    seams.push_http_response(401, r#"{"error":"unauthorized"}"#);
    let unauthorized = request(
        ROUTE_QUOTE,
        "POST",
        "/checkout/quote",
        quote_body("auth-key", json!(["stripe"])),
        Some("auth-key"),
        "site-a",
    );
    assert_eq!(handle(&seams, &unauthorized).unwrap_err().status, 401);

    let mut hostile: Value =
        serde_json::from_str(&quote_body("origin-key", json!(["stripe"]))).unwrap();
    hostile["customerContext"]["returnUrls"]["success"] = json!("https://evil.example/steal");
    queue_auth(&seams, "buyer-1");
    let hostile = request(
        ROUTE_QUOTE,
        "POST",
        "/checkout/quote",
        hostile.to_string(),
        Some("origin-key"),
        "site-a",
    );
    assert_eq!(handle(&seams, &hostile).unwrap_err().status, 422);

    let before = seams.http_requests.borrow().len();
    let hostile_artifact = request(
        ROUTE_RETURN_VERIFY,
        "POST",
        "/checkout/return/verify",
        verify_body("../secret"),
        None,
        "site-a",
    );
    let error = handle(&seams, &hostile_artifact).unwrap_err();
    assert_eq!(error.status, 422);
    let response = error.into_response();
    assert!(!response.body.contains("../secret"));
    assert_eq!(seams.http_requests.borrow().len(), before);
    assert_eq!(
        seams.entry_count(crate::checkout_contract::OPERATION_MODEL),
        0
    );
}

#[test]
fn guarded_rate_policy_is_process_safe_and_fails_closed_on_limit() {
    let seams = setup();
    let buyer = Buyer {
        user_id: "rate-buyer".into(),
        claims: Value::Null,
    };
    let context = RequestContext::parse(r#"{"siteId":"site-a","environment":"production"}"#);
    for _ in 0..30 {
        rate::check(&seams, &buyer, &context, rate::Operation::Create).unwrap();
    }
    let error = rate::check(&seams, &buyer, &context, rate::Operation::Create).unwrap_err();
    assert_eq!((error.status, error.code), (429, "rate_limited"));
}
