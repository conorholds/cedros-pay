//! Durable progress marker for an out-of-order native-store notification.

use serde_json::{json, Value};

use crate::db::{BatchOp, Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedCondition;
use crate::ids;
use crate::seams::HostSeams;
use crate::time;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum TargetState {
    Pending,
    Applied,
    Irrelevant,
    NotRequired,
}

impl TargetState {
    fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Applied => "applied",
            Self::Irrelevant => "irrelevant",
            Self::NotRequired => "not_required",
        }
    }

    fn parse(value: Option<&Value>) -> AppResult<Self> {
        match value.and_then(Value::as_str) {
            Some("pending") => Ok(Self::Pending),
            Some("applied") => Ok(Self::Applied),
            Some("irrelevant") => Ok(Self::Irrelevant),
            Some("not_required") => Ok(Self::NotRequired),
            _ => Err(AppError::internal(
                "native notification marker target is invalid",
            )),
        }
    }

    fn complete(self) -> bool {
        matches!(self, Self::Applied | Self::Irrelevant | Self::NotRequired)
    }
}

pub(super) struct NotificationMarker {
    key: String,
    original: Option<Value>,
    row: Option<EntryRecord>,
    value: Value,
}

impl NotificationMarker {
    #[allow(clippy::too_many_arguments)]
    pub(super) fn load<S: HostSeams>(
        db: &Db<'_, S>,
        key: String,
        event_id: &str,
        fingerprint: &str,
        requires_subscription: bool,
        requires_ledger: bool,
        event_time_ms: i64,
        now: i64,
    ) -> AppResult<Self> {
        let row = db.read_one(ids::MODEL_WEBHOOK_OUTBOX, &key)?;
        if let Some(existing) = &row {
            validate_identity(&existing.payload, event_id, fingerprint)?;
        }
        let original = row.as_ref().map(|entry| entry.payload.clone());
        let mut value = original.clone().unwrap_or_else(|| {
            json!({ "eventId": event_id, "fingerprint": fingerprint,
                "eventTimeMillis": event_time_ms, "createdAt": time::iso8601(now),
                "status": "pending", "targets": {} })
        });
        if value.get("eventTimeMillis").is_none() {
            value["eventTimeMillis"] = Value::from(event_time_ms);
        }
        ensure_target(&mut value, "subscription", requires_subscription);
        ensure_target(&mut value, "ledger", requires_ledger);
        Ok(Self {
            key,
            original,
            row,
            value,
        })
    }

    pub(super) fn state(&self, target: &str) -> AppResult<TargetState> {
        TargetState::parse(self.value.pointer(&format!("/targets/{target}")))
    }

    pub(super) fn event_time_ms(&self) -> AppResult<i64> {
        self.value
            .get("eventTimeMillis")
            .and_then(Value::as_i64)
            .ok_or_else(|| AppError::internal("native notification marker time is invalid"))
    }

    pub(super) fn set_state(&mut self, target: &str, state: TargetState) {
        self.value["targets"][target] = Value::String(state.as_str().into());
    }

    pub(super) fn finish(mut self, now: i64) -> AppResult<Option<(GuardedCondition, BatchOp)>> {
        let complete = self.state("subscription")?.complete() && self.state("ledger")?.complete();
        self.value["status"] = Value::String(if complete { "applied" } else { "pending" }.into());
        if complete {
            if self.value.get("processedAt").is_none() {
                self.value["processedAt"] = Value::String(time::iso8601(now));
            }
        } else if let Some(object) = self.value.as_object_mut() {
            object.remove("processedAt");
        }
        if self.original.as_ref() == Some(&self.value) {
            return Ok(None);
        }
        let condition = marker_condition(&self.key, self.row.as_ref())?;
        let op = BatchOp::Write {
            content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
            entry_key: self.key,
            data: self.value,
        };
        Ok(Some((condition, op)))
    }
}

fn ensure_target(value: &mut Value, target: &str, required: bool) {
    if value.pointer(&format!("/targets/{target}")).is_none() {
        value["targets"][target] = Value::String(
            if required {
                TargetState::Pending
            } else {
                TargetState::NotRequired
            }
            .as_str()
            .into(),
        );
    }
}

fn validate_identity(value: &Value, event_id: &str, fingerprint: &str) -> AppResult<()> {
    if value.get("eventId").and_then(Value::as_str) != Some(event_id)
        || value.get("fingerprint").and_then(Value::as_str) != Some(fingerprint)
    {
        return Err(AppError::conflict(
            "the notification identity is already claimed by different provider facts",
        ));
    }
    Ok(())
}

fn marker_condition(key: &str, row: Option<&EntryRecord>) -> AppResult<GuardedCondition> {
    let Some(row) = row else {
        return Ok(GuardedCondition::Absent {
            content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
            entry_key: key.into(),
        });
    };
    let expected_version = row.version.clone().ok_or_else(|| {
        AppError::new(
            503,
            "unavailable",
            "database version tokens are unavailable",
        )
    })?;
    Ok(GuardedCondition::Version {
        content_model_id: ids::MODEL_WEBHOOK_OUTBOX,
        entry_key: key.into(),
        expected_version,
    })
}
