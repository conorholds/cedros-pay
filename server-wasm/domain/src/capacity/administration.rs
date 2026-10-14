//! Operator MCP controls for verified billing bindings; quotas come from catalog plans.
use super::{
    access::Access,
    billing, binding, catalog,
    config::{ApprovedAllowances, Config, Organization},
    store, wire,
};
use crate::{
    ctx::RequestContext,
    db::{Db, Query},
    error::{AppError, AppResult},
    ids,
    reqresp::{RouteRequest, RouteResponse},
    seams::HostSeams,
};
use serde_json::{json, Value};
use std::collections::BTreeMap;
#[path = "administration_coupons.rs"]
mod coupons;

pub(crate) fn is_route(id: &str) -> bool {
    matches!(
        id,
        ids::ROUTE_ADMIN_CAPACITY_READ
            | ids::ROUTE_ADMIN_CAPACITY_CONFIGURE
            | ids::ROUTE_ADMIN_CAPACITY_ENROLL
            | ids::ROUTE_ADMIN_CAPACITY_ACTIVATE
            | ids::ROUTE_ADMIN_CAPACITY_COUPON_ENSURE
    )
}
pub(crate) fn handle<S: HostSeams>(
    s: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    let suffix = req
        .route_id
        .strip_prefix("cedros-pay:admin-capacity-")
        .ok_or_else(wire::invalid)?;
    if !crate::routes::matches(req, "POST", &format!("/admin/capacity/{suffix}"))
        || !req.query.is_empty()
    {
        return Err(wire::invalid());
    }
    let body = req.json_body()?;
    if req.route_id == ids::ROUTE_ADMIN_CAPACITY_READ {
        fields(&body, &["organizationId", "couponCode", "couponPercentOff"])?;
        if body.get("couponPercentOff").is_some() && body.get("couponCode").is_none() {
            return Err(wire::invalid());
        }
        let config = raw(s)?;
        let organization = body["organizationId"].as_str();
        let binding = match (&config, organization) {
            (Some(c), Some(id)) => Some(binding::read(
                s,
                &access(c.clone(), id),
                &json!({"organizationId":id}),
            )?),
            _ => None,
        };
        let mut result = json!({"config":config,"binding":binding,"committedRevision":crate::routes::admin_config::capacity_revision(s)?});
        if body.get("couponCode").is_some() {
            result["couponInspection"] = coupons::inspect(s, &body)?;
        }
        return Ok(RouteResponse::ok(&result).with_header("cache-control", "no-store"));
    }
    ctx.require_admin_write_or_capability(&req.route_id)?;
    crate::guarded_policy::require_active(s)?;
    if req.route_id == ids::ROUTE_ADMIN_CAPACITY_COUPON_ENSURE {
        return coupons::ensure(s, &body).map(|v| RouteResponse::ok(&v));
    }
    // Fail stale configuration requests before customer or portal provider writes.
    identifier(&body, "mutationId")?;
    let revision = body
        .get("expectedRevision")
        .ok_or_else(|| AppError::bad_request("expectedRevision is required"))?;
    if !revision.is_null()
        && !revision
            .as_str()
            .is_some_and(|v| !v.is_empty() && v.len() <= 100)
    {
        return Err(wire::invalid());
    }
    if serde_json::to_value(crate::routes::admin_config::capacity_revision(s)?)
        .map_err(|_| wire::unavailable())?
        != *revision
    {
        return Err(AppError::conflict(
            "capacity configuration revision changed",
        ));
    }
    let config = match req.route_id.as_str() {
        ids::ROUTE_ADMIN_CAPACITY_CONFIGURE => configure(s, &body)?,
        ids::ROUTE_ADMIN_CAPACITY_ENROLL => enroll(s, &body)?,
        ids::ROUTE_ADMIN_CAPACITY_ACTIVATE => activate(s, &body)?,
        _ => return Err(wire::invalid()),
    };
    config.validate()?;
    let value = serde_json::to_value(config).map_err(|_| wire::unavailable())?;
    let result = crate::routes::admin_config::commit_capacity(s, req, ctx, &body, value)?;
    Ok(RouteResponse::ok(&result))
}
fn raw<S: HostSeams>(s: &S) -> AppResult<Option<Config>> {
    s.setting_get(super::config::SETTING)?
        .map(|v| {
            serde_json::from_str(&v)
                .map_err(|_| AppError::conflict("existing capacity configuration is invalid"))
        })
        .transpose()
}
fn mode<S: HostSeams>(s: &S) -> AppResult<String> {
    let raw = s
        .setting_get("stripe.mode")?
        .ok_or_else(wire::unavailable)?;
    let value: Value = serde_json::from_str(&raw).unwrap_or(Value::String(raw));
    match value.as_str() {
        Some("live" | "test") => Ok(value.as_str().ok_or_else(wire::invalid)?.into()),
        _ => Err(wire::unavailable()),
    }
}
fn configure<S: HostSeams>(s: &S, body: &Value) -> AppResult<Config> {
    fields(
        body,
        &[
            "mutationId",
            "expectedRevision",
            "description",
            "payInstallationId",
            "portalOrigin",
            "recoveryPath",
            "stripePortalConfigurationId",
        ],
    )?;
    let id = identifier(body, "payInstallationId")?;
    let origin = wire::text(body, "portalOrigin")?;
    let recovery = wire::text(body, "recoveryPath")?;
    // Reject invalid caller input before any provider mutation.
    let mut c = raw(s)?.unwrap_or(Config {
        pay_installation_id: id.into(),
        environment: mode(s)?,
        sales_enabled: false,
        joint_activation_verified: false,
        stripe_portal_configuration_id: "bpc_pending".into(),
        portal_origin: origin.into(),
        recovery_path: recovery.into(),
        organizations: BTreeMap::new(),
    });
    if c.pay_installation_id != id || c.environment != mode(s)? {
        return Err(AppError::conflict(
            "capacity installation identity cannot be changed",
        ));
    }
    c.portal_origin = origin.into();
    c.recovery_path = recovery.into();
    c.validate()?;
    if let Some(id) = body["stripePortalConfigurationId"].as_str() {
        c.stripe_portal_configuration_id = id.into();
        c.validate()?;
    }
    if c.stripe_portal_configuration_id == "bpc_pending" {
        let key = format!("capacity-portal:{}", c.pay_installation_id);
        let p = billing::post(
            s,
            "/v1/billing_portal/configurations",
            &key,
            &[
                (
                    "features[subscription_cancel][enabled]".into(),
                    "true".into(),
                ),
                (
                    "features[subscription_cancel][mode]".into(),
                    "at_period_end".into(),
                ),
                (
                    "features[payment_method_update][enabled]".into(),
                    "true".into(),
                ),
                ("features[invoice_history][enabled]".into(), "true".into()),
                (
                    "metadata[capacityPayInstallationId]".into(),
                    c.pay_installation_id.clone(),
                ),
            ],
        )?;
        c.stripe_portal_configuration_id = wire::text(&p, "id")?.into();
    }
    let p = billing::get(
        s,
        &format!(
            "/v1/billing_portal/configurations/{}",
            c.stripe_portal_configuration_id
        ),
    )?;
    if p["active"] != true
        || p["livemode"] != (c.environment == "live")
        || p["features"]["subscription_cancel"]["enabled"] != true
        || p["features"]["subscription_cancel"]["mode"] != "at_period_end"
    {
        return Err(AppError::conflict(
            "Stripe billing portal must support cancellation at period end",
        ));
    }
    Ok(c)
}
fn enroll<S: HostSeams>(s: &S, body: &Value) -> AppResult<Config> {
    fields(
        body,
        &[
            "mutationId",
            "expectedRevision",
            "description",
            "organizationId",
            "customerRef",
            "baseSubscriptionIds",
            "canonicalSiteIds",
            "commercialApprovalId",
        ],
    )?;
    let mut c = Config::load(s)?;
    let org = identifier(body, "organizationId")?;
    let owner = identifier(body, "customerRef")?;
    let approval = identifier(body, "commercialApprovalId")?;
    let ids = identifiers(body, "baseSubscriptionIds")?;
    if ids.is_empty() {
        return Err(AppError::bad_request(
            "at least one base subscription is required",
        ));
    }
    let sites = identifiers(body, "canonicalSiteIds")?;
    for (other, binding) in &c.organizations {
        if other != org
            && (binding
                .base_subscription_ids
                .iter()
                .any(|id| ids.contains(id))
                || binding
                    .canonical_site_ids
                    .iter()
                    .any(|id| sites.contains(id)))
        {
            return Err(AppError::conflict(
                "billing binding belongs to another organization",
            ));
        }
    }
    let catalog = store::complete_read(s, crate::ids::MODEL_CATALOG, &Query::new())?;
    let db = Db::new(s, crate::ids::DB_ACCESS);
    let mut customer: Option<String> = None;
    let mut allowances = c
        .organizations
        .get(org)
        .map(|o| o.base_plan_allowances.clone())
        .unwrap_or_default();
    let mut refs = BTreeMap::new();
    for id in &ids {
        if !super::config::provider_id(id, "sub_") {
            return Err(wire::invalid());
        }
        let row = db
            .read_one(crate::ids::MODEL_SUBSCRIPTIONS, id)?
            .ok_or_else(|| AppError::not_found("base subscription not found"))?;
        let p = &row.payload;
        if p["customerRef"] != owner
            || p["subscriptionId"] != *id
            || !p["capacityRecordType"].is_null()
        {
            return Err(AppError::conflict("base subscription owner does not match"));
        }
        crate::routes::subscription_entitlements::require_subscription_grant(p, s.now_unix_secs())?;
        let product = binding::product(&catalog, p)?;
        if product.payload["productType"] != "subscription"
            || crate::routes::products::is_capacity_product(&product.payload)
        {
            return Err(AppError::bad_request("a paid base plan is required"));
        }
        let n = product.payload["metadata"]["entitlements"]["cedros.portal.siteQuantity"]
            .as_u64()
            .filter(|n| *n > 0 && *n <= 9_007_199_254_740_991)
            .ok_or_else(|| {
                AppError::conflict("base catalog plan has no approved site entitlement")
            })?;
        let provider = billing::get(s, &format!("/v1/subscriptions/{id}"))?;
        let customer_id = wire::text(&provider, "customer")?;
        let owner_matches = p["stripeCustomerId"] == customer_id
            || (p["stripeCustomerId"].is_null()
                && provider["metadata"]["user_id_trusted"] == "true"
                && provider["metadata"]["user_id"] == owner);
        if provider["id"] != *id
            || !owner_matches
            || !super::config::provider_id(customer_id, "cus_")
            || provider["livemode"] != (c.environment == "live")
            || !matches!(provider["status"].as_str(), Some("active" | "trialing"))
            || provider["current_period_end"]
                .as_i64()
                .is_none_or(|v| v <= s.now_unix_secs())
            || customer.as_deref().is_some_and(|old| old != customer_id)
        {
            return Err(AppError::conflict(
                "Stripe base subscription binding could not be verified",
            ));
        }
        customer = Some(customer_id.into());
        refs.insert(id.clone(), owner.into());
        let allowance = json!({"meterId":"sites.count","unit":"site","siteId":null,"included":n,"limitState":"limited","offerIds":[],"categories":["sites"],"purchasedCreditPolicy":"unconfigured"});
        wire::validate("BaseAllowance", &allowance)?;
        let mapping = allowances
            .entry(product.entry_key.clone())
            .or_insert(ApprovedAllowances {
                approval_id: approval.into(),
                included_allowances: vec![],
            });
        mapping.approval_id = approval.into();
        mapping
            .included_allowances
            .retain(|v| v["meterId"] != "sites.count");
        mapping.included_allowances.push(allowance);
    }
    let customer_id = customer.ok_or_else(wire::unavailable)?;
    if c.organizations
        .iter()
        .any(|(id, o)| id != org && o.stripe_customer_id == customer_id)
    {
        return Err(AppError::conflict(
            "Stripe customer belongs to another organization",
        ));
    }
    let p = billing::get(s, &format!("/v1/customers/{customer_id}"))?;
    verify_customer(&p, &c, org, &customer_id, false)?;
    let p = billing::post(
        s,
        &format!("/v1/customers/{customer_id}"),
        &format!("capacity-binding:{}:{org}", c.pay_installation_id),
        &[
            ("metadata[capacityOrganizationId]".into(), org.into()),
            (
                "metadata[capacityPayInstallationId]".into(),
                c.pay_installation_id.clone(),
            ),
        ],
    )?;
    verify_customer(&p, &c, org, &customer_id, true)?;
    // Enrollment always disables this organization's sales until joint acceptance is attested.
    c.organizations.insert(
        org.into(),
        Organization {
            stripe_customer_id: customer_id,
            accounting_version: Some(2),
            base_subscription_ids: ids,
            base_customer_refs: refs,
            canonical_site_ids: sites,
            base_plan_allowances: allowances,
            commercial_verified: true,
            runtime_ready: false,
        },
    );
    Ok(c)
}
fn activate<S: HostSeams>(s: &S, body: &Value) -> AppResult<Config> {
    fields(
        body,
        &[
            "mutationId",
            "expectedRevision",
            "description",
            "organizationId",
            "acceptanceReference",
            "enabled",
        ],
    )?;
    let org = identifier(body, "organizationId")?;
    let _proof = identifier(body, "acceptanceReference")?;
    let enabled = body["enabled"].as_bool().ok_or_else(wire::invalid)?;
    let mut c = Config::load(s)?;
    let o = c.organizations.get(org).ok_or_else(wire::unavailable)?;
    if enabled {
        if !o.commercial_verified || o.accounting_version != Some(2) {
            return Err(wire::unavailable());
        }
        let a = access(c.clone(), org);
        binding::read(s, &a, &json!({"organizationId":org}))?;
        let catalog = store::complete_read(s, crate::ids::MODEL_CATALOG, &Query::new())?;
        for id in &o.base_subscription_ids {
            let target =
                json!({"scope":{"organizationId":org,"siteId":null},"baseSubscriptionId":id});
            let (offer, material) =
                catalog::resolve_from_catalog(&catalog, &a, &target, "cedros-addon-sites")?;
            if offer["reason"] == "terms_unapproved" {
                return Err(AppError::conflict(
                    "site add-on commercial terms are not approved",
                ));
            }
            billing::verify_price(s, &a, &offer, &material)?;
        }
    }
    c.organizations
        .get_mut(org)
        .ok_or_else(wire::unavailable)?
        .runtime_ready = enabled;
    c.sales_enabled = c.organizations.values().any(|o| o.runtime_ready);
    c.joint_activation_verified = c.sales_enabled;
    Ok(c)
}
fn verify_customer(p: &Value, c: &Config, org: &str, id: &str, exact: bool) -> AppResult<()> {
    let metadata = &p["metadata"];
    if p["id"] != id
        || p["deleted"] == true
        || p["livemode"] != (c.environment == "live")
        || p["balance"] != 0
        || !p["discount"].is_null()
        || p["tax_exempt"] != "none"
        || [
            ("capacityOrganizationId", org),
            ("capacityPayInstallationId", c.pay_installation_id.as_str()),
        ]
        .iter()
        .any(|(key, wanted)| metadata[*key] != *wanted && (exact || !metadata[*key].is_null()))
    {
        return Err(AppError::conflict(
            "Stripe customer is not eligible for this capacity binding",
        ));
    }
    Ok(())
}
fn access(config: Config, org: &str) -> Access {
    Access {
        actor: "cedros-data".into(),
        organization: org.into(),
        authority: "Read".into(),
        native: true,
        invocation: json!({}),
        config,
    }
}
fn fields(v: &Value, allowed: &[&str]) -> AppResult<()> {
    if v.as_object()
        .is_none_or(|o| o.keys().any(|k| !allowed.contains(&k.as_str())))
    {
        Err(wire::invalid())
    } else {
        Ok(())
    }
}
fn identifier<'a>(v: &'a Value, key: &str) -> AppResult<&'a str> {
    let s = wire::text(v, key)?;
    if s.len() > 160
        || !s
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"._:-".contains(&b))
    {
        return Err(wire::invalid());
    }
    Ok(s)
}
fn identifiers(v: &Value, key: &str) -> AppResult<Vec<String>> {
    let a = v[key]
        .as_array()
        .filter(|v| v.len() <= 1000)
        .ok_or_else(wire::invalid)?;
    let mut out = vec![];
    for item in a {
        let s = identifier(&json!({"value":item}), "value")?.to_string();
        if out.contains(&s) {
            return Err(wire::invalid());
        }
        out.push(s);
    }
    Ok(out)
}

#[cfg(test)]
#[path = "administration_tests.rs"]
mod tests;
