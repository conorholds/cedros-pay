//! Adapts the generated wasm host imports to the domain `HostSeams` trait. Each
//! interface has its own generated `host-error`; we flatten them to the domain
//! `HostError`. The wall clock comes from the always-available WASI clock.

use std::time::{SystemTime, UNIX_EPOCH};

use cedros_pay_extension_domain::{HostError, HostResult, HostSeams};

use crate::cedros::extension::{
    crm_source_events, customer_tags, database, http, logging, providers, secrets, settings,
    telemetry,
};

pub struct HostAdapter;

/// Flattens any generated per-interface `host-error` (each a `{ message }`
/// record) into the domain `HostError`.
macro_rules! map_err {
    ($expr:expr) => {
        $expr.map_err(|e| HostError::new(e.message))
    };
}

impl HostSeams for HostAdapter {
    fn service_invoke(
        &self,
        request: &cedros_pay_extension_domain::seams::ServiceRequest,
    ) -> HostResult<cedros_pay_extension_domain::RouteResponse> {
        use crate::cedros::extension::extension_services;
        let response = extension_services::invoke(&extension_services::ServiceRequest {
            target_extension_id: request.target_extension_id.clone(),
            route_id: request.route_id.clone(),
            capability_id: request.capability_id.clone(),
            method: request.method.clone(),
            path: request.path.clone(),
            query: request.query.clone(),
            body_json: request.body_json.clone(),
        })
        .map_err(|_| HostError::new("extension service invocation failed"))?;
        Ok(cedros_pay_extension_domain::RouteResponse {
            status: response.status,
            headers: response.headers,
            body: response.body,
        })
    }

    fn log(&self, level: &str, message: &str) {
        logging::log(level, message);
    }

    fn now_unix_secs(&self) -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0)
    }

    fn db_read(&self, access: &str, model: &str, query_json: &str) -> HostResult<String> {
        map_err!(database::read(access, model, query_json))
    }
    fn db_count(&self, access: &str, model: &str, query_json: &str) -> HostResult<String> {
        map_err!(database::count(access, model, query_json))
    }
    fn db_write(
        &self,
        access: &str,
        model: &str,
        key: &str,
        data_json: &str,
    ) -> HostResult<String> {
        map_err!(database::write(access, model, key, data_json))
    }
    fn db_delete(&self, access: &str, model: &str, key: &str) -> HostResult<String> {
        map_err!(database::delete(access, model, key))
    }
    fn db_batch(&self, access: &str, ops_json: &str) -> HostResult<String> {
        map_err!(database::batch(access, ops_json))
    }
    fn db_compare_and_set(&self, access: &str, request_json: &str) -> HostResult<String> {
        match database::compare_and_set(access, request_json).map_err(|error| {
            logging::log(
                "warn",
                &format!(
                    "database compare-and-set failed category={} code={}",
                    database_failure_category(&error.category),
                    database_failure_code(&error.code)
                ),
            );
            HostError::new(error.message)
        })? {
            database::CasOutcome::Applied(result) => Ok(result),
            database::CasOutcome::Conflict(conflict) => serde_json::to_string(&serde_json::json!({
                "outcome": "conflict",
                "conflict": {
                    "conditionIndex": conflict.condition_index,
                    "contentModelId": conflict.content_model_id,
                    "entryKey": conflict.entry_key,
                    "predicate": conflict.predicate,
                }
            }))
            .map_err(|error| HostError::new(error.to_string())),
        }
    }
    fn db_migrate(&self, access: &str, model: &str, mode: &str) -> HostResult<String> {
        map_err!(database::migrate(access, model, mode))
    }

    fn setting_get(&self, key: &str) -> HostResult<Option<String>> {
        map_err!(settings::get(key))
    }
    fn setting_set(&self, key: &str, value: &str) -> HostResult<()> {
        map_err!(settings::set(key, value))
    }
    fn settings_all(&self) -> HostResult<String> {
        map_err!(settings::list_all())
    }

    fn secret_get(&self, key: &str) -> HostResult<Option<String>> {
        map_err!(secrets::get(key))
    }
    fn secret_set(&self, key: &str, value: &str) -> HostResult<()> {
        map_err!(secrets::set(key, value))
    }
    fn secret_delete(&self, key: &str) -> HostResult<bool> {
        map_err!(secrets::delete(key))
    }

    fn emit_event(&self, event_id: &str, label: &str, metadata_json: &str) -> HostResult<()> {
        map_err!(telemetry::emit_event(event_id, label, metadata_json))
    }
    fn emit_record(
        &self,
        category: &str,
        title: &str,
        text: &str,
        payload_json: &str,
    ) -> HostResult<()> {
        map_err!(telemetry::emit_record(category, title, text, payload_json))
    }

    fn tag_assign(
        &self,
        access: &str,
        profile: &str,
        slug: &str,
        payload_json: &str,
    ) -> HostResult<String> {
        map_err!(customer_tags::assign(access, profile, slug, payload_json))
    }
    fn tag_unassign(&self, access: &str, profile: &str, slug: &str) -> HostResult<String> {
        map_err!(customer_tags::unassign(access, profile, slug))
    }
    fn tag_read(&self, access: &str, profile: &str) -> HostResult<String> {
        map_err!(customer_tags::read(access, profile))
    }

    fn crm_submit(
        &self,
        access: &str,
        source_kind: &str,
        event_type: &str,
        payload_json: &str,
    ) -> HostResult<()> {
        // The host returns an attribution-outcome JSON string; the domain does
        // not consume it (callers only check for failure), so discard it.
        map_err!(crm_source_events::submit(
            access,
            source_kind,
            event_type,
            payload_json
        ))
        .map(|_| ())
    }

    fn provider_execute(
        &self,
        access: &str,
        provider: &str,
        operation: &str,
        payload_json: &str,
    ) -> HostResult<String> {
        map_err!(providers::execute(
            access,
            provider,
            operation,
            payload_json
        ))
    }

    fn http_fetch(&self, request_json: &str) -> HostResult<String> {
        map_err!(http::fetch(request_json))
    }
}

fn database_failure_code(code: &str) -> &'static str {
    match code {
        "cedros.storage.database" => "cedros.storage.database",
        "cedros.storage.migration" => "cedros.storage.migration",
        "cedros.storage.json" => "cedros.storage.json",
        "cedros.storage.io" => "cedros.storage.io",
        "cedros.storage.generic" => "cedros.storage.generic",
        "cedros.contract.verification_failed" => "cedros.contract.verification_failed",
        "cedros.schema.breaking_change" => "cedros.schema.breaking_change",
        "cedros.permission.denied" => "cedros.permission.denied",
        "cedros.request.invalid" => "cedros.request.invalid",
        "cedros.extension.runtime" => "cedros.extension.runtime",
        "cedros.extension.data_conflict" => "cedros.extension.data_conflict",
        "cedros.collection.not_found" => "cedros.collection.not_found",
        _ => "unknown",
    }
}

fn database_failure_category(category: &str) -> &'static str {
    match category {
        "validation_failed" => "validation_failed",
        "not_found" => "not_found",
        "rate_limited" => "rate_limited",
        "conflict" => "conflict",
        "storage_failed" => "storage_failed",
        "host_runtime_failed" => "host_runtime_failed",
        _ => "unknown",
    }
}

#[cfg(test)]
mod tests {
    use super::{database_failure_category, database_failure_code};

    #[test]
    fn database_diagnostics_keep_only_published_categories() {
        for category in [
            "validation_failed",
            "not_found",
            "rate_limited",
            "conflict",
            "storage_failed",
            "host_runtime_failed",
        ] {
            assert_eq!(database_failure_category(category), category);
        }
        assert_eq!(
            database_failure_category("never-log-private-category"),
            "unknown"
        );
        assert_eq!(database_failure_category(""), "unknown");
        assert_eq!(
            database_failure_code("cedros.contract.verification_failed"),
            "cedros.contract.verification_failed"
        );
        assert_eq!(
            database_failure_code("cedros.storage.database"),
            "cedros.storage.database"
        );
        assert_eq!(database_failure_code("never-log-private-code"), "unknown");
        assert_eq!(database_failure_code(""), "unknown");
    }
}
