use std::collections::{BTreeMap, BTreeSet};

use serde::{Deserialize, Serialize};

use super::CartLine;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct GenerationRecord {
    pub schema_version: u8,
    pub scope_hash: String,
    pub provider: String,
    pub epoch: u64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct CartRecord {
    pub schema_version: u8,
    pub scope_hash: String,
    pub lane_hash: String,
    pub generation_epoch: u64,
    pub version: u64,
    pub lines: BTreeMap<String, CartLine>,
    pub total_quantity: u64,
    pub subtotal_cents: u64,
    pub currency: Option<String>,
    #[serde(default)]
    pub promo_code: Option<String>,
    #[serde(default)]
    pub promo_codes: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl CartRecord {
    pub(super) fn sorted_lines(&self) -> Vec<CartLine> {
        let mut lines = self.lines.values().cloned().collect::<Vec<_>>();
        lines.sort_by_key(|line| line.position);
        lines
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct MutationRecord {
    pub schema_version: u8,
    pub scope_hash: String,
    pub lane_hash: String,
    pub operation_hash: String,
    pub fingerprint: String,
    pub result_version: u64,
    pub created_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct OperationTombstone {
    pub schema_version: u8,
    pub scope_hash: String,
    pub lane_hash: String,
    pub operation_hash: String,
    pub fingerprint: String,
    pub created_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct LaneRegistryRecord {
    pub schema_version: u8,
    pub scope_hash: String,
    pub lane_hashes: BTreeSet<String>,
    pub updated_at: String,
}

pub(super) struct Versioned<T> {
    pub value: T,
    pub revision: String,
}
