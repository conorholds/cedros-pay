//! Public catalog projection. Only explicitly public, purchasable product facts
//! cross this boundary; catalog configuration and private metadata never do.
use crate::{
    ctx::RequestContext,
    db::{Db, Filter, Op, Query},
    error::{AppError, AppResult},
    ids,
    reqresp::{RouteRequest, RouteResponse},
    seams::HostSeams,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde_json::{json, Value};

pub(super) fn item_id(site: &str, resource: &str, variant: Option<&str>) -> String {
    format!(
        "gid://cedros-pay/{}/{}",
        URL_SAFE_NO_PAD.encode(site),
        URL_SAFE_NO_PAD.encode(json!([resource, variant]).to_string())
    )
}
pub(super) fn decode_id(site: &str, id: &str) -> AppResult<(String, Option<String>)> {
    let prefix = format!("gid://cedros-pay/{}/", URL_SAFE_NO_PAD.encode(site));
    let encoded = id
        .strip_prefix(&prefix)
        .ok_or_else(|| AppError::bad_request("item id belongs to a different catalog"))?;
    let bytes = URL_SAFE_NO_PAD
        .decode(encoded)
        .map_err(|_| AppError::bad_request("invalid item id"))?;
    let pair: (String, Option<String>) =
        serde_json::from_slice(&bytes).map_err(|_| AppError::bad_request("invalid item id"))?;
    if pair.0.is_empty()
        || pair.0.len() > 128
        || pair
            .1
            .as_ref()
            .is_some_and(|v| v.is_empty() || v.len() > 128)
        || item_id(site, &pair.0, pair.1.as_deref()) != id
    {
        return Err(AppError::bad_request("invalid item id"));
    }
    Ok(pair)
}

pub(super) fn handle<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    _origin: &str,
) -> AppResult<RouteResponse> {
    let context = RequestContext::parse(&req.context_json);
    let site = context.require_site_id()?;
    let body: Value = req.json_body()?;
    if !body.is_object() {
        return Err(AppError::bad_request("catalog request must be an object"));
    }
    // Unsupported filters must not silently produce a broader result set.
    for name in ["filters", "selected", "preferences"] {
        if body
            .get(name)
            .is_some_and(|v| !v.is_null() && v != &json!({}) && v != &json!([]))
        {
            return Err(AppError::unprocessable(format!("{name} is not supported")));
        }
    }
    let policy = crate::native_storefront_policy::Policy::load(seams)?;
    let mut classifier = crate::native_storefront_policy::Classifier::new(seams);
    let db = Db::new(seams, ids::DB_ACCESS);
    let search = req.route_id == "cedros-pay:ucp-catalog-search";
    let ids = if search {
        Vec::new()
    } else if req.route_id == "cedros-pay:ucp-catalog-product" {
        vec![body["id"]
            .as_str()
            .ok_or_else(|| AppError::bad_request("id is required"))?
            .to_string()]
    } else {
        let ids = body["ids"]
            .as_array()
            .filter(|a| !a.is_empty() && a.len() <= 100)
            .ok_or_else(|| AppError::bad_request("ids requires 1 to 100 identifiers"))?;
        ids.iter()
            .map(|v| {
                v.as_str()
                    .map(str::to_string)
                    .ok_or_else(|| AppError::bad_request("ids must be strings"))
            })
            .collect::<AppResult<Vec<_>>>()?
    };
    let mut entries = if search {
        let rows = db.read_paged(
            ids::MODEL_CATALOG,
            &Query::new().filter(Filter::new("active", Op::Eq, true)),
            100,
            101,
        )?;
        if rows.len() > 10_000 {
            return Err(AppError::unprocessable("public catalog exceeds scan limit"));
        }
        rows
    } else {
        let keys = ids
            .iter()
            .map(|id| decode_id(site, id).map(|pair| pair.0))
            .collect::<AppResult<Vec<_>>>()?;
        db.read_keys(ids::MODEL_CATALOG, &keys)?
            .into_values()
            .collect()
    };
    entries.sort_by(|a, b| a.entry_key.cmp(&b.entry_key));
    let mut products = Vec::new();
    for entry in entries {
        if !crate::routes::products::is_public_product(&entry.payload)
            || (policy.is_physical()
                && !classifier.is_physical(&entry.payload, &entry.entry_key)?)
        {
            continue;
        }
        products.push((entry.entry_key, entry.payload));
    }
    let query = body
        .get("query")
        .map(|v| {
            v.as_str()
                .filter(|s| s.len() <= 512)
                .map(str::to_lowercase)
                .ok_or_else(|| AppError::bad_request("query must be a string of at most 512 bytes"))
        })
        .transpose()?
        .unwrap_or_default();
    products.retain(|(_, v)| {
        query.is_empty()
            || ["title", "displayName", "name", "description"]
                .iter()
                .any(|key| {
                    v[*key]
                        .as_str()
                        .is_some_and(|s| s.to_lowercase().contains(&query))
                })
    });
    let offset = body
        .pointer("/pagination/cursor")
        .map(|v| {
            v.as_str()
                .and_then(|s| s.parse::<usize>().ok())
                .filter(|v| *v <= 10_000)
                .ok_or_else(|| AppError::bad_request("invalid cursor"))
        })
        .transpose()?
        .unwrap_or(0);
    let limit = body
        .pointer("/pagination/limit")
        .map(|v| {
            v.as_u64()
                .filter(|v| *v > 0 && *v <= 100)
                .ok_or_else(|| AppError::bad_request("limit must be between 1 and 100"))
        })
        .transpose()?
        .unwrap_or(10) as usize;
    if search {
        products = products.into_iter().skip(offset).take(limit + 1).collect();
    }
    let has_next = search && products.len() > limit;
    if search {
        products.truncate(limit);
    }
    crate::checkout_contract::inventory_projection::overlay_many(seams, &mut products, true)?;
    let mut projected = Vec::new();
    for (key, product) in products {
        if let Some(value) = project(site, &key, &product, &ids)? {
            projected.push(value);
        }
    }
    if req.route_id == "cedros-pay:ucp-catalog-product" {
        let product = projected
            .into_iter()
            .next()
            .ok_or_else(|| AppError::not_found("public product was not found"))?;
        return Ok(RouteResponse::ok(
            &json!({"ucp":super::envelope("dev.ucp.shopping.catalog.lookup"),"product":product}),
        ));
    }
    let capability = if search {
        "dev.ucp.shopping.catalog.search"
    } else {
        "dev.ucp.shopping.catalog.lookup"
    };
    let mut response = json!({"ucp":super::envelope(capability),"products":projected});
    if search {
        response["products"]
            .as_array_mut()
            .expect("array constructed above")
            .truncate(limit);
        response["pagination"] = json!({"has_next_page":has_next});
        if has_next {
            response["pagination"]["cursor"] = json!((offset + limit).to_string());
        }
    }
    Ok(RouteResponse::ok(&response))
}
pub(super) fn is_public_variant(variant: &Value) -> bool {
    let mut projection = variant.clone();
    let Some(object) = projection.as_object_mut() else {
        return false;
    };
    object.entry("active").or_insert(Value::Bool(true));
    crate::routes::products::is_public_product(&projection)
}
fn project(site: &str, key: &str, product: &Value, inputs: &[String]) -> AppResult<Option<Value>> {
    let mut variants = Vec::new();
    let authored = product["variants"].as_array();
    if authored.is_some_and(|v| v.len() > 100) {
        return Err(AppError::unprocessable("too many product variants"));
    }
    let variant_ids = authored
        .filter(|v| !v.is_empty())
        .map(|vs| {
            vs.iter()
                .filter(|v| is_public_variant(v))
                .filter_map(|v| v["id"].as_str())
                .map(Some)
                .collect::<Vec<_>>()
        })
        .unwrap_or_else(|| vec![None]);
    let product_id = item_id(site, key, None);
    for variant in variant_ids {
        let facts =
            match crate::routes::products::catalog_item_authority_facts(product, key, variant) {
                Ok(v) => v,
                Err(e) if e.status == 422 => continue,
                Err(e) => return Err(e),
            };
        let id = item_id(site, key, variant);
        let correlation = inputs
            .iter()
            .filter(|v| *v == &id || *v == &product_id)
            .map(|v| json!({"id":v,"match":if *v==id {"exact"} else {"featured"}}))
            .collect::<Vec<_>>();
        if !inputs.is_empty() && correlation.is_empty() {
            continue;
        }
        let stock = variant
            .and_then(|id| authored.and_then(|vs| vs.iter().find(|v| v["id"] == id)))
            .unwrap_or(product);
        let available = stock["inventoryStatus"] != "out_of_stock"
            && stock["inventoryQuantity"].as_u64() != Some(0);
        let mut value = json!({"id":id,"title":facts.title,"description":{"plain":product["description"].as_str().unwrap_or("")},"price":{"amount":facts.unit_amount_cents,"currency":facts.currency},"availability":{"available":available,"status":if available {"in_stock"}else{"out_of_stock"}}});
        if !correlation.is_empty() {
            value["inputs"] = json!(correlation);
        }
        if let Some(url) = facts.image {
            value["media"] = json!([{"type":"image","url":url}]);
        }
        variants.push(value);
    }
    if variants.is_empty() {
        return Ok(None);
    }
    let currency = variants[0]["price"]["currency"].clone();
    if variants.iter().any(|v| v["price"]["currency"] != currency) {
        return Err(AppError::unprocessable(
            "product variants use mixed currencies",
        ));
    }
    let min = variants
        .iter()
        .min_by_key(|v| v["price"]["amount"].as_u64())
        .expect("nonempty")["price"]
        .clone();
    let max = variants
        .iter()
        .max_by_key(|v| v["price"]["amount"].as_u64())
        .expect("nonempty")["price"]
        .clone();
    Ok(Some(
        json!({"id":product_id,"title":product["title"].as_str().or_else(||product["displayName"].as_str()).unwrap_or(key),"description":{"plain":product["description"].as_str().unwrap_or("")},"price_range":{"min":min,"max":max},"variants":variants}),
    ))
}
