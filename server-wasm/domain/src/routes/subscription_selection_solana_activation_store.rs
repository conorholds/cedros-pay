//! Atomic payment-signature claim, subscription/entitlement projection, and
//! durable lifecycle marker for initial Solana subscription collection.

use std::collections::BTreeMap;

use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use super::solana::DerivedSubscriptionAddresses;
use super::solana_activation_records as records;
use super::solana_payment_verifier::VerifiedInitialPayment;
use super::support::{ResolvedPlan, ResolvedSolanaPlan};
use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::seams::HostSeams;

pub(super) struct ActivationInput<'a> {
    pub(super) user_id: &'a str,
    pub(super) wallet: &'a str,
    pub(super) authorization_signature: &'a str,
    pub(super) payment_signature: &'a str,
    pub(super) number_of_payments: i32,
    pub(super) metadata: Option<&'a BTreeMap<String, String>>,
    pub(super) plan: &'a ResolvedPlan,
    pub(super) solana: &'a ResolvedSolanaPlan,
    pub(super) addresses: &'a DerivedSubscriptionAddresses,
    pub(super) program_address: &'a str,
    pub(super) token_program_address: &'a str,
    pub(super) subscriber_token_account: &'a str,
    pub(super) receiver_token_account: &'a str,
    pub(super) collector_address: &'a str,
    pub(super) payment: &'a VerifiedInitialPayment,
}

pub(super) struct PersistedActivation {
    pub(super) record: Value,
}

pub(super) fn persist<S: HostSeams>(
    seams: &S,
    input: &ActivationInput<'_>,
) -> AppResult<PersistedActivation> {
    let db = Db::new(seams, ids::DB_ACCESS);
    let fingerprint = fingerprint(input)?;
    let keys = Keys::new(input);
    if let Some(existing) = replay(&db, &keys, &fingerprint)? {
        ensure_effect(&db, input, &existing)?;
        crate::durable_effects::dispatch_best_effort(
            seams,
            "solana-subscription-activation",
            input.payment_signature,
        );
        return Ok(PersistedActivation { record: existing });
    }
    let record = records::subscription(input, &keys.subscription, &fingerprint);
    let mut conditions = absent_conditions(&keys);
    let mut ops = writes(input, &keys, &fingerprint, &record);
    append_effect(input, &record, &mut conditions, &mut ops)?;
    let persisted = match db.guarded_batch(&conditions, &ops)? {
        GuardedBatchOutcome::Applied { .. } => Ok(PersistedActivation { record }),
        GuardedBatchOutcome::Conflict { .. } => replay(&db, &keys, &fingerprint)?
            .map(|record| PersistedActivation { record })
            .ok_or_else(|| AppError::conflict("Solana activation changed concurrently; retry")),
    }?;
    crate::durable_effects::dispatch_best_effort(
        seams,
        "solana-subscription-activation",
        input.payment_signature,
    );
    Ok(persisted)
}

fn append_effect(
    input: &ActivationInput<'_>,
    record: &Value,
    conditions: &mut Vec<GuardedCondition>,
    ops: &mut Vec<BatchOp>,
) -> AppResult<()> {
    let actions = super::solana_activation_support::activation_actions(
        input.user_id,
        record,
        input.plan,
        input.payment.block_time,
    );
    if let Some(effect) = crate::durable_effects::plan(
        "solana-subscription-activation",
        input.payment_signature,
        actions,
        input.payment.block_time,
    )? {
        conditions.push(effect.condition);
        ops.push(effect.op);
    }
    Ok(())
}

fn ensure_effect<S: HostSeams>(
    db: &Db<'_, S>,
    input: &ActivationInput<'_>,
    record: &Value,
) -> AppResult<()> {
    let actions = super::solana_activation_support::activation_actions(
        input.user_id,
        record,
        input.plan,
        input.payment.block_time,
    );
    if let Some(effect) = crate::durable_effects::plan(
        "solana-subscription-activation",
        input.payment_signature,
        actions,
        input.payment.block_time,
    )? {
        crate::durable_effects::ensure_plan(db, &effect)?;
    }
    Ok(())
}

struct Keys {
    subscription: String,
    payment: String,
    lifecycle: String,
}

impl Keys {
    fn new(input: &ActivationInput<'_>) -> Self {
        Self {
            subscription: format!(
                "sub_solana_{}",
                short_hash(&input.addresses.subscription_address)
            ),
            payment: format!(
                "solana-subscription-payment:{}",
                short_hash(input.payment_signature)
            ),
            lifecycle: format!(
                "evt:solana-subscription-started:{}",
                short_hash(input.payment_signature)
            ),
        }
    }
}

fn fingerprint(input: &ActivationInput<'_>) -> AppResult<String> {
    crate::routes::checkout_claim::fingerprint(&json!({
        "schemaVersion": 1,
        "operation": "solana-subscription-activation",
        "userId": input.user_id,
        "wallet": input.wallet,
        "planId": input.plan.id,
        "authorizationSignature": input.authorization_signature,
        "paymentSignature": input.payment_signature,
        "subscriptionAddress": input.addresses.subscription_address,
        "amountAtomic": input.solana.amount_atomic,
        "tokenMint": input.solana.token_mint,
        "periodStart": input.payment.period_start,
        "periodEnd": input.payment.period_end,
    }))
}

fn absent_conditions(keys: &Keys) -> Vec<GuardedCondition> {
    vec![
        GuardedCondition::Absent {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: keys.payment.clone(),
        },
        GuardedCondition::Absent {
            content_model_id: ids::MODEL_SUBSCRIPTIONS,
            entry_key: keys.subscription.clone(),
        },
        GuardedCondition::Absent {
            content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
            entry_key: keys.lifecycle.clone(),
        },
    ]
}

fn writes(
    input: &ActivationInput<'_>,
    keys: &Keys,
    fingerprint: &str,
    record: &Value,
) -> Vec<BatchOp> {
    vec![
        write(
            ids::MODEL_LEDGER,
            &keys.payment,
            records::payment(input, fingerprint),
        ),
        write(ids::MODEL_SUBSCRIPTIONS, &keys.subscription, record.clone()),
        write(
            ids::MODEL_WEBHOOK_OUTBOX,
            &keys.lifecycle,
            records::lifecycle(input, fingerprint),
        ),
    ]
}

fn replay<S: HostSeams>(
    db: &Db<'_, S>,
    keys: &Keys,
    fingerprint: &str,
) -> AppResult<Option<Value>> {
    let payment = db.read_one(ids::MODEL_LEDGER, &keys.payment)?;
    let subscription = db.read_one(ids::MODEL_SUBSCRIPTIONS, &keys.subscription)?;
    let lifecycle = db.read_one(ids::MODEL_WEBHOOK_OUTBOX, &keys.lifecycle)?;
    if payment.is_none() && subscription.is_none() && lifecycle.is_none() {
        return Ok(None);
    }
    let matches = [&payment, &subscription, &lifecycle].iter().all(|row| {
        row.as_ref().is_some_and(|row| {
            row.payload
                .get("activationFingerprint")
                .and_then(Value::as_str)
                == Some(fingerprint)
                || row.payload.get("fingerprint").and_then(Value::as_str) == Some(fingerprint)
        })
    });
    if matches {
        Ok(subscription.map(|row| row.payload))
    } else {
        Err(AppError::conflict(
            "Solana payment signature or subscription was already applied to different facts",
        ))
    }
}

fn write(model: &'static str, key: &str, data: Value) -> BatchOp {
    BatchOp::Write {
        content_model_id: model,
        entry_key: key.into(),
        data,
    }
}

fn short_hash(value: &str) -> String {
    hex::encode(&Sha256::digest(value.as_bytes())[..16])
}
