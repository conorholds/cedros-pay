//! UCP platforms prove their own identity with HTTP Message Signatures. This
//! boundary never consumes a Cedros MCP key or grants site-management authority.
use crate::{
    error::{AppError, AppResult},
    reqresp::RouteRequest,
    seams::HostSeams,
};
use base64::{
    engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD},
    Engine,
};
use p256::ecdsa::{signature::Verifier, Signature, VerifyingKey};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

pub(crate) struct VerifiedPlatform {
    profile: String,
}
impl VerifiedPlatform {
    pub(crate) fn profile(&self) -> &str {
        &self.profile
    }
}

pub(super) fn verify<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    origin: &str,
) -> AppResult<VerifiedPlatform> {
    if !req.query.is_empty() {
        return Err(invalid());
    }
    let agent = header(req, "ucp-agent")?;
    let profile = agent
        .strip_prefix("profile=\"")
        .and_then(|v| v.strip_suffix('"'))
        .ok_or_else(invalid)?;
    let rest = profile.strip_prefix("https://").ok_or_else(invalid)?;
    let host = rest.split('/').next().ok_or_else(invalid)?;
    if profile.len() > 2048
        || !profile.is_ascii()
        || profile
            .bytes()
            .any(|c| c.is_ascii_whitespace() || c.is_ascii_control())
        || host.contains(['@', ':', '[', ']'])
        || !host.contains('.')
        || profile.contains(['#', '?', '\\'])
    {
        return Err(invalid());
    }
    let raw = header(req, "signature-input")?;
    let (label, params) = raw.split_once('=').ok_or_else(invalid)?;
    if label.is_empty()
        || !label
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_')
    {
        return Err(invalid());
    }
    let (components, attrs) = params
        .strip_prefix('(')
        .and_then(|v| v.split_once(')'))
        .ok_or_else(invalid)?;
    let components = components
        .split_whitespace()
        .map(|c| {
            c.strip_prefix('"')
                .and_then(|v| v.strip_suffix('"'))
                .ok_or_else(invalid)
        })
        .collect::<AppResult<Vec<_>>>()?;
    let required = ["@method", "@path", "@authority", "ucp-agent"];
    if !required.iter().all(|c| components.contains(c)) || components.len() > 8 {
        return Err(invalid());
    }
    let mut attributes = std::collections::BTreeMap::new();
    for part in attrs.split(';').filter(|v| !v.is_empty()) {
        let (k, v) = part.split_once('=').ok_or_else(invalid)?;
        if attributes.insert(k, v).is_some() {
            return Err(invalid());
        }
    }
    // UCP replay protection is per-operation idempotency, not a mandatory
    // timestamp window. Platforms may omit created and retry older requests.
    let created = attributes
        .get("created")
        .map(|v| v.parse::<i64>().map_err(|_| invalid()))
        .transpose()?;
    if created.is_some_and(|v| v > seams.now_unix_secs().saturating_add(300)) {
        return Err(invalid());
    }
    if let Some(expires) = attributes.get("expires") {
        let expires = expires.parse::<i64>().map_err(|_| invalid())?;
        if expires <= seams.now_unix_secs() || created.is_some_and(|v| expires < v) {
            return Err(invalid());
        }
    }
    let kid = attributes
        .get("keyid")
        .and_then(|v| v.strip_prefix('"'))
        .and_then(|v| v.strip_suffix('"'))
        .ok_or_else(invalid)?;
    if req.method != "GET" {
        super::idempotency_key(req)?;
        if !components.contains(&"idempotency-key") {
            return Err(invalid());
        }
    }
    if !req.body.is_empty() {
        if req.method == "GET"
            || !components.contains(&"content-digest")
            || !components.contains(&"content-type")
        {
            return Err(invalid());
        }
        if header(req, "content-digest")?
            != format!(
                "sha-256=:{}:",
                STANDARD.encode(Sha256::digest(req.body.as_bytes()))
            )
        {
            return Err(invalid());
        }
    }
    if !req.body.is_empty()
        && header(req, "content-type")?.split(';').next() != Some("application/json")
    {
        return Err(invalid());
    }
    let mut seen = std::collections::BTreeSet::new();
    let mut base = Vec::new();
    for component in components {
        if !seen.insert(component) {
            return Err(invalid());
        }
        let value = match component {
            "@method" => req.method.as_str(),
            "@path" => req.path.as_str(),
            "@authority" => origin.strip_prefix("https://").ok_or_else(invalid)?,
            "ucp-agent" | "content-digest" | "content-type" | "idempotency-key" => {
                header(req, component)?
            }
            _ => return Err(invalid()),
        };
        base.push(format!("\"{component}\": {value}"));
    }
    base.push(format!("\"@signature-params\": {params}"));
    let encoded = header(req, "signature")?
        .strip_prefix(&format!("{label}=:"))
        .and_then(|v| v.strip_suffix(':'))
        .ok_or_else(invalid)?;
    let bytes = STANDARD.decode(encoded).map_err(|_| invalid())?;
    let signature = Signature::from_slice(&bytes).map_err(|_| invalid())?;
    // The host enforces HTTPS egress, DNS/IP policy, response bounds and the
    // operator's egress grants. Redirects are not followed to a different key owner.
    let raw = seams
        .http_fetch(
            &json!({"method":"GET", "url":profile,
        "headers":{"accept":"application/json"}, "timeoutMs":3000,"ucpProfile":true})
            .to_string(),
        )
        .map_err(|error| {
            AppError::new(
                424,
                "profile_unreachable",
                "platform profile could not be fetched",
            )
            .with_internal(error.message)
        })?;
    let (status, body) = crate::stripe::api::unwrap_fetch(&raw).map_err(|error| {
        AppError::new(
            424,
            "profile_unreachable",
            "platform profile response is invalid",
        )
        .with_internal(error)
    })?;
    if status != 200 || body.len() > 131072 {
        return Err(invalid());
    }
    let profile_doc: Value = serde_json::from_str(&body).map_err(|_| invalid())?;
    if profile_doc["ucp"]["version"] != super::VERSION {
        return Err(AppError::new(
            422,
            "version_unsupported",
            "platform UCP version is not supported",
        ));
    }
    let compatible = profile_doc["ucp"]["capabilities"]["dev.ucp.shopping.checkout"]
        .as_array()
        .is_some_and(|versions| versions.iter().any(|v| v["version"] == super::VERSION));
    if !compatible {
        return Err(AppError::new(
            422,
            "capabilities_incompatible",
            "platform does not support this checkout version",
        ));
    }
    let key = profile_doc["signing_keys"]
        .as_array()
        .and_then(|keys| keys.iter().find(|key| key["kid"] == kid))
        .ok_or_else(invalid)?;
    if key["kty"] != "EC"
        || key["crv"] != "P-256"
        || key.get("alg").is_some_and(|v| v != "ES256")
        || key.get("use").is_some_and(|v| v != "sig")
    {
        return Err(invalid());
    }
    let x = coordinate(key, "x")?;
    let y = coordinate(key, "y")?;
    let mut point = vec![4];
    point.extend(x);
    point.extend(y);
    let verifier = VerifyingKey::from_sec1_bytes(&point).map_err(|_| invalid())?;
    verifier
        .verify(base.join("\n").as_bytes(), &signature)
        .map_err(|_| invalid())?;
    Ok(VerifiedPlatform {
        profile: profile.to_string(),
    })
}
fn coordinate(key: &Value, field: &str) -> AppResult<Vec<u8>> {
    let bytes = URL_SAFE_NO_PAD
        .decode(key[field].as_str().ok_or_else(invalid)?)
        .map_err(|_| invalid())?;
    if bytes.len() != 32 {
        return Err(invalid());
    }
    Ok(bytes)
}
fn header<'a>(req: &'a RouteRequest, name: &str) -> AppResult<&'a str> {
    let mut values = req
        .headers
        .iter()
        .filter(|(k, _)| k.eq_ignore_ascii_case(name));
    let value = values.next().map(|(_, v)| v.as_str()).ok_or_else(invalid)?;
    if values.next().is_some() || value.len() > 8192 || value.contains(['\r', '\n']) {
        return Err(invalid());
    }
    Ok(value)
}
fn invalid() -> AppError {
    AppError::unauthorized("valid UCP platform signature required")
}
