//! Native Data leaf read. Only operator-approved bindings establish ownership or
//! allowances; catalog prices and provider quantities never imply capacity.
use super::{access::Access, catalog, config, store, wire};
use crate::{
    db::{Db, EntryRecord, Query},
    error::{AppError, AppResult},
    ids,
    seams::HostSeams,
    time,
};
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};

// Historical accounting-v1 meter identities/units from Data 02e4b247d7.
// Voice and SEO remain readable for existing bindings but are not routable or
// purchasable through accounting v2.
const LEGACY_METERS: &[(&str, &str, bool)] = &[
    ("sites.count", "site", false),
    ("intelligence.requests", "request", false),
    ("email.campaign-recipients", "recipient", false),
    ("image-generation.images", "image", false),
    ("voice.audio-seconds", "second", false),
    ("storage.occupied-bytes", "byte", false),
    ("search.requests", "request", false),
    ("web.urls", "url", false),
    ("seo.requests", "request", false),
    ("blockchain.requests", "request", false),
    ("email.storage-bytes", "byte", true),
    ("media.occupied-bytes", "byte", true),
];
const RETIRED_LEGACY_METERS: &[&str] = &["voice.audio-seconds", "seo.requests"];

const V2_METERS: &[(&str, &str, bool)] = &[
    ("sites.count", "site", false),
    ("managed.credits", "credit", false),
    ("intelligence.credits", "credit", false),
    ("email.recipient-acceptances", "recipient", false),
    ("search.credits", "credit", false),
    ("blockchain.credits", "credit", false),
    ("x-api.credits", "credit", false),
    ("storage.occupied-bytes", "byte", false),
];
fn category(meter: &str) -> &str {
    meter.split('.').next().unwrap_or("")
}

pub fn read<S: HostSeams>(s: &S, a: &Access, command: &Value) -> AppResult<Value> {
    if !a.native || command["organizationId"] != a.organization {
        return Err(AppError::forbidden("exact native organization required"));
    }
    let org = a
        .config
        .organizations
        .get(&a.organization)
        .ok_or_else(wire::unavailable)?;
    if !config::provider_id(&org.stripe_customer_id, "cus_")
        || org.base_subscription_ids.len() > 1000
    {
        return Err(wire::unavailable());
    }
    let v2 = org.accounting_version == Some(2);
    let meters = if v2 { V2_METERS } else { LEGACY_METERS };
    let mut category_pools = BTreeMap::new();
    let mut all_ids = BTreeSet::new();
    let mut all_sites = BTreeSet::new();
    for owner in a.config.organizations.values() {
        for site in &owner.canonical_site_ids {
            if !identifier(site) || !all_sites.insert(site) {
                return Err(wire::unavailable());
            }
        }
        for id in &owner.base_subscription_ids {
            if !identifier(id) || !all_ids.insert(id) {
                return Err(wire::unavailable());
            }
        }
    }
    let sites: BTreeSet<_> = org.canonical_site_ids.iter().collect();
    if sites.len() != org.canonical_site_ids.len()
        || sites.iter().any(|id| !identifier(id))
        || sites.len() > 1000
    {
        return Err(wire::unavailable());
    }
    let catalog = if org.base_subscription_ids.is_empty() {
        vec![]
    } else {
        store::complete_read(s, ids::MODEL_CATALOG, &Query::new())?
    };
    let db = Db::new(s, ids::DB_ACCESS);
    let sources = db.read_keys(ids::MODEL_SUBSCRIPTIONS, &org.base_subscription_ids)?;
    if sources.len() != org.base_subscription_ids.len() {
        return Err(wire::unavailable());
    }
    let mut subscriptions = vec![];
    let now = s.now_unix_secs();
    let mut valid_until = now + 60;
    let mut totals: BTreeMap<(String, Option<String>), (String, u64)> = BTreeMap::new();
    for id in &org.base_subscription_ids {
        let row = sources.get(id).ok_or_else(wire::unavailable)?;
        let p = &row.payload;
        let expected_customer = org
            .base_customer_refs
            .get(id)
            .ok_or_else(wire::unavailable)?;
        if !identifier(expected_customer)
            || p["customerRef"] != *expected_customer
            || p["subscriptionId"] != *id
            || !p["capacityRecordType"].is_null()
        {
            return Err(wire::unavailable());
        }
        let product = product(&catalog, p)?;
        if crate::routes::products::is_capacity_product(&product.payload)
            || crate::routes::products::is_capacity_handle(&product.entry_key)
        {
            continue;
        }
        if product.payload["productType"] != "subscription" {
            return Err(wire::unavailable());
        }
        let name = wire::text(&product.payload, "title").map_err(|_| wire::unavailable())?;
        if !identifier(name) {
            return Err(wire::unavailable());
        }
        let status = wire::text(p, "status").map_err(|_| wire::unavailable())?;
        let end = p["currentPeriodEnd"].as_str().and_then(time::parse_iso);
        if matches!(status, "active" | "trialing") && end.is_none() {
            return Err(wire::unavailable());
        }
        // Reuse Pay's existing base entitlement policy. A past-due Stripe
        // period end can belong to an unpaid invoice and is not paid-through proof.
        let contributes =
            crate::routes::subscription_entitlements::require_subscription_grant(p, now).is_ok();
        let state = match status {
            "active" | "trialing" if contributes => "eligible",
            "active" | "trialing" | "past_due" | "unpaid" | "incomplete" => "billing_recovery",
            "canceled" | "incomplete_expired" => "base_plan_selection",
            "paused" => "unavailable",
            _ => return Err(wire::unavailable()),
        };
        if contributes {
            valid_until = valid_until.min(end.ok_or_else(wire::unavailable)?);
        }
        let target = json!({"scope":{"organizationId":a.organization,"siteId":null},"baseSubscriptionId":id});
        let mut offers = BTreeMap::new();
        for (handle, _, meter, _) in catalog::HANDLES {
            match catalog::resolve_from_catalog(&catalog, a, &target, handle) {
                Ok((offer, _)) if offer["reason"] != "terms_unapproved" => {
                    offers.insert(meter, handle);
                }
                Ok(_) => {}
                Err(e) if matches!(e.code, "offer_unavailable" | "unsupported_interval") => {}
                Err(e) => return Err(e),
            }
        }
        let mut allowances = vec![];
        if contributes {
            let approved = org.base_plan_allowances.get(&product.entry_key);
            if let Some(mapping) = approved {
                if !identifier(&mapping.approval_id) {
                    return Err(wire::unavailable());
                }
                allowances = mapping.included_allowances.clone();
            }
            if !v2 {
                for allowance in &mut allowances {
                    if allowance["meterId"]
                        .as_str()
                        .is_some_and(|meter| RETIRED_LEGACY_METERS.contains(&meter))
                    {
                        allowance["limitState"] = json!("unconfigured");
                        allowance["included"] = Value::Null;
                    }
                }
            }
            // Missing meter mappings explicitly mean unconfigured, including
            // local meters for every operator-bound canonical site.
            for (meter, unit, local) in meters {
                if v2
                    && (*meter == "managed.credits"
                        || allowances.iter().any(|a| {
                            a["siteId"].is_null()
                                && a["categories"]
                                    .as_array()
                                    .is_some_and(|c| c.iter().any(|c| c == category(meter)))
                        }))
                {
                    continue;
                }
                let scopes = if *local {
                    org.canonical_site_ids.iter().map(|id| json!(id)).collect()
                } else {
                    vec![Value::Null]
                };
                for site in scopes {
                    if !allowances
                        .iter()
                        .any(|v| v["meterId"] == *meter && v["siteId"] == site)
                    {
                        let mut unavailable = json!({"meterId":meter,"unit":unit,"limitState":"unconfigured","included":null,"siteId":site,"offerIds":[]});
                        if v2 {
                            unavailable["categories"] = json!([category(meter)]);
                            unavailable["purchasedCreditPolicy"] = json!("unconfigured");
                        }
                        allowances.push(unavailable);
                    }
                }
            }
            let mut seen = BTreeSet::new();
            for allowance in &mut allowances {
                wire::validate("BaseAllowance", allowance).map_err(|_| wire::unavailable())?;
                let meter = wire::text(allowance, "meterId")?.to_string();
                let (_, unit, local) = meters
                    .iter()
                    .find(|m| m.0 == meter)
                    .ok_or_else(wire::unavailable)?;
                let site = allowance["siteId"].as_str().map(str::to_owned);
                if allowance["unit"] != *unit
                    || (*local && !site.as_ref().is_some_and(|id| sites.contains(id)))
                    || (!local
                        && site.is_some()
                        && (!v2 || !site.as_ref().is_some_and(|id| sites.contains(id))))
                    || !seen.insert((meter.clone(), site.clone()))
                {
                    return Err(wire::unavailable());
                }
                if v2 {
                    let categories = allowance["categories"]
                        .as_array()
                        .filter(|c| !c.is_empty())
                        .ok_or_else(wire::unavailable)?;
                    for category in categories {
                        let category = category.as_str().ok_or_else(wire::unavailable)?;
                        let permitted = if meter == "managed.credits" {
                            matches!(category, "intelligence" | "search" | "blockchain" | "x-api")
                        } else {
                            category == self::category(&meter)
                        };
                        if !permitted {
                            return Err(wire::unavailable());
                        }
                        if site.is_none()
                            && category_pools
                                .insert(category.to_string(), meter.clone())
                                .is_some_and(|prior| prior != meter)
                        {
                            return Err(wire::unavailable());
                        }
                    }
                }
                // Resolve allowed offers from the approved catalog; configuration
                // cannot publish arbitrary or cross-meter handles.
                allowance["offerIds"] = if site.is_none() {
                    json!(offers.get(meter.as_str()).into_iter().collect::<Vec<_>>())
                } else {
                    json!([])
                };
                let state = wire::text(allowance, "limitState")?.to_string();
                let amount = allowance["included"].as_u64().unwrap_or(0);
                let total = totals.entry((meter, site)).or_insert((state.clone(), 0));
                if total.0 != state {
                    return Err(wire::unavailable());
                }
                total.1 = total
                    .1
                    .checked_add(amount)
                    .filter(|v| *v <= wire::MAX)
                    .ok_or_else(wire::unavailable)?;
            }
            allowances.sort_by_key(|v| (v["meterId"].to_string(), v["siteId"].to_string()));
        }
        subscriptions.push(json!({"subscriptionId":id,"subscriptionName":name,"status":state,"includedAllowances":allowances,"offerIds":offers.values().collect::<BTreeSet<_>>()}));
    }
    subscriptions.sort_by_key(|v| v["subscriptionId"].to_string());
    // Reject changed inputs rather than publishing a partial binding revision.
    let checked = db.read_keys(ids::MODEL_SUBSCRIPTIONS, &org.base_subscription_ids)?;
    if checked.len() != sources.len()
        || sources
            .iter()
            .any(|(id, row)| checked.get(id).is_none_or(|r| r.payload != row.payload))
    {
        return Err(wire::unavailable());
    }
    if !org.base_subscription_ids.is_empty() {
        let reread = store::complete_read(s, ids::MODEL_CATALOG, &Query::new())?;
        let projection = |rows: &[EntryRecord]| {
            rows.iter()
                .map(|r| (r.entry_key.clone(), r.payload.clone()))
                .collect::<BTreeMap<_, _>>()
        };
        if projection(&catalog) != projection(&reread) {
            return Err(wire::unavailable());
        }
    }
    if serde_json::to_value(config::Config::load(s)?).map_err(|_| wire::unavailable())?
        != serde_json::to_value(&a.config).map_err(|_| wire::unavailable())?
    {
        return Err(wire::unavailable());
    }
    let mut out = json!({"contractVersion":wire::VERSION,"payInstallationId":a.config.pay_installation_id,"environment":a.config.environment,"organizationId":a.organization,"subscriptions":subscriptions});
    if v2 {
        out["accountingVersion"] = json!(2);
    }
    out["bindingRevision"] = wire::digest(&out)?.into();
    out["freshness"] = json!({"state":"available","observedAt":time::iso8601(now),"validUntil":time::iso8601(valid_until)});
    if out.to_string().len() > 1_000_000 || s.now_unix_secs() >= valid_until {
        return Err(wire::unavailable());
    }
    Ok(out)
}
fn identifier(s: &str) -> bool {
    !s.trim().is_empty() && s.chars().count() <= 160
}
pub(super) fn product<'a>(catalog: &'a [EntryRecord], subscription: &Value) -> AppResult<&'a EntryRecord> {
    let direct: Vec<_> = [
        "productId",
        "product_id",
        "resource",
        "resourceId",
        "planId",
    ]
    .iter()
    .filter_map(|k| subscription[k].as_str())
    .collect();
    let price = subscription["priceId"]
        .as_str()
        .or_else(|| subscription["stripePriceId"].as_str());
    let candidates: Vec<_> = catalog
        .iter()
        .filter(|row| {
            if !direct.is_empty() {
                direct.iter().any(|id| *id == row.entry_key)
            } else {
                price.is_some_and(|id| {
                    row.entry_key == id
                        || row.payload["prices"].as_array().is_some_and(|prices| {
                            prices.iter().any(|p| {
                                ["id", "stripePriceId", "stableHandle"]
                                    .iter()
                                    .any(|k| p[k] == id)
                            })
                        })
                })
            }
        })
        .collect();
    if candidates.len() != 1 || direct.iter().any(|id| *id != candidates[0].entry_key) {
        return Err(wire::unavailable());
    }
    Ok(candidates[0])
}
