use serde_json::{json, Value};

use crate::checkout_contract::inventory_admin::{self, AdjustmentAudit, AuditMovement};
use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;
use crate::time;

use super::super::products::inventory_request;
use super::super::support::{admin_product, path_id, read_product_raw};

pub(super) fn set<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_method(req, "PUT")?;
    ctx.require_admin_write()?;
    let id = path_id(&req.path, "/admin/products/", Some("/inventory"))?;
    let product =
        read_product_raw(seams, &id)?.ok_or_else(|| AppError::not_found("product not found"))?;
    let body = req.json_body()?;
    let quantity = body
        .get("quantity")
        .and_then(Value::as_u64)
        .ok_or_else(|| AppError::bad_request("quantity must be a non-negative integer"))?;
    let identity = inventory_request::identity(req, ctx, "manual-set")?;
    let audit = inventory_admin::set_audited(seams, &id, None, quantity, &identity)?;
    let product = crate::checkout_contract::inventory_projection::overlay(seams, &id, product)?;
    let mut response = admin_product(&id, product);
    response["adjustment"] = audit_json(&audit);
    Ok(RouteResponse::ok(&response))
}

pub(super) fn adjust<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_method(req, "POST")?;
    ctx.require_admin_write()?;
    let id = path_id(&req.path, "/admin/products/", Some("/inventory/adjust"))?;
    let product =
        read_product_raw(seams, &id)?.ok_or_else(|| AppError::not_found("product not found"))?;
    let delta = req
        .json_body()?
        .get("delta")
        .and_then(Value::as_i64)
        .ok_or_else(|| AppError::bad_request("delta is required"))?;
    let identity = inventory_request::identity(req, ctx, "manual-adjustment")?;
    let audit = inventory_admin::adjust_audited(seams, &id, None, delta, &identity)?;
    response(seams, &id, product, audit)
}

fn response<S: HostSeams>(
    seams: &S,
    id: &str,
    product: Value,
    audit: AdjustmentAudit,
) -> AppResult<RouteResponse> {
    let product = crate::checkout_contract::inventory_projection::overlay(seams, id, product)?;
    Ok(RouteResponse::ok(&json!({
        "product": admin_product(id, product),
        "adjustment": audit_json(&audit),
    })))
}

pub(crate) fn audit_json(audit: &AdjustmentAudit) -> Value {
    let delta = match audit.movement {
        AuditMovement::Adjust { delta } => Value::Number(delta.into()),
        AuditMovement::Set { .. } => Value::Null,
    };
    json!({
        "id": audit.operation_id,
        "productId": audit.product_id,
        "variantId": audit.variant_id,
        "operation": match audit.movement {
            AuditMovement::Set { .. } => "set",
            AuditMovement::Adjust { .. } => "adjust",
        },
        "delta": delta,
        "quantityBefore": audit.quantity_before,
        "quantityAfter": audit.quantity_after,
        "reason": audit.reason,
        "actor": match audit.actor {
            inventory_admin::ActorClass::SystemAdmin => "system-admin",
            inventory_admin::ActorClass::ExtensionAdmin => "extension-admin",
        },
        "createdAt": time::iso8601(audit.created_at),
    })
}

fn require_method(req: &RouteRequest, method: &str) -> AppResult<()> {
    req.method
        .eq_ignore_ascii_case(method)
        .then_some(())
        .ok_or_else(|| AppError::not_found("unknown admin route"))
}
