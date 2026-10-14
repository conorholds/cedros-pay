//! The host context envelope (13a "The host context envelope").
//!
//! `actorId` / `authenticated` / `permissionClaims` describe the **cedros-data
//! admin** session only. Use them to gate admin-management routes; public routes
//! run in their own auth domain (`authenticated == false` is the normal state).

use serde::Deserialize;

use crate::error::{AppError, AppResult};

/// Host admin-session claims that carry site-wide extension authority. `*` is
/// the cedros-login DataAdmin wildcard. Generic host settings claims (for
/// example `manage_settings`) are intentionally not listed here; they do not
/// prove permission to read or modify Cedros Pay payment configuration.
const SYSTEM_ADMIN_CLAIMS: &[&str] = &["*"];

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct RequestContext {
    pub actor_id: Option<String>,
    /// Native host verified organization; never copied from request JSON.
    pub org_id: Option<String>,
    /// Host-derived principal. Extension-service calls set this to the caller
    /// extension id; request bodies cannot supply or override it.
    pub principal_id: Option<String>,
    pub authenticated: bool,
    /// Host-verified site-wide administrator authority for this principal.
    pub system_admin: bool,
    pub permission_claims: Vec<String>,
    pub request_id: Option<String>,
    pub idempotency_key: Option<String>,
    pub csrf_verified: bool,
    pub site_id: Option<String>,
    pub environment: Option<String>,
    /// Credential transport verified by the host. Exact capability-route
    /// attestations are accepted only for bearer-token principals.
    pub auth_scheme: Option<String>,
    /// Exact host-attested route ids granted for this invocation.
    pub capability_claims: Vec<String>,
    /// Host-derived ISO country used for regional storefront policy. This value
    /// must never be copied from a buyer-controlled request body.
    pub market_country: Option<String>,
    /// Trusted Site Assistant execution context. These values are injected by
    /// the host after it verifies the signed Data tool request; route bodies
    /// cannot supply or override them.
    pub assistant_id: Option<String>,
    pub assistant_action: Option<String>,
    pub run_id: Option<String>,
    pub call_id: Option<String>,
    pub confirmation_verified: bool,
    pub authorized_max_amount_microunits: Option<u64>,
}

impl RequestContext {
    /// Parses the envelope; a malformed/empty envelope yields an unauthenticated
    /// context (fail closed — never an authenticated one).
    pub fn parse(context_json: &str) -> Self {
        if context_json.trim().is_empty() {
            return Self::default();
        }
        serde_json::from_str(context_json).unwrap_or_default()
    }

    pub fn has_claim(&self, claim: &str) -> bool {
        self.permission_claims
            .iter()
            .any(|c| c == claim || c == "*")
    }

    /// True when the host session carries site-wide extension admin authority:
    /// the envelope's `systemAdmin` flag or an explicit wildcard claim.
    pub fn is_system_admin(&self) -> bool {
        self.system_admin
            || SYSTEM_ADMIN_CLAIMS
                .iter()
                .any(|claim| self.permission_claims.iter().any(|c| c == claim))
    }

    /// Admin-management gate: fail closed when the host admin session is absent.
    pub fn require_admin(&self) -> AppResult<()> {
        if self.authenticated {
            Ok(())
        } else {
            Err(AppError::unauthorized("admin authentication required"))
        }
    }

    /// Admin write gate: bearer (CSRF-immune) auth only. Fail closed otherwise.
    pub fn require_admin_write(&self) -> AppResult<()> {
        self.require_admin()?;
        if self.csrf_verified {
            Ok(())
        } else {
            Err(AppError::forbidden(
                "CSRF verification required for this write",
            ))
        }
    }

    /// Write gate for a normal CSRF-verified administrator or one exact,
    /// host-attested bearer capability. Bearer capability calls are immune to
    /// browser CSRF, but remain bound to the single declared route.
    pub fn require_admin_write_or_capability(&self, route_claim: &str) -> AppResult<()> {
        self.require_admin()?;
        if self.csrf_verified
            || (self.auth_scheme.as_deref() == Some("bearer-token")
                && self
                    .capability_claims
                    .iter()
                    .any(|claim| claim == route_claim))
        {
            Ok(())
        } else {
            Err(AppError::forbidden(
                "CSRF verification or an exact bearer capability is required for this write",
            ))
        }
    }

    /// Admin gate that also requires a specific permission claim. Site-wide
    /// extension admin sessions pass without the extension-specific claim only
    /// when the host vouches for `systemAdmin` or the wildcard claim. Generic
    /// host settings claims are not enough for Cedros Pay admin authority.
    pub fn require_claim(&self, claim: &str) -> AppResult<()> {
        self.require_admin()?;
        if self.has_claim(claim) || self.is_system_admin() {
            Ok(())
        } else {
            Err(AppError::forbidden(format!(
                "missing permission claim: {claim}"
            )))
        }
    }

    /// Allow a normal Pay administrator or one host-dispatched AI capability
    /// attested for this exact route. A generic MCP/settings claim is never
    /// sufficient, and ambient cookie sessions cannot use capability claims.
    pub fn require_claim_or_capability(
        &self,
        admin_claim: &str,
        route_claim: &str,
    ) -> AppResult<()> {
        self.require_admin()?;
        if self.has_claim(admin_claim) || self.is_system_admin() {
            return Ok(());
        }
        if self.auth_scheme.as_deref() == Some("bearer-token")
            && self
                .capability_claims
                .iter()
                .any(|claim| claim == route_claim)
        {
            return Ok(());
        }
        Err(AppError::forbidden(format!(
            "missing permission claim: {admin_claim}"
        )))
    }

    /// Returns the host-verified site scope required for stable public entity
    /// identity. Commerce projections fail closed instead of using a shared
    /// fallback scope that could collide across sites.
    pub fn require_site_id(&self) -> AppResult<&str> {
        self.site_id
            .as_deref()
            .map(str::trim)
            .filter(|site_id| {
                !site_id.is_empty()
                    && site_id.len() <= 240
                    && !site_id.chars().any(char::is_control)
            })
            .ok_or_else(|| AppError::bad_request("host context requires a valid siteId"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The exact envelope the cedros-data host sends for a local-admin session
    /// (`ExtensionRouteAuth::admin`): generic claims plus `systemAdmin`, never
    /// extension-specific claims.
    #[test]
    fn host_admin_session_passes_extension_claim_gate() {
        let ctx = RequestContext::parse(
            r#"{"authenticated":true,"systemAdmin":true,"csrfVerified":true,
                "permissionClaims":["manage_settings","manage_users","data:settings:read","data:settings:write"]}"#,
        );

        assert!(ctx.require_claim("cedros-pay:admin").is_ok());
        assert!(ctx.require_admin_write().is_ok());
    }

    /// cedros-login DataAdmin sessions carry the `*` wildcard claim.
    #[test]
    fn wildcard_claim_passes_extension_claim_gate() {
        let ctx = RequestContext::parse(
            r#"{"authenticated":true,"permissionClaims":["*"],"csrfVerified":true}"#,
        );

        assert!(ctx.require_claim("cedros-pay:admin").is_ok());
        assert!(ctx.has_claim("cedros-pay:entitlement-read"));
    }

    #[test]
    fn non_admin_claims_still_fail_closed() {
        let ctx = RequestContext::parse(
            r#"{"authenticated":true,"permissionClaims":["cedros_managed_api"],"csrfVerified":true}"#,
        );
        let err = ctx.require_claim("cedros-pay:admin").unwrap_err();
        assert_eq!(err.status, 403);

        let unauthenticated = RequestContext::parse(
            r#"{"authenticated":false,"systemAdmin":true,"permissionClaims":["manage_settings"]}"#,
        );
        assert_eq!(
            unauthenticated
                .require_claim("cedros-pay:admin")
                .unwrap_err()
                .status,
            401
        );
    }

    #[test]
    fn generic_host_settings_claims_do_not_grant_pay_admin() {
        let ctx = RequestContext::parse(
            r#"{"authenticated":true,"permissionClaims":["manage_settings","manage_extensions"],"csrfVerified":true}"#,
        );

        assert!(!ctx.is_system_admin());
        let err = ctx.require_claim("cedros-pay:admin").unwrap_err();
        assert_eq!(err.status, 403);
    }

    #[test]
    fn exact_bearer_capability_route_passes_without_granting_pay_admin() {
        let ctx = RequestContext::parse(
            r#"{"authenticated":true,"csrfVerified":false,"authScheme":"bearer-token",
                "permissionClaims":["data:settings:read"],
                "capabilityClaims":["cedros-pay:admin-catalog-records-query"]}"#,
        );

        assert!(ctx
            .require_claim_or_capability(
                "cedros-pay:admin",
                "cedros-pay:admin-catalog-records-query"
            )
            .is_ok());
        assert!(ctx.require_claim("cedros-pay:admin").is_err());
        assert!(ctx
            .require_claim_or_capability(
                "cedros-pay:admin",
                "cedros-pay:admin-catalog-product-upsert"
            )
            .is_err());
        assert!(ctx
            .require_admin_write_or_capability("cedros-pay:admin-catalog-records-query")
            .is_ok());
        assert!(ctx
            .require_admin_write_or_capability("cedros-pay:admin-catalog-product-upsert")
            .is_err());
    }

    #[test]
    fn public_entity_scope_requires_a_valid_site_id() {
        assert_eq!(
            RequestContext::default()
                .require_site_id()
                .unwrap_err()
                .status,
            400
        );
        assert_eq!(
            RequestContext::parse(r#"{"siteId":"site-a"}"#)
                .require_site_id()
                .unwrap(),
            "site-a"
        );
    }
}
