use std::collections::BTreeMap;

use super::storage::CartRecord;
use super::{identity, replacement, validation, CartItemInput, CartLine, CartMutation};
use crate::error::AppResult;
use crate::time;

pub(super) fn apply(
    current: Option<&CartRecord>,
    scope_hash: &str,
    lane_hash: &str,
    generation_epoch: u64,
    mutation: &CartMutation,
    now: i64,
) -> AppResult<CartRecord> {
    let now_iso = time::iso8601(now);
    let mut cart = current.cloned().unwrap_or_else(|| CartRecord {
        schema_version: 1,
        scope_hash: scope_hash.to_string(),
        lane_hash: lane_hash.to_string(),
        generation_epoch,
        version: 0,
        lines: BTreeMap::new(),
        total_quantity: 0,
        subtotal_cents: 0,
        currency: None,
        promo_code: None,
        promo_codes: Vec::new(),
        created_at: now_iso.clone(),
        updated_at: now_iso.clone(),
    });
    cart.version = cart
        .version
        .checked_add(1)
        .ok_or_else(|| validation::invalid("cart version overflow"))?;
    if cart.version > validation::MAX_CART_VERSION {
        return Err(validation::invalid(
            "cart operation retention limit reached",
        ));
    }
    cart.generation_epoch = generation_epoch;
    cart.updated_at = now_iso;
    mutate(&mut cart, mutation)?;
    recompute(&mut cart)?;
    Ok(cart)
}

fn mutate(cart: &mut CartRecord, mutation: &CartMutation) -> AppResult<()> {
    match mutation {
        CartMutation::Add { item } => add(&mut cart.lines, item),
        CartMutation::SetItem { item } => set_item(&mut cart.lines, item),
        CartMutation::Remove {
            product_id,
            variant_id,
        } => {
            cart.lines
                .remove(&identity::line_key(product_id, variant_id.as_deref()));
            Ok(())
        }
        CartMutation::Replace { snapshot } => replacement::apply(cart, snapshot),
        CartMutation::Clear {} => {
            cart.lines.clear();
            cart.promo_code = None;
            cart.promo_codes.clear();
            Ok(())
        }
    }
}

fn add(lines: &mut BTreeMap<String, CartLine>, item: &CartItemInput) -> AppResult<()> {
    let key = identity::line_key(&item.product_id, item.variant_id.as_deref());
    if let Some(line) = lines.get_mut(&key) {
        line.quantity = line
            .quantity
            .checked_add(item.quantity)
            .ok_or_else(|| validation::invalid("cart quantity overflow"))?;
        validation::quantity_value(line.quantity)?;
        refresh_line(line, item);
        return Ok(());
    }
    if lines.len() >= validation::MAX_LINES {
        return Err(validation::invalid("cart line limit exceeded"));
    }
    lines.insert(
        key.clone(),
        CartLine {
            line_key: key,
            position: next_position(lines)?,
            product_id: item.product_id.clone(),
            variant_id: item.variant_id.clone(),
            quantity: item.quantity,
            unit_amount_cents: item.unit_amount_cents,
            line_total_cents: 0,
            currency: item.currency.clone(),
            title_snapshot: item.title_snapshot.clone(),
            image_snapshot: item.image_snapshot.clone(),
            payment_resource: item.payment_resource.clone(),
            metadata: item.metadata.clone(),
            hold_id: item.hold_id.clone(),
            hold_expires_at: item.hold_expires_at.clone(),
        },
    );
    Ok(())
}

fn next_position(lines: &BTreeMap<String, CartLine>) -> AppResult<u16> {
    lines
        .values()
        .map(|line| line.position)
        .max()
        .map_or(Ok(0), |position| {
            position
                .checked_add(1)
                .ok_or_else(|| validation::invalid("cart line position overflow"))
        })
}

fn set_item(lines: &mut BTreeMap<String, CartLine>, item: &CartItemInput) -> AppResult<()> {
    let key = identity::line_key(&item.product_id, item.variant_id.as_deref());
    let line = lines
        .get_mut(&key)
        .ok_or_else(|| validation::invalid("cart line does not exist"))?;
    line.quantity = item.quantity;
    refresh_line(line, item);
    Ok(())
}

fn refresh_line(line: &mut CartLine, item: &CartItemInput) {
    line.unit_amount_cents = item.unit_amount_cents;
    line.currency.clone_from(&item.currency);
    line.title_snapshot.clone_from(&item.title_snapshot);
    line.image_snapshot.clone_from(&item.image_snapshot);
    line.payment_resource.clone_from(&item.payment_resource);
    line.metadata.clone_from(&item.metadata);
    line.hold_id.clone_from(&item.hold_id);
    line.hold_expires_at.clone_from(&item.hold_expires_at);
}

fn recompute(cart: &mut CartRecord) -> AppResult<()> {
    let mut quantity = 0u64;
    let mut subtotal = 0u64;
    let mut currency: Option<String> = None;
    for line in cart.lines.values_mut() {
        line.line_total_cents = line
            .unit_amount_cents
            .checked_mul(line.quantity)
            .ok_or_else(|| validation::invalid("cart line total overflow"))?;
        quantity = quantity
            .checked_add(line.quantity)
            .ok_or_else(|| validation::invalid("cart quantity overflow"))?;
        subtotal = subtotal
            .checked_add(line.line_total_cents)
            .ok_or_else(|| validation::invalid("cart subtotal overflow"))?;
        if currency
            .as_deref()
            .is_some_and(|value| value != line.currency)
        {
            return Err(validation::invalid(
                "all cart lines must use the same currency",
            ));
        }
        currency.get_or_insert_with(|| line.currency.clone());
    }
    cart.total_quantity = quantity;
    cart.subtotal_cents = subtotal;
    cart.currency = currency;
    if quantity > validation::MAX_TOTAL_QUANTITY || subtotal > validation::MAX_SUBTOTAL_CENTS {
        return Err(validation::invalid("cart aggregate limit exceeded"));
    }
    Ok(())
}
