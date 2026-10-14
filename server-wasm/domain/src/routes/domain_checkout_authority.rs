//! Initialize only missing checkout authority for the verified host domain service.
use serde_json::json;

use crate::{
    conditional_batch,
    ctx::RequestContext,
    error::{AppError, AppResult},
    ids,
    seams::HostSeams,
    stripe::api,
};

pub(super) fn initialize<S: HostSeams>(
    seams: &S,
    context: &RequestContext,
    intent_id: &str,
    return_url: &str,
) -> AppResult<()> {
    context.require_claim(ids::ROUTE_ADMIN)?;
    context.require_admin_write()?;
    if context.actor_id.as_deref() != Some("cedros-domains-manager")
        || context.principal_id.as_deref() != Some("cedros-domains-manager")
    {
        return Err(AppError::forbidden(
            "host domain service identity is required",
        ));
    }
    if complete(seams)? {
        return Ok(());
    }
    // Read the revision BEFORE re-reading missing fields. An initialization or
    // operator edit racing these reads must fail CAS instead of being overwritten.
    let revision = crate::routes::admin_config::config_cas::current_revision(seams)?;
    let mut settings = vec![];
    let mut secrets = vec![];
    let mut changed_keys = vec![];
    if seams
        .setting_get(ids::SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS)?
        .is_none()
    {
        let origin = crate::checkout_contract::return_origins::trusted_origin(return_url)?;
        settings.push(json!({"key":ids::SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS,"value":[origin]}));
        changed_keys.push(ids::SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS);
    }
    if seams
        .secret_get(ids::SECRET_CHECKOUT_CONTEXT_MAC)?
        .is_none()
    {
        let mut bytes = [0_u8; 32];
        getrandom::fill(&mut bytes)
            .map_err(|_| AppError::internal("secure checkout key generation failed"))?;
        secrets.push(json!({"key":ids::SECRET_CHECKOUT_CONTEXT_MAC,"action":"set","value":hex::encode(bytes)}));
        changed_keys.push(ids::SECRET_CHECKOUT_CONTEXT_MAC);
    }
    if seams
        .secret_get(ids::SECRET_CHECKOUT_STRIPE_ACCOUNT)?
        .is_none()
    {
        let account = stripe_account(seams)?;
        secrets.push(
            json!({"key":ids::SECRET_CHECKOUT_STRIPE_ACCOUNT,"action":"set","value":account}),
        );
        changed_keys.push(ids::SECRET_CHECKOUT_STRIPE_ACCOUNT);
    }
    if settings.is_empty() && secrets.is_empty() {
        return Ok(());
    }
    changed_keys.sort();
    let mutation_id = format!("domain-checkout-authority:{intent_id}");
    conditional_batch::execute(
        seams,
        ids::CONFIG_DB_ACCESS,
        "extension.configuration.compare-and-set",
        json!({
            "mutationId":mutation_id,"expectedRevision":revision,
            "settings":settings,"secrets":secrets,
            "audit":{"entryKey":format!("config-audit:{mutation_id}"),
                "changedKeys":changed_keys,"actorId":context.actor_id,
                "reason":"Initialize missing authority for the authenticated host domain checkout service"}
        }),
    )?;
    if !complete(seams)? {
        return Err(AppError::internal(
            "checkout authority initialization is incomplete",
        ));
    }
    Ok(())
}

fn complete<S: HostSeams>(seams: &S) -> AppResult<bool> {
    Ok(seams
        .setting_get(ids::SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS)?
        .is_some()
        && seams
            .secret_get(ids::SECRET_CHECKOUT_CONTEXT_MAC)?
            .is_some()
        && seams
            .secret_get(ids::SECRET_CHECKOUT_STRIPE_ACCOUNT)?
            .is_some())
}

fn stripe_account<S: HostSeams>(seams: &S) -> AppResult<String> {
    let key = seams
        .secret_get(ids::SECRET_STRIPE_KEY)?
        .filter(|key| !key.is_empty())
        .ok_or_else(|| AppError::new(503, "unavailable", "card payments are not configured"))?;
    // Stripe's authenticated /v1/account endpoint returns the account belonging
    // to the configured merchant key. No account id is accepted from the caller.
    let fetch = api::stripe_get(&key, "/v1/account");
    let raw = seams.http_fetch(&fetch.to_string())?;
    let (status, body) = api::unwrap_fetch(&raw).map_err(|_| {
        AppError::new(
            502,
            "provider_unavailable",
            "could not verify merchant account",
        )
    })?;
    let body: serde_json::Value = serde_json::from_str(&body).map_err(|_| {
        AppError::new(
            502,
            "provider_unavailable",
            "could not verify merchant account",
        )
    })?;
    if status != 200 || body["object"] != "account" {
        return Err(AppError::new(
            502,
            "provider_unavailable",
            "could not verify merchant account",
        ));
    }
    body["id"]
        .as_str()
        .filter(|id| {
            id.starts_with("acct_")
                && id.len() > 5
                && id.len() <= 255
                && id
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
        })
        .map(str::to_string)
        .ok_or_else(|| {
            AppError::new(
                502,
                "provider_unavailable",
                "could not verify merchant account",
            )
        })
}
