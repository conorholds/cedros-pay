use serde_json::{json, Value};

use crate::db::Db;
use crate::fake::FakeSeams;
use crate::ids;
use crate::models::LedgerEntry;
use crate::reqresp::RouteRequest;
use crate::seams::HostSeams;
use crate::time;

const CART_ID: &str = "cart_00112233445566778899aabbccddeeff";

fn cart(claim: Option<Value>) -> Value {
    let mut value = json!({
        "cartId": CART_ID, "items": [], "totalAtomic": 1_500_000u64,
        "totalCents": 150, "currency": "USD",
        "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "recipientTokenAccount": "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B",
        "paidSignature": null, "createdAt": "2026-06-01T00:00:00Z",
        "expiresAt": "2099-06-01T00:00:00Z"
    });
    if let Some(claim) = claim {
        value["settlementClaim"] = claim;
    }
    value
}

fn paywall_req(amount: i64) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_PAYWALL.into(),
        method: "POST".into(),
        path: "/paywall/v1/checkout".into(),
        headers: vec![("authorization".into(), "Bearer rp".into())],
        body: json!({ "amountCents": amount, "currency": "USD", "reference": "ord-1" }).to_string(),
        context_json: json!({ "siteId":"site-a","idempotencyKey": "idem-1" }).to_string(),
        ..Default::default()
    }
}

#[test]
fn payment_intent_crash_after_claim_resumes_with_same_identity() {
    let seams = FakeSeams::new();
    seams.set_secret(ids::SECRET_RP_TOKEN, "rp");
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test");
    seams.push_http_error("provider interrupted");
    assert_eq!(
        super::paywall::handle(&seams, &paywall_req(150))
            .unwrap_err()
            .status,
        500
    );
    let claimed = seams.get_entry(ids::MODEL_LEDGER, "ord-1").unwrap();
    assert_eq!(claimed["status"], "initiating");
    assert!(claimed.get("checkoutClaim").is_some());

    seams.push_http_response(
        200,
        r#"{"id":"pi_1","status":"requires_payment_method","client_secret":"pi_secret","amount":150,"currency":"usd"}"#,
    );
    let response = super::paywall::handle(&seams, &paywall_req(150)).unwrap();
    assert_eq!(response.status, 201);
    let settled = seams.get_entry(ids::MODEL_LEDGER, "ord-1").unwrap();
    assert_eq!(settled["status"], "pending");
    assert_eq!(settled["providerRef"], "pi_1");
}

#[test]
fn payment_intent_mismatched_replay_fails_before_second_egress() {
    let seams = FakeSeams::new();
    seams.set_secret(ids::SECRET_RP_TOKEN, "rp");
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test");
    seams.push_http_error("provider interrupted");
    let _ = super::paywall::handle(&seams, &paywall_req(150));
    let error = super::paywall::handle(&seams, &paywall_req(151)).unwrap_err();
    assert_eq!((error.status, error.code), (409, "conflict"));
    assert_eq!(seams.http_requests.borrow().len(), 1);
}

fn hosted_req(resource: &str) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_STRIPE_SESSION.into(),
        method: "POST".into(),
        path: "/paywall/v1/stripe-session".into(),
        body: json!({
            "resource": resource,
            "successUrl": "https://shop.example/success",
            "cancelUrl": "https://shop.example/cancel"
        })
        .to_string(),
        context_json: json!({ "siteId":"site-a","idempotencyKey": "hosted-idem" }).to_string(),
        ..Default::default()
    }
}

#[test]
fn hosted_session_resumes_after_provider_interruption_and_keeps_receipt() {
    let seams = FakeSeams::new();
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test");
    seams.seed(
        ids::MODEL_CATALOG,
        "prod-1",
        json!({ "id": "prod-1", "price": { "amountCents": 150, "currency": "USD" } }),
    );
    seams.push_http_error("provider interrupted");
    assert_eq!(
        super::stripe_session::handle(&seams, &hosted_req("prod-1"))
            .unwrap_err()
            .status,
        500
    );
    assert_eq!(seams.entry_count(ids::MODEL_LEDGER), 1, "durable claim");
    seams.push_http_response(
        200,
        r#"{"id":"cs_recovered","url":"https://checkout.stripe.com/recovered"}"#,
    );
    assert_eq!(
        super::stripe_session::handle(&seams, &hosted_req("prod-1"))
            .unwrap()
            .status,
        200
    );
    assert!(seams.get_entry(ids::MODEL_LEDGER, "cs_recovered").is_some());
    assert_eq!(
        seams.entry_count(ids::MODEL_LEDGER),
        2,
        "durable receipt kept"
    );
}

#[test]
fn competing_cart_rail_wins_before_stripe_egress() {
    let seams = FakeSeams::new();
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test");
    seams.set_setting("stripe.success_url", "https://shop.example/success");
    seams.set_setting("stripe.cancel_url", "https://shop.example/cancel");
    seams.seed(ids::MODEL_CART, CART_ID, cart(None));
    seams.queue_guarded_race(vec![(
        ids::MODEL_CART,
        CART_ID,
        cart(Some(json!({
            "schemaVersion": 1, "rail": "x402", "fingerprint": "winner",
            "reference": "sig-winner", "status": "initiating"
        }))),
    )]);
    let request = RouteRequest {
        route_id: ids::ROUTE_CART_CHECKOUT.into(),
        context_json: json!({"siteId":"site-a"}).to_string(),
        method: "POST".into(),
        path: "/paywall/v1/cart/checkout".into(),
        body: json!({ "cartId": CART_ID }).to_string(),
        ..Default::default()
    };
    let error = super::cart_checkout::handle(&seams, &request).unwrap_err();
    assert_eq!(error.status, 409);
    assert!(seams.http_requests.borrow().is_empty());
    assert!(seams.get_entry(ids::MODEL_LEDGER, "cs_loser").is_none());
}

#[test]
fn cart_checkout_resumes_after_provider_interruption_without_reclaiming_cart() {
    let seams = FakeSeams::new();
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test");
    seams.set_setting("stripe.success_url", "https://shop.example/success");
    seams.set_setting("stripe.cancel_url", "https://shop.example/cancel");
    seams.seed(ids::MODEL_CART, CART_ID, cart(None));
    seams.push_http_error("provider interrupted");
    let request = RouteRequest {
        route_id: ids::ROUTE_CART_CHECKOUT.into(),
        context_json: json!({"siteId":"site-a"}).to_string(),
        method: "POST".into(),
        path: "/paywall/v1/cart/checkout".into(),
        body: json!({ "cartId": CART_ID }).to_string(),
        ..Default::default()
    };
    assert_eq!(
        super::cart_checkout::handle(&seams, &request)
            .unwrap_err()
            .status,
        500
    );
    assert_eq!(
        seams.get_entry(ids::MODEL_CART, CART_ID).unwrap()["settlementClaim"]["rail"],
        "stripe"
    );
    seams.push_http_response(
        200,
        r#"{"id":"cs_cart_recovered","url":"https://checkout.stripe.com/recovered"}"#,
    );
    super::cart_checkout::handle(&seams, &request).unwrap();
    let cart = seams.get_entry(ids::MODEL_CART, CART_ID).unwrap();
    assert_eq!(cart["settlementClaim"]["reference"], "cs_cart_recovered");
    assert_eq!(cart["settlementClaim"]["status"], "pending");
    assert!(seams
        .get_entry(ids::MODEL_LEDGER, "cs_cart_recovered")
        .is_some());
}

#[test]
fn competing_cart_rail_prevents_credit_debit_and_effects() {
    let seams = FakeSeams::new();
    seams.set_setting("cedros_login.base_url", "https://site.example");
    seams.push_http_response(200, r#"{"user":{"id":"user-1"}}"#);
    seams.seed(ids::MODEL_CART, CART_ID, cart(None));
    seams.seed(
        ids::MODEL_CREDITS,
        "acct:user-1",
        json!({ "subjectId": "user-1", "balanceCents": 500, "heldCents": 0,
            "currency": "USD", "updatedAt": "2026-06-01T00:00:00Z" }),
    );
    seams.queue_guarded_race(vec![(
        ids::MODEL_CART,
        CART_ID,
        cart(Some(json!({
            "schemaVersion": 1, "rail": "x402", "fingerprint": "winner",
            "reference": "sig-winner", "status": "initiating"
        }))),
    )]);
    let request = RouteRequest {
        route_id: ids::ROUTE_CART_CREDITS_AUTHORIZE.into(),
        method: "POST".into(),
        path: format!("/paywall/v1/cart/{CART_ID}/credits/authorize"),
        headers: vec![("authorization".into(), "Bearer buyer".into())],
        ..Default::default()
    };
    assert_eq!(
        super::cart_credits::handle(&seams, &request)
            .unwrap_err()
            .status,
        409
    );
    assert_eq!(
        seams.get_entry(ids::MODEL_CREDITS, "acct:user-1").unwrap()["balanceCents"],
        500
    );
    assert_eq!(seams.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 0);
}

#[test]
fn x402_cart_claim_is_atomic_with_pending_ledger() {
    let seams = FakeSeams::new();
    seams.seed(ids::MODEL_CART, CART_ID, cart(None));
    seams.queue_guarded_race(vec![(
        ids::MODEL_CART,
        CART_ID,
        cart(Some(json!({
            "schemaVersion": 1, "rail": "stripe", "fingerprint": "winner",
            "reference": "idem-winner", "status": "initiating"
        }))),
    )]);
    let now = seams.now_unix_secs();
    let pending = LedgerEntry {
        reference: "sig-loser".into(),
        kind: "payment".into(),
        status: "pending".into(),
        gross_cents: 150,
        refund_cents: 0,
        currency: "USD".into(),
        customer_profile_id: None,
        route_path: None,
        product_id: Some(format!("cart:{CART_ID}")),
        product_ids: vec![format!("cart:{CART_ID}")],
        provider: "x402".into(),
        provider_ref: Some("sig-loser".into()),
        payer_wallet: None,
        created_at: time::iso8601(now),
        processed_at: time::iso8601(now),
        token_settlement: None,
    };
    let error = super::x402_payment_store::prepare(
        &Db::new(&seams, ids::DB_ACCESS),
        pending,
        Some(CART_ID),
        "loser".into(),
    )
    .err()
    .expect("competing rail must win");
    assert_eq!(error.status, 409);
    assert!(seams.get_entry(ids::MODEL_LEDGER, "sig-loser").is_none());
}

#[test]
fn stale_x402_finalizer_cannot_overwrite_a_newer_terminal_state() {
    let seams = FakeSeams::new();
    let now = seams.now_unix_secs();
    let pending = LedgerEntry {
        reference: "sig-race".into(),
        kind: "payment".into(),
        status: "pending".into(),
        gross_cents: 150,
        refund_cents: 0,
        currency: "USD".into(),
        customer_profile_id: None,
        route_path: None,
        product_id: Some("prod-1".into()),
        product_ids: vec!["prod-1".into()],
        provider: "x402".into(),
        provider_ref: Some("sig-race".into()),
        payer_wallet: None,
        created_at: time::iso8601(now),
        processed_at: time::iso8601(now),
        token_settlement: None,
    };
    let db = Db::new(&seams, ids::DB_ACCESS);
    let prepared =
        super::x402_payment_store::prepare(&db, pending, None, "same-fingerprint".into()).unwrap();
    let mut winner = serde_json::to_value(&prepared.entry).unwrap();
    winner["status"] = json!("succeeded");
    winner["checkoutClaim"] = json!({
        "schemaVersion": 1, "fingerprint": "same-fingerprint"
    });
    seams.queue_guarded_race(vec![(ids::MODEL_LEDGER, "sig-race", winner)]);
    let error = super::x402_payment_store::transition(&db, &prepared, "failed", now).unwrap_err();
    assert_eq!(error.status, 409);
    assert_eq!(
        seams.get_entry(ids::MODEL_LEDGER, "sig-race").unwrap()["status"],
        "succeeded"
    );
}
