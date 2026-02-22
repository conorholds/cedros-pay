//! Order, order history, fulfillment, and return request storage methods

use super::*;

pub(super) async fn try_store_order(
    store: &PostgresStore,
    order: Order,
) -> StorageResult<bool> {
    let items_json = serde_json::to_value(&order.items)
        .map_err(|e| StorageError::internal("serialize order items", e))?;
    let shipping_json = match &order.shipping {
        Some(s) => Some(
            serde_json::to_value(s)
                .map_err(|e| StorageError::internal("serialize order shipping", e))?,
        ),
        None => None,
    };
    let metadata_json = serde_json::to_value(&order.metadata)
        .map_err(|e| StorageError::internal("serialize order metadata", e))?;

    let query = store.orders_query(queries::orders::INSERT_IF_ABSENT);
    let result = sqlx::query(&query)
        .bind(&order.id)
        .bind(&order.tenant_id)
        .bind(&order.source)
        .bind(&order.purchase_id)
        .bind(&order.resource_id)
        .bind(&order.user_id)
        .bind(&order.customer)
        .bind(&order.status)
        .bind(&items_json)
        .bind(order.amount)
        .bind(&order.amount_asset)
        .bind(&order.customer_email)
        .bind(&order.customer_name)
        .bind(&order.receipt_url)
        .bind(&shipping_json)
        .bind(&metadata_json)
        .bind(order.created_at)
        .bind(order.updated_at)
        .bind(order.status_updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("insert order", e))?;

    Ok(result.rows_affected() > 0)
}

pub(super) async fn get_order(
    store: &PostgresStore,
    tenant_id: &str,
    order_id: &str,
) -> StorageResult<Option<Order>> {
    let query = store.orders_query(queries::orders::GET_BY_ID);
    let row = sqlx::query(&query)
        .bind(tenant_id)
        .bind(order_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get order", e))?;

    row.map(parse_order).transpose()
}

pub(super) async fn list_orders(
    store: &PostgresStore,
    tenant_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<Order>> {
    let query = store.orders_query(queries::orders::LIST);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list orders", e))?;

    rows.into_iter().map(parse_order).collect()
}

pub(super) async fn list_orders_filtered(
    store: &PostgresStore,
    tenant_id: &str,
    status: Option<&str>,
    search: Option<&str>,
    created_before: Option<DateTime<Utc>>,
    created_after: Option<DateTime<Utc>>,
    limit: i32,
    offset: i32,
) -> StorageResult<(Vec<Order>, i64)> {
    let query = store.orders_query(queries::orders::LIST_FILTERED);
    let search = search.and_then(|s| {
        let trimmed = s.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(format!("%{}%", trimmed))
        }
    });

    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(status)
        .bind(&search)
        .bind(created_before)
        .bind(created_after)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list orders filtered", e))?;

    // Extract total_count from the window function in the first row (single query).
    // Falls back to 0 if no rows returned.
    let total: i64 = rows
        .first()
        .and_then(|r| r.try_get::<i64, _>("total_count").ok())
        .unwrap_or(0);

    let orders = rows
        .into_iter()
        .map(parse_order)
        .collect::<StorageResult<_>>()?;
    Ok((orders, total))
}

pub(super) async fn update_order_status(
    store: &PostgresStore,
    tenant_id: &str,
    order_id: &str,
    status: &str,
    status_updated_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
) -> StorageResult<()> {
    let query = store.orders_query(queries::orders::UPDATE_STATUS);
    let result = sqlx::query(&query)
        .bind(tenant_id)
        .bind(order_id)
        .bind(status)
        .bind(status_updated_at)
        .bind(updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("update order status", e))?;

    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(super) async fn append_order_history(
    store: &PostgresStore,
    entry: OrderHistoryEntry,
) -> StorageResult<()> {
    let query = store.orders_query(queries::order_history::INSERT);
    sqlx::query(&query)
        .bind(&entry.id)
        .bind(&entry.tenant_id)
        .bind(&entry.order_id)
        .bind(&entry.from_status)
        .bind(&entry.to_status)
        .bind(&entry.note)
        .bind(&entry.actor)
        .bind(entry.created_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("insert order history", e))?;
    Ok(())
}

/// DB-04a fix: Atomically update order status and append history in a single transaction.
/// Prevents crash between the two operations from leaving inconsistent state.
pub(super) async fn update_order_status_with_history(
    store: &PostgresStore,
    tenant_id: &str,
    order_id: &str,
    status: &str,
    status_updated_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    entry: OrderHistoryEntry,
) -> StorageResult<()> {
    let mut tx = store
        .pool
        .inner()
        .begin()
        .await
        .map_err(|e| StorageError::internal("begin order status tx", e))?;

    let status_query = store.orders_query(queries::orders::UPDATE_STATUS);
    let result = sqlx::query(&status_query)
        .bind(tenant_id)
        .bind(order_id)
        .bind(status)
        .bind(status_updated_at)
        .bind(updated_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| StorageError::internal("update order status", e))?;

    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }

    let history_query = store.orders_query(queries::order_history::INSERT);
    sqlx::query(&history_query)
        .bind(&entry.id)
        .bind(&entry.tenant_id)
        .bind(&entry.order_id)
        .bind(&entry.from_status)
        .bind(&entry.to_status)
        .bind(&entry.note)
        .bind(&entry.actor)
        .bind(entry.created_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| StorageError::internal("insert order history", e))?;

    tx.commit()
        .await
        .map_err(|e| StorageError::internal("commit order status tx", e))?;
    Ok(())
}

pub(super) async fn list_order_history(
    store: &PostgresStore,
    tenant_id: &str,
    order_id: &str,
    limit: i32,
) -> StorageResult<Vec<OrderHistoryEntry>> {
    let query = store.orders_query(queries::order_history::LIST);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(order_id)
        .bind(limit)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list order history", e))?;
    rows.into_iter().map(parse_order_history).collect()
}

pub(super) async fn create_fulfillment(
    store: &PostgresStore,
    fulfillment: Fulfillment,
) -> StorageResult<()> {
    let items_json = serde_json::to_value(&fulfillment.items)
        .map_err(|e| StorageError::internal("serialize fulfillment items", e))?;
    let metadata_json = serde_json::to_value(&fulfillment.metadata)
        .map_err(|e| StorageError::internal("serialize fulfillment metadata", e))?;
    let query = store.orders_query(queries::fulfillments::INSERT);
    sqlx::query(&query)
        .bind(&fulfillment.id)
        .bind(&fulfillment.tenant_id)
        .bind(&fulfillment.order_id)
        .bind(&fulfillment.status)
        .bind(&fulfillment.carrier)
        .bind(&fulfillment.tracking_number)
        .bind(&fulfillment.tracking_url)
        .bind(&items_json)
        .bind(fulfillment.shipped_at)
        .bind(fulfillment.delivered_at)
        .bind(&metadata_json)
        .bind(fulfillment.created_at)
        .bind(fulfillment.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("insert fulfillment", e))?;
    Ok(())
}

pub(super) async fn get_fulfillment(
    store: &PostgresStore,
    tenant_id: &str,
    fulfillment_id: &str,
) -> StorageResult<Option<Fulfillment>> {
    let query = store.orders_query(queries::fulfillments::GET_BY_ID);
    let row = sqlx::query(&query)
        .bind(tenant_id)
        .bind(fulfillment_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get fulfillment", e))?;
    row.map(parse_fulfillment).transpose()
}

pub(super) async fn list_fulfillments(
    store: &PostgresStore,
    tenant_id: &str,
    order_id: &str,
    limit: i32,
) -> StorageResult<Vec<Fulfillment>> {
    let query = store.orders_query(queries::fulfillments::LIST);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(order_id)
        .bind(limit)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list fulfillments", e))?;
    rows.into_iter().map(parse_fulfillment).collect()
}

#[allow(clippy::too_many_arguments)]
pub(super) async fn update_fulfillment_status(
    store: &PostgresStore,
    tenant_id: &str,
    fulfillment_id: &str,
    status: &str,
    shipped_at: Option<DateTime<Utc>>,
    delivered_at: Option<DateTime<Utc>>,
    updated_at: DateTime<Utc>,
    tracking_number: Option<&str>,
    tracking_url: Option<&str>,
    carrier: Option<&str>,
) -> StorageResult<Option<Fulfillment>> {
    let query = store.orders_query(queries::fulfillments::UPDATE_STATUS);
    let row = sqlx::query(&query)
        .bind(tenant_id)
        .bind(fulfillment_id)
        .bind(status)
        .bind(shipped_at)
        .bind(delivered_at)
        .bind(updated_at)
        .bind(tracking_number)
        .bind(tracking_url)
        .bind(carrier)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("update fulfillment status", e))?;
    row.map(parse_fulfillment).transpose()
}

pub(super) async fn create_return_request(
    store: &PostgresStore,
    request: ReturnRequest,
) -> StorageResult<()> {
    let items_json = serde_json::to_value(&request.items)
        .map_err(|e| StorageError::internal("serialize return items", e))?;
    let metadata_json = serde_json::to_value(&request.metadata)
        .map_err(|e| StorageError::internal("serialize return metadata", e))?;
    let query = store.orders_query(queries::returns::INSERT);
    sqlx::query(&query)
        .bind(&request.id)
        .bind(&request.tenant_id)
        .bind(&request.order_id)
        .bind(&request.status)
        .bind(&items_json)
        .bind(&request.reason)
        .bind(&metadata_json)
        .bind(request.created_at)
        .bind(request.updated_at)
        .bind(request.status_updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("insert return request", e))?;
    Ok(())
}

pub(super) async fn update_return_status(
    store: &PostgresStore,
    tenant_id: &str,
    return_id: &str,
    status: &str,
    status_updated_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
) -> StorageResult<()> {
    let query = store.orders_query(queries::returns::UPDATE_STATUS);
    let result = sqlx::query(&query)
        .bind(tenant_id)
        .bind(return_id)
        .bind(status)
        .bind(status_updated_at)
        .bind(updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("update return status", e))?;
    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(super) async fn get_return_request(
    store: &PostgresStore,
    tenant_id: &str,
    return_id: &str,
) -> StorageResult<Option<ReturnRequest>> {
    let query = store.orders_query(queries::returns::GET);
    let row = sqlx::query(&query)
        .bind(tenant_id)
        .bind(return_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get return request", e))?;
    row.map(parse_return_request).transpose()
}

pub(super) async fn list_return_requests(
    store: &PostgresStore,
    tenant_id: &str,
    status: Option<&str>,
    order_id: Option<&str>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<ReturnRequest>> {
    let query = store.orders_query(queries::returns::LIST);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(status)
        .bind(order_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list return requests", e))?;
    rows.into_iter().map(parse_return_request).collect()
}

// ---------------------------------------------------------------------------
// Inherent impl for transactional order + inventory operations
// ---------------------------------------------------------------------------

impl PostgresStore {
    /// Store an order atomically together with inventory adjustments.
    ///
    /// Returns `true` if the order was inserted, `false` if it already existed
    /// (idempotent insert). Returns `StorageError::NotFound` if a referenced
    /// product does not exist and `StorageError::Conflict` if inventory is
    /// insufficient and backorder is not allowed.
    pub async fn try_store_order_with_inventory_adjustments(
        &self,
        order: Order,
        adjustments: Vec<super::InventoryAdjustmentRequest>,
    ) -> StorageResult<bool> {
        let items_json = serde_json::to_value(&order.items)
            .map_err(|e| StorageError::internal("serialize order items", e))?;
        let shipping_json =
            match &order.shipping {
                Some(s) => Some(serde_json::to_value(s).map_err(|e| {
                    StorageError::internal("serialize order shipping", e)
                })?),
                None => None,
            };
        let metadata_json = serde_json::to_value(&order.metadata)
            .map_err(|e| StorageError::internal("serialize order metadata", e))?;

        let mut tx = self
            .pool
            .inner()
            .begin()
            .await
            .map_err(|e| StorageError::internal("begin order tx", e))?;

        let query = self.orders_query(queries::orders::INSERT_IF_ABSENT);
        let result = sqlx::query(&query)
            .bind(&order.id)
            .bind(&order.tenant_id)
            .bind(&order.source)
            .bind(&order.purchase_id)
            .bind(&order.resource_id)
            .bind(&order.user_id)
            .bind(&order.customer)
            .bind(&order.status)
            .bind(&items_json)
            .bind(order.amount)
            .bind(&order.amount_asset)
            .bind(&order.customer_email)
            .bind(&order.customer_name)
            .bind(&order.receipt_url)
            .bind(&shipping_json)
            .bind(&metadata_json)
            .bind(order.created_at)
            .bind(order.updated_at)
            .bind(order.status_updated_at)
            .execute(&mut *tx)
            .await
            .map_err(|e| StorageError::internal("insert order", e))?;

        if result.rows_affected() == 0 {
            tx.rollback()
                .await
                .map_err(|e| StorageError::internal("rollback order tx", e))?;
            return Ok(false);
        }

        let now = Utc::now();
        for adjustment in adjustments {
            if adjustment.quantity <= 0 {
                continue;
            }

            let product_query = self.products_query(
                "SELECT inventory_quantity FROM products WHERE tenant_id = $1 AND id = $2 FOR UPDATE",
            );
            let row: Option<(Option<i32>,)> = sqlx::query_as(&product_query)
                .bind(&order.tenant_id)
                .bind(&adjustment.product_id)
                .fetch_optional(&mut *tx)
                .await
                .map_err(|e| StorageError::internal("load product inventory", e))?;

            let current = match row {
                Some((value,)) => value,
                None => {
                    tx.rollback()
                        .await
                        .map_err(|e| StorageError::internal("rollback order tx", e))?;
                    return Err(StorageError::NotFound);
                }
            };

            let current = match current {
                Some(value) => value,
                None => continue,
            };

            if current < adjustment.quantity && !adjustment.allow_backorder {
                tx.rollback()
                    .await
                    .map_err(|e| StorageError::internal("rollback order tx", e))?;
                return Err(StorageError::Conflict);
            }

            let next = current - adjustment.quantity;
            let update_query = self.products_query(
                "UPDATE products SET inventory_quantity = $3, updated_at = $4 WHERE tenant_id = $1 AND id = $2",
            );
            sqlx::query(&update_query)
                .bind(&order.tenant_id)
                .bind(&adjustment.product_id)
                .bind(next)
                .bind(now)
                .execute(&mut *tx)
                .await
                .map_err(|e| StorageError::internal("update inventory", e))?;

            let adjust_query = self.orders_query(queries::inventory_adjustments::INSERT);
            sqlx::query(&adjust_query)
                .bind(uuid::Uuid::new_v4().to_string())
                .bind(&order.tenant_id)
                .bind(&adjustment.product_id)
                .bind(&adjustment.variant_id)
                .bind(-adjustment.quantity)
                .bind(current)
                .bind(next)
                .bind(&adjustment.reason)
                .bind(&adjustment.actor)
                .bind(now)
                .execute(&mut *tx)
                .await
                .map_err(|e| StorageError::internal("record inventory adjustment", e))?;
        }

        tx.commit()
            .await
            .map_err(|e| StorageError::internal("commit order tx", e))?;
        Ok(true)
    }
}
