//! Admin handlers for Token-22 mint management.

use std::sync::Arc;

use axum::{extract::State, response::IntoResponse, Json};
use chrono::Utc;
use serde::Deserialize;

use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin::audit;
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;
use crate::services::token22::Token22Service;
use crate::storage::Store;

/// Shared state for token22 admin routes.
pub struct Token22AdminState {
    pub token22: Arc<Token22Service>,
    pub store: Arc<dyn Store>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitializeMintRequest {
    pub token_symbol: Option<String>,
    pub token_decimals: Option<i16>,
    pub transfer_fee_bps: Option<i32>,
    pub max_transfer_fee: Option<i64>,
    pub treasury_address: String,
}

/// POST /api/admin/token22/initialize — create Token-22 mint (one-time per tenant)
pub async fn initialize_mint(
    State(state): State<Arc<Token22AdminState>>,
    tenant: TenantContext,
    Json(req): Json<InitializeMintRequest>,
) -> impl IntoResponse {
    // Check if mint already exists
    match state.store.get_tenant_token22_mint(&tenant.tenant_id).await {
        Ok(Some(_)) => {
            let (status, body) = error_response(
                ErrorCode::InvalidOperation,
                Some("Token-22 mint already initialized for this tenant".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to check existing mint");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to check existing mint".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
        Ok(None) => {} // proceed
    }

    let decimals = req.token_decimals.unwrap_or(2) as u8;
    let fee_bps = req.transfer_fee_bps.unwrap_or(0) as u16;
    let max_fee = req.max_transfer_fee.unwrap_or(0) as u64;

    let result = crate::services::token22::create_mint_with_transfer_fee(
        &state.token22,
        decimals,
        fee_bps,
        max_fee,
    )
    .await;

    let mint_result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!(error = %e, "Failed to create Token-22 mint");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to create Token-22 mint on-chain".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let now = Utc::now();
    let mint = crate::models::TenantToken22Mint {
        tenant_id: tenant.tenant_id.clone(),
        collection_id: None, // gift card mint — no collection
        mint_address: mint_result.mint_address.to_string(),
        mint_authority: state.token22.authority_pubkey().to_string(),
        transfer_fee_bps: req.transfer_fee_bps.unwrap_or(0),
        max_transfer_fee: req.max_transfer_fee.unwrap_or(0),
        treasury_address: req.treasury_address.clone(),
        token_symbol: req.token_symbol.clone().unwrap_or_else(|| "storeUSD".to_string()),
        token_decimals: req.token_decimals.unwrap_or(2),
        created_at: now,
        updated_at: now,
    };

    if let Err(e) = state.store.upsert_tenant_token22_mint(mint).await {
        tracing::error!(error = %e, "Failed to store Token-22 mint config");
        let (status, body) = error_response(
            ErrorCode::InternalError,
            Some("Mint created on-chain but failed to save config".to_string()),
            None,
        );
        return json_error(status, body).into_response();
    }

    let mint_address_str = mint_result.mint_address.to_string();
    audit(
        &*state.store,
        &tenant,
        "token22_mint",
        &mint_address_str,
        "initialize_mint",
        None,
    )
    .await;

    json_ok(serde_json::json!({
        "mintAddress": mint_result.mint_address.to_string(),
        "signature": mint_result.signature,
        "tokenSymbol": req.token_symbol.unwrap_or_else(|| "storeUSD".to_string()),
        "tokenDecimals": req.token_decimals.unwrap_or(2),
        "transferFeeBps": req.transfer_fee_bps.unwrap_or(0),
    }))
    .into_response()
}

/// GET /api/admin/token22/status — get mint info
pub async fn get_status(
    State(state): State<Arc<Token22AdminState>>,
    tenant: TenantContext,
) -> impl IntoResponse {
    match state.store.get_tenant_token22_mint(&tenant.tenant_id).await {
        Ok(Some(mint)) => json_ok(serde_json::json!({
            "configured": true,
            "mintAddress": mint.mint_address,
            "mintAuthority": mint.mint_authority,
            "transferFeeBps": mint.transfer_fee_bps,
            "maxTransferFee": mint.max_transfer_fee,
            "treasuryAddress": mint.treasury_address,
            "tokenSymbol": mint.token_symbol,
            "tokenDecimals": mint.token_decimals,
            "createdAt": mint.created_at,
        }))
        .into_response(),
        Ok(None) => json_ok(serde_json::json!({ "configured": false })).into_response(),
        Err(e) => {
            tracing::error!(error = %e, "Failed to get Token-22 mint status");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to get mint status".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// POST /api/admin/token22/harvest-fees — collect transfer fees to treasury
pub async fn harvest_fees(
    State(state): State<Arc<Token22AdminState>>,
    tenant: TenantContext,
) -> impl IntoResponse {
    let mint = match state.store.get_tenant_token22_mint(&tenant.tenant_id).await {
        Ok(Some(m)) => m,
        Ok(None) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("No Token-22 mint configured".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to get mint config");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to get mint config".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let mint_pubkey: solana_sdk::pubkey::Pubkey = match mint.mint_address.parse() {
        Ok(pk) => pk,
        Err(e) => {
            tracing::error!(error = %e, "Invalid mint address in config");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Invalid mint address in config".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let treasury_pubkey: solana_sdk::pubkey::Pubkey = match mint.treasury_address.parse() {
        Ok(pk) => pk,
        Err(e) => {
            tracing::error!(error = %e, "Invalid treasury address in config");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Invalid treasury address".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    // NOTE: In production, enumerate token accounts with withheld fees.
    // For now, return an info message since we need account enumeration.
    audit(&*state.store, &tenant, "token22_mint", "all", "harvest_fees", None).await;
    json_ok(serde_json::json!({
        "message": "Fee harvesting requires specifying source accounts with withheld fees",
        "mintAddress": mint_pubkey.to_string(),
        "treasuryAddress": treasury_pubkey.to_string(),
    }))
    .into_response()
}

/// GET /api/admin/gift-card-redemptions — list redemptions
pub async fn list_gift_card_redemptions(
    State(state): State<Arc<Token22AdminState>>,
    tenant: TenantContext,
    axum::extract::Query(query): axum::extract::Query<ListRedemptionsQuery>,
) -> impl IntoResponse {
    let limit = query.limit.unwrap_or(50).min(200);
    let offset = query.offset.unwrap_or(0).max(0);

    match state
        .store
        .list_gift_card_redemptions(&tenant.tenant_id, limit, offset)
        .await
    {
        Ok(redemptions) => json_ok(serde_json::json!({ "redemptions": redemptions })).into_response(),
        Err(e) => {
            tracing::error!(error = %e, "Failed to list gift card redemptions");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to list redemptions".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListRedemptionsQuery {
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}
