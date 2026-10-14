use std::collections::BTreeSet;

use super::storage::CartRecord;
use super::{identity, snapshot_validation, validation, CartItemInput, CartLine, ShopCartSnapshot};
use crate::error::{AppError, AppResult};

pub(super) fn verify(cart: &CartRecord) -> AppResult<()> {
    let mut quantity = 0u64;
    let mut subtotal = 0u64;
    let mut currency = None;
    let mut positions = BTreeSet::new();
    for (key, line) in &cart.lines {
        stored_line(line)?;
        let expected_key = identity::line_key(&line.product_id, line.variant_id.as_deref());
        let expected_total = line
            .unit_amount_cents
            .checked_mul(line.quantity)
            .ok_or_else(|| corrupt("cart line total"))?;
        if key != &line.line_key
            || line.line_key != expected_key
            || line.line_total_cents != expected_total
            || !positions.insert(line.position)
        {
            return Err(corrupt("cart line"));
        }
        quantity = quantity
            .checked_add(line.quantity)
            .ok_or_else(|| corrupt("cart total"))?;
        subtotal = subtotal
            .checked_add(line.line_total_cents)
            .ok_or_else(|| corrupt("cart total"))?;
        if *currency.get_or_insert(&line.currency) != &line.currency {
            return Err(corrupt("cart currency"));
        }
    }
    if quantity != cart.total_quantity
        || subtotal != cart.subtotal_cents
        || quantity > validation::MAX_TOTAL_QUANTITY
        || subtotal > validation::MAX_SUBTOTAL_CENTS
        || currency.cloned() != cart.currency
    {
        return Err(corrupt("cart totals"));
    }
    snapshot_validation::validate(&ShopCartSnapshot {
        items: Vec::new(),
        promo_code: cart.promo_code.clone(),
        promo_codes: cart.promo_codes.clone(),
    })
    .map_err(|error| corrupt(&format!("cart promotions: {}", error.message)))
}

fn stored_line(line: &CartLine) -> AppResult<()> {
    validation::product_identity(&line.product_id, line.variant_id.as_deref())?;
    validation::quantity_value(line.quantity)?;
    if line.unit_amount_cents == 0
        || line.unit_amount_cents > validation::MAX_UNIT_AMOUNT_CENTS
        || line.currency.len() != 3
        || !line.currency.bytes().all(|byte| byte.is_ascii_uppercase())
    {
        return Err(corrupt("cart line"));
    }
    validation::item_input(&CartItemInput {
        product_id: line.product_id.clone(),
        variant_id: line.variant_id.clone(),
        quantity: line.quantity,
        unit_amount_cents: line.unit_amount_cents,
        currency: line.currency.clone(),
        title_snapshot: line.title_snapshot.clone(),
        image_snapshot: line.image_snapshot.clone(),
        payment_resource: line.payment_resource.clone(),
        metadata: line.metadata.clone(),
        hold_id: line.hold_id.clone(),
        hold_expires_at: line.hold_expires_at.clone(),
    })
    .map_err(|error| corrupt(&format!("cart line: {}", error.message)))
}

fn corrupt(record: &str) -> AppError {
    AppError::internal(format!("stored versioned {record} record is invalid"))
}
