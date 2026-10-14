use serde_json::{json, Map, Value};

use crate::crm_events;
use crate::models::LedgerEntry;
use crate::routes::{analytics_events, entitlements};
use crate::stripe::api;
use crate::time;

pub(super) fn actions(
    rail: &str,
    payment_ref: &str,
    refund_ref: &str,
    payment: &LedgerEntry,
    amount: i64,
    now: i64,
) -> Vec<crate::durable_effects::Action> {
    let mut actions = vec![
        entitlements::changed_action(
            "refund_settled",
            payment.customer_profile_id.as_deref(),
            payment.product_id.as_deref(),
            Some(payment_ref),
            Some(refund_ref),
            now,
        ),
        analytics_events::refund_settled_action(rail, "refund", amount, &payment.currency, now),
    ];
    if let Some(action) = crm_events::refund_settled_action(
        refund_ref,
        &crm_object(payment),
        amount,
        &payment.currency,
        now,
        payment_ref,
    ) {
        actions.push(action);
    }
    actions
}

fn crm_object(payment: &LedgerEntry) -> Value {
    let mut metadata = Map::new();
    if let Some(user_id) = &payment.customer_profile_id {
        metadata.insert("userId".to_string(), Value::String(user_id.clone()));
    }
    if let Some(product_id) = &payment.product_id {
        metadata.insert("productId".to_string(), Value::String(product_id.clone()));
    }
    json!({ "metadata": Value::Object(metadata) })
}

pub(super) fn stripe_row(
    payment: &LedgerEntry,
    reference: &str,
    refund: &api::StripeRefund,
    now: i64,
) -> LedgerEntry {
    LedgerEntry {
        reference: reference.to_string(),
        kind: "refund".to_string(),
        status: "succeeded".to_string(),
        gross_cents: refund.amount,
        refund_cents: 0,
        currency: refund.currency.clone(),
        customer_profile_id: payment.customer_profile_id.clone(),
        route_path: None,
        product_id: payment.product_id.clone(),
        product_ids: payment.product_ids.clone(),
        provider: "stripe".to_string(),
        provider_ref: Some(refund.id.clone()),
        payer_wallet: None,
        created_at: time::iso8601(now),
        processed_at: time::iso8601(now),
        token_settlement: None,
    }
}
