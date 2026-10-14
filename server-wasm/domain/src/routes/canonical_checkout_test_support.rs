use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::fake::FakeSeams;
use crate::reqresp::{RouteRequest, RouteResponse};

use super::{handle, ROUTE_QUOTE};

pub(crate) fn setup() -> FakeSeams {
    let seams = FakeSeams::new();
    seams.set_secret(
        crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT,
        "acct_route_test",
    );
    seams.set_secret(
        crate::ids::SECRET_CHECKOUT_CONTEXT_MAC,
        "test-only-checkout-context-mac-key-32-bytes",
    );
    seams.set_secret(crate::ids::SECRET_STRIPE_KEY, "sk_test_redacted");
    seams.set_setting("cedros_login.base_url", "https://login.example");
    seams.set_setting(
        crate::ids::SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS,
        r#"["https://shop.example","https://shop.example.test"]"#,
    );
    seams.set_setting(
        "checkout.tipping_policy",
        r#"{"schemaVersion":1,"enabled":true,"allowFixed":true,"allowPercentage":true,"maxAmountCents":10000,"maxPercentageBps":2500}"#,
    );
    crate::guarded_policy::enroll(&seams).unwrap();
    seams.seed(
        crate::ids::MODEL_CATALOG,
        "product-1",
        json!({
            "id": "product-1", "active": true, "title": "Authoritative product",
            "price": { "amountCents": 725, "currency": "USD" },
            "paymentResource": "product-1"
        }),
    );
    seams
}

pub(super) fn queue_auth(seams: &FakeSeams, user_id: &str) {
    seams.push_http_response(200, &json!({"user": {"id": user_id}}).to_string());
}

pub(super) fn request(
    route_id: &str,
    method: &str,
    path: &str,
    body: String,
    idempotency_key: Option<&str>,
    site: &str,
) -> RouteRequest {
    let mut headers = vec![("authorization".into(), "Bearer buyer-session".into())];
    if method == "POST" {
        headers.push(("content-type".into(), "application/json".into()));
    }
    if let Some(key) = idempotency_key {
        headers.push(("idempotency-key".into(), key.into()));
    }
    RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: path.into(),
        headers,
        body,
        context_json: json!({
            "siteId": site,
            "environment": "production",
            "actorId": "untrusted-host-admin-ignored"
        })
        .to_string(),
        ..Default::default()
    }
}

pub(super) fn quote(seams: &FakeSeams, key: &str, site: &str) -> Value {
    queue_auth(seams, "buyer-1");
    let request = request(
        ROUTE_QUOTE,
        "POST",
        "/checkout/quote",
        quote_body(key, json!(["stripe"])),
        Some(key),
        site,
    );
    ok_json(handle(seams, &request).unwrap())
}

pub(super) fn quote_body(key: &str, methods: Value) -> String {
    json!({
        "schemaVersion": 1,
        "idempotencyKey": key,
        "attemptId": "attempt-1",
        "clientMaterialSha256": "1".repeat(64),
        "source": { "kind": "items", "items": [{ "resource": "product-1", "qty": 2 }] },
        "customerContext": {
            "fulfillment": { "kind": "digital" },
            "contact": { "email": "buyer@example.com" },
            "returnUrls": {
                "success": "https://shop.example/success",
                "cancel": "https://shop.example/cancel"
            }
        },
        "tip": { "kind": "fixed", "amountCents": 50 },
        "requestedPaymentMethods": methods
    })
    .to_string()
}

pub(super) fn checkout_body(
    key: &str,
    quote_operation_id: &str,
    method: &str,
    transaction: Option<&str>,
) -> String {
    let proof = match method {
        "x402" => json!({ "kind": "x402", "transaction": transaction.unwrap() }),
        "credits" => json!({ "kind": "credits" }),
        _ => json!({ "kind": "stripe" }),
    };
    json!({
        "schemaVersion": 1,
        "idempotencyKey": key,
        "attemptId": "attempt-1",
        "clientMaterialSha256": "2".repeat(64),
        "quoteOperationId": quote_operation_id,
        "paymentMethod": method,
        "customerContext": {
            "fulfillment": { "kind": "digital" },
            "contact": { "email": "buyer@example.com" },
            "returnUrls": {
                "success": "https://shop.example/success",
                "cancel": "https://shop.example/cancel"
            }
        },
        "railProof": proof
    })
    .to_string()
}

pub(super) fn resolve_body(operation_id: &str, artifact: &str) -> String {
    json!({
        "schemaVersion": 1,
        "operationId": operation_id,
        "expectedAttemptId": "attempt-1",
        "returnArtifact": artifact
    })
    .to_string()
}

pub(super) fn verify_body(artifact: &str) -> String {
    json!({
        "schemaVersion": 1,
        "expectedAttemptId": "attempt-1",
        "returnArtifact": artifact
    })
    .to_string()
}

pub(super) fn ok_json(response: RouteResponse) -> Value {
    assert_eq!(response.status, 200);
    serde_json::from_str(&response.body).unwrap()
}

pub(crate) fn retrieval(
    seams: &FakeSeams,
    operation_id: &str,
    artifact: &str,
    payment_status: &str,
) -> String {
    let key = crate::checkout_contract::checkout_operation_key(operation_id).unwrap();
    let record = seams
        .get_entry(crate::checkout_contract::OPERATION_MODEL, &key)
        .unwrap();
    let quote_id = record["canonicalContext"]["quote_operation_id"]
        .as_str()
        .unwrap();
    let quote_key = crate::checkout_contract::checkout_operation_key(quote_id).unwrap();
    let quote = seams
        .get_entry(crate::checkout_contract::OPERATION_MODEL, &quote_key)
        .unwrap();
    let snapshot = &quote["canonicalContext"]["snapshot"];
    let scope = record["providerScope"].as_str().unwrap();
    json!({
        "id": artifact,
        "url": "https://checkout.stripe.com/resolved",
        "mode": "payment",
        "status": if payment_status == "paid" { "complete" } else { "open" },
        "expires_at": record["canonicalContext"]["stripe_request"]["expiresAt"],
        "amount_total": snapshot["totalCents"],
        "currency": snapshot["currency"].as_str().unwrap().to_ascii_lowercase(),
        "payment_status": payment_status,
        "payment_intent": "pi_canonical",
        "metadata": {
            "cedros_pay_ledger_key": key,
            "cedros_pay_attempt_id": attempt_hash(scope, record["checkoutAttemptId"].as_str().unwrap()),
            "cedros_pay_operation_id": operation_id,
            "cedros_pay_scope_hash": scope_hash(scope),
            "cedros_pay_material_hash": record["materialFingerprint"]
        }
    })
    .to_string()
}

fn scope_hash(scope: &str) -> String {
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-checkout-provider-scope\0");
    digest.update(scope.as_bytes());
    hex::encode(digest.finalize())
}

fn attempt_hash(scope: &str, attempt: &str) -> String {
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-checkout-attempt-metadata\0");
    for value in [scope, attempt] {
        digest.update((value.len() as u64).to_be_bytes());
        digest.update(value.as_bytes());
    }
    hex::encode(digest.finalize())
}
