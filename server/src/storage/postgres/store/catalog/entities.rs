//! Customer, dispute, gift card, and collection storage methods

use super::*;

// ─── Customers ──────────────────────────────────────────────────────────────

pub(in super::super) async fn create_customer(
    store: &PostgresStore,
    customer: Customer,
) -> StorageResult<()> {
    let addresses_json = serde_json::to_value(&customer.addresses)
        .map_err(|e| StorageError::internal("serialize customer addresses", e))?;
    let query = store.orders_query(queries::customers::INSERT);
    sqlx::query(&query)
        .bind(&customer.id)
        .bind(&customer.tenant_id)
        .bind(&customer.email)
        .bind(&customer.name)
        .bind(&customer.phone)
        .bind(&addresses_json)
        .bind(customer.created_at)
        .bind(customer.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("insert customer", e))?;
    Ok(())
}

pub(in super::super) async fn update_customer(
    store: &PostgresStore,
    customer: Customer,
) -> StorageResult<()> {
    let addresses_json = serde_json::to_value(&customer.addresses)
        .map_err(|e| StorageError::internal("serialize customer addresses", e))?;
    let query = store.orders_query(queries::customers::UPDATE);
    let result = sqlx::query(&query)
        .bind(&customer.tenant_id)
        .bind(&customer.id)
        .bind(&customer.email)
        .bind(&customer.name)
        .bind(&customer.phone)
        .bind(&addresses_json)
        .bind(customer.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("update customer", e))?;
    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(in super::super) async fn get_customer(
    store: &PostgresStore,
    tenant_id: &str,
    customer_id: &str,
) -> StorageResult<Option<Customer>> {
    let query = store.orders_query(queries::customers::GET);
    let row = sqlx::query(&query)
        .bind(tenant_id)
        .bind(customer_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get customer", e))?;
    row.map(parse_customer).transpose()
}

pub(in super::super) async fn list_customers(
    store: &PostgresStore,
    tenant_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<Customer>> {
    let query = store.orders_query(queries::customers::LIST);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list customers", e))?;
    rows.into_iter().map(parse_customer).collect()
}

// ─── Disputes ───────────────────────────────────────────────────────────────

pub(in super::super) async fn create_dispute(
    store: &PostgresStore,
    dispute: DisputeRecord,
) -> StorageResult<()> {
    let metadata_json = serde_json::to_value(&dispute.metadata)
        .map_err(|e| StorageError::internal("serialize dispute metadata", e))?;
    let query = store.orders_query(queries::disputes::INSERT);
    sqlx::query(&query)
        .bind(&dispute.id)
        .bind(&dispute.tenant_id)
        .bind(&dispute.source)
        .bind(&dispute.order_id)
        .bind(&dispute.payment_intent_id)
        .bind(&dispute.charge_id)
        .bind(&dispute.status)
        .bind(&dispute.reason)
        .bind(dispute.amount)
        .bind(&dispute.currency)
        .bind(&metadata_json)
        .bind(dispute.created_at)
        .bind(dispute.updated_at)
        .bind(dispute.status_updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("insert dispute", e))?;
    Ok(())
}

pub(in super::super) async fn update_dispute_status(
    store: &PostgresStore,
    tenant_id: &str,
    dispute_id: &str,
    status: &str,
    status_updated_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
) -> StorageResult<()> {
    let query = store.orders_query(queries::disputes::UPDATE_STATUS);
    let result = sqlx::query(&query)
        .bind(tenant_id)
        .bind(dispute_id)
        .bind(status)
        .bind(status_updated_at)
        .bind(updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("update dispute status", e))?;
    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(in super::super) async fn get_dispute(
    store: &PostgresStore,
    tenant_id: &str,
    dispute_id: &str,
) -> StorageResult<Option<DisputeRecord>> {
    let query = store.orders_query(queries::disputes::GET);
    let row = sqlx::query(&query)
        .bind(tenant_id)
        .bind(dispute_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get dispute", e))?;
    row.map(parse_dispute).transpose()
}

pub(in super::super) async fn list_disputes(
    store: &PostgresStore,
    tenant_id: &str,
    status: Option<&str>,
    source: Option<&str>,
    order_id: Option<&str>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<DisputeRecord>> {
    let query = store.orders_query(queries::disputes::LIST);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(status)
        .bind(source)
        .bind(order_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list disputes", e))?;
    rows.into_iter().map(parse_dispute).collect()
}

// ─── Gift cards ──────────────────────────────────────────────────────────────

pub(in super::super) async fn create_gift_card(
    store: &PostgresStore,
    card: GiftCard,
) -> StorageResult<()> {
    let metadata_json = serde_json::to_value(&card.metadata)
        .map_err(|e| StorageError::internal("serialize gift card metadata", e))?;
    let query = store.orders_query(queries::gift_cards::INSERT);
    sqlx::query(&query)
        .bind(&card.code)
        .bind(&card.tenant_id)
        .bind(card.initial_balance)
        .bind(card.balance)
        .bind(&card.currency)
        .bind(card.active)
        .bind(card.expires_at)
        .bind(&metadata_json)
        .bind(card.created_at)
        .bind(card.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("insert gift card", e))?;
    Ok(())
}

pub(in super::super) async fn update_gift_card(
    store: &PostgresStore,
    card: GiftCard,
) -> StorageResult<()> {
    let metadata_json = serde_json::to_value(&card.metadata)
        .map_err(|e| StorageError::internal("serialize gift card metadata", e))?;
    let query = store.orders_query(queries::gift_cards::UPDATE);
    let result = sqlx::query(&query)
        .bind(&card.tenant_id)
        .bind(&card.code)
        .bind(card.initial_balance)
        .bind(card.balance)
        .bind(&card.currency)
        .bind(card.active)
        .bind(card.expires_at)
        .bind(&metadata_json)
        .bind(card.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("update gift card", e))?;
    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(in super::super) async fn get_gift_card(
    store: &PostgresStore,
    tenant_id: &str,
    code: &str,
) -> StorageResult<Option<GiftCard>> {
    let query = store.orders_query(queries::gift_cards::GET);
    let row = sqlx::query(&query)
        .bind(tenant_id)
        .bind(code)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get gift card", e))?;
    row.map(parse_gift_card).transpose()
}

pub(in super::super) async fn list_gift_cards(
    store: &PostgresStore,
    tenant_id: &str,
    active_only: Option<bool>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<GiftCard>> {
    let query = store.orders_query(queries::gift_cards::LIST);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(active_only)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list gift cards", e))?;
    rows.into_iter().map(parse_gift_card).collect()
}

pub(in super::super) async fn adjust_gift_card_balance(
    store: &PostgresStore,
    tenant_id: &str,
    code: &str,
    new_balance: i64,
    updated_at: DateTime<Utc>,
) -> StorageResult<()> {
    let query = store.orders_query(queries::gift_cards::UPDATE_BALANCE);
    let result = sqlx::query(&query)
        .bind(tenant_id)
        .bind(code)
        .bind(new_balance)
        .bind(updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("update gift card balance", e))?;
    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(in super::super) async fn try_adjust_gift_card_balance(
    store: &PostgresStore,
    tenant_id: &str,
    code: &str,
    deduction: i64,
    updated_at: DateTime<Utc>,
) -> StorageResult<Option<i64>> {
    let query = store.orders_query(queries::gift_cards::TRY_ADJUST_BALANCE);
    let row = sqlx::query_scalar::<_, i64>(&query)
        .bind(tenant_id)
        .bind(code)
        .bind(deduction)
        .bind(updated_at)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("try adjust gift card balance", e))?;
    Ok(row)
}

// ─── Collections ────────────────────────────────────────────────────────────

pub(in super::super) async fn create_collection(
    store: &PostgresStore,
    collection: Collection,
) -> StorageResult<()> {
    let product_ids_json = serde_json::to_value(&collection.product_ids)
        .map_err(|e| StorageError::internal("serialize collection product_ids", e))?;
    let query = store.orders_query(queries::collections::INSERT);
    sqlx::query(&query)
        .bind(&collection.id)
        .bind(&collection.tenant_id)
        .bind(&collection.name)
        .bind(&collection.description)
        .bind(&product_ids_json)
        .bind(collection.active)
        .bind(collection.created_at)
        .bind(collection.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("insert collection", e))?;
    Ok(())
}

pub(in super::super) async fn update_collection(
    store: &PostgresStore,
    collection: Collection,
) -> StorageResult<()> {
    let product_ids_json = serde_json::to_value(&collection.product_ids)
        .map_err(|e| StorageError::internal("serialize collection product_ids", e))?;
    let query = store.orders_query(queries::collections::UPDATE);
    let result = sqlx::query(&query)
        .bind(&collection.tenant_id)
        .bind(&collection.id)
        .bind(&collection.name)
        .bind(&collection.description)
        .bind(&product_ids_json)
        .bind(collection.active)
        .bind(collection.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("update collection", e))?;
    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(in super::super) async fn get_collection(
    store: &PostgresStore,
    tenant_id: &str,
    collection_id: &str,
) -> StorageResult<Option<Collection>> {
    let query = store.orders_query(queries::collections::GET);
    let row = sqlx::query(&query)
        .bind(tenant_id)
        .bind(collection_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get collection", e))?;
    row.map(parse_collection).transpose()
}

pub(in super::super) async fn list_collections(
    store: &PostgresStore,
    tenant_id: &str,
    active_only: Option<bool>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<Collection>> {
    let query = store.orders_query(queries::collections::LIST);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(active_only)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list collections", e))?;
    rows.into_iter().map(parse_collection).collect()
}

pub(in super::super) async fn delete_collection(
    store: &PostgresStore,
    tenant_id: &str,
    collection_id: &str,
) -> StorageResult<()> {
    let query = store.orders_query(queries::collections::DELETE);
    let result = sqlx::query(&query)
        .bind(tenant_id)
        .bind(collection_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("delete collection", e))?;
    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}
