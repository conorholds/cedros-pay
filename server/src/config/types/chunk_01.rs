/// Default retention period: 90 days (2160 hours) per spec 08-storage.md line 398
fn default_archival_retention_period() -> Duration {
    Duration::from_secs(90 * 24 * 60 * 60) // 90 days
}

/// Default archival run interval: 24 hours per spec 08-storage.md line 399
fn default_archival_run_interval() -> Duration {
    Duration::from_secs(24 * 60 * 60) // 24 hours
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum ProductSource {
    /// In-memory (for testing only)
    Memory,
    /// PostgreSQL database (production)
    #[default]
    Postgres,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum CouponSource {
    /// In-memory (for testing only)
    Memory,
    /// PostgreSQL database (production)
    #[default]
    Postgres,
    /// Coupons disabled
    Disabled,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PaywallResource {
    #[serde(default)]
    pub resource_id: String,
    #[serde(default)]
    pub tenant_id: Option<String>,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub fiat_amount_cents: Option<i64>,
    #[serde(default)]
    pub fiat_currency: Option<String>,
    #[serde(default)]
    pub stripe_price_id: Option<String>,
    #[serde(default)]
    pub crypto_atomic_amount: Option<i64>,
    #[serde(default)]
    pub crypto_token: Option<String>,
    #[serde(default)]
    pub crypto_account: Option<String>,
    #[serde(default)]
    pub memo_template: Option<String>,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaywallConfig {
    #[serde(default = "default_quote_ttl")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub quote_ttl: Duration,
    #[serde(default)]
    pub product_source: Option<ProductSource>,
    #[serde(default = "default_product_cache_ttl")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub product_cache_ttl: Duration,
    #[serde(default)]
    pub rounding_mode: String,
    #[serde(default)]
    pub postgres_url: Option<String>,
    #[serde(default, deserialize_with = "deserialize_resources")]
    pub resources: Vec<PaywallResource>,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CouponConfig {
    #[serde(default)]
    pub coupon_source: Option<CouponSource>,
    #[serde(default = "default_coupon_cache_ttl")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub cache_ttl: Duration,
    #[serde(default)]
    pub postgres_url: Option<String>,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionsConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_subscription_backend")]
    pub backend: StorageBackend,
    #[serde(default)]
    pub postgres_url: Option<String>,
    #[serde(default = "default_grace_period_hours")]
    pub grace_period_hours: u32,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    #[serde(default = "default_retry_max_attempts")]
    pub max_attempts: u32,
    #[serde(default = "default_retry_initial_interval")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub initial_interval: Duration,
    #[serde(default = "default_retry_max_interval")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub max_interval: Duration,
    #[serde(default = "default_retry_multiplier")]
    pub multiplier: f64,
    #[serde(default = "default_retry_timeout")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub timeout: Duration,
    #[serde(default = "default_retry_enabled")]
    pub enabled: bool,
    /// Jitter factor (0.0-1.0) to randomize retry intervals.
    /// Helps prevent thundering herd when multiple webhooks fail simultaneously.
    /// A value of 0.2 means ±20% variance in retry intervals.
    #[serde(default = "default_retry_jitter")]
    pub jitter: f64,
}

#[serde_as]
#[derive(Clone, Serialize, Deserialize)]
pub struct CallbacksConfig {
    #[serde(default)]
    pub payment_success_url: Option<String>,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    #[serde(default = "default_callback_timeout")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub timeout: Duration,
    #[serde(default)]
    pub retry: RetryConfig,
    #[serde(default)]
    pub dlq_enabled: bool,
    #[serde(default)]
    pub dlq_path: Option<String>,
    #[serde(default)]
    pub hmac_secret: Option<String>,
    /// Custom body template for payment webhooks.
    /// Uses Go-style template syntax: {{.ResourceID}}, {{.Method}}, {{.Wallet}}, etc.
    /// If not set, uses default JSON payload format.
    #[serde(default)]
    pub body_template: Option<String>,
}

// SEC-001d: Custom Debug implementation to prevent HMAC secret exposure in logs
impl std::fmt::Debug for CallbacksConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CallbacksConfig")
            .field("payment_success_url", &self.payment_success_url)
            .field("headers", &self.headers)
            .field("timeout", &self.timeout)
            .field("retry", &self.retry)
            .field("dlq_enabled", &self.dlq_enabled)
            .field("dlq_path", &self.dlq_path)
            .field(
                "hmac_secret",
                &self.hmac_secret.as_ref().map(|_| "[REDACTED]"),
            )
            .field("body_template", &self.body_template)
            .finish()
    }
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringConfig {
    #[serde(default)]
    pub low_balance_alert_url: Option<String>,
    #[serde(default = "default_low_balance_threshold")]
    pub low_balance_threshold: f64,
    #[serde(default = "default_monitoring_interval")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub check_interval: Duration,
    #[serde(default = "default_monitoring_timeout")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub timeout: Duration,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    /// Custom body template for webhook alerts.
    /// Uses Go-style template syntax: {{.Wallet}}, {{.Balance}}, {{.Threshold}}, {{.Timestamp}}
    /// If not set, defaults to Discord webhook format.
    #[serde(default)]
    pub body_template: Option<String>,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitSetting {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub limit: u32,
    #[serde(default = "default_rate_limit_window")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub window: Duration,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RateLimitConfig {
    #[serde(default)]
    pub global: RateLimitSetting,
    #[serde(default)]
    pub per_wallet: RateLimitSetting,
    #[serde(default)]
    pub per_ip: RateLimitSetting,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum ApiKeyTier {
    #[default]
    Free,
    Pro,
    Enterprise,
    Partner,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ApiKeyEntry {
    pub key: String,
    #[serde(default)]
    pub tier: ApiKeyTier,
    /// Tenant allowlist for this API key.
    ///
    /// Best practice: bind a credential to one or more tenants to prevent cross-tenant access.
    /// If empty, the key is restricted to the default tenant only.
    #[serde(default)]
    pub allowed_tenants: Vec<String>,
}

// SEC-001b: Custom Debug implementation to prevent API key exposure in logs
impl std::fmt::Debug for ApiKeyEntry {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ApiKeyEntry")
            .field("key", &"[REDACTED]")
            .field("tier", &self.tier)
            .field("allowed_tenants", &self.allowed_tenants)
            .finish()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ApiKeyConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub keys: Vec<ApiKeyEntry>,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitBreakerServiceConfig {
    #[serde(default = "default_cb_max_requests")]
    pub max_requests: u32,
    #[serde(default = "default_cb_interval")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub interval: Duration,
    #[serde(default = "default_cb_timeout")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub timeout: Duration,
    #[serde(default)]
    pub consecutive_failures: u32,
    #[serde(default = "default_cb_failure_ratio")]
    pub failure_ratio: f64,
    #[serde(default)]
    pub min_requests: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitBreakerConfig {
    #[serde(default = "default_cb_enabled")]
    pub enabled: bool,
    #[serde(default = "default_solana_cb")]
    pub solana_rpc: CircuitBreakerServiceConfig,
    #[serde(default = "default_stripe_cb")]
    pub stripe_api: CircuitBreakerServiceConfig,
    #[serde(default = "default_webhook_cb")]
    pub webhook: CircuitBreakerServiceConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AdminConfig {
    #[serde(default)]
    pub public_keys: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShopCheckoutConfig {
    /// If true, customers may checkout without an account.
    #[serde(default = "default_guest_checkout")]
    pub guest_checkout: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ShopConfig {
    #[serde(default)]
    pub checkout: ShopCheckoutConfig,
}

fn default_guest_checkout() -> bool {
    true
}

impl Default for ShopCheckoutConfig {
    fn default() -> Self {
        Self {
            guest_checkout: default_guest_checkout(),
        }
    }
}

/// Messaging config for email receipts and webhook notifications on purchase
#[serde_as]
#[derive(Clone, Serialize, Deserialize)]
pub struct MessagingConfig {
    /// Enable email receipts to customers after purchase
    #[serde(default)]
    pub email_enabled: bool,
    /// SMTP server hostname
    #[serde(default)]
    pub smtp_host: String,
    /// SMTP server port (default: 587 for TLS)
    #[serde(default = "default_smtp_port")]
    pub smtp_port: u16,
    /// SMTP authentication username
    #[serde(default)]
    pub smtp_username: String,
    /// SMTP authentication password (secret)
    #[serde(default)]
    pub smtp_password: String,
    /// Email address for outgoing emails
    #[serde(default)]
    pub from_email: String,
    /// Display name for outgoing emails
    #[serde(default)]
    pub from_name: String,
    /// Enable webhook notifications to admin after purchase
    #[serde(default)]
    pub webhook_enabled: bool,
    /// Webhook URL to POST order events to
    #[serde(default)]
    pub webhook_url: String,
    /// HMAC-SHA256 secret for signing webhook payloads
    #[serde(default)]
    pub webhook_secret: String,
    /// HTTP request timeout for webhooks
    #[serde(default = "default_messaging_webhook_timeout")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub webhook_timeout: Duration,
}

// SEC-001f: Custom Debug implementation to prevent secret exposure in logs
impl std::fmt::Debug for MessagingConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("MessagingConfig")
            .field("email_enabled", &self.email_enabled)
            .field("smtp_host", &self.smtp_host)
            .field("smtp_port", &self.smtp_port)
            .field("smtp_username", &self.smtp_username)
            .field("smtp_password", &"[REDACTED]")
            .field("from_email", &self.from_email)
            .field("from_name", &self.from_name)
            .field("webhook_enabled", &self.webhook_enabled)
            .field("webhook_url", &self.webhook_url)
            .field(
                "webhook_secret",
                &if self.webhook_secret.is_empty() {
                    ""
                } else {
                    "[REDACTED]"
                },
            )
            .field("webhook_timeout", &self.webhook_timeout)
            .finish()
    }
}

fn default_smtp_port() -> u16 {
    587
}

fn default_messaging_webhook_timeout() -> Duration {
    Duration::from_secs(10)
}

/// Cedros Login integration config for user_id resolution and credits payment
#[serde_as]
#[derive(Clone, Serialize, Deserialize)]
pub struct CedrosLoginConfig {
    /// Enable cedros-login integration (user_id resolution via wallet lookup)
    #[serde(default)]
    pub enabled: bool,
    /// Enable credits payment method (hold/capture/release flow)
    #[serde(default)]
    pub credits_enabled: bool,
    /// Base URL of cedros-login service (e.g., "https://login.example.com")
    #[serde(default)]
    pub base_url: String,
    /// Admin API key for service-to-service calls
    #[serde(default)]
    pub api_key: String,
    /// HTTP request timeout
    #[serde(default = "default_cedros_login_timeout")]
    #[serde_as(as = "DurationSeconds<u64>")]
    pub timeout: Duration,

    /// Optional JWT issuer (iss) allowlist for cedros-login tokens.
    /// If set, `validate_jwt` will reject tokens whose `iss` does not match.
    #[serde(default)]
    pub jwt_issuer: Option<String>,

    /// Optional JWT audience (aud) allowlist for cedros-login tokens.
    /// If set, `validate_jwt` will reject tokens whose `aud` does not match.
    #[serde(default)]
    pub jwt_audience: Option<String>,
}

// SEC-001e: Custom Debug implementation to prevent secret exposure in logs
impl std::fmt::Debug for CedrosLoginConfig {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("CedrosLoginConfig")
            .field("enabled", &self.enabled)
            .field("credits_enabled", &self.credits_enabled)
            .field("base_url", &self.base_url)
            .field("api_key", &"[REDACTED]")
            .field("timeout", &self.timeout)
            .field("jwt_issuer", &self.jwt_issuer)
            .field("jwt_audience", &self.jwt_audience)
            .finish()
    }
}

fn default_cedros_login_timeout() -> Duration {
    Duration::from_secs(5)
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Config {
    #[serde(default)]
    pub server: ServerConfig,
    #[serde(default)]
    pub logging: LoggingConfig,
    #[serde(default)]
    pub stripe: StripeConfig,
    #[serde(default)]
    pub x402: X402Config,
    #[serde(default)]
    pub paywall: PaywallConfig,
    #[serde(default)]
    pub shop: ShopConfig,
    #[serde(default)]
    pub storage: StorageConfig,
    #[serde(default)]
    pub coupons: CouponConfig,
    #[serde(default)]
    pub subscriptions: SubscriptionsConfig,
    #[serde(default)]
    pub callbacks: CallbacksConfig,
    #[serde(default)]
    pub monitoring: MonitoringConfig,
    #[serde(default)]
    pub rate_limit: RateLimitConfig,
    #[serde(default)]
    pub api_key: ApiKeyConfig,
    #[serde(default)]
    pub circuit_breaker: CircuitBreakerConfig,
    #[serde(default)]
    pub admin: AdminConfig,
    /// Cedros Login integration for user_id resolution
    #[serde(default)]
    pub cedros_login: CedrosLoginConfig,
    /// Messaging config for email receipts and webhook notifications
    #[serde(default)]
    pub messaging: MessagingConfig,
}

impl Config {
    /// Load config from YAML file with env overrides (legacy mode)
    pub fn load(path: Option<&str>) -> Result<Self, ConfigError> {
        let mut builder = RawConfig::builder();

        if let Some(path) = path {
            builder = builder.add_source(File::with_name(path));
        } else {
            builder = builder.add_source(File::with_name("config/default").required(false));
        }

        let mut cfg: Config = builder.build()?.try_deserialize()?;
        cfg.apply_env_overrides();
        cfg.normalize();
        cfg.apply_defaults_from_storage();
        cfg.validate()?;
        Ok(cfg)
    }

    /// Load config entirely from database.
    ///
    /// Only bootstrap values come from environment:
    /// - POSTGRES_URL: Database connection (required)
    /// - SERVER_ADDRESS: Bind address (optional, defaults to 0.0.0.0:8080)
    ///
    /// Everything else is loaded from the app_config table.
    pub async fn load_from_db(
        repo: &crate::config::PostgresConfigRepository,
        tenant_id: &str,
        postgres_url: &str,
        server_address: &str,
    ) -> Result<Self, ConfigError> {
        // Start with defaults
        let mut cfg = Config::default();

        // Set bootstrap values from env
        cfg.storage.backend = StorageBackend::Postgres;
        cfg.storage.postgres_url = Some(postgres_url.to_string());
        cfg.server.address = server_address.to_string();

        let categories = repo
            .list_categories(tenant_id)
            .await
            .map_err(|e| ConfigError::Validation(format!("failed to list config categories: {e}")))?;
        ensure_db_config_present(tenant_id, categories.len())?;

        // Load from database - this populates all other fields.
        // Missing categories are tolerated (defaults apply), but an empty table is not.
        cfg.merge_from_db(repo, tenant_id).await?;

        // Apply defaults based on storage backend
        cfg.apply_defaults_from_storage();
        cfg.normalize();

        Ok(cfg)
    }

    /// Validate config (public wrapper for validate())
    pub fn validate_config(&self) -> Result<(), ConfigError> {
        self.validate()
    }

    fn normalize(&mut self) {
        self.server.route_prefix = normalize_route_prefix(&self.server.route_prefix);

        // Auto-derive WS URL from RPC URL if not set per spec (09-configuration.md)
        if self.x402.ws_url.is_empty() && !self.x402.rpc_url.is_empty() {
            self.x402.ws_url = derive_websocket_url(&self.x402.rpc_url);
        }
    }

    fn apply_defaults_from_storage(&mut self) {
        if self.paywall.product_source.is_none() {
            self.paywall.product_source = match self.storage.backend {
                StorageBackend::Postgres => Some(ProductSource::Postgres),
                StorageBackend::Memory => Some(ProductSource::Memory),
            };
        }

        if self.coupons.coupon_source.is_none() {
            self.coupons.coupon_source = match self.storage.backend {
                StorageBackend::Postgres => Some(CouponSource::Postgres),
                StorageBackend::Memory => Some(CouponSource::Memory),
            };
        }

        if self.paywall.postgres_url.is_none() {
            self.paywall.postgres_url = self.storage.postgres_url.clone();
        }

        if self.coupons.postgres_url.is_none() {
            self.coupons.postgres_url = self.storage.postgres_url.clone();
        }

        if self.subscriptions.postgres_url.is_none() {
            self.subscriptions.postgres_url = self.storage.postgres_url.clone();
        }
    }

    fn validate(&self) -> Result<(), ConfigError> {
        if self.x402.payment_address.is_empty() {
            return Err(ConfigError::Validation(
                "x402.payment_address is required".into(),
            ));
        }
        if self.x402.token_mint.is_empty() {
            return Err(ConfigError::Validation(
                "x402.token_mint is required".into(),
            ));
        }

        // CRITICAL: Validate token mint is a known stablecoin
        // This prevents catastrophic misconfigurations where payments go to wrong token
        if let Err(e) = validate_stablecoin_mint(&self.x402.token_mint) {
            return Err(ConfigError::Validation(format!(
                "x402.token_mint validation failed: {}",
                e
            )));
        }
        // Log successful validation
        if let Ok(symbol) = validate_stablecoin_mint(&self.x402.token_mint) {
            tracing::info!(
                token_mint = %self.x402.token_mint,
                symbol = symbol,
                "✓ Token mint validated"
            );
        }
        if self.x402.rpc_url.is_empty() {
            tracing::warn!(
                "x402.rpc_url is empty; x402 verification and /blockhash will be disabled"
            );
        } else {
            // Validate RPC URL format - must be HTTP or HTTPS
            if !self.x402.rpc_url.starts_with("http://")
                && !self.x402.rpc_url.starts_with("https://")
            {
                return Err(ConfigError::Validation(
                    "x402.rpc_url must be a valid HTTP or HTTPS URL".into(),
                ));
            }
        }
        if (self.x402.gasless_enabled || self.x402.auto_create_token_account)
            && self.x402.server_wallets.is_empty()
        {
            return Err(ConfigError::Validation(
                "x402.server_wallets required when gasless_enabled or auto_create_token_account enabled"
                    .into(),
            ));
        }
        if !self.stripe.publishable_key.is_empty() && self.stripe.secret_key.is_empty() {
            return Err(ConfigError::Validation(
                "stripe.secret_key is required when publishable key is set".into(),
            ));
        }

        match self.storage.backend {
            StorageBackend::Postgres => {
                if self
                    .storage
                    .postgres_url
                    .as_ref()
                    .map(|url| url.trim().is_empty())
                    .unwrap_or(true)
                {
                    return Err(ConfigError::Validation(
                        "storage.postgres_url is required when storage.backend=postgres".into(),
                    ));
                }
            }
            StorageBackend::Memory => {}
        }

        // Validate Stripe webhook secret when Stripe is configured
        // Webhook verification is critical for security - require explicit opt-out
        if !self.stripe.secret_key.is_empty() {
            if self.stripe.webhook_secret.is_empty() {
                return Err(ConfigError::Validation(
                    "stripe.webhook_secret is required when Stripe is configured. \
                      Set CEDROS_STRIPE_WEBHOOK_SECRET to the signing secret from \
                      your Stripe dashboard (Developers > Webhooks > Signing secret)."
                        .into(),
                ));
            }
            // Disallow "disabled" webhook secret.
            // Accepting unsigned webhooks is not safe, even in non-production.
            if self.stripe.webhook_secret == "disabled" {
                return Err(ConfigError::Validation(
                    "stripe.webhook_secret cannot be 'disabled'. \
                     Set CEDROS_STRIPE_WEBHOOK_SECRET to your Stripe signing secret."
                        .into(),
                ));
            }
        }

        // Warn when using test mode in what appears to be production
        if self.stripe.mode == "test" && !self.stripe.secret_key.is_empty() {
            tracing::warn!(
                "Stripe is configured in TEST mode. Set stripe.mode = \"live\" or \
                 CEDROS_STRIPE_MODE=live for production."
            );
        }

        // Warn when YAML resources are defined but database source is selected
        // This prevents confusion where users expect database but YAML is silently used
        if matches!(self.paywall.product_source, Some(ProductSource::Postgres))
            && !self.paywall.resources.is_empty()
        {
            tracing::warn!(
                "⚠️  paywall.resources (YAML) is defined but product_source='postgres'. \
                 Ignoring YAML resources and using postgres database instead. \
                 Remove paywall.resources from config to suppress this warning."
            );
        }

        // Validate schema mapping table names to prevent SQL injection
        let tables = &self.storage.schema_mapping;
        let table_names = [
            ("payments_table", &tables.payments_table),
            ("sessions_table", &tables.sessions_table),
            ("products_table", &tables.products_table),
            ("coupons_table", &tables.coupons_table),
            ("cart_quotes_table", &tables.cart_quotes_table),
            ("refund_quotes_table", &tables.refund_quotes_table),
            ("admin_nonces_table", &tables.admin_nonces_table),
            ("webhook_queue_table", &tables.webhook_queue_table),
        ];
        for (name, value) in table_names {
            if !validate_table_name(value) {
                return Err(ConfigError::Validation(format!(
                    "storage.schema_mapping.{} is not a valid table name",
                    name
                )));
            }
        }

        // Validate Postgres pool sizing invariants.
        if self.storage.postgres_pool.min_connections > self.storage.postgres_pool.max_open_conns {
            return Err(ConfigError::Validation(
                "storage.postgres_pool.min_connections must be <= storage.postgres_pool.max_open_conns"
                    .to_string(),
            ));
        }

        // Validate callback webhook URL for SSRF prevention when configured
        if let Some(ref url) = self.callbacks.payment_success_url {
            let is_dev = self.logging.environment != "production";
            validate_webhook_url(url, is_dev).map_err(|e| {
                ConfigError::Validation(format!("callbacks.payment_success_url: {}", e))
            })?;
        }

        // Validate webhook URL for SSRF prevention when configured
        if let Some(ref url) = self.monitoring.low_balance_alert_url {
            // Allow HTTP in development (logging.environment != "production")
            // but warn about it. SSRF checks still apply regardless.
            let is_dev = self.logging.environment != "production";
            validate_webhook_url(url, is_dev).map_err(|e| {
                ConfigError::Validation(format!("monitoring.low_balance_alert_url: {}", e))
            })?;
        }

        // HIGH-008: Validate Stripe redirect URLs for security when configured
        // Uses validate_redirect_url to block javascript:, data:, and private IPs
        if !self.stripe.success_url.is_empty() {
            crate::errors::validation::validate_redirect_url_with_env(
                &self.stripe.success_url,
                &self.logging.environment,
            )
            .map_err(|e| ConfigError::Validation(format!("stripe.success_url: {}", e.message)))?;
        }
        if !self.stripe.cancel_url.is_empty() {
            crate::errors::validation::validate_redirect_url_with_env(
                &self.stripe.cancel_url,
                &self.logging.environment,
            )
            .map_err(|e| ConfigError::Validation(format!("stripe.cancel_url: {}", e.message)))?;
        }

        // Validate monitoring threshold against wallet health thresholds when gasless is enabled
        // Must match constants: MIN_HEALTHY_BALANCE = 0.005, CRITICAL_BALANCE = 0.001
        if self.x402.gasless_enabled && self.monitoring.low_balance_alert_url.is_some() {
            const MIN_HEALTHY_BALANCE: f64 = 0.005;
            const CRITICAL_BALANCE: f64 = 0.001;

            if self.monitoring.low_balance_threshold < CRITICAL_BALANCE {
                return Err(ConfigError::Validation(format!(
                    "monitoring.low_balance_threshold ({:.6} SOL) is below critical threshold ({:.6} SOL). \
                     This will cause alerts AFTER wallets are already disabled. \
                     Set to {:.6} SOL or higher for early warning.",
                    self.monitoring.low_balance_threshold,
                    CRITICAL_BALANCE,
                    MIN_HEALTHY_BALANCE
                )));
            } else if self.monitoring.low_balance_threshold < MIN_HEALTHY_BALANCE {
                tracing::warn!(
                    "monitoring.low_balance_threshold ({:.6} SOL) is below min healthy threshold ({:.6} SOL). \
                     Alerts will fire shortly before wallets become unhealthy. \
                     Consider setting to {:.6} SOL or higher for earlier warning.",
                    self.monitoring.low_balance_threshold,
                    MIN_HEALTHY_BALANCE,
                    MIN_HEALTHY_BALANCE
                );
            }
        }

        // BUG-004: Prevent divide-by-zero panics in rate limiting when enabled.
        let validate_rate_limit_setting = |name: &str, setting: &RateLimitSetting| {
            if setting.enabled && setting.limit == 0 {
                return Err(ConfigError::Validation(format!(
                    "rate_limit.{}.limit must be > 0 when enabled",
                    name
                )));
            }
            Ok(())
        };
        validate_rate_limit_setting("global", &self.rate_limit.global)?;
        validate_rate_limit_setting("per_ip", &self.rate_limit.per_ip)?;
        validate_rate_limit_setting("per_wallet", &self.rate_limit.per_wallet)?;

        if requires_public_url_for_discovery(
            &self.logging.environment,
            &self.server.public_url,
            &self.server.address,
        ) {
            return Err(ConfigError::Validation(
                "server.public_url is required when server.address is non-routable".into(),
            ));
        }

        // SEC-002: Enforce HTTPS for cedros-login in production and require base_url when enabled.
        if self.cedros_login.enabled {
            if self.cedros_login.base_url.trim().is_empty() {
                return Err(ConfigError::Validation(
                    "cedros_login.base_url is required when cedros_login.enabled=true".into(),
                ));
            }

            let parsed = url::Url::parse(&self.cedros_login.base_url).map_err(|e| {
                ConfigError::Validation(format!("cedros_login.base_url is invalid: {}", e))
            })?;

            if self.logging.environment == "production" && parsed.scheme() != "https" {
                return Err(ConfigError::Validation(
                    "cedros_login.base_url must use https in production".into(),
                ));
            }
        }

        // SEC-12: Validate trusted proxy CIDRs at startup
        for cidr in &self.server.trusted_proxy_cidrs {
            let (net_str, prefix_str) = match cidr.split_once('/') {
                Some((n, p)) => (n.trim(), Some(p.trim())),
                None => (cidr.trim(), None),
            };
            if net_str.parse::<std::net::IpAddr>().is_err() {
                return Err(ConfigError::Validation(format!(
                    "server.trusted_proxy_cidrs contains invalid IP: '{cidr}'"
                )));
            }
            if let Some(p) = prefix_str {
                if p.parse::<u8>().is_err() {
                    return Err(ConfigError::Validation(format!(
                        "server.trusted_proxy_cidrs contains invalid prefix: '{cidr}'"
                    )));
                }
            }
        }

        // OPS-10: Validate SMTP config when email is enabled
        if self.messaging.email_enabled {
            if self.messaging.smtp_host.trim().is_empty() {
                return Err(ConfigError::Validation(
                    "messaging.smtp_host is required when email_enabled=true".into(),
                ));
            }
            if self.messaging.from_email.trim().is_empty() {
                return Err(ConfigError::Validation(
                    "messaging.from_email is required when email_enabled=true".into(),
                ));
            }
        }

        Ok(())
    }

    fn apply_env_overrides(&mut self) {
        // Server
        if let Some(v) = env_var("CEDROS_SERVER_ADDRESS") {
            self.server.address = v;
        }
        if let Some(v) = env_var("CEDROS_SERVER_PUBLIC_URL") {
            self.server.public_url = v;
        }
        if let Some(v) = env_var("CEDROS_ROUTE_PREFIX") {
            self.server.route_prefix = v;
        }
        if let Some(v) = env_var("CEDROS_ADMIN_METRICS_API_KEY") {
            self.server.admin_metrics_api_key = Some(v);
        }
        if let Some(v) = env_var("CORS_ALLOWED_ORIGINS") {
            self.server.cors_allowed_origins = v
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
        }
        if let Some(v) = env_var("CEDROS_TRUSTED_PROXY_CIDRS") {
            self.server.trusted_proxy_cidrs = v
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
        }

        // Stripe
        if let Some(v) = env_var("CEDROS_STRIPE_SECRET_KEY") {
            self.stripe.secret_key = v;
        }
        if let Some(v) = env_var("CEDROS_STRIPE_WEBHOOK_SECRET") {
            self.stripe.webhook_secret = v;
        }
        if let Some(v) = env_var("CEDROS_STRIPE_PUBLISHABLE_KEY") {
            self.stripe.publishable_key = v;
        }
        if let Some(v) = env_var("CEDROS_STRIPE_SUCCESS_URL") {
            self.stripe.success_url = v;
        }
        if let Some(v) = env_var("CEDROS_STRIPE_CANCEL_URL") {
            self.stripe.cancel_url = v;
        }
        if let Some(v) = env_var("CEDROS_STRIPE_TAX_RATE_ID") {
            self.stripe.tax_rate_id = v;
        }
        if let Some(v) = env_var("CEDROS_STRIPE_MODE") {
            self.stripe.mode = v;
        }

        // X402
        if let Some(v) = env_var("CEDROS_X402_PAYMENT_ADDRESS") {
            self.x402.payment_address = v;
        }
        if let Some(v) = env_var("CEDROS_X402_TOKEN_MINT") {
            self.x402.token_mint = v;
        }
        if let Some(v) = env_var("CEDROS_X402_NETWORK") {
            self.x402.network = v;
        }
        if let Some(v) = env_var("CEDROS_X402_RPC_URL") {
            self.x402.rpc_url = v;
        }
        if let Some(v) = env_var("CEDROS_X402_WS_URL") {
            self.x402.ws_url = v;
        }
        if let Some(v) = env_var("CEDROS_X402_MEMO_PREFIX") {
            self.x402.memo_prefix = v;
        }
        if let Some(v) = env_bool("CEDROS_X402_SKIP_PREFLIGHT") {
            self.x402.skip_preflight = v;
        }
        if let Some(v) = env_var("CEDROS_X402_COMMITMENT") {
            self.x402.commitment = v;
        }
        if let Some(v) = env_bool("CEDROS_X402_GASLESS_ENABLED") {
            self.x402.gasless_enabled = v;
        }
        if let Some(v) = env_bool("CEDROS_X402_AUTO_CREATE_TOKEN_ACCOUNT") {
            self.x402.auto_create_token_account = v;
        }

        self.x402.server_wallets = collect_sequential_env("X402_SERVER_WALLET_");

        // Storage
        if let Some(v) = env_var("POSTGRES_URL") {
            self.storage.postgres_url = Some(v);
            self.storage.backend = StorageBackend::Postgres;
        }

        // Note: Storage archival settings are YAML-only per spec 09-configuration.md lines 290-301
        // No environment variable overrides for: enabled, retention_period, run_interval

        // Paywall
        if let Some(v) = env_duration("CEDROS_PAYWALL_QUOTE_TTL") {
            self.paywall.quote_ttl = v;
        }
        if let Some(v) = env_var("CEDROS_PAYWALL_PRODUCT_SOURCE") {
            self.paywall.product_source = parse_product_source(&v);
        }
        if let Some(v) = env_duration("CEDROS_PAYWALL_PRODUCT_CACHE_TTL") {
            self.paywall.product_cache_ttl = v;
        }
        if let Some(v) = env_var("CEDROS_PAYWALL_POSTGRES_URL") {
            self.paywall.postgres_url = Some(v);
        }

        // Coupons
        if let Some(v) = env_var("COUPON_SOURCE") {
            self.coupons.coupon_source = parse_coupon_source(&v);
        }
        if let Some(v) = env_duration("COUPON_CACHE_TTL") {
            self.coupons.cache_ttl = v;
        }
        if let Some(v) = env_var("COUPON_POSTGRES_URL") {
            self.coupons.postgres_url = Some(v);
        }

        // Callbacks
        if let Some(v) = env_var("CALLBACK_PAYMENT_SUCCESS_URL") {
            self.callbacks.payment_success_url = Some(v);
        }
        if let Some(v) = env_duration("CALLBACK_TIMEOUT") {
            self.callbacks.timeout = v;
        }
        for (key, val) in env::vars() {
            if let Some(header) = key.strip_prefix("CALLBACK_HEADER_") {
                self.callbacks
                    .headers
                    .insert(format_header_key(header), val);
            }
        }

        // Monitoring
        if let Some(v) = env_var("MONITORING_LOW_BALANCE_ALERT_URL") {
            self.monitoring.low_balance_alert_url = Some(v);
        }
        if let Some(v) = env_float("MONITORING_LOW_BALANCE_THRESHOLD") {
            self.monitoring.low_balance_threshold = v;
        }
        if let Some(v) = env_duration("MONITORING_CHECK_INTERVAL") {
            self.monitoring.check_interval = v;
        }
        if let Some(v) = env_duration("MONITORING_TIMEOUT") {
            self.monitoring.timeout = v;
        }
        for (key, val) in env::vars() {
            if let Some(header) = key.strip_prefix("MONITORING_HEADER_") {
                self.monitoring
                    .headers
                    .insert(format_header_key(header), val);
            }
        }

        // API Keys
        if let Some(v) = env_bool("CEDROS_API_KEY_ENABLED") {
            self.api_key.enabled = v;
        }
        let mut api_keys = self
            .api_key
            .keys
            .iter()
            .map(|k| (k.key.clone(), k.clone()))
            .collect::<HashMap<_, _>>();
        for (key, val) in env::vars() {
            if let Some(rest) = key.strip_prefix("CEDROS_API_KEY_") {
                if rest.eq_ignore_ascii_case("ENABLED") {
                    continue;
                }
                if let Some(entry) = parse_api_key_entry(&val) {
                    api_keys.insert(entry.key.clone(), entry);
                }
            }
        }
        self.api_key.keys = api_keys.into_values().collect();

        // Rate limit has no env overrides

        // Circuit breaker has no env overrides

        // Admin public keys
        self.admin.public_keys = collect_sequential_env("CEDROS_ADMIN_PUBLIC_KEY_");

        // Cedros Login
        if let Some(v) = env_bool("CEDROS_LOGIN_ENABLED") {
            self.cedros_login.enabled = v;
        }
        if let Some(v) = env_bool("CEDROS_CREDITS_ENABLED") {
            self.cedros_login.credits_enabled = v;
        }
        if let Some(v) = env_var("CEDROS_LOGIN_BASE_URL") {
            self.cedros_login.base_url = v;
        }
        if let Some(v) = env_var("CEDROS_LOGIN_API_KEY") {
            self.cedros_login.api_key = v;
        }
        if let Some(v) = env_duration("CEDROS_LOGIN_TIMEOUT") {
            self.cedros_login.timeout = v;
        }
    }

    /// Merge configuration from database, overlaying on top of file/env config.
    ///
    /// This allows storing config in PostgreSQL while keeping bootstrap config
    /// (POSTGRES_URL, SERVER_ADDRESS) in environment variables.
    ///
    /// Categories loaded from DB: stripe, x402, callbacks, cedros_login, api_keys,
    /// server, logging, paywall, coupons, subscriptions, rate_limit, circuit_breaker,
    /// monitoring, admin.
    ///
    /// Note: Storage config is NOT loaded from DB since it's needed to connect.
    pub async fn merge_from_db(
        &mut self,
        repo: &crate::config::PostgresConfigRepository,
        tenant_id: &str,
    ) -> Result<(), ConfigError> {
        // Load each category and merge into self
        // Skip errors for missing categories (use file/env defaults)

        if let Ok(entries) = repo.get_config(tenant_id, "server").await {
            self.merge_server_config(repo, &entries).await;
        }

        if let Ok(entries) = repo.get_config(tenant_id, "logging").await {
            self.merge_logging_config(&entries);
        }

        if let Ok(entries) = repo.get_config(tenant_id, "stripe").await {
            self.merge_stripe_config(repo, &entries).await;
        }

        if let Ok(entries) = repo.get_config(tenant_id, "x402").await {
            self.merge_x402_config(repo, &entries).await;
        }

        if let Ok(entries) = repo.get_config(tenant_id, "paywall").await {
            self.merge_paywall_config(&entries);
        }

        if let Ok(entries) = repo.get_config(tenant_id, "shop").await {
            self.merge_shop_config(&entries);
        }

        if let Ok(entries) = repo.get_config(tenant_id, "coupons").await {
            self.merge_coupons_config(&entries);
        }

        if let Ok(entries) = repo.get_config(tenant_id, "subscriptions").await {
            self.merge_subscriptions_config(&entries);
        }

        if let Ok(entries) = repo.get_config(tenant_id, "callbacks").await {
            self.merge_callbacks_config(repo, &entries).await;
        }

        if let Ok(entries) = repo.get_config(tenant_id, "monitoring").await {
            self.merge_monitoring_config(&entries);
        }

        if let Ok(entries) = repo.get_config(tenant_id, "rate_limit").await {
            self.merge_rate_limit_config(&entries);
        }

        if let Ok(entries) = repo.get_config(tenant_id, "circuit_breaker").await {
            self.merge_circuit_breaker_config(&entries);
        }

        if let Ok(entries) = repo.get_config(tenant_id, "admin").await {
            self.merge_admin_config(&entries);
        }

        if let Ok(entries) = repo.get_config(tenant_id, "api_keys").await {
            self.merge_api_key_config(repo, &entries).await;
        }

        if let Ok(entries) = repo.get_config(tenant_id, "cedros_login").await {
            self.merge_cedros_login_config(repo, &entries).await;
        }

        if let Ok(entries) = repo.get_config(tenant_id, "messaging").await {
            self.merge_messaging_config(repo, &entries).await;
        }

        tracing::info!(tenant_id = %tenant_id, "Config merged from database");
        Ok(())
    }

    async fn merge_server_config(
        &mut self,
        repo: &crate::config::PostgresConfigRepository,
        entries: &[crate::config::ConfigEntry],
    ) {
        for entry in entries {
            let value = if entry.encrypted {
                match repo.decrypt_entry(entry).await {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::warn!(error = %e, key = %entry.config_key, "Failed to decrypt server config");
                        continue;
                    }
                }
            } else {
                entry.value.clone()
            };

            match entry.config_key.as_str() {
                "public_url" => {
                    if let Some(v) = value.as_str() {
                        self.server.public_url = v.to_string();
                    }
                }
                "route_prefix" => {
                    if let Some(v) = value.as_str() {
                        self.server.route_prefix = v.to_string();
                    }
                }
                "cors_allowed_origins" => {
                    if let Some(arr) = value.as_array() {
                        self.server.cors_allowed_origins = arr
                            .iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect();
                    }
                }
                "trusted_proxy_cidrs" => {
                    if let Some(arr) = value.as_array() {
                        self.server.trusted_proxy_cidrs = arr
                            .iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect();
                    }
                }
                "read_timeout" => {
                    if let Some(v) = value.as_u64() {
                        self.server.read_timeout = Some(Duration::from_secs(v));
                    }
                }
                "write_timeout" => {
                    if let Some(v) = value.as_u64() {
                        self.server.write_timeout = Some(Duration::from_secs(v));
                    }
                }
                "idle_timeout" => {
                    if let Some(v) = value.as_u64() {
                        self.server.idle_timeout = Some(Duration::from_secs(v));
                    }
                }
                "admin_metrics_api_key" => {
                    if let Some(v) = value.as_str() {
                        if v != crate::config::REDACTED_PLACEHOLDER {
                            self.server.admin_metrics_api_key = Some(v.to_string());
                        }
                    }
                }
                // Note: address is bootstrap config, not loaded from DB
                _ => {}
            }
        }
    }

    fn merge_logging_config(&mut self, entries: &[crate::config::ConfigEntry]) {
        for entry in entries {
            match entry.config_key.as_str() {
                "level" => {
                    if let Some(v) = entry.value.as_str() {
                        self.logging.level = v.to_string();
                    }
                }
                "format" => {
                    if let Some(v) = entry.value.as_str() {
                        self.logging.format = v.to_string();
                    }
                }
                "environment" => {
                    if let Some(v) = entry.value.as_str() {
                        self.logging.environment = v.to_string();
                    }
                }
                _ => {}
            }
        }
    }

    async fn merge_stripe_config(
        &mut self,
        repo: &crate::config::PostgresConfigRepository,
        entries: &[crate::config::ConfigEntry],
    ) {
        for entry in entries {
            // Decrypt secrets
            let value = if entry.encrypted {
                match repo.decrypt_entry(entry).await {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::warn!(error = %e, key = %entry.config_key, "Failed to decrypt stripe config");
                        continue;
                    }
                }
            } else {
                entry.value.clone()
            };

            match entry.config_key.as_str() {
                "secret_key" => {
                    if let Some(v) = value.as_str() {
                        if v != crate::config::REDACTED_PLACEHOLDER {
                            self.stripe.secret_key = v.to_string();
                        }
                    }
                }
                "webhook_secret" => {
                    if let Some(v) = value.as_str() {
                        if v != crate::config::REDACTED_PLACEHOLDER {
                            self.stripe.webhook_secret = v.to_string();
                        }
                    }
                }
                "publishable_key" => {
                    if let Some(v) = value.as_str() {
                        self.stripe.publishable_key = v.to_string();
                    }
                }
                "success_url" => {
                    if let Some(v) = value.as_str() {
                        self.stripe.success_url = v.to_string();
                    }
                }
                "cancel_url" => {
                    if let Some(v) = value.as_str() {
                        self.stripe.cancel_url = v.to_string();
                    }
                }
                "tax_rate_id" => {
                    if let Some(v) = value.as_str() {
                        self.stripe.tax_rate_id = v.to_string();
                    }
                }
                "mode" => {
                    if let Some(v) = value.as_str() {
                        self.stripe.mode = v.to_string();
                    }
                }
                _ => {}
            }
        }
    }

    async fn merge_x402_config(
        &mut self,
        repo: &crate::config::PostgresConfigRepository,
        entries: &[crate::config::ConfigEntry],
    ) {
        for entry in entries {
            let value = if entry.encrypted {
                match repo.decrypt_entry(entry).await {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::warn!(error = %e, key = %entry.config_key, "Failed to decrypt x402 config");
                        continue;
                    }
                }
            } else {
                entry.value.clone()
            };

            match entry.config_key.as_str() {
                "payment_address" => {
                    if let Some(v) = value.as_str() {
                        self.x402.payment_address = v.to_string();
                    }
                }
                "token_mint" => {
                    if let Some(v) = value.as_str() {
                        self.x402.token_mint = v.to_string();
                    }
                }
                "token_symbol" => {
                    if let Some(v) = value.as_str() {
                        self.x402.token_symbol = v.to_string();
                    }
                }
                "token_decimals" => {
                    if let Some(v) = value.as_u64() {
                        self.x402.token_decimals = v as u8;
                    }
                }
                "network" => {
                    if let Some(v) = value.as_str() {
                        self.x402.network = v.to_string();
                    }
                }
                "rpc_url" => {
                    if let Some(v) = value.as_str() {
                        self.x402.rpc_url = v.to_string();
                    }
                }
                "ws_url" => {
                    if let Some(v) = value.as_str() {
                        self.x402.ws_url = v.to_string();
                    }
                }
                "memo_prefix" => {
                    if let Some(v) = value.as_str() {
                        self.x402.memo_prefix = v.to_string();
                    }
                }
                "skip_preflight" => {
                    if let Some(v) = value.as_bool() {
                        self.x402.skip_preflight = v;
                    }
                }
                "commitment" => {
                    if let Some(v) = value.as_str() {
                        self.x402.commitment = v.to_string();
                    }
                }
                "gasless_enabled" => {
                    if let Some(v) = value.as_bool() {
                        self.x402.gasless_enabled = v;
                    }
                }
                "auto_create_token_account" => {
                    if let Some(v) = value.as_bool() {
                        self.x402.auto_create_token_account = v;
                    }
                }
                "server_wallets" => {
                    if let Some(arr) = value.as_array() {
                        self.x402.server_wallets = arr
                            .iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect();
                    }
                }
                "allowed_tokens" => {
                    if let Some(arr) = value.as_array() {
                        self.x402.allowed_tokens = arr
                            .iter()
                            .filter_map(|v| v.as_str().map(String::from))
                            .collect();
                    }
                }
                "compute_unit_limit" => {
                    if let Some(v) = value.as_u64() {
                        self.x402.compute_unit_limit = v as u32;
                    }
                }
                "compute_unit_price_micro_lamports" => {
                    if let Some(v) = value.as_u64() {
                        self.x402.compute_unit_price_micro_lamports = v;
                    }
                }
                "rounding_mode" => {
                    if let Some(v) = value.as_str() {
                        self.x402.rounding_mode = v.to_string();
                    }
                }
                "tx_queue_min_time_between" => {
                    if let Some(v) = value.as_u64() {
                        self.x402.tx_queue_min_time_between = Some(Duration::from_secs(v));
                    }
                }
                "tx_queue_max_in_flight" => {
                    if let Some(v) = value.as_u64() {
                        self.x402.tx_queue_max_in_flight = v as usize;
                    }
                }
                _ => {}
            }
        }
    }

    fn merge_paywall_config(&mut self, entries: &[crate::config::ConfigEntry]) {
        for entry in entries {
            match entry.config_key.as_str() {
                "product_cache_ttl" => {
                    if let Some(v) = entry.value.as_u64() {
                        self.paywall.product_cache_ttl = Duration::from_secs(v);
                    }
                }
                "quote_ttl" => {
                    if let Some(v) = entry.value.as_u64() {
                        self.paywall.quote_ttl = Duration::from_secs(v);
                    }
                }
                "product_source" => {
                    if let Some(v) = entry.value.as_str() {
                        self.paywall.product_source = parse_product_source(v);
                    }
                }
                "postgres_url" => {
                    if let Some(v) = entry.value.as_str() {
                        self.paywall.postgres_url = Some(v.to_string());
                    }
                }
                _ => {}
            }
        }
    }

    fn merge_shop_config(&mut self, entries: &[crate::config::ConfigEntry]) {
        for entry in entries {
            match entry.config_key.as_str() {
                "guest_checkout" | "checkout_guest_checkout" | "checkout.guest_checkout" => {
                    if let Some(v) = entry.value.as_bool() {
                        self.shop.checkout.guest_checkout = v;
                    }
                }
                // Support require_account as an inverse for convenience
                "require_account" | "checkout_require_account" | "checkout.require_account" => {
                    if let Some(v) = entry.value.as_bool() {
                        self.shop.checkout.guest_checkout = !v;
                    }
                }
                _ => {}
            }
        }
    }

    fn merge_coupons_config(&mut self, entries: &[crate::config::ConfigEntry]) {
        for entry in entries {
            match entry.config_key.as_str() {
                "cache_ttl" => {
                    if let Some(v) = entry.value.as_u64() {
                        self.coupons.cache_ttl = Duration::from_secs(v);
                    }
                }
                "coupon_source" => {
                    if let Some(v) = entry.value.as_str() {
                        self.coupons.coupon_source = parse_coupon_source(v);
                    }
                }
                "postgres_url" => {
                    if let Some(v) = entry.value.as_str() {
                        self.coupons.postgres_url = Some(v.to_string());
                    }
                }
                _ => {}
            }
        }
    }

    fn merge_subscriptions_config(&mut self, entries: &[crate::config::ConfigEntry]) {
        for entry in entries {
            match entry.config_key.as_str() {
                "enabled" => {
                    if let Some(v) = entry.value.as_bool() {
                        self.subscriptions.enabled = v;
                    }
                }
                "grace_period_hours" => {
                    if let Some(v) = entry.value.as_u64() {
                        self.subscriptions.grace_period_hours = v as u32;
                    }
                }
                "postgres_url" => {
                    if let Some(v) = entry.value.as_str() {
                        self.subscriptions.postgres_url = Some(v.to_string());
                    }
                }
                _ => {}
            }
        }
    }

    async fn merge_callbacks_config(
        &mut self,
        repo: &crate::config::PostgresConfigRepository,
        entries: &[crate::config::ConfigEntry],
    ) {
        for entry in entries {
            let value = if entry.encrypted {
                match repo.decrypt_entry(entry).await {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::warn!(error = %e, key = %entry.config_key, "Failed to decrypt callbacks config");
                        continue;
                    }
                }
            } else {
                entry.value.clone()
            };

            match entry.config_key.as_str() {
                "payment_success_url" => {
                    if let Some(v) = value.as_str() {
                        self.callbacks.payment_success_url = Some(v.to_string());
                    }
                }
                "hmac_secret" => {
                    if let Some(v) = value.as_str() {
                        if v != crate::config::REDACTED_PLACEHOLDER {
                            self.callbacks.hmac_secret = Some(v.to_string());
                        }
                    }
                }
                "timeout" => {
                    if let Some(v) = value.as_u64() {
                        self.callbacks.timeout = Duration::from_secs(v);
                    }
                }
                "body_template" => {
                    if let Some(v) = value.as_str() {
                        self.callbacks.body_template = Some(v.to_string());
                    }
                }
                "headers" => {
                    if let Some(obj) = value.as_object() {
                        for (k, v) in obj {
                            if let Some(val) = v.as_str() {
                                self.callbacks.headers.insert(k.clone(), val.to_string());
                            }
                        }
                    }
                }
                "retry" => {
                    if let Some(obj) = value.as_object() {
                        if let Some(v) = obj.get("enabled").and_then(|v| v.as_bool()) {
                            self.callbacks.retry.enabled = v;
                        }
                        if let Some(v) = obj.get("max_attempts").and_then(|v| v.as_u64()) {
                            self.callbacks.retry.max_attempts = v as u32;
                        }
                        if let Some(v) = obj.get("initial_interval_secs").and_then(|v| v.as_u64()) {
                            self.callbacks.retry.initial_interval = Duration::from_secs(v);
                        }
                        if let Some(v) = obj.get("max_interval_secs").and_then(|v| v.as_u64()) {
                            self.callbacks.retry.max_interval = Duration::from_secs(v);
                        }
                        if let Some(v) = obj.get("multiplier").and_then(|v| v.as_f64()) {
                            self.callbacks.retry.multiplier = v;
                        }
                        if let Some(v) = obj.get("timeout_secs").and_then(|v| v.as_u64()) {
                            self.callbacks.retry.timeout = Duration::from_secs(v);
                        }
                    }
                }
                _ => {}
            }
        }
    }

    fn merge_monitoring_config(&mut self, entries: &[crate::config::ConfigEntry]) {
        for entry in entries {
            match entry.config_key.as_str() {
                "check_interval" => {
                    if let Some(v) = entry.value.as_u64() {
                        self.monitoring.check_interval = Duration::from_secs(v);
                    }
                }
                "low_balance_threshold" => {
                    if let Some(v) = entry.value.as_f64() {
                        self.monitoring.low_balance_threshold = v;
                    }
                }
                "low_balance_alert_url" => {
                    if let Some(v) = entry.value.as_str() {
                        self.monitoring.low_balance_alert_url = Some(v.to_string());
                    }
                }
                "timeout" => {
                    if let Some(v) = entry.value.as_u64() {
                        self.monitoring.timeout = Duration::from_secs(v);
                    }
                }
                "body_template" => {
                    if let Some(v) = entry.value.as_str() {
                        self.monitoring.body_template = Some(v.to_string());
                    }
                }
                "headers" => {
                    if let Some(obj) = entry.value.as_object() {
                        for (k, v) in obj {
                            if let Some(val) = v.as_str() {
                                self.monitoring.headers.insert(k.clone(), val.to_string());
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }

    fn merge_rate_limit_config(&mut self, entries: &[crate::config::ConfigEntry]) {
        for entry in entries {
            if let Some(obj) = entry.value.as_object() {
                let setting = match entry.config_key.as_str() {
                    "global" => &mut self.rate_limit.global,
                    "per_ip" => &mut self.rate_limit.per_ip,
                    "per_wallet" => &mut self.rate_limit.per_wallet,
                    _ => continue,
                };

                if let Some(v) = obj.get("enabled").and_then(|v| v.as_bool()) {
                    setting.enabled = v;
                }
                if let Some(v) = obj.get("limit").and_then(|v| v.as_u64()) {
                    setting.limit = v as u32;
                }
                if let Some(v) = obj.get("window_secs").and_then(|v| v.as_u64()) {
                    setting.window = Duration::from_secs(v);
                }
            }
        }
    }

    fn merge_circuit_breaker_config(&mut self, entries: &[crate::config::ConfigEntry]) {
        for entry in entries {
            if let Some(obj) = entry.value.as_object() {
                let service = match entry.config_key.as_str() {
                    "solana_rpc" => &mut self.circuit_breaker.solana_rpc,
                    "stripe_api" => &mut self.circuit_breaker.stripe_api,
                    "webhook" => &mut self.circuit_breaker.webhook,
                    _ => continue,
                };

                if let Some(v) = obj.get("max_requests").and_then(|v| v.as_u64()) {
                    service.max_requests = v as u32;
                }
                if let Some(v) = obj.get("interval_secs").and_then(|v| v.as_u64()) {
                    service.interval = Duration::from_secs(v);
                }
                if let Some(v) = obj.get("timeout_secs").and_then(|v| v.as_u64()) {
                    service.timeout = Duration::from_secs(v);
                }
                if let Some(v) = obj.get("consecutive_failures").and_then(|v| v.as_u64()) {
                    service.consecutive_failures = v as u32;
                }
                if let Some(v) = obj.get("failure_ratio").and_then(|v| v.as_f64()) {
                    service.failure_ratio = v;
                }
                if let Some(v) = obj.get("min_requests").and_then(|v| v.as_u64()) {
                    service.min_requests = v as u32;
                }
            }
        }
    }

    fn merge_admin_config(&mut self, entries: &[crate::config::ConfigEntry]) {
        for entry in entries {
            if entry.config_key == "public_keys" {
                if let Some(arr) = entry.value.as_array() {
                    self.admin.public_keys = arr
                        .iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect();
                }
            }
        }
    }

    async fn merge_api_key_config(
        &mut self,
        repo: &crate::config::PostgresConfigRepository,
        entries: &[crate::config::ConfigEntry],
    ) {
        for entry in entries {
            let value = if entry.encrypted {
                match repo.decrypt_entry(entry).await {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::warn!(error = %e, key = %entry.config_key, "Failed to decrypt api_keys config");
                        continue;
                    }
                }
            } else {
                entry.value.clone()
            };

            // keys is complex (Vec<ApiKeyEntry>), skip for now - only handle enabled
            if entry.config_key == "enabled" {
                if let Some(v) = value.as_bool() {
                    self.api_key.enabled = v;
                }
            }
        }
    }

    async fn merge_cedros_login_config(
        &mut self,
        repo: &crate::config::PostgresConfigRepository,
        entries: &[crate::config::ConfigEntry],
    ) {
        for entry in entries {
            let value = if entry.encrypted {
                match repo.decrypt_entry(entry).await {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::warn!(error = %e, key = %entry.config_key, "Failed to decrypt cedros_login config");
                        continue;
                    }
                }
            } else {
                entry.value.clone()
            };

            match entry.config_key.as_str() {
                "enabled" => {
                    if let Some(v) = value.as_bool() {
                        self.cedros_login.enabled = v;
                    }
                }
                "credits_enabled" => {
                    if let Some(v) = value.as_bool() {
                        self.cedros_login.credits_enabled = v;
                    }
                }
                "base_url" => {
                    if let Some(v) = value.as_str() {
                        self.cedros_login.base_url = v.to_string();
                    }
                }
                "api_key" => {
                    if let Some(v) = value.as_str() {
                        if v != crate::config::REDACTED_PLACEHOLDER {
                            self.cedros_login.api_key = v.to_string();
                        }
                    }
                }
                "timeout" => {
                    if let Some(v) = value.as_u64() {
                        self.cedros_login.timeout = Duration::from_secs(v);
                    }
                }
                "jwt_issuer" => {
                    if let Some(v) = value.as_str() {
                        self.cedros_login.jwt_issuer = Some(v.to_string());
                    }
                }
                "jwt_audience" => {
                    if let Some(v) = value.as_str() {
                        self.cedros_login.jwt_audience = Some(v.to_string());
                    }
                }
                _ => {}
            }
        }
    }

    async fn merge_messaging_config(
        &mut self,
        repo: &crate::config::PostgresConfigRepository,
        entries: &[crate::config::ConfigEntry],
    ) {
        for entry in entries {
            let value = if entry.encrypted {
                match repo.decrypt_entry(entry).await {
                    Ok(v) => v,
                    Err(e) => {
                        tracing::warn!(error = %e, key = %entry.config_key, "Failed to decrypt messaging config");
                        continue;
                    }
                }
            } else {
                entry.value.clone()
            };

            match entry.config_key.as_str() {
                "email_enabled" => {
                    if let Some(v) = value.as_bool() {
                        self.messaging.email_enabled = v;
                    }
                }
                "smtp_host" => {
                    if let Some(v) = value.as_str() {
                        self.messaging.smtp_host = v.to_string();
                    }
                }
                "smtp_port" => {
                    if let Some(v) = value.as_u64() {
                        self.messaging.smtp_port = v as u16;
                    }
                }
                "smtp_username" => {
                    if let Some(v) = value.as_str() {
                        self.messaging.smtp_username = v.to_string();
                    }
                }
                "smtp_password" => {
                    if let Some(v) = value.as_str() {
                        if v != crate::config::REDACTED_PLACEHOLDER {
                            self.messaging.smtp_password = v.to_string();
                        }
                    }
                }
                "from_email" => {
                    if let Some(v) = value.as_str() {
                        self.messaging.from_email = v.to_string();
                    }
                }
                "from_name" => {
                    if let Some(v) = value.as_str() {
                        self.messaging.from_name = v.to_string();
                    }
                }
                "webhook_enabled" => {
                    if let Some(v) = value.as_bool() {
                        self.messaging.webhook_enabled = v;
                    }
                }
                "webhook_url" => {
                    if let Some(v) = value.as_str() {
                        self.messaging.webhook_url = v.to_string();
                    }
                }
                "webhook_secret" => {
                    if let Some(v) = value.as_str() {
                        if v != crate::config::REDACTED_PLACEHOLDER {
                            self.messaging.webhook_secret = v.to_string();
                        }
                    }
                }
                "webhook_timeout" => {
                    if let Some(v) = value.as_u64() {
                        self.messaging.webhook_timeout = Duration::from_secs(v);
                    }
                }
                _ => {}
            }
        }
    }
}

fn requires_public_url_for_discovery(environment: &str, public_url: &str, address: &str) -> bool {
    if !public_url.trim().is_empty() {
        return false;
    }
    if matches!(environment, "development" | "test") {
        return false;
    }

    let normalized = if address.starts_with(':') {
        format!("0.0.0.0{address}")
    } else {
        address.to_string()
    };

    let parsed: std::net::SocketAddr = match normalized.parse() {
        Ok(addr) => addr,
        Err(_) => return false,
    };

    parsed.ip().is_unspecified() || parsed.ip().is_loopback()
}

pub(crate) fn ensure_db_config_present(
    tenant_id: &str,
    categories_len: usize,
) -> Result<(), ConfigError> {
    if categories_len == 0 {
        return Err(ConfigError::Validation(format!(
            "no configuration found in database (app_config is empty) for tenant '{}'",
            tenant_id
        )));
    }
    Ok(())
}
