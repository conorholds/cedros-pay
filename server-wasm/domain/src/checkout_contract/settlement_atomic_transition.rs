use crate::db::{Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedBatchOutcome;
use crate::seams::HostSeams;

use super::record::{OperationRecord, SettlementClaimState, SettlementState};
use super::settlement_plan::{append_inventory, append_ledger, Plan};
use super::{CanonicalOperationContext, OPERATION_MODEL};

#[derive(Clone, Copy)]
pub(super) struct PaymentFacts<'a> {
    pub amount: i64,
    pub currency: &'a str,
    pub payment_intent: Option<&'a str>,
}

#[derive(Clone, Copy)]
pub(super) struct TerminalOutcome<'a> {
    pub code: &'a str,
    pub proof: &'a str,
}

pub(super) fn run<S: HostSeams>(
    seams: &S,
    operation_id: &str,
    provider_id: Option<&str>,
    target: SettlementState,
    expected_payment: Option<PaymentFacts<'_>>,
    terminal_outcome: Option<TerminalOutcome<'_>>,
) -> AppResult<()> {
    for _ in 0..3 {
        if apply_once(
            seams,
            operation_id,
            provider_id,
            &target,
            expected_payment,
            terminal_outcome,
        )? {
            return Ok(());
        }
    }
    Err(AppError::conflict("checkout settlement changed repeatedly"))
}

fn apply_once<S: HostSeams>(
    seams: &S,
    operation_id: &str,
    provider_id: Option<&str>,
    target: &SettlementState,
    expected_payment: Option<PaymentFacts<'_>>,
    terminal_outcome: Option<TerminalOutcome<'_>>,
) -> AppResult<bool> {
    let db = Db::new(seams, crate::ids::DB_ACCESS);
    let mut loaded = Loaded::read(&db, operation_id)?;
    if loaded.checkout.settlement_state == *target {
        return Ok(true);
    }
    super::settlement_atomic_validation::checkout(
        &loaded.checkout,
        operation_id,
        provider_id,
        target,
    )?;
    let now = seams.now_unix_secs();
    loaded.update_claim(operation_id, target, now)?;
    loaded.validate_payment(expected_payment)?;
    let plan = loaded.plan(
        &db,
        provider_id,
        target,
        terminal_outcome,
        expected_payment,
        now,
    )?;
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
}

impl Loaded {
    fn read<S: HostSeams>(db: &Db<'_, S>, operation_id: &str) -> AppResult<Self> {
        let checkout_key = super::identity::operation_entry_key(operation_id)?;
        let checkout_entry =
            super::settlement_storage::required(db, OPERATION_MODEL, &checkout_key)?;
        let checkout = checkout_entry.parse::<OperationRecord>()?;
        let quote_id = super::settlement_atomic_validation::quote_id(&checkout)?;
        let quote_key = super::identity::operation_entry_key(quote_id)?;
        let quote_entry = super::settlement_storage::required(db, OPERATION_MODEL, &quote_key)?;
        let quote = quote_entry.parse::<OperationRecord>()?;
        Ok(Self {
            checkout_key,
            quote_key,
            checkout_entry,
            quote_entry,
            checkout,
            quote,
        })
    }

    fn update_claim(
        &mut self,
        operation_id: &str,
        target: &SettlementState,
        now: i64,
    ) -> AppResult<()> {
        let claim = self
            .quote
            .settlement_claim
            .as_mut()
            .filter(|claim| {
                claim.checkout_operation_id == operation_id
                    && claim.material_fingerprint == self.checkout.material_fingerprint
                    && matches!(
                        &self.checkout.canonical_context,
                        CanonicalOperationContext::Checkout { payment_method, .. }
                            if claim.rail == *payment_method
                    )
            })
            .ok_or_else(|| AppError::conflict("quote settlement claim is not owned by checkout"))?;
        claim.state = if *target == SettlementState::Paid {
            SettlementClaimState::Paid
        } else {
            SettlementClaimState::Terminal
        };
        claim.updated_at = now;
        Ok(())
    }

    fn validate_payment(&self, expected: Option<PaymentFacts<'_>>) -> AppResult<()> {
        let Some(PaymentFacts {
            amount, currency, ..
        }) = expected
        else {
            return Ok(());
        };
        let snapshot = super::settlement_atomic_validation::quote_snapshot(&self.quote)?;
        if i64::try_from(snapshot.total_cents).ok() == Some(amount) && snapshot.currency == currency
        {
            Ok(())
        } else {
            Err(AppError::forbidden(
                "Stripe webhook payment facts do not match checkout",
            ))
        }
    }

    fn plan<S: HostSeams>(
        &mut self,
        db: &Db<'_, S>,
        provider_id: Option<&str>,
        target: &SettlementState,
        terminal_outcome: Option<TerminalOutcome<'_>>,
        expected_payment: Option<PaymentFacts<'_>>,
        now: i64,
    ) -> AppResult<Plan> {
        let mut plan = Plan::new(&self.checkout_entry, &self.quote_entry)?;
        append_inventory(db, &self.checkout, target, now, &mut plan)?;
        let effect = if *target == SettlementState::Paid {
            let provider = provider_id.expect("validated");
            let effect = super::settlement_effect_store::build(db, &self.checkout, provider, now)?;
            append_ledger(
                db,
                provider,
                super::settlement_atomic_validation::quote_snapshot(&self.quote)?,
                &effect,
                now,
                &mut plan,
                expected_payment.and_then(|facts| facts.payment_intent),
            )?;
            super::settlement_effect_store::insert_ops(
                &effect,
                &mut plan.conditions,
                &mut plan.ops,
            )?;
            Some(effect)
        } else {
            None
        };
        self.finalize(
            effect.as_ref(),
            provider_id,
            target,
            terminal_outcome,
            now,
            &mut plan,
        )?;
        Ok(plan)
    }

    fn finalize(
        &mut self,
        effect: Option<&super::settlement_effect_record::SettlementEffectRecord>,
        provider_id: Option<&str>,
        target: &SettlementState,
        terminal_outcome: Option<TerminalOutcome<'_>>,
        now: i64,
        plan: &mut Plan,
    ) -> AppResult<()> {
        if *target == SettlementState::Terminal && provider_id.is_some() {
            let terminal = terminal_outcome.ok_or_else(|| {
                AppError::internal("provider terminal settlement omitted its outcome")
            })?;
            self.checkout.outcome = Some(super::DurableOutcome::Terminal {
                code: terminal.code.into(),
                durable: true,
                replayed: false,
                outcome_proof: Some(terminal.proof.into()),
            });
        }
        self.checkout.settlement_state = target.clone();
        self.checkout.settlement_effect = Some(effect.map_or_else(
            || super::settlement_effect_store::terminal_intent(now),
            |effect| {
                super::settlement_effect_store::paid_intent(
                    effect,
                    provider_id.expect("validated"),
                    now,
                )
            },
        ));
        self.checkout.updated_at = now;
        self.quote.settlement_state = target.clone();
        self.quote.updated_at = now;
        plan.ops.push(super::settlement_storage::write(
            OPERATION_MODEL,
            &self.checkout_key,
            &self.checkout,
        )?);
        plan.ops.push(super::settlement_storage::write(
            OPERATION_MODEL,
            &self.quote_key,
            &self.quote,
        )?);
        Ok(())
    }
}
