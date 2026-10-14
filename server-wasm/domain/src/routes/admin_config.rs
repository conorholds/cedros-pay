//! Pay-owned `/admin/config/*` routes for installed Wasm extensions.

use serde_json::{json, Map, Value};

use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::matches;
use crate::seams::HostSeams;
use crate::time;

const REDACTED_PLACEHOLDER: &str = "[REDACTED]";

#[path = "admin_config_categories.rs"]
mod categories;
#[path = "admin_config_cas.rs"]
pub(crate) mod config_cas;
#[path = "admin_config_guarded.rs"]
mod guarded_activation;
#[path = "admin_config_region.rs"]
mod regional;
#[path = "admin_config_webhook_token.rs"]
mod webhook_token;
use categories::{
    category_spec, get_category_route, update_category_route, CategorySpec, CATEGORIES,
};
pub use webhook_token::is_webhook_token;

#[rustfmt::skip]
pub const ROUTES: &[RouteSpec] = &[
    route(ids::ROUTE_ADMIN_CONFIG_LIST, "GET", "/admin/config"),
    route(ids::ROUTE_ADMIN_CONFIG_HISTORY, "GET", "/admin/config/history"),
    route(ids::ROUTE_ADMIN_CONFIG_VALIDATE, "POST", "/admin/config/validate"),
    route(ids::ROUTE_ADMIN_CONFIG_STRIPE_GET, "GET", "/admin/config/stripe"),
    route(ids::ROUTE_ADMIN_CONFIG_STRIPE_UPDATE, "PUT", "/admin/config/stripe"),
    route(ids::ROUTE_ADMIN_CONFIG_X402_GET, "GET", "/admin/config/x402"),
    route(ids::ROUTE_ADMIN_CONFIG_X402_UPDATE, "PUT", "/admin/config/x402"),
    route(ids::ROUTE_ADMIN_CONFIG_CEDROS_LOGIN_GET, "GET", "/admin/config/cedros_login"),
    route(ids::ROUTE_ADMIN_CONFIG_CEDROS_LOGIN_UPDATE, "PUT", "/admin/config/cedros_login"),
    route(ids::ROUTE_ADMIN_CONFIG_NATIVE_STORE_GET, "GET", "/admin/config/native_store"),
    route(ids::ROUTE_ADMIN_CONFIG_NATIVE_STORE_UPDATE, "PUT", "/admin/config/native_store"),
    route(ids::ROUTE_ADMIN_CONFIG_SHOP_GET, "GET", "/admin/config/shop"),
    route(ids::ROUTE_ADMIN_CONFIG_SHOP_UPDATE, "PATCH", "/admin/config/shop"),
    route(ids::ROUTE_ADMIN_CONFIG_SUBSCRIPTIONS_GET, "GET", "/admin/config/subscriptions"),
    route(
        ids::ROUTE_ADMIN_CONFIG_SUBSCRIPTIONS_UPDATE,
        "PATCH",
        "/admin/config/subscriptions",
    ),
];

const fn route(route_id: &'static str, method: &'static str, path: &'static str) -> RouteSpec {
    RouteSpec {
        route_id,
        method,
        path,
    }
}

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    let ctx = RequestContext::parse(&req.context_json);
    ctx.require_claim(ids::ROUTE_ADMIN)?;

    if req.route_id == ids::ROUTE_ADMIN_CONFIG_LIST {
        return list_categories(seams, req);
    }
    if req.route_id == ids::ROUTE_ADMIN_CONFIG_HISTORY {
        return history(seams, req);
    }
    if req.route_id == ids::ROUTE_ADMIN_CONFIG_VALIDATE {
        return validate(seams, req);
    }
    if let Some(spec) = get_category_route(req.route_id.as_str()) {
        return get_config(seams, req, spec, &ctx);
    }
    if let Some(spec) = update_category_route(req.route_id.as_str()) {
        ctx.require_admin_write()?;
        return update_config(seams, req, spec, &ctx);
    }

    Err(AppError::not_found("unknown admin config route"))
}

fn list_categories<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !matches(req, "GET", "/admin/config") {
        return Err(AppError::not_found("unknown admin config route"));
    }
    let categories: Result<Vec<_>, AppError> = CATEGORIES
        .iter()
        .map(|spec| category_meta(seams, *spec))
        .collect();
    let categories = categories?;
    Ok(RouteResponse::ok(&json!({
        "count": categories.len(),
        "categories": categories,
    })))
}

fn category_meta<S: HostSeams>(seams: &S, spec: CategorySpec) -> AppResult<Value> {
    let mut key_count = 0usize;
    for key in spec.default_keys {
        if !read_value(seams, spec, key)?.is_null() {
            key_count += 1;
        }
    }
    Ok(json!({
        "category": spec.category,
        "label": spec.label,
        "keyCount": key_count,
        "lastUpdated": null,
        "hasSecrets": !spec.secret_keys.is_empty(),
    }))
}

fn history<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !matches(req, "GET", "/admin/config/history") {
        return Err(AppError::not_found("unknown admin config route"));
    }
    let category = req.query_value("category").map(category_spec).transpose()?;
    let limit = req
        .query_value("limit")
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(50)
        .clamp(1, 100);
    let rows = crate::db::Db::new(seams, ids::CONFIG_DB_ACCESS).read(
        ids::MODEL_CONFIG_AUDIT,
        &crate::db::Query::new()
            .order("updatedAt", crate::db::Dir::Desc)
            .limit(limit),
    )?;
    let history = rows
        .into_iter()
        .filter(|row| {
            category.is_none_or(|spec| {
                row.payload["changedKeys"].as_array().is_some_and(|keys| {
                    keys.iter().any(|key| {
                        key.as_str()
                            .is_some_and(|key| key.starts_with(&format!("{}.", spec.category)))
                    })
                })
            })
        })
        .map(|row| {
            json!({
                "id": row.entry_key,
                "mutationId": row.payload["mutationId"],
                "previousRevision": row.payload["previousRevision"],
                "committedRevision": row.payload["committedRevision"],
                "changedKeys": row.payload["changedKeys"],
                "changedBy": row.payload["actorId"],
                "reason": row.payload["reason"],
                "changedAt": row.updated_at,
            })
        })
        .collect::<Vec<_>>();
    Ok(RouteResponse::ok(
        &json!({ "count": history.len(), "history": history }),
    ))
}

fn get_config<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    spec: CategorySpec,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    if !matches(req, "GET", &format!("/admin/config/{}", spec.category)) {
        return Err(AppError::not_found("unknown admin config route"));
    }
    let load = || {
        let mut config = Map::new();
        for key in spec.default_keys {
            config.insert((*key).to_string(), read_value(seams, spec, key)?);
        }
        let mut value = json!({
            "category": spec.category,
            "config": config,
            "updatedAt": null,
            "committedRevision": config_cas::current_revision(seams)?,
            "secretsRedacted": true,
        });
        if spec.category == "stripe" {
            // The ingress token is generated here, not typed by operators. The
            // endpoint URL that carries it is the one credential they copy.
            value["config"]["webhook_token"] = Value::String(REDACTED_PLACEHOLDER.to_string());
            value["webhookEndpoint"] = webhook_token::endpoint(seams)?;
        }
        Ok(value)
    };
    let value = match (ctx.site_id.as_deref(), ctx.request_id.as_deref()) {
        (Some(site), Some(request)) => crate::shared_cache::get_or_fill(
            seams,
            site,
            request,
            &format!("config:{}:redacted", spec.category),
            5,
            load,
        )?,
        _ => load()?,
    };
    Ok(RouteResponse::ok(&value))
}

fn update_config<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    spec: CategorySpec,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    let path = format!("/admin/config/{}", spec.category);
    if !(matches(req, "PUT", &path) || matches(req, "PATCH", &path)) {
        return Err(AppError::not_found("unknown admin config route"));
    }
    let body = req.json_body()?;
    let config = body
        .get("config")
        .or_else(|| body.get("updates"))
        .and_then(Value::as_object)
        .ok_or_else(|| AppError::bad_request("config or updates must be a JSON object"))?;
    guarded_activation::require_for_enable(seams, spec, config)?;
    let errors = validate_config_object(seams, spec, &Value::Object(config.clone()));
    if !errors.is_empty() {
        return Err(AppError::bad_request(errors.join("; ")));
    }
    for key in config.keys() {
        validate_key(spec, key)?;
    }
    let outcome = config_cas::commit(seams, req, ctx, spec, &body, config)?;
    if let Some(site_id) = ctx.site_id.as_deref() {
        crate::shared_cache::invalidate(
            seams,
            site_id,
            &format!("config:{}:redacted", spec.category),
        );
    }
    Ok(RouteResponse::ok(&json!({
        "category": spec.category,
        "updated": outcome.updated_keys > 0,
        "committedRevision": outcome.committed_revision,
        "updatedAt": time::iso8601(seams.now_unix_secs()),
        "message": format!("Updated {} config keys", outcome.updated_keys),
    })))
}

fn validate<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if !matches(req, "POST", "/admin/config/validate") {
        return Err(AppError::not_found("unknown admin config route"));
    }
    let body = req.json_body()?;
    let category = body.get("category").and_then(Value::as_str).unwrap_or("");
    let spec = category_spec(category)?;
    let config = body.get("config").unwrap_or(&Value::Null);
    let mut errors = validate_config_object(seams, spec, config);
    let warnings = validate_warnings(spec, config);
    let valid = errors.is_empty();
    Ok(RouteResponse::ok(&json!({
        "valid": valid,
        "errors": std::mem::take(&mut errors),
        "warnings": warnings,
    })))
}

fn validate_config_object<S: HostSeams>(
    seams: &S,
    spec: CategorySpec,
    config: &Value,
) -> Vec<String> {
    let Some(object) = config.as_object() else {
        return vec!["Config must be a JSON object".to_string()];
    };
    let mut errors = object
        .keys()
        .filter(|key| !spec.default_keys.contains(&key.as_str()))
        .map(|key| format!("Unknown config key: {key}"))
        .collect::<Vec<_>>();
    if spec.category == "stripe" {
        // Operators never author the token; a write may only clear it (null) so
        // the next read mints a fresh one, or echo the redacted placeholder.
        if let Some(token) = object.get("webhook_token").filter(|value| !value.is_null()) {
            if !token
                .as_str()
                .is_some_and(|token| token.is_empty() || token == REDACTED_PLACEHOLDER)
            {
                errors.push("Stripe webhook ingress token is generated by Cedros Pay and cannot be set by hand".into());
            }
        }
    }
    if let Some(error) = regional::validation_error(spec.category, object) {
        errors.push(error);
    }
    if let Some(error) = guarded_activation::validation_error(seams, spec, object) {
        errors.push(error);
    }
    errors
}

fn validate_warnings(spec: CategorySpec, config: &Value) -> Vec<String> {
    let mut warnings = Vec::new();
    let object = config.as_object();
    if spec.category == "stripe" && !has_present_key(object, "secret_key") {
        warnings.push("stripe.secret_key is not set".to_string());
    }
    warnings
}

fn has_present_key(object: Option<&Map<String, Value>>, key: &str) -> bool {
    object
        .and_then(|values| values.get(key))
        .is_some_and(|value| !value.is_null())
}

fn read_value<S: HostSeams>(seams: &S, spec: CategorySpec, key: &str) -> AppResult<Value> {
    if is_secret_key(spec, key) {
        return read_secret(seams, spec, key);
    }
    let Some(raw) = seams.setting_get(&storage_key(spec.category, key))? else {
        return Ok(Value::Null);
    };
    Ok(parse_stored_value(&raw))
}

fn read_secret<S: HostSeams>(seams: &S, spec: CategorySpec, key: &str) -> AppResult<Value> {
    if seams
        .secret_get(&storage_key(spec.category, key))?
        .is_none()
    {
        return Ok(Value::Null);
    }
    Ok(Value::String(REDACTED_PLACEHOLDER.to_string()))
}

fn parse_stored_value(raw: &str) -> Value {
    serde_json::from_str(raw).unwrap_or_else(|_| Value::String(raw.to_string()))
}

fn serialize_stored_value(value: &Value) -> String {
    value
        .as_str()
        .map(str::to_string)
        .unwrap_or_else(|| value.to_string())
}

fn storage_key(category: &str, key: &str) -> String {
    format!("{category}.{key}")
}

fn validate_key(spec: CategorySpec, key: &str) -> AppResult<()> {
    if spec.default_keys.contains(&key) {
        Ok(())
    } else {
        Err(AppError::bad_request(format!("unknown config key: {key}")))
    }
}

fn is_secret_key(spec: CategorySpec, key: &str) -> bool {
    spec.secret_keys.contains(&key)
}

#[cfg(test)]
#[path = "admin_config_tests.rs"]
mod admin_config_tests;

#[cfg(test)]
#[path = "admin_config_guarded_tests.rs"]
mod guarded_tests;
#[cfg(test)]
#[path = "admin_config_region_tests.rs"]
mod region_tests;

/// Narrow capacity configuration adapter; callers have an exact admin capability.
pub(crate) fn capacity_revision<S: HostSeams>(s: &S) -> AppResult<Option<String>> {
    config_cas::current_revision(s)
}
pub(crate) fn commit_capacity<S: HostSeams>(
    s: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
    body: &Value,
    value: Value,
) -> AppResult<Value> {
    let mutation = body["mutationId"]
        .as_str()
        .ok_or_else(|| AppError::bad_request("mutationId is required"))?;
    let mut request = req.clone();
    request
        .headers
        .retain(|(name, _)| !name.eq_ignore_ascii_case("idempotency-key"));
    request.headers.push((
        "Idempotency-Key".into(),
        format!("extension-config:{mutation}"),
    ));
    let values = Map::from_iter([("capacity_v1".into(), value)]);
    let result = config_cas::commit(
        s,
        &request,
        ctx,
        category_spec("subscriptions")?,
        body,
        &values,
    )?;
    if let Some(site) = ctx.site_id.as_deref() {
        crate::shared_cache::invalidate(s, site, "config:subscriptions:redacted");
    }
    Ok(json!({"committedRevision":result.committed_revision,"updated":result.updated_keys > 0}))
}
