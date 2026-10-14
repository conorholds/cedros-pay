use super::storage::{self, CartRecord, Versioned};
use super::{identity, validation, ApplyOutcome, CartCommand, CartState, VersionedCartService};
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

impl<S: HostSeams> VersionedCartService<'_, S> {
    /// Read the current generation and authoritative lane state together.
    pub fn read_authoritative(&self, lane: &str) -> AppResult<(super::GenerationState, CartState)> {
        validation::lane(lane)?;
        let generation_key = identity::generation_key(&self.scope_hash);
        for _ in 0..3 {
            let before = self.required_generation(&generation_key)?;
            let generation = storage::generation_state(&before);
            let command = empty_key_command(lane, &generation.generation);
            let keys = identity::keys(&self.scope_hash, &command);
            let cart = storage::read_cart(&self.db, &keys.cart, &self.scope_hash, &keys.lane_hash)?;
            let after = self.required_generation(&generation_key)?;
            if before.revision == after.revision {
                return Ok((
                    generation.clone(),
                    storage::cart_state(lane, generation.epoch, cart.as_ref()),
                ));
            }
        }
        Err(AppError::conflict(
            "cart generation changed repeatedly during read",
        ))
    }

    /// Read the authoritative lane state for this authenticated subject/provider.
    pub fn read(&self, lane: &str) -> AppResult<CartState> {
        self.read_authoritative(lane).map(|(_, cart)| cart)
    }

    /// Domain-only harness for cart state-machine tests. Production writes must
    /// enter through the authenticated adapter so authority fences are present.
    #[cfg(test)]
    pub(super) fn apply(&self, command: &CartCommand) -> AppResult<ApplyOutcome> {
        let fingerprint = identity::fingerprint(&self.scope_hash, command)?;
        self.apply_with_fingerprint(command, &fingerprint, &[])
    }

    pub(super) fn apply_with_fingerprint(
        &self,
        command: &CartCommand,
        fingerprint: &str,
        inventory_checks: &[super::authority_inventory::InventoryCheck],
    ) -> AppResult<ApplyOutcome> {
        validation::command(command)?;
        validation::fingerprint(fingerprint)?;
        let keys = identity::keys(&self.scope_hash, command);
        if let Some(outcome) = self.recorded_outcome(command, &keys, fingerprint)? {
            return Ok(outcome);
        }
        let generation = self.required_generation(&keys.generation)?;
        if generation.revision != command.generation {
            return self.stale_generation(command, &keys, generation);
        }
        let current = storage::read_cart(&self.db, &keys.cart, &self.scope_hash, &keys.lane_hash)?;
        if current.as_ref().map_or(0, |cart| cart.value.version) != command.expected_version {
            return self.classify_conflict(command, &keys, fingerprint);
        }
        self.commit(
            command,
            &keys,
            fingerprint,
            generation,
            current,
            inventory_checks,
        )
    }

    fn commit(
        &self,
        command: &CartCommand,
        keys: &identity::Keys,
        fingerprint: &str,
        generation: Versioned<storage::GenerationRecord>,
        current: Option<Versioned<CartRecord>>,
        inventory_checks: &[super::authority_inventory::InventoryCheck],
    ) -> AppResult<ApplyOutcome> {
        super::commit::execute(
            self,
            command,
            keys,
            fingerprint,
            generation,
            current,
            inventory_checks,
        )
    }
}

fn empty_key_command(lane: &str, generation: &str) -> CartCommand {
    CartCommand {
        lane: lane.to_string(),
        generation: generation.to_string(),
        expected_version: 0,
        operation_id: "read-key".to_string(),
        mutation: super::CartMutation::Clear {},
    }
}
