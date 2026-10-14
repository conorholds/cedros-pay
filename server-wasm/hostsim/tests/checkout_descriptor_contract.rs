use cedros_pay_extension_domain::{guarded_policy, ids};
use cedros_pay_extension_hostsim::{component_path, Sim};
use serde_json::{json, Value};

#[test]
fn descriptor_is_authenticated_and_buyer_independent_at_component_boundary() {
    let sim = Sim::load(&component_path()).expect("load built component");
    sim.store().seed(
        guarded_policy::CONTROL_MODEL,
        guarded_policy::MARKER_KEY,
        marker(),
    );
    sim.store()
        .set_setting("cedros_login.base_url", "https://login.example");
    sim.store()
        .set_secret(ids::SECRET_CHECKOUT_STRIPE_ACCOUNT, "acct_component");
    let first = invoke(&sim, "buyer-a");
    let second = invoke(&sim, "buyer-b");
    assert_eq!(first, second);
    assert_eq!(first["protocol"], "cedros-pay-checkout");
    assert_eq!(first["replayTtlMs"], 259_200_000_i64);
    let scope = first["providerScope"].as_str().unwrap();
    assert!(scope.starts_with("checkout-provider:"));
    assert_eq!(scope.len(), "checkout-provider:".len() + 64);
}

fn invoke(sim: &Sim, buyer: &str) -> Value {
    sim.store()
        .push_http(200, &json!({"user": {"id": buyer}}).to_string());
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    let (status, body) = runtime
        .block_on(sim.handle(
            "GET",
            "/checkout/descriptor",
            ids::ROUTE_CHECKOUT_DESCRIPTOR,
            vec![("authorization".into(), "Bearer session".into())],
            vec![],
            "",
            r#"{"siteId":"site-a","environment":"production"}"#,
        ))
        .unwrap();
    assert_eq!(status, 200, "{body}");
    serde_json::from_str(&body).unwrap()
}

fn marker() -> Value {
    json!({
        "schemaVersion": 1,
        "capabilityId": guarded_policy::CAPABILITY_ID,
        "minCedrosDataVersion": guarded_policy::MIN_DATA_VERSION,
        "requestSchemaVersion": guarded_policy::REQUEST_SCHEMA_VERSION,
        "hostCommit": guarded_policy::HOST_COMMIT,
        "models": guarded_policy::GUARDED_MODELS,
        "modelSetSha256": guarded_policy::MODEL_SET_SHA256,
        "policy": guarded_policy::ACTIVE_POLICY,
        "active": true,
        "hostTimestamp": "2026-07-11T00:00:00Z"
    })
}
