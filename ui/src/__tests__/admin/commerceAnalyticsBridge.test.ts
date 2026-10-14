import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CEDROS_SHOP_COMMERCE_ANALYTICS_BRIDGE_ID,
  createCedrosShopCommerceAnalyticsBridge,
} from '../../admin/commerceAnalyticsBridge';
import { cedrosPayPlugin } from '../../admin/plugin';
import type { PluginContext } from '../../admin/types';
import { fetchWithTimeout } from '../../utils/fetchWithTimeout';

vi.mock('../../utils/fetchWithTimeout', () => ({
  fetchWithTimeout: vi.fn(),
}));

const pluginContext: PluginContext = {
  serverUrl: 'https://pay.example.com',
  getAccessToken: () => null,
  hasPermission: (permission: string) => permission === 'cedros-pay:admin',
};

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

describe('Cedros Shop commerce analytics bridge', () => {
  beforeEach(() => {
    vi.mocked(fetchWithTimeout).mockReset();
  });

  it('keeps the Shop bridge executable and out of Cedros manifest metadata', async () => {
    const registerModule = await import('../../admin/register');
    const bootstrap = registerModule.default();
    const runtimeBridge = cedrosPayPlugin.contributions?.custom as Record<string, unknown>;
    const runtimeShop = runtimeBridge.cedrosShop as
      | { commerceAnalytics?: { data?: Record<string, unknown> } }
      | undefined;
    const commerceAnalytics = runtimeShop?.commerceAnalytics;

    expect(bootstrap.manifest.adminModules?.[0].contributions).not.toHaveProperty('custom');
    expect(runtimeBridge).toMatchObject({
      cedrosShop: {
        commerceAnalytics: {
          bridgeId: CEDROS_SHOP_COMMERCE_ANALYTICS_BRIDGE_ID,
          methods: expect.arrayContaining(['recoverCheckout']),
        },
      },
    });
    expect(
      typeof ((runtimeBridge.cedrosShop as Record<string, unknown>).commerceAnalytics as {
        createBridge?: unknown;
      }).createBridge
    ).toBe('function');
    expect(commerceAnalytics?.data).toMatchObject({
      recoveryTokens: false,
      providerPayloads: false,
    });
    expect(JSON.stringify(runtimeBridge)).not.toMatch(/recoveryUrl/i);
  });

  it('uses authenticated Pay admin endpoints for reads and recovery', async () => {
    vi.mocked(fetchWithTimeout)
      .mockResolvedValueOnce(
        jsonResponse({
          generatedAt: '2026-06-19T00:00:00Z',
          abandonedCheckouts: [{ checkoutId: 'cart-1' }],
          paymentEvents: [{ eventId: 'cedros-pay:payment-event:abc' }],
        })
      )
      .mockResolvedValueOnce(jsonResponse({ checkoutId: 'cart-1', status: 'recovered' }));
    const bridge = createCedrosShopCommerceAnalyticsBridge({ pluginContext });

    await expect(bridge.listAbandonedCheckouts({ limit: 2 })).resolves.toEqual([
      { checkoutId: 'cart-1' },
    ]);
    await expect(bridge.recoverCheckout({ checkoutId: 'cart-1' })).resolves.toMatchObject({
      status: 'recovered',
    });

    expect(fetchWithTimeout).toHaveBeenNthCalledWith(
      1,
      'https://pay.example.com/admin/commerce-analytics?limit=2',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(fetchWithTimeout).toHaveBeenNthCalledWith(
      2,
      'https://pay.example.com/admin/commerce-analytics/abandoned-checkouts/cart-1/recover',
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    );
  });

  it('rejects empty checkout recovery requests before calling Pay', async () => {
    const bridge = createCedrosShopCommerceAnalyticsBridge(pluginContext);

    await expect(bridge.recoverCheckout({ checkoutId: '   ' })).rejects.toThrow(
      'checkoutId is required'
    );
    expect(fetchWithTimeout).not.toHaveBeenCalled();
  });
});
