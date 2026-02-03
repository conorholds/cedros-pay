use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use parking_lot::Mutex;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::signature::Signature;
use solana_sdk::transaction::VersionedTransaction;
use tokio::sync::{mpsc, oneshot, Semaphore};
use tokio::time::timeout;

use crate::constants::{
    MAX_TX_RETRIES, RATE_LIMIT_BACKOFF_MULTIPLIER, RATE_LIMIT_INITIAL_BACKOFF, TX_CONFIRM_TIMEOUT,
    TX_TIMEOUT,
};

use super::utils::is_rate_limit_error;

#[derive(Debug)]
enum SendAttemptError {
    Timeout,
    Failed(String),
}

fn queue_capacity(max_in_flight: usize) -> usize {
    // Bound buffering to avoid large in-memory tx backlogs.
    // Keep it proportional to concurrency to preserve throughput under normal load.
    (max_in_flight.max(1) * 10).clamp(10, 1000)
}

async fn send_transaction_with_timeout<T, E, F>(
    dur: Duration,
    fut: F,
) -> Result<T, SendAttemptError>
where
    F: std::future::Future<Output = Result<T, E>>,
    E: std::fmt::Display,
{
    match timeout(dur, fut).await {
        Ok(Ok(value)) => Ok(value),
        Ok(Err(e)) => Err(SendAttemptError::Failed(e.to_string())),
        Err(_) => Err(SendAttemptError::Timeout),
    }
}

#[derive(Debug)]
pub struct TxRequest {
    pub tx: VersionedTransaction,
    pub response: oneshot::Sender<Result<Signature, TxQueueError>>,
    pub created_at: Instant,
}

#[derive(Debug, Clone)]
pub enum TxQueueError {
    Timeout,
    SendFailed(String),
    RateLimited,
    Closed,
}

impl std::fmt::Display for TxQueueError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TxQueueError::Timeout => write!(f, "transaction timeout"),
            TxQueueError::SendFailed(e) => write!(f, "send failed: {}", e),
            TxQueueError::RateLimited => write!(f, "rate limited"),
            TxQueueError::Closed => write!(f, "queue closed"),
        }
    }
}

impl std::error::Error for TxQueueError {}

/// RAII guard to decrement in_flight counter on drop (handles panics)
/// Uses constructor to atomically increment, ensuring no TOCTOU gap
struct InFlightGuard(Arc<TransactionQueue>);

impl InFlightGuard {
    /// Create guard and atomically increment in_flight counter
    /// This ensures increment and guard creation happen together with no gap
    fn new(queue: Arc<TransactionQueue>) -> Self {
        queue.in_flight.fetch_add(1, Ordering::Relaxed);
        InFlightGuard(queue)
    }
}

impl Drop for InFlightGuard {
    fn drop(&mut self) {
        self.0.in_flight.fetch_sub(1, Ordering::Relaxed);
    }
}

/// Transaction queue for rate-limiting and ordering outbound transactions
pub struct TransactionQueue {
    rpc_client: Arc<RpcClient>,
    sender: mpsc::Sender<TxRequest>,
    in_flight: AtomicUsize,
    max_in_flight: usize,
    min_time_between: Duration,
    last_send: Mutex<Instant>,
    total_sent: AtomicU64,
    total_failed: AtomicU64,
    shutdown_flag: std::sync::atomic::AtomicBool,
}

impl TransactionQueue {
    /// Create a new transaction queue and start the background worker
    pub fn new(
        rpc_client: Arc<RpcClient>,
        min_time_between: Duration,
        max_in_flight: usize,
    ) -> Arc<Self> {
        let (sender, receiver) = mpsc::channel(queue_capacity(max_in_flight));

        let queue = Arc::new(Self {
            rpc_client,
            sender,
            in_flight: AtomicUsize::new(0),
            max_in_flight,
            min_time_between,
            last_send: Mutex::new(Instant::now() - min_time_between),
            total_sent: AtomicU64::new(0),
            total_failed: AtomicU64::new(0),
            shutdown_flag: std::sync::atomic::AtomicBool::new(false),
        });

        // Start the background worker
        queue.clone().start_worker(receiver);

        queue
    }

    /// Shutdown the queue, rejecting any new submissions
    pub async fn shutdown(&self) {
        self.shutdown_flag.store(true, Ordering::SeqCst);
        // Give in-flight requests a moment to complete
        let mut wait_attempts = 0;
        while self.in_flight.load(Ordering::Relaxed) > 0 && wait_attempts < 50 {
            tokio::time::sleep(Duration::from_millis(100)).await;
            wait_attempts += 1;
        }
    }

    /// Check if queue is shutting down
    pub fn is_shutting_down(&self) -> bool {
        self.shutdown_flag.load(Ordering::SeqCst)
    }

    /// Start the queue worker
    pub fn start_worker(self: Arc<Self>, mut receiver: mpsc::Receiver<TxRequest>) {
        let queue = self.clone();

        tokio::spawn(async move {
            let semaphore = Arc::new(Semaphore::new(queue.max_in_flight));

            while let Some(req) = receiver.recv().await {
                // Check if request has already timed out
                if req.created_at.elapsed() > TX_TIMEOUT {
                    let _ = req.response.send(Err(TxQueueError::Timeout));
                    continue;
                }

                // Acquire semaphore permit
                let _permit = match semaphore.clone().acquire_owned().await {
                    Ok(permit) => permit,
                    Err(_) => {
                        let _ = req.response.send(Err(TxQueueError::Closed));
                        continue;
                    }
                };

                // Wait for min_time_between - atomically reserve time slot
                let wait_time = queue.reserve_send_delay();
                if !wait_time.is_zero() {
                    tokio::time::sleep(wait_time).await;
                }

                // RAII guard atomically increments in_flight and ensures decrement on drop
                // Using constructor prevents TOCTOU gap between increment and guard creation
                let _in_flight_guard = InFlightGuard::new(queue.clone());

                // Send transaction with retries
                let rpc = queue.rpc_client.clone();
                let tx = req.tx;
                let response = req.response;
                let queue_clone = queue.clone();

                tokio::spawn(async move {
                    // Move guard into spawned task - will decrement on drop (including panic)
                    let _guard = _in_flight_guard;

                    let result = send_with_retry(&rpc, &tx).await;

                    match &result {
                        Ok(sig) => {
                            queue_clone.total_sent.fetch_add(1, Ordering::Relaxed);
                            tracing::debug!(signature = %sig, "Transaction sent successfully");
                        }
                        Err(e) => {
                            queue_clone.total_failed.fetch_add(1, Ordering::Relaxed);
                            tracing::warn!(error = %e, "Transaction send failed");
                        }
                    };

                    // Log if receiver dropped (e.g., due to timeout on caller side)
                    if response.send(result).is_err() {
                        tracing::warn!(
                            "Transaction result channel closed - caller likely timed out"
                        );
                    }
                    drop(_permit);
                    // _guard drops here, decrementing in_flight counter
                });
            }
        });
    }

    /// Submit transaction to queue
    pub async fn submit(&self, tx: VersionedTransaction) -> Result<Signature, TxQueueError> {
        if self.is_shutting_down() {
            return Err(TxQueueError::Closed);
        }

        let (response_tx, response_rx) = oneshot::channel();

        let req = TxRequest {
            tx,
            response: response_tx,
            created_at: Instant::now(),
        };

        self.sender
            .send(req)
            .await
            .map_err(|_| TxQueueError::Closed)?;

        match timeout(TX_CONFIRM_TIMEOUT, response_rx).await {
            Ok(Ok(result)) => result,
            Ok(Err(_)) => Err(TxQueueError::Closed),
            Err(_) => Err(TxQueueError::Timeout),
        }
    }

    /// Get current in-flight count
    pub fn in_flight_count(&self) -> usize {
        self.in_flight.load(Ordering::Relaxed)
    }

    /// Get total sent count
    pub fn total_sent(&self) -> u64 {
        self.total_sent.load(Ordering::Relaxed)
    }

    /// Get total failed count
    pub fn total_failed(&self) -> u64 {
        self.total_failed.load(Ordering::Relaxed)
    }

    fn reserve_send_delay(&self) -> Duration {
        let mut next_send_at = self.last_send.lock();
        let now = Instant::now();
        let wait = if *next_send_at > now {
            *next_send_at - now
        } else {
            Duration::ZERO
        };
        // Reserve next slot before releasing lock to prevent races.
        *next_send_at = now + wait + self.min_time_between;
        wait
    }
}

/// Send transaction with exponential backoff retry
async fn send_with_retry(
    rpc: &RpcClient,
    tx: &VersionedTransaction,
) -> Result<Signature, TxQueueError> {
    let mut retries = 0;
    let mut backoff = RATE_LIMIT_INITIAL_BACKOFF;

    loop {
        match send_transaction_with_timeout(TX_TIMEOUT, rpc.send_transaction(tx)).await {
            Ok(sig) => return Ok(sig),
            Err(SendAttemptError::Timeout) => return Err(TxQueueError::Timeout),
            Err(SendAttemptError::Failed(err)) => {
                let err_str = err.to_lowercase();

                // Rate limited - retry with backoff
                if is_rate_limit_error(&err_str) && retries < MAX_TX_RETRIES {
                    retries += 1;
                    tokio::time::sleep(backoff).await;
                    backoff = Duration::from_secs_f64(
                        backoff.as_secs_f64() * RATE_LIMIT_BACKOFF_MULTIPLIER,
                    )
                    .min(Duration::from_secs(2));
                    continue;
                }

                // Already processed is success
                if is_already_processed(&err_str) {
                    // Extract signature from transaction
                    if let Some(sig) = tx.signatures.first() {
                        return Ok(*sig);
                    }
                }

                return Err(TxQueueError::SendFailed(err));
            }
        }
    }
}

// DEAD-003: is_rate_limit_error moved to super::utils for consolidation

fn is_already_processed(err: &str) -> bool {
    err.contains("alreadyprocessed") || err.contains("already been processed")
}

impl std::fmt::Debug for TransactionQueue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("TransactionQueue")
            .field("in_flight", &self.in_flight.load(Ordering::Relaxed))
            .field("max_in_flight", &self.max_in_flight)
            .field("min_time_between", &self.min_time_between)
            .field("total_sent", &self.total_sent.load(Ordering::Relaxed))
            .field("total_failed", &self.total_failed.load(Ordering::Relaxed))
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use solana_sdk::message::Message;
    use solana_sdk::transaction::Transaction;

    #[tokio::test]
    async fn test_submit_rejected_during_shutdown() {
        let rpc = Arc::new(RpcClient::new_mock("http://localhost:8899".to_string()));
        let queue = TransactionQueue::new(rpc, Duration::ZERO, 1);
        queue.shutdown().await;

        let message = Message::new(&[], None);
        let tx = Transaction::new_unsigned(message);
        let versioned = VersionedTransaction::from(tx);

        let result = queue.submit(versioned).await;
        assert!(matches!(result, Err(TxQueueError::Closed)));
    }

    #[tokio::test]
    async fn test_reserve_send_delay_handles_future_instant() {
        let rpc = Arc::new(RpcClient::new_mock("http://localhost:8899".to_string()));
        let queue = TransactionQueue::new(rpc, Duration::from_millis(50), 1);

        let first = queue.reserve_send_delay();
        let second = queue.reserve_send_delay();

        assert!(first.is_zero());
        assert!(second <= Duration::from_millis(50));
    }

    #[tokio::test]
    async fn test_send_transaction_with_timeout_times_out() {
        let result = send_transaction_with_timeout(
            Duration::from_millis(5),
            std::future::pending::<Result<Signature, &'static str>>(),
        )
        .await;

        assert!(matches!(result, Err(SendAttemptError::Timeout)));
    }

    #[test]
    fn test_queue_capacity_scales_with_max_in_flight() {
        assert_eq!(queue_capacity(0), 10);
        assert_eq!(queue_capacity(1), 10);
        assert_eq!(queue_capacity(5), 50);
        assert_eq!(queue_capacity(200), 1000);
    }
}
