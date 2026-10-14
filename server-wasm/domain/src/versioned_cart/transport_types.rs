use serde::{Deserialize, Serialize};

use super::{CartState, GenerationState};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct LaneRequest {
    pub lane: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct RotateRequest {
    pub lane: String,
    pub expected_generation: String,
}

/// Current server-owned generation and authoritative cart state.
#[derive(Clone, Debug, Deserialize, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CartSnapshot {
    pub generation: GenerationState,
    pub authoritative: CartState,
}

/// Rotation result normalized to the latest authoritative generation.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(
    tag = "outcome",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum RotateCartOutcome {
    Rotated {
        generation: GenerationState,
        authoritative: CartState,
    },
    StaleGeneration {
        current_generation: GenerationState,
        authoritative: CartState,
    },
}
