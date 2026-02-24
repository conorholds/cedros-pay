use super::*;

impl PaywallService {
    /// Authorize via cedros-login credits hold
    ///
    /// Captures a pre-created credits hold to complete payment.
    /// The hold must have been created via the credits API before authorization.
    pub(crate) async fn authorize_credits(
        &self,
        tenant_id: &str,
        resource: &str,
        hold_id: &str,
        coupon_code: Option<&str>,
        wallet: Option<&str>,
    ) -> ServiceResult<AuthorizationResult> {
        self.authorize_credits_internal(tenant_id, resource, hold_id, coupon_code, wallet, None)
            .await
    }

    /// Create a server-managed credits hold via cedros-login and persist the binding.
    pub async fn create_credits_hold_for_user(
        &self,
        tenant_id: &str,
        resource: &str,
        coupon_code: Option<&str>,
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

        // Lookup product to get pricing
        let product = self
            .products
            .get_product(tenant_id, resource)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::ResourceNotFound,
                message: "resource not found".into(),
            })?;

        let applied_coupons = self
            .select_coupons(tenant_id, resource, coupon_code, Some("credits"))
            .await?;
        let rounding_mode = self.get_rounding_mode();

        // Credits are pegged 1:1 to a configured SPL token; use the product's crypto price.
        let base_price = product
            .crypto_price
            .clone()
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::InvalidAmount,
                message: "product has no crypto price for credits payment".into(),
            })?;
        let required_price = stack_coupons_on_money(base_price, &applied_coupons, rounding_mode);

        // SECURITY: Scope idempotency to the authenticated user.
        // If cedros-login idempotency keys are globally scoped, omitting user_id can allow cross-user
        // collisions that return a hold created for a different user.
        let idempotency_key = format!("quote:{}:{}:{}", tenant_id, user_id, resource);
        let hold_resp = client
            .create_hold(
                user_id,
                required_price.atomic,
                &required_price.asset.code,
                &idempotency_key,
                Some("resource"),
                Some(resource),
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
            tenant_id: tenant_id.to_string(),
            user_id: user_id.to_string(),
            resource_id: resource.to_string(),
            amount: required_price.atomic,
            amount_asset: required_price.asset.code.clone(),
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

    pub async fn authorize_credits_for_user(
        &self,
        tenant_id: &str,
        resource: &str,
        hold_id: &str,
        coupon_code: Option<&str>,
        wallet: Option<&str>,
        user_id: &str,
    ) -> ServiceResult<AuthorizationResult> {
        self.authorize_credits_internal(
            tenant_id,
            resource,
            hold_id,
            coupon_code,
            wallet,
            Some(user_id),
        )
        .await
    }

    async fn authorize_credits_internal(
        &self,
        tenant_id: &str,
        resource: &str,
        hold_id: &str,
        coupon_code: Option<&str>,
        wallet: Option<&str>,
        user_id_override: Option<&str>,
    ) -> ServiceResult<AuthorizationResult> {
        let start = Instant::now();
        let lock = self
            .refund_locks
            .get_lock(&format!("credits-hold:{hold_id}"));
        let _guard = lock.lock().await;

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
        if let Ok(Some(existing_payment)) = self.store.get_payment(tenant_id, &signature).await {
            if existing_payment.resource_id != resource {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidPaymentProof,
                    message: "hold already used for different resource".into(),
                });
            }
            // Payment already processed - return success (idempotent)
            debug!(
                hold_id = %hold_id,
                resource = %resource,
                "Credits payment already processed, returning cached success"
            );
            return Ok(AuthorizationResult {
                granted: true,
                method: Some("credits".into()),
                wallet: (!existing_payment.wallet.is_empty()).then_some(existing_payment.wallet),
                quote: None,
                settlement: None,
                subscription: None,
            });
        }

        // Lookup product to get pricing
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
            .select_coupons(tenant_id, resource, coupon_code, Some("credits"))
            .await?;
        let rounding_mode = self.get_rounding_mode();

        // Credits are pegged 1:1 to a configured SPL token; use the product's crypto price.
        let base_price = product
            .crypto_price
            .clone()
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::InvalidAmount,
                message: "product has no crypto price for credits payment".into(),
            })?;

        let required_price = stack_coupons_on_money(base_price, &applied_coupons, rounding_mode);

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

        if hold.resource_id != resource {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidPaymentProof,
                message: "credits hold does not match resource".into(),
            });
        }

        if hold.amount != required_price.atomic || hold.amount_asset != required_price.asset.code {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidPaymentProof,
                message: "credits hold does not match required amount".into(),
            });
        }

        // Capture the hold via cedros-login
        // This atomically deducts the credits from the user's balance
        match client.capture_hold(hold_id).await {
            Ok(()) => {}
            Err(crate::services::cedros_login::CedrosLoginError::HoldAlreadyProcessed(_)) => {
                if let Ok(Some(existing_payment)) =
                    self.store.get_payment(tenant_id, &signature).await
                {
                    if existing_payment.resource_id == resource {
                        debug!(
                            hold_id = %hold_id,
                            resource = %resource,
                            "Credits hold already captured; returning idempotent success"
                        );
                        return Ok(AuthorizationResult {
                            granted: true,
                            method: Some("credits".into()),
                            wallet: (!existing_payment.wallet.is_empty())
                                .then_some(existing_payment.wallet),
                            quote: None,
                            settlement: None,
                            subscription: None,
                        });
                    }
                }
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidPaymentProof,
                    message: "credits hold already captured or released".into(),
                });
            }
            Err(crate::services::cedros_login::CedrosLoginError::HoldNotFound(_)) => {
                return Err(ServiceError::Coded {
                    code: ErrorCode::SessionNotFound,
                    message: "credits hold not found or expired".into(),
                });
            }
            Err(crate::services::cedros_login::CedrosLoginError::InsufficientCredits {
                required,
                available,
            }) => {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InsufficientCredits,
                    message: format!(
                        "insufficient credits: required {}, available {}",
                        required, available
                    ),
                });
            }
            Err(e) => {
                return Err(ServiceError::Coded {
                    code: ErrorCode::VerificationFailed,
                    message: format!("credits capture failed: {}", e),
                });
            }
        }

        let user_id = if let Some(u) = user_id_override {
            Some(u.to_string())
        } else if let Some(w) = wallet {
            self.resolve_user_id_from_wallet(w).await
        } else {
            None
        };
        let user_id_for_event = user_id.clone();

        // Record payment with hold_id as signature
        let payment = PaymentTransaction {
            signature: signature.clone(),
            tenant_id: tenant_id.to_string(),
            resource_id: resource.to_string(),
            wallet: wallet.map(String::from).unwrap_or_default(),
            user_id,
            amount: required_price.clone(),
            created_at: Utc::now(),
            metadata: {
                let mut m = HashMap::new();
                m.insert("hold_id".to_string(), hold_id.to_string());
                m
            },
        };

        // Record payment with retry
        let mut last_error = None;
        for attempt in 0..3 {
            match self.store.try_record_payment(payment.clone()).await {
                Ok(true) => {
                    if attempt > 0 {
                        tracing::info!(
                            attempt = attempt + 1,
                            "Credits payment recording succeeded after retry"
                        );
                    }
                    last_error = None;
                    break;
                }
                Ok(false) => {
                    // Already recorded by concurrent request - idempotent success
                    debug!(
                        hold_id = %hold_id,
                        resource = %resource,
                        "Credits payment already recorded by concurrent request"
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
                            "Credits payment recording failed, retrying"
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
                resource = %resource,
                amount = %required_price.atomic,
                "CRITICAL: Credits payment recording failed after capture - requires manual reconciliation"
            );
            return Err(ServiceError::Coded {
                code: ErrorCode::DatabaseError,
                message: "payment recording failed".into(),
            });
        }

        // Best-effort cleanup: the hold is already captured; remove the binding so it can't
        // be replayed through this API even if the cedros-login hold ID leaks.
        if let Err(e) = self.store.delete_credits_hold(tenant_id, hold_id).await {
            tracing::warn!(error = %e, hold_id = %hold_id, "Failed to delete credits hold binding");
        }

        // Increment coupon usage
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
                        hold_id = %hold_id,
                        "RECONCILE: Coupon usage limit reached after credits payment capture"
                    );
                }
                Err(e) => {
                    error!(
                        error = %e,
                        code = %coupon.code,
                        resource = %resource,
                        "ALERT: Failed to increment coupon usage for credits payment"
                    );
                    crate::observability::record_coupon_operation("increment", "failed");
                }
            }
        }

        // Send payment notification
        let event = PaymentEvent {
            event_id: crate::x402::utils::generate_event_id(),
            event_type: "payment.succeeded".into(),
            event_timestamp: Utc::now(),
            tenant_id: tenant_id.to_string(),
            resource_id: resource.to_string(),
            method: "credits".into(),
            stripe_session_id: None,
            stripe_customer: None,
            fiat_amount_cents: None,
            fiat_currency: None,
            crypto_atomic_amount: Some(required_price.atomic),
            crypto_token: Some(required_price.asset.code.clone()),
            wallet: wallet.map(String::from),
            user_id: user_id_for_event,
            proof_signature: Some(signature.clone()),
            metadata: {
                let mut m = HashMap::new();
                m.insert("hold_id".to_string(), hold_id.to_string());
                m
            },
            paid_at: Utc::now(),
        };

        self.call_payment_callback(&event).await;
        self.notifier.payment_succeeded(event).await;

        // Record payment metrics
        let duration_secs = start.elapsed().as_secs_f64();
        record_payment(
            "credits",
            "resource",
            true,
            Some(required_price.atomic),
            Some(&required_price.asset.code),
            duration_secs,
        );

        info!(
            resource = %resource,
            hold_id = %hold_id,
            wallet = ?wallet,
            "Credits payment authorized"
        );

        Ok(AuthorizationResult {
            granted: true,
            method: Some("credits".into()),
            wallet: wallet.map(String::from),
            quote: None,
            settlement: None,
            subscription: None,
        })
    }
}
