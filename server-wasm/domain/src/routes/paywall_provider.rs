//! Stripe PaymentIntent response classification and monotonic claim completion.

use crate::error::{AppError, AppResult};
use crate::models::LedgerEntry;
use crate::stripe::api;
use crate::time;

pub(super) struct IntentFailure {
    pub(super) definitive: bool,
    pub(super) error: AppError,
}

pub(super) fn parse_intent(raw: &str) -> Result<api::PaymentIntent, IntentFailure> {
    let (status, body) = api::unwrap_fetch(raw).map_err(|message| IntentFailure {
        definitive: false,
        error: AppError::new(502, "provider_unavailable", "Stripe response was malformed")
            .with_internal(message),
    })?;
    api::parse_payment_intent(status, &body).map_err(|failure| {
        let definitive = failure.is_definitive();
        let error = if definitive {
            AppError::new(402, "payment_error", "Stripe rejected the payment request")
                .with_internal(failure.message())
        } else {
            AppError::new(
                502,
                "provider_unavailable",
                "Stripe response was indeterminate",
            )
            .with_internal(failure.message())
        };
        IntentFailure { definitive, error }
    })
}

pub(super) fn completed_entry(
    mut entry: LedgerEntry,
    intent: &api::PaymentIntent,
    now: i64,
) -> AppResult<LedgerEntry> {
    if entry
        .provider_ref
        .as_deref()
        .is_some_and(|reference| reference != intent.id)
    {
        return Err(AppError::conflict("checkout provider identity changed"));
    }
    entry.provider_ref = Some(intent.id.clone());
    match entry.status.as_str() {
        "initiating" | "pending" => {
            // The webhook atomically records settlement and its fulfillment effects.
            // Pre-marking success here would suppress those effects on delivery.
            entry.status = "pending".to_string();
            entry.processed_at = time::iso8601(now);
        }
        "succeeded" | "failed" | "refunded" => {}
        _ => return Err(AppError::conflict("checkout payment state is invalid")),
    }
    Ok(entry)
}

pub(super) fn validate_claimed_entry(
    entry: &LedgerEntry,
    reference: &str,
    amount_cents: i64,
    currency: &str,
) -> AppResult<()> {
    if entry.reference != reference
        || entry.kind != "payment"
        || entry.provider != "stripe"
        || entry.gross_cents != amount_cents
        || entry.currency != currency
    {
        return Err(AppError::conflict(
            "checkout claim facts do not match the request",
        ));
    }
    Ok(())
}

pub(super) fn initiating_entry(
    reference: &str,
    amount_cents: i64,
    currency: &str,
    profile_id: Option<&str>,
    route_path: Option<&str>,
    product_id: Option<&str>,
    now: i64,
) -> LedgerEntry {
    LedgerEntry {
        reference: reference.to_string(),
        kind: "payment".into(),
        status: "initiating".into(),
        gross_cents: amount_cents,
        refund_cents: 0,
        currency: currency.to_string(),
        customer_profile_id: profile_id.map(str::to_string),
        route_path: route_path.map(str::to_string),
        product_id: product_id.map(str::to_string),
        product_ids: product_id.map(str::to_string).into_iter().collect(),
        provider: "stripe".into(),
        provider_ref: None,
        payer_wallet: None,
        created_at: time::iso8601(now),
        processed_at: time::iso8601(now),
        token_settlement: None,
    }
}
