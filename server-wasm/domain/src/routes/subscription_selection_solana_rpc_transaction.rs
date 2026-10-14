//! Finalized Solana transaction loading shared by subscription verifiers.

use serde_json::{json, Value};

use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;
use crate::x402::rpc::{self, Confirmation};

pub(super) fn fetch_finalized<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    signature: &str,
    token_mint: &str,
) -> AppResult<Value> {
    if rpc_url.trim().is_empty() {
        return Err(AppError::new(
            503,
            "service_unavailable",
            "Solana RPC is required to activate subscriptions",
        ));
    }
    let network = crate::blockchain_config::read_status(seams)
        .solana
        .and_then(|config| config.network)
        .ok_or_else(|| {
            AppError::new(
                503,
                "service_unavailable",
                "Solana network identity is not configured",
            )
        })?;
    crate::x402::config::validate_payment_asset(&network, token_mint, 6, None).map_err(|_| {
        AppError::unprocessable("subscription mint does not match the configured network")
    })?;
    rpc::verify_cluster(seams, rpc_url, &network).map_err(rpc_error)?;
    let status_raw = seams
        .http_fetch(&rpc::build_get_signature_statuses(rpc_url, signature).to_string())
        .map_err(|error| rpc_unavailable(error.message))?;
    match rpc::parse_signature_status(&status_raw).map_err(rpc_error)? {
        Confirmation::Finalized => {}
        Confirmation::Failed(_) => {
            return Err(AppError::new(
                422,
                "transaction_failed",
                "Solana transaction failed",
            ));
        }
        Confirmation::NotFound | Confirmation::Processed | Confirmation::Confirmed => {
            return Err(AppError::new(
                409,
                "transaction_not_finalized",
                "Solana transaction is not finalized; retry activation",
            ));
        }
    }
    let raw = seams
        .http_fetch(&build_request(rpc_url, signature).to_string())
        .map_err(|error| rpc_unavailable(error.message))?;
    let tx = rpc::parse_result(&raw).map_err(rpc_error)?;
    if tx.is_null() {
        return Err(AppError::new(
            502,
            "rpc_error",
            "finalized Solana transaction could not be loaded",
        ));
    }
    if tx.get("slot").and_then(Value::as_u64).is_none()
        || tx.get("meta").and_then(|meta| meta.get("err")).is_none()
        || tx["transaction"]["signatures"]
            .as_array()
            .and_then(|s| s.first())
            .and_then(Value::as_str)
            != Some(signature)
    {
        return Err(rpc_unavailable(
            "finalized transaction evidence is incomplete or mismatched".into(),
        ));
    }
    if !tx["meta"]["err"].is_null() {
        return Err(AppError::new(
            422,
            "transaction_failed",
            "Solana transaction failed",
        ));
    }
    Ok(tx)
}

fn build_request(rpc_url: &str, signature: &str) -> Value {
    json!({
        "method": "POST",
        "url": rpc_url,
        "headers": [["content-type", "application/json"]],
        "body": json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getTransaction",
            "params": [signature, {
                "encoding": "json",
                "commitment": "finalized",
                "maxSupportedTransactionVersion": 0
            }]
        }).to_string(),
    })
}

fn rpc_error(error: rpc::RpcError) -> AppError {
    rpc_unavailable(error.message)
}

fn rpc_unavailable(cause: String) -> AppError {
    AppError::new(502, "rpc_error", "could not verify Solana transaction").with_internal(cause)
}
