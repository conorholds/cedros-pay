use crate::error::{AppError, AppResult};

pub(super) const MAX_IDENTIFIER_LEN: usize = 256;

pub(super) fn identifier(value: &str, label: &str) -> AppResult<()> {
    if value.trim().is_empty() || value.len() > MAX_IDENTIFIER_LEN {
        return Err(AppError::unprocessable(format!(
            "{label} must be 1..={MAX_IDENTIFIER_LEN} characters"
        )));
    }
    Ok(())
}

pub(super) fn query_identifier(value: &str, label: &str) -> AppResult<()> {
    if value.trim().is_empty() || value.len() > MAX_IDENTIFIER_LEN {
        return Err(AppError::bad_request(format!(
            "{label} must be 1..={MAX_IDENTIFIER_LEN} characters"
        )));
    }
    Ok(())
}

/// Validates and normalizes a caller-supplied ISO-style currency code.
/// Omitted currencies are handled by the caller and continue to use the account
/// currency (or USD when creating a new account).
pub(super) fn supplied_currency(value: &str) -> AppResult<String> {
    let trimmed = value.trim();
    if trimmed.len() != 3 || !trimmed.bytes().all(|byte| byte.is_ascii_alphabetic()) {
        return Err(AppError::unprocessable(
            "currency must be a three-letter ASCII code",
        ));
    }
    Ok(trimmed.to_ascii_uppercase())
}
