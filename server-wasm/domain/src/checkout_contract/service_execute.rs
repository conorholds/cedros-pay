use super::provider::{self, Correlation, CreateOutcome};
use super::service::CheckoutService;
use super::service_claim::ServiceClaim;
use super::{
    CheckoutCommand, CheckoutOutcome, Completion, OperationIdentity, OperationKind, OperationLease,
    ProviderArtifacts,
};
use crate::error::AppResult;
use crate::seams::HostSeams;

pub(super) fn execute<S: HostSeams>(
    service: &CheckoutService<'_, S>,
    command: CheckoutCommand,
) -> AppResult<CheckoutOutcome> {
    command.material.validate()?;
    let (identity, attempt) = service.identity(
        OperationKind::Checkout,
        &command.idempotency_key,
        &command.checkout_attempt_id,
        &command.material,
    )?;
    let claim = service.claim(
        &identity,
        &attempt,
        &command.canonical_context,
        command.guarded_settlement,
        &command.authority_guards,
    )?;
    let lease = match claim {
        ServiceClaim::Mismatch => return Ok(super::service::mismatch()),
        ServiceClaim::Waiting => return Ok(super::service::indeterminate("operation-in-progress")),
        ServiceClaim::Replay(outcome) => return Ok(super::service_outcome::checkout(outcome)),
        ServiceClaim::Acquired(lease) => lease,
    };
    execute_provider(service, &command, &identity, lease)
}

fn execute_provider<S: HostSeams>(
    service: &CheckoutService<'_, S>,
    command: &CheckoutCommand,
    identity: &OperationIdentity,
    lease: OperationLease,
) -> AppResult<CheckoutOutcome> {
    let secret_key = match service.stripe_secret() {
        Ok(secret) => secret,
        Err(_) => {
            return service.commit_indeterminate(
                &lease,
                "provider-config-unavailable",
                ProviderArtifacts::default(),
            )
        }
    };
    let lease = match mark_attempted(service, lease, &command.authority_guards)? {
        Attempted::Lease(lease) => lease,
        Attempted::Done(outcome) => return Ok(outcome),
    };
    let correlation = Correlation {
        ledger_key: lease.storage_reference(),
        attempt_id: lease.checkout_attempt_id(),
        operation_id: lease.operation_id(),
        provider_scope: service.context.provider_scope(),
        material_fingerprint: identity.material_fingerprint(),
    };
    let request = lease
        .stripe_request()
        .ok_or_else(|| crate::error::AppError::internal("Stripe request binding is missing"))?;
    let outcome = provider::create(
        service.seams,
        &secret_key,
        request,
        &command.material,
        &correlation,
    );
    finish(service, &lease, outcome)
}

enum Attempted {
    Lease(OperationLease),
    Done(CheckoutOutcome),
}

fn mark_attempted<S: HostSeams>(
    service: &CheckoutService<'_, S>,
    lease: OperationLease,
    authority_guards: &[crate::guarded_batch::GuardedCondition],
) -> AppResult<Attempted> {
    match service
        .ledger
        .mark_provider_attempted(&lease, authority_guards)
    {
        Ok(lease) => Ok(Attempted::Lease(lease)),
        Err(error) if error.code == "provider-outcome-unknown" => service
            .commit_indeterminate(
                &lease,
                "provider-outcome-unknown",
                ProviderArtifacts::default(),
            )
            .map(Attempted::Done),
        Err(error) => Err(error),
    }
}

fn finish<S: HostSeams>(
    service: &CheckoutService<'_, S>,
    lease: &OperationLease,
    outcome: CreateOutcome,
) -> AppResult<CheckoutOutcome> {
    match outcome {
        // Session creation is durable once its identity is known. Redirect
        // availability belongs to the existing read-only URL resolution path.
        CreateOutcome::Resolved { session_id } => service.commit_resolved(lease, session_id),
        CreateOutcome::Terminal { code, proof } => {
            let outcome = service.ledger.complete(
                lease,
                Completion::ProvenTerminal {
                    code,
                    outcome_proof: proof,
                },
            )?;
            Ok(super::service_outcome::checkout(outcome))
        }
        CreateOutcome::Indeterminate { artifacts } => {
            service.commit_indeterminate(lease, "transport-outcome-unknown", artifacts)
        }
    }
}
