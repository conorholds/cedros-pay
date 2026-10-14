//! In-memory site-database + settings/secrets/clock/egress, implementing the
//! documented seam JSON shapes (06-site-database-postgres-access.md) and filter
//! semantics. Backs the host-trait impls in `lib.rs`. Verification-only.

use std::cell::RefCell;
use std::cmp::Ordering;
use std::collections::{BTreeMap, BTreeSet, HashMap, VecDeque};

use cedros_pay_extension_domain::time::iso8601 as iso;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[path = "store_guarded.rs"]
mod guarded;
#[path = "store_policy.rs"]
mod policy;

#[derive(Clone, Deserialize, Serialize)]
struct StoredEntry {
    payload: Value,
    updated_at: i64,
    version: String,
}

type Collection = BTreeMap<String, StoredEntry>;

#[derive(Deserialize, Serialize)]
pub struct SimStore {
    pub now: i64,
    #[serde(default)]
    pub db_reads: RefCell<BTreeMap<String, (usize, usize, usize)>>,
    #[serde(default)]
    pub db_counts: RefCell<BTreeMap<String, usize>>,
    #[serde(default)]
    pub db_read_delay_millis: u64,
    #[serde(default)]
    pub last_fuel_consumed: u64,
    db: HashMap<String, Collection>,
    next_version: u64,
    guarded_only_models: BTreeSet<String>,
    guarded_failure_after_ops: Option<usize>,
    settings: HashMap<String, String>,
    secrets: HashMap<String, String>,
    http: VecDeque<(u16, String)>,
    pub events: Vec<(String, String)>,
    pub tags: Vec<(String, String, String)>,
    pub logs: Vec<(String, String)>,
    pub mutation_calls: usize,
    pub http_fetch_calls: usize,
    pub provider_calls: usize,
    #[serde(default)]
    pub service_requests: Vec<Value>,
    #[serde(default)]
    pub service_responses: VecDeque<(u16, String)>,
}

impl SimStore {
    pub fn new(now: i64) -> Self {
        Self {
            now,
            db_reads: RefCell::new(BTreeMap::new()),
            db_counts: RefCell::new(BTreeMap::new()),
            db_read_delay_millis: 0,
            last_fuel_consumed: 0,
            db: HashMap::new(),
            next_version: 1,
            guarded_only_models: BTreeSet::new(),
            guarded_failure_after_ops: None,
            settings: HashMap::new(),
            secrets: HashMap::new(),
            http: VecDeque::new(),
            events: Vec::new(),
            tags: Vec::new(),
            logs: Vec::new(),
            mutation_calls: 0,
            http_fetch_calls: 0,
            provider_calls: 0,
            service_requests: Vec::new(),
            service_responses: VecDeque::new(),
        }
    }

    /// Restores one local verification snapshot. This format is test-only and
    /// intentionally not a Cedros Data persistence contract.
    pub fn from_snapshot(value: Value) -> Result<Self, String> {
        serde_json::from_value(value).map_err(|_| "invalid hostsim snapshot".into())
    }

    /// Captures the complete local verification store for atomic file-backed
    /// handoff between independent adapter processes.
    pub fn snapshot(&self) -> Result<Value, String> {
        serde_json::to_value(self).map_err(|_| "cannot encode hostsim snapshot".into())
    }

    pub fn set_secret(&mut self, key: &str, value: &str) {
        self.secrets.insert(key.into(), value.into());
    }
    pub fn set_setting(&mut self, key: &str, value: &str) {
        self.settings.insert(key.into(), value.into());
    }
    pub fn push_http(&mut self, status: u16, body: &str) {
        self.http.push_back((status, body.into()));
    }
    pub fn seed(&mut self, model: &str, key: &str, payload: Value) {
        let now = self.now;
        let version = self.new_version();
        self.db.entry(model.into()).or_default().insert(
            key.into(),
            StoredEntry {
                payload,
                updated_at: now,
                version,
            },
        );
    }
    pub fn get(&self, model: &str, key: &str) -> Option<Value> {
        self.db
            .get(model)
            .and_then(|c| c.get(key))
            .map(|entry| entry.payload.clone())
    }
    pub fn fail_next_guarded_batch_after(&mut self, applied_ops: usize) {
        self.guarded_failure_after_ops = Some(applied_ops);
    }
    pub fn guarded_models(&self) -> BTreeSet<String> {
        self.guarded_only_models.clone()
    }
    // ── seam ops (return the documented JSON, or Err(message)) ────────────────

    pub fn read(&self, model: &str, query_json: &str) -> Result<String, String> {
        let q: Value = serde_json::from_str(query_json).map_err(|_| "bad query".to_string())?;
        let entries: Vec<Value> = self
            .select(model, &q)
            .into_iter()
            .map(|(k, payload, u, version)| {
                json!({
                    "entryKey": k, "payload": payload, "updatedAt": iso(u), "version": version,
                })
            })
            .collect();
        let count = entries.len();
        let raw = json!({ "entries": entries }).to_string();
        let mut reads = self.db_reads.borrow_mut();
        let totals = reads.entry(model.into()).or_default();
        totals.0 += 1;
        totals.1 += count;
        totals.2 += raw.len();
        Ok(raw)
    }

    pub fn count(&self, model: &str, query_json: &str) -> Result<String, String> {
        let q: Value = serde_json::from_str(query_json).map_err(|_| "bad query".to_string())?;
        *self.db_counts.borrow_mut().entry(model.into()).or_default() += 1;
        Ok(json!({ "count": self.filtered(model, &q).len() as i64 }).to_string())
    }

    pub fn write(&mut self, model: &str, key: &str, data_json: &str) -> Result<String, String> {
        self.mutation_calls += 1;
        policy::enforce(self, model)?;
        let payload: Value = serde_json::from_str(data_json).map_err(|_| "bad data".to_string())?;
        let now = self.now;
        let version = self.new_version();
        self.db.entry(model.into()).or_default().insert(
            key.into(),
            StoredEntry {
                payload: payload.clone(),
                updated_at: now,
                version: version.clone(),
            },
        );
        Ok(json!({ "entry": { "entryKey": key, "payload": payload,
                "updatedAt": iso(now), "version": version } })
        .to_string())
    }

    pub fn delete(&mut self, model: &str, key: &str) -> Result<String, String> {
        self.mutation_calls += 1;
        policy::enforce(self, model)?;
        let removed = self
            .db
            .get_mut(model)
            .map(|c| c.remove(key).is_some())
            .unwrap_or(false);
        Ok(json!({ "removed": removed }).to_string())
    }

    pub fn batch(&mut self, ops_json: &str) -> Result<String, String> {
        self.mutation_calls += 1;
        let parsed: Value = serde_json::from_str(ops_json).map_err(|_| "bad batch".to_string())?;
        if parsed.get("schemaVersion").is_some() {
            return guarded::execute(self, &parsed);
        }
        policy::execute_plain_batch(self, &parsed)
    }

    pub fn migrate(&mut self, model: &str) -> Result<String, String> {
        self.mutation_calls += 1;
        self.db.entry(model.into()).or_default();
        Ok(json!({ "collectionName": model }).to_string())
    }

    fn new_version(&mut self) -> String {
        let version = format!("hostsim-v{}", self.next_version);
        self.next_version += 1;
        version
    }

    pub fn setting_get(&self, key: &str) -> Option<String> {
        self.settings.get(key).cloned()
    }
    pub fn secret_get(&self, key: &str) -> Option<String> {
        self.secrets.get(key).cloned()
    }
    pub fn http_fetch(&mut self, _request_json: &str) -> Result<String, String> {
        self.http_fetch_calls += 1;
        match self.http.pop_front() {
            Some((status, body)) => {
                Ok(json!({ "status": status, "headers": [], "body": body }).to_string())
            }
            None => Err("no canned http response".into()),
        }
    }

    // ── query engine ──────────────────────────────────────────────────────────

    fn filtered(&self, model: &str, q: &Value) -> Vec<(String, Value, i64, String)> {
        let collection = match self.db.get(model) {
            Some(c) => c,
            None => return Vec::new(),
        };
        let entry_keys: Option<Vec<String>> =
            q.get("entryKeys").and_then(Value::as_array).map(|a| {
                a.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect()
            });
        let filters = q.get("filters").and_then(Value::as_array);
        collection
            .iter()
            .filter(|(k, _)| entry_keys.as_ref().map(|ks| ks.contains(k)).unwrap_or(true))
            .filter(|(_, entry)| {
                filters
                    .map(|fs| fs.iter().all(|f| matches_filter(&entry.payload, f)))
                    .unwrap_or(true)
            })
            .map(|(k, entry)| {
                (
                    k.clone(),
                    entry.payload.clone(),
                    entry.updated_at,
                    entry.version.clone(),
                )
            })
            .collect()
    }

    fn select(&self, model: &str, q: &Value) -> Vec<(String, Value, i64, String)> {
        let mut rows = self.filtered(model, q);
        match q.get("orderBy") {
            Some(order) => {
                let field = order.get("field").and_then(Value::as_str).unwrap_or("");
                let desc = order.get("direction").and_then(Value::as_str) == Some("desc");
                rows.sort_by(|a, b| {
                    let ord = match (a.1.get(field), b.1.get(field)) {
                        (None, None) => Ordering::Equal,
                        (None, Some(_)) => return Ordering::Greater,
                        (Some(_), None) => return Ordering::Less,
                        (left, right) => compare(left, right).unwrap_or(Ordering::Equal),
                    };
                    let directed = if desc { ord.reverse() } else { ord };
                    directed.then(a.0.cmp(&b.0))
                });
            }
            None => rows.sort_by(|a, b| b.2.cmp(&a.2).then(a.0.cmp(&b.0))),
        }
        let offset = q.get("offset").and_then(Value::as_i64).unwrap_or(0).max(0) as usize;
        let rows: Vec<_> = rows.into_iter().skip(offset).collect();
        match q.get("limit").and_then(Value::as_i64) {
            Some(limit) if limit >= 0 => rows.into_iter().take(limit as usize).collect(),
            _ => rows,
        }
    }
}

fn matches_filter(payload: &Value, filter: &Value) -> bool {
    let field = match filter.get("field").and_then(Value::as_str) {
        Some(f) => f,
        None => return false,
    };
    let op = filter.get("op").and_then(Value::as_str).unwrap_or("");
    let target = filter.get("value").unwrap_or(&Value::Null);
    let fv = match payload.get(field) {
        Some(v) => v,
        None => return op == "ne",
    };
    match op {
        "eq" => eq(fv, target),
        "ne" => !eq(fv, target),
        "like" => match (fv.as_str(), target.as_str()) {
            (Some(h), Some(n)) => h.to_lowercase().contains(&n.to_lowercase()),
            _ => false,
        },
        "lt" | "lte" | "gt" | "gte" => match compare(Some(fv), Some(target)) {
            Some(o) => match op {
                "lt" => o == Ordering::Less,
                "lte" => o != Ordering::Greater,
                "gt" => o == Ordering::Greater,
                _ => o != Ordering::Less,
            },
            None => false,
        },
        _ => false,
    }
}

fn eq(a: &Value, b: &Value) -> bool {
    match (a.as_f64(), b.as_f64()) {
        (Some(x), Some(y)) => x == y,
        _ => a == b,
    }
}

fn compare(a: Option<&Value>, b: Option<&Value>) -> Option<Ordering> {
    let (a, b) = (a?, b?);
    if let (Some(x), Some(y)) = (a.as_f64(), b.as_f64()) {
        return x.partial_cmp(&y);
    }
    if let (Some(x), Some(y)) = (a.as_str(), b.as_str()) {
        return Some(x.cmp(y));
    }
    None
}
