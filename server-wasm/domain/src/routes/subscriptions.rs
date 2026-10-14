//! Recurring billing via Stripe over `http.fetch`.
//!
//! The `/subscription/v1/*` service surface requires Pay's relying-party
//! credential. The `/paywall/v1/subscription/*` buyer surface instead verifies
//! the customer's Cedros Login session and subscription ownership inside Pay.
//! Subscription records are kept in the `cedros-pay:subscriptions` content
//! model and created/canceled through Stripe with the request idempotency key.

use serde::Deserialize;
use serde_json::json;

use crate::crm_events;
use crate::ctx::RequestContext;
use crate::db::{Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::models::SubscriptionRecord;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::{analytics_events, entitlements, matches, verify_relying_party};
use crate::seams::HostSeams;
use crate::stripe::api;
use crate::time;

#[path = "subscriptions_create.rs"]
mod create_flow;
use create_flow::create;

#[path = "subscription_portal_discount.rs"]
mod portal_discount;

pub const ROUTES: &[RouteSpec] = &[
    RouteSpec {
        route_id: ids::ROUTE_SUBSCRIPTIONS_STATUS,
        method: "GET",
        path: "/subscription/v1/status",
    },
    RouteSpec {
        route_id: ids::ROUTE_SUBSCRIPTIONS_CREATE,
        method: "POST",
        path: "/subscription/v1/create",
    },
    RouteSpec {
        route_id: ids::ROUTE_SUBSCRIPTIONS_CANCEL,
        method: "POST",
        path: "/subscription/v1/cancel",
    },
    RouteSpec {
        route_id: ids::ROUTE_SUBSCRIPTIONS_PORTAL,
        method: "POST",
        path: "/subscription/v1/portal",
    },
    RouteSpec {
        route_id: ids::ROUTE_BUYER_SUBSCRIPTION_CANCEL,
        method: "POST",
        path: "/paywall/v1/subscription/cancel",
    },
    RouteSpec {
        route_id: ids::ROUTE_BUYER_SUBSCRIPTION_PORTAL,
        method: "POST",
        path: "/paywall/v1/subscription/portal",
    },
];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    crate::native_storefront_policy::require_request(seams, req)?;
    if matches(req, "GET", "/subscription/v1/status") {
        verify_relying_party(seams, req)?;
        status(seams, req)
    } else if matches(req, "POST", "/subscription/v1/create") {
        verify_relying_party(seams, req)?;
        create(seams, req)
    } else if matches(req, "POST", "/subscription/v1/cancel") {
        verify_relying_party(seams, req)?;
        cancel(seams, req)
    } else if matches(req, "POST", "/subscription/v1/portal") {
        verify_relying_party(seams, req)?;
        portal(seams, req)
    } else if matches(req, "POST", "/paywall/v1/subscription/cancel") {
        let buyer = crate::auth::verify_buyer(seams, req)?;
        cancel_for_buyer(seams, req, &buyer.user_id)
    } else if matches(req, "POST", "/paywall/v1/subscription/portal") {
        let buyer = crate::auth::verify_buyer(seams, req)?;
        portal_for_buyer(seams, req, &buyer.user_id)
    } else {
        Err(AppError::not_found("unknown subscription route"))
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PortalReq {
    subscription_id: String,
    return_url: String,
}

/// `POST /subscription/v1/portal` — open a Stripe Customer Billing Portal session so the
/// buyer can self-manage their subscription (change plan, update payment method, view
/// invoices, cancel) on Stripe's hosted page. Returns `{ url }` to redirect to.
fn portal<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let body: PortalReq = serde_json::from_value(req.json_body()?).map_err(|e| {
        AppError::unprocessable("invalid request body").with_internal(e.to_string())
    })?;
    portal_with_body(seams, req, body, None)
}

fn portal_with_body<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    body: PortalReq,
    buyer_id: Option<&str>,
) -> AppResult<RouteResponse> {
    let subscription_id = body.subscription_id.trim();
    if !api::valid_subscription_id(subscription_id) {
        return Err(AppError::unprocessable("subscriptionId is invalid"));
    }
    let return_url = body.return_url.trim();
    if !return_url.starts_with("https://") {
        return Err(AppError::unprocessable("returnUrl must be an https URL"));
    }
    let db = Db::new(seams, ids::DB_ACCESS);
    let row = load_row(&db, subscription_id)?;
    if let Some(user_id) = buyer_id {
        require_buyer_subscription(&row, user_id)?;
    }
    let record: SubscriptionRecord = row.parse()?;
    require_stripe_subscription(&record, subscription_id)?;
    let idempotency_key = required_idempotency_key(req, None)?;
    let key = stripe_key(seams)?;
    let provider_key = crate::routes::checkout_claim::scoped_provider_key(
        &RequestContext::parse(&req.context_json),
        "subscription-portal",
        &idempotency_key,
    )?;
    let claim = crate::routes::subscription_store::claim(
        &db,
        "portal",
        &idempotency_key,
        json!({ "providerIdempotencyKey": provider_key, "subscriptionId": subscription_id, "customerRef": record.customer_ref,
            "returnUrl": return_url }),
        seams.now_unix_secs(),
    )?;
    let configuration = portal_discount::configuration_for_customer(
        seams,
        &key,
        record.stripe_customer(),
        &RequestContext::parse(&req.context_json),
    )?;
    // Recheck current offer state on retries and never replay an older unrestricted
    // provider session after the customer has acquired a fixed-month offer.
    let provider_key = match configuration.as_deref() {
        Some(configuration) => crate::routes::checkout_claim::scoped_provider_key(
            &RequestContext::parse(&req.context_json),
            &format!("subscription-portal:{configuration}"),
            &idempotency_key,
        )?,
        None => provider_key,
    };
    let fetch = api::build_billing_portal_fetch(
        &key,
        record.stripe_customer(),
        return_url,
        &provider_key,
        configuration.as_deref(),
    );
    let (status, sbody) =
        api::unwrap_fetch(&seams.http_fetch(&fetch.to_string())?).map_err(|m| {
            AppError::new(502, "provider_unavailable", "could not reach Stripe").with_internal(m)
        })?;
    let url = api::parse_portal_url(status, &sbody).map_err(|m| {
        AppError::new(
            502,
            "provider_unavailable",
            "could not open the billing portal",
        )
        .with_internal(m)
    })?;
    let _ = crate::routes::subscription_store::complete_marker(&db, &claim)?;
    Ok(RouteResponse::ok(&json!({ "url": url })))
}

fn portal_for_buyer<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    user_id: &str,
) -> AppResult<RouteResponse> {
    let body: PortalReq = serde_json::from_value(req.json_body()?).map_err(|e| {
        AppError::unprocessable("invalid request body").with_internal(e.to_string())
    })?;
    let subscription_id = body.subscription_id.trim();
    if subscription_id.is_empty() {
        return Err(AppError::unprocessable("subscriptionId is required"));
    }
    portal_with_body(seams, req, body, Some(user_id))
}

fn view(record: &SubscriptionRecord) -> serde_json::Value {
    json!({
        "subscriptionId": record.subscription_id,
        "status": record.status,
        "priceId": record.price_id,
        "currentPeriodEnd": record.current_period_end,
        "cancelAtPeriodEnd": record.cancel_at_period_end,
    })
}

fn load<S: HostSeams>(db: &Db<'_, S>, id: &str) -> AppResult<SubscriptionRecord> {
    db.read_one(ids::MODEL_SUBSCRIPTIONS, id)?
        .ok_or_else(|| AppError::not_found("no such subscription"))?
        .parse()
}

fn load_row<S: HostSeams>(db: &Db<'_, S>, id: &str) -> AppResult<EntryRecord> {
    db.read_one(ids::MODEL_SUBSCRIPTIONS, id)?
        .ok_or_else(|| AppError::not_found("no such subscription"))
}

fn require_buyer_subscription(row: &EntryRecord, user_id: &str) -> AppResult<()> {
    for field in ["userId", "cedrosLoginUserId"] {
        if row
            .payload
            .get(field)
            .is_some_and(|value| value.as_str().is_none_or(|id| id.trim().is_empty()))
        {
            return Err(AppError::not_found("no such subscription"));
        }
    }
    let strong_identities = ["userId", "cedrosLoginUserId"]
        .iter()
        .filter_map(|field| row.payload.get(field).and_then(serde_json::Value::as_str))
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    let owned = if strong_identities.is_empty() {
        row.payload
            .get("customerRef")
            .and_then(serde_json::Value::as_str)
            .map(str::trim)
            == Some(user_id)
    } else {
        strong_identities
            .iter()
            .all(|identity| *identity == user_id)
    };
    if owned {
        Ok(())
    } else {
        Err(AppError::not_found("no such subscription"))
    }
}

fn require_stripe_subscription(record: &SubscriptionRecord, id: &str) -> AppResult<()> {
    if record.subscription_id != id
        || record.provider != "stripe"
        || record.provider_ref.as_deref() != Some(id)
        || !api::valid_customer_id(record.stripe_customer())
    {
        return Err(AppError::conflict(
            "stored Stripe subscription identity is invalid",
        ));
    }
    Ok(())
}

fn stripe_key<S: HostSeams>(seams: &S) -> AppResult<String> {
    seams
        .secret_get(ids::SECRET_STRIPE_KEY)?
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::new(503, "unavailable", "subscriptions are not configured"))
}

fn required_idempotency_key(req: &RouteRequest, body_key: Option<&str>) -> AppResult<String> {
    let context_key = RequestContext::parse(&req.context_json).idempotency_key;
    let value = match (body_key, context_key.as_deref()) {
        (Some(body), Some(context)) if body.as_bytes() != context.as_bytes() => {
            return Err(AppError::bad_request(
                "host and body idempotency keys must exactly match",
            ));
        }
        (Some(body), _) => body,
        (None, Some(context)) => context,
        (None, None) => return Err(AppError::bad_request("idempotency key is required")),
    };
    crate::checkout_contract::ExternalIdempotencyKey::parse_exact(value)
        .map(|key| key.as_str().to_string())
}

fn status<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let id = req
        .query_value("subscriptionId")
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::bad_request("subscriptionId is required"))?;
    let record = load(&Db::new(seams, ids::DB_ACCESS), id)?;
    Ok(RouteResponse::ok(&view(&record)))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CancelReq {
    subscription_id: String,
}

fn cancel<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let body: CancelReq = serde_json::from_value(req.json_body()?).map_err(|e| {
        AppError::unprocessable("invalid request body").with_internal(e.to_string())
    })?;
    cancel_with_body(seams, req, body, None)
}

fn cancel_with_body<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    body: CancelReq,
    buyer_id: Option<&str>,
) -> AppResult<RouteResponse> {
    let subscription_id = body.subscription_id.trim();
    if !api::valid_subscription_id(subscription_id) {
        return Err(AppError::unprocessable("subscriptionId is invalid"));
    }
    let db = Db::new(seams, ids::DB_ACCESS);
    let row = load_row(&db, subscription_id)?;
    if let Some(user_id) = buyer_id {
        require_buyer_subscription(&row, user_id)?;
    }
    let mut record: SubscriptionRecord = row.parse()?;
    require_stripe_subscription(&record, subscription_id)?;
    let previous = record.clone();
    let idempotency_key = required_idempotency_key(req, None)?;
    let key = stripe_key(seams)?;
    let provider_key = crate::routes::checkout_claim::scoped_provider_key(
        &RequestContext::parse(&req.context_json),
        "subscription-cancel",
        &idempotency_key,
    )?;
    let claim = crate::routes::subscription_store::claim(
        &db,
        "cancel",
        &idempotency_key,
        json!({ "providerIdempotencyKey": provider_key, "subscriptionId": subscription_id, "providerRef": record.provider_ref }),
        seams.now_unix_secs(),
    )?;

    let fetch = api::build_cancel_subscription_fetch(&key, subscription_id, &provider_key);
    let raw = seams.http_fetch(&fetch.to_string())?;
    let (http_status, sbody) = api::unwrap_fetch(&raw)
        .map_err(|m| AppError::internal("malformed egress response").with_internal(m))?;
    let sub = api::parse_subscription(http_status, &sbody).map_err(|message| {
        AppError::new(
            402,
            "subscription_error",
            "Stripe rejected the subscription request",
        )
        .with_internal(message)
    })?;
    if sub.id != subscription_id || sub.customer != record.stripe_customer() {
        return Err(AppError::conflict(
            "Stripe returned a different subscription",
        ));
    }

    record.status = sub.status;
    if let Some(price_id) = sub.price_id {
        record.price_id = price_id;
    }
    record.cancel_at_period_end = sub.cancel_at_period_end;
    record.current_period_end = sub.current_period_end.map(time::iso8601);
    let now = seams.now_unix_secs();
    let unchanged = record.status == previous.status
        && record.price_id == previous.price_id
        && record.current_period_end == previous.current_period_end
        && record.cancel_at_period_end == previous.cancel_at_period_end;
    let effect_time = unchanged
        .then(|| time::parse_iso(&previous.updated_at))
        .flatten()
        .unwrap_or(now);
    record.updated_at = time::iso8601(now);
    let mut actions = vec![
        entitlements::changed_action(
            "subscription_canceled",
            Some(&record.customer_ref),
            Some(&record.price_id),
            Some(&record.subscription_id),
            Some(subscription_id),
            effect_time,
        ),
        analytics_events::subscription_canceled_action(
            "stripe",
            &record.price_id,
            &record.status,
            effect_time,
        ),
    ];
    if let Some(action) = crm_events::subscription_canceled_action(
        &format!("subscription.canceled:{subscription_id}"),
        &record.customer_ref,
        &record.subscription_id,
        &record.price_id,
        effect_time,
    ) {
        actions.push(action);
    }
    let effect =
        crate::durable_effects::plan("subscription-cancel", subscription_id, actions, effect_time)?;
    let _applied = crate::routes::subscription_store::update_monotonic_with_effects(
        &db,
        &row,
        record.clone(),
        effect,
    )?;
    let _ = crate::routes::subscription_store::complete_marker(&db, &claim)?;
    let current: SubscriptionRecord = load_row(&db, subscription_id)?.parse()?;
    Ok(RouteResponse::ok(&view(&current)))
}

fn cancel_for_buyer<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    user_id: &str,
) -> AppResult<RouteResponse> {
    let body: CancelReq = serde_json::from_value(req.json_body()?).map_err(|e| {
        AppError::unprocessable("invalid request body").with_internal(e.to_string())
    })?;
    let subscription_id = body.subscription_id.trim();
    if subscription_id.is_empty() {
        return Err(AppError::unprocessable("subscriptionId is required"));
    }
    cancel_with_body(seams, req, body, Some(user_id))
}

#[cfg(test)]
#[path = "subscriptions_tests.rs"]
mod tests;
