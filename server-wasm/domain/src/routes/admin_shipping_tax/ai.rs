//! Bounded physical storefront setup with the existing shipping validators.
use super::support::*;
use crate::{
    ctx::RequestContext,
    db::{BatchOp, Db, Dir, EntryRecord, Filter, Op, Query},
    error::{AppError, AppResult},
    guarded_batch::{GuardedBatchOutcome, GuardedCondition},
    ids,
    reqresp::{RouteRequest, RouteResponse},
    seams::HostSeams,
};
use serde::Deserialize;
use serde_json::{json, Value};

pub const QUERY: &str = "cedros-pay:ai-shipping-setup-query";
pub const PROFILE_SAVE: &str = "cedros-pay:ai-shipping-profile-save";
pub const RATE_SAVE: &str = "cedros-pay:ai-shipping-rate-save";
const FIAT: &[&str] = &[
    "USD", "EUR", "GBP", "AUD", "CAD", "NZD", "CHF", "SGD", "HKD",
];

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct QueryInput {
    profile_id: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
    rate_offset: Option<i64>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProfileInput {
    expected_version: Option<String>,
    profile: Value,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RateInput {
    profile_id: String,
    expected_profile_version: String,
    expected_version: Option<String>,
    rate: Value,
}

pub(super) fn is_route(id: &str) -> bool {
    matches!(id, QUERY | PROFILE_SAVE | RATE_SAVE)
}
pub(super) fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let path = match req.route_id.as_str() {
        QUERY => "/admin/assistant/shipping/query",
        PROFILE_SAVE => "/admin/assistant/shipping/profile",
        RATE_SAVE => "/admin/assistant/shipping/rate",
        _ => return Err(AppError::not_found("unknown shipping capability")),
    };
    if !crate::routes::matches(req, "POST", path)
        || !req.query.is_empty()
        || req.body.len() > 64 * 1024
    {
        return Err(AppError::bad_request("invalid shipping capability request"));
    }
    let ctx = RequestContext::parse(&req.context_json);
    ctx.require_claim_or_capability(ids::ROUTE_ADMIN, &req.route_id)?;
    ctx.require_site_id()?;
    if req.route_id == QUERY {
        return query(seams, req);
    }
    ctx.require_admin_write_or_capability(&req.route_id)?;
    crate::guarded_policy::require_active(seams)?;
    let db = Db::new(seams, ids::DB_ACCESS);
    if req.route_id == PROFILE_SAVE {
        let input: ProfileInput = parse(req)?;
        fields(
            &input.profile,
            &["id", "name", "description", "countries", "active"],
        )?;
        bounded_name(&input.profile)?;
        if input.profile["countries"]
            .as_array()
            .is_none_or(|c| c.is_empty() || c.len() > 250)
        {
            return Err(AppError::bad_request(
                "one to 250 shipping countries required",
            ));
        }
        let preserve_description = input.profile.get("description").is_none();
        let mut body: ProfileReq = serde_json::from_value(input.profile)
            .map_err(|_| AppError::bad_request("invalid shipping profile"))?;
        let id = normalize_id(
            body.id
                .as_deref()
                .ok_or_else(|| AppError::bad_request("profile id required"))?,
        )?;
        let key = profile_key(&id);
        let existing = db.read_one(ids::MODEL_CATALOG, &key)?;
        let created = existing.is_none();
        let created_at = created_at(&existing, PROFILE_KIND)?;
        if preserve_description {
            body.description = existing
                .as_ref()
                .and_then(|entry| entry.payload["description"].as_str().map(str::to_string));
        }
        let profile = profile_from_req(
            id,
            body,
            created_at.unwrap_or_else(|| now(seams)),
            now(seams),
        )?;
        let condition = condition(&key, existing.as_ref(), input.expected_version.as_deref())?;
        save(
            &db,
            &key,
            preserve_private_fields(
                existing.as_ref(),
                serde_json::to_value(&profile).map_err(|_| invalid())?,
            )?,
            vec![condition],
        )?;
        return bounded(json!({"created":created,"profile":versioned(&db,&key)?}));
    }
    let input: RateInput = parse(req)?;
    let profile_id = normalize_id(&input.profile_id)?;
    let profile_entry = db
        .read_one(ids::MODEL_CATALOG, &profile_key(&profile_id))?
        .ok_or_else(|| AppError::unprocessable("create a shipping profile first"))?;
    let profile: ShippingProfile = profile_entry.parse()?;
    if !profile.active || profile.kind != PROFILE_KIND || profile.id != profile_id {
        return Err(AppError::unprocessable(
            "activate the selected shipping profile first",
        ));
    }
    let profile_condition = condition(
        &profile_key(&profile_id),
        Some(&profile_entry),
        Some(&input.expected_profile_version),
    )?;
    fields(
        &input.rate,
        &[
            "id",
            "name",
            "rateType",
            "amountCents",
            "currency",
            "minSubtotal",
            "maxSubtotal",
            "active",
        ],
    )?;
    bounded_name(&input.rate)?;
    let body: RateReq = serde_json::from_value(input.rate)
        .map_err(|_| AppError::bad_request("invalid shipping rate"))?;
    if body.rate_type != "flat"
        || !FIAT.contains(&body.currency.as_str())
        || !(0..=100_000_000).contains(&body.amount_cents)
    {
        return Err(AppError::unprocessable(
            "only bounded flat shipping rates in supported fiat currencies are available",
        ));
    }
    let id = normalize_id(
        body.id
            .as_deref()
            .ok_or_else(|| AppError::bad_request("rate id required"))?,
    )?;
    let key = rate_key(&id);
    let existing = db.read_one(ids::MODEL_CATALOG, &key)?;
    if existing
        .as_ref()
        .is_some_and(|e| e.payload["profileId"] != profile_id)
    {
        return Err(AppError::conflict(
            "a rate cannot be moved to another shipping profile",
        ));
    }
    let created = existing.is_none();
    let created_at = created_at(&existing, RATE_KIND)?;
    let rate = rate_from_req(
        id,
        profile_id,
        body,
        created_at.unwrap_or_else(|| now(seams)),
        now(seams),
    )?;
    let rate_condition = condition(&key, existing.as_ref(), input.expected_version.as_deref())?;
    save(
        &db,
        &key,
        preserve_private_fields(
            existing.as_ref(),
            serde_json::to_value(&rate).map_err(|_| invalid())?,
        )?,
        vec![profile_condition, rate_condition],
    )?;
    bounded(json!({"created":created,"rate":versioned(&db,&key)?}))
}
fn query<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let input: QueryInput = parse(req)?;
    let limit = input.limit.unwrap_or(25);
    let offset = input.offset.unwrap_or(0);
    let rate_offset = input.rate_offset.unwrap_or(0);
    if !(1..=100).contains(&limit)
        || !(0..=10000).contains(&offset)
        || !(0..=10000).contains(&rate_offset)
    {
        return Err(AppError::bad_request("shipping pagination out of bounds"));
    }
    let db = Db::new(seams, ids::DB_ACCESS);
    if let Some(id) = input.profile_id {
        let id = normalize_id(&id)?;
        let key = profile_key(&id);
        let Some(entry) = db.read_one(ids::MODEL_CATALOG, &key)? else {
            return bounded(
                json!({"status":"missing","profiles":[],"rates":[],"canCreatePhysicalProduct":false,"hasActiveFlatRates":false,"nextAction":"Create a shipping profile with explicitly approved countries."}),
            );
        };
        let profile: ShippingProfile = entry.parse()?;
        if profile.kind != PROFILE_KIND || profile.id != id {
            return Err(invalid());
        }
        let base = Query::new()
            .filter(Filter::new("kind", Op::Eq, RATE_KIND))
            .filter(Filter::new("profileId", Op::Eq, id.clone()));
        let total = db.count(ids::MODEL_CATALOG, &base)?;
        let entries = db.read(
            ids::MODEL_CATALOG,
            &base.order("id", Dir::Asc).limit(limit).offset(rate_offset),
        )?;
        let active_query = Query::new()
            .filter(Filter::new("kind", Op::Eq, RATE_KIND))
            .filter(Filter::new("profileId", Op::Eq, id))
            .filter(Filter::new("active", Op::Eq, true))
            .filter(Filter::new("rateType", Op::Eq, "flat"));
        let mut active = false;
        for currency in FIAT {
            if db.count(
                ids::MODEL_CATALOG,
                &active_query
                    .clone()
                    .filter(Filter::new("currency", Op::Eq, *currency)),
            )? > 0
            {
                active = true;
                break;
            }
        }
        let rates = entries
            .into_iter()
            .map(|entry| {
                let rate: ShippingRate = entry.parse()?;
                let mut value = public_value(&rate);
                value["catalogVersion"] = json!(entry.version);
                Ok(value)
            })
            .collect::<AppResult<Vec<_>>>()?;
        let mut value = public_value(&profile);
        value["catalogVersion"] = json!(entry.version);
        let status = if !profile.active {
            "inactive"
        } else if !active {
            "rates_required"
        } else {
            "configured"
        };
        return bounded(
            json!({"status":status,"profiles":[value],"rates":rates,"ratesTotal":total,"hasMoreRates":rate_offset+limit<total,"canCreatePhysicalProduct":profile.active,"hasActiveFlatRates":active,"nextAction":if !profile.active{"Activate the reviewed shipping profile."}else if !active{"Configure an approved flat shipping rate before accepting shipped orders."}else{"Select the returned profile ID; inspect currencies, countries and subtotal bounds for the product."}}),
        );
    }
    let base = Query::new().filter(Filter::new("kind", Op::Eq, PROFILE_KIND));
    let total = db.count(ids::MODEL_CATALOG, &base)?;
    let entries = db.read(
        ids::MODEL_CATALOG,
        &base.order("id", Dir::Asc).limit(limit).offset(offset),
    )?;
    let profiles = entries
        .into_iter()
        .map(|entry| {
            let profile: ShippingProfile = entry.parse()?;
            let mut value = public_value(&profile);
            value["catalogVersion"] = json!(entry.version);
            Ok(value)
        })
        .collect::<AppResult<Vec<_>>>()?;
    bounded(
        json!({"status":if total==0{"missing"}else{"choose_profile"},"profiles":profiles,"total":total,"hasMore":offset+limit<total,"nextAction":if total==0{"Create an approved shipping profile and flat shipping rate."}else{"Read the selected returned profile ID to inspect readiness and rates; do not guess an ID."}}),
    )
}
fn condition(
    key: &str,
    existing: Option<&EntryRecord>,
    expected: Option<&str>,
) -> AppResult<GuardedCondition> {
    match (existing, expected) {
        (None, None) => Ok(GuardedCondition::Absent {
            content_model_id: ids::MODEL_CATALOG,
            entry_key: key.into(),
        }),
        (Some(entry), Some(v))
            if !v.is_empty() && v.len() <= 200 && entry.version.as_deref() == Some(v) =>
        {
            Ok(GuardedCondition::Version {
                content_model_id: ids::MODEL_CATALOG,
                entry_key: key.into(),
                expected_version: v.into(),
            })
        }
        _ => Err(AppError::conflict(
            "shipping configuration changed; read and approve its current version",
        )),
    }
}
fn save<S: HostSeams>(
    db: &Db<'_, S>,
    key: &str,
    value: Value,
    conditions: Vec<GuardedCondition>,
) -> AppResult<()> {
    match db.guarded_batch(
        &conditions,
        &[BatchOp::Write {
            content_model_id: ids::MODEL_CATALOG,
            entry_key: key.into(),
            data: value,
        }],
    )? {
        GuardedBatchOutcome::Applied { .. } => Ok(()),
        GuardedBatchOutcome::Conflict { .. } => Err(AppError::conflict(
            "shipping configuration changed during save",
        )),
    }
}
fn versioned<S: HostSeams>(db: &Db<'_, S>, key: &str) -> AppResult<Value> {
    let entry = db.read_one(ids::MODEL_CATALOG, key)?.ok_or_else(invalid)?;
    let mut value = match entry.payload["kind"].as_str() {
        Some(PROFILE_KIND) => public_value(&entry.parse::<ShippingProfile>()?),
        Some(RATE_KIND) => public_value(&entry.parse::<ShippingRate>()?),
        _ => return Err(invalid()),
    };
    value["catalogVersion"] = json!(entry.version);
    Ok(value)
}
fn preserve_private_fields(existing: Option<&EntryRecord>, value: Value) -> AppResult<Value> {
    let mut merged = existing
        .and_then(|entry| entry.payload.as_object())
        .cloned()
        .unwrap_or_default();
    merged.extend(value.as_object().ok_or_else(invalid)?.clone());
    Ok(Value::Object(merged))
}
fn created_at(existing: &Option<EntryRecord>, kind: &str) -> AppResult<Option<String>> {
    existing
        .as_ref()
        .map(|entry| {
            if entry.payload["kind"] != kind {
                return Err(invalid());
            }
            entry.payload["createdAt"]
                .as_str()
                .map(str::to_string)
                .ok_or_else(invalid)
        })
        .transpose()
}
fn fields(value: &Value, allowed: &[&str]) -> AppResult<()> {
    if value
        .as_object()
        .is_none_or(|o| o.keys().any(|k| !allowed.contains(&k.as_str())))
    {
        return Err(AppError::bad_request("unsupported shipping field"));
    }
    Ok(())
}
fn bounded_name(value: &Value) -> AppResult<()> {
    if value["name"]
        .as_str()
        .is_none_or(|n| n.is_empty() || n.len() > 200)
        || value
            .get("description")
            .and_then(Value::as_str)
            .is_some_and(|d| d.len() > 2000)
    {
        return Err(AppError::bad_request(
            "invalid shipping name or description",
        ));
    }
    Ok(())
}
fn parse<T: serde::de::DeserializeOwned>(req: &RouteRequest) -> AppResult<T> {
    serde_json::from_value(req.json_body()?)
        .map_err(|_| AppError::bad_request("invalid shipping input"))
}
fn invalid() -> AppError {
    AppError::unprocessable("shipping record is unavailable or invalid")
}
fn bounded(value: Value) -> AppResult<RouteResponse> {
    if serde_json::to_vec(&value).map_err(|_| invalid())?.len() > 512 * 1024 {
        return Err(AppError::unprocessable("shipping response exceeds budget"));
    }
    Ok(RouteResponse::ok(&value))
}

#[cfg(test)]
#[path = "ai_tests.rs"]
mod tests;
