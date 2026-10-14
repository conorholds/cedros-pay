use super::{config::Config, wire};
use crate::{
    auth,
    ctx::RequestContext,
    error::{AppError, AppResult},
    reqresp::RouteRequest,
    seams::{HostSeams, ServiceRequest},
    time,
};
use serde_json::{json, Value};
pub struct Access {
    pub actor: String,
    pub organization: String,
    pub authority: String,
    pub native: bool,
    pub invocation: Value,
    pub config: Config,
}
pub fn invoke<S: HostSeams>(
    s: &S,
    operation: &str,
    delegation: &Value,
    key: &Value,
    command: Value,
) -> AppResult<Value> {
    let binding = wire::contract()["serviceBindings"]
        .as_array()
        .and_then(|a| {
            a.iter()
                .find(|b| b["operationId"] == operation && b["targetExtensionId"] == "cedros-data")
        })
        .ok_or_else(wire::unavailable)?;
    let response=s.service_invoke(&ServiceRequest{
        target_extension_id:"cedros-data".into(),route_id:wire::text(binding,"routeId")?.into(),capability_id:wire::text(binding,"capabilityId")?.into(),method:"POST".into(),path:wire::text(binding,"path")?.into(),query:vec![],
        body_json:json!({"contractVersion":wire::VERSION,"operationId":operation,"delegationId":delegation,"requestKey":key,"command":command}).to_string()
    }).map_err(|_| {
        s.log("warn", "capacity authority service invocation failed");
        wire::unavailable()
    })?;
    if !(200..300).contains(&response.status) {
        let value = wire::parse(&response.body).map_err(|_| wire::unavailable())?;
        let code = value
            .pointer("/error/code")
            .and_then(Value::as_str)
            .ok_or_else(wire::unavailable)?;
        if wire::contract()["httpErrors"][code].as_u64() != Some(u64::from(response.status)) {
            return Err(wire::unavailable());
        }
        let code = wire::contract()["httpErrors"]
            .as_object()
            .and_then(|o| o.get_key_value(code))
            .map(|(k, _)| k.as_str())
            .ok_or_else(wire::unavailable)?;
        s.log(
            "warn",
            &format!(
                "capacity authority service rejected status={} code={code}",
                response.status
            ),
        );
        return Err(AppError::new(
            response.status,
            code,
            "capacity authority rejected this operation",
        ));
    }
    let value = wire::parse(&response.body).map_err(|_| wire::unavailable())?;
    let op = wire::contract()["operations"]
        .as_array()
        .and_then(|a| a.iter().find(|o| o["operationId"] == operation))
        .ok_or_else(wire::unavailable)?;
    let name = wire::text(&op["responseSchema"], "$ref")?.trim_start_matches("#/$defs/");
    wire::validate(name, &value).map_err(|_| {
        s.log("warn", "capacity authority service response schema invalid");
        wire::unavailable()
    })?;
    Ok(value)
}
pub fn check<S: HostSeams>(
    s: &S,
    req: &RouteRequest,
    op: &Value,
    invocation: Value,
    internal: bool,
) -> AppResult<Access> {
    let ctx = RequestContext::parse(&req.context_json);
    let id = wire::text(op, "operationId")?;
    let capability = wire::text(op, "capabilityId")?;
    let trusted = ctx.authenticated
        && ctx.auth_scheme.as_deref() == Some("extension-service")
        && ctx.principal_id.as_deref() == Some("cedros-data")
        && ctx.actor_id.as_deref() == Some("cedros-data")
        && ctx.permission_claims == [capability];
    if internal
        && !trusted
        && !(ctx.authenticated
            && ctx.auth_scheme.as_deref() == Some("extension-service")
            && ctx.principal_id.as_deref() == Some("cedros-portal")
            && ctx.actor_id.as_deref() == Some("cedros-portal")
            && ctx.permission_claims == [capability])
    {
        return Err(AppError::forbidden("exact host service authority required"));
    }
    if trusted {
        if !matches!(
            id,
            "capacity.preview.read"
                | "capacity.purchase.read"
                | "capacity.grants.snapshot"
                | "capacity.binding.read"
        ) || !invocation["delegationId"].is_null()
        {
            return Err(AppError::forbidden("trusted read only"));
        }
        return Ok(Access {
            actor: "cedros-data".into(),
            organization: ctx
                .org_id
                .filter(|s| !s.is_empty())
                .ok_or_else(|| AppError::forbidden("verified organization required"))?,
            authority: "Read".into(),
            native: true,
            invocation,
            config: Config::load(s)?,
        });
    }
    if matches!(id, "capacity.grants.snapshot" | "capacity.binding.read") {
        return Err(AppError::forbidden(
            "native Data snapshot authority required",
        ));
    }
    let buyer = if internal {
        None
    } else {
        Some(
            auth::verify_buyer(s, req)
                .map_err(|e| {
                    s.log("warn", "capacity buyer verification failed");
                    e
                })?
                .user_id,
        )
    };
    let delegation = invocation["delegationId"]
        .as_str()
        .filter(|t| !t.is_empty())
        .ok_or_else(|| AppError::unauthorized("capacity delegation required"))?;
    let checked = invoke(
        s,
        "capacity.delegation.check",
        &invocation["delegationId"],
        &invocation["requestKey"],
        json!({"delegationId":delegation,"operationId":id,"requestKey":invocation["requestKey"],"command":invocation["command"]}),
    )?;
    let actor = wire::text(&checked, "actingUserId")?.to_string();
    if buyer.as_ref().is_some_and(|b| b != &actor)
        || wire::stamp(&checked, "expiresAt")? <= s.now_unix_secs()
        || wire::stamp(&checked, "expiresAt")? > s.now_unix_secs() + 300
    {
        return Err(AppError::forbidden(
            "delegation is not valid for this buyer",
        ));
    }
    let authority = wire::text(&checked, "authority")?.to_string();
    if (op["idempotencyKeyRequired"] == true || id == "capacity.preview.read")
        && authority != "BillingManage"
    {
        return Err(AppError::forbidden("billing authority required"));
    }
    if !matches!(authority.as_str(), "Read" | "BillingManage") {
        return Err(AppError::forbidden("capacity authority required"));
    }
    let config = Config::load(s)?;
    if checked["payInstallationId"] != config.pay_installation_id
        || checked["environment"] != config.environment
    {
        return Err(wire::unavailable());
    }
    Ok(Access {
        actor,
        organization: wire::text(&checked, "organizationId")?.into(),
        authority,
        native: false,
        invocation,
        config,
    })
}
impl Access {
    pub fn confine(&self, binding: &Value) -> AppResult<()> {
        if binding["scope"]["organizationId"] != self.organization
            || binding["payInstallationId"] != self.config.pay_installation_id
            || binding["environment"] != self.config.environment
        {
            return Err(AppError::not_found("capacity record not found"));
        }
        Ok(())
    }
    pub fn scope<S: HostSeams>(&self, s: &S, target: &Value, purpose: &str) -> AppResult<()> {
        if target["scope"]["organizationId"] != self.organization {
            return Err(AppError::not_found("capacity target not found"));
        }
        let out = invoke(
            s,
            "capacity.scope.check",
            &self.invocation["delegationId"],
            &self.invocation["requestKey"],
            json!({"target":target,"purpose":purpose}),
        )?;
        if out["target"] != *target
            || out["buyerUserId"] != self.actor
            || out["payInstallationId"] != self.config.pay_installation_id
            || out["environment"] != self.config.environment
            || wire::stamp(&out, "checkedAt")? > s.now_unix_secs()
            || s.now_unix_secs() - wire::stamp(&out, "checkedAt")? > 300
        {
            return Err(wire::unavailable());
        }
        self.config.organization(target)?;
        Ok(())
    }
    pub fn identity(&self) -> Value {
        json!([
            self.invocation["operationId"],
            self.config.pay_installation_id,
            self.config.environment,
            self.organization,
            self.actor,
            self.invocation["requestKey"]
        ])
    }
}
pub fn freshness(now: i64) -> Value {
    json!({"state":"available","observedAt":time::iso8601(now),"validUntil":time::iso8601(now+60)})
}
