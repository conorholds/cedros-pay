pub mod api_version;
pub mod auth;
pub mod circuit_breaker;
pub mod cors;
pub mod guest_checkout;
pub mod idempotency;
pub mod logging;
pub mod panic_recovery;
pub mod rate_limit;
pub mod real_ip;
pub mod security;
pub mod signature;
pub mod tenant;
pub mod timeout;

pub use api_version::{
    api_version_middleware, api_version_middleware_with_config, ApiVersion, ApiVersionConfig,
    ApiVersionState,
};
pub use auth::{
    admin_middleware, api_key_middleware, auth_middleware, extract_wallet_from_request,
    require_wallet_middleware, AdminAuthState, AuthContext, AuthState,
};
pub use circuit_breaker::{
    new_circuit_breaker, CircuitBreaker, CircuitBreakerConfig, CircuitBreakerError,
    CircuitBreakerState, SharedCircuitBreaker,
};
pub use cors::{build_cors_layer, layer as cors_layer};
pub use idempotency::{
    check_idempotency, idempotency_middleware, save_idempotency, IdempotencyState,
};
pub use logging::{layer as logging_layer, structured_logging_middleware, truncate_address};
pub use panic_recovery::{PanicRecoveryLayer, PanicRecoveryService};
pub use rate_limit::{
    rate_limit_middleware, rate_limit_middleware_no_addr, RateLimitResult, RateLimiter,
    RateLimiterCleanupHandle,
};
pub use real_ip::TrustedProxy;
pub use real_ip::{extract_real_ip, get_real_ip, real_ip_middleware, RealIp};
pub use security::{request_id, security_headers, RequestIdLayer, SecurityHeadersLayer};
pub use signature::{
    verify_admin_from_headers, SignatureVerifyResult, X_MESSAGE, X_SIGNATURE, X_SIGNER,
};
pub use tenant::{
    add_tenant_header, extract_tenant_id, get_tenant_context, tenant_middleware,
    tenant_middleware_required, TenantContext, X_TENANT_ID,
};
