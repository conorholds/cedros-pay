//! Typed operations for atomic host database batches.

use serde_json::{json, Value};

/// Host-enforced mutation policy for one extension-owned content model.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WritePolicy {
    /// Reject every write/delete outside a guarded or conditional transaction.
    GuardedOnly,
    /// Restore legacy unguarded writes and deletes.
    Open,
}

/// One operation in an atomic `batch`.
#[derive(Debug, Clone)]
pub enum BatchOp {
    Write {
        content_model_id: &'static str,
        entry_key: String,
        data: Value,
    },
    Delete {
        content_model_id: &'static str,
        entry_key: String,
    },
    /// Durably changes host write enforcement for the whole content model.
    /// The manifest access must grant both write and delete scopes.
    SetWritePolicy {
        content_model_id: &'static str,
        policy: WritePolicy,
    },
}

impl BatchOp {
    pub(crate) fn target(&self) -> Option<(&str, &str)> {
        match self {
            Self::Write {
                content_model_id,
                entry_key,
                ..
            }
            | Self::Delete {
                content_model_id,
                entry_key,
            } => Some((content_model_id, entry_key)),
            Self::SetWritePolicy { .. } => None,
        }
    }

    pub(crate) fn to_json(&self) -> Value {
        match self {
            Self::Write {
                content_model_id,
                entry_key,
                data,
            } => json!({
                "op": "write", "contentModelId": content_model_id,
                "entryKey": entry_key, "data": data,
            }),
            Self::Delete {
                content_model_id,
                entry_key,
            } => json!({
                "op": "delete", "contentModelId": content_model_id, "entryKey": entry_key,
            }),
            Self::SetWritePolicy {
                content_model_id,
                policy,
            } => json!({
                "op": "setWritePolicy",
                "contentModelId": content_model_id,
                "policy": match policy {
                    WritePolicy::GuardedOnly => "guarded-only",
                    WritePolicy::Open => "open",
                },
            }),
        }
    }
}
