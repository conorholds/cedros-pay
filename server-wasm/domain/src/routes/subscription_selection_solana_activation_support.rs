use std::collections::BTreeMap;

use serde::Deserialize;
use serde_json::{json, Value};

use super::solana::{
    ata_for_token_program, validate_address, validate_signature, validate_solana_plan,
    DEFAULT_SOLANA_SUBSCRIPTION_PAYMENTS, MAX_SOLANA_SUBSCRIPTION_PAYMENTS,
};
use super::support::{ResolvedPlan, ResolvedSolanaPlan};
use crate::crm_events;
use crate::error::{AppError, AppResult};
use crate::routes::{analytics_events, entitlements};
use crate::x402::pubkey;

const MAX_METADATA_PAIRS: usize = 20;
const MAX_METADATA_KEY: usize = 40;
const MAX_METADATA_VALUE: usize = 500;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(super) struct ActivateSolanaSubscriptionReq {
    pub(super) plan_id: String,
    pub(super) interval: String,
    pub(super) wallet: String,
    pub(super) authorization_signature: String,
    pub(super) payment_signature: String,
    pub(super) wallet_binding_message: String,
    pub(super) wallet_binding_signature: String,
    pub(super) subscription_address: String,
    pub(super) subscription_authority_address: Option<String>,
    pub(super) plan_address: Option<String>,
    pub(super) number_of_payments: Option<u32>,
    pub(super) metadata: Option<BTreeMap<String, String>>,
}

pub(super) fn validate_activation_request(req: &ActivateSolanaSubscriptionReq) -> AppResult<()> {
    for address in [
        Some(req.wallet.as_str()),
        Some(req.subscription_address.as_str()),
        req.subscription_authority_address.as_deref(),
        req.plan_address.as_deref(),
    ]
    .into_iter()
    .flatten()
    {
        validate_address(address, "wallet and Solana account addresses must be valid")?;
    }
    validate_signature(&req.authorization_signature)?;
    validate_signature(&req.payment_signature).map_err(|_| {
        AppError::new(
            422,
            "invalid_signature",
            "paymentSignature must be a valid Solana signature",
        )
    })?;
    validate_metadata(req.metadata.as_ref())?;
    validate_number_of_payments(req.number_of_payments)
}

pub(super) fn active_solana_plan(plan: &ResolvedPlan) -> AppResult<ResolvedSolanaPlan> {
    if !plan.active || !plan.public {
        return Err(AppError::new(
            422,
            "invalid_resource",
            "plan is not available",
        ));
    }
    let solana = plan.solana.clone().ok_or_else(|| {
        AppError::new(
            422,
            "payment_method_disabled",
            "Solana subscriptions are not configured for this plan",
        )
    })?;
    validate_solana_plan(&solana)?;
    Ok(solana)
}

pub(super) fn validate_activation_terms(
    subscription_address: &str,
    subscription_authority_address: Option<&str>,
    plan_address: Option<&str>,
    addresses: &super::solana::DerivedSubscriptionAddresses,
) -> AppResult<()> {
    let mismatched = plan_address.is_some_and(|address| address != addresses.plan_address)
        || subscription_address != addresses.subscription_address
        || subscription_authority_address
            .is_some_and(|address| address != addresses.subscription_authority_address);
    if mismatched {
        Err(AppError::new(
            422,
            "invalid_payment_proof",
            "supplied Solana addresses do not match the derived subscription",
        ))
    } else {
        Ok(())
    }
}

pub(super) fn receiver_token_account(
    solana: &ResolvedSolanaPlan,
    token_program: &str,
) -> AppResult<String> {
    if let Some(receiver) = &solana.receiver_token_account {
        return Ok(receiver.clone());
    }
    let invalid = |_| {
        AppError::new(
            422,
            "invalid_resource",
            "plan has invalid Solana subscription metadata",
        )
    };
    let merchant = pubkey::parse(&solana.merchant_address).map_err(invalid)?;
    let mint = pubkey::parse(&solana.token_mint).map_err(invalid)?;
    let token_program = pubkey::parse(token_program).map_err(invalid)?;
    Ok(ata_for_token_program(&merchant, &mint, &token_program))
}

pub(super) fn activation_response(record: &Value) -> Value {
    json!({
        "subscriptionId": record["subscriptionId"], "productId": record["productId"],
        "wallet": record["wallet"], "status": record["status"],
        "paymentMethod": record["paymentMethod"],
        "currentPeriodStart": record["currentPeriodStart"],
        "currentPeriodEnd": record["currentPeriodEnd"],
        "billingPeriod": record["billingPeriod"], "billingInterval": record["billingInterval"],
        "solana": record["solana"],
    })
}

pub(super) fn activation_actions(
    user_id: &str,
    record: &Value,
    plan: &ResolvedPlan,
    now: i64,
) -> Vec<crate::durable_effects::Action> {
    let subscription_id = record["subscriptionId"].as_str().unwrap_or_default();
    let mut actions = Vec::new();
    if let Some(action) = crm_events::subscription_created_action(
        &format!("subscription.created:{subscription_id}"),
        user_id,
        subscription_id,
        &plan.id,
        now,
        Some(user_id),
    ) {
        actions.push(action);
    }
    actions.push(entitlements::changed_action(
        "subscription_created",
        Some(user_id),
        Some(&plan.id),
        Some(subscription_id),
        Some(subscription_id),
        now,
    ));
    actions.push(analytics_events::payment_succeeded_action(
        "solana_subscription",
        "subscription",
        plan.price_cents,
        &plan.currency,
        now,
    ));
    actions.push(analytics_events::subscription_started_action(
        "solana_subscription",
        &plan.id,
        "active",
        now,
    ));
    actions
}

pub(super) fn requested_payments(value: Option<u32>) -> i32 {
    value.unwrap_or(DEFAULT_SOLANA_SUBSCRIPTION_PAYMENTS) as i32
}

pub(super) fn validate_number_of_payments(value: Option<u32>) -> AppResult<()> {
    let value = value.unwrap_or(DEFAULT_SOLANA_SUBSCRIPTION_PAYMENTS);
    if value == 0 || value > MAX_SOLANA_SUBSCRIPTION_PAYMENTS {
        return Err(AppError::new(
            422,
            "invalid_field",
            format!("numberOfPayments must be between 1 and {MAX_SOLANA_SUBSCRIPTION_PAYMENTS}"),
        ));
    }
    Ok(())
}

fn validate_metadata(metadata: Option<&BTreeMap<String, String>>) -> AppResult<()> {
    let Some(metadata) = metadata else {
        return Ok(());
    };
    if metadata.len() > MAX_METADATA_PAIRS
        || metadata.iter().any(|(key, value)| {
            key.is_empty() || key.len() > MAX_METADATA_KEY || value.len() > MAX_METADATA_VALUE
        })
    {
        return Err(AppError::new(422, "invalid_field", "metadata is too large"));
    }
    Ok(())
}
