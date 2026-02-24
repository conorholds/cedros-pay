//! Email delivery worker with retry support
//!
//! Polls the email queue and sends emails via SMTP with exponential backoff retry.

use std::sync::Arc;
use std::time::Duration;

use chrono::Utc;
use rand::Rng;
use tokio::sync::watch;
use tokio::task::JoinHandle;
use tokio::time::interval;
use tracing::{debug, error, info, warn};
use zeroize::Zeroize;

use crate::config::{MessagingConfig, RetryConfig};
use crate::storage::{PendingEmail, Store};

/// Zeroizing container for SMTP credentials (L-005 fix).
///
/// Wraps sensitive credentials to ensure they are cleared from memory
/// after use, preventing potential memory scraping attacks.
struct ZeroizingCredentials {
    username: Option<String>,
    password: Option<String>,
}

impl ZeroizingCredentials {
    fn new(username: String, password: String) -> Self {
        Self {
            username: Some(username),
            password: Some(password),
        }
    }

    fn take_credentials(&mut self) -> lettre::transport::smtp::authentication::Credentials {
        lettre::transport::smtp::authentication::Credentials::new(
            self.username.take().unwrap_or_default(),
            self.password.take().unwrap_or_default(),
        )
    }
}

impl Drop for ZeroizingCredentials {
    fn drop(&mut self) {
        if let Some(ref mut u) = self.username {
            u.zeroize();
        }
        if let Some(ref mut p) = self.password {
            p.zeroize();
        }
    }
}

/// Email delivery worker with graceful shutdown support
pub struct EmailWorker<S: Store> {
    store: Arc<S>,
    config: MessagingConfig,
    poll_interval: Duration,
    batch_size: i32,
    shutdown_rx: Option<watch::Receiver<bool>>,
    retry: RetryConfig,
    /// Retention period for completed emails (days)
    retention_days: i32,
    /// Cleanup interval (number of poll cycles between cleanups)
    cleanup_interval_cycles: u32,
}

/// Handle for controlling the worker
pub struct EmailWorkerHandle {
    shutdown_tx: watch::Sender<bool>,
    join_handle: Option<JoinHandle<()>>,
}

impl EmailWorkerHandle {
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

/// Default email retention period: 30 days
const DEFAULT_RETENTION_DAYS: i32 = 30;
/// Default cleanup interval: every 720 poll cycles (~1 hour at 5s poll interval)
const DEFAULT_CLEANUP_CYCLES: u32 = 720;

impl<S: Store + 'static> EmailWorker<S> {
    pub fn with_shutdown(
        store: Arc<S>,
        config: MessagingConfig,
    ) -> Result<(Self, EmailWorkerHandle), String> {
        let (shutdown_tx, shutdown_rx) = watch::channel(false);

        let retry = RetryConfig {
            enabled: true,
            max_attempts: 5,
            initial_interval: Duration::from_secs(60),
            max_interval: Duration::from_secs(3600), // 1 hour max
            multiplier: 2.0,
            jitter: 0.1,
            timeout: Duration::from_secs(30),
        };

        let worker = Self {
            store,
            config,
            poll_interval: Duration::from_secs(10), // Check every 10 seconds
            batch_size: 10,
            shutdown_rx: Some(shutdown_rx),
            retry,
            retention_days: DEFAULT_RETENTION_DAYS,
            cleanup_interval_cycles: DEFAULT_CLEANUP_CYCLES,
        };

        let handle = EmailWorkerHandle {
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

    /// Build a reusable SMTP transport from current config.
    fn build_transport(
        &self,
    ) -> Result<lettre::AsyncSmtpTransport<lettre::Tokio1Executor>, String> {
        use lettre::{AsyncSmtpTransport, Tokio1Executor};

        let mut zeroizing_creds = ZeroizingCredentials::new(
            self.config.smtp_username.clone(),
            self.config.smtp_password.clone(),
        );
        let creds = zeroizing_creds.take_credentials();

        AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&self.config.smtp_host)
            .map_err(|e| format!("smtp transport: {}", e))
            .map(|builder| {
                builder
                    .port(self.config.smtp_port)
                    .credentials(creds)
                    .build()
            })
    }

    /// Start the email worker with graceful shutdown support
    pub async fn run(mut self) {
        let mut poll_timer = interval(self.poll_interval);
        poll_timer.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        let mut cycles_since_cleanup: u32 = 0;

        // P-01 fix: build SMTP transport once and reuse across all sends
        let mailer = match self.build_transport() {
            Ok(m) => m,
            Err(e) => {
                error!(error = %e, "Failed to build SMTP transport; email worker exiting");
                return;
            }
        };

        info!(
            "Email worker started with poll_interval={}s, cleanup every {} cycles ({} days retention)",
            self.poll_interval.as_secs(),
            self.cleanup_interval_cycles,
            self.retention_days
        );

        loop {
            if let Some(ref mut rx) = self.shutdown_rx {
                if *rx.borrow() {
                    info!("Email worker received shutdown signal");
                    break;
                }
            }

            tokio::select! {
                _ = poll_timer.tick() => {
                    if let Err(e) = self.process_batch(&mailer).await {
                        error!(error = %e, "Email batch processing failed");
                        // OPS-02: Make error backoff interruptible by shutdown signal
                        let sleep = tokio::time::sleep(Duration::from_secs(5));
                        tokio::pin!(sleep);
                        if let Some(ref mut rx) = self.shutdown_rx {
                            tokio::select! {
                                _ = &mut sleep => {}
                                _ = rx.changed() => {
                                    info!("Email worker shutdown during error backoff");
                                    break;
                                }
                            }
                        } else {
                            sleep.await;
                        }
                    }

                    cycles_since_cleanup += 1;
                    if cycles_since_cleanup >= self.cleanup_interval_cycles {
                        cycles_since_cleanup = 0;
                        match self.store.cleanup_old_emails(self.retention_days).await {
                            Ok(deleted) if deleted > 0 => {
                                info!(deleted = deleted, "Cleaned up old emails");
                            }
                            Ok(_) => {
                                debug!("No old emails to clean up");
                            }
                            Err(e) => {
                                warn!(error = %e, "Failed to cleanup old emails");
                            }
                        }
                    }
                }
                _ = async {
                    if let Some(ref mut rx) = self.shutdown_rx {
                        let _ = rx.changed().await;
                    } else {
                        std::future::pending::<()>().await
                    }
                } => {
                    info!("Email worker received shutdown signal");
                    break;
                }
            }
        }

        info!("Email worker stopped");
    }

    /// Process a batch of pending emails
    async fn process_batch(
        &self,
        mailer: &lettre::AsyncSmtpTransport<lettre::Tokio1Executor>,
    ) -> Result<(), String> {
        let emails = self
            .store
            .dequeue_emails(self.batch_size)
            .await
            .map_err(|e| e.to_string())?;

        if emails.is_empty() {
            debug!("No pending emails");
            return Ok(());
        }

        debug!(count = emails.len(), "Processing email batch");

        for email in emails {
            if let Err(e) = self.store.mark_email_processing(&email.id).await {
                warn!(email_id = %email.id, error = %e, "Failed to mark email processing");
                continue;
            }

            let result = self.send_email(&email, mailer).await;

            match result {
                Ok(_) => {
                    if let Err(e) = self.store.mark_email_success(&email.id).await {
                        warn!(email_id = %email.id, error = %e, "Failed to mark email success");
                    } else {
                        info!(email_id = %email.id, to = %email.to_email, "Email sent successfully");
                    }
                }
                Err(err) => {
                    let new_attempts = email.attempts + 1;
                    let max_attempts = email.max_attempts.max(1);

                    if new_attempts >= max_attempts {
                        if let Err(e) = self.store.mark_email_failed(&email.id, &err).await {
                            warn!(email_id = %email.id, error = %e, "Failed to mark email failed");
                        } else {
                            error!(
                                email_id = %email.id,
                                to = %email.to_email,
                                attempts = new_attempts,
                                error = %err,
                                "Email failed permanently"
                            );
                        }
                    } else {
                        let delay = self.retry_delay(new_attempts);
                        let next_attempt = Utc::now()
                            + chrono::Duration::from_std(delay)
                                .unwrap_or_else(|_| chrono::Duration::minutes(1));

                        if let Err(e) = self
                            .store
                            .mark_email_retry(&email.id, &err, next_attempt)
                            .await
                        {
                            warn!(email_id = %email.id, error = %e, "Failed to schedule email retry");
                        } else {
                            warn!(
                                email_id = %email.id,
                                to = %email.to_email,
                                attempts = new_attempts,
                                next_attempt = %next_attempt,
                                error = %err,
                                "Email delivery failed, scheduled retry"
                            );
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// Send a single email via the reusable SMTP transport
    async fn send_email(
        &self,
        email: &PendingEmail,
        mailer: &lettre::AsyncSmtpTransport<lettre::Tokio1Executor>,
    ) -> Result<(), String> {
        use lettre::message::header::ContentType;
        use lettre::message::{Mailbox, MultiPart, SinglePart};
        use lettre::{AsyncTransport, Message};

        let from_mailbox: Mailbox = format!("{} <{}>", email.from_name, email.from_email)
            .parse()
            .map_err(|e| format!("invalid from address: {}", e))?;

        let to_mailbox: Mailbox = email
            .to_email
            .parse()
            .map_err(|e| format!("invalid to address: {}", e))?;

        let message = if let Some(ref html) = email.body_html {
            Message::builder()
                .from(from_mailbox)
                .to(to_mailbox)
                .subject(&email.subject)
                .multipart(
                    MultiPart::alternative()
                        .singlepart(
                            SinglePart::builder()
                                .header(ContentType::TEXT_PLAIN)
                                .body(email.body_text.clone()),
                        )
                        .singlepart(
                            SinglePart::builder()
                                .header(ContentType::TEXT_HTML)
                                .body(html.clone()),
                        ),
                )
                .map_err(|e| format!("build email: {}", e))?
        } else {
            Message::builder()
                .from(from_mailbox)
                .to(to_mailbox)
                .subject(&email.subject)
                .header(ContentType::TEXT_PLAIN)
                .body(email.body_text.clone())
                .map_err(|e| format!("build email: {}", e))?
        };

        // OPS-03: Wrap SMTP send in timeout to prevent unbounded hangs
        tokio::time::timeout(self.retry.timeout, mailer.send(message))
            .await
            .map_err(|_| format!("smtp send timed out after {:?}", self.retry.timeout))?
            .map_err(|e| format!("smtp send: {}", e))?;

        Ok(())
    }

    fn retry_delay(&self, attempt: i32) -> Duration {
        let attempt_index = attempt.saturating_sub(1).min(30);
        let multiplier = if self.retry.multiplier <= 0.0 {
            1.0
        } else {
            self.retry.multiplier
        };
        let initial_secs = self.retry.initial_interval.as_secs_f64().max(1.0);
        let mut delay = initial_secs * multiplier.powi(attempt_index);

        if !delay.is_finite() {
            delay = self.retry.max_interval.as_secs_f64();
        }

        let max_delay = self.retry.max_interval.as_secs_f64();
        if max_delay > 0.0 && max_delay.is_finite() {
            delay = delay.min(max_delay);
        }

        if self.retry.jitter > 0.0 && self.retry.jitter < 1.0 {
            let jitter =
                rand::thread_rng().gen_range((1.0 - self.retry.jitter)..=(1.0 + self.retry.jitter));
            delay *= jitter;
        }

        Duration::from_secs_f64(delay.clamp(0.0, 86400.0 * 7.0))
    }
}

/// Spawn email worker as a tokio task, returning the handle for graceful shutdown.
///
/// Returns `None` if email is disabled or worker creation failed.
pub fn spawn_email_worker<S: Store + 'static>(
    store: Arc<S>,
    config: MessagingConfig,
) -> Option<EmailWorkerHandle> {
    if !config.email_enabled {
        info!("Email worker not started: email_enabled is false");
        return None;
    }

    match EmailWorker::with_shutdown(store, config) {
        Ok((worker, handle)) => {
            let join_handle = tokio::spawn(async move {
                worker.run().await;
            });
            Some(handle.with_join_handle(join_handle))
        }
        Err(e) => {
            error!(error = %e, "Failed to create email worker");
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_retry_delay_calculation() {
        let config = MessagingConfig::default();
        let store = Arc::new(crate::storage::InMemoryStore::new());
        let (worker, _) = EmailWorker::with_shutdown(store, config).unwrap();

        // With jitter=0.1, delays vary by ±10%. Check that they're in expected ranges.

        // First retry: 60s * 2^0 = 60s, with ±10% jitter -> 54-66s
        let delay1 = worker.retry_delay(1).as_secs();
        assert!((54..=66).contains(&delay1), "delay1 = {}", delay1); // CLEAN-003

        // Second retry: 60s * 2^1 = 120s, with ±10% jitter -> 108-132s
        let delay2 = worker.retry_delay(2).as_secs();
        assert!((108..=132).contains(&delay2), "delay2 = {}", delay2); // CLEAN-003

        // Third retry: 60s * 2^2 = 240s, with ±10% jitter -> 216-264s
        let delay3 = worker.retry_delay(3).as_secs();
        assert!((216..=264).contains(&delay3), "delay3 = {}", delay3); // CLEAN-003
    }
}
