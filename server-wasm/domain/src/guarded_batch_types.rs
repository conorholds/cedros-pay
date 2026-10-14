//! Public value types for schema-v1 guarded database batches.

use serde::Deserialize;

/// A precondition evaluated atomically before any batch operation.
#[derive(Debug, Clone)]
pub enum GuardedCondition {
    Absent {
        content_model_id: &'static str,
        entry_key: String,
    },
    Version {
        content_model_id: &'static str,
        entry_key: String,
        expected_version: String,
    },
}

impl GuardedCondition {
    pub(crate) fn target(&self) -> (&str, &str) {
        match self {
            Self::Absent {
                content_model_id,
                entry_key,
            }
            | Self::Version {
                content_model_id,
                entry_key,
                ..
            } => (content_model_id, entry_key),
        }
    }

    pub(crate) fn predicate(&self) -> GuardPredicate {
        match self {
            Self::Absent { .. } => GuardPredicate::Absent,
            Self::Version { .. } => GuardPredicate::Version,
        }
    }
}

/// Redacted first-failing condition returned as a domain outcome.
#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GuardedConflict {
    pub condition_index: usize,
    pub content_model_id: String,
    pub entry_key: String,
    pub predicate: GuardPredicate,
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum GuardPredicate {
    Absent,
    Version,
}

/// Opaque post-write token. It is valid only for equality comparison.
#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GuardedEntryVersion {
    pub content_model_id: String,
    pub entry_key: String,
    pub version: String,
}

/// Guarded mutation result. Conflicts are expected domain outcomes, not errors.
#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(tag = "outcome", rename_all = "lowercase")]
pub enum GuardedBatchOutcome {
    Applied {
        applied: i64,
        #[serde(default)]
        entries: Vec<GuardedEntryVersion>,
    },
    Conflict {
        conflict: GuardedConflict,
    },
}
