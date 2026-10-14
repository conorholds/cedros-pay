use super::*;
use crate::{
    ctx::RequestContext,
    db::{Db, Dir, Filter, Op, Query},
    guarded_batch::GuardedBatchOutcome,
    reqresp::{RouteRequest, RouteResponse, RouteSpec},
    seams::HostSeams,
};
use serde_json::{json, Value};

pub const ROUTES: &[RouteSpec] = &[
    RouteSpec {
        route_id: super::ai::QUERY,
        method: "POST",
        path: "/admin/assistant/orders/query",
    },
    RouteSpec {
        route_id: super::ai::GET,
        method: "POST",
        path: "/admin/assistant/orders/get",
    },
    RouteSpec {
        route_id: super::ai::FULFILLMENT,
        method: "POST",
        path: "/admin/assistant/orders/fulfillment",
    },
    RouteSpec {
        route_id: LIST,
        method: "GET",
        path: "/portal-source/v1/orders",
    },
    RouteSpec {
        route_id: DETAIL,
        method: "GET",
        path: "/portal-source/v1/orders/{id}",
    },
    RouteSpec {
        route_id: "cedros-pay:admin-order-fulfillment-read",
        method: "GET",
        path: "/admin/orders/{id}/fulfillment",
    },
    RouteSpec {
        route_id: FULFILL,
        method: "POST",
        path: "/admin/orders/{id}/fulfillment",
    },
];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if super::ai::is_route(&req.route_id) {
        return super::ai::handle(seams, req);
    }
    let ctx = RequestContext::parse(&req.context_json);
    let db = Db::new(seams, ids::DB_ACCESS);
    if matches!(req.route_id.as_str(), LIST | DETAIL) {
        // Ordinary admin sessions, relying-party tokens and forged headers
        // cannot manufacture this host-only service invocation.
        if !ctx.authenticated
            || ctx.principal_id.as_deref() != Some("cedros-core:portal-orders")
            || ctx.auth_scheme.as_deref() != Some("managed-source")
            || !ctx
                .capability_claims
                .iter()
                .any(|claim| claim == &req.route_id)
            || ctx.actor_id.as_deref().is_none_or(str::is_empty)
        {
            return Err(AppError::forbidden("managed order authority required"));
        }
        let site = ctx.require_site_id()?;
        if req.method != "GET" || (!req.body.is_empty() && req.body != "null") {
            return Err(AppError::bad_request("invalid read request"));
        }
        if req.route_id == LIST {
            if !crate::routes::matches(req, "GET", "/portal-source/v1/orders")
                || req.query.len() > 1
                || req.query.iter().any(|(key, _)| key != "after")
            {
                return Err(AppError::bad_request("invalid order query"));
            }
            let mut query = Query::new()
                .filter(Filter::new("kind", Op::Eq, "order"))
                .order("reference", Dir::Asc)
                .limit(26);
            if let Some(after) = req.query_value("after") {
                valid_id(after)?;
                query = query.filter(Filter::new("reference", Op::Gt, after));
            }
            // Core consumes this trusted keyset in one bounded source snapshot.
            // Check historical completeness once, before the first page; doing
            // a full history scan on every 25-row continuation is quadratic.
            if req.query_value("after").is_none() {
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
            return response(
                json!({"contractVersion":1,"items":items,"nextAfter":if has_more {after} else {None}}),
            );
        }
        if !req.query.is_empty() {
            return Err(AppError::bad_request("invalid order query"));
        }
        let id = path_id(req, "/portal-source/v1/orders/", "")?;
        let (_, order) = load(&db, id)?;
        return response(
            json!({"contractVersion":1,"item":projection::project(&db, &order, site, true)?}),
        );
    }
    ctx.require_claim("cedros-pay:admin")?;
    if !req.query.is_empty() {
        return Err(AppError::bad_request("invalid fulfillment query"));
    }
    let id = path_id(req, "/admin/orders/", "/fulfillment")?;
    match req.route_id.as_str() {
        "cedros-pay:admin-order-fulfillment-read"
            if req.method == "GET" && (req.body.is_empty() || req.body == "null") =>
        {
            let (entry, order) = load(&db, id)?;
            response(
                json!({"orderId":id,"version":entry.version,"cancelled":order.cancelled,"lines":order.lines}),
            )
        }
        FULFILL if req.method == "POST" => fulfill(seams, &db, req, &ctx, id),
        _ => Err(AppError::not_found("unknown fulfillment route")),
    }
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct Fulfillment {
    pub(super) expected_version: String,
    /// Cumulative delivered quantities in the immutable order line order.
    pub(super) delivered: Vec<u64>,
    pub(super) cancelled: bool,
}
pub(super) fn fulfill<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    req: &RouteRequest,
    ctx: &RequestContext,
    id: &str,
) -> AppResult<RouteResponse> {
    ctx.require_admin_write_or_capability(&req.route_id)?;
    crate::guarded_policy::require_active(seams)?;
    let actor = ctx
        .actor_id
        .as_deref()
        .filter(|v| !v.is_empty())
        .ok_or_else(|| AppError::forbidden("verified actor required"))?;
    let key = ctx
        .idempotency_key
        .as_deref()
        .filter(|v| !v.is_empty() && v.len() <= 200 && v.bytes().all(|b| b.is_ascii_graphic()))
        .ok_or_else(|| AppError::bad_request("idempotency key required"))?;
    if req.body.len() > 16 * 1024 {
        return Err(oversized());
    }
    let update: Fulfillment = serde_json::from_value(req.json_body()?)
        .map_err(|_| AppError::bad_request("invalid fulfillment update"))?;
    if update.expected_version.is_empty() || update.expected_version.len() > 200 {
        return Err(AppError::bad_request("order revision required"));
    }
    let fingerprint = hex::encode(Sha256::digest(req.body.as_bytes()));
    let receipt = format!(
        "fulfillment_{}",
        hex::encode(Sha256::digest(
            serde_json::to_vec(&(actor, id, key)).map_err(|_| unavailable())?
        ))
    );
    // Read the order again even on replay: a deleted order is not resurrected.
    let (entry, mut order) = load(db, id)?;
    if let Some(saved) = db.read_one(ids::MODEL_LEDGER, &receipt)? {
        if saved.payload["fingerprint"] != fingerprint {
            return Err(AppError::conflict(
                "idempotency key has different fulfillment material",
            ));
        }
        return response(saved.payload["result"].clone());
    }
    if entry.version.as_deref() != Some(&update.expected_version) {
        return Err(AppError::conflict(
            "order changed; reload its fulfillment state",
        ));
    }
    if update.delivered.len() != order.lines.len()
        || order.cancelled && !update.cancelled
        || order
            .lines
            .iter()
            .zip(&update.delivered)
            .any(|(line, next)| {
                *next < line.delivered
                    || *next > line.quantity
                    || order.cancelled && *next != line.delivered
            })
    {
        return Err(AppError::unprocessable("invalid delivery transition"));
    }
    for (line, delivered) in order.lines.iter_mut().zip(update.delivered) {
        line.delivered = delivered;
    }
    order.cancelled = update.cancelled;
    order.updated_at = crate::time::iso8601(seams.now_unix_secs());
    order.validate()?;
    let result = json!({"orderId":id,"cancelled":order.cancelled,"lines":order.lines});
    let conditions = [
        GuardedCondition::Version {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: id.into(),
            expected_version: update.expected_version,
        },
        GuardedCondition::Absent {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: receipt.clone(),
        },
    ];
    let ops = [
        write(&order)?,
        BatchOp::Write {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: receipt.clone(),
            data: json!({
                "kind":"fulfillment","reference":receipt,"orderId":id,"actorId":actor,"fingerprint":fingerprint,"result":result,"createdAt":order.updated_at
            }),
        },
    ];
    match db.guarded_batch(&conditions, &ops)? {
        GuardedBatchOutcome::Applied { .. } => response(result),
        GuardedBatchOutcome::Conflict { .. } => Err(AppError::conflict(
            "fulfillment changed; retry with the same identity",
        )),
    }
}
pub(super) fn load<S: HostSeams>(
    db: &Db<'_, S>,
    id: &str,
) -> AppResult<(crate::db::EntryRecord, Order)> {
    let entry = db
        .read_one(ids::MODEL_LEDGER, id)?
        .ok_or_else(|| AppError::not_found("order not found"))?;
    if entry.payload["kind"] != "order" {
        return Err(AppError::not_found("order not found"));
    }
    let order: Order = entry.parse()?;
    order.validate()?;
    if order.reference != id {
        return Err(unavailable());
    }
    Ok((entry, order))
}
fn path_id<'a>(req: &'a RouteRequest, prefix: &str, suffix: &str) -> AppResult<&'a str> {
    let path = req
        .path
        .strip_prefix("/extensions/cedros-pay")
        .unwrap_or(&req.path);
    let id = path
        .strip_prefix(prefix)
        .and_then(|v| v.strip_suffix(suffix))
        .ok_or_else(|| AppError::not_found("order not found"))?;
    valid_id(id)?;
    Ok(id)
}
pub(super) fn valid_id(value: &str) -> AppResult<()> {
    if value.len() != 70
        || !value.starts_with("order_")
        || !value[6..]
            .bytes()
            .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
    {
        return Err(AppError::bad_request("invalid order id"));
    }
    Ok(())
}
pub(super) fn response(value: Value) -> AppResult<RouteResponse> {
    if serde_json::to_vec(&value).map_err(|_| unavailable())?.len() > 512 * 1024 {
        return Err(oversized());
    }
    let mut response = RouteResponse::ok(&value);
    response
        .headers
        .push(("cache-control".into(), "no-store".into()));
    Ok(response)
}
