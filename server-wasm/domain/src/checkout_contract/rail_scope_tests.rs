use serde_json::{json, Value};

use super::*;
use crate::auth::Buyer;
use crate::ctx::RequestContext;
use crate::seams::HostSeams;

fn context() -> RequestContext {
    RequestContext {
        site_id: Some("site-a".into()),
        environment: Some("production".into()),
        ..Default::default()
    }
}

fn buyer() -> Buyer {
    Buyer {
        user_id: "buyer-1".into(),
        claims: Value::Null,
    }
}

#[test]
fn stripe_account_is_required_only_when_stripe_checkout_binds() {
    let seams = api_tests::setup();
    seams
        .secret_delete(crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT)
        .unwrap();
    seams.set_secret(crate::ids::SECRET_STRIPE_KEY, "sk_test_redacted");
    let facade = api_tests::facade(&seams);
    let quote = facade
        .quote(
            "stripe-no-account-quote",
            &api_tests::quote_body("stripe-no-account-quote", json!(["stripe"])),
        )
        .unwrap();
    let before = seams.entry_count(OPERATION_MODEL);
    seams.secret_reads.borrow_mut().clear();

    let error = facade
        .checkout(
            "stripe-no-account-checkout",
            &api_tests::checkout_body("stripe-no-account-checkout", &quote.operation_id, "stripe"),
        )
        .unwrap_err();

    assert_eq!(
        (error.status, error.code),
        (503, "checkout_authority_unavailable")
    );
    assert_eq!(seams.entry_count(OPERATION_MODEL), before);
    assert_eq!(seams.entry_count(crate::ids::MODEL_LEDGER), 0);
    assert!(seams.http_requests.borrow().is_empty());
    assert!(seams.provider_requests.borrow().is_empty());
    assert!(!seams
        .secret_reads
        .borrow()
        .iter()
        .any(|key| key == crate::ids::SECRET_STRIPE_KEY));
}

#[test]
fn missing_credits_authority_fails_before_quote_claim_without_stripe_reads() {
    let seams = api_tests::setup();
    seams
        .secret_delete(crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT)
        .unwrap();
    seams.secret_reads.borrow_mut().clear();
    let buyer = buyer();
    let facade = CanonicalCheckoutFacade::for_verified_buyer(&seams, &context(), &buyer).unwrap();

    let error = facade
        .quote(
            "credits-no-account",
            &api_tests::quote_body("credits-no-account", json!(["credits"])),
        )
        .unwrap_err();

    assert_eq!(
        (error.status, error.code),
        (503, "checkout_authority_unavailable")
    );
    assert_eq!(seams.entry_count(OPERATION_MODEL), 0);
    assert!(!seams.secret_reads.borrow().iter().any(|key| matches!(
        key.as_str(),
        crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT | crate::ids::SECRET_STRIPE_KEY
    )));
}
