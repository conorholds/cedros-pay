use once_cell::sync::Lazy;
use prometheus::{
    register_counter_vec_with_registry, register_gauge_vec_with_registry,
    register_gauge_with_registry, register_histogram_vec_with_registry, CounterVec, Gauge,
    GaugeVec, HistogramVec,
};

use super::REGISTRY;

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Metrics
// ─────────────────────────────────────────────────────────────────────────────

pub(super) static HTTP_REQUESTS_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    register_counter_vec_with_registry!(
        "http_requests_total",
        "Total number of HTTP requests",
        &["method", "path", "status"],
        REGISTRY.clone()
    )
    .expect("http_requests_total metric")
});

pub(super) static HTTP_REQUEST_DURATION_SECONDS: Lazy<HistogramVec> = Lazy::new(|| {
    register_histogram_vec_with_registry!(
        "http_request_duration_seconds",
        "HTTP request latency in seconds",
        &["method", "path"],
        vec![0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
        REGISTRY.clone()
    )
    .expect("http_request_duration_seconds metric")
});

pub(super) static HTTP_REQUESTS_IN_FLIGHT: Lazy<Gauge> = Lazy::new(|| {
    register_gauge_with_registry!(
        "http_requests_in_flight",
        "Current number of active HTTP requests",
        REGISTRY.clone()
    )
    .expect("http_requests_in_flight metric")
});

// ─────────────────────────────────────────────────────────────────────────────
// Payment Metrics
// ─────────────────────────────────────────────────────────────────────────────

pub(super) static PAYMENTS_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    register_counter_vec_with_registry!(
        "payments_total",
        "Total number of payment attempts",
        &["method", "resource", "success"],
        REGISTRY.clone()
    )
    .expect("payments_total metric")
});

pub(super) static PAYMENT_AMOUNT_CENTS: Lazy<HistogramVec> = Lazy::new(|| {
    register_histogram_vec_with_registry!(
        "payment_amount_cents",
        "Payment amounts in cents",
        &["method", "currency"],
        vec![100.0, 500.0, 1000.0, 2500.0, 5000.0, 10000.0, 25000.0, 50000.0, 100000.0],
        REGISTRY.clone()
    )
    .expect("payment_amount_cents metric")
});

pub(super) static PAYMENT_DURATION_SECONDS: Lazy<HistogramVec> = Lazy::new(|| {
    register_histogram_vec_with_registry!(
        "payment_duration_seconds",
        "Payment processing time in seconds",
        &["method"],
        vec![0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0],
        REGISTRY.clone()
    )
    .expect("payment_duration_seconds metric")
});

// ─────────────────────────────────────────────────────────────────────────────
// Stripe Metrics
// ─────────────────────────────────────────────────────────────────────────────

pub(super) static STRIPE_API_CALLS_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    register_counter_vec_with_registry!(
        "stripe_api_calls_total",
        "Total Stripe API calls",
        &["operation", "status"],
        REGISTRY.clone()
    )
    .expect("stripe_api_calls_total metric")
});

pub(super) static STRIPE_API_DURATION_SECONDS: Lazy<HistogramVec> = Lazy::new(|| {
    register_histogram_vec_with_registry!(
        "stripe_api_duration_seconds",
        "Stripe API call latency in seconds",
        &["operation"],
        vec![0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
        REGISTRY.clone()
    )
    .expect("stripe_api_duration_seconds metric")
});

pub(super) static STRIPE_ERRORS_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    register_counter_vec_with_registry!(
        "stripe_errors_total",
        "Total Stripe API errors",
        &["operation", "error_type"],
        REGISTRY.clone()
    )
    .expect("stripe_errors_total metric")
});

// ─────────────────────────────────────────────────────────────────────────────
// Solana Metrics
// ─────────────────────────────────────────────────────────────────────────────

pub(super) static SOLANA_RPC_CALLS_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    register_counter_vec_with_registry!(
        "solana_rpc_calls_total",
        "Total Solana RPC calls",
        &["method", "status"],
        REGISTRY.clone()
    )
    .expect("solana_rpc_calls_total metric")
});

pub(super) static SOLANA_RPC_DURATION_SECONDS: Lazy<HistogramVec> = Lazy::new(|| {
    register_histogram_vec_with_registry!(
        "solana_rpc_duration_seconds",
        "Solana RPC call latency in seconds",
        &["method"],
        vec![0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
        REGISTRY.clone()
    )
    .expect("solana_rpc_duration_seconds metric")
});

pub(super) static SOLANA_TX_CONFIRMATIONS_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    register_counter_vec_with_registry!(
        "solana_tx_confirmations_total",
        "Total transaction confirmation results",
        &["status"],
        REGISTRY.clone()
    )
    .expect("solana_tx_confirmations_total metric")
});

pub(super) static SOLANA_WALLET_BALANCE_SOL: Lazy<GaugeVec> = Lazy::new(|| {
    register_gauge_vec_with_registry!(
        "solana_wallet_balance_sol",
        "Wallet balances in SOL",
        &["wallet"],
        REGISTRY.clone()
    )
    .expect("solana_wallet_balance_sol metric")
});

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Metrics
// ─────────────────────────────────────────────────────────────────────────────

pub(super) static WEBHOOKS_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    register_counter_vec_with_registry!(
        "webhooks_total",
        "Total webhook delivery attempts",
        &["event_type", "status"],
        REGISTRY.clone()
    )
    .expect("webhooks_total metric")
});

pub(super) static WEBHOOK_DURATION_SECONDS: Lazy<HistogramVec> = Lazy::new(|| {
    register_histogram_vec_with_registry!(
        "webhook_duration_seconds",
        "Webhook delivery latency in seconds",
        &["event_type"],
        vec![0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
        REGISTRY.clone()
    )
    .expect("webhook_duration_seconds metric")
});

pub(super) static WEBHOOK_QUEUE_SIZE: Lazy<GaugeVec> = Lazy::new(|| {
    register_gauge_vec_with_registry!(
        "webhook_queue_size",
        "Webhook queue sizes by status (pending, dequeued, dlq)",
        &["status"],
        REGISTRY.clone()
    )
    .expect("webhook_queue_size metric")
});

pub(super) static WEBHOOK_DLQ_SIZE: Lazy<Gauge> = Lazy::new(|| {
    register_gauge_with_registry!(
        "webhook_dlq_size",
        "Webhook dead letter queue size",
        REGISTRY.clone()
    )
    .expect("webhook_dlq_size metric")
});

// ─────────────────────────────────────────────────────────────────────────────
// Coupon Metrics
// ─────────────────────────────────────────────────────────────────────────────

pub(super) static COUPON_OPERATIONS_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    register_counter_vec_with_registry!(
        "coupon_operations_total",
        "Total coupon operations (apply, increment, etc.)",
        &["operation", "status"],
        REGISTRY.clone()
    )
    .expect("coupon_operations_total metric")
});

pub(super) static COUPON_DISCOUNT_AMOUNT: Lazy<HistogramVec> = Lazy::new(|| {
    register_histogram_vec_with_registry!(
        "coupon_discount_amount",
        "Coupon discount amounts applied (in atomic units)",
        &["coupon_type"],
        vec![100.0, 500.0, 1000.0, 5000.0, 10000.0, 50000.0, 100000.0],
        REGISTRY.clone()
    )
    .expect("coupon_discount_amount metric")
});

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limit Metrics
// ─────────────────────────────────────────────────────────────────────────────

pub(super) static RATE_LIMIT_REJECTIONS_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    register_counter_vec_with_registry!(
        "rate_limit_rejections_total",
        "Total rate limit rejections",
        &["type", "tier"],
        REGISTRY.clone()
    )
    .expect("rate_limit_rejections_total metric")
});

// ─────────────────────────────────────────────────────────────────────────────
// Circuit Breaker Metrics
// ─────────────────────────────────────────────────────────────────────────────

pub(super) static CIRCUIT_BREAKER_STATE: Lazy<GaugeVec> = Lazy::new(|| {
    register_gauge_vec_with_registry!(
        "circuit_breaker_state",
        "Circuit breaker state (0=closed, 1=half-open, 2=open)",
        &["service"],
        REGISTRY.clone()
    )
    .expect("circuit_breaker_state metric")
});

pub(super) static CIRCUIT_BREAKER_FAILURES_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    register_counter_vec_with_registry!(
        "circuit_breaker_failures_total",
        "Total circuit breaker failures",
        &["service"],
        REGISTRY.clone()
    )
    .expect("circuit_breaker_failures_total metric")
});

// ─────────────────────────────────────────────────────────────────────────────
// Database Metrics
// ─────────────────────────────────────────────────────────────────────────────

pub(super) static DB_QUERIES_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    register_counter_vec_with_registry!(
        "db_queries_total",
        "Total database queries",
        &["operation", "table"],
        REGISTRY.clone()
    )
    .expect("db_queries_total metric")
});

pub(super) static DB_QUERY_DURATION_SECONDS: Lazy<HistogramVec> = Lazy::new(|| {
    register_histogram_vec_with_registry!(
        "db_query_duration_seconds",
        "Database query latency in seconds",
        &["operation", "table"],
        vec![0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
        REGISTRY.clone()
    )
    .expect("db_query_duration_seconds metric")
});

pub(super) static DB_ERRORS_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    register_counter_vec_with_registry!(
        "db_errors_total",
        "Total database errors",
        &["operation", "table", "error"],
        REGISTRY.clone()
    )
    .expect("db_errors_total metric")
});

pub(super) static DB_CONNECTIONS_OPEN: Lazy<Gauge> = Lazy::new(|| {
    register_gauge_with_registry!(
        "db_connections_open",
        "Number of open database connections in the pool",
        REGISTRY.clone()
    )
    .expect("db_connections_open metric")
});

pub(super) static DB_CONNECTIONS_IDLE: Lazy<Gauge> = Lazy::new(|| {
    register_gauge_with_registry!(
        "db_connections_idle",
        "Number of idle database connections in the pool",
        REGISTRY.clone()
    )
    .expect("db_connections_idle metric")
});

// ─────────────────────────────────────────────────────────────────────────────
// AI Metrics
// ─────────────────────────────────────────────────────────────────────────────

pub(super) static AI_CALLS_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    register_counter_vec_with_registry!(
        "ai_calls_total",
        "Total AI API calls",
        &["provider", "model", "task", "status"],
        REGISTRY.clone()
    )
    .expect("ai_calls_total metric")
});

pub(super) static AI_CALL_DURATION_SECONDS: Lazy<HistogramVec> = Lazy::new(|| {
    register_histogram_vec_with_registry!(
        "ai_call_duration_seconds",
        "AI API call latency in seconds",
        &["provider", "model"],
        vec![0.5, 1.0, 2.0, 5.0, 10.0, 15.0, 20.0, 30.0],
        REGISTRY.clone()
    )
    .expect("ai_call_duration_seconds metric")
});

pub(super) static AI_RATE_LIMIT_REJECTIONS_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    register_counter_vec_with_registry!(
        "ai_rate_limit_rejections_total",
        "Total AI rate limit rejections",
        &["tenant"],
        REGISTRY.clone()
    )
    .expect("ai_rate_limit_rejections_total metric")
});

pub(super) static AI_CACHE_HITS_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    register_counter_vec_with_registry!(
        "ai_cache_hits_total",
        "Total AI response cache hits",
        &["task"],
        REGISTRY.clone()
    )
    .expect("ai_cache_hits_total metric")
});
