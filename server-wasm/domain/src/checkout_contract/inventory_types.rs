use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Clone, Debug)]
pub(super) struct StockIntent {
    pub resource: String,
    pub variant_id: Option<String>,
    pub quantity: u64,
    pub catalog_seed_on_hand: Option<u64>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct StockState {
    pub on_hand: u64,
    pub reserved: u64,
    pub sold: u64,
    pub available: u64,
    pub updated_at: i64,
    pub revision: Option<String>,
}

#[derive(Clone, Debug)]
pub(super) struct CatalogGuard {
    pub resource: String,
    pub version: String,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct StockRecord {
    pub schema_version: u8,
    pub stock_key: String,
    pub resource: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variant_id: Option<String>,
    pub on_hand: u64,
    pub reserved: u64,
    pub sold: u64,
    pub updated_at: i64,
}

impl StockRecord {
    pub(super) fn available(&self) -> Option<u64> {
        self.on_hand.checked_sub(self.reserved)
    }

    pub(super) fn state(&self, revision: Option<String>) -> StockState {
        StockState {
            on_hand: self.on_hand,
            reserved: self.reserved,
            sold: self.sold,
            available: self.on_hand - self.reserved,
            updated_at: self.updated_at,
            revision,
        }
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum HoldStatus {
    Active,
    CheckoutPending,
    Released,
    Committed,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct HoldLine {
    pub stock_key: String,
    pub resource: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variant_id: Option<String>,
    pub quantity: u64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct HoldRecord {
    pub schema_version: u8,
    pub provider_scope: String,
    pub quote_operation_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub checkout_operation_id: Option<String>,
    pub status: HoldStatus,
    pub lines: Vec<HoldLine>,
    pub expires_at: i64,
    pub updated_at: i64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct InventoryReservationContext {
    pub hold_id: String,
    pub lines: Vec<HoldLine>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct InventoryHoldSnapshot {
    pub hold_id: String,
    pub expires_at: String,
}

pub(super) struct PreparedStock {
    pub record: StockRecord,
    pub condition: crate::guarded_batch::GuardedCondition,
    pub reservation_quantity: u64,
}

pub(super) fn stock_key(resource: &str, variant_id: Option<&str>) -> String {
    digest_key("checkout-stock", &[resource, variant_id.unwrap_or("")])
}

pub(super) fn hold_key(provider_scope: &str, quote_operation_id: &str) -> String {
    digest_key("checkout-hold", &[provider_scope, quote_operation_id])
}

fn digest_key(domain: &str, values: &[&str]) -> String {
    let mut digest = Sha256::new();
    digest.update(b"cedros-pay-inventory-v1\0");
    digest.update(domain.as_bytes());
    for value in values {
        digest.update((value.len() as u64).to_be_bytes());
        digest.update(value.as_bytes());
    }
    format!("{domain}:{}", hex::encode(digest.finalize()))
}
