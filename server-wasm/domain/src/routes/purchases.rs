//! `GET /paywall/v1/purchases` — the authenticated buyer's own purchase history.
//!
//! Buyer-authenticated via the cedros-login relying-party session ([`crate::auth`]),
//! so the caller's identity is verified, not asserted. Returns only that buyer's
//! succeeded payments from the commerce ledger, projected to a redacted purchase
//! shape — never another buyer's rows, the buyer profile id, wallet, or raw
//! metadata.

use serde_json::{json, Map, Value};

use crate::auth;
use crate::db::{Db, Dir, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::models::LedgerEntry;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::matches;
use crate::seams::HostSeams;

/// Page size when the caller does not specify one.
const DEFAULT_LIMIT: i64 = 50;
/// Hard cap on page size (DoS bound).
const MAX_LIMIT: i64 = 500;

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ids::ROUTE_PURCHASES,
    method: "GET",
    path: "/paywall/v1/purchases",
}];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !matches(req, "GET", "/paywall/v1/purchases") {
        return Err(AppError::not_found("unknown purchases route"));
    }
    // The buyer's identity is *verified* against cedros-login, not taken on trust.
    let buyer = auth::verify_buyer(seams, req)?;

    let limit = req
        .query_value("limit")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(DEFAULT_LIMIT)
        .clamp(1, MAX_LIMIT);
    let offset = req
        .query_value("offset")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(0)
        .max(0);

    let query = Query::new()
        .filter(Filter::new(
            "customerProfileId",
            Op::Eq,
            buyer.user_id.clone(),
        ))
        .filter(Filter::new("kind", Op::Eq, "payment"))
        .filter(Filter::new("status", Op::Eq, "succeeded"))
        .order("createdAt", Dir::Desc)
        .limit(limit)
        .offset(offset);

    let rows = Db::new(seams, ids::DB_ACCESS).read(ids::MODEL_LEDGER, &query)?;
    let purchases: Vec<Value> = rows
        .iter()
        .filter_map(|r| r.parse::<LedgerEntry>().ok())
        // Defense-in-depth on the buyer-privacy boundary: re-check ownership in
        // case the seam ever returns a row outside the requested scope.
        .filter(|e| {
            e.customer_profile_id.as_deref() == Some(buyer.user_id.as_str())
                && e.kind == "payment"
                && e.status == "succeeded"
        })
        .map(|e| purchase_json(&e))
        .collect();

    Ok(RouteResponse::ok(&json!({ "purchases": purchases })))
}

/// Redacted purchase projection from a ledger row: the payment reference, product,
/// amount, rail, status, and settlement time — never the buyer profile id, wallet,
/// provider-internal id, or raw attribution metadata.
fn purchase_json(e: &LedgerEntry) -> Value {
    let mut o = Map::new();
    o.insert("signature".into(), Value::String(e.reference.clone()));
    if let Some(product_id) = &e.product_id {
        o.insert("resourceId".into(), Value::String(product_id.clone()));
    }
    o.insert("amount".into(), Value::String(major(e.gross_cents)));
    o.insert("amountCents".into(), Value::from(e.gross_cents));
    o.insert("currency".into(), Value::String(e.currency.clone()));
    o.insert("provider".into(), Value::String(e.provider.clone()));
    o.insert("status".into(), Value::String(e.status.clone()));
    o.insert("paidAt".into(), Value::String(e.processed_at.clone()));
    Value::Object(o)
}

/// Format minor units (cents) as a fixed two-decimal major string (`1299` → `12.99`).
fn major(cents: i64) -> String {
    let abs = cents.unsigned_abs();
    format!(
        "{}{}.{:02}",
        if cents < 0 { "-" } else { "" },
        abs / 100,
        abs % 100
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fake::FakeSeams;

    const BASE_URL: &str = "cedros_login.base_url";

    fn authed_buyer(s: &FakeSeams, user_id: &str) {
        s.set_setting(BASE_URL, "https://site.example");
        // The public current-user round-trip resolves to this buyer.
        s.push_http_response(200, &format!(r#"{{"user":{{"id":"{user_id}"}}}}"#));
    }

    fn req() -> RouteRequest {
        RouteRequest {
            route_id: ids::ROUTE_PURCHASES.into(),
            method: "GET".into(),
            path: "/paywall/v1/purchases".into(),
            headers: vec![("authorization".into(), "Bearer end-user".into())],
            ..Default::default()
        }
    }

    fn seed_payment(s: &FakeSeams, key: &str, profile: &str, status: &str, cents: i64, at: &str) {
        s.seed(
            ids::MODEL_LEDGER,
            key,
            json!({
                "reference": key,
                "kind": "payment",
                "status": status,
                "grossCents": cents,
                "currency": "USD",
                "customerProfileId": profile,
                "productId": "prod_1",
                "provider": "x402",
                "createdAt": at,
                "processedAt": at,
            }),
        );
    }

    #[test]
    fn returns_only_the_callers_succeeded_purchases() {
        let s = FakeSeams::new();
        authed_buyer(&s, "user_42");
        // Two succeeded purchases for the buyer (newest first by createdAt),
        seed_payment(
            &s,
            "sig_a",
            "user_42",
            "succeeded",
            1299,
            "2026-05-01T00:00:00Z",
        );
        seed_payment(
            &s,
            "sig_b",
            "user_42",
            "succeeded",
            500,
            "2026-05-09T00:00:00Z",
        );
        // a pending one for the buyer (excluded),
        seed_payment(
            &s,
            "sig_c",
            "user_42",
            "pending",
            700,
            "2026-05-10T00:00:00Z",
        );
        // and a succeeded one for ANOTHER buyer (must never leak).
        seed_payment(
            &s,
            "sig_d",
            "user_99",
            "succeeded",
            9999,
            "2026-05-11T00:00:00Z",
        );

        let resp = handle(&s, &req()).unwrap();
        assert_eq!(resp.status, 200);
        let out: Value = serde_json::from_str(&resp.body).unwrap();
        let list = out["purchases"].as_array().unwrap();
        assert_eq!(list.len(), 2, "only the buyer's succeeded payments");
        // Newest first.
        assert_eq!(list[0]["signature"], "sig_b");
        assert_eq!(list[0]["amount"], "5.00");
        assert_eq!(list[0]["amountCents"], 500);
        assert_eq!(list[1]["signature"], "sig_a");
        assert_eq!(list[1]["amount"], "12.99");
        // No foreign row, no buyer-profile leak.
        assert!(list.iter().all(|p| p["signature"] != "sig_d"));
        assert!(list.iter().all(|p| p.get("customerProfileId").is_none()));
    }

    #[test]
    fn unauthenticated_is_401_before_any_db_read() {
        let s = FakeSeams::new();
        // No cedros-login config + no bearer → verify_buyer fails closed at 401.
        let req = RouteRequest {
            route_id: ids::ROUTE_PURCHASES.into(),
            method: "GET".into(),
            path: "/paywall/v1/purchases".into(),
            ..Default::default()
        };
        assert_eq!(handle(&s, &req).unwrap_err().status, 401);
    }

    #[test]
    fn empty_history_returns_an_empty_list() {
        let s = FakeSeams::new();
        authed_buyer(&s, "user_lonely");
        let out: Value = serde_json::from_str(&handle(&s, &req()).unwrap().body).unwrap();
        assert_eq!(out["purchases"].as_array().unwrap().len(), 0);
    }
}
