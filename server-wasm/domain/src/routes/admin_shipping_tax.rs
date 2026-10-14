//! Pay-owned extension admin routes for shipping profiles/rates and tax rates.

mod ai;
mod support;

use serde_json::json;

use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::matches;
use crate::seams::HostSeams;

use support::*;

pub const ROUTES: &[RouteSpec] = &[
    RouteSpec {
        route_id: ai::QUERY,
        method: "POST",
        path: "/admin/assistant/shipping/query",
    },
    RouteSpec {
        route_id: ai::PROFILE_SAVE,
        method: "POST",
        path: "/admin/assistant/shipping/profile",
    },
    RouteSpec {
        route_id: ai::RATE_SAVE,
        method: "POST",
        path: "/admin/assistant/shipping/rate",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_SHIPPING_PROFILES_LIST,
        method: "GET",
        path: "/admin/shipping/profiles",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_SHIPPING_PROFILES_CREATE,
        method: "POST",
        path: "/admin/shipping/profiles",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_SHIPPING_PROFILES_GET,
        method: "GET",
        path: "/admin/shipping/profiles/{id}",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_SHIPPING_PROFILES_UPDATE,
        method: "PUT",
        path: "/admin/shipping/profiles/{id}",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_SHIPPING_PROFILES_DELETE,
        method: "DELETE",
        path: "/admin/shipping/profiles/{id}",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_SHIPPING_RATES_LIST,
        method: "GET",
        path: "/admin/shipping/profiles/{profileId}/rates",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_SHIPPING_RATES_CREATE,
        method: "POST",
        path: "/admin/shipping/profiles/{profileId}/rates",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_SHIPPING_RATES_UPDATE,
        method: "PUT",
        path: "/admin/shipping/rates/{id}",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_SHIPPING_RATES_DELETE,
        method: "DELETE",
        path: "/admin/shipping/rates/{id}",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_TAX_RATES_LIST,
        method: "GET",
        path: "/admin/taxes",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_TAX_RATES_CREATE,
        method: "POST",
        path: "/admin/taxes",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_TAX_RATES_GET,
        method: "GET",
        path: "/admin/taxes/{id}",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_TAX_RATES_UPDATE,
        method: "PUT",
        path: "/admin/taxes/{id}",
    },
    RouteSpec {
        route_id: ids::ROUTE_ADMIN_TAX_RATES_DELETE,
        method: "DELETE",
        path: "/admin/taxes/{id}",
    },
];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if ai::is_route(&req.route_id) {
        return ai::handle(seams, req);
    }
    let ctx = RequestContext::parse(&req.context_json);
    ctx.require_claim(ids::ROUTE_ADMIN)?;
    match req.route_id.as_str() {
        ids::ROUTE_ADMIN_SHIPPING_PROFILES_LIST => list_profiles(seams, req),
        ids::ROUTE_ADMIN_SHIPPING_PROFILES_CREATE => {
            ctx.require_admin_write()?;
            create_profile(seams, req, &ctx)
        }
        ids::ROUTE_ADMIN_SHIPPING_PROFILES_GET => get_profile(seams, req),
        ids::ROUTE_ADMIN_SHIPPING_PROFILES_UPDATE => {
            ctx.require_admin_write()?;
            update_profile(seams, req)
        }
        ids::ROUTE_ADMIN_SHIPPING_PROFILES_DELETE => {
            ctx.require_admin_write()?;
            delete_profile(seams, req)
        }
        ids::ROUTE_ADMIN_SHIPPING_RATES_LIST => list_rates(seams, req),
        ids::ROUTE_ADMIN_SHIPPING_RATES_CREATE => {
            ctx.require_admin_write()?;
            create_rate(seams, req, &ctx)
        }
        ids::ROUTE_ADMIN_SHIPPING_RATES_UPDATE => {
            ctx.require_admin_write()?;
            update_rate(seams, req)
        }
        ids::ROUTE_ADMIN_SHIPPING_RATES_DELETE => {
            ctx.require_admin_write()?;
            delete_rate(seams, req)
        }
        ids::ROUTE_ADMIN_TAX_RATES_LIST => list_taxes(seams, req),
        ids::ROUTE_ADMIN_TAX_RATES_CREATE => {
            ctx.require_admin_write()?;
            create_tax(seams, req, &ctx)
        }
        ids::ROUTE_ADMIN_TAX_RATES_GET => get_tax(seams, req),
        ids::ROUTE_ADMIN_TAX_RATES_UPDATE => {
            ctx.require_admin_write()?;
            update_tax(seams, req)
        }
        ids::ROUTE_ADMIN_TAX_RATES_DELETE => {
            ctx.require_admin_write()?;
            delete_tax(seams, req)
        }
        _ => Err(AppError::not_found("unknown shipping/tax route")),
    }
}

fn list_profiles<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_exact(req, "GET", "/admin/shipping/profiles")?;
    let profiles = read_kind::<S, ShippingProfile>(seams, PROFILE_KIND, req)?
        .iter()
        .map(public_value)
        .collect::<Vec<_>>();
    Ok(RouteResponse::ok(&json!({ "profiles": profiles })))
}

fn create_profile<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_exact(req, "POST", "/admin/shipping/profiles")?;
    let body: ProfileReq = parse_body(req)?;
    let id = body_id_or_generated(seams, ctx, body.id.clone(), "shipping-profile")?;
    ensure_absent(seams, &profile_key(&id), "shipping profile")?;
    let now = now(seams);
    let profile = profile_from_req(id, body, now.clone(), now)?;
    write_record(seams, &profile_key(&profile.id), &profile)?;
    Ok(RouteResponse::ok(&public_value(&profile)))
}

fn get_profile<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_method(req, "GET")?;
    let id = path_id(&req.path, "/admin/shipping/profiles/")?;
    let profile: ShippingProfile = read_one(seams, &profile_key(&id), "shipping profile")?;
    Ok(RouteResponse::ok(&public_value(&profile)))
}

fn update_profile<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_method(req, "PUT")?;
    let id = path_id(&req.path, "/admin/shipping/profiles/")?;
    let existing: ShippingProfile = read_one(seams, &profile_key(&id), "shipping profile")?;
    let body: ProfileReq = parse_body(req)?;
    let profile = profile_from_req(id, body, existing.created_at, now(seams))?;
    write_record(seams, &profile_key(&profile.id), &profile)?;
    Ok(RouteResponse::ok(&public_value(&profile)))
}

fn delete_profile<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_method(req, "DELETE")?;
    let id = path_id(&req.path, "/admin/shipping/profiles/")?;
    read_one::<S, ShippingProfile>(seams, &profile_key(&id), "shipping profile")?;
    for rate in rates_for_profile(seams, &id)? {
        delete_record(seams, &rate_key(&rate.id))?;
    }
    delete_record(seams, &profile_key(&id))?;
    Ok(RouteResponse::ok(&json!({ "deleted": true })))
}

fn list_rates<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_method(req, "GET")?;
    let profile_id = nested_path_id(&req.path, "/admin/shipping/profiles/", "/rates")?;
    let rates = rates_for_profile(seams, &profile_id)?
        .iter()
        .map(public_value)
        .collect::<Vec<_>>();
    Ok(RouteResponse::ok(&json!({ "rates": rates })))
}

fn create_rate<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_method(req, "POST")?;
    let profile_id = nested_path_id(&req.path, "/admin/shipping/profiles/", "/rates")?;
    read_one::<S, ShippingProfile>(seams, &profile_key(&profile_id), "shipping profile")?;
    let body: RateReq = parse_body(req)?;
    let id = body_id_or_generated(seams, ctx, body.id.clone(), "shipping-rate")?;
    ensure_absent(seams, &rate_key(&id), "shipping rate")?;
    let now = now(seams);
    let rate = rate_from_req(id, profile_id, body, now.clone(), now)?;
    write_record(seams, &rate_key(&rate.id), &rate)?;
    Ok(RouteResponse::ok(&public_value(&rate)))
}

fn update_rate<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_method(req, "PUT")?;
    let id = path_id(&req.path, "/admin/shipping/rates/")?;
    let existing: ShippingRate = read_one(seams, &rate_key(&id), "shipping rate")?;
    let body: UpdateRateReq = parse_body(req)?;
    let profile_id = normalize_id(&body.profile_id)?;
    if profile_id != existing.profile_id {
        return Err(AppError::bad_request(
            "profileId must match the existing shipping rate",
        ));
    }
    read_one::<S, ShippingProfile>(seams, &profile_key(&profile_id), "shipping profile")?;
    let rate = rate_from_req(id, profile_id, body.rate, existing.created_at, now(seams))?;
    write_record(seams, &rate_key(&rate.id), &rate)?;
    Ok(RouteResponse::ok(&public_value(&rate)))
}

fn delete_rate<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_method(req, "DELETE")?;
    let id = path_id(&req.path, "/admin/shipping/rates/")?;
    read_one::<S, ShippingRate>(seams, &rate_key(&id), "shipping rate")?;
    delete_record(seams, &rate_key(&id))?;
    Ok(RouteResponse::ok(&json!({ "deleted": true })))
}

fn list_taxes<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_exact(req, "GET", "/admin/taxes")?;
    let tax_rates = read_kind::<S, TaxRate>(seams, TAX_KIND, req)?
        .iter()
        .map(public_value)
        .collect::<Vec<_>>();
    Ok(RouteResponse::ok(&json!({ "taxRates": tax_rates })))
}

fn create_tax<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_exact(req, "POST", "/admin/taxes")?;
    let body: TaxReq = parse_body(req)?;
    let id = body_id_or_generated(seams, ctx, body.id.clone(), "tax-rate")?;
    ensure_absent(seams, &tax_key(&id), "tax rate")?;
    let now = now(seams);
    let tax = tax_from_req(id, body, now.clone(), now)?;
    write_record(seams, &tax_key(&tax.id), &tax)?;
    Ok(RouteResponse::ok(&public_value(&tax)))
}

fn get_tax<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_method(req, "GET")?;
    let id = path_id(&req.path, "/admin/taxes/")?;
    let tax: TaxRate = read_one(seams, &tax_key(&id), "tax rate")?;
    Ok(RouteResponse::ok(&public_value(&tax)))
}

fn update_tax<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_method(req, "PUT")?;
    let id = path_id(&req.path, "/admin/taxes/")?;
    let existing: TaxRate = read_one(seams, &tax_key(&id), "tax rate")?;
    let body: TaxReq = parse_body(req)?;
    let tax = tax_from_req(id, body, existing.created_at, now(seams))?;
    write_record(seams, &tax_key(&tax.id), &tax)?;
    Ok(RouteResponse::ok(&public_value(&tax)))
}

fn delete_tax<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_method(req, "DELETE")?;
    let id = path_id(&req.path, "/admin/taxes/")?;
    read_one::<S, TaxRate>(seams, &tax_key(&id), "tax rate")?;
    delete_record(seams, &tax_key(&id))?;
    Ok(RouteResponse::ok(&json!({ "deleted": true })))
}

fn require_exact(req: &RouteRequest, method: &str, path: &str) -> AppResult<()> {
    if matches(req, method, path) {
        Ok(())
    } else {
        Err(AppError::not_found("unknown shipping/tax route"))
    }
}

fn require_method(req: &RouteRequest, method: &str) -> AppResult<()> {
    if req.method.eq_ignore_ascii_case(method) {
        Ok(())
    } else {
        Err(AppError::not_found("unknown shipping/tax route"))
    }
}

#[cfg(test)]
mod tests;
