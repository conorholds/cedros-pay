use sha2::{Digest, Sha256};

use super::*;
use crate::models::LedgerEntry;

pub(crate) fn invoice_paid<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    event_id: &str,
    fingerprint: &str,
    object: &Value,
    now: i64,
) -> AppResult<CommitResult> {
    let Some(subscription_id) = invoice_subscription_id(object) else {
        return webhook_commit::commit(db, event_id, fingerprint, now, vec![], vec![]);
    };
    let projection = prepare(seams, db, subscription_id, object, now)?;
    let mut actions = Vec::new();
    if projection.should_submit {
        if let Some(action) = crm_events::subscription_renewed_action(event_id, object, now) {
            actions.push(action);
        }
    }
    if let Some((amount, currency)) = &projection.payment_effect {
        actions.push(analytics_events::payment_succeeded_action(
            "stripe",
            "subscription",
            *amount,
            currency,
            now,
        ));
    }
    webhook_commit::commit_with_effects(
        db,
        event_id,
        fingerprint,
        now,
        projection.conditions,
        projection.ops,
        actions,
    )
}

struct InvoiceProjection {
    conditions: Vec<GuardedCondition>,
    ops: Vec<BatchOp>,
    should_submit: bool,
    payment_effect: Option<(i64, String)>,
}

fn prepare<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    subscription_id: &str,
    object: &Value,
    now: i64,
) -> AppResult<InvoiceProjection> {
    let mut projection = InvoiceProjection {
        conditions: Vec::new(),
        ops: Vec::new(),
        should_submit: false,
        payment_effect: None,
    };
    let Some(row) = db.read_one(ids::MODEL_SUBSCRIPTIONS, subscription_id)? else {
        let metadata = object
            .pointer("/subscription_details/metadata")
            .or_else(|| object.pointer("/parent/subscription_details/metadata"));
        if metadata.is_some_and(|m| {
            m["user_id_trusted"] == "true" || m["cedros_pay_operation"].as_str().is_some()
        }) {
            return Err(AppError::conflict(
                "Pay subscription projection is not available yet; retry invoice",
            ));
        }
        return Ok(projection);
    };
    let record: SubscriptionRecord = row.parse()?;
    if record.provider != "stripe"
        || record.subscription_id != subscription_id
        || record.provider_ref.as_deref() != Some(subscription_id)
        || object
            .get("customer")
            .and_then(provider_id_value)
            .is_none_or(|customer| {
                !crate::stripe::api::valid_customer_id(customer)
                    || (crate::stripe::api::valid_customer_id(record.stripe_customer())
                        && customer != record.stripe_customer())
            })
    {
        return Err(AppError::conflict(
            "Stripe invoice does not match the subscription owner",
        ));
    }
    let invoice = append_invoice_payment(
        seams,
        db,
        &mut projection.conditions,
        &mut projection.ops,
        object,
        &record,
        now,
    )?;
    // The invoice identity is the economic event. A new Stripe Event carrying
    // the same invoice must not replay an older paid state over a later
    // past-due/canceled provider projection.
    if !invoice.is_new {
        return Ok(projection);
    }
    projection.should_submit = invoice_billing_reason(object) == Some("subscription_cycle");
    projection.payment_effect = invoice.payment;
    // An invoice proves a payment, not the subscription's current status or
    // entitlement period. Old invoices can be paid after a pause, plan change,
    // or failed renewal. Lifecycle events and provider reconciliation own access.
    Ok(projection)
}

struct InvoiceIdentity {
    is_new: bool,
    payment: Option<(i64, String)>,
}

fn append_invoice_payment<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    conditions: &mut Vec<GuardedCondition>,
    ops: &mut Vec<BatchOp>,
    object: &Value,
    subscription: &SubscriptionRecord,
    now: i64,
) -> AppResult<InvoiceIdentity> {
    let invoice_id = object_str(object, "id")
        .filter(|id| valid_provider_id(id, "in_"))
        .ok_or_else(|| AppError::forbidden("Stripe invoice identity is missing or invalid"))?;
    let amount = object
        .get("amount_paid")
        .and_then(Value::as_i64)
        .filter(|amount| *amount >= 0)
        .ok_or_else(|| AppError::forbidden("Stripe invoice amount is missing or invalid"))?;
    let currency = super::super::webhook_payment_support::required_currency(object)?;
    if object.get("status").and_then(Value::as_str) != Some("paid")
        || object.get("paid").is_some_and(|paid| paid != true)
        || object.get("amount_remaining").and_then(Value::as_i64) != Some(0)
    {
        return Err(AppError::forbidden("Stripe invoice is not fully paid"));
    }
    let invoice_marker_key = format!(
        "provider-invoice:stripe:{}",
        hex::encode(Sha256::digest(invoice_id.as_bytes()))
    );
    let invoice_marker = serde_json::json!({
        "schemaVersion": 1,
        "kind": "providerInvoiceIdentity",
        "provider": "stripe",
        "invoiceId": invoice_id,
        "subscriptionId": subscription.subscription_id,
        "amountPaidCents": amount,
        "currency": currency.clone(),
    });
    let marker_exists =
        if let Some(row) = db.read_one(ids::MODEL_WEBHOOK_OUTBOX, &invoice_marker_key)? {
            if row.payload != invoice_marker {
                return Err(AppError::conflict(
                    "Stripe invoice identity is already bound to different facts",
                ));
            }
            true
        } else {
            conditions.push(GuardedCondition::Absent {
                content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
                entry_key: invoice_marker_key.clone(),
            });
            ops.push(BatchOp::Write {
                content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
                entry_key: invoice_marker_key,
                data: invoice_marker,
            });
            false
        };
    if amount == 0 {
        return Ok(InvoiceIdentity {
            is_new: !marker_exists,
            payment: None,
        });
    }
    let payment_intent = invoice_payment_intent(object)
        .filter(|id| valid_provider_id(id, "pi_"))
        .ok_or_else(|| AppError::forbidden("Stripe invoice payment identity is missing"))?;
    let expected = LedgerEntry {
        reference: invoice_id.to_string(),
        kind: "payment".to_string(),
        status: "succeeded".to_string(),
        gross_cents: amount,
        refund_cents: 0,
        currency: currency.clone(),
        customer_profile_id: Some(subscription.customer_ref.clone()),
        route_path: Some("subscription".to_string()),
        product_id: Some(subscription.price_id.clone()),
        product_ids: Vec::new(),
        provider: "stripe".to_string(),
        provider_ref: Some(payment_intent.to_string()),
        payer_wallet: None,
        created_at: object
            .get("created")
            .and_then(Value::as_i64)
            .map(time::iso8601)
            .unwrap_or_else(|| time::iso8601(now)),
        processed_at: time::iso8601(now),
        token_settlement: None,
    };
    if let Some(row) = db.read_one(ids::MODEL_LEDGER, invoice_id)? {
        let existing: LedgerEntry = row.parse()?;
        if existing.reference != expected.reference
            || existing.kind != expected.kind
            || !matches!(existing.status.as_str(), "succeeded" | "refunded")
            || existing.gross_cents != expected.gross_cents
            || existing.refund_cents < 0
            || existing.refund_cents > existing.gross_cents
            || existing.currency != expected.currency
            || existing.provider != expected.provider
            || existing.provider_ref != expected.provider_ref
            || existing.customer_profile_id != expected.customer_profile_id
        {
            return Err(AppError::conflict(
                "Stripe invoice identity is already bound to different ledger facts",
            ));
        }
        return Ok(InvoiceIdentity {
            is_new: false,
            payment: Some((amount, currency)),
        });
    }
    if marker_exists {
        return Err(AppError::conflict(
            "Stripe invoice marker exists without its ledger payment",
        ));
    }
    verify_payment(seams, object, payment_intent, amount, &currency)?;
    let identity = super::super::webhook_payment_support::provider_payment_identity(
        db,
        payment_intent,
        invoice_id,
        amount,
        &currency,
    )?;
    conditions.extend(identity.conditions);
    ops.extend(identity.ops);
    conditions.push(GuardedCondition::Absent {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: invoice_id.to_string(),
    });
    ops.push(subscription_write_to_ledger(invoice_id, &expected)?);
    Ok(InvoiceIdentity {
        is_new: true,
        payment: Some((amount, currency)),
    })
}

fn subscription_write_to_ledger(key: &str, entry: &LedgerEntry) -> AppResult<BatchOp> {
    Ok(BatchOp::Write {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: key.to_string(),
        data: serde_json::to_value(entry).map_err(|error| {
            AppError::internal("cannot encode subscription invoice ledger entry")
                .with_internal(error.to_string())
        })?,
    })
}

fn invoice_payment_intent(object: &Value) -> Option<&str> {
    if let Some(intent) = object.get("payment_intent").and_then(provider_id_value) {
        return Some(intent);
    }
    // Multiple/partially listed invoice payments cannot be attributed to the
    // first intent. This adapter supports exactly one fully allocated payment.
    let payments = object.get("payments")?;
    let rows = payments.get("data")?.as_array()?;
    if payments.get("has_more")?.as_bool()?
        || rows.len() != 1
        || rows[0].get("status")?.as_str()? != "paid"
        || rows[0].get("amount_paid")? != object.get("amount_paid")?
        || rows[0].get("invoice").and_then(provider_id_value)? != object.get("id")?.as_str()?
        || rows[0].get("currency")? != object.get("currency")?
        || rows[0].pointer("/payment/type")?.as_str()? != "payment_intent"
    {
        return None;
    }
    rows[0]
        .pointer("/payment/payment_intent")
        .and_then(provider_id_value)
}

fn verify_payment<S: HostSeams>(
    seams: &S,
    invoice: &Value,
    id: &str,
    amount: i64,
    currency: &str,
) -> AppResult<()> {
    if invoice
        .get("paid_out_of_band")
        .is_some_and(|paid| paid != false)
    {
        return Err(AppError::conflict(
            "invoice has no verified Stripe settlement",
        ));
    }
    let key = seams
        .secret_get(ids::SECRET_STRIPE_KEY)?
        .filter(|key| !key.is_empty())
        .ok_or_else(|| {
            AppError::new(
                503,
                "service_unavailable",
                "Stripe settlement verification is unavailable",
            )
        })?;
    let request = crate::stripe::api::build_retrieve_payment_intent_fetch(&key, id);
    let raw = seams.http_fetch(&request.to_string())?;
    let (status, body) = crate::stripe::api::unwrap_fetch(&raw).map_err(|_| {
        AppError::new(
            503,
            "service_unavailable",
            "Stripe settlement verification failed",
        )
    })?;
    let payment: Value = serde_json::from_str(&body).map_err(|_| {
        AppError::new(
            503,
            "service_unavailable",
            "Stripe settlement verification failed",
        )
    })?;
    if status != 200
        || payment["id"] != id
        || payment["status"] != "succeeded"
        || payment["amount"].as_i64() != Some(amount)
        || payment["amount_received"].as_i64() != Some(amount)
        || payment["currency"]
            .as_str()
            .map(str::to_ascii_uppercase)
            .as_deref()
            != Some(currency)
        || payment["customer"] != invoice["customer"]
    {
        return Err(AppError::conflict(
            "Stripe invoice settlement does not match payment",
        ));
    }
    Ok(())
}

fn provider_id_value(value: &Value) -> Option<&str> {
    value
        .as_str()
        .or_else(|| value.get("id").and_then(Value::as_str))
}

fn valid_provider_id(value: &str, prefix: &str) -> bool {
    value.starts_with(prefix)
        && value.len() > prefix.len()
        && value.len() <= 255
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-'))
}

fn invoice_subscription_id(object: &Value) -> Option<&str> {
    object_str(object, "subscription").or_else(|| {
        object
            .pointer("/parent/subscription_details/subscription")
            .and_then(Value::as_str)
            .filter(|value| !value.trim().is_empty())
    })
}

fn invoice_billing_reason(object: &Value) -> Option<&str> {
    object_str(object, "billing_reason")
}
