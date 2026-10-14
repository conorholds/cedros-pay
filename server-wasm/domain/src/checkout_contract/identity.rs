use sha2::{Digest, Sha256};

use crate::error::{AppError, AppResult};

use super::{MaterialFingerprint, OperationKind, MAX_IDEMPOTENCY_KEY_LENGTH};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderScope(String);

impl ProviderScope {
    /// Accepts an authenticated, host-derived scope. Never pass request data.
    pub fn from_host(value: &str) -> AppResult<Self> {
        validate_opaque(value, 512, "provider scope")?;
        if value.trim() != value {
            return Err(AppError::bad_request("provider scope must be canonical"));
        }
        Ok(Self(value.into()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ExternalIdempotencyKey(String);

impl ExternalIdempotencyKey {
    pub fn parse_exact(value: &str) -> AppResult<Self> {
        if value.is_empty()
            || value.len() > MAX_IDEMPOTENCY_KEY_LENGTH
            || !value.bytes().all(|byte| (0x21..=0x7e).contains(&byte))
        {
            return Err(AppError::bad_request(
                "idempotency key must be 1 to 67 visible ASCII characters",
            ));
        }
        Ok(Self(value.into()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CheckoutAttemptId(String);

impl CheckoutAttemptId {
    pub fn parse_exact(value: &str) -> AppResult<Self> {
        validate_opaque(value, 256, "checkout attempt id")?;
        Ok(Self(value.into()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OperationOwner(String);

impl OperationOwner {
    /// Constructs a server-owned fencing identity, not a caller-controlled id.
    #[cfg(test)]
    pub fn from_runtime(value: &str) -> AppResult<Self> {
        validate_opaque(value, 256, "operation owner")?;
        Ok(Self(value.into()))
    }

    pub(crate) fn random() -> AppResult<Self> {
        let mut bytes = [0_u8; 32];
        getrandom::fill(&mut bytes).map_err(|error| {
            AppError::internal("secure operation owner generation failed")
                .with_internal(error.to_string())
        })?;
        Ok(Self(format!("owner_{}", hex::encode(bytes))))
    }

    pub(crate) fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone)]
pub struct OperationIdentity {
    provider_scope: ProviderScope,
    operation: OperationKind,
    material_fingerprint: MaterialFingerprint,
    entry_key: String,
}

impl OperationIdentity {
    pub fn new(
        provider_scope: ProviderScope,
        operation: OperationKind,
        idempotency_key: ExternalIdempotencyKey,
        server_material: &serde_json::Value,
    ) -> Self {
        let material_fingerprint = MaterialFingerprint::from_server_material(server_material);
        let entry_key = identity_key(&provider_scope, operation, &idempotency_key);
        Self {
            provider_scope,
            operation,
            material_fingerprint,
            entry_key,
        }
    }

    pub fn entry_key(&self) -> &str {
        &self.entry_key
    }

    pub(super) fn public_operation_id(&self) -> String {
        let digest = self
            .entry_key
            .strip_prefix("checkout-operation:")
            .expect("operation identity key prefix");
        format!("payop_{digest}")
    }

    pub(crate) fn material_fingerprint(&self) -> &str {
        self.material_fingerprint.as_str()
    }

    pub(crate) fn provider_scope(&self) -> &str {
        self.provider_scope.as_str()
    }
    pub(crate) fn operation(&self) -> OperationKind {
        self.operation
    }
    pub(crate) fn fingerprint(&self) -> &str {
        self.material_fingerprint.as_str()
    }
}

fn identity_key(
    provider_scope: &ProviderScope,
    operation: OperationKind,
    key: &ExternalIdempotencyKey,
) -> String {
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-checkout-identity\0");
    hash_part(&mut digest, provider_scope.as_str().as_bytes());
    hash_part(&mut digest, operation.scope().as_bytes());
    hash_part(&mut digest, key.as_str().as_bytes());
    format!("checkout-operation:{}", hex::encode(digest.finalize()))
}

pub(crate) fn operation_entry_key(operation_id: &str) -> AppResult<String> {
    super::api_validation::operation_id(operation_id)?;
    Ok(format!(
        "checkout-operation:{}",
        operation_id.trim_start_matches("payop_")
    ))
}

fn hash_part(digest: &mut Sha256, bytes: &[u8]) {
    digest.update((bytes.len() as u64).to_be_bytes());
    digest.update(bytes);
}

fn validate_opaque(value: &str, max: usize, label: &str) -> AppResult<()> {
    if value.trim().is_empty() || value.len() > max || value.chars().any(char::is_control) {
        return Err(AppError::bad_request(format!(
            "{label} must be a nonblank opaque value no longer than {max} bytes"
        )));
    }
    Ok(())
}
