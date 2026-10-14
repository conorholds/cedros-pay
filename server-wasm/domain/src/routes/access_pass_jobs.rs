//! Scheduled reconciliation and ephemeral-state cleanup for access passes.

use crate::blockchain_config;
use crate::db::{BatchOp, Db, Dir, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::models::{AccessPassRecord, LedgerEntry};
use crate::seams::HostSeams;
use crate::x402;

pub(crate) fn reconcile_pending<S: HostSeams>(seams: &S, limit: i64) -> AppResult<(i64, i64, i64)> {
    let rpc_url = match blockchain_config::read_solana_rpc_url(seams) {
        Ok(value) => value,
        Err(_) => return Ok((0, 0, 0)),
    };
    let db = Db::new(seams, ids::DB_ACCESS);
    let (mut scan, rows) = crate::reconciliation_scan::Scan::load(
        &db,
        "access-pass-payments",
        ids::MODEL_ACCESS_PASSES,
        &Query::new()
            .filter(Filter::new("status", Op::Eq, "pending"))
            .order("createdAt", Dir::Asc)
            .limit(limit.clamp(1, 100)),
    )?;
    let mut finalized = 0;
    let mut failed = 0;
    let mut pending = 0;
    let budget = crate::work_budget::WorkBudget::new(seams);
    for pass_row in rows {
        if budget.exhausted(seams, 25) {
            break;
        }
        scan.advance(&db)?;
        let pass: AccessPassRecord = match pass_row.parse() {
            Ok(value) => value,
            Err(_) => continue,
        };
        let Some(ledger_row) = db.read_one(ids::MODEL_LEDGER, &pass.payment_reference)? else {
            pending += 1;
            continue;
        };
        let ledger: LedgerEntry = match ledger_row.parse() {
            Ok(value) => value,
            Err(_) => {
                pending += 1;
                continue;
            }
        };
        if pass.status != "pending" || ledger.status != "pending" {
            continue;
        }
        let Some(evidence) = ledger.token_settlement.as_ref() else {
            pending += 1;
            continue;
        };
        let (Some(transaction), Some(recent_blockhash), Some(network)) = (
            evidence.transaction_base64.as_deref(),
            evidence.recent_blockhash.as_deref(),
            evidence.network.as_deref(),
        ) else {
            pending += 1;
            continue;
        };
        if x402::rpc::verify_cluster(seams, &rpc_url, network).is_err() {
            pending += 1;
            continue;
        }
        let raw = match seams.http_fetch(
            &x402::rpc::build_get_signature_statuses(&rpc_url, &pass.payment_reference).to_string(),
        ) {
            Ok(value) => value,
            Err(_) => {
                pending += 1;
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
                    &pass.payment_reference,
                    transaction,
                ) {
                    Ok(x402::rpc::ConfirmedTransaction::Succeeded) => {
                        super::access_pass_purchase::finalize(
                            &db,
                            (pass.clone(), pass_row, ledger, ledger_row),
                            seams.now_unix_secs(),
                            pass.offer.duration_seconds,
                        )?;
                        finalized += 1;
                    }
                    Ok(x402::rpc::ConfirmedTransaction::Failed(_)) => {
                        match super::access_pass_purchase::fail(
                            &db,
                            (pass, pass_row, ledger, ledger_row),
                            seams.now_unix_secs(),
                        ) {
                            Err(error) if error.code == "payment_failed" => failed += 1,
                            Err(error) => return Err(error),
                            Ok(_) => failed += 1,
                        }
                    }
                    _ => pending += 1,
                }
            }
            Ok(x402::rpc::Confirmation::NotFound) => {
                let blockhash_valid = seams
                    .http_fetch(
                        &x402::rpc::build_is_blockhash_valid(&rpc_url, recent_blockhash)
                            .to_string(),
                    )
                    .ok()
                    .and_then(|value| x402::rpc::parse_blockhash_valid(&value).ok());
                match blockhash_valid {
                    // No persisted validity witness: invalid can mean the RPC is behind.
                    Some(false) => pending += 1,
                    Some(true) => {
                        // Only replay the exact signed transaction captured with the
                        // pending purchase. Its signature is stable, so restarts and
                        // repeated job runs cannot create another payment.
                        let _ = seams.http_fetch(
                            &x402::rpc::build_send_transaction(&rpc_url, transaction).to_string(),
                        );
                        pending += 1;
                    }
                    None => pending += 1,
                }
            }
            _ => pending += 1,
        }
    }
    Ok((finalized, failed, pending))
}

pub(crate) fn cleanup_expired<S: HostSeams>(seams: &S, limit: i64) -> AppResult<i64> {
    let db = Db::new(seams, ids::DB_ACCESS);
    let now_ms = seams.now_unix_secs() * 1000;
    let mut rows = Vec::new();
    for kind in ["payment_challenge", "request_nonce", "request_usage"] {
        rows.extend(
            db.read(
                ids::MODEL_ACCESS_PASSES,
                &Query::new()
                    .filter(Filter::new("kind", Op::Eq, kind))
                    .filter(Filter::new("expiresAtMs", Op::Lt, now_ms))
                    .limit(limit.clamp(1, 100)),
            )?,
        );
    }
    let mut deleted = 0;
    for row in rows {
        let condition = version_guard(ids::MODEL_ACCESS_PASSES, &row)?;
        let outcome = db.guarded_batch(
            &[condition],
            &[BatchOp::Delete {
                content_model_id: ids::MODEL_ACCESS_PASSES,
                entry_key: row.entry_key,
            }],
        )?;
        if matches!(outcome, GuardedBatchOutcome::Applied { .. }) {
            deleted += 1;
        }
    }
    Ok(deleted)
}

fn version_guard(model: &'static str, row: &crate::db::EntryRecord) -> AppResult<GuardedCondition> {
    Ok(GuardedCondition::Version {
        content_model_id: model,
        entry_key: row.entry_key.clone(),
        expected_version: row
            .version
            .clone()
            .ok_or_else(|| AppError::internal("database entry omitted concurrency version"))?,
    })
}
