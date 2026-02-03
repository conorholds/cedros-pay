//! Blockhash cache for reducing RPC load.
//!
//! Caches the recent blockhash from Solana RPC for a configurable TTL
//! (default 1 second) to reduce load during high-traffic scenarios.
//! Matches Go server's `internal/httpserver/rpc_proxy.go` behavior.

use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::hash::Hash;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{Notify, RwLock};
use tokio::time::timeout;

/// RPC call timeout for blockhash fetch (M-007 fix)
/// Prevents indefinite hanging if RPC endpoint is unresponsive
const BLOCKHASH_RPC_TIMEOUT: Duration = Duration::from_secs(10);

/// Cached blockhash entry
struct CachedBlockhash {
    blockhash: Hash,
    last_valid_block_height: u64,
    cached_at: Instant,
}

/// Blockhash cache service
///
/// Caches the recent blockhash to reduce RPC calls. The Go server caches
/// blockhash for 1 second which significantly reduces load for high-traffic
/// scenarios where many transactions are built in quick succession.
///
/// Uses single-flight pattern to prevent thundering herd while minimizing
/// lock contention during RPC fetch.
pub struct BlockhashCache {
    rpc_client: Arc<RpcClient>,
    cache: RwLock<Option<CachedBlockhash>>,
    ttl: Duration,
    /// Flag indicating a fetch is in progress (single-flight pattern)
    fetching: AtomicBool,
    /// Notification for waiters when fetch completes
    fetch_complete: Notify,

    // Test-only hooks to deterministically exercise cancellation paths.
    #[cfg(test)]
    fetch_started: Option<Arc<Notify>>,
    #[cfg(test)]
    fetch_block: Option<Arc<Notify>>,
}

/// Blockhash response
#[derive(Debug, Clone)]
pub struct BlockhashResponse {
    pub blockhash: String,
    pub last_valid_block_height: u64,
    pub cached: bool,
}

impl BlockhashCache {
    /// Create a new blockhash cache with the given RPC client and TTL.
    pub fn new(rpc_client: Arc<RpcClient>, ttl: Duration) -> Self {
        Self {
            rpc_client,
            cache: RwLock::new(None),
            ttl,
            fetching: AtomicBool::new(false),
            fetch_complete: Notify::new(),

            #[cfg(test)]
            fetch_started: None,
            #[cfg(test)]
            fetch_block: None,
        }
    }

    /// Create a new blockhash cache with default TTL (1 second).
    ///
    /// Per Go server behavior: blockhash is cached for 1 second to reduce
    /// RPC load during high-traffic scenarios.
    pub fn with_default_ttl(rpc_client: Arc<RpcClient>) -> Self {
        Self::new(rpc_client, Duration::from_secs(1))
    }

    /// Create a new blockhash cache from an RPC URL with default TTL.
    ///
    /// Convenience method that creates an RpcClient from the URL.
    pub fn from_url(rpc_url: &str) -> Result<Self, BlockhashCacheError> {
        if rpc_url.is_empty() {
            return Err(BlockhashCacheError::RpcError(
                "RPC URL is empty".to_string(),
            ));
        }
        let rpc_client = Arc::new(RpcClient::new(rpc_url.to_string()));
        Ok(Self::with_default_ttl(rpc_client))
    }

    /// Get the cached blockhash, or fetch a new one if expired.
    ///
    /// Uses single-flight pattern to prevent thundering herd:
    /// 1. Fast path: read lock check for valid cache
    /// 2. If expired, try to become the fetcher (atomic compare-exchange)
    /// 3. If we're the fetcher, do RPC call and update cache
    /// 4. If another thread is fetching, wait for completion notification
    pub async fn get_blockhash(&self) -> Result<BlockhashResponse, BlockhashCacheError> {
        // Fast path: try to return cached value with read lock
        {
            let cache = self.cache.read().await;
            if let Some(ref entry) = *cache {
                if entry.cached_at.elapsed() < self.ttl {
                    return Ok(BlockhashResponse {
                        blockhash: entry.blockhash.to_string(),
                        last_valid_block_height: entry.last_valid_block_height,
                        cached: true,
                    });
                }
            }
        }

        // Cache miss or expired - try to become the fetcher
        // Use compare_exchange to atomically check and set the fetching flag
        let was_fetching = self
            .fetching
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err();

        if was_fetching {
            // Another thread is fetching - wait for completion (with timeout)
            let wait_timeout = self.ttl + Duration::from_millis(200);
            if tokio::time::timeout(wait_timeout, self.fetch_complete.notified())
                .await
                .is_err()
            {
                // Timeout waiting for fetch - try to return stale cache
                let cache = self.cache.read().await;
                if let Some(ref entry) = *cache {
                    return Ok(BlockhashResponse {
                        blockhash: entry.blockhash.to_string(),
                        last_valid_block_height: entry.last_valid_block_height,
                        cached: true, // stale but valid
                    });
                }
            }

            // Check cache again after being notified
            let cache = self.cache.read().await;
            if let Some(ref entry) = *cache {
                if entry.cached_at.elapsed() < self.ttl {
                    return Ok(BlockhashResponse {
                        blockhash: entry.blockhash.to_string(),
                        last_valid_block_height: entry.last_valid_block_height,
                        cached: true,
                    });
                }
            }
            // Still no valid cache - fall through to fetch ourselves
            // (the previous fetcher may have failed)
            if self
                .fetching
                .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
                .is_err()
            {
                // Someone else grabbed the fetch lock, wait again briefly
                tokio::time::sleep(Duration::from_millis(50)).await;
                let cache = self.cache.read().await;
                if let Some(ref entry) = *cache {
                    return Ok(BlockhashResponse {
                        blockhash: entry.blockhash.to_string(),
                        last_valid_block_height: entry.last_valid_block_height,
                        cached: true,
                    });
                }
                return Err(BlockhashCacheError::RpcError(
                    "failed to acquire fetch lock".to_string(),
                ));
            }
        }

        // From here on, we are the fetcher. Ensure that we always release the fetch lock and
        // notify waiters even if this task is cancelled while awaiting the RPC call.
        struct FetchGuard<'a> {
            cache: &'a BlockhashCache,
        }

        impl Drop for FetchGuard<'_> {
            fn drop(&mut self) {
                self.cache.fetching.store(false, Ordering::SeqCst);
                self.cache.fetch_complete.notify_waiters();
            }
        }

        let _guard = FetchGuard { cache: self };

        #[cfg(test)]
        if let Some(ref started) = self.fetch_started {
            started.notify_waiters();
        }

        #[cfg(test)]
        if let Some(ref block) = self.fetch_block {
            block.notified().await;
        }

        // We're the fetcher - do the RPC call WITHOUT holding a lock
        // SECURITY: Wrap with timeout to prevent indefinite hanging (M-007 fix)
        let result = timeout(
            BLOCKHASH_RPC_TIMEOUT,
            self.rpc_client
                .get_latest_blockhash_with_commitment(self.rpc_client.commitment()),
        )
        .await;

        // Update cache with brief write lock
        let response = match result {
            Ok(Ok((blockhash, last_valid_block_height))) => {
                let mut cache = self.cache.write().await;
                *cache = Some(CachedBlockhash {
                    blockhash,
                    last_valid_block_height,
                    cached_at: Instant::now(),
                });
                Ok(BlockhashResponse {
                    blockhash: blockhash.to_string(),
                    last_valid_block_height,
                    cached: false,
                })
            }
            Ok(Err(e)) => Err(BlockhashCacheError::RpcError(e.to_string())),
            Err(_) => Err(BlockhashCacheError::RpcError(
                "blockhash fetch timeout after 10s".to_string(),
            )),
        };

        response
    }

    /// Invalidate the cache (force next call to fetch from RPC).
    pub async fn invalidate(&self) {
        let mut cache = self.cache.write().await;
        *cache = None;
    }

    /// Get cache TTL
    pub fn ttl(&self) -> Duration {
        self.ttl
    }

    /// Check if cache is currently valid
    pub async fn is_cached(&self) -> bool {
        let cache = self.cache.read().await;
        cache
            .as_ref()
            .map(|e| e.cached_at.elapsed() < self.ttl)
            .unwrap_or(false)
    }
}

/// Error types for blockhash cache operations
#[derive(Debug, thiserror::Error)]
pub enum BlockhashCacheError {
    #[error("RPC error: {0}")]
    RpcError(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_ttl() {
        // Can't easily test without mocking RPC, but verify TTL default
        let cache = BlockhashCache::new(
            Arc::new(RpcClient::new_mock("http://localhost:8899".to_string())),
            Duration::from_secs(1),
        );
        assert_eq!(cache.ttl(), Duration::from_secs(1));
    }

    #[tokio::test]
    async fn test_waiter_uses_fetch_completion() {
        let cache = Arc::new(BlockhashCache::new(
            Arc::new(RpcClient::new_mock("http://localhost:8899".to_string())),
            Duration::from_secs(1),
        ));

        cache.fetching.store(true, Ordering::SeqCst);
        let cache_clone = cache.clone();

        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(300)).await;
            let mut guard = cache_clone.cache.write().await;
            *guard = Some(CachedBlockhash {
                blockhash: Hash::new_unique(),
                last_valid_block_height: 123,
                cached_at: Instant::now(),
            });
            cache_clone.fetching.store(false, Ordering::SeqCst);
            cache_clone.fetch_complete.notify_waiters();
        });

        let start = Instant::now();
        let response = cache.get_blockhash().await.expect("blockhash");
        assert!(start.elapsed() >= Duration::from_millis(250));
        assert!(response.cached);
        assert_eq!(response.last_valid_block_height, 123);
    }

    #[tokio::test]
    async fn test_fetcher_cancellation_releases_lock() {
        let mut cache = BlockhashCache::new(
            Arc::new(RpcClient::new_mock("http://localhost:8899".to_string())),
            Duration::from_secs(1),
        );

        let started = Arc::new(Notify::new());
        let block = Arc::new(Notify::new());
        cache.fetch_started = Some(started.clone());
        cache.fetch_block = Some(block.clone());

        let cache = Arc::new(cache);
        let cache_clone = cache.clone();
        let handle = tokio::spawn(async move {
            let _ = cache_clone.get_blockhash().await;
        });

        // Wait until the fetcher has acquired the fetch lock.
        started.notified().await;
        assert!(cache.fetching.load(Ordering::SeqCst));

        // Abort the fetcher while it's blocked; Drop must clear the fetch lock.
        handle.abort();
        let _ = handle.await;

        // Allow a tick for the abort to propagate and Drop to run.
        tokio::task::yield_now().await;
        assert!(!cache.fetching.load(Ordering::SeqCst));
    }
}
