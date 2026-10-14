//! Cooperative invocation budgets. Host calls must still enforce their own deadlines.
use std::time::Instant;

use crate::seams::HostSeams;

pub(crate) struct WorkBudget {
    started: Instant,
    started_unix: i64,
}

impl WorkBudget {
    pub(crate) fn new<S: HostSeams>(seams: &S) -> Self {
        Self {
            started: Instant::now(),
            started_unix: seams.now_unix_secs(),
        }
    }

    pub(crate) fn exhausted<S: HostSeams>(&self, seams: &S, seconds: u64) -> bool {
        self.started.elapsed().as_secs() >= seconds
            || seams.now_unix_secs().saturating_sub(self.started_unix) >= seconds as i64
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn observes_elapsed_host_time_without_sleeping() {
        let seams = crate::fake::FakeSeams::new();
        let budget = WorkBudget::new(&seams);
        assert!(!budget.exhausted(&seams, 45));
        seams.set_now(seams.now_unix_secs() + 45);
        assert!(budget.exhausted(&seams, 45));
    }
}
