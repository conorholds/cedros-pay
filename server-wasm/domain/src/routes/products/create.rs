//! `POST /products/v1/catalog` - Pay-backed catalog product create contract.
//!
//! Capability-gated for trusted host surfaces (for example booking flows that
//! mint one product per booking type). Accepts only bounded public catalog
//! fields, fails closed on duplicate id/slug, and returns the created product
//! in the `cedros-pay:product-read` storefront projection.

use serde::Deserialize;
use serde_json::{json, Map, Value};

use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;
use crate::time;

use super::catalog::projection::storefront_product;

const CLAIM_PRODUCT_CREATE: &str = "cedros-pay:product-create";
const MAX_TITLE: usize = 200;
const MAX_DESCRIPTION: usize = 5000;
const MAX_SHORT_DESCRIPTION: usize = 500;
const MAX_ID: usize = 120;
const MAX_LIST_ITEMS: usize = 20;
const MAX_IMAGE_URLS: usize = 10;
const MAX_URL: usize = 2048;
/// 1,000,000.00 in minor units — sanity bound, not a business rule.
const MAX_AMOUNT_CENTS: i64 = 100_000_000;
const PRODUCT_TYPES: &[&str] = &[
    "standard",
    "service",
    "ticket",
    "eventSession",
    "campSession",
    "pass",
    "addon",
];

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct CreateReq {
    id: Option<String>,
    slug: Option<String>,
    title: String,
    description: Option<String>,
    short_description: Option<String>,
    seo_title: Option<String>,
    seo_description: Option<String>,
    product_type: Option<String>,
    inventory_status: Option<String>,
    brand: Option<String>,
    sku: Option<String>,
    gtin: Option<String>,
    mpn: Option<String>,
    condition: Option<String>,
    price: PriceReq,
    #[serde(default)]
    tags: Vec<String>,
    #[serde(default)]
    category_ids: Vec<String>,
    #[serde(default)]
    categories: Vec<Value>,
    #[serde(default)]
    image_urls: Vec<String>,
    image_alt: Option<String>,
    image_width: Option<u32>,
    image_height: Option<u32>,
    #[serde(default)]
    featured: bool,
    #[serde(default = "default_true")]
    active: bool,
    #[serde(default = "default_true")]
    public: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PriceReq {
    amount_cents: i64,
    currency: Option<String>,
}

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let ctx = RequestContext::parse(&req.context_json);
    ctx.require_claim(CLAIM_PRODUCT_CREATE)?;
    ctx.require_admin_write()?;
    let site_id = ctx.require_site_id()?;

    let body: CreateReq = serde_json::from_value(req.json_body()?)
        .map_err(|e| AppError::bad_request("invalid request body").with_internal(e.to_string()))?;
    let record = validated_record(seams, &ctx, body)?;
    let id = record["id"].as_str().unwrap_or_default().to_string();

    super::catalog::seo_categories::create(seams, &id, &record)?;

    let product = storefront_product(&record, site_id)
        .ok_or_else(|| AppError::internal("created product failed storefront projection"))?;
    Ok(RouteResponse::ok(&json!({
        "contract": CLAIM_PRODUCT_CREATE,
        "contractVersion": 2,
        "created": true,
        "product": product,
    })))
}

pub(super) fn validated_record<S: HostSeams>(
    seams: &S,
    ctx: &RequestContext,
    body: CreateReq,
) -> AppResult<Value> {
    let id = body_id_or_generated(seams, ctx, body.id)?;
    let now = time::iso8601(seams.now_unix_secs());
    let mut record = Map::new();
    record.insert("id".into(), Value::String(id));
    let slug = normalize_slug(body.slug)?;
    if body.active && body.public && slug.is_none() {
        return Err(AppError::bad_request(
            "active public products require an explicit slug",
        ));
    }
    insert_opt(&mut record, "slug", slug);
    record.insert(
        "title".into(),
        Value::String(required_text(&body.title, "title", MAX_TITLE)?),
    );
    insert_opt(
        &mut record,
        "description",
        optional_text(body.description, "description", MAX_DESCRIPTION)?,
    );
    insert_opt(
        &mut record,
        "shortDescription",
        optional_text(
            body.short_description,
            "shortDescription",
            MAX_SHORT_DESCRIPTION,
        )?,
    );
    insert_opt(
        &mut record,
        "seoTitle",
        optional_text(body.seo_title, "seoTitle", MAX_TITLE)?,
    );
    insert_opt(
        &mut record,
        "seoDescription",
        optional_text(
            body.seo_description,
            "seoDescription",
            MAX_SHORT_DESCRIPTION,
        )?,
    );
    insert_opt(&mut record, "productType", product_type(body.product_type)?);
    insert_opt(
        &mut record,
        "inventoryStatus",
        enum_value(
            body.inventory_status,
            "inventoryStatus",
            &[
                "in_stock",
                "out_of_stock",
                "backorder",
                "preorder",
                "unknown",
            ],
        )?,
    );
    insert_opt(
        &mut record,
        "condition",
        enum_value(body.condition, "condition", &["new", "used", "refurbished"])?,
    );
    for (field, value) in [
        ("brand", body.brand),
        ("sku", body.sku),
        ("gtin", body.gtin),
        ("mpn", body.mpn),
    ] {
        insert_opt(&mut record, field, optional_text(value, field, MAX_TITLE)?);
    }
    record.insert(
        "fiatAmountCents".into(),
        Value::Number(amount_cents(body.price.amount_cents)?.into()),
    );
    record.insert(
        "fiatCurrency".into(),
        Value::String(currency(body.price.currency)?),
    );
    insert_list(&mut record, "tags", string_list(body.tags, "tags", 50)?);
    insert_list(
        &mut record,
        "categoryIds",
        string_list(body.category_ids, "categoryIds", 80)?,
    );
    insert_categories(&mut record, body.categories)?;
    let image_urls = image_urls(body.image_urls)?;
    insert_primary_image(
        &mut record,
        &image_urls,
        body.image_alt,
        body.image_width,
        body.image_height,
    )?;
    insert_list(&mut record, "imageUrls", image_urls);
    if body.featured {
        record.insert("featured".into(), Value::Bool(true));
    }
    record.insert("active".into(), Value::Bool(body.active));
    record.insert("public".into(), Value::Bool(body.public));
    record.insert("sortOrder".into(), Value::Number(0.into()));
    record.insert("source".into(), Value::String(CLAIM_PRODUCT_CREATE.into()));
    record.insert("createdAt".into(), Value::String(now.clone()));
    record.insert("updatedAt".into(), Value::String(now));
    Ok(Value::Object(record))
}

fn body_id_or_generated<S: HostSeams>(
    seams: &S,
    ctx: &RequestContext,
    id: Option<String>,
) -> AppResult<String> {
    if let Some(id) = id {
        return normalize_id(&id, "id");
    }
    let seed = ctx
        .idempotency_key
        .as_deref()
        .or(ctx.request_id.as_deref())
        .map(sanitize_id)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| seams.now_unix_secs().to_string());
    Ok(format!("product-{seed}"))
}

fn sanitize_id(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.'))
        .take(80)
        .collect()
}

fn normalize_id(value: &str, field: &str) -> AppResult<String> {
    let id = value.trim();
    if id.is_empty() || id.len() > MAX_ID {
        return Err(AppError::bad_request(format!(
            "{field} must be 1-{MAX_ID} characters"
        )));
    }
    if !id
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.'))
    {
        return Err(AppError::bad_request(format!(
            "{field} may only contain letters, numbers, dash, underscore, or dot"
        )));
    }
    Ok(id.to_string())
}

fn normalize_slug(slug: Option<String>) -> AppResult<Option<String>> {
    let Some(slug) = slug else { return Ok(None) };
    let slug = slug.trim().to_string();
    let valid = !slug.is_empty()
        && slug.len() <= MAX_ID
        && !slug.starts_with('-')
        && !slug.ends_with('-')
        && slug
            .chars()
            .all(|ch| ch.is_ascii_lowercase() || ch.is_ascii_digit() || ch == '-');
    if valid {
        Ok(Some(slug))
    } else {
        Err(AppError::bad_request(
            "slug must be 1-120 lowercase letters, numbers, or dashes",
        ))
    }
}

fn required_text(value: &str, field: &str, max: usize) -> AppResult<String> {
    let text = value.trim();
    if text.is_empty() || text.len() > max {
        return Err(AppError::bad_request(format!(
            "{field} must be 1-{max} characters"
        )));
    }
    Ok(text.to_string())
}

fn optional_text(value: Option<String>, field: &str, max: usize) -> AppResult<Option<String>> {
    match value {
        Some(value) if !value.trim().is_empty() => Ok(Some(required_text(&value, field, max)?)),
        _ => Ok(None),
    }
}

fn product_type(value: Option<String>) -> AppResult<Option<String>> {
    let Some(value) = value else { return Ok(None) };
    let value = value.trim().to_string();
    if PRODUCT_TYPES.contains(&value.as_str()) {
        Ok(Some(value))
    } else {
        Err(AppError::bad_request(format!(
            "productType must be one of {}",
            PRODUCT_TYPES.join(", ")
        )))
    }
}

fn enum_value(value: Option<String>, field: &str, allowed: &[&str]) -> AppResult<Option<String>> {
    let Some(value) = value else { return Ok(None) };
    let value = value.trim().to_ascii_lowercase();
    if allowed.contains(&value.as_str()) {
        Ok(Some(value))
    } else {
        Err(AppError::bad_request(format!(
            "{field} must be one of {}",
            allowed.join(", ")
        )))
    }
}

fn amount_cents(value: i64) -> AppResult<i64> {
    if (1..=MAX_AMOUNT_CENTS).contains(&value) {
        Ok(value)
    } else {
        Err(AppError::bad_request(format!(
            "price.amountCents must be between 1 and {MAX_AMOUNT_CENTS}"
        )))
    }
}

fn currency(value: Option<String>) -> AppResult<String> {
    let Some(value) = value else {
        return Ok("USD".to_string());
    };
    let currency = value.trim().to_uppercase();
    if currency.len() == 3 && currency.chars().all(|ch| ch.is_ascii_alphabetic()) {
        Ok(currency)
    } else {
        Err(AppError::bad_request(
            "price.currency must be a 3-letter ISO code",
        ))
    }
}

fn string_list(values: Vec<String>, field: &str, max_len: usize) -> AppResult<Vec<Value>> {
    if values.len() > MAX_LIST_ITEMS {
        return Err(AppError::bad_request(format!(
            "{field} may list at most {MAX_LIST_ITEMS} items"
        )));
    }
    values
        .into_iter()
        .map(|value| {
            let value = value.trim().to_string();
            if value.is_empty() || value.len() > max_len {
                Err(AppError::bad_request(format!(
                    "{field} items must be 1-{max_len} characters"
                )))
            } else {
                Ok(Value::String(value))
            }
        })
        .collect()
}

fn image_urls(values: Vec<String>) -> AppResult<Vec<Value>> {
    if values.len() > MAX_IMAGE_URLS {
        return Err(AppError::bad_request(format!(
            "imageUrls may list at most {MAX_IMAGE_URLS} items"
        )));
    }
    values
        .into_iter()
        .map(|value| {
            let value = value.trim().to_string();
            if value.starts_with("https://") && value.len() <= MAX_URL {
                Ok(Value::String(value))
            } else {
                Err(AppError::bad_request("imageUrls must be https URLs"))
            }
        })
        .collect()
}

fn insert_categories(record: &mut Map<String, Value>, values: Vec<Value>) -> AppResult<()> {
    if values.len() > MAX_LIST_ITEMS {
        return Err(AppError::bad_request(format!(
            "categories may list at most {MAX_LIST_ITEMS} items"
        )));
    }
    if !values.is_empty() {
        record.insert("categories".into(), Value::Array(values));
    }
    Ok(())
}

fn insert_primary_image(
    record: &mut Map<String, Value>,
    image_urls: &[Value],
    alt: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
) -> AppResult<()> {
    let Some(url) = image_urls.first().and_then(Value::as_str) else {
        if alt.is_some() || width.is_some() || height.is_some() {
            return Err(AppError::bad_request(
                "primary image metadata requires at least one imageUrls entry",
            ));
        }
        return Ok(());
    };
    if width.is_some() != height.is_some()
        || width.is_some_and(|value| value == 0 || value > 100_000)
        || height.is_some_and(|value| value == 0 || value > 100_000)
    {
        return Err(AppError::bad_request(
            "imageWidth and imageHeight must both be 1-100000 when supplied",
        ));
    }
    let mut image = Map::new();
    image.insert("url".into(), Value::String(url.into()));
    insert_opt(
        &mut image,
        "alt",
        optional_text(alt, "imageAlt", MAX_TITLE)?,
    );
    if let Some(width) = width {
        image.insert("width".into(), width.into());
    }
    if let Some(height) = height {
        image.insert("height".into(), height.into());
    }
    image.insert("role".into(), Value::String("primary".into()));
    record.insert("images".into(), Value::Array(vec![Value::Object(image)]));
    Ok(())
}

fn insert_opt(record: &mut Map<String, Value>, key: &str, value: Option<String>) {
    if let Some(value) = value {
        record.insert(key.to_string(), Value::String(value));
    }
}

fn insert_list(record: &mut Map<String, Value>, key: &str, values: Vec<Value>) {
    if !values.is_empty() {
        record.insert(key.to_string(), Value::Array(values));
    }
}

fn default_true() -> bool {
    true
}

#[cfg(test)]
#[path = "create_tests.rs"]
mod tests;
