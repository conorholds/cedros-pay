use serde_json::json;

use super::*;

fn policy() -> RegionalPaymentPolicy {
    RegionalPaymentPolicy::from_value(&json!({
        "schemaVersion": 1,
        "enabled": true,
        "fallbackMethods": ["x402"],
        "rules": [{
            "id": "cards-markets",
            "label": "USA and EU",
            "countries": ["de", "US"],
            "methods": ["stripe", "x402"]
        }]
    }))
    .unwrap()
}

#[test]
fn shared_contract_fixture_is_accepted() {
    let value: serde_json::Value = serde_json::from_str(include_str!(
        "../../../docs/fixtures/cedros-pay-regional-payment-policy.json"
    ))
    .unwrap();
    let policy = RegionalPaymentPolicy::from_value(&value).unwrap();
    assert!(policy.enforce(Some("US"), &[PaymentMethod::Stripe]).is_ok());
    assert_eq!(
        policy
            .enforce(Some("JP"), &[PaymentMethod::Stripe])
            .unwrap_err()
            .code,
        "payment_method_unavailable_in_region"
    );
}

#[test]
fn resolves_rule_fallback_and_unknown_country() {
    let policy = policy();
    assert_eq!(
        policy.binding(Some("us")).unwrap().allowed_methods,
        vec![RegionalPaymentMethod::Stripe, RegionalPaymentMethod::X402]
    );
    assert_eq!(
        policy.binding(Some("JP")).unwrap().allowed_methods,
        vec![RegionalPaymentMethod::X402]
    );
    assert_eq!(
        policy.binding(None).unwrap().allowed_methods,
        vec![RegionalPaymentMethod::X402]
    );
}

#[test]
fn rejects_disallowed_method_and_overlapping_countries() {
    let error = policy()
        .enforce(Some("JP"), &[PaymentMethod::Stripe])
        .unwrap_err();
    assert_eq!(
        (error.status, error.code),
        (409, "payment_method_unavailable_in_region")
    );

    let overlap = RegionalPaymentPolicy::from_value(&json!({
        "schemaVersion": 1,
        "enabled": true,
        "fallbackMethods": ["x402"],
        "rules": [
            { "id": "a", "label": "A", "countries": ["US"], "methods": ["stripe"] },
            { "id": "b", "label": "B", "countries": ["us"], "methods": ["x402"] }
        ]
    }))
    .unwrap_err();
    assert!(overlap.message.contains("only one"));
}

#[test]
fn disabled_or_absent_policy_preserves_every_rail() {
    let policy = RegionalPaymentPolicy::default();
    let binding = policy.binding(Some("CA")).unwrap();
    assert_eq!(binding.allowed_methods, ALL_METHODS);
    assert!(policy
        .enforce(
            Some("CA"),
            &[
                PaymentMethod::Stripe,
                PaymentMethod::X402,
                PaymentMethod::Credits
            ]
        )
        .is_ok());
}

#[test]
fn empty_method_sets_explicitly_disable_checkout() {
    let policy = RegionalPaymentPolicy::from_value(&json!({
        "schemaVersion": 1,
        "enabled": true,
        "fallbackMethods": [],
        "rules": [{ "id": "blocked", "label": "Blocked", "countries": ["US"], "methods": [] }]
    }))
    .unwrap();

    for country in [Some("US"), Some("JP"), None] {
        let error = policy
            .enforce(country, &[PaymentMethod::Stripe])
            .unwrap_err();
        assert_eq!(error.code, "payment_method_unavailable_in_region");
    }
}
