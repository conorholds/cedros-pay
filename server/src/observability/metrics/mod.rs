//! Prometheus metrics implementation
//!
//! # Thread Safety
//! All metrics use `once_cell::sync::Lazy` for lazy initialization, ensuring each
//! metric is registered exactly once regardless of how many threads access it.
//!
//! # Error Handling
//! Metric registration uses `.expect()` which will panic on failure. This is
//! intentional: registration can only fail due to duplicate metric names
//! (programmer error) or fundamental prometheus library issues. Both should
//! cause startup failure rather than silent degradation. We also use a private
//! registry to avoid collisions with other libraries using the global registry.

use once_cell::sync::Lazy;
use prometheus::Registry;

static REGISTRY: Lazy<Registry> = Lazy::new(Registry::new);

mod defs;
mod gather;
mod record;
mod types;

pub use gather::Metrics;
pub use record::{
    dec_http_in_flight, inc_http_in_flight, record_ai_cache_hit, record_ai_call,
    record_ai_rate_limit_rejection, record_circuit_breaker_failure, record_circuit_breaker_state,
    record_coupon_discount, record_coupon_operation, record_db_error, record_db_pool_stats,
    record_db_query, record_http_request, record_payment, record_rate_limit_rejection,
    record_solana_rpc_call, record_solana_tx_confirmation, record_solana_wallet_balance,
    record_stripe_api_call, record_stripe_error, record_webhook_delivery, record_webhook_dlq_size,
    record_webhook_queue_size,
};
pub use types::CircuitBreakerState;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_http_in_flight_gauge_updates() {
        let start = defs::HTTP_REQUESTS_IN_FLIGHT.get();
        inc_http_in_flight();
        assert_eq!(defs::HTTP_REQUESTS_IN_FLIGHT.get(), start + 1.0);
        dec_http_in_flight();
        assert_eq!(defs::HTTP_REQUESTS_IN_FLIGHT.get(), start);
    }

    #[test]
    fn test_webhook_queue_size_records_dequeued() {
        record_webhook_queue_size("dequeued", 3);
        let value = defs::WEBHOOK_QUEUE_SIZE
            .with_label_values(&["dequeued"])
            .get();
        assert_eq!(value, 3.0);
    }

    #[test]
    fn test_metrics_gather_is_repeatable() {
        let first = Metrics::gather();
        let second = Metrics::gather();
        assert!(!first.is_empty());
        assert!(!second.is_empty());
    }
}
