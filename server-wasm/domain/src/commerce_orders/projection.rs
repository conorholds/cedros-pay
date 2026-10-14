use super::*;
use crate::{db::Db, models::LedgerEntry, seams::HostSeams};
use serde_json::{json, Value};

pub(super) fn project<S: HostSeams>(
    db: &Db<'_, S>,
    order: &Order,
    site: &str,
    detail: bool,
) -> AppResult<Value> {
    if order.lines.len() > 100 {
        return Err(oversized());
    }
    order.validate()?;
    if order.digital.is_none() {
        return Err(unavailable());
    }
    let asset = order.asset.as_deref().ok_or_else(unavailable)?;
    let decimals = order.asset_decimals.ok_or_else(unavailable)?;
    if decimals > 18
        || asset.is_empty()
        || asset.len() > 24
        || !asset
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
    {
        return Err(unavailable());
    }
    let payment_entry = db
        .read_one(ids::MODEL_LEDGER, &order.payment_reference)?
        .ok_or_else(unavailable)?;
    let payment: LedgerEntry = payment_entry.parse()?;
    if payment.kind != "payment" || payment.reference != order.payment_reference {
        return Err(unavailable());
    }
    let total = atomic(&order.total_atomic)?;
    let is_token = payment.provider == "x402";
    if is_token {
        let settlement = payment.token_settlement.as_ref().ok_or_else(unavailable)?;
        if u128::from(settlement.amount_atomic) != total
            || settlement.decimals != decimals
            || order.token_mint.as_deref() != Some(&settlement.mint)
        {
            return Err(unavailable());
        }
    } else if payment.gross_cents < 0
        || payment.gross_cents as u128 != total
        || payment.currency != asset
        || decimals != 2
    {
        return Err(unavailable());
    }
    // Refund totals on the original payment are updated transactionally by the
    // refund service. A missing historical value is unknown, never zero.
    let refund_cents = payment_entry
        .payload
        .get("refundCents")
        .and_then(Value::as_i64);
    if refund_cents.is_some_and(|v| v < 0 || v > payment.gross_cents) {
        return Err(unavailable());
    }
    let payment_status = match payment.status.as_str() {
        "refunded" => "refunded",
        "succeeded" if refund_cents.is_some_and(|v| v == payment.gross_cents && v > 0) => {
            "refunded"
        }
        "succeeded" if refund_cents.is_some_and(|v| v > 0) => "partially-refunded",
        "succeeded" => "paid",
        "pending" | "initiating" => "pending",
        "failed" => "failed",
        _ => return Err(unavailable()),
    };
    let refunded = if payment_status == "refunded" {
        Some(order.total_atomic.clone())
    } else if !is_token {
        refund_cents.map(|v| v.to_string())
    } else if refund_cents == Some(0) {
        Some("0".into())
    } else {
        None
    }; // No conversion of partial token refunds from fiat cents.
    let fulfillment = if order.cancelled {
        "cancelled"
    } else if order
        .lines
        .iter()
        .all(|line| line.delivered == line.quantity)
    {
        "fulfilled"
    } else if order.lines.iter().any(|line| line.delivered > 0) {
        "partial"
    } else {
        "unfulfilled"
    };
    let status = match fulfillment {
        "cancelled" => "cancelled",
        "fulfilled" => "completed",
        _ => "open",
    };
    let updated = if crate::time::parse_iso(&payment.processed_at).ok_or_else(unavailable)?
        > crate::time::parse_iso(&order.updated_at).ok_or_else(unavailable)?
    {
        &payment.processed_at
    } else {
        &order.updated_at
    };
    let mut value = json!({"id":order.reference,"siteId":site,"siteName":site,"updatedAt":updated,
        "number":order.reference,"customerName":order.customer_name,"placedAt":order.created_at,
        "status":status,"paymentStatus":payment_status,"fulfillmentStatus":fulfillment,
        "asset":asset,"assetDecimals":decimals,"totalAtomic":order.total_atomic});
    if detail {
        let object = value.as_object_mut().ok_or_else(unavailable)?;
        object.extend(serde_json::from_value::<serde_json::Map<String,Value>>(json!({
            "lines":order.lines.iter().map(|line| json!({"name":line.name,"quantity":line.quantity,"totalAtomic":line.total_atomic})).collect::<Vec<_>>(),
            "subtotalAtomic":order.subtotal_atomic,"taxAtomic":order.tax_atomic,
            "shippingAtomic":order.shipping_atomic,"tipAtomic":order.tip_atomic,
            "discountAtomic":order.discount_atomic,"refundedAtomic":refunded
        })).map_err(|_| unavailable())?);
    }
    if serde_json::to_vec(&value).map_err(|_| unavailable())?.len() > 512 * 1024 {
        return Err(oversized());
    }
    Ok(value)
}
