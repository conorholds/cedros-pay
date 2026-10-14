use super::storage::{self, LaneRegistryRecord, Versioned};
use super::{identity, validation, VersionedCartService};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedBatchOutcome;
use crate::seams::HostSeams;
use crate::time;

pub(super) const MAX_LANES: usize = 1;

impl<S: HostSeams> VersionedCartService<'_, S> {
    pub(super) fn admit_lane(&self, lane: &str) -> AppResult<()> {
        validation::lane(lane)?;
        let lane_hash = identity::lane_hash(lane);
        let key = identity::lane_registry_key(&self.scope_hash);
        for _ in 0..3 {
            let current = read_registry(&self.db, &key, &self.scope_hash)?;
            if current
                .as_ref()
                .is_some_and(|record| record.value.lane_hashes.contains(&lane_hash))
            {
                return Ok(());
            }
            let next = next_registry(&self.scope_hash, current.as_ref(), &lane_hash, self.seams)?;
            let conditions = [storage::condition(
                super::LANE_MODEL_ID,
                &key,
                current.as_ref(),
            )];
            let ops = [storage::write(super::LANE_MODEL_ID, &key, &next)?];
            if matches!(
                self.db.guarded_batch(&conditions, &ops)?,
                GuardedBatchOutcome::Applied { .. }
            ) {
                return Ok(());
            }
        }
        Err(AppError::conflict("cart lane admission changed repeatedly"))
    }

    pub(super) fn require_lane(&self, lane: &str) -> AppResult<()> {
        validation::lane(lane)?;
        let key = identity::lane_registry_key(&self.scope_hash);
        let admitted = read_registry(&self.db, &key, &self.scope_hash)?;
        if admitted.as_ref().is_some_and(|record| {
            record
                .value
                .lane_hashes
                .contains(&identity::lane_hash(lane))
        }) {
            Ok(())
        } else {
            Err(AppError::not_found("cart lane is not open"))
        }
    }
}

fn read_registry<S: HostSeams>(
    db: &crate::db::Db<'_, S>,
    key: &str,
    scope_hash: &str,
) -> AppResult<Option<Versioned<LaneRegistryRecord>>> {
    let stored: Option<Versioned<LaneRegistryRecord>> =
        storage::read(db, super::LANE_MODEL_ID, key)?;
    if stored.as_ref().is_some_and(|record| {
        record.value.schema_version != 1
            || record.value.scope_hash != scope_hash
            || record.value.lane_hashes.len() > MAX_LANES
            || record
                .value
                .lane_hashes
                .iter()
                .any(|hash| hash.len() != 64 || !hash.bytes().all(|byte| byte.is_ascii_hexdigit()))
    }) {
        return Err(AppError::internal(
            "stored versioned lane registry record is invalid",
        ));
    }
    Ok(stored)
}

fn next_registry<S: HostSeams>(
    scope_hash: &str,
    current: Option<&Versioned<LaneRegistryRecord>>,
    lane_hash: &str,
    seams: &S,
) -> AppResult<LaneRegistryRecord> {
    let mut lanes = current
        .map(|record| record.value.lane_hashes.clone())
        .unwrap_or_default();
    if lanes.len() >= MAX_LANES {
        return Err(AppError::too_many("cart lane quota exceeded"));
    }
    lanes.insert(lane_hash.to_string());
    Ok(LaneRegistryRecord {
        schema_version: 1,
        scope_hash: scope_hash.to_string(),
        lane_hashes: lanes,
        updated_at: time::iso8601(seams.now_unix_secs()),
    })
}
