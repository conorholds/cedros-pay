use super::*;
use crate::stripe::api::SubscriptionCreate;
use serde_json::Value;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateReq {
    customer_ref: String,
    price_id: String,
    #[serde(default)]
    idempotency_key: Option<String>,
}

pub(super) fn create<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let body: CreateReq = serde_json::from_value(req.json_body()?).map_err(|error| {
        AppError::unprocessable("invalid request body").with_internal(error.to_string())
    })?;
    if !api::valid_customer_id(&body.customer_ref) || body.price_id.trim().is_empty() {
        return Err(AppError::unprocessable(
            "customerRef and priceId are required",
        ));
    }
    let idempotency_key = required_idempotency_key(req, body.idempotency_key.as_deref())?;
    let secret = stripe_key(seams)?;
    let provider_key = crate::routes::checkout_claim::scoped_provider_key(
        &RequestContext::parse(&req.context_json),
        "subscription-create",
        &idempotency_key,
    )?;
    let db = Db::new(seams, ids::DB_ACCESS);
    let claim = crate::routes::subscription_store::claim(
        &db,
        "create",
        &idempotency_key,
        json!({ "providerIdempotencyKey": provider_key, "customerRef": body.customer_ref, "priceId": body.price_id }),
        seams.now_unix_secs(),
    )?;
    if let Some(response) = completed_replay(&db, &claim, &body.customer_ref)? {
        return Ok(response);
    }
    let operation_ref = claim.fingerprint.clone();
    let sub = if retry_safe(&claim, seams.now_unix_secs())? {
        let fetch = api::build_create_subscription_fetch(
            &secret,
            &SubscriptionCreate {
                customer_ref: body.customer_ref.clone(),
                price_id: body.price_id.clone(),
                idempotency_key: provider_key,
                operation_ref: operation_ref.clone(),
            },
        );
        parse_subscription_response(&seams.http_fetch(&fetch.to_string())?)?
    } else {
        find_subscription(seams, &secret, &body, &operation_ref)?.ok_or_else(|| {
            AppError::conflict(
                "Stripe subscription outcome is unknown; reconcile the provider operation before retrying",
            )
        })?
    };
    validate_subscription(&sub, &body.customer_ref, &body.price_id)?;
    persist(seams, &db, &claim, &body, sub)
}

fn completed_replay<S: HostSeams>(
    db: &Db<'_, S>,
    claim: &crate::routes::subscription_store::Claim,
    customer_ref: &str,
) -> AppResult<Option<RouteResponse>> {
    if claim.row.payload.get("status").and_then(Value::as_str) != Some("completed") {
        return Ok(None);
    }
    let subscription_id = claim
        .row
        .payload
        .pointer("/result/subscriptionId")
        .and_then(Value::as_str)
        .filter(|id| api::valid_subscription_id(id))
        .ok_or_else(|| AppError::internal("completed subscription operation has no result"))?;
    let row = db
        .read_one(ids::MODEL_SUBSCRIPTIONS, subscription_id)?
        .ok_or_else(|| AppError::internal("completed subscription projection is missing"))?;
    let record: SubscriptionRecord = row.parse()?;
    require_stripe_subscription(&record, subscription_id)?;
    if record.customer_ref != customer_ref {
        return Err(AppError::conflict("stored subscription customer mismatch"));
    }
    let effect_time = time::parse_iso(&record.created_at)
        .ok_or_else(|| AppError::internal("stored subscription has an invalid createdAt"))?;
    let effect = crate::durable_effects::plan(
        "subscription-create",
        subscription_id,
        actions(&record, effect_time),
        effect_time,
    )?;
    crate::routes::subscription_store::insert_projection_with_effects(
        db,
        subscription_id,
        row.payload,
        &claim.fingerprint,
        effect,
    )?;
    Ok(Some(RouteResponse::json(201, &view(&record))))
}

fn persist<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    claim: &crate::routes::subscription_store::Claim,
    body: &CreateReq,
    sub: api::Subscription,
) -> AppResult<RouteResponse> {
    let now = seams.now_unix_secs();
    let effect_time = match db.read_one(ids::MODEL_SUBSCRIPTIONS, &sub.id)? {
        Some(row) => row
            .payload
            .get("createdAt")
            .and_then(Value::as_str)
            .and_then(time::parse_iso)
            .ok_or_else(|| AppError::internal("stored subscription has an invalid createdAt"))?,
        None => now,
    };
    let record = SubscriptionRecord {
        subscription_id: sub.id.clone(),
        customer_ref: body.customer_ref.clone(),
        stripe_customer_id: Some(sub.customer.clone()),
        price_id: body.price_id.clone(),
        status: sub.status,
        provider: "stripe".to_string(),
        provider_ref: Some(sub.id.clone()),
        current_period_end: sub.current_period_end.map(time::iso8601),
        cancel_at_period_end: sub.cancel_at_period_end,
        last_provider_event_at: None,
        created_at: time::iso8601(now),
        updated_at: time::iso8601(now),
    };
    let effect = crate::durable_effects::plan(
        "subscription-create",
        &sub.id,
        actions(&record, effect_time),
        effect_time,
    )?;
    crate::routes::subscription_store::insert_projection_with_effects(
        db,
        &sub.id,
        serde_json::to_value(&record).map_err(|error| {
            AppError::internal("cannot encode subscription").with_internal(error.to_string())
        })?,
        &claim.fingerprint,
        effect,
    )?;
    crate::routes::subscription_store::complete_marker_with_result(
        db,
        claim,
        Some(json!({"subscriptionId": sub.id})),
    )?;
    Ok(RouteResponse::json(201, &view(&record)))
}

fn actions(record: &SubscriptionRecord, effect_time: i64) -> Vec<crate::durable_effects::Action> {
    let mut actions = vec![
        entitlements::changed_action(
            "subscription_created",
            Some(&record.customer_ref),
            Some(&record.price_id),
            Some(&record.subscription_id),
            Some(&record.subscription_id),
            effect_time,
        ),
        analytics_events::subscription_started_action(
            "stripe",
            &record.price_id,
            &record.status,
            effect_time,
        ),
    ];
    if let Some(action) = crm_events::subscription_created_action(
        &format!("subscription.created:{}", record.subscription_id),
        &record.customer_ref,
        &record.subscription_id,
        &record.price_id,
        effect_time,
        None,
    ) {
        actions.push(action);
    }
    actions
}

fn retry_safe(claim: &crate::routes::subscription_store::Claim, now: i64) -> AppResult<bool> {
    let started = claim
        .row
        .payload
        .get("createdAt")
        .and_then(Value::as_str)
        .and_then(time::parse_iso)
        .ok_or_else(|| AppError::internal("subscription operation has an invalid createdAt"))?;
    Ok(now >= started && now - started < crate::checkout_contract::PROVIDER_IDEMPOTENCY_SECONDS)
}

fn find_subscription<S: HostSeams>(
    seams: &S,
    secret: &str,
    body: &CreateReq,
    operation_ref: &str,
) -> AppResult<Option<api::Subscription>> {
    let mut cursor = None;
    let mut found = None;
    for _ in 0..100 {
        let fetch = api::build_list_subscriptions_fetch(
            secret,
            &body.customer_ref,
            cursor.as_deref(),
            false,
        );
        let raw = seams.http_fetch(&fetch.to_string())?;
        let (status, response) = api::unwrap_fetch(&raw).map_err(|message| {
            AppError::new(
                502,
                "provider_unavailable",
                "Stripe recovery response was malformed",
            )
            .with_internal(message)
        })?;
        if !(200..300).contains(&status) {
            return Err(AppError::new(
                502,
                "provider_unavailable",
                "Stripe subscription recovery is unavailable",
            ));
        }
        let page: Value = serde_json::from_str(&response).map_err(|error| {
            AppError::new(
                502,
                "provider_unavailable",
                "Stripe recovery response was malformed",
            )
            .with_internal(error.to_string())
        })?;
        let rows = page.get("data").and_then(Value::as_array).ok_or_else(|| {
            AppError::new(
                502,
                "provider_unavailable",
                "Stripe recovery response was malformed",
            )
        })?;
        for row in rows {
            if row
                .pointer("/metadata/cedros_pay_operation")
                .and_then(Value::as_str)
                != Some(operation_ref)
            {
                continue;
            }
            if row.get("customer").and_then(Value::as_str) != Some(body.customer_ref.as_str()) {
                return Err(AppError::conflict(
                    "Stripe subscription recovery returned a different customer",
                ));
            }
            let subscription =
                api::parse_subscription(200, &row.to_string()).map_err(|message| {
                    AppError::conflict("Stripe returned an invalid subscription")
                        .with_internal(message)
                })?;
            validate_subscription(&subscription, &body.customer_ref, &body.price_id)?;
            if found.replace(subscription).is_some() {
                return Err(AppError::conflict(
                    "multiple Stripe subscriptions match the durable operation",
                ));
            }
        }
        if page.get("has_more").and_then(Value::as_bool) != Some(true) {
            return Ok(found);
        }
        let last = rows
            .last()
            .and_then(|row| row.get("id"))
            .and_then(Value::as_str)
            .filter(|id| api::valid_subscription_id(id))
            .ok_or_else(|| {
                AppError::new(
                    502,
                    "provider_unavailable",
                    "Stripe recovery cursor was invalid",
                )
            })?;
        cursor = Some(last.to_string());
    }
    Err(AppError::new(
        502,
        "provider_unavailable",
        "Stripe subscription recovery exceeded its page limit",
    ))
}

fn parse_subscription_response(raw: &str) -> AppResult<api::Subscription> {
    let (status, body) = api::unwrap_fetch(raw).map_err(|message| {
        AppError::internal("malformed egress response").with_internal(message)
    })?;
    api::parse_subscription(status, &body).map_err(|message| {
        AppError::new(
            402,
            "subscription_error",
            "Stripe rejected the subscription request",
        )
        .with_internal(message)
    })
}

fn validate_subscription(
    subscription: &api::Subscription,
    customer: &str,
    price_id: &str,
) -> AppResult<()> {
    if subscription.customer != customer || subscription.price_id.as_deref() != Some(price_id) {
        return Err(AppError::conflict(
            "Stripe did not return the requested subscription customer and price",
        ));
    }
    Ok(())
}
