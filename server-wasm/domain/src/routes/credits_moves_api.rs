use serde::Deserialize;
use serde_json::json;

use super::{move_logic, validation};
use crate::crm_events;
use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::routes::analytics_events;
use crate::seams::HostSeams;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MoveReq {
    subject_id: String,
    amount_cents: i64,
    #[serde(default)]
    currency: Option<String>,
    #[serde(default)]
    reason: Option<String>,
    source_ref: String,
}

/// Result of an idempotent credit move.
#[derive(Debug)]
pub(crate) struct CreditOutcome {
    pub subject_id: String,
    pub balance_cents: i64,
    pub applied: bool,
}

/// Validated balance movement plus its immutable replay fingerprint.
pub(crate) struct CreditMove<'a> {
    pub subject_id: &'a str,
    pub amount_cents: i64,
    pub currency: Option<&'a str>,
    pub kind: &'a str,
    pub delta: i64,
    pub source_ref: &'a str,
    pub reason: Option<&'a str>,
}

/// Applies a move plus same-target guarded caller writes atomically.
pub(crate) fn apply_guarded_credit_move<S: HostSeams>(
    seams: &S,
    mv: &CreditMove,
    extra_conditions: &[GuardedCondition],
    extra_ops: &[BatchOp],
) -> AppResult<CreditOutcome> {
    move_logic::apply(seams, mv, extra_conditions, extra_ops)
}

pub(super) fn grant<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let body = parse_move(req)?;
    let delta = body.amount_cents;
    apply_delta(seams, &body, "grant", delta)
}

pub(super) fn authorize<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let body = parse_move(req)?;
    let delta = -body.amount_cents;
    apply_delta(seams, &body, "authorize", delta)
}

fn parse_move(req: &RouteRequest) -> AppResult<MoveReq> {
    let body: MoveReq = serde_json::from_value(req.json_body()?).map_err(|error| {
        AppError::unprocessable("invalid request body").with_internal(error.to_string())
    })?;
    crate::money::require_positive(body.amount_cents).map_err(AppError::unprocessable)?;
    validation::identifier(&body.subject_id, "subjectId")?;
    validation::identifier(&body.source_ref, "sourceRef")?;
    Ok(body)
}

fn apply_delta<S: HostSeams>(
    seams: &S,
    req: &MoveReq,
    kind: &str,
    delta: i64,
) -> AppResult<RouteResponse> {
    let now = existing_move_time(seams, &req.source_ref)?.unwrap_or_else(|| seams.now_unix_secs());
    let mut conditions = Vec::new();
    let mut ops = Vec::new();
    if kind == "grant" {
        let currency = resolved_currency(seams, req)?;
        let mut actions = vec![analytics_events::payment_succeeded_action(
            "credits",
            "credit-purchase",
            req.amount_cents,
            &currency,
            now,
        )];
        if let Some(action) = crm_events::credit_purchase_action(
            &req.subject_id,
            req.amount_cents,
            &currency,
            &req.source_ref,
            req.reason.as_deref(),
            now,
        ) {
            actions.push(action);
        }
        if let Some(effect) =
            crate::durable_effects::plan("credit-grant", &req.source_ref, actions, now)?
        {
            conditions.push(effect.condition);
            ops.push(effect.op);
        }
    }
    let outcome = apply_guarded_credit_move(
        seams,
        &CreditMove {
            subject_id: &req.subject_id,
            amount_cents: req.amount_cents,
            currency: req.currency.as_deref(),
            kind,
            delta,
            source_ref: &req.source_ref,
            reason: req.reason.as_deref(),
        },
        &conditions,
        &ops,
    )?;
    if kind == "grant" {
        crate::durable_effects::dispatch_best_effort(seams, "credit-grant", &req.source_ref);
    }
    Ok(RouteResponse::ok(&json!({
        "subjectId": outcome.subject_id,
        "balanceCents": outcome.balance_cents,
        "applied": outcome.applied,
        "idempotent": !outcome.applied,
    })))
}

fn existing_move_time<S: HostSeams>(seams: &S, source_ref: &str) -> AppResult<Option<i64>> {
    let row = Db::new(seams, crate::ids::DB_ACCESS)
        .read_one(crate::ids::MODEL_CREDITS, &super::txn_key(source_ref))?;
    let Some(row) = row else {
        return Ok(None);
    };
    let txn: crate::models::CreditTxn = row.parse()?;
    crate::time::parse_iso(&txn.created_at)
        .map(Some)
        .ok_or_else(|| AppError::internal("stored credit transaction has an invalid createdAt"))
}

fn resolved_currency<S: HostSeams>(seams: &S, req: &MoveReq) -> AppResult<String> {
    if let Some(currency) = &req.currency {
        return super::validation::supplied_currency(currency);
    }
    let account = Db::new(seams, crate::ids::DB_ACCESS)
        .read_one(crate::ids::MODEL_CREDITS, &super::acct_key(&req.subject_id))?;
    match account {
        Some(row) => Ok(row.parse::<crate::models::CreditAccount>()?.currency),
        None => Ok(crate::money::DEFAULT_CURRENCY.to_string()),
    }
}
