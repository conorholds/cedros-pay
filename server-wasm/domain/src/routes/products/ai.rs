//! Allowlisted storefront catalog authoring. No payment, buyer or credential fields.
use super::physical_pricing::{require_fiat_price, require_product_price};
use super::{catalog, create, first_string};
use crate::{
    ctx::RequestContext,
    db::{Db, EntryRecord, Query},
    error::{AppError, AppResult},
    guarded_batch::GuardedCondition,
    ids,
    reqresp::{RouteRequest, RouteResponse},
    seams::HostSeams,
};
use serde::Deserialize;
use serde_json::{json, Value};

pub const DELETE: &str = "cedros-pay:ai-physical-product-delete";
pub const CREATE: &str = "cedros-pay:ai-physical-product-create";
pub const QUERY: &str = "cedros-pay:ai-storefront-products-query";
pub const UPDATE: &str = "cedros-pay:ai-storefront-product-update";
const FIELDS: &[&str] = &[
    "slug",
    "title",
    "description",
    "shortDescription",
    "seoTitle",
    "seoDescription",
    "productType",
    "inventoryStatus",
    "brand",
    "sku",
    "gtin",
    "mpn",
    "condition",
    "price",
    "tags",
    "categoryIds",
    "categories",
    "imageUrls",
    "imageAlt",
    "imageWidth",
    "imageHeight",
    "featured",
    "active",
    "public",
];
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct QueryInput {
    product_id: Option<String>,
    limit: Option<usize>,
    offset: Option<usize>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct DeleteInput {
    product_id: String,
    expected_version: String,
    confirmed: bool,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PhysicalCreateInput {
    physical_goods: bool,
    shipping_profile_id: String,
    product: Value,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct UpdateInput {
    product_id: String,
    expected_version: String,
    patch: Value,
}

pub(super) fn is_route(id: &str) -> bool {
    matches!(id, QUERY | UPDATE | CREATE | DELETE)
}
pub(super) fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let path = match req.route_id.as_str() {
        QUERY => "/admin/assistant/products/query",
        CREATE => "/admin/assistant/products/create",
        DELETE => "/admin/assistant/products/delete",
        UPDATE => "/admin/assistant/products/update",
        _ => return Err(AppError::not_found("unknown catalog capability")),
    };
    if !crate::routes::matches(req, "POST", path)
        || !req.query.is_empty()
        || req.body.len() > 64 * 1024
    {
        return Err(AppError::bad_request("invalid catalog capability request"));
    }
    let ctx = RequestContext::parse(&req.context_json);
    ctx.require_claim_or_capability("cedros-pay:admin", &req.route_id)?;
    let site = ctx.require_site_id()?;
    let db = Db::new(seams, ids::DB_ACCESS);

    if req.route_id == CREATE {
        ctx.require_admin_write_or_capability(CREATE)?;
        let input: PhysicalCreateInput = parse(req)?;
        if !input.physical_goods || input.product["productType"] != "standard" {
            return Err(AppError::unprocessable(
                "only explicitly declared physical standard goods are supported",
            ));
        }
        let profile_condition = shipping_profile(&db, &input.shipping_profile_id)?;
        require_fiat_price(&input.product["price"])?;
        let product: create::CreateReq = serde_json::from_value(input.product)
            .map_err(|_| AppError::bad_request("invalid physical product"))?;
        let mut record = create::validated_record(seams, &ctx, product)?;
        record["shippingProfileId"] = json!(input.shipping_profile_id);
        record["fulfillment"] =
            json!({"type":"physical","shippingProfileId":input.shipping_profile_id});
        require_product_price(&record)?;
        let id = record["id"]
            .as_str()
            .ok_or_else(|| AppError::internal("product identity missing"))?
            .to_string();
        catalog::seo_categories::create_guarded(seams, &id, &record, &[profile_condition])?;
        return bounded(json!({"created":true,"product":project(&load(&db,&id)?,site)?}));
    }
    if req.route_id == QUERY {
        let input: QueryInput = parse(req)?;
        let limit = input.limit.unwrap_or(25);
        let offset = input.offset.unwrap_or(0);
        if !(1..=100).contains(&limit) || offset > 10_000 {
            return Err(AppError::bad_request("catalog page is out of bounds"));
        }
        if let Some(id) = input.product_id {
            validate_id(&id)?;
            let entry = load(&db, &id)?;
            return bounded(json!({"products":[project(&entry,site)?],"total":1,"hasMore":false}));
        }
        let mut entries = db.read_paged(ids::MODEL_CATALOG, &Query::new(), 100, 101)?;
        if entries.len() > 10_000 {
            return Err(AppError::unprocessable(
                "catalog exceeds bounded administration scan",
            ));
        }
        entries.retain(is_product);
        entries.sort_by(|a, b| a.entry_key.cmp(&b.entry_key));
        let total = entries.len();
        let products = entries
            .iter()
            .skip(offset)
            .take(limit)
            .map(|entry| project(entry, site))
            .collect::<AppResult<Vec<_>>>()?;
        return bounded(
            json!({"products":products,"total":total,"hasMore":offset.saturating_add(limit)<total}),
        );
    }

    if req.route_id == DELETE {
        ctx.require_admin_write_or_capability(DELETE)?;
        let input: DeleteInput = parse(req)?;
        validate_id(&input.product_id)?;
        if !input.confirmed
            || input.expected_version.is_empty()
            || input.expected_version.len() > 200
        {
            return Err(AppError::bad_request(
                "confirmed deletion and exact catalog version required",
            ));
        }
        let entry = load(&db, &input.product_id)?;
        require_physical(&db, &entry.payload)?;
        crate::checkout_contract::inventory_admin::ensure_deletable(seams, &input.product_id)?;
        let deleted = catalog::seo_categories::delete_versioned(
            seams,
            &input.product_id,
            &input.expected_version,
        )?;
        return bounded(json!({"productId":input.product_id,"deleted":deleted}));
    }
    ctx.require_admin_write_or_capability(UPDATE)?;
    let input: UpdateInput = parse(req)?;
    validate_id(&input.product_id)?;
    if input.expected_version.is_empty() || input.expected_version.len() > 200 {
        return Err(AppError::bad_request("catalog version required"));
    }
    let entry = load(&db, &input.product_id)?;
    let profile_condition = require_physical(&db, &entry.payload)?;
    if entry.version.as_deref() != Some(&input.expected_version) {
        return Err(AppError::conflict(
            "product changed; read its current catalog version",
        ));
    }
    let patch = input
        .patch
        .as_object()
        .filter(|p| !p.is_empty())
        .ok_or_else(|| AppError::bad_request("patch must be a nonempty object"))?;
    if patch.keys().any(|key| !FIELDS.contains(&key.as_str())) {
        return Err(AppError::bad_request(
            "patch contains an unsupported catalog field",
        ));
    }
    if patch
        .get("productType")
        .is_some_and(|value| value != "standard")
    {
        return Err(AppError::unprocessable(
            "physical goods cannot be changed to digital or subscription products",
        ));
    }
    if let Some(price) = patch.get("price") {
        require_fiat_price(price)?;
    }
    let mut material = serde_json::Map::new();
    for field in FIELDS {
        if let Some(value) = entry.payload.get(*field) {
            material.insert((*field).into(), value.clone());
        }
    }
    material.insert("id".into(), json!(input.product_id));
    material.insert(
        "title".into(),
        json!(
            first_string(&entry.payload, &["displayName", "title", "name"])
                .ok_or_else(|| AppError::unprocessable("existing product is missing a title"))?
        ),
    );
    material.insert("price".into(),json!({"amountCents":super::catalog_price_cents(&entry.payload).ok_or_else(||AppError::unprocessable("existing product is missing a supported price"))?,"currency":super::catalog_currency(&entry.payload)}));
    if let Some(image) = entry.payload["images"]
        .as_array()
        .and_then(|images| images.first())
    {
        for (input, stored) in [
            ("imageAlt", "alt"),
            ("imageWidth", "width"),
            ("imageHeight", "height"),
        ] {
            if let Some(value) = image.get(stored) {
                material.insert(input.into(), value.clone());
            }
        }
    }
    for (key, value) in patch {
        material.insert(key.clone(), value.clone());
    }
    require_fiat_price(&material["price"])?;
    let validated: create::CreateReq = serde_json::from_value(Value::Object(material))
        .map_err(|_| AppError::bad_request("invalid storefront patch"))?;
    let normalized = create::validated_record(seams, &ctx, validated)?;
    let mut saved = entry.payload.clone();
    let object = saved
        .as_object_mut()
        .ok_or_else(|| AppError::unprocessable("invalid stored product"))?;
    for field in patch.keys() {
        let targets: Vec<&str> = match field.as_str() {
            "price" => vec!["fiatAmountCents", "fiatCurrency"],
            "imageUrls" | "imageAlt" | "imageWidth" | "imageHeight" => vec!["imageUrls", "images"],
            other => vec![other],
        };
        for target in targets {
            match normalized.get(target) {
                Some(value) => {
                    object.insert(target.into(), value.clone());
                }
                None => {
                    object.remove(target);
                }
            }
        }
    }
    if patch.contains_key("title") {
        for alias in ["displayName", "name"] {
            if object.contains_key(alias) {
                object.insert(alias.into(), normalized["title"].clone());
            }
        }
    }
    if patch.contains_key("price") {
        for alias in ["price", "fiatPrice"] {
            if let Some(price) = object.get_mut(alias).and_then(Value::as_object_mut) {
                price.insert("amountCents".into(), normalized["fiatAmountCents"].clone());
                price.insert("currency".into(), normalized["fiatCurrency"].clone());
            }
        }
    }
    // The entry key stays authoritative. Never replace lifecycle, metadata,
    // attached prices, inventory, external provider identifiers or createdAt.
    object.insert("id".into(), json!(input.product_id));
    object.insert("updatedAt".into(), normalized["updatedAt"].clone());
    require_product_price(&saved)?;
    catalog::seo_categories::update_versioned_guarded(
        seams,
        &input.product_id,
        &saved,
        &input.expected_version,
        &[profile_condition],
    )?;
    bounded(json!({"updated":true,"product":project(&load(&db,&input.product_id)?,site)?}))
}
fn load<S: HostSeams>(db: &Db<'_, S>, id: &str) -> AppResult<EntryRecord> {
    db.read_one(ids::MODEL_CATALOG, id)?
        .filter(is_product)
        .ok_or_else(|| AppError::not_found("product not found"))
}
fn is_product(entry: &EntryRecord) -> bool {
    validate_id(&entry.entry_key).is_ok()
        && entry.payload["recordType"] != "programEntitlement"
        && first_string(&entry.payload, &["displayName", "title", "name"]).is_some()
}
fn project(entry: &EntryRecord, site: &str) -> AppResult<Value> {
    let mut payload = entry.payload.clone();
    payload["id"] = json!(entry.entry_key);
    let mut product = catalog::projection::storefront_product(&payload, site)
        .ok_or_else(|| AppError::unprocessable("product cannot be projected"))?;
    product["catalogVersion"] = json!(entry.version);
    product["active"] = json!(payload["active"].as_bool().unwrap_or(true));
    product["public"] = json!(payload["public"].as_bool().unwrap_or(true));
    product["lifecycle"]["state"] = json!(if payload["active"].as_bool() == Some(false) {
        "inactive"
    } else {
        "active"
    });
    product
        .as_object_mut()
        .ok_or_else(|| AppError::internal("invalid product projection"))?
        .remove("purchaseAction");
    Ok(product)
}
fn require_physical<S: HostSeams>(db: &Db<'_, S>, product: &Value) -> AppResult<GuardedCondition> {
    if product["productType"] != "standard"
        || product.pointer("/fulfillment/type").and_then(Value::as_str) != Some("physical")
    {
        return Err(AppError::unprocessable(
            "only verified physical-goods catalog records are supported",
        ));
    }
    shipping_profile(
        db,
        product["shippingProfileId"]
            .as_str()
            .ok_or_else(|| AppError::unprocessable("physical shipping profile required"))?,
    )
}
fn shipping_profile<S: HostSeams>(db: &Db<'_, S>, id: &str) -> AppResult<GuardedCondition> {
    validate_id(id)?;
    let record = db
        .read_one(ids::MODEL_CATALOG, &format!("shipping_profile:{id}"))?
        .ok_or_else(|| AppError::unprocessable("shipping profile not found"))?;
    if record.payload["kind"] != "shippingProfile"
        || record.payload["id"] != id
        || record.payload["active"] != true
    {
        return Err(AppError::unprocessable(
            "an active physical shipping profile is required",
        ));
    }
    Ok(GuardedCondition::Version {
        content_model_id: ids::MODEL_CATALOG,
        entry_key: record.entry_key,
        expected_version: record
            .version
            .filter(|version| !version.is_empty())
            .ok_or_else(|| AppError::unprocessable("shipping profile version is required"))?,
    })
}
fn validate_id(id: &str) -> AppResult<()> {
    if id.is_empty()
        || id.len() > 120
        || !id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"._-".contains(&b))
    {
        Err(AppError::bad_request("invalid product id"))
    } else {
        Ok(())
    }
}
fn parse<T: serde::de::DeserializeOwned>(req: &RouteRequest) -> AppResult<T> {
    serde_json::from_value(req.json_body()?)
        .map_err(|_| AppError::bad_request("invalid catalog capability input"))
}
fn bounded(value: Value) -> AppResult<RouteResponse> {
    if serde_json::to_vec(&value)
        .map_err(|_| AppError::internal("invalid output"))?
        .len()
        > 512 * 1024
    {
        return Err(AppError::unprocessable(
            "catalog result exceeds response budget",
        ));
    }
    Ok(RouteResponse::ok(&value))
}

#[cfg(test)]
#[path = "ai_tests.rs"]
mod tests;
