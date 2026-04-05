use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use async_trait::async_trait;
use base64::{
    engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD},
    Engine,
};
use chrono::{DateTime, TimeZone, Utc};
use jsonwebtoken::{
    decode, decode_header, Algorithm, DecodingKey, EncodingKey, Header, Validation,
};
use openssl::{
    bn::BigNum,
    ecdsa::EcdsaSig,
    hash::MessageDigest,
    sign::Verifier as OpenSslVerifier,
    stack::Stack,
    x509::{store::X509StoreBuilder, X509StoreContext, X509},
};
use parking_lot::RwLock;
use serde::{de, Deserialize, Deserializer, Serialize};
use sha2::{Digest, Sha256};
use tokio::time::timeout;
use uuid::Uuid;

use crate::config::Config;
use crate::constants::PAYMENT_CALLBACK_TIMEOUT;
use crate::errors::ErrorCode;
use crate::models::{
    must_get_asset, BillingPeriod, Money, PaymentEvent, PaymentMethod, Product,
    StoreManagedProductKind, Subscription, SubscriptionStatus,
};
use crate::observability::record_payment;
use crate::repositories::{ProductRepository, ProductRepositoryError};
use crate::services::{ServiceError, ServiceResult};
use crate::storage::Store;
use crate::webhooks::Notifier;

const APPLE_PRODUCTION_BASE_URL: &str = "https://api.storekit.itunes.apple.com";
const APPLE_SANDBOX_BASE_URL: &str = "https://api.storekit-sandbox.itunes.apple.com";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const GOOGLE_ANDROID_PUBLISHER_SCOPE: &str = "https://www.googleapis.com/auth/androidpublisher";
const GOOGLE_API_BASE_URL: &str = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const GOOGLE_OIDC_CERTS_URL: &str = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_PUSH_JWKS_CACHE_TTL: Duration = Duration::from_secs(5 * 60);
const NATIVE_STORE_TOTAL_QUANTITY_KEY: &str = "native_store_total_quantity";
const NATIVE_STORE_REFUNDABLE_QUANTITY_KEY: &str = "native_store_refundable_quantity";
const NATIVE_STORE_UNIT_AMOUNT_ATOMIC_KEY: &str = "native_store_unit_amount_atomic";
const NATIVE_STORE_UNIT_AMOUNT_ASSET_KEY: &str = "native_store_unit_amount_asset";
const NATIVE_STORE_LAST_REFUND_AT_KEY: &str = "native_store_last_refunded_at";
const NATIVE_STORE_LAST_REFUND_QUANTITY_KEY: &str = "native_store_last_refund_quantity";
const NATIVE_STORE_LAST_REFUND_SOURCE_KEY: &str = "native_store_last_refund_source";
const NATIVE_STORE_LAST_REFUND_TYPE_KEY: &str = "native_store_last_refund_type";
const APPLE_ROOT_CA_G3_PEM: &str = r#"-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf
TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517
IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr
MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA
MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4
at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM
6BgD56KyKA==
-----END CERTIFICATE-----"#;

#[derive(Debug, Clone)]
pub struct NativeStoreVerificationRequest {
    pub tenant_id: String,
    pub user_id: Option<String>,
    pub product_id: String,
    pub method: PaymentMethod,
    pub store_product_id: String,
    pub transaction_id: Option<String>,
    pub original_transaction_id: Option<String>,
    pub purchase_token: Option<String>,
    pub package_name: Option<String>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeStoreVerificationResult {
    pub success: bool,
    pub transaction_id: String,
    pub method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_period_end: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeStoreLifecycleNotificationResult {
    pub success: bool,
    pub duplicate: bool,
    pub platform: String,
    pub event_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub product_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription_id: Option<String>,
}

#[derive(Debug, Clone)]
struct StoreVerificationMetadata {
    payment_signature: String,
    transaction_id: String,
    product: Product,
    kind: StoreManagedProductKind,
    method: PaymentMethod,
    store_product_id: String,
    event_method: &'static str,
}

#[derive(Debug, Clone)]
pub struct VerifiedApplePurchase {
    pub transaction_id: String,
    pub original_transaction_id: String,
    pub product_id: String,
    pub bundle_id: Option<String>,
    pub purchase_date: DateTime<Utc>,
    pub expires_date: Option<DateTime<Utc>>,
    pub environment: Option<String>,
    pub revoked: bool,
}

#[derive(Debug, Clone)]
pub struct VerifiedGoogleOneTimePurchase {
    pub purchase_token: String,
    pub product_id: String,
    pub package_name: String,
    pub purchase_date: Option<DateTime<Utc>>,
    pub acknowledged: bool,
    pub purchase_state: GoogleOneTimePurchaseState,
    pub quantity: i64,
    pub refundable_quantity: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GoogleOneTimePurchaseState {
    Purchased,
    Cancelled,
    Pending,
}

#[derive(Debug, Clone)]
pub struct VerifiedGoogleSubscription {
    pub purchase_token: String,
    pub product_id: String,
    pub package_name: String,
    pub start_date: Option<DateTime<Utc>>,
    pub expires_date: DateTime<Utc>,
    pub state: GoogleSubscriptionState,
    pub base_plan_id: Option<String>,
    pub offer_id: Option<String>,
    pub acknowledged: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GoogleSubscriptionState {
    Active,
    InGracePeriod,
    OnHold,
    Paused,
    Cancelled,
    Expired,
}

#[async_trait]
pub trait AppleStoreVerifier: Send + Sync {
    async fn verify_purchase(
        &self,
        config: &Config,
        transaction_id: &str,
    ) -> ServiceResult<VerifiedApplePurchase>;
}

#[async_trait]
pub trait GooglePlayVerifier: Send + Sync {
    async fn verify_one_time_purchase(
        &self,
        config: &Config,
        package_name: &str,
        product_id: &str,
        purchase_token: &str,
    ) -> ServiceResult<VerifiedGoogleOneTimePurchase>;

    async fn verify_subscription(
        &self,
        config: &Config,
        package_name: &str,
        product_id: &str,
        purchase_token: &str,
    ) -> ServiceResult<VerifiedGoogleSubscription>;

    async fn acknowledge_one_time_purchase(
        &self,
        config: &Config,
        package_name: &str,
        product_id: &str,
        purchase_token: &str,
    ) -> ServiceResult<()>;

    async fn acknowledge_subscription(
        &self,
        config: &Config,
        package_name: &str,
        product_id: &str,
        purchase_token: &str,
    ) -> ServiceResult<()>;
}

#[async_trait]
pub trait AppleNotificationVerifier: Send + Sync {
    async fn verify_signed_payload(&self, signed_payload: &str) -> ServiceResult<()>;
}

#[async_trait]
pub trait GoogleNotificationAuthVerifier: Send + Sync {
    async fn verify_authorization(
        &self,
        config: &Config,
        authorization_header: &str,
    ) -> ServiceResult<()>;
}

pub struct HttpAppleStoreVerifier {
    client: reqwest::Client,
}

impl HttpAppleStoreVerifier {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(15))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
        }
    }
}

impl Default for HttpAppleStoreVerifier {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl AppleStoreVerifier for HttpAppleStoreVerifier {
    async fn verify_purchase(
        &self,
        config: &Config,
        transaction_id: &str,
    ) -> ServiceResult<VerifiedApplePurchase> {
        if !config.native_store.enabled || !config.native_store.apple.enabled {
            return Err(ServiceError::Coded {
                code: ErrorCode::PaymentMethodDisabled,
                message: "Apple native store verification is disabled".into(),
            });
        }

        if config.native_store.apple.issuer_id.is_empty()
            || config.native_store.apple.key_id.is_empty()
            || config.native_store.apple.private_key.is_empty()
        {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Apple native store credentials are not configured".into(),
            });
        }

        let auth_token = build_apple_auth_token(config)?;

        let mut last_error = None;
        for base_url in apple_base_urls(config) {
            let url = format!("{}/inApps/v1/transactions/{}", base_url, transaction_id);
            let response = self
                .client
                .get(&url)
                .bearer_auth(&auth_token)
                .send()
                .await
                .map_err(|e| {
                    ServiceError::Internal(format!("apple verification request failed: {e}"))
                })?;

            if !response.status().is_success() {
                last_error = Some(format!("Apple verification returned {}", response.status()));
                continue;
            }

            let payload: AppleTransactionLookupResponse = response.json().await.map_err(|e| {
                ServiceError::Internal(format!("invalid Apple verification response: {e}"))
            })?;

            let signed = payload.signed_transaction_info.ok_or_else(|| {
                ServiceError::Internal(
                    "Apple verification response missing signedTransactionInfo".into(),
                )
            })?;
            let signed_payload: AppleSignedTransactionPayload =
                decode_jws_payload(&signed, "Apple signedTransactionInfo")?;

            return Ok(VerifiedApplePurchase {
                transaction_id: signed_payload
                    .transaction_id
                    .unwrap_or_else(|| transaction_id.to_string()),
                original_transaction_id: signed_payload
                    .original_transaction_id
                    .unwrap_or_else(|| transaction_id.to_string()),
                product_id: signed_payload.product_id.unwrap_or_default(),
                bundle_id: signed_payload.bundle_id,
                purchase_date: millis_to_utc(signed_payload.purchase_date).unwrap_or_else(Utc::now),
                expires_date: millis_to_utc_optional(signed_payload.expires_date),
                environment: signed_payload.environment,
                revoked: signed_payload.revocation_date.is_some(),
            });
        }

        Err(ServiceError::Coded {
            code: ErrorCode::VerificationFailed,
            message: last_error.unwrap_or_else(|| "Apple verification failed".into()),
        })
    }
}

pub struct HttpGooglePlayVerifier {
    client: reqwest::Client,
}

impl HttpGooglePlayVerifier {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(15))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
        }
    }

    async fn access_token(&self, config: &Config) -> ServiceResult<String> {
        if !config.native_store.enabled || !config.native_store.google.enabled {
            return Err(ServiceError::Coded {
                code: ErrorCode::PaymentMethodDisabled,
                message: "Google Play verification is disabled".into(),
            });
        }

        if config.native_store.google.service_account_email.is_empty()
            || config.native_store.google.private_key.is_empty()
        {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Google Play service account credentials are not configured".into(),
            });
        }

        let now = Utc::now().timestamp();
        let claims = GoogleServiceAccountClaims {
            iss: config.native_store.google.service_account_email.clone(),
            scope: GOOGLE_ANDROID_PUBLISHER_SCOPE.to_string(),
            aud: GOOGLE_TOKEN_URL.to_string(),
            exp: now + 3600,
            iat: now,
        };

        let assertion = jsonwebtoken::encode(
            &Header::new(Algorithm::RS256),
            &claims,
            &EncodingKey::from_rsa_pem(config.native_store.google.private_key.as_bytes()).map_err(
                |e| {
                    ServiceError::Internal(format!(
                        "invalid Google service account private key: {e}"
                    ))
                },
            )?,
        )
        .map_err(|e| {
            ServiceError::Internal(format!("failed to sign Google service account JWT: {e}"))
        })?;

        let response = self
            .client
            .post(GOOGLE_TOKEN_URL)
            .form(&[
                ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
                ("assertion", assertion.as_str()),
            ])
            .send()
            .await
            .map_err(|e| ServiceError::Internal(format!("Google OAuth request failed: {e}")))?;

        if !response.status().is_success() {
            return Err(ServiceError::Coded {
                code: ErrorCode::VerificationFailed,
                message: format!("Google OAuth returned {}", response.status()),
            });
        }

        let payload: GoogleOAuthTokenResponse = response
            .json()
            .await
            .map_err(|e| ServiceError::Internal(format!("invalid Google OAuth response: {e}")))?;

        Ok(payload.access_token)
    }

    async fn acknowledge(
        &self,
        config: &Config,
        url: String,
        context: &'static str,
    ) -> ServiceResult<()> {
        let access_token = self.access_token(config).await?;
        let response = self
            .client
            .post(url)
            .bearer_auth(access_token)
            .json(&serde_json::json!({}))
            .send()
            .await
            .map_err(|e| ServiceError::Internal(format!("{context} request failed: {e}")))?;

        if response.status().is_success() {
            return Ok(());
        }

        Err(ServiceError::Coded {
            code: ErrorCode::VerificationFailed,
            message: format!("{context} returned {}", response.status()),
        })
    }
}

impl Default for HttpGooglePlayVerifier {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl GooglePlayVerifier for HttpGooglePlayVerifier {
    async fn verify_one_time_purchase(
        &self,
        config: &Config,
        package_name: &str,
        product_id: &str,
        purchase_token: &str,
    ) -> ServiceResult<VerifiedGoogleOneTimePurchase> {
        let access_token = self.access_token(config).await?;
        let url = format!(
            "{}/applications/{}/purchases/products/{}/tokens/{}",
            GOOGLE_API_BASE_URL, package_name, product_id, purchase_token
        );

        let response = self
            .client
            .get(url)
            .bearer_auth(access_token)
            .send()
            .await
            .map_err(|e| {
                ServiceError::Internal(format!("Google purchase verification failed: {e}"))
            })?;

        if !response.status().is_success() {
            return Err(ServiceError::Coded {
                code: ErrorCode::VerificationFailed,
                message: format!("Google product verification returned {}", response.status()),
            });
        }

        let payload: GoogleProductPurchaseResponse = response.json().await.map_err(|e| {
            ServiceError::Internal(format!("invalid Google product purchase response: {e}"))
        })?;

        let purchase_state = match payload.purchase_state.unwrap_or(1) {
            0 => GoogleOneTimePurchaseState::Purchased,
            2 => GoogleOneTimePurchaseState::Pending,
            _ => GoogleOneTimePurchaseState::Cancelled,
        };
        let quantity = payload.quantity.unwrap_or(1).max(1);
        let refundable_quantity = payload
            .refundable_quantity
            .unwrap_or(quantity)
            .clamp(0, quantity);

        Ok(VerifiedGoogleOneTimePurchase {
            purchase_token: purchase_token.to_string(),
            product_id: payload.product_id.unwrap_or_else(|| product_id.to_string()),
            package_name: package_name.to_string(),
            purchase_date: millis_string_to_utc(payload.purchase_time_millis.as_deref()),
            acknowledged: payload.acknowledgement_state.unwrap_or_default() == 1,
            purchase_state,
            quantity,
            refundable_quantity,
        })
    }

    async fn verify_subscription(
        &self,
        config: &Config,
        package_name: &str,
        product_id: &str,
        purchase_token: &str,
    ) -> ServiceResult<VerifiedGoogleSubscription> {
        let access_token = self.access_token(config).await?;
        let url = format!(
            "{}/applications/{}/purchases/subscriptionsv2/tokens/{}",
            GOOGLE_API_BASE_URL, package_name, purchase_token
        );

        let response = self
            .client
            .get(url)
            .bearer_auth(access_token)
            .send()
            .await
            .map_err(|e| {
                ServiceError::Internal(format!("Google subscription verification failed: {e}"))
            })?;

        if !response.status().is_success() {
            return Err(ServiceError::Coded {
                code: ErrorCode::VerificationFailed,
                message: format!(
                    "Google subscription verification returned {}",
                    response.status()
                ),
            });
        }

        let payload: GoogleSubscriptionV2Response = response.json().await.map_err(|e| {
            ServiceError::Internal(format!("invalid Google subscription response: {e}"))
        })?;

        let line_item = payload.line_items.first().cloned().ok_or_else(|| {
            ServiceError::Internal("Google subscription response missing lineItems".into())
        })?;

        let state = match payload.subscription_state.as_deref() {
            Some("SUBSCRIPTION_STATE_ACTIVE") => GoogleSubscriptionState::Active,
            Some("SUBSCRIPTION_STATE_IN_GRACE_PERIOD") => GoogleSubscriptionState::InGracePeriod,
            Some("SUBSCRIPTION_STATE_ON_HOLD") => GoogleSubscriptionState::OnHold,
            Some("SUBSCRIPTION_STATE_PAUSED") => GoogleSubscriptionState::Paused,
            Some("SUBSCRIPTION_STATE_CANCELED") => GoogleSubscriptionState::Cancelled,
            Some("SUBSCRIPTION_STATE_EXPIRED") => GoogleSubscriptionState::Expired,
            _ => GoogleSubscriptionState::Expired,
        };

        Ok(VerifiedGoogleSubscription {
            purchase_token: purchase_token.to_string(),
            product_id: line_item
                .product_id
                .unwrap_or_else(|| product_id.to_string()),
            package_name: package_name.to_string(),
            start_date: rfc3339_to_utc_optional(line_item.start_time.as_deref()),
            expires_date: rfc3339_to_utc(line_item.expiry_time.as_deref()).ok_or_else(|| {
                ServiceError::Internal("Google subscription response missing expiryTime".into())
            })?,
            state,
            base_plan_id: line_item
                .offer_details
                .as_ref()
                .and_then(|d| d.base_plan_id.clone()),
            offer_id: line_item
                .offer_details
                .as_ref()
                .and_then(|d| d.offer_id.clone()),
            acknowledged: payload
                .acknowledgement_state
                .as_deref()
                .map(|value| {
                    value.eq_ignore_ascii_case("ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED") || value == "1"
                })
                .unwrap_or(false),
        })
    }

    async fn acknowledge_one_time_purchase(
        &self,
        config: &Config,
        package_name: &str,
        product_id: &str,
        purchase_token: &str,
    ) -> ServiceResult<()> {
        self.acknowledge(
            config,
            format!(
                "{}/applications/{}/purchases/products/{}/tokens/{}:acknowledge",
                GOOGLE_API_BASE_URL, package_name, product_id, purchase_token
            ),
            "Google product acknowledgment",
        )
        .await
    }

    async fn acknowledge_subscription(
        &self,
        config: &Config,
        package_name: &str,
        product_id: &str,
        purchase_token: &str,
    ) -> ServiceResult<()> {
        self.acknowledge(
            config,
            format!(
                "{}/applications/{}/purchases/subscriptions/{}/tokens/{}:acknowledge",
                GOOGLE_API_BASE_URL, package_name, product_id, purchase_token
            ),
            "Google subscription acknowledgment",
        )
        .await
    }
}

pub struct CryptographicAppleNotificationVerifier;

impl Default for CryptographicAppleNotificationVerifier {
    fn default() -> Self {
        Self
    }
}

#[async_trait]
impl AppleNotificationVerifier for CryptographicAppleNotificationVerifier {
    async fn verify_signed_payload(&self, signed_payload: &str) -> ServiceResult<()> {
        verify_apple_signed_jws_with_root(signed_payload, APPLE_ROOT_CA_G3_PEM)
    }
}

struct CachedGooglePushJwks {
    keys: HashMap<String, DecodingKey>,
    fetched_at: Instant,
}

pub struct HttpGoogleNotificationAuthVerifier {
    client: reqwest::Client,
    jwks_cache: Arc<RwLock<Option<CachedGooglePushJwks>>>,
}

impl HttpGoogleNotificationAuthVerifier {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(15))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
            jwks_cache: Arc::new(RwLock::new(None)),
        }
    }

    async fn get_decoding_key(&self, kid: &str) -> ServiceResult<DecodingKey> {
        {
            let cache = self.jwks_cache.read();
            if let Some(cached) = cache.as_ref() {
                if cached.fetched_at.elapsed() < GOOGLE_PUSH_JWKS_CACHE_TTL {
                    if let Some(key) = cached.keys.get(kid) {
                        return Ok(key.clone());
                    }
                }
            }
        }

        self.refresh_jwks_cache().await?;

        let cache = self.jwks_cache.read();
        if let Some(cached) = cache.as_ref() {
            if let Some(key) = cached.keys.get(kid) {
                return Ok(key.clone());
            }
        }

        Err(ServiceError::Coded {
            code: ErrorCode::Unauthorized,
            message: "Google RTDN signing key was not found in JWKS".into(),
        })
    }

    async fn refresh_jwks_cache(&self) -> ServiceResult<()> {
        let response = self
            .client
            .get(GOOGLE_OIDC_CERTS_URL)
            .send()
            .await
            .map_err(|e| ServiceError::Internal(format!("Google OIDC JWKS request failed: {e}")))?;

        if !response.status().is_success() {
            return Err(ServiceError::Coded {
                code: ErrorCode::Unauthorized,
                message: format!("Google OIDC JWKS returned {}", response.status()),
            });
        }

        let jwks: GoogleJwksResponse = response.json().await.map_err(|e| {
            ServiceError::Internal(format!("invalid Google OIDC JWKS response: {e}"))
        })?;

        let mut keys = HashMap::new();
        for jwk in jwks.keys {
            if jwk.kty != "RSA" {
                continue;
            }
            match DecodingKey::from_rsa_components(&jwk.n, &jwk.e) {
                Ok(key) => {
                    keys.insert(jwk.kid, key);
                }
                Err(error) => {
                    tracing::warn!(kid = %jwk.kid, error = %error, "Failed to parse Google RTDN JWK");
                }
            }
        }

        let mut cache = self.jwks_cache.write();
        *cache = Some(CachedGooglePushJwks {
            keys,
            fetched_at: Instant::now(),
        });

        Ok(())
    }
}

impl Default for HttpGoogleNotificationAuthVerifier {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl GoogleNotificationAuthVerifier for HttpGoogleNotificationAuthVerifier {
    async fn verify_authorization(
        &self,
        config: &Config,
        authorization_header: &str,
    ) -> ServiceResult<()> {
        if !config.native_store.enabled || !config.native_store.google.enabled {
            return Err(ServiceError::Coded {
                code: ErrorCode::PaymentMethodDisabled,
                message: "Google Play RTDN verification is disabled".into(),
            });
        }

        if config
            .native_store
            .google
            .push_service_account_email
            .trim()
            .is_empty()
            || config.native_store.google.push_audience.trim().is_empty()
        {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Google RTDN auth configuration is incomplete".into(),
            });
        }

        let token = authorization_header
            .strip_prefix("Bearer ")
            .filter(|value| !value.trim().is_empty())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::Unauthorized,
                message: "Google RTDN request is missing a Bearer authorization token".into(),
            })?;

        let header = decode_header(token).map_err(|e| ServiceError::Coded {
            code: ErrorCode::Unauthorized,
            message: format!("invalid Google RTDN authorization header: {e}"),
        })?;
        let kid = header.kid.ok_or_else(|| ServiceError::Coded {
            code: ErrorCode::Unauthorized,
            message: "Google RTDN authorization token is missing kid".into(),
        })?;
        let decoding_key = self.get_decoding_key(&kid).await?;
        let claims = verify_google_push_token_with_key(
            token,
            &decoding_key,
            &config.native_store.google.push_audience,
        )?;
        validate_google_push_claims(
            &claims,
            &config.native_store.google.push_service_account_email,
        )?;

        Ok(())
    }
}

pub struct NativeStoreService<S: Store> {
    config: Arc<Config>,
    store: Arc<S>,
    products: Arc<dyn ProductRepository>,
    notifier: Arc<dyn Notifier>,
    payment_callback: Option<Arc<dyn crate::PaymentCallback>>,
    apple: Arc<dyn AppleStoreVerifier>,
    google: Arc<dyn GooglePlayVerifier>,
    apple_notification_verifier: Arc<dyn AppleNotificationVerifier>,
    google_notification_auth_verifier: Arc<dyn GoogleNotificationAuthVerifier>,
}

const NOTIFICATION_PROCESSING_TTL: Duration = Duration::from_secs(5 * 60);
const NOTIFICATION_COMPLETED_TTL: Duration = Duration::from_secs(24 * 60 * 60);

#[derive(Debug, Clone, Default)]
struct SubscriptionLifecycleHints {
    cancel_at_period_end: Option<bool>,
    cancelled_at: Option<DateTime<Utc>>,
    metadata: HashMap<String, String>,
}

impl<S: Store> NativeStoreService<S> {
    pub fn new(
        config: Arc<Config>,
        store: Arc<S>,
        products: Arc<dyn ProductRepository>,
        notifier: Arc<dyn Notifier>,
        payment_callback: Option<Arc<dyn crate::PaymentCallback>>,
    ) -> Self {
        Self::new_with_verifiers_and_notification_auth(
            config,
            store,
            products,
            notifier,
            payment_callback,
            Arc::new(HttpAppleStoreVerifier::new()),
            Arc::new(HttpGooglePlayVerifier::new()),
            Arc::new(CryptographicAppleNotificationVerifier),
            Arc::new(HttpGoogleNotificationAuthVerifier::new()),
        )
    }

    pub fn new_with_verifiers(
        config: Arc<Config>,
        store: Arc<S>,
        products: Arc<dyn ProductRepository>,
        notifier: Arc<dyn Notifier>,
        payment_callback: Option<Arc<dyn crate::PaymentCallback>>,
        apple: Arc<dyn AppleStoreVerifier>,
        google: Arc<dyn GooglePlayVerifier>,
    ) -> Self {
        Self::new_with_verifiers_and_notification_auth(
            config,
            store,
            products,
            notifier,
            payment_callback,
            apple,
            google,
            Arc::new(CryptographicAppleNotificationVerifier),
            Arc::new(HttpGoogleNotificationAuthVerifier::new()),
        )
    }

    pub fn new_with_verifiers_and_notification_auth(
        config: Arc<Config>,
        store: Arc<S>,
        products: Arc<dyn ProductRepository>,
        notifier: Arc<dyn Notifier>,
        payment_callback: Option<Arc<dyn crate::PaymentCallback>>,
        apple: Arc<dyn AppleStoreVerifier>,
        google: Arc<dyn GooglePlayVerifier>,
        apple_notification_verifier: Arc<dyn AppleNotificationVerifier>,
        google_notification_auth_verifier: Arc<dyn GoogleNotificationAuthVerifier>,
    ) -> Self {
        Self {
            config,
            store,
            products,
            notifier,
            payment_callback,
            apple,
            google,
            apple_notification_verifier,
            google_notification_auth_verifier,
        }
    }

    pub async fn verify_purchase(
        &self,
        request: NativeStoreVerificationRequest,
    ) -> ServiceResult<NativeStoreVerificationResult> {
        self.verify_purchase_with_hints(request, SubscriptionLifecycleHints::default())
            .await
    }

    pub async fn handle_apple_server_notification(
        &self,
        tenant_id: &str,
        body: &str,
    ) -> ServiceResult<NativeStoreLifecycleNotificationResult> {
        let envelope: AppleServerNotificationEnvelope =
            serde_json::from_str(body).map_err(|e| ServiceError::Coded {
                code: ErrorCode::InvalidField,
                message: format!("invalid Apple notification payload: {e}"),
            })?;
        let notification: AppleServerNotificationPayload = self
            .decode_verified_apple_payload(&envelope.signed_payload, "Apple server notification")
            .await?;

        if notification.notification_type == "TEST" {
            return Ok(NativeStoreLifecycleNotificationResult {
                success: true,
                duplicate: false,
                platform: "apple_app_store".into(),
                event_type: notification.notification_type,
                product_id: None,
                subscription_id: None,
            });
        }

        let notification_key = notification
            .notification_uuid
            .clone()
            .unwrap_or_else(|| sha256_digest(&envelope.signed_payload));
        let idempotency_key = format!("native-store:apple:{tenant_id}:{notification_key}");
        if !self.try_claim_notification(&idempotency_key).await? {
            return Ok(NativeStoreLifecycleNotificationResult {
                success: true,
                duplicate: true,
                platform: "apple_app_store".into(),
                event_type: notification.notification_type,
                product_id: None,
                subscription_id: None,
            });
        }

        let result = async {
            let transaction = if let Some(signed) = notification
                .data
                .as_ref()
                .and_then(|data| data.signed_transaction_info.as_ref())
            {
                Some(
                    self.decode_verified_apple_payload::<AppleSignedTransactionPayload>(
                        signed,
                        "Apple signedTransactionInfo",
                    )
                    .await?,
                )
            } else {
                None
            };
            let renewal = if let Some(signed) = notification
                .data
                .as_ref()
                .and_then(|data| data.signed_renewal_info.as_ref())
            {
                Some(
                    self.decode_verified_apple_payload::<AppleSignedRenewalInfoPayload>(
                        signed,
                        "Apple signedRenewalInfo",
                    )
                    .await?,
                )
            } else {
                None
            };

            let Some(store_product_id) = transaction
                .as_ref()
                .and_then(|payload| payload.product_id.clone())
                .or_else(|| {
                    renewal
                        .as_ref()
                        .and_then(|payload| payload.product_id.clone())
                })
            else {
                return Ok(NativeStoreLifecycleNotificationResult {
                    success: true,
                    duplicate: false,
                    platform: "apple_app_store".into(),
                    event_type: notification.event_name(),
                    product_id: None,
                    subscription_id: None,
                });
            };

            let product = self
                .resolve_product_by_store_product_id(
                    tenant_id,
                    PaymentMethod::AppleIap,
                    &store_product_id,
                )
                .await?;
            let transaction_id = transaction
                .as_ref()
                .and_then(|payload| payload.transaction_id.clone())
                .or_else(|| {
                    transaction
                        .as_ref()
                        .and_then(|payload| payload.original_transaction_id.clone())
                })
                .or_else(|| {
                    renewal
                        .as_ref()
                        .and_then(|payload| payload.original_transaction_id.clone())
                })
                .ok_or_else(|| ServiceError::Coded {
                    code: ErrorCode::MissingField,
                    message: "Apple notification is missing transaction identifiers".into(),
                })?;

            if store_managed_product_kind(&product)
                != StoreManagedProductKind::AutoRenewableSubscription
                && is_apple_one_time_revocation_event(&notification.notification_type)
            {
                self.validate_apple_bundle_id(
                    transaction
                        .as_ref()
                        .and_then(|payload| payload.bundle_id.as_deref()),
                )?;
                self.revoke_one_time_native_purchase(
                    tenant_id,
                    &format!("apple-tx:{transaction_id}"),
                )
                .await?;

                return Ok(NativeStoreLifecycleNotificationResult {
                    success: true,
                    duplicate: false,
                    platform: "apple_app_store".into(),
                    event_type: notification.event_name(),
                    product_id: Some(product.id),
                    subscription_id: None,
                });
            }

            let verification = self
                .verify_purchase_with_hints(
                    NativeStoreVerificationRequest {
                        tenant_id: tenant_id.to_string(),
                        user_id: None,
                        product_id: product.id.clone(),
                        method: PaymentMethod::AppleIap,
                        store_product_id: store_product_id.clone(),
                        transaction_id: Some(transaction_id),
                        original_transaction_id: transaction
                            .as_ref()
                            .and_then(|payload| payload.original_transaction_id.clone())
                            .or_else(|| {
                                renewal
                                    .as_ref()
                                    .and_then(|payload| payload.original_transaction_id.clone())
                            }),
                        purchase_token: None,
                        package_name: None,
                        metadata: HashMap::new(),
                    },
                    apple_lifecycle_hints(&notification, renewal.as_ref()),
                )
                .await?;

            Ok(NativeStoreLifecycleNotificationResult {
                success: true,
                duplicate: false,
                platform: "apple_app_store".into(),
                event_type: notification.event_name(),
                product_id: Some(product.id),
                subscription_id: verification.subscription_id,
            })
        }
        .await;

        match result {
            Ok(response) => {
                self.complete_notification_claim(&idempotency_key).await?;
                Ok(response)
            }
            Err(error) => {
                self.release_notification_claim(&idempotency_key).await;
                Err(error)
            }
        }
    }

    pub async fn handle_google_rtdn(
        &self,
        tenant_id: &str,
        authorization_header: &str,
        body: &str,
    ) -> ServiceResult<NativeStoreLifecycleNotificationResult> {
        self.google_notification_auth_verifier
            .verify_authorization(&self.config, authorization_header)
            .await?;

        let envelope: GooglePubSubPushEnvelope =
            serde_json::from_str(body).map_err(|e| ServiceError::Coded {
                code: ErrorCode::InvalidField,
                message: format!("invalid Google RTDN envelope: {e}"),
            })?;
        let decoded = STANDARD
            .decode(envelope.message.data.as_bytes())
            .or_else(|_| URL_SAFE_NO_PAD.decode(envelope.message.data.as_bytes()))
            .map_err(|e| ServiceError::Coded {
                code: ErrorCode::InvalidField,
                message: format!("invalid Google RTDN message data: {e}"),
            })?;
        let notification: GoogleDeveloperNotification =
            serde_json::from_slice(&decoded).map_err(|e| ServiceError::Coded {
                code: ErrorCode::InvalidField,
                message: format!("invalid Google RTDN message payload: {e}"),
            })?;

        if notification.test_notification.is_some() {
            return Ok(NativeStoreLifecycleNotificationResult {
                success: true,
                duplicate: false,
                platform: "google_play_store".into(),
                event_type: "test_notification".into(),
                product_id: None,
                subscription_id: None,
            });
        }

        let Some(message_id) = envelope.message.message_id.clone() else {
            return Err(ServiceError::Coded {
                code: ErrorCode::MissingField,
                message: "Google RTDN messageId is required".into(),
            });
        };
        let idempotency_key = format!("native-store:google:{tenant_id}:{message_id}");
        if !self.try_claim_notification(&idempotency_key).await? {
            return Ok(NativeStoreLifecycleNotificationResult {
                success: true,
                duplicate: true,
                platform: "google_play_store".into(),
                event_type: notification.event_name(),
                product_id: None,
                subscription_id: None,
            });
        }

        let result = async {
            if let Some(subscription_notification) = notification.subscription_notification.as_ref()
            {
                let store_product_id = subscription_notification
                    .subscription_id
                    .clone()
                    .ok_or_else(|| ServiceError::Coded {
                        code: ErrorCode::MissingField,
                        message: "Google RTDN subscription notification missing subscriptionId"
                            .into(),
                    })?;
                let purchase_token = subscription_notification
                    .purchase_token
                    .clone()
                    .ok_or_else(|| ServiceError::Coded {
                        code: ErrorCode::MissingField,
                        message: "Google RTDN subscription notification missing purchaseToken"
                            .into(),
                    })?;
                let product = self
                    .resolve_product_by_store_product_id(
                        tenant_id,
                        PaymentMethod::GooglePlayBilling,
                        &store_product_id,
                    )
                    .await?;

                let verification = self
                    .verify_purchase_with_hints(
                        NativeStoreVerificationRequest {
                            tenant_id: tenant_id.to_string(),
                            user_id: None,
                            product_id: product.id.clone(),
                            method: PaymentMethod::GooglePlayBilling,
                            store_product_id: store_product_id.clone(),
                            transaction_id: None,
                            original_transaction_id: None,
                            purchase_token: Some(purchase_token),
                            package_name: notification.package_name.clone(),
                            metadata: HashMap::new(),
                        },
                        google_subscription_lifecycle_hints(subscription_notification),
                    )
                    .await?;

                return Ok(NativeStoreLifecycleNotificationResult {
                    success: true,
                    duplicate: false,
                    platform: "google_play_store".into(),
                    event_type: notification.event_name(),
                    product_id: Some(product.id),
                    subscription_id: verification.subscription_id,
                });
            }

            if let Some(product_notification) = notification.one_time_product_notification.as_ref()
            {
                let store_product_id =
                    product_notification
                        .sku
                        .clone()
                        .ok_or_else(|| ServiceError::Coded {
                            code: ErrorCode::MissingField,
                            message: "Google RTDN one-time notification missing sku".into(),
                        })?;
                let purchase_token =
                    product_notification.purchase_token.clone().ok_or_else(|| {
                        ServiceError::Coded {
                            code: ErrorCode::MissingField,
                            message: "Google RTDN one-time notification missing purchaseToken"
                                .into(),
                        }
                    })?;
                let product = self
                    .resolve_product_by_store_product_id(
                        tenant_id,
                        PaymentMethod::GooglePlayBilling,
                        &store_product_id,
                    )
                    .await?;
                let kind = store_managed_product_kind(&product);
                if kind != StoreManagedProductKind::AutoRenewableSubscription
                    && google_one_time_notification_is_revocation(
                        product_notification.notification_type,
                    )
                {
                    let package_name = self.resolve_google_package_name(
                        product
                            .store_billing
                            .as_ref()
                            .and_then(|cfg| cfg.google.as_ref())
                            .and_then(|cfg| cfg.package_name.as_deref()),
                        notification.package_name.as_deref(),
                    )?;
                    let verified = self
                        .google
                        .verify_one_time_purchase(
                            &self.config,
                            package_name.as_str(),
                            &store_product_id,
                            &purchase_token,
                        )
                        .await?;
                    self.validate_google_one_time_purchase_identity(&verified, &store_product_id)?;
                    if verified.purchase_state != GoogleOneTimePurchaseState::Purchased {
                        self.revoke_one_time_native_purchase(
                            tenant_id,
                            &format!("google-tx:{purchase_token}"),
                        )
                        .await?;
                    }

                    return Ok(NativeStoreLifecycleNotificationResult {
                        success: true,
                        duplicate: false,
                        platform: "google_play_store".into(),
                        event_type: notification.event_name(),
                        product_id: Some(product.id),
                        subscription_id: None,
                    });
                }
                self.verify_purchase_with_hints(
                    NativeStoreVerificationRequest {
                        tenant_id: tenant_id.to_string(),
                        user_id: None,
                        product_id: product.id.clone(),
                        method: PaymentMethod::GooglePlayBilling,
                        store_product_id,
                        transaction_id: None,
                        original_transaction_id: None,
                        purchase_token: Some(purchase_token),
                        package_name: notification.package_name.clone(),
                        metadata: HashMap::new(),
                    },
                    SubscriptionLifecycleHints::default(),
                )
                .await?;

                return Ok(NativeStoreLifecycleNotificationResult {
                    success: true,
                    duplicate: false,
                    platform: "google_play_store".into(),
                    event_type: notification.event_name(),
                    product_id: Some(product.id),
                    subscription_id: None,
                });
            }

            if let Some(voided_purchase) = notification.voided_purchase_notification.as_ref() {
                let product_id = self
                    .handle_google_voided_purchase(
                        tenant_id,
                        notification.package_name.as_deref(),
                        voided_purchase,
                    )
                    .await?;

                return Ok(NativeStoreLifecycleNotificationResult {
                    success: true,
                    duplicate: false,
                    platform: "google_play_store".into(),
                    event_type: notification.event_name(),
                    product_id,
                    subscription_id: None,
                });
            }

            Ok(NativeStoreLifecycleNotificationResult {
                success: true,
                duplicate: false,
                platform: "google_play_store".into(),
                event_type: notification.event_name(),
                product_id: None,
                subscription_id: None,
            })
        }
        .await;

        match result {
            Ok(response) => {
                self.complete_notification_claim(&idempotency_key).await?;
                Ok(response)
            }
            Err(error) => {
                self.release_notification_claim(&idempotency_key).await;
                Err(error)
            }
        }
    }

    async fn verify_purchase_with_hints(
        &self,
        request: NativeStoreVerificationRequest,
        lifecycle_hints: SubscriptionLifecycleHints,
    ) -> ServiceResult<NativeStoreVerificationResult> {
        let start = Instant::now();
        let product = self
            .load_product(&request.tenant_id, &request.product_id)
            .await?;
        let verification = self.build_verification_metadata(&product, &request)?;

        match verification.kind {
            StoreManagedProductKind::AutoRenewableSubscription => {
                let subscription = self
                    .verify_subscription(request, verification.clone(), lifecycle_hints)
                    .await?;

                record_payment(
                    verification.event_method,
                    "subscription",
                    true,
                    product.fiat_price.as_ref().map(|m| m.atomic),
                    product.fiat_price.as_ref().map(|m| m.asset.code.as_str()),
                    start.elapsed().as_secs_f64(),
                );

                Ok(NativeStoreVerificationResult {
                    success: true,
                    transaction_id: verification.transaction_id,
                    method: verification.event_method.to_string(),
                    subscription_id: Some(subscription.id),
                    subscription_status: Some(subscription.status.to_string()),
                    current_period_end: Some(subscription.current_period_end),
                })
            }
            StoreManagedProductKind::Consumable | StoreManagedProductKind::NonConsumable => {
                let payment_amount = self
                    .verify_one_time_purchase(request, verification.clone())
                    .await?;
                let payment_currency = payment_amount.asset.code.clone();

                record_payment(
                    verification.event_method,
                    "resource",
                    true,
                    Some(payment_amount.atomic),
                    Some(payment_currency.as_str()),
                    start.elapsed().as_secs_f64(),
                );

                Ok(NativeStoreVerificationResult {
                    success: true,
                    transaction_id: verification.transaction_id,
                    method: verification.event_method.to_string(),
                    subscription_id: None,
                    subscription_status: None,
                    current_period_end: None,
                })
            }
        }
    }

    async fn try_claim_notification(&self, key: &str) -> ServiceResult<bool> {
        self.store
            .try_save_idempotency_key(
                key,
                crate::storage::IdempotencyResponse {
                    status_code: 102,
                    headers: HashMap::new(),
                    body: Vec::new(),
                    cached_at: Utc::now(),
                },
                NOTIFICATION_PROCESSING_TTL,
            )
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))
    }

    async fn complete_notification_claim(&self, key: &str) -> ServiceResult<()> {
        self.store
            .save_idempotency_key(
                key,
                crate::storage::IdempotencyResponse {
                    status_code: 200,
                    headers: HashMap::new(),
                    body: Vec::new(),
                    cached_at: Utc::now(),
                },
                NOTIFICATION_COMPLETED_TTL,
            )
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))
    }

    async fn release_notification_claim(&self, key: &str) {
        if let Err(error) = self.store.delete_idempotency_key(key).await {
            tracing::warn!(
                idempotency_key = %key,
                error = %error,
                "Failed to release native store notification idempotency claim"
            );
        }
    }

    async fn load_product(&self, tenant_id: &str, product_id: &str) -> ServiceResult<Product> {
        self.products
            .get_product(tenant_id, product_id)
            .await
            .map_err(|err| match err {
                ProductRepositoryError::NotFound => ServiceError::Coded {
                    code: ErrorCode::ProductNotFound,
                    message: "product not found".into(),
                },
                other => ServiceError::Internal(other.to_string()),
            })
    }

    async fn resolve_product_by_store_product_id(
        &self,
        tenant_id: &str,
        method: PaymentMethod,
        store_product_id: &str,
    ) -> ServiceResult<Product> {
        let products = self
            .products
            .list_products(tenant_id)
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        let mut matches = products.into_iter().filter(|product| {
            let Some(store_billing) = product.store_billing.as_ref() else {
                return false;
            };
            match method {
                PaymentMethod::AppleIap => {
                    store_billing
                        .apple
                        .as_ref()
                        .and_then(|config| config.product_id.as_deref())
                        == Some(store_product_id)
                }
                PaymentMethod::GooglePlayBilling => {
                    store_billing
                        .google
                        .as_ref()
                        .and_then(|config| config.product_id.as_deref())
                        == Some(store_product_id)
                }
                _ => false,
            }
        });

        let first = matches.next().ok_or_else(|| ServiceError::Coded {
            code: ErrorCode::ProductNotFound,
            message: format!(
                "no Cedros product is configured for native store product \"{store_product_id}\""
            ),
        })?;

        if matches.next().is_some() {
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: format!(
                    "multiple Cedros products are configured for native store product \"{store_product_id}\""
                ),
            });
        }

        Ok(first)
    }

    async fn decode_verified_apple_payload<T: for<'de> Deserialize<'de>>(
        &self,
        signed: &str,
        context: &str,
    ) -> ServiceResult<T> {
        self.apple_notification_verifier
            .verify_signed_payload(signed)
            .await?;
        decode_jws_payload(signed, context)
    }

    async fn revoke_one_time_native_purchase(
        &self,
        tenant_id: &str,
        payment_signature: &str,
    ) -> ServiceResult<()> {
        let existing = self
            .store
            .get_payment(tenant_id, payment_signature)
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        let Some(payment) = existing else {
            return Ok(());
        };

        self.store
            .delete_payment(tenant_id, payment_signature)
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        self.notifier
            .refund_processed(
                tenant_id,
                payment_signature,
                payment.amount.atomic,
                &payment.amount.asset.code,
            )
            .await;

        Ok(())
    }

    async fn handle_google_voided_purchase(
        &self,
        tenant_id: &str,
        package_name: Option<&str>,
        notification: &GoogleVoidedPurchaseNotification,
    ) -> ServiceResult<Option<String>> {
        let purchase_token = notification
            .purchase_token
            .as_deref()
            .filter(|value| !value.is_empty())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::MissingField,
                message: "Google RTDN voided purchase notification missing purchaseToken".into(),
            })?;

        let payment_signature = format!("google-tx:{purchase_token}");
        if let Some(payment) = self
            .store
            .get_payment(tenant_id, &payment_signature)
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?
        {
            let product = self.load_product(tenant_id, &payment.resource_id).await?;
            let Some(store_product_id) = product
                .store_billing
                .as_ref()
                .and_then(|cfg| cfg.google.as_ref())
                .and_then(|cfg| cfg.product_id.clone())
            else {
                return Ok(Some(payment.resource_id));
            };
            let product_package_name = product
                .store_billing
                .as_ref()
                .and_then(|cfg| cfg.google.as_ref())
                .and_then(|cfg| cfg.package_name.as_deref());
            let resolved_package_name =
                self.resolve_google_package_name(product_package_name, package_name)?;
            let verified = match self
                .google
                .verify_one_time_purchase(
                    &self.config,
                    &resolved_package_name,
                    &store_product_id,
                    purchase_token,
                )
                .await
            {
                Ok(verified) => {
                    self.validate_google_one_time_purchase_identity(&verified, &store_product_id)?;
                    Some(verified)
                }
                Err(error) if notification.refund_type == Some(2) => return Err(error),
                Err(_) => None,
            };

            self.reconcile_google_one_time_refund(
                tenant_id,
                payment,
                &product,
                verified.as_ref(),
                notification.refund_type,
            )
            .await?;
            return Ok(Some(product.id));
        }

        let products = self
            .products
            .list_products(tenant_id)
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;
        for product in products {
            if store_managed_product_kind(&product)
                != StoreManagedProductKind::AutoRenewableSubscription
            {
                continue;
            }
            let signature = format!("google-sub:{purchase_token}:{}", product.id);
            let Some(existing_subscription) = self
                .store
                .get_subscription_by_payment_signature(tenant_id, &signature)
                .await
                .map_err(|e| ServiceError::Internal(e.to_string()))?
            else {
                continue;
            };
            let Some(store_product_id) = product
                .store_billing
                .as_ref()
                .and_then(|cfg| cfg.google.as_ref())
                .and_then(|cfg| cfg.product_id.clone())
            else {
                continue;
            };

            self.verify_purchase_with_hints(
                NativeStoreVerificationRequest {
                    tenant_id: tenant_id.to_string(),
                    user_id: existing_subscription.user_id.clone(),
                    product_id: product.id.clone(),
                    method: PaymentMethod::GooglePlayBilling,
                    store_product_id,
                    transaction_id: None,
                    original_transaction_id: None,
                    purchase_token: Some(purchase_token.to_string()),
                    package_name: package_name.map(str::to_string),
                    metadata: HashMap::new(),
                },
                SubscriptionLifecycleHints {
                    cancel_at_period_end: Some(false),
                    cancelled_at: Some(Utc::now()),
                    metadata: HashMap::from([
                        (
                            "native_store_notification_source".into(),
                            "google_play_rtdn".into(),
                        ),
                        (
                            "native_store_notification_type".into(),
                            "voided_purchase".into(),
                        ),
                    ]),
                },
            )
            .await?;

            return Ok(Some(product.id));
        }

        Ok(None)
    }

    async fn reconcile_google_one_time_refund(
        &self,
        tenant_id: &str,
        payment: crate::models::PaymentTransaction,
        product: &Product,
        verified: Option<&VerifiedGoogleOneTimePurchase>,
        refund_type: Option<i32>,
    ) -> ServiceResult<()> {
        let refund_type_label = if refund_type == Some(2) {
            "partial"
        } else {
            "full"
        };

        let Some(verified) = verified else {
            self.revoke_one_time_native_purchase(tenant_id, &payment.signature)
                .await?;
            return Ok(());
        };

        let unit_amount = stored_native_store_unit_amount(&payment, product);
        let total_quantity = stored_native_store_total_quantity(&payment, verified.quantity);
        let previous_refundable_quantity =
            stored_native_store_refundable_quantity(&payment, total_quantity);
        let current_refundable_quantity =
            google_current_refundable_quantity(verified).clamp(0, total_quantity);

        if current_refundable_quantity >= previous_refundable_quantity {
            if current_refundable_quantity == 0 {
                self.store
                    .delete_payment(tenant_id, &payment.signature)
                    .await
                    .map_err(|e| ServiceError::Internal(e.to_string()))?;
            } else {
                let refreshed_payment = update_native_store_payment_for_refund_state(
                    payment,
                    unit_amount,
                    total_quantity,
                    current_refundable_quantity,
                    0,
                    "google_play_rtdn",
                    refund_type_label,
                )?;
                self.store
                    .upsert_payment(refreshed_payment)
                    .await
                    .map_err(|e| ServiceError::Internal(e.to_string()))?;
            }
            return Ok(());
        }

        let refunded_quantity = previous_refundable_quantity - current_refundable_quantity;
        let refund_amount = unit_amount.mul(refunded_quantity).map_err(|e| {
            ServiceError::Internal(format!("failed to compute native store refund amount: {e}"))
        })?;

        if current_refundable_quantity == 0 {
            self.store
                .delete_payment(tenant_id, &payment.signature)
                .await
                .map_err(|e| ServiceError::Internal(e.to_string()))?;
        } else {
            let updated_payment = update_native_store_payment_for_refund_state(
                payment,
                unit_amount,
                total_quantity,
                current_refundable_quantity,
                refunded_quantity,
                "google_play_rtdn",
                refund_type_label,
            )?;
            self.store
                .upsert_payment(updated_payment)
                .await
                .map_err(|e| ServiceError::Internal(e.to_string()))?;
        }

        self.notifier
            .refund_processed(
                tenant_id,
                &format!("google-tx:{}", verified.purchase_token),
                refund_amount.atomic,
                &refund_amount.asset.code,
            )
            .await;

        Ok(())
    }

    fn resolve_google_package_name(
        &self,
        product_package_name: Option<&str>,
        notification_package_name: Option<&str>,
    ) -> ServiceResult<String> {
        notification_package_name
            .or(product_package_name)
            .or(Some(self.config.native_store.google.package_name.as_str()))
            .filter(|value| !value.is_empty())
            .map(str::to_string)
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "Google Play package name is not configured".into(),
            })
    }

    fn validate_apple_bundle_id(&self, bundle_id: Option<&str>) -> ServiceResult<()> {
        if !self.config.native_store.apple.bundle_id.is_empty()
            && bundle_id != Some(self.config.native_store.apple.bundle_id.as_str())
        {
            return Err(ServiceError::Coded {
                code: ErrorCode::VerificationFailed,
                message: "Apple verified bundle id does not match Cedros configuration".into(),
            });
        }

        Ok(())
    }

    fn validate_google_one_time_purchase_identity(
        &self,
        verified: &VerifiedGoogleOneTimePurchase,
        store_product_id: &str,
    ) -> ServiceResult<()> {
        if verified.product_id != store_product_id {
            return Err(ServiceError::Coded {
                code: ErrorCode::VerificationFailed,
                message: "Google Play verified product id does not match Cedros configuration"
                    .into(),
            });
        }

        Ok(())
    }

    fn build_verification_metadata(
        &self,
        product: &Product,
        request: &NativeStoreVerificationRequest,
    ) -> ServiceResult<StoreVerificationMetadata> {
        let store_billing = product
            .store_billing
            .as_ref()
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::InvalidField,
                message: "product is not configured for native store billing".into(),
            })?;

        let kind = store_managed_product_kind(product);

        match request.method {
            PaymentMethod::AppleIap => {
                let expected_product_id = store_billing
                    .apple
                    .as_ref()
                    .and_then(|cfg| cfg.product_id.clone())
                    .ok_or_else(|| ServiceError::Coded {
                        code: ErrorCode::InvalidField,
                        message: "product is missing Apple store product configuration".into(),
                    })?;

                if expected_product_id != request.store_product_id {
                    return Err(ServiceError::Coded {
                        code: ErrorCode::InvalidField,
                        message:
                            "Apple store product id does not match Cedros product configuration"
                                .into(),
                    });
                }

                let transaction_id = request
                    .transaction_id
                    .as_deref()
                    .or(request.original_transaction_id.as_deref())
                    .filter(|value| !value.is_empty())
                    .ok_or_else(|| ServiceError::Coded {
                        code: ErrorCode::MissingField,
                        message: "transactionId is required for Apple verification".into(),
                    })?;

                let subscription_anchor = request
                    .original_transaction_id
                    .as_deref()
                    .filter(|value| !value.is_empty())
                    .unwrap_or(transaction_id);

                Ok(StoreVerificationMetadata {
                    payment_signature: if kind == StoreManagedProductKind::AutoRenewableSubscription
                    {
                        format!("apple-sub:{}:{}", subscription_anchor, product.id)
                    } else {
                        format!("apple-tx:{}", transaction_id)
                    },
                    transaction_id: transaction_id.to_string(),
                    product: product.clone(),
                    kind,
                    method: PaymentMethod::AppleIap,
                    store_product_id: expected_product_id,
                    event_method: "apple_iap",
                })
            }
            PaymentMethod::GooglePlayBilling => {
                let expected_product_id = store_billing
                    .google
                    .as_ref()
                    .and_then(|cfg| cfg.product_id.clone())
                    .ok_or_else(|| ServiceError::Coded {
                        code: ErrorCode::InvalidField,
                        message: "product is missing Google Play product configuration".into(),
                    })?;

                if expected_product_id != request.store_product_id {
                    return Err(ServiceError::Coded {
                        code: ErrorCode::InvalidField,
                        message:
                            "Google Play product id does not match Cedros product configuration"
                                .into(),
                    });
                }

                let purchase_token = request
                    .purchase_token
                    .as_deref()
                    .filter(|value| !value.is_empty())
                    .ok_or_else(|| ServiceError::Coded {
                        code: ErrorCode::MissingField,
                        message: "purchaseToken is required for Google Play verification".into(),
                    })?;

                Ok(StoreVerificationMetadata {
                    payment_signature: if kind == StoreManagedProductKind::AutoRenewableSubscription
                    {
                        format!("google-sub:{}:{}", purchase_token, product.id)
                    } else {
                        format!("google-tx:{}", purchase_token)
                    },
                    transaction_id: purchase_token.to_string(),
                    product: product.clone(),
                    kind,
                    method: PaymentMethod::GooglePlayBilling,
                    store_product_id: expected_product_id,
                    event_method: "google_play_billing",
                })
            }
            _ => Err(ServiceError::Coded {
                code: ErrorCode::InvalidField,
                message: "unsupported native store payment method".into(),
            }),
        }
    }

    async fn verify_one_time_purchase(
        &self,
        request: NativeStoreVerificationRequest,
        verification: StoreVerificationMetadata,
    ) -> ServiceResult<Money> {
        let verified_purchase = self.verify_store_purchase(&request, &verification).await?;
        let unit_amount = product_amount_or_zero(&verification.product);
        let total_amount = unit_amount.mul(verified_purchase.quantity).map_err(|e| {
            ServiceError::Internal(format!("failed to compute native store amount: {e}"))
        })?;
        let payment = crate::models::PaymentTransaction {
            signature: verification.payment_signature.clone(),
            tenant_id: request.tenant_id.clone(),
            resource_id: verification.product.id.clone(),
            wallet: String::new(),
            user_id: request.user_id.clone(),
            amount: total_amount.clone(),
            created_at: verified_purchase.purchase_date.unwrap_or_else(Utc::now),
            metadata: build_one_time_payment_metadata(
                &request,
                &verification,
                &verified_purchase,
                &unit_amount,
            ),
        };

        let recorded = self
            .store
            .try_record_payment(payment.clone())
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        if !recorded {
            let existing = self
                .store
                .get_payment(&request.tenant_id, &verification.payment_signature)
                .await
                .map_err(|e| ServiceError::Internal(e.to_string()))?
                .ok_or_else(|| {
                    ServiceError::Internal("existing payment missing after conflict".into())
                })?;

            if existing.resource_id != verification.product.id {
                return Err(ServiceError::Coded {
                    code: ErrorCode::PaymentAlreadyUsed,
                    message: "native store transaction already applied to a different product"
                        .into(),
                });
            }

            self.store
                .upsert_payment(merge_native_store_payment(existing, payment))
                .await
                .map_err(|e| ServiceError::Internal(e.to_string()))?;

            return Ok(total_amount);
        }

        let event = build_payment_event(&request, &verification, &payment);
        self.call_payment_callback(&event).await;
        self.notifier.payment_succeeded(event).await;

        Ok(total_amount)
    }

    async fn verify_subscription(
        &self,
        request: NativeStoreVerificationRequest,
        verification: StoreVerificationMetadata,
        lifecycle_hints: SubscriptionLifecycleHints,
    ) -> ServiceResult<Subscription> {
        let verified_subscription = self
            .verify_store_subscription(&request, &verification)
            .await?;

        let existing = self
            .store
            .get_subscription_by_payment_signature(
                &request.tenant_id,
                &verification.payment_signature,
            )
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        let (billing_period, billing_interval) =
            subscription_billing_from_product(&verification.product);
        let current_period_start = verified_subscription.start_date.unwrap_or_else(Utc::now);
        let current_period_end = verified_subscription.expires_date;
        let status = google_or_apple_status_to_subscription_status(
            verification.method.clone(),
            &verified_subscription,
        );
        let mut metadata =
            build_subscription_metadata(&request, &verification, &verified_subscription);
        metadata.extend(lifecycle_hints.metadata.clone());

        let now = Utc::now();
        let mut was_created = false;
        let mut was_renewed = false;
        let mut was_cancelled = false;
        let mut payment_failed = false;

        let subscription = if let Some(mut existing) = existing {
            if existing.product_id != verification.product.id {
                return Err(ServiceError::Coded {
                    code: ErrorCode::PaymentAlreadyUsed,
                    message: "native store subscription already applied to a different product"
                        .into(),
                });
            }
            was_renewed = current_period_end > existing.current_period_end;
            was_cancelled = !matches!(
                existing.status,
                SubscriptionStatus::Cancelled | SubscriptionStatus::Expired
            ) && matches!(
                status,
                SubscriptionStatus::Cancelled | SubscriptionStatus::Expired
            );
            payment_failed = existing.status != SubscriptionStatus::PastDue
                && status == SubscriptionStatus::PastDue;
            existing.payment_method = verification.method.clone();
            existing.status = status.clone();
            existing.billing_period = billing_period;
            existing.billing_interval = billing_interval;
            existing.current_period_start = current_period_start;
            existing.current_period_end = current_period_end;
            existing.user_id = request.user_id.clone();
            existing.cancelled_at = match status {
                SubscriptionStatus::Cancelled | SubscriptionStatus::Expired => {
                    Some(lifecycle_hints.cancelled_at.unwrap_or(now))
                }
                _ => None,
            };
            existing.cancel_at_period_end =
                lifecycle_hints.cancel_at_period_end.unwrap_or(matches!(
                    status,
                    SubscriptionStatus::Cancelled
                        | SubscriptionStatus::Expired
                        | SubscriptionStatus::Unpaid
                ));
            existing.metadata = metadata;
            existing.updated_at = Some(now);
            existing
        } else {
            was_created = true;
            Subscription {
                id: Uuid::new_v4().to_string(),
                tenant_id: request.tenant_id.clone(),
                product_id: verification.product.id.clone(),
                plan_id: None,
                wallet: None,
                user_id: request.user_id.clone(),
                stripe_customer_id: None,
                stripe_subscription_id: None,
                payment_method: verification.method.clone(),
                billing_period,
                billing_interval,
                status: status.clone(),
                current_period_start,
                current_period_end,
                trial_end: None,
                cancelled_at: match status {
                    SubscriptionStatus::Cancelled | SubscriptionStatus::Expired => {
                        Some(lifecycle_hints.cancelled_at.unwrap_or(now))
                    }
                    _ => None,
                },
                cancel_at_period_end: lifecycle_hints.cancel_at_period_end.unwrap_or(matches!(
                    status,
                    SubscriptionStatus::Cancelled
                        | SubscriptionStatus::Expired
                        | SubscriptionStatus::Unpaid
                )),
                metadata,
                payment_signature: Some(verification.payment_signature.clone()),
                created_at: Some(now),
                updated_at: Some(now),
            }
        };

        self.store
            .save_subscription(subscription.clone())
            .await
            .map_err(|e| ServiceError::Internal(e.to_string()))?;

        if was_created {
            self.notifier
                .subscription_created(
                    &request.tenant_id,
                    &subscription.id,
                    &verification.product.id,
                    None,
                )
                .await;
            self.call_subscription_created_callback(&subscription).await;
        } else if was_cancelled {
            self.notifier
                .subscription_cancelled(
                    &request.tenant_id,
                    &subscription.id,
                    &verification.product.id,
                    None,
                )
                .await;
            self.call_subscription_cancelled_callback(&subscription)
                .await;
        } else if payment_failed {
            self.notifier
                .subscription_payment_failed(
                    &request.tenant_id,
                    &subscription.id,
                    &verification.product.id,
                    None,
                )
                .await;
        } else if was_renewed {
            self.notifier
                .subscription_renewed(
                    &request.tenant_id,
                    &subscription.id,
                    &verification.product.id,
                    None,
                )
                .await;
        } else {
            self.notifier
                .subscription_updated(
                    &request.tenant_id,
                    &subscription.id,
                    &verification.product.id,
                    None,
                )
                .await;
        }

        Ok(subscription)
    }

    async fn verify_store_purchase(
        &self,
        request: &NativeStoreVerificationRequest,
        verification: &StoreVerificationMetadata,
    ) -> ServiceResult<VerifiedOneTimePurchasePayload> {
        match verification.method {
            PaymentMethod::AppleIap => {
                let transaction_id = request
                    .transaction_id
                    .as_deref()
                    .or(request.original_transaction_id.as_deref())
                    .ok_or_else(|| ServiceError::Coded {
                        code: ErrorCode::MissingField,
                        message: "transactionId is required for Apple verification".into(),
                    })?;

                let verified = self
                    .apple
                    .verify_purchase(&self.config, transaction_id)
                    .await?;
                self.validate_apple_purchase(&verified, verification, false)?;
                Ok(VerifiedOneTimePurchasePayload {
                    purchase_date: Some(verified.purchase_date),
                    quantity: 1,
                    refundable_quantity: 1,
                    external_metadata: HashMap::from([(
                        "environment".to_string(),
                        verified.environment.unwrap_or_else(|| "unknown".into()),
                    )]),
                })
            }
            PaymentMethod::GooglePlayBilling => {
                let store_billing = verification
                    .product
                    .store_billing
                    .as_ref()
                    .and_then(|cfg| cfg.google.as_ref())
                    .ok_or_else(|| ServiceError::Coded {
                        code: ErrorCode::InvalidField,
                        message: "product is missing Google Play configuration".into(),
                    })?;
                let package_name = request
                    .package_name
                    .as_deref()
                    .or(store_billing.package_name.as_deref())
                    .or(Some(self.config.native_store.google.package_name.as_str()))
                    .filter(|value| !value.is_empty())
                    .ok_or_else(|| ServiceError::Coded {
                        code: ErrorCode::ConfigError,
                        message: "Google Play package name is not configured".into(),
                    })?;
                let purchase_token =
                    request
                        .purchase_token
                        .as_deref()
                        .ok_or_else(|| ServiceError::Coded {
                            code: ErrorCode::MissingField,
                            message: "purchaseToken is required for Google Play verification"
                                .into(),
                        })?;
                let verified = self
                    .google
                    .verify_one_time_purchase(
                        &self.config,
                        package_name,
                        &verification.store_product_id,
                        purchase_token,
                    )
                    .await?;
                self.validate_google_one_time_purchase(&verified, verification)?;
                if !verified.acknowledged
                    && verified.purchase_state == GoogleOneTimePurchaseState::Purchased
                {
                    self.google
                        .acknowledge_one_time_purchase(
                            &self.config,
                            package_name,
                            &verification.store_product_id,
                            purchase_token,
                        )
                        .await?;
                }
                Ok(VerifiedOneTimePurchasePayload {
                    purchase_date: verified.purchase_date,
                    quantity: verified.quantity,
                    refundable_quantity: verified.refundable_quantity,
                    external_metadata: HashMap::from([(
                        "package_name".to_string(),
                        package_name.to_string(),
                    )]),
                })
            }
            _ => Err(ServiceError::Coded {
                code: ErrorCode::InvalidField,
                message: "unsupported native store payment method".into(),
            }),
        }
    }

    async fn verify_store_subscription(
        &self,
        request: &NativeStoreVerificationRequest,
        verification: &StoreVerificationMetadata,
    ) -> ServiceResult<VerifiedSubscriptionPayload> {
        match verification.method {
            PaymentMethod::AppleIap => {
                let transaction_id = request
                    .transaction_id
                    .as_deref()
                    .or(request.original_transaction_id.as_deref())
                    .ok_or_else(|| ServiceError::Coded {
                        code: ErrorCode::MissingField,
                        message: "transactionId is required for Apple verification".into(),
                    })?;
                let verified = self
                    .apple
                    .verify_purchase(&self.config, transaction_id)
                    .await?;
                self.validate_apple_purchase(&verified, verification, true)?;
                let period_end = verified.expires_date.ok_or_else(|| ServiceError::Coded {
                    code: ErrorCode::VerificationFailed,
                    message: "Apple subscription is missing expiresDate".into(),
                })?;
                Ok(VerifiedSubscriptionPayload {
                    start_date: Some(verified.purchase_date),
                    expires_date: period_end,
                    state: VerifiedSubscriptionState::from_apple(&verified),
                    external_metadata: HashMap::from([
                        (
                            "original_transaction_id".to_string(),
                            verified.original_transaction_id,
                        ),
                        (
                            "environment".to_string(),
                            verified.environment.unwrap_or_else(|| "unknown".into()),
                        ),
                    ]),
                })
            }
            PaymentMethod::GooglePlayBilling => {
                let store_billing = verification
                    .product
                    .store_billing
                    .as_ref()
                    .and_then(|cfg| cfg.google.as_ref())
                    .ok_or_else(|| ServiceError::Coded {
                        code: ErrorCode::InvalidField,
                        message: "product is missing Google Play configuration".into(),
                    })?;
                let package_name = request
                    .package_name
                    .as_deref()
                    .or(store_billing.package_name.as_deref())
                    .or(Some(self.config.native_store.google.package_name.as_str()))
                    .filter(|value| !value.is_empty())
                    .ok_or_else(|| ServiceError::Coded {
                        code: ErrorCode::ConfigError,
                        message: "Google Play package name is not configured".into(),
                    })?;
                let purchase_token =
                    request
                        .purchase_token
                        .as_deref()
                        .ok_or_else(|| ServiceError::Coded {
                            code: ErrorCode::MissingField,
                            message: "purchaseToken is required for Google Play verification"
                                .into(),
                        })?;
                let verified = self
                    .google
                    .verify_subscription(
                        &self.config,
                        package_name,
                        &verification.store_product_id,
                        purchase_token,
                    )
                    .await?;
                self.validate_google_subscription(&verified, verification, store_billing)?;
                if !verified.acknowledged {
                    self.google
                        .acknowledge_subscription(
                            &self.config,
                            package_name,
                            &verification.store_product_id,
                            purchase_token,
                        )
                        .await?;
                }
                Ok(VerifiedSubscriptionPayload {
                    start_date: verified.start_date,
                    expires_date: verified.expires_date,
                    state: VerifiedSubscriptionState::from_google(verified.state),
                    external_metadata: HashMap::from([
                        (
                            "base_plan_id".to_string(),
                            verified.base_plan_id.unwrap_or_default(),
                        ),
                        (
                            "offer_id".to_string(),
                            verified.offer_id.unwrap_or_default(),
                        ),
                    ]),
                })
            }
            _ => Err(ServiceError::Coded {
                code: ErrorCode::InvalidField,
                message: "unsupported native store payment method".into(),
            }),
        }
    }

    fn validate_apple_purchase(
        &self,
        verified: &VerifiedApplePurchase,
        verification: &StoreVerificationMetadata,
        allow_revoked: bool,
    ) -> ServiceResult<()> {
        if verified.revoked && !allow_revoked {
            return Err(ServiceError::Coded {
                code: ErrorCode::VerificationFailed,
                message: "Apple purchase has been revoked".into(),
            });
        }

        if verified.product_id != verification.store_product_id {
            return Err(ServiceError::Coded {
                code: ErrorCode::VerificationFailed,
                message: "Apple verified product id does not match Cedros configuration".into(),
            });
        }

        self.validate_apple_bundle_id(verified.bundle_id.as_deref())
    }

    fn validate_google_one_time_purchase(
        &self,
        verified: &VerifiedGoogleOneTimePurchase,
        verification: &StoreVerificationMetadata,
    ) -> ServiceResult<()> {
        self.validate_google_one_time_purchase_identity(verified, &verification.store_product_id)?;

        if verified.purchase_state != GoogleOneTimePurchaseState::Purchased {
            return Err(ServiceError::Coded {
                code: ErrorCode::VerificationFailed,
                message: "Google Play purchase is not in a purchased state".into(),
            });
        }

        Ok(())
    }

    fn validate_google_subscription(
        &self,
        verified: &VerifiedGoogleSubscription,
        verification: &StoreVerificationMetadata,
        store_config: &crate::models::GooglePlayStoreProductConfig,
    ) -> ServiceResult<()> {
        if verified.product_id != verification.store_product_id {
            return Err(ServiceError::Coded {
                code: ErrorCode::VerificationFailed,
                message: "Google Play verified product id does not match Cedros configuration"
                    .into(),
            });
        }

        if let Some(expected_base_plan) = store_config.base_plan_id.as_deref() {
            if verified.base_plan_id.as_deref() != Some(expected_base_plan) {
                return Err(ServiceError::Coded {
                    code: ErrorCode::VerificationFailed,
                    message: "Google Play verified base plan does not match Cedros configuration"
                        .into(),
                });
            }
        }

        if let Some(expected_offer_id) = store_config.offer_id.as_deref() {
            if verified.offer_id.as_deref() != Some(expected_offer_id) {
                return Err(ServiceError::Coded {
                    code: ErrorCode::VerificationFailed,
                    message: "Google Play verified offer id does not match Cedros configuration"
                        .into(),
                });
            }
        }

        Ok(())
    }

    async fn call_payment_callback(&self, event: &PaymentEvent) {
        let Some(callback) = self.payment_callback.as_ref() else {
            return;
        };

        match timeout(PAYMENT_CALLBACK_TIMEOUT, callback.on_payment_success(event)).await {
            Ok(Ok(())) => {}
            Ok(Err(error)) => {
                tracing::warn!(error = %error, "PaymentCallback::on_payment_success failed")
            }
            Err(_) => tracing::warn!("PaymentCallback::on_payment_success timed out"),
        }
    }

    async fn call_subscription_created_callback(&self, subscription: &Subscription) {
        let Some(callback) = self.payment_callback.as_ref() else {
            return;
        };

        match timeout(
            PAYMENT_CALLBACK_TIMEOUT,
            callback.on_subscription_created(subscription),
        )
        .await
        {
            Ok(Ok(())) => {}
            Ok(Err(error)) => {
                tracing::warn!(error = %error, "PaymentCallback::on_subscription_created failed")
            }
            Err(_) => tracing::warn!("PaymentCallback::on_subscription_created timed out"),
        }
    }

    async fn call_subscription_cancelled_callback(&self, subscription: &Subscription) {
        let Some(callback) = self.payment_callback.as_ref() else {
            return;
        };

        match timeout(
            PAYMENT_CALLBACK_TIMEOUT,
            callback.on_subscription_cancelled(subscription),
        )
        .await
        {
            Ok(Ok(())) => {}
            Ok(Err(error)) => {
                tracing::warn!(error = %error, "PaymentCallback::on_subscription_cancelled failed")
            }
            Err(_) => tracing::warn!("PaymentCallback::on_subscription_cancelled timed out"),
        }
    }
}

#[derive(Debug, Clone)]
struct VerifiedSubscriptionPayload {
    start_date: Option<DateTime<Utc>>,
    expires_date: DateTime<Utc>,
    state: VerifiedSubscriptionState,
    external_metadata: HashMap<String, String>,
}

#[derive(Debug, Clone)]
struct VerifiedOneTimePurchasePayload {
    purchase_date: Option<DateTime<Utc>>,
    quantity: i64,
    refundable_quantity: i64,
    external_metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Copy)]
enum VerifiedSubscriptionState {
    Active,
    PastDue,
    Cancelled,
    Expired,
}

impl VerifiedSubscriptionState {
    fn from_apple(verified: &VerifiedApplePurchase) -> Self {
        if verified.revoked {
            Self::Cancelled
        } else if verified
            .expires_date
            .is_some_and(|expires| expires <= Utc::now())
        {
            Self::Expired
        } else {
            Self::Active
        }
    }

    fn from_google(state: GoogleSubscriptionState) -> Self {
        match state {
            GoogleSubscriptionState::Active => Self::Active,
            GoogleSubscriptionState::InGracePeriod
            | GoogleSubscriptionState::OnHold
            | GoogleSubscriptionState::Paused => Self::PastDue,
            GoogleSubscriptionState::Cancelled => Self::Cancelled,
            GoogleSubscriptionState::Expired => Self::Expired,
        }
    }
}

fn google_or_apple_status_to_subscription_status(
    _method: PaymentMethod,
    payload: &VerifiedSubscriptionPayload,
) -> SubscriptionStatus {
    match payload.state {
        VerifiedSubscriptionState::Active => SubscriptionStatus::Active,
        VerifiedSubscriptionState::PastDue => SubscriptionStatus::PastDue,
        VerifiedSubscriptionState::Cancelled => SubscriptionStatus::Cancelled,
        VerifiedSubscriptionState::Expired => SubscriptionStatus::Expired,
    }
}

fn subscription_billing_from_product(product: &Product) -> (BillingPeriod, i32) {
    let Some(subscription) = product.subscription.as_ref() else {
        return (BillingPeriod::Month, 1);
    };

    let billing_period = match subscription.billing_period.as_str() {
        "day" => BillingPeriod::Day,
        "week" => BillingPeriod::Week,
        "year" => BillingPeriod::Year,
        _ => BillingPeriod::Month,
    };

    (billing_period, subscription.billing_interval.max(1))
}

fn build_payment_metadata(
    request: &NativeStoreVerificationRequest,
    verification: &StoreVerificationMetadata,
) -> HashMap<String, String> {
    let mut metadata = request.metadata.clone();
    metadata.insert(
        "native_store_method".to_string(),
        verification.event_method.to_string(),
    );
    metadata.insert(
        "store_product_id".to_string(),
        verification.store_product_id.clone(),
    );
    if let Some(package_name) = request.package_name.as_ref() {
        metadata.insert("package_name".to_string(), package_name.clone());
    }
    if let Some(original_transaction_id) = request.original_transaction_id.as_ref() {
        metadata.insert(
            "original_transaction_id".to_string(),
            original_transaction_id.clone(),
        );
    }
    metadata
}

fn build_one_time_payment_metadata(
    request: &NativeStoreVerificationRequest,
    verification: &StoreVerificationMetadata,
    payload: &VerifiedOneTimePurchasePayload,
    unit_amount: &Money,
) -> HashMap<String, String> {
    let mut metadata = build_payment_metadata(request, verification);
    metadata.extend(payload.external_metadata.clone());
    metadata.insert(
        NATIVE_STORE_TOTAL_QUANTITY_KEY.to_string(),
        payload.quantity.to_string(),
    );
    metadata.insert(
        NATIVE_STORE_REFUNDABLE_QUANTITY_KEY.to_string(),
        payload.refundable_quantity.to_string(),
    );
    metadata.insert(
        NATIVE_STORE_UNIT_AMOUNT_ATOMIC_KEY.to_string(),
        unit_amount.atomic.to_string(),
    );
    metadata.insert(
        NATIVE_STORE_UNIT_AMOUNT_ASSET_KEY.to_string(),
        unit_amount.asset.code.clone(),
    );
    metadata
}

fn build_subscription_metadata(
    request: &NativeStoreVerificationRequest,
    verification: &StoreVerificationMetadata,
    payload: &VerifiedSubscriptionPayload,
) -> HashMap<String, String> {
    let mut metadata = build_payment_metadata(request, verification);
    metadata.extend(payload.external_metadata.clone());
    metadata
}

fn build_payment_event(
    request: &NativeStoreVerificationRequest,
    verification: &StoreVerificationMetadata,
    payment: &crate::models::PaymentTransaction,
) -> PaymentEvent {
    PaymentEvent {
        event_id: crate::x402::utils::generate_event_id(),
        event_type: "payment.succeeded".into(),
        event_timestamp: Utc::now(),
        tenant_id: request.tenant_id.clone(),
        resource_id: verification.product.id.clone(),
        method: verification.event_method.to_string(),
        stripe_session_id: None,
        stripe_customer: None,
        fiat_amount_cents: Some(payment.amount.atomic),
        fiat_currency: Some(payment.amount.asset.code.clone()),
        crypto_atomic_amount: None,
        crypto_token: None,
        wallet: None,
        user_id: payment.user_id.clone(),
        proof_signature: Some(verification.transaction_id.clone()),
        metadata: payment.metadata.clone(),
        paid_at: payment.created_at,
    }
}

fn product_amount_or_zero(product: &Product) -> Money {
    product
        .fiat_price
        .clone()
        .or_else(|| product.crypto_price.clone())
        .unwrap_or_else(|| Money::new(must_get_asset("USD"), 0))
}

fn store_managed_product_kind(product: &Product) -> StoreManagedProductKind {
    product
        .store_billing
        .as_ref()
        .and_then(|cfg| cfg.kind.clone())
        .unwrap_or_else(|| {
            if product.subscription.is_some() {
                StoreManagedProductKind::AutoRenewableSubscription
            } else {
                StoreManagedProductKind::NonConsumable
            }
        })
}

fn merge_native_store_payment(
    existing: crate::models::PaymentTransaction,
    mut desired: crate::models::PaymentTransaction,
) -> crate::models::PaymentTransaction {
    let mut metadata = existing.metadata;
    metadata.extend(desired.metadata);
    desired.metadata = metadata;
    if desired.user_id.is_none() {
        desired.user_id = existing.user_id;
    }
    if desired.wallet.is_empty() {
        desired.wallet = existing.wallet;
    }
    if existing.created_at < desired.created_at {
        desired.created_at = existing.created_at;
    }
    desired
}

fn stored_native_store_unit_amount(
    payment: &crate::models::PaymentTransaction,
    product: &Product,
) -> Money {
    let Some(atomic) = parse_i64_metadata(&payment.metadata, NATIVE_STORE_UNIT_AMOUNT_ATOMIC_KEY)
    else {
        return product_amount_or_zero(product);
    };
    let Some(asset_code) = payment.metadata.get(NATIVE_STORE_UNIT_AMOUNT_ASSET_KEY) else {
        return product_amount_or_zero(product);
    };
    let Some(asset) = crate::models::get_asset(asset_code) else {
        return product_amount_or_zero(product);
    };

    Money::new(asset, atomic)
}

fn stored_native_store_total_quantity(
    payment: &crate::models::PaymentTransaction,
    verified_quantity: i64,
) -> i64 {
    parse_i64_metadata(&payment.metadata, NATIVE_STORE_TOTAL_QUANTITY_KEY)
        .unwrap_or(verified_quantity)
        .max(verified_quantity)
        .max(1)
}

fn stored_native_store_refundable_quantity(
    payment: &crate::models::PaymentTransaction,
    total_quantity: i64,
) -> i64 {
    parse_i64_metadata(&payment.metadata, NATIVE_STORE_REFUNDABLE_QUANTITY_KEY)
        .unwrap_or(total_quantity)
        .clamp(0, total_quantity)
}

fn google_current_refundable_quantity(verified: &VerifiedGoogleOneTimePurchase) -> i64 {
    match verified.purchase_state {
        GoogleOneTimePurchaseState::Purchased => verified.refundable_quantity,
        GoogleOneTimePurchaseState::Cancelled | GoogleOneTimePurchaseState::Pending => 0,
    }
}

fn update_native_store_payment_for_refund_state(
    mut payment: crate::models::PaymentTransaction,
    unit_amount: Money,
    total_quantity: i64,
    refundable_quantity: i64,
    refunded_quantity: i64,
    refund_source: &str,
    refund_type: &str,
) -> ServiceResult<crate::models::PaymentTransaction> {
    payment.amount = unit_amount.mul(refundable_quantity).map_err(|e| {
        ServiceError::Internal(format!("failed to update native store payment amount: {e}"))
    })?;
    payment.metadata.insert(
        NATIVE_STORE_TOTAL_QUANTITY_KEY.to_string(),
        total_quantity.to_string(),
    );
    payment.metadata.insert(
        NATIVE_STORE_REFUNDABLE_QUANTITY_KEY.to_string(),
        refundable_quantity.to_string(),
    );
    payment.metadata.insert(
        NATIVE_STORE_UNIT_AMOUNT_ATOMIC_KEY.to_string(),
        unit_amount.atomic.to_string(),
    );
    payment.metadata.insert(
        NATIVE_STORE_UNIT_AMOUNT_ASSET_KEY.to_string(),
        unit_amount.asset.code.clone(),
    );
    payment.metadata.insert(
        NATIVE_STORE_LAST_REFUND_AT_KEY.to_string(),
        Utc::now().to_rfc3339(),
    );
    payment.metadata.insert(
        NATIVE_STORE_LAST_REFUND_QUANTITY_KEY.to_string(),
        refunded_quantity.to_string(),
    );
    payment.metadata.insert(
        NATIVE_STORE_LAST_REFUND_SOURCE_KEY.to_string(),
        refund_source.to_string(),
    );
    payment.metadata.insert(
        NATIVE_STORE_LAST_REFUND_TYPE_KEY.to_string(),
        refund_type.to_string(),
    );
    Ok(payment)
}

fn is_apple_one_time_revocation_event(notification_type: &str) -> bool {
    matches!(notification_type, "REFUND" | "REVOKE")
}

fn google_one_time_notification_is_revocation(notification_type: Option<i32>) -> bool {
    matches!(notification_type, Some(2))
}

fn apple_lifecycle_hints(
    notification: &AppleServerNotificationPayload,
    renewal: Option<&AppleSignedRenewalInfoPayload>,
) -> SubscriptionLifecycleHints {
    let mut hints = SubscriptionLifecycleHints::default();
    hints.metadata.insert(
        "native_store_notification_source".into(),
        "apple_app_store_server_notification".into(),
    );
    hints.metadata.insert(
        "native_store_notification_type".into(),
        notification.notification_type.clone(),
    );
    if let Some(subtype) = notification.subtype.as_ref() {
        hints
            .metadata
            .insert("native_store_notification_subtype".into(), subtype.clone());
    }
    if let Some(uuid) = notification.notification_uuid.as_ref() {
        hints
            .metadata
            .insert("native_store_notification_id".into(), uuid.clone());
    }

    let auto_renew_status = renewal.and_then(|payload| payload.auto_renew_status);
    hints.cancel_at_period_end = match (
        notification.notification_type.as_str(),
        notification.subtype.as_deref(),
        auto_renew_status,
    ) {
        ("DID_CHANGE_RENEWAL_STATUS", Some("AUTO_RENEW_DISABLED"), _) => Some(true),
        ("DID_CHANGE_RENEWAL_STATUS", Some("AUTO_RENEW_ENABLED"), _) => Some(false),
        (_, _, Some(0)) => Some(true),
        (_, _, Some(1)) => Some(false),
        ("DID_RENEW", _, _) | ("SUBSCRIBED", _, _) => Some(false),
        _ => None,
    };
    if matches!(
        notification.notification_type.as_str(),
        "REVOKE" | "EXPIRED"
    ) {
        hints.cancelled_at = Some(Utc::now());
    }

    hints
}

fn google_subscription_lifecycle_hints(
    notification: &GoogleSubscriptionNotification,
) -> SubscriptionLifecycleHints {
    let mut hints = SubscriptionLifecycleHints::default();
    hints.metadata.insert(
        "native_store_notification_source".into(),
        "google_play_rtdn".into(),
    );
    if let Some(notification_type) = notification.notification_type {
        hints.metadata.insert(
            "native_store_notification_type".into(),
            notification_type.to_string(),
        );
        hints.cancel_at_period_end = match notification_type {
            1 | 2 | 4 | 7 => Some(false),
            3 => Some(true),
            _ => None,
        };
        if matches!(notification_type, 12 | 13) {
            hints.cancelled_at = Some(Utc::now());
        }
    }
    hints
}

fn sha256_digest(value: &str) -> String {
    let digest = Sha256::digest(value.as_bytes());
    let mut output = String::with_capacity(digest.len() * 2);
    for byte in digest {
        use std::fmt::Write as _;
        let _ = write!(&mut output, "{byte:02x}");
    }
    output
}

fn apple_base_urls(config: &Config) -> Vec<&'static str> {
    if config.native_store.apple.allow_sandbox_fallback {
        vec![APPLE_PRODUCTION_BASE_URL, APPLE_SANDBOX_BASE_URL]
    } else {
        vec![APPLE_PRODUCTION_BASE_URL]
    }
}

fn build_apple_auth_token(config: &Config) -> ServiceResult<String> {
    let now = Utc::now().timestamp();
    let claims = AppleAuthClaims {
        iss: config.native_store.apple.issuer_id.clone(),
        iat: now,
        exp: now + 3600,
        aud: "appstoreconnect-v1".to_string(),
        bid: config.native_store.apple.bundle_id.clone(),
    };

    let mut header = Header::new(Algorithm::ES256);
    header.kid = Some(config.native_store.apple.key_id.clone());

    jsonwebtoken::encode(
        &header,
        &claims,
        &EncodingKey::from_ec_pem(config.native_store.apple.private_key.as_bytes())
            .map_err(|e| ServiceError::Internal(format!("invalid Apple private key: {e}")))?,
    )
    .map_err(|e| ServiceError::Internal(format!("failed to sign Apple auth token: {e}")))
}

fn unauthorized_service_error(message: impl Into<String>) -> ServiceError {
    ServiceError::Coded {
        code: ErrorCode::Unauthorized,
        message: message.into(),
    }
}

fn split_jws<'a>(signed: &'a str, context: &str) -> ServiceResult<(&'a str, &'a str, &'a str)> {
    let mut parts = signed.split('.');
    let header = parts
        .next()
        .filter(|part| !part.is_empty())
        .ok_or_else(|| unauthorized_service_error(format!("{context} was not a valid JWS")))?;
    let payload = parts
        .next()
        .filter(|part| !part.is_empty())
        .ok_or_else(|| unauthorized_service_error(format!("{context} was not a valid JWS")))?;
    let signature = parts
        .next()
        .filter(|part| !part.is_empty())
        .ok_or_else(|| unauthorized_service_error(format!("{context} was not a valid JWS")))?;
    if parts.next().is_some() {
        return Err(unauthorized_service_error(format!(
            "{context} was not a valid JWS"
        )));
    }

    Ok((header, payload, signature))
}

fn decode_jws_segment<T: for<'de> Deserialize<'de>>(
    segment: &str,
    context: &str,
) -> ServiceResult<T> {
    let decoded = URL_SAFE_NO_PAD
        .decode(segment)
        .map_err(|e| ServiceError::Internal(format!("failed to decode {context} segment: {e}")))?;
    serde_json::from_slice(&decoded)
        .map_err(|e| ServiceError::Internal(format!("failed to parse {context} segment: {e}")))
}

fn verify_apple_signed_jws_with_root(signed: &str, root_pem: &str) -> ServiceResult<()> {
    let (header_b64, payload_b64, signature_b64) = split_jws(signed, "Apple signed payload")?;
    let header: AppleJwsHeader = decode_jws_segment(header_b64, "Apple JWS header")?;
    if header.alg != "ES256" {
        return Err(unauthorized_service_error(format!(
            "unexpected Apple JWS algorithm: {}",
            header.alg
        )));
    }
    if header.x5c.is_empty() {
        return Err(unauthorized_service_error(
            "Apple JWS did not include an x5c certificate chain",
        ));
    }

    let certificates = header
        .x5c
        .iter()
        .map(|encoded| {
            let der = STANDARD.decode(encoded.as_bytes()).map_err(|e| {
                ServiceError::Internal(format!("failed to decode Apple x5c certificate: {e}"))
            })?;
            X509::from_der(&der).map_err(|e| {
                ServiceError::Internal(format!("failed to parse Apple x5c certificate: {e}"))
            })
        })
        .collect::<ServiceResult<Vec<_>>>()?;

    let root = X509::from_pem(root_pem.as_bytes()).map_err(|e| {
        ServiceError::Internal(format!("failed to parse Apple root certificate: {e}"))
    })?;
    let mut store_builder = X509StoreBuilder::new()
        .map_err(|e| ServiceError::Internal(format!("failed to build Apple X509 store: {e}")))?;
    store_builder.add_cert(root).map_err(|e| {
        ServiceError::Internal(format!("failed to load Apple root certificate: {e}"))
    })?;
    let store = store_builder.build();

    let mut chain = Stack::new()
        .map_err(|e| ServiceError::Internal(format!("failed to allocate Apple cert chain: {e}")))?;
    for certificate in certificates.iter().skip(1) {
        chain.push(certificate.clone()).map_err(|e| {
            ServiceError::Internal(format!("failed to build Apple cert chain: {e}"))
        })?;
    }

    let mut context = X509StoreContext::new()
        .map_err(|e| ServiceError::Internal(format!("failed to create Apple X509 context: {e}")))?;
    let certificate_chain_valid = context
        .init(&store, &certificates[0], &chain, |ctx| ctx.verify_cert())
        .map_err(|e| {
            ServiceError::Internal(format!("failed to verify Apple certificate chain: {e}"))
        })?;
    if !certificate_chain_valid {
        return Err(unauthorized_service_error(
            "Apple notification certificate chain verification failed",
        ));
    }

    let der_signature = convert_es256_jws_signature_to_der(signature_b64)?;
    let signing_input = format!("{header_b64}.{payload_b64}");
    let public_key = certificates[0].public_key().map_err(|e| {
        ServiceError::Internal(format!("failed to extract Apple JWS public key: {e}"))
    })?;
    let mut verifier = OpenSslVerifier::new(MessageDigest::sha256(), &public_key).map_err(|e| {
        ServiceError::Internal(format!("failed to initialize Apple JWS verifier: {e}"))
    })?;
    verifier
        .update(signing_input.as_bytes())
        .map_err(|e| ServiceError::Internal(format!("failed to hash Apple JWS payload: {e}")))?;
    let signature_valid = verifier.verify(&der_signature).map_err(|e| {
        ServiceError::Internal(format!("failed to verify Apple JWS signature: {e}"))
    })?;
    if !signature_valid {
        return Err(unauthorized_service_error(
            "Apple notification signature verification failed",
        ));
    }

    Ok(())
}

fn convert_es256_jws_signature_to_der(signature_b64: &str) -> ServiceResult<Vec<u8>> {
    let raw_signature = URL_SAFE_NO_PAD.decode(signature_b64).map_err(|e| {
        unauthorized_service_error(format!("failed to decode ES256 JWS signature: {e}"))
    })?;
    if raw_signature.len() != 64 {
        return Err(unauthorized_service_error(
            "ES256 JWS signature was not 64 bytes long",
        ));
    }

    let r = BigNum::from_slice(&raw_signature[..32]).map_err(|e| {
        ServiceError::Internal(format!("failed to parse ES256 JWS signature r: {e}"))
    })?;
    let s = BigNum::from_slice(&raw_signature[32..]).map_err(|e| {
        ServiceError::Internal(format!("failed to parse ES256 JWS signature s: {e}"))
    })?;
    let signature = EcdsaSig::from_private_components(r, s)
        .map_err(|e| ServiceError::Internal(format!("failed to build ES256 JWS signature: {e}")))?;
    signature
        .to_der()
        .map_err(|e| ServiceError::Internal(format!("failed to encode ES256 JWS signature: {e}")))
}

fn verify_google_push_token_with_key(
    token: &str,
    decoding_key: &DecodingKey,
    expected_audience: &str,
) -> ServiceResult<GooglePushJwtClaims> {
    let mut validation = Validation::new(Algorithm::RS256);
    validation.set_required_spec_claims(&["aud", "exp", "iss", "sub"]);
    validation.set_issuer(&["accounts.google.com", "https://accounts.google.com"]);
    validation.set_audience(&[expected_audience]);

    decode::<GooglePushJwtClaims>(token, decoding_key, &validation)
        .map(|token_data| token_data.claims)
        .map_err(|e| unauthorized_service_error(format!("invalid Google RTDN auth token: {e}")))
}

fn validate_google_push_claims(
    claims: &GooglePushJwtClaims,
    expected_email: &str,
) -> ServiceResult<()> {
    if claims.email.as_deref() != Some(expected_email) {
        return Err(unauthorized_service_error(
            "Google RTDN authorization email did not match configuration",
        ));
    }

    if !claims.email_verified.unwrap_or(false) {
        return Err(unauthorized_service_error(
            "Google RTDN authorization email was not verified",
        ));
    }

    Ok(())
}

fn decode_jws_payload<T: for<'de> Deserialize<'de>>(
    signed: &str,
    context: &str,
) -> ServiceResult<T> {
    let (_, payload, _) = split_jws(signed, context)?;
    let decoded = URL_SAFE_NO_PAD
        .decode(payload)
        .map_err(|e| ServiceError::Internal(format!("failed to decode {context} payload: {e}")))?;
    serde_json::from_slice(&decoded)
        .map_err(|e| ServiceError::Internal(format!("failed to parse {context} payload: {e}")))
}

fn millis_to_utc(value: Option<i64>) -> Option<DateTime<Utc>> {
    value.and_then(|millis| Utc.timestamp_millis_opt(millis).single())
}

fn millis_to_utc_optional(value: Option<i64>) -> Option<DateTime<Utc>> {
    millis_to_utc(value)
}

fn millis_string_to_utc(value: Option<&str>) -> Option<DateTime<Utc>> {
    value
        .and_then(|raw| raw.parse::<i64>().ok())
        .and_then(|millis| Utc.timestamp_millis_opt(millis).single())
}

fn parse_i64_metadata(metadata: &HashMap<String, String>, key: &str) -> Option<i64> {
    metadata
        .get(key)
        .and_then(|value| value.parse::<i64>().ok())
}

fn rfc3339_to_utc(value: Option<&str>) -> Option<DateTime<Utc>> {
    value
        .and_then(|raw| DateTime::parse_from_rfc3339(raw).ok())
        .map(|date| date.with_timezone(&Utc))
}

fn rfc3339_to_utc_optional(value: Option<&str>) -> Option<DateTime<Utc>> {
    rfc3339_to_utc(value)
}

#[derive(Debug, Serialize)]
struct AppleAuthClaims {
    iss: String,
    iat: i64,
    exp: i64,
    aud: String,
    bid: String,
}

#[derive(Debug, Deserialize)]
struct AppleJwsHeader {
    alg: String,
    #[serde(default)]
    x5c: Vec<String>,
}

#[derive(Debug, Serialize)]
struct GoogleServiceAccountClaims {
    iss: String,
    scope: String,
    aud: String,
    exp: i64,
    iat: i64,
}

#[derive(Debug, Deserialize)]
struct GoogleJwksResponse {
    keys: Vec<GoogleJwk>,
}

#[derive(Debug, Deserialize)]
struct GoogleJwk {
    kty: String,
    kid: String,
    n: String,
    e: String,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
struct GooglePushJwtClaims {
    aud: String,
    iss: String,
    sub: String,
    #[serde(default)]
    email: Option<String>,
    #[serde(default)]
    email_verified: Option<bool>,
    exp: u64,
    #[serde(default)]
    iat: Option<u64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppleTransactionLookupResponse {
    signed_transaction_info: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppleSignedTransactionPayload {
    transaction_id: Option<String>,
    original_transaction_id: Option<String>,
    product_id: Option<String>,
    bundle_id: Option<String>,
    purchase_date: Option<i64>,
    expires_date: Option<i64>,
    revocation_date: Option<i64>,
    environment: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GoogleOAuthTokenResponse {
    access_token: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleProductPurchaseResponse {
    product_id: Option<String>,
    purchase_state: Option<i32>,
    acknowledgement_state: Option<i32>,
    purchase_time_millis: Option<String>,
    #[serde(
        default,
        deserialize_with = "deserialize_optional_i64_from_string_or_number"
    )]
    quantity: Option<i64>,
    #[serde(
        default,
        deserialize_with = "deserialize_optional_i64_from_string_or_number"
    )]
    refundable_quantity: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleSubscriptionV2Response {
    subscription_state: Option<String>,
    acknowledgement_state: Option<String>,
    #[serde(default)]
    line_items: Vec<GoogleSubscriptionLineItem>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleSubscriptionLineItem {
    product_id: Option<String>,
    expiry_time: Option<String>,
    start_time: Option<String>,
    offer_details: Option<GoogleSubscriptionOfferDetails>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleSubscriptionOfferDetails {
    base_plan_id: Option<String>,
    offer_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppleServerNotificationEnvelope {
    signed_payload: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppleServerNotificationPayload {
    notification_type: String,
    #[serde(default)]
    subtype: Option<String>,
    #[serde(default)]
    notification_uuid: Option<String>,
    #[serde(default)]
    data: Option<AppleServerNotificationData>,
}

impl AppleServerNotificationPayload {
    fn event_name(&self) -> String {
        match self.subtype.as_deref() {
            Some(subtype) if !subtype.is_empty() => {
                format!("{}:{}", self.notification_type, subtype)
            }
            _ => self.notification_type.clone(),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppleServerNotificationData {
    #[serde(default)]
    signed_transaction_info: Option<String>,
    #[serde(default)]
    signed_renewal_info: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppleSignedRenewalInfoPayload {
    #[serde(default)]
    original_transaction_id: Option<String>,
    #[serde(default)]
    product_id: Option<String>,
    #[serde(default)]
    auto_renew_status: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GooglePubSubPushEnvelope {
    message: GooglePubSubMessage,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GooglePubSubMessage {
    data: String,
    #[serde(default)]
    message_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleDeveloperNotification {
    #[serde(default)]
    package_name: Option<String>,
    #[serde(default)]
    subscription_notification: Option<GoogleSubscriptionNotification>,
    #[serde(default)]
    one_time_product_notification: Option<GoogleOneTimeProductNotification>,
    #[serde(default)]
    voided_purchase_notification: Option<GoogleVoidedPurchaseNotification>,
    #[serde(default)]
    test_notification: Option<serde_json::Value>,
}

impl GoogleDeveloperNotification {
    fn event_name(&self) -> String {
        if let Some(notification) = self.subscription_notification.as_ref() {
            return format!(
                "subscription:{}",
                notification
                    .notification_type
                    .map(|value| value.to_string())
                    .unwrap_or_else(|| "unknown".into())
            );
        }
        if let Some(notification) = self.one_time_product_notification.as_ref() {
            return format!(
                "one_time:{}",
                notification
                    .notification_type
                    .map(|value| value.to_string())
                    .unwrap_or_else(|| "unknown".into())
            );
        }
        if self.voided_purchase_notification.is_some() {
            return "voided_purchase".into();
        }
        if self.test_notification.is_some() {
            return "test_notification".into();
        }
        "unknown".into()
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleSubscriptionNotification {
    #[serde(default)]
    notification_type: Option<i32>,
    #[serde(default)]
    purchase_token: Option<String>,
    #[serde(default)]
    subscription_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleOneTimeProductNotification {
    #[serde(default)]
    notification_type: Option<i32>,
    #[serde(default)]
    purchase_token: Option<String>,
    #[serde(default)]
    sku: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoogleVoidedPurchaseNotification {
    #[serde(default)]
    purchase_token: Option<String>,
    #[serde(default)]
    refund_type: Option<i32>,
}

fn deserialize_optional_i64_from_string_or_number<'de, D>(
    deserializer: D,
) -> Result<Option<i64>, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrNumber {
        Number(i64),
        String(String),
    }

    match Option::<StringOrNumber>::deserialize(deserializer)? {
        Some(StringOrNumber::Number(value)) => Ok(Some(value)),
        Some(StringOrNumber::String(value)) => {
            value.parse::<i64>().map(Some).map_err(de::Error::custom)
        }
        None => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::VecDeque;

    use openssl::{
        asn1::Asn1Time,
        ec::{EcGroup, EcKey},
        nid::Nid,
        pkey::{PKey, Private},
        rsa::Rsa,
        sign::Signer,
        x509::{
            extension::{BasicConstraints, KeyUsage},
            X509Builder, X509NameBuilder,
        },
    };

    use crate::repositories::InMemoryProductRepository;
    use crate::storage::{InMemoryStore, Store};
    use crate::webhooks::NoopNotifier;

    struct MockAppleVerifier {
        result: VerifiedApplePurchase,
    }

    #[async_trait]
    impl AppleStoreVerifier for MockAppleVerifier {
        async fn verify_purchase(
            &self,
            _config: &Config,
            _transaction_id: &str,
        ) -> ServiceResult<VerifiedApplePurchase> {
            Ok(self.result.clone())
        }
    }

    struct MockGoogleVerifier {
        one_time: Option<VerifiedGoogleOneTimePurchase>,
        one_time_sequence: Arc<parking_lot::Mutex<VecDeque<VerifiedGoogleOneTimePurchase>>>,
        subscription: Option<VerifiedGoogleSubscription>,
        acknowledged_products: Arc<parking_lot::Mutex<Vec<String>>>,
        acknowledged_subscriptions: Arc<parking_lot::Mutex<Vec<String>>>,
    }

    #[async_trait]
    impl GooglePlayVerifier for MockGoogleVerifier {
        async fn verify_one_time_purchase(
            &self,
            _config: &Config,
            _package_name: &str,
            _product_id: &str,
            _purchase_token: &str,
        ) -> ServiceResult<VerifiedGoogleOneTimePurchase> {
            if let Some(next) = self.one_time_sequence.lock().pop_front() {
                return Ok(next);
            }
            Ok(self.one_time.clone().expect("one_time result configured"))
        }

        async fn verify_subscription(
            &self,
            _config: &Config,
            _package_name: &str,
            _product_id: &str,
            _purchase_token: &str,
        ) -> ServiceResult<VerifiedGoogleSubscription> {
            Ok(self
                .subscription
                .clone()
                .expect("subscription result configured"))
        }

        async fn acknowledge_one_time_purchase(
            &self,
            _config: &Config,
            _package_name: &str,
            product_id: &str,
            purchase_token: &str,
        ) -> ServiceResult<()> {
            self.acknowledged_products
                .lock()
                .push(format!("{product_id}:{purchase_token}"));
            Ok(())
        }

        async fn acknowledge_subscription(
            &self,
            _config: &Config,
            _package_name: &str,
            product_id: &str,
            purchase_token: &str,
        ) -> ServiceResult<()> {
            self.acknowledged_subscriptions
                .lock()
                .push(format!("{product_id}:{purchase_token}"));
            Ok(())
        }
    }

    struct AllowAllAppleNotificationVerifier;

    #[async_trait]
    impl AppleNotificationVerifier for AllowAllAppleNotificationVerifier {
        async fn verify_signed_payload(&self, _signed_payload: &str) -> ServiceResult<()> {
            Ok(())
        }
    }

    struct AllowAllGoogleNotificationAuthVerifier;

    #[async_trait]
    impl GoogleNotificationAuthVerifier for AllowAllGoogleNotificationAuthVerifier {
        async fn verify_authorization(
            &self,
            _config: &Config,
            _authorization_header: &str,
        ) -> ServiceResult<()> {
            Ok(())
        }
    }

    fn base_config() -> Arc<Config> {
        let mut config = Config::default();
        config.x402.payment_address = "payment".into();
        config.x402.token_mint = must_get_asset("USDC")
            .metadata
            .solana_mint
            .clone()
            .unwrap_or_default();
        config.native_store.apple.bundle_id = "com.cedros.pay".into();
        config.native_store.google.package_name = "com.cedros.pay".into();
        config.native_store.google.push_service_account_email =
            "pubsub-push@cedros-pay.iam.gserviceaccount.com".into();
        config.native_store.google.push_audience =
            "https://pay.cedros.dev/paywall/v1/native-store/google/notifications".into();
        Arc::new(config)
    }

    fn native_store_product() -> Product {
        Product {
            id: "pro_monthly".into(),
            tenant_id: "tenant".into(),
            title: Some("Pro Monthly".into()),
            description: "Pro".into(),
            fiat_price: Some(Money::new(must_get_asset("USD"), 999)),
            active: true,
            subscription: Some(crate::models::SubscriptionConfig {
                billing_period: "month".into(),
                billing_interval: 1,
                trial_days: 0,
                stripe_price_id: None,
                allow_x402: false,
                grace_period_hours: 0,
            }),
            store_billing: Some(crate::models::StoreBillingConfig {
                kind: Some(StoreManagedProductKind::AutoRenewableSubscription),
                apple: Some(crate::models::AppleStoreProductConfig {
                    product_id: Some("com.cedros.pay.pro.monthly".into()),
                }),
                google: Some(crate::models::GooglePlayStoreProductConfig {
                    product_id: Some("com.cedros.pay.pro.monthly".into()),
                    package_name: Some("com.cedros.pay".into()),
                    base_plan_id: Some("monthly".into()),
                    offer_id: None,
                }),
            }),
            ..Product::default()
        }
    }

    fn fake_signed_payload<T: Serialize>(value: &T) -> String {
        let header = URL_SAFE_NO_PAD.encode(br#"{"alg":"ES256"}"#);
        let payload = URL_SAFE_NO_PAD
            .encode(serde_json::to_vec(value).expect("test payload should serialize"));
        format!("{header}.{payload}.sig")
    }

    fn one_time_native_store_product() -> Product {
        Product {
            id: "pro_unlock".into(),
            tenant_id: "tenant".into(),
            title: Some("Pro Unlock".into()),
            description: "Unlock".into(),
            fiat_price: Some(Money::new(must_get_asset("USD"), 499)),
            active: true,
            store_billing: Some(crate::models::StoreBillingConfig {
                kind: Some(StoreManagedProductKind::NonConsumable),
                apple: Some(crate::models::AppleStoreProductConfig {
                    product_id: Some("com.cedros.pay.unlock".into()),
                }),
                google: Some(crate::models::GooglePlayStoreProductConfig {
                    product_id: Some("com.cedros.pay.unlock".into()),
                    package_name: Some("com.cedros.pay".into()),
                    base_plan_id: None,
                    offer_id: None,
                }),
            }),
            ..Product::default()
        }
    }

    fn verified_google_one_time_purchase(
        purchase_token: &str,
        quantity: i64,
        refundable_quantity: i64,
        acknowledged: bool,
    ) -> VerifiedGoogleOneTimePurchase {
        VerifiedGoogleOneTimePurchase {
            purchase_token: purchase_token.into(),
            product_id: "com.cedros.pay.unlock".into(),
            package_name: "com.cedros.pay".into(),
            purchase_date: Some(Utc::now()),
            acknowledged,
            purchase_state: GoogleOneTimePurchaseState::Purchased,
            quantity,
            refundable_quantity,
        }
    }

    fn service_with_mocks(
        store: Arc<InMemoryStore>,
        repo: Arc<InMemoryProductRepository>,
        apple: Arc<dyn AppleStoreVerifier>,
        google: Arc<dyn GooglePlayVerifier>,
    ) -> NativeStoreService<InMemoryStore> {
        NativeStoreService::new_with_verifiers_and_notification_auth(
            base_config(),
            store,
            repo,
            Arc::new(NoopNotifier),
            None,
            apple,
            google,
            Arc::new(AllowAllAppleNotificationVerifier),
            Arc::new(AllowAllGoogleNotificationAuthVerifier),
        )
    }

    #[tokio::test]
    async fn verifies_apple_subscription_and_creates_entitlement() {
        let store = Arc::new(InMemoryStore::new());
        let product = native_store_product();
        let repo = Arc::new(InMemoryProductRepository::new(vec![product]));
        let service = service_with_mocks(
            store.clone(),
            repo,
            Arc::new(MockAppleVerifier {
                result: VerifiedApplePurchase {
                    transaction_id: "tx-1".into(),
                    original_transaction_id: "orig-1".into(),
                    product_id: "com.cedros.pay.pro.monthly".into(),
                    bundle_id: Some("com.cedros.pay".into()),
                    purchase_date: Utc::now(),
                    expires_date: Some(Utc::now() + chrono::Duration::days(30)),
                    environment: Some("Sandbox".into()),
                    revoked: false,
                },
            }),
            Arc::new(MockGoogleVerifier {
                one_time: Some(VerifiedGoogleOneTimePurchase {
                    purchase_token: "token-void-1".into(),
                    product_id: "com.cedros.pay.unlock".into(),
                    package_name: "com.cedros.pay".into(),
                    purchase_date: Some(Utc::now()),
                    acknowledged: true,
                    purchase_state: GoogleOneTimePurchaseState::Cancelled,
                    quantity: 1,
                    refundable_quantity: 0,
                }),
                one_time_sequence: Arc::new(parking_lot::Mutex::new(VecDeque::new())),
                subscription: None,
                acknowledged_products: Arc::new(parking_lot::Mutex::new(Vec::new())),
                acknowledged_subscriptions: Arc::new(parking_lot::Mutex::new(Vec::new())),
            }),
        );

        let result = service
            .verify_purchase(NativeStoreVerificationRequest {
                tenant_id: "tenant".into(),
                user_id: Some("user-1".into()),
                product_id: "pro_monthly".into(),
                method: PaymentMethod::AppleIap,
                store_product_id: "com.cedros.pay.pro.monthly".into(),
                transaction_id: Some("tx-1".into()),
                original_transaction_id: Some("orig-1".into()),
                purchase_token: None,
                package_name: None,
                metadata: HashMap::new(),
            })
            .await
            .unwrap();

        assert!(result.success);
        assert_eq!(result.method, "apple_iap");
        assert!(result.subscription_id.is_some());
    }

    #[tokio::test]
    async fn rejects_google_subscription_when_base_plan_does_not_match() {
        let store = Arc::new(InMemoryStore::new());
        let repo = Arc::new(InMemoryProductRepository::new(vec![native_store_product()]));
        let service = service_with_mocks(
            store,
            repo,
            Arc::new(MockAppleVerifier {
                result: VerifiedApplePurchase {
                    transaction_id: "unused".into(),
                    original_transaction_id: "unused".into(),
                    product_id: "unused".into(),
                    bundle_id: None,
                    purchase_date: Utc::now(),
                    expires_date: None,
                    environment: None,
                    revoked: false,
                },
            }),
            Arc::new(MockGoogleVerifier {
                one_time: None,
                one_time_sequence: Arc::new(parking_lot::Mutex::new(VecDeque::new())),
                subscription: Some(VerifiedGoogleSubscription {
                    purchase_token: "token-1".into(),
                    product_id: "com.cedros.pay.pro.monthly".into(),
                    package_name: "com.cedros.pay".into(),
                    start_date: Some(Utc::now()),
                    expires_date: Utc::now() + chrono::Duration::days(30),
                    state: GoogleSubscriptionState::Active,
                    base_plan_id: Some("annual".into()),
                    offer_id: None,
                    acknowledged: true,
                }),
                acknowledged_products: Arc::new(parking_lot::Mutex::new(Vec::new())),
                acknowledged_subscriptions: Arc::new(parking_lot::Mutex::new(Vec::new())),
            }),
        );

        let err = service
            .verify_purchase(NativeStoreVerificationRequest {
                tenant_id: "tenant".into(),
                user_id: Some("user-1".into()),
                product_id: "pro_monthly".into(),
                method: PaymentMethod::GooglePlayBilling,
                store_product_id: "com.cedros.pay.pro.monthly".into(),
                transaction_id: None,
                original_transaction_id: None,
                purchase_token: Some("token-1".into()),
                package_name: Some("com.cedros.pay".into()),
                metadata: HashMap::new(),
            })
            .await
            .unwrap_err();

        assert_eq!(err.code(), ErrorCode::VerificationFailed);
    }

    #[tokio::test]
    async fn apple_notification_marks_subscription_cancel_at_period_end() {
        let store = Arc::new(InMemoryStore::new());
        let repo = Arc::new(InMemoryProductRepository::new(vec![native_store_product()]));
        let service = service_with_mocks(
            store.clone(),
            repo,
            Arc::new(MockAppleVerifier {
                result: VerifiedApplePurchase {
                    transaction_id: "tx-apple-1".into(),
                    original_transaction_id: "orig-apple-1".into(),
                    product_id: "com.cedros.pay.pro.monthly".into(),
                    bundle_id: Some("com.cedros.pay".into()),
                    purchase_date: Utc::now(),
                    expires_date: Some(Utc::now() + chrono::Duration::days(30)),
                    environment: Some("Sandbox".into()),
                    revoked: false,
                },
            }),
            Arc::new(MockGoogleVerifier {
                one_time: Some(VerifiedGoogleOneTimePurchase {
                    purchase_token: "token-void-1".into(),
                    product_id: "com.cedros.pay.unlock".into(),
                    package_name: "com.cedros.pay".into(),
                    purchase_date: Some(Utc::now()),
                    acknowledged: true,
                    purchase_state: GoogleOneTimePurchaseState::Cancelled,
                    quantity: 1,
                    refundable_quantity: 0,
                }),
                one_time_sequence: Arc::new(parking_lot::Mutex::new(VecDeque::new())),
                subscription: None,
                acknowledged_products: Arc::new(parking_lot::Mutex::new(Vec::new())),
                acknowledged_subscriptions: Arc::new(parking_lot::Mutex::new(Vec::new())),
            }),
        );

        let transaction = fake_signed_payload(&serde_json::json!({
            "transactionId": "tx-apple-1",
            "originalTransactionId": "orig-apple-1",
            "productId": "com.cedros.pay.pro.monthly",
            "bundleId": "com.cedros.pay"
        }));
        let renewal = fake_signed_payload(&serde_json::json!({
            "originalTransactionId": "orig-apple-1",
            "productId": "com.cedros.pay.pro.monthly",
            "autoRenewStatus": 0
        }));
        let body = serde_json::json!({
            "signedPayload": fake_signed_payload(&serde_json::json!({
                "notificationType": "DID_CHANGE_RENEWAL_STATUS",
                "subtype": "AUTO_RENEW_DISABLED",
                "notificationUUID": "apple-notification-1",
                "data": {
                    "signedTransactionInfo": transaction,
                    "signedRenewalInfo": renewal
                }
            }))
        })
        .to_string();

        let result = service
            .handle_apple_server_notification("tenant", &body)
            .await
            .unwrap();

        assert!(result.success);
        let subscription = store
            .get_subscription_by_payment_signature("tenant", "apple-sub:orig-apple-1:pro_monthly")
            .await
            .unwrap()
            .expect("subscription should be created");
        assert!(subscription.cancel_at_period_end);
    }

    #[tokio::test]
    async fn google_rtdn_acknowledges_subscription_and_marks_cancel_at_period_end() {
        let store = Arc::new(InMemoryStore::new());
        let repo = Arc::new(InMemoryProductRepository::new(vec![native_store_product()]));
        let acknowledged_subscriptions = Arc::new(parking_lot::Mutex::new(Vec::new()));
        let service = service_with_mocks(
            store.clone(),
            repo,
            Arc::new(MockAppleVerifier {
                result: VerifiedApplePurchase {
                    transaction_id: "unused".into(),
                    original_transaction_id: "unused".into(),
                    product_id: "unused".into(),
                    bundle_id: None,
                    purchase_date: Utc::now(),
                    expires_date: None,
                    environment: None,
                    revoked: false,
                },
            }),
            Arc::new(MockGoogleVerifier {
                one_time: None,
                one_time_sequence: Arc::new(parking_lot::Mutex::new(VecDeque::new())),
                subscription: Some(VerifiedGoogleSubscription {
                    purchase_token: "token-google-1".into(),
                    product_id: "com.cedros.pay.pro.monthly".into(),
                    package_name: "com.cedros.pay".into(),
                    start_date: Some(Utc::now()),
                    expires_date: Utc::now() + chrono::Duration::days(30),
                    state: GoogleSubscriptionState::Active,
                    base_plan_id: Some("monthly".into()),
                    offer_id: None,
                    acknowledged: false,
                }),
                acknowledged_products: Arc::new(parking_lot::Mutex::new(Vec::new())),
                acknowledged_subscriptions: acknowledged_subscriptions.clone(),
            }),
        );

        let notification = serde_json::json!({
            "packageName": "com.cedros.pay",
            "subscriptionNotification": {
                "notificationType": 3,
                "purchaseToken": "token-google-1",
                "subscriptionId": "com.cedros.pay.pro.monthly"
            }
        });
        let body = serde_json::json!({
            "message": {
                "messageId": "google-message-1",
                "data": STANDARD.encode(notification.to_string())
            }
        })
        .to_string();

        let result = service
            .handle_google_rtdn("tenant", "Bearer test-token", &body)
            .await
            .unwrap();

        assert!(result.success);
        let subscription = store
            .get_subscription_by_payment_signature(
                "tenant",
                "google-sub:token-google-1:pro_monthly",
            )
            .await
            .unwrap()
            .expect("subscription should be created");
        assert!(subscription.cancel_at_period_end);
        assert_eq!(
            acknowledged_subscriptions.lock().as_slice(),
            ["com.cedros.pay.pro.monthly:token-google-1"]
        );
    }

    #[tokio::test]
    async fn apple_refund_notification_revokes_one_time_purchase() {
        let store = Arc::new(InMemoryStore::new());
        store
            .record_payment(crate::models::PaymentTransaction {
                signature: "apple-tx:tx-apple-unlock-1".into(),
                tenant_id: "tenant".into(),
                resource_id: "pro_unlock".into(),
                wallet: String::new(),
                user_id: Some("user-1".into()),
                amount: Money::new(must_get_asset("USD"), 499),
                created_at: Utc::now(),
                metadata: HashMap::new(),
            })
            .await
            .unwrap();
        let repo = Arc::new(InMemoryProductRepository::new(vec![
            one_time_native_store_product(),
        ]));
        let service = service_with_mocks(
            store.clone(),
            repo,
            Arc::new(MockAppleVerifier {
                result: VerifiedApplePurchase {
                    transaction_id: "unused".into(),
                    original_transaction_id: "unused".into(),
                    product_id: "unused".into(),
                    bundle_id: None,
                    purchase_date: Utc::now(),
                    expires_date: None,
                    environment: None,
                    revoked: false,
                },
            }),
            Arc::new(MockGoogleVerifier {
                one_time: None,
                one_time_sequence: Arc::new(parking_lot::Mutex::new(VecDeque::new())),
                subscription: None,
                acknowledged_products: Arc::new(parking_lot::Mutex::new(Vec::new())),
                acknowledged_subscriptions: Arc::new(parking_lot::Mutex::new(Vec::new())),
            }),
        );

        let transaction = fake_signed_payload(&serde_json::json!({
            "transactionId": "tx-apple-unlock-1",
            "originalTransactionId": "tx-apple-unlock-1",
            "productId": "com.cedros.pay.unlock",
            "bundleId": "com.cedros.pay"
        }));
        let body = serde_json::json!({
            "signedPayload": fake_signed_payload(&serde_json::json!({
                "notificationType": "REFUND",
                "notificationUUID": "apple-refund-1",
                "data": {
                    "signedTransactionInfo": transaction
                }
            }))
        })
        .to_string();

        let result = service
            .handle_apple_server_notification("tenant", &body)
            .await
            .unwrap();

        assert!(result.success);
        assert_eq!(result.product_id.as_deref(), Some("pro_unlock"));
        assert!(store
            .get_payment("tenant", "apple-tx:tx-apple-unlock-1")
            .await
            .unwrap()
            .is_none());
    }

    #[tokio::test]
    async fn google_voided_purchase_notification_revokes_one_time_purchase() {
        let store = Arc::new(InMemoryStore::new());
        store
            .record_payment(crate::models::PaymentTransaction {
                signature: "google-tx:token-void-1".into(),
                tenant_id: "tenant".into(),
                resource_id: "pro_unlock".into(),
                wallet: String::new(),
                user_id: Some("user-1".into()),
                amount: Money::new(must_get_asset("USD"), 499),
                created_at: Utc::now(),
                metadata: HashMap::new(),
            })
            .await
            .unwrap();
        let repo = Arc::new(InMemoryProductRepository::new(vec![
            one_time_native_store_product(),
        ]));
        let service = service_with_mocks(
            store.clone(),
            repo,
            Arc::new(MockAppleVerifier {
                result: VerifiedApplePurchase {
                    transaction_id: "unused".into(),
                    original_transaction_id: "unused".into(),
                    product_id: "unused".into(),
                    bundle_id: None,
                    purchase_date: Utc::now(),
                    expires_date: None,
                    environment: None,
                    revoked: false,
                },
            }),
            Arc::new(MockGoogleVerifier {
                one_time: Some(VerifiedGoogleOneTimePurchase {
                    purchase_token: "token-void-1".into(),
                    product_id: "com.cedros.pay.unlock".into(),
                    package_name: "com.cedros.pay".into(),
                    purchase_date: Some(Utc::now()),
                    acknowledged: true,
                    purchase_state: GoogleOneTimePurchaseState::Cancelled,
                    quantity: 1,
                    refundable_quantity: 0,
                }),
                one_time_sequence: Arc::new(parking_lot::Mutex::new(VecDeque::new())),
                subscription: None,
                acknowledged_products: Arc::new(parking_lot::Mutex::new(Vec::new())),
                acknowledged_subscriptions: Arc::new(parking_lot::Mutex::new(Vec::new())),
            }),
        );

        let notification = serde_json::json!({
            "packageName": "com.cedros.pay",
            "voidedPurchaseNotification": {
                "purchaseToken": "token-void-1"
            }
        });
        let body = serde_json::json!({
            "message": {
                "messageId": "google-voided-1",
                "data": STANDARD.encode(notification.to_string())
            }
        })
        .to_string();

        let result = service
            .handle_google_rtdn("tenant", "Bearer test-token", &body)
            .await
            .unwrap();

        assert!(result.success);
        assert_eq!(result.product_id.as_deref(), Some("pro_unlock"));
        assert!(store
            .get_payment("tenant", "google-tx:token-void-1")
            .await
            .unwrap()
            .is_none());
    }

    #[tokio::test]
    async fn google_multi_quantity_purchase_records_total_amount() {
        let store = Arc::new(InMemoryStore::new());
        let repo = Arc::new(InMemoryProductRepository::new(vec![
            one_time_native_store_product(),
        ]));
        let acknowledged_products = Arc::new(parking_lot::Mutex::new(Vec::new()));
        let service = service_with_mocks(
            store.clone(),
            repo,
            Arc::new(MockAppleVerifier {
                result: VerifiedApplePurchase {
                    transaction_id: "unused".into(),
                    original_transaction_id: "unused".into(),
                    product_id: "unused".into(),
                    bundle_id: None,
                    purchase_date: Utc::now(),
                    expires_date: None,
                    environment: None,
                    revoked: false,
                },
            }),
            Arc::new(MockGoogleVerifier {
                one_time: Some(verified_google_one_time_purchase(
                    "token-multi-1",
                    3,
                    3,
                    false,
                )),
                one_time_sequence: Arc::new(parking_lot::Mutex::new(VecDeque::new())),
                subscription: None,
                acknowledged_products: acknowledged_products.clone(),
                acknowledged_subscriptions: Arc::new(parking_lot::Mutex::new(Vec::new())),
            }),
        );

        let result = service
            .verify_purchase(NativeStoreVerificationRequest {
                tenant_id: "tenant".into(),
                user_id: Some("user-1".into()),
                product_id: "pro_unlock".into(),
                method: PaymentMethod::GooglePlayBilling,
                store_product_id: "com.cedros.pay.unlock".into(),
                transaction_id: None,
                original_transaction_id: None,
                purchase_token: Some("token-multi-1".into()),
                package_name: Some("com.cedros.pay".into()),
                metadata: HashMap::new(),
            })
            .await
            .unwrap();

        assert!(result.success);
        let payment = store
            .get_payment("tenant", "google-tx:token-multi-1")
            .await
            .unwrap()
            .expect("payment should be recorded");
        assert_eq!(payment.amount.atomic, 1497);
        assert_eq!(
            payment.metadata.get(NATIVE_STORE_TOTAL_QUANTITY_KEY),
            Some(&"3".to_string())
        );
        assert_eq!(
            payment.metadata.get(NATIVE_STORE_REFUNDABLE_QUANTITY_KEY),
            Some(&"3".to_string())
        );
        assert_eq!(
            payment.metadata.get(NATIVE_STORE_UNIT_AMOUNT_ATOMIC_KEY),
            Some(&"499".to_string())
        );
        assert_eq!(payment.user_id.as_deref(), Some("user-1"));
        assert_eq!(
            acknowledged_products.lock().as_slice(),
            ["com.cedros.pay.unlock:token-multi-1"]
        );
    }

    #[tokio::test]
    async fn google_partial_refund_repairs_legacy_multi_quantity_payment() {
        let store = Arc::new(InMemoryStore::new());
        store
            .record_payment(crate::models::PaymentTransaction {
                signature: "google-tx:token-partial-1".into(),
                tenant_id: "tenant".into(),
                resource_id: "pro_unlock".into(),
                wallet: String::new(),
                user_id: Some("user-1".into()),
                amount: Money::new(must_get_asset("USD"), 499),
                created_at: Utc::now(),
                metadata: HashMap::new(),
            })
            .await
            .unwrap();
        let repo = Arc::new(InMemoryProductRepository::new(vec![
            one_time_native_store_product(),
        ]));
        let service = service_with_mocks(
            store.clone(),
            repo,
            Arc::new(MockAppleVerifier {
                result: VerifiedApplePurchase {
                    transaction_id: "unused".into(),
                    original_transaction_id: "unused".into(),
                    product_id: "unused".into(),
                    bundle_id: None,
                    purchase_date: Utc::now(),
                    expires_date: None,
                    environment: None,
                    revoked: false,
                },
            }),
            Arc::new(MockGoogleVerifier {
                one_time: Some(verified_google_one_time_purchase(
                    "token-partial-1",
                    3,
                    2,
                    true,
                )),
                one_time_sequence: Arc::new(parking_lot::Mutex::new(VecDeque::new())),
                subscription: None,
                acknowledged_products: Arc::new(parking_lot::Mutex::new(Vec::new())),
                acknowledged_subscriptions: Arc::new(parking_lot::Mutex::new(Vec::new())),
            }),
        );

        let notification = serde_json::json!({
            "packageName": "com.cedros.pay",
            "voidedPurchaseNotification": {
                "purchaseToken": "token-partial-1",
                "refundType": 2
            }
        });
        let body = serde_json::json!({
            "message": {
                "messageId": "google-voided-partial-1",
                "data": STANDARD.encode(notification.to_string())
            }
        })
        .to_string();

        let result = service
            .handle_google_rtdn("tenant", "Bearer test-token", &body)
            .await
            .unwrap();

        assert!(result.success);
        assert_eq!(result.product_id.as_deref(), Some("pro_unlock"));
        let payment = store
            .get_payment("tenant", "google-tx:token-partial-1")
            .await
            .unwrap()
            .expect("payment should remain after partial refund");
        assert_eq!(payment.amount.atomic, 998);
        assert_eq!(
            payment.metadata.get(NATIVE_STORE_TOTAL_QUANTITY_KEY),
            Some(&"3".to_string())
        );
        assert_eq!(
            payment.metadata.get(NATIVE_STORE_REFUNDABLE_QUANTITY_KEY),
            Some(&"2".to_string())
        );
        assert_eq!(
            payment.metadata.get(NATIVE_STORE_LAST_REFUND_QUANTITY_KEY),
            Some(&"1".to_string())
        );
        assert_eq!(
            payment.metadata.get(NATIVE_STORE_LAST_REFUND_TYPE_KEY),
            Some(&"partial".to_string())
        );
    }

    #[test]
    fn apple_signed_jws_verification_accepts_valid_chain_and_rejects_tamper() {
        let (root_pem, signing_key, certificate_chain) = build_test_apple_certificate_chain();
        let signed = signed_es256_jws(
            &signing_key,
            &certificate_chain,
            &serde_json::json!({ "notificationType": "TEST" }),
        );
        verify_apple_signed_jws_with_root(&signed, &root_pem).unwrap();

        let (header, _, _) = split_jws(&signed, "test").unwrap();
        let tampered_payload =
            URL_SAFE_NO_PAD.encode(br#"{"notificationType":"TEST","tampered":true}"#);
        let tampered = format!("{header}.{tampered_payload}.sig");
        assert!(verify_apple_signed_jws_with_root(&tampered, &root_pem).is_err());
    }

    #[test]
    fn google_push_claim_validation_requires_matching_email_and_verified_flag() {
        let rsa = Rsa::generate(2048).unwrap();
        let private_key = PKey::from_rsa(rsa.clone()).unwrap();
        let encoding_key =
            EncodingKey::from_rsa_pem(&private_key.private_key_to_pem_pkcs8().unwrap()).unwrap();
        let n = URL_SAFE_NO_PAD.encode(rsa.n().to_vec());
        let e = URL_SAFE_NO_PAD.encode(rsa.e().to_vec());
        let decoding_key = DecodingKey::from_rsa_components(&n, &e).unwrap();

        let mut header = Header::new(Algorithm::RS256);
        header.kid = Some("kid-1".into());
        let token = jsonwebtoken::encode(
            &header,
            &serde_json::json!({
                "aud": "https://pay.cedros.dev/paywall/v1/native-store/google/notifications",
                "iss": "https://accounts.google.com",
                "sub": "1234567890",
                "email": "pubsub-push@cedros-pay.iam.gserviceaccount.com",
                "email_verified": true,
                "exp": (Utc::now() + chrono::Duration::minutes(5)).timestamp()
            }),
            &encoding_key,
        )
        .unwrap();

        let claims = verify_google_push_token_with_key(
            &token,
            &decoding_key,
            "https://pay.cedros.dev/paywall/v1/native-store/google/notifications",
        )
        .unwrap();
        validate_google_push_claims(&claims, "pubsub-push@cedros-pay.iam.gserviceaccount.com")
            .unwrap();
        assert!(validate_google_push_claims(&claims, "wrong@example.com").is_err());

        let unverified_claims = GooglePushJwtClaims {
            email_verified: Some(false),
            ..claims
        };
        assert!(validate_google_push_claims(
            &unverified_claims,
            "pubsub-push@cedros-pay.iam.gserviceaccount.com",
        )
        .is_err());
    }

    fn build_test_apple_certificate_chain() -> (String, PKey<Private>, Vec<String>) {
        let (root_key, root_cert) = build_test_certificate("Cedros Apple Root", None, None, true);
        let (intermediate_key, intermediate_cert) = build_test_certificate(
            "Cedros Apple Intermediate",
            Some(&root_cert),
            Some(&root_key),
            true,
        );
        let (leaf_key, leaf_cert) = build_test_certificate(
            "Cedros Apple Leaf",
            Some(&intermediate_cert),
            Some(&intermediate_key),
            false,
        );

        let root_pem = String::from_utf8(root_cert.to_pem().unwrap()).unwrap();
        let chain = vec![
            STANDARD.encode(leaf_cert.to_der().unwrap()),
            STANDARD.encode(intermediate_cert.to_der().unwrap()),
        ];
        (root_pem, leaf_key, chain)
    }

    fn build_test_certificate(
        common_name: &str,
        issuer_cert: Option<&openssl::x509::X509>,
        issuer_key: Option<&PKey<Private>>,
        is_ca: bool,
    ) -> (PKey<Private>, openssl::x509::X509) {
        let group = EcGroup::from_curve_name(Nid::X9_62_PRIME256V1).unwrap();
        let ec_key = EcKey::generate(&group).unwrap();
        let key = PKey::from_ec_key(ec_key).unwrap();

        let mut name = X509NameBuilder::new().unwrap();
        name.append_entry_by_text("CN", common_name).unwrap();
        let name = name.build();

        let mut builder = X509Builder::new().unwrap();
        builder.set_version(2).unwrap();
        builder.set_subject_name(&name).unwrap();
        builder
            .set_issuer_name(
                issuer_cert
                    .map(|certificate| certificate.subject_name())
                    .unwrap_or(name.as_ref()),
            )
            .unwrap();
        builder.set_pubkey(&key).unwrap();
        builder
            .set_not_before(Asn1Time::days_from_now(0).unwrap().as_ref())
            .unwrap();
        builder
            .set_not_after(Asn1Time::days_from_now(30).unwrap().as_ref())
            .unwrap();
        if is_ca {
            builder
                .append_extension(BasicConstraints::new().critical().ca().build().unwrap())
                .unwrap();
            builder
                .append_extension(
                    KeyUsage::new()
                        .critical()
                        .key_cert_sign()
                        .crl_sign()
                        .build()
                        .unwrap(),
                )
                .unwrap();
        } else {
            builder
                .append_extension(BasicConstraints::new().critical().build().unwrap())
                .unwrap();
            builder
                .append_extension(
                    KeyUsage::new()
                        .critical()
                        .digital_signature()
                        .build()
                        .unwrap(),
                )
                .unwrap();
        }
        builder
            .sign(issuer_key.unwrap_or(&key), MessageDigest::sha256())
            .unwrap();

        (key, builder.build())
    }

    fn signed_es256_jws(
        signing_key: &PKey<Private>,
        certificate_chain: &[String],
        payload: &serde_json::Value,
    ) -> String {
        let header = serde_json::json!({
            "alg": "ES256",
            "x5c": certificate_chain,
        });
        let header_b64 = URL_SAFE_NO_PAD.encode(serde_json::to_vec(&header).unwrap());
        let payload_b64 = URL_SAFE_NO_PAD.encode(serde_json::to_vec(payload).unwrap());
        let signing_input = format!("{header_b64}.{payload_b64}");
        let mut signer = Signer::new(MessageDigest::sha256(), signing_key).unwrap();
        signer.update(signing_input.as_bytes()).unwrap();
        let der_signature = signer.sign_to_vec().unwrap();
        let signature = EcdsaSig::from_der(&der_signature).unwrap();

        let mut raw_signature = vec![0u8; 64];
        let r = signature.r().to_vec();
        let s = signature.s().to_vec();
        raw_signature[32 - r.len()..32].copy_from_slice(&r);
        raw_signature[64 - s.len()..64].copy_from_slice(&s);
        let signature_b64 = URL_SAFE_NO_PAD.encode(raw_signature);

        format!("{signing_input}.{signature_b64}")
    }
}
