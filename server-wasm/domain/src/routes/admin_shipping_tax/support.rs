use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::ctx::RequestContext;
use crate::db::{Db, Dir, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::RouteRequest;
use crate::seams::HostSeams;
use crate::time;

pub(super) const PROFILE_KIND: &str = "shippingProfile";
pub(super) const RATE_KIND: &str = "shippingRate";
pub(super) const TAX_KIND: &str = "taxRate";

const PROFILE_PREFIX: &str = "shipping_profile:";
const RATE_PREFIX: &str = "shipping_rate:";
const TAX_PREFIX: &str = "tax_rate:";

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ShippingProfile {
    pub kind: String,
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub countries: Vec<String>,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ShippingRate {
    pub kind: String,
    pub id: String,
    pub profile_id: String,
    pub name: String,
    pub rate_type: String,
    pub amount_cents: i64,
    pub currency: String,
    pub min_subtotal: Option<i64>,
    pub max_subtotal: Option<i64>,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct TaxRate {
    pub kind: String,
    pub id: String,
    pub name: String,
    pub country: String,
    pub region: Option<String>,
    pub rate_bps: i32,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ProfileReq {
    pub id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub countries: Vec<String>,
    #[serde(default = "default_active")]
    pub active: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct RateReq {
    pub id: Option<String>,
    pub name: String,
    pub rate_type: String,
    pub amount_cents: i64,
    pub currency: String,
    pub min_subtotal: Option<i64>,
    pub max_subtotal: Option<i64>,
    #[serde(default = "default_active")]
    pub active: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct UpdateRateReq {
    pub profile_id: String,
    #[serde(flatten)]
    pub rate: RateReq,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct TaxReq {
    pub id: Option<String>,
    pub name: String,
    pub country: String,
    pub region: Option<String>,
    pub rate_bps: i32,
    #[serde(default = "default_active")]
    pub active: bool,
}

pub(super) fn profile_from_req(
    id: String,
    body: ProfileReq,
    created_at: String,
    updated_at: String,
) -> AppResult<ShippingProfile> {
    Ok(ShippingProfile {
        kind: PROFILE_KIND.into(),
        id,
        name: normalize_name(&body.name)?,
        description: body.description,
        countries: normalize_countries(&body.countries)?,
        active: body.active,
        created_at,
        updated_at,
    })
}

pub(super) fn rate_from_req(
    id: String,
    profile_id: String,
    body: RateReq,
    created_at: String,
    updated_at: String,
) -> AppResult<ShippingRate> {
    if body.amount_cents < 0 {
        return Err(AppError::bad_request("amountCents must be non-negative"));
    }
    validate_subtotals(body.min_subtotal, body.max_subtotal)?;
    Ok(ShippingRate {
        kind: RATE_KIND.into(),
        id,
        profile_id,
        name: normalize_name(&body.name)?,
        rate_type: normalize_rate_type(&body.rate_type)?,
        amount_cents: body.amount_cents,
        currency: normalize_currency(&body.currency)?,
        min_subtotal: body.min_subtotal,
        max_subtotal: body.max_subtotal,
        active: body.active,
        created_at,
        updated_at,
    })
}

pub(super) fn tax_from_req(
    id: String,
    body: TaxReq,
    created_at: String,
    updated_at: String,
) -> AppResult<TaxRate> {
    if body.rate_bps < 0 || body.rate_bps > 10000 {
        return Err(AppError::bad_request("rateBps must be between 0 and 10000"));
    }
    Ok(TaxRate {
        kind: TAX_KIND.into(),
        id,
        name: normalize_name(&body.name)?,
        country: normalize_country(&body.country)?,
        region: normalize_region(body.region),
        rate_bps: body.rate_bps,
        active: body.active,
        created_at,
        updated_at,
    })
}

pub(super) fn read_kind<S, T>(seams: &S, kind: &str, req: &RouteRequest) -> AppResult<Vec<T>>
where
    S: HostSeams,
    T: for<'de> Deserialize<'de>,
{
    let query = Query::new()
        .filter(Filter::new("kind", Op::Eq, kind))
        .order("createdAt", Dir::Desc)
        .limit(limit(req))
        .offset(offset(req));
    read_query(seams, &query)
}

pub(super) fn rates_for_profile<S: HostSeams>(
    seams: &S,
    profile_id: &str,
) -> AppResult<Vec<ShippingRate>> {
    let query = Query::new()
        .filter(Filter::new("kind", Op::Eq, RATE_KIND))
        .filter(Filter::new("profileId", Op::Eq, profile_id))
        .order("createdAt", Dir::Desc)
        .limit(1000);
    read_query(seams, &query)
}

fn read_query<S, T>(seams: &S, query: &Query) -> AppResult<Vec<T>>
where
    S: HostSeams,
    T: for<'de> Deserialize<'de>,
{
    Db::new(seams, ids::DB_ACCESS)
        .read(ids::MODEL_CATALOG, query)?
        .into_iter()
        .map(|entry| entry.parse())
        .collect()
}

pub(super) fn read_one<S, T>(seams: &S, key: &str, label: &str) -> AppResult<T>
where
    S: HostSeams,
    T: for<'de> Deserialize<'de>,
{
    Db::new(seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_CATALOG, key)?
        .ok_or_else(|| AppError::not_found(format!("{label} not found")))?
        .parse()
}

pub(super) fn ensure_absent<S: HostSeams>(seams: &S, key: &str, label: &str) -> AppResult<()> {
    if Db::new(seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_CATALOG, key)?
        .is_some()
    {
        Err(AppError::conflict(format!("{label} already exists")))
    } else {
        Ok(())
    }
}

pub(super) fn write_record<S, T>(seams: &S, key: &str, record: &T) -> AppResult<()>
where
    S: HostSeams,
    T: Serialize,
{
    Db::new(seams, ids::DB_ACCESS).write(ids::MODEL_CATALOG, key, record)?;
    Ok(())
}

pub(super) fn delete_record<S: HostSeams>(seams: &S, key: &str) -> AppResult<()> {
    Db::new(seams, ids::DB_ACCESS).delete(ids::MODEL_CATALOG, key)?;
    Ok(())
}

pub(super) fn parse_body<T: for<'de> Deserialize<'de>>(req: &RouteRequest) -> AppResult<T> {
    serde_json::from_value(req.json_body()?)
        .map_err(|e| AppError::bad_request("invalid request body").with_internal(e.to_string()))
}

pub(super) fn public_value<T: Serialize>(record: &T) -> Value {
    let mut value = serde_json::to_value(record).unwrap_or(Value::Null);
    if let Value::Object(ref mut object) = value {
        object.remove("kind");
    }
    value
}

pub(super) fn now<S: HostSeams>(seams: &S) -> String {
    time::iso8601(seams.now_unix_secs())
}

pub(super) fn body_id_or_generated<S: HostSeams>(
    seams: &S,
    ctx: &RequestContext,
    id: Option<String>,
    prefix: &str,
) -> AppResult<String> {
    if let Some(id) = id {
        return normalize_id(&id);
    }
    let seed = ctx
        .idempotency_key
        .as_deref()
        .or(ctx.request_id.as_deref())
        .map(sanitize_id)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| seams.now_unix_secs().to_string());
    Ok(format!("{prefix}-{seed}"))
}

fn sanitize_id(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.'))
        .take(80)
        .collect()
}

pub(super) fn normalize_id(value: &str) -> AppResult<String> {
    let id = value.trim();
    if id.is_empty() || id.len() > 120 {
        return Err(AppError::bad_request("id is required"));
    }
    if !id
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.'))
    {
        return Err(AppError::bad_request(
            "id may only contain letters, numbers, dash, underscore, or dot",
        ));
    }
    Ok(id.to_string())
}

fn normalize_name(value: &str) -> AppResult<String> {
    let name = value.trim();
    if name.is_empty() {
        Err(AppError::bad_request("name is required"))
    } else {
        Ok(name.to_string())
    }
}

fn normalize_country(value: &str) -> AppResult<String> {
    let country = value.trim().to_uppercase();
    if country.len() == 2 && country.chars().all(|ch| ch.is_ascii_alphabetic()) {
        Ok(country)
    } else {
        Err(AppError::bad_request(
            "country must be an ISO 3166-1 alpha-2 value",
        ))
    }
}

fn normalize_countries(countries: &[String]) -> AppResult<Vec<String>> {
    let mut values = countries
        .iter()
        .map(|country| normalize_country(country))
        .collect::<AppResult<Vec<_>>>()?;
    values.sort();
    values.dedup();
    if values.is_empty() {
        return Err(AppError::bad_request("countries must not be empty"));
    }
    Ok(values)
}

fn normalize_currency(value: &str) -> AppResult<String> {
    let currency = value.trim().to_uppercase();
    if currency.len() == 3 && currency.chars().all(|ch| ch.is_ascii_alphabetic()) {
        Ok(currency)
    } else {
        Err(AppError::bad_request(
            "currency must be a 3-letter ISO code",
        ))
    }
}

fn normalize_rate_type(value: &str) -> AppResult<String> {
    let rate_type = value.trim().to_lowercase();
    match rate_type.as_str() {
        "flat" | "price" | "weight" => Ok(rate_type),
        _ => Err(AppError::bad_request(
            "rateType must be 'flat', 'price', or 'weight'",
        )),
    }
}

fn normalize_region(region: Option<String>) -> Option<String> {
    region.and_then(|value| {
        let value = value.trim();
        (!value.is_empty()).then(|| value.to_uppercase())
    })
}

fn validate_subtotals(min: Option<i64>, max: Option<i64>) -> AppResult<()> {
    if min.is_some_and(|value| value < 0) || max.is_some_and(|value| value < 0) {
        return Err(AppError::bad_request(
            "subtotal bounds must be non-negative",
        ));
    }
    if let (Some(min), Some(max)) = (min, max) {
        if min > max {
            return Err(AppError::bad_request(
                "minSubtotal cannot exceed maxSubtotal",
            ));
        }
    }
    Ok(())
}

fn default_active() -> bool {
    true
}

fn limit(req: &RouteRequest) -> i64 {
    req.query_value("limit")
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(50)
        .clamp(0, 100)
}

fn offset(req: &RouteRequest) -> i64 {
    req.query_value("offset")
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(0)
        .max(0)
}

pub(super) fn path_id(path: &str, prefix: &str) -> AppResult<String> {
    let index = path
        .rfind(prefix)
        .ok_or_else(|| AppError::not_found("unknown shipping/tax route"))?;
    let id = &path[index + prefix.len()..];
    if id.is_empty() || id.contains('/') {
        return Err(AppError::not_found("unknown shipping/tax route"));
    }
    normalize_id(id)
}

pub(super) fn nested_path_id(path: &str, prefix: &str, suffix: &str) -> AppResult<String> {
    let index = path
        .rfind(prefix)
        .ok_or_else(|| AppError::not_found("unknown shipping/tax route"))?;
    let tail = &path[index + prefix.len()..];
    let id = tail
        .strip_suffix(suffix)
        .ok_or_else(|| AppError::not_found("unknown shipping/tax route"))?;
    if id.is_empty() || id.contains('/') {
        return Err(AppError::not_found("unknown shipping/tax route"));
    }
    normalize_id(id)
}

pub(super) fn profile_key(id: &str) -> String {
    format!("{PROFILE_PREFIX}{id}")
}

pub(super) fn rate_key(id: &str) -> String {
    format!("{RATE_PREFIX}{id}")
}

pub(super) fn tax_key(id: &str) -> String {
    format!("{TAX_PREFIX}{id}")
}
