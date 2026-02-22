//! Admin nonce (auth) storage methods

use super::*;

pub(super) async fn create_nonce(
    store: &PostgresStore,
    nonce: AdminNonce,
) -> StorageResult<()> {
    // Per spec (08-storage.md): INSERT includes tenant_id for multi-tenancy
    let query = store.nonce_query(queries::nonce::INSERT);
    sqlx::query(&query)
        .bind(&nonce.id)
        .bind(&nonce.tenant_id)
        .bind(&nonce.purpose)
        .bind(nonce.created_at)
        .bind(nonce.expires_at)
        .bind(nonce.consumed_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("create nonce", e))?;

    Ok(())
}

pub(super) async fn get_nonce(
    store: &PostgresStore,
    tenant_id: &str,
    nonce_id: &str,
) -> StorageResult<Option<AdminNonce>> {
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let query = store.nonce_query(queries::nonce::GET_BY_ID);
    let row = sqlx::query(&query)
        .bind(nonce_id)
        .bind(tenant_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get nonce", e))?;

    row.map(parse_admin_nonce).transpose()
}

pub(super) async fn consume_nonce(
    store: &PostgresStore,
    tenant_id: &str,
    nonce_id: &str,
) -> StorageResult<()> {
    // Per spec (08-storage.md): Update filters by tenant_id for isolation
    // CRIT-002: Atomically consume nonce; WHERE clause includes consumed_at IS NULL
    let query = store.nonce_query(queries::nonce::CONSUME);
    let result = sqlx::query(&query)
        .bind(nonce_id)
        .bind(tenant_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("consume nonce", e))?;

    if result.rows_affected() == 0 {
        // CRIT-002: Distinguish between "not found" and "already consumed"
        // Check if nonce exists (without consumed_at filter)
        let check_query = store.nonce_query(queries::nonce::GET_BY_ID);
        let exists: Option<sqlx::postgres::PgRow> = sqlx::query(&check_query)
            .bind(nonce_id)
            .bind(tenant_id)
            .fetch_optional(store.pool.inner())
            .await
            .map_err(|e| StorageError::internal("check nonce exists", e))?;

        if exists.is_some() {
            // Nonce exists but was already consumed - replay attack attempt
            return Err(StorageError::Conflict);
        }
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(super) async fn cleanup_expired_nonces(store: &PostgresStore) -> StorageResult<u64> {
    // Admin operation across all tenants
    let query = store.nonce_query(queries::nonce::CLEANUP_EXPIRED_ALL);
    let result = sqlx::query(&query)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("cleanup nonces", e))?;

    Ok(result.rows_affected())
}
