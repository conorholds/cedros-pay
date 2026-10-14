use serde_json::{json, Value};

use super::*;
use crate::fake::FakeSeams;

fn admin_ctx(claims: &[&str]) -> String {
    admin_ctx_with_csrf(claims, true)
}

fn admin_ctx_with_csrf(claims: &[&str], csrf_verified: bool) -> String {
    json!({
        "authenticated": true,
        "permissionClaims": claims,
        "csrfVerified": csrf_verified
    })
    .to_string()
}

fn request(method: &str, path: &str, route_id: &str, body: Value) -> RouteRequest {
    let mut body = body;
    let mut headers = Vec::new();
    if matches!(method, "PUT" | "PATCH") {
        body["mutationId"] = json!("test-config-mutation");
        body["expectedRevision"] = Value::Null;
        headers.push((
            "Idempotency-Key".into(),
            "extension-config:test-config-mutation".into(),
        ));
    }
    RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: path.into(),
        headers,
        body: body.to_string(),
        context_json: admin_ctx(&[ids::ROUTE_ADMIN]),
        ..Default::default()
    }
}

#[test]
fn updates_and_redacts_disabled_stripe_secret_config() {
    let seams = FakeSeams::new();
    let update = request(
        "PUT",
        "/admin/config/stripe",
        ids::ROUTE_ADMIN_CONFIG_STRIPE_UPDATE,
        json!({
            "config": {
                "enabled": false,
                "secret_key": "sk_test_123",
                "publishable_key": "pk_test_123"
            }
        }),
    );

    let update_resp = handle(&seams, &update).expect("update config");
    assert_eq!(update_resp.status, 200);
    assert_eq!(
        seams.secret_get(ids::SECRET_STRIPE_KEY).unwrap().as_deref(),
        Some("sk_test_123")
    );

    let get = request(
        "GET",
        "/admin/config/stripe",
        ids::ROUTE_ADMIN_CONFIG_STRIPE_GET,
        Value::Null,
    );
    let body: Value = serde_json::from_str(&handle(&seams, &get).unwrap().body).unwrap();

    assert_eq!(body["config"]["secret_key"], REDACTED_PLACEHOLDER);
    assert_eq!(body["config"]["webhook_token"], REDACTED_PLACEHOLDER);
    let token = seams
        .secret_get(ids::SECRET_STRIPE_WEBHOOK_TOKEN)
        .unwrap()
        .expect("reading Stripe config mints the ingress token");
    assert!(is_webhook_token(&token));
    assert_eq!(
        body["webhookEndpoint"]["path"],
        format!("/extensions/cedros-pay/webhook/stripe?token={token}")
    );
    assert!(seams
        .setting_get(ids::SECRET_STRIPE_WEBHOOK_TOKEN)
        .unwrap()
        .is_none());
    assert_eq!(body["config"]["publishable_key"], "pk_test_123");
}

#[test]
fn rejects_portal_credentials_at_the_admin_config_boundary() {
    let seams = FakeSeams::new();
    let update = request(
        "PUT",
        "/admin/config/cedros_login",
        ids::ROUTE_ADMIN_CONFIG_CEDROS_LOGIN_UPDATE,
        json!({"config": {"portal_api_key": "must-not-enter-pay-config"}}),
    );

    let error = handle(&seams, &update).unwrap_err();

    assert_eq!(error.status, 400);
    assert_eq!(seams.secret_get(ids::SECRET_RP_TOKEN).unwrap(), None);
    assert_eq!(
        seams.secret_get("cedros_login.portal_api_key").unwrap(),
        None
    );
}

#[test]
fn rejects_config_updates_without_csrf_verification() {
    let seams = FakeSeams::new();
    let mut update = request(
        "PUT",
        "/admin/config/stripe",
        ids::ROUTE_ADMIN_CONFIG_STRIPE_UPDATE,
        json!({
            "config": {
                "enabled": true,
                "secret_key": "sk_attacker_csrf"
            }
        }),
    );
    update.context_json = admin_ctx_with_csrf(&[ids::ROUTE_ADMIN], false);

    let error = handle(&seams, &update).unwrap_err();

    assert_eq!(error.status, 403);
    assert_eq!(
        seams.secret_get(ids::SECRET_STRIPE_KEY).unwrap().as_deref(),
        None
    );
    assert_eq!(seams.setting_get("stripe.enabled").unwrap(), None);
}

#[test]
fn exact_config_retry_replays_one_committed_revision() {
    let seams = FakeSeams::new();
    let update = request(
        "PATCH",
        "/admin/config/shop",
        ids::ROUTE_ADMIN_CONFIG_SHOP_UPDATE,
        json!({ "updates": { "refunds_enabled": true } }),
    );

    let first: Value = serde_json::from_str(&handle(&seams, &update).unwrap().body).unwrap();
    let replay: Value = serde_json::from_str(&handle(&seams, &update).unwrap().body).unwrap();

    assert_eq!(replay["committedRevision"], first["committedRevision"]);
    assert_eq!(seams.entry_count(ids::MODEL_CONFIG_AUDIT), 1);
}

#[test]
fn preserves_secret_when_redacted_placeholder_is_saved() {
    let seams = FakeSeams::new();
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_live_existing");
    let update = request(
        "PUT",
        "/admin/config/stripe",
        ids::ROUTE_ADMIN_CONFIG_STRIPE_UPDATE,
        json!({ "config": { "secret_key": REDACTED_PLACEHOLDER } }),
    );

    let update_resp = handle(&seams, &update).expect("update config");

    assert_eq!(update_resp.status, 200);
    assert_eq!(
        seams.secret_get(ids::SECRET_STRIPE_KEY).unwrap().as_deref(),
        Some("sk_live_existing")
    );
}

#[test]
fn payment_config_updates_keep_shop_availability_fail_closed() {
    let seams = FakeSeams::new();
    let update = request(
        "PUT",
        "/admin/config/stripe",
        ids::ROUTE_ADMIN_CONFIG_STRIPE_UPDATE,
        json!({
            "config": {
                "enabled": false,
                "secret_key": "sk_test_123",
                "publishable_key": "pk_test_123"
            }
        }),
    );

    handle(&seams, &update).expect("update config");

    let raw = seams
        .setting_get(ids::SETTING_SHOP_PAYMENT_AVAILABILITY_SNAPSHOT)
        .unwrap()
        .expect("availability snapshot");
    let snapshot: Value = serde_json::from_str(&raw).unwrap();
    assert_eq!(snapshot["paymentMethods"]["stripe"]["available"], false);
    assert_eq!(snapshot["paymentMethods"]["x402"]["available"], false);
    assert_eq!(snapshot["paymentMethods"]["credits"]["available"], false);
    assert_eq!(snapshot["paymentMethods"]["methods"], json!({}));
}

#[test]
fn rejects_enabling_credits_without_host_conditional_mutations() {
    let seams = FakeSeams::new();
    let update = request(
        "PUT",
        "/admin/config/cedros_login",
        ids::ROUTE_ADMIN_CONFIG_CEDROS_LOGIN_UPDATE,
        json!({ "config": { "credits_enabled": true } }),
    );

    let error = handle(&seams, &update).unwrap_err();

    assert_eq!((error.status, error.code), (503, "unavailable"));
    assert_eq!(
        seams.setting_get("cedros_login.credits_enabled").unwrap(),
        None
    );
}

#[test]
fn rejects_enabling_every_unavailable_payment_rail_without_writes() {
    for (category, route_id, method, config, keys) in [
        (
            "stripe",
            ids::ROUTE_ADMIN_CONFIG_STRIPE_UPDATE,
            "PUT",
            json!({ "enabled": true, "secret_key": "sk_must_not_write" }),
            vec!["stripe.enabled", "stripe.secret_key"],
        ),
        (
            "x402",
            ids::ROUTE_ADMIN_CONFIG_X402_UPDATE,
            "PUT",
            json!({ "enabled": true, "payment_address": "wallet" }),
            vec!["x402.enabled", "x402.payment_address"],
        ),
        (
            "native_store",
            ids::ROUTE_ADMIN_CONFIG_NATIVE_STORE_UPDATE,
            "PUT",
            json!({ "apple_enabled": true, "apple_bundle_id": "app.example" }),
            vec!["native_store.apple_enabled", "native_store.apple_bundle_id"],
        ),
        (
            "subscriptions",
            ids::ROUTE_ADMIN_CONFIG_SUBSCRIPTIONS_UPDATE,
            "PATCH",
            json!({ "enabled": true, "grace_period_hours": 24 }),
            vec!["subscriptions.enabled", "subscriptions.grace_period_hours"],
        ),
    ] {
        let seams = FakeSeams::new();
        let req = request(
            method,
            &format!("/admin/config/{category}"),
            route_id,
            json!({ "config": config }),
        );

        let error = handle(&seams, &req).unwrap_err();

        assert_eq!(
            (error.status, error.code),
            (503, "unavailable"),
            "{category}"
        );
        for key in keys {
            assert_eq!(seams.setting_get(key).unwrap(), None, "{category}: {key}");
            assert_eq!(seams.secret_get(key).unwrap(), None, "{category}: {key}");
        }
    }
}

#[test]
fn allows_disabling_credits_without_host_conditional_mutations() {
    let seams = FakeSeams::new();
    seams.set_setting("cedros_login.credits_enabled", "true");
    let update = request(
        "PUT",
        "/admin/config/cedros_login",
        ids::ROUTE_ADMIN_CONFIG_CEDROS_LOGIN_UPDATE,
        json!({ "config": { "credits_enabled": false } }),
    );

    assert_eq!(handle(&seams, &update).unwrap().status, 200);
    assert_eq!(
        seams
            .setting_get("cedros_login.credits_enabled")
            .unwrap()
            .as_deref(),
        Some("false")
    );
}

/// Regression: the cedros-data host admin session only grants generic claims
/// (`manage_settings`, ...) plus `systemAdmin` — never `cedros-pay:admin`.
/// The Pay Hub settings tabs read config through exactly this envelope.
#[test]
fn host_admin_session_reads_config_without_extension_claim() {
    let seams = FakeSeams::new();
    let mut get = request(
        "GET",
        "/admin/config/stripe",
        ids::ROUTE_ADMIN_CONFIG_STRIPE_GET,
        Value::Null,
    );
    get.context_json = json!({
        "authenticated": true,
        "systemAdmin": true,
        "csrfVerified": true,
        "permissionClaims": [
            "manage_settings",
            "manage_users",
            "data:settings:read",
            "data:settings:write"
        ]
    })
    .to_string();

    let resp = handle(&seams, &get).expect("host admin session reads config");

    assert_eq!(resp.status, 200);
    let body: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(body["category"], "stripe");
}

#[test]
fn host_admin_session_reads_shop_config_without_extension_claim() {
    let seams = FakeSeams::new();
    seams.set_setting("shop.refunds_enabled", "false");
    let mut get = request(
        "GET",
        "/admin/config/shop",
        ids::ROUTE_ADMIN_CONFIG_SHOP_GET,
        Value::Null,
    );
    get.context_json = json!({
        "authenticated": true,
        "systemAdmin": true,
        "csrfVerified": true,
        "permissionClaims": [
            "manage_settings",
            "data:settings:read"
        ]
    })
    .to_string();

    let resp = handle(&seams, &get).expect("host admin session reads shop config");

    assert_eq!(resp.status, 200);
    let body: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(body["category"], "shop");
    assert_eq!(body["config"]["refunds_enabled"], false);
    assert_eq!(body["config"]["returns_enabled"], Value::Null);
    assert_eq!(body["config"]["shipping_enabled"], Value::Null);
    assert_eq!(body["config"]["taxes_enabled"], Value::Null);
}

#[test]
fn patches_shop_and_subscription_config_updates_payloads() {
    let seams = FakeSeams::new();
    let shop = request(
        "PATCH",
        "/admin/config/shop",
        ids::ROUTE_ADMIN_CONFIG_SHOP_UPDATE,
        json!({
            "updates": {
                "refunds_enabled": false,
                "returns_enabled": true,
                "shipping_enabled": true,
                "taxes_enabled": true
            }
        }),
    );
    let mut subscriptions = request(
        "PATCH",
        "/admin/config/subscriptions",
        ids::ROUTE_ADMIN_CONFIG_SUBSCRIPTIONS_UPDATE,
        json!({ "updates": { "enabled": false } }),
    );

    let shop_resp = handle(&seams, &shop).expect("patch shop config");
    let shop_body: Value = serde_json::from_str(&shop_resp.body).unwrap();
    subscriptions.body = json!({
        "updates": { "enabled": false },
        "mutationId": "test-subscription-config-mutation",
        "expectedRevision": shop_body["committedRevision"],
    })
    .to_string();
    subscriptions.headers = vec![(
        "Idempotency-Key".into(),
        "extension-config:test-subscription-config-mutation".into(),
    )];
    let subscriptions_resp = handle(&seams, &subscriptions).expect("patch subscription config");
    let subscriptions_body: Value =
        serde_json::from_str(&subscriptions_resp.body).expect("subscription mutation response");
    let get_subscriptions = request(
        "GET",
        "/admin/config/subscriptions",
        ids::ROUTE_ADMIN_CONFIG_SUBSCRIPTIONS_GET,
        Value::Null,
    );
    let read_body: Value = serde_json::from_str(
        &handle(&seams, &get_subscriptions)
            .expect("read subscription config")
            .body,
    )
    .unwrap();

    assert_eq!(shop_resp.status, 200);
    assert_eq!(subscriptions_resp.status, 200);
    assert_eq!(
        read_body["committedRevision"],
        subscriptions_body["committedRevision"]
    );
    assert_eq!(
        seams
            .setting_get("shop.refunds_enabled")
            .unwrap()
            .as_deref(),
        Some("false")
    );
    assert_eq!(
        seams
            .setting_get("shop.returns_enabled")
            .unwrap()
            .as_deref(),
        Some("true")
    );
    assert_eq!(
        seams
            .setting_get("shop.shipping_enabled")
            .unwrap()
            .as_deref(),
        Some("true")
    );
    assert_eq!(
        seams.setting_get("shop.taxes_enabled").unwrap().as_deref(),
        Some("true")
    );
    assert_eq!(
        seams
            .setting_get("subscriptions.enabled")
            .unwrap()
            .as_deref(),
        Some("false")
    );
}

#[test]
fn stale_config_revision_rolls_back_settings_secrets_and_audit() {
    let seams = FakeSeams::new();
    let first = request(
        "PUT",
        "/admin/config/stripe",
        ids::ROUTE_ADMIN_CONFIG_STRIPE_UPDATE,
        json!({"config": {"enabled": false, "secret_key": "first"}}),
    );
    let first_body: Value = serde_json::from_str(&handle(&seams, &first).unwrap().body).unwrap();
    assert!(first_body["committedRevision"].is_string());

    let mut stale = request(
        "PUT",
        "/admin/config/stripe",
        ids::ROUTE_ADMIN_CONFIG_STRIPE_UPDATE,
        json!({"config": {"enabled": false, "secret_key": "second"}}),
    );
    stale.body = json!({
        "config": {"enabled": false, "secret_key": "second"},
        "mutationId": "stale-config-mutation",
        "expectedRevision": null,
    })
    .to_string();
    stale.headers = vec![(
        "Idempotency-Key".into(),
        "extension-config:stale-config-mutation".into(),
    )];

    let error = handle(&seams, &stale).unwrap_err();

    assert_eq!(error.status, 409);
    assert_eq!(
        seams.secret_get(ids::SECRET_STRIPE_KEY).unwrap().as_deref(),
        Some("first")
    );
    assert_eq!(
        seams.entry_count(ids::MODEL_CONFIG_AUDIT),
        1,
        "stale CAS must not add an audit record"
    );
}

#[test]
fn redacted_config_reads_use_the_core_shared_cache_when_scope_is_complete() {
    let seams = FakeSeams::new();
    seams.set_setting("shop.refunds_enabled", "true");
    seams.push_conditional_result(
        "extension.cache.get",
        json!({"outcome": "hit", "value": {
            "category": "shop", "config": {"refunds_enabled": false},
            "updatedAt": null, "committedRevision": null, "secretsRedacted": true
        }}),
    );
    let mut get = request(
        "GET",
        "/admin/config/shop",
        ids::ROUTE_ADMIN_CONFIG_SHOP_GET,
        Value::Null,
    );
    get.context_json = json!({
        "authenticated": true,
        "systemAdmin": true,
        "siteId": "site-a",
        "requestId": "request-a"
    })
    .to_string();

    let body: Value = serde_json::from_str(&handle(&seams, &get).unwrap().body).unwrap();

    assert_eq!(body["config"]["refunds_enabled"], false);
    assert_eq!(seams.db_batch_request_count(), 1);
}

#[test]
fn unredacted_query_never_discloses_config_secrets() {
    let seams = FakeSeams::new();
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_live_should_stay_private");
    let mut get = request(
        "GET",
        "/admin/config/stripe",
        ids::ROUTE_ADMIN_CONFIG_STRIPE_GET,
        Value::Null,
    );
    get.query = vec![("redact_secrets".into(), "false".into())];
    get.context_json = admin_ctx(&[ids::ROUTE_ADMIN]);
    let body: Value = serde_json::from_str(&handle(&seams, &get).unwrap().body).unwrap();

    assert_eq!(body["config"]["secret_key"], "[REDACTED]");
    assert_eq!(body["secretsRedacted"], true);
}

#[test]
fn generic_host_settings_claim_cannot_update_payment_config() {
    let seams = FakeSeams::new();
    let mut update = request(
        "PUT",
        "/admin/config/stripe",
        ids::ROUTE_ADMIN_CONFIG_STRIPE_UPDATE,
        json!({
            "config": {
                "secret_key": "sk_attacker_replaced_secret"
            }
        }),
    );
    update.context_json = admin_ctx(&["manage_settings"]);

    let error = handle(&seams, &update).unwrap_err();

    assert_eq!(error.status, 403);
    assert_eq!(
        seams.secret_get(ids::SECRET_STRIPE_KEY).unwrap().as_deref(),
        None
    );
}

#[test]
fn rejects_config_routes_without_admin_claim() {
    let seams = FakeSeams::new();
    let mut get = request(
        "GET",
        "/admin/config/stripe",
        ids::ROUTE_ADMIN_CONFIG_STRIPE_GET,
        Value::Null,
    );
    get.context_json = admin_ctx(&["cedros-pay:balance-read"]);

    let error = handle(&seams, &get).unwrap_err();

    assert_eq!(error.status, 403);
}

#[test]
fn rejects_hand_set_ingress_tokens_before_secret_write() {
    for token in [
        "guessable",
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    ] {
        let s = FakeSeams::new();
        let request = request(
            "PUT",
            "/admin/config/stripe",
            ids::ROUTE_ADMIN_CONFIG_STRIPE_UPDATE,
            json!({"config":{"webhook_token":token}}),
        );
        assert_eq!(handle(&s, &request).unwrap_err().status, 400);
        assert!(s
            .secret_get(ids::SECRET_STRIPE_WEBHOOK_TOKEN)
            .unwrap()
            .is_none());
    }
}
