//! Durable customer orders within the existing guarded commerce store. Payment,
//! delivery, and refund facts remain separate; viewing never reconciles or writes.
mod ai;
mod projection;
mod routes;
#[cfg(test)]
mod tests;
use crate::{
    checkout_contract::{AuthoritativeQuoteSnapshot, PaymentMethod},
    db::BatchOp,
    error::{AppError, AppResult},
    guarded_batch::GuardedCondition,
    ids,
};
pub use routes::{handle, ROUTES};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const LIST: &str = "cedros-pay:portal-orders-list";
pub const DETAIL: &str = "cedros-pay:portal-orders-detail";
pub const FULFILL: &str = "cedros-pay:admin-order-fulfillment";

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OrderContext {
    pub site_order: bool,
    pub customer_name: String,
    pub digital: bool,
    /// Symbol pinned when the quote is created, never read from today's config
    /// when displaying a historical token order.
    pub token_asset: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct OrderLine {
    pub name: String,
    pub quantity: u64,
    pub total_atomic: Option<String>,
    pub delivered: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct Order {
    pub schema_version: u8,
    pub kind: String,
    pub reference: String,
    pub payment_reference: String,
    pub customer_name: String,
    pub asset: Option<String>,
    pub asset_decimals: Option<u8>,
    pub token_mint: Option<String>,
    pub total_atomic: String,
    pub subtotal_atomic: Option<String>,
    pub tax_atomic: Option<String>,
    pub shipping_atomic: Option<String>,
    pub tip_atomic: Option<String>,
    pub discount_atomic: Option<String>,
    pub lines: Vec<OrderLine>,
    /// None identifies historical quotes which did not persist delivery intent.
    pub digital: Option<bool>,
    pub cancelled: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl Order {
    pub(crate) fn from_quote(
        snapshot: &AuthoritativeQuoteSnapshot,
        rail: PaymentMethod,
        payment_reference: &str,
        placed: i64,
        now: i64,
    ) -> AppResult<Option<Self>> {
        let context = snapshot.order_context.as_ref();
        if context.is_some_and(|ctx| !ctx.site_order) {
            return Ok(None);
        }
        let token = rail == PaymentMethod::X402;
        let (asset, decimals, total) = if token {
            let binding = snapshot.x402.as_ref().ok_or_else(unavailable)?;
            (
                context.and_then(|ctx| ctx.token_asset.clone()),
                Some(binding.decimals),
                binding.amount_atomic.to_string(),
            )
        } else {
            // These are the cents-denominated assets the checkout service can
            // represent exactly. Other definitions require explicit metadata.
            let supported = matches!(
                snapshot.currency.as_str(),
                "USD" | "EUR" | "GBP" | "AUD" | "CAD" | "NZD" | "CHF" | "SGD" | "HKD"
            );
            (
                supported.then(|| snapshot.currency.clone()),
                supported.then_some(2),
                snapshot.total_cents.to_string(),
            )
        };
        let known = |amount: u64| (!token).then(|| amount.to_string());
        let order = Self {
            schema_version: 1,
            kind: "order".into(),
            reference: order_id(payment_reference),
            payment_reference: payment_reference.into(),
            customer_name: context
                .map(|ctx| ctx.customer_name.clone())
                .unwrap_or_default(),
            asset,
            asset_decimals: decimals,
            token_mint: if token {
                snapshot
                    .x402
                    .as_ref()
                    .map(|binding| binding.token_mint.clone())
            } else {
                None
            },
            total_atomic: total,
            subtotal_atomic: known(snapshot.subtotal_cents),
            tax_atomic: known(snapshot.tax_cents),
            shipping_atomic: known(snapshot.shipping_cents),
            tip_atomic: known(snapshot.tip_cents),
            discount_atomic: known(snapshot.discount_cents),
            lines: snapshot
                .lines
                .iter()
                .map(|line| OrderLine {
                    name: line.title.clone(),
                    quantity: line.qty,
                    total_atomic: known(line.line_total_cents),
                    delivered: 0,
                })
                .collect(),
            digital: context.map(|ctx| ctx.digital),
            cancelled: false,
            created_at: crate::time::iso8601(placed),
            updated_at: crate::time::iso8601(now),
        };
        order.validate()?;
        Ok(Some(order))
    }

    pub(crate) fn validate(&self) -> AppResult<()> {
        if self.schema_version != 1
            || self.kind != "order"
            || self.reference != order_id(&self.payment_reference)
            || self.lines.is_empty()
            || self.lines.len() > 100
        {
            return Err(unavailable());
        }
        if crate::time::parse_iso(&self.created_at).is_none()
            || crate::time::parse_iso(&self.updated_at).is_none()
            || self.customer_name.len() > 1000
        {
            return Err(unavailable());
        }
        let total = atomic(&self.total_atomic)?;
        let mut sum = Some(0u128);
        for line in &self.lines {
            if line.quantity == 0
                || line.quantity > 1_000_000
                || line.delivered > line.quantity
                || line.name.len() > 4000
            {
                return Err(unavailable());
            }
            sum = match (sum, line.total_atomic.as_deref()) {
                (Some(sum), Some(amount)) => {
                    Some(sum.checked_add(atomic(amount)?).ok_or_else(unavailable)?)
                }
                (_, Some(amount)) => {
                    atomic(amount)?;
                    None
                }
                _ => None,
            };
        }
        if let Some(subtotal) = &self.subtotal_atomic {
            let subtotal = atomic(subtotal)?;
            if sum.is_some_and(|sum| sum != subtotal) {
                return Err(unavailable());
            }
        }
        let values = [
            &self.subtotal_atomic,
            &self.tax_atomic,
            &self.shipping_atomic,
            &self.tip_atomic,
            &self.discount_atomic,
        ];
        for amount in values.iter().filter_map(|value| value.as_deref()) {
            atomic(amount)?;
        }
        if let [Some(subtotal), Some(tax), Some(shipping), Some(tip), Some(discount)] =
            values.map(|value| value.as_deref())
        {
            let expected = atomic(subtotal)?
                .checked_add(atomic(tax)?)
                .and_then(|v| v.checked_add(atomic(shipping).ok()?))
                .and_then(|v| v.checked_add(atomic(tip).ok()?))
                .and_then(|v| v.checked_sub(atomic(discount).ok()?));
            if expected != Some(total) {
                return Err(unavailable());
            }
        }
        Ok(())
    }
}

pub(crate) fn insert(
    order: &Order,
    conditions: &mut Vec<GuardedCondition>,
    ops: &mut Vec<BatchOp>,
) -> AppResult<()> {
    conditions.push(GuardedCondition::Absent {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: order.reference.clone(),
    });
    ops.push(write(order)?);
    Ok(())
}
fn write(order: &Order) -> AppResult<BatchOp> {
    Ok(BatchOp::Write {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: order.reference.clone(),
        data: serde_json::to_value(order).map_err(|_| unavailable())?,
    })
}
pub(crate) fn order_id(reference: &str) -> String {
    format!(
        "order_{}",
        hex::encode(Sha256::digest(reference.as_bytes()))
    )
}
fn atomic(value: &str) -> AppResult<u128> {
    if value.is_empty()
        || value.len() > 39
        || !value.bytes().all(|byte| byte.is_ascii_digit())
        || (value.len() > 1 && value.starts_with('0'))
    {
        return Err(unavailable());
    }
    value.parse().map_err(|_| unavailable())
}
fn unavailable() -> AppError {
    AppError::new(
        503,
        "order_source_unavailable",
        "authoritative order facts are unavailable",
    )
}
fn oversized() -> AppError {
    AppError::new(
        413,
        "record_too_large",
        "order response exceeds its size limit",
    )
}
