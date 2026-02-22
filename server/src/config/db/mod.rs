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
    default_keys_for_category, secret_fields_for_category, BatchUpsertItem, ConfigCategoryMeta,
    ConfigEntry, ConfigHistoryEntry, ConfigRepositoryError, PostgresConfigRepository,
    KNOWN_CATEGORIES, REDACTED_PLACEHOLDER,
};
