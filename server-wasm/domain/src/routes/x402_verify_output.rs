use super::*;

pub(super) fn response_for_confirmation<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    ctx: &ConfirmationContext<'_>,
    confirmation: x402::rpc::Confirmation,
) -> AppResult<RouteResponse> {
    match confirmation {
        x402::rpc::Confirmation::Confirmed | x402::rpc::Confirmation::Finalized => {
            match x402::rpc::load_confirmed_transaction(
                seams,
                &ctx.resolved.resource.control.rpc_url,
                &ctx.verified.payment.signature,
                &ctx.verified.transaction,
            ) {
                Ok(x402::rpc::ConfirmedTransaction::Succeeded) => {
                    let _ = settle(
                        seams,
                        db,
                        ctx.prepared,
                        &ctx.resolved.resource,
                        &ctx.verified.payment,
                        ctx.payload,
                        ctx.now,
                    )?;
                    Ok(settlement(
                        true,
                        Some(&ctx.verified.payment.signature),
                        ctx.network,
                        "",
                    ))
                }
                Ok(x402::rpc::ConfirmedTransaction::Failed(_)) => {
                    crate::routes::x402_payment_store::transition(
                        db,
                        ctx.prepared,
                        "failed",
                        ctx.now,
                    )?;
                    Ok(settlement(
                        false,
                        None,
                        ctx.network,
                        "transaction failed on-chain",
                    ))
                }
                _ => Ok(settlement(
                    false,
                    None,
                    ctx.network,
                    AWAITING_CONFIRMATION_ERROR,
                )),
            }
        }
        x402::rpc::Confirmation::Failed(_) => match x402::rpc::load_confirmed_transaction(
            seams,
            &ctx.resolved.resource.control.rpc_url,
            &ctx.verified.payment.signature,
            &ctx.verified.transaction,
        ) {
            Ok(x402::rpc::ConfirmedTransaction::Failed(_)) => {
                crate::routes::x402_payment_store::transition(db, ctx.prepared, "failed", ctx.now)?;
                Ok(settlement(
                    false,
                    None,
                    ctx.network,
                    "transaction failed on-chain",
                ))
            }
            _ => Ok(settlement(
                false,
                None,
                ctx.network,
                AWAITING_CONFIRMATION_ERROR,
            )),
        },
        // Pending row is durable; retry/reconcile can finalize it later.
        _ => Ok(settlement(
            false,
            None,
            ctx.network,
            AWAITING_CONFIRMATION_ERROR,
        )),
    }
}

pub(super) fn ledger_entry(
    resolved: &ResourceRequirement,
    verified: &VerifiedTransaction,
    status: &str,
    profile_id: Option<String>,
    now: i64,
    network: &str,
) -> LedgerEntry {
    LedgerEntry {
        reference: verified.payment.signature.clone(),
        kind: "payment".to_string(),
        status: status.to_string(),
        gross_cents: resolved.price_cents,
        refund_cents: 0,
        currency: "USD".to_string(),
        customer_profile_id: profile_id,
        route_path: None,
        product_id: resolved.requirement.resource_id.clone(),
        product_ids: resolved
            .requirement
            .resource_id
            .clone()
            .into_iter()
            .collect(),
        provider: "x402".to_string(),
        provider_ref: Some(verified.payment.signature.clone()),
        payer_wallet: Some(verified.payment.payer_wallet.clone()),
        created_at: time::iso8601(now),
        processed_at: time::iso8601(now),
        // The on-chain ground truth, so a later refund pays back exactly this amount
        // of this mint regardless of any token reconfiguration.
        token_settlement: Some(crate::models::TokenSettlement {
            amount_atomic: verified.payment.amount_atomic,
            mint: verified.payment.mint.clone(),
            decimals: resolved.requirement.decimals,
            transaction_base64: Some(verified.transaction.clone()),
            recent_blockhash: Some(verified.recent_blockhash.clone()),
            network: Some(network.to_string()),
        }),
    }
}

/// Record an exactly verified, confirmed x402 payment and fire settlement effects.
pub(super) fn settle<S: HostSeams>(
    _seams: &S,
    db: &Db<'_, S>,
    prepared: &crate::routes::x402_payment_store::Prepared,
    resolved: &ResourceRequirement,
    verified: &x402::verifier::VerifiedPayment,
    payload: &XPaymentPayload,
    now: i64,
) -> AppResult<bool> {
    // X-PAYMENT metadata is supplied by the public caller and is not bound to the
    // signed Solana transaction. Keep x402 ledger and entitlement attribution
    // wallet-first so a replayed valid proof cannot grant access to an arbitrary
    // user id named in unsigned metadata.
    let profile_id: Option<String> = None;
    let actions = crate::routes::x402_payment_store::settlement_actions(
        &verified.signature,
        resolved.price_cents,
        "USD",
        profile_id.as_deref(),
        resolved.requirement.resource_id.as_deref(),
        &x402_crm_object(payload, resolved.requirement.resource_id.as_deref()),
        now,
    );
    crate::routes::x402_payment_store::transition_with_effects(
        db,
        prepared,
        "succeeded",
        now,
        actions,
    )
}

/// Build the CRM purchase object from the buyer's X-PAYMENT metadata (which carries any
/// deterministic identity the client included), tagged with the purchased product.
pub(super) fn x402_crm_object(payload: &XPaymentPayload, resource_id: Option<&str>) -> Value {
    let mut metadata = payload.metadata.as_object().cloned().unwrap_or_default();
    if let Some(rid) = resource_id {
        metadata
            .entry("productId".to_string())
            .or_insert_with(|| Value::String(rid.to_string()));
    }
    json!({ "metadata": Value::Object(metadata) })
}

/// Build the verify response: the `{success, txHash, signature, networkId, error}`
/// body plus the base64 `X-PAYMENT-RESPONSE` settlement header the client reads.
///
/// Status is **200 on success, 402 on failure** — the client gates on
/// `response.ok`, so a failed verification MUST be non-2xx or the client would
/// unlock the resource for a rejected payment. `signature` mirrors `txHash`
/// because the client reads `body.signature` as the transaction id.
pub(super) fn settlement(
    success: bool,
    signature: Option<&str>,
    network: &str,
    error: &str,
) -> RouteResponse {
    let body = json!({
        "success": success,
        "txHash": signature,
        "signature": signature,
        "networkId": network,
        "error": if error.is_empty() { Value::Null } else { Value::String(error.to_string()) },
    });
    let encoded = BASE64.encode(body.to_string());
    let status = if success { 200 } else { 402 };
    RouteResponse::json(status, &body).with_header(X_PAYMENT_RESPONSE_HEADER, encoded)
}
