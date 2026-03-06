//! Admin audit trail storage methods (R12)

use super::*;

pub(super) async fn record_admin_audit(
    store: &PostgresStore,
    entry: AdminAuditEntry,
) -> StorageResult<()> {
    sqlx::query(
        "INSERT INTO admin_audit (id, tenant_id, resource_type, resource_id, action, actor, detail, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    )
    .bind(&entry.id)
    .bind(&entry.tenant_id)
    .bind(&entry.resource_type)
    .bind(&entry.resource_id)
    .bind(&entry.action)
    .bind(&entry.actor)
    .bind(&entry.detail)
    .bind(entry.created_at)
    .execute(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("insert admin audit entry", e))?;
    Ok(())
}

pub(super) async fn list_admin_audit(
    store: &PostgresStore,
    tenant_id: &str,
    resource_type: Option<&str>,
    resource_id: Option<&str>,
    actor: Option<&str>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<AdminAuditEntry>> {
    let mut qb = QueryBuilder::new(
        "SELECT id, tenant_id, resource_type, resource_id, action, actor, detail, created_at \
         FROM admin_audit WHERE tenant_id = ",
    );
    qb.push_bind(tenant_id);

    if let Some(rt) = resource_type {
        qb.push(" AND resource_type = ");
        qb.push_bind(rt);
    }
    if let Some(rid) = resource_id {
        qb.push(" AND resource_id = ");
        qb.push_bind(rid);
    }
    if let Some(act) = actor {
        qb.push(" AND actor = ");
        qb.push_bind(act);
    }

    qb.push(" ORDER BY created_at DESC LIMIT ");
    qb.push_bind(limit);
    qb.push(" OFFSET ");
    qb.push_bind(offset);

    let rows = qb
        .build()
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list admin audit entries", e))?;

    rows.into_iter().map(parse_admin_audit_entry).collect()
}
