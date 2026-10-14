use serde_json::{json, Value};

use super::*;
use crate::fake::FakeSeams;

fn update(body: Value) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_ADMIN_CONFIG_SHOP_UPDATE.into(),
        method: "PATCH".into(),
        path: "/admin/config/shop".into(),
        headers: vec![(
            "Idempotency-Key".into(),
            "extension-config:regional-policy-test".into(),
        )],
        body: json!({
            "updates": { "regional_payment_policy": body },
            "mutationId": "regional-policy-test",
            "expectedRevision": null,
        })
        .to_string(),
        context_json: json!({
            "authenticated": true,
            "systemAdmin": true,
            "csrfVerified": true
        })
        .to_string(),
        ..Default::default()
    }
}

fn policy() -> Value {
    json!({
        "schemaVersion": 1,
        "enabled": true,
        "fallbackMethods": ["x402"],
        "rules": [{
            "id": "cards",
            "label": "Card markets",
            "countries": ["US", "DE"],
            "methods": ["stripe", "x402"]
        }]
    })
}

#[test]
fn valid_policy_write_refreshes_shop_bridge_snapshot() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();

    handle(&seams, &update(policy())).unwrap();

    let stored = seams
        .setting_get(crate::regional_payment_policy::SETTING_KEY)
        .unwrap()
        .unwrap();
    let stored: Value = serde_json::from_str(&stored).unwrap();
    assert_eq!(stored["rules"][0]["countries"], json!(["DE", "US"]));

    let snapshot = seams
        .setting_get(ids::SETTING_SHOP_PAYMENT_AVAILABILITY_SNAPSHOT)
        .unwrap()
        .unwrap();
    let snapshot: Value = serde_json::from_str(&snapshot).unwrap();
    assert_eq!(snapshot["paymentMethods"]["regionalPolicy"], stored);
}

#[test]
fn overlapping_country_rules_fail_before_any_write() {
    let seams = FakeSeams::new();
    let mut invalid = policy();
    invalid["rules"] = json!([
        { "id": "a", "label": "A", "countries": ["US"], "methods": ["stripe"] },
        { "id": "b", "label": "B", "countries": ["us"], "methods": ["x402"] }
    ]);

    let error = handle(&seams, &update(invalid)).unwrap_err();

    assert_eq!(error.status, 400);
    assert!(error.message.contains("only one"));
    assert_eq!(
        seams
            .setting_get(crate::regional_payment_policy::SETTING_KEY)
            .unwrap(),
        None
    );
}
