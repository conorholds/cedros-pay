//! `POST /paywall/v1/cart/{cartId}/credits/authorize` — pay a stored cart with the
//! buyer's Cedros credits balance (the cart's second settlement rail beside x402).
//!
//! Buyer-authenticated (cedros-login relying-party session; verified, not asserted).
//! Spends the cart's exact fiat total from the verified buyer's balance through the
//! one credits ledger (the host contract forbids a parallel balance ledger), records
//! the commerce-ledger row, marks the cart paid, and emits the unified
//! payment-succeeded(credits, checkout) + entitlement-changed.
//!
//! Idempotent and crash-safe: the credit spend is keyed by the cart's credits source
//! ref, an already-paid cart returns success without moving credits, and a retry
//! after a mid-flight kill re-converges (the spend is a no-op, the ledger write and
//! cart-paid flag are idempotent).

use serde_json::json;

use crate::auth;
use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::ids;
use crate::models::{CartRow, CartSettlementClaim, LedgerEntry};
use crate::money;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::cart::{cart_id_from_path, is_valid_cart_id};
use crate::routes::credits::{apply_guarded_credit_move, CreditMove};
use crate::routes::{analytics_events, entitlements};
use crate::seams::HostSeams;
use crate::time;

#[path = "cart_credits_support.rs"]
mod support;

/// Kept empty until the host conditional-batch contract is available and this
/// handler claims the cart, credit txn, and account version in one transaction.
pub const ROUTES: &[RouteSpec] = &[];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    crate::native_storefront_policy::require_request(seams, req)?;
    match req.route_id.as_str() {
        ids::ROUTE_CART_CREDITS_AUTHORIZE => authorize(seams, req),
        _ => Err(AppError::not_found("unknown cart credits route")),
    }
}

fn authorize<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let buyer = auth::verify_buyer(seams, req)?;
    let cart_id = cart_id_from_path(&req.path)
        .filter(|id| is_valid_cart_id(id))
        .ok_or_else(|| AppError::not_found("cart not found"))?;

    let db = Db::new(seams, ids::DB_ACCESS);
    let cart_record = db
        .read_one(ids::MODEL_CART, cart_id)?
        .ok_or_else(|| AppError::not_found("cart not found"))?;
    let mut cart: CartRow = cart_record.parse()?;

    // A checkout-time coupon must already be applied on the stored quote —
    // rejecting a late/mismatched code here mirrors the Stripe cart rail, so no
    // rail silently ignores a code the buyer believes is active.
    let requested = support::requested_coupon(&req.body)?;
    crate::routes::coupons::matching_snapshot_coupon(
        requested.as_deref(),
        cart.applied_coupon.as_ref(),
    )?;

    // Already settled (by any rail) → idempotent success, never a second charge.
    if let Some(signature) = cart.paid_signature.clone() {
        let provider = support::settled_provider(&cart, cart_id, &signature);
        if provider == "credits" {
            ensure_settlement_effect(seams, &db, &signature)?;
        }
        return Ok(support::settled_response(
            cart_id, &signature, &provider, None,
        ));
    }
    let now = seams.now_unix_secs();
    if time::parse_iso(&cart.expires_at)
        .map(|exp| now > exp)
        .unwrap_or(false)
    {
        return Err(AppError::new(
            422,
            "unprocessable_entity",
            "cart quote has expired",
        ));
    }

    // Fail closed on a corrupted snapshot rather than spending a non-positive total.
    money::require_positive(cart.total_cents).map_err(AppError::unprocessable)?;
    let total_cents = cart.total_cents;
    let currency = cart.currency.clone();
    // Buyer-scoped idempotency: a buyer's spend on a cart is keyed by (cart, buyer), so a
    // concurrent second buyer can never ride the first buyer's credit txn for free.
    let source_ref = format!("cart-credits:{cart_id}:{}", buyer.user_id);
    let resource = format!("cart:{cart_id}");
    let fingerprint = crate::routes::checkout_claim::fingerprint(&json!({
        "schemaVersion": 1,
        "rail": "credits",
        "cartId": cart_id,
        "subjectId": buyer.user_id,
        "sourceRef": source_ref,
        "amountCents": total_cents,
        "currency": currency,
    }))?;
    crate::routes::cart_settlement::validate_owner(&cart, "credits", &fingerprint)?;

    // The commerce-ledger row + the cart-paid flag commit ATOMICALLY with the debit (one
    // `batch`), so money never moves without its record and a crash-retry re-converges
    // without a second charge (apply_credit_move replays them alone if the debit landed).
    cart.paid_signature = Some(source_ref.clone());
    cart.settlement_claim = Some(CartSettlementClaim {
        started_at: Some(time::iso8601(now)),
        schema_version: 1,
        rail: "credits".to_string(),
        fingerprint: fingerprint.clone(),
        reference: source_ref.clone(),
        status: "succeeded".to_string(),
    });
    let entry = LedgerEntry {
        reference: source_ref.clone(),
        kind: "payment".to_string(),
        status: "succeeded".to_string(),
        gross_cents: total_cents,
        refund_cents: 0,
        currency: currency.clone(),
        customer_profile_id: Some(buyer.user_id.clone()),
        route_path: None,
        product_id: Some(resource.clone()),
        product_ids: vec![resource.clone()],
        provider: "credits".to_string(),
        provider_ref: Some(source_ref.clone()),
        payer_wallet: None,
        created_at: time::iso8601(now),
        processed_at: time::iso8601(now),
        token_settlement: None,
    };
    let mut extra_conditions = vec![
        crate::routes::cart_settlement::version_guard(&cart_record)?,
        GuardedCondition::Absent {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: source_ref.clone(),
        },
    ];
    let mut extra_ops = vec![
        BatchOp::Write {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: source_ref.clone(),
            data: support::encode_ledger(&entry)?,
        },
        crate::routes::cart_settlement::write_cart(&cart)?,
    ];
    let actions = vec![
        entitlements::changed_action(
            "purchase_completed",
            Some(&buyer.user_id),
            Some(&resource),
            Some(&source_ref),
            Some(&source_ref),
            now,
        ),
        analytics_events::payment_succeeded_action(
            "credits",
            "checkout",
            total_cents,
            &currency,
            now,
        ),
    ];
    if let Some(effect) =
        crate::durable_effects::plan("cart-credit-payment", &source_ref, actions, now)?
    {
        extra_conditions.push(effect.condition);
        extra_ops.push(effect.op);
    }
    let outcome = match apply_guarded_credit_move(
        seams,
        &CreditMove {
            subject_id: &buyer.user_id,
            amount_cents: total_cents,
            currency: Some(&currency),
            kind: "authorize",
            delta: -total_cents,
            source_ref: &source_ref,
            reason: Some(&resource),
        },
        &extra_conditions,
        &extra_ops,
    ) {
        Ok(outcome) => outcome,
        Err(error) if error.status == 409 => {
            let current: CartRow = db
                .read_one(ids::MODEL_CART, cart_id)?
                .ok_or_else(|| AppError::conflict("cart disappeared during settlement"))?
                .parse()?;
            if current.paid_signature.as_deref() != Some(source_ref.as_str()) {
                return Err(error);
            }
            crate::routes::cart_settlement::validate_owner(&current, "credits", &fingerprint)?;
            ensure_settlement_effect(seams, &db, &source_ref)?;
            return Ok(support::settled_response(
                cart_id,
                &source_ref,
                "credits",
                None,
            ));
        }
        Err(error) => return Err(error),
    };
    crate::durable_effects::dispatch_best_effort(seams, "cart-credit-payment", &source_ref);
    Ok(support::settled_response(
        cart_id,
        &source_ref,
        "credits",
        Some(outcome.balance_cents),
    ))
}

fn ensure_settlement_effect<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    source_ref: &str,
) -> AppResult<()> {
    let row = db
        .read_one(ids::MODEL_LEDGER, source_ref)?
        .ok_or_else(|| AppError::internal("settled credits cart is missing its ledger entry"))?;
    let entry: LedgerEntry = row.parse()?;
    if entry.status != "succeeded" || entry.provider != "credits" {
        return Err(AppError::internal(
            "settled credits cart has an invalid ledger entry",
        ));
    }
    let occurred_at = time::parse_iso(&entry.processed_at)
        .or_else(|| time::parse_iso(&entry.created_at))
        .ok_or_else(|| AppError::internal("settled credits cart has an invalid timestamp"))?;
    let actions = vec![
        entitlements::changed_action(
            "purchase_completed",
            entry.customer_profile_id.as_deref(),
            entry.product_id.as_deref(),
            Some(source_ref),
            Some(source_ref),
            occurred_at,
        ),
        analytics_events::payment_succeeded_action(
            "credits",
            "checkout",
            entry.gross_cents,
            &entry.currency,
            occurred_at,
        ),
    ];
    crate::durable_effects::ensure(db, "cart-credit-payment", source_ref, actions, occurred_at)?;
    crate::durable_effects::dispatch_best_effort(seams, "cart-credit-payment", source_ref);
    Ok(())
}

#[cfg(test)]
#[path = "cart_credits_tests.rs"]
mod tests;
