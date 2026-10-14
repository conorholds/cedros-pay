//! One-shot compiled-Wasm route adapter with an atomic file-backed hostsim snapshot.

use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use anyhow::{anyhow, Context};
use cedros_pay_extension_domain::{guarded_policy, ids};
use cedros_pay_extension_hostsim::{component_path, Sim, SimStore};
use serde::Deserialize;
use serde_json::{json, Value};

const MAX_INPUT_BYTES: u64 = 64 * 1024;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Invocation {
    now: i64,
    subject: String,
    #[serde(default)]
    catalog_resource: Option<String>,
    route: Route,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Route {
    route_id: String,
    method: String,
    path: String,
    #[serde(default)]
    headers: Vec<(String, String)>,
    #[serde(default)]
    query: Vec<(String, String)>,
    body: String,
    context_json: String,
}

#[tokio::main(flavor = "current_thread")]
async fn main() -> anyhow::Result<()> {
    let state_path = state_path()?;
    let invocation = read_invocation()?;
    validate(&invocation)?;
    let (mut envelope, store, fresh) = read_state(&state_path)?;
    let sim = Sim::load_with_store(&component_path(), store)?;
    {
        let mut store = sim.store();
        store.now = invocation.now;
        if fresh {
            bootstrap(&mut store, &invocation.subject);
        }
        if let Some(resource) = &invocation.catalog_resource {
            seed_catalog(&mut store, resource);
        }
        store.push_http(200, &current_user_response(&invocation.subject));
    }
    let route = invocation.route;
    let (status, body) = sim
        .handle(
            &route.method,
            &route.path,
            &route.route_id,
            route.headers,
            route.query,
            &route.body,
            &route.context_json,
        )
        .await?;
    envelope["hostsim"] = sim.store().snapshot().map_err(|message| anyhow!(message))?;
    write_state(&state_path, &envelope)?;
    println!("{}", json!({"status": status, "body": body}));
    Ok(())
}

fn current_user_response(subject: &str) -> String {
    json!({"user": {"id": subject}}).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn login_fixture_matches_current_user_contract() {
        assert_eq!(
            serde_json::from_str::<Value>(&current_user_response("user_42")).unwrap(),
            json!({"user": {"id": "user_42"}})
        );
    }
}

fn state_path() -> anyhow::Result<PathBuf> {
    let mut args = std::env::args_os().skip(1);
    if args.next().as_deref() != Some(std::ffi::OsStr::new("--state")) {
        return Err(anyhow!("--state is required"));
    }
    let path = args
        .next()
        .map(PathBuf::from)
        .ok_or_else(|| anyhow!("state path is required"))?;
    if args.next().is_some() {
        return Err(anyhow!("unexpected arguments"));
    }
    Ok(path)
}

fn read_invocation() -> anyhow::Result<Invocation> {
    let mut bytes = Vec::new();
    std::io::stdin()
        .take(MAX_INPUT_BYTES + 1)
        .read_to_end(&mut bytes)?;
    if bytes.is_empty() || bytes.len() as u64 > MAX_INPUT_BYTES {
        return Err(anyhow!("route invocation size is invalid"));
    }
    serde_json::from_slice(&bytes).context("route invocation is invalid")
}

fn validate(invocation: &Invocation) -> anyhow::Result<()> {
    if invocation.subject.is_empty()
        || invocation.subject.len() > 200
        || invocation.subject.chars().any(char::is_control)
        || invocation
            .catalog_resource
            .as_ref()
            .is_some_and(|resource| {
                !resource.starts_with("bridge-")
                    || resource.len() != 71
                    || !resource[7..].bytes().all(|byte| byte.is_ascii_hexdigit())
            })
    {
        return Err(anyhow!("route authority is invalid"));
    }
    Ok(())
}

fn read_state(path: &Path) -> anyhow::Result<(Value, SimStore, bool)> {
    match fs::read(path) {
        Ok(bytes) => {
            let envelope: Value = serde_json::from_slice(&bytes).context("state is invalid")?;
            if envelope["schemaVersion"] != 1 || !envelope["bridge"].is_object() {
                return Err(anyhow!("state schema is invalid"));
            }
            if envelope["hostsim"].is_null() {
                Ok((envelope, SimStore::new(0), true))
            } else {
                let store = SimStore::from_snapshot(envelope["hostsim"].clone())
                    .map_err(|message| anyhow!(message))?;
                Ok((envelope, store, false))
            }
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok((
            json!({"schemaVersion": 1, "bridge": {}, "hostsim": null}),
            SimStore::new(0),
            true,
        )),
        Err(error) => Err(error.into()),
    }
}

fn bootstrap(store: &mut SimStore, subject: &str) {
    store.set_setting("cedros_login.base_url", "https://login.invalid");
    store.set_setting(
        ids::SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS,
        r#"["https://shop.example.test"]"#,
    );
    store.set_secret(
        ids::SECRET_CHECKOUT_CONTEXT_MAC,
        "local-conformance-mac-material-32-bytes",
    );
    store.seed(
        guarded_policy::CONTROL_MODEL,
        guarded_policy::MARKER_KEY,
        json!({
            "schemaVersion": 1, "capabilityId": guarded_policy::CAPABILITY_ID,
            "minCedrosDataVersion": guarded_policy::MIN_DATA_VERSION,
            "requestSchemaVersion": guarded_policy::REQUEST_SCHEMA_VERSION,
            "hostCommit": guarded_policy::HOST_COMMIT, "models": guarded_policy::GUARDED_MODELS,
            "modelSetSha256": guarded_policy::MODEL_SET_SHA256,
            "policy": guarded_policy::ACTIVE_POLICY, "active": true,
            "hostTimestamp": "2026-07-11T00:00:00Z"
        }),
    );
    store.seed(
        ids::MODEL_CREDITS,
        &format!("acct:{subject}"),
        json!({"subjectId": subject, "balanceCents": 1_000_000_000i64,
            "heldCents": 0, "currency": "USD", "updatedAt": "2026-07-11T00:00:00Z"}),
    );
}

fn seed_catalog(store: &mut SimStore, resource: &str) {
    store.seed(
        ids::MODEL_CATALOG,
        resource,
        json!({"id": resource, "active": true, "public": true, "title": "Bridge fixture",
            "price": {"amountCents": 100, "currency": "USD"},
            "paymentResource": resource, "inventoryPolicy": "untracked"}),
    );
}

fn write_state(path: &Path, value: &Value) -> anyhow::Result<()> {
    let temporary = path.with_extension(format!("tmp-{}", std::process::id()));
    let result = (|| {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)?;
        file.write_all(&serde_json::to_vec(value)?)?;
        file.sync_all()?;
        fs::rename(&temporary, path)?;
        if let Some(parent) = path.parent() {
            fs::File::open(parent)?.sync_all()?;
        }
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(temporary);
    }
    result
}
