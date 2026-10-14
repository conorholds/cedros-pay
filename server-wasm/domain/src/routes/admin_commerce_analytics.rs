//! Redacted commerce analytics bridge routes consumed by Cedros Shop admin.

use std::fmt::Write as _;

use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::ctx::RequestContext;
use crate::db::{Db, Dir, Query};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::models::CartRow;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;
use crate::time;

use super::support::*;

const PAGE_SIZE: i64 = 100;
const MAX_SCAN_PAGES: usize = 5;
const CART_SCAN_MAX_ROWS: usize = PAGE_SIZE as usize * MAX_SCAN_PAGES;

pub(super) fn handle<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    match req.route_id.as_str() {
        ids::ROUTE_ADMIN_COMMERCE_ANALYTICS => snapshot(seams, req, ctx),
        ids::ROUTE_ADMIN_COMMERCE_ANALYTICS_RECOVER => recover_checkout(seams, req),
        _ => Err(AppError::not_found("unknown commerce analytics route")),
    }
}

fn snapshot<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_match(req, "GET", "/admin/commerce-analytics")?;
    let limit = limit(req) as usize;
    let now = seams.now_unix_secs();
    let db = Db::new(seams, ids::DB_ACCESS);
    // Newest-first scans: recent abandonments are the recoverable ones, and any
    // residual scan cap is reported instead of silently biasing to old rows.
    let carts = recent_carts(seams, &db)?;
    let ledger = ledger_page(
        seams,
        "admin commerce analytics",
        0,
        limit as i64,
        |entry| Ok((kind(&entry) == "payment" && is_settled(&entry)).then_some(entry)),
    )?;
    Ok(RouteResponse::ok(&json!({
        "generatedAt": time::iso8601(now),
        "abandonedCheckouts": abandoned_checkouts(&carts.rows, now, limit),
        "paymentEvents": payment_events(ctx, &ledger.entries, limit),
        "truncated": carts.truncated || ledger.truncated,
    })))
}

fn recover_checkout<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !req.method.eq_ignore_ascii_case("POST") {
        return Err(AppError::not_found("unknown commerce analytics route"));
    }
    let checkout_id = path_id(
        &req.path,
        "/admin/commerce-analytics/abandoned-checkouts/",
        Some("/recover"),
    )?;
    let row: CartRow = Db::new(seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_CART, &checkout_id)?
        .ok_or_else(|| AppError::not_found("checkout was not found"))?
        .parse()?;
    if !cart_is_recoverable(&row, seams.now_unix_secs()) {
        return Err(AppError::bad_request("checkout is not recoverable"));
    }
    Ok(RouteResponse::ok(&json!({
        "checkoutId": checkout_id,
        "status": "recovered",
        "cart": recovered_cart(&row),
        "navigateTarget": checkout_target(&row.cart_id),
    })))
}

struct CartScan {
    rows: Vec<CartRow>,
    truncated: bool,
}

fn recent_carts<S: HostSeams>(seams: &S, db: &Db<'_, S>) -> AppResult<CartScan> {
    let query = Query::new().order("createdAt", Dir::Desc);
    let mut entries = db.read_paged(ids::MODEL_CART, &query, PAGE_SIZE, MAX_SCAN_PAGES + 1)?;
    let truncated = entries.len() > CART_SCAN_MAX_ROWS;
    if truncated {
        entries.truncate(CART_SCAN_MAX_ROWS);
        seams.log(
            "warn",
            &format!("admin commerce analytics cart scan truncated at {CART_SCAN_MAX_ROWS} rows"),
        );
    }
    let mut rows = Vec::with_capacity(entries.len());
    for entry in entries {
        rows.push(entry.parse()?);
    }
    Ok(CartScan { rows, truncated })
}

fn abandoned_checkouts(rows: &[CartRow], now: i64, limit: usize) -> Vec<Value> {
    rows.iter()
        .filter(|row| cart_is_recoverable(row, now))
        .take(limit)
        .map(|row| abandoned_checkout_record(row, now))
        .collect()
}

fn payment_events(ctx: &RequestContext, entries: &[Value], limit: usize) -> Vec<Value> {
    entries
        .iter()
        .filter(|entry| kind(entry) == "payment" && is_settled(entry))
        .take(limit)
        .map(|entry| payment_event_record(ctx, entry))
        .collect()
}

fn abandoned_checkout_record(row: &CartRow, now: i64) -> Value {
    json!({
        "checkoutId": row.cart_id,
        "status": "abandoned",
        "recoverable": cart_is_recoverable(row, now),
        "itemCount": row.items.iter().map(|item| i64::from(item.quantity)).sum::<i64>(),
        "totalAmount": row.total_cents as f64 / 100.0,
        "totalAmountAtomic": i64::try_from(row.total_atomic).unwrap_or(i64::MAX),
        "currency": row.currency,
        "createdAt": row.created_at,
        "expiresAt": row.expires_at,
        "navigateTarget": checkout_target(&row.cart_id),
    })
}

fn payment_event_record(ctx: &RequestContext, entry: &Value) -> Value {
    let resource_id = string_field(entry, "productId")
        .or_else(|| string_field(entry, "routePath"))
        .unwrap_or_else(|| "resource".to_string());
    let checkout_id = resource_id.strip_prefix("cart:").map(str::to_string);
    let navigate_target = checkout_id
        .as_deref()
        .map(checkout_target)
        .unwrap_or_else(default_checkout_target);
    json!({
        "eventId": redacted_payment_event_id(ctx, entry),
        "status": "succeeded",
        "paymentRail": payment_method(entry),
        "resourceType": resource_type(&resource_id),
        "checkoutId": checkout_id,
        "amount": cents(entry) as f64 / 100.0,
        "amountAtomic": token_amount_atomic(entry).unwrap_or_else(|| cents(entry)),
        "currency": string_field(entry, "currency").unwrap_or_else(|| "USD".to_string()),
        "createdAt": timestamp(entry),
        "navigateTarget": navigate_target,
    })
}

fn recovered_cart(row: &CartRow) -> Value {
    json!({
        "items": row.items.iter().map(|item| json!({
            "productId": item.resource,
            "variantId": item.variant_id,
            "quantity": item.quantity,
        })).collect::<Vec<_>>(),
        "totalAmount": row.total_cents as f64 / 100.0,
        "totalAmountAtomic": i64::try_from(row.total_atomic).unwrap_or(i64::MAX),
        "currency": row.currency,
    })
}

fn cart_is_recoverable(row: &CartRow, now: i64) -> bool {
    row.paid_signature.is_none()
        && !row.items.is_empty()
        && time::parse_iso(&row.expires_at)
            .map(|expires_at| expires_at < now)
            .unwrap_or(false)
}

fn checkout_target(checkout_id: &str) -> Value {
    json!({
        "moduleId": "cedros-pay:admin",
        "sectionId": "cedros-pay:transactions",
        "tabId": "cedros-pay:orders",
        "params": { "checkoutId": checkout_id },
    })
}

fn default_checkout_target() -> Value {
    json!({
        "moduleId": "cedros-pay:admin",
        "sectionId": "cedros-pay:transactions",
        "tabId": "cedros-pay:orders",
        "params": {},
    })
}

fn redacted_payment_event_id(ctx: &RequestContext, entry: &Value) -> String {
    let seed = format!(
        "{}:{}",
        ctx.site_id.as_deref().unwrap_or("site"),
        string_field(entry, "reference")
            .or_else(|| string_field(entry, "providerRef"))
            .unwrap_or_else(|| "payment".to_string())
    );
    let digest = Sha256::digest(seed.as_bytes());
    let mut suffix = String::with_capacity(24);
    for byte in &digest[..12] {
        let _ = write!(suffix, "{byte:02x}");
    }
    format!("cedros-pay:payment-event:{suffix}")
}

fn token_amount_atomic(entry: &Value) -> Option<i64> {
    entry
        .get("tokenSettlement")
        .and_then(|settlement| settlement.get("amountAtomic"))
        .and_then(Value::as_i64)
}

fn resource_type(resource_id: &str) -> &'static str {
    match resource_id.split_once(':').map(|(prefix, _)| prefix) {
        Some("cart") => "checkout",
        Some("order") => "order",
        Some("refund") => "refund",
        Some("ucp") => "ucp",
        _ => "resource",
    }
}

#[cfg(test)]
#[path = "admin_commerce_analytics_tests.rs"]
mod tests;
