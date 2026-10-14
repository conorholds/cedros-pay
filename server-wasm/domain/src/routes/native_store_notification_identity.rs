use sha2::{Digest, Sha256};

use super::notification_commit::{LedgerRefund, NativeNotification, SubscriptionAction};

pub(super) fn digest_id(prefix: &str, bytes: &[u8]) -> String {
    format!("{prefix}:{}", hex::encode(Sha256::digest(bytes)))
}

pub(super) fn notification_marker_key(id: &str) -> String {
    format!(
        "native-notification:{}",
        hex::encode(Sha256::digest(id.as_bytes()))
    )
}

pub(super) fn notification_fingerprint(input: &NativeNotification) -> String {
    let action = match input.subscription_action {
        Some(SubscriptionAction::Cancel) => "cancel".to_string(),
        Some(SubscriptionAction::Renew { period_end_secs }) => format!("renew:{period_end_secs}"),
        None => "none".to_string(),
    };
    let refund = match &input.ledger_refund {
        Some(LedgerRefund::Full) => "full".to_string(),
        Some(LedgerRefund::Cumulative {
            amount_cents,
            currency,
        }) => format!("cumulative:{amount_cents}:{currency}"),
        None => "none".to_string(),
    };
    // Event time is fixed in the durable marker on first delivery rather than in the
    // fingerprint: provider payloads may omit it, and replay-time clock fallback must
    // not turn an otherwise exact notification into different facts.
    let facts = format!(
        "{}\n{}\n{}\n{}\n{}\n{}",
        input.provider,
        input.subscription_id.as_deref().unwrap_or_default(),
        input.provider_refs.join("\u{1f}"),
        action,
        input.ledger_ref.as_deref().unwrap_or_default(),
        refund
    );
    hex::encode(Sha256::digest(facts.as_bytes()))
}
