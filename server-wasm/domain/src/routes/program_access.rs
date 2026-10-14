//! Identity-bound special-program activation and status reads.
//!
//! Activation codes are high-entropy secrets supplied by an approved
//! participant. Pay stores and compares only SHA-256 digests. Referral codes
//! are not accepted by these routes and never share this storage model.

use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::auth;
use crate::db::{BatchOp, Db, Dir, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::matches;
use crate::seams::HostSeams;

const PAGE_SIZE: i64 = 100;
const MAX_RECORDS: usize = 10_000;
const MAX_CODE_LEN: usize = 256;

pub const ROUTES: &[RouteSpec] = &[
    RouteSpec {
        route_id: ids::ROUTE_PROGRAM_ACTIVATE,
        method: "POST",
        path: "/programs/v1/activate",
    },
    RouteSpec {
        route_id: ids::ROUTE_PROGRAM_STATUS,
        method: "GET",
        path: "/programs/v1/status",
    },
];

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ActivateRequest {
    activation_code: String,
}

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if matches(req, "POST", "/programs/v1/activate") {
        return activate(seams, req);
    }
    if matches(req, "GET", "/programs/v1/status") {
        return status(seams, req);
    }
    Err(AppError::not_found("unknown program access route"))
}

fn activate<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let buyer = auth::verify_buyer(seams, req)?;
    crate::guarded_policy::require_active(seams)?;
    let body: ActivateRequest = serde_json::from_value(req.json_body()?).map_err(|error| {
        AppError::unprocessable("invalid activation request").with_internal(error.to_string())
    })?;
    let code = body.activation_code.trim();
    if code.len() < 16 || code.len() > MAX_CODE_LEN || code.chars().any(char::is_control) {
        return Err(invalid_code());
    }
    let code_hash = hex::encode(Sha256::digest(code.as_bytes()));
    let invite = find_invite(seams, &code_hash)?.ok_or_else(invalid_code)?;
    let invite_subject = string_field(&invite.payload, "subjectId").ok_or_else(invalid_code)?;
    if invite_subject != buyer.user_id {
        return Err(invalid_code());
    }
    let program_handle = string_field(&invite.payload, "programHandle")
        .ok_or_else(|| AppError::internal("program invite is missing programHandle"))?;
    let program = require_active_program(seams, program_handle)?;
    if expired(&invite.payload, seams.now_unix_secs()) {
        return Err(AppError::unprocessable(
            "program activation code has expired",
        ));
    }

    let membership_id = membership_key(&buyer.user_id);
    let db = Db::new(seams, ids::DB_ACCESS);
    let existing_membership = db.read_one(ids::MODEL_PROGRAM_ACCESS, &membership_id)?;
    if invite.payload.get("status").and_then(Value::as_str) == Some("redeemed") {
        if existing_membership.as_ref().is_some_and(|record| {
            record.payload.get("status").and_then(Value::as_str) == Some("active")
                && string_field(&record.payload, "programHandle") == Some(program_handle)
        }) {
            let occurred_at = invite
                .payload
                .get("redeemedAt")
                .and_then(Value::as_str)
                .and_then(crate::time::parse_iso)
                .ok_or_else(|| AppError::internal("redeemed invite has an invalid redeemedAt"))?;
            crate::durable_effects::ensure(
                &db,
                "program-activation",
                &invite.entry_key,
                vec![crate::routes::entitlements::changed_action(
                    "program_activated",
                    Some(&buyer.user_id),
                    Some(program_handle),
                    Some(&membership_id),
                    None,
                    occurred_at,
                )],
                occurred_at,
            )?;
            crate::durable_effects::dispatch_best_effort(
                seams,
                "program-activation",
                &invite.entry_key,
            );
            return Ok(activation_response(
                false,
                program_handle,
                &membership_id,
                &invite.payload,
            ));
        }
        return Err(invalid_code());
    }
    if invite.payload.get("status").and_then(Value::as_str) != Some("active") {
        return Err(invalid_code());
    }
    if existing_membership.as_ref().is_some_and(|record| {
        record.payload.get("status").and_then(Value::as_str) == Some("active")
            && string_field(&record.payload, "programHandle") != Some(program_handle)
    }) {
        return Err(AppError::conflict(
            "another program pricing entitlement is already active",
        ));
    }

    let now = seams.now_unix_secs();
    let mut redeemed_invite = invite.payload.clone();
    redeemed_invite["status"] = json!("redeemed");
    redeemed_invite["redeemedAt"] = json!(crate::time::iso8601(now));
    redeemed_invite["redeemedBySubjectHash"] = json!(subject_hash(&buyer.user_id));
    redeemed_invite["updatedAt"] = json!(crate::time::iso8601(now));
    let membership_expires_at = membership_expiry(
        &program,
        invite
            .payload
            .get("expiresAt")
            .cloned()
            .unwrap_or(Value::Null),
        now,
    );
    let membership = membership_value(
        &buyer.user_id,
        program_handle,
        membership_expires_at,
        &program,
        existing_membership.as_ref().map(|record| &record.payload),
        now,
    );
    let mut conditions = vec![
        version_condition(ids::MODEL_PROGRAM_ACCESS, &invite)?,
        match existing_membership.as_ref() {
            Some(record) => version_condition(ids::MODEL_PROGRAM_ACCESS, record)?,
            None => GuardedCondition::Absent {
                content_model_id: ids::MODEL_PROGRAM_ACCESS,
                entry_key: membership_id.clone(),
            },
        },
    ];
    let mut ops = vec![
        BatchOp::Write {
            content_model_id: ids::MODEL_PROGRAM_ACCESS,
            entry_key: invite.entry_key.clone(),
            data: redeemed_invite,
        },
        BatchOp::Write {
            content_model_id: ids::MODEL_PROGRAM_ACCESS,
            entry_key: membership_id.clone(),
            data: membership,
        },
    ];
    let actions = vec![crate::routes::entitlements::changed_action(
        "program_activated",
        Some(&buyer.user_id),
        Some(program_handle),
        Some(&membership_id),
        None,
        now,
    )];
    let effect_id = if let Some(effect) =
        crate::durable_effects::plan("program-activation", &invite.entry_key, actions, now)?
    {
        let effect_id = Some(effect.effect_id.clone());
        conditions.push(effect.condition);
        ops.push(effect.op);
        effect_id
    } else {
        None
    };
    if matches!(
        db.guarded_batch(&conditions, &ops)?,
        GuardedBatchOutcome::Conflict { .. }
    ) {
        return Err(AppError::conflict(
            "program activation changed concurrently; retry",
        ));
    }
    if let Some(effect_id) = effect_id {
        crate::durable_effects::dispatch_effect_best_effort(seams, &effect_id);
    }
    let stored = db
        .read_one(ids::MODEL_PROGRAM_ACCESS, &membership_id)?
        .ok_or_else(|| AppError::internal("program membership could not be read back"))?;
    Ok(activation_response(
        existing_membership.is_none(),
        program_handle,
        &membership_id,
        &stored.payload,
    ))
}

fn status<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let buyer = auth::verify_buyer(seams, req)?;
    let membership_id = membership_key(&buyer.user_id);
    let membership =
        Db::new(seams, ids::DB_ACCESS).read_one(ids::MODEL_PROGRAM_ACCESS, &membership_id)?;
    let Some(membership) = membership else {
        return Ok(RouteResponse::ok(
            &json!({"active":false,"membership":null}),
        ));
    };
    let active = membership.payload.get("status").and_then(Value::as_str) == Some("active")
        && !expired(&membership.payload, seams.now_unix_secs());
    Ok(RouteResponse::ok(&json!({
        "active": active,
        "membership": {
            "id": membership.entry_key,
            "programHandle": membership.payload.get("programHandle"),
            "status": if active { "active" } else { membership.payload
                .get("status").and_then(Value::as_str).unwrap_or("expired") },
            "expiresAt": membership.payload.get("expiresAt"),
            "transitionPlanHandle": membership.payload.get("transitionPlanHandle"),
        }
    })))
}

fn find_invite<S: HostSeams>(
    seams: &S,
    code_hash: &str,
) -> AppResult<Option<crate::db::EntryRecord>> {
    let records = Db::new(seams, ids::DB_ACCESS).read_paged(
        ids::MODEL_PROGRAM_ACCESS,
        &Query::new()
            .filter(Filter::new("recordType", Op::Eq, "programInvite"))
            .order("updatedAt", Dir::Desc),
        PAGE_SIZE,
        (MAX_RECORDS / PAGE_SIZE as usize) + 1,
    )?;
    if records.len() > MAX_RECORDS {
        return Err(AppError::unprocessable(
            "program invite catalog exceeds bounded activation scan",
        ));
    }
    let mut matches = records.into_iter().filter(|record| {
        record
            .payload
            .get("activationCodeSha256")
            .and_then(Value::as_str)
            .is_some_and(|stored| constant_time_eq(stored.as_bytes(), code_hash.as_bytes()))
    });
    let first = matches.next();
    if matches.next().is_some() {
        return Err(AppError::conflict(
            "activation code is assigned to multiple program invites",
        ));
    }
    Ok(first)
}

fn require_active_program<S: HostSeams>(seams: &S, handle: &str) -> AppResult<Value> {
    let program = Db::new(seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_CATALOG, handle)?
        .ok_or_else(invalid_code)?;
    if program.payload.get("recordType").and_then(Value::as_str) != Some("programEntitlement")
        || program.payload.get("status").and_then(Value::as_str) != Some("active")
        || program
            .payload
            .pointer("/pricing/configured")
            .and_then(Value::as_bool)
            != Some(true)
    {
        return Err(invalid_code());
    }
    Ok(program.payload)
}

fn membership_value(
    subject_id: &str,
    program_handle: &str,
    expires_at: Value,
    program: &Value,
    existing: Option<&Value>,
    now: i64,
) -> Value {
    json!({
        "recordType": "programMembership",
        "schemaVersion": 1,
        "subjectId": subject_id,
        "programHandle": program_handle,
        "status": "active",
        "active": true,
        "expiresAt": expires_at,
        "transitionPlanHandle": program
            .pointer("/activation/eligibilityPolicy/fallbackPlanHandle")
            .cloned()
            .unwrap_or(Value::Null),
        "onePricingEntitlementAtATime": true,
        "stackable": false,
        "discountsBusiness": false,
        "discountsAddOns": false,
        "activationCodePurpose": "programEntitlementActivation",
        "referralCodePurpose": "customerReferralAttribution",
        "createdAt": existing.and_then(|value| value.get("createdAt")).cloned()
            .unwrap_or_else(|| json!(crate::time::iso8601(now))),
        "updatedAt": crate::time::iso8601(now),
    })
}

fn membership_expiry(program: &Value, invite_expiry: Value, now: i64) -> Value {
    if program
        .pointer("/activation/eligibilityPolicy/kind")
        .and_then(Value::as_str)
        != Some("monthlyQualifiedAffiliateSale")
    {
        return invite_expiry;
    }
    let monthly_deadline = now.saturating_add(30 * 24 * 60 * 60);
    let invite_deadline = invite_expiry.as_str().and_then(crate::time::parse_iso);
    json!(crate::time::iso8601(
        invite_deadline
            .map(|deadline| deadline.min(monthly_deadline))
            .unwrap_or(monthly_deadline)
    ))
}

fn activation_response(
    created: bool,
    program_handle: &str,
    membership_id: &str,
    value: &Value,
) -> RouteResponse {
    RouteResponse::ok(&json!({
        "activated": true,
        "created": created,
        "programHandle": program_handle,
        "membershipId": membership_id,
        "status": "active",
        "expiresAt": value.get("expiresAt"),
    }))
}

pub(crate) fn membership_key(subject_id: &str) -> String {
    format!("membership:{}", subject_hash(subject_id))
}

fn subject_hash(subject_id: &str) -> String {
    hex::encode(Sha256::digest(subject_id.as_bytes()))
}

fn version_condition(
    model: &'static str,
    record: &crate::db::EntryRecord,
) -> AppResult<GuardedCondition> {
    Ok(GuardedCondition::Version {
        content_model_id: model,
        entry_key: record.entry_key.clone(),
        expected_version: record
            .version
            .clone()
            .filter(|version| !version.is_empty())
            .ok_or_else(|| {
                AppError::internal("program access record is missing its version fence")
            })?,
    })
}

fn expired(value: &Value, now: i64) -> bool {
    value
        .get("expiresAt")
        .and_then(Value::as_str)
        .and_then(crate::time::parse_iso)
        .is_some_and(|expires_at| expires_at <= now)
}

fn string_field<'a>(value: &'a Value, key: &str) -> Option<&'a str> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    if left.len() != right.len() {
        return false;
    }
    left.iter()
        .zip(right)
        .fold(0_u8, |difference, (left, right)| {
            difference | (left ^ right)
        })
        == 0
}

fn invalid_code() -> AppError {
    AppError::unprocessable("program activation code is invalid or unavailable")
}

#[cfg(test)]
#[path = "program_access_tests.rs"]
mod tests;
