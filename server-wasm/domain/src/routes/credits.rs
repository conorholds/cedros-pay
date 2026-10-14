//! `credits/v1` — the relying-party credit contract (audit §8).
//!
//! Consumers (giftcards et al.) read balances and credit/spend/hold against a
//! subject's balance. Grants and spends are **idempotent** on `sourceRef` and
//! every balance change is written with its audit/hold row in one guarded batch,
//! so concurrent callers cannot lose updates and a mid-flight kill cannot
//! half-apply. Mutation routes stay out of packaged discovery until every
//! money-path handler has adopted the guarded host contract.

use serde_json::json;

use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::models::CreditAccount;
use crate::money;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::{matches, verify_relying_party};
use crate::seams::HostSeams;
use crate::time;

#[path = "credits_hold_release.rs"]
mod hold_release;
#[path = "credits_holds.rs"]
mod holds;
#[path = "credits_move.rs"]
mod move_logic;
#[path = "credits_moves_api.rs"]
mod moves_api;
#[path = "credits_store.rs"]
mod store;
#[path = "credits_validation.rs"]
mod validation;

pub(crate) use moves_api::{apply_guarded_credit_move, CreditMove, CreditOutcome};

// Compatibility handler paths are intentionally absent from public discovery.
// Keep the physical-storefront guard bound to the exact same transport names.
pub(crate) const AUTHORIZE_PATH: &str = "/credits/v1/authorize";
pub(crate) const HOLD_PATH: &str = "/credits/v1/hold";

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ids::ROUTE_CREDITS_BALANCE,
    method: "GET",
    path: "/credits/v1/balance",
}];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    crate::native_storefront_policy::require_request(seams, req)?;
    verify_relying_party(seams, req)?;
    if matches(req, "GET", "/credits/v1/balance") {
        balance(seams, req)
    } else if matches(req, "POST", "/credits/v1/grant") {
        moves_api::grant(seams, req)
    } else if matches(req, "POST", AUTHORIZE_PATH) {
        moves_api::authorize(seams, req)
    } else if matches(req, "POST", HOLD_PATH) {
        holds::hold(seams, req)
    } else if matches(req, "POST", "/credits/v1/release") {
        hold_release::release(seams, req)
    } else {
        Err(AppError::not_found("unknown credits route"))
    }
}

fn acct_key(subject: &str) -> String {
    format!("acct:{subject}")
}
fn txn_key(source_ref: &str) -> String {
    format!("txn:{source_ref}")
}
pub(super) fn hold_key(hold_id: &str) -> String {
    format!("hold:{hold_id}")
}

fn load_account<S: HostSeams>(db: &Db<'_, S>, subject: &str) -> AppResult<Option<CreditAccount>> {
    let account = db
        .read_one(ids::MODEL_CREDITS, &acct_key(subject))?
        .map(|e| e.parse())
        .transpose()?;
    if account
        .as_ref()
        .is_some_and(|account: &CreditAccount| !account.valid_for(subject))
    {
        return Err(AppError::internal("stored credit account is invalid"));
    }
    Ok(account)
}

fn account_view(account: &CreditAccount) -> serde_json::Value {
    json!({
        "subjectId": account.subject_id,
        "balanceCents": account.balance_cents,
        "heldCents": account.held_cents,
        "availableCents": account.available_cents(),
        "currency": account.currency,
    })
}

fn balance<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let subject = req
        .query_value("subjectId")
        .ok_or_else(|| AppError::bad_request("subjectId is required"))?;
    validation::query_identifier(subject, "subjectId")?;
    let db = Db::new(seams, ids::DB_ACCESS);
    let account = load_account(&db, subject)?.unwrap_or_else(|| CreditAccount {
        subject_id: subject.to_string(),
        balance_cents: 0,
        held_cents: 0,
        currency: money::DEFAULT_CURRENCY.to_string(),
        updated_at: time::iso8601(seams.now_unix_secs()),
    });
    Ok(RouteResponse::ok(&account_view(&account)))
}

#[cfg(test)]
#[path = "credits_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "credits_guarded_tests.rs"]
mod guarded_tests;
