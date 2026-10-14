use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "status", rename_all = "kebab-case", deny_unknown_fields)]
pub(super) enum ProviderCreateState {
    #[default]
    NotStarted,
    AttemptedUnknown {
        attempted_at: i64,
    },
    ProviderIdKnown {
        provider_id: String,
    },
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub(super) enum SettlementState {
    #[default]
    Pending,
    Paid,
    Terminal,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct SettlementEffectIntent {
    pub status: SettlementState,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub effect_id: Option<String>,
    pub provider_reference: Option<String>,
    pub created_at: i64,
    pub dispatched: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub(super) enum SettlementClaimState {
    Prepared,
    Paid,
    Terminal,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct SettlementClaim {
    pub rail: super::PaymentMethod,
    pub checkout_operation_id: String,
    pub material_fingerprint: String,
    pub state: SettlementClaimState,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct X402Settlement {
    /// Exact signed bytes accepted before the guarded claim; rebroadcast only.
    pub transaction: String,
    pub signature: String,
    pub recent_blockhash: String,
    /// Added after initial rollout. Missing legacy evidence stays readable but
    /// cannot pass cluster verification while pending.
    #[serde(default)]
    pub network: String,
    pub quote_config_fingerprint: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub blockhash_valid_at_slot: Option<u64>,
}
