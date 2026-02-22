use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::response::{json_error, json_ok};
use crate::constants::NONCE_TTL;
use crate::errors::{validation::validate_resource_id, ErrorCode};
use crate::handlers::paywall::AppState;
use crate::middleware::signature::{verify_admin_signature, SignatureVerifyResult};
use crate::middleware::tenant::TenantContext;
use crate::models::Money;
use crate::storage::{AdminNonce, Store};
use crate::x402::utils::{generate_nonce_id, validate_wallet_address};

// ─────────────────────────────────────────────────────────────────────────────
// Request/Response types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundRequest {
    pub original_purchase_id: String,
    /// Recipient wallet is required for x402 refunds; omitted for Stripe refunds.
    #[serde(default)]
    pub recipient_wallet: Option<String>,
    /// Amount/token are required for x402 refunds; omitted for Stripe refunds.
    #[serde(default)]
    pub amount: Option<f64>,
    #[serde(default)]
    pub token: Option<String>,
    pub reason: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

/// Response per spec (04-http-endpoints-refunds.md)
/// Note: expires_at is NOT in the spec response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundResponse {
    pub refund_id: String,
    pub status: String,
    pub original_purchase_id: String,
    pub recipient_wallet: String,
    pub amount: f64,
    pub token: String,
    pub reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub message: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundProcessRequest {
    pub refund_id: String,
    pub nonce: String,
    /// Ed25519 signature over the nonce (base64 encoded)
    pub signature: String,
    /// Public key of signer (base58 encoded)
    pub signer: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundDenyRequest {
    pub refund_id: String,
    pub nonce: String,
    /// Ed25519 signature over the nonce (base64 encoded)
    pub signature: String,
    /// Public key of signer (base58 encoded)
    pub signer: String,
    pub reason: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundProcessResponse {
    pub refund_id: String,
    pub status: String,
    pub signature: Option<String>,
    pub processed_at: Option<DateTime<Utc>>,
}

/// Response for refund approval (generates quote for execution)
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundApproveResponse {
    pub refund_id: String,
    pub quote: RefundQuoteData,
    pub expires_at: DateTime<Utc>,
}

/// The x402 quote for refund execution
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundQuoteData {
    pub scheme: String,
    pub network: String,
    pub max_amount_required: String,
    pub resource: String,
    pub description: String,
    pub pay_to: String,
    pub asset: String,
    pub max_timeout_seconds: i64,
    pub extra: RefundQuoteExtra,
}

/// Extra fields for refund quote
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundQuoteExtra {
    pub recipient_token_account: String,
    pub decimals: u8,
    pub token_symbol: String,
    pub memo: String,
    pub fee_payer: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundPendingRequest {
    #[serde(default = "default_limit")]
    pub limit: i32,
    pub nonce: String,
    /// Ed25519 signature over the nonce (base64 encoded)
    pub signature: String,
    /// Public key of signer (base58 encoded)
    pub signer: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefundPendingResponse {
    pub refunds: Vec<PendingRefundInfo>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingRefundInfo {
    pub id: String,
    pub original_purchase_id: String,
    pub recipient_wallet: String,
    pub amount: f64,
    pub token: String,
    pub reason: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NonceRequest {
    pub purpose: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NonceResponse {
    pub nonce: String,
    pub expires_at: i64,
    /// Purpose echoed back (empty string = wildcard)
    pub purpose: String,
}

use super::cap_limit;

fn default_limit() -> i32 {
    100
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// POST /paywall/v1/refunds/request - Request a refund
pub async fn request_refund<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    Json(req): Json<RefundRequest>,
) -> impl IntoResponse {
    // Validate required fields per spec 17
    if req.original_purchase_id.is_empty() {
        let (status, body) = crate::errors::error_response(
            ErrorCode::MissingField,
            Some("originalPurchaseId is required".to_string()),
            None,
        );
        return json_error(status, body);
    }

    // For x402 refunds, validate recipient_wallet, amount, and token.
    // For Stripe refunds, these fields are omitted and the server uses the original purchase.
    let amount = match (&req.amount, &req.token) {
        (Some(amount), Some(token)) => {
            if !amount.is_finite() || *amount <= 0.0 {
                let (status, body) = crate::errors::error_response(
                    ErrorCode::InvalidAmount,
                    Some("amount must be a finite positive number".to_string()),
                    None,
                );
                return json_error(status, body);
            }

            let asset = match crate::models::try_get_asset(token) {
                Ok(a) => a,
                Err(_) => {
                    let (status, body) = crate::errors::error_response(
                        ErrorCode::InvalidAmount,
                        Some(format!("unknown token: {}", token)),
                        None,
                    );
                    return json_error(status, body);
                }
            };
            Some(Money::from_major(asset, *amount))
        }
        (None, None) => None,
        _ => {
            let (status, body) = crate::errors::error_response(
                ErrorCode::MissingField,
                Some("amount and token must be provided together".to_string()),
                None,
            );
            return json_error(status, body);
        }
    };

    if let Some(ref wallet) = req.recipient_wallet {
        if let Err(err_code) = validate_wallet_address(wallet) {
            let (status, body) = crate::errors::error_response(
                err_code,
                Some("recipientWallet must be a valid Solana address".to_string()),
                None,
            );
            return json_error(status, body);
        }
    }

    // Validate metadata size if provided
    if let Some(ref meta) = req.metadata {
        if let Err(msg) = super::validate_metadata_size(meta) {
            let (status, body) =
                crate::errors::error_response(ErrorCode::InvalidField, Some(msg), None);
            return json_error(status, body);
        }
    }

    // Convert metadata from serde_json::Value to HashMap<String, String> per spec (04-http-endpoints-refunds.md)
    let metadata = req.metadata.and_then(|v| {
        if let serde_json::Value::Object(map) = v {
            let converted: std::collections::HashMap<String, String> = map
                .into_iter()
                .filter_map(|(k, v)| match v {
                    serde_json::Value::String(s) => Some((k, s)),
                    serde_json::Value::Number(n) => Some((k, n.to_string())),
                    serde_json::Value::Bool(b) => Some((k, b.to_string())),
                    _ => None,
                })
                .collect();
            Some(converted)
        } else {
            None
        }
    });

    let result = state
        .paywall_service
        .create_refund_request(
            &tenant.tenant_id,
            &req.original_purchase_id,
            req.recipient_wallet.as_deref(),
            amount,
            req.reason.clone(),
            metadata,
        )
        .await;

    match result {
        Ok(result) => match result {
            crate::services::paywall::service::RefundRequestResult::Crypto(refund) => {
                let resp = RefundResponse {
                    refund_id: refund.id.clone(),
                    status: "pending".to_string(),
                    original_purchase_id: refund.original_purchase_id.clone(),
                    recipient_wallet: refund.recipient_wallet.clone(),
                    amount: refund.amount.to_major(),
                    token: refund.amount.asset.code.clone(),
                    reason: refund.reason.clone(),
                    created_at: refund.created_at,
                    message: "Refund request submitted successfully. An admin will review and process your request.".to_string(),
                };
                json_ok(resp)
            }
            crate::services::paywall::service::RefundRequestResult::Stripe(refund) => {
                // For Stripe refunds, recipient_wallet is not applicable.
                let amount_major = crate::models::get_asset(&refund.currency.to_uppercase())
                    .map(|asset| crate::models::Money::from_atomic(asset, refund.amount).to_major())
                    .unwrap_or_else(|| refund.amount as f64 / 100.0);

                let resp = RefundResponse {
                    refund_id: refund.id.clone(),
                    status: refund.status.clone(),
                    original_purchase_id: refund.original_purchase_id.clone(),
                    recipient_wallet: "".to_string(),
                    amount: amount_major,
                    token: refund.currency.to_uppercase(),
                    reason: refund.reason.clone(),
                    created_at: refund.created_at,
                    message: "Refund request submitted successfully. An admin will review and process your request.".to_string(),
                };
                json_ok(resp)
            }
        },
        Err(e) => {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, body)
        }
    }
}

/// POST /paywall/v1/refunds/approve - Approve a refund (admin)
///
/// This endpoint approves a refund request and returns an x402 quote for execution.
/// The admin must then execute the refund by signing and sending the transaction.
pub async fn approve_refund<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    Json(req): Json<RefundProcessRequest>,
) -> impl IntoResponse {
    // Validate nonce FIRST (cheap db lookup) before expensive signature verification
    let nonce_result = validate_and_consume_nonce(
        &state.store,
        &tenant.tenant_id,
        &req.nonce,
        "refund_approve",
    )
    .await;
    if let Err(e) = nonce_result {
        let code = nonce_error_to_code(&e);
        let (status, body) = crate::errors::error_response(code, Some(e), None);
        return json_error(status, body);
    }

    // Validate admin signature over the nonce (expensive cryptographic operation)
    let sig_result = verify_admin_signature(
        &req.signature,
        &req.nonce,
        &req.signer,
        &state.admin_public_keys,
    );
    if let SignatureVerifyResult::Invalid { reason } | SignatureVerifyResult::Missing { reason } =
        sig_result
    {
        let (status, body) = crate::errors::error_response(
            ErrorCode::InvalidSignature,
            Some(format!("signature verification failed: {}", reason)),
            None,
        );
        return json_error(status, body);
    }

    // Generate the refund quote (doesn't process it yet)
    let result = state
        .paywall_service
        .generate_refund_quote(&tenant.tenant_id, &req.refund_id)
        .await;

    match result {
        Ok(quote_response) => {
            let resp = RefundApproveResponse {
                refund_id: quote_response.refund_id,
                quote: RefundQuoteData {
                    scheme: quote_response.scheme,
                    network: quote_response.network,
                    max_amount_required: quote_response.max_amount_required,
                    resource: quote_response.resource,
                    description: quote_response.description,
                    pay_to: quote_response.pay_to,
                    asset: quote_response.asset,
                    max_timeout_seconds: quote_response.max_timeout_seconds,
                    extra: RefundQuoteExtra {
                        recipient_token_account: quote_response.recipient_token_account,
                        decimals: quote_response.decimals,
                        token_symbol: quote_response.token_symbol,
                        memo: quote_response.memo,
                        fee_payer: quote_response.fee_payer,
                    },
                },
                expires_at: quote_response.expires_at,
            };
            json_ok(resp)
        }
        Err(e) => {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, body)
        }
    }
}

/// POST /paywall/v1/refunds/deny - Deny a refund (admin)
pub async fn deny_refund<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    Json(req): Json<RefundDenyRequest>,
) -> impl IntoResponse {
    // Validate nonce FIRST (cheap db lookup) before expensive signature verification
    let nonce_result =
        validate_and_consume_nonce(&state.store, &tenant.tenant_id, &req.nonce, "refund_deny")
            .await;
    if let Err(e) = nonce_result {
        let code = nonce_error_to_code(&e);
        let (status, body) = crate::errors::error_response(code, Some(e), None);
        return json_error(status, body);
    }

    // Validate admin signature over the nonce (expensive cryptographic operation)
    let sig_result = verify_admin_signature(
        &req.signature,
        &req.nonce,
        &req.signer,
        &state.admin_public_keys,
    );
    if let SignatureVerifyResult::Invalid { reason } | SignatureVerifyResult::Missing { reason } =
        sig_result
    {
        let (status, body) = crate::errors::error_response(
            ErrorCode::InvalidSignature,
            Some(format!("signature verification failed: {}", reason)),
            None,
        );
        return json_error(status, body);
    }

    // For deny, we simply mark the refund as denied by not processing it
    // The refund quote will expire naturally or can be retrieved to check denial
    let result = state
        .paywall_service
        .deny_refund(&tenant.tenant_id, &req.refund_id, req.reason.as_deref())
        .await;

    match result {
        Ok(_) => {
            let resp = serde_json::json!({
                "success": true,
                "message": "refund denied"
            });
            (StatusCode::OK, Json(resp))
        }
        Err(e) => {
            let (status, body) =
                crate::errors::error_response(e.code(), Some(e.safe_message()), None);
            json_error(status, body)
        }
    }
}

/// POST /paywall/v1/refunds/pending - List pending refunds (admin)
pub async fn list_pending_refunds<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    Json(req): Json<RefundPendingRequest>,
) -> impl IntoResponse {
    // Validate nonce FIRST (cheap db lookup) before expensive signature verification
    let nonce_result =
        validate_and_consume_nonce(&state.store, &tenant.tenant_id, &req.nonce, "refund_list")
            .await;
    if let Err(e) = nonce_result {
        let code = nonce_error_to_code(&e);
        let (status, body) = crate::errors::error_response(code, Some(e), None);
        return json_error(status, body);
    }

    // Validate admin signature over the nonce (expensive cryptographic operation)
    let sig_result = verify_admin_signature(
        &req.signature,
        &req.nonce,
        &req.signer,
        &state.admin_public_keys,
    );
    if let SignatureVerifyResult::Invalid { reason } | SignatureVerifyResult::Missing { reason } =
        sig_result
    {
        let (status, body) = crate::errors::error_response(
            ErrorCode::InvalidSignature,
            Some(format!("signature verification failed: {}", reason)),
            None,
        );
        return json_error(status, body);
    }

    let result = state
        .store
        .list_pending_refunds(&tenant.tenant_id, cap_limit(req.limit))
        .await;

    match result {
        Ok(refunds) => {
            let refund_infos: Vec<PendingRefundInfo> = refunds
                .iter()
                .map(|r| PendingRefundInfo {
                    id: r.id.clone(),
                    original_purchase_id: r.original_purchase_id.clone(),
                    recipient_wallet: r.recipient_wallet.clone(),
                    amount: r.amount.to_major(),
                    token: r.amount.asset.code.clone(),
                    reason: r.reason.clone(),
                    status: "pending".to_string(),
                    created_at: r.created_at,
                    expires_at: r.expires_at,
                })
                .collect();
            let resp = RefundPendingResponse {
                refunds: refund_infos,
            };
            json_ok(resp)
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to list pending refunds");
            let (status, body) =
                crate::errors::error_response(ErrorCode::DatabaseError, None, None);
            json_error(status, body)
        }
    }
}

/// POST /paywall/v1/nonce - Generate admin nonce
pub async fn create_nonce<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    Json(req): Json<NonceRequest>,
) -> impl IntoResponse {
    let now = Utc::now();
    // NONCE_TTL is a constant Duration, so conversion should always succeed
    // Using unwrap_or with a safe fallback of 5 minutes
    let expires_at = now
        + chrono::Duration::from_std(NONCE_TTL).unwrap_or_else(|_| chrono::Duration::minutes(5));
    let nonce_id = generate_nonce_id();

    // Empty string purpose acts as wildcard per spec 04-http-endpoints-refunds.md
    let purpose = req.purpose.clone().unwrap_or_default();
    let nonce = AdminNonce {
        id: nonce_id.clone(),
        tenant_id: tenant.tenant_id.clone(),
        purpose: purpose.clone(),
        created_at: now,
        expires_at,
        consumed_at: None,
    };

    let result = state.store.create_nonce(nonce).await;

    match result {
        Ok(_) => {
            let resp = NonceResponse {
                nonce: nonce_id,
                expires_at: expires_at.timestamp(),
                purpose,
            };
            json_ok(resp)
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to create nonce");
            let (status, body) =
                crate::errors::error_response(ErrorCode::DatabaseError, None, None);
            json_error(status, body)
        }
    }
}

/// GET /paywall/v1/refunds/{refundId} - Get refund status
pub async fn get_refund<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    Path(refund_id): Path<String>,
) -> impl IntoResponse {
    // VAL-002: Validate refund_id before database query
    if let Err(e) = validate_resource_id(&refund_id) {
        let (status, body) = crate::errors::error_response(
            ErrorCode::InvalidField,
            Some(format!("invalid refund_id: {}", e)),
            None,
        );
        return json_error(status, body);
    }

    let result = state
        .store
        .get_refund_quote(&tenant.tenant_id, &refund_id)
        .await;

    match result {
        Ok(Some(refund)) => {
            // Determine status: denied, processed (approved), or pending
            let status = if refund.is_denied() {
                "denied"
            } else if refund.is_processed() {
                "processed"
            } else {
                "pending"
            };
            let resp = serde_json::json!({
                "refundId": refund.id,
                "status": status,
                "originalPurchaseId": refund.original_purchase_id,
                "recipientWallet": refund.recipient_wallet,
                "amount": refund.amount.to_major(),
                "token": refund.amount.asset.code,
                "reason": refund.reason,
                "createdAt": refund.created_at,
                "processedAt": refund.processed_at,
                "processedBy": refund.processed_by,
                "signature": refund.signature
            });
            (StatusCode::OK, Json(resp))
        }
        Ok(None) => {
            let (status, body) = crate::errors::error_response(
                ErrorCode::RefundNotFound,
                Some("Refund not found".to_string()),
                None,
            );
            json_error(status, body)
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to get refund");
            let (status, body) =
                crate::errors::error_response(ErrorCode::DatabaseError, None, None);
            json_error(status, body)
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Convert nonce error string to appropriate ErrorCode
fn nonce_error_to_code(err: &str) -> ErrorCode {
    if err.contains("nonce_not_found") {
        ErrorCode::NonceNotFound
    } else if err.contains("nonce_expired") {
        ErrorCode::NonceExpired
    } else if err.contains("nonce_already_used") {
        ErrorCode::NonceAlreadyUsed
    } else if err.contains("invalid_nonce_purpose") {
        ErrorCode::InvalidNoncePurpose
    } else {
        ErrorCode::InternalError
    }
}

async fn validate_and_consume_nonce<S: Store>(
    store: &Arc<S>,
    tenant_id: &str,
    nonce_id: &str,
    expected_purpose: &str,
) -> Result<(), String> {
    let nonce = store
        .get_nonce(tenant_id, nonce_id)
        .await
        .map_err(|e| format!("nonce_not_found: {}", e))?
        .ok_or("nonce_not_found")?;

    let now = Utc::now();

    if nonce.expires_at < now {
        return Err("nonce_expired".to_string());
    }

    if nonce.consumed_at.is_some() {
        return Err("nonce_already_used".to_string());
    }

    // SECURITY: Reject empty purpose — must not act as wildcard.
    if nonce.purpose.is_empty() || nonce.purpose != expected_purpose {
        return Err("invalid_nonce_purpose".to_string());
    }

    // Consume nonce atomically - storage layer will reject if already consumed
    // This provides defense-in-depth against TOCTOU races between the check above
    // and this consume operation
    match store.consume_nonce(tenant_id, nonce_id).await {
        Ok(()) => Ok(()),
        Err(crate::storage::StorageError::Conflict)
        | Err(crate::storage::StorageError::NotFound) => {
            // Nonce was consumed between our check and consume (race condition).
            // NotFound is returned when the atomic UPDATE affects 0 rows because
            // consumed_at IS NULL condition failed (already consumed).
            Err("nonce_already_used".to_string())
        }
        Err(e) => Err(format!("consume_failed: {}", e)),
    }
}
