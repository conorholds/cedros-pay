//! RPC proxy handlers for frontend transaction building.
//!
//! Provides endpoints that wrap Solana RPC calls with caching
//! to reduce load on RPC nodes during high-traffic scenarios.

use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use solana_sdk::pubkey::Pubkey;
use spl_associated_token_account::get_associated_token_address;
use std::str::FromStr;
use std::sync::Arc;

use super::paywall::AppState;
use crate::storage::Store;

/// Request to derive an associated token account.
#[derive(Debug, Deserialize)]
pub struct DeriveTokenAccountRequest {
    /// Wallet address (owner of the token account)
    pub owner: String,
    /// Token mint address
    pub mint: String,
}

/// Response containing the derived associated token account.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeriveTokenAccountResponse {
    /// Derived associated token account address
    pub token_account: String,
    /// Owner address (echoed back)
    pub owner: String,
    /// Mint address (echoed back)
    pub mint: String,
}

/// Error response for RPC proxy endpoints.
#[derive(Debug, Serialize)]
pub struct RpcProxyError {
    pub error: String,
}

/// Response for get-blockhash endpoint.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetBlockhashResponse {
    /// Recent blockhash (base58 encoded)
    pub blockhash: String,
    /// Last valid block height for this blockhash
    pub last_valid_block_height: u64,
    /// Whether this was served from cache
    pub cached: bool,
}

/// Derive the associated token account for a wallet and token mint.
///
/// POST /paywall/v1/derive-token-account
///
/// This is a pure computation endpoint - it doesn't make any RPC calls.
/// The associated token account (ATA) is derived deterministically from
/// the owner and mint addresses using Solana's program-derived address (PDA) system.
pub async fn derive_token_account(
    Json(req): Json<DeriveTokenAccountRequest>,
) -> Result<Json<DeriveTokenAccountResponse>, (StatusCode, Json<RpcProxyError>)> {
    // Validate required fields
    if req.owner.is_empty() || req.mint.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(RpcProxyError {
                error: "owner and mint are required".to_string(),
            }),
        ));
    }

    // Parse owner public key
    let owner_key = Pubkey::from_str(&req.owner).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(RpcProxyError {
                error: "invalid owner address".to_string(),
            }),
        )
    })?;

    // Parse mint public key
    let mint_key = Pubkey::from_str(&req.mint).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            Json(RpcProxyError {
                error: "invalid mint address".to_string(),
            }),
        )
    })?;

    // Derive associated token account (ATA)
    // This is a deterministic derivation - no RPC call needed
    let ata = get_associated_token_address(&owner_key, &mint_key);

    Ok(Json(DeriveTokenAccountResponse {
        token_account: ata.to_string(),
        owner: req.owner,
        mint: req.mint,
    }))
}

/// Get a cached recent blockhash for transaction building.
///
/// GET /paywall/v1/blockhash
///
/// This endpoint returns a recent blockhash, caching the result for 1 second
/// to reduce RPC load during high-traffic scenarios. Per Go server behavior
/// (`internal/httpserver/rpc_proxy.go`), this significantly reduces the number
/// of RPC calls when many clients are building transactions simultaneously.
pub async fn get_blockhash<S: Store>(
    State(state): State<Arc<AppState<S>>>,
) -> Result<Json<GetBlockhashResponse>, (StatusCode, Json<RpcProxyError>)> {
    let cache = state.blockhash_cache.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(RpcProxyError {
                error: "Blockhash cache not configured (check RPC URL)".to_string(),
            }),
        )
    })?;

    let response = cache.get_blockhash().await.map_err(|e| {
        tracing::error!(error = %e, "Failed to get blockhash");
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(RpcProxyError {
                error: "Failed to get blockhash from RPC".to_string(),
            }),
        )
    })?;

    Ok(Json(GetBlockhashResponse {
        blockhash: response.blockhash,
        last_valid_block_height: response.last_valid_block_height,
        cached: response.cached,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_ata_usdc() {
        // Known USDC mint address
        let mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        // A random wallet address for testing
        let owner = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";

        let owner_key = Pubkey::from_str(owner).unwrap();
        let mint_key = Pubkey::from_str(mint).unwrap();

        let ata = get_associated_token_address(&owner_key, &mint_key);

        // ATA should be a valid base58 string
        assert!(!ata.to_string().is_empty());
        // ATA should be deterministic
        let ata2 = get_associated_token_address(&owner_key, &mint_key);
        assert_eq!(ata, ata2);
    }
}
