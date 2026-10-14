#[cfg(test)]
use serde::Serialize;
use sha2::{Digest, Sha256};

use super::CartCommand;
#[cfg(test)]
use crate::error::{AppError, AppResult};

pub(super) struct Keys {
    pub generation: String,
    pub cart: String,
    pub operation: String,
    pub lane_hash: String,
    pub operation_hash: String,
}

pub(super) fn scope_hash(subject: &str, provider: &str) -> String {
    digest("scope", &[subject, provider])
}

pub(super) fn keys(scope_hash: &str, command: &CartCommand) -> Keys {
    operation_keys(scope_hash, &command.lane, &command.operation_id)
}

pub(super) fn operation_keys(scope_hash: &str, lane: &str, operation_id: &str) -> Keys {
    let lane_hash = self::lane_hash(lane);
    let operation_hash = digest("operation", &[operation_id]);
    Keys {
        generation: format!("generation:{scope_hash}"),
        cart: format!("cart:{scope_hash}:{lane_hash}"),
        operation: format!("operation:{scope_hash}:{lane_hash}:{operation_hash}"),
        lane_hash,
        operation_hash,
    }
}

pub(super) fn lane_hash(lane: &str) -> String {
    digest("lane", &[lane])
}

pub(super) fn lane_registry_key(scope_hash: &str) -> String {
    format!("lanes:{scope_hash}")
}

pub(super) fn generation_key(scope_hash: &str) -> String {
    format!("generation:{scope_hash}")
}

pub(super) fn line_key(product_id: &str, variant_id: Option<&str>) -> String {
    digest("line", &[product_id, variant_id.unwrap_or("")])
}

#[cfg(test)]
pub(super) fn fingerprint(scope_hash: &str, command: &CartCommand) -> AppResult<String> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Material<'a> {
        schema_version: u8,
        scope_hash: &'a str,
        command: &'a CartCommand,
    }
    let encoded = serde_json::to_vec(&Material {
        schema_version: 1,
        scope_hash,
        command,
    })
    .map_err(|error| {
        AppError::internal("cannot encode cart operation fingerprint")
            .with_internal(error.to_string())
    })?;
    Ok(hex::encode(Sha256::digest(encoded)))
}

fn digest(domain: &str, parts: &[&str]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(CONTRACT_DOMAIN);
    add_part(&mut hasher, domain);
    for part in parts {
        add_part(&mut hasher, part);
    }
    hex::encode(hasher.finalize())
}

fn add_part(hasher: &mut Sha256, value: &str) {
    hasher.update((value.len() as u64).to_be_bytes());
    hasher.update(value.as_bytes());
}

const CONTRACT_DOMAIN: &[u8] = b"cedros-pay:versioned-cart-write-v1\0";
