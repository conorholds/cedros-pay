//! `cedros-pay:x402-reconcile` — finalize pending x402 crypto payments.
//!
//! `/verify` persists a `pending` ledger row when a submitted Solana transaction
//! has not reached `confirmed` commitment within the request's bounded poll. This
//! job re-checks each pending x402 row against the chain (`getSignatureStatuses`
//! over the `http_fetch` seam) and, on confirmation, marks it `succeeded` and
//! fires the same settlement events `/verify` would have — payment-succeeded(x402)
//! and entitlement-changed. Bounded by `batchSize`; idempotent (a row leaves the
//! `pending` set once confirmed, so it is never settled twice).

use serde_json::{json, Value};

use crate::blockchain_config;
use crate::db::{Db, Dir, Filter, Op, Query};
use crate::error::AppResult;
use crate::ids;
use crate::models::LedgerEntry;
use crate::reqresp::{JobExecution, JobOutcome};
use crate::seams::HostSeams;
use crate::x402;

pub fn run<S: HostSeams>(seams: &S, exec: &JobExecution) -> AppResult<JobOutcome> {
    let batch_size = exec
        .metadata()
        .get("batchSize")
        .and_then(Value::as_i64)
        .unwrap_or(25)
        .clamp(1, 100);

    let Ok(rpc_url) = blockchain_config::read_solana_rpc_url(seams) else {
        return Ok(JobOutcome::succeeded(
            json!({ "confirmed": 0, "failed": 0, "skipped": "Solana RPC not configured" }),
        ));
    };

    let db = Db::new(seams, ids::DB_ACCESS);
    // `kind == payment` is load-bearing: x402 refund-request rows are also
    // `status=pending, provider=x402` (see `routes::refunds`), but their `reference`
    // is a refund id, not an on-chain signature. Sweeping them would feed refund ids
    // to `getSignatureStatuses` and, on any non-`null` reply, mis-finalize a refund as
    // a settled payment. The refund state machine is owned solely by
    // `routes::refunds_execute` (it keys off the stored signature, never `reference`).
    let pending = Query::new()
        .filter(Filter::new("kind", Op::Eq, "payment"))
        .filter(Filter::new("status", Op::Eq, "pending"))
        .filter(Filter::new("provider", Op::Eq, "x402"))
        .order("createdAt", Dir::Asc)
        .limit(batch_size);
    let (mut scan, rows) =
        crate::reconciliation_scan::Scan::load(&db, "x402-payments", ids::MODEL_LEDGER, &pending)?;

    let now = seams.now_unix_secs();
    let (mut confirmed, mut failed, mut still_pending, expired) = (0i64, 0i64, 0i64, 0i64);
    let budget = crate::work_budget::WorkBudget::new(seams);
    for record in rows {
        if budget.exhausted(seams, 25) {
            break;
        }
        scan.advance(&db)?;
        let entry: LedgerEntry = match record.parse() {
            Ok(e) => e,
            Err(_) => continue,
        };
        let prepared = match crate::routes::x402_payment_store::resume(&db, record, entry) {
            Ok(prepared) => prepared,
            Err(_) => {
                still_pending += 1;
                continue;
            }
        };
        let Some(evidence) = prepared.entry.token_settlement.as_ref() else {
            still_pending += 1;
            continue;
        };
        let (Some(transaction), Some(recent_blockhash), Some(network)) = (
            evidence.transaction_base64.as_deref(),
            evidence.recent_blockhash.as_deref(),
            evidence.network.as_deref(),
        ) else {
            // Legacy pending rows do not contain enough evidence to recognize a
            // payment safely. A client retry can repopulate a new-format row.
            still_pending += 1;
            continue;
        };
        if x402::rpc::verify_cluster(seams, &rpc_url, network).is_err() {
            still_pending += 1;
            continue;
        }
        let raw = match seams.http_fetch(
            &x402::rpc::build_get_signature_statuses(&rpc_url, &prepared.entry.reference)
                .to_string(),
        ) {
            Ok(r) => r,
            Err(_) => {
                still_pending += 1;
                continue;
            }
        };
        match x402::rpc::parse_signature_status(&raw) {
            Ok(x402::rpc::Confirmation::Confirmed)
            | Ok(x402::rpc::Confirmation::Finalized)
            | Ok(x402::rpc::Confirmation::Failed(_)) => {
                match x402::rpc::load_confirmed_transaction(
                    seams,
                    &rpc_url,
                    &prepared.entry.reference,
                    transaction,
                ) {
                    Ok(x402::rpc::ConfirmedTransaction::Succeeded) => {
                        let actions = crate::routes::x402_payment_store::settlement_actions(
                            &prepared.entry.reference,
                            prepared.entry.gross_cents,
                            &prepared.entry.currency,
                            prepared.entry.customer_profile_id.as_deref(),
                            prepared.entry.product_id.as_deref(),
                            &ledger_crm_object(&prepared.entry),
                            now,
                        );
                        let applied = crate::routes::x402_payment_store::transition_with_effects(
                            &db,
                            &prepared,
                            "succeeded",
                            now,
                            actions,
                        )?;
                        if !applied {
                            continue;
                        }
                        confirmed += 1;
                    }
                    Ok(x402::rpc::ConfirmedTransaction::Failed(_)) => {
                        if crate::routes::x402_payment_store::transition(
                            &db, &prepared, "failed", now,
                        )? {
                            failed += 1;
                        }
                    }
                    _ => still_pending += 1,
                }
            }
            Ok(x402::rpc::Confirmation::NotFound) => {
                let blockhash_valid = seams
                    .http_fetch(
                        &x402::rpc::build_is_blockhash_valid(&rpc_url, recent_blockhash)
                            .to_string(),
                    )
                    .ok()
                    .and_then(|raw| x402::rpc::parse_blockhash_valid(&raw).ok());
                match blockhash_valid {
                    // No persisted validity witness: invalid can mean the RPC is behind.
                    Some(false) => still_pending += 1,
                    Some(true) => {
                        // A transport timeout after sendTransaction is ambiguous: the
                        // node may never have accepted the transaction. Re-broadcasting
                        // the exact persisted bytes is safe because it has the same
                        // signature and cannot create a second transfer.
                        let _ = seams.http_fetch(
                            &x402::rpc::build_send_transaction(&rpc_url, transaction).to_string(),
                        );
                        still_pending += 1;
                    }
                    None => still_pending += 1,
                }
            }
            // Still unconfirmed (or an RPC error) — leave it for the next run.
            _ => still_pending += 1,
        }
    }

    // Reconcile broadcast-but-unconfirmed x402 refunds: settle exact confirmed
    // bytes and terminally fail finalized execution failures. Core never rebuilds
    // an accepted refund id with a fresh blockhash.
    let (refunds_settled, refunds_failed) =
        crate::routes::refunds::reconcile_submitted_refunds(seams, &db, &rpc_url, batch_size)?;
    let (passes_finalized, passes_failed, passes_pending) =
        crate::routes::access_pass_jobs::reconcile_pending(seams, batch_size)?;

    Ok(JobOutcome::succeeded(json!({
        "confirmed": confirmed,
        "failed": failed,
        "stillPending": still_pending,
        "expired": expired,
        "refundsSettled": refunds_settled,
        "refundsFailed": refunds_failed,
        // Compatibility for existing dashboards: accepted Core operations are
        // never reset now, so this legacy counter is permanently zero.
        "refundsReset": 0,
        "accessPassesFinalized": passes_finalized,
        "accessPassesFailed": passes_failed,
        "accessPassesPending": passes_pending,
    })))
}

/// CRM purchase object from a confirmed ledger row (the original X-PAYMENT metadata is
/// gone by reconcile time, so the buyer id / product come from the row). CRM fires only
/// when an identity is present, so anonymous wallet pays are skipped — same as `/verify`.
fn ledger_crm_object(entry: &LedgerEntry) -> Value {
    let mut metadata = serde_json::Map::new();
    if let Some(uid) = &entry.customer_profile_id {
        metadata.insert("userId".to_string(), Value::String(uid.clone()));
    }
    if let Some(pid) = &entry.product_id {
        metadata.insert("productId".to_string(), Value::String(pid.clone()));
    }
    json!({ "metadata": Value::Object(metadata) })
}

#[cfg(test)]
#[path = "x402_reconcile_tests.rs"]
mod tests;
