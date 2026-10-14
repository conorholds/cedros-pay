use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::seams::HostSeams;

use super::fence::{required_version, written_version};
use super::record::{validate_stored_outcome, OperationRecord, ProviderCreateState};
use super::{OperationLease, OperationLedger, OPERATION_MODEL};

impl<S: HostSeams> OperationLedger<'_, S> {
    /// Persists the irreversible pre-egress boundary and returns a new fence.
    pub(super) fn mark_provider_attempted(
        &self,
        lease: &OperationLease,
        authority_guards: &[GuardedCondition],
    ) -> AppResult<OperationLease> {
        let entry = self
            .db
            .read_one(OPERATION_MODEL, &lease.entry_key)?
            .ok_or_else(|| AppError::conflict("checkout operation no longer exists"))?;
        let version = required_version(&entry.version)?;
        let mut record: OperationRecord = entry.parse()?;
        validate_stored_outcome(&record)?;
        ensure_lease(&record, &version, lease, self.now())?;
        match record.provider_create {
            ProviderCreateState::NotStarted => {
                record.provider_create = ProviderCreateState::AttemptedUnknown {
                    attempted_at: self.now(),
                };
                record.updated_at = self.now();
                let condition = GuardedCondition::Version {
                    content_model_id: OPERATION_MODEL,
                    entry_key: lease.entry_key.clone(),
                    expected_version: version,
                };
                match self.write_authorized_attempt(
                    &lease.entry_key,
                    &record,
                    condition,
                    authority_guards,
                )? {
                    GuardedBatchOutcome::Applied { entries, .. } => {
                        Ok(record.lease(&lease.entry_key, written_version(entries)?))
                    }
                    GuardedBatchOutcome::Conflict { .. } => Err(AppError::conflict(
                        "provider attempt lost its operation fence",
                    )),
                }
            }
            ProviderCreateState::AttemptedUnknown { attempted_at }
                if self.now() >= attempted_at
                    && self.now()
                        < attempted_at.saturating_add(super::PROVIDER_IDEMPOTENCY_SECONDS) =>
            {
                if authority_guards.is_empty() {
                    return Ok(lease.clone());
                }
                let condition = GuardedCondition::Version {
                    content_model_id: OPERATION_MODEL,
                    entry_key: lease.entry_key.clone(),
                    expected_version: version,
                };
                match self.write_authorized_attempt(
                    &lease.entry_key,
                    &record,
                    condition,
                    authority_guards,
                )? {
                    GuardedBatchOutcome::Applied { entries, .. } => {
                        Ok(record.lease(&lease.entry_key, written_version(entries)?))
                    }
                    GuardedBatchOutcome::Conflict { .. } => Err(AppError::conflict(
                        "provider retry lost its commerce authority fence",
                    )),
                }
            }
            ProviderCreateState::AttemptedUnknown { .. } => Err(AppError::new(
                409,
                "provider-outcome-unknown",
                "provider create outcome remains indeterminate outside its idempotency window",
            )),
            ProviderCreateState::ProviderIdKnown { .. } => Err(AppError::conflict(
                "provider session is already durably known",
            )),
        }
    }

    fn write_authorized_attempt(
        &self,
        key: &str,
        record: &OperationRecord,
        condition: GuardedCondition,
        authority_guards: &[GuardedCondition],
    ) -> AppResult<GuardedBatchOutcome> {
        let mut conditions = vec![condition];
        conditions.extend_from_slice(authority_guards);
        self.db.guarded_batch(
            &conditions,
            &[super::inventory_storage::write(
                OPERATION_MODEL,
                key,
                record,
            )?],
        )
    }
}

fn ensure_lease(
    record: &OperationRecord,
    version: &str,
    lease: &OperationLease,
    now: i64,
) -> AppResult<()> {
    if version == lease.version
        && record.lease_owner == lease.owner
        && record.operation_id == lease.operation_id
        && record.checkout_attempt_id == lease.checkout_attempt_id
        && now < record.lease_expires_at
        && record.outcome.is_none()
    {
        Ok(())
    } else {
        Err(AppError::conflict("checkout operation lease is stale"))
    }
}
