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
    let tokenization_config_json: Option<serde_json::Value> = collection
        .tokenization_config
        .as_ref()
        .map(serde_json::to_value)
        .transpose()
        .map_err(|e| StorageError::internal("serialize tokenization_config", e))?;
    let query = store.orders_query(queries::collections::INSERT);
    sqlx::query(&query)
        .bind(&collection.id)
        .bind(&collection.tenant_id)
        .bind(&collection.name)
        .bind(&collection.description)
        .bind(&product_ids_json)
        .bind(collection.active)
        .bind(&tokenization_config_json)
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
    let tokenization_config_json: Option<serde_json::Value> = collection
        .tokenization_config
        .as_ref()
        .map(serde_json::to_value)
        .transpose()
        .map_err(|e| StorageError::internal("serialize tokenization_config", e))?;
    let query = store.orders_query(queries::collections::UPDATE);
    let result = sqlx::query(&query)
        .bind(&collection.tenant_id)
        .bind(&collection.id)
        .bind(&collection.name)
        .bind(&collection.description)
        .bind(&product_ids_json)
        .bind(collection.active)
        .bind(&tokenization_config_json)
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

// ─── Gift card redemptions ──────────────────────────────────────────────────

/// Map a 15-column tuple from gift_card_redemptions into a `GiftCardRedemption`.
fn row_to_redemption(
    r: (
        String,
        String,
        String,
        String,
        String,
        String,
        i64,
        String,
        i64,
        bool,
        Option<String>,
        chrono::DateTime<chrono::Utc>,
        Option<String>,
        bool,
        Option<String>,
    ),
) -> GiftCardRedemption {
    GiftCardRedemption {
        id: r.0,
        tenant_id: r.1,
        order_id: r.2,
        product_id: r.3,
        buyer_user_id: r.4,
        recipient_user_id: r.5,
        face_value_cents: r.6,
        currency: r.7,
        credits_issued: r.8,
        token_minted: r.9,
        token_mint_signature: r.10,
        created_at: r.11,
        redemption_token: r.12,
        claimed: r.13,
        recipient_email: r.14,
        last_activity_at: None, // Not selected in listing queries; populated by escheatment queries
    }
}

pub(in super::super) async fn record_gift_card_redemption(
    store: &PostgresStore,
    r: GiftCardRedemption,
) -> StorageResult<()> {
    sqlx::query(
        r#"INSERT INTO gift_card_redemptions (
            id, tenant_id, order_id, product_id, buyer_user_id, recipient_user_id,
            face_value_cents, currency, credits_issued, token_minted, token_mint_signature,
            created_at, redemption_token, claimed, recipient_email
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)"#,
    )
    .bind(&r.id)
    .bind(&r.tenant_id)
    .bind(&r.order_id)
    .bind(&r.product_id)
    .bind(&r.buyer_user_id)
    .bind(&r.recipient_user_id)
    .bind(r.face_value_cents)
    .bind(&r.currency)
    .bind(r.credits_issued)
    .bind(r.token_minted)
    .bind(&r.token_mint_signature)
    .bind(r.created_at)
    .bind(&r.redemption_token)
    .bind(r.claimed)
    .bind(&r.recipient_email)
    .execute(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("insert gift card redemption", e))?;
    Ok(())
}

pub(in super::super) async fn list_gift_card_redemptions(
    store: &PostgresStore,
    tenant_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<GiftCardRedemption>> {
    let rows = sqlx::query_as::<
        _,
        (
            String,
            String,
            String,
            String,
            String,
            String,
            i64,
            String,
            i64,
            bool,
            Option<String>,
            chrono::DateTime<chrono::Utc>,
            Option<String>,
            bool,
            Option<String>,
        ),
    >(
        r#"SELECT id, tenant_id, order_id, product_id, buyer_user_id, recipient_user_id,
            face_value_cents, currency, credits_issued, token_minted, token_mint_signature,
            created_at, redemption_token, claimed, recipient_email
        FROM gift_card_redemptions
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3"#,
    )
    .bind(tenant_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("list gift card redemptions", e))?;

    Ok(rows.into_iter().map(row_to_redemption).collect())
}

pub(in super::super) async fn get_gift_card_redemption_by_token(
    store: &PostgresStore,
    token: &str,
) -> StorageResult<Option<GiftCardRedemption>> {
    let row = sqlx::query_as::<
        _,
        (
            String,
            String,
            String,
            String,
            String,
            String,
            i64,
            String,
            i64,
            bool,
            Option<String>,
            chrono::DateTime<chrono::Utc>,
            Option<String>,
            bool,
            Option<String>,
        ),
    >(
        r#"SELECT id, tenant_id, order_id, product_id, buyer_user_id, recipient_user_id,
            face_value_cents, currency, credits_issued, token_minted, token_mint_signature,
            created_at, redemption_token, claimed, recipient_email
        FROM gift_card_redemptions
        WHERE redemption_token = $1"#,
    )
    .bind(token)
    .fetch_optional(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("get gift card redemption by token", e))?;

    Ok(row.map(row_to_redemption))
}

pub(in super::super) async fn claim_gift_card_redemption(
    store: &PostgresStore,
    id: &str,
    recipient_user_id: &str,
    credits_issued: i64,
) -> StorageResult<()> {
    let result = sqlx::query(
        r#"UPDATE gift_card_redemptions
        SET claimed = TRUE, recipient_user_id = $1, credits_issued = $2, redemption_token = NULL
        WHERE id = $3 AND claimed = FALSE"#,
    )
    .bind(recipient_user_id)
    .bind(credits_issued)
    .bind(id)
    .execute(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("claim gift card redemption", e))?;

    if result.rows_affected() == 0 {
        return Err(StorageError::Conflict);
    }
    Ok(())
}

// ─── Tenant Token-22 mints ──────────────────────────────────────────────────

pub(in super::super) async fn get_tenant_token22_mint(
    store: &PostgresStore,
    tenant_id: &str,
) -> StorageResult<Option<TenantToken22Mint>> {
    let row = sqlx::query_as::<_, (String, Option<String>, String, String, i32, i64, String, String, i16, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        r#"SELECT tenant_id, collection_id, mint_address, mint_authority, transfer_fee_bps, max_transfer_fee,
            treasury_address, token_symbol, token_decimals, created_at, updated_at
        FROM tenant_token22_mints
        WHERE tenant_id = $1 AND collection_id IS NULL"#,
    )
    .bind(tenant_id)
    .fetch_optional(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("get tenant token22 mint", e))?;

    Ok(row.map(|r| TenantToken22Mint {
        tenant_id: r.0,
        collection_id: r.1,
        mint_address: r.2,
        mint_authority: r.3,
        transfer_fee_bps: r.4,
        max_transfer_fee: r.5,
        treasury_address: r.6,
        token_symbol: r.7,
        token_decimals: r.8,
        created_at: r.9,
        updated_at: r.10,
    }))
}

pub(in super::super) async fn upsert_tenant_token22_mint(
    store: &PostgresStore,
    mint: TenantToken22Mint,
) -> StorageResult<()> {
    sqlx::query(
        r#"INSERT INTO tenant_token22_mints (
            tenant_id, collection_id, mint_address, mint_authority, transfer_fee_bps, max_transfer_fee,
            treasury_address, token_symbol, token_decimals, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (tenant_id, COALESCE(collection_id, '__gift_card__')) DO UPDATE SET
            mint_address = EXCLUDED.mint_address,
            mint_authority = EXCLUDED.mint_authority,
            transfer_fee_bps = EXCLUDED.transfer_fee_bps,
            max_transfer_fee = EXCLUDED.max_transfer_fee,
            treasury_address = EXCLUDED.treasury_address,
            token_symbol = EXCLUDED.token_symbol,
            token_decimals = EXCLUDED.token_decimals,
            updated_at = EXCLUDED.updated_at"#,
    )
    .bind(&mint.tenant_id)
    .bind(&mint.collection_id)
    .bind(&mint.mint_address)
    .bind(&mint.mint_authority)
    .bind(mint.transfer_fee_bps)
    .bind(mint.max_transfer_fee)
    .bind(&mint.treasury_address)
    .bind(&mint.token_symbol)
    .bind(mint.token_decimals)
    .bind(mint.created_at)
    .bind(mint.updated_at)
    .execute(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("upsert tenant token22 mint", e))?;
    Ok(())
}

// ─── Token-22 mints for asset class collections ─────────────────────────────

pub(in super::super) async fn get_token22_mint_for_collection(
    store: &PostgresStore,
    tenant_id: &str,
    collection_id: &str,
) -> StorageResult<Option<TenantToken22Mint>> {
    let row = sqlx::query_as::<_, (String, Option<String>, String, String, i32, i64, String, String, i16, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>)>(
        r#"SELECT tenant_id, collection_id, mint_address, mint_authority, transfer_fee_bps, max_transfer_fee,
            treasury_address, token_symbol, token_decimals, created_at, updated_at
        FROM tenant_token22_mints
        WHERE tenant_id = $1 AND collection_id = $2"#,
    )
    .bind(tenant_id)
    .bind(collection_id)
    .fetch_optional(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("get token22 mint for collection", e))?;

    Ok(row.map(|r| TenantToken22Mint {
        tenant_id: r.0,
        collection_id: r.1,
        mint_address: r.2,
        mint_authority: r.3,
        transfer_fee_bps: r.4,
        max_transfer_fee: r.5,
        treasury_address: r.6,
        token_symbol: r.7,
        token_decimals: r.8,
        created_at: r.9,
        updated_at: r.10,
    }))
}

pub(in super::super) async fn upsert_token22_mint_for_collection(
    store: &PostgresStore,
    mint: TenantToken22Mint,
) -> StorageResult<()> {
    sqlx::query(
        r#"INSERT INTO tenant_token22_mints (
            tenant_id, collection_id, mint_address, mint_authority, transfer_fee_bps, max_transfer_fee,
            treasury_address, token_symbol, token_decimals, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (tenant_id, COALESCE(collection_id, '__gift_card__')) DO UPDATE SET
            mint_address = EXCLUDED.mint_address,
            mint_authority = EXCLUDED.mint_authority,
            transfer_fee_bps = EXCLUDED.transfer_fee_bps,
            max_transfer_fee = EXCLUDED.max_transfer_fee,
            treasury_address = EXCLUDED.treasury_address,
            token_symbol = EXCLUDED.token_symbol,
            token_decimals = EXCLUDED.token_decimals,
            updated_at = EXCLUDED.updated_at"#,
    )
    .bind(&mint.tenant_id)
    .bind(&mint.collection_id)
    .bind(&mint.mint_address)
    .bind(&mint.mint_authority)
    .bind(mint.transfer_fee_bps)
    .bind(mint.max_transfer_fee)
    .bind(&mint.treasury_address)
    .bind(&mint.token_symbol)
    .bind(mint.token_decimals)
    .bind(mint.created_at)
    .bind(mint.updated_at)
    .execute(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("upsert token22 mint for collection", e))?;
    Ok(())
}

// ─── Asset redemptions ──────────────────────────────────────────────────────

pub(in super::super) async fn record_asset_redemption(
    store: &PostgresStore,
    r: AssetRedemption,
) -> StorageResult<()> {
    sqlx::query(
        r#"INSERT INTO asset_redemptions (
            id, tenant_id, order_id, product_id, collection_id, user_id,
            status, form_data, admin_notes, token_mint_signature, token_burn_signature,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)"#,
    )
    .bind(&r.id)
    .bind(&r.tenant_id)
    .bind(&r.order_id)
    .bind(&r.product_id)
    .bind(&r.collection_id)
    .bind(&r.user_id)
    .bind(
        serde_json::to_value(&r.status)
            .unwrap_or_default()
            .as_str()
            .unwrap_or("pending_info"),
    )
    .bind(&r.form_data)
    .bind(&r.admin_notes)
    .bind(&r.token_mint_signature)
    .bind(&r.token_burn_signature)
    .bind(r.created_at)
    .bind(r.updated_at)
    .execute(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("record asset redemption", e))?;
    Ok(())
}

pub(in super::super) async fn get_asset_redemption(
    store: &PostgresStore,
    tenant_id: &str,
    id: &str,
) -> StorageResult<Option<AssetRedemption>> {
    let row = sqlx::query(
        r#"SELECT id, tenant_id, order_id, product_id, collection_id, user_id,
            status, form_data, admin_notes, token_mint_signature, token_burn_signature,
            created_at, updated_at
        FROM asset_redemptions
        WHERE tenant_id = $1 AND id = $2"#,
    )
    .bind(tenant_id)
    .bind(id)
    .fetch_optional(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("get asset redemption", e))?;

    Ok(row.map(|r| parse_asset_redemption_row(&r)))
}

pub(in super::super) async fn list_asset_redemptions(
    store: &PostgresStore,
    tenant_id: &str,
    status: Option<&str>,
    collection_id: Option<&str>,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<AssetRedemption>> {
    let rows = sqlx::query(
        r#"SELECT id, tenant_id, order_id, product_id, collection_id, user_id,
            status, form_data, admin_notes, token_mint_signature, token_burn_signature,
            created_at, updated_at
        FROM asset_redemptions
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR collection_id = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5"#,
    )
    .bind(tenant_id)
    .bind(status)
    .bind(collection_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("list asset redemptions", e))?;

    Ok(rows.iter().map(parse_asset_redemption_row).collect())
}

pub(in super::super) async fn update_asset_redemption_status(
    store: &PostgresStore,
    tenant_id: &str,
    id: &str,
    status: &str,
    admin_notes: Option<&str>,
) -> StorageResult<()> {
    let result = sqlx::query(
        r#"UPDATE asset_redemptions
        SET status = $3, admin_notes = COALESCE($4, admin_notes), updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2"#,
    )
    .bind(tenant_id)
    .bind(id)
    .bind(status)
    .bind(admin_notes)
    .execute(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("update asset redemption status", e))?;

    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(in super::super) async fn update_asset_redemption_form_data(
    store: &PostgresStore,
    tenant_id: &str,
    id: &str,
    form_data: &serde_json::Value,
) -> StorageResult<()> {
    let result = sqlx::query(
        r#"UPDATE asset_redemptions
        SET form_data = $3, status = 'info_submitted', updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2"#,
    )
    .bind(tenant_id)
    .bind(id)
    .bind(form_data)
    .execute(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("update asset redemption form data", e))?;

    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

pub(in super::super) async fn record_token_burn_signature(
    store: &PostgresStore,
    tenant_id: &str,
    id: &str,
    signature: &str,
) -> StorageResult<()> {
    let result = sqlx::query(
        r#"UPDATE asset_redemptions
        SET token_burn_signature = $3, updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2"#,
    )
    .bind(tenant_id)
    .bind(id)
    .bind(signature)
    .execute(store.pool.inner())
    .await
    .map_err(|e| StorageError::internal("record token burn signature", e))?;

    if result.rows_affected() == 0 {
        return Err(StorageError::NotFound);
    }
    Ok(())
}

fn parse_asset_redemption_row(row: &sqlx::postgres::PgRow) -> AssetRedemption {
    use sqlx::Row;
    let status_str: String = row.get("status");
    let status = serde_json::from_value(serde_json::Value::String(status_str))
        .unwrap_or(crate::models::AssetRedemptionStatus::PendingInfo);

    AssetRedemption {
        id: row.get("id"),
        tenant_id: row.get("tenant_id"),
        order_id: row.get("order_id"),
        product_id: row.get("product_id"),
        collection_id: row.get("collection_id"),
        user_id: row.get("user_id"),
        status,
        form_data: row.get("form_data"),
        admin_notes: row.get("admin_notes"),
        token_mint_signature: row.get("token_mint_signature"),
        token_burn_signature: row.get("token_burn_signature"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}
