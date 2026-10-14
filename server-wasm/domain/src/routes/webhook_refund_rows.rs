use super::*;

pub(super) struct ChangedRefundRow<'a> {
    pub(super) refund_key: &'a str,
    pub(super) refund_id: &'a str,
    pub(super) reference: &'a str,
    pub(super) amount: i64,
    pub(super) currency: &'a str,
    pub(super) status: &'a str,
    pub(super) event_created: i64,
    pub(super) now: i64,
}

pub(super) fn changed_refund_row(object: &Value, row: ChangedRefundRow<'_>) -> Value {
    let ChangedRefundRow {
        refund_key,
        refund_id,
        reference,
        amount,
        currency,
        status,
        event_created,
        now,
    } = row;
    json!({
        "reference": refund_key,
        "kind": "refund",
        "status": status,
        "grossCents": amount,
        "refundCents": if status == "succeeded" { amount } else { 0 },
        "currency": currency,
        "provider": "stripe",
        "providerRef": refund_id,
        "chargeId": object_str(object, "charge"),
        "paymentIntentId": object_str(object, "payment_intent"),
        "reason": object_str(object, "reason"),
        "originalReference": reference,
        "providerEventCreated": event_created,
        "createdAt": object.get("created").and_then(Value::as_i64).map(time::iso8601)
            .unwrap_or_else(|| time::iso8601(now)),
        "processedAt": time::iso8601(now),
    })
}
