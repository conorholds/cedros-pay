use super::{
    auth::VerifiedPlatform,
    session_store::{self as store, Session},
    SESSION_MODEL,
};
use crate::{
    checkout_contract::{CanonicalCheckoutFacade, CanonicalPaymentOutcome},
    ctx::RequestContext,
    db::{BatchOp, Db},
    error::{AppError, AppResult},
    guarded_batch::{GuardedBatchOutcome, GuardedCondition},
    reqresp::{RouteRequest, RouteResponse},
    seams::HostSeams,
};
use serde_json::{json, Value};

pub(super) fn handle<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    origin: &str,
    platform: &VerifiedPlatform,
) -> AppResult<RouteResponse> {
    let context = RequestContext::parse(&req.context_json);
    let (site, environment) = store::scope(&context)?;
    let create = req.route_id == "cedros-pay:ucp-checkout-create";
    let id = if create {
        format!(
            "ucp_{}",
            store::mac(
                seams,
                &[
                    "session",
                    site,
                    environment,
                    platform.profile(),
                    super::idempotency_key(req)?
                ]
            )?
        )
    } else {
        super::transport::session_id(req)?.to_string()
    };
    let db = Db::new(seams, crate::ids::DB_ACCESS);
    if req.method == "GET" {
        let (_, session) = store::load(seams, &id)?;
        let authority = store::authorize(&session, &context, platform)?;
        return response(seams, &context, &authority, &session, origin);
    }
    let key = super::idempotency_key(req)?;
    let receipt_key = format!(
        "receipt_{}",
        store::mac(
            seams,
            &[
                "receipt",
                site,
                environment,
                platform.profile(),
                &req.method,
                &req.path,
                key
            ]
        )?
    );
    let fingerprint = store::digest(&json!([req.method, req.path, req.body]).to_string());
    if let Some(entry) = db.read_one(SESSION_MODEL, &receipt_key)? {
        if entry.payload["fingerprint"] != fingerprint {
            return Err(AppError::conflict(
                "Idempotency-Key was used for different request material",
            ));
        }
        let expires = entry.payload["expiresAt"]
            .as_i64()
            .ok_or_else(|| AppError::internal("invalid checkout replay"))?;
        if seams.now_unix_secs() >= expires {
            return Err(AppError::new(
                410,
                "checkout_expired",
                "checkout replay has expired",
            ));
        }
        return Ok(
            RouteResponse::json(if create { 201 } else { 200 }, &entry.payload["response"])
                .with_header("cache-control", "no-store"),
        );
    }
    let mut conditions = vec![GuardedCondition::Absent {
        content_model_id: SESSION_MODEL,
        entry_key: receipt_key.clone(),
    }];
    let authority = store::new_authority(&context, platform, &id)?;
    let facade = CanonicalCheckoutFacade::for_ucp_session(seams, &context, &authority)?;
    let session = if create {
        let input = req.json_body()?;
        let body = super::intent::quote_body(seams, site, origin, &id, 0, &input)?;
        let quote: Value = serde_json::from_str(&body)
            .map_err(|_| AppError::internal("invalid generated quote"))?;
        let preview = facade.preview(
            quote["idempotencyKey"].as_str().expect("generated key"),
            &body,
        )?;
        conditions.push(GuardedCondition::Absent {
            content_model_id: SESSION_MODEL,
            entry_key: id.clone(),
        });
        Session {
            id: id.clone(),
            owner: platform.profile().into(),
            site: site.into(),
            environment: environment.into(),
            revision: 0,
            created_at: seams.now_unix_secs(),
            expires_at: seams.now_unix_secs().saturating_add(6 * 60 * 60),
            quote_body: body,
            preview,
            state: "open".into(),
            operation_id: None,
            return_artifact: None,
        }
    } else {
        let (entry, mut session) = store::load(seams, &id)?;
        store::authorize(&session, &context, platform)?;
        store::live(seams, &session)?;
        if session.state != "open" {
            return Err(AppError::conflict(
                "checkout has entered payment and cannot be changed",
            ));
        }
        conditions.push(store::version(&entry)?);
        match req.route_id.as_str() {
            "cedros-pay:ucp-checkout-update"=>{
                let input=req.json_body()?;
                if input.get("id").is_some_and(|v|v!=&json!(id)){return Err(AppError::bad_request("checkout id does not match route"));}
                session.revision=session.revision.checked_add(1).filter(|v|*v<=100).ok_or_else(||AppError::unprocessable("checkout update limit reached"))?;
                let body=super::intent::quote_body(seams,site,origin,&id,session.revision,&input)?;
                let quote:Value=serde_json::from_str(&body).map_err(|_|AppError::internal("invalid generated quote"))?;
                session.preview=facade.preview(quote["idempotencyKey"].as_str().expect("generated key"),&body)?;
                session.quote_body=body;
            },
            "cedros-pay:ucp-checkout-cancel"=>{session.state="canceled".into();session.quote_body.clear();},
            "cedros-pay:ucp-checkout-complete"=>return Err(AppError::unprocessable("this checkout requires buyer authorization at continue_url; no native payment handler is advertised")),
            _=>return Err(AppError::not_found("unknown checkout operation")),
        }
        session
    };
    // Response and replay receipt commit with the state transition. A lost
    // response or concurrent retry cannot create another session or mutation.
    let value = representation(seams, &session, origin)?;
    let receipt = BatchOp::Write {
        content_model_id: SESSION_MODEL,
        entry_key: receipt_key,
        data: json!({"fingerprint":fingerprint,"expiresAt":seams.now_unix_secs().saturating_add(48 * 60 * 60),"response":value}),
    };
    if !matches!(
        db.guarded_batch(&conditions, &[store::write(&session)?, receipt])?,
        GuardedBatchOutcome::Applied { .. }
    ) {
        return Err(AppError::conflict(
            "checkout request changed concurrently; retry with the same Idempotency-Key",
        ));
    }
    Ok(RouteResponse::json(if create { 201 } else { 200 }, &value)
        .with_header("cache-control", "no-store"))
}

fn response<S: HostSeams>(
    seams: &S,
    context: &RequestContext,
    authority: &store::SessionAuthority,
    session: &Session,
    origin: &str,
) -> AppResult<RouteResponse> {
    let mut value = representation(seams, session, origin)?;
    if let Some(operation) = &session.operation_id {
        let facade = CanonicalCheckoutFacade::for_ucp_session(seams, context, authority)?;
        let status = match facade.status(operation)? {
            CanonicalPaymentOutcome::Paid { .. } => Some("completed"),
            CanonicalPaymentOutcome::Terminal { .. } => Some("canceled"),
            CanonicalPaymentOutcome::Processing { .. }
            | CanonicalPaymentOutcome::Indeterminate { .. } => Some("complete_in_progress"),
            CanonicalPaymentOutcome::ActionRequired { .. } => None,
        };
        if let Some(status) = status {
            value["status"] = json!(status);
            let object = value.as_object_mut().expect("object constructed above");
            object.remove("messages");
            if status != "complete_in_progress" {
                object.remove("continue_url");
            }
        }
    }
    Ok(RouteResponse::ok(&value).with_header("cache-control", "no-store"))
}
pub(super) fn representation<S: HostSeams>(
    seams: &S,
    session: &Session,
    origin: &str,
) -> AppResult<Value> {
    let quote = &session.preview;
    let lines=quote.lines.iter().enumerate().map(|(index,line)|json!({"id":format!("line-{index}"),"item":{"id":super::catalog::item_id(&session.site,&line.resource,line.variant_id.as_deref()),"title":line.title,"price":line.unit_amount_cents},"quantity":line.qty,"totals":[{"type":"subtotal","amount":line.line_total_cents},{"type":"total","amount":line.line_total_cents}]})).collect::<Vec<_>>();
    let status = if session.state == "canceled"
        || (session.state == "open" && seams.now_unix_secs() >= session.expires_at)
    {
        "canceled"
    } else if session.state == "processing" && session.operation_id.is_none() {
        "complete_in_progress"
    } else {
        "requires_escalation"
    };
    let mut value = json!({"ucp":super::envelope("dev.ucp.shopping.checkout"),"id":session.id,"line_items":lines,"currency":quote.currency,"status":status,"totals":[{"type":"subtotal","amount":quote.subtotal_cents},{"type":"discount","amount":quote.discount_cents},{"type":"fulfillment","amount":quote.shipping_cents},{"type":"tax","amount":quote.tax_cents},{"type":"total","amount":quote.total_cents}],"links":[],"expires_at":crate::time::iso8601(session.expires_at)});
    if status == "requires_escalation" {
        value["continue_url"] = json!(format!(
            "{origin}/extensions/cedros-pay/ucp/handoff/{}?token={}",
            session.id,
            store::handoff_token(seams, session)?
        ));
        value["messages"] = json!([{"type":"error","code":"requires_buyer_authorization","content":"Continue to secure checkout to authorize payment.","severity":"requires_buyer_input"}]);
    }
    Ok(value)
}
