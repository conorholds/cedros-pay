//! Guarded credit-hold release.
//!
//! A release that loses to an already-terminal hold is idempotent. If the hold
//! remains held but either revision is stale, callers receive 409 and must retry.

use serde::Deserialize;
use serde_json::json;

use super::{acct_key, hold_key, store, validation};
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedBatchOutcome;
use crate::ids;
use crate::models::{CreditAccount, CreditHold};
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;
use crate::time;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReleaseReq {
    hold_id: String,
}

pub(super) fn release<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let body: ReleaseReq = serde_json::from_value(req.json_body()?).map_err(|error| {
        AppError::unprocessable("invalid request body").with_internal(error.to_string())
    })?;
    validation::identifier(&body.hold_id, "holdId")?;
    let db = Db::new(seams, ids::DB_ACCESS);
    let key = hold_key(&body.hold_id);
    let mut hold = store::read::<_, CreditHold>(&db, &key)?
        .ok_or_else(|| AppError::not_found("no such hold"))?;
    if hold.value.hold_id != body.hold_id
        || hold.value.amount_cents <= 0
        || !matches!(hold.value.status.as_str(), "held" | "released" | "captured")
        || crate::money::normalize_currency(&hold.value.currency) != hold.value.currency
    {
        return Err(AppError::internal("stored credit hold is invalid"));
    }
    if hold.value.status != "held" {
        return Ok(response(&hold.value, true));
    }
    release_held(&db, seams.now_unix_secs(), key, &mut hold)
}

fn release_held<S: HostSeams>(
    db: &Db<'_, S>,
    now: i64,
    hold_key: String,
    hold: &mut store::Versioned<CreditHold>,
) -> AppResult<RouteResponse> {
    let account_key = acct_key(&hold.value.subject_id);
    let mut account = store::read::<_, CreditAccount>(db, &account_key)?
        .ok_or_else(|| AppError::internal("hold references a missing account"))?;
    if !account.value.valid_for(&hold.value.subject_id)
        || hold.value.amount_cents <= 0
        || hold.value.currency != account.value.currency
    {
        return Err(AppError::internal(
            "stored credit hold or account is invalid",
        ));
    }
    account.value.held_cents = account
        .value
        .held_cents
        .checked_sub(hold.value.amount_cents)
        .filter(|held| *held >= 0)
        .ok_or_else(|| AppError::internal("credit hold exceeds the account held balance"))?;
    account.value.updated_at = time::iso8601(now);
    hold.value.status = "released".to_string();
    let conditions = [
        store::condition(&hold_key, Some(hold)),
        store::condition(&account_key, Some(&account)),
    ];
    let ops = [
        store::write(account_key, &account.value)?,
        store::write(hold_key.clone(), &hold.value)?,
    ];
    match db.guarded_batch(&conditions, &ops)? {
        GuardedBatchOutcome::Applied { .. } => Ok(response(&hold.value, false)),
        GuardedBatchOutcome::Conflict { .. } => conflict(db, &hold_key),
    }
}

fn conflict<S: HostSeams>(db: &Db<'_, S>, hold_key: &str) -> AppResult<RouteResponse> {
    let current = store::read::<_, CreditHold>(db, hold_key)?
        .ok_or_else(|| AppError::conflict("credit hold changed while releasing; retry"))?;
    if current.value.status == "held" {
        return Err(AppError::conflict(
            "credit account changed while releasing hold; retry",
        ));
    }
    Ok(response(&current.value, true))
}

fn response(hold: &CreditHold, idempotent: bool) -> RouteResponse {
    RouteResponse::ok(&json!({
        "holdId": hold.hold_id,
        "status": hold.status,
        "idempotent": idempotent,
    }))
}
