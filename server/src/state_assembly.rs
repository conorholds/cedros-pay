/// Maps [`BuiltServices`] into [`RouterStates`] for router construction.
///
/// This module owns the "wiring" logic: taking fully-constructed services and
/// assembling the per-handler AppState structs that axum handlers receive via
/// [`axum::extract::State`].
use std::sync::Arc;

use crate::app::BuiltServices;
use crate::handlers;
use crate::handlers::collections::CollectionsAppState;
use crate::handlers::discovery::DiscoveryState;
use crate::handlers::paywall::AppState;
use crate::handlers::products::ProductsAppState;
use crate::handlers::subscriptions::SubscriptionAppState;
use crate::middleware;
use crate::router::RouterStates;
use crate::server::normalize_addr;
use crate::services;
use crate::storage::Store;

impl<S: Store + 'static> BuiltServices<S> {
    pub(crate) fn into_router_states(self) -> RouterStates<S> {
        let server_addr = normalize_addr(&self.config.server.address);

        let app_state = Arc::new(AppState {
            store: self.store.clone(),
            paywall_service: self.paywall_service.clone(),
            product_repo: self.product_repo.clone(),
            stripe_client: self.stripe_client.clone(),
            stripe_webhook_processor: self.stripe_webhook_processor,
            admin_public_keys: self.config.admin.public_keys.clone(),
            blockhash_cache: self.blockhash_cache.clone(),
        });

        let products_state = Arc::new(ProductsAppState {
            store: self.store.clone(),
            product_repo: self.product_repo.clone(),
            coupon_repo: self.coupon_repo.clone(),
        });
        let collections_state = Arc::new(CollectionsAppState {
            store: self.store.clone(),
        });

        let stripe_client_for_admin = self.stripe_client.clone();

        let subscription_state = Arc::new(SubscriptionAppState {
            subscription_service: self.subscription_service,
            stripe_client: self.stripe_client,
            paywall_service: self.paywall_service,
            product_repo: self.product_repo.clone(),
        });

        let discovery_state = Arc::new(DiscoveryState {
            product_repo: self.product_repo.clone(),
            network: self.config.x402.network.clone(),
            payment_address: self.config.x402.payment_address.clone(),
            token_mint: self.config.x402.token_mint.clone(),
            service_endpoint: if self.config.server.public_url.is_empty() {
                format!("http://{}", server_addr)
            } else {
                self.config.server.public_url.clone()
            },
            stripe_enabled: self.config.stripe.enabled,
            x402_enabled: self.config.x402.enabled,
            credits_enabled: self.config.cedros_login.credits_enabled,
        });

        let metrics_state = Arc::new(handlers::metrics::MetricsState {
            api_key: self.config.server.admin_metrics_api_key.clone(),
        });

        let auth_state = Arc::new(middleware::AuthState::new(
            self.config.api_key.clone(),
            self.config.admin.public_keys.clone(),
        ));

        let admin_auth_state = Arc::new(middleware::AdminAuthState {
            auth: auth_state,
            store: app_state.store.clone(),
            cedros_login: self.cedros_login_client.clone(),
        });

        let (
            admin_config_state,
            admin_subscriptions_state,
            admin_ai_state,
            admin_ai_assistant_state,
            chat_state,
            storefront_state,
        ) = build_pg_dependent_states(
            self.storage_pg_pool,
            stripe_client_for_admin.clone(),
            app_state.store.clone(),
            self.product_repo.clone(),
        );

        let admin_dashboard_state = Arc::new(handlers::admin::AdminState {
            store: app_state.store.clone(),
            product_repo: self.product_repo.clone(),
            coupon_repo: self.coupon_repo.clone(),
            stripe_client: stripe_client_for_admin,
        });

        let admin_chat_state = Arc::new(handlers::admin_chats::AdminChatState::new(
            app_state.store.clone(),
        ));

        let faqs_state = Arc::new(handlers::faqs::FaqsState::new(app_state.store.clone()));

        let route_prefix = self.config.server.route_prefix.clone();

        RouterStates {
            app_state,
            products_state,
            collections_state,
            subscription_state,
            discovery_state,
            metrics_state,
            health_state: self.health_state,
            store: self.store,
            route_prefix,
            admin_auth_state,
            admin_config_state,
            admin_subscriptions_state,
            admin_ai_state,
            admin_ai_assistant_state,
            admin_dashboard_state,
            chat_state,
            admin_chat_state,
            faqs_state,
            storefront_state,
        }
    }
}

type PgDependentStates = (
    Option<Arc<handlers::admin_config::AdminConfigState>>,
    Option<Arc<handlers::admin_subscriptions::AdminSubscriptionsState>>,
    Option<Arc<handlers::admin_ai::AdminAiState>>,
    Option<Arc<handlers::admin_ai_assistant::AdminAiAssistantState>>,
    Option<Arc<handlers::chat::ChatState>>,
    Option<Arc<handlers::storefront::StorefrontState>>,
);

/// Build states that require a PostgreSQL pool (config, AI, chat, etc.).
///
/// Returns `None` variants for all states when no pool is available.
fn build_pg_dependent_states<S: Store + 'static>(
    storage_pg_pool: Option<sqlx::PgPool>,
    stripe_client: Option<Arc<crate::services::StripeClient>>,
    store: Arc<S>,
    product_repo: Arc<dyn crate::repositories::ProductRepository>,
) -> PgDependentStates {
    match storage_pg_pool {
        Some(pool) => {
            let repo = Arc::new(crate::config::PostgresConfigRepository::new(pool));
            let config_state =
                Arc::new(handlers::admin_config::AdminConfigState { repo: repo.clone() });
            let subscriptions_state =
                Arc::new(handlers::admin_subscriptions::AdminSubscriptionsState {
                    config_repo: repo.clone(),
                    stripe_client,
                });
            let ai_state = Arc::new(handlers::admin_ai::AdminAiState { repo: repo.clone() });
            let ai_assistant_state =
                Arc::new(handlers::admin_ai_assistant::AdminAiAssistantState {
                    repo: repo.clone(),
                    store: store.clone(),
                    product_repo: product_repo.clone(),
                    ai_service: services::AiService::new(),
                    rate_limiter: handlers::admin_ai_assistant::AiRateLimiter::default(),
                    cache: handlers::admin_ai_assistant::AiResponseCache::default(),
                });
            let ai_service = Arc::new(services::AiService::new());
            let storefront_state = Arc::new(handlers::storefront::StorefrontState {
                repo: repo.clone(),
            });
            let chat_state = Arc::new(handlers::chat::ChatState::new(
                store,
                repo,
                product_repo,
                ai_service,
                handlers::admin_ai_assistant::AiRateLimiter::default(),
            ));
            (
                Some(config_state),
                Some(subscriptions_state),
                Some(ai_state),
                Some(ai_assistant_state),
                Some(chat_state),
                Some(storefront_state),
            )
        }
        None => (None, None, None, None, None, None),
    }
}
