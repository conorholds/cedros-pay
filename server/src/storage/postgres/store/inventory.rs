//! Inventory reservation and adjustment storage methods

use super::*;

pub(super) async fn reserve_inventory(
    store: &PostgresStore,
    reservation: InventoryReservation,
) -> StorageResult<()> {
    let mut tx = store
        .pool
        .inner()
        .begin()
        .await
        .map_err(|e| StorageError::internal("begin inventory reservation tx", e))?;

    let product_query = store.products_query(
        "SELECT inventory_quantity, inventory_policy FROM products WHERE tenant_id = $1 AND id = $2 FOR UPDATE",
    );
    let row: Option<(Option<i32>, Option<String>)> = sqlx::query_as(&product_query)
        .bind(&reservation.tenant_id)
        .bind(&reservation.product_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| StorageError::internal("load product inventory", e))?;

    let (inventory_quantity, inventory_policy) = match row {
        Some(values) => values,
        None => {
            tx.rollback()
                .await
                .map_err(|e| StorageError::internal("rollback inventory reservation", e))?;
            return Err(StorageError::NotFound);
        }
    };

    let allow_backorder = matches!(inventory_policy.as_deref(), Some("allow_backorder"));
    if let Some(qty) = inventory_quantity {
        if !allow_backorder {
            let now = Utc::now();
            let sum_query =
                store.orders_query(queries::inventory_reservations::SUM_ACTIVE_BY_PRODUCT);
            let reserved: i64 = sqlx::query_scalar(&sum_query)
                .bind(&reservation.tenant_id)
                .bind(&reservation.product_id)
                .bind(&reservation.variant_id)
                .bind(now)
                .fetch_one(&mut *tx)
                .await
                .map_err(|e| StorageError::internal("sum active reservations", e))?;
            if reserved + reservation.quantity as i64 > qty as i64 {
                tx.rollback()
                    .await
                    .map_err(|e| StorageError::internal("rollback inventory reservation", e))?;
                return Err(StorageError::Conflict);
            }
        }
    }

    let query = store.orders_query(queries::inventory_reservations::INSERT);
    sqlx::query(&query)
        .bind(&reservation.id)
        .bind(&reservation.tenant_id)
        .bind(&reservation.product_id)
        .bind(&reservation.variant_id)
        .bind(reservation.quantity)
        .bind(reservation.expires_at)
        .bind(&reservation.cart_id)
        .bind(&reservation.status)
        .bind(reservation.created_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| StorageError::internal("insert inventory reservation", e))?;

    tx.commit()
        .await
        .map_err(|e| StorageError::internal("commit inventory reservation", e))?;
    Ok(())
}

pub(super) async fn get_active_inventory_reservation_quantity(
    store: &PostgresStore,
    tenant_id: &str,
    product_id: &str,
    variant_id: Option<&str>,
    now: DateTime<Utc>,
) -> StorageResult<i64> {
    let query = store.orders_query(queries::inventory_reservations::SUM_ACTIVE_BY_PRODUCT);
    let reserved: i64 = sqlx::query_scalar(&query)
        .bind(tenant_id)
        .bind(product_id)
        .bind(variant_id)
        .bind(now)
        .fetch_one(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("sum active reservations", e))?;
    Ok(reserved)
}

pub(super) async fn get_active_inventory_reservation_quantity_excluding_cart(
    store: &PostgresStore,
    tenant_id: &str,
    product_id: &str,
    variant_id: Option<&str>,
    exclude_cart_id: &str,
    now: DateTime<Utc>,
) -> StorageResult<i64> {
    let query =
        store.orders_query(queries::inventory_reservations::SUM_ACTIVE_BY_PRODUCT_EXCLUDING_CART);
    let reserved: i64 = sqlx::query_scalar(&query)
        .bind(tenant_id)
        .bind(product_id)
        .bind(variant_id)
        .bind(now)
        .bind(exclude_cart_id)
        .fetch_one(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("sum active reservations excluding cart", e))?;
    Ok(reserved)
}

pub(super) async fn list_active_reservations_for_cart(
    store: &PostgresStore,
    tenant_id: &str,
    cart_id: &str,
) -> StorageResult<Vec<InventoryReservation>> {
    let query = store.orders_query(queries::inventory_reservations::LIST_ACTIVE_BY_CART);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(cart_id)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list inventory reservations", e))?;
    rows.into_iter().map(parse_inventory_reservation).collect()
}

pub(super) async fn release_inventory_reservations(
    store: &PostgresStore,
    tenant_id: &str,
    cart_id: &str,
    _released_at: DateTime<Utc>,
) -> StorageResult<u64> {
    let query = store.orders_query(queries::inventory_reservations::RELEASE_BY_CART);
    let result = sqlx::query(&query)
        .bind(tenant_id)
        .bind(cart_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("release inventory reservations", e))?;
    Ok(result.rows_affected())
}

pub(super) async fn convert_inventory_reservations(
    store: &PostgresStore,
    tenant_id: &str,
    cart_id: &str,
    _converted_at: DateTime<Utc>,
) -> StorageResult<u64> {
    let query = store.orders_query(queries::inventory_reservations::CONVERT_BY_CART);
    let result = sqlx::query(&query)
        .bind(tenant_id)
        .bind(cart_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("convert inventory reservations", e))?;
    Ok(result.rows_affected())
}

pub(super) async fn cleanup_expired_inventory_reservations(
    store: &PostgresStore,
    now: DateTime<Utc>,
) -> StorageResult<u64> {
    let query = store.orders_query(queries::inventory_reservations::CLEANUP_EXPIRED);
    let result = sqlx::query(&query)
        .bind(now)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("cleanup inventory reservations", e))?;
    Ok(result.rows_affected())
}

pub(super) async fn record_inventory_adjustment(
    store: &PostgresStore,
    adjustment: InventoryAdjustment,
) -> StorageResult<()> {
    let query = store.orders_query(queries::inventory_adjustments::INSERT);
    sqlx::query(&query)
        .bind(&adjustment.id)
        .bind(&adjustment.tenant_id)
        .bind(&adjustment.product_id)
        .bind(&adjustment.variant_id)
        .bind(adjustment.delta)
        .bind(adjustment.quantity_before)
        .bind(adjustment.quantity_after)
        .bind(&adjustment.reason)
        .bind(&adjustment.actor)
        .bind(adjustment.created_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("insert inventory adjustment", e))?;
    Ok(())
}

pub(super) async fn list_inventory_adjustments(
    store: &PostgresStore,
    tenant_id: &str,
    product_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<InventoryAdjustment>> {
    let query = store.orders_query(queries::inventory_adjustments::LIST_BY_PRODUCT);
    let rows = sqlx::query(&query)
        .bind(tenant_id)
        .bind(product_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list inventory adjustments", e))?;
    rows.into_iter().map(parse_inventory_adjustment).collect()
}

/// Batch update inventory quantities for products/variants.
///
/// NOTE: Currently executes N individual SELECT+UPDATE per item within a single transaction.
/// This is acceptable for typical admin batch sizes (<100 items) but would need optimization
/// (e.g. CTE-based batch UPDATE) if batch sizes grow significantly.
pub(super) async fn update_inventory_batch(
    store: &PostgresStore,
    tenant_id: &str,
    updates: Vec<(String, Option<String>, i32)>,
    reason: Option<&str>,
    actor: Option<&str>,
) -> StorageResult<std::collections::HashMap<String, (i32, i32)>> {
    use std::collections::HashMap;

    if updates.is_empty() {
        return Ok(HashMap::new());
    }

    let mut tx = store
        .pool
        .inner()
        .begin()
        .await
        .map_err(|e| StorageError::internal("begin batch inventory tx", e))?;

    let now = Utc::now();
    let mut results = HashMap::with_capacity(updates.len());

    for (product_id, variant_id, delta) in updates {
        let query = store.products_query(
            "SELECT id, inventory_quantity, variants FROM products WHERE tenant_id = $1 AND id = $2 FOR UPDATE",
        );
        let row: Option<(String, Option<i32>, Option<serde_json::Value>)> = sqlx::query_as(&query)
            .bind(tenant_id)
            .bind(&product_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| StorageError::internal("fetch product for inventory update", e))?;

        let (current_qty, next_qty) = match row {
            Some((_, inv_qty, variants_json)) => {
                if let Some(ref vid) = variant_id {
                    let variants: Vec<crate::models::ProductVariant> = variants_json
                        .map(|v| serde_json::from_value(v).unwrap_or_default())
                        .unwrap_or_default();
                    let variant = variants.iter().find(|v| v.id == *vid);
                    match variant.and_then(|v| v.inventory_quantity) {
                        Some(qty) => {
                            let next = qty - delta;
                            if next < 0 {
                                tx.rollback().await.ok();
                                return Err(StorageError::Conflict);
                            }
                            let updated_variants: Vec<crate::models::ProductVariant> = variants
                                .into_iter()
                                .map(|mut v| {
                                    if v.id == *vid {
                                        v.inventory_quantity = Some(next);
                                    }
                                    v
                                })
                                .collect();
                            let update_query = store.products_query(
                                "UPDATE products SET variants = $3, updated_at = $4 WHERE tenant_id = $1 AND id = $2",
                            );
                            let variants_json = serde_json::to_value(&updated_variants)
                                .map_err(|e| StorageError::internal("serialize variants", e))?;
                            sqlx::query(&update_query)
                                .bind(tenant_id)
                                .bind(&product_id)
                                .bind(&variants_json)
                                .bind(now)
                                .execute(&mut *tx)
                                .await
                                .map_err(|e| {
                                    StorageError::internal("update variant inventory", e)
                                })?;
                            (qty, next)
                        }
                        None => continue,
                    }
                } else {
                    match inv_qty {
                        Some(qty) => {
                            let next = qty - delta;
                            if next < 0 {
                                tx.rollback().await.ok();
                                return Err(StorageError::Conflict);
                            }
                            let update_query = store.products_query(
                                "UPDATE products SET inventory_quantity = $3, updated_at = $4 WHERE tenant_id = $1 AND id = $2",
                            );
                            sqlx::query(&update_query)
                                .bind(tenant_id)
                                .bind(&product_id)
                                .bind(next)
                                .bind(now)
                                .execute(&mut *tx)
                                .await
                                .map_err(|e| {
                                    StorageError::internal("update product inventory", e)
                                })?;
                            (qty, next)
                        }
                        None => continue,
                    }
                }
            }
            None => continue,
        };

        let adjust_query = store.orders_query(queries::inventory_adjustments::INSERT);
        let adjustment_id = uuid::Uuid::new_v4().to_string();
        sqlx::query(&adjust_query)
            .bind(&adjustment_id)
            .bind(tenant_id)
            .bind(&product_id)
            .bind(&variant_id)
            .bind(-delta)
            .bind(current_qty)
            .bind(next_qty)
            .bind(reason)
            .bind(actor)
            .bind(now)
            .execute(&mut *tx)
            .await
            .map_err(|e| StorageError::internal("record inventory adjustment", e))?;

        results.insert(product_id, (current_qty, next_qty));
    }

    tx.commit()
        .await
        .map_err(|e| StorageError::internal("commit batch inventory tx", e))?;

    Ok(results)
}

pub(super) async fn adjust_inventory_atomic(
    store: &PostgresStore,
    tenant_id: &str,
    product_id: &str,
    delta: i32,
) -> StorageResult<(i32, i32)> {
    let query = store.products_query(
        "UPDATE products SET inventory_quantity = inventory_quantity + $3, updated_at = $4 \
         WHERE tenant_id = $1 AND id = $2 AND inventory_quantity IS NOT NULL \
         AND inventory_quantity + $3 >= 0 \
         RETURNING (inventory_quantity - $3), inventory_quantity",
    );
    let row: Option<(i32, i32)> = sqlx::query_as(&query)
        .bind(tenant_id)
        .bind(product_id)
        .bind(delta)
        .bind(Utc::now())
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("adjust inventory atomic", e))?;

    match row {
        Some((before, after)) => Ok((before, after)),
        None => {
            let exists_query = store.products_query(
                "SELECT inventory_quantity FROM products WHERE tenant_id = $1 AND id = $2",
            );
            let exists: Option<(Option<i32>,)> = sqlx::query_as(&exists_query)
                .bind(tenant_id)
                .bind(product_id)
                .fetch_optional(store.pool.inner())
                .await
                .map_err(|e| StorageError::internal("check product exists", e))?;

            match exists {
                None => Err(StorageError::NotFound),
                Some((None,)) => Err(StorageError::Validation(
                    "inventory is not tracked for this product".into(),
                )),
                Some((Some(_),)) => Err(StorageError::Validation(
                    "resulting quantity must be >= 0".into(),
                )),
            }
        }
    }
}
