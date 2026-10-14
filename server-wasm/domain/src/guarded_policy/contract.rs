use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const CONTROL_MODEL: &str = "cedros-pay:guarded-write-policy-state";
pub const MARKER_KEY: &str = "active";
pub const CAPABILITY_ID: &str = "cedros-data:extension-storage-cas-v1";
pub const MIN_DATA_VERSION: &str = "0.1.81";
pub const REQUEST_SCHEMA_VERSION: u8 = 1;
pub const HOST_COMMIT: &str = "6a1ddc9beb31b6ab1765777365afeb576886c758";
pub const ACTIVE_POLICY: &str = "guarded-only";
pub const MODEL_SET_SHA256: &str =
    "eb25861790db9cb6da3145426b0afb4dce17b29a39b70651c523f1ed720972b2";

/// Exact, canonical, lexicographically sorted guarded-only model set.
pub const GUARDED_MODELS: [&str; 18] = [
    "cedros-pay:access-passes",
    "cedros-pay:cart",
    "cedros-pay:catalog-fence",
    "cedros-pay:checkout-inventory-holds",
    "cedros-pay:checkout-operations",
    "cedros-pay:checkout-return-index",
    "cedros-pay:checkout-stock",
    "cedros-pay:commerce-ledger",
    "cedros-pay:credits",
    "cedros-pay:customer-cart-generations",
    "cedros-pay:customer-cart-lanes",
    "cedros-pay:customer-cart-operations",
    "cedros-pay:customer-cart-tombstones",
    "cedros-pay:customer-carts",
    "cedros-pay:program-access",
    "cedros-pay:subscriptions",
    "cedros-pay:ucp-sessions",
    "cedros-pay:webhook-outbox",
];

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GuardedPolicyMarker {
    pub schema_version: u8,
    pub capability_id: String,
    pub min_cedros_data_version: String,
    pub request_schema_version: u8,
    pub host_commit: String,
    pub models: Vec<String>,
    pub model_set_sha256: String,
    pub policy: String,
    pub active: bool,
    pub host_timestamp: String,
}

impl GuardedPolicyMarker {
    pub(super) fn new(now: i64) -> Self {
        Self {
            schema_version: 1,
            capability_id: CAPABILITY_ID.into(),
            min_cedros_data_version: MIN_DATA_VERSION.into(),
            request_schema_version: REQUEST_SCHEMA_VERSION,
            host_commit: HOST_COMMIT.into(),
            models: GUARDED_MODELS.iter().map(|model| (*model).into()).collect(),
            model_set_sha256: MODEL_SET_SHA256.into(),
            policy: ACTIVE_POLICY.into(),
            active: true,
            host_timestamp: crate::time::iso8601(now),
        }
    }
}

/// SHA-256 of the compact JSON encoding of [`GUARDED_MODELS`].
pub fn model_set_sha256() -> String {
    let canonical = serde_json::to_vec(&GUARDED_MODELS).expect("static model set serializes");
    hex::encode(Sha256::digest(canonical))
}
