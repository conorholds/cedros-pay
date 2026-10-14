use crate::checkout_contract::inventory_admin::{ActorClass, AuditIdentity};
use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::reqresp::RouteRequest;

const MAX_OPERATION_ID: usize = 200;
const MAX_REASON: usize = 80;

/// Builds audit material without persisting the host actor id or auth context.
pub(crate) fn identity(
    req: &RouteRequest,
    ctx: &RequestContext,
    default_reason: &str,
) -> AppResult<AuditIdentity> {
    let operation_id = ctx
        .idempotency_key
        .as_deref()
        .or_else(|| req.header("Idempotency-Key"))
        .or(ctx.request_id.as_deref())
        .ok_or_else(|| AppError::bad_request("an inventory operation id is required"))?;
    if operation_id.is_empty()
        || operation_id.len() > MAX_OPERATION_ID
        || !operation_id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':'))
    {
        return Err(AppError::bad_request(
            "inventory operation id must be 1-200 safe ASCII characters",
        ));
    }
    let body = req.json_body()?;
    let reason = body
        .get("reason")
        .and_then(serde_json::Value::as_str)
        .unwrap_or(default_reason);
    if reason.is_empty()
        || reason.len() > MAX_REASON
        || !reason
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'))
    {
        return Err(AppError::bad_request(
            "reason must be a 1-80 character safe reason code",
        ));
    }
    Ok(AuditIdentity {
        operation_id: operation_id.into(),
        actor: if ctx.is_system_admin() {
            ActorClass::SystemAdmin
        } else {
            ActorClass::ExtensionAdmin
        },
        reason: Some(reason.into()),
    })
}
