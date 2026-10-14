use crate::error::{AppError, AppResult};
use crate::ids;
use crate::seams::HostSeams;

use super::{CheckoutCommand, CheckoutOutcome, OperationLedger, TrustedProviderContext};

pub struct CheckoutService<'a, S: HostSeams> {
    pub(super) seams: &'a S,
    pub(super) context: TrustedProviderContext,
    pub(super) ledger: OperationLedger<'a, S>,
}

impl<'a, S: HostSeams> CheckoutService<'a, S> {
    #[cfg(test)]
    pub fn new(seams: &'a S, context: TrustedProviderContext) -> Self {
        Self {
            seams,
            context,
            ledger: OperationLedger::new(seams),
        }
    }

    pub(super) fn from_canonical_scope(seams: &'a S, scope: super::CanonicalScope) -> Self {
        Self::from_provider_scope(seams, scope.actor_scope)
    }

    pub(super) fn from_provider_scope(seams: &'a S, scope: super::ProviderScope) -> Self {
        Self {
            seams,
            context: TrustedProviderContext { scope },
            ledger: OperationLedger::new(seams),
        }
    }

    pub(super) fn from_stored_scope(seams: &'a S, scope: &str) -> AppResult<Self> {
        let scope = super::ProviderScope::from_host(scope)
            .map_err(|_| AppError::internal("stored checkout provider scope is invalid"))?;
        Ok(Self::from_provider_scope(seams, scope))
    }

    pub fn execute_checkout(&self, command: CheckoutCommand) -> AppResult<CheckoutOutcome> {
        super::service_execute::execute(self, command)
    }

    pub(super) fn stripe_secret(&self) -> AppResult<String> {
        self.seams
            .secret_get(ids::SECRET_STRIPE_KEY)?
            .filter(|value| !value.is_empty())
            .ok_or_else(|| AppError::new(503, "unavailable", "card payments are not configured"))
    }
}

pub(super) fn mismatch() -> CheckoutOutcome {
    CheckoutOutcome::Terminal {
        durable: true,
        code: "idempotency-mismatch".into(),
        replayed: true,
    }
}

pub(super) fn indeterminate(code: &str) -> CheckoutOutcome {
    CheckoutOutcome::Indeterminate { code: code.into() }
}
