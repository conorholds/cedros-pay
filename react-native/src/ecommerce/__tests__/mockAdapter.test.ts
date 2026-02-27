import { describe, expect, it } from 'vitest';
import { createMockCommerceAdapter } from '../adapters/mock/mockAdapter';
import { validateCommerceAdapterContract } from '../testing/adapterContract';

describe('ecommerce mock adapter', () => {
  it('passes the adapter contract validator', async () => {
    const adapter = createMockCommerceAdapter();
    await validateCommerceAdapterContract(adapter);
  });

  it('lists products and fetches by slug', async () => {
    const adapter = createMockCommerceAdapter();
    const list = await adapter.listProducts({ page: 1, pageSize: 10 });
    expect(list.items.length).toBeGreaterThan(0);

    const p = list.items[0]!;
    const fetched = await adapter.getProductBySlug(p.slug);
    expect(fetched?.id).toBe(p.id);
  });

  it('creates a checkout session result', async () => {
    const adapter = createMockCommerceAdapter();
    const res = await adapter.createCheckoutSession({
      cart: [{ resource: 'p_tee', quantity: 1 }],
      customer: { email: 'a@b.com' },
      options: { currency: 'USD', successUrl: '/checkout?status=success' },
    });
    expect(res.kind).toBe('redirect');
    if (res.kind === 'redirect') {
      expect(res.url).toContain('demoOrderId');
    }
  });

  it('supports filters and sorting', async () => {
    const adapter = createMockCommerceAdapter();

    const byTag = await adapter.listProducts({
      page: 1,
      pageSize: 10,
      filters: { tags: ['gift'] },
    });
    expect(byTag.items.length).toBeGreaterThan(0);
    expect(byTag.items.every((p) => p.tags.includes('gift'))).toBe(true);

    const sortedAsc = await adapter.listProducts({ page: 1, pageSize: 10, sort: 'price_asc' });
    const pricesAsc = sortedAsc.items.map((p) => p.price);
    expect(pricesAsc).toEqual([...pricesAsc].sort((a, b) => a - b));

    const inStock = await adapter.listProducts({ page: 1, pageSize: 10, filters: { inStock: true } });
    expect(inStock.items.every((p) => p.inventoryStatus !== 'out_of_stock')).toBe(true);
  });
});
