use serde::Deserialize;

use super::api_request::FulfillmentIntent;
use crate::db::{Db, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TaxRate {
    id: String,
    country: String,
    region: Option<String>,
    rate_bps: i32,
    active: bool,
}

#[derive(Debug)]
pub(super) struct TaxCharge {
    pub amount_cents: u64,
    pub rate_id: Option<String>,
}

pub(super) fn resolve<S: HostSeams>(
    seams: &S,
    discounted_subtotal: u64,
    shipping_cents: u64,
    fulfillment: &FulfillmentIntent,
) -> AppResult<TaxCharge> {
    let FulfillmentIntent::Shipping { address, .. } = fulfillment else {
        return Ok(TaxCharge {
            amount_cents: 0,
            rate_id: None,
        });
    };
    let query = Query::new()
        .filter(Filter::new("kind", Op::Eq, "taxRate"))
        .filter(Filter::new("active", Op::Eq, true))
        .filter(Filter::new(
            "country",
            Op::Eq,
            address.country.to_uppercase(),
        ))
        .limit(1000);
    let rates = Db::new(seams, crate::ids::DB_ACCESS)
        .read(crate::ids::MODEL_CATALOG, &query)?
        .into_iter()
        .map(|entry| entry.parse::<TaxRate>())
        .collect::<AppResult<Vec<_>>>()?;
    let exact = address.region.as_deref().map(|region| {
        rates
            .iter()
            .filter(|rate| {
                rate.active
                    && rate.country.eq_ignore_ascii_case(&address.country)
                    && rate
                        .region
                        .as_deref()
                        .is_some_and(|value| value.eq_ignore_ascii_case(region))
            })
            .collect::<Vec<_>>()
    });
    let chosen = match exact.filter(|rates| !rates.is_empty()) {
        Some(rates) => one(rates)?,
        None => one(rates
            .iter()
            .filter(|rate| rate.active && rate.region.is_none())
            .collect())?,
    };
    let Some(rate) = chosen else {
        return Ok(TaxCharge {
            amount_cents: 0,
            rate_id: None,
        });
    };
    let base = discounted_subtotal
        .checked_add(shipping_cents)
        .ok_or_else(|| AppError::unprocessable("taxable base overflowed"))?;
    let bps = u32::try_from(rate.rate_bps)
        .ok()
        .filter(|bps| *bps <= 10_000)
        .ok_or_else(|| AppError::internal("stored tax rate is invalid"))?;
    Ok(TaxCharge {
        amount_cents: half_up_bps(base, bps)?,
        rate_id: Some(rate.id.clone()),
    })
}

fn one(rates: Vec<&TaxRate>) -> AppResult<Option<&TaxRate>> {
    match rates.as_slice() {
        [] => Ok(None),
        [rate] => Ok(Some(*rate)),
        _ => Err(AppError::new(
            409,
            "tax_rate_ambiguous",
            "multiple active tax rates match the destination specificity",
        )),
    }
}

pub(super) fn half_up_bps(base: u64, bps: u32) -> AppResult<u64> {
    let amount = u128::from(base)
        .checked_mul(u128::from(bps))
        .and_then(|value| value.checked_add(5_000))
        .map(|value| value / 10_000)
        .and_then(|value| u64::try_from(value).ok())
        .ok_or_else(|| AppError::unprocessable("percentage calculation overflowed"))?;
    Ok(amount)
}
