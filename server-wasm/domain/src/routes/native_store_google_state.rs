//! Validation of Google Play purchase-state responses.

use serde_json::Value;

use crate::error::{AppError, AppResult};
use crate::time;

pub(super) fn check_one_time(value: &Value) -> AppResult<()> {
    match value
        .get("purchaseState")
        .and_then(Value::as_i64)
        .unwrap_or(1)
    {
        0 => Ok(()),
        2 => Err(AppError::new(
            409,
            "purchase_pending",
            "the purchase is still pending",
        )),
        _ => Err(AppError::new(
            403,
            "purchase_revoked",
            "the purchase was cancelled or refunded",
        )),
    }
}

pub(super) fn subscription_state(
    value: &Value,
    expected_product_id: &str,
    purchase_token: &str,
    now: i64,
) -> AppResult<(String, &'static str, i64)> {
    let state = value
        .get("subscriptionState")
        .and_then(Value::as_str)
        .unwrap_or("");
    let active = matches!(
        state,
        "SUBSCRIPTION_STATE_ACTIVE" | "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
    );
    let item = value
        .get("lineItems")
        .and_then(Value::as_array)
        .and_then(|items| {
            items.iter().find(|item| {
                item.get("productId")
                    .and_then(Value::as_str)
                    .is_some_and(|id| id == expected_product_id)
            })
        })
        .ok_or_else(|| {
            AppError::new(
                403,
                "product_mismatch",
                "the purchase does not match the requested product",
            )
        })?;
    let period_end = item
        .get("expiryTime")
        .and_then(Value::as_str)
        .and_then(time::parse_iso)
        .unwrap_or(0);
    if !active || period_end <= now {
        return Err(AppError::new(
            403,
            "subscription_inactive",
            "the subscription is not active",
        ));
    }
    Ok((purchase_token.into(), "active", period_end))
}
