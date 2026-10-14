use serde::{Deserialize, Serialize};

/// Exact conformance descriptor, constructed only from a validated host scope.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CheckoutDescriptor {
    pub protocol: &'static str,
    pub provider_scope: String,
    pub replay_ttl_ms: i64,
    pub accepts_external_idempotency_key: bool,
    pub max_idempotency_key_length: usize,
    pub idempotency_key_character_set: &'static str,
    pub operation_scopes: OperationScopes,
}

impl CheckoutDescriptor {
    pub(super) fn for_provider_scope(provider_scope: String) -> Self {
        Self {
            protocol: super::PROTOCOL,
            provider_scope,
            replay_ttl_ms: super::MIN_REPLAY_TTL_MILLIS,
            accepts_external_idempotency_key: true,
            max_idempotency_key_length: super::MAX_IDEMPOTENCY_KEY_LENGTH,
            idempotency_key_character_set: "ascii-visible",
            operation_scopes: OperationScopes {
                quote: super::QUOTE_SCOPE,
                checkout: super::CHECKOUT_SCOPE,
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct OperationScopes {
    pub quote: &'static str,
    pub checkout: &'static str,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum OperationKind {
    Quote,
    Checkout,
}

impl OperationKind {
    pub fn scope(self) -> &'static str {
        match self {
            Self::Quote => super::QUOTE_SCOPE,
            Self::Checkout => super::CHECKOUT_SCOPE,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "status", rename_all = "kebab-case")]
pub enum DurableOutcome {
    Resolved {
        #[serde(rename = "operationId")]
        operation_id: String,
        #[serde(rename = "checkoutAttemptId")]
        checkout_attempt_id: String,
        #[serde(rename = "providerArtifacts")]
        provider_artifacts: super::ProviderArtifacts,
        durable: bool,
        replayed: bool,
    },
    Terminal {
        code: String,
        durable: bool,
        replayed: bool,
        #[serde(
            rename = "outcomeProof",
            skip_serializing_if = "Option::is_none",
            default
        )]
        outcome_proof: Option<String>,
    },
    Indeterminate {
        code: String,
        #[serde(rename = "operationId")]
        operation_id: String,
        #[serde(rename = "checkoutAttemptId")]
        checkout_attempt_id: String,
        #[serde(rename = "providerArtifacts")]
        provider_artifacts: super::ProviderArtifacts,
        replayed: bool,
    },
}

impl DurableOutcome {
    pub(crate) fn replayed(mut self) -> Self {
        match &mut self {
            Self::Resolved { replayed, .. }
            | Self::Terminal { replayed, .. }
            | Self::Indeterminate { replayed, .. } => *replayed = true,
        }
        self
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Completion {
    Resolved(super::ProviderArtifacts),
    #[cfg(test)]
    Terminal {
        code: String,
    },
    ProvenTerminal {
        code: String,
        outcome_proof: String,
    },
    Indeterminate {
        code: String,
        provider_artifacts: super::ProviderArtifacts,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OperationLease {
    pub(crate) entry_key: String,
    pub(crate) version: String,
    pub(crate) owner: String,
    pub(crate) operation_id: String,
    pub(crate) checkout_attempt_id: String,
    pub(crate) stripe_request: Option<super::StripeRequestBinding>,
}

impl OperationLease {
    pub fn operation_id(&self) -> &str {
        &self.operation_id
    }
    pub fn checkout_attempt_id(&self) -> &str {
        &self.checkout_attempt_id
    }
    pub(crate) fn storage_reference(&self) -> &str {
        &self.entry_key
    }

    pub(super) fn stripe_request(&self) -> Option<&super::StripeRequestBinding> {
        self.stripe_request.as_ref()
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ClaimResult {
    Acquired(OperationLease),
    Replay(DurableOutcome),
    InProgress {
        operation_id: String,
        checkout_attempt_id: String,
        retry_after_millis: i64,
    },
}
