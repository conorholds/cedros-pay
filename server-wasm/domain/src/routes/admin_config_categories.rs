use crate::error::{AppError, AppResult};
use crate::ids;

#[derive(Clone, Copy)]
pub(super) struct CategorySpec {
    pub(super) category: &'static str,
    pub(super) label: &'static str,
    pub(super) get_route: &'static str,
    pub(super) update_route: &'static str,
    pub(super) default_keys: &'static [&'static str],
    pub(super) secret_keys: &'static [&'static str],
}

const STRIPE_KEYS: &[&str] = &[
    "enabled",
    "secret_key",
    "webhook_token",
    "publishable_key",
    "success_url",
    "cancel_url",
    "allowed_redirect_schemes",
    "mode",
];
const NATIVE_STORE_KEYS: &[&str] = &[
    "enabled",
    "apple_enabled",
    "apple_issuer_id",
    "apple_key_id",
    "apple_private_key",
    "apple_bundle_id",
    "apple_allow_sandbox_fallback",
    "google_enabled",
    "google_service_account_email",
    "google_private_key",
    "google_package_name",
    "google_push_service_account_email",
    "google_push_audience",
];
const X402_KEYS: &[&str] = &[
    "enabled",
    "payment_address",
    "token_mint",
    "token_symbol",
    "token_decimals",
    "network",
    "memo_prefix",
    "skip_preflight",
    "commitment",
    "gasless_enabled",
    "auto_create_token_account",
    "allowed_tokens",
    "compute_unit_limit",
    "compute_unit_price_micro_lamports",
    "rounding_mode",
];
const CEDROS_LOGIN_KEYS: &[&str] = &[
    "enabled",
    "credits_enabled",
    "base_url",
    "api_key",
    "timeout",
    "jwt_issuer",
    "jwt_audience",
];
const SHOP_KEYS: &[&str] = &[
    "guest_checkout",
    "refunds_enabled",
    "returns_enabled",
    "inventory_enabled",
    "coupons_enabled",
    "shipping_enabled",
    "taxes_enabled",
    "regional_payment_policy",
];
const SUBSCRIPTION_KEYS: &[&str] = &[
    "capacity_v1",
    "enabled",
    "grace_period_hours",
    "solana_collection_enabled",
    "solana_collection_interval_seconds",
    "solana_collection_batch_limit",
];

pub(super) const CATEGORIES: &[CategorySpec] = &[
    CategorySpec {
        category: "stripe",
        label: "Stripe",
        get_route: ids::ROUTE_ADMIN_CONFIG_STRIPE_GET,
        update_route: ids::ROUTE_ADMIN_CONFIG_STRIPE_UPDATE,
        default_keys: STRIPE_KEYS,
        secret_keys: &["secret_key", "webhook_token"],
    },
    CategorySpec {
        category: "x402",
        label: "X402",
        get_route: ids::ROUTE_ADMIN_CONFIG_X402_GET,
        update_route: ids::ROUTE_ADMIN_CONFIG_X402_UPDATE,
        default_keys: X402_KEYS,
        secret_keys: &[],
    },
    CategorySpec {
        category: "cedros_login",
        label: "Cedros Login",
        get_route: ids::ROUTE_ADMIN_CONFIG_CEDROS_LOGIN_GET,
        update_route: ids::ROUTE_ADMIN_CONFIG_CEDROS_LOGIN_UPDATE,
        default_keys: CEDROS_LOGIN_KEYS,
        secret_keys: &["api_key"],
    },
    CategorySpec {
        category: "native_store",
        label: "App Stores",
        get_route: ids::ROUTE_ADMIN_CONFIG_NATIVE_STORE_GET,
        update_route: ids::ROUTE_ADMIN_CONFIG_NATIVE_STORE_UPDATE,
        default_keys: NATIVE_STORE_KEYS,
        secret_keys: &["apple_private_key", "google_private_key"],
    },
    CategorySpec {
        category: "shop",
        label: "Shop",
        get_route: ids::ROUTE_ADMIN_CONFIG_SHOP_GET,
        update_route: ids::ROUTE_ADMIN_CONFIG_SHOP_UPDATE,
        default_keys: SHOP_KEYS,
        secret_keys: &[],
    },
    CategorySpec {
        category: "subscriptions",
        label: "Subscriptions",
        get_route: ids::ROUTE_ADMIN_CONFIG_SUBSCRIPTIONS_GET,
        update_route: ids::ROUTE_ADMIN_CONFIG_SUBSCRIPTIONS_UPDATE,
        default_keys: SUBSCRIPTION_KEYS,
        secret_keys: &[],
    },
];

pub(super) fn category_spec(category: &str) -> AppResult<CategorySpec> {
    CATEGORIES
        .iter()
        .copied()
        .find(|spec| spec.category == category)
        .ok_or_else(|| AppError::forbidden("Cedros Pay does not own this settings category"))
}

pub(super) fn get_category_route(route_id: &str) -> Option<CategorySpec> {
    CATEGORIES
        .iter()
        .copied()
        .find(|spec| spec.get_route == route_id)
}

pub(super) fn update_category_route(route_id: &str) -> Option<CategorySpec> {
    CATEGORIES
        .iter()
        .copied()
        .find(|spec| spec.update_route == route_id)
}
