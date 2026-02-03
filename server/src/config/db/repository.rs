//! PostgreSQL-backed configuration repository
//!
//! Stores configuration as JSON in the app_config table with optional
//! encryption for secrets using the ConfigEncryption service.

use super::encryption::{ConfigEncryption, EncryptedValue, EncryptionError};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::PgPool;
use sqlx::Postgres;
use std::collections::HashSet;
use std::sync::Arc;
use thiserror::Error;

/// Config repository errors
#[derive(Debug, Error)]
pub enum ConfigRepositoryError {
    #[error("Configuration not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Encryption error: {0}")]
    Encryption(#[from] EncryptionError),
}

/// Config entry as stored in database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigEntry {
    pub tenant_id: String,
    pub config_key: String,
    pub value: JsonValue,
    pub encrypted: bool,
    pub key_version: Option<i32>,
    pub category: String,
    pub description: Option<String>,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub created_at: chrono::DateTime<chrono::Utc>,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub updated_by: Option<String>,
}

/// Config category metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigCategoryMeta {
    pub category: String,
    pub key_count: i64,
    pub last_updated: Option<chrono::DateTime<chrono::Utc>>,
}

/// Config audit history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigHistoryEntry {
    pub id: uuid::Uuid,
    pub tenant_id: String,
    pub config_key: String,
    pub action: String,
    pub old_value: Option<JsonValue>,
    pub new_value: Option<JsonValue>,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub changed_at: chrono::DateTime<chrono::Utc>,
    pub changed_by: Option<String>,
}

/// Secret field definitions per category
/// These fields will be encrypted when stored
pub fn secret_fields_for_category(category: &str) -> HashSet<&'static str> {
    match category {
        "stripe" => ["secret_key", "webhook_secret"].into_iter().collect(),
        "x402" => ["server_wallets"].into_iter().collect(),
        "callbacks" => ["hmac_secret"].into_iter().collect(),
        "cedros_login" => ["api_key"].into_iter().collect(),
        "api_keys" => ["keys"].into_iter().collect(),
        "server" => ["admin_metrics_api_key"].into_iter().collect(),
        "ai" => ["gemini_api_key", "openai_api_key"].into_iter().collect(),
        _ => HashSet::new(),
    }
}

/// Placeholder used for redacted secrets in API responses
pub const REDACTED_PLACEHOLDER: &str = "[REDACTED]";

/// PostgreSQL config repository
pub struct PostgresConfigRepository {
    pool: PgPool,
    encryption: Option<Arc<ConfigEncryption>>,
}

type ConfigRow = (
    String,
    String,
    JsonValue,
    bool,
    Option<i32>,
    String,
    Option<String>,
    chrono::DateTime<chrono::Utc>,
    chrono::DateTime<chrono::Utc>,
    Option<String>,
);

type HistoryRow = (
    uuid::Uuid,
    String,
    String,
    String,
    Option<JsonValue>,
    Option<JsonValue>,
    chrono::DateTime<chrono::Utc>,
    Option<String>,
);

type BatchUpsertRow = (
    String,
    String,
    JsonValue,
    bool,
    Option<i32>,
    Option<String>,
    Option<String>,
);

#[derive(Debug, Clone)]
pub struct BatchUpsertItem {
    pub category: String,
    pub config_key: String,
    pub value: JsonValue,
    pub description: Option<String>,
    pub updated_by: Option<String>,
}

impl PostgresConfigRepository {
    /// Create repository without encryption (for bootstrap/testing)
    pub fn new(pool: PgPool) -> Self {
        Self {
            pool,
            encryption: None,
        }
    }

    /// Create repository with encryption support
    pub fn with_encryption(pool: PgPool, encryption: Arc<ConfigEncryption>) -> Self {
        Self {
            pool,
            encryption: Some(encryption),
        }
    }

    /// List all config categories for a tenant
    pub async fn list_categories(
        &self,
        tenant_id: &str,
    ) -> Result<Vec<ConfigCategoryMeta>, ConfigRepositoryError> {
        let rows: Vec<(String, i64, Option<chrono::DateTime<chrono::Utc>>)> = sqlx::query_as(
            r#"
            SELECT category, COUNT(*) as key_count, MAX(updated_at) as last_updated
            FROM app_config
            WHERE tenant_id = $1
            GROUP BY category
            ORDER BY category
            "#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows
            .into_iter()
            .map(|(category, key_count, last_updated)| ConfigCategoryMeta {
                category,
                key_count,
                last_updated,
            })
            .collect())
    }

    /// Get all config entries for a category
    pub async fn get_config(
        &self,
        tenant_id: &str,
        category: &str,
    ) -> Result<Vec<ConfigEntry>, ConfigRepositoryError> {
        let rows: Vec<ConfigRow> = sqlx::query_as(
            r#"
            SELECT tenant_id, config_key, value, encrypted, key_version, category, description,
                   created_at, updated_at, updated_by
            FROM app_config
            WHERE tenant_id = $1 AND category = $2
            ORDER BY config_key
            "#,
        )
        .bind(tenant_id)
        .bind(category)
        .fetch_all(&self.pool)
        .await?;

        let mut entries = Vec::with_capacity(rows.len());
        for row in rows {
            let entry = ConfigEntry {
                tenant_id: row.0,
                config_key: row.1,
                value: row.2,
                encrypted: row.3,
                key_version: row.4,
                category: row.5,
                description: row.6,
                created_at: row.7,
                updated_at: row.8,
                updated_by: row.9,
            };
            entries.push(entry);
        }

        Ok(entries)
    }

    /// Get single config entry
    pub async fn get_entry(
        &self,
        tenant_id: &str,
        config_key: &str,
    ) -> Result<Option<ConfigEntry>, ConfigRepositoryError> {
        let rows: Vec<ConfigRow> = sqlx::query_as(
            r#"
            SELECT tenant_id, config_key, value, encrypted, key_version, category, description,
                   created_at, updated_at, updated_by
            FROM app_config
            WHERE tenant_id = $1 AND config_key = $2
            "#,
        )
        .bind(tenant_id)
        .bind(config_key)
        .fetch_all(&self.pool)
        .await?;

        match rows.len() {
            0 => Ok(None),
            1 => {
                let r = rows.into_iter().next().expect("len checked");
                Ok(Some(ConfigEntry {
                    tenant_id: r.0,
                    config_key: r.1,
                    value: r.2,
                    encrypted: r.3,
                    key_version: r.4,
                    category: r.5,
                    description: r.6,
                    created_at: r.7,
                    updated_at: r.8,
                    updated_by: r.9,
                }))
            }
            _ => Err(ConfigRepositoryError::Validation(format!(
                "config_key '{}' is not unique across categories; use get_config(tenant_id, category) instead",
                config_key
            ))),
        }
    }

    /// Upsert config entry with automatic encryption for secrets
    pub async fn upsert_config(
        &self,
        tenant_id: &str,
        config_key: &str,
        category: &str,
        value: JsonValue,
        description: Option<&str>,
        updated_by: Option<&str>,
    ) -> Result<(), ConfigRepositoryError> {
        let secret_fields = secret_fields_for_category(category);
        let (processed_value, encrypted, key_version) = self
            .process_value_for_storage(tenant_id, &value, &secret_fields)
            .await?;

        sqlx::query(
            r#"
            INSERT INTO app_config (tenant_id, config_key, value, encrypted, key_version, category, description, updated_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (tenant_id, category, config_key) DO UPDATE SET
                value = EXCLUDED.value,
                encrypted = EXCLUDED.encrypted,
                key_version = EXCLUDED.key_version,
                description = EXCLUDED.description,
                updated_by = EXCLUDED.updated_by
            "#,
        )
        .bind(tenant_id)
        .bind(config_key)
        .bind(&processed_value)
        .bind(encrypted)
        .bind(key_version)
        .bind(category)
        .bind(description)
        .bind(updated_by)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    fn build_batch_upsert_query<'a>(
        tenant_id: &'a str,
        rows: &'a [BatchUpsertRow],
    ) -> sqlx::QueryBuilder<'a, Postgres> {
        let mut qb = sqlx::QueryBuilder::<Postgres>::new(
            "INSERT INTO app_config (tenant_id, category, config_key, value, encrypted, key_version, description, updated_by)",
        );
        qb.push_values(rows, |mut b, row| {
            b.push_bind(tenant_id)
                .push_bind(&row.0)
                .push_bind(&row.1)
                .push_bind(&row.2)
                .push_bind(row.3)
                .push_bind(row.4)
                .push_bind(&row.5)
                .push_bind(&row.6);
        });
        qb.push(
            " ON CONFLICT (tenant_id, category, config_key) DO UPDATE SET value = EXCLUDED.value, encrypted = EXCLUDED.encrypted, key_version = EXCLUDED.key_version, description = EXCLUDED.description, updated_by = EXCLUDED.updated_by",
        );
        qb
    }

    /// Atomic batch upsert of config entries.
    ///
    /// This is implemented as a single SQL statement so it is all-or-nothing.
    pub async fn batch_upsert_config(
        &self,
        tenant_id: &str,
        items: Vec<BatchUpsertItem>,
    ) -> Result<usize, ConfigRepositoryError> {
        if items.is_empty() {
            return Ok(0);
        }

        let mut rows: Vec<BatchUpsertRow> = Vec::with_capacity(items.len());

        for item in items {
            let secret_fields = secret_fields_for_category(&item.category);
            let (processed_value, encrypted, key_version) = self
                .process_value_for_storage(tenant_id, &item.value, &secret_fields)
                .await?;
            rows.push((
                item.category,
                item.config_key,
                processed_value,
                encrypted,
                key_version,
                item.description,
                item.updated_by,
            ));
        }

        let result = Self::build_batch_upsert_query(tenant_id, &rows)
            .build()
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() as usize)
    }

    /// Process value for storage, encrypting secrets if encryption is enabled
    async fn process_value_for_storage(
        &self,
        tenant_id: &str,
        value: &JsonValue,
        secret_fields: &HashSet<&'static str>,
    ) -> Result<(JsonValue, bool, Option<i32>), ConfigRepositoryError> {
        let encryption = match &self.encryption {
            Some(e) if !secret_fields.is_empty() => e,
            _ => return Ok((value.clone(), false, None)),
        };
        let mut processed = value.clone();
        let mut any_encrypted = false;
        let mut key_version = None;

        // Process top-level secret fields
        if let Some(obj) = processed.as_object_mut() {
            for field in secret_fields {
                if let Some(field_value) = obj.get(*field) {
                    // Skip if already redacted (preserves existing encrypted value)
                    if field_value == REDACTED_PLACEHOLDER {
                        continue;
                    }

                    // Encrypt the field value
                    let plaintext = serde_json::to_string(field_value)?;
                    let encrypted = encryption.encrypt_value(tenant_id, &plaintext).await?;

                    obj.insert(
                        format!("_encrypted_{}", field),
                        JsonValue::String(encrypted.ciphertext),
                    );
                    obj.insert(
                        (*field).to_string(),
                        JsonValue::String(REDACTED_PLACEHOLDER.to_string()),
                    );
                    key_version = Some(encrypted.key_version);
                    any_encrypted = true;
                }
            }
        }

        Ok((processed, any_encrypted, key_version))
    }

    /// Decrypt config entry value for internal use
    pub async fn decrypt_entry(
        &self,
        entry: &ConfigEntry,
    ) -> Result<JsonValue, ConfigRepositoryError> {
        let encryption = match &self.encryption {
            Some(e) if entry.encrypted => e,
            _ => return Ok(entry.value.clone()),
        };
        let secret_fields = secret_fields_for_category(&entry.category);
        let mut decrypted = entry.value.clone();

        if let Some(obj) = decrypted.as_object_mut() {
            for field in secret_fields {
                let encrypted_key = format!("_encrypted_{}", field);
                if let Some(JsonValue::String(ciphertext)) = obj.get(&encrypted_key) {
                    let encrypted_value = EncryptedValue {
                        ciphertext: ciphertext.clone(),
                        key_version: entry.key_version.unwrap_or(1),
                    };

                    let plaintext = encryption
                        .decrypt_value(&entry.tenant_id, &encrypted_value)
                        .await?;

                    let original_value: JsonValue = serde_json::from_str(&plaintext)?;
                    obj.insert((*field).to_string(), original_value);
                    obj.remove(&encrypted_key);
                }
            }
        }

        Ok(decrypted)
    }

    /// Get config history (audit trail)
    pub async fn get_history(
        &self,
        tenant_id: &str,
        category: Option<&str>,
        limit: i32,
    ) -> Result<Vec<ConfigHistoryEntry>, ConfigRepositoryError> {
        let rows: Vec<HistoryRow> = if let Some(cat) = category {
            sqlx::query_as(
                r#"
                SELECT id, tenant_id, config_key, action, old_value, new_value,
                       changed_at, changed_by
                FROM app_config_audit
                WHERE tenant_id = $1 AND category = $2
                ORDER BY changed_at DESC
                LIMIT $3
                "#,
            )
            .bind(tenant_id)
            .bind(cat)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as(
                r#"
                SELECT id, tenant_id, config_key, action, old_value, new_value, changed_at, changed_by
                FROM app_config_audit
                WHERE tenant_id = $1
                ORDER BY changed_at DESC
                LIMIT $2
                "#,
            )
            .bind(tenant_id)
            .bind(limit)
            .fetch_all(&self.pool)
            .await?
        };

        Ok(rows
            .into_iter()
            .map(|r| ConfigHistoryEntry {
                id: r.0,
                tenant_id: r.1,
                config_key: r.2,
                action: r.3,
                old_value: r.4,
                new_value: r.5,
                changed_at: r.6,
                changed_by: r.7,
            })
            .collect())
    }

    /// Delete config entry
    pub async fn delete_config(
        &self,
        tenant_id: &str,
        config_key: &str,
    ) -> Result<bool, ConfigRepositoryError> {
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM app_config WHERE tenant_id = $1 AND config_key = $2",
        )
        .bind(tenant_id)
        .bind(config_key)
        .fetch_one(&self.pool)
        .await?;

        if count == 0 {
            return Ok(false);
        }
        if count != 1 {
            return Err(ConfigRepositoryError::Validation(format!(
                "refusing to delete config_key '{}' because it exists in {} categories; delete by category",
                config_key, count
            )));
        }

        let result = sqlx::query("DELETE FROM app_config WHERE tenant_id = $1 AND config_key = $2")
            .bind(tenant_id)
            .bind(config_key)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::Execute;

    #[test]
    fn test_secret_fields_for_category() {
        let stripe_secrets = secret_fields_for_category("stripe");
        assert!(stripe_secrets.contains("secret_key"));
        assert!(stripe_secrets.contains("webhook_secret"));

        let logging_secrets = secret_fields_for_category("logging");
        assert!(logging_secrets.is_empty());
    }

    #[test]
    fn test_build_batch_upsert_query_uses_category_conflict_key() {
        let rows = vec![
            (
                "stripe".to_string(),
                "secret_key".to_string(),
                JsonValue::String("x".to_string()),
                false,
                None,
                None,
                None,
            ),
            (
                "server".to_string(),
                "admin_metrics_api_key".to_string(),
                JsonValue::String("y".to_string()),
                false,
                None,
                None,
                None,
            ),
        ];

        let mut qb = PostgresConfigRepository::build_batch_upsert_query("tenant-1", &rows);
        let q = qb.build();
        let sql = q.sql();
        assert!(sql.contains("INSERT INTO app_config"));
        assert!(sql.contains("ON CONFLICT (tenant_id, category, config_key)"));
    }
}
