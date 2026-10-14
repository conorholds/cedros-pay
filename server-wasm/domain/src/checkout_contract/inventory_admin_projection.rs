use serde_json::Value;

const PROJECTION_FIELDS: &[&str] = &["inventoryQuantity", "inventoryStatus"];

/// Removes response-only stock projections before a catalog payload is stored.
pub(super) fn strip(value: &mut Value) {
    let Some(product) = value.as_object_mut() else {
        return;
    };
    for field in PROJECTION_FIELDS {
        product.remove(*field);
    }
    if let Some(variants) = product.get_mut("variants").and_then(Value::as_array_mut) {
        for variant in variants {
            if let Some(variant) = variant.as_object_mut() {
                for field in PROJECTION_FIELDS {
                    variant.remove(*field);
                }
            }
        }
    }
}
