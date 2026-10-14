//! Query behavior for the domain test seam.

use std::cmp::Ordering;

use serde_json::Value;

use super::FakeSeams;

impl FakeSeams {
    pub(super) fn filtered(&self, model: &str, q: &Value) -> Vec<(String, Value, i64, String)> {
        let db = self.db.borrow();
        let Some(collection) = db.get(model) else {
            return Vec::new();
        };
        let keys: Option<Vec<String>> = q.get("entryKeys").and_then(Value::as_array).map(|items| {
            items
                .iter()
                .filter_map(|value| value.as_str().map(String::from))
                .collect()
        });
        let contains = q.get("contains").and_then(Value::as_object);
        let filters = q.get("filters").and_then(Value::as_array);
        collection
            .iter()
            .filter(|(key, _)| {
                keys.as_ref()
                    .map(|items| items.contains(key))
                    .unwrap_or(true)
            })
            .filter(|(_, entry)| {
                contains
                    .map(|items| object_contains(&entry.payload, items))
                    .unwrap_or(true)
            })
            .filter(|(_, entry)| {
                filters
                    .map(|items| items.iter().all(|f| matches_filter(&entry.payload, f)))
                    .unwrap_or(true)
            })
            .map(|(key, entry)| {
                (
                    key.clone(),
                    entry.payload.clone(),
                    entry.updated_at,
                    entry.version.clone(),
                )
            })
            .collect()
    }

    pub(super) fn select(&self, model: &str, q: &Value) -> Vec<(String, Value, i64, String)> {
        let mut rows = self.filtered(model, q);
        match q.get("orderBy") {
            Some(order) => sort_ordered(&mut rows, order),
            None => rows.sort_by(|a, b| b.2.cmp(&a.2).then(a.0.cmp(&b.0))),
        }
        let offset = q.get("offset").and_then(Value::as_i64).unwrap_or(0).max(0) as usize;
        let rows: Vec<_> = rows.into_iter().skip(offset).collect();
        match q.get("limit").and_then(Value::as_i64) {
            Some(limit) if limit >= 0 => rows.into_iter().take(limit as usize).collect(),
            _ => rows,
        }
    }
}

fn sort_ordered(rows: &mut [(String, Value, i64, String)], order: &Value) {
    let field = order.get("field").and_then(Value::as_str).unwrap_or("");
    let desc = order.get("direction").and_then(Value::as_str) == Some("desc");
    rows.sort_by(|a, b| {
        let field_order = match (a.1.get(field), b.1.get(field)) {
            (None, None) => Ordering::Equal,
            (None, Some(_)) => return Ordering::Greater,
            (Some(_), None) => return Ordering::Less,
            (Some(left), Some(right)) => compare_values(left, right).unwrap_or(Ordering::Equal),
        };
        let directed = if desc {
            field_order.reverse()
        } else {
            field_order
        };
        directed.then(a.0.cmp(&b.0))
    });
}

fn object_contains(payload: &Value, subset: &serde_json::Map<String, Value>) -> bool {
    subset
        .iter()
        .all(|(key, value)| payload.get(key) == Some(value))
}

fn matches_filter(payload: &Value, filter: &Value) -> bool {
    let Some(field) = filter.get("field").and_then(Value::as_str) else {
        return false;
    };
    let op = filter.get("op").and_then(Value::as_str).unwrap_or("");
    let target = filter.get("value").unwrap_or(&Value::Null);
    let Some(field_value) = payload.get(field) else {
        return op == "ne"; // host uses IS DISTINCT FROM, including missing fields
    };
    match op {
        "eq" => values_eq(field_value, target),
        "ne" => !values_eq(field_value, target),
        "like" => match (field_value.as_str(), target.as_str()) {
            (Some(haystack), Some(needle)) => {
                haystack.to_lowercase().contains(&needle.to_lowercase())
            }
            _ => false,
        },
        "lt" | "lte" | "gt" | "gte" => {
            compare_values(field_value, target).is_some_and(|order| compare_matches(order, op))
        }
        _ => false,
    }
}

fn compare_matches(order: Ordering, op: &str) -> bool {
    match op {
        "lt" => order == Ordering::Less,
        "lte" => order != Ordering::Greater,
        "gt" => order == Ordering::Greater,
        _ => order != Ordering::Less,
    }
}

fn values_eq(a: &Value, b: &Value) -> bool {
    match (a.as_f64(), b.as_f64()) {
        (Some(x), Some(y)) => x == y,
        _ => a == b,
    }
}

fn compare_values(a: &Value, b: &Value) -> Option<Ordering> {
    if let (Some(x), Some(y)) = (a.as_f64(), b.as_f64()) {
        return x.partial_cmp(&y);
    }
    a.as_str().zip(b.as_str()).map(|(x, y)| x.cmp(y))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn ordering_keeps_missing_fields_last_and_entry_key_ties_ascending() {
        let s = FakeSeams::new();
        for (id, payload) in [
            ("a", json!({"rank":2})),
            ("b", json!({"rank":2})),
            ("c", json!({"rank":1})),
            ("d", json!({})),
        ] {
            s.seed("model", id, payload);
        }
        for (direction, expected) in [
            ("asc", vec!["c", "a", "b", "d"]),
            ("desc", vec!["a", "b", "c", "d"]),
        ] {
            let rows = s.select(
                "model",
                &json!({"orderBy":{"field":"rank", "direction":direction}}),
            );
            assert_eq!(
                rows.iter().map(|row| row.0.as_str()).collect::<Vec<_>>(),
                expected
            );
        }
        assert!(matches_filter(
            &json!({}),
            &json!({"field":"kind", "op":"ne", "value":"pending"})
        ));
    }
}
