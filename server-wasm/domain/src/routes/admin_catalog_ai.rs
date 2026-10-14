use serde::de::DeserializeOwned;
use serde_json::{json, Value};

use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;

#[path = "admin_catalog_ai_models.rs"]
mod models;
#[path = "admin_catalog_ai_store.rs"]
pub(super) mod store;

use models::{
    PriceUpsertRequest, ProductActiveSetRequest, ProductDeleteRequest, ProductUpsertRequest,
    ProgramInviteUpsertRequest, ProgramMembershipUpsertRequest, ProgramUpsertRequest, QueryRequest,
};

pub(super) fn handle<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    match req.route_id.as_str() {
        ids::ROUTE_ADMIN_CATALOG_RECORDS_QUERY => query(seams, req),
        ids::ROUTE_ADMIN_CAPACITY_ACTIVATION_STATUS => activation_status(seams, req),
        ids::ROUTE_ADMIN_CAPACITY_TAX_READINESS => tax_readiness(seams, req),
        ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT => product_upsert(seams, req, ctx),
        ids::ROUTE_ADMIN_CATALOG_PRODUCT_ACTIVE_SET => product_active_set(seams, req, ctx),
        ids::ROUTE_ADMIN_CATALOG_PRODUCT_DELETE => product_delete(seams, req, ctx),
        ids::ROUTE_ADMIN_CATALOG_PRICE_UPSERT => price_upsert(seams, req, ctx),
        ids::ROUTE_ADMIN_PROGRAM_ENTITLEMENT_UPSERT => program_upsert(seams, req, ctx),
        ids::ROUTE_ADMIN_PROGRAM_INVITE_UPSERT => program_invite_upsert(seams, req, ctx),
        ids::ROUTE_ADMIN_PROGRAM_MEMBERSHIP_UPSERT => program_membership_upsert(seams, req, ctx),
        _ => Err(AppError::not_found("unknown catalog administration route")),
    }
}

fn query<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_path(req, "POST", "/admin/catalog/records/query")?;
    let input: QueryRequest = body(req)?;
    let mut records = store::records(seams)?;
    if let Some(handle) = input.stable_handle.as_deref() {
        records.retain(|entry| store::stable_handle(entry) == handle);
    }
    if let Some(record_type) = input.record_type.as_deref() {
        records.retain(|entry| store::record_type(&entry.payload) == record_type);
    }
    if !input.include_archived {
        records.retain(|entry| {
            entry.payload.get("status").and_then(Value::as_str) != Some("archived")
        });
    }
    records.sort_by(|left, right| store::stable_handle(left).cmp(store::stable_handle(right)));
    let records = records
        .iter()
        .map(store::response_record)
        .collect::<Vec<_>>();
    Ok(RouteResponse::ok(&json!({
        "records": records,
        "count": records.len(),
    })))
}

fn activation_status<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_path(req, "POST", "/admin/capacity/activation/status")?;
    let input = req.json_body()?;
    if input.as_object().is_none_or(|object| !object.is_empty()) {
        return Err(AppError::bad_request(
            "activation status takes no arguments",
        ));
    }

    let stripe_mode = seams
        .setting_get("stripe.mode")?
        .map(|raw| serde_json::from_str::<Value>(&raw).unwrap_or(Value::String(raw)))
        .unwrap_or(Value::Null);
    let stripe_enabled = seams
        .setting_get("stripe.enabled")?
        .map(|raw| serde_json::from_str::<Value>(&raw).unwrap_or(Value::String(raw)))
        .unwrap_or(Value::Null);
    let raw_capacity = seams.setting_get(crate::capacity::config::SETTING)?;
    let capacity = raw_capacity
        .as_deref()
        .and_then(|raw| serde_json::from_str::<crate::capacity::config::Config>(raw).ok());
    let capacity_loadable =
        raw_capacity.is_some() && crate::capacity::config::Config::load(seams).is_ok();
    let organizations = capacity
        .as_ref()
        .map(|config| config.organizations.values().collect::<Vec<_>>())
        .unwrap_or_default();
    let ready_organizations = organizations
        .iter()
        .filter(|org| {
            org.commercial_verified
                && org.runtime_ready
                && org.accounting_version == Some(2)
                && !org.base_subscription_ids.is_empty()
        })
        .count();
    Ok(RouteResponse::ok(&json!({
        "stripeMode": stripe_mode,
        "stripeEnabled": stripe_enabled,
        "capacityConfigurationPresent": raw_capacity.is_some(),
        "capacityLoadable": capacity_loadable,
        "capacityEnvironment": capacity.as_ref().map(|config| config.environment.as_str()),
        "salesEnabled": capacity.as_ref().map(|config| config.sales_enabled),
        "jointActivationVerified": capacity.as_ref().map(|config| config.joint_activation_verified),
        "organizationCount": organizations.len(),
        "readyOrganizationCount": ready_organizations,
    })))
}

fn tax_readiness<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    require_path(req, "POST", "/admin/capacity/tax/readiness")?;
    let input = req.json_body()?;
    if input.as_object().is_none_or(|object| !object.is_empty()) {
        return Err(AppError::bad_request("tax readiness takes no arguments"));
    }
    let mode = seams
        .setting_get("stripe.mode")?
        .map(|raw| serde_json::from_str::<Value>(&raw).unwrap_or(Value::String(raw)))
        .unwrap_or(Value::Null);
    let live = match mode.as_str() {
        Some("live") => true,
        Some("test") => false,
        _ => return Err(crate::capacity::source_unavailable()),
    };
    let settings = crate::capacity::stripe_get(seams, "/v1/tax/settings")?;
    if settings["object"] != "tax.settings" || settings["livemode"] != live {
        return Err(crate::capacity::source_unavailable());
    }
    if !matches!(settings["status"].as_str(), Some("active" | "pending"))
        || !settings["defaults"]["tax_code"].is_null()
            && settings["defaults"]["tax_code"].as_str().is_none()
        || !settings["defaults"]["tax_behavior"].is_null()
            && settings["defaults"]["tax_behavior"].as_str().is_none()
    {
        return Err(crate::capacity::source_unavailable());
    }
    let registrations = crate::capacity::stripe_get(seams, "/v1/tax/registrations?limit=100")?;
    let registration_rows = registrations["data"]
        .as_array()
        .ok_or_else(crate::capacity::source_unavailable)?;
    let has_more = registrations["has_more"]
        .as_bool()
        .ok_or_else(crate::capacity::source_unavailable)?;
    if registration_rows.iter().any(|registration| {
        registration["object"] != "tax.registration"
            || registration["livemode"] != live
            || !matches!(
                registration["status"].as_str(),
                Some("active" | "expired" | "scheduled")
            )
    }) {
        return Err(crate::capacity::source_unavailable());
    }
    let linked_products = store::records(seams)?
        .into_iter()
        .filter(|entry| entry.payload["productType"] == "capacityAddOn")
        .filter_map(|entry| {
            let product_id = entry.payload["stripeProductId"].as_str()?;
            let handle = entry.payload["stableHandle"].as_str()?;
            Some((handle.to_owned(), product_id.to_owned()))
        })
        .collect::<Vec<_>>();
    let mut missing_tax_codes = Vec::new();
    for (handle, product_id) in &linked_products {
        if !crate::capacity::config::provider_id(product_id, "prod_") {
            return Err(crate::capacity::source_unavailable());
        }
        let product = crate::capacity::stripe_get(seams, &format!("/v1/products/{product_id}"))?;
        if product["id"] != *product_id || product["livemode"] != live {
            return Err(crate::capacity::source_unavailable());
        }
        if product["tax_code"]
            .as_str()
            .is_none_or(|code| !crate::capacity::config::provider_id(code, "txcd_"))
        {
            missing_tax_codes.push(handle.clone());
        }
    }
    missing_tax_codes.sort();
    Ok(RouteResponse::ok(&json!({
        "stripeMode": mode,
        "taxSettingsStatus": settings["status"],
        "defaultTaxCode": settings["defaults"]["tax_code"],
        "defaultTaxBehavior": settings["defaults"]["tax_behavior"],
        "activeRegistrationCount": registration_rows.iter().filter(|registration| registration["status"] == "active").count(),
        "registrationListComplete": !has_more,
        "linkedAddOnProductCount": linked_products.len(),
        "linkedAddOnMissingTaxCodeHandles": missing_tax_codes,
    })))
}

fn product_upsert<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_path(req, "PUT", "/admin/catalog/products/upsert")?;
    ctx.require_admin_write_or_capability(&req.route_id)?;
    let input: ProductUpsertRequest = body(req)?;
    let handle = input.product.stable_handle.clone();
    let existing = store::find_by_handle(seams, &handle)?;
    if existing
        .as_ref()
        .is_some_and(|entry| store::record_type(&entry.payload) != "product")
    {
        return Err(AppError::conflict(
            "stableHandle belongs to a non-product catalog record",
        ));
    }
    let value = models::product_value(
        input.product,
        existing.as_ref().map(|entry| &entry.payload),
        seams.now_unix_secs(),
    )?;
    let created = existing.is_none();
    let saved = store::save(seams, existing.as_ref(), &handle, &value)?;
    audit(seams, "product", &handle, created);
    Ok(mutation_response("product", created, &saved))
}

fn product_active_set<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_path(req, "POST", "/admin/catalog/products/active")?;
    ctx.require_admin_write_or_capability(&req.route_id)?;
    let input: ProductActiveSetRequest = body(req)?;
    let product = super::products::set_product_active(seams, &input.product_id, input.active)?;
    audit_operation(
        seams,
        "product",
        &input.product_id,
        if input.active {
            "activated"
        } else {
            "deactivated"
        },
    );
    Ok(RouteResponse::ok(&json!({
        "productId": input.product_id,
        "active": input.active,
        "product": product,
    })))
}

fn product_delete<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_path(req, "POST", "/admin/catalog/products/delete")?;
    ctx.require_admin_write_or_capability(&req.route_id)?;
    let input: ProductDeleteRequest = body(req)?;
    if !input.confirmed {
        return Err(AppError::bad_request(
            "confirmed must be true to delete a product",
        ));
    }
    let deleted = super::products::remove_product(seams, &input.product_id)?;
    if deleted {
        audit_operation(seams, "product", &input.product_id, "deleted");
    }
    Ok(RouteResponse::ok(&json!({
        "productId": input.product_id,
        "deleted": deleted,
    })))
}

fn price_upsert<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_path(req, "PUT", "/admin/catalog/prices/upsert")?;
    ctx.require_admin_write_or_capability(&req.route_id)?;
    let input: PriceUpsertRequest = body(req)?;
    let product = store::find_by_handle(seams, &input.product_handle)?
        .ok_or_else(|| AppError::not_found("productHandle was not found"))?;
    if store::record_type(&product.payload) != "product" {
        return Err(AppError::unprocessable(
            "prices can only be attached to product records",
        ));
    }
    let price_handle = input.price.stable_handle.clone();
    let mut prices = store::prices(&product.payload);
    let matching = prices
        .iter()
        .enumerate()
        .filter(|(_, price)| {
            price.get("stableHandle").and_then(Value::as_str) == Some(price_handle.as_str())
        })
        .map(|(index, _)| index)
        .collect::<Vec<_>>();
    if matching.len() > 1 {
        return Err(AppError::conflict(format!(
            "multiple prices use stableHandle {price_handle}"
        )));
    }
    let existing_price = matching.first().and_then(|index| prices.get(*index));
    let price = models::price_value(
        &input.product_handle,
        input.price,
        existing_price,
        seams.now_unix_secs(),
    )?;
    let created = matching.is_empty();
    match matching.first().copied() {
        Some(index) => prices[index] = price,
        None => prices.push(price),
    }
    prices.sort_by(|left, right| {
        left.get("stableHandle")
            .and_then(Value::as_str)
            .cmp(&right.get("stableHandle").and_then(Value::as_str))
    });
    let value = store::replace_prices(&product.payload, prices, seams.now_unix_secs());
    let saved = store::save(seams, Some(&product), &product.entry_key, &value)?;
    audit(seams, "price", &price_handle, created);
    let saved_price = store::prices(&saved.payload)
        .into_iter()
        .find(|price| {
            price.get("stableHandle").and_then(Value::as_str) == Some(price_handle.as_str())
        })
        .ok_or_else(|| AppError::internal("price mutation could not be read back"))?;
    Ok(RouteResponse::ok(&json!({
        "kind": "price",
        "created": created,
        "productId": saved.entry_key,
        "priceId": saved_price.get("id"),
        "price": saved_price,
        "catalogVersion": saved.version,
    })))
}

fn program_upsert<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_path(req, "PUT", "/admin/catalog/program-entitlements/upsert")?;
    ctx.require_admin_write_or_capability(&req.route_id)?;
    let input: ProgramUpsertRequest = body(req)?;
    let handle = input.entitlement.stable_handle.clone();
    let existing = store::find_by_handle(seams, &handle)?;
    if existing
        .as_ref()
        .is_some_and(|entry| store::record_type(&entry.payload) != "programEntitlement")
    {
        return Err(AppError::conflict(
            "stableHandle belongs to a different catalog record type",
        ));
    }
    let value = models::program_value(
        input.entitlement,
        existing.as_ref().map(|entry| &entry.payload),
        seams.now_unix_secs(),
    )?;
    let created = existing.is_none();
    let saved = store::save(seams, existing.as_ref(), &handle, &value)?;
    audit(seams, "programEntitlement", &handle, created);
    Ok(mutation_response("programEntitlement", created, &saved))
}

fn program_invite_upsert<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_path(req, "PUT", "/admin/catalog/program-invites/upsert")?;
    ctx.require_admin_write_or_capability(&req.route_id)?;
    let input: ProgramInviteUpsertRequest = body(req)?;
    if input.invite.status == "active" {
        require_active_program(seams, &input.invite.program_handle)?;
    }
    let key = input.invite.stable_handle.clone();
    let existing = store::program_access_record(seams, &key)?;
    if existing
        .as_ref()
        .is_some_and(|entry| store::record_type(&entry.payload) != "programInvite")
    {
        return Err(AppError::conflict(
            "stableHandle belongs to a different program access record type",
        ));
    }
    let value = models::program_invite_value(
        input.invite,
        existing.as_ref().map(|entry| &entry.payload),
        seams.now_unix_secs(),
    )?;
    let created = existing.is_none();
    let saved = store::save_program_access(seams, existing.as_ref(), &key, &value)?;
    audit(seams, "programInvite", &key, created);
    Ok(program_access_mutation_response(
        "programInvite",
        created,
        &saved,
    ))
}

fn program_membership_upsert<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    require_path(req, "PUT", "/admin/catalog/program-memberships/upsert")?;
    ctx.require_admin_write_or_capability(&req.route_id)?;
    let input: ProgramMembershipUpsertRequest = body(req)?;
    if input.membership.status == "active" {
        require_active_program(seams, &input.membership.program_handle)?;
    }
    let key = crate::routes::program_access::membership_key(&input.membership.subject_id);
    let existing = store::program_access_record(seams, &key)?;
    if existing
        .as_ref()
        .is_some_and(|entry| store::record_type(&entry.payload) != "programMembership")
    {
        return Err(AppError::conflict(
            "subject belongs to a different program access record type",
        ));
    }
    let handle = input.membership.program_handle.clone();
    let value = models::program_membership_value(
        input.membership,
        existing.as_ref().map(|entry| &entry.payload),
        seams.now_unix_secs(),
    )?;
    let created = existing.is_none();
    let saved = store::save_program_access(seams, existing.as_ref(), &key, &value)?;
    audit(seams, "programMembership", &handle, created);
    Ok(program_access_mutation_response(
        "programMembership",
        created,
        &saved,
    ))
}

fn require_active_program<S: HostSeams>(seams: &S, handle: &str) -> AppResult<()> {
    let program = store::find_by_handle(seams, handle)?
        .ok_or_else(|| AppError::not_found("programHandle was not found"))?;
    if store::record_type(&program.payload) != "programEntitlement"
        || program.payload.get("status").and_then(Value::as_str) != Some("active")
        || program
            .payload
            .pointer("/pricing/configured")
            .and_then(Value::as_bool)
            != Some(true)
    {
        return Err(AppError::unprocessable(
            "programHandle must reference an active entitlement with approved fixed pricing",
        ));
    }
    Ok(())
}

fn mutation_response(kind: &str, created: bool, entry: &crate::db::EntryRecord) -> RouteResponse {
    RouteResponse::ok(&json!({
        "kind": kind,
        "created": created,
        "recordId": entry.entry_key,
        "record": store::response_record(entry),
    }))
}

fn program_access_mutation_response(
    kind: &str,
    created: bool,
    entry: &crate::db::EntryRecord,
) -> RouteResponse {
    RouteResponse::ok(&json!({
        "kind": kind,
        "created": created,
        "recordId": entry.entry_key,
        "record": store::program_access_response(entry),
    }))
}

fn body<T: DeserializeOwned>(req: &RouteRequest) -> AppResult<T> {
    serde_json::from_value(req.json_body()?).map_err(|error| {
        AppError::unprocessable("invalid request body").with_internal(error.to_string())
    })
}

fn require_path(req: &RouteRequest, method: &str, path: &str) -> AppResult<()> {
    if crate::routes::matches(req, method, path) {
        Ok(())
    } else {
        Err(AppError::not_found("unknown catalog administration route"))
    }
}

fn audit<S: HostSeams>(seams: &S, kind: &str, handle: &str, created: bool) {
    if seams
        .emit_record(
            "cedros-pay-catalog-administration",
            "Cedros Pay catalog mutation",
            &format!(
                "{} {kind} record {handle}",
                if created { "Created" } else { "Updated" }
            ),
            &json!({"recordType":kind,"stableHandle":handle,"created":created}).to_string(),
        )
        .is_err()
    {
        seams.log("error", "catalog administration audit emission failed");
    }
}

fn audit_operation<S: HostSeams>(seams: &S, kind: &str, handle: &str, operation: &str) {
    if seams
        .emit_record(
            "cedros-pay-catalog-administration",
            "Cedros Pay catalog mutation",
            &format!("{operation} {kind} record {handle}"),
            &json!({"recordType":kind,"stableHandle":handle,"operation":operation}).to_string(),
        )
        .is_err()
    {
        seams.log("error", "catalog administration audit emission failed");
    }
}

#[cfg(test)]
#[path = "admin_catalog_ai_tests.rs"]
mod tests;
