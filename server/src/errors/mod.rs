pub mod codes;
pub mod validation;

use axum::http::StatusCode;
use serde::Serialize;

pub use codes::ErrorCode;

#[derive(Debug, Serialize)]
pub struct ErrorDetail {
    pub code: String,
    pub message: String,
    /// Whether the client should retry this request (matches Go server API)
    pub retryable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: ErrorDetail,
}

pub fn error_response(
    code: ErrorCode,
    message: Option<String>,
    details: Option<serde_json::Value>,
) -> (StatusCode, ErrorResponse) {
    let status = code.http_status();
    let body = ErrorResponse {
        error: ErrorDetail {
            code: code.as_str().to_string(),
            message: message.unwrap_or_else(|| code.default_message().to_string()),
            retryable: code.is_retryable(),
            details,
        },
    };
    (status, body)
}

pub fn http_status_for_code(code: &str) -> StatusCode {
    codes::ErrorCode::from_string(code)
        .map(|c| c.http_status())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR)
}
