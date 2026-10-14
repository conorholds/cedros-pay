//! Persisted admin Disputes workflow for the packaged Wasm runtime.

use serde::Deserialize;
use serde_json::{json, Value};

use crate::ctx::RequestContext;
use crate::db::{BatchOp, Db, Dir, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;
use crate::time;

use super::support_json::{limit, offset, require_match};

#[path = "admin_dashboard_dispute_model.rs"]
mod model;
use model::*;

#[derive(Deserialize)]
struct UpdateDisputeStatusRequest {
    status: String,
}

pub(crate) struct WebhookPersistence {
    pub(crate) conditions: Vec<GuardedCondition>,
    pub(crate) ops: Vec<BatchOp>,
    pub(crate) emit_effects: bool,
}

pub(super) fn handle<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    match req.route_id.as_str() {
        ids::ROUTE_ADMIN_DISPUTES_LIST => list(seams, req),
        ids::ROUTE_ADMIN_DISPUTES_GET => detail(seams, req),
        ids::ROUTE_ADMIN_DISPUTES_STATUS_UPDATE => update_status(seams, req, ctx),
        _ => Err(AppError::not_found("unknown dispute route")),
    }
}

fn list<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_match(req, "GET", "/admin/disputes")?;
    let status = req
        .query_value("status")
        .map(normalize_status)
        .transpose()?;
    let source = req
        .query_value("source")
        .map(|value| normalize_text(value, "source", MAX_REFERENCE_LEN))
        .transpose()?
        .map(|value| value.to_ascii_lowercase());
    let order_id = req
        .query_value("orderId")
        .map(|value| normalize_text(value, "orderId", MAX_REFERENCE_LEN))
        .transpose()?;
    let mut query = Query::new().filter(Filter::new("kind", Op::Eq, DISPUTE_KIND));
    if let Some(status) = status {
        query = query.filter(Filter::new("status", Op::Eq, status));
    }
    if let Some(source) = source {
        query = query.filter(Filter::new("source", Op::Eq, source));
    }
    if let Some(order_id) = order_id {
        query = query.filter(Filter::new("orderId", Op::Eq, order_id));
    }
    let db = Db::new(seams, ids::DB_ACCESS);
    let total = db.count(ids::MODEL_LEDGER, &query)?.max(0) as usize;
    let page_limit = limit(req);
    let page_offset = offset(req);
    let entries = db.read(
        ids::MODEL_LEDGER,
        &query
            .order("createdAt", Dir::Desc)
            .limit(page_limit)
            .offset(page_offset),
    )?;
    let disputes = entries
        .into_iter()
        .map(|entry| parse_stored(entry.payload, Some(&entry.entry_key)))
        .collect::<AppResult<Vec<_>>>()?
        .iter()
        .map(public_dispute)
        .collect::<Vec<_>>();
    Ok(RouteResponse::ok(&json!({
        "disputes": disputes,
        "count": disputes.len(),
        "total": total,
        "hasMore": (page_offset.saturating_add(page_limit).max(0) as usize) < total,
    })))
}

fn detail<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let id = detail_id(req, "GET", None)?;
    let record = read_dispute(&Db::new(seams, ids::DB_ACCESS), &id)?;
    Ok(RouteResponse::ok(&public_dispute(&record)))
}

fn update_status<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    let id = detail_id(req, "POST", Some("/status"))?;
    ctx.require_admin_write()?;
    let body: UpdateDisputeStatusRequest =
        serde_json::from_value(req.json_body()?).map_err(|error| {
            AppError::bad_request("invalid dispute status request").with_internal(error.to_string())
        })?;
    let next_status = normalize_status(&body.status)?;
    let db = Db::new(seams, ids::DB_ACCESS);
    let entry = db
        .read_one(ids::MODEL_LEDGER, &id)?
        .ok_or_else(|| AppError::not_found("dispute not found"))?;
    let mut record = parse_stored(entry.payload, Some(&id))?;
    if record.status == next_status {
        return Ok(RouteResponse::ok(&public_dispute(&record)));
    }
    if !valid_transition(&record.status, &next_status) {
        return Err(AppError::bad_request(format!(
            "dispute status cannot transition from {} to {next_status}",
            record.status
        )));
    }
    let expected_version = entry
        .version
        .filter(|version| !version.is_empty())
        .ok_or_else(|| AppError::internal("dispute is missing its guarded-write version"))?;
    let now = time::iso8601(seams.now_unix_secs());
    record.status = next_status;
    record.updated_at = Some(now.clone());
    record.status_updated_at = Some(now);
    let data = encode_record(&record)?;
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
        GuardedBatchOutcome::Applied { .. } => Ok(RouteResponse::ok(&public_dispute(&record))),
        GuardedBatchOutcome::Conflict { .. } => {
            Err(AppError::conflict("dispute changed while updating; retry"))
        }
    }
}

pub(crate) fn webhook_persistence<S: HostSeams>(
    db: &Db<'_, S>,
    object: &Value,
    event_created: i64,
    now: i64,
) -> AppResult<WebhookPersistence> {
    let id = object_text(object, "id")
        .ok_or_else(|| AppError::bad_request("Stripe dispute is missing id"))?;
    let id = normalize_id(id)?;
    let incoming = record_from_webhook(object, &id, event_created, now)?;
    let Some(entry) = db.read_one(ids::MODEL_LEDGER, &id)? else {
        return Ok(WebhookPersistence {
            conditions: vec![GuardedCondition::Absent {
                content_model_id: ids::MODEL_LEDGER,
                entry_key: id.clone(),
            }],
            ops: vec![BatchOp::Write {
                content_model_id: ids::MODEL_LEDGER,
                entry_key: id,
                data: encode_record(&incoming)?,
            }],
            emit_effects: true,
        });
    };
    let existing = parse_stored(entry.payload, Some(&id))?;
    if existing
        .provider_event_created
        .is_some_and(|latest| event_created < latest)
    {
        return Ok(WebhookPersistence {
            conditions: vec![],
            ops: vec![],
            emit_effects: false,
        });
    }
    if existing.status != incoming.status && !valid_transition(&existing.status, &incoming.status) {
        if existing
            .provider_event_created
            .is_some_and(|latest| event_created <= latest)
        {
            return Ok(WebhookPersistence {
                conditions: vec![],
                ops: vec![],
                emit_effects: false,
            });
        }
        return Err(AppError::conflict(format!(
            "Stripe dispute status cannot transition from {} to {}",
            existing.status, incoming.status
        )));
    }
    let expected_version = entry
        .version
        .filter(|version| !version.is_empty())
        .ok_or_else(|| AppError::internal("dispute is missing its guarded-write version"))?;
    let updated = DisputeRecord {
        created_at: existing.created_at,
        ..incoming
    };
    Ok(WebhookPersistence {
        conditions: vec![GuardedCondition::Version {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: id.clone(),
            expected_version,
        }],
        ops: vec![BatchOp::Write {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: id,
            data: encode_record(&updated)?,
        }],
        emit_effects: true,
    })
}

fn record_from_webhook(
    object: &Value,
    id: &str,
    event_created: i64,
    now: i64,
) -> AppResult<DisputeRecord> {
    let status = normalize_status(
        object_text(object, "status")
            .ok_or_else(|| AppError::bad_request("Stripe dispute is missing status"))?,
    )?;
    let amount = object
        .get("amount")
        .and_then(Value::as_i64)
        .filter(|amount| *amount > 0)
        .ok_or_else(|| AppError::bad_request("Stripe dispute amount must be positive"))?;
    let currency = normalize_currency(
        object_text(object, "currency")
            .ok_or_else(|| AppError::bad_request("Stripe dispute is missing currency"))?,
    )?;
    let metadata = metadata(object)?;
    let timestamp = time::iso8601(event_created.max(0));
    let created_at = object
        .get("created")
        .and_then(Value::as_i64)
        .map(time::iso8601)
        .unwrap_or_else(|| time::iso8601(now));
    let record = DisputeRecord {
        kind: DISPUTE_KIND.to_string(),
        id: id.to_string(),
        source: "stripe".to_string(),
        order_id: first_metadata(&metadata, &["orderReference", "reference", "ledgerRef"]),
        payment_intent_id: object_text(object, "payment_intent").map(str::to_string),
        charge_id: expanded_object_id(object.get("charge")),
        status,
        reason: object_text(object, "reason").map(str::to_string),
        amount,
        currency,
        metadata,
        created_at,
        updated_at: Some(timestamp.clone()),
        status_updated_at: Some(timestamp),
        provider_event_created: Some(event_created),
    };
    validate_record(&record, Some(id))?;
    Ok(record)
}

fn read_dispute<S: HostSeams>(db: &Db<'_, S>, id: &str) -> AppResult<DisputeRecord> {
    let entry = db
        .read_one(ids::MODEL_LEDGER, id)?
        .ok_or_else(|| AppError::not_found("dispute not found"))?;
    parse_stored(entry.payload, Some(id))
}

fn detail_id(req: &RouteRequest, method: &str, suffix: Option<&str>) -> AppResult<String> {
    if !req.method.eq_ignore_ascii_case(method) {
        return Err(AppError::not_found("unknown dispute route"));
    }
    let tail = req
        .path
        .strip_prefix("/admin/disputes/")
        .or_else(|| {
            req.path
                .split_once("/admin/disputes/")
                .map(|(_, tail)| tail)
        })
        .ok_or_else(|| AppError::not_found("dispute not found"))?;
    let id = match suffix {
        Some(suffix) => tail
            .strip_suffix(suffix)
            .ok_or_else(|| AppError::not_found("dispute not found"))?,
        None => tail,
    };
    if id.is_empty() || id.contains('/') {
        return Err(AppError::not_found("dispute not found"));
    }
    normalize_id(id).map_err(|_| AppError::not_found("dispute not found"))
}

#[cfg(test)]
#[path = "admin_dashboard_disputes_tests.rs"]
mod tests;
