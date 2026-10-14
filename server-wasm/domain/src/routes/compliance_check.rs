//! `POST /paywall/v1/compliance-check` — pre-flight purchase compliance gate.
//!
//! The UI runs this before a Stripe checkout and **blocks the purchase on any
//! non-200** (`StripeManager.runComplianceCheck`). So this route ALWAYS answers
//! HTTP 200 with `{ cleared, reasons? }` for completed decisions. Malformed
//! requests and authoritative screening read failures return errors so checkout
//! fails closed instead of silently bypassing compliance. v1
//! enforces sanctions screening only: a supplied `wallet` is checked against the
//! static OFAC list and the authoritative stored sanctions list. KYC and token-gate
//! requirements are not evaluated by this route.

use serde::Deserialize;
use serde_json::{json, Value};

use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::matches;
use crate::seams::HostSeams;

/// OFAC-designated Solana wallet addresses (static floor; the sanctions-refresh job
/// can populate a richer `MODEL_COMPLIANCE` `sanctions-list` row).
const SANCTIONED_WALLETS: &[&str] = &["FW3g7yRSFCVPJsiBaKFbuiCfGHPPCKqBjP2rMXkmCjBr"];

/// Stored sanctions-list entry key in `MODEL_COMPLIANCE`.
const SANCTIONS_KEY: &str = "sanctions-list";

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ids::ROUTE_COMPLIANCE_CHECK,
    method: "POST",
    path: "/paywall/v1/compliance-check",
}];

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct CheckReq {
    // Accepted for the (deferred) per-product KYC/token-gate evaluation; v1 screens
    // sanctions on the wallet regardless of which resources are in the cart.
    #[serde(default)]
    #[allow(dead_code)]
    resources: Vec<String>,
    #[serde(default)]
    wallet: Option<String>,
}

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !matches(req, "POST", "/paywall/v1/compliance-check") {
        return Err(AppError::not_found("unknown compliance route"));
    }
    let body: CheckReq = serde_json::from_value(req.json_body()?).map_err(|error| {
        AppError::bad_request("invalid compliance request").with_internal(error.to_string())
    })?;
    validate(&body)?;

    Ok(RouteResponse::ok(&evaluate(seams, &body)?))
}

/// Completed-decision evaluation. The public Cedros Compliance registry publishes a
/// typed policy/read/check/audit capability, but the version-matched authoring kit does
/// not define an exact `extension-services.invoke` route or payload schema for it. Pay
/// therefore does not infer a live call. [`delegate_to_compliance`] stays as the explicit
/// host-coordinated boundary while this stable route preserves its documented local
/// sanctioned-wallet screen. Core read uncertainty fails closed.
fn evaluate<S: HostSeams>(seams: &S, body: &CheckReq) -> AppResult<Value> {
    if let Some(result) = delegate_to_compliance(seams, body) {
        return Ok(result);
    }
    let wallet = body
        .wallet
        .as_deref()
        .map(str::trim)
        .filter(|w| !w.is_empty());
    if let Some(wallet) = wallet {
        if is_sanctioned(seams, wallet)? {
            return Ok(json!({
                "cleared": false,
                "reasons": ["This wallet is on a restricted list and cannot complete the purchase."],
            }));
        }
    }
    Ok(json!({ "cleared": true }))
}

fn validate(body: &CheckReq) -> AppResult<()> {
    if body.resources.len() > 100 {
        return Err(AppError::bad_request("too many compliance resources"));
    }
    for resource in &body.resources {
        validate_text(resource, "resource", 255)?;
    }
    if let Some(wallet) = body.wallet.as_deref() {
        validate_text(wallet, "wallet", 128)?;
    }
    Ok(())
}

fn validate_text(value: &str, field: &str, max: usize) -> AppResult<()> {
    if value.trim().is_empty()
        || value.len() > max
        || value.chars().any(|character| character.is_control())
    {
        return Err(AppError::bad_request(format!("invalid {field}")));
    }
    Ok(())
}

/// Delegation seam to the `cedros-compliance` extension. Returns `Some({cleared,
/// reasons})` only after the host supplies the exact published route and schema contract,
/// or `None` to preserve the local screen. The host supports inter-extension invocation,
/// but capability metadata alone is not enough to invent this request. KYC,
/// accredited-investor, token-gate, and Compliance-owned sanctions logic must remain in
/// Cedros Compliance once that binding is documented and implemented.
fn delegate_to_compliance<S: HostSeams>(_seams: &S, _body: &CheckReq) -> Option<Value> {
    None
}

/// Whether `wallet` is sanctioned: the static OFAC floor plus the stored list.
/// An unreadable or malformed authoritative list is not equivalent to a clean result.
fn is_sanctioned<S: HostSeams>(seams: &S, wallet: &str) -> AppResult<bool> {
    if SANCTIONED_WALLETS.contains(&wallet) {
        return Ok(true);
    }
    let Some(record) =
        Db::new(seams, ids::DB_ACCESS).read_one(ids::MODEL_COMPLIANCE, SANCTIONS_KEY)?
    else {
        return Ok(false);
    };
    let addresses = record
        .payload
        .get("addresses")
        .and_then(Value::as_array)
        .ok_or_else(|| AppError::internal("stored sanctions list is malformed"))?;
    Ok(addresses
        .iter()
        .any(|address| address.as_str() == Some(wallet)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fake::FakeSeams;

    fn req(body: Value) -> RouteRequest {
        RouteRequest {
            route_id: ids::ROUTE_COMPLIANCE_CHECK.into(),
            method: "POST".into(),
            path: "/paywall/v1/compliance-check".into(),
            body: body.to_string(),
            ..Default::default()
        }
    }

    #[test]
    fn card_path_without_a_wallet_always_clears_with_200() {
        let s = FakeSeams::new();
        // The StripeManager card path sends only { resources } and no wallet.
        let resp = handle(&s, &req(json!({ "resources": ["prod_1", "prod_2"] }))).unwrap();
        assert_eq!(resp.status, 200);
        let out: Value = serde_json::from_str(&resp.body).unwrap();
        assert_eq!(out["cleared"], true);
        assert!(out.get("reasons").is_none());
    }

    #[test]
    fn a_sanctioned_wallet_is_blocked_with_200_and_reasons() {
        let s = FakeSeams::new();
        let resp = handle(
            &s,
            &req(json!({ "resources": ["prod_1"], "wallet": "FW3g7yRSFCVPJsiBaKFbuiCfGHPPCKqBjP2rMXkmCjBr" })),
        )
        .unwrap();
        assert_eq!(resp.status, 200, "always 200, even when blocked");
        let out: Value = serde_json::from_str(&resp.body).unwrap();
        assert_eq!(out["cleared"], false);
        assert!(!out["reasons"].as_array().unwrap().is_empty());
    }

    #[test]
    fn a_clean_wallet_clears() {
        let s = FakeSeams::new();
        let out: Value = serde_json::from_str(
            &handle(
                &s,
                &req(json!({ "wallet": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" })),
            )
            .unwrap()
            .body,
        )
        .unwrap();
        assert_eq!(out["cleared"], true);
    }

    #[test]
    fn stored_sanctions_list_also_blocks() {
        let s = FakeSeams::new();
        s.seed(
            ids::MODEL_COMPLIANCE,
            SANCTIONS_KEY,
            json!({ "addresses": ["BadWallet1111111111111111111111111111111111"] }),
        );
        let out: Value = serde_json::from_str(
            &handle(
                &s,
                &req(json!({ "wallet": "BadWallet1111111111111111111111111111111111" })),
            )
            .unwrap()
            .body,
        )
        .unwrap();
        assert_eq!(out["cleared"], false);
    }

    #[test]
    fn malformed_body_fails_closed_with_bad_request() {
        let s = FakeSeams::new();
        let bad = RouteRequest {
            route_id: ids::ROUTE_COMPLIANCE_CHECK.into(),
            method: "POST".into(),
            path: "/paywall/v1/compliance-check".into(),
            body: "not json".into(),
            ..Default::default()
        };
        let error = handle(&s, &bad).unwrap_err();
        assert_eq!((error.status, error.code), (400, "bad_request"));
    }

    #[test]
    fn malformed_authoritative_list_fails_closed() {
        let s = FakeSeams::new();
        s.seed(
            ids::MODEL_COMPLIANCE,
            SANCTIONS_KEY,
            json!({ "addresses": "unavailable" }),
        );

        let error = handle(
            &s,
            &req(json!({ "wallet": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" })),
        )
        .unwrap_err();

        assert_eq!((error.status, error.code), (500, "internal_error"));
    }
}
