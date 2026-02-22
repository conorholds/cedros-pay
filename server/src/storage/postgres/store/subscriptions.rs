//! Subscription storage methods

use super::*;

pub(super) async fn save_subscription(
    store: &PostgresStore,
    sub: Subscription,
) -> StorageResult<()> {
    let metadata_json = serde_json::to_value(&sub.metadata)
        .map_err(|e| StorageError::internal("serialize metadata", e))?;

    let status_str = sub.status.to_string();
    let payment_method_str = sub.payment_method.to_string();
    let billing_period_str = sub.billing_period.to_string();

    // Per spec (08-storage.md): INSERT includes tenant_id for multi-tenancy
    sqlx::query(queries::subscription::INSERT)
        .bind(&sub.id)
        .bind(&sub.tenant_id)
        .bind(&sub.product_id)
        .bind(&sub.plan_id)
        .bind(&sub.wallet)
        .bind(&sub.user_id)
        .bind(&sub.stripe_customer_id)
        .bind(&sub.stripe_subscription_id)
        .bind(&payment_method_str)
        .bind(&billing_period_str)
        .bind(sub.billing_interval)
        .bind(&status_str)
        .bind(sub.current_period_start)
        .bind(sub.current_period_end)
        .bind(sub.trial_end)
        .bind(sub.cancelled_at)
        .bind(sub.cancel_at_period_end)
        .bind(&metadata_json)
        .bind(&sub.payment_signature)
        .bind(sub.created_at)
        .bind(sub.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("save subscription", e))?;

    Ok(())
}

pub(super) async fn get_subscription(
    store: &PostgresStore,
    tenant_id: &str,
    id: &str,
) -> StorageResult<Option<Subscription>> {
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let row = sqlx::query(queries::subscription::GET_BY_ID)
        .bind(id)
        .bind(tenant_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get subscription", e))?;

    row.map(parse_subscription).transpose()
}

pub(super) async fn get_subscription_by_wallet(
    store: &PostgresStore,
    tenant_id: &str,
    wallet: &str,
    product_id: &str,
) -> StorageResult<Option<Subscription>> {
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let row = sqlx::query(queries::subscription::GET_BY_WALLET_PRODUCT)
        .bind(tenant_id)
        .bind(wallet)
        .bind(product_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get subscription by wallet", e))?;

    row.map(parse_subscription).transpose()
}

pub(super) async fn get_subscriptions_by_wallet(
    store: &PostgresStore,
    tenant_id: &str,
    wallet: &str,
) -> StorageResult<Vec<Subscription>> {
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let rows = sqlx::query(queries::subscription::GET_BY_WALLET)
        .bind(tenant_id)
        .bind(wallet)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get subscriptions by wallet", e))?;

    rows.into_iter().map(parse_subscription).collect()
}

pub(super) async fn get_subscription_by_stripe_id(
    store: &PostgresStore,
    tenant_id: &str,
    stripe_sub_id: &str,
) -> StorageResult<Option<Subscription>> {
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let row = sqlx::query(queries::subscription::GET_BY_STRIPE_ID)
        .bind(tenant_id)
        .bind(stripe_sub_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get subscription by stripe id", e))?;

    row.map(parse_subscription).transpose()
}

pub(super) async fn find_subscription_by_stripe_id(
    store: &PostgresStore,
    stripe_sub_id: &str,
) -> StorageResult<Option<Subscription>> {
    // Note: This bypasses tenant isolation for webhook handling where tenant context is unavailable
    let row = sqlx::query(queries::subscription::FIND_BY_STRIPE_ID)
        .bind(stripe_sub_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("find subscription by stripe id", e))?;

    row.map(parse_subscription).transpose()
}

pub(super) async fn get_subscription_by_payment_signature(
    store: &PostgresStore,
    tenant_id: &str,
    payment_signature: &str,
) -> StorageResult<Option<Subscription>> {
    // SECURITY (H-004): Query filters by tenant_id for isolation
    let row = sqlx::query(queries::subscription::GET_BY_PAYMENT_SIGNATURE)
        .bind(tenant_id)
        .bind(payment_signature)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get subscription by payment signature", e))?;

    row.map(parse_subscription).transpose()
}

pub(super) async fn list_active_subscriptions(
    store: &PostgresStore,
    tenant_id: &str,
    product_id: Option<&str>,
) -> StorageResult<Vec<Subscription>> {
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let rows = sqlx::query(queries::subscription::LIST_ACTIVE)
        .bind(tenant_id)
        .bind(product_id)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list active subscriptions", e))?;

    rows.into_iter().map(parse_subscription).collect()
}

pub(super) async fn list_expiring_subscriptions(
    store: &PostgresStore,
    tenant_id: &str,
    before: DateTime<Utc>,
) -> StorageResult<Vec<Subscription>> {
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let rows = sqlx::query(queries::subscription::LIST_EXPIRING)
        .bind(tenant_id)
        .bind(before)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list expiring subscriptions", e))?;

    rows.into_iter().map(parse_subscription).collect()
}

pub(super) async fn list_expiring_local_subscriptions_limited(
    store: &PostgresStore,
    tenant_id: &str,
    before: DateTime<Utc>,
    limit: i64,
) -> StorageResult<Vec<Subscription>> {
    let rows = sqlx::query(queries::subscription::LIST_EXPIRING_LOCAL_LIMITED)
        .bind(tenant_id)
        .bind(before)
        .bind(limit)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list expiring local subscriptions", e))?;

    rows.into_iter().map(parse_subscription).collect()
}

pub(super) async fn update_subscription_status(
    store: &PostgresStore,
    tenant_id: &str,
    id: &str,
    status: SubscriptionStatus,
) -> StorageResult<()> {
    let status_str = status.to_string();

    // Per spec (08-storage.md): Update filters by tenant_id for isolation
    let result = sqlx::query(queries::subscription::UPDATE_STATUS)
        .bind(id)
        .bind(tenant_id)
        .bind(&status_str)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("update subscription status", e))?;

    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(super) async fn update_subscription_statuses(
    store: &PostgresStore,
    tenant_id: &str,
    ids: &[String],
    status: SubscriptionStatus,
) -> StorageResult<()> {
    if ids.is_empty() {
        return Ok(());
    }

    let status_str = status.to_string();

    let result = sqlx::query(queries::subscription::UPDATE_STATUS_BATCH)
        .bind(tenant_id)
        .bind(ids)
        .bind(&status_str)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("update subscription statuses", e))?;

    if result.rows_affected() != ids.len() as u64 {
        return Err(StorageError::NotFound);
    }

    Ok(())
}

pub(super) async fn delete_subscription(
    store: &PostgresStore,
    tenant_id: &str,
    id: &str,
) -> StorageResult<()> {
    // Per spec (08-storage.md): Delete filters by tenant_id for isolation
    sqlx::query(queries::subscription::DELETE)
        .bind(id)
        .bind(tenant_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("delete subscription", e))?;

    Ok(())
}

pub(super) async fn get_subscriptions_by_stripe_customer_id(
    store: &PostgresStore,
    tenant_id: &str,
    customer_id: &str,
) -> StorageResult<Vec<Subscription>> {
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let rows = sqlx::query(queries::subscription::GET_BY_STRIPE_CUSTOMER_ID)
        .bind(tenant_id)
        .bind(customer_id)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get subscriptions by stripe customer id", e))?;

    rows.into_iter().map(parse_subscription).collect()
}

pub(super) async fn list_subscriptions_by_product(
    store: &PostgresStore,
    tenant_id: &str,
    product_id: &str,
) -> StorageResult<Vec<Subscription>> {
    // Per spec (08-storage.md): Query filters by tenant_id for isolation
    let rows = sqlx::query(queries::subscription::LIST_BY_PRODUCT)
        .bind(tenant_id)
        .bind(product_id)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list subscriptions by product", e))?;

    rows.into_iter().map(parse_subscription).collect()
}

pub(super) async fn count_subscriptions_by_plan(
    store: &PostgresStore,
    tenant_id: &str,
    plan_id: &str,
) -> StorageResult<i64> {
    let count: (i64,) = sqlx::query_as(queries::subscription::COUNT_BY_PLAN_ID)
        .bind(tenant_id)
        .bind(plan_id)
        .fetch_one(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("count subscriptions by plan", e))?;

    Ok(count.0)
}

pub(super) async fn list_tenant_ids(store: &PostgresStore) -> StorageResult<Vec<String>> {
    // REL-004: Paginate to handle >1000 tenants. Fetch in batches to prevent OOM.
    const BATCH_SIZE: i64 = 1000;
    let mut all_tenants = Vec::new();
    let mut last_id: Option<String> = None;

    loop {
        let tenants: Vec<String> = if let Some(ref last) = last_id {
            sqlx::query_scalar::<_, String>(
                "SELECT DISTINCT tenant_id FROM subscriptions WHERE tenant_id > $1 ORDER BY tenant_id LIMIT $2",
            )
            .bind(last)
            .bind(BATCH_SIZE)
            .fetch_all(store.pool.inner())
            .await
            .map_err(|e| StorageError::internal("list tenant ids", e))?
        } else {
            sqlx::query_scalar::<_, String>(
                "SELECT DISTINCT tenant_id FROM subscriptions ORDER BY tenant_id LIMIT $1",
            )
            .bind(BATCH_SIZE)
            .fetch_all(store.pool.inner())
            .await
            .map_err(|e| StorageError::internal("list tenant ids", e))?
        };

        let batch_len = tenants.len();
        if let Some(last_tenant) = tenants.last() {
            last_id = Some(last_tenant.clone());
        }
        all_tenants.extend(tenants);

        // If we got fewer than BATCH_SIZE, we've reached the end
        if (batch_len as i64) < BATCH_SIZE {
            break;
        }
    }

    Ok(all_tenants)
}
