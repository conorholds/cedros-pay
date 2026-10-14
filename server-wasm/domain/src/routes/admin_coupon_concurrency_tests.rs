use serde_json::{json, Value};

use crate::fake::FakeSeams;
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};

fn request(route_id: &str, method: &str, path: &str, body: Value) -> RouteRequest {
    RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: path.into(),
        body: body.to_string(),
        headers: vec![("Idempotency-Key".into(), "coupon-operation".into())],
        context_json: json!({
            "authenticated": true, "systemAdmin": true, "csrfVerified": true,
            "actorId": "operator@example.invalid", "permissionClaims": ["*"]
        })
        .to_string(),
        ..Default::default()
    }
}

fn invoke(seams: &FakeSeams, request: RouteRequest) -> RouteResponse {
    crate::router::handle_route(seams, request)
}

fn coupon(code: &str, percent: i64) -> Value {
    json!({"code": code, "discountType": "percentage", "discountValue": percent})
}

#[test]
fn duplicate_coupon_create_is_rejected_without_overwriting_the_winner() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    let create = || {
        request(
            ids::ROUTE_ADMIN_COUPONS_CREATE,
            "POST",
            "/admin/coupons",
            coupon("save", 10),
        )
    };

    assert_eq!(invoke(&seams, create()).status, 200);
    assert_eq!(invoke(&seams, create()).status, 409);
    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "coupon:SAVE").unwrap()["discountValue"],
        10
    );
}

#[test]
fn stale_coupon_update_cannot_overwrite_a_concurrent_change() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    seams.seed(ids::MODEL_CATALOG, "coupon:SAVE", coupon("SAVE", 10));
    let winner = coupon("SAVE", 25);
    seams.queue_guarded_race(vec![(ids::MODEL_CATALOG, "coupon:SAVE", winner)]);

    let response = invoke(
        &seams,
        request(
            ids::ROUTE_ADMIN_COUPONS_UPDATE,
            "PUT",
            "/admin/coupons/SAVE",
            coupon("SAVE", 15),
        ),
    );

    assert_eq!(response.status, 409);
    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "coupon:SAVE").unwrap()["discountValue"],
        25
    );
}

#[test]
fn coupon_update_rejects_a_route_body_identity_mismatch() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();

    let response = invoke(
        &seams,
        request(
            ids::ROUTE_ADMIN_COUPONS_UPDATE,
            "PUT",
            "/admin/coupons/SAVE",
            coupon("OTHER", 15),
        ),
    );

    assert_eq!(response.status, 400);
    assert!(seams.get_entry(ids::MODEL_CATALOG, "coupon:SAVE").is_none());
}
