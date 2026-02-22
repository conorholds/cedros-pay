//! Webhook queue, email queue, idempotency, and DLQ storage methods

use super::*;

mod dlq;
mod queue;

// ─── Re-exports (queue) ──────────────────────────────────────────────────────
pub(super) use queue::{
    cleanup_old_emails, cleanup_old_webhooks, count_pending_webhooks, dequeue_emails,
    dequeue_webhooks, delete_webhook, enqueue_email, enqueue_webhook, get_email, get_webhook,
    list_webhooks, mark_email_failed, mark_email_processing, mark_email_retry, mark_email_success,
    mark_webhook_failed, mark_webhook_processing, mark_webhook_retry, mark_webhook_success,
    retry_webhook,
};

// ─── Re-exports (dlq) ────────────────────────────────────────────────────────
pub(super) use dlq::{
    cleanup_expired_idempotency_keys, delete_from_dlq, delete_idempotency_key, get_dlq_entry,
    get_idempotency_key, list_dlq, move_to_dlq, retry_from_dlq, save_idempotency_key,
    try_save_idempotency_key,
};
