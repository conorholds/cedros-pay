use serde_json::{Map, Value};

use super::webhook_commit::{self, CommitResult};
use super::{meta, object_str};
use crate::crm_events;
use crate::db::Db;
use crate::error::AppResult;
use crate::ids;
use crate::money;
use crate::routes::{analytics_events, entitlements};
use crate::seams::HostSeams;
use crate::time;

pub(super) struct DisputeEvent<'a> {
    pub(super) created_at: i64,
    pub(super) processed_at: i64,
    pub(super) crm_event_type: &'a str,
}

pub(super) fn dispute<S: HostSeams>(
    _seams: &S,
    db: &Db<'_, S>,
    event_id: &str,
    fingerprint: &str,
    object: &Value,
    event: DisputeEvent<'_>,
) -> AppResult<CommitResult> {
    let Some(payment_intent) = object_str(object, "payment_intent") else {
        return Err(crate::error::AppError::forbidden(
            "dispute payment identity is missing",
        ));
    };
    // A shared Stripe account is not a tenant boundary. Only a payment already
    // owned by this site's ledger can create dispute state or customer effects.
    let Some(payment_row) =
        super::webhook_refunds::find_payment(db, payment_intent, payment_intent)?
    else {
        return webhook_commit::commit(
            db,
            event_id,
            fingerprint,
            event.processed_at,
            vec![],
            vec![],
        );
    };
    let payment: crate::models::LedgerEntry = payment_row.parse()?;
    let amount = super::webhook_payment_support::required_amount(object, "amount")?;
    let currency = super::webhook_payment_support::required_currency(object)?;
    if payment.kind != "payment"
        || payment.provider != "stripe"
        || payment.provider_ref.as_deref() != Some(payment_intent)
        || amount > payment.gross_cents
        || !currency.eq_ignore_ascii_case(&payment.currency)
    {
        return Err(crate::error::AppError::forbidden(
            "dispute does not match the local payment",
        ));
    }
    let mut scoped_object = object.clone();
    scoped_object["metadata"] = serde_json::json!({
        "reference": payment.reference, "ledgerRef": payment.reference,
        "customerId": payment.customer_profile_id, "productId": payment.product_id,
    });
    let object = &scoped_object;
    let crate::routes::admin_dashboard::disputes::WebhookPersistence {
        conditions,
        ops,
        emit_effects,
    } = crate::routes::admin_dashboard::disputes::webhook_persistence(
        db,
        object,
        event.created_at,
        event.processed_at,
    )?;
    let actions = if emit_effects {
        dispute_actions(event_id, object, &event)
    } else {
        Vec::new()
    };
    webhook_commit::commit_with_effects(
        db,
        event_id,
        fingerprint,
        event.processed_at,
        conditions,
        ops,
        actions,
    )
}

fn dispute_actions(
    event_id: &str,
    object: &Value,
    event: &DisputeEvent<'_>,
) -> Vec<crate::durable_effects::Action> {
    let mut actions = Vec::new();
    if let Some(action) = crm_events::dispute_action(
        event.crm_event_type,
        event_id,
        event.processed_at,
        dispute_crm_payload(object, event.crm_event_type, event.processed_at),
    ) {
        actions.push(action);
    }
    actions.push(entitlements::changed_action(
        event.crm_event_type,
        meta(object, "cedrosLoginUserId")
            .or_else(|| meta(object, "userId"))
            .or_else(|| meta(object, "customerId")),
        meta(object, "productId"),
        meta(object, "ledgerRef")
            .or_else(|| meta(object, "orderReference"))
            .or_else(|| meta(object, "reference"))
            .or_else(|| object_str(object, "payment_intent")),
        Some(event_id),
        event.processed_at,
    ));
    // Admin-scope risk signal — only fire for newly opened disputes/chargebacks,
    // never status churn (updated/closed). Coarse kind + amount bucket only.
    let dispute_kind = if event.crm_event_type == ids::CRM_EVENT_CHARGEBACK_OPENED {
        Some("chargeback")
    } else if event.crm_event_type == ids::CRM_EVENT_DISPUTE_OPENED {
        Some("dispute")
    } else {
        None
    };
    if let Some(dispute_kind) = dispute_kind {
        actions.push(analytics_events::dispute_opened_action(
            dispute_kind,
            object.get("amount").and_then(Value::as_i64),
            event.processed_at,
        ));
    }
    actions
}

fn dispute_crm_payload(object: &Value, crm_event_type: &str, now: i64) -> Map<String, Value> {
    let mut payload = Map::new();
    insert_str(&mut payload, "customerId", meta(object, "customerId"));
    insert_str(
        &mut payload,
        "cedrosLoginUserId",
        meta(object, "cedrosLoginUserId").or_else(|| meta(object, "userId")),
    );
    insert_str(&mut payload, "email", meta(object, "email"));
    insert_str(&mut payload, "phone", meta(object, "phone"));
    insert_str(
        &mut payload,
        "walletAddressHash",
        meta(object, "walletAddressHash"),
    );
    insert_str(&mut payload, "disputeId", object_str(object, "id"));
    if crm_event_type == ids::CRM_EVENT_CHARGEBACK_OPENED {
        insert_str(&mut payload, "chargebackId", object_str(object, "id"));
    }
    insert_str(&mut payload, "disputeStatus", object_str(object, "status"));
    insert_str(&mut payload, "disputeReason", object_str(object, "reason"));
    insert_i64(
        &mut payload,
        "disputedAmountCents",
        object.get("amount").and_then(Value::as_i64),
    );
    if let Some(currency) = object_str(object, "currency") {
        payload.insert(
            "disputedCurrency".into(),
            Value::String(money::normalize_currency(currency)),
        );
    }
    insert_str(
        &mut payload,
        "paymentIntentRef",
        object_str(object, "payment_intent"),
    );
    insert_str(
        &mut payload,
        "orderReference",
        meta(object, "orderReference").or_else(|| meta(object, "reference")),
    );
    insert_str(&mut payload, "ledgerRef", meta(object, "ledgerRef"));
    insert_str(
        &mut payload,
        "subscriptionRef",
        meta(object, "subscriptionRef"),
    );
    insert_str(&mut payload, "invoiceRef", meta(object, "invoiceRef"));
    insert_str(&mut payload, "productId", meta(object, "productId"));
    insert_str(&mut payload, "routePath", meta(object, "routePath"));
    insert_str(&mut payload, "pagePath", meta(object, "pagePath"));
    insert_str(
        &mut payload,
        "redactedProviderCustomerRef",
        meta(object, "redactedProviderCustomerRef"),
    );
    if let Some(due_at) = object
        .pointer("/evidence_details/due_by")
        .and_then(Value::as_i64)
    {
        payload.insert("evidenceDueAt".into(), Value::String(time::iso8601(due_at)));
    }
    if crm_event_type == ids::CRM_EVENT_DISPUTE_CLOSED {
        payload.insert("resolvedAt".into(), Value::String(time::iso8601(now)));
    }
    payload.insert("rail".into(), Value::String("stripe".to_string()));
    payload.insert("flow".into(), Value::String("dispute".to_string()));
    payload
}

fn insert_str(payload: &mut Map<String, Value>, key: &str, value: Option<&str>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::String(value.to_string()));
    }
}

fn insert_i64(payload: &mut Map<String, Value>, key: &str, value: Option<i64>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::from(value));
    }
}
