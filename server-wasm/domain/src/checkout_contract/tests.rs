use serde_json::json;

use super::test_support::operation_context;
use super::*;
use crate::fake::FakeSeams;

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

fn owner(value: &str) -> OperationOwner {
    OperationOwner::from_runtime(value).unwrap()
}

fn attempt(value: &str) -> CheckoutAttemptId {
    CheckoutAttemptId::parse_exact(value).unwrap()
}

fn acquired(result: ClaimResult) -> OperationLease {
    match result {
        ClaimResult::Acquired(lease) => lease,
        other => panic!("expected acquired lease, got {other:?}"),
    }
}

fn artifacts(id: &str) -> ProviderArtifacts {
    ProviderArtifacts {
        provider_checkout_id: Some(id.into()),
        return_artifact_id: Some(id.into()),
        outcome_proof: Some(format!("proof_{id}")),
        ..Default::default()
    }
}

#[test]
fn sequential_replay_and_response_loss_converge_on_one_operation() {
    let seams = FakeSeams::new();
    seams.set_now(1_000);
    let request = identity(
        "site-provider",
        OperationKind::Checkout,
        "checkout-key",
        json!({
            "cartGeneration": 4, "totalMinor": 5000, "currency": "USD"
        }),
    );
    let attempt = attempt("attempt_external_1");
    let first_ledger = OperationLedger::new(&seams);
    let lease = acquired(
        first_ledger
            .claim(
                &request,
                &attempt,
                &owner("worker-a"),
                &operation_context(request.operation()),
            )
            .unwrap(),
    );
    let operation_id = lease.operation_id().to_string();
    let committed = first_ledger
        .complete(
            &lease,
            Completion::Resolved(artifacts("provider-checkout-1")),
        )
        .unwrap();
    assert!(matches!(
        committed,
        DurableOutcome::Resolved {
            replayed: false,
            ..
        }
    ));

    // Simulate a lost response and a fresh guest instance over durable storage.
    let restarted = OperationLedger::new(&seams);
    let replay = restarted
        .claim(
            &request,
            &attempt,
            &owner("worker-b"),
            &operation_context(request.operation()),
        )
        .unwrap();
    assert!(matches!(
        replay,
        ClaimResult::Replay(DurableOutcome::Resolved {
            operation_id: ref id,
            replayed: true,
            ..
        }) if id == &operation_id
    ));
    assert_eq!(seams.entry_count(OPERATION_MODEL), 1);
    assert_eq!(seams.entry_count(RETURN_INDEX_MODEL), 1);
}

#[test]
fn reused_key_with_changed_material_or_attempt_is_a_409() {
    let seams = FakeSeams::new();
    seams.set_now(1_000);
    let first = identity(
        "scope",
        OperationKind::Checkout,
        "same-key",
        json!({"amount": 1}),
    );
    let changed = identity(
        "scope",
        OperationKind::Checkout,
        "same-key",
        json!({"amount": 2}),
    );
    let ledger = OperationLedger::new(&seams);
    acquired(
        ledger
            .claim(
                &first,
                &attempt("attempt-1"),
                &owner("worker-a"),
                &operation_context(first.operation()),
            )
            .unwrap(),
    );

    for result in [
        ledger.claim(
            &changed,
            &attempt("attempt-1"),
            &owner("worker-b"),
            &operation_context(changed.operation()),
        ),
        ledger.claim(
            &first,
            &attempt("attempt-2"),
            &owner("worker-b"),
            &operation_context(first.operation()),
        ),
    ] {
        let error = result.unwrap_err();
        assert_eq!(error.status, 409);
        assert_eq!(error.code, "idempotency_mismatch");
    }
}

#[test]
fn concurrent_owner_is_bounded_and_expired_lease_is_fenced() {
    let seams = FakeSeams::new();
    seams.set_now(1_000);
    let request = identity(
        "scope",
        OperationKind::Checkout,
        "lease-key",
        json!({"amount": 1}),
    );
    let ledger = OperationLedger::new(&seams);
    let stale = acquired(
        ledger
            .claim(
                &request,
                &attempt("attempt-1"),
                &owner("worker-a"),
                &operation_context(request.operation()),
            )
            .unwrap(),
    );
    assert!(matches!(
        ledger
            .claim(
                &request,
                &attempt("attempt-1"),
                &owner("worker-b"),
                &operation_context(request.operation()),
            )
            .unwrap(),
        ClaimResult::InProgress {
            retry_after_millis: 120_000,
            ..
        }
    ));
    assert!(matches!(
        ledger
            .claim(
                &request,
                &attempt("attempt-1"),
                &owner("worker-a"),
                &operation_context(request.operation()),
            )
            .unwrap(),
        ClaimResult::InProgress { .. }
    ));

    seams.set_now(1_120);
    let current = acquired(
        ledger
            .claim(
                &request,
                &attempt("attempt-1"),
                &owner("worker-b"),
                &operation_context(request.operation()),
            )
            .unwrap(),
    );
    assert_eq!(stale.operation_id(), current.operation_id());
    assert_eq!(
        ledger
            .complete(&stale, Completion::Terminal { code: "old".into() })
            .unwrap_err()
            .status,
        409
    );
    assert!(matches!(
        ledger
            .complete(
                &current,
                Completion::Terminal {
                    code: "declined".into()
                }
            )
            .unwrap(),
        DurableOutcome::Terminal {
            replayed: false,
            ..
        }
    ));
}

#[test]
fn only_unknown_provider_identity_reconciles_known_and_terminal_outcomes_replay() {
    let seams = FakeSeams::new();
    seams.set_now(1_000);
    for (key, completion, reconciles) in [
        (
            "unknown-key",
            Completion::Indeterminate {
                code: "transport-outcome-unknown".into(),
                provider_artifacts: ProviderArtifacts::default(),
            },
            true,
        ),
        (
            "known-key",
            Completion::Indeterminate {
                code: "provider-response-incomplete".into(),
                provider_artifacts: artifacts("provider-op-known"),
            },
            false,
        ),
        (
            "terminal-key",
            Completion::Terminal {
                code: "declined".into(),
            },
            false,
        ),
    ] {
        let request = identity("scope", OperationKind::Checkout, key, json!({"amount": 1}));
        let ledger = OperationLedger::new(&seams);
        let lease = acquired(
            ledger
                .claim(
                    &request,
                    &attempt(key),
                    &owner("worker-a"),
                    &operation_context(request.operation()),
                )
                .unwrap(),
        );
        ledger.complete(&lease, completion).unwrap();
        let replay = ledger
            .claim(
                &request,
                &attempt(key),
                &owner("worker-b"),
                &operation_context(request.operation()),
            )
            .unwrap();
        assert_eq!(matches!(replay, ClaimResult::Acquired(_)), reconciles);
        assert_eq!(matches!(replay, ClaimResult::Replay(_)), !reconciles);
    }
}

#[test]
fn replay_window_is_inclusive_and_retention_is_strictly_after_72_hours() {
    let seams = FakeSeams::new();
    seams.set_now(1_000);
    let request = identity(
        "scope",
        OperationKind::Quote,
        "quote-key",
        json!({"sku": "one"}),
    );
    let ledger = OperationLedger::new(&seams);
    let lease = acquired(
        ledger
            .claim(
                &request,
                &attempt("quote-attempt"),
                &owner("worker-a"),
                &operation_context(request.operation()),
            )
            .unwrap(),
    );
    ledger
        .complete(&lease, Completion::Resolved(artifacts("quote-1")))
        .unwrap();

    seams.set_now(1_000 + REPLAY_SECONDS);
    assert!(!ledger.retention_eligible(request.entry_key()).unwrap());
    assert!(matches!(
        ledger
            .claim(
                &request,
                &attempt("quote-attempt"),
                &owner("worker-b"),
                &operation_context(request.operation()),
            )
            .unwrap(),
        ClaimResult::Replay(_)
    ));
    seams.set_now(1_001 + REPLAY_SECONDS);
    assert!(ledger.retention_eligible(request.entry_key()).unwrap());
}

#[test]
fn later_quote_requires_a_new_key_and_sensitive_artifacts_are_rejected() {
    let first = identity(
        "scope",
        OperationKind::Quote,
        "quote-1",
        json!({"sku": "one"}),
    );
    let later = identity(
        "scope",
        OperationKind::Quote,
        "quote-2",
        json!({"sku": "one"}),
    );
    assert_ne!(first.entry_key(), later.entry_key());
    for unsafe_value in [
        "https://provider.example/session/secret",
        "cs_test_client_secret_value",
        "eyJhbGciOiJIUzI1NiJ9.payload.signature",
        "buyer@example.com",
        "../relative-capability",
        "artifact?token=value",
        "sk_live_credential",
        "BearerCredential",
    ] {
        let value = ProviderArtifacts {
            provider_checkout_id: Some(unsafe_value.into()),
            ..Default::default()
        };
        assert!(value.validate().is_err());
    }
}

#[test]
fn logs_do_not_disclose_identity_material_or_artifacts() {
    let seams = FakeSeams::new();
    seams.set_now(1_000);
    let request = identity(
        "secret-scope",
        OperationKind::Checkout,
        "secret-key",
        json!({"private": "material"}),
    );
    let ledger = OperationLedger::new(&seams);
    let lease = acquired(
        ledger
            .claim(
                &request,
                &attempt("secret-attempt"),
                &owner("secret-owner"),
                &operation_context(request.operation()),
            )
            .unwrap(),
    );
    ledger
        .complete(&lease, Completion::Resolved(artifacts("private-artifact")))
        .unwrap();
    let logs = seams
        .logs
        .borrow()
        .iter()
        .map(|(_, message)| message.as_str())
        .collect::<Vec<_>>()
        .join("\n");
    for secret in [
        "secret-scope",
        "secret-key",
        "material",
        "secret-owner",
        "private-artifact",
    ] {
        assert!(!logs.contains(secret));
    }
}
