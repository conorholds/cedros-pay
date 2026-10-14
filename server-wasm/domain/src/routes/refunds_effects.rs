use serde_json::{json, Map, Value};

use crate::crm_events;
use crate::routes::{analytics_events, entitlements};

use crate::routes::refunds::RefundRow;

pub(super) fn settled_actions(row: &RefundRow, now: i64) -> Vec<crate::durable_effects::Action> {
    let mut actions = vec![
        entitlements::changed_action(
            "refund_settled",
            row.customer_profile_id.as_deref(),
            row.product_id.as_deref(),
            Some(&row.original_purchase_id),
            Some(&row.reference),
            now,
        ),
        analytics_events::refund_settled_action(
            "x402",
            "refund",
            row.gross_cents,
            &row.currency,
            now,
        ),
    ];
    if let Some(action) = crm_events::refund_settled_action(
        &row.reference,
        &refund_crm_object(row),
        row.gross_cents,
        &row.currency,
        now,
        &row.original_purchase_id,
    ) {
        actions.push(action);
    }
    actions
}

fn refund_crm_object(row: &RefundRow) -> Value {
    let mut metadata = Map::new();
    if let Some(user_id) = &row.customer_profile_id {
        metadata.insert("userId".to_string(), Value::String(user_id.clone()));
    }
    if let Some(product_id) = &row.product_id {
        metadata.insert("productId".to_string(), Value::String(product_id.clone()));
    }
    json!({ "metadata": Value::Object(metadata) })
}
