//! PostgreSQL implementation for compliance storage (token holders + actions).

use chrono::{DateTime, Utc};
use sqlx::{QueryBuilder, Row};

use super::PostgresStore;
use crate::models::compliance::{ComplianceAction, TokenHolder};
use crate::storage::{StorageError, StorageResult};

fn parse_token_holder(row: &sqlx::postgres::PgRow) -> Result<TokenHolder, sqlx::Error> {
    Ok(TokenHolder {
        id: row.try_get("id")?,
        tenant_id: row.try_get("tenant_id")?,
        collection_id: row.try_get("collection_id")?,
        mint_address: row.try_get("mint_address")?,
        wallet_address: row.try_get("wallet_address")?,
        user_id: row.try_get("user_id")?,
        amount_minted: row.try_get("amount_minted")?,
        status: row.try_get("status")?,
        frozen_at: row.try_get("frozen_at")?,
        freeze_tx: row.try_get("freeze_tx")?,
        thaw_tx: row.try_get("thaw_tx")?,
        created_at: row.try_get("created_at")?,
    })
}

fn parse_compliance_action(row: &sqlx::postgres::PgRow) -> Result<ComplianceAction, sqlx::Error> {
    Ok(ComplianceAction {
        id: row.try_get("id")?,
        tenant_id: row.try_get("tenant_id")?,
        action_type: row.try_get("action_type")?,
        wallet_address: row.try_get("wallet_address")?,
        mint_address: row.try_get("mint_address")?,
        holder_id: row.try_get("holder_id")?,
        reason: row.try_get("reason")?,
        actor: row.try_get("actor")?,
        tx_signature: row.try_get("tx_signature")?,
        report_reference: row.try_get("report_reference")?,
        created_at: row.try_get("created_at")?,
    })
}

pub(in super::super) async fn record_token_holder(
    store: &PostgresStore,
    holder: TokenHolder,
) -> StorageResult<()> {
    sqlx::query(
        r#"INSERT INTO token_holders (
            id, tenant_id, collection_id, mint_address, wallet_address,
            user_id, amount_minted, status, frozen_at, freeze_tx, thaw_tx, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"#,
    )
    .bind(&holder.id)
    .bind(&holder.tenant_id)
    .bind(&holder.collection_id)
    .bind(&holder.mint_address)
    .bind(&holder.wallet_address)
    .bind(&holder.user_id)
    .bind(holder.amount_minted)
    .bind(&holder.status)
    .bind(holder.frozen_at)
    .bind(&holder.freeze_tx)
    .bind(&holder.thaw_tx)
    .bind(holder.created_at)
    .execute(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("record token holder", e))?;
    Ok(())
}

pub(in super::super) async fn get_token_holder(
    store: &PostgresStore,
    tenant_id: &str,
    holder_id: &str,
) -> StorageResult<Option<TokenHolder>> {
    let row = sqlx::query("SELECT * FROM token_holders WHERE tenant_id = $1 AND id = $2")
        .bind(tenant_id)
        .bind(holder_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get token holder", e))?;
    row.map(|r| parse_token_holder(&r))
        .transpose()
        .map_err(|e| StorageError::internal("parse token holder", e))
}

pub(in super::super) async fn list_token_holders(
    store: &PostgresStore,
    tenant_id: &str,
    status: Option<&str>,
    wallet: Option<&str>,
    collection_id: Option<&str>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<TokenHolder>> {
    let mut qb: QueryBuilder<'_, sqlx::Postgres> =
        QueryBuilder::new("SELECT * FROM token_holders WHERE tenant_id = ");
    qb.push_bind(tenant_id);

    if let Some(s) = status {
        qb.push(" AND status = ");
        qb.push_bind(s);
    }
    if let Some(w) = wallet {
        qb.push(" AND wallet_address = ");
        qb.push_bind(w);
    }
    if let Some(c) = collection_id {
        qb.push(" AND collection_id = ");
        qb.push_bind(c);
    }

    qb.push(" ORDER BY created_at DESC LIMIT ");
    qb.push_bind(limit);
    qb.push(" OFFSET ");
    qb.push_bind(offset);

    let rows = qb
        .build()
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list token holders", e))?;

    rows.iter()
        .map(parse_token_holder)
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| StorageError::internal("parse token holders", e))
}

pub(in super::super) async fn list_unfrozen_token_holders(
    store: &PostgresStore,
    tenant_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<TokenHolder>> {
    let rows = sqlx::query(
        "SELECT * FROM token_holders WHERE tenant_id = $1 AND status = 'active' \
         ORDER BY created_at ASC LIMIT $2 OFFSET $3",
    )
    .bind(tenant_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("list unfrozen token holders", e))?;

    rows.iter()
        .map(parse_token_holder)
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| StorageError::internal("parse unfrozen token holders", e))
}

pub(in super::super) async fn count_token_holders(
    store: &PostgresStore,
    tenant_id: &str,
    status: Option<&str>,
) -> StorageResult<i64> {
    let mut qb: QueryBuilder<'_, sqlx::Postgres> =
        QueryBuilder::new("SELECT COUNT(*) AS cnt FROM token_holders WHERE tenant_id = ");
    qb.push_bind(tenant_id);

    if let Some(s) = status {
        qb.push(" AND status = ");
        qb.push_bind(s);
    }

    let row = qb
        .build()
        .fetch_one(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("count token holders", e))?;

    row.try_get::<i64, _>("cnt")
        .map_err(|e| StorageError::internal("parse count", e))
}

pub(in super::super) async fn update_token_holder_status(
    store: &PostgresStore,
    tenant_id: &str,
    holder_id: &str,
    status: &str,
    frozen_at: Option<DateTime<Utc>>,
    freeze_tx: Option<&str>,
    thaw_tx: Option<&str>,
) -> StorageResult<()> {
    let result = sqlx::query(
        r#"UPDATE token_holders
           SET status = $1, frozen_at = $2, freeze_tx = COALESCE($3, freeze_tx),
               thaw_tx = COALESCE($4, thaw_tx)
           WHERE tenant_id = $5 AND id = $6"#,
    )
    .bind(status)
    .bind(frozen_at)
    .bind(freeze_tx)
    .bind(thaw_tx)
    .bind(tenant_id)
    .bind(holder_id)
    .execute(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("update token holder status", e))?;

    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(in super::super) async fn record_compliance_action(
    store: &PostgresStore,
    action: ComplianceAction,
) -> StorageResult<()> {
    sqlx::query(
        r#"INSERT INTO compliance_actions (
            id, tenant_id, action_type, wallet_address, mint_address,
            holder_id, reason, actor, tx_signature, report_reference, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)"#,
    )
    .bind(&action.id)
    .bind(&action.tenant_id)
    .bind(&action.action_type)
    .bind(&action.wallet_address)
    .bind(&action.mint_address)
    .bind(&action.holder_id)
    .bind(&action.reason)
    .bind(&action.actor)
    .bind(&action.tx_signature)
    .bind(&action.report_reference)
    .bind(action.created_at)
    .execute(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("record compliance action", e))?;
    Ok(())
}

pub(in super::super) async fn list_compliance_actions(
    store: &PostgresStore,
    tenant_id: &str,
    action_type: Option<&str>,
    wallet: Option<&str>,
    from: Option<DateTime<Utc>>,
    to: Option<DateTime<Utc>>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<ComplianceAction>> {
    let mut qb: QueryBuilder<'_, sqlx::Postgres> =
        QueryBuilder::new("SELECT * FROM compliance_actions WHERE tenant_id = ");
    qb.push_bind(tenant_id);

    if let Some(at) = action_type {
        qb.push(" AND action_type = ");
        qb.push_bind(at);
    }
    if let Some(w) = wallet {
        qb.push(" AND wallet_address = ");
        qb.push_bind(w);
    }
    if let Some(f) = from {
        qb.push(" AND created_at >= ");
        qb.push_bind(f);
    }
    if let Some(t) = to {
        qb.push(" AND created_at <= ");
        qb.push_bind(t);
    }

    qb.push(" ORDER BY created_at DESC LIMIT ");
    qb.push_bind(limit);
    qb.push(" OFFSET ");
    qb.push_bind(offset);

    let rows = qb
        .build()
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list compliance actions", e))?;

    rows.iter()
        .map(parse_compliance_action)
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| StorageError::internal("parse compliance actions", e))
}
