//! Bounded confirmation polling for `/paywall/v1/verify` — one
//! `getSignatureStatuses` round-trip per attempt over the RPC seam.

use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;
use crate::x402;

/// Confirmation polls per `/verify` request. wasm has no sleep, so the latency of
/// successive RPC round-trips is the only available wait.
const CONFIRM_ATTEMPTS: usize = 6;

/// One `getSignatureStatuses` round-trip via the RPC seam.
fn check_confirmation<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    signature: &str,
) -> AppResult<x402::rpc::Confirmation> {
    let raw = seams
        .http_fetch(&x402::rpc::build_get_signature_statuses(rpc_url, signature).to_string())?;
    x402::rpc::parse_signature_status(&raw).map_err(|e| {
        AppError::new(502, "provider_unavailable", "confirmation check failed")
            .with_internal(e.message)
    })
}

/// Poll for confirmation up to [`CONFIRM_ATTEMPTS`] times, returning early on a
/// definitive confirmed-or-stronger or failed status.
pub(super) fn poll_confirmation<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    signature: &str,
) -> AppResult<x402::rpc::Confirmation> {
    let mut last = x402::rpc::Confirmation::NotFound;
    for _ in 0..CONFIRM_ATTEMPTS {
        last = check_confirmation(seams, rpc_url, signature)?;
        if matches!(
            last,
            x402::rpc::Confirmation::Confirmed
                | x402::rpc::Confirmation::Finalized
                | x402::rpc::Confirmation::Failed(_)
        ) {
            break;
        }
    }
    Ok(last)
}
