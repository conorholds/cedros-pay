//! Resolves identity-bound program pricing for Individual checkout.

use serde_json::Value;

use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::seams::HostSeams;

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct ProgramPrice {
    pub(crate) program_handle: String,
    pub(crate) amount_cents: i64,
    pub(crate) currency: String,
}

pub(crate) fn active_for_subject<S: HostSeams>(
    seams: &S,
    subject_id: &str,
    interval: &str,
) -> AppResult<Option<ProgramPrice>> {
    let db = Db::new(seams, ids::DB_ACCESS);
    let membership_key = super::program_access::membership_key(subject_id);
    let Some(membership) = db.read_one(ids::MODEL_PROGRAM_ACCESS, &membership_key)? else {
        return Ok(None);
    };
    if membership.payload.get("status").and_then(Value::as_str) != Some("active")
        || expired(&membership.payload, seams.now_unix_secs())
    {
        return Ok(None);
    }
    let program_handle = required_string(&membership.payload, "programHandle")?;
    let program = db
        .read_one(ids::MODEL_CATALOG, program_handle)?
        .ok_or_else(program_unavailable)?;
    if program.payload.get("recordType").and_then(Value::as_str) != Some("programEntitlement")
        || program.payload.get("status").and_then(Value::as_str) != Some("active")
        || program.payload.get("accountModel").and_then(Value::as_str) != Some("individual")
        || program
            .payload
            .pointer("/pricing/configured")
            .and_then(Value::as_bool)
            != Some(true)
    {
        return Err(program_unavailable());
    }
    let period = if interval == "yearly" {
        "annual"
    } else {
        "monthly"
    };
    let amount_cents = program
        .payload
        .pointer(&format!("/pricing/{period}/unitAmountCents"))
        .and_then(Value::as_i64)
        .filter(|amount| *amount > 0)
        .ok_or_else(program_unavailable)?;
    let currency = program
        .payload
        .pointer("/pricing/currency")
        .and_then(Value::as_str)
        .filter(|currency| currency.len() == 3)
        .map(str::to_ascii_uppercase)
        .ok_or_else(program_unavailable)?;
    Ok(Some(ProgramPrice {
        program_handle: program_handle.to_string(),
        amount_cents,
        currency,
    }))
}

fn required_string<'a>(value: &'a Value, key: &str) -> AppResult<&'a str> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(program_unavailable)
}

fn expired(value: &Value, now: i64) -> bool {
    value
        .get("expiresAt")
        .and_then(Value::as_str)
        .and_then(crate::time::parse_iso)
        .is_some_and(|expires_at| expires_at <= now)
}

fn program_unavailable() -> AppError {
    AppError::new(
        503,
        "program_pricing_unavailable",
        "program pricing is temporarily unavailable",
    )
}
