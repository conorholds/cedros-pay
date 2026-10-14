use serde_json::{json, Value};

use super::*;
use crate::auth::Buyer;
use crate::ctx::RequestContext;
use crate::fake::FakeSeams;
use crate::models::CreditAccount;
use crate::seams::HostSeams;

#[test]
fn same_key_isolated_by_rail_and_provider_while_caller_authority_is_rejected() {
    let seams = api_tests::setup();
    configure_x402(&seams);
    seed_account(&seams);
    let buyer = buyer();
    let facade = CanonicalCheckoutFacade::for_verified_buyer(&seams, &context(), &buyer).unwrap();
    let quote = facade
        .quote(
            "authority-quote",
            &api_tests::quote_body("authority-quote", json!(["credits", "x402"])),
        )
        .unwrap();
    let quote_scope = facade.service.context.provider_scope();
    let credits = authority_identity(&facade, &quote.quote, quote_scope, "credits");
    let x402 = authority_identity(&facade, &quote.quote, quote_scope, "x402");
    assert_ne!(credits.public_operation_id(), x402.public_operation_id());

    let stripe_a = api_rail_scope::resolve(
        &seams,
        quote_scope,
        facade.buyer,
        PaymentMethod::Stripe,
        &quote.quote,
    )
    .unwrap();
    seams.set_secret(
        crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT,
        "acct_rotated_authority",
    );
    let stripe_b = api_rail_scope::resolve(
        &seams,
        quote_scope,
        facade.buyer,
        PaymentMethod::Stripe,
        &quote.quote,
    )
    .unwrap();
    assert_ne!(stripe_a.scope.as_str(), stripe_b.scope.as_str());

    let baseline = seams.entry_count(OPERATION_MODEL);
    let mut hostile: Value = serde_json::from_str(&api_tests::checkout_body(
        "hostile-authority",
        &quote.operation_id,
        "credits",
    ))
    .unwrap();
    hostile["subjectRef"] = json!("victim");
    hostile["providerScope"] = json!("attacker");
    assert_eq!(
        facade
            .checkout("hostile-authority", &hostile.to_string())
            .unwrap_err()
            .status,
        400
    );
    assert_eq!(seams.entry_count(OPERATION_MODEL), baseline);
}

fn authority_identity(
    facade: &CanonicalCheckoutFacade<'_, FakeSeams>,
    quote: &AuthoritativeQuoteSnapshot,
    quote_scope: &str,
    method: &str,
) -> OperationIdentity {
    let quote_id = format!("payop_{}", "a".repeat(64));
    let request = api_validation::parse_checkout(
        "shared-authority-key",
        &api_tests::checkout_body("shared-authority-key", &quote_id, method),
    )
    .unwrap();
    let authority = api_rail_scope::resolve(
        facade.seams,
        quote_scope,
        facade.buyer,
        request.payment_method,
        quote,
    )
    .unwrap();
    let material = api_checkout_material::build(&request, quote, &authority.fingerprint).unwrap();
    CheckoutService::from_provider_scope(facade.seams, authority.scope)
        .identity(
            OperationKind::Checkout,
            &request.idempotency_key,
            &request.attempt_id,
            &material,
        )
        .unwrap()
        .0
}

fn seed_account(seams: &FakeSeams) {
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
}

fn configure_x402(seams: &FakeSeams) {
    seams.set_setting("x402.enabled", "true");
    seams.set_setting(
        "x402.payment_address",
        "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    );
    seams.set_setting(
        "x402.token_mint",
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    );
    seams.set_setting("x402.token_decimals", "6");
}

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
