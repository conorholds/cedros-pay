fn env_var(name: &str) -> Option<String> {
    env::var(name).ok().filter(|v| !v.is_empty())
}

fn env_bool(name: &str) -> Option<bool> {
    env_var(name).and_then(|v| v.parse().ok())
}

fn env_float(name: &str) -> Option<f64> {
    env_var(name).and_then(|v| v.parse().ok())
}

fn env_duration(name: &str) -> Option<Duration> {
    env_var(name).and_then(|v| humantime::parse_duration(&v).ok())
}

fn collect_sequential_env(prefix: &str) -> Vec<String> {
    let mut items = Vec::new();
    for idx in 1..=100 {
        let key = format!("{prefix}{idx}");
        if let Some(val) = env_var(&key) {
            // Remove all whitespace (newlines, spaces) from env vars - important for base58 keys
            let cleaned: String = val.chars().filter(|c| !c.is_whitespace()).collect();
            items.push(cleaned);
        } else {
            break;
        }
    }
    items
}

fn parse_product_source(value: &str) -> Option<ProductSource> {
    match value.to_ascii_lowercase().as_str() {
        "memory" => Some(ProductSource::Memory),
        "postgres" => Some(ProductSource::Postgres),
        _ => None,
    }
}

fn parse_coupon_source(value: &str) -> Option<CouponSource> {
    match value.to_ascii_lowercase().as_str() {
        "memory" => Some(CouponSource::Memory),
        "postgres" => Some(CouponSource::Postgres),
        "disabled" => Some(CouponSource::Disabled),
        _ => None,
    }
}

fn parse_api_key_entry(value: &str) -> Option<ApiKeyEntry> {
    let mut parts = value.splitn(2, ':');
    let first = parts.next()?;
    let second = parts.next();

    let (tier, key) = if let Some(actual_key) = second {
        (parse_api_tier(first), actual_key.to_string())
    } else {
        (ApiKeyTier::Free, first.to_string())
    };

    // Env parsing currently supports tier + key only. Tenant binding is expected
    // to be configured via YAML (api_key.keys) for multi-tenant deployments.
    Some(ApiKeyEntry {
        key,
        tier,
        allowed_tenants: Vec::new(),
    })
}

fn parse_api_tier(value: &str) -> ApiKeyTier {
    match value.to_ascii_lowercase().as_str() {
        "pro" => ApiKeyTier::Pro,
        "enterprise" => ApiKeyTier::Enterprise,
        "partner" => ApiKeyTier::Partner,
        _ => ApiKeyTier::Free,
    }
}

fn normalize_route_prefix(prefix: &str) -> String {
    if prefix.is_empty() {
        return String::new();
    }
    let mut normalized = prefix.trim().to_string();
    if !normalized.starts_with('/') {
        normalized = format!("/{}", normalized);
    }
    while normalized.ends_with('/') && normalized.len() > 1 {
        normalized.pop();
    }
    normalized
}

fn format_header_key(raw: &str) -> String {
    raw.split('_')
        .filter(|p| !p.is_empty())
        .map(|p| {
            let mut chars = p.chars();
            match chars.next() {
                Some(first) => first.to_string().to_uppercase() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join("-")
}

/// Derive WebSocket URL from RPC URL per spec (09-configuration.md)
fn derive_websocket_url(rpc_url: &str) -> String {
    if rpc_url.starts_with("https://") {
        rpc_url.replacen("https://", "wss://", 1)
    } else if rpc_url.starts_with("http://") {
        rpc_url.replacen("http://", "ws://", 1)
    } else {
        rpc_url.to_string()
    }
}

fn default_read_timeout() -> Option<Duration> {
    Some(Duration::from_secs(30))
}

fn default_write_timeout() -> Option<Duration> {
    Some(Duration::from_secs(30))
}

fn default_idle_timeout() -> Option<Duration> {
    Some(Duration::from_secs(120))
}

fn default_server_address() -> String {
    ":8080".to_string()
}

fn default_cors_origins() -> Vec<String> {
    Vec::new()
}

fn default_log_level() -> String {
    "info".to_string()
}

fn default_log_format() -> String {
    "json".to_string()
}

fn default_log_environment() -> String {
    "production".to_string()
}

fn default_stripe_mode() -> String {
    DEFAULT_STRIPE_MODE.to_string()
}

fn default_token_decimals() -> u8 {
    6
}

fn default_token_symbol() -> String {
    "USDC".to_string()
}

fn default_x402_network() -> String {
    DEFAULT_X402_NETWORK.to_string()
}

fn default_memo_prefix() -> String {
    DEFAULT_MEMO_PREFIX.to_string()
}

fn default_commitment() -> String {
    DEFAULT_COMMITMENT.to_string()
}

fn default_allowed_tokens() -> Vec<String> {
    vec![
        "USDC".to_string(),
        "USDT".to_string(),
        "PYUSD".to_string(),
        "CASH".to_string(),
    ]
}

fn default_compute_unit_limit() -> u32 {
    200_000
}

fn default_compute_unit_price() -> u64 {
    1
}

fn default_rounding_mode() -> String {
    "standard".to_string()
}

fn default_tx_queue_min_time_between() -> Option<Duration> {
    Some(Duration::from_millis(100))
}

fn default_tx_queue_max_in_flight() -> usize {
    10
}

fn default_pg_max_open() -> u32 {
    25
}

fn default_pg_max_idle() -> u32 {
    5
}

fn default_pg_conn_max_lifetime() -> Duration {
    Duration::from_secs(300)
}

fn default_payments_table() -> String {
    "payment_transactions".to_string()
}

fn default_sessions_table() -> String {
    "stripe_sessions".to_string()
}

fn default_products_table() -> String {
    "products".to_string()
}

fn default_coupons_table() -> String {
    "coupons".to_string()
}

fn default_cart_quotes_table() -> String {
    "cart_quotes".to_string()
}

fn default_refund_quotes_table() -> String {
    "refund_quotes".to_string()
}

fn default_admin_nonces_table() -> String {
    "admin_nonces".to_string()
}

fn default_webhook_queue_table() -> String {
    "webhook_queue".to_string()
}

fn default_credits_holds_table() -> String {
    "credits_holds".to_string()
}

fn default_cart_quote_ttl() -> Duration {
    Duration::from_secs(15 * 60)
}

fn default_refund_quote_ttl() -> Duration {
    Duration::from_secs(15 * 60)
}

fn default_inventory_holds_enabled() -> bool {
    true
}

/// Default for payment method enabled flags (backwards compat: enabled by default)
pub fn default_true() -> bool {
    true
}

fn default_inventory_hold_ttl() -> Duration {
    Duration::from_secs(15 * 60)
}

fn default_quote_ttl() -> Duration {
    Duration::from_secs(5 * 60)
}

fn default_product_cache_ttl() -> Duration {
    Duration::from_secs(5 * 60)
}

fn default_coupon_cache_ttl() -> Duration {
    Duration::from_secs(60)
}

fn default_subscription_backend() -> StorageBackend {
    StorageBackend::Memory
}

fn default_grace_period_hours() -> u32 {
    0
}

fn default_retry_max_attempts() -> u32 {
    WEBHOOK_MAX_ATTEMPTS
}

fn default_retry_initial_interval() -> Duration {
    Duration::from_secs(1)
}

fn default_retry_max_interval() -> Duration {
    Duration::from_secs(5 * 60)
}

fn default_retry_multiplier() -> f64 {
    2.0
}

fn default_retry_timeout() -> Duration {
    Duration::from_secs(10)
}

fn default_retry_enabled() -> bool {
    true
}

fn default_retry_jitter() -> f64 {
    0.2 // ±20% variance to prevent thundering herd
}

/// Default callback timeout per spec (09-configuration.md line 158): 3s
fn default_callback_timeout() -> Duration {
    Duration::from_secs(3)
}

fn default_low_balance_threshold() -> f64 {
    0.01
}

fn default_monitoring_interval() -> Duration {
    Duration::from_secs(15 * 60)
}

fn default_monitoring_timeout() -> Duration {
    Duration::from_secs(5)
}

fn default_rate_limit_window() -> Duration {
    Duration::from_secs(60)
}

fn default_cb_enabled() -> bool {
    true
}

fn default_cb_max_requests() -> u32 {
    3
}

fn default_cb_interval() -> Duration {
    Duration::from_secs(60)
}

fn default_cb_timeout() -> Duration {
    Duration::from_secs(30)
}

fn default_cb_failure_ratio() -> f64 {
    0.5
}
