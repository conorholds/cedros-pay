import { describe, it, expect, beforeEach } from 'vitest';
import {
  getOrCreateManagers,
  releaseManagers,
  clearManagerCache,
  getManagerCacheStats,
} from '../managers/ManagerCache';

describe('ManagerCache', () => {
  beforeEach(() => {
    clearManagerCache();
  });

  describe('getOrCreateManagers', () => {
    it('creates new managers for first call', async () => {
      const managers = await getOrCreateManagers(
        'pk_test_123',
        'http://localhost:8080',
        'devnet'
      );

      expect(managers.stripeManager).toBeDefined();
      expect(managers.x402Manager).toBeDefined();
      expect(managers.walletManager).toBeDefined();
      expect(managers.routeDiscovery).toBeDefined();
    });

    it('reuses managers for identical config', async () => {
      const managers1 = await getOrCreateManagers(
        'pk_test_123',
        'http://localhost:8080',
        'devnet'
      );

      const managers2 = await getOrCreateManagers(
        'pk_test_123',
        'http://localhost:8080',
        'devnet'
      );

      // Should be the same instances
      expect(managers1.stripeManager).toBe(managers2.stripeManager);
      expect(managers1.x402Manager).toBe(managers2.x402Manager);
      expect(managers1.walletManager).toBe(managers2.walletManager);
      expect(managers1.routeDiscovery).toBe(managers2.routeDiscovery);
    });

    it('creates separate managers for different Stripe keys', async () => {
      const managers1 = await getOrCreateManagers(
        'pk_test_123',
        'http://localhost:8080',
        'devnet'
      );

      const managers2 = await getOrCreateManagers(
        'pk_test_456', // Different key
        'http://localhost:8080',
        'devnet'
      );

      // Should be different instances
      expect(managers1.stripeManager).not.toBe(managers2.stripeManager);
      expect(managers1.x402Manager).not.toBe(managers2.x402Manager);
      expect(managers1.walletManager).not.toBe(managers2.walletManager);
      expect(managers1.routeDiscovery).not.toBe(managers2.routeDiscovery);
    });

    it('creates separate managers for different server URLs', async () => {
      const managers1 = await getOrCreateManagers(
        'pk_test_123',
        'http://localhost:8080',
        'devnet'
      );

      const managers2 = await getOrCreateManagers(
        'pk_test_123',
        'http://localhost:8081', // Different URL
        'devnet'
      );

      expect(managers1.routeDiscovery).not.toBe(managers2.routeDiscovery);
    });

    it('creates separate managers for different Solana clusters', async () => {
      const managers1 = await getOrCreateManagers(
        'pk_test_123',
        'http://localhost:8080',
        'devnet'
      );

      const managers2 = await getOrCreateManagers(
        'pk_test_123',
        'http://localhost:8080',
        'mainnet-beta' // Different cluster
      );

      expect(managers1.walletManager).not.toBe(managers2.walletManager);
    });

    it('creates separate managers for different Solana endpoints', async () => {
      const managers1 = await getOrCreateManagers(
        'pk_test_123',
        'http://localhost:8080',
        'devnet',
        'https://rpc1.example.com'
      );

      const managers2 = await getOrCreateManagers(
        'pk_test_123',
        'http://localhost:8080',
        'devnet',
        'https://rpc2.example.com' // Different endpoint
      );

      expect(managers1.walletManager).not.toBe(managers2.walletManager);
    });

    it('creates separate managers for different dangerouslyAllowUnknownMint flags', async () => {
      const managers1 = await getOrCreateManagers(
        'pk_test_123',
        'http://localhost:8080',
        'devnet',
        undefined,
        false
      );

      const managers2 = await getOrCreateManagers(
        'pk_test_123',
        'http://localhost:8080',
        'devnet',
        undefined,
        true // Different flag
      );

      expect(managers1.walletManager).not.toBe(managers2.walletManager);
    });

    it('increments refCount for each call with same config', async () => {
      await getOrCreateManagers('pk_test_123', 'http://localhost:8080', 'devnet');
      await getOrCreateManagers('pk_test_123', 'http://localhost:8080', 'devnet');
      await getOrCreateManagers('pk_test_123', 'http://localhost:8080', 'devnet');

      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.details[0].refCount).toBe(3);
    });

    it('reuses one in-flight initialization for concurrent calls', async () => {
      const [managers1, managers2] = await Promise.all([
        getOrCreateManagers('pk_test_123', 'http://localhost:8080', 'devnet'),
        getOrCreateManagers('pk_test_123', 'http://localhost:8080', 'devnet'),
      ]);

      expect(managers1.stripeManager).toBe(managers2.stripeManager);
      expect(managers1.x402Manager).toBe(managers2.x402Manager);
      expect(managers1.walletManager).toBe(managers2.walletManager);

      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.details[0].refCount).toBe(2);
    });
  });

  describe('releaseManagers', () => {
    it('decrements refCount when releasing', async () => {
      await getOrCreateManagers('pk_test_123', 'http://localhost:8080', 'devnet');
      await getOrCreateManagers('pk_test_123', 'http://localhost:8080', 'devnet');

      releaseManagers('pk_test_123', 'http://localhost:8080', 'devnet');

      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.details[0].refCount).toBe(1);
    });

    it('removes managers from cache when refCount reaches 0', async () => {
      await getOrCreateManagers('pk_test_123', 'http://localhost:8080', 'devnet');

      releaseManagers('pk_test_123', 'http://localhost:8080', 'devnet');

      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(0);
    });

    it('handles release of non-existent managers gracefully', () => {
      // Should not throw
      expect(() => {
        releaseManagers('pk_test_nonexistent', 'http://localhost:8080', 'devnet');
      }).not.toThrow();
    });
  });

  describe('Multi-provider scenarios', () => {
    it('shares managers between two providers with same config', async () => {
      // Provider 1 mounts
      const p1Managers = await getOrCreateManagers('pk_test_123', 'http://localhost:8080', 'devnet');

      // Provider 2 mounts with same config
      const p2Managers = await getOrCreateManagers('pk_test_123', 'http://localhost:8080', 'devnet');

      // Should share managers
      expect(p1Managers.stripeManager).toBe(p2Managers.stripeManager);

      // Cache should have 1 entry with refCount 2
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(1);
      expect(stats.details[0].refCount).toBe(2);

      // Provider 1 unmounts
      releaseManagers('pk_test_123', 'http://localhost:8080', 'devnet');

      // Cache should still have entry (refCount 1)
      const stats2 = getManagerCacheStats();
      expect(stats2.entries).toBe(1);
      expect(stats2.details[0].refCount).toBe(1);

      // Provider 2 unmounts
      releaseManagers('pk_test_123', 'http://localhost:8080', 'devnet');

      // Cache should be empty
      const stats3 = getManagerCacheStats();
      expect(stats3.entries).toBe(0);
    });

    it('isolates managers between providers with different configs', async () => {
      // Provider 1: Tenant A
      const tenantA = await getOrCreateManagers('pk_test_123', 'http://localhost:8080', 'devnet');

      // Provider 2: Tenant B (different Stripe key)
      const tenantB = await getOrCreateManagers('pk_test_456', 'http://localhost:8080', 'devnet');

      // Should NOT share managers
      expect(tenantA.stripeManager).not.toBe(tenantB.stripeManager);

      // Cache should have 2 entries
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(2);
    });

    it('handles nested providers correctly', async () => {
      // Outer provider
      const outer = await getOrCreateManagers('pk_test_123', 'http://localhost:8080', 'devnet');

      // Inner provider (different server)
      const inner = await getOrCreateManagers('pk_test_123', 'http://localhost:8081', 'devnet');

      // Should have separate managers
      expect(outer.routeDiscovery).not.toBe(inner.routeDiscovery);

      // Cache should have 2 entries
      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(2);
    });
  });

  describe('clearManagerCache', () => {
    it('clears all cached managers', async () => {
      await getOrCreateManagers('pk_test_123', 'http://localhost:8080', 'devnet');
      await getOrCreateManagers('pk_test_456', 'http://localhost:8081', 'mainnet-beta');

      expect(getManagerCacheStats().entries).toBe(2);

      clearManagerCache();

      expect(getManagerCacheStats().entries).toBe(0);
    });
  });

  describe('Memory optimization scenarios', () => {
    it('prevents duplicate Stripe.js loads for same public key', async () => {
      // Scenario: Multiple dashboards for different users, same Stripe account
      const dashboard1 = await getOrCreateManagers('pk_test_123', 'http://localhost:8080', 'devnet');
      const dashboard2 = await getOrCreateManagers('pk_test_123', 'http://localhost:8080', 'devnet');
      const dashboard3 = await getOrCreateManagers('pk_test_123', 'http://localhost:8080', 'devnet');

      // All should share the same StripeManager (single loadStripe() call)
      expect(dashboard1.stripeManager).toBe(dashboard2.stripeManager);
      expect(dashboard2.stripeManager).toBe(dashboard3.stripeManager);

      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(1); // Only one cache entry
      expect(stats.details[0].refCount).toBe(3); // Three providers sharing it
    });

    it('allows separate managers for multi-tenant SaaS', async () => {
      // Scenario: Multi-tenant SaaS, each tenant has their own Stripe account
      const tenant1 = await getOrCreateManagers('pk_test_tenant1', 'http://localhost:8080', 'devnet');
      const tenant2 = await getOrCreateManagers('pk_test_tenant2', 'http://localhost:8080', 'devnet');
      const tenant3 = await getOrCreateManagers('pk_test_tenant3', 'http://localhost:8080', 'devnet');

      // Each tenant gets separate managers
      expect(tenant1.stripeManager).not.toBe(tenant2.stripeManager);
      expect(tenant2.stripeManager).not.toBe(tenant3.stripeManager);

      const stats = getManagerCacheStats();
      expect(stats.entries).toBe(3); // Three separate cache entries
    });
  });
});
