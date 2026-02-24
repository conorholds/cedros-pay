import { X402Manager } from '../managers/X402Manager';
import { RouteDiscoveryManager } from '../managers/RouteDiscoveryManager';
import type { X402Requirement, PaymentPayload } from '../types';

describe('X402Manager', () => {
  const routeDiscovery = new RouteDiscoveryManager('https://api.example.com');
  const manager = new X402Manager(routeDiscovery);
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

  it('retrieves x402 requirements when backend responds with 402', async () => {
    const requirement: X402Requirement = {
      scheme: 'solana-spl-transfer',
      network: 'mainnet-beta',
      maxAmountRequired: '1000000',
      resource: 'article-123',
      description: 'Test article',
      mimeType: 'application/json',
      payTo: 'TokenAccountAddress',
      maxTimeoutSeconds: 300,
      asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      extra: {
        decimals: 6,
        tokenSymbol: 'USDC',
      },
    };

    // Override default mock for this specific test
    fetchMock.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('/cedros-health')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ routePrefix: '/api' }),
        } as Response;
      }
      if (typeof url === 'string' && url.includes('/paywall/v1/quote')) {
        return {
          status: 402,
          json: async () => ({ x402Version: 0, accepts: [requirement] }),
        } as Response;
      }
      return Promise.reject(new Error('Unmocked fetch call'));
    });

    const result = await manager.requestQuote({ resource: 'article-123' });

    // SECURITY FIX: Uses generic /v1/quote endpoint with resource in body
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/paywall/v1/quote',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ resource: 'article-123', couponCode: null }),
      })
    );
    expect(result).toEqual(requirement);
  });

  it('throws when backend does not respond with 402', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('/cedros-health')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ routePrefix: '/api' }),
        } as Response;
      }
      if (typeof url === 'string' && url.includes('/paywall/v1/quote')) {
        return {
          status: 200,
          text: async () => 'ok',
        } as Response;
      }
      return Promise.reject(new Error('Unmocked fetch call'));
    });

    await expect(manager.requestQuote({ resource: 'article-123' })).rejects.toThrow(
      'Expected 402 status, got 200'
    );
  });

  it('submits payments and returns success payload', async () => {
    const payload: PaymentPayload = {
      x402Version: 0,
      scheme: 'solana-spl-transfer',
      network: 'mainnet-beta',
      payload: {
        signature: 'signature',
        transaction: 'signed-tx',
        payer: 'payer',
        memo: 'memo',
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
      if (typeof url === 'string' && url.includes('/paywall/v1/verify')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ unlocked: true }),
          headers: new Headers(), // Mock headers (no X-PAYMENT-RESPONSE)
        } as Response;
      }
      return Promise.reject(new Error('Unmocked fetch call'));
    });

    const result = await manager.submitPayment({ resource: 'article-123', payload });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/paywall/v1/verify',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-PAYMENT': expect.any(String), // Base64 encoded
        }),
      })
    );
    expect(result).toEqual({ success: true, transactionId: 'signature' });
  });

  it('returns error when payment verification fails', async () => {
    const payload: PaymentPayload = {
      x402Version: 0,
      scheme: 'solana-spl-transfer',
      network: 'mainnet-beta',
      payload: {
        signature: 'signature',
        transaction: 'signed-tx',
        payer: 'payer',
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
      if (typeof url === 'string' && url.includes('/paywall/v1/verify')) {
        return {
          ok: false,
          status: 400,
          text: async () => 'invalid tx',
        } as Response;
      }
      return Promise.reject(new Error('Unmocked fetch call'));
    });

    const result = await manager.submitPayment({ resource: 'article-123', payload });

    expect(result.success).toBe(false);
    expect(result.error).toContain('invalid tx');
  });

  it('parses X-PAYMENT-RESPONSE header with settlement data', async () => {
    const settlementData = {
      success: true,
      error: null,
      txHash: '5xJ3abc123...',
      networkId: 'mainnet-beta',
    };

    const headers = new Headers();
    headers.set('X-PAYMENT-RESPONSE', btoa(JSON.stringify(settlementData)));

    const payload: PaymentPayload = {
      x402Version: 0,
      scheme: 'solana-spl-transfer',
      network: 'mainnet-beta',
      payload: {
        signature: 'signature',
        transaction: 'signed-tx',
        payer: 'payer',
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
      if (typeof url === 'string' && url.includes('/paywall/v1/verify')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ unlocked: true }),
          headers,
        } as Response;
      }
      return Promise.reject(new Error('Unmocked fetch call'));
    });

    const result = await manager.submitPayment({ resource: 'article-123', payload });

    expect(result.success).toBe(true);
    expect(result.settlement).toBeDefined();
    expect(result.settlement?.success).toBe(true);
    expect(result.settlement?.txHash).toBe('5xJ3abc123...');
    expect(result.settlement?.networkId).toBe('mainnet-beta');
  });
});
