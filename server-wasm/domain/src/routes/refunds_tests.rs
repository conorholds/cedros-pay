use super::*;
use crate::fake::FakeSeams;
use serde_json::{json, Value};

const BUYER_WALLET: &str = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const PURCHASE_SIG: &str = "5jX8onChainSignatureForTheOriginalX402Payment1111111111111111";

/// Seed a settled x402 payment in the commerce ledger.
fn seed_x402_payment(s: &FakeSeams, key: &str, gross_cents: i64) {
    s.set_setting("cedros_login.base_url", "https://site.example");
    for _ in 0..8 {
        s.push_http_response(200, r#"{"user":{"id":"buyer_42"}}"#);
    }
    s.seed(
        ids::MODEL_LEDGER,
        key,
        json!({
            "reference": key,
            "kind": "payment",
            "status": "succeeded",
            "grossCents": gross_cents,
            "refundCents": 0,
            "currency": "USD",
            "productId": "prod_widget",
            "customerProfileId": "buyer_42",
            "provider": "x402",
            "providerRef": key,
            "payerWallet": BUYER_WALLET,
            "tokenSettlement": {
                "amountAtomic": 15_000_000,
                "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                "decimals": 6
            },
            "createdAt": "2026-06-01T00:00:00Z",
            "processedAt": "2026-06-01T00:00:00Z",
        }),
    );
}

fn request(body: serde_json::Value) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_REFUNDS_REQUEST.into(),
        method: "POST".into(),
        path: "/paywall/v1/refunds/request".into(),
        body: body.to_string(),
        headers: vec![("authorization".into(), "Bearer buyer-session".into())],
        ..Default::default()
    }
}

fn get(refund_id: &str) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_REFUNDS_GET.into(),
        method: "GET".into(),
        path: format!("/paywall/v1/refunds/{refund_id}"),
        ..Default::default()
    }
}

fn body(out: &RouteResponse) -> Value {
    serde_json::from_str(&out.body).unwrap()
}

#[test]
fn request_records_a_pending_refund_for_a_settled_x402_payment() {
    let s = FakeSeams::new();
    seed_x402_payment(&s, PURCHASE_SIG, 1500);

    let resp = handle(
        &s,
        &request(json!({
            "originalPurchaseId": PURCHASE_SIG,
            "recipientWallet": BUYER_WALLET,
            "reason": "changed my mind",
        })),
    )
    .unwrap();
    assert_eq!(resp.status, 200);
    let out = body(&resp);
    assert_eq!(out["status"], "pending");
    assert_eq!(out["amountCents"], 1500);
    assert_eq!(out["recipientWallet"], BUYER_WALLET);
    assert_eq!(out["originalPurchaseId"], PURCHASE_SIG);
    assert_eq!(out["reason"], "changed my mind");
    assert_eq!(out["refundAmountMicrounits"], 15_000_000);
    assert_eq!(out["tokenDecimals"], 6);
    assert_eq!(
        out["paymentMint"],
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    );
    assert!(out["processedAt"].is_null(), "not processed yet");
    assert!(out["signature"].is_null(), "no on-chain signature yet");
    assert_eq!(out["refundId"], derive_refund_id(PURCHASE_SIG));
}

#[test]
fn exact_request_is_idempotent_but_changed_wallet_is_forbidden() {
    let s = FakeSeams::new();
    seed_x402_payment(&s, PURCHASE_SIG, 999);

    let first = body(
        &handle(
            &s,
            &request(
                json!({ "originalPurchaseId": PURCHASE_SIG, "recipientWallet": BUYER_WALLET }),
            ),
        )
        .unwrap(),
    );
    let exact = body(
        &handle(
            &s,
            &request(
                json!({ "originalPurchaseId": PURCHASE_SIG, "recipientWallet": BUYER_WALLET }),
            ),
        )
        .unwrap(),
    );
    assert_eq!(first["refundId"], exact["refundId"]);
    let changed = handle(
        &s,
        &request(json!({
            "originalPurchaseId": PURCHASE_SIG,
            "recipientWallet": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        })),
    )
    .unwrap_err();
    assert_eq!(changed.status, 403);
}

#[test]
fn get_returns_the_recorded_refund() {
    let s = FakeSeams::new();
    seed_x402_payment(&s, PURCHASE_SIG, 2500);
    let refund_id = derive_refund_id(PURCHASE_SIG);
    handle(
        &s,
        &request(json!({ "originalPurchaseId": PURCHASE_SIG, "recipientWallet": BUYER_WALLET })),
    )
    .unwrap();

    let out = body(&handle(&s, &get(&refund_id)).unwrap());
    assert_eq!(out["refundId"], refund_id);
    assert_eq!(out["status"], "pending");
    assert!(out.get("amountCents").is_none());
    assert!(out.get("recipientWallet").is_none());
    assert!(out.get("originalPurchaseId").is_none());
    assert!(out.get("reason").is_none());
    assert!(out.get("paymentMint").is_none());
    assert!(out.get("refundAmountMicrounits").is_none());
}

#[test]
fn request_rejects_a_different_buyer_or_destination_wallet() {
    let s = FakeSeams::new();
    seed_x402_payment(&s, PURCHASE_SIG, 1500);
    let mut payment = s.get_entry(ids::MODEL_LEDGER, PURCHASE_SIG).unwrap();
    payment["customerProfileId"] = json!("another-buyer");
    s.seed(ids::MODEL_LEDGER, PURCHASE_SIG, payment.clone());

    let other_buyer = handle(
        &s,
        &request(json!({
            "originalPurchaseId": PURCHASE_SIG,
            "recipientWallet": BUYER_WALLET
        })),
    )
    .unwrap_err();
    assert_eq!(other_buyer.status, 403);

    payment["customerProfileId"] = json!("buyer_42");
    s.seed(ids::MODEL_LEDGER, PURCHASE_SIG, payment);
    let wrong_wallet = handle(
        &s,
        &request(json!({
            "originalPurchaseId": PURCHASE_SIG,
            "recipientWallet": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        })),
    )
    .unwrap_err();
    assert_eq!(wrong_wallet.status, 403);
}

#[test]
fn legacy_payment_without_authoritative_payer_wallet_fails_closed() {
    let s = FakeSeams::new();
    seed_x402_payment(&s, PURCHASE_SIG, 1500);
    let mut payment = s.get_entry(ids::MODEL_LEDGER, PURCHASE_SIG).unwrap();
    payment.as_object_mut().unwrap().remove("payerWallet");
    s.seed(ids::MODEL_LEDGER, PURCHASE_SIG, payment);

    let error = handle(
        &s,
        &request(json!({
            "originalPurchaseId": PURCHASE_SIG,
            "recipientWallet": BUYER_WALLET
        })),
    )
    .unwrap_err();
    assert_eq!(error.status, 403);
}

#[test]
fn request_rejects_unknown_purchase() {
    let s = FakeSeams::new();
    let err = handle(
        &s,
        &request(json!({ "originalPurchaseId": "nope", "recipientWallet": BUYER_WALLET })),
    )
    .unwrap_err();
    assert_eq!(err.status, 404);
}

#[test]
fn request_rejects_non_x402_payment() {
    let s = FakeSeams::new();
    s.seed(
        ids::MODEL_LEDGER,
        "pi_stripe",
        json!({
            "reference": "pi_stripe", "kind": "payment", "status": "succeeded",
            "grossCents": 1000, "currency": "USD", "provider": "stripe",
            "createdAt": "2026-06-01T00:00:00Z", "processedAt": "2026-06-01T00:00:00Z",
        }),
    );
    let err = handle(
        &s,
        &request(json!({ "originalPurchaseId": "pi_stripe", "recipientWallet": BUYER_WALLET })),
    )
    .unwrap_err();
    assert_eq!(err.status, 422, "not a refundable x402 payment");
}

#[test]
fn request_rejects_already_refunded_payment() {
    let s = FakeSeams::new();
    s.seed(
        ids::MODEL_LEDGER,
        PURCHASE_SIG,
        json!({
            "reference": PURCHASE_SIG, "kind": "payment", "status": "refunded",
            "grossCents": 1500, "refundCents": 1500, "currency": "USD", "provider": "x402",
            "createdAt": "2026-06-01T00:00:00Z", "processedAt": "2026-06-01T00:00:00Z",
        }),
    );
    let err = handle(
        &s,
        &request(json!({ "originalPurchaseId": PURCHASE_SIG, "recipientWallet": BUYER_WALLET })),
    )
    .unwrap_err();
    assert_eq!(err.status, 422, "purchase is not refundable");
}

#[test]
fn request_rejects_invalid_wallet() {
    let s = FakeSeams::new();
    seed_x402_payment(&s, PURCHASE_SIG, 1500);
    let err = handle(
        &s,
        &request(json!({ "originalPurchaseId": PURCHASE_SIG, "recipientWallet": "not-base58!" })),
    )
    .unwrap_err();
    assert_eq!(err.status, 400);
}

#[test]
fn request_requires_purchase_and_wallet() {
    let s = FakeSeams::new();
    assert_eq!(
        handle(&s, &request(json!({ "recipientWallet": BUYER_WALLET })))
            .unwrap_err()
            .status,
        400
    );
    assert_eq!(
        handle(&s, &request(json!({ "originalPurchaseId": PURCHASE_SIG })))
            .unwrap_err()
            .status,
        400
    );
}

#[test]
fn get_unknown_refund_is_404() {
    let s = FakeSeams::new();
    assert_eq!(handle(&s, &get("refund_deadbeef")).unwrap_err().status, 404);
}

#[test]
fn refund_id_is_deterministic_and_prefixed() {
    let a = derive_refund_id(PURCHASE_SIG);
    assert_eq!(a, derive_refund_id(PURCHASE_SIG));
    assert!(a.starts_with("refund_"));
    assert_eq!(a.len(), "refund_".len() + 32, "16 bytes hex");
    assert_ne!(a, derive_refund_id("other"));
}

#[test]
fn purchase_version_race_does_not_create_a_refund_request() {
    let s = FakeSeams::new();
    seed_x402_payment(&s, PURCHASE_SIG, 999);
    let unchanged = s.get_entry(ids::MODEL_LEDGER, PURCHASE_SIG).unwrap();
    s.queue_guarded_race(vec![(ids::MODEL_LEDGER, PURCHASE_SIG, unchanged)]);

    let error = handle(
        &s,
        &request(json!({
            "originalPurchaseId": PURCHASE_SIG,
            "recipientWallet": BUYER_WALLET
        })),
    )
    .unwrap_err();

    assert_eq!(error.status, 409);
    assert!(s
        .get_entry(ids::MODEL_LEDGER, &derive_refund_id(PURCHASE_SIG))
        .is_none());
}

#[test]
fn legacy_request_identity_without_fingerprint_fails_closed() {
    let s = FakeSeams::new();
    seed_x402_payment(&s, PURCHASE_SIG, 999);
    let refund_id = derive_refund_id(PURCHASE_SIG);
    s.seed(
        ids::MODEL_LEDGER,
        &refund_id,
        json!({
            "reference": refund_id, "kind": "refund", "status": "pending",
            "grossCents": 999, "refundCents": 0, "currency": "USD",
            "provider": "x402", "createdAt": "2026-01-01T00:00:00Z",
            "processedAt": "2026-01-01T00:00:00Z",
            "originalPurchaseId": PURCHASE_SIG, "recipientWallet": BUYER_WALLET
        }),
    );

    assert_eq!(
        handle(
            &s,
            &request(json!({
                "originalPurchaseId": PURCHASE_SIG,
                "recipientWallet": BUYER_WALLET
            })),
        )
        .unwrap_err()
        .status,
        409
    );
}
