use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

use super::record::OperationRecord;
use super::{CanonicalPaymentOutcome, DurableOutcome, PaymentMethod};

pub(super) fn settle<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    record: &OperationRecord,
    replayed: bool,
) -> AppResult<CanonicalPaymentOutcome> {
    let x402 = details(record)?;
    let raw = match seams.http_fetch(
        &crate::x402::rpc::build_get_signature_statuses(rpc_url, &x402.signature).to_string(),
    ) {
        Ok(raw) => raw,
        Err(_) => return Ok(processing(record, replayed)),
    };
    match crate::x402::rpc::parse_signature_status(&raw) {
        Ok(crate::x402::rpc::Confirmation::Confirmed)
        | Ok(crate::x402::rpc::Confirmation::Finalized)
        | Ok(crate::x402::rpc::Confirmation::Failed(_)) => {
            match crate::x402::rpc::load_confirmed_transaction(
                seams,
                rpc_url,
                &x402.signature,
                &x402.transaction,
            ) {
                Ok(crate::x402::rpc::ConfirmedTransaction::Succeeded) => {
                    super::x402_transition::paid(seams, &record.operation_id)?;
                    Ok(paid(record, replayed))
                }
                Ok(crate::x402::rpc::ConfirmedTransaction::Failed(_)) => {
                    terminal_transition(seams, record, "x402-onchain-failed", replayed)
                }
                _ => Ok(processing(record, replayed)),
            }
        }
        Ok(crate::x402::rpc::Confirmation::NotFound) => {
            blockhash_outcome(seams, rpc_url, record, replayed)
        }
        _ => Ok(processing(record, replayed)),
    }
}

fn blockhash_outcome<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    record: &OperationRecord,
    replayed: bool,
) -> AppResult<CanonicalPaymentOutcome> {
    let x402 = details(record)?;
    if let Some(slot) = x402.blockhash_valid_at_slot {
        if crate::x402::rpc_expiry::expired(
            seams,
            rpc_url,
            &x402.recent_blockhash,
            &x402.signature,
            slot,
        ) == Ok(true)
        {
            return terminal_transition(seams, record, "x402-blockhash-expired", replayed);
        }
    } else if let Ok(raw) = seams.http_fetch(
        &crate::x402::rpc::build_is_blockhash_valid(rpc_url, &x402.recent_blockhash).to_string(),
    ) {
        if let Ok((true, slot)) = crate::x402::rpc_expiry::observation(&raw) {
            remember_valid_blockhash(seams, record, slot)?;
        }
    }
    // An unknown blockhash may be too new for a lagging RPC, not expired.
    Ok(processing(record, replayed))
}

fn remember_valid_blockhash<S: HostSeams>(
    seams: &S,
    record: &OperationRecord,
    slot: u64,
) -> AppResult<()> {
    let db = crate::db::Db::new(seams, crate::ids::DB_ACCESS);
    let key = super::identity::operation_entry_key(&record.operation_id)?;
    let entry = super::settlement_storage::required(&db, super::OPERATION_MODEL, &key)?;
    let mut current: OperationRecord = entry.parse()?;
    if current.settlement_state != super::record::SettlementState::Pending
        || details(&current)?.transaction != details(record)?.transaction
        || details(&current)?.blockhash_valid_at_slot.is_some()
    {
        return Ok(());
    }
    current
        .x402_settlement
        .as_mut()
        .ok_or_else(|| AppError::internal("x402 evidence missing"))?
        .blockhash_valid_at_slot = Some(slot);
    db.guarded_batch(
        &[super::settlement_storage::version(
            super::OPERATION_MODEL,
            &entry,
        )?],
        &[super::settlement_storage::write(
            super::OPERATION_MODEL,
            &key,
            &current,
        )?],
    )?;
    Ok(())
}

fn terminal_transition<S: HostSeams>(
    seams: &S,
    record: &OperationRecord,
    code: &str,
    replayed: bool,
) -> AppResult<CanonicalPaymentOutcome> {
    super::x402_transition::terminal(seams, &record.operation_id, code)?;
    Ok(terminal(record, code, replayed))
}

pub(super) fn stored_outcome(
    record: &OperationRecord,
    replayed: bool,
) -> AppResult<CanonicalPaymentOutcome> {
    match &record.outcome {
        Some(DurableOutcome::Resolved { .. }) => Ok(paid(record, replayed)),
        Some(DurableOutcome::Terminal { code, .. }) => Ok(terminal(record, code, replayed)),
        _ => Err(AppError::internal(
            "x402 final state has no durable outcome",
        )),
    }
}

fn details(record: &OperationRecord) -> AppResult<&super::record::X402Settlement> {
    record
        .x402_settlement
        .as_ref()
        .ok_or_else(|| AppError::internal("x402 settlement details are missing"))
}

fn paid(record: &OperationRecord, replayed: bool) -> CanonicalPaymentOutcome {
    CanonicalPaymentOutcome::Paid {
        operation_id: record.operation_id.clone(),
        attempt_id: record.checkout_attempt_id.clone(),
        payment_method: PaymentMethod::X402,
        replayed,
    }
}

fn terminal(record: &OperationRecord, code: &str, replayed: bool) -> CanonicalPaymentOutcome {
    CanonicalPaymentOutcome::Terminal {
        operation_id: record.operation_id.clone(),
        attempt_id: record.checkout_attempt_id.clone(),
        payment_method: PaymentMethod::X402,
        code: code.into(),
        replayed,
    }
}

fn processing(record: &OperationRecord, replayed: bool) -> CanonicalPaymentOutcome {
    CanonicalPaymentOutcome::Processing {
        operation_id: record.operation_id.clone(),
        attempt_id: record.checkout_attempt_id.clone(),
        payment_method: PaymentMethod::X402,
        replayed,
    }
}

pub(super) fn indeterminate(
    record: &OperationRecord,
    code: &str,
    replayed: bool,
) -> CanonicalPaymentOutcome {
    CanonicalPaymentOutcome::Indeterminate {
        operation_id: record.operation_id.clone(),
        attempt_id: record.checkout_attempt_id.clone(),
        payment_method: PaymentMethod::X402,
        code: code.into(),
        replayed,
    }
}
