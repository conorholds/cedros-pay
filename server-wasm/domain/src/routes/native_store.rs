//! `POST /paywall/v1/native-store/verify` — server-side verification of an Apple App
//! Store / Google Play in-app purchase, against the operator's *own* store credentials
//! (configured in the admin "App Stores" panel — nothing is hardcoded here).
//!
//! Apple flow: sign an App Store Connect API bearer JWT with the operator's `.p8` key,
//! look the transaction up on Apple's App Store Server API over the `http_fetch` egress
//! seam (prod, then sandbox when the operator allows it), then *cryptographically verify*
//! the signed JWS Apple returns — its x5c chain is pinned to the embedded Apple Root CA
//! G3 (defense-in-depth on top of the TLS-authenticated API). Three fraud gates then
//! apply before anything is recorded:
//!
//! 1. the receipt's `productId` must equal the claimed `storeProductId` (Apple says so);
//! 2. the catalog product must itself declare that same store product id (blocks claiming
//!    an expensive entitlement for a cheap store purchase);
//! 3. the receipt `bundleId` must match the operator's configured app.
//!
//! A succeeded ledger row, idempotent on the store transaction id, is then written.
//!
//! Google Play (`native_store_google.rs`) mirrors this: an RS256 service-account
//! assertion mints an OAuth2 token, the Android Publisher API confirms the purchase
//! token, and the same over-claim gate + idempotent ledger apply.

use serde::Deserialize;
#[cfg(test)]
use serde_json::json;
use serde_json::{Map, Value};

use crate::auth;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::matches;
use crate::seams::HostSeams;

#[path = "native_store_apple_config.rs"]
mod apple_config;
#[path = "native_store_apple.rs"]
mod apple_flow;
use apple_flow::verify_apple;
pub(super) use apple_flow::{apple_config, AppleConfig};
#[cfg(test)]
use apple_flow::{fetch_apple_tx, finalize_apple, AppleTx};
#[path = "native_store_commit.rs"]
mod purchase_commit;
#[path = "native_store_purchase_plan.rs"]
mod purchase_plan;
#[path = "native_store_subscription_projection.rs"]
mod subscription_projection;

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ids::ROUTE_NATIVE_STORE_VERIFY,
    method: "POST",
    path: "/paywall/v1/native-store/verify",
}];

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct VerifyReq {
    product_id: String,
    method: String,
    store_product_id: String,
    #[serde(default)]
    transaction_id: Option<String>,
    #[serde(default)]
    #[allow(dead_code)] // accepted for parity; Apple resolves identity from the receipt
    original_transaction_id: Option<String>,
    #[serde(default)]
    purchase_token: Option<String>,
    #[serde(default)]
    #[allow(dead_code)] // accepted for compatibility; operator package identity always wins
    package_name: Option<String>,
    #[serde(default)]
    #[allow(dead_code)] // accepted for parity; not used server-side
    metadata: Map<String, Value>,
}

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    crate::native_storefront_policy::require_request(seams, req)?;
    if !matches(req, "POST", "/paywall/v1/native-store/verify") {
        return Err(AppError::not_found("unknown native-store route"));
    }
    let body: VerifyReq = serde_json::from_value(req.json_body()?).map_err(|e| {
        AppError::unprocessable("invalid request body").with_internal(e.to_string())
    })?;
    if !valid_purchase_identity(&body.product_id)
        || !valid_purchase_identity(&body.store_product_id)
    {
        return Err(AppError::unprocessable(
            "productId and storeProductId must be bounded identifiers",
        ));
    }

    if !matches!(body.method.as_str(), "apple_iap" | "google_play_billing") {
        return Err(AppError::unprocessable(
            "method must be 'apple_iap' or 'google_play_billing'",
        ));
    }
    // The store receipt proves payment, not who may claim the entitlement. Bind
    // the provider identity to a live Cedros Login subject before any egress or
    // durable claim so anonymous callers cannot squat on a victim's receipt.
    let buyer = auth::verify_buyer(seams, req)?;

    match body.method.as_str() {
        "apple_iap" => verify_apple(seams, &body, Some(buyer.user_id)),
        "google_play_billing" => google_flow::verify_google(seams, &body, Some(buyer.user_id)),
        _ => unreachable!("native-store method validated above"),
    }
}

fn valid_purchase_identity(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 255
        && value == value.trim()
        && !value.chars().any(char::is_control)
}

// ── shared finalization ──────────────────────────────────────────────────────────

/// Load the catalog product the buyer is claiming, or `404`.
fn load_catalog_product<S: HostSeams>(seams: &S, product_id: &str) -> AppResult<Value> {
    Db::new(seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_CATALOG, product_id)?
        .map(|r| r.payload)
        .ok_or_else(|| AppError::not_found("unknown product"))
}

/// Gate 2 (anti over-claim): the catalog product must itself declare `store_product_id`
/// as its store id for `platform`, so a caller can't claim an expensive entitlement for
/// a cheap store purchase.
fn require_declared_store_product(
    product: &Value,
    platform: &str,
    store_product_id: &str,
) -> AppResult<()> {
    if declared_store_product_id(product, platform).as_deref() != Some(store_product_id) {
        return Err(AppError::new(
            403,
            "product_mismatch",
            "product is not configured for this app store product",
        ));
    }
    Ok(())
}

// ── helpers ─────────────────────────────────────────────────────────────────────

fn verification_failed(message: &'static str) -> AppError {
    AppError::new(502, "verification_failed", message)
}

/// Read a `native_store.{key}` string setting (tolerant of raw or JSON-string storage).
fn ns_setting<S: HostSeams>(seams: &S, key: &str) -> Option<String> {
    let raw = seams
        .setting_get(&format!("native_store.{key}"))
        .ok()
        .flatten()?;
    let value = serde_json::from_str::<Value>(&raw)
        .ok()
        .and_then(|v| v.as_str().map(str::to_string))
        .unwrap_or(raw);
    let trimmed = value.trim().to_string();
    (!trimmed.is_empty()).then_some(trimmed)
}

/// Read a `native_store.{key}` boolean setting (`true`/`"true"`/`1`).
fn ns_bool<S: HostSeams>(seams: &S, key: &str) -> bool {
    match ns_setting(seams, key) {
        Some(v) => matches!(v.to_ascii_lowercase().as_str(), "true" | "1" | "yes"),
        None => false,
    }
}

/// The store product id a catalog product declares for `platform` (`apple`/`google`),
/// under either the `storeProduct.{platform}.productId` or `storeBilling.{platform}`
/// shape.
fn declared_store_product_id(product: &Value, platform: &str) -> Option<String> {
    ["storeProduct", "storeBilling"]
        .iter()
        .find_map(|parent| {
            product
                .get(parent)
                .and_then(|v| v.get(platform))
                .and_then(|v| v.get("productId"))
                .and_then(Value::as_str)
        })
        .map(str::to_string)
}

#[path = "native_store_google.rs"]
mod google_flow;
#[path = "native_store_google_state.rs"]
mod google_state;

#[cfg(test)]
#[path = "native_store_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "native_store_guarded_tests.rs"]
mod guarded_tests;
