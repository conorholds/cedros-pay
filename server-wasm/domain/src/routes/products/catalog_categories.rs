//! Category grouping and authored storefront category projections.

use std::collections::BTreeMap;

use serde_json::{json, Map, Value};

use crate::error::{AppError, AppResult};

use super::super::{insert_opt, safe_public_media_url, string_field, valid_public_slug};
use super::projection::{canonical_route_key, public_entity_id};

pub(super) fn ids(product: &Value) -> Vec<String> {
    let mut ids = Vec::new();
    for field in ["categoryIds", "categories"] {
        for value in product
            .get(field)
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            let id = value
                .as_str()
                .map(str::to_string)
                .or_else(|| string_field(value, "id"));
            if let Some(id) = id.filter(|id| !id.trim().is_empty()) {
                ids.push(id);
            }
        }
    }
    ids.sort();
    ids.dedup();
    ids
}

#[derive(Default)]
pub(super) struct Accumulator {
    categories: BTreeMap<String, Value>,
    counts: BTreeMap<String, u64>,
}

impl Accumulator {
    pub(super) fn add(&mut self, product: &Value, site_id: &str) -> AppResult<()> {
        for category in product_categories(product, site_id) {
            let id = category["id"].as_str().unwrap_or_default().to_string();
            upsert(&mut self.categories, category);
            *self.counts.entry(id).or_default() += 1;
            if self.categories.len() > 2_000 {
                return Err(AppError::unprocessable(
                    "public category projection exceeds 2000 items",
                ));
            }
        }
        Ok(())
    }

    pub(super) fn finish(self) -> Vec<Value> {
        self.categories
            .into_iter()
            .map(|(id, mut category)| {
                category["productCount"] = self.counts.get(&id).copied().unwrap_or_default().into();
                category
            })
            .collect()
    }
}

#[cfg(test)]
pub(super) fn derived(products: &[Value], site_id: &str) -> AppResult<Vec<Value>> {
    let mut categories = Accumulator::default();
    for product in products {
        categories.add(product, site_id)?;
    }
    Ok(categories.finish())
}

fn authored(category: &Value) -> bool {
    category
        .pointer("/lifecycle/indexEligible")
        .and_then(Value::as_bool)
        == Some(true)
}

fn upsert(categories: &mut BTreeMap<String, Value>, category: Value) {
    let id = category["id"].as_str().unwrap_or_default().to_string();
    match categories.entry(id) {
        std::collections::btree_map::Entry::Vacant(entry) => {
            entry.insert(category);
        }
        std::collections::btree_map::Entry::Occupied(mut entry)
            if !authored(entry.get()) && authored(&category) =>
        {
            entry.insert(category);
        }
        _ => {}
    }
}

fn product_categories(product: &Value, site_id: &str) -> Vec<Value> {
    let mut categories = BTreeMap::new();
    // Rich authored definitions win when a grouping ID is present in both.
    for field in ["categories", "categoryIds"] {
        for value in product
            .get(field)
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            if let Some(category) = record(value, site_id) {
                upsert(&mut categories, category);
            }
        }
    }
    categories.into_values().collect()
}

fn record(value: &Value, site_id: &str) -> Option<Value> {
    if let Some(id) = value.as_str().filter(|id| !id.trim().is_empty()) {
        return Some(json!({
            "id": id,
            "publicEntityId": public_entity_id(site_id, "category", id),
            "lifecycle": {"state":"active", "indexEligible":false, "sitemapEligible":false,
                "qualityWarnings":["metadataDerivedFromIdentifier"]}
        }));
    }
    let id = string_field(value, "id")?;
    let slug = string_field(value, "slug").filter(|value| valid_public_slug(value));
    let title = string_field(value, "name");
    let eligible = slug.is_some() && title.is_some();
    let mut record = Map::new();
    record.insert("id".into(), Value::String(id.clone()));
    record.insert(
        "publicEntityId".into(),
        Value::String(public_entity_id(site_id, "category", &id)),
    );
    record.insert(
        "canonicalRouteKey".into(),
        Value::String(canonical_route_key("category", &id)),
    );
    insert_opt(&mut record, "slug", slug);
    insert_opt(&mut record, "title", title);
    insert_opt(&mut record, "parentId", string_field(value, "parentId"));
    insert_opt(
        &mut record,
        "bannerImageUrl",
        string_field(value, "bannerImageUrl").filter(|url| safe_public_media_url(url)),
    );
    record.insert(
        "lifecycle".into(),
        json!({"state":"active", "indexEligible":eligible, "sitemapEligible":eligible}),
    );
    Some(Value::Object(record))
}
