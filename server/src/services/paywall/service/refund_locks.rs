// ============================================================================
// RefundLockManager - prevents race conditions in cumulative refund validation
// ============================================================================

/// Entry in the refund lock manager with TTL tracking (BUG-004 fix)
struct RefundLockEntry {
    lock: Arc<tokio::sync::Mutex<()>>,
    last_used: Instant,
}

/// Per-purchase lock manager to prevent race conditions when calculating
/// cumulative refund amounts. Without this, concurrent refund requests could
/// both read the same "total refunded" amount and both succeed, exceeding limits.
///
/// BUG-004 fix: Includes TTL-based eviction to prevent unbounded memory growth.
struct RefundLockManager {
    /// Maps purchase signature to a mutex with timestamp. We use tokio::sync::Mutex
    /// since the critical section spans async operations (read + validate + store).
    locks: Mutex<HashMap<String, RefundLockEntry>>,
}

impl Default for RefundLockManager {
    fn default() -> Self {
        Self {
            locks: Mutex::new(HashMap::new()),
        }
    }
}

/// TTL for refund locks - entries older than this are evicted (1 hour)
const REFUND_LOCK_TTL_SECS: u64 = 3600;
/// Maximum entries before triggering cleanup
const REFUND_LOCK_MAX_ENTRIES: usize = 10000;

impl RefundLockManager {
    fn new() -> Self {
        Self::default()
    }

    /// Get or create a lock for the given purchase signature.
    /// Triggers cleanup if we have too many entries.
    fn get_lock(&self, purchase_sig: &str) -> Arc<tokio::sync::Mutex<()>> {
        let mut locks = self.locks.lock();

        // BUG-004: Evict old entries if we exceed threshold
        if locks.len() >= REFUND_LOCK_MAX_ENTRIES {
            self.cleanup_expired(&mut locks);
        }

        let now = Instant::now();
        let entry = locks
            .entry(purchase_sig.to_string())
            .or_insert_with(|| RefundLockEntry {
                lock: Arc::new(tokio::sync::Mutex::new(())),
                last_used: now,
            });
        entry.last_used = now;
        entry.lock.clone()
    }

    /// Remove entries older than TTL
    fn cleanup_expired(&self, locks: &mut HashMap<String, RefundLockEntry>) {
        let ttl = std::time::Duration::from_secs(REFUND_LOCK_TTL_SECS);
        let before = locks.len();
        locks.retain(|_, entry| entry.last_used.elapsed() < ttl);
        let removed = before - locks.len();
        if removed > 0 {
            tracing::debug!(
                removed,
                remaining = locks.len(),
                "evicted expired refund locks"
            );
        }
    }
}
