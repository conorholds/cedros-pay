//! Private catalog authority for the host's domain-payment service.
use serde_json::Value;

use super::api_catalog::ResolvedCatalog;
use super::inventory_types::CatalogGuard;
use super::{api_request::QuoteItemIntent, AuthoritativeQuoteLine};
use crate::{
    db::Db,
    error::{AppError, AppResult},
    ids,
    seams::HostSeams,
};

pub(crate) struct DomainCatalogOffer {
    pub resource: String,
    pub product_id: String,
    pub price_id: String,
    pub amount_cents: u64,
    pub currency: String,
}

pub(super) fn resolve<S: HostSeams>(
    seams: &S,
    items: &[QuoteItemIntent],
    offer: &DomainCatalogOffer,
) -> AppResult<ResolvedCatalog> {
    if items.len() != 1
        || items[0].resource != offer.resource
        || items[0].variant_id.is_some()
        || items[0].qty != 1
    {
        return Err(invalid());
    }
    let record = Db::new(seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_CATALOG, &offer.product_id)?
        .ok_or_else(invalid)?;
    let product = &record.payload;
    if product["id"] != offer.product_id
        || !active(product)
        || product["public"] != false
        || product["purchasable"] != false
        || product["productType"] != "subscription"
    {
        return Err(invalid());
    }
    let mut prices = product["prices"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|price| price["id"] == offer.price_id);
    let price = prices.next().ok_or_else(invalid)?;
    if prices.next().is_some() || !active(price) || price["billingInterval"] != "year" {
        return Err(invalid());
    }
    let cadence = price["billingIntervalCount"]
        .as_u64()
        .filter(|n| *n > 0 && *n <= 10)
        .ok_or_else(invalid)?;
    let unit = price
        .get("unitAmountCents")
        .or_else(|| price.get("amountCents"))
        .and_then(Value::as_u64)
        .filter(|n| *n > 0)
        .ok_or_else(invalid)?;
    let _units = offer
        .amount_cents
        .checked_div(unit)
        .filter(|units| {
            *units > 0
                && units.checked_mul(cadence).is_some_and(|years| years <= 10)
                && units.checked_mul(unit) == Some(offer.amount_cents)
        })
        .ok_or_else(invalid)?;
    if offer.currency != "USD"
        || !price["currency"]
            .as_str()
            .is_some_and(|currency| currency.eq_ignore_ascii_case(&offer.currency))
    {
        return Err(invalid());
    }
    Ok(ResolvedCatalog {
        lines: vec![AuthoritativeQuoteLine {
            resource: offer.resource.clone(),
            variant_id: None,
            qty: 1,
            unit_amount_cents: offer.amount_cents,
            line_total_cents: offer.amount_cents,
            currency: offer.currency.clone(),
            title: "Domain registration".into(),
            image: None,
            payment_resource: offer.resource.clone(),
            shipping_profile_id: None,
        }],
        stock_intents: vec![],
        catalog_guards: vec![CatalogGuard {
            resource: offer.product_id.clone(),
            version: super::fence::required_version(&record.version)?,
        }],
    })
}

fn active(value: &Value) -> bool {
    value["active"]
        .as_bool()
        .unwrap_or(value["status"] == "active")
}

fn invalid() -> AppError {
    AppError::conflict("domain payment does not match the active private catalog offer")
}
