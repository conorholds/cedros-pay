use std::collections::BTreeMap;

use sha2::{Digest, Sha256};

use crate::seams::HostSeams;
use crate::stripe::api;
use crate::stripe::checkout_api::{self, CheckoutSessionRequest};
use crate::stripe::checkout_provider::{
    self, CreateClassification, RetrieveClassification, RetrievedSession,
};

use super::{CheckoutMaterial, ProviderArtifacts};

pub(super) const META_LEDGER_KEY: &str = "cedros_pay_ledger_key";
pub(super) const META_ATTEMPT_ID: &str = "cedros_pay_attempt_id";
pub(super) const META_OPERATION_ID: &str = "cedros_pay_operation_id";
pub(super) const META_SCOPE_HASH: &str = "cedros_pay_scope_hash";
pub(super) const META_MATERIAL_HASH: &str = "cedros_pay_material_hash";

pub(super) struct Correlation<'a> {
    pub ledger_key: &'a str,
    pub attempt_id: &'a str,
    pub operation_id: &'a str,
    pub provider_scope: &'a str,
    pub material_fingerprint: &'a str,
}

pub(super) enum CreateOutcome {
    Resolved { session_id: String },
    Terminal { code: String, proof: String },
    Indeterminate { artifacts: ProviderArtifacts },
}

pub(super) fn create<S: HostSeams>(
    seams: &S,
    secret_key: &str,
    provider_request: &super::StripeRequestBinding,
    material: &CheckoutMaterial,
    correlation: &Correlation<'_>,
) -> CreateOutcome {
    let mut metadata = material.metadata.clone();
    add_correlation(&mut metadata, correlation);
    let fetch = checkout_api::build_checkout_session_fetch(
        secret_key,
        &CheckoutSessionRequest {
            amount_cents: material.amount_cents,
            currency: material.currency.clone(),
            product_name: material.product_name.clone(),
            success_url: material.success_url.clone(),
            cancel_url: material.cancel_url.clone(),
            customer_email: material.customer_email.clone(),
            client_reference_id: material.client_reference_id.clone(),
            idempotency_key: provider_request.idempotency_key.clone(),
            expires_at: provider_request.expires_at,
            metadata: metadata.into_iter().collect(),
        },
    );
    let Ok(raw) = seams.http_fetch(&fetch.to_string()) else {
        return CreateOutcome::Indeterminate {
            artifacts: ProviderArtifacts::default(),
        };
    };
    let Ok((status, body)) = api::unwrap_fetch(&raw) else {
        return CreateOutcome::Indeterminate {
            artifacts: ProviderArtifacts::default(),
        };
    };
    match checkout_provider::classify_create(status, &body) {
        CreateClassification::Resolved(session) => CreateOutcome::Resolved {
            session_id: session.id,
        },
        CreateClassification::Terminal { code, proof } => CreateOutcome::Terminal { code, proof },
        CreateClassification::Indeterminate => CreateOutcome::Indeterminate {
            artifacts: ProviderArtifacts::default(),
        },
    }
}

pub(super) fn retrieve<S: HostSeams>(
    seams: &S,
    secret_key: &str,
    session_id: &str,
) -> RetrieveClassification {
    let Ok(fetch) = checkout_provider::build_retrieve(secret_key, session_id) else {
        return RetrieveClassification::Indeterminate;
    };
    let Ok(raw) = seams.http_fetch(&fetch.to_string()) else {
        return RetrieveClassification::Indeterminate;
    };
    let Ok((status, body)) = api::unwrap_fetch(&raw) else {
        return RetrieveClassification::Indeterminate;
    };
    checkout_provider::classify_retrieve(status, &body)
}

pub(super) fn matches_correlation(
    session: &RetrievedSession,
    expected_session_id: &str,
    correlation: &Correlation<'_>,
) -> bool {
    session.id == expected_session_id
        && metadata_eq(session, META_LEDGER_KEY, correlation.ledger_key)
        && metadata_eq(
            session,
            META_ATTEMPT_ID,
            &attempt_hash(correlation.provider_scope, correlation.attempt_id),
        )
        && metadata_eq(session, META_OPERATION_ID, correlation.operation_id)
        && metadata_eq(
            session,
            META_SCOPE_HASH,
            &scope_hash(correlation.provider_scope),
        )
        && metadata_eq(
            session,
            META_MATERIAL_HASH,
            correlation.material_fingerprint,
        )
}

pub(super) fn scope_hash(scope: &str) -> String {
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-checkout-provider-scope\0");
    digest.update(scope.as_bytes());
    hex::encode(digest.finalize())
}

pub(super) fn attempt_hash(scope: &str, attempt: &str) -> String {
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-checkout-attempt-metadata\0");
    digest.update((scope.len() as u64).to_be_bytes());
    digest.update(scope.as_bytes());
    digest.update((attempt.len() as u64).to_be_bytes());
    digest.update(attempt.as_bytes());
    hex::encode(digest.finalize())
}

fn add_correlation(metadata: &mut BTreeMap<String, String>, value: &Correlation<'_>) {
    metadata.insert(META_LEDGER_KEY.into(), value.ledger_key.into());
    metadata.insert(
        META_ATTEMPT_ID.into(),
        attempt_hash(value.provider_scope, value.attempt_id),
    );
    metadata.insert(META_OPERATION_ID.into(), value.operation_id.into());
    metadata.insert(META_SCOPE_HASH.into(), scope_hash(value.provider_scope));
    metadata.insert(META_MATERIAL_HASH.into(), value.material_fingerprint.into());
}

fn metadata_eq(session: &RetrievedSession, key: &str, expected: &str) -> bool {
    session
        .metadata
        .get(key)
        .is_some_and(|value| value == expected)
}
