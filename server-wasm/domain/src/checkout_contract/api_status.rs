use super::api_facade::CanonicalCheckoutFacade;
use super::api_status_support::{
    checkout_method, checkout_record, checkout_reservation, ledger_proves_paid, processing,
    rail_service, resolve_request,
};
use super::{CanonicalPaymentOutcome, CanonicalResolveOutcome, CheckoutUrlOutcome, DurableOutcome};
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

pub(super) fn read<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    operation_id: &str,
) -> AppResult<CanonicalPaymentOutcome> {
    super::api_validation::operation_id(operation_id)?;
    crate::guarded_policy::require_active(facade.seams)?;
    let record = checkout_record(facade, operation_id)?;
    let method = checkout_method(&record)?;
    let reservation = checkout_reservation(&record)?;
    status(facade, operation_id, record, method, reservation)
}

fn status<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    operation_id: &str,
    record: super::record::OperationRecord,
    method: super::PaymentMethod,
    reservation: Option<super::inventory_types::InventoryReservationContext>,
) -> AppResult<CanonicalPaymentOutcome> {
    let attempt = record.checkout_attempt_id.clone();
    if record.settlement_state == super::record::SettlementState::Paid {
        return Ok(
            if super::inventory_transition::is_committed(facade.seams, reservation.as_ref())? {
                CanonicalPaymentOutcome::Paid {
                    operation_id: operation_id.into(),
                    attempt_id: attempt,
                    payment_method: method,
                    replayed: true,
                }
            } else {
                processing(operation_id, &attempt, method)
            },
        );
    }
    Ok(match record.outcome {
        None => processing(operation_id, &attempt, method),
        Some(DurableOutcome::Resolved {
            provider_artifacts, ..
        }) => resolved(
            facade,
            operation_id,
            record.settlement_state,
            reservation,
            method,
            attempt,
            provider_artifacts,
        )?,
        Some(DurableOutcome::Terminal { code, .. }) => CanonicalPaymentOutcome::Terminal {
            operation_id: operation_id.into(),
            attempt_id: attempt,
            payment_method: method,
            code,
            replayed: true,
        },
        Some(DurableOutcome::Indeterminate { code, .. }) => {
            CanonicalPaymentOutcome::Indeterminate {
                operation_id: operation_id.into(),
                attempt_id: attempt,
                payment_method: method,
                code,
                replayed: true,
            }
        }
    })
}

fn resolved<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    operation_id: &str,
    settlement: super::record::SettlementState,
    reservation: Option<super::inventory_types::InventoryReservationContext>,
    method: super::PaymentMethod,
    attempt: String,
    artifacts: super::ProviderArtifacts,
) -> AppResult<CanonicalPaymentOutcome> {
    if method != super::PaymentMethod::Stripe {
        if settlement != super::record::SettlementState::Paid {
            return Ok(processing(operation_id, &attempt, method));
        }
        let committed =
            super::inventory_transition::is_committed(facade.seams, reservation.as_ref())?;
        return Ok(if committed {
            CanonicalPaymentOutcome::Paid {
                operation_id: operation_id.into(),
                attempt_id: attempt,
                payment_method: method,
                replayed: true,
            }
        } else {
            processing(operation_id, &attempt, method)
        });
    }
    let artifact = artifacts
        .return_artifact_id
        .ok_or_else(|| AppError::internal("resolved checkout has no artifact"))?;
    let paid = ledger_proves_paid(facade.seams, &artifact)?;
    let committed =
        paid && super::inventory_transition::is_committed(facade.seams, reservation.as_ref())?;
    Ok(if committed {
        CanonicalPaymentOutcome::Paid {
            operation_id: operation_id.into(),
            attempt_id: attempt,
            payment_method: method,
            replayed: true,
        }
    } else if paid {
        processing(operation_id, &attempt, method)
    } else {
        CanonicalPaymentOutcome::ActionRequired {
            operation_id: operation_id.into(),
            attempt_id: attempt,
            payment_method: method,
            return_artifact: artifact,
            replayed: true,
        }
    })
}

pub(super) fn resolve<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    body: &str,
) -> AppResult<CanonicalResolveOutcome> {
    let request = super::api_return_validation::parse_resolve(body)?;
    crate::guarded_policy::require_active(facade.seams)?;
    let record = checkout_record(facade, &request.operation_id)?;
    super::api_status_support::require_payment_recovery(facade, &record)?;
    let method = checkout_method(&record)?;
    let legacy = rail_service(facade, &record)?.resolve_checkout_url_with_policy(
        resolve_request(&request),
        facade.allow_loopback_provider_urls,
    )?;
    Ok(match legacy {
        CheckoutUrlOutcome::Resolved { checkout_url } => CanonicalResolveOutcome::Resolved {
            operation_id: request.operation_id,
            attempt_id: request.expected_attempt_id,
            payment_method: method,
            checkout_url,
        },
        CheckoutUrlOutcome::Mismatch => CanonicalResolveOutcome::Mismatch {
            operation_id: request.operation_id,
            attempt_id: request.expected_attempt_id,
            payment_method: method,
        },
        CheckoutUrlOutcome::Indeterminate => CanonicalResolveOutcome::Indeterminate {
            operation_id: request.operation_id,
            attempt_id: request.expected_attempt_id,
            payment_method: method,
        },
    })
}
