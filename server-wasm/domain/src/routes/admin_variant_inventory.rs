use serde_json::{json, Value};

use crate::checkout_contract::inventory_admin_bulk;
use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;

use super::super::support::{path_id, read_product_raw, string_field};
use super::inventory_request;

pub(super) fn handle<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    ctx.require_admin_write()?;
    let id = path_id(&req.path, "/admin/products/", Some("/variants/inventory"))?;
    let product =
        read_product_raw(seams, &id)?.ok_or_else(|| AppError::not_found("product not found"))?;
    let body = req.json_body()?;
    let updates = body
        .get("updates")
        .and_then(Value::as_array)
        .ok_or_else(|| AppError::bad_request("updates must be an array"))?;
    let variants = product
        .get("variants")
        .and_then(Value::as_array)
        .ok_or_else(|| AppError::bad_request("product has no variants"))?;
    let requested = requested_values(updates, variants)?;
    let identity = inventory_request::identity(req, ctx, "bulk-manual-set")?;
    let audits = inventory_admin_bulk::set_variants_audited(seams, &id, &requested, &identity)?;
    let applied = requested
        .into_iter()
        .map(|(variant_id, _)| {
            let audit = audits
                .get(&variant_id)
                .ok_or_else(|| AppError::internal("bulk inventory result is incomplete"))?;
            Ok(json!({
                "variantId": variant_id,
                "quantity": audit.quantity_after,
                "operationId": audit.operation_id,
            }))
        })
        .collect::<AppResult<Vec<_>>>()?;
    Ok(RouteResponse::ok(
        &json!({ "success": true, "updates": applied }),
    ))
}

fn requested_values(updates: &[Value], variants: &[Value]) -> AppResult<Vec<(String, u64)>> {
    updates
        .iter()
        .map(|update| {
            let variant_id = string_field(update, "variantId")
                .ok_or_else(|| AppError::bad_request("variantId is required"))?;
            let quantity = update
                .get("quantity")
                .or_else(|| update.get("inventoryQuantity"))
                .and_then(Value::as_u64)
                .ok_or_else(|| AppError::bad_request("quantity must be a non-negative integer"))?;
            if !variants
                .iter()
                .any(|variant| string_field(variant, "id").as_deref() == Some(&variant_id))
            {
                return Err(AppError::not_found("product variant not found"));
            }
            Ok((variant_id, quantity))
        })
        .collect()
}
