use serde_json::Value;

use super::*;
use crate::auth::Buyer;
use crate::ctx::RequestContext;
use crate::fake::FakeSeams;
use crate::models::CreditAccount;
use crate::seams::HostSeams;

pub(super) fn setup_credits() -> FakeSeams {
    let seams = api_tests::setup();
    seams.seed(
        crate::ids::MODEL_CREDITS,
        "acct:buyer-1",
        serde_json::to_value(CreditAccount {
            subject_id: "buyer-1".into(),
            balance_cents: 100_000,
            held_cents: 0,
            currency: "USD".into(),
            updated_at: crate::time::iso8601(seams.now_unix_secs()),
        })
        .unwrap(),
    );
    seams
}

pub(super) fn settle_credits(seams: &FakeSeams, suffix: &str) -> String {
    let context = RequestContext {
        site_id: Some("site-a".into()),
        environment: Some("production".into()),
        ..Default::default()
    };
    let buyer = Buyer {
        user_id: "buyer-1".into(),
        claims: Value::Null,
    };
    let facade = CanonicalCheckoutFacade::for_verified_buyer(seams, &context, &buyer).unwrap();
    let quote_key = format!("effect-quote-{suffix}");
    let quote = facade
        .quote(
            &quote_key,
            &api_tests::quote_body(&quote_key, serde_json::json!(["credits"])),
        )
        .unwrap();
    let checkout_key = format!("effect-checkout-{suffix}");
    let outcome = facade
        .checkout(
            &checkout_key,
            &api_tests::checkout_body(&checkout_key, &quote.operation_id, "credits"),
        )
        .unwrap();
    match outcome {
        CanonicalPaymentOutcome::Paid { operation_id, .. } => operation_id,
        other => panic!("expected paid checkout, got {other:?}"),
    }
}

pub(super) fn effect_id(seams: &FakeSeams, operation_id: &str) -> String {
    let key = identity::operation_entry_key(operation_id).unwrap();
    seams.get_entry(OPERATION_MODEL, &key).unwrap()["settlementEffect"]["effectId"]
        .as_str()
        .unwrap()
        .to_string()
}
