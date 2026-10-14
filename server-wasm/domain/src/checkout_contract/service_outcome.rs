use crate::error::AppResult;
use crate::seams::HostSeams;

use super::{CheckoutOutcome, Completion, DurableOutcome, OperationLease, ProviderArtifacts};

impl<S: HostSeams> super::CheckoutService<'_, S> {
    pub(super) fn commit_resolved(
        &self,
        lease: &OperationLease,
        session_id: String,
    ) -> AppResult<CheckoutOutcome> {
        let artifacts = session_artifacts(&session_id, "stripe-session-created");
        let outcome = self
            .ledger
            .complete(lease, Completion::Resolved(artifacts))?;
        Ok(checkout(outcome))
    }

    pub(super) fn commit_indeterminate(
        &self,
        lease: &OperationLease,
        code: &str,
        artifacts: ProviderArtifacts,
    ) -> AppResult<CheckoutOutcome> {
        self.ledger.complete(
            lease,
            Completion::Indeterminate {
                code: code.into(),
                provider_artifacts: artifacts,
            },
        )?;
        Ok(super::service::indeterminate(code))
    }
}

pub(super) fn checkout(outcome: DurableOutcome) -> CheckoutOutcome {
    resolved(outcome, true)
}

fn resolved(outcome: DurableOutcome, with_artifact: bool) -> CheckoutOutcome {
    match outcome {
        DurableOutcome::Resolved {
            operation_id,
            checkout_attempt_id,
            provider_artifacts,
            replayed,
            ..
        } => CheckoutOutcome::Resolved {
            operation_id,
            attempt_id: checkout_attempt_id,
            return_artifact: with_artifact
                .then_some(provider_artifacts.return_artifact_id)
                .flatten(),
            replayed,
        },
        DurableOutcome::Terminal {
            code,
            durable,
            replayed,
            ..
        } => CheckoutOutcome::Terminal {
            durable,
            code,
            replayed,
        },
        DurableOutcome::Indeterminate { code, .. } => CheckoutOutcome::Indeterminate { code },
    }
}

fn session_artifacts(session_id: &str, proof: &str) -> ProviderArtifacts {
    ProviderArtifacts {
        provider_operation_id: Some(session_id.into()),
        provider_checkout_id: Some(session_id.into()),
        return_artifact_id: Some(session_id.into()),
        outcome_proof: Some(proof.into()),
        ..Default::default()
    }
}
