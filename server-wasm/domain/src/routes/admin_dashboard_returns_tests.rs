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
        "requestId": "returns-test-request",
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

fn return_record(id: &str, order_id: &str, status: &str, created_at: &str) -> Value {
    json!({
        "kind": "return",
        "id": id,
        "tenantId": "site_test",
        "orderId": order_id,
        "status": status,
        "items": [{"productId": "product_1", "quantity": 1}],
        "reason": "Changed my mind",
        "metadata": {"source": "test"},
        "createdAt": created_at,
        "updatedAt": created_at,
        "statusUpdatedAt": created_at
    })
}

#[test]
fn lists_filters_pages_and_loads_return_details() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_LEDGER,
        "return_old",
        return_record("return_old", "order_1", "requested", "2026-01-01T00:00:00Z"),
    );
    seams.seed(
        ids::MODEL_LEDGER,
        "return_new",
        return_record("return_new", "order_1", "requested", "2026-02-01T00:00:00Z"),
    );
    seams.seed(
        ids::MODEL_LEDGER,
        "return_other",
        return_record(
            "return_other",
            "order_2",
            "approved",
            "2026-03-01T00:00:00Z",
        ),
    );
    seams.seed(
        ids::MODEL_LEDGER,
        "payment_1",
        json!({"kind": "payment", "id": "payment_1", "createdAt": "2026-04-01T00:00:00Z"}),
    );

    let mut list = request(ids::ROUTE_ADMIN_RETURNS_LIST, "GET", "/admin/returns");
    list.query = vec![
        ("status".into(), "requested".into()),
        ("orderId".into(), "order_1".into()),
        ("limit".into(), "1".into()),
    ];
    let response = crate::router::handle_route(&seams, list);
    let output = body(&response);
    assert_eq!(response.status, 200);
    assert_eq!(output["count"], 1);
    assert_eq!(output["total"], 2);
    assert_eq!(output["hasMore"], true);
    assert_eq!(output["returns"][0]["id"], "return_new");
    assert!(output["returns"][0].get("kind").is_none());

    let detail = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ADMIN_RETURNS_GET,
            "GET",
            "/admin/returns/return_old",
        ),
    );
    assert_eq!(detail.status, 200);
    assert_eq!(body(&detail)["orderId"], "order_1");

    let invalid_path = crate::router::handle_route(
        &seams,
        request(
            ids::ROUTE_ADMIN_RETURNS_GET,
            "GET",
            "/admin/returns/return_old/extra",
        ),
    );
    assert_eq!(invalid_path.status, 404);
}

#[test]
fn list_rejects_an_invalid_status_filter() {
    let seams = FakeSeams::new();
    let mut req = request(ids::ROUTE_ADMIN_RETURNS_LIST, "GET", "/admin/returns");
    req.query = vec![("status".into(), "lost".into())];

    let response = crate::router::handle_route(&seams, req);

    assert_eq!(response.status, 400);
    assert_eq!(body(&response)["error"]["message"], "invalid return status");
}

#[test]
fn creates_a_guarded_return_for_an_existing_order() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    seams.seed(
        ids::MODEL_LEDGER,
        "order_1",
        json!({"kind": "payment", "id": "order_1", "createdAt": "2026-01-01T00:00:00Z"}),
    );
    let mut req = request(ids::ROUTE_ADMIN_RETURNS_CREATE, "POST", "/admin/returns");
    req.body = json!({
        "id": "return_1",
        "orderId": "order_1",
        "items": [{"productId": "product_1", "variantId": "large", "quantity": 2}],
        "reason": "Wrong size",
        "metadata": {"channel": "support"}
    })
    .to_string();

    let response = crate::router::handle_route(&seams, req);
    let output = body(&response);

    assert_eq!(response.status, 200);
    assert_eq!(output["id"], "return_1");
    assert_eq!(output["tenantId"], "site_test");
    assert_eq!(output["status"], "requested");
    assert!(output.get("kind").is_none());
    let stored = seams
        .get_entry(ids::MODEL_LEDGER, "return_1")
        .expect("stored return");
    assert_eq!(stored["kind"], "return");
    assert_eq!(stored["items"][0]["quantity"], 2);
}

#[test]
fn create_validates_the_order_and_items() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    let mut missing_order = request(ids::ROUTE_ADMIN_RETURNS_CREATE, "POST", "/admin/returns");
    missing_order.body = json!({
        "orderId": "missing",
        "items": [{"productId": "product_1", "quantity": 1}]
    })
    .to_string();
    assert_eq!(
        crate::router::handle_route(&seams, missing_order).status,
        404
    );

    let mut no_items = request(ids::ROUTE_ADMIN_RETURNS_CREATE, "POST", "/admin/returns");
    no_items.body = json!({"orderId": "missing", "items": []}).to_string();
    assert_eq!(crate::router::handle_route(&seams, no_items).status, 400);

    let mut invalid_quantity = request(ids::ROUTE_ADMIN_RETURNS_CREATE, "POST", "/admin/returns");
    invalid_quantity.body =
        json!({"orderId": "missing", "items": [{"productId": "product_1", "quantity": 0}]})
            .to_string();
    assert_eq!(
        crate::router::handle_route(&seams, invalid_quantity).status,
        400
    );
}

#[test]
fn status_updates_follow_the_lifecycle_and_idempotent_replays_do_not_write() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    seams.set_now(crate::time::parse_iso("2026-04-01T12:00:00Z").unwrap());
    seams.seed(
        ids::MODEL_LEDGER,
        "return_1",
        return_record("return_1", "order_1", "requested", "2026-01-01T00:00:00Z"),
    );
    let batches_before = seams.db_batch_request_count();
    let update = || {
        let mut req = request(
            ids::ROUTE_ADMIN_RETURNS_STATUS_UPDATE,
            "POST",
            "/admin/returns/return_1/status",
        );
        req.body = json!({"status": "APPROVED"}).to_string();
        req
    };

    let response = crate::router::handle_route(&seams, update());
    let output = body(&response);
    assert_eq!(response.status, 200);
    assert_eq!(output["status"], "approved");
    assert_eq!(output["updatedAt"], "2026-04-01T12:00:00Z");
    assert_eq!(
        seams.get_entry(ids::MODEL_LEDGER, "return_1").unwrap()["status"],
        "approved"
    );
    assert_eq!(seams.db_batch_request_count(), batches_before + 1);

    assert_eq!(crate::router::handle_route(&seams, update()).status, 200);
    assert_eq!(
        seams.db_batch_request_count(),
        batches_before + 1,
        "an idempotent status replay must not write"
    );

    let mut invalid = request(
        ids::ROUTE_ADMIN_RETURNS_STATUS_UPDATE,
        "POST",
        "/admin/returns/return_1/status",
    );
    invalid.body = json!({"status": "refunded"}).to_string();
    assert_eq!(crate::router::handle_route(&seams, invalid).status, 400);
    assert_eq!(
        seams.get_entry(ids::MODEL_LEDGER, "return_1").unwrap()["status"],
        "approved"
    );
}

#[test]
fn concurrent_status_change_is_not_overwritten() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    seams.seed(
        ids::MODEL_LEDGER,
        "return_1",
        return_record("return_1", "order_1", "requested", "2026-01-01T00:00:00Z"),
    );
    let winner = return_record("return_1", "order_1", "rejected", "2026-01-01T00:00:00Z");
    seams.queue_guarded_race(vec![(ids::MODEL_LEDGER, "return_1", winner)]);
    let mut req = request(
        ids::ROUTE_ADMIN_RETURNS_STATUS_UPDATE,
        "POST",
        "/admin/returns/return_1/status",
    );
    req.body = json!({"status": "approved"}).to_string();

    let response = crate::router::handle_route(&seams, req);

    assert_eq!(response.status, 409);
    assert_eq!(
        seams.get_entry(ids::MODEL_LEDGER, "return_1").unwrap()["status"],
        "rejected"
    );
}

#[test]
fn return_writes_require_guarded_policy_and_csrf() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_LEDGER,
        "return_1",
        return_record("return_1", "order_1", "requested", "2026-01-01T00:00:00Z"),
    );
    let mut req = request(
        ids::ROUTE_ADMIN_RETURNS_STATUS_UPDATE,
        "POST",
        "/admin/returns/return_1/status",
    );
    req.body = json!({"status": "approved"}).to_string();
    assert_eq!(crate::router::handle_route(&seams, req.clone()).status, 503);

    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    req.context_json = context(false);
    assert_eq!(crate::router::handle_route(&seams, req).status, 403);
    assert_eq!(
        seams.get_entry(ids::MODEL_LEDGER, "return_1").unwrap()["status"],
        "requested"
    );
}
