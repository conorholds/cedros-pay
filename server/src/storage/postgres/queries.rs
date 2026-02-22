//! SQL query constants for PostgreSQL storage
//!
//! Note: Queries are structured to support multi-tenant isolation (tenant_id in WHERE/PK).

/// Cart quote queries
/// Per spec (08-storage.md): All queries must include tenant_id for multi-tenant isolation
pub mod cart {
    pub const INSERT: &str = r#"
        INSERT INTO cart_quotes (id, tenant_id, items, total_amount, total_asset, metadata, created_at, expires_at, wallet_paid_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tenant_id, id) DO UPDATE SET
            items = EXCLUDED.items,
            total_amount = EXCLUDED.total_amount,
            total_asset = EXCLUDED.total_asset,
            metadata = EXCLUDED.metadata,
            expires_at = EXCLUDED.expires_at,
            wallet_paid_by = EXCLUDED.wallet_paid_by
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const GET_BY_ID: &str = r#"
        SELECT id, tenant_id, items, total_amount, total_asset, metadata, created_at, expires_at, wallet_paid_by
        FROM cart_quotes WHERE id = $1 AND tenant_id = $2
    "#;

    /// Batch query for multiple cart IDs (avoids N+1 queries)
    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const GET_BY_IDS: &str = r#"
        SELECT id, tenant_id, items, total_amount, total_asset, metadata, created_at, expires_at, wallet_paid_by
        FROM cart_quotes WHERE id = ANY($1) AND tenant_id = $2
    "#;

    /// Per spec (08-storage.md): Update must filter by tenant_id for isolation
    /// SECURITY: Only mark as paid if not already paid (prevents race condition / double payment)
    pub const MARK_PAID: &str = r#"
        UPDATE cart_quotes SET wallet_paid_by = $3 WHERE id = $1 AND tenant_id = $2 AND wallet_paid_by IS NULL
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const HAS_ACCESS: &str = r#"
        SELECT wallet_paid_by FROM cart_quotes WHERE id = $1 AND tenant_id = $2
    "#;

    /// Delete expired cart quotes across tenants (admin only, batched to avoid long locks)
    pub const CLEANUP_EXPIRED_ALL: &str = r#"
        DELETE FROM cart_quotes WHERE id IN (
            SELECT id FROM cart_quotes
            WHERE expires_at < NOW() AND wallet_paid_by IS NULL
            LIMIT 1000
        )
    "#;
}

/// Refund quote queries
/// Per spec (08-storage.md): All queries must include tenant_id for multi-tenant isolation
pub mod refund {
    pub const INSERT: &str = r#"
        INSERT INTO refund_quotes (
            id, tenant_id, original_purchase_id, recipient_wallet, amount, amount_asset, reason,
            metadata, created_at, expires_at, processed_by, processed_at, signature
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (tenant_id, id) DO UPDATE SET
            original_purchase_id = EXCLUDED.original_purchase_id,
            recipient_wallet = EXCLUDED.recipient_wallet,
            amount = EXCLUDED.amount,
            amount_asset = EXCLUDED.amount_asset,
            reason = EXCLUDED.reason,
            metadata = EXCLUDED.metadata,
            expires_at = EXCLUDED.expires_at,
            processed_by = EXCLUDED.processed_by,
            processed_at = EXCLUDED.processed_at,
            signature = EXCLUDED.signature
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const GET_BY_ID: &str = r#"
        SELECT id, tenant_id, original_purchase_id, recipient_wallet, amount, amount_asset, reason,
               metadata, created_at, expires_at, processed_by, processed_at, signature
        FROM refund_quotes WHERE id = $1 AND tenant_id = $2
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const LIST_PENDING: &str = r#"
        SELECT id, tenant_id, original_purchase_id, recipient_wallet, amount, amount_asset, reason,
               metadata, created_at, expires_at, processed_by, processed_at, signature
        FROM refund_quotes
        WHERE tenant_id = $1 AND processed_at IS NULL AND expires_at > NOW()
        ORDER BY created_at ASC
        LIMIT $2
    "#;

    /// Per spec (08-storage.md): Update must filter by tenant_id for isolation
    pub const MARK_PROCESSED: &str = r#"
        UPDATE refund_quotes
        SET processed_by = $3, processed_at = NOW(), signature = $4
        WHERE id = $1 AND tenant_id = $2
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const GET_BY_ORIGINAL_PURCHASE_ID: &str = r#"
        SELECT id, tenant_id, original_purchase_id, recipient_wallet, amount, amount_asset, reason,
               metadata, created_at, expires_at, processed_by, processed_at, signature
        FROM refund_quotes WHERE original_purchase_id = $1 AND tenant_id = $2
        ORDER BY created_at DESC LIMIT 1
    "#;

    /// Get ALL refunds for a purchase (for cumulative tracking)
    // DB-08d: Added LIMIT 1000 to bound unbounded query
    pub const GET_ALL_BY_ORIGINAL_PURCHASE_ID: &str = r#"
        SELECT id, tenant_id, original_purchase_id, recipient_wallet, amount, amount_asset, reason,
               metadata, created_at, expires_at, processed_by, processed_at, signature
        FROM refund_quotes WHERE original_purchase_id = $1 AND tenant_id = $2
        ORDER BY created_at ASC
        LIMIT 1000
    "#;

    /// Per spec (08-storage.md): Delete must filter by tenant_id for isolation
    pub const DELETE: &str = r#"
        DELETE FROM refund_quotes WHERE id = $1 AND tenant_id = $2
    "#;

    /// List credits refund requests with optional status filter and pagination.
    /// Credits refunds have `original_purchase_id LIKE 'credits:%'`.
    /// Uses COUNT(*) OVER() for atomic count+paginate in a single query.
    pub const LIST_CREDITS_REFUNDS: &str = r#"
        SELECT id, tenant_id, original_purchase_id, recipient_wallet, amount, amount_asset, reason,
               metadata, created_at, expires_at, processed_by, processed_at, signature,
               COUNT(*) OVER() AS total_count
        FROM refund_quotes
        WHERE tenant_id = $1
          AND original_purchase_id LIKE 'credits:%'
          AND (
            $2::text IS NULL
            OR ($2 = 'pending' AND processed_at IS NULL AND expires_at > NOW())
            OR ($2 = 'completed' AND processed_at IS NOT NULL AND signature IS NOT NULL)
            OR ($2 = 'denied' AND processed_at IS NOT NULL AND signature IS NULL)
          )
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
    "#;

    /// Delete expired refund quotes across tenants (admin only, batched to avoid long locks)
    pub const CLEANUP_EXPIRED_ALL: &str = r#"
        DELETE FROM refund_quotes WHERE id IN (
            SELECT id FROM refund_quotes
            WHERE expires_at < NOW() AND processed_at IS NULL
            LIMIT 1000
        )
    "#;
}

/// Stripe refund request queries
/// Per spec (08-storage.md): All queries must include tenant_id for multi-tenant isolation
pub mod stripe_refund_request {
    pub const UPSERT: &str = r#"
        INSERT INTO stripe_refund_requests (
            id, tenant_id, original_purchase_id, stripe_payment_intent_id, stripe_refund_id,
            stripe_charge_id, amount, currency, status, reason, metadata,
            created_at, processed_by, processed_at, last_error
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (tenant_id, id) DO UPDATE SET
            original_purchase_id = EXCLUDED.original_purchase_id,
            stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
            stripe_refund_id = EXCLUDED.stripe_refund_id,
            stripe_charge_id = EXCLUDED.stripe_charge_id,
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            status = EXCLUDED.status,
            reason = EXCLUDED.reason,
            metadata = EXCLUDED.metadata,
            processed_by = EXCLUDED.processed_by,
            processed_at = EXCLUDED.processed_at,
            last_error = EXCLUDED.last_error
    "#;

    pub const GET_BY_ID: &str = r#"
        SELECT id, tenant_id, original_purchase_id, stripe_payment_intent_id, stripe_refund_id,
               stripe_charge_id, amount, currency, status, reason, metadata,
               created_at, processed_by, processed_at, last_error
        FROM stripe_refund_requests
        WHERE tenant_id = $1 AND id = $2
    "#;

    pub const LIST_PENDING: &str = r#"
        SELECT id, tenant_id, original_purchase_id, stripe_payment_intent_id, stripe_refund_id,
               stripe_charge_id, amount, currency, status, reason, metadata,
               created_at, processed_by, processed_at, last_error
        FROM stripe_refund_requests
        WHERE tenant_id = $1 AND processed_at IS NULL
        ORDER BY created_at ASC
        LIMIT $2
    "#;

    pub const GET_PENDING_BY_ORIGINAL_PURCHASE_ID: &str = r#"
        SELECT id, tenant_id, original_purchase_id, stripe_payment_intent_id, stripe_refund_id,
               stripe_charge_id, amount, currency, status, reason, metadata,
               created_at, processed_by, processed_at, last_error
        FROM stripe_refund_requests
        WHERE tenant_id = $1 AND original_purchase_id = $2 AND processed_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
    "#;

    pub const GET_BY_CHARGE_ID: &str = r#"
        SELECT id, tenant_id, original_purchase_id, stripe_payment_intent_id, stripe_refund_id,
               stripe_charge_id, amount, currency, status, reason, metadata,
               created_at, processed_by, processed_at, last_error
        FROM stripe_refund_requests
        WHERE tenant_id = $1 AND stripe_charge_id = $2
        ORDER BY created_at DESC
        LIMIT 1
    "#;
}

/// Order queries
/// Per spec (08-storage.md): All queries must include tenant_id for multi-tenant isolation
pub mod orders {
    pub const INSERT_IF_ABSENT: &str = r#"
        INSERT INTO orders (
            id, tenant_id, source, purchase_id, resource_id, user_id, customer, status,
            items, amount, amount_asset, customer_email, customer_name, receipt_url,
            shipping, metadata, created_at, updated_at, status_updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        ON CONFLICT (tenant_id, source, purchase_id) DO NOTHING
    "#;

    pub const GET_BY_ID: &str = r#"
        SELECT id, tenant_id, source, purchase_id, resource_id, user_id, customer, status,
               items, amount, amount_asset, customer_email, customer_name, receipt_url,
               shipping, metadata, created_at, updated_at, status_updated_at
        FROM orders
        WHERE tenant_id = $1 AND id = $2
    "#;

    pub const LIST: &str = r#"
        SELECT id, tenant_id, source, purchase_id, resource_id, user_id, customer, status,
               items, amount, amount_asset, customer_email, customer_name, receipt_url,
               shipping, metadata, created_at, updated_at, status_updated_at
        FROM orders
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
    "#;

    pub const LIST_FILTERED: &str = r#"
        SELECT id, tenant_id, source, purchase_id, resource_id, user_id, customer, status,
               items, amount, amount_asset, customer_email, customer_name, receipt_url,
               shipping, metadata, created_at, updated_at, status_updated_at,
               COUNT(*) OVER() AS total_count
        FROM orders
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR status = $2)
          AND (
            $3::text IS NULL
            OR id ILIKE $3
            OR purchase_id ILIKE $3
            OR customer_email ILIKE $3
          )
          AND ($4::timestamptz IS NULL OR created_at < $4)
          AND ($5::timestamptz IS NULL OR created_at > $5)
        ORDER BY created_at DESC
        LIMIT $6 OFFSET $7
    "#;

    #[allow(dead_code)] // Superseded by COUNT(*) OVER() in LIST_FILTERED
    pub const COUNT_FILTERED: &str = r#"
        SELECT COUNT(1)
        FROM orders
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR status = $2)
          AND (
            $3::text IS NULL
            OR id ILIKE $3
            OR purchase_id ILIKE $3
            OR customer_email ILIKE $3
          )
          AND ($4::timestamptz IS NULL OR created_at < $4)
          AND ($5::timestamptz IS NULL OR created_at > $5)
    "#;

    pub const UPDATE_STATUS: &str = r#"
        UPDATE orders
        SET status = $3,
            status_updated_at = $4,
            updated_at = $5
        WHERE tenant_id = $1 AND id = $2
    "#;
}

pub mod order_history {
    pub const INSERT: &str = r#"
        INSERT INTO order_history (
            id, tenant_id, order_id, from_status, to_status, note, actor, created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    "#;

    pub const LIST: &str = r#"
        SELECT id, tenant_id, order_id, from_status, to_status, note, actor, created_at
        FROM order_history
        WHERE tenant_id = $1 AND order_id = $2
        ORDER BY created_at DESC
        LIMIT $3
    "#;
}

pub mod fulfillments {
    pub const INSERT: &str = r#"
        INSERT INTO fulfillments (
            id, tenant_id, order_id, status, carrier, tracking_number, tracking_url,
            items, shipped_at, delivered_at, metadata, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    "#;

    pub const LIST: &str = r#"
        SELECT id, tenant_id, order_id, status, carrier, tracking_number, tracking_url,
               items, shipped_at, delivered_at, metadata, created_at, updated_at
        FROM fulfillments
        WHERE tenant_id = $1 AND order_id = $2
        ORDER BY created_at DESC
        LIMIT $3
    "#;

    pub const GET_BY_ID: &str = r#"
        SELECT id, tenant_id, order_id, status, carrier, tracking_number, tracking_url,
               items, shipped_at, delivered_at, metadata, created_at, updated_at
        FROM fulfillments
        WHERE tenant_id = $1 AND id = $2
    "#;

    pub const UPDATE_STATUS: &str = r#"
        UPDATE fulfillments
        SET status = $3,
            shipped_at = $4,
            delivered_at = $5,
            updated_at = $6,
            tracking_number = $7,
            tracking_url = $8,
            carrier = $9
        WHERE tenant_id = $1 AND id = $2
        RETURNING id, tenant_id, order_id, status, carrier, tracking_number, tracking_url,
                  items, shipped_at, delivered_at, metadata, created_at, updated_at
    "#;
}

pub mod returns {
    pub const INSERT: &str = r#"
        INSERT INTO returns (
            id, tenant_id, order_id, status, items, reason, metadata, created_at, updated_at, status_updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    "#;

    pub const UPDATE_STATUS: &str = r#"
        UPDATE returns
        SET status = $3,
            status_updated_at = $4,
            updated_at = $5
        WHERE tenant_id = $1 AND id = $2
    "#;

    pub const GET: &str = r#"
        SELECT id, tenant_id, order_id, status, items, reason, metadata, created_at, updated_at, status_updated_at
        FROM returns
        WHERE tenant_id = $1 AND id = $2
    "#;

    pub const LIST: &str = r#"
        SELECT id, tenant_id, order_id, status, items, reason, metadata, created_at, updated_at, status_updated_at
        FROM returns
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR order_id = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
    "#;
}

pub mod inventory_reservations {
    pub const INSERT: &str = r#"
        INSERT INTO inventory_reservations (
            id, tenant_id, product_id, variant_id, quantity, expires_at, cart_id, status, created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    "#;

    pub const LIST_ACTIVE_BY_CART: &str = r#"
        SELECT id, tenant_id, product_id, variant_id, quantity, expires_at, cart_id, status, created_at
        FROM inventory_reservations
        WHERE tenant_id = $1 AND cart_id = $2 AND status = 'active'
        ORDER BY created_at DESC
    "#;

    pub const SUM_ACTIVE_BY_PRODUCT: &str = r#"
        SELECT COALESCE(SUM(quantity), 0)
        FROM inventory_reservations
        WHERE tenant_id = $1
          AND product_id = $2
          AND variant_id IS NOT DISTINCT FROM $3
          AND status = 'active'
          AND expires_at > $4
    "#;

    /// Sum active reservations excluding a specific cart (for pre-checkout validation)
    pub const SUM_ACTIVE_BY_PRODUCT_EXCLUDING_CART: &str = r#"
        SELECT COALESCE(SUM(quantity), 0)
        FROM inventory_reservations
        WHERE tenant_id = $1
          AND product_id = $2
          AND variant_id IS NOT DISTINCT FROM $3
          AND status = 'active'
          AND expires_at > $4
          AND (cart_id IS NULL OR cart_id != $5)
    "#;

    pub const RELEASE_BY_CART: &str = r#"
        UPDATE inventory_reservations
        SET status = 'released'
        WHERE tenant_id = $1 AND cart_id = $2 AND status = 'active'
    "#;

    pub const CONVERT_BY_CART: &str = r#"
        UPDATE inventory_reservations
        SET status = 'converted'
        WHERE tenant_id = $1 AND cart_id = $2 AND status = 'active'
    "#;

    // DB-09b: Batch LIMIT to prevent unbounded cleanup affecting all rows at once
    pub const CLEANUP_EXPIRED: &str = r#"
        UPDATE inventory_reservations
        SET status = 'released'
        WHERE ctid IN (
            SELECT ctid FROM inventory_reservations
            WHERE status = 'active' AND expires_at < $1
            LIMIT 1000
        )
    "#;
}

pub mod inventory_adjustments {
    pub const INSERT: &str = r#"
        INSERT INTO inventory_adjustments (
            id, tenant_id, product_id, variant_id, delta, quantity_before, quantity_after, reason, actor, created_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    "#;

    pub const LIST_BY_PRODUCT: &str = r#"
        SELECT id, tenant_id, product_id, variant_id, delta, quantity_before, quantity_after, reason, actor, created_at
        FROM inventory_adjustments
        WHERE tenant_id = $1 AND product_id = $2
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
    "#;
}

pub mod shipping_profiles {
    pub const INSERT: &str = r#"
        INSERT INTO shipping_profiles (
            id, tenant_id, name, description, countries, active, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    "#;

    pub const UPDATE: &str = r#"
        UPDATE shipping_profiles
        SET name = $3,
            description = $4,
            countries = $5,
            active = $6,
            updated_at = $7
        WHERE tenant_id = $1 AND id = $2
    "#;

    pub const GET: &str = r#"
        SELECT id, tenant_id, name, description, countries, active, created_at, updated_at
        FROM shipping_profiles
        WHERE tenant_id = $1 AND id = $2
    "#;

    pub const LIST: &str = r#"
        SELECT id, tenant_id, name, description, countries, active, created_at, updated_at
        FROM shipping_profiles
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
    "#;

    pub const DELETE: &str = r#"
        DELETE FROM shipping_profiles
        WHERE tenant_id = $1 AND id = $2
    "#;
}

pub mod shipping_rates {
    pub const INSERT: &str = r#"
        INSERT INTO shipping_rates (
            id, tenant_id, profile_id, name, rate_type, amount_atomic, currency,
            min_subtotal, max_subtotal, active, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    "#;

    pub const UPDATE: &str = r#"
        UPDATE shipping_rates
        SET name = $3,
            rate_type = $4,
            amount_atomic = $5,
            currency = $6,
            min_subtotal = $7,
            max_subtotal = $8,
            active = $9,
            updated_at = $10
        WHERE tenant_id = $1 AND id = $2
    "#;

    pub const LIST: &str = r#"
        SELECT id, tenant_id, profile_id, name, rate_type, amount_atomic, currency,
               min_subtotal, max_subtotal, active, created_at, updated_at
        FROM shipping_rates
        WHERE tenant_id = $1 AND profile_id = $2
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
    "#;

    pub const DELETE: &str = r#"
        DELETE FROM shipping_rates
        WHERE tenant_id = $1 AND id = $2
    "#;
}

pub mod tax_rates {
    pub const INSERT: &str = r#"
        INSERT INTO tax_rates (
            id, tenant_id, name, country, region, rate_bps, active, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    "#;

    pub const UPDATE: &str = r#"
        UPDATE tax_rates
        SET name = $3,
            country = $4,
            region = $5,
            rate_bps = $6,
            active = $7,
            updated_at = $8
        WHERE tenant_id = $1 AND id = $2
    "#;

    pub const GET: &str = r#"
        SELECT id, tenant_id, name, country, region, rate_bps, active, created_at, updated_at
        FROM tax_rates
        WHERE tenant_id = $1 AND id = $2
    "#;

    pub const LIST: &str = r#"
        SELECT id, tenant_id, name, country, region, rate_bps, active, created_at, updated_at
        FROM tax_rates
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
    "#;

    pub const DELETE: &str = r#"
        DELETE FROM tax_rates
        WHERE tenant_id = $1 AND id = $2
    "#;
}

pub mod customers {
    pub const INSERT: &str = r#"
        INSERT INTO customers (
            id, tenant_id, email, name, phone, addresses, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    "#;

    pub const UPDATE: &str = r#"
        UPDATE customers
        SET email = $3,
            name = $4,
            phone = $5,
            addresses = $6,
            updated_at = $7
        WHERE tenant_id = $1 AND id = $2
    "#;

    pub const GET: &str = r#"
        SELECT id, tenant_id, email, name, phone, addresses, created_at, updated_at
        FROM customers
        WHERE tenant_id = $1 AND id = $2
    "#;

    pub const LIST: &str = r#"
        SELECT id, tenant_id, email, name, phone, addresses, created_at, updated_at
        FROM customers
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
    "#;
}

pub mod disputes {
    pub const INSERT: &str = r#"
        INSERT INTO disputes (
            id, tenant_id, source, order_id, payment_intent_id, charge_id, status, reason,
            amount, currency, metadata, created_at, updated_at, status_updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    "#;

    pub const UPDATE_STATUS: &str = r#"
        UPDATE disputes
        SET status = $3,
            status_updated_at = $4,
            updated_at = $5
        WHERE tenant_id = $1 AND id = $2
    "#;

    pub const GET: &str = r#"
        SELECT id, tenant_id, source, order_id, payment_intent_id, charge_id, status, reason,
               amount, currency, metadata, created_at, updated_at, status_updated_at
        FROM disputes
        WHERE tenant_id = $1 AND id = $2
    "#;

    pub const LIST: &str = r#"
        SELECT id, tenant_id, source, order_id, payment_intent_id, charge_id, status, reason,
               amount, currency, metadata, created_at, updated_at, status_updated_at
        FROM disputes
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR source = $3)
          AND ($4::text IS NULL OR order_id = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
    "#;
}

pub mod gift_cards {
    pub const INSERT: &str = r#"
        INSERT INTO gift_cards (
            code, tenant_id, initial_balance, balance, currency, active, expires_at, metadata,
            created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    "#;

    pub const UPDATE: &str = r#"
        UPDATE gift_cards
        SET initial_balance = $3,
            balance = $4,
            currency = $5,
            active = $6,
            expires_at = $7,
            metadata = $8,
            updated_at = $9
        WHERE tenant_id = $1 AND code = $2
    "#;

    pub const GET: &str = r#"
        SELECT code, tenant_id, initial_balance, balance, currency, active, expires_at, metadata,
               created_at, updated_at
        FROM gift_cards
        WHERE tenant_id = $1 AND code = $2
    "#;

    pub const LIST: &str = r#"
        SELECT code, tenant_id, initial_balance, balance, currency, active, expires_at, metadata,
               created_at, updated_at
        FROM gift_cards
        WHERE tenant_id = $1
          AND ($2::boolean IS NULL OR active = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
    "#;

    pub const UPDATE_BALANCE: &str = r#"
        UPDATE gift_cards
        SET balance = $3,
            updated_at = $4
        WHERE tenant_id = $1 AND code = $2
    "#;

    /// Atomically deduct from gift card balance only if sufficient funds exist.
    /// SECURITY: Prevents race condition / over-redemption (H-001 fix).
    /// Returns the new balance if successful, or no rows if insufficient funds.
    pub const TRY_ADJUST_BALANCE: &str = r#"
        UPDATE gift_cards
        SET balance = balance - $3,
            updated_at = $4
        WHERE tenant_id = $1 AND code = $2 AND balance >= $3
        RETURNING balance
    "#;
}

pub mod collections {
    pub const INSERT: &str = r#"
        INSERT INTO collections (
            id, tenant_id, name, description, product_ids, active, created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    "#;

    pub const UPDATE: &str = r#"
        UPDATE collections
        SET name = $3,
            description = $4,
            product_ids = $5,
            active = $6,
            updated_at = $7
        WHERE tenant_id = $1 AND id = $2
    "#;

    pub const GET: &str = r#"
        SELECT id, tenant_id, name, description, product_ids, active, created_at, updated_at
        FROM collections
        WHERE tenant_id = $1 AND id = $2
    "#;

    pub const LIST: &str = r#"
        SELECT id, tenant_id, name, description, product_ids, active, created_at, updated_at
        FROM collections
        WHERE tenant_id = $1
          AND ($2::boolean IS NULL OR active = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
    "#;

    pub const DELETE: &str = r#"
        DELETE FROM collections
        WHERE tenant_id = $1 AND id = $2
    "#;
}

/// Payment transaction queries
/// Per spec (08-storage.md): All queries must include tenant_id for multi-tenant isolation
pub mod payment {
    /// Per spec (09-storage-postgres.md): INSERT must include tenant_id for multi-tenancy
    pub const INSERT: &str = r#"
        INSERT INTO payment_transactions (signature, tenant_id, resource_id, wallet, user_id, amount, amount_asset, created_at, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tenant_id, signature) DO NOTHING
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    /// Note: Signature is globally unique, but we still filter by tenant for isolation
    pub const EXISTS: &str = r#"
        SELECT EXISTS(SELECT 1 FROM payment_transactions WHERE signature = $1 AND tenant_id = $2)
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const GET_BY_SIGNATURE: &str = r#"
        SELECT signature, tenant_id, resource_id, wallet, user_id, amount, amount_asset, created_at, metadata
        FROM payment_transactions WHERE signature = $1 AND tenant_id = $2
    "#;

    /// Delete payment by signature with tenant isolation (used for webhook idempotency cleanup)
    pub const DELETE_BY_SIGNATURE: &str = r#"
        DELETE FROM payment_transactions WHERE signature = $1 AND tenant_id = $2
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const HAS_ACCESS: &str = r#"
        SELECT EXISTS(
            SELECT 1 FROM payment_transactions
            WHERE tenant_id = $1 AND resource_id = $2 AND wallet = $3 AND created_at > $4
        )
    "#;

    /// Archive old payments across all tenants (admin only, batched to avoid long locks)
    pub const ARCHIVE_OLD_ALL: &str = r#"
        DELETE FROM payment_transactions WHERE ctid IN (
            SELECT ctid FROM payment_transactions
            WHERE created_at < $1
            LIMIT 1000
        )
    "#;

    pub const LIST_BY_USER_ID: &str = r#"
        SELECT signature, tenant_id, resource_id, wallet, user_id, amount, amount_asset, created_at, metadata
        FROM payment_transactions
        WHERE tenant_id = $1 AND user_id = $2
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
    "#;
}

/// Credits hold binding queries
///
/// Holds are tenant-scoped and used to bind cedros-login hold IDs to
/// (user_id, resource_id, amount) to prevent replay/mismatch attacks.
pub mod credits_hold {
    pub const UPSERT: &str = r#"
        INSERT INTO credits_holds (
            tenant_id, hold_id, user_id, resource_id, amount, amount_asset, created_at, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (tenant_id, hold_id) DO NOTHING
    "#;

    /// Refresh `expires_at` for an existing hold only when the binding matches.
    ///
    /// SECURITY: prevents overwriting an existing (tenant_id, hold_id) binding to a different
    /// (user_id, resource_id, amount) tuple.
    pub const UPDATE_EXPIRES_AT_IF_MATCH: &str = r#"
        UPDATE credits_holds
        SET expires_at = $7
        WHERE tenant_id = $1
          AND hold_id = $2
          AND user_id = $3
          AND resource_id = $4
          AND amount = $5
          AND amount_asset = $6
    "#;

    pub const GET_BY_ID: &str = r#"
        SELECT tenant_id, hold_id, user_id, resource_id, amount, amount_asset, created_at, expires_at
        FROM credits_holds
        WHERE tenant_id = $1 AND hold_id = $2
    "#;

    pub const DELETE_BY_ID: &str = r#"
        DELETE FROM credits_holds WHERE tenant_id = $1 AND hold_id = $2
    "#;

    /// Batched to avoid long locks on large backlogs
    pub const CLEANUP_EXPIRED: &str = r#"
        DELETE FROM credits_holds WHERE ctid IN (
            SELECT ctid FROM credits_holds
            WHERE expires_at < $1
            LIMIT 1000
        )
    "#;
}

/// Admin nonce queries
/// Per spec (08-storage.md): All queries must include tenant_id for multi-tenant isolation
pub mod nonce {
    pub const INSERT: &str = r#"
        INSERT INTO admin_nonces (id, tenant_id, purpose, created_at, expires_at, consumed_at)
        VALUES ($1, $2, $3, $4, $5, $6)
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const GET_BY_ID: &str = r#"
        SELECT id, tenant_id, purpose, created_at, expires_at, consumed_at
        FROM admin_nonces WHERE id = $1 AND tenant_id = $2
    "#;

    /// Per spec (08-storage.md): Update must filter by tenant_id for isolation
    pub const CONSUME: &str = r#"
        UPDATE admin_nonces SET consumed_at = NOW() WHERE id = $1 AND tenant_id = $2 AND consumed_at IS NULL
    "#;

    /// Cleanup expired nonces across all tenants (admin only, batched to avoid long locks)
    pub const CLEANUP_EXPIRED_ALL: &str = r#"
        DELETE FROM admin_nonces WHERE id IN (
            SELECT id FROM admin_nonces
            WHERE expires_at < NOW() OR consumed_at IS NOT NULL
            LIMIT 1000
        )
    "#;
}

/// Webhook queue queries
pub mod webhook {
    /// Per spec (20-webhooks.md): INSERT must include tenant_id for multi-tenancy
    pub const INSERT: &str = r#"
        INSERT INTO webhook_queue (
            id, tenant_id, url, payload, payload_bytes, headers, event_type, status, attempts, max_attempts,
            last_error, last_attempt_at, next_attempt_at, created_at, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO NOTHING
    "#;

    /// Per spec (20-webhooks.md): DEQUEUE returns tenant_id for proper isolation
    /// Also recovers orphaned "processing" webhooks stuck for > 5 minutes (crash recovery)
    pub const DEQUEUE: &str = r#"
        UPDATE webhook_queue
        SET status = 'processing', last_attempt_at = NOW()
        WHERE id IN (
            SELECT id FROM webhook_queue
            WHERE (
                -- Normal pending webhooks ready for processing
                (status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= NOW()))
                OR
                -- Orphaned processing webhooks stuck for > 5 minutes (crash recovery)
                (status = 'processing' AND last_attempt_at < NOW() - INTERVAL '5 minutes')
            )
            -- STOR-002: Include id for deterministic ordering when timestamps match
            ORDER BY created_at ASC, id ASC
            LIMIT $1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING id, tenant_id, url, payload, payload_bytes, headers, event_type, status, attempts, max_attempts,
                  last_error, last_attempt_at, next_attempt_at, created_at, completed_at
    "#;

    pub const MARK_PROCESSING: &str = r#"
        UPDATE webhook_queue SET status = 'processing', last_attempt_at = NOW() WHERE id = $1
    "#;

    pub const MARK_SUCCESS: &str = r#"
        UPDATE webhook_queue SET status = 'success', completed_at = NOW() WHERE id = $1
    "#;

    pub const MARK_FAILED: &str = r#"
        UPDATE webhook_queue
        SET status = 'failed', last_error = $2, next_attempt_at = $3, attempts = attempts + 1
        WHERE id = $1
    "#;

    pub const MARK_RETRY: &str = r#"
        UPDATE webhook_queue
        SET status = 'pending', last_error = $2, next_attempt_at = $3, attempts = attempts + 1
        WHERE id = $1
    "#;

    pub const GET_BY_ID: &str = r#"
        SELECT id, tenant_id, url, payload, payload_bytes, headers, event_type, status, attempts, max_attempts,
               last_error, last_attempt_at, next_attempt_at, created_at, completed_at
        FROM webhook_queue WHERE id = $1
    "#;

    pub const LIST: &str = r#"
        SELECT id, tenant_id, url, payload, payload_bytes, headers, event_type, status, attempts, max_attempts,
               last_error, last_attempt_at, next_attempt_at, created_at, completed_at
        FROM webhook_queue
        WHERE tenant_id = $1 AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at ASC
        LIMIT $3
    "#;

    pub const RETRY: &str = r#"
        UPDATE webhook_queue SET status = 'pending', next_attempt_at = NOW() WHERE id = $1
    "#;

    pub const DELETE: &str = r#"
        DELETE FROM webhook_queue WHERE id = $1
    "#;

    /// Cleanup old completed/failed webhooks (batched to avoid long locks)
    /// $1: retention_days (integer, e.g., 7 for 7-day retention)
    pub const CLEANUP_OLD: &str = r#"
        DELETE FROM webhook_queue WHERE id IN (
            SELECT id FROM webhook_queue
            WHERE status IN ('success', 'failed')
              AND completed_at < NOW() - $1 * INTERVAL '1 day'
            LIMIT 1000
        )
    "#;

    /// Count pending/retry-ready webhooks for backlog metric
    pub const COUNT_PENDING: &str = r#"
        SELECT COUNT(*) FROM webhook_queue
        WHERE status IN ('pending', 'processing')
           OR (status = 'failed' AND next_attempt_at <= NOW())
    "#;
}

/// Email queue queries for async email delivery
pub mod email {
    pub const INSERT: &str = r#"
        INSERT INTO email_queue (
            id, tenant_id, to_email, from_email, from_name, subject, body_text, body_html,
            status, attempts, max_attempts, last_error, last_attempt_at, next_attempt_at,
            created_at, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO NOTHING
    "#;

    /// Dequeue emails ready for processing with crash recovery
    pub const DEQUEUE: &str = r#"
        UPDATE email_queue
        SET status = 'processing', last_attempt_at = NOW()
        WHERE id IN (
            SELECT id FROM email_queue
            WHERE (
                (status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= NOW()))
                OR
                (status = 'processing' AND last_attempt_at < NOW() - INTERVAL '5 minutes')
            )
            ORDER BY created_at ASC, id ASC
            LIMIT $1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING id, tenant_id, to_email, from_email, from_name, subject, body_text, body_html,
                  status, attempts, max_attempts, last_error, last_attempt_at, next_attempt_at,
                  created_at, completed_at
    "#;

    pub const MARK_PROCESSING: &str = r#"
        UPDATE email_queue SET status = 'processing', last_attempt_at = NOW() WHERE id = $1
    "#;

    pub const MARK_SUCCESS: &str = r#"
        UPDATE email_queue SET status = 'completed', completed_at = NOW() WHERE id = $1
    "#;

    pub const MARK_RETRY: &str = r#"
        UPDATE email_queue
        SET status = 'pending', last_error = $2, next_attempt_at = $3, attempts = attempts + 1
        WHERE id = $1
    "#;

    pub const MARK_FAILED: &str = r#"
        UPDATE email_queue
        SET status = 'failed', last_error = $2, completed_at = NOW(), attempts = attempts + 1
        WHERE id = $1
    "#;

    pub const GET_BY_ID: &str = r#"
        SELECT id, tenant_id, to_email, from_email, from_name, subject, body_text, body_html,
               status, attempts, max_attempts, last_error, last_attempt_at, next_attempt_at,
               created_at, completed_at
        FROM email_queue WHERE id = $1
    "#;

    /// Cleanup old completed/failed emails (batched to avoid long locks)
    /// $1: retention_days (integer, e.g., 30 for 30-day retention)
    pub const CLEANUP_OLD: &str = r#"
        DELETE FROM email_queue WHERE id IN (
            SELECT id FROM email_queue
            WHERE status IN ('completed', 'failed')
              AND completed_at < NOW() - $1 * INTERVAL '1 day'
            LIMIT 1000
        )
    "#;
}

/// Idempotency queries
pub mod idempotency {
    pub const INSERT: &str = r#"
        INSERT INTO idempotency_keys (key, status_code, headers, body, cached_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (key) DO UPDATE SET
            status_code = EXCLUDED.status_code,
            headers = EXCLUDED.headers,
            body = EXCLUDED.body,
            cached_at = EXCLUDED.cached_at,
            expires_at = EXCLUDED.expires_at
    "#;

    pub const INSERT_IF_ABSENT: &str = r#"
        INSERT INTO idempotency_keys (key, status_code, headers, body, cached_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (key) DO NOTHING
    "#;

    pub const GET_BY_KEY: &str = r#"
        SELECT key, status_code, headers, body, cached_at
        FROM idempotency_keys
        WHERE key = $1 AND expires_at > NOW()
    "#;

    pub const DELETE: &str = r#"
        DELETE FROM idempotency_keys WHERE key = $1
    "#;

    /// Batched to avoid long locks on large backlogs
    pub const CLEANUP_EXPIRED: &str = r#"
        DELETE FROM idempotency_keys WHERE key IN (
            SELECT key FROM idempotency_keys
            WHERE expires_at < NOW()
            LIMIT 1000
        )
    "#;
}

/// Subscription queries
/// Per spec (08-storage.md): All queries must include tenant_id for multi-tenant isolation
pub mod subscription {
    pub const INSERT: &str = r#"
        INSERT INTO subscriptions (
            id, tenant_id, product_id, plan_id, wallet, user_id, stripe_customer_id, stripe_subscription_id,
            payment_method, billing_period, billing_interval, status,
            current_period_start, current_period_end, trial_end,
            cancelled_at, cancel_at_period_end, metadata, payment_signature, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (tenant_id, id) DO UPDATE SET
            product_id = EXCLUDED.product_id,
            plan_id = EXCLUDED.plan_id,
            wallet = EXCLUDED.wallet,
            user_id = EXCLUDED.user_id,
            stripe_customer_id = EXCLUDED.stripe_customer_id,
            stripe_subscription_id = EXCLUDED.stripe_subscription_id,
            payment_method = EXCLUDED.payment_method,
            billing_period = EXCLUDED.billing_period,
            billing_interval = EXCLUDED.billing_interval,
            status = EXCLUDED.status,
            current_period_start = EXCLUDED.current_period_start,
            current_period_end = EXCLUDED.current_period_end,
            trial_end = EXCLUDED.trial_end,
            cancelled_at = EXCLUDED.cancelled_at,
            cancel_at_period_end = EXCLUDED.cancel_at_period_end,
            metadata = EXCLUDED.metadata,
            payment_signature = EXCLUDED.payment_signature,
            updated_at = EXCLUDED.updated_at
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const GET_BY_ID: &str = r#"
        SELECT id, tenant_id, product_id, plan_id, wallet, user_id, stripe_customer_id, stripe_subscription_id,
               payment_method, billing_period, billing_interval, status,
               current_period_start, current_period_end, trial_end,
               cancelled_at, cancel_at_period_end, metadata, payment_signature, created_at, updated_at
        FROM subscriptions WHERE id = $1 AND tenant_id = $2
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const GET_BY_WALLET_PRODUCT: &str = r#"
        SELECT id, tenant_id, product_id, plan_id, wallet, user_id, stripe_customer_id, stripe_subscription_id,
               payment_method, billing_period, billing_interval, status,
               current_period_start, current_period_end, trial_end,
               cancelled_at, cancel_at_period_end, metadata, payment_signature, created_at, updated_at
        FROM subscriptions
        WHERE tenant_id = $1 AND wallet = $2 AND product_id = $3 AND status IN ('active', 'trialing', 'past_due')
        ORDER BY created_at DESC LIMIT 1
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const GET_BY_WALLET: &str = r#"
        SELECT id, tenant_id, product_id, plan_id, wallet, user_id, stripe_customer_id, stripe_subscription_id,
               payment_method, billing_period, billing_interval, status,
               current_period_start, current_period_end, trial_end,
               cancelled_at, cancel_at_period_end, metadata, payment_signature, created_at, updated_at
        FROM subscriptions WHERE tenant_id = $1 AND wallet = $2
        ORDER BY created_at DESC
        LIMIT 1000
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const GET_BY_STRIPE_ID: &str = r#"
        SELECT id, tenant_id, product_id, plan_id, wallet, user_id, stripe_customer_id, stripe_subscription_id,
               payment_method, billing_period, billing_interval, status,
               current_period_start, current_period_end, trial_end,
               cancelled_at, cancel_at_period_end, metadata, payment_signature, created_at, updated_at
        FROM subscriptions WHERE tenant_id = $1 AND stripe_subscription_id = $2
    "#;

    /// Find subscription by Stripe ID across all tenants (for webhook handling)
    /// Note: This bypasses tenant isolation because Stripe webhooks don't include tenant context.
    /// Stripe subscription IDs are globally unique, so this is safe.
    pub const FIND_BY_STRIPE_ID: &str = r#"
        SELECT id, tenant_id, product_id, plan_id, wallet, user_id, stripe_customer_id, stripe_subscription_id,
               payment_method, billing_period, billing_interval, status,
               current_period_start, current_period_end, trial_end,
               cancelled_at, cancel_at_period_end, metadata, payment_signature, created_at, updated_at
        FROM subscriptions WHERE stripe_subscription_id = $1
    "#;

    /// SECURITY (H-004): Query must filter by tenant_id for isolation.
    /// Used for idempotency - prevents duplicate subscriptions for the same payment.
    pub const GET_BY_PAYMENT_SIGNATURE: &str = r#"
        SELECT id, tenant_id, product_id, plan_id, wallet, user_id, stripe_customer_id, stripe_subscription_id,
               payment_method, billing_period, billing_interval, status,
               current_period_start, current_period_end, trial_end,
               cancelled_at, cancel_at_period_end, metadata, payment_signature, created_at, updated_at
        FROM subscriptions WHERE tenant_id = $1 AND payment_signature = $2
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const LIST_ACTIVE: &str = r#"
        SELECT id, tenant_id, product_id, plan_id, wallet, user_id, stripe_customer_id, stripe_subscription_id,
               payment_method, billing_period, billing_interval, status,
               current_period_start, current_period_end, trial_end,
               cancelled_at, cancel_at_period_end, metadata, payment_signature, created_at, updated_at
        FROM subscriptions
        WHERE tenant_id = $1 AND status IN ('active', 'trialing', 'past_due')
          AND ($2::text IS NULL OR product_id = $2)
        ORDER BY created_at DESC
        LIMIT 1000
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const LIST_EXPIRING: &str = r#"
        SELECT id, tenant_id, product_id, plan_id, wallet, user_id, stripe_customer_id, stripe_subscription_id,
               payment_method, billing_period, billing_interval, status,
               current_period_start, current_period_end, trial_end,
               cancelled_at, cancel_at_period_end, metadata, payment_signature, created_at, updated_at
        FROM subscriptions
        WHERE tenant_id = $1 AND current_period_end <= $2 AND status IN ('active', 'trialing', 'past_due')
        ORDER BY current_period_end ASC
        LIMIT 1000
    "#;

    /// List expiring x402/credits subscriptions eligible for expiry (limited).
    pub const LIST_EXPIRING_LOCAL_LIMITED: &str = r#"
        SELECT id, tenant_id, product_id, plan_id, wallet, user_id, stripe_customer_id, stripe_subscription_id,
               payment_method, billing_period, billing_interval, status,
               current_period_start, current_period_end, trial_end,
               cancelled_at, cancel_at_period_end, metadata, payment_signature, created_at, updated_at
        FROM subscriptions
        WHERE tenant_id = $1
          AND current_period_end <= $2
          AND status = 'active'
          AND payment_method IN ('x402', 'credits')
        ORDER BY current_period_end ASC
        LIMIT $3
    "#;

    /// Per spec (08-storage.md): Update must filter by tenant_id for isolation
    pub const UPDATE_STATUS: &str = r#"
        UPDATE subscriptions SET status = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2
    "#;

    /// Batch update subscription statuses (tenant isolated).
    pub const UPDATE_STATUS_BATCH: &str = r#"
        UPDATE subscriptions SET status = $3, updated_at = NOW()
        WHERE tenant_id = $1 AND id = ANY($2::text[])
    "#;

    /// Per spec (08-storage.md): Soft delete - set status to 'cancelled'
    /// Per spec (08-storage.md line 143): Delete(ctx, id) - Soft delete (set status=cancelled)
    pub const DELETE: &str = r#"
        UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const GET_BY_STRIPE_CUSTOMER_ID: &str = r#"
        SELECT id, tenant_id, product_id, plan_id, wallet, user_id, stripe_customer_id, stripe_subscription_id,
               payment_method, billing_period, billing_interval, status,
               current_period_start, current_period_end, trial_end,
               cancelled_at, cancel_at_period_end, metadata, payment_signature, created_at, updated_at
        FROM subscriptions WHERE tenant_id = $1 AND stripe_customer_id = $2
        ORDER BY created_at DESC
        LIMIT 1000
    "#;

    /// Per spec (08-storage.md): Query must filter by tenant_id for isolation
    pub const LIST_BY_PRODUCT: &str = r#"
        SELECT id, tenant_id, product_id, plan_id, wallet, user_id, stripe_customer_id, stripe_subscription_id,
               payment_method, billing_period, billing_interval, status,
               current_period_start, current_period_end, trial_end,
               cancelled_at, cancel_at_period_end, metadata, payment_signature, created_at, updated_at
        FROM subscriptions WHERE tenant_id = $1 AND product_id = $2
        ORDER BY created_at DESC
        LIMIT 1000
    "#;

    /// Count subscriptions by plan_id for inventory tracking
    /// Only counts non-cancelled subscriptions (active, trialing, past_due, unpaid, expired)
    pub const COUNT_BY_PLAN_ID: &str = r#"
        SELECT COUNT(*) as count
        FROM subscriptions
        WHERE tenant_id = $1 AND plan_id = $2 AND status != 'cancelled'
    "#;
}

/// Chat session and message queries
/// Per spec (08-storage.md): All queries must include tenant_id for multi-tenant isolation
pub mod chat {
    /// Insert a new chat session
    pub const INSERT_SESSION: &str = r#"
        INSERT INTO chat_sessions (id, tenant_id, customer_id, customer_email, status, message_count, last_message_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    "#;

    /// Get a chat session by ID
    pub const GET_SESSION: &str = r#"
        SELECT id, tenant_id, customer_id, customer_email, status, message_count, last_message_at, created_at, updated_at
        FROM chat_sessions WHERE tenant_id = $1 AND id = $2
    "#;

    /// Update session message count and last_message_at
    pub const UPDATE_SESSION: &str = r#"
        UPDATE chat_sessions
        SET message_count = $3, last_message_at = $4, updated_at = $5
        WHERE tenant_id = $1 AND id = $2
    "#;

    /// List sessions with optional filters, returns count
    pub const LIST_SESSIONS: &str = r#"
        SELECT id, tenant_id, customer_id, customer_email, status, message_count, last_message_at, created_at, updated_at
        FROM chat_sessions
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR customer_id = $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY last_message_at DESC
        LIMIT $4 OFFSET $5
    "#;

    /// Count sessions for pagination
    pub const COUNT_SESSIONS: &str = r#"
        SELECT COUNT(*) as count
        FROM chat_sessions
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR customer_id = $2)
          AND ($3::text IS NULL OR status = $3)
    "#;

    /// Insert a new chat message
    pub const INSERT_MESSAGE: &str = r#"
        INSERT INTO chat_messages (id, tenant_id, session_id, role, content, tool_calls, tool_results, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    "#;

    /// List messages for a session (chronological order)
    pub const LIST_MESSAGES: &str = r#"
        SELECT id, tenant_id, session_id, role, content, tool_calls, tool_results, created_at
        FROM chat_messages
        WHERE tenant_id = $1 AND session_id = $2
        ORDER BY created_at ASC
        LIMIT $3 OFFSET $4
    "#;
}

/// FAQ/knowledge base queries
/// Per spec (08-storage.md): All queries must include tenant_id for multi-tenant isolation
pub mod faq {
    /// Insert a new FAQ
    pub const INSERT: &str = r#"
        INSERT INTO faqs (id, tenant_id, question, answer, keywords, active, use_in_chat, display_on_page, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    "#;

    /// Get a FAQ by ID
    pub const GET_BY_ID: &str = r#"
        SELECT id, tenant_id, question, answer, keywords, active, use_in_chat, display_on_page, created_at, updated_at
        FROM faqs WHERE tenant_id = $1 AND id = $2
    "#;

    /// Update a FAQ
    pub const UPDATE: &str = r#"
        UPDATE faqs
        SET question = $3, answer = $4, keywords = $5, active = $6, use_in_chat = $7, display_on_page = $8, updated_at = $9
        WHERE tenant_id = $1 AND id = $2
    "#;

    /// Delete a FAQ
    pub const DELETE: &str = r#"
        DELETE FROM faqs WHERE tenant_id = $1 AND id = $2
    "#;

    /// List FAQs with optional active filter
    pub const LIST: &str = r#"
        SELECT id, tenant_id, question, answer, keywords, active, use_in_chat, display_on_page, created_at, updated_at
        FROM faqs
        WHERE tenant_id = $1 AND ($2::boolean IS NULL OR active = $2)
        ORDER BY updated_at DESC
        LIMIT $3 OFFSET $4
    "#;

    /// Count FAQs for pagination
    pub const COUNT: &str = r#"
        SELECT COUNT(*) as count
        FROM faqs
        WHERE tenant_id = $1 AND ($2::boolean IS NULL OR active = $2)
    "#;

    /// Search FAQs by keyword array or full-text search (for chat AI)
    pub const SEARCH: &str = r#"
        SELECT id, tenant_id, question, answer, keywords, active, use_in_chat, display_on_page, created_at, updated_at
        FROM faqs
        WHERE tenant_id = $1
          AND active = true
          AND use_in_chat = true
          AND (
            keywords && $2::text[]
            OR to_tsvector('english', question || ' ' || answer) @@ plainto_tsquery('english', $3)
          )
        ORDER BY
          CASE WHEN keywords && $2::text[] THEN 0 ELSE 1 END,
          ts_rank(to_tsvector('english', question || ' ' || answer), plainto_tsquery('english', $3)) DESC
        LIMIT $4
    "#;

    /// List FAQs for public display (active + display_on_page)
    pub const LIST_PUBLIC: &str = r#"
        SELECT id, tenant_id, question, answer, keywords, active, use_in_chat, display_on_page, created_at, updated_at
        FROM faqs
        WHERE tenant_id = $1
          AND active = true
          AND display_on_page = true
        ORDER BY updated_at DESC
        LIMIT $2 OFFSET $3
    "#;

    /// Count public FAQs
    pub const COUNT_PUBLIC: &str = r#"
        SELECT COUNT(*) as count
        FROM faqs
        WHERE tenant_id = $1
          AND active = true
          AND display_on_page = true
    "#;
}

#[cfg(test)]
mod tests {
    use super::{cart, credits_hold, orders, payment, refund, subscription, webhook};

    #[test]
    fn test_cart_upsert_uses_tenant_id_conflict() {
        assert!(cart::INSERT.contains("ON CONFLICT (tenant_id, id)"));
    }

    #[test]
    fn test_refund_upsert_uses_tenant_id_conflict() {
        assert!(refund::INSERT.contains("ON CONFLICT (tenant_id, id)"));
    }

    #[test]
    fn test_subscription_upsert_uses_tenant_id_conflict() {
        assert!(subscription::INSERT.contains("ON CONFLICT (tenant_id, id)"));
    }

    #[test]
    fn test_payment_upsert_uses_tenant_id_conflict() {
        assert!(payment::INSERT.contains("ON CONFLICT (tenant_id, signature)"));
    }

    #[test]
    fn test_webhook_insert_is_idempotent_on_duplicate_id() {
        assert!(webhook::INSERT.contains("ON CONFLICT (id) DO NOTHING"));
    }

    #[test]
    fn test_credits_hold_upsert_does_not_overwrite_on_conflict() {
        assert!(credits_hold::UPSERT.contains("ON CONFLICT (tenant_id, hold_id) DO NOTHING"));
    }

    #[test]
    fn test_credits_hold_update_expires_at_is_scoped_to_binding() {
        let q = credits_hold::UPDATE_EXPIRES_AT_IF_MATCH;
        for needle in [
            "tenant_id = $1",
            "hold_id = $2",
            "user_id = $3",
            "resource_id = $4",
            "amount = $5",
            "amount_asset = $6",
        ] {
            assert!(q.contains(needle), "missing condition: {needle}");
        }
    }

    #[test]
    fn test_orders_filtered_search_uses_ilike() {
        let q = orders::LIST_FILTERED;
        for needle in [
            "id ILIKE $3",
            "purchase_id ILIKE $3",
            "customer_email ILIKE $3",
        ] {
            assert!(q.contains(needle), "missing search predicate: {needle}");
        }
    }

    #[test]
    fn test_subscription_update_status_batch_is_tenant_isolated() {
        assert!(subscription::UPDATE_STATUS_BATCH.contains("tenant_id = $1"));
        assert!(subscription::UPDATE_STATUS_BATCH.contains("ANY($2"));
    }

    #[test]
    fn test_subscription_list_expiring_local_is_limited_and_filtered() {
        assert!(subscription::LIST_EXPIRING_LOCAL_LIMITED.contains("LIMIT $3"));
        assert!(subscription::LIST_EXPIRING_LOCAL_LIMITED.contains("payment_method IN"));
        assert!(subscription::LIST_EXPIRING_LOCAL_LIMITED.contains("status = 'active'"));
    }
}

/// Dead Letter Queue queries
pub mod dlq {
    /// Per spec (20-webhooks.md): INSERT must include tenant_id for multi-tenancy
    pub const INSERT: &str = r#"
        INSERT INTO webhook_dlq (
            id, tenant_id, original_webhook_id, url, payload, payload_bytes, headers, event_type,
            final_error, total_attempts, first_attempt_at, last_attempt_at, moved_to_dlq_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    "#;

    pub const LIST: &str = r#"
        SELECT id, tenant_id, original_webhook_id, url, payload, payload_bytes, headers, event_type,
               final_error, total_attempts, first_attempt_at, last_attempt_at, moved_to_dlq_at
        FROM webhook_dlq
        WHERE tenant_id = $1
        ORDER BY moved_to_dlq_at DESC
        LIMIT $2
    "#;

    pub const GET_BY_ID: &str = r#"
        SELECT id, tenant_id, original_webhook_id, url, payload, payload_bytes, headers, event_type,
               final_error, total_attempts, first_attempt_at, last_attempt_at, moved_to_dlq_at
        FROM webhook_dlq WHERE id = $1
    "#;

    pub const DELETE: &str = r#"
        DELETE FROM webhook_dlq WHERE id = $1
    "#;

    pub const DELETE_WEBHOOK: &str = r#"
        DELETE FROM webhook_queue WHERE id = $1
    "#;
}
