use serde_json::{json, Map, Value};

use crate::seams::{HostError, HostSeams};

use super::settlement_effect_record::{EffectTarget, SettlementEffectRecord, TargetKind};
use super::PaymentMethod;

pub(super) fn deliver<S: HostSeams>(
    seams: &S,
    effect: &SettlementEffectRecord,
    target: &EffectTarget,
) -> Result<(), &'static str> {
    let result = match target.kind {
        TargetKind::PaymentAnalytics => analytics(seams, effect, target),
        TargetKind::CheckoutSettled => checkout_settled(seams, effect, target),
        TargetKind::Entitlement => entitlement(seams, effect, target),
        TargetKind::CrmPurchase => crm(seams, effect, target),
    };
    result.map_err(|_| error_code(&target.kind))
}

fn analytics<S: HostSeams>(
    seams: &S,
    effect: &SettlementEffectRecord,
    target: &EffectTarget,
) -> Result<(), HostError> {
    seams.emit_event(
        crate::ids::EVENT_PAYMENT_SUCCEEDED,
        "Payment succeeded",
        &json!({
            "payment_rail": rail(effect.rail),
            "flow": "checkout",
            "amount_cents": effect.amount_cents,
            "currency": effect.currency,
            "occurred_at": effect.created_at,
            "idempotency_key": target.id,
        })
        .to_string(),
    )
}

fn checkout_settled<S: HostSeams>(
    seams: &S,
    effect: &SettlementEffectRecord,
    target: &EffectTarget,
) -> Result<(), HostError> {
    seams.emit_event(
        crate::ids::EVENT_CHECKOUT_SETTLED,
        "Checkout settled",
        &json!({
            "payment_rail": rail(effect.rail),
            "flow": "checkout",
            "amount_cents": effect.amount_cents,
            "currency": effect.currency,
            "occurred_at": effect.created_at,
            "settlementStatus": "settled",
            "paymentReference": effect.operation_id,
            "externalReferenceId": effect.quote_operation_id,
            "idempotencyKey": target.id,
        })
        .to_string(),
    )
}

fn entitlement<S: HostSeams>(
    seams: &S,
    effect: &SettlementEffectRecord,
    target: &EffectTarget,
) -> Result<(), HostError> {
    let mut payload = Map::new();
    payload.insert("reason".into(), Value::String("purchase_completed".into()));
    insert(&mut payload, "userId", effect.subject_ref.as_deref());
    insert(&mut payload, "productId", target.product_id.as_deref());
    insert(&mut payload, "entitlementId", Some(&effect.operation_id));
    insert(&mut payload, "sourceRef", Some(&target.id));
    payload.insert(
        "occurredAt".into(),
        Value::String(effect.created_at.clone()),
    );
    seams.emit_event(
        crate::ids::EVENT_ENTITLEMENT_CHANGED,
        "Entitlement changed",
        &Value::Object(payload).to_string(),
    )
}

fn crm<S: HostSeams>(
    seams: &S,
    effect: &SettlementEffectRecord,
    target: &EffectTarget,
) -> Result<(), HostError> {
    let subject = effect
        .subject_ref
        .as_deref()
        .ok_or_else(|| HostError::new("trusted subject missing"))?;
    let mut payload = Map::new();
    payload.insert("eventId".into(), Value::String(target.id.clone()));
    payload.insert(
        "eventType".into(),
        Value::String(crate::ids::CRM_EVENT_PURCHASE_COMPLETED.into()),
    );
    payload.insert("cedrosLoginUserId".into(), Value::String(subject.into()));
    payload.insert("amountCents".into(), Value::from(effect.amount_cents));
    payload.insert("currency".into(), Value::String(effect.currency.clone()));
    payload.insert("rail".into(), Value::String(rail(effect.rail).into()));
    payload.insert("flow".into(), Value::String("checkout".into()));
    payload.insert(
        "orderReference".into(),
        Value::String(effect.operation_id.clone()),
    );
    if let Some(product) = first_product(effect) {
        payload.insert("productId".into(), Value::String(product.into()));
    }
    payload.insert(
        "occurredAt".into(),
        Value::String(effect.created_at.clone()),
    );
    seams.crm_submit(
        crate::ids::CRM_SOURCE_ACCESS,
        crate::ids::CRM_SOURCE_KIND,
        crate::ids::CRM_EVENT_PURCHASE_COMPLETED,
        &Value::Object(payload).to_string(),
    )
}

fn first_product(effect: &SettlementEffectRecord) -> Option<&str> {
    effect
        .targets
        .iter()
        .find_map(|target| target.product_id.as_deref())
}

fn insert(payload: &mut Map<String, Value>, key: &str, value: Option<&str>) {
    if let Some(value) = value.filter(|value| !value.is_empty()) {
        payload.insert(key.into(), Value::String(value.into()));
    }
}

fn rail(method: PaymentMethod) -> &'static str {
    match method {
        PaymentMethod::Stripe => "stripe",
        PaymentMethod::X402 => "x402",
        PaymentMethod::Credits => "credits",
    }
}

fn error_code(kind: &TargetKind) -> &'static str {
    match kind {
        TargetKind::PaymentAnalytics => "analytics_delivery_failed",
        TargetKind::CheckoutSettled => "settlement_delivery_failed",
        TargetKind::Entitlement => "entitlement_delivery_failed",
        TargetKind::CrmPurchase => "crm_delivery_failed",
    }
}
