use super::*;

pub(super) async fn create_chat_session(
    store: &InMemoryStore,
    session: ChatSession,
) -> StorageResult<()> {
    let key = tenant_key(&session.tenant_id, &session.id);
    store.chat_sessions.lock().insert(key, session);
    Ok(())
}

pub(super) async fn get_chat_session(
    store: &InMemoryStore,
    tenant_id: &str,
    session_id: &str,
) -> StorageResult<Option<ChatSession>> {
    let key = tenant_key(tenant_id, session_id);
    Ok(store.chat_sessions.lock().get(&key).cloned())
}

pub(super) async fn update_chat_session(
    store: &InMemoryStore,
    tenant_id: &str,
    session_id: &str,
    message_count: i32,
    last_message_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
) -> StorageResult<()> {
    let key = tenant_key(tenant_id, session_id);
    if let Some(session) = store.chat_sessions.lock().get_mut(&key) {
        session.message_count = message_count;
        session.last_message_at = last_message_at;
        session.updated_at = updated_at;
    }
    Ok(())
}

pub(super) async fn list_chat_sessions(
    store: &InMemoryStore,
    tenant_id: &str,
    customer_id: Option<&str>,
    status: Option<&str>,
    limit: i32,
    offset: i32,
) -> StorageResult<(Vec<ChatSession>, i64)> {
    let sessions = store.chat_sessions.lock();
    let mut filtered: Vec<ChatSession> = sessions
        .values()
        .filter(|s| s.tenant_id == tenant_id)
        .filter(|s| customer_id.map_or(true, |cid| s.customer_id.as_deref() == Some(cid)))
        .filter(|s| status.map_or(true, |st| s.status == st))
        .cloned()
        .collect();

    // Sort by last_message_at DESC
    filtered.sort_by(|a, b| b.last_message_at.cmp(&a.last_message_at));

    let total = filtered.len() as i64;
    let result: Vec<ChatSession> = filtered
        .into_iter()
        .skip(offset as usize)
        .take(limit as usize)
        .collect();

    Ok((result, total))
}

pub(super) async fn create_chat_message(
    store: &InMemoryStore,
    message: ChatMessage,
) -> StorageResult<()> {
    let key = tenant_key(&message.tenant_id, &message.id);
    store.chat_messages.lock().insert(key, message);
    Ok(())
}

pub(super) async fn list_chat_messages(
    store: &InMemoryStore,
    tenant_id: &str,
    session_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<Vec<ChatMessage>> {
    let messages = store.chat_messages.lock();
    let mut filtered: Vec<ChatMessage> = messages
        .values()
        .filter(|m| m.tenant_id == tenant_id && m.session_id == session_id)
        .cloned()
        .collect();

    // Sort by created_at ASC (chronological)
    filtered.sort_by(|a, b| a.created_at.cmp(&b.created_at));

    Ok(filtered
        .into_iter()
        .skip(offset as usize)
        .take(limit as usize)
        .collect())
}
