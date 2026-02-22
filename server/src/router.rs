use std::sync::Arc;

use axum::{
    extract::DefaultBodyLimit,
    routing::{get, post},
    Router,
};

use crate::constants;
use crate::handlers;
use crate::middleware;
use crate::router_admin::{AdminRouteStates, attach_admin_routes};
use crate::storage::Store;

/// Bundled state for router construction to avoid too many function arguments
pub(crate) struct RouterStates<S: Store> {
    pub app_state: Arc<handlers::paywall::AppState<S>>,
    pub products_state: Arc<handlers::products::ProductsAppState>,
    pub collections_state: Arc<handlers::collections::CollectionsAppState<S>>,
    pub subscription_state: Arc<handlers::subscriptions::SubscriptionAppState<S>>,
    pub discovery_state: Arc<handlers::discovery::DiscoveryState>,
    pub metrics_state: Arc<handlers::metrics::MetricsState>,
    pub health_state: Arc<parking_lot::RwLock<handlers::health::HealthState>>,
    pub store: Arc<S>,
    pub route_prefix: String,
    pub admin_auth_state: Arc<middleware::AdminAuthState<S>>,
    pub admin_config_state: Option<Arc<handlers::admin_config::AdminConfigState>>,
    pub admin_subscriptions_state:
        Option<Arc<handlers::admin_subscriptions::AdminSubscriptionsState>>,
    pub admin_ai_state: Option<Arc<handlers::admin_ai::AdminAiState>>,
    pub admin_ai_assistant_state:
        Option<Arc<handlers::admin_ai_assistant::AdminAiAssistantState>>,
    pub admin_dashboard_state: Arc<handlers::admin::AdminState>,
    pub chat_state: Option<Arc<handlers::chat::ChatState>>,
    pub admin_chat_state: Arc<handlers::admin_chats::AdminChatState>,
    pub faqs_state: Arc<handlers::faqs::FaqsState>,
}

pub(crate) fn build_router<S: Store + 'static>(states: RouterStates<S>) -> Router {
    let paywall_prefix = if states.route_prefix.is_empty() {
        "/paywall/v1".to_string()
    } else {
        format!("{}/paywall/v1", states.route_prefix)
    };
    let subscription_prefix = format!("{}/subscription", paywall_prefix);

    let idempotency_state = Arc::new(middleware::IdempotencyState::new(states.store.clone()));

    let paywall_routes = build_paywall_routes(states.app_state.clone(), idempotency_state);
    let stripe_redirects = build_stripe_redirect_routes(states.app_state.clone());
    let stripe_webhook = build_stripe_webhook_route(states.app_state.clone());
    let products_routes = build_product_routes(states.products_state.clone());
    let collections_routes = build_collections_routes(states.collections_state.clone());
    let faqs_routes = build_faqs_routes(states.faqs_state.clone());
    let subscription_routes = build_subscription_routes(states.subscription_state.clone());
    let discovery_routes = build_discovery_routes(states.discovery_state.clone());
    let ai_discovery_routes = build_ai_discovery_routes();
    let metrics_routes = build_metrics_routes(states.metrics_state.clone());
    let health_routes = build_health_routes(states.health_state.clone());

    let admin_states =
        AdminRouteStates::from_router_states(&states, paywall_prefix.clone());

    let mut router = Router::new()
        .merge(health_routes)
        .nest(&paywall_prefix, paywall_routes)
        .nest(&paywall_prefix, products_routes)
        .nest(&paywall_prefix, collections_routes)
        .nest(&paywall_prefix, faqs_routes)
        .nest(&subscription_prefix, subscription_routes)
        .nest("/stripe", stripe_redirects)
        .nest("/webhook", stripe_webhook);

    router = attach_admin_routes(router, admin_states);

    router
        .merge(discovery_routes)
        .merge(ai_discovery_routes)
        .merge(metrics_routes)
        .layer(axum::middleware::from_fn(
            middleware::tenant::tenant_middleware,
        ))
        .layer(DefaultBodyLimit::max(constants::MAX_REQUEST_BODY_SIZE))
}

fn build_paywall_routes<S: Store + 'static>(
    app_state: Arc<handlers::paywall::AppState<S>>,
    idempotency_state: Arc<middleware::IdempotencyState<S>>,
) -> Router {
    Router::new()
        .route("/quote", post(handlers::paywall::quote_402::<S>))
        .route("/quote", get(handlers::paywall::quote::<S>))
        .route("/verify", post(handlers::verify::verify::<S>))
        .route(
            "/gasless-transaction",
            post(handlers::gasless::build_gasless_transaction::<S>),
        )
        .route(
            "/derive-token-account",
            post(handlers::rpc_proxy::derive_token_account),
        )
        .route("/blockhash", get(handlers::rpc_proxy::get_blockhash::<S>))
        .route(
            "/stripe-session",
            post(handlers::stripe::create_session::<S>),
        )
        .route(
            "/stripe-session/verify",
            get(handlers::stripe::verify_session::<S>),
        )
        .route(
            "/x402-transaction/verify",
            get(handlers::stripe::verify_x402_transaction::<S>),
        )
        .route(
            "/credits/authorize",
            post(handlers::credits::authorize_credits::<S>),
        )
        .route(
            "/credits/hold",
            post(handlers::credits_holds::create_credits_hold::<S>),
        )
        .route(
            "/cart/{cartId}/credits/authorize",
            post(handlers::credits::authorize_cart_credits::<S>),
        )
        .route(
            "/cart/{cartId}/credits/hold",
            post(handlers::credits_holds::create_cart_credits_hold::<S>),
        )
        .route("/purchases", get(handlers::purchases::list_purchases::<S>))
        .route("/cart/quote", post(handlers::cart::cart_quote::<S>))
        .route("/cart/checkout", post(handlers::cart::cart_checkout::<S>))
        .route("/cart/{cartId}", get(handlers::cart::get_cart::<S>))
        .route(
            "/cart/{cartId}/verify",
            post(handlers::cart::verify_cart::<S>),
        )
        .route(
            "/cart/{cartId}/inventory-status",
            get(handlers::cart::get_cart_inventory_status::<S>),
        )
        .route(
            "/refunds/request",
            post(handlers::refunds::request_refund::<S>),
        )
        .route(
            "/refunds/approve",
            post(handlers::refunds::approve_refund::<S>),
        )
        .route("/refunds/deny", post(handlers::refunds::deny_refund::<S>))
        .route(
            "/refunds/pending",
            post(handlers::refunds::list_pending_refunds::<S>),
        )
        .route(
            "/refunds/{refundId}",
            get(handlers::refunds::get_refund::<S>),
        )
        .route("/shop", get(handlers::paywall::shop_config::<S>))
        .route("/nonce", post(handlers::refunds::create_nonce::<S>))
        .layer(axum::middleware::from_fn_with_state(
            app_state.clone(),
            middleware::guest_checkout::paywall_guest_checkout_middleware::<S>,
        ))
        .layer(axum::middleware::from_fn_with_state(
            idempotency_state,
            middleware::idempotency::idempotency_middleware::<S>,
        ))
        .layer(axum::middleware::from_fn(
            middleware::timeout::payment_timeout_middleware,
        ))
        .with_state(app_state)
}

fn build_stripe_redirect_routes<S: Store + 'static>(
    app_state: Arc<handlers::paywall::AppState<S>>,
) -> Router {
    Router::new()
        .route("/success", get(handlers::stripe::stripe_success::<S>))
        .route("/cancel", get(handlers::stripe::stripe_cancel::<S>))
        .with_state(app_state)
}

fn build_stripe_webhook_route<S: Store + 'static>(
    app_state: Arc<handlers::paywall::AppState<S>>,
) -> Router {
    Router::new()
        .route("/stripe", post(handlers::stripe::webhook::<S>))
        .route("/stripe", get(handlers::stripe::webhook_info))
        .with_state(app_state)
}

fn build_product_routes(state: Arc<handlers::products::ProductsAppState>) -> Router {
    Router::new()
        .route("/products", get(handlers::products::list_products))
        .route("/products/{id}", get(handlers::products::get_product))
        .route(
            "/products/by-slug/{slug}",
            get(handlers::products::get_product_by_slug),
        )
        .route("/products.txt", get(handlers::products::products_txt))
        .route(
            "/coupons/validate",
            post(handlers::products::validate_coupon),
        )
        .with_state(state)
}

fn build_collections_routes<S: Store + 'static>(
    state: Arc<handlers::collections::CollectionsAppState<S>>,
) -> Router {
    Router::new()
        .route(
            "/collections",
            get(handlers::collections::list_collections::<S>),
        )
        .route(
            "/collections/{id}",
            get(handlers::collections::get_collection::<S>),
        )
        .with_state(state)
}

fn build_faqs_routes(state: Arc<handlers::faqs::FaqsState>) -> Router {
    Router::new()
        .route("/faqs", get(handlers::faqs::list_public_faqs))
        .with_state(state)
}

fn build_subscription_routes<S: Store + 'static>(
    state: Arc<handlers::subscriptions::SubscriptionAppState<S>>,
) -> Router {
    Router::new()
        .route("/status", get(handlers::subscriptions::status::<S>))
        .route(
            "/stripe-session",
            post(handlers::subscriptions::stripe_session::<S>),
        )
        .route("/quote", post(handlers::subscriptions::quote::<S>))
        .route(
            "/x402/activate",
            post(handlers::subscriptions::create_x402::<S>),
        )
        .route(
            "/credits/activate",
            post(handlers::subscriptions::create_credits::<S>),
        )
        .route("/cancel", post(handlers::subscriptions::cancel::<S>))
        .route("/portal", post(handlers::subscriptions::portal::<S>))
        .route("/change", post(handlers::subscriptions::change::<S>))
        .route(
            "/reactivate",
            post(handlers::subscriptions::reactivate::<S>),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            middleware::guest_checkout::subscription_guest_checkout_middleware::<S>,
        ))
        .layer(axum::middleware::from_fn(
            middleware::timeout::payment_timeout_middleware,
        ))
        .with_state(state)
}

fn build_discovery_routes(state: Arc<handlers::discovery::DiscoveryState>) -> Router {
    Router::new()
        .route(
            "/.well-known/payment-options",
            get(handlers::discovery::payment_options),
        )
        .route(
            "/resources/list",
            post(handlers::discovery::mcp_resources_list),
        )
        .route("/openapi.json", get(handlers::discovery::openapi_spec))
        .layer(axum::middleware::from_fn(
            middleware::timeout::health_timeout_middleware,
        ))
        .with_state(state)
}

fn build_ai_discovery_routes() -> Router {
    Router::new()
        .route(
            "/.well-known/ai-discovery.json",
            get(handlers::ai_discovery::ai_discovery_json),
        )
        .route(
            "/.well-known/ai-plugin.json",
            get(handlers::ai_discovery::ai_plugin_json),
        )
        .route(
            "/.well-known/agent.json",
            get(handlers::ai_discovery::a2a_agent_json),
        )
        .route(
            "/.well-known/mcp",
            get(handlers::ai_discovery::mcp_discovery),
        )
        .route(
            "/.well-known/skills.zip",
            get(handlers::ai_discovery::skills_zip),
        )
        .route("/ai.txt", get(handlers::ai_discovery::ai_txt))
        .route("/llms.txt", get(handlers::ai_discovery::llms_txt))
        .route("/llms-full.txt", get(handlers::ai_discovery::llms_full_txt))
        .route(
            "/llms-admin.txt",
            get(handlers::ai_discovery::llms_admin_txt),
        )
        .route("/skill.md", get(handlers::ai_discovery::skill_md))
        .route("/skill.json", get(handlers::ai_discovery::skill_json))
        .route(
            "/skills/{skill_id}",
            get(handlers::ai_discovery::skill_file),
        )
        .route("/agent.md", get(handlers::ai_discovery::agent_md))
        .route("/heartbeat.md", get(handlers::ai_discovery::heartbeat_md))
        .route(
            "/heartbeat.json",
            get(handlers::ai_discovery::heartbeat_json),
        )
        .layer(axum::middleware::from_fn(
            middleware::timeout::health_timeout_middleware,
        ))
}

fn build_metrics_routes(state: Arc<handlers::metrics::MetricsState>) -> Router {
    Router::new()
        .route("/metrics", get(handlers::metrics::prometheus_metrics))
        .with_state(state)
}

fn build_health_routes(
    health_state: Arc<parking_lot::RwLock<handlers::health::HealthState>>,
) -> Router {
    Router::new()
        .route("/cedros-health", get(handlers::health::health_with_state))
        .layer(axum::middleware::from_fn(
            middleware::timeout::health_timeout_middleware,
        ))
        .with_state(health_state)
}
