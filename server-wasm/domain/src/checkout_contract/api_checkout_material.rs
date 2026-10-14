use std::collections::BTreeMap;

use sha2::{Digest, Sha256};

use crate::error::{AppError, AppResult};

use super::{CheckoutMaterial, PaymentMethod};

pub(super) fn build(
    request: &super::CanonicalCheckoutRequest,
    quote: &super::AuthoritativeQuoteSnapshot,
    rail_authority_fingerprint: &str,
) -> AppResult<CheckoutMaterial> {
    let mut metadata = BTreeMap::new();
    metadata.insert(
        "quote_operation_id".into(),
        request.quote_operation_id.clone(),
    );
    if let Some(super::api_request::RailProof::X402 { transaction }) = &request.rail_proof {
        let mut digest = Sha256::new();
        digest.update(b"cedros-pay-x402-proof\0");
        digest.update(transaction.as_bytes());
        metadata.insert("x402_proof_sha256".into(), hex::encode(digest.finalize()));
    }
    metadata.insert(
        "payment_method".into(),
        match request.payment_method {
            PaymentMethod::Stripe => "stripe",
            PaymentMethod::X402 => "x402",
            PaymentMethod::Credits => "credits",
        }
        .into(),
    );
    metadata.insert(
        "rail_authority_sha256".into(),
        rail_authority_fingerprint.into(),
    );
    let title = quote.lines.first().map_or("Checkout", |line| &line.title);
    Ok(CheckoutMaterial {
        client_material_sha256: request.client_material_sha256.clone(),
        amount_cents: i64::try_from(quote.total_cents)
            .map_err(|_| AppError::unprocessable("quote total exceeds provider range"))?,
        currency: quote.currency.clone(),
        product_name: title.chars().take(127).collect(),
        success_url: request.customer_context.return_urls.success.clone(),
        cancel_url: request.customer_context.return_urls.cancel.clone(),
        customer_email: request
            .customer_context
            .contact
            .as_ref()
            .and_then(|contact| contact.email.clone()),
        client_reference_id: Some(request.quote_operation_id.clone()),
        metadata,
    })
}
