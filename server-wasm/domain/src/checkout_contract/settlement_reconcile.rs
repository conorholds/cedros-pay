use crate::db::{Db, Dir, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

use super::inventory_types::{HoldRecord, HoldStatus, InventoryReservationContext};
use super::record::OperationRecord;
use super::{CanonicalPaymentOutcome, DurableOutcome, INVENTORY_HOLD_MODEL, OPERATION_MODEL};

#[derive(Debug, Default, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReconcileReport {
    pub scanned: usize,
    pub released: usize,
    pub committed: usize,
    pub deferred: usize,
}

/// Bounded, restart-safe settlement maintenance. Paid commits require exact
/// provider/chain evidence or an existing succeeded ledger fact. Release needs
/// durable terminal proof or an expired unbound quote hold.
pub(super) fn run<S: HostSeams>(seams: &S, limit: i64) -> AppResult<ReconcileReport> {
    let budget = crate::work_budget::WorkBudget::new(seams);
    let db = Db::new(seams, crate::ids::DB_ACCESS);
    let per_state_limit = limit.clamp(1, 100);
    let mut report = ReconcileReport::default();
    let pending = Query::new()
        .filter(Filter::new("operation", Op::Eq, "checkout"))
        .filter(Filter::new("settlementState", Op::Eq, "pending"))
        .order("createdAt", Dir::Asc)
        .limit(per_state_limit);
    let (mut scan, rows) = crate::reconciliation_scan::Scan::load(
        &db,
        "canonical-checkouts",
        OPERATION_MODEL,
        &pending,
    )?;
    for row in rows {
        if budget.exhausted(seams, 40) {
            break;
        }
        scan.advance(&db)?;
        report.scanned += 1;
        let record: OperationRecord = row.parse()?;
        super::record::validate_stored_outcome(&record)?;
        match reconcile_pending(seams, &row.entry_key, &record)? {
            PendingResult::Released => report.released += 1,
            PendingResult::Committed => report.committed += 1,
            PendingResult::Deferred => report.deferred += 1,
        }
    }
    // Unbound quote reservations have no checkout operation to sweep.
    let expired = Query::new()
        .filter(Filter::new("status", Op::Eq, "active"))
        .filter(Filter::new("expiresAt", Op::Lt, seams.now_unix_secs()))
        .order("expiresAt", Dir::Asc)
        .limit(per_state_limit);
    let (mut scan, rows) = crate::reconciliation_scan::Scan::load(
        &db,
        "expired-quote-holds",
        INVENTORY_HOLD_MODEL,
        &expired,
    )?;
    for row in rows {
        scan.advance(&db)?;
        report.scanned += 1;
        let hold: HoldRecord = row.parse()?;
        if hold.status != HoldStatus::Active || seams.now_unix_secs() <= hold.expires_at {
            return Err(AppError::internal(
                "settlement candidate query returned an ineligible hold",
            ));
        }
        release_expired(seams, &hold)?;
        report.released += 1;
    }
    Ok(report)
}

fn release_expired<S: HostSeams>(seams: &S, hold: &HoldRecord) -> AppResult<()> {
    let reservation = InventoryReservationContext {
        hold_id: super::inventory_types::hold_key(&hold.provider_scope, &hold.quote_operation_id),
        lines: hold.lines.clone(),
    };
    super::inventory_transition::expired_quote(
        seams,
        &hold.provider_scope,
        &hold.quote_operation_id,
        &reservation,
    )
}

pub(super) enum PendingResult {
    Released,
    Committed,
    Deferred,
}

fn reconcile_pending<S: HostSeams>(
    seams: &S,
    key: &str,
    record: &OperationRecord,
) -> AppResult<PendingResult> {
    if super::identity::operation_entry_key(&record.operation_id)? != key {
        return Err(AppError::internal(
            "checkout reconciliation identity mismatch",
        ));
    }
    if record.x402_settlement.is_some() {
        return Ok(match super::x402_settlement::reconcile(seams, record)? {
            CanonicalPaymentOutcome::Paid { .. } => PendingResult::Committed,
            CanonicalPaymentOutcome::Terminal { .. } => PendingResult::Released,
            _ => PendingResult::Deferred,
        });
    }
    match &record.outcome {
        Some(DurableOutcome::Terminal { durable: true, .. }) => {
            super::settlement_atomic::terminal(seams, &record.operation_id)?;
            Ok(PendingResult::Released)
        }
        Some(DurableOutcome::Resolved {
            provider_artifacts, ..
        })
        | Some(DurableOutcome::Indeterminate {
            provider_artifacts, ..
        }) => {
            let Some(provider_id) = provider_artifacts.provider_checkout_id.as_deref() else {
                return Ok(PendingResult::Deferred);
            };
            super::settlement_reconcile_stripe::reconcile(seams, record, key, provider_id)
        }
        _ => Ok(PendingResult::Deferred),
    }
}
