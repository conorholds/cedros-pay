use serde_json::json;

use super::*;

#[test]
fn injected_paid_transition_failure_rolls_back_every_settlement_row() {
    let seams = super::inventory_lifecycle_tests::setup_tracked(10);
    seams.set_secret(crate::ids::SECRET_STRIPE_KEY, "sk_test_redacted");
    let quote = api_tests::facade(&seams)
        .quote(
            "atomic-quote",
            &api_tests::quote_body("atomic-quote", json!(["stripe"])),
        )
        .unwrap();
    seams.push_http_response(
        200,
        r#"{"id":"cs_atomic_paid","url":"https://checkout.stripe.com/atomic"}"#,
    );
    let checkout = api_tests::facade(&seams)
        .checkout(
            "atomic-checkout",
            &api_tests::checkout_body("atomic-checkout", &quote.operation_id, "stripe"),
        )
        .unwrap();
    let (operation_id, artifact) = match checkout {
        CanonicalPaymentOutcome::ActionRequired {
            operation_id,
            return_artifact,
            ..
        } => (operation_id, return_artifact),
        other => panic!("expected action required, got {other:?}"),
    };
    let retrieval = api_tests::retrieval(
        &seams,
        &operation_id,
        &artifact,
        "https://checkout.stripe.com/atomic",
    );
    seams.push_http_response(200, &retrieval);
    seams.fail_next_guarded_batch_after(3);
    assert!(api_tests::facade(&seams)
        .verify(&api_tests::verify_body(&artifact))
        .is_err());
    assert!(seams
        .get_entry(crate::ids::MODEL_LEDGER, &artifact)
        .is_none());
    let stock = inventory_lifecycle_tests::stock(&seams);
    assert_eq!(
        (stock["reserved"].as_u64(), stock["sold"].as_u64()),
        (Some(2), Some(0))
    );

    seams.push_http_response(200, &retrieval);
    api_tests::facade(&seams)
        .verify(&api_tests::verify_body(&artifact))
        .unwrap();
    let committed = inventory_lifecycle_tests::stock(&seams);
    assert_eq!(
        (committed["reserved"].as_u64(), committed["sold"].as_u64()),
        (Some(0), Some(2))
    );
}
