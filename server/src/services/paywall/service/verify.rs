impl PaywallService {
    // ========================================================================
    // Gasless and Verification Methods
    // ========================================================================

    /// Build a gasless transaction for server fee payment
    pub async fn build_gasless_transaction(
        &self,
        tenant_id: &str,
        resource_id: &str,
        user_wallet: &str,
        fee_payer: Option<&str>,
        coupon_code: Option<&str>,
    ) -> ServiceResult<GaslessTransactionData> {
        if !self.config.x402.gasless_enabled {
            return Err(ServiceError::Coded {
                code: ErrorCode::GaslessNotEnabled,
                message: "gasless transactions not enabled".into(),
            });
        }

        // Get gasless builder
        let gasless_builder = self
            .gasless_builder
            .as_ref()
            .ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::GaslessNotEnabled,
                message: "gasless builder not initialized".into(),
            })?;

        // Validate fee payer if specified
        if let Some(fp) = fee_payer {
            let available = gasless_builder.get_fee_payers();
            if !available.iter().any(|w| w == fp) {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidWallet,
                    message: "specified fee payer not available".into(),
                });
            }
        }

        // Parse user wallet
        let user_pubkey = Pubkey::from_str(user_wallet).map_err(|_| ServiceError::Coded {
            code: ErrorCode::InvalidWallet,
            message: "invalid user wallet address".into(),
        })?;

        // Lookup product or cart
        let (amount, recipient_ata, memo) = if let Some(cart_id) = resource_id.strip_prefix("cart:")
        {
            // Cart payment
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

            // Check cart expiry
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

            // Cart uses platform payment address - ATA will be derived below
            (cart.total, None, Some(format!("cart:{}", cart.id)))
        } else {
            // Single product payment
            let product = self
                .products
                .get_product(tenant_id, resource_id)
                .await
                .map_err(|_| ServiceError::Coded {
                    code: ErrorCode::ResourceNotFound,
                    message: "resource not found".into(),
                })?;

            let crypto_price = product.crypto_price.ok_or_else(|| ServiceError::Coded {
                code: ErrorCode::InvalidAmount,
                message: "product has no crypto price".into(),
            })?;

            // Apply coupons and round to cents (like Go does)
            let coupons = self
                .select_coupons(tenant_id, resource_id, coupon_code, Some("x402"))
                .await;
            let discounted =
                stack_coupons_on_money(crypto_price, &coupons, self.get_rounding_mode())
                    .round_up_to_cents();

            (
                discounted,
                product.crypto_account.clone(),
                product.memo_template.clone(),
            )
        };

        // Get token mint first (needed for ATA derivation)
        let mint_str = amount
            .asset
            .metadata
            .solana_mint
            .clone()
            .unwrap_or_else(|| self.config.x402.token_mint.clone());
        let mint = Pubkey::from_str(&mint_str).map_err(|_| ServiceError::Coded {
            code: ErrorCode::InvalidTokenMint,
            message: "invalid token mint address".into(),
        })?;

        // Derive recipient ATA - if crypto_account is set, use it directly
        // Otherwise derive from payment_address (owner) + token mint (like Go does)
        let recipient_ata_pubkey = if let Some(ref ata_str) = recipient_ata {
            // Product has explicit token account set
            Pubkey::from_str(ata_str).map_err(|_| ServiceError::Coded {
                code: ErrorCode::InvalidRecipient,
                message: "invalid recipient token account".into(),
            })?
        } else {
            // Derive ATA from payment address (owner) + token mint
            let owner = Pubkey::from_str(&self.config.x402.payment_address).map_err(|_| {
                ServiceError::Coded {
                    code: ErrorCode::InvalidRecipient,
                    message: "invalid payment address".into(),
                }
            })?;
            spl_associated_token_account::get_associated_token_address(&owner, &mint)
        };

        // Build gasless transaction using the builder
        let tx_data = gasless_builder
            .build_payment_transaction(
                &user_pubkey,
                &recipient_ata_pubkey,
                &mint,
                amount.atomic as u64,
                self.config.x402.token_decimals,
                memo.as_deref(),
            )
            .await
            .map_err(|e| match e {
                GaslessError::NoServerWallet => ServiceError::Coded {
                    code: ErrorCode::NoAvailableWallet,
                    message: "no server wallet available".into(),
                },
                GaslessError::RpcError(msg) => ServiceError::Coded {
                    code: ErrorCode::RpcError,
                    message: format!("RPC error: {}", msg),
                },
                _ => ServiceError::Internal(format!("failed to build transaction: {}", e)),
            })?;

        Ok(GaslessTransactionData {
            transaction: tx_data.transaction,
            fee_payer: tx_data.fee_payer,
            blockhash: tx_data.blockhash,
            last_valid_block_height: tx_data.last_valid_block_height,
            signers: tx_data.signers,
        })
    }

    /// Verify a payment proof and execute if needed
    pub async fn verify_payment(
        &self,
        tenant_id: &str,
        proof: crate::models::PaymentProof,
    ) -> ServiceResult<PaymentVerificationResult> {
        // Clone values upfront to avoid borrow issues when proof is moved
        let resource = proof.resource_id.clone();
        let sig = proof.signature.clone();
        let payer = proof.payer.clone();
        let resource_type = proof.resource_type.clone();

        // SECURITY: Validate signature format if provided to prevent invalid data in storage
        if !sig.is_empty() {
            validate_signature(&sig).map_err(|code| ServiceError::Coded {
                code,
                message: "invalid signature format - must be 88 base58 characters".into(),
            })?;
        }

        // Check if already processed
        // PS-002: Use get_payment to return the STORED wallet, not the request's payer
        if !sig.is_empty() {
            if let Ok(Some(existing_payment)) = self.store.get_payment(tenant_id, &sig).await {
                if existing_payment.resource_id != resource {
                    return Err(ServiceError::Coded {
                        code: ErrorCode::InvalidSignature,
                        message: "signature already used for different resource".into(),
                    });
                }
                return Ok(PaymentVerificationResult {
                    success: true,
                    tx_hash: Some(sig.clone()),
                    payer: Some(existing_payment.wallet),
                    error: None,
                });
            }
        }

        // Route to appropriate handler based on resource type
        match resource_type.as_str() {
            "cart" => {
                // Cart verification
                // PS-009: Removed unused sig_opt - authorize_cart gets signature from proof
                let cart_id = resource.strip_prefix("cart:").unwrap_or(&resource);
                let result = self.authorize_cart(tenant_id, cart_id, proof).await?;

                Ok(PaymentVerificationResult {
                    success: result.granted,
                    tx_hash: result.settlement.and_then(|s| s.tx_hash),
                    payer: if payer.is_empty() { None } else { Some(payer) },
                    error: None,
                })
            }
            "refund" => {
                // Refund verification
                let refund_id = resource.strip_prefix("refund:").unwrap_or(&resource);
                let _refund = self.process_refund(tenant_id, refund_id).await?;

                Ok(PaymentVerificationResult {
                    success: true,
                    tx_hash: if sig.is_empty() {
                        None
                    } else {
                        Some(sig.clone())
                    },
                    payer: if payer.is_empty() { None } else { Some(payer) },
                    error: None,
                })
            }
            "regular" | "" => {
                // Regular product verification - use pre-parsed proof directly
                // PS-009: Removed unused sig_opt - authorize_x402_with_proof gets signature from proof
                let result = self
                    .authorize_x402_with_proof(tenant_id, &resource, proof, None)
                    .await?;

                Ok(PaymentVerificationResult {
                    success: result.granted,
                    tx_hash: result.settlement.and_then(|s| s.tx_hash),
                    payer: result.wallet,
                    error: None,
                })
            }
            _ => Err(ServiceError::Coded {
                code: ErrorCode::InvalidResourceType,
                message: "invalid resourceType".into(),
            }),
        }
    }

    /// Verify cart payment specifically
    /// Per spec (02-http-endpoints.md): Verify cart payment with X-PAYMENT header
    pub async fn verify_cart_payment(
        &self,
        tenant_id: &str,
        cart_id: &str,
        proof: crate::models::PaymentProof,
    ) -> ServiceResult<PaymentVerificationResult> {
        // Clone values before moving proof
        let sig = proof.signature.clone();
        let payer = proof.payer.clone();

        // SECURITY: Require non-empty signature - cannot verify without transaction signature
        if sig.is_empty() {
            return Err(ServiceError::Coded {
                code: ErrorCode::InvalidPaymentProof,
                message: "payment signature is required".into(),
            });
        }

        // Check if already processed
        // PS-002: Use get_payment to return the STORED wallet, not the request's payer
        if let Ok(Some(existing_payment)) = self.store.get_payment(tenant_id, &sig).await {
            return Ok(PaymentVerificationResult {
                success: true,
                tx_hash: Some(sig.clone()),
                payer: Some(existing_payment.wallet),
                error: None,
            });
        }

        let result = self.authorize_cart(tenant_id, cart_id, proof).await?;

        Ok(PaymentVerificationResult {
            success: result.granted,
            tx_hash: result.settlement.and_then(|s| s.tx_hash),
            payer: if payer.is_empty() { None } else { Some(payer) },
            error: None,
        })
    }
}
