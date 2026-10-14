//! Entered site add-on promotion codes are checked with Stripe before review.
//! The accepted quote freezes pricing and the promotion identity.
use super::{access::Access, billing, catalog, config, wire};
use crate::{
    error::{AppError, AppResult},
    seams::HostSeams,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Discount {
    pub coupon_id: String,
    pub promotion_code_id: String,
    pub percent_off_basis_points: Option<u64>,
    pub amount_off_minor: Option<u64>,
}

impl Discount {
    pub fn subtotal(&self, amount: u64) -> AppResult<u64> {
        match (self.percent_off_basis_points, self.amount_off_minor) {
            (Some(bps), None) if (1..=10_000).contains(&bps) => {
                let off = u64::try_from((u128::from(amount) * u128::from(bps) + 5_000) / 10_000)
                    .map_err(|_| wire::unavailable())?;
                amount.checked_sub(off).ok_or_else(wire::unavailable)
            }
            (None, Some(off)) if off > 0 && off <= wire::MAX => Ok(amount.saturating_sub(off)),
            _ => Err(wire::unavailable()),
        }
    }
}

pub(super) fn selected<S: HostSeams>(
    s: &S,
    a: &Access,
    command: &Value,
    offer: &Value,
    material: &Value,
    gross: u64,
) -> AppResult<Option<Discount>> {
    let Some(code) = command.get("couponCode") else {
        return Ok(None);
    };
    let code = code.as_str().ok_or_else(wire::invalid)?.trim();
    if offer["terms"]["meterId"] != "sites.count"
        || code.is_empty()
        || code.len() > 64
        || !code
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"_-".contains(&b))
    {
        return Err(invalid_coupon());
    }
    let response = billing::get(
        s,
        &format!("/v1/promotion_codes?code={code}&active=true&limit=2&expand%5B%5D=data.coupon.applies_to"),
    )?;
    let codes = response["data"].as_array().ok_or_else(wire::unavailable)?;
    if codes.len() != 1 || response["has_more"] != false {
        return Err(invalid_coupon());
    }
    let promotion = &codes[0];
    let promotion_id = wire::text(promotion, "id")?;
    let org = a.config.organization(&command["target"])?;
    if !config::provider_id(promotion_id, "promo_")
        || promotion["active"] != true
        || promotion["livemode"] != (a.config.environment == "live")
        || !promotion["code"]
            .as_str()
            .is_some_and(|v| v.eq_ignore_ascii_case(code))
        || (!promotion["customer"].is_null() && promotion["customer"] != org.stripe_customer_id)
        || (!promotion["expires_at"].is_null()
            && promotion["expires_at"]
                .as_i64()
                .is_none_or(|v| v <= s.now_unix_secs()))
        || promotion["restrictions"]["first_time_transaction"] != false
    {
        return Err(invalid_coupon());
    }
    if let Some(minimum) = promotion["restrictions"]
        .get("minimum_amount")
        .filter(|v| !v.is_null())
    {
        if minimum.as_u64().is_none_or(|v| gross < v)
            || promotion["restrictions"]["minimum_amount_currency"]
                .as_str()
                .map(str::to_ascii_uppercase)
                != offer["terms"]["currency"].as_str().map(str::to_string)
        {
            return Err(invalid_coupon());
        }
    }
    let coupon = &promotion["coupon"];
    let coupon_id = wire::text(coupon, "id")?;
    // Recurring site capacity currently supports lifetime coupons. Reject other
    // terms before review instead of promising a recurring price we cannot verify.
    if !valid_coupon_id(coupon_id)
        || coupon["valid"] != true
        || coupon["livemode"] != (a.config.environment == "live")
        || coupon["duration"] != "forever"
        || (!coupon["redeem_by"].is_null()
            && coupon["redeem_by"]
                .as_i64()
                .is_none_or(|v| v <= s.now_unix_secs()))
    {
        return Err(invalid_coupon());
    }
    // An explicitly expanded null means unrestricted. An omitted scope is not
    // evidence that a product-restricted coupon applies to this offer.
    if coupon.get("applies_to").is_none() {
        return Err(wire::unavailable());
    }
    if !coupon["applies_to"].is_null()
        && !coupon["applies_to"]["products"]
            .as_array()
            .is_some_and(|products| products.contains(&material["stripeProductId"]))
    {
        return Err(invalid_coupon());
    }
    let percent = coupon["percent_off"].as_number().map(ToString::to_string);
    let percent_off_basis_points = percent.as_deref().map(basis_points).transpose()?;
    let amount_off_minor = if coupon["amount_off"].is_null() {
        None
    } else {
        if coupon["currency"].as_str().map(str::to_ascii_uppercase)
            != offer["terms"]["currency"].as_str().map(str::to_string)
        {
            return Err(invalid_coupon());
        }
        Some(wire::number(coupon, "amount_off")?)
    };
    let discount = Discount {
        coupon_id: coupon_id.into(),
        promotion_code_id: promotion_id.into(),
        percent_off_basis_points,
        amount_off_minor,
    };
    discount.subtotal(0)?;
    Ok(Some(discount))
}

pub(super) const INVALID_COUPON_MESSAGE: &str = "Coupon code is invalid or unavailable for this site add-on. Site add-ons require a lifetime recurring coupon.";
fn invalid_coupon() -> AppError {
    AppError::new(422, "invalid_request", INVALID_COUPON_MESSAGE)
}

fn basis_points(percent: &str) -> AppResult<u64> {
    let mut parts = percent.split('.');
    let whole = parts
        .next()
        .and_then(|v| v.parse::<u64>().ok())
        .ok_or_else(wire::unavailable)?;
    let fraction = parts.next().unwrap_or("");
    if parts.next().is_some() || fraction.len() > 2 || !fraction.bytes().all(|b| b.is_ascii_digit())
    {
        return Err(wire::unavailable());
    }
    let fraction = format!("{fraction:0<2}")
        .parse::<u64>()
        .map_err(|_| wire::unavailable())?;
    whole
        .checked_mul(100)
        .and_then(|n| n.checked_add(fraction))
        .filter(|n| (1..=10_000).contains(n))
        .ok_or_else(wire::unavailable)
}

pub(super) fn valid_coupon_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 160
        && id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"_-".contains(&b))
}

pub(super) fn invoice_subtotal(material: &Value, invoice: &Value, gross: u64) -> AppResult<u64> {
    if invoice["subtotal"].as_u64() != Some(gross) {
        return Err(wire::conflict("version_conflict"));
    }
    let Some(value) = material.get("selectedDiscount") else {
        return Ok(gross);
    };
    let discount: Discount =
        serde_json::from_value(value.clone()).map_err(|_| wire::unavailable())?;
    let net = discount.subtotal(gross)?;
    let discounts = invoice["total_discount_amounts"]
        .as_array()
        .ok_or_else(wire::unavailable)?;
    let total = discounts.iter().try_fold(0, |sum, row| {
        catalog::add(sum, wire::number(row, "amount")?)
    })?;
    if total != gross - net {
        return Err(wire::conflict("version_conflict"));
    }
    Ok(net)
}
