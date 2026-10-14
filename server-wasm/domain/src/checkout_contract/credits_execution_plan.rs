use crate::error::AppResult;
use crate::guarded_batch::GuardedCondition;

use super::super::credits_settlement::CreditCommand;
use super::super::settlement_plan::Plan;
use super::super::OPERATION_MODEL;
use super::{CreditState, Records};

pub(super) fn base(
    command: &CreditCommand<'_>,
    state: &CreditState,
    records: &Records,
) -> AppResult<Plan> {
    Ok(Plan {
        conditions: vec![
            GuardedCondition::Absent {
                content_model_id: OPERATION_MODEL,
                entry_key: command.identity.entry_key().into(),
            },
            super::super::settlement_storage::version(
                crate::ids::MODEL_CREDITS,
                &state.account_entry,
            )?,
            GuardedCondition::Absent {
                content_model_id: crate::ids::MODEL_CREDITS,
                entry_key: records.txn_key.clone(),
            },
            GuardedCondition::Absent {
                content_model_id: crate::ids::MODEL_LEDGER,
                entry_key: state.operation_id.clone(),
            },
            records.claim.condition.clone(),
        ],
        ops: vec![
            super::super::settlement_storage::write(
                crate::ids::MODEL_CREDITS,
                &state.account_key,
                &state.account,
            )?,
            super::super::settlement_storage::write(
                crate::ids::MODEL_CREDITS,
                &records.txn_key,
                &records.txn,
            )?,
            super::super::settlement_storage::write(
                crate::ids::MODEL_LEDGER,
                &state.operation_id,
                &records.ledger,
            )?,
            super::super::settlement_storage::write(
                OPERATION_MODEL,
                command.identity.entry_key(),
                &records.record,
            )?,
            records.claim.op.clone(),
        ],
    })
}
