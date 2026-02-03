use prometheus::{Encoder, TextEncoder};

use super::defs;
use super::REGISTRY;

/// Metrics collector for exposing Prometheus metrics.
pub struct Metrics;

impl Metrics {
    /// Gather all metrics and encode as Prometheus text format.
    pub fn gather() -> String {
        // Initialize all lazy metrics by accessing them.
        let _ = &*defs::HTTP_REQUESTS_TOTAL;
        let _ = &*defs::HTTP_REQUEST_DURATION_SECONDS;
        let _ = &*defs::HTTP_REQUESTS_IN_FLIGHT;
        let _ = &*defs::PAYMENTS_TOTAL;
        let _ = &*defs::PAYMENT_AMOUNT_CENTS;
        let _ = &*defs::PAYMENT_DURATION_SECONDS;
        let _ = &*defs::STRIPE_API_CALLS_TOTAL;
        let _ = &*defs::STRIPE_API_DURATION_SECONDS;
        let _ = &*defs::STRIPE_ERRORS_TOTAL;
        let _ = &*defs::SOLANA_RPC_CALLS_TOTAL;
        let _ = &*defs::SOLANA_RPC_DURATION_SECONDS;
        let _ = &*defs::SOLANA_TX_CONFIRMATIONS_TOTAL;
        let _ = &*defs::SOLANA_WALLET_BALANCE_SOL;
        let _ = &*defs::WEBHOOKS_TOTAL;
        let _ = &*defs::WEBHOOK_DURATION_SECONDS;
        let _ = &*defs::WEBHOOK_QUEUE_SIZE;
        let _ = &*defs::WEBHOOK_DLQ_SIZE;
        let _ = &*defs::COUPON_OPERATIONS_TOTAL;
        let _ = &*defs::COUPON_DISCOUNT_AMOUNT;
        let _ = &*defs::RATE_LIMIT_REJECTIONS_TOTAL;
        let _ = &*defs::CIRCUIT_BREAKER_STATE;
        let _ = &*defs::CIRCUIT_BREAKER_FAILURES_TOTAL;
        let _ = &*defs::DB_QUERIES_TOTAL;
        let _ = &*defs::DB_QUERY_DURATION_SECONDS;
        let _ = &*defs::DB_ERRORS_TOTAL;
        let _ = &*defs::DB_CONNECTIONS_OPEN;
        let _ = &*defs::DB_CONNECTIONS_IDLE;

        let encoder = TextEncoder::new();
        let metric_families = REGISTRY.gather();
        let mut buffer = Vec::new();

        // Encoding can only fail if write fails, which shouldn't happen for Vec.
        if let Err(e) = encoder.encode(&metric_families, &mut buffer) {
            tracing::error!(error = %e, "Failed to encode metrics");
            return String::new();
        }

        String::from_utf8(buffer).unwrap_or_default()
    }
}
