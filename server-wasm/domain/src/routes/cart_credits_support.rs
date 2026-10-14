//! Request parsing, encoding, and response helpers for cart credit settlement.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::error::{AppError, AppResult};
use crate::models::{CartRow, LedgerEntry};
use crate::reqresp::RouteResponse;

/// Optional authorize body. Only coupon aliases are read; a missing or
/// non-JSON body stays accepted because the cart snapshot is the source of truth.
#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreditsAuthorizeReq {
    #[serde(default)]
    coupon: Option<String>,
    #[serde(default)]
    coupon_code: Option<String>,
    #[serde(default)]
    discount_code: Option<String>,
}

pub(super) fn requested_coupon(body: &str) -> AppResult<Option<String>> {
    let body: CreditsAuthorizeReq = serde_json::from_str(body).unwrap_or_default();
    crate::routes::coupons::requested_code(&[
        body.coupon.as_deref(),
        body.coupon_code.as_deref(),
        body.discount_code.as_deref(),
    ])
}

pub(super) fn encode_ledger(entry: &LedgerEntry) -> AppResult<Value> {
    encode(entry, "cannot encode guarded commerce ledger entry")
}

fn encode<T: Serialize>(value: &T, message: &'static str) -> AppResult<Value> {
    serde_json::to_value(value)
        .map_err(|error| AppError::internal(message).with_internal(error.to_string()))
}

pub(super) fn settled_provider(cart: &CartRow, cart_id: &str, signature: &str) -> String {
    if let Some(claim) = cart
        .settlement_claim
        .as_ref()
        .filter(|claim| claim.reference == signature && claim.status == "succeeded")
    {
        return claim.rail.clone();
    }
    let credit_prefix = format!("cart-credits:{cart_id}:");
    if signature.starts_with(&credit_prefix) {
        "credits".into()
    } else {
        "unknown".into()
    }
}

pub(super) fn settled_response(
    cart_id: &str,
    signature: &str,
    provider: &str,
    balance_cents: Option<i64>,
) -> RouteResponse {
    let mut body = json!({
        "success": true,
        "cartId": cart_id,
        "signature": signature,
        "provider": provider,
    });
    if let Some(balance) = balance_cents {
        body["balanceCents"] = Value::from(balance);
    }
    RouteResponse::ok(&body)
}
