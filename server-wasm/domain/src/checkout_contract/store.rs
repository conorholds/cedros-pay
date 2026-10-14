use serde_json::to_value;

use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::seams::HostSeams;

use super::fence::{required_version, written_version};
use super::record::{validate_match, OperationRecord};
use super::{
    CheckoutAttemptId, ClaimResult, OperationIdentity, OperationKind, OperationLease,
    OperationOwner, LEASE_SECONDS, OPERATION_MODEL,
};

const MAX_CAS_ATTEMPTS: usize = 3;

pub struct OperationLedger<'a, S: HostSeams> {
    pub(super) seams: &'a S,
    pub(super) db: Db<'a, S>,
}

impl<'a, S: HostSeams> OperationLedger<'a, S> {
    pub fn new(seams: &'a S) -> Self {
        Self {
            seams,
            db: Db::new(seams, ids::DB_ACCESS),
        }
    }

    /// Claims an operation using host time and a guarded-only write path.
    pub fn claim(
        &self,
        identity: &OperationIdentity,
        attempt_id: &CheckoutAttemptId,
        owner: &OperationOwner,
        canonical_context: &super::CanonicalOperationContext,
    ) -> AppResult<ClaimResult> {
        self.claim_internal(identity, attempt_id, owner, canonical_context, false, &[])
    }

    pub(super) fn claim_settlement(
        &self,
        identity: &OperationIdentity,
        attempt_id: &CheckoutAttemptId,
        owner: &OperationOwner,
        canonical_context: &super::CanonicalOperationContext,
        authority_guards: &[GuardedCondition],
    ) -> AppResult<ClaimResult> {
        self.claim_internal(
            identity,
            attempt_id,
            owner,
            canonical_context,
            true,
            authority_guards,
        )
    }

    fn claim_internal(
        &self,
        identity: &OperationIdentity,
        attempt_id: &CheckoutAttemptId,
        owner: &OperationOwner,
        canonical_context: &super::CanonicalOperationContext,
        guarded_settlement: bool,
        authority_guards: &[GuardedCondition],
    ) -> AppResult<ClaimResult> {
        for _ in 0..MAX_CAS_ATTEMPTS {
            let Some(entry) = self.db.read_one(OPERATION_MODEL, identity.entry_key())? else {
                if let Some(claim) = self.insert(
                    identity,
                    attempt_id,
                    owner,
                    canonical_context.clone(),
                    guarded_settlement,
                    authority_guards,
                )? {
                    self.log(identity.operation(), "acquired");
                    return Ok(ClaimResult::Acquired(claim));
                }
                continue;
            };
            let version = required_version(&entry.version)?;
            let record: OperationRecord = entry.parse()?;
            validate_match(&record, identity, attempt_id)?;
            if let Some(outcome) = &record.outcome {
                if record.settlement_state != super::record::SettlementState::Pending
                    || matches!(
                        record.provider_create,
                        super::record::ProviderCreateState::ProviderIdKnown { .. }
                    )
                {
                    return Ok(ClaimResult::Replay(outcome.clone().replayed()));
                }
                if matches!(outcome, super::DurableOutcome::Indeterminate { .. }) {
                    if let super::record::ProviderCreateState::AttemptedUnknown { attempted_at } =
                        record.provider_create
                    {
                        if self.now() < attempted_at
                            || self.now()
                                >= attempted_at.saturating_add(super::PROVIDER_IDEMPOTENCY_SECONDS)
                        {
                            self.log(identity.operation(), "indeterminate-replayed");
                            return Ok(ClaimResult::Replay(outcome.clone().replayed()));
                        }
                    }
                    if let Some(claim) =
                        self.begin_reconciliation(identity, record, version, owner)?
                    {
                        self.log(identity.operation(), "reconciliation-acquired");
                        return Ok(ClaimResult::Acquired(claim));
                    }
                    continue;
                }
                self.log(identity.operation(), "replayed");
                return Ok(ClaimResult::Replay(outcome.clone().replayed()));
            }
            if self.now() < record.lease_expires_at {
                self.log(identity.operation(), "in-progress");
                return Ok(ClaimResult::InProgress {
                    operation_id: record.operation_id,
                    checkout_attempt_id: record.checkout_attempt_id,
                    retry_after_millis: (record.lease_expires_at - self.now()) * 1_000,
                });
            }
            if let Some(claim) = self.take_over(identity, record, version, owner)? {
                self.log(identity.operation(), "lease-reclaimed");
                return Ok(ClaimResult::Acquired(claim));
            }
        }
        Err(AppError::conflict(
            "checkout operation changed during bounded claim attempts",
        ))
    }

    /// Records become eligible strictly after their inclusive replay window.
    #[cfg(test)]
    pub fn retention_eligible(&self, entry_key: &str) -> AppResult<bool> {
        let Some(entry) = self.db.read_one(OPERATION_MODEL, entry_key)? else {
            return Ok(false);
        };
        let record: OperationRecord = entry.parse()?;
        Ok(record
            .replay_until
            .is_some_and(|deadline| self.now() > deadline))
    }

    fn take_over(
        &self,
        identity: &OperationIdentity,
        mut record: OperationRecord,
        version: String,
        owner: &OperationOwner,
    ) -> AppResult<Option<OperationLease>> {
        record.lease_owner = owner.as_str().into();
        record.lease_expires_at = self.now().saturating_add(LEASE_SECONDS);
        record.updated_at = self.now();
        let condition = GuardedCondition::Version {
            content_model_id: OPERATION_MODEL,
            entry_key: identity.entry_key().into(),
            expected_version: version,
        };
        match self.write(identity.entry_key(), &record, condition)? {
            GuardedBatchOutcome::Applied { entries, .. } => Ok(Some(
                record.lease(identity.entry_key(), written_version(entries)?),
            )),
            GuardedBatchOutcome::Conflict { .. } => Ok(None),
        }
    }

    fn begin_reconciliation(
        &self,
        identity: &OperationIdentity,
        mut record: OperationRecord,
        version: String,
        owner: &OperationOwner,
    ) -> AppResult<Option<OperationLease>> {
        record.outcome = None;
        record.lease_owner = owner.as_str().into();
        record.lease_expires_at = self.now().saturating_add(LEASE_SECONDS);
        record.updated_at = self.now();
        let condition = GuardedCondition::Version {
            content_model_id: OPERATION_MODEL,
            entry_key: identity.entry_key().into(),
            expected_version: version,
        };
        match self.write(identity.entry_key(), &record, condition)? {
            GuardedBatchOutcome::Applied { entries, .. } => Ok(Some(
                record.lease(identity.entry_key(), written_version(entries)?),
            )),
            GuardedBatchOutcome::Conflict { .. } => Ok(None),
        }
    }

    pub(super) fn write(
        &self,
        key: &str,
        record: &OperationRecord,
        condition: GuardedCondition,
    ) -> AppResult<GuardedBatchOutcome> {
        let data = to_value(record).map_err(|error| {
            AppError::internal("cannot encode checkout operation").with_internal(error.to_string())
        })?;
        self.db.guarded_batch(
            &[condition],
            &[BatchOp::Write {
                content_model_id: OPERATION_MODEL,
                entry_key: key.into(),
                data,
            }],
        )
    }

    pub(super) fn now(&self) -> i64 {
        self.seams.now_unix_secs()
    }

    pub(super) fn log(&self, operation: OperationKind, outcome: &str) {
        self.seams.log(
            "info",
            &format!(
                "checkout_contract operation={} outcome={outcome}",
                operation.scope()
            ),
        );
    }
}
