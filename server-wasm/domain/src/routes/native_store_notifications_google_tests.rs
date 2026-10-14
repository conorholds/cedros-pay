//! Google RTDN route reconciliation tests.

use super::*;
use crate::fake::FakeSeams;
use serde_json::{json, Value};

fn seed_sub_with_provider_ref(
    seams: &FakeSeams,
    id: &str,
    provider_ref: &str,
    status: &str,
    customer: &str,
    product: &str,
    provider: &str,
) {
    seams.seed(
        ids::MODEL_SUBSCRIPTIONS,
        id,
        json!({
            "subscriptionId": id, "customerRef": customer, "priceId": product,
            "status": status, "provider": provider, "providerRef": provider_ref,
            "currentPeriodEnd": "2030-01-01T00:00:00Z", "cancelAtPeriodEnd": false,
            "createdAt": "2023-01-01T00:00:00Z", "updatedAt": "2023-01-01T00:00:00Z"
        }),
    );
}

fn seed_google_sub(seams: &FakeSeams, id: &str, status: &str, customer: &str, product: &str) {
    seed_sub_with_provider_ref(seams, id, id, status, customer, product, GOOGLE_PROVIDER);
}

fn seed_google_ledger(
    seams: &FakeSeams,
    reference: &str,
    gross: i64,
    customer: &str,
    product: &str,
) {
    seams.seed(
        ids::MODEL_LEDGER,
        reference,
        json!({
            "reference": reference, "kind": "payment", "status": "succeeded",
            "grossCents": gross, "refundCents": 0, "currency": "usd",
            "customerProfileId": customer, "productId": product, "provider": GOOGLE_PROVIDER,
            "providerRef": reference, "createdAt": "2023-01-01T00:00:00Z",
            "processedAt": "2023-01-01T00:00:00Z"
        }),
    );
}

// ── Google RTDN ──────────────────────────────────────────────────────────────

// Throwaway PKCS#8 RSA-2048 key so the service-account assertion signs (KAT only).
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

fn configure_google(s: &FakeSeams) {
    s.set_setting("native_store.google_service_account_email", "svc@proj.iam");
    s.set_setting("native_store.google_package_name", "com.acme.app");
    s.set_setting(
        "native_store.google_push_service_account_email",
        "push@proj.iam.gserviceaccount.com",
    );
    s.set_setting(
        "native_store.google_push_audience",
        "https://site.example/extensions/cedros-pay/paywall/v1/native-store/google/notifications",
    );
    s.set_secret("native_store.google_private_key", RSA_KEY);
    s.push_http_response(
        200,
        r#"{"email":"push@proj.iam.gserviceaccount.com","aud":"https://site.example/extensions/cedros-pay/paywall/v1/native-store/google/notifications","email_verified":"true","iss":"https://accounts.google.com","exp":"4102444800"}"#,
    );
}

fn google_req(mut rtdn: Value) -> RouteRequest {
    rtdn["packageName"] = json!("com.acme.app");
    google_req_for_package(rtdn)
}

fn google_req_for_package(rtdn: Value) -> RouteRequest {
    use base64::engine::general_purpose::STANDARD;
    use base64::Engine;
    RouteRequest {
        route_id: ids::ROUTE_NATIVE_STORE_GOOGLE_NOTIFICATION.into(),
        method: "POST".into(),
        path: "/paywall/v1/native-store/google/notifications".into(),
        headers: vec![(
            "authorization".into(),
            "Bearer aaaaaaaaaaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbbbbbbbbbb.cccccccccccccccccccccccc"
                .into(),
        )],
        body: json!({ "message": { "data": STANDARD.encode(rtdn.to_string()) } }).to_string(),
        ..Default::default()
    }
}

#[path = "native_store_notifications_google_flow_tests.rs"]
mod flows;
