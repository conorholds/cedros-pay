use serde::{Deserialize, Serialize};

use crate::{
    error::{AppError, AppResult},
    ids,
    seams::HostSeams,
};

/// Redacted readiness view for the host-owned blockchain provider config.
///
/// The response reports whether wallet/RPC settings are configured, but never
/// includes raw RPC secrets or private wallet material.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BlockchainConfigStatus {
    pub configured: bool,
    pub main_wallet_configured: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub solana: Option<SolanaConfigStatus>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Redacted Solana-specific provider readiness returned by Data.
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SolanaConfigStatus {
    pub rpc_configured: bool,
    pub rpc_secret_configured: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commitment: Option<String>,
}

/// Current x402 payment authority resolved from the host-owned blockchain
/// projection. Managed control is all-or-nothing: any projection presence makes
/// the legacy Pay payout setting ineligible as a fallback.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct X402Control {
    pub pay_to: String,
    pub network: String,
    pub rpc_url: String,
    pub managed_signer: Option<ManagedX402Signer>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ManagedX402Signer {
    pub wallet_id: String,
    pub wallet_version_id: String,
    pub public_key: String,
    pub cluster: String,
}

/// Dedicated Site Assistant payer resolved only from `assistantWallet`.
/// Merchant destinations and operational signer projections are deliberately
/// absent so this control cannot fall back across wallet purposes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AssistantX402Control {
    pub wallet_id: String,
    pub wallet_version_id: String,
    pub public_key: String,
    pub cluster: String,
    pub rpc_url: String,
    pub allowed_token_mints: Vec<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct ProviderBlockchainConfig {
    available: bool,
    main_wallet_address: Option<String>,
    managed_wallet: Option<ManagedWalletProjection>,
    treasury: Option<TreasuryProjection>,
    assistant_wallet_available: bool,
    assistant_wallet: Option<ManagedWalletProjection>,
    solana: Option<ProviderSolanaConfig>,
    allowed_token_mints: Vec<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct ManagedWalletProjection {
    vault_wallet_id: Option<String>,
    active_version_id: Option<String>,
    public_key: Option<String>,
    cluster: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct TreasuryProjection {
    provider: Option<String>,
    treasury_id: Option<String>,
    multisig_address: Option<String>,
    vault_address: Option<String>,
    cluster: Option<String>,
    threshold: Option<u64>,
    status: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct ProviderSolanaConfig {
    rpc_url: Option<String>,
    rpc_secret_configured: bool,
    network: Option<String>,
    commitment: Option<String>,
}

/// Reads the site-owned blockchain config through the Data provider seam.
///
/// Provider failures are logged and converted into an unavailable status so the
/// admin route can render readiness without exposing host error details.
pub fn read_status<S: HostSeams>(seams: &S) -> BlockchainConfigStatus {
    match seams.provider_execute(
        ids::PROVIDER_BLOCKCHAIN_CONFIG,
        ids::PROVIDER_BLOCKCHAIN,
        ids::OP_BLOCKCHAIN_CONFIG_READ,
        "{}",
    ) {
        Ok(raw) => parse_status(&raw),
        Err(_) => {
            seams.log("warn", "blockchain config provider read failed");
            BlockchainConfigStatus {
                configured: false,
                main_wallet_configured: false,
                solana: None,
                error: Some("provider_unavailable".to_string()),
            }
        }
    }
}

/// Reads the operator's Solana RPC URL from the host blockchain provider.
///
/// This is the single source of the RPC endpoint for every server-side Solana
/// call (x402 settlement, refunds, reconciliation, subscription checks). The raw
/// URL is used only internally and is intentionally kept out of the public
/// readiness status returned to admin clients.
pub fn read_solana_rpc_url<S: HostSeams>(seams: &S) -> AppResult<String> {
    let config = read_provider_config(seams)?;
    present_owned(config.solana.and_then(|solana| solana.rpc_url)).ok_or_else(unavailable)
}

fn parse_status(raw: &str) -> BlockchainConfigStatus {
    let Ok(config) = serde_json::from_str::<ProviderBlockchainConfig>(raw) else {
        return BlockchainConfigStatus {
            configured: false,
            main_wallet_configured: false,
            solana: None,
            error: Some("invalid_provider_response".into()),
        };
    };
    let main_wallet_configured = present(config.main_wallet_address.as_deref()).is_some();
    let solana = config.solana.map(|solana| SolanaConfigStatus {
        rpc_configured: present(solana.rpc_url.as_deref()).is_some(),
        rpc_secret_configured: solana.rpc_secret_configured,
        network: present_owned(solana.network),
        commitment: present_owned(solana.commitment),
    });
    let configured = config.available
        || main_wallet_configured
        || solana
            .as_ref()
            .is_some_and(|s| s.rpc_configured || s.rpc_secret_configured);
    BlockchainConfigStatus {
        configured,
        main_wallet_configured,
        solana,
        error: None,
    }
}

/// Resolves the x402 payout and optional policy-bound signer from one provider
/// snapshot. Legacy settings remain valid only when neither managed projection
/// is present.
pub fn resolve_x402_control<S: HostSeams>(
    seams: &S,
    legacy_pay_to: Option<String>,
    legacy_network: String,
) -> AppResult<X402Control> {
    let config = read_provider_config(seams)?;
    let rpc_url = present_owned(
        config
            .solana
            .as_ref()
            .and_then(|solana| solana.rpc_url.clone()),
    )
    .unwrap_or_default();
    match (config.managed_wallet, config.treasury) {
        (None, None) => Ok(X402Control {
            pay_to: present_owned(legacy_pay_to).ok_or_else(|| {
                AppError::new(
                    503,
                    "x402_unavailable",
                    "x402 recipient wallet is not configured",
                )
            })?,
            network: legacy_network,
            rpc_url,
            managed_signer: None,
        }),
        (Some(wallet), Some(treasury)) => managed_control(
            config.available,
            config.main_wallet_address,
            config.solana,
            wallet,
            treasury,
            rpc_url,
        ),
        _ => Err(managed_unavailable()),
    }
}

/// Resolves the isolated outbound-purchase wallet. There is intentionally no
/// legacy, browser, operational-wallet, main-wallet, or treasury fallback.
pub fn resolve_assistant_x402_control<S: HostSeams>(seams: &S) -> AppResult<AssistantX402Control> {
    let config = read_provider_config(seams)?;
    let wallet = config.assistant_wallet.ok_or_else(assistant_unavailable)?;
    let status = present(wallet.status.as_deref()).unwrap_or("missing");
    if status != "active" {
        return Err(assistant_status_error(status));
    }
    if !config.assistant_wallet_available {
        return Err(assistant_unavailable());
    }
    let wallet_id = assistant_required(wallet.vault_wallet_id)?;
    let wallet_version_id = assistant_required(wallet.active_version_id)?;
    let public_key = assistant_required(wallet.public_key)?;
    let cluster = assistant_required(wallet.cluster)?;
    let rpc_url = present_owned(
        config
            .solana
            .as_ref()
            .and_then(|solana| solana.rpc_url.clone()),
    )
    .ok_or_else(assistant_unavailable)?;
    if !supported_cluster(&cluster)
        || config
            .solana
            .as_ref()
            .and_then(|solana| present(solana.network.as_deref()))
            .is_some_and(|network| network != cluster)
    {
        return Err(AppError::new(
            503,
            "cluster_mismatch",
            "Site Assistant wallet cluster is inconsistent",
        ));
    }
    if crate::x402::pubkey::parse(&public_key).is_err() {
        return Err(assistant_unavailable());
    }
    let allowed_token_mints = config
        .allowed_token_mints
        .into_iter()
        .filter_map(|mint| present_owned(Some(mint)))
        .collect::<Vec<_>>();
    Ok(AssistantX402Control {
        wallet_id,
        wallet_version_id,
        public_key,
        cluster,
        rpc_url,
        allowed_token_mints,
    })
}

fn managed_control(
    available: bool,
    main_wallet_address: Option<String>,
    solana: Option<ProviderSolanaConfig>,
    wallet: ManagedWalletProjection,
    treasury: TreasuryProjection,
    rpc_url: String,
) -> AppResult<X402Control> {
    let wallet_id = required(wallet.vault_wallet_id)?;
    let wallet_version_id = required(wallet.active_version_id)?;
    let public_key = required(wallet.public_key)?;
    let wallet_cluster = required(wallet.cluster)?;
    let vault_address = required(treasury.vault_address)?;
    let treasury_cluster = required(treasury.cluster)?;
    let main_wallet_address = required(main_wallet_address)?;
    let complete = available
        && !rpc_url.is_empty()
        && wallet.status.as_deref() == Some("active")
        && treasury.status.as_deref() == Some("active")
        && treasury.provider.as_deref() == Some("squads-v4")
        && present(treasury.treasury_id.as_deref()).is_some()
        && present(treasury.multisig_address.as_deref()).is_some()
        && treasury.threshold.is_some_and(|threshold| threshold > 0)
        && wallet_cluster == treasury_cluster
        && main_wallet_address == vault_address
        && supported_cluster(&wallet_cluster)
        && solana
            .as_ref()
            .and_then(|config| present(config.network.as_deref()))
            .is_none_or(|network| network == wallet_cluster);
    if !complete {
        return Err(managed_unavailable());
    }
    Ok(X402Control {
        pay_to: vault_address,
        network: wallet_cluster.clone(),
        rpc_url,
        managed_signer: Some(ManagedX402Signer {
            wallet_id,
            wallet_version_id,
            public_key,
            cluster: wallet_cluster,
        }),
    })
}

fn read_provider_config<S: HostSeams>(seams: &S) -> AppResult<ProviderBlockchainConfig> {
    let raw = seams
        .provider_execute(
            ids::PROVIDER_BLOCKCHAIN_CONFIG,
            ids::PROVIDER_BLOCKCHAIN,
            ids::OP_BLOCKCHAIN_CONFIG_READ,
            "{}",
        )
        .map_err(|error| unavailable().with_internal(error.message))?;
    serde_json::from_str(&raw).map_err(|error| {
        unavailable().with_internal(format!("invalid blockchain provider response: {error}"))
    })
}

fn unavailable() -> AppError {
    AppError::new(
        503,
        "service_unavailable",
        "Solana RPC endpoint is not configured in the host blockchain settings",
    )
}

fn managed_unavailable() -> AppError {
    AppError::new(
        503,
        "x402_unavailable",
        "managed Solana wallet and treasury control is unavailable",
    )
}

fn assistant_unavailable() -> AppError {
    AppError::new(
        503,
        "wallet_unavailable",
        "Site Assistant wallet is unavailable",
    )
}

fn assistant_status_error(status: &str) -> AppError {
    match status {
        "rotating" => AppError::new(503, "wallet_rotating", "Site Assistant wallet is rotating"),
        "disabled" => AppError::new(503, "wallet_disabled", "Site Assistant wallet is disabled"),
        "blocked" => AppError::new(503, "wallet_blocked", "Site Assistant wallet is blocked"),
        "pending" | "confirming" => {
            AppError::new(503, "wallet_pending", "Site Assistant wallet is pending")
        }
        _ => assistant_unavailable(),
    }
}

fn assistant_required(value: Option<String>) -> AppResult<String> {
    present_owned(value).ok_or_else(assistant_unavailable)
}

fn required(value: Option<String>) -> AppResult<String> {
    present_owned(value).ok_or_else(managed_unavailable)
}

fn present(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}

fn present_owned(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn supported_cluster(cluster: &str) -> bool {
    matches!(cluster, "devnet" | "testnet" | "mainnet-beta" | "localnet")
}

#[cfg(test)]
#[path = "blockchain_config_tests.rs"]
mod tests;
