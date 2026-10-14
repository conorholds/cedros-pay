use super::storage::{self, CartRecord, MutationRecord, OperationTombstone, Versioned};
use super::{identity, ApplyOutcome, CartCommand, VersionedCartService};
use crate::db::BatchOp;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::seams::HostSeams;

struct Records {
    next: CartRecord,
    operation: MutationRecord,
    tombstone: OperationTombstone,
}

pub(super) fn execute<S: HostSeams>(
    service: &VersionedCartService<'_, S>,
    command: &CartCommand,
    keys: &identity::Keys,
    fingerprint: &str,
    generation: Versioned<storage::GenerationRecord>,
    current: Option<Versioned<CartRecord>>,
    inventory_checks: &[super::authority_inventory::InventoryCheck],
) -> AppResult<ApplyOutcome> {
    let records = records(
        service,
        command,
        keys,
        fingerprint,
        &generation,
        current.as_ref(),
        inventory_checks,
    )?;
    let (conditions, ops) = plan(
        keys,
        &generation,
        current.as_ref(),
        inventory_checks,
        &records,
    )?;
    match service.db.guarded_batch(&conditions, &ops)? {
        GuardedBatchOutcome::Applied { entries, .. } => {
            let revision = storage::applied_revision(&entries, super::CART_MODEL_ID, &keys.cart)?;
            Ok(ApplyOutcome::Applied {
                state: storage::cart_state(
                    &command.lane,
                    generation.value.epoch,
                    Some(&Versioned {
                        value: records.next,
                        revision,
                    }),
                ),
            })
        }
        GuardedBatchOutcome::Conflict { .. } => {
            service.classify_conflict(command, keys, fingerprint)
        }
    }
}

fn records<S: HostSeams>(
    service: &VersionedCartService<'_, S>,
    command: &CartCommand,
    keys: &identity::Keys,
    fingerprint: &str,
    generation: &Versioned<storage::GenerationRecord>,
    current: Option<&Versioned<CartRecord>>,
    inventory_checks: &[super::authority_inventory::InventoryCheck],
) -> AppResult<Records> {
    let now = service.seams.now_unix_secs();
    let next = super::mutation::apply(
        current.map(|value| &value.value),
        &service.scope_hash,
        &keys.lane_hash,
        generation.value.epoch,
        &command.mutation,
        now,
    )?;
    super::authority_inventory::ensure_final_quantities(&next, inventory_checks)?;
    let operation = MutationRecord {
        schema_version: 1,
        scope_hash: service.scope_hash.clone(),
        lane_hash: keys.lane_hash.clone(),
        operation_hash: keys.operation_hash.clone(),
        fingerprint: fingerprint.into(),
        result_version: next.version,
        created_at: crate::time::iso8601(now),
    };
    let tombstone = OperationTombstone {
        schema_version: 1,
        scope_hash: service.scope_hash.clone(),
        lane_hash: keys.lane_hash.clone(),
        operation_hash: keys.operation_hash.clone(),
        fingerprint: fingerprint.into(),
        created_at: crate::time::iso8601(now),
    };
    Ok(Records {
        next,
        operation,
        tombstone,
    })
}

fn plan(
    keys: &identity::Keys,
    generation: &Versioned<storage::GenerationRecord>,
    current: Option<&Versioned<CartRecord>>,
    inventory_checks: &[super::authority_inventory::InventoryCheck],
    records: &Records,
) -> AppResult<(Vec<GuardedCondition>, [BatchOp; 3])> {
    let mut conditions = vec![
        storage::condition(
            super::GENERATION_MODEL_ID,
            &keys.generation,
            Some(generation),
        ),
        storage::condition(super::CART_MODEL_ID, &keys.cart, current),
        GuardedCondition::Absent {
            content_model_id: super::OPERATION_MODEL_ID,
            entry_key: keys.operation.clone(),
        },
        GuardedCondition::Absent {
            content_model_id: super::TOMBSTONE_MODEL_ID,
            entry_key: keys.operation.clone(),
        },
    ];
    conditions.extend(super::authority_inventory::guard_conditions(
        inventory_checks,
    )?);
    if conditions.len() > 32 {
        return Err(AppError::new(
            422,
            "inventory_condition_limit",
            "cart mutation exceeds the 32-condition inventory limit",
        ));
    }
    let ops = [
        storage::write(super::CART_MODEL_ID, &keys.cart, &records.next)?,
        storage::write(
            super::OPERATION_MODEL_ID,
            &keys.operation,
            &records.operation,
        )?,
        storage::write(
            super::TOMBSTONE_MODEL_ID,
            &keys.operation,
            &records.tombstone,
        )?,
    ];
    Ok((conditions, ops))
}
