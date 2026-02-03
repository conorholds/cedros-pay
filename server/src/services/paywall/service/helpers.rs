impl PaywallService {
    // ========================================================================
    // Helper Methods (per spec 19-services-paywall.md)
    // ========================================================================

    /// Get resource definition by ID
    /// Per spec (17-validation.md): Product ID must be 1-255 characters
    pub async fn get_resource_definition(
        &self,
        tenant_id: &str,
        resource_id: &str,
    ) -> ServiceResult<Product> {
        // Validate product ID length per spec (17-validation.md)
        if resource_id.is_empty() {
            return Err(ServiceError::Coded {
                code: ErrorCode::MissingField,
                message: "resource ID is required".into(),
            });
        }
        if resource_id.len() > crate::constants::MAX_PRODUCT_ID_LENGTH {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidField,
                message: format!(
                    "resource ID exceeds maximum length of {} characters",
                    crate::constants::MAX_PRODUCT_ID_LENGTH
                ),
            });
        }

        self.products
            .get_product(tenant_id, resource_id)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::ResourceNotFound,
                message: format!("resource not found: {}", resource_id),
            })
    }

    /// Get resource definition by Stripe price ID
    pub async fn get_resource_by_stripe_price_id(
        &self,
        tenant_id: &str,
        stripe_price_id: &str,
    ) -> ServiceResult<Product> {
        self.products
            .get_product_by_stripe_price_id(tenant_id, stripe_price_id)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::ResourceNotFound,
                message: format!("resource not found for stripe price: {}", stripe_price_id),
            })
    }

    /// List all products
    pub async fn list_products(&self, tenant_id: &str) -> ServiceResult<Vec<Product>> {
        self.products
            .list_products(tenant_id)
            .await
            .map_err(|e| ServiceError::Internal(format!("failed to list products: {}", e)))
    }

    /// Get a product by ID
    pub async fn get_product(&self, tenant_id: &str, id: &str) -> ServiceResult<Product> {
        self.products
            .get_product(tenant_id, id)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::ProductNotFound,
                message: format!("product not found: {}", id),
            })
    }

    /// Check if a payment has already been processed
    pub async fn has_payment_been_processed(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> ServiceResult<bool> {
        self.store
            .has_payment_been_processed(tenant_id, signature)
            .await
            .map_err(|e| ServiceError::Internal(format!("storage error: {}", e)))
    }

    /// Get a payment by signature
    pub async fn get_payment(
        &self,
        tenant_id: &str,
        signature: &str,
    ) -> ServiceResult<PaymentTransaction> {
        self.store
            .get_payment(tenant_id, signature)
            .await
            .map_err(|e| ServiceError::Internal(format!("storage error: {}", e)))?
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::TransactionNotFound,
                message: format!("payment not found: {}", signature),
            })
    }

    /// Create an admin nonce
    pub async fn create_nonce(
        &self,
        tenant_id: &str,
        purpose: &str,
    ) -> ServiceResult<crate::storage::AdminNonce> {
        let now = Utc::now();
        let expires_at = now + to_chrono_duration(crate::constants::NONCE_TTL);
        let nonce_id = crate::x402::utils::generate_nonce_id();

        let nonce = crate::storage::AdminNonce {
            id: nonce_id.clone(),
            tenant_id: tenant_id.to_string(),
            purpose: purpose.to_string(),
            created_at: now,
            expires_at,
            consumed_at: None,
        };

        self.store
            .create_nonce(nonce.clone())
            .await
            .map_err(|e| ServiceError::Internal(format!("failed to create nonce: {}", e)))?;

        Ok(nonce)
    }

    /// Consume an admin nonce
    pub async fn consume_nonce(&self, tenant_id: &str, nonce_id: &str) -> ServiceResult<()> {
        self.store
            .consume_nonce(tenant_id, nonce_id)
            .await
            .map_err(|e| ServiceError::Coded {
                code: ErrorCode::NonceNotFound,
                message: format!("nonce error: {}", e),
            })
    }

    /// Get a cart quote by ID
    pub async fn get_cart_quote(&self, tenant_id: &str, cart_id: &str) -> ServiceResult<CartQuote> {
        self.store
            .get_cart_quote(tenant_id, cart_id)
            .await
            .map_err(|e| ServiceError::Internal(format!("storage error: {}", e)))?
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::CartNotFound,
                message: format!("cart not found: {}", cart_id),
            })
    }

    // ========================================================================
    // Private Helpers
    // ========================================================================

    /// Check for cached access
    async fn check_cached_access(&self, tenant_id: &str, resource: &str, wallet: &str) -> bool {
        self.store
            .has_valid_access(tenant_id, resource, wallet)
            .await
            .unwrap_or(false)
    }

    /// Get rounding mode from config
    fn get_rounding_mode(&self) -> RoundingMode {
        if self
            .config
            .x402
            .rounding_mode
            .eq_ignore_ascii_case("ceiling")
        {
            RoundingMode::Ceiling
        } else {
            RoundingMode::Standard
        }
    }

    /// Select and validate applicable coupons
    async fn select_coupons(
        &self,
        tenant_id: &str,
        resource: &str,
        coupon_code: Option<&str>,
        payment_method: Option<&str>,
    ) -> Vec<Coupon> {
        let mut coupons = Vec::new();

        // Get auto-apply coupons
        if let Ok(auto) = self.coupons.list_coupons(tenant_id).await {
            for c in auto {
                if c.auto_apply && self.coupon_applies_to(&c, resource, payment_method) {
                    coupons.push(c);
                }
            }
        }

        // Get explicit coupon
        if let Some(code) = coupon_code {
            if let Ok(c) = self.coupons.get_coupon(tenant_id, code).await {
                if self.coupon_applies_to(&c, resource, payment_method) {
                    // Avoid duplicates
                    if !coupons.iter().any(|x| x.code == c.code) {
                        coupons.push(c);
                    }
                }
            }
        }

        coupons
    }

    /// Check if coupon applies to product and payment method
    fn coupon_applies_to(
        &self,
        coupon: &Coupon,
        resource: &str,
        payment_method: Option<&str>,
    ) -> bool {
        // Check active
        if !coupon.active {
            return false;
        }

        // Check date range
        let now = Utc::now();
        if let Some(starts) = coupon.starts_at {
            if now < starts {
                return false;
            }
        }
        if let Some(expires) = coupon.expires_at {
            if now > expires {
                return false;
            }
        }

        // Check usage limit
        if let Some(limit) = coupon.usage_limit {
            if coupon.usage_count >= limit {
                return false;
            }
        }

        // Check scope - "specific" means coupon only applies to listed products
        // Per spec: scope is "all" or "specific", not "product"
        if coupon.scope.eq_ignore_ascii_case("specific")
            && !coupon.product_ids.iter().any(|id| id == resource)
        {
            return false;
        }

        // Check payment method
        if !coupon.payment_method.is_empty() && coupon.payment_method != "any" {
            if let Some(method) = payment_method {
                if !coupon.payment_method.eq_ignore_ascii_case(method) {
                    return false;
                }
            }
        }

        true
    }

    /// Build crypto quote from product
    fn build_crypto_quote(
        &self,
        product: &Product,
        coupons: &[Coupon],
        rounding_mode: RoundingMode,
    ) -> ServiceResult<Option<CryptoQuote>> {
        let crypto_price = match &product.crypto_price {
            Some(p) => p,
            None => return Ok(None),
        };

        let discounted = stack_coupons_on_money(crypto_price.clone(), coupons, rounding_mode);

        let pay_to = product
            .crypto_account
            .clone()
            .unwrap_or_else(|| self.config.x402.payment_address.clone());

        let asset = crypto_price
            .asset
            .metadata
            .solana_mint
            .clone()
            .unwrap_or_else(|| self.config.x402.token_mint.clone());

        let token_symbol = Some(crypto_price.asset.code.clone());

        // Per spec (19-services-paywall.md): Interpolate memo template with resource ID and nonce
        let memo = interpolate_memo(product.memo_template.as_deref(), &product.id);

        Ok(Some(CryptoQuote {
            scheme: "solana-spl-transfer".to_string(),
            network: self.config.x402.network.clone(),
            max_amount_required: discounted.atomic.to_string(),
            resource_id: product.id.clone(),
            description: product.description.clone(),
            pay_to,
            asset,
            mime_type: "application/json".to_string(),
            max_timeout_seconds: Some(300),
            extra: Some(SolanaExtra {
                recipient_token_account: product.crypto_account.clone(),
                decimals: Some(self.config.x402.token_decimals),
                token_symbol,
                memo,
                fee_payer: if self.config.x402.gasless_enabled {
                    self.gasless_builder
                        .as_ref()
                        .and_then(|g| g.get_default_fee_payer())
                } else {
                    None
                },
            }),
        }))
    }

    /// Build Stripe option from product
    fn build_stripe_option(
        &self,
        product: &Product,
        coupons: &[Coupon],
        rounding_mode: RoundingMode,
    ) -> Option<StripeOption> {
        let fiat_price = product.fiat_price.as_ref()?;

        let discounted = stack_coupons_on_money(fiat_price.clone(), coupons, rounding_mode);

        Some(StripeOption {
            price_id: product.stripe_price_id.clone().unwrap_or_default(),
            amount_cents: discounted.atomic,
            currency: fiat_price.asset.code.to_lowercase(),
            description: product.description.clone(),
            metadata: std::collections::HashMap::new(),
        })
    }

    /// Build Credits option from product (for cedros-login credits payment)
    fn build_credits_option(
        &self,
        product: &Product,
        coupons: &[Coupon],
        rounding_mode: RoundingMode,
    ) -> Option<CreditsOption> {
        // Only available if credits are configured and enabled.
        if !self.config.cedros_login.enabled
            || !self.config.cedros_login.credits_enabled
            || self.config.cedros_login.base_url.trim().is_empty()
        {
            return None;
        }

        // Credits are pegged 1:1 to a configured SPL token; use the product's crypto price.
        let crypto_price = product.crypto_price.as_ref()?;

        let discounted = stack_coupons_on_money(crypto_price.clone(), coupons, rounding_mode);

        Some(CreditsOption {
            amount: discounted.atomic,
            currency: crypto_price.asset.code.to_uppercase(),
            description: product.description.clone(),
            resource_id: product.id.clone(),
        })
    }
}
