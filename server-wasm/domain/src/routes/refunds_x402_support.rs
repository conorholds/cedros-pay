use crate::db::{Db, Dir, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::models::LedgerEntry;
use crate::seams::HostSeams;
use crate::x402::{self, rpc::Confirmation};

use super::state::settle;
use crate::routes::refunds::{store, RefundRow};

const CONFIRM_ATTEMPTS: usize = 6;

pub(super) fn poll_confirmation<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    signature: &str,
) -> AppResult<Confirmation> {
    let mut last = Confirmation::NotFound;
    for _ in 0..CONFIRM_ATTEMPTS {
        let raw = seams
            .http_fetch(&x402::rpc::build_get_signature_statuses(rpc_url, signature).to_string())?;
        last = x402::rpc::parse_signature_status(&raw).map_err(|error| {
            AppError::new(502, "provider_unavailable", "confirmation check failed")
                .with_internal(error.message)
        })?;
        if matches!(
            last,
            Confirmation::Confirmed | Confirmation::Finalized | Confirmation::Failed(_)
        ) {
            break;
        }
    }
    Ok(last)
}

pub(crate) fn reconcile_submitted_refunds<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    rpc_url: &str,
    batch_size: i64,
) -> AppResult<(i64, i64)> {
    let query = Query::new()
        .filter(Filter::new("kind", Op::Eq, "refund"))
        .filter(Filter::new("status", Op::Eq, "submitted"))
        .filter(Filter::new("provider", Op::Eq, "x402"))
        .order("createdAt", Dir::Asc)
        .limit(batch_size);
    let mut counts = (0, 0);
    let (mut scan, rows) =
        crate::reconciliation_scan::Scan::load(db, "x402-refunds", ids::MODEL_LEDGER, &query)?;
    let budget = crate::work_budget::WorkBudget::new(seams);
    for record in rows {
        if budget.exhausted(seams, 25) {
            break;
        }
        scan.advance(db)?;
        let Ok(row) = record.parse::<RefundRow>() else {
            continue;
        };
        let Some(version) = record.version.filter(|value| !value.is_empty()) else {
            return Err(AppError::internal(
                "submitted refund is missing its version",
            ));
        };
        let mut stored = store::Versioned {
            value: row,
            version,
        };
        let Some(signature) = stored.value.provider_ref.clone() else {
            continue;
        };
        reconcile_one(seams, db, rpc_url, &signature, &mut stored, &mut counts)?;
    }
    Ok(counts)
}

fn reconcile_one<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    rpc_url: &str,
    signature: &str,
    stored: &mut store::Versioned<RefundRow>,
    counts: &mut (i64, i64),
) -> AppResult<()> {
    let Some(evidence) = stored.value.settlement.clone() else {
        // Legacy submitted rows lack the exact bytes needed to prove identity.
        // Retain them for manual reconciliation; never guess and never repay.
        return Ok(());
    };
    if x402::rpc::verify_cluster(seams, rpc_url, &evidence.network).is_err() {
        return Ok(());
    }
    match check_signature(seams, rpc_url, signature)? {
        Confirmation::Confirmed | Confirmation::Finalized => {
            match x402::rpc::load_confirmed_transaction(
                seams,
                rpc_url,
                signature,
                &evidence.transaction_base64,
            ) {
                Ok(x402::rpc::ConfirmedTransaction::Succeeded) => {
                    if let Some(original) = read_original(db, &stored.value.original_purchase_id)? {
                        let refund_id = stored.value.reference.clone();
                        if settle(seams, db, stored, &original, signature, &refund_id)? {
                            counts.0 += 1;
                        }
                    }
                }
                Ok(x402::rpc::ConfirmedTransaction::Failed(_)) => {
                    counts.1 += i64::from(mark_failed(db, stored)?);
                }
                _ => {}
            }
        }
        Confirmation::Failed(_) => {
            if matches!(
                x402::rpc::load_confirmed_transaction(
                    seams,
                    rpc_url,
                    signature,
                    &evidence.transaction_base64,
                ),
                Ok(x402::rpc::ConfirmedTransaction::Failed(_))
            ) {
                counts.1 += i64::from(mark_failed(db, stored)?);
            }
        }
        Confirmation::NotFound => {
            let blockhash_valid = seams
                .http_fetch(
                    &x402::rpc::build_is_blockhash_valid(rpc_url, &evidence.recent_blockhash)
                        .to_string(),
                )
                .ok()
                .and_then(|raw| x402::rpc::parse_blockhash_valid(&raw).ok());
            match blockhash_valid {
                Some(false) => {} // Unknown/too-new blockhash is not proof of expiry.
                Some(true) => {
                    let _ = seams.http_fetch(
                        &x402::rpc::build_send_transaction(rpc_url, &evidence.transaction_base64)
                            .to_string(),
                    );
                }
                None => {}
            }
        }
        Confirmation::Processed => {}
    }
    Ok(())
}

pub(super) fn mark_failed<S: HostSeams>(
    db: &Db<'_, S>,
    stored: &mut store::Versioned<RefundRow>,
) -> AppResult<bool> {
    // Core never rebuilds an accepted refund operation. Preserve its signature,
    // exact bytes, and request evidence even when the transaction failed or its
    // blockhash expired, then make the operation terminal in Pay as well.
    stored.value.status = "failed".to_string();
    let key = stored.value.reference.clone();
    match db.guarded_batch(
        &[store::version_condition(&key, &stored.version)],
        &[store::write(&key, &stored.value)?],
    )? {
        crate::guarded_batch::GuardedBatchOutcome::Applied { entries, .. } => {
            stored.version = store::written_version(&entries, &key)?;
            Ok(true)
        }
        crate::guarded_batch::GuardedBatchOutcome::Conflict { .. } => Ok(false),
    }
}

pub(super) fn read_original<S: HostSeams>(
    db: &Db<'_, S>,
    reference: &str,
) -> AppResult<Option<store::Versioned<LedgerEntry>>> {
    store::read(db, reference)
}

fn check_signature<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    signature: &str,
) -> AppResult<Confirmation> {
    let raw = seams
        .http_fetch(&x402::rpc::build_get_signature_statuses(rpc_url, signature).to_string())?;
    x402::rpc::parse_signature_status(&raw).map_err(|error| {
        AppError::new(502, "provider_unavailable", "confirmation check failed")
            .with_internal(error.message)
    })
}
