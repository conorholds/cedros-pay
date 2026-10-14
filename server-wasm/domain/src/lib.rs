//! Cedros Pay extension backend — domain logic.
//!
//! Pure and host-target-testable: every host capability is reached through the
//! [`seams::HostSeams`] trait, so all route and job logic is exercised against
//! [`fake::FakeSeams`] in unit tests. The `guest` crate adapts the real wasm
//! host imports to this trait and compiles the result to `wasm32-wasip2`.
//!
//! Entry points: [`handle_route`], [`run_job`], [`list_routes`], [`list_jobs`].

pub mod auth;
pub mod blockchain_config;
pub mod capacity;
pub mod checkout_contract;
pub mod commerce_orders;
pub mod conditional_batch;
pub mod conditional_mutations;
pub mod crm_events;
pub mod ctx;
pub mod db;
mod db_ops;
mod durable_effects;
pub mod error;
pub mod guarded_batch;
mod guarded_batch_types;
pub mod guarded_policy;
mod host_error;
pub mod ids;
pub mod jobs;
pub mod models;
pub mod money;
pub mod native_store;
pub(crate) mod native_storefront_policy;
pub mod payment_availability;
mod reconciliation_scan;
pub mod regional_payment_policy;
pub mod reqresp;
pub mod router;
pub mod routes;
pub mod seams;
pub mod shared_cache;
pub mod stripe;
pub mod summary;
pub mod time;
pub mod ucp;
pub mod versioned_cart;
mod work_budget;
pub mod x402;

#[cfg(test)]
mod fake;

pub use reqresp::{
    JobExecution, JobOutcome, JobSpec, JobStatus, RouteRequest, RouteResponse, RouteSpec,
};
pub use router::{handle_route, list_jobs, list_routes, run_job};
pub use seams::{HostError, HostResult, HostSeams};
