use std::collections::BTreeSet;

use super::*;
use serde_json::Value;

#[test]
fn list_routes_matches_manifest_and_handoff_contracts() {
    let route_specs = list_routes()
        .into_iter()
        .map(|route| (route.route_id, route.method, route.path))
        .collect::<BTreeSet<_>>();
    let route_ids = route_specs
        .iter()
        .map(|(route_id, _, _)| *route_id)
        .collect::<BTreeSet<_>>();

    let manifest: Value =
        serde_json::from_str(include_str!("../../../cedros-extension.manifest.json")).unwrap();
    assert_eq!(
        string_set(&manifest["surfaces"]["server"]["routes"]),
        route_ids
    );

    let handoff: Value =
        serde_json::from_str(include_str!("../../../cedros-extension.host-handoff.json")).unwrap();
    let contracts = handoff["routeContracts"]
        .as_array()
        .unwrap()
        .iter()
        .map(|contract| {
            let methods = contract["methods"].as_array().unwrap();
            assert_eq!(methods.len(), 1);
            (
                contract["routeId"].as_str().unwrap(),
                methods[0].as_str().unwrap(),
                contract["path"].as_str().unwrap(),
            )
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(contracts, route_specs);
}

#[test]
fn list_jobs_matches_manifest_and_handoff_contracts() {
    let job_ids = list_jobs()
        .into_iter()
        .map(|job| job.job_id)
        .collect::<BTreeSet<_>>();
    let manifest: Value =
        serde_json::from_str(include_str!("../../../cedros-extension.manifest.json")).unwrap();
    assert_eq!(string_set(&manifest["surfaces"]["server"]["jobs"]), job_ids);

    let handoff: Value =
        serde_json::from_str(include_str!("../../../cedros-extension.host-handoff.json")).unwrap();
    assert_eq!(string_set(&handoff["jobContracts"]), job_ids);
}

#[test]
fn route_discovery_has_unique_specs_and_permanent_retirements() {
    let mut route_ids = BTreeSet::new();
    let mut route_specs = BTreeSet::new();
    for route in list_routes() {
        assert!(
            route_ids.insert(route.route_id),
            "duplicate {}",
            route.route_id
        );
        assert!(
            route_specs.insert((route.route_id, route.method, route.path)),
            "duplicate {} {}",
            route.method,
            route.path
        );
        assert!(!route.route_id.contains("checkout-v2"));
        assert!(!route.path.contains("/v2"));
    }

    for retired in retired_route_ids() {
        assert!(
            !route_ids.contains(retired),
            "retired route listed: {retired}"
        );
    }
    assert!(route_ids.contains(ids::ROUTE_GUARDED_POLICY_ENROLL));
    assert!(route_ids.contains(ids::ROUTE_WEBHOOKS));
    for active in canonical_route_ids() {
        assert!(
            route_ids.contains(active),
            "canonical route missing: {active}"
        );
    }
}

fn canonical_route_ids() -> [&'static str; 10] {
    [
        ids::ROUTE_CHECKOUT_DESCRIPTOR,
        ids::ROUTE_CHECKOUT_QUOTE,
        ids::ROUTE_CHECKOUT_CREATE,
        ids::ROUTE_CHECKOUT_STATUS,
        ids::ROUTE_CHECKOUT_RESOLVE,
        ids::ROUTE_CHECKOUT_RETURN_VERIFY,
        ids::ROUTE_VERSIONED_CART_OPEN,
        ids::ROUTE_VERSIONED_CART_READ,
        ids::ROUTE_VERSIONED_CART_ROTATE,
        ids::ROUTE_VERSIONED_CART_APPLY,
    ]
}

#[test]
fn job_discovery_is_static_for_marker_protected_jobs() {
    let job_ids = list_jobs()
        .into_iter()
        .map(|job| job.job_id)
        .collect::<BTreeSet<_>>();
    for protected in [
        ids::JOB_CLEANUP,
        ids::JOB_WEBHOOK_DELIVERY,
        ids::JOB_CATALOG_SYNC,
        ids::JOB_SUBSCRIPTION_SYNC,
        ids::JOB_X402_RECONCILE,
    ] {
        assert!(
            job_ids.contains(protected),
            "protected job missing: {protected}"
        );
    }
}

#[test]
fn checkout_capability_has_no_v2_alias() {
    let manifest: Value =
        serde_json::from_str(include_str!("../../../cedros-extension.manifest.json")).unwrap();
    let capabilities = manifest["capabilities"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|capability| capability["id"].as_str())
        .collect::<BTreeSet<_>>();
    assert!(capabilities.contains("cedros-pay:checkout"));
    assert!(capabilities
        .iter()
        .all(|capability| !capability.contains("checkout-v2")));
}

#[test]
fn checkout_handoff_matches_verified_buyer_and_operationless_return() {
    let handoff: Value =
        serde_json::from_str(include_str!("../../../cedros-extension.host-handoff.json")).unwrap();
    let contracts = handoff["routeContracts"].as_array().unwrap();
    let route = |id| {
        contracts
            .iter()
            .find(|contract| contract["routeId"] == id)
            .unwrap()
    };

    let quote_auth = route(ids::ROUTE_CHECKOUT_QUOTE)["auth"].as_str().unwrap();
    assert!(quote_auth.contains("Cedros Login-verified buyer"));
    assert!(!quote_auth.contains("guest"));

    let verify = route(ids::ROUTE_CHECKOUT_RETURN_VERIFY);
    let request = verify["requestSchema"].as_str().unwrap();
    assert!(request.contains("expectedAttemptId"));
    assert!(request.contains("operationId is rejected"));
    assert!(!verify["responseSchema"]
        .as_str()
        .unwrap()
        .contains("original operationId"));
}

pub(super) const fn retired_route_ids() -> [&'static str; 14] {
    [
        ids::ROUTE_PAYWALL,
        ids::ROUTE_STRIPE_SESSION,
        ids::ROUTE_CART_QUOTE,
        ids::ROUTE_CART_GET,
        ids::ROUTE_CART_CHECKOUT,
        ids::ROUTE_DERIVE_TOKEN_ACCOUNT,
        ids::ROUTE_BLOCKHASH,
        ids::ROUTE_QUOTE,
        ids::ROUTE_VERIFY,
        ids::ROUTE_CREDITS_GRANT,
        ids::ROUTE_CREDITS_AUTHORIZE,
        ids::ROUTE_CREDITS_HOLD,
        ids::ROUTE_CREDITS_RELEASE,
        ids::ROUTE_CART_CREDITS_AUTHORIZE,
    ]
}

fn string_set(values: &Value) -> BTreeSet<&str> {
    values
        .as_array()
        .unwrap()
        .iter()
        .map(|value| value.as_str().or_else(|| value["jobId"].as_str()).unwrap())
        .collect()
}

#[test]
fn route_failures_log_only_safe_contract_identifiers() {
    let seams = crate::fake::FakeSeams::new();
    seams.set_setting("cedros_login.base_url", "https://site.example");
    seams.push_http_error(
        "Bearer secret-token buyer@example.test https://rpc.example/?api-key=secret",
    );
    let response = handle_route(
        &seams,
        RouteRequest {
            route_id: ids::ROUTE_PURCHASES.into(),
            method: "GET".into(),
            path: "/paywall/v1/purchases".into(),
            headers: vec![("authorization".into(), "Bearer secret-token".into())],
            ..Default::default()
        },
    );
    assert_eq!(response.status, 502);
    let logs = seams.logs.borrow();
    let entry: Value = serde_json::from_str(&logs.last().unwrap().1).unwrap();
    assert_eq!(entry["operation"], ids::ROUTE_PURCHASES);
    assert_eq!(entry["code"], "provider_unavailable");
    for sensitive in [
        "secret-token",
        "buyer@example.test",
        "rpc.example",
        "/paywall/",
    ] {
        assert!(!format!("{logs:?}{}", response.body).contains(sensitive));
    }
}

#[test]
fn job_failures_preserve_retry_status_without_logging_raw_causes() {
    let seams = crate::fake::FakeSeams::new();
    let exec = JobExecution {
        job_id: ids::JOB_CLEANUP.into(),
        ..Default::default()
    };
    let out = finish_job(
        &seams,
        &exec,
        Err(AppError::internal("backend unavailable")
            .with_internal("secret-token buyer@example.test")),
    );
    assert_eq!(out.status, crate::reqresp::JobStatus::Retryable);
    let logs = seams.logs.borrow();
    let entry: Value = serde_json::from_str(&logs[0].1).unwrap();
    assert_eq!(entry["operation"], ids::JOB_CLEANUP);
    assert_eq!(entry["surface"], "job");
    assert!(!format!("{logs:?}{}", out.details_json).contains("secret-token"));
    assert!(!format!("{logs:?}{}", out.details_json).contains("buyer@example.test"));
}
