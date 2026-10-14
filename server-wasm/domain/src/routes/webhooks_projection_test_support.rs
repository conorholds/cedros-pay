use serde_json::{json, Value};

use super::super::webhooks_test_support::seed_pending;
use crate::fake::FakeSeams;
use crate::ids;
use crate::reqresp::RouteRequest;
use crate::seams::HostSeams;
use crate::time;

pub(super) const CART_ID: &str = "cart_00112233445566778899aabbccddeeff";

pub(super) fn seed_claimed(seams: &FakeSeams, reference: &str, provider_ref: &str, product: &str) {
    seed_pending(seams, reference, provider_ref, 5000, "p1");
    let mut row = seams.get_entry(ids::MODEL_LEDGER, reference).unwrap();
    row["productId"] = json!(product);
    row["checkoutClaim"] = json!({ "schemaVersion": 1, "fingerprint": "fp-claim" });
    row["extensionMetadata"] = json!({ "keep": true });
    seams.seed(ids::MODEL_LEDGER, reference, row);
}

pub(super) fn configure_cart(seams: &FakeSeams) {
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_fixture");
    seams.set_setting("stripe.success_url", "https://shop.example/success");
    seams.set_setting("stripe.cancel_url", "https://shop.example/cancel");
}

pub(super) fn seed_cart(seams: &FakeSeams, claim: Option<Value>) {
    let now = seams.now_unix_secs();
    seams.seed(
        ids::MODEL_CART,
        CART_ID,
        json!({
            "cartId": CART_ID,
            "items": [{ "resource": "prod_1", "quantity": 1, "lineAtomic": 5000, "lineCents": 5000 }],
            "totalAtomic": 5000, "totalCents": 5000, "currency": "USD",
            "tokenMint": "mint", "recipientTokenAccount": "recipient",
            "settlementClaim": claim,
            "createdAt": time::iso8601(now), "expiresAt": time::iso8601(now + 3600)
        }),
    );
}

pub(super) fn cart_checkout_request() -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_CART_CHECKOUT.to_string(),
        context_json: json!({"siteId":"site-a"}).to_string(),
        method: "POST".to_string(),
        path: "/paywall/v1/cart/checkout".to_string(),
        body: json!({ "cartId": CART_ID }).to_string(),
        ..Default::default()
    }
}

pub(super) fn hosted_checkout_request() -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_STRIPE_SESSION.to_string(),
        method: "POST".to_string(),
        path: "/paywall/v1/stripe-session".to_string(),
        body: json!({
            "resource": "prod_1", "successUrl": "https://shop.example/success",
            "cancelUrl": "https://shop.example/cancel"
        })
        .to_string(),
        context_json: r#"{"siteId":"site-a","idempotencyKey":"hosted-claim-attempt"}"#.into(),
        ..Default::default()
    }
}

pub(super) fn paywall_request() -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_PAYWALL.to_string(),
        method: "POST".to_string(),
        path: "/paywall/v1/checkout".to_string(),
        headers: vec![("authorization".to_string(), "Bearer rp_test".to_string())],
        body: json!({
            "amountCents": 5000, "currency": "USD", "reference": "ord_claim",
            "profileId": "p1", "productId": "prod_1"
        })
        .to_string(),
        context_json: json!({ "siteId":"site-a","idempotencyKey": "idem-claim" }).to_string(),
        ..Default::default()
    }
}

pub(super) fn cart_session_event(event_id: &str, session_id: &str) -> String {
    json!({
        "id": event_id, "type": "checkout.session.completed",
        "data": { "object": {
            "id": session_id, "payment_intent": format!("pi_{session_id}"),
            "mode": "payment", "status": "complete", "payment_status": "paid",
            "amount_total": 5000, "currency": "usd",
            "metadata": { "resource": format!("cart:{CART_ID}") }
        }}
    })
    .to_string()
}

pub(super) fn failure_event(event_id: &str, reference: &str, payment_intent: &str) -> String {
    json!({
        "id": event_id, "type": "payment_intent.payment_failed",
        "data": { "object": {
            "id": payment_intent, "amount": 5000, "currency": "usd",
            "metadata": { "reference": reference, "profileId": "p1" },
            "last_payment_error": { "code": "card_declined" }
        }}
    })
    .to_string()
}

pub(super) fn refund_event(
    event_id: &str,
    reference: &str,
    payment_intent: &str,
    amount: i64,
) -> String {
    json!({
        "id": event_id, "type": "charge.refunded",
        "data": { "object": {
            "id": "ch_1", "payment_intent": payment_intent,
            "amount_refunded": amount, "currency": "usd",
            "metadata": { "reference": reference },
            "refunds": { "data": [{
                "id": format!("re_{event_id}"), "amount": amount, "status": "succeeded"
            }] }
        }}
    })
    .to_string()
}

pub(super) fn refund_change_event(
    event_id: &str,
    event_type: &str,
    status: &str,
    created: i64,
) -> String {
    json!({
        "id": event_id,
        "type": event_type,
        "created": created,
        "data": { "object": {
            "id": "re_lifecycle",
            "payment_intent": "pi_lifecycle",
            "amount": 5000,
            "currency": "usd",
            "status": status,
            "created": created,
            "metadata": { "cedros_pay_checkout": "true" }
        }}
    })
    .to_string()
}

pub(super) fn effect_counts(seams: &FakeSeams) -> (usize, usize, usize) {
    (
        seams.events.borrow().len(),
        seams.crm_events.borrow().len(),
        seams.tags.borrow().len(),
    )
}

pub(super) fn json_body(body: &str) -> Value {
    serde_json::from_str(body).unwrap()
}
