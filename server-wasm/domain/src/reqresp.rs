//! Plain request/response/job types mirroring the WIT `routes`/`jobs` records,
//! decoupled from the generated bindings so the domain compiles and tests on the
//! host target. The guest converts WIT records ↔ these.

use serde::Serialize;
use serde_json::{json, Value};

use crate::error::AppError;

/// One route the guest serves (mirrors WIT `route-spec`).
#[derive(Debug, Clone)]
pub struct RouteSpec {
    pub route_id: &'static str,
    pub method: &'static str,
    pub path: &'static str,
}

/// One inbound request (mirrors WIT `route-request`).
#[derive(Debug, Clone, Default)]
pub struct RouteRequest {
    pub route_id: String,
    pub method: String,
    pub path: String,
    pub headers: Vec<(String, String)>,
    pub query: Vec<(String, String)>,
    pub body: String,
    pub context_json: String,
}

impl RouteRequest {
    /// Case-insensitive header lookup (HTTP header names are case-insensitive).
    pub fn header(&self, name: &str) -> Option<&str> {
        self.headers
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case(name))
            .map(|(_, v)| v.as_str())
    }

    /// First query value for `name` (ordered pairs preserve duplicates).
    pub fn query_value(&self, name: &str) -> Option<&str> {
        self.query
            .iter()
            .find(|(k, _)| k == name)
            .map(|(_, v)| v.as_str())
    }

    /// Parses the JSON body, mapping a malformed body to a 400.
    pub fn json_body(&self) -> Result<Value, AppError> {
        if self.body.trim().is_empty() {
            return Ok(Value::Null);
        }
        serde_json::from_str(&self.body).map_err(|e| {
            AppError::bad_request("request body is not valid JSON").with_internal(e.to_string())
        })
    }

    /// Bearer token from the `Authorization` header, if present.
    pub fn bearer_token(&self) -> Option<&str> {
        self.header("authorization")
            .and_then(|v| {
                v.strip_prefix("Bearer ")
                    .or_else(|| v.strip_prefix("bearer "))
            })
            .map(str::trim)
    }
}

/// The response envelope (mirrors WIT `route-response`).
#[derive(Debug, Clone)]
pub struct RouteResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: String,
}

impl RouteResponse {
    pub fn json<T: Serialize>(status: u16, value: &T) -> Self {
        let (status, body) = match serde_json::to_string(value) {
            Ok(body) => (status, body),
            Err(_) => (
                500,
                r#"{"error":{"code":"internal_error","message":"cannot encode response"}}"#
                    .to_string(),
            ),
        };
        Self {
            status,
            headers: vec![
                ("content-type".to_string(), "application/json".to_string()),
                (
                    "x-robots-tag".to_string(),
                    "noindex, nofollow, nosnippet".to_string(),
                ),
            ],
            body,
        }
    }

    pub fn ok<T: Serialize>(value: &T) -> Self {
        Self::json(200, value)
    }

    pub fn with_header(mut self, name: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers.push((name.into(), value.into()));
        self
    }
}

/// Job execution status (mirrors WIT `job-status`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum JobStatus {
    Succeeded,
    Failed,
    Retryable,
}

#[cfg(test)]
mod response_tests {
    use super::RouteResponse;

    #[test]
    fn serialization_failure_is_an_internal_error_not_an_empty_success() {
        struct Unencodable;
        impl serde::Serialize for Unencodable {
            fn serialize<S: serde::Serializer>(&self, _: S) -> Result<S::Ok, S::Error> {
                Err(serde::ser::Error::custom("sensitive serialization detail"))
            }
        }
        let response = RouteResponse::ok(&Unencodable);
        assert_eq!(response.status, 500);
        let body: serde_json::Value = serde_json::from_str(&response.body).unwrap();
        assert_eq!(body["error"]["code"], "internal_error");
        assert!(!response.body.contains("sensitive"));
    }

    #[test]
    fn application_errors_keep_internal_details_out_of_transport() {
        let response = crate::error::AppError::bad_request("invalid input")
            .with_internal("sensitive host detail")
            .into_response();
        assert_eq!(response.status, 400);
        let body: serde_json::Value = serde_json::from_str(&response.body).unwrap();
        assert_eq!(body["error"]["message"], "invalid input");
        assert!(!response.body.contains("sensitive"));
    }

    #[test]
    fn json_responses_are_explicitly_non_indexable() {
        let response = RouteResponse::ok(&serde_json::json!({"ok": true}));
        assert!(response.headers.iter().any(|(name, value)| {
            name == "x-robots-tag" && value == "noindex, nofollow, nosnippet"
        }));
    }
}

/// One job the guest runs (mirrors WIT `job-spec`).
#[derive(Debug, Clone)]
pub struct JobSpec {
    pub job_id: &'static str,
}

/// One scheduled invocation (mirrors WIT `job-execution`).
#[derive(Debug, Clone, Default)]
pub struct JobExecution {
    pub job_id: String,
    pub metadata_json: String,
    pub attempt: u32,
}

impl JobExecution {
    pub fn metadata(&self) -> Value {
        if self.metadata_json.trim().is_empty() {
            return Value::Object(Default::default());
        }
        serde_json::from_str(&self.metadata_json).unwrap_or(Value::Null)
    }
}

/// The job result (mirrors WIT `job-outcome`).
#[derive(Debug, Clone)]
pub struct JobOutcome {
    pub status: JobStatus,
    pub details_json: String,
}

impl JobOutcome {
    pub fn succeeded(details: Value) -> Self {
        Self {
            status: JobStatus::Succeeded,
            details_json: details.to_string(),
        }
    }
    pub fn retryable(reason: impl Into<String>) -> Self {
        Self {
            status: JobStatus::Retryable,
            details_json: serde_json::json!({ "retryable": reason.into() }).to_string(),
        }
    }
    pub fn failed(reason: impl Into<String>) -> Self {
        Self {
            status: JobStatus::Failed,
            details_json: serde_json::json!({ "failed": reason.into() }).to_string(),
        }
    }
}

impl AppError {
    /// Renders the public error envelope `{ "error": { code, message } }`.
    pub fn into_response(self) -> RouteResponse {
        RouteResponse::json(
            self.status,
            &json!({ "error": { "code": self.code, "message": self.message } }),
        )
    }
}
