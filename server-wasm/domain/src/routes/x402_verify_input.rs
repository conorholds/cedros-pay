use super::*;

/// Decode the base64 `X-PAYMENT` header (the client uses standard base64; we also
/// accept unpadded) into the payment envelope.
pub(super) fn decode_x_payment(header: &str) -> Result<XPayment, String> {
    let trimmed = header.trim();
    let bytes = BASE64
        .decode(trimmed)
        .or_else(|_| BASE64_NO_PAD.decode(trimmed))
        .map_err(|_| "invalid X-PAYMENT encoding".to_string())?;
    let text = String::from_utf8(bytes).map_err(|_| "X-PAYMENT is not valid UTF-8".to_string())?;
    serde_json::from_str(&text).map_err(|_| "malformed X-PAYMENT payload".to_string())
}

/// Ask the host-managed operational wallet to co-sign gasless proofs. Pay never
/// loads or holds private wallet material. `None` leaves a buyer-funded proof
/// unchanged; `Err` fails closed when gasless was requested without a published
/// managed signer.
pub(super) fn maybe_co_sign<S: HostSeams>(
    seams: &S,
    transaction_b64: &str,
    resolved: &ResourceRequirement,
    exact_amount: bool,
) -> Result<Option<String>, &'static str> {
    if resolved.control.managed_signer.is_some() {
        return x402::managed::sign(
            seams,
            transaction_b64,
            &resolved.requirement,
            &resolved.control,
            exact_amount,
        )
        .map(Some);
    }
    if !x402::config::gasless_enabled(seams) {
        return Ok(None);
    }
    Err("managed x402 signer is unavailable")
}

pub(super) fn parse_verify_request(
    req: &RouteRequest,
    default_network: String,
) -> Result<ParsedVerifyRequest, RouteResponse> {
    let header = req
        .header("x-payment")
        .ok_or_else(|| settlement(false, None, &default_network, "missing X-PAYMENT header"))?;
    let payment = decode_x_payment(header)
        .map_err(|message| settlement(false, None, &default_network, &message))?;
    let network = payment.network.clone().unwrap_or(default_network);
    let transaction = payment
        .payload
        .transaction
        .as_deref()
        .map(str::trim)
        .filter(|t| !t.is_empty())
        .ok_or_else(|| settlement(false, None, &network, "missing transaction proof"))?
        .to_string();
    let resource = payment.payload.resource.trim().to_string();
    if resource.is_empty() {
        return Err(settlement(false, None, &network, "missing resource"));
    }
    Ok(ParsedVerifyRequest {
        network,
        transaction,
        resource,
        payment,
    })
}

pub(super) fn resolve_payment_requirement<S: HostSeams>(
    seams: &S,
    resource: &str,
    network: &str,
) -> Result<PaymentRequirement, RouteResponse> {
    // Cart settlement resolves a stored snapshot; single resources price live.
    let cart_id = resource.strip_prefix("cart:").map(str::to_string);
    let resource = match &cart_id {
        Some(id) => cart::cart_requirement_from_stored(seams, id, seams.now_unix_secs()),
        None => requirement_for_resource(seams, resource),
    }
    .map_err(|e| settlement(false, None, network, &e.message))?;
    if network != resource.control.network {
        return Err(settlement(
            false,
            None,
            network,
            "x402 network does not match the active Solana cluster",
        ));
    }
    Ok(PaymentRequirement { cart_id, resource })
}

pub(super) fn verify_transaction<S: HostSeams>(
    seams: &S,
    transaction: String,
    resolved: &ResourceRequirement,
    is_cart: bool,
    network: &str,
) -> Result<VerifiedTransaction, RouteResponse> {
    // Gasless: request signing only when the fee payer is the bound managed wallet.
    let transaction = match maybe_co_sign(seams, &transaction, resolved, is_cart) {
        Ok(Some(signed)) => signed,
        Ok(None) => transaction,
        Err(message) => return Err(settlement(false, None, network, message)),
    };
    let verified = x402::verifier::verify_proof(&transaction, &resolved.requirement)
        .map_err(|e| settlement(false, None, network, e.code()))?;
    if is_cart && verified.amount_atomic != resolved.requirement.min_amount_atomic {
        return Err(settlement(false, None, network, "amount_mismatch"));
    }
    let bytes = BASE64
        .decode(transaction.trim())
        .map_err(|_| settlement(false, None, network, "malformed_proof"))?;
    let parsed = x402::transaction::parse(&bytes)
        .map_err(|_| settlement(false, None, network, "malformed_proof"))?;
    Ok(VerifiedTransaction {
        transaction,
        recent_blockhash: x402::pubkey::encode(&parsed.recent_blockhash),
        payment: verified,
    })
}

pub(super) fn solana_rpc_url(
    resolved: &ResourceRequirement,
    network: &str,
) -> Result<String, RouteResponse> {
    if resolved.control.rpc_url.trim().is_empty() {
        Err(settlement(
            false,
            None,
            network,
            "Solana RPC endpoint is not configured",
        ))
    } else {
        Ok(resolved.control.rpc_url.clone())
    }
}
