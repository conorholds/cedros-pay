use super::{acct_key, store, txn_key, validation, CreditMove, CreditOutcome};
use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::models::{CreditAccount, CreditTxn};
use crate::money;
use crate::seams::HostSeams;
use crate::time;

#[path = "credits_move_replay.rs"]
mod replay_support;

pub(super) fn apply<S: HostSeams>(
    seams: &S,
    mv: &CreditMove,
    extra_conditions: &[GuardedCondition],
    extra_ops: &[BatchOp],
) -> AppResult<CreditOutcome> {
    apply_inner(seams, mv, extra_conditions, extra_ops, true)
}

fn apply_inner<S: HostSeams>(
    seams: &S,
    mv: &CreditMove,
    extra_conditions: &[GuardedCondition],
    extra_ops: &[BatchOp],
    require_extra_guards: bool,
) -> AppResult<CreditOutcome> {
    money::require_positive(mv.amount_cents).map_err(AppError::unprocessable)?;
    if !matches!((mv.kind, mv.delta), ("grant", delta) if delta == mv.amount_cents)
        && !matches!((mv.kind, mv.delta), ("authorize", delta) if delta == -mv.amount_cents)
    {
        return Err(AppError::unprocessable(
            "credit movement does not match its ledger amount",
        ));
    }
    validation::identifier(mv.subject_id, "subjectId")?;
    validation::identifier(mv.source_ref, "sourceRef")?;
    if require_extra_guards {
        replay_support::validate_extra_guards(extra_conditions, extra_ops)?;
    }
    let currency = mv.currency.map(validation::supplied_currency).transpose()?;
    let db = Db::new(seams, ids::DB_ACCESS);
    if let Some(outcome) = replay(&db, mv, currency.as_deref())? {
        replay_support::reconcile(&db, extra_conditions, extra_ops)?;
        return Ok(outcome);
    }
    apply_new(
        &db,
        seams.now_unix_secs(),
        mv,
        currency,
        extra_conditions,
        extra_ops,
    )
}

fn replay<S: HostSeams>(
    db: &Db<'_, S>,
    mv: &CreditMove,
    currency: Option<&str>,
) -> AppResult<Option<CreditOutcome>> {
    let Some(existing) = db.read_one(ids::MODEL_CREDITS, &txn_key(mv.source_ref))? else {
        return Ok(None);
    };
    let txn: CreditTxn = existing.parse()?;
    if txn.amount_cents <= 0 || txn.balance_after_cents < 0 {
        return Err(AppError::internal("stored credit transaction is invalid"));
    }
    ensure_same_fingerprint(&txn, mv, currency)?;
    Ok(Some(CreditOutcome {
        subject_id: txn.subject_id,
        balance_cents: txn.balance_after_cents,
        applied: false,
    }))
}

fn ensure_same_fingerprint(
    txn: &CreditTxn,
    mv: &CreditMove,
    currency: Option<&str>,
) -> AppResult<()> {
    let replay_currency = currency.unwrap_or(&txn.currency);
    if txn.source_ref == mv.source_ref
        && txn.subject_id == mv.subject_id
        && txn.kind == mv.kind
        && txn.amount_cents == mv.amount_cents
        && txn.currency == replay_currency
        && txn.reason.as_deref() == mv.reason
    {
        return Ok(());
    }
    Err(AppError::conflict(
        "sourceRef was already used for a different credit move",
    ))
}

fn apply_new<S: HostSeams>(
    db: &Db<'_, S>,
    now: i64,
    mv: &CreditMove,
    currency: Option<String>,
    extra_conditions: &[GuardedCondition],
    extra_ops: &[BatchOp],
) -> AppResult<CreditOutcome> {
    let account_key = acct_key(mv.subject_id);
    let stored_account = store::read::<_, CreditAccount>(db, &account_key)?;
    if stored_account
        .as_ref()
        .is_some_and(|stored| !stored.value.valid_for(mv.subject_id))
    {
        return Err(AppError::internal("stored credit account is invalid"));
    }
    let account = updated_account(now, mv, currency.as_deref(), stored_account.as_ref())?;
    let new_balance = account.balance_cents;
    let txn = transaction(mv, &account, now);
    let txn_key = txn_key(mv.source_ref);
    let mut conditions = vec![
        GuardedCondition::Absent {
            content_model_id: ids::MODEL_CREDITS,
            entry_key: txn_key.clone(),
        },
        store::condition(&account_key, stored_account.as_ref()),
    ];
    conditions.extend(extra_conditions.iter().cloned());
    let mut ops = vec![
        store::write(account_key, &account)?,
        store::write(txn_key, &txn)?,
    ];
    ops.extend(extra_ops.iter().cloned());
    match db.guarded_batch(&conditions, &ops)? {
        GuardedBatchOutcome::Applied { .. } => Ok(CreditOutcome {
            subject_id: mv.subject_id.to_string(),
            balance_cents: new_balance,
            applied: true,
        }),
        GuardedBatchOutcome::Conflict { .. } => {
            let outcome = replay(db, mv, currency.as_deref())?.ok_or_else(|| {
                AppError::conflict("credit account changed while applying move; retry")
            })?;
            replay_support::reconcile(db, extra_conditions, extra_ops)?;
            Ok(outcome)
        }
    }
}

fn updated_account(
    now: i64,
    mv: &CreditMove,
    currency: Option<&str>,
    stored: Option<&store::Versioned<CreditAccount>>,
) -> AppResult<CreditAccount> {
    let mut account = stored
        .map(|value| value.value.clone())
        .unwrap_or_else(|| CreditAccount {
            subject_id: mv.subject_id.to_string(),
            balance_cents: 0,
            held_cents: 0,
            currency: currency.unwrap_or(money::DEFAULT_CURRENCY).to_string(),
            updated_at: time::iso8601(now),
        });
    if currency.is_some_and(|value| value != account.currency) {
        return Err(AppError::unprocessable(
            "currency does not match the account",
        ));
    }
    let balance = account
        .balance_cents
        .checked_add(mv.delta)
        .ok_or_else(|| AppError::unprocessable("credit balance would overflow"))?;
    if mv.delta < 0 && balance < account.held_cents {
        return Err(AppError::new(
            402,
            "insufficient_funds",
            "insufficient available balance",
        ));
    }
    account.balance_cents = balance;
    account.updated_at = time::iso8601(now);
    Ok(account)
}

fn transaction(mv: &CreditMove, account: &CreditAccount, now: i64) -> CreditTxn {
    CreditTxn {
        source_ref: mv.source_ref.to_string(),
        subject_id: mv.subject_id.to_string(),
        kind: mv.kind.to_string(),
        amount_cents: mv.amount_cents,
        currency: account.currency.clone(),
        reason: mv.reason.map(str::to_string),
        balance_after_cents: account.balance_cents,
        created_at: time::iso8601(now),
    }
}
