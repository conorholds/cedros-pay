//! Solana RPC operations for the Pay-owned initial collection.

use super::solana_collection_transaction::PreparedCollection;
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;
use crate::x402::rpc::{self, Confirmation};

pub(super) fn send<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    prepared: &PreparedCollection,
) -> AppResult<()> {
    let request = rpc::build_send_transaction(rpc_url, &prepared.signed_transaction);
    let raw = seams
        .http_fetch(&request.to_string())
        .map_err(|cause| error(cause.message))?;
    match rpc::parse_send_transaction(&raw) {
        Ok(signature) if signature == prepared.signature => Ok(()),
        Ok(_) => Err(error("RPC returned a different signature".into())),
        Err(cause) if cause.message.to_ascii_lowercase().contains("already") => Ok(()),
        Err(cause) if cause.code == -32002 => Err(AppError::new(
            422,
            "collection_rejected",
            "initial Solana subscription collection was rejected",
        )
        .with_internal(cause.message)),
        Err(cause) => Err(error(cause.message)),
    }
}

pub(super) fn poll<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    signature: &str,
) -> AppResult<Confirmation> {
    let request = rpc::build_get_signature_statuses(rpc_url, signature);
    let raw = seams
        .http_fetch(&request.to_string())
        .map_err(|cause| error(cause.message))?;
    rpc::parse_signature_status(&raw).map_err(|cause| error(cause.message))
}

pub(super) fn error(cause: String) -> AppError {
    AppError::new(502, "rpc_error", "Solana collection RPC is unavailable").with_internal(cause)
}
