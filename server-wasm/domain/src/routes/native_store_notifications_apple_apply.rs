//! Mapping of verified Apple notifications to guarded projection changes.

use serde::Deserialize;

use super::notification_commit::{apply_notification, NativeNotification, SubscriptionAction};
#[cfg(test)]
use super::notification_identity::digest_id;
use crate::error::AppResult;
use crate::seams::HostSeams;

pub(super) const APPLE_PROVIDER: &str = "apple_app_store";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct NotifTx {
    #[serde(default)]
    pub(super) transaction_id: Option<String>,
    #[serde(default)]
    pub(super) original_transaction_id: Option<String>,
    #[serde(default)]
    pub(super) expires_date: Option<i64>,
    #[serde(default)]
    pub(super) bundle_id: Option<String>,
    #[serde(default)]
    pub(super) environment: Option<String>,
}

#[cfg(test)]
pub(super) fn apply_apple_notification<S: HostSeams>(
    seams: &S,
    kind: &str,
    tx: &NotifTx,
) -> AppResult<()> {
    let seed = format!(
        "{kind}:{}:{}:{}",
        tx.transaction_id.as_deref().unwrap_or_default(),
        tx.original_transaction_id.as_deref().unwrap_or_default(),
        tx.expires_date.unwrap_or_default()
    );
    apply_apple_notification_at(
        seams,
        &digest_id("apple-test", seed.as_bytes()),
        seams.now_unix_secs().saturating_mul(1000),
        kind,
        tx,
    )
}

pub(super) fn apply_apple_notification_at<S: HostSeams>(
    seams: &S,
    id: &str,
    event_time_ms: i64,
    kind: &str,
    tx: &NotifTx,
) -> AppResult<()> {
    let refs = [
        tx.original_transaction_id.as_deref(),
        tx.transaction_id.as_deref(),
    ];
    // Apple one-time purchases also have a transaction id, so that id alone cannot
    // require a subscription projection. Renewals may fall back to it only when an
    // expiry proves the transaction is recurring.
    let sub_id = tx
        .original_transaction_id
        .as_deref()
        .filter(|id| !id.trim().is_empty())
        .or_else(|| {
            tx.expires_date
                .is_some()
                .then_some(tx.transaction_id.as_deref())
                .flatten()
                .filter(|id| !id.trim().is_empty())
        });
    let subscription = match kind {
        "REFUND" | "REVOKE" | "EXPIRED" | "GRACE_PERIOD_EXPIRED" => {
            sub_id.map(|id| (id.to_string(), SubscriptionAction::Cancel))
        }
        "DID_RENEW" | "SUBSCRIBED" | "OFFER_REDEEMED" => {
            sub_id.zip(tx.expires_date).map(|(id, expires)| {
                (
                    id.to_string(),
                    SubscriptionAction::Renew {
                        period_end_secs: expires / 1000,
                    },
                )
            })
        }
        _ => return Ok(()),
    };
    let ledger_ref = matches!(kind, "REFUND" | "REVOKE")
        .then(|| {
            tx.transaction_id
                .as_ref()
                .map(|id| format!("apple-tx:{id}"))
        })
        .flatten();
    apply_notification(
        seams,
        NativeNotification {
            id: id.into(),
            event_time_ms,
            provider: APPLE_PROVIDER,
            subscription_id: subscription.as_ref().map(|(id, _)| id.clone()),
            provider_refs: refs.iter().flatten().map(|id| (*id).into()).collect(),
            subscription_action: subscription.map(|(_, action)| action),
            ledger_ref,
            ledger_refund: Some(super::notification_commit::LedgerRefund::Full),
        },
    )
}
