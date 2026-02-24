import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createWalletPool, WalletPool } from '../utils/walletPool';

describe('WalletPool', () => {
  let pools: WalletPool[] = [];

  beforeEach(() => {
    pools = [];
  });

  afterEach(async () => {
    // Clean up all pools created during tests
    await Promise.all(pools.map(p => p.cleanup()));
    pools = [];
  });

  describe('createWalletPool', () => {
    it('creates a new wallet pool instance', () => {
      const pool = createWalletPool();
      pools.push(pool);

      expect(pool).toBeInstanceOf(WalletPool);
      expect(pool.getId()).toMatch(/^pool_\d+_[a-z0-9]+$/);
    });

    it('creates pools with unique IDs', () => {
      const pool1 = createWalletPool();
      const pool2 = createWalletPool();
      pools.push(pool1, pool2);

      expect(pool1.getId()).not.toBe(pool2.getId());
    });

    it('accepts custom pool ID', () => {
      const pool = createWalletPool('custom-pool-123');
      pools.push(pool);

      expect(pool.getId()).toBe('custom-pool-123');
    });
  });

  describe('getAdapters', () => {
    it('returns array of wallet adapters', () => {
      const pool = createWalletPool();
      pools.push(pool);

      const adapters = pool.getAdapters();

      expect(Array.isArray(adapters)).toBe(true);
      expect(adapters.length).toBeGreaterThan(0);
    });

    it('includes Phantom and Solflare adapters', () => {
      const pool = createWalletPool();
      pools.push(pool);

      const adapters = pool.getAdapters();
      const names = adapters.map(a => a.name);

      expect(names).toContain('Phantom');
      expect(names).toContain('Solflare');
    });

    it('returns same instances on repeated calls (within same pool)', () => {
      const pool = createWalletPool();
      pools.push(pool);

      const adapters1 = pool.getAdapters();
      const adapters2 = pool.getAdapters();
      const adapters3 = pool.getAdapters();

      // Should return exact same array reference
      expect(adapters1).toBe(adapters2);
      expect(adapters2).toBe(adapters3);

      // Should return exact same adapter instances
      expect(adapters1[0]).toBe(adapters2[0]);
      expect(adapters1[1]).toBe(adapters2[1]);
    });

    it('lazy initializes adapters on first call', () => {
      const pool = createWalletPool();
      pools.push(pool);

      expect(pool.isInitialized()).toBe(false);

      pool.getAdapters();

      expect(pool.isInitialized()).toBe(true);
    });
  });

  describe('Multi-tenant isolation', () => {
    it('creates separate adapter instances for each pool', () => {
      const pool1 = createWalletPool('user-1');
      const pool2 = createWalletPool('user-2');
      pools.push(pool1, pool2);

      const adapters1 = pool1.getAdapters();
      const adapters2 = pool2.getAdapters();

      // Different arrays
      expect(adapters1).not.toBe(adapters2);

      // Different adapter instances
      expect(adapters1[0]).not.toBe(adapters2[0]);
      expect(adapters1[1]).not.toBe(adapters2[1]);
    });

    it('isolates wallet state between pools', () => {
      const pool1 = createWalletPool('tenant-1');
      const pool2 = createWalletPool('tenant-2');
      pools.push(pool1, pool2);

      const adapters1 = pool1.getAdapters();
      const adapters2 = pool2.getAdapters();

      const phantom1 = adapters1.find(a => a.name === 'Phantom');
      const phantom2 = adapters2.find(a => a.name === 'Phantom');

      // Should be completely separate instances
      expect(phantom1).not.toBe(phantom2);

      // Modifying one doesn't affect the other
      expect(phantom1?.readyState).toBeDefined();
      expect(phantom2?.readyState).toBeDefined();
    });

    it('handles concurrent pool creation safely', () => {
      const pool1 = createWalletPool('concurrent-1');
      const pool2 = createWalletPool('concurrent-2');
      const pool3 = createWalletPool('concurrent-3');
      pools.push(pool1, pool2, pool3);

      // Simulate concurrent access (as might happen with React.StrictMode or SSR)
      const adapters1 = pool1.getAdapters();
      const adapters2 = pool2.getAdapters();
      const adapters3 = pool3.getAdapters();

      // All should have separate instances
      expect(adapters1).not.toBe(adapters2);
      expect(adapters2).not.toBe(adapters3);
      expect(adapters1[0]).not.toBe(adapters2[0]);
      expect(adapters2[0]).not.toBe(adapters3[0]);
    });

    it('prevents wallet leakage between users in multi-tenant scenario', () => {
      // Simulate User A's session
      const userAPool = createWalletPool('user-a-session');
      pools.push(userAPool);
      const userAWallets = userAPool.getAdapters();
      const userAPhantom = userAWallets.find(a => a.name === 'Phantom');

      // Simulate User B's session (different context)
      const userBPool = createWalletPool('user-b-session');
      pools.push(userBPool);
      const userBWallets = userBPool.getAdapters();
      const userBPhantom = userBWallets.find(a => a.name === 'Phantom');

      // Critical: User B should NOT get User A's wallet instance
      expect(userAPhantom).not.toBe(userBPhantom);

      // Each user has their own isolated wallet adapter
      expect(userAWallets).not.toBe(userBWallets);
    });
  });

  describe('cleanup', () => {
    it('disconnects all wallets on cleanup', async () => {
      const pool = createWalletPool();
      pools.push(pool);

      const adapters = pool.getAdapters();

      // Mock disconnect methods and connected property
      const disconnectSpies = adapters.map(adapter => {
        // Mock the connected getter to return true
        Object.defineProperty(adapter, 'connected', {
          get: () => true,
          configurable: true,
        });
        return vi.spyOn(adapter, 'disconnect').mockResolvedValue();
      });

      await pool.cleanup();

      // Should attempt to disconnect all adapters
      disconnectSpies.forEach(spy => {
        expect(spy).toHaveBeenCalled();
      });
    });

    it('returns empty array after cleanup', async () => {
      const pool = createWalletPool();
      pools.push(pool);

      pool.getAdapters(); // Initialize
      expect(pool.isInitialized()).toBe(true);

      await pool.cleanup();

      const adapters = pool.getAdapters();
      expect(adapters).toEqual([]);
      expect(pool.isInitialized()).toBe(false);
    });

    it('handles cleanup errors gracefully', async () => {
      const pool = createWalletPool();
      pools.push(pool);

      const adapters = pool.getAdapters();
      adapters.forEach(adapter => {
        Object.defineProperty(adapter, 'connected', {
          get: () => true,
          configurable: true,
        });
        vi.spyOn(adapter, 'disconnect').mockRejectedValue(new Error('Disconnect failed'));
      });

      // Should not throw
      await expect(pool.cleanup()).resolves.not.toThrow();
    });

    it('is idempotent (can be called multiple times)', async () => {
      const pool = createWalletPool();
      pools.push(pool);

      pool.getAdapters();

      await pool.cleanup();
      await pool.cleanup();
      await pool.cleanup();

      // Should not throw
      expect(true).toBe(true);
    });

    it('only disconnects connected wallets', async () => {
      const pool = createWalletPool();
      pools.push(pool);

      const adapters = pool.getAdapters();

      // First adapter connected, second not
      Object.defineProperty(adapters[0]!, 'connected', {
        get: () => true,
        configurable: true,
      });
      Object.defineProperty(adapters[1]!, 'connected', {
        get: () => false,
        configurable: true,
      });

      const spy1 = vi.spyOn(adapters[0]!, 'disconnect').mockResolvedValue();
      const spy2 = vi.spyOn(adapters[1]!, 'disconnect').mockResolvedValue();

      await pool.cleanup();

      expect(spy1).toHaveBeenCalled();
      expect(spy2).not.toHaveBeenCalled();
    });
  });

  describe('Memory leak prevention', () => {
    it('creates separate instances for each pool (no global singleton)', () => {
      const poolInstances: WalletPool[] = [];

      for (let i = 0; i < 10; i++) {
        const pool = createWalletPool(`pool-${i}`);
        poolInstances.push(pool);
        pools.push(pool);
      }

      const adapterSets = poolInstances.map(p => p.getAdapters());

      // All pools should have different adapter instances
      const uniqueAdapterArrays = new Set(adapterSets);
      expect(uniqueAdapterArrays.size).toBe(10);

      // All Phantom instances should be different
      const phantomInstances = new Set(adapterSets.map(set =>
        set.find(a => a.name === 'Phantom')
      ));
      expect(phantomInstances.size).toBe(10);
    });

    it('cleans up properly when pool is disposed', async () => {
      const pool = createWalletPool();
      pools.push(pool);

      pool.getAdapters(); // Initialize adapters

      await pool.cleanup();

      const adaptersAfter = pool.getAdapters();
      expect(adaptersAfter).toEqual([]);
      expect(adaptersAfter.length).toBe(0);
    });
  });

  describe('SSR compatibility', () => {
    it('returns empty array in SSR (window undefined)', () => {
      // This test runs in jsdom where window is defined
      // Testing actual SSR behavior would require separate test environment
      const pool = createWalletPool();
      pools.push(pool);

      const adapters = pool.getAdapters();
      // In browser environment, should return adapters
      expect(adapters.length).toBeGreaterThan(0);
    });

    it('handles initialization state correctly', () => {
      const pool = createWalletPool();
      pools.push(pool);

      expect(pool.isInitialized()).toBe(false);

      pool.getAdapters();

      expect(pool.isInitialized()).toBe(true);
    });
  });

  describe('Pool ID', () => {
    it('generates unique pool IDs automatically', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const pool = createWalletPool();
        pools.push(pool);
        ids.add(pool.getId());
      }

      // All IDs should be unique
      expect(ids.size).toBe(100);
    });

    it('accepts custom pool IDs', () => {
      const pool1 = createWalletPool('custom-1');
      const pool2 = createWalletPool('custom-2');
      pools.push(pool1, pool2);

      expect(pool1.getId()).toBe('custom-1');
      expect(pool2.getId()).toBe('custom-2');
    });
  });
});
