//! Host-owned domain checkout adapter over the canonical guarded Pay engine.
//! Customer routes cannot attest this merchant-service principal.
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::{
    auth::Buyer,
    checkout_contract::CanonicalCheckoutFacade,
    ctx::RequestContext,
    error::{AppError, AppResult},
    ids,
    reqresp::{RouteRequest, RouteResponse, RouteSpec},
    seams::HostSeams,
};

#[path = "domain_checkout_authority.rs"]
mod authority;

pub const ROUTE: &str = "cedros-pay:domain-checkout";
pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ROUTE,
    method: "POST",
    path: "/admin/domain-checkout",
}];

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Request {
    intent_id: String,
    buyer_id: String,
    resource: String,
    product_id: String,
    price_id: String,
    amount_cents: u64,
    currency: String,
    email: String,
    return_url: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    billing: Option<Value>,
}

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    crate::guarded_policy::require_active(seams)?;
    let ctx = RequestContext::parse(&req.context_json);
    ctx.require_claim(ids::ROUTE_ADMIN)?;
    ctx.require_admin_write()?;
    if ctx.actor_id.as_deref() != Some("cedros-domains-manager")
        || ctx.principal_id.as_deref() != Some("cedros-domains-manager")
    {
        return Err(AppError::forbidden(
            "host domain service identity is required",
        ));
    }
    if !super::matches(req, "POST", "/admin/domain-checkout") {
        return Err(AppError::not_found("unknown domain checkout route"));
    }
    let body: Request = serde_json::from_value(req.json_body()?)
        .map_err(|_| AppError::unprocessable("invalid domain checkout"))?;
    if body.description.as_ref().is_some_and(|text| {
        text.trim().is_empty() || text.len() > 512 || text.chars().any(char::is_control)
    }) {
        return Err(AppError::unprocessable(
            "invalid domain payment description",
        ));
    }
    if !valid_intent_id(&body.intent_id)
        || ![
            format!("domain-purchase-{}", body.intent_id),
            format!("domain-renewal-{}", body.intent_id),
        ]
        .contains(&body.resource)
        || body.amount_cents == 0
        || body.currency != "USD"
    {
        return Err(AppError::unprocessable(
            "invalid domain purchase identity or price",
        ));
    }
    if body.billing.is_some() {
        return Err(AppError::unprocessable(
            "combined hosting and renewal billing are not supported by this adapter",
        ));
    }
    if body.resource != format!("domain-purchase-{}", body.intent_id) {
        return Err(AppError::unprocessable("renewals require billing terms"));
    }
    if !crate::routes::stripe_session::is_plausible_email(&body.email)
        || body.product_id.len() > 200
        || body.price_id.len() > 200
    {
        return Err(AppError::unprocessable(
            "invalid domain payment contact or catalog identity",
        ));
    }
    let buyer = Buyer {
        user_id: body.buyer_id.clone(),
        claims: json!({}),
    };
    let facade = CanonicalCheckoutFacade::for_domain_service(
        seams,
        &ctx,
        &buyer,
        crate::checkout_contract::domain_catalog::DomainCatalogOffer {
            resource: body.resource.clone(),
            product_id: body.product_id.clone(),
            price_id: body.price_id.clone(),
            amount_cents: body.amount_cents,
            currency: body.currency.clone(),
        },
    )?;
    authority::initialize(seams, &ctx, &body.intent_id, &body.return_url)?;
    let customer = json!({"fulfillment":{"kind":"digital"},"contact":{"email":body.email},
        "returnUrls":{"success":body.return_url,"cancel":body.return_url}});
    let material = hex::encode(Sha256::digest(req.body.as_bytes()));
    let quote_key = format!("domain-quote:{}", body.intent_id);
    let quote = facade.quote(
        &quote_key,
        &json!({"schemaVersion":1,"idempotencyKey":quote_key,
        "attemptId":body.intent_id,"clientMaterialSha256":material,
        "source":{"kind":"items","items":[{"resource":body.resource,"qty":1}]},
        "customerContext":customer,"requestedPaymentMethods":["stripe"]})
        .to_string(),
    )?;
    if quote.quote.total_cents != body.amount_cents || quote.quote.currency != body.currency {
        return Err(AppError::conflict(
            "domain checkout does not match the confirmed price",
        ));
    }
    let checkout_key = format!("domain-checkout:{}", body.intent_id);
    let outcome = facade.checkout(&checkout_key, &json!({"schemaVersion":1,"idempotencyKey":checkout_key,
        "attemptId":body.intent_id,"clientMaterialSha256":material,"quoteOperationId":quote.operation_id,
        "paymentMethod":"stripe","customerContext":customer,"railProof":{"kind":"stripe"}}).to_string())?;
    let outcome = serde_json::to_value(outcome)
        .map_err(|_| AppError::internal("could not encode domain checkout"))?;
    let operation = outcome["operationId"]
        .as_str()
        .ok_or_else(|| AppError::internal("missing checkout operation"))?;
    let current = serde_json::to_value(facade.status(operation)?)
        .map_err(|_| AppError::internal("could not encode checkout status"))?;
    let reference = facade.payment_reference(operation)?;
    let mut response = json!({"status":current["status"],"operationId":operation,"sessionId":reference,"url":null});
    if let Some(reference) = reference {
        let status = provider_status(seams, &reference)?;
        if status["status"] == "expired" && status["paymentStatus"] == "unpaid" {
            response["status"] = json!("expired");
        } else if current["status"] == "action_required" && status["status"] == "open" {
            let resolved = facade.resolve(
                &json!({"schemaVersion":1,"operationId":operation,
                "expectedAttemptId":body.intent_id,"returnArtifact":reference})
                .to_string(),
            )?;
            let resolved = serde_json::to_value(resolved)
                .map_err(|_| AppError::internal("could not encode checkout resolution"))?;
            response["url"] = resolved["checkoutUrl"].clone();
        }
    }
    Ok(RouteResponse::ok(&response))
}

#[cfg(test)]
#[path = "domain_checkout_tests.rs"]
mod tests;

fn provider_status<S: HostSeams>(seams: &S, id: &str) -> AppResult<Value> {
    use crate::stripe::{
        api,
        checkout_provider::{self, RetrieveClassification, SessionStatus},
    };
    let secret = seams
        .secret_get(ids::SECRET_STRIPE_KEY)?
        .filter(|secret| !secret.is_empty())
        .ok_or_else(|| AppError::new(503, "unavailable", "card payments are not configured"))?;
    let fetch = checkout_provider::build_retrieve(&secret, id)
        .map_err(|_| AppError::unprocessable("invalid checkout session"))?;
    let raw = seams.http_fetch(&fetch.to_string())?;
    let (status, body) = api::unwrap_fetch(&raw)
        .map_err(|_| AppError::new(502, "provider_unavailable", "could not verify checkout"))?;
    match checkout_provider::classify_retrieve(status, &body) {
        RetrieveClassification::Found(session) if session.id == id => Ok(json!({
            "status":match session.status { SessionStatus::Open=>"open", SessionStatus::Complete=>"complete", SessionStatus::Expired=>"expired" },
            "paymentStatus":session.payment_status
        })),
        _ => Err(AppError::new(
            502,
            "provider_unavailable",
            "could not verify checkout",
        )),
    }
}

fn valid_intent_id(value: &str) -> bool {
    value.len() == 36
        && value.bytes().enumerate().all(|(index, byte)| {
            if matches!(index, 8 | 13 | 18 | 23) {
                byte == b'-'
            } else {
                byte.is_ascii_hexdigit()
            }
        })
}
