import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPaywallCommerceAdapter } from './paywallAdapter';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

function buildProducts(count: number, offset = 0) {
  return Array.from({ length: count }, (_, index) => ({
    id: `p-${offset + index + 1}`,
    slug: `slug-${offset + index + 1}`,
    title: `Product ${offset + index + 1}`,
    effectiveFiatAmountCents: 1000,
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('paywall adapter fallback pagination', () => {
  it('getProductBySlug scans bounded pages and resolves matches without full-catalog fetches', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/by-slug/widget')) return jsonResponse({ error: 'not found' }, 404);
      if (url.endsWith('/products/widget')) return jsonResponse({ error: 'not found' }, 404);
      if (url.includes('/products?limit=50&offset=0')) {
        return jsonResponse({
          products: buildProducts(50, 0),
          total: 60,
        });
      }
      if (url.includes('/products?limit=50&offset=50')) {
        return jsonResponse({
          products: [{ id: 'p-2', slug: 'widget', title: 'Widget', effectiveFiatAmountCents: 2500 }],
          total: 60,
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const adapter = createPaywallCommerceAdapter({ serverUrl: 'https://api.example.com', apiKey: 'k' });
    const product = await adapter.getProductBySlug('widget');

    expect(product?.slug).toBe('widget');
    const urls = fetchMock.mock.calls.map(([arg]) => String(arg));
    expect(urls.some((url) => url.includes('limit=200'))).toBe(false);
    expect(urls.some((url) => url.includes('limit=500'))).toBe(false);
  });

  it('getProductBySlug stops after capped fallback pages when no product is found', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/by-slug/missing')) return jsonResponse({ error: 'not found' }, 404);
      if (url.endsWith('/products/missing')) return jsonResponse({ error: 'not found' }, 404);
      if (url.includes('/products?limit=50&offset=')) {
        return jsonResponse({ products: buildProducts(50) });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const adapter = createPaywallCommerceAdapter({ serverUrl: 'https://api.example.com' });
    const product = await adapter.getProductBySlug('missing');

    expect(product).toBeNull();

    const pagedCalls = fetchMock.mock.calls
      .map(([arg]) => String(arg))
      .filter((url) => url.includes('/products?limit=50&offset='));
    expect(pagedCalls).toHaveLength(4);
  });

  it('getProductsByIds uses bounded page fallback and per-id lookup for unresolved ids', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/products?ids=known%2Cmissing&limit=2&offset=0')) {
        return jsonResponse({ error: 'unsupported filter' }, 400);
      }
      if (url.includes('/products?limit=50&offset=0')) {
        return jsonResponse({
          products: [
            { id: 'known', slug: 'known', title: 'Known', effectiveFiatAmountCents: 1000 },
            ...buildProducts(49, 1),
          ],
          total: 60,
        });
      }
      if (url.includes('/products?limit=50&offset=50')) {
        return jsonResponse({ products: [], total: 60 });
      }
      if (url.includes('/products/by-slug/missing')) {
        return jsonResponse({ id: 'missing', slug: 'missing', title: 'Missing', effectiveFiatAmountCents: 2000 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const adapter = createPaywallCommerceAdapter({ serverUrl: 'https://api.example.com' });
    const results = await adapter.getProductsByIds!(['known', 'missing']);

    expect(results.get('known')?.id).toBe('known');
    expect(results.get('missing')?.id).toBe('missing');

    const urls = fetchMock.mock.calls.map(([arg]) => String(arg));
    expect(urls.some((url) => url.includes('limit=500'))).toBe(false);
    expect(urls.some((url) => url.includes('/products/by-slug/missing'))).toBe(true);
  });
});

describe('getStorefrontSettings', () => {
  it('calls /paywall/v1/storefront and returns parsed config', async () => {
    const config = { shopPage: { title: 'My Store', description: 'Welcome' }, catalog: { layout: 'grid' } };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/paywall/v1/storefront')) {
        return jsonResponse({ config });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const adapter = createPaywallCommerceAdapter({ serverUrl: 'https://api.example.com' });
    const result = await adapter.getStorefrontSettings!();

    expect(result).toEqual(config);
    const urls = fetchMock.mock.calls.map(([arg]) => String(arg));
    expect(urls).toContain('https://api.example.com/paywall/v1/storefront');
  });

  it('returns null on endpoint error (graceful degradation)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: 'internal' }, 500));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = createPaywallCommerceAdapter({ serverUrl: 'https://api.example.com' });
    const result = await adapter.getStorefrontSettings!();

    expect(result).toBeNull();
  });

  it('round-trips shopPage.title correctly from response', async () => {
    const config = { shopPage: { title: 'Cedros Shop', description: 'Best deals' } };
    const fetchMock = vi.fn(async () => jsonResponse({ config }));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = createPaywallCommerceAdapter({ serverUrl: 'https://api.example.com' });
    const result = await adapter.getStorefrontSettings!();

    expect(result?.shopPage?.title).toBe('Cedros Shop');
    expect(result?.shopPage?.description).toBe('Best deals');
  });
});

describe('getPaymentMethodsConfig', () => {
  it('calls /paywall/v1/storefront and returns mapped config', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/paywall/v1/storefront')) {
        return jsonResponse({
          config: {},
          paymentMethods: { stripe: true, x402: false, credits: true },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const adapter = createPaywallCommerceAdapter({ serverUrl: 'https://api.example.com' });
    const result = await adapter.getPaymentMethodsConfig!();

    expect(result).toEqual({ card: true, crypto: false, credits: true });
    const urls = fetchMock.mock.calls.map(([arg]) => String(arg));
    expect(urls).toContain('https://api.example.com/paywall/v1/storefront');
  });

  it('returns null on endpoint error', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ error: 'internal' }, 500));
    vi.stubGlobal('fetch', fetchMock);

    const adapter = createPaywallCommerceAdapter({ serverUrl: 'https://api.example.com' });
    const result = await adapter.getPaymentMethodsConfig!();

    expect(result).toBeNull();
  });
});

describe('paywall adapter timeout/retry policy', () => {
  it('retries idempotent read requests on transient failures', async () => {
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(
        jsonResponse({
          products: [{ id: 'p-1', slug: 'p-1', title: 'P1', effectiveFiatAmountCents: 1000 }],
          total: 1,
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const adapter = createPaywallCommerceAdapter({ serverUrl: 'https://api.example.com' });
    const result = await adapter.listProducts({ page: 1, pageSize: 1 });

    expect(result.items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-idempotent AI related products POST requests', async () => {
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValue(jsonResponse({ error: 'upstream unavailable' }, 503));

    vi.stubGlobal('fetch', fetchMock);

    const adapter = createPaywallCommerceAdapter({ serverUrl: 'https://api.example.com' });

    await expect(
      adapter.getAIRelatedProducts?.({ productId: 'p-1', name: 'P1' })
    ).rejects.toThrow('Request failed (503)');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
