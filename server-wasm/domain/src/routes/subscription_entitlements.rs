//! `GET /subscriptions/v1/{subscriptionId}/entitlements` — plan entitlement
//! read contract.
//!
//! Returns a narrow projection of Pay-owned subscription/product entitlement
//! metadata for trusted host services. It intentionally projects only the
//! explicit `entitlements` namespace and never forwards product metadata
//! wholesale.

use serde_json::{json, Map, Number, Value};

use crate::ctx::RequestContext;
use crate::db::{Db, Query};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::products::{is_capacity_handle, is_capacity_product};
use crate::seams::HostSeams;
use crate::time;

#[path = "subscription_entitlement_metadata.rs"]
mod metadata;

pub const PATH_TEMPLATE: &str = "/subscriptions/v1/{subscriptionId}/entitlements";
const PATH_PREFIX: &str = "/subscriptions/v1/";
const PATH_SUFFIX: &str = "/entitlements";
const CLAIM_SUBSCRIPTION_READ: &str = "cedros-pay:subscription-read";
const MAX_ID_LEN: usize = 256;
const PAGE_SIZE: i64 = 100;
const MAX_SCAN_PAGES: usize = 5;
const LIMIT_FIELDS: &[&str] = &[
    "dailyRequestLimit",
    "monthlyRequestLimit",
    "monthlySpendCents",
    "throttleRpm",
];

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ids::ROUTE_SUBSCRIPTION_ENTITLEMENTS,
    method: "GET",
    path: PATH_TEMPLATE,
}];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let subscription_id = subscription_id_from_path(&req.path)
        .ok_or_else(|| AppError::not_found("unknown subscription entitlements route"))?;
    if !req.method.eq_ignore_ascii_case("GET") {
        return Err(AppError::not_found(
            "unknown subscription entitlements route",
        ));
    }

    let ctx = RequestContext::parse(&req.context_json);
    ctx.require_claim(CLAIM_SUBSCRIPTION_READ)?;
    validate_id("subscriptionId", subscription_id)?;

    let db = Db::new(seams, ids::DB_ACCESS);
    let entry = db
        .read_one(ids::MODEL_SUBSCRIPTIONS, subscription_id)?
        .ok_or_else(|| AppError::not_found("subscription not found"))?;
    let subscription = entry.payload;
    require_subscription_grant(&subscription, seams.now_unix_secs())?;
    let (product, entitlements) = resolved_entitlements(&db, &subscription)?;
    let entitlements = entitlements
        .ok_or_else(|| AppError::not_found("subscription entitlements not configured"))?;
    let product_id = response_product_id(&subscription, product.as_ref())?;

    Ok(RouteResponse::ok(&json!({
        "subscriptionId": display_subscription_id(subscription_id, &subscription),
        "customerId": first_string(&subscription, &["customerId", "customerRef", "userId"]),
        "productId": product_id,
        "status": string_field(&subscription, "status").unwrap_or_else(|| "unknown".to_string()),
        "entitlements": entitlements,
        "updatedAt": first_string(&subscription, &["updatedAt", "updated_at"]).or(entry.updated_at),
    })))
}

pub(crate) fn projected_selection_for_subscription<S: HostSeams>(
    seams: &S,
    subscription: &Value,
) -> AppResult<(String, Option<Value>)> {
    let db = Db::new(seams, ids::DB_ACCESS);
    let (product, entitlements) = resolved_entitlements(&db, subscription)?;
    let product_id = response_product_id(subscription, product.as_ref())?;
    Ok((product_id, entitlements))
}

pub(crate) fn is_capacity_subscription<S: HostSeams>(
    seams: &S,
    subscription: &Value,
) -> AppResult<bool> {
    // Existing Stripe projections put the trusted catalog plan handle in priceId.
    // Recognize the reserved handles even if the catalog entry was removed.
    if is_capacity_product(subscription)
        || direct_product_ids(subscription)
            .iter()
            .any(|id| is_capacity_handle(id))
    {
        return Ok(true);
    }
    let db = Db::new(seams, ids::DB_ACCESS);
    Ok(find_product(&db, subscription)?
        .as_ref()
        .is_some_and(is_capacity_product))
}

fn resolved_entitlements<S: HostSeams>(
    db: &Db<'_, S>,
    subscription: &Value,
) -> AppResult<(Option<Value>, Option<Value>)> {
    let product = find_product(db, subscription)?;
    let mut entitlements = product
        .as_ref()
        .and_then(metadata::projected_namespace)
        .unwrap_or_default();
    entitlements.remove("managedProviderLimits");
    if let Some(limits) = managed_provider_limits(subscription)
        .or_else(|| product.as_ref().and_then(managed_provider_limits))
    {
        entitlements.insert("managedProviderLimits".to_string(), limits);
    }
    let entitlements = (!entitlements.is_empty()).then_some(Value::Object(entitlements));
    Ok((product, entitlements))
}

pub(crate) fn require_subscription_grant(subscription: &Value, now_secs: i64) -> AppResult<()> {
    let current = matches!(
        string_field(subscription, "status").as_deref(),
        Some("active" | "trialing")
    ) && string_field(subscription, "currentPeriodEnd")
        .and_then(|end| time::parse_iso(&end))
        .map(|end| end > now_secs)
        .unwrap_or(false);

    if current {
        Ok(())
    } else {
        Err(AppError::forbidden(
            "subscription is not currently entitled",
        ))
    }
}

fn find_product<S: HostSeams>(db: &Db<'_, S>, subscription: &Value) -> AppResult<Option<Value>> {
    for id in direct_product_ids(subscription) {
        if let Some(entry) = db.read_one(ids::MODEL_CATALOG, &id)? {
            return Ok(Some(entry.payload));
        }
    }
    let price_id = first_string(subscription, &["priceId", "stripePriceId"]);
    let Some(price_id) = price_id else {
        return Ok(None);
    };
    let products = db.read_paged(ids::MODEL_CATALOG, &Query::new(), PAGE_SIZE, MAX_SCAN_PAGES)?;
    Ok(products
        .into_iter()
        .map(|entry| entry.payload)
        .find(|product| product_matches_price(product, &price_id)))
}

fn direct_product_ids(subscription: &Value) -> Vec<String> {
    [
        "productId",
        "product_id",
        "resource",
        "resourceId",
        "planId",
        "priceId",
    ]
    .iter()
    .filter_map(|field| string_field(subscription, field))
    .collect()
}

fn product_matches_price(product: &Value, price_id: &str) -> bool {
    string_field(product, "stripePriceId").as_deref() == Some(price_id)
        || string_field(product, "priceId").as_deref() == Some(price_id)
        || product
            .get("subscription")
            .is_some_and(|sub| string_field(sub, "stripePriceId").as_deref() == Some(price_id))
        || ["stripePriceIdMonthly", "stripePriceIdAnnual"]
            .iter()
            .any(|field| string_field(product, field).as_deref() == Some(price_id))
        || product
            .get("prices")
            .and_then(Value::as_array)
            .is_some_and(|prices| {
                prices.iter().any(|price| {
                    ["id", "stableHandle", "stripePriceId"]
                        .iter()
                        .any(|field| string_field(price, field).as_deref() == Some(price_id))
                })
            })
}

fn response_product_id(subscription: &Value, product: Option<&Value>) -> AppResult<String> {
    product
        .and_then(|product| string_field(product, "id"))
        .or_else(|| {
            first_string(
                subscription,
                &[
                    "productId",
                    "product_id",
                    "resource",
                    "resourceId",
                    "planId",
                    "priceId",
                ],
            )
        })
        .ok_or_else(|| AppError::not_found("subscription product not resolved"))
}

fn managed_provider_limits(record: &Value) -> Option<Value> {
    [
        "/entitlements/managedProviderLimits",
        "/managedProviderLimits",
        "/metadata/managedProviderLimits",
    ]
    .iter()
    .find_map(|pointer| project_limits(record.pointer(pointer)?, true))
    .or_else(|| metadata_json_limits(record, "managedProviderLimits"))
    .or_else(|| metadata_json_limits(record, "entitlements.managedProviderLimits"))
    .or_else(|| {
        let namespace = metadata::projected_namespace(record)?;
        project_limits(namespace.get("managedProviderLimits")?, true)
    })
}

fn metadata_json_limits(record: &Value, key: &str) -> Option<Value> {
    let raw = record
        .get("metadata")
        .and_then(|metadata| metadata.get(key))
        .and_then(Value::as_str)?;
    serde_json::from_str::<Value>(raw)
        .ok()
        .and_then(|value| project_limits(&value, true))
}

fn project_limits(value: &Value, groups: bool) -> Option<Value> {
    let object = value.as_object()?;
    let mut projected = Map::new();
    for field in LIMIT_FIELDS {
        if let Some(limit) = non_negative_i64(object.get(*field)) {
            projected.insert((*field).to_string(), Value::Number(Number::from(limit)));
        }
    }
    if groups {
        insert_group(&mut projected, "routes", object.get("routes"));
        insert_group(&mut projected, "families", object.get("families"));
    }
    (!projected.is_empty()).then_some(Value::Object(projected))
}

fn insert_group(record: &mut Map<String, Value>, key: &str, value: Option<&Value>) {
    let Some(group) = value.and_then(Value::as_object) else {
        return;
    };
    let entries = group
        .iter()
        .filter(|(name, _)| valid_group_name(name))
        .filter_map(|(name, limits)| project_limits(limits, false).map(|limits| (name, limits)))
        .map(|(name, limits)| (name.clone(), limits))
        .collect::<Map<_, _>>();
    if !entries.is_empty() {
        record.insert(key.to_string(), Value::Object(entries));
    }
}

fn non_negative_i64(value: Option<&Value>) -> Option<i64> {
    let n = value.and_then(Value::as_i64)?;
    (n >= 0).then_some(n)
}

fn subscription_id_from_path(path: &str) -> Option<&str> {
    let start = path.find(PATH_PREFIX)? + PATH_PREFIX.len();
    let tail = &path[start..];
    let id = tail.strip_suffix(PATH_SUFFIX)?;
    if id.is_empty() || id.contains('/') {
        return None;
    }
    Some(id)
}

fn validate_id(label: &str, value: &str) -> AppResult<()> {
    if value.trim().is_empty() || value.len() > MAX_ID_LEN || value.chars().any(char::is_control) {
        Err(AppError::bad_request(format!(
            "{label} must be 1..={MAX_ID_LEN} non-control characters"
        )))
    } else {
        Ok(())
    }
}

fn valid_group_name(value: &str) -> bool {
    !value.trim().is_empty()
        && value.len() <= MAX_ID_LEN
        && value
            .chars()
            .all(|ch| ch.is_ascii_graphic() && !matches!(ch, '"' | '\'' | '<' | '>'))
}

fn display_subscription_id(fallback: &str, record: &Value) -> String {
    first_string(record, &["subscriptionId", "subscription_id"]).unwrap_or_else(|| fallback.into())
}

fn first_string(value: &Value, keys: &[&str]) -> Option<String> {
    keys.iter().find_map(|key| string_field(value, key))
}

fn string_field(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

#[cfg(test)]
#[path = "subscription_entitlements_tests.rs"]
mod tests;
