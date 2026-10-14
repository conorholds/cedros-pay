use crate::db::BatchOp;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::seams::HostSeams;

use super::record::OperationRecord;
use super::settlement_effect_record::{self, SettlementEffectRecord};

pub(super) fn build<S: HostSeams>(
    db: &Db<'_, S>,
    checkout: &OperationRecord,
    provider_reference: &str,
    now: i64,
) -> AppResult<SettlementEffectRecord> {
    let quote_id = super::record_rail::quote_id(checkout)?;
    let quote_key = super::identity::operation_entry_key(quote_id)?;
    let quote = db
        .read_one(super::OPERATION_MODEL, &quote_key)?
        .ok_or_else(|| AppError::internal("settlement effect quote is missing"))?
        .parse::<OperationRecord>()?;
    SettlementEffectRecord::build(checkout, &quote, provider_reference, now)
}

pub(super) fn paid_intent(
    effect: &SettlementEffectRecord,
    provider_reference: &str,
    now: i64,
) -> super::record::SettlementEffectIntent {
    super::record::SettlementEffectIntent {
        status: super::record::SettlementState::Paid,
        effect_id: Some(effect.effect_id.clone()),
        provider_reference: Some(provider_reference.into()),
        created_at: now,
        dispatched: false,
    }
}

pub(super) fn terminal_intent(now: i64) -> super::record::SettlementEffectIntent {
    super::record::SettlementEffectIntent {
        status: super::record::SettlementState::Terminal,
        effect_id: None,
        provider_reference: None,
        created_at: now,
        dispatched: true,
    }
}

pub(super) fn insert_ops(
    effect: &SettlementEffectRecord,
    conditions: &mut Vec<GuardedCondition>,
    ops: &mut Vec<BatchOp>,
) -> AppResult<()> {
    if let Some(order) = &effect.order {
        crate::commerce_orders::insert(order, conditions, ops)?;
    }
    conditions.push(settlement_effect_record::absent_condition(effect));
    ops.push(settlement_effect_record::write(effect)?);
    Ok(())
}

pub(super) fn version_guard(model: &'static str, key: &str, version: &str) -> GuardedCondition {
    GuardedCondition::Version {
        content_model_id: model,
        entry_key: key.into(),
        expected_version: version.into(),
    }
}

pub(super) fn required_version(version: Option<String>) -> AppResult<String> {
    version
        .filter(|version| !version.is_empty())
        .ok_or_else(|| {
            crate::error::AppError::internal("settlement effect omitted its host version")
        })
}

pub(super) fn validate_checkout(
    checkout: &OperationRecord,
    effect: &SettlementEffectRecord,
) -> AppResult<()> {
    let exact = checkout.operation_id == effect.operation_id
        && checkout.material_fingerprint == effect.material_fingerprint
        && checkout.settlement_effect.as_ref().is_some_and(|intent| {
            intent.effect_id.as_deref() == Some(&effect.effect_id)
                && intent.status == super::record::SettlementState::Paid
        });
    exact.then_some(()).ok_or_else(|| {
        crate::error::AppError::internal("settlement effect does not match its checkout")
    })
}
