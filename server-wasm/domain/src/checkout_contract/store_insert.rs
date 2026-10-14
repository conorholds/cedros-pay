use super::fence::written_version;
use super::record::OperationRecord;
use super::{
    CheckoutAttemptId, OperationIdentity, OperationKind, OperationLease, OperationLedger,
    OperationOwner, OPERATION_MODEL,
};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::seams::HostSeams;

impl<'a, S: HostSeams> OperationLedger<'a, S> {
    pub(super) fn insert(
        &self,
        identity: &OperationIdentity,
        attempt_id: &CheckoutAttemptId,
        owner: &OperationOwner,
        canonical_context: super::CanonicalOperationContext,
        guarded_settlement: bool,
        authority_guards: &[GuardedCondition],
    ) -> AppResult<Option<OperationLease>> {
        let record =
            OperationRecord::initial(identity, attempt_id, owner, canonical_context, self.now());
        let mut conditions = vec![GuardedCondition::Absent {
            content_model_id: OPERATION_MODEL,
            entry_key: identity.entry_key().into(),
        }];
        let mut ops = vec![super::inventory_storage::write(
            OPERATION_MODEL,
            identity.entry_key(),
            &record,
        )?];
        if identity.operation() == OperationKind::Checkout && guarded_settlement {
            let claim = super::settlement_claim::prepare(
                &self.db,
                &record.canonical_context,
                identity,
                self.now(),
            )?;
            conditions.push(claim.condition);
            ops.push(claim.op);
            let extras = super::SettlementExtras::from_context(
                identity.public_operation_id(),
                &record.canonical_context,
            )?;
            let plan = extras.on_claim(&self.db, self.now())?;
            conditions.extend(plan.conditions);
            ops.extend(plan.ops);
        }
        conditions.extend_from_slice(authority_guards);
        if conditions.len() > 32 {
            return Err(AppError::unprocessable(
                "checkout claim exceeds the guarded condition limit",
            ));
        }
        match self.db.guarded_batch(&conditions, &ops)? {
            GuardedBatchOutcome::Applied { entries, .. } => Ok(Some(
                record.lease(identity.entry_key(), written_version(entries)?),
            )),
            GuardedBatchOutcome::Conflict { .. } => Ok(None),
        }
    }
}
