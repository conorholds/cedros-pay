use serde_json::Value;

use crate::db::{Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

pub(super) fn ensure_ledger<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    object: &Value,
    session_id: &str,
) -> AppResult<Option<EntryRecord>> {
    if let Some(row) = db.read_one(crate::ids::MODEL_LEDGER, session_id)? {
        return Ok(Some(row));
    }
    let Some(operation_id) = super::meta(object, "cedros_pay_operation_id") else {
        return Ok(None);
    };
    let amount = super::webhook_payment_support::required_amount(object, "amount_total")?;
    let currency = super::webhook_payment_support::required_currency(object)?;
    crate::checkout_contract::settle_stripe_webhook(
        seams,
        operation_id,
        session_id,
        amount,
        &currency,
        object
            .get("payment_intent")
            .and_then(Value::as_str)
            .ok_or_else(|| AppError::forbidden("checkout session payment identity is missing"))?,
    )?;
    db.read_one(crate::ids::MODEL_LEDGER, session_id)?
        .ok_or_else(|| AppError::internal("canonical checkout settlement omitted ledger proof"))
        .map(Some)
}
