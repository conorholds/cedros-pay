//! Transactional operations for multi-entity ACID compliance
//!
//! This module provides atomic operations that span multiple tables,
//! ensuring consistency between Cedros-Pay and Cedros-Login.
//!
//! Pattern: Each function takes a pool, begins a transaction, performs
//! all operations, then commits. If any operation fails, the entire
//! transaction rolls back automatically.

use chrono::Utc;
use sqlx::PgPool;

use crate::errors::ErrorCode;
use crate::models::{InventoryAdjustment, Order, PaymentTransaction, RefundQuote};
use crate::services::{ServiceError, ServiceResult};

/// Transactional operations for payment processing
///
/// All methods use ACID transactions to ensure consistency
/// across multiple tables and integration points.
pub struct TransactionalOps;

impl TransactionalOps {
    /// Atomic: Record payment + create order + update inventory
    ///
    /// This ensures that either:
    /// - Payment, order, and inventory are all updated together, OR
    /// - Nothing is changed (automatic rollback on failure)
    ///
    /// # Arguments
    /// * `pool` - Database connection pool
    /// * `payment` - Payment transaction to record
    /// * `order` - Order to create
    /// * `inventory_adjustments` - Inventory changes to apply
    ///
    /// # Returns
    /// Ok(true) if newly recorded, Ok(false) if already existed (idempotent)
    pub async fn record_payment_and_order(
        pool: &PgPool,
        payment: &PaymentTransaction,
        order: &Order,
        inventory_adjustments: &[InventoryAdjustment],
    ) -> ServiceResult<bool> {
        let mut tx = pool
            .begin()
            .await
            .map_err(|e| ServiceError::Internal(format!("Failed to begin transaction: {}", e)))?;

        // Step 1: Try to record payment (idempotent with ON CONFLICT)
        let payment_result = sqlx::query(
            r#"
            INSERT INTO payments (signature, tenant_id, resource_id, wallet, user_id, amount, asset, created_at, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (tenant_id, signature) DO NOTHING
            RETURNING signature
            "#
        )
        .bind(&payment.signature)
        .bind(&payment.tenant_id)
        .bind(&payment.resource_id)
        .bind(&payment.wallet)
        .bind(&payment.user_id)
        .bind(payment.amount.atomic)
        .bind(&payment.amount.asset.code)
        .bind(payment.created_at)
        .bind(sqlx::types::Json(&payment.metadata))
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| ServiceError::Internal(format!("Failed to record payment: {}", e)))?;

        // If payment already existed, return early (idempotent)
        let is_new = payment_result.is_some();
        if !is_new {
            tx.rollback()
                .await
                .map_err(|e| ServiceError::Internal(format!("Failed to rollback: {}", e)))?;
            return Ok(false);
        }

        // Step 2: Create order
        let order_items_json = sqlx::types::Json(&order.items);
        let metadata_json = sqlx::types::Json(&order.metadata);

        sqlx::query(
            r#"
            INSERT INTO orders (id, tenant_id, source, purchase_id, resource_id, user_id, customer, 
                               status, items, amount, amount_asset, created_at, updated_at, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (tenant_id, id) DO NOTHING
            "#
        )
        .bind(&order.id)
        .bind(&order.tenant_id)
        .bind(&order.source)
        .bind(&order.purchase_id)
        .bind(&order.resource_id)
        .bind(&order.user_id)
        .bind(&order.customer)
        .bind(&order.status)
        .bind(order_items_json)
        .bind(order.amount)
        .bind(&order.amount_asset)
        .bind(order.created_at)
        .bind(order.updated_at)
        .bind(metadata_json)
        .execute(&mut *tx)
        .await
        .map_err(|e| ServiceError::Internal(format!("Failed to create order: {}", e)))?;

        // Step 3: Record inventory adjustments
        for adjustment in inventory_adjustments {
            sqlx::query(
                r#"
                INSERT INTO inventory_adjustments (id, tenant_id, product_id, variant_id, delta, 
                                                  quantity_before, quantity_after, reason, actor, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                "#
            )
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
            .execute(&mut *tx)
            .await
            .map_err(|e| ServiceError::Internal(format!("Failed to record inventory adjustment: {}", e)))?;
        }

        // Commit all changes atomically
        tx.commit()
            .await
            .map_err(|e| ServiceError::Internal(format!("Failed to commit transaction: {}", e)))?;

        Ok(true)
    }

    /// Atomic: Process refund + restore inventory + update order status
    ///
    /// Ensures consistency between refunds, inventory, and order state.
    pub async fn process_refund_and_restore_inventory(
        pool: &PgPool,
        refund: &RefundQuote,
        inventory_adjustments: &[InventoryAdjustment],
        order_id: &str,
        new_order_status: &str,
    ) -> ServiceResult<()> {
        let mut tx = pool
            .begin()
            .await
            .map_err(|e| ServiceError::Internal(format!("Failed to begin transaction: {}", e)))?;

        // Step 1: Mark refund as processed
        sqlx::query(
            r#"
            UPDATE refund_quotes 
            SET processed_at = NOW(), processed_by = $3
            WHERE tenant_id = $1 AND id = $2 AND processed_at IS NULL
            "#,
        )
        .bind(&refund.tenant_id)
        .bind(&refund.id)
        .bind("system")
        .execute(&mut *tx)
        .await
        .map_err(|e| ServiceError::Internal(format!("Failed to update refund: {}", e)))?;

        // Step 2: Record inventory restorations
        for adjustment in inventory_adjustments {
            sqlx::query(
                r#"
                INSERT INTO inventory_adjustments (id, tenant_id, product_id, variant_id, delta, 
                                                  quantity_before, quantity_after, reason, actor, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                "#
            )
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
            .execute(&mut *tx)
            .await
            .map_err(|e| ServiceError::Internal(format!("Failed to record inventory restoration: {}", e)))?;
        }

        // Step 3: Update order status
        sqlx::query(
            r#"
            UPDATE orders 
            SET status = $3, status_updated_at = NOW(), updated_at = NOW()
            WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(&refund.tenant_id)
        .bind(order_id)
        .bind(new_order_status)
        .execute(&mut *tx)
        .await
        .map_err(|e| ServiceError::Internal(format!("Failed to update order status: {}", e)))?;

        tx.commit().await.map_err(|e| {
            ServiceError::Internal(format!("Failed to commit refund transaction: {}", e))
        })?;

        Ok(())
    }

    /// Atomic: Convert inventory reservations to actual inventory deductions
    ///
    /// Called when a cart is paid or Stripe session completes.
    pub async fn convert_reservations_to_inventory(
        pool: &PgPool,
        tenant_id: &str,
        cart_id: &str,
    ) -> ServiceResult<Vec<InventoryAdjustment>> {
        let mut tx = pool
            .begin()
            .await
            .map_err(|e| ServiceError::Internal(format!("Failed to begin transaction: {}", e)))?;

        // Get active reservations
        let reservations: Vec<(String, Option<String>, i32, String)> = sqlx::query_as(
            r#"
            SELECT product_id, variant_id, quantity, id
            FROM inventory_reservations
            WHERE tenant_id = $1 AND cart_id = $2 AND status = 'active' AND expires_at > NOW()
            "#,
        )
        .bind(tenant_id)
        .bind(cart_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| ServiceError::Internal(format!("Failed to fetch reservations: {}", e)))?;

        if reservations.is_empty() {
            tx.rollback().await.ok();
            return Ok(vec![]);
        }

        let mut adjustments = Vec::new();
        let now = Utc::now();

        // Convert each reservation
        for (product_id, variant_id, quantity, reservation_id) in reservations {
            // Mark reservation as converted
            sqlx::query(
                r#"
                UPDATE inventory_reservations
                SET status = 'converted', converted_at = $3
                WHERE id = $1 AND tenant_id = $2
                "#,
            )
            .bind(&reservation_id)
            .bind(tenant_id)
            .bind(now)
            .execute(&mut *tx)
            .await
            .map_err(|e| ServiceError::Internal(format!("Failed to convert reservation: {}", e)))?;

            // Get current inventory for adjustment record
            let (current_qty,): (i32,) = if let Some(ref vid) = variant_id {
                sqlx::query_as(
                    "SELECT inventory_quantity FROM product_variants WHERE product_id = $1 AND id = $2"
                )
                .bind(&product_id)
                .bind(vid)
                .fetch_one(&mut *tx)
                .await
                .map_err(|e| ServiceError::Internal(format!("Failed to get variant inventory: {}", e)))?
            } else {
                sqlx::query_as(
                    "SELECT inventory_quantity FROM products WHERE id = $1 AND tenant_id = $2",
                )
                .bind(&product_id)
                .bind(tenant_id)
                .fetch_one(&mut *tx)
                .await
                .map_err(|e| {
                    ServiceError::Internal(format!("Failed to get product inventory: {}", e))
                })?
            };

            let next_qty = current_qty.saturating_sub(quantity).max(0);

            // Create adjustment record
            let adjustment = InventoryAdjustment {
                id: uuid::Uuid::new_v4().to_string(),
                tenant_id: tenant_id.to_string(),
                product_id: product_id.clone(),
                variant_id: variant_id.clone(),
                delta: -quantity,
                quantity_before: current_qty,
                quantity_after: next_qty,
                reason: Some("cart_paid".to_string()),
                actor: Some("system".to_string()),
                created_at: now,
            };

            sqlx::query(
                r#"
                INSERT INTO inventory_adjustments (id, tenant_id, product_id, variant_id, delta, 
                                                  quantity_before, quantity_after, reason, actor, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                "#
            )
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
            .execute(&mut *tx)
            .await
            .map_err(|e| ServiceError::Internal(format!("Failed to record adjustment: {}", e)))?;

            adjustments.push(adjustment);
        }

        tx.commit().await.map_err(|e| {
            ServiceError::Internal(format!("Failed to commit conversion transaction: {}", e))
        })?;

        Ok(adjustments)
    }

    /// Atomic: Create gift card with initial balance
    ///
    /// Ensures gift card and initial transaction record are created together.
    pub async fn create_gift_card_with_balance(
        pool: &PgPool,
        tenant_id: &str,
        code: &str,
        initial_balance: i64,
        currency: &str,
        created_by: &str,
    ) -> ServiceResult<String> {
        let mut tx = pool
            .begin()
            .await
            .map_err(|e| ServiceError::Internal(format!("Failed to begin transaction: {}", e)))?;

        let now = Utc::now();
        let card_id = uuid::Uuid::new_v4().to_string();

        // Create gift card
        let insert_result = sqlx::query_as::<_, (String,)>(
            r#"
            INSERT INTO gift_cards (id, tenant_id, code, balance, currency, active, created_at, created_by)
            VALUES ($1, $2, $3, $4, $5, true, $6, $7)
            ON CONFLICT (tenant_id, code) DO NOTHING
            RETURNING id
            "#
        )
        .bind(&card_id)
        .bind(tenant_id)
        .bind(code)
        .bind(initial_balance)
        .bind(currency)
        .bind(now)
        .bind(created_by)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| ServiceError::Internal(format!("Failed to create gift card: {}", e)))?;

        if insert_result.is_none() {
            tx.rollback().await.ok();
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidField,
                message: "Gift card code already exists".to_string(),
            });
        }

        // Record initial balance adjustment
        sqlx::query(
            r#"
            INSERT INTO gift_card_adjustments (id, gift_card_id, delta, balance_before, balance_after, reason, created_at)
            VALUES ($1, $2, $3, 0, $4, $5, $6)
            "#
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(&card_id)
        .bind(initial_balance)
        .bind(initial_balance)
        .bind("initial_balance")
        .bind(now)
        .execute(&mut *tx)
        .await
        .map_err(|e| ServiceError::Internal(format!("Failed to record gift card adjustment: {}", e)))?;

        tx.commit().await.map_err(|e| {
            ServiceError::Internal(format!("Failed to commit gift card transaction: {}", e))
        })?;

        Ok(card_id)
    }
}

#[cfg(test)]
mod tests {
    // Note: These tests would require a test database setup
    // They serve as documentation of expected behavior

    #[test]
    fn test_payment_order_inventory_atomicity() {
        // When record_payment_and_order is called:
        // - All three operations succeed together, OR
        // - All three fail and rollback
        // - Never a partial state
    }

    #[test]
    fn test_refund_inventory_order_atomicity() {
        // When process_refund_and_restore_inventory is called:
        // - Refund marked, inventory restored, and order updated together
        // - Automatic rollback on any failure
    }

    #[test]
    fn test_reservation_conversion_atomicity() {
        // When convert_reservations_to_inventory is called:
        // - All reservations converted together
        // - All inventory adjustments recorded together
    }

    #[test]
    fn test_gift_card_creation_atomicity() {
        // When create_gift_card_with_balance is called:
        // - Card created AND initial adjustment recorded together
        // - Or neither (on conflict or error)
    }
}
