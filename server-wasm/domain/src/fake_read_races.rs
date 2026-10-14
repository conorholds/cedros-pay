//! Test-only durable transition injected before a bounded-poll database read.

use serde_json::Value;

use super::FakeSeams;

pub(super) struct ReadRace {
    remaining: usize,
    writes: Vec<(String, String, Value)>,
}

impl ReadRace {
    pub(super) fn new(after_reads: usize, model: &str, key: &str, payload: Value) -> Self {
        Self {
            remaining: after_reads.max(1),
            writes: vec![(model.into(), key.into(), payload)],
        }
    }

    pub(super) fn from_writes(after_reads: usize, writes: Vec<(&str, &str, Value)>) -> Self {
        Self {
            remaining: after_reads.max(1),
            writes: writes
                .into_iter()
                .map(|(model, key, payload)| (model.into(), key.into(), payload))
                .collect(),
        }
    }
}

impl FakeSeams {
    pub fn queue_read_race_writes(&self, after_reads: usize, writes: Vec<(&str, &str, Value)>) {
        *self.read_race.borrow_mut() = Some(ReadRace::from_writes(after_reads, writes));
    }
}

pub(super) fn apply(seams: &FakeSeams) {
    let ready = {
        let mut queued = seams.read_race.borrow_mut();
        let Some(race) = queued.as_mut() else {
            return;
        };
        race.remaining -= 1;
        if race.remaining == 0 {
            queued.take()
        } else {
            None
        }
    };
    if let Some(race) = ready {
        for (model, key, payload) in race.writes {
            seams.seed(&model, &key, payload);
        }
    }
}
