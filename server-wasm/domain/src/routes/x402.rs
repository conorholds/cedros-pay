//! x402 crypto payment routes.
//!
//! - `POST /paywall/v1/derive-token-account` — pure associated-token-account
//!   derivation (no seam, no auth): a client building an SPL payment needs the
//!   recipient's ATA, a deterministic PDA of `(owner, mint)`.
//! - `GET /paywall/v1/blockhash` — a recent Solana blockhash, fetched from the
//!   operator's configured RPC over the `http_fetch` egress seam.
//!
//! `/verify` persists the verified on-chain signature as a pending ledger row
//! immediately after broadcast and before confirmation polling, so transient
//! status-check failures can still be reconciled later.

use serde::Deserialize;
use serde_json::{json, Value};

use crate::blockchain_config;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::{coupons, matches};
use crate::seams::HostSeams;
use crate::x402::{self, verifier::Requirement};

#[path = "x402_verify.rs"]
mod x402_verify;

/// The verification [`Requirement`] for a priced resource plus the fiat price
/// recorded on the ledger. Built by reading the operator x402 config and the
/// product's catalog price, converting fiat cents to the token's atomic units
/// (exact, float-free), and deriving the recipient ATA. Shared by `/quote` (the
/// 402 challenge) and `/verify` (settlement) so the two agree by construction.
#[derive(Debug)]
pub(super) struct ResourceRequirement {
    pub requirement: Requirement,
    pub control: blockchain_config::X402Control,
    /// Fiat price in whole cents (the ledger `gross_cents`).
    pub price_cents: i64,
    /// Human-readable resource name for the quote `description` (never secret).
    pub description: String,
}

/// Resolve the x402 requirement for `resource_id`, failing closed when x402 is
/// unconfigured, the resource is unknown, or it has no purchasable price.
pub(super) fn requirement_for_resource<S: HostSeams>(
    seams: &S,
    resource_id: &str,
) -> AppResult<ResourceRequirement> {
    if !x402::config::enabled(seams) {
        return Err(AppError::new(
            503,
            "unavailable",
            "x402 crypto payments are not enabled",
        ));
    }
    let control = blockchain_config::resolve_x402_control(
        seams,
        x402::config::payment_address(seams),
        x402::config::network(seams),
    )?;
    let token_mint = x402::config::token_mint(seams)
        .ok_or_else(|| AppError::new(503, "unavailable", "x402 token mint is not configured"))?;
    let token_decimals = x402::config::token_decimals(seams);
    x402::config::validate_payment_asset(
        &control.network,
        &token_mint,
        token_decimals,
        x402::config::token_symbol(seams).as_deref(),
    )
    .map_err(|message| AppError::new(503, "x402_unavailable", message))?;

    let product = Db::new(seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_CATALOG, resource_id)?
        .ok_or_else(|| AppError::not_found("unknown resource"))?;
    let price_cents = crate::routes::products::catalog_price_cents(&product.payload)
        .ok_or_else(|| AppError::unprocessable("resource has no purchasable price"))?;
    let description = ["displayName", "title", "name"]
        .iter()
        .find_map(|key| product.payload.get(*key).and_then(Value::as_str))
        .unwrap_or(resource_id)
        .to_string();

    let min_amount_atomic =
        x402::pricing::usd_cents_to_stablecoin_atomic(price_cents as u64, token_decimals)
            .map_err(|_| AppError::internal("price-to-token conversion overflowed"))?;
    let recipient_token_account = x402::ata::derive_token_account(&control.pay_to, &token_mint)
        .map_err(AppError::internal)?;

    Ok(ResourceRequirement {
        requirement: Requirement {
            recipient_token_account,
            token_mint,
            min_amount_atomic,
            decimals: token_decimals,
            resource_id: Some(resource_id.to_string()),
        },
        control,
        price_cents,
        description,
    })
}

/// Quote validity window advertised to the client (seconds).
const QUOTE_TIMEOUT_SECONDS: i64 = 300;

pub const ROUTES: &[RouteSpec] = &[
    RouteSpec {
        route_id: ids::ROUTE_DERIVE_TOKEN_ACCOUNT,
        method: "POST",
        path: "/paywall/v1/derive-token-account",
    },
    RouteSpec {
        route_id: ids::ROUTE_BLOCKHASH,
        method: "GET",
        path: "/paywall/v1/blockhash",
    },
    RouteSpec {
        route_id: ids::ROUTE_QUOTE,
        method: "POST",
        path: "/paywall/v1/quote",
    },
    RouteSpec {
        route_id: ids::ROUTE_VERIFY,
        method: "POST",
        path: "/paywall/v1/verify",
    },
];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    crate::native_storefront_policy::require_request(seams, req)?;
    match req.route_id.as_str() {
        ids::ROUTE_DERIVE_TOKEN_ACCOUNT => derive_token_account(req),
        ids::ROUTE_BLOCKHASH => blockhash(seams, req),
        ids::ROUTE_QUOTE => quote(seams, req),
        ids::ROUTE_VERIFY => x402_verify::verify(seams, req),
        _ => Err(AppError::not_found("unknown x402 route")),
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct QuoteReq {
    resource: String,
    #[serde(default)]
    coupon_code: Option<String>,
}

/// `POST /paywall/v1/quote` — the HTTP 402 payment challenge. Returns the exact
/// `accepts[]` the client's X402Manager validates (scheme/network/
/// maxAmountRequired/resource/payTo/asset/maxTimeoutSeconds + extra). The amount
/// is the resource price converted to token atomic units (exact, float-free); the
/// recipient is the operator wallet, and `extra.recipientTokenAccount` is its ATA
/// (the SPL transfer destination the buyer pays and `/verify` checks).
fn quote<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !matches(req, "POST", "/paywall/v1/quote") {
        return Err(AppError::not_found("unknown x402 route"));
    }
    let body: QuoteReq = serde_json::from_value(req.json_body()?).map_err(|e| {
        AppError::unprocessable("invalid request body").with_internal(e.to_string())
    })?;
    let resource = body.resource.trim();
    if resource.is_empty() {
        return Err(AppError::unprocessable("resource is required"));
    }
    if coupons::requested_code(&[body.coupon_code.as_deref()])?.is_some() {
        return Err(AppError::new(
            422,
            "coupon_not_applicable",
            "couponCode is not supported for single-resource x402 quotes; use cart quote so the discounted total is stored",
        ));
    }
    let resolved = requirement_for_resource(seams, resource)?;
    let memo_identity = crate::ctx::RequestContext::parse(&req.context_json)
        .request_id
        .unwrap_or_else(|| format!("{}:{}", seams.now_unix_secs(), req.body));
    let memo_digest = crate::routes::checkout_claim::fingerprint(&json!({
        "schemaVersion": 1,
        "resource": resource,
        "quoteIdentity": memo_identity,
    }))?;
    let memo = format!(
        "{};request={}",
        x402::verifier::expected_memo(resource),
        &memo_digest[..32]
    );
    let accept = quote_accept(seams, resource, &resolved, &memo);

    // x402 challenge is HTTP 402 Payment Required.
    Ok(RouteResponse::json(
        402,
        &json!({
            "x402Version": 0,
            "error": "payment required",
            "accepts": [accept],
        }),
    ))
}

fn quote_accept<S: HostSeams>(
    seams: &S,
    resource: &str,
    resolved: &ResourceRequirement,
    memo: &str,
) -> Value {
    let r = &resolved.requirement;
    let mut extra = serde_json::Map::new();
    extra.insert(
        "recipientTokenAccount".into(),
        Value::String(r.recipient_token_account.clone()),
    );
    extra.insert(
        "decimals".into(),
        Value::from(x402::config::token_decimals(seams)),
    );
    if let Some(symbol) = x402::config::token_symbol(seams) {
        extra.insert("tokenSymbol".into(), Value::String(symbol));
    }
    // The wallet writes `extra.memo` verbatim into the SPL Memo instruction, and
    // /verify requires the on-chain memo to carry this resource binding — without
    // it a confirmed payment cannot be bound to the resource it paid for.
    extra.insert("memo".into(), Value::String(memo.to_string()));
    if let Some(signer) = &resolved.control.managed_signer {
        extra.insert("feePayer".into(), Value::String(signer.public_key.clone()));
    }

    json!({
        // Scheme the client echoes into X-PAYMENT; /verify
        // authenticates the proof itself and does not gate on the scheme string.
        "scheme": "solana-spl-transfer",
        "network": resolved.control.network,
        "maxAmountRequired": r.min_amount_atomic.to_string(),
        "resource": resource,
        "description": resolved.description,
        "mimeType": "application/json",
        "payTo": resolved.control.pay_to,
        "maxTimeoutSeconds": QUOTE_TIMEOUT_SECONDS,
        "asset": r.token_mint,
        "extra": Value::Object(extra),
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeriveReq {
    owner: String,
    mint: String,
}

fn derive_token_account(req: &RouteRequest) -> AppResult<RouteResponse> {
    if !matches(req, "POST", "/paywall/v1/derive-token-account") {
        return Err(AppError::not_found("unknown x402 route"));
    }
    let body: DeriveReq = serde_json::from_value(req.json_body()?).map_err(|e| {
        AppError::unprocessable("invalid request body").with_internal(e.to_string())
    })?;
    let token_account = x402::ata::derive_token_account(&body.owner, &body.mint)
        .map_err(AppError::unprocessable)?;
    Ok(RouteResponse::ok(&json!({
        "tokenAccount": token_account,
        "owner": body.owner,
        "mint": body.mint,
    })))
}

fn blockhash<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !matches(req, "GET", "/paywall/v1/blockhash") {
        return Err(AppError::not_found("unknown x402 route"));
    }
    if !x402::config::enabled(seams) {
        return Err(AppError::new(
            503,
            "unavailable",
            "x402 crypto payments are not enabled",
        ));
    }
    let control = blockchain_config::resolve_x402_control(
        seams,
        x402::config::payment_address(seams),
        x402::config::network(seams),
    )
    .map_err(|_| {
        AppError::new(
            503,
            "unavailable",
            "x402 crypto payments are not configured",
        )
    })?;
    x402::rpc::verify_cluster(seams, &control.rpc_url, &control.network).map_err(|error| {
        AppError::new(502, "provider_unavailable", "Solana RPC network mismatch")
            .with_internal(error.message)
    })?;
    let raw =
        seams.http_fetch(&x402::rpc::build_get_latest_blockhash(&control.rpc_url).to_string())?;
    let latest = x402::rpc::parse_latest_blockhash(&raw).map_err(|e| {
        AppError::new(
            502,
            "provider_unavailable",
            "could not fetch a recent blockhash",
        )
        .with_internal(e.message)
    })?;
    Ok(RouteResponse::ok(&json!({
        "blockhash": latest.blockhash,
        "lastValidBlockHeight": latest.last_valid_block_height,
    })))
}

#[cfg(test)]
#[path = "x402_tests.rs"]
mod tests;
#[cfg(test)]
#[path = "x402_verify_tests.rs"]
mod verify_tests;
