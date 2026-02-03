pub mod cached;
pub mod coupons;
pub mod factory;
pub mod memory;
pub mod postgres;
pub mod products;
pub mod transactional_ops;

pub use cached::{CachedCouponRepository, CachedProductRepository, RepositoryCacheConfig};
pub use coupons::{CouponRepository, CouponRepositoryError};
pub use factory::{
    new_coupon_repository, new_coupon_repository_with_pool, new_product_repository,
    new_product_repository_with_pool, CouponBackend, CouponRepositoryConfig,
    DisabledCouponRepository, ProductBackend, ProductRepositoryConfig,
};
pub use memory::{InMemoryCouponRepository, InMemoryProductRepository};
pub use postgres::{PostgresCouponRepository, PostgresProductRepository};
pub use products::{ProductRepository, ProductRepositoryError};
pub use transactional_ops::TransactionalOps;
