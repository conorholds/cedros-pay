use super::api_facade::CanonicalCheckoutFacade;
use super::{CanonicalOperationContext, OperationKind};
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

pub(super) fn release_expired<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    operation_id: &str,
) -> AppResult<()> {
    super::api_validation::operation_id(operation_id)?;
    crate::guarded_policy::require_active(facade.seams)?;
    let record = facade
        .service
        .ledger
        .read_operation(facade.service.context.provider_scope(), operation_id)?
        .filter(|record| record.operation == OperationKind::Quote)
        .ok_or_else(|| AppError::not_found("authoritative quote was not found"))?;
    let CanonicalOperationContext::Quote {
        inventory_reservation,
        ..
    } = &record.canonical_context
    else {
        return Err(AppError::internal("stored quote context is invalid"));
    };
    let reservation = inventory_reservation
        .as_ref()
        .ok_or_else(|| AppError::conflict("quote has no inventory hold"))?;
    super::inventory_transition::expired_quote(
        facade.seams,
        facade.service.context.provider_scope(),
        operation_id,
        reservation,
    )
}
