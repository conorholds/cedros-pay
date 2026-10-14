use std::collections::BTreeMap;

use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::auth;
use crate::ctx::RequestContext;
use crate::db::{Db, Dir, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::RouteRequest;
use crate::routes::products::{is_capacity_handle, is_capacity_product};
use crate::routes::stripe_session::is_plausible_email;
use crate::seams::HostSeams;
use crate::stripe::{api, checkout_api};
use crate::time;

use super::solana_config::resolved_solana_plan;
#[path = "subscription_selection_support_catalog.rs"]
mod catalog;
use catalog::{payment_methods_for_plan, product_plan, settings_plan};
#[path = "subscription_selection_support_values.rs"]
mod values;
use values::*;

pub(super) const SETTINGS_KEY: &str = "subscriptions.settings";

const FREE_SELECTION_YEARS: i64 = 100;
const MAX_METADATA_PAIRS: usize = 20;
const MAX_METADATA_KEY: usize = 40;
const MAX_METADATA_VALUE: usize = 500;
const LOGIN_EXTENSION_ID: &str = "cedros-login";
const CLAIM_SUBSCRIPTION_READ: &str = "cedros-pay:subscription-read";

pub(super) fn requested_selection_user<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
) -> AppResult<String> {
    let requested = req
        .query_value("userId")
        .filter(|id| !id.trim().is_empty())
        .ok_or_else(|| AppError::bad_request("userId is required"))?;
    let ctx = RequestContext::parse(&req.context_json);
    let exact_login_service = ctx.authenticated
        && ctx.auth_scheme.as_deref() == Some("extension-service")
        && ctx.actor_id.as_deref() == Some(LOGIN_EXTENSION_ID)
        && ctx.principal_id.as_deref() == Some(LOGIN_EXTENSION_ID)
        && ctx.permission_claims == [CLAIM_SUBSCRIPTION_READ];
    if exact_login_service {
        return Ok(requested.to_string());
    }

    let buyer = auth::verify_buyer(seams, req)?;
    require_same_user(requested, &buyer.user_id)?;
    Ok(buyer.user_id)
}

#[derive(Clone)]
pub(super) struct ResolvedPlan {
    pub(super) id: String,
    pub(super) price_id: Option<String>,
    pub(super) title: String,
    description: String,
    pub(super) price_cents: i64,
    pub(super) currency: String,
    pub(super) interval: String,
    pub(super) interval_count: i64,
    pub(super) trial_days: Option<i64>,
    sort_order: i64,
    pub(super) active: bool,
    pub(super) public: bool,
    pub(super) purchasable: bool,
    stripe_inline: bool,
    account_model: Option<String>,
    program: Option<String>,
    public_on_main_pricing_page: Option<bool>,
    public_on_developer_page: Option<bool>,
    pub(super) stripe_price_id: Option<String>,
    pub(super) solana: Option<ResolvedSolanaPlan>,
}

#[derive(Clone)]
pub(super) struct ResolvedSolanaPlan {
    pub(super) plan_id: u64,
    pub(super) merchant_address: String,
    pub(super) token_mint: String,
    pub(super) token_program_address: Option<String>,
    pub(super) receiver_token_account: Option<String>,
    pub(super) collector_address: Option<String>,
    pub(super) amount_atomic: i64,
    pub(super) period_hours: u64,
    pub(super) plan_address: Option<String>,
    pub(super) program_address: Option<String>,
    pub(super) expected_created_at: Option<i64>,
    pub(super) expected_subscription_authority_init_id: Option<i64>,
}

pub(super) fn resolve_plan<S: HostSeams>(
    seams: &S,
    plan_id: &str,
    interval: &str,
) -> AppResult<ResolvedPlan> {
    let plan_id = plan_id.trim();
    if plan_id.is_empty() {
        return Err(AppError::unprocessable("planId is required"));
    }
    if is_capacity_handle(plan_id) {
        return Err(AppError::unprocessable(
            "capacity add-ons are not base plans",
        ));
    }
    if let Some(product) = Db::new(seams, ids::DB_ACCESS).read_one(ids::MODEL_CATALOG, plan_id)? {
        if is_capacity_product(&product.payload) {
            return Err(AppError::unprocessable(
                "capacity add-ons are not base plans",
            ));
        }
        if let Some(plan) = product_plan(&product.payload, interval) {
            return Ok(plan);
        }
    }
    if let Some(settings) = load_settings(seams)? {
        if !bool_field(&settings, "enabled").unwrap_or(false) {
            return Err(AppError::unprocessable("subscriptions are disabled"));
        }
        return settings
            .get("plans")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .find(|plan| string_field(plan, "id").as_deref() == Some(plan_id))
            .and_then(|plan| settings_plan(plan, interval))
            .ok_or_else(plan_not_found);
    }
    Err(plan_not_found())
}

pub(super) fn load_settings<S: HostSeams>(seams: &S) -> AppResult<Option<Value>> {
    match seams.setting_get(SETTINGS_KEY)? {
        Some(raw) => serde_json::from_str(&raw)
            .map(Some)
            .map_err(|e| malformed_settings(e.to_string())),
        None => Ok(None),
    }
}

pub(super) fn settings_plans<S: HostSeams>(
    seams: &S,
    settings: &Value,
    interval: &str,
) -> AppResult<Vec<ResolvedPlan>> {
    let mut plans = settings
        .get("plans")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|plan| settings_plan(plan, interval))
        .filter(|plan| plan.active && plan.public && plan.purchasable)
        .collect::<Vec<_>>();
    plans.sort_by_key(|plan| plan.sort_order);
    let db = Db::new(seams, ids::DB_ACCESS);
    let mut base_plans = Vec::new();
    for plan in plans {
        if db
            .read_one(ids::MODEL_CATALOG, &plan.id)?
            .is_some_and(|entry| is_capacity_product(&entry.payload))
        {
            continue;
        }
        base_plans.push(plan);
    }
    Ok(base_plans)
}

pub(super) fn include_complimentary_plans<S: HostSeams>(
    seams: &S,
    mut plans: Vec<ResolvedPlan>,
    settings: Option<&Value>,
    interval: &str,
) -> AppResult<Vec<ResolvedPlan>> {
    // Paid catalog plans are authoritative; enabled complimentary settings
    // plans may coexist but cannot shadow catalog pricing or revive paid seeds.
    if let Some(settings) = settings.filter(|value| bool_field(value, "enabled") == Some(true)) {
        for plan in settings_plans(seams, settings, interval)? {
            if plan.price_cents == 0 && !plans.iter().any(|existing| existing.id == plan.id) {
                plans.push(plan);
            }
        }
    }
    plans.sort_by_key(|plan| plan.sort_order);
    Ok(plans)
}

pub(super) fn product_plans<S: HostSeams>(
    seams: &S,
    interval: &str,
) -> AppResult<Vec<ResolvedPlan>> {
    let query = Query::new()
        .filter(Filter::new("active", Op::Eq, true))
        .order("sortOrder", Dir::Asc)
        .limit(100);
    let mut plans = Db::new(seams, ids::DB_ACCESS)
        .read(ids::MODEL_CATALOG, &query)?
        .iter()
        .filter_map(|entry| product_plan(&entry.payload, interval))
        .filter(|plan| plan.active && plan.public && plan.purchasable)
        .collect::<Vec<_>>();
    plans.sort_by_key(|plan| plan.sort_order);
    Ok(plans)
}

pub(super) fn selectable_plans(plans: Vec<ResolvedPlan>) -> Vec<Value> {
    plans
        .into_iter()
        .map(|plan| {
            json!({
                "planId": plan.id,
                "resource": plan.id,
                "priceId": plan.price_id,
                "displayName": plan.title,
                "description": plan.description,
                "priceCents": plan.price_cents,
                "currency": plan.currency,
                "interval": plan.interval,
                "intervalCount": plan.interval_count,
                "trialDays": plan.trial_days,
                "sortOrder": plan.sort_order,
                "active": plan.active,
                "public": plan.public,
                "purchasable": plan.purchasable,
                "accountModel": plan.account_model,
                "program": plan.program,
                "publicOnMainPricingPage": plan.public_on_main_pricing_page,
                "publicOnDeveloperPage": plan.public_on_developer_page,
                "free": plan.price_cents == 0,
                "paymentMethods": payment_methods_for_plan(&plan),
            })
        })
        .collect()
}

pub(super) fn subscription_rows_for_user<S: HostSeams>(
    seams: &S,
    user_id: &str,
) -> AppResult<Vec<Value>> {
    let db = Db::new(seams, ids::DB_ACCESS);
    let mut seen = BTreeMap::new();
    for field in ["customerRef", "userId", "cedrosLoginUserId"] {
        let query = Query::new()
            .filter(Filter::new(field, Op::Eq, user_id))
            .order("updatedAt", Dir::Desc)
            .limit(100);
        for entry in db.read(ids::MODEL_SUBSCRIPTIONS, &query)? {
            seen.insert(entry.entry_key, entry.payload);
        }
    }
    Ok(seen.into_values().collect())
}

pub(super) fn existing_free_selection<S: HostSeams>(
    seams: &S,
    user_id: &str,
    plan_id: &str,
) -> AppResult<Option<Value>> {
    Ok(subscription_rows_for_user(seams, user_id)?
        .into_iter()
        .find(|row| {
            string_field(row, "paymentMethod").as_deref() == Some("free")
                && plan_matches(row, plan_id)
                && selection_complete(row, seams.now_unix_secs())
        }))
}

pub(super) fn selection_complete(row: &Value, now: i64) -> bool {
    matches!(
        string_field(row, "status").as_deref(),
        Some("active" | "trialing")
    ) && string_field(row, "currentPeriodEnd")
        .and_then(|end| time::parse_iso(&end))
        .map(|end| end > now)
        .unwrap_or(false)
}

pub(super) fn selection_response(row: &Value, complete: bool) -> Value {
    let payment = string_field(row, "paymentMethod").unwrap_or_else(|| provider_payment(row));
    let status = if complete && payment == "free" {
        "free_selected".to_string()
    } else {
        string_field(row, "status").unwrap_or_else(|| "incomplete".to_string())
    };
    json!({
        "selection": if complete { "complete" } else { "incomplete" },
        "complete": complete,
        "status": status,
        "planId": first_string(row, &["planId", "productId", "priceId"]),
        "resource": first_string(row, &["productId", "planId", "priceId"]),
        "subscriptionId": string_field(row, "subscriptionId"),
        "paymentMethod": payment,
        "currentPeriodEnd": string_field(row, "currentPeriodEnd"),
        "cancelAtPeriodEnd": bool_field(row, "cancelAtPeriodEnd"),
    })
}

pub(super) fn incomplete_response() -> Value {
    json!({
        "selection": "incomplete",
        "complete": false,
        "status": "no_selection",
    })
}

pub(super) fn free_selection_record(user_id: &str, plan_id: &str, now: i64) -> (String, Value) {
    let subscription_id = stable_free_subscription_id(user_id, plan_id);
    let record = json!({
        "subscriptionId": subscription_id,
        "customerRef": user_id,
        "priceId": plan_id,
        "status": "active",
        "provider": "free",
        "providerRef": subscription_id,
        "currentPeriodEnd": time::iso8601(now + FREE_SELECTION_YEARS * 365 * 24 * 60 * 60),
        "cancelAtPeriodEnd": false,
        "createdAt": time::iso8601(now),
        "updatedAt": time::iso8601(now),
        "planId": plan_id,
        "productId": plan_id,
        "paymentMethod": "free",
    });
    (subscription_id, record)
}

pub(super) fn validate_paid_request<T: PlanStripeSessionLike>(req: &T) -> AppResult<()> {
    if let Some(email) = req.customer_email() {
        if !is_plausible_email(email) {
            return Err(AppError::unprocessable("invalid customer email"));
        }
    }
    if let Some(code) = req.coupon_code() {
        validate_coupon(code)?;
    }
    validate_metadata(req.metadata())
}

pub(super) trait PlanStripeSessionLike {
    fn customer_email(&self) -> Option<&str>;
    fn coupon_code(&self) -> Option<&str>;
    fn metadata(&self) -> Option<&BTreeMap<String, String>>;
}

pub(super) fn promotion_code_id<S: HostSeams>(
    seams: &S,
    secret_key: &str,
    code: Option<&str>,
) -> AppResult<Option<String>> {
    let Some(code) = code.map(str::trim).filter(|code| !code.is_empty()) else {
        return Ok(None);
    };
    let raw = seams.http_fetch(
        &checkout_api::build_promotion_code_lookup_fetch(secret_key, code).to_string(),
    )?;
    let (status, body) = api::unwrap_fetch(&raw).map_err(provider_error)?;
    checkout_api::parse_promotion_code_id(status, &body)
        .map_err(provider_error)?
        .ok_or_else(|| AppError::unprocessable("couponCode was not found"))
        .map(Some)
}

pub(super) fn checkout_metadata(
    user_id: &str,
    plan_id: &str,
    request_metadata: Option<BTreeMap<String, String>>,
) -> Vec<(String, String)> {
    let mut metadata = BTreeMap::from([
        ("user_id".to_string(), user_id.to_string()),
        ("user_id_trusted".to_string(), "true".to_string()),
        ("plan_id".to_string(), plan_id.to_string()),
        (
            "subscription_selection".to_string(),
            "required_gate".to_string(),
        ),
    ]);
    if let Some(request_metadata) = request_metadata {
        for (key, value) in request_metadata {
            // Offer terms belong to the verified Login grant, never checkout input.
            if key.starts_with("invite_discount_") || key == "discount_stacking" {
                continue;
            }
            metadata.entry(key).or_insert(value);
        }
    }
    metadata.into_iter().collect()
}

pub(super) fn normalize_interval(interval: Option<&str>) -> AppResult<&'static str> {
    match interval.unwrap_or("monthly").to_ascii_lowercase().as_str() {
        "month" | "monthly" => Ok("monthly"),
        "year" | "yearly" | "annual" => Ok("yearly"),
        _ => Err(AppError::unprocessable(
            "interval must be monthly or yearly",
        )),
    }
}

pub(super) fn require_match(req: &RouteRequest, method: &str, path: &str) -> AppResult<()> {
    if crate::routes::matches(req, method, path) {
        Ok(())
    } else {
        Err(AppError::not_found("unknown subscription selection route"))
    }
}

pub(super) fn parse_body<T: for<'de> Deserialize<'de>>(req: &RouteRequest) -> AppResult<T> {
    serde_json::from_value(req.json_body()?)
        .map_err(|e| AppError::unprocessable("invalid request body").with_internal(e.to_string()))
}

pub(super) fn require_same_user(requested: &str, verified: &str) -> AppResult<()> {
    if requested == verified {
        Ok(())
    } else {
        Err(AppError::unauthorized(
            "userId does not match authenticated user",
        ))
    }
}

pub(super) fn stripe_key<S: HostSeams>(seams: &S) -> AppResult<String> {
    seams
        .secret_get(ids::SECRET_STRIPE_KEY)?
        .filter(|key| !key.is_empty())
        .ok_or_else(|| AppError::new(503, "unavailable", "Stripe is not configured"))
}

pub(super) fn provider_error(message: String) -> AppError {
    AppError::new(
        502,
        "provider_unavailable",
        "could not create the subscription session",
    )
    .with_internal(message)
}

fn validate_metadata(metadata: Option<&BTreeMap<String, String>>) -> AppResult<()> {
    let Some(metadata) = metadata else {
        return Ok(());
    };
    if metadata.len() > MAX_METADATA_PAIRS {
        return Err(AppError::unprocessable("metadata has too many fields"));
    }
    for (key, value) in metadata {
        if key.is_empty() || key.len() > MAX_METADATA_KEY || value.len() > MAX_METADATA_VALUE {
            return Err(AppError::unprocessable("metadata field is too large"));
        }
    }
    Ok(())
}
