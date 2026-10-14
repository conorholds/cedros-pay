use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::models::{CreditTxn, LedgerEntry};
use crate::seams::HostSeams;

use super::record::{OperationRecord, SettlementClaimState, SettlementState};
use super::{CanonicalPaymentOutcome, PaymentMethod, OPERATION_MODEL};

pub(super) fn persist_terminal<S: HostSeams>(
    db: &Db<'_, S>,
    seams: &S,
    command: &super::credits_settlement::CreditCommand<'_>,
    subject: &str,
) -> AppResult<CanonicalPaymentOutcome> {
    let record = OperationRecord::terminal_rail(
        command.identity,
        command.attempt,
        command.context.clone(),
        "insufficient-funds",
        seams.now_unix_secs(),
    );
    let conditions = [GuardedCondition::Absent {
        content_model_id: OPERATION_MODEL,
        entry_key: command.identity.entry_key().into(),
    }];
    let ops = [super::settlement_storage::write(
        OPERATION_MODEL,
        command.identity.entry_key(),
        &record,
    )?];
    match db.guarded_batch(&conditions, &ops)? {
        GuardedBatchOutcome::Applied { .. } => Ok(super::credits_settlement::terminal(
            &record.operation_id,
            command.attempt.as_str(),
            "insufficient-funds",
            false,
        )),
        GuardedBatchOutcome::Conflict { .. } => read(
            db,
            subject,
            command,
            &format!("checkout:{}", record.operation_id),
        )?
        .ok_or_else(|| AppError::conflict("credit checkout changed concurrently")),
    }
}

pub(super) fn read<S: HostSeams>(
    db: &Db<'_, S>,
    subject: &str,
    command: &super::credits_settlement::CreditCommand<'_>,
    source_ref: &str,
) -> AppResult<Option<CanonicalPaymentOutcome>> {
    if let Some(outcome) = terminal_replay(db, subject, command)? {
        return Ok(Some(outcome));
    }
    let Some(txn_entry) = db.read_one(crate::ids::MODEL_CREDITS, &format!("txn:{source_ref}"))?
    else {
        return Ok(None);
    };
    validate_transaction(txn_entry.parse()?, subject, command, source_ref)?;
    let operation = complete_operation(db, subject, command)?;
    Ok(Some(super::credits_settlement::paid(
        &operation.operation_id,
        command.attempt.as_str(),
        true,
    )))
}

fn terminal_replay<S: HostSeams>(
    db: &Db<'_, S>,
    subject: &str,
    command: &super::credits_settlement::CreditCommand<'_>,
) -> AppResult<Option<CanonicalPaymentOutcome>> {
    let Some(entry) = db.read_one(OPERATION_MODEL, command.identity.entry_key())? else {
        return Ok(None);
    };
    let operation: OperationRecord = entry.parse()?;
    validate_operation(&operation, subject, command)?;
    Ok(match &operation.outcome {
        Some(super::DurableOutcome::Terminal { code, .. }) => {
            Some(super::credits_settlement::terminal(
                &operation.operation_id,
                command.attempt.as_str(),
                code,
                true,
            ))
        }
        _ => None,
    })
}

fn validate_transaction(
    txn: CreditTxn,
    subject: &str,
    command: &super::credits_settlement::CreditCommand<'_>,
    source_ref: &str,
) -> AppResult<()> {
    let exact = txn.source_ref == source_ref
        && txn.subject_id == subject
        && txn.kind == "authorize"
        && txn.amount_cents == command.amount_cents
        && txn.currency == command.currency;
    exact
        .then_some(())
        .ok_or_else(|| AppError::conflict("canonical credit transaction fingerprint mismatch"))
}

fn complete_operation<S: HostSeams>(
    db: &Db<'_, S>,
    subject: &str,
    command: &super::credits_settlement::CreditCommand<'_>,
) -> AppResult<OperationRecord> {
    let operation: OperationRecord = db
        .read_one(OPERATION_MODEL, command.identity.entry_key())?
        .ok_or_else(|| AppError::conflict("canonical credit replay is incomplete"))?
        .parse()?;
    validate_operation(&operation, subject, command)?;
    let quote_key = super::identity::operation_entry_key(command.quote_operation_id)?;
    let quote: OperationRecord = db
        .read_one(OPERATION_MODEL, &quote_key)?
        .ok_or_else(|| AppError::conflict("canonical credit replay quote is missing"))?
        .parse()?;
    let complete = operation.operation_id == command.identity.public_operation_id()
        && operation.settlement_state == SettlementState::Paid
        && quote.settlement_claim.as_ref().is_some_and(|claim| {
            claim.checkout_operation_id == operation.operation_id
                && claim.rail == PaymentMethod::Credits
                && claim.state == SettlementClaimState::Paid
                && claim.material_fingerprint == operation.material_fingerprint
        })
        && ledger_complete(
            db,
            &operation.operation_id,
            command.amount_cents,
            command.currency,
        )?;
    if !complete {
        return Err(AppError::conflict("canonical credit replay is incomplete"));
    }
    Ok(operation)
}

fn validate_operation(
    operation: &OperationRecord,
    subject: &str,
    command: &super::credits_settlement::CreditCommand<'_>,
) -> AppResult<()> {
    super::record::validate_match(operation, command.identity, command.attempt)?;
    if super::record_rail::subject_ref(operation)? == Some(subject) {
        Ok(())
    } else {
        Err(AppError::conflict(
            "canonical credit subject authority mismatch",
        ))
    }
}

fn ledger_complete<S: HostSeams>(
    db: &Db<'_, S>,
    operation_id: &str,
    amount: i64,
    currency: &str,
) -> AppResult<bool> {
    let Some(entry) = db.read_one(crate::ids::MODEL_LEDGER, operation_id)? else {
        return Ok(false);
    };
    let entry: LedgerEntry = entry.parse()?;
    Ok(entry.reference == operation_id
        && entry.provider_ref.as_deref() == Some(operation_id)
        && entry.provider == "credits"
        && entry.status == "succeeded"
        && entry.gross_cents == amount
        && entry.currency == currency)
}
