//! Guarded credit-hold creation.
//!
//! Exact `holdId` replays return the stored status. A differing fingerprint is
//! a conflict; an unrelated account-version conflict returns 409 for retry.

use serde::Deserialize;
use serde_json::json;

use super::{acct_key, hold_key, store, validation};
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedBatchOutcome;
use crate::ids;
use crate::models::{CreditAccount, CreditHold};
use crate::money;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;
use crate::time;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct HoldReq {
    subject_id: String,
    amount_cents: i64,
    #[serde(default)]
    currency: Option<String>,
    hold_id: String,
    #[serde(default)]
    expires_at: Option<serde_json::Value>,
}

pub(super) fn hold<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let body = parse_hold(req)?;
    let db = Db::new(seams, ids::DB_ACCESS);
    if let Some(response) = replay_hold(&db, &body)? {
        return Ok(response);
    }
    create_hold(&db, seams.now_unix_secs(), &body)
}

fn parse_hold(req: &RouteRequest) -> AppResult<HoldReq> {
    let body: HoldReq = serde_json::from_value(req.json_body()?).map_err(|error| {
        AppError::unprocessable("invalid request body").with_internal(error.to_string())
    })?;
    money::require_positive(body.amount_cents).map_err(AppError::unprocessable)?;
    validation::identifier(&body.subject_id, "subjectId")?;
    validation::identifier(&body.hold_id, "holdId")?;
    if body.expires_at.is_some() {
        return Err(AppError::unprocessable(
            "expiresAt is not supported; release the hold explicitly",
        ));
    }
    Ok(body)
}

fn replay_hold<S: HostSeams>(db: &Db<'_, S>, body: &HoldReq) -> AppResult<Option<RouteResponse>> {
    let currency = body
        .currency
        .as_deref()
        .map(validation::supplied_currency)
        .transpose()?;
    let Some(existing) = store::read::<_, CreditHold>(db, &hold_key(&body.hold_id))? else {
        return Ok(None);
    };
    let hold = existing.value;
    if hold.hold_id != body.hold_id
        || hold.amount_cents <= 0
        || !matches!(hold.status.as_str(), "held" | "released" | "captured")
        || crate::money::normalize_currency(&hold.currency) != hold.currency
    {
        return Err(AppError::internal("stored credit hold is invalid"));
    }
    let replay_currency = currency.as_deref().unwrap_or(&hold.currency);
    if hold.subject_id != body.subject_id
        || hold.amount_cents != body.amount_cents
        || hold.currency != replay_currency
    {
        return Err(AppError::conflict(
            "holdId was already used for a different credit hold",
        ));
    }
    Ok(Some(hold_response(&hold, true)))
}

fn create_hold<S: HostSeams>(db: &Db<'_, S>, now: i64, body: &HoldReq) -> AppResult<RouteResponse> {
    let account_key = acct_key(&body.subject_id);
    let Some(mut stored_account) = store::read::<_, CreditAccount>(db, &account_key)? else {
        return Err(AppError::new(
            402,
            "insufficient_funds",
            "no balance to hold against",
        ));
    };
    if !stored_account.value.valid_for(&body.subject_id) {
        return Err(AppError::internal("stored credit account is invalid"));
    }
    validate_hold_account(body, &stored_account.value)?;
    stored_account.value.held_cents = stored_account
        .value
        .held_cents
        .checked_add(body.amount_cents)
        .ok_or_else(|| AppError::unprocessable("credit hold total would overflow"))?;
    stored_account.value.updated_at = time::iso8601(now);
    let hold = new_hold(body, &stored_account.value, now);
    let hold_key = hold_key(&body.hold_id);
    let conditions = [
        store::condition::<CreditHold>(&hold_key, None),
        store::condition(&account_key, Some(&stored_account)),
    ];
    let ops = [
        store::write(account_key, &stored_account.value)?,
        store::write(hold_key, &hold)?,
    ];
    match db.guarded_batch(&conditions, &ops)? {
        GuardedBatchOutcome::Applied { .. } => Ok(hold_response(&hold, false)),
        GuardedBatchOutcome::Conflict { .. } => replay_hold(db, body)?
            .ok_or_else(|| AppError::conflict("credit account changed while creating hold; retry")),
    }
}

fn validate_hold_account(body: &HoldReq, account: &CreditAccount) -> AppResult<()> {
    let currency = body
        .currency
        .as_deref()
        .map(validation::supplied_currency)
        .transpose()?;
    if currency
        .as_deref()
        .is_some_and(|value| value != account.currency)
    {
        return Err(AppError::unprocessable(
            "currency does not match the account",
        ));
    }
    let available = account
        .balance_cents
        .checked_sub(account.held_cents)
        .ok_or_else(|| AppError::internal("credit account balance is invalid"))?;
    if available < body.amount_cents {
        return Err(AppError::new(
            402,
            "insufficient_funds",
            "insufficient available balance",
        ));
    }
    Ok(())
}

fn new_hold(body: &HoldReq, account: &CreditAccount, now: i64) -> CreditHold {
    CreditHold {
        hold_id: body.hold_id.clone(),
        subject_id: body.subject_id.clone(),
        amount_cents: body.amount_cents,
        currency: account.currency.clone(),
        status: "held".to_string(),
        created_at: time::iso8601(now),
    }
}

fn hold_response(hold: &CreditHold, idempotent: bool) -> RouteResponse {
    RouteResponse::ok(&json!({
        "holdId": hold.hold_id,
        "status": hold.status,
        "idempotent": idempotent,
    }))
}
