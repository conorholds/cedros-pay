//! `GET /products/v1/catalog` - Pay-backed storefront catalog read contract.
//!
//! Capability-gated for Shop/host renderers. Returns only public product and
//! derived category data needed to render product and category pages.

use serde_json::{json, Value};

use crate::ctx::RequestContext;
use crate::db::{Db, Dir, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;

use super::{is_public_product, parse_i64};

pub const PATH: &str = "/products/v1/catalog";

const CLAIM_PRODUCT_READ: &str = "cedros-pay:product-read";
const DEFAULT_LIMIT: i64 = 50;
const MAX_LIMIT: i64 = 100;
const PAGE_SIZE: i64 = 100;
const MAX_CATALOG_ENTRIES: usize = 10_000;
const MAX_SCAN_PAGES: usize = (MAX_CATALOG_ENTRIES / PAGE_SIZE as usize) + 1;

#[path = "catalog_categories.rs"]
mod categories;
#[path = "catalog_projection.rs"]
pub(super) mod projection;

#[path = "seo_categories.rs"]
pub(crate) mod seo_categories;

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let ctx = RequestContext::parse(&req.context_json);
    ctx.require_claim(CLAIM_PRODUCT_READ)?;
    let site_id = ctx.require_site_id()?;

    let policy = crate::native_storefront_policy::Policy::load(seams)?;
    let mut classifier = crate::native_storefront_policy::Classifier::new(seams);
    let mut commerce_kinds = std::collections::BTreeMap::new();
    let filters = CatalogFilters::from_request(req)?;
    let base_query = build_query(&filters);
    let db = Db::new(seams, ids::DB_ACCESS);
    let revision = db.read_one(ids::MODEL_CATALOG_FENCE, seo_categories::FENCE_KEY)?;
    let mut scanned = 0;
    let mut matched = 0;
    let mut page = Vec::new();
    let mut categories = categories::Accumulator::default();
    db.for_each_page(
        ids::MODEL_CATALOG,
        &base_query,
        PAGE_SIZE,
        MAX_SCAN_PAGES,
        |entries| {
            scanned += entries.len();
            if scanned > MAX_CATALOG_ENTRIES {
                return Err(AppError::unprocessable(
                    "active public catalog exceeds bounded product-read scan",
                ));
            }
            for entry in entries {
                let product = authoritative_payload(&entry.entry_key, entry.payload);
                if !is_public_product(&product)
                    || !matches_category(&product, filters.category_id.as_deref())
                {
                    continue;
                }
                let physical = classifier.is_physical(&product, &entry.entry_key)?;
                if policy.is_physical() && !physical {
                    continue;
                }
                categories.add(&product, site_id)?;
                if matched >= filters.offset as usize && page.len() < filters.limit as usize {
                    commerce_kinds.insert(entry.entry_key.clone(), physical);
                    page.push((entry.entry_key, product));
                }
                matched += 1;
            }
            Ok(())
        },
    )?;
    crate::checkout_contract::inventory_projection::overlay_many(seams, &mut page, true)?;
    let products = page
        .into_iter()
        .filter_map(|(key, product)| {
            let mut projected = projection::storefront_product(&product, site_id)?;
            projected["commerceKind"] = json!(if commerce_kinds.get(&key) == Some(&true) {
                "physical"
            } else {
                "other"
            });
            Some(projected)
        })
        .collect::<Vec<_>>();
    let count = products.len();
    let has_more = has_more(matched, count, &filters);
    let categories = categories.finish();

    Ok(RouteResponse::ok(&json!({
        "contract": CLAIM_PRODUCT_READ,
        "contractVersion": 2,
        "catalogRevision": revision.map(|entry| json!({
            "version": entry.version,
            "lastModified": entry.updated_at.or_else(|| entry.payload.get("updatedAt")
                .and_then(Value::as_str).map(str::to_string)),
        })),
        "entityScope": {"kind":"site", "id":site_id},
        "localization": {
            "catalogContent": "default-locale-only",
            "localizedRoutes": false,
            "hreflangOwner": "host"
        },
        "products": products,
        "categories": categories,
        "filters": filters.response_value(),
        "pagination": {
            "limit": filters.limit,
            "offset": filters.offset,
            "count": count,
            "hasMore": has_more,
        },
    })))
}

struct CatalogFilters {
    limit: i64,
    offset: i64,
    slug: Option<String>,
    category_id: Option<String>,
    featured: Option<bool>,
}

impl CatalogFilters {
    fn from_request(req: &RouteRequest) -> AppResult<Self> {
        Ok(Self {
            limit: parse_i64(req.query_value("limit"), DEFAULT_LIMIT).clamp(0, MAX_LIMIT),
            offset: parse_i64(req.query_value("offset"), 0).max(0),
            slug: query_text(req, "slug"),
            category_id: query_text(req, "categoryId"),
            featured: query_bool(req, "featured")?,
        })
    }

    fn response_value(&self) -> Value {
        json!({
            "slug": self.slug,
            "categoryId": self.category_id,
            "featured": self.featured,
        })
    }
}

fn build_query(filters: &CatalogFilters) -> Query {
    let mut query = Query::new()
        .filter(Filter::new("active", Op::Eq, true))
        .order("sortOrder", Dir::Asc);
    if let Some(slug) = &filters.slug {
        query = query.filter(Filter::new("slug", Op::Eq, slug.clone()));
    }
    if let Some(featured) = filters.featured {
        query = query.filter(Filter::new("featured", Op::Eq, featured));
    }
    query
}

fn authoritative_payload(entry_key: &str, mut payload: Value) -> Value {
    if let Some(object) = payload.as_object_mut() {
        object.insert("id".into(), Value::String(entry_key.to_string()));
    }
    payload
}

fn matches_category(product: &Value, category_id: Option<&str>) -> bool {
    category_id
        .map(|wanted| categories::ids(product).iter().any(|id| id == wanted))
        .unwrap_or(true)
}

fn query_text(req: &RouteRequest, name: &str) -> Option<String> {
    req.query_value(name)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

fn query_bool(req: &RouteRequest, name: &str) -> AppResult<Option<bool>> {
    match req.query_value(name).map(str::trim) {
        None | Some("") => Ok(None),
        Some("true") => Ok(Some(true)),
        Some("false") => Ok(Some(false)),
        Some(_) => Err(AppError::bad_request(format!(
            "{name} must be true or false"
        ))),
    }
}

fn has_more(filtered_len: usize, page_len: usize, filters: &CatalogFilters) -> bool {
    page_len > 0 && filtered_len > filters.offset as usize + page_len
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fake::FakeSeams;

    fn req(claims: &[&str], query: Vec<(&str, &str)>) -> RouteRequest {
        RouteRequest {
            route_id: ids::ROUTE_PRODUCT_READ.into(),
            method: "GET".into(),
            path: PATH.into(),
            query: query
                .into_iter()
                .map(|(key, value)| (key.to_string(), value.to_string()))
                .collect(),
            context_json: json!({
                "authenticated": true,
                "siteId": "site-a",
                "permissionClaims": claims,
            })
            .to_string(),
            ..Default::default()
        }
    }

    #[test]
    fn product_read_returns_storefront_catalog_shape() {
        let seams = FakeSeams::new();
        seams.seed(
            ids::MODEL_CATALOG,
            "prod_1",
            json!({
                "id": "prod_1",
                "active": true,
                "title": "Public product",
                "slug": "public-product",
                "description": "Safe public description",
                "categoryIds": ["books"],
                "fiatAmountCents": 1299,
                "fiatCurrency": "USD",
                "metadata": { "buyerEmail": "buyer@example.com" },
                "images": [{ "url": "https://cdn.example/product.png" }]
            }),
        );
        seams.seed(
            ids::MODEL_CATALOG,
            "draft_1",
            json!({ "id": "draft_1", "active": true, "status": "draft", "title": "Draft" }),
        );
        let stock_key =
            crate::checkout_contract::inventory_admin::stock_key_for_test("prod_1", None);
        seams.seed(
            crate::checkout_contract::STOCK_MODEL,
            &stock_key,
            json!({
                "schemaVersion":1,
                "stockKey":stock_key,
                "resource":"prod_1",
                "onHand":5,
                "reserved":2,
                "sold":0,
                "updatedAt":123
            }),
        );

        let response = handle(
            &seams,
            &req(&[CLAIM_PRODUCT_READ], vec![("categoryId", "books")]),
        )
        .unwrap();
        let body: Value = serde_json::from_str(&response.body).unwrap();

        assert_eq!(response.status, 200);
        assert_eq!(body["contract"], CLAIM_PRODUCT_READ);
        assert_eq!(body["contractVersion"], 2);
        assert_eq!(body["products"].as_array().unwrap().len(), 1);
        assert_eq!(body["products"][0]["id"], "prod_1");
        assert_eq!(body["products"][0]["price"]["amountCents"], 1299);
        assert_eq!(body["products"][0]["availability"]["availableQuantity"], 3);
        assert_eq!(body["products"][0]["availability"]["status"], "in_stock");
        assert_eq!(body["products"][0]["availability"]["lastModifiedUnix"], 123);
        assert!(body["products"][0]["availability"]["revision"]
            .as_str()
            .is_some_and(|revision| !revision.is_empty()));
        assert_eq!(
            body["products"][0]["publicEntityId"],
            "cedros-pay:site:site-a:product:prod_1"
        );
        assert_eq!(body["entityScope"]["id"], "site-a");
        assert_eq!(body["products"][0]["lifecycle"]["indexEligible"], true);
        assert!(body["products"][0].get("checkoutUrl").is_none());
        assert_eq!(body["products"][0]["purchaseAction"]["urlOwner"], "host");
        assert_eq!(body["categories"][0]["id"], "books");
        assert_eq!(body["categories"][0]["lifecycle"]["indexEligible"], false);
        assert!(body["categories"][0].get("slug").is_none());
        assert!(body["categories"][0].get("title").is_none());
        assert!(body["categories"][0].get("canonicalRouteKey").is_none());
        assert_eq!(body["pagination"]["count"], 1);
        assert!(body["products"][0].get("metadata").is_none());
        assert!(!body.to_string().contains("buyer@example.com"));
    }

    #[test]
    fn product_read_requires_declared_claim() {
        let seams = FakeSeams::new();
        let error = handle(&seams, &req(&[], Vec::new())).unwrap_err();
        assert_eq!(error.status, 403);
    }

    #[test]
    fn product_read_requires_host_verified_site_scope() {
        let seams = FakeSeams::new();
        let mut request = req(&[CLAIM_PRODUCT_READ], Vec::new());
        request.context_json = json!({
            "authenticated":true,
            "permissionClaims":[CLAIM_PRODUCT_READ]
        })
        .to_string();

        let error = handle(&seams, &request).unwrap_err();
        assert_eq!(error.status, 400);
    }

    #[test]
    fn content_model_entry_key_overrides_mutable_payload_identity() {
        let payload = authoritative_payload(
            "authoritative-id",
            json!({"id":"spoofed-id", "active":true, "title":"Product", "slug":"product"}),
        );
        let projected = projection::storefront_product(&payload, "site-a").unwrap();

        assert_eq!(projected["id"], "authoritative-id");
        assert_eq!(
            projected["publicEntityId"],
            "cedros-pay:site:site-a:product:authoritative-id"
        );
    }

    #[test]
    fn public_read_fails_instead_of_truncating_oversized_semantic_collections() {
        let seams = FakeSeams::new();
        let variants = (0..101)
            .map(|index| json!({"id":format!("variant-{index}"), "title":"Variant"}))
            .collect::<Vec<_>>();
        seams.seed(
            ids::MODEL_CATALOG,
            "oversized",
            json!({
                "active":true, "title":"Oversized", "slug":"oversized", "variants":variants
            }),
        );

        let error = handle(&seams, &req(&[CLAIM_PRODUCT_READ], Vec::new())).unwrap_err();
        assert_eq!(error.status, 422);

        let categories = (0..2_001)
            .map(|index| Value::String(format!("category-{index}")))
            .collect::<Vec<_>>();
        let error =
            categories::derived(&[json!({"categoryIds":categories})], "site-a").unwrap_err();
        assert_eq!(error.status, 422);
    }
    #[test]
    fn streamed_catalog_counts_off_page_categories_and_batches_only_page_stock() {
        let seams = FakeSeams::new();
        for index in 0..501 {
            seams.seed(ids::MODEL_CATALOG, &format!("p{index:04}"), json!({
                "active":true, "title":"Product", "slug":format!("p{index:04}"), "sortOrder":index,
                "categoryIds":["books"], "variants":[{"id":"v1"}, {"id":"v2"}]
            }));
        }
        let response = handle(
            &seams,
            &req(
                &[CLAIM_PRODUCT_READ],
                vec![("limit", "50"), ("offset", "450"), ("categoryId", "books")],
            ),
        )
        .unwrap();
        let body: Value = serde_json::from_str(&response.body).unwrap();
        assert_eq!(body["products"][0]["id"], "p0450");
        assert_eq!(body["products"].as_array().unwrap().len(), 50);
        assert_eq!(body["categories"][0]["productCount"], 501);
        assert_eq!(body["pagination"]["hasMore"], true);
        assert_eq!(seams.db_reads.borrow()[ids::MODEL_CATALOG].0, 6);
        assert_eq!(seams.db_reads.borrow()["cedros-pay:checkout-stock"].0, 2);
        seams.db_reads.borrow_mut().clear();
        let response = handle(&seams, &req(&[CLAIM_PRODUCT_READ], vec![("limit", "0")])).unwrap();
        let body: Value = serde_json::from_str(&response.body).unwrap();
        assert_eq!(body["categories"][0]["productCount"], 501);
        assert_eq!(body["products"], json!([]));
        assert!(!seams
            .db_reads
            .borrow()
            .contains_key("cedros-pay:checkout-stock"));
    }
}
