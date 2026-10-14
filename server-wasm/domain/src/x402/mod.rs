//! x402 / Solana crypto payment rail.
//!
//! Pure domain logic handles PDA/ATA derivation, transaction decoding, transfer
//! extraction, amount/recipient/mint/memo checks, and ed25519 verification.
//! On-chain interactions use Solana JSON-RPC through the host `http_fetch` seam.
//! Transaction signing remains host/Wallet-owned.

pub mod ata;
pub mod config;
pub mod gasless;
pub mod managed;
pub mod pricing;
pub mod pubkey;
pub mod refund;
pub mod rpc;
pub mod rpc_expiry;
pub mod transaction;
pub mod transfer;
pub mod verifier;

#[cfg(test)]
pub(crate) mod rpc_fixtures;
