use super::defs;
use super::types::CircuitBreakerState;

/// Record an HTTP request.
pub fn record_http_request(method: &str, path: &str, status: u16, duration_secs: f64) {
    defs::HTTP_REQUESTS_TOTAL
        .with_label_values(&[method, path, &status.to_string()])
        .inc();
    defs::HTTP_REQUEST_DURATION_SECONDS
        .with_label_values(&[method, path])
        .observe(duration_secs);
}

/// Increment in-flight requests.
pub fn inc_http_in_flight() {
    defs::HTTP_REQUESTS_IN_FLIGHT.inc();
}

/// Decrement in-flight requests.
pub fn dec_http_in_flight() {
    defs::HTTP_REQUESTS_IN_FLIGHT.dec();
}

/// Record a payment attempt.
pub fn record_payment(
    method: &str,
    resource: &str,
    success: bool,
    amount_cents: Option<i64>,
    currency: Option<&str>,
    duration_secs: f64,
) {
    let success_str = if success { "true" } else { "false" };
    defs::PAYMENTS_TOTAL
        .with_label_values(&[method, resource, success_str])
        .inc();
    defs::PAYMENT_DURATION_SECONDS
        .with_label_values(&[method])
        .observe(duration_secs);

    if let (Some(amount), Some(curr)) = (amount_cents, currency) {
        defs::PAYMENT_AMOUNT_CENTS
            .with_label_values(&[method, curr])
            .observe(amount as f64);
    }
}

/// Record a Stripe API call.
pub fn record_stripe_api_call(operation: &str, status: &str, duration_secs: f64) {
    defs::STRIPE_API_CALLS_TOTAL
        .with_label_values(&[operation, status])
        .inc();
    defs::STRIPE_API_DURATION_SECONDS
        .with_label_values(&[operation])
        .observe(duration_secs);
}

/// Record a Stripe error.
pub fn record_stripe_error(operation: &str, error_type: &str) {
    defs::STRIPE_ERRORS_TOTAL
        .with_label_values(&[operation, error_type])
        .inc();
}

/// Record a Solana RPC call.
pub fn record_solana_rpc_call(method: &str, success: bool, duration_secs: f64) {
    let status = if success { "success" } else { "error" };
    defs::SOLANA_RPC_CALLS_TOTAL
        .with_label_values(&[method, status])
        .inc();
    defs::SOLANA_RPC_DURATION_SECONDS
        .with_label_values(&[method])
        .observe(duration_secs);
}

/// Record a transaction confirmation result.
pub fn record_solana_tx_confirmation(status: &str) {
    defs::SOLANA_TX_CONFIRMATIONS_TOTAL
        .with_label_values(&[status])
        .inc();
}

/// Record a wallet balance.
pub fn record_solana_wallet_balance(wallet: &str, balance_sol: f64) {
    defs::SOLANA_WALLET_BALANCE_SOL
        .with_label_values(&[wallet])
        .set(balance_sol);
}

/// Record a webhook delivery attempt.
pub fn record_webhook_delivery(event_type: &str, success: bool, duration_secs: f64) {
    let status = if success { "success" } else { "failed" };
    defs::WEBHOOKS_TOTAL
        .with_label_values(&[event_type, status])
        .inc();
    defs::WEBHOOK_DURATION_SECONDS
        .with_label_values(&[event_type])
        .observe(duration_secs);
}

/// Record webhook queue sizes.
pub fn record_webhook_queue_size(status: &str, size: i64) {
    defs::WEBHOOK_QUEUE_SIZE
        .with_label_values(&[status])
        .set(size as f64);
}

/// Record DLQ size.
pub fn record_webhook_dlq_size(size: i64) {
    defs::WEBHOOK_DLQ_SIZE.set(size as f64);
}

/// Record a coupon operation (apply, increment, etc.).
///
/// # Arguments
/// * `operation` - The operation type: "apply", "increment", "validate"
/// * `status` - The result: "success", "failed", "limit_reached", "not_found", "expired"
pub fn record_coupon_operation(operation: &str, status: &str) {
    defs::COUPON_OPERATIONS_TOTAL
        .with_label_values(&[operation, status])
        .inc();
}

/// Record a coupon discount amount.
///
/// # Arguments
/// * `coupon_type` - The coupon type: "percentage", "fixed"
/// * `amount_atomic` - The discount amount in atomic units
pub fn record_coupon_discount(coupon_type: &str, amount_atomic: i64) {
    defs::COUPON_DISCOUNT_AMOUNT
        .with_label_values(&[coupon_type])
        .observe(amount_atomic as f64);
}

/// Record a rate limit rejection.
pub fn record_rate_limit_rejection(rejection_type: &str, tier: &str) {
    defs::RATE_LIMIT_REJECTIONS_TOTAL
        .with_label_values(&[rejection_type, tier])
        .inc();
}

/// Record circuit breaker state.
pub fn record_circuit_breaker_state(service: &str, state: CircuitBreakerState) {
    let value = match state {
        CircuitBreakerState::Closed => 0.0,
        CircuitBreakerState::HalfOpen => 1.0,
        CircuitBreakerState::Open => 2.0,
    };
    defs::CIRCUIT_BREAKER_STATE
        .with_label_values(&[service])
        .set(value);
}

/// Record a circuit breaker failure.
pub fn record_circuit_breaker_failure(service: &str) {
    defs::CIRCUIT_BREAKER_FAILURES_TOTAL
        .with_label_values(&[service])
        .inc();
}

/// Record a database query.
pub fn record_db_query(operation: &str, table: &str, duration_secs: f64) {
    defs::DB_QUERIES_TOTAL
        .with_label_values(&[operation, table])
        .inc();
    defs::DB_QUERY_DURATION_SECONDS
        .with_label_values(&[operation, table])
        .observe(duration_secs);
}

/// Record a database error.
pub fn record_db_error(operation: &str, table: &str, error: &str) {
    defs::DB_ERRORS_TOTAL
        .with_label_values(&[operation, table, error])
        .inc();
}

/// Record database connection pool stats.
pub fn record_db_pool_stats(open: u32, idle: u32) {
    defs::DB_CONNECTIONS_OPEN.set(open as f64);
    defs::DB_CONNECTIONS_IDLE.set(idle as f64);
}

/// Record an AI API call.
///
/// # Arguments
/// * `provider` - The AI provider: "openai", "gemini"
/// * `model` - The model ID used
/// * `task` - The AI task: "seo", "tags", "categories", "short_desc"
/// * `success` - Whether the call succeeded
/// * `duration_secs` - The call latency in seconds
pub fn record_ai_call(provider: &str, model: &str, task: &str, success: bool, duration_secs: f64) {
    let status = if success { "success" } else { "error" };
    defs::AI_CALLS_TOTAL
        .with_label_values(&[provider, model, task, status])
        .inc();
    defs::AI_CALL_DURATION_SECONDS
        .with_label_values(&[provider, model])
        .observe(duration_secs);
}

/// Record an AI rate limit rejection.
pub fn record_ai_rate_limit_rejection(tenant: &str) {
    defs::AI_RATE_LIMIT_REJECTIONS_TOTAL
        .with_label_values(&[tenant])
        .inc();
}

/// Record an AI cache hit.
pub fn record_ai_cache_hit(task: &str) {
    defs::AI_CACHE_HITS_TOTAL.with_label_values(&[task]).inc();
}
