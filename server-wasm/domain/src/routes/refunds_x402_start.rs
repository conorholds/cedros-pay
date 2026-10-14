use serde_json::json;

use crate::blockchain_config;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedBatchOutcome;
use crate::ids;
use crate::reqresp::RouteResponse;
use crate::routes::refunds::{store, RefundRow};
use crate::seams::HostSeams;
use crate::{time, x402};

use super::super::model::{RefundSettlementEvidence, RefundSigningAttempt};
use super::support::read_original;

/// Start or replay the one Core-managed signing operation for a pending refund.
/// The exact request is guarded into the refund row before provider egress. A
/// lost response therefore retries the same refund id, blockhash, and bytes.
pub(super) fn execute<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    stored: &mut store::Versioned<RefundRow>,
    refund_id: &str,
) -> AppResult<RouteResponse> {
    let original = read_original(db, &stored.value.original_purchase_id)?
        .ok_or_else(|| AppError::not_found("original payment not found"))?;
    validate_original(&stored.value, &original.value)?;
    ensure_attempt(seams, db, stored, &original, refund_id)?;
    let attempt = stored
        .value
        .signing_attempt
        .clone()
        .ok_or_else(|| AppError::internal("refund signing attempt was not persisted"))?;
    let payload = serde_json::to_string(&attempt.request).map_err(|error| {
        AppError::internal("cannot encode x402 refund signing request")
            .with_internal(error.to_string())
    })?;
    let raw = seams
        .provider_execute(
            ids::PROVIDER_BLOCKCHAIN_X402_REFUND,
            ids::PROVIDER_BLOCKCHAIN,
            ids::OP_BLOCKCHAIN_X402_REFUND,
            &payload,
        )
        .map_err(|error| {
            AppError::new(
                503,
                "refund_signer_unavailable",
                "x402 refund signing is temporarily unavailable; retry this refund",
            )
            .with_internal(error.message)
        })?;
    let response = x402::refund::validate_response(
        &raw,
        &attempt.request,
        &attempt.signer_wallet_id,
        &attempt.signer_public_key,
    )
    .map_err(|message| {
        AppError::new(
            502,
            "refund_signer_invalid_response",
            "x402 refund signing returned an invalid response; retry this refund",
        )
        .with_internal(message)
    })?;
    persist_response(seams, db, stored, refund_id, response.clone())?;

    if response.status == "submitted" || response.status == "indeterminate" {
        return Ok(submitted_response(stored, &response));
    }
    if response.status == "failed" {
        return Err(response_error(&response));
    }
    Err(AppError::internal("unreachable x402 refund response state"))
}

fn validate_original(row: &RefundRow, original: &crate::models::LedgerEntry) -> AppResult<()> {
    if original.kind != "payment"
        || original.provider != "x402"
        || original.status != "succeeded"
        || original.net_cents() <= 0
    {
        return Err(AppError::unprocessable(
            "original x402 payment is no longer refundable",
        ));
    }
    let payer = original
        .payer_wallet
        .as_deref()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::unprocessable("original payment has no payer wallet"))?;
    if payer != row.recipient_wallet {
        return Err(AppError::conflict(
            "refund recipient does not match the original payer",
        ));
    }
    if original.provider_ref.as_deref().is_none_or(str::is_empty) {
        return Err(AppError::unprocessable(
            "original payment has no Solana signature",
        ));
    }
    let settlement = original
        .token_settlement
        .as_ref()
        .ok_or_else(|| AppError::unprocessable("original payment has no token settlement"))?;
    if settlement.amount_atomic == 0 {
        return Err(AppError::unprocessable(
            "original payment has no refundable token amount",
        ));
    }
    Ok(())
}

fn ensure_attempt<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    stored: &mut store::Versioned<RefundRow>,
    original: &store::Versioned<crate::models::LedgerEntry>,
    refund_id: &str,
) -> AppResult<()> {
    if let Some(attempt) = &stored.value.signing_attempt {
        let settlement = original
            .value
            .token_settlement
            .as_ref()
            .ok_or_else(|| AppError::conflict("original refund terms are missing"))?;
        let signer = blockchain_config::ManagedX402Signer {
            wallet_id: attempt.signer_wallet_id.clone(),
            wallet_version_id: attempt.request.expected_wallet_version_id.clone(),
            public_key: attempt.signer_public_key.clone(),
            cluster: settlement
                .network
                .clone()
                .unwrap_or_else(|| attempt.request.cluster.clone()),
        };
        let expected = x402::refund::build_request(
            &signer,
            refund_id,
            &attempt.request.recent_blockhash,
            &settlement.mint,
            settlement.amount_atomic,
            settlement.decimals,
            &stored.value.recipient_wallet,
            original.value.provider_ref.as_deref().unwrap_or(""),
        )
        .map_err(|_| AppError::conflict("stored refund signing request is invalid"))?;
        if attempt.request != expected {
            return Err(AppError::conflict(
                "stored refund signing request differs from original payment",
            ));
        }
        return Ok(());
    }
    let control = blockchain_config::resolve_x402_control(
        seams,
        x402::config::payment_address(seams),
        x402::config::network(seams),
    )
    .map_err(|error| {
        AppError::new(
            503,
            "refund_signer_unavailable",
            "x402 refunds require an available Core-managed operational wallet",
        )
        .with_internal(format!("blockchain config unavailable: {}", error.message))
    })?;
    let signer = control.managed_signer.as_ref().ok_or_else(|| {
        AppError::new(
            503,
            "refund_signer_unavailable",
            "x402 refunds require a Core-managed operational wallet",
        )
    })?;
    x402::rpc::verify_cluster(seams, &control.rpc_url, &signer.cluster).map_err(|error| {
        AppError::new(
            502,
            "provider_unavailable",
            "refund RPC cluster check failed",
        )
        .with_internal(error.message)
    })?;
    let raw =
        seams.http_fetch(&x402::rpc::build_get_latest_blockhash(&control.rpc_url).to_string())?;
    let blockhash = x402::rpc::parse_latest_blockhash(&raw).map_err(|error| {
        AppError::new(
            502,
            "provider_unavailable",
            "could not prepare the x402 refund transaction",
        )
        .with_internal(error.message)
    })?;
    let settlement = original
        .value
        .token_settlement
        .as_ref()
        .ok_or_else(|| AppError::unprocessable("original payment has no token settlement"))?;
    let original_signature = original
        .value
        .provider_ref
        .as_deref()
        .ok_or_else(|| AppError::unprocessable("original payment has no Solana signature"))?;
    let request = x402::refund::build_request(
        signer,
        refund_id,
        &blockhash.blockhash,
        &settlement.mint,
        settlement.amount_atomic,
        settlement.decimals,
        &stored.value.recipient_wallet,
        original_signature,
    )
    .map_err(AppError::unprocessable)?;
    stored.value.signing_attempt = Some(RefundSigningAttempt {
        request,
        signer_wallet_id: signer.wallet_id.clone(),
        signer_public_key: signer.public_key.clone(),
        response: None,
    });
    let outcome = db.guarded_batch(
        &[
            store::version_condition(refund_id, &stored.version),
            store::version_condition(&stored.value.original_purchase_id, &original.version),
        ],
        &[store::write(refund_id, &stored.value)?],
    )?;
    match outcome {
        GuardedBatchOutcome::Applied { entries, .. } => {
            stored.version = store::written_version(&entries, refund_id)?;
            Ok(())
        }
        GuardedBatchOutcome::Conflict { .. } => {
            let current = store::read::<_, RefundRow>(db, refund_id)?
                .ok_or_else(|| AppError::conflict("refund disappeared while preparing"))?;
            if current.value.status == "pending" && current.value.signing_attempt.is_some() {
                *stored = current;
                Ok(())
            } else {
                Err(AppError::conflict(
                    "refund state changed while preparing the signing operation",
                ))
            }
        }
    }
}

fn persist_response<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    stored: &mut store::Versioned<RefundRow>,
    refund_id: &str,
    response: x402::refund::RefundResponse,
) -> AppResult<()> {
    let attempt = stored
        .value
        .signing_attempt
        .as_mut()
        .ok_or_else(|| AppError::internal("refund signing response has no request"))?;
    attempt.response = Some(response.clone());
    if response.has_signed_evidence() {
        stored.value.provider_ref = response.signature.clone();
        stored.value.settlement = Some(RefundSettlementEvidence {
            transaction_base64: response
                .signed_transaction_base64
                .clone()
                .ok_or_else(|| AppError::internal("signed refund omitted transaction bytes"))?,
            recent_blockhash: response
                .recent_blockhash
                .clone()
                .ok_or_else(|| AppError::internal("signed refund omitted its blockhash"))?,
            // The RPC verifier expects the cluster label, while Core's `network`
            // field names the Solana family for every cluster.
            network: response.cluster.clone(),
        });
        stored.value.status = if response.status == "failed" && !response.retryable {
            "failed".to_string()
        } else {
            "submitted".to_string()
        };
    } else if response.status == "failed" && !response.retryable {
        stored.value.status = "failed".to_string();
    }
    stored.value.processed_at = time::iso8601(seams.now_unix_secs());
    match db.guarded_batch(
        &[store::version_condition(refund_id, &stored.version)],
        &[store::write(refund_id, &stored.value)?],
    )? {
        GuardedBatchOutcome::Applied { entries, .. } => {
            stored.version = store::written_version(&entries, refund_id)?;
            Ok(())
        }
        GuardedBatchOutcome::Conflict { .. } => {
            let current = store::read::<_, RefundRow>(db, refund_id)?
                .ok_or_else(|| AppError::conflict("refund disappeared after signing"))?;
            let current_response = current
                .value
                .signing_attempt
                .as_ref()
                .and_then(|attempt| attempt.response.as_ref());
            if current_response.is_some_and(|value| same_operation_response(value, &response)) {
                *stored = current;
                Ok(())
            } else {
                Err(AppError::conflict(
                    "refund state changed after Core processed the signing operation; retry to converge",
                ))
            }
        }
    }
}

/// Concurrent Core calls for the same durable operation can differ only in the
/// observational `replayed` flag. Treat those responses as convergence, while
/// requiring every lifecycle and signed-evidence field to remain identical.
fn same_operation_response(
    current: &x402::refund::RefundResponse,
    incoming: &x402::refund::RefundResponse,
) -> bool {
    let mut current = current.clone();
    let mut incoming = incoming.clone();
    current.replayed = false;
    incoming.replayed = false;
    current == incoming
}

fn submitted_response(
    stored: &store::Versioned<RefundRow>,
    response: &x402::refund::RefundResponse,
) -> RouteResponse {
    RouteResponse::ok(&json!({
        "refundId": stored.value.reference,
        "status": "submitted",
        "providerStatus": response.status,
        "errorCode": response.error_code,
        "retryable": response.retryable,
        "signature": response.signature,
        "operationId": response.operation_id,
        "replayed": response.replayed,
        "message": "Refund submitted; confirmation is pending. Do not create another payout.",
    }))
}

fn response_error(response: &x402::refund::RefundResponse) -> AppError {
    let code = response
        .error_code
        .as_deref()
        .unwrap_or("refund_signer_failed");
    match code {
        "refund_signer_unavailable" => AppError::new(
            503,
            "refund_signer_unavailable",
            "x402 refund signing is temporarily unavailable; retry this refund",
        ),
        "managed_wallet_unavailable" => AppError::new(
            503,
            "managed_wallet_unavailable",
            "x402 refund signing is temporarily unavailable; retry this refund",
        ),
        "insufficient_balance" => AppError::new(
            503,
            "insufficient_balance",
            "the managed wallet has insufficient balance; the same signed refund will be reconciled",
        ),
        "wallet_rotated_or_unavailable" | "wallet_rotated_or_idempotency_conflict"
        | "idempotency_conflict" => AppError::new(
            409,
            "wallet_rotated_or_unavailable",
            "the refund wallet operation can no longer be changed",
        ),
        "mint_not_allowed" => AppError::new(
            422,
            "mint_not_allowed",
            "the managed wallet policy denied this refund",
        ),
        "refund_policy_denied" => AppError::new(
            422,
            "refund_policy_denied",
            "the managed wallet policy denied this refund",
        ),
        "blockhash_expired" => AppError::new(
            409,
            "blockhash_expired",
            "the signed refund expired and cannot be rebuilt",
        ),
        _ if response.retryable => AppError::new(
            503,
            "refund_signer_failed",
            "x402 refund processing is temporarily unavailable",
        )
        .with_internal(format!("Core refund error code: {code}")),
        _ => AppError::new(502, "refund_signer_failed", "x402 refund processing failed")
            .with_internal(format!("Core refund error code: {code}")),
    }
}
