use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;

use super::record::{OperationRecord, SettlementState};
use super::{
    CanonicalCheckoutFacade, CanonicalOperationContext, CanonicalPaymentOutcome, CheckoutAttemptId,
    OperationIdentity, X402QuoteBinding,
};

pub(super) struct Command<'a> {
    pub identity: &'a OperationIdentity,
    pub attempt: &'a CheckoutAttemptId,
    pub context: CanonicalOperationContext,
    pub binding: &'a X402QuoteBinding,
    pub transaction: &'a str,
    pub amount_cents: i64,
    pub currency: &'a str,
}

pub(super) fn execute<S: HostSeams>(
    facade: &CanonicalCheckoutFacade<'_, S>,
    command: Command<'_>,
) -> AppResult<CanonicalPaymentOutcome> {
    let proof = super::x402_prepare::proof(facade.seams, command.transaction, command.binding)?;
    let db = crate::db::Db::new(facade.seams, crate::ids::DB_ACCESS);
    let existing = db
        .read_one(super::OPERATION_MODEL, command.identity.entry_key())?
        .is_some();
    if !existing {
        verify_cluster(facade.seams, &proof.rpc_url, &command.binding.network)?;
    }
    let (record, replayed) = super::x402_prepare::prepare(&db, facade.seams, &command, &proof)?;
    if record.settlement_state != SettlementState::Pending {
        return super::x402_chain::stored_outcome(&record, true);
    }
    validate_persisted_proof(facade.seams, &record)?;
    if existing {
        verify_cluster(facade.seams, &proof.rpc_url, &command.binding.network)?;
    }
    let send = facade.seams.http_fetch(
        &crate::x402::rpc::build_send_transaction(&proof.rpc_url, &proof.transaction).to_string(),
    );
    if let Ok(raw) = send {
        if let Ok(returned) = crate::x402::rpc::parse_send_transaction(&raw) {
            if returned != proof.signature {
                return Ok(super::x402_chain::indeterminate(
                    &record,
                    "x402-signature-mismatch",
                    replayed,
                ));
            }
        }
    }
    super::x402_chain::settle(facade.seams, &proof.rpc_url, &record, replayed)
}

/// Restart-safe canonical reconciler. It only rebroadcasts the exact persisted
/// transaction and derives terminality from chain facts, never record age.
pub(super) fn reconcile<S: HostSeams>(
    seams: &S,
    record: &OperationRecord,
) -> AppResult<CanonicalPaymentOutcome> {
    validate_persisted_proof(seams, record)?;
    let x402 = record
        .x402_settlement
        .as_ref()
        .ok_or_else(|| AppError::internal("x402 settlement details are missing"))?;
    let Ok(rpc_url) = crate::blockchain_config::read_solana_rpc_url(seams) else {
        return Ok(super::x402_chain::indeterminate(
            record,
            "x402-rpc-unavailable",
            true,
        ));
    };
    if crate::x402::rpc::verify_cluster(seams, &rpc_url, &x402.network).is_err() {
        return Ok(super::x402_chain::indeterminate(
            record,
            "x402-rpc-unavailable",
            true,
        ));
    }
    let _ = seams.http_fetch(
        &crate::x402::rpc::build_send_transaction(&rpc_url, &x402.transaction).to_string(),
    );
    super::x402_chain::settle(seams, &rpc_url, record, true)
}

/// Restart recovery re-establishes the original quote binding; the presence of
/// signed bytes in storage alone does not authorize settlement or broadcast.
fn validate_persisted_proof<S: HostSeams>(seams: &S, record: &OperationRecord) -> AppResult<()> {
    use crate::x402::{ata, config, pubkey, transaction, verifier};
    use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
    super::record_validation::validate_stored_outcome(record)?;
    let invalid = || AppError::internal("persisted x402 proof does not match its quote");
    let evidence = record.x402_settlement.as_ref().ok_or_else(invalid)?;
    let db = crate::db::Db::new(seams, crate::ids::DB_ACCESS);
    let quote_id = super::record_rail::quote_id(record)?;
    let key = super::identity::operation_entry_key(quote_id)?;
    let quote: OperationRecord =
        super::settlement_storage::required(&db, super::OPERATION_MODEL, &key)?.parse()?;
    let CanonicalOperationContext::Quote { snapshot, .. } = &quote.canonical_context else {
        return Err(invalid());
    };
    let binding = snapshot.x402.as_ref().ok_or_else(invalid)?;
    let CanonicalOperationContext::Checkout { quote_scope, .. } = &record.canonical_context else {
        return Err(invalid());
    };
    if !quote.settlement_claim.as_ref().is_some_and(|claim| {
        claim.rail == super::PaymentMethod::X402
            && claim.checkout_operation_id == record.operation_id
            && claim.material_fingerprint == record.material_fingerprint
            && claim.state == super::record::SettlementClaimState::Prepared
    }) {
        return Err(invalid());
    }
    if quote.operation_id != quote_id
        || &quote.provider_scope != quote_scope
        || binding.config_fingerprint != evidence.quote_config_fingerprint
        || binding.network != evidence.network
        || ata::derive_token_account(&binding.pay_to, &binding.token_mint)
            .ok()
            .as_deref()
            != Some(binding.recipient_token_account.as_str())
    {
        return Err(invalid());
    }
    config::validate_payment_asset(
        &binding.network,
        &binding.token_mint,
        binding.decimals,
        binding.token_symbol.as_deref(),
    )
    .map_err(|_| invalid())?;
    let payment = verifier::verify_canonical_proof(
        &evidence.transaction,
        &verifier::CanonicalRequirement {
            recipient_token_account: binding.recipient_token_account.clone(),
            token_mint: binding.token_mint.clone(),
            amount_atomic: binding.amount_atomic,
            decimals: binding.decimals,
            memo: binding.memo.clone(),
        },
    )
    .map_err(|_| invalid())?;
    let bytes = BASE64
        .decode(&evidence.transaction)
        .map_err(|_| invalid())?;
    let parsed = transaction::parse(&bytes).map_err(|_| invalid())?;
    if payment.signature != evidence.signature
        || pubkey::encode(&parsed.recent_blockhash) != evidence.recent_blockhash
    {
        return Err(invalid());
    }
    let ledger: crate::models::LedgerEntry =
        super::settlement_storage::required(&db, crate::ids::MODEL_LEDGER, &evidence.signature)?
            .parse()?;
    let token = ledger.token_settlement.as_ref().ok_or_else(invalid)?;
    if ledger.status != "pending"
        || ledger.provider != "x402"
        || ledger.kind != "payment"
        || ledger.reference != evidence.signature
        || ledger.provider_ref.as_deref() != Some(evidence.signature.as_str())
        || ledger.payer_wallet.as_deref() != Some(payment.payer_wallet.as_str())
        || ledger.gross_cents != i64::try_from(snapshot.total_cents).map_err(|_| invalid())?
        || ledger.currency != snapshot.currency
        || token.amount_atomic != binding.amount_atomic
        || token.mint != binding.token_mint
        || token.decimals != binding.decimals
        || token.transaction_base64.as_deref() != Some(evidence.transaction.as_str())
        || token.network.as_deref() != Some(evidence.network.as_str())
        || token.recent_blockhash.as_deref() != Some(evidence.recent_blockhash.as_str())
    {
        return Err(invalid());
    }
    Ok(())
}

fn verify_cluster<S: HostSeams>(seams: &S, rpc_url: &str, network: &str) -> AppResult<()> {
    crate::x402::rpc::verify_cluster(seams, rpc_url, network).map_err(|error| {
        AppError::new(503, "x402_unavailable", "Solana RPC network mismatch")
            .with_internal(error.message)
    })
}
