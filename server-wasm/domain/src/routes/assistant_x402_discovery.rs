use serde::Deserialize;
use serde_json::{json, Value};

use crate::blockchain_config::AssistantX402Control;
use crate::seams::HostSeams;
use crate::stripe::api::unwrap_fetch;
use crate::x402::{ata, pubkey, rpc};

const MAX_DISCOVERY_BYTES: usize = 64 * 1024;

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct Requirement {
    pub(super) scheme: String,
    pub(super) network: String,
    pub(super) amount: u64,
    pub(super) resource: String,
    pub(super) pay_to: String,
    pub(super) asset: String,
    pub(super) recipient_token_account: String,
    pub(super) decimals: u8,
    pub(super) memo: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct WireRequirement {
    scheme: String,
    network: String,
    max_amount_required: String,
    resource: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    mime_type: Option<String>,
    pay_to: String,
    max_timeout_seconds: u64,
    asset: String,
    extra: WireExtra,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct WireExtra {
    recipient_token_account: String,
    decimals: u8,
    memo: String,
    #[serde(default)]
    token_symbol: Option<String>,
}

pub(super) enum DiscoveryError {
    Invalid,
    Changed,
    Cluster,
    Budget,
    Transport,
}

pub(super) fn discover<S: HostSeams>(
    seams: &S,
    resource_url: &str,
    control: &AssistantX402Control,
    max_amount: u64,
    expected_digest: Option<&str>,
) -> Result<(Requirement, String), DiscoveryError> {
    let raw = seams
        .http_fetch(
            &json!({
                "method": "GET",
                "url": resource_url,
                "headers": [["accept", "application/json"]],
            })
            .to_string(),
        )
        .map_err(|_| DiscoveryError::Transport)?;
    let (status, body) = unwrap_fetch(&raw).map_err(|_| DiscoveryError::Invalid)?;
    if status != 402 || body.len() > MAX_DISCOVERY_BYTES {
        return Err(DiscoveryError::Invalid);
    }
    let value: Value = serde_json::from_str(&body).map_err(|_| DiscoveryError::Invalid)?;
    if value.get("x402Version").and_then(Value::as_u64) != Some(0) {
        return Err(DiscoveryError::Invalid);
    }
    let accepts = value
        .get("accepts")
        .and_then(Value::as_array)
        .filter(|values| !values.is_empty() && values.len() <= 16)
        .ok_or(DiscoveryError::Invalid)?;
    let solana = accepts
        .iter()
        .filter(|candidate| {
            candidate.get("scheme").and_then(Value::as_str) == Some("solana-spl-transfer")
        })
        .cloned()
        .collect::<Vec<_>>();
    if solana.len() != 1 {
        return Err(DiscoveryError::Invalid);
    }
    let wire: WireRequirement =
        serde_json::from_value(solana[0].clone()).map_err(|_| DiscoveryError::Invalid)?;
    if wire.network != control.cluster {
        return Err(DiscoveryError::Cluster);
    }
    let amount = wire
        .max_amount_required
        .parse::<u64>()
        .ok()
        .filter(|amount| *amount > 0)
        .ok_or(DiscoveryError::Invalid)?;
    if amount > max_amount {
        return Err(DiscoveryError::Budget);
    }
    if wire.resource != resource_url
        || wire.scheme != "solana-spl-transfer"
        || wire.max_timeout_seconds == 0
        || wire.max_timeout_seconds > 900
        || wire.extra.decimals > 9
        || wire.extra.memo.is_empty()
        || wire.extra.memo.len() > 256
        || wire.extra.memo.chars().any(char::is_control)
        || pubkey::parse(&wire.pay_to).is_err()
        || pubkey::parse(&wire.asset).is_err()
        || pubkey::parse(&wire.extra.recipient_token_account).is_err()
        || !control
            .allowed_token_mints
            .iter()
            .any(|mint| mint == &wire.asset)
        || ata::derive_token_account(&wire.pay_to, &wire.asset)
            .ok()
            .as_deref()
            != Some(wire.extra.recipient_token_account.as_str())
        || wire
            .description
            .as_deref()
            .is_some_and(|value| value.len() > 2_000)
        || wire
            .mime_type
            .as_deref()
            .is_some_and(|value| value.len() > 256)
        || wire
            .extra
            .token_symbol
            .as_deref()
            .is_some_and(|value| value.len() > 32)
        || crate::x402::config::validate_payment_asset(
            &wire.network,
            &wire.asset,
            wire.extra.decimals,
            wire.extra.token_symbol.as_deref(),
        )
        .is_err()
    {
        return Err(DiscoveryError::Invalid);
    }
    let requirement = Requirement {
        scheme: wire.scheme,
        network: wire.network,
        amount,
        resource: wire.resource,
        pay_to: wire.pay_to,
        asset: wire.asset,
        recipient_token_account: wire.extra.recipient_token_account,
        decimals: wire.extra.decimals,
        memo: wire.extra.memo,
    };
    let digest = requirement_digest(&requirement);
    if expected_digest.is_some_and(|expected| expected != digest) {
        return Err(DiscoveryError::Changed);
    }
    Ok((requirement, digest))
}

pub(super) fn requirement_digest(requirement: &Requirement) -> String {
    super::contract::digest_json(&json!({
        "scheme": requirement.scheme,
        "network": requirement.network,
        "amount": requirement.amount,
        "resource": requirement.resource,
        "payTo": requirement.pay_to,
        "asset": requirement.asset,
        "recipientTokenAccount": requirement.recipient_token_account,
        "decimals": requirement.decimals,
        "memo": requirement.memo,
    }))
}

pub(super) fn check_funding<S: HostSeams>(
    seams: &S,
    control: &AssistantX402Control,
    requirement: &Requirement,
) -> Result<(), &'static str> {
    let source = ata::derive_token_account(&control.public_key, &requirement.asset)
        .map_err(|_| "funding_unavailable")?;
    let balance = rpc_call(
        seams,
        &control.rpc_url,
        "getBalance",
        json!([control.public_key, {"commitment":"confirmed"}]),
    )?;
    let lamports = balance
        .get("value")
        .and_then(Value::as_u64)
        .or_else(|| balance.as_u64())
        .ok_or("funding_unavailable")?;
    let token = rpc_call(
        seams,
        &control.rpc_url,
        "getTokenAccountBalance",
        json!([source, {"commitment":"confirmed"}]),
    )?;
    let amount = token
        .get("value")
        .and_then(|value| value.get("amount"))
        .and_then(Value::as_str)
        .and_then(|value| value.parse::<u64>().ok())
        .ok_or("insufficient_balance")?;
    if lamports < 5_000 || amount < requirement.amount {
        return Err("insufficient_balance");
    }
    Ok(())
}

fn rpc_call<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    method: &str,
    params: Value,
) -> Result<Value, &'static str> {
    let request = json!({
        "method":"POST", "url":rpc_url,
        "headers":[["content-type","application/json"]],
        "body":json!({"jsonrpc":"2.0","id":1,"method":method,"params":params}).to_string(),
    });
    let raw = seams
        .http_fetch(&request.to_string())
        .map_err(|_| "funding_unavailable")?;
    rpc::parse_result(&raw).map_err(|_| "funding_unavailable")
}

pub(super) fn latest_blockhash<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
) -> Result<String, &'static str> {
    let raw = seams
        .http_fetch(&rpc::build_get_latest_blockhash(rpc_url).to_string())
        .map_err(|_| "submission_failure")?;
    rpc::parse_latest_blockhash(&raw)
        .map(|value| value.blockhash)
        .map_err(|_| "submission_failure")
}

pub(super) fn submit<S: HostSeams>(
    seams: &S,
    target: &str,
    payment_header: &str,
) -> Result<u16, ()> {
    let raw = seams
        .http_fetch(
            &json!({
                "method":"GET", "url":target,
                "headers":[["accept","application/json"],["x-payment",payment_header]],
            })
            .to_string(),
        )
        .map_err(|_| ())?;
    unwrap_fetch(&raw).map(|(status, _)| status).map_err(|_| ())
}

pub(super) fn confirmation<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    signature: &str,
) -> Result<rpc::Confirmation, ()> {
    let raw = seams
        .http_fetch(&rpc::build_get_signature_statuses(rpc_url, signature).to_string())
        .map_err(|_| ())?;
    rpc::parse_signature_status(&raw).map_err(|_| ())
}
