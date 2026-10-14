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
    RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: path.into(),
        body: body.to_string(),
        context_json: admin_ctx(&[ids::ROUTE_ADMIN]),
        ..Default::default()
    }
}

/// Regression: the Content tab loads through the host admin session, which
/// carries only generic claims + `systemAdmin` (never `cedros-pay:admin`).
#[test]
fn host_admin_session_reads_site_settings_without_extension_claim() {
    let seams = FakeSeams::new();
    let mut get = request(
        "GET",
        "/admin/site-settings/tipping",
        ids::ROUTE_ADMIN_SITE_SETTINGS_TIPPING_GET,
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

    let resp = handle(&seams, &get).expect("host admin session reads site settings");

    assert_eq!(resp.status, 200);
    let body: Value = serde_json::from_str(&resp.body).unwrap();
    assert_eq!(body["kind"], "tipping");
}

#[test]
fn updates_tipping_site_settings_record() {
    let seams = FakeSeams::new();
    let update = request(
        "PUT",
        "/admin/site-settings/tipping",
        ids::ROUTE_ADMIN_SITE_SETTINGS_TIPPING_UPDATE,
        json!({
            "settings": {
                "enabled": true,
                "recipient": "tip-wallet",
                "currencies": [{ "symbol": "SOL", "decimals": 9, "logo": "" }],
                "presets": [100, 500],
                "label": "Support this post",
                "description": "Send a tip",
                "allowPerPostRecipient": true
            }
        }),
    );

    let update_resp = handle(&seams, &update).expect("update tipping settings");
    assert_eq!(update_resp.status, 200);

    let stored = seams
        .setting_get(ids::SETTING_SITE_TIPPING)
        .unwrap()
        .expect("stored tipping settings");
    let stored: Value = serde_json::from_str(&stored).unwrap();
    assert_eq!(stored["enabled"], true);
    assert_eq!(stored["recipient"], "tip-wallet");
    assert_eq!(stored["currencies"][0]["symbol"], "SOL");
}

#[test]
fn rejects_site_settings_updates_without_csrf_verification() {
    let seams = FakeSeams::new();
    let mut update = request(
        "PUT",
        "/admin/site-settings/monetization",
        ids::ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_UPDATE,
        json!({ "settings": { "enabled": true, "lockedMessage": "CSRF changed paywall" } }),
    );
    update.context_json = admin_ctx_with_csrf(&[ids::ROUTE_ADMIN], false);

    let error = handle(&seams, &update).unwrap_err();

    assert_eq!(error.status, 403);
    assert_eq!(
        seams.setting_get(ids::SETTING_SITE_MONETIZATION).unwrap(),
        None
    );
}

#[test]
fn merges_monetization_updates_with_existing_payload() {
    let seams = FakeSeams::new();
    seams.set_setting(
        ids::SETTING_SITE_MONETIZATION,
        &json!({
            "enabled": true,
            "defaultAccessMode": "paid",
            "defaultPrice": { "amountCents": 500, "currency": "USD" },
            "acceptedPaymentMethods": ["stripe", "credits"],
            "lockedMessage": "Members only"
        })
        .to_string(),
    );
    let update = request(
        "PUT",
        "/admin/site-settings/monetization",
        ids::ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_UPDATE,
        json!({ "settings": { "freeReadsPerMonth": 3 } }),
    );

    let update_resp = handle(&seams, &update).expect("update monetization settings");

    assert_eq!(update_resp.status, 200);
    let stored = seams
        .setting_get(ids::SETTING_SITE_MONETIZATION)
        .unwrap()
        .expect("stored monetization settings");
    let stored: Value = serde_json::from_str(&stored).unwrap();
    assert_eq!(stored["freeReadsPerMonth"], 3);
    assert_eq!(stored["defaultPrice"]["amountCents"], 500);
    assert_eq!(
        stored["acceptedPaymentMethods"],
        json!(["stripe", "credits"])
    );
}

#[test]
fn updates_media_monetization_defaults() {
    let seams = FakeSeams::new();
    let update = request(
        "PUT",
        "/admin/site-settings/monetization",
        ids::ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_UPDATE,
        json!({
            "settings": {
                "mediaEnabled": true,
                "mediaDefaultAccessMode": "locked",
                "mediaPreviewPolicy": {
                    "kind": "watermarked",
                    "assetId": null,
                    "variantKind": "low_res"
                },
                "mediaPayProductId": "product_media_123",
                "mediaRequiredEntitlementId": "",
                "mediaRequiresLogin": true,
                "mediaLockedMessage": "Purchase this gallery to view the full media."
            }
        }),
    );

    let update_resp = handle(&seams, &update).expect("update media monetization settings");

    assert_eq!(update_resp.status, 200);
    let stored = seams
        .setting_get(ids::SETTING_SITE_MONETIZATION)
        .unwrap()
        .expect("stored monetization settings");
    let stored: Value = serde_json::from_str(&stored).unwrap();
    assert_eq!(stored["mediaEnabled"], true);
    assert_eq!(stored["mediaDefaultAccessMode"], "locked");
    assert_eq!(stored["mediaPreviewPolicy"]["kind"], "watermarked");
    assert_eq!(stored["mediaPayProductId"], "product_media_123");
}

#[test]
fn rejects_enabled_locked_media_defaults_without_pay_reference() {
    let seams = FakeSeams::new();
    let update = request(
        "PUT",
        "/admin/site-settings/monetization",
        ids::ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_UPDATE,
        json!({
            "settings": {
                "mediaEnabled": true,
                "mediaDefaultAccessMode": "locked",
                "mediaPayProductId": "",
                "mediaRequiredEntitlementId": "",
                "mediaRequiresLogin": true
            }
        }),
    );

    let error = handle(&seams, &update).unwrap_err();

    assert_eq!(error.status, 400);
    assert!(error.message.contains("Pay product or entitlement"));
    assert_eq!(
        seams.setting_get(ids::SETTING_SITE_MONETIZATION).unwrap(),
        None
    );
}

#[test]
fn rejects_unknown_site_settings_keys() {
    let seams = FakeSeams::new();
    let update = request(
        "PUT",
        "/admin/site-settings/tipping",
        ids::ROUTE_ADMIN_SITE_SETTINGS_TIPPING_UPDATE,
        json!({ "settings": { "cedrosPayInstalled": true } }),
    );

    let error = handle(&seams, &update).unwrap_err();

    assert_eq!(error.status, 400);
}

#[test]
fn rejects_float_article_price() {
    let seams = FakeSeams::new();
    // A float-dollar amount must never be storable — money is integer minor units.
    for bad in [
        json!({ "amountCents": 4.99, "currency": "USD" }),
        json!({ "amount": 5, "currency": "USD" }),
        json!({ "amountCents": 500 }),
    ] {
        let update = request(
            "PUT",
            "/admin/site-settings/monetization",
            ids::ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_UPDATE,
            json!({ "settings": { "defaultPrice": bad } }),
        );
        let error = handle(&seams, &update).unwrap_err();
        assert_eq!(error.status, 400, "expected 400 for defaultPrice");
    }
}

#[test]
fn accepts_integer_cents_article_price_and_null() {
    let seams = FakeSeams::new();
    for ok in [
        json!({ "amountCents": 1599, "currency": "USD" }),
        Value::Null,
    ] {
        let update = request(
            "PUT",
            "/admin/site-settings/monetization",
            ids::ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_UPDATE,
            json!({ "settings": { "defaultPrice": ok } }),
        );
        assert!(
            handle(&seams, &update).is_ok(),
            "expected price to be accepted"
        );
    }
}

#[test]
fn rejects_secret_looking_nested_site_settings_keys() {
    let seams = FakeSeams::new();
    let update = request(
        "PUT",
        "/admin/site-settings/monetization",
        ids::ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_UPDATE,
        json!({
            "settings": {
                "defaultPrice": {
                    "amountCents": 500,
                    "currency": "USD",
                    "stripeSecret": "should-not-be-here"
                }
            }
        }),
    );

    let error = handle(&seams, &update).unwrap_err();

    assert_eq!(error.status, 400);
    assert!(error.message.contains("secret-looking field"));
}

#[test]
fn fails_closed_when_settings_seam_is_unavailable() {
    let seams = FakeSeams::new();
    seams.fail_settings();
    let update = request(
        "PUT",
        "/admin/site-settings/tipping",
        ids::ROUTE_ADMIN_SITE_SETTINGS_TIPPING_UPDATE,
        json!({ "settings": { "enabled": true } }),
    );

    let error = handle(&seams, &update).unwrap_err();

    assert_eq!(error.status, 500);
}

#[test]
fn rejects_site_settings_without_admin_claim() {
    let seams = FakeSeams::new();
    let mut get = request(
        "GET",
        "/admin/site-settings/monetization",
        ids::ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_GET,
        Value::Null,
    );
    get.context_json = admin_ctx(&["cedros-pay:balance-read"]);

    let error = handle(&seams, &get).unwrap_err();

    assert_eq!(error.status, 403);
}
