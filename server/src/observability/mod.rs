//! Observability module - Prometheus metrics, logging, hooks, and health checks

pub mod hooks;
pub mod metrics;

pub use hooks::{
    CartEvent, CartHook, DatabaseEvent, DatabaseHook, HookRegistry, LoggingHook, PaymentEvent,
    PaymentHook, PaymentMethod, RefundEvent, RefundHook, RpcEvent, RpcHook, WebhookEvent,
    WebhookHook,
};
pub use metrics::{
    dec_http_in_flight, inc_http_in_flight, record_ai_cache_hit, record_ai_call,
    record_ai_rate_limit_rejection, record_circuit_breaker_failure, record_circuit_breaker_state,
    record_coupon_discount, record_coupon_operation, record_db_error, record_db_pool_stats,
    record_db_query, record_http_request, record_payment, record_rate_limit_rejection,
    record_solana_rpc_call, record_solana_tx_confirmation, record_solana_wallet_balance,
    record_stripe_api_call, record_webhook_delivery, record_webhook_queue_size, Metrics,
};
