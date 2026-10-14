//! Component-boundary coverage for the distinct resolve and return contracts.

use cedros_pay_extension_domain::{guarded_policy, ids};
use cedros_pay_extension_hostsim::{component_path, Sim};
use serde_json::json;

#[test]
fn return_verify_is_operationless_while_resolve_requires_operation_id() {
    let sim = Sim::load(&component_path()).expect("load built component");
    sim.store().seed(
        guarded_policy::CONTROL_MODEL,
        guarded_policy::MARKER_KEY,
        marker(),
    );
    let headers = vec![
        ("authorization".into(), "Bearer opaque-session".into()),
        ("content-type".into(), "application/json".into()),
    ];
    let operationless = json!({
        "schemaVersion": 1,
        "expectedAttemptId": "attempt-01HQEXAMPLE",
        "returnArtifact": "cs_test_example",
    });
    let mut injected = operationless.clone();
    injected["operationId"] = json!(format!("payop_{}", "1".repeat(64)));
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    let (status, body) = runtime
        .block_on(sim.handle(
            "POST",
            "/checkout/return/verify",
            ids::ROUTE_CHECKOUT_RETURN_VERIFY,
            headers.clone(),
            vec![],
            &injected.to_string(),
            r#"{"siteId":"site-a","environment":"production"}"#,
        ))
        .unwrap();
    assert_eq!(status, 400, "{body}");
    let (status, body) = runtime
        .block_on(sim.handle(
            "POST",
            "/checkout/resolve",
            ids::ROUTE_CHECKOUT_RESOLVE,
            headers,
            vec![],
            &operationless.to_string(),
            r#"{"siteId":"site-a","environment":"production"}"#,
        ))
        .unwrap();
    assert_eq!(status, 400, "{body}");
}

fn marker() -> serde_json::Value {
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
        "hostTimestamp": "2026-07-11T00:00:00Z",
    })
}
