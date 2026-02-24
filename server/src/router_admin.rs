/// Admin route construction helpers.
///
/// All admin routes are protected by Ed25519 signature verification via
/// `middleware::admin_middleware` (X-Signature, X-Message, X-Signer headers).
use std::sync::Arc;

use axum::{
    routing::{delete, get, patch, post, put},
    Router,
};

use crate::handlers;
use crate::middleware;
use crate::router::RouterStates;
use crate::storage::Store;

/// Build and merge all admin routes into the given router.
///
/// Returns the updated router with all `/admin` sub-trees attached.
pub(crate) fn attach_admin_routes<S: Store + 'static>(
    mut router: Router,
    states: AdminRouteStates<S>,
) -> Router {
    let AdminRouteStates {
        admin_auth_state,
        admin_config_state,
        admin_subscriptions_state,
        admin_ai_state,
        admin_ai_assistant_state,
        admin_dashboard_state,
        admin_chat_state,
        chat_state,
        paywall_prefix,
        store,
    } = states;

    // Admin webhook routes
    let admin_webhook_routes = build_webhook_routes(store, admin_auth_state.clone());
    router = router.nest("/admin", admin_webhook_routes);

    // Admin config routes (PostgreSQL only)
    if let Some(config_state) = admin_config_state {
        let config_routes = build_config_routes(config_state, admin_auth_state.clone());
        router = router.nest("/admin", config_routes);
    }

    // Admin AI settings routes (PostgreSQL only)
    if let Some(ai_state) = admin_ai_state {
        let ai_routes = build_ai_settings_routes(ai_state, admin_auth_state.clone());
        router = router.nest("/admin", ai_routes);
    }

    // Admin subscription settings routes (PostgreSQL only)
    if let Some(subscriptions_state) = admin_subscriptions_state {
        let sub_routes =
            build_subscription_settings_routes(subscriptions_state, admin_auth_state.clone());
        router = router.nest("/admin", sub_routes);
    }

    // Admin AI assistant routes (PostgreSQL only)
    if let Some(ai_assistant_state) = admin_ai_assistant_state {
        let ai_assistant_routes =
            build_ai_assistant_routes(ai_assistant_state, admin_auth_state.clone());
        router = router.nest("/admin", ai_assistant_routes);
    }

    // Public chat endpoint (customer-facing AI assistant, PostgreSQL only)
    if let Some(chat_state) = chat_state {
        let chat_routes = Router::new()
            .route("/chat", post(handlers::chat::chat))
            .with_state(chat_state);
        router = router.nest(&paywall_prefix, chat_routes);
    }

    // Admin chat routes (CRM-style review)
    let admin_chat_routes = build_admin_chat_routes(admin_chat_state, admin_auth_state.clone());
    router = router.nest("/admin", admin_chat_routes);

    // Admin dashboard routes
    let admin_dashboard_routes =
        build_dashboard_routes(admin_dashboard_state, admin_auth_state.clone());
    router = router.nest("/admin", admin_dashboard_routes);

    router
}

/// Holds the state values needed for admin route construction, extracted from
/// [`RouterStates`] to keep `attach_admin_routes` signature manageable.
pub(crate) struct AdminRouteStates<S: Store + 'static> {
    pub admin_auth_state: Arc<middleware::AdminAuthState<S>>,
    pub admin_config_state: Option<Arc<handlers::admin_config::AdminConfigState>>,
    pub admin_subscriptions_state:
        Option<Arc<handlers::admin_subscriptions::AdminSubscriptionsState>>,
    pub admin_ai_state: Option<Arc<handlers::admin_ai::AdminAiState>>,
    pub admin_ai_assistant_state: Option<Arc<handlers::admin_ai_assistant::AdminAiAssistantState>>,
    pub admin_dashboard_state: Arc<handlers::admin::AdminState>,
    pub admin_chat_state: Arc<handlers::admin_chats::AdminChatState>,
    pub chat_state: Option<Arc<handlers::chat::ChatState>>,
    pub paywall_prefix: String,
    pub store: Arc<S>,
}

impl<S: Store + 'static> AdminRouteStates<S> {
    pub(crate) fn from_router_states(states: &RouterStates<S>, paywall_prefix: String) -> Self {
        AdminRouteStates {
            admin_auth_state: states.admin_auth_state.clone(),
            admin_config_state: states.admin_config_state.clone(),
            admin_subscriptions_state: states.admin_subscriptions_state.clone(),
            admin_ai_state: states.admin_ai_state.clone(),
            admin_ai_assistant_state: states.admin_ai_assistant_state.clone(),
            admin_dashboard_state: states.admin_dashboard_state.clone(),
            admin_chat_state: states.admin_chat_state.clone(),
            chat_state: states.chat_state.clone(),
            paywall_prefix,
            store: states.store.clone(),
        }
    }
}

fn build_webhook_routes<S: Store + 'static>(
    store: Arc<S>,
    admin_auth_state: Arc<middleware::AdminAuthState<S>>,
) -> Router {
    Router::new()
        .route(
            "/webhooks",
            get(handlers::admin_webhooks::list_webhooks::<S>),
        )
        .route(
            "/webhooks/{id}",
            get(handlers::admin_webhooks::get_webhook::<S>),
        )
        .route(
            "/webhooks/{id}/retry",
            post(handlers::admin_webhooks::retry_webhook::<S>),
        )
        .route(
            "/webhooks/{id}",
            delete(handlers::admin_webhooks::delete_webhook::<S>),
        )
        .route(
            "/webhooks/dlq",
            get(handlers::admin_webhooks::list_dlq::<S>),
        )
        .route(
            "/webhooks/dlq/{id}/retry",
            post(handlers::admin_webhooks::retry_from_dlq::<S>),
        )
        .route(
            "/webhooks/dlq/{id}",
            delete(handlers::admin_webhooks::delete_from_dlq::<S>),
        )
        .with_state(store)
        .layer(axum::middleware::from_fn_with_state(
            admin_auth_state,
            middleware::admin_middleware,
        ))
}

fn build_config_routes<S: Store + 'static>(
    config_state: Arc<handlers::admin_config::AdminConfigState>,
    admin_auth_state: Arc<middleware::AdminAuthState<S>>,
) -> Router {
    Router::new()
        .route("/config", get(handlers::admin_config::list_categories))
        .route("/config/batch", post(handlers::admin_config::batch_update))
        .route(
            "/config/validate",
            post(handlers::admin_config::validate_config),
        )
        .route("/config/history", get(handlers::admin_config::get_history))
        .route(
            "/config/{category}",
            get(handlers::admin_config::get_config),
        )
        .route(
            "/config/{category}",
            put(handlers::admin_config::update_config),
        )
        .route(
            "/config/{category}",
            patch(handlers::admin_config::patch_config),
        )
        .with_state(config_state)
        .layer(axum::middleware::from_fn_with_state(
            admin_auth_state,
            middleware::admin_middleware,
        ))
}

fn build_ai_settings_routes<S: Store + 'static>(
    ai_state: Arc<handlers::admin_ai::AdminAiState>,
    admin_auth_state: Arc<middleware::AdminAuthState<S>>,
) -> Router {
    Router::new()
        .route("/config/ai", get(handlers::admin_ai::get_ai_settings))
        .route("/config/ai/api-key", put(handlers::admin_ai::save_api_key))
        .route(
            "/config/ai/api-key/{provider}",
            delete(handlers::admin_ai::delete_api_key),
        )
        .route(
            "/config/ai/assignment",
            put(handlers::admin_ai::save_assignment),
        )
        .route("/config/ai/prompt", put(handlers::admin_ai::save_prompt))
        .with_state(ai_state)
        .layer(axum::middleware::from_fn_with_state(
            admin_auth_state,
            middleware::admin_middleware,
        ))
}

fn build_subscription_settings_routes<S: Store + 'static>(
    subscriptions_state: Arc<handlers::admin_subscriptions::AdminSubscriptionsState>,
    admin_auth_state: Arc<middleware::AdminAuthState<S>>,
) -> Router {
    Router::new()
        .route(
            "/subscriptions/settings",
            get(handlers::admin_subscriptions::get_settings),
        )
        .route(
            "/subscriptions/settings",
            put(handlers::admin_subscriptions::update_settings),
        )
        .with_state(subscriptions_state)
        .layer(axum::middleware::from_fn_with_state(
            admin_auth_state,
            middleware::admin_middleware,
        ))
}

fn build_ai_assistant_routes<S: Store + 'static>(
    ai_assistant_state: Arc<handlers::admin_ai_assistant::AdminAiAssistantState>,
    admin_auth_state: Arc<middleware::AdminAuthState<S>>,
) -> Router {
    Router::new()
        .route(
            "/ai/product-assistant",
            post(handlers::admin_ai_assistant::product_assistant),
        )
        .route(
            "/ai/related-products",
            post(handlers::admin_ai_assistant::related_products),
        )
        .route(
            "/ai/product-search",
            post(handlers::admin_ai_assistant::product_search),
        )
        .with_state(ai_assistant_state)
        .layer(axum::middleware::from_fn_with_state(
            admin_auth_state,
            middleware::admin_middleware,
        ))
}

fn build_admin_chat_routes<S: Store + 'static>(
    admin_chat_state: Arc<handlers::admin_chats::AdminChatState>,
    admin_auth_state: Arc<middleware::AdminAuthState<S>>,
) -> Router {
    Router::new()
        .route("/chats", get(handlers::admin_chats::list_chat_sessions))
        .route(
            "/chats/{session_id}",
            get(handlers::admin_chats::get_chat_session),
        )
        .route(
            "/users/{user_id}/chats",
            get(handlers::admin_chats::list_user_chat_sessions),
        )
        .with_state(admin_chat_state)
        .layer(axum::middleware::from_fn_with_state(
            admin_auth_state,
            middleware::admin_middleware,
        ))
}

#[allow(clippy::too_many_lines)]
fn build_dashboard_routes<S: Store + 'static>(
    admin_dashboard_state: Arc<handlers::admin::AdminState>,
    admin_auth_state: Arc<middleware::AdminAuthState<S>>,
) -> Router {
    Router::new()
        .route("/stats", get(handlers::admin::get_stats))
        // Customers
        .route("/customers", get(handlers::admin_customers::list_customers))
        .route(
            "/customers/{id}",
            get(handlers::admin_customers::get_customer),
        )
        .route(
            "/customers",
            post(handlers::admin_customers::create_customer),
        )
        .route(
            "/customers/{id}",
            put(handlers::admin_customers::update_customer),
        )
        // Orders & fulfillments
        .route("/orders", get(handlers::admin_orders::list_orders))
        .route("/orders/{id}", get(handlers::admin_orders::get_order))
        .route(
            "/orders/{id}/status",
            post(handlers::admin_orders::update_order_status),
        )
        .route(
            "/orders/{id}/fulfillments",
            post(handlers::admin_orders::create_fulfillment),
        )
        .route(
            "/fulfillments/{id}/status",
            post(handlers::admin_orders::update_fulfillment_status),
        )
        // Returns
        .route("/returns", get(handlers::admin_returns::list_returns))
        .route("/returns/{id}", get(handlers::admin_returns::get_return))
        .route("/returns", post(handlers::admin_returns::create_return))
        .route(
            "/returns/{id}/status",
            post(handlers::admin_returns::update_return_status),
        )
        // Disputes / chargebacks
        .route("/disputes", get(handlers::admin_disputes::list_disputes))
        .route("/disputes", post(handlers::admin_disputes::create_dispute))
        .route("/disputes/{id}", get(handlers::admin_disputes::get_dispute))
        .route(
            "/disputes/{id}/status",
            post(handlers::admin_disputes::update_dispute_status),
        )
        // FAQs
        .route("/faqs", get(handlers::admin_faqs::list_faqs))
        .route("/faqs", post(handlers::admin_faqs::create_faq))
        .route("/faqs/{id}", get(handlers::admin_faqs::get_faq))
        .route("/faqs/{id}", put(handlers::admin_faqs::update_faq))
        .route("/faqs/{id}", delete(handlers::admin_faqs::delete_faq))
        // Gift cards
        .route(
            "/gift-cards",
            get(handlers::admin_gift_cards::list_gift_cards),
        )
        .route(
            "/gift-cards",
            post(handlers::admin_gift_cards::create_gift_card),
        )
        .route(
            "/gift-cards/{code}",
            get(handlers::admin_gift_cards::get_gift_card),
        )
        .route(
            "/gift-cards/{code}",
            put(handlers::admin_gift_cards::update_gift_card),
        )
        .route(
            "/gift-cards/{code}/adjust",
            post(handlers::admin_gift_cards::adjust_gift_card_balance),
        )
        // Collections
        .route(
            "/collections",
            get(handlers::admin_collections::list_collections),
        )
        .route(
            "/collections",
            post(handlers::admin_collections::create_collection),
        )
        .route(
            "/collections/{id}",
            get(handlers::admin_collections::get_collection),
        )
        .route(
            "/collections/{id}",
            put(handlers::admin_collections::update_collection),
        )
        .route(
            "/collections/{id}",
            delete(handlers::admin_collections::delete_collection),
        )
        // Products CRUD
        .route("/products", get(handlers::admin::list_products))
        .route("/products/{id}", get(handlers::admin::get_product))
        .route("/products", post(handlers::admin::create_product))
        .route("/products/{id}", put(handlers::admin::update_product))
        .route("/products/{id}", delete(handlers::admin::delete_product))
        .route(
            "/products/{id}/inventory",
            put(handlers::admin::set_product_inventory),
        )
        .route(
            "/products/{id}/inventory/adjust",
            post(handlers::admin::adjust_product_inventory),
        )
        .route(
            "/products/{id}/inventory/adjustments",
            get(handlers::admin_inventory::list_inventory_adjustments),
        )
        // Product variations
        .route(
            "/products/{id}/variations",
            get(handlers::admin_variations::get_variations),
        )
        .route(
            "/products/{id}/variations",
            put(handlers::admin_variations::update_variations),
        )
        .route(
            "/products/{id}/variants/inventory",
            put(handlers::admin_variations::bulk_update_inventory),
        )
        // Shipping profiles & rates
        .route(
            "/shipping/profiles",
            get(handlers::admin_shipping::list_profiles),
        )
        .route(
            "/shipping/profiles",
            post(handlers::admin_shipping::create_profile),
        )
        .route(
            "/shipping/profiles/{id}",
            get(handlers::admin_shipping::get_profile),
        )
        .route(
            "/shipping/profiles/{id}",
            put(handlers::admin_shipping::update_profile),
        )
        .route(
            "/shipping/profiles/{id}",
            delete(handlers::admin_shipping::delete_profile),
        )
        .route(
            "/shipping/profiles/{id}/rates",
            get(handlers::admin_shipping::list_rates),
        )
        .route(
            "/shipping/profiles/{id}/rates",
            post(handlers::admin_shipping::create_rate),
        )
        .route(
            "/shipping/rates/{id}",
            put(handlers::admin_shipping::update_rate),
        )
        .route(
            "/shipping/rates/{id}",
            delete(handlers::admin_shipping::delete_rate),
        )
        // Taxes
        .route("/taxes", get(handlers::admin_tax::list_tax_rates))
        .route("/taxes", post(handlers::admin_tax::create_tax_rate))
        .route("/taxes/{id}", get(handlers::admin_tax::get_tax_rate))
        .route("/taxes/{id}", put(handlers::admin_tax::update_tax_rate))
        .route("/taxes/{id}", delete(handlers::admin_tax::delete_tax_rate))
        // Stripe refunds (admin UI)
        .route(
            "/stripe/refunds",
            get(handlers::admin_stripe_refunds::list_stripe_refunds),
        )
        .route(
            "/stripe/refunds/{id}/process",
            post(handlers::admin_stripe_refunds::process_stripe_refund),
        )
        // Transactions (read-only)
        .route("/transactions", get(handlers::admin::list_transactions))
        // Coupons CRUD
        .route("/coupons", get(handlers::admin::list_coupons))
        .route("/coupons", post(handlers::admin::create_coupon))
        .route("/coupons/{id}", put(handlers::admin::update_coupon))
        .route("/coupons/{id}", delete(handlers::admin::delete_coupon))
        // Credits refund requests
        .route(
            "/credits/refund-requests",
            get(handlers::admin::list_credits_refund_requests),
        )
        // Refunds
        .route("/refunds", get(handlers::admin::list_refunds))
        .route(
            "/refunds/{id}/process",
            post(handlers::admin::process_refund),
        )
        .with_state(admin_dashboard_state)
        .layer(axum::middleware::from_fn_with_state(
            admin_auth_state,
            middleware::admin_middleware,
        ))
}
