use super::{
    access::{self, freshness, Access},
    store, wire,
};
use crate::{
    db::EntryRecord,
    error::{AppError, AppResult},
    seams::HostSeams,
    time,
};
use serde_json::{json, Value};
pub fn quote<S: HostSeams>(s: &S, id: &str) -> AppResult<EntryRecord> {
    store::get(s, &store::key("quote", &json!(id))?)?
        .ok_or_else(|| AppError::not_found("capacity quote not found"))
}
pub fn read<S: HostSeams>(s: &S, id: &str) -> AppResult<EntryRecord> {
    store::get(s, &store::key("purchase", &json!(id))?)?
        .ok_or_else(|| AppError::not_found("capacity purchase not found"))
}
pub fn target(binding: &Value) -> Value {
    json!({"scope":binding["scope"],"baseSubscriptionId":binding["baseSubscriptionId"]})
}
pub fn accept<S: HostSeams>(
    s: &S,
    a: &Access,
    command: &Value,
    receipt: &EntryRecord,
) -> AppResult<(Value, bool)> {
    let q = quote(s, wire::text(command, "quoteId")?)?;
    let snapshot = &q.payload["data"]["snapshot"];
    let binding = &snapshot["quote"]["binding"];
    a.confine(binding)?;
    a.scope(s, &target(binding), "purchase")?;
    if command["quoteDigest"] != snapshot["quoteDigest"] {
        return Err(wire::conflict("version_conflict"));
    }
    if binding["buyerUserId"] != a.actor {
        return Err(AppError::forbidden("quote belongs to another purchaser"));
    }
    if !receipt.payload["outcome"].is_null() {
        return Ok((receipt.payload["outcome"].clone(), true));
    }
    let id = format!(
        "capp_{}",
        wire::digest(&json!([
            binding["payInstallationId"],
            binding["environment"],
            command["quoteId"]
        ]))?
        .trim_start_matches("sha256:")
    );
    let key = store::key("purchase", &json!(id))?;
    if store::get(s, &key)?.is_none() {
        a.config.sale(&target(binding))?;
        if wire::stamp(&snapshot["quote"], "expiresAt")? <= s.now_unix_secs() {
            return Err(wire::conflict("quote_expired"));
        }
        let value = store::scoped_record(
            "purchase",
            &store::scope(binding),
            json!({"purchaseId":id,"snapshot":snapshot,"material":q.payload["data"]["material"],"stripeCustomerId":q.payload["data"]["stripeCustomerId"],"authorizationId":command["authorizationId"],"originalPurchaserId":a.actor,"acceptedAt":null,"service":{"state":"pending","cancelEffectiveAt":null,"paidThrough":null,"freshness":freshness(s.now_unix_secs())},"attempts":[],"grants":[],"providerSubscriptionId":null,"dispatchStartedAt":null,"providerRequest":null,"reconcileAfter":time::iso8601(s.now_unix_secs()),"createdAt":time::iso8601(s.now_unix_secs())}),
        );
        store::commit(
            s,
            &[store::condition(&key, None)],
            &[store::write(&key, value)],
        )?;
    }
    let mut row = read(s, &id)?;
    let replay = !row.payload["data"]["acceptedAt"].is_null();
    if !replay {
        // No provider work until Data's atomic redemption has been confirmed.
        let recovery_only = a.config.sale(&target(binding)).is_err();
        let delegation = if recovery_only {
            Value::Null
        } else {
            a.invocation["delegationId"].clone()
        };
        let redeemed = access::invoke(
            s,
            "capacity.authorization.redeem",
            &delegation,
            &a.invocation["requestKey"],
            json!({"authorizationId":row.payload["data"]["authorizationId"],"quoteId":command["quoteId"],"quoteDigest":command["quoteDigest"],"purchaseId":id}),
        )?;
        if recovery_only && redeemed["replayed"] != true {
            return Err(wire::unavailable());
        }
        confirm_redemption(s, &row, &redeemed)?;
        row = read(s, &id)?;
    }
    // An accepted purchase survives temporary provider/Data outages. Recovery is
    // durable; the public response never claims payment or activation here.
    let output = projection(&row, s.now_unix_secs())?;
    Ok((store::finish(s, receipt, &output)?, replay))
}
pub fn confirm_redemption<S: HostSeams>(
    s: &S,
    row: &EntryRecord,
    redeemed: &Value,
) -> AppResult<()> {
    let p = &row.payload["data"];
    let q = &p["snapshot"]["quote"];
    if redeemed["purchaseId"] != p["purchaseId"]
        || redeemed["authorizationId"] != p["authorizationId"]
        || redeemed["quoteId"] != q["quoteId"]
        || redeemed["quoteDigest"] != p["snapshot"]["quoteDigest"]
        || wire::stamp(redeemed, "acceptedAt")? >= wire::stamp(q, "expiresAt")?
        || wire::stamp(redeemed, "acceptedAt")? < wire::stamp(q, "createdAt")?
    {
        return Err(wire::conflict("version_conflict"));
    }
    let mut value = row.payload.clone();
    value["data"]["acceptedAt"] = redeemed["acceptedAt"].clone();
    store::commit(
        s,
        &[store::condition(&row.entry_key, Some(row))],
        &[store::write(&row.entry_key, value)],
    )?;
    Ok(())
}
pub fn projection(row: &EntryRecord, now: i64) -> AppResult<Value> {
    let p = &row.payload["data"];
    if p["acceptedAt"].is_null() {
        return Err(wire::unavailable());
    }
    let attempts = p["attempts"].as_array().ok_or_else(wire::unavailable)?;
    let initial = attempts
        .iter()
        .rev()
        .find(|a| a["kind"] == "initial")
        .cloned()
        .unwrap_or(Value::Null);
    let latest = attempts.last().cloned().unwrap_or(Value::Null);
    let mut result = json!({"contractVersion":wire::VERSION,"purchaseId":p["purchaseId"],"snapshot":p["snapshot"],"acceptedAt":p["acceptedAt"],"originalPurchaserId":p["originalPurchaserId"],"service":p["service"],"initialAttempt":initial,"latestAttempt":latest});
    for path in [
        "/service/freshness",
        "/initialAttempt/payment/freshness",
        "/latestAttempt/payment/freshness",
    ] {
        if let Some(source) = result.pointer_mut(path) {
            if source["state"] == "available" && wire::stamp(source, "validUntil")? <= now {
                source["state"] = "stale".into();
            }
        }
    }
    if ["cancelEffectiveAt", "paidThrough"].iter().any(|field| {
        result["service"][field]
            .as_str()
            .and_then(time::parse_iso)
            .is_some_and(|end| end <= now)
    }) {
        result["service"]["state"] = "ended".into();
    }
    wire::validate("PayPurchaseResponse", &result)?;
    Ok(result)
}
