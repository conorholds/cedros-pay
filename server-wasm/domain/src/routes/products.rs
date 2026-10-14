//! `GET /products/v1/rag-records` — support-safe live product facts.
//!
//! Admin/capability-gated. Reads active catalog records through the declared
//! database seam and emits only operator-approved public fields for Data's
//! `products` RAG source. Stored product metadata and buyer/purchase data are
//! never forwarded.

use serde_json::{json, Map, Value};

use crate::ctx::RequestContext;
use crate::db::{Db, Dir, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::matches;
use crate::seams::HostSeams;

mod ai;
mod authority;
pub(crate) mod catalog;
mod create;
#[path = "products/ai_pricing.rs"]
pub(crate) mod physical_pricing;

pub(crate) use authority::{catalog_item_authority_facts, catalog_item_facts};

pub const ROUTES: &[RouteSpec] = &[
    RouteSpec {
        route_id: ai::DELETE,
        method: "POST",
        path: "/admin/assistant/products/delete",
    },
    RouteSpec {
        route_id: ai::CREATE,
        method: "POST",
        path: "/admin/assistant/products/create",
    },
    RouteSpec {
        route_id: ai::QUERY,
        method: "POST",
        path: "/admin/assistant/products/query",
    },
    RouteSpec {
        route_id: ai::UPDATE,
        method: "POST",
        path: "/admin/assistant/products/update",
    },
    RouteSpec {
        route_id: ids::ROUTE_PRODUCT_RAG_RECORDS,
        method: "GET",
        path: "/products/v1/rag-records",
    },
    RouteSpec {
        route_id: ids::ROUTE_PRODUCT_READ,
        method: "GET",
        path: catalog::PATH,
    },
    RouteSpec {
        route_id: ids::ROUTE_PRODUCT_CREATE,
        method: "POST",
        path: catalog::PATH,
    },
];

const CLAIM_PRODUCT_RAG: &str = "cedros-pay:product-rag-records";
const DEFAULT_LIMIT: i64 = 100;
const MAX_LIMIT: i64 = 100;

pub(crate) fn is_capacity_handle(handle: &str) -> bool {
    matches!(
        handle,
        "cedros-addon-sites"
            | "cedros-addon-managed-capacity"
            | "cedros-addon-campaign-email"
            | "cedros-addon-managed-credits-v2"
            | "cedros-addon-email-recipients-v2"
            | "cedros-addon-storage-v2"
    )
}

pub(crate) fn is_capacity_product(product: &Value) -> bool {
    product.get("productType").and_then(Value::as_str) == Some("capacityAddOn")
        || ["id", "stableHandle"]
            .iter()
            .filter_map(|field| product.get(*field).and_then(Value::as_str))
            .any(is_capacity_handle)
}

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if ai::is_route(&req.route_id) {
        return ai::handle(seams, req);
    }
    if matches(req, "GET", catalog::PATH) {
        return catalog::handle(seams, req);
    }
    if matches(req, "POST", catalog::PATH) {
        return create::handle(seams, req);
    }
    if !matches(req, "GET", "/products/v1/rag-records") {
        return Err(AppError::not_found("unknown products route"));
    }
    let ctx = RequestContext::parse(&req.context_json);
    ctx.require_claim(CLAIM_PRODUCT_RAG)?;
    let site_id = ctx.require_site_id()?;

    let limit = parse_i64(req.query_value("limit"), DEFAULT_LIMIT).clamp(0, MAX_LIMIT);
    let offset = parse_i64(req.query_value("offset"), 0).max(0);
    let query = Query::new()
        .filter(Filter::new("active", Op::Eq, true))
        .order("sortOrder", Dir::Asc)
        .limit(limit)
        .offset(offset);
    let policy = crate::native_storefront_policy::Policy::load(seams)?;
    let mut classifier = crate::native_storefront_policy::Classifier::new(seams);
    let mut records = Vec::new();
    for entry in Db::new(seams, ids::DB_ACCESS).read(ids::MODEL_CATALOG, &query)? {
        let physical = classifier.is_physical(&entry.payload, &entry.entry_key)?;
        if policy.is_physical() && !physical {
            continue;
        }
        if let Some(mut record) = product_to_rag_record(&entry.entry_key, &entry.payload, site_id) {
            record["commerceKind"] = json!(if physical { "physical" } else { "other" });
            records.push(record);
        }
    }

    Ok(RouteResponse::ok(&json!({
        "source": "products",
        "contract": CLAIM_PRODUCT_RAG,
        "contractVersion": 2,
        "records": records,
    })))
}

fn product_to_rag_record(entry_key: &str, product: &Value, site_id: &str) -> Option<Value> {
    if !is_public_product(product) {
        return None;
    }
    // The content-model entry key is the authoritative identity. Stored payload
    // IDs are treated as display data and cannot alias another product.
    let product_id = entry_key.to_string();
    let title = first_string(product, &["displayName", "title", "name"])?;
    let slug = string_field(product, "slug").filter(|value| valid_public_slug(value));
    let mut record = Map::new();
    record.insert(
        "sourceId".into(),
        Value::String(format!(
            "product-live:cedros-pay:{}:{}",
            entity_component(site_id),
            entity_component(&product_id)
        )),
    );
    record.insert("siteId".into(), Value::String(site_id.to_string()));
    record.insert("productId".into(), Value::String(product_id.clone()));
    record.insert("public".into(), Value::Bool(true));
    insert_opt(&mut record, "slug", slug.clone());
    record.insert("title".into(), Value::String(title));
    insert_opt(
        &mut record,
        "description",
        string_field(product, "description"),
    );
    insert_opt(
        &mut record,
        "shortDescription",
        string_field(product, "shortDescription"),
    );
    insert_opt(&mut record, "seoTitle", string_field(product, "seoTitle"));
    insert_opt(
        &mut record,
        "seoDescription",
        string_field(product, "seoDescription"),
    );
    insert_value_opt(&mut record, "price", price_record(product, false));
    insert_value_opt(&mut record, "compareAtPrice", compare_at_price(product));
    insert_value_opt(
        &mut record,
        "variants",
        non_empty_array(variant_records(product)),
    );
    insert_opt(
        &mut record,
        "publicInventoryStatus",
        string_field(product, "inventoryStatus"),
    );
    insert_opt(&mut record, "fulfillmentNotes", fulfillment_notes(product));
    insert_value_opt(
        &mut record,
        "tags",
        non_empty_array(strings_array(product, "tags")),
    );
    insert_value_opt(
        &mut record,
        "categories",
        non_empty_array(categories(product)),
    );
    insert_value_opt(
        &mut record,
        "imageUrls",
        non_empty_array(image_urls(product)),
    );
    record.insert(
        "purchaseAction".into(),
        json!({
            "capabilityId": "cedros-pay:checkout",
            "routeId": "cedros-pay:checkout-create",
            "urlOwner": "host"
        }),
    );
    record.insert(
        "policyRefs".into(),
        Value::Array(vec![Value::String("cedros-pay:refund-returns".to_string())]),
    );
    Some(Value::Object(record))
}

pub(crate) fn is_public_product(product: &Value) -> bool {
    if bool_field(product, "active") != Some(true) {
        return false;
    }
    if bool_field(product, "public") == Some(false) {
        return false;
    }
    let visibility = string_field(product, "visibility").unwrap_or_default();
    let status = string_field(product, "status").unwrap_or_default();
    !matches!(visibility.as_str(), "private" | "draft" | "internal")
        && !matches!(status.as_str(), "draft" | "private" | "archived")
}

/// A product's purchasable fiat price in whole cents, across every catalog price
/// shape: nested `price.amountCents` (x402/admin seeds), the flat `fiatAmountCents`
/// (`cedros-pay:product-create`), or `fiatPrice.amountCents` (storefront projection).
/// `None` when the product has no positive purchasable price. Every checkout rail
/// (x402, cart, Stripe) must read all three or it 422s products created off the
/// path it doesn't know.
pub(crate) fn catalog_price_cents(product: &Value) -> Option<i64> {
    let nested = |obj: &str| {
        product
            .get(obj)
            .and_then(|p| p.get("amountCents"))
            .and_then(Value::as_i64)
    };
    nested("price")
        .or_else(|| product.get("fiatAmountCents").and_then(Value::as_i64))
        .or_else(|| nested("fiatPrice"))
        .filter(|cents| *cents > 0)
}

/// The product's fiat currency across the same shapes (default `USD`).
pub(crate) fn catalog_currency(product: &Value) -> String {
    let nested = |obj: &str| {
        product
            .get(obj)
            .and_then(|p| p.get("currency"))
            .and_then(Value::as_str)
    };
    nested("price")
        .or_else(|| product.get("fiatCurrency").and_then(Value::as_str))
        .or_else(|| nested("fiatPrice"))
        .map(crate::money::normalize_currency)
        .unwrap_or_else(|| crate::money::DEFAULT_CURRENCY.to_string())
}

fn price_record(product: &Value, sale: bool) -> Option<Value> {
    let object_key = if sale {
        "compareAtFiatPrice"
    } else {
        "fiatPrice"
    };
    let amount_key = if sale {
        "compareAtAmountCents"
    } else {
        "fiatAmountCents"
    };
    let currency_key = if sale {
        "compareAtFiatCurrency"
    } else {
        "fiatCurrency"
    };
    let source = product.get(object_key);
    let amount = source
        .and_then(|value| int_field(value, "atomic"))
        .or_else(|| int_field(product, amount_key))
        .or_else(|| source.and_then(|value| int_field(value, "amountCents")))?;
    if amount <= 0 {
        return None;
    }
    let currency = source
        .and_then(|value| string_pointer(value, "/asset/code"))
        .or_else(|| source.and_then(|value| string_field(value, "currency")))
        .or_else(|| string_field(product, currency_key))
        .unwrap_or_else(|| "USD".to_string());
    let currency = currency.trim().to_ascii_uppercase();
    if currency.len() != 3 || !currency.bytes().all(|byte| byte.is_ascii_alphabetic()) {
        return None;
    }
    Some(json!({ "amountCents": amount, "currency": currency }))
}

pub(super) fn compare_at_price(product: &Value) -> Option<Value> {
    let current = price_record(product, false)?;
    let compare = price_record(product, true)?;
    let current_amount = current.get("amountCents").and_then(Value::as_i64)?;
    let compare_amount = compare.get("amountCents").and_then(Value::as_i64)?;
    let same_currency = current.get("currency") == compare.get("currency");
    (same_currency && compare_amount > current_amount).then_some(compare)
}

fn variant_records(product: &Value) -> Vec<Value> {
    product
        .get("variants")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(variant_record)
        .collect()
}

fn variant_record(variant: &Value) -> Option<Value> {
    let id = string_field(variant, "id")?;
    let display = first_string(variant, &["displayName", "title", "name"]);
    let mut record = Map::new();
    record.insert("id".into(), Value::String(id));
    insert_opt(&mut record, "displayName", display);
    insert_opt(&mut record, "sku", string_field(variant, "sku"));
    insert_value_opt(&mut record, "price", variant_price(variant));
    insert_opt(
        &mut record,
        "publicInventoryStatus",
        string_field(variant, "inventoryStatus"),
    );
    Some(Value::Object(record))
}

fn variant_price(variant: &Value) -> Option<Value> {
    let price = variant.get("price")?;
    let amount = price
        .get("amount")
        .and_then(Value::as_f64)
        .or_else(|| int_field(price, "amountCents").map(|value| value as f64 / 100.0))?;
    if !amount.is_finite() || amount <= 0.0 {
        return None;
    }
    let currency = string_field(price, "currency")
        .unwrap_or_else(|| "USD".to_string())
        .trim()
        .to_ascii_uppercase();
    if currency.len() != 3 || !currency.bytes().all(|byte| byte.is_ascii_alphabetic()) {
        return None;
    }
    Some(json!({ "amount": amount, "currency": currency }))
}

fn fulfillment_notes(product: &Value) -> Option<String> {
    string_field(product, "fulfillmentNotes").or_else(|| {
        product
            .get("fulfillment")
            .and_then(|value| string_field(value, "notes"))
    })
}

fn categories(product: &Value) -> Vec<Value> {
    let from_categories = strings_array(product, "categories");
    if from_categories.is_empty() {
        strings_array(product, "categoryIds")
    } else {
        from_categories
    }
}

fn image_urls(product: &Value) -> Vec<Value> {
    let direct = strings_array(product, "imageUrls")
        .into_iter()
        .filter(|value| value.as_str().is_some_and(safe_public_media_url))
        .take(20)
        .collect::<Vec<_>>();
    if !direct.is_empty() {
        return direct;
    }
    product
        .get("images")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|image| {
            image
                .as_str()
                .map(str::to_string)
                .or_else(|| string_field(image, "url"))
        })
        .filter(|url| safe_public_media_url(url))
        .take(20)
        .map(Value::String)
        .collect()
}

pub(super) fn safe_public_media_url(value: &str) -> bool {
    if value.len() > 2_048 || value.contains('\\') || value.chars().any(char::is_control) {
        return false;
    }
    if value.starts_with('/') {
        return !value.starts_with("//");
    }
    ["https://", "http://"].iter().any(|prefix| {
        value.strip_prefix(prefix).is_some_and(|rest| {
            let authority = rest.split(['/', '?', '#']).next().unwrap_or_default();
            !authority.is_empty() && !authority.starts_with('/') && !authority.contains('@')
        })
    })
}

pub(super) fn valid_public_slug(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 120
        && !value.starts_with('-')
        && !value.ends_with('-')
        && value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
}

pub(super) fn entity_component(value: &str) -> String {
    const HEX: &[u8; 16] = b"0123456789ABCDEF";
    let mut encoded = String::with_capacity(value.len());
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
            encoded.push(char::from(byte));
        } else {
            encoded.push('%');
            encoded.push(char::from(HEX[(byte >> 4) as usize]));
            encoded.push(char::from(HEX[(byte & 0x0f) as usize]));
        }
    }
    encoded
}

pub(super) fn first_string(product: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| string_field(product, key))
}

fn strings_array(product: &Value, key: &str) -> Vec<Value> {
    product
        .get(key)
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .take(100)
        .map(|value| Value::String(value.to_string()))
        .collect()
}

fn non_empty_array(values: Vec<Value>) -> Option<Value> {
    (!values.is_empty()).then_some(Value::Array(values))
}

fn parse_i64(value: Option<&str>, fallback: i64) -> i64 {
    value.and_then(|raw| raw.parse().ok()).unwrap_or(fallback)
}

fn bool_field(product: &Value, key: &str) -> Option<bool> {
    product.get(key).and_then(Value::as_bool)
}

fn int_field(product: &Value, key: &str) -> Option<i64> {
    product.get(key).and_then(|value| {
        value
            .as_i64()
            .or_else(|| value.as_u64().and_then(|n| i64::try_from(n).ok()))
    })
}

pub(super) fn string_field(product: &Value, key: &str) -> Option<String> {
    product
        .get(key)
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .map(str::to_string)
}

fn string_pointer(product: &Value, pointer: &str) -> Option<String> {
    product
        .pointer(pointer)
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .map(str::to_string)
}

fn insert_opt(record: &mut Map<String, Value>, key: &str, value: Option<String>) {
    if let Some(value) = value {
        record.insert(key.to_string(), Value::String(value));
    }
}

fn insert_value_opt(record: &mut Map<String, Value>, key: &str, value: Option<Value>) {
    if let Some(value) = value {
        record.insert(key.to_string(), value);
    }
}

#[cfg(test)]
#[path = "product_rag_tests.rs"]
mod tests;
