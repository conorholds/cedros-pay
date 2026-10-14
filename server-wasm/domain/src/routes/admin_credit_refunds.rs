use serde_json::json;

use crate::ctx::RequestContext;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::models::LedgerEntry;
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::routes::credits::{apply_guarded_credit_move, CreditMove};
use crate::routes::refunds::store;
use crate::seams::HostSeams;
use crate::time;

use super::super::support::path_id;
use super::effects;

pub(super) fn process<S: HostSeams>(
    seams: &S,
    req: &RouteRequest,
    ctx: &RequestContext,
) -> AppResult<RouteResponse> {
    ctx.require_admin_write()?;
    let payment_ref = path_id(
        &req.path,
        "/admin/credits/refund-requests/",
        Some("/process"),
    )?;
    let db = Db::new(seams, ids::DB_ACCESS);
    let stored = store::read::<_, LedgerEntry>(&db, &payment_ref)?
        .ok_or_else(|| AppError::not_found("unknown payment"))?;
    validate(&stored.value)?;
    if stored.value.refund_cents >= stored.value.gross_cents || stored.value.status == "refunded" {
        return replay(seams, &payment_ref, &stored.value);
    }
    apply(seams, &payment_ref, stored)
}

fn replay<S: HostSeams>(
    seams: &S,
    payment_ref: &str,
    payment: &LedgerEntry,
) -> AppResult<RouteResponse> {
    let subject = payment
        .customer_profile_id
        .as_deref()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::unprocessable("payment has no credit subject"))?;
    let source_ref = format!("refund:{payment_ref}");
    let refund_ref = format!("credits-refund:{payment_ref}");
    let db = Db::new(seams, ids::DB_ACCESS);
    let refund: LedgerEntry = db
        .read_one(ids::MODEL_LEDGER, &refund_ref)?
        .ok_or_else(|| AppError::conflict("completed credit refund has no cashflow row"))?
        .parse()?;
    if refund.reference != refund_ref
        || refund.kind != "refund"
        || refund.status != "succeeded"
        || refund.provider != "credits"
        || refund.gross_cents != payment.gross_cents
        || !refund.currency.eq_ignore_ascii_case(&payment.currency)
        || refund.customer_profile_id != payment.customer_profile_id
    {
        return Err(AppError::conflict(
            "completed credit refund cashflow does not match payment",
        ));
    }
    let now = time::parse_iso(&refund.processed_at).ok_or_else(|| {
        AppError::conflict("completed credit refund has an invalid settlement time")
    })?;
    crate::durable_effects::ensure(
        &db,
        "admin-credit-refund",
        &source_ref,
        effects::actions(
            "credits",
            payment_ref,
            &refund_ref,
            payment,
            payment.gross_cents,
            now,
        ),
        now,
    )?;
    let outcome = apply_guarded_credit_move(
        seams,
        &CreditMove {
            subject_id: subject,
            amount_cents: payment.gross_cents,
            currency: Some(&payment.currency),
            kind: "grant",
            delta: payment.gross_cents,
            source_ref: &source_ref,
            reason: Some("refund"),
        },
        &[],
        &[],
    )?;
    crate::durable_effects::dispatch_best_effort(seams, "admin-credit-refund", &source_ref);
    Ok(success(payment_ref, outcome.balance_cents))
}

fn apply<S: HostSeams>(
    seams: &S,
    payment_ref: &str,
    mut stored: store::Versioned<LedgerEntry>,
) -> AppResult<RouteResponse> {
    let subject = stored
        .value
        .customer_profile_id
        .clone()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::unprocessable("payment has no credit subject"))?;
    let amount = stored.value.gross_cents;
    let now = seams.now_unix_secs();
    let refund_ref = format!("credits-refund:{payment_ref}");
    let refund_row = refund_row(&stored.value, &refund_ref, amount, now);
    stored.value.refund_cents = stored.value.refund_cents.max(amount);
    stored.value.status = "refunded".to_string();
    let mut conditions = vec![
        store::version_condition(payment_ref, &stored.version),
        store::absent_condition(&refund_ref),
    ];
    let mut ops = vec![
        store::write(&refund_ref, &refund_row)?,
        store::write(payment_ref, &stored.value)?,
    ];
    let source_ref = format!("refund:{payment_ref}");
    let (effect_conditions, effect_ops) =
        effect_extras(payment_ref, &stored.value, &source_ref, now)?;
    conditions.extend(effect_conditions);
    ops.extend(effect_ops);
    let outcome = apply_guarded_credit_move(
        seams,
        &CreditMove {
            subject_id: &subject,
            amount_cents: amount,
            currency: Some(&stored.value.currency),
            kind: "grant",
            delta: amount,
            source_ref: &source_ref,
            reason: Some("refund"),
        },
        &conditions,
        &ops,
    )?;
    crate::durable_effects::dispatch_best_effort(seams, "admin-credit-refund", &source_ref);
    Ok(success(payment_ref, outcome.balance_cents))
}

fn effect_extras(
    payment_ref: &str,
    payment: &LedgerEntry,
    source_ref: &str,
    now: i64,
) -> AppResult<(
    Vec<crate::guarded_batch::GuardedCondition>,
    Vec<crate::db::BatchOp>,
)> {
    let refund_ref = format!("credits-refund:{payment_ref}");
    let actions = effects::actions(
        "credits",
        payment_ref,
        &refund_ref,
        payment,
        payment.gross_cents,
        now,
    );
    let Some(effect) =
        crate::durable_effects::plan("admin-credit-refund", source_ref, actions, now)?
    else {
        return Ok((Vec::new(), Vec::new()));
    };
    Ok((vec![effect.condition], vec![effect.op]))
}

fn validate(payment: &LedgerEntry) -> AppResult<()> {
    if payment.kind != "payment" || payment.provider != "credits" {
        return Err(AppError::unprocessable("not a refundable credits payment"));
    }
    if payment.gross_cents <= 0 {
        return Err(AppError::unprocessable("payment amount is not refundable"));
    }
    Ok(())
}

fn refund_row(payment: &LedgerEntry, reference: &str, amount: i64, now: i64) -> LedgerEntry {
    LedgerEntry {
        reference: reference.to_string(),
        kind: "refund".to_string(),
        status: "succeeded".to_string(),
        gross_cents: amount,
        refund_cents: 0,
        currency: payment.currency.clone(),
        customer_profile_id: payment.customer_profile_id.clone(),
        route_path: None,
        product_id: payment.product_id.clone(),
        product_ids: payment.product_ids.clone(),
        provider: "credits".to_string(),
        provider_ref: Some(payment.reference.clone()),
        payer_wallet: None,
        created_at: time::iso8601(now),
        processed_at: time::iso8601(now),
        token_settlement: None,
    }
}

fn success(payment_ref: &str, balance_cents: i64) -> RouteResponse {
    RouteResponse::ok(&json!({
        "id": payment_ref,
        "processed": true,
        "status": "refunded",
        "balanceCents": balance_cents,
    }))
}

#[cfg(test)]
#[path = "admin_credit_refunds_tests.rs"]
mod tests;
