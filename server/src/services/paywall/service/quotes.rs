#[derive(Clone, Debug)]
pub(crate) struct CartQuoteItemInput {
    pub resource_id: String,
    pub variant_id: Option<String>,
    pub quantity: i64,
    pub metadata: HashMap<String, String>,
}

impl PaywallService {
    // ========================================================================
    // Quote Generation
    // ========================================================================

    /// Generate a payment quote for a single product
    pub async fn generate_quote(
        &self,
        tenant_id: &str,
        resource: &str,
        coupon_code: Option<&str>,
    ) -> ServiceResult<Quote> {
        // Lookup product
        let product = self
            .products
            .get_product(tenant_id, resource)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::ResourceNotFound,
                message: format!("resource not found: {}", resource),
            })?;

        if !product.active {
            return Err(ServiceError::Coded {
                code: ErrorCode::ResourceNotFound,
                message: "resource is not active".into(),
            });
        }

        // Collect applicable coupons
        let applied_coupons = self
            .select_coupons(tenant_id, resource, coupon_code, None)
            .await?;

        let rounding_mode = self.get_rounding_mode();
        let expires_at = Utc::now() + to_chrono_duration(self.config.paywall.quote_ttl);

        // Build crypto quote if product has crypto pricing
        let crypto_quote = self.build_crypto_quote(&product, &applied_coupons, rounding_mode)?;

        // Build Stripe option if product has fiat pricing
        let stripe_option = self.build_stripe_option(&product, &applied_coupons, rounding_mode);

        // Build Credits option if credits are enabled and product has crypto pricing
        let credits_option = self.build_credits_option(&product, &applied_coupons, rounding_mode);

        Ok(Quote {
            resource_id: resource.to_string(),
            expires_at,
            stripe: stripe_option,
            crypto: crypto_quote,
            credits: credits_option,
        })
    }

    /// Generate a payment quote for a cart of items
    pub async fn generate_cart_quote(
        &self,
        tenant_id: &str,
        items: Vec<(String, i64)>,
        coupon_code: Option<&str>,
    ) -> ServiceResult<CartQuote> {
        let items = items
            .into_iter()
            .map(|(resource_id, quantity)| CartQuoteItemInput {
                resource_id,
                variant_id: None,
                quantity,
                metadata: HashMap::new(),
            })
            .collect();
        self.generate_cart_quote_with_metadata(
            tenant_id,
            items,
            HashMap::new(),
            coupon_code,
            None,
        )
            .await
    }

    /// Generate a payment quote for a cart of items with metadata
    pub(crate) async fn generate_cart_quote_with_metadata(
        &self,
        tenant_id: &str,
        items: Vec<CartQuoteItemInput>,
        cart_metadata: HashMap<String, String>,
        coupon_code: Option<&str>,
        gift_card_code: Option<&str>,
    ) -> ServiceResult<CartQuote> {
        if items.is_empty() {
            return Err(ServiceError::Coded {
                code: ErrorCode::EmptyCart,
                message: "cart must have at least one item".into(),
            });
        }

        let cart_id = generate_cart_id();
        let rounding_mode = self.get_rounding_mode();
        let mut cart_items = Vec::with_capacity(items.len());
        let mut total_asset: Option<Asset> = None;
        let mut total_atomic = 0i64;
        let mut original_total_atomic = 0i64;
        let mut total_quantity = 0i64;

        // Track all applied coupons - use HashSet for O(1) dedup checks
        let mut all_coupon_codes: HashSet<String> = HashSet::new();
        let mut catalog_coupon_codes: HashSet<String> = HashSet::new();
        let mut checkout_coupon_codes: HashSet<String> = HashSet::new();

        // Batch load all products in a single query to avoid N+1
        let resource_ids: Vec<String> = items.iter().map(|item| item.resource_id.clone()).collect();
        let products_batch = self
            .products
            .get_products_by_ids(tenant_id, &resource_ids)
            .await
            .map_err(|_| ServiceError::Coded {
                code: ErrorCode::ResourceNotFound,
                message: "failed to load products".into(),
            })?;

        // Build a map for O(1) lookup
        let products_map: std::collections::HashMap<_, _> = products_batch
            .into_iter()
            .map(|p| (p.id.clone(), p))
            .collect();

        // Pre-load all coupons once to avoid N+1 queries in the item loop
        let all_coupons = match self.coupons.list_coupons(tenant_id).await {
            Ok(coupons) => coupons,
            Err(e) => {
                // Log error but continue without coupons - degraded but functional
                tracing::error!(
                    error = %e,
                    "Failed to load coupons for cart quote - discounts will be unavailable"
                );
                vec![]
            }
        };

        // PERF-002: Pre-index catalog coupons by product_id and category_id for O(1) lookup.
        // Split into: site-wide (scope="all"), product-specific, and category-specific.
        let coupon_now = Utc::now();
        let mut catalog_all_scope: Vec<&Coupon> = Vec::new();
        let mut catalog_by_product: HashMap<&str, Vec<&Coupon>> = HashMap::new();
        let mut catalog_by_category: HashMap<&str, Vec<&Coupon>> = HashMap::new();

        for coupon in &all_coupons {
            // Filter for catalog-level auto-apply coupons with static checks
            let applies_at = if coupon.applies_at.is_empty() {
                "catalog"
            } else {
                &coupon.applies_at
            };
            if !coupon.auto_apply || !applies_at.eq_ignore_ascii_case("catalog") || !coupon.active {
                continue;
            }
            // Date range check
            if let Some(s) = coupon.starts_at {
                if coupon_now < s {
                    continue;
                }
            }
            if let Some(e) = coupon.expires_at {
                if coupon_now > e {
                    continue;
                }
            }
            // Usage limit check
            if let Some(l) = coupon.usage_limit {
                if coupon.usage_count >= l {
                    continue;
                }
            }
            // Payment method check (cart quotes only support x402/crypto payments)
            if !coupon.payment_method.is_empty()
                && coupon.payment_method != "any"
                && !coupon.payment_method.eq_ignore_ascii_case("x402")
            {
                continue;
            }
            // Skip first_purchase_only coupons from auto-apply (can't verify customer at quote time)
            if coupon.first_purchase_only {
                continue;
            }

            if coupon.scope.eq_ignore_ascii_case("all") {
                // All-scope coupons with category_ids only apply to matching categories
                if coupon.category_ids.is_empty() {
                    catalog_all_scope.push(coupon);
                } else {
                    // Index by category for category-restricted all-scope coupons
                    for category_id in &coupon.category_ids {
                        catalog_by_category
                            .entry(category_id.as_str())
                            .or_default()
                            .push(coupon);
                    }
                }
            } else if coupon.scope.eq_ignore_ascii_case("specific") {
                for product_id in &coupon.product_ids {
                    catalog_by_product
                        .entry(product_id.as_str())
                        .or_default()
                        .push(coupon);
                }
                // Also index specific-scope coupons by their category_ids
                for category_id in &coupon.category_ids {
                    catalog_by_category
                        .entry(category_id.as_str())
                        .or_default()
                        .push(coupon);
                }
            }
        }

        let mut reservations = Vec::new();
        // Track reservations by (product_id, variant_id) tuple for proper variant-level tracking
        let mut reserved_by_key: HashMap<(String, Option<String>), i64> = HashMap::new();
        let mut requested_by_key: HashMap<(String, Option<String>), i64> = HashMap::new();
        let now = Utc::now();
        for item in &items {
            let resource_id = &item.resource_id;
            let variant_id = &item.variant_id;
            let quantity = &item.quantity;
            // Per spec (17-validation.md): Default quantity to 1 if <= 0
            let quantity = if *quantity <= 0 { 1 } else { *quantity };

            let product = products_map
                .get(resource_id)
                .ok_or_else(|| ServiceError::Coded {
                    code: ErrorCode::ResourceNotFound,
                    message: format!("resource not found: {}", resource_id),
                })?;

            // Validate variant_id if provided
            if let Some(vid) = variant_id {
                if product.get_variant(vid).is_none() {
                    return Err(ServiceError::Coded {
                        code: ErrorCode::ResourceNotFound,
                        message: format!("variant not found: {}", vid),
                    });
                }
            }

            // Use effective price (variant price if available, else product price)
            let price = product
                .get_effective_crypto_price(variant_id.as_deref())
                .ok_or_else(|| ServiceError::Coded {
                    code: ErrorCode::InvalidAmount,
                    message: format!("product {} has no crypto price", resource_id),
                })?;

            // Use effective inventory (variant inventory if available, else product inventory)
            let inventory_key = (resource_id.clone(), variant_id.clone());
            if let Some(qty) = product.get_effective_inventory(variant_id.as_deref()) {
                let allow_backorder =
                    matches!(product.inventory_policy.as_deref(), Some("allow_backorder"));
                if !allow_backorder {
                    let reserved = match reserved_by_key.get(&inventory_key) {
                        Some(value) => *value,
                        None => {
                            let value = self
                                .store
                                .get_active_inventory_reservation_quantity(
                                    tenant_id,
                                    resource_id,
                                    variant_id.as_deref(),
                                    now,
                                )
                                .await
                                .map_err(|e| {
                                    ServiceError::Internal(format!(
                                        "failed to load inventory reservations: {e}"
                                    ))
                                })?;
                            reserved_by_key.insert(inventory_key.clone(), value);
                            value
                        }
                    };

                    let requested = requested_by_key.entry(inventory_key.clone()).or_insert(0);
                    let new_requested = *requested + quantity;
                    if new_requested > qty as i64 - reserved {
                        return Err(ServiceError::Coded {
                            code: ErrorCode::ProductNotFound,
                            message: "product out of stock".into(),
                        });
                    }
                    *requested = new_requested;
                }
            }

            // Track original price before discounts
            let original_item = price
                .mul(quantity)
                .map_err(|_| ServiceError::Internal("overflow".into()))?;
            original_total_atomic = original_total_atomic
                .checked_add(original_item.atomic)
                .ok_or_else(|| ServiceError::Coded {
                    code: ErrorCode::InvalidAmount,
                    message: "cart total overflow".into(),
                })?;

            // Apply catalog-level coupons (product-specific and category-specific, auto-apply only)
            // PERF-002: O(1) lookup from pre-indexed coupons instead of O(m) filter
            // Collect category-matched coupons for this product
            let category_coupons: Vec<&Coupon> = product
                .category_ids
                .iter()
                .flat_map(|cat_id| {
                    catalog_by_category
                        .get(cat_id.as_str())
                        .into_iter()
                        .flatten()
                        .copied()
                })
                .collect();

            // Dedupe coupons (same coupon may match multiple categories)
            let mut seen_codes: HashSet<&str> = HashSet::new();
            let catalog_coupons: Vec<&Coupon> = catalog_all_scope
                .iter()
                .copied()
                .chain(
                    catalog_by_product
                        .get(resource_id.as_str())
                        .into_iter()
                        .flatten()
                        .copied(),
                )
                .chain(category_coupons.into_iter())
                .filter(|c| seen_codes.insert(&c.code))
                .collect();

            for c in &catalog_coupons {
                if catalog_coupon_codes.insert(c.code.clone()) {
                    all_coupon_codes.insert(c.code.clone());
                }
            }

            let discounted_price = stack_coupons_on_money_iter(
                price.clone(),
                catalog_coupons.iter().copied(),
                rounding_mode,
            );

            // Multiply by quantity
            let item_total = discounted_price
                .mul(quantity)
                .map_err(|_| ServiceError::Internal("overflow".into()))?;

            if let Some(ref asset) = total_asset {
                if asset.code != item_total.asset.code {
                    return Err(ServiceError::Coded {
                        code: ErrorCode::InvalidAmount,
                        message: "cart items must use the same currency".into(),
                    });
                }
            } else {
                total_asset = Some(item_total.asset.clone());
            }

            total_atomic =
                total_atomic
                    .checked_add(item_total.atomic)
                    .ok_or_else(|| ServiceError::Coded {
                        code: ErrorCode::InvalidAmount,
                        message: "cart total overflow".into(),
                    })?;
            total_quantity =
                total_quantity
                    .checked_add(quantity)
                    .ok_or_else(|| ServiceError::Coded {
                        code: ErrorCode::InvalidAmount,
                        message: "cart quantity overflow".into(),
                    })?;

            let item_coupon_codes = catalog_coupons.iter().map(|c| c.code.clone()).collect();

            cart_items.push(CartItem {
                resource_id: resource_id.clone(),
                variant_id: item.variant_id.clone(),
                quantity: quantity as i32,
                price: item_total.clone(),
                original_price: if original_item.atomic != item_total.atomic {
                    Some(original_item)
                } else {
                    None
                },
                description: Some(product.description.clone()),
                applied_coupons: item_coupon_codes,
                metadata: item.metadata.clone(),
            });
        }

        // Apply checkout-level coupons (site-wide, auto-apply + manual)
        // Use get_asset with safe fallback to avoid panic
        let asset = total_asset.clone().unwrap_or_else(|| {
            get_asset("USDC").unwrap_or_else(|| {
                tracing::error!("USDC asset not registered - using hardcoded default");
                Asset {
                    code: "USDC".to_string(),
                    decimals: 6,
                    asset_type: AssetType::Spl,
                    metadata: AssetMetadata::default(),
                }
            })
        });
        let cart_subtotal = Money::new(asset.clone(), total_atomic);
        let checkout_coupons = self
            .filter_checkout_coupons(tenant_id, &all_coupons, coupon_code, total_atomic)
            .await;
        for c in &checkout_coupons {
            if checkout_coupon_codes.insert(c.code.clone()) {
                all_coupon_codes.insert(c.code.clone());
            }
        }
        let mut final_total =
            stack_coupons_on_money(cart_subtotal, &checkout_coupons, rounding_mode);
        let mut gift_card_applied: Option<(String, i64, String, i64)> = None;

        if let Some(code) = gift_card_code {
            let normalized_code = code.trim().to_uppercase();
            if normalized_code.is_empty() {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidField,
                    message: "gift_card_code is required".into(),
                });
            }

            let card = match self.store.get_gift_card(tenant_id, &normalized_code).await {
                Ok(Some(card)) => card,
                Ok(None) => {
                    return Err(ServiceError::Coded {
                        code: ErrorCode::ResourceNotFound,
                        message: "gift card not found".into(),
                    })
                }
                Err(e) => {
                    return Err(ServiceError::Coded {
                        code: ErrorCode::DatabaseError,
                        message: format!("failed to load gift card: {e}"),
                    })
                }
            };

            if !card.active {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidOperation,
                    message: "gift card is inactive".into(),
                });
            }
            if let Some(expires_at) = card.expires_at {
                if Utc::now() > expires_at {
                    return Err(ServiceError::Coded {
                        code: ErrorCode::InvalidOperation,
                        message: "gift card has expired".into(),
                    });
                }
            }
            if card.balance <= 0 {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidOperation,
                    message: "gift card has no remaining balance".into(),
                });
            }
            if card.currency != final_total.asset.code {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidField,
                    message: "gift card currency does not match cart currency".into(),
                });
            }

            let applied_amount = card.balance.min(final_total.atomic);
            if applied_amount >= final_total.atomic {
                return Err(ServiceError::Coded {
                    code: ErrorCode::InvalidOperation,
                    message: "gift card covers full cart amount; zero-amount carts are not supported".into(),
                });
            }

            let new_total_atomic = final_total.atomic - applied_amount;
            final_total = Money::new(final_total.asset.clone(), new_total_atomic);
            let remaining = (card.balance - applied_amount).max(0);
            gift_card_applied =
                Some((normalized_code, applied_amount, card.currency, remaining));
        }

        let created_at = Utc::now();
        let expires_at = created_at + to_chrono_duration(self.config.storage.cart_quote_ttl);

        // Build metadata per spec (19-services-paywall.md)
        // Consume HashSets via into_iter() to avoid cloning strings
        let mut all_codes_vec: Vec<_> = all_coupon_codes.into_iter().collect();
        let mut catalog_codes_vec: Vec<_> = catalog_coupon_codes.into_iter().collect();
        let mut checkout_codes_vec: Vec<_> = checkout_coupon_codes.into_iter().collect();
        all_codes_vec.sort_unstable();
        catalog_codes_vec.sort_unstable();
        checkout_codes_vec.sort_unstable();

        let mut metadata: HashMap<String, String> = HashMap::new();
        if !all_codes_vec.is_empty() {
            metadata.insert("coupon_codes".to_string(), all_codes_vec.join(","));
        }
        if !catalog_codes_vec.is_empty() {
            metadata.insert("catalog_coupons".to_string(), catalog_codes_vec.join(","));
        }
        if !checkout_codes_vec.is_empty() {
            metadata.insert("checkout_coupons".to_string(), checkout_codes_vec.join(","));
        }
        // Store original total for reference
        let original_total_money = Money::new(asset.clone(), original_total_atomic);
        metadata.insert(
            "original_amount".to_string(),
            format!("{:.2}", original_total_money.to_major()),
        );
        metadata.insert(
            "discounted_amount".to_string(),
            format!("{:.2}", final_total.to_major()),
        );
        if let Some((code, applied, currency, remaining)) = gift_card_applied {
            metadata.insert("gift_card_code".to_string(), code);
            metadata.insert("gift_card_applied_amount".to_string(), applied.to_string());
            metadata.insert("gift_card_currency".to_string(), currency);
            metadata.insert(
                "gift_card_remaining_balance".to_string(),
                remaining.to_string(),
            );
        }
        metadata.insert("item_count".to_string(), items.len().to_string());
        metadata.insert("total_quantity".to_string(), total_quantity.to_string());
        for (key, value) in cart_metadata {
            metadata.entry(key).or_insert(value);
        }

        let cart_quote = CartQuote {
            id: cart_id,
            tenant_id: tenant_id.to_string(),
            items: cart_items,
            total: final_total,
            original_total: Some(original_total_money),
            metadata,
            applied_coupons: all_codes_vec.clone(),
            created_at,
            expires_at,
            wallet_paid_by: None,
        };

        // BUG-14: Reserve inventory BEFORE storing cart quote to avoid orphaned quotes
        if self.config.storage.inventory_holds_enabled {
            // Use separate hold TTL for reservations (may differ from cart quote TTL)
            let hold_expires_at =
                created_at + to_chrono_duration(self.config.storage.inventory_hold_ttl);

            for item in &cart_quote.items {
                let product = match products_map.get(&item.resource_id) {
                    Some(p) => p,
                    None => continue,
                };
                // Check effective inventory (variant-level if present, else product-level)
                let effective_inventory =
                    product.get_effective_inventory(item.variant_id.as_deref());
                if effective_inventory.is_none() || item.quantity <= 0 {
                    continue;
                }
                let reservation = crate::models::InventoryReservation {
                    id: uuid::Uuid::new_v4().to_string(),
                    tenant_id: tenant_id.to_string(),
                    product_id: item.resource_id.clone(),
                    variant_id: item.variant_id.clone(),
                    quantity: item.quantity,
                    expires_at: hold_expires_at,
                    cart_id: Some(cart_quote.id.clone()),
                    status: "active".to_string(),
                    created_at,
                };
                reservations.push(reservation);
            }

            for reservation in reservations {
                if let Err(e) = self.store.reserve_inventory(reservation).await {
                    if matches!(e, crate::storage::StorageError::Conflict) {
                        return Err(ServiceError::Coded {
                            code: ErrorCode::ProductNotFound,
                            message: "product out of stock".into(),
                        });
                    }
                    warn!(error = %e, "Failed to reserve inventory for cart quote");
                    let _ = self
                        .store
                        .release_inventory_reservations(tenant_id, &cart_quote.id, created_at)
                        .await;
                    return Err(ServiceError::Internal(
                        "failed to reserve inventory for cart quote".to_string(),
                    ));
                }
            }
        }

        // Store cart quote after successful inventory reservation
        if let Err(e) = self.store.store_cart_quote(cart_quote.clone()).await {
            warn!(error = %e, "Failed to store cart quote — releasing reservations");
            // Clean up reservations on quote store failure
            let _ = self
                .store
                .release_inventory_reservations(tenant_id, &cart_quote.id, created_at)
                .await;
            return Err(ServiceError::Internal(format!(
                "failed to store cart quote: {e}"
            )));
        }

        Ok(cart_quote)
    }

    /// Filter checkout-level coupons from pre-loaded list (avoids N+1 queries)
    /// Filters based on minimum_amount_cents requirement.
    async fn filter_checkout_coupons(
        &self,
        tenant_id: &str,
        all_coupons: &[Coupon],
        manual_code: Option<&str>,
        cart_subtotal_cents: i64,
    ) -> Vec<Coupon> {
        let mut coupons: Vec<Coupon> = all_coupons
            .iter()
            .filter(|c| {
                c.auto_apply
                    && c.applies_at.eq_ignore_ascii_case("checkout")
                    && c.scope.eq_ignore_ascii_case("all")
                    && c.active
                    && c.meets_minimum_amount(cart_subtotal_cents)
                    && !c.first_purchase_only // Skip first_purchase_only from auto-apply
            })
            .cloned()
            .collect();

        // Add manual coupon if provided (may need DB lookup if not in pre-loaded list)
        if let Some(code) = manual_code {
            // First check if it's in the pre-loaded list
            if let Some(c) = all_coupons
                .iter()
                .find(|c| c.code.eq_ignore_ascii_case(code))
            {
                if c.active
                    && c.meets_minimum_amount(cart_subtotal_cents)
                    && !coupons.iter().any(|x| x.code == c.code)
                {
                    coupons.push(c.clone());
                }
            } else if let Ok(c) = self.coupons.get_coupon(tenant_id, code).await {
                // Fall back to DB lookup for manual coupon not in auto-apply list
                if c.active
                    && c.meets_minimum_amount(cart_subtotal_cents)
                    && !coupons.iter().any(|x| x.code == c.code)
                {
                    coupons.push(c);
                }
            }
        }

        coupons
    }
}
