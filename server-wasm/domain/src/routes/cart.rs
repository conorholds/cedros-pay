//! Stateful multi-item cart quotes (`POST /paywall/v1/cart/quote`).
//!
//! A cart is priced once at quote time and stored as a [`CartRow`] snapshot keyed
//! by a `cart_<32 hex>` id; the client never re-sends the items. Settlement reuses
//! `POST /paywall/v1/verify` with `X-PAYMENT.payload.resource = "cart:{id}"` —
//! `verify()` resolves the stored snapshot via [`cart_requirement_from_stored`], so
//! the quote and the settlement agree by construction even if a catalog price
//! changes in between. Coupons are resolved and applied only at quote time so
//! later settlement rails bind to the stored discounted snapshot.
//!
//! Uses exact integer money math (no `f64`) and the host `database` seam.

use std::fmt::Write as _;

use serde::Deserialize;
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};

use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::models::{AppliedCoupon, CartLine, CartRow};
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::matches;
use crate::routes::x402::ResourceRequirement;
use crate::seams::HostSeams;
use crate::time;
use crate::x402::{self, verifier::Requirement};

#[path = "cart_support.rs"]
mod cart_support;
#[path = "cart_pricing.rs"]
mod pricing;

pub(super) use self::cart_support::{cart_id_from_path, is_valid_cart_id};
use pricing::cart_requirement;

/// Cart quote validity window (seconds). Carts get a longer TTL than single
/// quotes because a shopper assembling a multi-item cart needs more time to
/// complete the wallet payment.
const CART_QUOTE_TTL_SECONDS: i64 = 900;

/// Max items in one cart (DoS bound).
const MAX_CART_ITEMS: usize = 100;

/// Max quantity per line.
const MAX_ITEM_QUANTITY: u32 = 10_000;

pub const ROUTES: &[RouteSpec] = &[
    RouteSpec {
        route_id: ids::ROUTE_CART_QUOTE,
        method: "POST",
        path: "/paywall/v1/cart/quote",
    },
    RouteSpec {
        route_id: ids::ROUTE_CART_GET,
        method: "GET",
        path: "/paywall/v1/cart/{cartId}",
    },
];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    crate::native_storefront_policy::require_request(seams, req)?;
    match req.route_id.as_str() {
        ids::ROUTE_CART_QUOTE => cart_quote(seams, req),
        ids::ROUTE_CART_GET => cart_get(seams, req),
        _ => Err(AppError::not_found("unknown cart route")),
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CartQuoteReq {
    #[serde(default)]
    items: Vec<CartItemReq>,
    #[serde(default)]
    #[allow(dead_code)] // cart-level metadata is accepted but not yet persisted
    metadata: Option<Value>,
    // The crypto/Stripe rails send `coupon`; credits sends `couponCode`.
    #[serde(default)]
    coupon: Option<String>,
    #[serde(default)]
    coupon_code: Option<String>,
    #[serde(default)]
    discount_code: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CartItemReq {
    #[serde(default)]
    resource: String,
    #[serde(default)]
    variant_id: Option<String>,
    quantity: u32,
    #[serde(default)]
    #[allow(dead_code)] // per-item metadata is accepted but not yet persisted
    metadata: Option<Value>,
}

/// The priced cart: the verification [`Requirement`] (resource `cart:{id}`), the
/// fiat total for the ledger, and the resolved line snapshots for storage.
struct CartRequirement {
    requirement: Requirement,
    control: crate::blockchain_config::X402Control,
    total_cents: i64,
    original_total_atomic: u64,
    original_total_cents: i64,
    applied_coupon: Option<AppliedCoupon>,
    lines: Vec<CartLine>,
}

/// `POST /paywall/v1/cart/quote` — price a multi-item cart, store the snapshot, and
/// return the bare x402 `quote` (an `AcceptEntry`) the client signs against, at
/// HTTP 200. Clients consume the returned `quote` as the payment requirement.
fn cart_quote<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !matches(req, "POST", "/paywall/v1/cart/quote") {
        return Err(AppError::not_found("unknown cart route"));
    }
    let body: CartQuoteReq = serde_json::from_value(req.json_body()?).map_err(|e| {
        AppError::unprocessable("invalid request body").with_internal(e.to_string())
    })?;
    validate_items(&body.items)?;
    let coupon_code = crate::routes::coupons::requested_code(&[
        body.coupon.as_deref(),
        body.coupon_code.as_deref(),
        body.discount_code.as_deref(),
    ])?;

    let now = seams.now_unix_secs();
    let cart_id = generate_cart_id(&req.body, now);
    let built = cart_requirement(seams, &cart_id, &body.items, coupon_code.as_deref())?;
    // Persist the server-computed snapshot; /verify settles against it.
    let row = CartRow {
        cart_id: cart_id.clone(),
        items: built.lines.clone(),
        total_atomic: built.requirement.min_amount_atomic,
        total_cents: built.total_cents,
        original_total_atomic: built
            .applied_coupon
            .as_ref()
            .map(|_| built.original_total_atomic),
        original_total_cents: built
            .applied_coupon
            .as_ref()
            .map(|_| built.original_total_cents),
        applied_coupon: built.applied_coupon.clone(),
        currency: "USD".to_string(),
        token_mint: built.requirement.token_mint.clone(),
        token_decimals: built.requirement.decimals,
        recipient_token_account: built.requirement.recipient_token_account.clone(),
        paid_signature: None,
        settlement_claim: None,
        created_at: time::iso8601(now),
        expires_at: time::iso8601(now + CART_QUOTE_TTL_SECONDS),
    };
    let db = Db::new(seams, ids::DB_ACCESS);
    db.migrate(ids::MODEL_CART)?;
    let conditions = [GuardedCondition::Absent {
        content_model_id: ids::MODEL_CART,
        entry_key: cart_id.clone(),
    }];
    let ops = [BatchOp::Write {
        content_model_id: ids::MODEL_CART,
        entry_key: cart_id.clone(),
        data: serde_json::to_value(&row).map_err(|error| {
            AppError::internal("cannot encode cart quote").with_internal(error.to_string())
        })?,
    }];
    if matches!(
        db.guarded_batch(&conditions, &ops)?,
        GuardedBatchOutcome::Conflict { .. }
    ) {
        return Err(AppError::conflict(
            "cart quote identity already exists; retry",
        ));
    }

    Ok(RouteResponse::ok(&cart_quote_body(
        seams,
        &cart_id,
        &built,
        built.requirement.decimals,
        now,
    )))
}

/// `GET /paywall/v1/cart/{cartId}` — cart status for client polling. Reads the
/// stored snapshot and reports whether it has settled; returns only operator
/// aggregate data (total, expiry, settling signature), never buyer identifiers.
fn cart_get<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let cart_id =
        cart_id_from_path(&req.path).ok_or_else(|| AppError::not_found("cart not found"))?;
    if !is_valid_cart_id(cart_id) {
        return Err(AppError::not_found("cart not found"));
    }
    let row: CartRow = Db::new(seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_CART, cart_id)?
        .ok_or_else(|| AppError::not_found("cart not found"))?
        .parse()?;
    let decimals = x402::config::token_decimals(seams);
    let status = if row.paid_signature.is_some() {
        "paid"
    } else {
        "pending"
    };
    Ok(RouteResponse::ok(&json!({
        "cartId": row.cart_id,
        "status": status,
        "totalAmount": x402::pricing::format_atomic_decimal(row.total_atomic, decimals),
        "token": row.token_mint,
        "expiresAt": row.expires_at,
        "paidSignature": row.paid_signature,
    })))
}

/// Validate the cart shape before any pricing/DB work (fail fast, no side effects).
fn validate_items(items: &[CartItemReq]) -> AppResult<()> {
    if items.is_empty() {
        return Err(AppError::unprocessable(
            "cart must contain at least one item",
        ));
    }
    if items.len() > MAX_CART_ITEMS {
        return Err(AppError::unprocessable(format!(
            "cart cannot exceed {MAX_CART_ITEMS} items"
        )));
    }
    for (i, it) in items.iter().enumerate() {
        if it.resource.trim().is_empty() {
            return Err(AppError::unprocessable(format!(
                "item {i} is missing a resource"
            )));
        }
        if it.quantity == 0 || it.quantity > MAX_ITEM_QUANTITY {
            return Err(AppError::unprocessable(format!(
                "item {i} quantity must be between 1 and {MAX_ITEM_QUANTITY}"
            )));
        }
    }
    Ok(())
}

/// Build the quote body including the resource-binding memo the verifier requires.
fn cart_quote_body<S: HostSeams>(
    seams: &S,
    cart_id: &str,
    built: &CartRequirement,
    decimals: u8,
    now: i64,
) -> Value {
    let total_atomic = built.requirement.min_amount_atomic;
    let total_major = x402::pricing::format_atomic_decimal(total_atomic, decimals);
    let original_major =
        x402::pricing::format_atomic_decimal(built.original_total_atomic, decimals);
    let token_mint = &built.requirement.token_mint;
    let resource = format!("cart:{cart_id}");

    let items: Vec<Value> = built
        .lines
        .iter()
        .map(|l| {
            let mut o = Map::new();
            o.insert("resource".into(), Value::String(l.resource.clone()));
            if let Some(v) = &l.variant_id {
                o.insert("variantId".into(), Value::String(v.clone()));
            }
            o.insert("quantity".into(), Value::from(l.quantity));
            o.insert(
                "priceAmount".into(),
                Value::String(x402::pricing::format_atomic_decimal(
                    l.line_atomic,
                    decimals,
                )),
            );
            o.insert("token".into(), Value::String(token_mint.clone()));
            Value::Object(o)
        })
        .collect();

    let total_quantity: u64 = built.lines.iter().map(|l| l.quantity as u64).sum();
    let mut metadata = json!({
        "item_count": built.lines.len(),
        "total_quantity": total_quantity,
        "original_amount": original_major,
        "discounted_amount": total_major,
    });
    if let Some(coupon) = &built.applied_coupon {
        metadata["coupon_code"] = Value::String(coupon.code.clone());
        metadata["original_cents"] = Value::from(coupon.original_total_cents);
        metadata["discounted_cents"] = Value::from(coupon.discounted_total_cents);
    }

    let mut extra = Map::new();
    extra.insert(
        "recipientTokenAccount".into(),
        Value::String(built.requirement.recipient_token_account.clone()),
    );
    extra.insert("decimals".into(), Value::from(decimals));
    if let Some(symbol) = x402::config::token_symbol(seams) {
        extra.insert("tokenSymbol".into(), Value::String(symbol));
    }
    extra.insert(
        "memo".into(),
        Value::String(x402::verifier::expected_memo(&resource)),
    );
    if let Some(signer) = &built.control.managed_signer {
        extra.insert("feePayer".into(), Value::String(signer.public_key.clone()));
    }

    let quote = json!({
        "scheme": "solana-spl-transfer",
        "network": built.control.network,
        "maxAmountRequired": total_atomic.to_string(),
        "resource": resource,
        "description": format!("{} item cart", built.lines.len()),
        "mimeType": "application/json",
        "payTo": built.control.pay_to,
        "maxTimeoutSeconds": CART_QUOTE_TTL_SECONDS,
        "asset": token_mint,
        "extra": Value::Object(extra),
    });

    json!({
        "cartId": cart_id,
        "totalAmount": total_major,
        "items": items,
        "metadata": metadata,
        "expiresAt": time::iso8601(now + CART_QUOTE_TTL_SECONDS),
        "quote": quote,
    })
}

/// Generate a `cart_<32 hex>` id. The wasm guest has no host randomness seam, so
/// the id is the SHA-256 of the request body + the quote second — unique per
/// distinct cart and deterministic for an identical re-quote in the same second
/// (which maps to the same stored snapshot). Settlement security does not rest on
/// the id being unguessable: the on-chain signature is the authorization and the
/// stored total is immutable, so a guessed id cannot settle another buyer's cart.
fn generate_cart_id(body: &str, now: i64) -> String {
    let mut hasher = Sha256::new();
    hasher.update(body.as_bytes());
    hasher.update(now.to_le_bytes());
    let digest = hasher.finalize();
    let mut hex = String::with_capacity(32);
    for byte in &digest[..16] {
        let _ = write!(hex, "{byte:02x}");
    }
    format!("cart_{hex}")
}

/// Rebuild the verification requirement for a stored cart, for the `cart:` branch
/// of `/verify`. Reads the snapshot (total/mint/ATA frozen at quote time), so
/// settlement matches the quote even if catalog prices changed. An expired, unpaid
/// cart is rejected; a paid cart still resolves so a retry settles idempotently.
pub(super) fn cart_requirement_from_stored<S: HostSeams>(
    seams: &S,
    cart_id: &str,
    now: i64,
) -> AppResult<ResourceRequirement> {
    if !is_valid_cart_id(cart_id) {
        return Err(AppError::not_found("cart not found"));
    }
    let row: CartRow = Db::new(seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_CART, cart_id)?
        .ok_or_else(|| AppError::not_found("cart not found"))?
        .parse()?;
    let expired = time::parse_iso(&row.expires_at)
        .map(|exp| now > exp)
        .unwrap_or(false);
    if row.paid_signature.is_none() && expired {
        return Err(AppError::new(
            422,
            "unprocessable_entity",
            "cart quote has expired",
        ));
    }
    let control = crate::blockchain_config::resolve_x402_control(
        seams,
        x402::config::payment_address(seams),
        x402::config::network(seams),
    )?;
    let current_recipient = x402::ata::derive_token_account(&control.pay_to, &row.token_mint)
        .map_err(|_| AppError::new(503, "x402_unavailable", "x402 configuration is invalid"))?;
    if current_recipient != row.recipient_token_account {
        return Err(AppError::new(
            409,
            "x402_configuration_changed",
            "x402 payment destination changed; request a new cart quote",
        ));
    }
    Ok(ResourceRequirement {
        requirement: Requirement {
            recipient_token_account: row.recipient_token_account,
            token_mint: row.token_mint,
            min_amount_atomic: row.total_atomic,
            decimals: row.token_decimals,
            resource_id: Some(format!("cart:{cart_id}")),
        },
        control,
        price_cents: row.total_cents,
        description: format!("{} item cart", row.items.len()),
    })
}

#[cfg(test)]
#[path = "cart_tests.rs"]
mod tests;
