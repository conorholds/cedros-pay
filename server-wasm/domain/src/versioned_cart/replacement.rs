use std::collections::BTreeMap;

use super::storage::CartRecord;
use super::{identity, snapshot_validation, validation, CartLine, ShopCartSnapshot};
use crate::error::AppResult;

pub(super) fn apply(cart: &mut CartRecord, snapshot: &ShopCartSnapshot) -> AppResult<()> {
    snapshot_validation::validate(snapshot)?;
    let mut replacement = BTreeMap::new();
    for (position, item) in snapshot.items.iter().enumerate() {
        let key = identity::line_key(&item.product_id, item.variant_id.as_deref());
        if replacement.contains_key(&key) {
            return Err(validation::invalid(
                "replacement cart contains a duplicate line",
            ));
        }
        replacement.insert(
            key.clone(),
            CartLine {
                line_key: key,
                position: position as u16,
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
    }
    cart.lines = replacement;
    cart.promo_code = snapshot.promo_code.clone();
    cart.promo_codes = snapshot.promo_codes.clone();
    Ok(())
}
