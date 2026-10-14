//! Stripe transport and durable provider identity. Initial quoted charges use an
//! immediate invoice item; the recurring item starts at the immutable paidThrough
//! anchor. Stripe's trial flag is only a billing bridge and never a capacity grant.
use super::{access::Access, config, store, wire};
use crate::{
    db::EntryRecord,
    error::{AppError, AppResult},
    ids,
    seams::HostSeams,
    stripe::api,
    time,
};
use serde_json::{json, Value};
pub fn get<S: HostSeams>(s: &S, path: &str) -> AppResult<Value> {
    request(s, api::stripe_get(&secret(s)?, path))
}
pub fn post<S: HostSeams>(
    s: &S,
    path: &str,
    key: &str,
    params: &[(String, String)],
) -> AppResult<Value> {
    request(s, api::stripe_post(&secret(s)?, path, key, params))
}
fn secret<S: HostSeams>(s: &S) -> AppResult<String> {
    s.secret_get(ids::SECRET_STRIPE_KEY)?
        .filter(|v| !v.is_empty())
        .ok_or_else(wire::unavailable)
}
fn request<S: HostSeams>(s: &S, request: Value) -> AppResult<Value> {
    let raw = s
        .http_fetch(&request.to_string())
        .map_err(|_| wire::unavailable())?;
    let (status, body) = api::unwrap_fetch(&raw).map_err(|_| wire::unavailable())?;
    if !(200..300).contains(&status) {
        return Err(wire::unavailable());
    }
    serde_json::from_str(&body).map_err(|_| wire::unavailable())
}
pub fn verify_price<S: HostSeams>(s: &S, a: &Access, offer: &Value, m: &Value) -> AppResult<()> {
    let price = wire::text(m, "stripePriceId")?;
    let product = wire::text(m, "stripeProductId")?;
    if !config::provider_id(price, "price_") || !config::provider_id(product, "prod_") {
        return Err(wire::unavailable());
    }
    let p = get(s, &format!("/v1/prices/{price}"))?;
    let t = &offer["terms"];
    if p["active"] != true
        || p["livemode"] != (a.config.environment == "live")
        || p["product"] != product
        || p["unit_amount"] != t["pricePerItemMinor"]
        || p["currency"].as_str().map(str::to_ascii_uppercase)
            != t["currency"].as_str().map(str::to_string)
        || p["recurring"]["interval"] != t["billingInterval"]
        || p["recurring"]["interval_count"] != 1
        || p["recurring"]["usage_type"] != "licensed"
        || p["billing_scheme"] != "per_unit"
        || p["tax_behavior"] != "exclusive"
    {
        return Err(wire::conflict("version_conflict"));
    }
    let organization = a
        .config
        .organizations
        .get(&a.organization)
        .ok_or_else(wire::unavailable)?;
    let customer = get(
        s,
        &format!("/v1/customers/{}", organization.stripe_customer_id),
    )?;
    if customer["id"] != organization.stripe_customer_id
        || customer["deleted"] == true
        || customer["livemode"] != (a.config.environment == "live")
        || customer["metadata"]["capacityOrganizationId"] != a.organization
        || customer["metadata"]["capacityPayInstallationId"] != a.config.pay_installation_id
        || customer["balance"] != 0
        || !customer["discount"].is_null()
        || customer["tax_exempt"] != "none"
    {
        return Err(wire::unavailable());
    }
    let bps = wire::number(m, "taxBasisPoints")?;
    if let Some(rate) = m["stripeTaxRateId"].as_str() {
        if !config::provider_id(rate, "txr_") {
            return Err(wire::unavailable());
        }
        let r = get(s, &format!("/v1/tax_rates/{rate}"))?;
        // Stripe tax percentages have at most four decimal places; only exact
        // basis-point rates are supported by this configured billing adapter.
        let percentage = r["percentage"].to_string();
        let mut parts = percentage.split('.');
        let whole = parts
            .next()
            .and_then(|n| n.parse::<u64>().ok())
            .ok_or_else(wire::unavailable)?;
        let fraction = parts.next().unwrap_or("");
        if fraction.len() > 2 || !fraction.bytes().all(|b| b.is_ascii_digit()) {
            return Err(wire::unavailable());
        }
        let actual = whole
            .checked_mul(100)
            .and_then(|n| {
                format!("{fraction:0<2}")
                    .parse::<u64>()
                    .ok()
                    .and_then(|f| n.checked_add(f))
            })
            .ok_or_else(wire::unavailable)?;
        if r["active"] != true
            || r["inclusive"] != false
            || actual != bps
            || r["livemode"] != (a.config.environment == "live")
        {
            return Err(wire::conflict("version_conflict"));
        }
    } else if bps != 0 || !m["stripeTaxRateId"].is_null() {
        return Err(wire::unavailable());
    }
    Ok(())
}
pub fn dispatch<S: HostSeams>(s: &S, row: &EntryRecord) -> AppResult<()> {
    let p = &row.payload["data"];
    if p["acceptedAt"].is_null() {
        return Err(wire::unavailable());
    }
    if !p["providerSubscriptionId"].is_null() {
        return Ok(());
    }
    let q = &p["snapshot"]["quote"];
    let id = wire::text(p, "purchaseId")?;
    let now = s.now_unix_secs();
    if wire::stamp(q, "paidThrough")? <= now && p["dispatchStartedAt"].is_null() {
        return Err(wire::conflict("quote_expired"));
    }
    let key = format!("{id}:initial:create");
    let mut current = row.clone();
    if p["dispatchStartedAt"].is_null() {
        let m = &p["material"];
        let t = &q["binding"]["terms"];
        let product = wire::text(m, "stripeProductId")?;
        let mut params: Vec<(String, String)> = vec![
            ("customer".into(), wire::text(p, "stripeCustomerId")?.into()),
            ("items[0][price_data][product]".into(), product.into()),
            (
                "items[0][price_data][currency]".into(),
                wire::text(t, "currency")?.to_ascii_lowercase(),
            ),
            (
                "items[0][price_data][unit_amount]".into(),
                wire::number(t, "pricePerItemMinor")?.to_string(),
            ),
            (
                "items[0][price_data][tax_behavior]".into(),
                "exclusive".into(),
            ),
            (
                "items[0][price_data][recurring][interval]".into(),
                wire::text(t, "billingInterval")?.into(),
            ),
            (
                "items[0][price_data][recurring][interval_count]".into(),
                "1".into(),
            ),
            (
                "items[0][quantity]".into(),
                wire::number(&q["binding"], "quantity")?.to_string(),
            ),
            (
                "trial_end".into(),
                wire::stamp(q, "paidThrough")?.to_string(),
            ),
            ("payment_behavior".into(), "default_incomplete".into()),
            (
                "payment_settings[save_default_payment_method]".into(),
                "on_subscription".into(),
            ),
            (
                "add_invoice_items[0][price_data][product]".into(),
                product.into(),
            ),
            (
                "add_invoice_items[0][price_data][currency]".into(),
                wire::text(t, "currency")?.to_ascii_lowercase(),
            ),
            (
                "add_invoice_items[0][price_data][unit_amount]".into(),
                m.get("initialSubtotalMinor")
                    .map(|_| wire::number(m, "initialSubtotalMinor"))
                    .unwrap_or_else(|| wire::number(q, "subtotalMinor"))?
                    .to_string(),
            ),
            (
                "add_invoice_items[0][price_data][tax_behavior]".into(),
                "exclusive".into(),
            ),
            ("add_invoice_items[0][quantity]".into(), "1".into()),
            ("metadata[capacityPurchaseId]".into(), id.into()),
            (
                "metadata[capacityQuoteDigest]".into(),
                wire::text(&p["snapshot"], "quoteDigest")?.into(),
            ),
            (
                "metadata[capacityOrganizationId]".into(),
                wire::text(&q["binding"]["scope"], "organizationId")?.into(),
            ),
            ("expand[0]".into(), "latest_invoice.payment_intent".into()),
        ];
        if let Some(discount) = m.get("selectedDiscount") {
            let id = wire::text(discount, "promotionCodeId")?;
            if !config::provider_id(id, "promo_") {
                return Err(wire::unavailable());
            }
            params.push(("discounts[0][promotion_code]".into(), id.into()));
        }
        if let Some(rate) = m["stripeTaxRateId"].as_str() {
            params.push(("default_tax_rates[0]".into(), rate.into()));
        }
        let mut value = row.payload.clone();
        value["data"]["dispatchStartedAt"] = time::iso8601(now).into();
        value["data"]["providerRequest"] = json!(params);
        if !store::commit(
            s,
            &[store::condition(&row.entry_key, Some(row))],
            &[store::write(&row.entry_key, value)],
        )? {
            return Err(wire::unavailable());
        }
        current = super::purchase::read(s, id)?;
    }
    let p = &current.payload["data"];
    // Stripe may discard idempotency records after 24 hours. Do not blindly
    // recreate an ambiguous subscription after that horizon; retrieve by its
    // customer and immutable metadata instead.
    let started = wire::stamp(p, "dispatchStartedAt")?;
    let subscription = if now - started >= 23 * 3600 || wire::stamp(q, "paidThrough")? <= now {
        find_subscription(s, p)?.ok_or_else(|| wire::conflict("payment_outcome_unknown"))?
    } else {
        let params: Vec<(String, String)> = serde_json::from_value(p["providerRequest"].clone())
            .map_err(|_| wire::unavailable())?;
        post(s, "/v1/subscriptions", &key, &params)?
    };
    bind_subscription(s, &current, &subscription)
}
fn find_subscription<S: HostSeams>(s: &S, p: &Value) -> AppResult<Option<Value>> {
    let customer = wire::text(p, "stripeCustomerId")?;
    if !config::provider_id(customer, "cus_") {
        return Err(wire::unavailable());
    }
    let mut after = String::new();
    let mut found = None;
    for _ in 0..100 {
        let result = get(
            s,
            &format!("/v1/subscriptions?customer={customer}&status=all&limit=100{after}"),
        )?;
        let rows = result["data"].as_array().ok_or_else(wire::unavailable)?;
        for r in rows {
            if r["metadata"]["capacityPurchaseId"] == p["purchaseId"] {
                if found.is_some() {
                    return Err(wire::conflict("payment_outcome_unknown"));
                }
                found = Some(r.clone());
            }
        }
        if result["has_more"] == false {
            return Ok(found);
        }
        let last = rows
            .last()
            .and_then(|r| r["id"].as_str())
            .filter(|id| config::provider_id(id, "sub_"))
            .ok_or_else(wire::unavailable)?;
        after = format!("&starting_after={last}");
    }
    Err(wire::unavailable())
}
fn bind_subscription<S: HostSeams>(s: &S, row: &EntryRecord, sub: &Value) -> AppResult<()> {
    let p = &row.payload["data"];
    let binding = &p["snapshot"]["quote"]["binding"];
    let id = wire::text(sub, "id")?;
    if !config::provider_id(id, "sub_")
        || sub["customer"] != p["stripeCustomerId"]
        || sub["livemode"] != (binding["environment"] == "live")
        || sub["metadata"]["capacityPurchaseId"] != p["purchaseId"]
        || sub["metadata"]["capacityQuoteDigest"] != p["snapshot"]["quoteDigest"]
    {
        return Err(wire::conflict("version_conflict"));
    }
    let mut value = row.payload.clone();
    value["data"]["providerSubscriptionId"] = id.into();
    store::commit(
        s,
        &[store::condition(&row.entry_key, Some(row))],
        &[store::write(&row.entry_key, value)],
    )?;
    Ok(())
}
pub fn action<S: HostSeams>(
    s: &S,
    a: &Access,
    command: &Value,
    receipt: &EntryRecord,
) -> AppResult<Value> {
    let row = super::purchase::read(s, wire::text(command, "purchaseId")?)?;
    let p = &row.payload["data"];
    a.confine(&p["snapshot"]["quote"]["binding"])?;
    a.scope(
        s,
        &super::purchase::target(&p["snapshot"]["quote"]["binding"]),
        "purchase",
    )?;
    if !receipt.payload["outcome"].is_null() {
        return Ok(receipt.payload["outcome"].clone());
    }
    let customer = wire::text(p, "stripeCustomerId")?;
    if customer
        != a.config
            .organization(&super::purchase::target(&p["snapshot"]["quote"]["binding"]))?
            .stripe_customer_id
    {
        return Err(AppError::forbidden(
            "organization billing customer required",
        ));
    }
    if p["acceptedAt"].is_null() {
        return Err(wire::unavailable());
    }
    dispatch(s, &row)?;
    let row = super::purchase::read(s, wire::text(command, "purchaseId")?)?;
    let p = &row.payload["data"];
    let id = wire::text(&receipt.payload, "operationId")?;
    let started = wire::stamp(&receipt.payload, "createdAt")?;
    if s.now_unix_secs() - started >= 300 {
        return Err(wire::conflict("payment_outcome_unknown"));
    }
    // Only the BillingManage operation exposes this provider portal URL.
    let action = wire::text(command, "action")?;
    if action != "manage_payment_method" {
        let subscription = wire::text(p, "providerSubscriptionId")?;
        if !config::provider_id(subscription, "sub_") {
            return Err(wire::unavailable());
        }
        let sub = get(
            s,
            &format!("/v1/subscriptions/{subscription}?expand%5B%5D=latest_invoice.payment_intent"),
        )?;
        if sub["customer"] != p["stripeCustomerId"] || sub["id"] != subscription {
            return Err(wire::unavailable());
        }
        let invoice = &sub["latest_invoice"];
        let initial = invoice["billing_reason"] == "subscription_create";
        if initial {
            verify_initial_invoice(&p["snapshot"]["quote"], &p["material"], invoice)?;
        }
        if invoice["status"] != "open" || (action == "complete_payment") != initial {
            return Err(wire::conflict("payment_outcome_unknown"));
        }
    }
    let portal_config = &a.config.stripe_portal_configuration_id;
    let policy = get(
        s,
        &format!("/v1/billing_portal/configurations/{portal_config}"),
    )?;
    if policy["active"] != true
        || policy["livemode"] != (a.config.environment == "live")
        || policy["features"]["subscription_update"]["enabled"] != false
        || policy["features"]["subscription_cancel"]["enabled"] != false
        || policy["features"]["payment_method_update"]["enabled"] != true
        || policy["features"]["invoice_history"]["enabled"] != true
    {
        return Err(wire::unavailable());
    }
    let mut params = vec![
        ("configuration".into(), portal_config.clone()),
        ("customer".into(), customer.into()),
        (
            "return_url".into(),
            format!(
                "{}{}?returnRef={id}",
                a.config.portal_origin, a.config.recovery_path
            ),
        ),
    ];
    if action == "manage_payment_method" {
        params.push(("flow_data[type]".into(), "payment_method_update".into()));
    }
    let session = post(s, "/v1/billing_portal/sessions", id, &params)?;
    let url = wire::text(&session, "url")?;
    if !url.starts_with("https://billing.stripe.com/") {
        return Err(wire::unavailable());
    }
    let output = json!({"contractVersion":wire::VERSION,"purchaseId":p["purchaseId"],"actingUserId":a.actor,"actionId":id,"actionUrl":url,"expiresAt":time::iso8601(started+300)});
    store::finish(s, receipt, &output)
}

pub(super) fn verify_initial_invoice(
    quote: &Value,
    material: &Value,
    invoice: &Value,
) -> AppResult<()> {
    let gross = material
        .get("initialSubtotalMinor")
        .map(|_| wire::number(material, "initialSubtotalMinor"))
        .unwrap_or_else(|| wire::number(quote, "subtotalMinor"))?;
    let subtotal = super::discount::invoice_subtotal(material, invoice, gross)?;
    if invoice["total"] != quote["totalDueMinor"]
        || invoice["amount_due"] != quote["totalDueMinor"]
        || Some(subtotal) != quote["subtotalMinor"].as_u64()
        || match invoice.get("tax") {
            Some(Value::Null) => wire::number(quote, "taxMinor")? != 0,
            Some(value) => value.as_u64() != Some(wire::number(quote, "taxMinor")?),
            None => true,
        }
    {
        return Err(wire::conflict("version_conflict"));
    }
    Ok(())
}
pub fn cancel<S: HostSeams>(
    s: &S,
    a: &Access,
    command: &Value,
    receipt: &EntryRecord,
) -> AppResult<Value> {
    let row = super::purchase::read(s, wire::text(command, "purchaseId")?)?;
    let p = &row.payload["data"];
    a.confine(&p["snapshot"]["quote"]["binding"])?;
    a.scope(
        s,
        &super::purchase::target(&p["snapshot"]["quote"]["binding"]),
        "purchase",
    )?;
    if !receipt.payload["outcome"].is_null() {
        return Ok(receipt.payload["outcome"].clone());
    }
    if let Some(outcome) = p.get("cancellationOutcome") {
        return store::finish(s, receipt, outcome);
    }
    let id = wire::text(p, "providerSubscriptionId")?;
    if !config::provider_id(id, "sub_") {
        return Err(wire::unavailable());
    }
    let through = wire::text(&p["service"], "paidThrough")?;
    let through_secs = wire::stamp(&p["service"], "paidThrough")?;
    if through_secs <= s.now_unix_secs() {
        return Err(wire::conflict("payment_outcome_unknown"));
    }
    let sub = post(
        s,
        &format!("/v1/subscriptions/{id}"),
        wire::text(&receipt.payload, "operationId")?,
        &[
            ("cancel_at".into(), through_secs.to_string()),
            ("proration_behavior".into(), "none".into()),
        ],
    )?;
    if sub["id"] != id
        || sub["customer"] != p["stripeCustomerId"]
        || sub["cancel_at"].as_i64() != Some(through_secs)
    {
        return Err(wire::unavailable());
    }
    let output = json!({"contractVersion":wire::VERSION,"purchaseId":p["purchaseId"],"actingUserId":a.actor,"cancelEffectiveAt":through,"serviceState":"cancel_at_period_end"});
    let mut value = row.payload.clone();
    value["data"]["cancellationOutcome"] = output.clone();
    value["data"]["service"]["state"] = "cancel_at_period_end".into();
    value["data"]["service"]["cancelEffectiveAt"] = through.into();
    value["data"]["service"]["freshness"] = super::access::freshness(s.now_unix_secs());
    let mut receipt_value = receipt.payload.clone();
    receipt_value["outcome"] = output.clone();
    if !store::commit(
        s,
        &[
            store::condition(&row.entry_key, Some(&row)),
            store::condition(&receipt.entry_key, Some(receipt)),
        ],
        &[
            store::write(&row.entry_key, value),
            store::write(&receipt.entry_key, receipt_value),
        ],
    )? {
        return Err(wire::unavailable());
    }
    Ok(output)
}

pub(super) fn get_optional<S: HostSeams>(s: &S, path: &str) -> AppResult<Option<Value>> {
    let request = api::stripe_get(&secret(s)?, path);
    let raw = s
        .http_fetch(&request.to_string())
        .map_err(|_| wire::unavailable())?;
    let (status, body) = api::unwrap_fetch(&raw).map_err(|_| wire::unavailable())?;
    if status == 404 {
        return Ok(None);
    }
    if !(200..300).contains(&status) {
        return Err(wire::unavailable());
    }
    serde_json::from_str(&body)
        .map(Some)
        .map_err(|_| wire::unavailable())
}
