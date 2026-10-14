//! Typed wrapper over the `database` seam.
//!
//! Encodes the site-database JSON contract documented by Cedros authoring guide 08:
//! read → `{entries}`, count → `{count}`, write → `{entry}`, delete →
//! `{removed}`, batch → `{applied}`. Filters/ordering use the relational read
//! surface (`eq/ne/lt/lte/gt/gte/like`, JSONB comparison; ISO-8601 strings
//! compare chronologically). Multi-record writes go through `batch` so a
//! mid-flight kill cannot leave partial state.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::error::AppError;
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::seams::HostSeams;

#[path = "db_reads.rs"]
mod reads;
pub use crate::db_ops::{BatchOp, WritePolicy};

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Op {
    Eq,
    Ne,
    Lt,
    Lte,
    Gt,
    Gte,
    Like,
}

#[derive(Debug, Clone, Serialize)]
pub struct Filter {
    pub field: String,
    pub op: Op,
    pub value: Value,
}

impl Filter {
    pub fn new(field: impl Into<String>, op: Op, value: impl Into<Value>) -> Self {
        Self {
            field: field.into(),
            op,
            value: value.into(),
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Dir {
    Asc,
    Desc,
}

#[derive(Debug, Clone, Serialize)]
pub struct Order {
    pub field: String,
    pub direction: Dir,
}

/// A read/count query. Serializes to the host payload shape (`entryKeys`,
/// `contains`, `filters`, `orderBy`, `limit`, `offset`).
#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Query {
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub entry_keys: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub contains: Option<Value>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub filters: Vec<Filter>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub order_by: Option<Order>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<i64>,
}

impl Query {
    pub fn new() -> Self {
        Self::default()
    }
    pub fn filter(mut self, f: Filter) -> Self {
        self.filters.push(f);
        self
    }
    pub fn order(mut self, field: impl Into<String>, direction: Dir) -> Self {
        self.order_by = Some(Order {
            field: field.into(),
            direction,
        });
        self
    }
    pub fn limit(mut self, n: i64) -> Self {
        self.limit = Some(n);
        self
    }
    pub fn offset(mut self, n: i64) -> Self {
        self.offset = Some(n);
        self
    }
}

/// One stored entry (mirrors the host `EntryRecord`; tolerant of snake/camel).
#[derive(Debug, Clone, Deserialize)]
pub struct EntryRecord {
    #[serde(alias = "entryKey")]
    pub entry_key: String,
    pub payload: Value,
    /// Opaque host revision token for guarded equality checks.
    #[serde(default)]
    pub version: Option<String>,
    #[serde(alias = "updatedAt", default)]
    pub updated_at: Option<String>,
}

impl EntryRecord {
    /// Deserializes this entry's payload into a domain model.
    pub fn parse<T: for<'de> Deserialize<'de>>(&self) -> Result<T, AppError> {
        serde_json::from_value(self.payload.clone()).map_err(|e| {
            AppError::internal("stored entry is malformed").with_internal(e.to_string())
        })
    }
}

/// Typed handle bound to one `databaseAccess` id.
pub struct Db<'a, S: HostSeams> {
    seams: &'a S,
    access_id: &'a str,
}

impl<'a, S: HostSeams> Db<'a, S> {
    pub fn new(seams: &'a S, access_id: &'a str) -> Self {
        Self { seams, access_id }
    }

    pub(crate) fn host(&self) -> &'a S {
        self.seams
    }

    pub fn read(&self, model: &str, query: &Query) -> Result<Vec<EntryRecord>, AppError> {
        let payload = serde_json::to_string(query).unwrap_or_else(|_| "{}".into());
        let raw = self.seams.db_read(self.access_id, model, &payload)?;
        let parsed: ReadOut = parse(&raw)?;
        Ok(parsed.entries)
    }

    /// Reads a single entry by key, if present.
    pub fn read_one(&self, model: &str, key: &str) -> Result<Option<EntryRecord>, AppError> {
        let q = Query {
            entry_keys: vec![key.to_string()],
            limit: Some(1),
            ..Default::default()
        };
        Ok(self.read(model, &q)?.into_iter().next())
    }

    /// Reads across pages of `page_size` (host default limit is 100), up to
    /// `max_pages` to stay bounded under the invocation deadline. Unordered base
    /// queries are read in deterministic `createdAt` ascending order. Use for sweeps.
    pub fn read_paged(
        &self,
        model: &str,
        base: &Query,
        page_size: i64,
        max_pages: usize,
    ) -> Result<Vec<EntryRecord>, AppError> {
        let mut all = Vec::new();
        self.for_each_page(model, base, page_size, max_pages, |page| {
            all.extend(page);
            Ok(())
        })?;
        Ok(all)
    }

    pub fn count(&self, model: &str, query: &Query) -> Result<i64, AppError> {
        let payload = serde_json::to_string(query).unwrap_or_else(|_| "{}".into());
        let raw = self.seams.db_count(self.access_id, model, &payload)?;
        let parsed: CountOut = parse(&raw)?;
        Ok(parsed.count)
    }

    pub fn write<T: Serialize>(
        &self,
        model: &str,
        key: &str,
        value: &T,
    ) -> Result<EntryRecord, AppError> {
        let data = serde_json::to_string(value)
            .map_err(|e| AppError::internal("cannot encode entry").with_internal(e.to_string()))?;
        let raw = self.seams.db_write(self.access_id, model, key, &data)?;
        let parsed: WriteOut = parse(&raw)?;
        Ok(parsed.entry)
    }

    pub fn delete(&self, model: &str, key: &str) -> Result<bool, AppError> {
        let raw = self.seams.db_delete(self.access_id, model, key)?;
        let parsed: DeleteOut = parse(&raw)?;
        Ok(parsed.removed)
    }

    /// Applies ops atomically (all commit or all roll back). Returns the count
    /// applied.
    pub fn batch(&self, ops: &[BatchOp]) -> Result<i64, AppError> {
        let ops_json: Vec<Value> = ops.iter().map(BatchOp::to_json).collect();
        let payload = json!({ "ops": ops_json }).to_string();
        let raw = self.seams.db_batch(self.access_id, &payload)?;
        let parsed: BatchOut = parse(&raw)?;
        Ok(parsed.applied)
    }

    /// Applies a schema-v1 guarded mutation through the named host CAS import.
    /// The storage-CAS capability must be bound before this is called.
    pub fn guarded_batch(
        &self,
        conditions: &[GuardedCondition],
        ops: &[BatchOp],
    ) -> Result<GuardedBatchOutcome, AppError> {
        crate::guarded_batch::execute(self.seams, self.access_id, conditions, ops)
    }

    /// Durably enrolls or releases a content model's guarded-only host policy.
    /// Call only after the concurrency capability is required and the manifest
    /// requires Cedros platform 0.1.9 or later; older v1 hosts lack this operation.
    pub fn set_write_policy(
        &self,
        model: &'static str,
        policy: WritePolicy,
    ) -> Result<(), AppError> {
        let op = BatchOp::SetWritePolicy {
            content_model_id: model,
            policy,
        };
        let applied = self.batch(&[op])?;
        if applied != 1 {
            return Err(AppError::internal(
                "database returned an invalid write-policy outcome",
            ));
        }
        Ok(())
    }

    /// Provisions a content model (idempotent).
    pub fn migrate(&self, model: &str) -> Result<(), AppError> {
        self.seams.db_migrate(self.access_id, model, "jsonb")?;
        Ok(())
    }
}

fn parse<T: for<'de> Deserialize<'de>>(raw: &str) -> Result<T, AppError> {
    serde_json::from_str(raw).map_err(|e| {
        AppError::internal("database returned an unexpected shape")
            .with_internal(format!("{e}: {raw}"))
    })
}

#[derive(Deserialize)]
struct ReadOut {
    #[serde(default)]
    entries: Vec<EntryRecord>,
}
#[derive(Deserialize)]
struct CountOut {
    #[serde(default)]
    count: i64,
}
#[derive(Deserialize)]
struct WriteOut {
    entry: EntryRecord,
}
#[derive(Deserialize)]
struct DeleteOut {
    #[serde(default)]
    removed: bool,
}
#[derive(Deserialize)]
struct BatchOut {
    #[serde(default)]
    applied: i64,
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::fake::FakeSeams;
    use crate::ids;

    fn seed_ledger_row(seams: &FakeSeams, key: &str, created_at: &str, updated_at: i64) {
        seams.set_now(updated_at);
        seams.seed(
            ids::MODEL_LEDGER,
            key,
            json!({
                "reference": key,
                "kind": "payment",
                "status": "succeeded",
                "grossCents": 100,
                "currency": "USD",
                "provider": "stripe",
                "createdAt": created_at,
                "processedAt": created_at
            }),
        );
    }

    #[test]
    fn read_paged_uses_stable_created_at_order_when_base_query_has_no_order() {
        let seams = FakeSeams::new();
        seed_ledger_row(&seams, "pay_late", "2026-03-01T00:00:00Z", 30);
        seed_ledger_row(&seams, "pay_early", "2026-01-01T00:00:00Z", 20);
        seed_ledger_row(&seams, "pay_middle", "2026-02-01T00:00:00Z", 10);

        let rows = Db::new(&seams, ids::DB_ACCESS)
            .read_paged(ids::MODEL_LEDGER, &Query::new(), 2, 3)
            .expect("paged read");
        let keys = rows
            .iter()
            .map(|row| row.entry_key.as_str())
            .collect::<Vec<_>>();

        assert_eq!(
            keys,
            vec!["pay_early", "pay_middle", "pay_late"],
            "unordered paged scans should not inherit host default updatedAt order"
        );
    }
}
