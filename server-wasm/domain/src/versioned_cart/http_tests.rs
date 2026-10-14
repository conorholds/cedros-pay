use super::*;

fn request(route_id: &str, path: &str, body: serde_json::Value) -> crate::reqresp::RouteRequest {
    let mut request = transport_request(body);
    request.route_id = route_id.into();
    request.method = "POST".into();
    request.path = path.into();
    request
}

#[test]
fn route_contract_is_exact_and_has_no_v2_alias() {
    assert_eq!(
        ROUTES
            .iter()
            .map(|route| (route.route_id, route.method, route.path))
            .collect::<Vec<_>>(),
        vec![
            (ROUTE_OPEN, "POST", "/cart/open"),
            (ROUTE_READ, "POST", "/cart/read"),
            (ROUTE_ROTATE, "POST", "/cart/rotate"),
            (ROUTE_APPLY, "POST", "/cart/apply"),
        ]
    );
    assert!(ROUTES
        .iter()
        .all(|route| !route.route_id.contains("v2") && !route.path.contains("/v2")));
}

#[test]
fn http_open_is_marker_first_and_uses_production_policy() {
    let missing = FakeSeams::new();
    authenticated(&missing, "buyer-42");
    let error = handle_route(
        &missing,
        &request(ROUTE_OPEN, "/cart/open", json!({ "lane": DEFAULT_LANE })),
    )
    .unwrap_err();
    assert_eq!(error.code, "guarded_write_policy_unavailable");
    assert!(missing.http_requests.borrow().is_empty());

    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    authenticated(&seams, "buyer-42");
    let response = handle_route(
        &seams,
        &request(ROUTE_OPEN, "/cart/open", json!({ "lane": DEFAULT_LANE })),
    )
    .unwrap();
    assert_eq!(response.status, 200);
    assert_eq!(response_json(response)["authoritative"]["version"], 0);
    assert_eq!(seams.entry_count(LANE_MODEL_ID), 2); // rate row + lane registry
}

#[test]
fn wrong_binding_fails_without_auth_after_marker() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    authenticated(&seams, "buyer-42");
    let mut bad = request(ROUTE_READ, "/cart/open", json!({ "lane": DEFAULT_LANE }));
    bad.method = "GET".into();
    assert_eq!(handle_route(&seams, &bad).unwrap_err().status, 404);
    assert!(seams.http_requests.borrow().is_empty());
}
