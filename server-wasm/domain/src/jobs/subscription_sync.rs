//! Subscription reconciliation for the managed `cedros-pay:subscription-sync`
//! job.

use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::crm_events;
use crate::db::{Db, Dir, EntryRecord, Filter, Op, Query};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::models::SubscriptionRecord;
use crate::reqresp::{JobExecution, JobOutcome, JobStatus};
use crate::routes::entitlements;
use crate::seams::HostSeams;
use crate::stripe::api;
use crate::time;

#[path = "subscription_progress.rs"]
mod progress;

const DEFAULT_LIMIT: i64 = 100;
const MAX_LIMIT: i64 = 500;
const RECONCILABLE_STATUSES: &[&str] = &[
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "paused",
    "incomplete",
];

/// Reconciles active/trialing subscriptions with local period expiry and, when
/// configured, Stripe's current subscription state.
pub fn run<S: HostSeams>(seams: &S, exec: &JobExecution) -> AppResult<JobOutcome> {
    let budget = crate::work_budget::WorkBudget::new(seams);
    let config = Config::parse(exec)?;
    let stripe_key = stripe_sync_key(seams, &config)?;
    let db = Db::new(seams, ids::DB_ACCESS);
    let mut progress = progress::Progress::load(&db, config.provider.as_deref())?;
    let candidates = if progress.sweep() {
        let queries = RECONCILABLE_STATUSES
            .iter()
            .map(|status| (*status, candidate_query(&config, status)))
            .collect::<Vec<_>>();
        progress.candidates(&db, &queries, config.limit as usize)?
    } else {
        subscription_candidates(&db, &config)?
    };
    let now_secs = seams.now_unix_secs();
    let mut result = reconcile_subscriptions(
        seams,
        candidates,
        stripe_key.as_deref(),
        &budget,
        &mut progress,
    )?;

    if !config.dry_run && !result.updates.is_empty() {
        let applied = persist_updates(&db, &result.updates, now_secs)?;
        result.counts.updated_count = applied.len() as i64;
        result.counts.renewed_count = applied
            .iter()
            .filter(|index| result.updates[**index].renewed)
            .count() as i64;
    }

    if !config.dry_run {
        progress.save(&db)?;
    }
    if !config.dry_run && config.provider.as_deref() != Some("x402") {
        crate::capacity::reconcile::run_with_budget(seams, &budget)?;
    }
    Ok(sync_outcome(&config, &result, stripe_key.is_none()))
}

struct Config {
    limit: i64,
    provider: Option<String>,
    dry_run: bool,
}

impl Config {
    fn parse(exec: &JobExecution) -> AppResult<Self> {
        let metadata = parse_metadata(exec)?;
        Ok(Self {
            limit: parse_limit(&metadata)?,
            provider: parse_provider(&metadata)?,
            dry_run: metadata
                .get("dryRun")
                .and_then(Value::as_bool)
                .unwrap_or(false),
        })
    }
}

#[derive(Default)]
struct Counts {
    candidate_count: i64,
    deferred_count: i64,
    synced_count: i64,
    provider_synced_count: i64,
    expired_count: i64,
    updated_count: i64,
    renewed_count: i64,
    failed_count: i64,
}

struct Update {
    row: EntryRecord,
    record: SubscriptionRecord,
    renewed: bool,
}

struct ResultState {
    counts: Counts,
    updates: Vec<Update>,
}

fn parse_metadata(exec: &JobExecution) -> AppResult<Value> {
    if exec.metadata_json.trim().is_empty() {
        return Ok(json!({}));
    }
    let value: Value = serde_json::from_str(&exec.metadata_json).map_err(|e| {
        AppError::bad_request("job metadata must be valid JSON").with_internal(e.to_string())
    })?;
    if value.is_object() {
        Ok(value)
    } else {
        Err(AppError::bad_request("job metadata must be a JSON object"))
    }
}

fn parse_limit(metadata: &Value) -> AppResult<i64> {
    let limit = metadata
        .get("limit")
        .and_then(Value::as_i64)
        .unwrap_or(DEFAULT_LIMIT);
    if !(1..=MAX_LIMIT).contains(&limit) {
        return Err(AppError::bad_request(format!(
            "subscription sync limit must be between 1 and {MAX_LIMIT}"
        )));
    }
    Ok(limit)
}

fn parse_provider(metadata: &Value) -> AppResult<Option<String>> {
    match metadata.get("provider").and_then(Value::as_str) {
        None => Ok(None),
        Some("stripe") => Ok(Some("stripe".to_string())),
        Some("x402") => Ok(Some("x402".to_string())),
        Some(_) => Err(AppError::bad_request(
            "subscription sync provider must be stripe or x402",
        )),
    }
}

fn stripe_sync_key<S: HostSeams>(seams: &S, config: &Config) -> AppResult<Option<String>> {
    if config.provider.as_deref() == Some("x402") {
        return Ok(None);
    }
    Ok(seams
        .secret_get(ids::SECRET_STRIPE_KEY)?
        .filter(|secret| !secret.is_empty()))
}

/// Urgent passes merge the earliest expiry across statuses. Alternating
/// rotating passes provide progress when these subscriptions remain unchanged.
fn subscription_candidates<S: HostSeams>(
    db: &Db<'_, S>,
    config: &Config,
) -> AppResult<Vec<EntryRecord>> {
    let mut candidates = Vec::new();
    for status in RECONCILABLE_STATUSES {
        let query = candidate_query(config, status);
        candidates.extend(db.read(ids::MODEL_SUBSCRIPTIONS, &query)?);
    }
    candidates.sort_by_key(period_end_sort_key);
    candidates.truncate(config.limit.max(0) as usize);
    Ok(candidates)
}

fn candidate_query(config: &Config, status: &str) -> Query {
    let mut query = Query::new()
        .filter(Filter::new("status", Op::Eq, status))
        .order("currentPeriodEnd", Dir::Asc)
        .limit(config.limit);
    if let Some(provider) = &config.provider {
        query = query.filter(Filter::new("provider", Op::Eq, provider.as_str()));
    }
    query
}

fn period_end_sort_key(record: &EntryRecord) -> i64 {
    record
        .payload
        .get("currentPeriodEnd")
        .and_then(Value::as_str)
        .and_then(time::parse_iso)
        .unwrap_or(i64::MAX)
}

fn reconcile_subscriptions<S: HostSeams>(
    seams: &S,
    candidates: Vec<EntryRecord>,
    stripe_key: Option<&str>,
    budget: &crate::work_budget::WorkBudget,
    progress: &mut progress::Progress,
) -> AppResult<ResultState> {
    let mut state = ResultState {
        counts: Counts {
            candidate_count: candidates.len() as i64,
            ..Default::default()
        },
        updates: Vec::new(),
    };
    let candidate_count = candidates.len();
    for (index, entry) in candidates.into_iter().enumerate() {
        if budget.exhausted(seams, 240) {
            state.counts.deferred_count = (candidate_count - index) as i64;
            break;
        }
        progress.consumed(&entry)?;
        reconcile_one(seams, entry, seams.now_unix_secs(), stripe_key, &mut state)?;
    }
    Ok(state)
}

fn reconcile_one<S: HostSeams>(
    seams: &S,
    entry: EntryRecord,
    now_secs: i64,
    stripe_key: Option<&str>,
    state: &mut ResultState,
) -> AppResult<()> {
    let mut record = match entry.parse::<SubscriptionRecord>() {
        Ok(record) => record,
        Err(_) => {
            state.counts.failed_count += 1;
            return Ok(());
        }
    };
    state.counts.synced_count += 1;
    let original = encode(&record)?;
    let original_period_end = record.current_period_end.clone();

    if reconcile_stripe(seams, stripe_key, &mut record) {
        state.counts.provider_synced_count += 1;
    } else if record.provider == "stripe" && stripe_key.is_some() {
        state.counts.failed_count += 1;
    }
    expire_locally(&mut record, now_secs, &mut state.counts);
    if encode(&record)? != original {
        record.updated_at = time::iso8601(now_secs);
        state.updates.push(Update {
            row: entry,
            renewed: subscription_period_extended(
                original_period_end.as_deref(),
                record.current_period_end.as_deref(),
            ),
            record,
        });
    }
    Ok(())
}

fn reconcile_stripe<S: HostSeams>(
    seams: &S,
    stripe_key: Option<&str>,
    record: &mut SubscriptionRecord,
) -> bool {
    if record.provider != "stripe" {
        return false;
    }
    match stripe_key {
        Some(secret) => match sync_stripe_subscription(seams, secret, record) {
            Ok(synced) => synced,
            Err(error) => {
                seams.log("warn", &format!("subscription sync failed: {}", error.code));
                false
            }
        },
        None => false,
    }
}

fn sync_stripe_subscription<S: HostSeams>(
    seams: &S,
    secret: &str,
    record: &mut SubscriptionRecord,
) -> AppResult<bool> {
    let subscription_id = record
        .provider_ref
        .as_deref()
        .filter(|id| !id.is_empty())
        .unwrap_or(&record.subscription_id);
    if !api::valid_subscription_id(subscription_id) || subscription_id != record.subscription_id {
        return Err(AppError::unprocessable(
            "stored Stripe subscription identity is invalid",
        ));
    }
    let observed_at = seams.now_unix_secs();
    let fetch = api::build_retrieve_subscription_fetch(secret, subscription_id);
    let raw = seams.http_fetch(&fetch.to_string())?;
    let (http_status, body) = api::unwrap_fetch(&raw)
        .map_err(|m| AppError::internal("malformed egress response").with_internal(m))?;
    let sub = api::parse_subscription(http_status, &body)
        .map_err(|message| AppError::new(502, "subscription_sync_failed", message))?;
    let provider: Value = serde_json::from_str(&body)
        .map_err(|_| AppError::conflict("invalid Stripe subscription response"))?;
    let legacy_owner_matches = record.stripe_customer_id.is_none()
        && !api::valid_customer_id(&record.customer_ref)
        && provider["metadata"]["user_id_trusted"] == "true"
        && provider["metadata"]["user_id"] == record.customer_ref;
    if sub.id != subscription_id
        || (sub.customer != record.stripe_customer() && !legacy_owner_matches)
    {
        return Err(AppError::conflict(
            "Stripe returned a different subscription",
        ));
    }
    record.stripe_customer_id = Some(sub.customer);
    record.status = sub.status;
    if let Some(price_id) = sub.price_id {
        record.price_id = price_id;
    }
    record.cancel_at_period_end = sub.cancel_at_period_end;
    record.current_period_end = sub.current_period_end.map(time::iso8601);
    record.last_provider_event_at = Some(observed_at);
    Ok(true)
}

fn expire_locally(record: &mut SubscriptionRecord, now_secs: i64, counts: &mut Counts) {
    if !expires(record, now_secs) {
        return;
    }
    // Local expiry is not proof Stripe canceled: a missed resume webhook must
    // remain reconcilable after an outage.
    record.status = if record.cancel_at_period_end && record.provider != "stripe" {
        "canceled".to_string()
    } else {
        "past_due".to_string()
    };
    counts.expired_count += 1;
}

fn expires(record: &SubscriptionRecord, now_secs: i64) -> bool {
    matches!(record.status.as_str(), "active" | "trialing")
        && record
            .current_period_end
            .as_deref()
            .and_then(time::parse_iso)
            .map(|end_secs| end_secs <= now_secs)
            .unwrap_or(false)
}

fn encode(record: &SubscriptionRecord) -> AppResult<Value> {
    serde_json::to_value(record)
        .map_err(|e| AppError::internal("cannot encode subscription").with_internal(e.to_string()))
}

fn persist_updates<S: HostSeams>(
    db: &Db<'_, S>,
    updates: &[Update],
    now_secs: i64,
) -> AppResult<Vec<usize>> {
    let mut applied = Vec::new();
    for (index, update) in updates.iter().enumerate() {
        let mut actions = vec![entitlements::changed_action(
            "subscription_changed",
            Some(&update.record.customer_ref),
            Some(&update.record.price_id),
            Some(&update.record.subscription_id),
            Some(&update.row.entry_key),
            now_secs,
        )];
        if update.renewed {
            let period = update
                .record
                .current_period_end
                .as_deref()
                .unwrap_or("unknown");
            if let Some(action) = crm_events::subscription_renewed_record_action(
                &format!(
                    "subscription.renewed:{}:{period}",
                    update.record.subscription_id
                ),
                &update.record.customer_ref,
                &update.record.subscription_id,
                &update.record.price_id,
                now_secs,
            ) {
                actions.push(action);
            }
        }
        let source_material = json!({
            "subscriptionId": update.record.subscription_id,
            "beforeVersion": update.row.version,
            "status": update.record.status,
            "periodEnd": update.record.current_period_end,
        });
        let source_id = hex::encode(Sha256::digest(source_material.to_string().as_bytes()));
        let effect =
            crate::durable_effects::plan("subscription-sync", &source_id, actions, now_secs)?;
        if crate::routes::subscription_store::update_monotonic_with_effects(
            db,
            &update.row,
            update.record.clone(),
            effect,
        )? {
            applied.push(index);
        }
    }
    Ok(applied)
}

fn subscription_period_extended(before: Option<&str>, after: Option<&str>) -> bool {
    match (before, after) {
        (Some(before), Some(after)) => after > before,
        _ => false,
    }
}

fn sync_outcome(config: &Config, state: &ResultState, stripe_unconfigured: bool) -> JobOutcome {
    let details = json!({
        "candidateCount": state.counts.candidate_count,
        "deferredCount": state.counts.deferred_count,
        "syncedCount": state.counts.synced_count,
        "providerSyncedCount": state.counts.provider_synced_count,
        "expiredCount": state.counts.expired_count,
        "updatedCount": state.counts.updated_count,
        "renewedCount": state.counts.renewed_count,
        "failedCount": state.counts.failed_count,
        "dryRun": config.dry_run,
        "provider": config.provider,
        "skippedReason": skipped_reason(config, stripe_unconfigured),
    });
    if state.counts.failed_count > 0 {
        JobOutcome {
            status: JobStatus::Retryable,
            details_json: details.to_string(),
        }
    } else {
        JobOutcome::succeeded(details)
    }
}

fn skipped_reason(config: &Config, stripe_unconfigured: bool) -> Option<&str> {
    if stripe_unconfigured && config.provider.as_deref() != Some("x402") {
        Some("stripe_sync_not_configured")
    } else {
        None
    }
}

#[cfg(test)]
#[path = "subscription_sync_tests.rs"]
mod subscription_sync_tests;
