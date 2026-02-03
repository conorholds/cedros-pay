/// Circuit breaker states.
#[derive(Debug, Clone, Copy)]
pub enum CircuitBreakerState {
    Closed,
    HalfOpen,
    Open,
}
