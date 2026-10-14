//! Durable idempotency state for Pay-owned initial Solana collection.

use super::solana_collection_record::{self as record, CollectionRecord};
use super::solana_collection_transaction::PreparedCollection;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::ids;
use crate::seams::HostSeams;
use crate::time;

pub(super) use super::solana_collection_record::{CollectionFacts, StoredCollection};

pub(super) fn load<S: HostSeams>(
    seams: &S,
    facts: &CollectionFacts<'_>,
) -> AppResult<Option<StoredCollection>> {
    let stored = read(&Db::new(seams, ids::DB_ACCESS), facts.subscription_address)?;
    if let Some(stored) = &stored {
        record::validate(&stored.record, facts)?;
    }
    Ok(stored)
}

pub(super) fn claim<S: HostSeams>(
    seams: &S,
    facts: &CollectionFacts<'_>,
    prepared: &PreparedCollection,
) -> AppResult<StoredCollection> {
    let db = Db::new(seams, ids::DB_ACCESS);
    if let Some(stored) = read(&db, facts.subscription_address)? {
        record::validate(&stored.record, facts)?;
        return Ok(stored);
    }
    let key = record::key(facts.subscription_address);
    let now = time::iso8601(seams.now_unix_secs());
    let record = CollectionRecord::new(facts, prepared, now)?;
    let outcome = db.guarded_batch(
        &[GuardedCondition::Absent {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: key.clone(),
        }],
        &[record::write(&key, &record)?],
    )?;
    match outcome {
        GuardedBatchOutcome::Applied { .. } => read(&db, facts.subscription_address)?
            .ok_or_else(|| AppError::internal("collection claim disappeared after commit")),
        GuardedBatchOutcome::Conflict { .. } => {
            let stored = read(&db, facts.subscription_address)?
                .ok_or_else(|| AppError::conflict("collection changed while claiming"))?;
            record::validate(&stored.record, facts)?;
            Ok(stored)
        }
    }
}

pub(super) fn replace<S: HostSeams>(
    seams: &S,
    stored: &StoredCollection,
    prepared: &PreparedCollection,
) -> AppResult<StoredCollection> {
    let mut next = stored.record.clone();
    next.status = "submitted".into();
    next.payment_signature = prepared.signature.clone();
    next.signed_transaction = prepared.signed_transaction.clone();
    next.blockhash = prepared.blockhash.clone();
    next.updated_at = time::iso8601(seams.now_unix_secs());
    update(seams, stored, next)
}

pub(super) fn mark<S: HostSeams>(
    seams: &S,
    stored: &StoredCollection,
    status: &str,
) -> AppResult<StoredCollection> {
    let mut next = stored.record.clone();
    next.status = status.into();
    next.updated_at = time::iso8601(seams.now_unix_secs());
    update(seams, stored, next)
}

pub(super) fn require_finalized<S: HostSeams>(
    seams: &S,
    facts: &CollectionFacts<'_>,
    payment_signature: &str,
) -> AppResult<()> {
    let stored =
        read(&Db::new(seams, ids::DB_ACCESS), facts.subscription_address)?.ok_or_else(|| {
            AppError::new(
                409,
                "collection_required",
                "initial collection has not been completed",
            )
        })?;
    record::validate(&stored.record, facts)?;
    if stored.record.status != "finalized" || stored.record.payment_signature != payment_signature {
        return Err(AppError::new(
            409,
            "collection_not_finalized",
            "initial collection is not finalized",
        ));
    }
    Ok(())
}

fn update<S: HostSeams>(
    seams: &S,
    stored: &StoredCollection,
    next: CollectionRecord,
) -> AppResult<StoredCollection> {
    let db = Db::new(seams, ids::DB_ACCESS);
    let key = record::key(&stored.record.subscription_address);
    let outcome = db.guarded_batch(
        &[GuardedCondition::Version {
            content_model_id: ids::MODEL_LEDGER,
            entry_key: key.clone(),
            expected_version: stored.version.clone(),
        }],
        &[record::write(&key, &next)?],
    )?;
    match outcome {
        GuardedBatchOutcome::Applied { .. } => read(&db, &next.subscription_address)?
            .ok_or_else(|| AppError::internal("collection state disappeared after update")),
        GuardedBatchOutcome::Conflict { .. } => read(&db, &next.subscription_address)?
            .ok_or_else(|| AppError::conflict("collection changed concurrently")),
    }
}

fn read<S: HostSeams>(
    db: &Db<'_, S>,
    subscription_address: &str,
) -> AppResult<Option<StoredCollection>> {
    db.read_one(ids::MODEL_LEDGER, &record::key(subscription_address))?
        .map(|row| {
            let version = row
                .version
                .filter(|version| !version.is_empty())
                .ok_or_else(|| AppError::internal("collection state is missing its version"))?;
            let record = serde_json::from_value(row.payload).map_err(|error| {
                AppError::internal("stored collection state is malformed")
                    .with_internal(error.to_string())
            })?;
            Ok(StoredCollection { record, version })
        })
        .transpose()
}
