//! Validation against Data's pinned schema, plus capacity-json-v1 canonical JSON.
//! This validator implements only the keywords in the pinned contract and rejects
//! unknown patterns. It is not a general JSON Schema implementation.
use crate::error::{AppError, AppResult};
use serde::de::{self, MapAccess, SeqAccess, Visitor};
use serde::{Deserialize, Deserializer};
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::sync::OnceLock;

pub const VERSION: &str = "1.0.0";
pub const MAX: u64 = 9_007_199_254_740_991;
pub fn contract() -> &'static Value {
    static CONTRACT: OnceLock<Value> = OnceLock::new();
    CONTRACT.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../../docs/contracts/capacity-v1/portal-usage-capacity-v1.contract.json"
        ))
        .expect("pinned contract")
    })
}
pub fn invalid() -> AppError {
    AppError::new(422, "invalid_request", "invalid capacity request")
}
pub fn unavailable() -> AppError {
    AppError::new(503, "source_unavailable", "capacity source is unavailable")
}
pub fn conflict(code: &'static str) -> AppError {
    AppError::new(
        409,
        code,
        "capacity operation conflicts with persisted state",
    )
}
pub fn validate(name: &str, value: &Value) -> AppResult<()> {
    if conforms(&contract()["$defs"][name], value) {
        Ok(())
    } else {
        Err(invalid())
    }
}
fn conforms(s: &Value, v: &Value) -> bool {
    if s.is_null() {
        return false;
    }
    if let Some(r) = s["$ref"].as_str() {
        if !conforms(&contract()["$defs"][r.trim_start_matches("#/$defs/")], v) {
            return false;
        }
    }
    if s.get("const").is_some_and(|c| c != v) {
        return false;
    }
    if s["enum"].as_array().is_some_and(|a| !a.contains(v)) {
        return false;
    }
    if s["allOf"]
        .as_array()
        .is_some_and(|a| !a.iter().all(|s| conforms(s, v)))
    {
        return false;
    }
    if s["anyOf"]
        .as_array()
        .is_some_and(|a| !a.iter().any(|s| conforms(s, v)))
    {
        return false;
    }
    if let Some(i) = s.get("if") {
        let branch = if conforms(i, v) { "then" } else { "else" };
        if s.get(branch).is_some_and(|b| !conforms(b, v)) {
            return false;
        }
    }
    if let Some(t) = s["type"].as_str() {
        let valid = match t {
            "object" => v.is_object(),
            "array" => v.is_array(),
            "string" => v.is_string(),
            "integer" => v.as_i64().is_some() || v.as_u64().is_some(),
            "boolean" => v.is_boolean(),
            "null" => v.is_null(),
            _ => false,
        };
        if !valid {
            return false;
        }
    }
    if let Some(o) = v.as_object() {
        if s["required"]
            .as_array()
            .is_some_and(|a| a.iter().any(|k| !o.contains_key(k.as_str().unwrap_or(""))))
        {
            return false;
        }
        for (k, v) in o {
            if let Some(p) = s["properties"].get(k) {
                if !conforms(p, v) {
                    return false;
                }
            } else if s["additionalProperties"] == false {
                return false;
            }
        }
    }
    if let Some(a) = v.as_array() {
        if let Some(items) = s.get("items") {
            if !a.iter().all(|v| conforms(items, v)) {
                return false;
            }
        }
        if s["minItems"].as_u64().is_some_and(|m| (a.len() as u64) < m)
            || s["maxItems"].as_u64().is_some_and(|m| (a.len() as u64) > m)
        {
            return false;
        }
    }
    if let Some(n) = v.as_i64() {
        if s["minimum"].as_i64().is_some_and(|m| n < m)
            || s["maximum"].as_i64().is_some_and(|m| n > m)
        {
            return false;
        }
    } else if v.is_number() {
        return false;
    }
    if let Some(t) = v.as_str() {
        let len = t.chars().count() as u64;
        if s["minLength"].as_u64().is_some_and(|m| len < m)
            || s["maxLength"].as_u64().is_some_and(|m| len > m)
        {
            return false;
        }
        if s["format"] == "date-time" && (!t.ends_with('Z') || crate::time::parse_iso(t).is_none())
        {
            return false;
        }
        if let Some(pattern) = s["pattern"].as_str() {
            let valid = match pattern {
                "Z$" => t.ends_with('Z'),
                "^https://" => t.starts_with("https://"),
                "^[A-Z]{3}$" => t.len() == 3 && t.bytes().all(|b| b.is_ascii_uppercase()),
                "^[0-9a-f]{64}$" => {
                    t.len() == 64
                        && t.bytes()
                            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
                }
                "^sha256:[0-9a-f]{64}$" => t.strip_prefix("sha256:").is_some_and(|h| {
                    h.len() == 64
                        && h.bytes()
                            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
                }),
                _ => false,
            };
            if !valid {
                return false;
            }
        }
    }
    true
}
pub fn digest(v: &Value) -> AppResult<String> {
    fn canonical(v: &Value) -> AppResult<Value> {
        Ok(match v {
            Value::Number(n) => {
                if n.as_i64().is_none_or(|n| n.unsigned_abs() > MAX) {
                    return Err(invalid());
                }
                v.clone()
            }
            Value::Object(o) => {
                let mut sorted = BTreeMap::new();
                for (k, v) in o {
                    if !k.is_ascii() {
                        return Err(invalid());
                    }
                    sorted.insert(k.clone(), canonical(v)?);
                }
                Value::Object(sorted.into_iter().collect())
            }
            Value::Array(a) => Value::Array(a.iter().map(canonical).collect::<AppResult<_>>()?),
            _ => v.clone(),
        })
    }
    let bytes = serde_json::to_vec(&canonical(v)?).map_err(|_| invalid())?;
    Ok(format!("sha256:{}", hex::encode(Sha256::digest(bytes))))
}
pub fn parse(raw: &str) -> AppResult<Value> {
    let mut d = serde_json::Deserializer::from_str(raw);
    let value = Unique::deserialize(&mut d).map_err(|_| invalid())?.0;
    d.end().map_err(|_| invalid())?;
    digest(&value)?;
    Ok(value)
}
struct Unique(Value);
impl<'de> Deserialize<'de> for Unique {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        struct V;
        impl<'de> Visitor<'de> for V {
            type Value = Unique;
            fn expecting(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
                f.write_str("JSON without duplicate keys")
            }
            fn visit_bool<E: de::Error>(self, v: bool) -> Result<Unique, E> {
                Ok(Unique(v.into()))
            }
            fn visit_i64<E: de::Error>(self, v: i64) -> Result<Unique, E> {
                Ok(Unique(v.into()))
            }
            fn visit_u64<E: de::Error>(self, v: u64) -> Result<Unique, E> {
                Ok(Unique(v.into()))
            }
            fn visit_f64<E: de::Error>(self, _: f64) -> Result<Unique, E> {
                Err(E::custom("floats forbidden"))
            }
            fn visit_str<E: de::Error>(self, v: &str) -> Result<Unique, E> {
                Ok(Unique(v.into()))
            }
            fn visit_string<E: de::Error>(self, v: String) -> Result<Unique, E> {
                Ok(Unique(v.into()))
            }
            fn visit_unit<E: de::Error>(self) -> Result<Unique, E> {
                Ok(Unique(Value::Null))
            }
            fn visit_none<E: de::Error>(self) -> Result<Unique, E> {
                self.visit_unit()
            }
            fn visit_seq<A: SeqAccess<'de>>(self, mut a: A) -> Result<Unique, A::Error> {
                let mut values = vec![];
                while let Some(v) = a.next_element::<Unique>()? {
                    values.push(v.0);
                }
                Ok(Unique(Value::Array(values)))
            }
            fn visit_map<A: MapAccess<'de>>(self, mut a: A) -> Result<Unique, A::Error> {
                let mut values = Map::new();
                while let Some((k, v)) = a.next_entry::<String, Unique>()? {
                    if values.insert(k, v.0).is_some() {
                        return Err(de::Error::custom("duplicate key"));
                    }
                }
                Ok(Unique(Value::Object(values)))
            }
        }
        d.deserialize_any(V)
    }
}
pub fn text<'a>(v: &'a Value, k: &str) -> AppResult<&'a str> {
    v[k].as_str().filter(|s| !s.is_empty()).ok_or_else(invalid)
}
pub fn number(v: &Value, k: &str) -> AppResult<u64> {
    v[k].as_u64().filter(|n| *n <= MAX).ok_or_else(invalid)
}
pub fn stamp(v: &Value, k: &str) -> AppResult<i64> {
    crate::time::parse_iso(text(v, k)?).ok_or_else(invalid)
}
pub fn random(prefix: &str) -> AppResult<String> {
    let mut b = [0u8; 24];
    getrandom::fill(&mut b).map_err(|_| unavailable())?;
    Ok(format!("{prefix}_{}", hex::encode(b)))
}
