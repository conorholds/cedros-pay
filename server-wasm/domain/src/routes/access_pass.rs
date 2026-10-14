//! Pay-owned short-lived access-pass contract.
//!
//! Offer resolution and authorization are called only through Cedros platform's
//! host-attested extension-services seam. Purchase is public x402; management
//! is a normal Pay admin surface.

use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::ctx::RequestContext;
use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::models::{AccessPassOffer, AccessPassRecord};
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::matches;
use crate::seams::HostSeams;

pub const ROUTES: &[RouteSpec] = &[
    RouteSpec {
        route_id: ids::ROUTE_ACCESS_PASS_OFFER_RESOLVE,
        method: "POST",
        path: "/access-passes/v1/offers/resolve",
    },
    RouteSpec {
        route_id: ids::ROUTE_ACCESS_PASS_PURCHASE,
        method: "POST",
        path: "/access-passes/v1/purchase",
    },
    RouteSpec {
        route_id: ids::ROUTE_ACCESS_PASS_AUTHORIZE,
        method: "POST",
        path: "/access-passes/v1/authorize",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_ACCESS_PASS_OFFER_UPSERT,
        method: "PUT",
        path: "/admin/access-passes/v1/offers",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_ACCESS_PASS_OFFER_STATE,
        method: "POST",
        path: "/admin/access-passes/v1/offers/state",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_ACCESS_PASS_REVOKE,
        method: "POST",
        path: "/admin/access-passes/v1/passes/revoke",
    },
];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    crate::native_storefront_policy::require_request(seams, req)?;
    match req.route_id.as_str() {
        ids::ROUTE_ACCESS_PASS_OFFER_RESOLVE => resolve_offer(seams, req),
        ids::ROUTE_ACCESS_PASS_PURCHASE => super::access_pass_purchase::purchase(seams, req),
        ids::ROUTE_ACCESS_PASS_AUTHORIZE => super::access_pass_auth::authorize(seams, req),
        ids::ROUTE_ADMIN_ACCESS_PASS_OFFER_UPSERT => upsert_offer(seams, req),
        ids::ROUTE_ADMIN_ACCESS_PASS_OFFER_STATE => set_offer_state(seams, req),
        ids::ROUTE_ADMIN_ACCESS_PASS_REVOKE => revoke_pass(seams, req),
        _ => Err(AppError::not_found("unknown access-pass route")),
    }
}

pub(super) fn require_cash_captcha_service(req: &RouteRequest) -> AppResult<()> {
    let ctx = RequestContext::parse(&req.context_json);
    let exact_identity = ctx.authenticated
        && ctx.auth_scheme.as_deref() == Some("extension-service")
        && ctx.actor_id.as_deref() == Some("cash-captcha")
        && ctx.principal_id.as_deref() == Some("cash-captcha")
        && ctx.permission_claims == [ids::CAPABILITY_ACCESS_PASS];
    if exact_identity {
        Ok(())
    } else {
        Err(AppError::new(
            403,
            "service_context_required",
            "Cash Captcha extension-service context is required",
        ))
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ResolveOfferRequest {
    schema_version: u8,
    offer_ref: String,
    source_id: String,
    duration_seconds: u32,
}

fn resolve_offer<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !matches(req, "POST", "/access-passes/v1/offers/resolve") {
        return Err(AppError::not_found("unknown access-pass route"));
    }
    require_cash_captcha_service(req)?;
    let body: ResolveOfferRequest = parse_body(req)?;
    require_schema(body.schema_version)?;
    let offer = load_offer(seams, &body.offer_ref)?;
    require_purchasable(&offer, seams.now_unix_secs() * 1000)?;
    if offer.source_id != body.source_id {
        return Err(AppError::new(
            409,
            "wrong_source",
            "offer source does not match",
        ));
    }
    if offer.duration_seconds != body.duration_seconds {
        return Err(AppError::new(
            409,
            "wrong_duration",
            "offer duration does not match",
        ));
    }
    let payment = super::access_pass_payment::safe_payment_terms(seams, &offer)?;
    Ok(RouteResponse::ok(&json!({
        "schemaVersion": 1,
        "offer402": {
            "schemaVersion": 1,
            "offerRef": offer.offer_ref,
            "productType": offer.product_type,
            "scope": { "extensionId": "cash-captcha", "sourceId": offer.source_id },
            "durationSeconds": offer.duration_seconds,
            "price": { "amountCents": offer.price_amount_cents, "currency": offer.currency },
            "rail": offer.rail,
            "network": offer.network,
            "maximumTotalRequests": offer.maximum_total_requests,
            "payment": payment,
        }
    })))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct OfferInput {
    schema_version: u8,
    offer_ref: String,
    product_type: String,
    source_id: String,
    duration_seconds: u32,
    price_amount_cents: u64,
    currency: String,
    rail: String,
    network: String,
    active: bool,
    effective_at_ms: i64,
    retirement_at_ms: Option<i64>,
    maximum_total_requests: Option<u32>,
}

fn upsert_offer<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    admin_write(req)?;
    let input: OfferInput = parse_body(req)?;
    validate_offer_input(&input)?;
    let now = seams.now_unix_secs();
    let hash = terms_hash(&json!({
        "offerRef": input.offer_ref, "productType": input.product_type,
        "sourceId": input.source_id, "durationSeconds": input.duration_seconds,
        "priceAmountCents": input.price_amount_cents, "currency": input.currency,
        "rail": input.rail, "network": input.network,
        "maximumTotalRequests": input.maximum_total_requests,
    }))?;
    let offer = AccessPassOffer {
        schema_version: 1,
        offer_ref: input.offer_ref.trim().into(),
        product_type: "access_pass".into(),
        source_id: input.source_id.trim().into(),
        duration_seconds: input.duration_seconds,
        price_amount_cents: input.price_amount_cents,
        currency: "USD".into(),
        rail: "x402".into(),
        network: input.network.trim().into(),
        active: input.active,
        effective_at_ms: input.effective_at_ms,
        retirement_at_ms: input.retirement_at_ms,
        maximum_total_requests: input.maximum_total_requests,
        terms_version: 1,
        terms_hash: hash,
        created_at: crate::time::iso8601(now),
        updated_at: crate::time::iso8601(now),
    };
    let db = Db::new(seams, ids::DB_ACCESS);
    let key = offer_key(&offer.offer_ref);
    if let Some(existing) = db.read_one(ids::MODEL_ACCESS_PASSES, &key)? {
        let existing: AccessPassOffer = existing.parse()?;
        if existing.terms_hash == offer.terms_hash
            && existing.active == offer.active
            && existing.effective_at_ms == offer.effective_at_ms
            && existing.retirement_at_ms == offer.retirement_at_ms
        {
            return Ok(RouteResponse::ok(&existing));
        }
        return Err(AppError::new(
            409,
            "offer_immutable",
            "an offerRef cannot be reused with changed terms or lifecycle",
        ));
    }
    let outcome = db.guarded_batch(
        &[GuardedCondition::Absent {
            content_model_id: ids::MODEL_ACCESS_PASSES,
            entry_key: key.clone(),
        }],
        &[BatchOp::Write {
            content_model_id: ids::MODEL_ACCESS_PASSES,
            entry_key: key,
            data: serde_json::to_value(&offer).map_err(encode_error)?,
        }],
    )?;
    if matches!(outcome, GuardedBatchOutcome::Conflict { .. }) {
        return Err(AppError::conflict("offer was created concurrently; retry"));
    }
    Ok(RouteResponse::json(201, &offer))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct OfferStateRequest {
    schema_version: u8,
    offer_ref: String,
    state: String,
    retirement_at_ms: Option<i64>,
}

fn set_offer_state<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    admin_write(req)?;
    let body: OfferStateRequest = parse_body(req)?;
    require_schema(body.schema_version)?;
    if !matches!(body.state.as_str(), "active" | "inactive" | "retired") {
        return Err(AppError::bad_request(
            "state must be active, inactive, or retired",
        ));
    }
    let db = Db::new(seams, ids::DB_ACCESS);
    let key = offer_key(&body.offer_ref);
    let row = db
        .read_one(ids::MODEL_ACCESS_PASSES, &key)?
        .ok_or_else(|| AppError::new(404, "offer_missing", "offer does not exist"))?;
    let mut offer: AccessPassOffer = row.parse()?;
    offer.active = body.state == "active";
    if body.state == "retired" {
        offer.retirement_at_ms = Some(
            body.retirement_at_ms
                .unwrap_or(seams.now_unix_secs() * 1000),
        );
    }
    offer.updated_at = crate::time::iso8601(seams.now_unix_secs());
    guarded_replace(&db, &row, &key, &offer)?;
    Ok(RouteResponse::ok(&offer))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RevokeRequest {
    schema_version: u8,
    pass_id: String,
}

fn revoke_pass<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    admin_write(req)?;
    let body: RevokeRequest = parse_body(req)?;
    require_schema(body.schema_version)?;
    let db = Db::new(seams, ids::DB_ACCESS);
    let key = pass_key(&body.pass_id);
    let row = db
        .read_one(ids::MODEL_ACCESS_PASSES, &key)?
        .ok_or_else(|| AppError::new(404, "pass_missing", "pass does not exist"))?;
    let mut pass: AccessPassRecord = row.parse()?;
    pass.status = "revoked".into();
    pass.updated_at = crate::time::iso8601(seams.now_unix_secs());
    guarded_replace(&db, &row, &key, &pass)?;
    Ok(RouteResponse::ok(
        &json!({"schemaVersion":1,"passId":pass.pass_id,"status":"revoked"}),
    ))
}

fn admin_write(req: &RouteRequest) -> AppResult<()> {
    let ctx = RequestContext::parse(&req.context_json);
    ctx.require_claim(ids::ROUTE_ADMIN)?;
    ctx.require_admin_write()
}

fn validate_offer_input(input: &OfferInput) -> AppResult<()> {
    require_schema(input.schema_version)?;
    if !bounded_id(&input.offer_ref, 3, 96) || !bounded_id(&input.source_id, 2, 64) {
        return Err(AppError::bad_request("offerRef or sourceId is invalid"));
    }
    if input.product_type != "access_pass" || input.rail != "x402" || input.currency != "USD" {
        return Err(AppError::bad_request(
            "only access_pass, x402, and USD are supported",
        ));
    }
    if !(30..=3600).contains(&input.duration_seconds) || input.price_amount_cents == 0 {
        return Err(AppError::bad_request(
            "duration must be 30..3600 seconds and price must be positive",
        ));
    }
    if input.network.trim().is_empty()
        || input.network.len() > 64
        || input
            .retirement_at_ms
            .is_some_and(|v| v <= input.effective_at_ms)
    {
        return Err(AppError::bad_request(
            "network or offer lifecycle is invalid",
        ));
    }
    if input.maximum_total_requests == Some(0) {
        return Err(AppError::bad_request(
            "maximumTotalRequests must be positive",
        ));
    }
    Ok(())
}

pub(super) fn require_purchasable(offer: &AccessPassOffer, now_ms: i64) -> AppResult<()> {
    if offer.product_type != "access_pass" {
        return Err(AppError::new(
            409,
            "wrong_product_type",
            "offer is not an access pass",
        ));
    }
    if !offer.active {
        return Err(AppError::new(409, "offer_inactive", "offer is inactive"));
    }
    if now_ms < offer.effective_at_ms {
        return Err(AppError::new(
            409,
            "offer_not_effective",
            "offer is not effective",
        ));
    }
    if offer.retirement_at_ms.is_some_and(|at| now_ms >= at) {
        return Err(AppError::new(409, "offer_retired", "offer is retired"));
    }
    Ok(())
}

pub(super) fn load_offer<S: HostSeams>(seams: &S, offer_ref: &str) -> AppResult<AccessPassOffer> {
    Db::new(seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_ACCESS_PASSES, &offer_key(offer_ref))?
        .ok_or_else(|| AppError::new(404, "offer_missing", "offer does not exist"))?
        .parse()
}

fn guarded_replace<S: HostSeams, T: serde::Serialize>(
    db: &Db<'_, S>,
    row: &crate::db::EntryRecord,
    key: &str,
    value: &T,
) -> AppResult<()> {
    let version = row
        .version
        .clone()
        .ok_or_else(|| AppError::internal("database entry omitted concurrency version"))?;
    let outcome = db.guarded_batch(
        &[GuardedCondition::Version {
            content_model_id: ids::MODEL_ACCESS_PASSES,
            entry_key: key.into(),
            expected_version: version,
        }],
        &[BatchOp::Write {
            content_model_id: ids::MODEL_ACCESS_PASSES,
            entry_key: key.into(),
            data: serde_json::to_value(value).map_err(encode_error)?,
        }],
    )?;
    if matches!(outcome, GuardedBatchOutcome::Conflict { .. }) {
        return Err(AppError::conflict("record changed concurrently; retry"));
    }
    Ok(())
}

pub(super) fn parse_body<T: for<'de> Deserialize<'de>>(req: &RouteRequest) -> AppResult<T> {
    serde_json::from_value(req.json_body()?).map_err(|error| {
        AppError::new(
            400,
            "malformed_request",
            "request body does not match the access-pass schema",
        )
        .with_internal(error.to_string())
    })
}
pub(super) fn require_schema(version: u8) -> AppResult<()> {
    if version == 1 {
        Ok(())
    } else {
        Err(AppError::new(
            400,
            "unsupported_schema",
            "schemaVersion must be 1",
        ))
    }
}
pub(super) fn offer_key(value: &str) -> String {
    format!("offer:{}", value.trim())
}
pub(super) fn pass_key(value: &str) -> String {
    format!("pass:{}", value.trim())
}
pub(super) fn bounded_id(value: &str, min: usize, max: usize) -> bool {
    let v = value.trim();
    (min..=max).contains(&v.len())
        && v.bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b':'))
}
pub(super) fn terms_hash(value: &Value) -> AppResult<String> {
    let bytes = serde_json::to_vec(value).map_err(encode_error)?;
    Ok(hex::encode(Sha256::digest(bytes)))
}
fn encode_error(error: serde_json::Error) -> AppError {
    AppError::internal("cannot encode access-pass state").with_internal(error.to_string())
}

#[cfg(test)]
#[path = "access_pass_tests.rs"]
mod tests;
