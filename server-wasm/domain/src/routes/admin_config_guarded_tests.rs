use serde_json::{json, Value};

use super::*;
use crate::fake::FakeSeams;

fn request(route_id: &str, body: Value) -> RouteRequest {
    let mut body = body;
    body["mutationId"] = json!("guarded-config-test");
    body["expectedRevision"] = Value::Null;
    RouteRequest {
        route_id: route_id.into(),
        method: "PUT".into(),
        path: "/admin/config/stripe".into(),
        headers: vec![(
            "Idempotency-Key".into(),
            "extension-config:guarded-config-test".into(),
        )],
        body: body.to_string(),
        context_json: json!({
            "authenticated": true,
            "permissionClaims": [ids::ROUTE_ADMIN],
            "csrfVerified": true,
        })
        .to_string(),
        ..Default::default()
    }
}

#[test]
fn exact_marker_allows_enabling_and_refreshes_available_snapshot() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    let update = request(
        ids::ROUTE_ADMIN_CONFIG_STRIPE_UPDATE,
        json!({
            "config": {
                "enabled": true,
                "secret_key": "sk_test_redacted",
                "publishable_key": "pk_test"
            }
        }),
    );

    assert_eq!(handle(&seams, &update).unwrap().status, 200);
    let snapshot = seams
        .setting_get(ids::SETTING_SHOP_PAYMENT_AVAILABILITY_SNAPSHOT)
        .unwrap()
        .unwrap();
    let snapshot: Value = serde_json::from_str(&snapshot).unwrap();
    assert_eq!(snapshot["paymentMethods"]["stripe"]["available"], true);
}

#[test]
fn validation_uses_exact_marker_without_writing_configuration() {
    let seams = FakeSeams::new();
    let mut validate = request(
        ids::ROUTE_ADMIN_CONFIG_VALIDATE,
        json!({ "category": "stripe", "config": { "enabled": true } }),
    );
    validate.method = "POST".into();
    validate.path = "/admin/config/validate".into();

    let blocked: Value = serde_json::from_str(&handle(&seams, &validate).unwrap().body).unwrap();
    assert_eq!(blocked["valid"], false);
    assert_eq!(seams.setting_get("stripe.enabled").unwrap(), None);

    crate::guarded_policy::enroll(&seams).unwrap();
    let active: Value = serde_json::from_str(&handle(&seams, &validate).unwrap().body).unwrap();
    assert_eq!(active["valid"], true);
    assert_eq!(seams.setting_get("stripe.enabled").unwrap(), None);
}
