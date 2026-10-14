use serde_json::Value;
use sha2::{Digest, Sha256};

/// Server-computed digest of canonical checkout or quote material.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MaterialFingerprint(String);

impl MaterialFingerprint {
    pub fn from_server_material(material: &Value) -> Self {
        let mut canonical = Vec::new();
        canonical_json(material, &mut canonical);
        let mut digest = Sha256::new();
        digest.update(b"cedros-pay-checkout-material\0");
        digest.update(canonical);
        Self(hex::encode(digest.finalize()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

fn canonical_json(value: &Value, output: &mut Vec<u8>) {
    match value {
        Value::Null => output.extend_from_slice(b"n"),
        Value::Bool(value) => output.extend_from_slice(if *value { b"t" } else { b"f" }),
        Value::Number(value) => {
            output.extend_from_slice(b"d:");
            output.extend_from_slice(value.to_string().as_bytes());
        }
        Value::String(value) => {
            output.extend_from_slice(b"s:");
            canonical_bytes(output, value.as_bytes());
        }
        Value::Array(values) => {
            output.extend_from_slice(b"a[");
            for value in values {
                canonical_json(value, output);
            }
            output.push(b']');
        }
        Value::Object(values) => {
            output.extend_from_slice(b"o{");
            let mut keys = values.keys().collect::<Vec<_>>();
            keys.sort_unstable();
            for key in keys {
                canonical_bytes(output, key.as_bytes());
                canonical_json(&values[key], output);
            }
            output.push(b'}');
        }
    }
}

fn canonical_bytes(output: &mut Vec<u8>, bytes: &[u8]) {
    output.extend_from_slice(&(bytes.len() as u64).to_be_bytes());
    output.extend_from_slice(bytes);
}
