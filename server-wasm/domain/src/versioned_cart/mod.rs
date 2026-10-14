//! Production contract for Pay-owned customer cart synchronization.
//!
//! This is deliberately distinct from the priced settlement model
//! `cedros-pay:cart`. Its exact HTTP boundary is compiled here; central route
//! discovery and extension metadata are activated in the coordinated release.

mod apply;
mod authority;
mod authority_inventory;
mod authority_types;
mod authority_validation;
mod commit;
mod generation;
mod http;
mod identity;
mod lane_admission;
mod mutation;
mod provider;
mod rate_cleanup;
mod rate_policy;
mod replacement;
mod replay;
mod snapshot_validation;
mod storage;
mod storage_types;
mod storage_validation;
mod transport;
mod transport_types;
mod types;
mod validation;

use crate::auth::Buyer;
use crate::db::Db;
use crate::error::AppResult;
use crate::seams::HostSeams;

pub use authority::{CartAuthority, ProductionCartAuthority, ResolvedCartCommand};
pub use authority_types::{
    CartWriteRequest, ClientCartItem, ClientCartMutation, ClientCartSnapshot,
};
pub use http::{handle_route, ROUTES, ROUTE_APPLY, ROUTE_OPEN, ROUTE_READ, ROUTE_ROTATE};
pub use provider::TrustedCartProvider;
pub use rate_cleanup::cleanup_expired_rate_windows;
pub use rate_policy::{CartRateKey, CartRateOperation, CartRatePolicy};
pub use transport::{AuthenticatedCartAdapter, DEFAULT_LANE};
pub use transport_types::{CartSnapshot, RotateCartOutcome};
pub use types::{
    ApplyOutcome, CartCommand, CartItemInput, CartLine, CartMutation, CartState, GenerationState,
    RotateGenerationOutcome, ShopCartSnapshot,
};

pub const CONTRACT_ID: &str = "cedros-pay:versioned-cart-write-v1";
pub const CART_MODEL_ID: &str = "cedros-pay:customer-carts";
pub const GENERATION_MODEL_ID: &str = "cedros-pay:customer-cart-generations";
pub const OPERATION_MODEL_ID: &str = "cedros-pay:customer-cart-operations";
pub const TOMBSTONE_MODEL_ID: &str = "cedros-pay:customer-cart-tombstones";
pub const LANE_MODEL_ID: &str = "cedros-pay:customer-cart-lanes";

/// Subject- and provider-scoped service over one host database.
pub struct VersionedCartService<'a, S: HostSeams> {
    seams: &'a S,
    db: Db<'a, S>,
    scope_hash: String,
    provider: String,
}

impl<'a, S: HostSeams> VersionedCartService<'a, S> {
    /// Build only from the result of [`crate::auth::verify_buyer`].
    pub fn from_verified_buyer(
        seams: &'a S,
        buyer: &Buyer,
        provider: TrustedCartProvider,
    ) -> AppResult<Self> {
        validation::subject(&buyer.user_id)?;
        validation::provider(provider.as_str())?;
        Ok(Self {
            seams,
            db: Db::new(seams, crate::ids::DB_ACCESS),
            scope_hash: identity::scope_hash(&buyer.user_id, provider.as_str()),
            provider: provider.as_str().to_string(),
        })
    }
}

#[cfg(test)]
#[path = "tests.rs"]
mod tests;
