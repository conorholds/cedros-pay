use crate::error::{AppError, AppResult};

use super::record::OperationRecord;
use super::{Completion, DurableOutcome};

pub(super) fn validate_completion(completion: &Completion) -> AppResult<()> {
    match completion {
        Completion::Resolved(artifacts) => artifacts.validate(),
        Completion::Indeterminate {
            code,
            provider_artifacts,
        } => {
            validate_code(code)?;
            provider_artifacts.validate()
        }
        #[cfg(test)]
        Completion::Terminal { code } => validate_code(code),
        Completion::ProvenTerminal {
            code,
            outcome_proof,
        } => {
            validate_code(code)?;
            if super::artifacts::safe_proof(outcome_proof) {
                Ok(())
            } else {
                Err(AppError::bad_request("terminal proof is not a safe token"))
            }
        }
    }
}

pub(super) fn build_outcome(record: &OperationRecord, completion: Completion) -> DurableOutcome {
    match completion {
        Completion::Resolved(provider_artifacts) => DurableOutcome::Resolved {
            operation_id: record.operation_id.clone(),
            checkout_attempt_id: record.checkout_attempt_id.clone(),
            provider_artifacts,
            durable: true,
            replayed: false,
        },
        #[cfg(test)]
        Completion::Terminal { code } => terminal(code, None),
        Completion::ProvenTerminal {
            code,
            outcome_proof,
        } => terminal(code, Some(outcome_proof)),
        Completion::Indeterminate {
            code,
            provider_artifacts,
        } => DurableOutcome::Indeterminate {
            code,
            operation_id: record.operation_id.clone(),
            checkout_attempt_id: record.checkout_attempt_id.clone(),
            provider_artifacts,
            replayed: false,
        },
    }
}

fn terminal(code: String, outcome_proof: Option<String>) -> DurableOutcome {
    DurableOutcome::Terminal {
        code,
        durable: true,
        replayed: false,
        outcome_proof,
    }
}

pub(super) fn validate_code(code: &str) -> AppResult<()> {
    let valid = !code.is_empty()
        && code.len() <= 128
        && code
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'));
    if valid {
        Ok(())
    } else {
        Err(AppError::bad_request(
            "outcome code must be a safe opaque value",
        ))
    }
}
