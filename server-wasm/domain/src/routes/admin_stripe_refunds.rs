use serde_json::json;

use crate::ctx::RequestContext;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedBatchOutcome;
use crate::ids;
use crate::models::LedgerEntry;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::routes::refunds::store;
use crate::seams::HostSeams;
use crate::stripe::api;
use crate::time;

use super::super::support::path_id;
use super::effects;
#[path = "admin_stripe_refund_claim.rs"]
mod claim;

pub(super) use claim::progress;

pub(super) fn process<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    ctx.require_admin_write()?;
    let payment_ref = path_id(&req.path, "/admin/stripe/refunds/", Some("/process"))?;
    let db = Db::new(seams, ids::DB_ACCESS);
    let payment = store::read::<_, LedgerEntry>(&db, &payment_ref)?
        .ok_or_else(|| AppError::not_found("unknown payment"))?;
    validate_payment(&payment.value)?;
    if payment.value.reference != payment_ref {
        return Err(AppError::conflict("stored payment reference mismatch"));
    }
    if fully_refunded(&payment.value) {
        ensure_completed_effect(seams, &db, &payment_ref, &payment.value)?;
        return Ok(RouteResponse::ok(&json!({
            "id": payment_ref, "processed": true, "status": "refunded"
        })));
    }
    let secret = stripe_secret(seams)?;
    let now = seams.now_unix_secs();
    let replay_payment = payment.value.clone();
    let mut active = match claim::acquire(&db, &payment_ref, ctx.require_site_id()?, payment, now)?
    {
        claim::Acquire::Completed(completed) => {
            // A refund can subsequently fail. Never claim the full-refund intent
            // remains satisfied after an authoritative reversal.
            if replay_payment.refund_cents < replay_payment.gross_cents {
                return Err(AppError::conflict(
                    "completed Stripe refund was reversed; reconcile the provider refund",
                ));
            }
            ensure_claim_effect(seams, &db, &payment_ref, &replay_payment, &completed)?;
            return Ok(completed_response(&completed));
        }
        claim::Acquire::Active(active) => active,
    };
    let refund = match call_stripe(
        seams,
        &secret,
        &payment_ref,
        &active.payment.value,
        &active.claim,
        now,
    ) {
        Ok(refund) => refund,
        Err(error) => {
            claim::release(&db, &mut active, now)?;
            return Err(error);
        }
    };
    if refund.status != "succeeded" {
        // Retain the provider identity before releasing the lease. A pending
        // refund is subsequently read by ID, never submitted as a new refund.
        active.claim.refund_id = Some(refund.id.clone());
        active.claim.amount = Some(refund.amount);
        active.claim.currency = Some(refund.currency.clone());
        claim::release(&db, &mut active, now)?;
        return Ok(RouteResponse::ok(
            &json!({"id":payment_ref,"processed":false,"status":refund.status,"refundId":refund.id,"amount":refund.amount}),
        ));
    }
    complete(&db, &payment_ref, &mut active, &refund, now)?;
    Ok(refund_response(&payment_ref, &refund))
}

fn ensure_completed_effect<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    payment_ref: &str,
    payment: &LedgerEntry,
) -> AppResult<()> {
    let Some(stored) = store::read::<_, claim::StripeClaim>(db, &claim::claim_key(payment_ref))?
    else {
        return Ok(());
    };
    if stored.value.status == "completed" {
        ensure_claim_effect(seams, db, payment_ref, payment, &stored.value)?;
    }
    Ok(())
}

fn ensure_claim_effect<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    payment_ref: &str,
    payment: &LedgerEntry,
    claim: &claim::StripeClaim,
) -> AppResult<()> {
    if claim.webhook_settled {
        return Ok(());
    }
    let refund_id = claim
        .refund_id
        .as_deref()
        .ok_or_else(|| AppError::internal("completed Stripe refund is missing its refund id"))?;
    let amount = claim
        .amount
        .ok_or_else(|| AppError::internal("completed Stripe refund is missing its amount"))?;
    if amount != claim::requested_amount(claim, payment)?
        || !claim
            .currency
            .as_deref()
            .is_some_and(|currency| currency.eq_ignore_ascii_case(&payment.currency))
    {
        return Err(AppError::conflict(
            "completed Stripe refund does not match the payment",
        ));
    }
    let occurred_at = time::parse_iso(&claim.updated_at)
        .ok_or_else(|| AppError::internal("completed Stripe refund has an invalid updatedAt"))?;
    crate::durable_effects::ensure(
        db,
        "admin-stripe-refund",
        refund_id,
        effects::actions(
            "stripe",
            payment_ref,
            refund_id,
            payment,
            amount,
            occurred_at,
        ),
        occurred_at,
    )?;
    crate::durable_effects::dispatch_best_effort(seams, "admin-stripe-refund", refund_id);
    Ok(())
}
fn complete<S: HostSeams>(
    db: &Db<'_, S>,
    payment_ref: &str,
    active: &mut claim::ActiveClaim,
    refund: &api::StripeRefund,
    now: i64,
) -> AppResult<bool> {
    let expected_payment = active.payment.value.clone();
    for _ in 0..2 {
        let refund_ref = refund.id.clone();
        let mut payment = active.payment.value.clone();
        payment.refund_cents = payment
            .refund_cents
            .checked_add(refund.amount)
            .ok_or_else(|| AppError::conflict("Stripe refund total overflowed"))?;
        if payment.refund_cents >= payment.gross_cents {
            payment.status = "refunded".to_string();
        }
        let mut refund_row =
            serde_json::to_value(effects::stripe_row(&payment, &refund_ref, refund, now))
                .map_err(|_| AppError::internal("cannot encode Stripe refund"))?;
        refund_row["originalReference"] = json!(payment_ref);
        refund_row["paymentIntentId"] = json!(refund.payment_intent);
        if let Some(existing) = crate::routes::stripe_refund_identity::read(
            db,
            &refund.id,
            payment_ref,
            refund.payment_intent.as_deref().unwrap_or(""),
            refund.amount,
            &refund.currency,
        )? {
            if existing.payload["status"] != "succeeded"
                || active.payment.value.refund_cents < refund.amount
            {
                return Err(AppError::conflict(
                    "Stripe refund webhook has not settled; retry reconciliation",
                ));
            }
            mark_completed(&mut active.claim, refund, now);
            active.claim.webhook_settled = true;
            let key = claim::claim_key(payment_ref);
            let version = existing
                .version
                .ok_or_else(|| AppError::internal("refund version missing"))?;
            let outcome = db.guarded_batch(
                &[
                    store::version_condition(&key, &active.version),
                    store::version_condition(payment_ref, &active.payment.version),
                    store::version_condition(&existing.entry_key, &version),
                ],
                &[store::write(&key, &active.claim)?],
            )?;
            if matches!(outcome, GuardedBatchOutcome::Applied { .. }) {
                return Ok(false);
            }
            return Err(AppError::conflict(
                "Stripe refund changed concurrently; retry reconciliation",
            ));
        }
        if payment.refund_cents > payment.gross_cents {
            return Err(AppError::conflict(
                "Stripe refund total exceeds payment; reconcile provider refunds",
            ));
        }
        let actions = effects::actions(
            "stripe",
            payment_ref,
            &refund.id,
            &payment,
            refund.amount,
            now,
        );
        let effect = crate::durable_effects::plan("admin-stripe-refund", &refund.id, actions, now)?
            .ok_or_else(|| AppError::internal("Stripe refund effect plan is empty"))?;
        let effect_id = effect.effect_id.clone();
        mark_completed(&mut active.claim, refund, now);
        let key = claim::claim_key(payment_ref);
        let outcome = db.guarded_batch(
            &[
                store::version_condition(&key, &active.version),
                store::version_condition(payment_ref, &active.payment.version),
                store::absent_condition(&refund_ref),
                effect.condition,
            ],
            &[
                store::write(&key, &active.claim)?,
                store::write(payment_ref, &payment)?,
                store::write(&refund_ref, &refund_row)?,
                effect.op,
            ],
        )?;
        if matches!(outcome, GuardedBatchOutcome::Applied { .. }) {
            active.payment.value = payment;
            crate::durable_effects::dispatch_effect_best_effort(db.host(), &effect_id);
            return Ok(true);
        }
        let current_claim = store::read::<_, claim::StripeClaim>(db, &key)?
            .ok_or_else(|| AppError::conflict("Stripe refund claim disappeared"))?;
        if current_claim.value.status == "completed"
            && current_claim.value.refund_id.as_deref() == Some(&refund.id)
        {
            return Ok(false);
        }
        active.version = current_claim.version;
        active.payment = store::read::<_, LedgerEntry>(db, payment_ref)?
            .ok_or_else(|| AppError::conflict("Stripe payment disappeared"))?;
        validate_same_payment(&active.payment.value, &expected_payment, refund)?;
    }
    Err(AppError::conflict(
        "Stripe refund state changed after provider success; retry to converge",
    ))
}

fn call_stripe<S: HostSeams>(
    seams: &S,
    secret: &str,
    _payment_ref: &str,
    payment: &LedgerEntry,
    claim: &claim::StripeClaim,
    now: i64,
) -> AppResult<api::StripeRefund> {
    let provider_ref = payment
        .provider_ref
        .as_deref()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::unprocessable("payment has no PaymentIntent reference"))?;
    let payment_intent = payment_intent_for_reference(
        seams,
        secret,
        provider_ref,
        payment.gross_cents,
        &payment.currency,
    )?;
    let requested_amount = claim::requested_amount(claim, payment)?;
    if let Some(id) = claim.refund_id.as_deref() {
        if !valid_provider_id(id, "re_") {
            return Err(AppError::conflict("invalid stored refund reference"));
        }
        return fetch_refund(
            seams,
            &api::stripe_get(secret, &format!("/v1/refunds/{id}")),
            payment,
            &payment_intent,
            Some(id),
            requested_amount,
        );
    }
    if !claim::provider_retry_safe(claim, now)? {
        return recover_refund(
            seams,
            secret,
            payment,
            &payment_intent,
            &claim.fingerprint,
            requested_amount,
        );
    }
    let fetch = api::build_refund_fetch(
        secret,
        &payment_intent,
        Some(requested_amount),
        None,
        &format!("refund:{}", claim.fingerprint),
        &claim.fingerprint,
    );
    fetch_refund(
        seams,
        &fetch,
        payment,
        &payment_intent,
        None,
        requested_amount,
    )
}

fn fetch_refund<S: HostSeams>(
    seams: &S,
    fetch: &serde_json::Value,
    payment: &LedgerEntry,
    payment_intent: &str,
    refund_id: Option<&str>,
    requested_amount: i64,
) -> AppResult<api::StripeRefund> {
    let (status, body) =
        api::unwrap_fetch(&seams.http_fetch(&fetch.to_string())?).map_err(|error| {
            AppError::new(502, "provider_unavailable", "could not reach Stripe")
                .with_internal(error)
        })?;
    let refund = api::parse_refund(status, &body).map_err(|error| {
        AppError::new(502, "provider_unavailable", "Stripe rejected the refund")
            .with_internal(error)
    })?;
    validate_provider_refund(
        &refund,
        payment,
        payment_intent,
        refund_id,
        requested_amount,
    )?;
    Ok(refund)
}

fn recover_refund<S: HostSeams>(
    seams: &S,
    secret: &str,
    payment: &LedgerEntry,
    payment_intent: &str,
    operation_ref: &str,
    requested_amount: i64,
) -> AppResult<api::StripeRefund> {
    let mut cursor: Option<String> = None;
    let mut found: Option<api::StripeRefund> = None;
    for _ in 0..100 {
        let mut path = format!("/v1/refunds?payment_intent={payment_intent}&limit=100");
        if let Some(cursor) = cursor.as_deref() {
            path.push_str("&starting_after=");
            path.push_str(cursor);
        }
        let fetch = api::stripe_get(secret, &path);
        let (status, body) =
            api::unwrap_fetch(&seams.http_fetch(&fetch.to_string())?).map_err(|error| {
                AppError::new(
                    502,
                    "provider_unavailable",
                    "could not reconcile Stripe refund",
                )
                .with_internal(error)
            })?;
        let page: serde_json::Value = serde_json::from_str(&body).map_err(|error| {
            AppError::new(
                502,
                "provider_unavailable",
                "Stripe returned an invalid refund list",
            )
            .with_internal(error.to_string())
        })?;
        let rows = page
            .get("data")
            .and_then(serde_json::Value::as_array)
            .filter(|_| {
                (200..300).contains(&status)
                    && page.get("object").and_then(serde_json::Value::as_str) == Some("list")
            })
            .ok_or_else(|| {
                AppError::new(
                    502,
                    "provider_unavailable",
                    "Stripe returned an invalid refund list",
                )
            })?;
        for row in rows {
            let parsed = api::parse_refund(200, &row.to_string()).map_err(|error| {
                AppError::new(
                    502,
                    "provider_unavailable",
                    "Stripe returned an invalid refund",
                )
                .with_internal(error)
            })?;
            if parsed.operation_ref.as_deref() == Some(operation_ref) {
                validate_provider_refund(&parsed, payment, payment_intent, None, requested_amount)?;
                if found.is_some() {
                    return Err(AppError::conflict(
                        "multiple Stripe refunds match this operation",
                    ));
                }
                found = Some(parsed);
            }
        }
        if page.get("has_more").and_then(serde_json::Value::as_bool) != Some(true) {
            return found.ok_or_else(|| {
                AppError::conflict(
                    "Stripe refund outcome is unknown; no durable provider proof was found",
                )
            });
        }
        cursor = rows
            .last()
            .and_then(|row| row.get("id"))
            .and_then(serde_json::Value::as_str)
            .filter(|id| valid_provider_id(id, "re_"))
            .map(str::to_string);
        if cursor.is_none() {
            return Err(AppError::new(
                502,
                "provider_unavailable",
                "Stripe refund pagination is invalid",
            ));
        }
    }
    Err(AppError::new(
        502,
        "provider_unavailable",
        "Stripe refund reconciliation exceeded its bounded scan",
    ))
}

fn validate_provider_refund(
    refund: &api::StripeRefund,
    payment: &LedgerEntry,
    payment_intent: &str,
    refund_id: Option<&str>,
    requested_amount: i64,
) -> AppResult<()> {
    if !valid_provider_id(&refund.id, "re_")
        || refund.amount != requested_amount
        || !refund.currency.eq_ignore_ascii_case(&payment.currency)
        || refund.payment_intent.as_deref() != Some(payment_intent)
        || refund_id.is_some_and(|id| id != refund.id)
    {
        return Err(AppError::conflict(
            "Stripe refund does not match the payment",
        ));
    }
    Ok(())
}

fn valid_provider_id(value: &str, prefix: &str) -> bool {
    value.starts_with(prefix)
        && value.len() <= 255
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_')
}

fn payment_intent_for_reference<S: HostSeams>(
    seams: &S,
    secret: &str,
    reference: &str,
    expected_amount: i64,
    expected_currency: &str,
) -> AppResult<String> {
    if valid_provider_id(reference, "pi_") {
        return Ok(reference.to_string());
    }
    let fetch = crate::stripe::checkout_provider::build_retrieve(secret, reference)
        .map_err(|_| AppError::unprocessable("payment has no valid Stripe reference"))?;
    let (status, body) =
        api::unwrap_fetch(&seams.http_fetch(&fetch.to_string())?).map_err(|_| {
            AppError::new(
                502,
                "provider_unavailable",
                "could not resolve paid checkout",
            )
        })?;
    let value: serde_json::Value = serde_json::from_str(&body)
        .map_err(|_| AppError::new(502, "provider_unavailable", "invalid checkout response"))?;
    let intent = value["payment_intent"]
        .as_str()
        .or_else(|| value["payment_intent"]["id"].as_str());
    if !(200..300).contains(&status)
        || value["id"] != reference
        || value["mode"] != "payment"
        || value["payment_status"] != "paid"
        || value["amount_total"].as_i64() != Some(expected_amount)
        || !value["currency"]
            .as_str()
            .is_some_and(|currency| currency.eq_ignore_ascii_case(expected_currency))
    {
        return Err(AppError::conflict(
            "checkout is not the paid payment being refunded",
        ));
    }
    intent
        .filter(|id| valid_provider_id(id, "pi_"))
        .map(str::to_string)
        .ok_or_else(|| AppError::conflict("paid checkout has no valid PaymentIntent"))
}

fn validate_payment(payment: &LedgerEntry) -> AppResult<()> {
    if payment.kind != "payment" || payment.provider != "stripe" {
        return Err(AppError::unprocessable("not a refundable Stripe payment"));
    }
    if !matches!(payment.status.as_str(), "succeeded" | "paid" | "refunded") {
        return Err(AppError::conflict(
            "payment must be settled before it can be refunded",
        ));
    }
    if payment.gross_cents <= 0
        || payment.refund_cents < 0
        || payment.refund_cents > payment.gross_cents
    {
        return Err(AppError::unprocessable("payment amount is not refundable"));
    }
    Ok(())
}

fn validate_same_payment(
    payment: &LedgerEntry,
    expected: &LedgerEntry,
    refund: &api::StripeRefund,
) -> AppResult<()> {
    validate_payment(payment)?;
    if payment.reference != expected.reference
        || payment.provider_ref != expected.provider_ref
        || payment.customer_profile_id != expected.customer_profile_id
        || payment.gross_cents != expected.gross_cents
        || !payment.currency.eq_ignore_ascii_case(&refund.currency)
    {
        return Err(AppError::conflict(
            "Stripe payment changed after provider refund",
        ));
    }
    Ok(())
}

fn fully_refunded(payment: &LedgerEntry) -> bool {
    payment.gross_cents > 0 && payment.refund_cents >= payment.gross_cents
}

fn stripe_secret<S: HostSeams>(seams: &S) -> AppResult<String> {
    seams
        .secret_get(ids::SECRET_STRIPE_KEY)?
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::new(503, "unavailable", "Stripe is not configured"))
}

fn mark_completed(claim: &mut claim::StripeClaim, refund: &api::StripeRefund, now: i64) {
    claim.status = "completed".to_string();
    claim.lease_owner = None;
    claim.lease_expires_at = None;
    claim.refund_id = Some(refund.id.clone());
    claim.amount = Some(refund.amount);
    claim.currency = Some(refund.currency.clone());
    claim.updated_at = time::iso8601(now);
}

fn refund_response(payment_ref: &str, refund: &api::StripeRefund) -> RouteResponse {
    RouteResponse::ok(&json!({
        "id": payment_ref, "processed": true, "status": refund.status,
        "refundId": refund.id, "amount": refund.amount,
    }))
}

fn completed_response(claim: &claim::StripeClaim) -> RouteResponse {
    RouteResponse::ok(&json!({
        "id": claim.payment_ref, "processed": true, "status": "succeeded",
        "refundId": claim.refund_id, "amount": claim.amount,
    }))
}

#[cfg(test)]
#[path = "admin_stripe_refunds_tests.rs"]
mod tests;
