//! Cached repository wrappers for products and coupons.
//!
//! Wraps underlying repositories with TTL-based caching as per spec 23-repositories.md.

mod config;
mod coupons;
mod products;

pub use config::RepositoryCacheConfig;
pub use coupons::CachedCouponRepository;
pub use products::CachedProductRepository;
