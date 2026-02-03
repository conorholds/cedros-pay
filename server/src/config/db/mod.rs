//! Database-backed configuration storage
//!
//! Provides PostgreSQL storage for application configuration with:
//! - Envelope encryption for secrets (AES-256-GCM)
//! - Audit trail for all changes
//! - Live reload via PG NOTIFY

pub mod encryption;
pub mod repository;

pub use encryption::{ConfigEncryption, EncryptedValue, EncryptionError};
pub use repository::{
    secret_fields_for_category, BatchUpsertItem, ConfigCategoryMeta, ConfigEntry,
    ConfigHistoryEntry, ConfigRepositoryError, PostgresConfigRepository, REDACTED_PLACEHOLDER,
};
