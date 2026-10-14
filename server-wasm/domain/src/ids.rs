//! Stable identifiers shared between the runtime and the manifest.
//!
//! Every `ROUTE_*` must appear in `surfaces.server.routes[]`, every `JOB_*` in
//! `surfaces.server.jobs[]`, every `MODEL_*` in the `databaseAccess[]` content
//! models, every `TAG_*` in `customerTagAccess[].managedTagSlugs`, and every
//! `EVENT_*` in `surfaces.server.events[]` — or the host rejects the call. The
//! manifest is generated from `server-rust/src/extension_family/`; keep both in
//! lockstep (see the realignment audit §6).

// ── database ────────────────────────────────────────────────────────────────
pub const DB_ACCESS: &str = "cedros-pay:store-db";
pub const CONFIG_DB_ACCESS: &str = "cedros-pay:configuration-db";
pub const CACHE_DB_ACCESS: &str = "cedros-pay:cache-db";
pub const MODEL_CONFIG_AUDIT: &str = "cedros-pay:settings-audit-records";
pub const MODEL_LEDGER: &str = "cedros-pay:commerce-ledger";
pub const MODEL_CATALOG: &str = "cedros-pay:catalog";
pub const MODEL_CATALOG_FENCE: &str = "cedros-pay:catalog-fence";
pub const MODEL_PROGRAM_ACCESS: &str = "cedros-pay:program-access";
pub const MODEL_CREDITS: &str = "cedros-pay:credits";
pub const MODEL_ROLLUP: &str = "cedros-pay:stats-rollup";
pub const MODEL_WEBHOOK_OUTBOX: &str = "cedros-pay:webhook-outbox";
pub const MODEL_SUBSCRIPTIONS: &str = "cedros-pay:subscriptions";
/// Stateful multi-item cart quotes (key = `cart_<32 hex>`). Stores the
/// server-computed price snapshot so `/verify` settles against the quoted total.
pub const MODEL_CART: &str = "cedros-pay:cart";
/// Compliance assets (sanctions lists etc.), key `sanctions-list`. Already declared
/// in `databaseAccess`/`contentModels`; read by the pre-flight compliance gate.
pub const MODEL_COMPLIANCE: &str = "cedros-pay:compliance-assets";
/// Internal durable state for high-level Assistant actions. Assistant x402
/// records are never returned through a public read route.
pub const MODEL_SUPPORT_AI: &str = "cedros-pay:support-ai";
/// Immutable access-pass offers, purchase snapshots, and replay nonces.
pub const MODEL_ACCESS_PASSES: &str = "cedros-pay:access-passes";

// ── routes (surfaces.server.routes[]) ─────────────────────────────────────────
// The host binds one route id per (method, path): each id backs exactly one
// endpoint and `GET`/`POST` on the same path are distinct ids (see the host's
// `register_route_binding`). Route groups that serve several paths (credits,
// subscriptions) therefore declare one id per endpoint, all dispatched to the
// same handler in `router::dispatch`.
pub const ROUTE_STATS: &str = "cedros-pay:stats";
pub const ROUTE_WEBHOOKS: &str = "cedros-pay:webhooks";
pub const ROUTE_CREDITS_BALANCE: &str = "cedros-pay:credits-balance";
pub const ROUTE_CREDITS_GRANT: &str = "cedros-pay:credits-grant";
pub const ROUTE_CREDITS_AUTHORIZE: &str = "cedros-pay:credits-authorize";
pub const ROUTE_CREDITS_HOLD: &str = "cedros-pay:credits-hold";
pub const ROUTE_CREDITS_RELEASE: &str = "cedros-pay:credits-release";
pub const ROUTE_PAYMENTS: &str = "cedros-pay:payments";
pub const ROUTE_PAYWALL: &str = "cedros-pay:paywall";
pub const ROUTE_STRIPE_SESSION: &str = "cedros-pay:stripe-session";
pub const ROUTE_SUBSCRIPTION_STRIPE_SESSION: &str = "cedros-pay:subscription-stripe-session";
pub const ROUTE_SUBSCRIPTION_SELECTION_STATUS: &str = "cedros-pay:subscription-selection-status";
pub const ROUTE_SUBSCRIPTION_PLANS: &str = "cedros-pay:subscription-plans";
pub const ROUTE_SUBSCRIPTION_FREE_SELECTION: &str = "cedros-pay:subscription-free-selection";
pub const ROUTE_SUBSCRIPTION_PLAN_STRIPE_SESSION: &str =
    "cedros-pay:subscription-plan-stripe-session";
pub const ROUTE_SUBSCRIPTION_PLAN_SOLANA_SUBSCRIPTION: &str =
    "cedros-pay:subscription-plan-solana-subscription";
pub const ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_ACTIVATE: &str =
    "cedros-pay:subscription-solana-subscription-activate";
pub const ROUTE_SUBSCRIPTION_SOLANA_SUBSCRIPTION_COLLECT_INITIAL: &str =
    "cedros-pay:subscription-solana-subscription-collect-initial";
pub const ROUTE_CHECKOUT: &str = "cedros-pay:checkout";
pub const ROUTE_DERIVE_TOKEN_ACCOUNT: &str = "cedros-pay:derive-token-account";
pub const ROUTE_BLOCKHASH: &str = "cedros-pay:blockhash";
pub const ROUTE_QUOTE: &str = "cedros-pay:quote";
pub const ROUTE_VERIFY: &str = "cedros-pay:verify";
pub const ROUTE_COMPLIANCE_CHECK: &str = "cedros-pay:compliance-check";
pub const ROUTE_REFUNDS_REQUEST: &str = "cedros-pay:refunds-request";
pub const ROUTE_REFUNDS_GET: &str = "cedros-pay:refunds-get";
pub const ROUTE_CART_QUOTE: &str = "cedros-pay:cart-quote";
pub const ROUTE_CART_GET: &str = "cedros-pay:cart-get";
pub const ROUTE_PURCHASES: &str = "cedros-pay:purchases";
pub const ROUTE_CART_CREDITS_AUTHORIZE: &str = "cedros-pay:cart-credits-authorize";
pub const ROUTE_CART_CHECKOUT: &str = "cedros-pay:cart-checkout";
pub const ROUTE_NATIVE_STORE_VERIFY: &str = "cedros-pay:native-store-verify";
pub const ROUTE_NATIVE_STORE_APPLE_NOTIFICATION: &str =
    "cedros-pay:native-store-apple-notification";
pub const ROUTE_NATIVE_STORE_GOOGLE_NOTIFICATION: &str =
    "cedros-pay:native-store-google-notification";
pub const ROUTE_PRODUCT_RAG_RECORDS: &str = "cedros-pay:product-rag-records";
pub const ROUTE_PRODUCT_READ: &str = "cedros-pay:product-read";
pub const ROUTE_PRODUCT_CREATE: &str = "cedros-pay:product-create";
pub const ROUTE_ENTITLEMENTS: &str = "cedros-pay:entitlements";
pub const ROUTE_SUBSCRIPTION_ENTITLEMENTS: &str = "cedros-pay:subscription-entitlements";
pub const ROUTE_SUBSCRIPTIONS_STATUS: &str = "cedros-pay:subscriptions-status";
pub const ROUTE_SUBSCRIPTIONS_CREATE: &str = "cedros-pay:subscriptions-create";
pub const ROUTE_SUBSCRIPTIONS_CANCEL: &str = "cedros-pay:subscriptions-cancel";
pub const ROUTE_SUBSCRIPTIONS_PORTAL: &str = "cedros-pay:subscriptions-portal";
pub const ROUTE_BUYER_SUBSCRIPTION_CANCEL: &str = "cedros-pay:buyer-subscription-cancel";
pub const ROUTE_BUYER_SUBSCRIPTION_PORTAL: &str = "cedros-pay:buyer-subscription-portal";
pub const ROUTE_ADMIN: &str = "cedros-pay:admin";
pub const ROUTE_GUARDED_POLICY_ENROLL: &str = "cedros-pay:guarded-policy-enroll";
pub const ROUTE_CHECKOUT_DESCRIPTOR: &str = "cedros-pay:checkout-descriptor";
pub const ROUTE_CHECKOUT_QUOTE: &str = "cedros-pay:checkout-quote";
pub const ROUTE_CHECKOUT_CREATE: &str = "cedros-pay:checkout-create";
pub const ROUTE_CHECKOUT_STATUS: &str = "cedros-pay:checkout-status";
pub const ROUTE_CHECKOUT_RESOLVE: &str = "cedros-pay:checkout-resolve";
pub const ROUTE_CHECKOUT_RETURN_VERIFY: &str = "cedros-pay:checkout-return-verify";
pub const ROUTE_ASSISTANT_X402_PURCHASE: &str = "cedros-pay:assistant-x402-purchase";
pub const ROUTE_ACCESS_PASS_OFFER_RESOLVE: &str = "cedros-pay:access-pass-offer-resolve";
pub const ROUTE_ACCESS_PASS_PURCHASE: &str = "cedros-pay:access-pass-purchase";
pub const ROUTE_ACCESS_PASS_AUTHORIZE: &str = "cedros-pay:access-pass-authorize";
pub const ROUTE_ADMIN_ACCESS_PASS_OFFER_UPSERT: &str = "cedros-pay:admin-access-pass-offer-upsert";
pub const ROUTE_ADMIN_ACCESS_PASS_OFFER_STATE: &str = "cedros-pay:admin-access-pass-offer-state";
pub const ROUTE_ADMIN_ACCESS_PASS_REVOKE: &str = "cedros-pay:admin-access-pass-revoke";
pub const ROUTE_VERSIONED_CART_OPEN: &str = "cedros-pay:versioned-cart-open";
pub const ROUTE_VERSIONED_CART_READ: &str = "cedros-pay:versioned-cart-read";
pub const ROUTE_VERSIONED_CART_ROTATE: &str = "cedros-pay:versioned-cart-rotate";
pub const ROUTE_VERSIONED_CART_APPLY: &str = "cedros-pay:versioned-cart-apply";
pub const ROUTE_ADMIN_STATS: &str = "cedros-pay:admin-stats";
pub const ROUTE_ADMIN_COMMERCE_ANALYTICS: &str = "cedros-pay:admin-commerce-analytics";
pub const ROUTE_ADMIN_COMMERCE_ANALYTICS_RECOVER: &str =
    "cedros-pay:admin-commerce-analytics-recover";
pub const ROUTE_ADMIN_TRANSACTIONS_LIST: &str = "cedros-pay:admin-transactions-list";
pub const ROUTE_ADMIN_ORDERS_LIST: &str = "cedros-pay:admin-orders-list";
pub const ROUTE_ADMIN_ORDERS_GET: &str = "cedros-pay:admin-orders-get";
pub const ROUTE_ADMIN_RETURNS_LIST: &str = "cedros-pay:admin-returns-list";
pub const ROUTE_ADMIN_RETURNS_CREATE: &str = "cedros-pay:admin-returns-create";
pub const ROUTE_ADMIN_RETURNS_GET: &str = "cedros-pay:admin-returns-get";
pub const ROUTE_ADMIN_RETURNS_STATUS_UPDATE: &str = "cedros-pay:admin-returns-status-update";
pub const ROUTE_ADMIN_DISPUTES_LIST: &str = "cedros-pay:admin-disputes-list";
pub const ROUTE_ADMIN_DISPUTES_GET: &str = "cedros-pay:admin-disputes-get";
pub const ROUTE_ADMIN_DISPUTES_STATUS_UPDATE: &str = "cedros-pay:admin-disputes-status-update";
pub const ROUTE_ADMIN_CATALOG_READINESS: &str = "cedros-pay:admin-catalog-readiness";
pub const ROUTE_ADMIN_CATALOG_EXPORT: &str = "cedros-pay:admin-catalog-export";
pub const ROUTE_ADMIN_CATALOG_EXPORT_VALIDATE: &str = "cedros-pay:admin-catalog-export-validate";
pub const ROUTE_ADMIN_CATALOG_RECORDS_QUERY: &str = "cedros-pay:admin-catalog-records-query";
pub const ROUTE_ADMIN_CAPACITY_ACTIVATION_STATUS: &str =
    "cedros-pay:admin-capacity-activation-status";
pub const ROUTE_ADMIN_CAPACITY_TAX_READINESS: &str = "cedros-pay:admin-capacity-tax-readiness";
pub const ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT: &str = "cedros-pay:admin-catalog-product-upsert";
pub const ROUTE_ADMIN_CATALOG_PRODUCT_ACTIVE_SET: &str =
    "cedros-pay:admin-catalog-product-active-set";
pub const ROUTE_ADMIN_CATALOG_PRODUCT_DELETE: &str = "cedros-pay:admin-catalog-product-delete";
pub const ROUTE_ADMIN_CATALOG_PRICE_UPSERT: &str = "cedros-pay:admin-catalog-price-upsert";
pub const ROUTE_ADMIN_CATALOG_STRIPE_SYNC: &str = "cedros-pay:admin-catalog-stripe-sync";
pub const ROUTE_ADMIN_CATALOG_STRIPE_TAX_CODE_SET: &str =
    "cedros-pay:admin-catalog-stripe-tax-code-set";
pub const ROUTE_ADMIN_PROGRAM_ENTITLEMENT_UPSERT: &str =
    "cedros-pay:admin-program-entitlement-upsert";
pub const ROUTE_ADMIN_PROGRAM_INVITE_UPSERT: &str = "cedros-pay:admin-program-invite-upsert";
pub const ROUTE_ADMIN_PROGRAM_MEMBERSHIP_UPSERT: &str =
    "cedros-pay:admin-program-membership-upsert";
pub const ROUTE_PROGRAM_ACTIVATE: &str = "cedros-pay:program-activate";
pub const ROUTE_PROGRAM_STATUS: &str = "cedros-pay:program-status";
pub const ROUTE_ADMIN_PRODUCTS_LIST: &str = "cedros-pay:admin-products-list";
pub const ROUTE_ADMIN_PRODUCTS_CREATE: &str = "cedros-pay:admin-products-create";
pub const ROUTE_ADMIN_PRODUCTS_GET: &str = "cedros-pay:admin-products-get";
pub const ROUTE_ADMIN_PRODUCTS_UPDATE: &str = "cedros-pay:admin-products-update";
pub const ROUTE_ADMIN_PRODUCTS_DELETE: &str = "cedros-pay:admin-products-delete";
pub const ROUTE_ADMIN_PRODUCTS_STRIPE_IMPORT_PREVIEW: &str =
    "cedros-pay:admin-products-stripe-import-preview";
pub const ROUTE_ADMIN_PRODUCTS_STRIPE_IMPORT: &str = "cedros-pay:admin-products-stripe-import";
pub const ROUTE_ADMIN_PRODUCTS_STRIPE_SYNC: &str = "cedros-pay:admin-products-stripe-sync";
pub const ROUTE_ADMIN_PRODUCT_INVENTORY_SET: &str = "cedros-pay:admin-product-inventory-set";
pub const ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUST: &str = "cedros-pay:admin-product-inventory-adjust";
pub const ROUTE_ADMIN_PRODUCT_INVENTORY_ADJUSTMENTS: &str =
    "cedros-pay:admin-product-inventory-adjustments";
pub const ROUTE_ADMIN_PRODUCT_VARIATIONS_GET: &str = "cedros-pay:admin-product-variations-get";
pub const ROUTE_ADMIN_PRODUCT_VARIATIONS_UPDATE: &str =
    "cedros-pay:admin-product-variations-update";
pub const ROUTE_ADMIN_PRODUCT_VARIANT_INVENTORY_UPDATE: &str =
    "cedros-pay:admin-product-variant-inventory-update";
pub const ROUTE_ADMIN_COUPONS_LIST: &str = "cedros-pay:admin-coupons-list";
pub const ROUTE_ADMIN_COUPONS_CREATE: &str = "cedros-pay:admin-coupons-create";
pub const ROUTE_ADMIN_COUPONS_UPDATE: &str = "cedros-pay:admin-coupons-update";
pub const ROUTE_ADMIN_COUPONS_DELETE: &str = "cedros-pay:admin-coupons-delete";
pub const ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_GET: &str =
    "cedros-pay:admin-subscriptions-settings-get";
pub const ROUTE_ADMIN_SUBSCRIPTIONS_SETTINGS_UPDATE: &str =
    "cedros-pay:admin-subscriptions-settings-update";
pub const ROUTE_ADMIN_REFUNDS_LIST: &str = "cedros-pay:admin-refunds-list";
pub const ROUTE_ADMIN_REFUNDS_PROCESS: &str = "cedros-pay:admin-refunds-process";
pub const ROUTE_ADMIN_REFUNDS_DENY: &str = "cedros-pay:admin-refunds-deny";
pub const ROUTE_ADMIN_CREDIT_REFUND_REQUESTS_LIST: &str =
    "cedros-pay:admin-credit-refund-requests-list";
pub const ROUTE_ADMIN_CREDIT_REFUNDS_PROCESS: &str = "cedros-pay:admin-credit-refunds-process";
pub const ROUTE_ADMIN_STRIPE_REFUNDS_LIST: &str = "cedros-pay:admin-stripe-refunds-list";
pub const ROUTE_ADMIN_STRIPE_REFUNDS_PROCESS: &str = "cedros-pay:admin-stripe-refunds-process";
pub const ROUTE_ADMIN_AFFILIATE_PAYOUTS_SETTLE: &str = "cedros-pay:admin-affiliate-payouts-settle";
pub const ROUTE_ADMIN_CONFIG_LIST: &str = "cedros-pay:admin-config-list";
pub const ROUTE_ADMIN_CONFIG_HISTORY: &str = "cedros-pay:admin-config-history";
pub const ROUTE_ADMIN_CONFIG_VALIDATE: &str = "cedros-pay:admin-config-validate";
pub const ROUTE_ADMIN_CONFIG_STRIPE_GET: &str = "cedros-pay:admin-config-stripe-get";
pub const ROUTE_ADMIN_CONFIG_STRIPE_UPDATE: &str = "cedros-pay:admin-config-stripe-update";
pub const ROUTE_ADMIN_CONFIG_X402_GET: &str = "cedros-pay:admin-config-x402-get";
pub const ROUTE_ADMIN_CONFIG_X402_UPDATE: &str = "cedros-pay:admin-config-x402-update";
pub const ROUTE_ADMIN_CONFIG_CEDROS_LOGIN_GET: &str = "cedros-pay:admin-config-cedros-login-get";
pub const ROUTE_ADMIN_CONFIG_CEDROS_LOGIN_UPDATE: &str =
    "cedros-pay:admin-config-cedros-login-update";
pub const ROUTE_ADMIN_CONFIG_NATIVE_STORE_GET: &str = "cedros-pay:admin-config-native-store-get";
pub const ROUTE_ADMIN_CONFIG_NATIVE_STORE_UPDATE: &str =
    "cedros-pay:admin-config-native-store-update";
pub const ROUTE_ADMIN_CONFIG_SHOP_GET: &str = "cedros-pay:admin-config-shop-get";
pub const ROUTE_ADMIN_CONFIG_SHOP_UPDATE: &str = "cedros-pay:admin-config-shop-update";
pub const ROUTE_ADMIN_CONFIG_SUBSCRIPTIONS_GET: &str = "cedros-pay:admin-config-subscriptions-get";
pub const ROUTE_ADMIN_CONFIG_SUBSCRIPTIONS_UPDATE: &str =
    "cedros-pay:admin-config-subscriptions-update";
pub const ROUTE_ADMIN_SHIPPING_PROFILES_LIST: &str = "cedros-pay:admin-shipping-profiles-list";
pub const ROUTE_ADMIN_SHIPPING_PROFILES_CREATE: &str = "cedros-pay:admin-shipping-profiles-create";
pub const ROUTE_ADMIN_SHIPPING_PROFILES_GET: &str = "cedros-pay:admin-shipping-profiles-get";
pub const ROUTE_ADMIN_SHIPPING_PROFILES_UPDATE: &str = "cedros-pay:admin-shipping-profiles-update";
pub const ROUTE_ADMIN_SHIPPING_PROFILES_DELETE: &str = "cedros-pay:admin-shipping-profiles-delete";
pub const ROUTE_ADMIN_SHIPPING_RATES_LIST: &str = "cedros-pay:admin-shipping-rates-list";
pub const ROUTE_ADMIN_SHIPPING_RATES_CREATE: &str = "cedros-pay:admin-shipping-rates-create";
pub const ROUTE_ADMIN_SHIPPING_RATES_UPDATE: &str = "cedros-pay:admin-shipping-rates-update";
pub const ROUTE_ADMIN_SHIPPING_RATES_DELETE: &str = "cedros-pay:admin-shipping-rates-delete";
pub const ROUTE_ADMIN_TAX_RATES_LIST: &str = "cedros-pay:admin-tax-rates-list";
pub const ROUTE_ADMIN_TAX_RATES_CREATE: &str = "cedros-pay:admin-tax-rates-create";
pub const ROUTE_ADMIN_TAX_RATES_GET: &str = "cedros-pay:admin-tax-rates-get";
pub const ROUTE_ADMIN_TAX_RATES_UPDATE: &str = "cedros-pay:admin-tax-rates-update";
pub const ROUTE_ADMIN_TAX_RATES_DELETE: &str = "cedros-pay:admin-tax-rates-delete";
pub const ROUTE_ADMIN_SITE_SETTINGS_TIPPING_GET: &str =
    "cedros-pay:admin-site-settings-tipping-get";
pub const ROUTE_ADMIN_SITE_SETTINGS_TIPPING_UPDATE: &str =
    "cedros-pay:admin-site-settings-tipping-update";
pub const ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_GET: &str =
    "cedros-pay:admin-site-settings-monetization-get";
pub const ROUTE_ADMIN_SITE_SETTINGS_MONETIZATION_UPDATE: &str =
    "cedros-pay:admin-site-settings-monetization-update";

// ── jobs (surfaces.server.jobs[]) ─────────────────────────────────────────────
pub const JOB_STATS_ROLLUP: &str = "cedros-pay:stats-rollup";
pub const JOB_WEBHOOK_DELIVERY: &str = "cedros-pay:webhook-delivery";
pub const JOB_CLEANUP: &str = "cedros-pay:cleanup";
pub const JOB_CATALOG_SYNC: &str = "cedros-pay:catalog-sync";
pub const JOB_SUBSCRIPTION_SYNC: &str = "cedros-pay:subscription-sync";
pub const JOB_SANCTIONS_REFRESH: &str = "cedros-pay:sanctions-refresh";
pub const JOB_SANCTIONS_SWEEP: &str = "cedros-pay:sanctions-sweep";
pub const JOB_BALANCE_ALERT: &str = "cedros-pay:balance-alert";
pub const JOB_HEALTH_CHECK: &str = "cedros-pay:health-check";
pub const JOB_EMAIL: &str = "cedros-pay:email";
pub const JOB_X402_RECONCILE: &str = "cedros-pay:x402-reconcile";

// ── customer tags (customerTagAccess[]) ───────────────────────────────────────
pub const TAG_ACCESS: &str = "cedros-pay:customer-tags";
pub const TAG_FIRST_PURCHASE: &str = "cedros-pay:first-purchase";
pub const TAG_REPEAT: &str = "cedros-pay:repeat-customer";
pub const TAG_VIP: &str = "cedros-pay:vip-customer";
pub const TAG_AT_RISK: &str = "cedros-pay:at-risk";

// ── CRM source events (crmSourceAccess[]) ────────────────────────────────────
pub const CRM_SOURCE_ACCESS: &str = "cedros-pay:crm-source-events";
pub const CRM_SOURCE_KIND: &str = "cedros_pay";
pub const CRM_EVENT_PURCHASE_COMPLETED: &str = "purchase.completed";
pub const CRM_EVENT_PAYMENT_FAILED: &str = "payment.failed";
pub const CRM_EVENT_REFUND_SETTLED: &str = "refund.settled";
pub const CRM_EVENT_SUBSCRIPTION_CREATED: &str = "subscription.created";
pub const CRM_EVENT_SUBSCRIPTION_RENEWED: &str = "subscription.renewed";
pub const CRM_EVENT_SUBSCRIPTION_CANCELED: &str = "subscription.canceled";
pub const CRM_EVENT_CREDIT_PURCHASE: &str = "credit.purchase";
pub const CRM_EVENT_CHARGEBACK_OPENED: &str = "chargeback.opened";
pub const CRM_EVENT_DISPUTE_OPENED: &str = "dispute.opened";
pub const CRM_EVENT_DISPUTE_UPDATED: &str = "dispute.updated";
pub const CRM_EVENT_DISPUTE_CLOSED: &str = "dispute.closed";

// ── telemetry events (surfaces.server.events[]) ───────────────────────────────
pub const EVENT_PAYMENT_SUCCEEDED: &str = "cedros-pay:payment-succeeded";
pub const EVENT_CHECKOUT_SETTLED: &str = "cedros-pay:checkout-settled";
pub const EVENT_PAYMENT_FAILED: &str = "cedros-pay:payment-failed";
pub const EVENT_REFUND_SETTLED: &str = "cedros-pay:refund-settled";
pub const EVENT_ENTITLEMENT_CHANGED: &str = "cedros-pay:entitlement-changed";
pub const EVENT_SUBSCRIPTION_STARTED: &str = "cedros-pay:subscription-started";
pub const EVENT_SUBSCRIPTION_CANCELED: &str = "cedros-pay:subscription-canceled";
pub const EVENT_DISPUTE_OPENED: &str = "cedros-pay:dispute-opened";

// ── capabilities (capabilities[]) ────────────────────────────────────────────
pub const CAPABILITY_ENTITLEMENT_READ: &str = "cedros-pay:entitlement-read";
pub const CAPABILITY_ACCESS_PASS: &str = "cedros-pay:access-pass";

// ── secrets (always-granted, encrypted store) ─────────────────────────────────
pub const SECRET_STRIPE_KEY: &str = "stripe.secret_key";
/// Site-generated 256-bit hex ingress token carried in the Stripe webhook URL.
pub const SECRET_STRIPE_WEBHOOK_TOKEN: &str = "stripe.webhook_token";
pub const SECRET_CHECKOUT_STRIPE_ACCOUNT: &str = "checkout.stripe_account_id";
pub const SECRET_CHECKOUT_CONTEXT_MAC: &str = "checkout.context_mac_key";
/// Shared secret a relying party (e.g. giftcards) presents as a bearer token on
/// the credits/payments contract. Migrate to host-issued service identity when
/// available (audit §10.3).
pub const SECRET_RP_TOKEN: &str = "relying_party.shared_secret";

// ── settings (per-extension JSON) ─────────────────────────────────────────────
pub const SETTING_CURRENCY: &str = "store.currency";
pub const SETTING_SITE_TIPPING: &str = "site_settings/tipping";
pub const SETTING_SITE_MONETIZATION: &str = "site_settings/monetization";
pub const SETTING_SHOP_PAYMENT_AVAILABILITY_SNAPSHOT: &str = "shop.payment_availability_snapshot";
pub const SETTING_VIP_THRESHOLD_CENTS: &str = "credits.vip_threshold_cents";
pub const SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS: &str = "checkout.allowed_return_origins";

// ── external extension bridge keys ───────────────────────────────────────────
/// Shop-owned settings key the host mirrors Pay availability into before enabling
/// Cedros Shop checkout. Pay writes only its local snapshot setting above.
pub const SHOP_PAYMENT_AVAILABILITY_BRIDGE_KEY: &str = "cedros-shop:pay.payment-availability";

// ── providers (providerAccess[]) ──────────────────────────────────────────────
pub const PROVIDER_EMAIL: &str = "email";
pub const PROVIDER_BLOCKCHAIN_CONFIG: &str = "cedros-pay:blockchain-config";
pub const PROVIDER_BLOCKCHAIN_X402_SIGN: &str = "cedros-pay:blockchain-x402-sign";
pub const PROVIDER_BLOCKCHAIN_X402_REFUND: &str = "cedros-pay:blockchain-x402-refund";
pub const PROVIDER_BLOCKCHAIN_ASSISTANT_X402_SIGN: &str =
    "cedros-pay:blockchain-assistant-x402-sign";
pub const PROVIDER_BLOCKCHAIN: &str = "blockchain";
pub const OP_BLOCKCHAIN_CONFIG_READ: &str = "blockchain.config.read";
pub const OP_BLOCKCHAIN_X402_SIGN: &str = "blockchain.solana.sign.x402";
pub const OP_BLOCKCHAIN_X402_REFUND: &str = "blockchain.solana.refund.x402";
pub const OP_BLOCKCHAIN_ASSISTANT_X402_SIGN: &str = "blockchain.solana.sign.assistant-x402";

// ── egress (operator allowlist) ───────────────────────────────────────────────
/// Stripe API base; its host must be in `CEDROS_EXTENSION_HTTP_ALLOWLIST`.
pub const STRIPE_API_BASE: &str = "https://api.stripe.com";

// ── tunable defaults ──────────────────────────────────────────────────────────
/// Default lifetime VIP threshold (minor units) when unset in settings.
pub const DEFAULT_VIP_THRESHOLD_CENTS: i64 = 50_000;

pub const ROUTE_ADMIN_CAPACITY_READ: &str = "cedros-pay:admin-capacity-read";
pub const ROUTE_ADMIN_CAPACITY_CONFIGURE: &str = "cedros-pay:admin-capacity-configure";
pub const ROUTE_ADMIN_CAPACITY_ENROLL: &str = "cedros-pay:admin-capacity-enroll";
pub const ROUTE_ADMIN_CAPACITY_ACTIVATE: &str = "cedros-pay:admin-capacity-activate";
pub const ROUTE_ADMIN_CAPACITY_COUPON_ENSURE: &str = "cedros-pay:admin-capacity-coupon-ensure";
