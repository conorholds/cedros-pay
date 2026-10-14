use serde::Deserialize;
use serde_json::{json, Map, Value};

use crate::error::{AppError, AppResult};
use crate::time;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ProgramInviteUpsertRequest {
    pub(crate) invite: ProgramInviteInput,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ProgramInviteInput {
    pub(crate) stable_handle: String,
    pub(crate) program_handle: String,
    pub(crate) subject_id: String,
    #[serde(default)]
    pub(crate) activation_code_sha256: Option<String>,
    pub(crate) status: String,
    #[serde(default)]
    pub(crate) expires_at: Option<String>,
    #[serde(default)]
    pub(crate) metadata: Map<String, Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ProgramMembershipUpsertRequest {
    pub(crate) membership: ProgramMembershipInput,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ProgramMembershipInput {
    pub(crate) subject_id: String,
    pub(crate) program_handle: String,
    pub(crate) status: String,
    #[serde(default)]
    pub(crate) expires_at: Option<String>,
    #[serde(default)]
    pub(crate) transition_plan_handle: Option<String>,
    #[serde(default)]
    pub(crate) metadata: Map<String, Value>,
}

pub(crate) fn program_invite_value(
    input: ProgramInviteInput,
    existing: Option<&Value>,
    now: i64,
) -> AppResult<Value> {
    super::validate_handle(&input.stable_handle, "invite stableHandle")?;
    super::validate_handle(&input.program_handle, "invite programHandle")?;
    validate_subject(&input.subject_id)?;
    validate_access_status(&input.status, true)?;
    validate_optional_iso(input.expires_at.as_deref(), "invite expiresAt")?;
    super::validate_metadata(&input.metadata)?;
    ensure_invite_binding(existing, &input)?;
    let code_hash = input
        .activation_code_sha256
        .or_else(|| string(existing, "activationCodeSha256"))
        .ok_or_else(|| AppError::unprocessable("new invites require activationCodeSha256"))?;
    validate_sha256(&code_hash, "activationCodeSha256")?;
    if string(existing, "status").as_deref() == Some("redeemed") && input.status != "revoked" {
        return Err(AppError::conflict(
            "redeemed invites may only transition to revoked",
        ));
    }
    let created_at = existing
        .and_then(|value| value.get("createdAt"))
        .cloned()
        .unwrap_or_else(|| Value::String(time::iso8601(now)));
    Ok(json!({
        "id": input.stable_handle,
        "stableHandle": input.stable_handle,
        "recordType": "programInvite",
        "schemaVersion": 1,
        "programHandle": input.program_handle,
        "subjectId": input.subject_id,
        "activationCodeSha256": code_hash,
        "status": input.status,
        "expiresAt": input.expires_at,
        "redeemedAt": existing.and_then(|value| value.get("redeemedAt")).cloned(),
        "redeemedBySubjectHash": existing
            .and_then(|value| value.get("redeemedBySubjectHash")).cloned(),
        "activationCodePurpose": "programEntitlementActivation",
        "referralCodePurpose": "customerReferralAttribution",
        "metadata": input.metadata,
        "createdAt": created_at,
        "updatedAt": time::iso8601(now),
    }))
}

fn ensure_invite_binding(existing: Option<&Value>, input: &ProgramInviteInput) -> AppResult<()> {
    if string(existing, "subjectId").is_some_and(|subject| subject != input.subject_id.as_str()) {
        return Err(AppError::conflict(
            "program invites cannot be transferred to another subject",
        ));
    }
    if string(existing, "programHandle")
        .is_some_and(|program| program != input.program_handle.as_str())
    {
        return Err(AppError::conflict(
            "program invites cannot be transferred to another program",
        ));
    }
    Ok(())
}

pub(crate) fn program_membership_value(
    input: ProgramMembershipInput,
    existing: Option<&Value>,
    now: i64,
) -> AppResult<Value> {
    validate_subject(&input.subject_id)?;
    super::validate_handle(&input.program_handle, "membership programHandle")?;
    validate_access_status(&input.status, false)?;
    validate_optional_iso(input.expires_at.as_deref(), "membership expiresAt")?;
    if let Some(handle) = input.transition_plan_handle.as_deref() {
        super::validate_handle(handle, "membership transitionPlanHandle")?;
    }
    super::validate_metadata(&input.metadata)?;
    if string(existing, "status").as_deref() == Some("active")
        && string(existing, "programHandle")
            .is_some_and(|program| program != input.program_handle.as_str())
        && input.status == "active"
    {
        return Err(AppError::conflict(
            "active program memberships must be revoked before changing programs",
        ));
    }
    let created_at = existing
        .and_then(|value| value.get("createdAt"))
        .cloned()
        .unwrap_or_else(|| Value::String(time::iso8601(now)));
    Ok(json!({
        "recordType": "programMembership",
        "schemaVersion": 1,
        "subjectId": input.subject_id,
        "programHandle": input.program_handle,
        "status": input.status,
        "active": input.status == "active",
        "expiresAt": input.expires_at,
        "transitionPlanHandle": input.transition_plan_handle,
        "onePricingEntitlementAtATime": true,
        "stackable": false,
        "discountsBusiness": false,
        "discountsAddOns": false,
        "metadata": input.metadata,
        "createdAt": created_at,
        "updatedAt": time::iso8601(now),
    }))
}

fn string(value: Option<&Value>, key: &str) -> Option<String> {
    value
        .and_then(|value| value.get(key))
        .and_then(Value::as_str)
        .map(str::to_string)
}

fn validate_access_status(status: &str, invite: bool) -> AppResult<()> {
    matches!(status, "active" | "revoked" | "expired")
        .then_some(())
        .ok_or_else(|| {
            AppError::unprocessable(if invite {
                "invite status must be active, revoked, or expired"
            } else {
                "membership status must be active, revoked, or expired"
            })
        })
}

fn validate_subject(value: &str) -> AppResult<()> {
    let value = value.trim();
    if value.is_empty() || value.len() > 240 || value.chars().any(char::is_control) {
        Err(AppError::unprocessable(
            "subjectId must be between 1 and 240 safe characters",
        ))
    } else {
        Ok(())
    }
}

fn validate_sha256(value: &str, label: &str) -> AppResult<()> {
    if value.len() == 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    {
        Ok(())
    } else {
        Err(AppError::unprocessable(format!(
            "{label} must be a lowercase SHA-256 digest"
        )))
    }
}

fn validate_optional_iso(value: Option<&str>, label: &str) -> AppResult<()> {
    if value.is_some_and(|value| value.len() > 64 || time::parse_iso(value).is_none()) {
        Err(AppError::unprocessable(format!(
            "{label} must be a valid ISO-8601 timestamp"
        )))
    } else {
        Ok(())
    }
}
