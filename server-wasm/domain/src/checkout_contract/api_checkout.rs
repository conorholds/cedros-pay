use super::api_facade::CanonicalCheckoutFacade;
use super::{CanonicalOperationContext, CanonicalPaymentOutcome, DurableOutcome, OperationKind};
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

pub(super) fn execute<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    header: &str,
    body: &str,
) -> AppResult<CanonicalPaymentOutcome> {
    super::api_checkout_execute::execute(facade, header, body)
}

pub(super) struct ValidatedQuote {
    pub snapshot: super::AuthoritativeQuoteSnapshot,
    pub inventory_reservation: Option<super::inventory_types::InventoryReservationContext>,
    pub regional_policy: Option<crate::regional_payment_policy::RegionalPolicyBinding>,
}

pub(super) fn validate_quote<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    record: &super::record::OperationRecord,
    request: &super::CanonicalCheckoutRequest,
) -> AppResult<ValidatedQuote> {
    if record.operation != OperationKind::Quote
        || !matches!(record.outcome, Some(DurableOutcome::Resolved { .. }))
        || record.checkout_attempt_id != request.attempt_id
    {
        return Err(AppError::conflict(
            "checkout does not match a resolved quote attempt",
        ));
    }
    let CanonicalOperationContext::Quote {
        snapshot,
        customer_context_hashes,
        inventory_reservation,
        regional_policy,
    } = &record.canonical_context
    else {
        return Err(AppError::internal("stored quote context is invalid"));
    };
    if !snapshot
        .requested_payment_methods
        .contains(&request.payment_method)
        || *customer_context_hashes
            != super::api_validation::context_hashes(
                facade.seams,
                facade.service.context.provider_scope(),
                &request.customer_context,
            )?
    {
        return Err(AppError::conflict(
            "checkout context or payment method differs from the quote",
        ));
    }
    Ok(ValidatedQuote {
        snapshot: snapshot.as_ref().clone(),
        inventory_reservation: inventory_reservation.clone(),
        regional_policy: regional_policy.clone(),
    })
}
