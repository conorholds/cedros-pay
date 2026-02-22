//! Shipping profile, shipping rate, and tax rate storage methods

use super::*;

// ─── Shipping profiles ──────────────────────────────────────────────────────

pub(in super::super) async fn create_shipping_profile(
    store: &PostgresStore,
    profile: ShippingProfile,
) -> StorageResult<()> {
    let countries_json = serde_json::to_value(&profile.countries)
        .map_err(|e| StorageError::internal("serialize countries", e))?;
    let query = store.orders_query(queries::shipping_profiles::INSERT);
    sqlx::query(&query)
        .bind(&profile.id)
        .bind(&profile.tenant_id)
        .bind(&profile.name)
        .bind(&profile.description)
        .bind(&countries_json)
        .bind(profile.active)
        .bind(profile.created_at)
        .bind(profile.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("insert shipping profile", e))?;
    Ok(())
}

pub(in super::super) async fn update_shipping_profile(
    store: &PostgresStore,
    profile: ShippingProfile,
) -> StorageResult<()> {
    let countries_json = serde_json::to_value(&profile.countries)
        .map_err(|e| StorageError::internal("serialize countries", e))?;
    let query = store.orders_query(queries::shipping_profiles::UPDATE);
    let result = sqlx::query(&query)
        .bind(&profile.tenant_id)
        .bind(&profile.id)
        .bind(&profile.name)
        .bind(&profile.description)
        .bind(&countries_json)
        .bind(profile.active)
        .bind(profile.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("update shipping profile", e))?;
    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(in super::super) async fn get_shipping_profile(
    store: &PostgresStore,
    tenant_id: &str,
    profile_id: &str,
) -> StorageResult<Option<ShippingProfile>> {
    let query = store.orders_query(queries::shipping_profiles::GET);
    let row = sqlx::query(&query)
        .bind(tenant_id)
        .bind(profile_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get shipping profile", e))?;
    row.map(parse_shipping_profile).transpose()
}

pub(in super::super) async fn list_shipping_profiles(
    store: &PostgresStore,
    tenant_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<ShippingProfile>> {
    let query = store.orders_query(queries::shipping_profiles::LIST);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list shipping profiles", e))?;
    rows.into_iter().map(parse_shipping_profile).collect()
}

pub(in super::super) async fn delete_shipping_profile(
    store: &PostgresStore,
    tenant_id: &str,
    profile_id: &str,
) -> StorageResult<()> {
    let query = store.orders_query(queries::shipping_profiles::DELETE);
    let result = sqlx::query(&query)
        .bind(tenant_id)
        .bind(profile_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("delete shipping profile", e))?;
    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

// ─── Shipping rates ─────────────────────────────────────────────────────────

pub(in super::super) async fn create_shipping_rate(
    store: &PostgresStore,
    rate: ShippingRate,
) -> StorageResult<()> {
    let query = store.orders_query(queries::shipping_rates::INSERT);
    sqlx::query(&query)
        .bind(&rate.id)
        .bind(&rate.tenant_id)
        .bind(&rate.profile_id)
        .bind(&rate.name)
        .bind(&rate.rate_type)
        .bind(rate.amount_atomic)
        .bind(&rate.currency)
        .bind(rate.min_subtotal)
        .bind(rate.max_subtotal)
        .bind(rate.active)
        .bind(rate.created_at)
        .bind(rate.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("insert shipping rate", e))?;
    Ok(())
}

pub(in super::super) async fn update_shipping_rate(
    store: &PostgresStore,
    rate: ShippingRate,
) -> StorageResult<()> {
    let query = store.orders_query(queries::shipping_rates::UPDATE);
    let result = sqlx::query(&query)
        .bind(&rate.tenant_id)
        .bind(&rate.id)
        .bind(&rate.name)
        .bind(&rate.rate_type)
        .bind(rate.amount_atomic)
        .bind(&rate.currency)
        .bind(rate.min_subtotal)
        .bind(rate.max_subtotal)
        .bind(rate.active)
        .bind(rate.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("update shipping rate", e))?;
    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(in super::super) async fn list_shipping_rates(
    store: &PostgresStore,
    tenant_id: &str,
    profile_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<ShippingRate>> {
    let query = store.orders_query(queries::shipping_rates::LIST);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(profile_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list shipping rates", e))?;
    rows.into_iter().map(parse_shipping_rate).collect()
}

pub(in super::super) async fn delete_shipping_rate(
    store: &PostgresStore,
    tenant_id: &str,
    rate_id: &str,
) -> StorageResult<()> {
    let query = store.orders_query(queries::shipping_rates::DELETE);
    let result = sqlx::query(&query)
        .bind(tenant_id)
        .bind(rate_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("delete shipping rate", e))?;
    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

// ─── Tax rates ──────────────────────────────────────────────────────────────

pub(in super::super) async fn create_tax_rate(
    store: &PostgresStore,
    rate: TaxRate,
) -> StorageResult<()> {
    let query = store.orders_query(queries::tax_rates::INSERT);
    sqlx::query(&query)
        .bind(&rate.id)
        .bind(&rate.tenant_id)
        .bind(&rate.name)
        .bind(&rate.country)
        .bind(&rate.region)
        .bind(rate.rate_bps)
        .bind(rate.active)
        .bind(rate.created_at)
        .bind(rate.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("insert tax rate", e))?;
    Ok(())
}

pub(in super::super) async fn update_tax_rate(
    store: &PostgresStore,
    rate: TaxRate,
) -> StorageResult<()> {
    let query = store.orders_query(queries::tax_rates::UPDATE);
    let result = sqlx::query(&query)
        .bind(&rate.tenant_id)
        .bind(&rate.id)
        .bind(&rate.name)
        .bind(&rate.country)
        .bind(&rate.region)
        .bind(rate.rate_bps)
        .bind(rate.active)
        .bind(rate.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("update tax rate", e))?;
    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(in super::super) async fn get_tax_rate(
    store: &PostgresStore,
    tenant_id: &str,
    rate_id: &str,
) -> StorageResult<Option<TaxRate>> {
    let query = store.orders_query(queries::tax_rates::GET);
    let row = sqlx::query(&query)
        .bind(tenant_id)
        .bind(rate_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get tax rate", e))?;
    row.map(parse_tax_rate).transpose()
}

pub(in super::super) async fn list_tax_rates(
    store: &PostgresStore,
    tenant_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<TaxRate>> {
    let query = store.orders_query(queries::tax_rates::LIST);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list tax rates", e))?;
    rows.into_iter().map(parse_tax_rate).collect()
}

pub(in super::super) async fn delete_tax_rate(
    store: &PostgresStore,
    tenant_id: &str,
    rate_id: &str,
) -> StorageResult<()> {
    let query = store.orders_query(queries::tax_rates::DELETE);
    let result = sqlx::query(&query)
        .bind(tenant_id)
        .bind(rate_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("delete tax rate", e))?;
    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}
