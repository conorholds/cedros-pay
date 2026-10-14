//! Admin-gated x402 refund coordination through Core's policy-bound signer:
//!
//! State machine on the stored refund row (`status`):
//! - `pending` → persist one immutable signing request before invoking Core.
//! - `submitted` → re-poll the **already-broadcast** signature and validate it
//!   against the exact persisted signed transaction; never rebuild with a fresh
//!   blockhash (that would be a second, distinct transfer = double refund).
//! - `succeeded` → idempotent: return the settled signature.
//!
//! A transaction that lands but fails on-chain (`err != null`) moved no tokens
//! (SPL transfers are atomic), so it becomes terminally `failed`. A broadcast transaction
//! that never confirms stays `submitted` and is finalized by the x402 reconcile job
//! ([`reconcile_submitted_refunds`]) — re-polled, never rebuilt, until it confirms,
//! or fails. When a missing transaction's exact persisted blockhash is still valid,
//! reconciliation rebroadcasts the same signed bytes. An authoritative expired
//! blockhash is terminal; RPC ambiguity keeps it `submitted`. Legacy rows
//! without exact evidence remain blocked for manual reconciliation and are never
//! repaid automatically.

use serde_json::json;

use crate::ctx::RequestContext;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;
use crate::time;

use super::{store, RefundRow};

#[path = "refunds_effects.rs"]
mod effects;
#[path = "refunds_x402_start.rs"]
mod start;
#[path = "refunds_x402_state.rs"]
mod state;
#[path = "refunds_x402_support.rs"]
mod support;
pub(crate) use support::reconcile_submitted_refunds;

/// `POST /admin/refunds/{refundId}/process` — resume a previously submitted x402
/// refund or start the one durable Core-managed signing operation.
pub(super) fn process<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let ctx = RequestContext::parse(&req.context_json);
    // Same gate as the Stripe/credits admin refunds: Pay-admin authority + CSRF.
    ctx.require_claim(ids::ROUTE_ADMIN)?;
    ctx.require_admin_write()?;

    let refund_id = refund_id_from_process_path(&req.path)
        .ok_or_else(|| AppError::not_found("refund not found"))?;
    let db = Db::new(seams, ids::DB_ACCESS);
    let mut stored = store::read::<_, RefundRow>(&db, refund_id)?
        .ok_or_else(|| AppError::not_found("refund not found"))?;
    if stored.value.provider != "x402" {
        return Err(AppError::unprocessable("not an x402 refund"));
    }

    match stored.value.status.as_str() {
        // Already settled: return the on-chain signature (idempotent).
        "succeeded" => {
            let occurred_at = time::parse_iso(&stored.value.processed_at)
                .ok_or_else(|| AppError::internal("settled refund has an invalid processedAt"))?;
            crate::durable_effects::ensure(
                &db,
                "x402-refund",
                refund_id,
                effects::settled_actions(&stored.value, occurred_at),
                occurred_at,
            )?;
            crate::durable_effects::dispatch_best_effort(seams, "x402-refund", refund_id);
            Ok(state::settled_response(&stored.value))
        }
        // Broadcast earlier but unconfirmed when we last looked: re-poll only.
        "submitted" => state::resume(seams, &db, &stored, refund_id),
        // Fresh request: prepare and invoke the durable host-owned operation.
        "pending" => start::execute(seams, &db, &mut stored, refund_id),
        other => Err(AppError::unprocessable(format!(
            "refund is not processable in status {other}"
        ))),
    }
}

/// `POST /admin/refunds/{refundId}/deny` — host-admin-gated rejection of a still-pending
/// x402 refund request, moving it to a terminal `denied` state (so it stops inflating the
/// pending-refunds queue and the request idempotency guard won't reopen it). Only a
/// `pending` refund may be denied — a `submitted`/`succeeded` refund has funds in flight
/// or already settled and must not be silently rejected.
pub(super) fn deny<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let ctx = RequestContext::parse(&req.context_json);
    ctx.require_claim(ids::ROUTE_ADMIN)?;
    ctx.require_admin_write()?;

    let refund_id = refund_id_from_process_path(&req.path)
        .ok_or_else(|| AppError::not_found("refund not found"))?;
    let db = Db::new(seams, ids::DB_ACCESS);
    let mut stored = store::read::<_, RefundRow>(&db, refund_id)?
        .ok_or_else(|| AppError::not_found("refund not found"))?;
    if stored.value.provider != "x402" {
        return Err(AppError::unprocessable("not an x402 refund"));
    }
    if stored.value.status == "denied" {
        return Ok(denied_response(&stored.value));
    }
    if stored.value.status != "pending" {
        return Err(AppError::unprocessable(format!(
            "only a pending refund can be denied (status is {})",
            stored.value.status
        )));
    }
    if stored.value.signing_attempt.is_some() {
        return Err(AppError::unprocessable(
            "a refund with a started signing operation cannot be denied; retry Process to reconcile it",
        ));
    }
    stored.value.status = "denied".to_string();
    stored.value.processed_at = time::iso8601(seams.now_unix_secs());
    let outcome = db.guarded_batch(
        &[store::version_condition(refund_id, &stored.version)],
        &[store::write(refund_id, &stored.value)?],
    )?;
    match outcome {
        crate::guarded_batch::GuardedBatchOutcome::Applied { .. } => {
            Ok(denied_response(&stored.value))
        }
        crate::guarded_batch::GuardedBatchOutcome::Conflict { .. } => {
            let current = store::read::<_, RefundRow>(&db, refund_id)?
                .ok_or_else(|| AppError::conflict("refund changed while denying"))?;
            if current.value.status == "denied" {
                Ok(denied_response(&current.value))
            } else {
                Err(AppError::conflict("refund changed while denying"))
            }
        }
    }
}

fn denied_response(row: &RefundRow) -> RouteResponse {
    RouteResponse::ok(&json!({ "refundId": row.reference, "status": "denied" }))
}

/// Extract `{refundId}` from `/admin/refunds/{refundId}/{process|deny}` (the id is the
/// first path segment after the marker, so the trailing action does not matter).
fn refund_id_from_process_path(path: &str) -> Option<&str> {
    const MARKER: &str = "/admin/refunds/";
    let start = path.find(MARKER)? + MARKER.len();
    let rest = &path[start..];
    let id = rest.strip_suffix("/process").unwrap_or(rest);
    let id = id.split('/').next().unwrap_or("");
    (!id.is_empty()).then_some(id)
}

#[cfg(test)]
#[path = "refunds_execute_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "refunds_reconcile_tests.rs"]
mod reconcile_tests;

#[cfg(test)]
#[path = "refunds_guarded_tests.rs"]
mod guarded_tests;
