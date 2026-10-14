use serde_json::{json, Value};

use crate::fake::FakeSeams;
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};

fn context(csrf_verified: bool) -> String {
    json!({
        "authenticated": true,
        "systemAdmin": true,
        "csrfVerified": csrf_verified,
        "permissionClaims": ["*"],
        "requestId": "disputes-test-request",
        "siteId": "site_test"
    })
    .to_string()
}

fn request(route_id: &str, method: &str, path: &str) -> RouteRequest {
    RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: path.into(),
        context_json: context(true),
        ..Default::default()
    }
}

fn body(response: &RouteResponse) -> Value {
    serde_json::from_str(&response.body).expect("JSON response")
}

fn dispute_record(id: &str, status: &str, created_at: &str) -> Value {
    json!({
        "kind": "dispute",
        "id": id,
        "source": "stripe",
        "orderId": "order_1",
        "paymentIntentId": "pi_1",
        "chargeId": "ch_1",
        "status": status,
        "reason": "fraudulent",
        "amount": 2500,
        "currency": "USD",
        "metadata": {"channel": "test"},
        "createdAt": created_at,
        "updatedAt": created_at,
        "statusUpdatedAt": created_at,
        "providerEventCreated": 1_800_000_000
    })
}

#[test]
fn lists_filters_pages_and_loads_dispute_details() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_LEDGER,
        "dp_old",
        dispute_record("dp_old", "needs_response", "2026-01-01T00:00:00Z"),
    );
    seams.seed(
        ids::MODEL_LEDGER,
        "dp_new",
        dispute_record("dp_new", "needs_response", "2026-02-01T00:00:00Z"),
    );
    seams.seed(
        ids::MODEL_LEDGER,
        "dp_closed",
        dispute_record("dp_closed", "lost", "2026-03-01T00:00:00Z"),
    );
    seams.seed(
        ids::MODEL_LEDGER,
        "payment_1",
        json!({"kind": "payment", "id": "payment_1", "createdAt": "2026-04-01T00:00:00Z"}),
    );

    let mut list = request(ids::ROUTE_ADMIN_DISPUTES_LIST, "GET", "/admin/disputes");
    list.query = vec![
        ("status".into(), "needs_response".into()),
        ("orderId".into(), "order_1".into()),
        ("limit".into(), "1".into()),
    ];
    let response = crate::router::handle_route(&seams, list);
    let output = body(&response);
    assert_eq!(response.status, 200);
    assert_eq!(output["count"], 1);
    assert_eq!(output["total"], 2);
    assert_eq!(output["hasMore"], true);
    assert_eq!(output["disputes"][0]["id"], "dp_new");
    assert!(output["disputes"][0].get("kind").is_none());
    assert!(output["disputes"][0].get("providerEventCreated").is_none());

    let detail = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ADMIN_DISPUTES_GET,
            "GET",
            "/admin/disputes/dp_old",
        ),
    );
    assert_eq!(detail.status, 200);
    assert_eq!(body(&detail)["paymentIntentId"], "pi_1");

    let invalid_path = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ADMIN_DISPUTES_GET,
            "GET",
            "/admin/disputes/dp_old/extra",
        ),
    );
    assert_eq!(invalid_path.status, 404);
}

#[test]
fn list_rejects_invalid_filters_and_malformed_stored_rows() {
    let seams = FakeSeams::new();
    let mut invalid = request(ids::ROUTE_ADMIN_DISPUTES_LIST, "GET", "/admin/disputes");
    invalid.query = vec![("status".into(), "refunded".into())];
    assert_eq!(crate::router::handle_route(&seams, invalid).status, 400);

    seams.seed(
        ids::MODEL_LEDGER,
        "dp_bad",
        json!({"kind": "dispute", "id": "dp_bad", "status": "won"}),
    );
    let response = crate::router::handle_route(
        &seams,
        request(ids::ROUTE_ADMIN_DISPUTES_LIST, "GET", "/admin/disputes"),
    );
    assert_eq!(response.status, 500);
    assert_eq!(
        body(&response)["error"]["message"],
        "stored dispute is malformed"
    );
}

#[test]
fn status_updates_are_guarded_validated_and_idempotent() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    seams.set_now(crate::time::parse_iso("2026-04-01T12:00:00Z").unwrap());
    seams.seed(
        ids::MODEL_LEDGER,
        "dp_1",
        dispute_record("dp_1", "needs_response", "2026-01-01T00:00:00Z"),
    );
    let batches_before = seams.db_batch_request_count();
    let update = || {
        let mut req = request(
            ids::ROUTE_ADMIN_DISPUTES_STATUS_UPDATE,
            "POST",
            "/admin/disputes/dp_1/status",
        );
        req.body = json!({"status": "UNDER_REVIEW"}).to_string();
        req
    };

    let response = crate::router::handle_route(&seams, update());
    assert_eq!(response.status, 200);
    assert_eq!(body(&response)["status"], "under_review");
    assert_eq!(
        seams.get_entry(ids::MODEL_LEDGER, "dp_1").unwrap()["status"],
        "under_review"
    );
    assert_eq!(seams.db_batch_request_count(), batches_before + 1);

    assert_eq!(crate::router::handle_route(&seams, update()).status, 200);
    assert_eq!(seams.db_batch_request_count(), batches_before + 1);

    let mut invalid = request(
        ids::ROUTE_ADMIN_DISPUTES_STATUS_UPDATE,
        "POST",
        "/admin/disputes/dp_1/status",
    );
    invalid.body = json!({"status": "warning_needs_response"}).to_string();
    assert_eq!(crate::router::handle_route(&seams, invalid).status, 400);
}

#[test]
fn concurrent_status_change_is_not_overwritten() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    seams.seed(
        ids::MODEL_LEDGER,
        "dp_1",
        dispute_record("dp_1", "needs_response", "2026-01-01T00:00:00Z"),
    );
    let winner = dispute_record("dp_1", "lost", "2026-01-01T00:00:00Z");
    seams.queue_guarded_race(vec![(ids::MODEL_LEDGER, "dp_1", winner)]);
    let mut req = request(
        ids::ROUTE_ADMIN_DISPUTES_STATUS_UPDATE,
        "POST",
        "/admin/disputes/dp_1/status",
    );
    req.body = json!({"status": "under_review"}).to_string();

    let response = crate::router::handle_route(&seams, req);

    assert_eq!(response.status, 409);
    assert_eq!(
        seams.get_entry(ids::MODEL_LEDGER, "dp_1").unwrap()["status"],
        "lost"
    );
}

#[test]
fn dispute_writes_require_guarded_policy_and_csrf() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_LEDGER,
        "dp_1",
        dispute_record("dp_1", "needs_response", "2026-01-01T00:00:00Z"),
    );
    let mut req = request(
        ids::ROUTE_ADMIN_DISPUTES_STATUS_UPDATE,
        "POST",
        "/admin/disputes/dp_1/status",
    );
    req.body = json!({"status": "under_review"}).to_string();
    assert_eq!(crate::router::handle_route(&seams, req.clone()).status, 503);

    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    req.context_json = context(false);
    assert_eq!(crate::router::handle_route(&seams, req).status, 403);
    assert_eq!(
        seams.get_entry(ids::MODEL_LEDGER, "dp_1").unwrap()["status"],
        "needs_response"
    );
}
