use serde::Deserialize;
use serde_json::json;

use super::support::{normalize_interval, parse_body, require_match, resolve_plan};
use crate::auth;
use crate::error::{AppError, AppResult};
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;
use crate::x402::{config, pubkey};

pub(super) const DEFAULT_SOLANA_SUBSCRIPTIONS_PROGRAM: &str =
    "De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44";
pub(super) const DEFAULT_SOLANA_TOKEN_PROGRAM: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
pub(super) const DEFAULT_SOLANA_SUBSCRIPTION_PAYMENTS: u32 = 12;
pub(super) const MAX_SOLANA_SUBSCRIPTION_PAYMENTS: u32 = 120;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PlanSolanaSubscriptionReq {
    plan_id: String,
    interval: String,
    wallet: String,
    number_of_payments: Option<u32>,
}

pub(super) fn plan_solana_subscription<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
) -> AppResult<RouteResponse> {
    require_match(
        req,
        "POST",
        "/paywall/v1/subscription/plan/solana-subscription",
    )?;
    let buyer = auth::verify_buyer(seams, req)?;
    let body: PlanSolanaSubscriptionReq = parse_body(req)?;
    validate_address(&body.wallet, "wallet must be a valid Solana address")?;
    let interval = normalize_interval(Some(&body.interval))?;
    let plan = resolve_plan(seams, &body.plan_id, interval)?;
    if !plan.active || !plan.public {
        return Err(AppError::unprocessable("plan is not available"));
    }
    let solana = plan.solana.ok_or_else(|| {
        AppError::new(
            422,
            "payment_method_disabled",
            "Solana subscriptions are not configured for this plan",
        )
    })?;
    validate_solana_plan(&solana)?;
    if super::invite_discount::lookup(seams, req).is_some() {
        return Err(AppError::unprocessable(
            "invite discounts require Stripe checkout",
        ));
    }
    let number_of_payments = body
        .number_of_payments
        .unwrap_or(DEFAULT_SOLANA_SUBSCRIPTION_PAYMENTS);
    if number_of_payments == 0 || number_of_payments > MAX_SOLANA_SUBSCRIPTION_PAYMENTS {
        return Err(AppError::unprocessable(format!(
            "numberOfPayments must be between 1 and {MAX_SOLANA_SUBSCRIPTION_PAYMENTS}"
        )));
    }

    let program_address = solana
        .program_address
        .as_deref()
        .unwrap_or(DEFAULT_SOLANA_SUBSCRIPTIONS_PROGRAM);
    let token_program_address = solana
        .token_program_address
        .as_deref()
        .unwrap_or(DEFAULT_SOLANA_TOKEN_PROGRAM);
    let addresses = derive_subscription_addresses(
        program_address,
        &solana.merchant_address,
        &body.wallet,
        &solana.token_mint,
        token_program_address,
        solana.plan_id,
        solana.plan_address.as_deref(),
    )?;
    let plan_id = plan.id.clone();
    let merchant_address = solana.merchant_address.clone();
    let token_mint = solana.token_mint.clone();
    let receiver_token_account = solana.receiver_token_account.clone();
    let collector_address = solana
        .collector_address
        .clone()
        .unwrap_or_else(|| solana.merchant_address.clone());

    Ok(RouteResponse::ok(&json!({
        "method": "solana_subscription",
        "planId": plan_id,
        "resource": plan.id,
        "userId": buyer.user_id,
        "wallet": body.wallet,
        "network": config::network(seams),
        "programAddress": program_address,
        "merchantAddress": merchant_address,
        "solanaPlanId": solana.plan_id,
        "planAddress": addresses.plan_address,
        "planBump": addresses.plan_bump,
        "subscriptionAddress": addresses.subscription_address,
        "subscriptionAuthorityAddress": addresses.subscription_authority_address,
        "eventAuthorityAddress": addresses.event_authority_address,
        "subscriberTokenAccount": addresses.subscriber_token_account,
        "tokenMint": token_mint,
        "tokenProgramAddress": token_program_address,
        "receiverTokenAccount": receiver_token_account,
        "collectorAddress": collector_address,
        "amountAtomic": solana.amount_atomic,
        "periodHours": solana.period_hours,
        "numberOfPayments": number_of_payments,
        "expectedAmount": solana.amount_atomic,
        "expectedPeriodHours": solana.period_hours,
        "expectedCreatedAt": solana.expected_created_at,
        "expectedSubscriptionAuthorityInitId": solana.expected_subscription_authority_init_id,
    })))
}

pub(super) struct DerivedSubscriptionAddresses {
    pub(super) plan_address: String,
    pub(super) plan_bump: u8,
    pub(super) subscription_address: String,
    pub(super) subscription_authority_address: String,
    pub(super) event_authority_address: String,
    pub(super) subscriber_token_account: String,
}

pub(super) fn derive_subscription_addresses(
    program_address: &str,
    merchant_address: &str,
    wallet: &str,
    token_mint: &str,
    token_program_address: &str,
    plan_id: u64,
    configured_plan_address: Option<&str>,
) -> AppResult<DerivedSubscriptionAddresses> {
    let program = parse_pubkey(program_address)?;
    let merchant = parse_pubkey(merchant_address)?;
    let subscriber = parse_pubkey(wallet)?;
    let mint = parse_pubkey(token_mint)?;
    let token_program = parse_pubkey(token_program_address)?;
    let plan_id_bytes = plan_id.to_le_bytes();
    let (plan, plan_bump) =
        pubkey::find_program_address(&[b"plan", &merchant, &plan_id_bytes], &program);
    let plan_address = pubkey::encode(&plan);
    if configured_plan_address.is_some_and(|address| address != plan_address) {
        return Err(AppError::unprocessable(
            "plan has invalid Solana subscription metadata",
        ));
    }
    let (subscription, _) =
        pubkey::find_program_address(&[b"subscription", &plan, &subscriber], &program);
    let (authority, _) =
        pubkey::find_program_address(&[b"SubscriptionAuthority", &subscriber, &mint], &program);
    let (event_authority, _) = pubkey::find_program_address(&[b"event_authority"], &program);
    let subscriber_token_account = ata_for_token_program(&subscriber, &mint, &token_program);
    Ok(DerivedSubscriptionAddresses {
        plan_address,
        plan_bump,
        subscription_address: pubkey::encode(&subscription),
        subscription_authority_address: pubkey::encode(&authority),
        event_authority_address: pubkey::encode(&event_authority),
        subscriber_token_account,
    })
}

pub(super) fn ata_for_token_program(
    owner: &pubkey::Pubkey,
    mint: &pubkey::Pubkey,
    token_program: &pubkey::Pubkey,
) -> String {
    const ATA_PROGRAM: &str = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
    let ata_program = pubkey::parse(ATA_PROGRAM).expect("valid ATA program const");
    let (account, _) = pubkey::find_program_address(
        &[owner.as_ref(), token_program.as_ref(), mint.as_ref()],
        &ata_program,
    );
    pubkey::encode(&account)
}

pub(super) fn validate_solana_plan(solana: &super::support::ResolvedSolanaPlan) -> AppResult<()> {
    let program = solana
        .program_address
        .as_deref()
        .unwrap_or(DEFAULT_SOLANA_SUBSCRIPTIONS_PROGRAM);
    for address in [
        program,
        &solana.merchant_address,
        &solana.token_mint,
        solana
            .token_program_address
            .as_deref()
            .unwrap_or(DEFAULT_SOLANA_TOKEN_PROGRAM),
    ] {
        validate_address(address, "plan has invalid Solana subscription metadata")?;
    }
    for address in [
        solana.plan_address.as_deref(),
        solana.receiver_token_account.as_deref(),
        solana.collector_address.as_deref(),
    ]
    .into_iter()
    .flatten()
    {
        validate_address(address, "plan has invalid Solana subscription metadata")?;
    }
    Ok(())
}

pub(super) fn validate_address(address: &str, message: &'static str) -> AppResult<()> {
    parse_pubkey(address).map(|_| ()).map_err(|_| {
        AppError::new(
            422,
            if message.starts_with("wallet") {
                "invalid_wallet"
            } else {
                "invalid_resource"
            },
            message,
        )
    })
}

pub(super) fn validate_signature(signature: &str) -> AppResult<()> {
    if signature.len() < 86 || signature.len() > 90 {
        return Err(AppError::new(
            422,
            "invalid_signature",
            "authorizationSignature must be a valid Solana signature",
        ));
    }
    let decoded = bs58::decode(signature).into_vec().map_err(|_| {
        AppError::new(
            422,
            "invalid_signature",
            "authorizationSignature must be a valid Solana signature",
        )
    })?;
    if decoded.len() != 64 {
        return Err(AppError::new(
            422,
            "invalid_signature",
            "authorizationSignature must be a valid Solana signature",
        ));
    }
    Ok(())
}

pub(super) fn parse_pubkey(address: &str) -> AppResult<pubkey::Pubkey> {
    pubkey::parse(address).map_err(|_| AppError::unprocessable("invalid Solana address"))
}
