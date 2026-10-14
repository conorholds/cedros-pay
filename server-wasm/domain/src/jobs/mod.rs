//! Host-scheduled jobs, dispatched by [`crate::router`]. Handlers are
//! synchronous, idempotent, and bounded — long sweeps paginate across runs.

pub mod cleanup;
pub mod delivery;
pub mod managed;
pub mod rollup;
pub mod subscription_sync;
pub mod x402_reconcile;
