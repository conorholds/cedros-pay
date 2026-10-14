//! Truthful catalog-facing projection of authoritative checkout inventory.

use serde_json::Value;

use crate::error::AppResult;
use crate::seams::HostSeams;

pub(crate) fn overlay<S: HostSeams>(seams: &S, resource: &str, product: Value) -> AppResult<Value> {
    let mut products = [(resource.to_string(), product)];
    overlay_many(seams, &mut products, false)?;
    Ok(std::mem::take(&mut products[0].1))
}

/// Inventory remains request-local. At most 100 stock records are retained
/// alongside the product output at a time, including across large admin lists.
pub(crate) fn overlay_many<S: HostSeams>(
    seams: &S,
    products: &mut [(String, Value)],
    public: bool,
) -> AppResult<()> {
    use std::collections::BTreeMap;
    let mut targets: BTreeMap<String, Vec<(usize, Option<usize>)>> = BTreeMap::new();
    for (index, (resource, product)) in products.iter().enumerate() {
        targets
            .entry(super::inventory_types::stock_key(resource, None))
            .or_default()
            .push((index, None));
        if let Some(variants) = product.get("variants").and_then(Value::as_array) {
            if public && variants.len() > 100 {
                return Err(crate::error::AppError::unprocessable(
                    "public product exceeds 100 variants",
                ));
            }
            for (variant_index, variant) in variants.iter().enumerate() {
                if let Some(id) = variant.get("id").and_then(Value::as_str) {
                    targets
                        .entry(super::inventory_types::stock_key(resource, Some(id)))
                        .or_default()
                        .push((index, Some(variant_index)));
                }
            }
        }
    }
    let keys: Vec<_> = targets.keys().cloned().collect();
    let db = crate::db::Db::new(seams, crate::ids::DB_ACCESS);
    for chunk in keys.chunks(100) {
        for (key, entry) in db.read_keys(super::STOCK_MODEL, chunk)? {
            for &(product_index, variant_index) in &targets[&key] {
                let (resource, product) = &mut products[product_index];
                let value = match variant_index {
                    Some(index) => &mut product["variants"][index],
                    None => product,
                };
                let variant_id =
                    variant_index.and_then(|_| value.get("id").and_then(Value::as_str));
                let state = super::inventory_admin::state_from_entry(&entry, resource, variant_id)?;
                put(
                    value,
                    state.available,
                    state.updated_at,
                    state.revision.as_deref(),
                );
            }
        }
    }
    Ok(())
}

fn put(value: &mut Value, available: u64, updated_at: i64, revision: Option<&str>) {
    let Some(object) = value.as_object_mut() else {
        return;
    };
    object.insert("inventoryQuantity".into(), Value::from(available));
    object.insert("inventoryLastModifiedUnix".into(), Value::from(updated_at));
    if let Some(revision) = revision {
        object.insert("inventoryRevision".into(), Value::String(revision.into()));
    }
    object.insert(
        "inventoryStatus".into(),
        Value::String(
            if available == 0 {
                "out_of_stock"
            } else {
                "in_stock"
            }
            .into(),
        ),
    );
}
