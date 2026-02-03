fn default_solana_cb() -> CircuitBreakerServiceConfig {
    CircuitBreakerServiceConfig {
        max_requests: default_cb_max_requests(),
        interval: default_cb_interval(),
        timeout: default_cb_timeout(),
        consecutive_failures: 5,
        failure_ratio: default_cb_failure_ratio(),
        min_requests: 10,
    }
}

fn default_stripe_cb() -> CircuitBreakerServiceConfig {
    CircuitBreakerServiceConfig {
        max_requests: default_cb_max_requests(),
        interval: default_cb_interval(),
        timeout: default_cb_timeout(),
        consecutive_failures: 3,
        failure_ratio: default_cb_failure_ratio(),
        min_requests: 5,
    }
}

fn default_webhook_cb() -> CircuitBreakerServiceConfig {
    CircuitBreakerServiceConfig {
        max_requests: 5,
        interval: default_cb_interval(),
        timeout: Duration::from_secs(60),
        consecutive_failures: 10,
        failure_ratio: 0.7,
        min_requests: 20,
    }
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            address: default_server_address(),
            public_url: String::new(),
            route_prefix: DEFAULT_ROUTE_PREFIX.to_string(),
            admin_metrics_api_key: None,
            cors_allowed_origins: default_cors_origins(),
            trusted_proxy_cidrs: Vec::new(),
            read_timeout: default_read_timeout(),
            write_timeout: default_write_timeout(),
            idle_timeout: default_idle_timeout(),
        }
    }
}

impl Default for LoggingConfig {
    fn default() -> Self {
        Self {
            level: default_log_level(),
            format: default_log_format(),
            environment: default_log_environment(),
        }
    }
}

impl Default for StripeConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            secret_key: String::new(),
            webhook_secret: String::new(),
            publishable_key: String::new(),
            success_url: String::new(),
            cancel_url: String::new(),
            tax_rate_id: String::new(),
            mode: default_stripe_mode(),
        }
    }
}

impl Default for X402Config {
    fn default() -> Self {
        Self {
            enabled: true,
            payment_address: String::new(),
            token_mint: String::new(),
            token_symbol: default_token_symbol(),
            token_decimals: default_token_decimals(),
            network: default_x402_network(),
            rpc_url: String::new(),
            ws_url: String::new(),
            memo_prefix: default_memo_prefix(),
            skip_preflight: false,
            commitment: default_commitment(),
            gasless_enabled: false,
            auto_create_token_account: false,
            server_wallets: Vec::new(),
            allowed_tokens: default_allowed_tokens(),
            compute_unit_limit: default_compute_unit_limit(),
            compute_unit_price_micro_lamports: default_compute_unit_price(),
            rounding_mode: default_rounding_mode(),
            tx_queue_min_time_between: default_tx_queue_min_time_between(),
            tx_queue_max_in_flight: default_tx_queue_max_in_flight(),
        }
    }
}

impl Default for PostgresPoolConfig {
    fn default() -> Self {
        Self {
            max_open_conns: default_pg_max_open(),
            min_connections: default_pg_max_idle(),
            conn_max_lifetime: default_pg_conn_max_lifetime(),
        }
    }
}

impl Default for SchemaMapping {
    fn default() -> Self {
        Self {
            payments_table: default_payments_table(),
            sessions_table: default_sessions_table(),
            products_table: default_products_table(),
            coupons_table: default_coupons_table(),
            cart_quotes_table: default_cart_quotes_table(),
            refund_quotes_table: default_refund_quotes_table(),
            admin_nonces_table: default_admin_nonces_table(),
            webhook_queue_table: default_webhook_queue_table(),
            credits_holds_table: default_credits_holds_table(),
        }
    }
}

impl Default for StorageConfig {
    fn default() -> Self {
        Self {
            backend: StorageBackend::Memory,
            postgres_url: None,
            cart_quote_ttl: default_cart_quote_ttl(),
            refund_quote_ttl: default_refund_quote_ttl(),
            postgres_pool: PostgresPoolConfig::default(),
            schema_mapping: SchemaMapping::default(),
            archival: ArchivalConfig::default(),
            inventory_holds_enabled: default_inventory_holds_enabled(),
            inventory_hold_ttl: default_inventory_hold_ttl(),
        }
    }
}

impl Default for PaywallConfig {
    fn default() -> Self {
        Self {
            quote_ttl: default_quote_ttl(),
            product_source: None,
            product_cache_ttl: default_product_cache_ttl(),
            rounding_mode: default_rounding_mode(),
            postgres_url: None,
            resources: Vec::new(),
        }
    }
}

impl Default for CouponConfig {
    fn default() -> Self {
        Self {
            coupon_source: None,
            cache_ttl: default_coupon_cache_ttl(),
            postgres_url: None,
        }
    }
}

impl Default for SubscriptionsConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            backend: default_subscription_backend(),
            postgres_url: None,
            grace_period_hours: default_grace_period_hours(),
        }
    }
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: default_retry_max_attempts(),
            initial_interval: default_retry_initial_interval(),
            max_interval: default_retry_max_interval(),
            multiplier: default_retry_multiplier(),
            timeout: default_retry_timeout(),
            enabled: default_retry_enabled(),
            jitter: default_retry_jitter(),
        }
    }
}

impl Default for CallbacksConfig {
    fn default() -> Self {
        Self {
            payment_success_url: None,
            headers: HashMap::new(),
            timeout: default_callback_timeout(),
            retry: RetryConfig::default(),
            dlq_enabled: false,
            dlq_path: None,
            hmac_secret: None,
            body_template: None,
        }
    }
}

impl Default for MonitoringConfig {
    fn default() -> Self {
        Self {
            low_balance_alert_url: None,
            low_balance_threshold: default_low_balance_threshold(),
            check_interval: default_monitoring_interval(),
            timeout: default_monitoring_timeout(),
            headers: HashMap::new(),
            body_template: None,
        }
    }
}

impl Default for RateLimitSetting {
    fn default() -> Self {
        Self {
            enabled: false,
            limit: 0,
            window: default_rate_limit_window(),
        }
    }
}

impl Default for ApiKeyEntry {
    fn default() -> Self {
        Self {
            key: String::new(),
            tier: ApiKeyTier::Free,
            allowed_tenants: Vec::new(),
        }
    }
}

impl Default for CircuitBreakerServiceConfig {
    fn default() -> Self {
        default_solana_cb()
    }
}

impl Default for CircuitBreakerConfig {
    fn default() -> Self {
        Self {
            enabled: default_cb_enabled(),
            solana_rpc: default_solana_cb(),
            stripe_api: default_stripe_cb(),
            webhook: default_webhook_cb(),
        }
    }
}

impl Default for CedrosLoginConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            credits_enabled: false,
            base_url: String::new(),
            api_key: String::new(),
            timeout: default_cedros_login_timeout(),
            jwt_issuer: None,
            jwt_audience: None,
        }
    }
}

impl Default for MessagingConfig {
    fn default() -> Self {
        Self {
            email_enabled: false,
            smtp_host: String::new(),
            smtp_port: default_smtp_port(),
            smtp_username: String::new(),
            smtp_password: String::new(),
            from_email: String::new(),
            from_name: String::new(),
            webhook_enabled: false,
            webhook_url: String::new(),
            webhook_secret: String::new(),
            webhook_timeout: default_messaging_webhook_timeout(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base_config() -> Config {
        let mut cfg = Config::default();
        cfg.server.public_url = "https://example.com".to_string();
        cfg.x402.payment_address = "wallet".to_string();
        cfg.x402.token_mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v".to_string();
        cfg.paywall.resources = vec![PaywallResource {
            resource_id: "resource-1".to_string(),
            tenant_id: None,
            description: "test".to_string(),
            fiat_amount_cents: Some(100),
            fiat_currency: Some("USD".to_string()),
            stripe_price_id: None,
            crypto_atomic_amount: None,
            crypto_token: None,
            crypto_account: None,
            memo_template: None,
            metadata: HashMap::new(),
        }];
        cfg
    }

    #[test]
    fn test_load_from_db_requires_non_empty_config_table() {
        let err = ensure_db_config_present("default", 0).unwrap_err();
        assert!(matches!(err, ConfigError::Validation(_)));

        ensure_db_config_present("default", 1).unwrap();
    }

    #[test]
    fn test_callbacks_webhook_url_rejects_private_ip() {
        let mut cfg = base_config();
        cfg.logging.environment = "production".to_string();
        cfg.callbacks.payment_success_url = Some("https://10.0.0.1/webhook".to_string());

        let result = cfg.validate();
        assert!(matches!(result, Err(ConfigError::Validation(_))));
    }

    #[test]
    fn test_callbacks_webhook_url_allows_public_https() {
        let mut cfg = base_config();
        cfg.logging.environment = "development".to_string();
        cfg.callbacks.payment_success_url = Some("https://example.com/webhook".to_string());

        std::env::set_var("CEDROS_DISABLE_DNS_VALIDATION", "1");
        let res = cfg.validate();
        std::env::remove_var("CEDROS_DISABLE_DNS_VALIDATION");
        assert!(res.is_ok());
    }

    #[test]
    fn test_public_url_required_for_non_routable_bind_in_production() {
        let mut cfg = base_config();
        cfg.logging.environment = "production".to_string();
        cfg.server.public_url.clear();
        cfg.server.address = ":8080".to_string();

        let result = cfg.validate();
        assert!(matches!(result, Err(ConfigError::Validation(_))));
    }

    #[test]
    fn test_public_url_optional_for_dev_bind_all() {
        let mut cfg = base_config();
        cfg.logging.environment = "development".to_string();
        cfg.server.public_url.clear();
        cfg.server.address = ":8080".to_string();

        let result = cfg.validate();
        assert!(result.is_ok());
    }

    #[test]
    fn test_disable_dns_validation_is_ignored_in_production() {
        let mut cfg = base_config();
        cfg.logging.environment = "production".to_string();
        cfg.callbacks.payment_success_url =
            Some("https://does-not-exist.invalid/webhook".to_string());

        std::env::set_var("CEDROS_DISABLE_DNS_VALIDATION", "1");
        let res = cfg.validate();
        std::env::remove_var("CEDROS_DISABLE_DNS_VALIDATION");

        assert!(matches!(res, Err(ConfigError::Validation(_))));
    }

    #[test]
    fn test_rate_limit_enabled_requires_positive_limit() {
        let mut cfg = base_config();

        cfg.rate_limit.global.enabled = true;
        cfg.rate_limit.global.limit = 0;

        let result = cfg.validate();
        assert!(matches!(result, Err(ConfigError::Validation(_))));

        cfg.rate_limit.global.limit = 1;
        assert!(cfg.validate().is_ok());
    }

    #[test]
    fn test_cedros_login_base_url_requires_https_in_production() {
        let mut cfg = base_config();
        cfg.logging.environment = "production".to_string();
        cfg.cedros_login.enabled = true;
        cfg.cedros_login.base_url = "http://login.example.com".to_string();

        let result = cfg.validate();
        assert!(matches!(result, Err(ConfigError::Validation(_))));

        cfg.cedros_login.base_url = "https://login.example.com".to_string();
        assert!(cfg.validate().is_ok());
    }

    #[test]
    fn test_callbacks_webhook_url_rejects_private_hostname() {
        let mut cfg = base_config();
        cfg.logging.environment = "production".to_string();
        cfg.callbacks.payment_success_url = Some("https://localhost./webhook".to_string());

        let result = cfg.validate();
        assert!(matches!(result, Err(ConfigError::Validation(_))));
    }

    #[test]
    fn test_callbacks_webhook_url_rejects_private_ipv6() {
        let mut cfg = base_config();
        cfg.logging.environment = "production".to_string();
        cfg.callbacks.payment_success_url = Some("https://[fc00::1]/webhook".to_string());

        let result = cfg.validate();
        assert!(matches!(result, Err(ConfigError::Validation(_))));
    }

    #[test]
    fn test_schema_mapping_rejects_invalid_table_name() {
        let mut cfg = base_config();
        cfg.storage.schema_mapping.cart_quotes_table = "bad-name".to_string();
        let result = cfg.validate();
        assert!(matches!(result, Err(ConfigError::Validation(_))));
    }

    #[test]
    fn test_postgres_pool_config_alias_max_idle_conns() {
        let yaml = r#"
max_open_conns: 10
max_idle_conns: 3
conn_max_lifetime: 60
"#;

        let pool: PostgresPoolConfig = serde_yaml::from_str(yaml).unwrap();
        assert_eq!(pool.max_open_conns, 10);
        assert_eq!(pool.min_connections, 3);
        assert_eq!(pool.conn_max_lifetime, Duration::from_secs(60));
    }

    #[test]
    fn test_postgres_pool_config_rejects_min_connections_gt_max_open() {
        let mut cfg = base_config();
        cfg.storage.postgres_pool.max_open_conns = 5;
        cfg.storage.postgres_pool.min_connections = 6;

        let result = cfg.validate();
        assert!(matches!(result, Err(ConfigError::Validation(_))));
    }

    #[test]
    fn test_postgres_backend_requires_url() {
        let mut cfg = base_config();
        cfg.storage.backend = StorageBackend::Postgres;
        cfg.storage.postgres_url = None;

        let result = cfg.validate();
        assert!(matches!(result, Err(ConfigError::Validation(_))));
    }

    // SEC-001: Test that Debug implementations redact secrets
    #[test]
    fn test_stripe_config_debug_redacts_secrets() {
        let config = StripeConfig {
            enabled: true,
            secret_key: "sk_live_supersecret123".to_string(),
            webhook_secret: "whsec_supersecret456".to_string(),
            publishable_key: "pk_live_public".to_string(),
            success_url: "https://example.com/success".to_string(),
            cancel_url: "https://example.com/cancel".to_string(),
            tax_rate_id: "taxr_123".to_string(),
            mode: "live".to_string(),
        };

        let debug_output = format!("{:?}", config);

        // Secrets must NOT appear in debug output
        assert!(
            !debug_output.contains("sk_live_supersecret123"),
            "secret_key should be redacted"
        );
        assert!(
            !debug_output.contains("whsec_supersecret456"),
            "webhook_secret should be redacted"
        );

        // REDACTED placeholder must appear
        assert!(
            debug_output.contains("[REDACTED]"),
            "should contain [REDACTED] placeholder"
        );

        // Non-secrets should still appear
        assert!(
            debug_output.contains("pk_live_public"),
            "publishable_key should be visible"
        );
        assert!(debug_output.contains("live"), "mode should be visible");
    }

    #[test]
    fn test_x402_config_debug_redacts_server_wallets() {
        let config = X402Config {
            enabled: true,
            payment_address: "wallet123".to_string(),
            token_mint: "mint123".to_string(),
            token_symbol: "USDC".to_string(),
            token_decimals: 6,
            network: "mainnet-beta".to_string(),
            rpc_url: "https://api.mainnet-beta.solana.com".to_string(),
            ws_url: "wss://api.mainnet-beta.solana.com".to_string(),
            memo_prefix: "cedros".to_string(),
            skip_preflight: false,
            commitment: "confirmed".to_string(),
            gasless_enabled: true,
            auto_create_token_account: false,
            server_wallets: vec![
                "5KVN3rXn5KqGQPFo7LmMsuperhighlysecretekey123456789".to_string(),
                "3ABC4rXn5KqGQPFo7Lmanothersecretprivatekeyvalue456".to_string(),
            ],
            allowed_tokens: vec!["USDC".to_string()],
            compute_unit_limit: 200000,
            compute_unit_price_micro_lamports: 1000,
            rounding_mode: "up".to_string(),
            tx_queue_min_time_between: None,
            tx_queue_max_in_flight: 10,
        };

        let debug_output = format!("{:?}", config);

        // Private keys must NOT appear in debug output
        assert!(
            !debug_output.contains("5KVN3rXn5KqGQPFo7LmMsuperhighlysecretekey123456789"),
            "server wallet private key should be redacted"
        );
        assert!(
            !debug_output.contains("3ABC4rXn5KqGQPFo7Lmanothersecretprivatekeyvalue456"),
            "server wallet private key should be redacted"
        );

        // Should show wallet count instead
        assert!(
            debug_output.contains("[<2 wallets>]"),
            "should show wallet count"
        );

        // Non-secrets should still appear
        assert!(
            debug_output.contains("wallet123"),
            "payment_address should be visible"
        );
        assert!(
            debug_output.contains("mainnet-beta"),
            "network should be visible"
        );
    }

    #[test]
    fn test_api_key_entry_debug_redacts_key() {
        let entry = ApiKeyEntry {
            key: "cedros_live_sk_supersecretapikey123456".to_string(),
            tier: ApiKeyTier::Enterprise,
            allowed_tenants: vec!["tenant1".to_string(), "tenant2".to_string()],
        };

        let debug_output = format!("{:?}", entry);

        // API key must NOT appear in debug output
        assert!(
            !debug_output.contains("cedros_live_sk_supersecretapikey123456"),
            "API key should be redacted"
        );

        // REDACTED placeholder must appear
        assert!(
            debug_output.contains("[REDACTED]"),
            "should contain [REDACTED] placeholder"
        );

        // Non-secrets should still appear
        assert!(
            debug_output.contains("Enterprise"),
            "tier should be visible"
        );
        assert!(
            debug_output.contains("tenant1"),
            "allowed_tenants should be visible"
        );
    }

    #[test]
    fn test_callbacks_config_debug_redacts_hmac_secret() {
        let config = CallbacksConfig {
            payment_success_url: Some("https://example.com/webhook".to_string()),
            headers: HashMap::new(),
            timeout: Duration::from_secs(30),
            retry: RetryConfig::default(),
            dlq_enabled: false,
            dlq_path: None,
            hmac_secret: Some("supersecret_hmac_key_12345".to_string()),
            body_template: None,
        };

        let debug_output = format!("{:?}", config);

        // HMAC secret must NOT appear in debug output
        assert!(
            !debug_output.contains("supersecret_hmac_key_12345"),
            "hmac_secret should be redacted"
        );

        // REDACTED placeholder must appear
        assert!(
            debug_output.contains("[REDACTED]"),
            "should contain [REDACTED] placeholder"
        );

        // Non-secrets should still appear
        assert!(
            debug_output.contains("https://example.com/webhook"),
            "payment_success_url should be visible"
        );
    }
}
