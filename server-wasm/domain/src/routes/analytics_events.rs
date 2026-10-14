//! Centralized builders for analytics delivered through the durable domain
//! effect outbox.
//!
//! Every payment rail and flow reports through these helpers so the emitted
//! payload stays redacted (operator-aggregate; never a buyer identifier, wallet
//! address, provider id, or raw error) and schema-consistent with
//! `cedros-extension.analytics.json`. `payment_rail`/`flow` are parameters — they
//! were previously hardcoded `"stripe"`/`"checkout"` at the three webhook sites,
//! which hid every non-Stripe and non-checkout payment from analytics.
//!
//! Callers append these actions atomically with the financial transition. The
//! delivery worker retries host failures with a stable downstream identity, so
//! telemetry cannot unwind money state or disappear after a process crash.

use serde_json::{json, Map, Value};

use crate::ids;
use crate::time;

/// `payment-succeeded` — a checkout, subscription invoice, or credit purchase
/// completed. `payment_rail` ∈ {stripe,x402,credits,native-store,unknown};
/// `flow` ∈ {checkout,subscription,credit-purchase}.
pub(crate) fn payment_succeeded_action(
    payment_rail: &str,
    flow: &str,
    amount_cents: i64,
    currency: &str,
    now: i64,
) -> crate::durable_effects::Action {
    crate::durable_effects::event(
        ids::EVENT_PAYMENT_SUCCEEDED,
        "Payment succeeded",
        payment_succeeded_payload(payment_rail, flow, amount_cents, currency, now),
    )
}

fn payment_succeeded_payload(
    payment_rail: &str,
    flow: &str,
    amount_cents: i64,
    currency: &str,
    now: i64,
) -> Value {
    json!({
        "payment_rail": payment_rail,
        "flow": flow,
        "amount_cents": amount_cents,
        "currency": currency,
        "occurred_at": time::iso8601(now),
    })
}

/// `payment-failed` — a payment attempt failed with an already-redacted cause
/// code (never a raw downstream error string).
pub(crate) fn payment_failed_action(
    payment_rail: &str,
    flow: &str,
    amount_cents: i64,
    currency: &str,
    cause_code: &str,
    now: i64,
) -> crate::durable_effects::Action {
    crate::durable_effects::event(
        ids::EVENT_PAYMENT_FAILED,
        "Payment failed",
        json!({
            "payment_rail": payment_rail,
            "flow": flow,
            "amount_cents": amount_cents,
            "currency": currency,
            "cause_code": cause_code,
            "occurred_at": time::iso8601(now),
        }),
    )
}

/// `refund-settled` — a refund committed against a prior charge or invoice.
pub(crate) fn refund_settled_action(
    payment_rail: &str,
    flow: &str,
    amount_cents: i64,
    currency: &str,
    now: i64,
) -> crate::durable_effects::Action {
    crate::durable_effects::event(
        ids::EVENT_REFUND_SETTLED,
        "Refund settled",
        json!({
            "payment_rail": payment_rail,
            "flow": flow,
            "amount_cents": amount_cents,
            "currency": currency,
            "occurred_at": time::iso8601(now),
        }),
    )
}

/// `subscription-started` — a buyer began a recurring subscription. `price_id`
/// is a catalog/plan identifier (not buyer PII) and is omitted when empty.
pub(crate) fn subscription_started_action(
    payment_rail: &str,
    price_id: &str,
    status: &str,
    now: i64,
) -> crate::durable_effects::Action {
    crate::durable_effects::event(
        ids::EVENT_SUBSCRIPTION_STARTED,
        "Subscription started",
        subscription_payload(payment_rail, price_id, status, now),
    )
}

/// `subscription-canceled` — a recurring subscription was canceled (churn).
pub(crate) fn subscription_canceled_action(
    payment_rail: &str,
    price_id: &str,
    status: &str,
    now: i64,
) -> crate::durable_effects::Action {
    crate::durable_effects::event(
        ids::EVENT_SUBSCRIPTION_CANCELED,
        "Subscription canceled",
        subscription_payload(payment_rail, price_id, status, now),
    )
}

/// `dispute-opened` — a dispute or chargeback was opened against a charge.
/// Admin-scope risk signal: only a coarse `dispute_kind` and `amount_bucket`,
/// never the buyer, dispute id, or free-text reason.
pub(crate) fn dispute_opened_action(
    dispute_kind: &str,
    amount_cents: Option<i64>,
    now: i64,
) -> crate::durable_effects::Action {
    crate::durable_effects::event(
        ids::EVENT_DISPUTE_OPENED,
        "Dispute opened",
        json!({
            "payment_rail": "stripe",
            "flow": "dispute",
            "dispute_kind": dispute_kind,
            "amount_bucket": amount_bucket(amount_cents),
            "occurred_at": time::iso8601(now),
        }),
    )
}

fn subscription_payload(payment_rail: &str, price_id: &str, status: &str, now: i64) -> Value {
    let mut payload = Map::new();
    payload.insert(
        "payment_rail".into(),
        Value::String(payment_rail.to_string()),
    );
    payload.insert("flow".into(), Value::String("subscription".to_string()));
    if !price_id.trim().is_empty() {
        payload.insert("price_id".into(), Value::String(price_id.to_string()));
    }
    if !status.trim().is_empty() {
        payload.insert("status".into(), Value::String(status.to_string()));
    }
    payload.insert("occurred_at".into(), Value::String(time::iso8601(now)));
    Value::Object(payload)
}

/// Coarse, identifier-free amount banding shared by the public analytics schema.
fn amount_bucket(amount_cents: Option<i64>) -> &'static str {
    match amount_cents {
        None => "unknown",
        Some(c) if c <= 0 => "zero",
        Some(c) if c < 5_000 => "low",
        Some(c) if c < 50_000 => "medium",
        Some(_) => "high",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn event(action: crate::durable_effects::Action) -> (String, String, Value) {
        let crate::durable_effects::Action::Event {
            event_id,
            label,
            metadata,
        } = action
        else {
            panic!("analytics action must be an event")
        };
        (event_id, label, metadata)
    }

    #[test]
    fn payment_succeeded_emits_redacted_aggregate_payload() {
        let (event_id, label, payload) = event(payment_succeeded_action(
            "credits",
            "credit-purchase",
            2500,
            "USD",
            1_700_000_000,
        ));
        assert_eq!(event_id, ids::EVENT_PAYMENT_SUCCEEDED);
        assert_eq!(label, "Payment succeeded");
        assert_eq!(payload["payment_rail"], "credits");
        assert_eq!(payload["flow"], "credit-purchase");
        assert_eq!(payload["amount_cents"], 2500);
        assert_eq!(payload["currency"], "USD");
        assert!(payload["occurred_at"].as_str().is_some());
    }

    #[test]
    fn subscription_started_omits_empty_price_id() {
        let (_, _, payload) = event(subscription_started_action(
            "stripe",
            "",
            "active",
            1_700_000_000,
        ));
        assert_eq!(payload["flow"], "subscription");
        assert_eq!(payload["status"], "active");
        assert!(payload.get("price_id").is_none());
    }

    #[test]
    fn dispute_opened_buckets_amount_without_identifiers() {
        let (_, _, payload) = event(dispute_opened_action(
            "chargeback",
            Some(12_000),
            1_700_000_000,
        ));
        assert_eq!(payload["dispute_kind"], "chargeback");
        assert_eq!(payload["amount_bucket"], "medium");
        assert_eq!(payload["flow"], "dispute");
    }

    #[test]
    fn amount_bucket_bands() {
        assert_eq!(amount_bucket(None), "unknown");
        assert_eq!(amount_bucket(Some(0)), "zero");
        assert_eq!(amount_bucket(Some(4_999)), "low");
        assert_eq!(amount_bucket(Some(5_000)), "medium");
        assert_eq!(amount_bucket(Some(50_000)), "high");
    }
}
