use serde::Serialize;

use super::{contract, discovery, store, transaction};
use crate::blockchain_config::AssistantX402Control;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::RouteResponse;
use crate::seams::HostSeams;
use crate::time;
use crate::x402::rpc::Confirmation;

const ASSISTANT_X402_MAX_FEE_LAMPORTS: u64 = 5_000;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AssistantX402SignPayload<'a> {
    wallet_id: &'a str,
    wallet_version_id: &'a str,
    cluster: &'a str,
    serialized_transaction_base64: &'a str,
    transaction_sha256: &'a str,
    payment_mint: &'a str,
    payment_amount_microunits: u64,
    token_decimals: u8,
    pay_to: &'a str,
    destination_token_account: &'a str,
    memo: &'a str,
    max_fee_lamports: u64,
    request_id: &'a str,
    assistant_id: &'static str,
    run_id: &'a str,
    idempotency_key: &'a str,
}

pub(super) fn sign_and_submit<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    mut stored: store::StoredPurchase,
    control: &AssistantX402Control,
    replayed: bool,
) -> AppResult<RouteResponse> {
    validate_prepared(&stored.record, control)?;
    if stored.record.signed_wire_base64.is_none() {
        let payload = AssistantX402SignPayload {
            wallet_id: &stored.record.wallet_id,
            wallet_version_id: &stored.record.wallet_version_id,
            cluster: &stored.record.cluster,
            serialized_transaction_base64: &stored.record.unsigned_wire_base64,
            transaction_sha256: &stored.record.transaction_sha256,
            payment_mint: &stored.record.asset,
            payment_amount_microunits: stored.record.amount_microunits,
            token_decimals: stored.record.decimals,
            pay_to: &stored.record.pay_to,
            destination_token_account: &stored.record.recipient_token_account,
            memo: &stored.record.memo,
            max_fee_lamports: ASSISTANT_X402_MAX_FEE_LAMPORTS,
            request_id: &stored.record.request_id,
            assistant_id: contract::ASSISTANT_ID,
            run_id: &stored.record.run_id,
            idempotency_key: &stored.record.idempotency_key,
        };
        let payload = serde_json::to_string(&payload)
            .expect("the bounded assistant x402 signing payload must serialize");
        let raw = match seams.provider_execute(
            ids::PROVIDER_BLOCKCHAIN_ASSISTANT_X402_SIGN,
            ids::PROVIDER_BLOCKCHAIN,
            ids::OP_BLOCKCHAIN_ASSISTANT_X402_SIGN,
            &payload,
        ) {
            Ok(raw) => raw,
            Err(error) => return signing_error(seams, db, stored, control, &error.message),
        };
        let signed: transaction::SignResponse = match serde_json::from_str(&raw) {
            Ok(value) => value,
            Err(_) => {
                return terminal_failure(
                    seams,
                    db,
                    stored,
                    "failed",
                    "The signing service returned an unsafe response.",
                    "signing_rejected",
                );
            }
        };
        if transaction::validate_signed(
            control,
            &stored.record.unsigned_wire_base64,
            &stored.record.transaction_sha256,
            &signed,
        )
        .is_err()
        {
            return terminal_failure(
                seams,
                db,
                stored,
                "failed",
                "The signing service returned an unsafe response.",
                "signing_rejected",
            );
        }
        stored.record.signed_wire_base64 = Some(signed.signed_transaction_base64);
        stored.record.signature = Some(signed.signature);
        stored.record.policy_decision_id = Some(signed.policy_decision_id);
        stored.record.status = "signed".to_string();
        stored.record.updated_at = time::iso8601(seams.now_unix_secs());
        let record = stored.record.clone();
        stored = store::update(db, stored, record)?;
        stored.replayed = replayed;
    }
    submit_signed(seams, db, stored, control, replayed)
}

fn signing_error<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    stored: store::StoredPurchase,
    control: &AssistantX402Control,
    raw: &str,
) -> AppResult<RouteResponse> {
    let normalized = raw.to_ascii_lowercase();
    if normalized.contains("budget") {
        return terminal_failure(
            seams,
            db,
            stored,
            "budget_denied",
            "The purchase was denied by the authorized budget.",
            "budget_denied",
        );
    }
    if normalized.contains("policy") || normalized.contains("denied") {
        return terminal_failure(
            seams,
            db,
            stored,
            "vault_policy_denied",
            "The purchase was denied by wallet policy.",
            "policy_denied",
        );
    }
    if normalized.contains("stale") || normalized.contains("version") {
        return terminal_failure(
            seams,
            db,
            stored,
            "stale_wallet_version",
            "The Site Assistant wallet version is stale.",
            "stale_wallet_version",
        );
    }
    if normalized.contains("conflict")
        || normalized.contains("mismatch")
        || normalized.contains("invalid")
        || normalized.contains("reject")
    {
        return terminal_failure(
            seams,
            db,
            stored,
            "failed",
            "The signing service rejected this purchase.",
            "signing_rejected",
        );
    }
    let target = stored.record.resource_url.clone();
    let mut record = stored.record.clone();
    let output = contract::payer_output(
        "ambiguous",
        "The signing result is unresolved; retry this exact purchase.",
        &control.public_key,
        &control.cluster,
    );
    record.status = "signing_ambiguous".to_string();
    record.output = Some(output.clone());
    record.is_error = false;
    record.updated_at = time::iso8601(seams.now_unix_secs());
    let replayed = stored.replayed;
    let _ = store::update(db, stored, record)?;
    Ok(contract::response(&target, output, false, replayed))
}

fn submit_signed<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    stored: store::StoredPurchase,
    control: &AssistantX402Control,
    replayed: bool,
) -> AppResult<RouteResponse> {
    let requirement = requirement_from_record(&stored.record);
    let signed = stored.record.signed_wire_base64.as_deref().ok_or_else(|| {
        AppError::internal("Assistant purchase signed state omitted transaction bytes")
    })?;
    let signature = stored.record.signature.as_deref().ok_or_else(|| {
        AppError::internal("Assistant purchase signed state omitted its signature")
    })?;
    let header = transaction::payment_header(&requirement, &control.public_key, signed, signature);
    let _ = discovery::submit(seams, &stored.record.resource_url, &header);
    match discovery::confirmation(seams, &control.rpc_url, signature) {
        Ok(Confirmation::Confirmed | Confirmation::Finalized) | Ok(Confirmation::Failed(_)) => {
            confirmed_outcome(seams, db, stored, control, replayed)
        }
        Ok(Confirmation::NotFound | Confirmation::Processed) | Err(()) => {
            // A remote merchant can broadcast and then return any HTTP error.
            persist_ambiguous(seams, db, stored, control, replayed)
        }
    }
}

pub(super) fn reconcile<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    stored: &store::StoredPurchase,
    control: &AssistantX402Control,
) -> AppResult<Option<RouteResponse>> {
    let Some(signature) = stored.record.signature.as_deref() else {
        return Ok(None);
    };
    match discovery::confirmation(seams, &control.rpc_url, signature) {
        Ok(Confirmation::Confirmed | Confirmation::Finalized) | Ok(Confirmation::Failed(_)) => {
            confirmed_outcome(seams, db, clone_stored(stored), control, true).map(Some)
        }
        Ok(Confirmation::NotFound) => {
            // A missing signature or invalid blockhash is not terminal evidence.
            if stored.record.status == "ambiguous" {
                return Ok(Some(contract::response(
                    &stored.record.resource_url,
                    contract::payer_output(
                        "ambiguous",
                        "The submitted purchase is still awaiting reconciliation.",
                        &control.public_key,
                        &control.cluster,
                    ),
                    false,
                    true,
                )));
            }
            Ok(None)
        }
        Ok(Confirmation::Processed) | Err(()) => Ok(Some(contract::response(
            &stored.record.resource_url,
            contract::payer_output(
                "ambiguous",
                "The submitted purchase is still awaiting reconciliation.",
                &control.public_key,
                &control.cluster,
            ),
            false,
            true,
        ))),
    }
}

fn confirmed_outcome<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    stored: store::StoredPurchase,
    control: &AssistantX402Control,
    replayed: bool,
) -> AppResult<RouteResponse> {
    let signature = stored
        .record
        .signature
        .as_deref()
        .ok_or_else(|| AppError::internal("Assistant purchase omitted its signature"))?;
    let transaction =
        stored.record.signed_wire_base64.as_deref().ok_or_else(|| {
            AppError::internal("Assistant purchase omitted signed transaction bytes")
        })?;
    match crate::x402::rpc::load_confirmed_transaction(
        seams,
        &control.rpc_url,
        signature,
        transaction,
    ) {
        Ok(crate::x402::rpc::ConfirmedTransaction::Succeeded) => {
            finalize_success(seams, db, stored, control, "confirmed", replayed)
        }
        Ok(crate::x402::rpc::ConfirmedTransaction::Failed(_)) => terminal_failure(
            seams,
            db,
            stored,
            "transaction_failed",
            "The submitted transaction failed on-chain.",
            "transaction_failed",
        ),
        _ => persist_ambiguous(seams, db, stored, control, replayed),
    }
}

fn finalize_success<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    stored: store::StoredPurchase,
    control: &AssistantX402Control,
    confirmation: &str,
    replayed: bool,
) -> AppResult<RouteResponse> {
    let signature =
        stored.record.signature.clone().ok_or_else(|| {
            AppError::internal("confirmed Assistant purchase omitted its signature")
        })?;
    let output = contract::success_output(
        &stored.record.resource_url,
        &control.public_key,
        &control.cluster,
        &signature,
        stored.record.policy_decision_id.as_deref(),
        confirmation,
    );
    let target = stored.record.resource_url.clone();
    let mut record = stored.record.clone();
    record.status = "confirmed".to_string();
    record.output = Some(output.clone());
    record.is_error = false;
    record.updated_at = time::iso8601(seams.now_unix_secs());
    let _ = store::update(db, stored, record)?;
    Ok(contract::response(&target, output, false, replayed))
}

fn persist_ambiguous<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    stored: store::StoredPurchase,
    control: &AssistantX402Control,
    replayed: bool,
) -> AppResult<RouteResponse> {
    let output = contract::payer_output(
        "ambiguous",
        "Submission is unresolved and requires exact-request reconciliation.",
        &control.public_key,
        &control.cluster,
    );
    let target = stored.record.resource_url.clone();
    let mut record = stored.record.clone();
    record.status = "ambiguous".to_string();
    record.output = Some(output.clone());
    record.is_error = false;
    record.updated_at = time::iso8601(seams.now_unix_secs());
    let _ = store::update(db, stored, record)?;
    Ok(contract::response(&target, output, false, replayed))
}

pub(super) fn terminal_failure<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    stored: store::StoredPurchase,
    status: &str,
    message: &str,
    code: &str,
) -> AppResult<RouteResponse> {
    let output = contract::failure(status, message, Some(code));
    let target = stored.record.resource_url.clone();
    let replayed = stored.replayed;
    let mut record = stored.record.clone();
    record.status = "failed".to_string();
    record.output = Some(output.clone());
    record.is_error = true;
    record.updated_at = time::iso8601(seams.now_unix_secs());
    let _ = store::update(db, stored, record)?;
    Ok(contract::response(&target, output, true, replayed))
}

pub(super) fn validate_prepared(
    record: &store::PurchaseRecord,
    control: &AssistantX402Control,
) -> AppResult<()> {
    let requirement = requirement_from_record(record);
    let rebuilt = transaction::build(control, &requirement, &record.blockhash)
        .map_err(|_| AppError::conflict("stored Assistant transaction is invalid"))?;
    if record.wallet_id != control.wallet_id
        || record.wallet_version_id != control.wallet_version_id
        || record.payer_public_key != control.public_key
        || record.cluster != control.cluster
        || discovery::requirement_digest(&requirement) != record.requirement_digest
        || rebuilt.wire_base64 != record.unsigned_wire_base64
        || rebuilt.sha256 != record.transaction_sha256
        || !control.allowed_token_mints.contains(&record.asset)
        || crate::x402::ata::derive_token_account(&record.pay_to, &record.asset)
            .ok()
            .as_deref()
            != Some(record.recipient_token_account.as_str())
        || crate::x402::config::validate_payment_asset(
            &record.cluster,
            &record.asset,
            record.decimals,
            None,
        )
        .is_err()
    {
        return Err(AppError::conflict(
            "stored Assistant transaction differs from purchase terms",
        ));
    }
    match (
        &record.signed_wire_base64,
        &record.signature,
        &record.policy_decision_id,
    ) {
        (None, None, None) => {}
        (Some(wire), Some(signature), Some(policy)) => {
            let response = transaction::SignResponse {
                wallet_id: record.wallet_id.clone(),
                wallet_version_id: record.wallet_version_id.clone(),
                transaction_sha256: record.transaction_sha256.clone(),
                signed_transaction_base64: wire.clone(),
                signature: signature.clone(),
                policy_decision_id: policy.clone(),
                signed_at: record.updated_at.clone(),
            };
            transaction::validate_signed(control, &rebuilt.wire_base64, &rebuilt.sha256, &response)
                .map_err(|_| AppError::conflict("stored Assistant signature is invalid"))?;
        }
        _ => {
            return Err(AppError::conflict(
                "stored Assistant signing evidence is incomplete",
            ))
        }
    }
    Ok(())
}

fn requirement_from_record(record: &store::PurchaseRecord) -> discovery::Requirement {
    discovery::Requirement {
        scheme: "solana-spl-transfer".to_string(),
        network: record.cluster.clone(),
        amount: record.amount_microunits,
        resource: record.resource_url.clone(),
        pay_to: record.pay_to.clone(),
        asset: record.asset.clone(),
        recipient_token_account: record.recipient_token_account.clone(),
        decimals: record.decimals,
        memo: record.memo.clone(),
    }
}

pub(super) fn stored_response(stored: &store::StoredPurchase) -> AppResult<RouteResponse> {
    let output =
        stored.record.output.clone().ok_or_else(|| {
            AppError::internal("terminal Assistant purchase lacks a durable result")
        })?;
    Ok(contract::response(
        &stored.record.resource_url,
        output,
        stored.record.is_error,
        true,
    ))
}

pub(super) fn config_failure(target: &str, error: AppError, replayed: bool) -> RouteResponse {
    let status = match error.code {
        "wallet_rotating" => "wallet_rotating",
        "wallet_disabled" => "wallet_disabled",
        "wallet_blocked" => "wallet_blocked",
        "wallet_pending" => "wallet_pending",
        "cluster_mismatch" => "cluster_mismatch",
        _ => "wallet_unavailable",
    };
    contract::response(
        target,
        contract::failure(status, &error.message, None),
        true,
        replayed,
    )
}

pub(super) fn discovery_failure(
    target: &str,
    error: discovery::DiscoveryError,
    replayed: bool,
) -> RouteResponse {
    let (status, message, code) = match error {
        discovery::DiscoveryError::Budget => (
            "budget_denied",
            "The x402 requirement exceeds the authorized purchase ceiling.",
            "budget_denied",
        ),
        discovery::DiscoveryError::Cluster => (
            "cluster_mismatch",
            "The x402 requirement does not match the Site Assistant cluster.",
            "cluster_mismatch",
        ),
        discovery::DiscoveryError::Changed => (
            "failed",
            "The x402 requirement changed while this purchase was unresolved.",
            "changed_requirement",
        ),
        discovery::DiscoveryError::Invalid => (
            "failed",
            "The resource returned an invalid or unsafe x402 requirement.",
            "invalid_requirement",
        ),
        discovery::DiscoveryError::Transport => (
            "failed",
            "The x402 requirement could not be discovered.",
            "discovery_failure",
        ),
    };
    contract::response(
        target,
        contract::failure(status, message, Some(code)),
        true,
        replayed,
    )
}

fn clone_stored(stored: &store::StoredPurchase) -> store::StoredPurchase {
    store::StoredPurchase {
        entry: stored.entry.clone(),
        record: stored.record.clone(),
        replayed: true,
    }
}
