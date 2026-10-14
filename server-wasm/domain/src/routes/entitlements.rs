//! `POST /entitlements/v1/check` — Data gated-media entitlement read.
//!
//! Data streams protected media after Cedros Login auth, then asks this route
//! whether Pay has a current entitlement for the login user. The route returns
//! only booleans and request identifiers; it never exposes payment, wallet,
//! provider, or buyer profile details.

use std::collections::BTreeMap;

use serde::Deserialize;
use serde_json::{json, Map, Value};

use crate::ctx::RequestContext;
use crate::db::{Db, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::matches;
use crate::seams::HostSeams;
use crate::time;

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ids::ROUTE_ENTITLEMENTS,
    method: "POST",
    path: "/entitlements/v1/check",
}];

const MAX_CHECKS: usize = 50;
const MAX_ID_LEN: usize = 256;
const IDENTITY_FIELDS: &[&str] = &[
    "customerProfileId",
    "customerRef",
    "customerId",
    "cedrosLoginUserId",
    "userId",
    "loginUserId",
    "profileId",
    "subjectId",
];
const PRODUCT_FIELDS: &[&str] = &[
    "productId",
    "product_id",
    "productIds",
    "priceId",
    "price_id",
    "subscriptionProductId",
    "sku",
];
const ENTITLEMENT_FIELDS: &[&str] = &[
    "entitlementId",
    "entitlement_id",
    "reference",
    "providerRef",
    "provider_ref",
    "subscriptionId",
    "subscription_id",
    "ledgerEntryId",
    "checkoutSessionId",
];

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CheckRequest {
    user_id: String,
    checks: Vec<EntitlementCheck>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct EntitlementCheck {
    scope: String,
    scope_id: String,
    #[serde(default)]
    product_id: Option<String>,
    #[serde(default)]
    entitlement_id: Option<String>,
}

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !matches(req, "POST", "/entitlements/v1/check") {
        return Err(AppError::not_found("unknown entitlements route"));
    }
    let ctx = RequestContext::parse(&req.context_json);
    if !ctx.has_claim(ids::CAPABILITY_ENTITLEMENT_READ) {
        return Err(AppError::forbidden(format!(
            "missing permission claim: {}",
            ids::CAPABILITY_ENTITLEMENT_READ
        )));
    }

    let body: CheckRequest = serde_json::from_value(req.json_body()?).map_err(|error| {
        AppError::unprocessable("invalid request body").with_internal(error.to_string())
    })?;
    validate_request(&body)?;

    let db = Db::new(seams, ids::DB_ACCESS);
    let records = EntitlementRecords::load(&db, &body.user_id)?;
    let results: Vec<Value> = body
        .checks
        .iter()
        .map(|check| {
            let granted = records.grants(check, seams.now_unix_secs());
            json!({
                "scope": check.scope,
                "scopeId": check.scope_id,
                "productId": check.product_id,
                "entitlementId": check.entitlement_id,
                "granted": granted,
            })
        })
        .collect();

    Ok(RouteResponse::ok(&json!({ "results": results })))
}

struct EntitlementRecords {
    ledger: Vec<Value>,
    subscriptions: Vec<Value>,
}

impl EntitlementRecords {
    fn load<S: crate::seams::HostSeams>(db: &Db<'_, S>, user_id: &str) -> AppResult<Self> {
        Ok(Self {
            ledger: read_identity_records(db, ids::MODEL_LEDGER, user_id)?,
            subscriptions: read_identity_records(db, ids::MODEL_SUBSCRIPTIONS, user_id)?,
        })
    }

    fn grants(&self, check: &EntitlementCheck, now_secs: i64) -> bool {
        self.ledger
            .iter()
            .any(|record| payment_grants(record) && record_matches_check(record, check))
            || self.subscriptions.iter().any(|record| {
                subscription_grants(record, now_secs) && record_matches_check(record, check)
            })
    }
}

fn read_identity_records<S: crate::seams::HostSeams>(
    db: &Db<'_, S>,
    model: &str,
    user_id: &str,
) -> AppResult<Vec<Value>> {
    let mut by_key = BTreeMap::new();
    for field in IDENTITY_FIELDS {
        let query = Query::new()
            .filter(Filter::new(*field, Op::Eq, user_id))
            .limit(100);
        for entry in db.read(model, &query)? {
            by_key.insert(entry.entry_key, entry.payload);
        }
    }
    Ok(by_key.into_values().collect())
}

fn validate_request(body: &CheckRequest) -> AppResult<()> {
    require_id("userId", &body.user_id)?;
    if body.checks.is_empty() {
        return Err(AppError::unprocessable("checks must not be empty"));
    }
    if body.checks.len() > MAX_CHECKS {
        return Err(AppError::too_many(format!(
            "checks must contain at most {MAX_CHECKS} items"
        )));
    }
    for check in &body.checks {
        if check.scope != "media_asset" {
            return Err(AppError::unprocessable("scope must be media_asset"));
        }
        require_id("scopeId", &check.scope_id)?;
        if let Some(product_id) = &check.product_id {
            require_id("productId", product_id)?;
        }
        if let Some(entitlement_id) = &check.entitlement_id {
            require_id("entitlementId", entitlement_id)?;
        }
    }
    Ok(())
}

fn require_id(label: &str, value: &str) -> AppResult<()> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.len() > MAX_ID_LEN {
        Err(AppError::unprocessable(format!(
            "{label} must be 1..={MAX_ID_LEN} characters"
        )))
    } else {
        Ok(())
    }
}

fn payment_grants(record: &Value) -> bool {
    string_field(record, "kind") == Some("payment")
        && string_field(record, "status") == Some("succeeded")
        && net_cents(record) > 0
        && string_field(record, "routePath") != Some("subscription")
        && string_field(record, "provider") != Some("solana_subscription")
        // Native subscription purchases also have an auditable payment ledger row,
        // but access must follow the time-bounded subscription projection. Treating
        // that row as a one-time purchase would grant permanent access after expiry.
        && record
            .pointer("/nativeStoreClaim/result/subscriptionId")
            .is_none()
}

fn subscription_grants(record: &Value, now_secs: i64) -> bool {
    matches!(string_field(record, "status"), Some("active" | "trialing"))
        && string_field(record, "currentPeriodEnd")
            .and_then(time::parse_iso)
            .map(|end| end > now_secs)
            .unwrap_or(false)
}

fn net_cents(record: &Value) -> i64 {
    let gross = i64_field(record, "grossCents").unwrap_or(0);
    let refunded = i64_field(record, "refundCents").unwrap_or(0);
    if gross < 0 || refunded < 0 || refunded > gross {
        return 0;
    }
    gross.checked_sub(refunded).unwrap_or(0)
}

fn record_matches_check(record: &Value, check: &EntitlementCheck) -> bool {
    check
        .product_id
        .as_deref()
        .map(|id| any_known_field_matches(record, PRODUCT_FIELDS, id))
        .unwrap_or(false)
        || check
            .entitlement_id
            .as_deref()
            .map(|id| any_known_field_matches(record, ENTITLEMENT_FIELDS, id))
            .unwrap_or(false)
        || scope_matches(record, check)
}

fn scope_matches(record: &Value, check: &EntitlementCheck) -> bool {
    any_known_field_matches(record, &["scope"], &check.scope)
        && any_known_field_matches(record, &["scopeId", "scope_id", "assetId"], &check.scope_id)
}

fn any_known_field_matches(record: &Value, fields: &[&str], target: &str) -> bool {
    let target = target.trim();
    if target.is_empty() {
        return false;
    }
    candidate_objects(record).iter().any(|object| {
        fields
            .iter()
            .any(|field| value_matches(object.get(*field), target))
    })
}

fn candidate_objects(record: &Value) -> Vec<&serde_json::Map<String, Value>> {
    let mut objects = Vec::new();
    if let Some(object) = record.as_object() {
        objects.push(object);
        for key in ["metadata", "attributes", "entitlement", "access"] {
            if let Some(nested) = object.get(key).and_then(Value::as_object) {
                objects.push(nested);
            }
        }
    }
    objects
}

fn value_matches(value: Option<&Value>, target: &str) -> bool {
    match value {
        Some(Value::String(value)) => value.trim() == target,
        Some(Value::Array(values)) => values
            .iter()
            .any(|value| value_matches(Some(value), target)),
        Some(Value::Object(object)) => {
            PRODUCT_FIELDS
                .iter()
                .chain(ENTITLEMENT_FIELDS)
                .any(|field| value_matches(object.get(*field), target))
                || value_matches(object.get("id"), target)
        }
        _ => false,
    }
}

fn string_field<'a>(record: &'a Value, field: &str) -> Option<&'a str> {
    record
        .get(field)
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
}

fn i64_field(record: &Value, field: &str) -> Option<i64> {
    record.get(field).and_then(Value::as_i64)
}

pub(crate) fn changed_action(
    reason: &str,
    user_id: Option<&str>,
    product_id: Option<&str>,
    entitlement_id: Option<&str>,
    source_ref: Option<&str>,
    occurred_at: i64,
) -> crate::durable_effects::Action {
    let mut payload = Map::new();
    payload.insert("reason".into(), Value::String(reason.to_string()));
    insert_opt(&mut payload, "userId", user_id);
    insert_opt(&mut payload, "productId", product_id);
    insert_opt(&mut payload, "entitlementId", entitlement_id);
    insert_opt(&mut payload, "sourceRef", source_ref);
    payload.insert(
        "occurredAt".into(),
        Value::String(time::iso8601(occurred_at)),
    );
    crate::durable_effects::event(
        ids::EVENT_ENTITLEMENT_CHANGED,
        "Entitlement changed",
        Value::Object(payload),
    )
}

fn insert_opt(payload: &mut Map<String, Value>, key: &str, value: Option<&str>) {
    if let Some(value) = value.filter(|value| !value.trim().is_empty()) {
        payload.insert(key.to_string(), Value::String(value.to_string()));
    }
}

#[cfg(test)]
#[path = "entitlements_tests.rs"]
mod entitlements_tests;
