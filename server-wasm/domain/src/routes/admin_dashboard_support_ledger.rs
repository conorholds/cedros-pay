use serde_json::{json, Value};

use crate::db::{Db, Dir, Filter, Op, Query};
use crate::error::AppResult;
use crate::ids;
use crate::seams::HostSeams;

use super::support_json::{cents, is_settled, status};

const PAGE_SIZE: i64 = 100;
const ADMIN_LEDGER_SCAN_MAX_ROWS: usize = 10_000;
const ADMIN_LEDGER_SCAN_PAGES: usize = ADMIN_LEDGER_SCAN_MAX_ROWS / PAGE_SIZE as usize;

pub(super) struct LedgerPage<T> {
    pub(super) entries: Vec<T>,
    pub(super) total: usize,
    pub(super) truncated: bool,
}

#[derive(Default)]
pub(super) struct MethodTotals {
    pub(super) total_cents: i64,
    pub(super) total_count: i64,
    stripe_cents: i64,
    x402_cents: i64,
    credits_cents: i64,
    stripe_count: i64,
    x402_count: i64,
    credits_count: i64,
}

impl MethodTotals {
    pub(super) fn add(&mut self, method: &str, cents: i64) {
        self.total_cents += cents;
        self.total_count += 1;
        match method {
            "stripe" => {
                self.stripe_cents += cents;
                self.stripe_count += 1;
            }
            "credits" => {
                self.credits_cents += cents;
                self.credits_count += 1;
            }
            _ => {
                self.x402_cents += cents;
                self.x402_count += 1;
            }
        }
    }

    pub(super) fn revenue_json(&self) -> Value {
        json!({
            "stripe": self.stripe_cents as f64 / 100.0,
            "x402": self.x402_cents as f64 / 100.0,
            "credits": self.credits_cents as f64 / 100.0
        })
    }

    pub(super) fn count_json(&self) -> Value {
        json!({
            "stripe": self.stripe_count,
            "x402": self.x402_count,
            "credits": self.credits_count
        })
    }
}

/// Order lifecycle breakdown derived from the payment ledger. Orders are the
/// `kind == "payment"` ledger rows (see `order_json`), so this classifies every
/// payment row by its order-facing status and tallies settled gross as revenue.
#[derive(Default)]
pub(super) struct OrderStatusCounts {
    total: i64,
    paid: i64,
    refunded: i64,
    pending: i64,
    failed: i64,
    revenue_cents: i64,
}

impl OrderStatusCounts {
    pub(super) fn add(&mut self, entry: &Value) {
        self.total += 1;
        if is_settled(entry) {
            self.paid += 1;
            self.revenue_cents += cents(entry);
        } else {
            match status(entry).as_str() {
                "refunded" => self.refunded += 1,
                "failed" => self.failed += 1,
                _ => self.pending += 1,
            }
        }
    }

    pub(super) fn to_json(&self) -> Value {
        json!({
            "total": self.total,
            "paid": self.paid,
            "refunded": self.refunded,
            "pending": self.pending,
            "failed": self.failed,
            "revenue": self.revenue_cents as f64 / 100.0,
        })
    }
}

pub(super) fn visit_ledger<S: HostSeams>(
    seams: &S,
    purpose: &str,
    direction: Dir,
    mut visit: impl FnMut(Value) -> AppResult<()>,
) -> AppResult<bool> {
    // Preserve the payment/refund/dispute budget when durable orders and
    // fulfillment receipts share the guarded commerce store.
    let query = Query::new()
        .order("createdAt", direction)
        .filter(Filter::new("kind", Op::Ne, "order"))
        .filter(Filter::new("kind", Op::Ne, "fulfillment"));
    let mut seen = 0;
    Db::new(seams, ids::DB_ACCESS).for_each_page(
        ids::MODEL_LEDGER,
        &query,
        PAGE_SIZE,
        ADMIN_LEDGER_SCAN_PAGES + 1,
        |entries| {
            for entry in entries {
                if seen < ADMIN_LEDGER_SCAN_MAX_ROWS {
                    visit(entry.payload)?;
                }
                seen += 1;
            }
            Ok(())
        },
    )?;
    let truncated = seen > ADMIN_LEDGER_SCAN_MAX_ROWS;
    if truncated {
        seams.log(
            "warn",
            &format!("{purpose} ledger scan truncated at {ADMIN_LEDGER_SCAN_MAX_ROWS} rows"),
        );
    }
    Ok(truncated)
}

pub(super) fn ledger_page<S: HostSeams, T>(
    seams: &S,
    purpose: &str,
    offset: i64,
    limit: i64,
    mut select: impl FnMut(Value) -> AppResult<Option<T>>,
) -> AppResult<LedgerPage<T>> {
    let mut entries = Vec::new();
    let mut total = 0;
    let truncated = visit_ledger(seams, purpose, Dir::Desc, |value| {
        if let Some(value) = select(value)? {
            if total >= offset as usize && entries.len() < limit as usize {
                entries.push(value);
            }
            total += 1;
        }
        Ok(())
    })?;
    Ok(LedgerPage {
        entries,
        total,
        truncated,
    })
}

pub(super) fn page_has_more(total: usize, offset: i64, limit: i64, truncated: bool) -> bool {
    truncated || (offset.saturating_add(limit).max(0) as usize) < total
}
