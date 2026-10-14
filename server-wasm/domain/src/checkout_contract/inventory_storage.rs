use serde::Serialize;

use crate::db::BatchOp;
use crate::error::{AppError, AppResult};

pub(super) fn write<T: Serialize>(model: &'static str, key: &str, value: &T) -> AppResult<BatchOp> {
    Ok(BatchOp::Write {
        content_model_id: model,
        entry_key: key.into(),
        data: serde_json::to_value(value).map_err(|error| {
            AppError::internal("cannot encode checkout inventory state")
                .with_internal(error.to_string())
        })?,
    })
}
