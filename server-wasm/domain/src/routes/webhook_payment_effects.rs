//! Pure durable-effect planning for a newly settled Stripe payment.

use serde_json::Value;

use super::super::webhook_effects;
use crate::crm_events;
use crate::db::Db;
use crate::error::AppResult;
use crate::models::LedgerEntry;
use crate::routes::{analytics_events, entitlements};
use crate::seams::HostSeams;

pub(super) struct PurchaseEffect<'a> {
    pub(super) event_id: &'a str,
    pub(super) object: &'a Value,
    pub(super) reference: &'a str,
    pub(super) entry: &'a LedgerEntry,
    pub(super) profile: Option<String>,
    pub(super) now: i64,
}

pub(super) fn purchase_actions<S: HostSeams>(
    seams: &S,
    db: &Db<'_, S>,
    effect: PurchaseEffect<'_>,
) -> AppResult<Vec<crate::durable_effects::Action>> {
    let mut actions = Vec::new();
    if let Some(profile_id) = effect.profile.as_deref() {
        actions.extend(webhook_effects::purchase_tag_actions(
            seams,
            db,
            profile_id,
            effect.entry.gross_cents,
        )?);
    }
    actions.push(analytics_events::payment_succeeded_action(
        "stripe",
        "checkout",
        effect.entry.gross_cents,
        &effect.entry.currency,
        effect.now,
    ));
    actions.push(entitlements::changed_action(
        "purchase_completed",
        effect.entry.customer_profile_id.as_deref(),
        effect.entry.product_id.as_deref(),
        Some(effect.reference),
        Some(effect.event_id),
        effect.now,
    ));
    if let Some(action) = crm_events::payment_succeeded_action(
        "stripe",
        effect.event_id,
        effect.object,
        effect.entry.gross_cents,
        &effect.entry.currency,
        effect.now,
        effect.reference,
    ) {
        actions.push(action);
    }
    Ok(actions)
}
