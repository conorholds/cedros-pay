use crate::db::{Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedBatchOutcome;
use crate::models::{CreditAccount, CreditTxn, LedgerEntry};
use crate::seams::HostSeams;

use super::credits_settlement::CreditCommand;
use super::record::OperationRecord;
use super::settlement_effect_record::SettlementEffectRecord;
use super::settlement_plan::append_direct_inventory;
use super::{CanonicalCheckoutFacade, CanonicalPaymentOutcome, PaymentMethod};

#[path = "credits_execution_plan.rs"]
mod plan;

struct CreditState {
    operation_id: String,
    source_ref: String,
    account_key: String,
    account_entry: EntryRecord,
    account: CreditAccount,
}

struct Records {
    txn_key: String,
    txn: CreditTxn,
    record: OperationRecord,
    effect: SettlementEffectRecord,
    claim: super::settlement_claim::ClaimPlan,
    ledger: LedgerEntry,
}

pub(super) fn execute<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    command: CreditCommand<'_>,
) -> AppResult<CanonicalPaymentOutcome> {
    let buyer = facade
        .buyer
        .ok_or_else(|| AppError::unauthorized("credits checkout requires a verified buyer"))?;
    if super::record_rail::subject_ref_from_context(&command.context)?
        != Some(buyer.user_id.as_str())
    {
        return Err(AppError::internal(
            "credits checkout subject authority is inconsistent",
        ));
    }
    let db = Db::new(facade.seams, crate::ids::DB_ACCESS);
    let operation_id = command.identity.public_operation_id();
    let source_ref = format!("checkout:{operation_id}");
    if let Some(replay) = super::credits_replay::read(&db, &buyer.user_id, &command, &source_ref)? {
        return Ok(replay);
    }
    let account_key = format!("acct:{}", buyer.user_id);
    let Some(account_entry) = db.read_one(crate::ids::MODEL_CREDITS, &account_key)? else {
        return super::credits_replay::persist_terminal(
            &db,
            facade.seams,
            &command,
            &buyer.user_id,
        );
    };
    let mut account: CreditAccount = account_entry.parse()?;
    if !account.valid_for(&buyer.user_id) {
        return Err(AppError::internal("stored credit account is invalid"));
    }
    let balance = account.balance_cents.checked_sub(command.amount_cents);
    if account.currency != command.currency
        || account.available_cents() < command.amount_cents
        || balance.is_none()
    {
        return super::credits_replay::persist_terminal(
            &db,
            facade.seams,
            &command,
            &buyer.user_id,
        );
    }
    account.balance_cents = balance.expect("checked");
    account.updated_at = crate::time::iso8601(facade.seams.now_unix_secs());
    settle(
        facade,
        command,
        &db,
        &buyer.user_id,
        CreditState {
            operation_id,
            source_ref,
            account_key,
            account_entry,
            account,
        },
    )
}

fn settle<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    command: CreditCommand<'_>,
    db: &Db<'_, S>,
    subject: &str,
    state: CreditState,
) -> AppResult<CanonicalPaymentOutcome> {
    let txn = CreditTxn {
        source_ref: state.source_ref.clone(),
        subject_id: subject.into(),
        kind: "authorize".into(),
        amount_cents: command.amount_cents,
        currency: command.currency.into(),
        reason: Some("canonical-checkout".into()),
        balance_after_cents: state.account.balance_cents,
        created_at: crate::time::iso8601(facade.seams.now_unix_secs()),
    };
    let now = facade.seams.now_unix_secs();
    let mut record = OperationRecord::settled_rail(
        command.identity,
        command.attempt,
        command.context.clone(),
        PaymentMethod::Credits,
        &state.source_ref,
        now,
    );
    let effect = super::settlement_effect_store::build(db, &record, &state.source_ref, now)?;
    record.settlement_effect = Some(super::settlement_effect_store::paid_intent(
        &effect,
        &state.source_ref,
        now,
    ));
    let claim = super::settlement_claim::prepare_paid(
        db,
        command.quote_operation_id,
        PaymentMethod::Credits,
        &state.operation_id,
        command.identity.material_fingerprint(),
        facade.seams.now_unix_secs(),
    )?;
    let mut ledger = super::credits_settlement::ledger(
        &state.operation_id,
        command.amount_cents,
        command.currency,
        facade.seams.now_unix_secs(),
    );
    effect.apply_ledger_entitlement_identity(&mut ledger);
    let records = Records {
        txn_key: format!("txn:{}", state.source_ref),
        txn,
        ledger,
        record,
        effect,
        claim,
    };
    commit(facade, &command, db, subject, state, records)
}

fn commit<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    command: &CreditCommand<'_>,
    db: &Db<'_, S>,
    subject: &str,
    state: CreditState,
    records: Records,
) -> AppResult<CanonicalPaymentOutcome> {
    let mut plan = plan::base(command, &state, &records)?;
    append_direct_inventory(db, &records.record, facade.seams.now_unix_secs(), &mut plan)?;
    super::settlement_effect_store::insert_ops(
        &records.effect,
        &mut plan.conditions,
        &mut plan.ops,
    )?;
    match db.guarded_batch(&plan.conditions, &plan.ops)? {
        GuardedBatchOutcome::Applied { .. } => Ok(super::credits_settlement::paid(
            &state.operation_id,
            command.attempt.as_str(),
            false,
        )),
        GuardedBatchOutcome::Conflict { .. } => {
            super::credits_replay::read(db, subject, command, &state.source_ref)?
                .ok_or_else(|| AppError::conflict("quote or credit balance changed; retry"))
        }
    }
}
