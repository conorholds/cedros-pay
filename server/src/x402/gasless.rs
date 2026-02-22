use std::str::FromStr;
use std::sync::Arc;
use std::time::{Duration, Instant};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::compute_budget::ComputeBudgetInstruction;
use solana_sdk::hash::Hash;
use solana_sdk::instruction::Instruction;
use solana_sdk::message::Message;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::{Keypair, Signature};
use solana_sdk::signer::Signer;
use solana_sdk::transaction::VersionedTransaction;
use thiserror::Error;
use tokio::sync::RwLock;
use tracing::{debug, info};

use crate::config::X402Config;
use crate::constants::{
    ATA_PROPAGATION_INITIAL_BACKOFF, ATA_PROPAGATION_MAX_BACKOFF, MAX_ATA_PROPAGATION_ATTEMPTS,
    TX_CONFIRM_TIMEOUT,
};

use super::utils::{RpcAttemptError, rpc_attempt_with_timeout};
use super::verifier::{parse_commitment, ServerWallet};

/// Cached blockhash entry with expiration.
///
/// This is a simple data struct for the gasless builder's internal cache.
/// See `crate::services::BlockhashCache` for the shared service-level cache
/// with single-flight deduplication (used by verifier/paywall endpoints).
struct CachedBlockhashEntry {
    hash: Hash,
    last_valid_block_height: u64,
    fetched_at: Instant,
}

/// How long to cache blockhash (Go uses similar logic)
const BLOCKHASH_CACHE_TTL: Duration = Duration::from_secs(1);

#[derive(Debug, Error)]
pub enum GaslessError {
    #[error("no server wallet available")]
    NoServerWallet,
    #[error("RPC error: {0}")]
    RpcError(String),
    #[error("invalid pubkey: {0}")]
    InvalidPubkey(String),
    #[error("ATA creation failed: {0}")]
    AtaCreationFailed(String),
    #[error("send failed: {0}")]
    SendFailed(String),
    #[error("timeout")]
    Timeout,
}

/// Build and submit gasless transactions for Solana.
/// Note: Fields stored for internal state management. The struct is constructed
/// but individual fields may not be accessed via public methods currently.
pub struct GaslessTransactionBuilder {
    rpc_client: Arc<RpcClient>,
    server_wallets: Vec<ServerWallet>,
    compute_unit_limit: u32,
    compute_unit_price: u64,
    /// Cached blockhash to avoid fetching more than once per second (like Go does)
    blockhash_cache: Arc<RwLock<Option<CachedBlockhashEntry>>>,
}

/// Memo Program v1 (legacy) pubkey, parsed once at startup.
static MEMO_V1_PUBKEY: once_cell::sync::Lazy<Pubkey> = once_cell::sync::Lazy::new(|| {
    Pubkey::from_str("Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo").expect("valid memo v1 pubkey")
});

/// SEC-011: Validate that a transaction only uses allowed programs.
///
/// This is shared by the gasless builder and the verifier. Both sides must enforce
/// the same allowlist, since the verifier may co-sign transactions.
pub(crate) fn validate_transaction_programs(tx: &VersionedTransaction) -> Result<(), GaslessError> {
    use solana_sdk::message::VersionedMessage;

    // Allowed program IDs for gasless transactions
    let allowed_programs: &[Pubkey] = &[
        spl_token::id(),                    // SPL Token Program
        solana_sdk::compute_budget::id(),   // Compute Budget Program
        spl_memo::id(),                     // Memo Program v2
        spl_associated_token_account::id(), // ATA Program
        *MEMO_V1_PUBKEY,                    // Memo Program v1 (legacy)
    ];

    let account_keys = match &tx.message {
        VersionedMessage::Legacy(m) => &m.account_keys,
        VersionedMessage::V0(m) => &m.account_keys,
    };

    let instructions = match &tx.message {
        VersionedMessage::Legacy(m) => &m.instructions,
        VersionedMessage::V0(m) => &m.instructions,
    };

    for ix in instructions {
        let program_id = account_keys
            .get(ix.program_id_index as usize)
            .ok_or_else(|| {
                GaslessError::SendFailed("invalid program_id_index in transaction".to_string())
            })?;

        if !allowed_programs.contains(program_id) {
            tracing::warn!(program_id = %program_id, "Rejected co-sign request: disallowed program");
            return Err(GaslessError::SendFailed(format!(
                "disallowed program: {}",
                program_id
            )));
        }
    }

    Ok(())
}

impl GaslessTransactionBuilder {
    pub fn new(config: &X402Config) -> Result<Self, GaslessError> {
        if config.rpc_url.is_empty() {
            return Err(GaslessError::RpcError("rpc_url is required".into()));
        }

        // Use commitment from config (default: confirmed)
        let commitment = parse_commitment(&config.commitment);
        let rpc_client = Arc::new(RpcClient::new_with_commitment(
            config.rpc_url.clone(),
            commitment,
        ));

        let mut server_wallets = Vec::new();
        for wallet_str in &config.server_wallets {
            let wallet = ServerWallet::from_string(wallet_str)
                .map_err(|e| GaslessError::InvalidPubkey(e.to_string()))?;
            server_wallets.push(wallet);
        }

        Ok(Self {
            rpc_client,
            server_wallets,
            compute_unit_limit: config.compute_unit_limit,
            compute_unit_price: config.compute_unit_price_micro_lamports,
            blockhash_cache: Arc::new(RwLock::new(None)),
        })
    }

    /// Create Associated Token Account if it doesn't exist
    pub async fn create_ata_if_needed(
        &self,
        owner: &Pubkey,
        mint: &Pubkey,
        fee_payer: &Keypair,
    ) -> Result<Pubkey, GaslessError> {
        const RPC_CALL_TIMEOUT: Duration = Duration::from_secs(2);

        let ata = spl_associated_token_account::get_associated_token_address(owner, mint);

        // Check if account exists
        match rpc_attempt_with_timeout(RPC_CALL_TIMEOUT, self.rpc_client.get_account(&ata)).await {
            Ok(_) => {
                debug!(ata = %ata, "ATA already exists");
                return Ok(ata);
            }
            Err(RpcAttemptError::Timeout) => return Err(GaslessError::Timeout),
            Err(RpcAttemptError::Failed(e)) => {
                let err_str = e.to_lowercase();
                if !err_str.contains("not found") && !err_str.contains("accountnotfound") {
                    return Err(GaslessError::RpcError(e));
                }
                // Account doesn't exist, proceed to create
            }
        }

        info!(owner = %owner, mint = %mint, ata = %ata, "Creating ATA");

        // Build create ATA instruction
        let create_ix = spl_associated_token_account::instruction::create_associated_token_account(
            &fee_payer.pubkey(),
            owner,
            mint,
            &spl_token::id(),
        );

        // Build transaction
        let recent_blockhash = match rpc_attempt_with_timeout(
            RPC_CALL_TIMEOUT,
            self.rpc_client.get_latest_blockhash(),
        )
        .await
        {
            Ok(bh) => bh,
            Err(RpcAttemptError::Timeout) => return Err(GaslessError::Timeout),
            Err(RpcAttemptError::Failed(e)) => return Err(GaslessError::RpcError(e)),
        };

        let mut instructions = self.build_compute_budget_instructions();
        instructions.push(create_ix);

        // Send transaction
        let sig = match rpc_attempt_with_timeout(
            TX_CONFIRM_TIMEOUT,
            self.rpc_client.send_and_confirm_transaction(
                &solana_sdk::transaction::Transaction::new(
                    &[fee_payer],
                    Message::new(&instructions, Some(&fee_payer.pubkey())),
                    recent_blockhash,
                ),
            ),
        )
        .await
        {
            Ok(sig) => sig,
            Err(RpcAttemptError::Timeout) => return Err(GaslessError::Timeout),
            Err(RpcAttemptError::Failed(e)) => return Err(GaslessError::AtaCreationFailed(e)),
        };

        info!(signature = %sig, ata = %ata, "ATA created successfully");

        // Wait for account to be visible
        self.wait_for_account(&ata).await?;

        Ok(ata)
    }

    /// Wait for account to be visible in RPC
    async fn wait_for_account(&self, pubkey: &Pubkey) -> Result<(), GaslessError> {
        const RPC_CALL_TIMEOUT: Duration = Duration::from_secs(2);
        let mut backoff = ATA_PROPAGATION_INITIAL_BACKOFF;

        for attempt in 0..MAX_ATA_PROPAGATION_ATTEMPTS {
            match rpc_attempt_with_timeout(RPC_CALL_TIMEOUT, self.rpc_client.get_account(pubkey))
                .await
            {
                Ok(_) => {
                    debug!(pubkey = %pubkey, attempts = attempt + 1, "Account visible");
                    return Ok(());
                }
                Err(RpcAttemptError::Timeout) => {
                    tokio::time::sleep(backoff).await;
                    backoff = (backoff * 2).min(ATA_PROPAGATION_MAX_BACKOFF);
                }
                Err(RpcAttemptError::Failed(_)) => {
                    tokio::time::sleep(backoff).await;
                    backoff = (backoff * 2).min(ATA_PROPAGATION_MAX_BACKOFF);
                }
            }
        }

        Err(GaslessError::Timeout)
    }

    /// Build compute budget instructions
    fn build_compute_budget_instructions(&self) -> Vec<Instruction> {
        vec![
            ComputeBudgetInstruction::set_compute_unit_limit(self.compute_unit_limit),
            ComputeBudgetInstruction::set_compute_unit_price(self.compute_unit_price),
        ]
    }

    /// Get blockhash from cache or fetch fresh one (caches for 1 second like Go)
    ///
    /// L-007 FIX: Fetches blockhash BEFORE acquiring write lock to avoid
    /// lock contention during the RPC call. Multiple concurrent callers
    /// may fetch simultaneously, but this is acceptable since:
    /// 1. Blockhash fetching is idempotent and cheap
    /// 2. Solana RPC can handle concurrent requests
    /// 3. Avoids blocking other threads during network latency
    pub async fn get_cached_blockhash(&self) -> Result<(Hash, u64), GaslessError> {
        // Fast path: check cache with read lock
        {
            let cache = self.blockhash_cache.read().await;
            if let Some(ref cached) = *cache {
                if cached.fetched_at.elapsed() < BLOCKHASH_CACHE_TTL {
                    debug!(blockhash = %cached.hash, "Using cached blockhash");
                    return Ok((cached.hash, cached.last_valid_block_height));
                }
            }
        }

        // L-007: Fetch blockhash WITHOUT holding any lock to avoid contention.
        // Multiple tasks may fetch concurrently, but this is cheaper than
        // serializing through a lock during network I/O.
        let (hash, last_valid_block_height) = match rpc_attempt_with_timeout(
            Duration::from_secs(2),
            self.rpc_client
                .get_latest_blockhash_with_commitment(self.rpc_client.commitment()),
        )
        .await
        {
            Ok(v) => v,
            Err(RpcAttemptError::Timeout) => return Err(GaslessError::Timeout),
            Err(RpcAttemptError::Failed(e)) => return Err(GaslessError::RpcError(e)),
        };

        debug!(blockhash = %hash, "Fetched fresh blockhash");

        // Now acquire write lock only to update cache (minimal critical section)
        let mut cache = self.blockhash_cache.write().await;

        // Double-check: cache may have been updated by another task
        // while we were fetching. Use the fresher value.
        if let Some(ref cached) = *cache {
            if cached.fetched_at.elapsed() < BLOCKHASH_CACHE_TTL {
                debug!(blockhash = %cached.hash, "Using newer cached blockhash (set by concurrent task)");
                return Ok((cached.hash, cached.last_valid_block_height));
            }
        }

        // Update cache with our freshly fetched blockhash
        *cache = Some(CachedBlockhashEntry {
            hash,
            last_valid_block_height,
            fetched_at: Instant::now(),
        });

        Ok((hash, last_valid_block_height))
    }

    /// Co-sign a partially signed transaction
    ///
    /// # Security (SEC-011)
    /// This function validates that the transaction only uses allowed programs:
    /// - SPL Token Program (for transfers)
    /// - Compute Budget Program (for priority fees)
    /// - Memo Program (for reference data)
    /// - Associated Token Account Program (for ATA creation)
    ///
    /// Any other program would be rejected to prevent malicious transactions.
    pub fn co_sign_transaction(
        &self,
        tx_base64: &str,
        fee_payer_pubkey: &str,
    ) -> Result<String, GaslessError> {
        let fee_payer = Pubkey::from_str(fee_payer_pubkey)
            .map_err(|e| GaslessError::InvalidPubkey(e.to_string()))?;

        let server_wallet = self
            .server_wallets
            .iter()
            .find(|w| w.pubkey == fee_payer)
            .ok_or(GaslessError::NoServerWallet)?;

        // Decode transaction
        let tx_bytes = BASE64
            .decode(tx_base64)
            .map_err(|e| GaslessError::InvalidPubkey(format!("invalid base64: {}", e)))?;

        let mut tx: VersionedTransaction = bincode::deserialize(&tx_bytes)
            .map_err(|e| GaslessError::InvalidPubkey(format!("invalid transaction: {}", e)))?;

        // SEC-011: Validate that transaction only uses allowed programs (defense-in-depth)
        // Even though verifier.rs validates before calling this, we check here to prevent
        // future code paths from bypassing validation.
        validate_transaction_programs(&tx)?;

        // CRIT-005: Verify that fee payer in transaction matches our server wallet
        // The fee payer is always at account_keys[0] in Solana transactions
        let account_keys = tx.message.static_account_keys();
        if account_keys.is_empty() {
            return Err(GaslessError::SendFailed(
                "transaction has no account keys".to_string(),
            ));
        }
        if account_keys[0] != server_wallet.pubkey {
            return Err(GaslessError::SendFailed(format!(
                "fee payer mismatch: transaction expects {} but server wallet is {}",
                account_keys[0], server_wallet.pubkey
            )));
        }

        // Sign with server wallet
        let message_data = tx.message.serialize();
        let sig = server_wallet.keypair.sign_message(&message_data);

        // BUG-008: Replace first signature (fee payer) - error if empty
        if tx.signatures.is_empty() {
            return Err(GaslessError::SendFailed(
                "transaction has no signatures - cannot sign as fee payer".to_string(),
            ));
        }
        tx.signatures[0] = sig;

        // Re-encode
        let signed_bytes = bincode::serialize(&tx)
            .map_err(|e| GaslessError::SendFailed(format!("serialize error: {}", e)))?;

        Ok(BASE64.encode(signed_bytes))
    }

    /// Get available fee payers (server wallet pubkeys)
    pub fn get_fee_payers(&self) -> Vec<String> {
        self.server_wallets
            .iter()
            .map(|w| w.pubkey.to_string())
            .collect()
    }

    /// Get first fee payer
    pub fn get_default_fee_payer(&self) -> Option<String> {
        self.server_wallets.first().map(|w| w.pubkey.to_string())
    }

    /// Execute a refund transaction (server-signed transfer to recipient)
    /// This transfers tokens FROM the server's token account TO the recipient's token account
    pub async fn execute_refund(
        &self,
        recipient_wallet: &Pubkey,
        mint: &Pubkey,
        amount: u64,
        decimals: u8,
    ) -> Result<Signature, GaslessError> {
        let server_wallet = self
            .server_wallets
            .first()
            .ok_or(GaslessError::NoServerWallet)?;

        // Get server's token account (source)
        let source_ata =
            spl_associated_token_account::get_associated_token_address(&server_wallet.pubkey, mint);

        // Get recipient's token account (destination)
        let dest_ata =
            spl_associated_token_account::get_associated_token_address(recipient_wallet, mint);

        // Ensure recipient ATA exists (create if needed)
        self.create_ata_if_needed(recipient_wallet, mint, &server_wallet.keypair)
            .await?;

        // Build transfer instruction
        let transfer_ix = spl_token::instruction::transfer_checked(
            &spl_token::id(),
            &source_ata,
            mint,
            &dest_ata,
            &server_wallet.pubkey,
            &[],
            amount,
            decimals,
        )
        .map_err(|e| GaslessError::SendFailed(format!("build transfer ix: {}", e)))?;

        let recent_blockhash = match rpc_attempt_with_timeout(
            Duration::from_secs(2),
            self.rpc_client.get_latest_blockhash(),
        )
        .await
        {
            Ok(bh) => bh,
            Err(RpcAttemptError::Timeout) => return Err(GaslessError::Timeout),
            Err(RpcAttemptError::Failed(e)) => return Err(GaslessError::RpcError(e)),
        };

        // Build transaction with compute budget
        let mut instructions = self.build_compute_budget_instructions();
        instructions.push(transfer_ix);

        let message = Message::new(&instructions, Some(&server_wallet.pubkey));
        let tx = solana_sdk::transaction::Transaction::new(
            &[&server_wallet.keypair],
            message,
            recent_blockhash,
        );

        // Send and confirm
        let signature = match rpc_attempt_with_timeout(
            TX_CONFIRM_TIMEOUT,
            self.rpc_client.send_and_confirm_transaction(&tx),
        )
        .await
        {
            Ok(sig) => sig,
            Err(RpcAttemptError::Timeout) => return Err(GaslessError::Timeout),
            Err(RpcAttemptError::Failed(e)) => return Err(GaslessError::SendFailed(e)),
        };

        info!(
            signature = %signature,
            recipient = %recipient_wallet,
            amount = amount,
            "Refund transaction executed"
        );

        Ok(signature)
    }

    /// Build an unsigned gasless transaction for user payment
    /// Returns transaction data that the user must sign
    pub async fn build_payment_transaction(
        &self,
        user_wallet: &Pubkey,
        recipient_ata: &Pubkey,
        mint: &Pubkey,
        amount: u64,
        decimals: u8,
        memo: Option<&str>,
    ) -> Result<GaslessTxData, GaslessError> {
        let server_wallet = self
            .server_wallets
            .first()
            .ok_or(GaslessError::NoServerWallet)?;

        // Get user's token account (source)
        let source_ata =
            spl_associated_token_account::get_associated_token_address(user_wallet, mint);

        // Get blockhash from cache (avoids fetching more than once per second)
        let (recent_blockhash, last_valid_block_height) = self.get_cached_blockhash().await?;

        // Build instructions
        let mut instructions = self.build_compute_budget_instructions();

        // Transfer instruction (user is authority, server is fee payer)
        let transfer_ix = spl_token::instruction::transfer_checked(
            &spl_token::id(),
            &source_ata,
            mint,
            recipient_ata,
            user_wallet,
            &[],
            amount,
            decimals,
        )
        .map_err(|e| GaslessError::SendFailed(format!("build transfer ix: {}", e)))?;
        instructions.push(transfer_ix);

        // Optional memo
        if let Some(memo_text) = memo {
            let memo_ix = spl_memo::build_memo(memo_text.as_bytes(), &[user_wallet]);
            instructions.push(memo_ix);
        }

        // Build message with server as fee payer AND blockhash (like Go does)
        let message = Message::new_with_blockhash(
            &instructions,
            Some(&server_wallet.pubkey),
            &recent_blockhash,
        );

        // Create transaction with pre-allocated signature slots (like Go does)
        // This is critical - Phantom needs to know how many signatures are required
        let num_required_signatures = message.header.num_required_signatures as usize;
        let signatures = vec![Signature::default(); num_required_signatures];

        let tx = solana_sdk::transaction::Transaction {
            signatures,
            message,
        };

        // Serialize transaction using bincode (same wire format as Solana)
        let tx_bytes = bincode::serialize(&tx)
            .map_err(|e| GaslessError::SendFailed(format!("serialize: {}", e)))?;

        Ok(GaslessTxData {
            transaction: BASE64.encode(&tx_bytes),
            fee_payer: server_wallet.pubkey.to_string(),
            blockhash: recent_blockhash.to_string(),
            last_valid_block_height,
            signers: vec![server_wallet.pubkey.to_string()],
        })
    }

    /// Get RPC client for health checks
    pub fn rpc_client(&self) -> &Arc<RpcClient> {
        &self.rpc_client
    }
}

/// Data for a gasless transaction
#[derive(Debug, Clone)]
pub struct GaslessTxData {
    pub transaction: String,
    pub fee_payer: String,
    pub blockhash: String,
    pub last_valid_block_height: u64,
    pub signers: Vec<String>,
}

impl std::fmt::Debug for GaslessTransactionBuilder {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("GaslessTransactionBuilder")
            .field("wallet_count", &self.server_wallets.len())
            .field("compute_unit_limit", &self.compute_unit_limit)
            .field("compute_unit_price", &self.compute_unit_price)
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_rpc_attempt_with_timeout_times_out() {
        let result = rpc_attempt_with_timeout(
            Duration::from_millis(5),
            std::future::pending::<Result<(), &'static str>>(),
        )
        .await;

        assert!(matches!(result, Err(RpcAttemptError::Timeout)));
    }
}
