//! Activates a Solana subscription only after separate finalized subscribe and
//! initial `TransferSubscription` settlement proofs have been verified.

use super::solana_activation_store;
use super::solana_activation_support::{
    activation_response, active_solana_plan, validate_activation_request,
    ActivateSolanaSubscriptionReq,
};
use super::solana_activation_terms::ActivationTerms;
use super::solana_collection_store::{self as collection_store, CollectionFacts};
use super::solana_payment_verifier;
use super::solana_verifier;
use super::solana_wallet_binding::{self, WalletBinding};
use super::support::{normalize_interval, parse_body, require_match, resolve_plan};
use crate::auth;
use crate::blockchain_config;
use crate::error::AppResult;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;

pub(super) fn activate_solana_subscription<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
) -> AppResult<RouteResponse> {
    require_match(
        req,
        "POST",
        "/paywall/v1/subscription/solana-subscription/activate",
    )?;
    let buyer = auth::verify_buyer(seams, req)?;
    let body: ActivateSolanaSubscriptionReq = parse_body(req)?;
    validate_activation_request(&body)?;
    let interval = normalize_interval(Some(&body.interval))?;
    let plan = resolve_plan(seams, &body.plan_id, interval)?;
    let solana = active_solana_plan(&plan)?;
    let terms = ActivationTerms::resolve(
        &body.wallet,
        &body.subscription_address,
        body.subscription_authority_address.as_deref(),
        body.plan_address.as_deref(),
        &solana,
    )?;
    let binding = WalletBinding {
        user_id: &buyer.user_id,
        plan_id: &plan.id,
        interval,
        wallet: &body.wallet,
        subscription_address: &body.subscription_address,
        authorization_signature: &body.authorization_signature,
    };
    solana_wallet_binding::verify(
        &binding,
        &body.wallet_binding_message,
        &body.wallet_binding_signature,
    )?;
    collection_store::require_finalized(
        seams,
        &CollectionFacts {
            user_id: &buyer.user_id,
            plan_id: &plan.id,
            interval,
            wallet: &body.wallet,
            authorization_signature: &body.authorization_signature,
            wallet_binding_message: &body.wallet_binding_message,
            wallet_binding_signature: &body.wallet_binding_signature,
            subscription_address: &body.subscription_address,
        },
        &body.payment_signature,
    )?;
    let rpc_url = blockchain_config::read_solana_rpc_url(seams)?;

    solana_verifier::verify_authorization_transaction(
        seams,
        &rpc_url,
        &terms.authorization(&body.authorization_signature, &body.wallet, &solana),
    )?;
    let payment = solana_payment_verifier::verify_initial_payment(
        seams,
        &rpc_url,
        &terms.initial_payment(
            &body.payment_signature,
            &body.wallet,
            &solana,
            seams.now_unix_secs(),
        ),
    )?;
    let persisted = solana_activation_store::persist(
        seams,
        &terms.store_input(&buyer.user_id, &body, &plan, &solana, &payment),
    )?;
    Ok(RouteResponse::ok(&activation_response(&persisted.record)))
}
