//! Per-tenant AI rate limiter using token bucket algorithm.

use std::collections::HashMap;
use std::time::{Duration, Instant};

use parking_lot::Mutex;

/// Per-tenant AI rate limiter using token bucket algorithm
pub struct AiRateLimiter {
    /// Tokens per tenant (tenant_id -> bucket)
    buckets: Mutex<HashMap<String, AiTokenBucket>>,
    /// Max requests per minute per tenant
    requests_per_minute: u32,
}

struct AiTokenBucket {
    tokens: f64,
    last_update: Instant,
}

impl Default for AiRateLimiter {
    fn default() -> Self {
        Self::new(10) // Default: 10 requests per minute per tenant
    }
}

impl AiRateLimiter {
    pub fn new(requests_per_minute: u32) -> Self {
        Self {
            buckets: Mutex::new(HashMap::new()),
            requests_per_minute,
        }
    }

    /// Try to consume a token for the given tenant
    /// Returns true if allowed, false if rate limited
    pub fn try_consume(&self, tenant_id: &str) -> bool {
        let mut buckets = self.buckets.lock();
        let now = Instant::now();

        let bucket = buckets
            .entry(tenant_id.to_string())
            .or_insert_with(|| AiTokenBucket {
                tokens: self.requests_per_minute as f64,
                last_update: now,
            });

        // Refill tokens based on elapsed time
        let elapsed = now.duration_since(bucket.last_update).as_secs_f64();
        let refill_rate = self.requests_per_minute as f64 / 60.0; // tokens per second
        bucket.tokens =
            (bucket.tokens + elapsed * refill_rate).min(self.requests_per_minute as f64);
        bucket.last_update = now;

        // Try to consume
        if bucket.tokens >= 1.0 {
            bucket.tokens -= 1.0;
            true
        } else {
            false
        }
    }

    /// Clean up stale buckets (older than 1 hour)
    pub fn cleanup(&self) {
        let mut buckets = self.buckets.lock();
        let now = Instant::now();
        let stale_threshold = Duration::from_secs(3600);
        buckets.retain(|_, bucket| now.duration_since(bucket.last_update) < stale_threshold);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limiter_allows_initial_requests() {
        let limiter = AiRateLimiter::new(5);
        for _ in 0..5 {
            assert!(limiter.try_consume("tenant1"));
        }
        // 6th request should be rate limited
        assert!(!limiter.try_consume("tenant1"));
    }

    #[test]
    fn test_rate_limiter_different_tenants_independent() {
        let limiter = AiRateLimiter::new(2);
        assert!(limiter.try_consume("tenant1"));
        assert!(limiter.try_consume("tenant1"));
        assert!(!limiter.try_consume("tenant1"));
        // tenant2 should still have quota
        assert!(limiter.try_consume("tenant2"));
        assert!(limiter.try_consume("tenant2"));
    }
}
