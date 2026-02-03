//! WebSocket-based transaction confirmation
//!
//! Uses Solana's WebSocket API for real-time transaction confirmation
//! instead of polling the RPC endpoint.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use solana_sdk::signature::Signature;
use tokio::sync::{broadcast, mpsc, oneshot, RwLock};
use tokio::time::timeout;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use tracing::{debug, error, info, warn};

use crate::constants::DEFAULT_CONFIRMATION_TIMEOUT;

/// Interval for cleaning up orphaned subscriptions (entries where client timed out)
const SUBSCRIPTION_CLEANUP_INTERVAL: Duration = Duration::from_secs(10);

/// Configuration for WebSocket confirmation
#[derive(Debug, Clone)]
pub struct WsConfirmConfig {
    /// WebSocket endpoint URL (e.g., "wss://api.mainnet-beta.solana.com")
    pub ws_url: String,
    /// Commitment level for confirmation
    pub commitment: String,
    /// Timeout for individual confirmations
    pub confirmation_timeout: Duration,
    /// Maximum reconnection attempts
    pub max_reconnect_attempts: u32,
    /// Reconnection backoff base
    pub reconnect_backoff: Duration,
}

impl Default for WsConfirmConfig {
    fn default() -> Self {
        Self {
            ws_url: "wss://api.devnet.solana.com".to_string(),
            commitment: "confirmed".to_string(),
            confirmation_timeout: DEFAULT_CONFIRMATION_TIMEOUT,
            max_reconnect_attempts: 5,
            reconnect_backoff: Duration::from_millis(500),
        }
    }
}

impl WsConfirmConfig {
    pub fn from_rpc_url(rpc_url: &str) -> Self {
        let ws_url = rpc_url
            .replace("https://", "wss://")
            .replace("http://", "ws://");
        Self {
            ws_url,
            ..Default::default()
        }
    }
}

/// Confirmation result from WebSocket
#[derive(Debug, Clone)]
pub enum ConfirmationResult {
    /// Transaction confirmed successfully
    Confirmed { slot: u64 },
    /// Transaction failed with error
    Failed { error: String },
    /// Subscription timeout
    Timeout,
}

/// Pending confirmation request
struct PendingConfirmation {
    signature: Signature,
    response_tx: oneshot::Sender<ConfirmationResult>,
}

/// WebSocket subscription message
#[derive(Debug, Serialize)]
struct SubscribeRequest {
    jsonrpc: &'static str,
    id: u64,
    method: &'static str,
    params: Vec<serde_json::Value>,
}

/// WebSocket notification message from Solana RPC.
/// Fields are deserialized for complete message representation, though
/// only specific fields are accessed depending on notification type.
#[derive(Debug, Deserialize)]
struct WsNotification {
    #[serde(default)]
    #[serde(rename = "jsonrpc")]
    _jsonrpc: String,
    #[serde(default)]
    #[serde(rename = "id")]
    _id: Option<u64>,
    #[serde(default)]
    result: Option<u64>,
    #[serde(default)]
    method: Option<String>,
    #[serde(default)]
    params: Option<NotificationParams>,
    #[serde(default)]
    error: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct NotificationParams {
    #[serde(default)]
    result: Option<SignatureNotification>,
    #[serde(default)]
    subscription: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct SignatureNotification {
    #[serde(default)]
    err: Option<serde_json::Value>,
    #[serde(default)]
    value: Option<SignatureValue>,
}

#[derive(Debug, Deserialize)]
struct SignatureValue {
    #[serde(default)]
    slot: u64,
    #[serde(default)]
    err: Option<serde_json::Value>,
}

/// WebSocket-based transaction confirmation service
pub struct WsConfirmationService {
    config: WsConfirmConfig,
    pending_tx: mpsc::Sender<PendingConfirmation>,
    shutdown_tx: broadcast::Sender<()>,
    is_connected: Arc<RwLock<bool>>,
}

impl WsConfirmationService {
    /// Create a new WebSocket confirmation service
    pub fn new(config: WsConfirmConfig) -> Self {
        let (pending_tx, pending_rx) = mpsc::channel(100);
        let (shutdown_tx, _) = broadcast::channel(1);
        let is_connected = Arc::new(RwLock::new(false));

        // Spawn the connection manager
        let service = Self {
            config: config.clone(),
            pending_tx,
            shutdown_tx: shutdown_tx.clone(),
            is_connected: is_connected.clone(),
        };

        let shutdown_rx = shutdown_tx.subscribe();
        tokio::spawn(Self::connection_manager(
            config,
            pending_rx,
            shutdown_rx,
            is_connected,
        ));

        service
    }

    /// Wait for transaction confirmation via WebSocket
    pub async fn await_confirmation(
        &self,
        signature: Signature,
    ) -> Result<ConfirmationResult, String> {
        let (response_tx, response_rx) = oneshot::channel();

        let pending = PendingConfirmation {
            signature,
            response_tx,
        };

        self.pending_tx
            .send(pending)
            .await
            .map_err(|_| "confirmation service unavailable".to_string())?;

        match timeout(self.config.confirmation_timeout, response_rx).await {
            Ok(Ok(result)) => Ok(result),
            Ok(Err(_)) => Ok(ConfirmationResult::Timeout),
            Err(_) => Ok(ConfirmationResult::Timeout),
        }
    }

    /// Check if the service is connected
    pub async fn is_connected(&self) -> bool {
        *self.is_connected.read().await
    }

    /// Shutdown the service
    pub fn shutdown(&self) {
        let _ = self.shutdown_tx.send(());
    }

    /// Async disconnect that waits for clean shutdown
    pub async fn disconnect(&self) {
        self.shutdown();
        // Give the connection manager time to clean up
        tokio::time::sleep(Duration::from_millis(100)).await;
    }

    /// Connection manager task
    async fn connection_manager(
        config: WsConfirmConfig,
        mut pending_rx: mpsc::Receiver<PendingConfirmation>,
        mut shutdown_rx: broadcast::Receiver<()>,
        is_connected: Arc<RwLock<bool>>,
    ) {
        let mut reconnect_attempts = 0;
        let mut subscription_id: u64 = 0;
        // Use HashMap for O(1) lookups instead of Vec with O(n) position searches
        // Key is initially our request_id, then updated to Solana's subscription_id
        // Value includes creation time for cleanup of orphaned subscriptions (CRIT-001)
        let mut pending_subscriptions: HashMap<
            u64,
            (Signature, oneshot::Sender<ConfirmationResult>, Instant),
        > = HashMap::new();
        // Buffer confirmation results that arrive before the subscription response
        // (i.e. signatureNotification arrives before we learn Solana's subscription id).
        let mut buffered_results: HashMap<u64, (ConfirmationResult, Instant)> = HashMap::new();
        let mut cleanup_timer = tokio::time::interval(SUBSCRIPTION_CLEANUP_INTERVAL);

        loop {
            // Try to connect
            let ws_stream = match Self::connect(&config).await {
                Ok(stream) => {
                    *is_connected.write().await = true;
                    reconnect_attempts = 0;
                    info!("WebSocket connected to {}", config.ws_url);
                    stream
                }
                Err(e) => {
                    *is_connected.write().await = false;
                    reconnect_attempts += 1;

                    if reconnect_attempts >= config.max_reconnect_attempts {
                        error!(
                            "Failed to connect after {} attempts: {}",
                            reconnect_attempts, e
                        );
                        // Fail all pending confirmations
                        for (_, (_, tx, _)) in pending_subscriptions.drain() {
                            let _ = tx.send(ConfirmationResult::Failed {
                                error: "connection failed".to_string(),
                            });
                        }
                        break;
                    }

                    let backoff = config.reconnect_backoff * reconnect_attempts;
                    warn!("Connection failed, retrying in {:?}: {}", backoff, e);
                    tokio::time::sleep(backoff).await;
                    continue;
                }
            };

            let (mut ws_write, mut ws_read) = ws_stream.split();

            // Re-subscribe pending confirmations after reconnect
            for (id, (sig, _, _)) in &pending_subscriptions {
                let subscribe_msg = Self::create_subscribe_message(*id, sig, &config.commitment);
                if let Ok(msg) = serde_json::to_string(&subscribe_msg) {
                    let _ = ws_write.send(Message::Text(msg)).await;
                }
            }

            // Track whether we need to close connection on break
            #[allow(unused_assignments)]
            let mut needs_close = false;

            loop {
                tokio::select! {
                    // Handle shutdown
                    _ = shutdown_rx.recv() => {
                        info!("WebSocket confirmation service shutting down");
                        // Explicitly close WebSocket to prevent resource leak
                        let _ = ws_write.close().await;
                        *is_connected.write().await = false;
                        return;
                    }

                    // CRIT-001: Periodic cleanup of orphaned subscriptions
                    // When the client-side timeout fires (in await_confirmation), the oneshot
                    // receiver is dropped but the sender remains in pending_subscriptions.
                    // Clean up entries where the oneshot channel is closed (receiver dropped).
                    _ = cleanup_timer.tick() => {
                        let timeout_duration = config.confirmation_timeout;
                        let now = Instant::now();
                        let orphaned_ids: Vec<u64> = pending_subscriptions
                            .iter()
                            .filter(|(_, (_, tx, created_at))| {
                                // Remove if: channel is closed OR entry has exceeded timeout
                                tx.is_closed() || now.duration_since(*created_at) > timeout_duration
                            })
                            .map(|(id, _)| *id)
                            .collect();

                        if !orphaned_ids.is_empty() {
                            debug!(
                                count = orphaned_ids.len(),
                                "Cleaning up orphaned WebSocket subscriptions"
                            );
                            for id in orphaned_ids {
                                pending_subscriptions.remove(&id);
                            }
                        }

                        let buffered_orphaned_ids: Vec<u64> = buffered_results
                            .iter()
                            .filter(|(_, (_, created_at))| now.duration_since(*created_at) > timeout_duration)
                            .map(|(id, _)| *id)
                            .collect();
                        for id in buffered_orphaned_ids {
                            buffered_results.remove(&id);
                        }
                    }

                    // Handle new confirmation requests
                    Some(pending) = pending_rx.recv() => {
                        subscription_id += 1;
                        let subscribe_msg = Self::create_subscribe_message(
                            subscription_id,
                            &pending.signature,
                            &config.commitment,
                        );

                        match serde_json::to_string(&subscribe_msg) {
                            Ok(msg) => {
                                // IMPORTANT: Add to pending list BEFORE sending to avoid
                                // race where server responds before we add the subscription
                                pending_subscriptions.insert(
                                    subscription_id,
                                    (pending.signature, pending.response_tx, Instant::now()),
                                );

                                if ws_write.send(Message::Text(msg)).await.is_err() {
                                    // Remove the subscription we just added and notify failure
                                    if let Some((_, tx, _)) = pending_subscriptions.remove(&subscription_id) {
                                        let _ = tx.send(ConfirmationResult::Failed {
                                            error: "websocket send failed".to_string(),
                                        });
                                    }
                                    needs_close = true;
                                    break; // Trigger reconnect
                                }
                            }
                            Err(e) => {
                                let _ = pending.response_tx.send(ConfirmationResult::Failed {
                                    error: format!("serialize failed: {}", e),
                                });
                            }
                        }
                    }

                    // Handle WebSocket messages
                    Some(msg) = ws_read.next() => {
                        match msg {
                            Ok(Message::Text(text)) => {
                                // ERR-001: Log parse failures instead of silently ignoring
                                match serde_json::from_str::<WsNotification>(&text) {
                                    Ok(notification) => {
                                        Self::handle_notification(
                                            notification,
                                            &mut pending_subscriptions,
                                            &mut buffered_results,
                                        );
                                    }
                                    Err(e) => {
                                        warn!(
                                            error = %e,
                                            text_preview = %text.chars().take(200).collect::<String>(),
                                            "failed to parse WebSocket notification"
                                        );
                                    }
                                }
                            }
                            Ok(Message::Ping(data)) => {
                                let _ = ws_write.send(Message::Pong(data)).await;
                            }
                            Ok(Message::Close(_)) => {
                                warn!("WebSocket closed by server");
                                *is_connected.write().await = false;
                                needs_close = true;
                                break; // Trigger reconnect
                            }
                            Err(e) => {
                                error!("WebSocket error: {}", e);
                                *is_connected.write().await = false;
                                needs_close = true;
                                break; // Trigger reconnect
                            }
                            _ => {}
                        }
                    }
                }
            }

            // Explicitly close WebSocket before reconnecting to prevent connection leak
            if needs_close {
                let _ = ws_write.close().await;
            }
        }
    }

    /// Connect to WebSocket endpoint with timeout
    async fn connect(
        config: &WsConfirmConfig,
    ) -> Result<
        tokio_tungstenite::WebSocketStream<
            tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
        >,
        String,
    > {
        // Use 10 seconds for connection timeout (separate from confirmation timeout)
        let connect_timeout = Duration::from_secs(10);

        let connect_result = timeout(connect_timeout, connect_async(&config.ws_url)).await;

        match connect_result {
            Ok(Ok((ws_stream, _))) => Ok(ws_stream),
            Ok(Err(e)) => Err(format!("WebSocket connection failed: {}", e)),
            Err(_) => Err(format!(
                "WebSocket connection timed out after {:?}",
                connect_timeout
            )),
        }
    }

    /// Create subscription message
    fn create_subscribe_message(
        id: u64,
        signature: &Signature,
        commitment: &str,
    ) -> SubscribeRequest {
        SubscribeRequest {
            jsonrpc: "2.0",
            id,
            method: "signatureSubscribe",
            params: vec![
                serde_json::Value::String(signature.to_string()),
                serde_json::json!({
                    "commitment": commitment,
                    "enableReceivedNotification": false
                }),
            ],
        }
    }

    /// Handle incoming notification
    fn handle_notification(
        notification: WsNotification,
        pending: &mut HashMap<u64, (Signature, oneshot::Sender<ConfirmationResult>, Instant)>,
        buffered_results: &mut HashMap<u64, (ConfirmationResult, Instant)>,
    ) {
        // Handle subscription confirmation response
        // Solana returns: { "id": our_request_id, "result": solana_subscription_id }
        // We need to update our record with Solana's subscription ID
        if let Some(request_id) = notification._id {
            if let Some(solana_sub_id) = notification.result {
                // Remove by our request ID and re-insert with Solana's subscription ID
                if let Some(entry) = pending.remove(&request_id) {
                    debug!(
                        "Subscription confirmed: request_id={} -> solana_sub_id={}",
                        request_id, solana_sub_id
                    );

                    // If we already received a buffered confirmation for this subscription id,
                    // deliver it immediately.
                    if let Some((result, _)) = buffered_results.remove(&solana_sub_id) {
                        let _ = entry.1.send(result);
                    } else {
                        pending.insert(solana_sub_id, entry);
                    }
                }
                return;
            }
            if let Some(error) = notification.error {
                // Remove the pending subscription by our request ID
                if let Some((_, tx, _)) = pending.remove(&request_id) {
                    let _ = tx.send(ConfirmationResult::Failed {
                        error: error.to_string(),
                    });
                }
                return;
            }
        }

        // Handle signature notification
        // Uses Solana's subscription ID which we stored when we got the confirmation
        if notification.method.as_deref() == Some("signatureNotification") {
            if let Some(params) = notification.params {
                if let Some(solana_sub_id) = params.subscription {
                    debug!(
                        "Got signatureNotification for subscription {}",
                        solana_sub_id
                    );
                    // Find and remove the pending confirmation by Solana's subscription ID
                    let result = if let Some(result) = params.result {
                        if result.err.is_some() {
                            ConfirmationResult::Failed {
                                error: "transaction failed".to_string(),
                            }
                        } else if let Some(value) = result.value {
                            if value.err.is_some() {
                                ConfirmationResult::Failed {
                                    error: "transaction execution failed".to_string(),
                                }
                            } else {
                                ConfirmationResult::Confirmed { slot: value.slot }
                            }
                        } else {
                            ConfirmationResult::Confirmed { slot: 0 }
                        }
                    } else {
                        ConfirmationResult::Confirmed { slot: 0 }
                    };

                    if let Some((sig, tx, _)) = pending.remove(&solana_sub_id) {
                        info!("Transaction confirmed via WebSocket: {}", sig);
                        let _ = tx.send(result);
                    } else {
                        // Out-of-order delivery: buffer until we receive the subscription response.
                        buffered_results.insert(solana_sub_id, (result, Instant::now()));
                    }
                }
            }
        }
    }
}

impl Drop for WsConfirmationService {
    fn drop(&mut self) {
        self.shutdown();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_from_rpc_url() {
        let config = WsConfirmConfig::from_rpc_url("https://api.mainnet-beta.solana.com");
        assert_eq!(config.ws_url, "wss://api.mainnet-beta.solana.com");

        let config = WsConfirmConfig::from_rpc_url("http://localhost:8899");
        assert_eq!(config.ws_url, "ws://localhost:8899");
    }

    #[test]
    fn test_subscribe_message() {
        let sig = Signature::default();
        let msg = WsConfirmationService::create_subscribe_message(1, &sig, "confirmed");
        assert_eq!(msg.method, "signatureSubscribe");
        assert_eq!(msg.id, 1);
    }

    #[tokio::test]
    async fn test_out_of_order_signature_notification_is_buffered() {
        let signature = Signature::default();
        let (tx, rx) = oneshot::channel();

        let mut pending: HashMap<u64, (Signature, oneshot::Sender<ConfirmationResult>, Instant)> =
            HashMap::new();
        let mut buffered: HashMap<u64, (ConfirmationResult, Instant)> = HashMap::new();

        // Pending entry is keyed by our request id.
        pending.insert(1, (signature, tx, Instant::now()));

        // First, a signatureNotification arrives for Solana subscription id 42.
        WsConfirmationService::handle_notification(
            WsNotification {
                _jsonrpc: "2.0".to_string(),
                _id: None,
                result: None,
                method: Some("signatureNotification".to_string()),
                params: Some(NotificationParams {
                    result: Some(SignatureNotification {
                        err: None,
                        value: Some(SignatureValue {
                            slot: 123,
                            err: None,
                        }),
                    }),
                    subscription: Some(42),
                }),
                error: None,
            },
            &mut pending,
            &mut buffered,
        );

        assert!(pending.contains_key(&1));
        assert!(buffered.contains_key(&42));

        // Then the subscription response arrives mapping request id -> solana subscription id.
        WsConfirmationService::handle_notification(
            WsNotification {
                _jsonrpc: "2.0".to_string(),
                _id: Some(1),
                result: Some(42),
                method: None,
                params: None,
                error: None,
            },
            &mut pending,
            &mut buffered,
        );

        assert!(pending.is_empty());
        assert!(buffered.is_empty());

        let result = rx.await.unwrap();
        match result {
            ConfirmationResult::Confirmed { slot } => assert_eq!(slot, 123),
            other => panic!("unexpected result: {other:?}"),
        }
    }
}
