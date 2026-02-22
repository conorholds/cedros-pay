//! Admin dashboard statistics and purchase list storage methods

use super::*;

pub(super) const TOP_PRODUCTS_QUERY: &str = r#"
            WITH order_totals AS (
                SELECT
                    o.id,
                    o.amount,
                    item->>'productId' AS product_id,
                    COALESCE((item->>'quantity')::BIGINT, 0) AS item_quantity,
                    SUM(COALESCE((item->>'quantity')::NUMERIC, 0)) OVER (PARTITION BY o.id) AS order_total_quantity
                FROM orders o
                CROSS JOIN LATERAL jsonb_array_elements(o.items) AS item
                WHERE o.tenant_id = $1 AND o.status = 'paid'
            )
            SELECT
                product_id,
                SUM(item_quantity) AS quantity,
                ROUND(COALESCE(SUM(
                    CASE
                        WHEN order_total_quantity > 0
                        THEN amount::NUMERIC * item_quantity::NUMERIC / order_total_quantity
                        ELSE 0
                    END
                ), 0))::BIGINT AS total_revenue
            FROM order_totals
            GROUP BY product_id
            ORDER BY total_revenue DESC
            LIMIT 10
            "#;

pub(super) fn map_top_products_query_result(
    result: Result<Vec<(Option<String>, i64, i64)>, sqlx::Error>,
) -> StorageResult<Vec<(Option<String>, i64, i64)>> {
    result.map_err(|e| StorageError::internal("get admin stats top products", e))
}

pub(super) async fn get_admin_stats(
    store: &PostgresStore,
    tenant_id: &str,
) -> StorageResult<AdminStats> {
    // Get total stats from orders table (more reliable than purchases)
    let stats_query = r#"
        SELECT
            COUNT(*) as total_count,
            COALESCE(SUM(amount)::BIGINT, 0) as total_amount
        FROM orders
        WHERE tenant_id = $1 AND status = 'paid'
        "#;

    let row: Option<(i64, i64)> = sqlx::query_as(stats_query)
        .bind(tenant_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get admin stats", e))?;

    let (total_transactions, total_amount) = row.unwrap_or((0, 0));
    let total_revenue = total_amount as f64 / 100.0; // Convert cents to dollars

    // Calculate average order value
    let average_order_value = if total_transactions > 0 {
        total_revenue / total_transactions as f64
    } else {
        0.0
    };

    // Get revenue by payment method
    let method_query = r#"
        SELECT
            source,
            COUNT(*) as tx_count,
            COALESCE(SUM(amount)::BIGINT, 0) as total_amount
        FROM orders
        WHERE tenant_id = $1 AND status = 'paid'
        GROUP BY source
        "#;

    let method_rows: Vec<(String, i64, i64)> = sqlx::query_as(method_query)
        .bind(tenant_id)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get admin stats by method", e))?;

    let mut revenue_by_method = std::collections::HashMap::new();
    let mut transactions_by_method = std::collections::HashMap::new();

    for (source, tx_count, amount) in method_rows {
        revenue_by_method.insert(source.clone(), amount as f64 / 100.0);
        transactions_by_method.insert(source, tx_count);
    }

    // Get revenue by day (last 30 days)
    let daily_query = r#"
        SELECT
            DATE(created_at) as day,
            COUNT(*) as tx_count,
            COALESCE(SUM(amount)::BIGINT, 0) as total_amount
        FROM orders
        WHERE tenant_id = $1 AND status = 'paid'
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY day ASC
        "#;

    let daily_rows: Vec<(chrono::NaiveDate, i64, i64)> = sqlx::query_as(daily_query)
        .bind(tenant_id)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get admin stats by day", e))?;

    let revenue_by_day: Vec<crate::storage::DailyRevenue> = daily_rows
        .into_iter()
        .map(|(day, tx_count, amount)| crate::storage::DailyRevenue {
            date: day.format("%Y-%m-%d").to_string(),
            revenue: amount as f64 / 100.0,
            transactions: tx_count,
        })
        .collect();

    // Get top products (top 10 by revenue)
    let top_rows: Vec<(Option<String>, i64, i64)> = map_top_products_query_result(
        sqlx::query_as(TOP_PRODUCTS_QUERY)
            .bind(tenant_id)
            .fetch_all(store.pool.inner())
            .await,
    )?;

    let top_products: Vec<crate::storage::TopProduct> = top_rows
        .into_iter()
        .filter_map(|(product_id, quantity, revenue)| {
            product_id.map(|pid| crate::storage::TopProduct {
                product_id: pid,
                revenue: revenue as f64 / 100.0,
                quantity_sold: quantity,
            })
        })
        .collect();

    Ok(AdminStats {
        total_revenue,
        total_transactions,
        average_order_value,
        revenue_by_method,
        transactions_by_method,
        revenue_by_day,
        top_products,
    })
}

pub(super) async fn list_purchases(
    store: &PostgresStore,
    tenant_id: &str,
    method: Option<&str>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<Purchase>> {
    // DB-01a: Use parameterized nullable filters instead of string interpolation
    let (asset_eq, asset_neq): (Option<&str>, Option<&str>) = match method {
        Some(m) if m.eq_ignore_ascii_case("stripe") => (Some("USD"), None),
        Some(m) if m.eq_ignore_ascii_case("x402") => (None, Some("USD")),
        _ => (None, None),
    };

    let raw_query = r#"
        SELECT signature, tenant_id, resource_id, wallet, user_id, amount, amount_asset, created_at, metadata
        FROM payment_transactions
        WHERE tenant_id = $1
          AND ($4::TEXT IS NULL OR amount_asset = $4)
          AND ($5::TEXT IS NULL OR amount_asset <> $5)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#;
    let query = store.payment_query(raw_query);

    let rows: Vec<(
        String,
        String,
        String,
        String,
        Option<String>,
        i64,
        String,
        DateTime<Utc>,
        serde_json::Value,
    )> = sqlx::query_as(&query)
        .bind(tenant_id)
        .bind(limit)
        .bind(offset)
        .bind(asset_eq)
        .bind(asset_neq)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list purchases", e))?;

    Ok(rows
        .into_iter()
        .map(
            |(
                signature,
                tenant_id,
                resource_id,
                wallet,
                user_id,
                amount,
                amount_asset,
                created_at,
                metadata,
            )| Purchase {
                signature,
                tenant_id,
                resource_id,
                wallet: Some(wallet),
                user_id,
                amount: format!("{} {}", amount, amount_asset),
                paid_at: created_at,
                metadata: Some(metadata),
            },
        )
        .collect())
}
