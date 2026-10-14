use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedEntryVersion;

pub(super) fn written_version(entries: Vec<GuardedEntryVersion>) -> AppResult<String> {
    entries
        .into_iter()
        .next()
        .map(|entry| entry.version)
        .ok_or_else(|| AppError::internal("checkout operation write omitted its version"))
}

pub(super) fn required_version(version: &Option<String>) -> AppResult<String> {
    version
        .clone()
        .filter(|version| !version.is_empty())
        .ok_or_else(|| AppError::internal("checkout operation is missing its version fence"))
}
