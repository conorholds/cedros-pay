//! Fixed, schema-closed order operations for the host capability broker.
//! Never grants generic administrator or managed-source authority.
use super::routes::{fulfill, load, response, valid_id, Fulfillment};
use super::*;
use crate::{
    ctx::RequestContext,
    db::{Db, Dir, Filter, Op, Query},
    reqresp::{RouteRequest, RouteResponse},
    seams::HostSeams,
};
use serde_json::json;
#[cfg(test)]
use serde_json::Value;

pub const QUERY: &str = "cedros-pay:ai-orders-query";
pub const GET: &str = "cedros-pay:ai-order-get";
pub const FULFILLMENT: &str = "cedros-pay:ai-order-fulfillment";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct QueryInput {
    after: Option<String>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GetInput {
    order_id: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct FulfillmentInput {
    order_id: String,
    expected_version: String,
    delivered: Vec<u64>,
    cancelled: bool,
}

pub(super) fn is_route(route: &str) -> bool {
    matches!(route, QUERY | GET | FULFILLMENT)
}

pub(super) fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let expected_path = match req.route_id.as_str() {
        QUERY => "/admin/assistant/orders/query",
        GET => "/admin/assistant/orders/get",
        FULFILLMENT => "/admin/assistant/orders/fulfillment",
        _ => return Err(AppError::not_found("unknown order capability")),
    };
    if !crate::routes::matches(req, "POST", expected_path)
        || !req.query.is_empty()
        || req.body.len() > 16 * 1024
    {
        return Err(AppError::bad_request("invalid order capability request"));
    }
    let ctx = RequestContext::parse(&req.context_json);
    ctx.require_claim_or_capability("cedros-pay:admin", &req.route_id)?;
    let site = ctx.require_site_id()?;
    let db = Db::new(seams, ids::DB_ACCESS);
    match req.route_id.as_str() {
        QUERY => {
            let input: QueryInput = parse(req)?;
            let mut query = Query::new()
                .filter(Filter::new("kind", Op::Eq, "order"))
                .order("reference", Dir::Asc)
                .limit(26);
            if let Some(after) = input.after.as_deref() {
                valid_id(after)?;
                query = query.filter(Filter::new("reference", Op::Gt, after));
            } else {
                crate::checkout_contract::require_complete_order_history(&db)?;
            }
            let entries = db.read(ids::MODEL_LEDGER, &query)?;
            let has_more = entries.len() > 25;
            let mut items = Vec::new();
            let mut after = None;
            for entry in entries.into_iter().take(25) {
                let order: Order = entry.parse()?;
                if order.reference != entry.entry_key {
                    return Err(unavailable());
                }
                after = Some(order.reference.clone());
                items.push(projection::project(&db, &order, site, false)?);
            }
            response(json!({"items":items,"nextAfter":if has_more {after} else {None}}))
        }
        GET => {
            let input: GetInput = parse(req)?;
            valid_id(&input.order_id)?;
            let (entry, order) = load(&db, &input.order_id)?;
            response(json!({
                "item":projection::project(&db,&order,site,true)?,
                "version":entry.version,"cancelled":order.cancelled,"lines":order.lines
            }))
        }
        FULFILLMENT => {
            let input: FulfillmentInput = parse(req)?;
            valid_id(&input.order_id)?;
            if load(&db, &input.order_id)?.1.digital != Some(false) {
                return Err(AppError::unprocessable(
                    "this capability only updates physical order fulfillment",
                ));
            }
            let mutation = Fulfillment {
                expected_version: input.expected_version,
                delivered: input.delivered,
                cancelled: input.cancelled,
            };
            // Retain the exact AI route claim and all verified host context.
            // Only the typed business body is adapted to the shared domain function.
            let mut request = req.clone();
            request.body = serde_json::to_string(&mutation).map_err(|_| unavailable())?;
            fulfill(seams, &db, &request, &ctx, &input.order_id)
        }
        _ => Err(AppError::not_found("unknown order capability")),
    }
}

fn parse<T: serde::de::DeserializeOwned>(req: &RouteRequest) -> AppResult<T> {
    serde_json::from_value(req.json_body()?)
        .map_err(|_| AppError::bad_request("invalid order capability input"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fake::FakeSeams;

    fn request(route: &str, body: Value) -> RouteRequest {
        RouteRequest {
            route_id: route.into(), method: "POST".into(),
            path: match route {QUERY=>"/admin/assistant/orders/query",GET=>"/admin/assistant/orders/get",_=>"/admin/assistant/orders/fulfillment"}.into(),
            body: body.to_string(),
            context_json: json!({"authenticated":true,"actorId":"owner-a","authScheme":"bearer-token","capabilityClaims":[route],"siteId":"site-a","idempotencyKey":"stable-order-action"}).to_string(),
            ..Default::default()
        }
    }
    #[test]
    fn exact_bearer_read_is_non_mutating_and_omits_payment_material() {
        let seams = FakeSeams::new();
        let order = super::super::tests::seed(&seams, "cs_ai_read");
        let before = seams.db_batch_request_count();
        let result = crate::handle_route(&seams, request(GET, json!({"orderId":order.reference})));
        assert_eq!(result.status, 200, "{}", result.body);
        assert!(!result.body.contains("cs_ai_read"));
        assert!(!result.body.contains("paymentReference"));
        assert_eq!(before, seams.db_batch_request_count());
        assert!(seams.http_requests.borrow().is_empty());
    }
    #[test]
    fn wrong_claim_unknown_fields_and_wrong_path_are_denied() {
        let seams = FakeSeams::new();
        let mut req = request(GET, json!({"orderId":"order_".to_owned()+&"a".repeat(64)}));
        req.context_json=json!({"authenticated":true,"authScheme":"bearer-token","capabilityClaims":[QUERY],"siteId":"site-a"}).to_string();
        assert_eq!(crate::handle_route(&seams, req).status, 403);
        assert_eq!(
            crate::handle_route(&seams, request(QUERY, json!({"capability":"arbitrary"}))).status,
            400
        );
        let mut req = request(QUERY, json!({}));
        req.path = "/admin/products".into();
        assert_eq!(crate::handle_route(&seams, req).status, 400);
    }
    #[test]
    fn fulfillment_uses_existing_revision_replay_and_delivery_invariants() {
        let seams = FakeSeams::new();
        crate::guarded_policy::enroll(&seams).unwrap();
        let order = super::super::tests::seed(&seams, "cs_ai_fulfill");
        let db = Db::new(&seams, ids::DB_ACCESS);
        let version = load(&db, &order.reference).unwrap().0.version.unwrap();
        let body = json!({"orderId":order.reference,"expectedVersion":version,"delivered":[1],"cancelled":false});
        let req = request(FULFILLMENT, body.clone());
        let first = crate::handle_route(&seams, req.clone());
        assert_eq!(first.status, 200, "{}", first.body);
        let replay = crate::handle_route(&seams, req);
        assert_eq!(first.body, replay.body);
        let mut changed = body;
        changed["delivered"] = json!([2]);
        assert_eq!(
            crate::handle_route(&seams, request(FULFILLMENT, changed)).status,
            409
        );
        let mut fresh = request(
            FULFILLMENT,
            json!({"orderId":order.reference,"expectedVersion":version,"delivered":[0],"cancelled":false}),
        );
        let mut ctx: Value = serde_json::from_str(&fresh.context_json).unwrap();
        ctx["idempotencyKey"] = json!("new-action-key");
        fresh.context_json = ctx.to_string();
        assert_eq!(crate::handle_route(&seams, fresh).status, 409);
    }
}
