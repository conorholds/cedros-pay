use super::{CanonicalPaymentOutcome, CheckoutOutcome, PaymentMethod};
use crate::error::{AppError, AppResult};

pub(super) fn map(
    outcome: CheckoutOutcome,
    expected_operation_id: String,
    attempt_id: String,
) -> AppResult<CanonicalPaymentOutcome> {
    Ok(match outcome {
        CheckoutOutcome::Resolved {
            operation_id,
            return_artifact: Some(return_artifact),
            replayed,
            ..
        } if operation_id == expected_operation_id => CanonicalPaymentOutcome::ActionRequired {
            operation_id,
            attempt_id,
            payment_method: PaymentMethod::Stripe,
            return_artifact,
            replayed,
        },
        CheckoutOutcome::Terminal { code, replayed, .. } => CanonicalPaymentOutcome::Terminal {
            operation_id: expected_operation_id,
            attempt_id,
            payment_method: PaymentMethod::Stripe,
            code,
            replayed,
        },
        CheckoutOutcome::Indeterminate { code } => CanonicalPaymentOutcome::Indeterminate {
            operation_id: expected_operation_id,
            attempt_id,
            payment_method: PaymentMethod::Stripe,
            code,
            replayed: false,
        },
        _ => {
            return Err(AppError::internal(
                "checkout outcome violates canonical contract",
            ))
        }
    })
}
