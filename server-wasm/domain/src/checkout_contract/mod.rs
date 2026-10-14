//! Storage-ready `cedros-pay-checkout` idempotency contract.
//!
//! This module is deliberately not connected to routes, jobs, the extension
//! manifest, or capability gates. Its content model must remain unavailable
//! until host adoption and end-to-end checkout validation are complete.

mod api_authority;
mod api_authority_support;
mod api_catalog;
mod api_checkout;
mod api_checkout_execute;
mod api_checkout_material;
mod api_checkout_outcome;
mod api_facade;
mod api_input;
mod api_inventory_cleanup;
mod api_outcome;
mod api_pricing;
mod api_quote;
mod api_rail_scope;
mod api_request;
mod api_return_validation;
mod api_scope;
mod api_snapshot;
mod api_status;
mod api_status_support;
mod api_validation;
mod api_verify;
mod artifacts;
mod canonical;
mod completion;
mod credits_execution;
mod credits_replay;
mod credits_settlement;
mod fence;
mod identity;
pub(crate) mod inventory_admin;
pub(crate) mod inventory_admin_bulk;
mod inventory_admin_projection;
mod inventory_hold_builder;
pub(crate) mod inventory_projection;
mod inventory_quote;
mod inventory_read;
mod inventory_storage;
mod inventory_transition;
mod inventory_types;
mod ledger_outcome;
mod pricing_shipping;
mod pricing_tax;
mod pricing_tip;
mod provider;
mod provider_attempt;
mod record;
mod record_quote;
mod record_rail;
mod record_state;
mod record_validation;
mod record_validation_stored;
mod return_index;
pub(crate) mod return_origins;
mod return_verification;
mod service;
mod service_claim;
mod service_execute;
mod service_outcome;
mod service_types;
mod settlement_atomic;
mod settlement_atomic_transition;
mod settlement_atomic_validation;
mod settlement_claim;
mod settlement_effect_delivery;
mod settlement_effect_identity;
mod settlement_effect_record;
mod settlement_effect_state;
mod settlement_effect_store;
mod settlement_effect_validation;
mod settlement_effect_worker;
mod settlement_extras;
mod settlement_plan;
mod settlement_reconcile;
mod settlement_reconcile_stripe;
mod settlement_storage;
mod store;
mod store_insert;
mod store_read;
mod stripe_request;
#[cfg(test)]
mod stripe_request_tests;
mod trusted_context;
mod types;
mod x402_chain;
mod x402_prepare;
mod x402_settlement;
mod x402_transition;
mod x402_transition_record;

pub use api_facade::CanonicalCheckoutFacade;
pub use api_outcome::{
    CanonicalPaymentOutcome, CanonicalQuoteResponse, CanonicalResolveOutcome,
    CanonicalVerifyOutcome, SettlementStatus,
};
pub use api_request::PaymentMethod;
use api_request::{
    CanonicalCheckoutRequest, CanonicalQuoteRequest, CanonicalResolveRequest,
    CanonicalVerifyRequest, QuoteSource,
};
pub(crate) use api_request::{CustomerContext, FulfillmentIntent};
pub(crate) use api_scope::UcpSessionAuthority;
use api_scope::{CanonicalActor, CanonicalScope};
pub use api_snapshot::{
    AppliedTip, AuthoritativeQuoteLine, AuthoritativeQuoteSnapshot, SafeSourceBinding,
    X402QuoteBinding,
};
use api_snapshot::{CanonicalOperationContext, CustomerContextHashes};
use artifacts::ProviderArtifacts;
use canonical::MaterialFingerprint;
pub(crate) use identity::ExternalIdempotencyKey;
use identity::{CheckoutAttemptId, OperationIdentity, OperationOwner, ProviderScope};
pub use inventory_types::InventoryHoldSnapshot;
use service::CheckoutService;
use service_types::{
    CheckoutCommand, CheckoutMaterial, CheckoutOutcome, CheckoutUrlOutcome,
    ResolveCheckoutUrlRequest, VerifyReturnOutcome, VerifyReturnRequest,
};
pub(crate) use settlement_extras::SettlementExtras;
use store::OperationLedger;
use stripe_request::StripeRequestBinding;
use trusted_context::TrustedProviderContext;
use types::CheckoutDescriptor;
use types::{ClaimResult, Completion, DurableOutcome, OperationKind, OperationLease};

/// Frozen protocol descriptor consumed by Cedros Shop's conformance adapter.
pub const PROTOCOL: &str = "cedros-pay-checkout";
pub const QUOTE_SCOPE: &str = "cedros-pay-checkout:quote";
pub const CHECKOUT_SCOPE: &str = "cedros-pay-checkout:checkout";
pub const MAX_IDEMPOTENCY_KEY_LENGTH: usize = 67;
pub const MIN_REPLAY_TTL_MILLIS: i64 = 259_200_000;

/// Intentionally absent from `ids.rs` and the extension manifest for now.
pub const OPERATION_MODEL: &str = "cedros-pay:checkout-operations";
/// Return-artifact correlation is isolated from operation lease records.
pub const RETURN_INDEX_MODEL: &str = "cedros-pay:checkout-return-index";
/// Guarded aggregate for catalog-backed finite stock.
pub const STOCK_MODEL: &str = "cedros-pay:checkout-stock";
/// Guarded quote reservations and their checkout/settlement lifecycle.
pub const INVENTORY_HOLD_MODEL: &str = "cedros-pay:checkout-inventory-holds";

pub(crate) const LEASE_SECONDS: i64 = 120;
pub(crate) const REPLAY_SECONDS: i64 = 72 * 60 * 60;
/// Conservative retry budget below Stripe's documented 24-hour pruning floor.
/// The exact cutoff is exclusive; clock rollback also fails closed.
pub(crate) const PROVIDER_IDEMPOTENCY_SECONDS: i64 = 23 * 60 * 60;

pub(crate) fn settle_stripe_webhook<S: crate::seams::HostSeams>(
    seams: &S,
    operation_id: &str,
    provider_id: &str,
    amount_cents: i64,
    currency: &str,
    payment_intent: &str,
) -> crate::error::AppResult<()> {
    settlement_atomic::paid_from_webhook(
        seams,
        operation_id,
        provider_id,
        amount_cents,
        currency,
        payment_intent,
    )
}

pub(crate) enum StripeSessionTerminal {
    Expired,
    PaymentFailed,
}

pub(crate) fn terminal_stripe_webhook<S: crate::seams::HostSeams>(
    seams: &S,
    operation_id: &str,
    provider_id: &str,
    amount_cents: i64,
    currency: &str,
    cause: StripeSessionTerminal,
) -> crate::error::AppResult<bool> {
    settlement_atomic::terminal_from_webhook(
        seams,
        operation_id,
        provider_id,
        amount_cents,
        currency,
        cause,
    )
}

pub(crate) fn reconcile_settlements<S: crate::seams::HostSeams>(
    seams: &S,
    limit: i64,
) -> crate::error::AppResult<settlement_reconcile::ReconcileReport> {
    settlement_reconcile::run(seams, limit)
}

/// Delivers a bounded batch of durable canonical-checkout effects.
#[cfg(test)]
pub(crate) fn deliver_settlement_effects<S: crate::seams::HostSeams>(
    seams: &S,
    limit: usize,
) -> crate::error::AppResult<settlement_effect_worker::DeliveryReport> {
    deliver_settlement_effects_with_budget(
        seams,
        limit,
        &crate::work_budget::WorkBudget::new(seams),
    )
}

pub(crate) fn deliver_settlement_effects_with_budget<S: crate::seams::HostSeams>(
    seams: &S,
    limit: usize,
    budget: &crate::work_budget::WorkBudget,
) -> crate::error::AppResult<settlement_effect_worker::DeliveryReport> {
    settlement_effect_worker::run(seams, limit, budget)
}

#[cfg(test)]
pub(crate) fn checkout_stock_key(resource: &str) -> String {
    inventory_types::stock_key(resource, None)
}

#[cfg(test)]
pub(crate) fn checkout_operation_key(operation_id: &str) -> crate::error::AppResult<String> {
    identity::operation_entry_key(operation_id)
}

#[cfg(test)]
include!("test_modules.rs");

mod order_history;
pub(crate) use order_history::require_complete as require_complete_order_history;

pub(crate) mod domain_catalog;
