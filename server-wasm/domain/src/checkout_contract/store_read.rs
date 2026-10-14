use crate::error::AppResult;
use crate::seams::HostSeams;

use super::record::{validate_match, validate_stored_outcome, OperationRecord};
use super::{CheckoutAttemptId, OperationIdentity, OperationLedger, OPERATION_MODEL};

impl<S: HostSeams> OperationLedger<'_, S> {
    pub(super) fn read_identity(
        &self,
        identity: &OperationIdentity,
        attempt_id: &CheckoutAttemptId,
    ) -> AppResult<Option<OperationRecord>> {
        let Some(entry) = self.db.read_one(OPERATION_MODEL, identity.entry_key())? else {
            return Ok(None);
        };
        let record: OperationRecord = entry.parse()?;
        validate_match(&record, identity, attempt_id)?;
        Ok(Some(record))
    }

    /// Direct lookup: the public operation id encodes the operation entry key.
    pub(super) fn read_operation(
        &self,
        provider_scope: &str,
        operation_id: &str,
    ) -> AppResult<Option<OperationRecord>> {
        let Some(record) = self.read_operation_unscoped(operation_id)? else {
            return Ok(None);
        };
        if record.provider_scope != provider_scope {
            return Ok(None);
        }
        Ok(Some(record))
    }

    /// Loads by the opaque public id before validating tenant ownership through
    /// the referenced rail-neutral quote. Never expose this without that check.
    pub(super) fn read_operation_unscoped(
        &self,
        operation_id: &str,
    ) -> AppResult<Option<OperationRecord>> {
        let key = super::identity::operation_entry_key(operation_id)?;
        let Some(entry) = self.db.read_one(OPERATION_MODEL, &key)? else {
            return Ok(None);
        };
        let record: OperationRecord = entry.parse()?;
        validate_stored_outcome(&record)?;
        if record.operation_id != operation_id {
            return Ok(None);
        }
        Ok(Some(record))
    }
}
