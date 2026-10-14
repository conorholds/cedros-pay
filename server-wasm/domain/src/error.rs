//! Application errors with sanitized client mapping.
//!
//! `AppError` carries a public `code`/`message` (safe to return) and an optional
//! `internal` detail retained only in memory and never serialized to
//! the client — matching the host runtime's own trap sanitization.

use crate::host_error::HostError;

#[derive(Debug, Clone)]
pub struct AppError {
    pub status: u16,
    pub code: &'static str,
    pub message: String,
    pub internal: Option<String>,
}

pub type AppResult<T> = Result<T, AppError>;

impl AppError {
    pub fn new(status: u16, code: &'static str, message: impl Into<String>) -> Self {
        Self {
            status,
            code,
            message: message.into(),
            internal: None,
        }
    }

    /// Attaches an in-memory diagnostic; never log or serialize raw downstream text.
    pub fn with_internal(mut self, internal: impl Into<String>) -> Self {
        self.internal = Some(internal.into());
        self
    }

    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::new(400, "bad_request", message)
    }
    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::new(401, "unauthorized", message)
    }
    pub fn forbidden(message: impl Into<String>) -> Self {
        Self::new(403, "forbidden", message)
    }
    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new(404, "not_found", message)
    }
    pub fn conflict(message: impl Into<String>) -> Self {
        Self::new(409, "conflict", message)
    }
    pub fn unprocessable(message: impl Into<String>) -> Self {
        Self::new(422, "unprocessable", message)
    }
    pub fn too_many(message: impl Into<String>) -> Self {
        Self::new(429, "rate_limited", message)
    }
    pub fn internal(message: impl Into<String>) -> Self {
        Self::new(500, "internal_error", message)
    }
}

/// A failed host import becomes a 500 with the raw cause kept internal.
impl From<HostError> for AppError {
    fn from(error: HostError) -> Self {
        AppError::internal("a backend dependency failed").with_internal(error.message)
    }
}
