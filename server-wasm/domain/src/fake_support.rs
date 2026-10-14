use super::{BTreeMap, BTreeSet, FakeSeams, RefCell, VecDeque};
use serde_json::Value;

use crate::seams::HostError;

#[derive(Clone)]
pub(super) struct StoredEntry {
    pub(super) payload: Value,
    pub(super) updated_at: i64,
    pub(super) version: String,
}

pub(super) fn err(message: &str) -> HostError {
    HostError::new(message)
}

impl Default for FakeSeams {
    fn default() -> Self {
        Self {
            now: RefCell::new(crate::time::parse_iso("2026-05-31T12:00:00Z").unwrap()),
            db: RefCell::new(BTreeMap::new()),
            next_version: RefCell::new(1),
            legacy_batch_parser: RefCell::new(false),
            guarded_only_models: RefCell::new(BTreeSet::new()),
            guarded_failure_after_ops: RefCell::new(None),
            guarded_failure_after_http: RefCell::new(false),
            guarded_races: Default::default(),
            db_batch_requests: Default::default(),
            db_compare_and_set_requests: Default::default(),
            db_reads: Default::default(),
            db_counts: Default::default(),
            read_responses: Default::default(),
            conditional_results: Default::default(),
            config_revision: Default::default(),
            config_receipts: Default::default(),
            read_race: Default::default(),
            settings: RefCell::new(BTreeMap::new()),
            settings_fail: RefCell::new(false),
            secrets: RefCell::new(BTreeMap::new()),
            secret_reads: RefCell::new(Vec::new()),
            events: RefCell::new(Vec::new()),
            event_results: RefCell::new(VecDeque::new()),
            records: RefCell::new(Vec::new()),
            tags: RefCell::new(Vec::new()),
            crm_events: RefCell::new(Vec::new()),
            crm_results: RefCell::new(VecDeque::new()),
            provider_requests: RefCell::new(Vec::new()),
            provider_responses: RefCell::new(Default::default()),
            blockchain_config: RefCell::new(None),
            logs: RefCell::new(Vec::new()),
            http_responses: RefCell::new(Default::default()),
            http_time_advances: RefCell::new(Default::default()),
            stripe_events: RefCell::new(BTreeMap::new()),
            http_requests: RefCell::new(Vec::new()),
            service_requests: Default::default(),
            native_storefront_policy: RefCell::new(Ok(crate::reqresp::RouteResponse::ok(
                &serde_json::json!({"contractVersion":1,"mode":"unrestricted","selectedContributionIds":[]}),
            ))),
            service_responses: Default::default(),
        }
    }
}
