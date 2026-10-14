//! Google Play crypto: RS256 service-account JWT signing.
//!
//! Verifying a Google Play purchase means calling Google's Android Publisher API, which
//! is authenticated with an OAuth2 access token. To mint that token the server signs a
//! service-account assertion JWT (RS256) with the operator's *own* service-account
//! private key (from the admin "App Stores" panel), exchanges it at
//! `oauth2.googleapis.com/token`, then calls `androidpublisher`. This module is the
//! signing core. RSASSA-PKCS1-v1_5 produces a deterministic signature; AWS-LC consumes
//! WASI randomness internally to blind the private-key operation against timing attacks.

use aws_lc_rs::rand::SystemRandom;
use aws_lc_rs::signature::{RsaKeyPair, RSA_PKCS1_SHA256};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use pem_rfc7468::decode_vec;
use serde_json::{json, Value};

use crate::seams::HostSeams;

const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const SCOPE: &str = "https://www.googleapis.com/auth/androidpublisher";
/// Android Publisher API base — the verify route + the RTDN route both build URLs on it.
pub const API_BASE: &str = "https://androidpublisher.googleapis.com/androidpublisher/v3";
// `urn:ietf:params:oauth:grant-type:jwt-bearer`, percent-encoded for the form body.
const GRANT_TYPE: &str = "urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer";

/// Encode one untrusted value as an RFC 3986 path segment so purchase tokens,
/// product ids, and order ids cannot change the fixed Google API endpoint.
pub fn path_segment(value: &str) -> String {
    if matches!(value, "." | "..") {
        return value.replace('.', "%2E");
    }
    let mut out = String::with_capacity(value.len());
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
            out.push(byte as char);
        } else {
            out.push_str(&format!("%{byte:02X}"));
        }
    }
    out
}

pub fn valid_package_name(value: &str) -> bool {
    value.len() <= 255
        && value.contains('.')
        && value.split('.').all(|part| {
            !part.is_empty()
                && part.len() <= 63
                && part
                    .bytes()
                    .next()
                    .is_some_and(|byte| byte.is_ascii_alphabetic())
                && part
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
        })
}

/// Mint an OAuth2 access token for the Android Publisher API from the operator's
/// service-account credentials (sign the RS256 assertion, exchange it at Google's token
/// endpoint over `http_fetch`). Shared by the verify route and the RTDN route.
pub fn access_token<S: HostSeams>(
    seams: &S,
    service_account_email: &str,
    private_key_pem: &str,
    now: i64,
) -> Result<String, String> {
    let claims = json!({
        "iss": service_account_email,
        "scope": SCOPE,
        "aud": TOKEN_URL,
        "iat": now,
        "exp": now + 3600,
    });
    let assertion = sign_rs256_jwt(private_key_pem, &claims)?;
    let fetch = json!({
        "method": "POST",
        "url": TOKEN_URL,
        "headers": [["content-type", "application/x-www-form-urlencoded"]],
        "body": format!("grant_type={GRANT_TYPE}&assertion={assertion}"),
    });
    let (status, resp) = unwrap_fetch(
        &seams
            .http_fetch(&fetch.to_string())
            .map_err(|_| "Google OAuth egress failed".to_string())?,
    )?;
    if !(200..300).contains(&status) {
        return Err(format!("Google OAuth returned HTTP {status}"));
    }
    serde_json::from_str::<Value>(&resp)
        .ok()
        .and_then(|v| {
            v.get("access_token")
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .ok_or_else(|| "Google OAuth response missing access_token".to_string())
}

/// GET an Android Publisher API resource with the bearer token, returning the JSON body.
pub fn api_get<S: HostSeams>(seams: &S, token: &str, url: &str) -> Result<Value, String> {
    let fetch = json!({
        "method": "GET",
        "url": url,
        "headers": [["authorization", format!("Bearer {token}")]],
    });
    let (status, resp) = unwrap_fetch(
        &seams
            .http_fetch(&fetch.to_string())
            .map_err(|_| "Google API egress failed".to_string())?,
    )?;
    if !(200..300).contains(&status) {
        return Err(format!("Google API returned HTTP {status}"));
    }
    serde_json::from_str(&resp).map_err(|e| format!("invalid Google response: {e}"))
}

fn unwrap_fetch(raw: &str) -> Result<(u16, String), String> {
    let env: Value =
        serde_json::from_str(raw).map_err(|_| "malformed egress response".to_string())?;
    let status = env.get("status").and_then(Value::as_u64).unwrap_or(0) as u16;
    let body = env
        .get("body")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    Ok((status, body))
}

/// Sign a Google service-account assertion JWT (RS256) over the given claims.
///
/// `private_key_pem` is the PKCS#8 PEM `private_key` field of the operator's Google
/// service-account JSON. The returned compact JWS is exchanged for an OAuth2 access
/// token (`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`).
pub fn sign_rs256_jwt(private_key_pem: &str, claims: &serde_json::Value) -> Result<String, String> {
    let (label, private_key_der) =
        decode_vec(private_key_pem.as_bytes()).map_err(|e| format!("bad rsa key PEM: {e}"))?;
    if label != "PRIVATE KEY" {
        return Err(format!("bad rsa key PEM label: {label}"));
    }
    let signing_key =
        RsaKeyPair::from_pkcs8(&private_key_der).map_err(|e| format!("bad rsa key: {e:?}"))?;

    let header = serde_json::json!({ "alg": "RS256", "typ": "JWT" });
    let header_b64 =
        URL_SAFE_NO_PAD.encode(serde_json::to_vec(&header).map_err(|e| e.to_string())?);
    let payload_b64 =
        URL_SAFE_NO_PAD.encode(serde_json::to_vec(claims).map_err(|e| e.to_string())?);

    let signing_input = format!("{header_b64}.{payload_b64}");
    let mut signature = vec![0; signing_key.public_modulus_len()];
    signing_key
        .sign(
            &RSA_PKCS1_SHA256,
            &SystemRandom::new(),
            signing_input.as_bytes(),
            &mut signature,
        )
        .map_err(|_| "rsa signing failed".to_string())?;
    let sig_b64 = URL_SAFE_NO_PAD.encode(signature);
    Ok(format!("{signing_input}.{sig_b64}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn provider_path_values_are_encoded_and_package_names_are_strict() {
        assert_eq!(path_segment("token/../?x=1"), "token%2F..%2F%3Fx%3D1");
        assert_eq!(path_segment(".."), "%2E%2E");
        assert!(valid_package_name("com.example.app"));
        for invalid in ["localhost", "com.example/app", "1com.example", "com..app"] {
            assert!(!valid_package_name(invalid), "accepted {invalid}");
        }
    }

    // A throwaway PKCS#8 RSA-2048 key — for the KAT only, never a real credential.
    const TEST_KEY: &str = r"-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCbdHB89mPUqtKw
ug6TNND3PjvxryplL8prirctNwHQQQKRA9rQSNbak9AueJx2I8i9LcptP0ZIH5ey
pMUJYpIB7YHVT4qvvsmUGDXD/aPCSWoltqspdkUbuEzcHjlxWqHQnB1+eV/YA0Sm
Z/z0YefisfxFzRVPb+JImfMrb1oMvQbbYylsx9y2xJMSB73QLyQHwtk2PvZThPPO
kELW+gHD++yJG/fdqMSc0ql0W6Wk5ZA3qjO4g7Yy2ljf6svp8HWX9FS8yhfOAapN
GjW53KYyq8JK1OcE2RW9CtDblvXGI2z03kO8Vj33OD/v55IQbyYYWo0VJWLtM3ax
rMd/NRJ3AgMBAAECggEADn8fxE93xMu/RRK8rDaXLA9GKMYUdoYr4rZ3WYSRKzn8
wsgwvg6k1pJFLig6MvwoSpf8Eg79/1jO3S5nX3YtNnfPDTTTMotgoepWDTZYcJRH
DUhJEt9AF5Mqu7Yn1i3E/D6qs3IfIXZAjyIQYTvGE4pUg6/ZxmQhHnMYzZqfM6PB
y8qS5O/6KfE0kilEq6VpzIZ4by/elu3y7oSgjyaJxVkL4Ar9u/pUw04/pptknpaF
nf9y9EWneEtL84wW+U6WiL6w3f0DgGrI/HgwsyyCrR2xggPZRY2K4gNUnQq9y2f5
nDQp+oYQI6HvZBAITLFG6iEK16GZ8xMMhNx5X6scBQKBgQDKBl2DmBjL4AMuuKaH
1Tk2ftz7yeGstueiPNGKxP4pXDD6rlMCFwqABPzGgnhAFxtFmtaqkUj00KO1tF4K
ee0eybeyKRZN16BNEEbIoiBYIWNGiLYstaNY60/nPSuMYD5B5gCbUkTvGBd9czob
zcu8BG8Z/b3GdczST38wGp9R/QKBgQDE/OJZYmBPx4N7CYbKqo17WZhExqRMJ4kH
kzrEj/AJQH0AmHXnroeeBM6poHoEb9AwaSIpeKKAoGgDajaBwDSbN1M1SHR/Bvod
HfJlOTIJw3B15/jZSjZI6YOClD8vQD9PnnfcnsLi8DcbKh57ce1M/YhCaPan+nLJ
KkdNCQn2gwKBgQCW6YJZlviO81vtPspHlaQTbVkuTXRjTI5jxwLQoq8pvlBoMmiX
mxag4xjgQP4LAjfBGxVYfQb+ugxQ49eMA+B5qz2pvL+IjpaUeqAlp9Z5fxdlzSIo
69aFyeH6Xtt1FT/sgh/Z5u7PnDOP5s91jZmvbbCAvedRpRXH1NKx4HE7EQKBgBFd
PVKlwlml+6gP2erph9k0t6BwZjE0Vvbs+oQzL/SQ07QGvHX0w42hXNpFBBx6Ar8R
tWo0cRanjSOn7DAZ0klQYixTO7mq0sdYSXK0zP1hVft+vEfjK8/Xjbkn+j3fCvWo
wWYYNJOumxzw5Ij7LPDZdHZuLDf4cr/a0zguMMujAoGAAXAv7CGBG3/sIo2psH1S
cUyl0Zu4LyxkPIoSvnyf6HCJT/jXJsx6tQzHKDE6KzCnyp/qFHwhE1OPrd6A/N4L
Jgujp7cHdn6TVGJDzIyB6NaCDA/ZJI96lgyAfNJvMsSpwhnXT+hMlWjrtYPXIWDz
O8PbHyVA5F4THDN7t9NdPy0=
-----END PRIVATE KEY-----
";

    /// KAT: sign a service-account assertion and verify the RS256 signature with the
    /// matching public key, then assert the JWT claims.
    #[test]
    fn sign_rs256_jwt_produces_a_verifiable_assertion() {
        use aws_lc_rs::signature::{KeyPair, UnparsedPublicKey, RSA_PKCS1_2048_8192_SHA256};

        let claims = serde_json::json!({
            "iss": "svc@project.iam.gserviceaccount.com",
            "scope": "https://www.googleapis.com/auth/androidpublisher",
            "aud": "https://oauth2.googleapis.com/token",
            "iat": 1_700_000_000,
            "exp": 1_700_003_600,
        });
        let jwt = sign_rs256_jwt(TEST_KEY, &claims).expect("sign must succeed");
        let parts: Vec<&str> = jwt.split('.').collect();
        assert_eq!(parts.len(), 3, "compact JWS has 3 parts");

        // Verify the signature with the public half of the key.
        let (_, private_key_der) = decode_vec(TEST_KEY.as_bytes()).unwrap();
        let key = RsaKeyPair::from_pkcs8(&private_key_der).unwrap();
        let verifier =
            UnparsedPublicKey::new(&RSA_PKCS1_2048_8192_SHA256, key.public_key().as_ref());
        let signing_input = format!("{}.{}", parts[0], parts[1]);
        let sig_bytes = URL_SAFE_NO_PAD.decode(parts[2]).unwrap();
        verifier
            .verify(signing_input.as_bytes(), &sig_bytes)
            .expect("signature must verify");

        let header: serde_json::Value =
            serde_json::from_slice(&URL_SAFE_NO_PAD.decode(parts[0]).unwrap()).unwrap();
        assert_eq!(header["alg"], "RS256");
        let payload: serde_json::Value =
            serde_json::from_slice(&URL_SAFE_NO_PAD.decode(parts[1]).unwrap()).unwrap();
        assert_eq!(payload["aud"], "https://oauth2.googleapis.com/token");
        assert_eq!(payload["iss"], "svc@project.iam.gserviceaccount.com");
    }

    #[test]
    fn sign_rs256_jwt_rejects_a_bad_key() {
        assert!(sign_rs256_jwt("not-a-pem", &serde_json::json!({})).is_err());
    }
}
