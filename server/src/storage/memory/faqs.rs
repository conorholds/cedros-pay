use super::*;

pub(super) async fn create_faq(store: &InMemoryStore, faq: Faq) -> StorageResult<()> {
    let key = tenant_key(&faq.tenant_id, &faq.id);
    store.faqs.lock().insert(key, faq);
    Ok(())
}

pub(super) async fn get_faq(
    store: &InMemoryStore,
    tenant_id: &str,
    faq_id: &str,
) -> StorageResult<Option<Faq>> {
    let key = tenant_key(tenant_id, faq_id);
    Ok(store.faqs.lock().get(&key).cloned())
}

pub(super) async fn update_faq(store: &InMemoryStore, faq: Faq) -> StorageResult<()> {
    let key = tenant_key(&faq.tenant_id, &faq.id);
    store.faqs.lock().insert(key, faq);
    Ok(())
}

pub(super) async fn delete_faq(
    store: &InMemoryStore,
    tenant_id: &str,
    faq_id: &str,
) -> StorageResult<()> {
    let key = tenant_key(tenant_id, faq_id);
    store.faqs.lock().remove(&key);
    Ok(())
}

pub(super) async fn list_faqs(
    store: &InMemoryStore,
    tenant_id: &str,
    active_only: bool,
    limit: i32,
    offset: i32,
) -> StorageResult<(Vec<Faq>, i64)> {
    let faqs = store.faqs.lock();
    let mut filtered: Vec<Faq> = faqs
        .values()
        .filter(|f| f.tenant_id == tenant_id)
        .filter(|f| !active_only || f.active)
        .cloned()
        .collect();

    // Sort by updated_at DESC
    filtered.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    let total = filtered.len() as i64;
    let result: Vec<Faq> = filtered
        .into_iter()
        .skip(offset as usize)
        .take(limit as usize)
        .collect();

    Ok((result, total))
}

pub(super) async fn search_faqs(
    store: &InMemoryStore,
    tenant_id: &str,
    query: &str,
    limit: i32,
) -> StorageResult<Vec<Faq>> {
    let faqs = store.faqs.lock();
    let query_lower = query.to_lowercase();
    let keywords: Vec<&str> = query_lower.split_whitespace().collect();

    let mut matches: Vec<(Faq, i32)> = faqs
        .values()
        .filter(|f| f.tenant_id == tenant_id && f.active && f.use_in_chat)
        .map(|f| {
            let mut score = 0i32;
            let q_lower = f.question.to_lowercase();
            let a_lower = f.answer.to_lowercase();

            // Check keywords
            for kw in &keywords {
                if f.keywords.iter().any(|k| k.to_lowercase().contains(kw)) {
                    score += 10;
                }
                if q_lower.contains(kw) {
                    score += 5;
                }
                if a_lower.contains(kw) {
                    score += 2;
                }
            }
            (f.clone(), score)
        })
        .filter(|(_, score)| *score > 0)
        .collect();

    matches.sort_by(|a, b| b.1.cmp(&a.1));

    Ok(matches
        .into_iter()
        .take(limit as usize)
        .map(|(f, _)| f)
        .collect())
}

pub(super) async fn list_public_faqs(
    store: &InMemoryStore,
    tenant_id: &str,
    limit: i32,
    offset: i32,
) -> StorageResult<(Vec<Faq>, i64)> {
    let faqs = store.faqs.lock();
    let mut filtered: Vec<Faq> = faqs
        .values()
        .filter(|f| f.tenant_id == tenant_id && f.active && f.display_on_page)
        .cloned()
        .collect();

    // Sort by updated_at DESC
    filtered.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    let total = filtered.len() as i64;
    let result: Vec<Faq> = filtered
        .into_iter()
        .skip(offset as usize)
        .take(limit as usize)
        .collect();

    Ok((result, total))
}
