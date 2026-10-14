//! Persisted admin Returns workflow for the packaged Wasm runtime.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::ctx::RequestContext;
use crate::db::{BatchOp, Db};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;
use crate::time;

use super::support_json::{limit, offset, require_match};
use super::support_ledger::{ledger_page, page_has_more};

const RETURN_KIND: &str = "return";
const MAX_ID_LEN: usize = 120;
const MAX_ORDER_ID_LEN: usize = 240;
const MAX_ITEMS: usize = 100;
const MAX_PRODUCT_ID_LEN: usize = 240;
const MAX_REASON_LEN: usize = 2_000;
const MAX_METADATA_ENTRIES: usize = 50;
const MAX_METADATA_KEY_LEN: usize = 120;
const MAX_METADATA_VALUE_LEN: usize = 1_000;

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReturnItem {
    product_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    variant_id: Option<String>,
    quantity: i64,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReturnRecord {
    kind: String,
    id: String,
    #[serde(default)]
    tenant_id: String,
    order_id: String,
    status: String,
    items: Vec<ReturnItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<String>,
    #[serde(default)]
    metadata: BTreeMap<String, String>,
    created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    updated_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    status_updated_at: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateReturnRequest {
    id: Option<String>,
    order_id: String,
    #[serde(default)]
    items: Vec<ReturnItem>,
    reason: Option<String>,
    #[serde(default)]
    metadata: BTreeMap<String, String>,
}

#[derive(Deserialize)]
struct UpdateReturnStatusRequest {
    status: String,
}

pub(super) fn handle<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    match req.route_id.as_str() {
        ids::ROUTE_ADMIN_RETURNS_LIST => list(seams, req),
        ids::ROUTE_ADMIN_RETURNS_CREATE => create(seams, req, ctx),
        ids::ROUTE_ADMIN_RETURNS_GET => detail(seams, req),
        ids::ROUTE_ADMIN_RETURNS_STATUS_UPDATE => update_status(seams, req, ctx),
        _ => Err(AppError::not_found("unknown return route")),
    }
}

fn list<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_match(req, "GET", "/admin/returns")?;
    let status_filter = req
        .query_value("status")
        .map(normalize_status)
        .transpose()?;
    let order_filter = req.query_value("orderId").map(str::trim);
    let limit = limit(req);
    let offset = offset(req);
    let page = ledger_page(seams, "admin returns", offset, limit, |value| {
        if value.get("kind").and_then(Value::as_str) != Some(RETURN_KIND) {
            return Ok(None);
        }
        let record = parse_stored(value)?;
        Ok((status_filter
            .as_deref()
            .map(|status| record.status == status)
            .unwrap_or(true)
            && order_filter.map(|id| record.order_id == id).unwrap_or(true))
        .then_some(record))
    })?;
    let total = page.total;
    let returns = page.entries.iter().map(public_return).collect::<Vec<_>>();

    Ok(RouteResponse::ok(&json!({
        "returns": returns,
        "count": returns.len(),
        "total": total,
        "hasMore": page_has_more(total, offset, limit, page.truncated),
        "truncated": page.truncated,
    })))
}

fn create<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_match(req, "POST", "/admin/returns")?;
    ctx.require_admin_write()?;
    let body: CreateReturnRequest = serde_json::from_value(req.json_body()?).map_err(|error| {
        AppError::bad_request("invalid return request").with_internal(error.to_string())
    })?;
    let id = body_id_or_generated(seams, ctx, body.id, &req.body)?;
    require_text(&body.order_id, "orderId", MAX_ORDER_ID_LEN)?;
    validate_items(&body.items)?;
    let reason = normalize_optional_text(body.reason, "reason", MAX_REASON_LEN)?;
    validate_metadata(&body.metadata)?;

    let db = Db::new(seams, ids::DB_ACCESS);
    let order = db
        .read_one(ids::MODEL_LEDGER, body.order_id.trim())?
        .ok_or_else(|| AppError::not_found("order not found"))?;
    if order.payload.get("kind").and_then(Value::as_str) != Some("payment") {
        return Err(AppError::not_found("order not found"));
    }

    let now = time::iso8601(seams.now_unix_secs());
    let record = ReturnRecord {
        kind: RETURN_KIND.to_string(),
        id: id.clone(),
        tenant_id: ctx
            .site_id
            .as_deref()
            .map(str::trim)
            .unwrap_or_default()
            .to_string(),
        order_id: body.order_id.trim().to_string(),
        status: "requested".to_string(),
        items: body.items,
        reason,
        metadata: body.metadata,
        created_at: now.clone(),
        updated_at: Some(now.clone()),
        status_updated_at: Some(now),
    };
    validate_record(&record, Some(&id))?;
    let data = serde_json::to_value(&record).map_err(|error| {
        AppError::internal("cannot encode return request").with_internal(error.to_string())
    })?;
    let outcome = db.guarded_batch(
        &[GuardedCondition::Absent {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: id.clone(),
        }],
        &[BatchOp::Write {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: id,
            data,
        }],
    )?;
    match outcome {
        GuardedBatchOutcome::Applied { .. } => Ok(RouteResponse::ok(&public_return(&record))),
        GuardedBatchOutcome::Conflict { .. } => {
            Err(AppError::conflict("return request already exists"))
        }
    }
}

fn detail<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let id = detail_id(req, "GET", None)?;
    let record = read_return(&Db::new(seams, ids::DB_ACCESS), &id)?;
    Ok(RouteResponse::ok(&public_return(&record)))
}

fn update_status<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    let id = detail_id(req, "POST", Some("/status"))?;
    ctx.require_admin_write()?;
    let body: UpdateReturnStatusRequest =
        serde_json::from_value(req.json_body()?).map_err(|error| {
            AppError::bad_request("invalid return status request").with_internal(error.to_string())
        })?;
    let next_status = normalize_status(&body.status)?;
    let db = Db::new(seams, ids::DB_ACCESS);
    let entry = db
        .read_one(ids::MODEL_LEDGER, &id)?
        .ok_or_else(|| AppError::not_found("return request not found"))?;
    if entry.payload.get("kind").and_then(Value::as_str) != Some(RETURN_KIND) {
        return Err(AppError::not_found("return request not found"));
    }
    let mut record = parse_stored(entry.payload)?;
    validate_record(&record, Some(&id))?;
    if record.status == next_status {
        return Ok(RouteResponse::ok(&public_return(&record)));
    }
    if !valid_transition(&record.status, &next_status) {
        return Err(AppError::bad_request(format!(
            "return status cannot transition from {} to {next_status}",
            record.status
        )));
    }

    let expected_version = entry
        .version
        .filter(|version| !version.is_empty())
        .ok_or_else(|| AppError::internal("return request is missing its guarded-write version"))?;
    let now = time::iso8601(seams.now_unix_secs());
    record.status = next_status;
    record.updated_at = Some(now.clone());
    record.status_updated_at = Some(now);
    let data = serde_json::to_value(&record).map_err(|error| {
        AppError::internal("cannot encode return request").with_internal(error.to_string())
    })?;
    let outcome = db.guarded_batch(
        &[GuardedCondition::Version {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: id.clone(),
            expected_version,
        }],
        &[BatchOp::Write {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: id,
            data,
        }],
    )?;
    match outcome {
        GuardedBatchOutcome::Applied { .. } => Ok(RouteResponse::ok(&public_return(&record))),
        GuardedBatchOutcome::Conflict { .. } => Err(AppError::conflict(
            "return request changed while updating; retry",
        )),
    }
}

fn read_return<S: HostSeams>(db: &Db<'_, S>, id: &str) -> AppResult<ReturnRecord> {
    let entry = db
        .read_one(ids::MODEL_LEDGER, id)?
        .ok_or_else(|| AppError::not_found("return request not found"))?;
    if entry.payload.get("kind").and_then(Value::as_str) != Some(RETURN_KIND) {
        return Err(AppError::not_found("return request not found"));
    }
    let record = parse_stored(entry.payload)?;
    validate_record(&record, Some(id))?;
    Ok(record)
}

fn parse_stored(value: Value) -> AppResult<ReturnRecord> {
    serde_json::from_value(value).map_err(|error| {
        AppError::internal("stored return request is malformed").with_internal(error.to_string())
    })
}

fn validate_record(record: &ReturnRecord, expected_id: Option<&str>) -> AppResult<()> {
    let invalid = |detail: String| {
        AppError::internal("stored return request is malformed").with_internal(detail)
    };
    if record.kind != RETURN_KIND {
        return Err(invalid("kind must be return".to_string()));
    }
    normalize_id(&record.id).map_err(|error| invalid(error.message))?;
    if expected_id.is_some_and(|id| record.id != id) {
        return Err(invalid(
            "record id does not match its ledger key".to_string(),
        ));
    }
    require_text(&record.order_id, "orderId", MAX_ORDER_ID_LEN)
        .map_err(|error| invalid(error.message))?;
    if normalize_status(&record.status).map_err(|error| invalid(error.message))? != record.status {
        return Err(invalid("status is not canonical".to_string()));
    }
    if record.tenant_id.len() > 240 || record.tenant_id.chars().any(char::is_control) {
        return Err(invalid("tenantId is invalid".to_string()));
    }
    validate_items(&record.items).map_err(|error| invalid(error.message))?;
    validate_metadata(&record.metadata).map_err(|error| invalid(error.message))?;
    if record
        .reason
        .as_deref()
        .is_some_and(|reason| reason.len() > MAX_REASON_LEN || reason.chars().any(char::is_control))
    {
        return Err(invalid("reason is invalid".to_string()));
    }
    for (field, timestamp) in [
        ("createdAt", Some(record.created_at.as_str())),
        ("updatedAt", record.updated_at.as_deref()),
        ("statusUpdatedAt", record.status_updated_at.as_deref()),
    ] {
        if timestamp.is_some_and(|value| time::parse_iso(value).is_none()) {
            return Err(invalid(format!("{field} is invalid")));
        }
    }
    Ok(())
}

fn validate_items(items: &[ReturnItem]) -> AppResult<()> {
    if items.is_empty() || items.len() > MAX_ITEMS {
        return Err(AppError::bad_request(format!(
            "items must contain 1-{MAX_ITEMS} entries"
        )));
    }
    for item in items {
        require_text(&item.product_id, "item productId", MAX_PRODUCT_ID_LEN)?;
        if let Some(variant_id) = item.variant_id.as_deref() {
            require_text(variant_id, "item variantId", MAX_PRODUCT_ID_LEN)?;
        }
        if !(1..=i64::from(i32::MAX)).contains(&item.quantity) {
            return Err(AppError::bad_request("item quantity is invalid"));
        }
    }
    Ok(())
}

fn validate_metadata(metadata: &BTreeMap<String, String>) -> AppResult<()> {
    if metadata.len() > MAX_METADATA_ENTRIES {
        return Err(AppError::bad_request(format!(
            "metadata may contain at most {MAX_METADATA_ENTRIES} entries"
        )));
    }
    for (key, value) in metadata {
        require_text(key, "metadata key", MAX_METADATA_KEY_LEN)?;
        if value.len() > MAX_METADATA_VALUE_LEN || value.chars().any(char::is_control) {
            return Err(AppError::bad_request("metadata value is invalid"));
        }
    }
    Ok(())
}

fn require_text(value: &str, field: &str, max_len: usize) -> AppResult<()> {
    let value = value.trim();
    if value.is_empty() || value.len() > max_len || value.chars().any(char::is_control) {
        return Err(AppError::bad_request(format!("{field} is invalid")));
    }
    Ok(())
}

fn normalize_optional_text(
    value: Option<String>,
    field: &str,
    max_len: usize,
) -> AppResult<Option<String>> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    require_text(value, field, max_len)?;
    Ok(Some(value.to_string()))
}

fn normalize_status(value: &str) -> AppResult<String> {
    let status = value.trim().to_ascii_lowercase();
    if matches!(
        status.as_str(),
        "requested" | "approved" | "rejected" | "received" | "refunded"
    ) {
        Ok(status)
    } else {
        Err(AppError::bad_request("invalid return status"))
    }
}

fn valid_transition(from: &str, to: &str) -> bool {
    matches!(
        (from, to),
        ("requested", "approved" | "rejected")
            | ("approved", "received")
            | ("received", "refunded")
    )
}

fn public_return(record: &ReturnRecord) -> Value {
    let mut value = serde_json::to_value(record).unwrap_or(Value::Null);
    if let Value::Object(object) = &mut value {
        object.remove("kind");
    }
    value
}

fn detail_id(req: &RouteRequest, method: &str, suffix: Option<&str>) -> AppResult<String> {
    if req.method != method {
        return Err(AppError::not_found("unknown return route"));
    }
    let tail = req
        .path
        .strip_prefix("/admin/returns/")
        .ok_or_else(|| AppError::not_found("return request not found"))?;
    let id = match suffix {
        Some(suffix) => tail
            .strip_suffix(suffix)
            .ok_or_else(|| AppError::not_found("return request not found"))?,
        None => tail,
    };
    if id.is_empty() || id.contains('/') {
        return Err(AppError::not_found("return request not found"));
    }
    normalize_id(id).map_err(|_| AppError::not_found("return request not found"))
}

fn body_id_or_generated<S: HostSeams>(
    seams: &S,
    ctx: &RequestContext,
    id: Option<String>,
    body: &str,
) -> AppResult<String> {
    if let Some(id) = id {
        return normalize_id(&id);
    }
    let seed = ctx
        .idempotency_key
        .as_deref()
        .or(ctx.request_id.as_deref())
        .map(sanitize_id)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| {
            let digest = Sha256::digest(format!(
                "{}:{}:{body}",
                req_seed(ctx),
                seams.now_unix_secs()
            ));
            hex::encode(&digest[..12])
        });
    Ok(format!("return-{seed}"))
}

fn req_seed(ctx: &RequestContext) -> &str {
    ctx.actor_id.as_deref().unwrap_or("admin")
}

fn sanitize_id(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.'))
        .take(80)
        .collect()
}

fn normalize_id(value: &str) -> AppResult<String> {
    let id = value.trim();
    if id.is_empty()
        || id.len() > MAX_ID_LEN
        || !id
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.'))
    {
        return Err(AppError::bad_request(
            "id may only contain 1-120 letters, numbers, dashes, underscores, or dots",
        ));
    }
    Ok(id.to_string())
}

#[cfg(test)]
#[path = "admin_dashboard_returns_tests.rs"]
mod tests;
