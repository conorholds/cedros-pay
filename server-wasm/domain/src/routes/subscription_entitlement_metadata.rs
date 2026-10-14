use serde_json::{Map, Value};

const MAX_DEPTH: usize = 8;
const MAX_NODES: usize = 512;
const MAX_ARRAY_ITEMS: usize = 64;
const MAX_KEY_LEN: usize = 160;
const MAX_STRING_LEN: usize = 2_000;

pub(super) fn projected_namespace(record: &Value) -> Option<Map<String, Value>> {
    let metadata_json = metadata_json(record, "entitlements");
    let mut nodes = 0;
    let mut projected = Map::new();
    for source in [
        metadata_json.as_ref(),
        record.pointer("/metadata/entitlements"),
        record.pointer("/entitlements"),
    ]
    .into_iter()
    .flatten()
    {
        if let Some(values) = project_object(source, 0, &mut nodes) {
            projected.extend(values);
        }
    }
    (!projected.is_empty()).then_some(projected)
}

fn metadata_json(record: &Value, key: &str) -> Option<Value> {
    let raw = record
        .get("metadata")
        .and_then(|metadata| metadata.get(key))
        .and_then(Value::as_str)?;
    serde_json::from_str(raw).ok()
}

fn project_object(value: &Value, depth: usize, nodes: &mut usize) -> Option<Map<String, Value>> {
    if depth > MAX_DEPTH {
        return None;
    }
    let object = value.as_object()?;
    let projected = object
        .iter()
        .filter(|(key, _)| safe_key(key))
        .filter_map(|(key, value)| {
            project_value(value, depth + 1, nodes).map(|value| (key.clone(), value))
        })
        .collect::<Map<_, _>>();
    (!projected.is_empty()).then_some(projected)
}

fn project_value(value: &Value, depth: usize, nodes: &mut usize) -> Option<Value> {
    if depth > MAX_DEPTH || *nodes >= MAX_NODES {
        return None;
    }
    *nodes += 1;
    match value {
        Value::Null => None,
        Value::Bool(_) | Value::Number(_) => Some(value.clone()),
        Value::String(text) if text.len() <= MAX_STRING_LEN => Some(value.clone()),
        Value::String(_) => None,
        Value::Array(values) if values.len() <= MAX_ARRAY_ITEMS => {
            let values = values
                .iter()
                .filter_map(|value| project_value(value, depth + 1, nodes))
                .collect::<Vec<_>>();
            (!values.is_empty()).then_some(Value::Array(values))
        }
        Value::Array(_) => None,
        Value::Object(_) => project_object(value, depth, nodes).map(Value::Object),
    }
}

fn safe_key(key: &str) -> bool {
    let normalized = key.trim();
    if normalized.is_empty()
        || normalized != key
        || normalized.len() > MAX_KEY_LEN
        || !normalized
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b':' | b'-'))
    {
        return false;
    }
    let lower = normalized.to_ascii_lowercase();
    let compact = lower
        .bytes()
        .filter(|byte| byte.is_ascii_alphanumeric())
        .map(char::from)
        .collect::<String>();
    ![
        "secret",
        "password",
        "credential",
        "privatekey",
        "activationcode",
        "invitecode",
        "accesstoken",
        "refreshtoken",
        "apikey",
        "authtoken",
        "bearertoken",
        "clienttoken",
        "signingkey",
        "authorization",
    ]
    .iter()
    .any(|blocked| compact.contains(blocked))
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn projects_generic_namespaced_entitlements_and_redacts_unsafe_values() {
        let record = json!({
            "metadata": {
                "entitlements": {
                    "cedros.portal.siteQuantity": 3,
                    "email.monthlySends": 10000,
                    "tiers": ["standard", "priority"],
                    "nested": { "enabled": true, "clientToken": "do-not-return" },
                    "webhookUrl": "https://hooks.example/entitlements/abcdefghijklmnopqrstuvwxyz0123456789",
                    "apiSecret": "do-not-return",
                    "apiKey": "do-not-return",
                    "api-key": "do-not-return",
                    "authToken": "do-not-return",
                    "bearerToken": "do-not-return",
                    "private-key": "do-not-return",
                    "signingKey": "do-not-return",
                    "empty": null
                },
                "buyerEmail": "buyer@example.com"
            }
        });

        let projected = projected_namespace(&record).expect("entitlements");

        assert_eq!(projected["cedros.portal.siteQuantity"], 3);
        assert_eq!(projected["email.monthlySends"], 10000);
        assert_eq!(projected["nested"]["enabled"], true);
        assert!(projected["nested"].get("clientToken").is_none());
        for key in [
            "apiSecret",
            "apiKey",
            "api-key",
            "authToken",
            "bearerToken",
            "private-key",
            "signingKey",
            "empty",
        ] {
            assert!(!projected.contains_key(key), "projected unsafe key {key}");
        }
        assert_eq!(
            projected["webhookUrl"],
            "https://hooks.example/entitlements/abcdefghijklmnopqrstuvwxyz0123456789"
        );
        assert!(!Value::Object(projected)
            .to_string()
            .contains("buyer@example.com"));
    }
}
