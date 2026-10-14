//! Read-only provider recovery for initiated legacy Stripe payments. Reuse the
//! authenticated webhook projection, including its economic identity fences.
use super::{webhook_commit, webhook_payments};
use crate::db::{Db, Dir, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::{ids, models::LedgerEntry, seams::HostSeams, stripe::api};
use serde_json::{json, Value};

pub(crate) fn run<S: HostSeams>(seams: &S, limit: i64) -> AppResult<usize> {
    let Some(secret) = seams
        .secret_get(ids::SECRET_STRIPE_KEY)?
        .filter(|key| !key.is_empty())
    else {
        return Ok(0);
    };
    let live = if secret.starts_with("sk_live_") || secret.starts_with("rk_live_") {
        true
    } else if secret.starts_with("sk_test_") || secret.starts_with("rk_test_") {
        false
    } else {
        return Err(AppError::internal("invalid Stripe reconciliation key mode"));
    };
    let db = Db::new(seams, ids::DB_ACCESS);
    let budget = crate::work_budget::WorkBudget::new(seams);
    let mut settled = 0;
    for (status, seconds) in [("pending", 15), ("failed", 30)] {
        let query = Query::new()
            .filter(Filter::new("kind", Op::Eq, "payment"))
            .filter(Filter::new("provider", Op::Eq, "stripe"))
            .filter(Filter::new("status", Op::Eq, status))
            .order("createdAt", Dir::Asc)
            .limit(limit.clamp(1, 100));
        let (mut scan, rows) = crate::reconciliation_scan::Scan::load(
            &db,
            &format!("stripe-payments-{status}"),
            ids::MODEL_LEDGER,
            &query,
        )?;
        for row in rows {
            if budget.exhausted(seams, seconds) {
                break;
            }
            scan.advance(&db)?;
            let entry: LedgerEntry = row.parse()?;
            if entry.reference != row.entry_key {
                return Err(AppError::internal("Stripe ledger identity mismatch"));
            }
            let Some(provider_id) = entry.provider_ref.as_deref() else {
                continue;
            };
            let session = entry.reference.starts_with("cs_");
            let request = if session {
                crate::stripe::checkout_provider::build_retrieve(&secret, &entry.reference)
                    .map_err(|_| AppError::internal("invalid stored Stripe session"))?
            } else if provider_id.starts_with("pi_") {
                api::build_retrieve_payment_intent_fetch(&secret, provider_id)
            } else {
                continue;
            };
            let Ok(raw) = seams.http_fetch(&request.to_string()) else {
                continue;
            };
            let Ok((200, body)) = api::unwrap_fetch(&raw) else {
                continue;
            };
            let Ok(object) = serde_json::from_str::<Value>(&body) else {
                continue;
            };
            let expected_id = if session {
                &entry.reference
            } else {
                provider_id
            };
            if object["id"] != expected_id
                || object["livemode"].as_bool() != Some(live)
                || object["object"]
                    != if session {
                        "checkout.session"
                    } else {
                        "payment_intent"
                    }
                || (!session && object["metadata"]["reference"] != entry.reference)
            {
                continue;
            }
            let paid = if session {
                object["mode"] == "payment"
                    && object["status"] == "complete"
                    && object["payment_status"] == "paid"
            } else {
                object["status"] == "succeeded"
            };
            // Complete-but-unpaid sessions may still settle asynchronously.
            let terminal = if session {
                object["mode"] == "payment"
                    && object["status"] == "expired"
                    && object["payment_status"] == "unpaid"
            } else {
                object["status"] == "canceled"
            };
            if !paid && !terminal {
                continue;
            }
            let event_id = format!(
                "reconcile:{}:{}",
                expected_id,
                if paid { "paid" } else { "terminal" }
            );
            let fingerprint = webhook_commit::fingerprint(
                &json!({"source":"provider-reconciliation", "object":object}),
            )?;
            if webhook_commit::preflight(&db, &event_id, &fingerprint)? {
                continue;
            }
            let now = seams.now_unix_secs();
            if session && paid {
                webhook_payments::session_completed(
                    seams,
                    &db,
                    &event_id,
                    &fingerprint,
                    &object,
                    now,
                )?;
            } else if session {
                webhook_payments::session_failed(
                    seams,
                    &db,
                    &event_id,
                    &fingerprint,
                    &object,
                    now,
                )?;
            } else if paid {
                webhook_payments::succeeded(seams, &db, &event_id, &fingerprint, &object, now)?;
            } else {
                webhook_payments::failed(seams, &db, &event_id, &fingerprint, &object, now)?;
            }
            settled += usize::from(paid);
        }
    }
    Ok(settled)
}

#[cfg(test)]
#[path = "stripe_reconciliation_tests.rs"]
mod tests;
