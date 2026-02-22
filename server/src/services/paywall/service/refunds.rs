pub enum RefundRequestResult {
    Crypto(RefundQuote),
    Stripe(crate::models::StripeRefundRequest),
}

impl PaywallService {
    // ========================================================================
    // Refunds
    // ========================================================================

    /// Create a refund request
    /// Per spec (04-http-endpoints-refunds.md): Accepts reason and metadata for persistence
    pub async fn create_refund_request(
        &self,
        tenant_id: &str,
        original_signature: &str,
        recipient_wallet: Option<&str>,
        amount: Option<Money>,
        reason: Option<String>,
        metadata: Option<HashMap<String, String>>,
    ) -> ServiceResult<RefundRequestResult> {
        // Acquire per-purchase lock to prevent race conditions in cumulative refund validation.
        // Without this, concurrent requests could both read the same "total refunded" amount
        // and both succeed, exceeding the maximum refundable amount.
        let lock = self.refund_locks.get_lock(original_signature);
        let _guard = lock.lock().await;

        let now = Utc::now();

        // Look up original payment
        let original = self
            .store
            .get_payment(tenant_id, original_signature)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::TransactionNotFound,
                message: "original transaction not found".into(),
            })?
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::TransactionNotFound,
                message: "original transaction not found".into(),
            })?;

        // Stripe purchases use a different refund flow: create a server-side refund request
        // that an admin can process, which then creates a Stripe refund.
        if original.signature.starts_with(STRIPE_SIGNATURE_PREFIX) {
            if let Ok(Some(existing)) = self
                .store
                .get_pending_stripe_refund_request_by_original_purchase_id(
                    tenant_id,
                    original_signature,
                )
                .await
            {
                return Ok(RefundRequestResult::Stripe(existing));
            }

            let stripe_payment_intent_id = original
                .metadata
                .get("stripe_payment_intent_id")
                .cloned()
                .filter(|s| !s.is_empty())
                .ok_or_else(|| ServiceError::Coded {
                    code: ErrorCode::InvalidField,
                    message: "missing stripe_payment_intent_id for purchase".into(),
                })?;

            let request_id = generate_refund_id();
            let mut req_metadata = metadata.unwrap_or_default();
            req_metadata.insert("resource_id".to_string(), original.resource_id.clone());

            let req = crate::models::StripeRefundRequest {
                id: request_id,
                tenant_id: tenant_id.to_string(),
                original_purchase_id: original_signature.to_string(),
                stripe_payment_intent_id,
                stripe_refund_id: None,
                stripe_charge_id: None,
                amount: original.amount.atomic,
                currency: original.amount.asset.code.to_lowercase(),
                status: "pending".to_string(),
                reason,
                metadata: req_metadata,
                created_at: now,
                processed_by: None,
                processed_at: None,
                last_error: None,
            };

            self.store
                .store_stripe_refund_request(req.clone())
                .await
                .map_err(|e| {
                    ServiceError::Internal(format!(
                        "failed to persist stripe refund request {}: {}",
                        req.id, e
                    ))
                })?;

            return Ok(RefundRequestResult::Stripe(req));
        }

        // x402 refunds: create an on-chain refund quote

        // Get ALL existing refunds for this purchase (for cumulative tracking)
        let existing_refunds = self
            .store
            .get_all_refunds_for_purchase(tenant_id, original_signature)
            .await
            .map_err(|e| {
                ServiceError::Internal(format!(
                    "failed to load existing refunds for purchase {}: {}",
                    original_signature, e
                ))
            })?;

        // Check for pending (non-expired, non-finalized) refund - return it if exists
        for existing in &existing_refunds {
            if !existing.is_finalized() && existing.expires_at >= now {
                debug!(
                    refund_id = %existing.id,
                    "Returning existing pending refund request"
                );
                return Ok(RefundRequestResult::Crypto(existing.clone()));
            }
        }

        // Calculate total already refunded or pending
        // SECURITY: Must count BOTH processed refunds AND active pending refunds
        // to prevent double-spend attacks where multiple pending refunds are created
        let now = Utc::now();
        // SERV-002: Use checked_add to prevent overflow - sum() can silently wrap
        let total_refunded: i64 = existing_refunds
            .iter()
            .filter(|r| {
                // Count processed (executed) refunds
                if r.is_processed() {
                    return true;
                }
                // Count active pending refunds (not finalized, not expired)
                if !r.is_finalized() && !r.is_expired_at(now) {
                    return true;
                }
                // Don't count denied or expired refunds
                false
            })
            .map(|r| r.amount.atomic)
            .try_fold(0i64, |acc, x| acc.checked_add(x))
            .ok_or_else(|| ServiceError::Internal("refund total overflow".to_string()))?;

        // Use specified amount or remaining refundable amount
        let remaining = original.amount.atomic.saturating_sub(total_refunded);
        let refund_amount = match amount {
            Some(requested) => requested,
            None => {
                // Full refund = remaining amount
                let mut full_refund = original.amount.clone();
                full_refund.atomic = remaining;
                full_refund
            }
        };

        // SECURITY/CORRECTNESS: Refunds must use the same asset as the original purchase.
        // Otherwise atomic-unit comparisons are meaningless and can lead to wrong-token refunds.
        if refund_amount.asset.code != original.amount.asset.code {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidAmount,
                message: format!(
                    "refund token {} must match original purchase token {}",
                    refund_amount.asset.code, original.amount.asset.code
                ),
            });
        }

        // Validate cumulative refund amount doesn't exceed original
        if refund_amount.atomic > remaining {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidAmount,
                message: format!(
                    "refund amount {} exceeds remaining refundable amount {} (already refunded: {})",
                    refund_amount.atomic, remaining, total_refunded
                ),
            });
        }

        let refund_id = generate_refund_id();
        let now = Utc::now();
        let expires_at = now + to_chrono_duration(self.config.storage.refund_quote_ttl);

        let refund_quote = RefundQuote {
            id: refund_id,
            tenant_id: tenant_id.to_string(),
            original_purchase_id: original_signature.to_string(),
            recipient_wallet: recipient_wallet
                .ok_or_else(|| ServiceError::Coded {
                    code: ErrorCode::MissingField,
                    message: "recipient_wallet is required".into(),
                })?
                .to_string(),
            amount: refund_amount,
            reason,
            metadata: metadata.unwrap_or_default(),
            created_at: now,
            expires_at,
            processed_by: None,
            processed_at: None,
            signature: None,
        };

        // Store refund quote
        self.store
            .store_refund_quote(refund_quote.clone())
            .await
            .map_err(|e| {
                ServiceError::Internal(format!(
                    "failed to persist refund quote {}: {}",
                    refund_quote.id, e
                ))
            })?;

        Ok(RefundRequestResult::Crypto(refund_quote))
    }

    /// Process a refund (execute the refund transaction)
    pub async fn process_refund(
        &self,
        tenant_id: &str,
        refund_id: &str,
    ) -> ServiceResult<RefundQuote> {
        // CRITICAL: Acquire lock on refund_id to prevent concurrent processing.
        // Without this, concurrent calls could both read the refund as non-finalized,
        // both execute the transaction, and cause a double-spend.
        let lock = self.refund_locks.get_lock(refund_id);
        let _guard = lock.lock().await;

        // BUG-08: Single timestamp for the entire refund operation
        let now = Utc::now();

        let mut refund = self
            .store
            .get_refund_quote(tenant_id, refund_id)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::RefundNotFound,
                message: "refund not found".into(),
            })?
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::RefundNotFound,
                message: "refund not found".into(),
            })?;

        // Check expiry
        if now > refund.expires_at {
            return Err(ServiceError::Coded {
                code: ErrorCode::QuoteExpired,
                message: "refund quote expired".into(),
            });
        }

        // Check status - refund is pending if not yet finalized (approved or denied)
        if refund.is_finalized() {
            return Err(ServiceError::Coded {
                code: ErrorCode::RefundAlreadyProcessed,
                message: "refund already finalized".into(),
            });
        }

        // Get gasless builder
        let gasless_builder = self
            .gasless_builder
            .as_ref()
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::GaslessNotEnabled,
                message: "gasless transactions not enabled for refunds".into(),
            })?;

        // Parse recipient wallet
        let recipient_pubkey =
            Pubkey::from_str(&refund.recipient_wallet).map_err(|_| ServiceError::Coded {
                code: ErrorCode::InvalidWallet,
                message: "invalid recipient wallet address".into(),
            })?;

        // Get token mint from the refund amount asset
        let mint_str = refund
            .amount
            .asset
            .metadata
            .solana_mint
            .clone()
            .unwrap_or_else(|| self.config.x402.token_mint.clone());
        let mint = Pubkey::from_str(&mint_str).map_err(|_| ServiceError::Coded {
            code: ErrorCode::InvalidTokenMint,
            message: "invalid token mint address".into(),
        })?;

        // SAFETY: Persist "processing" state BEFORE on-chain send to prevent double-spend.
        // If we crash after send but before persist, the refund is already marked finalized.
        refund.processed_at = Some(now);
        refund.processed_by = gasless_builder.get_default_fee_payer();
        self.store
            .store_refund_quote(refund.clone())
            .await
            .map_err(|e| {
                ServiceError::Internal(format!(
                    "failed to mark refund {} as processing: {}",
                    refund_id, e
                ))
            })?;

        // Execute refund transaction (safe: DB already marks this as in-flight)
        let signature = gasless_builder
            .execute_refund(
                &recipient_pubkey,
                &mint,
                refund.amount.atomic as u64,
                self.config.x402.token_decimals,
            )
            .await
            .map_err(|e| match e {
                GaslessError::NoServerWallet => ServiceError::Coded {
                    code: ErrorCode::NoAvailableWallet,
                    message: "no server wallet available for refund".into(),
                },
                GaslessError::SendFailed(msg) => ServiceError::Coded {
                    code: ErrorCode::TransactionFailed,
                    message: format!("refund transaction failed: {}", msg),
                },
                _ => ServiceError::Internal(format!("refund execution error: {}", e)),
            })?;

        // Persist signature after successful on-chain send
        refund.signature = Some(signature.to_string());
        if let Err(e) = self.store.store_refund_quote(refund.clone()).await {
            // On-chain tx succeeded but DB update failed — log critical for manual reconciliation.
            // The refund is marked finalized (processed_at set) so it won't be double-spent.
            error!(
                refund_id = %refund_id,
                signature = %signature,
                error = %e,
                "CRITICAL: refund sent on-chain but signature not persisted — needs manual reconciliation"
            );
        }

        // Send webhook notification using RefundEvent (not PaymentEvent)
        let refund_event = crate::models::RefundEvent {
            event_id: crate::x402::utils::generate_event_id(),
            event_type: "refund.succeeded".into(),
            event_timestamp: now,
            tenant_id: refund.tenant_id.clone(),
            refund_id: refund.id.clone(),
            original_purchase_id: refund.original_purchase_id.clone(),
            recipient_wallet: refund.recipient_wallet.clone(),
            atomic_amount: refund.amount.atomic,
            token: refund.amount.asset.code.clone(),
            processed_by: refund.processed_by.clone().unwrap_or_default(),
            signature: signature.to_string(),
            reason: refund.reason.clone(),
            metadata: refund.metadata.clone(),
            refunded_at: now,
        };

        self.call_refund_callback(&refund_event).await;
        self.notifier.refund_succeeded(refund_event).await;

        info!(
            refund_id = %refund_id,
            recipient = %refund.recipient_wallet,
            signature = %signature,
            "Refund processed successfully"
        );

        Ok(refund)
    }

    /// Deny a refund request (admin operation)
    pub async fn deny_refund(
        &self,
        tenant_id: &str,
        refund_id: &str,
        reason: Option<&str>,
    ) -> ServiceResult<()> {
        // PS-001: Acquire lock to prevent race with process_refund()
        // Without this, concurrent deny + process could corrupt refund state
        let lock = self.refund_locks.get_lock(refund_id);
        let _guard = lock.lock().await;

        let mut refund = self
            .store
            .get_refund_quote(tenant_id, refund_id)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::RefundNotFound,
                message: "refund not found".into(),
            })?
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::RefundNotFound,
                message: "refund not found".into(),
            })?;

        // Check status - refund is pending if not yet finalized (approved or denied)
        if refund.is_finalized() {
            return Err(ServiceError::Coded {
                code: ErrorCode::RefundAlreadyProcessed,
                message: "refund already finalized".into(),
            });
        }

        // Mark refund as denied by setting a denial reason
        // We set processed_at to mark it as closed, but no signature means denied
        refund.processed_at = Some(Utc::now());
        // B-11: Only overwrite the customer's original reason if admin provides one.
        // This preserves the audit trail of why the customer requested the refund.
        if let Some(r) = reason {
            refund.reason = Some(r.to_string());
        }
        refund.signature = None; // No signature indicates denial

        self.store.store_refund_quote(refund).await.map_err(|e| {
            ServiceError::Internal(format!(
                "failed to persist denied refund {}: {}",
                refund_id, e
            ))
        })?;

        Ok(())
    }

    /// List all pending refund requests (admin operation)
    /// Per spec (19-services-paywall.md): Returns all unprocessed refund requests
    pub async fn list_pending_refunds(
        &self,
        tenant_id: &str,
        limit: i32,
    ) -> ServiceResult<Vec<RefundQuote>> {
        self.store
            .list_pending_refunds(tenant_id, limit)
            .await
            .map_err(|e| ServiceError::Internal(format!("failed to list pending refunds: {}", e)))
    }

    /// Generate an x402 quote for refund execution (called after admin approval)
    pub async fn generate_refund_quote(
        &self,
        tenant_id: &str,
        refund_id: &str,
    ) -> ServiceResult<RefundQuoteResponse> {
        let mut refund = self
            .store
            .get_refund_quote(tenant_id, refund_id)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::RefundNotFound,
                message: "refund not found".into(),
            })?
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::RefundNotFound,
                message: "refund not found".into(),
            })?;

        // Check if already finalized (approved or denied)
        if refund.is_finalized() {
            return Err(ServiceError::Coded {
                code: ErrorCode::RefundAlreadyProcessed,
                message: "refund already finalized".into(),
            });
        }

        // Refresh the expiry for a new quote
        let now = Utc::now();
        let expires_at = now + to_chrono_duration(self.config.storage.refund_quote_ttl);
        refund.expires_at = expires_at;

        // Update refund with new expiry
        self.store
            .store_refund_quote(refund.clone())
            .await
            .map_err(|e| {
                ServiceError::Internal(format!(
                    "failed to persist refreshed refund quote {}: {}",
                    refund_id, e
                ))
            })?;

        // Get token mint from the refund amount asset
        let mint_str = refund
            .amount
            .asset
            .metadata
            .solana_mint
            .clone()
            .unwrap_or_else(|| self.config.x402.token_mint.clone());

        // Derive the recipient's ATA (Associated Token Account)
        let recipient_wallet =
            Pubkey::from_str(&refund.recipient_wallet).map_err(|_| ServiceError::Coded {
                code: ErrorCode::InvalidWallet,
                message: "invalid recipient wallet address".into(),
            })?;
        let mint = Pubkey::from_str(&mint_str).map_err(|_| ServiceError::Coded {
            code: ErrorCode::InvalidTokenMint,
            message: "invalid token mint address".into(),
        })?;

        // Derive the ATA for the recipient
        let recipient_ata =
            crate::x402::utils::derive_ata(&recipient_wallet, &mint).map_err(|_| {
                ServiceError::Coded {
                    code: ErrorCode::InvalidWallet,
                    message: "failed to derive recipient token account".into(),
                }
            })?;

        // Get fee payer public key if gasless is enabled
        let fee_payer = if self.config.x402.gasless_enabled {
            self.gasless_builder
                .as_ref()
                .and_then(|g| g.get_default_fee_payer())
        } else {
            None
        };

        Ok(RefundQuoteResponse {
            refund_id: refund.id.clone(),
            scheme: "solana-spl-transfer".to_string(),
            network: self.config.x402.network.clone(),
            max_amount_required: refund.amount.atomic.to_string(),
            resource: refund.id.clone(),
            description: format!("Refund to wallet {}", refund.recipient_wallet),
            pay_to: recipient_ata.to_string(),
            asset: mint_str,
            max_timeout_seconds: 900,
            recipient_token_account: recipient_ata.to_string(),
            decimals: self.config.x402.token_decimals,
            token_symbol: refund.amount.asset.code.clone(),
            memo: format!("refund:{}", refund.id),
            fee_payer,
            expires_at,
        })
    }

    /// Authorize a refund payment (verify the refund transaction was executed correctly)
    ///
    /// This is called when the admin executes the refund and submits the X-PAYMENT header
    /// with the transaction proof.
    pub async fn authorize_refund(
        &self,
        tenant_id: &str,
        refund_id: &str,
        payment_header: &str,
    ) -> ServiceResult<AuthorizationResult> {
        // BUG-04 fix: Acquire lock to prevent concurrent authorize_refund calls
        // from firing duplicate webhooks. Matches process_refund/deny_refund pattern.
        let lock = self.refund_locks.get_lock(refund_id);
        let _guard = lock.lock().await;

        // BUG-08: Single timestamp for the entire authorize operation
        let now = Utc::now();

        // Parse payment proof
        let proof =
            crate::x402::parse_payment_proof(payment_header).map_err(|e| ServiceError::Coded {
                code: e,
                message: "invalid payment proof".into(),
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

        // Fetch refund quote
        let mut refund = self
            .store
            .get_refund_quote(tenant_id, refund_id)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::RefundNotFound,
                message: "refund not found".into(),
            })?
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::RefundNotFound,
                message: "refund not found".into(),
            })?;

        // Check if already finalized (approved or denied)
        if refund.is_finalized() {
            return Err(ServiceError::Coded {
                code: ErrorCode::RefundAlreadyProcessed,
                message: "refund already finalized".into(),
            });
        }

        // Check expiry
        if now > refund.expires_at {
            return Err(ServiceError::Coded {
                code: ErrorCode::QuoteExpired,
                message: "refund quote expired - please re-approve".into(),
            });
        }

        // Validate payer is server wallet (only server can execute refunds)
        // SECURITY: Require non-empty payer that matches a configured server wallet
        // CRITICAL: If no server wallets configured, refunds are DISABLED (fail closed)
        let server_wallets = &self.config.x402.server_wallets;
        if server_wallets.is_empty() {
            // No server wallets configured = refunds disabled
            // This is the secure default - cannot process refunds without proper auth
            tracing::error!("Refund attempted but no server_wallets configured - refunds disabled");
            return Err(ServiceError::Coded {
                code: ErrorCode::ConfigError,
                message: "refunds not available - server not configured".into(),
            });
        }

        let proof_wallet = &proof.payer;
        // Empty payer must fail - cannot bypass auth by omitting wallet.
        // SECURITY: Use constant-time comparison via SHA-256 hashing to avoid
        // leaking which server wallet is configured through timing side-channels.
        let payer_hash = Sha256::digest(proof_wallet.as_bytes());
        let is_server_wallet: bool = server_wallets.iter().fold(false, |acc, w| {
            let wallet_hash = Sha256::digest(w.as_bytes());
            let matches: bool = payer_hash.ct_eq(&wallet_hash).into();
            acc | matches
        });
        if proof_wallet.is_empty() || !is_server_wallet {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidPayer,
                message: "refund must be executed by server wallet".into(),
            });
        }

        // Get token mint for verification
        let mint_str = refund
            .amount
            .asset
            .metadata
            .solana_mint
            .clone()
            .unwrap_or_else(|| self.config.x402.token_mint.clone());

        // Derive recipient's ATA
        let recipient_wallet =
            Pubkey::from_str(&refund.recipient_wallet).map_err(|_| ServiceError::Coded {
                code: ErrorCode::InvalidWallet,
                message: "invalid recipient wallet".into(),
            })?;
        let mint = Pubkey::from_str(&mint_str).map_err(|_| ServiceError::Coded {
            code: ErrorCode::InvalidTokenMint,
            message: "invalid token mint".into(),
        })?;

        let recipient_ata =
            crate::x402::utils::derive_ata(&recipient_wallet, &mint).map_err(|_| {
                ServiceError::Coded {
                    code: ErrorCode::InvalidWallet,
                    message: "failed to derive recipient token account".into(),
                }
            })?;

        // Build requirement for verification (exact amount, recipient is customer)
        let requirement = Requirement {
            resource_id: format!("refund:{}", refund_id),
            amount_atomic: Some(
                u64::try_from(refund.amount.atomic).map_err(|_| ServiceError::Coded {
                    code: ErrorCode::InvalidAmount,
                    message: "refund amount must be non-negative".into(),
                })?,
            ),
            amount: refund.amount.to_major(),
            token_mint: Some(mint_str.clone()),
            recipient_owner: Some(refund.recipient_wallet.clone()),
            recipient_token_account: Some(recipient_ata.to_string()),
            network: self.config.x402.network.clone(),
            token_decimals: self.config.x402.token_decimals,
            allowed_tokens: vec![],
            quote_ttl: None,
            skip_preflight: self.config.x402.skip_preflight,
            commitment: self.config.x402.commitment.clone(),
        };

        // Verify the transaction
        let result = self
            .verifier
            .verify(proof.clone(), requirement)
            .await
            .map_err(|e| match e {
                VerifierError::AmountMismatch => ServiceError::Coded {
                    code: ErrorCode::AmountMismatch,
                    message: "refund amount does not match".into(),
                },
                VerifierError::InvalidRecipient => ServiceError::Coded {
                    code: ErrorCode::InvalidRecipient,
                    message: "refund sent to wrong recipient".into(),
                },
                _ => ServiceError::Coded {
                    code: ErrorCode::VerificationFailed,
                    message: e.to_string(),
                },
            })?;

        // Refunds must be exact (no tips / no overpayment). The verifier is lenient for
        // general payments, so we enforce exact atomic matching here.
        if result.amount != refund.amount.atomic {
            return Err(ServiceError::Coded {
                code: ErrorCode::AmountMismatch,
                message: "refund amount does not match".into(),
            });
        }

        // Mark refund as processed
        refund.processed_at = Some(now);
        refund.processed_by = Some(result.wallet.clone());
        refund.signature = Some(result.signature.clone());

        self.store
            .store_refund_quote(refund.clone())
            .await
            .map_err(|e| {
                ServiceError::Internal(format!(
                    "failed to persist authorized refund {}: {}",
                    refund_id, e
                ))
            })?;

        let event = build_refund_succeeded_event(&refund, &result.wallet, &result.signature, now);

        self.call_refund_callback(&event).await;
        self.notifier.refund_succeeded(event).await;

        info!(
            refund_id = %refund_id,
            recipient = %refund.recipient_wallet,
            signature = %result.signature,
            "Refund authorized"
        );

        Ok(AuthorizationResult {
            granted: true,
            method: Some("x402-refund".into()),
            wallet: Some(result.wallet),
            quote: None,
            settlement: None,
            subscription: None,
        })
    }
}

fn build_refund_succeeded_event(
    refund: &RefundQuote,
    processed_by: &str,
    signature: &str,
    now: chrono::DateTime<Utc>,
) -> crate::models::RefundEvent {
    crate::models::RefundEvent {
        event_id: crate::x402::utils::generate_event_id(),
        event_type: "refund.succeeded".into(),
        event_timestamp: now,
        tenant_id: refund.tenant_id.clone(),
        refund_id: refund.id.clone(),
        original_purchase_id: refund.original_purchase_id.clone(),
        recipient_wallet: refund.recipient_wallet.clone(),
        atomic_amount: refund.amount.atomic,
        token: refund.amount.asset.code.clone(),
        processed_by: processed_by.to_string(),
        signature: signature.to_string(),
        reason: refund.reason.clone(),
        metadata: HashMap::new(),
        refunded_at: now,
    }
}
