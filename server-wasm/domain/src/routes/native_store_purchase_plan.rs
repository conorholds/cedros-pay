//! Construction of an atomic ledger claim plus optional subscription projection.

use serde_json::Value;

use super::purchase_commit::{Commit, CLAIM_FIELD};
use super::subscription_projection::append_subscription;
use super::VerifyReq;
use crate::db::BatchOp;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::ids;
use crate::models::LedgerEntry;
use crate::seams::HostSeams;
use crate::time;

pub(super) struct PurchasePlan {
    pub conditions: Vec<GuardedCondition>,
    pub ops: Vec<BatchOp>,
    pub gross_cents: i64,
    pub currency: String,
}

pub(super) fn purchase_plan<S: HostSeams>(
    seams: &S,
    product: &Value,
    body: &VerifyReq,
    user_id: Option<&str>,
    commit: &Commit<'_>,
    claim: &Value,
) -> AppResult<PurchasePlan> {
    let gross_cents = crate::routes::products::catalog_price_cents(product).unwrap_or(0);
    let currency = crate::routes::products::catalog_currency(product);
    let ledger = ledger_value(
        body,
        user_id,
        commit,
        claim,
        gross_cents,
        &currency,
        seams.now_unix_secs(),
    )?;
    let mut plan = PurchasePlan {
        conditions: vec![GuardedCondition::Absent {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: commit.ledger_ref.to_string(),
        }],
        ops: vec![BatchOp::Write {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: commit.ledger_ref.to_string(),
            data: ledger,
        }],
        gross_cents,
        currency,
    };
    if let Some((sub_id, status, period_end)) = &commit.sub {
        append_subscription(
            seams,
            body,
            user_id,
            commit,
            sub_id,
            status,
            *period_end,
            &mut plan.conditions,
            &mut plan.ops,
        )?;
    }
    Ok(plan)
}

fn ledger_value(
    body: &VerifyReq,
    user_id: Option<&str>,
    commit: &Commit<'_>,
    claim: &Value,
    gross_cents: i64,
    currency: &str,
    now: i64,
) -> AppResult<Value> {
    let entry = LedgerEntry {
        reference: commit.ledger_ref.to_string(),
        kind: "payment".into(),
        status: "succeeded".into(),
        gross_cents,
        refund_cents: 0,
        currency: currency.into(),
        customer_profile_id: user_id.map(str::to_string),
        route_path: None,
        product_id: Some(body.product_id.clone()),
        product_ids: vec![body.product_id.clone()],
        provider: commit.provider.into(),
        provider_ref: Some(commit.provider_ref.into()),
        payer_wallet: None,
        created_at: time::iso8601(now),
        processed_at: time::iso8601(now),
        token_settlement: None,
    };
    let mut value = serde_json::to_value(entry).map_err(|error| {
        AppError::internal("cannot encode native purchase").with_internal(error.to_string())
    })?;
    value[CLAIM_FIELD] = claim.clone();
    Ok(value)
}
