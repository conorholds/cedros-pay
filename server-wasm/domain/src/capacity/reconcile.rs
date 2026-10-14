//! Durable recovery driven by the existing subscription-sync schedule. No live
//! buyer session is needed after Data has recorded acceptance.
use super::{access, billing, config, grants, purchase, store, wire};
use crate::{
    db::{Db, Dir, Filter, Op, Query},
    error::AppResult,
    ids,
    seams::HostSeams,
    time,
};
use serde_json::{json, Value};
use std::collections::BTreeSet;
pub fn run<S: HostSeams>(s: &S) -> AppResult<()> {
    run_with_budget(s, &crate::work_budget::WorkBudget::new(s))
}
pub(crate) fn run_with_budget<S: HostSeams>(
    s: &S,
    budget: &crate::work_budget::WorkBudget,
) -> AppResult<()> {
    let now = s.now_unix_secs();
    let q = Query::new()
        .filter(Filter::new("capacityRecordType", Op::Eq, "purchase"))
        .order("data.reconcileAfter", Dir::Asc)
        .limit(10);
    let rows = Db::new(s, ids::DB_ACCESS).read(store::MODEL, &q)?;
    if rows.is_empty() {
        return Ok(());
    }
    let mut attempted_hints = BTreeSet::new();
    // Retry committed notifications before provider work can exhaust the budget.
    // A Data outage must still allow financial recovery to proceed.
    let mut failed = deliver_hints(s, budget, &mut attempted_hints).is_err();
    for row in rows {
        if budget.exhausted(s, 270) {
            return Err(wire::unavailable());
        }
        if wire::stamp(&row.payload["data"], "reconcileAfter")? > now {
            continue;
        }
        let result = recover(s, &row, budget);
        // Rotate even failed records so an outage for one organization cannot
        // starve other purchases. Their persisted state remains retryable.
        let current = purchase::read(s, wire::text(&row.payload["data"], "purchaseId")?)?;
        let mut value = current.payload.clone();
        value["data"]["reconcileAfter"] = time::iso8601(now + 60).into();
        if !store::commit(
            s,
            &[store::condition(&current.entry_key, Some(&current))],
            &[store::write(&current.entry_key, value)],
        )? {
            failed = true;
        }
        if result.is_err() {
            failed = true;
        }
    }
    // Newly committed revisions can be delivered immediately; failed older
    // revisions are retained for the next run instead of retried in a tight loop.
    failed |= deliver_hints(s, budget, &mut attempted_hints).is_err();
    if failed {
        Err(wire::unavailable())
    } else {
        Ok(())
    }
}
fn deliver_hints<S: HostSeams>(
    s: &S,
    budget: &crate::work_budget::WorkBudget,
    attempted: &mut BTreeSet<String>,
) -> AppResult<()> {
    let mut failed = false;
    for row in store::list(s, "scope", None)? {
        if budget.exhausted(s, 270) {
            return Err(wire::unavailable());
        }
        let revision = wire::number(&row.payload, "sourceRevision")?;
        if row.payload["hintDeliveredRevision"].as_u64() == Some(revision) {
            continue;
        }
        let scope = &row.payload["capacityScope"];
        let command = json!({"eventId":store::key("hint",&json!([scope,revision]))?,"payInstallationId":scope["payInstallationId"],"environment":scope["environment"],"organizationId":scope["organizationId"],"sourceRevision":revision});
        // One attempt per source revision per invocation, including failures.
        if !attempted.insert(wire::text(&command, "eventId")?.to_string()) {
            continue;
        }
        match access::invoke(
            s,
            "capacity.grants.changed",
            &Value::Null,
            &command["eventId"],
            command.clone(),
        ) {
            Ok(out) if out["eventId"] == command["eventId"] => {
                let mut value = row.payload.clone();
                value["hintDeliveredRevision"] = revision.into();
                if !store::commit(
                    s,
                    &[store::condition(&row.entry_key, Some(&row))],
                    &[store::write(&row.entry_key, value)],
                )? {
                    failed = true;
                }
            }
            _ => failed = true,
        }
    }
    if failed {
        Err(wire::unavailable())
    } else {
        Ok(())
    }
}

fn recover<S: HostSeams>(
    s: &S,
    row: &crate::db::EntryRecord,
    invocation_budget: &crate::work_budget::WorkBudget,
) -> AppResult<()> {
    let id = wire::text(&row.payload["data"], "purchaseId")?;
    let p = &row.payload["data"];
    let q = &p["snapshot"]["quote"];
    let config = config::Config::load(s)?;
    if q["binding"]["payInstallationId"] != config.pay_installation_id
        || q["binding"]["environment"] != config.environment
    {
        return Err(wire::unavailable());
    }
    if p["acceptedAt"].is_null() {
        // Null delegation can only query/replay Data's existing redemption. Data
        // must reject first acceptance here; Pay never manufactures acceptedAt.
        let redeemed = access::invoke(
            s,
            "capacity.authorization.redeem",
            &Value::Null,
            &json!(id),
            json!({"authorizationId":p["authorizationId"],"quoteId":q["quoteId"],"quoteDigest":p["snapshot"]["quoteDigest"],"purchaseId":id}),
        )?;
        if redeemed["replayed"] != true {
            return Err(wire::unavailable());
        }
        purchase::confirm_redemption(s, row, &redeemed)?;
    }
    if invocation_budget.exhausted(s, 270) {
        return Err(wire::unavailable());
    }
    let row = purchase::read(s, id)?;
    billing::dispatch(s, &row)?;
    let row = purchase::read(s, id)?;
    let subscription = wire::text(&row.payload["data"], "providerSubscriptionId")?;
    if !config::provider_id(subscription, "sub_") {
        return Err(wire::unavailable());
    }
    if invocation_budget.exhausted(s, 270) {
        return Err(wire::unavailable());
    }
    refresh_service(s, &row)?;
    if invocation_budget.exhausted(s, 270) {
        return Err(wire::unavailable());
    }
    let after = match row.payload["data"]["invoiceCursor"].as_str() {
        Some(cursor) if config::provider_id(cursor, "in_") => format!("&starting_after={cursor}"),
        None => String::new(),
        _ => return Err(wire::unavailable()),
    };
    let budget = crate::work_budget::WorkBudget::new(s);
    {
        let invoices=billing::get(s,&format!("/v1/invoices?subscription={subscription}&limit=10&expand%5B%5D=data.payment_intent{after}"))?;
        let entries = invoices["data"].as_array().ok_or_else(wire::unavailable)?;
        for listed in entries {
            if budget.exhausted(s, 30) || invocation_budget.exhausted(s, 270) {
                return Err(wire::unavailable());
            }
            let current = purchase::read(s, id)?;
            let invoice_id = wire::text(listed, "id")?;
            if !config::provider_id(invoice_id, "in_") {
                return Err(wire::unavailable());
            }
            let invoice = billing::get(
                s,
                &format!("/v1/invoices/{invoice_id}?expand%5B%5D=payment_intent"),
            )?;
            if invocation_budget.exhausted(s, 270) {
                return Err(wire::unavailable());
            }
            let charge = if let Some(id) = invoice["charge"].as_str() {
                if !config::provider_id(id, "ch_") {
                    return Err(wire::unavailable());
                }
                Some(billing::get(s, &format!("/v1/charges/{id}"))?)
            } else {
                None
            };
            if invocation_budget.exhausted(s, 270) {
                return Err(wire::unavailable());
            }
            let dispute = if let Some(charge) = &charge {
                let charge_id = wire::text(charge, "id")?;
                let ds = billing::get(s, &format!("/v1/disputes?charge={charge_id}&limit=100"))?;
                let entries = ds["data"].as_array().ok_or_else(wire::unavailable)?;
                if entries.len() > 1 || ds["has_more"] != false {
                    return Err(wire::unavailable());
                }
                entries.first().cloned()
            } else {
                None
            };
            grants::invoice(s, &current, &invoice, charge.as_ref(), dispute.as_ref())?;
            let p = &current.payload["data"];
            if p["material"]["latePaymentPolicy"] == "full_refund_after_expiry"
                && invoice["paid"] == true
                && invoice["billing_reason"] == "subscription_create"
                && invoice["status_transitions"]["paid_at"]
                    .as_i64()
                    .is_some_and(|paid_at| {
                        wire::stamp(&p["snapshot"]["quote"], "paidThrough")
                            .is_ok_and(|end| paid_at >= end)
                    })
            {
                let c = charge.as_ref().ok_or_else(wire::unavailable)?;
                let refunded = wire::number(c, "amount_refunded")?;
                let total = wire::number(c, "amount")?;
                if refunded < total {
                    if invocation_budget.exhausted(s, 270) {
                        return Err(wire::unavailable());
                    }
                    let charge_id = wire::text(c, "id")?;
                    let key = store::key(
                        "late-refund",
                        &json!([p["purchaseId"], invoice["id"], refunded]),
                    )?;
                    billing::post(
                        s,
                        "/v1/refunds",
                        &key,
                        &[
                            ("charge".into(), charge_id.into()),
                            ("amount".into(), (total - refunded).to_string()),
                        ],
                    )?;
                }
            }
            let current = purchase::read(s, id)?;
            let mut next = current.payload.clone();
            next["data"]["invoiceCursor"] = invoice_id.into();
            if !store::commit(
                s,
                &[store::condition(&current.entry_key, Some(&current))],
                &[store::write(&current.entry_key, next)],
            )? {
                return Err(wire::unavailable());
            }
        }
        if invoices["has_more"] == false {
            let current = purchase::read(s, id)?;
            let mut next = current.payload.clone();
            next["data"]["invoiceCursor"] = Value::Null;
            if !store::commit(
                s,
                &[store::condition(&current.entry_key, Some(&current))],
                &[store::write(&current.entry_key, next)],
            )? {
                return Err(wire::unavailable());
            }
        } else if entries.is_empty() {
            return Err(wire::unavailable());
        }
    }
    Ok(())
}
/// Signed capacity events only mark reconciliation due. Routing them away from
/// legacy handlers prevents add-ons from being recorded as base subscriptions.
pub(crate) fn webhook<S: HostSeams>(s: &S, event: &Value) -> AppResult<bool> {
    let object = &event["data"]["object"];
    let id = object["metadata"]["capacityPurchaseId"]
        .as_str()
        .or_else(|| object["subscription_details"]["metadata"]["capacityPurchaseId"].as_str());
    let rows = if let Some(id) = id {
        vec![purchase::read(s, id)?]
    } else {
        let subscription = object["subscription"].as_str().or_else(|| {
            if object["object"] == "subscription" {
                object["id"].as_str()
            } else {
                None
            }
        });
        let Some(subscription) = subscription else {
            return Ok(false);
        };
        Db::new(s, ids::DB_ACCESS).read(
            store::MODEL,
            &Query::new()
                .filter(Filter::new("capacityRecordType", Op::Eq, "purchase"))
                .filter(Filter::new(
                    "data.providerSubscriptionId",
                    Op::Eq,
                    subscription,
                ))
                .limit(2),
        )?
    };
    if rows.is_empty() {
        return Ok(false);
    }
    if rows.len() != 1 {
        return Err(wire::unavailable());
    }
    let row = &rows[0];
    let event_id = wire::text(event, "id")?;
    use sha2::{Digest, Sha256};
    let fingerprint = hex::encode(Sha256::digest(
        serde_json::to_vec(event).map_err(|_| wire::invalid())?,
    ));
    let receipt_key = store::key("provider-event", &json!(event_id))?;
    if let Some(receipt) = store::get(s, &receipt_key)? {
        if receipt.payload["fingerprint"] != fingerprint {
            return Err(wire::conflict("version_conflict"));
        }
        return Ok(true);
    }
    let receipt = json!({"capacityRecordType":"provider-event","fingerprint":fingerprint,"purchaseId":row.payload["data"]["purchaseId"]});
    let mut value = row.payload.clone();
    value["data"]["reconcileAfter"] = time::iso8601(s.now_unix_secs()).into();
    if !store::commit(
        s,
        &[
            store::condition(&row.entry_key, Some(row)),
            store::condition(&receipt_key, None),
        ],
        &[
            store::write(&row.entry_key, value),
            store::write(&receipt_key, receipt),
        ],
    )? {
        return Err(wire::unavailable());
    }
    Ok(true)
}

fn refresh_service<S: HostSeams>(s: &S, row: &crate::db::EntryRecord) -> AppResult<()> {
    let p = &row.payload["data"];
    let id = wire::text(p, "providerSubscriptionId")?;
    if !config::provider_id(id, "sub_") {
        return Err(wire::unavailable());
    }
    let sub = billing::get(s, &format!("/v1/subscriptions/{id}"))?;
    let binding = &p["snapshot"]["quote"]["binding"];
    if sub["id"] != id
        || sub["customer"] != p["stripeCustomerId"]
        || sub["livemode"] != (binding["environment"] == "live")
        || sub["metadata"]["capacityPurchaseId"] != p["purchaseId"]
        || sub["metadata"]["capacityQuoteDigest"] != p["snapshot"]["quoteDigest"]
    {
        return Err(wire::conflict("version_conflict"));
    }
    let now = s.now_unix_secs();
    let mut value = row.payload.clone();
    let service = &mut value["data"]["service"];
    let paid_through = service["paidThrough"].as_str().and_then(time::parse_iso);
    if matches!(
        sub["status"].as_str(),
        Some("canceled" | "incomplete_expired")
    ) {
        service["state"] = if paid_through.is_some_and(|end| end > now) {
            "cancel_at_period_end"
        } else {
            "ended"
        }
        .into();
        service["cancelEffectiveAt"] = service["paidThrough"].clone();
    } else if sub["cancel_at_period_end"] == true || sub["cancel_at"].is_number() {
        let end = sub["cancel_at"]
            .as_i64()
            .or_else(|| sub["current_period_end"].as_i64())
            .ok_or_else(wire::unavailable)?;
        service["cancelEffectiveAt"] = time::iso8601(end).into();
        service["state"] = if end > now {
            "cancel_at_period_end"
        } else {
            "ended"
        }
        .into();
    } else if !p["cancellationOutcome"].is_null() {
        // Provider drift cannot undo an accepted cancellation. Reapply the same
        // paid-through instruction through its durable action identity.
        let end = wire::stamp(&p["cancellationOutcome"], "cancelEffectiveAt")?;
        if end > now {
            billing::post(
                s,
                &format!("/v1/subscriptions/{id}"),
                &format!("{id}:restore-cancellation:{end}"),
                &[
                    ("cancel_at".into(), end.to_string()),
                    ("proration_behavior".into(), "none".into()),
                ],
            )?;
        } else {
            return Err(wire::unavailable());
        }
    }
    service["freshness"] = access::freshness(now);
    value["data"]["providerLifecycle"] =
        json!({"status":sub["status"],"observedAt":time::iso8601(now)});
    if !store::commit(
        s,
        &[store::condition(&row.entry_key, Some(row))],
        &[store::write(&row.entry_key, value)],
    )? {
        return Err(wire::unavailable());
    }
    Ok(())
}
