//! Public, allow-listed commerce projection consumed by Shop or another host renderer.

use serde_json::{json, Map, Value};

use super::super::{
    bool_field, compare_at_price, entity_component, first_string, image_urls, insert_opt,
    insert_value_opt, non_empty_array, price_record, safe_public_media_url, string_field,
    strings_array, valid_public_slug,
};

pub(crate) fn storefront_product(product: &Value, site_id: &str) -> Option<Value> {
    let id = string_field(product, "id")?;
    let title = first_string(product, &["displayName", "title", "name"]);
    let authored_slug = string_field(product, "slug");
    let slug = authored_slug
        .clone()
        .filter(|value| valid_public_slug(value));
    let warnings = quality_warnings(title.as_deref(), authored_slug.as_deref(), slug.as_deref());
    let eligible = warnings.is_empty();
    let mut record = Map::new();
    record.insert("id".into(), Value::String(id.clone()));
    record.insert(
        "publicEntityId".into(),
        Value::String(public_entity_id(site_id, "product", &id)),
    );
    record.insert(
        "canonicalRouteKey".into(),
        Value::String(canonical_route_key("product", &id)),
    );
    insert_opt(&mut record, "title", title);
    insert_opt(&mut record, "slug", slug.clone());
    insert_copy_fields(&mut record, product);
    insert_media(&mut record, product);
    insert_value_opt(&mut record, "price", price_record(product, false));
    insert_value_opt(&mut record, "compareAtPrice", compare_at_price(product));
    insert_value_opt(&mut record, "availability", availability_record(product));
    insert_value_opt(&mut record, "fulfillment", fulfillment_record(product));
    insert_value_opt(
        &mut record,
        "variants",
        non_empty_array(variants(product, site_id, &id)),
    );
    insert_value_opt(
        &mut record,
        "previousSlugs",
        non_empty_array(
            strings_array(product, "previousSlugs")
                .into_iter()
                .filter(|slug| slug.as_str().is_some_and(valid_public_slug))
                .collect(),
        ),
    );
    record.insert("lifecycle".into(), lifecycle(product, eligible, warnings));
    record.insert("purchaseAction".into(), purchase_action());
    Some(Value::Object(record))
}

fn insert_copy_fields(record: &mut Map<String, Value>, product: &Value) {
    for field in [
        "description",
        "shortDescription",
        "seoTitle",
        "seoDescription",
        "productType",
        "inventoryStatus",
        "sku",
        "gtin",
        "mpn",
        "brand",
        "condition",
    ] {
        insert_opt(record, field, string_field(product, field));
    }
    insert_value_opt(
        record,
        "tags",
        non_empty_array(strings_array(product, "tags")),
    );
    insert_value_opt(
        record,
        "categoryIds",
        non_empty_array(
            super::categories::ids(product)
                .into_iter()
                .map(Value::String)
                .collect(),
        ),
    );
    if bool_field(product, "featured").unwrap_or(false) {
        record.insert("featured".into(), Value::Bool(true));
    }
    record.insert(
        "schemaEntityKind".into(),
        Value::String(schema_entity_kind(product).into()),
    );
}

fn quality_warnings(
    title: Option<&str>,
    authored_slug: Option<&str>,
    slug: Option<&str>,
) -> Vec<Value> {
    let mut warnings = Vec::new();
    if title.is_none() {
        warnings.push(Value::String("missingTitle".into()));
    }
    if authored_slug.is_some() && slug.is_none() {
        warnings.push(Value::String("invalidSlug".into()));
    } else if slug.is_none() {
        warnings.push(Value::String("missingSlug".into()));
    }
    warnings
}

fn lifecycle(product: &Value, eligible: bool, warnings: Vec<Value>) -> Value {
    let mut value = Map::new();
    value.insert("state".into(), Value::String("active".into()));
    value.insert("indexEligible".into(), Value::Bool(eligible));
    value.insert("sitemapEligible".into(), Value::Bool(eligible));
    insert_opt(
        &mut value,
        "publishedAt",
        string_field(product, "createdAt"),
    );
    insert_opt(
        &mut value,
        "lastModified",
        string_field(product, "updatedAt"),
    );
    insert_value_opt(&mut value, "qualityWarnings", non_empty_array(warnings));
    Value::Object(value)
}

fn purchase_action() -> Value {
    json!({
        "capabilityId": "cedros-pay:checkout",
        "routeId": "cedros-pay:checkout-create",
        "urlOwner": "host"
    })
}

fn schema_entity_kind(product: &Value) -> &'static str {
    match string_field(product, "productType").as_deref() {
        Some("service") => "service",
        Some("eventSession" | "campSession" | "ticket") => "event-offer",
        Some("pass" | "addon" | "standard") | None => "product",
        Some(_) => "unspecified",
    }
}

pub(super) fn public_entity_id(site_id: &str, kind: &str, id: &str) -> String {
    format!(
        "cedros-pay:site:{}:{kind}:{}",
        entity_component(site_id),
        entity_component(id)
    )
}

pub(super) fn canonical_route_key(kind: &str, id: &str) -> String {
    format!("{kind}:{}", entity_component(id))
}

fn insert_media(record: &mut Map<String, Value>, product: &Value) {
    let urls = image_urls(product)
        .into_iter()
        .filter(|url| url.as_str().is_some_and(safe_public_media_url))
        .collect::<Vec<_>>();
    insert_value_opt(record, "imageUrls", non_empty_array(urls.clone()));
    let media = rich_media(product, urls);
    insert_value_opt(record, "media", non_empty_array(media));
}

fn rich_media(product: &Value, fallback_urls: Vec<Value>) -> Vec<Value> {
    let authored = product
        .get("images")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(media_record)
        .take(20)
        .collect::<Vec<_>>();
    if !authored.is_empty() {
        return authored;
    }
    fallback_urls
        .into_iter()
        .filter_map(|url| url.as_str().map(|url| json!({"url": url})))
        .collect()
}

fn media_record(image: &Value) -> Option<Value> {
    let url = image
        .as_str()
        .map(str::to_string)
        .or_else(|| string_field(image, "url"))?;
    if !safe_public_media_url(&url) {
        return None;
    }
    let mut record = Map::new();
    record.insert("url".into(), Value::String(url));
    for field in ["alt", "role", "mimeType"] {
        insert_opt(&mut record, field, string_field(image, field));
    }
    for field in ["width", "height"] {
        if let Some(value) = image.get(field).and_then(Value::as_u64) {
            record.insert(field.into(), value.into());
        }
    }
    Some(Value::Object(record))
}

fn fulfillment_record(product: &Value) -> Option<Value> {
    let fulfillment = product.get("fulfillment")?;
    let mut record = Map::new();
    for field in ["type", "notes", "shippingProfileId", "returnPolicyId"] {
        insert_opt(&mut record, field, string_field(fulfillment, field));
    }
    (!record.is_empty()).then_some(Value::Object(record))
}

fn variants(product: &Value, site_id: &str, product_id: &str) -> Vec<Value> {
    product
        .get("variants")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .take(100)
        .filter_map(|variant| variant_record(variant, site_id, product_id))
        .collect()
}

fn variant_record(variant: &Value, site_id: &str, product_id: &str) -> Option<Value> {
    let id = string_field(variant, "id")?;
    let title = first_string(variant, &["displayName", "title", "name"]);
    let mut record = Map::new();
    record.insert("id".into(), Value::String(id.clone()));
    record.insert(
        "publicEntityId".into(),
        Value::String(format!(
            "{}:variant:{}",
            public_entity_id(site_id, "product", product_id),
            entity_component(&id)
        )),
    );
    insert_opt(&mut record, "title", title);
    for field in ["sku", "inventoryStatus", "condition", "gtin", "mpn"] {
        insert_opt(&mut record, field, string_field(variant, field));
    }
    insert_value_opt(&mut record, "price", variant_price(variant));
    insert_value_opt(&mut record, "availability", availability_record(variant));
    insert_value_opt(
        &mut record,
        "imageUrls",
        non_empty_array(
            image_urls(variant)
                .into_iter()
                .filter(|url| url.as_str().is_some_and(safe_public_media_url))
                .collect(),
        ),
    );
    Some(Value::Object(record))
}

fn availability_record(value: &Value) -> Option<Value> {
    let status = string_field(value, "inventoryStatus")?;
    let quantity = value.get("inventoryQuantity").and_then(Value::as_u64);
    let revision = string_field(value, "inventoryRevision");
    let last_modified = value
        .get("inventoryLastModifiedUnix")
        .and_then(Value::as_i64);
    let mut record = Map::new();
    record.insert("status".into(), Value::String(status));
    if let Some(quantity) = quantity {
        record.insert("availableQuantity".into(), quantity.into());
    }
    insert_opt(&mut record, "revision", revision);
    if let Some(last_modified) = last_modified {
        record.insert("lastModifiedUnix".into(), last_modified.into());
    }
    Some(Value::Object(record))
}

fn variant_price(variant: &Value) -> Option<Value> {
    let price = variant.get("price")?;
    let currency = string_field(price, "currency")?;
    let amount = price.get("amountCents").and_then(Value::as_i64)?;
    let currency = currency.trim().to_ascii_uppercase();
    (amount > 0 && currency.len() == 3 && currency.bytes().all(|byte| byte.is_ascii_alphabetic()))
        .then(|| json!({"amountCents": amount, "currency": currency}))
}

#[cfg(test)]
#[path = "catalog_projection_tests.rs"]
mod tests;
