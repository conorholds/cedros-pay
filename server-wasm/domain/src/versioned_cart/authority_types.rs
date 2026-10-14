use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CartWriteRequest {
    pub lane: String,
    pub generation: String,
    pub expected_version: u64,
    pub operation_id: String,
    pub mutation: ClientCartMutation,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum ClientCartMutation {
    Add {
        item: ClientCartItem,
    },
    SetQuantity {
        item: ClientCartItem,
    },
    Remove {
        resource: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        variant_id: Option<String>,
    },
    ReplaceSnapshot {
        snapshot: ClientCartSnapshot,
    },
    Clear {},
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ClientCartItem {
    pub resource: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variant_id: Option<String>,
    pub qty: u64,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub display_metadata: BTreeMap<String, String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ClientCartSnapshot {
    pub items: Vec<ClientCartItem>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub promo_code: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub promo_codes: Vec<String>,
}
