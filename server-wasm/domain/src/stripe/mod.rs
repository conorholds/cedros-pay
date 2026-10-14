//! Stripe integration over the `http.fetch` egress seam.

pub const CHECKOUT_METADATA_MARKER: &str = "cedros_pay_checkout";

pub mod api;
pub mod catalog_sync;
pub mod checkout_api;
pub mod checkout_provider;
