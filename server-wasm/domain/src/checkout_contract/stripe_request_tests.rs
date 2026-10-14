use serde_json::json;

use super::*;

#[test]
fn merchant_namespace_is_stable_across_buyers_but_changes_by_environment() {
    let buyer_a = crate::auth::Buyer {
        user_id: "buyer-a".into(),
        claims: serde_json::Value::Null,
    };
    let buyer_b = crate::auth::Buyer {
        user_id: "buyer-b".into(),
        claims: serde_json::Value::Null,
    };
    let context = |environment: &str| crate::ctx::RequestContext {
        site_id: Some("merchant-a".into()),
        environment: Some(environment.into()),
        ..Default::default()
    };
    let a = CanonicalScope::from_host(&context("production"), CanonicalActor::Verified(&buyer_a))
        .unwrap();
    let b = CanonicalScope::from_host(&context("production"), CanonicalActor::Verified(&buyer_b))
        .unwrap();
    let staging =
        CanonicalScope::from_host(&context("staging"), CanonicalActor::Verified(&buyer_a)).unwrap();
    assert_eq!(a.merchant_namespace, b.merchant_namespace);
    assert_ne!(a.actor_scope, b.actor_scope);
    assert_ne!(a.merchant_namespace, staging.merchant_namespace);
}

#[test]
fn provider_key_uses_full_public_key_and_trusted_merchant_account_namespace() {
    let merchant_a = "a".repeat(64);
    let merchant_b = "b".repeat(64);
    let lower = format!("cedros-shop-checkout-{}", "i".repeat(46));
    let upper = format!("cedros-shop-checkout-{}", "I".repeat(46));
    assert_eq!((lower.len(), upper.len()), (67, 67));
    let provider_a = StripeRequestBinding::provider_namespace(&merchant_a, "acct_primary").unwrap();
    let provider_b = StripeRequestBinding::provider_namespace(&merchant_b, "acct_primary").unwrap();
    let provider_account =
        StripeRequestBinding::provider_namespace(&merchant_a, "acct_secondary").unwrap();

    let baseline = StripeRequestBinding::derive(&provider_a, &lower, 1_000)
        .unwrap()
        .idempotency_key;
    let exact_replay = StripeRequestBinding::derive(&provider_a, &lower, 9_000)
        .unwrap()
        .idempotency_key;
    let changed_case = StripeRequestBinding::derive(&provider_a, &upper, 1_000)
        .unwrap()
        .idempotency_key;
    let changed_merchant = StripeRequestBinding::derive(&provider_b, &lower, 1_000)
        .unwrap()
        .idempotency_key;
    let changed_account = StripeRequestBinding::derive(&provider_account, &lower, 1_000)
        .unwrap()
        .idempotency_key;

    assert_eq!(baseline, exact_replay);
    assert_eq!(baseline.len(), 84);
    assert!(baseline.starts_with("cedros-pay-checkout-"));
    assert!(!baseline.contains(&lower));
    assert_eq!(provider_a.len(), "checkout-provider:".len() + 64);
    assert_ne!(baseline, changed_case);
    assert_ne!(baseline, changed_merchant);
    assert_ne!(baseline, changed_account);
}

#[test]
fn canonical_create_persists_request_binding_and_aligns_provider_and_hold_expiry() {
    let seams = inventory_lifecycle_tests::setup_tracked(10);
    seams.set_secret(crate::ids::SECRET_STRIPE_KEY, "sk_test_redacted");
    let quote = api_tests::facade(&seams)
        .quote(
            "expiry-quote",
            &api_tests::quote_body("expiry-quote", json!(["stripe"])),
        )
        .unwrap();
    let hold_id = quote.quote.inventory_hold.as_ref().unwrap().hold_id.clone();
    let key = format!("shop-checkout-{}", "K".repeat(53));
    assert_eq!(key.len(), 67);
    seams.push_http_response(
        200,
        r#"{"id":"cs_expiry","url":"https://checkout.stripe.com/expiry"}"#,
    );

    let outcome = api_tests::facade(&seams)
        .checkout(
            &key,
            &api_tests::checkout_body(&key, &quote.operation_id, "stripe"),
        )
        .unwrap();
    let CanonicalPaymentOutcome::ActionRequired { operation_id, .. } = outcome else {
        panic!("expected action required")
    };
    let operation_key = identity::operation_entry_key(&operation_id).unwrap();
    let record = seams.get_entry(OPERATION_MODEL, &operation_key).unwrap();
    let binding = &record["canonicalContext"]["stripe_request"];
    let provider_key = binding["idempotencyKey"].as_str().unwrap();
    let expires_at = binding["expiresAt"].as_i64().unwrap();
    let hold = seams.get_entry(INVENTORY_HOLD_MODEL, &hold_id).unwrap();
    assert_eq!(hold["expiresAt"], expires_at);
    assert_eq!(
        expires_at,
        record["createdAt"].as_i64().unwrap() + crate::stripe::checkout_api::SESSION_TTL_SECONDS
    );

    let request = seams.http_requests.borrow().last().unwrap().clone();
    let header = request["headers"]
        .as_array()
        .unwrap()
        .iter()
        .find(|header| header[0] == "idempotency-key")
        .unwrap();
    assert_eq!(header[1], provider_key);
    assert_ne!(header[1], key);
    assert!(request["headers"].as_array().unwrap().iter().any(|header| {
        header[0] == "stripe-version" && header[1] == crate::stripe::api::STRIPE_API_VERSION
    }));
    let fields: Vec<_> = request["body"].as_str().unwrap().split('&').collect();
    assert!(fields
        .iter()
        .any(|field| *field == format!("expires_at={expires_at}")));
    assert!(fields.contains(&"payment_method_types%5B0%5D=card"));
    assert!(fields.contains(&"payment_intent_data%5Bmetadata%5D%5Bcedros_pay_checkout%5D=true"));
    assert!(fields.iter().any(|field| field
        .starts_with("payment_intent_data%5Bmetadata%5D%5Bcedros_pay_operation_id%5D=")));
}
