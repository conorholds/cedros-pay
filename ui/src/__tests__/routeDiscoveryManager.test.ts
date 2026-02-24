import { RouteDiscoveryManager } from '../managers/RouteDiscoveryManager';
import * as fetchWithTimeoutModule from '../utils/fetchWithTimeout';

// Mock the fetchWithTimeout module
vi.mock('../utils/fetchWithTimeout', () => ({
  fetchWithTimeout: vi.fn(),
}));

describe('RouteDiscoveryManager', () => {
  let manager: RouteDiscoveryManager;
  const fetchWithTimeoutMock = vi.mocked(fetchWithTimeoutModule.fetchWithTimeout);

  beforeEach(() => {
    // Create fresh manager instance for each test
    manager = new RouteDiscoveryManager('https://api.example.com');
    fetchWithTimeoutMock.mockReset();
  });

  describe('discoverPrefix', () => {
    it('discovers route prefix from health endpoint', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: '/api/v1' }),
      } as Response);

      const prefix = await manager.discoverPrefix();

      expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
        'https://api.example.com/cedros-health',
        {},
        2000
      );
      expect(prefix).toBe('/api/v1');
    });

    it('returns empty prefix when health endpoint fails', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const prefix = await manager.discoverPrefix();

      expect(prefix).toBe('');
    });

    it('returns empty prefix on network error', async () => {
      fetchWithTimeoutMock.mockRejectedValueOnce(new Error('Network error'));

      const prefix = await manager.discoverPrefix();

      expect(prefix).toBe('');
    });

    it('uses short negative cache after failed discovery attempts', async () => {
      fetchWithTimeoutMock.mockRejectedValue(new Error('Network error'));

      const prefix1 = await manager.discoverPrefix();
      expect(prefix1).toBe('');
      // First call exhausts retries.
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);

      const prefix2 = await manager.discoverPrefix();
      expect(prefix2).toBe('');
      // Second call should use negative cache and avoid new fetch retries.
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
    });

    it('retries 4xx discovery after negative cache TTL expires', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      try {
        fetchWithTimeoutMock.mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as Response);

        const prefix1 = await manager.discoverPrefix();
        expect(prefix1).toBe('');
        expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);

        const prefix2 = await manager.discoverPrefix();
        expect(prefix2).toBe('');
        expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);

        vi.setSystemTime(new Date('2026-01-01T00:00:31.000Z'));
        fetchWithTimeoutMock.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ routePrefix: '/api/recovered' }),
        } as Response);

        const prefix3 = await manager.discoverPrefix();
        expect(prefix3).toBe('/api/recovered');
        expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('caches prefix after first successful discovery', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: '/api' }),
      } as Response);

      const prefix1 = await manager.discoverPrefix();
      const prefix2 = await manager.discoverPrefix();

      // Should only call fetch once due to caching
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(prefix1).toBe('/api');
      expect(prefix2).toBe('/api');
    });

    it('handles concurrent discovery requests', async () => {
      fetchWithTimeoutMock.mockImplementation(async () => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          ok: true,
          status: 200,
          json: async () => ({ routePrefix: '/api' }),
        } as Response;
      });

      // Start two discovery requests simultaneously
      const promise1 = manager.discoverPrefix();
      const promise2 = manager.discoverPrefix();

      const [prefix1, prefix2] = await Promise.all([promise1, promise2]);

      // Should only call fetch once even for concurrent requests
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
      expect(prefix1).toBe('/api');
      expect(prefix2).toBe('/api');
    });

    it('deduplicates multiple concurrent requests (race condition test)', async () => {
      let fetchCallCount = 0;
      fetchWithTimeoutMock.mockImplementation(async () => {
        fetchCallCount++;
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          ok: true,
          status: 200,
          json: async () => ({ routePrefix: '/api/v2' }),
        } as Response;
      });

      // Simulate multiple components mounting simultaneously (race condition)
      const promises = Array.from({ length: 5 }, () => manager.discoverPrefix());

      const results = await Promise.all(promises);

      // All promises should resolve to the same prefix
      expect(results.every(prefix => prefix === '/api/v2')).toBe(true);

      // Should only call fetch once despite 5 concurrent requests
      expect(fetchCallCount).toBe(1);
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);
    });

    it('returns empty string when routePrefix is not in response', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}), // No routePrefix field
      } as Response);

      const prefix = await manager.discoverPrefix();

      expect(prefix).toBe('');
    });
  });

  describe('buildUrl', () => {
    it('builds URL with discovered prefix', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: '/api' }),
      } as Response);

      const url = await manager.buildUrl('/create-session');

      expect(url).toBe('https://api.example.com/api/create-session');
    });

    it('builds URL with empty prefix when discovery fails', async () => {
      fetchWithTimeoutMock.mockRejectedValueOnce(new Error('Network error'));

      const url = await manager.buildUrl('/create-session');

      expect(url).toBe('https://api.example.com/create-session');
    });

    it('ensures path starts with slash', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: '/api' }),
      } as Response);

      const url = await manager.buildUrl('create-session'); // No leading slash

      expect(url).toBe('https://api.example.com/api/create-session');
    });

    it('handles prefix without trailing slash', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: '/api' }), // No trailing slash
      } as Response);

      const url = await manager.buildUrl('/create-session');

      expect(url).toBe('https://api.example.com/api/create-session');
      expect(url).not.toContain('//create-session');
    });

    it('handles complex paths correctly', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: '/v2/payments' }),
      } as Response);

      const url = await manager.buildUrl('/paywall/article-123');

      expect(url).toBe('https://api.example.com/v2/payments/paywall/article-123');
    });
  });

  describe('reset', () => {
    it('clears cached prefix', async () => {
      // First discovery
      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: '/api' }),
      } as Response);

      await manager.discoverPrefix();
      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(1);

      // Reset cache
      manager.reset();

      // Second discovery should call fetch again
      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: '/v2' }),
      } as Response);

      const prefix = await manager.discoverPrefix();

      expect(fetchWithTimeoutMock).toHaveBeenCalledTimes(2);
      expect(prefix).toBe('/v2');
    });

    it('clears pending discovery promise', async () => {
      // Start discovery but don't await
      fetchWithTimeoutMock.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          ok: true,
          status: 200,
          json: async () => ({ routePrefix: '/api' }),
        } as Response;
      });

      const promise1 = manager.discoverPrefix();

      // Reset before discovery completes
      manager.reset();

      // Start new discovery
      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: '/v2' }),
      } as Response);

      const prefix = await manager.discoverPrefix();

      // Should have started fresh discovery
      expect(prefix).toBe('/v2');

      // Cleanup first promise
      await promise1.catch(() => {});
    });
  });

  describe('edge cases', () => {
    it('handles server URL with trailing slash', async () => {
      const managerWithSlash = new RouteDiscoveryManager('https://api.example.com/');

      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: '/api' }),
      } as Response);

      const url = await managerWithSlash.buildUrl('/create-session');

      // Should not have double slashes
      expect(url).toBe('https://api.example.com/api/create-session');
    });

    it('handles empty route prefix from backend', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: '' }),
      } as Response);

      const url = await manager.buildUrl('/create-session');

      expect(url).toBe('https://api.example.com/create-session');
    });

    it('handles null route prefix from backend', async () => {
      fetchWithTimeoutMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ routePrefix: null }),
      } as Response);

      const prefix = await manager.discoverPrefix();

      expect(prefix).toBe('');
    });
  });
});
