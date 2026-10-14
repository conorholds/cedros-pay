use super::api_checkout::ValidatedQuote;
use super::api_facade::CanonicalCheckoutFacade;
use super::{
    CanonicalOperationContext, CanonicalPaymentOutcome, CheckoutAttemptId, CheckoutCommand,
    CheckoutMaterial, OperationIdentity, OperationKind, PaymentMethod, ProviderScope,
};
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

struct Prepared {
    request: super::CanonicalCheckoutRequest,
    quote: ValidatedQuote,
    material: CheckoutMaterial,
    context: CanonicalOperationContext,
    identity: OperationIdentity,
    attempt: CheckoutAttemptId,
    rail_scope: ProviderScope,
    authority_guards: Vec<crate::guarded_batch::GuardedCondition>,
}

pub(super) fn execute<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    header: &str,
    body: &str,
) -> AppResult<CanonicalPaymentOutcome> {
    let prepared = prepare(facade, header, body)?;
    crate::guarded_policy::require_active(facade.seams)?;
    match prepared.request.payment_method {
        PaymentMethod::Credits => credits(facade, prepared),
        PaymentMethod::X402 => x402(facade, prepared),
        PaymentMethod::Stripe => stripe(facade, prepared),
    }
}

fn prepare<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    header: &str,
    body: &str,
) -> AppResult<Prepared> {
    let request = super::api_validation::parse_checkout(header, body)?;
    let policy = crate::native_storefront_policy::Policy::load(facade.seams)?;
    policy.require_context(&[request.payment_method], &request.customer_context)?;
    super::return_origins::validate(
        facade.seams,
        &request.customer_context.return_urls,
        facade.allow_loopback_provider_urls,
    )?;
    let quote_scope = facade.service.context.provider_scope();
    let quote = facade
        .service
        .ledger
        .read_operation(quote_scope, &request.quote_operation_id)?
        .ok_or_else(|| AppError::not_found("authoritative quote was not found"))?;
    let validated = super::api_checkout::validate_quote(facade, &quote, &request)?;
    let authority_guards = policy.snapshot_guards(facade.seams, &validated.snapshot)?;
    let current_binding =
        crate::regional_payment_policy::RegionalPaymentPolicy::load(facade.seams)?
            .enforce(facade.market_country.as_deref(), &[request.payment_method])?;
    if validated
        .regional_policy
        .as_ref()
        .is_some_and(|binding| binding != &current_binding)
    {
        return Err(AppError::new(
            409,
            "regional_payment_policy_changed",
            "regional payment availability changed; request a new quote",
        ));
    }
    let authority = super::api_rail_scope::resolve(
        facade.seams,
        quote_scope,
        facade.buyer,
        request.payment_method,
        &validated.snapshot,
    )?;
    let material =
        super::api_checkout_material::build(&request, &validated.snapshot, &authority.fingerprint)?;
    let stripe_request = stripe_request(facade, &request, &authority)?;
    let context = checkout_context(facade, &request, quote_scope, &validated, stripe_request);
    let rail_scope = authority.scope.clone();
    let service = super::CheckoutService::from_provider_scope(facade.seams, authority.scope);
    let (identity, attempt) = service.identity(
        OperationKind::Checkout,
        &request.idempotency_key,
        &request.attempt_id,
        &material,
    )?;
    // A retry of an already claimed Stripe checkout must recover its durable
    // result even after the quote expires. New purchases still revalidate all
    // catalog, price, inventory, and customer facts before claiming money work.
    let stripe_replay = request.payment_method == PaymentMethod::Stripe
        && service.ledger.read_identity(&identity, &attempt)?.is_some();
    if !stripe_replay {
        super::api_authority::revalidate(
            facade.seams,
            facade.buyer,
            facade.cart_provider.as_ref(),
            &validated.snapshot,
            &request.customer_context,
            facade.domain_offer.as_ref(),
        )?;
    }
    Ok(Prepared {
        request,
        quote: validated,
        material,
        context,
        identity,
        attempt,
        rail_scope,
        authority_guards,
    })
}

fn stripe_request<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    request: &super::CanonicalCheckoutRequest,
    authority: &super::api_rail_scope::RailAuthority,
) -> AppResult<Option<super::StripeRequestBinding>> {
    match request.payment_method {
        PaymentMethod::Stripe => {
            let provider_namespace = super::StripeRequestBinding::provider_namespace(
                &facade.merchant_namespace,
                authority
                    .stripe_account
                    .as_deref()
                    .ok_or_else(|| AppError::internal("Stripe authority omitted its account"))?,
            )?;
            super::StripeRequestBinding::derive(
                &provider_namespace,
                &request.idempotency_key,
                facade.seams.now_unix_secs(),
            )
            .map(Some)
        }
        PaymentMethod::Credits | PaymentMethod::X402 => Ok(None),
    }
}

fn checkout_context<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    request: &super::CanonicalCheckoutRequest,
    quote_scope: &str,
    validated: &ValidatedQuote,
    stripe_request: Option<super::StripeRequestBinding>,
) -> CanonicalOperationContext {
    CanonicalOperationContext::Checkout {
        quote_operation_id: request.quote_operation_id.clone(),
        quote_scope: quote_scope.into(),
        subject_ref: facade.buyer.map(|buyer| buyer.user_id.clone()),
        payment_method: request.payment_method,
        stripe_request,
        inventory_reservation: validated.inventory_reservation.clone(),
    }
}

fn credits<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    prepared: Prepared,
) -> AppResult<CanonicalPaymentOutcome> {
    super::credits_settlement::execute(
        facade,
        super::credits_settlement::CreditCommand {
            identity: &prepared.identity,
            attempt: &prepared.attempt,
            context: prepared.context,
            quote_operation_id: &prepared.request.quote_operation_id,
            amount_cents: i64::try_from(prepared.quote.snapshot.total_cents)
                .map_err(|_| AppError::unprocessable("quote total exceeds credits range"))?,
            currency: &prepared.quote.snapshot.currency,
        },
    )
}

fn x402<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    prepared: Prepared,
) -> AppResult<CanonicalPaymentOutcome> {
    let Some(super::api_request::RailProof::X402 { transaction }) = prepared.request.rail_proof
    else {
        unreachable!("validated x402 proof kind")
    };
    let binding = prepared
        .quote
        .snapshot
        .x402
        .as_ref()
        .ok_or_else(|| AppError::conflict("quote has no x402 challenge"))?;
    super::x402_settlement::execute(
        facade,
        super::x402_settlement::Command {
            identity: &prepared.identity,
            attempt: &prepared.attempt,
            context: prepared.context,
            binding,
            transaction: &transaction,
            amount_cents: i64::try_from(prepared.quote.snapshot.total_cents)
                .map_err(|_| AppError::unprocessable("quote total exceeds ledger range"))?,
            currency: &prepared.quote.snapshot.currency,
        },
    )
}

fn stripe<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    prepared: Prepared,
) -> AppResult<CanonicalPaymentOutcome> {
    let operation_id = prepared.identity.public_operation_id();
    let service = super::CheckoutService::from_provider_scope(facade.seams, prepared.rail_scope);
    let outcome = service.execute_checkout(CheckoutCommand {
        idempotency_key: prepared.request.idempotency_key,
        checkout_attempt_id: prepared.request.attempt_id.clone(),
        material: prepared.material,
        canonical_context: prepared.context,
        guarded_settlement: true,
        authority_guards: prepared.authority_guards,
    })?;
    // Initiation can remain indeterminate after provider settlement was
    // reconciled. An exact retry reports the durable economic state.
    if !matches!(outcome, super::CheckoutOutcome::Terminal { .. }) {
        let current = service
            .ledger
            .read_operation(service.context.provider_scope(), &operation_id)?;
        if current
            .is_some_and(|record| record.settlement_state == super::record::SettlementState::Paid)
        {
            return super::api_status::read(facade, &operation_id);
        }
    }
    let outcome = super::api_checkout_outcome::map(
        outcome,
        prepared.identity.public_operation_id(),
        prepared.request.attempt_id,
    )?;
    if matches!(
        outcome,
        CanonicalPaymentOutcome::Terminal { ref code, .. } if code != "idempotency-mismatch"
    ) {
        super::settlement_atomic::terminal(facade.seams, &operation_id)?;
    }
    Ok(outcome)
}
