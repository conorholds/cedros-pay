//! Circuit breaker pattern implementation

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::RwLock;

use crate::config::CircuitBreakerServiceConfig;
use crate::observability::metrics::CircuitBreakerState as MetricState;
use crate::observability::{record_circuit_breaker_failure, record_circuit_breaker_state};

/// Circuit breaker states
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CircuitBreakerState {
    /// Normal operation - requests pass through
    Closed,
    /// Testing if service recovered - limited requests allowed
    HalfOpen,
    /// Service is down - requests are rejected
    Open,
}

impl From<CircuitBreakerState> for MetricState {
    fn from(state: CircuitBreakerState) -> Self {
        match state {
            CircuitBreakerState::Closed => MetricState::Closed,
            CircuitBreakerState::HalfOpen => MetricState::HalfOpen,
            CircuitBreakerState::Open => MetricState::Open,
        }
    }
}

/// Circuit breaker configuration
#[derive(Debug, Clone)]
pub struct CircuitBreakerConfig {
    /// Service name for metrics/logging
    pub service_name: String,
    /// Maximum requests allowed in half-open state
    pub max_requests: u32,
    /// Stats reset interval
    pub interval: Duration,
    /// Time before transitioning from open to half-open
    pub timeout: Duration,
    /// Consecutive failures to trip breaker
    pub consecutive_failures: u32,
    /// Failure ratio to trip breaker (0.0-1.0)
    pub failure_ratio: f64,
    /// Minimum requests before checking ratio
    pub min_requests: u32,
}

impl CircuitBreakerConfig {
    pub fn from_service_config(service_name: &str, cfg: &CircuitBreakerServiceConfig) -> Self {
        Self {
            service_name: service_name.to_string(),
            max_requests: cfg.max_requests,
            interval: cfg.interval,
            timeout: cfg.timeout,
            consecutive_failures: cfg.consecutive_failures,
            failure_ratio: cfg.failure_ratio,
            min_requests: cfg.min_requests,
        }
    }

    /// Default config for Solana RPC
    pub fn solana_rpc() -> Self {
        Self {
            service_name: "solana_rpc".to_string(),
            max_requests: 3,
            interval: Duration::from_secs(60),
            timeout: Duration::from_secs(30),
            consecutive_failures: 5,
            failure_ratio: 0.5,
            min_requests: 10,
        }
    }

    /// Default config for Stripe API
    pub fn stripe_api() -> Self {
        Self {
            service_name: "stripe_api".to_string(),
            max_requests: 3,
            interval: Duration::from_secs(60),
            timeout: Duration::from_secs(30),
            consecutive_failures: 3,
            failure_ratio: 0.5,
            min_requests: 5,
        }
    }

    /// Default config for webhooks
    pub fn webhook() -> Self {
        Self {
            service_name: "webhook".to_string(),
            max_requests: 5,
            interval: Duration::from_secs(60),
            timeout: Duration::from_secs(60),
            consecutive_failures: 10,
            failure_ratio: 0.7,
            min_requests: 20,
        }
    }
}

/// Statistics for circuit breaker
struct Stats {
    requests: AtomicU64,
    failures: AtomicU64,
    consecutive_failures: AtomicU64,
    consecutive_successes: AtomicU64,
}

impl Stats {
    fn new() -> Self {
        Self {
            requests: AtomicU64::new(0),
            failures: AtomicU64::new(0),
            consecutive_failures: AtomicU64::new(0),
            consecutive_successes: AtomicU64::new(0),
        }
    }

    fn reset(&self) {
        self.requests.store(0, Ordering::SeqCst);
        self.failures.store(0, Ordering::SeqCst);
        self.consecutive_failures.store(0, Ordering::SeqCst);
        self.consecutive_successes.store(0, Ordering::SeqCst);
    }

    fn record_success(&self) {
        self.requests.fetch_add(1, Ordering::SeqCst);
        self.consecutive_failures.store(0, Ordering::SeqCst);
        self.consecutive_successes.fetch_add(1, Ordering::SeqCst);
    }

    fn record_failure(&self) {
        self.requests.fetch_add(1, Ordering::SeqCst);
        self.failures.fetch_add(1, Ordering::SeqCst);
        self.consecutive_failures.fetch_add(1, Ordering::SeqCst);
        self.consecutive_successes.store(0, Ordering::SeqCst);
    }

    fn failure_ratio(&self) -> f64 {
        let requests = self.requests.load(Ordering::SeqCst);
        let failures = self.failures.load(Ordering::SeqCst);
        if requests == 0 {
            0.0
        } else {
            failures as f64 / requests as f64
        }
    }
}

/// Internal state for the circuit breaker
struct BreakerState {
    state: CircuitBreakerState,
    half_open_requests: u32,
    opened_at: Option<Instant>,
    interval_start: Instant,
}

/// Circuit breaker for protecting external service calls
pub struct CircuitBreaker {
    config: CircuitBreakerConfig,
    stats: Stats,
    state: RwLock<BreakerState>,
}

impl CircuitBreaker {
    /// Create a new circuit breaker with the given config
    pub fn new(config: CircuitBreakerConfig) -> Self {
        Self {
            config,
            stats: Stats::new(),
            state: RwLock::new(BreakerState {
                state: CircuitBreakerState::Closed,
                half_open_requests: 0,
                opened_at: None,
                interval_start: Instant::now(),
            }),
        }
    }

    /// Get the current state
    pub fn state(&self) -> CircuitBreakerState {
        self.state.read().state
    }

    /// Check if a request is allowed.
    ///
    /// L-006 FIX: Stats reset is performed while holding the state write lock.
    /// This synchronizes with record_success() and record_failure() which also
    /// acquire the state lock before modifying stats, preventing race conditions.
    pub fn allow(&self) -> bool {
        let mut breaker = self.state.write();

        // L-006: Stats reset inside lock prevents race with record_success/failure.
        // Both this reset and the stats modifications in record_* hold state.write().
        if breaker.interval_start.elapsed() >= self.config.interval {
            self.stats.reset();
            breaker.interval_start = Instant::now();
        }

        match breaker.state {
            CircuitBreakerState::Closed => true,
            CircuitBreakerState::Open => {
                // Check if timeout has elapsed
                if let Some(opened_at) = breaker.opened_at {
                    if opened_at.elapsed() >= self.config.timeout {
                        // Transition to half-open
                        breaker.state = CircuitBreakerState::HalfOpen;
                        breaker.half_open_requests = 0;
                        self.stats.reset();
                        record_circuit_breaker_state(
                            &self.config.service_name,
                            MetricState::HalfOpen,
                        );
                        true
                    } else {
                        false
                    }
                } else {
                    false
                }
            }
            CircuitBreakerState::HalfOpen => {
                // Allow limited requests in half-open
                if breaker.half_open_requests < self.config.max_requests {
                    breaker.half_open_requests += 1;
                    true
                } else {
                    false
                }
            }
        }
    }

    /// Record a successful request
    ///
    /// Acquires state lock BEFORE modifying stats to prevent race with reset()
    pub fn record_success(&self) {
        // Acquire lock first to synchronize with reset() in allow()
        let mut breaker = self.state.write();

        self.stats.record_success();

        if breaker.state == CircuitBreakerState::HalfOpen {
            // Check if we've had enough successes to close
            let successes = self.stats.consecutive_successes.load(Ordering::SeqCst);
            if successes >= self.config.max_requests as u64 {
                breaker.state = CircuitBreakerState::Closed;
                breaker.opened_at = None;
                self.stats.reset();
                record_circuit_breaker_state(&self.config.service_name, MetricState::Closed);
            }
        }
    }

    /// Record a failed request
    ///
    /// Acquires state lock BEFORE modifying stats to prevent race with reset()
    pub fn record_failure(&self) {
        record_circuit_breaker_failure(&self.config.service_name);

        // Acquire lock first to synchronize with reset() in allow()
        let mut breaker = self.state.write();

        self.stats.record_failure();

        match breaker.state {
            CircuitBreakerState::Closed => {
                // Check if we should trip
                let consecutive = self.stats.consecutive_failures.load(Ordering::SeqCst);
                let requests = self.stats.requests.load(Ordering::SeqCst);
                let ratio = self.stats.failure_ratio();

                let should_trip = consecutive >= self.config.consecutive_failures as u64
                    || (requests >= self.config.min_requests as u64
                        && ratio >= self.config.failure_ratio);

                if should_trip {
                    breaker.state = CircuitBreakerState::Open;
                    breaker.opened_at = Some(Instant::now());
                    record_circuit_breaker_state(&self.config.service_name, MetricState::Open);
                }
            }
            CircuitBreakerState::HalfOpen => {
                // Any failure in half-open trips back to open
                breaker.state = CircuitBreakerState::Open;
                breaker.opened_at = Some(Instant::now());
                breaker.half_open_requests = 0;
                record_circuit_breaker_state(&self.config.service_name, MetricState::Open);
            }
            CircuitBreakerState::Open => {}
        }
    }

    /// Execute a function with circuit breaker protection
    pub async fn execute<F, T, E>(&self, f: F) -> Result<T, CircuitBreakerError<E>>
    where
        F: std::future::Future<Output = Result<T, E>>,
    {
        if !self.allow() {
            return Err(CircuitBreakerError::Open);
        }

        match f.await {
            Ok(result) => {
                self.record_success();
                Ok(result)
            }
            Err(e) => {
                self.record_failure();
                Err(CircuitBreakerError::ServiceError(e))
            }
        }
    }
}

/// Error type for circuit breaker operations
#[derive(Debug)]
pub enum CircuitBreakerError<E> {
    /// Circuit is open, request rejected
    Open,
    /// Service returned an error
    ServiceError(E),
}

impl<E: std::fmt::Display> std::fmt::Display for CircuitBreakerError<E> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CircuitBreakerError::Open => write!(f, "circuit breaker is open"),
            CircuitBreakerError::ServiceError(e) => write!(f, "service error: {}", e),
        }
    }
}

impl<E: std::error::Error + 'static> std::error::Error for CircuitBreakerError<E> {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            CircuitBreakerError::ServiceError(e) => Some(e),
            _ => None,
        }
    }
}

/// Thread-safe wrapper for sharing circuit breakers
pub type SharedCircuitBreaker = Arc<CircuitBreaker>;

/// Create a new shared circuit breaker
pub fn new_circuit_breaker(config: CircuitBreakerConfig) -> SharedCircuitBreaker {
    Arc::new(CircuitBreaker::new(config))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_circuit_breaker_closed() {
        let cb = CircuitBreaker::new(CircuitBreakerConfig::stripe_api());
        assert_eq!(cb.state(), CircuitBreakerState::Closed);
        assert!(cb.allow());
    }

    #[test]
    fn test_from_service_config() {
        let service = CircuitBreakerServiceConfig {
            max_requests: 2,
            interval: Duration::from_secs(10),
            timeout: Duration::from_secs(5),
            consecutive_failures: 4,
            failure_ratio: 0.25,
            min_requests: 3,
        };
        let cfg = CircuitBreakerConfig::from_service_config("custom", &service);

        assert_eq!(cfg.service_name, "custom");
        assert_eq!(cfg.max_requests, 2);
        assert_eq!(cfg.interval, Duration::from_secs(10));
        assert_eq!(cfg.timeout, Duration::from_secs(5));
        assert_eq!(cfg.consecutive_failures, 4);
        assert_eq!(cfg.failure_ratio, 0.25);
        assert_eq!(cfg.min_requests, 3);
    }

    #[test]
    fn test_circuit_breaker_trips_on_consecutive_failures() {
        let config = CircuitBreakerConfig {
            service_name: "test".to_string(),
            max_requests: 1,
            interval: Duration::from_secs(60),
            timeout: Duration::from_secs(1),
            consecutive_failures: 3,
            failure_ratio: 0.5,
            min_requests: 10,
        };
        let cb = CircuitBreaker::new(config);

        cb.record_failure();
        cb.record_failure();
        assert_eq!(cb.state(), CircuitBreakerState::Closed);

        cb.record_failure();
        assert_eq!(cb.state(), CircuitBreakerState::Open);
    }
}
