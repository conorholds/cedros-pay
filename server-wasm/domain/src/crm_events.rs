use serde_json::{Map, Value};

use crate::{ids, time};

#[allow(clippy::too_many_arguments)]
pub(crate) fn payment_succeeded_action(
    rail: &str,
    event_id: &str,
    object: &Value,
    amount_cents: i64,
    currency: &str,
    occurred_at: i64,
    order_reference: &str,
) -> Option<crate::durable_effects::Action> {
    purchase_action(
        ids::CRM_EVENT_PURCHASE_COMPLETED,
        event_id,
        object,
        PurchaseContext {
            rail,
            amount_cents,
            currency,
            occurred_at,
            flow: "checkout",
            order_reference: Some(order_reference),
            cause_code: None,
        },
    )
}

pub(crate) fn payment_failed_action(
    event_id: &str,
    object: &Value,
    amount_cents: i64,
    currency: &str,
    occurred_at: i64,
    cause_code: &str,
) -> Option<crate::durable_effects::Action> {
    purchase_action(
        ids::CRM_EVENT_PAYMENT_FAILED,
        event_id,
        object,
        PurchaseContext {
            rail: "stripe",
            amount_cents,
            currency,
            occurred_at,
            flow: "checkout",
            order_reference: meta(object, "reference"),
            cause_code: Some(cause_code),
        },
    )
}

pub(crate) fn refund_settled_action(
    event_id: &str,
    object: &Value,
    amount_cents: i64,
    currency: &str,
    occurred_at: i64,
    order_reference: &str,
) -> Option<crate::durable_effects::Action> {
    purchase_action(
        ids::CRM_EVENT_REFUND_SETTLED,
        event_id,
        object,
        PurchaseContext {
            rail: "stripe",
            amount_cents,
            currency,
            occurred_at,
            flow: "refund",
            order_reference: Some(order_reference),
            cause_code: None,
        },
    )
}

pub(crate) fn subscription_created_action(
    event_id: &str,
    customer_id: &str,
    subscription_id: &str,
    price_id: &str,
    occurred_at: i64,
    login_user_id: Option<&str>,
) -> Option<crate::durable_effects::Action> {
    let mut payload = Map::new();
    insert_optional(&mut payload, "customerId", non_empty(customer_id));
    insert_optional(
        &mut payload,
        "cedrosLoginUserId",
        login_user_id.and_then(non_empty),
    );
    insert_optional(&mut payload, "subscriptionRef", non_empty(subscription_id));
    insert_optional(&mut payload, "priceId", non_empty(price_id));
    payload.insert("rail".into(), Value::String("stripe".to_string()));
    payload.insert("flow".into(), Value::String("subscription".to_string()));
    payload_action(
        ids::CRM_EVENT_SUBSCRIPTION_CREATED,
        event_id,
        occurred_at,
        payload,
    )
}

pub(crate) fn subscription_canceled_action(
    event_id: &str,
    customer_id: &str,
    subscription_id: &str,
    price_id: &str,
    occurred_at: i64,
) -> Option<crate::durable_effects::Action> {
    let mut payload = Map::new();
    insert_optional(&mut payload, "customerId", non_empty(customer_id));
    insert_optional(&mut payload, "subscriptionRef", non_empty(subscription_id));
    insert_optional(&mut payload, "priceId", non_empty(price_id));
    payload.insert("rail".into(), Value::String("stripe".to_string()));
    payload.insert("flow".into(), Value::String("subscription".to_string()));
    payload_action(
        ids::CRM_EVENT_SUBSCRIPTION_CANCELED,
        event_id,
        occurred_at,
        payload,
    )
}

pub(crate) fn subscription_renewed_action(
    event_id: &str,
    object: &Value,
    occurred_at: i64,
) -> Option<crate::durable_effects::Action> {
    let mut payload = Map::new();
    insert_optional(
        &mut payload,
        "customerId",
        object_str(object, "customer").or_else(|| meta(object, "customerId")),
    );
    insert_optional(
        &mut payload,
        "cedrosLoginUserId",
        invoice_meta(object, "cedrosLoginUserId")
            .or_else(|| invoice_meta(object, "userId"))
            .or_else(|| {
                // The same metadata must carry Pay's ownership marker and user_id.
                [
                    "/subscription_details/metadata",
                    "/parent/subscription_details/metadata",
                    "/metadata",
                ]
                .iter()
                .find_map(|path| {
                    let metadata = object.pointer(path)?;
                    if metadata["user_id_trusted"] != "true" {
                        return None;
                    }
                    metadata["user_id"].as_str().and_then(non_empty)
                })
            }),
    );
    insert_optional(&mut payload, "email", invoice_meta(object, "email"));
    insert_optional(&mut payload, "phone", invoice_meta(object, "phone"));
    insert_optional(
        &mut payload,
        "walletAddressHash",
        invoice_meta(object, "walletAddressHash"),
    );
    insert_optional(
        &mut payload,
        "subscriptionRef",
        invoice_subscription_id(object),
    );
    insert_optional(&mut payload, "invoiceRef", object_str(object, "id"));
    insert_optional(&mut payload, "priceId", invoice_price_id(object));
    insert_optional(
        &mut payload,
        "receiptUrl",
        object_str(object, "hosted_invoice_url"),
    );
    payload.insert("rail".into(), Value::String("stripe".to_string()));
    payload.insert("flow".into(), Value::String("subscription".to_string()));
    if let Some(amount) = invoice_amount_cents(object) {
        payload.insert("amountCents".into(), Value::from(amount.max(0)));
    }
    if let Some(currency) = invoice_currency(object) {
        payload.insert(
            "currency".into(),
            Value::String(currency.to_ascii_uppercase()),
        );
    }
    payload_action(
        ids::CRM_EVENT_SUBSCRIPTION_RENEWED,
        event_id,
        occurred_at,
        payload,
    )
}

pub(crate) fn subscription_renewed_record_action(
    event_id: &str,
    customer_id: &str,
    subscription_id: &str,
    price_id: &str,
    occurred_at: i64,
) -> Option<crate::durable_effects::Action> {
    let mut payload = Map::new();
    insert_optional(&mut payload, "customerId", non_empty(customer_id));
    insert_optional(&mut payload, "subscriptionRef", non_empty(subscription_id));
    insert_optional(&mut payload, "priceId", non_empty(price_id));
    payload.insert("rail".into(), Value::String("stripe".to_string()));
    payload.insert("flow".into(), Value::String("subscription".to_string()));
    payload_action(
        ids::CRM_EVENT_SUBSCRIPTION_RENEWED,
        event_id,
        occurred_at,
        payload,
    )
}

pub(crate) fn credit_purchase_action(
    customer_id: &str,
    amount_cents: i64,
    currency: &str,
    source_ref: &str,
    reason: Option<&str>,
    occurred_at: i64,
) -> Option<crate::durable_effects::Action> {
    let mut payload = Map::new();
    insert_optional(&mut payload, "customerId", non_empty(customer_id));
    payload.insert("amountCents".into(), Value::from(amount_cents.max(0)));
    payload.insert("currency".into(), Value::String(currency.to_string()));
    payload.insert("rail".into(), Value::String("credits".to_string()));
    payload.insert("flow".into(), Value::String("credit-purchase".to_string()));
    insert_optional(&mut payload, "orderReference", non_empty(source_ref));
    insert_optional(&mut payload, "sourceRef", non_empty(source_ref));
    insert_optional(&mut payload, "reason", reason.and_then(non_empty));
    payload_action(
        ids::CRM_EVENT_CREDIT_PURCHASE,
        &format!("credit.purchase:{source_ref}"),
        occurred_at,
        payload,
    )
}

/// Build a support-safe dispute or chargeback CRM source event.
///
/// The payload is filtered to deterministic identity, purchase refs, and the
/// redacted dispute fields Data accepts; raw wallet, card, bank, and evidence
/// fields are not forwarded.
pub(crate) fn dispute_action(
    event_type: &str,
    event_id: &str,
    occurred_at: i64,
    mut payload: Map<String, Value>,
) -> Option<crate::durable_effects::Action> {
    if !is_dispute_or_chargeback_event(event_type) {
        return None;
    }
    payload.retain(|key, _| is_safe_crm_dispute_key(key));
    payload_action(event_type, event_id, occurred_at, payload)
}

struct PurchaseContext<'a> {
    rail: &'a str,
    amount_cents: i64,
    currency: &'a str,
    occurred_at: i64,
    flow: &'a str,
    order_reference: Option<&'a str>,
    cause_code: Option<&'a str>,
}

fn purchase_action(
    event_type: &str,
    event_id: &str,
    object: &Value,
    ctx: PurchaseContext<'_>,
) -> Option<crate::durable_effects::Action> {
    let mut payload = deterministic_identity(object)?;
    payload.insert("eventId".into(), Value::String(event_id.to_string()));
    payload.insert("eventType".into(), Value::String(event_type.to_string()));
    payload.insert("amountCents".into(), Value::from(ctx.amount_cents.max(0)));
    payload.insert("currency".into(), Value::String(ctx.currency.to_string()));
    payload.insert("rail".into(), Value::String(ctx.rail.to_string()));
    payload.insert("flow".into(), Value::String(ctx.flow.to_string()));
    insert_optional(&mut payload, "orderReference", ctx.order_reference);
    insert_optional(&mut payload, "productId", meta(object, "productId"));
    insert_optional(&mut payload, "routePath", meta(object, "routePath"));
    insert_optional(&mut payload, "pagePath", meta(object, "pagePath"));
    insert_optional(&mut payload, "paymentIntentRef", object_str(object, "id"));
    insert_optional(&mut payload, "sessionRef", meta(object, "sessionId"));
    insert_optional(
        &mut payload,
        "subscriptionRef",
        object_str(object, "subscription"),
    );
    insert_optional(&mut payload, "invoiceRef", object_str(object, "invoice"));
    insert_optional(&mut payload, "receiptUrl", receipt_url(object));
    insert_optional(&mut payload, "causeCode", ctx.cause_code);
    if event_type == ids::CRM_EVENT_REFUND_SETTLED {
        let refund_ref = object_str(object, "id").unwrap_or(event_id);
        payload.insert("refundRef".into(), Value::String(refund_ref.to_string()));
    }

    payload_action(event_type, event_id, ctx.occurred_at, payload)
}

fn payload_action(
    event_type: &str,
    event_id: &str,
    occurred_at: i64,
    mut payload: Map<String, Value>,
) -> Option<crate::durable_effects::Action> {
    if !has_deterministic_identity(&payload) {
        return None;
    }
    payload.insert("eventId".into(), Value::String(event_id.to_string()));
    payload.insert("eventType".into(), Value::String(event_type.to_string()));
    payload.insert(
        "occurredAt".into(),
        Value::String(time::iso8601(occurred_at)),
    );
    Some(crate::durable_effects::crm(
        event_type,
        Value::Object(payload),
    ))
}

fn has_deterministic_identity(payload: &Map<String, Value>) -> bool {
    [
        "customerId",
        "cedrosLoginUserId",
        "email",
        "phone",
        "walletAddressHash",
    ]
    .iter()
    .any(|key| {
        payload
            .get(*key)
            .and_then(Value::as_str)
            .map(|value| !value.trim().is_empty())
            .unwrap_or(false)
    })
}

fn deterministic_identity(object: &Value) -> Option<Map<String, Value>> {
    let mut payload = Map::new();
    insert_optional(&mut payload, "customerId", meta(object, "customerId"));
    insert_optional(
        &mut payload,
        "cedrosLoginUserId",
        meta(object, "cedrosLoginUserId").or_else(|| meta(object, "userId")),
    );
    insert_optional(&mut payload, "email", meta(object, "email"));
    insert_optional(&mut payload, "phone", meta(object, "phone"));
    insert_optional(
        &mut payload,
        "walletAddressHash",
        meta(object, "walletAddressHash"),
    );
    (!payload.is_empty()).then_some(payload)
}

fn meta<'a>(object: &'a Value, key: &str) -> Option<&'a str> {
    object
        .get("metadata")
        .and_then(Value::as_object)
        .and_then(|m| m.get(key))
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
}

fn object_str<'a>(object: &'a Value, key: &str) -> Option<&'a str> {
    object
        .get(key)
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
}

fn receipt_url(object: &Value) -> Option<&str> {
    object
        .pointer("/charges/data/0/receipt_url")
        .and_then(Value::as_str)
        .or_else(|| {
            object
                .pointer("/latest_charge/receipt_url")
                .and_then(Value::as_str)
        })
}

fn invoice_meta<'a>(object: &'a Value, key: &str) -> Option<&'a str> {
    object
        .pointer(&format!("/subscription_details/metadata/{key}"))
        .and_then(Value::as_str)
        .or_else(|| {
            object
                .pointer(&format!("/parent/subscription_details/metadata/{key}"))
                .and_then(Value::as_str)
        })
        .or_else(|| meta(object, key))
        .filter(|value| !value.trim().is_empty())
}

fn invoice_subscription_id(object: &Value) -> Option<&str> {
    object_str(object, "subscription").or_else(|| {
        object
            .pointer("/parent/subscription_details/subscription")
            .and_then(Value::as_str)
            .filter(|value| !value.trim().is_empty())
    })
}

fn invoice_price_id(object: &Value) -> Option<&str> {
    object
        .pointer("/lines/data/0/price/id")
        .and_then(Value::as_str)
        .or_else(|| {
            object
                .pointer("/lines/data/0/pricing/price_details/price")
                .and_then(Value::as_str)
        })
        .or_else(|| invoice_meta(object, "priceId"))
        .filter(|value| !value.trim().is_empty())
}

pub(crate) fn invoice_amount_cents(object: &Value) -> Option<i64> {
    ["amount_paid", "amount_due", "total"]
        .iter()
        .find_map(|key| object.get(*key).and_then(Value::as_i64))
}

pub(crate) fn invoice_currency(object: &Value) -> Option<&str> {
    object_str(object, "currency")
}

fn non_empty(value: &str) -> Option<&str> {
    (!value.trim().is_empty()).then_some(value)
}

fn insert_optional(payload: &mut Map<String, Value>, key: &str, value: Option<&str>) {
    if let Some(value) = value {
        payload.insert(key.to_string(), Value::String(value.to_string()));
    }
}

fn is_dispute_or_chargeback_event(event_type: &str) -> bool {
    [
        ids::CRM_EVENT_CHARGEBACK_OPENED,
        ids::CRM_EVENT_DISPUTE_OPENED,
        ids::CRM_EVENT_DISPUTE_UPDATED,
        ids::CRM_EVENT_DISPUTE_CLOSED,
    ]
    .contains(&event_type)
}

fn is_safe_crm_dispute_key(key: &str) -> bool {
    matches!(
        key,
        "customerId"
            | "cedrosLoginUserId"
            | "email"
            | "phone"
            | "walletAddressHash"
            | "amountCents"
            | "currency"
            | "productId"
            | "productName"
            | "productSlug"
            | "routePath"
            | "pagePath"
            | "rail"
            | "flow"
            | "orderReference"
            | "ledgerRef"
            | "sessionRef"
            | "subscriptionRef"
            | "invoiceRef"
            | "paymentIntentRef"
            | "receiptUrl"
            | "refundRef"
            | "failureCode"
            | "failureReasonCode"
            | "causeCode"
            | "originalEventRef"
            | "originalEventId"
            | "redactedProviderCustomerRef"
            | "disputeId"
            | "chargebackId"
            | "disputeStatus"
            | "disputeReason"
            | "disputedAmountCents"
            | "disputedCurrency"
            | "evidenceDueAt"
            | "resolvedAt"
    )
}

#[cfg(test)]
#[path = "crm_events_tests.rs"]
mod crm_events_tests;
