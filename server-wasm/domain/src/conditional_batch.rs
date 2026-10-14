//! Typed boundary for Core-owned conditional `database.batch` operations.

use serde::Deserialize;
use serde_json::{json, Value};

use crate::error::{AppError, AppResult};
use crate::seams::{HostError, HostSeams};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConditionalBatchOutcome {
    applied: i64,
    results: Vec<ConditionalResult>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConditionalResult {
    operation_id: String,
    output: Value,
}

/// Executes exactly one named Core operation and validates its additive result.
pub fn execute<S: HostSeams>(
    seams: &S,
    access_id: &str,
    operation_id: &str,
    params: Value,
) -> AppResult<Value> {
    let payload = json!({
        "ops": [{
            "op": "conditional",
            "operationId": operation_id,
            "params": params,
        }]
    });
    let raw = seams
        .db_batch(access_id, &payload.to_string())
        .map_err(map_host_error)?;
    let outcome: ConditionalBatchOutcome = serde_json::from_str(&raw).map_err(|error| {
        AppError::internal("database returned an unexpected conditional batch shape")
            .with_internal(error.to_string())
    })?;
    if outcome.applied != 1 || outcome.results.len() != 1 {
        return Err(AppError::internal(
            "database returned an invalid conditional batch outcome",
        ));
    }
    let result = outcome.results.into_iter().next().expect("length checked");
    if result.operation_id != operation_id {
        return Err(AppError::internal(
            "database returned a mismatched conditional operation result",
        ));
    }
    Ok(result.output)
}

fn map_host_error(error: HostError) -> AppError {
    if error.message.starts_with("cedros.db.v1|") {
        return AppError::conflict("the resource changed; reload and try again")
            .with_internal(error.message);
    }
    AppError::from(error)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fake::FakeSeams;

    #[test]
    fn validates_the_named_result() {
        let seams = FakeSeams::new();
        seams.push_conditional_result("example.operation", json!({"ok": true}));

        let output = execute(
            &seams,
            "cedros-pay:test-db",
            "example.operation",
            json!({"entryKey": "example"}),
        )
        .unwrap();

        assert_eq!(output, json!({"ok": true}));
        assert_eq!(
            seams.last_db_batch_request().unwrap()["ops"][0]["op"],
            "conditional"
        );
    }

    #[test]
    fn maps_core_conflicts_to_http_conflicts() {
        let seams = FakeSeams::new();
        seams.push_conditional_error("cedros.db.v1|precondition|example.operation");

        let error =
            execute(&seams, "cedros-pay:test-db", "example.operation", json!({})).unwrap_err();

        assert_eq!(error.status, 409);
        assert_eq!(error.code, "conflict");
    }
}
