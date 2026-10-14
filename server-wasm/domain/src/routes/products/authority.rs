use serde_json::Value;

use crate::error::{AppError, AppResult};

#[derive(Clone, Debug)]
pub(crate) struct CatalogItemFacts {
    pub unit_amount_cents: u64,
    pub currency: String,
    pub title: String,
    pub image: Option<String>,
    pub payment_resource: String,
    pub inventory_available: Option<u64>,
    pub shipping_profile_id: Option<String>,
}

pub(crate) fn catalog_item_facts(
    product: &Value,
    resource: &str,
    variant_id: Option<&str>,
) -> AppResult<CatalogItemFacts> {
    catalog_item_facts_inner(product, resource, variant_id, true)
}

/// Resolves catalog price/display facts without consulting legacy inventory
/// projections. Callers must separately bind to checkout-stock authority.
pub(crate) fn catalog_item_authority_facts(
    product: &Value,
    resource: &str,
    variant_id: Option<&str>,
) -> AppResult<CatalogItemFacts> {
    catalog_item_facts_inner(product, resource, variant_id, false)
}

fn catalog_item_facts_inner(
    product: &Value,
    resource: &str,
    variant_id: Option<&str>,
    include_inventory_projection: bool,
) -> AppResult<CatalogItemFacts> {
    if !super::is_public_product(product) {
        return Err(AppError::unprocessable("product is not purchasable"));
    }
    let variant = match variant_id {
        Some(id) => Some(find_variant(product, id)?),
        None => None,
    };
    let variant_amount = variant.and_then(variant_price_cents);
    let amount = variant_amount
        .or_else(|| super::catalog_price_cents(product))
        .and_then(|value| u64::try_from(value).ok())
        .ok_or_else(|| AppError::unprocessable("product has no purchasable price"))?;
    let currency = if variant_amount.is_some() {
        variant
            .and_then(variant_currency)
            .unwrap_or_else(|| super::catalog_currency(product))
    } else {
        super::catalog_currency(product)
    };
    let title = variant
        .and_then(|value| super::first_string(value, &["displayName", "title", "name"]))
        .or_else(|| super::first_string(product, &["displayName", "title", "name"]))
        .unwrap_or_else(|| resource.to_string());
    let image = variant
        .and_then(first_image)
        .or_else(|| first_image(product));
    let payment_resource = variant
        .and_then(|value| super::string_field(value, "paymentResource"))
        .or_else(|| super::string_field(product, "paymentResource"))
        .unwrap_or_else(|| resource.to_string());
    let inventory_available = match include_inventory_projection {
        true => match inventory(variant.unwrap_or(product))? {
            Some(available) => Some(available),
            None if variant.is_some() => inventory(product)?,
            None => None,
        },
        false => None,
    };
    let shipping_profile_id = variant
        .and_then(|value| super::string_field(value, "shippingProfileId"))
        .or_else(|| super::string_field(product, "shippingProfileId"));
    Ok(CatalogItemFacts {
        unit_amount_cents: amount,
        currency,
        title,
        image,
        payment_resource,
        inventory_available,
        shipping_profile_id,
    })
}

fn find_variant<'a>(product: &'a Value, id: &str) -> AppResult<&'a Value> {
    product
        .get("variants")
        .and_then(Value::as_array)
        .and_then(|variants| {
            variants
                .iter()
                .find(|variant| variant.get("id").and_then(Value::as_str) == Some(id))
        })
        .ok_or_else(|| AppError::unprocessable("product variant is not purchasable"))
}

fn variant_price_cents(variant: &Value) -> Option<i64> {
    variant
        .get("price")
        .and_then(|price| price.get("amountCents"))
        .and_then(Value::as_i64)
        .filter(|amount| *amount > 0)
}

fn variant_currency(variant: &Value) -> Option<String> {
    variant
        .get("price")
        .and_then(|price| price.get("currency"))
        .and_then(Value::as_str)
        .map(crate::money::normalize_currency)
}

fn first_image(value: &Value) -> Option<String> {
    super::image_urls(value)
        .into_iter()
        .find_map(|value| value.as_str().map(str::to_string))
}

fn inventory(value: &Value) -> AppResult<Option<u64>> {
    let status = value.get("inventoryStatus").and_then(Value::as_str);
    if matches!(status, Some("out_of_stock")) {
        return Err(AppError::new(
            409,
            "inventory_unavailable",
            "product inventory is unavailable",
        ));
    }
    value
        .get("inventoryQuantity")
        .map(|quantity| {
            quantity
                .as_u64()
                .ok_or_else(|| AppError::internal("catalog inventory is malformed"))
        })
        .transpose()
}
