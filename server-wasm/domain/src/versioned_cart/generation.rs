use super::storage::{self, GenerationRecord, Versioned};
use super::{identity, validation, GenerationState, RotateGenerationOutcome, VersionedCartService};
use crate::db::BatchOp;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::seams::HostSeams;
use crate::time;

impl<S: HostSeams> VersionedCartService<'_, S> {
    /// Return the current server-owned generation, creating epoch one atomically.
    pub fn open_generation(&self) -> AppResult<GenerationState> {
        let key = identity::generation_key(&self.scope_hash);
        if let Some(stored) = self.load_generation(&key)? {
            return Ok(storage::generation_state(&stored));
        }
        self.create_generation(&key)
    }

    /// Read the current generation for same-customer cross-device recovery.
    pub fn current_generation(&self) -> AppResult<Option<GenerationState>> {
        let key = identity::generation_key(&self.scope_hash);
        Ok(self
            .load_generation(&key)?
            .as_ref()
            .map(storage::generation_state))
    }

    /// Rotate ownership using the current opaque host revision as the precondition.
    pub fn rotate_generation(
        &self,
        expected_generation: &str,
    ) -> AppResult<RotateGenerationOutcome> {
        validation::generation(expected_generation)?;
        let key = identity::generation_key(&self.scope_hash);
        let current = self
            .load_generation(&key)?
            .ok_or_else(|| AppError::conflict("cart generation is not open"))?;
        if current.revision != expected_generation {
            return Ok(RotateGenerationOutcome::StaleGeneration {
                current: storage::generation_state(&current),
            });
        }
        self.commit_rotation(&key, current)
    }

    pub(super) fn load_generation(
        &self,
        key: &str,
    ) -> AppResult<Option<Versioned<GenerationRecord>>> {
        storage::read_generation(&self.db, key, &self.scope_hash, &self.provider)
    }

    fn create_generation(&self, key: &str) -> AppResult<GenerationState> {
        let now = time::iso8601(self.seams.now_unix_secs());
        let record = GenerationRecord {
            schema_version: 1,
            scope_hash: self.scope_hash.clone(),
            provider: self.provider.clone(),
            epoch: 1,
            created_at: now.clone(),
            updated_at: now,
        };
        let conditions = [GuardedCondition::Absent {
            content_model_id: super::GENERATION_MODEL_ID,
            entry_key: key.to_string(),
        }];
        let ops = [storage::write(super::GENERATION_MODEL_ID, key, &record)?];
        match self.db.guarded_batch(&conditions, &ops)? {
            GuardedBatchOutcome::Applied { entries, .. } => Ok(GenerationState {
                generation: storage::applied_revision(&entries, super::GENERATION_MODEL_ID, key)?,
                epoch: 1,
            }),
            GuardedBatchOutcome::Conflict { .. } => self
                .load_generation(key)?
                .as_ref()
                .map(storage::generation_state)
                .ok_or_else(|| AppError::conflict("cart generation changed concurrently")),
        }
    }

    fn commit_rotation(
        &self,
        key: &str,
        current: Versioned<GenerationRecord>,
    ) -> AppResult<RotateGenerationOutcome> {
        let mut next = current.value.clone();
        next.epoch = next
            .epoch
            .checked_add(1)
            .ok_or_else(|| validation::invalid("cart generation epoch overflow"))?;
        if next.epoch > validation::MAX_GENERATION_EPOCH {
            return Err(validation::invalid("cart generation epoch limit exceeded"));
        }
        next.updated_at = time::iso8601(self.seams.now_unix_secs());
        let conditions = [storage::condition(
            super::GENERATION_MODEL_ID,
            key,
            Some(&current),
        )];
        let ops: [BatchOp; 1] = [storage::write(super::GENERATION_MODEL_ID, key, &next)?];
        match self.db.guarded_batch(&conditions, &ops)? {
            GuardedBatchOutcome::Applied { entries, .. } => Ok(RotateGenerationOutcome::Rotated {
                generation: GenerationState {
                    generation: storage::applied_revision(
                        &entries,
                        super::GENERATION_MODEL_ID,
                        key,
                    )?,
                    epoch: next.epoch,
                },
            }),
            GuardedBatchOutcome::Conflict { .. } => {
                let latest = self
                    .load_generation(key)?
                    .ok_or_else(|| AppError::conflict("cart generation disappeared"))?;
                Ok(RotateGenerationOutcome::StaleGeneration {
                    current: storage::generation_state(&latest),
                })
            }
        }
    }
}
