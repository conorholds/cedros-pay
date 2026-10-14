use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use super::storage::{self, Versioned};
use super::TrustedCartProvider;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedBatchOutcome;
use crate::seams::HostSeams;

pub(super) const WINDOW_SECONDS: i64 = 60;
pub(super) const MAX_CAS_RETRIES: usize = 5;
pub(super) const RECORD_TYPE: &str = "rate_window";

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CartRateOperation {
    Open,
    Read,
    Rotate,
    Apply,
}

impl CartRateOperation {
    fn label(self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::Read => "read",
            Self::Rotate => "rotate",
            Self::Apply => "apply",
        }
    }

    pub(super) fn limit(self) -> u32 {
        match self {
            Self::Open => 30,
            Self::Read => 120,
            Self::Rotate => 12,
            Self::Apply => 60,
        }
    }
}

/// Redacted subject/provider/lane key for durable host-side rate enforcement.
#[derive(Clone, Debug)]
pub struct CartRateKey(String);

impl CartRateKey {
    pub(super) fn derive(subject: &str, provider: &TrustedCartProvider, lane: &str) -> Self {
        let mut digest = Sha256::new();
        digest.update(b"cedros-pay:versioned-cart-rate-v1\0");
        for value in [subject, provider.as_str(), lane] {
            hash_part(&mut digest, value);
        }
        Self(hex::encode(digest.finalize()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub(super) fn entry_key(&self, operation: CartRateOperation) -> String {
        format!("rate:{}:{}", self.0, operation.label())
    }
}

pub trait CartRatePolicy {
    fn check(&self, key: &CartRateKey, operation: CartRateOperation) -> AppResult<()>;
}

pub(super) struct DurableRatePolicy<'a, S: HostSeams> {
    seams: &'a S,
    db: Db<'a, S>,
}

impl<'a, S: HostSeams> DurableRatePolicy<'a, S> {
    pub(super) fn new(seams: &'a S) -> Self {
        Self {
            seams,
            db: Db::new(seams, crate::ids::DB_ACCESS),
        }
    }
}

impl<S: HostSeams> CartRatePolicy for DurableRatePolicy<'_, S> {
    fn check(&self, key: &CartRateKey, operation: CartRateOperation) -> AppResult<()> {
        let entry_key = key.entry_key(operation);
        let window_start = current_window(self.seams.now_unix_secs());
        for _ in 0..MAX_CAS_RETRIES {
            let current = read(&self.db, &entry_key, key, operation)?;
            let next = next_record(current.as_ref(), key, operation, window_start)?;
            let conditions = [storage::condition(
                super::LANE_MODEL_ID,
                &entry_key,
                current.as_ref(),
            )];
            let ops = [storage::write(super::LANE_MODEL_ID, &entry_key, &next)?];
            if matches!(
                self.db.guarded_batch(&conditions, &ops)?,
                GuardedBatchOutcome::Applied { .. }
            ) {
                return Ok(());
            }
        }
        Err(AppError::new(
            503,
            "cart_rate_policy_unavailable",
            "cart request rate policy is temporarily unavailable",
        ))
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct RateRecord {
    pub(super) schema_version: u8,
    pub(super) record_type: String,
    pub(super) key_hash: String,
    pub(super) operation: CartRateOperation,
    pub(super) window_start: i64,
    pub(super) count: u32,
    pub(super) updated_at: String,
}

impl RateRecord {
    pub(super) fn valid(&self) -> bool {
        self.schema_version == 1
            && self.record_type == RECORD_TYPE
            && self.key_hash.len() == 64
            && self.key_hash.bytes().all(|byte| byte.is_ascii_hexdigit())
            && self.window_start >= 0
            && self.window_start % WINDOW_SECONDS == 0
            && self.count > 0
            && self.count <= self.operation.limit()
            && crate::time::parse_iso(&self.updated_at).is_some()
    }
}

fn read<S: HostSeams>(
    db: &Db<'_, S>,
    entry_key: &str,
    key: &CartRateKey,
    operation: CartRateOperation,
) -> AppResult<Option<Versioned<RateRecord>>> {
    let stored: Option<Versioned<RateRecord>> = storage::read(db, super::LANE_MODEL_ID, entry_key)?;
    if stored.as_ref().is_some_and(|row| {
        !row.value.valid() || row.value.key_hash != key.as_str() || row.value.operation != operation
    }) {
        return Err(AppError::internal("stored cart rate record is invalid"));
    }
    Ok(stored)
}

fn next_record(
    current: Option<&Versioned<RateRecord>>,
    key: &CartRateKey,
    operation: CartRateOperation,
    window_start: i64,
) -> AppResult<RateRecord> {
    let (start, count) = match current {
        Some(row) if row.value.window_start >= window_start => {
            if row.value.count >= operation.limit() {
                return Err(AppError::too_many("cart request rate limit exceeded"));
            }
            (row.value.window_start, row.value.count + 1)
        }
        _ => (window_start, 1),
    };
    Ok(RateRecord {
        schema_version: 1,
        record_type: RECORD_TYPE.into(),
        key_hash: key.as_str().to_string(),
        operation,
        window_start: start,
        count,
        updated_at: crate::time::iso8601(start),
    })
}

fn current_window(now: i64) -> i64 {
    now.div_euclid(WINDOW_SECONDS) * WINDOW_SECONDS
}

fn hash_part(digest: &mut Sha256, value: &str) {
    digest.update((value.len() as u64).to_be_bytes());
    digest.update(value.as_bytes());
}
