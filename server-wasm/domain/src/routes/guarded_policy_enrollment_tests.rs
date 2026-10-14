use serde_json::{json, Value};

use super::*;
use crate::fake::FakeSeams;

fn request(body: &str, csrf_verified: bool) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_GUARDED_POLICY_ENROLL.into(),
        method: "POST".into(),
        path: "/admin/guarded-policy/enroll".into(),
        body: body.into(),
        context_json: json!({
            "authenticated": true,
            "systemAdmin": true,
            "csrfVerified": csrf_verified,
        })
        .to_string(),
        ..Default::default()
    }
}

fn capability_request(route_claim: &str) -> RouteRequest {
    RouteRequest {
        context_json: json!({
            "authenticated": true,
            "csrfVerified": false,
            "authScheme": "bearer-token",
            "permissionClaims": ["data:settings:read"],
            "capabilityClaims": [route_claim],
        })
        .to_string(),
        ..request("{}", true)
    }
}

#[test]
fn enrolls_exact_policy_set_and_returns_only_redacted_proof() {
    let seams = FakeSeams::new();
    let response = handle(&seams, &request("{}", true)).unwrap();
    let body: Value = serde_json::from_str(&response.body).unwrap();

    assert_eq!(response.status, 200);
    assert_eq!(body["newlyEnrolled"], true);
    assert_eq!(body["modelCount"], 18);
    assert_eq!(
        body["modelSetSha256"],
        crate::guarded_policy::MODEL_SET_SHA256
    );
    assert_eq!(body.as_object().unwrap().len(), 3);
    assert_eq!(seams.guarded_models().len(), 18);
    crate::guarded_policy::require_active(&seams).unwrap();

    let replay: Value =
        serde_json::from_str(&handle(&seams, &request("", true)).unwrap().body).unwrap();
    assert_eq!(replay["newlyEnrolled"], false);
    assert_eq!(
        replay["modelSetSha256"],
        crate::guarded_policy::MODEL_SET_SHA256
    );
}

#[test]
fn rejects_auth_csrf_and_nonempty_body_before_enrollment() {
    let cases = [
        (request(r#"{"unexpected":true}"#, true), 400),
        (request("{}", false), 403),
        (
            RouteRequest {
                context_json: "{}".into(),
                ..request("{}", true)
            },
            401,
        ),
    ];
    for (request, status) in cases {
        let seams = FakeSeams::new();
        assert_eq!(handle(&seams, &request).unwrap_err().status, status);
        assert!(seams.guarded_models().is_empty());
        assert!(seams
            .get_entry(
                crate::guarded_policy::CONTROL_MODEL,
                crate::guarded_policy::MARKER_KEY
            )
            .is_none());
    }
}

#[test]
fn exact_bearer_capability_can_enroll_but_other_routes_cannot() {
    let seams = FakeSeams::new();
    let response = handle(
        &seams,
        &capability_request(ids::ROUTE_GUARDED_POLICY_ENROLL),
    )
    .unwrap();
    assert_eq!(response.status, 200);
    crate::guarded_policy::require_active(&seams).unwrap();

    let other = FakeSeams::new();
    let error = handle(
        &other,
        &capability_request(ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT),
    )
    .unwrap_err();
    assert_eq!(error.status, 403);
    assert!(other.guarded_models().is_empty());
}

#[test]
fn injected_failure_leaves_no_policy_or_marker() {
    let seams = FakeSeams::new();
    seams.fail_next_guarded_batch_after(3);

    assert_eq!(
        handle(&seams, &request("{}", true)).unwrap_err().status,
        500
    );
    assert!(seams.guarded_models().is_empty());
    assert!(seams
        .get_entry(
            crate::guarded_policy::CONTROL_MODEL,
            crate::guarded_policy::MARKER_KEY
        )
        .is_none());
}
