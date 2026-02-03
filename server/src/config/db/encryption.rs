//! Configuration encryption service using envelope encryption
//!
//! Implements AES-256-GCM encryption with envelope encryption pattern:
//! - KEK (Key Encryption Key): Master key from environment, encrypts DEKs
//! - DEK (Data Encryption Key): Per-tenant key stored encrypted in DB, encrypts actual secrets

use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use sqlx::PgPool;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::RwLock;
use zeroize::Zeroizing;

/// Nonce size for AES-256-GCM (96 bits = 12 bytes)
const NONCE_SIZE: usize = 12;

/// AES-256 key size (256 bits = 32 bytes)
const KEY_SIZE: usize = 32;

/// Encryption errors
#[derive(Debug, Error)]
pub enum EncryptionError {
    #[error("KEK not configured - set CEDROS_CONFIG_KEK environment variable")]
    KekNotConfigured,

    #[error("Invalid KEK format: {0}")]
    InvalidKek(String),

    #[error("Encryption failed: {0}")]
    EncryptionFailed(String),

    #[error("Decryption failed: {0}")]
    DecryptionFailed(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("No active DEK for tenant {0}")]
    NoDekForTenant(String),
}

/// Encrypted value with metadata for decryption
#[derive(Debug, Clone)]
pub struct EncryptedValue {
    /// Base64-encoded ciphertext (nonce || encrypted_data)
    pub ciphertext: String,
    /// Key version used for encryption
    pub key_version: i32,
}

/// Config encryption service
pub struct ConfigEncryption {
    /// Key Encryption Key (from env) - wrapped in Zeroizing for secure cleanup
    kek: Zeroizing<[u8; KEY_SIZE]>,
    /// Database pool for DEK storage
    pool: PgPool,
    /// Cache of decrypted DEKs per tenant (tenant_id -> (key_version, DEK))
    dek_cache: Arc<RwLock<DekCache>>,
}

type DekCache = std::collections::HashMap<String, (i32, Zeroizing<[u8; KEY_SIZE]>)>;

impl ConfigEncryption {
    /// Create new encryption service from KEK env var
    pub fn from_env(pool: PgPool) -> Result<Self, EncryptionError> {
        let kek_b64 =
            std::env::var("CEDROS_CONFIG_KEK").map_err(|_| EncryptionError::KekNotConfigured)?;

        Self::new(&kek_b64, pool)
    }

    /// Create new encryption service with explicit KEK
    pub fn new(kek_base64: &str, pool: PgPool) -> Result<Self, EncryptionError> {
        let kek_bytes = BASE64
            .decode(kek_base64.trim())
            .map_err(|e| EncryptionError::InvalidKek(format!("base64 decode: {}", e)))?;

        if kek_bytes.len() != KEY_SIZE {
            return Err(EncryptionError::InvalidKek(format!(
                "expected {} bytes, got {}",
                KEY_SIZE,
                kek_bytes.len()
            )));
        }

        let mut kek = Zeroizing::new([0u8; KEY_SIZE]);
        kek.copy_from_slice(&kek_bytes);

        Ok(Self {
            kek,
            pool,
            dek_cache: Arc::new(RwLock::new(std::collections::HashMap::new())),
        })
    }

    /// Get or create DEK for tenant
    pub async fn get_or_create_dek(
        &self,
        tenant_id: &str,
    ) -> Result<(i32, Zeroizing<[u8; KEY_SIZE]>), EncryptionError> {
        // Check cache first
        {
            let cache = self.dek_cache.read().await;
            if let Some((version, dek)) = cache.get(tenant_id) {
                return Ok((*version, dek.clone()));
            }
        }

        // Try to load from DB
        if let Some((version, dek)) = self.load_dek_from_db(tenant_id).await? {
            let mut cache = self.dek_cache.write().await;
            cache.insert(tenant_id.to_string(), (version, dek.clone()));
            return Ok((version, dek));
        }

        // Create new DEK
        let (version, dek) = self.create_dek(tenant_id).await?;
        let mut cache = self.dek_cache.write().await;
        cache.insert(tenant_id.to_string(), (version, dek.clone()));
        Ok((version, dek))
    }

    /// Load active DEK from database
    async fn load_dek_from_db(
        &self,
        tenant_id: &str,
    ) -> Result<Option<(i32, Zeroizing<[u8; KEY_SIZE]>)>, EncryptionError> {
        let row: Option<(i32, Vec<u8>)> = sqlx::query_as(
            r#"
            SELECT key_version, encrypted_dek
            FROM encryption_keys
            WHERE tenant_id = $1 AND active = TRUE
            ORDER BY key_version DESC
            LIMIT 1
            "#,
        )
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some((version, encrypted_dek)) => {
                let dek = self.decrypt_dek(&encrypted_dek)?;
                Ok(Some((version, dek)))
            }
            None => Ok(None),
        }
    }

    /// Create new DEK for tenant
    async fn create_dek(
        &self,
        tenant_id: &str,
    ) -> Result<(i32, Zeroizing<[u8; KEY_SIZE]>), EncryptionError> {
        // Generate random DEK
        let mut dek = Zeroizing::new([0u8; KEY_SIZE]);
        aes_gcm::aead::rand_core::RngCore::fill_bytes(&mut OsRng, dek.as_mut());

        // Encrypt DEK with KEK
        let encrypted_dek = self.encrypt_dek(&dek)?;

        // Get next version number
        let max_version: Option<i32> =
            sqlx::query_scalar("SELECT MAX(key_version) FROM encryption_keys WHERE tenant_id = $1")
                .bind(tenant_id)
                .fetch_one(&self.pool)
                .await?;

        let version = max_version.unwrap_or(0) + 1;

        // Store in database
        sqlx::query(
            r#"
            INSERT INTO encryption_keys (tenant_id, key_version, encrypted_dek, algorithm, active)
            VALUES ($1, $2, $3, 'AES-256-GCM', TRUE)
            "#,
        )
        .bind(tenant_id)
        .bind(version)
        .bind(&encrypted_dek)
        .execute(&self.pool)
        .await?;

        Ok((version, dek))
    }

    /// Encrypt DEK with KEK
    fn encrypt_dek(&self, dek: &[u8; KEY_SIZE]) -> Result<Vec<u8>, EncryptionError> {
        let cipher = Aes256Gcm::new_from_slice(self.kek.as_ref())
            .map_err(|e| EncryptionError::EncryptionFailed(e.to_string()))?;

        // Generate random nonce
        let mut nonce_bytes = [0u8; NONCE_SIZE];
        aes_gcm::aead::rand_core::RngCore::fill_bytes(&mut OsRng, &mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt
        let ciphertext = cipher
            .encrypt(nonce, dek.as_ref())
            .map_err(|e| EncryptionError::EncryptionFailed(e.to_string()))?;

        // Prepend nonce to ciphertext
        let mut result = Vec::with_capacity(NONCE_SIZE + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);
        Ok(result)
    }

    /// Decrypt DEK with KEK
    fn decrypt_dek(&self, encrypted: &[u8]) -> Result<Zeroizing<[u8; KEY_SIZE]>, EncryptionError> {
        if encrypted.len() < NONCE_SIZE + KEY_SIZE {
            return Err(EncryptionError::DecryptionFailed(
                "ciphertext too short".to_string(),
            ));
        }

        let cipher = Aes256Gcm::new_from_slice(self.kek.as_ref())
            .map_err(|e| EncryptionError::DecryptionFailed(e.to_string()))?;

        let nonce = Nonce::from_slice(&encrypted[..NONCE_SIZE]);
        let ciphertext = &encrypted[NONCE_SIZE..];

        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| EncryptionError::DecryptionFailed(e.to_string()))?;

        if plaintext.len() != KEY_SIZE {
            return Err(EncryptionError::DecryptionFailed(format!(
                "decrypted DEK has wrong size: {} (expected {})",
                plaintext.len(),
                KEY_SIZE
            )));
        }

        let mut dek = Zeroizing::new([0u8; KEY_SIZE]);
        dek.copy_from_slice(&plaintext);
        Ok(dek)
    }

    /// Encrypt a secret value for a tenant
    pub async fn encrypt_value(
        &self,
        tenant_id: &str,
        plaintext: &str,
    ) -> Result<EncryptedValue, EncryptionError> {
        let (key_version, dek) = self.get_or_create_dek(tenant_id).await?;

        let cipher = Aes256Gcm::new_from_slice(dek.as_ref())
            .map_err(|e| EncryptionError::EncryptionFailed(e.to_string()))?;

        // Generate random nonce
        let mut nonce_bytes = [0u8; NONCE_SIZE];
        aes_gcm::aead::rand_core::RngCore::fill_bytes(&mut OsRng, &mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt
        let ciphertext = cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| EncryptionError::EncryptionFailed(e.to_string()))?;

        // Prepend nonce to ciphertext and encode as base64
        let mut result = Vec::with_capacity(NONCE_SIZE + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);

        Ok(EncryptedValue {
            ciphertext: BASE64.encode(&result),
            key_version,
        })
    }

    /// Decrypt a secret value for a tenant
    pub async fn decrypt_value(
        &self,
        tenant_id: &str,
        encrypted: &EncryptedValue,
    ) -> Result<Zeroizing<String>, EncryptionError> {
        // Load DEK for the specific version
        let dek = self
            .load_dek_by_version(tenant_id, encrypted.key_version)
            .await?;

        let cipher = Aes256Gcm::new_from_slice(dek.as_ref())
            .map_err(|e| EncryptionError::DecryptionFailed(e.to_string()))?;

        let encrypted_bytes = BASE64
            .decode(&encrypted.ciphertext)
            .map_err(|e| EncryptionError::DecryptionFailed(format!("base64 decode: {}", e)))?;

        if encrypted_bytes.len() < NONCE_SIZE {
            return Err(EncryptionError::DecryptionFailed(
                "ciphertext too short".to_string(),
            ));
        }

        let nonce = Nonce::from_slice(&encrypted_bytes[..NONCE_SIZE]);
        let ciphertext = &encrypted_bytes[NONCE_SIZE..];

        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| EncryptionError::DecryptionFailed(e.to_string()))?;

        let text = String::from_utf8(plaintext)
            .map_err(|e| EncryptionError::DecryptionFailed(format!("UTF-8 decode: {}", e)))?;

        Ok(Zeroizing::new(text))
    }

    /// Load DEK by specific version (for decryption)
    async fn load_dek_by_version(
        &self,
        tenant_id: &str,
        version: i32,
    ) -> Result<Zeroizing<[u8; KEY_SIZE]>, EncryptionError> {
        // Check cache
        {
            let cache = self.dek_cache.read().await;
            if let Some((cached_version, dek)) = cache.get(tenant_id) {
                if *cached_version == version {
                    return Ok(dek.clone());
                }
            }
        }

        // Load from DB
        let encrypted_dek: Vec<u8> = sqlx::query_scalar(
            "SELECT encrypted_dek FROM encryption_keys WHERE tenant_id = $1 AND key_version = $2",
        )
        .bind(tenant_id)
        .bind(version)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| EncryptionError::NoDekForTenant(tenant_id.to_string()))?;

        self.decrypt_dek(&encrypted_dek)
    }

    /// Clear DEK cache (for testing or key rotation)
    pub async fn clear_cache(&self) {
        let mut cache = self.dek_cache.write().await;
        cache.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_kek() -> String {
        // Generate a test KEK (32 random bytes, base64 encoded)
        let mut key = [0u8; KEY_SIZE];
        aes_gcm::aead::rand_core::RngCore::fill_bytes(&mut OsRng, &mut key);
        BASE64.encode(key)
    }

    #[test]
    fn test_kek_validation() {
        // Valid KEK
        let kek = test_kek();
        // We can't test new() without a pool, but we can test the key parsing logic

        // Test base64 decoding
        let decoded = BASE64.decode(kek.trim()).unwrap();
        assert_eq!(decoded.len(), KEY_SIZE);

        // Invalid: wrong size
        let short_key = BASE64.encode([0u8; 16]);
        let result = BASE64.decode(short_key.trim()).unwrap();
        assert_ne!(result.len(), KEY_SIZE);
    }

    #[test]
    fn test_encrypt_decrypt_dek_roundtrip() {
        // This tests the raw encryption without database
        let mut kek = Zeroizing::new([0u8; KEY_SIZE]);
        aes_gcm::aead::rand_core::RngCore::fill_bytes(&mut OsRng, kek.as_mut());

        let cipher = Aes256Gcm::new_from_slice(kek.as_ref()).expect("valid key");

        // Generate DEK
        let mut dek = [0u8; KEY_SIZE];
        aes_gcm::aead::rand_core::RngCore::fill_bytes(&mut OsRng, &mut dek);

        // Encrypt
        let mut nonce_bytes = [0u8; NONCE_SIZE];
        aes_gcm::aead::rand_core::RngCore::fill_bytes(&mut OsRng, &mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher.encrypt(nonce, dek.as_ref()).expect("encryption");

        // Decrypt
        let plaintext = cipher
            .decrypt(nonce, ciphertext.as_ref())
            .expect("decryption");

        assert_eq!(plaintext.as_slice(), dek.as_slice());
    }
}
