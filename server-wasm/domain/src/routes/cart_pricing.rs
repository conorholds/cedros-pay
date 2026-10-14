use super::*;

/// Price every line (exact integer atomic units) and derive the cart requirement.
/// Mirrors `x402::requirement_for_resource` but sums across items.
pub(super) fn cart_requirement<S: HostSeams>(
    seams: &S,
    cart_id: &str,
    items: &[CartItemReq],
    coupon_code: Option<&str>,
) -> AppResult<CartRequirement> {
    if !x402::config::enabled(seams) {
        return Err(AppError::new(
            503,
            "unavailable",
            "x402 crypto payments are not enabled",
        ));
    }
    let control = crate::blockchain_config::resolve_x402_control(
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

    let db = Db::new(seams, ids::DB_ACCESS);
    let mut line_atomics: Vec<u64> = Vec::with_capacity(items.len());
    let mut total_cents: i64 = 0;
    let mut lines: Vec<CartLine> = Vec::with_capacity(items.len());
    for it in items {
        let resource = it.resource.trim();
        let product = db
            .read_one(ids::MODEL_CATALOG, resource)?
            .ok_or_else(|| AppError::not_found("unknown resource"))?;
        let unit_cents = resolve_price_cents(&product.payload, it.variant_id.as_deref())
            .ok_or_else(|| AppError::unprocessable("resource has no purchasable price"))?;
        let unit_atomic =
            x402::pricing::usd_cents_to_stablecoin_atomic(unit_cents as u64, token_decimals)
                .map_err(|_| AppError::internal("price-to-token conversion overflowed"))?;
        let line_atomic = x402::pricing::line_total(unit_atomic, it.quantity as u64)
            .map_err(|_| AppError::internal("cart line total overflowed"))?;
        let line_cents = unit_cents
            .checked_mul(it.quantity as i64)
            .ok_or_else(|| AppError::internal("cart line cents overflowed"))?;
        total_cents = total_cents
            .checked_add(line_cents)
            .ok_or_else(|| AppError::internal("cart total cents overflowed"))?;
        line_atomics.push(line_atomic);
        lines.push(CartLine {
            resource: resource.to_string(),
            variant_id: it.variant_id.clone(),
            quantity: it.quantity,
            line_atomic,
            line_cents,
        });
    }
    let original_total_atomic = x402::pricing::sum_atomic(&line_atomics)
        .map_err(|_| AppError::internal("cart total overflowed"))?;
    let original_total_cents = total_cents;
    let coupon = crate::routes::coupons::apply_to_cart(
        seams,
        coupon_code,
        original_total_cents,
        original_total_atomic,
        token_decimals,
    )?;
    let total_atomic = coupon.total_atomic.unwrap_or(original_total_atomic);
    total_cents = coupon.total_cents;
    let recipient_token_account = x402::ata::derive_token_account(&control.pay_to, &token_mint)
        .map_err(AppError::internal)?;
    Ok(CartRequirement {
        requirement: Requirement {
            recipient_token_account,
            token_mint,
            min_amount_atomic: total_atomic,
            decimals: token_decimals,
            resource_id: Some(format!("cart:{cart_id}")),
        },
        control,
        total_cents,
        original_total_atomic,
        original_total_cents,
        applied_coupon: coupon.applied_coupon,
        lines,
    })
}

/// Resolve a purchasable price in fiat cents: the variant price (`variants[].id ==
/// variant_id`, `price.amountCents`) if a variant is named and priced, else the
/// product-level `price.amountCents`. `None` when nothing is purchasable.
fn resolve_price_cents(payload: &Value, variant_id: Option<&str>) -> Option<i64> {
    if let Some(vid) = variant_id.map(str::trim).filter(|v| !v.is_empty()) {
        let variant_cents = payload
            .get("variants")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .find(|v| v.get("id").and_then(Value::as_str) == Some(vid))
            .and_then(|v| v.get("price"))
            .and_then(|p| p.get("amountCents"))
            .and_then(Value::as_i64)
            .filter(|c| *c > 0);
        if let Some(cents) = variant_cents {
            return Some(cents);
        }
    }
    // Product-level price across every catalog price shape (fiatAmountCents etc.).
    crate::routes::products::catalog_price_cents(payload)
}
