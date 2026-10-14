//! Native-store (Apple App Store + Google Play) receipt verification.
//!
//! The signature-verification primitives live here so the routes that call the
//! store APIs over `http_fetch` can verify the responses before trusting them.
//! Pure RustCrypto (`p256` for Apple ES256 JWS) — component-links under
//! `wasm32-wasip2`, unlike the official store SDKs.

pub mod apple;
pub mod google;
pub mod jws;
