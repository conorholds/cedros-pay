use serde_json::json;

use crate::blockchain_config;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::models::LedgerEntry;
use crate::reqresp::RouteResponse;
use crate::routes::refunds::{store, RefundRow};
use crate::seams::HostSeams;
use crate::time;
use crate::x402::rpc::Confirmation;

use super::support::{mark_failed, poll_confirmation, read_original};

pub(super) fn resume<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    stored: &store::Versioned<RefundRow>,
    refund_id: &str,
) -> AppResult<RouteResponse> {
    let signature = stored
        .value
        .provider_ref
        .clone()
        .ok_or_else(|| AppError::internal("submitted refund is missing its signature"))?;
    let original = read_original(db, &stored.value.original_purchase_id)?
        .ok_or_else(|| AppError::not_found("original payment not found"))?;
    let rpc_url = blockchain_config::read_solana_rpc_url(seams)
        .map_err(|_| AppError::new(503, "unavailable", "x402 RPC endpoint is not configured"))?;
    let mut current = store::Versioned {
        value: stored.value.clone(),
        version: stored.version.clone(),
    };
    finalize(
        seams,
        db,
        &mut current,
        &original,
        &signature,
        refund_id,
        &rpc_url,
    )
}

pub(super) fn finalize<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    stored: &mut store::Versioned<RefundRow>,
    original: &store::Versioned<LedgerEntry>,
    signature: &str,
    refund_id: &str,
    rpc_url: &str,
) -> AppResult<RouteResponse> {
    let evidence = stored.value.settlement.clone().ok_or_else(|| {
        AppError::new(
            503,
            "refund_evidence_unavailable",
            "submitted refund lacks exact signed transaction evidence; manual reconciliation is required",
        )
    })?;
    crate::x402::rpc::verify_cluster(seams, rpc_url, &evidence.network).map_err(|error| {
        AppError::new(
            502,
            "provider_unavailable",
            "refund RPC cluster check failed",
        )
        .with_internal(error.message)
    })?;
    match poll_confirmation(seams, rpc_url, signature)? {
        Confirmation::Confirmed | Confirmation::Finalized => {
            match crate::x402::rpc::load_confirmed_transaction(
                seams,
                rpc_url,
                signature,
                &evidence.transaction_base64,
            ) {
                Ok(crate::x402::rpc::ConfirmedTransaction::Succeeded) => {
                    settle(seams, db, stored, original, signature, refund_id)?;
                    Ok(settled_response(&stored.value))
                }
                Ok(crate::x402::rpc::ConfirmedTransaction::Failed(_)) => {
                    mark_failed(db, stored)?;
                    Err(AppError::new(
                        502,
                        "refund_transaction_failed",
                        "refund transaction failed on-chain and cannot be rebuilt",
                    ))
                }
                _ => Ok(submitted_response(&stored.value, signature)),
            }
        }
        Confirmation::Failed(_) => {
            match crate::x402::rpc::load_confirmed_transaction(
                seams,
                rpc_url,
                signature,
                &evidence.transaction_base64,
            ) {
                Ok(crate::x402::rpc::ConfirmedTransaction::Failed(_)) => {
                    mark_failed(db, stored)?;
                    Err(AppError::new(
                        502,
                        "refund_transaction_failed",
                        "refund transaction failed on-chain and cannot be rebuilt",
                    ))
                }
                _ => Ok(submitted_response(&stored.value, signature)),
            }
        }
        Confirmation::NotFound => {
            let raw = seams.http_fetch(
                &crate::x402::rpc::build_is_blockhash_valid(rpc_url, &evidence.recent_blockhash)
                    .to_string(),
            );
            match raw
                .ok()
                .and_then(|raw| crate::x402::rpc::parse_blockhash_valid(&raw).ok())
            {
                // Invalidation without a prior validity witness cannot prove expiry.
                Some(false) => Ok(submitted_response(&stored.value, signature)),
                Some(true) => {
                    let _ = seams.http_fetch(
                        &crate::x402::rpc::build_send_transaction(
                            rpc_url,
                            &evidence.transaction_base64,
                        )
                        .to_string(),
                    );
                    Ok(submitted_response(&stored.value, signature))
                }
                None => Ok(submitted_response(&stored.value, signature)),
            }
        }
        Confirmation::Processed => Ok(submitted_response(&stored.value, signature)),
    }
}

fn submitted_response(row: &RefundRow, signature: &str) -> RouteResponse {
    RouteResponse::ok(&json!({
        "refundId": row.reference, "status": "submitted",
        "signature": signature,
        "message": "Refund submitted; awaiting on-chain confirmation. Re-process to check.",
    }))
}

pub(super) fn settle<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    stored: &mut store::Versioned<RefundRow>,
    original: &store::Versioned<LedgerEntry>,
    signature: &str,
    refund_id: &str,
) -> AppResult<bool> {
    let processed_at = time::iso8601(seams.now_unix_secs());
    stored.value.status = "succeeded".to_string();
    stored.value.provider_ref = Some(signature.to_string());
    stored.value.processed_at = processed_at.clone();
    let mut refunded = original.value.clone();
    refunded.refund_cents = refunded.gross_cents;
    refunded.status = "refunded".to_string();
    let actions = super::effects::settled_actions(&stored.value, seams.now_unix_secs());
    let effect =
        crate::durable_effects::plan("x402-refund", refund_id, actions, seams.now_unix_secs())?
            .ok_or_else(|| AppError::internal("refund settlement effect plan is empty"))?;
    let effect_id = effect.effect_id.clone();
    let outcome = db.guarded_batch(
        &[
            store::version_condition(refund_id, &stored.version),
            store::version_condition(&stored.value.original_purchase_id, &original.version),
            effect.condition,
        ],
        &[
            store::write(refund_id, &stored.value)?,
            store::write(&stored.value.original_purchase_id, &refunded)?,
            effect.op,
        ],
    )?;
    match outcome {
        crate::guarded_batch::GuardedBatchOutcome::Applied { entries, .. } => {
            stored.version = store::written_version(&entries, refund_id)?;
            crate::durable_effects::dispatch_effect_best_effort(seams, &effect_id);
            Ok(true)
        }
        crate::guarded_batch::GuardedBatchOutcome::Conflict { .. } => {
            let current = store::read::<_, RefundRow>(db, refund_id)?
                .ok_or_else(|| AppError::conflict("refund changed while settling"))?;
            if current.value.status == "succeeded"
                && current.value.provider_ref.as_deref() == Some(signature)
            {
                stored.value = current.value;
                stored.version = current.version;
                Ok(false)
            } else {
                Err(AppError::conflict("refund changed while settling"))
            }
        }
    }
}

pub(super) fn settled_response(row: &RefundRow) -> RouteResponse {
    RouteResponse::ok(&json!({
        "refundId": row.reference, "status": "succeeded", "signature": row.provider_ref,
        "processedAt": row.processed_at, "amountCents": row.gross_cents,
    }))
}
