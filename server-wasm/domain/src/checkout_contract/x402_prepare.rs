use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::{GuardedBatchOutcome, GuardedCondition};
use crate::models::{LedgerEntry, TokenSettlement};
use crate::seams::HostSeams;

use super::record::OperationRecord;
use super::{X402QuoteBinding, OPERATION_MODEL};

pub(super) struct Proof {
    pub transaction: String,
    pub signature: String,
    pub rpc_url: String,
    payer_wallet: String,
    recent_blockhash: String,
}

pub(super) fn proof<S: HostSeams>(
    seams: &S,
    transaction: &str,
    binding: &X402QuoteBinding,
) -> AppResult<Proof> {
    let bytes = BASE64
        .decode(transaction.trim())
        .map_err(|_| AppError::unprocessable("x402 transaction is not valid base64"))?;
    let control = crate::blockchain_config::resolve_x402_control(
        seams,
        crate::x402::config::payment_address(seams),
        crate::x402::config::network(seams),
    )
    .map_err(|_| AppError::new(503, "x402_unavailable", "x402 control is unavailable"))?;
    let current_fee_payer = control
        .managed_signer
        .as_ref()
        .map(|signer| signer.public_key.as_str());
    if control.pay_to != binding.pay_to
        || control.network != binding.network
        || current_fee_payer != binding.fee_payer.as_deref()
    {
        return Err(AppError::conflict(
            "x402 payment authority changed; request a new quote",
        ));
    }
    let requirement = crate::x402::verifier::Requirement {
        recipient_token_account: binding.recipient_token_account.clone(),
        token_mint: binding.token_mint.clone(),
        min_amount_atomic: binding.amount_atomic,
        decimals: binding.decimals,
        resource_id: binding.memo.strip_prefix("resource=").map(str::to_string),
    };
    let transaction = if control.managed_signer.is_some() {
        crate::x402::managed::sign(seams, transaction, &requirement, &control, true).map_err(
            |error| {
                if error == "managed signer is unavailable" {
                    AppError::new(503, "x402_signer_unavailable", error)
                } else {
                    AppError::unprocessable(error)
                }
            },
        )?
    } else if crate::x402::config::gasless_enabled(seams) {
        return Err(AppError::new(
            503,
            "x402_signer_unavailable",
            "managed x402 signer is unavailable",
        ));
    } else {
        BASE64.encode(bytes)
    };
    let requirement = crate::x402::verifier::CanonicalRequirement {
        recipient_token_account: binding.recipient_token_account.clone(),
        token_mint: binding.token_mint.clone(),
        amount_atomic: binding.amount_atomic,
        decimals: binding.decimals,
        memo: binding.memo.clone(),
    };
    let verified = crate::x402::verifier::verify_canonical_proof(&transaction, &requirement)
        .map_err(|error| AppError::unprocessable(error.code()))?;
    let signed_bytes = BASE64
        .decode(&transaction)
        .map_err(|_| AppError::internal("signed x402 transaction is invalid"))?;
    let parsed = crate::x402::transaction::parse(&signed_bytes)
        .map_err(|_| AppError::unprocessable("x402 transaction is malformed"))?;
    Ok(Proof {
        transaction,
        signature: verified.signature,
        rpc_url: control.rpc_url,
        payer_wallet: verified.payer_wallet,
        recent_blockhash: crate::x402::pubkey::encode(&parsed.recent_blockhash),
    })
}

pub(super) fn prepare<S: HostSeams>(
    db: &Db<'_, S>,
    seams: &S,
    command: &super::x402_settlement::Command<'_>,
    proof: &Proof,
) -> AppResult<(OperationRecord, bool)> {
    if let Some(record) = db.read_one(OPERATION_MODEL, command.identity.entry_key())? {
        return replay(record.parse()?, command, proof);
    }
    let record = OperationRecord::prepared_x402(
        command.identity,
        command.attempt,
        command.context.clone(),
        super::record::X402Settlement {
            transaction: proof.transaction.clone(),
            signature: proof.signature.clone(),
            recent_blockhash: proof.recent_blockhash.clone(),
            network: command.binding.network.clone(),
            quote_config_fingerprint: command.binding.config_fingerprint.clone(),
            blockhash_valid_at_slot: None,
        },
        seams.now_unix_secs(),
    );
    commit_prepared(db, seams, command, proof, record)
}

fn commit_prepared<S: HostSeams>(
    db: &Db<'_, S>,
    seams: &S,
    command: &super::x402_settlement::Command<'_>,
    proof: &Proof,
    record: OperationRecord,
) -> AppResult<(OperationRecord, bool)> {
    let claim = super::settlement_claim::prepare(
        db,
        &record.canonical_context,
        command.identity,
        seams.now_unix_secs(),
    )?;
    let extras = super::SettlementExtras::from_context(
        record.operation_id.clone(),
        &record.canonical_context,
    )?
    .on_claim(db, seams.now_unix_secs())?;
    let ledger = pending_ledger(command, proof, seams.now_unix_secs());
    let mut conditions = vec![
        GuardedCondition::Absent {
            content_model_id: OPERATION_MODEL,
            entry_key: command.identity.entry_key().into(),
        },
        GuardedCondition::Absent {
            content_model_id: crate::ids::MODEL_LEDGER,
            entry_key: proof.signature.clone(),
        },
        claim.condition,
    ];
    conditions.extend(extras.conditions);
    let mut ops = vec![
        super::settlement_storage::write(OPERATION_MODEL, command.identity.entry_key(), &record)?,
        super::settlement_storage::write(crate::ids::MODEL_LEDGER, &proof.signature, &ledger)?,
        claim.op,
    ];
    ops.extend(extras.ops);
    if conditions.len() > 32 {
        return Err(AppError::unprocessable(
            "x402 checkout exceeds the guarded condition limit",
        ));
    }
    match db.guarded_batch(&conditions, &ops)? {
        GuardedBatchOutcome::Applied { .. } => Ok((record, false)),
        GuardedBatchOutcome::Conflict { .. } => {
            let stored = db
                .read_one(OPERATION_MODEL, command.identity.entry_key())?
                .ok_or_else(|| AppError::conflict("quote was claimed by another settlement"))?;
            replay(stored.parse()?, command, proof)
        }
    }
}

fn replay(
    record: OperationRecord,
    command: &super::x402_settlement::Command<'_>,
    proof: &Proof,
) -> AppResult<(OperationRecord, bool)> {
    super::record::validate_match(&record, command.identity, command.attempt)?;
    let terminal_legacy_record = record.settlement_state != super::record::SettlementState::Pending;
    let exact = record.x402_settlement.as_ref().is_some_and(|stored| {
        stored.transaction == proof.transaction
            && stored.signature == proof.signature
            && stored.recent_blockhash == proof.recent_blockhash
            && (stored.network == command.binding.network
                || (stored.network.is_empty() && terminal_legacy_record))
            && stored.quote_config_fingerprint == command.binding.config_fingerprint
    });
    if !exact {
        return Err(AppError::conflict(
            "x402 replay proof differs from prepared checkout",
        ));
    }
    Ok((record, true))
}

fn pending_ledger(
    command: &super::x402_settlement::Command<'_>,
    proof: &Proof,
    now: i64,
) -> LedgerEntry {
    LedgerEntry {
        reference: proof.signature.clone(),
        kind: "payment".into(),
        status: "pending".into(),
        gross_cents: command.amount_cents,
        currency: command.currency.into(),
        provider: "x402".into(),
        provider_ref: Some(proof.signature.clone()),
        payer_wallet: Some(proof.payer_wallet.clone()),
        created_at: crate::time::iso8601(now),
        processed_at: crate::time::iso8601(now),
        token_settlement: Some(TokenSettlement {
            amount_atomic: command.binding.amount_atomic,
            mint: command.binding.token_mint.clone(),
            decimals: command.binding.decimals,
            transaction_base64: Some(proof.transaction.clone()),
            recent_blockhash: Some(proof.recent_blockhash.clone()),
            network: Some(command.binding.network.clone()),
        }),
        ..Default::default()
    }
}
