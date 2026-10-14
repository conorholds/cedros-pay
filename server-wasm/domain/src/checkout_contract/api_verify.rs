use super::api_facade::CanonicalCheckoutFacade;
use super::{CanonicalVerifyOutcome, PaymentMethod, SettlementStatus, VerifyReturnOutcome};
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

pub(super) fn verify<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    body: &str,
) -> AppResult<CanonicalVerifyOutcome> {
    let request = super::api_return_validation::parse_verify(body)?;
    crate::guarded_policy::require_active(facade.seams)?;
    let scope = super::api_rail_scope::stripe_return_scope(
        facade.seams,
        facade.service.context.provider_scope(),
    )?;
    let service = super::CheckoutService::from_provider_scope(facade.seams, scope);
    let result = service.verify_return(super::VerifyReturnRequest {
        expected_attempt_id: request.expected_attempt_id,
        return_artifact: request.return_artifact.clone(),
    })?;
    finish(facade, result, &request.return_artifact)
}

fn finish<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    result: VerifyReturnOutcome,
    artifact: &str,
) -> AppResult<CanonicalVerifyOutcome> {
    let VerifyReturnOutcome::Verified {
        operation_id,
        checkout_attempt_id,
        settlement_status,
        provider_amount_cents,
        provider_currency,
        provider_payment_intent,
    } = result
    else {
        return Ok(match result {
            VerifyReturnOutcome::Mismatch => CanonicalVerifyOutcome::Mismatch,
            VerifyReturnOutcome::Indeterminate => CanonicalVerifyOutcome::Indeterminate,
            VerifyReturnOutcome::Verified { .. } => unreachable!(),
        });
    };
    let record = super::api_status_support::checkout_record(facade, &operation_id)?;
    if super::api_status_support::checkout_method(&record)? != PaymentMethod::Stripe
        || record.checkout_attempt_id != checkout_attempt_id
    {
        return Err(AppError::internal(
            "checkout return correlation invariant is invalid",
        ));
    }
    if settlement_status != SettlementStatus::Paid {
        return Err(AppError::internal(
            "checkout return verification lacks durable paid proof",
        ));
    }
    match (
        provider_amount_cents,
        provider_currency,
        provider_payment_intent,
    ) {
        (Some(amount), Some(currency), Some(intent)) => {
            super::settlement_atomic::paid_from_webhook(
                facade.seams,
                &operation_id,
                artifact,
                amount,
                &currency,
                &intent,
            )?
        }
        (None, None, None) => {
            super::settlement_atomic::paid(facade.seams, &operation_id, artifact)?
        }
        _ => {
            return Err(AppError::internal(
                "checkout return provider payment facts are incomplete",
            ))
        }
    }
    Ok(CanonicalVerifyOutcome::Verified {
        checkout_attempt_id,
    })
}
