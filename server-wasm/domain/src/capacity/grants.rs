use super::{
    access::{self, Access},
    catalog, store, wire,
};
use crate::{db::EntryRecord, error::AppResult, seams::HostSeams, time};
use serde_json::{json, Value};
/// Update an authenticated provider observation and grant atomically with the
/// scope revision. Caller reads current provider state, never a browser payload.
pub fn invoice<S: HostSeams>(
    s: &S,
    row: &EntryRecord,
    invoice: &Value,
    charge: Option<&Value>,
    dispute: Option<&Value>,
) -> AppResult<()> {
    let p = &row.payload["data"];
    let q = &p["snapshot"]["quote"];
    let binding = &q["binding"];
    if invoice["customer"] != p["stripeCustomerId"]
        || invoice["subscription"] != p["providerSubscriptionId"]
        || invoice["livemode"] != (binding["environment"] == "live")
        || invoice["currency"].as_str().map(str::to_ascii_uppercase)
            != binding["terms"]["currency"].as_str().map(str::to_string)
    {
        return Err(wire::conflict("version_conflict"));
    }
    let period = wire::text(invoice, "id")?;
    let initial = invoice["billing_reason"] == "subscription_create";
    let (start, end) = if initial {
        (
            wire::stamp(q, "effectiveAt")?,
            wire::stamp(q, "paidThrough")?,
        )
    } else {
        let lines = invoice["lines"]["data"]
            .as_array()
            .ok_or_else(wire::unavailable)?;
        let lines: Vec<_> = lines
            .iter()
            .filter(|l| l["type"] == "subscription" && l["proration"] == false)
            .collect();
        if lines.len() != 1 || invoice["lines"]["has_more"] != false {
            return Err(wire::unavailable());
        }
        let l = lines[0];
        if l["quantity"] != binding["quantity"]
            || l["price"]["unit_amount"] != binding["terms"]["pricePerItemMinor"]
            || l["price"]["recurring"]["interval"] != binding["terms"]["billingInterval"]
            || l["price"]["recurring"]["interval_count"] != 1
        {
            return Err(wire::conflict("version_conflict"));
        }
        (
            l["period"]["start"]
                .as_i64()
                .ok_or_else(wire::unavailable)?,
            l["period"]["end"].as_i64().ok_or_else(wire::unavailable)?,
        )
    };
    if start >= end {
        return Err(wire::conflict("grant_conflict"));
    }
    let total = wire::number(invoice, "total")?;
    if initial {
        super::billing::verify_initial_invoice(q, &p["material"], invoice)?;
    } else if p["material"].get("selectedDiscount").is_some() {
        let gross = catalog::mul(
            wire::number(binding, "quantity")?,
            wire::number(&binding["terms"], "pricePerItemMinor")?,
        )?;
        let subtotal = super::discount::invoice_subtotal(&p["material"], invoice, gross)?;
        let tax = match invoice.get("tax") {
            Some(Value::Null) => 0,
            Some(_) => wire::number(invoice, "tax")?,
            None => return Err(wire::unavailable()),
        };
        if catalog::add(subtotal, tax)? != total {
            return Err(wire::conflict("version_conflict"));
        }
    }
    let paid = invoice["status"] == "paid"
        && invoice["paid"] == true
        && wire::number(invoice, "amount_remaining")? == 0;
    // An invoice marked paid out of band or carried into a customer balance is
    // not confirmation of the required upgrade payment.
    if paid
        && (invoice["paid_out_of_band"] != false
            || wire::number(invoice, "amount_paid")? != total
            || (total > 0
                && (invoice["payment_intent"]["status"] != "succeeded"
                    || invoice["payment_intent"]["amount"].as_u64() != Some(total)
                    || invoice["payment_intent"]["amount_received"].as_u64() != Some(total)
                    || invoice["payment_intent"]["currency"] != invoice["currency"]
                    || invoice["payment_intent"]["customer"] != invoice["customer"])))
    {
        return Err(wire::conflict("payment_outcome_unknown"));
    }
    let mut payment = if paid {
        "paid"
    } else {
        match invoice["status"].as_str() {
            Some("void") => "canceled",
            Some("uncollectible") => "failed",
            _ => match invoice["payment_intent"]["status"].as_str() {
                Some("requires_action") => "action_required",
                Some("requires_payment_method") => "failed",
                Some("canceled") => "canceled",
                _ => "pending",
            },
        }
    };
    let mut dispute_state = "none";
    let mut refund = 0;
    if let Some(c) = charge {
        if c["customer"] != p["stripeCustomerId"]
            || c["invoice"] != period
            || c["livemode"] != (binding["environment"] == "live")
            || wire::number(c, "amount")? != total
        {
            return Err(wire::conflict("version_conflict"));
        }
        refund = wire::number(c, "amount_refunded")?;
        if refund > total {
            return Err(wire::conflict("version_conflict"));
        }
        if refund > 0 {
            payment = if refund == total {
                "refunded"
            } else {
                "partially_refunded"
            };
        }
        if let Some(d) = dispute {
            if d["charge"] != c["id"] {
                return Err(wire::conflict("version_conflict"));
            }
            dispute_state = match d["status"].as_str() {
                Some("won" | "warning_closed") => "won",
                Some("lost") => "lost",
                Some(
                    "needs_response"
                    | "under_review"
                    | "warning_needs_response"
                    | "warning_under_review",
                ) => "open",
                _ => return Err(wire::unavailable()),
            };
            if matches!(dispute_state, "open" | "lost") {
                payment = "disputed";
            }
        } else if c["disputed"] == true {
            return Err(wire::unavailable());
        }
    }
    let now = s.now_unix_secs();
    let mut value = row.payload.clone();
    let data = &mut value["data"];
    let attempts = data["attempts"]
        .as_array_mut()
        .ok_or_else(wire::unavailable)?;
    // Invoice and PaymentIntent are stable provider identities. A retry cannot
    // create an independent financial attempt merely by changing a browser key.
    let provider_attempt = invoice["payment_intent"]["id"]
        .as_str()
        .or_else(|| invoice["payment_intent"].as_str())
        .unwrap_or(period);
    let attempt_id = format!(
        "{provider_attempt}:{:016}",
        wire::number(invoice, "attempt_count")?
    );
    let index = attempts
        .iter()
        .position(|a| a["billingPeriodId"] == period && a["attemptId"] == attempt_id);
    let old = index.map(|i| attempts[i].clone());
    let refund_revision = old
        .as_ref()
        .map(|a| wire::number(a, "refundRevision"))
        .transpose()?
        .unwrap_or(0);
    let financial = data_financial(p, period);
    if financial.as_ref().is_some_and(|f| f["paid"] == true) && !paid {
        return Err(wire::conflict("grant_conflict"));
    }
    // A cleared charge flag or incomplete dispute list is not an authenticated
    // win. Preserve known dispute history until its explicit outcome is read.
    if dispute.is_none()
        && financial
            .as_ref()
            .and_then(|f| f.get("dispute"))
            .is_some_and(|d| !d.is_null())
    {
        return Err(wire::conflict("grant_conflict"));
    }
    if let (Some(previous), Some(current)) =
        (financial.as_ref().and_then(|f| f.get("dispute")), dispute)
    {
        if previous["id"] == current["id"]
            && matches!(previous["status"].as_str(), Some("won" | "lost"))
            && previous["status"] != current["status"]
        {
            return Err(wire::conflict("grant_conflict"));
        }
    }
    if financial
        .as_ref()
        .is_some_and(|f| f["refundMinor"].as_u64().is_some_and(|n| n > refund))
    {
        return Err(wire::conflict("grant_conflict"));
    }
    let refund_changed = financial
        .as_ref()
        .and_then(|f| f["refundMinor"].as_u64())
        .unwrap_or(0)
        != refund;
    let attempt = json!({"attemptId":attempt_id,"billingPeriodId":period,"kind":if initial{"initial"}else{"renewal"},"periodStartsAt":time::iso8601(start),"periodEndsAt":time::iso8601(end),"payment":{"state":payment,"freshness":access::freshness(now)},"disputeState":dispute_state,"refundRevision":if refund_changed{catalog::add(refund_revision,1)?}else{refund_revision}});
    if let Some(i) = index {
        attempts[i] = attempt.clone();
    } else {
        attempts.push(attempt.clone());
    }
    attempts.sort_by(|a, b| {
        a["periodStartsAt"]
            .as_str()
            .cmp(&b["periodStartsAt"].as_str())
            .then(a["attemptId"].as_str().cmp(&b["attemptId"].as_str()))
    });
    let financially_eligible = matches!(payment, "paid" | "partially_refunded");
    let grant_id = format!(
        "capg_{}",
        wire::digest(&json!([p["purchaseId"], period]))?.trim_start_matches("sha256:")
    );
    let grants = data["grants"]
        .as_array_mut()
        .ok_or_else(wire::unavailable)?;
    let previous = grants
        .iter()
        .filter(|g| g["grantId"] == grant_id)
        .max_by_key(|g| g["revision"].as_u64())
        .cloned();
    let mut changed = false;
    if financially_eligible || (previous.is_some() && matches!(payment, "refunded" | "disputed")) {
        // Partial refunds are monetary-only under this adapter's approved
        // policy. Full refunds/disputes explicitly revoke, never divide money
        // into capacity. Restoration requires an authenticated won outcome.
        let state = if financially_eligible {
            "active"
        } else {
            "revoked"
        };
        if previous
            .as_ref()
            .is_none_or(|g| g["state"] != state || g["financialState"] != payment)
        {
            if previous.is_none()
                && grants.iter().any(|g| {
                    g["grantId"] != grant_id
                        && wire::stamp(g, "effectiveAt").is_ok_and(|n| n < end)
                        && wire::stamp(g, "expiresAt").is_ok_and(|n| n > start)
                })
            {
                return Err(wire::conflict("grant_conflict"));
            }
            let revision = previous
                .as_ref()
                .map(|g| wire::number(g, "revision"))
                .transpose()?
                .unwrap_or(0)
                .checked_add(1)
                .ok_or_else(wire::unavailable)?;
            let effective = previous
                .as_ref()
                .map(|g| wire::stamp(g, "revisionEffectiveAt"))
                .transpose()?
                .unwrap_or(start)
                .max(now);
            let revision_at = if previous.is_none() { start } else { effective };
            let grant = json!({"grantId":grant_id,"revision":revision,"purchaseId":p["purchaseId"],"authorizationId":p["authorizationId"],"quoteId":q["quoteId"],"allowance":q["capacityIncrease"]["amount"],"financialState":payment,"effectiveAt":time::iso8601(start),"expiresAt":time::iso8601(end),"state":state,"revocationEffectiveAt":if state=="revoked"{json!(time::iso8601(revision_at))}else{Value::Null},"sourceUpdatedAt":time::iso8601(now),"snapshot":p["snapshot"],"billingPeriodId":period,"paymentAttemptId":previous.as_ref().map(|g|g["paymentAttemptId"].clone()).unwrap_or_else(||json!(attempt_id)),"revisionEffectiveAt":time::iso8601(revision_at)});
            wire::validate("Grant", &grant)?;
            grants.push(grant);
            changed = true;
        }
    }
    let through = data["grants"]
        .as_array()
        .ok_or_else(wire::unavailable)?
        .iter()
        .filter(|g| {
            !data["grants"]
                .as_array()
                .into_iter()
                .flatten()
                .any(|other| {
                    other["grantId"] == g["grantId"]
                        && other["revision"].as_u64() > g["revision"].as_u64()
                })
        })
        .filter(|g| g["state"] == "active")
        .filter(|g| g["financialState"] == "paid" || g["financialState"] == "partially_refunded")
        .filter_map(|g| g["expiresAt"].as_str())
        .max()
        .map(str::to_string);
    if through.is_none()
        && !data["grants"]
            .as_array()
            .ok_or_else(wire::unavailable)?
            .is_empty()
    {
        data["service"]["paidThrough"] = Value::Null;
        data["service"]["state"] = "ended".into();
    }
    if let Some(through) = through {
        data["service"]["paidThrough"] = through.clone().into();
        let cancel_at = data["service"]["cancelEffectiveAt"]
            .as_str()
            .and_then(time::parse_iso);
        data["service"]["state"] = if time::parse_iso(&through).is_none_or(|n| n <= now)
            || cancel_at.is_some_and(|end| end <= now)
        {
            "ended"
        } else if cancel_at.is_some() {
            "cancel_at_period_end"
        } else {
            "active"
        }
        .into();
    }
    data["service"]["freshness"] = access::freshness(now);
    if data.get("financialPeriods").is_none() {
        data["financialPeriods"] = json!({});
    }
    data["financialPeriods"][period] = json!({"totalMinor":total,"currency":invoice["currency"],"refundMinor":refund,"dispute":dispute.map(|d|json!({"id":d["id"],"status":d["status"]})),"paid":paid,"observedAt":time::iso8601(now)});
    let audit = json!({"attempt":attempt,"totalMinor":total,"refundMinor":refund,"disputeState":dispute_state});
    let mut identity = audit.clone();
    identity["attempt"]["payment"]["freshness"] = Value::Null;
    let audit_key = store::key(
        "financial-observation",
        &json!([p["purchaseId"], wire::digest(&identity)?]),
    )?;
    let prior_audit = store::get(s, &audit_key)?;
    let mut conditions = vec![store::condition(&row.entry_key, Some(row))];
    let mut ops = vec![store::write(&row.entry_key, value)];
    if prior_audit.is_none() {
        conditions.push(store::condition(&audit_key, None));
        ops.push(store::write(
            &audit_key,
            store::scoped_record(
                "financial-observation",
                &row.payload["capacityScope"],
                audit,
            ),
        ));
    }
    if paid && total > 0 {
        let identity = crate::routes::webhooks::provider_payment_identity(
            &crate::db::Db::new(s, crate::ids::DB_ACCESS),
            wire::text(&invoice["payment_intent"], "id")?,
            &format!("capacity:{}:{period}", wire::text(p, "purchaseId")?),
            i64::try_from(total).map_err(|_| wire::unavailable())?,
            &wire::text(invoice, "currency")?.to_ascii_uppercase(),
        )?;
        conditions.extend(identity.conditions);
        ops.extend(identity.ops);
    }
    if changed {
        let scope = &row.payload["capacityScope"];
        let key = store::key("scope", scope)?;
        let head = store::get(s, &key)?;
        let revision = head
            .as_ref()
            .map(|r| wire::number(&r.payload, "sourceRevision"))
            .transpose()?
            .unwrap_or(0);
        conditions.push(store::condition(&key, head.as_ref()));
        ops.push(store::write(&key,json!({"capacityRecordType":"scope","capacityScope":scope,"sourceRevision":catalog::add(revision,1)?,"hintDeliveredRevision":head.as_ref().map(|r|r.payload["hintDeliveredRevision"].clone()).unwrap_or(json!(0))})));
    }
    if !store::commit(s, &conditions, &ops)? {
        return Err(wire::unavailable());
    }
    Ok(())
}
fn data_financial(p: &Value, period: &str) -> Option<Value> {
    p.get("financialPeriods")?.get(period).cloned()
}
pub fn snapshot<S: HostSeams>(s: &S, a: &Access, command: &Value) -> AppResult<Value> {
    if !a.native || command["organizationId"] != a.organization {
        return Err(crate::error::AppError::not_found(
            "capacity snapshot not found",
        ));
    }
    let scope = json!({"payInstallationId":a.config.pay_installation_id,"environment":a.config.environment,"organizationId":a.organization});
    if let Some(cursor) = command["cursor"].as_str() {
        let row = store::get(s, &store::key("snapshot-page", &json!(cursor))?)?
            .ok_or_else(|| wire::conflict("cursor_expired"))?;
        if row.payload["capacityScope"] != scope {
            return Err(crate::error::AppError::not_found(
                "capacity snapshot not found",
            ));
        }
        if wire::stamp(&row.payload, "expiresAt")? <= s.now_unix_secs() {
            return Err(wire::conflict("cursor_expired"));
        }
        return Ok(row.payload["data"].clone());
    }
    let head_key = store::key("scope", &scope)?;
    let head = store::get(s, &head_key)?;
    let revision = head
        .as_ref()
        .map(|r| wire::number(&r.payload, "sourceRevision"))
        .transpose()?
        .unwrap_or(0);
    let rows = store::list(s, "purchase", Some(&scope))?;
    let mut grants = vec![];
    for row in rows {
        if let Some(list) = row.payload["data"]["grants"].as_array() {
            for g in list {
                a.confine(&g["snapshot"]["quote"]["binding"])?;
                wire::validate("Grant", g)?;
                if wire::digest(&g["snapshot"]["quote"])? != g["snapshot"]["quoteDigest"] {
                    return Err(wire::conflict("grant_conflict"));
                }
                grants.push(g.clone());
            }
        } else {
            return Err(wire::unavailable());
        }
    }
    grants.sort_by(|a, b| {
        a["grantId"]
            .as_str()
            .cmp(&b["grantId"].as_str())
            .then(a["revision"].as_u64().cmp(&b["revision"].as_u64()))
    });
    let digest = wire::digest(
        &json!({"payInstallationId":scope["payInstallationId"],"environment":scope["environment"],"organizationId":scope["organizationId"],"sourceRevision":revision,"grants":grants}),
    )?;
    let chunks: Vec<_> = if grants.is_empty() {
        vec![vec![]]
    } else {
        grants.chunks(100).map(|c| c.to_vec()).collect()
    };
    let snapshot_id = wire::random("caps")?;
    let cursors = (0..chunks.len())
        .map(|_| wire::random("capcursor"))
        .collect::<AppResult<Vec<_>>>()?;
    let now = s.now_unix_secs();
    let mut ops = vec![];
    let mut first = None;
    let mut conditions = vec![store::condition(&head_key, head.as_ref())];
    for (i, grants) in chunks.into_iter().enumerate() {
        let next = cursors.get(i + 1);
        let page = json!({"contractVersion":wire::VERSION,"payInstallationId":scope["payInstallationId"],"environment":scope["environment"],"organizationId":scope["organizationId"],"snapshotId":snapshot_id,"sourceRevision":revision,"observedAt":time::iso8601(now),"grants":grants,"complete":next.is_none(),"nextCursor":next,"snapshotDigest":digest,"pageIndex":i});
        if i == 0 {
            first = Some(page.clone());
        }
        let key = store::key("snapshot-page", &json!(cursors[i]))?;
        let mut value = store::scoped_record("snapshot-page", &scope, page);
        value["expiresAt"] = time::iso8601(now + 3600).into();
        conditions.push(store::condition(&key, None));
        ops.push(store::write(&key, value));
    }
    if !store::commit(s, &conditions, &ops)? {
        return Err(wire::conflict("snapshot_conflict"));
    }
    first.ok_or_else(wire::unavailable)
}
