use std::sync::Arc;
use std::time::Duration;

use chrono::Utc;
use futures_util::StreamExt;
use indexmap::IndexMap;
use parking_lot::Mutex;
use rand::Rng;
use tokio::sync::watch;
use tokio::task::JoinHandle;
use tokio::time::interval;
use tracing::{debug, error, info, warn};

use crate::config::{CallbacksConfig, RetryConfig};
use crate::middleware::circuit_breaker::{
    new_circuit_breaker, CircuitBreakerConfig, SharedCircuitBreaker,
};
use crate::storage::StorageError;
use crate::storage::Store;

/// Webhook delivery worker with graceful shutdown support per spec (20-webhooks.md)
pub struct WebhookWorker<S: Store> {
    store: Arc<S>,
    http_client: reqwest::Client,
    poll_interval: Duration,
    batch_size: i32,
    shutdown_rx: Option<watch::Receiver<bool>>,
    /// Circuit breaker per spec (20-webhooks.md) to prevent cascading failures
    circuit_breaker_config: CircuitBreakerConfig,
    circuit_breakers: Mutex<IndexMap<String, SharedCircuitBreaker>>,
    /// Retention period for completed webhooks (days)
    retention_days: i32,
    /// Cleanup interval (number of poll cycles between cleanups)
    cleanup_interval_cycles: u32,
    retry: RetryConfig,
    dlq_enabled: bool,
}

/// Handle for controlling the worker
pub struct WebhookWorkerHandle {
    shutdown_tx: watch::Sender<bool>,
    /// REL-002: Store JoinHandle to allow waiting for worker completion
    join_handle: Option<JoinHandle<()>>,
}

impl WebhookWorkerHandle {
    /// Signal the worker to shut down gracefully
    pub fn shutdown(&self) {
        let _ = self.shutdown_tx.send(true);
    }

    pub fn with_join_handle(mut self, join_handle: JoinHandle<()>) -> Self {
        self.join_handle = Some(join_handle);
        self
    }

    pub async fn wait(mut self) {
        if let Some(handle) = self.join_handle.take() {
            let _ = handle.await;
        }
    }

    /// Signal shutdown and wait for the worker to complete.
    pub async fn shutdown_and_wait(self) {
        self.shutdown();
        self.wait().await;
    }
}

/// Default webhook retention period: 7 days
const DEFAULT_RETENTION_DAYS: i32 = 7;
/// Default cleanup interval: every 720 poll cycles (~1 hour at 5s poll interval)
const DEFAULT_CLEANUP_CYCLES: u32 = 720;
/// Maximum circuit breakers tracked to avoid unbounded growth
const MAX_CIRCUIT_BREAKERS: usize = 1000;

// REL-002: Exponential backoff configuration for error handling
/// Initial backoff duration in seconds
const INITIAL_BACKOFF_SECS: u64 = 1;
/// Maximum backoff duration in seconds (5 minutes)
const MAX_BACKOFF_SECS: u64 = 300;
/// Backoff multiplier for exponential increase
const BACKOFF_MULTIPLIER: u64 = 2;
/// Maximum jitter in milliseconds to add to backoff
const BACKOFF_JITTER_MAX_MS: u64 = 1000;

impl<S: Store + 'static> WebhookWorker<S> {
    pub fn new(store: Arc<S>) -> Result<Self, String> {
        Self::new_with_config(
            store,
            &CallbacksConfig::default(),
            CircuitBreakerConfig::webhook(),
        )
    }

    pub fn new_with_config(
        store: Arc<S>,
        callbacks: &CallbacksConfig,
        cb_config: CircuitBreakerConfig,
    ) -> Result<Self, String> {
        let timeout = callbacks.timeout;
        let http_client = reqwest::Client::builder()
            .timeout(timeout)
            .redirect(reqwest::redirect::Policy::none())
            .pool_max_idle_per_host(10)
            .pool_idle_timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| format!("webhook http client: {}", e))?;
        Ok(Self {
            store,
            // WK-002: Configure connection pool limits to prevent resource exhaustion
            http_client,
            poll_interval: Duration::from_secs(5),
            batch_size: 10,
            shutdown_rx: None,
            circuit_breaker_config: cb_config.clone(),
            circuit_breakers: Mutex::new(IndexMap::new()),
            retention_days: DEFAULT_RETENTION_DAYS,
            cleanup_interval_cycles: DEFAULT_CLEANUP_CYCLES,
            retry: callbacks.retry.clone(),
            dlq_enabled: callbacks.dlq_enabled,
        })
    }

    /// Create a worker with shutdown capability
    pub fn with_shutdown(store: Arc<S>) -> Result<(Self, WebhookWorkerHandle), String> {
        Self::with_shutdown_and_config(
            store,
            &CallbacksConfig::default(),
            CircuitBreakerConfig::webhook(),
        )
    }

    pub fn with_shutdown_and_config(
        store: Arc<S>,
        callbacks: &CallbacksConfig,
        cb_config: CircuitBreakerConfig,
    ) -> Result<(Self, WebhookWorkerHandle), String> {
        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        let timeout = callbacks.timeout;
        let http_client = reqwest::Client::builder()
            .timeout(timeout)
            .redirect(reqwest::redirect::Policy::none())
            .pool_max_idle_per_host(10)
            .pool_idle_timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| format!("webhook http client: {}", e))?;
        let worker = Self {
            store,
            // WK-002: Configure connection pool limits to prevent resource exhaustion
            http_client,
            poll_interval: Duration::from_secs(5),
            batch_size: 10,
            shutdown_rx: Some(shutdown_rx),
            circuit_breaker_config: cb_config.clone(),
            circuit_breakers: Mutex::new(IndexMap::new()),
            retention_days: DEFAULT_RETENTION_DAYS,
            cleanup_interval_cycles: DEFAULT_CLEANUP_CYCLES,
            retry: callbacks.retry.clone(),
            dlq_enabled: callbacks.dlq_enabled,
        };
        let handle = WebhookWorkerHandle {
            shutdown_tx,
            join_handle: None,
        };
        Ok((worker, handle))
    }

    pub fn with_poll_interval(mut self, interval: Duration) -> Self {
        self.poll_interval = interval;
        self
    }

    pub fn with_batch_size(mut self, size: i32) -> Self {
        self.batch_size = size;
        self
    }

    /// Start the webhook worker with graceful shutdown support
    pub async fn run(mut self) {
        let mut poll_timer = interval(self.poll_interval);
        poll_timer.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        let mut cycles_since_cleanup: u32 = 0;
        // REL-002: Track exponential backoff state
        let mut backoff_secs: u64 = INITIAL_BACKOFF_SECS;

        info!(
            "Webhook worker started with poll_interval={}s, cleanup every {} cycles ({} days retention)",
            self.poll_interval.as_secs(),
            self.cleanup_interval_cycles,
            self.retention_days
        );

        loop {
            // Check for shutdown signal
            if let Some(ref mut rx) = self.shutdown_rx {
                if *rx.borrow() {
                    info!("Webhook worker received shutdown signal");
                    break;
                }
            }

            tokio::select! {
                _ = poll_timer.tick() => {
                    if let Err(e) = self.process_batch().await {
                        error!(error = %e, "Webhook batch processing failed");
                        // REL-002: Exponential backoff with jitter to prevent thundering herd
                        let jitter = rand::random::<u64>() % BACKOFF_JITTER_MAX_MS;
                        let delay = Duration::from_secs(backoff_secs) + Duration::from_millis(jitter);
                        tokio::time::sleep(delay).await;
                        backoff_secs = std::cmp::min(backoff_secs * BACKOFF_MULTIPLIER, MAX_BACKOFF_SECS);
                    } else {
                        // REL-002: Reset backoff on success
                        backoff_secs = INITIAL_BACKOFF_SECS;
                    }

                    // Periodic cleanup of old completed/failed webhooks
                    cycles_since_cleanup += 1;
                    if cycles_since_cleanup >= self.cleanup_interval_cycles {
                        cycles_since_cleanup = 0;
                        match self.store.cleanup_old_webhooks(self.retention_days).await {
                            Ok(deleted) if deleted > 0 => {
                                info!(deleted = deleted, retention_days = self.retention_days, "Cleaned up old webhooks");
                            }
                            Ok(_) => {
                                debug!("No old webhooks to clean up");
                            }
                            Err(e) => {
                                warn!(error = %e, "Failed to cleanup old webhooks");
                            }
                        }
                    }
                }
                _ = async {
                    if let Some(ref mut rx) = self.shutdown_rx {
                        let _ = rx.changed().await;
                    } else {
                        // No shutdown channel, wait forever
                        std::future::pending::<()>().await
                    }
                } => {
                    info!("Webhook worker received shutdown signal");
                    break;
                }
            }
        }

        info!("Webhook worker stopped");
    }

    /// Process a batch of pending webhooks
    async fn process_batch(&self) -> Result<(), String> {
        let webhooks = self
            .store
            .dequeue_webhooks(self.batch_size)
            .await
            .map_err(|e| e.to_string())?;

        // Per spec (21-observability.md): Record webhook queue metrics
        // Note: We record the dequeued batch size, not total backlog.
        crate::observability::record_webhook_queue_size("dequeued", webhooks.len() as i64);

        if webhooks.is_empty() {
            debug!("No pending webhooks");
            return Ok(());
        }

        debug!(count = webhooks.len(), "Processing webhook batch");

        let max_concurrency = std::cmp::min(4, webhooks.len());
        let worker = self;
        futures_util::stream::iter(webhooks)
            .for_each_concurrent(max_concurrency, |webhook| async move {
                // WK-001: Mark as Processing before delivery to prevent duplicate dequeue
                // PostgreSQL already does this atomically in dequeue_webhooks, but non-Postgres
                // backends don't. This is harmless for Postgres and necessary for others.
                if let Err(e) = worker.store.mark_webhook_processing(&webhook.id).await {
                    if should_skip_mark_processing_error(&e) {
                        debug!(
                            webhook_id = %webhook.id,
                            error = %e,
                            "Webhook already processed or deleted, skipping"
                        );
                        return;
                    }

                    // Treat transient storage errors as non-fatal for this attempt.
                    // The webhook has already been dequeued; continuing allows best-effort delivery
                    // and the subsequent mark_success/mark_retry calls will surface persistence issues.
                    warn!(
                        webhook_id = %webhook.id,
                        error = %e,
                        "Failed to mark webhook processing; continuing with delivery"
                    );
                }

                let result = match Self::payload_bytes(&webhook) {
                    Ok(payload_bytes) => {
                        worker
                            .deliver_webhook(
                                &webhook.id,
                                &webhook.url,
                                &payload_bytes,
                                &webhook.headers,
                            )
                            .await
                    }
                    Err(err) => Err(err),
                };

                match result {
                    Ok(_) => {
                        if let Err(e) = worker.store.mark_webhook_success(&webhook.id).await {
                            warn!(webhook_id = %webhook.id, error = %e, "Failed to mark webhook success");
                        } else {
                            info!(webhook_id = %webhook.id, "Webhook delivered successfully");
                        }
                    }
                    Err(err) => {
                        let new_attempts = webhook.attempts + 1;
                        let max_attempts = if worker.retry.enabled {
                            webhook.max_attempts.max(1)
                        } else {
                            1
                        };
                        let webhook_id = webhook.id.clone();

                        if new_attempts >= max_attempts {
                            if worker.dlq_enabled {
                                // Move to DLQ per spec (20-webhooks.md)
                                // BUG-002: ensure DLQ records the final attempt count.
                                let mut webhook = webhook;
                                webhook.attempts = new_attempts;
                                if let Err(e) = worker.store.move_to_dlq(webhook, &err).await {
                                    warn!(webhook_id = %webhook_id, error = %e, "Failed to move webhook to DLQ");
                                } else {
                                    error!(
                                        webhook_id = %webhook_id,
                                        attempts = new_attempts,
                                        error = %err,
                                        "Webhook failed permanently, moved to DLQ"
                                    );
                                }
                            } else {
                                let now = Utc::now();
                                if let Err(e) =
                                    worker.store.mark_webhook_failed(&webhook_id, &err, now).await
                                {
                                    warn!(webhook_id = %webhook_id, error = %e, "Failed to mark webhook failed");
                                } else {
                                    error!(
                                        webhook_id = %webhook_id,
                                        attempts = new_attempts,
                                        error = %err,
                                        "Webhook failed permanently, DLQ disabled"
                                    );
                                }
                            }
                        } else {
                            // Schedule retry with exponential backoff
                            let delay = worker.retry_delay(new_attempts);
                            // Convert std Duration to chrono Duration, falling back to 1 minute if conversion fails
                            let next_attempt = Utc::now()
                                + chrono::Duration::from_std(delay)
                                    .unwrap_or_else(|_| chrono::Duration::minutes(1));

                            if let Err(e) = worker
                                .store
                                .mark_webhook_retry(&webhook_id, &err, next_attempt)
                                .await
                            {
                                warn!(webhook_id = %webhook_id, error = %e, "Failed to schedule webhook retry");
                            } else {
                                warn!(
                                    webhook_id = %webhook.id,
                                    attempts = new_attempts,
                                    next_attempt = %next_attempt,
                                    error = %err,
                                    "Webhook delivery failed, scheduled retry"
                                );
                            }
                        }
                    }
                }
            })
            .await;

        Ok(())
    }

    /// Maximum response body size to read from webhook endpoints (64KB)
    /// Prevents memory exhaustion from malicious endpoints returning large responses
    const MAX_RESPONSE_BODY_SIZE: usize = 64 * 1024;

    fn payload_bytes(webhook: &crate::storage::PendingWebhook) -> Result<Vec<u8>, String> {
        if webhook.payload_bytes.is_empty() {
            serde_json::to_vec(&webhook.payload)
                .map_err(|e| format!("serialize webhook payload: {}", e))
        } else {
            Ok(webhook.payload_bytes.clone())
        }
    }

    /// Deliver a single webhook with circuit breaker protection per spec (20-webhooks.md)
    async fn deliver_webhook(
        &self,
        _webhook_id: &str,
        url: &str,
        payload_bytes: &[u8],
        headers: &std::collections::HashMap<String, String>,
    ) -> Result<(), String> {
        // Check circuit breaker before attempting delivery
        let circuit_breaker = self.circuit_breaker_for(url);
        if !circuit_breaker.allow() {
            return Err("webhook circuit breaker is open".to_string());
        }

        let mut request = self.http_client.post(url).body(payload_bytes.to_vec());

        for (key, value) in headers {
            request = request.header(key.as_str(), value.as_str());
        }

        let result = request.send().await;

        match result {
            Ok(response) => {
                let status = response.status();
                // Redirects are blocked to prevent SSRF via Location headers.
                // Treat only 2xx as success.
                if status.is_success() {
                    circuit_breaker.record_success();
                    Ok(())
                } else {
                    // SECURITY: Limit response body size to prevent memory exhaustion
                    // from malicious endpoints returning very large error responses
                    let body =
                        Self::read_limited_body(response, Self::MAX_RESPONSE_BODY_SIZE).await;
                    // 4xx errors are client errors, don't count against circuit breaker
                    if status.as_u16() >= 500 {
                        circuit_breaker.record_failure();
                    }
                    Err(format!(
                        "HTTP {}: {}",
                        status,
                        body.chars().take(200).collect::<String>()
                    ))
                }
            }
            Err(e) => {
                // Network/timeout errors count against circuit breaker
                circuit_breaker.record_failure();
                Err(e.to_string())
            }
        }
    }

    fn circuit_breaker_for(&self, url: &str) -> SharedCircuitBreaker {
        let mut breakers = self.circuit_breakers.lock();
        if let Some(existing) = breakers.shift_remove(url) {
            breakers.insert(url.to_string(), existing.clone());
            return existing;
        }

        if breakers.len() >= MAX_CIRCUIT_BREAKERS {
            breakers.shift_remove_index(0);
        }

        let breaker = new_circuit_breaker(self.circuit_breaker_config.clone());
        breakers.insert(url.to_string(), breaker.clone());
        breaker
    }

    /// Read response body with size limit to prevent memory exhaustion
    async fn read_limited_body(response: reqwest::Response, max_size: usize) -> String {
        // Check Content-Length header first if available
        if let Some(content_length) = response.content_length() {
            if content_length > max_size as u64 {
                return format!("[response too large: {} bytes]", content_length);
            }
        }

        // Read body in chunks with size limit (streamed, avoids full buffering)
        let mut buffer = Vec::with_capacity(max_size.min(1024));
        let mut stream = response.bytes_stream();
        while let Some(chunk) = stream.next().await {
            let chunk = match chunk {
                Ok(bytes) => bytes,
                Err(e) => return format!("[failed to read body: {}]", e),
            };
            let remaining = max_size.saturating_sub(buffer.len());
            if remaining == 0 {
                break;
            }
            let take = remaining.min(chunk.len());
            buffer.extend_from_slice(&chunk[..take]);
            if buffer.len() >= max_size {
                break;
            }
        }

        if buffer.len() >= max_size {
            format!(
                "[truncated: {} bytes] {}",
                buffer.len(),
                String::from_utf8_lossy(&buffer)
            )
        } else {
            String::from_utf8_lossy(&buffer).to_string()
        }
    }

    fn retry_delay(&self, attempt: i32) -> Duration {
        compute_retry_delay(&self.retry, attempt)
    }
}

fn compute_retry_delay(retry: &RetryConfig, attempt: i32) -> Duration {
    // WORK-002: Clamp attempt_index to prevent powi() overflow
    // At multiplier=2.0: 2^30 ≈ 1 billion, which is safe
    // Beyond 30, powi() can overflow to Inf which panics Duration::from_secs_f64
    let attempt_index = attempt.saturating_sub(1).min(30);
    let multiplier = if retry.multiplier <= 0.0 {
        1.0
    } else {
        retry.multiplier
    };
    // BUG-010: Ensure minimum delay of 1 second even with zero/bad config
    let initial_secs = retry.initial_interval.as_secs_f64().max(1.0);
    let mut delay = initial_secs * multiplier.powi(attempt_index);

    // Guard against NaN/Inf from overflow (defense in depth)
    if !delay.is_finite() {
        delay = retry.max_interval.as_secs_f64();
    }

    let max_delay = retry.max_interval.as_secs_f64();
    if max_delay > 0.0 && max_delay.is_finite() {
        delay = delay.min(max_delay);
    }
    if retry.jitter > 0.0 && retry.jitter < 1.0 {
        let jitter = rand::thread_rng().gen_range((1.0 - retry.jitter)..=(1.0 + retry.jitter));
        delay *= jitter;
    }

    // Final guard: clamp to reasonable range and ensure finite
    Duration::from_secs_f64(delay.clamp(0.0, 86400.0 * 7.0)) // Max 7 days
}

fn should_skip_mark_processing_error(err: &StorageError) -> bool {
    matches!(err, StorageError::NotFound | StorageError::Conflict)
}

/// Spawn webhook worker as a tokio task (no shutdown handle)
pub fn spawn_webhook_worker<S: Store + 'static>(store: Arc<S>) {
    match WebhookWorker::new(store) {
        Ok(worker) => {
            tokio::spawn(async move {
                worker.run().await;
            });
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to create webhook worker");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use std::collections::HashMap;

    use crate::storage::InMemoryStore;
    use axum::{
        body::{Body, Bytes},
        http::StatusCode,
        response::Response,
        routing::{get, post},
        Router,
    };

    #[test]
    fn test_retry_delay_uses_config() {
        let mut callbacks = CallbacksConfig::default();
        callbacks.retry.initial_interval = Duration::from_secs(1);
        callbacks.retry.max_interval = Duration::from_secs(5);
        callbacks.retry.multiplier = 2.0;
        callbacks.retry.jitter = 0.0;

        let delay = compute_retry_delay(&callbacks.retry, 3);

        assert_eq!(delay, Duration::from_secs(4));
    }

    #[tokio::test]
    async fn test_deliver_webhook_treats_redirect_as_error() {
        let app = Router::new().route(
            "/redirect",
            get(|| async {
                Response::builder()
                    .status(StatusCode::FOUND)
                    .header("Location", "/final")
                    .body(Body::empty())
                    .unwrap()
            }),
        );

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });
        tokio::time::sleep(Duration::from_millis(50)).await;

        let store = Arc::new(InMemoryStore::new());
        let worker = WebhookWorker::new_with_config(
            store,
            &CallbacksConfig::default(),
            CircuitBreakerConfig::webhook(),
        )
        .unwrap();
        let url = format!("http://{}/redirect", addr);

        let payload_bytes = serde_json::to_vec(&serde_json::json!({})).unwrap();
        let result = worker
            .deliver_webhook("webhook-1", &url, &payload_bytes, &HashMap::new())
            .await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_read_limited_body_stream_truncates() {
        let app = Router::new().route(
            "/stream",
            get(|| async {
                let chunks = vec![
                    Ok::<Bytes, std::convert::Infallible>(Bytes::from_static(b"hello")),
                    Ok(Bytes::from_static(b"world")),
                ];
                let stream = futures_util::stream::iter(chunks);
                Response::builder()
                    .status(StatusCode::OK)
                    .body(Body::from_stream(stream))
                    .unwrap()
            }),
        );

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        let url = format!("http://{}/stream", addr);
        let response = reqwest::get(url).await.unwrap();
        let body = WebhookWorker::<InMemoryStore>::read_limited_body(response, 5).await;

        assert!(body.starts_with("[truncated: 5 bytes] hello"));
    }

    #[tokio::test]
    async fn test_circuit_breaker_is_per_destination() {
        let app = Router::new()
            .route(
                "/fail",
                post(|| async {
                    Response::builder()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .body(Body::empty())
                        .unwrap()
                }),
            )
            .route(
                "/ok",
                post(|| async {
                    Response::builder()
                        .status(StatusCode::OK)
                        .body(Body::empty())
                        .unwrap()
                }),
            );

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        let mut cb_config = CircuitBreakerConfig::webhook();
        cb_config.consecutive_failures = 1;
        cb_config.min_requests = 1;
        cb_config.failure_ratio = 1.0;

        let store = Arc::new(InMemoryStore::new());
        let worker =
            WebhookWorker::new_with_config(store, &CallbacksConfig::default(), cb_config).unwrap();

        let payload_bytes = serde_json::to_vec(&serde_json::json!({})).unwrap();
        let fail_url = format!("http://{}/fail", addr);
        let ok_url = format!("http://{}/ok", addr);

        let fail_result = worker
            .deliver_webhook("webhook-fail", &fail_url, &payload_bytes, &HashMap::new())
            .await;
        assert!(fail_result.is_err());

        let ok_result = worker
            .deliver_webhook("webhook-ok", &ok_url, &payload_bytes, &HashMap::new())
            .await;
        if let Err(err) = ok_result {
            panic!("expected success, got error: {err}");
        }
    }

    #[test]
    fn test_should_skip_mark_processing_error() {
        assert!(should_skip_mark_processing_error(&StorageError::NotFound));
        assert!(should_skip_mark_processing_error(&StorageError::Conflict));
        assert!(!should_skip_mark_processing_error(&StorageError::Database(
            "db".into()
        )));
    }
}
