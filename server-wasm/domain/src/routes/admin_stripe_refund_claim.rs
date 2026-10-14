use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};

use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedBatchOutcome;
use crate::models::LedgerEntry;
use crate::routes::refunds::store;
use crate::seams::HostSeams;
use crate::time;

const LEASE_SECS: i64 = 120;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct StripeClaim {
    pub payment_ref: String,
    pub fingerprint: String,
    #[serde(default)]
    pub base_refunded_cents: i64,
    pub status: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub started_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lease_owner: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub lease_expires_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub refund_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub amount: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,
    #[serde(default)]
    pub webhook_settled: bool,
    pub updated_at: String,
}

pub(super) struct ActiveClaim {
    pub claim: StripeClaim,
    pub version: String,
    pub payment: store::Versioned<LedgerEntry>,
}

pub(super) enum Acquire {
    Active(Box<ActiveClaim>),
    Completed(Box<StripeClaim>),
}

pub(super) fn acquire<S: HostSeams>(
    db: &Db<'_, S>,
    payment_ref: &str,
    site_id: &str,
    payment: store::Versioned<LedgerEntry>,
    now: i64,
) -> AppResult<Acquire> {
    let key = claim_key(payment_ref);
    let existing = store::read::<_, StripeClaim>(db, &key)?;
    if let Some(stored) = existing {
        return reacquire(db, payment_ref, site_id, payment, stored, now);
    }
    let fingerprint = fingerprint(
        payment_ref,
        site_id,
        &payment.value,
        payment.value.refund_cents,
    );
    let owner = format!("stripe-refund:{payment_ref}:{now}");
    let mut claim = StripeClaim {
        payment_ref: payment_ref.to_string(),
        fingerprint,
        base_refunded_cents: payment.value.refund_cents,
        status: "claimed".to_string(),
        started_at: Some(time::iso8601(now)),
        lease_owner: None,
        lease_expires_at: None,
        refund_id: None,
        amount: None,
        currency: None,
        webhook_settled: false,
        updated_at: time::iso8601(now),
    };
    lease(&mut claim, &owner, now);
    let outcome = db.guarded_batch(
        &[
            store::version_condition(payment_ref, &payment.version),
            store::absent_condition(&key),
        ],
        &[store::write(&key, &claim)?],
    )?;
    active_from_outcome(outcome, key, claim, payment)
}

fn reacquire<S: HostSeams>(
    db: &Db<'_, S>,
    payment_ref: &str,
    site_id: &str,
    payment: store::Versioned<LedgerEntry>,
    mut stored: store::Versioned<StripeClaim>,
    now: i64,
) -> AppResult<Acquire> {
    let key = claim_key(payment_ref);
    if stored.value.fingerprint
        != fingerprint(
            payment_ref,
            site_id,
            &payment.value,
            stored.value.base_refunded_cents,
        )
    {
        return Err(AppError::conflict(
            "Stripe refund claim fingerprint mismatch",
        ));
    }
    if stored.value.status == "completed" {
        return Ok(Acquire::Completed(Box::new(stored.value)));
    }
    let lease_active = stored
        .value
        .lease_expires_at
        .as_deref()
        .and_then(time::parse_iso)
        .is_some_and(|expires| expires > now);
    if lease_active {
        return Err(AppError::conflict(
            "Stripe refund is already being processed",
        ));
    }
    lease(
        &mut stored.value,
        &format!("stripe-refund:{payment_ref}:{now}"),
        now,
    );
    let outcome = db.guarded_batch(
        &[
            store::version_condition(&key, &stored.version),
            store::version_condition(payment_ref, &payment.version),
        ],
        &[store::write(&key, &stored.value)?],
    )?;
    active_from_outcome(outcome, key, stored.value, payment)
}

pub(super) fn release<S: HostSeams>(
    db: &Db<'_, S>,
    active: &mut ActiveClaim,
    now: i64,
) -> AppResult<()> {
    active.claim.status = "available".to_string();
    active.claim.lease_owner = None;
    active.claim.lease_expires_at = None;
    active.claim.updated_at = time::iso8601(now);
    let key = claim_key(&active.claim.payment_ref);
    if let GuardedBatchOutcome::Applied { entries, .. } = db.guarded_batch(
        &[store::version_condition(&key, &active.version)],
        &[store::write(&key, &active.claim)?],
    )? {
        active.version = store::written_version(&entries, &key)?;
    }
    Ok(())
}

pub(super) fn claim_key(payment_ref: &str) -> String {
    format!("stripe-refund-op:{payment_ref}")
}

pub(super) fn provider_retry_safe(claim: &StripeClaim, now: i64) -> AppResult<bool> {
    let Some(started) = claim.started_at.as_deref().and_then(time::parse_iso) else {
        return Ok(false);
    };
    Ok(now >= started && now - started < crate::checkout_contract::PROVIDER_IDEMPOTENCY_SECONDS)
}

fn lease(claim: &mut StripeClaim, owner: &str, now: i64) {
    claim.status = "claimed".to_string();
    claim.lease_owner = Some(owner.to_string());
    claim.lease_expires_at = Some(time::iso8601(now + LEASE_SECS));
    claim.updated_at = time::iso8601(now);
}

fn active_from_outcome(
    outcome: GuardedBatchOutcome,
    key: String,
    claim: StripeClaim,
    payment: store::Versioned<LedgerEntry>,
) -> AppResult<Acquire> {
    match outcome {
        GuardedBatchOutcome::Applied { entries, .. } => {
            Ok(Acquire::Active(Box::new(ActiveClaim {
                claim,
                version: store::written_version(&entries, &key)?,
                payment,
            })))
        }
        GuardedBatchOutcome::Conflict { .. } => {
            Err(AppError::conflict("Stripe refund claim changed; retry"))
        }
    }
}

fn fingerprint(
    payment_ref: &str,
    site_id: &str,
    payment: &LedgerEntry,
    base_refunded_cents: i64,
) -> String {
    let mut value = json!({
        "siteId": site_id,
        "paymentRef": payment_ref,
        "providerRef": payment.provider_ref,
        "amountCents": payment.gross_cents,
        "currency": payment.currency,
        "customerProfileId": payment.customer_profile_id,
    });
    if base_refunded_cents != 0 {
        value["baseRefundedCents"] = json!(base_refunded_cents);
    }
    hex::encode(Sha256::digest(value.to_string().as_bytes()))
}

pub(super) fn requested_amount(claim: &StripeClaim, payment: &LedgerEntry) -> AppResult<i64> {
    if claim.base_refunded_cents < 0 {
        return Err(AppError::conflict("invalid refund baseline"));
    }
    payment
        .gross_cents
        .checked_sub(claim.base_refunded_cents)
        .filter(|amount| *amount > 0)
        .ok_or_else(|| AppError::conflict("invalid refund amount"))
}

/// Read-only recovery context for the admin list. Never return the claim's
/// fingerprint, lease owner, provider payload, or customer data.
pub(in crate::routes::admin_dashboard::refunds) fn progress<S: HostSeams>(
    seams: &S,
    payment: &serde_json::Value,
) -> AppResult<serde_json::Value> {
    if payment.get("provider").and_then(serde_json::Value::as_str) != Some("stripe") {
        return Ok(serde_json::Value::Null);
    }
    let Some(reference) = payment.get("reference").and_then(serde_json::Value::as_str) else {
        return Ok(serde_json::Value::Null);
    };
    let db = Db::new(seams, crate::ids::DB_ACCESS);
    let Some(stored) = store::read::<_, StripeClaim>(&db, &claim_key(reference))? else {
        return Ok(serde_json::Value::Null);
    };
    if stored.value.payment_ref != reference {
        return Err(AppError::conflict(
            "stored refund payment reference mismatch",
        ));
    }
    let gross = payment
        .get("grossCents")
        .and_then(serde_json::Value::as_i64)
        .unwrap_or(0);
    let refunded = payment
        .get("refundCents")
        .and_then(serde_json::Value::as_i64)
        .unwrap_or(0);
    let status = if stored.value.status == "completed" {
        if refunded >= gross {
            "completed"
        } else {
            "reversed"
        }
    } else {
        "unresolved"
    };
    Ok(json!({
        "status": status,
        "refundId": stored.value.refund_id,
        "requestedAmountMinor": stored.value.amount.unwrap_or_else(|| gross.saturating_sub(stored.value.base_refunded_cents)),
    }))
}
