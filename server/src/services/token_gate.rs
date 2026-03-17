//! Token-gate compliance checker for Solana wallet holdings.
//!
//! Verifies that a buyer's wallet holds a minimum amount of a fungible token
//! or a minimum count of NFTs from a verified Metaplex collection.
//! Checks both classic SPL Token and Token-2022 programs, since tokenized
//! assets use Token-2022 for transfer hooks, freeze authority, and blacklists.

use std::str::FromStr;
use std::sync::Arc;
use std::time::Duration;

use solana_rpc_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::pubkey::Pubkey;
use spl_associated_token_account::get_associated_token_address;

use crate::models::compliance::{TokenGate, TokenGateType};
use crate::services::token22::{get_associated_token_address_2022, TOKEN_2022_PROGRAM_ID};
use crate::ttl_cache::TtlCache;

/// Cache TTL for token gate balance lookups.
const CACHE_TTL: Duration = Duration::from_secs(60);
/// Max cached entries.
const CACHE_CAP: usize = 500;

/// Checks Solana wallet holdings against token gate requirements.
pub struct TokenGateChecker {
    rpc: Arc<RpcClient>,
    cache: TtlCache<u64>,
}

impl TokenGateChecker {
    pub fn new(rpc: Arc<RpcClient>) -> Self {
        Self {
            rpc,
            cache: TtlCache::new(CACHE_CAP),
        }
    }

    /// Check all gates for a wallet. Returns failure reasons (empty = all pass).
    pub async fn check_gates(&self, wallet: &str, gates: &[TokenGate]) -> Vec<String> {
        let wallet_pubkey = match Pubkey::from_str(wallet) {
            Ok(pk) => pk,
            Err(_) => return vec![format!("invalid wallet address: {wallet}")],
        };

        let mut reasons = Vec::new();
        for gate in gates {
            match gate.gate_type {
                TokenGateType::FungibleToken => {
                    match self
                        .check_fungible_balance(&wallet_pubkey, &gate.address)
                        .await
                    {
                        Ok(balance) if balance >= gate.min_amount => {}
                        Ok(balance) => {
                            reasons.push(format!(
                                "insufficient balance for token {}: have {}, need {}",
                                gate.address, balance, gate.min_amount,
                            ));
                        }
                        Err(e) => {
                            reasons.push(format!(
                                "failed to check token balance for {}: {}",
                                gate.address, e,
                            ));
                        }
                    }
                }
                TokenGateType::NftCollection => {
                    match self
                        .check_nft_collection_count(&wallet_pubkey, &gate.address)
                        .await
                    {
                        Ok(count) if count >= gate.min_amount => {}
                        Ok(count) => {
                            reasons.push(format!(
                                "insufficient NFTs from collection {}: have {}, need {}",
                                gate.address, count, gate.min_amount,
                            ));
                        }
                        Err(e) => {
                            reasons.push(format!(
                                "failed to check NFT collection {}: {}",
                                gate.address, e,
                            ));
                        }
                    }
                }
            }
        }
        reasons
    }

    /// Get fungible token balance for a wallet, checking both SPL Token and
    /// Token-2022 ATAs. Returns 0 if neither ATA exists.
    async fn check_fungible_balance(
        &self,
        wallet: &Pubkey,
        mint_str: &str,
    ) -> anyhow::Result<u64> {
        let cache_key = format!("ft:{wallet}:{mint_str}");
        if let Some(cached) = self.cache.get(&cache_key) {
            return Ok(cached);
        }

        let mint = Pubkey::from_str(mint_str)
            .map_err(|_| anyhow::anyhow!("invalid mint address: {mint_str}"))?;

        // Check both classic SPL Token and Token-2022 ATAs.
        // A mint lives on one program, so at most one ATA will exist.
        let spl_ata = get_associated_token_address(wallet, &mint);
        let t22_ata = get_associated_token_address_2022(wallet, &mint);

        let amount = match self.rpc.get_account(&spl_ata).await {
            Ok(account) if parse_spl_token_amount(&account.data) > 0 => {
                parse_spl_token_amount(&account.data)
            }
            _ => match self.rpc.get_account(&t22_ata).await {
                Ok(account) => parse_spl_token_amount(&account.data),
                Err(_) => 0,
            },
        };

        self.cache.set(cache_key, amount, CACHE_TTL);
        Ok(amount)
    }

    /// Count NFTs from a verified Metaplex collection held by a wallet.
    ///
    /// Queries both SPL Token and Token-2022 programs, since tokenized assets
    /// use Token-2022 for transfer hooks and freeze authority.
    async fn check_nft_collection_count(
        &self,
        wallet: &Pubkey,
        collection_str: &str,
    ) -> anyhow::Result<u64> {
        let cache_key = format!("nft:{wallet}:{collection_str}");
        if let Some(cached) = self.cache.get(&cache_key) {
            return Ok(cached);
        }

        let collection = Pubkey::from_str(collection_str)
            .map_err(|_| anyhow::anyhow!("invalid collection address: {collection_str}"))?;

        // Query both SPL Token and Token-2022 programs for NFT-like accounts
        let filter = solana_rpc_client_api::request::TokenAccountsFilter::ProgramId;
        let (spl_result, t22_result) = tokio::join!(
            self.rpc
                .get_token_accounts_by_owner(wallet, filter(spl_token::id())),
            self.rpc
                .get_token_accounts_by_owner(wallet, filter(TOKEN_2022_PROGRAM_ID)),
        );

        let mut nft_mints: Vec<Pubkey> = Vec::new();
        for accounts in [spl_result, t22_result] {
            if let Ok(accs) = accounts {
                nft_mints.extend(accs.iter().filter_map(extract_nft_mint));
            }
            // If one program query fails, still check the other
        }

        if nft_mints.is_empty() {
            self.cache.set(cache_key, 0, CACHE_TTL);
            return Ok(0);
        }

        // Derive metadata PDAs and batch-fetch them
        let metadata_program = mpl_metadata_program_id();
        let metadata_keys: Vec<Pubkey> = nft_mints
            .iter()
            .map(|mint| derive_metadata_pda(mint, &metadata_program))
            .collect();

        let metadata_accounts = self
            .rpc
            .get_multiple_accounts(&metadata_keys)
            .await
            .map_err(|e| anyhow::anyhow!("RPC get_multiple_accounts: {e}"))?;

        let count = metadata_accounts
            .iter()
            .filter(|opt| {
                opt.as_ref()
                    .map(|acc| has_verified_collection(&acc.data, &collection))
                    .unwrap_or(false)
            })
            .count() as u64;

        self.cache.set(cache_key, count, CACHE_TTL);
        Ok(count)
    }
}

impl std::fmt::Debug for TokenGateChecker {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("TokenGateChecker").finish()
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Parse the `amount` field from raw SPL Token account data (bytes 64..72, LE u64).
fn parse_spl_token_amount(data: &[u8]) -> u64 {
    if data.len() < 72 {
        return 0;
    }
    u64::from_le_bytes(data[64..72].try_into().unwrap_or_default())
}

/// Extract a mint pubkey from an RPC keyed account if the token amount is 1.
///
/// Parses the JSON-parsed account data returned by `get_token_accounts_by_owner`.
fn extract_nft_mint(
    keyed: &solana_rpc_client_api::response::RpcKeyedAccount,
) -> Option<Pubkey> {
    let data = &keyed.account.data;
    // jsonParsed response: data is UiAccountData::Json(ParsedAccount)
    // ParsedAccount.parsed["info"]["mint"] and ["info"]["tokenAmount"]["amount"]
    let bytes = data.decode()?;
    let amount = parse_spl_token_amount(&bytes);
    if amount != 1 {
        return None;
    }
    // Mint pubkey is the first 32 bytes of SPL token account data
    if bytes.len() < 32 {
        return None;
    }
    let mint_bytes: [u8; 32] = bytes[0..32].try_into().ok()?;
    Some(Pubkey::new_from_array(mint_bytes))
}

/// Metaplex Token Metadata program ID.
fn mpl_metadata_program_id() -> Pubkey {
    Pubkey::from_str("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").unwrap()
}

/// Derive the metadata PDA for a given mint.
fn derive_metadata_pda(mint: &Pubkey, metadata_program: &Pubkey) -> Pubkey {
    let seeds = &[b"metadata", metadata_program.as_ref(), mint.as_ref()];
    Pubkey::find_program_address(seeds, metadata_program).0
}

/// Check if Metaplex metadata v1 data contains a verified collection matching `target`.
///
/// Layout: key(1) + update_authority(32) + mint(32) + name(4+var) + symbol(4+var)
/// + uri(4+var) + seller_fee(2) + Option<Creators> + primary_sale(1) + is_mutable(1)
/// + Option<edition_nonce> + Option<token_standard> + Option<Collection>.
fn has_verified_collection(data: &[u8], target: &Pubkey) -> bool {
    if data.len() < 100 {
        return false;
    }
    let mut pos: usize = 1 + 32 + 32; // key + update_authority + mint

    // name, symbol, uri: borsh strings (4-byte LE length prefix + content)
    for _ in 0..3 {
        match skip_borsh_string(data, pos) {
            Some(next) => pos = next,
            None => return false,
        }
    }

    // seller_fee_basis_points: u16
    if pos + 2 > data.len() {
        return false;
    }
    pos += 2;

    // Option<Vec<Creator>>
    if pos >= data.len() {
        return false;
    }
    if data[pos] == 1 {
        pos += 1;
        if pos + 4 > data.len() {
            return false;
        }
        let len = u32::from_le_bytes(match data[pos..pos + 4].try_into() {
            Ok(b) => b,
            Err(_) => return false,
        }) as usize;
        pos += 4;
        pos += len * 34; // 32 (address) + 1 (verified) + 1 (share)
    } else {
        pos += 1;
    }

    // primary_sale_happened: bool + is_mutable: bool
    if pos + 2 > data.len() {
        return false;
    }
    pos += 2;

    // Option<edition_nonce>: 1 flag + 1 u8
    if pos >= data.len() {
        return false;
    }
    pos += if data[pos] == 1 { 2 } else { 1 };

    // Option<TokenStandard>: 1 flag + 1 u8
    if pos >= data.len() {
        return false;
    }
    pos += if data[pos] == 1 { 2 } else { 1 };

    // Option<Collection>: 1 flag, then { verified: bool(1), key: Pubkey(32) }
    if pos >= data.len() || data[pos] != 1 {
        return false;
    }
    pos += 1;

    if pos + 33 > data.len() {
        return false;
    }
    let verified = data[pos] == 1;
    pos += 1;
    let key_bytes: [u8; 32] = match data[pos..pos + 32].try_into() {
        Ok(b) => b,
        Err(_) => return false,
    };
    let collection_key = Pubkey::new_from_array(key_bytes);

    verified && collection_key == *target
}

/// Skip a borsh-encoded string (4-byte LE length prefix + content).
fn skip_borsh_string(data: &[u8], pos: usize) -> Option<usize> {
    if pos + 4 > data.len() {
        return None;
    }
    let len = u32::from_le_bytes(data[pos..pos + 4].try_into().ok()?) as usize;
    let end = pos + 4 + len;
    if end > data.len() {
        return None;
    }
    Some(end)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_spl_token_amount_valid() {
        let mut data = vec![0u8; 165]; // Standard SPL token account size
        let amount: u64 = 1_000_000;
        data[64..72].copy_from_slice(&amount.to_le_bytes());
        assert_eq!(parse_spl_token_amount(&data), 1_000_000);
    }

    #[test]
    fn parse_spl_token_amount_short_data() {
        assert_eq!(parse_spl_token_amount(&[0u8; 10]), 0);
    }

    #[test]
    fn skip_borsh_string_works() {
        let mut data = Vec::new();
        let s = b"hello";
        data.extend_from_slice(&(s.len() as u32).to_le_bytes());
        data.extend_from_slice(s);
        data.push(0xFF);
        assert_eq!(skip_borsh_string(&data, 0), Some(9)); // 4 + 5
    }

    #[test]
    fn skip_borsh_string_out_of_bounds() {
        assert_eq!(skip_borsh_string(&[0u8; 2], 0), None);
    }

    #[test]
    fn derive_metadata_pda_deterministic() {
        let mint = Pubkey::from_str("So11111111111111111111111111111111111111112").unwrap();
        let program = mpl_metadata_program_id();
        let pda1 = derive_metadata_pda(&mint, &program);
        let pda2 = derive_metadata_pda(&mint, &program);
        assert_eq!(pda1, pda2);
    }

    #[test]
    fn has_verified_collection_too_short() {
        assert!(!has_verified_collection(&[0u8; 10], &Pubkey::default()));
    }

    #[test]
    fn has_verified_collection_parses_valid_metadata() {
        // Build a minimal valid metadata v1 blob with a verified collection
        let collection_key =
            Pubkey::from_str("11111111111111111111111111111111").unwrap();
        let data = build_test_metadata(&collection_key, true);
        assert!(has_verified_collection(&data, &collection_key));
    }

    #[test]
    fn has_verified_collection_rejects_unverified() {
        let collection_key =
            Pubkey::from_str("11111111111111111111111111111111").unwrap();
        let data = build_test_metadata(&collection_key, false);
        assert!(!has_verified_collection(&data, &collection_key));
    }

    /// Build a test metadata v1 blob with the given collection.
    fn build_test_metadata(collection: &Pubkey, verified: bool) -> Vec<u8> {
        let mut data = Vec::new();
        data.push(4); // key = MetadataV1
        data.extend_from_slice(&[0u8; 32]); // update_authority
        data.extend_from_slice(&[0u8; 32]); // mint

        // name, symbol, uri: empty borsh strings
        for _ in 0..3 {
            data.extend_from_slice(&0u32.to_le_bytes());
        }
        // seller_fee_basis_points
        data.extend_from_slice(&0u16.to_le_bytes());
        // Option<Creators> = None
        data.push(0);
        // primary_sale_happened + is_mutable
        data.push(0);
        data.push(1);
        // Option<edition_nonce> = None
        data.push(0);
        // Option<TokenStandard> = None
        data.push(0);
        // Option<Collection> = Some
        data.push(1);
        data.push(if verified { 1 } else { 0 });
        data.extend_from_slice(collection.as_ref());

        data
    }
}
