use serde_json::{json, Map, Value};

use crate::db::{Db, EntryRecord, Query};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::RouteRequest;
use crate::seams::HostSeams;
use crate::time;

use super::support_json::string_field;

const MAX_SCAN_PAGES: usize = 5;
const PAGE_SIZE: i64 = 100;
const MAX_PREVIOUS_SLUGS: usize = 20;
const COUPON_PREFIX: &str = "coupon:";
const NON_PRODUCT_KINDS: &[&str] = &[
    "shippingProfile",
    "shippingRate",
    "taxRate",
    "programEntitlement",
];

pub(super) fn product_values<S: HostSeams>(seams: &S) -> AppResult<Vec<Value>> {
    let mut products: Vec<_> = product_entries(seams)?
        .into_iter()
        .map(|entry| (entry.entry_key, entry.payload))
        .collect();
    crate::checkout_contract::inventory_projection::overlay_many(seams, &mut products, false)?;
    Ok(products
        .into_iter()
        .map(|(key, payload)| admin_product(&key, payload))
        .collect())
}

fn product_entries<S: HostSeams>(seams: &S) -> AppResult<Vec<EntryRecord>> {
    Ok(Db::new(seams, ids::DB_ACCESS)
        .read_paged(ids::MODEL_CATALOG, &Query::new(), PAGE_SIZE, MAX_SCAN_PAGES)?
        .into_iter()
        .filter(is_product_entry)
        .collect())
}

pub(super) fn coupon_values<S: HostSeams>(seams: &S) -> AppResult<Vec<Value>> {
    Ok(Db::new(seams, ids::DB_ACCESS)
        .read_paged(ids::MODEL_CATALOG, &Query::new(), PAGE_SIZE, MAX_SCAN_PAGES)?
        .into_iter()
        .filter(is_coupon_entry)
        .map(|entry| entry.payload)
        .collect())
}

pub(super) fn read_product<S: HostSeams>(seams: &S, id: &str) -> AppResult<Option<Value>> {
    read_product_raw(seams, id)?
        .map(|payload| crate::checkout_contract::inventory_projection::overlay(seams, id, payload))
        .transpose()
}

/// Reads catalog material without the response-only checkout-stock overlay.
pub(super) fn read_product_raw<S: HostSeams>(seams: &S, id: &str) -> AppResult<Option<Value>> {
    Ok(read_product_entry(seams, id)?.map(|entry| entry.payload))
}

pub(super) fn read_product_entry<S: HostSeams>(
    seams: &S,
    id: &str,
) -> AppResult<Option<EntryRecord>> {
    Ok(Db::new(seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_CATALOG, id)?
        .filter(is_product_entry))
}

pub(super) fn admin_product(entry_key: &str, value: Value) -> Value {
    let mut obj = product_object(value);
    project_versioned_catalog_price(&mut obj);
    put_default(&mut obj, "id", Value::String(entry_key.to_string()));
    put_default(&mut obj, "description", Value::String(String::new()));
    put_default(&mut obj, "fiatAmountCents", Value::Number(0.into()));
    put_default(&mut obj, "fiatCurrency", Value::String("usd".to_string()));
    put_default(&mut obj, "cryptoAtomicAmount", Value::Number(0.into()));
    put_default(&mut obj, "cryptoToken", Value::String("USDC".to_string()));
    put_default(&mut obj, "active", Value::Bool(true));
    Value::Object(obj)
}

fn project_versioned_catalog_price(obj: &mut Map<String, Value>) {
    if obj.get("catalogSchemaVersion").and_then(Value::as_i64) != Some(2) {
        return;
    }
    let selected_price = obj
        .get("prices")
        .and_then(Value::as_array)
        .and_then(|prices| {
            prices
                .iter()
                .filter(|price| price.get("status").and_then(Value::as_str) == Some("active"))
                .find(|price| price.get("billingInterval").and_then(Value::as_str) == Some("month"))
                .or_else(|| {
                    prices
                        .iter()
                        .find(|price| price.get("status").and_then(Value::as_str) == Some("active"))
                })
        })
        .cloned();
    if let Some(price) = selected_price {
        if let Some(amount) = price.get("unitAmountCents") {
            obj.insert("fiatAmountCents".into(), amount.clone());
        }
        if let Some(currency) = price.get("currency") {
            obj.insert("fiatCurrency".into(), currency.clone());
        }
        if let Some(stripe_price_id) = price
            .get("stripePriceId")
            .and_then(Value::as_str)
            .filter(|value| value.starts_with("price_"))
        {
            obj.insert(
                "stripePriceId".into(),
                Value::String(stripe_price_id.to_string()),
            );
        }
    }
    let product_type = obj
        .get("productType")
        .and_then(Value::as_str)
        .map(|value| {
            if value == "subscription" {
                "subscription"
            } else {
                "one_time"
            }
        })
        .map(str::to_string);
    if let Some(product_type) = product_type {
        let metadata = obj
            .entry("metadata".to_string())
            .or_insert_with(|| Value::Object(Map::new()));
        if let Some(metadata) = metadata.as_object_mut() {
            metadata.insert("product_type".into(), Value::String(product_type));
        }
    }
}

pub(super) fn product_from_body(req: &RouteRequest, now: i64) -> AppResult<(String, Value)> {
    let mut obj = product_object(req.json_body()?);
    obj.remove("previousSlugs");
    let id = string_field(&Value::Object(obj.clone()), "id")
        .ok_or_else(|| AppError::bad_request("id is required"))?;
    normalize_id(&id)?;
    let now_iso = Value::String(time::iso8601(now));
    put_default(&mut obj, "active", Value::Bool(true));
    put_default(&mut obj, "public", Value::Bool(true));
    put_default(&mut obj, "createdAt", now_iso.clone());
    obj.insert("updatedAt".into(), now_iso);
    normalize_public_identity(&mut obj)?;
    let mut value = Value::Object(obj);
    crate::checkout_contract::inventory_admin::strip_catalog_inventory(&mut value);
    Ok((id, value))
}

pub(super) fn preserve_product_lifecycle(existing: &Value, replacement: &mut Value) {
    let Some(replacement) = replacement.as_object_mut() else {
        return;
    };
    // Redirect history is server-owned lifecycle state; request bodies cannot
    // inject, clear, or reorder it.
    replacement.remove("previousSlugs");
    if let Some(created_at) = existing.get("createdAt") {
        replacement.insert("createdAt".into(), created_at.clone());
    }
    let old_slug = string_field(existing, "slug");
    let new_slug = replacement
        .get("slug")
        .and_then(Value::as_str)
        .map(str::to_string);
    let mut history = existing
        .get("previousSlugs")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    if old_slug.is_some() && old_slug != new_slug {
        history.push(Value::String(old_slug.unwrap_or_default()));
    }
    history = bounded_slug_history(history, new_slug.as_deref());
    if !history.is_empty() {
        replacement.insert("previousSlugs".into(), Value::Array(history));
    }
}

fn bounded_slug_history(history: Vec<Value>, current_slug: Option<&str>) -> Vec<Value> {
    let mut seen = std::collections::BTreeSet::new();
    let mut values = history
        .into_iter()
        .rev()
        .filter_map(|value| value.as_str().map(str::to_string))
        .filter(|slug| {
            is_valid_public_slug(slug)
                && current_slug != Some(slug.as_str())
                && seen.insert(slug.clone())
        })
        .take(MAX_PREVIOUS_SLUGS)
        .map(Value::String)
        .collect::<Vec<_>>();
    values.reverse();
    values
}

pub(super) fn normalize_public_identity(obj: &mut Map<String, Value>) -> AppResult<()> {
    let public = obj.get("public").and_then(Value::as_bool) != Some(false);
    let active = obj.get("active").and_then(Value::as_bool) == Some(true);
    let title = ["displayName", "title", "name"]
        .iter()
        .find_map(|field| obj.get(*field).and_then(Value::as_str))
        .map(str::trim)
        .filter(|value| !value.is_empty());
    if public && active && title.is_none() {
        return Err(AppError::bad_request(
            "active public products require a nonblank title",
        ));
    }
    let existing_slug = obj
        .get("slug")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let slug = existing_slug
        .map(str::to_string)
        .or_else(|| title.map(slug_from_title).filter(|value| !value.is_empty()));
    if public && active && slug.is_none() {
        return Err(AppError::bad_request(
            "active public products require a URL-safe slug",
        ));
    }
    if let Some(slug) = slug {
        validate_public_slug(&slug)?;
        obj.insert("slug".into(), Value::String(slug));
    }
    Ok(())
}

fn slug_from_title(title: &str) -> String {
    title
        .trim()
        .to_ascii_lowercase()
        .split(|ch: char| !ch.is_ascii_alphanumeric())
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

fn validate_public_slug(slug: &str) -> AppResult<()> {
    is_valid_public_slug(slug).then_some(()).ok_or_else(|| {
        AppError::bad_request("slug must be 1-120 lowercase letters, numbers, or interior dashes")
    })
}

fn is_valid_public_slug(slug: &str) -> bool {
    !slug.is_empty()
        && slug.len() <= 120
        && !slug.starts_with('-')
        && !slug.ends_with('-')
        && slug
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
}

pub(super) fn coupon_from_body(req: &RouteRequest) -> AppResult<Value> {
    let mut obj = product_object(req.json_body()?);
    let code = string_field(&Value::Object(obj.clone()), "code")
        .ok_or_else(|| AppError::bad_request("code is required"))?;
    if code.trim().is_empty() || code.len() > 80 {
        return Err(AppError::bad_request("code must be 1-80 characters"));
    }
    obj.insert("recordType".into(), Value::String("coupon".to_string()));
    obj.insert("code".into(), Value::String(code.trim().to_uppercase()));
    put_default(&mut obj, "active", Value::Bool(true));
    put_default(&mut obj, "usageCount", Value::Number(0.into()));
    Ok(Value::Object(obj))
}

pub(super) fn merge_variants(product: &mut Map<String, Value>, body: &Value) -> i64 {
    let mut variants = product
        .get("variants")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();
    let before = variants.len();
    if let Some(delete_ids) = body.get("deleteVariantIds").and_then(Value::as_array) {
        variants.retain(|v| {
            !delete_ids
                .iter()
                .any(|id| id.as_str() == string_field(v, "id").as_deref())
        });
    }
    if let Some(updates) = body.get("updateVariants").and_then(Value::as_array) {
        for update in updates {
            let Some(id) = string_field(update, "id") else {
                continue;
            };
            if let Some(existing) = variants
                .iter_mut()
                .find(|v| string_field(v, "id").as_deref() == Some(id.as_str()))
            {
                merge_object(existing, update);
            }
        }
    }
    if let Some(create) = body.get("createVariants").and_then(Value::as_array) {
        variants.extend(create.iter().enumerate().map(|(idx, item)| {
            let mut obj = product_object(item.clone());
            put_default(
                &mut obj,
                "id",
                Value::String(format!("variant-{}", before + idx + 1)),
            );
            Value::Object(obj)
        }));
    }
    let created = variants.len().saturating_sub(before) as i64;
    product.insert("variants".into(), Value::Array(variants));
    let mut value = Value::Object(std::mem::take(product));
    crate::checkout_contract::inventory_admin::strip_catalog_inventory(&mut value);
    *product = product_object(value);
    created
}

pub(super) fn variation_response(
    product_id: &str,
    product: &Value,
    variants_created: i64,
) -> Value {
    json!({
        "productId": product_id,
        "variationConfig": product
            .get("variationConfig")
            .cloned()
            .unwrap_or_else(|| json!({ "variationTypes": [] })),
        "variants": product
            .get("variants")
            .cloned()
            .unwrap_or_else(|| Value::Array(Vec::new())),
        "variantsCreated": variants_created,
    })
}

pub(super) fn coupon_key(code: &str) -> String {
    format!("{COUPON_PREFIX}{}", code.trim().to_uppercase())
}

pub(super) fn default_subscription_settings() -> Value {
    json!({
        "enabled": false,
        "plans": [],
        "pageTitle": "Choose Your Plan",
        "pageSubtitle": "Select the plan that best fits your needs.",
        "annualSavingsBadge": "2 months free",
        "popularBadgeText": "Best Deal",
        "footerNotice": ""
    })
}

pub(super) fn product_object(value: Value) -> Map<String, Value> {
    value.as_object().cloned().unwrap_or_default()
}

fn is_product_entry(entry: &EntryRecord) -> bool {
    !is_coupon_entry(entry) && is_product_payload(entry)
}

fn is_product_payload(entry: &EntryRecord) -> bool {
    is_product_value(&entry.payload)
}

fn is_product_value(value: &Value) -> bool {
    if string_field(value, "recordType").as_deref() == Some("programEntitlement") {
        return false;
    }
    let kind_is_product = string_field(value, "kind")
        .map(|kind| !NON_PRODUCT_KINDS.contains(&kind.as_str()))
        .unwrap_or(true);
    kind_is_product && has_product_marker(value)
}

fn has_product_marker(value: &Value) -> bool {
    [
        "fiatAmountCents",
        "cryptoAtomicAmount",
        "productType",
        "displayName",
        "title",
        "name",
        "slug",
    ]
    .iter()
    .any(|key| value.get(*key).is_some())
}

fn is_coupon_entry(entry: &EntryRecord) -> bool {
    entry.entry_key.starts_with(COUPON_PREFIX)
        || string_field(&entry.payload, "recordType").as_deref() == Some("coupon")
}

pub(super) fn normalize_id(value: &str) -> AppResult<()> {
    let ok = !value.is_empty()
        && value.len() <= 120
        && value
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.'));
    ok.then_some(()).ok_or_else(|| {
        AppError::bad_request("id may only contain letters, numbers, dash, underscore, or dot")
    })
}

fn put_default(obj: &mut Map<String, Value>, key: &str, value: Value) {
    if !obj.contains_key(key) || obj.get(key).is_some_and(Value::is_null) {
        obj.insert(key.to_string(), value);
    }
}

fn merge_object(target: &mut Value, patch: &Value) {
    if let (Some(target), Some(patch)) = (target.as_object_mut(), patch.as_object()) {
        for (key, value) in patch {
            target.insert(key.clone(), value.clone());
        }
    }
}
