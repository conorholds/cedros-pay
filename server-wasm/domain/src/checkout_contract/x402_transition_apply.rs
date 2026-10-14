use crate::db::{Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedBatchOutcome;
use crate::models::LedgerEntry;
use crate::seams::HostSeams;

use super::super::record::{OperationRecord, SettlementState};
use super::super::settlement_plan::{append_inventory, Plan};
use super::super::OPERATION_MODEL;

pub(super) fn once<S: HostSeams>(
    seams: &S,
    operation_id: &str,
    target: &SettlementState,
    terminal_code: Option<&str>,
) -> AppResult<bool> {
    let db = Db::new(seams, crate::ids::DB_ACCESS);
    let checkout_key = super::super::identity::operation_entry_key(operation_id)?;
    let checkout_entry =
        super::super::settlement_storage::required(&db, OPERATION_MODEL, &checkout_key)?;
    let checkout = checkout_entry.parse::<OperationRecord>()?;
    if checkout.settlement_state == *target {
        return Ok(true);
    }
    super::validate_pending(&checkout, operation_id)?;
    let mut loaded = Loaded::read(&db, checkout_key, checkout_entry, checkout)?;
    let now = seams.now_unix_secs();
    super::update_claim(&mut loaded.quote, &loaded.checkout, target, now)?;
    let plan = loaded.plan(&db, target, terminal_code, now)?;
    Ok(matches!(
        db.guarded_batch(&plan.conditions, &plan.ops)?,
        GuardedBatchOutcome::Applied { .. }
    ))
}

struct Loaded {
    checkout_key: String,
    quote_key: String,
    checkout_entry: EntryRecord,
    quote_entry: EntryRecord,
    checkout: OperationRecord,
    quote: OperationRecord,
    signature: String,
}

impl Loaded {
    fn read<S: HostSeams>(
        db: &Db<'_, S>,
        checkout_key: String,
        checkout_entry: EntryRecord,
        checkout: OperationRecord,
    ) -> AppResult<Self> {
        let signature = checkout
            .x402_settlement
            .as_ref()
            .ok_or_else(|| AppError::internal("x402 settlement details are missing"))?
            .signature
            .clone();
        let quote_id = super::super::record_rail::quote_id(&checkout)?;
        let quote_key = super::super::identity::operation_entry_key(quote_id)?;
        let quote_entry =
            super::super::settlement_storage::required(db, OPERATION_MODEL, &quote_key)?;
        let quote = quote_entry.parse::<OperationRecord>()?;
        Ok(Self {
            checkout_key,
            quote_key,
            checkout_entry,
            quote_entry,
            checkout,
            quote,
            signature,
        })
    }

    fn plan<S: HostSeams>(
        &mut self,
        db: &Db<'_, S>,
        target: &SettlementState,
        terminal_code: Option<&str>,
        now: i64,
    ) -> AppResult<Plan> {
        let ledger_entry = super::super::settlement_storage::required(
            db,
            crate::ids::MODEL_LEDGER,
            &self.signature,
        )?;
        let mut ledger: LedgerEntry = ledger_entry.parse()?;
        super::validate_ledger(&ledger, &self.signature)?;
        ledger.status = if *target == SettlementState::Paid {
            "succeeded"
        } else {
            "failed"
        }
        .into();
        ledger.processed_at = crate::time::iso8601(now);
        let mut plan = Plan::new(&self.checkout_entry, &self.quote_entry)?;
        plan.conditions
            .push(super::super::settlement_storage::version(
                crate::ids::MODEL_LEDGER,
                &ledger_entry,
            )?);
        append_inventory(db, &self.checkout, target, now, &mut plan)?;
        let effect = if *target == SettlementState::Paid {
            Some(super::super::settlement_effect_store::build(
                db,
                &self.checkout,
                &self.signature,
                now,
            )?)
        } else {
            None
        };
        if let Some(effect) = &effect {
            effect.apply_ledger_entitlement_identity(&mut ledger);
        }
        super::super::x402_transition_record::finalize(
            &mut self.checkout,
            &mut self.quote,
            target,
            terminal_code,
            &self.signature,
            effect.as_ref(),
            now,
        );
        if let Some(effect) = &effect {
            super::super::settlement_effect_store::insert_ops(
                effect,
                &mut plan.conditions,
                &mut plan.ops,
            )?;
        }
        append_ops(&mut plan, self, &ledger)?;
        Ok(plan)
    }
}

fn append_ops(plan: &mut Plan, loaded: &Loaded, ledger: &LedgerEntry) -> AppResult<()> {
    plan.ops.push(super::super::settlement_storage::write(
        crate::ids::MODEL_LEDGER,
        &loaded.signature,
        ledger,
    )?);
    plan.ops.push(super::super::settlement_storage::write(
        OPERATION_MODEL,
        &loaded.checkout_key,
        &loaded.checkout,
    )?);
    plan.ops.push(super::super::settlement_storage::write(
        OPERATION_MODEL,
        &loaded.quote_key,
        &loaded.quote,
    )?);
    Ok(())
}
