use super::{
    access::{freshness, Access},
    store, wire,
};
use crate::{
    db::{Db, Filter, Op, Query},
    error::AppResult,
    ids,
    seams::HostSeams,
    time,
};
use serde_json::{json, Value};
pub const HANDLES: [(&str, &str, &str, &str); 4] = [
    ("cedros-addon-sites", "sites", "sites.count", "site"),
    // Pay-owned mapping only; no product, quantity or commercial price is seeded.
    (
        "cedros-addon-storage-v2",
        "storage",
        "storage.occupied-bytes",
        "byte",
    ),
    (
        "cedros-addon-managed-credits-v2",
        "managed-services",
        "managed.credits",
        "credit",
    ),
    (
        "cedros-addon-email-recipients-v2",
        "email",
        "email.recipient-acceptances",
        "recipient",
    ),
];
pub fn offers<S: HostSeams>(s: &S, a: &Access, target: &Value) -> AppResult<Value> {
    a.scope(s, target, "read")?;
    let mut offers = vec![];
    for (handle, _, _, _) in HANDLES {
        match resolve(s,a,target,handle) {
            Ok((mut offer,_))=>{if a.authority!="BillingManage"{offer["purchasable"]=false.into();offer["reason"]="billing_permission_required".into();}offers.push(offer);},
            Err(e) if e.code=="offer_unavailable"||e.code=="unsupported_interval"=>offers.push(json!({"offerId":handle,"offerVersion":null,"scopeKind":"organization","terms":null,"purchasable":false,"reason":"offer_unconfigured","quantityConstraints":null})),
            Err(e)=>return Err(e),
        }
    }
    Ok(
        json!({"contractVersion":wire::VERSION,"target":target,"availability":"available","offers":offers,"freshness":freshness(s.now_unix_secs())}),
    )
}
/// Financial/allowance terms are approved metadata, never inferred from a handle.
/// The selected catalog price is independently checked against Stripe at quote time.
fn resolve<S: HostSeams>(
    s: &S,
    a: &Access,
    target: &Value,
    handle: &str,
) -> AppResult<(Value, Value)> {
    let rows = Db::new(s, ids::DB_ACCESS).read(
        ids::MODEL_CATALOG,
        &Query::new()
            .filter(Filter::new("stableHandle", Op::Eq, handle))
            .limit(2),
    )?;
    resolve_from_catalog(&rows, a, target, handle)
}
pub(super) fn resolve_from_catalog(
    catalog: &[crate::db::EntryRecord],
    a: &Access,
    target: &Value,
    handle: &str,
) -> AppResult<(Value, Value)> {
    let (_, service, meter, unit) = HANDLES
        .iter()
        .find(|r| r.0 == handle)
        .ok_or_else(|| wire::conflict("offer_unavailable"))?;
    let rows: Vec<_> = catalog
        .iter()
        .filter(|row| row.payload["stableHandle"] == handle)
        .collect();
    if rows.len() != 1 {
        return Err(wire::conflict("offer_unavailable"));
    }
    let org = a.config.organization(target)?;
    if *unit != "site" && org.accounting_version != Some(2) {
        return Err(wire::conflict("offer_unavailable"));
    }
    let p = &rows[0].payload;
    if p["productType"] != "capacityAddOn"
        || !["active", "public", "purchasable"]
            .iter()
            .all(|k| p[k] == true)
        || !target["scope"]["siteId"].is_null()
    {
        return Err(wire::conflict("offer_unavailable"));
    }
    let config = &p["metadata"]["capacityV1"];
    let price_id =
        wire::text(config, "priceId").map_err(|_| wire::conflict("offer_unavailable"))?;
    let prices = p["prices"]
        .as_array()
        .ok_or_else(|| wire::conflict("offer_unavailable"))?;
    let prices: Vec<_> = prices
        .iter()
        .filter(|p| p["id"] == price_id || p["stableHandle"] == price_id)
        .collect();
    if prices.len() != 1 {
        return Err(wire::conflict("offer_unavailable"));
    }
    let price = prices[0];
    if price["billingIntervalCount"] != 1 {
        return Err(crate::error::AppError::new(
            422,
            "unsupported_interval",
            "only billing interval count 1 is supported",
        ));
    }
    let terms = &config["terms"];
    wire::validate("Terms", terms).map_err(|_| wire::conflict("offer_unavailable"))?;
    if !["active", "public", "purchasable"]
        .iter()
        .all(|k| price[k] == true)
        || terms["serviceId"] != *service
        || terms["meterId"] != *meter
        || terms["unit"] != *unit
        || terms["pricePerItemMinor"] != price["unitAmountCents"]
        || terms["currency"] != price["currency"]
        || terms["billingInterval"] != price["billingInterval"]
        || (terms["resetKind"] == "occupancy") != matches!(*unit, "site" | "byte")
        || (*unit == "credit"
            && config["purchasedCreditPolicy"] != "calendar_month_recurring_no_rollover")
    {
        return Err(wire::conflict("offer_unavailable"));
    }
    let mut offer = json!({"offerId":handle,"offerVersion":wire::digest(&json!({"product":p,"price":price}))?,"scopeKind":"organization","terms":terms,"purchasable":true,"reason":null,"quantityConstraints":config["quantityConstraints"]});
    wire::validate("Offer", &offer).map_err(|_| wire::conflict("offer_unavailable"))?;
    let limits = &offer["quantityConstraints"];
    if wire::number(limits, "minimum")? > wire::number(limits, "maximum")? {
        return Err(wire::conflict("offer_unavailable"));
    }
    let approved = config["commercialApprovalId"]
        .as_str()
        .is_some_and(|v| !v.is_empty())
        && config["partialRefundPolicy"] == "preserve_allowance"
        && config["fullRefundPolicy"] == "revoke_at_confirmation"
        && config["disputePolicy"] == "revoke_on_open_restore_on_win"
        && config["latePaymentPolicy"] == "full_refund_after_expiry";
    let reason = if !approved || !org.commercial_verified {
        Some("terms_unapproved")
    } else if !a.config.sales_enabled || !a.config.joint_activation_verified || !org.runtime_ready {
        Some("runtime_not_ready")
    } else {
        None
    };
    if let Some(reason) = reason {
        offer["purchasable"] = false.into();
        offer["reason"] = reason.into();
    }
    let material = json!({"stripePriceId":price["stripePriceId"],"stripeProductId":p["stripeProductId"],"currencyMinorUnitDigits":config["currencyMinorUnitDigits"],"taxBasisPoints":config["taxBasisPoints"],"stripeTaxRateId":config["stripeTaxRateId"],"approvalId":config["commercialApprovalId"],"partialRefundPolicy":config["partialRefundPolicy"],"fullRefundPolicy":config["fullRefundPolicy"],"disputePolicy":config["disputePolicy"],"latePaymentPolicy":config["latePaymentPolicy"]});
    Ok((offer, material))
}
pub fn preview<S: HostSeams>(
    s: &S,
    a: &Access,
    command: &Value,
    receipt: &crate::db::EntryRecord,
) -> AppResult<Value> {
    let target = &command["target"];
    a.scope(s, target, "purchase")?;
    if !receipt.payload["outcome"].is_null() {
        return Ok(receipt.payload["outcome"].clone());
    }
    let id = wire::text(&receipt.payload, "operationId")?;
    let key = store::key("quote", &json!(id))?;
    if let Some(row) = store::get(s, &key)? {
        return store::finish(s, receipt, &row.payload["data"]["snapshot"]);
    }
    a.config.sale(target)?;
    let (offer, mut material) = resolve(s, a, target, wire::text(command, "offerId")?)?;
    if !offer["purchasable"].as_bool().unwrap_or(false) {
        return Err(wire::conflict("offer_unavailable"));
    }
    if command["offerVersion"] != offer["offerVersion"] {
        return Err(wire::conflict("version_conflict"));
    }
    let n = wire::number(command, "quantity")?;
    let limits = &offer["quantityConstraints"];
    let min = wire::number(limits, "minimum")?;
    if n < min
        || n > wire::number(limits, "maximum")?
        || (n - min) % wire::number(limits, "step")? != 0
    {
        return Err(wire::invalid());
    }
    super::billing::verify_price(s, a, &offer, &material)?;
    let terms = &offer["terms"];
    let full = mul(wire::number(terms, "pricePerItemMinor")?, n)?;
    let increase = mul(wire::number(terms, "allowancePerItem")?, n)?;
    let now = s.now_unix_secs();
    let (end, subtotal) = if terms["proration"] == "prorated_charge_full_allowance" {
        let base = Db::new(s, ids::DB_ACCESS)
            .read_one(
                ids::MODEL_SUBSCRIPTIONS,
                wire::text(target, "baseSubscriptionId")?,
            )?
            .ok_or_else(wire::unavailable)?;
        if crate::routes::subscription_entitlements::is_capacity_subscription(s, &base.payload)? {
            return Err(wire::conflict("offer_unavailable"));
        }
        let start = wire::stamp(&base.payload, "currentPeriodStart")?;
        let end = wire::stamp(&base.payload, "currentPeriodEnd")?;
        if advance(
            start,
            if terms["billingInterval"] == "year" {
                12
            } else {
                1
            },
        )? != end
            || start > now
            || end <= now
        {
            return Err(wire::conflict("offer_unavailable"));
        }
        let prorated = (u128::from(full) * (end - now) as u128 + (end - start) as u128 / 2)
            / (end - start) as u128;
        (end, u64::try_from(prorated).map_err(|_| wire::invalid())?)
    } else {
        (
            advance(
                now,
                if terms["billingInterval"] == "year" {
                    12
                } else {
                    1
                },
            )?,
            full,
        )
    };
    let discount = super::discount::selected(s, a, command, &offer, &material, subtotal)?;
    let (full, subtotal) = if let Some(discount) = discount {
        material["initialSubtotalMinor"] = subtotal.into();
        material["selectedDiscount"] =
            serde_json::to_value(&discount).map_err(|_| wire::unavailable())?;
        (discount.subtotal(full)?, discount.subtotal(subtotal)?)
    } else {
        (full, subtotal)
    };
    let bps = wire::number(&material, "taxBasisPoints")?;
    if bps > 10_000 {
        return Err(wire::unavailable());
    }
    let renewal_tax = tax(full, bps)?;
    let tax = tax(subtotal, bps)?;
    let digits = wire::number(&material, "currencyMinorUnitDigits")?;
    if digits > 3 {
        return Err(wire::unavailable());
    }
    let start_iso = time::iso8601(now);
    let end_iso = time::iso8601(end);
    let period = if terms["resetKind"] == "occupancy" {
        json!({"kind":"occupancy","timezone":"UTC","startsAt":null,"endsAt":null,"resetsAt":null})
    } else {
        let month = format!("{}-01T00:00:00Z", &start_iso[..7]);
        let month_secs = time::parse_iso(&month).ok_or_else(wire::invalid)?;
        let next = time::iso8601(advance(month_secs, 1)?);
        json!({"kind":"calendar_month","timezone":"UTC","startsAt":month,"endsAt":next,"resetsAt":next})
    };
    let quote = json!({"contractVersion":wire::VERSION,"quoteId":id,"binding":{"payInstallationId":a.config.pay_installation_id,"environment":a.config.environment,"buyerUserId":a.actor,"scope":target["scope"],"baseSubscriptionId":target["baseSubscriptionId"],"offerId":offer["offerId"],"offerVersion":offer["offerVersion"],"quantity":n,"terms":terms},"createdAt":start_iso,"expiresAt":time::iso8601((now+300).min(end)),"effectiveAt":start_iso,"paidThrough":end_iso,"subtotalMinor":subtotal,"taxMinor":tax,"totalDueMinor":add(subtotal,tax)?,"renewalTotalMinor":add(full,renewal_tax)?,"renewalTaxMinor":renewal_tax,"renewalAt":end_iso,"currencyMinorUnitDigits":digits,"capacityIncrease":{"meter":{"serviceId":terms["serviceId"],"meterId":terms["meterId"],"unit":terms["unit"],"scope":target["scope"],"period":period},"amount":increase,"effectiveAt":start_iso,"expiresAt":end_iso},"acceptancePolicy":"accept_before_expiry_confirm_without_repricing"});
    wire::validate("Quote", &quote)?;
    let snapshot = json!({"quoteDigest":wire::digest(&quote)?,"quote":quote});
    let scope = store::scope(&snapshot["quote"]["binding"]);
    let record = store::scoped_record(
        "quote",
        &scope,
        json!({"snapshot":snapshot,"material":material,"stripeCustomerId":a.config.organization(target)?.stripe_customer_id}),
    );
    store::commit(
        s,
        &[store::condition(&key, None)],
        &[store::write(&key, record)],
    )?;
    let saved = store::get(s, &key)?.ok_or_else(wire::unavailable)?;
    store::finish(s, receipt, &saved.payload["data"]["snapshot"])
}
pub fn mul(a: u64, b: u64) -> AppResult<u64> {
    a.checked_mul(b)
        .filter(|n| *n <= wire::MAX)
        .ok_or_else(wire::invalid)
}
pub fn add(a: u64, b: u64) -> AppResult<u64> {
    a.checked_add(b)
        .filter(|n| *n <= wire::MAX)
        .ok_or_else(wire::invalid)
}
fn tax(amount: u64, bps: u64) -> AppResult<u64> {
    u64::try_from((u128::from(amount) * u128::from(bps) + 5000) / 10000)
        .ok()
        .filter(|n| *n <= wire::MAX)
        .ok_or_else(wire::invalid)
}
fn advance(now: i64, months: i64) -> AppResult<i64> {
    let iso = time::iso8601(now);
    let year = iso[..4].parse::<i64>().map_err(|_| wire::invalid())?;
    let month = iso[5..7].parse::<i64>().map_err(|_| wire::invalid())?;
    let total = year * 12 + month - 1 + months;
    let year = total / 12;
    let month = total % 12 + 1;
    for day in (1..=iso[8..10].parse::<i64>().map_err(|_| wire::invalid())?).rev() {
        if let Some(t) = time::parse_iso(&format!("{year:04}-{month:02}-{day:02}{}", &iso[10..])) {
            return Ok(t);
        }
    }
    Err(wire::invalid())
}
