use std::thread;
use std::time::Duration;

use serde::Serialize;
use serde_json::to_value;

use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

use super::{
    CanonicalOperationContext, CheckoutAttemptId, CheckoutService, ClaimResult, DurableOutcome,
    ExternalIdempotencyKey, OperationIdentity, OperationKind, OperationLease, OperationOwner,
};

const CLAIM_POLLS: usize = 6;
const CLAIM_POLL_MILLIS: u64 = 20;

pub(super) enum ServiceClaim {
    Acquired(OperationLease),
    Replay(DurableOutcome),
    Waiting,
    Mismatch,
}

impl<S: HostSeams> CheckoutService<'_, S> {
    pub(super) fn claim(
        &self,
        identity: &OperationIdentity,
        attempt: &CheckoutAttemptId,
        canonical_context: &CanonicalOperationContext,
        guarded_settlement: bool,
        authority_guards: &[crate::guarded_batch::GuardedCondition],
    ) -> AppResult<ServiceClaim> {
        let owner = OperationOwner::random()?;
        for poll in 0..CLAIM_POLLS {
            let result = if guarded_settlement {
                self.ledger.claim_settlement(
                    identity,
                    attempt,
                    &owner,
                    canonical_context,
                    authority_guards,
                )
            } else {
                self.ledger
                    .claim(identity, attempt, &owner, canonical_context)
            };
            match result {
                Ok(ClaimResult::Acquired(lease)) => return Ok(ServiceClaim::Acquired(lease)),
                Ok(ClaimResult::Replay(outcome)) => return Ok(ServiceClaim::Replay(outcome)),
                Ok(ClaimResult::InProgress { .. }) if poll + 1 < CLAIM_POLLS => {
                    thread::sleep(Duration::from_millis(CLAIM_POLL_MILLIS));
                }
                Ok(ClaimResult::InProgress { .. }) => return Ok(ServiceClaim::Waiting),
                Err(error) if error.code == "idempotency_mismatch" => {
                    return Ok(ServiceClaim::Mismatch)
                }
                Err(error) => return Err(error),
            }
        }
        Ok(ServiceClaim::Waiting)
    }

    pub(super) fn identity<T: Serialize>(
        &self,
        operation: OperationKind,
        raw_key: &str,
        attempt_id: &str,
        material: &T,
    ) -> AppResult<(OperationIdentity, CheckoutAttemptId)> {
        let key = ExternalIdempotencyKey::parse_exact(raw_key)?;
        let attempt = CheckoutAttemptId::parse_exact(attempt_id)?;
        let material = to_value(material).map_err(|error| {
            AppError::internal("cannot canonicalize checkout material")
                .with_internal(error.to_string())
        })?;
        Ok((
            OperationIdentity::new(self.context.scope.clone(), operation, key, &material),
            attempt,
        ))
    }
}
