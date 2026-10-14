use serde_json::{json, Value};

use crate::error::{AppError, AppResult};
use crate::reqresp::RouteRequest;
use crate::routes::matches;

const DEFAULT_LIMIT: i64 = 20;
const MAX_LIMIT: i64 = 100;

/// Longest search term honoured; anything past this cannot narrow a real
/// identifier and only costs scan time.
const MAX_SEARCH_LEN: usize = 128;

/// The resource a payment row paid for, as the transactions table shows it.
/// Shared with the search matcher so the searched text cannot drift from the
/// rendered text.
fn transaction_resource_id(value: &Value) -> String {
    string_field(value, "productId")
        .or_else(|| string_field(value, "routePath"))
        .unwrap_or_else(|| id_of(value))
}

/// Normalises a raw `search` query value: trimmed and length-capped, `None`
/// when it carries no term. Case is preserved so the response can echo the
/// term the caller actually asked for; matching lowercases separately.
pub(super) fn search_term(req: &RouteRequest) -> Option<String> {
    let raw = req.query_value("search")?.trim();
    if raw.is_empty() {
        return None;
    }
    Some(raw.chars().take(MAX_SEARCH_LEN).collect())
}

/// Case-insensitive substring match over a payment row's two free-text
/// identifiers — the transaction id and the resource it paid for. Runs on the
/// raw row so filtering happens before paging, not after. `needle` must
/// already be lowercased.
pub(super) fn transaction_matches_search(value: &Value, needle: &str) -> bool {
    id_of(value).to_lowercase().contains(needle)
        || transaction_resource_id(value)
            .to_lowercase()
            .contains(needle)
}

pub(super) fn transaction_json(value: Value) -> Value {
    json!({
        "id": id_of(&value),
        "resourceId": transaction_resource_id(&value),
        "method": payment_method(&value),
        "amount": cents(&value) as f64 / 100.0,
        "amountMinor": cents(&value),
        "refundedAmountMinor": int_field(&value, "refundCents").unwrap_or(0),
        "providerReference": string_field(&value, "providerRef"),
        "currency": string_field(&value, "currency").unwrap_or_else(|| "USD".to_string()),
        "status": ui_payment_status(&value),
        "paidAt": timestamp(&value),
    })
}

/// Order-facing lifecycle status for a payment ledger row (kept in sync with
/// `order_json` so list filters can run on raw rows before JSON mapping).
pub(super) fn order_status(value: &Value) -> String {
    if is_settled(value) {
        "paid".to_string()
    } else {
        status(value)
    }
}

pub(super) fn order_json(value: Value) -> Value {
    json!({
        "id": id_of(&value),
        "source": payment_method(&value),
        "purchaseId": id_of(&value),
        "resourceId": string_field(&value, "productId").unwrap_or_else(|| id_of(&value)),
        "status": order_status(&value),
        "items": order_items(&value),
        "amount": cents(&value),
        "amountAsset": string_field(&value, "currency").unwrap_or_else(|| "USD".to_string()),
        "metadata": {},
        "createdAt": timestamp(&value),
    })
}

pub(super) fn refund_json(value: &Value, provider: &str) -> Value {
    let signing_request = value.pointer("/signingAttempt/request");
    let signing_response = value.pointer("/signingAttempt/response");
    json!({
        "id": id_of(value),
        // The on-chain/provider transaction id, or null until one exists. A pending
        // x402 refund has no signature yet, so do not echo the refund id as a transaction.
        "transactionId": string_field(value, "providerRef"),
        "stripeRefundId": string_field(value, "providerRef"),
        "chargeId": string_field(value, "chargeId"),
        "paymentIntentId": string_field(value, "paymentIntentId"),
        "originalTransactionId": if provider == "credits" {
            string_field(value, "providerRef")
        } else {
            None
        },
        "amount": if provider == "stripe" {
            cents(value) as f64
        } else {
            cents(value) as f64 / 100.0
        },
        "currency": string_field(value, "currency").unwrap_or_else(|| "USD".to_string()),
        "status": if provider == "stripe" {
            status(value)
        } else {
            ui_refund_status(value).to_string()
        },
        "reason": string_field(value, "reason"),
        // x402-only: lets the admin confirm who receives the payout and which purchase
        // it refunds before processing the server-signed on-chain transfer.
        "recipientWallet": string_field(value, "recipientWallet"),
        "originalPurchaseId": string_field(value, "originalPurchaseId"),
        "paymentMint": string_field(value, "paymentMint").or_else(|| {
            signing_request
                .and_then(|request| request.get("paymentMint"))
                .and_then(Value::as_str)
                .map(str::to_string)
        }),
        "refundAmountMicrounits": value
            .get("refundAmountMicrounits")
            .and_then(Value::as_u64)
            .or_else(|| signing_request
                .and_then(|request| request.get("refundAmountMicrounits"))
                .and_then(Value::as_u64)),
        "tokenDecimals": value
            .get("tokenDecimals")
            .and_then(Value::as_u64)
            .or_else(|| signing_request
                .and_then(|request| request.get("tokenDecimals"))
                .and_then(Value::as_u64)),
        // Once this durable operation exists, an ambiguous/lost Core response may
        // already represent a broadcast. Operators may retry it, but never deny it.
        "signingStarted": provider == "x402"
            && value.get("signingAttempt").is_some_and(|attempt| !attempt.is_null()),
        "providerStatus": signing_response
            .and_then(|response| response.get("status"))
            .and_then(Value::as_str),
        "providerErrorCode": signing_response
            .and_then(|response| response.get("errorCode"))
            .and_then(Value::as_str),
        "providerRetryable": signing_response
            .and_then(|response| response.get("retryable"))
            .and_then(Value::as_bool),
        "operationId": signing_response
            .and_then(|response| response.get("operationId"))
            .and_then(Value::as_str),
        "createdAt": timestamp(value),
    })
}

pub(super) fn require_match(req: &RouteRequest, method: &str, path: &str) -> AppResult<()> {
    matches(req, method, path)
        .then_some(())
        .ok_or_else(|| AppError::not_found("unknown admin route"))
}

pub(super) fn path_id(path: &str, marker: &str, suffix: Option<&str>) -> AppResult<String> {
    let start = path
        .find(marker)
        .map(|idx| idx + marker.len())
        .ok_or_else(|| AppError::not_found("route id not found"))?;
    let tail = &path[start..];
    let raw = suffix
        .and_then(|s| tail.strip_suffix(s))
        .unwrap_or_else(|| tail.split('/').next().unwrap_or(""));
    if raw.is_empty() {
        Err(AppError::not_found("route id not found"))
    } else {
        Ok(raw.to_string())
    }
}

pub(super) fn limit(req: &RouteRequest) -> i64 {
    req.query_value("limit")
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_LIMIT)
        .clamp(0, MAX_LIMIT)
}

pub(super) fn offset(req: &RouteRequest) -> i64 {
    req.query_value("offset")
        .and_then(|v| v.parse().ok())
        .unwrap_or(0)
        .max(0)
}

pub(super) fn bool_field(value: &Value, key: &str, fallback: bool) -> bool {
    value.get(key).and_then(Value::as_bool).unwrap_or(fallback)
}

pub(super) fn kind(value: &Value) -> String {
    string_field(value, "kind").unwrap_or_else(|| {
        // Legacy payments may omit kind; operation/lease records in this same
        // store are not purchases and must not appear as phantom pending orders.
        if ["grossCents", "amountCents", "amount"]
            .iter()
            .any(|key| int_field(value, key).is_some())
            && (value.get("reference").is_some() || value.get("id").is_some())
        {
            "payment".to_string()
        } else {
            "unknown".to_string()
        }
    })
}

pub(super) fn status(value: &Value) -> String {
    string_field(value, "status").unwrap_or_else(|| "pending".to_string())
}

pub(super) fn is_settled(value: &Value) -> bool {
    matches!(status(value).as_str(), "succeeded" | "completed" | "paid")
}

pub(super) fn payment_method(value: &Value) -> String {
    match first_string(value, &["method", "provider", "source"])
        .unwrap_or_default()
        .as_str()
    {
        "stripe" | "card" => "stripe".to_string(),
        "credits" | "credit" => "credits".to_string(),
        _ => "x402".to_string(),
    }
}

pub(super) fn cents(value: &Value) -> i64 {
    int_field(value, "grossCents")
        .or_else(|| int_field(value, "amountCents"))
        .or_else(|| int_field(value, "amount"))
        .unwrap_or(0)
}

pub(super) fn string_field(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .filter(|v| !v.trim().is_empty())
        .map(str::to_string)
}

pub(super) fn timestamp(value: &Value) -> String {
    first_string(value, &["processedAt", "paidAt", "createdAt"])
        .unwrap_or_else(|| "1970-01-01T00:00:00Z".to_string())
}

fn id_of(value: &Value) -> String {
    first_string(value, &["reference", "id", "providerRef"]).unwrap_or_else(|| "unknown".into())
}

fn ui_payment_status(value: &Value) -> &'static str {
    match status(value).as_str() {
        "succeeded" | "completed" | "paid" => "completed",
        "failed" => "failed",
        "refunded" => "refunded",
        _ => "pending",
    }
}

fn ui_refund_status(value: &Value) -> &'static str {
    match status(value).as_str() {
        "succeeded" | "completed" | "settled" => "completed",
        "failed" | "denied" => "failed",
        // Submitted/processing means an on-chain payout has been broadcast but not confirmed.
        "submitted" | "processing" => "processing",
        _ => "pending",
    }
}

fn order_items(value: &Value) -> Value {
    value.get("items").cloned().unwrap_or_else(|| {
        string_field(value, "productId")
            .map(|id| json!([{ "productId": id, "quantity": 1 }]))
            .unwrap_or_else(|| Value::Array(Vec::new()))
    })
}

fn int_field(value: &Value, key: &str) -> Option<i64> {
    value.get(key).and_then(|v| {
        v.as_i64()
            .or_else(|| v.as_u64().and_then(|n| i64::try_from(n).ok()))
    })
}

fn first_string(value: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| string_field(value, key))
}
