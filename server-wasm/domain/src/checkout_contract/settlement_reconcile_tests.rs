use serde_json::json;

use super::*;
use crate::models::LedgerEntry;

#[test]
fn no_return_restart_requires_durable_paid_proof_then_commits_once() {
    let seams = super::inventory_lifecycle_tests::setup_tracked(10);
    seams.set_secret(crate::ids::SECRET_STRIPE_KEY, "sk_test_redacted");
    let quote = api_tests::facade(&seams)
        .quote(
            "reconcile-quote",
            &api_tests::quote_body("reconcile-quote", json!(["stripe"])),
        )
        .unwrap();
    seams.push_http_response(
        200,
        r#"{"id":"cs_reconcile_paid","url":"https://checkout.stripe.com/reconcile"}"#,
    );
    let action = api_tests::facade(&seams)
        .checkout(
            "reconcile-checkout",
            &api_tests::checkout_body("reconcile-checkout", &quote.operation_id, "stripe"),
        )
        .unwrap();
    let operation_id = match action {
        CanonicalPaymentOutcome::ActionRequired { operation_id, .. } => operation_id,
        other => panic!("expected action required, got {other:?}"),
    };
    seams.set_now(provider_expiry(&seams, &operation_id) + 1);
    let deferred = reconcile_settlements(&seams, 100).unwrap();
    assert_eq!((deferred.committed, deferred.deferred), (0, 1));
    assert_eq!(inventory_lifecycle_tests::stock(&seams)["reserved"], 2);

    seams.seed(
        crate::ids::MODEL_LEDGER,
        "cs_reconcile_paid",
        serde_json::to_value(LedgerEntry {
            reference: "cs_reconcile_paid".into(),
            kind: "payment".into(),
            status: "succeeded".into(),
            gross_cents: 1_500,
            currency: "USD".into(),
            provider: "stripe".into(),
            provider_ref: Some("cs_reconcile_paid".into()),
            ..Default::default()
        })
        .unwrap(),
    );
    let recovered = reconcile_settlements(&seams, 100).unwrap();
    assert_eq!(recovered.committed, 1);
    assert_eq!(inventory_lifecycle_tests::stock(&seams)["sold"], 2);
    assert!(matches!(
        api_tests::facade(&seams).status(&operation_id).unwrap(),
        CanonicalPaymentOutcome::Paid { .. }
    ));
    assert_eq!(reconcile_settlements(&seams, 100).unwrap().committed, 0);
}

fn provider_expiry(seams: &crate::fake::FakeSeams, operation_id: &str) -> i64 {
    let key = super::identity::operation_entry_key(operation_id).unwrap();
    seams.get_entry(OPERATION_MODEL, &key).unwrap()["canonicalContext"]["stripe_request"]
        ["expiresAt"]
        .as_i64()
        .unwrap()
}

#[path = "settlement_reconcile_candidate_tests.rs"]
mod candidate_tests;
#[path = "settlement_reconcile_stripe_tests.rs"]
mod stripe_tests;
