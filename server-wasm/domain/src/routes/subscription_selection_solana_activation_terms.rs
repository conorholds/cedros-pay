use super::solana::{
    derive_subscription_addresses, DEFAULT_SOLANA_SUBSCRIPTIONS_PROGRAM,
    DEFAULT_SOLANA_TOKEN_PROGRAM,
};
use super::solana_activation_store::ActivationInput;
use super::solana_activation_support::{
    receiver_token_account, requested_payments, validate_activation_terms,
    ActivateSolanaSubscriptionReq,
};
use super::solana_payment_verifier::{ExpectedInitialPayment, VerifiedInitialPayment};
use super::solana_verifier::ExpectedSolanaAuthorization;
use super::support::{ResolvedPlan, ResolvedSolanaPlan};
use crate::error::AppResult;

pub(super) struct ActivationTerms {
    program: String,
    token_program: String,
    addresses: super::solana::DerivedSubscriptionAddresses,
    receiver_token_account: String,
    collector_address: String,
}

impl ActivationTerms {
    pub(super) fn resolve(
        wallet: &str,
        subscription_address: &str,
        subscription_authority_address: Option<&str>,
        plan_address: Option<&str>,
        solana: &ResolvedSolanaPlan,
    ) -> AppResult<Self> {
        let program = solana
            .program_address
            .clone()
            .unwrap_or_else(|| DEFAULT_SOLANA_SUBSCRIPTIONS_PROGRAM.into());
        let token_program = solana
            .token_program_address
            .clone()
            .unwrap_or_else(|| DEFAULT_SOLANA_TOKEN_PROGRAM.into());
        let addresses = derive_subscription_addresses(
            &program,
            &solana.merchant_address,
            wallet,
            &solana.token_mint,
            &token_program,
            solana.plan_id,
            solana.plan_address.as_deref(),
        )?;
        validate_activation_terms(
            subscription_address,
            subscription_authority_address,
            plan_address,
            &addresses,
        )?;
        let receiver_token_account = receiver_token_account(solana, &token_program)?;
        let collector_address = solana
            .collector_address
            .clone()
            .unwrap_or_else(|| solana.merchant_address.clone());
        Ok(Self {
            program,
            token_program,
            addresses,
            receiver_token_account,
            collector_address,
        })
    }

    pub(super) fn authorization<'a>(
        &'a self,
        signature: &'a str,
        wallet: &'a str,
        solana: &'a ResolvedSolanaPlan,
    ) -> ExpectedSolanaAuthorization<'a> {
        ExpectedSolanaAuthorization {
            signature,
            program_address: &self.program,
            subscriber: wallet,
            merchant: &solana.merchant_address,
            addresses: &self.addresses,
            token_mint: &solana.token_mint,
            solana_plan_id: solana.plan_id,
            amount_atomic: solana.amount_atomic,
            period_hours: solana.period_hours,
            expected_created_at: solana.expected_created_at,
            expected_subscription_authority_init_id: solana.expected_subscription_authority_init_id,
        }
    }

    pub(super) fn initial_payment<'a>(
        &'a self,
        signature: &'a str,
        wallet: &'a str,
        solana: &'a ResolvedSolanaPlan,
        now: i64,
    ) -> ExpectedInitialPayment<'a> {
        ExpectedInitialPayment {
            signature,
            program_address: &self.program,
            subscriber: wallet,
            addresses: &self.addresses,
            subscriber_token_account: &self.addresses.subscriber_token_account,
            receiver_token_account: &self.receiver_token_account,
            collector_address: &self.collector_address,
            token_mint: &solana.token_mint,
            token_program_address: &self.token_program,
            amount_atomic: solana.amount_atomic,
            period_hours: solana.period_hours,
            now,
        }
    }

    pub(super) fn collection_input<'a>(
        &'a self,
        wallet: &'a str,
        solana: &'a ResolvedSolanaPlan,
    ) -> super::solana_collection_transaction::CollectionTransactionInput<'a> {
        super::solana_collection_transaction::CollectionTransactionInput {
            program_address: &self.program,
            collector_address: &self.collector_address,
            subscription_address: &self.addresses.subscription_address,
            plan_address: &self.addresses.plan_address,
            subscription_authority_address: &self.addresses.subscription_authority_address,
            subscriber_token_account: &self.addresses.subscriber_token_account,
            receiver_token_account: &self.receiver_token_account,
            wallet,
            token_mint: &solana.token_mint,
            token_program_address: &self.token_program,
            event_authority_address: &self.addresses.event_authority_address,
            amount_atomic: solana.amount_atomic,
        }
    }

    pub(super) fn store_input<'a>(
        &'a self,
        user_id: &'a str,
        req: &'a ActivateSolanaSubscriptionReq,
        plan: &'a ResolvedPlan,
        solana: &'a ResolvedSolanaPlan,
        payment: &'a VerifiedInitialPayment,
    ) -> ActivationInput<'a> {
        ActivationInput {
            user_id,
            wallet: &req.wallet,
            authorization_signature: &req.authorization_signature,
            payment_signature: &req.payment_signature,
            number_of_payments: requested_payments(req.number_of_payments),
            metadata: req.metadata.as_ref(),
            plan,
            solana,
            addresses: &self.addresses,
            program_address: &self.program,
            token_program_address: &self.token_program,
            subscriber_token_account: &self.addresses.subscriber_token_account,
            receiver_token_account: &self.receiver_token_account,
            collector_address: &self.collector_address,
            payment,
        }
    }
}
