//! Financial owner implementation of Data's capacity v1.0.0 standard.
mod access;
pub(crate) mod administration;
mod billing;
mod binding;
mod catalog;
pub(crate) mod config;
mod discount;
mod grants;
mod purchase;
pub mod reconcile;
mod registrations;
mod store;
mod wire;
use crate::{
    error::AppResult,
    reqresp::{RouteRequest, RouteResponse},
    seams::HostSeams,
};
pub(crate) use billing::get as stripe_get;
pub use registrations::ROUTES;
use serde_json::json;
pub(crate) use wire::unavailable as source_unavailable;
pub fn handle<S: HostSeams>(s: &S, req: &RouteRequest) -> RouteResponse {
    let mut stage = "request";
    match dispatch(s, req, &mut stage) {
        Ok(response) => response,
        Err(e) => {
            // Only fixed stage names and typed status/codes are diagnostic input.
            // Error messages, buyer identity, commands and credentials stay private.
            s.log(
                "warn",
                &format!(
                    "capacity operation failed stage={stage} status={} code={}",
                    e.status, e.code
                ),
            );
            let (status, code) =
                if wire::contract()["httpErrors"][e.code].as_u64() == Some(u64::from(e.status)) {
                    (e.status, e.code)
                } else {
                    (503, "source_unavailable")
                };
            let message =
                if code == "invalid_request" && e.message == discount::INVALID_COUPON_MESSAGE {
                    discount::INVALID_COUPON_MESSAGE
                } else {
                    "capacity operation could not be completed"
                };
            RouteResponse::json(status,&json!({"error":{"code":code,"message":message,"httpStatus":status,"retryable":status==503}})).with_header("cache-control","no-store")
        }
    }
}
fn dispatch<S: HostSeams>(
    s: &S,
    req: &RouteRequest,
    stage: &mut &'static str,
) -> AppResult<RouteResponse> {
    let spec = ROUTES
        .iter()
        .find(|r| r.route_id == req.route_id)
        .ok_or_else(wire::invalid)?;
    if req.method != spec.method || !req.query.is_empty() {
        return Err(wire::invalid());
    }
    let internal = !spec.route_id.ends_with("-http-v1");
    let bindings = wire::contract()["serviceBindings"]
        .as_array()
        .ok_or_else(wire::unavailable)?;
    let op_id = if internal {
        bindings
            .iter()
            .find(|b| b["routeId"] == spec.route_id)
            .and_then(|b| b["operationId"].as_str())
            .ok_or_else(wire::invalid)?
    } else {
        wire::contract()["operations"]
            .as_array()
            .and_then(|ops| ops.iter().find(|o| o["routeId"] == spec.route_id))
            .and_then(|o| o["operationId"].as_str())
            .ok_or_else(wire::invalid)?
    };
    let op = wire::contract()["operations"]
        .as_array()
        .and_then(|ops| ops.iter().find(|o| o["operationId"] == op_id))
        .ok_or_else(wire::invalid)?;
    let mut path_values = serde_json::Map::new();
    let path = req
        .path
        .strip_prefix("/extensions/cedros-pay")
        .unwrap_or(&req.path);
    let expected: Vec<_> = spec.path.split('/').collect();
    let actual: Vec<_> = path.split('/').collect();
    if expected.len() != actual.len() {
        return Err(wire::invalid());
    }
    for (e, a) in expected.iter().zip(actual) {
        if e.starts_with('{') && e.ends_with('}') {
            if a.is_empty()
                || a.len() > 160
                || !a
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b"_-".contains(&b))
            {
                return Err(wire::invalid());
            }
            path_values.insert(e[1..e.len() - 1].into(), a.into());
        } else if *e != a {
            return Err(wire::invalid());
        }
    }
    let invocation = if internal {
        wire::parse(&req.body)?
    } else {
        let mut command = if spec.method == "GET" {
            if !req.body.trim().is_empty() {
                return Err(wire::invalid());
            }
            json!({})
        } else {
            wire::parse(&req.body)?
        };
        for (k, v) in path_values {
            if command.get(&k).is_some_and(|old| old != &v) {
                return Err(wire::invalid());
            }
            command[k] = v;
        }
        let delegation = header(req, "x-cedros-capacity-delegation")?;
        let key = header(req, "idempotency-key")?;
        json!({"contractVersion":wire::VERSION,"operationId":op_id,"delegationId":delegation,"requestKey":key,"command":command})
    };
    wire::validate("Invocation", &invocation)?;
    if invocation["operationId"] != op_id
        || (op["idempotencyKeyRequired"] == true) == invocation["requestKey"].is_null()
    {
        return Err(wire::invalid());
    }
    if internal {
        for (name, field) in [
            ("idempotency-key", "requestKey"),
            ("x-cedros-capacity-delegation", "delegationId"),
        ] {
            if let Some(h) = header(req, name)? {
                if invocation[field] != h {
                    return Err(wire::invalid());
                }
            }
        }
    }
    let command = &invocation["command"];
    let schema = wire::text(&op["requestSchema"], "$ref")?.trim_start_matches("#/$defs/");
    wire::validate(schema, command)?;
    *stage = "authority";
    let a = access::check(s, req, op, invocation.clone(), internal)?;
    // This model is already under the durable guarded-only policy. Keep the
    // check after authority so unprivileged requests cannot probe activation.
    *stage = "guarded-policy";
    crate::guarded_policy::require_active(s)?;
    *stage = "operation";
    let mut status = 200;
    let value = match op_id {
        "capacity.binding.read" => binding::read(s, &a, command)?,
        "capacity.offers" => catalog::offers(s, &a, command)?,
        "capacity.preview.read" => {
            let row = purchase::quote(s, wire::text(command, "quoteId")?)?;
            let snapshot = &row.payload["data"]["snapshot"];
            a.confine(&snapshot["quote"]["binding"])?;
            if !a.native {
                a.scope(
                    s,
                    &purchase::target(&snapshot["quote"]["binding"]),
                    "purchase",
                )?;
            }
            snapshot.clone()
        }
        "capacity.purchase.read" => {
            let row = purchase::read(s, wire::text(command, "purchaseId")?)?;
            let binding = &row.payload["data"]["snapshot"]["quote"]["binding"];
            a.confine(binding)?;
            if !a.native {
                a.scope(s, &purchase::target(binding), "read")?;
            }
            purchase::projection(&row, s.now_unix_secs())?
        }
        "capacity.grants.snapshot" => grants::snapshot(s, &a, command)?,
        _ => {
            *stage = "receipt";
            let receipt = store::claim_receipt(s, &a.identity(), command)?;
            *stage = "operation";
            match op_id {
                "capacity.preview" => {
                    let replay = !receipt.payload["outcome"].is_null();
                    let out = catalog::preview(s, &a, command, &receipt)?;
                    if !replay {
                        status = 201;
                    }
                    out
                }
                "capacity.purchase" => {
                    let (out, replay) = purchase::accept(s, &a, command, &receipt)?;
                    if !replay {
                        status = 201;
                    }
                    out
                }
                "capacity.billing.action" => billing::action(s, &a, command, &receipt)?,
                "capacity.cancel" => billing::cancel(s, &a, command, &receipt)?,
                _ => return Err(wire::invalid()),
            }
        }
    };
    *stage = "response";
    wire::validate(
        wire::text(&op["responseSchema"], "$ref")?.trim_start_matches("#/$defs/"),
        &value,
    )
    .map_err(|_| wire::unavailable())?;
    Ok(RouteResponse::json(status, &value).with_header("cache-control", "no-store"))
}
fn header<'a>(req: &'a RouteRequest, name: &str) -> AppResult<Option<&'a str>> {
    let mut values = req
        .headers
        .iter()
        .filter(|(k, _)| k.eq_ignore_ascii_case(name));
    let first = values.next().map(|(_, v)| v.as_str());
    if values.next().is_some() {
        return Err(wire::invalid());
    }
    Ok(first)
}
#[cfg(test)]
mod tests;
