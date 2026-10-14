use super::{validation, ShopCartSnapshot};
use crate::error::AppResult;

const MAX_PROMO_CODES: usize = 8;
const MAX_PROMO_CODE_BYTES: usize = 64;

pub(super) fn validate(snapshot: &ShopCartSnapshot) -> AppResult<()> {
    if snapshot.items.len() > validation::MAX_LINES || snapshot.promo_codes.len() > MAX_PROMO_CODES
    {
        return Err(validation::invalid(
            "cart snapshot exceeds supported bounds",
        ));
    }
    if snapshot.items.is_empty() && snapshot.promo_code.is_some() {
        return Err(validation::invalid(
            "an empty cart cannot retain promotion codes",
        ));
    }
    for item in &snapshot.items {
        validation::item_input(item)?;
    }
    for code in &snapshot.promo_codes {
        promo_code(code)?;
    }
    if let Some(code) = snapshot.promo_code.as_deref() {
        promo_code(code)?;
        if snapshot.promo_codes.first().map(String::as_str) != Some(code) {
            return Err(validation::invalid(
                "promoCode must mirror the first promoCodes value",
            ));
        }
    } else if !snapshot.promo_codes.is_empty() {
        return Err(validation::invalid(
            "promoCode is required when promoCodes is nonempty",
        ));
    }
    Ok(())
}

fn promo_code(value: &str) -> AppResult<()> {
    let valid = !value.is_empty()
        && value.len() <= MAX_PROMO_CODE_BYTES
        && value.bytes().all(|byte| {
            byte.is_ascii_uppercase() || byte.is_ascii_digit() || matches!(byte, b'-' | b'_')
        });
    if valid {
        Ok(())
    } else {
        Err(validation::invalid("promo code is not canonical"))
    }
}
