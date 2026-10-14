use std::collections::BTreeMap;

use serde_json::json;

use super::provider::{
    self, META_ATTEMPT_ID, META_LEDGER_KEY, META_MATERIAL_HASH, META_OPERATION_ID, META_SCOPE_HASH,
};
use super::test_support::operation_context;
use super::*;
use crate::ctx::RequestContext;
use crate::fake::FakeSeams;
use crate::ids;

pub(super) fn context(account: &str) -> TrustedProviderContext {
    TrustedProviderContext::from_host(
        &RequestContext {
            site_id: Some("merchant-a".into()),
            environment: Some("staging".into()),
            ..Default::default()
        },
        account,
    )
    .unwrap()
}

fn material(amount: i64) -> CheckoutMaterial {
    CheckoutMaterial {
        client_material_sha256: "1".repeat(64),
        amount_cents: amount,
        currency: "USD".into(),
        product_name: "Server-priced product".into(),
        success_url: "https://shop.example/return".into(),
        cancel_url: "https://shop.example/cart".into(),
        customer_email: None,
        client_reference_id: Some("cart-generation-7".into()),
        metadata: BTreeMap::from([("cart_id".into(), "cart-7".into())]),
    }
}

pub(super) fn command(key: &str, attempt: &str, amount: i64) -> CheckoutCommand {
    let mut canonical_context = operation_context(OperationKind::Checkout);
    let CanonicalOperationContext::Checkout { stripe_request, .. } = &mut canonical_context else {
        unreachable!()
    };
    stripe_request.as_mut().unwrap().idempotency_key = test_provider_key(key);
    CheckoutCommand {
        idempotency_key: key.into(),
        checkout_attempt_id: attempt.into(),
        material: material(amount),
        canonical_context,
        guarded_settlement: false,
        authority_guards: Vec::new(),
    }
}

fn test_provider_key(public_key: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-test-provider-key\0");
    digest.update(public_key.as_bytes());
    format!("cedros-pay-checkout-{}", hex::encode(digest.finalize()))
}

pub(super) fn setup() -> FakeSeams {
    let seams = FakeSeams::new();
    seams.set_now(1_000);
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_redacted");
    seams
}

pub(super) fn push_create(seams: &FakeSeams, session_id: &str, url: Option<&str>) {
    seams.push_http_response(200, &json!({"id": session_id, "url": url}).to_string());
}

fn resolved_fields(outcome: &CheckoutOutcome) -> (&str, &str, &str) {
    match outcome {
        CheckoutOutcome::Resolved {
            operation_id,
            attempt_id,
            return_artifact: Some(artifact),
            ..
        } => (operation_id, attempt_id, artifact),
        other => panic!("expected resolved checkout, got {other:?}"),
    }
}

fn identity_for(command: &CheckoutCommand, context: &TrustedProviderContext) -> OperationIdentity {
    OperationIdentity::new(
        context.scope.clone(),
        OperationKind::Checkout,
        ExternalIdempotencyKey::parse_exact(&command.idempotency_key).unwrap(),
        &serde_json::to_value(&command.material).unwrap(),
    )
}

fn retrieval_body(
    command: &CheckoutCommand,
    context: &TrustedProviderContext,
    outcome: &CheckoutOutcome,
    url: &str,
) -> String {
    let identity = identity_for(command, context);
    let (operation_id, attempt_id, artifact) = resolved_fields(outcome);
    json!({
        "id": artifact,
        "url": url,
        "mode": "payment",
        "status": "complete",
        "expires_at": 4_600,
        "amount_total": command.material.amount_cents,
        "currency": command.material.currency,
        "payment_status": "paid",
        "payment_intent": "pi_test",
        "metadata": {
            META_LEDGER_KEY: identity.entry_key(),
            META_ATTEMPT_ID: provider::attempt_hash(context.provider_scope(), attempt_id),
            META_OPERATION_ID: operation_id,
            META_SCOPE_HASH: provider::scope_hash(context.provider_scope()),
            META_MATERIAL_HASH: identity.material_fingerprint(),
        }
    })
    .to_string()
}

pub(super) fn post_count(seams: &FakeSeams) -> usize {
    seams
        .http_requests
        .borrow()
        .iter()
        .filter(|request| request["method"] == "POST")
        .count()
}

#[test]
fn exact_67_character_keys_preserve_case_in_identity_and_use_distinct_provider_keys() {
    let seams = setup();
    let lower = format!("cedros-shop-checkout-{}", "i".repeat(46));
    let upper = format!("cedros-shop-checkout-{}", "I".repeat(46));
    assert_eq!(lower.len(), 67);
    for (key, id) in [(&lower, "cs_lower"), (&upper, "cs_upper")] {
        push_create(&seams, id, Some("https://checkout.stripe.com/session"));
        CheckoutService::new(&seams, context("acct_merchant_a"))
            .execute_checkout(command(key, id, 1_000))
            .unwrap();
    }
    let requests = seams.http_requests.borrow();
    let mut provider_keys = Vec::new();
    for request in requests.iter() {
        let header = request["headers"]
            .as_array()
            .unwrap()
            .iter()
            .find(|header| header[0] == "idempotency-key")
            .unwrap();
        let value = header[1].as_str().unwrap();
        assert!(value.starts_with("cedros-pay-checkout-"));
        assert_eq!(value.len(), 84);
        provider_keys.push(value.to_string());
    }
    assert_ne!(provider_keys[0], provider_keys[1]);
}

#[test]
fn provider_scope_isolation_keeps_checkouts_distinct() {
    let seams = setup();
    let key = "same-visible-key";
    push_create(&seams, "cs_a", Some("https://checkout.stripe.com/a"));
    push_create(&seams, "cs_b", Some("https://checkout.stripe.com/b"));
    let first = CheckoutService::new(&seams, context("acct_merchant_a"))
        .execute_checkout(command(key, "attempt-a", 1_000))
        .unwrap();
    let second = CheckoutService::new(&seams, context("acct_merchant_b"))
        .execute_checkout(command(key, "attempt-b", 1_000))
        .unwrap();
    assert_ne!(resolved_fields(&first).0, resolved_fields(&second).0);

    assert_eq!(post_count(&seams), 2);
}

#[test]
fn mismatch_is_terminal_before_egress_and_does_not_create_a_record() {
    let seams = setup();
    let ctx = context("acct_merchant_a");
    push_create(
        &seams,
        "cs_original",
        Some("https://checkout.stripe.com/original"),
    );
    let service = CheckoutService::new(&seams, ctx.clone());
    service
        .execute_checkout(command("same-key", "attempt-1", 1_000))
        .unwrap();
    let mismatch = service
        .execute_checkout(command("same-key", "attempt-1", 1_001))
        .unwrap();
    assert_eq!(
        mismatch,
        CheckoutOutcome::Terminal {
            durable: true,
            code: "idempotency-mismatch".into(),
            replayed: true,
        }
    );
    assert_eq!(post_count(&seams), 1);
    assert_eq!(seams.entry_count(OPERATION_MODEL), 1);
    assert_eq!(seams.entry_count(RETURN_INDEX_MODEL), 1);
}

#[test]
fn response_loss_replay_is_stable_and_verified_return_is_correlated() {
    let seams = setup();
    let ctx = context("acct_merchant_a");
    let request = command("response-loss-key", "attempt-return", 1_000);
    push_create(
        &seams,
        "cs_return_1",
        Some("https://checkout.stripe.com/initial"),
    );
    let first = CheckoutService::new(&seams, ctx.clone())
        .execute_checkout(request.clone())
        .unwrap();
    let retrieval = retrieval_body(
        &request,
        &ctx,
        &first,
        "https://checkout.stripe.com/retrieved",
    );
    seams.push_http_response(500, r#"{"error":{"type":"api_error"}}"#);
    let replay = CheckoutService::new(&seams, ctx.clone())
        .execute_checkout(request.clone())
        .unwrap();
    assert!(matches!(
        replay,
        CheckoutOutcome::Resolved { replayed: true, .. }
    ));
    assert_eq!(post_count(&seams), 1);
    assert_eq!(seams.http_requests.borrow().len(), 1);

    let service = CheckoutService::new(&seams, ctx.clone());
    assert_eq!(
        service
            .resolve_checkout_url(ResolveCheckoutUrlRequest {
                expected_operation_id: resolved_fields(&first).0.into(),
                expected_attempt_id: "attempt-return".into(),
                return_artifact: "cs_return_1".into(),
            })
            .unwrap(),
        CheckoutUrlOutcome::Indeterminate
    );
    // Provider outage does not downgrade or mutate the durable resolved result.
    let stable = service.execute_checkout(request.clone()).unwrap();
    assert_eq!(resolved_fields(&stable), resolved_fields(&first));

    seams.push_http_response(200, &retrieval);
    assert!(matches!(
        service
            .resolve_checkout_url(ResolveCheckoutUrlRequest {
                expected_operation_id: resolved_fields(&first).0.into(),
                expected_attempt_id: "attempt-return".into(),
                return_artifact: "cs_return_1".into(),
            })
            .unwrap(),
        CheckoutUrlOutcome::Resolved { ref checkout_url }
            if checkout_url.ends_with("/retrieved")
    ));
    seams.push_http_response(200, &retrieval);
    assert_eq!(
        service
            .verify_return(VerifyReturnRequest {
                expected_attempt_id: "attempt-return".into(),
                return_artifact: "cs_return_1".into(),
            })
            .unwrap(),
        VerifyReturnOutcome::Verified {
            operation_id: resolved_fields(&first).0.into(),
            checkout_attempt_id: "attempt-return".into(),
            settlement_status: SettlementStatus::Paid,
            provider_amount_cents: Some(request.material.amount_cents),
            provider_payment_intent: Some("pi_test".into()),
            provider_currency: Some(request.material.currency.clone()),
        }
    );
    assert_eq!(
        service
            .verify_return(VerifyReturnRequest {
                expected_attempt_id: "wrong-attempt".into(),
                return_artifact: "cs_return_1".into(),
            })
            .unwrap(),
        VerifyReturnOutcome::Mismatch
    );
    assert_eq!(
        CheckoutService::new(&seams, context("acct_other"))
            .verify_return(VerifyReturnRequest {
                expected_attempt_id: "attempt-return".into(),
                return_artifact: "cs_return_1".into(),
            })
            .unwrap(),
        VerifyReturnOutcome::Mismatch
    );
    assert_eq!(
        service
            .verify_return(VerifyReturnRequest {
                expected_attempt_id: "attempt-return".into(),
                return_artifact: "cs_unrelated".into(),
            })
            .unwrap(),
        VerifyReturnOutcome::Mismatch
    );

    let identity = identity_for(&request, &ctx);
    let stored = seams
        .get_entry(OPERATION_MODEL, identity.entry_key())
        .unwrap()
        .to_string();
    assert!(!stored.contains("checkout.stripe.com"));
    assert!(!stored.contains("client_secret"));
    assert_eq!(seams.entry_count(OPERATION_MODEL), 1);
    assert_eq!(seams.entry_count(RETURN_INDEX_MODEL), 1);
}

#[test]
fn bounded_poll_converges_to_the_other_workers_durable_result_without_egress() {
    let seams = setup();
    let ctx = context("acct_merchant_a");
    let request = command("poll-key", "poll-attempt", 1_000);
    let identity = identity_for(&request, &ctx);
    let operation_id = identity.public_operation_id();
    let initiating = json!({
        "schemaVersion": 1,
        "providerScope": ctx.provider_scope(),
        "operation": "checkout",
        "operationScope": CHECKOUT_SCOPE,
        "materialFingerprint": identity.material_fingerprint(),
        "checkoutAttemptId": request.checkout_attempt_id,
        "operationId": operation_id,
        "canonicalContext": serde_json::to_value(operation_context(OperationKind::Checkout)).unwrap(),
        "leaseOwner": "other-worker",
        "leaseExpiresAt": 1_120,
        "outcome": null,
        "createdAt": 1_000,
        "updatedAt": 1_000,
        "replayUntil": null
    });
    seams.seed(OPERATION_MODEL, identity.entry_key(), initiating.clone());
    let mut completed = initiating;
    completed["leaseOwner"] = json!("");
    completed["leaseExpiresAt"] = json!(0);
    completed["replayUntil"] = json!(1_000 + REPLAY_SECONDS);
    completed["outcome"] = json!({
        "status": "resolved",
        "operationId": operation_id,
        "checkoutAttemptId": "poll-attempt",
        "providerArtifacts": {
            "providerOperationId": "cs_poll_winner",
            "providerCheckoutId": "cs_poll_winner",
            "returnArtifactId": "cs_poll_winner",
            "outcomeProof": "stripe-session-created"
        },
        "durable": true,
        "replayed": false
    });
    seams.queue_read_race(2, OPERATION_MODEL, identity.entry_key(), completed);

    let outcome = CheckoutService::new(&seams, ctx)
        .execute_checkout(request)
        .unwrap();
    assert!(matches!(
        outcome,
        CheckoutOutcome::Resolved {
            operation_id,
            replayed: true,
            ..
        } if operation_id == identity.public_operation_id()
    ));
    assert!(seams.http_requests.borrow().is_empty());
}

#[test]
fn missing_host_or_account_scope_fails_closed() {
    let context = RequestContext {
        site_id: Some("site".into()),
        environment: None,
        ..Default::default()
    };
    assert_eq!(
        TrustedProviderContext::from_host(&context, "acct_valid")
            .unwrap_err()
            .status,
        503
    );
    let context = RequestContext {
        site_id: Some("site".into()),
        environment: Some("prod".into()),
        ..Default::default()
    };
    assert_eq!(
        TrustedProviderContext::from_host(&context, "missing-account")
            .unwrap_err()
            .status,
        503
    );
}
