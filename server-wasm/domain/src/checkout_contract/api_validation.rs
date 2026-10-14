use std::collections::BTreeSet;

use hmac::{Hmac, Mac};
use serde::de::DeserializeOwned;
use sha2::Sha256;

use super::api_input;
use super::api_request::{FulfillmentIntent, RailProof};
use super::{
    CanonicalCheckoutRequest, CanonicalQuoteRequest, CustomerContext, CustomerContextHashes,
    PaymentMethod, QuoteSource,
};
use crate::error::{AppError, AppResult};

pub(super) const MAX_BODY_BYTES: usize = 16 * 1024;

pub(super) fn parse_quote(header: &str, body: &str) -> AppResult<CanonicalQuoteRequest> {
    let mut request: CanonicalQuoteRequest = parse(body)?;
    validate_common(
        request.schema_version,
        header,
        &request.idempotency_key,
        &request.attempt_id,
    )?;
    client_material_sha256(&request.client_material_sha256)?;
    match &request.source {
        QuoteSource::Items { items } => api_input::items(items)?,
        QuoteSource::VersionedCart {
            lane,
            generation,
            version,
        } => api_input::cart_source(lane, generation, *version)?,
    }
    request.promotion_code =
        crate::routes::coupons::requested_code(&[request.promotion_code.as_deref()])?;
    context(&request.customer_context)?;
    if request.tip.as_ref().is_some_and(|tip| match tip {
        super::api_request::TipIntent::Fixed { amount_cents } => *amount_cents > 1_000_000,
        super::api_request::TipIntent::Percentage { basis_points } => *basis_points > 10_000,
    }) {
        return Err(invalid("tip exceeds the supported range"));
    }
    methods(&request.requested_payment_methods)?;
    Ok(request)
}

pub(super) fn parse_checkout(header: &str, body: &str) -> AppResult<CanonicalCheckoutRequest> {
    let request: CanonicalCheckoutRequest = parse(body)?;
    validate_common(
        request.schema_version,
        header,
        &request.idempotency_key,
        &request.attempt_id,
    )?;
    client_material_sha256(&request.client_material_sha256)?;
    operation_id(&request.quote_operation_id)?;
    context(&request.customer_context)?;
    match (&request.payment_method, &request.rail_proof) {
        (PaymentMethod::Stripe, None | Some(RailProof::Stripe {}))
        | (PaymentMethod::Credits, None | Some(RailProof::Credits {}))
        | (PaymentMethod::X402, Some(RailProof::X402 { .. })) => {}
        _ => return Err(invalid("railProof does not match paymentMethod")),
    }
    Ok(request)
}

pub(super) fn parse<T: DeserializeOwned>(body: &str) -> AppResult<T> {
    if body.len() > MAX_BODY_BYTES {
        return Err(AppError::new(
            413,
            "payload_too_large",
            "checkout request body exceeds 16 KiB",
        ));
    }
    serde_json::from_str(body).map_err(|error| {
        AppError::bad_request("checkout request body is invalid").with_internal(error.to_string())
    })
}

pub(super) fn context_hashes<S: crate::seams::HostSeams>(
    seams: &S,
    provider_scope: &str,
    value: &CustomerContext,
) -> AppResult<CustomerContextHashes> {
    let key = seams
        .secret_get(crate::ids::SECRET_CHECKOUT_CONTEXT_MAC)?
        .filter(|value| value.len() >= 32)
        .ok_or_else(|| {
            AppError::new(
                503,
                "checkout_privacy_key_unavailable",
                "checkout privacy key is unavailable",
            )
        })?;
    Ok(CustomerContextHashes {
        fulfillment_sha256: mac(&key, provider_scope, "fulfillment", &value.fulfillment)?,
        contact_sha256: mac(&key, provider_scope, "contact", &value.contact)?,
        return_urls_sha256: mac(&key, provider_scope, "return-urls", &value.return_urls)?,
    })
}

pub(super) fn operation_id(value: &str) -> AppResult<()> {
    let digest = value.strip_prefix("payop_").unwrap_or("");
    if digest.len() == 64
        && digest
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    {
        Ok(())
    } else {
        Err(AppError::bad_request("operationId is invalid"))
    }
}

fn client_material_sha256(value: &str) -> AppResult<()> {
    if value.len() == 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    {
        Ok(())
    } else {
        Err(invalid(
            "clientMaterialSha256 must be 64 lowercase hex characters",
        ))
    }
}

fn validate_common(schema: u8, header: &str, body: &str, attempt: &str) -> AppResult<()> {
    if schema != 1 {
        return Err(AppError::bad_request("unsupported schemaVersion"));
    }
    super::ExternalIdempotencyKey::parse_exact(header)?;
    super::ExternalIdempotencyKey::parse_exact(body)?;
    if header.as_bytes() != body.as_bytes() {
        return Err(AppError::bad_request(
            "Idempotency-Key header must exactly equal body idempotencyKey",
        ));
    }
    super::CheckoutAttemptId::parse_exact(attempt)?;
    Ok(())
}

fn context(value: &CustomerContext) -> AppResult<()> {
    if let Some(contact) = &value.contact {
        api_input::optional(&contact.email, 254, "contact email")?;
        api_input::optional(&contact.phone, 64, "contact phone")?;
        api_input::optional(&contact.display_name, 200, "contact displayName")?;
        if contact
            .email
            .as_deref()
            .is_some_and(|email| !crate::routes::stripe_session::is_plausible_email(email))
        {
            return Err(invalid("contact email is invalid"));
        }
    }
    api_input::return_url(&value.return_urls.success)?;
    api_input::return_url(&value.return_urls.cancel)?;
    if let FulfillmentIntent::Shipping { address, shipping } = &value.fulfillment {
        api_input::shipping(address, shipping)?;
    }
    Ok(())
}

fn methods(values: &[PaymentMethod]) -> AppResult<()> {
    if values.is_empty() || values.len() > 3 {
        return Err(invalid("requestedPaymentMethods requires 1 to 3 methods"));
    }
    let unique = values
        .iter()
        .map(|value| *value as u8)
        .collect::<BTreeSet<_>>();
    if unique.len() != values.len() {
        return Err(invalid("requestedPaymentMethods contains duplicates"));
    }
    Ok(())
}

fn mac<T: serde::Serialize>(
    key: &str,
    provider_scope: &str,
    domain: &str,
    value: &T,
) -> AppResult<String> {
    let encoded = serde_json::to_vec(value).map_err(|error| {
        AppError::internal("cannot hash checkout customer context").with_internal(error.to_string())
    })?;
    let mut mac = Hmac::<Sha256>::new_from_slice(key.as_bytes())
        .map_err(|_| AppError::internal("cannot initialize checkout context MAC"))?;
    mac.update(b"cedros-pay-checkout-context-mac-v1\0");
    mac.update((provider_scope.len() as u64).to_be_bytes().as_slice());
    mac.update(provider_scope.as_bytes());
    mac.update((domain.len() as u64).to_be_bytes().as_slice());
    mac.update(domain.as_bytes());
    mac.update(&encoded);
    Ok(hex::encode(mac.finalize().into_bytes()))
}

fn invalid(message: impl Into<String>) -> AppError {
    AppError::unprocessable(message)
}
