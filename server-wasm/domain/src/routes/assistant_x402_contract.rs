use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::RouteResponse;

pub(super) const ACTION: &str = "cedros.monetization.x402.purchase";
pub(super) const BOUNDARY: &str = "cedros_pay_x402_purchase";
pub(super) const ASSISTANT_ID: &str = "ai-assistant";
pub(super) const WALLET_PURPOSE: &str = "site-assistant";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct PurchaseIntent {
    pub(super) resource_url: String,
    pub(super) max_amount_microunits: Option<u64>,
}

pub(super) struct TrustedPurchaseContext {
    pub(super) run_id: String,
    pub(super) request_id: String,
    pub(super) idempotency_key: String,
    pub(super) authorized_max_amount_microunits: Option<u64>,
    pub(super) confirmation_verified: bool,
}

pub(super) fn authenticate(context: &RequestContext) -> AppResult<TrustedPurchaseContext> {
    if !context.authenticated {
        return Err(AppError::unauthorized(
            "authenticated server context is required",
        ));
    }
    let capability = context.auth_scheme.as_deref() == Some("bearer-token")
        && context
            .capability_claims
            .iter()
            .any(|claim| claim == ids::ROUTE_ASSISTANT_X402_PURCHASE);
    if !capability
        || context.assistant_id.as_deref() != Some(ASSISTANT_ID)
        || context.assistant_action.as_deref() != Some(ACTION)
    {
        return Err(AppError::forbidden(
            "the exact Site Assistant purchase capability is required",
        ));
    }
    Ok(TrustedPurchaseContext {
        run_id: trusted_id(context.run_id.as_deref(), "runId", 255)?,
        request_id: trusted_id(context.request_id.as_deref(), "requestId", 255)?,
        idempotency_key: trusted_idempotency_key(context.idempotency_key.as_deref())?,
        authorized_max_amount_microunits: context.authorized_max_amount_microunits,
        confirmation_verified: context.confirmation_verified,
    })
}

fn trusted_id(value: Option<&str>, field: &str, maximum_bytes: usize) -> AppResult<String> {
    let value = value.unwrap_or_default();
    if value.is_empty()
        || value.len() > maximum_bytes
        || value != value.trim()
        || value.chars().any(char::is_control)
    {
        return Err(AppError::forbidden(format!(
            "authenticated server context requires {field}"
        )));
    }
    Ok(value.to_string())
}

fn trusted_idempotency_key(value: Option<&str>) -> AppResult<String> {
    let value = trusted_id(value, "idempotencyKey", 240)?;
    if value.len() < 16
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-' | b':' | b'.'))
    {
        return Err(AppError::forbidden(
            "authenticated server context requires idempotencyKey",
        ));
    }
    Ok(value)
}

pub(super) fn validate_resource_url(value: &str) -> AppResult<String> {
    let trimmed = value.trim();
    if value != trimmed
        || !(12..=2_048).contains(&value.len())
        || !value.is_ascii()
        || !value.starts_with("https://")
        || value.contains('#')
        || value.chars().any(char::is_control)
    {
        return Err(AppError::unprocessable(
            "resourceUrl must be a bounded HTTPS URL without a fragment",
        ));
    }
    let authority = value[8..].split(['/', '?']).next().unwrap_or_default();
    if authority.is_empty()
        || authority.contains('@')
        || authority.starts_with('.')
        || authority.ends_with('.')
        || !public_https_authority(authority)
    {
        return Err(AppError::unprocessable(
            "resourceUrl must contain a public HTTPS host",
        ));
    }
    Ok(value.to_string())
}

fn public_https_authority(authority: &str) -> bool {
    let (host, port) = authority
        .rsplit_once(':')
        .map_or((authority, None), |(host, port)| (host, Some(port)));
    if port.is_some_and(|port| port != "443")
        || host.len() > 253
        || !host.contains('.')
        || host.eq_ignore_ascii_case("localhost")
    {
        return false;
    }
    host.split('.').all(|label| {
        !label.is_empty()
            && label.len() <= 63
            && !label.starts_with('-')
            && !label.ends_with('-')
            && !label
                .get(..4)
                .is_some_and(|prefix| prefix.eq_ignore_ascii_case("xn--"))
            && label
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
    }) && host
        .rsplit('.')
        .next()
        .is_some_and(|label| label.bytes().any(|byte| byte.is_ascii_alphabetic()))
}

pub(super) fn response(
    target: &str,
    output: Value,
    is_error: bool,
    replayed: bool,
) -> RouteResponse {
    RouteResponse::ok(&json!({
        "boundary": BOUNDARY,
        "target": target,
        "output": output,
        "isError": is_error,
        "replayed": replayed,
        "rollback": Value::Null,
    }))
}

pub(super) fn failure(status: &str, message: &str, failure_code: Option<&str>) -> Value {
    let mut output = json!({"status": status, "message": message});
    if let Some(code) = failure_code {
        output["failureCode"] = Value::String(code.to_string());
    }
    output
}

pub(super) fn payer_output(
    status: &str,
    message: &str,
    payer_public_key: &str,
    cluster: &str,
) -> Value {
    json!({
        "status": status,
        "message": message,
        "assistantId": ASSISTANT_ID,
        "walletPurpose": WALLET_PURPOSE,
        "payerPublicKey": payer_public_key,
        "cluster": cluster,
    })
}

pub(super) fn success_output(
    target: &str,
    payer_public_key: &str,
    cluster: &str,
    signature: &str,
    policy_decision_id: Option<&str>,
    confirmation: &str,
) -> Value {
    let mut output = payer_output(
        "confirmed",
        "The Site Assistant x402 purchase was confirmed.",
        payer_public_key,
        cluster,
    );
    output["transactionResult"] = json!({
        "status": confirmation,
        "signature": signature,
    });
    if let Some(policy) = policy_decision_id.filter(|value| !value.trim().is_empty()) {
        output["policyDecisionId"] = Value::String(policy.to_string());
    }
    let request_target_digest = target_binding_digest(target);
    let state_digest = digest_json(&json!({
        "status": confirmation,
        "signature": signature,
        "target": target,
    }));
    output["postcondition"] = json!({
        "verified": true,
        "target": target,
        "request_target_digest": request_target_digest,
        "state_digest": state_digest,
        "status": "completed",
    });
    output
}

fn target_binding_digest(target: &str) -> String {
    let encoded = serde_json::to_vec(target).expect("string serializes");
    let mut digest = Sha256::new();
    digest.update(b"cedros.tool-target-binding.v1");
    digest.update(0_u32.to_be_bytes());
    digest.update((encoded.len() as u64).to_be_bytes());
    digest.update(encoded);
    format!("sha256:{:x}", digest.finalize())
}

pub(super) fn digest_json(value: &Value) -> String {
    let encoded = serde_json::to_vec(value).unwrap_or_default();
    format!("sha256:{:x}", Sha256::digest(encoded))
}

#[cfg(test)]
mod tests {
    use super::validate_resource_url;

    #[test]
    fn resource_urls_reject_local_and_nonstandard_port_targets() {
        for url in [
            "https://localhost/resource",
            "https://127.0.0.1/resource",
            "https://169.254.169.254/latest/meta-data",
            "https://internal/resource",
            "https://XN--shop-9za.example/resource",
            "https://merchant.example:8443/resource",
            "https://user@merchant.example/resource",
        ] {
            assert!(validate_resource_url(url).is_err(), "accepted {url}");
        }
        assert_eq!(
            validate_resource_url("https://merchant.example:443/resource").unwrap(),
            "https://merchant.example:443/resource"
        );
    }
}
