use super::*;

#[test]
fn missing_host_provider_context_fails_closed_after_verified_auth() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    authenticated(&seams, "buyer-42");
    let mut request = transport_request(json!({ "lane": "default" }));
    request.context_json = "{}".into();
    let error = AuthenticatedCartAdapter::new(&seams)
        .open(&request)
        .unwrap_err();
    assert_eq!(
        (error.status, error.code),
        (503, "provider_scope_unavailable")
    );
    assert_eq!(storage_entry_count(&seams), 0);
}

#[test]
fn production_transport_enforces_a_durable_rate_policy() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    authenticated(&seams, "buyer-42");
    let response = AuthenticatedCartAdapter::new(&seams)
        .open(&transport_request(json!({ "lane": "default" })))
        .unwrap();
    assert_eq!(response.status, 200);
    assert_eq!(seams.entry_count(LANE_MODEL_ID), 2);
}

#[test]
fn missing_marker_fails_before_auth_and_every_cart_effect() {
    let seams = FakeSeams::new();
    authenticated(&seams, "buyer-42");
    let error = AuthenticatedCartAdapter::new(&seams)
        .open(&transport_request(json!({ "lane": "default" })))
        .unwrap_err();
    assert_eq!(error.code, "guarded_write_policy_unavailable");
    assert!(seams.http_requests.borrow().is_empty());
    assert_eq!(storage_entry_count(&seams), 0);
}

#[test]
fn spoofed_authority_and_unknown_fields_are_rejected_before_auth_or_storage() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    for extra in [
        json!({ "lane": "default", "customerId": "victim" }),
        json!({ "lane": "default", "customerTag": "victim" }),
        json!({ "lane": "default", "providerScope": "attacker" }),
    ] {
        let error = AuthenticatedCartAdapter::new(&seams)
            .open(&transport_request(extra))
            .unwrap_err();
        assert_eq!((error.status, error.code), (400, "bad_request"));
    }
    assert!(seams.http_requests.borrow().is_empty());
    assert_eq!(storage_entry_count(&seams), 0);
}

#[test]
fn request_size_auth_and_public_error_shapes_are_bounded() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    let mut oversized = transport_request(json!({ "lane": "default" }));
    oversized.body = "x".repeat(16 * 1024 + 1);
    let response = AuthenticatedCartAdapter::new(&seams)
        .open(&oversized)
        .unwrap_err()
        .into_response();
    assert_eq!(response.status, 413);
    assert_eq!(
        response_json(response)["error"]["code"],
        "payload_too_large"
    );

    let mut unauthenticated = transport_request(json!({ "lane": "default" }));
    unauthenticated.headers.clear();
    let error = AuthenticatedCartAdapter::new(&seams)
        .open(&unauthenticated)
        .unwrap_err();
    assert_eq!((error.status, error.code), (401, "unauthorized"));
}

#[test]
fn only_the_fixed_default_lane_is_accepted_before_auth() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    for lane in ["", "mobile", "Default", " default"] {
        let error = AuthenticatedCartAdapter::new(&seams)
            .open(&transport_request(json!({ "lane": lane })))
            .unwrap_err();
        assert_eq!((error.status, error.code), (422, "unprocessable"));
    }
    assert!(seams.http_requests.borrow().is_empty());
    assert_eq!(storage_entry_count(&seams), 0);
}

#[test]
fn rate_limit_outcome_is_redacted_and_has_no_cart_effect() {
    struct Deny;
    impl CartRatePolicy for Deny {
        fn check(&self, _key: &CartRateKey, _operation: CartRateOperation) -> AppResult<()> {
            Err(crate::error::AppError::too_many(
                "cart request rate limit exceeded",
            ))
        }
    }
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    authenticated(&seams, "buyer-42");
    let error = AuthenticatedCartAdapter::with_rate_policy(&seams, &Deny)
        .open(&transport_request(json!({ "lane": DEFAULT_LANE })))
        .unwrap_err();
    assert_eq!((error.status, error.code), (429, "rate_limited"));
    assert_eq!(error.message, "cart request rate limit exceeded");
    assert_eq!(storage_entry_count(&seams), 0);
}

#[test]
fn host_site_and_environment_isolate_the_same_verified_buyer() {
    let seams = FakeSeams::new();
    let first = open_for_context(&seams, "site-a", "production");
    let second = open_for_context(&seams, "site-b", "production");
    assert_ne!(
        first["generation"]["generation"],
        second["generation"]["generation"]
    );
}

fn open_for_context(seams: &FakeSeams, site: &str, environment: &str) -> serde_json::Value {
    authenticated(seams, "buyer-42");
    let mut request = transport_request(json!({ "lane": "default" }));
    request.context_json = json!({ "siteId": site, "environment": environment }).to_string();
    response_json(adapter(seams).open(&request).unwrap())
}
