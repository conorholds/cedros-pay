//! Completeness check for the normalized order reader. A legacy paid checkout
//! without an order cannot silently disappear from the customer order list.
use super::{
    record::{OperationRecord, SettlementState},
    CanonicalOperationContext, OPERATION_MODEL,
};
use crate::{
    db::{Db, Dir, Filter, Op, Query},
    error::{AppError, AppResult},
    ids,
    seams::HostSeams,
};

pub(crate) fn require_complete<S: HostSeams>(db: &Db<'_, S>) -> AppResult<()> {
    let mut excluded = std::collections::BTreeSet::new();
    let mut after: Option<String> = None;
    let mut count = 0usize;
    loop {
        let mut query = Query::new()
            .filter(Filter::new("operation", Op::Eq, "checkout"))
            .filter(Filter::new("settlementState", Op::Eq, "paid"))
            .order("operationId", Dir::Asc)
            .limit(100);
        if let Some(previous) = &after {
            query = query.filter(Filter::new("operationId", Op::Gt, previous.clone()));
        }
        let rows = db.read(OPERATION_MODEL, &query)?;
        let size = rows.len();
        for row in rows {
            count += 1;
            if count > 10_000 {
                return Err(AppError::new(
                    413,
                    "record_too_large",
                    "order history exceeds its bounded snapshot limit",
                ));
            }
            let checkout: OperationRecord = row.parse()?;
            if checkout.settlement_state != SettlementState::Paid {
                return Err(unavailable());
            }
            let quote_id = super::record_rail::quote_id(&checkout)?;
            let quote = db
                .read_one(
                    OPERATION_MODEL,
                    &super::identity::operation_entry_key(quote_id)?,
                )?
                .ok_or_else(unavailable)?
                .parse::<OperationRecord>()?;
            let CanonicalOperationContext::Quote { snapshot, .. } = quote.canonical_context else {
                return Err(unavailable());
            };
            let CanonicalOperationContext::Checkout { payment_method, .. } =
                &checkout.canonical_context
            else {
                return Err(unavailable());
            };
            let reference = if *payment_method == super::PaymentMethod::Credits {
                checkout.operation_id.as_str()
            } else {
                checkout
                    .settlement_effect
                    .as_ref()
                    .and_then(|effect| effect.provider_reference.as_deref())
                    .ok_or_else(unavailable)?
            };
            if snapshot
                .order_context
                .as_ref()
                .is_some_and(|context| !context.site_order)
            {
                excluded.insert(reference.to_string());
            } else {
                let id = crate::commerce_orders::order_id(reference);
                let order = db
                    .read_one(ids::MODEL_LEDGER, &id)?
                    .ok_or_else(unavailable)?;
                if order.payload["kind"] != "order"
                    || order.payload["paymentReference"] != reference
                {
                    return Err(unavailable());
                }
            }
            if after
                .as_ref()
                .is_some_and(|previous| checkout.operation_id <= *previous)
            {
                return Err(unavailable());
            }
            after = Some(checkout.operation_id);
        }
        if size < 100 {
            break;
        }
    }
    // Older payment paths predate canonical operations. They must not disappear
    // from a ready result. Only an authoritative non-order checkout or a durable
    // order proves how a settled payment belongs in this projection.
    after = None;
    count = 0;
    loop {
        let mut query = Query::new()
            .filter(Filter::new("kind", Op::Eq, "payment"))
            .order("reference", Dir::Asc)
            .limit(100);
        if let Some(previous) = &after {
            query = query.filter(Filter::new("reference", Op::Gt, previous.clone()));
        }
        let rows = db.read(ids::MODEL_LEDGER, &query)?;
        let size = rows.len();
        for row in rows {
            count += 1;
            if count > 10_000 {
                return Err(AppError::new(
                    413,
                    "record_too_large",
                    "payment history exceeds its bounded snapshot limit",
                ));
            }
            let payment: crate::models::LedgerEntry = row.parse()?;
            if payment.reference != row.entry_key
                || after
                    .as_ref()
                    .is_some_and(|previous| payment.reference <= *previous)
            {
                return Err(unavailable());
            }
            if !matches!(payment.status.as_str(), "pending" | "failed")
                && !excluded.contains(&payment.reference)
            {
                let order = db
                    .read_one(
                        ids::MODEL_LEDGER,
                        &crate::commerce_orders::order_id(&payment.reference),
                    )?
                    .ok_or_else(unavailable)?;
                if order.payload["kind"] != "order"
                    || order.payload["paymentReference"] != payment.reference
                {
                    return Err(unavailable());
                }
            }
            after = Some(payment.reference);
        }
        if size < 100 {
            return Ok(());
        }
    }
}
fn unavailable() -> AppError {
    AppError::new(
        503,
        "order_history_requires_recovery",
        "historical checkout order facts must be recovered before listing orders",
    )
}
