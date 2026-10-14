use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::db::{Db, Dir, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

use super::STOCK_MODEL;

const RECORD_TYPE: &str = "inventoryAdjustment";
const MAX_HISTORY_RECORDS: usize = 500;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase", deny_unknown_fields)]
pub(crate) enum Movement {
    Set { quantity: u64 },
    Adjust { delta: i64 },
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum ActorClass {
    SystemAdmin,
    ExtensionAdmin,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct AuditIdentity {
    pub operation_id: String,
    pub actor: ActorClass,
    pub reason: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct AdjustmentAudit {
    pub schema_version: u8,
    pub record_type: String,
    pub operation_id: String,
    pub product_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variant_id: Option<String>,
    pub movement: Movement,
    pub quantity_before: u64,
    pub quantity_after: u64,
    pub actor: ActorClass,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    pub created_at: i64,
}

impl AdjustmentAudit {
    pub(crate) fn new(
        identity: &AuditIdentity,
        product_id: &str,
        variant_id: Option<&str>,
        movement: Movement,
        before: u64,
        after: u64,
        created_at: i64,
    ) -> Self {
        Self {
            schema_version: 1,
            record_type: RECORD_TYPE.into(),
            operation_id: identity.operation_id.clone(),
            product_id: product_id.into(),
            variant_id: variant_id.map(str::to_string),
            movement,
            quantity_before: before,
            quantity_after: after,
            actor: identity.actor,
            reason: identity.reason.clone(),
            created_at,
        }
    }

    pub(crate) fn validates(&self, key: &str) -> bool {
        self.schema_version == 1
            && self.record_type == RECORD_TYPE
            && audit_key(
                &self.operation_id,
                &self.product_id,
                self.variant_id.as_deref(),
            ) == key
    }

    pub(crate) fn matches_request(
        &self,
        identity: &AuditIdentity,
        product_id: &str,
        variant_id: Option<&str>,
        movement: &Movement,
    ) -> bool {
        self.operation_id == identity.operation_id
            && self.product_id == product_id
            && self.variant_id.as_deref() == variant_id
            && self.movement == *movement
            && self.actor == identity.actor
            && self.reason == identity.reason
    }
}

pub(crate) fn audit_key(operation_id: &str, product_id: &str, variant_id: Option<&str>) -> String {
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-inventory-audit-v1\0");
    for value in [operation_id, product_id, variant_id.unwrap_or("")] {
        digest.update((value.len() as u64).to_be_bytes());
        digest.update(value.as_bytes());
    }
    format!("inventory-audit:{}", hex::encode(digest.finalize()))
}

pub(crate) fn read<S: HostSeams>(db: &Db<'_, S>, key: &str) -> AppResult<Option<AdjustmentAudit>> {
    let Some(entry) = db.read_one(STOCK_MODEL, key)? else {
        return Ok(None);
    };
    let record = entry.parse::<AdjustmentAudit>()?;
    if !record.validates(key) {
        return Err(AppError::internal("stored inventory audit is invalid"));
    }
    Ok(Some(record))
}

pub(crate) fn history<S: HostSeams>(
    seams: &S,
    product_id: &str,
) -> AppResult<(Vec<AdjustmentAudit>, bool)> {
    let query = Query::new()
        .filter(Filter::new("recordType", Op::Eq, RECORD_TYPE))
        .filter(Filter::new("productId", Op::Eq, product_id))
        .order("createdAt", Dir::Desc);
    let entries = Db::new(seams, crate::ids::DB_ACCESS).read_paged(
        STOCK_MODEL,
        &query,
        100,
        (MAX_HISTORY_RECORDS / 100) + 1,
    )?;
    let truncated = entries.len() > MAX_HISTORY_RECORDS;
    let mut records = entries
        .into_iter()
        .take(MAX_HISTORY_RECORDS)
        .map(|entry| {
            let record = entry.parse::<AdjustmentAudit>()?;
            if !record.validates(&entry.entry_key) || record.product_id != product_id {
                return Err(AppError::internal("stored inventory audit is invalid"));
            }
            Ok(record)
        })
        .collect::<AppResult<Vec<_>>>()?;
    records.sort_by(|left, right| {
        right
            .created_at
            .cmp(&left.created_at)
            .then_with(|| right.operation_id.cmp(&left.operation_id))
            .then_with(|| right.variant_id.cmp(&left.variant_id))
    });
    Ok((records, truncated))
}
