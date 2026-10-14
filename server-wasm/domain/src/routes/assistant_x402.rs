//! Isolated outbound x402 purchasing for the Site Assistant.
//!
//! This route never calls the merchant signer and never reads merchant payout,
//! treasury, browser-wallet, or legacy-wallet configuration.

use serde_json::json;

use crate::blockchain_config::{self, AssistantX402Control};
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse, RouteSpec};
use crate::routes::matches;
use crate::seams::HostSeams;
use crate::time;

#[path = "assistant_x402_contract.rs"]
mod contract;
#[path = "assistant_x402_discovery.rs"]
mod discovery;
#[path = "assistant_x402_execution.rs"]
mod execution;
#[path = "assistant_x402_store.rs"]
mod store;
#[path = "assistant_x402_transaction.rs"]
mod transaction;

pub const ROUTES: &[RouteSpec] = &[RouteSpec {
    route_id: ids::ROUTE_ASSISTANT_X402_PURCHASE,
    method: "POST",
    path: "/assistant/v1/x402/purchase",
}];

pub fn handle<S: HostSeams>(seams: &S, req: &RouteRequest) -> AppResult<RouteResponse> {
    crate::native_storefront_policy::require_request(seams, req)?;
    if !matches(req, "POST", "/assistant/v1/x402/purchase") {
        return Err(AppError::not_found("unknown Assistant x402 route"));
    }
    let intent: contract::PurchaseIntent =
        serde_json::from_value(req.json_body()?).map_err(|error| {
            AppError::unprocessable("invalid Site Assistant purchase intent")
                .with_internal(error.to_string())
        })?;
    let target = contract::validate_resource_url(&intent.resource_url)?;
    let trusted = contract::authenticate(&crate::ctx::RequestContext::parse(&req.context_json))?;
    if !trusted.confirmation_verified {
        return Ok(contract::response(
            &target,
            contract::failure(
                "approval_required",
                "This purchase requires explicit approval.",
                None,
            ),
            true,
            false,
        ));
    }
    let Some(authorized_max) = trusted
        .authorized_max_amount_microunits
        .filter(|amount| *amount > 0)
    else {
        return Ok(contract::response(
            &target,
            contract::failure(
                "budget_denied",
                "No positive authenticated purchase budget was authorized.",
                None,
            ),
            true,
            false,
        ));
    };
    let requested_max = intent.max_amount_microunits.unwrap_or(authorized_max);
    if requested_max == 0 || requested_max > authorized_max {
        return Ok(contract::response(
            &target,
            contract::failure(
                "budget_denied",
                "The requested purchase ceiling exceeds the authenticated budget.",
                None,
            ),
            true,
            false,
        ));
    }
    execute(seams, &target, requested_max, &trusted)
}

fn execute<S: HostSeams>(
    seams: &S,
    target: &str,
    max_amount: u64,
    trusted: &contract::TrustedPurchaseContext,
) -> AppResult<RouteResponse> {
    let db = Db::new(seams, ids::DB_ACCESS);
    let entry_key = store::key(&trusted.idempotency_key);
    let fingerprint = crate::routes::checkout_claim::fingerprint(&json!({
        "schemaVersion": 1,
        "action": contract::ACTION,
        "assistantId": contract::ASSISTANT_ID,
        "runId": trusted.run_id,
        "requestId": trusted.request_id,
        "idempotencyKey": trusted.idempotency_key,
        "resourceUrl": target,
        "maxAmountMicrounits": max_amount,
    }))?;
    let existing = store::load(&db, &entry_key)?;
    if let Some(stored) = existing.as_ref() {
        if stored.record.fingerprint != fingerprint {
            return Ok(contract::response(
                target,
                contract::failure(
                    "failed",
                    "The idempotency identity was reused with different purchase intent.",
                    Some("replay_mismatch"),
                ),
                true,
                true,
            ));
        }
        validate_stored_intent(&stored.record, target, max_amount, trusted)?;
        if matches!(stored.record.status.as_str(), "confirmed" | "failed") {
            return execution::stored_response(stored);
        }
    }
    let control = match blockchain_config::resolve_assistant_x402_control(seams) {
        Ok(control) => control,
        Err(error) => return Ok(execution::config_failure(target, error, existing.is_some())),
    };
    if crate::x402::rpc::verify_cluster(seams, &control.rpc_url, &control.cluster).is_err() {
        return Ok(contract::response(
            target,
            contract::failure(
                "cluster_mismatch",
                "The Solana RPC does not match the Site Assistant cluster.",
                None,
            ),
            true,
            existing.is_some(),
        ));
    }
    if let Some(stored) = existing {
        return resume(seams, &db, stored, &control, max_amount);
    }
    start(
        seams,
        &db,
        &control,
        StartInput {
            entry_key: &entry_key,
            fingerprint,
            target,
            trusted,
            max_amount,
        },
    )
}

struct StartInput<'a> {
    entry_key: &'a str,
    fingerprint: String,
    target: &'a str,
    trusted: &'a contract::TrustedPurchaseContext,
    max_amount: u64,
}

fn start<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    control: &AssistantX402Control,
    input: StartInput<'_>,
) -> AppResult<RouteResponse> {
    let StartInput {
        entry_key,
        fingerprint,
        target,
        trusted,
        max_amount,
    } = input;
    let (requirement, requirement_digest) =
        match discovery::discover(seams, target, control, max_amount, None) {
            Ok(value) => value,
            Err(error) => return Ok(execution::discovery_failure(target, error, false)),
        };
    if let Err(code) = discovery::check_funding(seams, control, &requirement) {
        let output = if code == "insufficient_balance" {
            contract::failure(
                "insufficient_balance",
                "The Site Assistant wallet has insufficient balance.",
                None,
            )
        } else {
            contract::failure(
                "failed",
                "The Site Assistant wallet balance could not be verified.",
                Some("balance_check_failed"),
            )
        };
        return Ok(contract::response(target, output, true, false));
    }
    let blockhash = match discovery::latest_blockhash(seams, &control.rpc_url) {
        Ok(value) => value,
        Err(_) => {
            return Ok(contract::response(
                target,
                contract::failure(
                    "failed",
                    "A canonical Solana transaction could not be prepared.",
                    Some("submission_failure"),
                ),
                true,
                false,
            ));
        }
    };
    let unsigned = transaction::build(control, &requirement, &blockhash).map_err(|error| {
        AppError::internal("could not construct Assistant x402 transaction").with_internal(error)
    })?;
    let now = time::iso8601(seams.now_unix_secs());
    let expected_fingerprint = fingerprint.clone();
    let record = store::PurchaseRecord {
        schema_version: 1,
        fingerprint,
        resource_url: target.to_string(),
        run_id: trusted.run_id.clone(),
        request_id: trusted.request_id.clone(),
        idempotency_key: trusted.idempotency_key.clone(),
        wallet_id: control.wallet_id.clone(),
        wallet_version_id: control.wallet_version_id.clone(),
        payer_public_key: control.public_key.clone(),
        cluster: control.cluster.clone(),
        requirement_digest,
        pay_to: requirement.pay_to,
        asset: requirement.asset,
        recipient_token_account: requirement.recipient_token_account,
        amount_microunits: requirement.amount,
        decimals: requirement.decimals,
        memo: requirement.memo,
        blockhash,
        unsigned_wire_base64: unsigned.wire_base64,
        transaction_sha256: unsigned.sha256,
        signed_wire_base64: None,
        signature: None,
        policy_decision_id: None,
        status: "prepared".to_string(),
        output: None,
        is_error: false,
        created_at: now.clone(),
        updated_at: now,
    };
    let stored = store::claim(db, entry_key, record)?;
    if stored.record.fingerprint != expected_fingerprint {
        return Ok(contract::response(
            target,
            contract::failure(
                "failed",
                "The idempotency identity was reused with different purchase intent.",
                Some("replay_mismatch"),
            ),
            true,
            true,
        ));
    }
    validate_stored_intent(&stored.record, target, max_amount, trusted)?;
    if stored.replayed {
        if matches!(stored.record.status.as_str(), "confirmed" | "failed") {
            return execution::stored_response(&stored);
        }
        return resume(seams, db, stored, control, max_amount);
    }
    execution::sign_and_submit(seams, db, stored, control, false)
}

fn resume<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    stored: store::StoredPurchase,
    control: &AssistantX402Control,
    max_amount: u64,
) -> AppResult<RouteResponse> {
    if stored.record.wallet_id != control.wallet_id {
        return execution::terminal_failure(
            seams,
            db,
            stored,
            "failed",
            "The active Site Assistant wallet no longer matches this purchase.",
            "wrong_wallet",
        );
    }
    if stored.record.wallet_version_id != control.wallet_version_id {
        return execution::terminal_failure(
            seams,
            db,
            stored,
            "stale_wallet_version",
            "The Site Assistant wallet version changed before completion.",
            "stale_wallet_version",
        );
    }
    if stored.record.cluster != control.cluster {
        return execution::terminal_failure(
            seams,
            db,
            stored,
            "cluster_mismatch",
            "The Site Assistant wallet cluster changed before completion.",
            "cluster_mismatch",
        );
    }
    if stored.record.payer_public_key != control.public_key {
        return execution::terminal_failure(
            seams,
            db,
            stored,
            "failed",
            "The Site Assistant payer no longer matches this purchase.",
            "payer_mismatch",
        );
    }
    execution::validate_prepared(&stored.record, control)?;
    if stored.record.signature.is_some() {
        if let Some(response) = execution::reconcile(seams, db, &stored, control)? {
            return Ok(response);
        }
    }
    match discovery::discover(
        seams,
        &stored.record.resource_url,
        control,
        max_amount,
        Some(&stored.record.requirement_digest),
    ) {
        Ok(_) => execution::sign_and_submit(seams, db, stored, control, true),
        Err(discovery::DiscoveryError::Changed) => execution::terminal_failure(
            seams,
            db,
            stored,
            "failed",
            "The x402 requirement changed while this purchase was unresolved.",
            "changed_requirement",
        ),
        Err(error) => Ok(execution::discovery_failure(
            &stored.record.resource_url,
            error,
            true,
        )),
    }
}

fn validate_stored_intent(
    record: &store::PurchaseRecord,
    target: &str,
    max_amount: u64,
    trusted: &contract::TrustedPurchaseContext,
) -> AppResult<()> {
    if record.schema_version != 1
        || record.resource_url != target
        || record.run_id != trusted.run_id
        || record.request_id != trusted.request_id
        || record.idempotency_key != trusted.idempotency_key
        || record.amount_microunits == 0
        || record.amount_microunits > max_amount
    {
        return Err(AppError::conflict(
            "stored Assistant purchase does not match authorized intent",
        ));
    }
    Ok(())
}

#[cfg(test)]
#[path = "assistant_x402_tests.rs"]
mod tests;
