use super::storage::{self, GenerationRecord, Versioned};
use super::{
    identity, ApplyOutcome, CartCommand, CartState, CartWriteRequest, VersionedCartService,
};
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

impl<S: HostSeams> VersionedCartService<'_, S> {
    pub(super) fn preflight_intent(
        &self,
        request: &CartWriteRequest,
    ) -> AppResult<Option<ApplyOutcome>> {
        let command = intent_command(request);
        let keys = identity::operation_keys(&self.scope_hash, &request.lane, &request.operation_id);
        let generation = self.required_generation(&keys.generation)?;
        if generation.revision != request.generation {
            return self.stale_generation(&command, &keys, generation).map(Some);
        }
        let current = storage::read_cart(&self.db, &keys.cart, &self.scope_hash, &keys.lane_hash)?;
        if current.as_ref().map_or(0, |cart| cart.value.version) != request.expected_version {
            return Ok(Some(ApplyOutcome::Conflict {
                authoritative: storage::cart_state(
                    &request.lane,
                    generation.value.epoch,
                    current.as_ref(),
                ),
            }));
        }
        Ok(None)
    }

    pub(super) fn recorded_intent(
        &self,
        lane: &str,
        operation_id: &str,
        fingerprint: &str,
    ) -> AppResult<Option<ApplyOutcome>> {
        super::validation::lane(lane)?;
        super::validation::operation_id(operation_id)?;
        super::validation::fingerprint(fingerprint)?;
        let generation_key = identity::generation_key(&self.scope_hash);
        let generation = self.required_generation(&generation_key)?;
        let command = CartCommand {
            lane: lane.to_string(),
            generation: generation.revision,
            expected_version: 0,
            operation_id: operation_id.to_string(),
            mutation: super::CartMutation::Clear {},
        };
        let keys = identity::operation_keys(&self.scope_hash, lane, operation_id);
        self.recorded_outcome(&command, &keys, fingerprint)
    }

    pub(super) fn classify_conflict(
        &self,
        command: &CartCommand,
        keys: &identity::Keys,
        fingerprint: &str,
    ) -> AppResult<ApplyOutcome> {
        if let Some(outcome) = self.recorded_outcome(command, keys, fingerprint)? {
            return Ok(outcome);
        }
        let generation = self.required_generation(&keys.generation)?;
        if generation.revision != command.generation {
            return self.stale_generation(command, keys, generation);
        }
        Ok(ApplyOutcome::Conflict {
            authoritative: self.authoritative(command, keys, generation.value.epoch)?,
        })
    }

    pub(super) fn recorded_outcome(
        &self,
        command: &CartCommand,
        keys: &identity::Keys,
        fingerprint: &str,
    ) -> AppResult<Option<ApplyOutcome>> {
        let Some(recorded) = storage::read_mutation(
            &self.db,
            &keys.operation,
            &self.scope_hash,
            &keys.lane_hash,
            &keys.operation_hash,
        )?
        else {
            return Ok(None);
        };
        let generation = self.required_generation(&keys.generation)?;
        let authoritative = self.authoritative(command, keys, generation.value.epoch)?;
        Ok(Some(if recorded.value.fingerprint == fingerprint {
            ApplyOutcome::Replayed {
                version: recorded.value.result_version,
                authoritative,
            }
        } else {
            ApplyOutcome::IdempotencyConflict { authoritative }
        }))
    }

    pub(super) fn required_generation(&self, key: &str) -> AppResult<Versioned<GenerationRecord>> {
        self.load_generation(key)?
            .ok_or_else(|| AppError::conflict("cart generation is not open"))
    }

    fn authoritative(
        &self,
        command: &CartCommand,
        keys: &identity::Keys,
        generation_epoch: u64,
    ) -> AppResult<CartState> {
        let cart = storage::read_cart(&self.db, &keys.cart, &self.scope_hash, &keys.lane_hash)?;
        Ok(storage::cart_state(
            &command.lane,
            generation_epoch,
            cart.as_ref(),
        ))
    }

    pub(super) fn stale_generation(
        &self,
        command: &CartCommand,
        keys: &identity::Keys,
        generation: Versioned<GenerationRecord>,
    ) -> AppResult<ApplyOutcome> {
        Ok(ApplyOutcome::StaleGeneration {
            current_generation: storage::generation_state(&generation),
            authoritative: self.authoritative(command, keys, generation.value.epoch)?,
        })
    }
}

fn intent_command(request: &CartWriteRequest) -> CartCommand {
    CartCommand {
        lane: request.lane.clone(),
        generation: request.generation.clone(),
        expected_version: request.expected_version,
        operation_id: request.operation_id.clone(),
        mutation: super::CartMutation::Clear {},
    }
}
