use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::routes;
use crate::seams::HostSeams;

pub(super) fn dispatch<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    if crate::capacity::ROUTES
        .iter()
        .any(|r| r.route_id == req.route_id)
    {
        return Ok(crate::capacity::handle(seams, req));
    }
    crate::conditional_mutations::require_route(seams, &req.route_id)?;
    crate::native_storefront_policy::require_request(seams, req)?;
    if crate::ucp::ROUTES
        .iter()
        .any(|r| r.route_id == req.route_id)
    {
        return crate::ucp::handle(seams, req);
    }
    if crate::commerce_orders::ROUTES
        .iter()
        .any(|route| route.route_id == req.route_id)
    {
        return crate::commerce_orders::handle(seams, req);
    }
    if routes::products::ROUTES
        .iter()
        .any(|route| route.route_id == req.route_id)
    {
        return routes::products::handle(seams, req);
    }
    if routes::admin_shipping_tax::ROUTES
        .iter()
        .any(|route| route.route_id == req.route_id)
    {
        return routes::admin_shipping_tax::handle(seams, req);
    }
    if let Some(result) = core(seams, req) {
        return result;
    }
    if let Some(result) = commerce(seams, req) {
        return result;
    }
    if let Some(result) = admin_dashboard(seams, req) {
        return result;
    }
    if let Some(result) = admin_settings(seams, req) {
        return result;
    }
    Err(AppError::not_found(format!(
        "no handler for route id {}",
        req.route_id
    )))
}

fn core<S: HostSeams>(seams: &S, req: &RouteRequest) -> Option<AppResult<RouteResponse>> {
    Some(match req.route_id.as_str() {
        routes::domain_checkout::ROUTE => routes::domain_checkout::handle(seams, req),
        ids::ROUTE_STATS => routes::stats::handle(seams, req),
        ids::ROUTE_WEBHOOKS => routes::webhooks::handle(seams, req),
        ids::ROUTE_CREDITS_BALANCE
        | ids::ROUTE_CREDITS_GRANT
        | ids::ROUTE_CREDITS_AUTHORIZE
        | ids::ROUTE_CREDITS_HOLD
        | ids::ROUTE_CREDITS_RELEASE => routes::credits::handle(seams, req),
        ids::ROUTE_ENTITLEMENTS => routes::entitlements::handle(seams, req),
        ids::ROUTE_PROGRAM_ACTIVATE | ids::ROUTE_PROGRAM_STATUS => {
            routes::program_access::handle(seams, req)
        }
        ids::ROUTE_GUARDED_POLICY_ENROLL => routes::guarded_policy_enrollment::handle(seams, req),
        ids::ROUTE_CHECKOUT_DESCRIPTOR
        | ids::ROUTE_CHECKOUT_QUOTE
        | ids::ROUTE_CHECKOUT_CREATE
        | ids::ROUTE_CHECKOUT_STATUS
        | ids::ROUTE_CHECKOUT_RESOLVE
        | ids::ROUTE_CHECKOUT_RETURN_VERIFY => routes::canonical_checkout::handle(seams, req),
        ids::ROUTE_ASSISTANT_X402_PURCHASE => routes::assistant_x402::handle(seams, req),
        ids::ROUTE_ACCESS_PASS_OFFER_RESOLVE
        | ids::ROUTE_ACCESS_PASS_PURCHASE
        | ids::ROUTE_ACCESS_PASS_AUTHORIZE
        | ids::ROUTE_ADMIN_ACCESS_PASS_OFFER_UPSERT
        | ids::ROUTE_ADMIN_ACCESS_PASS_OFFER_STATE
        | ids::ROUTE_ADMIN_ACCESS_PASS_REVOKE => routes::access_pass::handle(seams, req),
        ids::ROUTE_VERSIONED_CART_OPEN
        | ids::ROUTE_VERSIONED_CART_READ
        | ids::ROUTE_VERSIONED_CART_ROTATE
        | ids::ROUTE_VERSIONED_CART_APPLY => crate::versioned_cart::handle_route(seams, req),
        ids::ROUTE_PAYMENTS => routes::payments::handle(seams, req),
        ids::ROUTE_PAYWALL => routes::paywall::handle(seams, req),
        ids::ROUTE_STRIPE_SESSION => routes::stripe_session::handle(seams, req),
        ids::ROUTE_SUBSCRIPTION_STRIPE_SESSION => routes::subscription_session::handle(seams, req),
        ids::ROUTE_SUBSCRIPTION_SELECTION_STATUS
        | ids::ROUTE_SUBSCRIPTION_PLANS
        | ids::ROUTE_SUBSCRIPTION_FREE_SELECTION
        | ids::ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION
        | ids::ROUTE_SUBSCRIPTION_PLAN_SOLANA_SUBSCRIPTION
        | ids::ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_COLLECT_INITIAL
        | ids::ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_ACTIVATE => {
            routes::subscription_selection::handle(seams, req)
        }
        ids::ROUTE_SUBSCRIPTION_ENTITLEMENTS => {
            routes::subscription_entitlements::handle(seams, req)
        }
        ids::ROUTE_DERIVE_TOKEN_ACCOUNT
        | ids::ROUTE_BLOCKHASH
        | ids::ROUTE_QUOTE
        | ids::ROUTE_VERIFY => routes::x402::handle(seams, req),
        ids::ROUTE_COMPLIANCE_CHECK => routes::compliance_check::handle(seams, req),
        _ => return None,
    })
}

fn commerce<S: HostSeams>(seams: &S, req: &RouteRequest) -> Option<AppResult<RouteResponse>> {
    Some(match req.route_id.as_str() {
        ids::ROUTE_CART_QUOTE | ids::ROUTE_CART_GET => routes::cart::handle(seams, req),
        ids::ROUTE_CART_CREDITS_AUTHORIZE => routes::cart_credits::handle(seams, req),
        ids::ROUTE_CART_CHECKOUT => routes::cart_checkout::handle(seams, req),
        ids::ROUTE_NATIVE_STORE_VERIFY => routes::native_store::handle(seams, req),
        ids::ROUTE_NATIVE_STORE_APPLE_NOTIFICATION
        | ids::ROUTE_NATIVE_STORE_GOOGLE_NOTIFICATION => {
            routes::native_store_notifications::handle(seams, req)
        }
        ids::ROUTE_PURCHASES => routes::purchases::handle(seams, req),
        ids::ROUTE_REFUNDS_REQUEST
        | ids::ROUTE_REFUNDS_GET
        | ids::ROUTE_ADMIN_REFUNDS_PROCESS
        | ids::ROUTE_ADMIN_REFUNDS_DENY => routes::refunds::handle(seams, req),
        ids::ROUTE_PRODUCT_RAG_RECORDS | ids::ROUTE_PRODUCT_READ | ids::ROUTE_PRODUCT_CREATE => {
            routes::products::handle(seams, req)
        }
        ids::ROUTE_SUBSCRIPTIONS_STATUS
        | ids::ROUTE_SUBSCRIPTIONS_CREATE
        | ids::ROUTE_SUBSCRIPTIONS_CANCEL
        | ids::ROUTE_SUBSCRIPTIONS_PORTAL
        | ids::ROUTE_BUYER_SUBSCRIPTION_CANCEL
        | ids::ROUTE_BUYER_SUBSCRIPTION_PORTAL => routes::subscriptions::handle(seams, req),
        ids::ROUTE_ADMIN => routes::admin::handle(seams, req),
        ids::ROUTE_ADMIN_AFFILIATE_PAYOUTS_SETTLE => {
            routes::admin_affiliate_payouts::handle(seams, req)
        }
        _ => return None,
    })
}

fn admin_dashboard<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
) -> Option<AppResult<RouteResponse>> {
    Some(match req.route_id.as_str() {
        ids::ROUTE_ADMIN_STATS
        | ids::ROUTE_ADMIN_COMMERCE_ANALYTICS
        | ids::ROUTE_ADMIN_COMMERCE_ANALYTICS_RECOVER
        | ids::ROUTE_ADMIN_TRANSACTIONS_LIST
        | ids::ROUTE_ADMIN_ORDERS_LIST
        | ids::ROUTE_ADMIN_ORDERS_GET
        | ids::ROUTE_ADMIN_RETURNS_LIST
        | ids::ROUTE_ADMIN_RETURNS_CREATE
        | ids::ROUTE_ADMIN_RETURNS_GET
        | ids::ROUTE_ADMIN_RETURNS_STATUS_UPDATE
        | ids::ROUTE_ADMIN_DISPUTES_LIST
        | ids::ROUTE_ADMIN_DISPUTES_GET
        | ids::ROUTE_ADMIN_DISPUTES_STATUS_UPDATE
        | ids::ROUTE_ADMIN_CATALOG_READINESS
        | ids::ROUTE_ADMIN_CATALOG_EXPORT
        | ids::ROUTE_ADMIN_CATALOG_EXPORT_VALIDATE
        | ids::ROUTE_ADMIN_CATALOG_RECORDS_QUERY
        | ids::ROUTE_ADMIN_CAPACITY_READ
        | ids::ROUTE_ADMIN_CAPACITY_CONFIGURE
        | ids::ROUTE_ADMIN_CAPACITY_ENROLL
        | ids::ROUTE_ADMIN_CAPACITY_ACTIVATE
        | ids::ROUTE_ADMIN_CAPACITY_COUPON_ENSURE
        | ids::ROUTE_ADMIN_CAPACITY_ACTIVATION_STATUS
        | ids::ROUTE_ADMIN_CAPACITY_TAX_READINESS
        | ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT
        | ids::ROUTE_ADMIN_CATALOG_PRODUCT_ACTIVE_SET
        | ids::ROUTE_ADMIN_CATALOG_PRODUCT_DELETE
        | ids::ROUTE_ADMIN_CATALOG_PRICE_UPSERT
        | ids::ROUTE_ADMIN_CATALOG_STRIPE_SYNC
        | ids::ROUTE_ADMIN_CATALOG_STRIPE_TAX_CODE_SET
        | ids::ROUTE_ADMIN_PROGRAM_ENTITLEMENT_UPSERT
        | ids::ROUTE_ADMIN_PROGRAM_INVITE_UPSERT
        | ids::ROUTE_ADMIN_PROGRAM_MEMBERSHIP_UPSERT
        | ids::ROUTE_ADMIN_PRODUCTS_LIST
        | ids::ROUTE_ADMIN_PRODUCTS_CREATE
        | ids::ROUTE_ADMIN_PRODUCTS_GET
        | ids::ROUTE_ADMIN_PRODUCTS_UPDATE
        | ids::ROUTE_ADMIN_PRODUCTS_DELETE
        | ids::ROUTE_ADMIN_PRODUCTS_STRIPE_IMPORT_PREVIEW
        | ids::ROUTE_ADMIN_PRODUCTS_STRIPE_IMPORT
        | ids::ROUTE_ADMIN_PRODUCTS_STRIPE_SYNC
        | ids::ROUTE_ADMIN_PRODUCT_INVENTORY_SET
        | ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUST
        | ids::ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUSTMENTS
        | ids::ROUTE_ADMIN_PRODUCT_VARIATIONS_GET
        | ids::ROUTE_ADMIN_PRODUCT_VARIATIONS_UPDATE
        | ids::ROUTE_ADMIN_PRODUCT_VARIANT_INVENTORY_UPDATE
        | ids::ROUTE_ADMIN_COUPONS_LIST
        | ids::ROUTE_ADMIN_COUPONS_CREATE
        | ids::ROUTE_ADMIN_COUPONS_UPDATE
        | ids::ROUTE_ADMIN_COUPONS_DELETE
        | ids::ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_GET
        | ids::ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_UPDATE
        | ids::ROUTE_ADMIN_REFUNDS_LIST
        | ids::ROUTE_ADMIN_CREDIT_REFUND_REQUESTS_LIST
        | ids::ROUTE_ADMIN_CREDIT_REFUNDS_PROCESS
        | ids::ROUTE_ADMIN_STRIPE_REFUNDS_LIST
        | ids::ROUTE_ADMIN_STRIPE_REFUNDS_PROCESS => routes::admin_dashboard::handle(seams, req),
        _ => return None,
    })
}

fn admin_settings<S: HostSeams>(seams: &S, req: &RouteRequest) -> Option<AppResult<RouteResponse>> {
    Some(match req.route_id.as_str() {
        ids::ROUTE_ADMIN_CONFIG_LIST
        | ids::ROUTE_ADMIN_CONFIG_HISTORY
        | ids::ROUTE_ADMIN_CONFIG_VALIDATE
        | ids::ROUTE_ADMIN_CONFIG_STRIPE_GET
        | ids::ROUTE_ADMIN_CONFIG_STRIPE_UPDATE
        | ids::ROUTE_ADMIN_CONFIG_X402_GET
        | ids::ROUTE_ADMIN_CONFIG_X402_UPDATE
        | ids::ROUTE_ADMIN_CONFIG_CEDROS_LOGIN_GET
        | ids::ROUTE_ADMIN_CONFIG_CEDROS_LOGIN_UPDATE
        | ids::ROUTE_ADMIN_CONFIG_NATIVE_STORE_GET
        | ids::ROUTE_ADMIN_CONFIG_NATIVE_STORE_UPDATE
        | ids::ROUTE_ADMIN_CONFIG_SHOP_GET
        | ids::ROUTE_ADMIN_CONFIG_SHOP_UPDATE
        | ids::ROUTE_ADMIN_CONFIG_SUBSCRIPTIONS_GET
        | ids::ROUTE_ADMIN_CONFIG_SUBSCRIPTIONS_UPDATE => routes::admin_config::handle(seams, req),
        ids::ROUTE_ADMIN_SHIPPING_PROFILES_LIST
        | ids::ROUTE_ADMIN_SHIPPING_PROFILES_CREATE
        | ids::ROUTE_ADMIN_SHIPPING_PROFILES_GET
        | ids::ROUTE_ADMIN_SHIPPING_PROFILES_UPDATE
        | ids::ROUTE_ADMIN_SHIPPING_PROFILES_DELETE
        | ids::ROUTE_ADMIN_SHIPPING_RATES_LIST
        | ids::ROUTE_ADMIN_SHIPPING_RATES_CREATE
        | ids::ROUTE_ADMIN_SHIPPING_RATES_UPDATE
        | ids::ROUTE_ADMIN_SHIPPING_RATES_DELETE
        | ids::ROUTE_ADMIN_TAX_RATES_LIST
        | ids::ROUTE_ADMIN_TAX_RATES_CREATE
        | ids::ROUTE_ADMIN_TAX_RATES_GET
        | ids::ROUTE_ADMIN_TAX_RATES_UPDATE
        | ids::ROUTE_ADMIN_TAX_RATES_DELETE => routes::admin_shipping_tax::handle(seams, req),
        ids::ROUTE_ADMIN_SITE_SETTINGS_TIPPING_GET
        | ids::ROUTE_ADMIN_SITE_SETTINGS_TIPPING_UPDATE
        | ids::ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_GET
        | ids::ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_UPDATE => {
            routes::admin_site_settings::handle(seams, req)
        }
        _ => return None,
    })
}
