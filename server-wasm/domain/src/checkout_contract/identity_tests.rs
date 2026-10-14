use serde_json::json;

use super::*;

fn identity(
    scope: &str,
    operation: OperationKind,
    key: &str,
    material: serde_json::Value,
) -> OperationIdentity {
    OperationIdentity::new(
        ProviderScope::from_host(scope).unwrap(),
        operation,
        ExternalIdempotencyKey::parse_exact(key).unwrap(),
        &material,
    )
}

#[test]
fn frozen_descriptor_and_exact_key_contract_are_stable() {
    assert_eq!(PROTOCOL, "cedros-pay-checkout");
    assert_eq!(QUOTE_SCOPE, "cedros-pay-checkout:quote");
    assert_eq!(CHECKOUT_SCOPE, "cedros-pay-checkout:checkout");
    assert_ne!(QUOTE_SCOPE, CHECKOUT_SCOPE);
    assert_eq!(MIN_REPLAY_TTL_MILLIS, 259_200_000);
    assert_eq!(MAX_IDEMPOTENCY_KEY_LENGTH, 67);

    let key = "K".repeat(67);
    assert_eq!(
        ExternalIdempotencyKey::parse_exact(&key).unwrap().as_str(),
        key
    );
    assert!(ExternalIdempotencyKey::parse_exact(&"K".repeat(68)).is_err());
    assert!(ExternalIdempotencyKey::parse_exact(" leading").is_err());
    assert!(ExternalIdempotencyKey::parse_exact("not-ascii-é").is_err());
    assert!(ProviderScope::from_host(" host-scope").is_err());
    let descriptor = CheckoutDescriptor::for_provider_scope("host-derived-provider".into());
    assert_eq!(
        serde_json::to_value(descriptor).unwrap(),
        json!({
            "protocol": "cedros-pay-checkout",
            "providerScope": "host-derived-provider",
            "replayTtlMs": 259_200_000,
            "acceptsExternalIdempotencyKey": true,
            "maxIdempotencyKeyLength": 67,
            "idempotencyKeyCharacterSet": "ascii-visible",
            "operationScopes": {
                "quote": "cedros-pay-checkout:quote",
                "checkout": "cedros-pay-checkout:checkout"
            }
        })
    );
}

#[test]
fn identity_preserves_case_and_isolates_scope_operation_and_full_key() {
    let material = json!({"amount": 10});
    let lower = identity(
        "tenant-a",
        OperationKind::Checkout,
        "case-key",
        material.clone(),
    );
    let upper = identity(
        "tenant-a",
        OperationKind::Checkout,
        "CASE-KEY",
        material.clone(),
    );
    let quote = identity(
        "tenant-a",
        OperationKind::Quote,
        "case-key",
        material.clone(),
    );
    let tenant = identity("tenant-b", OperationKind::Checkout, "case-key", material);
    assert_ne!(lower.entry_key(), upper.entry_key());
    assert_ne!(lower.entry_key(), quote.entry_key());
    assert_ne!(lower.entry_key(), tenant.entry_key());

    let prefix = "x".repeat(66);
    let first = identity(
        "tenant-a",
        OperationKind::Checkout,
        &(prefix.clone() + "A"),
        json!({}),
    );
    let second = identity(
        "tenant-a",
        OperationKind::Checkout,
        &(prefix + "B"),
        json!({}),
    );
    assert_ne!(first.entry_key(), second.entry_key());
}

#[test]
fn material_fingerprint_is_canonical_but_preserves_number_semantics() {
    let first = MaterialFingerprint::from_server_material(&json!({
        "nested": {"b": [true, 1], "a": "x"}, "amount": 1
    }));
    let reordered = MaterialFingerprint::from_server_material(&json!({
        "amount": 1, "nested": {"a": "x", "b": [true, 1]}
    }));
    let float = MaterialFingerprint::from_server_material(&json!({
        "nested": {"b": [true, 1], "a": "x"}, "amount": 1.0
    }));
    assert_eq!(first, reordered);
    assert_ne!(first, float);
}

#[test]
fn operation_owners_are_unique_csprng_fences() {
    let first = OperationOwner::random().unwrap();
    let second = OperationOwner::random().unwrap();
    assert_ne!(first.as_str(), second.as_str());
}
