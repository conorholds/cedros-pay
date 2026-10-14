//! In-memory `HostSeams` test double implementing documented DB/query semantics plus
//! programmable settings, secrets, time, provider, and HTTP; shared helpers may be unused.
#![allow(dead_code)]

use std::cell::RefCell;
use std::collections::{BTreeMap, BTreeSet, VecDeque};

use serde_json::{json, Value};

use crate::seams::{HostError, HostResult, HostSeams};

#[path = "fake_config.rs"]
mod config;
#[path = "fake_guarded.rs"]
mod guarded;
#[path = "fake_policy.rs"]
mod policy;
#[path = "fake_query.rs"]
mod query;
#[path = "fake_races.rs"]
mod races;
#[path = "fake_read_races.rs"]
mod read_races;
#[path = "fake_reads.rs"]
mod reads;
#[path = "fake_support.rs"]
mod support;
use support::{err, StoredEntry};

type Collection = BTreeMap<String, StoredEntry>;

pub struct FakeSeams {
    now: RefCell<i64>,
    db: RefCell<BTreeMap<String, Collection>>,
    next_version: RefCell<u64>,
    legacy_batch_parser: RefCell<bool>,
    guarded_only_models: RefCell<BTreeSet<String>>,
    guarded_failure_after_ops: RefCell<Option<usize>>,
    guarded_failure_after_http: RefCell<bool>,
    guarded_races: races::GuardedRaces,
    db_batch_requests: RefCell<Vec<Value>>,
    db_compare_and_set_requests: RefCell<Vec<Value>>,
    pub db_reads: RefCell<BTreeMap<String, (usize, usize, usize)>>,
    pub db_counts: RefCell<BTreeMap<String, usize>>,
    pub read_responses: RefCell<VecDeque<HostResult<String>>>,
    conditional_results: RefCell<VecDeque<(String, HostResult<Value>)>>,
    config_revision: RefCell<Option<String>>,
    config_receipts: RefCell<BTreeMap<String, (Value, Value)>>,
    read_race: RefCell<Option<read_races::ReadRace>>,
    settings: RefCell<BTreeMap<String, String>>,
    settings_fail: RefCell<bool>,
    secrets: RefCell<BTreeMap<String, String>>,
    pub secret_reads: RefCell<Vec<String>>,
    pub events: RefCell<Vec<(String, String, Value)>>,
    event_results: RefCell<VecDeque<HostResult<()>>>,
    pub records: RefCell<Vec<(String, String, String)>>,
    pub tags: RefCell<Vec<(String, String, String)>>, // (profile, slug, action)
    pub crm_events: RefCell<Vec<(String, String, String, Value)>>,
    crm_results: RefCell<VecDeque<HostResult<()>>>,
    pub provider_requests: RefCell<Vec<(String, String, String, Value)>>,
    provider_responses: RefCell<VecDeque<HostResult<Value>>>,
    /// Sticky response for the `blockchain` provider's config read (the host's
    /// saved wallet/RPC). When set, every `blockchain.config.read` returns it,
    /// independent of the FIFO `provider_responses` queue.
    blockchain_config: RefCell<Option<Value>>,
    pub logs: RefCell<Vec<(String, String)>>,
    http_responses: RefCell<VecDeque<HostResult<Value>>>,
    http_time_advances: RefCell<VecDeque<i64>>,
    /// Stripe Events served to webhook ingress lookups (`GET /v1/events/{id}`)
    /// without consuming the FIFO queue or appearing in `http_requests`.
    stripe_events: RefCell<BTreeMap<String, Value>>,
    pub http_requests: RefCell<Vec<Value>>,
    pub service_requests: RefCell<Vec<crate::seams::ServiceRequest>>,
    /// Explicit sticky Data-service fixture; production has no local fallback.
    pub native_storefront_policy: RefCell<HostResult<crate::reqresp::RouteResponse>>,
    pub service_responses: RefCell<VecDeque<HostResult<crate::reqresp::RouteResponse>>>,
}

impl FakeSeams {
    pub fn new() -> Self {
        Self::default()
    }
    pub fn set_now(&self, secs: i64) {
        *self.now.borrow_mut() = secs;
    }
    pub fn push_http_time_advance(&self, secs: i64) {
        self.http_time_advances.borrow_mut().push_back(secs);
    }
    pub fn set_secret(&self, key: &str, value: &str) {
        self.secrets.borrow_mut().insert(key.into(), value.into());
    }
    pub fn set_setting(&self, key: &str, value: &str) {
        self.settings.borrow_mut().insert(key.into(), value.into());
    }
    pub fn fail_settings(&self) {
        *self.settings_fail.borrow_mut() = true;
    }
    /// Seeds one entry directly (bypassing scope checks), updated_at = now.
    pub fn seed(&self, model: &str, key: &str, payload: Value) {
        let now = *self.now.borrow();
        let version = self.new_version();
        self.db
            .borrow_mut()
            .entry(model.into())
            .or_default()
            .insert(
                key.into(),
                StoredEntry {
                    payload,
                    updated_at: now,
                    version,
                },
            );
    }
    /// Emulates the pre-concurrency host that ignores additive guard fields.
    pub fn use_legacy_batch_parser(&self) {
        *self.legacy_batch_parser.borrow_mut() = true;
    }
    /// Replaces one entry before the Nth subsequent read, emulating another worker.
    pub fn queue_read_race(&self, after_reads: usize, model: &str, key: &str, payload: Value) {
        *self.read_race.borrow_mut() =
            Some(read_races::ReadRace::new(after_reads, model, key, payload));
    }
    /// Registers a Stripe Event that webhook ingress may retrieve by id. Missing
    /// envelope fields are filled with test-mode defaults so payload fixtures
    /// only need `id`, `type`, and `data.object`.
    pub fn seed_stripe_event(&self, event: Value) {
        let mut event = event;
        let id = event["id"].as_str().expect("stripe event id").to_string();
        if event.get("object").is_none() {
            event["object"] = json!("event");
        }
        if event["api_version"].as_str().is_none_or(str::is_empty) {
            event["api_version"] = json!(crate::stripe::api::STRIPE_API_VERSION);
        }
        if event.get("livemode").is_none() {
            event["livemode"] = json!(false);
        }
        if event["created"].as_i64().is_none() {
            event["created"] = json!(*self.now.borrow());
        }
        self.stripe_events.borrow_mut().insert(id, event);
    }
    /// The enriched Event registered under `id`, as ingress will retrieve it.
    pub fn stripe_event(&self, id: &str) -> Option<Value> {
        self.stripe_events.borrow().get(id).cloned()
    }
    fn seeded_stripe_event(&self, req: &Value) -> Option<Value> {
        if req["method"].as_str().is_some_and(|method| method != "GET") {
            return None;
        }
        let id = req["url"]
            .as_str()?
            .strip_prefix("https://api.stripe.com/v1/events/")?;
        self.stripe_events.borrow().get(id).cloned()
    }
    /// Queues one `http.fetch` response (`{status,headers,body}`), consumed FIFO.
    pub fn push_http_response(&self, status: u16, body: &str) {
        self.http_responses.borrow_mut().push_back(Ok(json!({
            "status": status,
            "headers": [],
            "body": body,
        })));
    }
    /// Queues one `http.fetch` host error, consumed FIFO.
    pub fn push_http_error(&self, message: &str) {
        self.http_responses
            .borrow_mut()
            .push_back(Err(HostError::new(message)));
    }
    /// Fails the first guarded commit after the next completed HTTP request.
    pub fn fail_guarded_commit_after_next_http(&self) {
        *self.guarded_failure_after_http.borrow_mut() = true;
    }
    /// Queues one `provider.execute` response, consumed FIFO.
    pub fn push_provider_response(&self, body: Value) {
        self.provider_responses.borrow_mut().push_back(Ok(body));
    }
    /// Makes the host blockchain provider report `rpc_url` for every
    /// `blockchain.config.read`, mirroring how the real host returns its saved
    /// Solana RPC. Sticky (not consumed), so a flow that reads it more than once
    /// keeps seeing it.
    pub fn set_blockchain_rpc(&self, rpc_url: &str) {
        *self.blockchain_config.borrow_mut() =
            Some(json!({ "solana": { "rpcUrl": rpc_url, "rpcSecretConfigured": true } }));
    }
    pub fn entry_count(&self, model: &str) -> usize {
        self.db.borrow().get(model).map(|c| c.len()).unwrap_or(0)
    }
    pub fn get_entry(&self, model: &str, key: &str) -> Option<Value> {
        self.db
            .borrow()
            .get(model)
            .and_then(|c| c.get(key))
            .map(|entry| entry.payload.clone())
    }
    pub fn last_db_batch_request(&self) -> Option<Value> {
        self.db_batch_requests.borrow().last().cloned()
    }
    pub fn db_batch_request_count(&self) -> usize {
        self.db_batch_requests.borrow().len()
    }
    pub fn db_compare_and_set_request_count(&self) -> usize {
        self.db_compare_and_set_requests.borrow().len()
    }
    pub fn push_conditional_result(&self, operation_id: &str, output: Value) {
        self.conditional_results
            .borrow_mut()
            .push_back((operation_id.into(), Ok(output)));
    }
    pub fn push_conditional_error(&self, message: &str) {
        self.conditional_results
            .borrow_mut()
            .push_back((String::new(), Err(HostError::new(message))));
    }
    pub fn event_count(&self, event_id: &str) -> usize {
        self.events
            .borrow()
            .iter()
            .filter(|(e, _, _)| e == event_id)
            .count()
    }
    pub fn fail_next_event(&self, message: &str) {
        self.event_results
            .borrow_mut()
            .push_back(Err(HostError::new(message)));
    }
    pub fn fail_next_crm(&self, message: &str) {
        self.crm_results
            .borrow_mut()
            .push_back(Err(HostError::new(message)));
    }

    fn new_version(&self) -> String {
        let mut next = self.next_version.borrow_mut();
        let version = format!("fake-v{next}");
        *next += 1;
        version
    }
}

impl HostSeams for FakeSeams {
    fn service_invoke(
        &self,
        request: &crate::seams::ServiceRequest,
    ) -> HostResult<crate::reqresp::RouteResponse> {
        self.service_requests.borrow_mut().push(request.clone());
        if request.route_id == crate::native_storefront_policy::ROUTE {
            return self.native_storefront_policy.borrow().clone();
        }
        self.service_responses
            .borrow_mut()
            .pop_front()
            .unwrap_or_else(|| Err(HostError::new("service unavailable")))
    }
    fn log(&self, level: &str, message: &str) {
        self.logs.borrow_mut().push((level.into(), message.into()));
    }
    fn now_unix_secs(&self) -> i64 {
        *self.now.borrow()
    }

    fn db_read(&self, access: &str, model: &str, query_json: &str) -> HostResult<String> {
        self.read_with_metrics(access, model, query_json)
    }

    fn db_count(&self, _access: &str, model: &str, query_json: &str) -> HostResult<String> {
        let q: Value = serde_json::from_str(query_json).map_err(|_| err("bad query"))?;
        *self.db_counts.borrow_mut().entry(model.into()).or_default() += 1;
        // count ignores order/limit/offset; recompute on the raw filtered set.
        let filtered = self.filtered(model, &q);
        Ok(json!({ "count": filtered.len() as i64 }).to_string())
    }

    fn db_write(
        &self,
        _access: &str,
        model: &str,
        entry_key: &str,
        data_json: &str,
    ) -> HostResult<String> {
        policy::enforce(self, model)?;
        let payload: Value = serde_json::from_str(data_json).map_err(|_| err("bad data"))?;
        let now = *self.now.borrow();
        let version = self.new_version();
        self.db
            .borrow_mut()
            .entry(model.into())
            .or_default()
            .insert(
                entry_key.into(),
                StoredEntry {
                    payload: payload.clone(),
                    updated_at: now,
                    version: version.clone(),
                },
            );
        Ok(
            json!({ "entry": { "entryKey": entry_key, "payload": payload,
            "updatedAt": crate::time::iso8601(now), "version": version } })
            .to_string(),
        )
    }

    fn db_delete(&self, _access: &str, model: &str, entry_key: &str) -> HostResult<String> {
        policy::enforce(self, model)?;
        let removed = self
            .db
            .borrow_mut()
            .get_mut(model)
            .map(|c| c.remove(entry_key).is_some())
            .unwrap_or(false);
        Ok(json!({ "removed": removed }).to_string())
    }

    fn db_batch(&self, _access: &str, ops_json: &str) -> HostResult<String> {
        let parsed: Value = serde_json::from_str(ops_json).map_err(|_| err("bad batch"))?;
        self.db_batch_requests.borrow_mut().push(parsed.clone());
        if parsed["ops"][0]["op"] == "conditional" {
            let requested = parsed["ops"][0]["operationId"]
                .as_str()
                .ok_or_else(|| err("missing conditional operation id"))?;
            if requested == "extension.configuration.compare-and-set" {
                let output = config::execute(self, &parsed["ops"][0]["params"])?;
                return Ok(json!({
                    "applied": 1,
                    "results": [{"operationId": requested, "output": output}],
                })
                .to_string());
            }
            let (expected, result) = self
                .conditional_results
                .borrow_mut()
                .pop_front()
                .ok_or_else(|| err("no conditional result queued"))?;
            let output = result?;
            if expected != requested {
                return Err(err("unexpected conditional operation"));
            }
            return Ok(json!({
                "applied": 1,
                "results": [{"operationId": requested, "output": output}],
            })
            .to_string());
        }
        if parsed.get("schemaVersion").is_some() && !*self.legacy_batch_parser.borrow() {
            self.guarded_races.apply_next(self);
            return guarded::execute(self, &parsed);
        }
        let supports_policy = !*self.legacy_batch_parser.borrow();
        policy::execute_plain_batch(self, &parsed, supports_policy)
    }

    fn db_compare_and_set(&self, _access: &str, request_json: &str) -> HostResult<String> {
        let parsed: Value =
            serde_json::from_str(request_json).map_err(|_| err("bad CAS request"))?;
        self.db_batch_requests.borrow_mut().push(parsed.clone());
        self.db_compare_and_set_requests
            .borrow_mut()
            .push(parsed.clone());
        self.guarded_races.apply_next(self);
        guarded::execute(self, &parsed)
    }

    fn db_migrate(&self, _access: &str, model: &str, _mode: &str) -> HostResult<String> {
        self.db.borrow_mut().entry(model.into()).or_default();
        Ok(json!({ "collectionName": model }).to_string())
    }

    fn setting_get(&self, key: &str) -> HostResult<Option<String>> {
        if *self.settings_fail.borrow() {
            return Err(err("settings seam unavailable"));
        }
        Ok(self.settings.borrow().get(key).cloned())
    }
    fn setting_set(&self, key: &str, value: &str) -> HostResult<()> {
        if *self.settings_fail.borrow() {
            return Err(err("settings seam unavailable"));
        }
        self.settings.borrow_mut().insert(key.into(), value.into());
        Ok(())
    }
    fn settings_all(&self) -> HostResult<String> {
        if *self.settings_fail.borrow() {
            return Err(err("settings seam unavailable"));
        }
        let map: serde_json::Map<String, Value> = self
            .settings
            .borrow()
            .iter()
            .map(|(k, v)| (k.clone(), Value::String(v.clone())))
            .collect();
        Ok(Value::Object(map).to_string())
    }

    fn secret_get(&self, key: &str) -> HostResult<Option<String>> {
        self.secret_reads.borrow_mut().push(key.into());
        Ok(self.secrets.borrow().get(key).cloned())
    }
    fn secret_set(&self, key: &str, value: &str) -> HostResult<()> {
        self.secrets.borrow_mut().insert(key.into(), value.into());
        Ok(())
    }
    fn secret_delete(&self, key: &str) -> HostResult<bool> {
        Ok(self.secrets.borrow_mut().remove(key).is_some())
    }

    fn emit_event(&self, event_id: &str, label: &str, metadata_json: &str) -> HostResult<()> {
        if let Some(result) = self.event_results.borrow_mut().pop_front() {
            result?;
        }
        let meta = serde_json::from_str(metadata_json).unwrap_or(Value::Null);
        self.events
            .borrow_mut()
            .push((event_id.into(), label.into(), meta));
        Ok(())
    }
    fn emit_record(
        &self,
        category: &str,
        title: &str,
        text: &str,
        _payload: &str,
    ) -> HostResult<()> {
        self.records
            .borrow_mut()
            .push((category.into(), title.into(), text.into()));
        Ok(())
    }

    fn tag_assign(&self, _a: &str, profile: &str, slug: &str, _p: &str) -> HostResult<String> {
        self.tags
            .borrow_mut()
            .push((profile.into(), slug.into(), "assign".into()));
        Ok(json!({ "assigned": true, "tagSlug": slug }).to_string())
    }
    fn tag_unassign(&self, _a: &str, profile: &str, slug: &str) -> HostResult<String> {
        self.tags
            .borrow_mut()
            .push((profile.into(), slug.into(), "unassign".into()));
        Ok(json!({ "removed": true }).to_string())
    }
    fn tag_read(&self, _a: &str, _profile: &str) -> HostResult<String> {
        Ok(json!({ "tags": [] }).to_string())
    }

    fn crm_submit(
        &self,
        access_id: &str,
        source_kind: &str,
        event_type: &str,
        payload_json: &str,
    ) -> HostResult<()> {
        if let Some(result) = self.crm_results.borrow_mut().pop_front() {
            result?;
        }
        let payload = serde_json::from_str(payload_json).map_err(|_| err("bad crm payload"))?;
        self.crm_events.borrow_mut().push((
            access_id.into(),
            source_kind.into(),
            event_type.into(),
            payload,
        ));
        Ok(())
    }

    fn provider_execute(
        &self,
        access_id: &str,
        provider: &str,
        operation: &str,
        payload_json: &str,
    ) -> HostResult<String> {
        let payload = serde_json::from_str(payload_json).unwrap_or(Value::Null);
        self.provider_requests.borrow_mut().push((
            access_id.into(),
            provider.into(),
            operation.into(),
            payload,
        ));
        // A sticky blockchain config takes priority for blockchain reads, so the
        // RPC endpoint is available however many times a flow reads it.
        if operation == crate::ids::OP_BLOCKCHAIN_CONFIG_READ {
            if let Some(config) = self.blockchain_config.borrow().as_ref() {
                return Ok(config.to_string());
            }
        }
        match self.provider_responses.borrow_mut().pop_front() {
            Some(Ok(v)) => Ok(v.to_string()),
            Some(Err(e)) => Err(e),
            None => {
                Ok(json!({ "accessId": access_id, "provider": provider, "operation": operation, "ok": true }).to_string())
            }
        }
    }

    fn http_fetch(&self, request_json: &str) -> HostResult<String> {
        let req: Value = serde_json::from_str(request_json).map_err(|_| err("bad http request"))?;
        if let Some(event) = self.seeded_stripe_event(&req) {
            return Ok(
                json!({"status": 200, "headers": [], "body": event.to_string()}).to_string(),
            );
        }
        self.http_requests.borrow_mut().push(req);
        let result = match self.http_responses.borrow_mut().pop_front() {
            Some(Ok(v)) => Ok(v.to_string()),
            Some(Err(e)) => Err(e),
            None => Err(err("no canned http response")),
        };
        if let Some(secs) = self.http_time_advances.borrow_mut().pop_front() {
            *self.now.borrow_mut() += secs;
        }
        if std::mem::take(&mut *self.guarded_failure_after_http.borrow_mut()) {
            *self.guarded_failure_after_ops.borrow_mut() = Some(1);
        }
        result
    }
}
