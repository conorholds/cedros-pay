//! Chat session, chat message, and FAQ storage methods

use super::*;

// ─── Chat sessions ───────────────────────────────────────────────────────────

pub(super) async fn create_chat_session(
    store: &PostgresStore,
    session: ChatSession,
) -> StorageResult<()> {
    sqlx::query(queries::chat::INSERT_SESSION)
        .bind(&session.id)
        .bind(&session.tenant_id)
        .bind(&session.customer_id)
        .bind(&session.customer_email)
        .bind(&session.status)
        .bind(session.message_count)
        .bind(session.last_message_at)
        .bind(session.created_at)
        .bind(session.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("create chat session", e))?;
    Ok(())
}

pub(super) async fn get_chat_session(
    store: &PostgresStore,
    tenant_id: &str,
    session_id: &str,
) -> StorageResult<Option<ChatSession>> {
    let row = sqlx::query(queries::chat::GET_SESSION)
        .bind(tenant_id)
        .bind(session_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get chat session", e))?;

    match row {
        Some(r) => Ok(Some(parse_chat_session(r)?)),
        None => Ok(None),
    }
}

pub(super) async fn update_chat_session(
    store: &PostgresStore,
    tenant_id: &str,
    session_id: &str,
    message_count: i32,
    last_message_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
) -> StorageResult<()> {
    sqlx::query(queries::chat::UPDATE_SESSION)
        .bind(tenant_id)
        .bind(session_id)
        .bind(message_count)
        .bind(last_message_at)
        .bind(updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("update chat session", e))?;
    Ok(())
}

pub(super) async fn list_chat_sessions(
    store: &PostgresStore,
    tenant_id: &str,
    customer_id: Option<&str>,
    status: Option<&str>,
    limit: i32,
    offset: i32,
) -> StorageResult<(Vec<ChatSession>, i64)> {
    let rows = sqlx::query(queries::chat::LIST_SESSIONS)
        .bind(tenant_id)
        .bind(customer_id)
        .bind(status)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list chat sessions", e))?;

    let sessions: Vec<ChatSession> = rows
        .into_iter()
        .map(parse_chat_session)
        .collect::<StorageResult<Vec<_>>>()?;

    let count_row = sqlx::query(queries::chat::COUNT_SESSIONS)
        .bind(tenant_id)
        .bind(customer_id)
        .bind(status)
        .fetch_one(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("count chat sessions", e))?;

    let total: i64 = count_row.get("count");
    Ok((sessions, total))
}

// ─── Chat messages ───────────────────────────────────────────────────────────

pub(super) async fn create_chat_message(
    store: &PostgresStore,
    message: ChatMessage,
) -> StorageResult<()> {
    sqlx::query(queries::chat::INSERT_MESSAGE)
        .bind(&message.id)
        .bind(&message.tenant_id)
        .bind(&message.session_id)
        .bind(&message.role)
        .bind(&message.content)
        .bind(&message.tool_calls)
        .bind(&message.tool_results)
        .bind(message.created_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("create chat message", e))?;
    Ok(())
}

pub(super) async fn list_chat_messages(
    store: &PostgresStore,
    tenant_id: &str,
    session_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<ChatMessage>> {
    let rows = sqlx::query(queries::chat::LIST_MESSAGES)
        .bind(tenant_id)
        .bind(session_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list chat messages", e))?;

    rows.into_iter()
        .map(parse_chat_message)
        .collect::<StorageResult<Vec<_>>>()
}

// ─── FAQs ────────────────────────────────────────────────────────────────────

pub(super) async fn create_faq(store: &PostgresStore, faq: Faq) -> StorageResult<()> {
    sqlx::query(queries::faq::INSERT)
        .bind(&faq.id)
        .bind(&faq.tenant_id)
        .bind(&faq.question)
        .bind(&faq.answer)
        .bind(&faq.keywords)
        .bind(faq.active)
        .bind(faq.use_in_chat)
        .bind(faq.display_on_page)
        .bind(faq.created_at)
        .bind(faq.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("create faq", e))?;
    Ok(())
}

pub(super) async fn get_faq(
    store: &PostgresStore,
    tenant_id: &str,
    faq_id: &str,
) -> StorageResult<Option<Faq>> {
    let row = sqlx::query(queries::faq::GET_BY_ID)
        .bind(tenant_id)
        .bind(faq_id)
        .fetch_optional(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("get faq", e))?;

    match row {
        Some(r) => Ok(Some(parse_faq(r)?)),
        None => Ok(None),
    }
}

pub(super) async fn update_faq(store: &PostgresStore, faq: Faq) -> StorageResult<()> {
    sqlx::query(queries::faq::UPDATE)
        .bind(&faq.tenant_id)
        .bind(&faq.id)
        .bind(&faq.question)
        .bind(&faq.answer)
        .bind(&faq.keywords)
        .bind(faq.active)
        .bind(faq.use_in_chat)
        .bind(faq.display_on_page)
        .bind(faq.updated_at)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("update faq", e))?;
    Ok(())
}

pub(super) async fn delete_faq(
    store: &PostgresStore,
    tenant_id: &str,
    faq_id: &str,
) -> StorageResult<()> {
    sqlx::query(queries::faq::DELETE)
        .bind(tenant_id)
        .bind(faq_id)
        .execute(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("delete faq", e))?;
    Ok(())
}

pub(super) async fn list_faqs(
    store: &PostgresStore,
    tenant_id: &str,
    active_only: bool,
    limit: i32,
    offset: i32,
) -> StorageResult<(Vec<Faq>, i64)> {
    let active_filter: Option<bool> = if active_only { Some(true) } else { None };

    let rows = sqlx::query(queries::faq::LIST)
        .bind(tenant_id)
        .bind(active_filter)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list faqs", e))?;

    let faqs: Vec<Faq> = rows
        .into_iter()
        .map(parse_faq)
        .collect::<StorageResult<Vec<_>>>()?;

    let count_row = sqlx::query(queries::faq::COUNT)
        .bind(tenant_id)
        .bind(active_filter)
        .fetch_one(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("count faqs", e))?;

    let total: i64 = count_row.get("count");
    Ok((faqs, total))
}

pub(super) async fn search_faqs(
    store: &PostgresStore,
    tenant_id: &str,
    query: &str,
    limit: i32,
) -> StorageResult<Vec<Faq>> {
    // Extract keywords from query for array matching
    let keywords: Vec<String> = query
        .to_lowercase()
        .split_whitespace()
        .map(|s| s.to_string())
        .collect();

    let rows = sqlx::query(queries::faq::SEARCH)
        .bind(tenant_id)
        .bind(&keywords)
        .bind(query)
        .bind(limit)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("search faqs", e))?;

    rows.into_iter()
        .map(parse_faq)
        .collect::<StorageResult<Vec<_>>>()
}

pub(super) async fn list_public_faqs(
    store: &PostgresStore,
    tenant_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<(Vec<Faq>, i64)> {
    let rows = sqlx::query(queries::faq::LIST_PUBLIC)
        .bind(tenant_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("list public faqs", e))?;

    let faqs: Vec<Faq> = rows
        .into_iter()
        .map(parse_faq)
        .collect::<StorageResult<Vec<_>>>()?;

    let count_row = sqlx::query(queries::faq::COUNT_PUBLIC)
        .bind(tenant_id)
        .fetch_one(store.pool.inner())
        .await
        .map_err(|e| StorageError::internal("count public faqs", e))?;

    let total: i64 = count_row.get("count");
    Ok((faqs, total))
}
