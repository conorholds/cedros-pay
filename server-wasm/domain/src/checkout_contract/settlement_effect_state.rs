use crate::db::{Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedBatchOutcome;
use crate::seams::HostSeams;

use super::record::OperationRecord;
use super::settlement_effect_record::{
    self, SettlementEffectRecord, TargetState, STATUS_DELIVERED, STATUS_LEASED, STATUS_PENDING,
};
use super::{OperationOwner, OPERATION_MODEL};

pub(super) const LEASE_SECONDS: i64 = 300;
const BASE_BACKOFF_SECONDS: i64 = 15;
const MAX_BACKOFF_SECONDS: i64 = 3_600;

pub(super) struct Claim {
    pub record: SettlementEffectRecord,
    pub version: String,
}

pub(super) fn claim<S: HostSeams>(
    db: &Db<'_, S>,
    row: EntryRecord,
    owner: &OperationOwner,
    now: i64,
) -> AppResult<Option<Claim>> {
    let mut record: SettlementEffectRecord = row.parse()?;
    record.validate()?;
    if !claimable(&record, now) {
        return Ok(None);
    }
    let version = super::settlement_effect_store::required_version(row.version)?;
    record.status = STATUS_LEASED.into();
    record.lease_owner = Some(owner.as_str().into());
    record.lease_expires_at = Some(crate::time::iso8601(now.saturating_add(LEASE_SECONDS)));
    record.updated_at = crate::time::iso8601(now);
    write_cas(db, &record, &version).map(|version| version.map(|version| Claim { record, version }))
}

pub(super) fn target_delivered<S: HostSeams>(
    db: &Db<'_, S>,
    claim: &mut Claim,
    owner: &OperationOwner,
    target_id: &str,
    now: i64,
) -> AppResult<bool> {
    ensure_owner(claim, owner)?;
    let target = claim
        .record
        .targets
        .iter_mut()
        .find(|target| target.id == target_id)
        .ok_or_else(|| AppError::internal("settlement effect target disappeared"))?;
    target.state = TargetState::Delivered;
    claim.record.updated_at = crate::time::iso8601(now);
    let Some(version) = write_cas(db, &claim.record, &claim.version)? else {
        return Ok(false);
    };
    claim.version = version;
    Ok(true)
}

pub(super) fn reschedule<S: HostSeams>(
    db: &Db<'_, S>,
    mut claim: Claim,
    owner: &OperationOwner,
    now: i64,
    error_code: &str,
) -> AppResult<bool> {
    ensure_owner(&claim, owner)?;
    claim.record.attempts = claim.record.attempts.saturating_add(1);
    claim.record.status = STATUS_PENDING.into();
    claim.record.next_attempt_at =
        crate::time::iso8601(now.saturating_add(backoff_seconds(claim.record.attempts)));
    claim.record.last_error = Some(error_code.into());
    claim.record.lease_owner = None;
    claim.record.lease_expires_at = None;
    claim.record.updated_at = crate::time::iso8601(now);
    write_cas(db, &claim.record, &claim.version).map(|version| version.is_some())
}

pub(super) fn release_partial<S: HostSeams>(
    db: &Db<'_, S>,
    mut claim: Claim,
    owner: &OperationOwner,
    now: i64,
) -> AppResult<bool> {
    ensure_owner(&claim, owner)?;
    claim.record.status = STATUS_PENDING.into();
    claim.record.next_attempt_at = crate::time::iso8601(now.saturating_add(1));
    claim.record.lease_owner = None;
    claim.record.lease_expires_at = None;
    claim.record.updated_at = crate::time::iso8601(now);
    write_cas(db, &claim.record, &claim.version).map(|version| version.is_some())
}

pub(super) fn finish<S: HostSeams>(
    db: &Db<'_, S>,
    mut claim: Claim,
    owner: &OperationOwner,
    now: i64,
) -> AppResult<bool> {
    ensure_owner(&claim, owner)?;
    if !claim.record.all_delivered() {
        return Err(AppError::internal(
            "settlement effect cannot finish with pending targets",
        ));
    }
    let checkout_key = super::identity::operation_entry_key(&claim.record.operation_id)?;
    let checkout_entry = db
        .read_one(OPERATION_MODEL, &checkout_key)?
        .ok_or_else(|| AppError::internal("settlement effect checkout is missing"))?;
    let mut checkout: OperationRecord = checkout_entry.parse()?;
    super::settlement_effect_store::validate_checkout(&checkout, &claim.record)?;
    if let Some(intent) = checkout.settlement_effect.as_mut() {
        intent.dispatched = true;
    }
    checkout.updated_at = now;
    claim.record.status = STATUS_DELIVERED.into();
    claim.record.last_error = None;
    claim.record.lease_owner = None;
    claim.record.lease_expires_at = None;
    claim.record.updated_at = crate::time::iso8601(now);
    let conditions = [
        super::settlement_effect_store::version_guard(
            crate::ids::MODEL_WEBHOOK_OUTBOX,
            &claim.record.effect_id,
            &claim.version,
        ),
        super::settlement_effect_store::version_guard(
            OPERATION_MODEL,
            &checkout_key,
            &super::settlement_effect_store::required_version(checkout_entry.version)?,
        ),
    ];
    let ops = [
        settlement_effect_record::write(&claim.record)?,
        super::settlement_storage::write(OPERATION_MODEL, &checkout_key, &checkout)?,
    ];
    Ok(matches!(
        db.guarded_batch(&conditions, &ops)?,
        GuardedBatchOutcome::Applied { .. }
    ))
}

fn claimable(record: &SettlementEffectRecord, now: i64) -> bool {
    if record.status == STATUS_PENDING {
        return crate::time::parse_iso(&record.next_attempt_at).is_some_and(|due| due <= now);
    }
    record.status == STATUS_LEASED
        && record
            .lease_expires_at
            .as_deref()
            .and_then(crate::time::parse_iso)
            .is_some_and(|expires| expires <= now)
}

fn ensure_owner(claim: &Claim, owner: &OperationOwner) -> AppResult<()> {
    if claim.record.status == STATUS_LEASED
        && claim.record.lease_owner.as_deref() == Some(owner.as_str())
    {
        Ok(())
    } else {
        Err(AppError::conflict("settlement effect lease is stale"))
    }
}

fn write_cas<S: HostSeams>(
    db: &Db<'_, S>,
    record: &SettlementEffectRecord,
    version: &str,
) -> AppResult<Option<String>> {
    record.validate()?;
    let condition = super::settlement_effect_store::version_guard(
        crate::ids::MODEL_WEBHOOK_OUTBOX,
        &record.effect_id,
        version,
    );
    match db.guarded_batch(&[condition], &[settlement_effect_record::write(record)?])? {
        GuardedBatchOutcome::Conflict { .. } => Ok(None),
        GuardedBatchOutcome::Applied { entries, .. } => entries
            .into_iter()
            .find(|entry| entry.content_model_id == crate::ids::MODEL_WEBHOOK_OUTBOX)
            .map(|entry| entry.version)
            .ok_or_else(|| AppError::internal("effect write omitted its version"))
            .map(Some),
    }
}

fn backoff_seconds(attempts: u32) -> i64 {
    BASE_BACKOFF_SECONDS
        .saturating_mul(1_i64 << attempts.min(8))
        .min(MAX_BACKOFF_SECONDS)
}
