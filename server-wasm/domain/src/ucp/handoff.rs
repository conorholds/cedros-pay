//! UCP's standard buyer handoff. The opaque, revision-bound token authorizes
//! only this checkout; it cannot access other sessions or management routes.
use super::session_store as store;
use crate::{
    checkout_contract::{
        CanonicalCheckoutFacade, CanonicalPaymentOutcome, CanonicalResolveOutcome,
    },
    ctx::RequestContext,
    error::{AppError, AppResult},
    reqresp::{RouteRequest, RouteResponse},
    seams::HostSeams,
};
use serde_json::{json, Value};

pub(super) fn handle<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    origin: &str,
) -> AppResult<RouteResponse> {
    let id = super::transport::session_id(req)?;
    if req.query.len() != 1 || req.query[0].0 != "token" {
        return Err(AppError::not_found("checkout session was not found"));
    }
    let token = &req.query[0].1;
    let context = RequestContext::parse(&req.context_json);
    let (mut entry, mut session) = store::load(seams, id)?;
    let authority = store::authorize_handoff(seams, &session, &context, token)?;
    store::live(seams, &session)?;
    let facade = CanonicalCheckoutFacade::for_ucp_session(seams, &context, &authority)?;
    if req.method == "GET" {
        let items = session
            .preview
            .lines
            .iter()
            .map(|line| format!("<li>{} × {}</li>", line.qty, escape(&line.title)))
            .collect::<String>();
        return Ok(html(200,&format!("<h1>Review your purchase</h1><ul>{items}</ul><p>Continue to secure payment to review the final total and authorize your purchase.</p><form method=\"post\"><button type=\"submit\">Continue to payment</button></form>")));
    }
    if req.header("origin") != Some(origin) {
        return Err(AppError::forbidden(
            "same-origin checkout confirmation required",
        ));
    }
    if !req.body.is_empty() {
        return Err(AppError::bad_request(
            "checkout handoff accepts no payment credentials",
        ));
    }
    if session.state == "open" {
        let body: Value = serde_json::from_str(&session.quote_body)
            .map_err(|_| AppError::internal("invalid stored checkout intent"))?;
        let key = body["idempotencyKey"]
            .as_str()
            .ok_or_else(|| AppError::internal("invalid stored quote key"))?;
        session.preview = facade.preview(key, &session.quote_body)?;
        session.state = "processing".into();
        store::save(seams, &entry, &session)?;
        (entry, session) = store::load(seams, id)?;
    }
    let quote_body: Value = serde_json::from_str(&session.quote_body)
        .map_err(|_| AppError::internal("invalid stored checkout intent"))?;
    let quote_key = quote_body["idempotencyKey"]
        .as_str()
        .ok_or_else(|| AppError::internal("invalid stored quote key"))?;
    let quote = facade.quote(quote_key, &session.quote_body)?;
    session.preview = quote.quote.clone();
    let key = store::digest(&format!("{}-{}-checkout", session.id, session.revision));
    let checkout = json!({"schemaVersion":1,"idempotencyKey":key,"attemptId":quote.attempt_id,"clientMaterialSha256":store::digest(&session.quote_body),"quoteOperationId":quote.operation_id,"paymentMethod":"stripe","railProof":{"kind":"stripe"},"customerContext":quote_body["customerContext"]});
    let outcome = facade.checkout(&key, &checkout.to_string())?;
    let (operation_id, artifact) = match outcome {
        CanonicalPaymentOutcome::ActionRequired {
            operation_id,
            return_artifact,
            ..
        } => (operation_id, Some(return_artifact)),
        CanonicalPaymentOutcome::Paid { operation_id, .. } => (operation_id, None),
        CanonicalPaymentOutcome::Processing { operation_id, .. }
        | CanonicalPaymentOutcome::Indeterminate { operation_id, .. } => {
            persist(seams, &entry, &mut session, &operation_id, None)?;
            return Ok(html(202,"<h1>Payment is being checked</h1><p>Please wait, then retry this checkout. Do not start another payment.</p><form method=\"post\"><button>Check payment</button></form>").with_header("retry-after","3"));
        }
        CanonicalPaymentOutcome::Terminal { operation_id, .. } => {
            persist(seams, &entry, &mut session, &operation_id, None)?;
            return Err(AppError::conflict(
                "payment could not be completed; request a new checkout",
            ));
        }
    };
    persist(
        seams,
        &entry,
        &mut session,
        &operation_id,
        artifact.as_deref(),
    )?;
    let Some(artifact) = artifact else {
        return Ok(html(
            200,
            "<h1>Payment complete</h1><p>Your purchase is confirmed.</p>",
        ));
    };
    match facade.resolve(&json!({"schemaVersion":1,"operationId":operation_id,"expectedAttemptId":quote.attempt_id,"returnArtifact":artifact}).to_string())? {
        CanonicalResolveOutcome::Resolved{checkout_url,..}=>Ok(html(303,"").with_header("location",checkout_url)),
        _=>Err(AppError::new(503,"checkout_pending","secure payment URL is not yet available; retry this checkout")),
    }
}
fn persist<S: HostSeams>(
    seams: &S,
    entry: &crate::db::EntryRecord,
    session: &mut store::Session,
    operation_id: &str,
    artifact: Option<&str>,
) -> AppResult<()> {
    session.operation_id = Some(operation_id.into());
    if let Some(artifact) = artifact {
        session.return_artifact = Some(artifact.into());
    }
    match store::save(seams, entry, session) {
        Ok(()) => Ok(()),
        Err(error) if error.status == 409 => {
            let (_, current) = store::load(seams, &session.id)?;
            if current.revision == session.revision
                && current.operation_id.as_deref() == Some(operation_id)
                && artifact.is_none_or(|a| current.return_artifact.as_deref() == Some(a))
            {
                Ok(())
            } else {
                Err(error)
            }
        }
        Err(error) => Err(error),
    }
}
fn escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}
fn html(status: u16, content: &str) -> RouteResponse {
    RouteResponse{status,headers:vec![("content-type".into(),"text/html; charset=utf-8".into()),("cache-control".into(),"no-store".into()),("referrer-policy".into(),"no-referrer".into()),("x-robots-tag".into(),"noindex, nofollow, nosnippet".into()),("content-security-policy".into(),"default-src 'none'; form-action 'self' https://checkout.stripe.com; frame-ancestors 'none'; base-uri 'none'".into())],body:format!("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Secure checkout</title></head><body><main>{content}</main></body></html>")}
}
