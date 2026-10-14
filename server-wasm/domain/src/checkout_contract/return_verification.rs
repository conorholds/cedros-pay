use crate::error::AppResult;
use crate::seams::HostSeams;
use crate::stripe::checkout_provider::{self, RetrieveClassification, RetrievedSession};

use super::provider::{self, Correlation};
use super::record::SettlementState;
use super::return_index::ReturnCorrelation;
use super::{
    CheckoutAttemptId, CheckoutService, CheckoutUrlOutcome, ResolveCheckoutUrlRequest,
    VerifyReturnOutcome, VerifyReturnRequest,
};

impl<S: HostSeams> CheckoutService<'_, S> {
    pub fn verify_return(&self, request: VerifyReturnRequest) -> AppResult<VerifyReturnOutcome> {
        let Some(stored) =
            self.lookup_correlation(&request.expected_attempt_id, &request.return_artifact, None)?
        else {
            return Ok(VerifyReturnOutcome::Mismatch);
        };
        if stored.settlement_state == SettlementState::Paid
            || super::api_status_support::ledger_proves_paid(self.seams, &stored.session_id)?
        {
            return Ok(paid(stored, None));
        }
        let secret_key = match self.stripe_secret() {
            Ok(secret) => secret,
            Err(_) => return Ok(VerifyReturnOutcome::Indeterminate),
        };
        let session = match provider::retrieve(self.seams, &secret_key, &stored.session_id) {
            RetrieveClassification::Found(session) => session,
            RetrieveClassification::Missing | RetrieveClassification::Indeterminate => {
                return Ok(VerifyReturnOutcome::Indeterminate)
            }
        };
        if !correlated(&stored, &session) {
            return Ok(VerifyReturnOutcome::Mismatch);
        }
        if session.status == checkout_provider::SessionStatus::Complete
            && session.payment_status.as_deref() == Some("paid")
        {
            let Some(intent) = session.payment_intent else {
                return Ok(VerifyReturnOutcome::Indeterminate);
            };
            Ok(paid(
                stored,
                Some((session.amount_total, session.currency, intent)),
            ))
        } else {
            Ok(VerifyReturnOutcome::Indeterminate)
        }
    }

    /// Resolves an ephemeral redirect without adding it to durable state.
    #[cfg(test)]
    pub fn resolve_checkout_url(
        &self,
        request: ResolveCheckoutUrlRequest,
    ) -> AppResult<CheckoutUrlOutcome> {
        self.resolve_checkout_url_with_policy(request, false)
    }

    pub(super) fn resolve_checkout_url_with_policy(
        &self,
        request: ResolveCheckoutUrlRequest,
        allow_loopback: bool,
    ) -> AppResult<CheckoutUrlOutcome> {
        match self.retrieve_correlated_fields(
            &request.expected_attempt_id,
            &request.return_artifact,
            Some(&request.expected_operation_id),
        )? {
            ReturnCheck::Verified(verified) => match verified.1.url {
                Some(checkout_url)
                    if checkout_provider::validate_checkout_url_with_policy(
                        &checkout_url,
                        allow_loopback,
                    ) =>
                {
                    Ok(CheckoutUrlOutcome::Resolved { checkout_url })
                }
                None => Ok(CheckoutUrlOutcome::Indeterminate),
                Some(_) => Ok(CheckoutUrlOutcome::Indeterminate),
            },
            ReturnCheck::Mismatch => Ok(CheckoutUrlOutcome::Mismatch),
            ReturnCheck::Indeterminate => Ok(CheckoutUrlOutcome::Indeterminate),
        }
    }

    fn retrieve_correlated_fields(
        &self,
        expected_attempt_id: &str,
        return_artifact: &str,
        expected_operation_id: Option<&str>,
    ) -> AppResult<ReturnCheck> {
        let Some(stored) =
            self.lookup_correlation(expected_attempt_id, return_artifact, expected_operation_id)?
        else {
            return Ok(ReturnCheck::Mismatch);
        };
        let secret_key = self.stripe_secret()?;
        let session = match provider::retrieve(self.seams, &secret_key, &stored.session_id) {
            RetrieveClassification::Found(session) => session,
            RetrieveClassification::Missing => return Ok(ReturnCheck::Mismatch),
            RetrieveClassification::Indeterminate => return Ok(ReturnCheck::Indeterminate),
        };
        if correlated(&stored, &session) {
            Ok(ReturnCheck::Verified(Box::new((stored, session))))
        } else {
            Ok(ReturnCheck::Mismatch)
        }
    }

    fn lookup_correlation(
        &self,
        expected_attempt_id: &str,
        return_artifact: &str,
        expected_operation_id: Option<&str>,
    ) -> AppResult<Option<ReturnCorrelation>> {
        let expected = CheckoutAttemptId::parse_exact(expected_attempt_id)?;
        if checkout_provider::validate_session_id(return_artifact).is_err() {
            return Ok(None);
        }
        let Some(stored) = self
            .ledger
            .return_correlation(self.context.provider_scope(), return_artifact)?
        else {
            return Ok(None);
        };
        if stored.checkout_attempt_id != expected.as_str()
            || expected_operation_id.is_some_and(|value| stored.operation_id != value)
            || stored.provider_scope != self.context.provider_scope()
            || stored.session_id != return_artifact
        {
            return Ok(None);
        }
        Ok(Some(stored))
    }
}

fn paid(stored: ReturnCorrelation, payment: Option<(i64, String, String)>) -> VerifyReturnOutcome {
    let (provider_amount_cents, provider_currency, provider_payment_intent) = payment
        .map(|(amount, currency, intent)| (Some(amount), Some(currency), Some(intent)))
        .unwrap_or((None, None, None));
    VerifyReturnOutcome::Verified {
        operation_id: stored.operation_id,
        checkout_attempt_id: stored.checkout_attempt_id,
        settlement_status: super::SettlementStatus::Paid,
        provider_amount_cents,
        provider_currency,
        provider_payment_intent,
    }
}

enum ReturnCheck {
    Verified(Box<(ReturnCorrelation, RetrievedSession)>),
    Mismatch,
    Indeterminate,
}

fn correlated(stored: &ReturnCorrelation, session: &RetrievedSession) -> bool {
    let correlation = Correlation {
        ledger_key: &stored.operation_entry_key,
        attempt_id: &stored.checkout_attempt_id,
        operation_id: &stored.operation_id,
        provider_scope: &stored.provider_scope,
        material_fingerprint: &stored.material_fingerprint,
    };
    provider::matches_correlation(session, &stored.session_id, &correlation)
}
