//! Balance alert webhook sender
//!
//! Sends webhook notifications when wallet balances drop below thresholds.
//! Matches Go server's monitoring/balance_monitor.go behavior.

use reqwest::Client;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Semaphore;

use super::health_checker::LowBalanceAlert;

/// Maximum concurrent alert webhook tasks to prevent resource exhaustion
const MAX_CONCURRENT_ALERTS: usize = 10;

/// Balance alert webhook sender
pub struct BalanceAlertSender {
    client: Client,
    webhook_url: String,
    headers: HashMap<String, String>,
    body_template: Option<String>,
}

/// Default Discord webhook payload format
#[derive(Serialize)]
struct DiscordWebhookPayload {
    content: String,
}

impl BalanceAlertSender {
    /// Create a new balance alert sender
    pub fn new(
        webhook_url: String,
        headers: HashMap<String, String>,
        body_template: Option<String>,
        timeout: Duration,
    ) -> Result<Self, String> {
        let client = Client::builder()
            .timeout(timeout)
            .build()
            .map_err(|e| format!("balance alert http client: {}", e))?;

        Ok(Self {
            client,
            webhook_url,
            headers,
            body_template,
        })
    }

    /// Send a balance alert webhook
    pub async fn send_alert(&self, alert: &LowBalanceAlert) -> Result<(), String> {
        let body = self.render_body(alert)?;

        let mut request = self.client.post(&self.webhook_url);

        // Set default Content-Type for Discord/Slack
        request = request.header("Content-Type", "application/json");

        // Apply custom headers
        for (key, value) in &self.headers {
            request = request.header(key, value);
        }

        let response = request
            .body(body)
            .send()
            .await
            .map_err(|e| format!("HTTP request failed: {}", e))?;

        let status = response.status();
        if status.is_success() {
            tracing::info!(
                wallet = %alert.wallet,
                balance = %alert.balance,
                status_code = %status.as_u16(),
                "Balance alert sent successfully"
            );
            Ok(())
        } else {
            Err(format!(
                "Webhook returned non-success status: {}",
                status.as_u16()
            ))
        }
    }

    /// Render the alert body using template or default Discord format
    fn render_body(&self, alert: &LowBalanceAlert) -> Result<String, String> {
        if let Some(template) = &self.body_template {
            // Simple template substitution (matches Go's text/template behavior)
            let body = template
                .replace("{{.Wallet}}", &alert.wallet)
                .replace("{{.Balance}}", &format!("{:.6}", alert.balance))
                .replace("{{.Threshold}}", &format!("{:.6}", alert.threshold))
                .replace("{{.Timestamp}}", &alert.timestamp.to_rfc3339());
            Ok(body)
        } else {
            // Default Discord webhook format (matches Go implementation)
            let payload = DiscordWebhookPayload {
                content: format!(
                    "⚠️ **Low Balance Alert**\n\n\
                     Wallet: `{}`\n\
                     Balance: **{:.6} SOL**\n\
                     Threshold: {:.6} SOL\n\n\
                     Please add more SOL to continue processing gasless transactions.",
                    alert.wallet, alert.balance, alert.threshold
                ),
            };
            serde_json::to_string(&payload)
                .map_err(|e| format!("Failed to serialize payload: {}", e))
        }
    }
}

/// Create an alert callback that sends webhooks
///
/// Uses a semaphore to limit concurrent alert tasks to MAX_CONCURRENT_ALERTS,
/// preventing resource exhaustion if many alerts fire simultaneously.
pub fn create_webhook_callback(
    webhook_url: String,
    headers: HashMap<String, String>,
    body_template: Option<String>,
    timeout: Duration,
) -> Result<Box<dyn Fn(LowBalanceAlert) + Send + Sync>, String> {
    let sender = Arc::new(BalanceAlertSender::new(
        webhook_url,
        headers,
        body_template,
        timeout,
    )?);

    // Semaphore to limit concurrent alert webhook tasks
    let semaphore = Arc::new(Semaphore::new(MAX_CONCURRENT_ALERTS));

    Ok(Box::new(move |alert: LowBalanceAlert| {
        let sender = sender.clone();
        let semaphore = semaphore.clone();

        // Spawn async task to send the webhook with bounded concurrency
        tokio::spawn(async move {
            // REL-008: Use acquire_owned().await to queue instead of dropping alerts.
            // This waits for a permit rather than failing immediately, ensuring
            // critical low balance warnings are never lost.
            let permit = match semaphore.acquire_owned().await {
                Ok(permit) => permit,
                Err(_) => {
                    // Semaphore was closed (only happens during shutdown)
                    tracing::warn!(
                        wallet = %alert.wallet,
                        "Balance alert semaphore closed during shutdown"
                    );
                    return;
                }
            };

            if let Err(e) = sender.send_alert(&alert).await {
                tracing::error!(
                    wallet = %alert.wallet,
                    error = %e,
                    "Failed to send balance alert webhook"
                );
            }

            // Permit is automatically released when dropped
            drop(permit);
        });
    }))
}
