import { StripeManager } from '../managers/StripeManager';
import { RouteDiscoveryManager } from '../managers/RouteDiscoveryManager';
import type { StripeSessionRequest, StripeSessionResponse } from '../types';
import { LogLevel, Logger, setLogger } from '../utils/logger';

describe('StripeManager', () => {
  const routeDiscovery = new RouteDiscoveryManager('https://api.example.com');
  const manager = new StripeManager('pk_test_123', routeDiscovery);
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    setLogger(new Logger({ level: LogLevel.DEBUG, prefix: '[CedrosPay]' }));

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

  afterEach(() => {
    setLogger(new Logger({ level: LogLevel.WARN, prefix: '[CedrosPay]' }));
  });

  describe('createSession', () => {
    it('creates a Stripe session successfully', async () => {
      const request: StripeSessionRequest = {
        resource: 'product-123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        metadata: { userId: 'user-123' },
      };

      const mockResponse: StripeSessionResponse = {
        sessionId: 'cs_test_123',
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
        if (typeof url === 'string' && url.includes('/paywall/v1/stripe-session')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockResponse,
          } as Response;
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      const result = await manager.createSession(request);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/paywall/v1/stripe-session',
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

    it('includes coupon code in session request', async () => {
      const request: StripeSessionRequest = {
        resource: 'product-123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        couponCode: 'SUMMER50',
      };

      const mockResponse: StripeSessionResponse = {
        sessionId: 'cs_test_456',
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
        if (typeof url === 'string' && url.includes('/paywall/v1/stripe-session')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockResponse,
          } as Response;
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      const result = await manager.createSession(request);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/paywall/v1/stripe-session',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('SUMMER50'),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('handles session creation errors', async () => {
      const request: StripeSessionRequest = {
        resource: 'product-123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('/cedros-health')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ routePrefix: '/api' }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/paywall/v1/stripe-session')) {
          return {
            ok: false,
            status: 400,
            json: async () => ({ error: 'Invalid product' }),
          } as Response;
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      await expect(manager.createSession(request)).rejects.toThrow('Invalid product');
    });

    it('handles network errors gracefully', async () => {
      const request: StripeSessionRequest = {
        resource: 'product-123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('/cedros-health')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ routePrefix: '/api' }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/paywall/v1/stripe-session')) {
          return {
            ok: false,
            status: 500,
            text: async () => 'Internal server error',
          } as Response;
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      await expect(manager.createSession(request)).rejects.toThrow(
        'Internal server error'
      );
    });

    it('includes idempotency key in headers', async () => {
      const request: StripeSessionRequest = {
        resource: 'product-123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const mockResponse: StripeSessionResponse = {
        sessionId: 'cs_test_789',
        url: 'https://checkout.stripe.com/test',
      };

      let capturedHeaders: Record<string, string> | undefined;

      fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
        if (typeof url === 'string' && url.includes('/cedros-health')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ routePrefix: '/api' }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/paywall/v1/stripe-session')) {
          capturedHeaders = options?.headers as Record<string, string>;
          return {
            ok: true,
            status: 200,
            json: async () => mockResponse,
          } as Response;
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      await manager.createSession(request);

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders?.['Idempotency-Key']).toBeDefined();
      expect(typeof capturedHeaders?.['Idempotency-Key']).toBe('string');
    });

    it('redacts sensitive values from debug logging', async () => {
      const request: StripeSessionRequest = {
        resource: 'product-123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        couponCode: 'SUMMER50',
        metadata: { userId: 'user-123' },
      };
      const mockResponse: StripeSessionResponse = {
        sessionId: 'cs_test_redaction',
        url: 'https://checkout.stripe.com/test',
      };
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      fetchMock.mockImplementation(async (url: string) => {
        if (typeof url === 'string' && url.includes('/cedros-health')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ routePrefix: '/api' }),
          } as Response;
        }
        if (typeof url === 'string' && url.includes('/paywall/v1/stripe-session')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockResponse,
          } as Response;
        }
        return Promise.reject(new Error('Unmocked fetch call'));
      });

      await manager.createSession(request);

      const logOutput = logSpy.mock.calls.flat().join(' ');
      const debugCall = logSpy.mock.calls.find((call) =>
        call.some((arg) => typeof arg === 'string' && arg.includes('[StripeManager] Creating session'))
      );
      const summaryArg = debugCall?.find(
        (arg) => typeof arg === 'object' && arg !== null
      ) as Record<string, unknown> | undefined;
      expect(logOutput).not.toContain('SUMMER50');
      expect(logOutput).not.toContain('user-123');
      expect(summaryArg).toBeDefined();
      expect(summaryArg?.hasCouponCode).toBe(true);
      expect(summaryArg?.metadataKeyCount).toBe(1);
      logSpy.mockRestore();
    });
  });
});
