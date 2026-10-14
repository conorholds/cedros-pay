//! Authenticated Pay-owned initial `TransferSubscription` collection route.

use serde_json::json;

use super::solana_activation_support::active_solana_plan;
use super::solana_activation_terms::ActivationTerms;
use super::solana_collection_input::{self as input, CollectInitialReq};
use super::solana_collection_rpc as collection_rpc;
use super::solana_collection_store::{self as store, CollectionFacts, StoredCollection};
use super::solana_collection_transaction as transaction;
use super::solana_verifier;
use super::solana_wallet_binding::{self, WalletBinding};
use super::support::{normalize_interval, parse_body, require_match, resolve_plan};
use crate::auth;
use crate::blockchain_config;
use crate::error::{AppError, AppResult};
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;
use crate::x402::rpc::Confirmation;

pub(super) fn collect_initial_payment<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
) -> AppResult<RouteResponse> {
    require_match(
        req,
        "POST",
        "/paywall/v1/subscription/solana-subscription/collect-initial",
    )?;
    let buyer = auth::verify_buyer(seams, req)?;
    let body: CollectInitialReq = parse_body(req)?;
    input::validate(&body)?;
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
    let rpc_url = blockchain_config::read_solana_rpc_url(seams)?;
    solana_verifier::verify_authorization_transaction(
        seams,
        &rpc_url,
        &terms.authorization(&body.authorization_signature, &body.wallet, &solana),
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
    let facts = CollectionFacts {
        user_id: &buyer.user_id,
        plan_id: &plan.id,
        interval,
        wallet: &body.wallet,
        authorization_signature: &body.authorization_signature,
        wallet_binding_message: &body.wallet_binding_message,
        wallet_binding_signature: &body.wallet_binding_signature,
        subscription_address: &body.subscription_address,
    };
    let input = terms.collection_input(&body.wallet, &solana);
    let (stored, fresh) = match store::load(seams, &facts)? {
        Some(stored) => (stored, false),
        None => {
            let prepared = transaction::prepare(seams, &rpc_url, &input)?;
            (store::claim(seams, &facts, &prepared)?, true)
        }
    };
    process(seams, &rpc_url, &input, stored, fresh)
}

fn process<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    input: &transaction::CollectionTransactionInput<'_>,
    stored: StoredCollection,
    fresh: bool,
) -> AppResult<RouteResponse> {
    match stored.record.status.as_str() {
        "finalized" => return Ok(response(&stored, true)),
        "failed" => return rebuild(seams, rpc_url, input, &stored),
        "submitted" => {}
        _ => return Err(AppError::internal("stored collection status is invalid")),
    }
    if fresh {
        broadcast(seams, rpc_url, &stored)?;
        return finalize(seams, rpc_url, &stored);
    }
    match collection_rpc::poll(seams, rpc_url, &stored.record.payment_signature)? {
        Confirmation::Finalized => settle(seams, &stored),
        Confirmation::Failed(_) => fail(seams, &stored),
        Confirmation::NotFound => {
            broadcast(seams, rpc_url, &stored)?;
            finalize(seams, rpc_url, &stored)
        }
        Confirmation::Processed | Confirmation::Confirmed => Ok(response(&stored, false)),
    }
}

fn rebuild<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    input: &transaction::CollectionTransactionInput<'_>,
    stored: &StoredCollection,
) -> AppResult<RouteResponse> {
    let prepared = transaction::prepare(seams, rpc_url, input)?;
    let replaced = store::replace(seams, stored, &prepared)?;
    broadcast(seams, rpc_url, &replaced)?;
    finalize(seams, rpc_url, &replaced)
}

fn broadcast<S: HostSeams>(seams: &S, rpc_url: &str, stored: &StoredCollection) -> AppResult<()> {
    let prepared = transaction::PreparedCollection {
        signed_transaction: stored.record.signed_transaction.clone(),
        signature: stored.record.payment_signature.clone(),
        blockhash: stored.record.blockhash.clone(),
    };
    if let Err(error) = collection_rpc::send(seams, rpc_url, &prepared) {
        if error.code == "collection_rejected" {
            store::mark(seams, stored, "failed")?;
        }
        return Err(error);
    }
    Ok(())
}

fn finalize<S: HostSeams>(
    seams: &S,
    rpc_url: &str,
    stored: &StoredCollection,
) -> AppResult<RouteResponse> {
    match collection_rpc::poll(seams, rpc_url, &stored.record.payment_signature)? {
        Confirmation::Finalized => settle(seams, stored),
        Confirmation::Failed(_) => fail(seams, stored),
        Confirmation::NotFound | Confirmation::Processed | Confirmation::Confirmed => {
            Ok(response(stored, false))
        }
    }
}

fn settle<S: HostSeams>(seams: &S, stored: &StoredCollection) -> AppResult<RouteResponse> {
    let finalized = store::mark(seams, stored, "finalized")?;
    if finalized.record.status != "finalized"
        || finalized.record.payment_signature != stored.record.payment_signature
    {
        return Err(AppError::conflict(
            "collection changed while finalization was being recorded; retry",
        ));
    }
    Ok(response(&finalized, true))
}

fn fail<S: HostSeams>(seams: &S, stored: &StoredCollection) -> AppResult<RouteResponse> {
    let failed = store::mark(seams, stored, "failed")?;
    if failed.record.status == "finalized" {
        return Ok(response(&failed, true));
    }
    if failed.record.status != "failed"
        || failed.record.payment_signature != stored.record.payment_signature
    {
        return Err(AppError::conflict(
            "collection changed while failure was being recorded; retry",
        ));
    }
    Err(AppError::new(
        422,
        "collection_failed",
        "initial Solana subscription collection failed on-chain; retry",
    ))
}

fn response(stored: &StoredCollection, finalized: bool) -> RouteResponse {
    RouteResponse::json(
        if finalized { 200 } else { 202 },
        &json!({
            "status": if finalized { "finalized" } else { "submitted" },
            "paymentSignature": stored.record.payment_signature,
        }),
    )
}
