use serde_json::{json, Value};

use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;

use super::support::*;

const SUBSCRIPTION_SETTINGS_KEY: &str = "subscriptions.settings";

pub(super) fn handle_subscriptions<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    match req.route_id.as_str() {
        ids::ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_GET => subscription_settings(seams, req),
        ids::ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_UPDATE => {
            update_subscription_settings(seams, req, ctx)
        }
        _ => Err(AppError::not_found("unknown subscription route")),
    }
}

fn subscription_settings<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_match(req, "GET", "/admin/subscriptions/settings")?;
    match seams.setting_get(SUBSCRIPTION_SETTINGS_KEY)? {
        Some(raw) => serde_json::from_str::<Value>(&raw)
            .map(|settings| RouteResponse::ok(&settings))
            .map_err(|e| {
                AppError::internal("stored subscription settings are malformed")
                    .with_internal(e.to_string())
            }),
        None => Ok(RouteResponse::ok(&default_subscription_settings())),
    }
}

fn update_subscription_settings<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_match(req, "PUT", "/admin/subscriptions/settings")?;
    ctx.require_admin_write_or_capability(&req.route_id)?;
    let mut settings = req.json_body()?;
    let settings_object = settings
        .as_object_mut()
        .ok_or_else(|| AppError::bad_request("subscription settings must be a JSON object"))?;
    settings_object
        .entry("plans")
        .or_insert_with(|| Value::Array(Vec::new()));
    seams.setting_set(SUBSCRIPTION_SETTINGS_KEY, &settings.to_string())?;
    Ok(RouteResponse::ok(&json!({
        "success": true,
        "message": "Subscription settings updated",
        "settings": settings
    })))
}
