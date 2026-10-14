use super::SESSION_MODEL;
use crate::{
    ctx::RequestContext,
    db::{BatchOp, Db, EntryRecord},
    error::{AppError, AppResult},
    guarded_batch::{GuardedBatchOutcome, GuardedCondition},
    seams::HostSeams,
};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub(crate) use crate::checkout_contract::UcpSessionAuthority as SessionAuthority;
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Session {
    pub id: String,
    pub owner: String,
    pub site: String,
    pub environment: String,
    pub revision: u64,
    pub created_at: i64,
    pub expires_at: i64,
    pub quote_body: String,
    pub preview: crate::checkout_contract::AuthoritativeQuoteSnapshot,
    pub state: String,
    pub operation_id: Option<String>,
    pub return_artifact: Option<String>,
}
pub(super) fn digest(value: &str) -> String {
    hex::encode(Sha256::digest(value.as_bytes()))
}
pub(super) fn mac<S: HostSeams>(seams: &S, parts: &[&str]) -> AppResult<String> {
    let secret = seams
        .secret_get(crate::ids::SECRET_CHECKOUT_CONTEXT_MAC)?
        .filter(|s| s.len() >= 32)
        .ok_or_else(|| {
            AppError::new(
                503,
                "checkout_privacy_key_unavailable",
                "checkout privacy key is unavailable",
            )
        })?;
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes())
        .map_err(|_| AppError::internal("invalid checkout privacy key"))?;
    mac.update(b"cedros-pay-ucp-v1\0");
    for part in parts {
        mac.update(&(part.len() as u64).to_be_bytes());
        mac.update(part.as_bytes());
    }
    Ok(hex::encode(mac.finalize().into_bytes()))
}
pub(super) fn scope(context: &RequestContext) -> AppResult<(&str, &str)> {
    let site = context.require_site_id()?;
    let environment = context
        .environment
        .as_deref()
        .filter(|s| !s.is_empty())
        .ok_or_else(|| {
            AppError::new(
                503,
                "checkout_scope_unavailable",
                "trusted checkout environment is unavailable",
            )
        })?;
    Ok((site, environment))
}
pub(super) fn new_authority(
    context: &RequestContext,
    platform: &super::auth::VerifiedPlatform,
    id: &str,
) -> AppResult<SessionAuthority> {
    let (site, environment) = scope(context)?;
    Ok(SessionAuthority::from_verified_scope(digest(
        &serde_json::json!([site, environment, platform.profile(), id]).to_string(),
    )))
}
pub(super) fn authorize(
    session: &Session,
    context: &RequestContext,
    platform: &super::auth::VerifiedPlatform,
) -> AppResult<SessionAuthority> {
    same_site(session, context)?;
    if session.owner != platform.profile() {
        return Err(AppError::not_found("checkout session was not found"));
    }
    Ok(authority(session))
}
pub(super) fn authorize_handoff<S: HostSeams>(
    seams: &S,
    session: &Session,
    context: &RequestContext,
    token: &str,
) -> AppResult<SessionAuthority> {
    same_site(session, context)?;
    let expected = handoff_token(seams, session)?;
    // Compare fixed-length MACs without a data-dependent early exit.
    if token.len() != expected.len()
        || token
            .bytes()
            .zip(expected.bytes())
            .fold(0u8, |a, (x, y)| a | (x ^ y))
            != 0
    {
        return Err(AppError::not_found("checkout session was not found"));
    }
    Ok(authority(session))
}
fn same_site(session: &Session, context: &RequestContext) -> AppResult<()> {
    let (site, environment) = scope(context)?;
    if session.site != site || session.environment != environment {
        return Err(AppError::not_found("checkout session was not found"));
    }
    Ok(())
}
fn authority(session: &Session) -> SessionAuthority {
    SessionAuthority::from_verified_scope(digest(
        &serde_json::json!([session.site, session.environment, session.owner, session.id])
            .to_string(),
    ))
}

pub(super) fn handoff_token<S: HostSeams>(seams: &S, session: &Session) -> AppResult<String> {
    mac(
        seams,
        &[
            "handoff",
            &session.site,
            &session.environment,
            &session.id,
            &session.revision.to_string(),
        ],
    )
}
pub(super) fn load<S: HostSeams>(seams: &S, id: &str) -> AppResult<(EntryRecord, Session)> {
    let entry = Db::new(seams, crate::ids::DB_ACCESS)
        .read_one(SESSION_MODEL, id)?
        .ok_or_else(|| AppError::not_found("checkout session was not found"))?;
    let session: Session = entry.parse()?;
    if session.id != id {
        return Err(AppError::internal("invalid stored checkout identity"));
    }
    Ok((entry, session))
}
pub(super) fn version(entry: &EntryRecord) -> AppResult<GuardedCondition> {
    Ok(GuardedCondition::Version {
        content_model_id: SESSION_MODEL,
        entry_key: entry.entry_key.clone(),
        expected_version: entry
            .version
            .clone()
            .filter(|v| !v.is_empty())
            .ok_or_else(|| AppError::internal("checkout revision is missing"))?,
    })
}
pub(super) fn write(session: &Session) -> AppResult<BatchOp> {
    Ok(BatchOp::Write {
        content_model_id: SESSION_MODEL,
        entry_key: session.id.clone(),
        data: serde_json::to_value(session)
            .map_err(|_| AppError::internal("cannot encode checkout session"))?,
    })
}
pub(super) fn save<S: HostSeams>(
    seams: &S,
    entry: &EntryRecord,
    session: &Session,
) -> AppResult<()> {
    if matches!(
        Db::new(seams, crate::ids::DB_ACCESS)
            .guarded_batch(&[version(entry)?], &[write(session)?])?,
        GuardedBatchOutcome::Applied { .. }
    ) {
        Ok(())
    } else {
        Err(AppError::conflict(
            "checkout session changed; retry the request",
        ))
    }
}
pub(super) fn live<S: HostSeams>(seams: &S, session: &Session) -> AppResult<()> {
    if seams.now_unix_secs() >= session.expires_at {
        return Err(AppError::new(
            410,
            "checkout_expired",
            "checkout session has expired",
        ));
    }
    if session.state == "canceled" {
        return Err(AppError::conflict("checkout session is canceled"));
    }
    Ok(())
}
