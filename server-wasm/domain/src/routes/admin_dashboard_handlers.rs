use serde_json::json;

use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;

use super::support::*;

pub(super) use super::coupons::handle_coupons;
pub(super) use super::products::handle_products;
pub(super) use super::refunds::handle_refunds;
pub(super) use super::subscriptions::handle_subscriptions;

pub(super) fn stats<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_match(req, "GET", "/admin/stats")?;
    let mut counts = MethodTotals::default();
    let mut orders = OrderStatusCounts::default();
    let mut pending_refunds = 0;
    let mut revenue_includes_non_usd = false;
    let truncated = visit_ledger(seams, "admin stats", crate::db::Dir::Asc, |entry| {
        if kind(&entry) == "payment" {
            orders.add(&entry);
            if is_settled(&entry) {
                counts.add(&payment_method(&entry), cents(&entry));
                revenue_includes_non_usd |= string_field(&entry, "currency")
                    .is_some_and(|currency| !currency.eq_ignore_ascii_case("USD"));
            }
        }
        if kind(&entry) == "refund" && status(&entry) == "pending" {
            pending_refunds += 1;
        }
        Ok(())
    })?;

    let products = product_values(seams)?;
    let active_products = products
        .iter()
        .filter(|p| bool_field(p, "active", true))
        .count();
    let sellable_products = products
        .iter()
        .filter(|p| {
            bool_field(p, "active", true)
                && crate::routes::products::catalog_price_cents(p).is_some()
        })
        .count();

    Ok(RouteResponse::ok(&json!({
        "totalRevenue": counts.total_cents as f64 / 100.0,
        // Legacy aggregate fields are cents-based, not FX-converted USD. The
        // admin must not label mixed or non-USD totals as dollar revenue.
        "revenueIncludesNonUsd": revenue_includes_non_usd,
        "totalTransactions": counts.total_count,
        "activeProducts": active_products,
        "sellableProducts": sellable_products,
        "pendingRefunds": pending_refunds,
        "revenueByMethod": counts.revenue_json(),
        "transactionsByMethod": counts.count_json(),
        "orders": orders.to_json(),
        "truncated": truncated,
    })))
}

pub(super) fn transactions<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
) -> AppResult<RouteResponse> {
    require_match(req, "GET", "/admin/transactions")?;
    let limit = limit(req);
    let offset = offset(req);
    let method = req.query_value("method");
    let search = search_term(req);
    let needle = search.as_deref().map(str::to_lowercase);
    let page = ledger_page(seams, "admin transactions", offset, limit, |v| {
        Ok((kind(&v) == "payment"
            && method.map(|m| payment_method(&v) == m).unwrap_or(true)
            && needle
                .as_deref()
                .map(|q| transaction_matches_search(&v, q))
                .unwrap_or(true))
        .then_some(v))
    })?;
    let total = page.total;
    let transactions = page
        .entries
        .into_iter()
        .map(|value| {
            let progress = super::refunds::stripe_progress(seams, &value)?;
            let mut row = transaction_json(value);
            row["refundProgress"] = progress;
            Ok(row)
        })
        .collect::<AppResult<Vec<_>>>()?;
    Ok(RouteResponse::ok(&json!({
        "transactions": transactions,
        "count": transactions.len(),
        "total": total,
        // Echoed so the client can tell an applied server-side search from a
        // runtime that silently ignored the parameter.
        "search": search,
        "hasMore": page_has_more(total, offset, limit, page.truncated),
        "truncated": page.truncated,
    })))
}

pub(super) fn handle_orders<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
) -> AppResult<RouteResponse> {
    match req.route_id.as_str() {
        ids::ROUTE_ADMIN_ORDERS_LIST => orders(seams, req),
        ids::ROUTE_ADMIN_ORDERS_GET => order_detail(seams, req),
        _ => Err(AppError::not_found("unknown order route")),
    }
}

fn orders<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_match(req, "GET", "/admin/orders")?;
    let limit = limit(req);
    let offset = offset(req);
    let status_filter = req.query_value("status");
    let page = ledger_page(seams, "admin orders", offset, limit, |v| {
        Ok(
            (kind(&v) == "payment" && status_filter.map(|s| order_status(&v) == s).unwrap_or(true))
                .then_some(v),
        )
    })?;
    let total = page.total;
    let orders = page.entries.into_iter().map(order_json).collect::<Vec<_>>();
    Ok(RouteResponse::ok(&json!({
        "orders": orders,
        "count": orders.len(),
        "total": total,
        "hasMore": page_has_more(total, offset, limit, page.truncated),
        "truncated": page.truncated,
    })))
}

fn order_detail<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let id = path_id(&req.path, "/admin/orders/", None)?;
    let record = Db::new(seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_LEDGER, &id)?
        .ok_or_else(|| AppError::not_found("order not found"))?;
    if kind(&record.payload) != "payment" {
        return Err(AppError::not_found("order not found"));
    }
    let order = order_json(record.payload);
    Ok(RouteResponse::ok(&json!({
        "order": order,
        "history": [],
        "fulfillments": []
    })))
}
