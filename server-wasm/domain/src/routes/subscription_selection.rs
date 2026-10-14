//! Buyer-facing subscription chooser routes using Cedros Login introspection rather than unsigned `userId` fields.

use std::collections::BTreeMap;

use serde::Deserialize;
use serde_json::json;

use crate::auth;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::stripe_session::{allowed_schemes, resolve_redirect};
use crate::seams::HostSeams;
use crate::stripe::api;
use crate::stripe::checkout_api::{self, PriceSubscriptionCheckoutRequest};

#[path = "invite_discount.rs"]
mod invite_discount;
#[path = "invite_discount_stripe.rs"]
mod invite_discount_stripe;

#[path = "subscription_selection_solana.rs"]
mod solana;
#[path = "subscription_selection_solana_activation.rs"]
mod solana_activation;
#[path = "subscription_selection_solana_activation_records.rs"]
mod solana_activation_records;
#[path = "subscription_selection_solana_activation_store.rs"]
mod solana_activation_store;
#[path = "subscription_selection_solana_activation_support.rs"]
mod solana_activation_support;
#[path = "subscription_selection_solana_activation_terms.rs"]
mod solana_activation_terms;
#[path = "subscription_selection_solana_collection.rs"]
mod solana_collection;
#[path = "subscription_selection_solana_collection_input.rs"]
mod solana_collection_input;
#[path = "subscription_selection_solana_collection_record.rs"]
mod solana_collection_record;
#[path = "subscription_selection_solana_collection_rpc.rs"]
mod solana_collection_rpc;
#[path = "subscription_selection_solana_collection_store.rs"]
mod solana_collection_store;
#[path = "subscription_selection_solana_collection_transaction.rs"]
mod solana_collection_transaction;
#[path = "subscription_selection_solana_config.rs"]
mod solana_config;
#[path = "subscription_selection_solana_payment_verifier.rs"]
mod solana_payment_verifier;
#[path = "subscription_selection_solana_rpc_transaction.rs"]
mod solana_rpc_transaction;
#[path = "subscription_selection_solana_transaction.rs"]
mod solana_transaction;
#[path = "subscription_selection_solana_verifier.rs"]
mod solana_verifier;
#[path = "subscription_selection_solana_wallet_binding.rs"]
mod solana_wallet_binding;
#[path = "subscription_selection_support.rs"]
mod support;

#[cfg(test)]
use support::SETTINGS_KEY;
use support::{
    checkout_metadata, existing_free_selection, free_selection_record, incomplete_response,
    load_settings, normalize_interval, parse_body, product_plans, promotion_code_id,
    provider_error, requested_selection_user, require_match, require_same_user, resolve_plan,
    selectable_plans, selection_complete, selection_response, settings_plans, stripe_key,
    subscription_rows_for_user, validate_paid_request, PlanStripeSessionLike,
};

pub const ROUTES: &[RouteSpec] = &[
    RouteSpec {
        route_id: ids::ROUTE_SUBSCRIPTION_SELECTION_STATUS,
        method: "GET",
        path: "/paywall/v1/subscription/selection-status",
    },
    RouteSpec {
        route_id: ids::ROUTE_SUBSCRIPTION_PLANS,
        method: "GET",
        path: "/paywall/v1/subscription/plans",
    },
    RouteSpec {
        route_id: ids::ROUTE_SUBSCRIPTION_FREE_SELECTION,
        method: "POST",
        path: "/paywall/v1/subscription/free-selection",
    },
    RouteSpec {
        route_id: ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION,
        method: "POST",
        path: "/paywall/v1/subscription/plan/stripe-session",
    },
    RouteSpec {
        route_id: ids::ROUTE_SUBSCRIPTION_PLAN_SOLANA_SUBSCRIPTION,
        method: "POST",
        path: "/paywall/v1/subscription/plan/solana-subscription",
    },
    RouteSpec {
        route_id: ids::ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_ACTIVATE,
        method: "POST",
        path: "/paywall/v1/subscription/solana-subscription/activate",
    },
    RouteSpec {
        route_id: ids::ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_COLLECT_INITIAL,
        method: "POST",
        path: "/paywall/v1/subscription/solana-subscription/collect-initial",
    },
];

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SelectFreePlanReq {
    plan_id: String,
    #[serde(default)]
    interval: Option<String>,
    #[serde(default)]
    user_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PlanStripeSessionReq {
    plan_id: String,
    interval: String,
    #[serde(default)]
    customer_email: Option<String>,
    #[serde(default)]
    metadata: Option<BTreeMap<String, String>>,
    #[serde(default)]
    coupon_code: Option<String>,
    #[serde(default)]
    success_url: Option<String>,
    #[serde(default)]
    cancel_url: Option<String>,
}

impl PlanStripeSessionLike for PlanStripeSessionReq {
    fn customer_email(&self) -> Option<&str> {
        self.customer_email.as_deref()
    }

    fn coupon_code(&self) -> Option<&str> {
        self.coupon_code.as_deref()
    }

    fn metadata(&self) -> Option<&BTreeMap<String, String>> {
        self.metadata.as_ref()
    }
}

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    crate::native_storefront_policy::require_request(seams, req)?;
    match req.route_id.as_str() {
        ids::ROUTE_SUBSCRIPTION_SELECTION_STATUS => selection_status(seams, req),
        ids::ROUTE_SUBSCRIPTION_PLANS => plans(seams, req),
        ids::ROUTE_SUBSCRIPTION_FREE_SELECTION => select_free_plan(seams, req),
        ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION => plan_stripe_session(seams, req),
        ids::ROUTE_SUBSCRIPTION_PLAN_SOLANA_SUBSCRIPTION => {
            solana::plan_solana_subscription(seams, req)
        }
        ids::ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_ACTIVATE => {
            solana_activation::activate_solana_subscription(seams, req)
        }
        ids::ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_COLLECT_INITIAL => {
            solana_collection::collect_initial_payment(seams, req)
        }
        _ => Err(AppError::not_found("unknown subscription selection route")),
    }
}

fn plans<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_match(req, "GET", "/paywall/v1/subscription/plans")?;
    let interval = normalize_interval(req.query_value("interval"))?;
    let catalog_plans = product_plans(seams, interval)?;
    let (configured_enabled, plans) = if catalog_plans.is_empty() {
        match load_settings(seams)?.as_ref() {
            Some(settings) => (
                settings
                    .get("enabled")
                    .and_then(|value| value.as_bool())
                    .unwrap_or(false),
                settings_plans(seams, settings, interval)?,
            ),
            None => (false, Vec::new()),
        }
    } else {
        (
            true,
            support::include_complimentary_plans(
                seams,
                catalog_plans,
                load_settings(seams)?.as_ref(),
                interval,
            )?,
        )
    };
    let invite_discount = invite_discount::lookup(seams, req);
    let had_plans = !plans.is_empty();
    let plans = plans
        .into_iter()
        .filter(|plan| {
            plan.price_cents == 0
                || invite_discount
                    .as_ref()
                    .map(|discount| {
                        discount
                            .validate_interval(interval, plan.interval_count)
                            .is_ok()
                    })
                    .unwrap_or(true)
        })
        .collect();
    let mut plans = selectable_plans(plans);
    let had_eligible_intervals = !plans.is_empty();
    invite_discount::project_plan_prices(&mut plans, invite_discount.as_ref())?;
    let enabled = configured_enabled && !plans.is_empty();
    let unavailable_reason = if !configured_enabled {
        Some("subscriptions_disabled")
    } else if plans.is_empty() && had_plans && !had_eligible_intervals {
        Some("invite_discount_requires_monthly_billing")
    } else if plans.is_empty() && had_eligible_intervals {
        Some("invite_discount_requires_stripe")
    } else if plans.is_empty() {
        Some("no_active_public_plans")
    } else {
        None
    };
    Ok(RouteResponse::ok(&json!({
        "enabled": enabled,
        "configuredEnabled": configured_enabled,
        "unavailableReason": unavailable_reason,
        "discount": invite_discount.as_ref().map(|discount| discount.public_json()),
        "plans": plans,
    })))
}

fn selection_status<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_match(req, "GET", "/paywall/v1/subscription/selection-status")?;
    let user_id = requested_selection_user(seams, req)?;

    let rows = subscription_rows_for_user(seams, &user_id)?;
    let mut latest = None;
    for row in rows {
        if crate::routes::subscription_entitlements::is_capacity_subscription(seams, &row)? {
            continue;
        }
        let complete = selection_complete(&row, seams.now_unix_secs());
        let response = selection_response_with_entitlements(seams, &row, complete)?;
        if complete {
            return Ok(RouteResponse::ok(&response));
        }
        latest.get_or_insert(response);
    }
    Ok(RouteResponse::ok(
        &latest.unwrap_or_else(incomplete_response),
    ))
}

fn select_free_plan<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_match(req, "POST", "/paywall/v1/subscription/free-selection")?;
    let buyer = auth::verify_buyer(seams, req)?;
    let body: SelectFreePlanReq = parse_body(req)?;
    if let Some(user_id) = body.user_id.as_deref() {
        require_same_user(user_id, &buyer.user_id)?;
    }
    let interval = normalize_interval(body.interval.as_deref())?;
    let plan = resolve_plan(seams, &body.plan_id, interval)?;
    if !plan.active || !plan.public || plan.price_cents != 0 || plan.stripe_price_id.is_some() {
        return Err(AppError::unprocessable(
            "plan is not an active public free plan",
        ));
    }
    if let Some(existing) = existing_free_selection(seams, &buyer.user_id, &plan.id)? {
        return Ok(RouteResponse::ok(&selection_response_with_entitlements(
            seams, &existing, true,
        )?));
    }

    let (subscription_id, record) =
        free_selection_record(&buyer.user_id, &plan.id, seams.now_unix_secs());
    let db = Db::new(seams, ids::DB_ACCESS);
    let fingerprint = crate::routes::checkout_claim::fingerprint(&json!({
        "schemaVersion": 1, "operation": "free-selection", "subscriptionId": subscription_id,
        "userId": buyer.user_id, "planId": plan.id,
    }))?;
    let _ = crate::routes::subscription_store::insert_projection(
        &db,
        &subscription_id,
        record.clone(),
        &fingerprint,
    )?;
    Ok(RouteResponse::ok(&selection_response_with_entitlements(
        seams, &record, true,
    )?))
}

fn selection_response_with_entitlements<S: HostSeams>(
    seams: &S,
    row: &serde_json::Value,
    complete: bool,
) -> AppResult<serde_json::Value> {
    let mut response = selection_response(row, complete);
    if complete {
        let (product_id, entitlements) =
            crate::routes::subscription_entitlements::projected_selection_for_subscription(
                seams, row,
            )?;
        // Stripe webhook rows can contain only a provider price ID. Resolve the
        // same catalog identity as the host entitlement verification contract.
        response["planId"] = json!(product_id);
        response["resource"] = json!(product_id);
        if let Some(entitlements) = entitlements {
            response["entitlements"] = entitlements;
        }
    }
    Ok(response)
}

fn plan_stripe_session<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_match(req, "POST", "/paywall/v1/subscription/plan/stripe-session")?;
    let buyer = auth::verify_buyer(seams, req)?;
    let body: PlanStripeSessionReq = parse_body(req)?;
    let interval = normalize_interval(Some(&body.interval))?;
    validate_paid_request(&body)?;
    let plan = resolve_plan(seams, &body.plan_id, interval)?;
    if !plan.active {
        return Err(AppError::unprocessable("plan is not active"));
    }
    if !plan.public {
        return Err(AppError::unprocessable("plan is not public"));
    }
    if !plan.purchasable {
        return Err(AppError::unprocessable("plan is not purchasable"));
    }
    if plan.price_cents == 0 {
        return Err(AppError::unprocessable(
            "free plans must use /subscription/free-selection",
        ));
    }
    let idempotency_key = crate::routes::stripe_session::required_idempotency_key(req)?;
    let provider_key = crate::routes::checkout_claim::scoped_provider_key(
        &crate::ctx::RequestContext::parse(&req.context_json),
        "plan-session",
        &idempotency_key,
    )?;
    let program_price = if plan.id == "cedros-individual" {
        crate::routes::program_pricing::active_for_subject(seams, &buyer.user_id, interval)?
    } else {
        None
    };
    let catalog_price_id = plan.price_id.clone().unwrap_or_else(|| plan.id.clone());
    let secret_key = stripe_key(seams)?;
    let invite_discount = invite_discount::lookup(seams, req);
    if let Some(discount) = invite_discount.as_ref() {
        discount.validate_interval(interval, plan.interval_count)?;
    }
    if program_price.is_some()
        && (invite_discount.is_some()
            || body
                .coupon_code
                .as_deref()
                .is_some_and(|code| !code.trim().is_empty()))
    {
        return Err(AppError::unprocessable(
            "program pricing cannot be combined with coupons or invite discounts",
        ));
    }
    let promotion_code_id = match (program_price.as_ref(), invite_discount.as_ref()) {
        (Some(_), _) | (_, Some(_)) => None,
        (None, None) => promotion_code_id(seams, &secret_key, body.coupon_code.as_deref())?,
    };
    let allowed = allowed_schemes(seams);
    let success_url =
        resolve_redirect(seams, body.success_url.as_deref(), "success_url", &allowed)?;
    let cancel_url = resolve_redirect(seams, body.cancel_url.as_deref(), "cancel_url", &allowed)?;
    let checkout_price_cents = match program_price.as_ref() {
        Some(price) => price.amount_cents,
        None => invite_discount
            .as_ref()
            .map(|discount| discount.discounted_cents(plan.price_cents))
            .transpose()?
            .unwrap_or(plan.price_cents),
    };
    // Only an authenticated lifetime-free grant can omit a card. A temporary
    // discount or a rounded-to-zero price can still produce future charges.
    let lifetime_free = invite_discount
        .as_ref()
        .is_some_and(|discount| discount.percent_off == 100 && discount.duration_months.is_none());
    let require_payment_method = !lifetime_free;
    let trial_period_days = if lifetime_free { None } else { plan.trial_days };
    let discount_json = invite_discount
        .as_ref()
        .map(|discount| discount.public_json());
    let db = Db::new(seams, ids::DB_ACCESS);
    let claim = crate::routes::subscription_store::claim(
        &db,
        "plan-session",
        &idempotency_key,
        json!({ "providerIdempotencyKey": provider_key, "planId": plan.id, "interval": interval, "userId": buyer.user_id,
            "priceId": catalog_price_id, "stripePriceId": plan.stripe_price_id.clone(),
            "title": plan.title, "currency": program_price.as_ref().map(|price| price.currency.as_str()).unwrap_or(&plan.currency),
            "intervalCount": plan.interval_count, "trialDays": trial_period_days, "requirePaymentMethod": require_payment_method, "promotionCodeId": promotion_code_id,
            "successUrl": success_url, "cancelUrl": cancel_url,
            "customerEmail": body.customer_email, "couponCode": body.coupon_code,
            "originalPriceCents": plan.price_cents, "priceCents": checkout_price_cents,
            "inviteDiscount": discount_json,
            "programHandle": program_price.as_ref().map(|price| price.program_handle.as_str()) }),
        seams.now_unix_secs(),
    )?;
    if let Some(result) = crate::routes::subscription_store::completed_result(&claim)? {
        return Ok(RouteResponse::ok(&result));
    }
    crate::routes::subscription_store::require_provider_retry_safe(&claim, seams.now_unix_secs())?;
    let coupon_id = invite_discount
        .as_ref()
        .map(|discount| invite_discount_stripe::ensure_coupon(seams, &secret_key, discount))
        .transpose()?;

    let mut metadata = checkout_metadata(&buyer.user_id, &plan.id, body.metadata);
    metadata.push(("catalog_price_id".to_string(), catalog_price_id));
    if let Some(discount) = invite_discount.as_ref() {
        metadata.extend([
            ("invite_discount_code".to_string(), discount.code.clone()),
            (
                "invite_discount_percent".to_string(),
                discount.percent_off.to_string(),
            ),
            (
                "invite_discount_duration".to_string(),
                discount.duration().to_string(),
            ),
            ("discount_stacking".to_string(), "invite_wins".to_string()),
        ]);
        if let Some(months) = discount.duration_months {
            metadata.push(("invite_discount_months".to_string(), months.to_string()));
        }
    }
    if let Some(price) = program_price.as_ref() {
        metadata.extend([
            (
                "program_entitlement".to_string(),
                price.program_handle.clone(),
            ),
            ("program_pricing".to_string(), "identity_bound".to_string()),
        ]);
    }
    let expires_at = checkout_api::session_expiry(
        claim.row.payload["createdAt"]
            .as_str()
            .ok_or_else(|| AppError::conflict("checkout initiation time is missing"))?,
    )?;
    let fetch = match (program_price.as_ref(), plan.stripe_price_id) {
        (Some(price), _) => checkout_api::build_subscription_checkout_fetch(
            &secret_key,
            &checkout_api::SubscriptionCheckoutRequest {
                amount_cents: price.amount_cents,
                currency: price.currency.clone(),
                product_name: plan.title.clone(),
                interval: if interval == "yearly" {
                    "year"
                } else {
                    "month"
                }
                .to_string(),
                interval_count: plan.interval_count,
                trial_period_days,
                require_payment_method,
                success_url,
                cancel_url,
                expires_at,
                customer_email: body.customer_email.clone(),
                idempotency_key: provider_key.clone(),
                metadata,
                promotion_code_id: None,
                coupon_id: None,
            },
        ),
        (None, Some(price_id)) => checkout_api::build_price_subscription_checkout_fetch(
            &secret_key,
            &PriceSubscriptionCheckoutRequest {
                price_id,
                trial_period_days,
                require_payment_method,
                success_url,
                cancel_url,
                expires_at,
                customer_email: body.customer_email.clone(),
                idempotency_key: provider_key.clone(),
                metadata,
                promotion_code_id,
                coupon_id,
            },
        ),
        (None, None) => checkout_api::build_subscription_checkout_fetch(
            &secret_key,
            &checkout_api::SubscriptionCheckoutRequest {
                amount_cents: plan.price_cents,
                currency: plan.currency.clone(),
                product_name: plan.title.clone(),
                interval: if interval == "yearly" {
                    "year"
                } else {
                    "month"
                }
                .to_string(),
                interval_count: plan.interval_count,
                trial_period_days,
                require_payment_method,
                success_url,
                cancel_url,
                expires_at,
                customer_email: body.customer_email.clone(),
                idempotency_key: provider_key.clone(),
                metadata,
                promotion_code_id,
                coupon_id,
            },
        ),
    };
    let raw = seams.http_fetch(&fetch.to_string())?;
    let (status, resp_body) = api::unwrap_fetch(&raw).map_err(provider_error)?;
    let session =
        checkout_api::parse_checkout_session(status, &resp_body).map_err(provider_error)?;
    let result = json!({
        "flow": "redirect_checkout",
        "sessionId": session.id,
        "url": session.url,
        "originalPriceCents": plan.price_cents,
        "priceCents": checkout_price_cents,
        "discount": discount_json,
        "programPricing": program_price.as_ref().map(|price| json!({
            "programHandle": price.program_handle,
            "identityBound": true,
            "stackable": false
        })),
    });
    crate::routes::subscription_store::complete_marker_with_result(
        &db,
        &claim,
        Some(result.clone()),
    )?;
    Ok(RouteResponse::ok(&result))
}

#[cfg(test)]
#[path = "subscription_selection_invite_tests.rs"]
mod invite_tests;
#[cfg(test)]
#[path = "subscription_selection_solana_tests.rs"]
mod solana_tests;
#[cfg(test)]
#[path = "subscription_selection_tests.rs"]
mod tests;
