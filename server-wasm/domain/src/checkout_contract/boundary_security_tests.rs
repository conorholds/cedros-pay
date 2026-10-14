use serde_json::{json, Value};

use super::*;

#[test]
fn quote_scope_is_stable_across_rail_rotation_but_isolates_host_authority() {
    let seams = api_tests::setup();
    let body = api_tests::quote_body("same-key", json!(["stripe"]));
    let first = api_tests::facade(&seams).quote("same-key", &body).unwrap();
    seams.set_secret(
        crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT,
        "acct_rotated_test",
    );
    let rotated = api_tests::facade(&seams).quote("same-key", &body).unwrap();
    assert_eq!(first.operation_id, rotated.operation_id);
    assert!(rotated.replayed);

    let context = crate::ctx::RequestContext {
        site_id: Some("site-a".into()),
        environment: Some("production".into()),
        ..Default::default()
    };
    let actor_b = CanonicalCheckoutFacade::for_guest(&seams, &context, "other-host-session")
        .unwrap()
        .quote("same-key", &body)
        .unwrap();
    assert_ne!(rotated.operation_id, actor_b.operation_id);

    let other_environment = crate::ctx::RequestContext {
        site_id: Some("site-a".into()),
        environment: Some("staging".into()),
        ..Default::default()
    };
    let environment =
        CanonicalCheckoutFacade::for_guest(&seams, &other_environment, "host-guest-session")
            .unwrap()
            .quote("same-key", &body)
            .unwrap();
    assert_ne!(rotated.operation_id, environment.operation_id);
}

#[test]
fn return_origins_require_configured_https_ascii_default_port() {
    let seams = api_tests::setup();
    seams.set_setting(
        crate::ids::SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS,
        r#"["https://shop.example:443"]"#,
    );
    api_tests::facade(&seams)
        .quote(
            "allowed",
            &api_tests::quote_body("allowed", json!(["stripe"])),
        )
        .unwrap();

    for (key, origin) in [
        ("userinfo", "https://user@shop.example/success"),
        ("port", "https://shop.example:444/success"),
        ("punycode", "https://xn--shop-9za.example/success"),
        ("unicode", "https://shοp.example/success"),
    ] {
        let mut body: Value =
            serde_json::from_str(&api_tests::quote_body(key, json!(["stripe"]))).unwrap();
        body["customerContext"]["returnUrls"]["success"] = json!(origin);
        let error = api_tests::facade(&seams)
            .quote(key, &body.to_string())
            .unwrap_err();
        assert!(matches!(error.status, 400 | 422));
    }
    assert_eq!(seams.entry_count(OPERATION_MODEL), 1);
}

#[test]
fn customer_context_uses_tenant_keyed_mac_and_attempt_metadata_is_hashed() {
    let seams = api_tests::setup();
    let request = api_validation::parse_quote(
        "mac-key",
        &api_tests::quote_body("mac-key", json!(["stripe"])),
    )
    .unwrap();
    let scope = api_tests::facade(&seams)
        .service
        .context
        .provider_scope()
        .to_string();
    let first = api_validation::context_hashes(&seams, &scope, &request.customer_context).unwrap();
    seams.set_secret(
        crate::ids::SECRET_CHECKOUT_CONTEXT_MAC,
        "different-test-only-context-mac-key-32-bytes",
    );
    let rotated =
        api_validation::context_hashes(&seams, &scope, &request.customer_context).unwrap();
    assert_ne!(first, rotated);
    assert!(!serde_json::to_string(&first)
        .unwrap()
        .contains("buyer@example.com"));

    let direct = service_tests::setup();
    service_tests::push_create(
        &direct,
        "cs_attempt_hash",
        Some("https://checkout.stripe.com/attempt"),
    );
    CheckoutService::new(&direct, service_tests::context("acct_merchant_a"))
        .execute_checkout(service_tests::command(
            "attempt-hash-key",
            "raw-attempt-private",
            1_000,
        ))
        .unwrap();
    let request_json = direct.http_requests.borrow()[0].to_string();
    assert!(!request_json.contains("raw-attempt-private"));
    assert!(request_json.contains(super::provider::META_ATTEMPT_ID));
}
