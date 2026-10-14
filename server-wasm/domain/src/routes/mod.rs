//! Inbound route handlers, dispatched by [`crate::router`].

pub mod access_pass;
mod access_pass_auth;
pub(crate) mod access_pass_jobs;
mod access_pass_payment;
pub(crate) mod access_pass_purchase;
pub mod admin;
pub mod admin_affiliate_payouts;
pub mod admin_config;
pub mod admin_dashboard;
pub mod admin_shipping_tax;
pub mod admin_site_settings;
pub mod analytics_events;
pub mod assistant_x402;
pub mod canonical_checkout;
pub mod cart;
pub mod cart_checkout;
pub mod cart_credits;
mod cart_settlement;
mod checkout_claim;
pub mod compliance_check;
mod coupon_rules;
#[cfg(test)]
mod coupon_tests;
mod coupon_values;
pub mod coupons;
pub mod credits;
pub mod entitlements;
pub mod domain_checkout;
pub mod guarded_policy_enrollment;
mod hosted_checkout;
pub mod native_store;
pub mod native_store_notifications;
pub mod payments;
pub mod paywall;
pub mod products;
pub mod program_access;
pub(crate) mod program_pricing;
pub mod purchases;
pub mod refunds;
pub mod stats;
pub mod stripe_session;
pub mod subscription_entitlements;
pub mod subscription_selection;
pub mod subscription_session;
pub(crate) mod subscription_store;
pub mod subscriptions;
pub mod webhooks;
pub mod x402;
pub(crate) mod x402_payment_store;

#[cfg(test)]
#[path = "checkout_guarded_tests.rs"]
mod checkout_guarded_tests;

#[cfg(test)]
#[path = "subscription_guarded_tests.rs"]
mod subscription_guarded_tests;

use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::RouteRequest;
use crate::seams::HostSeams;

/// Matches the request path against a namespace-relative path, tolerant of the
/// host mounting the route under `/extensions/{id}` (so a full or relative path
/// both match). Combined with the method, this selects an operation within a
/// route group that shares one `route-id`.
pub fn matches(req: &RouteRequest, method: &str, rel_path: &str) -> bool {
    req.method.eq_ignore_ascii_case(method)
        && (req.path == rel_path || req.path.ends_with(rel_path))
}

/// Relying-party (extension-to-extension) authentication for the credits /
/// payments contract: a bearer token compared in constant time against the
/// configured shared secret. Fails closed when the secret is unset — the
/// contract is dormant until the operator provisions it (audit §10.3: migrate to
/// a host-issued service identity when available).
pub fn verify_relying_party<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<()> {
    let configured = seams
        .secret_get(ids::SECRET_RP_TOKEN)?
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::forbidden("relying-party access is not configured"))?;
    let presented = req.bearer_token().unwrap_or("");
    if constant_time_eq(presented.as_bytes(), configured.as_bytes()) {
        Ok(())
    } else {
        Err(AppError::unauthorized("invalid relying-party credentials"))
    }
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b) {
        diff |= x ^ y;
    }
    diff == 0
}

pub(crate) mod stripe_refund_identity;
