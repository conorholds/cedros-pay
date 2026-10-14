//! Restart-safe bounded sweeps. A pending row must not monopolize every run.
//!
//! Progress is scheduling metadata, never settlement evidence. Advance before
//! processing each row so a poison row or process crash cannot starve its
//! successors. Offsets may skip/revisit rows when the candidate set changes;
//! wrapping forever and idempotent settlement make those changes safe.

use crate::db::{BatchOp, Db, EntryRecord, Query};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::{ids, seams::HostSeams};
use serde_json::json;

pub(crate) struct Scan {
    key: String,
    version: Option<String>,
    offset: i64,
}

impl Scan {
    pub(crate) fn load<S: HostSeams>(
        db: &Db<'_, S>,
        name: &str,
        model: &str,
        query: &Query,
    ) -> AppResult<(Self, Vec<EntryRecord>)> {
        let key = format!("reconciliation-progress:{name}");
        let stored = db.read_one(ids::MODEL_WEBHOOK_OUTBOX, &key)?;
        let (mut offset, version) = match stored {
            Some(row) => {
                let offset = row.payload["offset"].as_i64().filter(|n| *n >= 0);
                if row.payload["recordType"] != "reconciliationProgress"
                    || row.payload["schemaVersion"] != 1
                    || offset.is_none()
                    || row.version.as_deref().is_none_or(str::is_empty)
                {
                    return Err(AppError::internal("invalid reconciliation progress"));
                }
                (offset.unwrap_or(0), row.version)
            }
            None => (0, None),
        };
        let mut rows = db.read(model, &query.clone().offset(offset))?;
        if rows.is_empty() && offset > 0 {
            offset = 0;
            rows = db.read(model, &query.clone().offset(0))?;
        }
        Ok((
            Self {
                key,
                version,
                offset,
            },
            rows,
        ))
    }

    pub(crate) fn advance<S: HostSeams>(&mut self, db: &Db<'_, S>) -> AppResult<()> {
        let next = self
            .offset
            .checked_add(1)
            .ok_or_else(|| AppError::internal("reconciliation progress overflow"))?;
        let condition = match &self.version {
            Some(version) => GuardedCondition::Version {
                content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
                entry_key: self.key.clone(),
                expected_version: version.clone(),
            },
            None => GuardedCondition::Absent {
                content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
                entry_key: self.key.clone(),
            },
        };
        let op = BatchOp::Write {
            content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
            entry_key: self.key.clone(),
            data: json!({"recordType":"reconciliationProgress", "schemaVersion":1, "offset":next}),
        };
        match db.guarded_batch(&[condition], &[op])? {
            GuardedBatchOutcome::Conflict { .. } => {
                Err(AppError::conflict("reconciliation progress changed; retry"))
            }
            GuardedBatchOutcome::Applied { entries, .. } => {
                self.version = Some(
                    entries
                        .into_iter()
                        .find(|row| row.entry_key == self.key)
                        .filter(|row| !row.version.is_empty())
                        .ok_or_else(|| {
                            AppError::internal("reconciliation progress omitted version")
                        })?
                        .version,
                );
                self.offset = next;
                Ok(())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{Dir, Filter, Op};
    use crate::fake::FakeSeams;

    fn query() -> Query {
        Query::new()
            .filter(Filter::new("status", Op::Eq, "pending"))
            .order("createdAt", Dir::Asc)
            .limit(1)
    }

    #[test]
    fn crash_advances_then_wraps_without_forgetting_unprocessed_work() {
        let seams = FakeSeams::new();
        let db = Db::new(&seams, ids::DB_ACCESS);
        for key in ["a", "b", "c"] {
            seams.seed(
                ids::MODEL_LEDGER,
                key,
                json!({"status":"pending", "createdAt":key}),
            );
        }
        for expected in ["a", "b", "c", "a"] {
            let (mut scan, rows) = Scan::load(&db, "test", ids::MODEL_LEDGER, &query()).unwrap();
            assert_eq!(rows[0].entry_key, expected);
            scan.advance(&db).unwrap();
            // Process dies before changing any economic state.
        }
        assert_eq!(db.read(ids::MODEL_LEDGER, &Query::new()).unwrap().len(), 3);
    }

    #[test]
    fn concurrent_or_stale_workers_cannot_rewind_progress() {
        let seams = FakeSeams::new();
        let db = Db::new(&seams, ids::DB_ACCESS);
        let (mut first, _) = Scan::load(&db, "test", ids::MODEL_LEDGER, &query()).unwrap();
        let (mut stale, _) = Scan::load(&db, "test", ids::MODEL_LEDGER, &query()).unwrap();
        first.advance(&db).unwrap();
        assert_eq!(stale.advance(&db).unwrap_err().status, 409);
        first.advance(&db).unwrap();
        assert_eq!(
            seams
                .get_entry(ids::MODEL_WEBHOOK_OUTBOX, &first.key)
                .unwrap()["offset"],
            2
        );
    }
}
