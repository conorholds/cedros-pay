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

    /// Release a server-managed credits hold owned by the authenticated user.
    pub async fn release_credits_hold_for_user(
        &self,
        tenant_id: &str,
        hold_id: &str,
        user_id: &str,
    ) -> ServiceResult<()> {
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

        if hold.user_id != user_id {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidPaymentProof,
                message: "credits hold does not match user".into(),
            });
        }

        match client.release_hold(hold_id).await {
            Ok(())
            | Err(crate::services::cedros_login::CedrosLoginError::HoldNotFound(_))
            | Err(crate::services::cedros_login::CedrosLoginError::HoldAlreadyProcessed(_)) => {}
            Err(e) => {
                return Err(ServiceError::Coded {
                    code: ErrorCode::VerificationFailed,
                    message: format!("credits release failed: {}", e),
                });
            }
        }

        self.store
            .delete_credits_hold(tenant_id, hold_id)
            .await
            .map_err(|e| ServiceError::Coded {
                code: ErrorCode::DatabaseError,
                message: format!("failed to delete credits hold binding: {e}"),
            })?;

        Ok(())
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

    pub(crate) async fn prepare_credits_capture_recovery_marker(
        &self,
        tenant_id: &str,
        hold_id: &str,
        resource_id: &str,
        wallet: &str,
        user_id: Option<String>,
        amount: Money,
    ) -> ServiceResult<()> {
        let marker = PaymentTransaction {
            signature: credits_capture_recovery_signature(hold_id),
            tenant_id: tenant_id.to_string(),
            resource_id: resource_id.to_string(),
            wallet: wallet.to_string(),
            user_id,
            amount,
            created_at: Utc::now(),
            metadata: {
                let mut metadata = HashMap::new();
                metadata.insert("hold_id".to_string(), hold_id.to_string());
                metadata.insert("capture_pending_record".to_string(), "true".to_string());
                metadata
            },
        };

        match self.store.try_record_payment(marker.clone()).await {
            Ok(true) => Ok(()),
            Ok(false) => {
                let existing = self
                    .store
                    .get_payment(tenant_id, &marker.signature)
                    .await
                    .map_err(|e| ServiceError::Coded {
                        code: ErrorCode::DatabaseError,
                        message: format!("failed to load credits recovery marker: {e}"),
                    })?
                    .ok_or(ServiceError::Coded {
                        code: ErrorCode::DatabaseError,
                        message: "credits recovery marker missing after claim conflict".into(),
                    })?;

                if !credits_payment_matches(&existing, &marker) {
                    return Err(ServiceError::Coded {
                        code: ErrorCode::InvalidPaymentProof,
                        message: "credits capture recovery marker does not match payment details"
                            .into(),
                    });
                }

                Ok(())
            }
            Err(e) => Err(ServiceError::Coded {
                code: ErrorCode::DatabaseError,
                message: format!("failed to persist credits recovery marker: {e}"),
            }),
        }
    }

    pub(crate) async fn clear_credits_capture_recovery_marker(
        &self,
        tenant_id: &str,
        hold_id: &str,
    ) {
        if let Err(e) = self
            .store
            .delete_payment(tenant_id, &credits_capture_recovery_signature(hold_id))
            .await
        {
            warn!(
                error = %e,
                hold_id = %hold_id,
                "Failed to clear credits capture recovery marker"
            );
        }
    }

    pub(crate) async fn finalize_credits_capture_payment(
        &self,
        tenant_id: &str,
        hold_id: &str,
        payment: PaymentTransaction,
    ) -> ServiceResult<(bool, PaymentTransaction)> {
        let mut last_error = None;
        for attempt in 0..3 {
            match self.store.try_record_payment(payment.clone()).await {
                Ok(true) => {
                    if attempt > 0 {
                        tracing::info!(
                            attempt = attempt + 1,
                            hold_id = %hold_id,
                            "Credits payment recording succeeded after retry"
                        );
                    }
                    self.clear_credits_capture_recovery_marker(tenant_id, hold_id)
                        .await;
                    return Ok((true, payment));
                }
                Ok(false) => {
                    let existing = self
                        .store
                        .get_payment(tenant_id, &payment.signature)
                        .await
                        .map_err(|e| ServiceError::Coded {
                            code: ErrorCode::DatabaseError,
                            message: format!("failed to load recorded credits payment: {e}"),
                        })?
                        .ok_or(ServiceError::Coded {
                            code: ErrorCode::DatabaseError,
                            message: "credits payment missing after duplicate record result".into(),
                        })?;

                    self.clear_credits_capture_recovery_marker(tenant_id, hold_id)
                        .await;
                    return Ok((false, existing));
                }
                Err(e) => {
                    last_error = Some(e);
                    if attempt < 2 {
                        let delay_ms = 100 * (1 << attempt);
                        tracing::warn!(
                            attempt = attempt + 1,
                            delay_ms = delay_ms,
                            hold_id = %hold_id,
                            "Credits payment recording failed, retrying"
                        );
                        tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
                    }
                }
            }
        }

        let error = last_error.expect("last_error set when retries exhausted");
        tracing::error!(
            error = %error,
            hold_id = %hold_id,
            payment_signature = %payment.signature,
            "CRITICAL: credits payment recording failed after capture; recovery marker retained"
        );
        Err(ServiceError::Coded {
            code: ErrorCode::DatabaseError,
            message: "payment recording failed".into(),
        })
    }

    pub(crate) async fn recover_captured_credits_payment(
        &self,
        tenant_id: &str,
        hold_id: &str,
        payment: PaymentTransaction,
    ) -> ServiceResult<Option<(bool, PaymentTransaction)>> {
        if let Some(existing_payment) = self
            .store
            .get_payment(tenant_id, &payment.signature)
            .await
            .map_err(|e| ServiceError::Coded {
                code: ErrorCode::DatabaseError,
                message: format!("failed to load recorded credits payment: {e}"),
            })?
        {
            if existing_payment.resource_id != payment.resource_id {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidPaymentProof,
                    message: "credits hold already used for different resource".into(),
                });
            }

            self.clear_credits_capture_recovery_marker(tenant_id, hold_id)
                .await;
            return Ok(Some((false, existing_payment)));
        }

        let recovery_marker = self
            .store
            .get_payment(tenant_id, &credits_capture_recovery_signature(hold_id))
            .await
            .map_err(|e| ServiceError::Coded {
                code: ErrorCode::DatabaseError,
                message: format!("failed to load credits recovery marker: {e}"),
            })?;

        let Some(marker) = recovery_marker else {
            return Ok(None);
        };

        if !credits_payment_matches(&marker, &payment) {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidPaymentProof,
                message: "credits recovery marker does not match payment details".into(),
            });
        }

        let (recorded_new, recorded) = self
            .finalize_credits_capture_payment(tenant_id, hold_id, payment)
            .await?;
        Ok(Some((recorded_new, recorded)))
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

        let user_id = if let Some(u) = user_id_override {
            Some(u.to_string())
        } else if let Some(w) = wallet {
            self.resolve_user_id_from_wallet(w).await
        } else {
            None
        };
        let user_id_for_event = user_id.clone();

        let wallet_for_payment = wallet.map(String::from).unwrap_or_default();
        let payment = PaymentTransaction {
            signature: signature.clone(),
            tenant_id: tenant_id.to_string(),
            resource_id: resource.to_string(),
            wallet: wallet_for_payment.clone(),
            user_id,
            amount: required_price.clone(),
            created_at: Utc::now(),
            metadata: {
                let mut m = HashMap::new();
                m.insert("hold_id".to_string(), hold_id.to_string());
                m
            },
        };

        self.prepare_credits_capture_recovery_marker(
            tenant_id,
            hold_id,
            resource,
            &wallet_for_payment,
            payment.user_id.clone(),
            required_price.clone(),
        )
        .await?;

        // Capture the hold via cedros-login. A durable recovery marker already exists.
        match client.capture_hold(hold_id).await {
            Ok(()) => {}
            Err(crate::services::cedros_login::CedrosLoginError::HoldAlreadyProcessed(_)) => {
                if let Some((_, existing_payment)) = self
                    .recover_captured_credits_payment(tenant_id, hold_id, payment.clone())
                    .await?
                {
                    debug!(
                        hold_id = %hold_id,
                        resource = %resource,
                        "Recovered credits payment after prior successful capture"
                    );
                    if let Err(e) = self.store.delete_credits_hold(tenant_id, hold_id).await {
                        tracing::warn!(
                            error = %e,
                            hold_id = %hold_id,
                            "Failed to delete credits hold binding after recovered capture"
                        );
                    }
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
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidPaymentProof,
                    message: "credits hold already captured or released".into(),
                });
            }
            Err(crate::services::cedros_login::CedrosLoginError::HoldNotFound(_)) => {
                self.clear_credits_capture_recovery_marker(tenant_id, hold_id)
                    .await;
                return Err(ServiceError::Coded {
                    code: ErrorCode::SessionNotFound,
                    message: "credits hold not found or expired".into(),
                });
            }
            Err(crate::services::cedros_login::CedrosLoginError::InsufficientCredits {
                required,
                available,
            }) => {
                self.clear_credits_capture_recovery_marker(tenant_id, hold_id)
                    .await;
                return Err(ServiceError::Coded {
                    code: ErrorCode::InsufficientCredits,
                    message: format!(
                        "insufficient credits: required {}, available {}",
                        required, available
                    ),
                });
            }
            Err(e) => {
                self.clear_credits_capture_recovery_marker(tenant_id, hold_id)
                    .await;
                return Err(ServiceError::Coded {
                    code: ErrorCode::VerificationFailed,
                    message: format!("credits capture failed: {}", e),
                });
            }
        }
        let (_, recorded_payment) = self
            .finalize_credits_capture_payment(tenant_id, hold_id, payment)
            .await?;

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
            wallet: (!recorded_payment.wallet.is_empty()).then_some(recorded_payment.wallet),
            quote: None,
            settlement: None,
            subscription: None,
        })
    }
}

fn credits_capture_recovery_signature(hold_id: &str) -> String {
    format!("credits-recovery:{hold_id}")
}

fn credits_payment_matches(left: &PaymentTransaction, right: &PaymentTransaction) -> bool {
    left.resource_id == right.resource_id
        && left.wallet == right.wallet
        && left.user_id == right.user_id
        && left.amount.to_atomic() == right.amount.to_atomic()
        && left.amount.asset.code == right.amount.asset.code
}
