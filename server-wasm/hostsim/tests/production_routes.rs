//! Component-level activation coverage for production checkout/cart routes.

use std::collections::BTreeSet;

use cedros_pay_extension_domain::{guarded_policy, ids, time, versioned_cart};
use cedros_pay_extension_hostsim::{component_path, Sim};
use serde_json::{json, Value};

type Route = (&'static str, &'static str, &'static str);

fn sim() -> Sim {
    Sim::load(&component_path()).expect("load built component")
}

fn rt() -> tokio::runtime::Runtime {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
}

fn guarded_routes() -> [Route; 11] {
    [
        (
            ids::ROUTE_CHECKOUT_DESCRIPTOR,
            "GET",
            "/checkout/descriptor",
        ),
        (ids::ROUTE_CHECKOUT_QUOTE, "POST", "/checkout/quote"),
        (ids::ROUTE_CHECKOUT_CREATE, "POST", "/checkout"),
        (ids::ROUTE_CHECKOUT_STATUS, "GET", "/checkout/{operationId}"),
        (ids::ROUTE_CHECKOUT_RESOLVE, "POST", "/checkout/resolve"),
        (
            ids::ROUTE_CHECKOUT_RETURN_VERIFY,
            "POST",
            "/checkout/return/verify",
        ),
        (versioned_cart::ROUTE_OPEN, "POST", "/cart/open"),
        (versioned_cart::ROUTE_READ, "POST", "/cart/read"),
        (versioned_cart::ROUTE_ROTATE, "POST", "/cart/rotate"),
        (versioned_cart::ROUTE_APPLY, "POST", "/cart/apply"),
        (
            ids::ROUTE_ASSISTANT_X402_PURCHASE,
            "POST",
            "/assistant/v1/x402/purchase",
        ),
    ]
}

#[test]
fn lists_checkout_cart_and_enrollment_without_v2_aliases() {
    let routes = rt().block_on(sim().list_routes()).unwrap();
    let actual = routes.iter().cloned().collect::<BTreeSet<_>>();
    for route in guarded_routes() {
        assert!(actual.contains(&tuple(route)), "missing route: {route:?}");
    }
    assert!(actual.contains(&tuple((
        ids::ROUTE_GUARDED_POLICY_ENROLL,
        "POST",
        "/admin/guarded-policy/enroll",
    ))));
    assert!(routes
        .iter()
        .all(|(id, _, path)| !id.contains("checkout-v2") && !path.contains("/v2")));
}

#[test]
fn missing_marker_rejects_every_guarded_route_without_effects() {
    let sim = sim();
    for (route_id, method, path) in guarded_routes() {
        let path = invocation_path(path);
        let (status, body) = rt()
            .block_on(sim.handle(method, path, route_id, vec![], vec![], "{}", "{}"))
            .unwrap();
        assert_eq!(status, 503, "{route_id}: {body}");
        assert_eq!(error_code(&body), "guarded_write_policy_unavailable");
    }
    let store = sim.store();
    assert_eq!(store.mutation_calls, 0);
    assert_eq!(store.http_fetch_calls, 0);
    assert_eq!(store.provider_calls, 0);
}

#[test]
fn exact_marker_passes_shared_and_local_route_guards() {
    let sim = sim();
    sim.store().seed(
        guarded_policy::CONTROL_MODEL,
        guarded_policy::MARKER_KEY,
        marker(),
    );
    for (route_id, method, path) in guarded_routes().into_iter().take(10) {
        let path = invocation_path(path);
        let (status, body) = rt()
            .block_on(sim.handle(method, path, route_id, vec![], vec![], "{}", "{}"))
            .unwrap();
        assert_ne!(
            error_code(&body),
            "guarded_write_policy_unavailable",
            "{route_id}: {status} {body}"
        );
    }
}

#[test]
fn enrollment_activates_the_exact_marker() {
    let sim = sim();
    sim.store().now = time::parse_iso("2026-07-11T00:00:00Z").unwrap();
    let context = json!({
        "authenticated": true,
        "systemAdmin": true,
        "csrfVerified": true,
    })
    .to_string();
    let (status, body) = rt()
        .block_on(sim.handle(
            "POST",
            "/admin/guarded-policy/enroll",
            ids::ROUTE_GUARDED_POLICY_ENROLL,
            vec![],
            vec![],
            "{}",
            &context,
        ))
        .unwrap();
    assert_eq!(status, 200, "{body}");
    let stored = sim
        .store()
        .get(guarded_policy::CONTROL_MODEL, guarded_policy::MARKER_KEY)
        .expect("durable guarded marker");
    assert_eq!(stored["modelSetSha256"], guarded_policy::MODEL_SET_SHA256);
    assert_eq!(stored["models"], json!(guarded_policy::GUARDED_MODELS));
    assert_eq!(stored["active"], true);
    assert!(stored["hostTimestamp"]
        .as_str()
        .and_then(time::parse_iso)
        .is_some());
}

fn tuple((id, method, path): Route) -> (String, String, String) {
    (id.into(), method.into(), path.into())
}

fn invocation_path(path: &str) -> &str {
    if path == "/checkout/{operationId}" {
        "/checkout/not-an-id"
    } else {
        path
    }
}

fn error_code(body: &str) -> String {
    serde_json::from_str::<Value>(body)
        .ok()
        .and_then(|value| value["error"]["code"].as_str().map(str::to_owned))
        .unwrap_or_default()
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
        "hostTimestamp": "2026-07-11T00:00:00Z",
    })
}
