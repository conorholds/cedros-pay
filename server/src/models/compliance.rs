//! Compliance models for token holder tracking and compliance actions.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Per-tenant sanctions sweep configuration, stored in `app_config`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SanctionsSweepSettings {
    /// Whether the automated sweep is enabled for this tenant.
    #[serde(default = "default_true")]
    pub enabled: bool,
    /// Number of holders to fetch per batch during sweep.
    #[serde(default = "default_batch_size")]
    pub batch_size: i32,
}

impl Default for SanctionsSweepSettings {
    fn default() -> Self {
        Self {
            enabled: default_true(),
            batch_size: default_batch_size(),
        }
    }
}

fn default_true() -> bool {
    true
}
fn default_batch_size() -> i32 {
    100
}

/// A record of a token holder, created at mint time.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenHolder {
    pub id: String,
    pub tenant_id: String,
    pub collection_id: String,
    pub mint_address: String,
    pub wallet_address: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
    pub amount_minted: i64,
    /// active | frozen | thawed
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frozen_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub freeze_tx: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thaw_tx: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Response shape from the dynamic sanctions API (sunscreen.cedros.io).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SanctionsListResponse {
    pub addresses: Vec<String>,
    pub countries: Vec<String>,
}

/// Per-tenant dynamic sanctions API configuration, stored in `app_config`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SanctionsApiSettings {
    /// URL of the sanctions list API (e.g., "https://sunscreen.cedros.io").
    pub api_url: String,
    /// How often to refresh the list, in seconds (default 3600).
    #[serde(default = "default_refresh_interval")]
    pub refresh_interval_secs: u64,
    /// Whether dynamic list fetching is enabled for this tenant.
    #[serde(default)]
    pub enabled: bool,
}

impl Default for SanctionsApiSettings {
    fn default() -> Self {
        Self {
            api_url: String::new(),
            refresh_interval_secs: default_refresh_interval(),
            enabled: false,
        }
    }
}

fn default_refresh_interval() -> u64 {
    3600
}

/// Per-collection compliance gate requirements.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComplianceRequirements {
    /// Require wallet not on sanctions list.
    #[serde(default = "default_true")]
    pub require_sanctions_clear: bool,
    /// Require KYC verification via cedros-login.
    #[serde(default)]
    pub require_kyc: bool,
    /// Require accredited investor status via cedros-login.
    #[serde(default)]
    pub require_accredited_investor: bool,
}

impl Default for ComplianceRequirements {
    fn default() -> Self {
        Self {
            require_sanctions_clear: true,
            require_kyc: false,
            require_accredited_investor: false,
        }
    }
}

/// KYC verification status from cedros-login.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum KycStatus {
    None,
    Pending,
    Verified,
    Expired,
}

/// User compliance status from cedros-login.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserComplianceStatus {
    pub kyc_status: KycStatus,
    #[serde(default)]
    pub accredited_investor: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub accredited_verified_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// An audit record for compliance actions (freeze, thaw, sweep, report).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComplianceAction {
    pub id: String,
    pub tenant_id: String,
    /// freeze | thaw | sweep_freeze | report_generated
    pub action_type: String,
    pub wallet_address: String,
    pub mint_address: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub holder_id: Option<String>,
    pub reason: String,
    /// 'system:sweep' or admin pubkey
    pub actor: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tx_signature: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub report_reference: Option<String>,
    pub created_at: DateTime<Utc>,
}
