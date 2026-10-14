use crate::error::AppResult;
use crate::models::LedgerEntry;
use crate::seams::HostSeams;

use super::{
    CanonicalCheckoutFacade, CanonicalOperationContext, CanonicalPaymentOutcome, CheckoutAttemptId,
    OperationIdentity, PaymentMethod,
};

pub(super) struct CreditCommand<'a> {
    pub identity: &'a OperationIdentity,
    pub attempt: &'a CheckoutAttemptId,
    pub context: CanonicalOperationContext,
    pub quote_operation_id: &'a str,
    pub amount_cents: i64,
    pub currency: &'a str,
}

pub(super) fn execute<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    command: CreditCommand<'_>,
) -> AppResult<CanonicalPaymentOutcome> {
    super::credits_execution::execute(facade, command)
}

pub(super) fn ledger(reference: &str, amount: i64, currency: &str, now: i64) -> LedgerEntry {
    LedgerEntry {
        reference: reference.into(),
        kind: "payment".into(),
        status: "succeeded".into(),
        gross_cents: amount,
        currency: currency.into(),
        provider: "credits".into(),
        provider_ref: Some(reference.into()),
        created_at: crate::time::iso8601(now),
        processed_at: crate::time::iso8601(now),
        ..Default::default()
    }
}

pub(super) fn paid(operation_id: &str, attempt: &str, replayed: bool) -> CanonicalPaymentOutcome {
    CanonicalPaymentOutcome::Paid {
        operation_id: operation_id.into(),
        attempt_id: attempt.into(),
        payment_method: PaymentMethod::Credits,
        replayed,
    }
}

pub(super) fn terminal(
    operation_id: &str,
    attempt: &str,
    code: &str,
    replayed: bool,
) -> CanonicalPaymentOutcome {
    CanonicalPaymentOutcome::Terminal {
        operation_id: operation_id.into(),
        attempt_id: attempt.into(),
        payment_method: PaymentMethod::Credits,
        code: code.into(),
        replayed,
    }
}
