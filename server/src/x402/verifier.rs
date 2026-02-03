use std::str::FromStr;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::Utc;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_client::rpc_config::RpcSendTransactionConfig;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::message::VersionedMessage;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::Signature;
use solana_sdk::signer::Signer;
use solana_sdk::transaction::VersionedTransaction;
use thiserror::Error;
use tokio::time::timeout;

use crate::config::CircuitBreakerServiceConfig;
use crate::config::X402Config;
use crate::constants::{
    DEFAULT_ACCESS_TTL, DEFAULT_CONFIRMATION_TIMEOUT, MAX_NETWORK_TIMEOUT_RETRIES, MAX_TX_RETRIES,
    NETWORK_TIMEOUT_BACKOFF, RATE_LIMIT_BACKOFF_MULTIPLIER, RATE_LIMIT_INITIAL_BACKOFF,
};
use crate::errors::ErrorCode;
use crate::middleware::circuit_breaker::{
    new_circuit_breaker, CircuitBreakerConfig, SharedCircuitBreaker,
};
use crate::models::{PaymentProof, Requirement, VerificationResult};
use crate::observability::{record_solana_rpc_call, record_solana_tx_confirmation};
use crate::services::BlockhashCache;

use super::transaction_queue::TransactionQueue;
use super::utils::is_rate_limit_error;
use super::wallet_health::WalletHealthChecker;
use super::ws_confirmation::{WsConfirmConfig, WsConfirmationService};

#[derive(Debug)]
enum RpcAttemptError {
    Timeout,
    Failed(String),
}

async fn rpc_attempt_with_timeout<T, E, F>(dur: Duration, fut: F) -> Result<T, RpcAttemptError>
where
    F: std::future::Future<Output = Result<T, E>>,
    E: std::fmt::Display,
{
    match timeout(dur, fut).await {
        Ok(Ok(v)) => Ok(v),
        Ok(Err(e)) => Err(RpcAttemptError::Failed(e.to_string())),
        Err(_) => Err(RpcAttemptError::Timeout),
    }
}

#[derive(Debug, Error)]
pub enum VerifierError {
    #[error("verification failed: {0}")]
    Failed(String),
    #[error("invalid proof: {0}")]
    Invalid(String),
    #[error("network error: {0}")]
    Network(String),
    #[error("amount mismatch")]
    AmountMismatch,
    #[error("insufficient token funds")]
    InsufficientTokenFunds,
    #[error("insufficient SOL funds")]
    InsufficientSolFunds,
    #[error("transaction not found")]
    TransactionNotFound,
    #[error("transaction failed")]
    TransactionFailed,
    #[error("invalid recipient")]
    InvalidRecipient,
    #[error("invalid token mint")]
    InvalidTokenMint,
    #[error("rate limited")]
    RateLimited,
    #[error("account not found")]
    AccountNotFound,
    #[error("already processed")]
    AlreadyProcessed,
    #[error("blockhash expired")]
    BlockhashExpired,
    #[error("{0}")]
    Code(ErrorCode),
}

impl From<ErrorCode> for VerifierError {
    fn from(code: ErrorCode) -> Self {
        VerifierError::Code(code)
    }
}

#[async_trait]
pub trait Verifier: Send + Sync {
    async fn verify(
        &self,
        proof: PaymentProof,
        requirement: Requirement,
    ) -> Result<VerificationResult, VerifierError>;
}

/// Server wallet keypair
pub struct ServerWallet {
    pub keypair: solana_sdk::signer::keypair::Keypair,
    pub pubkey: Pubkey,
}

impl ServerWallet {
    pub fn from_base58(key: &str) -> Result<Self, VerifierError> {
        let bytes = bs58::decode(key)
            .into_vec()
            .map_err(|e| VerifierError::Invalid(format!("invalid base58 key: {}", e)))?;

        let keypair = solana_sdk::signer::keypair::Keypair::try_from(bytes.as_slice())
            .map_err(|e| VerifierError::Invalid(format!("invalid keypair: {}", e)))?;

        let pubkey = keypair.pubkey();
        Ok(Self { keypair, pubkey })
    }

    pub fn from_json_array(json: &str) -> Result<Self, VerifierError> {
        let bytes: Vec<u8> = serde_json::from_str(json)
            .map_err(|e| VerifierError::Invalid(format!("invalid json array: {}", e)))?;

        if bytes.len() != 64 {
            return Err(VerifierError::Invalid("keypair must be 64 bytes".into()));
        }

        let keypair = solana_sdk::signer::keypair::Keypair::try_from(bytes.as_slice())
            .map_err(|e| VerifierError::Invalid(format!("invalid keypair: {}", e)))?;

        let pubkey = keypair.pubkey();
        Ok(Self { keypair, pubkey })
    }

    pub fn from_string(s: &str) -> Result<Self, VerifierError> {
        let trimmed = s.trim();
        if trimmed.starts_with('[') {
            Self::from_json_array(trimmed)
        } else {
            Self::from_base58(trimmed)
        }
    }
}

/// Solana x402 verifier
pub struct SolanaVerifier {
    rpc_client: Arc<RpcClient>,
    server_wallets: Vec<ServerWallet>,
    wallet_index: AtomicU64,
    gasless_enabled: bool,
    auto_create_token_accounts: bool,
    tx_queue: Option<Arc<TransactionQueue>>,
    health_checker: Option<Arc<WalletHealthChecker>>,
    ws_confirmation: Option<Arc<WsConfirmationService>>,
    blockhash_cache: Arc<BlockhashCache>,
    network: String,
    commitment: CommitmentConfig,
    skip_preflight: bool,
    circuit_breaker: SharedCircuitBreaker,
    // Compute budget settings (from config, like Go does)
    compute_unit_limit: u32,
    compute_unit_price: u64,
}

impl SolanaVerifier {
    pub fn new(config: &X402Config) -> Result<Self, VerifierError> {
        Self::new_with_circuit_breaker(config, &CircuitBreakerServiceConfig::default())
    }

    pub fn new_with_circuit_breaker(
        config: &X402Config,
        cb_config: &CircuitBreakerServiceConfig,
    ) -> Result<Self, VerifierError> {
        if config.rpc_url.is_empty() {
            return Err(VerifierError::Invalid("rpc_url is required".into()));
        }

        let commitment = parse_commitment(&config.commitment);
        let rpc_client = Arc::new(RpcClient::new_with_commitment(
            config.rpc_url.clone(),
            commitment,
        ));

        // Create blockhash cache using same RPC client (1 second TTL per CLAUDE.md)
        let blockhash_cache = Arc::new(BlockhashCache::with_default_ttl(rpc_client.clone()));

        let mut server_wallets = Vec::new();
        for wallet_str in &config.server_wallets {
            let wallet = ServerWallet::from_string(wallet_str)?;
            server_wallets.push(wallet);
        }

        Ok(Self {
            rpc_client,
            server_wallets,
            wallet_index: AtomicU64::new(0),
            gasless_enabled: config.gasless_enabled,
            auto_create_token_accounts: config.auto_create_token_account,
            tx_queue: None,
            health_checker: None,
            ws_confirmation: None,
            blockhash_cache,
            network: config.network.clone(),
            commitment,
            skip_preflight: config.skip_preflight,
            circuit_breaker: new_circuit_breaker(CircuitBreakerConfig::from_service_config(
                "solana_rpc",
                cb_config,
            )),
            // Use config values like Go does
            compute_unit_limit: config.compute_unit_limit,
            compute_unit_price: config.compute_unit_price_micro_lamports,
        })
    }

    /// Setup transaction queue
    pub fn setup_tx_queue(&mut self, min_time_between: Duration, max_in_flight: usize) {
        let queue = TransactionQueue::new(self.rpc_client.clone(), min_time_between, max_in_flight);
        self.tx_queue = Some(queue);
    }

    /// Setup wallet health checker
    pub fn setup_health_checker(&mut self) {
        if !self.server_wallets.is_empty() {
            let pubkeys: Vec<Pubkey> = self.server_wallets.iter().map(|w| w.pubkey).collect();
            let checker = WalletHealthChecker::new(self.rpc_client.clone(), pubkeys);
            self.health_checker = Some(Arc::new(checker));
        }
    }

    /// Setup WebSocket-based confirmation service
    ///
    /// This provides faster transaction confirmation by subscribing to
    /// transaction signatures via WebSocket instead of polling RPC.
    pub fn setup_ws_confirmation(&mut self, rpc_url: &str) {
        let config = WsConfirmConfig::from_rpc_url(rpc_url);
        let service = WsConfirmationService::new(config);
        self.ws_confirmation = Some(Arc::new(service));
    }

    /// Setup WebSocket confirmation with custom config
    pub fn setup_ws_confirmation_with_config(&mut self, config: WsConfirmConfig) {
        let service = WsConfirmationService::new(config);
        self.ws_confirmation = Some(Arc::new(service));
    }

    /// Check if WebSocket confirmation is available and connected
    pub async fn is_ws_confirmation_available(&self) -> bool {
        if let Some(ws) = &self.ws_confirmation {
            ws.is_connected().await
        } else {
            false
        }
    }

    /// Get next healthy server wallet (health-aware round-robin per spec)
    /// Per spec 22-x402-verifier.md: preferentially use healthy wallets,
    /// fall back to round-robin if all unhealthy
    fn get_next_server_wallet(&self) -> Option<&ServerWallet> {
        if self.server_wallets.is_empty() {
            return None;
        }

        let current_idx = self.wallet_index.fetch_add(1, Ordering::Relaxed) as usize;
        let len = self.server_wallets.len();

        // If we have a health checker, try to find a healthy wallet
        if let Some(ref checker) = self.health_checker {
            for i in 0..len {
                let idx = (current_idx + i) % len;
                let wallet = &self.server_wallets[idx];
                if let Some(health) = checker.get_wallet_health(&wallet.pubkey) {
                    if health.status.is_usable() {
                        return Some(wallet);
                    }
                }
            }
        }

        // All unhealthy or no health checker - return next in round-robin anyway
        Some(&self.server_wallets[current_idx % len])
    }

    /// Find server wallet by public key
    fn find_server_wallet(&self, pubkey: &Pubkey) -> Option<&ServerWallet> {
        self.server_wallets.iter().find(|w| &w.pubkey == pubkey)
    }

    /// Decode transaction from base64
    fn decode_transaction(tx_base64: &str) -> Result<VersionedTransaction, VerifierError> {
        let tx_bytes = BASE64
            .decode(tx_base64)
            .map_err(|e| VerifierError::Invalid(format!("invalid base64 transaction: {}", e)))?;

        bincode::deserialize(&tx_bytes)
            .map_err(|e| VerifierError::Invalid(format!("invalid transaction: {}", e)))
    }

    /// Extract transfer details from transaction
    /// Supports both Transfer (opcode 3) and TransferChecked (opcode 12) like Go does
    fn extract_transfer_details(
        &self,
        tx: &VersionedTransaction,
        requirement: &Requirement,
    ) -> Result<TransferDetails, VerifierError> {
        let message = tx.message.clone();
        let account_keys = match &message {
            VersionedMessage::Legacy(m) => m.account_keys.clone(),
            VersionedMessage::V0(m) => m.account_keys.clone(),
        };

        let instructions = match &message {
            VersionedMessage::Legacy(m) => m.instructions.clone(),
            VersionedMessage::V0(m) => m.instructions.clone(),
        };

        // Find SPL token transfer instruction
        for ix in &instructions {
            let program_id = account_keys
                .get(ix.program_id_index as usize)
                .ok_or_else(|| VerifierError::Invalid("missing program id".into()))?;

            // Check if this is a token program instruction
            if *program_id == spl_token::id() && !ix.data.is_empty() {
                let opcode = ix.data[0];

                // Transfer (opcode 3): accounts = [source, dest, owner] - REJECTED for security
                // TransferChecked (opcode 12): accounts = [source, mint, dest, owner]
                match opcode {
                    3 => {
                        // SECURITY: Reject plain Transfer (opcode 3) instructions.
                        // Plain Transfer doesn't include the mint address in the instruction,
                        // so we cannot verify that the transferred token matches the expected
                        // token. An attacker could send a worthless token and we would accept it.
                        // Only TransferChecked (opcode 12) is secure because it includes the
                        // mint and decimals in the instruction data for validation.
                        return Err(VerifierError::Invalid(
                            "plain Transfer (opcode 3) not accepted; use TransferChecked (opcode 12) for security".into()
                        ));
                    }
                    12 if ix.accounts.len() >= 4 && ix.data.len() >= 10 => {
                        // TransferChecked instruction
                        let source_idx = ix.accounts[0] as usize;
                        let mint_idx = ix.accounts[1] as usize;
                        let dest_idx = ix.accounts[2] as usize;
                        let owner_idx = ix.accounts[3] as usize;

                        let source = account_keys
                            .get(source_idx)
                            .ok_or_else(|| VerifierError::Invalid("missing source".into()))?;
                        let mint = account_keys
                            .get(mint_idx)
                            .ok_or_else(|| VerifierError::Invalid("missing mint".into()))?;
                        let destination = account_keys
                            .get(dest_idx)
                            .ok_or_else(|| VerifierError::Invalid("missing dest".into()))?;
                        let owner = account_keys
                            .get(owner_idx)
                            .ok_or_else(|| VerifierError::Invalid("missing owner".into()))?;

                        // SECURITY: Validate mint matches expected token
                        if let Some(expected_mint_str) = &requirement.token_mint {
                            let expected_mint = Pubkey::from_str(expected_mint_str)
                                .map_err(|_| VerifierError::InvalidTokenMint)?;
                            if *mint != expected_mint {
                                return Err(VerifierError::Invalid(format!(
                                    "token mint mismatch: got {}, expected {}",
                                    mint, expected_mint
                                )));
                            }
                        }

                        // Extract amount (u64 LE) and decimals (u8) from instruction data
                        let amount =
                            u64::from_le_bytes(ix.data[1..9].try_into().map_err(|_| {
                                VerifierError::Invalid("invalid amount bytes".into())
                            })?);
                        let decimals = ix.data[9];

                        return Ok(TransferDetails {
                            _source: *source,
                            destination: *destination,
                            mint: *mint,
                            owner: *owner,
                            amount,
                            decimals,
                        });
                    }
                    _ => continue,
                }
            }
        }

        Err(VerifierError::Invalid(
            "no transfer instruction found".into(),
        ))
    }

    fn extract_memo_text(tx: &VersionedTransaction) -> Result<Option<String>, VerifierError> {
        let message = tx.message.clone();
        let account_keys = match &message {
            VersionedMessage::Legacy(m) => m.account_keys.clone(),
            VersionedMessage::V0(m) => m.account_keys.clone(),
        };

        let instructions = match &message {
            VersionedMessage::Legacy(m) => m.instructions.clone(),
            VersionedMessage::V0(m) => m.instructions.clone(),
        };

        for ix in &instructions {
            let program_id = account_keys
                .get(ix.program_id_index as usize)
                .ok_or_else(|| VerifierError::Invalid("missing program id".into()))?;

            if *program_id == spl_memo::id() {
                let memo = String::from_utf8(ix.data.clone())
                    .map_err(|_| VerifierError::Code(ErrorCode::InvalidMemo))?;
                return Ok(Some(memo));
            }
        }

        Ok(None)
    }

    fn memo_matches_resource(memo: &str, resource_id: &str) -> bool {
        if memo == resource_id {
            return true;
        }

        if let Some(rest) = memo.strip_prefix(resource_id) {
            if let Some(rest) = rest.strip_prefix(':') {
                if Self::memo_nonce_is_valid(rest) {
                    return true;
                }
            }
        }

        if (resource_id.starts_with("cart:") || resource_id.starts_with("refund:"))
            && memo.ends_with(resource_id)
        {
            return true;
        }

        false
    }

    fn memo_nonce_is_valid(value: &str) -> bool {
        if value.len() == 8
            && value
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
        {
            return true;
        }

        Self::is_uuid_like(value)
    }

    fn is_uuid_like(value: &str) -> bool {
        if value.len() != 36 {
            return false;
        }

        for (idx, ch) in value.chars().enumerate() {
            match idx {
                8 | 13 | 18 | 23 => {
                    if ch != '-' {
                        return false;
                    }
                }
                _ => {
                    if !ch.is_ascii_hexdigit() {
                        return false;
                    }
                }
            }
        }

        true
    }

    fn verify_memo(
        tx: &VersionedTransaction,
        requirement: &Requirement,
    ) -> Result<(), VerifierError> {
        if requirement.resource_id.is_empty() {
            return Ok(());
        }

        let memo = Self::extract_memo_text(tx)?;
        let memo = memo.ok_or(VerifierError::Code(ErrorCode::MissingMemo))?;

        if !Self::memo_matches_resource(&memo, &requirement.resource_id) {
            return Err(VerifierError::Code(ErrorCode::InvalidMemo));
        }

        Ok(())
    }

    /// Verify transaction amount and decimals
    fn verify_amount(
        &self,
        transfer: &TransferDetails,
        requirement: &Requirement,
    ) -> Result<(), VerifierError> {
        // Validate decimals match expected token decimals
        if transfer.decimals != requirement.token_decimals {
            return Err(VerifierError::Invalid(format!(
                "token decimals mismatch: got {}, expected {}",
                transfer.decimals, requirement.token_decimals
            )));
        }

        let required_atomic = Self::required_amount_atomic(requirement, transfer.decimals)?;

        // Allow slight tolerance of 1 atomic unit to handle rounding
        let tolerance = 1_u64;
        if transfer.amount.saturating_add(tolerance) < required_atomic {
            return Err(VerifierError::AmountMismatch);
        }

        Ok(())
    }

    fn required_amount_atomic(
        requirement: &Requirement,
        decimals: u8,
    ) -> Result<u64, VerifierError> {
        if let Some(required) = requirement.amount_atomic {
            return Ok(required);
        }

        // M-003: Use u128 for intermediate calculation to prevent precision loss.
        // f64 has ~15-17 significant digits of precision. For Solana tokens with 9 decimals,
        // amounts > 9M SOL can lose precision. We use u128 and validate to prevent this.
        if !requirement.amount.is_finite() || requirement.amount < 0.0 {
            return Err(VerifierError::Invalid(
                "required amount must be a finite, non-negative number".into(),
            ));
        }

        // Validate max amount before conversion to prevent precision loss.
        // The threshold is ~9M tokens with 9 decimals (9M * 10^9 = 9e15).
        // f64 can exactly represent integers up to 2^53 (~9e15).
        const MAX_SAFE_INTEGER_F64: f64 = 9_007_199_254_740_992.0; // 2^53
        const MAX_SAFE_TOKENS: f64 = 9_000_000.0; // ~9M tokens threshold for 9-decimal tokens

        let max_safe_for_decimals = MAX_SAFE_INTEGER_F64 / 10_f64.powi(decimals as i32);
        if requirement.amount > max_safe_for_decimals {
            return Err(VerifierError::Invalid(format!(
                "amount {} exceeds max safe amount {} for {} decimals (precision loss risk). Use amount_atomic instead.",
                requirement.amount, max_safe_for_decimals, decimals
            )));
        }

        if requirement.amount > MAX_SAFE_TOKENS {
            tracing::warn!(
                amount = requirement.amount,
                decimals = decimals,
                "Payment amount approaches f64 precision limit; consider using amount_atomic in Requirement"
            );
        }

        // Use u128 for the multiplication to prevent overflow and maintain precision.
        // First, we need to properly convert the f64 amount to atomic units.
        // We do this by checking if the f64 can represent the value exactly
        // when scaled by the decimal multiplier.
        let multiplier_u128 = 10_u128.pow(decimals as u32);

        // Convert f64 amount to atomic units using u128 for the intermediate calculation
        // We multiply then divide to properly handle the scaling
        let amount_scaled = requirement.amount * multiplier_u128 as f64;

        // Check for overflow beyond u64::MAX
        if amount_scaled > u64::MAX as f64 {
            return Err(VerifierError::Invalid(format!(
                "amount {} with {} decimals exceeds maximum representable value",
                requirement.amount, decimals
            )));
        }

        // Convert to u64 using floor (be lenient - accept if paid >= required)
        let atomic_amount = amount_scaled.floor() as u64;

        // M-003: Check for precision loss by verifying the round-trip conversion.
        // Convert back and check if we get the same amount within a small tolerance.
        // We allow for 1 atomic unit of difference due to floor() being lenient.
        let back_to_f64 = atomic_amount as f64 / multiplier_u128 as f64;
        let tolerance = 1.0 / multiplier_u128 as f64;
        let diff = (back_to_f64 - requirement.amount).abs();

        // If the difference is more than our tolerance, precision was lost
        if diff > tolerance * 2.0 {
            return Err(VerifierError::Invalid(format!(
                "amount {} loses precision when converted to atomic units (got {} back). Use amount_atomic instead.",
                requirement.amount, back_to_f64
            )));
        }

        Ok(atomic_amount)
    }

    /// Verify recipient matches requirement
    fn verify_recipient(
        &self,
        transfer: &TransferDetails,
        requirement: &Requirement,
    ) -> Result<(), VerifierError> {
        if let Some(expected_ata) = &requirement.recipient_token_account {
            let expected =
                Pubkey::from_str(expected_ata).map_err(|_| VerifierError::InvalidRecipient)?;
            if transfer.destination != expected {
                return Err(VerifierError::InvalidRecipient);
            }
        }
        Ok(())
    }

    /// Verify token mint matches
    fn verify_mint(
        &self,
        transfer: &TransferDetails,
        requirement: &Requirement,
    ) -> Result<(), VerifierError> {
        if let Some(expected_mint) = &requirement.token_mint {
            let expected =
                Pubkey::from_str(expected_mint).map_err(|_| VerifierError::InvalidTokenMint)?;
            if transfer.mint != expected {
                return Err(VerifierError::InvalidTokenMint);
            }
        }
        Ok(())
    }

    /// Send transaction with retry and circuit breaker protection
    /// Per spec (22-x402-verifier.md lines 255-266): Different retry policies for different errors
    async fn send_transaction(
        &self,
        tx: &VersionedTransaction,
    ) -> Result<Signature, VerifierError> {
        // Check circuit breaker before attempting
        if !self.circuit_breaker.allow() {
            record_solana_rpc_call("sendTransaction", false, 0.0);
            return Err(VerifierError::Network(
                "Solana RPC circuit breaker is open".into(),
            ));
        }

        let mut rate_limit_retries = 0;
        let mut timeout_retries = 0;
        let mut backoff = RATE_LIMIT_INITIAL_BACKOFF;

        // Build config like Go does: SkipPreflight + PreflightCommitment
        let config = RpcSendTransactionConfig {
            skip_preflight: self.skip_preflight,
            preflight_commitment: Some(self.commitment.commitment),
            ..Default::default()
        };

        loop {
            let start = std::time::Instant::now();
            match self
                .rpc_client
                .send_transaction_with_config(tx, config)
                .await
            {
                Ok(sig) => {
                    let duration = start.elapsed().as_secs_f64();
                    tracing::info!(signature = %sig, duration_ms = duration * 1000.0, "Transaction sent successfully");
                    record_solana_rpc_call("sendTransaction", true, duration);
                    self.circuit_breaker.record_success();
                    return Ok(sig);
                }
                Err(e) => {
                    let duration = start.elapsed().as_secs_f64();
                    let err_str = e.to_string().to_lowercase();

                    // Check for rate limiting - exponential backoff per spec line 257
                    if is_rate_limit_error(&err_str) && rate_limit_retries < MAX_TX_RETRIES {
                        record_solana_rpc_call("sendTransaction", false, duration);
                        rate_limit_retries += 1;
                        tokio::time::sleep(backoff).await;
                        backoff = Duration::from_secs_f64(
                            backoff.as_secs_f64() * RATE_LIMIT_BACKOFF_MULTIPLIER,
                        )
                        .min(Duration::from_secs(2));
                        continue;
                    }

                    // Check for network timeout - fixed 500ms backoff per spec line 258
                    if is_network_timeout_error(&err_str)
                        && timeout_retries < MAX_NETWORK_TIMEOUT_RETRIES
                    {
                        record_solana_rpc_call("sendTransaction", false, duration);
                        timeout_retries += 1;
                        self.circuit_breaker.record_failure();
                        tokio::time::sleep(NETWORK_TIMEOUT_BACKOFF).await;
                        continue;
                    }

                    // Check for already processed (idempotent success)
                    if is_already_processed_error(&err_str) {
                        record_solana_rpc_call("sendTransaction", true, duration); // Treat as success
                        self.circuit_breaker.record_success();
                        return Err(VerifierError::AlreadyProcessed);
                    }

                    // Record failure metric
                    record_solana_rpc_call("sendTransaction", false, duration);

                    // Record failure for network/RPC errors (not client errors)
                    // HIGH-007: Include HTTP 5xx server errors, not just rate limits/timeouts
                    let is_rpc_failure = is_rate_limit_error(&err_str)
                        || is_network_timeout_error(&err_str)
                        || is_server_error(&err_str);
                    if is_rpc_failure {
                        self.circuit_breaker.record_failure();
                    }

                    // Check for insufficient funds
                    if is_insufficient_funds_token_error(&err_str) {
                        return Err(VerifierError::InsufficientTokenFunds);
                    }
                    if is_insufficient_funds_sol_error(&err_str) {
                        return Err(VerifierError::InsufficientSolFunds);
                    }

                    // Check for account not found
                    if is_account_not_found_error(&err_str) {
                        return Err(VerifierError::AccountNotFound);
                    }

                    // Check for blockhash expired
                    if is_blockhash_expired_error(&err_str) {
                        return Err(VerifierError::BlockhashExpired);
                    }

                    return Err(VerifierError::Network(e.to_string()));
                }
            }
        }
    }

    /// Wait for transaction confirmation
    ///
    /// Uses RPC polling like Go does. WebSocket has subscription ID mapping bugs.
    async fn await_confirmation(&self, signature: &Signature) -> Result<(), VerifierError> {
        tracing::info!(signature = %signature, "await_confirmation: using RPC polling");

        // Use RPC polling directly (WebSocket implementation has bugs with subscription ID mapping)
        // This matches Go's fallback behavior which is reliable
        let result = timeout(
            DEFAULT_CONFIRMATION_TIMEOUT,
            self.poll_confirmation(signature),
        )
        .await;

        match result {
            Ok(Ok(())) => Ok(()),
            Ok(Err(e)) => Err(e),
            Err(_) => Err(VerifierError::Failed("confirmation timeout".into())),
        }
    }

    /// Poll for transaction confirmation using GetSignatureStatuses (like Go does)
    async fn poll_confirmation(&self, signature: &Signature) -> Result<(), VerifierError> {
        let poll_start = std::time::Instant::now();
        let mut consecutive_network_errors = 0u32;
        tracing::info!(signature = %signature, "Starting poll_confirmation");

        loop {
            // Per spec (22-x402-verifier.md): Use DEFAULT_CONFIRMATION_TIMEOUT (120s) for polling
            if poll_start.elapsed() > DEFAULT_CONFIRMATION_TIMEOUT {
                tracing::warn!(signature = %signature, "Confirmation timeout after 120s");
                record_solana_tx_confirmation("timeout");
                return Err(VerifierError::TransactionNotFound);
            }

            let call_start = std::time::Instant::now();
            // Use get_signature_statuses_with_history to search full ledger (like Go's searchTransactionHistory: true)
            match self
                .rpc_client
                .get_signature_statuses_with_history(&[*signature])
                .await
            {
                Ok(response) => {
                    let duration = call_start.elapsed().as_secs_f64();
                    record_solana_rpc_call("getSignatureStatuses", true, duration);
                    consecutive_network_errors = 0; // Reset on success

                    if let Some(Some(status)) = response.value.first() {
                        tracing::debug!(
                            signature = %signature,
                            confirmation_status = ?status.confirmation_status,
                            err = ?status.err,
                            "Got signature status"
                        );

                        // Check if transaction failed
                        if status.err.is_some() {
                            tracing::error!(signature = %signature, err = ?status.err, "Transaction failed");
                            record_solana_tx_confirmation("failed");
                            return Err(VerifierError::TransactionFailed);
                        }

                        // Check confirmation status matches our commitment level
                        if let Some(confirmation_status) = &status.confirmation_status {
                            let is_confirmed = match self.commitment.commitment {
                                solana_sdk::commitment_config::CommitmentLevel::Finalized => {
                                    confirmation_status == &solana_transaction_status::TransactionConfirmationStatus::Finalized
                                }
                                solana_sdk::commitment_config::CommitmentLevel::Confirmed => {
                                    confirmation_status == &solana_transaction_status::TransactionConfirmationStatus::Confirmed
                                        || confirmation_status == &solana_transaction_status::TransactionConfirmationStatus::Finalized
                                }
                                _ => {
                                    // For processed or other levels, accept any confirmation
                                    true
                                }
                            };

                            if is_confirmed {
                                tracing::info!(signature = %signature, status = ?confirmation_status, "Transaction confirmed!");
                                record_solana_tx_confirmation("confirmed");
                                return Ok(());
                            }
                        }
                    }
                    // Transaction not confirmed yet, continue polling
                }
                Err(e) => {
                    let duration = call_start.elapsed().as_secs_f64();
                    let err_str = e.to_string().to_lowercase();
                    record_solana_rpc_call("getSignatureStatuses", false, duration);

                    if is_transaction_not_found_error(&err_str) {
                        // Transaction not found yet - this is expected while polling
                        consecutive_network_errors = 0;
                    } else if is_network_timeout_error(&err_str) || is_server_error(&err_str) {
                        // Network/server error - retry with backoff up to MAX_NETWORK_TIMEOUT_RETRIES
                        // HIGH-007: Include HTTP 5xx server errors
                        consecutive_network_errors += 1;
                        if consecutive_network_errors >= MAX_NETWORK_TIMEOUT_RETRIES {
                            tracing::error!(
                                signature = %signature,
                                consecutive_errors = consecutive_network_errors,
                                "Too many consecutive network errors during confirmation polling"
                            );
                            return Err(VerifierError::Network(e.to_string()));
                        }
                        tracing::warn!(
                            signature = %signature,
                            error = %e,
                            attempt = consecutive_network_errors,
                            "Network error during confirmation polling, will retry"
                        );
                        self.circuit_breaker.record_failure();
                        tokio::time::sleep(NETWORK_TIMEOUT_BACKOFF).await;
                        continue; // Skip normal poll interval, use backoff
                    } else {
                        // Other errors are fatal
                        return Err(VerifierError::Network(e.to_string()));
                    }
                }
            }

            // Poll every 2 seconds like Go does (x402.RPCPollInterval = 2 * time.Second)
            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    }

    /// Get RPC client
    pub fn rpc_client(&self) -> Arc<RpcClient> {
        self.rpc_client.clone()
    }

    /// Get health checker
    pub fn health_checker(&self) -> Option<Arc<WalletHealthChecker>> {
        self.health_checker.clone()
    }

    /// Shutdown the transaction queue and cancel any pending sends
    ///
    /// Per spec (22-x402-verifier.md): Must have explicit shutdown methods
    pub async fn shutdown_tx_queue(&self) {
        if let Some(queue) = &self.tx_queue {
            queue.shutdown().await;
        }
    }

    /// Build a gasless transaction for user payment
    /// Per spec 22-x402-verifier.md: BuildGaslessTransaction method
    ///
    /// This method delegates to GaslessTransactionBuilder if gasless is enabled
    pub async fn build_gasless_transaction(
        &self,
        user_wallet: &str,
        recipient: &str,
        token_mint: &str,
        amount: u64,
        decimals: u8,
        memo: Option<&str>,
    ) -> Result<GaslessTxResponse, VerifierError> {
        if !self.gasless_enabled {
            return Err(VerifierError::Invalid("gasless not enabled".into()));
        }

        if self.server_wallets.is_empty() {
            return Err(VerifierError::Invalid(
                "no server wallets configured".into(),
            ));
        }

        let user_pubkey = Pubkey::from_str(user_wallet)
            .map_err(|_| VerifierError::Invalid("invalid user wallet".into()))?;
        let recipient_pubkey = Pubkey::from_str(recipient)
            .map_err(|_| VerifierError::Invalid("invalid recipient".into()))?;
        let mint_pubkey = Pubkey::from_str(token_mint)
            .map_err(|_| VerifierError::Invalid("invalid token mint".into()))?;

        // Use health-aware wallet selection
        let server_wallet = self
            .get_next_server_wallet()
            .ok_or_else(|| VerifierError::Invalid("no server wallets available".into()))?;

        // Get recipient's token account
        let recipient_ata = spl_associated_token_account::get_associated_token_address(
            &recipient_pubkey,
            &mint_pubkey,
        );

        // Get user's token account (source)
        let source_ata =
            spl_associated_token_account::get_associated_token_address(&user_pubkey, &mint_pubkey);

        // PERF-001: Use cached blockhash to reduce RPC calls (1 call vs 2)
        let blockhash_resp = self
            .blockhash_cache
            .get_blockhash()
            .await
            .map_err(|e| VerifierError::Network(e.to_string()))?;
        let recent_blockhash = blockhash_resp
            .blockhash
            .parse::<solana_sdk::hash::Hash>()
            .map_err(|e| VerifierError::Network(format!("invalid blockhash: {}", e)))?;
        let _last_valid_block_height = blockhash_resp.last_valid_block_height;

        // Build compute budget instructions (use config values like Go does)
        let mut instructions = Vec::with_capacity(4);

        if self.compute_unit_limit > 0 {
            instructions.push(
                solana_sdk::compute_budget::ComputeBudgetInstruction::set_compute_unit_limit(
                    self.compute_unit_limit,
                ),
            );
        }
        if self.compute_unit_price > 0 {
            instructions.push(
                solana_sdk::compute_budget::ComputeBudgetInstruction::set_compute_unit_price(
                    self.compute_unit_price,
                ),
            );
        }

        // Transfer instruction
        let transfer_ix = spl_token::instruction::transfer_checked(
            &spl_token::id(),
            &source_ata,
            &mint_pubkey,
            &recipient_ata,
            &user_pubkey,
            &[],
            amount,
            decimals,
        )
        .map_err(|e| VerifierError::Invalid(format!("build transfer ix: {}", e)))?;
        instructions.push(transfer_ix);

        // Optional memo
        if let Some(memo_text) = memo {
            let memo_ix = spl_memo::build_memo(memo_text.as_bytes(), &[&user_pubkey]);
            instructions.push(memo_ix);
        }

        // Build message with server as fee payer AND blockhash (like Go does)
        let message = solana_sdk::message::Message::new_with_blockhash(
            &instructions,
            Some(&server_wallet.pubkey),
            &recent_blockhash,
        );

        // Create transaction with pre-allocated signature slots (like Go does)
        // This is critical - Phantom needs to know how many signatures are required
        let num_required_signatures = message.header.num_required_signatures as usize;
        let signatures = vec![solana_sdk::signature::Signature::default(); num_required_signatures];

        let tx = solana_sdk::transaction::Transaction {
            signatures,
            message,
        };

        // Serialize transaction using bincode (same wire format as Solana)
        let tx_bytes = bincode::serialize(&tx)
            .map_err(|e| VerifierError::Invalid(format!("serialize: {}", e)))?;

        Ok(GaslessTxResponse {
            transaction: BASE64.encode(&tx_bytes),
            blockhash: recent_blockhash.to_string(),
            fee_payer: server_wallet.pubkey.to_string(),
        })
    }

    /// Close all connections and cleanup resources
    ///
    /// Per spec (22-x402-verifier.md): Must have explicit Close method
    pub async fn close(&self) {
        // Shutdown transaction queue first
        self.shutdown_tx_queue().await;

        // Disconnect WebSocket confirmation service if running
        if let Some(ws) = &self.ws_confirmation {
            ws.disconnect().await;
        }

        // Health checker doesn't need explicit cleanup (no persistent connections)
    }
}

/// Response type for build_gasless_transaction per spec 22-x402-verifier.md
#[derive(Debug, Clone)]
pub struct GaslessTxResponse {
    pub transaction: String,
    pub blockhash: String,
    pub fee_payer: String,
}

#[async_trait]
impl Verifier for SolanaVerifier {
    async fn verify(
        &self,
        proof: PaymentProof,
        requirement: Requirement,
    ) -> Result<VerificationResult, VerifierError> {
        // Validate requirement
        if requirement.recipient_owner.is_none() {
            return Err(ErrorCode::InvalidRecipient.into());
        }
        if requirement.token_mint.is_none() {
            return Err(ErrorCode::InvalidTokenMint.into());
        }
        if proof.transaction.is_empty() {
            return Err(ErrorCode::InvalidTransaction.into());
        }

        // Per spec (07-payment-processing.md): Validate network matches expected
        if proof.network != self.network {
            return Err(VerifierError::Invalid(format!(
                "network mismatch: expected {}, got {}",
                self.network, proof.network
            )));
        }

        // Decode transaction
        let mut tx = Self::decode_transaction(&proof.transaction)?;

        // Extract transfer details (supports both Transfer and TransferChecked like Go)
        let transfer = self.extract_transfer_details(&tx, &requirement)?;

        // Verify amount
        self.verify_amount(&transfer, &requirement)?;

        // Verify recipient
        self.verify_recipient(&transfer, &requirement)?;

        // Verify mint
        self.verify_mint(&transfer, &requirement)?;

        // Verify memo includes resource id (binds payment to resource)
        Self::verify_memo(&tx, &requirement)?;

        // Handle gasless: co-sign with server wallet
        if let (true, Some(fee_payer_str)) = (self.gasless_enabled, proof.fee_payer.as_ref()) {
            let fee_payer = Pubkey::from_str(fee_payer_str)
                .map_err(|_| VerifierError::Invalid("invalid fee payer".into()))?;

            let server_wallet = self
                .find_server_wallet(&fee_payer)
                .ok_or_else(|| VerifierError::Invalid("fee payer not a server wallet".into()))?;

            // SECURITY: validate co-sign request is restricted to allowed programs.
            crate::x402::gasless::validate_transaction_programs(&tx)
                .map_err(|e| VerifierError::Failed(format!("gasless validation failed: {e}")))?;

            // CRIT-005: Ensure fee payer in tx matches the server wallet.
            let fee_payer_in_tx = match &tx.message {
                solana_sdk::message::VersionedMessage::Legacy(m) => m
                    .account_keys
                    .first()
                    .copied()
                    .ok_or_else(|| VerifierError::Invalid("missing fee payer".into()))?,
                solana_sdk::message::VersionedMessage::V0(m) => m
                    .account_keys
                    .first()
                    .copied()
                    .ok_or_else(|| VerifierError::Invalid("missing fee payer".into()))?,
            };

            if fee_payer_in_tx != server_wallet.pubkey {
                return Err(VerifierError::Invalid("fee payer mismatch".into()));
            }

            // Partially sign with server wallet
            let message_data = tx.message.serialize();
            let sig = server_wallet.keypair.sign_message(&message_data);
            set_primary_signature(&mut tx, sig)?;
        }

        // Send transaction with ATA auto-creation retry per spec (22-x402-verifier.md lines 493-516)
        let signature = match self.send_transaction(&tx).await {
            Ok(sig) => sig,
            Err(VerifierError::AlreadyProcessed) => {
                // Transaction already confirmed - treat as success
                signature_from_transaction(&tx)?
            }
            Err(VerifierError::AccountNotFound) if self.auto_create_token_accounts => {
                // Per spec: Auto-create ATA and retry original transaction
                tracing::info!("Account not found, attempting to create ATA");

                // Get server wallet for ATA creation (use first available)
                let server_wallet = self.server_wallets.first().ok_or_else(|| {
                    VerifierError::Invalid("no server wallet for ATA creation".into())
                })?;

                // Get recipient and mint from requirement
                let recipient_owner = Pubkey::from_str(
                    requirement
                        .recipient_owner
                        .as_ref()
                        .ok_or_else(|| VerifierError::Invalid("missing recipient owner".into()))?,
                )
                .map_err(|_| VerifierError::Invalid("invalid recipient owner".into()))?;
                let mint = Pubkey::from_str(
                    requirement
                        .token_mint
                        .as_ref()
                        .ok_or_else(|| VerifierError::Invalid("missing token mint".into()))?,
                )
                .map_err(|_| VerifierError::Invalid("invalid token mint".into()))?;

                // Create ATA instruction
                let create_ata_ix =
                    spl_associated_token_account::instruction::create_associated_token_account(
                        &server_wallet.pubkey,
                        &recipient_owner,
                        &mint,
                        &spl_token::id(),
                    );

                // Bound per-RPC await so ATA auto-create can't hang request paths.
                // Route-level payment timeout is 60s, so keep per-call timeouts tight.
                const ATA_RPC_CALL_TIMEOUT: Duration = Duration::from_secs(2);

                // Get recent blockhash
                let recent_blockhash = match rpc_attempt_with_timeout(
                    ATA_RPC_CALL_TIMEOUT,
                    self.rpc_client.get_latest_blockhash(),
                )
                .await
                {
                    Ok(bh) => bh,
                    Err(RpcAttemptError::Timeout) => {
                        return Err(VerifierError::Network("get blockhash: timeout".into()));
                    }
                    Err(RpcAttemptError::Failed(e)) => {
                        return Err(VerifierError::Network(format!("get blockhash: {}", e)));
                    }
                };

                // Build and send ATA creation transaction
                let ata_tx = solana_sdk::transaction::Transaction::new_signed_with_payer(
                    &[create_ata_ix],
                    Some(&server_wallet.pubkey),
                    &[&server_wallet.keypair],
                    recent_blockhash,
                );

                match rpc_attempt_with_timeout(
                    DEFAULT_CONFIRMATION_TIMEOUT,
                    self.rpc_client.send_and_confirm_transaction(&ata_tx),
                )
                .await
                {
                    Ok(_) => {}
                    Err(RpcAttemptError::Timeout) => {
                        return Err(VerifierError::Failed("ATA creation timeout".into()));
                    }
                    Err(RpcAttemptError::Failed(e)) => {
                        return Err(VerifierError::Failed(format!("ATA creation failed: {}", e)));
                    }
                };

                tracing::info!("ATA created successfully, waiting for propagation");

                // Wait for account propagation with exponential backoff per spec
                let ata = spl_associated_token_account::get_associated_token_address(
                    &recipient_owner,
                    &mint,
                );
                let mut backoff = Duration::from_millis(500);
                let max_backoff = Duration::from_secs(2);
                let max_attempts = 30;

                for attempt in 0..max_attempts {
                    match rpc_attempt_with_timeout(
                        ATA_RPC_CALL_TIMEOUT,
                        self.rpc_client.get_account(&ata),
                    )
                    .await
                    {
                        Ok(_) => {
                            tracing::debug!(attempt, "ATA propagated");
                            break;
                        }
                        Err(RpcAttemptError::Timeout) if attempt < max_attempts - 1 => {
                            tokio::time::sleep(backoff).await;
                            backoff = (backoff * 2).min(max_backoff);
                        }
                        Err(RpcAttemptError::Failed(_)) if attempt < max_attempts - 1 => {
                            tokio::time::sleep(backoff).await;
                            backoff = (backoff * 2).min(max_backoff);
                        }
                        Err(RpcAttemptError::Timeout) => {
                            return Err(VerifierError::Failed(
                                "ATA propagation timeout: rpc timeout".into(),
                            ));
                        }
                        Err(RpcAttemptError::Failed(e)) => {
                            return Err(VerifierError::Failed(format!(
                                "ATA propagation timeout: {}",
                                e
                            )));
                        }
                    }
                }

                // Retry original transaction
                tracing::info!("Retrying original transaction after ATA creation");
                self.send_transaction(&tx).await?
            }
            Err(e) => return Err(e),
        };

        // Wait for confirmation
        self.await_confirmation(&signature).await?;

        // Build result - use max(QuoteTTL, DefaultAccessTTL) like Go does
        let ttl = if let Some(quote_ttl_secs) = requirement.quote_ttl {
            let quote_ttl = Duration::from_secs(quote_ttl_secs);
            if quote_ttl > DEFAULT_ACCESS_TTL {
                quote_ttl
            } else {
                DEFAULT_ACCESS_TTL
            }
        } else {
            DEFAULT_ACCESS_TTL
        };
        let expires_at = Utc::now()
            + chrono::Duration::from_std(ttl).unwrap_or_else(|_| chrono::Duration::hours(24));

        // Amount stays in atomic units per spec (05-data-models.md)
        // BUG-005: Check for overflow when casting u64 to i64
        let amount_i64 = i64::try_from(transfer.amount).map_err(|_| {
            VerifierError::Invalid(format!(
                "amount {} exceeds maximum representable value",
                transfer.amount
            ))
        })?;

        Ok(VerificationResult {
            wallet: transfer.owner.to_string(),
            amount: amount_i64,
            signature: signature.to_string(),
            expires_at,
        })
    }
}

fn signature_from_transaction(tx: &VersionedTransaction) -> Result<Signature, VerifierError> {
    tx.signatures
        .first()
        .copied()
        .ok_or_else(|| VerifierError::Invalid("missing tx signature".into()))
}

fn set_primary_signature(
    tx: &mut VersionedTransaction,
    sig: Signature,
) -> Result<(), VerifierError> {
    let slot = tx
        .signatures
        .get_mut(0)
        .ok_or_else(|| VerifierError::Invalid("missing signature slot".into()))?;
    *slot = sig;
    Ok(())
}

/// Transfer instruction details parsed from SPL Token transfer instructions.
/// Used for validating payment amounts and destinations in transaction verification.
#[derive(Debug)]
struct TransferDetails {
    _source: Pubkey,
    destination: Pubkey,
    mint: Pubkey,
    owner: Pubkey,
    amount: u64,
    decimals: u8,
}

/// Parse commitment config from string
/// Per spec (12-integrations.md): Default to finalized, support British spelling "finalised"
pub(crate) fn parse_commitment(s: &str) -> CommitmentConfig {
    match s.to_lowercase().as_str() {
        "processed" => CommitmentConfig::processed(),
        "confirmed" => CommitmentConfig::confirmed(),
        "finalized" | "finalised" => CommitmentConfig::finalized(),
        _ => CommitmentConfig::finalized(), // Default to finalized per spec
    }
}

// DEAD-003: is_rate_limit_error moved to super::utils for consolidation

// ============================================================================
// Error Classification Functions
// ============================================================================
//
// NOTE: These use string matching rather than typed error downcasting.
// This is intentional for several reasons:
// 1. Solana SDK error types change between versions
// 2. Errors may be wrapped in multiple layers (anyhow, transport errors, etc.)
// 3. This matches the Go server's patterns for behavioral compatibility
// 4. Multiple variations are matched to be defensive against SDK changes
//
// The trade-off is that if Solana SDK changes error message text (rare),
// these patterns may need updating. However, this is preferable to breaking
// on SDK version upgrades or wrapped error types.

/// Check for network timeout error per spec (22-x402-verifier.md line 258)
fn is_network_timeout_error(err: &str) -> bool {
    err.contains("timeout") || err.contains("connection") || err.contains("timed out")
}

/// Check for HTTP 5xx server errors that indicate RPC is unhealthy (HIGH-007)
/// These errors should trip the circuit breaker as they indicate server-side issues.
fn is_server_error(err: &str) -> bool {
    err.contains("500")
        || err.contains("502")
        || err.contains("503")
        || err.contains("504")
        || err.contains("internal server error")
        || err.contains("bad gateway")
        || err.contains("service unavailable")
        || err.contains("gateway timeout")
}

/// Check for already processed error
fn is_already_processed_error(err: &str) -> bool {
    err.contains("alreadyprocessed") || err.contains("already been processed")
}

/// Check for insufficient token funds
fn is_insufficient_funds_token_error(err: &str) -> bool {
    (err.contains("insufficient") && (err.contains("token") || err.contains("funds")))
        || err.contains("custom program error: 0x1")
        || err.contains("error: insufficient funds")
}

/// Check for insufficient SOL funds
fn is_insufficient_funds_sol_error(err: &str) -> bool {
    err.contains("insufficient funds for fee")
        || (err.contains("insufficient") && err.contains("lamports"))
}

/// Check for account not found (matches Go's isAccountNotFoundError)
fn is_account_not_found_error(err: &str) -> bool {
    err.contains("account not found")
        || err.contains("accountnotfound")
        || err.contains("could not find account")
        || err.contains("invalid account owner")
        || err.contains("invalidaccountdata")
        || err.contains("invalid account data")
}

/// Check for blockhash expired
fn is_blockhash_expired_error(err: &str) -> bool {
    err.contains("blockhashnotfound") || err.contains("blockhash not found")
}

/// Check for transaction not found
fn is_transaction_not_found_error(err: &str) -> bool {
    // Use exact match only - "not found" is too broad and would incorrectly match
    // "account not found", "blockhash not found", "mint not found", etc.
    // Those are real errors that should not be treated as "pending transaction".
    err.contains("transaction not found")
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::hash::Hash;
    use solana_sdk::message::Message;
    use solana_sdk::signature::Keypair;
    use solana_sdk::transaction::Transaction;

    fn build_memo_tx(memo: Option<&str>) -> VersionedTransaction {
        let payer = Keypair::new();
        let mut instructions = Vec::new();
        if let Some(text) = memo {
            instructions.push(spl_memo::build_memo(text.as_bytes(), &[&payer.pubkey()]));
        }
        let message = Message::new(&instructions, Some(&payer.pubkey()));
        let tx = Transaction::new_unsigned(message);
        VersionedTransaction::from(tx)
    }

    #[test]
    fn test_required_amount_atomic_prefers_atomic() {
        let req = Requirement {
            amount: f64::NAN,
            amount_atomic: Some(123),
            ..Requirement::default()
        };
        let atomic = SolanaVerifier::required_amount_atomic(&req, 6).expect("atomic");
        assert_eq!(atomic, 123);
    }

    #[test]
    fn test_extract_memo_text_returns_value() {
        let tx = build_memo_tx(Some("product-1"));
        let memo = SolanaVerifier::extract_memo_text(&tx).expect("memo parse");
        assert_eq!(memo, Some("product-1".to_string()));
    }

    #[test]
    fn test_verify_memo_missing_returns_error() {
        let tx = build_memo_tx(None);
        let requirement = Requirement {
            resource_id: "product-1".to_string(),
            ..Requirement::default()
        };

        let result = SolanaVerifier::verify_memo(&tx, &requirement);
        match result {
            Ok(_) => panic!("expected missing memo error"),
            Err(VerifierError::Code(code)) => assert_eq!(code, ErrorCode::MissingMemo),
            Err(other) => panic!("unexpected error: {other:?}"),
        }
    }

    #[test]
    fn test_verify_memo_rejects_prefix_collision() {
        let tx = build_memo_tx(Some("product-10:123e4567-e89b-12d3-a456-426614174000"));
        let requirement = Requirement {
            resource_id: "product-1".to_string(),
            ..Requirement::default()
        };

        let result = SolanaVerifier::verify_memo(&tx, &requirement);
        match result {
            Ok(_) => panic!("expected invalid memo error"),
            Err(VerifierError::Code(code)) => assert_eq!(code, ErrorCode::InvalidMemo),
            Err(other) => panic!("unexpected error: {other:?}"),
        }
    }

    #[test]
    fn test_verify_memo_accepts_resource_with_nonce() {
        let tx = build_memo_tx(Some("product-1:123e4567-e89b-12d3-a456-426614174000"));
        let requirement = Requirement {
            resource_id: "product-1".to_string(),
            ..Requirement::default()
        };

        let result = SolanaVerifier::verify_memo(&tx, &requirement);
        assert!(result.is_ok());
    }

    #[test]
    fn test_verify_memo_accepts_cart_suffix_with_prefix() {
        let cart_id = "cart_0123456789abcdef0123456789abcdef";
        let memo = format!("cedroscart:{}", cart_id);
        let tx = build_memo_tx(Some(&memo));
        let requirement = Requirement {
            resource_id: format!("cart:{}", cart_id),
            ..Requirement::default()
        };

        let result = SolanaVerifier::verify_memo(&tx, &requirement);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_rpc_attempt_with_timeout_times_out() {
        let result = rpc_attempt_with_timeout(
            Duration::from_millis(5),
            std::future::pending::<Result<(), &'static str>>(),
        )
        .await;

        assert!(matches!(result, Err(RpcAttemptError::Timeout)));
    }

    #[test]
    fn test_signature_from_transaction_uses_tx_signature() {
        let payer = Keypair::new();
        let message = Message::new(&[], Some(&payer.pubkey()));
        let mut tx = Transaction::new_unsigned(message);
        tx.try_sign(&[&payer], Hash::new_unique()).expect("sign");
        let vtx = VersionedTransaction::from(tx);

        let expected = vtx.signatures.first().copied().expect("signature");
        let actual = signature_from_transaction(&vtx).expect("extract");
        assert_eq!(actual, expected);
    }

    #[test]
    fn test_set_primary_signature_requires_slot() {
        let payer = Keypair::new();
        let message = Message::new(&[], Some(&payer.pubkey()));
        let mut vtx = VersionedTransaction {
            signatures: Vec::new(),
            message: solana_sdk::message::VersionedMessage::Legacy(message),
        };

        let result = set_primary_signature(&mut vtx, Signature::default());
        assert!(matches!(result, Err(VerifierError::Invalid(_))));
    }

    // M-003: Tests for f64 precision loss fix
    #[test]
    fn test_required_amount_atomic_rejects_nan() {
        let req = Requirement {
            amount: f64::NAN,
            amount_atomic: None,
            ..Requirement::default()
        };
        let result = SolanaVerifier::required_amount_atomic(&req, 9);
        assert!(matches!(result, Err(VerifierError::Invalid(ref s)) if s.contains("finite")));
    }

    #[test]
    fn test_required_amount_atomic_rejects_negative() {
        let req = Requirement {
            amount: -1.0,
            amount_atomic: None,
            ..Requirement::default()
        };
        let result = SolanaVerifier::required_amount_atomic(&req, 9);
        assert!(matches!(result, Err(VerifierError::Invalid(ref s)) if s.contains("non-negative")));
    }

    #[test]
    fn test_required_amount_atomic_rejects_infinite() {
        let req = Requirement {
            amount: f64::INFINITY,
            amount_atomic: None,
            ..Requirement::default()
        };
        let result = SolanaVerifier::required_amount_atomic(&req, 9);
        assert!(matches!(result, Err(VerifierError::Invalid(ref s)) if s.contains("finite")));
    }

    #[test]
    fn test_required_amount_atomic_rejects_large_amount_for_precision_loss() {
        // 10M SOL with 9 decimals exceeds the safe threshold (~9M)
        let req = Requirement {
            amount: 10_000_000.0, // 10M SOL
            amount_atomic: None,
            ..Requirement::default()
        };
        let result = SolanaVerifier::required_amount_atomic(&req, 9);
        assert!(
            matches!(result, Err(VerifierError::Invalid(ref s)) if s.contains("exceeds max safe amount"))
        );
    }

    #[test]
    fn test_required_amount_atomic_accepts_safe_amount() {
        // 1M SOL with 9 decimals is within safe threshold
        let req = Requirement {
            amount: 1_000_000.0, // 1M SOL
            amount_atomic: None,
            ..Requirement::default()
        };
        let result = SolanaVerifier::required_amount_atomic(&req, 9);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1_000_000_000_000_000u64); // 1M * 10^9
    }

    #[test]
    fn test_required_amount_atomic_uses_u128_for_calculation() {
        // Test that we can handle large but safe amounts correctly
        let req = Requirement {
            amount: 100_000.0, // 100K SOL
            amount_atomic: None,
            ..Requirement::default()
        };
        let result = SolanaVerifier::required_amount_atomic(&req, 9).expect("valid conversion");
        assert_eq!(result, 100_000_000_000_000u64); // 100K * 10^9
    }

    #[test]
    fn test_required_amount_atomic_small_with_many_decimals() {
        // Test with a token that has 18 decimals (like some ERC-20 tokens)
        // Small amounts with many decimals should work
        let req = Requirement {
            amount: 0.001, // Small amount with 18 decimals
            amount_atomic: None,
            ..Requirement::default()
        };
        // With 18 decimals, 0.001 * 10^18 = 10^15 which is within u64 range
        let result = SolanaVerifier::required_amount_atomic(&req, 18);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1_000_000_000_000_000u64); // 0.001 * 10^18
    }

    #[test]
    fn test_required_amount_atomic_small_amounts_work() {
        // Small amounts should work fine
        let req = Requirement {
            amount: 1.0,
            amount_atomic: None,
            ..Requirement::default()
        };
        let result = SolanaVerifier::required_amount_atomic(&req, 9).expect("valid conversion");
        assert_eq!(result, 1_000_000_000u64); // 1 * 10^9
    }

    #[test]
    fn test_required_amount_atomic_zero_amount() {
        let req = Requirement {
            amount: 0.0,
            amount_atomic: None,
            ..Requirement::default()
        };
        let result = SolanaVerifier::required_amount_atomic(&req, 9).expect("valid conversion");
        assert_eq!(result, 0u64);
    }
}
