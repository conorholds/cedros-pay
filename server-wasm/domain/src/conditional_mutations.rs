//! Activation policy for guarded database consumers.
//!
//! Route discovery is static. Runtime consumers that can mutate guarded money
//! state must prove the exact durable guarded-only marker before any other host
//! capability is used. Legacy one-time payment APIs are permanently retired and
//! cannot be revived by activating the guarded database contract.

use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum RoutePolicy {
    Unprotected,
    Guarded,
    Enrollment,
    Retired,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum JobPolicy {
    Unprotected,
    Guarded,
}

pub(crate) fn route_policy(route_id: &str) -> RoutePolicy {
    if is_retired(route_id) {
        RoutePolicy::Retired
    } else if route_id == crate::ids::ROUTE_GUARDED_POLICY_ENROLL {
        RoutePolicy::Enrollment
    } else if is_guarded_route(route_id) {
        RoutePolicy::Guarded
    } else {
        RoutePolicy::Unprotected
    }
}

pub(crate) fn job_policy(job_id: &str) -> JobPolicy {
    use crate::ids;
    if matches!(
        job_id,
        ids::JOB_CLEANUP
            | ids::JOB_WEBHOOK_DELIVERY
            | ids::JOB_CATALOG_SYNC
            | ids::JOB_SUBSCRIPTION_SYNC
            | ids::JOB_X402_RECONCILE
    ) {
        JobPolicy::Guarded
    } else {
        JobPolicy::Unprotected
    }
}

pub(crate) fn route_discoverable(route_id: &str) -> bool {
    route_policy(route_id) != RoutePolicy::Retired
}

pub(crate) fn require_route<S: HostSeams>(seams: &S, route_id: &str) -> AppResult<()> {
    match route_policy(route_id) {
        RoutePolicy::Retired => Err(AppError::not_found(format!(
            "no handler for route id {route_id}"
        ))),
        RoutePolicy::Guarded => crate::guarded_policy::require_active(seams).map(drop),
        RoutePolicy::Enrollment | RoutePolicy::Unprotected => Ok(()),
    }
}

pub(crate) fn require_job<S: HostSeams>(seams: &S, job_id: &str) -> AppResult<()> {
    match job_policy(job_id) {
        JobPolicy::Guarded => crate::guarded_policy::require_active(seams).map(drop),
        JobPolicy::Unprotected => Ok(()),
    }
}

fn is_retired(route_id: &str) -> bool {
    use crate::ids;
    matches!(
        route_id,
        ids::ROUTE_PAYWALL
            | ids::ROUTE_STRIPE_SESSION
            | ids::ROUTE_CART_QUOTE
            | ids::ROUTE_CART_GET
            | ids::ROUTE_CART_CHECKOUT
            | ids::ROUTE_DERIVE_TOKEN_ACCOUNT
            | ids::ROUTE_BLOCKHASH
            | ids::ROUTE_QUOTE
            | ids::ROUTE_VERIFY
            | ids::ROUTE_CREDITS_GRANT
            | ids::ROUTE_CREDITS_AUTHORIZE
            | ids::ROUTE_CREDITS_HOLD
            | ids::ROUTE_CREDITS_RELEASE
            | ids::ROUTE_CART_CREDITS_AUTHORIZE
    )
}

fn is_guarded_route(route_id: &str) -> bool {
    if route_id == crate::routes::domain_checkout::ROUTE
        || route_id.starts_with("cedros-pay:ucp-checkout-")
        || route_id.starts_with("cedros-pay:ucp-handoff")
    {
        return true;
    }
    use crate::ids;
    matches!(
        route_id,
        ids::ROUTE_WEBHOOKS
            | ids::ROUTE_ASSISTANT_X402_PURCHASE
            | ids::ROUTE_ACCESS_PASS_OFFER_RESOLVE
            | ids::ROUTE_ACCESS_PASS_PURCHASE
            | ids::ROUTE_ACCESS_PASS_AUTHORIZE
            | ids::ROUTE_ADMIN_ACCESS_PASS_OFFER_UPSERT
            | ids::ROUTE_ADMIN_ACCESS_PASS_OFFER_STATE
            | ids::ROUTE_ADMIN_ACCESS_PASS_REVOKE
            | ids::ROUTE_CHECKOUT_DESCRIPTOR
            | ids::ROUTE_CHECKOUT_QUOTE
            | ids::ROUTE_CHECKOUT_CREATE
            | ids::ROUTE_CHECKOUT_STATUS
            | ids::ROUTE_CHECKOUT_RESOLVE
            | ids::ROUTE_CHECKOUT_RETURN_VERIFY
            | ids::ROUTE_VERSIONED_CART_OPEN
            | ids::ROUTE_VERSIONED_CART_READ
            | ids::ROUTE_VERSIONED_CART_ROTATE
            | ids::ROUTE_VERSIONED_CART_APPLY
            | ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT
            | ids::ROUTE_ADMIN_CATALOG_PRODUCT_ACTIVE_SET
            | ids::ROUTE_ADMIN_CATALOG_PRODUCT_DELETE
            | ids::ROUTE_ADMIN_CATALOG_PRICE_UPSERT
            | ids::ROUTE_ADMIN_CATALOG_STRIPE_SYNC
            | ids::ROUTE_ADMIN_CATALOG_STRIPE_TAX_CODE_SET
            | ids::ROUTE_ADMIN_PROGRAM_ENTITLEMENT_UPSERT
            | ids::ROUTE_ADMIN_PROGRAM_INVITE_UPSERT
            | ids::ROUTE_ADMIN_PROGRAM_MEMBERSHIP_UPSERT
            | ids::ROUTE_PROGRAM_ACTIVATE
            | ids::ROUTE_SUBSCRIPTION_STRIPE_SESSION
            | ids::ROUTE_SUBSCRIPTION_FREE_SELECTION
            | ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION
            | ids::ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_COLLECT_INITIAL
            | ids::ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_ACTIVATE
            | ids::ROUTE_REFUNDS_REQUEST
            | ids::ROUTE_NATIVE_STORE_VERIFY
            | ids::ROUTE_NATIVE_STORE_APPLE_NOTIFICATION
            | ids::ROUTE_NATIVE_STORE_GOOGLE_NOTIFICATION
            | ids::ROUTE_ADMIN_CREDIT_REFUNDS_PROCESS
            | ids::ROUTE_ADMIN_REFUNDS_PROCESS
            | ids::ROUTE_ADMIN_REFUNDS_DENY
            | ids::ROUTE_ADMIN_STRIPE_REFUNDS_PROCESS
            | ids::ROUTE_SUBSCRIPTIONS_CREATE
            | ids::ROUTE_SUBSCRIPTIONS_CANCEL
            | ids::ROUTE_SUBSCRIPTIONS_PORTAL
            | ids::ROUTE_BUYER_SUBSCRIPTION_CANCEL
            | ids::ROUTE_BUYER_SUBSCRIPTION_PORTAL
            | ids::ROUTE_PRODUCT_CREATE
            | ids::ROUTE_ADMIN_PRODUCTS_CREATE
            | ids::ROUTE_ADMIN_PRODUCTS_UPDATE
            | ids::ROUTE_ADMIN_PRODUCTS_DELETE
            | ids::ROUTE_ADMIN_PRODUCTS_STRIPE_IMPORT
            | ids::ROUTE_ADMIN_PRODUCTS_STRIPE_SYNC
            | ids::ROUTE_ADMIN_PRODUCT_INVENTORY_SET
            | ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUST
            | ids::ROUTE_ADMIN_PRODUCT_VARIATIONS_UPDATE
            | ids::ROUTE_ADMIN_PRODUCT_VARIANT_INVENTORY_UPDATE
            | ids::ROUTE_ADMIN_COUPONS_CREATE
            | ids::ROUTE_ADMIN_COUPONS_UPDATE
            | ids::ROUTE_ADMIN_COUPONS_DELETE
            | ids::ROUTE_ADMIN_RETURNS_CREATE
            | ids::ROUTE_ADMIN_RETURNS_STATUS_UPDATE
            | ids::ROUTE_ADMIN_DISPUTES_STATUS_UPDATE
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ids;

    #[test]
    fn retired_and_enrollment_routes_are_explicit() {
        assert_eq!(route_policy(ids::ROUTE_PAYWALL), RoutePolicy::Retired);
        assert!(!route_discoverable(ids::ROUTE_VERIFY));
        assert_eq!(
            route_policy(ids::ROUTE_GUARDED_POLICY_ENROLL),
            RoutePolicy::Enrollment
        );
    }

    #[test]
    fn guarded_consumers_are_not_a_global_enable_switch() {
        assert_eq!(route_policy(ids::ROUTE_WEBHOOKS), RoutePolicy::Guarded);
        for route_id in [
            ids::ROUTE_CHECKOUT_DESCRIPTOR,
            ids::ROUTE_CHECKOUT_QUOTE,
            ids::ROUTE_CHECKOUT_CREATE,
            ids::ROUTE_CHECKOUT_STATUS,
            ids::ROUTE_CHECKOUT_RESOLVE,
            ids::ROUTE_CHECKOUT_RETURN_VERIFY,
            ids::ROUTE_VERSIONED_CART_OPEN,
            ids::ROUTE_VERSIONED_CART_READ,
            ids::ROUTE_VERSIONED_CART_ROTATE,
            ids::ROUTE_VERSIONED_CART_APPLY,
            ids::ROUTE_PRODUCT_CREATE,
            ids::ROUTE_ADMIN_PRODUCTS_CREATE,
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT,
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_ACTIVE_SET,
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_DELETE,
            ids::ROUTE_ADMIN_CATALOG_PRICE_UPSERT,
            ids::ROUTE_ADMIN_CATALOG_STRIPE_SYNC,
            ids::ROUTE_ADMIN_CATALOG_STRIPE_TAX_CODE_SET,
            ids::ROUTE_ADMIN_PROGRAM_ENTITLEMENT_UPSERT,
            ids::ROUTE_ADMIN_PROGRAM_INVITE_UPSERT,
            ids::ROUTE_ADMIN_PROGRAM_MEMBERSHIP_UPSERT,
            ids::ROUTE_PROGRAM_ACTIVATE,
            ids::ROUTE_ADMIN_PRODUCTS_UPDATE,
            ids::ROUTE_ADMIN_PRODUCTS_DELETE,
            ids::ROUTE_ADMIN_PRODUCTS_STRIPE_IMPORT,
            ids::ROUTE_ADMIN_PRODUCTS_STRIPE_SYNC,
            ids::ROUTE_ADMIN_PRODUCT_INVENTORY_SET,
            ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUST,
            ids::ROUTE_ADMIN_PRODUCT_VARIATIONS_UPDATE,
            ids::ROUTE_ADMIN_PRODUCT_VARIANT_INVENTORY_UPDATE,
            ids::ROUTE_ADMIN_COUPONS_CREATE,
            ids::ROUTE_ADMIN_COUPONS_UPDATE,
            ids::ROUTE_ADMIN_COUPONS_DELETE,
            ids::ROUTE_ADMIN_RETURNS_CREATE,
            ids::ROUTE_ADMIN_RETURNS_STATUS_UPDATE,
            ids::ROUTE_ADMIN_DISPUTES_STATUS_UPDATE,
        ] {
            assert_eq!(route_policy(route_id), RoutePolicy::Guarded, "{route_id}");
        }
        assert_eq!(
            route_policy(ids::ROUTE_CREDITS_BALANCE),
            RoutePolicy::Unprotected
        );
        assert_eq!(job_policy(ids::JOB_CLEANUP), JobPolicy::Guarded);
        assert_eq!(job_policy(ids::JOB_HEALTH_CHECK), JobPolicy::Unprotected);
    }
}
