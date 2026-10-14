use serde_json::{json, Value};

use crate::fake::FakeSeams;
use crate::reqresp::RouteRequest;
use crate::seams::HostSeams;
use crate::{ids, time};

const MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const PAY_TO: &str = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const CART_ID: &str = "cart_00112233445566778899aabbccddeeff";

fn configure_x402(s: &FakeSeams) {
    s.set_setting("x402.enabled", "true");
    s.set_setting("x402.payment_address", PAY_TO);
    s.set_setting("x402.token_mint", MINT);
    s.set_setting("x402.token_decimals", "6");
}

fn seed_product(s: &FakeSeams, id: &str, cents: i64) {
    s.seed(
        ids::MODEL_CATALOG,
        id,
        json!({ "id": id, "displayName": "Test Product", "price": { "amountCents": cents, "currency": "USD" } }),
    );
}

fn seed_coupon(s: &FakeSeams, code: &str, mut payload: Value) {
    let obj = payload.as_object_mut().expect("coupon payload object");
    obj.entry("recordType")
        .or_insert(Value::String("coupon".into()));
    obj.entry("code")
        .or_insert(Value::String(code.trim().to_uppercase()));
    obj.entry("active").or_insert(Value::Bool(true));
    obj.entry("usageCount").or_insert(Value::from(0));
    s.seed(
        ids::MODEL_CATALOG,
        &format!("coupon:{}", code.trim().to_uppercase()),
        payload,
    );
}

fn cart_quote_req(body: Value) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_CART_QUOTE.into(),
        method: "POST".into(),
        path: "/paywall/v1/cart/quote".into(),
        body: body.to_string(),
        ..Default::default()
    }
}

fn one_line_cart(coupon_code: &str) -> Value {
    json!({
        "items": [{ "resource": "prod_1", "quantity": 2 }],
        "couponCode": coupon_code
    })
}

#[test]
fn cart_quote_applies_percentage_coupon_to_stored_snapshot() {
    let s = FakeSeams::new();
    configure_x402(&s);
    seed_product(&s, "prod_1", 1_000);
    seed_coupon(
        &s,
        "save20",
        json!({ "discountType": "percentage", "discountValue": 20 }),
    );

    let resp = crate::routes::cart::handle(&s, &cart_quote_req(one_line_cart(" save20 "))).unwrap();
    assert_eq!(resp.status, 200);
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    let cart_id = out["cartId"].as_str().unwrap();
    assert_eq!(out["totalAmount"], "16.000000");
    assert_eq!(out["quote"]["maxAmountRequired"], "16000000");
    assert_eq!(out["metadata"]["original_amount"], "20.000000");
    assert_eq!(out["metadata"]["discounted_amount"], "16.000000");
    assert_eq!(out["metadata"]["coupon_code"], "SAVE20");

    let row = s.get_entry(ids::MODEL_CART, cart_id).unwrap();
    assert_eq!(row["totalAtomic"], 16_000_000);
    assert_eq!(row["totalCents"], 1_600);
    assert_eq!(row["originalTotalAtomic"], 20_000_000);
    assert_eq!(row["originalTotalCents"], 2_000);
    assert_eq!(row["appliedCoupon"]["code"], "SAVE20");
    assert_eq!(row["appliedCoupon"]["discountBps"], 2_000);
    assert_eq!(row["appliedCoupon"]["discountedTotalCents"], 1_600);
}

#[test]
fn cart_quote_applies_fixed_coupon_to_stored_snapshot() {
    let s = FakeSeams::new();
    configure_x402(&s);
    seed_product(&s, "prod_1", 1_000);
    seed_coupon(
        &s,
        "fixed325",
        json!({ "discountType": "fixed", "discountValue": 3.25, "currency": "USD" }),
    );

    let resp = crate::routes::cart::handle(&s, &cart_quote_req(one_line_cart("FIXED325"))).unwrap();
    assert_eq!(resp.status, 200);
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    let row = s
        .get_entry(ids::MODEL_CART, out["cartId"].as_str().unwrap())
        .unwrap();
    assert_eq!(out["totalAmount"], "16.750000");
    assert_eq!(out["quote"]["maxAmountRequired"], "16750000");
    assert_eq!(row["totalCents"], 1_675);
    assert_eq!(row["appliedCoupon"]["discountType"], "fixed");
    assert_eq!(row["appliedCoupon"]["discountCents"], 325);
}

#[test]
fn cart_quote_rejects_unknown_inactive_and_expired_coupons() {
    let s = FakeSeams::new();
    configure_x402(&s);
    seed_product(&s, "prod_1", 1_000);
    seed_coupon(
        &s,
        "inactive",
        json!({ "active": false, "discountType": "percentage", "discountValue": 10 }),
    );
    seed_coupon(
        &s,
        "expired",
        json!({
            "discountType": "percentage",
            "discountValue": 10,
            "expiresAt": "2020-01-01T00:00:00Z"
        }),
    );

    let unknown =
        crate::routes::cart::handle(&s, &cart_quote_req(one_line_cart("NOPE"))).unwrap_err();
    assert_eq!(unknown.status, 422);
    assert_eq!(unknown.code, "coupon_not_found");

    let inactive =
        crate::routes::cart::handle(&s, &cart_quote_req(one_line_cart("INACTIVE"))).unwrap_err();
    assert_eq!(inactive.status, 422);
    assert_eq!(inactive.code, "coupon_not_applicable");

    let expired =
        crate::routes::cart::handle(&s, &cart_quote_req(one_line_cart("EXPIRED"))).unwrap_err();
    assert_eq!(expired.status, 422);
    assert_eq!(expired.code, "coupon_expired");
}

#[test]
fn cart_quote_rejects_usage_limited_coupon_until_redemption_accounting_exists() {
    let s = FakeSeams::new();
    configure_x402(&s);
    seed_product(&s, "prod_1", 1_000);
    seed_coupon(
        &s,
        "limited",
        json!({
            "discountType": "percentage",
            "discountValue": 10,
            "usageLimit": 1,
            "usageCount": 0
        }),
    );

    let err =
        crate::routes::cart::handle(&s, &cart_quote_req(one_line_cart("LIMITED"))).unwrap_err();
    assert_eq!(err.status, 422);
    assert_eq!(err.code, "coupon_not_applicable");
    assert_eq!(s.entry_count(ids::MODEL_CART), 0);
}

#[test]
fn cart_checkout_rejects_late_coupon_not_in_stored_snapshot() {
    let s = FakeSeams::new();
    let now = s.now_unix_secs();
    s.seed(
        ids::MODEL_CART,
        CART_ID,
        json!({
            "cartId": CART_ID,
            "items": [],
            "totalAtomic": 20_000_000u64,
            "totalCents": 2_000,
            "currency": "USD",
            "tokenMint": MINT,
            "recipientTokenAccount": "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B",
            "paidSignature": null,
            "createdAt": time::iso8601(now),
            "expiresAt": time::iso8601(now + 3600),
        }),
    );

    let req = RouteRequest {
        route_id: ids::ROUTE_CART_CHECKOUT.into(),
        context_json: json!({"siteId":"site-a"}).to_string(),
        method: "POST".into(),
        path: "/paywall/v1/cart/checkout".into(),
        body: json!({ "cartId": CART_ID, "couponCode": "SAVE20" }).to_string(),
        ..Default::default()
    };
    let err = crate::routes::cart_checkout::handle(&s, &req).unwrap_err();
    assert_eq!(err.status, 422);
    assert_eq!(err.code, "coupon_not_applicable");
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn x402_single_resource_quote_rejects_coupon_code() {
    let s = FakeSeams::new();
    let req = RouteRequest {
        route_id: ids::ROUTE_QUOTE.into(),
        method: "POST".into(),
        path: "/paywall/v1/quote".into(),
        body: json!({ "resource": "prod_1", "couponCode": "SAVE20" }).to_string(),
        ..Default::default()
    };
    let err = crate::routes::x402::handle(&s, &req).unwrap_err();
    assert_eq!(err.status, 422);
    assert_eq!(err.code, "coupon_not_applicable");
}

#[test]
fn stripe_session_applies_coupon_to_provider_amount_and_ledger() {
    let s = FakeSeams::new();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_123");
    seed_product(&s, "prod_1", 1_000);
    seed_coupon(
        &s,
        "save25",
        json!({ "discountBps": 2_500, "paymentMethod": "stripe", "appliesAt": "checkout" }),
    );
    s.push_http_response(
        200,
        r#"{"id":"cs_discount","url":"https://checkout.stripe.com/c/pay/cs_discount"}"#,
    );

    let req = RouteRequest {
        route_id: ids::ROUTE_STRIPE_SESSION.into(),
        method: "POST".into(),
        path: "/paywall/v1/stripe-session".into(),
        body: json!({
            "resource": "prod_1",
            "couponCode": "SAVE25",
            "successUrl": "https://shop.example/success",
            "cancelUrl": "https://shop.example/cancel"
        })
        .to_string(),
        context_json: r#"{"siteId":"site-a","idempotencyKey":"coupon-attempt-1"}"#.into(),
        ..Default::default()
    };
    let resp = crate::routes::stripe_session::handle(&s, &req).unwrap();
    assert_eq!(resp.status, 200);
    let sent = s.http_requests.borrow()[0]["body"]
        .as_str()
        .unwrap()
        .to_string();
    assert!(sent.contains("unit_amount%5D=750"));
    assert!(sent.contains("metadata%5Bcoupon_code%5D=SAVE25"));
    // The host-supplied attempt identity is bound to this site and operation.
    let keyed = s.http_requests.borrow()[0]["headers"]
        .as_array()
        .unwrap()
        .iter()
        .any(|h| {
            h[0] == "idempotency-key"
                && h[1]
                    == crate::routes::checkout_claim::scoped_provider_key(
                        &crate::ctx::RequestContext::parse(&req.context_json),
                        "hosted-product-checkout",
                        "coupon-attempt-1",
                    )
                    .unwrap()
        });
    assert!(keyed, "idempotency key must identify the checkout attempt");

    let entry = s.get_entry(ids::MODEL_LEDGER, "cs_discount").unwrap();
    assert_eq!(entry["grossCents"], 750);
    assert_eq!(entry["provider"], "stripe");
    assert_eq!(entry["productId"], "prod_1");
}

#[test]
fn coupon_windows_accept_admin_date_only_bounds() {
    let s = FakeSeams::new();
    configure_x402(&s);
    seed_product(&s, "prod_1", 1_000);
    // Mid-day on 2026-06-15; the admin coupon form submits date-only bounds.
    s.set_now(time::parse_iso("2026-06-15T12:00:00Z").unwrap());
    seed_coupon(
        &s,
        "today",
        json!({
            "discountType": "percentage",
            "discountValue": 10,
            "startsAt": "2026-06-15",
            "expiresAt": "2026-06-15"
        }),
    );
    seed_coupon(
        &s,
        "gone",
        json!({ "discountType": "percentage", "discountValue": 10, "expiresAt": "2026-06-14" }),
    );
    seed_coupon(
        &s,
        "soon",
        json!({ "discountType": "percentage", "discountValue": 10, "startsAt": "2026-06-16" }),
    );

    // A date-only expiry is honoured through the END of the named day.
    let today = crate::routes::cart::handle(&s, &cart_quote_req(one_line_cart("TODAY"))).unwrap();
    assert_eq!(today.status, 200);
    let out: Value = serde_json::from_str(&today.body).unwrap();
    assert_eq!(out["metadata"]["coupon_code"], "TODAY");

    let gone = crate::routes::cart::handle(&s, &cart_quote_req(one_line_cart("GONE"))).unwrap_err();
    assert_eq!(gone.status, 422);
    assert_eq!(gone.code, "coupon_expired");

    let soon = crate::routes::cart::handle(&s, &cart_quote_req(one_line_cart("SOON"))).unwrap_err();
    assert_eq!(soon.status, 422);
    assert_eq!(soon.code, "coupon_not_applicable");
}
