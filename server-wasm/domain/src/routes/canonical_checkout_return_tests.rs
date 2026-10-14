use super::test_support::*;
use super::{handle, ROUTE_CREATE, ROUTE_RETURN_VERIFY};

#[test]
fn operationless_return_index_is_actor_and_site_scoped_without_provider_egress() {
    let seams = setup();
    let quote = quote(&seams, "return-scope-quote", "site-a");
    queue_auth(&seams, "buyer-1");
    seams.push_http_response(
        200,
        r#"{"id":"cs_return_scope","url":"https://checkout.stripe.com/return"}"#,
    );
    let checkout = request(
        ROUTE_CREATE,
        "POST",
        "/checkout",
        checkout_body(
            "return-scope-checkout",
            quote["operationId"].as_str().unwrap(),
            "stripe",
            None,
        ),
        Some("return-scope-checkout"),
        "site-a",
    );
    let created = ok_json(handle(&seams, &checkout).unwrap());
    let artifact = created["returnArtifact"].as_str().unwrap();
    let before = seams.http_requests.borrow().len();

    for (site, buyer) in [("site-b", "buyer-1"), ("site-a", "buyer-2")] {
        queue_auth(&seams, buyer);
        let verify = request(
            ROUTE_RETURN_VERIFY,
            "POST",
            "/checkout/return/verify",
            verify_body(artifact),
            None,
            site,
        );
        let response = ok_json(handle(&seams, &verify).unwrap());
        assert_eq!(response["status"], "mismatch");
    }
    queue_auth(&seams, "buyer-1");
    let mut wrong_attempt: serde_json::Value =
        serde_json::from_str(&verify_body(artifact)).unwrap();
    wrong_attempt["expectedAttemptId"] = serde_json::json!("wrong-attempt");
    let verify = request(
        ROUTE_RETURN_VERIFY,
        "POST",
        "/checkout/return/verify",
        wrong_attempt.to_string(),
        None,
        "site-a",
    );
    assert_eq!(
        ok_json(handle(&seams, &verify).unwrap())["status"],
        "mismatch"
    );
    assert_eq!(
        seams.http_requests.borrow().len(),
        before + 3,
        "only buyer authentication may egress for mismatched trusted scopes"
    );
}
