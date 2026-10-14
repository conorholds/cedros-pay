//! Atomic receipt claim and native-store purchase projection.

use serde_json::{json, Value};

use super::purchase_plan::purchase_plan;
use super::VerifyReq;
use crate::db::{Db, EntryRecord};
use crate::error::{AppError, AppResult};
use crate::guarded_batch::GuardedBatchOutcome;
use crate::ids;
use crate::reqresp::RouteResponse;
use crate::routes::{analytics_events, entitlements};
use crate::seams::HostSeams;
use crate::time;

pub(super) const CLAIM_FIELD: &str = "nativeStoreClaim";
const MAX_COMMIT_ATTEMPTS: usize = 3;

/// Store-specific facts that uniquely bind a verified provider purchase.
pub(super) struct Commit<'a> {
    pub ledger_ref: &'a str,
    pub provider: &'a str,
    pub provider_ref: &'a str,
    pub app_id: Option<&'a str>,
    pub sub: Option<(String, &'static str, i64)>,
}

pub(super) fn commit_purchase<S: HostSeams>(
    seams: &S,
    product: &Value,
    body: &VerifyReq,
    user_id: Option<String>,
    commit: Commit<'_>,
) -> AppResult<RouteResponse> {
    let result = verification_result(body, &commit);
    let claim = claim_value(body, user_id.as_deref(), &commit, &result);
    let db = Db::new(seams, ids::DB_ACCESS);
    for _ in 0..MAX_COMMIT_ATTEMPTS {
        if let Some(existing) = db.read_one(ids::MODEL_LEDGER, commit.ledger_ref)? {
            return exact_replay(seams, existing, &claim, body, user_id.as_deref(), &commit);
        }
        let mut plan = purchase_plan(seams, product, body, user_id.as_deref(), &commit, &claim)?;
        let now = seams.now_unix_secs();
        let actions = vec![
            analytics_events::payment_succeeded_action(
                commit.provider,
                "native_store",
                plan.gross_cents,
                &plan.currency,
                now,
            ),
            entitlements::changed_action(
                "purchase_completed",
                user_id.as_deref(),
                Some(&body.product_id),
                Some(commit.ledger_ref),
                Some(commit.provider_ref),
                now,
            ),
        ];
        let effect_id = if let Some(effect) =
            crate::durable_effects::plan("native-store-purchase", commit.ledger_ref, actions, now)?
        {
            let effect_id = Some(effect.effect_id.clone());
            plan.conditions.push(effect.condition);
            plan.ops.push(effect.op);
            effect_id
        } else {
            None
        };
        match db.guarded_batch(&plan.conditions, &plan.ops)? {
            GuardedBatchOutcome::Applied { .. } => {
                if let Some(effect_id) = effect_id {
                    crate::durable_effects::dispatch_effect_best_effort(seams, &effect_id);
                }
                return Ok(RouteResponse::ok(&result));
            }
            GuardedBatchOutcome::Conflict { .. } => continue,
        }
    }
    if let Some(existing) = db.read_one(ids::MODEL_LEDGER, commit.ledger_ref)? {
        return exact_replay(seams, existing, &claim, body, user_id.as_deref(), &commit);
    }
    Err(AppError::conflict(
        "the store purchase changed concurrently",
    ))
}

fn exact_replay<S: HostSeams>(
    seams: &S,
    existing: EntryRecord,
    expected_claim: &Value,
    body: &VerifyReq,
    user_id: Option<&str>,
    commit: &Commit<'_>,
) -> AppResult<RouteResponse> {
    let Some(stored) = existing.payload.get(CLAIM_FIELD) else {
        return Err(AppError::conflict(
            "the provider purchase identity is already in use",
        ));
    };
    if stored != expected_claim {
        return Err(AppError::conflict(
            "the provider purchase identity is already claimed by different purchase facts",
        ));
    }
    let entry: crate::models::LedgerEntry = existing.parse()?;
    let occurred_at = time::parse_iso(&entry.processed_at)
        .or_else(|| time::parse_iso(&entry.created_at))
        .ok_or_else(|| AppError::internal("stored native purchase has an invalid timestamp"))?;
    crate::durable_effects::ensure(
        &Db::new(seams, ids::DB_ACCESS),
        "native-store-purchase",
        commit.ledger_ref,
        vec![
            analytics_events::payment_succeeded_action(
                commit.provider,
                "native_store",
                entry.gross_cents,
                &entry.currency,
                occurred_at,
            ),
            entitlements::changed_action(
                "purchase_completed",
                user_id,
                Some(&body.product_id),
                Some(commit.ledger_ref),
                Some(commit.provider_ref),
                occurred_at,
            ),
        ],
        occurred_at,
    )?;
    crate::durable_effects::dispatch_best_effort(seams, "native-store-purchase", commit.ledger_ref);
    let result = stored
        .get("result")
        .ok_or_else(|| AppError::internal("stored native purchase outcome is missing"))?;
    Ok(RouteResponse::ok(result))
}

fn verification_result(body: &VerifyReq, commit: &Commit<'_>) -> Value {
    let mut result =
        json!({ "success": true, "transactionId": commit.provider_ref, "method": body.method });
    if let Some((id, status, end)) = &commit.sub {
        result["subscriptionId"] = json!(id);
        result["subscriptionStatus"] = json!(status);
        result["currentPeriodEnd"] = json!(time::iso8601(*end));
    }
    result
}

fn claim_value(
    body: &VerifyReq,
    user_id: Option<&str>,
    commit: &Commit<'_>,
    result: &Value,
) -> Value {
    json!({ "schemaVersion": 1, "provider": commit.provider, "providerRef": commit.provider_ref,
        "appId": commit.app_id, "productId": body.product_id, "storeProductId": body.store_product_id,
        "customerProfileId": user_id, "method": body.method, "result": result })
}
