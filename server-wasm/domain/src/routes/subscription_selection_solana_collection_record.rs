//! Stored shape and identity binding for an initial collection attempt.

use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};

use super::solana_collection_transaction::PreparedCollection;
use crate::db::BatchOp;
use crate::error::{AppError, AppResult};
use crate::ids;

pub(super) struct CollectionFacts<'a> {
    pub(super) user_id: &'a str,
    pub(super) plan_id: &'a str,
    pub(super) interval: &'a str,
    pub(super) wallet: &'a str,
    pub(super) authorization_signature: &'a str,
    pub(super) wallet_binding_message: &'a str,
    pub(super) wallet_binding_signature: &'a str,
    pub(super) subscription_address: &'a str,
}

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct CollectionRecord {
    schema_version: u8,
    kind: String,
    pub(super) status: String,
    fingerprint: String,
    user_id: String,
    plan_id: String,
    interval: String,
    wallet: String,
    authorization_signature: String,
    pub(super) subscription_address: String,
    pub(super) payment_signature: String,
    pub(super) signed_transaction: String,
    pub(super) blockhash: String,
    created_at: String,
    pub(super) updated_at: String,
}

pub(super) struct StoredCollection {
    pub(super) record: CollectionRecord,
    pub(super) version: String,
}

impl CollectionRecord {
    pub(super) fn new(
        facts: &CollectionFacts<'_>,
        prepared: &PreparedCollection,
        now: String,
    ) -> AppResult<Self> {
        Ok(Self {
            schema_version: 2,
            kind: "solana_subscription_initial_collection".into(),
            status: "submitted".into(),
            fingerprint: fingerprint(facts)?,
            user_id: facts.user_id.into(),
            plan_id: facts.plan_id.into(),
            interval: facts.interval.into(),
            wallet: facts.wallet.into(),
            authorization_signature: facts.authorization_signature.into(),
            subscription_address: facts.subscription_address.into(),
            payment_signature: prepared.signature.clone(),
            signed_transaction: prepared.signed_transaction.clone(),
            blockhash: prepared.blockhash.clone(),
            created_at: now.clone(),
            updated_at: now,
        })
    }
}

pub(super) fn validate(record: &CollectionRecord, facts: &CollectionFacts<'_>) -> AppResult<()> {
    if record.fingerprint != fingerprint(facts)? && record.fingerprint != legacy_fingerprint(facts)?
    {
        return Err(AppError::conflict(
            "subscription collection is already bound to different facts",
        ));
    }
    Ok(())
}

pub(super) fn key(subscription_address: &str) -> String {
    format!(
        "solana-subscription-collection:{}",
        hex::encode(&Sha256::digest(subscription_address.as_bytes())[..16])
    )
}

pub(super) fn write(key: &str, record: &CollectionRecord) -> AppResult<BatchOp> {
    Ok(BatchOp::Write {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: key.into(),
        data: serde_json::to_value(record).map_err(|cause| {
            AppError::internal("cannot encode collection state").with_internal(cause.to_string())
        })?,
    })
}

fn fingerprint(facts: &CollectionFacts<'_>) -> AppResult<String> {
    crate::routes::checkout_claim::fingerprint(&json!({
        "schemaVersion": 2,
        "operation": "solana-subscription-initial-collection",
        "userId": facts.user_id,
        "planId": facts.plan_id,
        "interval": facts.interval,
        "wallet": facts.wallet,
        "authorizationSignature": facts.authorization_signature,
        "walletBindingMessage": facts.wallet_binding_message,
        "walletBindingSignature": facts.wallet_binding_signature,
        "subscriptionAddress": facts.subscription_address,
    }))
}

fn legacy_fingerprint(facts: &CollectionFacts<'_>) -> AppResult<String> {
    crate::routes::checkout_claim::fingerprint(&json!({
        "schemaVersion": 1,
        "operation": "solana-subscription-initial-collection",
        "userId": facts.user_id,
        "planId": facts.plan_id,
        "interval": facts.interval,
        "wallet": facts.wallet,
        "authorizationSignature": facts.authorization_signature,
        "subscriptionAddress": facts.subscription_address,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_legacy_record_only_for_its_original_user() {
        let original = facts("user_1");
        let prepared = PreparedCollection {
            signed_transaction: "transaction".into(),
            signature: "payment".into(),
            blockhash: "blockhash".into(),
        };
        let mut record = CollectionRecord::new(&original, &prepared, "now".into()).unwrap();
        record.schema_version = 1;
        record.fingerprint = legacy_fingerprint(&original).unwrap();

        validate(&record, &original).unwrap();
        assert_eq!(validate(&record, &facts("user_2")).unwrap_err().status, 409);
    }

    fn facts(user_id: &str) -> CollectionFacts<'_> {
        CollectionFacts {
            user_id,
            plan_id: "pro",
            interval: "monthly",
            wallet: "wallet",
            authorization_signature: "authorization",
            wallet_binding_message: "binding",
            wallet_binding_signature: "proof",
            subscription_address: "subscription",
        }
    }
}
