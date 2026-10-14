//! Public category invariant validation for atomic catalog mutations.

use std::collections::BTreeMap;

use serde_json::Value;

use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

#[path = "seo_categories_commit.rs"]
mod commit;
#[path = "seo_categories_validation.rs"]
mod validation;

pub(crate) use commit::{
    create, create_guarded, delete, delete_versioned, update, update_versioned,
    update_versioned_guarded,
};

pub(crate) const MAX_ITEMS: usize = 2_000;
pub(crate) const FENCE_KEY: &str = "seo-snapshot:fence";

#[derive(Clone, Debug, Eq, PartialEq)]
pub(super) struct SeoCategory {
    id: String,
    slug: String,
    name: String,
    parent_id: Option<String>,
    banner_image_url: Option<String>,
}

pub(super) fn validate_catalog(catalog: &BTreeMap<String, Value>) -> AppResult<()> {
    let mut categories = BTreeMap::<String, SeoCategory>::new();
    for product in catalog.values().filter(|value| is_public_product(value)) {
        for category in validation::categories(product)? {
            match categories.get(&category.id) {
                Some(existing) if existing != &category => {
                    return Err(AppError::conflict(
                        "public category metadata is inconsistent across catalog products",
                    ));
                }
                Some(_) => {}
                None => {
                    categories.insert(category.id.clone(), category);
                }
            }
        }
    }
    if categories.len() > MAX_ITEMS {
        return Err(AppError::unprocessable(
            "public category projection exceeds 2000 items",
        ));
    }
    validate_category_graph(&categories)
}

/// Enforces the public route invariant while holding the catalog-wide fence.
/// The map key is the authoritative product ID; payload IDs are not trusted.
pub(super) fn validate_unique_product_slugs(catalog: &BTreeMap<String, Value>) -> AppResult<()> {
    let mut owners = BTreeMap::<String, &str>::new();
    for (product_id, product) in catalog
        .iter()
        .filter(|(_, product)| is_public_product(product))
    {
        let Some(slug) = product
            .get("slug")
            .and_then(Value::as_str)
            .filter(|slug| !slug.trim().is_empty())
        else {
            continue;
        };
        let normalized = slug.trim().to_ascii_lowercase();
        if owners.insert(normalized, product_id).is_some() {
            return Err(AppError::conflict("product slug already exists"));
        }
    }
    Ok(())
}

fn validate_category_graph(categories: &BTreeMap<String, SeoCategory>) -> AppResult<()> {
    let mut slug_owners = BTreeMap::<String, &str>::new();
    for category in categories.values() {
        let normalized = category.slug.trim().to_ascii_lowercase();
        if slug_owners.insert(normalized, &category.id).is_some() {
            return Err(AppError::conflict("public category slug already exists"));
        }
        if let Some(parent_id) = &category.parent_id {
            if parent_id == &category.id {
                return Err(AppError::unprocessable(
                    "public category cannot reference itself as its parent",
                ));
            }
        }
    }
    for category in categories.values() {
        let mut seen = std::collections::BTreeSet::new();
        let mut current = Some(category.id.as_str());
        while let Some(id) = current {
            if !seen.insert(id) {
                return Err(AppError::unprocessable(
                    "public category hierarchy contains a cycle",
                ));
            }
            current = categories
                .get(id)
                .and_then(|item| item.parent_id.as_deref());
        }
    }
    Ok(())
}

fn is_public_product(value: &Value) -> bool {
    let record_type = value.get("recordType").and_then(Value::as_str);
    let kind = value.get("kind").and_then(Value::as_str);
    let excluded = record_type == Some("coupon")
        || matches!(
            kind,
            Some("shippingProfile" | "shippingRate" | "taxRate" | "seoSnapshotFence")
        );
    let product_marker = [
        "fiatAmountCents",
        "cryptoAtomicAmount",
        "productType",
        "displayName",
        "title",
        "name",
        "slug",
    ]
    .iter()
    .any(|field| value.get(*field).is_some());
    !excluded && product_marker && super::super::is_public_product(value)
}

pub(crate) fn marker_required<S: HostSeams>(seams: &S) -> AppResult<()> {
    crate::guarded_policy::require_active(seams).map(|_| ())
}

#[cfg(test)]
#[path = "seo_categories_mutation_tests.rs"]
mod mutation_tests;
#[cfg(test)]
#[path = "seo_categories_validation_tests.rs"]
mod validation_tests;
