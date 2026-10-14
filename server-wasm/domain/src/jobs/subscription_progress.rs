//! Guarded sweep progress. Periodic urgent passes preserve expiry priority;
//! rotating passes service unchanged rows in both status buckets. Offset scans
//! can revisit/skip rows under concurrent changes, so each bucket wraps forever.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::db::{BatchOp, Db, EntryRecord, Query};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::seams::HostSeams;

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct State {
    schema_version: u8,
    sweep: bool,
    offsets: BTreeMap<String, i64>,
    next_status: usize,
}

pub(super) struct Progress {
    key: String,
    row: Option<EntryRecord>,
    state: State,
}

impl Progress {
    pub(super) fn load<S: HostSeams>(db: &Db<'_, S>, provider: Option<&str>) -> AppResult<Self> {
        let key = format!(
            "op:subscription-sync-progress:{}",
            provider.unwrap_or("all")
        );
        let row = db.read_one(ids::MODEL_SUBSCRIPTIONS, &key)?;
        let state = row
            .as_ref()
            .map(parse_state)
            .transpose()?
            .unwrap_or_else(|| State {
                schema_version: 2,
                ..Default::default()
            });
        if state.schema_version != 2 || state.offsets.values().any(|offset| *offset < 0) {
            return Err(AppError::internal("invalid subscription sweep progress"));
        }
        Ok(Self { key, row, state })
    }

    pub(super) fn sweep(&self) -> bool {
        self.state.sweep
    }

    pub(super) fn candidates<S: HostSeams>(
        &mut self,
        db: &Db<'_, S>,
        queries: &[(&str, Query)],
        limit: usize,
    ) -> AppResult<Vec<EntryRecord>> {
        if queries.is_empty() {
            return Ok(Vec::new());
        }
        let mut windows = queries
            .iter()
            .map(|(status, query)| {
                let offset = self.state.offsets.entry((*status).to_string()).or_default();
                window(db, query.clone(), offset).map(|rows| rows.into_iter())
            })
            .collect::<AppResult<Vec<_>>>()?;
        let mut rows = Vec::with_capacity(limit);
        let mut next = self.state.next_status % queries.len();
        while rows.len() < limit {
            let mut found = None;
            for step in 0..windows.len() {
                let index = (next + step) % windows.len();
                if let Some(row) = windows[index].next() {
                    found = Some((index, row));
                    break;
                }
            }
            let Some((index, row)) = found else { break };
            rows.push(row);
            next = (index + 1) % windows.len();
        }
        Ok(rows)
    }

    pub(super) fn consumed(&mut self, row: &EntryRecord) -> AppResult<()> {
        if !self.state.sweep {
            return Ok(());
        }
        // Advance fairness from completed work, not the planned batch: a
        // deadline may stop after just the first candidate.
        let status = row
            .payload
            .get("status")
            .and_then(Value::as_str)
            .ok_or_else(|| AppError::internal("subscription sweep row omitted status"))?;
        let offset = self.state.offsets.entry(status.to_string()).or_default();
        *offset = offset
            .checked_add(1)
            .ok_or_else(|| AppError::internal("subscription sweep offset overflow"))?;
        if let Some(index) = super::RECONCILABLE_STATUSES
            .iter()
            .position(|candidate| *candidate == status)
        {
            self.state.next_status = (index + 1) % super::RECONCILABLE_STATUSES.len();
        }
        Ok(())
    }

    pub(super) fn save<S: HostSeams>(mut self, db: &Db<'_, S>) -> AppResult<()> {
        self.state.sweep = !self.state.sweep;
        let condition = match &self.row {
            Some(row) => crate::routes::subscription_store::version_guard(row)?,
            None => GuardedCondition::Absent {
                content_model_id: ids::MODEL_SUBSCRIPTIONS,
                entry_key: self.key.clone(),
            },
        };
        let data = serde_json::to_value(self.state).map_err(|e| {
            AppError::internal("cannot encode subscription progress").with_internal(e.to_string())
        })?;
        let op = BatchOp::Write {
            content_model_id: ids::MODEL_SUBSCRIPTIONS,
            entry_key: self.key,
            data,
        };
        match db.guarded_batch(&[condition], &[op])? {
            GuardedBatchOutcome::Applied { .. } => Ok(()),
            GuardedBatchOutcome::Conflict { .. } => Err(AppError::conflict(
                "subscription sweep progress changed; retry",
            )),
        }
    }
}

fn parse_state(row: &EntryRecord) -> AppResult<State> {
    if row.payload.get("schemaVersion").and_then(Value::as_u64) == Some(1) {
        let active = row
            .payload
            .get("activeOffset")
            .and_then(Value::as_i64)
            .unwrap_or(0);
        let trialing = row
            .payload
            .get("trialingOffset")
            .and_then(Value::as_i64)
            .unwrap_or(0);
        let next_status = usize::from(
            row.payload
                .get("trialingFirst")
                .and_then(Value::as_bool)
                .unwrap_or(false),
        );
        return Ok(State {
            schema_version: 2,
            sweep: row
                .payload
                .get("sweep")
                .and_then(Value::as_bool)
                .unwrap_or(false),
            offsets: BTreeMap::from([
                ("active".to_string(), active),
                ("trialing".to_string(), trialing),
            ]),
            next_status,
        });
    }
    row.parse()
}

fn window<S: HostSeams>(
    db: &Db<'_, S>,
    query: Query,
    offset: &mut i64,
) -> AppResult<Vec<EntryRecord>> {
    if *offset < 0 {
        return Err(AppError::internal("invalid subscription sweep offset"));
    }
    let rows = db.read(ids::MODEL_SUBSCRIPTIONS, &query.clone().offset(*offset))?;
    if rows.is_empty() && *offset > 0 {
        *offset = 0;
        return db.read(ids::MODEL_SUBSCRIPTIONS, &query.offset(0));
    }
    Ok(rows)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fake::FakeSeams;

    #[test]
    fn stale_progress_cannot_overwrite_a_newer_worker() {
        let seams = FakeSeams::new();
        let db = Db::new(&seams, ids::DB_ACCESS);
        let first = Progress::load(&db, None).unwrap();
        let stale = Progress::load(&db, None).unwrap();
        first.save(&db).unwrap();
        assert_eq!(stale.save(&db).unwrap_err().status, 409);
        assert!(Progress::load(&db, None).unwrap().sweep());
        assert!(!Progress::load(&db, Some("stripe")).unwrap().sweep());
    }
    #[test]
    fn partial_batches_turn_to_the_other_status_on_the_next_sweep() {
        use crate::db::{Filter, Op};
        let seams = FakeSeams::new();
        seams.seed(
            ids::MODEL_SUBSCRIPTIONS,
            "a",
            serde_json::json!({"status":"active"}),
        );
        seams.seed(
            ids::MODEL_SUBSCRIPTIONS,
            "b",
            serde_json::json!({"status":"trialing"}),
        );
        let db = Db::new(&seams, ids::DB_ACCESS);
        Progress::load(&db, None).unwrap().save(&db).unwrap(); // urgent pass
        let query = |status| {
            Query::new()
                .filter(Filter::new("status", Op::Eq, status))
                .limit(2)
        };
        let mut progress = Progress::load(&db, None).unwrap();
        let queries = [("active", query("active")), ("trialing", query("trialing"))];
        let rows = progress.candidates(&db, &queries, 2).unwrap();
        assert_eq!(rows[0].entry_key, "a");
        progress.consumed(&rows[0]).unwrap(); // invocation stops before b
        progress.save(&db).unwrap();
        Progress::load(&db, None).unwrap().save(&db).unwrap(); // intervening urgent pass
        let rows = Progress::load(&db, None)
            .unwrap()
            .candidates(&db, &queries, 2)
            .unwrap();
        assert_eq!(rows[0].entry_key, "b");
    }

    #[test]
    fn loads_and_upgrades_legacy_two_bucket_progress() {
        let seams = FakeSeams::new();
        let key = "op:subscription-sync-progress:all";
        seams.seed(
            ids::MODEL_SUBSCRIPTIONS,
            key,
            serde_json::json!({
                "schemaVersion": 1, "sweep": true, "activeOffset": 4,
                "trialingOffset": 2, "trialingFirst": true
            }),
        );
        let progress = Progress::load(&Db::new(&seams, ids::DB_ACCESS), None).unwrap();
        assert_eq!(progress.state.schema_version, 2);
        assert_eq!(progress.state.offsets["active"], 4);
        assert_eq!(progress.state.offsets["trialing"], 2);
        assert_eq!(progress.state.next_status, 1);
    }
}
