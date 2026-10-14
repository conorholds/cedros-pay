//! Bounded collection reads shared by projections and authoritative lookups.

use std::collections::{BTreeMap, BTreeSet};

use super::{Db, Dir, EntryRecord, Query};
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

impl<S: HostSeams> Db<'_, S> {
    /// Missing keys are absent from the result. Empty input performs no IO.
    pub fn read_keys(
        &self,
        model: &str,
        keys: &[String],
    ) -> AppResult<BTreeMap<String, EntryRecord>> {
        let unique: Vec<_> = keys
            .iter()
            .cloned()
            .collect::<BTreeSet<_>>()
            .into_iter()
            .collect();
        let mut records = BTreeMap::new();
        for chunk in unique.chunks(100) {
            let query = Query {
                entry_keys: chunk.to_vec(),
                limit: Some(chunk.len() as i64),
                ..Query::new()
            };
            for record in self.read(model, &query)? {
                if chunk.binary_search(&record.entry_key).is_err()
                    || records.contains_key(&record.entry_key)
                {
                    return Err(AppError::internal(
                        "keyed read returned an unexpected or duplicate entry",
                    ));
                }
                records.insert(record.entry_key.clone(), record);
            }
        }
        Ok(records)
    }

    /// Consume each page before fetching the next. Callers that mutate the
    /// scanned collection must still snapshot first to avoid offset skips.
    pub fn for_each_page(
        &self,
        model: &str,
        base: &Query,
        page_size: i64,
        max_pages: usize,
        mut consume: impl FnMut(Vec<EntryRecord>) -> AppResult<()>,
    ) -> AppResult<()> {
        if page_size <= 0 {
            return Err(AppError::internal("page size must be positive"));
        }
        let mut query = base.clone();
        if query.order_by.is_none() {
            query = query.order("createdAt", Dir::Asc);
        }
        query.limit = Some(page_size);
        for page in 0..max_pages {
            query.offset = Some(
                i64::try_from(page)
                    .ok()
                    .and_then(|page| page.checked_mul(page_size))
                    .ok_or_else(|| AppError::internal("page offset overflowed"))?,
            );
            let batch = self.read(model, &query)?;
            let count = batch.len();
            if count > page_size as usize {
                return Err(AppError::internal("database exceeded requested page size"));
            }
            consume(batch)?;
            if count < page_size as usize {
                break;
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{fake::FakeSeams, ids};
    use serde_json::json;

    #[test]
    fn keyed_reads_chunk_deduplicate_and_preserve_missing_keys() {
        let s = FakeSeams::new();
        let mut keys = Vec::new();
        for i in 0..205 {
            let key = format!("p{i:04}");
            s.seed(ids::MODEL_CATALOG, &key, json!({"id": key}));
            keys.push(key);
        }
        keys.push(keys[0].clone());
        keys.push("missing".into());
        let db = Db::new(&s, ids::DB_ACCESS);
        assert_eq!(db.read_keys(ids::MODEL_CATALOG, &keys).unwrap().len(), 205);
        assert_eq!(s.db_reads.borrow()[ids::MODEL_CATALOG].0, 3);
        assert!(db.read_keys(ids::MODEL_CATALOG, &[]).unwrap().is_empty());
        assert_eq!(s.db_reads.borrow()[ids::MODEL_CATALOG].0, 3);
    }

    #[test]
    fn keyed_reads_reject_ambiguous_host_results_and_propagate_errors() {
        for entries in [
            json!([{"entryKey":"other","payload":{}}]),
            json!([{"entryKey":"a","payload":{}},{"entryKey":"a","payload":{}}]),
        ] {
            let s = FakeSeams::new();
            s.read_responses
                .borrow_mut()
                .push_back(Ok(json!({"entries": entries}).to_string()));
            assert!(Db::new(&s, ids::DB_ACCESS)
                .read_keys(ids::MODEL_CATALOG, &["a".into()])
                .is_err());
        }
        let s = FakeSeams::new();
        s.read_responses
            .borrow_mut()
            .push_back(Err(crate::HostError::new("offline")));
        assert!(Db::new(&s, ids::DB_ACCESS)
            .read_keys(ids::MODEL_CATALOG, &["a".into()])
            .is_err());
    }

    #[test]
    fn page_consumer_failure_stops_before_next_read() {
        let s = FakeSeams::new();
        for key in ["a", "b"] {
            s.seed(
                ids::MODEL_CATALOG,
                key,
                json!({"createdAt":"2026-01-01T00:00:00Z"}),
            );
        }
        let db = Db::new(&s, ids::DB_ACCESS);
        assert!(db
            .for_each_page(ids::MODEL_CATALOG, &Query::new(), 1, 3, |_| Err(
                AppError::internal("consumer failed")
            ))
            .is_err());
        assert_eq!(s.db_reads.borrow()[ids::MODEL_CATALOG].0, 1);
        assert!(db
            .for_each_page(ids::MODEL_CATALOG, &Query::new(), 0, 3, |_| Ok(()))
            .is_err());
    }
}
