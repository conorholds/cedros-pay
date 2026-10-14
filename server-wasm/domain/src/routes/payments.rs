//! `GET /payments/v1/status?ref=…` — relying-party payment-status read.
//!
//! Part of the upstream contract other extensions consume (audit §8). Returns a
//! redacted status view of a ledger reference; never buyer PII.

use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::models::LedgerEntry;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::{matches, verify_relying_party};
use crate::seams::HostSeams;
use serde_json::json;

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ids::ROUTE_PAYMENTS,
    method: "GET",
    path: "/payments/v1/status",
}];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    verify_relying_party(seams, req)?;
    if !matches(req, "GET", "/payments/v1/status") {
        return Err(AppError::not_found("unknown payments route"));
    }
    let reference = req
        .query_value("ref")
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::bad_request("ref query parameter is required"))?;

    let db = Db::new(seams, ids::DB_ACCESS);
    let entry = db
        .read_one(ids::MODEL_LEDGER, reference)?
        .ok_or_else(|| AppError::not_found("no payment for that reference"))?;
    let ledger: LedgerEntry = entry.parse()?;

    Ok(RouteResponse::ok(&json!({
        "reference": ledger.reference,
        "status": ledger.status,
        "kind": ledger.kind,
        "grossCents": ledger.gross_cents,
        "refundCents": ledger.refund_cents,
        "netCents": ledger.net_cents(),
        "currency": ledger.currency,
        "processedAt": ledger.processed_at,
    })))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fake::FakeSeams;

    fn seeded() -> FakeSeams {
        let s = FakeSeams::new();
        s.set_secret(ids::SECRET_RP_TOKEN, "rp-secret");
        s.seed(
            ids::MODEL_LEDGER,
            "ord_1",
            json!({
                "reference": "ord_1", "kind": "payment", "status": "succeeded",
                "grossCents": 5_000, "refundCents": 500, "currency": "USD",
                "provider": "stripe", "createdAt": "2026-05-31T10:00:00Z",
                "processedAt": "2026-05-31T10:00:00Z"
            }),
        );
        s
    }

    fn req(token: Option<&str>, reference: &str) -> RouteRequest {
        let mut r = RouteRequest {
            route_id: ids::ROUTE_PAYMENTS.into(),
            method: "GET".into(),
            path: "/payments/v1/status".into(),
            query: vec![("ref".into(), reference.into())],
            ..Default::default()
        };
        if let Some(t) = token {
            r.headers
                .push(("authorization".into(), format!("Bearer {t}")));
        }
        r
    }

    #[test]
    fn requires_relying_party_token() {
        let s = seeded();
        assert_eq!(
            crate::router::handle_route(&s, req(None, "ord_1")).status,
            401
        );
        assert_eq!(
            crate::router::handle_route(&s, req(Some("wrong"), "ord_1")).status,
            401
        );
    }

    #[test]
    fn returns_redacted_status() {
        let s = seeded();
        let resp = handle(&s, &req(Some("rp-secret"), "ord_1")).unwrap();
        assert_eq!(resp.status, 200);
        let body: serde_json::Value = serde_json::from_str(&resp.body).unwrap();
        assert_eq!(body["status"], "succeeded");
        assert_eq!(body["netCents"], 4_500);
        assert!(body.get("customerProfileId").is_none());
    }

    #[test]
    fn unknown_reference_is_404() {
        let s = seeded();
        assert_eq!(
            handle(&s, &req(Some("rp-secret"), "nope"))
                .unwrap_err()
                .status,
            404
        );
    }

    #[test]
    fn disabled_when_secret_unset() {
        let s = FakeSeams::new(); // no RP secret
        assert_eq!(
            handle(&s, &req(Some("anything"), "ord_1"))
                .unwrap_err()
                .status,
            403
        );
    }
}
