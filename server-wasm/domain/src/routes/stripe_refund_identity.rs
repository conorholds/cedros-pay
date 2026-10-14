//! One durable Stripe refund identity shared by admin execution and webhook delivery.

use crate::db::{Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::seams::HostSeams;
use serde_json::Value;

pub(crate) fn read<S: HostSeams>(
    db: &Db<'_, S>,
    refund_id: &str,
    payment_ref: &str,
    payment_intent: &str,
    amount: i64,
    currency: &str,
) -> AppResult<Option<EntryRecord>> {
    let canonical = db.read_one(ids::MODEL_LEDGER, refund_id)?;
    let legacy = db.read_one(ids::MODEL_LEDGER, &format!("stripe-refund:{refund_id}"))?;
    if canonical.is_some() && legacy.is_some() {
        return Err(AppError::conflict(
            "duplicate stored Stripe refund identities require reconciliation",
        ));
    }
    let Some(mut row) = canonical.or(legacy) else {
        return Ok(None);
    };
    let data = &row.payload;
    if !matches!(
        data["status"].as_str(),
        Some("pending" | "requires_action" | "succeeded" | "failed" | "canceled")
    ) || data["kind"] != "refund"
        || data["provider"] != "stripe"
        || data["providerRef"] != refund_id
        || data["grossCents"].as_i64() != Some(amount)
        || !data["currency"]
            .as_str()
            .is_some_and(|value| value.eq_ignore_ascii_case(currency))
    {
        return Err(AppError::conflict("stored Stripe refund identity mismatch"));
    }
    if row.entry_key.starts_with("stripe-refund:") {
        // Old admin projections omitted the original payment. Only their durable
        // operation receipt can establish that binding; never infer it from amount.
        let claim = db
            .read_one(
                ids::MODEL_LEDGER,
                &format!("stripe-refund-op:{payment_ref}"),
            )?
            .ok_or_else(|| AppError::conflict("legacy Stripe refund has no operation receipt"))?;
        if claim.payload["paymentRef"] != payment_ref
            || claim.payload["refundId"] != refund_id
            || claim.payload["status"] != "completed"
            || claim.payload["amount"].as_i64() != Some(amount)
            || !claim.payload["currency"]
                .as_str()
                .is_some_and(|value| value.eq_ignore_ascii_case(currency))
        {
            return Err(AppError::conflict(
                "legacy Stripe refund operation mismatch",
            ));
        }
        row.payload["originalReference"] = Value::String(payment_ref.into());
        row.payload["paymentIntentId"] = Value::String(payment_intent.into());
        row.payload["currency"] = Value::String(currency.into());
    } else if data["originalReference"] != payment_ref || data["paymentIntentId"] != payment_intent
    {
        return Err(AppError::conflict("stored Stripe refund payment mismatch"));
    }
    row.payload["currency"] = Value::String(currency.into());
    Ok(Some(row))
}
