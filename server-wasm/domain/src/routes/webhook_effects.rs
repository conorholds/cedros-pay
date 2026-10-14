//! Pure webhook effect planning. Callers append these actions to the same
//! guarded batch as the durable provider-state transition.

use serde_json::json;

use crate::crm_events;
use crate::db::{Db, EntryRecord, Filter, Op, Query};
use crate::error::AppResult;
use crate::ids;
use crate::models::LedgerEntry;
use crate::money;
use crate::routes::{analytics_events, entitlements};
use crate::seams::HostSeams;
use serde_json::Value;

pub(super) struct RefundEffect {
    pub(super) amount: i64,
    pub(super) currency: String,
    pub(super) reference: String,
    pub(super) user_id: Option<String>,
    pub(super) product_id: Option<String>,
}

pub(super) fn refund_actions(
    event_id: &str,
    object: &Value,
    now: i64,
    effect: &RefundEffect,
) -> Vec<crate::durable_effects::Action> {
    let mut actions = vec![
        analytics_events::refund_settled_action(
            "stripe",
            "checkout",
            effect.amount,
            &effect.currency,
            now,
        ),
        entitlements::changed_action(
            "refund_settled",
            effect.user_id.as_deref(),
            effect.product_id.as_deref(),
            Some(&effect.reference),
            Some(event_id),
            now,
        ),
    ];
    if let Some(action) = crm_events::refund_settled_action(
        event_id,
        object,
        effect.amount,
        &effect.currency,
        now,
        &effect.reference,
    ) {
        actions.push(action);
    }
    actions
}

pub(super) fn purchase_tag_actions<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    profile_id: &str,
    new_amount_cents: i64,
) -> AppResult<Vec<crate::durable_effects::Action>> {
    let query = Query::new()
        .filter(Filter::new("customerProfileId", Op::Eq, profile_id))
        .filter(Filter::new("kind", Op::Eq, "payment"))
        .filter(Filter::new("status", Op::Eq, "succeeded"));
    let rows = db.read_paged(ids::MODEL_LEDGER, &query, 100, 20)?;
    let entries = rows
        .iter()
        .map(EntryRecord::parse::<LedgerEntry>)
        .collect::<AppResult<Vec<_>>>()?;
    let lifetime = entries.iter().fold(new_amount_cents, |sum, entry| {
        money::add(sum, entry.gross_cents)
    });
    let stage = if rows.is_empty() {
        ids::TAG_FIRST_PURCHASE
    } else {
        ids::TAG_REPEAT
    };
    let mut actions = vec![tag_action(profile_id, stage)];
    let threshold = seams
        .setting_get(ids::SETTING_VIP_THRESHOLD_CENTS)?
        .and_then(|value| value.parse().ok())
        .unwrap_or(ids::DEFAULT_VIP_THRESHOLD_CENTS);
    if lifetime >= threshold {
        actions.push(tag_action(profile_id, ids::TAG_VIP));
    }
    Ok(actions)
}

pub(super) fn tag_action(profile_id: &str, slug: &str) -> crate::durable_effects::Action {
    crate::durable_effects::tag_assign(
        profile_id,
        slug,
        json!({
            "feature": "purchase-lifecycle",
            "description": "assigned by Cedros Pay on a completed purchase"
        }),
    )
}
