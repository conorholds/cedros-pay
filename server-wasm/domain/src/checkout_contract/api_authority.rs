use super::api_authority_support::{
    changed, checked_total, choose_promotion, discounted_subtotal, revalidate_cart, tip_intent,
};
use super::api_catalog;
use super::api_request::{CustomerContext, QuoteItemIntent};
use super::inventory_types::{CatalogGuard, StockIntent};
use super::{AuthoritativeQuoteSnapshot, CanonicalQuoteRequest, SafeSourceBinding};
use crate::auth::Buyer;
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;
use crate::versioned_cart::TrustedCartProvider;

const QUOTE_TTL_SECONDS: i64 = 15 * 60;

pub(super) struct ResolvedQuote {
    pub snapshot: AuthoritativeQuoteSnapshot,
    pub stock_intents: Vec<StockIntent>,
    pub catalog_guards: Vec<CatalogGuard>,
    pub regional_policy: crate::regional_payment_policy::RegionalPolicyBinding,
    pub physical_storefront: bool,
}

pub(super) fn resolve<S: HostSeams>(
    seams: &S,
    buyer: Option<&Buyer>,
    cart_provider: Option<&TrustedCartProvider>,
    request: &CanonicalQuoteRequest,
    quote_operation_id: &str,
    market_country: Option<&str>,
    domain_offer: Option<&super::domain_catalog::DomainCatalogOffer>,
) -> AppResult<ResolvedQuote> {
    let policy = crate::native_storefront_policy::Policy::load(seams)?;
    policy.require_context(
        &request.requested_payment_methods,
        &request.customer_context,
    )?;
    let regional_policy = crate::regional_payment_policy::RegionalPaymentPolicy::load(seams)?
        .enforce(market_country, &request.requested_payment_methods)?;
    let (items, cart_promotion) =
        api_catalog::source_items(seams, buyer, cart_provider, &request.source)?;
    let promotion = choose_promotion(request.promotion_code.as_deref(), cart_promotion.as_deref())?;
    let catalog = api_catalog::resolve_items(seams, &items, domain_offer)?;
    let currency = api_catalog::one_currency(&catalog.lines)?;
    if request
        .requested_payment_methods
        .contains(&super::PaymentMethod::Credits)
    {
        super::api_rail_scope::validate_quote_credits(seams, buyer, &currency)?;
    }
    let subtotal = subtotal(&catalog.lines)?;
    let discounted = discounted_subtotal(seams, promotion.as_deref(), subtotal, &currency)?;
    let pricing = super::api_pricing::resolve(
        seams,
        &catalog.lines,
        &currency,
        discounted,
        &request.customer_context,
        request.tip.as_ref(),
    )?;
    let total = checked_total(discounted, &pricing)?;
    let x402 = x402_binding(seams, request, total, quote_operation_id)?;
    let expires_at = crate::time::iso8601(seams.now_unix_secs().saturating_add(QUOTE_TTL_SECONDS));
    Ok(ResolvedQuote {
        snapshot: AuthoritativeQuoteSnapshot {
            schema_version: 1,
            order_context: Some(crate::commerce_orders::OrderContext {
                site_order: domain_offer.is_none(),
                customer_name: request
                    .customer_context
                    .contact
                    .as_ref()
                    .and_then(|contact| contact.display_name.clone())
                    .unwrap_or_default(),
                digital: matches!(
                    request.customer_context.fulfillment,
                    super::api_request::FulfillmentIntent::Digital {}
                ),
                token_asset: crate::x402::config::token_symbol(seams),
            }),
            source: SafeSourceBinding::from_request(
                &request.source,
                api_catalog::source_digest(&request.source)?,
            ),
            lines: catalog.lines,
            currency,
            subtotal_cents: subtotal,
            discount_cents: subtotal.saturating_sub(discounted),
            shipping_cents: pricing.shipping_cents,
            tax_cents: pricing.tax_cents,
            tip_cents: pricing.tip_cents,
            total_cents: total,
            shipping_rate_id: pricing.shipping_rate_id,
            tax_rate_id: pricing.tax_rate_id,
            applied_tip: pricing.applied_tip,
            inventory_hold: None,
            promotion_code: promotion,
            requested_payment_methods: request.requested_payment_methods.clone(),
            x402,
            expires_at,
        },
        stock_intents: catalog.stock_intents,
        catalog_guards: catalog.catalog_guards,
        regional_policy,
        physical_storefront: policy.is_physical(),
    })
}

fn subtotal(lines: &[super::AuthoritativeQuoteLine]) -> AppResult<u64> {
    lines
        .iter()
        .try_fold(0_u64, |total, line| {
            total.checked_add(line.line_total_cents)
        })
        .ok_or_else(|| AppError::unprocessable("quote subtotal overflowed"))
}

fn x402_binding<S: HostSeams>(
    seams: &S,
    request: &CanonicalQuoteRequest,
    total_cents: u64,
    quote_operation_id: &str,
) -> AppResult<Option<super::X402QuoteBinding>> {
    if !request
        .requested_payment_methods
        .contains(&super::PaymentMethod::X402)
    {
        return Ok(None);
    }
    if !crate::x402::config::enabled(seams) {
        return Err(AppError::new(
            503,
            "x402_unavailable",
            "x402 is not enabled",
        ));
    }
    let control = crate::blockchain_config::resolve_x402_control(
        seams,
        crate::x402::config::payment_address(seams),
        crate::x402::config::network(seams),
    )
    .map_err(|_| AppError::new(503, "x402_unavailable", "x402 control is unavailable"))?;
    let mint = crate::x402::config::token_mint(seams)
        .ok_or_else(|| AppError::new(503, "x402_unavailable", "x402 mint is unavailable"))?;
    let decimals = crate::x402::config::token_decimals(seams);
    let token_symbol = crate::x402::config::token_symbol(seams);
    crate::x402::config::validate_payment_asset(
        &control.network,
        &mint,
        decimals,
        token_symbol.as_deref(),
    )
    .map_err(|message| AppError::new(503, "x402_unavailable", message))?;
    let recipient = crate::x402::ata::derive_token_account(&control.pay_to, &mint)
        .map_err(|_| AppError::new(503, "x402_unavailable", "x402 configuration is invalid"))?;
    let amount_atomic = crate::x402::pricing::usd_cents_to_stablecoin_atomic(total_cents, decimals)
        .map_err(|_| AppError::unprocessable("x402 quote amount exceeds token range"))?;
    let network = control.network.clone();
    let fee_payer = control
        .managed_signer
        .as_ref()
        .map(|signer| signer.public_key.clone());
    let memo = crate::x402::verifier::expected_memo(quote_operation_id);
    let fingerprint = super::api_rail_scope::x402_config_fingerprint(
        &network,
        &control.pay_to,
        fee_payer.as_deref(),
        &recipient,
        &mint,
        decimals,
    );
    Ok(Some(super::X402QuoteBinding {
        network,
        token_symbol,
        pay_to: control.pay_to,
        fee_payer,
        recipient_token_account: recipient,
        token_mint: mint,
        amount_atomic,
        decimals,
        memo,
        config_fingerprint: fingerprint,
    }))
}

pub(super) fn revalidate<S: HostSeams>(
    seams: &S,
    buyer: Option<&Buyer>,
    cart_provider: Option<&TrustedCartProvider>,
    snapshot: &AuthoritativeQuoteSnapshot,
    customer_context: &CustomerContext,
    domain_offer: Option<&super::domain_catalog::DomainCatalogOffer>,
) -> AppResult<()> {
    if crate::time::parse_iso(&snapshot.expires_at)
        .is_none_or(|expiry| seams.now_unix_secs() > expiry)
    {
        return Err(AppError::new(
            409,
            "quote_expired",
            "authoritative quote has expired",
        ));
    }
    revalidate_cart(seams, buyer, cart_provider, &snapshot.source)?;
    let intents = snapshot
        .lines
        .iter()
        .map(|line| QuoteItemIntent {
            resource: line.resource.clone(),
            variant_id: line.variant_id.clone(),
            qty: line.qty,
        })
        .collect::<Vec<_>>();
    let current = api_catalog::resolve_items(seams, &intents, domain_offer)?;
    if current.lines != snapshot.lines {
        return Err(changed("catalog facts changed after quote"));
    }
    let currency = api_catalog::one_currency(&current.lines)?;
    let discounted = discounted_subtotal(
        seams,
        snapshot.promotion_code.as_deref(),
        snapshot.subtotal_cents,
        &currency,
    )?;
    let tip = tip_intent(snapshot);
    let pricing = super::api_pricing::resolve(
        seams,
        &current.lines,
        &currency,
        discounted,
        customer_context,
        tip.as_ref(),
    )?;
    if checked_total(discounted, &pricing)? != snapshot.total_cents
        || pricing.shipping_cents != snapshot.shipping_cents
        || pricing.tax_cents != snapshot.tax_cents
        || pricing.tip_cents != snapshot.tip_cents
        || pricing.shipping_rate_id != snapshot.shipping_rate_id
        || pricing.tax_rate_id != snapshot.tax_rate_id
        || pricing.applied_tip != snapshot.applied_tip
    {
        return Err(changed("pricing authority changed after quote"));
    }
    Ok(())
}
