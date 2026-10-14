use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::error::{AppError, AppResult};
use crate::time;

pub(super) const DISPUTE_KIND: &str = "dispute";
pub(super) const MAX_REFERENCE_LEN: usize = 240;
const MAX_ID_LEN: usize = 120;
const MAX_REASON_LEN: usize = 2_000;
const MAX_METADATA_ENTRIES: usize = 50;
const MAX_METADATA_KEY_LEN: usize = 120;
const MAX_METADATA_VALUE_LEN: usize = 1_000;
const PERSISTED_METADATA_KEYS: [&str; 6] = [
    "invoiceRef",
    "ledgerRef",
    "orderReference",
    "productId",
    "reference",
    "subscriptionRef",
];

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct DisputeRecord {
    pub(super) kind: String,
    pub(super) id: String,
    pub(super) source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) order_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) payment_intent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) charge_id: Option<String>,
    pub(super) status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) reason: Option<String>,
    pub(super) amount: i64,
    pub(super) currency: String,
    #[serde(default)]
    pub(super) metadata: BTreeMap<String, String>,
    pub(super) created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) updated_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) status_updated_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(super) provider_event_created: Option<i64>,
}

pub(super) fn parse_stored(value: Value, expected_id: Option<&str>) -> AppResult<DisputeRecord> {
    let record: DisputeRecord = serde_json::from_value(value).map_err(|error| {
        AppError::internal("stored dispute is malformed").with_internal(error.to_string())
    })?;
    validate_record(&record, expected_id)?;
    Ok(record)
}

pub(super) fn validate_record(record: &DisputeRecord, expected_id: Option<&str>) -> AppResult<()> {
    let invalid =
        |detail: String| AppError::internal("stored dispute is malformed").with_internal(detail);
    if record.kind != DISPUTE_KIND || expected_id.is_some_and(|id| record.id != id) {
        return Err(invalid(
            "kind or id does not match the ledger entry".to_string(),
        ));
    }
    normalize_id(&record.id).map_err(|error| invalid(error.message))?;
    normalize_text(&record.source, "source", MAX_REFERENCE_LEN)
        .map_err(|error| invalid(error.message))?;
    normalize_status(&record.status).map_err(|error| invalid(error.message))?;
    normalize_currency(&record.currency).map_err(|error| invalid(error.message))?;
    if record.amount <= 0 {
        return Err(invalid("amount must be positive".to_string()));
    }
    for value in [
        record.order_id.as_deref(),
        record.payment_intent_id.as_deref(),
        record.charge_id.as_deref(),
    ]
    .into_iter()
    .flatten()
    {
        normalize_text(value, "reference", MAX_REFERENCE_LEN)
            .map_err(|error| invalid(error.message))?;
    }
    if record
        .reason
        .as_deref()
        .is_some_and(|reason| reason.len() > MAX_REASON_LEN || reason.chars().any(char::is_control))
    {
        return Err(invalid("reason is invalid".to_string()));
    }
    validate_metadata(&record.metadata).map_err(|error| invalid(error.message))?;
    for timestamp in [
        Some(record.created_at.as_str()),
        record.updated_at.as_deref(),
        record.status_updated_at.as_deref(),
    ]
    .into_iter()
    .flatten()
    {
        if time::parse_iso(timestamp).is_none() {
            return Err(invalid("timestamp is invalid".to_string()));
        }
    }
    Ok(())
}

pub(super) fn encode_record(record: &DisputeRecord) -> AppResult<Value> {
    serde_json::to_value(record).map_err(|error| {
        AppError::internal("cannot encode dispute").with_internal(error.to_string())
    })
}

pub(super) fn public_dispute(record: &DisputeRecord) -> Value {
    let mut value = serde_json::to_value(record).unwrap_or(Value::Null);
    if let Value::Object(object) = &mut value {
        object.remove("kind");
        object.remove("providerEventCreated");
    }
    value
}

pub(super) fn normalize_id(value: &str) -> AppResult<String> {
    let id = value.trim();
    if id.is_empty()
        || id.len() > MAX_ID_LEN
        || !id
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.'))
    {
        return Err(AppError::bad_request("invalid dispute id"));
    }
    Ok(id.to_string())
}

pub(super) fn normalize_status(value: &str) -> AppResult<String> {
    let status = value.trim().to_ascii_lowercase();
    if matches!(
        status.as_str(),
        "warning_needs_response"
            | "warning_under_review"
            | "warning_closed"
            | "needs_response"
            | "under_review"
            | "won"
            | "lost"
            | "prevented"
    ) {
        Ok(status)
    } else {
        Err(AppError::bad_request("invalid dispute status"))
    }
}

pub(super) fn valid_transition(from: &str, to: &str) -> bool {
    from == to
        || matches!(
            (from, to),
            (
                "warning_needs_response",
                "warning_under_review" | "warning_closed" | "prevented" | "needs_response"
            ) | (
                "warning_under_review",
                "warning_closed" | "prevented" | "needs_response"
            ) | ("needs_response", "under_review" | "lost")
                | ("under_review", "won" | "lost")
        )
}

pub(super) fn normalize_currency(value: &str) -> AppResult<String> {
    let currency = value.trim();
    if currency.len() != 3 || !currency.chars().all(|ch| ch.is_ascii_alphabetic()) {
        return Err(AppError::bad_request("currency must be a 3-letter code"));
    }
    Ok(currency.to_ascii_uppercase())
}

pub(super) fn normalize_text(value: &str, field: &str, max_len: usize) -> AppResult<String> {
    let value = value.trim();
    if value.is_empty() || value.len() > max_len || value.chars().any(char::is_control) {
        return Err(AppError::bad_request(format!("{field} is invalid")));
    }
    Ok(value.to_string())
}

pub(super) fn metadata(object: &Value) -> AppResult<BTreeMap<String, String>> {
    let values = object
        .get("metadata")
        .and_then(Value::as_object)
        .map(|metadata| {
            metadata
                .iter()
                .filter(|(key, _)| PERSISTED_METADATA_KEYS.contains(&key.as_str()))
                .filter_map(|(key, value)| value.as_str().map(|value| (key.clone(), value.into())))
                .collect::<BTreeMap<_, _>>()
        })
        .unwrap_or_default();
    validate_metadata(&values)?;
    Ok(values)
}

fn validate_metadata(metadata: &BTreeMap<String, String>) -> AppResult<()> {
    if metadata.len() > MAX_METADATA_ENTRIES {
        return Err(AppError::bad_request(
            "dispute metadata has too many entries",
        ));
    }
    for (key, value) in metadata {
        normalize_text(key, "metadata key", MAX_METADATA_KEY_LEN)?;
        if value.len() > MAX_METADATA_VALUE_LEN || value.chars().any(char::is_control) {
            return Err(AppError::bad_request("metadata value is invalid"));
        }
    }
    Ok(())
}

pub(super) fn object_text<'a>(object: &'a Value, key: &str) -> Option<&'a str> {
    object
        .get(key)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

pub(super) fn expanded_object_id(value: Option<&Value>) -> Option<String> {
    value
        .and_then(|value| {
            value
                .as_str()
                .or_else(|| value.get("id").and_then(Value::as_str))
        })
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}

pub(super) fn first_metadata(metadata: &BTreeMap<String, String>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .find_map(|key| metadata.get(*key))
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(str::to_string)
}
