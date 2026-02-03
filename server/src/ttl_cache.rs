use std::num::NonZeroUsize;
use std::time::{Duration, Instant};

use lru::LruCache;
use parking_lot::Mutex;

#[derive(Clone)]
struct CacheEntry<T> {
    value: T,
    expires_at: Instant,
}

impl<T: Clone> CacheEntry<T> {
    fn new(value: T, ttl: Duration) -> Self {
        Self {
            value,
            expires_at: Instant::now() + ttl,
        }
    }

    fn is_expired(&self) -> bool {
        Instant::now() >= self.expires_at
    }
}

/// Cache statistics.
#[derive(Debug, Clone)]
pub struct CacheStats {
    pub total: usize,
    pub active: usize,
    pub expired: usize,
}

/// Thread-safe TTL cache with LRU eviction (L-004).
///
/// Uses the `lru` crate for O(1) eviction instead of the previous
/// O(N log N) approach that sorted entries by expiration time.
///
/// The LRU eviction removes the least recently used entry when the
/// cache reaches capacity, providing better cache hit rates for
/// workloads with access locality.
pub(crate) struct TtlCache<T: Clone> {
    entries: Mutex<LruCache<String, CacheEntry<T>>>,
}

impl<T: Clone> TtlCache<T> {
    pub(crate) fn new(max_entries: usize) -> Self {
        let capacity = NonZeroUsize::new(max_entries.max(1)).expect("capacity > 0");
        Self {
            entries: Mutex::new(LruCache::new(capacity)),
        }
    }

    /// Get a value from the cache.
    ///
    /// Updates LRU order on successful hit (entry is promoted to front).
    /// Returns None if entry is expired or not found.
    pub(crate) fn get(&self, key: &str) -> Option<T> {
        let mut entries = self.entries.lock();

        // LruCache::get updates the LRU order
        let entry = entries.get(key)?;

        if entry.is_expired() {
            // Remove expired entry
            entries.pop(key);
            return None;
        }

        Some(entry.value.clone())
    }

    /// Insert a value into the cache with a TTL.
    ///
    /// If the cache is at capacity, the least recently used entry
    /// is automatically evicted by the underlying LruCache.
    pub(crate) fn set(&self, key: String, value: T, ttl: Duration) {
        let mut entries = self.entries.lock();
        let entry = CacheEntry::new(value, ttl);
        entries.put(key, entry);
    }

    /// Remove a specific entry from the cache.
    pub(crate) fn invalidate(&self, key: &str) {
        let mut entries = self.entries.lock();
        entries.pop(key);
    }

    /// Remove all entries with keys starting with the given prefix.
    pub(crate) fn invalidate_prefix(&self, prefix: &str) {
        let mut entries = self.entries.lock();

        // Collect keys to remove (can't remove while iterating)
        let keys_to_remove: Vec<String> = entries
            .iter()
            .filter(|(k, _)| k.starts_with(prefix))
            .map(|(k, _)| k.clone())
            .collect();

        for key in keys_to_remove {
            entries.pop(&key);
        }
    }

    /// Clear all entries from the cache.
    pub(crate) fn clear(&self) {
        let mut entries = self.entries.lock();
        entries.clear();
    }

    /// Get cache statistics.
    ///
    /// Note: Expired entries are counted in `total` but excluded from `active`.
    /// Unlike the previous implementation, we don't eagerly purge all expired
    /// entries during stats collection - they're removed on next access or eviction.
    pub(crate) fn stats(&self) -> CacheStats {
        let entries = self.entries.lock();
        let total = entries.len();
        let expired = entries.iter().filter(|(_, e)| e.is_expired()).count();

        CacheStats {
            total,
            active: total - expired,
            expired,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_entry_expiry() {
        let entry = CacheEntry::new("test".to_string(), Duration::from_millis(10));
        assert!(!entry.is_expired());

        std::thread::sleep(Duration::from_millis(20));
        assert!(entry.is_expired());
    }

    #[test]
    fn test_cache_get_set_and_invalidate() {
        let cache: TtlCache<String> = TtlCache::new(100);
        cache.set(
            "key1".to_string(),
            "value1".to_string(),
            Duration::from_secs(60),
        );
        assert_eq!(cache.get("key1"), Some("value1".to_string()));
        assert_eq!(cache.get("key2"), None);

        cache.invalidate("key1");
        assert_eq!(cache.get("key1"), None);
    }

    #[test]
    fn test_cache_evicts_expired_on_get() {
        let cache: TtlCache<String> = TtlCache::new(100);
        cache.set(
            "key1".to_string(),
            "value1".to_string(),
            Duration::from_millis(10),
        );
        std::thread::sleep(Duration::from_millis(25));
        assert_eq!(cache.get("key1"), None);
        assert_eq!(cache.stats().total, 0);
    }

    #[test]
    fn test_cache_invalidate_prefix() {
        let cache: TtlCache<String> = TtlCache::new(100);
        cache.set("a:1".to_string(), "v".to_string(), Duration::from_secs(60));
        cache.set("a:2".to_string(), "v".to_string(), Duration::from_secs(60));
        cache.set("b:1".to_string(), "v".to_string(), Duration::from_secs(60));

        cache.invalidate_prefix("a:");
        assert_eq!(cache.get("a:1"), None);
        assert_eq!(cache.get("a:2"), None);
        assert_eq!(cache.get("b:1"), Some("v".to_string()));
    }

    #[test]
    fn test_cache_lru_eviction() {
        // Small cache to test LRU eviction
        let cache: TtlCache<String> = TtlCache::new(2);

        cache.set("a".to_string(), "A".to_string(), Duration::from_secs(60));
        cache.set("b".to_string(), "B".to_string(), Duration::from_secs(60));

        // Access 'a' to make it more recently used
        assert_eq!(cache.get("a"), Some("A".to_string()));

        // Add 'c' - should evict 'b' (least recently used)
        cache.set("c".to_string(), "C".to_string(), Duration::from_secs(60));

        assert_eq!(cache.get("a"), Some("A".to_string())); // Still there
        assert_eq!(cache.get("b"), None); // Evicted
        assert_eq!(cache.get("c"), Some("C".to_string())); // New entry

        // Verify stats
        let stats = cache.stats();
        assert_eq!(stats.total, 2);
        assert_eq!(stats.active, 2);
    }

    #[test]
    fn test_cache_lru_order_updated_on_get() {
        let cache: TtlCache<String> = TtlCache::new(2);

        cache.set("a".to_string(), "A".to_string(), Duration::from_secs(60));
        cache.set("b".to_string(), "B".to_string(), Duration::from_secs(60));

        // Access 'a' to promote it
        cache.get("a");

        // Add 'c' - 'b' should be evicted (now LRU)
        cache.set("c".to_string(), "C".to_string(), Duration::from_secs(60));

        assert_eq!(cache.get("a"), Some("A".to_string()));
        assert_eq!(cache.get("b"), None);
        assert_eq!(cache.get("c"), Some("C".to_string()));
    }
}
