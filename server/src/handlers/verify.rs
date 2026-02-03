use std::sync::Arc;

use axum::{
    extract::State,
    http::{header::HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use base64::{
    engine::general_purpose::{STANDARD as BASE64, STANDARD_NO_PAD as BASE64_NO_PAD},
    Engine,
};
use serde::{Deserialize, Serialize};

use crate::handlers::paywall::AppState;
use crate::middleware::tenant::TenantContext;
use crate::models::PaymentProof;
use crate::storage::Store;

// ─────────────────────────────────────────────────────────────────────────────
// Request/Response types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct X402PaymentHeader {
    pub x402_version: i32,
    pub scheme: String,
    pub network: String,
    pub payload: X402Payload,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct X402Payload {
    pub signature: Option<String>,
    pub transaction: Option<String>,
    pub resource: String,
    #[serde(default)]
    pub resource_type: String,
    pub fee_payer: Option<String>,
    pub memo: Option<String>,
    pub recipient_token_account: Option<String>,
    #[serde(default)]
    pub metadata: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VerifyResponse {
    pub success: bool,
    /// Transaction hash/signature per spec 16-formats.md
    #[serde(rename = "txHash")]
    pub tx_hash: Option<String>,
    pub network_id: String,
    pub error: Option<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// POST /paywall/v1/verify - Verify x402 payment proof
pub async fn verify<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    headers: HeaderMap,
) -> impl IntoResponse {
    let configured_network = state.paywall_service.config.x402.network.clone();

    // Extract X-PAYMENT header (case-insensitive per HTTP spec RFC 7230)
    let payment_header = headers
        .iter()
        .find(|(name, _)| name.as_str().eq_ignore_ascii_case("x-payment"))
        .and_then(|(_, value)| value.to_str().ok());

    let payment_header = match payment_header {
        Some(h) => h,
        None => {
            return build_verify_response(
                false,
                None,
                &configured_network,
                Some("missing X-PAYMENT header"),
            );
        }
    };

    let payment: X402PaymentHeader = match decode_x_payment_header(payment_header) {
        Ok(p) => p,
        Err(message) => {
            return build_verify_response(false, None, &configured_network, Some(&message));
        }
    };

    // SEC-007: Validate metadata size to prevent DoS via large payloads
    if let Err(msg) = super::validate_metadata_size(&payment.payload.metadata) {
        return build_verify_response(false, None, &configured_network, Some(&msg));
    }

    // BUG-005: Fail fast on missing required fields.
    let signature = match payment
        .payload
        .signature
        .as_ref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
    {
        Some(s) => s.to_string(),
        None => {
            return build_verify_response(
                false,
                None,
                &configured_network,
                Some("missing signature"),
            );
        }
    };
    let transaction = match payment
        .payload
        .transaction
        .as_ref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
    {
        Some(s) => s.to_string(),
        None => {
            return build_verify_response(
                false,
                None,
                &configured_network,
                Some("missing transaction"),
            );
        }
    };

    // Build PaymentProof from header
    let proof = PaymentProof {
        x402_version: payment.x402_version,
        scheme: payment.scheme,
        network: payment.network.clone(),
        signature,
        payer: payment.payload.fee_payer.clone().unwrap_or_default(),
        transaction,
        resource_id: payment.payload.resource.clone(),
        resource_type: if payment.payload.resource_type.is_empty() {
            "regular".to_string()
        } else {
            payment.payload.resource_type.clone()
        },
        fee_payer: payment.payload.fee_payer,
        memo: payment.payload.memo,
        recipient_token_account: payment.payload.recipient_token_account,
        metadata: convert_metadata(&payment.payload.metadata),
    };

    // Verify payment via paywall service
    let result = state
        .paywall_service
        .verify_payment(&tenant.tenant_id, proof)
        .await;

    match result {
        Ok(verification) => build_verify_response(
            true,
            verification.tx_hash.as_deref(),
            &payment.network,
            None,
        ),
        Err(e) => build_verify_response(false, None, &payment.network, Some(&e.safe_message())),
    }
}

/// Convert JSON metadata to HashMap<String, String>
/// For non-string values, we serialize them to JSON strings to preserve type information
pub(crate) fn convert_metadata(
    value: &serde_json::Value,
) -> std::collections::HashMap<String, String> {
    let mut map = std::collections::HashMap::new();
    if let Some(obj) = value.as_object() {
        for (k, v) in obj {
            // For strings, use the value directly; for other types, serialize to JSON
            let string_val = match v {
                serde_json::Value::String(s) => s.clone(),
                serde_json::Value::Null => String::new(),
                other => serde_json::to_string(other).unwrap_or_default(),
            };
            map.insert(k.clone(), string_val);
        }
    }
    map
}

pub(crate) fn decode_x_payment_header(raw_header: &str) -> Result<X402PaymentHeader, String> {
    let raw = raw_header.trim();
    if raw.is_empty() {
        return Err("missing X-PAYMENT header".to_string());
    }

    let json_str = if raw.starts_with('{') {
        raw.to_string()
    } else {
        let decoded = BASE64
            .decode(raw)
            .or_else(|_| BASE64_NO_PAD.decode(raw))
            .map_err(|_| "invalid base64 in X-PAYMENT header".to_string())?;
        String::from_utf8(decoded).map_err(|_| "invalid UTF-8 in X-PAYMENT header".to_string())?
    };

    serde_json::from_str(&json_str).map_err(|e| format!("invalid JSON in X-PAYMENT: {}", e))
}

fn build_verify_response(
    success: bool,
    signature: Option<&str>,
    network_id: &str,
    error: Option<&str>,
) -> (StatusCode, [(String, String); 1], Json<serde_json::Value>) {
    let response = VerifyResponse {
        success,
        tx_hash: signature.map(|s| s.to_string()),
        network_id: network_id.to_string(),
        error: error.map(|s| s.to_string()),
    };

    // These serializations should never fail for our well-defined VerifyResponse struct
    // Using unwrap_or_default to provide graceful degradation
    let body = serde_json::to_value(&response).unwrap_or_else(|e| {
        tracing::error!(error = %e, "Failed to serialize verify response body");
        serde_json::json!({"error": "serialization_failed"})
    });
    let response_header =
        BASE64.encode(serde_json::to_string(&response).unwrap_or_else(|_| "{}".to_string()));

    // Per x402 spec: 200 OK for success, 402 Payment Required for failed verification
    let status = if success {
        StatusCode::OK
    } else {
        StatusCode::PAYMENT_REQUIRED
    };

    (
        status,
        [("X-PAYMENT-RESPONSE".to_string(), response_header)],
        Json(body),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    use axum::response::IntoResponse;
    use http_body_util::BodyExt;
    use serde_json::json;

    use crate::config::Config;
    use crate::repositories::{InMemoryCouponRepository, InMemoryProductRepository};
    use crate::storage::InMemoryStore;
    use crate::webhooks::NoopNotifier;
    use crate::NoopVerifier;
    use crate::PaywallService;

    fn build_state(network: &str) -> Arc<AppState<InMemoryStore>> {
        let mut config = Config::default();
        config.x402.network = network.to_string();

        let store = Arc::new(InMemoryStore::new());
        let product_repo = Arc::new(InMemoryProductRepository::new(Vec::new()));
        let coupon_repo = Arc::new(InMemoryCouponRepository::new(Vec::new()));
        let service = PaywallService::new(
            config,
            store.clone(),
            Arc::new(NoopVerifier),
            Arc::new(NoopNotifier),
            product_repo.clone(),
            coupon_repo,
        );

        Arc::new(AppState {
            store,
            paywall_service: Arc::new(service),
            product_repo,
            stripe_client: None,
            stripe_webhook_processor: None,
            admin_public_keys: Vec::new(),
            blockhash_cache: None,
        })
    }

    fn sample_payment_json() -> serde_json::Value {
        json!({
            "x402Version": 0,
            "scheme": "solana",
            "network": "devnet",
            "payload": {
                "signature": "sig",
                "transaction": "tx",
                "resource": "resource-1",
                "resourceType": "",
                "metadata": { "k": "v" }
            }
        })
    }

    async fn verify_with_payment_header(
        state: Arc<AppState<InMemoryStore>>,
        payment_value: serde_json::Value,
    ) -> serde_json::Value {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-payment",
            payment_value.to_string().parse().expect("header"),
        );

        let response = verify(State(state), TenantContext::default(), headers)
            .await
            .into_response();
        let body = response.into_body().collect().await.unwrap().to_bytes();
        serde_json::from_slice(&body).unwrap()
    }

    #[test]
    fn test_decode_x_payment_header_raw_json() {
        let json_str = sample_payment_json().to_string();
        let decoded = decode_x_payment_header(&json_str).unwrap();
        assert_eq!(decoded.network, "devnet");
        assert_eq!(decoded.payload.resource, "resource-1");
    }

    #[test]
    fn test_decode_x_payment_header_base64_no_pad() {
        let json_str = sample_payment_json().to_string();
        let encoded = BASE64_NO_PAD.encode(json_str.as_bytes());
        let decoded = decode_x_payment_header(&encoded).unwrap();
        assert_eq!(decoded.scheme, "solana");
        assert_eq!(decoded.payload.resource, "resource-1");
    }

    #[test]
    fn test_convert_metadata_serializes_non_strings() {
        let value = json!({
            "num": 1,
            "obj": { "a": 2 },
            "str": "ok"
        });
        let converted = convert_metadata(&value);
        assert_eq!(converted.get("num"), Some(&"1".to_string()));
        assert_eq!(converted.get("obj"), Some(&"{\"a\":2}".to_string()));
        assert_eq!(converted.get("str"), Some(&"ok".to_string()));
    }

    #[tokio::test]
    async fn test_verify_missing_header_uses_configured_network() {
        let state = build_state("testnet");
        let response = verify(State(state), TenantContext::default(), HeaderMap::new())
            .await
            .into_response();
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["networkId"], "testnet");
    }

    #[tokio::test]
    async fn test_verify_rejects_missing_signature() {
        let state = build_state("devnet");
        let mut payment = sample_payment_json();
        payment["payload"]["signature"] = serde_json::Value::Null;

        let json = verify_with_payment_header(state, payment).await;
        assert_eq!(json["success"], false);
        assert_eq!(json["error"], "missing signature");
    }

    #[tokio::test]
    async fn test_verify_rejects_missing_transaction() {
        let state = build_state("devnet");
        let mut payment = sample_payment_json();
        payment["payload"]["transaction"] = serde_json::Value::Null;

        let json = verify_with_payment_header(state, payment).await;
        assert_eq!(json["success"], false);
        assert_eq!(json["error"], "missing transaction");
    }
}
