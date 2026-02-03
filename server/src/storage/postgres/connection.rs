//! PostgreSQL connection pool configuration and management

use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::PgPool;
use std::time::Duration;

use crate::storage::StorageError;

/// PostgreSQL configuration
#[derive(Debug, Clone)]
pub struct PostgresConfig {
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
    pub max_connections: u32,
    pub min_connections: u32,
    pub acquire_timeout: Duration,
    pub idle_timeout: Duration,
    pub max_lifetime: Duration,
}

impl Default for PostgresConfig {
    fn default() -> Self {
        Self {
            host: "localhost".to_string(),
            port: 5432,
            database: "cedros_pay".to_string(),
            username: "postgres".to_string(),
            password: "".to_string(),
            // Production-ready defaults: 50 max connections supports higher concurrency
            // For lower environments, override via POSTGRES_MAX_CONNECTIONS env var
            max_connections: 50,
            min_connections: 5, // Keep some connections warm to reduce latency
            acquire_timeout: Duration::from_secs(5), // Fail fast for better user experience
            idle_timeout: Duration::from_secs(600),
            max_lifetime: Duration::from_secs(1800),
        }
    }
}

impl PostgresConfig {
    /// Create config from environment variables
    pub fn from_env() -> Self {
        Self {
            host: std::env::var("POSTGRES_HOST").unwrap_or_else(|_| "localhost".to_string()),
            port: std::env::var("POSTGRES_PORT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(5432),
            database: std::env::var("POSTGRES_DB").unwrap_or_else(|_| "cedros_pay".to_string()),
            username: std::env::var("POSTGRES_USER").unwrap_or_else(|_| "postgres".to_string()),
            password: std::env::var("POSTGRES_PASSWORD").unwrap_or_default(),
            max_connections: std::env::var("POSTGRES_MAX_CONNECTIONS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(50),
            min_connections: std::env::var("POSTGRES_MIN_CONNECTIONS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(5),
            acquire_timeout: Duration::from_secs(
                std::env::var("POSTGRES_ACQUIRE_TIMEOUT")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(5),
            ),
            idle_timeout: Duration::from_secs(
                std::env::var("POSTGRES_IDLE_TIMEOUT")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(600),
            ),
            max_lifetime: Duration::from_secs(
                std::env::var("POSTGRES_MAX_LIFETIME")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(1800),
            ),
        }
    }

    /// Create config from connection URL
    pub fn from_url(url: &str) -> Result<Self, StorageError> {
        let parsed = url::Url::parse(url)
            .map_err(|e| StorageError::Database(format!("invalid URL: {}", e)))?;

        Ok(Self {
            host: parsed.host_str().unwrap_or("localhost").to_string(),
            port: parsed.port().unwrap_or(5432),
            database: parsed.path().trim_start_matches('/').to_string(),
            username: parsed.username().to_string(),
            password: parsed.password().unwrap_or("").to_string(),
            ..Default::default()
        })
    }
}

/// PostgreSQL connection pool wrapper
#[derive(Clone)]
pub struct PostgresPool {
    pool: PgPool,
}

impl PostgresPool {
    /// Create a new connection pool
    pub async fn new(config: &PostgresConfig) -> Result<Self, StorageError> {
        let options = PgConnectOptions::new()
            .host(&config.host)
            .port(config.port)
            .database(&config.database)
            .username(&config.username)
            .password(&config.password);

        let pool = PgPoolOptions::new()
            .max_connections(config.max_connections)
            .min_connections(config.min_connections)
            .acquire_timeout(config.acquire_timeout)
            .idle_timeout(config.idle_timeout)
            .max_lifetime(config.max_lifetime)
            .connect_with(options)
            .await
            .map_err(|e| StorageError::Database(format!("connection failed: {}", e)))?;

        Ok(Self { pool })
    }

    /// Get the underlying pool reference
    pub fn inner(&self) -> &PgPool {
        &self.pool
    }

    /// Run database migrations
    pub async fn migrate(&self) -> Result<(), StorageError> {
        sqlx::migrate!("./migrations")
            .run(&self.pool)
            .await
            .map_err(|e| StorageError::Database(format!("migration failed: {}", e)))
    }

    /// Check if the database is healthy
    pub async fn health_check(&self) -> Result<(), StorageError> {
        sqlx::query("SELECT 1")
            .execute(&self.pool)
            .await
            .map_err(|e| StorageError::Database(format!("health check failed: {}", e)))?;
        Ok(())
    }

    /// Close the connection pool
    pub async fn close(&self) {
        self.pool.close().await;
    }
}

#[cfg(test)]
mod tests {
    const TENANT_PKEY_MIGRATION: &str =
        include_str!("../../../migrations/20251230000002_tenant_product_coupon_pkey.sql");

    #[test]
    fn test_tenant_pkey_migration_includes_products_and_coupons() {
        assert!(TENANT_PKEY_MIGRATION.contains("ALTER TABLE products"));
        assert!(TENANT_PKEY_MIGRATION.contains("ALTER TABLE coupons"));
        assert!(TENANT_PKEY_MIGRATION.contains("PRIMARY KEY (tenant_id, id)"));
        assert!(TENANT_PKEY_MIGRATION.contains("PRIMARY KEY (tenant_id, code)"));
    }
}
