import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CedrosShopProvider } from '../config/context';
import { useCartInventory } from '../hooks/useCartInventory';
import { useInventoryVerification } from '../hooks/useInventoryVerification';
import type { CommerceAdapter } from '../adapters/CommerceAdapter';
import type { Product } from '../types';
import type { VerificationResult } from '../hooks/useInventoryVerification';

function buildAdapter(overrides: Partial<CommerceAdapter>): CommerceAdapter {
  return {
    listProducts: async () => ({ items: [], page: 1, pageSize: 10 }),
    getProductBySlug: async () => null,
    listCategories: async () => [],
    getOrderHistory: async () => [],
    createCheckoutSession: async () => ({ kind: 'redirect', url: '/checkout' }),
    ...overrides,
  };
}

function buildProduct(id: string, inventoryQuantity: number): Product {
  return {
    id,
    slug: id,
    title: `Product ${id}`,
    description: 'test product',
    images: [],
    price: 10,
    currency: 'USD',
    tags: [],
    categoryIds: [],
    inventoryStatus: inventoryQuantity > 0 ? 'in_stock' : 'out_of_stock',
    inventoryQuantity,
  };
}

describe('inventory hooks batching', () => {
  it('useCartInventory prefers getProductsByIds over per-item slug lookups', async () => {
    const getProductsByIds = vi.fn(async (ids: string[]) => {
      const map = new Map<string, Product>();
      for (const id of ids) {
        map.set(id, buildProduct(id, id === 'prod-2' ? 0 : 5));
      }
      return map;
    });
    const getProductBySlug = vi.fn(async () => buildProduct('unexpected', 5));

    const adapter = buildAdapter({ getProductsByIds, getProductBySlug });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CedrosShopProvider config={{ currency: 'USD', checkout: { mode: 'minimal' }, adapter }}>
        {children}
      </CedrosShopProvider>
    );

    const items = [
      { productId: 'prod-1', qty: 1, unitPrice: 10, currency: 'USD', titleSnapshot: 'P1' },
      { productId: 'prod-2', qty: 1, unitPrice: 10, currency: 'USD', titleSnapshot: 'P2' },
    ];

    const { result } = renderHook(() => useCartInventory({ items, refreshInterval: 0 }), { wrapper });

    await waitFor(() => expect(result.current.inventory.size).toBe(2));
    expect(getProductsByIds).toHaveBeenCalledTimes(1);
    expect(getProductBySlug).not.toHaveBeenCalled();
    expect(result.current.hasIssues).toBe(true);
    expect(result.current.getItemInventory('prod-2')?.isOutOfStock).toBe(true);
  });

  it('useInventoryVerification keeps verification output while using batched lookup', async () => {
    const getProductsByIds = vi.fn(async (ids: string[]) => {
      const map = new Map<string, Product>();
      for (const id of ids) {
        map.set(id, buildProduct(id, id === 'prod-2' ? 1 : 5));
      }
      return map;
    });
    const getProductBySlug = vi.fn(async () => buildProduct('unexpected', 5));

    const adapter = buildAdapter({ getProductsByIds, getProductBySlug });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CedrosShopProvider config={{ currency: 'USD', checkout: { mode: 'minimal' }, adapter }}>
        {children}
      </CedrosShopProvider>
    );

    const items = [
      { productId: 'prod-1', qty: 2, unitPrice: 10, currency: 'USD', titleSnapshot: 'P1' },
      { productId: 'prod-2', qty: 3, unitPrice: 10, currency: 'USD', titleSnapshot: 'P2' },
    ];

    const { result } = renderHook(() => useInventoryVerification({ items }), { wrapper });

    let verification: VerificationResult | undefined;
    await act(async () => {
      verification = await result.current.verify();
    });

    expect(getProductsByIds).toHaveBeenCalledTimes(1);
    expect(getProductBySlug).not.toHaveBeenCalled();
    expect(verification?.ok).toBe(false);
    expect(verification?.issues).toHaveLength(1);
    expect(verification?.issues[0]?.productId).toBe('prod-2');
    expect(verification?.issues[0]?.type).toBe('insufficient_stock');
  });
});
