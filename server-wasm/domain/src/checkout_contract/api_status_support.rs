use super::api_facade::CanonicalCheckoutFacade;
use super::{
    CanonicalOperationContext, CanonicalPaymentOutcome, OperationKind, PaymentMethod,
    ResolveCheckoutUrlRequest,
};
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::models::LedgerEntry;
use crate::seams::HostSeams;

pub(super) fn checkout_record<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    operation_id: &str,
) -> AppResult<super::record::OperationRecord> {
    let record = facade
        .service
        .ledger
        .read_operation_unscoped(operation_id)?
        .filter(|record| record.operation == OperationKind::Checkout)
        .ok_or_else(|| AppError::not_found("checkout operation was not found"))?;
    let (quote_operation_id, quote_scope) = checkout_quote_binding(&record)?;
    if quote_scope != facade.service.context.provider_scope() {
        return Err(AppError::not_found("checkout operation was not found"));
    }
    let quote = facade
        .service
        .ledger
        .read_operation(quote_scope, quote_operation_id)?
        .filter(|quote| {
            quote.operation == OperationKind::Quote
                && matches!(quote.outcome, Some(super::DurableOutcome::Resolved { .. }))
        })
        .ok_or_else(|| AppError::not_found("checkout operation was not found"))?;
    if quote.checkout_attempt_id != record.checkout_attempt_id {
        return Err(AppError::internal("checkout quote ownership is invalid"));
    }
    Ok(record)
}

/// A provider redirect can still initiate payment, so recovery revalidates the
/// current policy and canonical quote products before provider egress.
/// Status/paid-return reads and settlement retain historical order access.
pub(super) fn require_payment_recovery<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    record: &super::record::OperationRecord,
) -> AppResult<()> {
    let policy = crate::native_storefront_policy::Policy::load(facade.seams)?;
    if !policy.is_physical() {
        return Ok(());
    }
    if checkout_method(record)? != PaymentMethod::Stripe {
        return Err(crate::native_storefront_policy::restricted());
    }
    let (operation, scope) = checkout_quote_binding(record)?;
    let quote = facade
        .service
        .ledger
        .read_operation(scope, operation)?
        .ok_or_else(|| AppError::not_found("checkout quote was not found"))?;
    let CanonicalOperationContext::Quote { snapshot, .. } = &quote.canonical_context else {
        return Err(AppError::internal(
            "stored checkout quote context is invalid",
        ));
    };
    policy.require_snapshot(facade.seams, snapshot)
}

pub(super) fn rail_service<'a, S: HostSeams>(
    facade: &'a CanonicalCheckoutFacade<'a, S>,
    record: &super::record::OperationRecord,
) -> AppResult<super::CheckoutService<'a, S>> {
    super::CheckoutService::from_stored_scope(facade.seams, &record.provider_scope)
}

fn checkout_quote_binding(record: &super::record::OperationRecord) -> AppResult<(&str, &str)> {
    match &record.canonical_context {
        CanonicalOperationContext::Checkout {
            quote_operation_id,
            quote_scope,
            ..
        } => Ok((quote_operation_id, quote_scope)),
        _ => Err(AppError::internal("stored checkout context is invalid")),
    }
}

pub(super) fn checkout_method(record: &super::record::OperationRecord) -> AppResult<PaymentMethod> {
    match &record.canonical_context {
        CanonicalOperationContext::Checkout { payment_method, .. } => Ok(*payment_method),
        _ => Err(AppError::internal("stored checkout context is invalid")),
    }
}

pub(super) fn checkout_reservation(
    record: &super::record::OperationRecord,
) -> AppResult<Option<super::inventory_types::InventoryReservationContext>> {
    match &record.canonical_context {
        CanonicalOperationContext::Checkout {
            inventory_reservation,
            ..
        } => Ok(inventory_reservation.clone()),
        _ => Err(AppError::internal("stored checkout context is invalid")),
    }
}

pub(super) fn resolve_request(
    request: &super::CanonicalResolveRequest,
) -> ResolveCheckoutUrlRequest {
    ResolveCheckoutUrlRequest {
        expected_operation_id: request.operation_id.clone(),
        expected_attempt_id: request.expected_attempt_id.clone(),
        return_artifact: request.return_artifact.clone(),
    }
}

pub(super) fn ledger_proves_paid<S: HostSeams>(seams: &S, artifact: &str) -> AppResult<bool> {
    let db = Db::new(seams, crate::ids::DB_ACCESS);
    let Some(entry) = db.read_one(crate::ids::MODEL_LEDGER, artifact)? else {
        return Ok(false);
    };
    let entry: LedgerEntry = entry.parse()?;
    if entry.reference != artifact
        || entry.kind != "payment"
        || entry.provider != "stripe"
        || entry.status != "succeeded"
    {
        return Ok(false);
    }
    let Some(provider) = entry.provider_ref.as_deref() else {
        return Ok(false);
    };
    if provider == artifact {
        return Ok(true);
    } // historical session-keyed proof
    let identity = crate::routes::webhooks::provider_payment_identity(
        &db,
        provider,
        artifact,
        entry.gross_cents,
        &entry.currency,
    )?;
    Ok(identity.conditions.is_empty())
}

pub(super) fn processing(
    operation_id: &str,
    attempt: &str,
    method: PaymentMethod,
) -> CanonicalPaymentOutcome {
    CanonicalPaymentOutcome::Processing {
        operation_id: operation_id.into(),
        attempt_id: attempt.into(),
        payment_method: method,
        replayed: true,
    }
}
