//! Dormant guarded-only policy enrollment and runtime proof validation.
//!
//! This module is intentionally absent from routes, jobs, and extension
//! metadata. Release one may call [`enroll`] from an explicit install/enable
//! lifecycle; consumers remain disabled until a later release validates the
//! durable marker with [`require_active`].

mod contract;
mod enrollment;
mod validation;

pub use contract::{
    model_set_sha256, GuardedPolicyMarker, ACTIVE_POLICY, CAPABILITY_ID, CONTROL_MODEL,
    GUARDED_MODELS, HOST_COMMIT, MARKER_KEY, MIN_DATA_VERSION, MODEL_SET_SHA256,
    REQUEST_SCHEMA_VERSION,
};
pub use enrollment::{enroll, EnrollmentResult};
pub use validation::require_active;

#[cfg(test)]
#[path = "tests.rs"]
mod tests;
