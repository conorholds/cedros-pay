use serde_json::json;

use super::*;
use crate::fake::FakeSeams;

pub(super) fn setup_tracked(quantity: u64) -> FakeSeams {
    let seams = super::api_tests::setup();
    let mut product = seams
        .get_entry(crate::ids::MODEL_CATALOG, "product-1")
        .unwrap();
    product["inventoryQuantity"] = json!(quantity);
    seams.seed(crate::ids::MODEL_CATALOG, "product-1", product);
    seams
}

pub(super) fn stock(seams: &FakeSeams) -> serde_json::Value {
    seams
        .get_entry(
            STOCK_MODEL,
            &super::inventory_types::stock_key("product-1", None),
        )
        .unwrap()
}

#[test]
fn expired_unbound_quote_release_is_guarded_and_idempotent() {
    let seams = setup_tracked(10);
    let quote = super::api_tests::facade(&seams)
        .quote(
            "expiring",
            &super::api_tests::quote_body("expiring", json!(["stripe"])),
        )
        .unwrap();
    let hold = quote.quote.inventory_hold.as_ref().unwrap();
    seams.set_now(crate::time::parse_iso(&quote.quote.expires_at).unwrap() + 1);
    super::api_tests::facade(&seams)
        .release_expired_inventory_hold(&quote.operation_id)
        .unwrap();
    super::api_tests::facade(&seams)
        .release_expired_inventory_hold(&quote.operation_id)
        .unwrap();
    assert_eq!(stock(&seams)["reserved"], 0);
    assert_eq!(
        seams
            .get_entry(INVENTORY_HOLD_MODEL, &hold.hold_id)
            .unwrap()["status"],
        "released"
    );
}

#[test]
fn checkout_claim_binds_hold_and_paid_verification_commits_stock_once() {
    let seams = setup_tracked(10);
    seams.set_secret(crate::ids::SECRET_STRIPE_KEY, "sk_test_redacted");
    let quote = super::api_tests::facade(&seams)
        .quote(
            "paid-quote",
            &super::api_tests::quote_body("paid-quote", json!(["stripe"])),
        )
        .unwrap();
    let hold_id = quote.quote.inventory_hold.as_ref().unwrap().hold_id.clone();
    seams.push_http_response(
        200,
        r#"{"id":"cs_inventory_paid","url":"https://checkout.stripe.com/inventory"}"#,
    );
    let action = super::api_tests::facade(&seams)
        .checkout(
            "paid-checkout",
            &super::api_tests::checkout_body("paid-checkout", &quote.operation_id, "stripe"),
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
    let pending = seams.get_entry(INVENTORY_HOLD_MODEL, &hold_id).unwrap();
    assert_eq!(pending["status"], "checkout_pending");
    assert_eq!(pending["checkoutOperationId"], operation_id);

    let retrieval = super::api_tests::retrieval(
        &seams,
        &operation_id,
        &artifact,
        "https://checkout.stripe.com/inventory",
    );
    for _ in 0..2 {
        seams.push_http_response(200, &retrieval);
        super::api_tests::facade(&seams)
            .verify(&super::api_tests::verify_body(&artifact))
            .unwrap();
    }
    let committed = stock(&seams);
    assert_eq!(
        (
            committed["onHand"].as_u64(),
            committed["reserved"].as_u64(),
            committed["sold"].as_u64()
        ),
        (Some(8), Some(0), Some(2))
    );
    assert_eq!(
        seams.get_entry(INVENTORY_HOLD_MODEL, &hold_id).unwrap()["status"],
        "committed"
    );
}

#[test]
fn proven_terminal_provider_rejection_releases_bound_inventory() {
    let seams = setup_tracked(10);
    seams.set_secret(crate::ids::SECRET_STRIPE_KEY, "sk_test_redacted");
    let quote = super::api_tests::facade(&seams)
        .quote(
            "terminal-quote",
            &super::api_tests::quote_body("terminal-quote", json!(["stripe"])),
        )
        .unwrap();
    let hold_id = quote.quote.inventory_hold.as_ref().unwrap().hold_id.clone();
    seams.push_http_response(
        400,
        r#"{"error":{"type":"invalid_request_error","code":"parameter_missing","param":"success_url"}}"#,
    );
    let outcome = super::api_tests::facade(&seams)
        .checkout(
            "terminal-checkout",
            &super::api_tests::checkout_body("terminal-checkout", &quote.operation_id, "stripe"),
        )
        .unwrap();
    assert!(matches!(outcome, CanonicalPaymentOutcome::Terminal { .. }));
    assert_eq!(stock(&seams)["reserved"], 0);
    assert_eq!(
        seams.get_entry(INVENTORY_HOLD_MODEL, &hold_id).unwrap()["status"],
        "released"
    );
}
