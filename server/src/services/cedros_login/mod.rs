//! Cedros Login client service
//!
//! Provides JWT validation via RS256/JWKS endpoint, wallet-to-user lookup,
//! and credits payment operations (balance check, hold/capture/release).
//! Used to resolve user_id for payment tracking and process credits payments.

use parking_lot::RwLock;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};

/// JWKS cache TTL (5 minutes)
const JWKS_CACHE_TTL: Duration = Duration::from_secs(300);

/// Error type for cedros-login operations
#[derive(Debug, thiserror::Error)]
pub enum CedrosLoginError {
    #[error("HTTP request failed: {0}")]
    Http(String),
    #[error("JWT validation failed: {0}")]
    JwtValidation(String),
    #[error("JWKS fetch failed: {0}")]
    JwksFetch(String),
    #[error("Key not found: {0}")]
    KeyNotFound(String),
    #[error("Service not configured")]
    NotConfigured,
    #[error("Insufficient credits: required {required}, available {available}")]
    InsufficientCredits { required: i64, available: i64 },
    #[error("Hold not found: {0}")]
    HoldNotFound(String),
    #[error("Hold already captured or released: {0}")]
    HoldAlreadyProcessed(String),
}

/// Wallet lookup response from cedros-login
#[derive(Debug, Clone, Deserialize)]
pub struct WalletLookupResponse {
    /// User ID (null if wallet not linked to any user)
    pub user_id: Option<String>,
    /// The wallet address that was looked up
    pub wallet_address: String,
}

/// Credits balance response from cedros-login
#[derive(Debug, Clone, Deserialize)]
pub struct CreditsBalance {
    /// User ID
    pub user_id: String,
    /// Available balance in atomic units (e.g., lamports for SOL)
    pub available: i64,
    /// Total held amount in atomic units
    pub held: i64,
    /// Currency/token symbol (e.g., "SOL")
    pub currency: String,
}

/// Request to create a credits hold (matches cedros-login camelCase API)
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateHoldRequest {
    /// Amount in lamports (atomic units)
    pub amount_lamports: i64,
    /// Currency code (e.g., "SOL", "USDC")
    pub currency: String,
    /// Idempotency key to prevent duplicate holds
    pub idempotency_key: String,
    /// Hold duration in minutes (default 15, max 60)
    pub ttl_minutes: i64,
    /// Type of reference (e.g., "order", "cart")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reference_type: Option<String>,
    /// ID of the referenced entity
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reference_id: Option<String>,
    /// Optional metadata
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

/// Response from creating a credits hold (matches cedros-login camelCase API)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HoldResponse {
    /// Unique hold ID for capture/release
    pub hold_id: String,
    /// Whether this is a new hold (false = idempotent return of existing)
    pub is_new: bool,
    /// Amount held in lamports
    pub amount_lamports: i64,
    /// Hold expiration timestamp
    pub expires_at: String,
    /// Currency
    pub currency: String,
}

/// JWT claims from cedros-login tokens
#[derive(Debug, Clone, Deserialize)]
pub struct CedrosLoginClaims {
    /// Subject (user ID)
    pub sub: String,
    /// Session ID
    #[serde(default)]
    pub sid: Option<String>,
    /// Expiration time
    pub exp: u64,
    /// Issued at
    #[serde(default)]
    pub iat: Option<u64>,
    /// Issuer
    #[serde(default)]
    pub iss: Option<String>,
    /// Audience
    #[serde(default)]
    pub aud: Option<String>,
    /// Active organization ID
    #[serde(default)]
    pub org_id: Option<String>,
    /// User's role in active organization (owner/admin/member/viewer)
    #[serde(default)]
    pub role: Option<String>,
    /// System admin flag - grants access to all admin endpoints
    #[serde(default)]
    pub is_system_admin: Option<bool>,
}

impl CedrosLoginClaims {
    /// Check if user has system admin privileges
    pub fn is_admin(&self) -> bool {
        self.is_system_admin.unwrap_or(false)
    }
}

/// JWKS (JSON Web Key Set) response
#[derive(Debug, Clone, Deserialize)]
struct JwksResponse {
    keys: Vec<Jwk>,
}

/// Individual JWK (JSON Web Key)
#[derive(Debug, Clone, Deserialize)]
struct Jwk {
    /// Key type (RSA)
    kty: String,
    /// Key ID
    kid: String,
    /// Algorithm (RS256) - part of JWKS spec, not directly used
    #[serde(default)]
    #[serde(rename = "alg")]
    _alg: Option<String>,
    /// RSA modulus (base64url)
    n: String,
    /// RSA exponent (base64url)
    e: String,
}

/// Cached JWKS with expiration
struct CachedJwks {
    keys: HashMap<String, DecodingKey>,
    fetched_at: Instant,
}

/// Cedros Login client for JWT validation and wallet lookup
pub struct CedrosLoginClient {
    client: Client,
    base_url: String,
    api_key: String,
    jwks_cache: Arc<RwLock<Option<CachedJwks>>>,
    expected_issuer: Option<String>,
    expected_audience: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
struct StripeCustomerLookupResponse {
    pub user_id: Option<String>,
    #[allow(dead_code)]
    pub stripe_customer_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StripeCustomerLinkRequest {
    pub user_id: String,
}

impl std::fmt::Debug for CedrosLoginClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CedrosLoginClient")
            .field("base_url", &self.base_url)
            .field("api_key", &"[REDACTED]")
            .field("expected_issuer", &self.expected_issuer)
            .field("expected_audience", &self.expected_audience)
            .finish()
    }
}

impl CedrosLoginClient {
    /// Create a new cedros-login client
    ///
    /// # Arguments
    /// * `base_url` - Base URL of cedros-login service (e.g., "https://login.example.com")
    /// * `api_key` - Admin API key for service-to-service authentication
    /// * `timeout` - HTTP request timeout
    /// * `expected_issuer` - Expected JWT issuer (optional)
    /// * `expected_audience` - Expected JWT audience (optional)
    pub fn new(
        base_url: String,
        api_key: String,
        timeout: Duration,
        expected_issuer: Option<String>,
        expected_audience: Option<String>,
    ) -> Result<Self, String> {
        let client = Client::builder()
            .timeout(timeout)
            .build()
            .map_err(|e| format!("cedros-login http client: {}", e))?;

        Ok(Self {
            client,
            base_url: base_url.trim_end_matches('/').to_string(),
            api_key,
            jwks_cache: Arc::new(RwLock::new(None)),
            expected_issuer,
            expected_audience,
        })
    }

    fn jwt_validation(&self) -> Validation {
        let mut validation = Validation::new(Algorithm::RS256);
        validation.set_required_spec_claims(&["sub", "exp"]);

        if let Some(ref issuer) = self.expected_issuer {
            if !issuer.is_empty() {
                validation.set_issuer(&[issuer.as_str()]);
            }
        }

        if let Some(ref audience) = self.expected_audience {
            if !audience.is_empty() {
                validation.set_audience(&[audience.as_str()]);
            }
        }

        validation
    }

    /// Look up user ID by wallet address
    ///
    /// Returns None if the wallet is not linked to any user account.
    pub async fn lookup_user_by_wallet(
        &self,
        wallet_address: &str,
    ) -> Result<Option<String>, CedrosLoginError> {
        let url = format!("{}/users/by-wallet/{}", self.base_url, wallet_address);

        let response = self
            .client
            .get(&url)
            .header("X-Admin-Api-Key", &self.api_key)
            .send()
            .await
            .map_err(|e| CedrosLoginError::Http(e.to_string()))?;

        let status = response.status();

        // 404 means wallet not found (unlinked) - return None
        if status == reqwest::StatusCode::NOT_FOUND {
            return Ok(None);
        }

        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());
            return Err(CedrosLoginError::Http(format!(
                "wallet lookup failed ({}): {}",
                status, error_text
            )));
        }

        let lookup: WalletLookupResponse = response
            .json()
            .await
            .map_err(|e| CedrosLoginError::Http(format!("invalid response: {}", e)))?;

        Ok(lookup.user_id)
    }

    /// Look up user ID by Stripe customer ID
    ///
    /// Returns None if the customer is not linked to any user account.
    pub async fn lookup_user_by_stripe_customer(
        &self,
        stripe_customer_id: &str,
    ) -> Result<Option<String>, CedrosLoginError> {
        let url = format!(
            "{}/users/by-stripe-customer/{}",
            self.base_url, stripe_customer_id
        );

        let response = self
            .client
            .get(&url)
            .header("X-Admin-Api-Key", &self.api_key)
            .send()
            .await
            .map_err(|e| CedrosLoginError::Http(e.to_string()))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());
            return Err(CedrosLoginError::Http(format!(
                "stripe customer lookup failed ({}): {}",
                status, error_text
            )));
        }

        let parsed: StripeCustomerLookupResponse = response.json().await.map_err(|e| {
            CedrosLoginError::Http(format!("invalid stripe customer response: {}", e))
        })?;
        Ok(parsed.user_id)
    }

    /// Link a Stripe customer ID to a user account.
    pub async fn link_stripe_customer(
        &self,
        stripe_customer_id: &str,
        user_id: &str,
    ) -> Result<(), CedrosLoginError> {
        let url = format!(
            "{}/users/by-stripe-customer/{}/link",
            self.base_url, stripe_customer_id
        );

        let body = StripeCustomerLinkRequest {
            user_id: user_id.to_string(),
        };

        let response = self
            .client
            .post(&url)
            .header("X-Admin-Api-Key", &self.api_key)
            .json(&body)
            .send()
            .await
            .map_err(|e| CedrosLoginError::Http(e.to_string()))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());
            return Err(CedrosLoginError::Http(format!(
                "stripe customer link failed ({}): {}",
                status, error_text
            )));
        }

        Ok(())
    }

    /// Validate a JWT and extract claims
    ///
    /// Validates the JWT signature using RS256 with keys from the JWKS endpoint.
    pub async fn validate_jwt(&self, token: &str) -> Result<CedrosLoginClaims, CedrosLoginError> {
        // Decode header to get key ID
        let header = decode_header(token)
            .map_err(|e| CedrosLoginError::JwtValidation(format!("invalid header: {}", e)))?;

        let kid = header
            .kid
            .ok_or_else(|| CedrosLoginError::JwtValidation("missing kid in JWT header".into()))?;

        // Get decoding key (refreshes JWKS cache if needed)
        let decoding_key = self.get_decoding_key(&kid).await?;

        let token_data = decode::<CedrosLoginClaims>(token, &decoding_key, &self.jwt_validation())
            .map_err(|e| CedrosLoginError::JwtValidation(e.to_string()))?;

        Ok(token_data.claims)
    }

    /// Extract user_id from Bearer token in Authorization header value
    ///
    /// Returns None if token is invalid or expired (fails silently for optional auth).
    pub async fn extract_user_id_from_auth_header(&self, auth_header: &str) -> Option<String> {
        const BEARER_PREFIX: &str = "Bearer ";

        if !auth_header.starts_with(BEARER_PREFIX) {
            return None;
        }

        let token = &auth_header[BEARER_PREFIX.len()..];

        match self.validate_jwt(token).await {
            Ok(claims) => Some(claims.sub),
            Err(e) => {
                tracing::debug!(error = %e, "JWT validation failed for user_id extraction");
                None
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Credits Payment Methods (hold/capture/release flow)
    // Paths match cedros-login router:
    //   POST /credits/hold/{user_id}
    //   POST /credits/capture/{hold_id}
    //   POST /credits/release/{hold_id}
    // ─────────────────────────────────────────────────────────────────────────

    /// Check credits balance for a user
    ///
    /// NOTE: cedros-login balance endpoint uses authenticated user context,
    /// not a user_id path param. This uses the admin API key.
    pub async fn check_balance(&self, user_id: &str) -> Result<CreditsBalance, CedrosLoginError> {
        // cedros-login admin endpoint for getting user credits is:
        // GET /admin/users/{user_id}/credits
        let url = format!("{}/admin/users/{}/credits", self.base_url, user_id);

        let response = self
            .client
            .get(&url)
            .header("X-Admin-Api-Key", &self.api_key)
            .send()
            .await
            .map_err(|e| CedrosLoginError::Http(e.to_string()))?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());
            return Err(CedrosLoginError::Http(format!(
                "balance check failed ({}): {}",
                status, error_text
            )));
        }

        response
            .json()
            .await
            .map_err(|e| CedrosLoginError::Http(format!("invalid balance response: {}", e)))
    }

    /// Create a hold on user's credits
    ///
    /// Reserves the specified amount from the user's available balance.
    /// The hold must be captured or released within the expiration window.
    ///
    /// # Arguments
    /// * `user_id` - User ID to hold credits from
    /// * `amount` - Amount in atomic units (lamports) to hold
    /// * `currency` - Currency code (e.g., "SOL", "USDC")
    /// * `idempotency_key` - Idempotency key for dedup
    /// * `reference_type` - Type of reference (e.g., "order", "cart")
    /// * `reference_id` - ID of referenced entity
    pub async fn create_hold(
        &self,
        user_id: &str,
        amount: i64,
        currency: &str,
        idempotency_key: &str,
        reference_type: Option<&str>,
        reference_id: Option<&str>,
    ) -> Result<HoldResponse, CedrosLoginError> {
        // cedros-login route: POST /credits/hold/{user_id}
        let url = format!("{}/credits/hold/{}", self.base_url, user_id);

        let request = CreateHoldRequest {
            amount_lamports: amount,
            currency: currency.to_string(),
            idempotency_key: idempotency_key.to_string(),
            ttl_minutes: 15,
            reference_type: reference_type.map(String::from),
            reference_id: reference_id.map(String::from),
            metadata: None,
        };

        let response = self
            .client
            .post(&url)
            .header("X-Admin-Api-Key", &self.api_key)
            .json(&request)
            .send()
            .await
            .map_err(|e| CedrosLoginError::Http(e.to_string()))?;

        let status = response.status();

        // Handle insufficient balance
        if status == reqwest::StatusCode::PAYMENT_REQUIRED
            || status == reqwest::StatusCode::UNPROCESSABLE_ENTITY
        {
            return Err(CedrosLoginError::InsufficientCredits {
                required: amount,
                available: 0,
            });
        }

        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());
            return Err(CedrosLoginError::Http(format!(
                "create hold failed ({}): {}",
                status, error_text
            )));
        }

        response
            .json()
            .await
            .map_err(|e| CedrosLoginError::Http(format!("invalid hold response: {}", e)))
    }

    /// Capture a credits hold
    ///
    /// Permanently deducts the held amount from the user's balance.
    /// Call this when payment fulfillment is complete.
    pub async fn capture_hold(&self, hold_id: &str) -> Result<(), CedrosLoginError> {
        // cedros-login route: POST /credits/capture/{hold_id}
        let url = format!("{}/credits/capture/{}", self.base_url, hold_id);

        let response = self
            .client
            .post(&url)
            .header("X-Admin-Api-Key", &self.api_key)
            .send()
            .await
            .map_err(|e| CedrosLoginError::Http(e.to_string()))?;

        let status = response.status();

        if status == reqwest::StatusCode::NOT_FOUND {
            return Err(CedrosLoginError::HoldNotFound(hold_id.to_string()));
        }

        if status == reqwest::StatusCode::CONFLICT {
            return Err(CedrosLoginError::HoldAlreadyProcessed(hold_id.to_string()));
        }

        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());
            return Err(CedrosLoginError::Http(format!(
                "capture hold failed ({}): {}",
                status, error_text
            )));
        }

        Ok(())
    }

    /// Release a credits hold
    ///
    /// Returns the held amount to the user's available balance.
    /// Call this when payment is cancelled or fails.
    pub async fn release_hold(&self, hold_id: &str) -> Result<(), CedrosLoginError> {
        // cedros-login route: POST /credits/release/{hold_id}
        let url = format!("{}/credits/release/{}", self.base_url, hold_id);

        let response = self
            .client
            .post(&url)
            .header("X-Admin-Api-Key", &self.api_key)
            .send()
            .await
            .map_err(|e| CedrosLoginError::Http(e.to_string()))?;

        let status = response.status();

        if status == reqwest::StatusCode::NOT_FOUND {
            return Err(CedrosLoginError::HoldNotFound(hold_id.to_string()));
        }

        if status == reqwest::StatusCode::CONFLICT {
            return Err(CedrosLoginError::HoldAlreadyProcessed(hold_id.to_string()));
        }

        if !status.is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());
            return Err(CedrosLoginError::Http(format!(
                "release hold failed ({}): {}",
                status, error_text
            )));
        }

        Ok(())
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal JWKS helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// Get a decoding key by key ID, refreshing the JWKS cache if needed
    async fn get_decoding_key(&self, kid: &str) -> Result<DecodingKey, CedrosLoginError> {
        // Check cache first
        {
            let cache = self.jwks_cache.read();
            if let Some(cached) = cache.as_ref() {
                if cached.fetched_at.elapsed() < JWKS_CACHE_TTL {
                    if let Some(key) = cached.keys.get(kid) {
                        return Ok(key.clone());
                    }
                }
            }
        }

        // Refresh cache
        self.refresh_jwks_cache().await?;

        // Try again after refresh
        let cache = self.jwks_cache.read();
        if let Some(cached) = cache.as_ref() {
            if let Some(key) = cached.keys.get(kid) {
                return Ok(key.clone());
            }
        }

        Err(CedrosLoginError::KeyNotFound(format!(
            "key '{}' not found in JWKS",
            kid
        )))
    }

    /// Refresh the JWKS cache
    async fn refresh_jwks_cache(&self) -> Result<(), CedrosLoginError> {
        let url = format!("{}/.well-known/jwks.json", self.base_url);

        let response = self
            .client
            .get(&url)
            .send()
            .await
            .map_err(|e| CedrosLoginError::JwksFetch(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());
            return Err(CedrosLoginError::JwksFetch(format!(
                "JWKS fetch failed: {}",
                error_text
            )));
        }

        let jwks: JwksResponse = response
            .json()
            .await
            .map_err(|e| CedrosLoginError::JwksFetch(format!("invalid JWKS: {}", e)))?;

        // Convert JWKs to decoding keys
        let mut keys = HashMap::new();
        for jwk in jwks.keys {
            if jwk.kty != "RSA" {
                continue;
            }

            match DecodingKey::from_rsa_components(&jwk.n, &jwk.e) {
                Ok(key) => {
                    keys.insert(jwk.kid, key);
                }
                Err(e) => {
                    tracing::warn!(kid = %jwk.kid, error = %e, "Failed to parse JWK");
                }
            }
        }

        // Update cache
        let mut cache = self.jwks_cache.write();
        *cache = Some(CachedJwks {
            keys,
            fetched_at: Instant::now(),
        });

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wallet_lookup_response_deserialize() {
        let json =
            r#"{"user_id": "123e4567-e89b-12d3-a456-426614174000", "wallet_address": "ABC123"}"#;
        let response: WalletLookupResponse = serde_json::from_str(json).unwrap();
        assert_eq!(
            response.user_id,
            Some("123e4567-e89b-12d3-a456-426614174000".to_string())
        );
        assert_eq!(response.wallet_address, "ABC123");
    }

    #[test]
    fn test_wallet_lookup_response_null_user() {
        let json = r#"{"user_id": null, "wallet_address": "ABC123"}"#;
        let response: WalletLookupResponse = serde_json::from_str(json).unwrap();
        assert!(response.user_id.is_none());
    }

    #[test]
    fn test_claims_deserialize() {
        let json = r#"{"sub": "user-123", "exp": 1234567890, "iss": "cedros-login"}"#;
        let claims: CedrosLoginClaims = serde_json::from_str(json).unwrap();
        assert_eq!(claims.sub, "user-123");
        assert_eq!(claims.iss, Some("cedros-login".to_string()));
    }

    #[test]
    fn test_credits_balance_deserialize() {
        let json = r#"{"user_id": "user-123", "available": 1000000000, "held": 50000000, "currency": "SOL"}"#;
        let balance: CreditsBalance = serde_json::from_str(json).unwrap();
        assert_eq!(balance.user_id, "user-123");
        assert_eq!(balance.available, 1_000_000_000);
        assert_eq!(balance.held, 50_000_000);
        assert_eq!(balance.currency, "SOL");
    }

    #[test]
    fn test_hold_response_deserialize() {
        let json = r#"{
            "holdId": "550e8400-e29b-41d4-a716-446655440000",
            "isNew": true,
            "amountLamports": 100000000,
            "expiresAt": "2024-01-01T01:00:00Z",
            "currency": "SOL"
        }"#;
        let hold: HoldResponse = serde_json::from_str(json).unwrap();
        assert_eq!(hold.hold_id, "550e8400-e29b-41d4-a716-446655440000");
        assert!(hold.is_new);
        assert_eq!(hold.amount_lamports, 100_000_000);
        assert_eq!(hold.currency, "SOL");
    }

    #[test]
    fn test_create_hold_request_serialize_camel_case() {
        let request = CreateHoldRequest {
            amount_lamports: 100_000_000,
            currency: "SOL".to_string(),
            idempotency_key: "order:test-123".to_string(),
            ttl_minutes: 15,
            reference_type: Some("order".to_string()),
            reference_id: None,
            metadata: None,
        };
        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("\"amountLamports\":100000000"));
        assert!(json.contains("\"idempotencyKey\":\"order:test-123\""));
        assert!(json.contains("\"ttlMinutes\":15"));
        assert!(json.contains("\"referenceType\":\"order\""));
    }

    #[test]
    fn test_jwt_validation_uses_rs256() {
        let client = CedrosLoginClient::new(
            "https://login.example.com".to_string(),
            "secret".to_string(),
            Duration::from_secs(5),
            Some("cedros-login".to_string()),
            Some("cedros-pay".to_string()),
        )
        .expect("client");

        let validation = client.jwt_validation();
        assert_eq!(validation.algorithms, vec![Algorithm::RS256]);
        assert!(validation.iss.is_some());
        assert!(validation.aud.is_some());
    }
}
