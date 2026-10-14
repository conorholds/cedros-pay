//! Tests for the Google Play branch. The RS256 signing crypto is proven in
//! `native_store::google`; here we prove config gating, the purchase-state validators,
//! the over-claim gate, and the full one-time + subscription flows.

use super::*;
use crate::fake::FakeSeams;
use crate::ids;
use crate::routes::native_store::VerifyReq;
use serde_json::json;

// Throwaway PKCS#8 RSA-2048 key — KAT only, never a real credential.
const RSA_KEY: &str = r"-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCbdHB89mPUqtKw
ug6TNND3PjvxryplL8prirctNwHQQQKRA9rQSNbak9AueJx2I8i9LcptP0ZIH5ey
pMUJYpIB7YHVT4qvvsmUGDXD/aPCSWoltqspdkUbuEzcHjlxWqHQnB1+eV/YA0Sm
Z/z0YefisfxFzRVPb+JImfMrb1oMvQbbYylsx9y2xJMSB73QLyQHwtk2PvZThPPO
kELW+gHD++yJG/fdqMSc0ql0W6Wk5ZA3qjO4g7Yy2ljf6svp8HWX9FS8yhfOAapN
GjW53KYyq8JK1OcE2RW9CtDblvXGI2z03kO8Vj33OD/v55IQbyYYWo0VJWLtM3ax
rMd/NRJ3AgMBAAECggEADn8fxE93xMu/RRK8rDaXLA9GKMYUdoYr4rZ3WYSRKzn8
wsgwvg6k1pJFLig6MvwoSpf8Eg79/1jO3S5nX3YtNnfPDTTTMotgoepWDTZYcJRH
DUhJEt9AF5Mqu7Yn1i3E/D6qs3IfIXZAjyIQYTvGE4pUg6/ZxmQhHnMYzZqfM6PB
y8qS5O/6KfE0kilEq6VpzIZ4by/elu3y7oSgjyaJxVkL4Ar9u/pUw04/pptknpaF
nf9y9EWneEtL84wW+U6WiL6w3f0DgGrI/HgwsyyCrR2xggPZRY2K4gNUnQq9y2f5
nDQp+oYQI6HvZBAITLFG6iEK16GZ8xMMhNx5X6scBQKBgQDKBl2DmBjL4AMuuKaH
1Tk2ftz7yeGstueiPNGKxP4pXDD6rlMCFwqABPzGgnhAFxtFmtaqkUj00KO1tF4K
ee0eybeyKRZN16BNEEbIoiBYIWNGiLYstaNY60/nPSuMYD5B5gCbUkTvGBd9czob
zcu8BG8Z/b3GdczST38wGp9R/QKBgQDE/OJZYmBPx4N7CYbKqo17WZhExqRMJ4kH
kzrEj/AJQH0AmHXnroeeBM6poHoEb9AwaSIpeKKAoGgDajaBwDSbN1M1SHR/Bvod
HfJlOTIJw3B15/jZSjZI6YOClD8vQD9PnnfcnsLi8DcbKh57ce1M/YhCaPan+nLJ
KkdNCQn2gwKBgQCW6YJZlviO81vtPspHlaQTbVkuTXRjTI5jxwLQoq8pvlBoMmiX
mxag4xjgQP4LAjfBGxVYfQb+ugxQ49eMA+B5qz2pvL+IjpaUeqAlp9Z5fxdlzSIo
69aFyeH6Xtt1FT/sgh/Z5u7PnDOP5s91jZmvbbCAvedRpRXH1NKx4HE7EQKBgBFd
PVKlwlml+6gP2erph9k0t6BwZjE0Vvbs+oQzL/SQ07QGvHX0w42hXNpFBBx6Ar8R
tWo0cRanjSOn7DAZ0klQYixTO7mq0sdYSXK0zP1hVft+vEfjK8/Xjbkn+j3fCvWo
wWYYNJOumxzw5Ij7LPDZdHZuLDf4cr/a0zguMMujAoGAAXAv7CGBG3/sIo2psH1S
cUyl0Zu4LyxkPIoSvnyf6HCJT/jXJsx6tQzHKDE6KzCnyp/qFHwhE1OPrd6A/N4L
Jgujp7cHdn6TVGJDzIyB6NaCDA/ZJI96lgyAfNJvMsSpwhnXT+hMlWjrtYPXIWDz
O8PbHyVA5F4THDN7t9NdPy0=
-----END PRIVATE KEY-----
";

fn configure_google(s: &FakeSeams, key: &str) {
    s.set_setting("native_store.enabled", "true");
    s.set_setting("native_store.google_enabled", "true");
    s.set_setting(
        "native_store.google_service_account_email",
        "svc@proj.iam.gserviceaccount.com",
    );
    s.set_setting("native_store.google_package_name", "com.acme.app");
    s.set_secret("native_store.google_private_key", key);
}

fn seed_google_product(s: &FakeSeams, product_id: &str, google_store_id: &str, price: i64) {
    s.seed(
        ids::MODEL_CATALOG,
        product_id,
        json!({
            "id": product_id,
            "storeProduct": { "google": { "productId": google_store_id } },
            "price": { "amountCents": price, "currency": "usd" },
        }),
    );
}

fn seed_google_subscription(s: &FakeSeams, product_id: &str, google_store_id: &str) {
    s.seed(
        ids::MODEL_CATALOG,
        product_id,
        json!({
            "id": product_id,
            "subscription": { "interval": "monthly" },
            "storeProduct": { "google": { "productId": google_store_id } },
            "price": { "amountCents": 499, "currency": "usd" },
        }),
    );
}

fn google_req(product_id: &str, store_product_id: &str, token: &str) -> VerifyReq {
    VerifyReq {
        product_id: product_id.into(),
        method: "google_play_billing".into(),
        store_product_id: store_product_id.into(),
        transaction_id: None,
        original_transaction_id: None,
        purchase_token: Some(token.into()),
        package_name: None,
        metadata: Default::default(),
    }
}

// ── config gating + input ───────────────────────────────────────────────────────

#[test]
fn google_disabled_is_503() {
    assert_eq!(google_config(&FakeSeams::new()).unwrap_err().status, 503);
}

#[test]
fn google_enabled_but_uncredentialed_is_503() {
    let s = FakeSeams::new();
    s.set_setting("native_store.enabled", "true");
    s.set_setting("native_store.google_enabled", "true");
    assert_eq!(google_config(&s).unwrap_err().status, 503);
}

#[test]
fn client_package_cannot_replace_missing_operator_app_identity() {
    let s = FakeSeams::new();
    s.set_setting("native_store.enabled", "true");
    s.set_setting("native_store.google_enabled", "true");
    s.set_setting(
        "native_store.google_service_account_email",
        "svc@proj.iam.gserviceaccount.com",
    );
    s.set_secret("native_store.google_private_key", RSA_KEY);
    let mut request = google_req("p", "s", "token");
    request.package_name = Some("com.attacker.app".into());
    assert_eq!(verify_google(&s, &request, None).unwrap_err().status, 503);
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn missing_purchase_token_is_422() {
    let s = FakeSeams::new();
    configure_google(&s, "x");
    let mut req = google_req("p", "s", "");
    req.purchase_token = None;
    assert_eq!(verify_google(&s, &req, None).unwrap_err().status, 422);
}

#[test]
fn over_claim_gate_rejects_before_any_network() {
    let s = FakeSeams::new();
    configure_google(&s, "x"); // dummy key: the gate runs before signing
    seed_google_product(&s, "prod_big", "coins_1000", 9999);
    // Claim the expensive product for a cheap store id.
    let err = verify_google(&s, &google_req("prod_big", "coins_100", "tok"), None).unwrap_err();
    assert_eq!(err.status, 403);
    assert_eq!(err.code, "product_mismatch");
}

// ── purchase-state validators ───────────────────────────────────────────────────

#[test]
fn one_time_state_mapping() {
    assert!(check_one_time(&json!({ "purchaseState": 0 })).is_ok());
    assert_eq!(
        check_one_time(&json!({ "purchaseState": 2 }))
            .unwrap_err()
            .status,
        409
    );
    assert_eq!(
        check_one_time(&json!({ "purchaseState": 1 }))
            .unwrap_err()
            .status,
        403
    );
    assert_eq!(check_one_time(&json!({})).unwrap_err().status, 403); // default = not purchased
}

#[test]
fn subscription_state_mapping() {
    let active = json!({
        "subscriptionState": "SUBSCRIPTION_STATE_ACTIVE",
        "lineItems": [{ "productId": "sub_monthly", "expiryTime": "2030-01-01T00:00:00Z" }],
    });
    let (id, status, end) =
        subscription_state(&active, "sub_monthly", "tok_1", 1_700_000_000).unwrap();
    assert_eq!(id, "tok_1");
    assert_eq!(status, "active");
    assert!(end > 1_700_000_000);

    // Expired and past its period end → rejected.
    let expired = json!({
        "subscriptionState": "SUBSCRIPTION_STATE_EXPIRED",
        "lineItems": [{ "productId": "sub_monthly", "expiryTime": "2020-01-01T00:00:00Z" }],
    });
    assert_eq!(
        subscription_state(&expired, "sub_monthly", "tok_1", 1_700_000_000)
            .unwrap_err()
            .status,
        403
    );

    for malformed in [
        json!({
            "subscriptionState": "SUBSCRIPTION_STATE_ACTIVE",
            "lineItems": [{ "productId": "sub_monthly" }],
        }),
        json!({
            "subscriptionState": "SUBSCRIPTION_STATE_UNSPECIFIED",
            "lineItems": [{ "productId": "sub_monthly", "expiryTime": "2030-01-01T00:00:00Z" }],
        }),
    ] {
        assert_eq!(
            subscription_state(&malformed, "sub_monthly", "tok_1", 1_700_000_000)
                .unwrap_err()
                .status,
            403
        );
    }

    let mismatched = json!({
        "subscriptionState": "SUBSCRIPTION_STATE_ACTIVE",
        "lineItems": [{ "productId": "sub_basic", "expiryTime": "2030-01-01T00:00:00Z" }],
    });
    let err = subscription_state(&mismatched, "sub_premium", "tok_1", 1_700_000_000).unwrap_err();
    assert_eq!(err.status, 403);
    assert_eq!(err.code, "product_mismatch");
}

#[path = "native_store_google_flow_tests.rs"]
mod flows;
