//! PostgreSQL-backed product and coupon repositories

mod coupons;
mod products;
mod validation;

pub use coupons::PostgresCouponRepository;
pub use products::PostgresProductRepository;
pub use validation::validate_table_name;
