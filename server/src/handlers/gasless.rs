use std::sync::Arc;

use axum::{extract::State, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};

use super::response::{json_error, json_ok};
use crate::errors::validation::{validate_coupon_code, validate_resource_id};
use crate::errors::{error_response, ErrorCode};
use crate::handlers::paywall::AppState;
use crate::middleware::tenant::TenantContext;
use crate::storage::Store;
use crate::x402::utils::validate_wallet_address;

// ─────────────────────────────────────────────────────────────────────────────
// Request/Response types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GaslessTransactionRequest {
    pub resource_id: String,
    pub user_wallet: String,
    pub fee_payer: Option<String>,
    pub coupon_code: Option<String>,
}

/// Response format matches Go implementation exactly:
/// - transaction: base64-encoded unsigned transaction
/// - blockhash: recent blockhash used
/// - feePayer: server wallet that will pay fees
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GaslessTransactionResponse {
    pub transaction: String,
    pub blockhash: String,
    pub fee_payer: String,
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// POST /paywall/v1/gasless-transaction - Build fee-paying transaction
pub async fn build_gasless_transaction<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    Json(req): Json<GaslessTransactionRequest>,
) -> impl IntoResponse {
    // Validate resource_id
    if let Err(e) = validate_resource_id(&req.resource_id) {
        let (status, body) = error_response(
            ErrorCode::InvalidResource,
            Some(e.message),
            Some(serde_json::json!({ "field": e.field })),
        );
        return json_error(status, body);
    }

    // Validate user_wallet (must be valid Solana address)
    if let Err(err_code) = validate_wallet_address(&req.user_wallet) {
        let (status, body) = error_response(
            err_code,
            Some("userWallet must be a valid Solana address".to_string()),
            Some(serde_json::json!({ "field": "userWallet" })),
        );
        return json_error(status, body);
    }

    // Validate fee_payer if provided (must be valid Solana address)
    if let Some(ref fee_payer) = req.fee_payer {
        if !fee_payer.is_empty() {
            if let Err(err_code) = validate_wallet_address(fee_payer) {
                let (status, body) = error_response(
                    err_code,
                    Some("feePayer must be a valid Solana address".to_string()),
                    Some(serde_json::json!({ "field": "feePayer" })),
                );
                return json_error(status, body);
            }
        }
    }

    // Validate coupon_code if provided
    if let Some(ref coupon) = req.coupon_code {
        if !coupon.is_empty() {
            if let Err(e) = validate_coupon_code(coupon) {
                let (status, body) = error_response(
                    ErrorCode::InvalidCoupon,
                    Some(e.message),
                    Some(serde_json::json!({ "field": e.field })),
                );
                return json_error(status, body);
            }
        }
    }

    let result = state
        .paywall_service
        .build_gasless_transaction(
            &tenant.tenant_id,
            &req.resource_id,
            &req.user_wallet,
            req.fee_payer.as_deref(),
            req.coupon_code.as_deref(),
        )
        .await;

    match result {
        Ok(tx_data) => {
            // Return only the 3 fields Go returns
            let resp = GaslessTransactionResponse {
                transaction: tx_data.transaction,
                blockhash: tx_data.blockhash,
                fee_payer: tx_data.fee_payer,
            };
            json_ok(resp)
        }
        Err(e) => {
            // Use proper HTTP status code from error code per spec 15-errors.md
            let (status, error_body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, error_body)
        }
    }
}
