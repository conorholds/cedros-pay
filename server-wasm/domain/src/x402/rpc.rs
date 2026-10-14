//! Solana JSON-RPC over the host `http_fetch` egress seam.
//!
//! JSON-RPC 2.0 builders emit the `http_fetch` request envelope (`{method,url,headers,
//! body}`, same shape as `stripe/api.rs`) and pure parsers unwrap the
//! `{status,body}` response and the JSON-RPC `{result}`/`{error}`. The actual
//! call is the caller's `seams.http_fetch`, so this stays pure and testable.
//!
//! Confirmation uses bounded `getSignatureStatuses` polling (not WebSocket); the
//! operator must allowlist the RPC host for egress, same gate as Stripe.

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde_json::{json, Value};

use crate::seams::HostSeams;
use crate::stripe::api::unwrap_fetch;

use super::{pubkey, transaction, transfer};

#[path = "rpc_effects.rs"]
mod effects;

/// Construction and preflight use the same commitment; settlement uses finalized.
const COMMITMENT: &str = "confirmed";

const MAINNET_BETA_GENESIS_HASH: &str = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
const TESTNET_GENESIS_HASH: &str = "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY";
const DEVNET_GENESIS_HASH: &str = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

/// A JSON-RPC error (the `error` member, or a transport/HTTP failure mapped into
/// one). `code` is the JSON-RPC numeric code; callers classify on it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RpcError {
    pub code: i64,
    pub message: String,
}

impl RpcError {
    fn transport(message: impl Into<String>) -> Self {
        Self {
            code: 0,
            message: message.into(),
        }
    }
}

/// Confirmation state of a submitted signature.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Confirmation {
    /// RPC has no record of the signature yet.
    NotFound,
    /// Seen but not yet at the target commitment.
    Processed,
    Confirmed,
    Finalized,
    /// Landed but the transaction itself failed on-chain.
    Failed(String),
}

/// Result of loading the exact transaction at finalized commitment.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConfirmedTransaction {
    /// The transaction is not available at finalized commitment yet.
    NotFound,
    /// The exact expected bytes executed successfully and are finalized.
    Succeeded,
    /// The exact expected bytes were finalized with an on-chain error.
    Failed(String),
}

/// The recent-blockhash read used to build client transactions.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LatestBlockhash {
    pub blockhash: String,
    pub last_valid_block_height: u64,
}

pub(super) fn rpc_post(rpc_url: &str, method: &str, params: Value) -> Value {
    json!({
        "method": "POST",
        "url": rpc_url,
        "headers": [["content-type", "application/json"]],
        "body": json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params,
        })
        .to_string(),
    })
}

/// `getLatestBlockhash` request envelope.
pub fn build_get_latest_blockhash(rpc_url: &str) -> Value {
    rpc_post(
        rpc_url,
        "getLatestBlockhash",
        json!([{ "commitment": COMMITMENT }]),
    )
}

/// `getGenesisHash` binds a configured RPC URL to the intended Solana cluster.
pub fn build_get_genesis_hash(rpc_url: &str) -> Value {
    rpc_post(rpc_url, "getGenesisHash", json!([]))
}

/// `sendTransaction` request envelope for a base64-encoded signed transaction.
pub fn build_send_transaction(rpc_url: &str, tx_base64: &str) -> Value {
    rpc_post(
        rpc_url,
        "sendTransaction",
        json!([
            tx_base64,
            { "encoding": "base64", "skipPreflight": false, "preflightCommitment": COMMITMENT }
        ]),
    )
}

/// `getSignatureStatuses` request envelope (searches recent history).
pub fn build_get_signature_statuses(rpc_url: &str, signature: &str) -> Value {
    rpc_post(
        rpc_url,
        "getSignatureStatuses",
        json!([[signature], { "searchTransactionHistory": true }]),
    )
}

/// Loads finalized transaction bytes so settlement can verify actual execution,
/// rather than trusting that an expected signature merely exists.
pub fn build_get_confirmed_transaction(rpc_url: &str, signature: &str) -> Value {
    rpc_post(
        rpc_url,
        "getTransaction",
        json!([signature, {
            "encoding": "base64",
            "commitment": "finalized",
            "maxSupportedTransactionVersion": 0
        }]),
    )
}

/// Probe validity at the construction/preflight commitment. False alone does
/// not prove expiry: a lagging node may not know a newer blockhash.
pub fn build_is_blockhash_valid(rpc_url: &str, blockhash: &str) -> Value {
    rpc_post(
        rpc_url,
        "isBlockhashValid",
        json!([blockhash, { "commitment": COMMITMENT }]),
    )
}

/// Unwrap the `http_fetch` envelope and the JSON-RPC envelope, returning the
/// `result` member or a classified [`RpcError`].
pub fn parse_result(raw_fetch: &str) -> Result<Value, RpcError> {
    let (http_status, body) = unwrap_fetch(raw_fetch).map_err(RpcError::transport)?;
    let envelope: Value =
        serde_json::from_str(&body).map_err(|_| RpcError::transport("non-JSON RPC response"))?;
    if envelope.get("jsonrpc").and_then(Value::as_str) != Some("2.0")
        || envelope.get("id").and_then(Value::as_u64) != Some(1)
        || (envelope.get("result").is_some() && envelope.get("error").is_some())
    {
        return Err(RpcError::transport(
            "RPC response envelope does not match request",
        ));
    }
    if let Some(error) = envelope.get("error") {
        let code = error.get("code").and_then(Value::as_i64).unwrap_or(0);
        let message = error
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("RPC error")
            .to_string();
        return Err(RpcError { code, message });
    }
    if !(200..300).contains(&http_status) {
        return Err(RpcError::transport(format!(
            "RPC returned HTTP {http_status}"
        )));
    }
    envelope
        .get("result")
        .cloned()
        .ok_or_else(|| RpcError::transport("RPC response missing result"))
}

/// Parse a `getLatestBlockhash` response.
pub fn parse_latest_blockhash(raw_fetch: &str) -> Result<LatestBlockhash, RpcError> {
    let result = parse_result(raw_fetch)?;
    let value = result.get("value").unwrap_or(&result);
    let blockhash = value
        .get("blockhash")
        .and_then(Value::as_str)
        .ok_or_else(|| RpcError::transport("blockhash missing"))?
        .to_string();
    let last_valid_block_height = value
        .get("lastValidBlockHeight")
        .and_then(Value::as_u64)
        .filter(|height| *height > 0)
        .ok_or_else(|| RpcError::transport("last valid block height missing"))?;
    pubkey::parse(&blockhash).map_err(|_| RpcError::transport("blockhash is invalid"))?;
    Ok(LatestBlockhash {
        blockhash,
        last_valid_block_height,
    })
}

pub fn parse_genesis_hash(raw_fetch: &str) -> Result<String, RpcError> {
    let result = parse_result(raw_fetch)?;
    let hash = result
        .as_str()
        .ok_or_else(|| RpcError::transport("getGenesisHash returned no hash"))?;
    pubkey::parse(hash).map_err(|_| RpcError::transport("genesis hash is invalid"))?;
    Ok(hash.to_string())
}

/// Validate the RPC cluster against Solana's canonical genesis hash. `solana`
/// is the legacy x402 alias for mainnet-beta. Local clusters have no canonical
/// public genesis identity and are therefore ineligible for payment settlement.
pub fn genesis_matches_network(genesis_hash: &str, network: &str) -> bool {
    let expected = match network {
        "solana" | "mainnet-beta" => MAINNET_BETA_GENESIS_HASH,
        "testnet" => TESTNET_GENESIS_HASH,
        "devnet" => DEVNET_GENESIS_HASH,
        _ => return false,
    };
    genesis_hash == expected
}

pub fn verify_cluster<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    network: &str,
) -> Result<(), RpcError> {
    let raw = seams
        .http_fetch(&build_get_genesis_hash(rpc_url).to_string())
        .map_err(|error| RpcError::transport(error.message))?;
    let genesis = parse_genesis_hash(&raw)?;
    if !genesis_matches_network(&genesis, network) {
        return Err(RpcError::transport(
            "Solana RPC genesis hash does not match configured network",
        ));
    }
    Ok(())
}

pub fn load_confirmed_transaction<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    signature: &str,
    expected_transaction_base64: &str,
) -> Result<ConfirmedTransaction, RpcError> {
    let raw = seams
        .http_fetch(&build_get_confirmed_transaction(rpc_url, signature).to_string())
        .map_err(|error| RpcError::transport(error.message))?;
    parse_confirmed_transaction(&raw, expected_transaction_base64, signature)
}

/// Parse a `sendTransaction` response into the transaction signature.
pub fn parse_send_transaction(raw_fetch: &str) -> Result<String, RpcError> {
    let result = parse_result(raw_fetch)?;
    result
        .as_str()
        .map(str::to_string)
        .ok_or_else(|| RpcError::transport("sendTransaction returned no signature"))
}

/// Parse a `getSignatureStatuses` response into a [`Confirmation`].
pub fn parse_signature_status(raw_fetch: &str) -> Result<Confirmation, RpcError> {
    let result = parse_result(raw_fetch)?;
    let entries = result
        .get("value")
        .and_then(Value::as_array)
        .filter(|entries| entries.len() == 1)
        .ok_or_else(|| RpcError::transport("signature status array is malformed"))?;
    let status = &entries[0];
    if status.is_null() {
        return Ok(Confirmation::NotFound);
    }
    let err = status
        .get("err")
        .ok_or_else(|| RpcError::transport("signature status omitted execution result"))?;
    if !err.is_null() && !execution_error(err) {
        return Err(RpcError::transport(
            "signature execution result is malformed",
        ));
    }
    let confirmation = match status.get("confirmationStatus").and_then(Value::as_str) {
        Some("finalized") => Confirmation::Finalized,
        Some("confirmed") => Confirmation::Confirmed,
        Some("processed") => Confirmation::Processed,
        _ => return Err(RpcError::transport("signature commitment is malformed")),
    };
    // A failed fork can still disappear. Only finalized failures are terminal.
    if !err.is_null() && confirmation == Confirmation::Finalized {
        return Ok(Confirmation::Failed(err.to_string()));
    }
    Ok(confirmation)
}

pub fn parse_blockhash_valid(raw_fetch: &str) -> Result<bool, RpcError> {
    let result = parse_result(raw_fetch)?;
    result
        .get("value")
        .and_then(Value::as_bool)
        .or_else(|| result.as_bool())
        .ok_or_else(|| RpcError::transport("isBlockhashValid returned no value"))
}

/// Parse `getTransaction` at finalized commitment and require the returned
/// wire bytes and primary signature to match the locally verified payment.
pub fn parse_confirmed_transaction(
    raw_fetch: &str,
    expected_transaction_base64: &str,
    expected_signature: &str,
) -> Result<ConfirmedTransaction, RpcError> {
    let result = parse_result(raw_fetch)?;
    if result.is_null() {
        return Ok(ConfirmedTransaction::NotFound);
    }
    let encoded = result
        .get("transaction")
        .and_then(Value::as_array)
        .filter(|transaction| transaction.len() == 2)
        .and_then(|transaction| {
            (transaction.get(1).and_then(Value::as_str) == Some("base64"))
                .then(|| transaction.first().and_then(Value::as_str))
                .flatten()
        })
        .ok_or_else(|| RpcError::transport("confirmed transaction bytes missing"))?;
    let expected = BASE64
        .decode(expected_transaction_base64.trim())
        .map_err(|_| RpcError::transport("expected transaction encoding is invalid"))?;
    let actual = BASE64
        .decode(encoded)
        .map_err(|_| RpcError::transport("confirmed transaction encoding is invalid"))?;
    if actual != expected {
        return Err(RpcError::transport(
            "confirmed transaction does not match expected payment",
        ));
    }
    let parsed = transaction::parse(&actual)
        .map_err(|_| RpcError::transport("confirmed transaction is malformed"))?;
    if !transfer::verify_required_signatures(&parsed) {
        return Err(RpcError::transport("transaction signatures are invalid"));
    }
    if result.get("slot").and_then(Value::as_u64).is_none() {
        return Err(RpcError::transport("transaction slot is missing"));
    }
    let signature = parsed
        .signatures
        .first()
        .map(pubkey::encode_signature)
        .ok_or_else(|| RpcError::transport("confirmed transaction signature missing"))?;
    if signature != expected_signature {
        return Err(RpcError::transport(
            "confirmed transaction signature does not match",
        ));
    }
    let error = result.get("meta").and_then(|meta| meta.get("err"));
    match error {
        Some(Value::Null) => {
            effects::verify(&parsed, &result).map_err(RpcError::transport)?;
            Ok(ConfirmedTransaction::Succeeded)
        }
        Some(error) if execution_error(error) => {
            Ok(ConfirmedTransaction::Failed(error.to_string()))
        }
        Some(_) => Err(RpcError::transport(
            "transaction execution result is malformed",
        )),
        None => Err(RpcError::transport(
            "confirmed transaction metadata missing",
        )),
    }
}

fn execution_error(value: &Value) -> bool {
    value.as_str().is_some_and(|error| !error.is_empty())
        || value.as_object().is_some_and(|error| error.len() == 1)
}

#[cfg(test)]
#[path = "rpc_tests.rs"]
mod tests;
