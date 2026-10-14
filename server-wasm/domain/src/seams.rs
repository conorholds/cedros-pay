//! The host-capability seam.
//!
//! A trait mirroring the `cedros:extension` WIT imports one-to-one. All domain
//! logic is generic over `HostSeams`, so it is fully testable with an in-memory
//! fake; the guest crate implements it against the real wasm host imports.
//!
//! Method names mirror the WIT interfaces: `db_*` → `database`, `setting_*` →
//! `settings`, `secret_*` → `secrets`, `emit_*` → `telemetry`, `tag_*` →
//! `customer-tags`, `crm_submit` → `crm-source-events`,
//! `provider_execute` → `providers`, `http_fetch` → `http`.

pub use crate::host_error::{HostError, HostResult};

/// Every host capability the guest may use. The guest passes a `&S: HostSeams`
/// into the domain entry points; tests pass `crate::fake::FakeSeams`.
///
/// Granting: `logging`/`secrets`/`http` are always linked; `database`,
/// `settings`, `telemetry`, `providers`, `customer-tags`, and
/// `crm-source-events` are linked only when the manifest declares them. Egress
/// (`http_fetch`) additionally requires the operator allowlist.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceRequest {
    pub target_extension_id: String,
    pub route_id: String,
    pub capability_id: String,
    pub method: String,
    pub path: String,
    pub query: Vec<(String, String)>,
    pub body_json: String,
}

pub trait HostSeams {
    /// Host-fixed caller identity; never an HTTP request carrying forwarded credentials.
    fn service_invoke(
        &self,
        _request: &ServiceRequest,
    ) -> HostResult<crate::reqresp::RouteResponse> {
        Err(HostError::new("extension service transport unavailable"))
    }

    fn log(&self, level: &str, message: &str);

    /// Wall-clock seconds since the Unix epoch. The guest reads the WASI clock
    /// (`std::time::SystemTime`); tests return a controllable fixed value. Not a
    /// WIT import — clocks are part of the always-available WASI context.
    fn now_unix_secs(&self) -> i64;

    // database — `{entries}` / `{count}` / `{entry}` / `{removed}` / `{applied}`
    // / `{collectionName}` JSON per 06-site-database-postgres-access.md.
    fn db_read(
        &self,
        access_id: &str,
        content_model_id: &str,
        query_json: &str,
    ) -> HostResult<String>;
    fn db_count(
        &self,
        access_id: &str,
        content_model_id: &str,
        query_json: &str,
    ) -> HostResult<String>;
    fn db_write(
        &self,
        access_id: &str,
        content_model_id: &str,
        entry_key: &str,
        data_json: &str,
    ) -> HostResult<String>;
    fn db_delete(
        &self,
        access_id: &str,
        content_model_id: &str,
        entry_key: &str,
    ) -> HostResult<String>;
    fn db_batch(&self, access_id: &str, ops_json: &str) -> HostResult<String>;
    fn db_compare_and_set(&self, _access_id: &str, _request_json: &str) -> HostResult<String> {
        Err(HostError::new("database compare-and-set unavailable"))
    }
    fn db_migrate(&self, access_id: &str, content_model_id: &str, mode: &str)
        -> HostResult<String>;

    // settings (per-extension JSON key/value)
    fn setting_get(&self, key: &str) -> HostResult<Option<String>>;
    fn setting_set(&self, key: &str, value: &str) -> HostResult<()>;
    fn settings_all(&self) -> HostResult<String>;

    // secrets (encrypted, isolated)
    fn secret_get(&self, key: &str) -> HostResult<Option<String>>;
    fn secret_set(&self, key: &str, value: &str) -> HostResult<()>;
    fn secret_delete(&self, key: &str) -> HostResult<bool>;

    // telemetry (analytics events + durable site-brain records)
    fn emit_event(&self, event_id: &str, label: &str, metadata_json: &str) -> HostResult<()>;
    fn emit_record(
        &self,
        category: &str,
        title: &str,
        text: &str,
        payload_json: &str,
    ) -> HostResult<()>;

    // customer-tags (validated CRM bridge)
    fn tag_assign(
        &self,
        access_id: &str,
        profile_id: &str,
        tag_slug: &str,
        payload_json: &str,
    ) -> HostResult<String>;
    fn tag_unassign(&self, access_id: &str, profile_id: &str, tag_slug: &str)
        -> HostResult<String>;
    fn tag_read(&self, access_id: &str, profile_id: &str) -> HostResult<String>;

    // crm-source-events (deterministic purchase-to-person attribution)
    fn crm_submit(
        &self,
        access_id: &str,
        source_kind: &str,
        event_type: &str,
        payload_json: &str,
    ) -> HostResult<()>;

    // providers (storage / intelligence / image / voice / email)
    fn provider_execute(
        &self,
        access_id: &str,
        provider: &str,
        operation: &str,
        payload_json: &str,
    ) -> HostResult<String>;

    // http (operator-allowlisted egress; inert without an allowlist entry)
    fn http_fetch(&self, request_json: &str) -> HostResult<String>;
}
