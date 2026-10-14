//! Deterministic guarded-write race injection for domain tests.

use std::cell::RefCell;
use std::collections::VecDeque;

use serde_json::Value;

use super::{FakeSeams, StoredEntry};

#[derive(Default)]
pub(super) struct GuardedRaces {
    queued: RefCell<VecDeque<Vec<RaceWrite>>>,
}

struct RaceWrite {
    model: String,
    key: String,
    payload: Value,
}

impl GuardedRaces {
    pub(super) fn queue(&self, writes: Vec<(&str, &str, Value)>) {
        let writes = writes
            .into_iter()
            .map(|(model, key, payload)| RaceWrite {
                model: model.to_string(),
                key: key.to_string(),
                payload,
            })
            .collect();
        self.queued.borrow_mut().push_back(writes);
    }

    pub(super) fn apply_next(&self, seams: &FakeSeams) {
        let Some(writes) = self.queued.borrow_mut().pop_front() else {
            return;
        };
        let now = *seams.now.borrow();
        let mut db = seams.db.borrow_mut();
        for write in writes {
            db.entry(write.model).or_default().insert(
                write.key,
                StoredEntry {
                    payload: write.payload,
                    updated_at: now,
                    version: seams.new_version(),
                },
            );
        }
    }
}

impl FakeSeams {
    /// Applies writes immediately before the next guarded batch.
    pub fn queue_guarded_race(&self, writes: Vec<(&str, &str, Value)>) {
        self.guarded_races.queue(writes);
    }
}
