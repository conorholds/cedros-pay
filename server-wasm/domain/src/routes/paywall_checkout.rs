//! Durable PaymentIntent claim, provider call, and guarded completion.

use serde_json::json;

use super::provider;
use super::request::CheckoutPlan;
use crate::db::{BatchOp, Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedBatchOutcome;
use crate::ids;
use crate::models::LedgerEntry;
use crate::reqresp::RouteResponse;
use crate::seams::HostSeams;
use crate::stripe::api::{self, PaymentIntent, PaymentIntentRequest};

pub(super) fn execute<S: HostSeams>(seams: &S, plan: CheckoutPlan) -> AppResult<RouteResponse> {
    let db = Db::new(seams, ids::DB_ACCESS);
    let claim_row = claim(&db, &plan)?;
    let claimed_entry: LedgerEntry = claim_row.parse()?;
    provider::validate_claimed_entry(
        &claimed_entry,
        &plan.reference,
        plan.amount_cents,
        &plan.currency,
    )?;
    let intent = if let Some(provider_ref) = claimed_entry.provider_ref.as_deref() {
        retrieve(seams, &plan, provider_ref)?
    } else if retry_safe(&claimed_entry, plan.now)? {
        create(seams, &db, &claim_row, &claimed_entry, &plan)?
    } else {
        recover(seams, &plan)?.ok_or_else(|| {
            AppError::conflict(
                "Stripe payment outcome is unknown; reconcile the provider operation before retrying",
            )
        })?
    };
    validate_intent(&intent, &plan, false)?;
    persist(&db, &plan, &claim_row, claimed_entry, &intent)?;
    Ok(response(&plan.reference, &intent))
}

fn create<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    claim_row: &EntryRecord,
    claimed_entry: &LedgerEntry,
    plan: &CheckoutPlan,
) -> AppResult<PaymentIntent> {
    let fetch = api::build_payment_intent_fetch(
        &plan.secret_key,
        &PaymentIntentRequest {
            amount_cents: plan.amount_cents,
            currency: plan.currency.clone(),
            idempotency_key: plan.idempotency_key.clone(),
            metadata: plan.metadata.clone(),
        },
    );
    let raw = seams.http_fetch(&fetch.to_string())?;
    match provider::parse_intent(&raw) {
        Ok(intent) => Ok(intent),
        Err(failure) => {
            if failure.definitive && claimed_entry.status == "initiating" {
                crate::routes::checkout_claim::release(
                    db,
                    claim_row,
                    &plan.reference,
                    &plan.fingerprint,
                )?;
            }
            Err(failure.error)
        }
    }
}

fn retrieve<S: HostSeams>(
    seams: &S,
    plan: &CheckoutPlan,
    provider_ref: &str,
) -> AppResult<PaymentIntent> {
    let fetch = api::build_retrieve_payment_intent_fetch(&plan.secret_key, provider_ref);
    let intent = parse_provider_intent(&seams.http_fetch(&fetch.to_string())?)?;
    if intent.id != provider_ref {
        return Err(AppError::conflict(
            "Stripe returned a different payment intent",
        ));
    }
    Ok(intent)
}

fn recover<S: HostSeams>(seams: &S, plan: &CheckoutPlan) -> AppResult<Option<PaymentIntent>> {
    let mut page = None;
    let mut found = None;
    for _ in 0..100 {
        let fetch = api::build_search_payment_intents_fetch(
            &plan.secret_key,
            &plan.fingerprint,
            page.as_deref(),
        );
        let raw = seams.http_fetch(&fetch.to_string())?;
        let (status, body) = api::unwrap_fetch(&raw).map_err(|message| {
            AppError::new(
                502,
                "provider_unavailable",
                "Stripe recovery response was malformed",
            )
            .with_internal(message)
        })?;
        if !(200..300).contains(&status) {
            return Err(AppError::new(
                502,
                "provider_unavailable",
                "Stripe payment recovery is unavailable",
            ));
        }
        let result: serde_json::Value = serde_json::from_str(&body).map_err(|error| {
            AppError::new(
                502,
                "provider_unavailable",
                "Stripe recovery response was malformed",
            )
            .with_internal(error.to_string())
        })?;
        let rows = result
            .get("data")
            .and_then(serde_json::Value::as_array)
            .ok_or_else(|| {
                AppError::new(
                    502,
                    "provider_unavailable",
                    "Stripe recovery response was malformed",
                )
            })?;
        for row in rows {
            let intent = api::parse_payment_intent(200, &row.to_string()).map_err(|failure| {
                AppError::new(
                    502,
                    "provider_unavailable",
                    "Stripe recovery returned an invalid payment",
                )
                .with_internal(failure.message())
            })?;
            validate_intent(&intent, plan, true)?;
            if found.replace(intent).is_some() {
                return Err(AppError::conflict(
                    "multiple Stripe payments match the durable operation",
                ));
            }
        }
        if result.get("has_more").and_then(serde_json::Value::as_bool) != Some(true) {
            return Ok(found);
        }
        let next = result
            .get("next_page")
            .and_then(serde_json::Value::as_str)
            .filter(|value| {
                !value.is_empty() && value.len() <= 1_024 && !value.chars().any(char::is_control)
            })
            .ok_or_else(|| {
                AppError::new(
                    502,
                    "provider_unavailable",
                    "Stripe recovery cursor was invalid",
                )
            })?;
        page = Some(next.to_string());
    }
    Err(AppError::new(
        502,
        "provider_unavailable",
        "Stripe payment recovery exceeded its page limit",
    ))
}

fn parse_provider_intent(raw: &str) -> AppResult<PaymentIntent> {
    provider::parse_intent(raw).map_err(|failure| failure.error)
}

fn retry_safe(entry: &LedgerEntry, now: i64) -> AppResult<bool> {
    let started = crate::time::parse_iso(&entry.created_at)
        .ok_or_else(|| AppError::internal("checkout claim has an invalid createdAt"))?;
    Ok(now >= started && now - started < crate::checkout_contract::PROVIDER_IDEMPOTENCY_SECONDS)
}

fn validate_intent(
    intent: &PaymentIntent,
    plan: &CheckoutPlan,
    require_operation: bool,
) -> AppResult<()> {
    let amount = intent.amount.ok_or_else(|| {
        AppError::new(
            502,
            "provider_unavailable",
            "Stripe payment response omitted its amount",
        )
    })?;
    let currency = intent.currency.as_deref().ok_or_else(|| {
        AppError::new(
            502,
            "provider_unavailable",
            "Stripe payment response omitted its currency",
        )
    })?;
    if amount != plan.amount_cents
        || !currency.eq_ignore_ascii_case(&plan.currency)
        || if require_operation {
            intent.operation_ref.as_deref() != Some(plan.fingerprint.as_str())
        } else {
            intent.operation_ref.as_deref().is_some()
                && intent.operation_ref.as_deref() != Some(plan.fingerprint.as_str())
        }
    {
        return Err(AppError::conflict(
            "Stripe payment does not match the durable operation",
        ));
    }
    Ok(())
}

fn claim<S: HostSeams>(db: &Db<'_, S>, plan: &CheckoutPlan) -> AppResult<EntryRecord> {
    let entry = provider::initiating_entry(
        &plan.reference,
        plan.amount_cents,
        &plan.currency,
        plan.profile_id.as_deref(),
        plan.route_path.as_deref(),
        plan.product_id.as_deref(),
        plan.now,
    );
    crate::routes::checkout_claim::claim_ledger(
        db,
        &plan.reference,
        crate::routes::checkout_claim::ledger_value(&entry, &plan.fingerprint)?,
        &plan.fingerprint,
    )
}

fn persist<S: HostSeams>(
    db: &Db<'_, S>,
    plan: &CheckoutPlan,
    claim: &EntryRecord,
    claimed: LedgerEntry,
    intent: &PaymentIntent,
) -> AppResult<()> {
    let entry = provider::completed_entry(claimed, intent, plan.now)?;
    let conditions = [crate::routes::checkout_claim::version_guard(
        claim,
        &plan.reference,
    )?];
    let ops = [BatchOp::Write {
        content_model_id: ids::MODEL_LEDGER,
        entry_key: plan.reference.clone(),
        data: crate::routes::checkout_claim::merge_ledger_value(
            &claim.payload,
            &entry,
            &plan.fingerprint,
        )?,
    }];
    if matches!(
        db.guarded_batch(&conditions, &ops)?,
        GuardedBatchOutcome::Applied { .. }
    ) {
        return Ok(());
    }
    let current = db
        .read_one(ids::MODEL_LEDGER, &plan.reference)?
        .ok_or_else(|| AppError::conflict("checkout changed concurrently; retry"))?;
    crate::routes::checkout_claim::validate(&current, &plan.fingerprint)?;
    let stored: LedgerEntry = current.parse()?;
    if stored.provider_ref.as_deref() != Some(intent.id.as_str()) {
        return Err(AppError::conflict(
            "checkout provider identity changed concurrently",
        ));
    }
    Ok(())
}

fn response(reference: &str, intent: &PaymentIntent) -> RouteResponse {
    RouteResponse::json(
        201,
        &json!({
            "reference": reference, "paymentIntentId": intent.id,
            "clientSecret": intent.client_secret, "status": intent.status,
        }),
    )
    .with_header("cache-control", "no-store")
}
