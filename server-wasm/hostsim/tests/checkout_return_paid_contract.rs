use cedros_pay_extension_domain::{guarded_policy, ids};
use cedros_pay_extension_hostsim::{component_path, Sim};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

const CONTEXT: &str = r#"{"siteId":"site-a","environment":"production"}"#;

#[test]
fn component_verifies_only_paid_and_replays_durable_proof_without_stripe() {
    let sim = configured_sim();
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    queue_auth(&sim);
    let quote = post(
        &sim,
        &runtime,
        ids::ROUTE_CHECKOUT_QUOTE,
        "/checkout/quote",
        "quote-key",
        quote_body(),
    );
    queue_auth(&sim);
    sim.store().push_http(
        200,
        r#"{"id":"cs_component_paid","url":"https://checkout.stripe.com/component"}"#,
    );
    let checkout = post(
        &sim,
        &runtime,
        ids::ROUTE_CHECKOUT_CREATE,
        "/checkout",
        "checkout-key",
        checkout_body(quote["operationId"].as_str().unwrap()),
    );
    let operation = checkout["operationId"].as_str().unwrap();
    let artifact = checkout["returnArtifact"].as_str().unwrap();

    queue_auth(&sim);
    queue_retrieval(&sim, operation, artifact, "unpaid");
    let first = verify(&sim, &runtime, artifact);
    assert_eq!(first["status"], "indeterminate");
    assert!(sim.store().get(ids::MODEL_LEDGER, artifact).is_none());

    queue_auth(&sim);
    queue_retrieval(&sim, operation, artifact, "paid");
    let paid = verify(&sim, &runtime, artifact);
    assert_eq!(
        paid,
        json!({"status":"verified","checkoutAttemptId":"attempt-1"})
    );
    let before_order_read = sim.store().http_fetch_calls;
    let (status, orders) = runtime.block_on(sim.handle(
        "GET", "/portal-source/v1/orders", "cedros-pay:portal-orders-list", vec![], vec![], "",
        r#"{"authenticated":true,"actorId":"owner","principalId":"cedros-core:portal-orders","authScheme":"managed-source","capabilityClaims":["cedros-pay:portal-orders-list"],"siteId":"site-a"}"#,
    )).expect("mounted order route");
    assert_eq!(status, 200, "{orders}");
    let orders: Value = serde_json::from_str(&orders).unwrap();
    assert_eq!(orders["items"].as_array().unwrap().len(), 1);
    assert_eq!(orders["items"][0]["paymentStatus"], "paid");
    assert_eq!(
        sim.store().http_fetch_calls,
        before_order_read,
        "order reads do not reconcile payments"
    );
    let before_replay = sim.store().http_fetch_calls;
    queue_auth(&sim);
    let replay = verify(&sim, &runtime, artifact);
    assert_eq!(replay, paid);
    assert_eq!(sim.store().http_fetch_calls, before_replay + 1);
}

fn configured_sim() -> Sim {
    let sim = Sim::load(&component_path()).expect("load built component");
    let mut store = sim.store();
    store.seed(
        guarded_policy::CONTROL_MODEL,
        guarded_policy::MARKER_KEY,
        marker(),
    );
    store.set_setting("cedros_login.base_url", "https://login.example");
    store.set_secret(ids::SECRET_CHECKOUT_STRIPE_ACCOUNT, "acct_component");
    store.set_secret(
        ids::SECRET_CHECKOUT_CONTEXT_MAC,
        "component-context-mac-key-32-bytes",
    );
    store.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_redacted");
    store.set_setting(
        ids::SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS,
        r#"["https://shop.example"]"#,
    );
    store.set_setting(
        "checkout.tipping_policy",
        r#"{"schemaVersion":1,"enabled":false,"allowFixed":false,"allowPercentage":false,"maxAmountCents":0,"maxPercentageBps":0}"#,
    );
    store.seed(
        ids::MODEL_CATALOG,
        "product-1",
        json!({"id":"product-1","active":true,"title":"Product","price":{"amountCents":100,"currency":"USD"},"paymentResource":"product-1"}),
    );
    drop(store);
    sim
}

fn post(
    sim: &Sim,
    runtime: &tokio::runtime::Runtime,
    route: &str,
    path: &str,
    key: &str,
    body: String,
) -> Value {
    let mut headers = vec![
        ("authorization".into(), "Bearer session".into()),
        ("content-type".into(), "application/json".into()),
    ];
    if !key.is_empty() {
        headers.push(("idempotency-key".into(), key.into()));
    }
    let (status, response) = runtime
        .block_on(sim.handle("POST", path, route, headers, vec![], &body, CONTEXT))
        .unwrap();
    assert_eq!(status, 200, "{response}");
    serde_json::from_str(&response).unwrap()
}

fn queue_auth(sim: &Sim) {
    sim.store().push_http(200, r#"{"user":{"id":"buyer-1"}}"#);
}

fn quote_body() -> String {
    json!({"schemaVersion":1,"idempotencyKey":"quote-key","attemptId":"attempt-1","clientMaterialSha256":"1".repeat(64),"source":{"kind":"items","items":[{"resource":"product-1","qty":1}]},"customerContext":{"fulfillment":{"kind":"digital"},"returnUrls":{"success":"https://shop.example/success","cancel":"https://shop.example/cancel"}},"requestedPaymentMethods":["stripe"]}).to_string()
}

fn checkout_body(quote: &str) -> String {
    json!({"schemaVersion":1,"idempotencyKey":"checkout-key","attemptId":"attempt-1","clientMaterialSha256":"2".repeat(64),"quoteOperationId":quote,"paymentMethod":"stripe","customerContext":{"fulfillment":{"kind":"digital"},"returnUrls":{"success":"https://shop.example/success","cancel":"https://shop.example/cancel"}},"railProof":{"kind":"stripe"}}).to_string()
}

fn verify_body(artifact: &str) -> String {
    json!({"schemaVersion":1,"expectedAttemptId":"attempt-1","returnArtifact":artifact}).to_string()
}

fn verify(sim: &Sim, runtime: &tokio::runtime::Runtime, artifact: &str) -> Value {
    post(
        sim,
        runtime,
        ids::ROUTE_CHECKOUT_RETURN_VERIFY,
        "/checkout/return/verify",
        "",
        verify_body(artifact),
    )
}

fn queue_retrieval(sim: &Sim, operation: &str, artifact: &str, payment: &str) {
    let key = format!(
        "checkout-operation:{}",
        operation.strip_prefix("payop_").unwrap()
    );
    let record = sim
        .store()
        .get(
            cedros_pay_extension_domain::checkout_contract::OPERATION_MODEL,
            &key,
        )
        .unwrap();
    let scope = record["providerScope"].as_str().unwrap();
    let response = json!({
        "id": artifact, "url": "https://checkout.stripe.com/component",
        "mode": "payment", "amount_total": 100, "currency": "usd",
        "status": if payment == "paid" { "complete" } else { "open" },
        "expires_at": record["canonicalContext"]["stripe_request"]["expiresAt"],
        "payment_status": payment,
        "metadata": {
            "cedros_pay_ledger_key": key,
            "cedros_pay_attempt_id": attempt_hash(scope, "attempt-1"),
            "cedros_pay_operation_id": operation,
            "cedros_pay_scope_hash": hash(b"cedros-pay-checkout-provider-scope\0", scope),
            "cedros_pay_material_hash": record["materialFingerprint"],
        }
    });
    sim.store().push_http(200, &response.to_string());
}

fn attempt_hash(scope: &str, attempt: &str) -> String {
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-checkout-attempt-metadata\0");
    for value in [scope, attempt] {
        digest.update((value.len() as u64).to_be_bytes());
        digest.update(value.as_bytes());
    }
    format!("{:x}", digest.finalize())
}

fn hash(domain: &[u8], value: &str) -> String {
    let mut digest = Sha256::new();
    digest.update(domain);
    digest.update(value.as_bytes());
    format!("{:x}", digest.finalize())
}

fn marker() -> Value {
    json!({"schemaVersion":1,"capabilityId":guarded_policy::CAPABILITY_ID,"minCedrosDataVersion":guarded_policy::MIN_DATA_VERSION,"requestSchemaVersion":guarded_policy::REQUEST_SCHEMA_VERSION,"hostCommit":guarded_policy::HOST_COMMIT,"models":guarded_policy::GUARDED_MODELS,"modelSetSha256":guarded_policy::MODEL_SET_SHA256,"policy":guarded_policy::ACTIVE_POLICY,"active":true,"hostTimestamp":"2026-07-11T00:00:00Z"})
}
