use serde::Deserialize;

use super::api_request::FulfillmentIntent;
use super::AuthoritativeQuoteLine;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

const MAX_SHIPPING_CENTS: u64 = 100_000_000;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Profile {
    id: String,
    countries: Vec<String>,
    active: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Rate {
    id: String,
    profile_id: String,
    rate_type: String,
    amount_cents: i64,
    currency: String,
    min_subtotal: Option<i64>,
    max_subtotal: Option<i64>,
    active: bool,
}

#[derive(Debug)]
pub(super) struct ShippingCharge {
    pub amount_cents: u64,
    pub rate_id: Option<String>,
}

pub(super) fn resolve<S: HostSeams>(
    seams: &S,
    lines: &[AuthoritativeQuoteLine],
    currency: &str,
    subtotal: u64,
    fulfillment: &FulfillmentIntent,
) -> AppResult<ShippingCharge> {
    let FulfillmentIntent::Shipping { address, shipping } = fulfillment else {
        return Ok(ShippingCharge {
            amount_cents: 0,
            rate_id: None,
        });
    };
    let profile_id = one_profile(lines)?;
    let db = Db::new(seams, crate::ids::DB_ACCESS);
    let profile: Profile = db
        .read_one(
            crate::ids::MODEL_CATALOG,
            &format!("shipping_profile:{profile_id}"),
        )?
        .ok_or_else(|| unavailable("shipping profile is not configured"))?
        .parse()?;
    if !profile.active
        || profile.id != profile_id
        || !profile
            .countries
            .iter()
            .any(|country| country.eq_ignore_ascii_case(&address.country))
    {
        return Err(unavailable(
            "shipping profile is inactive or does not serve the destination",
        ));
    }
    let rate: Rate = db
        .read_one(
            crate::ids::MODEL_CATALOG,
            &format!("shipping_rate:{}", shipping.option_id),
        )?
        .ok_or_else(|| AppError::not_found("shipping option was not found"))?
        .parse()?;
    validate_rate(&rate, &shipping.option_id, &profile_id, currency, subtotal)?;
    Ok(ShippingCharge {
        amount_cents: u64::try_from(rate.amount_cents)
            .map_err(|_| unavailable("shipping amount is invalid"))?,
        rate_id: Some(rate.id),
    })
}

fn one_profile(lines: &[AuthoritativeQuoteLine]) -> AppResult<String> {
    let mut profiles = lines
        .iter()
        .map(|line| line.shipping_profile_id.as_deref())
        .collect::<Vec<_>>();
    profiles.sort_unstable();
    profiles.dedup();
    match profiles.as_slice() {
        [Some(profile)] => Ok((*profile).to_string()),
        [_] => Err(unavailable("products do not declare a shipping profile")),
        _ => Err(AppError::new(
            409,
            "shipping_profile_ambiguous",
            "checkout items require different shipping profiles",
        )),
    }
}

fn validate_rate(
    rate: &Rate,
    option_id: &str,
    profile_id: &str,
    currency: &str,
    subtotal: u64,
) -> AppResult<()> {
    if rate.id != option_id || rate.profile_id != profile_id || !rate.active {
        return Err(unavailable("shipping option is inactive or mismatched"));
    }
    if rate.rate_type != "flat" {
        return Err(AppError::new(
            503,
            "shipping_basis_unavailable",
            "price and weight shipping require authoritative basis data",
        ));
    }
    let amount =
        u64::try_from(rate.amount_cents).map_err(|_| unavailable("shipping amount is invalid"))?;
    if amount > MAX_SHIPPING_CENTS || !rate.currency.eq_ignore_ascii_case(currency) {
        return Err(unavailable("shipping currency or amount is invalid"));
    }
    let subtotal = i64::try_from(subtotal)
        .map_err(|_| unavailable("shipping subtotal is outside the supported range"))?;
    if rate.min_subtotal.is_some_and(|min| subtotal < min)
        || rate.max_subtotal.is_some_and(|max| subtotal > max)
    {
        return Err(AppError::unprocessable(
            "shipping option does not apply to the authoritative subtotal",
        ));
    }
    Ok(())
}

fn unavailable(message: &str) -> AppError {
    AppError::new(503, "shipping_authority_unavailable", message)
}
