use super::*;

pub struct AuthorizeWithWalletRequest<'a> {
    pub stripe_session_id: Option<&'a str>,
    pub payment_header: Option<&'a str>,
    pub coupon_code: Option<&'a str>,
    pub wallet: Option<&'a str>,
    pub credits_hold_id: Option<&'a str>,
}

impl PaywallService {
    // ========================================================================
    // Authorization
    // ========================================================================

    /// Authorize access to a resource (delegates to AuthorizeWithWallet with empty wallet)
    pub async fn authorize(
        &self,
        tenant_id: &str,
        resource: &str,
        stripe_session_id: Option<&str>,
        payment_header: Option<&str>,
        coupon_code: Option<&str>,
    ) -> ServiceResult<AuthorizationResult> {
        self.authorize_with_wallet(
            tenant_id,
            resource,
            AuthorizeWithWalletRequest {
                stripe_session_id,
                payment_header,
                coupon_code,
                wallet: None,
                credits_hold_id: None,
            },
        )
        .await
    }

    /// Main authorization dispatcher per spec 19-services-paywall.md
    ///
    /// Routes to appropriate handler based on resource ID pattern:
    /// - `cart_*` or `cart:*` → authorizeCart
    /// - `refund_*` or `refund:*` → authorizeRefund
    /// - Otherwise → standard product authorization
    ///
    /// Supports three payment methods:
    /// - Stripe: Via stripe_session_id
    /// - X402: Via payment_header (Solana transaction proof)
    /// - Credits: Via credits_hold_id (cedros-login credits hold)
    pub async fn authorize_with_wallet(
        &self,
        tenant_id: &str,
        resource: &str,
        req: AuthorizeWithWalletRequest<'_>,
    ) -> ServiceResult<AuthorizationResult> {
        let AuthorizeWithWalletRequest {
            stripe_session_id,
            payment_header,
            coupon_code,
            wallet,
            credits_hold_id,
        } = req;

        // Route Detection: Check resource ID prefix
        if resource.starts_with("cart_") || resource.starts_with("cart:") {
            // Cart authorization
            let cart_id = resource
                .strip_prefix("cart_")
                .or_else(|| resource.strip_prefix("cart:"))
                .unwrap_or(resource);

            // Check for credits payment first (if credits_hold_id is provided)
            if let Some(hold_id) = credits_hold_id {
                return self
                    .authorize_cart_credits(tenant_id, cart_id, hold_id, wallet)
                    .await;
            }

            if let Some(header) = payment_header {
                // Parse the payment header before calling authorize_cart
                let proof =
                    crate::x402::parse_payment_proof(header).map_err(|e| ServiceError::Coded {
                        code: e,
                        message: "invalid payment proof".into(),
                    })?;
                return self.authorize_cart(tenant_id, cart_id, proof).await;
            }
            // No payment header - return unauthorized
            return Ok(AuthorizationResult {
                granted: false,
                method: None,
                wallet: None,
                quote: None,
                settlement: None,
                subscription: None,
            });
        }

        if resource.starts_with("refund_") || resource.starts_with("refund:") {
            // Refund authorization
            let refund_id = resource
                .strip_prefix("refund_")
                .or_else(|| resource.strip_prefix("refund:"))
                .unwrap_or(resource);

            if let Some(header) = payment_header {
                return self.authorize_refund(tenant_id, refund_id, header).await;
            }
            // No payment header - return unauthorized
            return Ok(AuthorizationResult {
                granted: false,
                method: None,
                wallet: None,
                quote: None,
                settlement: None,
                subscription: None,
            });
        }

        // Standard product authorization

        // Per spec (19-services-paywall.md): Subscription Check (if wallet provided)
        // Check if wallet has active subscription before requiring payment
        if let (Some(w), Some(checker)) = (wallet, &self.subscription_checker) {
            match checker.has_access(tenant_id, w, resource).await {
                Ok((true, sub)) => {
                    info!(
                        wallet = %w,
                        resource = %resource,
                        "Subscription access granted"
                    );
                    return Ok(AuthorizationResult {
                        granted: true,
                        method: Some("subscription".into()),
                        wallet: Some(w.to_string()),
                        quote: None,
                        settlement: None,
                        subscription: sub,
                    });
                }
                Ok((false, _)) => {
                    debug!(wallet = %w, resource = %resource, "No active subscription");
                }
                Err(e) => {
                    warn!(error = %e, "Subscription check failed, continuing to payment");
                }
            }
        }

        // Check for cached access
        if let Some(w) = wallet {
            if self.check_cached_access(tenant_id, resource, w).await {
                return Ok(AuthorizationResult {
                    granted: true,
                    method: Some("cached".into()),
                    wallet: Some(w.to_string()),
                    quote: None,
                    settlement: None,
                    subscription: None,
                });
            }
        }

        // Try Stripe verification
        if let Some(session_id) = stripe_session_id {
            return self.authorize_stripe(tenant_id, resource, session_id).await;
        }

        // Try x402 verification
        if let Some(header) = payment_header {
            return self
                .authorize_x402(tenant_id, resource, header, coupon_code)
                .await;
        }

        // Try credits verification
        if let Some(hold_id) = credits_hold_id {
            return self
                .authorize_credits(tenant_id, resource, hold_id, coupon_code, wallet)
                .await;
        }

        // No payment proof provided - return unauthorized
        Ok(AuthorizationResult {
            granted: false,
            method: None,
            wallet: None,
            quote: None,
            settlement: None,
            subscription: None,
        })
    }

    /// Authorize via Stripe session
    async fn authorize_stripe(
        &self,
        tenant_id: &str,
        resource: &str,
        session_id: &str,
    ) -> ServiceResult<AuthorizationResult> {
        // Check if Stripe payments are enabled
        if !self.config.stripe.enabled {
            return Err(ServiceError::Coded {
                code: ErrorCode::PaymentMethodDisabled,
                message: "Stripe payments are not enabled".into(),
            });
        }

        let signature = format!("{}{}", STRIPE_SIGNATURE_PREFIX, session_id);

        let payment = self
            .store
            .get_payment(tenant_id, &signature)
            .await
            .map_err(|e| ServiceError::Coded {
                code: ErrorCode::DatabaseError,
                message: format!("failed to load stripe payment: {e}"),
            })?
            .ok_or(ServiceError::Coded {
                code: ErrorCode::SessionNotFound,
                message: "stripe session not verified".into(),
            })?;

        // SECURITY: Stripe sessions must be bound to the requested resource.
        if payment.resource_id != resource {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidPaymentProof,
                message: "stripe session does not match resource".into(),
            });
        }

        Ok(AuthorizationResult {
            granted: true,
            method: Some("stripe".into()),
            wallet: if payment.wallet.is_empty() {
                None
            } else {
                Some(payment.wallet)
            },
            quote: None,
            settlement: None,
            subscription: None,
        })
    }

    /// Authorize via x402 payment proof.
    /// Note: wallet info is extracted from the proof itself (proof.payer).
    async fn authorize_x402(
        &self,
        tenant_id: &str,
        resource: &str,
        payment_header: &str,
        coupon_code: Option<&str>,
    ) -> ServiceResult<AuthorizationResult> {
        // Parse payment proof from header
        let proof =
            crate::x402::parse_payment_proof(payment_header).map_err(|e| ServiceError::Coded {
                code: e,
                message: "invalid payment proof".into(),
            })?;

        self.authorize_x402_with_proof(tenant_id, resource, proof, coupon_code)
            .await
    }

    /// Internal x402 authorization that takes a pre-parsed PaymentProof
    /// DEAD-002: Removed unused _wallet param - wallet info is in proof.payer
    pub(crate) async fn authorize_x402_with_proof(
        &self,
        tenant_id: &str,
        resource: &str,
        proof: crate::models::PaymentProof,
        coupon_code: Option<&str>,
    ) -> ServiceResult<AuthorizationResult> {
        // Check if x402 payments are enabled
        if !self.config.x402.enabled {
            return Err(ServiceError::Coded {
                code: ErrorCode::PaymentMethodDisabled,
                message: "x402 payments are not enabled".into(),
            });
        }

        let start = Instant::now();

        // SECURITY: Require non-empty signature to prevent bypassing duplicate checks
        // and ensure transactions can be properly tracked. Empty signatures would skip
        // the replay protection at line 707 and storage validation.
        if proof.signature.is_empty() {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidPaymentProof,
                message: "payment signature is required".into(),
            });
        }

        // SECURITY: Validate signature format to prevent invalid data in storage
        validate_signature(&proof.signature).map_err(|code| ServiceError::Coded {
            code,
            message: "invalid signature format - must be 88 base58 characters".into(),
        })?;

        // Per spec (07-payment-processing.md line 56): Validate network matches config
        // SECURITY: Empty network is not allowed - must specify correct network to prevent bypass
        if proof.network.is_empty() {
            return Err(ServiceError::Coded {
                code: ErrorCode::NetworkMismatch,
                message: format!("network is required: expected {}", self.config.x402.network),
            });
        }
        if !proof
            .network
            .eq_ignore_ascii_case(&self.config.x402.network)
        {
            return Err(ServiceError::Coded {
                code: ErrorCode::NetworkMismatch,
                message: format!(
                    "network mismatch: expected {}, got {}",
                    self.config.x402.network, proof.network
                ),
            });
        }

        // CRITICAL: Check if this signature has already been processed BEFORE verification
        // This prevents payment replay attacks where the same transaction is used twice
        // PS-002: Use get_payment to return the STORED wallet, not the request's payer
        if !proof.signature.is_empty() {
            if let Ok(Some(existing_payment)) =
                self.store.get_payment(tenant_id, &proof.signature).await
            {
                if existing_payment.resource_id != resource {
                    return Err(ServiceError::Coded {
                        code: ErrorCode::InvalidSignature,
                        message: "signature already used for different resource".into(),
                    });
                }
                // Payment already processed - return success (idempotent)
                debug!(
                    signature = %proof.signature,
                    resource = %resource,
                    stored_wallet = %existing_payment.wallet,
                    "Payment already processed, returning cached success"
                );
                return Ok(AuthorizationResult {
                    granted: true,
                    method: Some("x402".into()),
                    wallet: Some(existing_payment.wallet),
                    quote: None,
                    settlement: None,
                    subscription: None,
                });
            }
        }

        // Lookup product
        let product = self
            .products
            .get_product(tenant_id, resource)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::ResourceNotFound,
                message: "resource not found".into(),
            })?;

        // Get required amount with discounts
        let applied_coupons = self
            .select_coupons(tenant_id, resource, coupon_code, Some("x402"))
            .await?;
        let rounding_mode = self.get_rounding_mode();

        let base_price = product
            .crypto_price
            .clone()
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::InvalidAmount,
                message: "product has no crypto price".into(),
            })?;

        let required_price = stack_coupons_on_money(base_price, &applied_coupons, rounding_mode);

        // Get token mint first (needed for ATA derivation)
        let token_mint = product
            .crypto_price
            .as_ref()
            .and_then(|m| m.asset.metadata.solana_mint.clone())
            .unwrap_or_else(|| self.config.x402.token_mint.clone());

        // Derive recipient ATA - if crypto_account is set, use it directly
        // Otherwise derive from payment_address (owner) + token mint (like Go does)
        let recipient_ata = if let Some(ref ata) = product.crypto_account {
            ata.clone()
        } else {
            // Derive ATA from payment_address (owner) + token mint
            crate::x402::utils::derive_ata_safe(&self.config.x402.payment_address, &token_mint)
                .ok_or_else(|| ServiceError::Coded {
                    code: ErrorCode::InvalidRecipient,
                    message: "failed to derive recipient token account".into(),
                })?
        };

        let requirement = Requirement {
            resource_id: resource.to_string(),
            amount_atomic: Some(u64::try_from(required_price.atomic).map_err(|_| {
                ServiceError::Coded {
                    code: ErrorCode::InvalidAmount,
                    message: "required amount must be non-negative".into(),
                }
            })?),
            amount: required_price.to_major(),
            token_mint: Some(token_mint),
            recipient_owner: Some(self.config.x402.payment_address.clone()),
            recipient_token_account: Some(recipient_ata),
            network: self.config.x402.network.clone(),
            token_decimals: self.config.x402.token_decimals,
            allowed_tokens: vec![],
            quote_ttl: None,
            skip_preflight: self.config.x402.skip_preflight,
            commitment: self.config.x402.commitment.clone(),
        };

        // Verify payment
        let result = self
            .verifier
            .verify(proof.clone(), requirement)
            .await
            .map_err(|e| match e {
                VerifierError::AmountMismatch => ServiceError::Coded {
                    code: ErrorCode::AmountMismatch,
                    message: "insufficient payment amount".into(),
                },
                VerifierError::InvalidRecipient => ServiceError::Coded {
                    code: ErrorCode::InvalidRecipient,
                    message: "payment to wrong recipient".into(),
                },
                VerifierError::TransactionFailed => ServiceError::Coded {
                    code: ErrorCode::TransactionFailed,
                    message: "transaction failed".into(),
                },
                _ => ServiceError::Coded {
                    code: ErrorCode::VerificationFailed,
                    message: e.to_string(),
                },
            })?;

        // Resolve user_id from wallet via cedros-login (if configured)
        let user_id = self.resolve_user_id_from_wallet(&result.wallet).await;
        let user_id_for_event = user_id.clone();

        // Atomically record payment - try_record_payment returns:
        // - Ok(true): Newly recorded (we won the race)
        // - Ok(false): Already existed (another request recorded first - idempotent success)
        // - Err: Database error (retry with backoff)
        let payment = PaymentTransaction {
            signature: result.signature.clone(),
            tenant_id: tenant_id.to_string(),
            resource_id: resource.to_string(),
            wallet: result.wallet.clone(),
            user_id,
            amount: required_price.clone(),
            created_at: Utc::now(),
            metadata: HashMap::new(),
        };

        // Retry on transient errors, but not on duplicates (which are expected in races)
        let mut last_error = None;
        for attempt in 0..3 {
            match self.store.try_record_payment(payment.clone()).await {
                Ok(true) => {
                    // We recorded it first
                    if attempt > 0 {
                        tracing::info!(
                            attempt = attempt + 1,
                            "Payment recording succeeded after retry"
                        );
                    }
                    last_error = None;
                    break;
                }
                Ok(false) => {
                    // Another request already recorded it - this is fine (idempotent)
                    debug!(
                        signature = %result.signature,
                        resource = %resource,
                        "Payment already recorded by concurrent request"
                    );
                    last_error = None;
                    break;
                }
                Err(e) => {
                    last_error = Some(e);
                    if attempt < 2 {
                        let delay_ms = 100 * (1 << attempt);
                        tracing::warn!(
                            attempt = attempt + 1,
                            delay_ms = delay_ms,
                            "Payment recording failed, retrying"
                        );
                        tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
                    }
                }
            }
        }
        if let Some(e) = last_error {
            tracing::error!(
                error = %e,
                signature = %result.signature,
                resource = %resource,
                amount = %required_price.atomic,
                "CRITICAL: Payment recording failed after 3 attempts - requires manual reconciliation"
            );
            return Err(ServiceError::Coded {
                code: ErrorCode::DatabaseError,
                message: "payment recording failed".into(),
            });
        }

        // Persist order + decrement inventory (best-effort). This is separate from payment
        // recording so that later idempotent replays can fill gaps.
        let mut order_metadata = HashMap::new();
        if !applied_coupons.is_empty() {
            let codes = applied_coupons
                .iter()
                .map(|c| c.code.clone())
                .collect::<Vec<_>>()
                .join(",");
            order_metadata.insert("coupon_codes".to_string(), codes);
        }

        let now = Utc::now();
        let order_id = uuid::Uuid::new_v4().to_string();
        let order = Order {
            id: order_id.clone(),
            tenant_id: tenant_id.to_string(),
            source: "x402".to_string(),
            purchase_id: result.signature.clone(),
            resource_id: resource.to_string(),
            user_id: user_id_for_event.clone(),
            customer: Some(result.wallet.clone()),
            status: "paid".to_string(),
            items: vec![OrderItem {
                product_id: resource.to_string(),
                variant_id: None,
                quantity: 1,
            }],
            amount: required_price.atomic,
            amount_asset: required_price.asset.code.clone(),
            customer_email: None,
            customer_name: None,
            receipt_url: Some(format!("/receipt/{}", order_id)),
            shipping: None,
            metadata: order_metadata,
            created_at: now,
            updated_at: Some(now),
            status_updated_at: Some(now),
        };

        // Clone order for messaging notification before moving into store
        let order_for_messaging = order.clone();

        match self.store.try_store_order(order).await {
            Ok(true) => {
                // Send order notifications (fire-and-forget)
                self.notify_order_created(&order_for_messaging).await;

                // Best-effort inventory decrement: only for tracked inventory.
                match self.products.get_product(tenant_id, resource).await {
                    Ok(mut p) => {
                        if let Some(qty) = p.inventory_quantity {
                            p.inventory_quantity = Some(qty.saturating_sub(1).max(0));
                            if let Err(e) = self.products.update_product(p).await {
                                warn!(error = %e, tenant_id = %tenant_id, product_id = %resource, "Failed to decrement inventory after x402 order");
                            } else {
                                let adjustment = crate::models::InventoryAdjustment {
                                    id: uuid::Uuid::new_v4().to_string(),
                                    tenant_id: tenant_id.to_string(),
                                    product_id: resource.to_string(),
                                    variant_id: None, // x402 doesn't support variants yet
                                    delta: -1,
                                    quantity_before: qty,
                                    quantity_after: qty.saturating_sub(1).max(0),
                                    reason: Some("x402_order_paid".to_string()),
                                    actor: Some("system".to_string()),
                                    created_at: Utc::now(),
                                };
                                if let Err(e) =
                                    self.store.record_inventory_adjustment(adjustment).await
                                {
                                    warn!(error = %e, tenant_id = %tenant_id, product_id = %resource, "Failed to record inventory adjustment");
                                }
                            }
                        }
                    }
                    Err(e) => {
                        warn!(error = %e, tenant_id = %tenant_id, product_id = %resource, "Failed to load product for inventory decrement");
                    }
                }
            }
            Ok(false) => {
                debug!(signature = %result.signature, resource = %resource, "Order already exists; skipping inventory decrement");
            }
            Err(e) => {
                warn!(error = %e, tenant_id = %tenant_id, signature = %result.signature, "Failed to store order");
            }
        }

        // Increment coupon usage atomically - prevents race conditions where concurrent
        // requests could exceed the usage limit. Uses retry for transient DB errors.
        for coupon in &applied_coupons {
            match self
                .increment_coupon_usage_with_retry(tenant_id, &coupon.code)
                .await
            {
                Ok(true) => {
                    crate::observability::record_coupon_operation("increment", "success");
                }
                Ok(false) => {
                    crate::observability::record_coupon_operation("increment", "limit_reached");
                    warn!(
                        code = %coupon.code,
                        resource = %resource,
                        signature = %result.signature,
                        tenant_id = %tenant_id,
                        "RECONCILE: Coupon usage limit reached after payment was accepted; review coupon limits for concurrent requests"
                    );
                }
                Err(e) => {
                    // BUG-001b analysis: Same rationale as cart.rs - we continue because:
                    // 1. Payment is already verified on-chain and recorded
                    // 2. Rejecting would be worse UX than potential coupon overuse
                    // 3. The metric enables monitoring/alerting for this rare edge case
                    error!(
                        error = %e,
                        code = %coupon.code,
                        resource = %resource,
                        signature = %result.signature,
                        tenant_id = %tenant_id,
                        "RECONCILE: Failed to increment coupon usage after 3 attempts - coupon may exceed limit. Query payment by signature to reconcile."
                    );
                    // Record metric for failed coupon increment - critical for monitoring
                    crate::observability::record_coupon_operation("increment", "failed");
                }
            }
        }

        // Send payment notification
        // Per spec (20-webhooks.md): Use tenant_id from payment transaction for proper isolation
        let event = PaymentEvent {
            event_id: crate::x402::utils::generate_event_id(),
            event_type: "payment.succeeded".into(),
            event_timestamp: Utc::now(),
            tenant_id: tenant_id.to_string(),
            resource_id: resource.to_string(),
            method: "x402".into(),
            stripe_session_id: None,
            stripe_customer: None,
            fiat_amount_cents: None,
            fiat_currency: None,
            crypto_atomic_amount: Some(required_price.atomic),
            crypto_token: Some(required_price.asset.code.clone()),
            wallet: Some(result.wallet.clone()),
            user_id: user_id_for_event,
            proof_signature: Some(result.signature.clone()),
            metadata: HashMap::new(),
            paid_at: Utc::now(),
        };

        self.call_payment_callback(&event).await;
        self.notifier.payment_succeeded(event).await;

        // Record payment metrics
        let duration_secs = start.elapsed().as_secs_f64();
        record_payment(
            "x402",
            "resource",
            true,
            Some(required_price.atomic),
            Some(&required_price.asset.code),
            duration_secs,
        );

        info!(
            resource = %resource,
            wallet = %result.wallet,
            signature = %result.signature,
            "Payment authorized"
        );

        // Per spec (05-data-models.md): Populate settlement response with transaction details
        let settlement = SettlementResponse {
            success: true,
            error: None,
            tx_hash: Some(result.signature.clone()),
            network_id: Some(self.config.x402.network.clone()),
        };

        Ok(AuthorizationResult {
            granted: true,
            method: Some("x402".into()),
            wallet: Some(result.wallet),
            quote: None,
            settlement: Some(settlement),
            subscription: None,
        })
    }
}
