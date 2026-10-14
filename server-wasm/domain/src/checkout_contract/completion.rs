use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::seams::HostSeams;

use super::fence::required_version;
use super::ledger_outcome::{build_outcome, validate_completion};
use super::record::ProviderCreateState;
use super::record::{validate_stored_outcome, OperationRecord};
use super::{
    Completion, DurableOutcome, OperationLease, OperationLedger, OPERATION_MODEL, REPLAY_SECONDS,
};

impl<S: HostSeams> OperationLedger<'_, S> {
    /// Commits the durable outcome only for the currently fenced lease owner.
    pub fn complete(
        &self,
        lease: &OperationLease,
        completion: Completion,
    ) -> AppResult<DurableOutcome> {
        validate_completion(&completion)?;
        let entry = self
            .db
            .read_one(OPERATION_MODEL, &lease.entry_key)?
            .ok_or_else(|| AppError::conflict("checkout operation no longer exists"))?;
        let version = required_version(&entry.version)?;
        let mut record: OperationRecord = entry.parse()?;
        validate_stored_outcome(&record)?;
        if let Some(outcome) = record.outcome {
            return Ok(outcome.replayed());
        }
        if version != lease.version
            || record.lease_owner != lease.owner
            || record.operation_id != lease.operation_id
            || record.checkout_attempt_id != lease.checkout_attempt_id
            || self.now() >= record.lease_expires_at
        {
            return Err(AppError::conflict("checkout operation lease is stale"));
        }
        let outcome = build_outcome(&record, completion);
        if record.operation == super::OperationKind::Checkout {
            let provider_id =
                match &outcome {
                    DurableOutcome::Resolved {
                        provider_artifacts, ..
                    } => Some(provider_artifacts.provider_checkout_id.clone().ok_or_else(
                        || AppError::internal("resolved checkout omitted provider id"),
                    )?),
                    DurableOutcome::Indeterminate {
                        provider_artifacts, ..
                    } => provider_artifacts.provider_checkout_id.clone(),
                    DurableOutcome::Terminal { .. } => None,
                };
            if let Some(provider_id) = provider_id {
                record.provider_create = ProviderCreateState::ProviderIdKnown { provider_id };
            }
        }
        record.outcome = Some(outcome.clone());
        record.updated_at = self.now();
        record.replay_until = Some(self.now().saturating_add(REPLAY_SECONDS));
        record.lease_owner.clear();
        record.lease_expires_at = 0;
        let condition = GuardedCondition::Version {
            content_model_id: OPERATION_MODEL,
            entry_key: lease.entry_key.clone(),
            expected_version: version,
        };
        match self.write_completed(&lease.entry_key, &record, condition)? {
            GuardedBatchOutcome::Applied { .. } => {
                self.log(record.operation, "completed");
                Ok(outcome)
            }
            GuardedBatchOutcome::Conflict { .. } => self.resolve_completion_race(lease),
        }
    }

    fn resolve_completion_race(&self, lease: &OperationLease) -> AppResult<DurableOutcome> {
        let entry = self
            .db
            .read_one(OPERATION_MODEL, &lease.entry_key)?
            .ok_or_else(|| AppError::conflict("checkout operation no longer exists"))?;
        let record: OperationRecord = entry.parse()?;
        if record.operation_id == lease.operation_id
            && record.checkout_attempt_id == lease.checkout_attempt_id
        {
            if let Some(outcome) = record.outcome {
                return Ok(outcome.replayed());
            }
        }
        Err(AppError::conflict(
            "checkout operation lease lost its fence",
        ))
    }
}
