use crate::auth::Buyer;
use crate::ctx::RequestContext;
use crate::error::AppResult;
use crate::seams::HostSeams;
use crate::versioned_cart::TrustedCartProvider;

use super::{
    CanonicalActor, CanonicalPaymentOutcome, CanonicalQuoteResponse, CanonicalResolveOutcome,
    CanonicalScope, CanonicalVerifyOutcome, CheckoutDescriptor, CheckoutService,
};

/// Framework-neutral canonical checkout surface. It remains deliberately
/// disconnected from routes, manifests, model declarations, and capabilities.
pub struct CanonicalCheckoutFacade<'a, S: HostSeams> {
    pub(super) seams: &'a S,
    pub(super) service: CheckoutService<'a, S>,
    pub(super) merchant_namespace: String,
    pub(super) buyer: Option<&'a Buyer>,
    pub(super) cart_provider: Option<TrustedCartProvider>,
    pub(super) allow_loopback_provider_urls: bool,
    pub(super) market_country: Option<String>,
    pub(super) domain_offer: Option<super::domain_catalog::DomainCatalogOffer>,
}

impl<'a, S: HostSeams> CanonicalCheckoutFacade<'a, S> {
    /// Pure transport preflight for quote requests. Performs strict parsing and
    /// bounds checks without touching a host seam.
    pub fn preflight_quote(header: &str, body: &str) -> AppResult<()> {
        super::api_validation::parse_quote(header, body).map(drop)
    }

    /// Pure transport preflight for checkout requests.
    pub fn preflight_checkout(header: &str, body: &str) -> AppResult<()> {
        super::api_validation::parse_checkout(header, body).map(drop)
    }

    /// Pure transport preflight for operation-scoped URL resolution.
    pub fn preflight_resolve(body: &str) -> AppResult<()> {
        super::api_return_validation::parse_resolve(body).map(drop)
    }

    /// Pure transport preflight for artifact-indexed return verification.
    pub fn preflight_verify_return(body: &str) -> AppResult<()> {
        super::api_return_validation::parse_verify(body).map(drop)
    }

    /// Pure transport preflight for a status path operation id.
    pub fn preflight_status(operation_id: &str) -> AppResult<()> {
        super::api_validation::operation_id(operation_id)
    }

    /// Binds the facade to a host context and a previously verified buyer.
    /// Fails when trusted site, environment, or actor authority is unavailable.
    pub fn for_verified_buyer(
        seams: &'a S,
        context: &RequestContext,
        buyer: &'a Buyer,
    ) -> AppResult<Self> {
        let scope = CanonicalScope::from_host(context, CanonicalActor::Verified(buyer))?;
        let cart_provider = TrustedCartProvider::from_host_context(context)?;
        Ok(Self::new(
            seams,
            scope,
            Some(buyer),
            Some(cart_provider),
            context.market_country.clone(),
        ))
    }

    /// Only the host-owned domain service may bind a private catalog offer.
    pub(crate) fn for_domain_service(
        seams: &'a S,
        context: &RequestContext,
        buyer: &'a Buyer,
        offer: super::domain_catalog::DomainCatalogOffer,
    ) -> AppResult<Self> {
        context.require_claim(crate::ids::ROUTE_ADMIN)?;
        context.require_admin_write()?;
        if context.actor_id.as_deref() != Some("cedros-domains-manager")
            || context.principal_id.as_deref() != Some("cedros-domains-manager")
        {
            return Err(crate::error::AppError::forbidden(
                "host domain service identity is required",
            ));
        }
        let mut facade = Self::for_verified_buyer(seams, context, buyer)?;
        // Existing Stripe attempts retain their frozen catalog terms. Validate
        // the live offer before initialization, then let canonical checkout
        // revalidate new attempts and recover already-claimed attempts.
        if seams
            .setting_get(crate::ids::SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS)?
            .is_none()
            || seams
                .secret_get(crate::ids::SECRET_CHECKOUT_CONTEXT_MAC)?
                .is_none()
            || seams
                .secret_get(crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT)?
                .is_none()
        {
            super::domain_catalog::resolve(
                seams,
                &[super::api_request::QuoteItemIntent {
                    resource: offer.resource.clone(),
                    variant_id: None,
                    qty: 1,
                }],
                &offer,
            )?;
        }
        facade.domain_offer = Some(offer);
        Ok(facade)
    }

    /// Public UCP sessions have their own verified platform or handoff authority.
    /// They never acquire a buyer subject, admin claims, or a management key.
    pub(crate) fn for_ucp_session(
        seams: &'a S,
        context: &RequestContext,
        authority: &super::UcpSessionAuthority,
    ) -> AppResult<Self> {
        let scope = CanonicalScope::from_host(context, CanonicalActor::UcpSession(authority))?;
        Ok(Self::new(
            seams,
            scope,
            None,
            None,
            context.market_country.clone(),
        ))
    }

    /// Price a UCP draft with the canonical authorities without reserving stock
    /// or starting a payment. Final quote/checkout revalidate these facts.
    pub(crate) fn preview(
        &self,
        header: &str,
        body: &str,
    ) -> AppResult<super::AuthoritativeQuoteSnapshot> {
        let request = super::api_validation::parse_quote(header, body)?;
        super::return_origins::validate(
            self.seams,
            &request.customer_context.return_urls,
            self.allow_loopback_provider_urls,
        )?;

        Ok(super::api_authority::resolve(
            self.seams,
            self.buyer,
            self.cart_provider.as_ref(),
            &request,
            "ucp-preview",
            self.market_country.as_deref(),
            self.domain_offer.as_ref(),
        )?
        .snapshot)
    }

    /// Test-only guest scope. Production HTTP checkout is authenticated-only;
    /// no host guest-session seam exists in the published contract.
    #[cfg(test)]
    pub fn for_guest(
        seams: &'a S,
        context: &RequestContext,
        host_guest_session: &str,
    ) -> AppResult<Self> {
        let scope =
            CanonicalScope::from_host(context, CanonicalActor::GuestSession(host_guest_session))?;
        Ok(Self::new(
            seams,
            scope,
            None,
            None,
            context.market_country.clone(),
        ))
    }

    fn new(
        seams: &'a S,
        scope: CanonicalScope,
        buyer: Option<&'a Buyer>,
        cart_provider: Option<TrustedCartProvider>,
        market_country: Option<String>,
    ) -> Self {
        let merchant_namespace = scope.merchant_namespace.clone();
        Self {
            seams,
            service: CheckoutService::from_canonical_scope(seams, scope),
            merchant_namespace,
            buyer,
            cart_provider,
            allow_loopback_provider_urls: false,
            market_country,
            domain_offer: None,
        }
    }

    /// Parses a strict quote body, resolves authoritative facts, and durably
    /// replays or creates its guarded quote operation.
    pub fn quote(&self, header: &str, body: &str) -> AppResult<CanonicalQuoteResponse> {
        super::api_quote::execute(self, header, body)
    }

    /// Revalidates a resolved quote and begins exactly one supported payment
    /// method. Unsupported rails terminate before claim or money mutation.
    pub fn checkout(&self, header: &str, body: &str) -> AppResult<CanonicalPaymentOutcome> {
        super::api_checkout::execute(self, header, body)
    }

    /// Returns the authenticated merchant/environment/Stripe namespace used
    /// by provider-key derivation. Buyer identity is deliberately excluded.
    pub fn descriptor(&self) -> AppResult<CheckoutDescriptor> {
        let account = super::api_rail_scope::stripe_account(self.seams)?;
        let provider_scope =
            super::StripeRequestBinding::provider_namespace(&self.merchant_namespace, &account)?;
        Ok(CheckoutDescriptor::for_provider_scope(provider_scope))
    }

    /// Reads a scoped operation directly without provider egress or URL return.
    pub fn status(&self, operation_id: &str) -> AppResult<CanonicalPaymentOutcome> {
        super::api_status::read(self, operation_id)
    }

    /// Recover exact provider correlation after a lost merchant response.
    pub(crate) fn payment_reference(&self, operation_id: &str) -> AppResult<Option<String>> {
        crate::guarded_policy::require_active(self.seams)?;
        let record = super::api_status_support::checkout_record(self, operation_id)?;
        Ok(match record.outcome {
            Some(super::DurableOutcome::Resolved {
                provider_artifacts, ..
            }) => provider_artifacts.return_artifact_id,
            _ => None,
        })
    }

    /// Resolves an ephemeral provider URL after exact operation correlation.
    pub fn resolve(&self, body: &str) -> AppResult<CanonicalResolveOutcome> {
        super::api_status::resolve(self, body)
    }

    /// Verifies exact provider return correlation and reports settlement state.
    pub fn verify(&self, body: &str) -> AppResult<CanonicalVerifyOutcome> {
        super::api_verify::verify(self, body)
    }

    /// Releases an expired, unbound quote inventory hold. The operation must
    /// belong to this facade's trusted provider scope and remain unclaimed.
    pub fn release_expired_inventory_hold(&self, operation_id: &str) -> AppResult<()> {
        super::api_inventory_cleanup::release_expired(self, operation_id)
    }

    #[cfg(test)]
    pub(super) fn allow_test_loopback_provider_urls(mut self) -> Self {
        self.allow_loopback_provider_urls = true;
        self
    }
}
