use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CartItemInput {
    pub product_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variant_id: Option<String>,
    #[serde(rename = "qty")]
    pub quantity: u64,
    pub unit_amount_cents: u64,
    pub currency: String,
    pub title_snapshot: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_snapshot: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payment_resource: Option<String>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub metadata: BTreeMap<String, String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hold_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hold_expires_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ShopCartSnapshot {
    pub items: Vec<CartItemInput>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub promo_code: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub promo_codes: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum CartMutation {
    Add {
        item: CartItemInput,
    },
    SetItem {
        item: CartItemInput,
    },
    Remove {
        product_id: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        variant_id: Option<String>,
    },
    Replace {
        snapshot: ShopCartSnapshot,
    },
    Clear {},
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CartCommand {
    pub lane: String,
    pub generation: String,
    pub expected_version: u64,
    pub operation_id: String,
    pub mutation: CartMutation,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CartLine {
    pub line_key: String,
    pub position: u16,
    pub product_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variant_id: Option<String>,
    #[serde(rename = "qty")]
    pub quantity: u64,
    pub unit_amount_cents: u64,
    pub line_total_cents: u64,
    pub currency: String,
    pub title_snapshot: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_snapshot: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payment_resource: Option<String>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub metadata: BTreeMap<String, String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hold_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hold_expires_at: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CartState {
    pub lane: String,
    pub generation_epoch: u64,
    pub version: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub host_revision: Option<String>,
    pub lines: Vec<CartLine>,
    pub total_quantity: u64,
    pub subtotal_cents: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub promo_code: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub promo_codes: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GenerationState {
    pub generation: String,
    pub epoch: u64,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(
    tag = "outcome",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum RotateGenerationOutcome {
    Rotated { generation: GenerationState },
    StaleGeneration { current: GenerationState },
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(
    tag = "outcome",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum ApplyOutcome {
    Applied {
        state: CartState,
    },
    Replayed {
        version: u64,
        authoritative: CartState,
    },
    Conflict {
        authoritative: CartState,
    },
    StaleGeneration {
        current_generation: GenerationState,
        authoritative: CartState,
    },
    IdempotencyConflict {
        authoritative: CartState,
    },
}
