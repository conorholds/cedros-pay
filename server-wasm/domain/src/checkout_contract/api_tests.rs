use serde_json::{json, Value};

use super::provider::{
    self, META_ATTEMPT_ID, META_LEDGER_KEY, META_MATERIAL_HASH, META_OPERATION_ID, META_SCOPE_HASH,
};
use super::*;
use crate::ctx::RequestContext;
use crate::fake::FakeSeams;
use crate::models::LedgerEntry;

fn context() -> RequestContext {
    RequestContext {
        site_id: Some("site-a".into()),
        environment: Some("production".into()),
        ..Default::default()
    }
}

pub(crate) fn facade<'a>(seams: &'a FakeSeams) -> CanonicalCheckoutFacade<'a, FakeSeams> {
    CanonicalCheckoutFacade::for_guest(seams, &context(), "host-guest-session").unwrap()
}

pub(crate) fn setup() -> FakeSeams {
    let seams = FakeSeams::new();
    seams.set_secret(
        crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT,
        "acct_canonical_test",
    );
    seams.set_secret(
        crate::ids::SECRET_CHECKOUT_CONTEXT_MAC,
        "test-only-checkout-context-mac-key-32-bytes",
    );
    seams.set_setting(
        crate::ids::SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS,
        r#"["https://shop.example"]"#,
    );
    crate::guarded_policy::enroll(&seams).unwrap();
    super::pricing_tip::store(
        &seams,
        &super::pricing_tip::CheckoutTippingPolicy {
            schema_version: 1,
            enabled: true,
            allow_fixed: true,
            allow_percentage: true,
            max_amount_cents: 10_000,
            max_percentage_bps: 2_500,
        },
    )
    .unwrap();
    seams.seed(
        crate::ids::MODEL_CATALOG,
        "product-1",
        json!({
            "id": "product-1",
            "active": true,
            "title": "Authoritative product",
            "price": { "amountCents": 725, "currency": "USD" },
            "paymentResource": "product-1"
        }),
    );
    seams
}

pub(crate) fn quote_body(key: &str, methods: Value) -> String {
    json!({
        "schemaVersion": 1,
        "idempotencyKey": key,
        "attemptId": "attempt-1",
        "clientMaterialSha256": "1".repeat(64),
        "source": {
            "kind": "items",
            "items": [{ "resource": "product-1", "qty": 2 }]
        },
        "customerContext": {
            "fulfillment": { "kind": "digital" },
            "contact": { "email": "buyer@example.com" },
            "returnUrls": {
                "success": "https://shop.example/success",
                "cancel": "https://shop.example/cancel"
            }
        },
        "tip": { "kind": "fixed", "amountCents": 50 },
        "requestedPaymentMethods": methods
    })
    .to_string()
}

pub(crate) fn checkout_body(key: &str, quote_operation_id: &str, method: &str) -> String {
    let proof = match method {
        "x402" => json!({ "kind": "x402", "transaction": "signature" }),
        "credits" => json!({ "kind": "credits" }),
        _ => json!({ "kind": "stripe" }),
    };
    json!({
        "schemaVersion": 1,
        "idempotencyKey": key,
        "attemptId": "attempt-1",
        "clientMaterialSha256": "2".repeat(64),
        "quoteOperationId": quote_operation_id,
        "paymentMethod": method,
        "customerContext": {
            "fulfillment": { "kind": "digital" },
            "contact": { "email": "buyer@example.com" },
            "returnUrls": {
                "success": "https://shop.example/success",
                "cancel": "https://shop.example/cancel"
            }
        },
        "railProof": proof
    })
    .to_string()
}

#[test]
fn strict_boundary_rejects_unknown_oversized_and_header_mismatch_without_mutation() {
    let seams = setup();
    let _explicit_dev_policy = facade(&seams).allow_test_loopback_provider_urls();
    let mut body: Value =
        serde_json::from_str(&quote_body("quote-key", json!(["stripe"]))).unwrap();
    body["source"]["items"][0]["clientPrice"] = json!(1);
    let error = facade(&seams)
        .quote("quote-key", &body.to_string())
        .unwrap_err();
    assert_eq!((error.status, error.code), (400, "bad_request"));

    let mismatch = facade(&seams)
        .quote("different", &quote_body("quote-key", json!(["stripe"])))
        .unwrap_err();
    assert_eq!(mismatch.status, 400);
    let mut invalid_context: Value =
        serde_json::from_str(&quote_body("context-key", json!(["stripe"]))).unwrap();
    invalid_context["customerContext"]["contact"]["email"] = json!("not-an-email");
    invalid_context["customerContext"]["returnUrls"]["success"] = json!("https:///missing-host");
    assert_eq!(
        facade(&seams)
            .quote("context-key", &invalid_context.to_string())
            .unwrap_err()
            .status,
        422
    );
    assert!(super::api_validation::operation_id(&format!("payop_{}", "A".repeat(64))).is_err());
    let oversized = "x".repeat(super::api_validation::MAX_BODY_BYTES + 1);
    assert_eq!(
        facade(&seams).quote("key", &oversized).unwrap_err().status,
        413
    );
    assert_eq!(seams.entry_count(OPERATION_MODEL), 0);
    assert!(seams.http_requests.borrow().is_empty());
}

#[test]
fn quote_is_authoritative_replayable_and_persists_only_safe_context() {
    let seams = setup();
    let body = quote_body("quote-key", json!(["stripe"]));
    let first = facade(&seams).quote("quote-key", &body).unwrap();
    assert_eq!(
        (first.quote.subtotal_cents, first.quote.total_cents),
        (1_450, 1_500)
    );
    assert_eq!(first.quote.lines[0].unit_amount_cents, 725);
    assert!(!first.replayed);

    seams.seed(
        crate::ids::MODEL_CATALOG,
        "product-1",
        json!({ "active": true, "title": "Changed", "price": {
            "amountCents": 999, "currency": "USD" } }),
    );
    let replay = facade(&seams).quote("quote-key", &body).unwrap();
    assert!(replay.replayed);
    assert_eq!(replay.quote, first.quote);
    let stored = seams
        .get_entry(
            OPERATION_MODEL,
            &super::identity::operation_entry_key(&first.operation_id).unwrap(),
        )
        .unwrap()
        .to_string();
    for forbidden in [
        "buyer@example.com",
        "shop.example",
        "host-guest-session",
        "quote-key",
        "client_secret",
    ] {
        assert!(!stored.contains(forbidden));
    }
}

#[test]
fn unavailable_shipping_fails_before_quote_persistence() {
    let seams = setup();
    let mut shipping: Value =
        serde_json::from_str(&quote_body("shipping-key", json!(["stripe"]))).unwrap();
    shipping["customerContext"]["fulfillment"] = json!({
        "kind": "shipping",
        "address": { "line1": "1 Main", "city": "Town", "postalCode": "12345", "country": "US" },
        "shipping": { "optionId": "standard" }
    });
    let error = facade(&seams)
        .quote("shipping-key", &shipping.to_string())
        .unwrap_err();
    assert_eq!(
        (error.status, error.code),
        (503, "shipping_authority_unavailable")
    );
    assert_eq!(seams.entry_count(OPERATION_MODEL), 0);
}

#[test]
fn direct_rails_fail_closed_before_claim_when_their_authority_is_missing() {
    let seams = setup();
    let x402_error = facade(&seams)
        .quote(
            "x402-unconfigured",
            &quote_body("x402-unconfigured", json!(["x402"])),
        )
        .unwrap_err();
    assert_eq!(
        (x402_error.status, x402_error.code),
        (503, "x402_unavailable")
    );

    let error = facade(&seams)
        .quote("credits", &quote_body("credits", json!(["credits"])))
        .unwrap_err();
    assert_eq!((error.status, error.code), (401, "unauthorized"));
    assert_eq!(seams.entry_count(OPERATION_MODEL), 0);
    assert_eq!(seams.entry_count(crate::ids::MODEL_LEDGER), 0);
    assert!(seams.http_requests.borrow().is_empty());
    assert!(seams.provider_requests.borrow().is_empty());
}

#[test]
fn stripe_lifecycle_correlates_exactly_and_status_never_uses_egress() {
    let seams = setup();
    seams.set_secret(crate::ids::SECRET_STRIPE_KEY, "sk_test_redacted");
    let quote = facade(&seams)
        .quote(
            "stripe-quote",
            &quote_body("stripe-quote", json!(["stripe"])),
        )
        .unwrap();
    seams.push_http_response(
        200,
        r#"{"id":"cs_canonical_1","url":"https://checkout.stripe.com/canonical"}"#,
    );
    let action = facade(&seams)
        .checkout(
            "stripe-checkout",
            &checkout_body("stripe-checkout", &quote.operation_id, "stripe"),
        )
        .unwrap();
    let (operation_id, artifact) = match action {
        CanonicalPaymentOutcome::ActionRequired {
            operation_id,
            return_artifact,
            ..
        } => (operation_id, return_artifact),
        other => panic!("expected action_required, got {other:?}"),
    };
    let egress_before_status = seams.http_requests.borrow().len();
    assert!(matches!(
        facade(&seams).status(&operation_id).unwrap(),
        CanonicalPaymentOutcome::ActionRequired { .. }
    ));
    assert_eq!(seams.http_requests.borrow().len(), egress_before_status);

    let retrieval = retrieval(
        &seams,
        &operation_id,
        &artifact,
        "https://checkout.stripe.com/retry",
    );
    seams.push_http_response(200, &retrieval);
    let operation_body = resolve_body(&operation_id, &artifact);
    assert!(matches!(
        facade(&seams).resolve(&operation_body).unwrap(),
        CanonicalResolveOutcome::Resolved { .. }
    ));
    seams.push_http_response(200, &retrieval);
    assert!(matches!(
        facade(&seams).verify(&verify_body(&artifact)).unwrap(),
        CanonicalVerifyOutcome::Verified { ref checkout_attempt_id }
            if checkout_attempt_id == "attempt-1"
    ));
    assert_eq!(seams.entry_count(crate::ids::MODEL_WEBHOOK_OUTBOX), 2); // effect + PaymentIntent fence
    assert_eq!(
        super::deliver_settlement_effects(&seams, 20)
            .unwrap()
            .delivered,
        1
    );
    assert_eq!(seams.event_count(crate::ids::EVENT_PAYMENT_SUCCEEDED), 1);
    assert_eq!(seams.event_count(crate::ids::EVENT_CHECKOUT_SETTLED), 1);
    assert_eq!(seams.event_count(crate::ids::EVENT_ENTITLEMENT_CHANGED), 1);

    seams.seed(
        crate::ids::MODEL_LEDGER,
        &artifact,
        serde_json::to_value(LedgerEntry {
            reference: artifact.clone(),
            kind: "payment".into(),
            status: "succeeded".into(),
            gross_cents: 1_500,
            currency: "USD".into(),
            provider: "stripe".into(),
            provider_ref: Some(artifact.clone()),
            ..Default::default()
        })
        .unwrap(),
    );
    let before_paid_status = seams.http_requests.borrow().len();
    assert!(matches!(
        facade(&seams).status(&operation_id).unwrap(),
        CanonicalPaymentOutcome::Paid { .. }
    ));
    assert_eq!(seams.http_requests.borrow().len(), before_paid_status);
    let stored = seams
        .get_entry(
            OPERATION_MODEL,
            &super::identity::operation_entry_key(&operation_id).unwrap(),
        )
        .unwrap()
        .to_string();
    assert!(!stored.contains("checkout.stripe.com"));
    assert!(!stored.contains("buyer@example.com"));
}

pub(super) fn resolve_body(operation_id: &str, artifact: &str) -> String {
    json!({
        "schemaVersion": 1,
        "operationId": operation_id,
        "expectedAttemptId": "attempt-1",
        "returnArtifact": artifact
    })
    .to_string()
}

pub(super) fn verify_body(artifact: &str) -> String {
    json!({
        "schemaVersion": 1,
        "expectedAttemptId": "attempt-1",
        "returnArtifact": artifact
    })
    .to_string()
}

pub(super) fn retrieval(
    seams: &FakeSeams,
    operation_id: &str,
    artifact: &str,
    url: &str,
) -> String {
    let key = super::identity::operation_entry_key(operation_id).unwrap();
    let record = seams.get_entry(OPERATION_MODEL, &key).unwrap();
    let quote_id = record["canonicalContext"]["quote_operation_id"]
        .as_str()
        .unwrap();
    let quote_key = super::identity::operation_entry_key(quote_id).unwrap();
    let quote = seams.get_entry(OPERATION_MODEL, &quote_key).unwrap();
    let snapshot = &quote["canonicalContext"]["snapshot"];
    json!({
        "id": artifact,
        "url": url,
        "mode": "payment",
        "status": "complete",
        "expires_at": record["canonicalContext"]["stripe_request"]["expiresAt"],
        "amount_total": snapshot["totalCents"],
        "currency": snapshot["currency"].as_str().unwrap().to_ascii_lowercase(),
        "payment_status": "paid",
        "payment_intent": format!("pi_{artifact}"),
        "metadata": {
            META_LEDGER_KEY: key,
            META_ATTEMPT_ID: provider::attempt_hash(
                record["providerScope"].as_str().unwrap(),
                "attempt-1"
            ),
            META_OPERATION_ID: operation_id,
            META_SCOPE_HASH: provider::scope_hash(record["providerScope"].as_str().unwrap()),
            META_MATERIAL_HASH: record["materialFingerprint"].as_str().unwrap()
        }
    })
    .to_string()
}

#[test]
fn published_schema_fixtures_parse_through_the_exact_runtime_boundary() {
    let fixtures: Value = serde_json::from_str(include_str!(
        "../../../../docs/fixtures/cedros-pay-checkout-contract.json"
    ))
    .unwrap();
    let quote = fixtures["quoteRequest"].to_string();
    super::api_validation::parse_quote("quote-01HQEXAMPLE", &quote).unwrap();
    let checkout = fixtures["checkoutRequest"].to_string();
    super::api_validation::parse_checkout("checkout-01HQEXAMPLE", &checkout).unwrap();
    super::api_return_validation::parse_resolve(&fixtures["resolveRequest"].to_string()).unwrap();
    let verify = &fixtures["verifyReturnRequest"];
    super::api_return_validation::parse_verify(&verify.to_string()).unwrap();
    let mut injected_operation = verify.clone();
    injected_operation["operationId"] = fixtures["resolveRequest"]["operationId"].clone();
    assert!(super::api_return_validation::parse_verify(&injected_operation.to_string()).is_err());
    let mut operationless_resolve = fixtures["resolveRequest"].clone();
    operationless_resolve
        .as_object_mut()
        .unwrap()
        .remove("operationId");
    assert!(
        super::api_return_validation::parse_resolve(&operationless_resolve.to_string()).is_err()
    );

    let schema: Value = serde_json::from_str(include_str!(
        "../../../../docs/fixtures/cedros-pay-checkout-schemas.json"
    ))
    .unwrap();
    assert_eq!(
        schema["$defs"]["quoteRequest"]["properties"]["schemaVersion"]["const"],
        1
    );
    assert_eq!(
        schema["$defs"]["quoteRequest"]["additionalProperties"],
        false
    );
    assert!(schema["$defs"]["quoteRequest"]["required"]
        .as_array()
        .unwrap()
        .contains(&json!("clientMaterialSha256")));
    assert!(schema["$defs"]["checkoutRequest"]["required"]
        .as_array()
        .unwrap()
        .contains(&json!("clientMaterialSha256")));
    assert_eq!(
        schema["$defs"]["descriptor"]["properties"]["replayTtlMs"]["const"],
        259_200_000_i64
    );
    let outcomes: Value = serde_json::from_str(include_str!(
        "../../../../docs/fixtures/cedros-pay-checkout-outcomes.json"
    ))
    .unwrap();
    assert_eq!(outcomes["actionRequired"]["status"], "action_required");
    assert_eq!(
        outcomes["verified"]["checkoutAttemptId"],
        "attempt-01HQEXAMPLE"
    );
    assert!(outcomes["verified"].get("operationId").is_none());
    let errors: Value = serde_json::from_str(include_str!(
        "../../../../docs/fixtures/cedros-pay-checkout-errors.json"
    ))
    .unwrap();
    assert_eq!(errors["schemaVersion"], 1);
    let errors = errors["errors"].as_array().unwrap();
    assert!(errors.len() >= 18);
    for code in [
        "payment_method_unavailable_in_region",
        "regional_payment_policy_changed",
    ] {
        assert!(errors.iter().any(|error| error["code"] == code));
    }
}
