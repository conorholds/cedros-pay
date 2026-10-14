//! Tests for the native-store verify route. The Apple JWS *crypto* (chain validation
//! and ES256) is proven in `native_store::apple`; here we prove the route's
//! orchestration and — most importantly — its anti-fraud gates, idempotency, config.

use super::*;
use crate::fake::FakeSeams;

fn req(body: Value) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_NATIVE_STORE_VERIFY.into(),
        method: "POST".into(),
        path: "/paywall/v1/native-store/verify".into(),
        headers: vec![("authorization".into(), "Bearer buyer-session".into())],
        body: body.to_string(),
        ..Default::default()
    }
}

/// A real PKCS#8 P-256 PEM (so `sign_store_jwt` parses it) — generated, not Apple's.
fn p8_pem() -> String {
    use p256::ecdsa::SigningKey;
    use p256::pkcs8::EncodePrivateKey;
    SigningKey::from_slice(&[3u8; 32])
        .unwrap()
        .to_pkcs8_pem(Default::default())
        .unwrap()
        .to_string()
}

/// Seed a catalog product that declares an Apple store product id + a price.
fn seed_product(s: &FakeSeams, product_id: &str, apple_store_id: &str, price_cents: i64) {
    s.seed(
        ids::MODEL_CATALOG,
        product_id,
        json!({
            "id": product_id,
            "storeProduct": { "apple": { "productId": apple_store_id } },
            "price": { "amountCents": price_cents, "currency": "usd" },
        }),
    );
}

/// Configure the operator's Apple credentials so `apple_config` succeeds.
fn configure_apple(s: &FakeSeams) {
    s.set_setting("native_store.enabled", "true");
    s.set_setting("native_store.apple_enabled", "true");
    s.set_setting("native_store.apple_issuer_id", "issuer-1");
    s.set_setting("native_store.apple_key_id", "KEYID00001");
    s.set_setting("native_store.apple_bundle_id", "com.acme.app");
    s.set_secret("native_store.apple_private_key", &p8_pem());
}

fn verify_req(product_id: &str, store_product_id: &str) -> VerifyReq {
    VerifyReq {
        product_id: product_id.into(),
        method: "apple_iap".into(),
        store_product_id: store_product_id.into(),
        transaction_id: Some("tx_1".into()),
        original_transaction_id: None,
        purchase_token: None,
        package_name: None,
        metadata: Map::new(),
    }
}

fn apple_tx(product_id: &str, bundle: &str) -> AppleTx {
    AppleTx {
        transaction_id: Some("tx_1".into()),
        original_transaction_id: Some("otx_1".into()),
        product_id: Some(product_id.into()),
        bundle_id: Some(bundle.into()),
        expires_date: None,
        revocation_date: None,
    }
}

// ── method routing + input validation ──────────────────────────────────────────

#[test]
fn google_method_is_a_clear_unavailable_not_a_crash() {
    let s = FakeSeams::new();
    s.set_setting("cedros_login.base_url", "https://site.example");
    s.push_http_response(200, r#"{"user":{"id":"buyer-1"}}"#);
    let err = handle(
        &s,
        &req(json!({ "productId": "p", "method": "google_play_billing", "storeProductId": "s" })),
    )
    .unwrap_err();
    assert_eq!(err.status, 503);
}

#[test]
fn native_store_receipts_cannot_be_claimed_without_a_buyer() {
    let s = FakeSeams::new();
    let mut request = req(json!({
        "productId": "prod_pro", "method": "apple_iap",
        "storeProductId": "com.acme.pro", "transactionId": "tx_1"
    }));
    request.headers.clear();

    let error = handle(&s, &request).unwrap_err();

    assert_eq!(error.status, 401);
    assert!(s.http_requests.borrow().is_empty());
    assert_eq!(s.entry_count(ids::MODEL_LEDGER), 0);
}

#[test]
fn unknown_method_is_422() {
    let s = FakeSeams::new();
    let err = handle(
        &s,
        &req(json!({ "productId": "p", "method": "paypal", "storeProductId": "s" })),
    )
    .unwrap_err();
    assert_eq!(err.status, 422);
}

#[test]
fn missing_ids_are_422() {
    let s = FakeSeams::new();
    let err = handle(&s, &req(json!({ "method": "apple_iap" }))).unwrap_err();
    assert_eq!(err.status, 422);
}

#[test]
fn apple_transaction_identity_cannot_change_the_provider_path() {
    for transaction_id in ["../subscriptions?token=secret", ".."] {
        let s = FakeSeams::new();
        configure_apple(&s);
        let mut request = verify_req("prod_pro", "com.acme.pro");
        request.transaction_id = Some(transaction_id.into());

        let error = verify_apple(&s, &request, None).unwrap_err();

        assert_eq!(error.status, 422);
        assert!(s.http_requests.borrow().is_empty());
    }
}

// ── config gating ──────────────────────────────────────────────────────────────

#[test]
fn apple_disabled_is_503() {
    let s = FakeSeams::new();
    let err = apple_config(&s).unwrap_err();
    assert_eq!(err.status, 503);
}

#[test]
fn apple_enabled_but_uncredentialed_is_503() {
    let s = FakeSeams::new();
    s.set_setting("native_store.enabled", "true");
    s.set_setting("native_store.apple_enabled", "true");
    // no issuer/key/secret
    let err = apple_config(&s).unwrap_err();
    assert_eq!(err.status, 503);
}

#[test]
fn fully_configured_apple_config_loads() {
    let s = FakeSeams::new();
    configure_apple(&s);
    let cfg = apple_config(&s).unwrap();
    assert_eq!(cfg.issuer_id, "issuer-1");
    assert_eq!(cfg.key_id, "KEYID00001");
    assert_eq!(cfg.bundle_id.as_deref(), Some("com.acme.app"));
    assert!(!cfg.allow_sandbox);
}

// ── the anti-fraud gates ───────────────────────────────────────────────────────

#[test]
fn happy_path_records_a_succeeded_ledger_row() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    seed_product(&s, "prod_pro", "com.acme.pro", 999);
    let resp = finalize_apple(
        &s,
        &verify_req("prod_pro", "com.acme.pro"),
        Some("user_1".into()),
        Some("com.acme.app"),
        apple_tx("com.acme.pro", "com.acme.app"),
    )
    .unwrap();
    assert_eq!(resp.status, 200);
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["success"], true);
    assert_eq!(out["transactionId"], "tx_1");
    assert_eq!(out["method"], "apple_iap");
    assert!(out.get("subscriptionStatus").is_none(), "one-time purchase");

    assert_eq!(s.entry_count(ids::MODEL_LEDGER), 1);
    let row = s.get_entry(ids::MODEL_LEDGER, "apple-tx:tx_1").unwrap();
    assert_eq!(row["status"], "succeeded");
    assert_eq!(row["provider"], "apple_app_store");
    assert_eq!(row["providerRef"], "tx_1");
    assert_eq!(row["productId"], "prod_pro");
    assert_eq!(row["grossCents"], 999);
    assert_eq!(row["customerProfileId"], "user_1");

    // Grants access + counts revenue, exactly like the other paid rails.
    assert_eq!(
        s.event_count(ids::EVENT_ENTITLEMENT_CHANGED),
        1,
        "entitlement signalled"
    );
    assert_eq!(
        s.event_count(ids::EVENT_PAYMENT_SUCCEEDED),
        1,
        "revenue counted"
    );
}

#[test]
fn gate1_receipt_product_must_match_claimed_store_product() {
    let s = FakeSeams::new();
    seed_product(&s, "prod_pro", "com.acme.pro", 999);
    // Client claims store product "com.acme.pro" but Apple's receipt is for "com.acme.cheap".
    let err = finalize_apple(
        &s,
        &verify_req("prod_pro", "com.acme.pro"),
        None,
        None,
        apple_tx("com.acme.cheap", "com.acme.app"),
    )
    .unwrap_err();
    assert_eq!(err.status, 403);
    assert_eq!(err.code, "product_mismatch");
    assert_eq!(s.entry_count(ids::MODEL_LEDGER), 0, "nothing recorded");
}

#[test]
fn apple_receipt_transaction_must_match_the_requested_lookup() {
    let s = FakeSeams::new();
    seed_product(&s, "prod_pro", "com.acme.pro", 999);
    let mut transaction = apple_tx("com.acme.pro", "com.acme.app");
    transaction.transaction_id = Some("tx_other".into());

    let error = finalize_apple(
        &s,
        &verify_req("prod_pro", "com.acme.pro"),
        Some("user_1".into()),
        Some("com.acme.app"),
        transaction,
    )
    .unwrap_err();

    assert_eq!(error.status, 403);
    assert_eq!(error.code, "transaction_mismatch");
    assert_eq!(s.entry_count(ids::MODEL_LEDGER), 0);
}

#[test]
fn gate2_catalog_product_must_declare_the_store_product() {
    let s = FakeSeams::new();
    // The expensive cedros product declares a DIFFERENT apple store id than what was bought.
    seed_product(&s, "prod_expensive", "com.acme.expensive", 9999);
    let err = finalize_apple(
        &s,
        &verify_req("prod_expensive", "com.acme.cheap"),
        None,
        None,
        apple_tx("com.acme.cheap", "com.acme.app"),
    )
    .unwrap_err();
    assert_eq!(
        err.status, 403,
        "cannot claim an expensive product for a cheap purchase"
    );
    assert_eq!(err.code, "product_mismatch");
}

#[test]
fn gate3_bundle_must_match_the_operators_app() {
    let s = FakeSeams::new();
    seed_product(&s, "prod_pro", "com.acme.pro", 999);
    let err = finalize_apple(
        &s,
        &verify_req("prod_pro", "com.acme.pro"),
        None,
        Some("com.acme.app"),
        apple_tx("com.acme.pro", "com.evil.app"),
    )
    .unwrap_err();
    assert_eq!(err.status, 403);
    assert_eq!(err.code, "bundle_mismatch");
}

#[test]
fn revoked_purchase_is_rejected() {
    let s = FakeSeams::new();
    seed_product(&s, "prod_pro", "com.acme.pro", 999);
    let mut tx = apple_tx("com.acme.pro", "com.acme.app");
    tx.revocation_date = Some(1_700_000_500_000);
    let err =
        finalize_apple(&s, &verify_req("prod_pro", "com.acme.pro"), None, None, tx).unwrap_err();
    assert_eq!(err.status, 403);
    assert_eq!(err.code, "purchase_revoked");
}

#[test]
fn unknown_catalog_product_is_404() {
    let s = FakeSeams::new();
    let err = finalize_apple(
        &s,
        &verify_req("ghost", "com.acme.pro"),
        None,
        None,
        apple_tx("com.acme.pro", "com.acme.app"),
    )
    .unwrap_err();
    assert_eq!(err.status, 404);
}

// ── idempotency + subscriptions ────────────────────────────────────────────────

#[test]
fn replaying_the_same_transaction_is_idempotent() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    seed_product(&s, "prod_pro", "com.acme.pro", 999);
    let run = || {
        finalize_apple(
            &s,
            &verify_req("prod_pro", "com.acme.pro"),
            Some("user_1".into()),
            Some("com.acme.app"),
            apple_tx("com.acme.pro", "com.acme.app"),
        )
        .unwrap()
    };
    assert_eq!(run().status, 200);
    assert_eq!(run().status, 200, "replay still succeeds");
    assert_eq!(
        s.entry_count(ids::MODEL_LEDGER),
        1,
        "but only one ledger row"
    );
    // The entitlement + revenue events fire once, not per replay (no double-count).
    assert_eq!(s.event_count(ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
}

#[test]
fn subscription_receipt_surfaces_period_and_status() {
    let s = FakeSeams::new();
    s.set_now(1_700_000_000);
    seed_product(&s, "prod_sub", "com.acme.sub", 499);
    let mut tx = apple_tx("com.acme.sub", "com.acme.app");
    // expires in the future (ms) → active subscription.
    tx.expires_date = Some(1_700_003_600_000);
    let resp = finalize_apple(
        &s,
        &verify_req("prod_sub", "com.acme.sub"),
        Some("user_1".into()),
        Some("com.acme.app"),
        tx,
    )
    .unwrap();
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["subscriptionStatus"], "active");
    assert_eq!(out["subscriptionId"], "otx_1");
    assert!(out["currentPeriodEnd"]
        .as_str()
        .unwrap()
        .starts_with("2023-11-14"));

    // A durable subscription record is written so /entitlements/check grants recurring
    // access (keyed by the subscription id = Apple original_transaction_id).
    let sub = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "otx_1").unwrap();
    assert_eq!(sub["status"], "active");
    assert_eq!(sub["customerRef"], "user_1");
    assert_eq!(sub["priceId"], "prod_sub");
    assert_eq!(sub["provider"], "apple_app_store");
    assert!(sub["currentPeriodEnd"]
        .as_str()
        .unwrap()
        .starts_with("2023-11-14"));
}

#[test]
fn expired_subscription_reports_expired() {
    let s = FakeSeams::new();
    s.set_now(1_800_000_000);
    seed_product(&s, "prod_sub", "com.acme.sub", 499);
    let mut tx = apple_tx("com.acme.sub", "com.acme.app");
    tx.expires_date = Some(1_700_003_600_000); // in the past relative to now
    let resp = finalize_apple(
        &s,
        &verify_req("prod_sub", "com.acme.sub"),
        None,
        Some("com.acme.app"),
        tx,
    )
    .unwrap();
    let out: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(out["subscriptionStatus"], "expired");
}

// ── helpers + egress error handling ─────────────────────────────────────────────

#[test]
fn declared_store_product_id_reads_both_shapes_and_platforms() {
    assert_eq!(
        declared_store_product_id(
            &json!({ "storeProduct": { "apple": { "productId": "a" } } }),
            "apple"
        ),
        Some("a".into())
    );
    assert_eq!(
        declared_store_product_id(
            &json!({ "storeBilling": { "google": { "productId": "b" } } }),
            "google"
        ),
        Some("b".into())
    );
    assert_eq!(
        declared_store_product_id(&json!({ "name": "x" }), "apple"),
        None
    );
}

#[test]
fn fetch_propagates_an_apple_http_error() {
    let s = FakeSeams::new();
    configure_apple(&s);
    s.push_http_response(404, r#"{"errorCode":4040010}"#);
    let cfg = apple_config(&s).unwrap();
    let err = fetch_apple_tx(&s, &cfg, "tx_1").unwrap_err();
    assert_eq!(
        err.status, 502,
        "an upstream apple failure surfaces as a verification error"
    );
}
