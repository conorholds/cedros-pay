import { SubscriptionManager } from '../managers/SubscriptionManager';
import { RouteDiscoveryManager } from '../managers/RouteDiscoveryManager';
import type {
  SubscriptionSessionRequest,
  SubscriptionSessionResponse,
  SubscriptionStatusResponse,
  SubscriptionQuote,
} from '../types';

describe('SubscriptionManager', () => {
  const routeDiscovery = new RouteDiscoveryManager('https://api.example.com');
  const manager = new SubscriptionManager('pk_test_123', routeDiscovery);
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;

    // Mock route discovery health check to return /api prefix
    fetchMock.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('/cedros-health')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ routePrefix: '/api' }),
        } as Response;
      }
      return Promise.reject(new Error('Unmocked fetch call'));
    });
  });

  describe('createSubscriptionSession', () => {
    it('creates a subscription session successfully', async () => {
      const request: SubscriptionSessionRequest = {
        resource: 'plan-pro',
        interval: 'monthly',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const mockResponse: SubscriptionSessionResponse = {
        sessionId: 'cs_sub_test_123',
        url: 'https://checkout.stripe.com/test',
      };

      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('/cedros-health')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ routePrefix: '/api' }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/paywall/v1/subscription/stripe-session')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockResponse,
          } as Response;
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      const result = await manager.createSubscriptionSession(request);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/paywall/v1/subscription/stripe-session',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Idempotency-Key': expect.any(String),
          }),
          body: JSON.stringify(request),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('includes trial days in session request', async () => {
      const request: SubscriptionSessionRequest = {
        resource: 'plan-pro',
        interval: 'monthly',
        trialDays: 14,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const mockResponse: SubscriptionSessionResponse = {
        sessionId: 'cs_sub_test_456',
        url: 'https://checkout.stripe.com/test',
      };

      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('/cedros-health')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ routePrefix: '/api' }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/paywall/v1/subscription/stripe-session')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockResponse,
          } as Response;
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      const result = await manager.createSubscriptionSession(request);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/paywall/v1/subscription/stripe-session',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"trialDays":14'),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('handles session creation errors', async () => {
      const request: SubscriptionSessionRequest = {
        resource: 'plan-pro',
        interval: 'monthly',
      };

      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('/cedros-health')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ routePrefix: '/api' }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/paywall/v1/subscription/stripe-session')) {
          return {
            ok: false,
            status: 400,
            json: async () => ({ error: 'Invalid plan' }),
          } as Response;
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      await expect(manager.createSubscriptionSession(request)).rejects.toThrow('Invalid plan');
    });
  });

  describe('checkSubscriptionStatus', () => {
    it('checks subscription status successfully', async () => {
      const mockResponse: SubscriptionStatusResponse = {
        active: true,
        status: 'active',
        expiresAt: '2025-12-31T23:59:59Z',
        currentPeriodEnd: '2025-01-31T23:59:59Z',
        interval: 'monthly',
        cancelAtPeriodEnd: false,
      };

      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('/cedros-health')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ routePrefix: '/api' }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/paywall/v1/subscription/status')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockResponse,
          } as Response;
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      const result = await manager.checkSubscriptionStatus({
        resource: 'plan-pro',
        userId: 'wallet-address-123',
      });

      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('resource=plan-pro'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('userId=wallet-address-123'),
        expect.any(Object)
      );
    });

    it('returns inactive status for expired subscription', async () => {
      const mockResponse: SubscriptionStatusResponse = {
        active: false,
        status: 'expired',
        expiresAt: '2024-12-31T23:59:59Z',
      };

      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('/cedros-health')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ routePrefix: '/api' }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/paywall/v1/subscription/status')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockResponse,
          } as Response;
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      const result = await manager.checkSubscriptionStatus({
        resource: 'plan-pro',
        userId: 'wallet-address-123',
      });

      expect(result.active).toBe(false);
      expect(result.status).toBe('expired');
    });
  });

  describe('requestSubscriptionQuote', () => {
    it('requests subscription quote successfully', async () => {
      const mockQuote: SubscriptionQuote = {
        requirement: {
          scheme: 'solana-spl-transfer',
          network: 'mainnet-beta',
          maxAmountRequired: '10000000',
          resource: 'plan-pro',
          description: 'Pro Plan Monthly Subscription',
          mimeType: 'application/json',
          payTo: 'BYNhM2C7hRdqY8PAkBGvxnVkKvHPRAqCGbFYk2aQePWg',
          maxTimeoutSeconds: 300,
          asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        },
        subscription: {
          interval: 'monthly',
          durationSeconds: 2592000,
          periodStart: '2025-01-01T00:00:00Z',
          periodEnd: '2025-01-31T23:59:59Z',
        },
      };

      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('/cedros-health')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ routePrefix: '/api' }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/paywall/v1/subscription/quote')) {
          return {
            ok: false, // x402 quotes return 402
            status: 402,
            json: async () => mockQuote,
          } as Response;
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      const result = await manager.requestSubscriptionQuote('plan-pro', 'monthly');

      expect(result).toEqual(mockQuote);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/paywall/v1/subscription/quote',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"resource":"plan-pro"'),
        })
      );
    });

    it('includes coupon code in quote request', async () => {
      const mockQuote: SubscriptionQuote = {
        requirement: {
          scheme: 'solana-spl-transfer',
          network: 'mainnet-beta',
          maxAmountRequired: '8000000', // Discounted
          resource: 'plan-pro',
          description: 'Pro Plan Monthly Subscription (20% off)',
          mimeType: 'application/json',
          payTo: 'BYNhM2C7hRdqY8PAkBGvxnVkKvHPRAqCGbFYk2aQePWg',
          maxTimeoutSeconds: 300,
          asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        },
        subscription: {
          interval: 'monthly',
          durationSeconds: 2592000,
          periodStart: '2025-01-01T00:00:00Z',
          periodEnd: '2025-01-31T23:59:59Z',
        },
      };

      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('/cedros-health')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ routePrefix: '/api' }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/paywall/v1/subscription/quote')) {
          return {
            ok: false,
            status: 402,
            json: async () => mockQuote,
          } as Response;
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      const result = await manager.requestSubscriptionQuote('plan-pro', 'monthly', {
        couponCode: 'SAVE20',
      });

      expect(result).toEqual(mockQuote);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/paywall/v1/subscription/quote',
        expect.objectContaining({
          body: expect.stringContaining('"couponCode":"SAVE20"'),
        })
      );
    });

    it('handles custom interval with intervalDays', async () => {
      const mockQuote: SubscriptionQuote = {
        requirement: {
          scheme: 'solana-spl-transfer',
          network: 'mainnet-beta',
          maxAmountRequired: '5000000',
          resource: 'plan-pro',
          description: 'Pro Plan Custom Subscription (45 days)',
          mimeType: 'application/json',
          payTo: 'BYNhM2C7hRdqY8PAkBGvxnVkKvHPRAqCGbFYk2aQePWg',
          maxTimeoutSeconds: 300,
          asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        },
        subscription: {
          interval: 'custom',
          intervalDays: 45,
          durationSeconds: 3888000, // 45 days
          periodStart: '2025-01-01T00:00:00Z',
          periodEnd: '2025-02-15T00:00:00Z',
        },
      };

      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('/cedros-health')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ routePrefix: '/api' }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/paywall/v1/subscription/quote')) {
          return {
            ok: false,
            status: 402,
            json: async () => mockQuote,
          } as Response;
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      const result = await manager.requestSubscriptionQuote('plan-pro', 'custom', {
        intervalDays: 45,
      });

      expect(result).toEqual(mockQuote);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/paywall/v1/subscription/quote',
        expect.objectContaining({
          body: expect.stringContaining('"intervalDays":45'),
        })
      );
    });
  });
});
