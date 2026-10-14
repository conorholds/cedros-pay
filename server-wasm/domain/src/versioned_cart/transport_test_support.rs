use super::*;

pub(super) fn storage_entry_count(seams: &FakeSeams) -> usize {
    [
        CART_MODEL_ID,
        GENERATION_MODEL_ID,
        OPERATION_MODEL_ID,
        TOMBSTONE_MODEL_ID,
        LANE_MODEL_ID,
    ]
    .iter()
    .map(|model| seams.entry_count(model))
    .sum()
}

pub(super) fn transport_add(
    generation: &str,
    expected_version: u64,
    operation_id: &str,
    quantity: u64,
) -> serde_json::Value {
    serde_json::json!({
        "lane": DEFAULT_LANE,
        "generation": generation,
        "expectedVersion": expected_version,
        "operationId": operation_id,
        "mutation": {
            "kind": "add",
            "item": {
                "resource": "sku-1",
                "qty": quantity,
                "displayMetadata": { "giftMessage": "hello" }
            }
        }
    })
}
