use super::*;
use crate::fake::FakeSeams;

const CART_ID: &str = "cart_00112233445566778899aabbccddeeff";

fn configure(s: &FakeSeams) {
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_1");
    s.set_setting("stripe.success_url", "https://shop.example/ok");
    s.set_setting("stripe.cancel_url", "https://shop.example/no");
}

fn seed_cart(s: &FakeSeams, paid: bool, expires_at: &str, total_cents: i64, items: usize) {
    let now = s.now_unix_secs();
    let lines: Vec<Value> = (0..items)
            .map(|i| json!({ "resource": format!("prod_{i}"), "quantity": 1, "lineAtomic": 1, "lineCents": 100 }))
            .collect();
    s.seed(
        ids::MODEL_CART,
        CART_ID,
        json!({
            "cartId": CART_ID,
            "items": lines,
            "totalAtomic": 15_990_000u64,
            "totalCents": total_cents,
            "currency": "USD",
            "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "recipientTokenAccount": "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B",
            "paidSignature": if paid { Some("prior-sig") } else { None },
            "createdAt": time::iso8601(now),
            "expiresAt": expires_at,
        }),
    );
}

fn req(body: Value) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_CART_CHECKOUT.into(),
        context_json: json!({"siteId":"site-a"}).to_string(),
        method: "POST".into(),
        path: "/paywall/v1/cart/checkout".into(),
        body: body.to_string(),
        ..Default::default()
    }
}

fn future() -> String {
    let s = FakeSeams::new();
    time::iso8601(s.now_unix_secs() + 3600)
}

#[test]
fn creates_a_cart_session_for_the_stored_total() {
    let s = FakeSeams::new();
    configure(&s);
    seed_cart(&s, false, &future(), 1599, 2);
    s.push_http_response(
        200,
        r#"{"id":"cs_cart_1","url":"https://checkout.stripe.com/c"}"#,
    );

    let out: Value =
        serde_json::from_str(&handle(&s, &req(json!({ "cartId": CART_ID }))).unwrap().body)
            .unwrap();
    assert_eq!(out["sessionId"], "cs_cart_1");
    // The Stripe call billed the cart's STORED total, not a client number.
    let sent = s.http_requests.borrow()[0]["body"]
        .as_str()
        .unwrap()
        .to_string();
    assert!(sent.contains("unit_amount%5D=1599"));
    // Pending ledger keyed by the session id, attributed to the cart.
    let entry = s.get_entry(ids::MODEL_LEDGER, "cs_cart_1").unwrap();
    assert_eq!(entry["status"], "pending");
    assert_eq!(entry["provider"], "stripe");
    assert_eq!(entry["grossCents"], 1599);
    assert_eq!(entry["productId"], format!("cart:{CART_ID}"));
}

#[test]
fn uses_request_idempotency_key_for_a_distinct_checkout_attempt() {
    let s = FakeSeams::new();
    configure(&s);
    seed_cart(&s, false, &future(), 1599, 2);
    s.push_http_response(
        200,
        r#"{"id":"cs_cart_retry","url":"https://checkout.stripe.com/c"}"#,
    );
    let mut request = req(json!({ "cartId": CART_ID }));
    request.context_json =
        json!({ "siteId":"site-a","idempotencyKey": "cart-attempt-2" }).to_string();

    assert_eq!(handle(&s, &request).unwrap().status, 200);
    assert!(s.http_requests.borrow()[0]["headers"]
        .as_array()
        .unwrap()
        .iter()
        .any(|header| header[0] == "idempotency-key"
            && header[1]
                == crate::routes::checkout_claim::scoped_provider_key(
                    &RequestContext::parse(&request.context_json),
                    "cart_checkout",
                    "cart-attempt-2"
                )
                .unwrap()));
}

#[test]
fn rejects_invalid_host_idempotency_key_before_provider_egress() {
    let s = FakeSeams::new();
    configure(&s);
    seed_cart(&s, false, &future(), 1599, 2);
    let mut request = req(json!({ "cartId": CART_ID }));
    request.context_json = json!({ "siteId":"site-a","idempotencyKey": " invalid" }).to_string();

    assert_eq!(handle(&s, &request).unwrap_err().status, 400);
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn unknown_or_malformed_cart_is_404() {
    let s = FakeSeams::new();
    configure(&s);
    assert_eq!(
        handle(
            &s,
            &req(json!({ "cartId": "cart_00000000000000000000000000000000" }))
        )
        .unwrap_err()
        .status,
        404
    );
    assert_eq!(
        handle(&s, &req(json!({ "cartId": "bogus" })))
            .unwrap_err()
            .status,
        404
    );
}

#[test]
fn already_settled_cart_is_409() {
    let s = FakeSeams::new();
    configure(&s);
    seed_cart(&s, true, &future(), 1599, 2);
    assert_eq!(
        handle(&s, &req(json!({ "cartId": CART_ID })))
            .unwrap_err()
            .status,
        409
    );
    // No Stripe egress for an already-settled cart.
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn expired_cart_is_422() {
    let s = FakeSeams::new();
    configure(&s);
    seed_cart(&s, false, "2020-01-01T00:00:00Z", 1599, 2);
    assert_eq!(
        handle(&s, &req(json!({ "cartId": CART_ID })))
            .unwrap_err()
            .status,
        422
    );
}

#[test]
fn unconfigured_stripe_is_503() {
    let s = FakeSeams::new();
    seed_cart(&s, false, &future(), 1599, 2);
    assert_eq!(
        handle(&s, &req(json!({ "cartId": CART_ID })))
            .unwrap_err()
            .status,
        503
    );
}

#[test]
fn cart_retry_uses_durable_initiation_expiry() {
    let s = FakeSeams::new();
    configure(&s);
    seed_cart(&s, false, &future(), 1599, 2);
    let request = req(json!({"cartId": CART_ID}));
    s.push_http_error("lost response");
    assert!(handle(&s, &request).is_err());
    s.set_now(s.now_unix_secs() + 120);
    s.push_http_response(
        200,
        r#"{"id":"cs_cart_retry","url":"https://checkout.stripe.com/retry"}"#,
    );
    handle(&s, &request).unwrap();
    assert_eq!(s.http_requests.borrow()[0], s.http_requests.borrow()[1]);
}
