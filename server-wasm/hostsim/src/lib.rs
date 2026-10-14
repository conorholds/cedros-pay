//! Wasmtime load+serve harness for the Cedros Pay extension component.
//!
//! Links the compiled component through the same component-model runtime + WIT
//! the cedros-data host WIT uses (component-model + async), backs the
//! host imports with an in-memory [`store::SimStore`], and drives the exported
//! `routes`/`jobs`. A fresh `Store` per call mirrors the host's per-request
//! instance; the `SimStore` is shared across calls (the "site database").

use std::path::Path;
use std::sync::{Arc, Mutex};

use wasmtime::component::{Component, HasSelf, Linker, ResourceTable};
use wasmtime::{Config, Engine, Store, StoreLimits, StoreLimitsBuilder};

const INVOCATION_FUEL: u64 = 1_000_000_000;
use wasmtime_wasi::{WasiCtx, WasiCtxBuilder, WasiCtxView, WasiView};

mod store;
pub use store::SimStore;

wasmtime::component::bindgen!({
    path: "../guest/wit/cedros-extension.wit",
    world: "extension",
    imports: { default: async },
    exports: { default: async },
});

use cedros::extension::controls_privacy::{Host as PrivacyHost, HostError as PrivacyErr};
use cedros::extension::crm_source_events::{Host as CrmHost, HostError as CrmErr};
use cedros::extension::customer_tags::{Host as TagsHost, HostError as TagsErr};
use cedros::extension::database::{
    CasConflict, CasError, CasOutcome, Host as DbHost, HostError as DbErr,
};
use cedros::extension::http::{Host as HttpHost, HostError as HttpErr};
use cedros::extension::logging::Host as LogHost;
use cedros::extension::providers::{Host as ProvHost, HostError as ProvErr};
use cedros::extension::secrets::{Host as SecHost, HostError as SecErr};
use cedros::extension::settings::{Host as SetHost, HostError as SetErr};
use cedros::extension::telemetry::{Host as TelHost, HostError as TelErr};
use exports::cedros::extension::jobs::{JobExecution, JobOutcome, JobSpec};
use exports::cedros::extension::routes::{RouteRequest, RouteResponse, RouteSpec};

/// Per-instance host state: a fresh WASI context + resource table per call, plus
/// the shared in-memory store.
struct HostState {
    store: Arc<Mutex<SimStore>>,
    wasi: WasiCtx,
    table: ResourceTable,
    limits: StoreLimits,
}

impl WasiView for HostState {
    fn ctx(&mut self) -> WasiCtxView<'_> {
        WasiCtxView {
            ctx: &mut self.wasi,
            table: &mut self.table,
        }
    }
}

impl HostState {
    fn db(&self) -> std::sync::MutexGuard<'_, SimStore> {
        self.store.lock().expect("store lock")
    }
}

impl cedros::extension::extension_services::Host for HostState {
    async fn invoke(
        &mut self,
        request: cedros::extension::extension_services::ServiceRequest,
    ) -> Result<
        cedros::extension::extension_services::ServiceResponse,
        cedros::extension::extension_services::HostError,
    > {
        let mut db = self.db();
        db.service_requests.push(serde_json::json!({"targetExtensionId":request.target_extension_id,"routeId":request.route_id,"capabilityId":request.capability_id,"method":request.method,"path":request.path,"query":request.query,"bodyJson":request.body_json}));
        let (status, body) = db.service_responses.pop_front().ok_or_else(|| {
            cedros::extension::extension_services::HostError {
                code: "cedros.capability.unavailable".into(),
                category: "host_runtime_failed".into(),
                message: "service unavailable".into(),
            }
        })?;
        Ok(cedros::extension::extension_services::ServiceResponse {
            status,
            body,
            headers: vec![],
        })
    }
}

impl PrivacyHost for HostState {
    async fn bind(&mut self, _scope_json: String) -> Result<(), PrivacyErr> {
        Ok(())
    }

    async fn drain(&mut self, _policy_json: String) -> Result<(), PrivacyErr> {
        Ok(())
    }
}

impl LogHost for HostState {
    async fn log(&mut self, level: String, message: String) {
        self.db().logs.push((level, message));
    }
}

impl DbHost for HostState {
    async fn read(&mut self, _a: String, model: String, q: String) -> Result<String, DbErr> {
        let delay = self.db().db_read_delay_millis.min(30_000);
        if delay > 0 {
            // Never hold the simulated database mutex over the injected wait.
            tokio::time::sleep(std::time::Duration::from_millis(delay)).await;
        }
        self.db()
            .read(&model, &q)
            .map_err(|message| DbErr { message })
    }
    async fn count(&mut self, _a: String, model: String, q: String) -> Result<String, DbErr> {
        self.db()
            .count(&model, &q)
            .map_err(|message| DbErr { message })
    }
    async fn write(
        &mut self,
        _a: String,
        model: String,
        key: String,
        data: String,
    ) -> Result<String, DbErr> {
        self.db()
            .write(&model, &key, &data)
            .map_err(|message| DbErr { message })
    }
    async fn delete(&mut self, _a: String, model: String, key: String) -> Result<String, DbErr> {
        self.db()
            .delete(&model, &key)
            .map_err(|message| DbErr { message })
    }
    async fn batch(&mut self, _a: String, ops: String) -> Result<String, DbErr> {
        self.db().batch(&ops).map_err(|message| DbErr { message })
    }
    async fn compare_and_set(
        &mut self,
        _a: String,
        request: String,
    ) -> Result<CasOutcome, CasError> {
        let raw = self.db().batch(&request).map_err(|message| CasError {
            code: "cedros.storage.failed".into(),
            category: "storage_failed".into(),
            message,
        })?;
        let value: serde_json::Value = serde_json::from_str(&raw).map_err(|_| CasError {
            code: "cedros.host.invalid_response".into(),
            category: "host_runtime_failed".into(),
            message: "hostsim produced malformed compare-and-set output".into(),
        })?;
        if value["outcome"] == "applied" {
            return Ok(CasOutcome::Applied(raw));
        }
        let conflict = &value["conflict"];
        Ok(CasOutcome::Conflict(CasConflict {
            condition_index: conflict["conditionIndex"].as_u64().unwrap_or_default() as u32,
            content_model_id: conflict["contentModelId"]
                .as_str()
                .unwrap_or_default()
                .into(),
            entry_key: conflict["entryKey"].as_str().unwrap_or_default().into(),
            predicate: conflict["predicate"].as_str().unwrap_or_default().into(),
        }))
    }
    async fn migrate(&mut self, _a: String, model: String, _mode: String) -> Result<String, DbErr> {
        self.db()
            .migrate(&model)
            .map_err(|message| DbErr { message })
    }
}

impl SetHost for HostState {
    async fn get(&mut self, key: String) -> Result<Option<String>, SetErr> {
        Ok(self.db().setting_get(&key))
    }
    async fn set(&mut self, key: String, value: String) -> Result<(), SetErr> {
        self.db().set_setting(&key, &value);
        Ok(())
    }
    async fn list_all(&mut self) -> Result<String, SetErr> {
        Ok("{}".to_string())
    }
}

impl SecHost for HostState {
    async fn get(&mut self, key: String) -> Result<Option<String>, SecErr> {
        Ok(self.db().secret_get(&key))
    }
    async fn set(&mut self, key: String, value: String) -> Result<(), SecErr> {
        self.db().set_secret(&key, &value);
        Ok(())
    }
    async fn delete(&mut self, _key: String) -> Result<bool, SecErr> {
        Ok(false)
    }
}

impl TelHost for HostState {
    async fn emit_event(
        &mut self,
        event_id: String,
        label: String,
        _m: String,
    ) -> Result<(), TelErr> {
        self.db().events.push((event_id, label));
        Ok(())
    }
    async fn emit_record(
        &mut self,
        _c: String,
        _t: String,
        _x: String,
        _p: String,
    ) -> Result<(), TelErr> {
        Ok(())
    }
}

impl TagsHost for HostState {
    async fn assign(
        &mut self,
        _a: String,
        profile: String,
        slug: String,
        _p: String,
    ) -> Result<String, TagsErr> {
        self.db().tags.push((profile, slug, "assign".into()));
        Ok("{\"assigned\":true}".to_string())
    }
    async fn unassign(
        &mut self,
        _a: String,
        profile: String,
        slug: String,
    ) -> Result<String, TagsErr> {
        self.db().tags.push((profile, slug, "unassign".into()));
        Ok("{\"removed\":true}".to_string())
    }
    async fn read(&mut self, _a: String, _profile: String) -> Result<String, TagsErr> {
        Ok("{\"tags\":[]}".to_string())
    }
}

impl CrmHost for HostState {
    async fn submit(
        &mut self,
        _a: String,
        source_kind: String,
        event_type: String,
        _p: String,
    ) -> Result<String, CrmErr> {
        // Mirrors the host: returns the attribution-outcome JSON the guest
        // discards. Records nothing the guest can observe (submit is fire-and-
        // forget from the guest's side).
        Ok(format!(
            "{{\"attached\":true,\"sourceKind\":\"{source_kind}\",\"eventType\":\"{event_type}\"}}"
        ))
    }
}

impl ProvHost for HostState {
    async fn execute(
        &mut self,
        access_id: String,
        provider: String,
        op: String,
        _p: String,
    ) -> Result<String, ProvErr> {
        self.db().provider_calls += 1;
        Ok(format!(
            "{{\"accessId\":\"{access_id}\",\"provider\":\"{provider}\",\"operation\":\"{op}\",\"ok\":true}}"
        ))
    }

    async fn resolve_default(
        &mut self,
        _access_id: String,
        provider: String,
        _operation: String,
    ) -> Result<String, ProvErr> {
        self.db().provider_calls += 1;
        Ok(format!(
            "{{\"status\":\"configured\",\"provider\":\"{provider}\",\"model\":\"hostsim\"}}"
        ))
    }
}

impl HttpHost for HostState {
    async fn fetch(&mut self, request_json: String) -> Result<String, HttpErr> {
        self.db()
            .http_fetch(&request_json)
            .map_err(|message| HttpErr { message })
    }
}

/// A loaded component plus its shared store, ready to serve.
pub struct Sim {
    engine: Engine,
    component: Component,
    store: Arc<Mutex<SimStore>>,
}

impl Sim {
    /// Loads the component from `path`. Mirrors the host engine config
    /// (component-model + async).
    pub fn load(path: &Path) -> anyhow::Result<Self> {
        Self::load_with_store(path, SimStore::new(0))
    }

    /// Loads the component with a restored verification-only store snapshot.
    pub fn load_with_store(path: &Path, store: SimStore) -> anyhow::Result<Self> {
        let mut config = Config::new();
        config.wasm_component_model(true);
        config.consume_fuel(true);
        // (async is always available for component calls in this runtime line.)
        let engine = Engine::new(&config)?;
        let component = Component::from_file(&engine, path)?;
        Ok(Self {
            engine,
            component,
            store: Arc::new(Mutex::new(store)),
        })
    }

    /// Mutable access to the shared store (seed data, set secrets, assert).
    pub fn store(&self) -> std::sync::MutexGuard<'_, SimStore> {
        self.store.lock().expect("store lock")
    }

    /// Builds the linker the way the host does: WASI + always-on
    /// logging/secrets/http + the manifest-granted database/settings/telemetry/
    /// customer-tags/crm-source-events/providers.
    fn linker(&self) -> anyhow::Result<Linker<HostState>> {
        let mut linker = Linker::<HostState>::new(&self.engine);
        wasmtime_wasi::p2::add_to_linker_async(&mut linker)?;
        cedros::extension::logging::add_to_linker::<_, HasSelf<_>>(&mut linker, |s| s)?;
        cedros::extension::controls_privacy::add_to_linker::<_, HasSelf<_>>(&mut linker, |s| s)?;
        cedros::extension::secrets::add_to_linker::<_, HasSelf<_>>(&mut linker, |s| s)?;
        cedros::extension::http::add_to_linker::<_, HasSelf<_>>(&mut linker, |s| s)?;
        cedros::extension::database::add_to_linker::<_, HasSelf<_>>(&mut linker, |s| s)?;
        cedros::extension::settings::add_to_linker::<_, HasSelf<_>>(&mut linker, |s| s)?;
        cedros::extension::telemetry::add_to_linker::<_, HasSelf<_>>(&mut linker, |s| s)?;
        cedros::extension::customer_tags::add_to_linker::<_, HasSelf<_>>(&mut linker, |s| s)?;
        cedros::extension::providers::add_to_linker::<_, HasSelf<_>>(&mut linker, |s| s)?;
        cedros::extension::crm_source_events::add_to_linker::<_, HasSelf<_>>(&mut linker, |s| s)?;
        cedros::extension::extension_services::add_to_linker::<_, HasSelf<_>>(&mut linker, |s| s)?;
        Ok(linker)
    }

    fn fresh_store(&self) -> Store<HostState> {
        let mut store = Store::new(
            &self.engine,
            HostState {
                store: self.store.clone(),
                wasi: WasiCtxBuilder::new().build(),
                table: ResourceTable::new(),
                limits: StoreLimitsBuilder::new()
                    .memory_size(256 * 1024 * 1024)
                    .build(),
            },
        );
        store.limiter(|state| &mut state.limits);
        store
            .set_fuel(INVOCATION_FUEL)
            .expect("fuel configured on test engine");
        store
    }

    async fn instantiate(&self, store: &mut Store<HostState>) -> anyhow::Result<Extension> {
        let linker = self.linker()?;
        Ok(Extension::instantiate_async(&mut *store, &self.component, &linker).await?)
    }

    /// `(route_id, method, path)` for every route the component serves.
    pub async fn list_routes(&self) -> anyhow::Result<Vec<(String, String, String)>> {
        let mut store = self.fresh_store();
        let bindings = self.instantiate(&mut store).await?;
        let specs: Vec<RouteSpec> = bindings
            .cedros_extension_routes()
            .call_list_routes(&mut store)
            .await?;
        Ok(specs
            .into_iter()
            .map(|s| (s.route_id, s.method, s.path))
            .collect())
    }

    /// Job ids for every job the component serves.
    pub async fn list_jobs(&self) -> anyhow::Result<Vec<String>> {
        let mut store = self.fresh_store();
        let bindings = self.instantiate(&mut store).await?;
        let specs: Vec<JobSpec> = bindings
            .cedros_extension_jobs()
            .call_list_jobs(&mut store)
            .await?;
        Ok(specs.into_iter().map(|spec| spec.job_id).collect())
    }

    /// Dispatches one request; returns `(status, body)`. (A wide signature is
    /// fine for a test driver — it mirrors the WIT route-request fields.)
    #[allow(clippy::too_many_arguments)]
    pub async fn handle(
        &self,
        method: &str,
        path: &str,
        route_id: &str,
        headers: Vec<(String, String)>,
        query: Vec<(String, String)>,
        body: &str,
        context_json: &str,
    ) -> anyhow::Result<(u16, String)> {
        let mut store = self.fresh_store();
        let bindings = self.instantiate(&mut store).await?;
        let request = RouteRequest {
            route_id: route_id.to_string(),
            method: method.to_string(),
            path: path.to_string(),
            headers,
            query,
            body: body.to_string(),
            context_json: context_json.to_string(),
        };
        let response: RouteResponse = bindings
            .cedros_extension_routes()
            .call_handle_route(&mut store, &request)
            .await?;
        self.store().last_fuel_consumed = INVOCATION_FUEL - store.get_fuel()?;
        Ok((response.status, response.body))
    }

    /// Runs one job; returns `(status, details_json)`.
    pub async fn run_job(
        &self,
        job_id: &str,
        metadata_json: &str,
        attempt: u32,
    ) -> anyhow::Result<(String, String)> {
        let mut store = self.fresh_store();
        let bindings = self.instantiate(&mut store).await?;
        let execution = JobExecution {
            job_id: job_id.to_string(),
            metadata_json: metadata_json.to_string(),
            attempt,
        };
        let outcome: JobOutcome = bindings
            .cedros_extension_jobs()
            .call_run_job(&mut store, &execution)
            .await?;
        use exports::cedros::extension::jobs::JobStatus;
        let status = match outcome.status {
            JobStatus::Succeeded => "succeeded",
            JobStatus::Failed => "failed",
            JobStatus::Retryable => "retryable",
        };
        Ok((status.to_string(), outcome.details_json))
    }
}

/// Path to the compiled component in the workspace target dir.
pub fn component_path() -> std::path::PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../target/wasm32-wasip2/release/cedros_pay_extension_guest.wasm")
}
