//! Rate limiting middleware with tiered API key support
//!
//! # Security Note: Partner Tier DoS Risk (MED-011)
//!
//! Partner tier bypasses per-IP and per-wallet rate limits but still respects
//! the global rate limit. This design choice has a trade-off:
//!
//! - **Pro**: Partners need high throughput for legitimate bulk operations
//! - **Con**: A compromised Partner API key can consume the entire global limit
//!
//! The global limit protects against total resource exhaustion, but a single
//! malicious Partner could still impact other users by consuming the global budget.
//!
//! **Mitigation options** (not currently implemented):
//! 1. Separate global bucket per API key tier
//! 2. Partner-specific quota tracking with alerts
//! 3. Anomaly detection for sudden traffic spikes
//!
//! Current protection: RL-001 ensures Partner still respects global limit (line 482-484).

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use indexmap::IndexMap;
use tokio::sync::watch;

use axum::{
    body::Body,
    extract::{ConnectInfo, Request},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use parking_lot::Mutex;

use crate::config::types::{ApiKeyTier, RateLimitConfig};
use crate::middleware::auth::AuthContext;
use crate::middleware::extract_wallet_from_request;
use crate::middleware::RealIp;
use crate::observability::record_rate_limit_rejection;

/// Handle for controlling rate limiter cleanup task
pub struct RateLimiterCleanupHandle {
    shutdown_tx: watch::Sender<bool>,
}

impl RateLimiterCleanupHandle {
    /// Signal the cleanup task to shut down gracefully
    pub fn shutdown(&self) {
        let _ = self.shutdown_tx.send(true);
    }
}

/// Maximum number of IP buckets to prevent unbounded memory growth
/// With ~200 bytes per bucket, 10K entries = ~2MB max memory
const MAX_IP_BUCKETS: usize = 10_000;
/// Maximum number of wallet buckets
const MAX_WALLET_BUCKETS: usize = 10_000;

/// Normalize an IP address string to its canonical form.
///
/// This prevents IPv6 rate limit bypass (M-008) by ensuring that equivalent
/// IPv6 representations (different zero compression, uppercase/lowercase hex)
/// all map to the same rate limit bucket.
///
/// Examples:
/// - `2001:db8::1` and `2001:0db8:0000:0000:0000:0000:0000:0001` both become `2001:db8::1`
/// - `::1` and `0:0:0:0:0:0:0:1` both become `::1`
fn normalize_ip(ip: &str) -> String {
    // Parse the IP and convert back to string to get canonical form
    ip.parse::<std::net::IpAddr>()
        .map(|addr| addr.to_string())
        .unwrap_or_else(|_| ip.to_lowercase())
}

/// Rate limit response headers
pub const X_RATELIMIT_LIMIT: &str = "X-RateLimit-Limit";
pub const X_RATELIMIT_REMAINING: &str = "X-RateLimit-Remaining";
pub const X_RATELIMIT_RESET: &str = "X-RateLimit-Reset";

/// Token bucket entry for rate limiting
/// Uses token bucket algorithm for smoother rate limiting
#[derive(Clone)]
struct TokenBucket {
    /// Current token count (can be fractional internally, stored as millitokens)
    tokens: u64,
    /// Last time tokens were updated
    last_update: Instant,
    /// Maximum tokens (bucket capacity in millitokens)
    capacity: u64,
    /// Refill window for the bucket
    window: Duration,
}

impl TokenBucket {
    fn new(capacity: u32, window: Duration) -> Self {
        // Store in millitokens for precision
        let capacity_milli = (capacity as u64) * 1000;

        Self {
            tokens: capacity_milli,
            last_update: Instant::now(),
            capacity: capacity_milli,
            window,
        }
    }

    /// Try to consume a token, returns true if successful
    fn try_consume(&mut self) -> bool {
        self.refill();

        // 1 token = 1000 millitokens
        if self.tokens >= 1000 {
            self.tokens -= 1000;
            true
        } else {
            false
        }
    }

    /// Refill tokens based on elapsed time
    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_update);
        if elapsed.is_zero() {
            return;
        }

        let window_nanos = self.window.as_nanos();
        if window_nanos == 0 {
            self.tokens = self.capacity;
            self.last_update = now;
            return;
        }

        let tokens_to_add = (elapsed.as_nanos() * self.capacity as u128) / window_nanos;

        if tokens_to_add > 0 {
            self.tokens = (self.tokens + tokens_to_add as u64).min(self.capacity);
            self.last_update = now;
        }
    }

    /// Get current available tokens (as whole tokens)
    fn available(&mut self) -> u32 {
        self.refill();
        (self.tokens / 1000) as u32
    }

    /// Get time until next token is available (in seconds)
    fn time_to_next_token(&self) -> u64 {
        if self.capacity == 0 {
            // Config validation should prevent this, but guard to avoid panic.
            return 0;
        }
        let window_nanos = self.window.as_nanos();
        if self.tokens >= 1000 || window_nanos == 0 {
            return 0;
        }
        let needed = 1000 - self.tokens;
        let nanos = (needed as u128 * window_nanos).div_ceil(self.capacity as u128);
        let secs = nanos.div_ceil(1_000_000_000);
        secs as u64
    }
}

/// Rate limiter state using token bucket algorithm
#[derive(Clone)]
pub struct RateLimiter {
    config: RateLimitConfig,
    global: Arc<Mutex<TokenBucket>>,
    /// Per-IP buckets using IndexMap for O(1) LRU eviction
    per_ip: Arc<Mutex<IndexMap<String, TokenBucket>>>,
    /// Per-wallet buckets using IndexMap for O(1) LRU eviction
    per_wallet: Arc<Mutex<IndexMap<String, TokenBucket>>>,
}

impl RateLimiter {
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            global: Arc::new(Mutex::new(TokenBucket::new(
                config.global.limit,
                config.global.window,
            ))),
            per_ip: Arc::new(Mutex::new(IndexMap::new())),
            per_wallet: Arc::new(Mutex::new(IndexMap::new())),
            config,
        }
    }

    /// Check if request is allowed (consumes a token if allowed)
    ///
    /// # Thread Safety
    /// Each bucket operation is protected by a parking_lot::Mutex, ensuring atomic
    /// check-and-consume. There is no TOCTOU race within a single bucket.
    ///
    /// # Design Tradeoffs
    /// This uses sequential checking where tokens are consumed as each check passes.
    /// If a later check fails (e.g., per-IP after global passes), the global token is already
    /// consumed. This is an intentional design tradeoff:
    /// - Prevents attackers from probing limits without consuming tokens
    /// - Avoids holding multiple locks simultaneously (deadlock prevention)
    /// - Simpler implementation without complex atomic multi-bucket operations
    ///
    /// The behavior is: global tokens are consumed before per-IP/wallet checks, which is
    /// slightly more conservative but acceptable for rate limiting (fails closed).
    pub fn check(&self, ip: Option<&str>, wallet: Option<&str>) -> RateLimitResult {
        // Check global limit first - token consumed if passes
        if self.config.global.enabled {
            let mut bucket = self.global.lock();
            if !bucket.try_consume() {
                return RateLimitResult::GlobalExceeded;
            }
        }

        // Check per-IP limit - token consumed if passes
        if self.config.per_ip.enabled {
            if let Some(ip_str) = ip {
                // M-008 FIX: Normalize IPv6 addresses to canonical form to prevent
                // rate limit bypass via different equivalent representations.
                let normalized_ip = normalize_ip(ip_str);
                let mut map = self.per_ip.lock();
                // O(1) eviction: remove first (oldest) entry if at capacity
                if !map.contains_key(&normalized_ip) && map.len() >= MAX_IP_BUCKETS {
                    map.shift_remove_index(0);
                }
                // Move to end for LRU ordering (remove + insert = move to end)
                let allowed = if let Some(mut bucket) = map.shift_remove(&normalized_ip) {
                    let result = bucket.try_consume();
                    map.insert(normalized_ip, bucket);
                    result
                } else {
                    let mut bucket =
                        TokenBucket::new(self.config.per_ip.limit, self.config.per_ip.window);
                    let result = bucket.try_consume();
                    map.insert(normalized_ip, bucket);
                    result
                };
                if !allowed {
                    return RateLimitResult::IpExceeded;
                }
            }
        }

        // Check per-wallet limit - token consumed if passes
        if self.config.per_wallet.enabled {
            if let Some(wallet_str) = wallet {
                let mut map = self.per_wallet.lock();
                // O(1) eviction: remove first (oldest) entry if at capacity
                if !map.contains_key(wallet_str) && map.len() >= MAX_WALLET_BUCKETS {
                    map.shift_remove_index(0);
                }
                // Move to end for LRU ordering (remove + insert = move to end)
                let allowed = if let Some(mut bucket) = map.shift_remove(wallet_str) {
                    let result = bucket.try_consume();
                    map.insert(wallet_str.to_string(), bucket);
                    result
                } else {
                    let mut bucket = TokenBucket::new(
                        self.config.per_wallet.limit,
                        self.config.per_wallet.window,
                    );
                    let result = bucket.try_consume();
                    map.insert(wallet_str.to_string(), bucket);
                    result
                };
                if !allowed {
                    return RateLimitResult::WalletExceeded;
                }
            }
        }

        RateLimitResult::Allowed
    }

    /// Check only global limit (for Enterprise tier per spec)
    /// Enterprise tier bypasses per-IP and per-wallet limits
    pub fn check_global_only(&self) -> RateLimitResult {
        if self.config.global.enabled {
            let mut bucket = self.global.lock();
            if !bucket.try_consume() {
                return RateLimitResult::GlobalExceeded;
            }
        }
        RateLimitResult::Allowed
    }

    /// Cleanup buckets for inactive clients
    pub fn cleanup(&self) {
        let stale_threshold = Duration::from_secs(3600); // 1 hour
        let now = Instant::now();

        // Cleanup per-IP
        let ip_removed = {
            let mut map = self.per_ip.lock();
            let before = map.len();
            map.retain(|_, bucket| now.duration_since(bucket.last_update) < stale_threshold);
            before - map.len()
        };

        // Cleanup per-wallet
        let wallet_removed = {
            let mut map = self.per_wallet.lock();
            let before = map.len();
            map.retain(|_, bucket| now.duration_since(bucket.last_update) < stale_threshold);
            before - map.len()
        };

        if ip_removed > 0 || wallet_removed > 0 {
            tracing::debug!(
                ip_removed = ip_removed,
                wallet_removed = wallet_removed,
                "Rate limiter cleanup completed"
            );
        }
    }

    /// Start background cleanup task that runs every 5 minutes
    /// Returns a handle that can be used to signal graceful shutdown
    pub fn start_cleanup_task(self: &Arc<Self>) -> RateLimiterCleanupHandle {
        let limiter = Arc::clone(self);
        let (shutdown_tx, mut shutdown_rx) = watch::channel(false);

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(300)); // 5 minutes
            interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

            loop {
                tokio::select! {
                    _ = interval.tick() => {
                        limiter.cleanup();
                    }
                    _ = shutdown_rx.changed() => {
                        if *shutdown_rx.borrow() {
                            tracing::info!("Rate limiter cleanup task shutting down");
                            break;
                        }
                    }
                }
            }
        });

        RateLimiterCleanupHandle { shutdown_tx }
    }

    /// Get rate limit info for headers
    pub fn get_info(&self) -> RateLimitInfo {
        let mut bucket = self.global.lock();
        let available = bucket.available();
        let time_to_reset = bucket.time_to_next_token();

        // Reset time is when tokens will be available again, not the entire window
        let reset = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            + time_to_reset;

        RateLimitInfo {
            limit: self.config.global.limit,
            remaining: available,
            reset,
            retry_after: time_to_reset,
        }
    }

    /// Get per-IP rate limit info
    pub fn get_ip_info(&self, ip: &str) -> RateLimitInfo {
        // M-008 FIX: Normalize IPv6 addresses to canonical form
        let normalized_ip = normalize_ip(ip);
        let mut map = self.per_ip.lock();
        // O(1) eviction: remove first (oldest) entry if at capacity
        if !map.contains_key(&normalized_ip) && map.len() >= MAX_IP_BUCKETS {
            map.shift_remove_index(0);
        }
        // Move to end for LRU ordering
        let (available, time_to_reset) = if let Some(mut bucket) = map.shift_remove(&normalized_ip)
        {
            let available = bucket.available();
            let time_to_reset = bucket.time_to_next_token();
            map.insert(normalized_ip, bucket);
            (available, time_to_reset)
        } else {
            let mut bucket = TokenBucket::new(self.config.per_ip.limit, self.config.per_ip.window);
            let available = bucket.available();
            let time_to_reset = bucket.time_to_next_token();
            map.insert(normalized_ip, bucket);
            (available, time_to_reset)
        };

        // Reset time is when tokens will be available again, not the entire window
        let reset = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            + time_to_reset;

        RateLimitInfo {
            limit: self.config.per_ip.limit,
            remaining: available,
            reset,
            retry_after: time_to_reset,
        }
    }

    /// Get per-wallet rate limit info
    pub fn get_wallet_info(&self, wallet: &str) -> RateLimitInfo {
        let mut map = self.per_wallet.lock();
        // O(1) eviction: remove first (oldest) entry if at capacity
        if !map.contains_key(wallet) && map.len() >= MAX_WALLET_BUCKETS {
            map.shift_remove_index(0);
        }
        // Move to end for LRU ordering
        let (available, time_to_reset) = if let Some(mut bucket) = map.shift_remove(wallet) {
            let available = bucket.available();
            let time_to_reset = bucket.time_to_next_token();
            map.insert(wallet.to_string(), bucket);
            (available, time_to_reset)
        } else {
            let mut bucket =
                TokenBucket::new(self.config.per_wallet.limit, self.config.per_wallet.window);
            let available = bucket.available();
            let time_to_reset = bucket.time_to_next_token();
            map.insert(wallet.to_string(), bucket);
            (available, time_to_reset)
        };

        // Reset time is when tokens will be available again, not the entire window
        let reset = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            + time_to_reset;

        RateLimitInfo {
            limit: self.config.per_wallet.limit,
            remaining: available,
            reset,
            retry_after: time_to_reset,
        }
    }
}

/// Rate limit check result
#[derive(Debug, Clone, PartialEq)]
pub enum RateLimitResult {
    Allowed,
    GlobalExceeded,
    IpExceeded,
    WalletExceeded,
}

impl RateLimitResult {
    pub fn is_allowed(&self) -> bool {
        matches!(self, RateLimitResult::Allowed)
    }
}

/// Rate limit info for response headers
#[derive(Debug, Clone)]
pub struct RateLimitInfo {
    pub limit: u32,
    pub remaining: u32,
    pub reset: u64,       // Unix timestamp when bucket fully refills
    pub retry_after: u64, // Seconds until next token available
}

impl RateLimitInfo {
    /// Add rate limit headers to a response
    pub fn add_headers(&self, response: &mut Response) {
        let headers = response.headers_mut();
        // These conversions are infallible - u64 to string to HeaderValue always succeeds
        // Using expect with clear message instead of unwrap for documentation
        if let Ok(limit) = self.limit.to_string().parse() {
            headers.insert(X_RATELIMIT_LIMIT, limit);
        }
        if let Ok(remaining) = self.remaining.to_string().parse() {
            headers.insert(X_RATELIMIT_REMAINING, remaining);
        }
        if let Ok(reset) = self.reset.to_string().parse() {
            headers.insert(X_RATELIMIT_RESET, reset);
        }
    }
}

/// Build 429 Too Many Requests response with headers
fn rate_limit_exceeded_response(info: RateLimitInfo) -> Response {
    let retry_after = if info.retry_after > 0 {
        info.retry_after
    } else {
        // Fallback: calculate from reset time
        info.reset.saturating_sub(
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        )
    };

    let mut response = (
        StatusCode::TOO_MANY_REQUESTS,
        [(header::RETRY_AFTER, retry_after.to_string())],
        "Rate limit exceeded",
    )
        .into_response();

    info.add_headers(&mut response);
    response
}

/// Rate limiting middleware
pub async fn rate_limit_middleware(
    axum::extract::State(limiter): axum::extract::State<Arc<RateLimiter>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request<Body>,
    next: Next,
) -> Response {
    // Check for tier-based exemptions per spec (10-middleware.md)
    // Enterprise: bypass per-IP and per-wallet limits (global still applies)
    // Partner: bypass ALL rate limits
    let auth_ctx = request.extensions().get::<AuthContext>();
    let tier = auth_ctx
        .map(|ctx| &ctx.api_tier)
        .unwrap_or(&ApiKeyTier::Free);
    let tier_str = tier_to_string(tier);

    // RL-001: Partner tier still respects global rate limit for DoS protection
    // Previously bypassed ALL limits, which could allow unlimited requests if key compromised
    if matches!(tier, ApiKeyTier::Partner) {
        let result = limiter.check_global_only();
        let info = limiter.get_info();
        if !result.is_allowed() {
            record_rate_limit_rejection("global", &tier_str);
            return rate_limit_exceeded_response(info);
        }
        let mut response = next.run(request).await;
        info.add_headers(&mut response);
        return response;
    }

    let ip = request
        .extensions()
        .get::<RealIp>()
        .map(|ip| ip.ip().to_string())
        .or_else(|| Some(addr.ip().to_string()));
    let wallet = extract_wallet_from_request(&request);

    // Enterprise tier bypasses per-IP and per-wallet limits (only global applies)
    let result = if matches!(tier, ApiKeyTier::Enterprise) {
        limiter.check_global_only()
    } else {
        limiter.check(ip.as_deref(), wallet.as_deref())
    };

    // Get appropriate info based on what limit was hit
    let info = match &result {
        RateLimitResult::IpExceeded => ip
            .as_ref()
            .map(|i| limiter.get_ip_info(i))
            .unwrap_or_else(|| limiter.get_info()),
        RateLimitResult::WalletExceeded => wallet
            .as_ref()
            .map(|w| limiter.get_wallet_info(w))
            .unwrap_or_else(|| limiter.get_info()),
        _ => limiter.get_info(),
    };

    if result.is_allowed() {
        let mut response = next.run(request).await;
        info.add_headers(&mut response);
        response
    } else {
        // Record rejection metric
        let rejection_type = match &result {
            RateLimitResult::GlobalExceeded => "global",
            RateLimitResult::IpExceeded => "ip",
            RateLimitResult::WalletExceeded => "wallet",
            RateLimitResult::Allowed => "none",
        };
        record_rate_limit_rejection(rejection_type, &tier_str);
        rate_limit_exceeded_response(info)
    }
}

/// Convert API key tier to string for metrics
fn tier_to_string(tier: &ApiKeyTier) -> String {
    match tier {
        ApiKeyTier::Free => "free".to_string(),
        ApiKeyTier::Pro => "pro".to_string(),
        ApiKeyTier::Enterprise => "enterprise".to_string(),
        ApiKeyTier::Partner => "partner".to_string(),
    }
}

/// Rate limiting middleware without connection info (for testing)
#[cfg(test)]
pub async fn rate_limit_middleware_no_addr(
    axum::extract::State(limiter): axum::extract::State<Arc<RateLimiter>>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let wallet = extract_wallet_from_request(&request);

    let result = limiter.check(None, wallet.as_deref());

    let info = match &result {
        RateLimitResult::WalletExceeded => wallet
            .as_ref()
            .map(|w| limiter.get_wallet_info(w))
            .unwrap_or_else(|| limiter.get_info()),
        _ => limiter.get_info(),
    };

    if result.is_allowed() {
        let mut response = next.run(request).await;
        info.add_headers(&mut response);
        response
    } else {
        rate_limit_exceeded_response(info)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{extract::ConnectInfo, routing::get, Router};
    use std::thread::sleep;
    use std::time::Instant;
    use tower::ServiceExt;

    fn test_config() -> RateLimitConfig {
        RateLimitConfig {
            global: crate::config::types::RateLimitSetting {
                enabled: true,
                limit: 10,
                window: Duration::from_secs(1),
            },
            per_ip: crate::config::types::RateLimitSetting {
                enabled: true,
                limit: 5,
                window: Duration::from_secs(1),
            },
            per_wallet: crate::config::types::RateLimitSetting {
                enabled: true,
                limit: 3,
                window: Duration::from_secs(1),
            },
        }
    }

    #[test]
    fn test_token_bucket_basic() {
        let mut bucket = TokenBucket::new(10, Duration::from_secs(1));

        // Should be able to consume up to capacity
        for _ in 0..10 {
            assert!(bucket.try_consume());
        }

        // Should be exhausted
        assert!(!bucket.try_consume());
    }

    #[test]
    fn test_token_bucket_refill() {
        let mut bucket = TokenBucket::new(10, Duration::from_secs(1));

        // Exhaust bucket
        for _ in 0..10 {
            bucket.try_consume();
        }
        assert!(!bucket.try_consume());

        // Wait for refill (at least 100ms for 1 token at 10 tokens/sec)
        sleep(Duration::from_millis(150));

        // Should have at least 1 token
        assert!(bucket.try_consume());
    }

    #[test]
    fn test_token_bucket_refill_low_rate() {
        let mut bucket = TokenBucket::new(1, Duration::from_secs(3600));
        bucket.tokens = 0;
        bucket.last_update = Instant::now() - Duration::from_secs(10);

        bucket.refill();

        assert!(bucket.tokens > 0);
    }

    #[test]
    fn test_token_bucket_time_to_next_token_does_not_panic_on_zero_capacity() {
        let bucket = TokenBucket::new(0, Duration::from_secs(60));
        assert_eq!(bucket.time_to_next_token(), 0);
    }

    #[test]
    fn test_rate_limiter_global() {
        let config = test_config();
        let limiter = RateLimiter::new(config);

        // Should allow up to global limit
        for _ in 0..10 {
            assert_eq!(limiter.check(None, None), RateLimitResult::Allowed);
        }

        // Should be exceeded
        assert_eq!(limiter.check(None, None), RateLimitResult::GlobalExceeded);
    }

    #[test]
    fn test_rate_limiter_per_ip() {
        let config = test_config();
        let limiter = RateLimiter::new(config);

        // Should allow up to per-IP limit (5 is less than global 10)
        for _ in 0..5 {
            assert_eq!(
                limiter.check(Some("192.168.1.1"), None),
                RateLimitResult::Allowed
            );
        }

        // Per-IP should be exceeded
        assert_eq!(
            limiter.check(Some("192.168.1.1"), None),
            RateLimitResult::IpExceeded
        );

        // Different IP should still work
        assert_eq!(
            limiter.check(Some("192.168.1.2"), None),
            RateLimitResult::Allowed
        );
    }

    #[test]
    fn test_rate_limiter_per_wallet() {
        let config = test_config();
        let limiter = RateLimiter::new(config);

        // Should allow up to per-wallet limit (3 is less than per-IP 5)
        for _ in 0..3 {
            assert_eq!(
                limiter.check(Some("192.168.1.1"), Some("wallet1")),
                RateLimitResult::Allowed
            );
        }

        // Per-wallet should be exceeded
        assert_eq!(
            limiter.check(Some("192.168.1.1"), Some("wallet1")),
            RateLimitResult::WalletExceeded
        );

        // Different wallet should still work
        assert_eq!(
            limiter.check(Some("192.168.1.1"), Some("wallet2")),
            RateLimitResult::Allowed
        );
    }

    #[tokio::test]
    async fn test_rate_limit_uses_real_ip_extension() {
        let config = RateLimitConfig {
            global: crate::config::types::RateLimitSetting {
                enabled: false,
                limit: 1,
                window: Duration::from_secs(60),
            },
            per_ip: crate::config::types::RateLimitSetting {
                enabled: true,
                limit: 1,
                window: Duration::from_secs(60),
            },
            per_wallet: crate::config::types::RateLimitSetting {
                enabled: false,
                limit: 1,
                window: Duration::from_secs(60),
            },
        };
        let limiter = Arc::new(RateLimiter::new(config));

        let app = Router::new().route("/", get(|| async { "ok" })).layer(
            axum::middleware::from_fn_with_state(limiter, rate_limit_middleware),
        );

        let peer_addr: SocketAddr = "10.0.0.1:12345".parse().unwrap();

        let mut req1 = axum::http::Request::builder()
            .uri("/")
            .body(Body::empty())
            .unwrap();
        req1.extensions_mut().insert(ConnectInfo(peer_addr));
        req1.extensions_mut()
            .insert(RealIp("1.1.1.1".parse().unwrap()));
        let resp1 = app.clone().oneshot(req1).await.unwrap();
        assert_eq!(resp1.status(), StatusCode::OK);

        let mut req2 = axum::http::Request::builder()
            .uri("/")
            .body(Body::empty())
            .unwrap();
        req2.extensions_mut().insert(ConnectInfo(peer_addr));
        req2.extensions_mut()
            .insert(RealIp("2.2.2.2".parse().unwrap()));
        let resp2 = app.oneshot(req2).await.unwrap();
        assert_eq!(resp2.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_rate_limit_uses_x_wallet_header() {
        let config = RateLimitConfig {
            global: crate::config::types::RateLimitSetting {
                enabled: false,
                limit: 1,
                window: Duration::from_secs(60),
            },
            per_ip: crate::config::types::RateLimitSetting {
                enabled: false,
                limit: 1,
                window: Duration::from_secs(60),
            },
            per_wallet: crate::config::types::RateLimitSetting {
                enabled: true,
                limit: 1,
                window: Duration::from_secs(60),
            },
        };
        let limiter = Arc::new(RateLimiter::new(config));

        let app = Router::new().route("/", get(|| async { "ok" })).layer(
            axum::middleware::from_fn_with_state(limiter, rate_limit_middleware_no_addr),
        );

        let req1 = axum::http::Request::builder()
            .uri("/")
            .header("X-Wallet", "wallet-1")
            .body(Body::empty())
            .unwrap();
        let resp1 = app.clone().oneshot(req1).await.unwrap();
        assert_eq!(resp1.status(), StatusCode::OK);

        let req2 = axum::http::Request::builder()
            .uri("/")
            .header("X-Wallet", "wallet-1")
            .body(Body::empty())
            .unwrap();
        let resp2 = app.oneshot(req2).await.unwrap();
        assert_eq!(resp2.status(), StatusCode::TOO_MANY_REQUESTS);
    }

    // M-008 FIX: Test that IPv6 addresses are normalized to prevent rate limit bypass
    #[test]
    fn test_normalize_ip_v6_canonicalization() {
        // These are all valid, equivalent IPv6 addresses that should normalize to the same key
        let variants = [
            "2001:db8::1",
            "2001:0db8:0000:0000:0000:0000:0000:0001",
            "2001:DB8::1",           // uppercase
            "2001:db8:0:0:0:0:0:1",  // different zero compression
            "2001:0db8:0:0:0:0:0:1", // leading zeros in segments
        ];

        let normalized: Vec<String> = variants.iter().map(|&v| normalize_ip(v)).collect();

        // All variants should normalize to the same canonical form
        for (i, norm) in normalized.iter().enumerate() {
            assert_eq!(
                norm, &normalized[0],
                "IPv6 variant {} ('{}') should normalize to same as variant 0",
                i, variants[i]
            );
        }

        // The canonical form should be lowercase with minimal zero compression
        assert_eq!(normalized[0], "2001:db8::1");
    }

    #[test]
    fn test_normalize_ip_v4_unchanged() {
        // IPv4 addresses should be unchanged (they have no equivalent representations)
        assert_eq!(normalize_ip("192.168.1.1"), "192.168.1.1");
        assert_eq!(normalize_ip("127.0.0.1"), "127.0.0.1");
        assert_eq!(normalize_ip("8.8.8.8"), "8.8.8.8");
    }

    #[test]
    fn test_rate_limiter_ipv6_normalization_prevents_bypass() {
        // M-008: Test that different IPv6 representations share the same rate limit bucket
        let config = RateLimitConfig {
            global: crate::config::types::RateLimitSetting {
                enabled: false,
                limit: 100,
                window: Duration::from_secs(60),
            },
            per_ip: crate::config::types::RateLimitSetting {
                enabled: true,
                limit: 3,
                window: Duration::from_secs(60),
            },
            per_wallet: crate::config::types::RateLimitSetting {
                enabled: false,
                limit: 100,
                window: Duration::from_secs(60),
            },
        };
        let limiter = RateLimiter::new(config);

        // Use different but equivalent IPv6 representations
        // Without normalization, these would be different buckets and bypass the limit
        let ipv6_variant1 = "2001:db8::1";
        let ipv6_variant2 = "2001:0db8:0000:0000:0000:0000:0000:0001";
        let ipv6_variant3 = "2001:DB8::1"; // uppercase

        // All three requests from the "same" IP (different representations)
        assert_eq!(
            limiter.check(Some(ipv6_variant1), None),
            RateLimitResult::Allowed
        );
        assert_eq!(
            limiter.check(Some(ipv6_variant2), None),
            RateLimitResult::Allowed
        );
        assert_eq!(
            limiter.check(Some(ipv6_variant3), None),
            RateLimitResult::Allowed
        );

        // Fourth request should be blocked (limit is 3)
        assert_eq!(
            limiter.check(Some(ipv6_variant1), None),
            RateLimitResult::IpExceeded
        );
    }
}
