impl PaywallService {
    // ========================================================================
    // Cart Payment
    // ========================================================================

    /// Authorize a cart payment
    /// Accepts a pre-parsed PaymentProof to avoid double-parsing issues
    /// DEAD-002: Removed unused _wallet param - wallet info is in proof.payer
    pub async fn authorize_cart(
        &self,
        tenant_id: &str,
        cart_id: &str,
        proof: crate::models::PaymentProof,
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
        if proof.signature.is_empty() {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidPaymentProof,
                message: "payment signature is required".into(),
            });
        }

        // SECURITY: Validate signature format
        validate_signature(&proof.signature).map_err(|code| ServiceError::Coded {
            code,
            message: "invalid signature format - must be 88 base58 characters".into(),
        })?;

        // Get cart quote
        let cart = self
            .store
            .get_cart_quote(tenant_id, cart_id)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::CartNotFound,
                message: "cart not found".into(),
            })?
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::CartNotFound,
                message: "cart not found".into(),
            })?;

        // Check expiry (M-005)
        // SECURITY NOTE: This is an optimization only, NOT a security boundary.
        // There is a TOCTOU race here - a concurrent request could extend the cart
        // between this check and the payment verification.
        // The ACTUAL security boundary is the atomic inventory/payment checks later.
        // We keep this check for early error messages and to release expired reservations.
        if Utc::now() > cart.expires_at {
            if let Err(e) = self
                .store
                .release_inventory_reservations(tenant_id, cart_id, Utc::now())
                .await
            {
                warn!(error = %e, cart_id = %cart_id, "Failed to release inventory reservations after cart expiry");
            }
            return Err(ServiceError::Coded {
                code: ErrorCode::QuoteExpired,
                message: "cart quote expired".into(),
            });
        }

        // EARLY DUPLICATE CHECK (C-001): This is an optimization only, NOT a security boundary.
        // There is a TOCTOU race here - two concurrent requests could both pass this check.
        // The ACTUAL security boundary is the atomic try_record_payment call later.
        // This early check just saves an RPC call when we already know the payment exists.
        // PS-002: Use get_payment to return the STORED wallet, not the request's payer
        if !proof.signature.is_empty() {
            if let Ok(Some(existing_payment)) =
                self.store.get_payment(tenant_id, &proof.signature).await
            {
                let expected_resource = format!("cart:{}", cart_id);
                if existing_payment.resource_id != expected_resource {
                    return Err(ServiceError::Coded {
                        code: ErrorCode::InvalidSignature,
                        message: "signature already used for different resource".into(),
                    });
                }
                debug!(
                    signature = %proof.signature,
                    cart_id = %cart_id,
                    stored_wallet = %existing_payment.wallet,
                    "Cart payment already processed (early check), returning success"
                );
                return Ok(AuthorizationResult {
                    granted: true,
                    method: Some("x402".into()),
                    wallet: Some(existing_payment.wallet),
                    quote: None,
                    settlement: Some(SettlementResponse {
                        success: true,
                        error: None,
                        tx_hash: Some(proof.signature.clone()),
                        network_id: Some(self.config.x402.network.clone()),
                    }),
                    subscription: None,
                });
            }
        }

        // SECURITY (C-001, C-004): This check is NOT a security boundary due to TOCTOU race.
        // The cart could be paid by a concurrent request between this check and the payment recording.
        // The ACTUAL security boundary is mark_cart_paid which uses atomic UPDATE ... WHERE wallet_paid_by IS NULL.
        // We keep this check only for early error message; race losers will fail at mark_cart_paid.
        if cart.wallet_paid_by.is_some() {
            return Err(ServiceError::Coded {
                code: ErrorCode::CartAlreadyPaid,
                message: "cart already paid".into(),
            });
        }

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

        // Get token mint first (needed for ATA derivation)
        let token_mint = cart
            .total
            .asset
            .metadata
            .solana_mint
            .clone()
            .unwrap_or_else(|| self.config.x402.token_mint.clone());

        // Derive recipient ATA from payment_address (owner) + token mint (like Go does)
        let recipient_ata =
            crate::x402::utils::derive_ata_safe(&self.config.x402.payment_address, &token_mint)
                .ok_or_else(|| ServiceError::Coded {
                    code: ErrorCode::InvalidRecipient,
                    message: "failed to derive cart recipient token account".into(),
                })?;

        let requirement = Requirement {
            resource_id: format!("cart:{}", cart_id),
            amount_atomic: Some(
                u64::try_from(cart.total.atomic).map_err(|_| ServiceError::Coded {
                    code: ErrorCode::InvalidAmount,
                    message: "cart total must be non-negative".into(),
                })?,
            ),
            amount: cart.total.to_major(),
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
            .verify(proof, requirement.clone())
            .await
            .map_err(|e| ServiceError::Coded {
                code: ErrorCode::VerificationFailed,
                message: e.to_string(),
            })?;

        // Per spec (19-services-paywall.md): Cart payments require EXACT amount matching
        // (tolerance 1e-6) unlike single-product payments that allow overpayment.
        // The verifier uses amount_sufficient (allows overpay), so we do a post-check.
        // Use atomic units comparison to avoid floating-point precision issues.
        let required_atomic = requirement
            .amount_atomic
            .and_then(|a| i64::try_from(a).ok())
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::InvalidAmount,
                message: "cart required atomic amount is invalid".into(),
            })?;

        if !crate::services::paywall::amounts::amount_matches_atomic_units(
            result.amount,
            required_atomic,
            requirement.token_decimals,
        ) {
            // Convert for error message display
            let paid_major = result.amount as f64 / 10_f64.powi(requirement.token_decimals as i32);
            return Err(ServiceError::Coded {
                code: ErrorCode::AmountMismatch,
                message: format!(
                    "cart requires exact payment: expected {}, got {}",
                    requirement.amount, paid_major
                ),
            });
        }

        // RACE MITIGATION: Double-check if this signature was recorded while we verified.
        if !result.signature.is_empty()
            && self
                .store
                .has_payment_been_processed(tenant_id, &result.signature)
                .await
                .unwrap_or(false)
        {
            debug!(
                signature = %result.signature,
                cart_id = %cart_id,
                "Cart payment was recorded by concurrent request, returning success"
            );
            return Ok(AuthorizationResult {
                granted: true,
                method: Some("x402".into()),
                wallet: Some(result.wallet.clone()),
                quote: None,
                settlement: Some(SettlementResponse {
                    success: true,
                    error: None,
                    tx_hash: Some(result.signature.clone()),
                    network_id: Some(self.config.x402.network.clone()),
                }),
                subscription: None,
            });
        }

        // Resolve user_id from wallet via cedros-login (if configured)
        let user_id = self.resolve_user_id_from_wallet(&result.wallet).await;
        let user_id_for_event = user_id.clone();

        // Record a single cart-level payment with retry logic
        // Use try_record_payment for atomic duplicate detection (same as single-product flow)
        let payment = PaymentTransaction {
            signature: result.signature.clone(),
            tenant_id: cart.tenant_id.clone(),
            resource_id: format!("cart:{}", cart.id),
            wallet: result.wallet.clone(),
            user_id,
            amount: cart.total.clone(),
            created_at: Utc::now(),
            metadata: HashMap::new(),
        };

        // Retry payment recording with exponential backoff
        // try_record_payment returns:
        // - Ok(true): Newly recorded (we won the race)
        // - Ok(false): Already existed (concurrent request recorded first - idempotent success)
        // - Err: Database error (retry with backoff)
        let mut last_error = None;
        let mut payment_recorded_new = false;
        for attempt in 0..3 {
            match self.store.try_record_payment(payment.clone()).await {
                Ok(true) => {
                    if attempt > 0 {
                        tracing::info!(
                            attempt = attempt + 1,
                            cart_id = %cart.id,
                            "Cart payment recording succeeded after retry"
                        );
                    }
                    last_error = None;
                    payment_recorded_new = true;
                    break;
                }
                Ok(false) => {
                    debug!(
                        signature = %result.signature,
                        cart_id = %cart.id,
                        "Cart payment already recorded by concurrent request"
                    );
                    last_error = None;
                    payment_recorded_new = false;
                    break;
                }
                Err(e) => {
                    last_error = Some(e);
                    if attempt < 2 {
                        let delay_ms = 100 * (1 << attempt);
                        tracing::warn!(
                            attempt = attempt + 1,
                            delay_ms = delay_ms,
                            cart_id = %cart.id,
                            "Cart payment recording failed, retrying"
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
                cart_id = %cart.id,
                amount = %cart.total.atomic,
                "CRITICAL: Cart payment recording failed after 3 attempts - requires manual reconciliation"
            );
            // REL-001: Return error instead of silently continuing
            // The payment was verified on-chain but we couldn't record it - this is a critical failure
            return Err(ServiceError::Coded {
                code: ErrorCode::DatabaseError,
                message: "failed to record payment after verification - contact support with transaction signature".into(),
            });
        }

        if payment_recorded_new {
            // SECURITY: Use atomic mark_cart_paid to prevent race condition (C-004 fix).
            // This will fail if wallet_paid_by is already set (cart already paid).
            match self.store.mark_cart_paid(tenant_id, cart_id, &result.wallet).await {
                Ok(()) => {
                    // Successfully marked cart as paid - now apply gift card redemption
                    self.apply_gift_card_redemption_atomic(tenant_id, &cart).await;
                }
                Err(crate::storage::StorageError::NotFound) => {
                    // Cart not found - this shouldn't happen since we already loaded it
                    warn!(cart_id = %cart_id, "Cart disappeared during payment processing");
                }
                Err(e) => {
                    // Likely cart was already paid by concurrent request
                    debug!(error = %e, cart_id = %cart_id, "Cart already paid (concurrent request)");
                }
            }
        }

        if let Err(e) = self
            .store
            .convert_inventory_reservations(tenant_id, cart_id, Utc::now())
            .await
        {
            warn!(error = %e, cart_id = %cart_id, "Failed to convert inventory reservations after cart payment");
        }

        // Persist order + decrement inventory (best-effort). This is separate from payment
        // recording so that later idempotent replays can fill gaps.
        self.persist_cart_order_and_inventory(
            tenant_id,
            &cart,
            &result.signature,
            Some(result.wallet.clone()),
            user_id_for_event.clone(),
            "x402",
        )
        .await;

        // Increment coupon usage atomically for all applied coupons - prevents race conditions
        // Also track per-customer usage using wallet as customer_id
        let customer_id = result.wallet.clone();
        for coupon_code in &cart.applied_coupons {
            let mut last_error = None;
            for attempt in 0..3 {
                match self
                    .coupons
                    .try_increment_usage_atomic(tenant_id, coupon_code)
                    .await
                {
                    Ok(true) => {
                        if attempt > 0 {
                            debug!(attempt = attempt + 1, coupon_code = %coupon_code, "Coupon usage incremented after retry");
                        } else {
                            debug!(coupon_code = %coupon_code, "Incremented coupon usage");
                        }
                        crate::observability::record_coupon_operation("increment", "success");
                        last_error = None;
                        break;
                    }
                    Ok(false) => {
                        // Limit was reached atomically - this is expected in race conditions
                        warn!(
                            coupon_code = %coupon_code,
                            "Coupon usage limit reached during atomic increment (concurrent request won)"
                        );
                        crate::observability::record_coupon_operation("increment", "limit_reached");
                        last_error = None;
                        break;
                    }
                    Err(e) => {
                        last_error = Some(e);
                        if attempt < 2 {
                            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
                        }
                    }
                }
            }
            if let Some(e) = last_error {
                // BUG-001 analysis: We intentionally continue here rather than returning an error because:
                // 1. The payment has already been verified on-chain and recorded - customer has paid
                // 2. Rejecting the payment now would be worse UX than allowing coupon overuse
                // 3. This is a rare edge case (DB failure specifically during coupon increment)
                // 4. The metric below enables monitoring and alerting for this condition
                //
                // If coupon abuse becomes a problem, implement pre-authorization coupon reservation
                // (reserve coupon usage before payment verification, release on failure).
                error!(
                    error = %e,
                    coupon_code = %coupon_code,
                    cart_id = %cart.id,
                    "ALERT: Failed to increment coupon usage after 3 attempts - coupon may exceed limit"
                );
                // Record metric for failed coupon increment - critical for monitoring
                crate::observability::record_coupon_operation("increment", "failed");
            }

            // Track per-customer usage (best-effort, non-blocking)
            if let Err(e) = self
                .coupons
                .increment_customer_usage(tenant_id, coupon_code, &customer_id)
                .await
            {
                warn!(
                    error = %e,
                    coupon_code = %coupon_code,
                    customer_id = %customer_id,
                    "Failed to track per-customer coupon usage"
                );
            }
        }

        // Send payment notification
        let event = PaymentEvent {
            event_id: crate::x402::utils::generate_event_id(),
            event_type: "payment.succeeded".into(),
            event_timestamp: Utc::now(),
            tenant_id: tenant_id.to_string(),
            resource_id: format!("cart:{}", cart_id),
            method: "x402-cart".into(),
            stripe_session_id: None,
            stripe_customer: None,
            fiat_amount_cents: None,
            fiat_currency: None,
            crypto_atomic_amount: Some(cart.total.atomic),
            crypto_token: Some(cart.total.asset.code.clone()),
            wallet: Some(result.wallet.clone()),
            user_id: user_id_for_event,
            proof_signature: Some(result.signature.clone()),
            metadata: {
                let mut m = HashMap::new();
                m.insert("cart_id".to_string(), cart_id.to_string());
                m
            },
            paid_at: Utc::now(),
        };

        self.call_payment_callback(&event).await;
        self.notifier.payment_succeeded(event).await;

        // Record cart payment metrics
        let duration_secs = start.elapsed().as_secs_f64();
        record_payment(
            "x402-cart",
            "cart",
            true,
            Some(cart.total.atomic),
            Some(&cart.total.asset.code),
            duration_secs,
        );

        info!(
            cart_id = %cart_id,
            wallet = %result.wallet,
            signature = %result.signature,
            coupons_used = cart.applied_coupons.len(),
            "Cart payment authorized"
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
            method: Some("x402-cart".into()),
            wallet: Some(result.wallet),
            quote: None,
            settlement: Some(settlement),
            subscription: None,
        })
    }

    /// Authorize a cart payment via cedros-login credits
    ///
    /// Captures a pre-created credits hold to complete cart payment.
    /// The hold must have been created via the credits API before authorization.
    pub async fn authorize_cart_credits(
        &self,
        tenant_id: &str,
        cart_id: &str,
        hold_id: &str,
        wallet: Option<&str>,
    ) -> ServiceResult<AuthorizationResult> {
        self.authorize_cart_credits_internal(tenant_id, cart_id, hold_id, wallet, None)
            .await
    }

    /// Create a server-managed credits hold for a cart via cedros-login and persist the binding.
    pub async fn create_cart_credits_hold_for_user(
        &self,
        tenant_id: &str,
        cart_id: &str,
        user_id: &str,
    ) -> ServiceResult<crate::storage::CreditsHold> {
        let client = self.cedros_login.as_ref().ok_or(ServiceError::Coded {
            code: ErrorCode::ServiceUnavailable,
            message: "credits payment not configured".into(),
        })?;

        if !self.config.cedros_login.credits_enabled {
            return Err(ServiceError::Coded {
                code: ErrorCode::ServiceUnavailable,
                message: "credits payment not enabled".into(),
            });
        }

        // Get cart quote
        let cart = self
            .store
            .get_cart_quote(tenant_id, cart_id)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::CartNotFound,
                message: "cart not found".into(),
            })?
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::CartNotFound,
                message: "cart not found".into(),
            })?;

        // Check expiry (M-005)
        // SECURITY NOTE: This is an optimization only, NOT a security boundary.
        // There is a TOCTOU race here - a concurrent request could extend the cart
        // between this check and the payment verification.
        // The ACTUAL security boundary is the atomic inventory/payment checks later.
        // We keep this check for early error messages and to release expired reservations.
        if Utc::now() > cart.expires_at {
            if let Err(e) = self
                .store
                .release_inventory_reservations(tenant_id, cart_id, Utc::now())
                .await
            {
                warn!(error = %e, cart_id = %cart_id, "Failed to release inventory reservations after cart expiry");
            }
            return Err(ServiceError::Coded {
                code: ErrorCode::QuoteExpired,
                message: "cart quote expired".into(),
            });
        }

        if cart.wallet_paid_by.is_some() {
            return Err(ServiceError::Coded {
                code: ErrorCode::CartAlreadyPaid,
                message: "cart already paid".into(),
            });
        }

        let resource_id = format!("cart:{}", cart_id);
        // SECURITY: Scope idempotency to the authenticated user.
        // If cedros-login idempotency keys are globally scoped, omitting user_id can allow cross-user
        // collisions that return a hold created for a different user.
        let idempotency_key = format!("cart:{}:{}:{}", tenant_id, user_id, cart_id);
        let hold_resp = client
            .create_hold(
                user_id,
                cart.total.atomic,
                &cart.total.asset.code,
                &idempotency_key,
                Some("cart"),
                Some(&resource_id),
            )
            .await
            .map_err(|e| match e {
                crate::services::cedros_login::CedrosLoginError::InsufficientCredits {
                    required,
                    available,
                } => ServiceError::Coded {
                    code: ErrorCode::InsufficientCredits,
                    message: format!(
                        "insufficient credits: required {}, available {}",
                        required, available
                    ),
                },
                other => ServiceError::Coded {
                    code: ErrorCode::VerificationFailed,
                    message: format!("credits hold create failed: {}", other),
                },
            })?;

        let created_at = Utc::now();
        let expires_at = chrono::DateTime::parse_from_rfc3339(&hold_resp.expires_at)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now());

        let hold = crate::storage::CreditsHold {
            hold_id: hold_resp.hold_id,
            tenant_id: cart.tenant_id.clone(),
            user_id: user_id.to_string(),
            resource_id,
            amount: cart.total.atomic,
            amount_asset: cart.total.asset.code.clone(),
            created_at,
            expires_at,
        };

        self.store
            .store_credits_hold(hold.clone())
            .await
            .map_err(|e| ServiceError::Coded {
                code: ErrorCode::DatabaseError,
                message: format!("failed to store credits hold binding: {e}"),
            })?;

        Ok(hold)
    }

    pub async fn authorize_cart_credits_for_user(
        &self,
        tenant_id: &str,
        cart_id: &str,
        hold_id: &str,
        wallet: Option<&str>,
        user_id: &str,
    ) -> ServiceResult<AuthorizationResult> {
        self.authorize_cart_credits_internal(tenant_id, cart_id, hold_id, wallet, Some(user_id))
            .await
    }

    async fn authorize_cart_credits_internal(
        &self,
        tenant_id: &str,
        cart_id: &str,
        hold_id: &str,
        wallet: Option<&str>,
        user_id_override: Option<&str>,
    ) -> ServiceResult<AuthorizationResult> {
        let start = Instant::now();

        // Get cedros-login client
        let client = self.cedros_login.as_ref().ok_or(ServiceError::Coded {
            code: ErrorCode::ServiceUnavailable,
            message: "credits payment not configured".into(),
        })?;

        // Check if credits are enabled
        if !self.config.cedros_login.credits_enabled {
            return Err(ServiceError::Coded {
                code: ErrorCode::ServiceUnavailable,
                message: "credits payment not enabled".into(),
            });
        }

        // SECURITY: Check if this hold has already been processed (idempotent)
        // Use hold_id as the signature for credits payments
        let signature = format!("credits:{}", hold_id);
        let resource_id = format!("cart:{}", cart_id);
        if let Ok(Some(existing_payment)) = self.store.get_payment(tenant_id, &signature).await {
            if existing_payment.resource_id != resource_id {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidPaymentProof,
                    message: "hold already used for different resource".into(),
                });
            }
            // Payment already processed - return success (idempotent)
            debug!(
                hold_id = %hold_id,
                cart_id = %cart_id,
                "Cart credits payment already processed, returning cached success"
            );
            return Ok(AuthorizationResult {
                granted: true,
                method: Some("credits-cart".into()),
                wallet: (!existing_payment.wallet.is_empty())
                    .then_some(existing_payment.wallet),
                quote: None,
                settlement: None,
                subscription: None,
            });
        }

        // Get cart quote
        let cart = self
            .store
            .get_cart_quote(tenant_id, cart_id)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::CartNotFound,
                message: "cart not found".into(),
            })?
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::CartNotFound,
                message: "cart not found".into(),
            })?;

        // Check expiry (M-005)
        // SECURITY NOTE: This is an optimization only, NOT a security boundary.
        // There is a TOCTOU race here - a concurrent request could extend the cart
        // between this check and the payment verification.
        // The ACTUAL security boundary is the atomic inventory/payment checks later.
        // We keep this check for early error messages and to release expired reservations.
        if Utc::now() > cart.expires_at {
            if let Err(e) = self
                .store
                .release_inventory_reservations(tenant_id, cart_id, Utc::now())
                .await
            {
                warn!(error = %e, cart_id = %cart_id, "Failed to release inventory reservations after cart expiry");
            }
            return Err(ServiceError::Coded {
                code: ErrorCode::QuoteExpired,
                message: "cart quote expired".into(),
            });
        }

        // Check if already paid
        if cart.wallet_paid_by.is_some() {
            return Err(ServiceError::Coded {
                code: ErrorCode::CartAlreadyPaid,
                message: "cart already paid".into(),
            });
        }

        // SECURITY: Require server-managed hold binding and verify it matches.
        let expected_user_id = user_id_override.ok_or(ServiceError::Coded {
            code: ErrorCode::Unauthorized,
            message: "credits authorization requires Authorization bearer".into(),
        })?;

        let hold = self
            .store
            .get_credits_hold(tenant_id, hold_id)
            .await
            .map_err(|e| ServiceError::Coded {
                code: ErrorCode::DatabaseError,
                message: format!("failed to load credits hold binding: {e}"),
            })?
            .ok_or(ServiceError::Coded {
                code: ErrorCode::SessionNotFound,
                message: "credits hold not found or expired".into(),
            })?;

        if Utc::now() > hold.expires_at {
            return Err(ServiceError::Coded {
                code: ErrorCode::SessionNotFound,
                message: "credits hold not found or expired".into(),
            });
        }

        if hold.user_id != expected_user_id {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidPaymentProof,
                message: "credits hold does not match user".into(),
            });
        }

        if hold.resource_id != resource_id {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidPaymentProof,
                message: "credits hold does not match cart".into(),
            });
        }

        if hold.amount != cart.total.atomic || hold.amount_asset != cart.total.asset.code {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidPaymentProof,
                message: "credits hold does not match required amount".into(),
            });
        }

        // Capture the hold via cedros-login
        // This atomically deducts the credits from the user's balance
        client.capture_hold(hold_id).await.map_err(|e| {
            use crate::services::cedros_login::CedrosLoginError;
            match e {
                CedrosLoginError::HoldNotFound(_) => ServiceError::Coded {
                    code: ErrorCode::SessionNotFound,
                    message: "credits hold not found or expired".into(),
                },
                CedrosLoginError::HoldAlreadyProcessed(_) => ServiceError::Coded {
                    code: ErrorCode::InvalidPaymentProof,
                    message: "credits hold already captured or released".into(),
                },
                CedrosLoginError::InsufficientCredits { required, available } => {
                    ServiceError::Coded {
                        code: ErrorCode::InsufficientCredits,
                        message: format!(
                            "insufficient credits: required {}, available {}",
                            required, available
                        ),
                    }
                }
                _ => ServiceError::Coded {
                    code: ErrorCode::VerificationFailed,
                    message: format!("credits capture failed: {}", e),
                },
            }
        })?;

        let user_id = if let Some(u) = user_id_override {
            Some(u.to_string())
        } else if let Some(w) = wallet {
            self.resolve_user_id_from_wallet(w).await
        } else {
            None
        };
        let user_id_for_event = user_id.clone();

        // Record cart-level payment with hold_id as signature
        let payment = PaymentTransaction {
            signature: signature.clone(),
            tenant_id: cart.tenant_id.clone(),
            resource_id: resource_id.clone(),
            wallet: wallet.map(String::from).unwrap_or_default(),
            user_id,
            amount: cart.total.clone(),
            created_at: Utc::now(),
            metadata: {
                let mut m = HashMap::new();
                m.insert("hold_id".to_string(), hold_id.to_string());
                m
            },
        };

        // Record payment with retry
        let mut last_error = None;
        let mut payment_recorded_new = false;
        for attempt in 0..3 {
            match self.store.try_record_payment(payment.clone()).await {
                Ok(true) => {
                    if attempt > 0 {
                        tracing::info!(
                            attempt = attempt + 1,
                            cart_id = %cart_id,
                            "Cart credits payment recording succeeded after retry"
                        );
                    }
                    last_error = None;
                    payment_recorded_new = true;
                    break;
                }
                Ok(false) => {
                    // Already recorded by concurrent request - idempotent success
                    debug!(
                        hold_id = %hold_id,
                        cart_id = %cart_id,
                        "Cart credits payment already recorded by concurrent request"
                    );
                    last_error = None;
                    payment_recorded_new = false;
                    break;
                }
                Err(e) => {
                    last_error = Some(e);
                    if attempt < 2 {
                        let delay_ms = 100 * (1 << attempt);
                        tracing::warn!(
                            attempt = attempt + 1,
                            delay_ms = delay_ms,
                            cart_id = %cart_id,
                            "Cart credits payment recording failed, retrying"
                        );
                        tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
                    }
                }
            }
        }
        if let Some(e) = last_error {
            // CRITICAL: Hold was captured but recording failed
            // The credits are already deducted - requires manual reconciliation
            tracing::error!(
                error = %e,
                hold_id = %hold_id,
                cart_id = %cart_id,
                amount = %cart.total.atomic,
                "CRITICAL: Cart credits payment recording failed after capture - requires manual reconciliation"
            );
            return Err(ServiceError::Coded {
                code: ErrorCode::DatabaseError,
                message: "payment recording failed".into(),
            });
        }

        if payment_recorded_new {
            self.apply_gift_card_redemption_atomic(tenant_id, &cart).await;
        }

        // BUG-06 fix: mark_cart_paid BEFORE deleting hold. If mark_cart_paid fails,
        // the hold remains valid and can be retried. Previously, deleting the hold first
        // left a window where the hold was gone but the cart was not yet marked paid.
        let paid_by = wallet
            .unwrap_or(user_id_override.unwrap_or("credits"));
        match self.store.mark_cart_paid(tenant_id, cart_id, paid_by).await {
            Ok(()) => {}
            Err(crate::storage::StorageError::NotFound) => {
                warn!(cart_id = %cart_id, "Cart disappeared or already paid during credits capture");
            }
            Err(e) => {
                tracing::error!(
                    error = %e,
                    hold_id = %hold_id,
                    cart_id = %cart_id,
                    "CRITICAL: Failed to persist cart paid marker after credits capture"
                );
                return Err(ServiceError::Coded {
                    code: ErrorCode::DatabaseError,
                    message: "failed to persist cart paid marker".into(),
                });
            }
        }

        if let Err(e) = self.store.delete_credits_hold(tenant_id, hold_id).await {
            tracing::warn!(error = %e, hold_id = %hold_id, "Failed to delete credits hold binding");
        }

        // B-02 fix: Convert inventory reservations and persist order (matching x402 path)
        if let Err(e) = self
            .store
            .convert_inventory_reservations(tenant_id, cart_id, Utc::now())
            .await
        {
            warn!(error = %e, cart_id = %cart_id, "Failed to convert inventory reservations after cart credits payment");
        }

        self.persist_cart_order_and_inventory(
            tenant_id,
            &cart,
            &signature,
            wallet.map(String::from),
            user_id_for_event.clone(),
            "credits",
        )
        .await;

        // Increment coupon usage atomically for all applied coupons
        // Also track per-customer usage using user_id or wallet as customer_id
        let credits_customer_id = user_id_override
            .map(String::from)
            .or_else(|| wallet.map(String::from))
            .unwrap_or_default();
        for coupon_code in &cart.applied_coupons {
            let mut last_error = None;
            for attempt in 0..3 {
                match self
                    .coupons
                    .try_increment_usage_atomic(tenant_id, coupon_code)
                    .await
                {
                    Ok(true) => {
                        if attempt > 0 {
                            debug!(attempt = attempt + 1, coupon_code = %coupon_code, "Coupon usage incremented after retry");
                        } else {
                            debug!(coupon_code = %coupon_code, "Incremented coupon usage");
                        }
                        crate::observability::record_coupon_operation("increment", "success");
                        last_error = None;
                        break;
                    }
                    Ok(false) => {
                        warn!(
                            coupon_code = %coupon_code,
                            "Coupon usage limit reached during atomic increment (concurrent request won)"
                        );
                        crate::observability::record_coupon_operation("increment", "limit_reached");
                        last_error = None;
                        break;
                    }
                    Err(e) => {
                        last_error = Some(e);
                        if attempt < 2 {
                            tokio::time::sleep(std::time::Duration::from_millis(50)).await;
                        }
                    }
                }
            }
            if let Some(e) = last_error {
                error!(
                    error = %e,
                    coupon_code = %coupon_code,
                    cart_id = %cart_id,
                    "ALERT: Failed to increment coupon usage after 3 attempts for cart credits payment"
                );
                crate::observability::record_coupon_operation("increment", "failed");
            }

            // Track per-customer usage (best-effort, non-blocking)
            if !credits_customer_id.is_empty() {
                if let Err(e) = self
                    .coupons
                    .increment_customer_usage(tenant_id, coupon_code, &credits_customer_id)
                    .await
                {
                    warn!(
                        error = %e,
                        coupon_code = %coupon_code,
                        customer_id = %credits_customer_id,
                        "Failed to track per-customer coupon usage for credits payment"
                    );
                }
            }
        }

        // Send payment notification
        let event = PaymentEvent {
            event_id: crate::x402::utils::generate_event_id(),
            event_type: "payment.succeeded".into(),
            event_timestamp: Utc::now(),
            tenant_id: tenant_id.to_string(),
            resource_id: resource_id.clone(),
            method: "credits-cart".into(),
            stripe_session_id: None,
            stripe_customer: None,
            fiat_amount_cents: None,
            fiat_currency: None,
            crypto_atomic_amount: Some(cart.total.atomic),
            crypto_token: Some(cart.total.asset.code.clone()),
            wallet: wallet.map(String::from),
            user_id: user_id_for_event,
            proof_signature: Some(signature.clone()),
            metadata: {
                let mut m = HashMap::new();
                m.insert("hold_id".to_string(), hold_id.to_string());
                m.insert("cart_id".to_string(), cart_id.to_string());
                m
            },
            paid_at: Utc::now(),
        };

        self.call_payment_callback(&event).await;
        self.notifier.payment_succeeded(event).await;

        // Record cart payment metrics
        let duration_secs = start.elapsed().as_secs_f64();
        record_payment(
            "credits-cart",
            "cart",
            true,
            Some(cart.total.atomic),
            Some(&cart.total.asset.code),
            duration_secs,
        );

        info!(
            cart_id = %cart_id,
            hold_id = %hold_id,
            wallet = ?wallet,
            coupons_used = cart.applied_coupons.len(),
            "Cart credits payment authorized"
        );

        Ok(AuthorizationResult {
            granted: true,
            method: Some("credits-cart".into()),
            wallet: wallet.map(String::from),
            quote: None,
            settlement: None,
            subscription: None,
        })
    }

    /// Persist order and decrement inventory for a completed cart payment (best-effort).
    /// Shared by x402 and credits cart paths to ensure consistent behavior (B-02 fix).
    async fn persist_cart_order_and_inventory(
        &self,
        tenant_id: &str,
        cart: &CartQuote,
        purchase_id: &str,
        customer: Option<String>,
        user_id: Option<String>,
        source: &str,
    ) {
        let mut order_metadata = HashMap::new();
        if !cart.applied_coupons.is_empty() {
            order_metadata.insert("coupon_codes".to_string(), cart.applied_coupons.join(","));
        }
        if let Some(code) = cart.metadata.get("gift_card_code") {
            order_metadata.insert("gift_card_code".to_string(), code.clone());
        }
        if let Some(amount) = cart.metadata.get("gift_card_applied_amount") {
            order_metadata.insert("gift_card_applied_amount".to_string(), amount.clone());
        }
        if let Some(currency) = cart.metadata.get("gift_card_currency") {
            order_metadata.insert("gift_card_currency".to_string(), currency.clone());
        }

        let items: Vec<OrderItem> = cart
            .items
            .iter()
            .map(|i| OrderItem {
                product_id: i.resource_id.clone(),
                variant_id: i.variant_id.clone(),
                quantity: i.quantity,
            })
            .collect();

        let now = Utc::now();
        let order_id = uuid::Uuid::new_v4().to_string();
        let order = Order {
            id: order_id.clone(),
            tenant_id: tenant_id.to_string(),
            source: source.to_string(),
            purchase_id: purchase_id.to_string(),
            resource_id: format!("cart:{}", cart.id),
            user_id,
            customer,
            status: "paid".to_string(),
            items: items.clone(),
            amount: cart.total.atomic,
            amount_asset: cart.total.asset.code.clone(),
            customer_email: None,
            customer_name: None,
            receipt_url: Some(format!("/receipt/{}", order_id)),
            shipping: None,
            metadata: order_metadata,
            created_at: now,
            updated_at: Some(now),
            status_updated_at: Some(now),
        };

        let order_for_messaging = order.clone();
        match self.store.try_store_order(order).await {
            Ok(true) => {
                self.notify_order_created(&order_for_messaging).await;
                let inventory_updates: Vec<(String, Option<String>, i32)> = items
                    .iter()
                    .filter(|item| item.quantity > 0)
                    .map(|item| (item.product_id.clone(), item.variant_id.clone(), item.quantity))
                    .collect();
                if !inventory_updates.is_empty() {
                    match self
                        .store
                        .update_inventory_batch(tenant_id, inventory_updates, Some("cart_paid"), Some("system"))
                        .await
                    {
                        Ok(results) => {
                            debug!(
                                updated_count = results.len(),
                                tenant_id = %tenant_id,
                                cart_id = %cart.id,
                                "Batch inventory update completed"
                            );
                        }
                        Err(e) => {
                            warn!(
                                error = %e,
                                tenant_id = %tenant_id,
                                cart_id = %cart.id,
                                "Batch inventory update failed"
                            );
                        }
                    }
                }
            }
            Ok(false) => {
                debug!(
                    purchase_id = %purchase_id,
                    cart_id = %cart.id,
                    "Order already exists; skipping inventory decrement"
                );
            }
            Err(e) => {
                warn!(
                    error = %e,
                    tenant_id = %tenant_id,
                    purchase_id = %purchase_id,
                    cart_id = %cart.id,
                    "Failed to store order"
                );
            }
        }
    }

    /// Atomically apply gift card redemption using balance deduction.
    /// SECURITY: Uses try_adjust_gift_card_balance to prevent race condition / over-redemption (H-001 fix).
    async fn apply_gift_card_redemption_atomic(&self, tenant_id: &str, cart: &CartQuote) {
        let code = match cart.metadata.get("gift_card_code") {
            Some(code) if !code.trim().is_empty() => code.trim().to_uppercase(),
            _ => return,
        };
        let applied = match cart
            .metadata
            .get("gift_card_applied_amount")
            .and_then(|v| v.parse::<i64>().ok())
        {
            Some(amount) if amount > 0 => amount,
            _ => {
                warn!(
                    cart_id = %cart.id,
                    "Gift card metadata missing or invalid applied amount; skipping redemption"
                );
                return;
            }
        };

        // Use atomic deduction to prevent race condition (H-001 fix)
        match self
            .store
            .try_adjust_gift_card_balance(tenant_id, &code, applied, Utc::now())
            .await
        {
            Ok(Some(new_balance)) => {
                info!(
                    cart_id = %cart.id,
                    gift_card_code = %code,
                    applied,
                    new_balance,
                    "Gift card balance atomically adjusted after cart payment"
                );
            }
            Ok(None) => {
                // Insufficient funds - gift card was likely used by concurrent request
                warn!(
                    cart_id = %cart.id,
                    gift_card_code = %code,
                    applied,
                    "Gift card had insufficient funds - possible concurrent usage or over-redemption attempt"
                );
            }
            Err(e) => {
                warn!(
                    error = %e,
                    cart_id = %cart.id,
                    gift_card_code = %code,
                    "Failed to adjust gift card balance after cart payment"
                );
            }
        }
    }
}

