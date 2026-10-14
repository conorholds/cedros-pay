use super::api_facade::CanonicalCheckoutFacade;
use super::{CanonicalOperationContext, CanonicalQuoteResponse, DurableOutcome, OperationKind};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedBatchOutcome;
use crate::seams::HostSeams;

pub(super) fn execute<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    header: &str,
    body: &str,
) -> AppResult<CanonicalQuoteResponse> {
    let request = super::api_validation::parse_quote(header, body)?;
    super::return_origins::validate(
        facade.seams,
        &request.customer_context.return_urls,
        facade.allow_loopback_provider_urls,
    )?;
    crate::guarded_policy::require_active(facade.seams)?;
    let policy = crate::native_storefront_policy::Policy::load(facade.seams)?;
    policy.require_context(
        &request.requested_payment_methods,
        &request.customer_context,
    )?;
    let (identity, attempt) = facade.service.identity(
        OperationKind::Quote,
        &request.idempotency_key,
        &request.attempt_id,
        &request,
    )?;
    if let Some(record) = facade.service.ledger.read_identity(&identity, &attempt)? {
        return response(facade, record, true);
    }
    let hashes = super::api_validation::context_hashes(
        facade.seams,
        facade.service.context.provider_scope(),
        &request.customer_context,
    )?;
    for _ in 0..3 {
        let resolved = super::api_authority::resolve(
            facade.seams,
            facade.buyer,
            facade.cart_provider.as_ref(),
            &request,
            &identity.public_operation_id(),
            facade.market_country.as_deref(),
            facade.domain_offer.as_ref(),
        )?;
        match super::inventory_quote::commit_quote(
            &facade.service.ledger,
            &identity,
            &attempt,
            super::inventory_quote::QuoteCommit {
                snapshot: resolved.snapshot,
                hashes: hashes.clone(),
                intents: resolved.stock_intents,
                catalog_guards: resolved.catalog_guards,
                regional_policy: resolved.regional_policy,
                physical_storefront: resolved.physical_storefront,
            },
        )? {
            GuardedBatchOutcome::Applied { .. } => {
                return reread(facade, &identity, &attempt, false)
            }
            GuardedBatchOutcome::Conflict { .. } => {
                if let Some(record) = facade.service.ledger.read_identity(&identity, &attempt)? {
                    return response(facade, record, true);
                }
            }
        }
    }
    Err(AppError::conflict(
        "quote authority changed during bounded reservation attempts",
    ))
}

fn reread<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    identity: &super::OperationIdentity,
    attempt: &super::CheckoutAttemptId,
    replayed: bool,
) -> AppResult<CanonicalQuoteResponse> {
    let record = facade
        .service
        .ledger
        .read_identity(identity, attempt)?
        .ok_or_else(|| AppError::internal("completed quote operation disappeared"))?;
    response(facade, record, replayed)
}

fn response<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    record: super::record::OperationRecord,
    replayed: bool,
) -> AppResult<CanonicalQuoteResponse> {
    if !matches!(record.outcome, Some(DurableOutcome::Resolved { .. })) {
        return Err(AppError::conflict("quote operation is not resolved"));
    }
    let CanonicalOperationContext::Quote { mut snapshot, .. } = record.canonical_context else {
        return Err(AppError::internal("stored quote context is invalid"));
    };
    crate::native_storefront_policy::Policy::load(facade.seams)?
        .require_snapshot(facade.seams, &snapshot)?;
    // Internal order authority is persisted with the quote, but the existing
    // public checkout DTO remains byte-compatible for strict browser consumers.
    snapshot.order_context = None;
    Ok(CanonicalQuoteResponse {
        schema_version: 1,
        operation_id: record.operation_id,
        attempt_id: record.checkout_attempt_id,
        quote: *snapshot,
        replayed,
    })
}
